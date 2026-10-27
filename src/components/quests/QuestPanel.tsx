import React, { useEffect, useState } from "react";
import { ChevronDown, CornerLeftUp, Edit2, FileText, GitBranchPlus, MapPin, Plus, Coins, Trash2, Maximize2 } from "lucide-react";
import { actions } from "../../store/useStore";
import type { Quest, QuestDetail } from "../../types";
import { cn } from "../../lib/utils";
import { childrenOf, type QuestForest } from "../../lib/quests";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/Input";
import { Markdown } from "../ui/Markdown";
import { Lightbox } from "../ui/Lightbox";
import { DescriptionEditor } from "../DescriptionEditor";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { v4 as uuidv4 } from "uuid";
import { QUEST_STATUS, QUEST_STATUSES, fieldClass, labelClass, proseClass, questStatus, sectionTitleClass } from "./questUi";

type DetailDraft = { id: string | null; name: string; description: string };

/**
 * Everything about one quest in a single dialog: status, description, details/notes (added and
 * edited in place) and the quests it comes from and leads to, which open in the same dialog.
 */
export function QuestPanel({ questId, forest, onNavigate, onClose, onEdit, onBranch, onDelete }: {
  questId: string | null;
  forest: QuestForest;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onEdit: (quest: Quest) => void;
  onBranch: (parentId: string) => void;
  onDelete: (quest: Quest) => void;
}) {
  const quest = questId ? forest.byId.get(questId) : undefined;
  const [draft, setDraft] = useState<DetailDraft | null>(null);
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
  const [detailToDelete, setDetailToDelete] = useState<QuestDetail | null>(null);
  const [zoomImage, setZoomImage] = useState(false);

  // Each quest starts clean when the panel moves to another one.
  useEffect(() => {
    setDraft(null);
    setOpenDetails(new Set());
  }, [questId]);

  // The quest was deleted (here or by an import) while open.
  useEffect(() => {
    if (questId && !quest) onClose();
  }, [questId, quest, onClose]);

  if (!quest) return null;

  const status = questStatus(quest.status);
  const parent = quest.parentId ? forest.byId.get(quest.parentId) : undefined;
  const kids = childrenOf(forest, quest.id);
  const details = quest.details || [];

  const toggleDetail = (id: string) =>
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    const name = draft.name.trim();
    if (draft.id) {
      actions.updateQuest(quest.id, { details: details.map((d) => (d.id === draft.id ? { ...d, name, description: draft.description } : d)) });
    } else {
      const id = uuidv4();
      actions.updateQuest(quest.id, { details: [...details, { id, name, description: draft.description, createdAt: Date.now() }] });
      setOpenDetails((prev) => new Set(prev).add(id));
    }
    setDraft(null);
  };

  const detailForm = (
    <form onSubmit={saveDraft} className="flex flex-col gap-3 border border-dm-accent/40 bg-dm-bg-alt p-3 rounded-sm">
      <Input
        label="Título (pista, nota, recompensa extra...)"
        value={draft?.name ?? ""}
        onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
        required
        autoFocus
      />
      <DescriptionEditor
        label="Descripción"
        labelClassName={labelClass}
        value={draft?.description ?? ""}
        onChange={(description) => setDraft((d) => d && { ...d, description })}
        textareaClassName={cn(fieldClass, "min-h-28 resize-y")}
        smartLists
      />
      <div className="flex justify-end gap-2 -mt-2">
        <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="border border-dm-border">Cancelar</Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={quest.title}
        className="sm:max-w-3xl"
        headerRight={
          <button type="button" onClick={() => onEdit(quest)} className="p-2 text-dm-muted hover:text-dm-accent transition-colors" title="Editar misión" aria-label="Editar misión">
            <Edit2 size={18} />
          </button>
        }
      >
        <div className="flex flex-col gap-5">
          {quest.image && (
            <button
              type="button"
              onClick={() => setZoomImage(true)}
              className="group relative w-full aspect-video sm:aspect-[21/9] shrink-0 overflow-hidden border border-dm-border rounded-sm bg-black"
              aria-label="Ver imagen completa"
            >
              <img src={quest.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <span className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 can-hover:opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={14} />
              </span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Estado" className="flex gap-1">
              {QUEST_STATUSES.map((s) => {
                const meta = QUEST_STATUS[s];
                const Icon = meta.icon;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => actions.updateQuest(quest.id, { status: s })}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-sm text-[11px] font-bold uppercase tracking-wider transition-colors",
                      status === s ? meta.selected : "border-dm-border text-dm-muted hover:text-dm-text hover:border-dm-border-focus"
                    )}
                  >
                    <Icon size={14} /> {meta.label}
                  </button>
                );
              })}
            </div>
            {quest.location && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dm-accent bg-dm-bg-hover border border-dm-border px-2.5 py-1.5 rounded-sm min-w-0">
                <MapPin size={13} className="shrink-0" /> <span className="truncate">{quest.location}</span>
              </span>
            )}
          </div>

          {parent && (
            <button
              type="button"
              onClick={() => onNavigate(parent.id)}
              className="self-start flex items-center gap-1.5 text-xs text-dm-muted hover:text-dm-accent transition-colors min-w-0 max-w-full"
            >
              <CornerLeftUp size={14} className="shrink-0" /> Viene de: <span className="font-bold truncate">{parent.title}</span>
            </button>
          )}

          {quest.reward && (
            <div className="flex items-start gap-3 bg-dm-accent/5 border border-dm-accent/30 p-3 rounded-sm">
              <Coins size={18} className="text-dm-accent shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className={sectionTitleClass}>Recompensa</div>
                <div className="text-dm-accent font-medium break-words">{quest.reward}</div>
              </div>
            </div>
          )}

          <div className={proseClass}>
            {quest.description ? <Markdown units>{quest.description}</Markdown> : <p className="italic text-dm-muted">Sin descripción.</p>}
          </div>

          {/* Details and notes */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 border-b border-dm-border pb-1.5">
              <h3 className={sectionTitleClass}>Detalles y notas {details.length > 0 && <span className="text-dm-accent">· {details.length}</span>}</h3>
              {!draft && (
                <button type="button" onClick={() => setDraft({ id: null, name: "", description: "" })} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-dm-accent hover:text-dm-text-bright transition-colors">
                  <Plus size={12} /> Añadir
                </button>
              )}
            </div>
            {details.length === 0 && !draft && <p className="text-xs italic text-dm-muted">Pistas, notas o recompensas extra de esta misión.</p>}
            {details.map((d) =>
              draft?.id === d.id ? (
                <React.Fragment key={d.id}>{detailForm}</React.Fragment>
              ) : (
                <div key={d.id} className="border border-dm-border bg-dm-bg-alt/60 rounded-sm">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleDetail(d.id)}
                      aria-expanded={openDetails.has(d.id)}
                      className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 text-left text-sm font-bold text-dm-text-bright hover:text-dm-accent transition-colors"
                    >
                      <FileText size={14} className="text-dm-muted shrink-0" />
                      <span className="truncate">{d.name}</span>
                      <ChevronDown size={14} className={cn("ml-auto shrink-0 text-dm-muted transition-transform", openDetails.has(d.id) && "rotate-180")} />
                    </button>
                    <button type="button" onClick={() => setDraft({ id: d.id, name: d.name, description: d.description || "" })} className="p-2 text-dm-muted hover:text-dm-accent transition-colors" title="Editar detalle" aria-label="Editar detalle">
                      <Edit2 size={13} />
                    </button>
                    <button type="button" onClick={() => setDetailToDelete(d)} className="p-2 pr-2.5 text-dm-muted hover:text-dm-danger transition-colors" title="Eliminar detalle" aria-label="Eliminar detalle">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {openDetails.has(d.id) && (
                    <div className={cn(proseClass, "px-3 pb-3 -mt-1 border-t border-dm-border/50 pt-2")}>
                      {d.description ? <Markdown units>{d.description}</Markdown> : <p className="italic text-dm-muted">Sin descripción.</p>}
                    </div>
                  )}
                </div>
              )
            )}
            {draft && !draft.id && detailForm}
          </section>

          {/* Branches */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 border-b border-dm-border pb-1.5">
              <h3 className={sectionTitleClass}>Ramas {kids.length > 0 && <span className="text-dm-accent">· {kids.length}</span>}</h3>
              <button type="button" onClick={() => onBranch(quest.id)} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-dm-accent hover:text-dm-text-bright transition-colors">
                <GitBranchPlus size={12} /> Ramificar
              </button>
            </div>
            {kids.length === 0 ? (
              <p className="text-xs italic text-dm-muted">Aún no hay misiones que sigan a esta.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-1.5">
                {kids.map((k) => {
                  const meta = QUEST_STATUS[questStatus(k.status)];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => onNavigate(k.id)}
                      className={cn("flex items-center gap-2 px-3 py-2 text-left border border-dm-border border-l-[3px] bg-dm-bg-alt/60 rounded-sm hover:border-dm-accent/60 transition-colors min-w-0", meta.edge)}
                    >
                      <Icon size={14} className={cn("shrink-0", meta.text)} />
                      <span className="text-xs font-bold uppercase tracking-wider text-dm-text-bright truncate">{k.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex justify-between gap-2 pt-4 border-t border-dm-border">
            <Button variant="ghost" onClick={() => onDelete(quest)} className="text-dm-danger hover:text-dm-danger-hover hover:bg-dm-danger/15">
              <Trash2 size={14} className="mr-2" /> Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onEdit(quest)} className="border border-dm-border">
                <Edit2 size={14} className="mr-2" /> Editar
              </Button>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        </div>
      </Modal>

      {quest.image && <Lightbox isOpen={zoomImage} onClose={() => setZoomImage(false)} src={quest.image} title={quest.title} />}

      <ConfirmDeleteModal
        isOpen={!!detailToDelete}
        onClose={() => setDetailToDelete(null)}
        onConfirm={() => {
          if (detailToDelete) actions.updateQuest(quest.id, { details: details.filter((d) => d.id !== detailToDelete.id) });
          setDetailToDelete(null);
        }}
        title="Eliminar Detalle"
        message={`¿Eliminar «${detailToDelete?.name ?? ""}» de esta misión?`}
      />
    </>
  );
}
