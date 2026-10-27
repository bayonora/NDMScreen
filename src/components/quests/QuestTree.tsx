import React, { createContext, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Edit2, GitBranch, GitBranchPlus, Coins, MapPin, ScrollText, Trash2 } from "lucide-react";
import { actions } from "../../store/useStore";
import type { Quest, QuestStatus } from "../../types";
import { cn } from "../../lib/utils";
import { childrenOf, plainExcerpt, type BranchStats, type QuestForest } from "../../lib/quests";
import { QUEST_STATUS, nextQuestStatus, questStatus } from "./questUi";

type TreeContext = {
  forest: QuestForest;
  collapsed: Set<string>;
  /** Quests with another status are dimmed. */
  filter?: QuestStatus;
  onOpen: (id: string) => void;
  onBranch: (parentId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (quest: Quest) => void;
};

const Ctx = createContext<TreeContext | null>(null);

/** The whole forest: one tree per root quest ("trama"). */
export function QuestTree({ roots, ...ctx }: TreeContext & { roots: Quest[] }) {
  return (
    <Ctx.Provider value={ctx}>
      <div className="qt-tree flex flex-col gap-8 md:gap-12">
        {roots.map((root) => (
          <QuestBranch key={root.id} quest={root} isRoot />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function QuestBranch({ quest, isRoot }: { quest: Quest; isRoot?: boolean }) {
  const ctx = useContext(Ctx)!;
  const kids = childrenOf(ctx.forest, quest.id);
  const stats = ctx.forest.stats.get(quest.id);
  const folded = ctx.collapsed.has(quest.id);

  return (
    <div className="flex flex-col md:flex-row md:items-center">
      <div className={cn("relative shrink-0", kids.length > 0 && folded && "max-md:pb-3")}>
        <QuestCard quest={quest} isRoot={isRoot} stats={stats} />
        {kids.length > 0 && (
          <button
            type="button"
            onClick={() => actions.toggleQuestCollapse(quest.id)}
            className={cn(
              "qt-toggle z-10 h-[22px] min-w-[22px] px-1 rounded-full border flex items-center justify-center text-[10px] font-bold shadow-md transition-colors",
              folded
                ? "bg-dm-accent border-dm-accent text-dm-bg-darker hover:bg-dm-accent-hover"
                : "bg-dm-bg-alt border-dm-border text-dm-accent hover:border-dm-accent"
            )}
            title={folded ? `Mostrar ${stats?.total ?? 0} submisiones` : "Plegar submisiones"}
            aria-label={folded ? `Mostrar ${stats?.total ?? 0} submisiones` : "Plegar submisiones"}
            aria-expanded={!folded}
          >
            {folded ? `+${stats?.total ?? 0}` : <ChevronLeft size={13} className="max-md:rotate-90" />}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {kids.length > 0 && !folded && (
          <motion.ul
            key="children"
            className="qt-children shrink-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {kids.map((child) => (
              <li key={child.id} className="qt-child">
                <QuestBranch quest={child} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const iconButton =
  "relative z-10 p-1.5 rounded-sm text-dm-muted hover:text-dm-accent hover:bg-dm-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-dm-accent";

function QuestCard({ quest, isRoot, stats }: { quest: Quest; isRoot?: boolean; stats?: BranchStats }) {
  const { filter, onOpen, onBranch, onEdit, onDelete } = useContext(Ctx)!;
  const status = questStatus(quest.status);
  const meta = QUEST_STATUS[status];
  const StatusIcon = meta.icon;
  const excerpt = useMemo(() => plainExcerpt(quest.description), [quest.description]);
  const detailCount = quest.details?.length ?? 0;
  const dimmed = !!filter && status !== filter;
  const total = stats?.total ?? 0;

  return (
    <div
      data-search-id={quest.id}
      className={cn(
        "group relative w-full md:w-72 flex flex-col bg-dm-bg border border-dm-border border-l-[3px] rounded-md overflow-hidden",
        "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.6)] transition-[border-color,box-shadow,opacity,filter,translate] duration-200",
        "hover:border-dm-accent/60 hover:shadow-[0_8px_28px_-8px_var(--theme-glow)] can-hover:hover:-translate-y-0.5",
        "has-[.qt-open:focus-visible]:ring-2 has-[.qt-open:focus-visible]:ring-dm-accent",
        meta.edge,
        isRoot && "md:w-80 bg-dm-bg-card/60",
        dimmed && "opacity-35 saturate-[.3] hover:opacity-100 hover:saturate-100"
      )}
    >
      {quest.image && (
        <div className={cn("relative shrink-0 bg-black", isRoot ? "h-24" : "h-16")}>
          <img src={quest.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-t from-dm-bg via-dm-bg/30 to-transparent" />
        </div>
      )}

      <div className={cn("flex flex-col gap-2 px-3 pt-2.5 pb-2", quest.image && "-mt-5 relative")}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => actions.updateQuest(quest.id, { status: nextQuestStatus(status) })}
            className={cn("relative z-10 -ml-0.5 mt-px p-0.5 rounded-full shrink-0 transition-transform hover:scale-110 active:scale-95", meta.text)}
            title={`${meta.label}: pulsa para cambiar el estado`}
            aria-label={`Estado: ${meta.label}. Cambiar`}
          >
            <StatusIcon size={18} />
          </button>
          <div className="min-w-0 flex-1">
            {isRoot && <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-dm-muted leading-none mb-1">Trama</div>}
            <h3>
              {/* Stretched button: the whole card opens the quest, the small buttons sit above it. */}
              <button
                type="button"
                onClick={() => onOpen(quest.id)}
                className={cn(
                  "qt-open block w-full text-left cursor-pointer font-bold uppercase tracking-wider leading-snug line-clamp-2 break-words focus:outline-none after:absolute after:inset-0 after:content-['']",
                  isRoot ? "text-sm" : "text-[13px]",
                  status === "completed" && "text-green-400/90",
                  status === "failed" && "text-dm-muted line-through decoration-dm-danger/70",
                  status === "active" && "text-dm-text-bright"
                )}
                title={quest.title}
              >
                {quest.title}
              </button>
            </h3>
            {quest.location && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-dm-accent font-bold uppercase tracking-wider min-w-0">
                <MapPin size={10} className="shrink-0" /> <span className="truncate">{quest.location}</span>
              </p>
            )}
          </div>
        </div>

        {excerpt && <p className="text-xs text-dm-text/70 leading-relaxed line-clamp-2">{excerpt}</p>}

        <div className="flex items-center gap-1.5 min-h-7 text-[10px] text-dm-muted">
          {quest.reward && (
            <span className="flex items-center gap-1 min-w-0 max-w-[45%] text-dm-accent/90" title={`Recompensa: ${quest.reward}`}>
              <Coins size={11} className="shrink-0" /> <span className="truncate">{quest.reward}</span>
            </span>
          )}
          {detailCount > 0 && (
            <span className="flex items-center gap-0.5 shrink-0" title={`${detailCount} ${detailCount === 1 ? "detalle" : "detalles"}`}>
              <ScrollText size={11} /> {detailCount}
            </span>
          )}
          {total > 0 && (
            <span className="flex items-center gap-0.5 shrink-0" title={`${stats!.completed} de ${total} submisiones completadas`}>
              <GitBranch size={11} /> {stats!.completed}/{total}
            </span>
          )}
          <span className="ml-auto -mr-1.5 flex items-center shrink-0 can-hover:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button type="button" className={iconButton} onClick={() => onBranch(quest.id)} title="Ramificar: nueva submisión" aria-label="Ramificar">
              <GitBranchPlus size={14} />
            </button>
            <button type="button" className={iconButton} onClick={() => onEdit(quest)} title="Editar misión" aria-label="Editar misión">
              <Edit2 size={13} />
            </button>
            <button type="button" className={cn(iconButton, "hover:text-dm-danger")} onClick={() => onDelete(quest)} title="Eliminar misión" aria-label="Eliminar misión">
              <Trash2 size={13} />
            </button>
          </span>
        </div>
      </div>

      {total > 0 && (
        <div className="h-[3px] flex bg-dm-bg-darker" aria-hidden>
          <div className="bg-green-500/80 transition-[width] duration-500" style={{ width: `${(stats!.completed / total) * 100}%` }} />
          <div className="bg-dm-danger/80 transition-[width] duration-500" style={{ width: `${(stats!.failed / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
