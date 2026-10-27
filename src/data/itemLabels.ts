import type { CustomItem } from "../types";
import type { CatalogItem } from "../types/item";

/** Equipment categories in the order of the Player's Handbook equipment chapter. */
export const MUNDANE_CATEGORIES: { key: string; label: string }[] = [
  { key: "armor", label: "Armaduras" },
  { key: "weapon", label: "Armas" },
  { key: "gear", label: "Equipo de aventuras" },
  { key: "pack", label: "Packs de equipo" },
  { key: "tools", label: "Herramientas" },
  { key: "mounts", label: "Monturas y vehículos" },
  { key: "trade", label: "Productos comerciales" },
];

/** Magic item categories in the order of the Dungeon Master's Guide. */
export const MAGIC_CATEGORIES: { key: string; label: string; singular: string }[] = [
  { key: "armor", label: "Armaduras", singular: "Armadura" },
  { key: "weapon", label: "Armas", singular: "Arma" },
  { key: "potion", label: "Pociones", singular: "Poción" },
  { key: "ring", label: "Anillos", singular: "Anillo" },
  { key: "rod", label: "Varas", singular: "Vara" },
  { key: "scroll", label: "Pergaminos", singular: "Pergamino" },
  { key: "staff", label: "Bastones", singular: "Bastón" },
  { key: "wand", label: "Varitas", singular: "Varita" },
  { key: "wondrous", label: "Objetos maravillosos", singular: "Objeto maravilloso" },
  { key: "artifact", label: "Artefactos", singular: "Artefacto" },
];

export const RARITIES: { key: string; label: string; plural: string; color: string }[] = [
  { key: "common", label: "Común", plural: "Comunes", color: "#c1a063" },
  { key: "uncommon", label: "Infrecuente", plural: "Infrecuentes", color: "#10b981" },
  { key: "rare", label: "Rara", plural: "Raras", color: "#38bdf8" },
  { key: "very-rare", label: "Muy rara", plural: "Muy raras", color: "#3b82f6" },
  { key: "legendary", label: "Legendaria", plural: "Legendarias", color: "#fbbf24" },
  { key: "artifact", label: "Artefacto", plural: "Artefactos", color: "#dc2626" },
  { key: "varies", label: "Rareza variable", plural: "Rareza variable", color: "#a855f7" },
];

const RARITY_BY_KEY = Object.fromEntries(RARITIES.map((r) => [r.key, r]));

export function rarityInfo(key: string | undefined) {
  return key ? RARITY_BY_KEY[key] : undefined;
}

/** "Infrecuente – Muy rara" for "+1, +2 o +3" items, the plain label otherwise. */
export function rarityLabel(item: CatalogItem) {
  const keys = item.rarities?.length ? item.rarities : item.rarity ? [item.rarity] : [];
  if (keys.length > 1) return `${rarityInfo(keys[0])?.label} – ${rarityInfo(keys[keys.length - 1])?.label?.toLowerCase()}`;
  return rarityInfo(keys[0])?.label ?? "";
}

// ------------------------------------------------------------------ item types (shared taxonomy)

/** Big families of items, as the loot picker and the homebrew list group them. */
export type ItemGroup = "weapons" | "armor" | "consumables" | "magic" | "gear" | "treasure";

export const ITEM_GROUPS: { key: ItemGroup; label: string }[] = [
  { key: "weapons", label: "Armas" },
  { key: "armor", label: "Armaduras" },
  { key: "consumables", label: "Pociones y pergaminos" },
  { key: "magic", label: "Objetos mágicos" },
  { key: "gear", label: "Equipo" },
  { key: "treasure", label: "Tesoro" },
];

/**
 * What an item is. Catalog items get one from their category; homebrew items pick one in the
 * editor. Weapons and armor with a rarity go to the "Mágicas" subgroup.
 */
export const ITEM_TYPES: { key: string; label: string; group: ItemGroup; subgroup: string }[] = [
  { key: "weapon-simple-melee", label: "Arma sencilla cuerpo a cuerpo", group: "weapons", subgroup: "Sencillas cuerpo a cuerpo" },
  { key: "weapon-simple-ranged", label: "Arma sencilla a distancia", group: "weapons", subgroup: "Sencillas a distancia" },
  { key: "weapon-martial-melee", label: "Arma marcial cuerpo a cuerpo", group: "weapons", subgroup: "Marciales cuerpo a cuerpo" },
  { key: "weapon-martial-ranged", label: "Arma marcial a distancia", group: "weapons", subgroup: "Marciales a distancia" },
  { key: "weapon", label: "Arma", group: "weapons", subgroup: "Otras armas" },
  { key: "armor-light", label: "Armadura ligera", group: "armor", subgroup: "Ligeras" },
  { key: "armor-medium", label: "Armadura intermedia", group: "armor", subgroup: "Intermedias" },
  { key: "armor-heavy", label: "Armadura pesada", group: "armor", subgroup: "Pesadas" },
  { key: "shield", label: "Escudo", group: "armor", subgroup: "Escudos" },
  { key: "armor", label: "Armadura", group: "armor", subgroup: "Otras armaduras" },
  { key: "potion", label: "Poción", group: "consumables", subgroup: "Pociones" },
  { key: "scroll", label: "Pergamino", group: "consumables", subgroup: "Pergaminos" },
  { key: "alchemy", label: "Alquimia o veneno", group: "consumables", subgroup: "Alquimia" },
  { key: "ring", label: "Anillo", group: "magic", subgroup: "Anillos" },
  { key: "rod", label: "Vara", group: "magic", subgroup: "Varas" },
  { key: "staff", label: "Bastón", group: "magic", subgroup: "Bastones" },
  { key: "wand", label: "Varita", group: "magic", subgroup: "Varitas" },
  { key: "wondrous", label: "Objeto maravilloso", group: "magic", subgroup: "Objetos maravillosos" },
  { key: "artifact", label: "Artefacto", group: "magic", subgroup: "Artefactos" },
  { key: "gear", label: "Equipo de aventuras", group: "gear", subgroup: "Aventura" },
  { key: "ammo", label: "Munición", group: "gear", subgroup: "Munición" },
  { key: "pack", label: "Pack de equipo", group: "gear", subgroup: "Packs" },
  { key: "tools", label: "Herramienta o instrumento", group: "gear", subgroup: "Herramientas" },
  { key: "mount", label: "Montura o vehículo", group: "gear", subgroup: "Monturas y vehículos" },
  { key: "trade", label: "Producto comercial", group: "gear", subgroup: "Comercio" },
  { key: "gem", label: "Gema", group: "treasure", subgroup: "Gemas" },
  { key: "art", label: "Objeto de arte", group: "treasure", subgroup: "Objetos de arte" },
  { key: "treasure", label: "Otro tesoro", group: "treasure", subgroup: "Otros tesoros" },
  { key: "other", label: "Otro", group: "gear", subgroup: "Otros" },
];

const TYPE_BY_KEY = Object.fromEntries(ITEM_TYPES.map((t) => [t.key, t]));

export function itemTypeInfo(key: string | undefined) {
  return key ? TYPE_BY_KEY[key] : undefined;
}

/** Group and subgroup of an item of that type (and rarity) in the filters. */
export function itemPlace(typeKey: string | undefined, rarityKey?: string): { group: ItemGroup; subgroup: string } {
  const t = itemTypeInfo(typeKey) ?? TYPE_BY_KEY.other;
  if (rarityKey && (t.group === "weapons" || t.group === "armor")) return { group: t.group, subgroup: "Mágicas" };
  return { group: t.group, subgroup: t.subgroup };
}

const SUBCATEGORY_TYPES: Record<string, string> = {
  "Armas cuerpo a cuerpo sencillas": "weapon-simple-melee",
  "Armas a distancia sencillas": "weapon-simple-ranged",
  "Armas cuerpo a cuerpo marciales": "weapon-martial-melee",
  "Armas a distancia marciales": "weapon-martial-ranged",
  "Armadura ligera": "armor-light",
  "Armadura intermedia": "armor-medium",
  "Armadura pesada": "armor-heavy",
  Escudo: "shield",
  "Munición": "ammo",
};

/** Type key of a catalog item. */
export function catalogTypeKey(item: CatalogItem): string {
  if (item.kind === "magic") {
    if (["armor", "weapon", "potion", "ring", "rod", "scroll", "staff", "wand", "wondrous", "artifact"].includes(item.category)) {
      // A magic shield is still a shield.
      if (item.category === "armor" && /escudo/i.test(item.item_type || "")) return "shield";
      return item.category;
    }
    return "wondrous";
  }
  const bySub = SUBCATEGORY_TYPES[item.subcategory ?? ""];
  if (bySub) return bySub;
  if (item.subcategory === "Pociones y alquimia") return /^poción/i.test(item.name) ? "potion" : /^(jabón|perfume)/i.test(item.name) ? "gear" : "alchemy";
  if (item.subcategory === "Instrumentos musicales") return "tools";
  return ({ weapon: "weapon", armor: "armor", gear: "gear", pack: "pack", tools: "tools", mounts: "mount", trade: "trade" } as Record<string, string>)[item.category] ?? "other";
}

/** Rarity key of a catalog item (the lowest one for "+1, +2 o +3" items). */
export function catalogRarityKey(item: CatalogItem): string | undefined {
  return item.kind === "magic" ? (item.rarities?.[0] ?? item.rarity) : undefined;
}

// Homebrew items made before types and rarity keys existed only have free text. These guess
// the structured value from it, so old items filter right without being edited.
const RARITY_GUESS = [...RARITIES].sort((a, b) => b.label.length - a.label.length);

/** Rarity key of a homebrew item: the stored one, or guessed from its rarity text. */
export function homebrewRarityKey(item: Pick<CustomItem, "rarityKey" | "rarity">): string | undefined {
  if (item.rarityKey) return rarityInfo(item.rarityKey) ? item.rarityKey : undefined;
  const text = normalize(item.rarity);
  if (!text) return undefined;
  const found = RARITY_GUESS.find((r) => text.startsWith(normalize(r.label)) || text.startsWith(normalize(r.plural)) || text.startsWith(r.key));
  if (found) return found.key;
  if (/^(variable|varia)/.test(text)) return "varies";
  return undefined;
}

const TYPE_GUESS: [RegExp, string][] = [
  [/sencilla.*(cuerpo|c\/c)|cuerpo a cuerpo sencilla/, "weapon-simple-melee"],
  [/sencilla.*distancia|distancia sencilla/, "weapon-simple-ranged"],
  [/marcial.*(cuerpo|c\/c)|cuerpo a cuerpo marcial/, "weapon-martial-melee"],
  [/marcial.*distancia|distancia marcial/, "weapon-martial-ranged"],
  [/armadura ligera/, "armor-light"],
  [/armadura (intermedia|media)/, "armor-medium"],
  [/armadura pesada/, "armor-heavy"],
  [/escudo/, "shield"],
  [/armadura|cota|yelmo/, "armor"],
  [/municion|flecha|virote|proyectil/, "ammo"],
  [/^arma|espada|hacha|arco|daga|lanza|martillo|maza|ballesta|baston de combate/, "weapon"],
  [/pocion|elixir|aceite/, "potion"],
  [/pergamino/, "scroll"],
  [/alquim|veneno|acido|antitoxina/, "alchemy"],
  [/anillo/, "ring"],
  [/varita/, "wand"],
  [/vara/, "rod"],
  [/baston/, "staff"],
  [/maravillos|amuleto|capa|botas|guantes|cinturon|collar|brazal/, "wondrous"],
  [/artefacto/, "artifact"],
  [/pack/, "pack"],
  [/herramienta|instrumento|kit|juego/, "tools"],
  [/montura|vehiculo|barco|carro/, "mount"],
  [/comerci|producto/, "trade"],
  [/gema|joya|piedra preciosa/, "gem"],
  [/arte|estatuilla|tapiz|cuadro/, "art"],
  [/tesoro|moneda/, "treasure"],
  // Equipment sub-groups of the catalog, which items copied from it have as category.
  [/equipo|aventura|iluminacion|contenedor|ropa|foco|simbolo|magia y estudio|exploracion|trampa|campamento/, "gear"],
];

/** Type key of a homebrew item: the stored one, or guessed from its category text. */
export function homebrewTypeKey(item: Pick<CustomItem, "type" | "category">): string | undefined {
  if (item.type && TYPE_BY_KEY[item.type]) return item.type;
  const text = normalize(item.category);
  if (!text) return undefined;
  return TYPE_GUESS.find(([re]) => re.test(text))?.[1] ?? "other";
}

function normalize(s: string | undefined) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function categoryLabel(item: CatalogItem) {
  const list = item.kind === "magic" ? MAGIC_CATEGORIES : MUNDANE_CATEGORIES;
  return list.find((c) => c.key === item.category)?.label ?? item.category;
}

/** Key numbers of an equipment entry: "1d4 perforante · Sutil, ligera", "CA 16", "Velocidad 60 pies"... */
export function itemStats(item: CatalogItem) {
  return [item.damage, item.ac && `CA ${item.ac}`, item.properties && item.properties !== "-" ? item.properties : "", item.speed && `Velocidad ${item.speed}`, item.capacity]
    .filter(Boolean)
    .join(" · ");
}

/** One-line summary used as the homebrew "Resumen" (max 100 characters). */
export function itemSummary(item: CatalogItem) {
  const text = item.kind === "magic" ? item.type_line || "" : [item.subcategory, itemStats(item)].filter(Boolean).join(" · ");
  return text.length > 100 ? text.slice(0, 99).trimEnd() + "…" : text;
}

/** Color of the homebrew card for a rarity (same palette as the item editor). */
export function rarityColor(key: string | undefined) {
  return rarityInfo(key)?.color ?? RARITIES[0].color;
}

/** Copy of a catalog entry as an editable homebrew item. */
export function catalogToCustomItem(item: CatalogItem): Omit<CustomItem, "id"> {
  const isMagic = item.kind === "magic";
  const extra: string[] = [];
  if (item.strength && item.strength !== "-") extra.push(`**Fuerza:** ${item.strength}`);
  if (item.stealth && item.stealth !== "-") extra.push(`**Sigilo:** ${item.stealth}`);
  if (item.speed) extra.push(`**Velocidad:** ${item.speed}`);
  if (item.capacity) extra.push(`**Capacidad:** ${item.capacity}`);
  return {
    name: item.name,
    shortDescription: itemSummary(item),
    description: [extra.join("\n"), item.desc || ""].filter(Boolean).join("\n\n"),
    value: item.cost || "",
    weight: item.weight || "",
    type: catalogTypeKey(item),
    category: isMagic ? MAGIC_CATEGORIES.find((c) => c.key === item.category)?.singular || item.item_type || "" : item.subcategory || categoryLabel(item),
    rarityKey: catalogRarityKey(item),
    rarity: isMagic ? rarityLabel(item) : "",
    attunement: item.attunement || "",
    damage: item.damage || "",
    properties: item.properties && item.properties !== "-" ? item.properties : "",
    armorClass: item.ac || "",
    color: isMagic ? rarityColor(item.rarities?.[0] ?? item.rarity) : RARITIES[0].color,
    source: item.source === "srd-oficial" ? "SRD 5.1 oficial en español" : "SRD 5.1 en español (Nosolorol)",
  };
}
