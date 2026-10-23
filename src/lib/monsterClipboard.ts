import type { Monster, MonsterEntry } from "../types/monster";
import { formatXP, monsterSubtitle } from "../data/monsterLabels";
import {
  esc, sheetTitleRows, sheetCoreRows, sheetAbilityRows, sheetPropRows, sheetEntryRows, sheetEntry,
  sheetSectionRow, finishSheet, copySheetTable,
} from "./sheetClipboard";

/*
 * Copies a creature as a styled table that pastes cleanly into Google Docs, Word, etc.
 * The look is shared with the character cards; see sheetClipboard.
 */

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

export function monsterToHtmlTable(m: Monster): string {
  const rows: string[] = [
    ...sheetTitleRows(m.name, monsterSubtitle(m)),
    ...sheetCoreRows([
      ["Clase de Armadura", `${m.ac}${m.ac_desc ? ` (${m.ac_desc})` : ""}`],
      ["Puntos de golpe", `${m.hp}${m.hit_dice ? ` (${m.hit_dice})` : ""}`],
      ["Velocidad", m.speed],
    ]),
    ...sheetAbilityRows(m.stats),
    ...sheetPropRows([
      ["Tiradas de salvación", m.saving_throws],
      ["Habilidades", m.skills],
      ["Vulnerabilidad a daño", m.damage_vulnerabilities],
      ["Resistencia a daño", m.damage_resistances],
      ["Inmunidad a daño", m.damage_immunities],
      ["Inmunidad a estados", m.condition_immunities],
      ["Sentidos", m.senses],
      ["Idiomas", m.languages],
      ["Desafío", `${m.cr}${m.xp !== undefined ? ` (${formatXP(m.xp)})` : ""}`],
    ]),
  ];

  const entries = (list: MonsterEntry[], intro?: string) =>
    rows.push(...sheetEntryRows(list.map((e) => sheetEntry(esc(e.name), md(e.desc))), intro && md(intro)));

  if (m.traits?.length) entries(m.traits);
  if (m.actions?.length) { rows.push(sheetSectionRow("Acciones")); entries(m.actions); }
  if (m.reactions?.length) { rows.push(sheetSectionRow("Reacciones")); entries(m.reactions); }
  if (m.legendary_actions?.length) { rows.push(sheetSectionRow("Acciones legendarias")); entries(m.legendary_actions, m.legendary_desc); }

  return finishSheet(rows);
}

/** Copies the creature to the clipboard as rich text (HTML table) plus plain text. */
export function copyMonster(m: Monster): Promise<boolean> {
  return copySheetTable(monsterToHtmlTable(m));
}
