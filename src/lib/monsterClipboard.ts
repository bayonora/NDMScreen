import type { Monster, MonsterEntry } from "../types/monster";
import { formatMod } from "./utils";
import { formatXP, monsterSubtitle } from "../data/monsterLabels";

/*
 * Copies a creature as a styled table that pastes cleanly into Google Docs, Word, etc.
 * Same look as the "Bestiario de campaña" sheets: parchment background, gold rules top and
 * bottom, dark red separators, Cinzel titles and Libre Baskerville text, all inline styles.
 */

const BG = "#FDF1DC";
const RED = "#7A200D";
const RULE = "#922610";
const GOLD = "#E69A28";
const TEXT = "#1f1a14";
const CELL = `background:${BG};border:none;`;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The bestiary's light Markdown → inline HTML (bold, italics, line breaks, sub-option lists). */
function md(s: string) {
  return esc(s)
    .replace(/^- \*\*\*(.+?)\*\*\*/gm, "<b><i>$1</i></b>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(?<!\\)\*(.+?)(?<!\\)\*/g, "<i>$1</i>")
    .replace(/\\\*/g, "*")
    .replace(/\n/g, "<br>");
}

const row = (style: string, html: string) => `<tr><td colspan="6" style="${CELL}${style}">${html}</td></tr>`;

export function monsterToHtmlTable(m: Monster): string {
  const rows: string[] = [];
  rows.push(row(`border-top:6pt solid ${GOLD};padding:10px 12px 0 12px;font-family:'Cinzel',Georgia,serif;font-size:18pt;font-weight:700;color:${RED};`, esc(m.name)));
  rows.push(row(`border-bottom:2pt solid ${RULE};padding:2px 12px 8px 12px;font-style:italic;font-size:9.5pt;color:${TEXT};`, esc(monsterSubtitle(m))));

  const core: [string, string][] = [
    ["Clase de Armadura", `${m.ac}${m.ac_desc ? ` (${m.ac_desc})` : ""}`],
    ["Puntos de golpe", `${m.hp}${m.hit_dice ? ` (${m.hit_dice})` : ""}`],
    ["Velocidad", m.speed],
  ];
  core.forEach(([k, v], i) => {
    const last = i === core.length - 1;
    const pad = i === 0 ? "6px 12px 1px 12px" : last ? "1px 12px 8px 12px" : "1px 12px";
    rows.push(row(`${last ? `border-bottom:2pt solid ${RULE};` : ""}padding:${pad};color:${RED};`, `<b>${k}</b> ${esc(v)}`));
  });

  const abil = [["FUE", m.stats.STR], ["DES", m.stats.DEX], ["CON", m.stats.CON], ["INT", m.stats.INT], ["SAB", m.stats.WIS], ["CAR", m.stats.CHA]] as const;
  rows.push(`<tr>${abil.map(([k]) => `<td style="${CELL}padding:7px 2px 0 2px;text-align:center;font-weight:700;color:${RED};">${k}</td>`).join("")}</tr>`);
  rows.push(`<tr>${abil.map(([, v]) => `<td style="${CELL}border-bottom:2pt solid ${RULE};padding:1px 2px 8px 2px;text-align:center;color:${RED};">${v} (${formatMod(v).replace("-", "&minus;")})</td>`).join("")}</tr>`);

  const props: [string, string | undefined][] = [
    ["Tiradas de salvación", m.saving_throws],
    ["Habilidades", m.skills],
    ["Vulnerabilidad a daño", m.damage_vulnerabilities],
    ["Resistencia a daño", m.damage_resistances],
    ["Inmunidad a daño", m.damage_immunities],
    ["Inmunidad a estados", m.condition_immunities],
    ["Sentidos", m.senses],
    ["Idiomas", m.languages],
    ["Desafío", `${m.cr}${m.xp !== undefined ? ` (${formatXP(m.xp)})` : ""}`],
  ];
  const shown = props.filter(([, v]) => v);
  shown.forEach(([k, v], i) => {
    const last = i === shown.length - 1;
    const pad = i === 0 ? "7px 12px 1px 12px" : last ? "1px 12px 8px 12px" : "1px 12px";
    rows.push(row(`${last ? `border-bottom:2pt solid ${RULE};` : ""}padding:${pad};`, `<b style="color:${RED};">${k}</b> ${esc(v!)}`));
  });

  const entries = (list: MonsterEntry[], intro?: string) => {
    if (intro) rows.push(row("padding:8px 12px 4px 12px;line-height:1.45;", md(intro)));
    list.forEach((e, i) => {
      const pad = i === 0 && !intro ? "8px 12px 4px 12px" : i === list.length - 1 ? "4px 12px 8px 12px" : "4px 12px";
      rows.push(row(`padding:${pad};line-height:1.45;`, `<b><i>${esc(e.name)}.</i></b> ${md(e.desc)}`));
    });
  };
  const section = (title: string) =>
    rows.push(row(`border-bottom:1pt solid ${RED};padding:10px 12px 3px 12px;font-family:'Cinzel',Georgia,serif;font-size:13pt;font-weight:600;color:${RED};`, title));

  if (m.traits?.length) entries(m.traits);
  if (m.actions?.length) { section("Acciones"); entries(m.actions); }
  if (m.reactions?.length) { section("Reacciones"); entries(m.reactions); }
  if (m.legendary_actions?.length) { section("Acciones legendarias"); entries(m.legendary_actions, m.legendary_desc); }

  // The last row closes the sheet with the gold rule.
  rows[rows.length - 1] = rows[rows.length - 1].replace(`style="${CELL}`, `style="${CELL}border-bottom:6pt solid ${GOLD};`);

  return `<table style="width:100%;border-collapse:collapse;background:${BG};font-family:'Libre Baskerville',Georgia,serif;font-size:10pt;color:${TEXT};">`
    + `<colgroup>${'<col style="width:16.66%">'.repeat(6)}</colgroup><tbody>${rows.join("")}</tbody></table>`;
}

/** Plain-text version for apps that don't take HTML. */
function htmlToText(html: string) {
  const div = document.createElement("div");
  div.innerHTML = html.replace(/<\/tr>/g, "</tr>\n").replace(/<br>/g, "\n");
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Copies the creature to the clipboard as rich text (HTML table) plus plain text. */
export async function copyMonster(m: Monster): Promise<boolean> {
  const table = monsterToHtmlTable(m);
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
