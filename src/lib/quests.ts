import type { Quest } from "../types";

/** The quest tree, built once per change of `quests` so nodes never scan the whole list. */
export type QuestForest = {
  roots: Quest[];
  /** Children of each quest, oldest first. */
  children: Map<string, Quest[]>;
  byId: Map<string, Quest>;
  /** Completed / failed / total among each quest's descendants (the quest itself not included). */
  stats: Map<string, BranchStats>;
};

export type BranchStats = { total: number; completed: number; failed: number };

const NO_CHILDREN: Quest[] = [];

/**
 * Builds the tree. Quests whose parent no longer exists become roots. A quest caught in a parent
 * cycle (only possible with hand-edited imports) is promoted to root and its link is cut, so
 * every quest is shown exactly once and rendering never loops.
 */
export function buildQuestForest(quests: Quest[]): QuestForest {
  const sorted = [...quests].sort((a, b) => a.createdAt - b.createdAt);
  const byId = new Map(sorted.map((q) => [q.id, q]));
  const children = new Map<string, Quest[]>();
  const roots: Quest[] = [];

  for (const q of sorted) {
    if (q.parentId && q.parentId !== q.id && byId.has(q.parentId)) {
      const list = children.get(q.parentId);
      if (list) list.push(q);
      else children.set(q.parentId, [q]);
    } else {
      roots.push(q);
    }
  }

  const reached = new Set<string>();
  const reach = (id: string) => {
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      if (reached.has(cur)) continue;
      reached.add(cur);
      for (const c of children.get(cur) ?? NO_CHILDREN) stack.push(c.id);
    }
  };
  roots.forEach((r) => reach(r.id));
  for (const q of sorted) {
    if (reached.has(q.id)) continue;
    const siblings = children.get(q.parentId!);
    if (siblings) children.set(q.parentId!, siblings.filter((s) => s.id !== q.id));
    roots.push(q);
    reach(q.id);
  }

  const stats = new Map<string, BranchStats>();
  const count = (q: Quest): BranchStats => {
    const s: BranchStats = { total: 0, completed: 0, failed: 0 };
    for (const c of children.get(q.id) ?? NO_CHILDREN) {
      const cs = count(c);
      s.total += 1 + cs.total;
      s.completed += (c.status === "completed" ? 1 : 0) + cs.completed;
      s.failed += (c.status === "failed" ? 1 : 0) + cs.failed;
    }
    stats.set(q.id, s);
    return s;
  };
  roots.forEach(count);

  return { roots, children, byId, stats };
}

export function childrenOf(forest: QuestForest, id: string): Quest[] {
  return forest.children.get(id) ?? NO_CHILDREN;
}

/** Ids of every quest above `id`, nearest first. */
export function ancestorIds(forest: QuestForest, id: string): string[] {
  const out: string[] = [];
  const seen = new Set([id]);
  let cur = forest.byId.get(id);
  while (cur?.parentId && forest.byId.has(cur.parentId) && !seen.has(cur.parentId)) {
    out.push(cur.parentId);
    seen.add(cur.parentId);
    cur = forest.byId.get(cur.parentId);
  }
  return out;
}

/** Ids of every quest below `id`. */
export function descendantIds(forest: QuestForest, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...childrenOf(forest, id)];
  while (stack.length) {
    const q = stack.pop()!;
    if (out.has(q.id)) continue;
    out.add(q.id);
    stack.push(...childrenOf(forest, q.id));
  }
  return out;
}

/** Every quest in tree order (parents before children) with its depth, for indented pickers. */
export function flattenForest(forest: QuestForest): { quest: Quest; depth: number }[] {
  const out: { quest: Quest; depth: number }[] = [];
  const walk = (q: Quest, depth: number) => {
    out.push({ quest: q, depth });
    childrenOf(forest, q.id).forEach((c) => walk(c, depth + 1));
  };
  forest.roots.forEach((r) => walk(r, 0));
  return out;
}

/** Markdown reduced to one line of plain text, for card excerpts. */
export function plainExcerpt(markdown: string | undefined): string {
  if (!markdown) return "";
  return markdown
    .replace(/^\s*\|.*\|\s*$/gm, " ") // tables
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]\s+\[[ xX]\]|[-*+]|\d+[.)])\s+/gm, "") // headings, quotes, lists
    .replace(/(\*\*|__|\*|_|~~|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
