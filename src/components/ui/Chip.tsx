import React from "react";
import { cn } from "../../lib/utils";

/** Small toggle chip for filters (item groups, subgroups, rarities...). `color` paints it when active. */
export function Chip({ active, onClick, children, color, className, title }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 border text-xs whitespace-nowrap transition-colors",
        active ? "border-dm-accent bg-dm-accent text-dm-bg-darker font-bold" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent",
        className
      )}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}

/** Colored dot of a rarity, used inside chips. Hollow for "no rarity". */
export function RarityDot({ color, active }: { color?: string; active?: boolean }) {
  return color ? (
    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? "var(--theme-bg-darker)" : color }} />
  ) : (
    <span className="w-2 h-2 rounded-full shrink-0 border border-current" />
  );
}
