import React, { useEffect, useMemo, useState, useDeferredValue } from "react";
import { Search, Loader2, SlidersHorizontal, Link2, Plus, Check, ArrowRight } from "lucide-react";
import { useItemCatalogStore } from "../store/useItemCatalogStore";
import { actions, useStore } from "../store/useStore";
import { cn, normalizeSearchText } from "../lib/utils";
import { Modal } from "./ui/Modal";
import { Markdown } from "./ui/Markdown";
import { Measured } from "./ui/Measured";
import { SegmentedTabs } from "./ui/ViewHeader";
import { CatalogItem } from "../types/item";
import { MUNDANE_CATEGORIES, MAGIC_CATEGORIES, RARITIES, rarityInfo, rarityLabel, categoryLabel, itemStats, catalogToCustomItem } from "../data/itemLabels";

type Kind = "mundane" | "magic";

const selectClass = "w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent";
const proseClass =
  "prose prose-invert prose-sm max-w-none text-dm-text leading-relaxed prose-p:my-2 prose-strong:text-dm-text-bright prose-em:text-dm-text-muted " +
  "prose-table:my-3 prose-table:text-xs prose-th:text-dm-accent prose-th:px-2 prose-td:px-2 prose-td:py-1 [&_table]:block [&_table]:overflow-x-auto [&_table]:border [&_table]:border-dm-border";

/** Browsable SRD 5.1 item catalog: ordinary equipment and magic items, grouped by category. */
export function ItemCatalog({ onOpenHomebrew }: { onOpenHomebrew: (id: string) => void }) {
  const items = useItemCatalogStore((s) => s.items);
  const isLoading = useItemCatalogStore((s) => s.isLoading);
  const error = useItemCatalogStore((s) => s.error);
  const fetchItems = useItemCatalogStore((s) => s.fetchItems);

  const [kind, setKind] = useState<Kind>("mundane");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [attunementFilter, setAttunementFilter] = useState<"" | "yes" | "no">("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Opened from the global search: show the entry's list without filters and open it.
  const highlightedItemId = useStore((s) => s.uiState.highlightedItemId);
  useEffect(() => {
    if (!highlightedItemId || items.length === 0) return;
    const it = items.find((i) => i.index === highlightedItemId);
    if (it) {
      setKind(it.kind);
      setSearch("");
      setCategoryFilter("");
      setRarityFilter("");
      setAttunementFilter("");
      setSelected(it);
    }
    actions.updateUI({ highlightedItemId: undefined });
    // No cleanup: clearing highlightedItemId re-runs this effect and must not cancel the scroll.
    setTimeout(() => document.getElementById(`item-${highlightedItemId}`)?.scrollIntoView({ block: "center" }), 150);
  }, [highlightedItemId, items]);

  const switchKind = (k: Kind) => {
    setKind(k);
    setCategoryFilter("");
    setRarityFilter("");
    setAttunementFilter("");
  };

  const searchIndex = useMemo(
    () => items.map((it) => ({ item: it, text: normalizeSearchText(`${it.name} ${it.subcategory || ""} ${it.item_type || ""}`) })),
    [items]
  );

  const q = normalizeSearchText(deferredSearch.trim());
  const matchesSearch = (text: string) => !q || q.split(/\s+/).every((w) => text.includes(w));

  const filtered = useMemo(
    () =>
      searchIndex
        .filter(({ item: it, text }) =>
          it.kind === kind &&
          matchesSearch(text) &&
          (categoryFilter === "" || it.category === categoryFilter) &&
          (rarityFilter === "" || it.rarity === rarityFilter || it.rarities?.includes(rarityFilter)) &&
          (attunementFilter === "" || (attunementFilter === "yes" ? !!it.attunement : !it.attunement))
        )
        .map(({ item }) => item),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchIndex, kind, q, categoryFilter, rarityFilter, attunementFilter]
  );

  // When searching, tell the DM if the other list has matches too.
  const otherKind: Kind = kind === "mundane" ? "magic" : "mundane";
  const otherMatches = useMemo(
    () => (q ? searchIndex.filter(({ item, text }) => item.kind === otherKind && matchesSearch(text)).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchIndex, q, otherKind]
  );

  // Category → sub-group → items, keeping the catalog's order (manual order, not alphabetical).
  const groups = useMemo(() => {
    const cats = kind === "mundane" ? MUNDANE_CATEGORIES : MAGIC_CATEGORIES;
    return cats
      .map((cat) => {
        const inCat = filtered.filter((it) => it.category === cat.key);
        const subs: { label: string; items: CatalogItem[] }[] = [];
        for (const it of inCat) {
          // Magic items are sorted by their lowest rarity, so group them by it too.
          const label = kind === "mundane" ? it.subcategory || "" : rarityInfo(it.rarities?.[0] ?? it.rarity)?.plural || "";
          const last = subs[subs.length - 1];
          if (last && last.label === label) last.items.push(it);
          else subs.push({ label, items: [it] });
        }
        return { key: cat.key, label: cat.label, count: inCat.length, subs };
      })
      .filter((g) => g.count > 0);
  }, [filtered, kind]);

  const counts = useMemo(
    () => ({ mundane: items.filter((i) => i.kind === "mundane").length, magic: items.filter((i) => i.kind === "magic").length }),
    [items]
  );
  const activeFilterCount = [categoryFilter, rarityFilter, attunementFilter].filter(Boolean).length;
  const categories = kind === "mundane" ? MUNDANE_CATEGORIES : MAGIC_CATEGORIES;

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="bg-dm-bg-alt border border-dm-border rounded-sm p-3 sm:p-5 shadow-2xl relative overflow-hidden space-y-3">
        <div className="absolute top-0 left-0 w-1 h-full bg-dm-accent" />
        <SegmentedTabs<Kind>
          value={kind}
          onChange={switchKind}
          options={[
            { value: "mundane", label: `Equipo (${counts.mundane})` },
            { value: "magic", label: <><span className="sm:hidden">Mágicos</span><span className="hidden sm:inline">Objetos mágicos</span> ({counts.magic})</> },
          ]}
        />
        <div className={cn("grid grid-cols-2 gap-2 sm:gap-3", kind === "magic" ? "md:grid-cols-4" : "md:grid-cols-2")}>
          <div className="col-span-2 md:col-span-1 flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-dm-muted" />
              </div>
              <input
                type="search"
                placeholder="Buscar..."
                aria-label="Buscar objetos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent focus:ring-1 focus:ring-dm-accent"
              />
            </div>
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
                <span className="min-w-5 h-5 px-1 rounded-full bg-dm-accent text-dm-bg-darker text-[11px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>

          <div className={cn("col-span-2 md:col-span-1 grid grid-cols-1 gap-2 sm:gap-3", kind === "magic" && "md:col-span-3 md:grid-cols-3", !showFilters && "hidden md:grid")}>
            <select aria-label="Categoría" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            {kind === "magic" && (
              <>
                <select aria-label="Rareza" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} className={selectClass}>
                  <option value="">Cualquier rareza</option>
                  {RARITIES.filter((r) => r.key !== "varies").map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
                <select aria-label="Sintonización" value={attunementFilter} onChange={(e) => setAttunementFilter(e.target.value as "" | "yes" | "no")} className={selectClass}>
                  <option value="">Con o sin sintonización</option>
                  <option value="yes">Requiere sintonización</option>
                  <option value="no">Sin sintonización</option>
                </select>
              </>
            )}
          </div>
        </div>
        {otherMatches > 0 && (
          <button type="button" onClick={() => switchKind(otherKind)} className="text-xs text-dm-accent hover:underline flex items-center gap-1">
            También hay {otherMatches} {otherMatches === 1 ? "resultado" : "resultados"} en {otherKind === "magic" ? "Objetos mágicos" : "Equipo"} <ArrowRight size={12} />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-dm-muted">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-dm-accent" />
          <p>Abriendo el arcón...</p>
        </div>
      )}
      {error && <div className="bg-dm-danger/20 border border-dm-danger/50 rounded-sm p-4 text-dm-danger text-center">Error al cargar los objetos: {error}</div>}

      {!isLoading && !error && (
        <>
          {groups.length === 0 && <div className="p-8 text-center text-dm-muted border border-dm-border bg-dm-bg-alt rounded-sm">No se encontraron objetos con esos filtros.</div>}
          {groups.map((g) => (
            <section key={g.key} className="border border-dm-border bg-dm-bg-alt rounded-sm shadow-xl">
              {/* Negative top = the scroll panel's padding, so the header sticks flush to its top edge
                  instead of floating below it with rows showing through the gap. */}
              <h3 className="sticky -top-3 sm:-top-6 z-20 flex items-center justify-between gap-2 pl-3 pr-3 sm:pr-4 py-3 bg-dm-bg-darker border-b-2 border-dm-accent/60 shadow-[0_6px_12px_-6px_rgba(0,0,0,0.8)] text-base sm:text-lg font-display uppercase tracking-widest text-dm-accent">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-1 self-stretch bg-dm-accent rounded-full" aria-hidden />
                  <span className="truncate">{g.label}</span>
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-sm bg-dm-accent/15 text-[11px] font-sans font-bold tracking-wider text-dm-accent">{g.count}</span>
              </h3>
              {g.subs.map((sub) => (
                <div key={sub.label}>
                  {sub.label && sub.label !== g.label && (
                    <h4 className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-dm-accent/10 border-y border-dm-accent/25 text-xs uppercase tracking-widest font-bold text-dm-accent">
                      <span className="w-2 h-2 rotate-45 bg-dm-accent shrink-0" aria-hidden />
                      {sub.label}
                      <span className="ml-auto text-[11px] font-normal tracking-wider text-dm-muted">{sub.items.length}</span>
                    </h4>
                  )}
                  <div>
                    {sub.items.map((it) => (
                      <CatalogRow key={it.index} item={it} onClick={() => setSelected(it)} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""}>
        {selected && <CatalogDetail key={selected.index} item={selected} onOpenHomebrew={(id) => { setSelected(null); onOpenHomebrew(id); }} />}
      </Modal>
    </div>
  );
}

function CatalogRow({ item, onClick }: { item: CatalogItem; onClick: () => void }) {
  const rarity = rarityInfo(item.rarities?.[0] ?? item.rarity);
  return (
    <button
      type="button"
      id={`item-${item.index}`}
      onClick={onClick}
      className="w-full text-left px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 border-t border-dm-border/60 first:border-t-0 hover:bg-dm-bg-hover transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_56px]"
    >
      <div className="min-w-0">
        <div className="font-bold text-dm-text-bright truncate">{item.name}</div>
        {(item.kind === "magic" ? item.item_type : itemStats(item)) && (
          <div className="text-xs text-dm-muted truncate">{item.kind === "magic" ? item.item_type : <Measured text={itemStats(item)} />}</div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2 text-xs tabular-nums">
        {item.kind === "magic" ? (
          <>
            {item.attunement && <Link2 size={14} className="text-dm-muted" aria-label="Requiere sintonización" />}
            <span className="px-2 py-0.5 rounded-sm border font-semibold whitespace-nowrap" style={{ color: rarity?.color, borderColor: `${rarity?.color}66` }}>
              {rarityLabel(item)}
            </span>
          </>
        ) : (
          <span className="flex flex-col items-end leading-tight">
            {item.cost && <span className="font-semibold text-dm-accent whitespace-nowrap">{item.cost}</span>}
            {item.weight && item.weight !== "-" && <span className="text-dm-muted whitespace-nowrap"><Measured text={item.weight} /></span>}
          </span>
        )}
      </div>
    </button>
  );
}

export function CatalogDetail({ item, onOpenHomebrew }: { item: CatalogItem; onOpenHomebrew: (id: string) => void }) {
  const [addedId, setAddedId] = useState<string | null>(null);
  const rarity = rarityInfo(item.rarities?.[0] ?? item.rarity);
  const stats: [string, string | undefined][] = [
    ["Coste", item.cost],
    ["Peso", item.weight],
    ["Daño", item.damage],
    ["Propiedades", item.properties],
    ["Clase de Armadura", item.ac],
    ["Fuerza", item.strength],
    ["Sigilo", item.stealth],
    ["Velocidad", item.speed],
    ["Capacidad", item.capacity],
  ];
  const shownStats = stats.filter(([, v]) => v && v !== "-");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded-sm bg-dm-bg-hover border border-dm-border text-dm-muted uppercase tracking-wider">{categoryLabel(item)}</span>
        {item.subcategory && <span className="px-2 py-1 rounded-sm bg-dm-bg-hover border border-dm-border text-dm-muted">{item.subcategory}</span>}
        {item.kind === "magic" && (
          <span className="px-2 py-1 rounded-sm border font-semibold" style={{ color: rarity?.color, borderColor: `${rarity?.color}66` }}>{rarityLabel(item)}</span>
        )}
        {item.attunement && (
          <span className="px-2 py-1 rounded-sm border border-dm-border text-dm-text-muted flex items-center gap-1">
            <Link2 size={12} /> {item.attunement[0].toUpperCase() + item.attunement.slice(1)}
          </span>
        )}
      </div>
      {item.type_line && <p className="italic text-dm-muted text-sm">{item.type_line}</p>}

      {shownStats.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {shownStats.map(([label, value]) => (
            <div key={label} className="bg-dm-bg-hover border border-dm-border rounded-sm px-3 py-2">
              <dt className="text-[10px] uppercase tracking-widest font-bold text-dm-accent">{label}</dt>
              <dd className="text-sm text-dm-text-bright"><Measured text={value} /></dd>
            </div>
          ))}
        </dl>
      )}

      {item.desc ? (
        <div className={proseClass}>
          <Markdown units>{item.desc}</Markdown>
        </div>
      ) : (
        <p className="text-sm text-dm-muted italic">El manual no incluye una descripción para este objeto, solo sus datos de la tabla.</p>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-dm-border">
        {addedId ? (
          <>
            <span className="flex items-center gap-2 text-sm text-dm-accent"><Check size={16} /> Añadido a Homebrew</span>
            <button
              type="button"
              onClick={() => onOpenHomebrew(addedId)}
              className="ml-auto flex items-center gap-2 px-4 py-2 border border-dm-accent text-dm-accent text-xs uppercase tracking-wider font-bold rounded-sm hover:bg-dm-accent/10 transition-colors"
            >
              Editar en Homebrew <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAddedId(actions.addCustomItem(catalogToCustomItem(item)))}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-dm-accent text-dm-bg-darker text-xs uppercase tracking-wider font-bold rounded-sm hover:bg-dm-accent-hover transition-colors active:scale-95"
          >
            <Plus size={16} /> Añadir a Homebrew
          </button>
        )}
      </div>
    </div>
  );
}
