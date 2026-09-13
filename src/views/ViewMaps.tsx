import React, { useState, useRef, useMemo } from "react";
import { useStore, actions, store } from "../store/useStore";
import { MapData, LocationData } from "../types";
import { Map, Image as ImageIcon, Maximize2, Edit2, Trash2, Plus, Upload, Download, MapPin, ChevronRight, ArrowLeft, Loader2, ImageOff, FolderPlus, FileText } from "lucide-react";
import { cn, compressImage } from "../lib/utils";
import { Modal } from "../components/ui/Modal";
import { Input, Textarea, Button } from "../components/ui/Input";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";
import { ImportModal } from "../components/ImportModal";


function StorageIndicator() {
  const [used, setUsed] = useState(0);
  
  React.useEffect(() => {
    const calc = () => {
      const data = localStorage.getItem('ndms_state') || '';
      // Approximate size in bytes (each char in localStorage is UTF-16, so ~2 bytes, but Blob size works well enough for an estimate of string size)
      const bytes = data.length * 2; // Precise UTF-16 byte calculation for localStorage
      setUsed(bytes);
    };
    calc();
    // Update when local storage changes or window gets focus
    window.addEventListener('storage', calc);
    window.addEventListener('focus', calc);
    const interval = setInterval(calc, 5000); // Check every 5s
    return () => {
      window.removeEventListener('storage', calc);
      window.removeEventListener('focus', calc);
      clearInterval(interval);
    };
  }, []);

  const maxBytes = 5 * 1024 * 1024; // ~5MB typical safe limit
  const percent = Math.min((used / maxBytes) * 100, 100);
  const isWarning = percent > 80;
  const isCritical = percent > 95;

  return (
    <div className="flex items-center gap-2 text-xs  tracking-widest uppercase" title="Almacenamiento Local Usado">
      <div className="text-dm-muted">Capacidad:</div>
      <div className="w-24 h-1.5 bg-dm-bg rounded-full overflow-hidden border border-dm-border">
        <div 
          className={cn("h-full transition-all duration-500", isCritical ? "bg-dm-danger" : (isWarning ? "bg-dm-accent" : "bg-dm-border-focus"))} 
          style={{ width: `${percent}%` }} 
        />
      </div>
      <div className={cn(isCritical ? "text-dm-danger" : (isWarning ? "text-dm-accent" : "text-dm-muted"))}>
        {Math.round(percent)}%
      </div>
    </div>
  );
}

export function ViewMaps() {
  const maps = useStore((state) => state.maps);
  const locations = useStore((state) => state.locations);
  
  // Navigation State
  const [path, setPath] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<any>(null);
  
  const currentNodeId = path.length > 0 ? path[path.length - 1] : null;
  const currentNode = useMemo(() => {
    if (!currentNodeId) return null;
    return maps.find(m => m.id === currentNodeId) || locations.find(l => l.id === currentNodeId);
  }, [currentNodeId, maps, locations]);

  // Children of the current node
  const children = useMemo(() => {
    if (!currentNodeId) {
      const rootMaps = maps;
      const rootLocations = locations.filter(l => !l.parentId);
      return [...rootMaps, ...rootLocations];
    } else {
      return locations.filter(l => l.parentId === currentNodeId);
    }
  }, [currentNodeId, maps, locations]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    return path.map(id => {
      const node = maps.find(m => m.id === id) || locations.find(l => l.id === id);
      return { id, name: node?.name || "Desconocido" };
    });
  }, [path, maps, locations]);

  const handleNavigate = (id: string) => setPath([...path, id]);
  const handleNavigateUp = (index: number) => setPath(path.slice(0, index + 1));
  const handleNavigateRoot = () => setPath([]);

  // UI States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editNode, setEditNode] = useState<any>(null); 
  const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
  const [deleteNodeType, setDeleteNodeType] = useState<"map" | "location">("location");
  
  // Map Pins State
  const [placingPinFor, setPlacingPinFor] = useState<string | null>(null);

  const importRef = useRef<HTMLInputElement>(null);

  const exportAll = () => {
    const data = { maps, locations };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ndms_mundo.json");
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
        if (imported.maps || imported.locations) {
          setPendingImport(imported);
        } else {
           alert("El archivo no parece contener datos de mundo válidos.");
        }
      } catch (err) {
        alert("Archivo inválido.");
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = "";
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    if (mode === "overwrite") {
      store.setState({ 
        maps: pendingImport.maps || [], 
        locations: pendingImport.locations || [] 
      });
    } else {
      store.setState({ 
        maps: [...maps, ...(pendingImport.maps || [])], 
        locations: [...locations, ...(pendingImport.locations || [])] 
      });
    }
    setPendingImport(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a09]">
      
      {/* HEADER / BREADCRUMBS */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 bg-dm-bg border-b border-dm-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 relative z-20">
         <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-dm-accent uppercase tracking-widest text-lg font-light">
           <button onClick={handleNavigateRoot} className="hover:text-white transition-colors flex items-center gap-1 sm:gap-2">
             <Map size={20} className="shrink-0" /> Mundo
           </button>
           {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight size={16} className="text-dm-muted" />
                <button onClick={() => handleNavigateUp(idx)} className="hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none">
                  {crumb.name}
                </button>
              </React.Fragment>
           ))}
         </div>
         <div className="flex gap-2 shrink-0">
            <input type="file" accept=".json" ref={importRef} style={{display: 'none'}} onChange={handleImport} />
            <StorageIndicator />
            <Button variant="ghost" size="sm" onClick={exportAll} title="Exportar Todo" className="px-2 border border-dm-border">
              <Upload size={14} className="sm:mr-2" /> <span className="hidden sm:inline text-xs">Exportar</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => importRef.current?.click()} title="Importar" className="px-2 border border-dm-border">
              <Download size={14} className="sm:mr-2" /> <span className="hidden sm:inline text-xs">Importar</span>
            </Button>
         </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: Map Image & Details (Only visible if inside a node) */}
        {currentNode && (
          <div className="w-full lg:w-3/5 xl:w-2/3 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-dm-border flex flex-col bg-[#0a0a09] relative z-10">
            {/* Title Bar */}
            <div className="bg-dm-bg-alt p-3 border-b border-dm-border flex items-center justify-between shrink-0">
               <h2 className="text-dm-accent  uppercase tracking-widest font-bold flex items-center gap-2">
                 <MapPin size={18} /> {currentNode.name}
               </h2>
               <div className="flex gap-1">
                  <button onClick={() => setEditNode(currentNode)} className="p-1.5 text-dm-muted hover:text-dm-accent transition-colors rounded-sm hover:bg-dm-bg" title="Editar">
                    <Edit2 size={16} />
                  </button>
               </div>
            </div>

            {/* Map Viewer */}
            <div className="flex-1 relative bg-black/50 overflow-hidden border-b border-dm-border">
               {currentNode.image ? (
                  <TransformWrapper initialScale={1} minScale={0.2} maxScale={8} centerOnInit wheel={{ disabled: true }} doubleClick={{ disabled: true }}>
                     {({ zoomIn, zoomOut, resetTransform }) => (
                       <React.Fragment>
                         {placingPinFor && (
                           <div className="absolute top-0 left-0 right-0 bg-dm-danger/90 backdrop-blur-md text-dm-text text-xs py-2 px-4 flex justify-between items-center z-50 animate-pulse border-b border-dm-accent/50">
                             <span className="uppercase tracking-widest font-bold">Haz clic en el mapa para ubicar el marcador</span>
                             <div className="flex gap-4 font-bold">
                               {children.find(c => c.id === placingPinFor)?.markerX !== undefined && (
                                 <button onClick={() => { 
                                     const child = children.find(c => c.id === placingPinFor);
                                     if (child) {
                                       if ('description' in child) actions.updateLocation(placingPinFor, { markerX: undefined, markerY: undefined });
                                       else actions.updateMap(placingPinFor, { markerX: undefined, markerY: undefined });
                                     }
                                     setPlacingPinFor(null); 
                                   }} 
                                   className="hover:text-dm-accent transition-colors uppercase"
                                 >
                                   Quitar Pin
                                 </button>
                               )}
                               <button onClick={() => setPlacingPinFor(null)} className="hover:text-dm-accent transition-colors uppercase">Cancelar</button>
                             </div>
                           </div>
                         )}

                         <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                           <div 
                             className={cn("relative inline-flex max-w-full max-h-full", placingPinFor ? "cursor-crosshair" : "")} 
                             onClick={(e) => {
                               if (!placingPinFor) return;
                               const rect = e.currentTarget.getBoundingClientRect();
                               const x = ((e.clientX - rect.left) / rect.width) * 100;
                               const y = ((e.clientY - rect.top) / rect.height) * 100;
                               
                               const child = children.find(c => c.id === placingPinFor);
                               if (child) {
                                 if ('description' in child) {
                                   actions.updateLocation(placingPinFor, { markerX: x, markerY: y });
                                 } else {
                                   actions.updateMap(placingPinFor, { markerX: x, markerY: y });
                                 }
                               }
                               setPlacingPinFor(null);
                             }}
                           >
                             <img src={currentNode.image} alt={currentNode.name} className="max-w-full max-h-full block shadow-2xl pointer-events-none" style={{ width: 'auto', height: 'auto', objectFit: 'contain' }} draggable={false} />
                             
                             {children.filter(c => c.markerX !== undefined && c.markerY !== undefined).map(c => (
                               <div 
                                 key={c.id} 
                                 className={cn("absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group", placingPinFor ? "pointer-events-none opacity-50" : "opacity-90 hover:opacity-100 hover:z-50")}
                                 style={{ left: `${c.markerX}%`, top: `${c.markerY}%` }}
                                 onClick={(e) => { 
                                    if (placingPinFor) return;
                                    e.stopPropagation(); 
                                    handleNavigate(c.id); 
                                 }}
                               >
                                 <MapPin size={32} className="text-dm-danger drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] group-hover:scale-125 transition-transform group-hover:text-dm-accent" fill="var(--theme-danger)" />
                                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-black/90 px-2 py-1 text-[10px] uppercase tracking-widest text-dm-accent rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-dm-border">
                                    {c.name}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </TransformComponent>
                         <div className="absolute bottom-4 right-4 flex gap-1 z-10 pointer-events-auto bg-dm-bg-alt/80 backdrop-blur-md p-1 rounded-sm border border-dm-border shadow-lg">
                           <button onClick={() => zoomOut(0.2)} className="text-dm-muted hover:text-dm-accent font-bold px-2 py-1 text-lg transition-colors bg-dm-bg rounded-sm">-</button>
                           <button onClick={() => resetTransform()} className="text-[10px] uppercase tracking-widest text-dm-muted hover:text-dm-accent transition-colors px-2 py-1 bg-dm-bg rounded-sm flex items-center">Reset</button>
                           <button onClick={() => zoomIn(0.2)} className="text-dm-muted hover:text-dm-accent font-bold px-2 py-1 text-lg transition-colors bg-dm-bg rounded-sm">+</button>
                         </div>
                       </React.Fragment>
                     )}
                  </TransformWrapper>
               ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-dm-border">
                    <ImageOff size={48} className="mb-2 opacity-20" />
                    <span className="uppercase tracking-widest text-xs font-bold opacity-30">Sin mapa visual</span>
                  </div>
               )}
            </div>

            {/* Details & Description */}
            {('description' in currentNode) && currentNode.description && (
              <div className="h-1/3 lg:h-1/4 xl:h-1/3 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-dm-bg-darker shrink-0 relative">
                 <div className="flex items-center gap-2 mb-3 text-dm-accent uppercase tracking-widest text-xs font-bold border-b border-dm-border pb-2">
                   <FileText size={14} /> Detalles
                 </div>
                 <div className="text-dm-text text-sm md:text-base prose prose-invert prose-sm max-w-none prose-strong:text-dm-accent leading-relaxed opacity-90">
                   <Markdown>{currentNode.description}</Markdown>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT PANEL: Sub-locations / Children */}
        <div className={cn("flex-1 h-1/2 lg:h-full flex flex-col bg-[#0a0a09]", !currentNode ? "w-full" : "w-full lg:w-2/5 xl:w-1/3")}>
           <div className="p-4 bg-dm-bg-alt border-b border-dm-border flex justify-between items-center shrink-0">
               <h2 className="text-sm uppercase tracking-widest text-dm-muted font-bold">
                 {currentNode ? "Lugares Internos" : "Mapas y Regiones"}
               </h2>
               <Button onClick={() => setIsAddOpen(true)} size="sm" className="shadow-lg h-8 px-3 text-xs">
                 <Plus size={14} className="mr-1" /> Añadir
               </Button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
              <div className={cn("grid gap-4", !currentNode ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2")}>
                 {children.map(child => {
                   const isLegacyMap = !('description' in child);
                   return (
                    <motion.div 
                      key={child.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-dm-bg border border-dm-border flex flex-col group shadow-lg hover:border-dm-accent transition-colors rounded-sm overflow-hidden"
                    >
                      <div 
                        className="h-32 w-full bg-[#0a0a09] relative cursor-pointer overflow-hidden"
                        onClick={() => handleNavigate(child.id)}
                      >
                        {child.image ? (
                          <img src={child.image} alt={child.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-dm-border">
                            <ImageOff size={24} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />
                        
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                           <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-dm-accent transform translate-y-2 group-hover:translate-y-0 transition-all">
                             <Maximize2 size={16} />
                           </div>
                        </div>

                        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                           <h3 className="text-dm-text-bright  uppercase tracking-wider font-bold text-sm truncate drop-shadow-md">
                             {child.name}
                           </h3>
                        </div>
                      </div>
                      <div className="p-2 bg-dm-bg-darker flex justify-between items-center border-t border-dm-border">
                        <span className="text-[10px] text-dm-muted uppercase tracking-widest truncate max-w-[100px]">
                           {isLegacyMap ? 'Región (Legado)' : ('region' in child && child.region ? child.region : 'Lugar')}
                        </span>
                        <div className="flex gap-1">
                          {currentNode?.image && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPlacingPinFor(placingPinFor === child.id ? null : child.id); }} 
                              className={cn("p-1 transition-colors rounded-sm", placingPinFor === child.id ? "bg-dm-danger text-white" : (child.markerX !== undefined ? "text-dm-accent hover:bg-dm-bg" : "text-dm-border-focus hover:bg-dm-bg hover:text-dm-accent"))}
                              title={child.markerX !== undefined ? "Mover marcador" : "Colocar en el mapa"}
                            >
                              <MapPin size={12} />
                            </button>
                          )}
                          <button onClick={() => setEditNode(child)} className="text-dm-border-focus hover:text-dm-accent p-1 transition-colors hover:bg-dm-bg rounded-sm">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => { setDeleteNodeId(child.id); setDeleteNodeType(isLegacyMap ? "map" : "location"); }} className="text-dm-border-focus hover:text-dm-danger p-1 transition-colors hover:bg-dm-bg rounded-sm">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                 )})}
                 {children.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-dm-muted border-2 border-dashed border-dm-border rounded-sm bg-dm-bg/30">
                      <FolderPlus size={40} className="mb-3 opacity-50" />
                      <p className="uppercase tracking-widest text-xs font-bold mb-1 text-center">Vacío</p>
                      <p className="text-[10px] opacity-70 text-center max-w-[200px]">Añade lugares para organizar esta zona.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

      </div>

      <AddNodeModal 
        isOpen={isAddOpen || !!editNode} 
        onClose={() => { setIsAddOpen(false); setEditNode(null); }} 
        initialData={editNode} 
        parentId={currentNodeId} 
      />

      <ConfirmDeleteModal 
        isOpen={!!deleteNodeId} 
        onClose={() => setDeleteNodeId(null)} 
        onConfirm={() => { 
          if (deleteNodeId) { 
            // 1. Determine all descendants to prevent orphaned data (memory leaks)
            const allLocations = store.getState().locations;
            let toDeleteIds = new Set<string>();
            
            const findDescendants = (parentId: string) => {
              const children = allLocations.filter(l => l.parentId === parentId);
              children.forEach(c => {
                toDeleteIds.add(c.id);
                findDescendants(c.id);
              });
            };
            
            findDescendants(deleteNodeId);

            // 2. Delete descendants
            toDeleteIds.forEach(id => actions.deleteLocation(id));

            // 3. Delete the target node
            if (deleteNodeType === "map") {
              actions.deleteMap(deleteNodeId);
            } else {
              actions.deleteLocation(deleteNodeId);
            }
            
            setDeleteNodeId(null); 
          } 
        }}
        title="Eliminar Lugar"
        message="¿Estás seguro de que quieres eliminar este lugar de forma permanente? Se perderá su imagen y descripción."
      />
      <ImportModal isOpen={!!pendingImport} onClose={() => setPendingImport(null)} onMerge={() => confirmImport("merge")} onOverwrite={() => confirmImport("overwrite")} />
    </div>
  );
}

function AddNodeModal({ isOpen, onClose, initialData, parentId }: { isOpen: boolean, onClose: () => void, initialData?: any, parentId: string | null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const isMapData = initialData && !('description' in initialData);

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setRegion(initialData.region || "");
    } else {
      setName("");
      setDescription("");
      setRegion("");
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    setLoading(true);
    try {
      let base64 = initialData?.image;
      const file = fileRef.current?.files?.[0];
      if (file) {
        base64 = await compressImage(file, 1600);
      }
      
      if (initialData) {
        if (isMapData) {
          actions.updateMap(initialData.id, { name, image: base64 });
        } else {
          actions.updateLocation(initialData.id, { name, description, region, image: base64 });
        }
      } else {
        actions.addLocation({ name, description, region, image: base64, parentId });
      }
      
      onClose();
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      alert("Error al procesar la imagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Lugar" : "Añadir Lugar"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nombre del Lugar *" value={name} onChange={(e) => setName(e.target.value)} required />
        
        {!isMapData && (
          <>
            <Input label="Etiqueta / Región Corta (Opcional)" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ej: Taberna, Costa de la Espada..." />
            <Textarea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe el lugar, quién vive aquí, qué se puede hacer..." />
          </>
        )}

        {isMapData && (
          <p className="text-xs text-dm-muted border border-dm-border p-2 bg-dm-bg-hover rounded-sm">
            Nota: Estás editando un mapa clásico. Los mapas clásicos no admiten descripción. Para crear lugares con descripción, añade un nuevo lugar.
          </p>
        )}

        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Imagen de Fondo (Opcional)</label>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileRef}
            className="flex h-10 w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright file:border-0 file:bg-transparent file:text-[10px] file:uppercase file:tracking-widest file:font-bold file:text-dm-accent file:mr-4 file:cursor-pointer hover:border-dm-accent transition-colors"
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="min-w-[100px]">
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (initialData ? "Guardar" : "Añadir")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
