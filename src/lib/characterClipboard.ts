import type { Character } from "../types";
import { readCharacterSheet, SheetBlock, PROP_LABELS } from "./characterSheet";
import {
  esc, plain, sheetTitleRows, sheetCoreRows, sheetAbilityRows, sheetPropRows, sheetEntryRows, sheetEntry,
  sheetSectionRow, finishSheet, copySheetTable,
} from "./sheetClipboard";

/** A player, NPC or creature as the same styled table the bestiary copies. */
export function characterToHtmlTable(c: Character): string {
  const { fields, subtitle, traits, actions } = readCharacterSheet(c);
  const p = fields.props;

  const core: [string, string][] = [
    ["Clase de Armadura", `${c.ac}${fields.acDesc ? ` (${fields.acDesc})` : ""}`],
    ["Puntos de golpe", `${c.hpMax}${fields.hitDice ? ` (${fields.hitDice})` : ""}`],
  ];
  if (fields.speed) core.push(["Velocidad", fields.speed]);

  const rows: string[] = [
    ...sheetTitleRows(c.name, subtitle),
    ...sheetCoreRows(core),
    ...sheetAbilityRows(c.stats),
    ...sheetPropRows([
      [PROP_LABELS[0], p[PROP_LABELS[0]]],
      ["Habilidades", c.skills],
      ...PROP_LABELS.slice(1).map((l) => [l, p[l]] as [string, string | undefined]),
      ["Sentidos", c.senses],
      ["Percepción pasiva", c.type === "player" && c.passivePerception ? String(c.passivePerception) : undefined],
      ["Idiomas", c.languages],
      ["Desafío", c.type !== "player" ? c.cr : undefined],
    ]),
  ];

  // Entries between section titles go together, so each group gets the right spacing.
  const addBlocks = (blocks: SheetBlock[]) => {
    let group: string[] = [];
    const flush = () => { if (group.length) rows.push(...sheetEntryRows(group)); group = []; };
    for (const b of blocks) {
      if (b.kind === "heading") { flush(); rows.push(sheetSectionRow(b.text)); }
      else group.push(sheetEntry(b.name && esc(b.name), plain(b.text)));
    }
    flush();
  };

  addBlocks(traits);
  if (actions.length) {
    if (actions[0].kind !== "heading") rows.push(sheetSectionRow("Acciones"));
    addBlocks(actions);
  }

  return finishSheet(rows);
}

/** Copies the card to the clipboard as rich text (HTML table) plus plain text. */
export function copyCharacter(c: Character): Promise<boolean> {
  return copySheetTable(characterToHtmlTable(c));
}
