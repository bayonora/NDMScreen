"""Parse the nosolorol SRD 5.1 (es) equipment pages into catalog items.

usage: py -I parse_equipment.py <pylib> <html_dir> <out.json>
The html_dir holds eq_<page>.html for: armadura, armas, equipo_de_aventuras, herramientas,
monturas_y_vehiculos, packs_iniciales, productos_comerciales.
"""
import sys, os, re, json, unicodedata

sys.path.insert(0, sys.argv[1])
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup, NavigableString, Tag

HTML, OUT = sys.argv[2], sys.argv[3]
SOURCE = "https://srd.nosolorol.com/DD5/equipamiento/"


def clean(t):
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip()


def norm(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]+", " ", t).strip()


def slug(t):
    return re.sub(r"\s+", "-", norm(t))


def inline_md(node):
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            out.append(str(ch).replace("*", "\\*"))
        elif ch.name in ("i", "em"):
            inner = inline_md(ch).strip()
            out.append(f" *{inner}* " if inner else " ")
        elif ch.name in ("b", "strong"):
            inner = inline_md(ch).strip()
            out.append(f" **{inner}** " if inner else " ")
        elif ch.name == "br":
            out.append("\n")
        else:
            out.append(inline_md(ch))
    s = "".join(out)
    s = re.sub(r"[ \t\r\n]+", " ", s).strip()
    return re.sub(r"\s+([.,;:)])", r"\1", s)


def soup(page):
    s = BeautifulSoup(open(os.path.join(HTML, f"eq_{page}.html"), encoding="utf-8").read(), "html.parser")
    return s.select("#mainContent > div.row > div.col")[0]


def described(col):
    """Paragraphs that start with a bold "Name." -> {normalized name: (name, markdown text)}."""
    out = {}
    for p in col.find_all("p"):
        b = p.find(["b", "strong"])
        if not b or p.contents[0] is not b and clean(str(p.contents[0])) != "":
            continue
        name = clean(b.get_text()).rstrip(".:")
        rest = p.__copy__()
        rb = rest.find(["b", "strong"])
        rb.decompose()
        text = inline_md(rest).lstrip(".: ")
        if text:
            out[norm(name)] = (name, text)
    return out


def tables(col):
    """Each table as (title, header, rows), where the title is the bold paragraph right before it."""
    result = []
    for t in col.find_all("table"):
        prev = t.find_previous_sibling("p")
        title = clean(prev.get_text()) if prev is not None else ""
        rows = [[clean(td.get_text()) for td in tr.find_all(["td", "th"])] for tr in t.find_all("tr")]
        result.append((title, rows[0], rows[1:]))
    return result


def lookup(descs, name):
    """Find the description for a table row name: exact, then the longest description name that prefixes it."""
    n = norm(name)
    if n in descs:
        return descs[n][1]
    best = None
    for k in descs:
        if n.startswith(k + " ") or n == k:
            if best is None or len(k) > len(best):
                best = k
    return descs[best][1] if best else ""


items = []


def add(**kw):
    kw = {k: v for k, v in kw.items() if v not in ("", None, "-", "—")}
    kw["index"] = slug(kw["name"]) + ("-" + slug(kw["subcategory"]) if kw.get("dup_key") else "")
    kw.pop("dup_key", None)
    kw["kind"] = "mundane"
    items.append(kw)


# ---------------------------------------------------------------- Armaduras
col = soup("armadura")
descs = described(col)
title, head, rows = tables(col)[0]
sub = ""
SUB_NOTE = {
    "Armadura ligera": "Armadura ligera: se suma el modificador por Destreza completo a la CA.",
    "Armadura intermedia": "Armadura intermedia: se suma el modificador por Destreza a la CA, hasta un máximo de +2.",
    "Armadura pesada": "Armadura pesada: no se suma el modificador por Destreza a la CA (pero tampoco se resta si es negativo).",
}
DON = {"Armadura ligera": ("1 minuto", "1 minuto"), "Armadura intermedia": ("5 minutos", "1 minuto"),
       "Armadura pesada": ("10 minutos", "5 minutos"), "Escudo": ("1 acción", "1 acción")}
for r in rows:
    if not r[1]:
        sub = r[0]
        continue
    name = r[0]
    s = "Escudo" if name == "Escudo" else sub
    desc = lookup(descs, name)
    extra = []
    if name == "Escudo":
        desc = lookup(descs, "Escudos")
    else:
        extra.append(SUB_NOTE[sub])
    if r[3] not in ("-", ""):
        extra.append(f"Si tu Fuerza es inferior a {r[3].replace('Fue ', '')}, tu velocidad se reduce en 10 pies.")
    if r[4].lower().startswith("desventaja"):
        extra.append("Tienes desventaja en las pruebas de Destreza (Sigilo) mientras la llevas.")
    don, doff = DON[s]
    extra.append(f"Ponérsela: {don}. Quitársela: {doff}.")
    add(name=name, category="armor", subcategory=s, cost=r[1], ac=r[2].replace("modificador por Destreza", "mod. Des"),
        strength=r[3], stealth=r[4], weight=r[5], desc="\n\n".join(x for x in [desc] + extra if x))

# ---------------------------------------------------------------- Armas
col = soup("armas")
descs = described(col)
props = {k: v for k, v in descs.items()}  # property glossary lives in the same bold paragraphs
title, head, rows = tables(col)[0]
sub = ""
PROP_KEYS = ["alcance", "arrojadiza", "de carga", "distancia", "dos manos", "especial", "ligera", "municion", "pesada", "sutil", "versatil"]
for r in rows:
    if not r[1]:
        sub = r[0]
        continue
    name = "Cerbatana" if r[0] == "Aguja de cerbatana" else r[0]  # source typo: the weapon is the blowgun
    lines = []
    special = lookup(descs, name) if norm(name) in ("lanza de caballeria", "red") else ""
    if special:
        lines.append(special)
    found = []
    for pk in PROP_KEYS:
        if re.search(r"\b" + pk + r"\b", norm(re.sub(r"\(.*?\)", "", r[4]))):
            if pk == "municion":
                found.append(("Munición", props.get("municion", ("", ""))[1]))
            elif pk in props:
                found.append((props[pk][0], props[pk][1]))
    # "distancia" is implied by "alcance 80/320" in the table, the glossary entry explains the numbers.
    if re.search(r"\d+/\d+", r[4]) and "distancia" in props and not any(f[0].lower() == "distancia" for f in found):
        found.append((props["distancia"][0], props["distancia"][1]))
    if found:
        lines.append("\n".join(f"- **{n}.** {t}" for n, t in found if t))
    add(name=name, category="weapon", subcategory=sub, cost=r[1], damage=r[2], weight=r[3], properties=r[4],
        desc="\n\n".join(lines))

# ---------------------------------------------------------------- Equipo de aventuras
GEAR_GROUPS = [
    ("Munición", ["agujas de cerbatanas", "balas para honda", "flechas", "virotes de ballesta"]),
    ("Focos arcanos", ["foco arcano:*"]),
    ("Focos druídicos", ["foco druidico:*"]),
    ("Símbolos sagrados", ["simbolo sagrado:*"]),
    ("Magia y estudio", ["bolsa de componentes", "libro de conjuros", "libro", "papel", "pergamino", "tinta", "pluma de escritura", "lacre", "anillo de sello", "abaco", "tiza", "estuche para mapas o pergaminos"]),
    ("Pociones y alquimia", ["pocion de curacion", "antitoxina", "acido", "agua bendita", "fuego de alquimista", "veneno basico", "perfume", "jabon"]),
    ("Iluminación", ["antorcha", "vela", "lampara", "linterna con capuchon", "linterna de ojo de buey", "aceite", "lata de yesca"]),
    ("Exploración y escalada", ["cuerda de canamo", "cuerda de seda", "garfio de escalada", "kit de escalada", "escalera", "pertiga", "piton", "piquetas de hierro", "pala", "pico de minero", "palanca", "martillo", "mazo", "aparejo de poleas", "ariete portatil", "catalejo", "lente de aumento", "espejo de acero", "reloj de arena", "silbato de senales", "campana"]),
    ("Trampas y seguridad", ["abrojos", "bolas de metal", "trampa de cazador", "cadena", "esposas", "cerradura"]),
    ("Contenedores", ["mochila", "bolsa", "saco", "cesto", "cofre", "barril", "cubo", "odre", "botella de cristal", "frasco o jarra de metal", "jarro o jarra", "vial", "olla de hierro", "aljaba", "estuche para virotes de ballesta"]),
    ("Campamento y viaje", ["saco de dormir", "manta", "tienda de campana para dos personas", "raciones", "fiambrera", "aparejo de pesca", "kit de sanador", "balanza de mercader", "piedra de afilar"]),
    ("Ropa", ["ropa comun", "ropa de viajero", "ropa fina", "ropa de disfraz", "tunica"]),
]
col = soup("equipo_de_aventuras")
descs = described(col)
(_, _, gear_rows), (_, _, cap_rows) = tables(col)[:2]
capacity = {norm(r[0].rstrip("*")): r[1] for r in cap_rows}
capacity["cesto"] = capacity.get("cesta", "")
FIXES = {"tienda de campana para dos personas": {"weight": "20 lb"}}
parent = ""
gear = []
for r in gear_rows:
    if not r[1] and not r[2]:
        parent = r[0]
        continue
    nm = norm(r[0])
    is_child = parent and nm in ("baston", "cetro", "cristal", "orbe", "varita", "baston de madera", "ramo de muerdago", "totem",
                                 "varita de tejo", "amuleto", "emblema", "relicario", "agujas de cerbatanas 50",
                                 "balas para honda 20", "flechas 20", "virotes de ballesta 20")
    if not is_child:
        parent = ""
    gear.append((parent if is_child else "", r))


def gear_group(par, name):
    n = norm(name)
    for label, keys in GEAR_GROUPS:
        for k in keys:
            if k.endswith(":*") and par and norm(par) == k[:-2]:
                return label
            if not k.endswith(":*") and (n == k or n.startswith(k + " ")):
                return label
    return None


ordered = {label: [] for label, _ in GEAR_GROUPS}
for par, r in gear:
    g = gear_group(par, r[0])
    if g is None:
        print("WARN gear without group:", r[0])
        g = "Exploración y escalada"
    ordered[g].append((par, r))
for label, _ in GEAR_GROUPS:
    for par, r in ordered[label]:
        name = f"{par}: {r[0].lower()}" if par in ("Foco arcano", "Foco druídico") else (f"{r[0]} (símbolo sagrado)" if par == "Símbolo sagrado" else r[0])
        desc = lookup(descs, par) if par else lookup(descs, r[0])
        if not desc and norm(r[0]).startswith("cuerda"):
            desc = lookup(descs, "Cuerda")
        cap = capacity.get(norm(re.sub(r"\(.*?\)", "", r[0])), "")
        fix = FIXES.get(norm(r[0]), {})
        add(name=name, category="gear", subcategory=label, cost=r[1], weight=fix.get("weight", r[2]), capacity=cap,
            desc=desc)

# ---------------------------------------------------------------- Packs de equipo
col = soup("packs_iniciales")
for p in col.find_all("p"):
    b = p.find(["b", "strong"])
    if not b:
        continue
    m = re.match(r"(.+?)\s*\(([^)]+)\)\.?$", clean(b.get_text()))
    if not m:
        continue
    rest = p.__copy__()
    rest.find(["b", "strong"]).decompose()
    add(name=m.group(1), category="pack", subcategory="Packs de equipo", cost=m.group(2), desc=inline_md(rest).lstrip(".: "))

# ---------------------------------------------------------------- Herramientas
col = soup("herramientas")
descs = described(col)
_, _, rows = tables(col)[0]
parent = ""
TOOL_GROUP = {"Herramientas de artesano": "Herramientas de artesano", "Instrumento musical": "Instrumentos musicales", "Juegos": "Juegos"}
CHILD_OF = {}
for r in rows:
    if not r[1]:
        parent = r[0]
        continue
    n = norm(r[0])
    if parent == "Herramientas de artesano" and not (n.startswith("herramientas de") or n.startswith("suministros") or n.startswith("utensilios")):
        parent = ""
    if parent == "Herramientas de artesano" and n in ("herramientas de ladron", "herramientas de navegante"):
        parent = ""
    if parent == "Instrumento musical" and n.startswith(("juego", "kit")):
        parent = ""
    if parent == "Juegos" and not n.startswith("juego"):
        parent = ""
    if r[1] == "*":
        continue  # "Vehículos (terrestre o acuático)": see Monturas y vehículos
    sub = TOOL_GROUP.get(parent, "Kits y herramientas especiales")
    desc = lookup(descs, parent) if parent else lookup(descs, r[0])
    add(name=r[0], category="tools", subcategory=sub, cost=r[1], weight=r[2], desc=desc)
# keep the manual's grouping order: artisan tools, kits, instruments, games
TOOL_ORDER = ["Herramientas de artesano", "Kits y herramientas especiales", "Instrumentos musicales", "Juegos"]

# ---------------------------------------------------------------- Monturas y vehículos
col = soup("monturas_y_vehiculos")
descs = described(col)
(t1, _, mounts), (t2, _, tack), (t3, _, boats) = tables(col)[:3]
for r in mounts:
    add(name=r[0], category="mounts", subcategory="Monturas y otros animales", cost=r[1], speed=r[2], capacity=f"{r[3]} de carga")
parent = ""
for r in tack:
    if not r[1]:
        parent = r[0]
        continue
    if parent and norm(r[0]) not in ("de carga", "de montar", "exotica", "militar"):
        parent = ""
    name = f"Silla de montar {r[0].lower()}" if parent else r[0]
    desc = lookup(descs, "Sillas de montar") if parent else lookup(descs, "Bardas" if r[0] == "Barda" else r[0])
    cost, weight = r[1], r[2]
    if r[0] == "Barda":
        cost, weight = "×4 el precio de la armadura", "×2 el peso de la armadura"
    add(name=name, category="mounts", subcategory="Aparejos y vehículos de tracción", cost=cost, weight=weight, desc=desc)
for r in boats:
    desc = lookup(descs, "Embarcaciones de remos") if norm(r[0]) in ("bote de remos", "nave larga") else ""
    add(name=r[0], category="mounts", subcategory="Vehículos acuáticos", cost=r[1], speed=r[2], desc=desc)

# ---------------------------------------------------------------- Productos comerciales
col = soup("productos_comerciales")
_, _, rows = tables(col)[0]
for r in rows:
    text = r[1].replace("clavo no 1 cerdo", "clavo o 1 cerdo").replace("pimiento, o", "pimienta o")
    unit = ""
    for part in re.split(r",? o ", text):
        part = part.strip()
        if part.startswith("1 lb de"):
            unit = "1 lb de "
        elif not part.startswith("1 ") and unit:
            part = unit + part  # "1 lb de canela o pimienta": the pepper is also by the pound
        if part.startswith("1 lb de") and " de " in part:
            name = part[len("1 lb de "):].capitalize() + " (1 lb)"
        elif part.startswith("1 yarda cuadrada de"):
            name = part[len("1 yarda cuadrada de "):].capitalize() + " (1 yarda cuadrada)"
        elif part.startswith("1 "):
            name = part[2:].capitalize()
        else:
            name = part.capitalize()
        add(name=name, category="trade", subcategory="Productos comerciales", cost=r[0])

# ---------------------------------------------------------------- order + output
CAT_ORDER = ["armor", "weapon", "gear", "pack", "tools", "mounts", "trade"]
SUB_ORDER = {"tools": TOOL_ORDER}
def sort_key(i, it):
    cat = CAT_ORDER.index(it["category"])
    subs = SUB_ORDER.get(it["category"])
    sub = subs.index(it["subcategory"]) if subs and it.get("subcategory") in subs else 0
    return (cat, sub, i)
items = [it for _, it in sorted(enumerate(items), key=lambda p: sort_key(*p))]
seen = {}
for it in items:
    if it["index"] in seen:
        seen[it["index"]] += 1
        it["index"] += f"-{seen[it['index']]}"
    else:
        seen[it["index"]] = 1
    it["source"] = "nosolorol"
TEXT_FIXES = [("prueba de Fortaleza", "prueba de Fuerza"), ("modificador por Fuera", "modificador por Fuerza")]
for it in items:
    for a, b in TEXT_FIXES:
        if "desc" in it:
            it["desc"] = it["desc"].replace(a, b)
json.dump(items, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
import collections
print("items", len(items), collections.Counter(i["category"] for i in items))
print("without desc:", [i["name"] for i in items if not i.get("desc") and i["category"] not in ("trade", "mounts")])
