import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Minus, Plus, Target, ZoomIn } from "lucide-react";
import { useStore, actions } from "../store/useStore";
import type { Quest, QuestStatus } from "../types";
import { cn, downloadJSON } from "../lib/utils";
import { ancestorIds, buildQuestForest } from "../lib/quests";
import { focusSearchResult } from "../lib/searchFocus";
import { useTabReselect } from "../lib/tabReselect";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { QuestTree } from "../components/quests/QuestTree";
import { QuestPanel } from "../components/quests/QuestPanel";
import { QuestEditor } from "../components/quests/QuestEditor";
import { QUEST_STATUS, QUEST_STATUSES, questStatus } from "../components/quests/questUi";

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1];
const NO_IDS: string[] = [];

export function ViewQuests() {
  const quests = useStore((s) => s.quests);
  const highlightedQuestId = useStore((s) => s.uiState.highlightedQuestId);
  const collapsedIds = useStore((s) => s.uiState.collapsedQuests) ?? NO_IDS;
  const filter = useStore((s) => s.uiState.questStatusFilter);
  const zoom = useStore((s) => s.uiState.questsZoom) ?? 1;

  const forest = useMemo(() => buildQuestForest(quests), [quests]);
  const collapsed = useMemo(() => new Set(collapsedIds), [collapsedIds]);
  const counts = useMemo(() => {
    const c: Record<QuestStatus, number> = { active: 0, completed: 0, failed: 0 };
    quests.forEach((q) => c[questStatus(q.status)]++);
    return c;
  }, [quests]);
  const parentIds = useMemo(() => [...forest.children.keys()].filter((id) => forest.children.get(id)!.length > 0), [forest]);
  const anyCollapsed = parentIds.some((id) => collapsed.has(id));

  const [openId, setOpenId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ quest: Quest | null; parentId: string | null } | null>(null);
  const [toDelete, setToDelete] = useState<Quest | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // From the global search: unfold the branch that hides the quest, then scroll to it and flash it.
  useEffect(() => {
    if (!highlightedQuestId) return;
    actions.updateUI({ highlightedQuestId: undefined });
    if (!forest.byId.has(highlightedQuestId)) return;
    const hidden = ancestorIds(forest, highlightedQuestId).filter((id) => collapsed.has(id));
    if (hidden.length) actions.setQuestsCollapsed(hidden, false);
    focusSearchResult(highlightedQuestId);
  }, [highlightedQuestId, forest, collapsed]);

  useTabReselect("quests", () => {
    setOpenId(null);
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });

  const openEditor = useCallback((quest: Quest | null, parentId: string | null) => setEditor({ quest, parentId }), []);
  const onBranch = useCallback((parentId: string) => openEditor(null, parentId), [openEditor]);
  const onEdit = useCallback((quest: Quest) => openEditor(quest, quest.parentId), [openEditor]);
  const closePanel = useCallback(() => setOpenId(null), []);

  const setZoom = (dir: 1 | -1) => {
    const i = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i === -1 ? ZOOM_STEPS.length - 1 : i) + dir))];
    actions.updateUI({ questsZoom: next });
  };

  const pan = usePan(scrollRef);
  const toDeleteKids = toDelete ? (forest.children.get(toDelete.id)?.length ?? 0) : 0;
  const toDeleteParent = toDelete?.parentId ? forest.byId.get(toDelete.parentId) : undefined;

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
            <ToolbarButton icon={Plus} label="Nueva Misión" shortLabel="Nueva" variant="primary" showLabel="always" onClick={() => openEditor(null, null)} />
          </>
        }
      >
        {quests.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] -my-1 py-1" role="group" aria-label="Resaltar por estado">
              <FilterChip active={!filter} onClick={() => actions.updateUI({ questStatusFilter: undefined })}>
                Todas <span className="opacity-70">{quests.length}</span>
              </FilterChip>
              {QUEST_STATUSES.map((s) => {
                const meta = QUEST_STATUS[s];
                const Icon = meta.icon;
                return (
                  <FilterChip key={s} active={filter === s} onClick={() => actions.updateUI({ questStatusFilter: filter === s ? undefined : s })} title={`Resaltar las misiones ${meta.plural.toLowerCase()}`}>
                    <Icon size={13} className={cn(filter !== s && meta.text)} /> {meta.plural} <span className="opacity-70">{counts[s]}</span>
                  </FilterChip>
                );
              })}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {parentIds.length > 0 && (
                <ToolbarButton
                  icon={anyCollapsed ? ChevronsUpDown : ChevronsDownUp}
                  label={anyCollapsed ? "Desplegar todo" : "Plegar todo"}
                  onClick={() => actions.setQuestsCollapsed(parentIds, !anyCollapsed)}
                />
              )}
              <div className="hidden md:flex items-center border border-dm-border bg-dm-bg-hover h-9" role="group" aria-label="Zoom del árbol">
                <button type="button" onClick={() => setZoom(-1)} disabled={zoom <= ZOOM_STEPS[0]} className="h-full px-2 text-dm-muted hover:text-dm-accent disabled:opacity-40 transition-colors" title="Alejar" aria-label="Alejar">
                  <Minus size={14} />
                </button>
                <button type="button" onClick={() => actions.updateUI({ questsZoom: 1 })} className="h-full px-1 min-w-12 text-[11px] tabular-nums text-dm-muted hover:text-dm-accent transition-colors flex items-center justify-center gap-1" title="Tamaño normal">
                  {zoom === 1 ? <ZoomIn size={13} /> : null}{Math.round(zoom * 100)}%
                </button>
                <button type="button" onClick={() => setZoom(1)} disabled={zoom >= 1} className="h-full px-2 text-dm-muted hover:text-dm-accent disabled:opacity-40 transition-colors" title="Acercar" aria-label="Acercar">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </ViewHeader>

      <div ref={scrollRef} {...pan} className="flex-1 overflow-auto custom-scrollbar relative md:cursor-grab md:data-[panning]:cursor-grabbing md:data-[panning]:select-none">
        {forest.roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dm-muted space-y-4 text-center px-4">
            <Target size={48} className="opacity-50" />
            <p className="max-w-sm opacity-70">No hay misiones todavía. Crea la primera trama y ve ramificándola a medida que el grupo tome decisiones.</p>
            <ToolbarButton icon={Plus} label="Crear la primera misión" variant="primary" showLabel="always" onClick={() => openEditor(null, null)} />
          </div>
        ) : (
          <div className="p-3 pt-5 sm:p-8 pb-32 md:w-max md:min-w-full" style={zoom !== 1 ? { zoom } : undefined}>
            <QuestTree
              roots={forest.roots}
              forest={forest}
              collapsed={collapsed}
              filter={filter}
              onOpen={setOpenId}
              onBranch={onBranch}
              onEdit={onEdit}
              onDelete={setToDelete}
            />
          </div>
        )}
      </div>

      <QuestPanel
        questId={openId}
        forest={forest}
        onNavigate={setOpenId}
        onClose={closePanel}
        onEdit={onEdit}
        onBranch={onBranch}
        onDelete={setToDelete}
      />

      <QuestEditor
        isOpen={!!editor}
        quest={editor?.quest ?? null}
        defaultParentId={editor?.parentId ?? null}
        forest={forest}
        onClose={() => setEditor(null)}
        onSaved={(id) => {
          // A new quest opened from the panel replaces it; otherwise it gets a flash in the tree.
          if (openId && !editor?.quest) setOpenId(id);
          else if (!openId) focusSearchResult(id);
        }}
      />

      <ConfirmDeleteModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) actions.deleteQuest(toDelete.id);
        }}
        title="Eliminar Misión"
        message={
          toDelete
            ? `¿Eliminar «${toDelete.title}» con sus detalles?` +
              (toDeleteKids
                ? toDeleteParent
                  ? ` Sus ${toDeleteKids === 1 ? "submisión pasará" : `${toDeleteKids} submisiones pasarán`} a colgar de «${toDeleteParent.title}».`
                  : ` Sus ${toDeleteKids === 1 ? "submisión quedará" : `${toDeleteKids} submisiones quedarán`} como tramas sueltas.`
                : "")
            : undefined
        }
      />
    </div>
  );
}

function FilterChip({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-1.5 h-8 px-2.5 border rounded-sm text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors",
        active ? "border-dm-accent bg-dm-accent text-dm-bg-darker font-bold" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Drag the empty canvas with the mouse to move around a wide tree (touch already scrolls
 * natively). Drags that start on a card or a control are left alone.
 */
function usePan(ref: React.RefObject<HTMLDivElement | null>) {
  const drag = useRef<{ x: number; y: number; left: number; top: number; id: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("[data-search-id], button, a, input, textarea")) return;
      if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return;
      drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.dataset.panning = "";
      e.preventDefault();
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      const d = drag.current;
      if (!el || !d || d.id !== e.pointerId) return;
      el.scrollLeft = d.left - (e.clientX - d.x);
      el.scrollTop = d.top - (e.clientY - d.y);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!drag.current || drag.current.id !== e.pointerId) return;
      drag.current = null;
      if (el) delete el.dataset.panning;
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!drag.current || drag.current.id !== e.pointerId) return;
      drag.current = null;
      if (el) delete el.dataset.panning;
    },
  };
}
