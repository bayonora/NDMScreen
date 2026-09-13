import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Package } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import Markdown from "react-markdown";
import { useStore, actions, store } from "../store/useStore";
import { Plus, X, Download, Upload, Image as ImageIcon, Hexagon, ChevronDown, ChevronUp, Trash2, Coins, Dices } from "lucide-react";
import { CustomItem, LootTable } from "../types";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImportModal } from "../components/ImportModal";
import { cn, compressImage } from "../lib/utils";


const LOOT_COLORS = [
  { id: 'default', color: '#c1a063', label: 'Predeterminado' },
  { id: 'verde', color: '#10b981', label: 'Verde (Poco Común)' },
  { id: 'celeste', color: '#38bdf8', label: 'Celeste (Raro)' },
  { id: 'azul', color: '#3b82f6', label: 'Azul (Muy Raro)' },
  { id: 'morado', color: '#a855f7', label: 'Morado (Épico)' },
  { id: 'dorado', color: '#fbbf24', label: 'Dorado (Legendario)' },
  { id: 'carmesi', color: '#dc2626', label: 'Carmesí (Artefacto)' }
];

export function ViewItems() {
  const customItems = useStore((state) => state.customItems);
  const lootTables = useStore((state) => state.lootTables);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"items" | "loot">("items");
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [viewingItem, setViewingItem] = useState<CustomItem | null>(null);
  const [editingTable, setEditingTable] = useState<{ id: string; name: string; description: string; rawText: string; color: string } | null>(null);
  const [viewingTable, setViewingTable] = useState<LootTable | null>(null);
  const [deleteData, setDeleteData] = useState<{ type: "item" | "table"; id: string } | null>(null);

  const [rollingTable, setRollingTable] = useState<LootTable | null>(null);
  const [rollingState, setRollingState] = useState<'idle' | 'rolling' | 'result'>('idle');
  const [currentRollNumber, setCurrentRollNumber] = useState<number>(1);
  const [finalItem, setFinalItem] = useState<{ index: number, text: string } | null>(null);
  

  const startLootRoll = (table: LootTable) => {
    if (!table.items || table.items.length === 0) return;
    setViewingTable(table);
    setRollingState('rolling');
    setFinalItem(null);
    
    let ticks = 0;
    const maxTicks = 15;
    const interval = setInterval(() => {
      setCurrentRollNumber(Math.floor(Math.random() * table.items.length) + 1);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * table.items.length);
        setCurrentRollNumber(finalIndex + 1);
        setFinalItem({ index: finalIndex + 1, text: table.items[finalIndex] });
        setRollingState('result');
      }
    }, 100);
  };

  useEffect(() => {
    if (rollingState === 'result' && finalItem) {
      setTimeout(() => {
        document.getElementById(`loot-item-${finalItem.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [rollingState, finalItem]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name) return;
    if (editingItem.id) actions.updateCustomItem(editingItem.id, editingItem);
    else actions.addCustomItem(editingItem);
    setEditingItem(null);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editingTable.name) return;
    
    // Parse text into lines (unlimited)
    const lines = editingTable.rawText
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);
      
    const tableData: Omit<LootTable, "id"> | LootTable = {
      ...(editingTable.id ? { id: editingTable.id } : {}),
      name: editingTable.name,
      description: editingTable.description,
      color: editingTable.color,
      items: lines
    };

    if (editingTable.id) actions.updateLootTable(editingTable.id, tableData);
    else actions.addLootTable(tableData);
    setEditingTable(null);
  };

  const handleExport = () => {
    const data = activeTab === "items" ? (customItems || []) : (lootTables || []);
    const fileName = activeTab === "items" ? "ndms_objetos.json" : "ndms_tablas.json";
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          if (activeTab === "items") setPendingImport(imported);
          else setPendingImport(imported);
        } else if (imported && ((activeTab === "items" && Array.isArray(imported.customItems)) || (activeTab === "loot" && Array.isArray(imported.lootTables)))) {
          if (activeTab === "items") setPendingImport(imported.customItems);
          else setPendingImport(imported.lootTables);
        } else {
           alert("El archivo no parece contener datos válidos para esta sección.");
        }
      } catch (err) {
        alert("Archivo inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    if (activeTab === "items") {
      if (mode === "overwrite") {
        store.setState({ customItems: pendingImport });
      } else {
        store.setState({ customItems: [...(store.getState().customItems || []), ...pendingImport] });
      }
    } else {
      if (mode === "overwrite") {
        store.setState({ lootTables: pendingImport });
      } else {
        store.setState({ lootTables: [...(store.getState().lootTables || []), ...pendingImport] });
      }
    }
    setPendingImport(null);
  };


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    try {
      const base64 = await compressImage(file, 800);
      setEditingItem({ ...editingItem, image: base64 });
    } catch (err) {
      console.error("Error compressing image", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden relative">
      {/* HEADER: Matches standard top bar */}
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20 relative">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="flex items-center gap-2">
            <Package className={cn("shrink-0 transition-colors", activeTab === "items" ? "text-dm-accent" : "text-dm-muted")} size={20} />
            <button
              onClick={() => setActiveTab("items")}
              className={cn("text-base sm:text-lg tracking-widest uppercase font-light transition-all relative", activeTab === "items" ? "text-dm-accent" : "text-dm-muted hover:text-white")}
            >
              Objetos Únicos
              {activeTab === "items" && (
                <motion.div layoutId="items-tab-indicator" className="absolute -bottom-[22px] left-0 right-0 h-[2px] bg-dm-accent" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("loot")}
              className={cn("text-base sm:text-lg tracking-widest uppercase font-light transition-all relative", activeTab === "loot" ? "text-dm-accent" : "text-dm-muted hover:text-white")}
            >
              Tablas de Botín
              {activeTab === "loot" && (
                <motion.div layoutId="items-tab-indicator" className="absolute -bottom-[22px] left-0 right-0 h-[2px] bg-dm-accent" />
              )}
            </button>
          </div>
        </div>
        
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0" title="Importar">
            <Download size={18} />
          </button>
          <button onClick={handleExport} className="p-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0" title="Exportar">
            <Upload size={18} />
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
          
          <button
            onClick={() => {
              if (activeTab === "items") setEditingItem({ id: "", name: "", shortDescription: "", description: "", value: "", image: "", color: "#c1a063" });
              else setEditingTable({ id: "", name: "", description: "", rawText: "", color: "#c1a063" });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-dm-accent text-black hover:bg-white transition-colors uppercase tracking-wider text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Plus size={16} />
            <span>{activeTab === "items" ? "Nuevo Objeto" : "Nueva Tabla"}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-24 text-dm-text">
        {activeTab === "items" ? (
          <>
          <SortableGrid 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full"
            items={customItems || []} 
            onReorder={(newItems) => actions.reorderCustomItems(newItems)} 
            renderItem={(item) => (
              <div className="bg-dm-bg-darker active:scale-[0.98] border border-dm-border flex flex-col shadow-lg hover:border-dm-accent transition-colors group relative cursor-pointer" onClick={() => setViewingItem(item)}>
                {item.image ? (
                  <div className="h-40 w-full overflow-hidden border-b border-dm-accent/10 relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex gap-2">
                      <span className="bg-dm-bg-darker/80 backdrop-blur-md border border-dm-accent/30 text-dm-accent text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{item.category}</span>
                      {item.rarity && <span className="bg-dm-bg-darker/80 backdrop-blur-md border border-dm-accent/30 text-white text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{item.rarity}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="h-2" style={{ backgroundColor: item.color || '#c1a063' }} />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold pr-6" style={{ color: item.color || '#c1a063' }}>{item.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3 flex-1 break-words">{item.shortDescription || item.description}</p>
                  {item.value && (
                    <div className="flex items-center gap-1.5 self-end mt-auto pt-4 border-t border-dm-border w-full justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                      <Coins size={14} style={{ color: item.color || '#c1a063' }} />
                      <span className="font-mono text-sm font-bold" style={{ color: item.color || '#c1a063' }}>{item.value}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          />
            {(!customItems || customItems.length === 0) && (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border">
                <p>No hay objetos únicos guardados.</p>
              </div>
            )}
          </>
        ) : (
          <>
          <SortableGrid 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full"
            items={lootTables || []} 
            onReorder={(newTables) => actions.reorderLootTables(newTables)} 
            renderItem={(table) => (
              <div className="bg-dm-bg-darker active:scale-[0.98] border border-dm-border flex flex-col shadow-lg hover:border-dm-accent transition-colors group relative cursor-pointer h-64" onClick={() => setViewingTable(table)}>
                <div className="h-2" style={{ backgroundColor: table.color || '#c1a063' }} />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold pr-6" style={{ color: table.color || '#c1a063' }}>{table.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3 break-words">{table.description}</p>
                  <div className="mt-auto pt-4 border-t border-dm-border flex items-center justify-between text-xs text-dm-muted uppercase tracking-widest font-bold">
                    <div className="flex items-center gap-2 group-hover:text-dm-accent transition-colors">
                      <Dices size={14} />
                      <span>{table.items?.length || 0} Objetos</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
            {(!lootTables || lootTables.length === 0) && (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-dm-muted border-2 border-dashed border-dm-border">
                <p>No hay tablas de botín guardadas.</p>
              </div>
            )}
          </>
        )}
      </div>

      
      {viewingItem && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all" onClick={() => setViewingItem(null)}>
          <div className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/20 rounded-xl w-full max-w-xl relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-full absolute top-0 left-0 z-20" style={{ backgroundColor: viewingItem.color || '#c1a063' }} />
            <button type="button" onClick={() => setViewingItem(null)} className="absolute top-4 right-4 text-dm-muted hover:text-white z-20 bg-black/50 rounded-full p-1 backdrop-blur-sm"><X size={20} /></button>
            
            {viewingItem.image && (
              <div className="w-full h-64 border-b border-dm-accent/10 relative">
                <img src={viewingItem.image} alt={viewingItem.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-dm-bg-darker to-transparent pointer-events-none" />
              </div>
            )}
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
              <h2 className="text-3xl font-bold mb-2 pr-8 font-serif" style={{ color: viewingItem.color || '#c1a063' }}>{viewingItem.name}</h2>
              {viewingItem.shortDescription && (
                <p className="text-dm-muted italic text-sm mb-4 border-b break-words border-dm-border pb-4">{viewingItem.shortDescription}</p>
              )}
              
              {viewingItem.value && (
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-dm-border bg-[#0a0a09] shadow-inner self-start">
                   <Coins size={16} style={{ color: viewingItem.color || '#c1a063' }} />
                   <span className="font-mono font-bold tracking-wider" style={{ color: viewingItem.color || '#c1a063' }}>{viewingItem.value}</span>
                </div>
              )}
              
              <h3 className="text-xs uppercase tracking-widest text-dm-muted mb-2">Descripción Completa</h3>
              <div className="text-gray-300 text-sm leading-relaxed mb-8 flex-1 break-words [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5">
                <Markdown>{viewingItem.description || "Sin descripción detallada."}</Markdown>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-dm-border mt-auto">
                 <button onClick={() => { setEditingItem(viewingItem); setViewingItem(null); }} className="px-4 py-3 bg-dm-accent text-black hover:bg-white transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2 flex-1">
                   Editar Objeto
                 </button>
                 <button onClick={() => { setDeleteData({ type: "item", id: viewingItem.id }); setViewingItem(null); }} className="px-4 py-3 border border-dm-border text-dm-muted hover:border-dm-danger hover:text-dm-danger transition-colors flex items-center justify-center shrink-0" title="Borrar Objeto">
                   <Trash2 size={20} />
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Single Items */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all">
          <form onSubmit={handleSaveItem} className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/20 rounded-xl p-6 max-w-lg w-full relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
            <button type="button" onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-dm-muted hover:text-white"><X size={20} /></button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-6 font-light border-b border-dm-accent/10 pb-2">
              {editingItem.id ? "Editar Objeto" : "Nuevo Objeto"}
            </h2>

            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Nombre (Obligatorio)</label>
              <input type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none" required />

              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Color / Rareza</label>
              <div className="flex gap-2 mb-4">
                {LOOT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEditingItem({...editingItem, color: c.color})}
                    className={cn("w-8 h-8 rounded-full border-2 transition-transform shadow-md", editingItem.color === c.color ? "border-white scale-110" : "border-dm-bg-darker hover:scale-105")}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>

              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1 flex justify-between">
                <span>Resumen (Se ve en la lista)</span>
                <span className="text-gray-500">{(editingItem.shortDescription || "").length}/100</span>
              </label>
              <input type="text" maxLength={100} value={editingItem.shortDescription || ""} onChange={(e) => setEditingItem({ ...editingItem, shortDescription: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none" placeholder="Una espada forjada en el fuego de..." />

              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Valor (Ej. 500 po)</label>
              <input type="text" value={editingItem.value || ""} onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none" />
              
              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Descripción Completa</label>
              <textarea value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none h-48 resize-none font-sans text-sm" placeholder="Historia detallada, estadísticas de daño, peso..." />

              <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Imagen (Opcional)</label>
              <div className="flex items-center space-x-4 mb-6">
                {editingItem.image ? (
                  <div className="w-16 h-16 border border-dm-border relative overflow-hidden">
                    <img src={editingItem.image} alt="preview" className="object-cover w-full h-full" />
                    <button type="button" onClick={() => setEditingItem({...editingItem, image: undefined})} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100"><X size={16} className="text-red-500"/></button>
                  </div>
                ) : (
                  <label className="w-16 h-16 border border-dm-border flex items-center justify-center text-dm-muted cursor-pointer hover:border-dm-accent hover:text-dm-accent transition-colors">
                    <ImageIcon size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                <span className="text-xs text-gray-500 flex-1">Sube una imagen representativa. Se guardará internamente (¡Cuidado con el peso!).</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-dm-border">
              <button type="submit" className="px-6 py-2 bg-dm-accent text-black font-bold uppercase tracking-widest hover:bg-white transition-colors">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Editor Modal for Loot Tables */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all">
          <form onSubmit={handleSaveTable} className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/20 rounded-xl p-6 max-w-2xl w-full relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col h-[80vh]">
            <button type="button" onClick={() => setEditingTable(null)} className="absolute top-4 right-4 text-dm-muted hover:text-white"><X size={20} /></button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-2 font-light">
              {editingTable.id ? "Editar Tabla de Botín" : "Nueva Tabla de Botín"}
            </h2>
            <p className="text-xs text-gray-400 mb-6 border-b border-dm-accent/10 pb-2">Cada línea de texto será un posible resultado (Sin límite de líneas).</p>

            <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Nombre de la Categoría/Tabla</label>
            <input type="text" placeholder="Ej. Tesoro de Dragón Adulto (CR 11-16)" value={editingTable.name} onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none" required />

            <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Descripción (Opcional)</label>
            <textarea placeholder="Detalles, historia, en qué momento debe tirarse..." value={editingTable.description} onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })} className="w-full bg-black/50 border border-dm-border p-2 text-white mb-4 focus:border-dm-accent outline-none font-sans text-sm resize-none h-24" />

            <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1">Color / Rareza</label>
            <div className="flex gap-2 mb-6">
              {LOOT_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditingTable({...editingTable, color: c.color})}
                  className={cn("w-8 h-8 rounded-full border-2 transition-transform shadow-md", editingTable.color === c.color ? "border-white scale-110" : "border-dm-bg-darker hover:scale-105")}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>

            <label className="block text-xs uppercase tracking-widest text-dm-muted mb-1 flex justify-between">
              <span>Objetos (1 por línea)</span>
              <span className="text-gray-500">{editingTable.rawText.split('\n').filter(l=>l.trim()).length} entradas</span>
            </label>
            <textarea 
              value={editingTable.rawText} 
              onChange={(e) => setEditingTable({ ...editingTable, rawText: e.target.value })} 
              className="w-full flex-1 bg-black/50 border border-dm-border p-2 text-white mb-6 focus:border-dm-accent outline-none font-mono text-sm resize-none whitespace-pre" 
              placeholder={`1000 po\nPoción de Curación Mayor\nEspada Larga +1`}
              required 
            />

            <div className="flex justify-end pt-4 border-t border-dm-border">
              <button type="submit" className="px-6 py-2 bg-dm-accent text-black font-bold uppercase tracking-widest hover:bg-white transition-colors">Guardar Tabla</button>
            </div>
          </form>
        </div>
      )}

      
      
      {viewingTable && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all" onClick={() => { setViewingTable(null); setRollingState('idle'); }}>
          <div className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/20 rounded-xl p-6 max-w-2xl w-full relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-full absolute top-0 left-0 rounded-t-lg" style={{ backgroundColor: viewingTable.color || '#c1a063' }} />
            <button type="button" onClick={() => { setViewingTable(null); setRollingState('idle'); }} className="absolute top-4 right-4 text-dm-muted hover:text-white z-10"><X size={20} /></button>
            <h2 className="text-2xl text-dm-accent font-bold mb-2 pr-8">{viewingTable.name}</h2>
            {viewingTable.description && <p className="text-sm text-gray-300 mb-6 border-b border-dm-accent/10 pb-4 whitespace-pre-wrap break-words">{viewingTable.description}</p>}
            
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
               <button onClick={() => startLootRoll(viewingTable)} disabled={rollingState === 'rolling'} className="px-4 py-2 bg-dm-accent text-black hover:bg-white disabled:opacity-50 transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center gap-2">
                 <Hexagon size={16} className={rollingState === 'rolling' ? "animate-spin" : ""} /> Tirar (d{(viewingTable?.items?.length || 0)})
               </button>
               <button onClick={() => { setEditingTable({ id: viewingTable.id, name: viewingTable.name, description: viewingTable.description || "", rawText: (viewingTable?.items || []).join("\n"), color: viewingTable.color || "#c1a063" }); setViewingTable(null); setRollingState('idle'); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors uppercase tracking-wider font-bold text-sm flex items-center justify-center flex-1">
                 Editar Tabla
               </button>
               <button onClick={() => { setDeleteData({ type: "table", id: viewingTable.id }); setViewingTable(null); setRollingState('idle'); }} className="px-4 py-2 border border-dm-border text-dm-muted hover:border-dm-danger hover:text-dm-danger transition-colors flex items-center justify-center shrink-0" title="Borrar Tabla">
                 <Trash2 size={18} />
               </button>
            </div>

            {rollingState !== 'idle' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mb-6 p-6 border border-dm-accent bg-black relative overflow-hidden rounded-sm flex flex-col items-center justify-center min-h-[120px]">
                 {rollingState === 'rolling' && (
                   <div className="flex flex-col items-center w-full animate-pulse">
                     <div className="flex items-center gap-4 text-dm-accent">
                       <span className="text-4xl font-mono">{currentRollNumber}</span>
                     </div>
                     <span className="text-xs uppercase tracking-widest text-dm-muted mt-2">Tirando los dados...</span>
                   </div>
                 )}
                 {rollingState === 'result' && finalItem && (
                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full text-center">
                     <span className="text-sm text-dm-muted font-mono mb-2">Resultado: #{finalItem.index}</span>
                     <span className="text-2xl text-white font-bold">{finalItem.text}</span>
                   </motion.div>
                 )}
              </motion.div>
            )}

            <h3 className="text-xs uppercase tracking-widest text-dm-muted mb-2">Contenido ({viewingTable.items.length} objetos)</h3>
            <ul className="space-y-1 bg-[#0a0a09] p-4 border border-dm-border font-mono text-sm overflow-y-auto custom-scrollbar flex-1 relative scroll-smooth rounded-sm">
              {(viewingTable?.items || []).map((item, idx) => {
                const isSelected = rollingState === 'result' && finalItem?.index === idx + 1;
                return (
                  <li id={`loot-item-${idx + 1}`} key={idx} className={cn("flex gap-4 p-2 border-b border-dm-accent/10 last:border-0 transition-all duration-500", isSelected ? "bg-dm-accent/20 border-l-4 border-l-dm-accent rounded-r-sm scale-[1.02]" : "hover:bg-dm-bg-darker")}>
                    <span className={cn("w-8 text-right shrink-0", isSelected ? "text-white font-bold" : "text-dm-accent opacity-50")}>{idx + 1}.</span>
                    <span className={cn("transition-colors", isSelected ? "text-dm-accent font-bold" : "text-gray-300")}>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      

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
      <ImportModal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onMerge={() => confirmImport("merge")}
        onOverwrite={() => confirmImport("overwrite")}
      />
    </div>
  );
}
