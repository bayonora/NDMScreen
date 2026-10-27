import { CheckCircle2, Circle, XCircle, type LucideIcon } from "lucide-react";
import type { QuestStatus } from "../../types";

export const QUEST_STATUSES: QuestStatus[] = ["active", "completed", "failed"];

export const QUEST_STATUS: Record<QuestStatus, {
  label: string;
  /** Plural, for the filter chips. */
  plural: string;
  icon: LucideIcon;
  /** Icon / text color. */
  text: string;
  /** Left edge of the tree card. */
  edge: string;
  /** Selected look of the status buttons in the panel and editor. */
  selected: string;
}> = {
  active: {
    label: "Activa",
    plural: "Activas",
    icon: Circle,
    text: "text-dm-accent",
    edge: "border-l-dm-accent",
    selected: "border-dm-accent bg-dm-accent/15 text-dm-accent",
  },
  completed: {
    label: "Completada",
    plural: "Completadas",
    icon: CheckCircle2,
    text: "text-green-500",
    edge: "border-l-green-500",
    selected: "border-green-500 bg-green-500/15 text-green-500",
  },
  failed: {
    label: "Fallida",
    plural: "Fallidas",
    icon: XCircle,
    text: "text-dm-danger",
    edge: "border-l-dm-danger",
    selected: "border-dm-danger bg-dm-danger/15 text-dm-danger",
  },
};

/** Status of quests saved by older versions or hand-edited imports may be missing or unknown. */
export function questStatus(status: string | undefined): QuestStatus {
  return status === "completed" || status === "failed" ? status : "active";
}

/** Activa → Completada → Fallida → Activa (the quick toggle on the tree cards). */
export function nextQuestStatus(status: QuestStatus): QuestStatus {
  return QUEST_STATUSES[(QUEST_STATUSES.indexOf(status) + 1) % QUEST_STATUSES.length];
}

export const labelClass = "text-[10px] font-bold text-dm-accent uppercase tracking-widest";
export const sectionTitleClass = "text-[10px] font-bold text-dm-muted uppercase tracking-widest";
export const fieldClass =
  "w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright placeholder:text-dm-muted placeholder:italic focus:outline-none focus:border-dm-accent custom-scrollbar";
export const proseClass =
  "prose prose-invert prose-sm max-w-none text-dm-text leading-relaxed prose-p:my-2 prose-strong:text-dm-text-bright prose-em:text-dm-text-muted prose-headings:font-display " +
  "prose-table:my-3 prose-table:text-xs prose-th:text-dm-accent prose-th:px-2 prose-td:px-2 prose-td:py-1 [&_table]:block [&_table]:overflow-x-auto [&_table]:border [&_table]:border-dm-border";
