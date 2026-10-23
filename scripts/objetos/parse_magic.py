"""Parse the magic items (A-Z + artifacts) from the official Spanish SRD 5.1 PDF.

usage: py -I parse_magic.py <pylib> <SRD_CC_v5.1_ES.pdf> <out.json>
"""
import sys, re, json, unicodedata

sys.path.insert(0, sys.argv[1])
sys.stdout.reconfigure(encoding="utf-8")
import pymupdf

PDF, OUT = sys.argv[2], sys.argv[3]
FIRST_PAGE, LAST_PAGE = 222, 274  # 1-based, inclusive
SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def style_of(span):
    f = span["font"]
    if "Calibri" in f:
        return "table-bold" if "Bold" in f else "table"
    if "BoldItalic" in f:
        return "bi"
    if "Bold" in f:
        return "b"
    if "Italic" in f:
        return "i"
    return "r"


def read_lines(doc):
    lines = []
    for pno in range(FIRST_PAGE - 1, LAST_PAGE):
        page = doc[pno]
        page_lines = []
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if s["text"].strip() or s["text"] == " "]
                spans = [s for s in spans if s["text"]]
                if not spans or not "".join(s["text"] for s in spans).strip():
                    continue
                y = spans[0]["origin"][1]
                if y > 735:  # page footer
                    continue
                x0 = l["bbox"][0]
                page_lines.append({
                    "page": pno + 1, "col": 0 if x0 < 300 else 1, "x0": x0, "x1": l["bbox"][2], "y": y,
                    "spans": [{"text": s["text"], "style": style_of(s), "size": s["size"], "font": s["font"], "x": s["bbox"][0], "x1": s["bbox"][2]} for s in spans],
                })
        page_lines.sort(key=lambda L: (L["col"], round(L["y"], 0), L["x0"]))
        lines.extend(page_lines)
    return lines


def text_of(L):
    return "".join(s["text"] for s in L["spans"]).strip()


def is_heading(L, size=12):
    s = [x for x in L["spans"] if x["text"].strip()]
    return all(x["font"] == "Calibri" and abs(x["size"] - size) < 0.6 for x in s)


def is_italic_line(L):
    s = [x for x in L["spans"] if x["text"].strip()]
    return bool(s) and all(x["style"] == "i" for x in s)


def is_table_line(L):
    s = [x for x in L["spans"] if x["text"].strip()]
    return bool(s) and all(x["style"] in ("table", "table-bold") and x["size"] < 9.6 for x in s)


def is_statblock_line(L):
    """Mini creature stat blocks inside items use Calibri 10 (tables use Calibri 9)."""
    s = [x for x in L["spans"] if x["text"].strip()]
    return bool(s) and all("Calibri" in x["font"] and 9.6 <= x["size"] < 10.5 for x in s)


ABIL = ["FUE", "DES", "CON", "INT", "SAB", "CAR"]


def build_statblock(slines):
    out = []
    for L in slines:
        text = "".join(x["text"] for x in L["spans"]).strip()
        if text in ABIL:
            continue  # the ability header arrives as six separate lines
        md = ""
        for x in L["spans"]:
            t = x["text"]
            core = t.strip()
            if not core:
                md += t
            elif "Bold" in x["font"]:
                md += f"**{core}** "
            elif "Italic" in x["font"]:
                md += f"*{core}* "
            else:
                md += t
        md = re.sub(r"\s+", " ", md).strip()
        vals = re.findall(r"\d+ \([+−-]\d+\)", text)
        if len(vals) == 6:
            out.append("| " + " | ".join(ABIL) + " |\n|" + "---|" * 6 + "\n| " + " | ".join(vals) + " |")
            continue
        first = next(x for x in L["spans"] if x["text"].strip())
        if out and "Bold" not in first["font"] and not out[-1].startswith("|"):
            out[-1] += " " + md  # wrapped line
        else:
            out.append(md)
    # paragraphs of stat lines, but keep the ability table as its own block
    blocks, cur = [], []
    for o in out:
        if o.startswith("|"):
            if cur:
                blocks.append("\n".join(cur))
                cur = []
            blocks.append(o)
        else:
            cur.append(o)
    if cur:
        blocks.append("\n".join(cur))
    return "\n\n".join(blocks)


def is_table_title(L):
    s = [x for x in L["spans"] if x["text"].strip()]
    return bool(s) and all(x["style"] == "table-bold" and x["size"] > 10.5 for x in s)


TYPE_RX = re.compile(r"^(Objeto maravilloso|Arma|Armadura|Poci[oó]n|Anillo|Cetro|Vara|Pergamino|Bast[oó]n|Varita|Munici[oó]n)\b")


# ------------------------------------------------------------------ paragraph assembly
def segs_to_md(segs):
    # merge adjacent segments with the same style
    merged = []
    for st, t in segs:
        if merged and merged[-1][0] == st:
            merged[-1][1] += t
        else:
            merged.append([st, t])
    out = []
    for st, t in merged:
        lead = t[: len(t) - len(t.lstrip())]
        trail = t[len(t.rstrip()):]
        core = t.strip()
        if not core:
            out.append(t)
            continue
        core = core.replace("*", "\\*")
        if st == "i":
            out.append(f"{lead}*{core}*{trail}")
        elif st == "bi":
            out.append(f"{lead}***{core}***{trail}")
        elif st == "b":
            out.append(f"{lead}**{core}**{trail}")
        else:
            out.append(t.replace("*", "\\*"))
    md = "".join(out)
    md = re.sub(r"[ \t]+", " ", md).strip()
    md = re.sub(r"\s+([.,;:)])", r"\1", md)
    md = re.sub(r"\(\s+", "(", md)
    return md


def line_segments(L):
    segs = []
    for s in L["spans"]:
        t = s["text"]
        if s["size"] < 8 and t.strip().isdigit():
            t = t.strip().translate(SUP)
            if segs:
                segs[-1] = (segs[-1][0], segs[-1][1].rstrip())
        segs.append((s["style"] if s["style"] in ("i", "bi", "b") else "r", t))
    return segs


def rows_index(rows, cell):
    for i, r in enumerate(rows):
        if any(c is cell for c in r[1]):
            return i
    return 0


def build_table(tlines):
    """Rebuild a table from Calibri 9 lines: cells on the same baseline form a row; wrapped text continues the cell above."""
    rows = []  # [y, cells, col, all_bold]; a cell is [x, text, x1]
    for L in tlines:
        cells = []
        for s in L["spans"]:
            if not s["text"].strip():
                continue
            if cells and s["x"] - cells[-1][2] < 2.5:  # same cell, split span
                cells[-1][1] += s["text"]
                cells[-1][2] = s["x1"]
            else:
                cells.append([s["x"], s["text"], s["x1"]])
        bold = all(s["style"] == "table-bold" for s in L["spans"] if s["text"].strip())
        # lines of the same row arrive as separate pdf lines: merge by baseline
        seg = (L["page"], L["col"])
        if rows and abs(rows[-1][0] - L["y"]) < 1.5 and rows[-1][2] == seg:
            rows[-1][1].extend(cells)
            rows[-1][3] = rows[-1][3] and bold
        else:
            rows.append([L["y"], cells, seg, bold])
    if not rows:
        return ""
    # The header can span several bold lines ("Nivel del" / "conjuro"): cluster their cells by x.
    n_head = 1
    while n_head < len(rows) and rows[n_head][3] and rows[n_head][2] == rows[0][2]:
        n_head += 1
    head_cells = sorted((c for r in rows[:n_head] for c in r[1]), key=lambda c: c[0])
    clusters = []
    for c in head_cells:
        if clusters and abs(c[0] - clusters[-1][0][0]) < 8:
            clusters[-1].append(c)
        else:
            clusters.append([c])
    header = [[cl[0][0], " ".join(c[1].strip() for c in sorted(cl, key=lambda c: rows_index(rows, c))), cl[0][2]] for cl in clusters]
    rows = [rows[0]] + rows[n_head:]
    xs = [c[0] for c in header]

    def col_of(x):
        return min(range(len(xs)), key=lambda i: abs(xs[i] - x) if x >= xs[i] - 12 else 999 + i)

    table = [[c[1].strip() for c in header]]
    seg_now, offset = rows[0][2], 0.0
    for y, cells, seg, bold in rows[1:]:
        cells = sorted(cells, key=lambda c: c[0])
        if seg != seg_now:
            # The table continues in another column or page: realign its x positions to the header's.
            seg_now = seg
            offset = cells[0][0] - xs[0] if cells else 0.0
        cells = [[c[0] - offset, c[1], c[2] - offset] for c in cells]
        if bold and [c[1].strip() for c in cells] == table[0]:
            continue  # header repeated where the table continues in the next column or page
        idxs = [col_of(c[0]) for c in cells]
        # continuation line: no cell in the first column -> append to the previous row
        if table[1:] and 0 not in idxs and len(xs) > 1:
            for c, i in zip(cells, idxs):
                table[-1][i] = (table[-1][i] + " " + c[1].strip()).strip()
            continue
        row = [""] * len(xs)
        for c, i in zip(cells, idxs):
            row[i] = (row[i] + " " + c[1].strip()).strip()
        table.append(row)
    md = ["| " + " | ".join(table[0]) + " |", "|" + "---|" * len(xs)]
    for r in table[1:]:
        md.append("| " + " | ".join(x.replace("|", "/") for x in r) + " |")
    return "\n".join(md)


def assemble(body):
    """Turn an item's body lines into Markdown paragraphs and tables."""
    paras, cur = [], []
    i = 0

    def flush():
        nonlocal cur
        if cur:
            md = segs_to_md(cur)
            if md:
                paras.append(md)
        cur = []

    while i < len(body):
        L = body[i]
        if is_table_title(L):
            flush()
            paras.append(f"**{text_of(L)}**")
            i += 1
            continue
        if is_statblock_line(L):
            flush()
            j = i
            while j < len(body) and is_statblock_line(body[j]):
                j += 1
            paras.append(build_statblock(body[i:j]))
            i = j
            continue
        if is_table_line(L):
            flush()
            j = i
            while j < len(body) and is_table_line(body[j]):
                j += 1
            paras.append(build_table(body[i:j]))
            i = j
            continue
        if is_heading(L, 14) or is_heading(L, 12):
            flush()
            paras.append(f"**{text_of(L)}**")
            i += 1
            continue
        segs = line_segments(L)
        raw = "".join(t for _, t in segs)
        new_para = raw.startswith(" ") or (segs and segs[0][0] == "bi" and segs[0][1].strip())
        if new_para:
            flush()
        if cur:
            prev_text = "".join(t for _, t in cur).rstrip()
            if prev_text.endswith("-") and re.match(r"\s*[a-záéíóúñü]", raw):
                # hyphenated word across lines
                st, t = cur[-1]
                cur[-1] = (st, t.rstrip()[:-1])
                segs[0] = (segs[0][0], segs[0][1].lstrip())
            else:
                cur.append(("r", " "))
        cur.extend(segs)
        i += 1
    flush()
    return "\n\n".join(paras)


# ------------------------------------------------------------------ type line
RARITY_WORDS = [
    ("muy rar", "very-rare"), ("legendari", "legendary"), ("infrecuente", "uncommon"), ("común", "common"),
    ("rar", "rare"), ("artefacto", "artifact"), ("variable", "varies"),
]


def rarity_keys(text):
    t = text.lower()
    found = []
    for word, key in RARITY_WORDS:
        for m in re.finditer(word, t):
            found.append((m.start(), key))
        t = re.sub(word, lambda m: "#" * len(m.group(0)), t)
    return [k for _, k in sorted(found)]


def parse_type(line):
    line = re.sub(r"\s+", " ", line).strip()
    att = ""
    m = re.search(r"\((requiere sintonizaci[^)]*)\)\s*$", line)
    if m:
        att = m.group(1)
        line = line[: m.start()].strip()
    # The rarity starts after the first top-level comma that is followed by a rarity word:
    # "Arma (cualquiera), infrecuente (+1), rara (+2) o muy rara (+3)".
    depth, cut = 0, -1
    for i, ch in enumerate(line):
        depth += ch == "("
        depth -= ch == ")"
        if ch == "," and depth == 0 and re.match(r"\s*(común|infrecuente|rar|muy rar|legendari|artefacto|rareza)", line[i + 1:], re.I):
            cut = i
            break
    cat, rar = (line[:cut].strip(), line[cut + 1:].strip()) if cut >= 0 else (line, "")
    return cat, rar, att


CATEGORY_KEYS = [
    (r"^armadura", "armor"), (r"^arma\b", "weapon"), (r"^munici", "weapon"), (r"^poci", "potion"), (r"^anillo", "ring"),
    (r"^(cetro|vara)", "rod"), (r"^pergamino", "scroll"), (r"^bast", "staff"), (r"^varita", "wand"),
    (r"^objeto maravilloso", "wondrous"),
]


def category_key(cat):
    c = cat.lower()
    for rx, k in CATEGORY_KEYS:
        if re.match(rx, c):
            return k
    return "wondrous"


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


# ------------------------------------------------------------------ main
doc = pymupdf.open(PDF)
lines = read_lines(doc)
start = next(i for i, L in enumerate(lines) if is_heading(L, 18) and "de la A a la Z" in text_of(L))
def big(L):
    return max(s["size"] for s in L["spans"]) >= 17


end = next(i for i, L in enumerate(lines) if i > start and big(L))
art_start = next(i for i, L in enumerate(lines) if i > end and big(L) and text_of(L).startswith("Artefactos"))

items = []


def parse_block(block, artifact=False):
    i = 0
    # skip the intro paragraph(s) before the first item
    while i < len(block) and not (is_heading(block[i]) and i + 1 < len(block) and is_italic_line(block[i + 1]) and TYPE_RX.match(text_of(block[i + 1]))):
        i += 1
    while i < len(block):
        name_lines = [block[i]]
        i += 1
        while i < len(block) and is_heading(block[i]) and not is_italic_line(block[i]):
            name_lines.append(block[i])
            i += 1
        type_lines = []
        while i < len(block) and is_italic_line(block[i]):
            type_lines.append(block[i])
            i += 1
        body = []
        while i < len(block):
            L = block[i]
            if is_heading(L) and i + 1 < len(block) and is_italic_line(block[i + 1]) and TYPE_RX.match(text_of(block[i + 1])):
                break
            body.append(L)
            i += 1
        name = " ".join(text_of(L) for L in name_lines)
        type_line = " ".join(text_of(L) for L in type_lines)
        cat, rar, att = parse_type(type_line)
        desc = assemble(body)
        keys = rarity_keys(rar)
        if "varies" in keys or not keys:
            # variable rarity: collect the rarities named in the description's tables
            # variable rarity: the rarities appear in the tables, or in sub-entries like "***Absorción (muy rara).***"
            sources = " ".join(re.findall(r"\|[^\n]*\|", desc) + re.findall(r"\*\*\*[^*]*\((?:[^)]*)\)\.?\*\*\*", desc))
            keys = sorted(set(k for k in rarity_keys(sources) if k != "varies"),
                          key=lambda k: ["common", "uncommon", "rare", "very-rare", "legendary", "artifact"].index(k))
            rarity = "varies"
        else:
            rarity = keys[0]
        items.append({
            "index": slug(name),
            "name": name,
            "kind": "magic",
            "category": "artifact" if artifact else category_key(cat),
            "type_line": type_line,
            "item_type": cat,
            "rarity": "artifact" if artifact else rarity,
            "rarities": keys if rarity == "varies" or len(keys) > 1 else [],
            "attunement": att,
            "desc": desc,
            "page": name_lines[0]["page"],
        })


parse_block(lines[start + 1:end])
# Artifacts: the section intro, then each artifact uses a 14pt heading in this PDF; normalise to 12pt logic.
art = lines[art_start + 1:]
stop = next((i for i, L in enumerate(art) if big(L)), len(art))
art = art[:stop]
for L in art:
    if is_heading(L, 14):
        for s in L["spans"]:
            s["size"] = 12.0
parse_block(art, artifact=True)

json.dump(items, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
import collections
print("items", len(items))
print(collections.Counter(i["category"] for i in items))
print(collections.Counter(i["rarity"] for i in items))
for it in items:
    if not it["type_line"] or not it["desc"]:
        print("WARN", it["name"], "| type:", it["type_line"][:60], "| desc len", len(it["desc"]))
