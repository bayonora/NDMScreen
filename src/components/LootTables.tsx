import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Trash2, Search, Gem, Package, Hammer, Type, List, AlignLeft, Hexagon, Pencil, ArrowRight, Check } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Overlay } from "./ui/Modal";
import { ColorPicker, DEFAULT_COLOR } from "./ui/ColorPicker";
import { SegmentedTabs } from "./ui/ViewHeader";
import { useStore } from "../store/useStore";
import { useItemCatalogStore } from "../store/useItemCatalogStore";
import { cn, normalizeSearchText } from "../lib/utils";
import { rarityInfo, rarityLabel, categoryLabel } from "../data/itemLabels";
import {
  tableEntries, linesToEntries, entriesToLines, totalWeight, entryRanges, formatRange, formatPercent, rollTable, tablePayload,
  STANDARD_DICE, weightsForChances, setChance, chancesWithNew, normalizeChances, chanceError, formatChance,
} from "../lib/loot";
import type { LootEntry, LootTable } from "../types";

const panelClass = "relative bg-dm-bg/90 backdrop-blur-xl gecko:backdrop-filter-none gecko:bg-dm-bg/95 border border-dm-accent/20 rounded-xl w-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95";
const labelClass = "block text-xs uppercase tracking-widest text-dm-muted mb-1";
const fieldClass = "w-full bg-black/40 border border-dm-border p-2 text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none";
const primaryButtonClass = "px-4 py-2 bg-dm-accent text-dm-bg-darker hover:bg-dm-accent-hover disabled:opacity-50 transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2";

/** Icon (and color) that tells what a result is: magic item, equipment, homebrew or free text. */
function useEntryLook() {
  const catalog = useItemCatalogStore((s) => s.items);
  const customItems = useStore((s) => s.customItems);
  return (e: LootEntry) => {
    if (e.ref?.kind === "srd") {
      const it = catalog.find((i) => i.index === e.ref!.id);
      if (it?.kind === "magic") return { icon: Gem, color: rarityInfo(it.rarities?.[0] ?? it.rarity)?.color, label: rarityLabel(it), linked: true };
      return { icon: Package, color: undefined, label: it ? categoryLabel(it) : "Equipo", linked: !!it || catalog.length === 0 };
    }
    if (e.ref?.kind === "homebrew") {
      const it = customItems.find((i) => i.id === e.ref!.id);
      return { icon: Hammer, color: it?.color, label: "Homebrew", linked: !!it };
    }
    return { icon: Type, color: undefined, label: "Texto", linked: false };
  };
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

  /** Adds a result with an equal share; adding one that's already there raises its chance a step. */
  const addEntry = (entry: Omit<LootEntry, "id" | "weight">, origin?: string) => {
    setEntries((list) => {
      const percents = list.map((e) => e.percent ?? 0);
      const i = list.findIndex((e) =>
        entry.ref ? e.ref?.kind === entry.ref.kind && e.ref.id === entry.ref.id : !e.ref && e.text.trim().toLowerCase() === entry.text.trim().toLowerCase()
      );
      if (i >= 0) return withChances(list, setChance(percents, i, percents[i] + 100 / Math.max(fit.faces, list.length)));
      const next = [...list, { ...entry, text: distinctText(list, entry.text, origin), id: uuidv4(), weight: 1 }];
      return withChances(next, chancesWithNew(percents));
    });
  };

  const addText = () => {
    if (!newText.trim()) return;
    addEntry({ text: newText.trim() });
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
            <h2 className="text-lg sm:text-xl text-dm-accent tracking-widest uppercase font-light">{table ? "Editar tabla de botín" : "Nueva tabla de botín"}</h2>
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-widest text-dm-muted">Resultados</h3>
                  {mode === "list" ? (
                    <label className="flex items-center gap-1.5 text-xs text-dm-muted">
                      Dado
                      <select
                        value={String(die)}
                        onChange={(e) => setDie(e.target.value === "auto" ? "auto" : Number(e.target.value))}
                        className="bg-dm-bg border border-dm-border px-1.5 py-1 text-xs text-dm-accent font-bold focus:border-dm-accent outline-none"
                        title="Auto elige el dado más pequeño que respeta tus porcentajes (±1 %)"
                      >
                        <option value="auto">Auto{die === "auto" && fit.faces ? ` (d${fit.faces})` : ""}</option>
                        {dieOptions.map((n) => (
                          <option key={n} value={n} disabled={n < entries.length}>d{n}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    total > 0 && <span className="text-xs text-dm-accent font-bold">d{total}</span>
                  )}
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
                  {current.length === 0 ? (
                    <div className="border border-dashed border-dm-border p-6 text-center text-sm text-dm-muted">
                      Añade objetos del catálogo o de tu homebrew, o escribe un resultado.
                    </div>
                  ) : (
                    <ul className="border border-dm-border divide-y divide-dm-border bg-dm-bg-darker/60">
                      {current.map((e, i) => {
                        const l = look(e);
                        const Icon = l.icon;
                        return (
                          <li key={e.id} className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1.5 px-2 py-1.5">
                            <span className="w-12 shrink-0 text-center font-mono text-xs text-dm-accent tabular-nums" title="Rango del dado">{formatRange(ranges[i])}</span>
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
                                {Math.abs((e.weight / total) * 100 - (e.percent ?? 0)) >= 0.5 && <span className="block text-dm-muted-alt">{formatPercent(e.weight, total)}</span>}
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
                    <ul className="space-y-1">
                      {current.map((e, i) => (
                        <li key={e.id} className="flex items-baseline gap-2">
                          <span className="font-mono text-dm-accent tabular-nums w-10 shrink-0">{formatRange(ranges[i])}</span>
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

      <LootItemPicker
        open={open && picking}
        entries={current}
        onClose={() => setPicking(false)}
        onAdd={(entry, origin) => {
          if (mode === "text") {
            // Text mode: add a line; the entry list only lends the item link to that line.
            const known = entries.find((e) => e.ref?.kind === entry.ref?.kind && e.ref?.id === entry.ref?.id);
            const line = known ? known.text : distinctText(current, entry.text, origin);
            setText((t) => (t.trim() ? t.replace(/\s*$/, "\n") : "") + line);
            if (!known) setEntries((list) => [...list, { ...entry, text: line, id: uuidv4(), weight: 1 }]);
          } else addEntry(entry, origin);
        }}
      />
    </>
  );
}

// ----------------------------------------------------------------------------------------- picker

type PickerFilter = "all" | "homebrew" | "mundane" | "magic";

function LootItemPicker({ open, entries, onClose, onAdd }: {
  open: boolean;
  entries: LootEntry[];
  onClose: () => void;
  /** `origin` tags same-named results apart: "homebrew", "equipo" or "mágico". */
  onAdd: (entry: Omit<LootEntry, "id" | "weight">, origin: string) => void;
}) {
  const catalog = useItemCatalogStore((s) => s.items);
  const customItems = useStore((s) => s.customItems);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PickerFilter>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const options = useMemo(() => {
    const list = [
      ...customItems.map((i) => ({ key: `h-${i.id}`, kind: "homebrew" as const, ref: { kind: "homebrew" as const, id: i.id }, name: i.name, sub: [i.category, i.rarity].filter(Boolean).join(" · ") || "Homebrew", color: i.color, icon: Hammer })),
      ...catalog.map((i) => ({
        key: `s-${i.index}`, kind: i.kind, ref: { kind: "srd" as const, id: i.index }, name: i.name,
        sub: i.kind === "magic" ? [i.item_type, rarityLabel(i)].filter(Boolean).join(" · ") : [categoryLabel(i), i.cost].filter(Boolean).join(" · "),
        color: i.kind === "magic" ? rarityInfo(i.rarities?.[0] ?? i.rarity)?.color : undefined,
        icon: i.kind === "magic" ? Gem : Package,
      })),
    ];
    return list.map((o) => ({ ...o, search: normalizeSearchText(`${o.name} ${o.sub}`) }));
  }, [catalog, customItems]);

  const words = normalizeSearchText(q.trim()).split(/\s+/).filter(Boolean);
  const matches = options.filter((o) => (filter === "all" || o.kind === filter) && words.every((w) => o.search.includes(w)));
  const LIMIT = 80;
  const counts = new Map(entries.filter((e) => e.ref).map((e) => [`${e.ref!.kind === "homebrew" ? "h" : "s"}-${e.ref!.id}`, e.weight]));

  return (
    <Overlay isOpen={open} onClose={onClose} zIndex="z-[60]">
      <div role="dialog" aria-modal="true" aria-label="Añadir objetos a la tabla" className={cn(panelClass, "max-w-xl h-full sm:h-[80vh]")}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-dm-accent/10">
          <h2 className="text-lg text-dm-accent tracking-widest uppercase font-light">Añadir objetos</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
        </div>
        <div className="px-4 py-3 space-y-2 border-b border-dm-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm-muted" />
            <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar objeto..." aria-label="Buscar objeto" className={cn(fieldClass, "pl-9 text-sm")} />
          </div>
          <SegmentedTabs<PickerFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Todo" },
              { value: "homebrew", label: `Homebrew (${customItems.length})` },
              { value: "mundane", label: "Equipo" },
              { value: "magic", label: "Mágicos" },
            ]}
          />
        </div>
        <ul className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-dm-border/60">
          {catalog.length === 0 && filter !== "homebrew" && <li className="p-4 text-sm text-dm-muted text-center">Cargando el catálogo…</li>}
          {matches.slice(0, LIMIT).map((o) => {
            const Icon = o.icon;
            const n = counts.get(o.key);
            return (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => onAdd({ text: o.name, ref: o.ref }, o.kind === "homebrew" ? "homebrew" : o.kind === "magic" ? "mágico" : "equipo")}
                  className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-dm-bg-hover transition-colors"
                >
                  <Icon size={16} className="shrink-0" style={{ color: o.color ?? "var(--theme-muted)" }} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-dm-text-bright truncate">{o.name}</span>
                    <span className="block text-xs text-dm-muted truncate">{o.sub}</span>
                  </span>
                  {n ? (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-sm bg-dm-accent/15 text-dm-accent text-xs font-bold tabular-nums" title="Peso en la tabla">
                      <Check size={12} /> ×{n}
                    </span>
                  ) : (
                    <Plus size={16} className="shrink-0 text-dm-muted" />
                  )}
                </button>
              </li>
            );
          })}
          {matches.length > LIMIT && <li className="p-3 text-xs text-dm-muted text-center">Hay {matches.length - LIMIT} más: sigue escribiendo para afinar la búsqueda.</li>}
          {matches.length === 0 && catalog.length > 0 && <li className="p-4 text-sm text-dm-muted text-center">Nada coincide con «{q}».</li>}
        </ul>
        <div className="px-4 py-3 border-t border-dm-border flex items-center gap-2">
          <span className="text-xs text-dm-muted">Cada clic añade el objeto; si ya está en la tabla, sube su probabilidad.</span>
          <button type="button" onClick={onClose} className={cn(primaryButtonClass, "ml-auto")}>Listo</button>
        </div>
      </div>
    </Overlay>
  );
}

// ----------------------------------------------------------------------------------------- viewer

interface ViewerProps {
  table: LootTable | null;
  onClose: () => void;
  onEdit: (table: LootTable) => void;
  onDelete: (table: LootTable) => void;
  /** Opens the sheet of a result linked to an item. */
  onOpenItem: (entry: LootEntry) => void;
}

export function LootTableViewer({ table, onClose, onEdit, onDelete, onOpenItem }: ViewerProps) {
  const [state, setState] = useState<"idle" | "rolling" | "result">("idle");
  const [shown, setShown] = useState(1);
  const [result, setResult] = useState<{ roll: number; index: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchCatalog = useItemCatalogStore((s) => s.fetchItems);
  const look = useEntryLook();

  const entries = table ? tableEntries(table) : [];
  const total = totalWeight(entries);
  const ranges = entryRanges(entries);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (!table) return;
    fetchCatalog();
    stop();
    setState("idle");
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);

  useEffect(() => {
    if (state !== "result" || !result) return;
    const t = setTimeout(() => document.getElementById(`loot-entry-${result.index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    return () => clearTimeout(t);
  }, [state, result]);

  const roll = () => {
    if (!total) return;
    stop();
    setState("rolling");
    setResult(null);
    let ticks = 0;
    timer.current = setInterval(() => {
      setShown(Math.floor(Math.random() * total) + 1);
      if (++ticks >= 15) {
        stop();
        const r = rollTable(entries);
        if (r) {
          setShown(r.roll);
          setResult(r);
        }
        setState("result");
      }
    }, 100);
  };

  const close = () => {
    stop();
    onClose();
  };

  const won = result ? entries[result.index] : null;
  const wonLook = won ? look(won) : null;

  return (
    <Overlay isOpen={!!table} onClose={close}>
      {table && (
        <div role="dialog" aria-modal="true" className={cn(panelClass, "max-w-2xl")}>
          <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: table.color || DEFAULT_COLOR }} />
          <div className="p-4 sm:p-6 pb-0 sm:pb-0">
            <button type="button" onClick={close} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright z-10"><X size={20} /></button>
            <h2 className="text-xl sm:text-2xl text-dm-accent font-bold mb-2 pr-8 break-words">{table.name}</h2>
            {table.description && <p className="text-sm text-dm-text-muted mb-4 whitespace-pre-wrap break-words">{table.description}</p>}

            <div className="flex gap-2 sm:gap-3 mb-4">
              <button type="button" onClick={roll} disabled={state === "rolling" || total === 0} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
                <Hexagon size={16} className={state === "rolling" ? "animate-spin" : ""} /> Tirar {total > 0 && `(d${total})`}
              </button>
              <button type="button" onClick={() => { close(); onEdit(table); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2 sm:flex-1">
                <Pencil size={14} /> Editar
              </button>
              <button type="button" onClick={() => { close(); onDelete(table); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-danger hover:text-dm-danger transition-colors flex items-center justify-center shrink-0" title="Borrar tabla" aria-label="Borrar tabla">
                <Trash2 size={18} />
              </button>
            </div>

            {state !== "idle" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-4 p-4 border border-dm-accent bg-black rounded-sm flex flex-col items-center justify-center min-h-[110px]">
                {state === "rolling" && (
                  <div className="flex flex-col items-center animate-pulse">
                    <span className="text-4xl font-mono text-dm-accent">{shown}</span>
                    <span className="text-xs uppercase tracking-widest text-dm-muted mt-2">Tirando el d{total}...</span>
                  </div>
                )}
                {state === "result" && won && wonLook && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center gap-2">
                    <span className="text-sm text-dm-muted font-mono">d{total}: <strong className="text-dm-accent">{result!.roll}</strong></span>
                    <span className="text-xl sm:text-2xl font-bold break-words flex items-center gap-2" style={{ color: wonLook.color ?? "var(--theme-text-bright)" }}>
                      <wonLook.icon size={20} className="shrink-0" /> {won.text}
                    </span>
                    {won.ref && wonLook.linked && (
                      <button type="button" onClick={() => onOpenItem(won)} className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-dm-accent hover:underline">
                        Ver objeto <ArrowRight size={12} />
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          <div className="px-4 sm:px-6 pb-4 sm:pb-6 min-h-0 flex flex-col">
            <h3 className="text-xs uppercase tracking-widest text-dm-muted mb-2">Resultados ({entries.length})</h3>
            <div className="border border-dm-border bg-dm-bg-darker rounded-sm overflow-y-auto custom-scrollbar max-h-[45vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-dm-bg-darker">
                  <tr className="text-[10px] uppercase tracking-widest text-dm-muted border-b border-dm-border">
                    <th className="px-3 py-2 text-left font-normal w-16">d{total || "?"}</th>
                    <th className="px-2 py-2 text-left font-normal">Resultado</th>
                    <th className="px-3 py-2 text-right font-normal w-16">Prob.</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => {
                    const l = look(e);
                    const isWon = state === "result" && result?.index === i;
                    const Icon = l.icon;
                    return (
                      <tr id={`loot-entry-${i}`} key={e.id} className={cn("border-b border-dm-border/60 last:border-0 transition-colors", isWon ? "bg-dm-accent/20" : "hover:bg-dm-bg")}>
                        <td className={cn("px-3 py-2 font-mono tabular-nums", isWon ? "text-dm-text-bright font-bold" : "text-dm-accent")}>{formatRange(ranges[i])}</td>
                        <td className="px-2 py-2">
                          {e.ref && l.linked ? (
                            <button type="button" onClick={() => onOpenItem(e)} className="flex items-center gap-2 text-left hover:underline" title="Ver objeto">
                              <Icon size={14} className="shrink-0" style={{ color: l.color ?? "var(--theme-muted)" }} />
                              <span className={cn("break-words", isWon ? "text-dm-accent font-bold" : "text-dm-text")}>{e.text}</span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Icon size={14} className="shrink-0 text-dm-muted-alt" />
                              <span className={cn("break-words", isWon ? "text-dm-accent font-bold" : "text-dm-text")}>{e.text}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-dm-muted tabular-nums">{formatPercent(e.weight, total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}
