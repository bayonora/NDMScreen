/**
 * Measurements: the app shows them like the manual (feet, pounds, miles...) and adds the metric
 * equivalent next to them. Conversions follow the official Spanish D&D books:
 * 1 pie = 30 cm, 1 libra = 0,5 kg, 1 milla = 1,5 km, 1 pulgada = 2,5 cm, 1 galón = 4 l, 1 pinta = 0,5 l.
 */

export type MeasurePart = string | { text: string; metric: string };

const NUM = String.raw`(\d+ \d+\/\d+|\d+\/\d+|\d{1,3}(?:[  ]\d{3})+|\d+(?:,\d+)?)`;
const UNIT = String.raw`(pies? cuadrados?|pies? c[uú]bicos?|pies?|millas? por hora|millas?\/hora|millas?|libras?|lb|pulgadas?|galones|gal[oó]n|pintas?|onzas?)`;
// Not after a letter or digit, so "2d6 pies" (dice) is left alone.
const MEASURE_RX = new RegExp(String.raw`(?<![\p{L}\d,/])${NUM}[  ]?${UNIT}(?![\p{L}\d])`, "gu");
// Weapon ranges are written without a unit: "arrojadiza (alcance 20/60)".
const RANGE_RX = /alcance (\d+)\/(\d+)/g;

function parseNumber(raw: string): number {
  const s = raw.replace(/[  ](?=\d{3}\b)/g, "");
  const mixed = s.match(/^(\d+) (\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(s.replace(",", "."));
}

/** Spanish number: decimal comma, at most 2 decimals, thin grouping from 10 000. */
export function formatNumber(n: number): string {
  const digits = n >= 100 ? 0 : n >= 1 ? 1 : 2;
  const rounded = Number(n.toFixed(digits));
  const [int, dec] = String(rounded).split(".");
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : int;
  return dec ? `${grouped},${dec}` : grouped;
}

function metricFor(value: number, unit: string, after: string): string | null {
  const u = unit.toLowerCase();
  if (/cuadrad/.test(u)) return `${formatNumber(value * 0.09)} m²`;
  if (/c[uú]bic/.test(u)) return `${formatNumber(value * 0.027)} m³`;
  if (/^pies?$/.test(u)) return `${formatNumber(value * 0.3)} m`;
  if (/hora/.test(u)) return `${formatNumber(value * 1.5)} km/h`;
  if (/^millas?$/.test(u)) return `${formatNumber(value * 1.5)} km`;
  if (/^(libras?|lb)$/.test(u)) return value < 1 ? `${formatNumber(value * 500)} g` : `${formatNumber(value * 0.5)} kg`;
  if (/^pulgadas?$/.test(u)) return `${formatNumber(value * 2.5)} cm`;
  if (/^gal/.test(u)) return `${formatNumber(value * 4)} l`;
  if (/^pintas?$/.test(u)) return `${formatNumber(value * 0.5)} l`;
  if (/^onzas?$/.test(u)) return /^ de l[ií]quido/.test(after) ? `${formatNumber(value * 30)} ml` : `${formatNumber(value * 30)} g`;
  return null;
}

/** Splits a text into plain pieces and measurements with their metric equivalent. */
export function splitMeasures(text: string): MeasurePart[] {
  if (!text || !/\d/.test(text)) return [text];
  const hits: { start: number; end: number; text: string; metric: string }[] = [];
  for (const m of text.matchAll(MEASURE_RX)) {
    const metric = metricFor(parseNumber(m[1]), m[2], text.slice(m.index! + m[0].length));
    if (metric) hits.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], metric });
  }
  for (const m of text.matchAll(RANGE_RX)) {
    const metric = `${formatNumber(Number(m[1]) * 0.3)}/${formatNumber(Number(m[2]) * 0.3)} m`;
    hits.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], metric });
  }
  if (hits.length === 0) return [text];
  hits.sort((a, b) => a.start - b.start);
  const parts: MeasurePart[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start < pos) continue;
    if (h.start > pos) parts.push(text.slice(pos, h.start));
    parts.push({ text: h.text, metric: h.metric });
    pos = h.end;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return parts;
}

type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[]; properties?: Record<string, unknown> };

function annotate(node: HastNode) {
  if (!node.children || node.tagName === "code" || node.tagName === "pre") return;
  const out: HastNode[] = [];
  for (const child of node.children) {
    if (child.type !== "text" || !child.value) {
      annotate(child);
      out.push(child);
      continue;
    }
    for (const part of splitMeasures(child.value)) {
      if (typeof part === "string") {
        if (part) out.push({ type: "text", value: part });
      } else {
        out.push({ type: "text", value: part.text });
        out.push({ type: "element", tagName: "span", properties: { className: ["unit-metric"] }, children: [{ type: "text", value: ` (${part.metric})` }] });
      }
    }
  }
  node.children = out;
}

/** Rehype plugin: adds the metric equivalent after every measurement in rendered Markdown. */
export function rehypeUnits() {
  return (tree: HastNode) => annotate(tree);
}
