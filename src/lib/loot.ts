import { v4 as uuidv4 } from "uuid";
import type { LootEntry, LootTable } from "../types";

export const MAX_WEIGHT = 99;

/** The table's weighted results; old tables (lines only) are grouped: repeated lines add weight. */
export function tableEntries(table: Pick<LootTable, "items" | "entries">): LootEntry[] {
  const items = table.items || [];
  if (table.entries && table.entries.length > 0) {
    // If the lines were edited somewhere that doesn't know about entries (an older version of the
    // app, a hand-edited export), the lines win; entries only lend their ids and item links.
    const key = (lines: string[]) => lines.map((l) => l.trim().toLowerCase()).filter(Boolean).sort().join("\n");
    if (key(entriesToLines(table.entries)) === key(items)) return table.entries;
    return linesToEntries(items, table.entries);
  }
  return linesToEntries(items);
}

/**
 * Lines → entries. Identical lines (ignoring case and spaces at the ends) become one entry whose
 * weight is how many times it appears. Entries that already existed keep their id and item link.
 */
export function linesToEntries(lines: string[], previous: LootEntry[] = []): LootEntry[] {
  const byKey = new Map<string, LootEntry>();
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    const found = byKey.get(key);
    if (found) {
      found.weight = Math.min(MAX_WEIGHT, found.weight + 1);
      continue;
    }
    const old = previous.find((p) => p.text.trim().toLowerCase() === key);
    byKey.set(key, { id: old?.id ?? uuidv4(), text, weight: 1, ...(old?.ref ? { ref: old.ref } : {}) });
  }
  return [...byKey.values()];
}

/** Entries → lines, each repeated by its weight (the classic "write it twice, double the odds"). */
export function entriesToLines(entries: LootEntry[]): string[] {
  return entries.flatMap((e) => Array.from({ length: e.weight }, () => e.text));
}

export function totalWeight(entries: LootEntry[]) {
  return entries.reduce((sum, e) => sum + e.weight, 0);
}

/** Die ranges like the manual's tables: weights 2, 1, 3 → 1–2, 3, 4–6. */
export function entryRanges(entries: LootEntry[]): { from: number; to: number }[] {
  let next = 1;
  return entries.map((e) => {
    const r = { from: next, to: next + e.weight - 1 };
    next += e.weight;
    return r;
  });
}

export function formatRange({ from, to }: { from: number; to: number }) {
  return from === to ? String(from) : `${from}–${to}`;
}

export function formatPercent(part: number, total: number) {
  if (!total) return "0 %";
  const p = (part / total) * 100;
  const digits = p < 10 && p % 1 !== 0 ? 1 : 0;
  return `${p.toFixed(digits).replace(".", ",")} %`;
}

/** Rolls the table's die (d<total weight>) and returns the roll and the entry it lands on. */
export function rollTable(entries: LootEntry[]): { roll: number; index: number } | null {
  const total = totalWeight(entries);
  if (!total) return null;
  const roll = Math.floor(Math.random() * total) + 1;
  const ranges = entryRanges(entries);
  return { roll, index: ranges.findIndex((r) => roll >= r.from && roll <= r.to) };
}

/** What gets saved: the weighted entries plus the expanded lines for compatibility. */
export function tablePayload(entries: LootEntry[]): Pick<LootTable, "entries" | "items"> {
  const clean = entries.filter((e) => e.text.trim()).map((e) => ({ ...e, text: e.text.trim(), weight: Math.max(1, Math.min(MAX_WEIGHT, Math.round(e.weight))) }));
  return { entries: clean, items: entriesToLines(clean) };
}
