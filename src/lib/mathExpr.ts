/** Evaluates a small arithmetic expression ("30", "40-12", "33/2"). Rounds down; null if invalid. */
export function evaluateExpr(expr: string): number | null {
  const clean = expr.replace(/[x×]/gi, "*").replace(/[−–]/g, "-").replace(/,/g, ".").trim();
  if (!clean || !/^[0-9+\-*/.()\s]+$/.test(clean)) return null;
  // Dividing by zero (40/0) is treated as invalid.
  if (/\/\s*0+(?![.\d])/.test(clean)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${clean})`)();
    return typeof result === "number" && Number.isFinite(result) ? Math.floor(result) : null;
  } catch {
    return null;
  }
}

/** True when the text starts with + or -, i.e. it is a change to the current value ("-5", "+8"). */
export const isRelative = (expr: string) => /^\s*[+\-−–]/.test(expr);

export type HpChange =
  | { kind: "damage"; amount: number }
  | { kind: "heal"; amount: number }
  | { kind: "set"; amount: number };

/**
 * Reads what was typed in an HP field: "-5" is 5 damage, "+5" heals 5,
 * anything else ("20", "40/2") is the new value.
 */
export function parseHpChange(expr: string): HpChange | null {
  const n = evaluateExpr(expr);
  if (n === null) return null;
  if (isRelative(expr)) {
    if (n === 0) return null;
    return n < 0 ? { kind: "damage", amount: -n } : { kind: "heal", amount: n };
  }
  return { kind: "set", amount: Math.max(0, n) };
}
