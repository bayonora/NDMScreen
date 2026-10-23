"""Combine the mundane equipment (nosolorol) and the magic items (official SRD PDF) into one catalog.

usage: py -I build_items.py <mundane.json> <magic.json> <out.json>
Order = display order: equipment in the manual's category order, then magic items by category,
rarity and name.
"""
import sys, json, re, unicodedata

sys.stdout.reconfigure(encoding="utf-8")
mundane = json.load(open(sys.argv[1], encoding="utf-8"))
magic = json.load(open(sys.argv[2], encoding="utf-8"))
OUT = sys.argv[3]

MAGIC_CAT_ORDER = ["armor", "weapon", "potion", "ring", "rod", "scroll", "staff", "wand", "wondrous", "artifact"]
RARITY_ORDER = ["common", "uncommon", "rare", "very-rare", "legendary", "artifact", "varies"]

# Hand fixes for spots the PDF layout scrambles.
DESC_FIXES = {
    "collar-de-plegarias": [(
        "| 07–08 | Castigadora Curativa | Castigo marcador Curar heridas (nivel 2) |\n| 09–14 |  | o restablecimiento menor |",
        "| 07–08 | Castigadora | Castigo marcador |\n| 09–14 | Curativa | Curar heridas (nivel 2) o restablecimiento menor |",
    )],
}


def collate(t):
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()


def rarity_rank(it):
    # Items with several rarities sort by the lowest one.
    keys = it.get("rarities") or [it["rarity"]]
    return min(RARITY_ORDER.index(k) for k in keys if k in RARITY_ORDER)


out = []
for it in mundane:
    out.append(it)

for it in magic:
    for a, b in DESC_FIXES.get(it["index"], []):
        assert a in it["desc"], it["index"]
        it["desc"] = it["desc"].replace(a, b)
    it.pop("page", None)
    it["source"] = "srd-oficial"
    if not it["rarities"]:
        it.pop("rarities")
    if not it["attunement"]:
        it.pop("attunement")

magic.sort(key=lambda it: (MAGIC_CAT_ORDER.index(it["category"]), rarity_rank(it), collate(it["name"])))
seen = {i["index"] for i in out}
for it in magic:
    if it["index"] in seen:
        it["index"] = "magico-" + it["index"]
    seen.add(it["index"])
    out.append(it)

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("total", len(out), "mundane", len(mundane), "magic", len(magic))
