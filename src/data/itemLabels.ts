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
    category: isMagic ? MAGIC_CATEGORIES.find((c) => c.key === item.category)?.singular || item.item_type || "" : item.subcategory || categoryLabel(item),
    rarity: isMagic ? rarityLabel(item) : "",
    attunement: item.attunement || "",
    damage: item.damage || "",
    properties: item.properties && item.properties !== "-" ? item.properties : "",
    armorClass: item.ac || "",
    color: isMagic ? rarityColor(item.rarities?.[0] ?? item.rarity) : RARITIES[0].color,
    source: item.source === "srd-oficial" ? "SRD 5.1 oficial en español" : "SRD 5.1 en español (Nosolorol)",
  };
}
