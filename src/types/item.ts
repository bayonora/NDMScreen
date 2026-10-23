/** An entry of the SRD 5.1 item catalog (src/data/5e-SRD-Items.json). Empty fields are omitted. */
export interface CatalogItem {
  index: string;
  name: string;
  /** "mundane" = ordinary equipment, "magic" = magic items. They are shown in separate lists. */
  kind: "mundane" | "magic";
  /** Category key (see itemLabels.ts); the JSON is already in display order. */
  category: string;
  /** Equipment sub-group, e.g. "Armas cuerpo a cuerpo sencillas" or "Iluminación". */
  subcategory?: string;
  cost?: string;
  weight?: string;
  // Weapons
  damage?: string;
  properties?: string;
  // Armor
  ac?: string;
  strength?: string;
  stealth?: string;
  // Mounts, vehicles and containers
  speed?: string;
  capacity?: string;
  // Magic items
  /** Full line under the name, e.g. "Arma (cualquier espada), rara (requiere sintonización)". */
  type_line?: string;
  /** Item type part of the line: "Objeto maravilloso", "Arma (cualquier espada)"... */
  item_type?: string;
  rarity?: string;
  /** Every rarity the item can have, for "+1, +2 o +3" items and variable rarity. */
  rarities?: string[];
  attunement?: string;
  /** Markdown. */
  desc?: string;
  source: "nosolorol" | "srd-oficial";
}
