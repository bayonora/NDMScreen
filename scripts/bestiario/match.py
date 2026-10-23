"""Match Spanish monsters (es.json) to the English SRD (5e-bits) by stat fingerprint.

usage: py -I match.py <es.json> <monsters_en.json> <out_matches.json>
"""
import sys, json, collections

es = json.load(open(sys.argv[1], encoding="utf-8"))
en = json.load(open(sys.argv[2], encoding="utf-8"))


def fp_es(m):
    s = m["stats"]
    return (s["STR"], s["DEX"], s["CON"], s["INT"], s["WIS"], s["CHA"])


def fp_en(m):
    return (m["strength"], m["dexterity"], m["constitution"], m["intelligence"], m["wisdom"], m["charisma"])


by_fp = collections.defaultdict(list)
for m in en:
    by_fp[fp_en(m)].append(m)

matches, unmatched, ambiguous = {}, [], []
used = set()
for m in es:
    cands = by_fp.get(fp_es(m), [])
    if len(cands) > 1:
        cands = [c for c in cands if c["hit_points"] == m["hp"]] or cands
    if len(cands) > 1:
        cands = [c for c in cands if c["armor_class"][0]["value"] == m["ac"]] or cands
    if len(cands) == 1:
        matches[m["index"]] = cands[0]["index"]
        used.add(cands[0]["index"])
    elif not cands:
        unmatched.append(m)
    else:
        ambiguous.append((m, cands))

print("matched", len(matches), "unmatched", len(unmatched), "ambiguous", len(ambiguous))
for m in unmatched:
    print("UNMATCHED", m["name"], fp_es(m), m["hp"], m["ac"])
for m, cs in ambiguous:
    print("AMBIG", m["name"], [c["name"] for c in cs])
dups = [k for k, v in collections.Counter(matches.values()).items() if v > 1]
print("duplicate targets", dups)
print("EN not covered:", [m["name"] for m in en if m["index"] not in used])
json.dump(matches, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
