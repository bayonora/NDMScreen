import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Package, Plus, X, Image as ImageIcon, Hexagon, Trash2, Coins, Dices, Link2 } from "lucide-react";
import { useStore, actions, store } from "../store/useStore";
import { ItemCatalog } from "../components/ItemCatalog";
import { RARITIES } from "../data/itemLabels";
import { CustomItem, LootTable } from "../types";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { Markdown } from "../components/ui/Markdown";
import { Measured } from "../components/ui/Measured";
import { Overlay } from "../components/ui/Modal";
import { ViewHeader, ToolbarButton, SegmentedTabs } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { cn, compressImage, downloadJSON } from "../lib/utils";

// Rarity colors are fixed on purpose (they mean the same in every theme).
const LOOT_COLORS = [
  { id: "default", color: "#c1a063", label: "Predeterminado" },
  { id: "verde", color: "#10b981", label: "Verde (Infrecuente)" },
  { id: "celeste", color: "#38bdf8", label: "Celeste (Rara)" },
  { id: "azul", color: "#3b82f6", label: "Azul (Muy rara)" },
  { id: "morado", color: "#a855f7", label: "Morado (Épico / rareza variable)" },
  { id: "dorado", color: "#fbbf24", label: "Dorado (Legendaria)" },
  { id: "carmesi", color: "#dc2626", label: "Carmesí (Artefacto)" },
];
const DEFAULT_COLOR = LOOT_COLORS[0].color;

type EditingTable = { id: string; name: string; description: string; rawText: string; color: string };

const panelClass = "relative bg-dm-bg/80 backdrop-blur-xl border border-dm-accent/20 rounded-xl w-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-full sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95";
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
  const [editingTable, setEditingTable] = useState<EditingTable | null>(null);
  const [viewingTable, setViewingTable] = useState<LootTable | null>(null);
  const [deleteData, setDeleteData] = useState<{ type: "item" | "table"; id: string } | null>(null);

  const [rollingState, setRollingState] = useState<"idle" | "rolling" | "result">("idle");
  const [currentRollNumber, setCurrentRollNumber] = useState(1);
  const [finalItem, setFinalItem] = useState<{ index: number; text: string } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRoll = () => {
    if (rollTimer.current) clearInterval(rollTimer.current);
    rollTimer.current = null;
  };
  useEffect(() => stopRoll, []);

  const closeTable = () => {
    stopRoll();
    setViewingTable(null);
    setRollingState("idle");
    setFinalItem(null);
  };

  const startLootRoll = (table: LootTable) => {
    if (!table.items || table.items.length === 0) return;
    stopRoll();
    setRollingState("rolling");
    setFinalItem(null);

    let ticks = 0;
    rollTimer.current = setInterval(() => {
      setCurrentRollNumber(Math.floor(Math.random() * table.items.length) + 1);
      ticks++;
      if (ticks >= 15) {
        stopRoll();
        const finalIndex = Math.floor(Math.random() * table.items.length);
        setCurrentRollNumber(finalIndex + 1);
        setFinalItem({ index: finalIndex + 1, text: table.items[finalIndex] });
        setRollingState("result");
      }
    }, 100);
  };

  useEffect(() => {
    if (rollingState !== "result" || !finalItem) return;
    const t = setTimeout(() => {
      document.getElementById(`loot-item-${finalItem.index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(t);
  }, [rollingState, finalItem]);

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim() || !editingItem.shortDescription?.trim()) return;
    const { id, ...data } = editingItem;
    if (id) actions.updateCustomItem(id, data);
    else actions.addCustomItem(data);
    setEditingItem(null);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name) return;
    const data = {
      name: editingTable.name,
      description: editingTable.description,
      color: editingTable.color,
      items: editingTable.rawText.split("\n").map((l) => l.trim()).filter(Boolean),
    };
    if (editingTable.id) actions.updateLootTable(editingTable.id, data);
    else actions.addLootTable(data);
    setEditingTable(null);
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
                parse={arrayOrKey("customItems")}
                onImport={(items, mode) => actions.importCollection("customItems", items, mode)}
                invalidMessage="El archivo no parece contener objetos válidos."
              />
            ) : (
              <ImportExportActions
                key="loot"
                noun="Tablas"
                onExport={() => downloadJSON(lootTables, "ndms_tablas.json")}
                parse={arrayOrKey("lootTables")}
                onImport={(items, mode) => actions.importCollection("lootTables", items, mode)}
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
                else setEditingTable({ id: "", name: "", description: "", rawText: "", color: DEFAULT_COLOR });
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
            <SortableGrid
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full"
              items={customItems}
              onReorder={actions.reorderCustomItems}
              renderItem={(item) => {
                const color = item.color || DEFAULT_COLOR;
                return (
                  <div className="bg-dm-bg-darker active:scale-[0.98] border border-dm-border flex flex-col h-full shadow-lg hover:border-dm-accent transition-colors group relative cursor-pointer" onClick={() => setViewingItem(item)}>
                    {item.image ? (
                      <div className="h-40 w-full overflow-hidden border-b border-dm-accent/10 relative">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-3 left-4 flex gap-2">
                          {item.category && <span className="bg-dm-bg-darker/80 backdrop-blur-md border border-dm-accent/30 text-dm-accent text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{item.category}</span>}
                          {item.rarity && <span className="bg-dm-bg-darker/80 backdrop-blur-md border border-dm-accent/30 text-dm-text-bright text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{item.rarity}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="h-2" style={{ backgroundColor: color }} />
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold mb-1 break-words" style={{ color }}>{item.name}</h3>
                      {!item.image && (item.category || item.rarity) && (
                        <p className="text-[11px] uppercase tracking-wider text-dm-muted mb-2 truncate">{[item.category, item.rarity].filter(Boolean).join(" · ")}</p>
                      )}
                      <p className="text-sm text-dm-text-muted mb-4 line-clamp-3 flex-1 break-words">{item.shortDescription || item.description}</p>
                      {item.value && (
                        <div className="flex items-center gap-1.5 mt-auto pt-4 border-t border-dm-border w-full justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                          <Coins size={14} style={{ color }} />
                          <span className="font-mono text-sm font-bold" style={{ color }}>{item.value}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
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
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full"
              items={lootTables}
              onReorder={actions.reorderLootTables}
              renderItem={(table) => {
                const color = table.color || DEFAULT_COLOR;
                return (
                  <div className="bg-dm-bg-darker active:scale-[0.98] border border-dm-border flex flex-col shadow-lg hover:border-dm-accent transition-colors group relative cursor-pointer min-h-48 h-full" onClick={() => setViewingTable(table)}>
                    <div className="h-2" style={{ backgroundColor: color }} />
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold mb-2 break-words" style={{ color }}>{table.name}</h3>
                      <p className="text-sm text-dm-text-muted mb-4 line-clamp-3 break-words">{table.description}</p>
                      <div className="mt-auto pt-4 border-t border-dm-border flex items-center gap-2 text-xs text-dm-muted uppercase tracking-widest font-bold group-hover:text-dm-accent transition-colors">
                        <Dices size={14} />
                        <span>{table.items?.length || 0} Objetos</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {lootTables.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border text-center px-4">
                <p>No hay tablas de botín guardadas.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* View item */}
      <Overlay isOpen={!!viewingItem} onClose={() => setViewingItem(null)}>
        {viewingItem && (
          <div role="dialog" aria-modal="true" className={cn(panelClass, "max-w-xl")}>
            <div className="h-1 w-full absolute top-0 left-0 z-20" style={{ backgroundColor: viewingItem.color || DEFAULT_COLOR }} />
            <button type="button" onClick={() => setViewingItem(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright z-20 bg-black/50 rounded-full p-1 backdrop-blur-sm">
              <X size={20} />
            </button>

            {viewingItem.image && (
              <div className="w-full h-48 sm:h-64 shrink-0 border-b border-dm-accent/10 relative">
                <img src={viewingItem.image} alt={viewingItem.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-dm-bg-darker to-transparent pointer-events-none" />
              </div>
            )}

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 pr-8 font-serif break-words" style={{ color: viewingItem.color || DEFAULT_COLOR }}>{viewingItem.name}</h2>
              {viewingItem.shortDescription && (
                <p className="text-dm-muted italic text-sm mb-4 border-b break-words border-dm-border pb-4">{viewingItem.shortDescription}</p>
              )}

              {(viewingItem.category || viewingItem.rarity || viewingItem.attunement) && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                  {viewingItem.category && <span className="px-2 py-1 rounded-sm bg-dm-bg-hover border border-dm-border text-dm-muted uppercase tracking-wider">{viewingItem.category}</span>}
                  {viewingItem.rarity && <span className="px-2 py-1 rounded-sm border border-dm-border font-semibold" style={{ color: viewingItem.color || DEFAULT_COLOR }}>{viewingItem.rarity}</span>}
                  {viewingItem.attunement && <span className="px-2 py-1 rounded-sm border border-dm-border text-dm-text-muted flex items-center gap-1"><Link2 size={12} />{viewingItem.attunement[0].toUpperCase() + viewingItem.attunement.slice(1)}</span>}
                </div>
              )}

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

              <span className={labelClass}>Color / Rareza</span>
              <ColorPicker value={editingItem.color} onChange={(color) => setEditingItem({ ...editingItem, color })} />

              <fieldset className="border border-dm-border p-3 pb-0 mb-4">
                <legend className="px-1 text-xs uppercase tracking-widest text-dm-muted">Detalles (opcionales)</legend>
                <div className="grid grid-cols-2 gap-x-3">
                  <div>
                    <label className={labelClass} htmlFor="item-category">Categoría</label>
                    <input id="item-category" type="text" list="item-category-options" value={editingItem.category || ""} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })} className={fieldClass} placeholder="Ej. Poción" />
                    <datalist id="item-category-options">
                      {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="item-rarity">Rareza</label>
                    <input id="item-rarity" type="text" list="item-rarity-options" value={editingItem.rarity || ""} onChange={(e) => {
                      const rarity = e.target.value;
                      // Picking a standard rarity also paints the card with its color.
                      const match = RARITIES.find((r) => r.label.toLowerCase() === rarity.trim().toLowerCase());
                      setEditingItem({ ...editingItem, rarity, color: match ? match.color : editingItem.color });
                    }} className={fieldClass} placeholder="Ej. Rara" />
                    <datalist id="item-rarity-options">
                      {RARITIES.filter((r) => r.key !== "varies").map((r) => <option key={r.key} value={r.label} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="item-value">Valor</label>
                    <input id="item-value" type="text" value={editingItem.value || ""} onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })} className={fieldClass} placeholder="Ej. 500 po" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="item-weight">Peso</label>
                    <input id="item-weight" type="text" value={editingItem.weight || ""} onChange={(e) => setEditingItem({ ...editingItem, weight: e.target.value })} className={fieldClass} placeholder="Ej. 3 lb" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass} htmlFor="item-attunement">Sintonización</label>
                    <input id="item-attunement" type="text" value={editingItem.attunement || ""} onChange={(e) => setEditingItem({ ...editingItem, attunement: e.target.value })} className={fieldClass} placeholder="Ej. requiere sintonización (vacío si no la necesita)" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="item-damage">Daño</label>
                    <input id="item-damage" type="text" value={editingItem.damage || ""} onChange={(e) => setEditingItem({ ...editingItem, damage: e.target.value })} className={fieldClass} placeholder="Ej. 1d8 cortante" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="item-ac">Clase de Armadura</label>
                    <input id="item-ac" type="text" value={editingItem.armorClass || ""} onChange={(e) => setEditingItem({ ...editingItem, armorClass: e.target.value })} className={fieldClass} placeholder="Ej. +2" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass} htmlFor="item-properties">Propiedades</label>
                    <input id="item-properties" type="text" value={editingItem.properties || ""} onChange={(e) => setEditingItem({ ...editingItem, properties: e.target.value })} className={fieldClass} placeholder="Ej. Sutil, ligera" />
                  </div>
                </div>
              </fieldset>

              <label className={labelClass} htmlFor="item-desc">Descripción Completa</label>
              <textarea id="item-desc" value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className={cn(fieldClass, "h-40 sm:h-48 resize-y font-sans text-sm")} placeholder="Historia detallada, estadísticas de daño, peso..." />

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

      {/* Edit loot table */}
      <Overlay isOpen={!!editingTable} onClose={() => setEditingTable(null)} closeOnBackdrop={false}>
        {editingTable && (
          <form onSubmit={handleSaveTable} className={cn(panelClass, "max-w-2xl p-4 sm:p-6 h-full sm:h-[80vh]")}>
            <button type="button" onClick={() => setEditingTable(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright"><X size={20} /></button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-2 font-light pr-8">
              {editingTable.id ? "Editar Tabla de Botín" : "Nueva Tabla de Botín"}
            </h2>
            <p className="text-xs text-dm-muted mb-6 border-b border-dm-accent/10 pb-2">Cada línea de texto será un posible resultado (sin límite de líneas).</p>

            <label className={labelClass} htmlFor="table-name">Nombre de la Categoría/Tabla</label>
            <input id="table-name" type="text" placeholder="Ej. Tesoro de Dragón Adulto (CR 11-16)" value={editingTable.name} onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })} className={fieldClass} required />

            <label className={labelClass} htmlFor="table-desc">Descripción (Opcional)</label>
            <textarea id="table-desc" placeholder="Detalles, historia, en qué momento debe tirarse..." value={editingTable.description} onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })} className={cn(fieldClass, "font-sans text-sm resize-none h-20 sm:h-24")} />

            <span className={labelClass}>Color / Rareza</span>
            <ColorPicker value={editingTable.color} onChange={(color) => setEditingTable({ ...editingTable, color })} />

            <label className={cn(labelClass, "flex justify-between")} htmlFor="table-items">
              <span>Objetos (1 por línea)</span>
              <span className="text-dm-muted-alt">{editingTable.rawText.split("\n").filter((l) => l.trim()).length} entradas</span>
            </label>
            <textarea
              id="table-items"
              value={editingTable.rawText}
              onChange={(e) => setEditingTable({ ...editingTable, rawText: e.target.value })}
              className={cn(fieldClass, "flex-1 min-h-32 font-mono text-sm resize-none whitespace-pre mb-6")}
              placeholder={"1000 po\nPoción de Curación Mayor\nEspada Larga +1"}
              required
            />

            <div className="flex justify-end pt-4 border-t border-dm-border">
              <button type="submit" className={cn(primaryButtonClass, "px-6")}>Guardar Tabla</button>
            </div>
          </form>
        )}
      </Overlay>

      {/* View / roll loot table */}
      <Overlay isOpen={!!viewingTable} onClose={closeTable}>
        {viewingTable && (
          <div role="dialog" aria-modal="true" className={cn(panelClass, "max-w-2xl p-4 sm:p-6")}>
            <div className="h-1 w-full absolute top-0 left-0" style={{ backgroundColor: viewingTable.color || DEFAULT_COLOR }} />
            <button type="button" onClick={closeTable} aria-label="Cerrar" className="absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright z-10"><X size={20} /></button>
            <h2 className="text-xl sm:text-2xl text-dm-accent font-bold mb-2 pr-8 break-words">{viewingTable.name}</h2>
            {viewingTable.description && <p className="text-sm text-dm-text-muted mb-4 sm:mb-6 border-b border-dm-accent/10 pb-4 whitespace-pre-wrap break-words">{viewingTable.description}</p>}

            <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
              <button type="button" onClick={() => startLootRoll(viewingTable)} disabled={rollingState === "rolling" || viewingTable.items.length === 0} className={cn(primaryButtonClass, "flex-1 sm:flex-none")}>
                <Hexagon size={16} className={rollingState === "rolling" ? "animate-spin" : ""} /> Tirar (d{viewingTable.items.length})
              </button>
              <button type="button" onClick={() => { setEditingTable({ id: viewingTable.id, name: viewingTable.name, description: viewingTable.description || "", rawText: viewingTable.items.join("\n"), color: viewingTable.color || DEFAULT_COLOR }); closeTable(); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center sm:flex-1">
                Editar
              </button>
              <button type="button" onClick={() => { setDeleteData({ type: "table", id: viewingTable.id }); closeTable(); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-danger hover:text-dm-danger transition-colors flex items-center justify-center shrink-0" title="Borrar Tabla" aria-label="Borrar Tabla">
                <Trash2 size={18} />
              </button>
            </div>

            {rollingState !== "idle" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-4 sm:mb-6 p-4 sm:p-6 border border-dm-accent bg-black relative overflow-hidden rounded-sm flex flex-col items-center justify-center min-h-[110px] shrink-0">
                {rollingState === "rolling" && (
                  <div className="flex flex-col items-center w-full animate-pulse">
                    <span className="text-4xl font-mono text-dm-accent">{currentRollNumber}</span>
                    <span className="text-xs uppercase tracking-widest text-dm-muted mt-2">Tirando los dados...</span>
                  </div>
                )}
                {rollingState === "result" && finalItem && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full text-center">
                    <span className="text-sm text-dm-muted font-mono mb-2">Resultado: #{finalItem.index}</span>
                    <span className="text-xl sm:text-2xl text-dm-text-bright font-bold break-words">{finalItem.text}</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            <h3 className="text-xs uppercase tracking-widest text-dm-muted mb-2">Contenido ({viewingTable.items.length} objetos)</h3>
            <ul className="space-y-1 bg-dm-bg-darker p-2 sm:p-4 border border-dm-border font-mono text-sm overflow-y-auto custom-scrollbar flex-1 min-h-24 relative scroll-smooth rounded-sm">
              {viewingTable.items.map((item, idx) => {
                const isSelected = rollingState === "result" && finalItem?.index === idx + 1;
                return (
                  <li id={`loot-item-${idx + 1}`} key={idx} className={cn("flex gap-3 sm:gap-4 p-2 border-b border-dm-accent/10 last:border-0 transition-all duration-500", isSelected ? "bg-dm-accent/20 border-l-4 border-l-dm-accent rounded-r-sm" : "hover:bg-dm-bg")}>
                    <span className={cn("w-8 text-right shrink-0", isSelected ? "text-dm-text-bright font-bold" : "text-dm-accent opacity-50")}>{idx + 1}.</span>
                    <span className={cn("transition-colors break-words min-w-0", isSelected ? "text-dm-accent font-bold" : "text-dm-text")}>{item}</span>
                  </li>
                );
              })}
            </ul>
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

const CATEGORY_SUGGESTIONS = [
  "Arma", "Armadura", "Escudo", "Poción", "Anillo", "Vara", "Pergamino", "Bastón", "Varita", "Objeto maravilloso", "Artefacto",
  "Equipo de aventuras", "Herramienta", "Montura", "Vehículo", "Tesoro",
];

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

function ColorPicker({ value, onChange }: { value?: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {LOOT_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.color)}
          className={cn("w-8 h-8 rounded-full border-2 transition-transform shadow-md", value === c.color ? "border-dm-text-bright scale-110" : "border-dm-bg-darker hover:scale-105")}
          style={{ backgroundColor: c.color }}
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.color}
        />
      ))}
    </div>
  );
}
