import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { store, useStore, actions } from "../store/useStore";
import { Plus, Target, CheckCircle2, Circle, XCircle, MapPin, Trash2, Edit2, ChevronLeft, ChevronRight, Upload as UploadIcon, FileText, Download, Upload } from "lucide-react";

import { Modal } from "../components/ui/Modal";
import { Input, Button } from "../components/ui/Input";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { ImportModal } from "../components/ImportModal";
import { Quest, QuestStatus, QuestDetail } from "../types";
import { cn, compressImage } from "../lib/utils";
import { v4 as uuidv4 } from "uuid";

export function ViewQuests() {
  const quests = useStore((state) => state.quests);
  const uiState = useStore((state) => state.uiState);
  const highlightedQuestId = uiState?.highlightedQuestId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);

  const [detailModalState, setDetailModalState] = useState<{ mode: "add" | "view" | "edit" | null, questId: string | null, detail: QuestDetail | null }>({ mode: null, questId: null, detail: null });
  const [questToView, setQuestToView] = useState<Quest | null>(null);
  const [questToDelete, setQuestToDelete] = useState<Quest | null>(null);

  const rootQuests = useMemo(() => {
    return quests.filter(q => !q.parentId).sort((a, b) => a.createdAt - b.createdAt);
  }, [quests]);


  React.useEffect(() => {
    if (uiState?.highlightedQuestId) {
      const timer = setTimeout(() => {
        actions.updateUI({ highlightedQuestId: undefined });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uiState?.highlightedQuestId]);

  const handleAddQuest = (parentId: string | null = null) => {
    setEditingQuest(null);
    setParentIdForNew(parentId);
    setIsQuestModalOpen(true);
  };

  const handleEditQuest = (q: Quest) => {
    setEditingQuest(q);
    setParentIdForNew(q.parentId);
    setIsQuestModalOpen(true);
  };

  const handleAddDetail = (qId: string) => setDetailModalState({ mode: "add", questId: qId, detail: null });
  const handleViewDetail = (qId: string, detail: QuestDetail) => setDetailModalState({ mode: "view", questId: qId, detail });

  const exportQuests = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quests));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ndms_misiones.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const importQuests = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.every(q => q.title !== undefined)) {
          setPendingImport(parsed);
        } else if (parsed && parsed.quests && Array.isArray(parsed.quests)) {
          setPendingImport(parsed.quests);
        } else {
          alert("Archivo inválido o sin misiones.");
        }
      } catch (err) {
        alert("Error leyendo archivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    if (mode === "overwrite") {
      store.setState({ quests: pendingImport });
    } else {
      store.setState({ quests: [...(store.getState().quests || []), ...pendingImport] });
    }
    setPendingImport(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-dm-bg-alt border-none rounded-none overflow-hidden relative">
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex justify-between items-center z-20 relative gap-4">
        <h2 className="text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2 truncate">
          <Target size={18} />
          Árbol de Misiones
        </h2>
        <div className="flex gap-2">
          <Button onClick={handleImportClick} variant="ghost" className="hidden sm:flex border border-dm-border">
            <Download size={14} className="mr-1" /> Importar
          </Button>
          <Button onClick={exportQuests} variant="ghost" className="hidden sm:flex border border-dm-border">
            <Upload size={14} className="mr-1" /> Exportar
          </Button>
          <Button onClick={() => handleAddQuest(null)} className="whitespace-nowrap bg-dm-bg-hover border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent">
            <Plus size={14} className="mr-1" /> Nueva Misión
          </Button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={importQuests} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 custom-scrollbar relative">
        {rootQuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dm-muted opacity-50 space-y-4">
            <Target size={48} />
            <p>No hay misiones registradas. Crea tu primera misión raíz para empezar tu aventura.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-16 min-w-max pb-32">
            {rootQuests.map((root) => (
              <HorizontalQuestTree 
                key={root.id} 
                quest={root}
                highlightedQuestId={highlightedQuestId} 
                onAddSubQuest={handleAddQuest}
                onEditQuest={handleEditQuest}
                onAddDetail={handleAddDetail}
                onViewDetail={handleViewDetail}
                onViewQuest={setQuestToView}
                onDeleteQuest={setQuestToDelete}
              />
            ))}
          </div>
        )}
      </div>

      <QuestModal 
        isOpen={isQuestModalOpen} 
        onClose={() => setIsQuestModalOpen(false)} 
        initialData={editingQuest}
        defaultParentId={parentIdForNew}
        allQuests={quests}
      />
      
      <DetailModal 
        state={detailModalState}
        setState={setDetailModalState}
      />

      {/* Quest Full View Modal */}
      <Modal isOpen={!!questToView} onClose={() => setQuestToView(null)} title={questToView?.title}>
         <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
            {questToView?.image && (
               <div className="w-full aspect-video sm:aspect-[21/9] bg-cover bg-center border border-dm-border rounded-sm shrink-0" style={{ backgroundImage: `url(${questToView.image})` }} />
            )}
            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest flex-wrap">
               {questToView?.location && (
                  <span className="flex items-center text-dm-accent bg-dm-bg-hover border border-dm-border px-3 py-1 rounded-sm">
                    <MapPin size={14} className="mr-2" /> {questToView.location}
                  </span>
               )}
               {questToView?.status === "completed" && <span className="text-green-500 flex items-center"><CheckCircle2 size={16} className="mr-1"/> Completada</span>}
               {questToView?.status === "failed" && <span className="text-red-500 flex items-center"><XCircle size={16} className="mr-1"/> Fallada</span>}
               {questToView?.status === "active" && <span className="text-dm-muted flex items-center"><Circle size={16} className="mr-1"/> Activa</span>}
            </div>

            {questToView?.reward && (
               <div className="bg-dm-bg-alt border border-dm-border p-3 rounded-sm flex flex-col gap-1">
                 <span className="text-[10px] text-dm-muted font-bold uppercase tracking-wider">Recompensa</span>
                 <span className="text-dm-accent font-medium">{questToView.reward}</span>
               </div>
            )}

            <div className="bg-dm-bg-alt border border-dm-border p-4 rounded-sm whitespace-pre-wrap text-dm-text leading-relaxed">
               {questToView?.description || <span className="italic opacity-50">Sin descripción...</span>}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setQuestToView(null)}>Cerrar</Button>
            </div>
         </div>
      </Modal>

      <ConfirmDeleteModal 
        isOpen={!!questToDelete}
        onClose={() => setQuestToDelete(null)}
        onConfirm={() => {
          if (questToDelete) actions.deleteQuest(questToDelete.id);
        }}
        title="Eliminar Misión"
        message="¿Estás seguro de que quieres eliminar esta misión? Si tiene misiones derivadas, estas quedarán huérfanas (como misiones raíz)."
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

function HorizontalQuestTree({ quest, onAddSubQuest, onEditQuest, onAddDetail, onViewDetail, onViewQuest, onDeleteQuest, highlightedQuestId }: { 
  quest: Quest, 
  onAddSubQuest: (id: string) => void,
  onEditQuest: (q: Quest) => void,
  onAddDetail: (qId: string) => void,
  onViewDetail: (qId: string, d: QuestDetail) => void,
  onViewQuest: (q: Quest) => void,
  onDeleteQuest: (q: Quest) => void,
  highlightedQuestId?: string
}) {
  const quests = useStore((state) => state.quests);
  const children = quests.filter(q => q.parentId === quest.id).sort((a,b) => a.createdAt - b.createdAt);
  const [expanded, setExpanded] = useState(true);
  const nodeRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (highlightedQuestId === quest.id && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [highlightedQuestId, quest.id]);

  const toggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextStatus: QuestStatus = "active";
    if (quest.status === "active") nextStatus = "completed";
    else if (quest.status === "completed") nextStatus = "failed";
    else nextStatus = "active";
    actions.updateQuest(quest.id, { status: nextStatus });
  };

  const getStatusIcon = () => {
    if (quest.status === "completed") return <CheckCircle2 size={20} className="text-green-500" />;
    if (quest.status === "failed") return <XCircle size={20} className="text-red-500" />;
    return <Circle size={20} className="text-dm-muted hover:text-dm-accent transition-colors" />;
  };

  return (
    <div className="flex items-center group/tree">
      <div className="relative z-10 shrink-0">
        <div 
          ref={nodeRef}
          onClick={() => onViewQuest(quest)}
          className={cn(
          "w-[340px] flex flex-col bg-dm-bg border rounded-sm overflow-hidden shrink-0 transition-colors shadow-lg cursor-pointer hover:border-dm-accent",
          quest.status === "completed" ? "border-green-900/50" :
          quest.status === "failed" ? "border-red-900/50" : "border-dm-border",
          highlightedQuestId === quest.id ? "ring-2 ring-dm-accent ring-offset-2 ring-offset-dm-bg-alt shadow-[0_0_15px_rgba(193,160,99,0.5)]" : ""
        )}>
          {quest.image && (
            <div className="w-full h-24 bg-black relative border-b border-dm-accent/10">
              <img src={quest.image} className="w-full h-full object-cover opacity-60 group-hover/tree:opacity-80 transition-opacity" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-dm-bg to-transparent" />
            </div>
          )}
          
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
               <button onClick={toggleStatus} className="mt-1 hover:scale-110 transition-transform shrink-0 z-10" title="Cambiar Estado">
                 {getStatusIcon()}
               </button>
               <div className="flex-1 min-w-0">
                 <h3 className={cn("text-sm font-bold truncate leading-tight uppercase tracking-wider", 
                    quest.status === "completed" ? "text-green-400 line-through decoration-green-900" :
                    quest.status === "failed" ? "text-red-400 line-through decoration-red-900" :
                    "text-dm-text-bright"
                 )} title={quest.title}>
                   {quest.title}
                 </h3>
                 {quest.location && (
                   <div className="flex items-center text-[10px] text-dm-accent uppercase tracking-wider mt-1 font-bold truncate">
                     <MapPin size={10} className="mr-1 shrink-0" /> {quest.location}
                   </div>
                 )}
               </div>
            </div>

            {quest.description && (
              <p className="text-xs text-dm-text opacity-70 line-clamp-2 leading-relaxed" title="Click para ver completa">
                {quest.description}
              </p>
            )}

            {quest.reward && (
               <div className="text-xs border border-dm-border bg-dm-bg-alt px-2 py-1.5 rounded-sm flex flex-col mt-1">
                 <span className="text-dm-muted text-[9px] font-bold uppercase tracking-wider mb-0.5">Recompensa</span>
                 <span className="text-dm-accent font-medium truncate">{quest.reward}</span>
               </div>
            )}

            <div className="mt-2 flex flex-col gap-2 border-t border-dm-border pt-3 z-10" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-dm-muted uppercase tracking-widest">Detalles y Notas</span>
                 <button onClick={() => onAddDetail(quest.id)} className="text-dm-accent hover:text-dm-text-bright bg-dm-bg-alt border border-dm-border rounded-sm px-2 py-1 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                   <Plus size={10} /> Añadir
                 </button>
               </div>
               
               {quest.details && quest.details.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   {quest.details.map(d => (
                     <button 
                       key={d.id}
                       onClick={() => onViewDetail(quest.id, d)}
                       className="flex items-center gap-1 text-[10px] font-bold bg-dm-bg-alt border border-dm-border text-dm-text hover:border-dm-accent hover:text-dm-accent px-2 py-1 rounded-sm transition-colors max-w-full"
                     >
                       <FileText size={10} className="shrink-0 text-dm-muted" />
                       <span className="truncate max-w-[120px]">{d.name}</span>
                     </button>
                   ))}
                 </div>
               )}
            </div>
          </div>

          <div className="flex items-center bg-dm-bg-alt border-t border-dm-border z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => onAddSubQuest(quest.id)} className="flex-1 p-2 text-[10px] text-dm-muted font-bold uppercase tracking-wider hover:text-dm-text-bright hover:bg-dm-bg transition-all border-r border-dm-border flex items-center justify-center gap-1" title="Añadir Sub-misión">
              <Plus size={12} /> Ramificar
            </button>
            <button onClick={() => onEditQuest(quest)} className="px-4 py-2 text-dm-muted hover:text-dm-accent hover:bg-dm-bg transition-all border-r border-dm-border" title="Editar Misión">
              <Edit2 size={14} />
            </button>
            <button onClick={() => onDeleteQuest(quest)} className="px-4 py-2 text-dm-muted hover:text-red-400 hover:bg-dm-bg transition-all" title="Eliminar Misión">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-dm-bg border border-dm-border text-dm-accent flex items-center justify-center hover:bg-[#2a2420] transition-colors z-20 shadow-sm"
          >
            {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && children.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center overflow-hidden shrink-0"
          >
             <div className="w-8 h-[2px] bg-dm-border shrink-0" />
             
             <div className="flex flex-col gap-6 shrink-0 relative">
               {children.map((child, index) => (
                 <div key={child.id} className="flex items-center relative pl-8">
                   <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-[2px] bg-dm-border" />
                   {index !== 0 && (
                     <div className="absolute left-0 bottom-1/2 w-[2px] h-[calc(50%+12px)] bg-dm-border" />
                   )}
                   {index !== children.length - 1 && (
                     <div className="absolute left-0 top-1/2 w-[2px] h-[calc(50%+12px)] bg-dm-border" />
                   )}
                    <HorizontalQuestTree 
                       quest={child}
                       highlightedQuestId={highlightedQuestId} 
                       onAddSubQuest={onAddSubQuest}
                       onEditQuest={onEditQuest}
                       onAddDetail={onAddDetail}
                       onViewDetail={onViewDetail}
                       onViewQuest={onViewQuest}
                       onDeleteQuest={onDeleteQuest}
                    />
                 </div>
               ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestModal({ isOpen, onClose, initialData, defaultParentId, allQuests }: { isOpen: boolean, onClose: () => void, initialData: Quest | null, defaultParentId: string | null, allQuests: Quest[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [reward, setReward] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [image, setImage] = useState<string>("");

  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || "");
      setDescription(initialData?.description || "");
      setLocation(initialData?.location || "");
      setReward(initialData?.reward || "");
      setParentId(initialData ? (initialData.parentId || "") : (defaultParentId || ""));
      setImage(initialData?.image || "");
    }
  }, [isOpen, initialData, defaultParentId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800);
        setImage(compressed);
      } catch (err) {
        alert("Error procesando la imagen.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data = {
      title,
      description,
      location,
      reward,
      parentId: parentId || null,
      image,
      status: initialData?.status || "active" as QuestStatus,
      details: initialData?.details || []
    };

    if (initialData) {
      actions.updateQuest(initialData.id, data);
    } else {
      actions.addQuest(data);
    }
    onClose();
  };

  const availableParents = allQuests.filter(q => q.id !== initialData?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Misión" : "Nueva Misión"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex justify-center mb-4">
          <div className="relative w-full h-40 bg-dm-bg-alt border border-dm-border border-dashed flex items-center justify-center overflow-hidden rounded-sm group hover:border-dm-accent transition-colors cursor-pointer">
            {image ? (
              <img src={image} alt="Quest" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
            ) : (
              <div className="text-dm-muted flex flex-col items-center group-hover:text-dm-accent transition-colors">
                <UploadIcon size={24} className="mb-2" />
                <span className="text-xs uppercase tracking-widest font-bold">Añadir Imagen (Opcional)</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {image && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-dm-bg-alt/80 px-3 py-1 text-white text-xs uppercase tracking-widest font-bold rounded-sm backdrop-blur-sm">Cambiar</span>
              </div>
            )}
          </div>
        </div>

        <Input label="Título de la Misión" value={title} onChange={e => setTitle(e.target.value)} required />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Lugar (Opcional)" value={location} onChange={e => setLocation(e.target.value)} />
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Misión Anterior (Rama)</label>
            <select 
              value={parentId} 
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-10 w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright focus:outline-none focus:border-dm-accent"
            >
              <option value="">(Ninguna - Nueva Misión)</option>
              {availableParents.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full">
          <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Descripción</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex min-h-[100px] w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright placeholder:text-dm-muted focus:outline-none focus:border-dm-accent resize-y custom-scrollbar"
          />
        </div>

        <Input label="Recompensa (Opcional)" value={reward} onChange={e => setReward(e.target.value)} />

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose} className="border border-dm-border">Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function DetailModal({ 
  state, 
  setState 
}: { 
  state: { mode: "add" | "view" | "edit" | null, questId: string | null, detail: QuestDetail | null },
  setState: (s: any) => void
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const quests = useStore((state) => state.quests);

  React.useEffect(() => {
     if (state.mode === "add") {
       setName("");
       setDescription("");
     } else if (state.detail) {
       setName(state.detail.name);
       setDescription(state.detail.description);
     }
  }, [state.mode, state.detail]);

  const close = () => setState({ mode: null, questId: null, detail: null });

  if (!state.mode || !state.questId) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const q = quests.find(x => x.id === state.questId);
    if (!q) return;

    const currentDetails = q.details || [];
    if (state.mode === "add") {
       const newDetail: QuestDetail = { id: uuidv4(), name, description, createdAt: Date.now() };
       actions.updateQuest(state.questId, { details: [...currentDetails, newDetail] });
    } else if (state.mode === "edit" && state.detail) {
       const newDetails = currentDetails.map(d => d.id === state.detail!.id ? { ...d, name, description } : d);
       actions.updateQuest(state.questId, { details: newDetails });
    }
    close();
  };

  const handleDelete = () => {
     if (!state.detail) return;
     if (!confirm("¿Eliminar este detalle?")) return;
     const q = quests.find(x => x.id === state.questId);
     if (!q) return;
     const newDetails = (q.details || []).filter(d => d.id !== state.detail!.id);
     actions.updateQuest(state.questId, { details: newDetails });
     close();
  };

  return (
    <Modal isOpen={!!state.mode} onClose={close} title={state.mode === "add" ? "Nuevo Detalle" : state.mode === "edit" ? "Editar Detalle" : "Detalle"}>
      {state.mode === "view" ? (
         <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-dm-accent uppercase tracking-widest">{state.detail?.name}</h3>
            <div className="bg-dm-bg-alt border border-dm-border p-4 rounded-sm">
               <p className="text-sm text-dm-text whitespace-pre-wrap leading-relaxed opacity-90">{state.detail?.description}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
               <Button variant="ghost" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">Eliminar</Button>
               <Button variant="ghost" onClick={() => setState({ ...state, mode: "edit" })} className="border border-dm-border">Editar</Button>
               <Button onClick={close}>Cerrar</Button>
            </div>
         </div>
      ) : (
         <form onSubmit={handleSave} className="flex flex-col gap-4">
            <Input label="Título (Ej: Nota, Pista, Recompensa extra)" value={name} onChange={e => setName(e.target.value)} required />
            <div className="flex flex-col gap-1 w-full">
              <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Descripción</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="flex min-h-[150px] w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright placeholder:text-dm-muted focus:outline-none focus:border-dm-accent resize-y custom-scrollbar"
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
              <Button type="button" variant="ghost" onClick={close} className="border border-dm-border">Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
         </form>
      )}
    </Modal>
  )
}
