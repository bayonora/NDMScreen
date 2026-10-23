import type { Creature } from "../types";
import type { Monster, MonsterEntry } from "../types/monster";

/** Filter labels for each `type_key`, in Spanish. */
export const MONSTER_TYPE_NAMES: Record<string, string> = {
  aberration: "Aberraciones",
  beast: "Bestias",
  celestial: "Celestiales",
  construct: "Constructos",
  dragon: "Dragones",
  elemental: "Elementales",
  fey: "Fatas",
  fiend: "Infernales",
  giant: "Gigantes",
  humanoid: "Humanoides",
  monstrosity: "Monstruosidades",
  ooze: "Cienos",
  plant: "Plantas",
  undead: "No muertos",
};

export const MONSTER_SIZES = ["Diminuto", "Pequeño", "Mediano", "Grande", "Enorme", "Gargantuesco"];

/** Challenge ratings in the order they appear in the SRD. */
export const CHALLENGE_RATINGS = ["0", "1/8", "1/4", "1/2", ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function formatXP(xp: number | undefined) {
  return xp === undefined ? "" : `${xp.toLocaleString("es-ES")} PX`;
}

/** "Bestia Pequeña (enjambre)" */
export function monsterKind(m: Monster) {
  return [m.type, m.size_label || m.size].filter(Boolean).join(" ") + (m.subtype ? ` (${m.subtype})` : "");
}

/** "Dragón Enorme, caótico maligno" */
export function monsterSubtitle(m: Monster) {
  const kind = monsterKind(m);
  return m.alignment ? `${kind}, ${m.alignment}` : kind;
}

/** Strips the light Markdown used in the bestiary so text reads well in plain-text fields. */
export function stripMarkdown(text: string) {
  return text
    .replace(/^- \*\*\*(.+?)\*\*\*/gm, "• $1")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\\)\*(.+?)(?<!\\)\*/g, "$1")
    .replace(/\\\*/g, "*");
}

function entriesToText(entries: MonsterEntry[] | undefined) {
  return (entries || []).map((e) => `${e.name}. ${stripMarkdown(e.desc)}`).join("\n\n");
}

/**
 * Converts a bestiary entry into the app's editable Creature shape, so it can be saved to the
 * campaign or dropped into the initiative tracker with its whole stat block.
 */
export function monsterToCreature(m: Monster): Omit<Creature, "id" | "type"> {
  const header = [
    m.ac_desc && `CA: ${m.ac} (${m.ac_desc})`,
    m.hit_dice && `Dados de golpe: ${m.hit_dice}`,
    `Velocidad: ${m.speed}`,
    m.saving_throws && `Tiradas de salvación: ${m.saving_throws}`,
    m.damage_vulnerabilities && `Vulnerabilidades al daño: ${m.damage_vulnerabilities}`,
    m.damage_resistances && `Resistencias al daño: ${m.damage_resistances}`,
    m.damage_immunities && `Inmunidades al daño: ${m.damage_immunities}`,
    m.condition_immunities && `Inmunidades a estados: ${m.condition_immunities}`,
  ].filter(Boolean).join("\n");

  const actionBlocks = [entriesToText(m.actions)];
  if (m.reactions?.length) actionBlocks.push(`REACCIONES\n\n${entriesToText(m.reactions)}`);
  if (m.legendary_actions?.length) {
    actionBlocks.push(`ACCIONES LEGENDARIAS\n\n${m.legendary_desc ? stripMarkdown(m.legendary_desc) + "\n\n" : ""}${entriesToText(m.legendary_actions)}`);
  }

  return {
    name: m.name,
    race: monsterSubtitle(m),
    ac: m.ac,
    hpMax: m.hp,
    stats: { ...m.stats },
    cr: m.xp !== undefined ? `${m.cr} (${formatXP(m.xp)})` : m.cr,
    skills: m.skills || "",
    senses: m.senses || "",
    languages: m.languages || "",
    specialTraits: [header, entriesToText(m.traits)].filter(Boolean).join("\n\n"),
    actions: actionBlocks.filter(Boolean).join("\n\n"),
  };
}
