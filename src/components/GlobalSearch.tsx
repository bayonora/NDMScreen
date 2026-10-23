import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, X, BookOpen, Users, Sparkles, Target, Map as MapIcon, Store as StoreIcon, Package, User, Skull, Gem, Hammer,
  Link2, Coins, ArrowRight, ArrowLeft, Swords, MapPin, StickyNote, Backpack, Dices, ScrollText, CheckCircle2, XCircle,
  Circle, EyeOff, LayoutGrid, CornerDownLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Overlay, useModalLayer, modalPanelClass } from "./ui/Modal";
import { StatBlock } from "./StatBlock";
import { Markdown } from "./ui/Markdown";
import { Measured } from "./ui/Measured";
import { NoteMarkdown } from "./NoteMarkdown";
import { showRoll } from "./RollToasts";
import { useStore, actions, Tab } from "../store/useStore";
import { useSpellStore } from "../store/useSpellStore";
import { useMonsterStore } from "../store/useMonsterStore";
import { MonsterStatBlock } from "./MonsterStatBlock";
import { monsterKind } from "../data/monsterLabels";
import { cn, normalizeSearchText } from "../lib/utils";
import { SCHOOL_NAMES } from "../data/spellLabels";
import { useItemCatalogStore } from "../store/useItemCatalogStore";
import { CatalogDetail } from "./ItemCatalog";
import { categoryLabel, rarityLabel } from "../data/itemLabels";
import { noteCategory, noteLabel, noteTint, toggleTaskAt } from "../lib/notes";
import { tableEntries, entryRanges, formatRange, totalWeight, rollTable, formatPercent } from "../lib/loot";
import { focusSearchResult } from "../lib/searchFocus";
import { useShops, isBuiltinShop } from "../lib/shops";

// ---------------------------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------------------------

type Kind =
  | "player" | "npc" | "creature" | "combatant" | "quest" | "questDetail" | "map" | "location" | "shop" | "shopItem"
  | "note" | "homebrew" | "srd" | "loot" | "spell" | "monster" | "section";

interface SearchResult {
  key: string;
  kind: Kind;
  id: string;
  /** Shop of a shop item, quest of a quest detail. */
  parentId?: string;
  type: string;
  label: string;
  subLabel?: string;
  /** Piece of the text around the match when it was found inside a description. */
  snippet?: string;
  score: number;
  icon: React.ElementType;
  tab: Tab;
  /** Sections only: sub-tab to open. */
  ui?: Parameters<typeof actions.updateUI>[0];
}

const TAB_LABELS: Record<Tab, string> = {
  party: "Grupo", initiative: "Iniciativa", quests: "Misiones", maps: "Mapas", shops: "Tiendas",
  notes: "Notas", items: "Objetos", spells: "Grimorio", bestiary: "Bestiario",
};

/** Typing a section's name jumps straight to it. */
const SECTIONS: { label: string; tab: Tab; icon: React.ElementType; words: string; ui?: SearchResult["ui"] }[] = [
  { label: "Grupo", tab: "party", icon: Users, words: "grupo personajes party" },
  { label: "Jugadores", tab: "party", icon: User, words: "jugadores pj", ui: { partyTab: "players" } },
  { label: "PNJ", tab: "party", icon: Users, words: "pnj npc", ui: { partyTab: "npcs" } },
  { label: "Criaturas", tab: "party", icon: Skull, words: "criaturas", ui: { partyTab: "creatures" } },
  { label: "Iniciativa", tab: "initiative", icon: Swords, words: "iniciativa combate turnos" },
  { label: "Misiones", tab: "quests", icon: Target, words: "misiones quests" },
  { label: "Mapas", tab: "maps", icon: MapIcon, words: "mapas lugares" },
  { label: "Tiendas", tab: "shops", icon: StoreIcon, words: "tiendas comercios" },
  { label: "Notas", tab: "notes", icon: StickyNote, words: "notas bloc" },
  { label: "Objetos homebrew", tab: "items", icon: Hammer, words: "objetos homebrew", ui: { itemsTab: "items" } },
  { label: "Tablas de botín", tab: "items", icon: Dices, words: "tablas botin tesoro loot", ui: { itemsTab: "loot" } },
  { label: "Catálogo de objetos", tab: "items", icon: Backpack, words: "catalogo objetos equipo srd", ui: { itemsTab: "srd" } },
  { label: "Grimorio", tab: "spells", icon: BookOpen, words: "grimorio conjuros hechizos" },
  { label: "Bestiario", tab: "bestiary", icon: Skull, words: "bestiario monstruos" },
];

/** Strict match for reference lists: whole name, a whole word, several words, or a long enough prefix. */
function referenceScore(q: string, name: string) {
  const t = normalizeSearchText(name);
  if (t === q) return 100;
  if (t.split(/\s+/).includes(q)) return 80;
  if (q.includes(" ") && t.includes(q)) return 60;
  if (q.length > 3 && t.startsWith(q)) return 30;
  return 0;
}

/** Score against a short text (a name, a race…). */
function scoreShort(q: string, text?: string | null) {
  if (!text || !q) return 0;
  const t = normalizeSearchText(text);
  if (t === q) return 100;
  if (t.startsWith(q)) return 50;
  if (t.includes(` ${q}`)) return 30;
  if (t.includes(q)) return 10;
  // Loose subsequence match ("glbn" → "goblin"), only on short strings.
  if (q.length >= 3 && t.length < 60) {
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
    if (qi === q.length) return 5;
  }
  return 0;
}

/** Piece of `text` around the first match of `q`, without markdown symbols. */
function snippet(text: string, q: string) {
  const clean = text.replace(/[#*_>`[\]|]/g, "").replace(/\s+/g, " ").trim();
  const i = normalizeSearchText(clean).indexOf(q);
  if (i < 0) return undefined;
  const start = Math.max(0, i - 40);
  const end = Math.min(clean.length, i + q.length + 80);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end).trim()}${end < clean.length ? "…" : ""}`;
}

/** Names score high; a match only inside long texts scores low but brings a snippet. */
function match(q: string, terms: string[], short: (string | undefined | null)[], long: (string | undefined | null)[] = []) {
  const score = Math.max(0, ...short.map((s) => scoreShort(q, s)));
  if (score >= 10) return { score };
  for (const l of long) {
    if (l && normalizeSearchText(l).includes(q)) return { score: Math.max(score, 8), snippet: snippet(l, q) };
  }
  if (score > 0) return { score };
  // Several words found anywhere ("goblin cueva").
  if (terms.length > 1) {
    const all = normalizeSearchText([...short, ...long].filter(Boolean).join(" "));
    if (terms.every((t) => all.includes(t))) {
      const l = long.find((x) => x && normalizeSearchText(x).includes(terms[0]));
      return { score: 6, snippet: l ? snippet(l, terms[0]) : undefined };
    }
  }
  return { score: 0 };
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? normalizeSearchText(text).indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-dm-accent/25 text-inherit rounded-[2px] px-px">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Search box
// ---------------------------------------------------------------------------------------------

export function GlobalSearch({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const players = useStore((s) => s.players);
  const npcs = useStore((s) => s.npcs);
  const creatures = useStore((s) => s.creatures);
  const combatants = useStore((s) => s.combatants);
  const quests = useStore((s) => s.quests);
  const maps = useStore((s) => s.maps);
  const locations = useStore((s) => s.locations);
  const shops = useShops().visible;
  const notes = useStore((s) => s.notes);
  const customItems = useStore((s) => s.customItems);
  const lootTables = useStore((s) => s.lootTables);
  const spells = useSpellStore((s) => s.spells);
  const fetchSpells = useSpellStore((s) => s.fetchSpells);
  const catalogItems = useItemCatalogStore((s) => s.items);
  const fetchCatalogItems = useItemCatalogStore((s) => s.fetchItems);
  const monsters = useMonsterStore((s) => s.monsters);
  const fetchMonsters = useMonsterStore((s) => s.fetchMonsters);
  const loadReference = () => { fetchSpells(); fetchCatalogItems(); fetchMonsters(); };

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  // Quick-look popups, last one on top; drilling in (shop → item) pushes, "back" pops.
  const [stack, setStack] = useState<SearchResult[]>([]);
  const preview = stack[stack.length - 1] || null;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Phones show only a search icon; tapping it opens this full-screen search.
  const [mobileOpen, setMobileOpen] = useState(false);
  useModalLayer(mobileOpen && !preview, () => setMobileOpen(false));

  const q = normalizeSearchText(query).trim();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const res: SearchResult[] = [];
    const push = (r: Omit<SearchResult, "key" | "score">, m: { score: number; snippet?: string }, bonus = 0) => {
      if (m.score > 0) res.push({ ...r, key: `${r.kind}-${r.id}`, score: m.score + bonus, snippet: r.snippet ?? m.snippet });
    };

    SECTIONS.forEach((s) => {
      // Typing the start of a section's name puts it first; its other keywords rank a bit lower.
      const byName = normalizeSearchText(s.label).startsWith(q);
      const words = normalizeSearchText(`${s.label} ${s.words}`).split(/\s+/);
      if (byName || words.some((w) => w.startsWith(q))) push({ kind: "section", id: s.label, type: "Sección", label: s.label, subLabel: `Ir a ${TAB_LABELS[s.tab]}`, icon: s.icon, tab: s.tab, ui: s.ui }, { score: byName ? 90 : 40 });
    });

    const tagText = (tags?: { name: string; description: string }[]) => tags?.map((t) => `${t.name}: ${t.description}`).join("\n");
    players.forEach((p) => push(
      { kind: "player", id: p.id, type: "Jugador", label: p.name, subLabel: [p.race, p.classAndLevel].filter(Boolean).join(" · "), icon: User, tab: "party" },
      match(q, terms, [p.name, p.classAndLevel, p.race], [p.specialTraits, p.actions, p.skills, tagText(p.tags)])
    ));
    npcs.filter((n) => !n.isTemp).forEach((n) => push(
      { kind: "npc", id: n.id, type: "PNJ", label: n.name, subLabel: [n.race, n.cr && `VD ${n.cr}`].filter(Boolean).join(" · "), icon: Users, tab: "party" },
      match(q, terms, [n.name, n.race], [n.specialTraits, n.actions, n.skills, n.languages, tagText(n.tags)])
    ));
    (creatures || []).filter((c) => !c.isTemp).forEach((c) => push(
      { kind: "creature", id: c.id, type: "Criatura", label: c.name, subLabel: [c.race, c.cr && `VD ${c.cr}`].filter(Boolean).join(" · "), icon: Skull, tab: "party" },
      match(q, terms, [c.name, c.race], [c.specialTraits, c.actions, c.skills, tagText(c.tags)])
    ));
    combatants.forEach((c) => {
      const char = c.isTemp && c.tempData ? c.tempData : actions.getCharacter(c.characterId);
      if (!char) return;
      push(
        { kind: "combatant", id: c.id, type: "En combate", label: char.name, subLabel: `Iniciativa ${c.initiative} · PG ${c.hpCurrent}/${char.hpMax}`, icon: Swords, tab: "initiative" },
        match(q, terms, [char.name]), -2
      );
    });

    quests.forEach((qu) => {
      push(
        { kind: "quest", id: qu.id, type: "Misión", label: qu.title, subLabel: [qu.location, qu.status === "completed" ? "Completada" : qu.status === "failed" ? "Fallada" : "Activa"].filter(Boolean).join(" · "), icon: Target, tab: "quests" },
        match(q, terms, [qu.title, qu.location], [qu.description, qu.reward])
      );
      (qu.details || []).forEach((d) => push(
        { kind: "questDetail", id: d.id, parentId: qu.id, type: "Detalle", label: d.name, subLabel: `De la misión «${qu.title}»`, icon: ScrollText, tab: "quests" },
        match(q, terms, [d.name], [d.description]), -1
      ));
    });

    maps.forEach((m) => push({ kind: "map", id: m.id, type: "Mapa", label: m.name, icon: MapIcon, tab: "maps" }, match(q, terms, [m.name])));
    locations.forEach((l) => push(
      { kind: "location", id: l.id, type: "Lugar", label: l.name, subLabel: l.region, icon: MapPin, tab: "maps" },
      match(q, terms, [l.name, l.region], [l.description])
    ));

    shops.forEach((s) => {
      push({ kind: "shop", id: s.id, type: "Tienda", label: s.name, subLabel: s.ownerName, icon: StoreIcon, tab: "shops" }, match(q, terms, [s.name, s.ownerName]));
      (s.items || []).forEach((it) => push(
        { kind: "shopItem", id: it.id, parentId: s.id, type: "En tienda", label: it.name, subLabel: [s.name, it.price, it.hidden && "oculto"].filter(Boolean).join(" · "), icon: Coins, tab: "shops" },
        // The fixed shops mostly repeat the SRD catalog, so their items rank lower.
        match(q, terms, [it.name], [it.description]), isBuiltinShop(s.id) ? -3 : -1
      ));
    });

    notes.forEach((n) => {
      const cat = noteCategory(n.category);
      push(
        { kind: "note", id: n.id, type: "Nota", label: noteLabel(n), subLabel: [cat.id !== "general" && cat.label, ...(n.tags || []).map((t) => `#${t}`)].filter(Boolean).join(" · ") || undefined, icon: cat.icon, tab: "notes" },
        match(q, terms, [n.title, ...(n.tags || [])], [n.content])
      );
    });

    customItems.forEach((ci) => push(
      { kind: "homebrew", id: ci.id, type: "Homebrew", label: ci.name, subLabel: [ci.category, ci.rarity].filter(Boolean).join(" · ") || ci.shortDescription || "Objeto homebrew", icon: Hammer, tab: "items" },
      match(q, terms, [ci.name, ci.category], [ci.shortDescription, ci.description, ci.properties])
    ));

    lootTables.forEach((t) => push(
      { kind: "loot", id: t.id, type: "Tabla de botín", label: t.name, subLabel: t.description, icon: Dices, tab: "items" },
      match(q, terms, [t.name], [t.description, tableEntries(t).map((e) => e.text).join("\n")])
    ));

    // Reference books: strict by name, after the DM's own content on ties.
    catalogItems.forEach((it) => push(
      {
        kind: "srd", id: it.index, type: it.kind === "magic" ? "Objeto mágico" : "Equipo", label: it.name,
        subLabel: it.kind === "magic" ? [it.item_type, rarityLabel(it)].filter(Boolean).join(" · ") : [categoryLabel(it), it.cost].filter(Boolean).join(" · "),
        icon: it.kind === "magic" ? Gem : Package, tab: "items",
      },
      { score: referenceScore(q, it.name) }, -2
    ));
    spells.forEach((s) => push(
      { kind: "spell", id: s.index, type: "Conjuro", label: s.name, subLabel: `${s.level === 0 ? "Truco" : `Nivel ${s.level}`} · ${s.school?.index ? SCHOOL_NAMES[s.school.index] : s.school?.name || ""}`, icon: BookOpen, tab: "spells" },
      { score: referenceScore(q, s.name) }, -2
    ));
    monsters.forEach((m) => push(
      { kind: "monster", id: m.index, type: "Bestiario", label: m.name, subLabel: `Desafío ${m.cr} · ${monsterKind(m)}`, icon: Skull, tab: "bestiary" },
      { score: Math.max(referenceScore(q, m.name), m.name_en ? referenceScore(q, m.name_en) - 5 : 0) }, -2
    ));

    return res.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es")).slice(0, 40);
  }, [q, players, npcs, creatures, combatants, quests, maps, locations, shops, notes, customItems, lootTables, spells, catalogItems, monsters]);

  useEffect(() => setSelectedIndex(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Close when clicking outside (but not while a quick-look popup is on top).
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stack.length) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stack.length]);

  const resetSearch = () => {
    setStack([]);
    setIsOpen(false);
    setMobileOpen(false);
    setQuery("");
    (document.activeElement as HTMLElement | null)?.blur();
  };

  /** Takes the user to where the result lives, opening or highlighting it there. */
  const goTo = (res: SearchResult) => {
    switch (res.kind) {
      case "player": actions.updateUI({ partyTab: "players" }); focusSearchResult(res.id); break;
      case "npc": actions.updateUI({ partyTab: "npcs" }); focusSearchResult(res.id); break;
      case "creature": actions.updateUI({ partyTab: "creatures" }); focusSearchResult(res.id); break;
      case "combatant": focusSearchResult(res.id); break;
      case "quest": actions.updateUI({ highlightedQuestId: res.id }); break;
      case "questDetail": actions.updateUI({ highlightedQuestId: res.parentId }); break;
      case "map": case "location": actions.updateUI({ mapsFocusId: res.id }); break;
      case "shop": actions.updateUI({ openShopId: res.id }); break;
      case "shopItem": actions.updateUI({ openShopId: res.parentId }); focusSearchResult(res.id); break;
      case "note": actions.updateUI({ highlightedNoteId: res.id }); break;
      case "homebrew": actions.updateUI({ itemsTab: "items" }); focusSearchResult(res.id); break;
      case "loot": actions.updateUI({ itemsTab: "loot" }); focusSearchResult(res.id); break;
      case "srd": actions.updateUI({ itemsTab: "srd", highlightedItemId: res.id }); break;
      case "spell": actions.updateUI({ highlightedSpellId: res.id }); break;
      case "monster": actions.updateUI({ highlightedMonsterId: res.id }); break;
      case "section": if (res.ui) actions.updateUI(res.ui); break;
    }
    onNavigate(res.tab);
    resetSearch();
  };

  const openPreview = (res: SearchResult) => (res.kind === "section" ? goTo(res) : setStack([res]));
  const closePreview = () => {
    setStack([]);
    // Back to the results, so another one can be looked at.
    setIsOpen(true);
    requestAnimationFrame(() => document.getElementById("global-search-input")?.focus());
  };

  // Keyboard: Ctrl+K opens; ↑↓ move; Enter quick look; Ctrl/Shift+Enter go there.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (stack.length) return; // the popup handles its own keys
      if (!isOpen) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setIsOpen(true);
          loadReference();
          document.getElementById("global-search-input")?.focus();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const res = results[selectedIndex];
        if (!res) return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || e.shiftKey) goTo(res);
        else openPreview(res);
      } else if (e.key === "Escape" && !mobileOpen) {
        e.preventDefault();
        setIsOpen(false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const openMobile = () => {
    setMobileOpen(true);
    setIsOpen(true);
    loadReference();
    // Focus inside the tap handler's frame so phones open the keyboard.
    requestAnimationFrame(() => document.getElementById("global-search-input")?.focus());
  };

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        aria-label="Buscar"
        title="Buscar"
        className="sm:hidden p-2.5 text-dm-muted hover:text-dm-text active:text-dm-accent transition-colors"
      >
        <Search size={20} />
      </button>
      <div
        ref={containerRef}
        className={cn(
          "relative w-full max-w-md",
          mobileOpen
            ? "fixed inset-0 z-50 max-w-none flex flex-col bg-dm-bg-darker px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] animate-in fade-in"
            : "hidden sm:block"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-dm-muted" />
            </div>
            <input
              id="global-search-input"
              type="text"
              autoComplete="off"
              className="block w-full pl-10 pr-9 py-2 border border-dm-border rounded-md leading-5 bg-dm-bg-alt text-dm-text placeholder-dm-muted focus:outline-none focus:ring-1 focus:ring-dm-accent focus:border-dm-accent sm:text-sm transition-colors"
              placeholder={mobileOpen ? "Buscar en toda la campaña…" : "Buscar en toda la campaña… (Ctrl+K)"}
              enterKeyHint="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => { setIsOpen(true); loadReference(); }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); document.getElementById("global-search-input")?.focus(); }}
                aria-label="Borrar búsqueda"
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-dm-muted hover:text-dm-text-bright"
              >
                <X size={15} />
              </button>
            )}
          </div>
          {mobileOpen && (
            <button type="button" onClick={() => { setMobileOpen(false); setIsOpen(false); }} aria-label="Cerrar búsqueda" className="p-2 -mr-1 text-dm-muted hover:text-dm-accent">
              <X size={22} />
            </button>
          )}
        </div>
        {mobileOpen && q.length < 2 && (
          <p className="mt-6 text-center text-sm text-dm-muted px-4">
            Escribe al menos 2 letras. Busca personajes, misiones, lugares, tiendas, notas, objetos, botín, conjuros y monstruos.
          </p>
        )}

        <AnimatePresence>
          {isOpen && q.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "z-50 mt-1 w-full bg-dm-bg shadow-xl shadow-black/50 rounded-md text-base sm:text-sm border border-dm-border flex flex-col overflow-hidden",
                mobileOpen ? "relative mt-3 min-h-0 flex-1 max-h-max mb-3" : "absolute sm:w-[min(36rem,calc(100vw-2rem))] sm:left-1/2 sm:-translate-x-1/2 max-h-[70vh]"
              )}
            >
              {results.length === 0 ? (
                <div className="px-4 py-6 text-sm text-dm-muted text-center">No se encontró nada para «{query.trim()}»</div>
              ) : (
                <ul ref={listRef} className="overflow-y-auto overscroll-contain custom-scrollbar py-1" role="listbox" aria-label="Resultados">
                  {results.map((res, idx) => {
                    const selected = selectedIndex === idx;
                    const Icon = res.icon;
                    return (
                      <li
                        key={res.key}
                        data-index={idx}
                        role="option"
                        aria-selected={selected}
                        onClick={() => openPreview(res)}
                        onMouseMove={() => selectedIndex !== idx && setSelectedIndex(idx)}
                        className={cn(
                          "group/row cursor-pointer select-none flex items-center gap-3 py-2.5 sm:py-2 pl-3 pr-2 border-l-2 transition-colors",
                          selected ? "bg-dm-bg-alt border-dm-accent text-dm-text-bright" : "border-transparent text-dm-text"
                        )}
                      >
                        <Icon size={16} className={cn("shrink-0", selected ? "text-dm-accent" : "text-dm-muted")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate"><Highlight text={res.label} q={q} /></span>
                            <span className="shrink-0 px-1.5 rounded-sm bg-dm-bg-alt border border-dm-border text-[9px] leading-4 uppercase tracking-wider text-dm-muted">{res.type}</span>
                          </div>
                          {res.subLabel && <div className="text-xs text-dm-muted truncate mt-0.5">{res.subLabel}</div>}
                          {res.snippet && <div className="text-xs text-dm-text-muted/80 italic truncate mt-0.5"><Highlight text={res.snippet} q={q.split(/\s+/)[0]} /></div>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goTo(res); }}
                          title={`Ir a ${TAB_LABELS[res.tab]} (Ctrl+Enter)`}
                          aria-label={`Ir a ${TAB_LABELS[res.tab]}`}
                          className={cn(
                            "shrink-0 inline-flex items-center gap-1 h-8 px-2 rounded-sm border text-[11px] uppercase tracking-wider transition-colors",
                            selected ? "border-dm-accent text-dm-accent hover:bg-dm-accent hover:text-dm-bg-darker" : "border-transparent text-dm-muted hover:text-dm-accent hover:border-dm-border"
                          )}
                        >
                          <span className={cn("hidden", selected && "sm:inline")}>{TAB_LABELS[res.tab]}</span>
                          <ArrowRight size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 border-t border-dm-border bg-dm-bg-darker/60 text-[10px] text-dm-muted">
                <span><Kbd>↑</Kbd><Kbd>↓</Kbd> moverse</span>
                <span><Kbd><CornerDownLeft size={9} /></Kbd> vista rápida</span>
                <span><Kbd>Ctrl</Kbd>+<Kbd><CornerDownLeft size={9} /></Kbd> ir allí</span>
                <span className="ml-auto tabular-nums">{results.length === 40 ? "40+" : results.length} resultados</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Overlay isOpen={!!preview} onClose={closePreview} zIndex="z-[100]">
          {preview && (
            <QuickLook
              key={preview.key}
              res={preview}
              canGoBack={stack.length > 1}
              onBack={() => setStack((s) => s.slice(0, -1))}
              onDrill={(r) => setStack((s) => [...s, r])}
              onClose={closePreview}
              onGo={goTo}
              onNavigate={(tab) => { onNavigate(tab); resetSearch(); }}
            />
          )}
        </Overlay>
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex items-center justify-center min-w-4 h-4 px-1 mx-px rounded-[3px] border border-dm-border bg-dm-bg text-[9px] font-sans text-dm-text">{children}</kbd>;
}

// ---------------------------------------------------------------------------------------------
// Quick look popup
// ---------------------------------------------------------------------------------------------

const box = "bg-dm-bg-alt/60 border border-dm-border rounded-sm";
const chip = "inline-flex items-center gap-1 px-2 py-1 rounded-sm bg-dm-bg-hover border border-dm-border text-xs";
const rawText = "whitespace-pre-wrap text-sm leading-relaxed text-dm-text";

function QuickLook({ res, canGoBack, onBack, onDrill, onClose, onGo, onNavigate }: {
  res: SearchResult;
  canGoBack: boolean;
  onBack: () => void;
  onDrill: (r: SearchResult) => void;
  onClose: () => void;
  onGo: (r: SearchResult) => void;
  onNavigate: (tab: Tab) => void;
}) {
  const live = useRef({ res, onGo });
  live.current = { res, onGo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); live.current.onGo(live.current.res); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const content = useQuickLookContent(res, onDrill, onNavigate);
  const Icon = res.icon;

  return (
    <div role="dialog" aria-modal="true" aria-label={res.label} className={cn(modalPanelClass, content.wide ? "max-w-3xl" : "max-w-2xl")}>
      <div className="flex items-start gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-dm-accent/10">
        {canGoBack && (
          <button type="button" onClick={onBack} aria-label="Volver" title="Volver" className="p-1.5 -ml-1.5 mt-0.5 text-dm-muted hover:text-dm-accent">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-dm-muted">
            <Icon size={12} /> {res.type}
            <span className="font-normal normal-case tracking-normal opacity-70">· en {TAB_LABELS[res.tab]}</span>
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-display text-dm-accent break-words leading-tight" style={content.color ? { color: content.color } : undefined}>
            {content.title ?? res.label}
          </h2>
          {content.subtitle && <p className="text-sm text-dm-muted mt-0.5">{content.subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" title="Cerrar (Esc)" className="p-1.5 -mr-1.5 text-dm-muted hover:text-dm-text-bright">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 sm:px-6 py-4 text-dm-text">
        {content.body ?? <p className="text-sm text-dm-muted italic">Este elemento ya no existe.</p>}
      </div>

      <div className="flex items-center gap-2 flex-wrap px-4 sm:px-6 py-3 border-t border-dm-accent/10 bg-black/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {content.extra}
        <button
          type="button"
          onClick={() => onGo(res)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-dm-accent text-dm-bg-darker text-xs font-bold uppercase tracking-widest hover:bg-dm-accent-hover transition-colors"
          title="Ctrl+Enter"
        >
          Ir a {TAB_LABELS[res.tab]} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

type QuickLookContent = { title?: React.ReactNode; subtitle?: React.ReactNode; body?: React.ReactNode; extra?: React.ReactNode; wide?: boolean; color?: string };

/** What the popup shows for each kind of result. Reads live data, so changes made here (ticking a note) show at once. */
function useQuickLookContent(res: SearchResult, onDrill: (r: SearchResult) => void, onNavigate: (tab: Tab) => void): QuickLookContent {
  const players = useStore((s) => s.players);
  const npcs = useStore((s) => s.npcs);
  const creatures = useStore((s) => s.creatures);
  const combatants = useStore((s) => s.combatants);
  const quests = useStore((s) => s.quests);
  const maps = useStore((s) => s.maps);
  const locations = useStore((s) => s.locations);
  const shops = useShops().all;
  const notes = useStore((s) => s.notes);
  const customItems = useStore((s) => s.customItems);
  const lootTables = useStore((s) => s.lootTables);
  const spells = useSpellStore((s) => s.spells);
  const catalogItems = useItemCatalogStore((s) => s.items);
  const monsters = useMonsterStore((s) => s.monsters);
  const [lootResult, setLootResult] = useState<{ roll: number; index: number } | null>(null);

  const openHomebrewEditor = (id: string) => {
    actions.updateUI({ itemsTab: "items", editCustomItemId: id });
    onNavigate("items");
  };

  switch (res.kind) {
    case "player": case "npc": case "creature": {
      const char = [...players, ...npcs, ...(creatures || [])].find((c) => c.id === res.id);
      return { title: char?.name, body: char && <StatBlock character={char} hideCollapse /> };
    }

    case "combatant": {
      const c = combatants.find((x) => x.id === res.id);
      const char = c && (c.isTemp && c.tempData ? c.tempData : actions.getCharacter(c.characterId));
      if (!c || !char) return {};
      const pct = Math.max(0, Math.min(100, (c.hpCurrent / char.hpMax) * 100));
      return {
        title: char.name,
        subtitle: `Iniciativa ${c.initiative}`,
        body: (
          <div className="space-y-4">
            <div className={cn(box, "p-3")}>
              <div className="flex justify-between text-xs uppercase tracking-widest text-dm-muted mb-1.5">
                <span>Puntos de golpe</span>
                <span className="tabular-nums text-dm-text-bright font-bold">{c.hpCurrent} / {char.hpMax}</span>
              </div>
              <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                <div className={cn("h-full rounded-full", pct > 50 ? "bg-green-600" : pct > 25 ? "bg-yellow-600" : "bg-dm-danger")} style={{ width: `${pct}%` }} />
              </div>
              {c.statuses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.statuses.map((s) => <span key={s.id} className={chip} title={s.description}>{s.name}{s.duration > 0 && ` (${s.duration})`}</span>)}
                </div>
              )}
            </div>
            <StatBlock character={char} hideCollapse />
          </div>
        ),
      };
    }

    case "quest": {
      const qu = quests.find((x) => x.id === res.id);
      if (!qu) return {};
      const parent = qu.parentId ? quests.find((x) => x.id === qu.parentId) : null;
      const children = quests.filter((x) => x.parentId === qu.id);
      const asResult = (x: typeof qu): SearchResult => ({ key: `quest-${x.id}`, kind: "quest", id: x.id, type: "Misión", label: x.title, score: 0, icon: Target, tab: "quests" });
      const status = qu.status === "completed"
        ? <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={15} /> Completada</span>
        : qu.status === "failed"
          ? <span className="text-dm-danger flex items-center gap-1"><XCircle size={15} /> Fallada</span>
          : <span className="text-dm-muted flex items-center gap-1"><Circle size={15} /> Activa</span>;
      return {
        title: qu.title,
        body: (
          <div className="space-y-4">
            {qu.image && <div className="w-full aspect-[21/9] bg-cover bg-center border border-dm-border rounded-sm" style={{ backgroundImage: `url(${qu.image})` }} />}
            <div className="flex flex-wrap items-center gap-3 text-sm font-bold uppercase tracking-wider">
              {status}
              {qu.location && <span className={chip}><MapPin size={12} /> {qu.location}</span>}
            </div>
            {qu.reward && (
              <div className={cn(box, "p-3")}>
                <div className="text-[10px] text-dm-muted font-bold uppercase tracking-wider">Recompensa</div>
                <div className="text-dm-accent font-medium">{qu.reward}</div>
              </div>
            )}
            {qu.description ? <p className={rawText}>{qu.description}</p> : <p className="text-sm italic text-dm-muted">Sin descripción.</p>}
            {(qu.details || []).length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-dm-muted mb-2">Detalles</h3>
                <div className="space-y-2">
                  {qu.details!.map((d) => (
                    <div key={d.id} className={cn(box, "p-3")}>
                      <div className="font-bold text-dm-text-bright text-sm">{d.name}</div>
                      {d.description && <p className={cn(rawText, "mt-1")}>{d.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(parent || children.length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {parent && <LinkChip icon={Target} label={`Viene de: ${parent.title}`} onClick={() => onDrill(asResult(parent))} />}
                {children.map((ch) => <LinkChip key={ch.id} icon={Target} label={`Sigue: ${ch.title}`} onClick={() => onDrill(asResult(ch))} />)}
              </div>
            )}
          </div>
        ),
      };
    }

    case "questDetail": {
      const qu = quests.find((x) => x.id === res.parentId);
      const d = qu?.details?.find((x) => x.id === res.id);
      if (!qu || !d) return {};
      return {
        title: d.name,
        body: (
          <div className="space-y-4">
            {d.description ? <p className={rawText}>{d.description}</p> : <p className="text-sm italic text-dm-muted">Sin descripción.</p>}
            <LinkChip icon={Target} label={`De la misión: ${qu.title}`} onClick={() => onDrill({ key: `quest-${qu.id}`, kind: "quest", id: qu.id, type: "Misión", label: qu.title, score: 0, icon: Target, tab: "quests" })} />
          </div>
        ),
      };
    }

    case "map": case "location": {
      const node = maps.find((m) => m.id === res.id) || locations.find((l) => l.id === res.id);
      if (!node) return {};
      const loc = "description" in node ? node : null;
      const parent = loc?.parentId ? maps.find((m) => m.id === loc.parentId) || locations.find((l) => l.id === loc.parentId) : null;
      const places = locations.filter((l) => l.parentId === node.id);
      const asResult = (l: { id: string; name: string }, isMap = false): SearchResult =>
        ({ key: `${isMap ? "map" : "location"}-${l.id}`, kind: isMap ? "map" : "location", id: l.id, type: isMap ? "Mapa" : "Lugar", label: l.name, score: 0, icon: isMap ? MapIcon : MapPin, tab: "maps" });
      return {
        title: node.name,
        subtitle: loc?.region,
        wide: !!node.image,
        body: (
          <div className="space-y-4">
            {node.image && <img src={node.image} alt={node.name} className="w-full max-h-[55vh] object-contain rounded-sm border border-dm-border bg-dm-bg-darker" />}
            {loc?.description && <p className={rawText}>{loc.description}</p>}
            {(parent || places.length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {parent && <LinkChip icon={MapIcon} label={`Dentro de: ${parent.name}`} onClick={() => onDrill(asResult(parent, !("description" in parent)))} />}
                {places.map((p) => <LinkChip key={p.id} icon={MapPin} label={p.name} onClick={() => onDrill(asResult(p))} />)}
              </div>
            )}
            {!node.image && !loc?.description && !parent && places.length === 0 && <p className="text-sm italic text-dm-muted">Sin más detalles.</p>}
          </div>
        ),
      };
    }

    case "shop": {
      const s = shops.find((x) => x.id === res.id);
      if (!s) return {};
      return {
        title: s.name,
        subtitle: s.ownerName && `Tendero: ${s.ownerName}`,
        body: (
          <div className="space-y-4">
            {(s.previewImage || s.ownerImage) && <img src={s.previewImage || s.ownerImage} alt={s.ownerName} className="w-full max-h-56 object-cover rounded-sm border border-dm-border" />}
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-dm-muted mb-2">Inventario ({s.items?.length || 0})</h3>
              {(s.items || []).length === 0 ? (
                <p className="text-sm italic text-dm-muted">La tienda no tiene objetos.</p>
              ) : (
                <ul className="divide-y divide-dm-border border border-dm-border rounded-sm">
                  {s.items.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => onDrill({ key: `shopItem-${it.id}`, kind: "shopItem", id: it.id, parentId: s.id, type: "En tienda", label: it.name, score: 0, icon: Coins, tab: "shops" })}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-dm-bg-hover transition-colors"
                      >
                        <span className={cn("flex-1 min-w-0 truncate text-sm", it.hidden ? "text-dm-muted" : "text-dm-text-bright")}>{it.name}</span>
                        {it.hidden && <EyeOff size={13} className="text-dm-muted shrink-0" aria-label="Oculto" />}
                        <span className="font-mono text-sm text-dm-accent shrink-0">{it.price}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ),
      };
    }

    case "shopItem": {
      const s = shops.find((x) => x.id === res.parentId);
      const it = s?.items.find((x) => x.id === res.id);
      if (!s || !it) return {};
      return {
        title: it.name,
        subtitle: `En ${s.name}`,
        body: (
          <div className="space-y-4">
            {it.image && <img src={it.image} alt={it.name} className="w-full max-h-56 object-contain rounded-sm border border-dm-border bg-dm-bg-darker" />}
            <div className="flex flex-wrap gap-2">
              {it.price && <span className={cn(chip, "font-mono font-bold text-dm-accent")}><Coins size={12} /> {it.price}</span>}
              {it.hidden && <span className={cn(chip, "text-dm-muted")}><EyeOff size={12} /> Oculto a los jugadores</span>}
            </div>
            {it.description ? (
              <div className="text-sm leading-relaxed text-dm-text prose prose-invert prose-sm max-w-none prose-strong:text-dm-text-bright">
                <Markdown units>{it.description}</Markdown>
              </div>
            ) : <p className="text-sm italic text-dm-muted">Sin descripción.</p>}
          </div>
        ),
        extra: <LinkChip icon={StoreIcon} label={`Ver ${s.name}`} onClick={() => onDrill({ key: `shop-${s.id}`, kind: "shop", id: s.id, type: "Tienda", label: s.name, score: 0, icon: StoreIcon, tab: "shops" })} />,
      };
    }

    case "note": {
      const n = notes.find((x) => x.id === res.id);
      if (!n) return {};
      const cat = noteCategory(n.category);
      return {
        title: n.title || undefined,
        color: noteTint(n.color),
        body: (
          <div className="space-y-3">
            {(cat.id !== "general" || (n.tags || []).length > 0) && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {cat.id !== "general" && <span className={chip}><cat.icon size={12} /> {cat.label}</span>}
                {(n.tags || []).map((t) => <span key={t} className={chip}>#{t}</span>)}
              </div>
            )}
            <div className="font-serif text-base leading-relaxed">
              <NoteMarkdown
                content={n.content}
                onRoll={(dice) => showRoll(dice, noteLabel(n))}
                onToggleTask={(offset) => actions.updateNote(n.id, { content: toggleTaskAt(n.content, offset) })}
              />
            </div>
          </div>
        ),
      };
    }

    case "homebrew": {
      const i = customItems.find((x) => x.id === res.id);
      if (!i) return {};
      const color = i.color || "var(--theme-accent)";
      const stats = ([["Peso", i.weight], ["Daño", i.damage], ["Clase de Armadura", i.armorClass], ["Propiedades", i.properties]] as const).filter(([, v]) => v);
      return {
        title: i.name,
        color,
        subtitle: i.shortDescription,
        body: (
          <div className="space-y-3">
            {i.image && <img src={i.image} alt={i.name} className="w-full max-h-48 object-cover rounded-sm" />}
            <div className="flex flex-wrap gap-2 text-xs">
              {i.category && <span className={cn(chip, "uppercase tracking-wider text-dm-muted")}>{i.category}</span>}
              {i.rarity && <span className={cn(chip, "font-semibold")} style={{ color }}>{i.rarity}</span>}
              {i.attunement && <span className={chip}><Link2 size={12} />{i.attunement}</span>}
              {i.value && <span className={cn(chip, "font-mono font-bold")} style={{ color }}><Coins size={12} />{i.value}</span>}
            </div>
            {stats.length > 0 && (
              <dl className="grid grid-cols-2 gap-2">
                {stats.map(([label, value]) => (
                  <div key={label} className={cn("bg-dm-bg-hover border border-dm-border px-3 py-1.5", label === "Propiedades" && "col-span-2")}>
                    <dt className="text-[10px] uppercase tracking-widest font-bold text-dm-muted">{label}</dt>
                    <dd className="text-sm text-dm-text-bright"><Measured text={value} /></dd>
                  </div>
                ))}
              </dl>
            )}
            {i.description && (
              <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-strong:text-dm-text-bright">
                <Markdown units>{i.description}</Markdown>
              </div>
            )}
          </div>
        ),
        extra: <LinkChip icon={Hammer} label="Editar" onClick={() => openHomebrewEditor(i.id)} />,
      };
    }

    case "srd": {
      const it = catalogItems.find((x) => x.index === res.id);
      return { title: it?.name, body: it && <CatalogDetail item={it} onOpenHomebrew={openHomebrewEditor} /> };
    }

    case "loot": {
      const t = lootTables.find((x) => x.id === res.id);
      if (!t) return {};
      const entries = tableEntries(t);
      const total = totalWeight(entries);
      const ranges = entryRanges(entries);
      const won = lootResult ? entries[lootResult.index] : null;
      return {
        title: t.name,
        color: t.color,
        subtitle: t.description,
        body: (
          <div className="space-y-3">
            {won && (
              <div className="flex items-center gap-3 p-3 rounded-sm border border-dm-accent bg-dm-accent/10 animate-in fade-in zoom-in-95">
                <span className="font-display text-3xl font-bold text-dm-accent tabular-nums">{lootResult!.roll}</span>
                <span className="text-dm-text-bright font-medium">{won.text}</span>
              </div>
            )}
            {entries.length === 0 ? (
              <p className="text-sm italic text-dm-muted">La tabla está vacía.</p>
            ) : (
              <table className="w-full text-sm border border-dm-border">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-dm-muted border-b border-dm-border">
                    <th className="text-left px-3 py-1.5 w-20">1d{total}</th>
                    <th className="text-left px-3 py-1.5">Resultado</th>
                    <th className="text-right px-3 py-1.5 w-16">%</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={e.id} className={cn("border-b border-dm-border/60 last:border-0", lootResult?.index === idx && "bg-dm-accent/15")}>
                      <td className="px-3 py-1.5 font-mono text-dm-accent tabular-nums">{formatRange(ranges[idx])}</td>
                      <td className="px-3 py-1.5 text-dm-text">{e.text}</td>
                      <td className="px-3 py-1.5 text-right text-dm-muted tabular-nums">{formatPercent(e.weight, total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ),
        extra: total > 0 && (
          <button type="button" onClick={() => setLootResult(rollTable(entries))} className="inline-flex items-center gap-1.5 px-3 py-2 border border-dm-accent text-dm-accent text-xs font-bold uppercase tracking-widest hover:bg-dm-accent/10">
            <Dices size={14} /> Tirar
          </button>
        ),
      };
    }

    case "spell": {
      const s = spells.find((x) => x.index === res.id);
      if (!s) return {};
      return {
        title: s.name,
        subtitle: `${s.level === 0 ? "Truco" : `Nivel ${s.level}`} · ${s.school?.index ? SCHOOL_NAMES[s.school.index] : s.school?.name || ""}${s.ritual ? " (ritual)" : ""}`,
        body: (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([["Tiempo", s.casting_time], ["Alcance", s.range], ["Componentes", s.components?.join(", ")], ["Duración", `${s.concentration ? "Concentración, " : ""}${s.duration}`]] as const).map(([label, value]) => (
                <div key={label} className="bg-dm-bg-hover border border-dm-border px-3 py-1.5">
                  <dt className="text-[10px] uppercase tracking-widest font-bold text-dm-muted">{label}</dt>
                  <dd className="text-sm text-dm-text-bright"><Measured text={value || "—"} /></dd>
                </div>
              ))}
            </dl>
            <div className="text-sm leading-relaxed space-y-2 prose prose-invert prose-sm max-w-none prose-strong:text-dm-accent">
              <Markdown units>{s.desc?.join("\n\n") || ""}</Markdown>
              {s.higher_level && s.higher_level.length > 0 && (
                <div className="mt-4">
                  <strong className="text-dm-accent">A niveles superiores: </strong>
                  <Markdown units>{s.higher_level.join("\n\n")}</Markdown>
                </div>
              )}
            </div>
          </div>
        ),
      };
    }

    case "monster": {
      const m = monsters.find((x) => x.index === res.id);
      return { title: m?.name, wide: true, body: m && <MonsterStatBlock monster={m} showLore={false} /> };
    }

    default:
      return { body: <p className="text-sm text-dm-muted flex items-center gap-2"><LayoutGrid size={14} /> {res.subLabel}</p> };
  }
}

function LinkChip({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1.5 rounded-sm border border-dm-border text-xs text-dm-text hover:border-dm-accent hover:text-dm-accent transition-colors">
      <Icon size={13} className="shrink-0" /> <span className="truncate">{label}</span>
    </button>
  );
}
