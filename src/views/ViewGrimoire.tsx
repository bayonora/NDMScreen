import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { useSpellStore } from "../store/useSpellStore";
import { Search, Loader2, Sparkles, BookOpen, Star, Shield, Cloud, Eye, Brain, Flame, Ghost, Skull, FlaskConical, SlidersHorizontal } from "lucide-react";
import { cn, normalizeSearchText } from "../lib/utils";
import { Markdown } from "../components/ui/Markdown";
import { Measured } from "../components/ui/Measured";
import { useStore, actions } from "../store/useStore";
import { Modal } from "../components/ui/Modal";
import { ViewHeader } from "../components/ui/ViewHeader";
import { Select } from "../components/ui/Select";
import { Spell } from "../types/spell";
import { SCHOOL_NAMES, CLASS_NAMES } from "../data/spellLabels";

type SortOrder = "name_asc" | "level_asc" | "level_desc" | "favorites";

const SCHOOL_ICONS: Record<string, React.ElementType> = {
  abjuration: Shield,
  conjuration: Cloud,
  divination: Eye,
  enchantment: Brain,
  evocation: Flame,
  illusion: Ghost,
  necromancy: Skull,
  transmutation: FlaskConical,
};

function translateLevel(level: number | undefined) {
  if (level === undefined) return "Desconocido";
  return level === 0 ? "Truco" : `Nv. ${level}`;
}

function schoolName(spell: Spell) {
  return spell.school?.index ? SCHOOL_NAMES[spell.school.index] || spell.school.name : "Sin escuela";
}

/** Filter dropdowns: as tall as the search box next to them. */
const selectClass = "h-auto py-2 rounded-sm";

export function ViewGrimoire() {
  const spells = useSpellStore((s) => s.spells);
  const isLoading = useSpellStore((s) => s.isLoading);
  const error = useSpellStore((s) => s.error);
  const fetchSpells = useSpellStore((s) => s.fetchSpells);
  const favoriteSpells = useStore((s) => s.favoriteSpells);
  const highlightedSpellId = useStore((s) => s.uiState.highlightedSpellId);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [levelFilter, setLevelFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("level_asc");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [levelFilter, schoolFilter, classFilter].filter(Boolean).length + (sortOrder !== "level_asc" ? 1 : 0);

  useEffect(() => {
    fetchSpells();
  }, [fetchSpells]);

  useEffect(() => {
    if (!highlightedSpellId || spells.length === 0) return;
    const s = spells.find((x) => x.index === highlightedSpellId);
    if (s) setSelectedSpell(s);
    actions.updateUI({ highlightedSpellId: undefined });
    // The row may be hidden by the current filters; scroll only if it is rendered.
    // No cleanup: clearing highlightedSpellId re-runs this effect and must not cancel the scroll.
    setTimeout(() => {
      document.getElementById(`spell-${highlightedSpellId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [highlightedSpellId, spells]);

  // Normalizing 350 descriptions is the expensive part, so do it once per spell list.
  const searchIndex = useMemo(
    () => spells.map((s) => ({ spell: s, name: normalizeSearchText(s.name), text: normalizeSearchText(s.desc?.join(" ")) })),
    [spells]
  );

  const filteredSpells = useMemo(() => {
    const q = normalizeSearchText(deferredSearch.trim());
    const favs = new Set(favoriteSpells);
    const result = searchIndex
      .filter(({ spell: s, name, text }) =>
        (!q || name.includes(q) || text.includes(q)) &&
        (levelFilter === "" || s.level?.toString() === levelFilter) &&
        (schoolFilter === "" || s.school?.index === schoolFilter) &&
        (classFilter === "" || s.classes?.some((c) => c.index === classFilter)) &&
        (sortOrder !== "favorites" || favs.has(s.index))
      )
      .map(({ spell }) => spell);

    return result.sort((a, b) => {
      if (sortOrder !== "name_asc") {
        const diff = (a.level ?? 99) - (b.level ?? 99);
        if (diff !== 0) return sortOrder === "level_desc" ? -diff : diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [searchIndex, deferredSearch, levelFilter, schoolFilter, classFilter, sortOrder, favoriteSpells]);

  // School → level → spells. Schools in alphabetical order (Spanish); by name: no level sub-groups.
  const groups = useMemo(() => {
    const schools = Object.entries(SCHOOL_NAMES).sort((a, b) => a[1].localeCompare(b[1], "es"));
    const keys = [...schools.map(([k]) => k), ""];
    return keys
      .map((key) => {
        const spells = filteredSpells.filter((s) => (key ? s.school?.index === key : !SCHOOL_NAMES[s.school?.index]));
        const subs: { label: string; spells: Spell[] }[] = [];
        for (const sp of spells) {
          const label = sortOrder === "name_asc" ? "" : sp.level === 0 ? "Trucos" : `Nivel ${sp.level}`;
          const last = subs[subs.length - 1];
          if (last && last.label === label) last.spells.push(sp);
          else subs.push({ label, spells: [sp] });
        }
        return { key: key || "none", label: key ? SCHOOL_NAMES[key] : "Sin escuela", count: spells.length, subs };
      })
      .filter((g) => g.count > 0);
  }, [filteredSpells, sortOrder]);

  const isFavorite = !!selectedSpell && favoriteSpells.includes(selectedSpell.index);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={BookOpen}
        title="Grimorio"
        actions={
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-dm-muted bg-dm-bg-hover px-2 sm:px-3 py-1.5 rounded-sm border border-dm-border whitespace-nowrap">
            {filteredSpells.length !== spells.length ? `${filteredSpells.length} / ` : ""}{spells.length} conjuros
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar text-dm-text">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="bg-dm-bg-alt border border-dm-border rounded-sm p-3 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-dm-accent" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="col-span-2 md:col-span-1 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-dm-muted" />
                  </div>
                  <input
                    type="search"
                    placeholder="Buscar..."
                    aria-label="Buscar conjuros"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent focus:ring-1 focus:ring-dm-accent"
                  />
                </div>
                {/* Phones: the four filters fold away behind this button to leave room for the list. */}
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className={cn(
                    "md:hidden relative shrink-0 flex items-center gap-1.5 px-3 border rounded-sm text-xs uppercase tracking-wider transition-colors",
                    showFilters || activeFilterCount ? "border-dm-accent text-dm-accent" : "border-dm-border text-dm-muted"
                  )}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-dm-accent text-dm-bg-darker text-[11px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <div className={cn("col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4", !showFilters && "hidden md:grid")}>
              <Select
                aria-label="Nivel"
                value={levelFilter}
                onChange={setLevelFilter}
                dimEmpty
                className={selectClass}
                options={[{ value: "", label: "Nivel" }, { value: "0", label: "Trucos" }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ value: String(n), label: `Nivel ${n}` }))]}
              />
              <Select
                aria-label="Escuela"
                value={schoolFilter}
                onChange={setSchoolFilter}
                dimEmpty
                className={selectClass}
                options={[{ value: "", label: "Escuela" }, ...Object.entries(SCHOOL_NAMES).map(([idx, name]) => ({ value: idx, label: name }))]}
              />
              <Select
                aria-label="Clase"
                value={classFilter}
                onChange={setClassFilter}
                dimEmpty
                className={selectClass}
                options={[{ value: "", label: "Clase" }, ...Object.entries(CLASS_NAMES).map(([idx, name]) => ({ value: idx, label: name }))]}
              />
              <Select<SortOrder>
                aria-label="Orden"
                value={sortOrder}
                onChange={setSortOrder}
                className={selectClass}
                options={[
                  { value: "level_asc", label: "Por nivel ↑" },
                  { value: "level_desc", label: "Por nivel ↓" },
                  { value: "name_asc", label: "Por nombre" },
                  { value: "favorites", label: "Solo guardados" },
                ]}
              />
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setLevelFilter(""); setSchoolFilter(""); setClassFilter(""); setSortOrder("level_asc"); }}
                  className="md:hidden col-span-2 py-2 text-xs uppercase tracking-wider text-dm-muted hover:text-dm-accent"
                >
                  Limpiar filtros
                </button>
              )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-dm-muted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-dm-accent" />
              <p>Descifrando pergaminos antiguos...</p>
            </div>
          )}

          {error && (
            <div className="bg-dm-danger/20 border border-dm-danger/50 rounded-sm p-4 text-dm-danger text-center">
              Error al cargar los hechizos: {error}
            </div>
          )}

          {!isLoading && !error && filteredSpells.length === 0 && (
            <div className="p-8 text-center text-dm-muted border border-dm-border bg-dm-bg-alt rounded-sm">No se encontraron conjuros con esos filtros.</div>
          )}

          {!isLoading && !error && groups.map((g) => {
            const SchoolIcon = SCHOOL_ICONS[g.key] || Sparkles;
            return (
              <section key={g.key} className="border border-dm-border bg-dm-bg-alt rounded-sm shadow-xl">
                {/* Negative top = the scroll panel's padding, so the header sticks flush to its top edge. */}
                <h3 className="sticky -top-3 sm:-top-6 z-20 flex items-center justify-between gap-2 pl-3 pr-3 sm:pr-4 py-3 bg-dm-bg-darker border-b-2 border-dm-accent/60 shadow-[0_6px_12px_-6px_rgba(0,0,0,0.8)] text-base sm:text-lg font-display uppercase tracking-widest text-dm-accent">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="w-1 self-stretch bg-dm-accent rounded-full" aria-hidden />
                    <SchoolIcon className="w-5 h-5 shrink-0" aria-hidden />
                    <span className="truncate">{g.label}</span>
                  </span>
                  <span className="shrink-0 px-2 py-0.5 rounded-sm bg-dm-accent/15 text-[11px] font-sans font-bold tracking-wider text-dm-accent">{g.count}</span>
                </h3>
                {g.subs.map((sub) => (
                  <div key={sub.label || "all"}>
                    {sub.label && (
                      <h4 className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-dm-accent/10 border-y border-dm-accent/25 text-xs uppercase tracking-widest font-bold text-dm-accent">
                        <span className="w-2 h-2 rotate-45 bg-dm-accent shrink-0" aria-hidden />
                        {sub.label}
                        <span className="ml-auto text-[11px] font-normal tracking-wider text-dm-muted">{sub.spells.length}</span>
                      </h4>
                    )}
                    <div className="flex flex-col">
                      {sub.spells.map((spell) => (
                        <button
                          type="button"
                          key={spell.index}
                          id={`spell-${spell.index}`}
                          onClick={() => setSelectedSpell(spell)}
                          className="text-left p-3 sm:p-4 transition-colors border-t border-dm-border/60 first:border-t-0 hover:bg-dm-bg-hover [content-visibility:auto] [contain-intrinsic-size:auto_96px]"
                        >
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 xl:gap-2 mb-1.5">
                            <h3 className="text-base sm:text-lg font-bold text-dm-text-bright flex items-center gap-2 min-w-0">
                              <span className="truncate">{spell.name}</span>
                              {favoriteSpells.includes(spell.index) && <Star size={14} className="text-dm-accent shrink-0" fill="currentColor" strokeWidth={0} />}
                            </h3>
                            <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-dm-muted items-center">
                              <span className="font-semibold text-dm-accent">{translateLevel(spell.level)}</span>
                              <span>{spell.casting_time}</span>
                              <span className="hidden sm:inline">{spell.duration}</span>
                              <span><Measured text={spell.range} /></span>
                              <span className="opacity-70">{spell.components?.join(", ")}</span>
                            </div>
                          </div>
                          <p className="text-sm text-dm-text-muted leading-relaxed line-clamp-2">
                            {spell.desc?.join(" ").replace(/\*/g, "")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={!!selectedSpell}
        onClose={() => setSelectedSpell(null)}
        title={selectedSpell?.name ?? ""}
        headerRight={
          selectedSpell && (
            <button
              type="button"
              onClick={() => actions.toggleFavoriteSpell(selectedSpell.index)}
              className="p-1 text-dm-accent hover:text-dm-text-bright transition-colors flex items-center"
              title={isFavorite ? "Quitar de Guardados" : "Añadir a Guardados"}
              aria-pressed={isFavorite}
            >
              <Star size={22} className="transition-transform active:scale-90" fill={isFavorite ? "currentColor" : "transparent"} strokeWidth={isFavorite ? 0 : 2} />
            </button>
          )
        }
      >
        {selectedSpell && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-sm text-dm-muted border-b border-dm-border pb-4">
              <span><strong>Nivel:</strong> {selectedSpell.level === 0 ? "Truco" : selectedSpell.level ?? "Desconocido"}</span>
              <span><strong>Escuela:</strong> {schoolName(selectedSpell)}</span>
              <span><strong>Tiempo:</strong> {selectedSpell.casting_time}</span>
              <span><strong>Duración:</strong> {selectedSpell.duration}</span>
              <span><strong>Rango:</strong> <Measured text={selectedSpell.range} /></span>
              <span><strong>Componentes:</strong> {selectedSpell.components?.join(", ")}</span>
            </div>

            <div className="text-sm text-dm-text leading-relaxed space-y-3 prose prose-invert prose-sm max-w-none prose-strong:text-dm-accent">
              <Markdown units>{selectedSpell.desc?.join("\n\n") || ""}</Markdown>
              {selectedSpell.higher_level && selectedSpell.higher_level.length > 0 && (
                <div className="mt-4">
                  <strong className="text-dm-accent">A niveles superiores: </strong>
                  <Markdown units>{selectedSpell.higher_level.join("\n\n")}</Markdown>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
