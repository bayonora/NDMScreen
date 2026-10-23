/** Dice notation in free text ("1d20+5", "2d6 - 1", "d8") and rolling it. */

export type DiceResult = {
  notation: string;
  count: number;
  sides: number;
  modifier: number;
  rolls: number[];
  total: number;
  /** Natural 20 / natural 1 on a single d20. */
  crit?: "hit" | "miss";
};

// Not glued to a letter or digit, so words like "de" or ids like "a1d2" are left alone.
const DICE_RX = /(?<![\p{L}\d])(\d{0,3})[dD](\d{1,3})(?:[  ]?([+\-−])[  ]?(\d{1,3}))?(?![\p{L}\d])/gu;

export function parseDice(notation: string): Omit<DiceResult, "rolls" | "total" | "crit"> | null {
  DICE_RX.lastIndex = 0;
  const m = DICE_RX.exec(notation.trim());
  DICE_RX.lastIndex = 0;
  if (!m) return null;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  if (count < 1 || count > 100 || sides < 2) return null;
  const modifier = m[4] ? Number(m[4]) * (m[3] === "+" ? 1 : -1) : 0;
  return { notation: m[0].replace(/\s+/g, ""), count, sides, modifier };
}

export function rollDice(notation: string): DiceResult | null {
  const parsed = parseDice(notation);
  if (!parsed) return null;
  const rolls = Array.from({ length: parsed.count }, () => Math.floor(Math.random() * parsed.sides) + 1);
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;
  const crit = parsed.count === 1 && parsed.sides === 20 ? (rolls[0] === 20 ? "hit" : rolls[0] === 1 ? "miss" : undefined) : undefined;
  return { ...parsed, rolls, total, crit };
}

type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[]; properties?: Record<string, unknown> };

function annotate(node: HastNode) {
  if (!node.children || node.tagName === "code" || node.tagName === "pre" || node.tagName === "a") return;
  const out: HastNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || !child.value || !/\d*[dD]\d/.test(child.value)) {
      annotate(child);
      out.push(child);
      continue;
    }
    const text = child.value;
    let pos = 0;
    for (const m of text.matchAll(DICE_RX)) {
      if (!parseDice(m[0])) continue;
      if (m.index! > pos) out.push({ type: "text", value: text.slice(pos, m.index) });
      out.push({ type: "element", tagName: "span", properties: { className: ["dice-roll"], dataDice: m[0] }, children: [{ type: "text", value: m[0] }] });
      pos = m.index! + m[0].length;
    }
    if (pos < text.length) out.push({ type: "text", value: text.slice(pos) });
  }
  node.children = out;
}

/** Rehype plugin: wraps dice notation in `<span class="dice-roll" data-dice="…">` so it can be rolled. */
export function rehypeDice() {
  return (tree: HastNode) => annotate(tree);
}
