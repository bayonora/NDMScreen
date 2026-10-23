import type { Character } from "../types";

/*
 * Reads the free text of a player, NPC or creature card (traits and actions) so the card and the
 * copied sheet can show it like a bestiary stat block:
 * - "Velocidad: 40 pies", "CA: 13 (armadura natural)"... lines, which creatures saved from the
 *   bestiary keep in their traits, become proper fields.
 * - "Name. Text" paragraphs get their name in bold italics.
 * - A paragraph in capitals ("REACCIONES") becomes a section title.
 */

/** Labels of the property lines, in the order a stat block shows them. */
export const PROP_LABELS = [
  "Tiradas de salvación",
  "Vulnerabilidades al daño",
  "Resistencias al daño",
  "Inmunidades al daño",
  "Inmunidades a estados",
] as const;

export type SheetFields = {
  /** What goes in brackets after the armor class: "armadura natural". */
  acDesc?: string;
  hitDice?: string;
  speed?: string;
  props: Partial<Record<(typeof PROP_LABELS)[number], string>>;
};

const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const PROP_BY_KEY = new Map<string, (typeof PROP_LABELS)[number]>([
  ...PROP_LABELS.map((l) => [norm(l), l] as const),
  // Singular forms, as the copied sheet and the Spanish SRD write them.
  ["vulnerabilidad a dano", "Vulnerabilidades al daño"],
  ["resistencia a dano", "Resistencias al daño"],
  ["inmunidad a dano", "Inmunidades al daño"],
  ["inmunidad a estados", "Inmunidades a estados"],
  ["salvaciones", "Tiradas de salvación"],
]);

/** Takes the known "Label: value" lines out of a text. */
export function splitSheetFields(text = ""): { fields: SheetFields; rest: string } {
  const fields: SheetFields = { props: {} };
  const kept = text.split("\n").filter((line) => {
    const m = line.match(/^\s*([^:\n]{2,30}):\s*(.+?)\s*$/);
    if (!m) return true;
    const key = norm(m[1]);
    const value = m[2];
    if (key === "ca" || key === "clase de armadura") {
      const desc = value.replace(/^\d+\s*/, "").replace(/^\((.*)\)$/, "$1").trim();
      if (desc) fields.acDesc = desc;
      return false;
    }
    if (key === "dados de golpe") { fields.hitDice = value; return false; }
    if (key === "velocidad") { fields.speed = value; return false; }
    const prop = PROP_BY_KEY.get(key);
    if (prop) { fields.props[prop] = value; return false; }
    return true;
  });
  return { fields, rest: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

export type SheetBlock =
  | { kind: "heading"; text: string }
  | { kind: "entry"; name?: string; text: string };

const isHeading = (line: string) => /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ]{2,}:?$/.test(line.trim());
const sentenceCase = (s: string) => {
  const t = s.trim().replace(/:$/, "").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function toEntry(paragraph: string): SheetBlock {
  const m = paragraph.match(/^([A-ZÁÉÍÓÚÜÑ¿¡][^.\n:]{0,50}?)\.\s+([\s\S]+)$/);
  if (m && m[1].trim().split(/\s+/).length <= 7) return { kind: "entry", name: m[1].trim(), text: m[2] };
  return { kind: "entry", text: paragraph };
}

/** Splits a text into paragraphs, section titles and named entries. */
export function parseSheetText(text = ""): SheetBlock[] {
  const blocks: SheetBlock[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    const paragraph = raw.trim();
    if (!paragraph) continue;
    const [first, ...more] = paragraph.split("\n");
    if (isHeading(first)) {
      blocks.push({ kind: "heading", text: sentenceCase(first) });
      if (more.length) blocks.push(toEntry(more.join("\n").trim()));
    } else {
      blocks.push(toEntry(paragraph));
    }
  }
  return blocks;
}

/**
 * The stat block extras of a character: its own fields first, then what older cards (and creatures
 * saved from the bestiary before these fields existed) keep as "Label: value" lines in their traits.
 */
export function characterFields(c: Character): { fields: SheetFields; rest: string } {
  const { fields: parsed, rest } = splitSheetFields(c.specialTraits);
  const own: Record<(typeof PROP_LABELS)[number], string | undefined> = {
    "Tiradas de salvación": c.savingThrows,
    "Vulnerabilidades al daño": c.damageVulnerabilities,
    "Resistencias al daño": c.damageResistances,
    "Inmunidades al daño": c.damageImmunities,
    "Inmunidades a estados": c.conditionImmunities,
  };
  const props: SheetFields["props"] = {};
  PROP_LABELS.forEach((l) => { const v = own[l] || parsed.props[l]; if (v) props[l] = v; });
  return {
    fields: { acDesc: c.acDesc || parsed.acDesc, hitDice: c.hitDice || parsed.hitDice, speed: c.speed || parsed.speed, props },
    rest,
  };
}

/** Everything a card or a copied sheet needs, read once from the character. */
export function readCharacterSheet(c: Character) {
  const { fields, rest } = characterFields(c);
  return {
    fields,
    subtitle: c.type === "player" ? [c.race, c.classAndLevel].filter(Boolean).join(" · ") : c.race || "",
    traits: parseSheetText(rest),
    actions: parseSheetText(c.actions),
  };
}
