import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, actions } from "../store/useStore";
import { Plus, Target, CheckCircle2, Circle, XCircle, MapPin, Trash2, Edit2, ChevronLeft, ChevronRight, Upload as UploadIcon, FileText, X } from "lucide-react";

import { Modal } from "../components/ui/Modal";
import { Input, Button } from "../components/ui/Input";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { Quest, QuestStatus, QuestDetail } from "../types";
import { cn, compressImage, downloadJSON } from "../lib/utils";
import { v4 as uuidv4 } from "uuid";

export function ViewQuests() {
  const quests = useStore((state) => state.quests);
  const highlightedQuestId = useStore((state) => state.uiState.highlightedQuestId);
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);

  const [detailModalState, setDetailModalState] = useState<{ mode: "add" | "view" | "edit" | null, questId: string | null, detail: QuestDetail | null }>({ mode: null, questId: null, detail: null });
  const [questToView, setQuestToView] = useState<Quest | null>(null);
  const [questToDelete, setQuestToDelete] = useState<Quest | null>(null);

  const rootQuests = useMemo(() => {
    const byCreation = [...quests].sort((a, b) => a.createdAt - b.createdAt);
    const ids = new Set(quests.map(q => q.id));
    const roots = byCreation.filter(q => !q.parentId || !ids.has(q.parentId));

    // Quests caught in a parent cycle are unreachable from any root; promote them so they stay visible.
    const reached = new Set<string>();
    const markReached = (id: string) => {
      if (reached.has(id)) return;
      reached.add(id);
      quests.forEach(q => { if (q.parentId === id) markReached(q.id); });
    };
    roots.forEach(r => markReached(r.id));
    byCreation.forEach(q => {
      if (!reached.has(q.id)) {
        roots.push(q);
        markReached(q.id);
      }
    });
    return roots;
  }, [quests]);


  React.useEffect(() => {
    if (highlightedQuestId) {
      const timer = setTimeout(() => {
        actions.updateUI({ highlightedQuestId: undefined });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedQuestId]);

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

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-dm-bg-alt">
      <ViewHeader
        icon={Target}
        title="Árbol de Misiones"
        shortTitle="Misiones"
        actions={
          <>
            <ImportExportActions
              noun="Misiones"
              onExport={() => downloadJSON(quests, "ndms_misiones.json")}
              parse={arrayOrKey("quests", (q) => !!q && typeof q === "object" && "id" in q && "title" in q)}
              onImport={(items, mode) => actions.importCollection("quests", items, mode)}
              invalidMessage="Archivo inválido o sin misiones."
            />
            <ToolbarButton icon={Plus} label="Nueva Misión" shortLabel="Nueva" variant="primary" showLabel="always" onClick={() => handleAddQuest(null)} />
          </>
        }
      />

      <div className="flex-1 overflow-auto p-3 sm:p-8 custom-scrollbar relative">
        {rootQuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dm-muted opacity-50 space-y-4 text-center px-4">
            <Target size={48} />
            <p>No hay misiones registradas. Crea tu primera misión raíz para empezar tu aventura.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:gap-16 md:min-w-max pb-32">
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
               {questToView?.status === "failed" && <span className="text-dm-danger flex items-center"><XCircle size={16} className="mr-1"/> Fallada</span>}
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
    </div>
  );
}

/**
 * One quest card plus its sub-quests. Below `md` the tree is laid out vertically (children
 * indented under the parent) so it fits a phone; from `md` up it branches horizontally.
 */
function HorizontalQuestTree({ quest, onAddSubQuest, onEditQuest, onAddDetail, onViewDetail, onViewQuest, onDeleteQuest, highlightedQuestId, seenIds = new Set() }: {
  quest: Quest,
  onAddSubQuest: (id: string) => void,
  onEditQuest: (q: Quest) => void,
  onAddDetail: (qId: string) => void,
  onViewDetail: (qId: string, d: QuestDetail) => void,
  onViewQuest: (q: Quest) => void,
  onDeleteQuest: (q: Quest) => void,
  highlightedQuestId?: string,
  seenIds?: Set<string>
}) {
  const quests = useStore((state) => state.quests);

  // Cycle detection logic
  const currentSeenIds = new Set(seenIds);
  currentSeenIds.add(quest.id);

  // Filter out children that would cause a cycle
  const children = quests.filter(q => q.parentId === quest.id && !currentSeenIds.has(q.id)).sort((a,b) => a.createdAt - b.createdAt);

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
    if (quest.status === "failed") return <XCircle size={20} className="text-dm-danger" />;
    return <Circle size={20} className="text-dm-muted hover:text-dm-accent transition-colors" />;
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center group/tree">
      <div className="relative z-10 shrink-0">
        <div
          ref={nodeRef}
          onClick={() => onViewQuest(quest)}
          className={cn(
          "w-full md:w-[340px] flex flex-col bg-dm-bg border rounded-sm overflow-hidden shrink-0 transition-colors shadow-lg cursor-pointer hover:border-dm-accent",
          quest.status === "completed" ? "border-green-900/50" :
          quest.status === "failed" ? "border-dm-danger/50" : "border-dm-border",
          highlightedQuestId === quest.id ? "ring-2 ring-dm-accent ring-offset-2 ring-offset-dm-bg-alt shadow-[0_0_15px_var(--theme-glow)]" : ""
        )}>
          {quest.image && (
            <div className="w-full h-24 bg-black relative border-b border-dm-accent/10">
              <img src={quest.image} className="w-full h-full object-cover opacity-60 group-hover/tree:opacity-80 transition-opacity" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-dm-bg to-transparent" />
            </div>
          )}

          <div className="p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
               <button type="button" onClick={toggleStatus} className="mt-1 hover:scale-110 transition-transform shrink-0 z-10" title="Cambiar Estado" aria-label="Cambiar Estado">
                 {getStatusIcon()}
               </button>
               <div className="flex-1 min-w-0">
                 <h3 className={cn("text-sm font-bold truncate leading-tight uppercase tracking-wider",
                    quest.status === "completed" ? "text-green-400 line-through decoration-green-900" :
                    quest.status === "failed" ? "text-dm-danger line-through" :
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
                 <button type="button" onClick={() => onAddDetail(quest.id)} className="text-dm-accent hover:text-dm-text-bright bg-dm-bg-alt border border-dm-border rounded-sm px-2 py-1 transition-colors flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider">
                   <Plus size={10} /> Añadir
                 </button>
               </div>

               {quest.details && quest.details.length > 0 && (
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   {quest.details.map(d => (
                     <button
                       type="button"
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
            <button type="button" onClick={() => onAddSubQuest(quest.id)} className="flex-1 p-2.5 text-[10px] text-dm-muted font-bold uppercase tracking-wider hover:text-dm-text-bright hover:bg-dm-bg transition-all border-r border-dm-border flex items-center justify-center gap-1" title="Añadir Sub-misión">
              <Plus size={12} /> Ramificar
            </button>
            <button type="button" onClick={() => onEditQuest(quest)} className="px-4 py-2.5 text-dm-muted hover:text-dm-accent hover:bg-dm-bg transition-all border-r border-dm-border" title="Editar Misión" aria-label="Editar Misión">
              <Edit2 size={14} />
            </button>
            <button type="button" onClick={() => onDeleteQuest(quest)} className="px-4 py-2.5 text-dm-muted hover:text-dm-danger hover:bg-dm-bg transition-all" title="Eliminar Misión" aria-label="Eliminar Misión">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="absolute left-1/2 -bottom-3 -translate-x-1/2 md:left-auto md:bottom-auto md:translate-x-0 md:-right-3 md:top-1/2 md:-translate-y-1/2 w-6 h-6 rounded-full bg-dm-bg-alt border border-dm-border text-dm-accent flex items-center justify-center hover:bg-dm-bg transition-colors z-20 shadow-md"
            title={expanded ? "Ocultar submisiones" : "Mostrar submisiones"}
            aria-label={expanded ? "Ocultar submisiones" : "Mostrar submisiones"}
            aria-expanded={expanded}
          >
            {/* Points left/right on wide screens, up/down when the tree is vertical. */}
            {expanded ? <ChevronLeft size={14} className="rotate-90 md:rotate-0" /> : <ChevronRight size={14} className="rotate-90 md:rotate-0" />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && children.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center shrink-0 pt-4 md:pt-0"
          >
             <div className="hidden md:block w-8 h-[2px] bg-dm-border shrink-0" />

             <div className="flex flex-col shrink-0 relative w-full md:w-auto ml-3 pl-3 border-l-2 border-dm-border md:ml-0 md:pl-0 md:border-l-0 gap-3 md:gap-0">
               {children.map((child, index) => (
                 <div key={child.id} className="flex items-center relative md:pl-8 md:py-3">
                   <svg className="hidden md:block absolute left-0 top-0 w-8 h-full pointer-events-none text-dm-border" preserveAspectRatio="none">
                     {/* Horizontal line to child */}
                     <line x1="0" y1="50%" x2="32" y2="50%" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                     {/* Vertical line UP to previous child */}
                     {index !== 0 && (
                       <line x1="1" y1="0" x2="1" y2="50%" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                     )}
                     {/* Vertical line DOWN to next child */}
                     {index !== children.length - 1 && (
                       <line x1="1" y1="50%" x2="1" y2="100%" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                     )}
                   </svg>
                   <div className="w-full md:w-auto">
                    <HorizontalQuestTree
                       quest={child}
                       highlightedQuestId={highlightedQuestId}
                       onAddSubQuest={onAddSubQuest}
                       onEditQuest={onEditQuest}
                       onAddDetail={onAddDetail}
                       onViewDetail={onViewDetail}
                       onViewQuest={onViewQuest}
                       onDeleteQuest={onDeleteQuest}
                       seenIds={currentSeenIds}
                    />
                   </div>
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

  // A quest can't hang from itself or from any of its descendants (that would create a cycle).
  const descendantIds = useMemo(() => {
    const ids = new Set<string>();
    if (!initialData) return ids;
    const collect = (id: string) => {
      allQuests.forEach(q => {
        if (q.parentId === id && !ids.has(q.id)) {
          ids.add(q.id);
          collect(q.id);
        }
      });
    };
    collect(initialData.id);
    return ids;
  }, [allQuests, initialData]);
  const availableParents = allQuests.filter(q => q.id !== initialData?.id && !descendantIds.has(q.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={initialData ? "Editar Misión" : "Nueva Misión"}>
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
              <>
                <div className="absolute inset-0 flex items-center justify-center can-hover:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="bg-dm-bg-alt/80 px-3 py-1 text-dm-text-bright text-xs uppercase tracking-widest font-bold rounded-sm backdrop-blur-sm">Cambiar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 rounded-full text-dm-danger hover:bg-black"
                  title="Quitar imagen"
                  aria-label="Quitar imagen"
                >
                  <X size={14} />
                </button>
              </>
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
  const [showConfirm, setShowConfirm] = useState(false);
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
     setShowConfirm(true);
  };
  
  const confirmDelete = () => {
     if (!state.detail) return;
     const q = quests.find(x => x.id === state.questId);
     if (!q) return;
     const newDetails = (q.details || []).filter(d => d.id !== state.detail.id);
     actions.updateQuest(state.questId, { details: newDetails });
     setShowConfirm(false);
     close();
  };

  return (
    <>
    <Modal isOpen={!!state.mode} onClose={close} title={state.mode === "add" ? "Nuevo Detalle" : state.mode === "edit" ? "Editar Detalle" : "Detalle"}>
      {state.mode === "view" ? (
         <div className="flex flex-col gap-4">
            <h3 className="text-xl font-bold text-dm-accent uppercase tracking-widest">{state.detail?.name}</h3>
            <div className="bg-dm-bg-alt border border-dm-border p-4 rounded-sm">
               <p className="text-sm text-dm-text whitespace-pre-wrap leading-relaxed opacity-90">{state.detail?.description}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
               <Button variant="ghost" onClick={handleDelete} className="text-dm-danger hover:text-dm-danger-hover hover:bg-dm-danger/20">Eliminar</Button>
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
    <ConfirmDeleteModal
       isOpen={showConfirm}
       onClose={() => setShowConfirm(false)}
       onConfirm={confirmDelete}
       title="Eliminar Detalle"
       message="¿Estás seguro de que quieres eliminar este detalle?"
    />
    </>
  )
}
