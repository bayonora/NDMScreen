import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Shared look and placement of the themed dropdown lists (Select, Combobox, tag suggestions), so
 * every dropdown in the app opens and looks the same instead of using the browser's native popup.
 */

export const LIST_MAX_HEIGHT = 280;

/** The floating list. */
export const listClass =
  "fixed z-[200] font-sans overflow-y-auto overscroll-contain custom-scrollbar py-1 bg-dm-bg-darker border border-dm-accent/40 rounded-sm shadow-[0_12px_32px_rgba(0,0,0,0.7)] animate-in fade-in";

/** One option. `active` = under the keyboard or the pointer; `selected` = the current value. */
export function optionClass(active: boolean, selected: boolean, disabled = false) {
  return [
    "flex items-center gap-2 px-3 py-2 text-sm select-none",
    disabled ? "text-dm-muted-alt opacity-50 cursor-not-allowed" : "cursor-pointer",
    !disabled && active ? "bg-dm-accent/15 text-dm-text-bright" : "text-dm-text",
    selected && "text-dm-accent font-semibold",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Heading of a group of options ("Jugadores", "Armas"...). */
export const groupClass = "px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-widest font-bold text-dm-muted select-none";

export interface ListPosition {
  left: number;
  minWidth: number;
  maxWidth: number;
  top?: number;
  bottom?: number;
}

/**
 * Where to put a list under `anchor` (or above it when there's no room below), kept inside the
 * screen and following the anchor when the page or a dialog scrolls.
 */
export function useListPosition(open: boolean, anchor: RefObject<HTMLElement | null>, estimatedHeight: number) {
  const [pos, setPos] = useState<ListPosition | null>(null);

  const place = () => {
    const r = anchor.current?.getBoundingClientRect();
    // A hidden anchor (display: none) has no box: don't float the list at the screen's corner.
    if (!r || (r.width === 0 && r.height === 0)) return setPos(null);
    const margin = 8;
    const maxWidth = window.innerWidth - margin * 2;
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - margin - Math.min(Math.max(r.width, 192), maxWidth)));
    const below = window.innerHeight - r.bottom;
    const height = Math.min(LIST_MAX_HEIGHT, estimatedHeight) + 12;
    if (below < height && r.top > below) setPos({ left, minWidth: r.width, maxWidth, bottom: window.innerHeight - r.top + 4 });
    else setPos({ left, minWidth: r.width, maxWidth, top: r.bottom + 4 });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true); // capture: also scrolling inside a dialog
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, estimatedHeight]);

  return pos;
}

/** Closes the list on a pointer press outside the given elements. */
export function useOutsidePress(open: boolean, refs: RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!refs.some((r) => r.current?.contains(t))) onOutside();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
