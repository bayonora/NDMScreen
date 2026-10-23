/** Reading and writing Markdown (GFM) tables, so people can edit them in a grid instead of by hand. */

export interface TableData {
  title: string;
  header: string[];
  rows: string[][];
}

/** Where a table (and its optional bold title line) sits inside a text. */
export interface TableLocation {
  start: number;
  end: number;
  data: TableData;
}

const SEPARATOR_RX = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  // split on pipes that aren't escaped
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}

function escapeCell(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

export function emptyTable(cols = 3, bodyRows = 2): TableData {
  return { title: "", header: Array(cols).fill(""), rows: Array.from({ length: bodyRows }, () => Array(cols).fill("")) };
}

export function tableToMarkdown({ title, header, rows }: TableData): string {
  const cols = header.length;
  const line = (cells: string[]) => "| " + Array.from({ length: cols }, (_, i) => escapeCell(cells[i] ?? "") || " ").join(" | ") + " |";
  const out = [line(header), "|" + " --- |".repeat(cols), ...rows.map(line)];
  return (title.trim() ? `**${title.trim()}**\n\n` : "") + out.join("\n");
}

/** Finds the table under the cursor, if any (including a "**Título**" line right above it). */
export function findTableAt(text: string, cursor: number): TableLocation | null {
  const lines = text.split("\n");
  const starts: number[] = [];
  let pos = 0;
  for (const l of lines) {
    starts.push(pos);
    pos += l.length + 1;
  }
  let li = starts.findIndex((s, i) => cursor >= s && cursor <= s + lines[i].length);
  if (li < 0) return null;
  const isRow = (i: number) => i >= 0 && i < lines.length && lines[i].trim().startsWith("|");
  // The cursor may sit on the title line or the blank line under it: look a couple of lines down.
  for (let k = 0; k < 3 && !isRow(li); k++) {
    const t = lines[li]?.trim() ?? "";
    if (k === 0 && !/^\*\*.+\*\*$/.test(t)) return null;
    li++;
  }
  if (!isRow(li)) return null;
  let first = li;
  let last = li;
  while (isRow(first - 1)) first--;
  while (isRow(last + 1)) last++;
  const block = lines.slice(first, last + 1);
  if (block.length < 2 || !SEPARATOR_RX.test(block[1])) return null;

  let title = "";
  let startLine = first;
  // "**Título**" + blank line just above the table belongs to it.
  if (first >= 2 && lines[first - 1].trim() === "" && /^\*\*(.+)\*\*$/.test(lines[first - 2].trim())) {
    title = lines[first - 2].trim().slice(2, -2);
    startLine = first - 2;
  } else if (first >= 1 && /^\*\*(.+)\*\*$/.test(lines[first - 1].trim())) {
    title = lines[first - 1].trim().slice(2, -2);
    startLine = first - 1;
  }
  const header = splitRow(block[0]);
  const rows = block.slice(2).map((l) => {
    const cells = splitRow(l);
    return Array.from({ length: header.length }, (_, i) => cells[i] ?? "");
  });
  return {
    start: starts[startLine],
    end: starts[last] + lines[last].length,
    data: { title, header, rows },
  };
}

/** Replaces text[start, end) with a block, keeping blank lines around it so Markdown reads it as a table. */
export function insertBlock(text: string, start: number, end: number, block: string): { text: string; cursor: number } {
  const before = text.slice(0, start).replace(/[ \t]+$/, "");
  const after = text.slice(end).replace(/^[ \t]+/, "");
  const lead = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after === "" ? "" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const next = before + lead + block + trail + after;
  return { text: next, cursor: (before + lead + block).length };
}
