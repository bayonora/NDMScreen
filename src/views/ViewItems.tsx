import React, { useState, useEffect } from "react";
import { Package, Plus, X, Image as ImageIcon, Trash2, Coins, Dices, Link2, Search, Maximize2 } from "lucide-react";
import { Lightbox } from "../components/ui/Lightbox";
import { useStore, actions, store } from "../store/useStore";
import { ItemCatalog, CatalogDetail } from "../components/ItemCatalog";
import { GROUP_ICONS, LootTableCard, LootTableEditor, LootTableViewer } from "../components/LootTables";
import { useItemCatalogStore } from "../store/useItemCatalogStore";
import type { CatalogItem } from "../types/item";
import { ITEM_GROUPS, RARITIES, homebrewRarityKey, homebrewTypeKey, itemPlace, itemTypeInfo, rarityInfo, type ItemGroup } from "../data/itemLabels";
import { HomebrewItemFields, withStructuredFields } from "../components/HomebrewItemFields";
import { Chip, RarityDot } from "../components/ui/Chip";
import { CustomItem, LootEntry, LootTable } from "../types";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { Markdown } from "../components/ui/Markdown";
import { Measured } from "../components/ui/Measured";
import { DescriptionEditor } from "../components/DescriptionEditor";
import { ColorPicker, DEFAULT_COLOR } from "../components/ui/ColorPicker";
import { Overlay } from "../components/ui/Modal";
import { ViewHeader, ToolbarButton, SegmentedTabs } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey, looksLike } from "../components/ImportExportActions";
import { cn, compressImage, downloadJSON } from "../lib/utils";


const panelClass = "relative bg-dm-bg/80 backdrop-blur-xl gecko:backdrop-filter-none gecko:bg-dm-bg/95 border border-dm-accent/20 rounded-xl w-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95";
const labelClass = "block text-xs uppercase tracking-widest text-dm-muted mb-1";
const fieldClass = "w-full bg-black/40 border border-dm-border p-2 text-dm-text-bright placeholder:text-dm-muted mb-4 focus:border-dm-accent outline-none";
const primaryButtonClass = "px-4 py-2 bg-dm-accent text-dm-bg-darker hover:bg-dm-accent-hover disabled:opacity-50 transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2";

export function ViewItems() {
  const customItems = useStore((state) => state.customItems);
  const lootTables = useStore((state) => state.lootTables);
  // The sub-tab lives in the UI state so the global search can open a specific one.
  const activeTab = useStore((state) => state.uiState.itemsTab) || "items";
  const setActiveTab = (itemsTab: "items" | "loot" | "srd") => actions.updateUI({ itemsTab });
  const editCustomItemId = useStore((state) => state.uiState.editCustomItemId);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);

  useEffect(() => {
    if (!editCustomItemId) return;
    const item = store.getState().customItems.find((i) => i.id === editCustomItemId);
    if (item) setEditingItem(item);
    actions.updateUI({ editCustomItemId: undefined });
  }, [editCustomItemId]);
  const [viewingItem, setViewingItem] = useState<CustomItem | null>(null);
  // Full-screen view of the open item's image.
  const [imageOpen, setImageOpen] = useState(false);
  useEffect(() => setImageOpen(false), [viewingItem?.id]);
  const wideImage = useIsWideImage(viewingItem?.image);
  const [hbFilter, setHbFilter] = useState<HomebrewFilter>(EMPTY_FILTER);
  const shownItems = customItems.filter((i) => matchesFilter(i, hbFilter));
  // undefined = editor closed, null = new table
  const [editingTable, setEditingTable] = useState<LootTable | null | undefined>(undefined);
  const [viewingTable, setViewingTable] = useState<LootTable | null>(null);
  // The card's "Tirar" opens the table and rolls it right away.
  const [rollOnOpen, setRollOnOpen] = useState(false);
  const openTable = (table: LootTable, roll: boolean) => {
    setRollOnOpen(roll);
    setViewingTable(table);
  };
  const [catalogPreview, setCatalogPreview] = useState<CatalogItem | null>(null);
  const catalogItems = useItemCatalogStore((s) => s.items);
  const [deleteData, setDeleteData] = useState<{ type: "item" | "table"; id: string } | null>(null);
  const fetchCatalog = useItemCatalogStore((s) => s.fetchItems);

  // Loot cards color their results by rarity, which needs the catalog when a table links to it.
  useEffect(() => {
    if (activeTab === "loot" && lootTables.some((t) => t.entries?.some((e) => e.ref?.kind === "srd"))) fetchCatalog();
  }, [activeTab, lootTables, fetchCatalog]);

  // A loot result linked to an item opens that item's sheet.
  const openLootItem = (entry: LootEntry) => {
    if (entry.ref?.kind === "homebrew") {
      const item = store.getState().customItems.find((i) => i.id === entry.ref!.id);
      if (item) setViewingItem(item);
    } else if (entry.ref?.kind === "srd") {
      const item = catalogItems.find((i) => i.index === entry.ref!.id);
      if (item) setCatalogPreview(item);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim() || !editingItem.shortDescription?.trim()) return;
    const { id, ...data } = withStructuredFields(editingItem);
    if (id) actions.updateCustomItem(id, data);
    else actions.addCustomItem(data);
    setEditingItem(null);
  };

  const handleSaveTable = (data: Omit<LootTable, "id">) => {
    if (editingTable) actions.updateLootTable(editingTable.id, data);
    else actions.addLootTable(data);
    setEditingTable(undefined);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editingItem) return;
    try {
      const image = await compressImage(file, 800);
      setEditingItem((prev) => (prev ? { ...prev, image } : prev));
    } catch (err) {
      console.error("Error compressing image", err);
      alert("Error al procesar la imagen.");
    }
  };

  const isItems = activeTab === "items";
  const isCatalog = activeTab === "srd";

  // From the catalog: jump to Homebrew with the freshly copied item open in the editor.
  const openHomebrew = (id: string) => {
    setActiveTab("items");
    const item = store.getState().customItems.find((i) => i.id === id);
    if (item) setEditingItem(item);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={Package}
        title="Objetos y Botín"
        shortTitle={isItems ? "Homebrew" : isCatalog ? "Objetos" : "Botín"}
        actions={
          isCatalog ? undefined : <>
            {isItems ? (
              <ImportExportActions
                key="items"
                noun="Objetos"
                onExport={() => downloadJSON(customItems, "ndms_objetos.json")}
                parse={arrayOrKey("customItems", looksLike.customItem)}
                onImport={(items, mode) => actions.importCollection("customItems", items, mode)}
                invalidMessage="El archivo no parece contener objetos válidos."
              />
            ) : (
              <ImportExportActions
                key="loot"
                noun="Tablas"
                onExport={() => {
                  // The linked homebrew items go along so the links work in another browser.
                  const linked = new Set(lootTables.flatMap((t) => (t.entries || []).filter((e) => e.ref?.kind === "homebrew").map((e) => e.ref!.id)));
                  downloadJSON({ lootTables, customItems: customItems.filter((i) => linked.has(i.id)) }, "ndms_tablas.json");
                }}
                parse={(json) => {
                  // Also accepts the older files, a bare list of tables.
                  const tables = arrayOrKey("lootTables", looksLike.lootTable)(json);
                  const items = Array.isArray(json?.customItems) ? json.customItems : [];
                  return tables ? { tables: tables as LootTable[], items: items as CustomItem[] } : null;
                }}
                onImport={({ tables, items }, mode) => actions.importLootTables(tables, items, mode)}
                invalidMessage="El archivo no parece contener tablas de botín válidas."
              />
            )}
            <ToolbarButton
              icon={Plus}
              label={isItems ? "Nuevo Objeto" : "Nueva Tabla"}
              shortLabel={isItems ? "Nuevo" : "Nueva"}
              variant="primary"
              showLabel="always"
              onClick={() => {
                if (isItems) setEditingItem({ id: "", name: "", shortDescription: "", description: "", value: "", image: "", color: DEFAULT_COLOR });
                else setEditingTable(null);
              }}
            />
          </>
        }
      >
        <SegmentedTabs<"items" | "loot" | "srd">
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "items", label: `Homebrew (${customItems.length})` },
            { value: "loot", label: <><span className="sm:hidden">Botín</span><span className="hidden sm:inline">Tablas de Botín</span> ({lootTables.length})</> },
            { value: "srd", label: "Objetos" },
          ]}
        />
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar pb-12 sm:pb-16 text-dm-text">
        {isCatalog ? (
          <ItemCatalog onOpenHomebrew={openHomebrew} />
        ) : isItems ? (
          <>
            {customItems.length > 0 && (
              <HomebrewFilters items={customItems} value={hbFilter} onChange={setHbFilter} shown={shownItems.length} />
            )}
            <SortableGrid
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full [&>*>*]:h-full"
              items={shownItems}
              onReorder={(subset) => actions.reorderCustomItems(mergeOrder(customItems, subset))}
              renderItem={(item) => <HomebrewCard item={item} onOpen={() => setViewingItem(item)} />}
            />
            {customItems.length > 0 && shownItems.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 h-40 text-dm-muted border-2 border-dashed border-dm-border text-center px-4">
                <p>Ningún objeto coincide con los filtros.</p>
                <button type="button" onClick={() => setHbFilter(EMPTY_FILTER)} className="text-sm text-dm-accent hover:underline">Quitar filtros</button>
              </div>
            )}
            {customItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border text-center px-4">
                <p>No hay objetos homebrew guardados.</p>
                <p className="text-sm mt-2">Crea uno con «Nuevo» o copia uno del manual desde la pestaña <button type="button" onClick={() => setActiveTab("srd")} className="text-dm-accent hover:underline">Objetos</button>.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <SortableGrid
              // `[&>*>*]:h-full`: the drag wrapper stretches too, so cards in a row share their height.
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full [&>*>*]:h-full"
              items={lootTables}
              onReorder={actions.reorderLootTables}
              renderItem={(table) => (
                <LootTableCard
                  table={table}
                  onOpen={() => openTable(table, false)}
                  onRoll={() => openTable(table, true)}
                  onEdit={() => setEditingTable(table)}
                  onDelete={() => setDeleteData({ type: "table", id: table.id })}
                />
              )}
            />
            {lootTables.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 h-64 text-dm-muted border-2 border-dashed border-dm-border text-center px-4">
                <Dices size={36} className="text-dm-border-focus" />
                <p>No hay tablas de botín guardadas.</p>
                <button type="button" onClick={() => setEditingTable(null)} className="flex items-center gap-1.5 px-3 py-2 border border-dm-accent/50 text-dm-accent text-xs uppercase tracking-wider font-bold hover:bg-dm-accent/10 transition-colors">
                  <Plus size={14} /> Crear la primera
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View item */}
      <Overlay isOpen={!!viewingItem} onClose={() => setViewingItem(null)}>
        {viewingItem && (
          <div role="dialog" aria-modal="true" className={cn(panelClass, viewingItem.image && !wideImage ? "max-w-4xl sm:flex-row" : "max-w-xl")}>
            <div className="h-1 w-full absolute top-0 left-0 z-20" style={{ backgroundColor: viewingItem.color || DEFAULT_COLOR }} />
            <button type="button" onClick={() => setViewingItem(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright z-20 bg-black/60 rounded-full p-1">
              <X size={20} />
            </button>

            {viewingItem.image && (
              <ItemSheetImage src={viewingItem.image} alt={viewingItem.name} color={viewingItem.color || DEFAULT_COLOR} wide={wideImage} onOpen={() => setImageOpen(true)} />
            )}

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-w-0 min-h-0 flex flex-col">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 pr-8 font-serif break-words" style={{ color: viewingItem.color || DEFAULT_COLOR }}>{viewingItem.name}</h2>
              {viewingItem.shortDescription && (
                <p className="text-dm-muted italic text-sm mb-4 border-b break-words border-dm-border pb-4">{viewingItem.shortDescription}</p>
              )}

              {(() => {
                const info = homebrewInfo(viewingItem);
                const Icon = info.group ? GROUP_ICONS[info.group] : Package;
                const rarityColor = info.rarityColor ?? viewingItem.color ?? DEFAULT_COLOR;
                return (info.typeText || info.rarityText || viewingItem.attunement) && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                  {info.typeText && <span className="px-2 py-1 rounded-sm bg-dm-bg-hover border border-dm-border text-dm-muted uppercase tracking-wider flex items-center gap-1.5"><Icon size={12} />{info.typeText}</span>}
                  {info.rarityText && (
                    <span className="px-2 py-1 rounded-sm border font-semibold flex items-center gap-1.5" style={{ color: rarityColor, borderColor: `color-mix(in srgb, ${rarityColor} 45%, transparent)` }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rarityColor }} />{info.rarityText}
                    </span>
                  )}
                  {viewingItem.attunement && <span className="px-2 py-1 rounded-sm border border-dm-border text-dm-text-muted flex items-center gap-1"><Link2 size={12} />{viewingItem.attunement[0].toUpperCase() + viewingItem.attunement.slice(1)}</span>}
                </div>
                );
              })()}

              {viewingItem.value && (
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-dm-border bg-dm-bg-darker shadow-inner self-start">
                  <Coins size={16} style={{ color: viewingItem.color || DEFAULT_COLOR }} />
                  <span className="font-mono font-bold tracking-wider" style={{ color: viewingItem.color || DEFAULT_COLOR }}>{viewingItem.value}</span>
                </div>
              )}

              <ItemStats item={viewingItem} />

              <h3 className="text-xs uppercase tracking-widest text-dm-muted mb-2">Descripción Completa</h3>
              <div className="text-dm-text text-sm leading-relaxed mb-8 flex-1 break-words select-text [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-dm-text-bright [&_table]:block [&_table]:overflow-x-auto [&_table]:my-3 [&_table]:text-xs [&_table]:border [&_table]:border-dm-border [&_th]:text-dm-accent [&_th]:text-left [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_tr]:border-b [&_tr]:border-dm-border">
                <Markdown units>{viewingItem.description || "Sin descripción detallada."}</Markdown>
              </div>
              {viewingItem.source && <p className="text-[11px] text-dm-muted -mt-6 mb-6">Basado en: {viewingItem.source}</p>}

              <div className="flex gap-3 pt-6 border-t border-dm-border mt-auto">
                <button type="button" onClick={() => { setEditingItem(viewingItem); setViewingItem(null); }} className={cn(primaryButtonClass, "flex-1 py-3")}>
                  Editar Objeto
                </button>
                <button type="button" onClick={() => { setDeleteData({ type: "item", id: viewingItem.id }); setViewingItem(null); }} className="px-4 py-3 border border-dm-border text-dm-muted hover:border-dm-danger hover:text-dm-danger transition-colors flex items-center justify-center shrink-0" title="Borrar Objeto" aria-label="Borrar Objeto">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Overlay>

      {viewingItem?.image && (
        <Lightbox isOpen={imageOpen} onClose={() => setImageOpen(false)} src={viewingItem.image} title={viewingItem.name} />
      )}

      {/* Edit item */}
      <Overlay isOpen={!!editingItem} onClose={() => setEditingItem(null)} closeOnBackdrop={false}>
        {editingItem && (
          <form onSubmit={handleSaveItem} className={cn(panelClass, "max-w-lg p-4 sm:p-6")}>
            <button type="button" onClick={() => setEditingItem(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-6 font-light border-b border-dm-accent/10 pb-2 pr-8">
              {editingItem.id ? "Editar Objeto" : "Nuevo Objeto"}
            </h2>

            <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar">
              <label className={labelClass} htmlFor="item-name">Nombre (Obligatorio)</label>
              <input id="item-name" type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className={fieldClass} required />

              <label className={cn(labelClass, "flex justify-between")} htmlFor="item-short">
                <span>Resumen (Obligatorio, se ve en la lista)</span>
                <span className="text-dm-muted-alt">{(editingItem.shortDescription || "").length}/100</span>
              </label>
              <input id="item-short" type="text" maxLength={100} required value={editingItem.shortDescription || ""} onChange={(e) => setEditingItem({ ...editingItem, shortDescription: e.target.value })} className={fieldClass} placeholder="Una espada forjada en el fuego de..." />

              <HomebrewItemFields item={editingItem} onChange={(item) => setEditingItem(item as CustomItem)} />

              <DescriptionEditor
                id="item-desc"
                label="Descripción Completa"
                labelClassName={labelClass}
                value={editingItem.description || ""}
                onChange={(description) => setEditingItem({ ...editingItem, description })}
                textareaClassName={cn(fieldClass, "h-40 sm:h-48 resize-y font-sans text-sm")}
                placeholder="Historia detallada, estadísticas de daño, peso..."
              />

              <span className={labelClass}>Imagen (Opcional)</span>
              <div className="flex items-center space-x-4 mb-6">
                {editingItem.image ? (
                  <div className="w-16 h-16 border border-dm-border relative shrink-0">
                    <img src={editingItem.image} alt="Vista previa" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setEditingItem({ ...editingItem, image: undefined })} aria-label="Quitar imagen" title="Quitar imagen" className="absolute -top-2 -right-2 p-1 bg-dm-bg-darker border border-dm-border rounded-full text-dm-danger">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 border border-dm-border flex items-center justify-center text-dm-muted cursor-pointer hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <span className="text-xs text-dm-muted flex-1">Sube una imagen representativa. Se guardará internamente (¡Cuidado con el peso!).</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-dm-border">
              <button type="submit" className={cn(primaryButtonClass, "px-6")}>Guardar</button>
            </div>
          </form>
        )}
      </Overlay>

      <LootTableEditor table={editingTable} onClose={() => setEditingTable(undefined)} onSave={handleSaveTable} />

      <LootTableViewer
        table={viewingTable}
        autoRoll={rollOnOpen}
        onClose={() => setViewingTable(null)}
        onEdit={(table) => setEditingTable(table)}
        onDelete={(table) => setDeleteData({ type: "table", id: table.id })}
        onOpenItem={openLootItem}
      />

      {/* Sheet of a catalog item rolled on a loot table */}
      <Overlay isOpen={!!catalogPreview} onClose={() => setCatalogPreview(null)} zIndex="z-[60]">
        {catalogPreview && (
          <div role="dialog" aria-modal="true" className={cn(panelClass, "max-w-2xl")}>
            <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-4 pb-3 border-b border-dm-accent/10">
              <h2 className="text-xl sm:text-2xl text-dm-accent font-display uppercase tracking-widest break-words">{catalogPreview.name}</h2>
              <button type="button" onClick={() => setCatalogPreview(null)} aria-label="Cerrar" className="text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              <CatalogDetail
                item={catalogPreview}
                onOpenHomebrew={(id) => {
                  setCatalogPreview(null);
                  setViewingTable(null);
                  openHomebrew(id);
                }}
              />
            </div>
          </div>
        )}
      </Overlay>

      <ConfirmDeleteModal
        isOpen={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={() => {
          if (!deleteData) return;
          if (deleteData.type === "item") actions.deleteCustomItem(deleteData.id);
          else actions.deleteLootTable(deleteData.id);
        }}
        title={`Eliminar ${deleteData?.type === "item" ? "Objeto" : "Tabla"}`}
        message="¿Estás seguro de que quieres eliminar esto? Esta acción no se puede deshacer."
      />
    </div>
  );
}

// ------------------------------------------------------------------------------- homebrew list

interface HomebrewFilter {
  q: string;
  group: ItemGroup | null;
  /** Rarity key, "none" for items without rarity, or null for any. */
  rarity: string | null;
}
const EMPTY_FILTER: HomebrewFilter = { q: "", group: null, rarity: null };
const NO_RARITY = "none";

const norm = (s: string | undefined) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Group, rarity and display texts of a homebrew item, from its structured fields (or guessed ones). */
function homebrewInfo(item: CustomItem) {
  const type = homebrewTypeKey(item);
  const rarityKey = homebrewRarityKey(item);
  const rarity = rarityInfo(rarityKey);
  return {
    type,
    group: type ? itemPlace(type, rarityKey).group : null,
    rarityKey,
    rarityColor: rarity?.color,
    typeText: item.category || itemTypeInfo(type)?.label || "",
    rarityText: rarityKey ? item.rarity || rarity?.label || "" : "",
  };
}

function matchesFilter(item: CustomItem, f: HomebrewFilter) {
  const info = homebrewInfo(item);
  if (f.group && info.group !== f.group) return false;
  if (f.rarity && (f.rarity === NO_RARITY ? !!info.rarityKey : info.rarityKey !== f.rarity)) return false;
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  const hay = norm([item.name, item.shortDescription, info.typeText, info.rarityText].join(" "));
  return words.every((w) => hay.includes(w));
}

/** Puts a reordered subset back into the slots it occupied in the full list. */
function mergeOrder(all: CustomItem[], subset: CustomItem[]) {
  const ids = new Set(subset.map((i) => i.id));
  let n = 0;
  return all.map((i) => (ids.has(i.id) ? subset[n++] : i));
}

/** Search, type and rarity filters of the homebrew list (only the groups and rarities in use). */
function HomebrewFilters({ items, value, onChange, shown }: { items: CustomItem[]; value: HomebrewFilter; onChange: (f: HomebrewFilter) => void; shown: number }) {
  const infos = items.map(homebrewInfo);
  const groups = ITEM_GROUPS.map((g) => ({ ...g, n: infos.filter((i) => i.group === g.key).length })).filter((g) => g.n > 0);
  const untyped = infos.filter((i) => !i.group).length;
  const rarities = RARITIES.filter((r) => infos.some((i) => i.rarityKey === r.key));
  const hasMundane = infos.some((i) => !i.rarityKey);
  const set = (patch: Partial<HomebrewFilter>) => onChange({ ...value, ...patch });
  const filtered = value.q || value.group || value.rarity;

  return (
    <div className="mb-4 sm:mb-6 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm-muted" />
          <input
            type="search"
            value={value.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Buscar objeto homebrew..."
            aria-label="Buscar objeto homebrew"
            className="w-full bg-black/40 border border-dm-border py-1.5 pl-9 pr-2 text-sm text-dm-text-bright placeholder:text-dm-muted focus:border-dm-accent outline-none"
          />
        </div>
        <span className="text-xs text-dm-muted tabular-nums">
          {filtered ? `${shown} de ${items.length}` : `${items.length} ${items.length === 1 ? "objeto" : "objetos"}`}
        </span>
        {filtered && (
          <button type="button" onClick={() => onChange(EMPTY_FILTER)} className="text-xs text-dm-accent hover:underline">Quitar filtros</button>
        )}
      </div>
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Tipo de objeto">
          <Chip active={!value.group} onClick={() => set({ group: null })}>Todos</Chip>
          {groups.map((g) => {
            const Icon = GROUP_ICONS[g.key];
            return (
              <Chip key={g.key} active={value.group === g.key} onClick={() => set({ group: value.group === g.key ? null : g.key })}>
                <Icon size={12} /> {g.label} <span className="opacity-60 tabular-nums">{g.n}</span>
              </Chip>
            );
          })}
          {untyped > 0 && <span className="self-center text-[11px] text-dm-muted-alt ml-1" title="Edítalos y elige un tipo para que se filtren bien">{untyped} sin tipo</span>}
        </div>
      )}
      {rarities.length + (hasMundane ? 1 : 0) > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Rareza">
          <span className="text-[10px] uppercase tracking-widest text-dm-muted mr-1">Rareza</span>
          {hasMundane && (
            <Chip active={value.rarity === NO_RARITY} onClick={() => set({ rarity: value.rarity === NO_RARITY ? null : NO_RARITY })} className="py-0.5 text-[11px]">
              <RarityDot /> Sin rareza
            </Chip>
          )}
          {rarities.map((r) => (
            <Chip key={r.key} active={value.rarity === r.key} color={r.color} onClick={() => set({ rarity: value.rarity === r.key ? null : r.key })} className="py-0.5 text-[11px]">
              <RarityDot color={r.color} active={value.rarity === r.key} /> {r.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

/** Landscape images (wider than 1.4:1) go on top of the sheet; the rest get a side column. */
function useIsWideImage(src: string | undefined) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    setWide(false);
    if (!src) return;
    const img = new Image();
    img.onload = () => setWide(img.naturalWidth / (img.naturalHeight || 1) >= 1.4);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);
  return wide;
}

/**
 * The whole image of an item in its sheet, never cropped. Portrait and square art sits framed in
 * a side column (on top on phones), like a card; landscape art spans the top at its own size.
 * Clicking it opens it full screen.
 */
function ItemSheetImage({ src, alt, color, wide, onOpen }: { src: string; alt: string; color: string; wide: boolean; onOpen: () => void }) {
  const zoomHint = (
    <span className="absolute bottom-2 right-2 p-1.5 bg-dm-bg-darker/85 border border-dm-border text-dm-muted can-hover:opacity-0 group-hover/img:opacity-100 transition-opacity">
      <Maximize2 size={14} />
    </span>
  );
  if (wide) {
    return (
      <button type="button" onClick={onOpen} className="group/img relative block w-full shrink-0 border-b border-dm-accent/10 cursor-zoom-in" title="Ver imagen completa" aria-label={`Ver imagen completa de ${alt}`}>
        <img src={src} alt={alt} className="block w-full h-auto max-h-[45vh] object-contain bg-dm-bg-darker" />
        <span className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-dm-bg/90 to-transparent pointer-events-none" />
        {zoomHint}
      </button>
    );
  }
  return (
    <aside
      className="shrink-0 sm:w-[44%] flex items-center justify-center px-6 pt-8 pb-5 sm:p-8 border-b sm:border-b-0 sm:border-r border-dm-accent/10"
      style={{ background: `radial-gradient(ellipse at 50% 40%, color-mix(in srgb, ${color} 16%, transparent), transparent 70%), var(--theme-bg-darker)` }}
    >
      <button type="button" onClick={onOpen} className="group/img relative cursor-zoom-in" title="Ver imagen completa" aria-label={`Ver imagen completa de ${alt}`}>
        <img
          src={src}
          alt={alt}
          className="block max-w-full w-auto max-h-[34vh] sm:max-h-[70vh] object-contain border-2 transition-transform duration-300 group-hover/img:scale-[1.015]"
          style={{
            borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
            boxShadow: `0 12px 32px rgba(0,0,0,0.6), 0 0 28px color-mix(in srgb, ${color} 22%, transparent)`,
          }}
        />
        {zoomHint}
      </button>
    </aside>
  );
}

/** A homebrew item in the grid: type and rarity up front, value and attunement at the bottom. */
function HomebrewCard({ item, onOpen }: { item: CustomItem; onOpen: () => void }) {
  const color = item.color || DEFAULT_COLOR;
  const info = homebrewInfo(item);
  const Icon = info.group ? GROUP_ICONS[info.group] : Package;
  const meta = (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
      {info.typeText && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-dm-bg-darker/90 border border-dm-border text-dm-muted">
          <Icon size={11} /> {info.typeText}
        </span>
      )}
      {info.rarityText && (
        <span
          className="flex items-center gap-1 px-1.5 py-0.5 bg-dm-bg-darker/90 border"
          style={{ color: info.rarityColor ?? color, borderColor: `color-mix(in srgb, ${info.rarityColor ?? color} 45%, transparent)` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.rarityColor ?? color }} /> {info.rarityText}
        </span>
      )}
    </div>
  );

  return (
    <div
      data-search-id={item.id}
      onClick={onOpen}
      className="group relative h-full flex flex-col bg-dm-bg-darker border border-dm-border overflow-hidden cursor-pointer shadow-lg active:scale-[0.98] hover:border-dm-accent hover:shadow-[0_0_15px_var(--theme-glow)] transition-[border-color,box-shadow,scale] duration-300"
    >
      {item.image ? (
        <div className="h-44 w-full overflow-hidden border-b border-dm-accent/10 relative shrink-0">
          {/* Cropped thumbnail, kept toward the top where faces and blades usually are; the sheet shows it whole. */}
          <img src={item.image} alt={item.name} className="w-full h-full object-cover object-[center_25%] group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
          <div className="absolute bottom-2.5 left-3 right-3">{meta}</div>
        </div>
      ) : (
        <>
          <div className="h-1 shrink-0" style={{ backgroundColor: color }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-20 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 12%, transparent), transparent)` }} />
        </>
      )}
      <div className="relative p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-display text-lg leading-snug tracking-wide break-words" style={{ color }}>{item.name}</h3>
        {!item.image && (info.typeText || info.rarityText) && meta}
        <p className="text-sm text-dm-text-muted line-clamp-3 flex-1 break-words">{item.shortDescription || item.description}</p>
        {(item.value || item.attunement) && (
          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-dm-border/60 text-xs">
            {item.attunement && (
              <span className="flex items-center gap-1 text-dm-muted" title={item.attunement}>
                <Link2 size={12} /> Sintonización
              </span>
            )}
            {item.value && (
              <span className="ml-auto flex items-center gap-1.5 font-mono font-bold" style={{ color }}>
                <Coins size={13} /> {item.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Weight, damage, properties and AC of a homebrew item, when it has any. */
function ItemStats({ item }: { item: CustomItem }) {
  const stats: [string, string | undefined][] = [
    ["Peso", item.weight],
    ["Daño", item.damage],
    ["Clase de Armadura", item.armorClass],
    ["Propiedades", item.properties],
  ];
  const shown = stats.filter(([, v]) => v);
  if (shown.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2 mb-6">
      {shown.map(([label, value]) => (
        <div key={label} className={cn("bg-dm-bg-darker border border-dm-border px-3 py-2", label === "Propiedades" && "col-span-2")}>
          <dt className="text-[10px] uppercase tracking-widest font-bold text-dm-muted">{label}</dt>
          <dd className="text-sm text-dm-text-bright break-words"><Measured text={value} /></dd>
        </div>
      ))}
    </dl>
  );
}
