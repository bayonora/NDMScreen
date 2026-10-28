/**
 * Makes loaded or imported data safe to render. Files can be hand-edited, come from older versions
 * or be damaged, so every entry is brought to the shape the views expect: missing or wrongly typed
 * fields get a default, entries that aren't objects are dropped, repeated ids get a new one, and
 * broken links (places whose parent is gone, parent cycles) are cut. Unknown extra fields are kept.
 */
import { v4 as uuidv4 } from "uuid";
import type {
  Character, Combatant, Creature, CustomItem, NPC, Player, LocationData, LootEntry, LootTable, MapData, Note, Quest,
  QuestDetail, QuestStatus, Shop, ShopItem, StatBlock, StatusEffect,
} from "../types";

type Raw = Record<string, any>;

const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, def = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : def);
const optStr = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);
const num = (v: unknown, def: number) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : def;
};
const optNumClean = (v: unknown) => {
  const n = num(v, NaN);
  return Number.isNaN(n) ? undefined : n;
};
const bool = (v: unknown) => v === true;
const optBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
export const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

/** Drops the keys whose value is undefined, so optional fields that were invalid disappear. */
function clean<T extends Raw>(o: T): T {
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]);
  return o;
}

/**
 * Normalises every entry of a list with `fix`, dropping anything that isn't an object and giving
 * a fresh id to entries without one or whose id was already used in the list.
 */
function list<T extends { id: string }>(v: unknown, fix: (raw: Raw, id: string) => T): T[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const raw of v) {
    if (!isObj(raw)) continue;
    let id = optStr(raw.id);
    if (!id || seen.has(id)) id = uuidv4();
    seen.add(id);
    out.push(fix(raw, id));
  }
  return out;
}

// --- Characters ----------------------------------------------------------------------------------

const STAT_KEYS: (keyof StatBlock)[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const stats = (v: unknown): StatBlock => {
  const s = isObj(v) ? v : {};
  return Object.fromEntries(STAT_KEYS.map((k) => [k, num(s[k], 10)])) as StatBlock;
};

const OPTIONAL_CHAR_TEXT = [
  "acDesc", "hitDice", "speed", "savingThrows", "damageVulnerabilities", "damageResistances",
  "damageImmunities", "conditionImmunities", "image",
] as const;
const NPC_TEXT = ["cr", "skills", "senses", "languages", "specialTraits", "actions"] as const;
const PLAYER_OPTIONAL_TEXT = ["skills", "senses", "languages", "specialTraits", "actions"] as const;

export function fixCharacter(raw: Raw, id: string, type: Character["type"]): Character {
  const c: Raw = {
    ...raw,
    id,
    type,
    name: str(raw.name, "Sin nombre"),
    race: str(raw.race),
    ac: num(raw.ac, 10),
    hpMax: Math.max(1, num(raw.hpMax, 1)),
    hpCurrent: optNumClean(raw.hpCurrent),
    hpTemp: optNumClean(raw.hpTemp),
    stats: stats(raw.stats),
    tags: Array.isArray(raw.tags)
      ? list(raw.tags, (t, tid) => ({ ...t, id: tid, name: str(t.name), description: str(t.description) }))
      : undefined,
  };
  OPTIONAL_CHAR_TEXT.forEach((k) => (c[k] = optStr(raw[k])));
  if (type === "player") {
    c.classAndLevel = str(raw.classAndLevel);
    c.passivePerception = num(raw.passivePerception, 10);
    PLAYER_OPTIONAL_TEXT.forEach((k) => (c[k] = optStr(raw[k])));
  } else {
    NPC_TEXT.forEach((k) => (c[k] = str(raw[k])));
  }
  return clean(c) as Character;
}

const CHAR_TYPES = ["player", "npc", "creature"] as const;

/**
 * Sorts the characters of the three lists by their own `type` (a creature found in the players
 * list goes back to the creatures), fills in a missing type from the list it was in, and drops
 * the temporary ones, which are never saved.
 */
export function fixCharacterLists(lists: { players?: unknown; npcs?: unknown; creatures?: unknown }) {
  const out = { players: [] as Player[], npcs: [] as NPC[], creatures: [] as Creature[] };
  const keyOf = { player: "players", npc: "npcs", creature: "creatures" } as const;
  const seen = new Set<string>();
  (["players", "npcs", "creatures"] as const).forEach((key) => {
    const fallback = CHAR_TYPES[["players", "npcs", "creatures"].indexOf(key)];
    if (!Array.isArray(lists[key])) return;
    for (const raw of lists[key] as unknown[]) {
      if (!isObj(raw) || raw.isTemp) continue;
      const type = CHAR_TYPES.includes(raw.type) ? (raw.type as Character["type"]) : fallback;
      let id = optStr(raw.id);
      if (!id || seen.has(id)) id = uuidv4();
      seen.add(id);
      (out[keyOf[type]] as Character[]).push(fixCharacter(raw, id, type));
    }
  });
  return out;
}

// --- Initiative ----------------------------------------------------------------------------------

const fixStatus = (s: Raw, id: string): StatusEffect =>
  ({ ...s, id, name: str(s.name), description: str(s.description), duration: num(s.duration, 0) });

export const fixCombatants = (v: unknown): Combatant[] =>
  list(v, (raw, id) => {
    const temp = raw.isTemp && isObj(raw.tempData);
    const tempType = temp && raw.tempData.type === "npc" ? "npc" : "creature";
    return clean({
      ...raw,
      id,
      characterId: str(raw.characterId, id),
      initiative: num(raw.initiative, 0),
      hpCurrent: num(raw.hpCurrent, 0),
      statuses: list(raw.statuses, fixStatus),
      isTemp: optBool(raw.isTemp),
      tempData: temp
        ? { ...fixCharacter(raw.tempData, str(raw.tempData.id, str(raw.characterId, id)), tempType), isTemp: true } as Combatant["tempData"]
        : undefined,
      concentrationChecks: Array.isArray(raw.concentrationChecks)
        ? raw.concentrationChecks.filter((n: unknown) => typeof n === "number" && Number.isFinite(n))
        : undefined,
    }) as Combatant;
  });

// --- World ---------------------------------------------------------------------------------------

export const fixMaps = (v: unknown): MapData[] =>
  list(v, (raw, id) => clean({
    ...raw, id, name: str(raw.name, "Sin nombre"), image: str(raw.image),
    markerX: optNumClean(raw.markerX), markerY: optNumClean(raw.markerY),
  }) as MapData);

export const fixLocations = (v: unknown): LocationData[] =>
  list(v, (raw, id) => clean({
    ...raw, id, name: str(raw.name, "Sin nombre"), description: str(raw.description),
    region: optStr(raw.region), image: optStr(raw.image),
    parentId: optStr(raw.parentId) || null,
    markerX: optNumClean(raw.markerX), markerY: optNumClean(raw.markerY),
  }) as LocationData);

/**
 * Places whose parent (map or place) no longer exists move to the top level, where they can be
 * seen again, and parent cycles are cut, so walking up or down the tree always ends.
 */
export function repairLocations(maps: MapData[], locations: LocationData[]): LocationData[] {
  const mapIds = new Set(maps.map((m) => m.id));
  const byId = new Map(locations.map((l) => [l.id, l]));
  const cut = new Set<string>(); // places that become top level
  const safe = new Set<string>(); // places already known to reach the top
  for (const start of locations) {
    const path = new Set<string>();
    let cur: LocationData | undefined = start;
    while (cur && !safe.has(cur.id)) {
      path.add(cur.id);
      const p = cur.parentId;
      // Reaching the top, a map or a place that was just moved to the top ends the walk.
      if (!p || mapIds.has(p) || cut.has(p)) break;
      const parent = byId.get(p);
      if (!parent || path.has(p)) { cut.add(cur.id); break; }
      cur = parent;
    }
    path.forEach((id) => safe.add(id));
  }
  return cut.size ? locations.map((l) => (cut.has(l.id) ? { ...l, parentId: null } : l)) : locations;
}

// --- Shops, notes, items -------------------------------------------------------------------------

const fixShopItem = (raw: Raw, id: string): ShopItem => clean({
  ...raw, id, name: str(raw.name, "Sin nombre"), description: str(raw.description), price: str(raw.price),
  image: optStr(raw.image), hidden: bool(raw.hidden), category: optStr(raw.category),
}) as ShopItem;

export const fixShops = (v: unknown): Shop[] =>
  list(v, (raw, id) => clean({
    ...raw, id, name: str(raw.name, "Sin nombre"), ownerName: str(raw.ownerName), ownerImage: str(raw.ownerImage),
    quote: optStr(raw.quote), imagePosition: optStr(raw.imagePosition), previewImage: optStr(raw.previewImage),
    kind: optStr(raw.kind), items: list(raw.items, fixShopItem),
  }) as Shop);

export const fixNotes = (v: unknown): Note[] =>
  list(v, (raw, id) => clean({
    ...raw, id, title: str(raw.title), content: str(raw.content), color: str(raw.color),
    category: optStr(raw.category), tags: Array.isArray(raw.tags) ? strArr(raw.tags) : undefined,
    pinned: optBool(raw.pinned), createdAt: optNumClean(raw.createdAt), updatedAt: optNumClean(raw.updatedAt),
  }) as Note);

const ITEM_TEXT = [
  "shortDescription", "description", "value", "image", "color", "type", "category", "rarityKey", "rarity",
  "attunement", "weight", "damage", "properties", "armorClass", "source",
] as const;

export const fixCustomItems = (v: unknown): CustomItem[] =>
  list(v, (raw, id) => {
    const it: Raw = { ...raw, id, name: str(raw.name, "Sin nombre") };
    ITEM_TEXT.forEach((k) => (it[k] = optStr(raw[k])));
    return clean(it) as CustomItem;
  });

const fixLootEntry = (raw: Raw, id: string): LootEntry => clean({
  ...raw, id, text: str(raw.text), weight: Math.max(1, Math.round(num(raw.weight, 1))),
  percent: optNumClean(raw.percent),
  ref: isObj(raw.ref) && (raw.ref.kind === "srd" || raw.ref.kind === "homebrew") && typeof raw.ref.id === "string"
    ? { kind: raw.ref.kind, id: raw.ref.id } : undefined,
}) as LootEntry;

export const fixLootTables = (v: unknown): LootTable[] =>
  list(v, (raw, id) => {
    const die = optNumClean(raw.die);
    return clean({
      ...raw, id, name: str(raw.name, "Sin nombre"), description: optStr(raw.description), color: optStr(raw.color),
      items: strArr(raw.items),
      entries: Array.isArray(raw.entries) ? list(raw.entries, fixLootEntry) : undefined,
      die: die !== undefined && die >= 1 ? Math.round(die) : undefined,
    }) as LootTable;
  });

// --- Quests --------------------------------------------------------------------------------------

const QUEST_STATUSES: QuestStatus[] = ["active", "completed", "failed"];

const fixQuestDetail = (raw: Raw, id: string): QuestDetail =>
  ({ ...raw, id, name: str(raw.name), description: str(raw.description), createdAt: num(raw.createdAt, 0) });

export const fixQuests = (v: unknown): Quest[] =>
  list(v, (raw, id) => clean({
    ...raw, id, title: str(raw.title, "Sin título"), description: str(raw.description),
    location: optStr(raw.location), reward: optStr(raw.reward), image: optStr(raw.image),
    parentId: optStr(raw.parentId) || null,
    status: QUEST_STATUSES.includes(raw.status) ? raw.status : "active",
    createdAt: num(raw.createdAt, 0),
    details: Array.isArray(raw.details) ? list(raw.details, fixQuestDetail) : undefined,
  }) as Quest);

// --- Whole data ----------------------------------------------------------------------------------

/** Every data collection of a saved state or a full export, normalised. */
export function fixData(raw: Raw) {
  return {
    ...fixCharacterLists(raw),
    combatants: fixCombatants(raw.combatants),
    graveyard: fixCombatants(raw.graveyard),
    maps: fixMaps(raw.maps),
    locations: fixLocations(raw.locations),
    shops: fixShops(raw.shops),
    notes: fixNotes(raw.notes),
    customItems: fixCustomItems(raw.customItems),
    lootTables: fixLootTables(raw.lootTables),
    quests: fixQuests(raw.quests),
    favoriteSpells: [...new Set(strArr(raw.favoriteSpells))],
    favoriteMonsters: [...new Set(strArr(raw.favoriteMonsters))],
  };
}

// --- UI state ------------------------------------------------------------------------------------

const TABS = ["party", "initiative", "quests", "maps", "shops", "notes", "items", "spells", "bestiary"];
const oneOf = (v: unknown, options: string[]) => (typeof v === "string" && options.includes(v) ? v : undefined);

/** Keeps only valid values in the saved UI state; wrong ones fall back to the app's default. */
export function fixUIState<T extends Raw>(v: unknown): T {
  const ui: Raw = isObj(v) ? { ...v } : {};
  const out: Raw = {
    ...ui,
    activeTab: oneOf(ui.activeTab, TABS),
    combatActive: bool(ui.combatActive),
    activeCombatantId: optStr(ui.activeCombatantId) ?? null,
    round: Math.max(1, Math.round(num(ui.round, 1))),
    draftNote: isObj(ui.draftNote)
      ? clean({ ...ui.draftNote, title: optStr(ui.draftNote.title), content: optStr(ui.draftNote.content), color: optStr(ui.draftNote.color), category: optStr(ui.draftNote.category), tags: Array.isArray(ui.draftNote.tags) ? strArr(ui.draftNote.tags) : undefined })
      : null,
    hasSeenWelcome: optBool(ui.hasSeenWelcome),
    partyTab: oneOf(ui.partyTab, ["players", "npcs", "creatures"]),
    partyView: oneOf(ui.partyView, ["cards", "list"]),
    questStatusFilter: oneOf(ui.questStatusFilter, QUEST_STATUSES),
    questsZoom: optNumClean(ui.questsZoom),
    hideBuiltinShops: optBool(ui.hideBuiltinShops),
    notesSort: oneOf(ui.notesSort, ["manual", "recent", "alpha"]),
    notesCategory: optStr(ui.notesCategory),
    itemsTab: oneOf(ui.itemsTab, ["items", "loot", "srd"]),
    theme: optStr(ui.theme),
  };
  for (const k of ["collapsedQuests", "hiddenBuiltinItems", "collapsedCharacters"]) {
    out[k] = Array.isArray(ui[k]) ? strArr(ui[k]) : undefined;
  }
  for (const k of ["highlightedQuestId", "highlightedSpellId", "highlightedMonsterId", "searchFocusId", "openShopId", "mapsFocusId", "highlightedNoteId", "highlightedItemId", "editCustomItemId"]) {
    out[k] = optStr(ui[k]);
  }
  return clean(out) as T;
}
