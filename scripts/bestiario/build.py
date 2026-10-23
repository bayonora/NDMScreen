"""Build the app's bestiary JSON from the parsed Spanish SRD plus the English SRD as a cross-check.

usage: py -I build.py <es.json> <monsters_en.json> <matches.json> <extras_es.json> <out.json>
"""
import sys, json, re, copy

es = json.load(open(sys.argv[1], encoding="utf-8"))
en = {m["index"]: m for m in json.load(open(sys.argv[2], encoding="utf-8"))}
matches = json.load(open(sys.argv[3], encoding="utf-8"))
extras = json.load(open(sys.argv[4], encoding="utf-8"))
OUT = sys.argv[5]
log = []

# Fingerprint ties: the English SRD splits shapechanger forms into several entries.
matches.update({
    "enjambre-de-insectos": "swarm-of-insects",
    "rata-gigante": "giant-rat",
    "hombre-rata": "wererat-human",
    "hombre-tigre": "weretiger-human",
    "vampiro": "vampire-vampire",
})

XP_BY_CR = {
    0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900,
    8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000,
    17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000,
    26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000,
}
SIZE_EN = {"Tiny": "Diminuto", "Small": "Pequeño", "Medium": "Mediano", "Large": "Grande", "Huge": "Enorme", "Gargantuan": "Gargantuesco"}
TYPE_KEYS = {
    "Aberración": "aberration", "Bestia": "beast", "Celestial": "celestial", "Constructo": "construct",
    "Dragón": "dragon", "Elemental": "elemental", "Fata": "fey", "Infernal": "fiend", "Gigante": "giant",
    "Humanoide": "humanoid", "Monstruosidad": "monstrosity", "Cieno": "ooze", "Planta": "plant", "No muerto": "undead",
}
CATEGORY = {"animales": "animal", "PNJs": "npc", "monstruos": "monster"}


def dice_avg(expr):
    m = re.fullmatch(r"(\d+)d(\d+)\s*([+-]\s*\d+)?", expr.replace(" ", ""))
    if not m:
        return None
    n, d = int(m.group(1)), int(m.group(2))
    mod = int(m.group(3).replace(" ", "")) if m.group(3) else 0
    return int(n * (d + 1) / 2 + mod)


def en_name(e):
    return re.sub(r",\s*\w+ Form$", "", e["name"])


def fold(entries, parent_rx, child_rx):
    """Fold sub-entries ("Aliento de fuego") into the entry that introduces them ("Armas de aliento")."""
    out = []
    for t in entries:
        if out and re.match(child_rx, t["name"], re.I) and any(re.match(parent_rx, x["name"], re.I) for x in out[-1:] + out[-3:]):
            parent = next(x for x in reversed(out) if re.match(parent_rx, x["name"], re.I))
            parent["desc"] += f"\n- ***{t['name']}.*** {t['desc']}"
        else:
            out.append(t)
    return out


result = []
by_index = {}
for m in es:
    m = copy.deepcopy(m)
    e = en.get(matches.get(m["index"]))

    # --- Known errata in the Spanish source -------------------------------------------------------
    if m["index"] == "dragon-de-bronce-joven" and e and e["index"] == "young-copper-dragon":
        # The site's "young bronze" page holds the young copper dragon (acid breath).
        m["name"], m["index"] = "Dragón de cobre joven", "dragon-de-cobre-joven"
        log.append("renamed mislabelled young bronze -> young copper")
    if m["index"] == "arana" and m["cr"] == "10":
        m["cr"], m["cr_value"] = "0", 0.0  # "Desafío: 10 (0 PX)"
    if m["index"] == "ogro-zombi" and m["ac"] == 9:
        m["ac"] = 8
    if m["index"] == "hombre-lobo":
        m["type"], m["alignment"] = "Humanoide", "caótico maligno"
    if m["type"] == "Bestia Gigante":
        m["type"] = "Bestia"
    if e and (not m["size"] or m["size"] not in SIZE_EN.values()):
        m["size"] = SIZE_EN[e["size"]]
        m["size_label"] = ""
        log.append(f"size from EN: {m['name']} -> {m['size']}")

    # XP always follows the CR table (the source has several typos: 1 500 for 15 000, "450) PX"...).
    xp = XP_BY_CR.get(m["cr_value"])
    if m["cr_value"] == 0 and m["xp"] in (0, 10):
        xp = m["xp"]  # CR 0 is worth 0 or 10 XP depending on whether the creature can attack.
    if xp is not None and xp != m["xp"]:
        log.append(f"xp {m['name']}: {m['xp']} -> {xp}")
        m["xp"] = xp

    # Hit dice that don't add up to the hit points: take the English ones when those do.
    if m["hit_dice"] and dice_avg(m["hit_dice"]) != m["hp"] and e:
        en_hd = e["hit_points_roll"].replace(" ", "")
        if dice_avg(en_hd) == m["hp"]:
            log.append(f"hit dice {m['name']}: {m['hit_dice']} -> {en_hd}")
            m["hit_dice"] = en_hd
        else:
            log.append(f"WARN hit dice mismatch {m['name']}: {m['hp']} ({m['hit_dice']})")

    # Sub-options shown as separate entries in the source.
    m["actions"] = fold(m["actions"], r"^armas de aliento", r"^aliento\b")
    m["actions"] = fold(m["actions"], r"^rugido", r"^(primer|segundo|tercer) rugido")
    m["traits"] = fold(m["traits"], r"^debilidades de vampiro", r"^(prohibici|herido por agua|estaca en el coraz|hipersensibilidad)")

    # Editorial leftovers from the book layout.
    m["notes"] = [n for n in m["notes"] if n["name"] != "Monstruos y razas jugables"]
    m["desc"] = m["desc"].replace(" Las estadísticas del enjambre de pirañas aparecen en la página XXX.", "")
    m["name_en"] = en_name(e) if e else ""
    m["en_index"] = e["index"] if e else ""
    result.append(m)
    by_index[m["index"]] = m

# The insect-swarm variant sidebar ended up on the ravens page.
ravens, insects = by_index["enjambre-de-cuervos"], by_index["enjambre-de-insectos"]
moved = [n for n in ravens["notes"] if n["name"].lower().startswith("variante: enjambres de insectos")]
ravens["notes"] = [n for n in ravens["notes"] if n not in moved]
insects["notes"] += moved

for x in extras:
    x = copy.deepcopy(x)
    x["actions"] = fold(x["actions"], r"^armas de aliento", r"^aliento\b")
    result.append(x)

TEXT_FIXES = [
    (r"\bAtaque arma\b", "Ataque de arma"),
    (r"\s+([.,;:])", r"\1"),
    (r"\(\s+", "("),
    (r"\s+\)", ")"),
    (r"(\d)\s*d\s*(\d)", r"\1d\2"),
    (r"(\dd\d+)\s*([+−–-])\s*(\d)", lambda mm: f"{mm.group(1)}{'-' if mm.group(2) != '+' else '+'}{mm.group(3)}"),
]


def fix_text(s):
    for rx, rep in TEXT_FIXES:
        s = re.sub(rx, rep, s)
    return s.strip()


final = []
for m in sorted(result, key=lambda x: x["name"]):
    for k in ("traits", "actions", "reactions", "legendary_actions", "notes"):
        for t in m[k]:
            t["name"] = fix_text(t["name"])
            t["desc"] = fix_text(t["desc"])
    for k in ("desc", "legendary_desc", "speed", "saving_throws", "skills", "senses", "languages",
              "damage_vulnerabilities", "damage_resistances", "damage_immunities", "condition_immunities", "ac_desc"):
        m[k] = fix_text(m[k])
    if m["languages"] in ("-", "—", "–"):
        m["languages"] = "—"
    type_key = TYPE_KEYS.get(m["type"])
    if not type_key:
        log.append(f"WARN unknown type {m['name']}: {m['type']}")
    out = {
        "index": m["index"],
        "name": m["name"],
        "name_en": m.get("name_en", ""),
        "category": CATEGORY[m["category"]],
        "size": m["size"],
        "size_label": m.get("size_label") if m.get("size_label") and m.get("size_label") != m["size"] else "",
        "type": m["type"],
        "type_key": type_key,
        "subtype": m["subtype"],
        "alignment": m["alignment"],
        "desc": m["desc"],
        "ac": m["ac"],
        "ac_desc": m["ac_desc"],
        "hp": m["hp"],
        "hit_dice": m["hit_dice"],
        "speed": m["speed"],
        "stats": m["stats"],
        "saving_throws": m["saving_throws"],
        "skills": m["skills"],
        "damage_vulnerabilities": m["damage_vulnerabilities"],
        "damage_resistances": m["damage_resistances"],
        "damage_immunities": m["damage_immunities"],
        "condition_immunities": m["condition_immunities"],
        "senses": m["senses"],
        "languages": m["languages"],
        "cr": m["cr"],
        "cr_value": m["cr_value"],
        "xp": m["xp"],
        "traits": m["traits"],
        "actions": m["actions"],
        "reactions": m["reactions"],
        "legendary_desc": m["legendary_desc"],
        "legendary_actions": m["legendary_actions"],
        "notes": m["notes"],
        "translated": m.get("translated", False),
    }
    # Leave out empty fields to keep the file small; the app treats them as optional.
    # (identity checks: 0 == False in Python, and CR 0 / 0 XP must stay)
    final.append({k: v for k, v in out.items() if not (v is None or v is False or v == "" or v == [])})

json.dump(final, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("monsters:", len(final))
print("\n".join(log))
