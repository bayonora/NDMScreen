import React from "react";
import { cn } from "../../lib/utils";

// Rarity colors are fixed on purpose (they mean the same in every theme).
export const LOOT_COLORS = [
  { id: "default", color: "#c1a063", label: "Predeterminado" },
  { id: "verde", color: "#10b981", label: "Verde (Infrecuente)" },
  { id: "celeste", color: "#38bdf8", label: "Celeste (Rara)" },
  { id: "azul", color: "#3b82f6", label: "Azul (Muy rara)" },
  { id: "morado", color: "#a855f7", label: "Morado (Épico / rareza variable)" },
  { id: "dorado", color: "#fbbf24", label: "Dorado (Legendaria)" },
  { id: "carmesi", color: "#dc2626", label: "Carmesí (Artefacto)" },
];
export const DEFAULT_COLOR = LOOT_COLORS[0].color;

/** Row of rarity color swatches used by homebrew items and loot tables. */
export function ColorPicker({ value, onChange, className }: { value?: string; onChange: (color: string) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2 mb-4", className)}>
      {LOOT_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.color)}
          className={cn("w-8 h-8 rounded-full border-2 transition-transform shadow-md", value === c.color ? "border-dm-text-bright scale-110" : "border-dm-bg-darker hover:scale-105")}
          style={{ backgroundColor: c.color }}
          title={c.label}
          aria-label={c.label}
          aria-pressed={value === c.color}
        />
      ))}
    </div>
  );
}
