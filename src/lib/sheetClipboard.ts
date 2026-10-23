import type { StatBlock } from "../types";
import { formatMod } from "./utils";

/*
 * Shared pieces of the "copy sheet" feature: a styled table that pastes cleanly into Google Docs,
 * Word, etc. Same look as the "Bestiario de campaña" sheets: parchment background, gold rules top
 * and bottom, dark red separators, Cinzel titles and Libre Baskerville text, all inline styles.
 * Used by the bestiary (monsterClipboard) and by player, NPC and creature cards (characterClipboard).
 */

const BG = "#FDF1DC";
const RED = "#7A200D";
const RULE = "#922610";
const GOLD = "#E69A28";
const TEXT = "#1f1a14";
const CELL = `background:${BG};border:none;`;

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text → HTML, keeping line breaks. */
export function plain(s: string) {
  return esc(s).replace(/\n/g, "<br>");
}

const row = (style: string, html: string) => `<tr><td colspan="6" style="${CELL}${style}">${html}</td></tr>`;

/** Name in big red Cinzel, then the italic subtitle closed by a red rule. */
export function sheetTitleRows(name: string, subtitle?: string): string[] {
  const title = `font-family:'Cinzel',Georgia,serif;font-size:18pt;font-weight:700;color:${RED};`;
  if (!subtitle) return [row(`border-top:6pt solid ${GOLD};border-bottom:2pt solid ${RULE};padding:10px 12px 8px 12px;${title}`, esc(name))];
  return [
    row(`border-top:6pt solid ${GOLD};padding:10px 12px 0 12px;${title}`, esc(name)),
    row(`border-bottom:2pt solid ${RULE};padding:2px 12px 8px 12px;font-style:italic;font-size:9.5pt;color:${TEXT};`, esc(subtitle)),
  ];
}

/** Armor class, hit points, speed: red labels and values, closed by a red rule. */
export function sheetCoreRows(core: [string, string][]): string[] {
  return core.map(([k, v], i) => {
    const last = i === core.length - 1;
    const pad = core.length === 1 ? "6px 12px 8px 12px" : i === 0 ? "6px 12px 1px 12px" : last ? "1px 12px 8px 12px" : "1px 12px";
    return row(`${last ? `border-bottom:2pt solid ${RULE};` : ""}padding:${pad};color:${RED};`, `<b>${k}</b> ${esc(v)}`);
  });
}

export function sheetAbilityRows(stats: StatBlock): string[] {
  const abil = [["FUE", stats.STR], ["DES", stats.DEX], ["CON", stats.CON], ["INT", stats.INT], ["SAB", stats.WIS], ["CAR", stats.CHA]] as const;
  return [
    `<tr>${abil.map(([k]) => `<td style="${CELL}padding:7px 2px 0 2px;text-align:center;font-weight:700;color:${RED};">${k}</td>`).join("")}</tr>`,
    `<tr>${abil.map(([, v]) => `<td style="${CELL}border-bottom:2pt solid ${RULE};padding:1px 2px 8px 2px;text-align:center;color:${RED};">${v} (${formatMod(v).replace("-", "&minus;")})</td>`).join("")}</tr>`,
  ];
}

/** Saving throws, skills, senses... Empty values are skipped. */
export function sheetPropRows(props: [string, string | undefined][]): string[] {
  const shown = props.filter(([, v]) => v);
  return shown.map(([k, v], i) => {
    const last = i === shown.length - 1;
    const pad = shown.length === 1 ? "7px 12px 8px 12px" : i === 0 ? "7px 12px 1px 12px" : last ? "1px 12px 8px 12px" : "1px 12px";
    return row(`${last ? `border-bottom:2pt solid ${RULE};` : ""}padding:${pad};`, `<b style="color:${RED};">${k}</b> ${esc(v!)}`);
  });
}

/** Trait or action paragraphs, already as HTML. `intro` goes first without a bold name. */
export function sheetEntryRows(entries: string[], intro?: string): string[] {
  const rows: string[] = [];
  if (intro) rows.push(row("padding:8px 12px 4px 12px;line-height:1.45;", intro));
  entries.forEach((html, i) => {
    const pad = i === 0 && !intro ? "8px 12px 4px 12px" : i === entries.length - 1 ? "4px 12px 8px 12px" : "4px 12px";
    rows.push(row(`padding:${pad};line-height:1.45;`, html));
  });
  return rows;
}

/** Bold-italic entry name followed by its text. */
export function sheetEntry(nameHtml: string | undefined, html: string) {
  return nameHtml ? `<b><i>${nameHtml}.</i></b> ${html}` : html;
}

export function sheetSectionRow(title: string) {
  return row(`border-bottom:1pt solid ${RED};padding:10px 12px 3px 12px;font-family:'Cinzel',Georgia,serif;font-size:13pt;font-weight:600;color:${RED};`, esc(title));
}

/** Closes the sheet with the gold rule and wraps the rows in the table. */
export function finishSheet(rows: string[]): string {
  const last = rows.length - 1;
  rows[last] = rows[last].split(`style="${CELL}`).join(`style="${CELL}border-bottom:6pt solid ${GOLD};`);
  return `<table style="width:100%;border-collapse:collapse;background:${BG};font-family:'Libre Baskerville',Georgia,serif;font-size:10pt;color:${TEXT};">`
    + `<colgroup>${'<col style="width:16.66%">'.repeat(6)}</colgroup><tbody>${rows.join("")}</tbody></table>`;
}

/** Plain-text version for apps that don't take HTML. */
function htmlToText(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html.replace(/<\/tr>/g, "</tr>\n").replace(/<br>/g, "\n");
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Copies a sheet table to the clipboard as rich text (HTML) plus plain text. */
export async function copySheetTable(table: string): Promise<boolean> {
  const html = `<meta charset="utf-8">${table}`;
  const text = htmlToText(table);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) }),
    ]);
    return true;
  } catch {
    // Fallback: render off-screen, select and copy.
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:-9999px;top:0";
    box.innerHTML = table;
    document.body.appendChild(box);
    const range = document.createRange();
    range.selectNode(box.firstChild!);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    sel?.removeAllRanges();
    box.remove();
    return ok;
  }
}
