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

// ------------------------------------------------------------------ chances (%) → die faces

export const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];
/** How far (in percentage points) the die may stray from the typed chances in automatic mode. */
const AUTO_TOLERANCE = 1;

/** Splits `n` faces by the given chances (largest remainder), giving each result at least 1 face. */
export function distribute(percents: number[], n: number): number[] {
  const count = percents.length;
  if (!count) return [];
  const sum = percents.reduce((a, b) => a + b, 0) || count;
  const exact = percents.map((p) => ((sum ? p : 1) / sum) * n);
  const out = exact.map((x) => Math.max(1, Math.floor(x)));
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0; k = (k + 1) % count, left--) out[order[k].i]++;
  // Too many faces handed out because of the "at least 1" rule: take them from the biggest ones.
  while (left < 0) {
    const big = out.indexOf(Math.max(...out));
    if (out[big] <= 1) break;
    out[big]--;
    left++;
  }
  return out;
}

/** Largest gap, in percentage points, between the typed chances and what `weights` give. */
export function chanceError(percents: number[], weights: number[]) {
  const sum = percents.reduce((a, b) => a + b, 0) || 1;
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  return Math.max(0, ...percents.map((p, i) => Math.abs((p / sum) * 100 - (weights[i] / total) * 100)));
}

/**
 * Die faces per result for the chances: a fixed die, or in automatic mode the smallest standard
 * die (d4…d100) that keeps every chance within ±1 point. d100 is the usual fallback, like the
 * Dungeon Master's Guide tables.
 */
export function weightsForChances(percents: number[], die: number | "auto"): { faces: number; weights: number[] } {
  if (!percents.length) return { faces: 0, weights: [] };
  if (die !== "auto") {
    const faces = Math.max(die, percents.length);
    return { faces, weights: distribute(percents, faces) };
  }
  for (const n of STANDARD_DICE) {
    if (n < percents.length) continue;
    const w = distribute(percents, n);
    if (chanceError(percents, w) <= AUTO_TOLERANCE) return { faces: n, weights: w };
  }
  const faces = Math.max(100, percents.length);
  return { faces, weights: distribute(percents, faces) };
}

/** Sets one result's chance and rescales the others so everything still adds up to 100 %. */
export function setChance(percents: number[], index: number, value: number): number[] {
  const v = Math.max(0, Math.min(100, value));
  const others = percents.reduce((sum, p, i) => (i === index ? sum : sum + p), 0);
  const rest = 100 - v;
  const n = percents.length - 1;
  return percents.map((p, i) => (i === index ? v : n === 0 ? v : others > 0 ? (p / others) * rest : rest / n));
}

/** Chances after adding a result: it gets an equal share and the others shrink in proportion. */
export function chancesWithNew(percents: number[]): number[] {
  const share = 100 / (percents.length + 1);
  const sum = percents.reduce((a, b) => a + b, 0) || 1;
  return [...percents.map((p) => (p / sum) * (100 - share)), share];
}

/** Chances that add up to 100 again (after removing a result, for example). */
export function normalizeChances(percents: number[]): number[] {
  const sum = percents.reduce((a, b) => a + b, 0);
  return sum > 0 ? percents.map((p) => (p / sum) * 100) : percents.map(() => 100 / (percents.length || 1));
}

/** "33,3" — chances are shown with at most one decimal. */
export function formatChance(p: number) {
  return (Math.round(p * 10) / 10).toString().replace(".", ",");
}

/** What gets saved: the weighted entries plus the expanded lines for compatibility. */
export function tablePayload(entries: LootEntry[]): Pick<LootTable, "entries" | "items"> {
  const clean = entries.filter((e) => e.text.trim()).map((e) => ({ ...e, text: e.text.trim(), weight: Math.max(1, Math.min(MAX_WEIGHT, Math.round(e.weight))) }));
  return { entries: clean, items: entriesToLines(clean) };
}
