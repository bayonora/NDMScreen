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

// Magic item prices follow the DMG 2024: common 100 po, uncommon 400 po, rare 4000 po;
// potions and scrolls cost half.
const scroll = byIndex.get("pergamino-de-conjuro").desc;
const spellService = (key, name, level, price, extra) =>
  custom(key, `Lanzamiento: ${name}`, price, `Servicio de lanzamiento de conjuros (nivel ${level}).${extra ? `\n\n${extra}` : ""}`);

const SHOPS = [
  {
    id: "builtin-general",
    kind: "general",
    name: "La Rosca Asoma",
    ownerName: "Andrei Dumitru",
    items: fromCatalog([
      "pack-de-aventurero", "pack-de-explorador",
      "mochila", "saco-de-dormir", "manta", "tienda-de-campana-para-dos-personas", "raciones-1-dia", "odre", "fiambrera",
      "antorcha", "vela", "lata-de-yesca", "lampara", "aceite-frasco", "linterna-con-capuchon", "linterna-de-ojo-de-buey",
      "cuerda-de-canamo-50-pies", "cuerda-de-seda-50-pies", "garfio-de-escalada", "kit-de-escalada", "piton", "piquetas-de-hierro-10",
      "palanca", "martillo", "pala", "pico-de-minero", "pertiga-10-pies", "escalera-10-pies", "aparejo-de-poleas",
      "espejo-de-acero", "silbato-de-senales", "campana", "tiza-1-trozo", "piedra-de-afilar", "aparejo-de-pesca",
      "cadena-10-pies", "cerradura", "esposas", "abrojos-bolsa-de-20", "bolas-de-metal-bolsa-de-1000", "trampa-de-cazador",
      "saco", "bolsa", "cofre", "cesto", "cubo", "barril", "botella-de-cristal", "vial", "frasco-o-jarra-de-metal", "olla-de-hierro",
      "jabon", "ropa-comun", "ropa-de-viajero", "tunica", "kit-de-sanador",
      ...sub("Herramientas de artesano"), ...sub("Kits y herramientas especiales", ["kit-de-envenenador"]),
      ...sub("Instrumentos musicales"), ...sub("Juegos"),
      ...sub("Símbolos sagrados"), ...sub("Focos arcanos"), ...sub("Focos druídicos"), "bolsa-de-componentes", "libro-de-conjuros", "pack-de-sacerdote",
      "tinta-botella-de-1-onza", "pluma-de-escritura", "pergamino-una-hoja", "papel-una-hoja", "lacre", "estuche-para-mapas-o-pergaminos",
      "libro", "reloj-de-arena", "lente-de-aumento", "abaco",
      ...sub("Monturas y otros animales"), ...sub("Aparejos y vehículos de tracción"),
    ]),
  },
  {
    id: "builtin-forja",
    kind: "forge",
    name: "Iron Maiden",
    ownerName: "Brigit Wayland",
    items: fromCatalog([
      ...sub("Armas cuerpo a cuerpo sencillas"), ...sub("Armas cuerpo a cuerpo marciales"),
      ...sub("Armas a distancia sencillas"), ...sub("Armas a distancia marciales"),
      ...sub("Munición"), "aljaba", "estuche-para-virotes-de-ballesta",
      ...sub("Armadura ligera"), ...sub("Armadura intermedia"), ...sub("Armadura pesada"), ...sub("Escudo"),
    ]),
  },
  {
    id: "builtin-alquimista",
    kind: "potions",
    name: "Starsups",
    ownerName: "Marie-Anne",
    items: [
      ...fromCatalog(["pocion-de-curacion"]),
      custom("pocion-de-curacion-mayor", "Poción de curación mayor", "200 po", "*Poción, infrecuente*\n\nAl beberla recuperas 4d4 + 4 puntos de golpe. El líquido rojo brilla al agitarse."),
      custom("pocion-de-curacion-superior", "Poción de curación superior", "2000 po", "*Poción, rara*\n\nAl beberla recuperas 8d4 + 8 puntos de golpe. El líquido rojo brilla al agitarse.\n\nPocas existencias: el alquimista solo tiene una o dos."),
      spellService("servicio-curar-heridas", "Curar heridas", 1, "50 po", "El objetivo recupera 1d8 + el modificador del lanzador en puntos de golpe."),
      spellService("servicio-restablecimiento-menor", "Restablecimiento menor", 2, "200 po", "Pone fin a una enfermedad o a uno de estos estados: cegado, ensordecido, envenenado o paralizado."),
      spellService("servicio-levantar-maldicion", "Levantar maldición", 3, "300 po", "Pone fin a todas las maldiciones que afectan a una criatura o a un objeto."),
      spellService("servicio-revivir", "Revivir", 3, "600 po", "Incluye los diamantes de 300 po que consume el conjuro. Solo funciona si la criatura murió hace 1 minuto o menos."),
      spellService("servicio-restablecimiento-mayor", "Restablecimiento mayor", 5, "2100 po", "Incluye el polvo de diamante de 100 po. Reduce el agotamiento o pone fin a hechizos, maldiciones, reducciones de característica o de PG máximos."),
      spellService("servicio-alzar-muertos", "Alzar a los muertos", 5, "2500 po", "Incluye el diamante de 500 po. Devuelve la vida a una criatura que lleve muerta 10 días o menos."),
      ...fromCatalog(
        ["pocion-de-trepar", "pocion-de-respirar-bajo-el-agua", "pocion-de-amistad-animal", "pocion-de-crecimiento", "pocion-de-resistencia", "aceite-escurridizo"],
        { "pocion-de-trepar": "50 po", "pocion-de-respirar-bajo-el-agua": "200 po", "pocion-de-amistad-animal": "200 po", "pocion-de-crecimiento": "200 po", "pocion-de-resistencia": "200 po", "aceite-escurridizo": "200 po" },
      ),
      ...fromCatalog([
        "antitoxina-vial", "agua-bendita-frasco", "acido-vial", "fuego-de-alquimista-frasco", "veneno-basico-vial",
        "perfume-vial", "kit-de-herborista", "kit-de-sanador", "suministros-de-alquimista", "kit-de-envenenador", "vial", "botella-de-cristal",
      ]),
      custom("pergamino-truco", "Pergamino de conjuro (truco)", "50 po", `*Pergamino, común*\n\n${scroll}`),
      custom("pergamino-nivel-1", "Pergamino de conjuro (nivel 1)", "50 po", `*Pergamino, común*\n\n${scroll}`),
      custom("pergamino-nivel-2", "Pergamino de conjuro (nivel 2)", "200 po", `*Pergamino, infrecuente*\n\n${scroll}`),
      custom("pergamino-nivel-3", "Pergamino de conjuro (nivel 3)", "200 po", `*Pergamino, infrecuente*\n\n${scroll}`),
      ...fromCatalog(
        ["varita-de-deteccion-magica", "varita-de-secretos", "varita-de-proyectiles-magicos", "bolsa-de-contencion"],
        { "varita-de-deteccion-magica": "400 po", "varita-de-secretos": "400 po", "varita-de-proyectiles-magicos": "400 po", "bolsa-de-contencion": "400 po" },
      ),
      spellService("servicio-identificar", "Identificar", 1, "150 po", "Incluye la perla de 100 po que consume el conjuro. Revela las propiedades de un objeto mágico."),
    ],
  },
];

const out = SHOPS.map(({ items, ...shop }) => ({
  ...shop,
  ownerImage: "",
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
