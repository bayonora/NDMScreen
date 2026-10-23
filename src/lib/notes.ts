import { StickyNote, User, MapPin, KeyRound, Coins, Scale, ScrollText, Lightbulb, type LucideIcon } from "lucide-react";
import type { Note } from "../types";

export type NoteCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Starting text offered for a new note of this category. */
  template: string;
};

export const NOTE_CATEGORIES: NoteCategory[] = [
  { id: "general", label: "General", icon: StickyNote, template: "" },
  {
    id: "pnj",
    label: "PNJ",
    icon: User,
    template: "**Aspecto:** \n**Voz / manías:** \n**Quiere:** \n**Secreto:** \n**Relación con el grupo:** ",
  },
  {
    id: "lugar",
    label: "Lugar",
    icon: MapPin,
    template: "**Primera impresión:** \n**Quién hay:** \n**Qué se puede encontrar:** \n**Peligros:** ",
  },
  {
    id: "pista",
    label: "Pista / Secreto",
    icon: KeyRound,
    template: "**Qué revela:** \n**Dónde se encuentra:** \n**CD para descubrirla:** \n\n- [ ] Descubierta por el grupo",
  },
  { id: "botin", label: "Botín", icon: Coins, template: "- [ ] \n- [ ] \n\n**Oro:** 2d6 × 10 po" },
  { id: "regla", label: "Regla", icon: Scale, template: "**Situación:** \n**Decisión:** \n**Fuente:** " },
  {
    id: "sesion",
    label: "Sesión",
    icon: ScrollText,
    template: "## Resumen\n\n\n## PNJ conocidos\n- \n\n## Botín y PX\n- \n\n## Cabos sueltos\n- [ ] ",
  },
  { id: "gancho", label: "Gancho", icon: Lightbulb, template: "**Gancho:** \n**Quién lo ofrece:** \n**Recompensa:** \n**Giro:** " },
];

export function noteCategory(id?: string): NoteCategory {
  return NOTE_CATEGORIES.find((c) => c.id === id) || NOTE_CATEGORIES[0];
}

export function isTemplateText(content: string): boolean {
  const c = content.trim();
  return !c || NOTE_CATEGORIES.some((cat) => cat.template.trim() === c);
}

/** `value` is what notes store (old Tailwind class strings, kept as ids); `tint` is the accent. */
export const NOTE_COLORS: { value: string; label: string; tint: string | null }[] = [
  { value: "bg-[#2a2420]", label: "Pergamino", tint: null },
  { value: "bg-[#3a2020]", label: "Sangre", tint: "#c2413a" },
  { value: "bg-[#203a20]", label: "Bosque", tint: "#4f9d4f" },
  { value: "bg-[#202a3a]", label: "Arcano", tint: "#4a7fcf" },
  { value: "bg-[#3a3520]", label: "Oro", tint: "#cfa53a" },
  { value: "bg-[#3a2035]", label: "Hechizo", tint: "#a24fb5" },
  { value: "bg-[#1f3533]", label: "Jade", tint: "#2fa99a" },
  { value: "bg-[#2b2b2b]", label: "Ceniza", tint: "#8a8a8a" },
];

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0].value;

export function noteColor(value?: string) {
  return NOTE_COLORS.find((c) => c.value === value) || NOTE_COLORS[0];
}

/** Accent color of a note: its tint, or the theme accent for the default color. */
export function noteTint(value?: string): string {
  return noteColor(value).tint || "var(--theme-accent)";
}

/** Card background: the theme's card color with a touch of the note's tint, so it follows the theme. */
export function noteBackground(value?: string, strength = 14): string {
  const tint = noteColor(value).tint;
  return tint ? `color-mix(in srgb, ${tint} ${strength}%, var(--theme-bg-card))` : "var(--theme-bg-card)";
}

/** Title to show in lists: the title, or the first line of the content. */
export function noteLabel(note: Pick<Note, "title" | "content">): string {
  if (note.title?.trim()) return note.title.trim();
  const line = (note.content || "").split("\n").find((l) => l.trim()) || "";
  return line.replace(/^[#>*\-+\s]+|\[[ xX]\]\s*/g, "").replace(/[*_`]/g, "").trim().slice(0, 80) || "Sin título";
}

const TASK_RX = /^[ \t>]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\]/gm;

export function taskProgress(content: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const m of (content || "").matchAll(TASK_RX)) {
    total++;
    if (m[1] !== " ") done++;
  }
  return { done, total };
}

/** Flips the checkbox of the list item that starts at `offset` in the markdown source. */
export function toggleTaskAt(content: string, offset: number): string {
  const m = content.slice(offset).match(/^([ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[([ xX])\]/);
  if (!m) return content;
  const pos = offset + m[1].length + 1;
  return content.slice(0, pos) + (m[2] === " " ? "x" : " ") + content.slice(pos + 1);
}

/** Pulls "#etiqueta" words out of a quick note: "Bram, tabernero #pnj" → text + ["pnj"]. */
export function extractTags(text: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  const rest = text.replace(/(^|\s)#([\p{L}\d_-]+)/gu, (_, sp, tag) => {
    tags.push(tag.toLowerCase());
    return sp;
  });
  return { text: rest.replace(/\s{2,}/g, " ").trim(), tags: Array.from(new Set(tags)) };
}

const RTF = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function relativeTime(ts?: number): string {
  if (!ts) return "";
  const s = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "ahora";
  if (abs < 3600) return RTF.format(Math.round(s / 60), "minute");
  if (abs < 86400) return RTF.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return RTF.format(Math.round(s / 86400), "day");
  return new Date(ts).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

export function fullDate(ts?: number): string {
  return ts ? new Date(ts).toLocaleString("es", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}
