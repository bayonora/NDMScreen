import type { StatBlock } from "../types";

/** A named block of a stat block (trait, action, reaction...). `desc` is Markdown. */
export interface MonsterEntry {
  name: string;
  desc: string;
}

/** A creature from the Spanish SRD 5.1 bestiary (src/data/5e-SRD-Monsters.json). Empty fields are omitted. */
export interface Monster {
  index: string;
  name: string;
  /** English SRD name, so the DM can also search "owlbear". */
  name_en?: string;
  category: "animal" | "npc" | "monster";
  /** Size for filtering, always masculine: "Pequeño". */
  size: string;
  /** Size as printed when it agrees with a feminine type: "Bestia Pequeña". */
  size_label?: string;
  type: string;
  /** Stable key for filtering (beast, dragon, undead...). */
  type_key?: string;
  subtype?: string;
  alignment?: string;
  /** Short lore text (Markdown). */
  desc?: string;
  ac: number;
  ac_desc?: string;
  hp: number;
  hit_dice?: string;
  speed: string;
  stats: StatBlock;
  saving_throws?: string;
  skills?: string;
  damage_vulnerabilities?: string;
  damage_resistances?: string;
  damage_immunities?: string;
  condition_immunities?: string;
  senses?: string;
  languages?: string;
  /** Challenge rating as printed: "0", "1/8", "1/4", "1/2", "1"... "30". */
  cr: string;
  cr_value: number;
  xp?: number;
  traits?: MonsterEntry[];
  actions?: MonsterEntry[];
  reactions?: MonsterEntry[];
  legendary_desc?: string;
  legendary_actions?: MonsterEntry[];
  /** Variants and sidebars that follow the stat block. */
  notes?: MonsterEntry[];
  /** True for the few entries translated from the English SRD because the Spanish source lacked them. */
  translated?: boolean;
}
