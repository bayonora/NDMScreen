export type CharacterTag = {
  id: string;
  name: string;
  description: string;
};

export type StatBlock = {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
};

export type Player = {
  id: string;
  type: "player";
  name: string;
  classAndLevel: string;
  race: string;
  hpMax: number;
  ac: number;
  stats: StatBlock;
  passivePerception: number;
  skills?: string;
  senses?: string;
  languages?: string;
  specialTraits?: string;
  actions?: string;
  /** Current and temporary hit points, tracked on the card. Missing hpCurrent = full. */
  hpCurrent?: number;
  hpTemp?: number;
  /** Stat block extras: "armadura natural", "7d10+21", "30 pies"... */
  acDesc?: string;
  hitDice?: string;
  speed?: string;
  savingThrows?: string;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  tags?: CharacterTag[];
  image?: string;
};

export type NPC = {
  isTemp?: boolean;
  id: string;
  type: "npc";
  name: string;
  race: string;
  ac: number;
  hpMax: number;
  stats: StatBlock;
  cr: string;
  skills: string;
  senses: string;
  languages: string;
  specialTraits: string;
  actions: string;
  /** Current and temporary hit points, tracked on the card. Missing hpCurrent = full. */
  hpCurrent?: number;
  hpTemp?: number;
  /** Stat block extras: "armadura natural", "7d10+21", "30 pies"... */
  acDesc?: string;
  hitDice?: string;
  speed?: string;
  savingThrows?: string;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  tags?: CharacterTag[];
  image?: string;
};

export type Creature = {
  isTemp?: boolean;
  id: string;
  type: "creature";
  name: string;
  race: string;
  ac: number;
  hpMax: number;
  stats: StatBlock;
  cr: string;
  skills: string;
  senses: string;
  languages: string;
  specialTraits: string;
  actions: string;
  /** Current and temporary hit points, tracked on the card. Missing hpCurrent = full. */
  hpCurrent?: number;
  hpTemp?: number;
  /** Stat block extras: "armadura natural", "7d10+21", "30 pies"... */
  acDesc?: string;
  hitDice?: string;
  speed?: string;
  savingThrows?: string;
  damageVulnerabilities?: string;
  damageResistances?: string;
  damageImmunities?: string;
  conditionImmunities?: string;
  tags?: CharacterTag[];
  image?: string;
};

export type Character = Player | NPC | Creature;

export type StatusEffect = {
  id: string;
  name: string;
  description: string;
  duration: number; // 0 for infinite
};

export type Combatant = {
  id: string;
  characterId: string; // Ref to Player or NPC
  initiative: number;
  hpCurrent: number;
  statuses: StatusEffect[];
  isTemp?: boolean;
  tempData?: NPC | Creature;
};

export type LocationData = {
  id: string;
  name: string;
  region?: string;
  description: string;
  image?: string;
  parentId?: string | null;
  markerX?: number;
  markerY?: number;
};

export type MapData = {
  id: string;
  name: string;
  image: string; // Base64
  markerX?: number;
  markerY?: number;
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image?: string; // Base64
  hidden: boolean;
};

export type Shop = {
  id: string;
  name: string;
  ownerName: string;
  ownerImage: string; // Base64
  imagePosition?: string;
  previewImage?: string; // Cropped base64 for preview // object-position e.g. "center", "top", "bottom"
  /** Kind of shop (see SHOP_KINDS in lib/shops): the fixed shops and their copies have one. */
  kind?: string;
  items: ShopItem[];
};

export type Note = {
  id: string;
  title: string;
  content: string;
  /** Color id (an old Tailwind class string, kept for compatibility). See NOTE_COLORS. */
  color: string;
  /** NoteCategory id ("pnj", "lugar"...); missing means "general". */
  category?: string;
  tags?: string[];
  pinned?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export type CustomItem = {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  value?: string;
  image?: string;
  color?: string;
  /** Free text: "Poción", "Arma (cualquier espada)", "Equipo de aventuras"... */
  category?: string;
  /** Free text: "Común", "Rara", "Infrecuente – muy rara"... */
  rarity?: string;
  /** e.g. "requiere sintonización por un mago"; empty when not needed. */
  attunement?: string;
  weight?: string;
  damage?: string;
  properties?: string;
  armorClass?: string;
  /** Where it was copied from, when it comes from the SRD catalog. */
  source?: string;
};

/** One result of a loot table. `weight` = how many faces of the die it takes. */
export type LootEntry = {
  id: string;
  text: string;
  weight: number;
  /** The chance the DM typed (0–100). `weight` is derived from it for the table's die. */
  percent?: number;
  /** Link to the item it stands for, so the result can open its sheet. */
  ref?: { kind: "srd" | "homebrew"; id: string };
};

export type LootTable = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  /**
   * Every result as a line, repeated by weight (["Poción", "Poción", "Espada"]). Older tables only
   * have this; it is still saved so exports keep working with older versions of the app.
   */
  items: string[];
  /** Weighted results with item links. When missing, they are derived from `items`. */
  entries?: LootEntry[];
  /** Die chosen in the editor (faces). Missing = automatic (smallest die that fits the chances). */
  die?: number;
};

export type QuestStatus = "active" | "completed" | "failed";

export type Quest = {
  id: string;
  title: string;
  description: string;
  location?: string;
  reward?: string;
  image?: string; // base64
  parentId: string | null;
  status: QuestStatus;
  createdAt: number;
  details?: QuestDetail[];
};

export type QuestDetail = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
};
