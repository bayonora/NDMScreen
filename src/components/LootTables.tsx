import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Trash2, Search, Gem, Package, Hammer, Type, List, AlignLeft, Pencil, ArrowRight, Check, Dices, RotateCcw, Sword, Shield, FlaskConical, Backpack, Scale, Coins } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Overlay } from "./ui/Modal";
import { ColorPicker, DEFAULT_COLOR } from "./ui/ColorPicker";
import { SegmentedTabs } from "./ui/ViewHeader";
import { Chip, RarityDot } from "./ui/Chip";
import { useStore } from "../store/useStore";
import { useItemCatalogStore } from "../store/useItemCatalogStore";
import { cn, normalizeSearchText } from "../lib/utils";
import {
  rarityInfo, rarityLabel, categoryLabel, RARITIES, ITEM_GROUPS, ITEM_TYPES, itemTypeInfo, itemPlace, catalogTypeKey, catalogRarityKey,
  homebrewTypeKey, homebrewRarityKey, type ItemGroup,
} from "../data/itemLabels";
import {
  tableEntries, linesToEntries, entriesToLines, totalWeight, entryRanges, formatRange, formatPercent, rollTable, tablePayload,
  STANDARD_DICE, weightsForChances, setChance, chancesWithNew, normalizeChances, chanceError, formatChance,
} from "../lib/loot";
import type { LootEntry, LootTable } from "../types";

const panelClass = "relative bg-dm-bg/90 backdrop-blur-xl gecko:backdrop-filter-none gecko:bg-dm-bg/95 border border-dm-accent/20 rounded-xl w-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95";
const labelClass = "block text-xs uppercase tracking-widest text-dm-muted mb-1";
const fieldClass = "w-full bg-black/40 border border-dm-border p-2 text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none";
const primaryButtonClass = "px-4 py-2 bg-dm-accent text-dm-bg-darker hover:bg-dm-accent-hover disabled:opacity-50 transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2";

interface EntryLook {
  icon: typeof Gem;
  /** The item's own color (rarity or homebrew color), if it has one. */
  color?: string;
  /** Color for bars and highlights: the item's color, or a neutral one by kind. */
  tone: string;
  label: string;
  linked: boolean;
}

const MUNDANE_TONE = "var(--theme-muted)";
const TEXT_TONE = "var(--theme-accent)";

/** Icon (and color) that tells what a result is: magic item, equipment, homebrew or free text. */
function useEntryLook() {
  const catalog = useItemCatalogStore((s) => s.items);
  const customItems = useStore((s) => s.customItems);
  return (e: LootEntry): EntryLook => {
    if (e.ref?.kind === "srd") {
      const it = catalog.find((i) => i.index === e.ref!.id);
      if (it?.kind === "magic") {
        const color = rarityInfo(it.rarities?.[0] ?? it.rarity)?.color;
        return { icon: Gem, color, tone: color ?? TEXT_TONE, label: rarityLabel(it), linked: true };
      }
      return { icon: Package, tone: MUNDANE_TONE, label: it ? categoryLabel(it) : "Equipo", linked: !!it || catalog.length === 0 };
    }
    if (e.ref?.kind === "homebrew") {
      const it = customItems.find((i) => i.id === e.ref!.id);
      if (!it) return { icon: Hammer, tone: MUNDANE_TONE, label: "Homebrew", linked: false };
      const rarity = rarityInfo(homebrewRarityKey(it));
      const color = rarity?.color ?? it.color;
      const kind = it.category || itemTypeInfo(homebrewTypeKey(it))?.label;
      return { icon: Hammer, color, tone: color ?? MUNDANE_TONE, label: ["Homebrew", it.rarity || rarity?.label || kind].filter(Boolean).join(" · "), linked: true };
    }
    return { icon: Type, tone: TEXT_TONE, label: "Texto", linked: false };
  };
}

/** Both links point at the same item. */
const sameRef = (a?: LootEntry["ref"], b?: LootEntry["ref"]) => !!a && !!b && a.kind === b.kind && a.id === b.id;

/** `color` at `percent` % over transparent, for tinted backgrounds and borders. */
const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** Die range as a small die-face chip ("1–30"). */
function RangeChip({ range, active, className }: { range: { from: number; to: number }; active?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex justify-center min-w-[3.25rem] px-1.5 py-0.5 rounded-sm border font-mono text-[11px] tabular-nums leading-tight transition-colors",
        active ? "border-dm-accent bg-dm-accent text-dm-bg-darker font-bold" : "border-dm-border bg-dm-bg text-dm-accent",
        className
      )}
      title="Rango del dado"
    >
      {formatRange(range)}
    </span>
  );
}

/**
 * The whole table in one strip: each result is a segment as wide as its chance, in its color.
 * With `active`, the other segments fade (the result just rolled).
 */
function DistributionBar({ entries, look, active, className }: { entries: LootEntry[]; look: (e: LootEntry) => EntryLook; active?: number | null; className?: string }) {
  const total = totalWeight(entries);
  if (!total) return <div className={cn("h-1.5 rounded-full bg-dm-border/40", className)} aria-hidden />;
  const ranges = entryRanges(entries);
  return (
    <div className={cn("flex h-1.5 gap-px rounded-full overflow-hidden", className)} aria-hidden>
      {entries.map((e, i) => (
        <span
          key={e.id}
          title={`${formatRange(ranges[i])} · ${e.text} · ${formatPercent(e.weight, total)}`}
          className="h-full min-w-[3px] transition-opacity duration-300"
          style={{ flex: `${e.weight} 1 0`, backgroundColor: look(e).tone, opacity: active == null || active < 0 ? 0.85 : i === active ? 1 : 0.2 }}
        />
      ))}
    </div>
  );
}

/** A d20 silhouette with a number (or "d100") on it. Glows in `color`. */
function DieMedallion({ children, color, spinning, glow, size = 88 }: { children: React.ReactNode; color: string; spinning?: boolean; glow?: boolean; size?: number }) {
  return (
    <div className="relative shrink-0 grid place-items-center" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        className={cn("absolute inset-0 w-full h-full transition-[color,filter] duration-500", spinning && "animate-spin [animation-duration:1.4s]")}
        style={{ color, filter: glow ? `drop-shadow(0 0 12px ${tint(color, 70)})` : undefined }}
        aria-hidden
      >
        <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" strokeWidth="2.5" fill="currentColor" fillOpacity="0.07" />
        <polygon points="50,21 78,68 22,68" strokeWidth="1.25" strokeOpacity="0.45" />
        <path d="M50 3 50 21M91 26.5 50 21M91 26.5 78 68M91 73.5 78 68M50 97 78 68M50 97 22 68M9 73.5 22 68M9 26.5 22 68M9 26.5 50 21" strokeWidth="1" strokeOpacity="0.3" />
      </svg>
      <span className="relative font-display font-bold tabular-nums leading-none text-dm-text-bright drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{children}</span>
    </div>
  );
}

/**
 * Two results with the same name but different origin (the manual's "Poción de curación" and a
 * homebrew one) would merge in text mode, where each result is just a line. The newcomer gets a
 * tag: "Poción de curación (homebrew)".
 */
function distinctText(list: LootEntry[], text: string, origin?: string) {
  const taken = (t: string) => list.some((e) => e.text.trim().toLowerCase() === t.trim().toLowerCase());
  if (!taken(text)) return text;
  const tagged = origin ? `${text} (${origin})` : text;
  if (!taken(tagged)) return tagged;
  let n = 2;
  while (taken(`${tagged} ${n}`)) n++;
  return `${tagged} ${n}`;
}

// ----------------------------------------------------------------------------------------- editor

interface EditorProps {
  /** Table to edit; `undefined` = closed, `null` = new table. */
  table: LootTable | null | undefined;
  onClose: () => void;
  onSave: (data: Omit<LootTable, "id">) => void;
}

export function LootTableEditor({ table, onClose, onSave }: EditorProps) {
  const open = table !== undefined;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  // In list mode each entry's `percent` is what the DM typed; die faces are derived from it.
  const [entries, setEntries] = useState<LootEntry[]>([]);
  const [die, setDie] = useState<number | "auto">("auto");
  const [mode, setMode] = useState<"list" | "text">("list");
  const [text, setText] = useState("");
  const [newText, setNewText] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState(false);
  const fetchCatalog = useItemCatalogStore((s) => s.fetchItems);
  const look = useEntryLook();

  useEffect(() => {
    if (!open) return;
    fetchCatalog(); // to show icons and rarity colors of linked items
    setName(table?.name ?? "");
    setDescription(table?.description ?? "");
    setColor(table?.color ?? DEFAULT_COLOR);
    const loaded = table ? tableEntries(table) : [];
    const sum = totalWeight(loaded);
    setEntries(loaded.map((e) => ({ ...e, percent: e.percent ?? (sum ? (e.weight / sum) * 100 : 0) })));
    // Keep a table's die as it was: the one chosen, automatic if chances were typed, or its
    // current size for tables made before chances existed (so nothing changes just by opening it).
    setDie(table?.die ?? (loaded.some((e) => e.percent !== undefined) || !sum ? "auto" : sum));
    setMode("list");
    setNewText("");
    setDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, table?.id]);

  const chances = entries.map((e) => e.percent ?? 0);
  const fit = weightsForChances(chances, die);
  const listEntries = entries.map((e, i) => ({ ...e, weight: fit.weights[i] ?? 1 }));
  // In text mode the textarea is the source of truth; entries are rebuilt from it (keeping links).
  const current = mode === "text" ? linesToEntries(text.split("\n"), entries) : listEntries;
  const total = totalWeight(current);
  const ranges = entryRanges(current);
  const maxWeight = Math.max(1, ...current.map((e) => e.weight));
  const offTarget = mode === "list" && die !== "auto" && chanceError(chances, fit.weights) > 1;
  const dieOptions = [...new Set([...STANDARD_DICE, ...(typeof die === "number" ? [die] : [])])].sort((a, b) => a - b);

  const switchMode = (m: "list" | "text") => {
    if (m === mode) return;
    if (m === "text") setText(entriesToLines(listEntries).join("\n"));
    else {
      // Back from text: the lines are exact units, so the die is fixed to their count.
      const rebuilt = linesToEntries(text.split("\n"), entries);
      const sum = totalWeight(rebuilt);
      setEntries(rebuilt.map((e) => ({ ...e, percent: sum ? (e.weight / sum) * 100 : 0 })));
      setDie(sum || "auto");
      setDrafts({});
    }
    setMode(m);
  };

  const withChances = (list: LootEntry[], percents: number[]) => list.map((e, i) => ({ ...e, percent: percents[i] }));
  const setEntryText = (id: string, t: string) => setEntries((list) => list.map((e) => (e.id === id ? { ...e, text: t } : e)));
  const remove = (id: string) =>
    setEntries((list) => {
      const rest = list.filter((e) => e.id !== id);
      return withChances(rest, normalizeChances(rest.map((e) => e.percent ?? 0)));
    });

  const commitChance = (id: string) => {
    const raw = drafts[id];
    setDrafts(({ [id]: _, ...rest }) => rest);
    if (raw === undefined) return;
    const value = Number(raw.replace(",", ".").replace("%", "").trim());
    if (!Number.isFinite(value)) return;
    setEntries((list) => {
      const i = list.findIndex((e) => e.id === id);
      return withChances(list, setChance(list.map((e) => e.percent ?? 0), i, value));
    });
  };

  /** Adds a result with an equal share; adding one that's already there raises its chance a step. Returns the new id. */
  const addEntry = (entry: Omit<LootEntry, "id" | "weight">, origin?: string) => {
    const id = uuidv4();
    setEntries((list) => {
      const percents = list.map((e) => e.percent ?? 0);
      const i = list.findIndex((e) =>
        entry.ref ? sameRef(e.ref, entry.ref) : !e.ref && e.text.trim().toLowerCase() === entry.text.trim().toLowerCase()
      );
      if (i >= 0) return withChances(list, setChance(percents, i, percents[i] + 100 / Math.max(fit.faces, list.length)));
      const next = [...list, { ...entry, text: distinctText(list, entry.text, origin), id, weight: 1 }];
      return withChances(next, chancesWithNew(percents));
    });
    return id;
  };

  // Rows added from the picker glow once it closes, so the eye finds them among the others.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!flash.size) return;
    const t = setTimeout(() => setFlash(new Set()), 2600);
    return () => clearTimeout(t);
  }, [flash]);
  const closePicker = () => {
    setPicking(false);
    setFlash(fresh);
    setFresh(new Set());
  };

  /** Picker: the item goes in if it isn't in the table, and out if it is. */
  const toggleItem = (entry: Omit<LootEntry, "id" | "weight">, origin: string) => {
    if (mode === "text") {
      const there = current.find((e) => sameRef(e.ref, entry.ref));
      if (there) {
        const key = there.text.trim().toLowerCase();
        setText((t) => t.split("\n").filter((l) => l.trim().toLowerCase() !== key).join("\n"));
        return;
      }
      // Text mode: add a line; the entry list only lends the item link to that line.
      const known = entries.find((e) => sameRef(e.ref, entry.ref));
      const line = known ? known.text : distinctText(current, entry.text, origin);
      setText((t) => (t.trim() ? t.replace(/\s*$/, "\n") : "") + line);
      if (!known) setEntries((list) => [...list, { ...entry, text: line, id: uuidv4(), weight: 1 }]);
      return;
    }
    const there = entries.find((e) => sameRef(e.ref, entry.ref));
    if (there) {
      remove(there.id);
      setFresh((s) => {
        const n = new Set(s);
        n.delete(there.id);
        return n;
      });
    } else {
      const id = addEntry(entry, origin);
      setFresh((s) => new Set(s).add(id));
    }
  };

  /** Every result gets the same chance. */
  const equalize = () => setEntries((list) => withChances(list, list.map(() => 100 / (list.length || 1))));
  const isEqual = chances.length > 1 && chances.every((p) => Math.abs(p - chances[0]) < 0.05);

  const addText = () => {
    if (!newText.trim()) return;
    const known = entries.some((e) => !e.ref && e.text.trim().toLowerCase() === newText.trim().toLowerCase());
    const id = addEntry({ text: newText.trim() });
    if (!known) setFlash(new Set([id]));
    setNewText("");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const sum = totalWeight(current);
    const saved = mode === "text" ? current.map((x) => ({ ...x, percent: sum ? (x.weight / sum) * 100 : 0 })) : current;
    onSave({ name: name.trim(), description, color, ...tablePayload(saved), die: mode === "text" ? sum || undefined : die === "auto" ? undefined : die });
  };

  return (
    <>
      <Overlay isOpen={open} onClose={onClose} closeOnBackdrop={false}>
        <form onSubmit={save} className={cn(panelClass, "max-w-2xl h-full sm:h-[85vh]")}>
          <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-4 pb-3 border-b border-dm-accent/10">
            <h2 className="flex items-center gap-2.5 font-display text-lg sm:text-xl text-dm-accent tracking-widest uppercase">
              <span className="w-1.5 h-5 shrink-0" style={{ backgroundColor: color }} aria-hidden />
              {table ? "Editar tabla de botín" : "Nueva tabla de botín"}
            </h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-4">
            <div className="grid sm:grid-cols-[1fr_auto] gap-x-4 gap-y-3 items-end">
              <div>
                <label className={labelClass} htmlFor="loot-name">Nombre</label>
                <input id="loot-name" value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass} placeholder="Ej. Tesoro de dragón adulto" />
              </div>
              <ColorPicker value={color} onChange={setColor} className="mb-0 gap-1.5 [&>button]:w-7 [&>button]:h-7" />
            </div>
            <div>
              <label className={labelClass} htmlFor="loot-desc">Descripción (opcional)</label>
              <textarea id="loot-desc" value={description} onChange={(e) => setDescription(e.target.value)} className={cn(fieldClass, "text-sm resize-none h-16")} placeholder="Cuándo se tira, de dónde sale el botín..." />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-widest text-dm-muted">Resultados</h3>
                  {total > 0 && <span className="px-1.5 py-0.5 border border-dm-accent/40 bg-dm-accent/10 font-mono text-xs text-dm-accent font-bold">d{total}</span>}
                </div>
                <SegmentedTabs<"list" | "text">
                  value={mode}
                  onChange={switchMode}
                  className="w-auto"
                  options={[
                    { value: "list", label: <span className="flex items-center gap-1.5"><List size={13} /> Lista</span> },
                    { value: "text", label: <span className="flex items-center gap-1.5"><AlignLeft size={13} /> Texto</span> },
                  ]}
                />
              </div>

              {mode === "list" ? (
                <>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3" role="radiogroup" aria-label="Dado de la tabla">
                    <span className="text-[11px] uppercase tracking-widest text-dm-muted mr-1">Dado</span>
                    {(["auto", ...dieOptions] as (number | "auto")[]).map((n) => {
                      const active = die === n;
                      const disabled = n !== "auto" && n < entries.length;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={disabled}
                          onClick={() => setDie(n)}
                          title={n === "auto" ? "Elige el dado más pequeño que respeta tus porcentajes (±1 %)" : disabled ? `Hay más resultados que caras en un d${n}` : undefined}
                          className={cn(
                            "px-2 py-1 border font-mono text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                            active
                              ? "border-dm-accent bg-dm-accent text-dm-bg-darker font-bold"
                              : die === "auto" && n === fit.faces
                                ? "border-dm-accent/60 border-dashed text-dm-accent" // the die Auto picked
                                : "border-dm-border text-dm-muted enabled:hover:border-dm-accent enabled:hover:text-dm-accent"
                          )}
                        >
                          {n === "auto" ? <span className="font-sans uppercase tracking-wider text-[11px]">Auto{active && fit.faces ? ` · d${fit.faces}` : ""}</span> : `d${n}`}
                        </button>
                      );
                    })}
                  </div>

                  {current.length > 0 && <DistributionBar entries={current} look={look} className="mb-2 h-2" />}
                  {current.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-[11px] text-dm-muted">
                      <p>Los porcentajes siempre suman 100 %: al añadir, quitar o cambiar uno, los demás se ajustan en proporción.</p>
                      <button
                        type="button"
                        onClick={equalize}
                        disabled={isEqual}
                        className="flex items-center gap-1 uppercase tracking-wider font-bold text-dm-accent hover:underline disabled:opacity-40 disabled:no-underline"
                      >
                        <Scale size={12} /> Repartir por igual
                      </button>
                    </div>
                  )}

                  {current.length === 0 ? (
                    <div className="border border-dashed border-dm-border px-6 py-8 flex flex-col items-center gap-2 text-center text-sm text-dm-muted">
                      <Dices size={28} className="text-dm-border-focus" />
                      <p>La tabla está vacía.</p>
                      <p className="text-xs">Añade objetos del catálogo o de tu homebrew, o escribe un resultado (monedas, pistas, nada de valor…).</p>
                    </div>
                  ) : (
                    <ul className="border border-dm-border divide-y divide-dm-border bg-dm-bg-darker/60">
                      {current.map((e, i) => {
                        const l = look(e);
                        const Icon = l.icon;
                        return (
                          <li key={e.id} className={cn("relative flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1.5 px-2 py-1.5", flash.has(e.id) && "search-flash z-10")}>
                            <span
                              aria-hidden
                              className="absolute left-0 bottom-0 h-0.5 transition-[width] duration-300"
                              style={{ width: `${(e.weight / maxWeight) * 100}%`, backgroundColor: l.tone, opacity: 0.55 }}
                            />
                            <RangeChip range={ranges[i]} className="shrink-0" />
                            <Icon size={15} className="shrink-0" style={{ color: l.color ?? "var(--theme-muted)" }} aria-label={l.label} />
                            <input
                              value={e.text}
                              onChange={(ev) => setEntryText(e.id, ev.target.value)}
                              aria-label="Resultado"
                              className="flex-1 min-w-0 basis-40 bg-transparent border border-transparent hover:border-dm-border focus:border-dm-accent px-1.5 py-1 text-sm text-dm-text-bright outline-none"
                            />
                            <div className="flex items-center gap-1 ml-auto sm:ml-0">
                              <label className="flex items-center border border-dm-border bg-dm-bg focus-within:border-dm-accent" title="Probabilidad de este resultado">
                                <input
                                  inputMode="decimal"
                                  value={drafts[e.id] ?? formatChance(e.percent ?? 0)}
                                  onChange={(ev) => setDrafts((d) => ({ ...d, [e.id]: ev.target.value }))}
                                  onBlur={() => commitChance(e.id)}
                                  onFocus={(ev) => ev.target.select()}
                                  onKeyDown={(ev) => {
                                    if (ev.key === "Enter") {
                                      ev.preventDefault();
                                      (ev.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  aria-label={`Probabilidad de ${e.text} (%)`}
                                  className="w-12 bg-transparent text-right text-sm text-dm-text-bright tabular-nums outline-none py-1"
                                />
                                <span className="pl-0.5 pr-2 text-xs text-dm-muted">%</span>
                              </label>
                              <span
                                className="w-14 text-right text-[11px] text-dm-muted tabular-nums leading-tight"
                                title={`Ocupa ${e.weight} ${e.weight === 1 ? "cara" : "caras"} del d${total} (${e.weight} ${e.weight === 1 ? "línea" : "líneas"} en el modo Texto)`}
                              >
                                ×{e.weight}
                                {Math.abs((e.weight / total) * 100 - (e.percent ?? 0)) >= 0.5 && <span className={cn("block", offTarget ? "text-dm-danger" : "text-dm-muted-alt")}>{formatPercent(e.weight, total)}</span>}
                              </span>
                              <button type="button" onClick={() => remove(e.id)} className="p-1.5 text-dm-muted-alt hover:text-dm-danger" aria-label={`Quitar ${e.text}`}><X size={14} /></button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {offTarget && (
                    <p className="mt-2 text-[11px] text-dm-danger">
                      Con un d{fit.faces} no se pueden respetar exactamente esos porcentajes (debajo de cada «×» ves el real). Usa «Auto» o un dado mayor.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={() => setPicking(true)} className="flex items-center gap-1.5 px-3 py-2 border border-dm-accent/50 text-dm-accent text-xs uppercase tracking-wider font-bold hover:bg-dm-accent/10">
                      <Plus size={14} /> Añadir objetos
                    </button>
                    <div className="flex flex-1 min-w-48">
                      <input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addText();
                          }
                        }}
                        placeholder="Escribe un resultado (Ej. 1000 po) y pulsa Enter"
                        aria-label="Nuevo resultado de texto"
                        className={cn(fieldClass, "text-sm py-1.5")}
                      />
                      <button type="button" onClick={addText} disabled={!newText.trim()} className="px-3 border border-l-0 border-dm-border text-dm-muted hover:text-dm-accent disabled:opacity-40" aria-label="Añadir resultado"><Plus size={14} /></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid sm:grid-cols-[1fr_14rem] gap-3">
                  <div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      aria-label="Resultados, uno por línea"
                      className={cn(fieldClass, "h-64 font-mono text-sm resize-y whitespace-pre")}
                      placeholder={"1000 po\nPoción de curación\nPoción de curación\nEspada larga +1"}
                    />
                    <p className="text-[11px] text-dm-muted mt-1">Un resultado por línea. Repite una línea para hacerlo más probable.</p>
                  </div>
                  <div className="border border-dm-border bg-dm-bg-darker/60 p-2 text-xs max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="uppercase tracking-widest text-dm-muted mb-1.5">Probabilidades</div>
                    {current.length === 0 && <p className="text-dm-muted italic">Sin resultados.</p>}
                    {current.length > 0 && <DistributionBar entries={current} look={look} className="mb-2" />}
                    <ul className="space-y-1">
                      {current.map((e, i) => (
                        <li key={e.id} className="flex items-center gap-2">
                          <RangeChip range={ranges[i]} className="shrink-0 min-w-[2.75rem] text-[10px] py-0" />
                          <span className="flex-1 min-w-0 truncate text-dm-text">{e.text}</span>
                          <span className="text-dm-muted tabular-nums">{formatPercent(e.weight, total)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-t border-dm-border">
            <span className="text-xs text-dm-muted">
              {current.length} {current.length === 1 ? "resultado" : "resultados"}{total > 0 && <> · se tira con <strong className="text-dm-accent">d{total}</strong></>}
            </span>
            <button type="submit" disabled={!name.trim()} className={cn(primaryButtonClass, "ml-auto px-6")}>Guardar tabla</button>
          </div>
        </form>
      </Overlay>

      <LootItemPicker open={open && picking} entries={current} onClose={closePicker} onToggle={toggleItem} />
    </>
  );
}

// ----------------------------------------------------------------------------------------- picker

/** Groups of the picker, by what the item is (not by mundane/magic, which the DM rarely thinks in). */
type PickerGroup = "all" | "homebrew" | ItemGroup;

/** Icon of each item group (picker and homebrew filters). */
export const GROUP_ICONS: Record<ItemGroup, typeof Gem> = { weapons: Sword, armor: Shield, consumables: FlaskConical, magic: Gem, gear: Backpack, treasure: Coins };

const PICKER_GROUPS: { key: PickerGroup; label: string; icon: typeof Gem }[] = [
  { key: "all", label: "Todo", icon: Search },
  { key: "homebrew", label: "Homebrew", icon: Hammer },
  ...ITEM_GROUPS.map((g) => ({ ...g, icon: GROUP_ICONS[g.key] })),
];

/** Subgroups in the order of ITEM_TYPES, with "Mágicas" (weapons and armor with a rarity) last. */
const SUBGROUP_ORDER = [...new Set([...ITEM_TYPES.map((t) => t.subgroup), "Mágicas"])];
const NO_RARITY = "none";

interface PickerOption {
  key: string;
  kind: "homebrew" | "mundane" | "magic";
  ref: { kind: "srd" | "homebrew"; id: string };
  name: string;
  sub: string;
  color?: string;
  icon: typeof Gem;
  group: ItemGroup;
  subgroup: string;
  /** Rarity key (first one for "+1, +2 o +3"); missing = no rarity. */
  rarity?: string;
  search: string;
}

function LootItemPicker({ open, entries, onClose, onToggle }: {
  open: boolean;
  entries: LootEntry[];
  onClose: () => void;
  /**
   * Adds the item to the table, or takes it out if it's already there.
   * `origin` tags same-named results apart: "homebrew", "equipo" or "mágico".
   */
  onToggle: (entry: Omit<LootEntry, "id" | "weight">, origin: string) => void;
}) {
  const catalog = useItemCatalogStore((s) => s.items);
  const customItems = useStore((s) => s.customItems);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<PickerGroup>("all");
  const [subgroup, setSubgroup] = useState<string | null>(null);
  const [rarity, setRarity] = useState<string | null>(null);
  const [onlyInTable, setOnlyInTable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    setOnlyInTable(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const options = useMemo<PickerOption[]>(() => {
    const list: Omit<PickerOption, "search">[] = [
      ...customItems.map((i) => {
        const type = homebrewTypeKey(i);
        const rarity = homebrewRarityKey(i);
        return {
          key: `h-${i.id}`, kind: "homebrew" as const, ref: { kind: "homebrew" as const, id: i.id }, name: i.name,
          sub: ["Homebrew", i.category || itemTypeInfo(type)?.label, i.rarity || rarityInfo(rarity)?.label, i.value].filter(Boolean).join(" · "),
          color: rarityInfo(rarity)?.color ?? i.color, icon: Hammer, rarity,
          ...itemPlace(type, rarity),
        };
      }),
      ...catalog.map((i) => {
        const rarity = catalogRarityKey(i);
        return {
          key: `s-${i.index}`, kind: i.kind, ref: { kind: "srd" as const, id: i.index }, name: i.name,
          sub: i.kind === "magic" ? [i.item_type, rarityLabel(i)].filter(Boolean).join(" · ") : [i.subcategory ?? categoryLabel(i), i.cost].filter(Boolean).join(" · "),
          color: rarityInfo(rarity)?.color,
          icon: i.kind === "magic" ? Gem : Package,
          rarity,
          ...itemPlace(catalogTypeKey(i), rarity),
        };
      }),
    ];
    return list.map((o) => ({ ...o, search: normalizeSearchText(`${o.name} ${o.sub}`) }));
  }, [catalog, customItems]);

  const inTable = new Set(entries.filter((e) => e.ref).map((e) => `${e.ref!.kind === "homebrew" ? "h" : "s"}-${e.ref!.id}`));
  const words = normalizeSearchText(q.trim()).split(/\s+/).filter(Boolean);
  const inGroup = (o: PickerOption, g: PickerGroup) => g === "all" || (g === "homebrew" ? o.kind === "homebrew" : o.group === g);
  const byGroup = options.filter((o) => inGroup(o, group) && (!onlyInTable || inTable.has(o.key)) && words.every((w) => o.search.includes(w)));

  // Subgroups and rarities on offer for what the group (and search) leaves. In Homebrew the
  // "subgroups" are the big groups (Armas, Pociones…), since there are usually few items.
  const subOf = (o: PickerOption) => (group === "homebrew" ? (ITEM_GROUPS.find((g) => g.key === o.group)?.label ?? "") : o.subgroup);
  const order = group === "homebrew" ? ITEM_GROUPS.map((g) => g.label) : SUBGROUP_ORDER;
  const subgroups = group === "all" ? [] : [...new Set(byGroup.map(subOf))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const bySubgroup = subgroup && subgroups.includes(subgroup) ? byGroup.filter((o) => subOf(o) === subgroup) : byGroup;
  const rarities = RARITIES.filter((r) => bySubgroup.some((o) => o.rarity === r.key));
  const hasMundane = bySubgroup.some((o) => !o.rarity);
  const activeRarity = rarity && (rarities.some((r) => r.key === rarity) || (rarity === NO_RARITY && hasMundane)) ? rarity : null;
  const matches = activeRarity ? bySubgroup.filter((o) => (activeRarity === NO_RARITY ? !o.rarity : o.rarity === activeRarity)) : bySubgroup;

  const LIMIT = 120;
  const groupCount = (g: PickerGroup) => options.filter((o) => inGroup(o, g)).length;
  const pickGroup = (g: PickerGroup) => {
    setGroup(g);
    setSubgroup(null);
    setRarity(null);
    listRef.current?.scrollTo({ top: 0 });
  };

  return (
    <Overlay isOpen={open} onClose={onClose} zIndex="z-[60]">
      <div role="dialog" aria-modal="true" aria-label="Añadir objetos a la tabla" className={cn(panelClass, "max-w-2xl h-full sm:h-[85vh]")}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-dm-accent/10">
          <h2 className="font-display text-lg text-dm-accent tracking-widest uppercase">Añadir objetos</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
        </div>

        <div className="px-4 py-3 space-y-2.5 border-b border-dm-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm-muted" />
            <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar objeto..." aria-label="Buscar objeto" className={cn(fieldClass, "pl-9 text-sm")} />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Tipo de objeto">
            {PICKER_GROUPS.map(({ key, label, icon: Icon }) => {
              const n = groupCount(key);
              if (key === "homebrew" && n === 0) return null;
              return (
                <Chip key={key} active={group === key} onClick={() => pickGroup(key)}>
                  <Icon size={12} /> {label} <span className="opacity-60 tabular-nums">{n}</span>
                </Chip>
              );
            })}
          </div>
          {subgroups.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-dm-accent/30" aria-label="Subgrupo">
              <Chip active={!subgroup} onClick={() => setSubgroup(null)} className="py-0.5 text-[11px]">Todas</Chip>
              {subgroups.map((s) => (
                <Chip key={s} active={subgroup === s} onClick={() => setSubgroup(subgroup === s ? null : s)} className="py-0.5 text-[11px]">{s}</Chip>
              ))}
            </div>
          )}
          {rarities.length + (hasMundane ? 1 : 0) > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Rareza">
              <span className="text-[10px] uppercase tracking-widest text-dm-muted mr-1">Rareza</span>
              {hasMundane && (
                <Chip active={activeRarity === NO_RARITY} onClick={() => setRarity(activeRarity === NO_RARITY ? null : NO_RARITY)} className="py-0.5 text-[11px]">
                  <RarityDot />
                  Sin rareza
                </Chip>
              )}
              {rarities.map((r) => (
                <Chip key={r.key} active={activeRarity === r.key} color={r.color} onClick={() => setRarity(activeRarity === r.key ? null : r.key)} className="py-0.5 text-[11px]">
                  <RarityDot color={r.color} active={activeRarity === r.key} />
                  {r.label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-b border-dm-border/60 bg-dm-bg-darker/40 text-[11px] text-dm-muted">
          <span className="tabular-nums">{matches.length} {matches.length === 1 ? "objeto" : "objetos"}</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none hover:text-dm-accent">
            <input type="checkbox" checked={onlyInTable} onChange={(e) => setOnlyInTable(e.target.checked)} className="accent-[var(--theme-accent)]" />
            Solo los que ya están en la tabla
          </label>
        </div>

        <ul ref={listRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-dm-border/60">
          {catalog.length === 0 && group !== "homebrew" && <li className="p-4 text-sm text-dm-muted text-center">Cargando el catálogo…</li>}
          {matches.slice(0, LIMIT).map((o) => {
            const Icon = o.icon;
            const checked = inTable.has(o.key);
            return (
              <li key={o.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggle({ text: o.name, ref: o.ref }, o.kind === "homebrew" ? "homebrew" : o.kind === "magic" ? "mágico" : "equipo")}
                  className={cn("group/opt w-full text-left flex items-center gap-3 px-4 py-2 transition-colors", checked ? "bg-dm-accent/[0.07] hover:bg-dm-accent/10" : "hover:bg-dm-bg-hover")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "shrink-0 w-5 h-5 grid place-items-center border transition-colors",
                      checked ? "bg-dm-accent border-dm-accent text-dm-bg-darker" : "border-dm-border-focus text-transparent group-hover/opt:border-dm-accent group-hover/opt:text-dm-accent/60"
                    )}
                  >
                    {checked ? <Check size={14} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                  </span>
                  <Icon size={16} className="shrink-0" style={{ color: o.color ?? "var(--theme-muted)" }} />
                  <span className="flex-1 min-w-0">
                    <span className={cn("block truncate", checked ? "font-bold text-dm-accent" : "font-semibold text-dm-text-bright")}>{o.name}</span>
                    <span className="block text-xs text-dm-muted truncate">{o.sub}</span>
                  </span>
                  {checked && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold">
                      <span className="text-dm-accent can-hover:group-hover/opt:hidden">En la tabla</span>
                      <span className="hidden can-hover:group-hover/opt:inline text-dm-danger">Quitar</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {matches.length > LIMIT && <li className="p-3 text-xs text-dm-muted text-center">Hay {matches.length - LIMIT} más: sigue escribiendo o filtra para afinar.</li>}
          {matches.length === 0 && (catalog.length > 0 || group === "homebrew") && (
            <li className="p-6 text-sm text-dm-muted text-center">{onlyInTable ? "No hay objetos de este tipo en la tabla." : q ? `Nada coincide con «${q}».` : "No hay objetos aquí."}</li>
          )}
        </ul>

        <div className="px-4 py-3 border-t border-dm-border flex items-center gap-3">
          <span className="text-xs text-dm-muted">
            <strong className="text-dm-accent tabular-nums">{inTable.size}</strong> {inTable.size === 1 ? "objeto" : "objetos"} en la tabla.
            <span className="hidden sm:inline"> Marca para añadir, desmarca para quitar.</span>
          </span>
          <button type="button" onClick={onClose} className={cn(primaryButtonClass, "ml-auto")}>Listo</button>
        </div>
      </div>
    </Overlay>
  );
}

// ----------------------------------------------------------------------------------------- card

interface CardProps {
  table: LootTable;
  onOpen: () => void;
  /** Opens the table and rolls it straight away. */
  onRoll: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** A table in the grid: its most likely results, its distribution and a quick roll button. */
export function LootTableCard({ table, onOpen, onRoll, onEdit, onDelete }: CardProps) {
  const look = useEntryLook();
  const entries = tableEntries(table);
  const total = totalWeight(entries);
  const color = table.color || DEFAULT_COLOR;
  const PREVIEW = 3;
  const top = [...entries].sort((a, b) => b.weight - a.weight).slice(0, PREVIEW);
  const stop = (fn: () => void) => (ev: React.MouseEvent) => {
    ev.stopPropagation();
    fn();
  };

  return (
    <div
      data-search-id={table.id}
      onClick={onOpen}
      className="group relative h-full min-h-52 flex flex-col bg-dm-bg-darker border border-dm-border overflow-hidden cursor-pointer shadow-lg active:scale-[0.98] hover:border-dm-accent hover:shadow-[0_0_15px_var(--theme-glow)] transition-[border-color,box-shadow,scale] duration-300"
    >
      <div className="h-1 shrink-0" style={{ backgroundColor: color }} />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(to bottom, ${tint(color, 12)}, transparent)` }}
      />
      <div className="relative p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <h3 className="flex-1 min-w-0 font-display text-lg leading-snug tracking-wide break-words" style={{ color }}>{table.name}</h3>
          {total > 0 && (
            <span className="shrink-0 mt-0.5 px-1.5 py-0.5 border border-dm-border bg-dm-bg font-mono text-xs text-dm-accent" title={`Se tira con un d${total}`}>d{total}</span>
          )}
        </div>
        {table.description && <p className="-mt-1.5 text-sm text-dm-text-muted line-clamp-2 break-words">{table.description}</p>}

        {entries.length > 0 ? (
          <ul className="space-y-1">
            {top.map((e) => {
              const l = look(e);
              const Icon = l.icon;
              return (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <Icon size={13} className="shrink-0" style={{ color: l.color ?? "var(--theme-muted)" }} />
                  <span className="flex-1 min-w-0 truncate text-dm-text">{e.text}</span>
                  <span className="shrink-0 text-xs text-dm-muted tabular-nums">{formatPercent(e.weight, total)}</span>
                </li>
              );
            })}
            {entries.length > PREVIEW && <li className="text-xs text-dm-muted-alt pl-5">y {entries.length - PREVIEW} más…</li>}
          </ul>
        ) : (
          <p className="text-sm text-dm-muted italic">Sin resultados todavía.</p>
        )}

        <div className="mt-auto pt-3 border-t border-dm-border/60 space-y-3">
          <DistributionBar entries={entries} look={look} />
          <div className="flex items-center gap-1">
            <span className="mr-auto text-[11px] text-dm-muted uppercase tracking-widest font-bold">
              {entries.length} {entries.length === 1 ? "resultado" : "resultados"}
            </span>
            <div className="flex items-center gap-1 can-hover:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
              <button type="button" onClick={stop(onEdit)} className="p-1.5 text-dm-muted hover:text-dm-accent transition-colors" title="Editar tabla" aria-label={`Editar ${table.name}`}>
                <Pencil size={14} />
              </button>
              <button type="button" onClick={stop(onDelete)} className="p-1.5 text-dm-muted hover:text-dm-danger transition-colors" title="Borrar tabla" aria-label={`Borrar ${table.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={stop(onRoll)}
              disabled={!total}
              className="ml-1 flex items-center gap-1.5 px-2.5 py-1 border border-dm-accent/50 text-dm-accent text-[11px] uppercase tracking-wider font-bold hover:bg-dm-accent hover:text-dm-bg-darker disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Dices size={13} /> Tirar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------------------- viewer

interface ViewerProps {
  table: LootTable | null;
  /** Roll as soon as the table opens (the card's "Tirar" button). */
  autoRoll?: boolean;
  onClose: () => void;
  onEdit: (table: LootTable) => void;
  onDelete: (table: LootTable) => void;
  /** Opens the sheet of a result linked to an item. */
  onOpenItem: (entry: LootEntry) => void;
}

/** Pause before each number the die shows while rolling: fast at first, slowing down to a stop. */
const ROLL_STEPS = [45, 45, 50, 55, 60, 65, 75, 85, 95, 110, 125, 145, 170, 200, 240];

export function LootTableViewer({ table, autoRoll, onClose, onEdit, onDelete, onOpenItem }: ViewerProps) {
  const [state, setState] = useState<"idle" | "rolling" | "result">("idle");
  const [shown, setShown] = useState(1);
  const [result, setResult] = useState<{ roll: number; index: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCatalog = useItemCatalogStore((s) => s.fetchItems);
  const look = useEntryLook();

  const entries = table ? tableEntries(table) : [];
  const total = totalWeight(entries);
  const ranges = entryRanges(entries);
  const maxWeight = Math.max(1, ...entries.map((e) => e.weight));

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const roll = () => {
    const final = rollTable(entries);
    if (!final) return;
    stop();
    setResult(null);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(final.roll);
      setResult(final);
      setState("result");
      return;
    }
    setState("rolling");
    let step = 0;
    const tick = () => {
      if (step < ROLL_STEPS.length) {
        setShown((prev) => {
          if (total < 2) return 1;
          let n = prev;
          while (n === prev) n = Math.floor(Math.random() * total) + 1;
          return n;
        });
        timer.current = setTimeout(tick, ROLL_STEPS[step++]);
        return;
      }
      timer.current = null;
      setShown(final.roll);
      setResult(final);
      setState("result");
    };
    tick();
  };

  useEffect(() => stop, []);
  useEffect(() => {
    if (!table) return;
    fetchCatalog();
    stop();
    setState("idle");
    setResult(null);
    if (autoRoll) roll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);

  useEffect(() => {
    if (state !== "result" || !result) return;
    const t = setTimeout(() => document.getElementById(`loot-entry-${result.index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    return () => clearTimeout(t);
  }, [state, result]);

  const close = () => {
    stop();
    onClose();
  };

  const color = table?.color || DEFAULT_COLOR;
  // Row the die is passing over while it rolls (roulette effect), or the one it landed on.
  const tickIndex = state === "rolling" ? ranges.findIndex((r) => shown >= r.from && shown <= r.to) : -1;
  const wonIndex = state === "result" && result ? result.index : -1;
  const won = wonIndex >= 0 ? entries[wonIndex] : null;
  const wonLook = won ? look(won) : null;
  const passing = tickIndex >= 0 ? entries[tickIndex] : null;
  const stageTone = wonLook?.tone ?? "var(--theme-accent)";

  return (
    <Overlay isOpen={!!table} onClose={close}>
      {table && (
        <div role="dialog" aria-modal="true" aria-label={table.name} className={cn(panelClass, "max-w-2xl")}>
          <div className="h-1 w-full shrink-0" style={{ backgroundColor: color }} />

          {/* Header */}
          <div className="shrink-0 flex items-start gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-dm-muted whitespace-nowrap truncate">
                <Dices size={12} className="inline -mt-0.5 mr-1.5" />Tabla de botín
                {total > 0 && <> · <span className="font-mono normal-case tracking-normal text-dm-accent">d{total}</span></>}
                <span className="hidden sm:inline"> · {entries.length} {entries.length === 1 ? "resultado" : "resultados"}</span>
              </p>
              <h2 className="font-display text-xl sm:text-2xl tracking-wide leading-tight break-words" style={{ color }}>{table.name}</h2>
              {table.description && <p className="mt-1.5 text-sm text-dm-text-muted whitespace-pre-wrap break-words">{table.description}</p>}
            </div>
            <div className="shrink-0 flex items-center -mr-1.5 -mt-1">
              <button type="button" onClick={() => { close(); onEdit(table); }} className="p-2 text-dm-muted hover:text-dm-accent transition-colors" title="Editar tabla" aria-label="Editar tabla">
                <Pencil size={17} />
              </button>
              <button type="button" onClick={() => { close(); onDelete(table); }} className="p-2 text-dm-muted hover:text-dm-danger transition-colors" title="Borrar tabla" aria-label="Borrar tabla">
                <Trash2 size={17} />
              </button>
              <button type="button" onClick={close} className="p-2 text-dm-muted hover:text-dm-text-bright transition-colors" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Roll stage */}
          <div
            className="shrink-0 mx-4 sm:mx-6 mb-4 border rounded-sm transition-[border-color,background] duration-500"
            style={{
              borderColor: state === "result" ? tint(stageTone, 55) : "var(--theme-border)",
              background: `radial-gradient(ellipse at 12% 50%, ${tint(stageTone, state === "result" ? 22 : 10)}, transparent 65%), var(--theme-bg-darker)`,
            }}
          >
            <div className="flex items-center gap-4 sm:gap-5 p-3 sm:p-4">
              <DieMedallion color={state === "result" ? stageTone : "var(--theme-accent)"} spinning={state === "rolling"} glow={state === "result"} size={84}>
                {state === "idle" ? <span className="text-base text-dm-accent">{total ? `d${total}` : "—"}</span> : <span className={cn(String(shown).length > 2 ? "text-2xl" : "text-3xl")}>{shown}</span>}
              </DieMedallion>

              <div className="flex-1 min-w-0" aria-live="polite">
                {state === "idle" && (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-dm-muted mb-1">Listo para tirar</p>
                    <p className="text-sm text-dm-text-muted mb-3">{total ? `Tira el d${total} y mira qué encuentran.` : "Esta tabla aún no tiene resultados."}</p>
                  </>
                )}
                {state === "rolling" && (
                  <>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-dm-muted mb-1">Tirando el d{total}…</p>
                    <p className="font-display text-lg sm:text-xl text-dm-text-muted/60 truncate mb-3">{passing?.text ?? "…"}</p>
                  </>
                )}
                {state === "result" && won && wonLook && (
                  <motion.div key={`${result!.roll}-${wonIndex}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                    <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: wonLook.color ?? "var(--theme-muted)" }}>
                      {wonLook.label === "Texto" ? "Resultado" : wonLook.label}
                    </p>
                    <p className="flex items-center gap-2 font-display text-lg sm:text-2xl font-bold leading-tight break-words mb-3" style={{ color: wonLook.color ?? "var(--theme-text-bright)" }}>
                      <wonLook.icon size={20} className="shrink-0" /> <span className="min-w-0">{won.text}</span>
                    </p>
                  </motion.div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={roll} disabled={state === "rolling" || total === 0} className={cn(primaryButtonClass, "py-1.5 px-3")}>
                    {state === "result" ? <><RotateCcw size={14} /> Volver a tirar</> : <><Dices size={15} /> {state === "rolling" ? "Tirando…" : "Tirar"}</>}
                  </button>
                  {state === "result" && won?.ref && wonLook?.linked && (
                    <button type="button" onClick={() => onOpenItem(won)} className="flex items-center gap-1.5 px-3 py-1.5 border border-dm-border text-xs uppercase tracking-wider font-bold text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors">
                      Ver objeto <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 min-h-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between px-3 mb-1.5 text-[10px] uppercase tracking-widest text-dm-muted">
              <span>d{total || "?"}</span>
              <span>Probabilidad</span>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto custom-scrollbar border border-dm-border bg-dm-bg-darker rounded-sm divide-y divide-dm-border/60">
              {entries.length === 0 && <li className="p-6 text-center text-sm text-dm-muted">Sin resultados. Edita la tabla para añadirlos.</li>}
              {entries.map((e, i) => {
                const l = look(e);
                const Icon = l.icon;
                const isWon = i === wonIndex;
                const isPassing = i === tickIndex;
                const name = <span className={cn("break-words", isWon ? "font-bold text-dm-text-bright" : "text-dm-text")}>{e.text}</span>;
                return (
                  <li
                    id={`loot-entry-${i}`}
                    key={e.id}
                    className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 transition-colors duration-150", !isWon && !isPassing && "hover:bg-dm-bg")}
                    style={
                      isWon
                        ? { backgroundColor: tint(l.tone, 16), boxShadow: `inset 3px 0 0 ${l.tone}` }
                        : isPassing
                          ? { backgroundColor: tint("var(--theme-accent)", 10) }
                          : undefined
                    }
                  >
                    <RangeChip range={ranges[i]} active={isWon || isPassing} />
                    <div className="min-w-0 flex items-center gap-2.5">
                      <Icon size={15} className="shrink-0" style={{ color: e.ref && l.linked ? (l.color ?? "var(--theme-muted)") : "var(--theme-muted-alt)" }} />
                      <div className="min-w-0 text-sm leading-snug">
                        {e.ref && l.linked ? (
                          <button type="button" onClick={() => onOpenItem(e)} className="text-left hover:underline decoration-dm-accent/60 underline-offset-2" title="Ver objeto">{name}</button>
                        ) : (
                          name
                        )}
                        {e.ref && <span className="block text-[11px] text-dm-muted" style={l.color ? { color: tint(l.color, 75) } : undefined}>{l.label}</span>}
                      </div>
                    </div>
                    <div className="w-14 sm:w-20 flex flex-col items-end gap-1">
                      <span className={cn("text-xs tabular-nums", isWon ? "text-dm-text-bright font-bold" : "text-dm-muted")}>{formatPercent(e.weight, total)}</span>
                      <span className="h-1 w-full rounded-full bg-dm-border/50 overflow-hidden" aria-hidden>
                        <span className="block h-full rounded-full" style={{ width: `${(e.weight / maxWeight) * 100}%`, backgroundColor: l.tone, opacity: isWon ? 1 : 0.7 }} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </Overlay>
  );
}
