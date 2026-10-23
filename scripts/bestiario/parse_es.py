"""Parse the nosolorol SRD 5.1 (es) bestiary pages into structured JSON.

usage: py -I parse_es.py <pylib> <html_dir> <paths.txt> <out.json>
"""
import sys, os, re, json, unicodedata

sys.path.insert(0, sys.argv[1])
from bs4 import BeautifulSoup, NavigableString, Tag

HTML_DIR, PATHS, OUT = sys.argv[2], sys.argv[3], sys.argv[4]

STAT_LABELS = [
    ("ac", r"clase de armadura"),
    ("hp", r"puntos de golpe"),
    ("speed", r"velocidad"),
    ("saving_throws", r"tiradas? de salvaci[oó]n"),
    ("skills", r"habilidades"),
    ("damage_vulnerabilities", r"vulnerabilidad(es)? al da[ñn]o"),
    ("damage_resistances", r"resistencias? al da[ñn]o"),
    ("damage_immunities", r"inmunidad(es)? al da[ñn]o"),
    ("condition_immunities", r"inmunidad(es)? a (los )?estados"),
    ("senses", r"sentidos"),
    ("languages", r"idiomas"),
    ("challenge", r"desaf[ií]o"),
]
SECTIONS = {"acciones": "actions", "reacciones": "reactions", "acciones legendarias": "legendary_actions"}
SIZES = {
    "diminuto": "Diminuto", "diminuta": "Diminuto", "pequeño": "Pequeño", "pequeña": "Pequeño",
    "mediano": "Mediano", "mediana": "Mediano", "grande": "Grande", "enorme": "Enorme",
    "gargantuesco": "Gargantuesco", "gargantuesca": "Gargantuesco",
}
SPELL_LINE = re.compile(r"^(trucos|a voluntad|\d+\s*/\s*d[ií]a|nivel\b|\d+\.?º? nivel)", re.I)
SIZE_ORDER =["Diminuto", "Pequeño", "Mediano", "Grande", "Enorme", "Gargantuesco"]


def clean(text):
    text = text.replace("\xa0", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def inline_md(node):
    """Render a tag's inline content as Markdown, keeping italics and bold."""
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            out.append(str(ch).replace("*", "\\*"))
        elif isinstance(ch, Tag):
            inner = inline_md(ch)
            if ch.name == "i" or ch.name == "em":
                out.append(wrap(inner, "*"))
            elif ch.name == "b" or ch.name == "strong":
                out.append(wrap(inner, "**"))
            elif ch.name == "br":
                out.append("\n")
            else:
                out.append(inner)
    return "".join(out)


def wrap(text, mark):
    t = text.replace("\xa0", " ")
    stripped = t.strip()
    if not stripped:
        return t
    lead = t[: len(t) - len(t.lstrip())]
    trail = t[len(t.rstrip()):]
    return f"{lead}{mark}{stripped}{mark}{trail}"


def md_clean(text):
    text = text.replace("\xa0", " ").replace("\r", " ")
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Merge adjacent emphasis runs: "*a* *b*" -> "*a b*", "*a**b*" artifacts.
    for _ in range(3):
        text = re.sub(r"\*\*([^*]+)\*\*\s*\*\*([^*]+)\*\*", r"**\1 \2**", text)
        text = re.sub(r"(?<!\*)\*([^*]+)\*(\s*)\*([^*]+)\*(?!\*)", r"*\1\2\3*", text)
    text = re.sub(r"\*\*\s*\*\*", "", text)
    text = re.sub(r"(?<!\*)\*\s*\*(?!\*)", "", text)
    return text


def entry_name(p):
    """If a paragraph starts with an emphasised name ("Mordisco." / "Multiataque."), return (name, rest_md, ends_with_period).

    The name can be split over several bold runs ("<b>Aliento</b></i> <i><b>paralizador.</b>"), so absorb them
    until one ends with a period.
    """
    clone = BeautifulSoup(str(p), "html.parser").p
    parts = []
    while True:
        ch = next((c for c in clone.children if not (isinstance(c, NavigableString) and not c.strip())), None)
        if not isinstance(ch, Tag) or ch.name not in ("i", "b", "em", "strong"):
            break
        bold = ch if ch.name in ("b", "strong") else ch.find(["b", "strong"])
        if bold is None:
            break
        btxt = clean(bold.get_text())
        if ch is not bold and clean(ch.get_text()) == btxt:
            ch.decompose()
        else:
            bold.decompose()
        if not btxt:
            continue
        parts.append(btxt)
        if btxt.endswith((".", ":")):
            break
    if not parts:
        return None
    rest = md_clean(inline_md(clone))
    # A trailing "." may sit outside the bold run, as in "<b>Mordisco</b></i><i>. Ataque".
    period = parts[-1].endswith((".", ":")) or bool(re.match(r"^\**\s*[.:]", rest))
    rest = re.sub(r"^(\*{0,3})\s*[.:]\s*", lambda mm: mm.group(1), rest).strip()
    rest = re.sub(r"^(\*{1,3})\s+", lambda mm: mm.group(1), rest)
    name = " ".join(parts).rstrip(" .:")
    return name, rest, period


def parse_subtitle(text):
    text = clean(text)
    # The alignment follows the last comma that is not inside parentheses: "Humanoide Mediano (humano, cambiaformas), caótico maligno".
    depth, cut = 0, -1
    for i, ch in enumerate(text):
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0:
            cut = i
    alignment = text[cut + 1:].strip() if cut >= 0 else ""
    head = text[:cut].strip() if cut >= 0 else text
    tags = []
    m = re.search(r"\(([^)]+)\)", head)
    if m:
        tags = [t.strip() for t in m.group(1).split(",") if t.strip()]
        head = (head[: m.start()] + head[m.end():]).strip()
    swarm = None
    words = head.split()
    if words and words[0].lower() == "enjambre":
        # "Enjambre Mediano de bestias Diminutas"
        size = SIZES.get(words[1].lower(), words[1])
        swarm = head
        type_ = "Bestia"
        tags = ["enjambre"] + tags
        return {"size": size, "size_label": words[1], "type": type_, "subtype": ", ".join(tags), "alignment": alignment, "swarm": swarm}
    size = ""
    size_label = ""
    rest = []
    for w in words:
        if not size and w.lower() in SIZES:
            size = SIZES[w.lower()]
            size_label = w[:1].upper() + w[1:].lower()
        else:
            rest.append(w)
    type_ = " ".join(rest).strip()
    type_ = type_[:1].upper() + type_[1:]
    return {"size": size, "size_label": size_label, "type": type_, "subtype": ", ".join(tags), "alignment": alignment}


def parse_cr(text):
    m = re.match(r"\s*([\d/]+)\s*\(([\d\s.,]+)\s*PX\)", text)
    if not m:
        m2 = re.match(r"\s*([\d/]+)", text)
        cr = m2.group(1) if m2 else text
        xp = None
    else:
        cr, xp = m.group(1), int(re.sub(r"[^\d]", "", m.group(2)))
    if "/" in cr:
        a, b = cr.split("/")
        val = int(a) / int(b)
    else:
        val = float(cr)
    return cr, val, xp


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def parse_page(path):
    html = open(os.path.join(HTML_DIR, path.replace("/", "_")), encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    col = soup.select("#mainContent > div.row > div.col")[0]
    m = {
        "index": None, "name": None, "category": path.split("/")[0], "size": "", "type": "", "subtype": "",
        "alignment": "", "desc": [], "ac": None, "ac_desc": "", "hp": None, "hit_dice": "", "speed": "",
        "stats": None, "saving_throws": "", "skills": "", "damage_vulnerabilities": "", "damage_resistances": "",
        "damage_immunities": "", "condition_immunities": "", "senses": "", "languages": "",
        "cr": "", "cr_value": None, "xp": None, "traits": [], "actions": [], "reactions": [],
        "legendary_desc": "", "legendary_actions": [], "notes": [], "warnings": [],
    }
    section = None  # None = before stats; "traits" after the first stat line
    seen_subtitle = False
    current_note = None
    for el in col.children:
        if not isinstance(el, Tag):
            continue
        if re.match(r"^h[1-6]$", el.name):
            t = clean(el.get_text())
            if t and m["name"] is None:
                m["name"] = t
            elif t:
                # A sub-heading after the stat block starts a notes section.
                current_note = {"name": t, "desc": ""}
                m["notes"].append(current_note)
                section = "notes"
            continue
        if el.name == "table":
            rows = el.find_all("tr")
            vals = [clean(td.get_text()) for td in rows[1].find_all("td")] if len(rows) > 1 else []
            nums = [int(re.match(r"-?\d+", v).group(0)) for v in vals if re.match(r"-?\d+", v)]
            if len(nums) == 6:
                m["stats"] = dict(zip(["STR", "DEX", "CON", "INT", "WIS", "CHA"], nums))
            else:
                m["warnings"].append(f"stats table {vals}")
            continue
        if el.name == "ul":
            items = [md_clean(inline_md(li)) for li in el.find_all(["li", "p"], recursive=False)]
            items = [i for i in items if i]
            text = "\n".join(f"- {i}" for i in items)
            target = current_note or (m[section][-1] if section in ("traits", "actions", "reactions", "legendary_actions") and m[section] else None)
            if target is not None:
                target["desc"] += ("\n" if target["desc"] else "") + text
            else:
                m["desc"].append(text)
            continue
        if el.name != "p":
            continue
        text = clean(el.get_text())
        if not text or text.startswith("###"):
            continue
        if not seen_subtitle and m["name"] is not None:
            m.update({k: v for k, v in parse_subtitle(text).items() if k != "swarm"})
            seen_subtitle = True
            continue
        low = text.lower().rstrip(" .:")
        if low in SECTIONS and el.find(["b", "strong"]):
            section = SECTIONS[low]
            current_note = None
            continue
        # Stat lines: "<b>Label:</b> value"
        matched = False
        b = el.find(["b", "strong"])
        if section in (None, "stats"):
            for key, rx in STAT_LABELS:
                mm = re.match(r"^(" + rx + r")\s*:?\s*", text, re.I)
                # Before the stat block only bold labels count (lore text may start with any word);
                # inside it, the source sometimes forgets the bold ("Puntos de golpe 27 (6d8)").
                # The bold run must be exactly the label: "Sentidos ciegos." is a trait, not "Sentidos:".
                bold_label = bool(mm) and b is not None and re.fullmatch(rx, clean(b.get_text()).rstrip(" :.").lower()) is not None
                if mm and (bold_label or (section == "stats" and b is None and not el.find("i"))):
                    val = text[mm.end():].strip()
                    if key == "ac":
                        n = re.match(r"(\d+)\s*(?:\((.*)\))?\s*(.*)", val)
                        m["ac"] = int(n.group(1)) if n else None
                        m["ac_desc"] = ", ".join(x for x in [n.group(2) or "", n.group(3) or ""] if x).strip(", ") if n else val
                    elif key == "hp":
                        n = re.match(r"(\d+)\s*(?:\((.*?)\))?", val)
                        m["hp"] = int(n.group(1)) if n else None
                        m["hit_dice"] = re.sub(r"\s+", "", n.group(2)) if n and n.group(2) else ""
                    elif key == "challenge":
                        m["cr"], m["cr_value"], m["xp"] = parse_cr(val)
                    else:
                        m[key] = val
                    if section is None:
                        section = "stats"
                    matched = True
                    break
        if matched:
            continue
        en = entry_name(el)
        if section == "stats" and not en and m["senses"] and not m["languages"] and not m["cr"]:
            # Unlabelled languages line (Dríada).
            m["languages"] = text
            continue
        if section == "stats":
            section = "traits"
        if section is None:
            m["desc"].append(md_clean(inline_md(el)))
            continue
        if section == "notes":
            current_note["desc"] += ("\n\n" if current_note["desc"] else "") + md_clean(inline_md(el))
            continue
        if en and re.match(r"^variante", en[0], re.I):
            current_note = {"name": en[0], "desc": en[1]}
            m["notes"].append(current_note)
            section = "notes"
            continue
        if en and not en[1] and not en[2] and section in ("traits", "actions", "reactions", "legendary_actions"):
            # A bold heading with no text, like a sidebar title ("Monstruos y razas jugables").
            current_note = {"name": en[0], "desc": ""}
            m["notes"].append(current_note)
            section = "notes"
            continue
        if en and m[section] and SPELL_LINE.match(en[0]):
            # "A voluntad: luz, mano de mago" belongs to the spellcasting entry above.
            m[section][-1]["desc"] += f"\n**{en[0]}:** {en[1]}"
            continue
        if en:
            m[section].append({"name": en[0], "desc": en[1]})
            continue
        body = md_clean(inline_md(el))
        if section == "legendary_actions" and not m["legendary_actions"]:
            m["legendary_desc"] += (" " if m["legendary_desc"] else "") + body
        elif m[section]:
            last = m[section][-1]
            last["desc"] += "\n" + body
        else:
            m["warnings"].append(f"orphan paragraph in {section}: {body[:60]}")
            m["desc"].append(body)
    m["index"] = slug(m["name"])
    m["desc"] = "\n\n".join(m["desc"])
    m["hit_dice"] = re.sub(r"[−–—]", "-", m["hit_dice"])
    # Some pages forget the "Acciones" heading: the attacks then sit at the end of the traits.
    if not m["actions"]:
        first_attack = next((i for i, t in enumerate(m["traits"]) if re.search(r"Ataque (de arma|de conjuro|con arma)", t["desc"]) or t["name"].lower() == "multiataque"), None)
        if first_attack is not None:
            m["actions"] = m["traits"][first_attack:]
            m["traits"] = m["traits"][:first_attack]
            m["warnings"].append("actions heading missing: moved attacks out of traits")
    if m["ac"] is None:
        m["warnings"].append("no AC")
    if m["hp"] is None:
        m["warnings"].append("no HP")
    if m["stats"] is None:
        m["warnings"].append("no stats")
    if not m["actions"]:
        m["warnings"].append("no actions")
    m["source"] = "https://srd.nosolorol.com/DD5/" + path
    return m


paths = open(PATHS, encoding="utf-8").read().split()
result, failed = [], []
for p in paths:
    if not os.path.exists(os.path.join(HTML_DIR, p.replace("/", "_"))):
        failed.append((p, "missing"))
        continue
    try:
        result.append(parse_page(p))
    except Exception as e:
        import traceback
        failed.append((p, traceback.format_exc()))
json.dump(result, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("parsed", len(result), "failed", len(failed))
for f in failed:
    print("FAIL", f[0], f[1][-400:])
for r in result:
    if r["warnings"]:
        print("WARN", r["name"], r["warnings"])
