// Builds src/data/defaultShops.json: the fixed shops of the Tiendas view.
// Most items come from the SRD catalog (src/data/5e-SRD-Items.json), so names, prices and rules
// text match the Objetos view; services, lodging and a few magic items are written here.
// Run: node scripts/tiendas/build_shops.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalog = JSON.parse(readFileSync(join(root, "src/data/5e-SRD-Items.json"), "utf8"));
const byIndex = new Map(catalog.map((i) => [i.index, i]));

const RARITY = { common: "común", uncommon: "infrecuente", rare: "rara", "very-rare": "muy rara", legendary: "legendaria" };

/** Rules text of a catalog item: its stats line, then the description. */
function describe(item) {
  const stats = [
    item.type_line && `*${item.type_line}*`,
    item.damage && `**Daño:** ${item.damage}`,
    item.properties && `**Propiedades:** ${item.properties}`,
    item.ac && `**CA:** ${item.ac}`,
    item.strength && `**Fuerza:** ${item.strength}`,
    item.stealth && `**Sigilo:** ${item.stealth}`,
    item.speed && `**Velocidad:** ${item.speed}`,
    item.capacity && `**Capacidad:** ${item.capacity}`,
    item.weight && `**Peso:** ${item.weight}`,
  ].filter(Boolean);
  return [stats.join(" · "), item.desc].filter(Boolean).join("\n\n") || item.subcategory || "";
}

/** Catalog items by index. `price` overrides the cost (magic items have none). */
function fromCatalog(indexes, prices = {}) {
  return indexes.map((index) => {
    const item = byIndex.get(index);
    if (!item) throw new Error(`No existe en el catálogo: ${index}`);
    const price = prices[index] ?? item.cost;
    if (!price) throw new Error(`Sin precio: ${index}`);
    return { key: index, name: item.name, price, description: describe(item) };
  });
}

/** Every catalog item of a subcategory, in catalog order. */
const sub = (subcategory, except = []) =>
  catalog.filter((i) => i.kind === "mundane" && i.subcategory === subcategory && !except.includes(i.index)).map((i) => i.index);

const custom = (key, name, price, description) => ({ key, name, price, description });

/** Puts the items under a category: the shop shows them together, in a section of their own. */
const group = (category, items) => items.map((item) => ({ ...item, category }));

// Magic item prices follow the DMG 2024: common 100 po, uncommon 400 po, rare 4000 po;
// potions and scrolls cost half.
const scroll = byIndex.get("pergamino-de-conjuro").desc;
const spellService = (key, name, level, price, extra) =>
  custom(key, `Lanzamiento: ${name}`, price, `Servicio de lanzamiento de conjuros (nivel ${level}).${extra ? `\n\n${extra}` : ""}`);

const SHOPS = [
  {
    id: "builtin-general",
    kind: "general",
    name: "La Roska",
    ownerName: "Chiftele Dumitru",
    items: [
      ...group("Packs de equipo", fromCatalog(["pack-de-aventurero", "pack-de-explorador", "pack-de-sacerdote"])),
      ...group("Viaje y acampada", fromCatalog(["mochila", "saco-de-dormir", "manta", "tienda-de-campana-para-dos-personas", "raciones-1-dia", "odre", "fiambrera", "aparejo-de-pesca"])),
      ...group("Iluminación", fromCatalog(["antorcha", "vela", "lata-de-yesca", "lampara", "aceite-frasco", "linterna-con-capuchon", "linterna-de-ojo-de-buey"])),
      ...group("Escalada y herramientas", fromCatalog([
        "cuerda-de-canamo-50-pies", "cuerda-de-seda-50-pies", "garfio-de-escalada", "kit-de-escalada", "piton", "piquetas-de-hierro-10",
        "palanca", "martillo", "pala", "pico-de-minero", "pertiga-10-pies", "escalera-10-pies", "aparejo-de-poleas",
      ])),
      ...group("Útiles de aventura", fromCatalog([
        "kit-de-sanador", "espejo-de-acero", "silbato-de-senales", "campana", "tiza-1-trozo", "piedra-de-afilar",
        "cadena-10-pies", "cerradura", "esposas", "abrojos-bolsa-de-20", "bolas-de-metal-bolsa-de-1000", "trampa-de-cazador",
      ])),
      ...group("Recipientes", fromCatalog(["saco", "bolsa", "cofre", "cesto", "cubo", "barril", "botella-de-cristal", "vial", "frasco-o-jarra-de-metal", "olla-de-hierro"])),
      ...group("Ropa y aseo", fromCatalog(["ropa-comun", "ropa-de-viajero", "tunica", "jabon"])),
      ...group("Escritura y estudio", fromCatalog([
        "tinta-botella-de-1-onza", "pluma-de-escritura", "pergamino-una-hoja", "papel-una-hoja", "lacre", "estuche-para-mapas-o-pergaminos",
        "libro", "reloj-de-arena", "lente-de-aumento", "abaco",
      ])),
      ...group("Herramientas de artesano", fromCatalog(sub("Herramientas de artesano"))),
      ...group("Kits y herramientas especiales", fromCatalog(sub("Kits y herramientas especiales", ["kit-de-envenenador"]))),
      ...group("Instrumentos musicales", fromCatalog(sub("Instrumentos musicales"))),
      ...group("Juegos", fromCatalog(sub("Juegos"))),
      ...group("Focos y símbolos sagrados", fromCatalog([
        ...sub("Símbolos sagrados"), ...sub("Focos arcanos"), ...sub("Focos druídicos"), "bolsa-de-componentes", "libro-de-conjuros",
      ])),
      ...group("Monturas y animales", fromCatalog(sub("Monturas y otros animales"))),
      ...group("Aparejos y vehículos", fromCatalog(sub("Aparejos y vehículos de tracción"))),
    ],
  },
  {
    id: "builtin-forja",
    kind: "forge",
    name: "Iron Maiden",
    ownerName: "Brigit Fireforge",
    items: [
      ...group("Armas cuerpo a cuerpo sencillas", fromCatalog(sub("Armas cuerpo a cuerpo sencillas"))),
      ...group("Armas cuerpo a cuerpo marciales", fromCatalog(sub("Armas cuerpo a cuerpo marciales"))),
      ...group("Armas a distancia sencillas", fromCatalog(sub("Armas a distancia sencillas"))),
      ...group("Armas a distancia marciales", fromCatalog(sub("Armas a distancia marciales"))),
      ...group("Munición", fromCatalog([...sub("Munición"), "aljaba", "estuche-para-virotes-de-ballesta"])),
      ...group("Armaduras ligeras", fromCatalog(sub("Armadura ligera"))),
      ...group("Armaduras intermedias", fromCatalog(sub("Armadura intermedia"))),
      ...group("Armaduras pesadas", fromCatalog(sub("Armadura pesada"))),
      ...group("Escudos", fromCatalog(sub("Escudo"))),
    ],
  },
  {
    id: "builtin-alquimista",
    kind: "potions",
    name: "Starsups",
    ownerName: "Marie-Anne",
    items: [
      ...group("Pociones de curación", [
      ...fromCatalog(["pocion-de-curacion"]),
      custom("pocion-de-curacion-mayor", "Poción de curación mayor", "200 po", "*Poción, infrecuente*\n\nAl beberla recuperas 4d4 + 4 puntos de golpe. El líquido rojo brilla al agitarse."),
      custom("pocion-de-curacion-superior", "Poción de curación superior", "2000 po", "*Poción, rara*\n\nAl beberla recuperas 8d4 + 8 puntos de golpe. El líquido rojo brilla al agitarse.\n\nPocas existencias: el alquimista solo tiene una o dos."),
      ]),
      ...group("Otras pociones", fromCatalog(
        ["pocion-de-trepar", "pocion-de-respirar-bajo-el-agua", "pocion-de-amistad-animal", "pocion-de-crecimiento", "pocion-de-resistencia", "aceite-escurridizo"],
        { "pocion-de-trepar": "50 po", "pocion-de-respirar-bajo-el-agua": "200 po", "pocion-de-amistad-animal": "200 po", "pocion-de-crecimiento": "200 po", "pocion-de-resistencia": "200 po", "aceite-escurridizo": "200 po" },
      )),
      ...group("Servicios de conjuros", [
      spellService("servicio-curar-heridas", "Curar heridas", 1, "50 po", "El objetivo recupera 1d8 + el modificador del lanzador en puntos de golpe."),
      spellService("servicio-restablecimiento-menor", "Restablecimiento menor", 2, "200 po", "Pone fin a una enfermedad o a uno de estos estados: cegado, ensordecido, envenenado o paralizado."),
      spellService("servicio-levantar-maldicion", "Levantar maldición", 3, "300 po", "Pone fin a todas las maldiciones que afectan a una criatura o a un objeto."),
      spellService("servicio-revivir", "Revivir", 3, "600 po", "Incluye los diamantes de 300 po que consume el conjuro. Solo funciona si la criatura murió hace 1 minuto o menos."),
      spellService("servicio-restablecimiento-mayor", "Restablecimiento mayor", 5, "2100 po", "Incluye el polvo de diamante de 100 po. Reduce el agotamiento o pone fin a hechizos, maldiciones, reducciones de característica o de PG máximos."),
      spellService("servicio-alzar-muertos", "Alzar a los muertos", 5, "2500 po", "Incluye el diamante de 500 po. Devuelve la vida a una criatura que lleve muerta 10 días o menos."),
      spellService("servicio-identificar", "Identificar", 1, "150 po", "Incluye la perla de 100 po que consume el conjuro. Revela las propiedades de un objeto mágico."),
      ]),
      ...group("Sustancias y suministros", fromCatalog([
        "antitoxina-vial", "agua-bendita-frasco", "acido-vial", "fuego-de-alquimista-frasco", "veneno-basico-vial",
        "perfume-vial", "kit-de-herborista", "kit-de-sanador", "suministros-de-alquimista", "kit-de-envenenador", "vial", "botella-de-cristal",
      ])),
      ...group("Pergaminos de conjuro", [
      custom("pergamino-truco", "Pergamino de conjuro (truco)", "50 po", `*Pergamino, común*\n\n${scroll}`),
      custom("pergamino-nivel-1", "Pergamino de conjuro (nivel 1)", "50 po", `*Pergamino, común*\n\n${scroll}`),
      custom("pergamino-nivel-2", "Pergamino de conjuro (nivel 2)", "200 po", `*Pergamino, infrecuente*\n\n${scroll}`),
      custom("pergamino-nivel-3", "Pergamino de conjuro (nivel 3)", "200 po", `*Pergamino, infrecuente*\n\n${scroll}`),
      ]),
      ...group("Objetos mágicos", fromCatalog(
        ["varita-de-deteccion-magica", "varita-de-secretos", "varita-de-proyectiles-magicos", "bolsa-de-contencion"],
        { "varita-de-deteccion-magica": "400 po", "varita-de-secretos": "400 po", "varita-de-proyectiles-magicos": "400 po", "bolsa-de-contencion": "400 po" },
      )),
    ],
  },
];

// Merchant portraits, in public/tiendas/: the full image (shop panel) and a crop for the card.
// Relative paths, because the app is built with base "./".
const IMAGES = {
  "builtin-general": { ownerImage: "tiendas/la-roska.webp", previewImage: "tiendas/la-roska-card.webp" },
  "builtin-forja": { ownerImage: "tiendas/iron-maiden.webp", previewImage: "tiendas/iron-maiden-card.webp" },
  "builtin-alquimista": { ownerImage: "tiendas/starsups.webp", previewImage: "tiendas/starsups-card.webp" },
};

const out = SHOPS.map(({ items, ...shop }) => ({
  ...shop,
  ownerImage: "",
  ...IMAGES[shop.id],
  items: items.map(({ key, ...item }) => ({ id: `${shop.id}--${key}`, ...item, hidden: false })),
}));

for (const shop of out) {
  const ids = new Set();
  for (const it of shop.items) {
    if (ids.has(it.id)) throw new Error(`Objeto repetido en ${shop.id}: ${it.id}`);
    ids.add(it.id);
  }
}

writeFileSync(join(root, "src/data/defaultShops.json"), JSON.stringify(out));
console.log(out.map((s) => `${s.name}: ${s.items.length} objetos`).join("\n"));
