import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

// Open overlays, topmost last. Only the topmost one reacts to Escape.
const layerStack: symbol[] = [];

/** Registers an open overlay so Escape closes it (and only it, if several are stacked). */
export function useModalLayer(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol("modal");
    layerStack.push(id);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && layerStack[layerStack.length - 1] === id) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      layerStack.splice(layerStack.indexOf(id), 1);
    };
  }, [isOpen]);
}

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Close when clicking the backdrop (default true). Off for forms, to avoid losing input. */
  closeOnBackdrop?: boolean;
  /** On phones, dock the content to the bottom edge (bottom sheet) instead of centering it. */
  sheet?: boolean;
  className?: string;
  zIndex?: string;
}

/** Bare full-screen overlay: portal + backdrop + Escape handling. Content is up to the caller. */
export function Overlay({ isOpen, onClose, children, closeOnBackdrop = true, sheet, className, zIndex = "z-50" }: OverlayProps) {
  useModalLayer(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex justify-center",
        sheet
          ? "items-end sm:items-center pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-6"
          : "items-center p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-6",
        zIndex,
        className
      )}
    >
      <div className="absolute inset-0 bg-black/50" onClick={closeOnBackdrop ? onClose : undefined} />
      {children}
    </div>,
    document.body
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const modalPanelClass =
  "relative bg-dm-bg/80 backdrop-blur-xl border border-dm-accent/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-full max-h-full sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden";

/** Panel classes for a dialog that is a bottom sheet on phones and a centered card from `sm` up. */
export const sheetPanelClass =
  "relative bg-dm-bg/95 sm:bg-dm-bg/80 backdrop-blur-xl border border-dm-accent/20 border-b-0 sm:border-b rounded-t-2xl sm:rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-full max-h-full sm:max-h-[90vh] flex flex-col animate-in max-sm:slide-in-from-bottom sm:fade-in sm:zoom-in-95 overflow-hidden";

const isPhone = () => window.matchMedia("(max-width: 639px)").matches;

/** Lets the user drag a bottom sheet down by its header to dismiss it (phones only). */
function useSwipeToClose(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  const setOffset = (dy: number, animate: boolean) => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 180ms ease-out" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!isPhone() || (e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      drag.current = { startY: e.clientY, dy: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return;
      drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
      setOffset(drag.current.dy, false);
    },
    onPointerUp: () => {
      if (!drag.current) return;
      const { dy } = drag.current;
      drag.current = null;
      if (dy > 90) onClose();
      else setOffset(0, true);
    },
  };
  return { panelRef, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}

export function Modal({ isOpen, onClose, title, children, className, headerRight, closeOnBackdrop }: ModalProps) {
  const { panelRef, handlers } = useSwipeToClose(onClose);

  return (
    <Overlay isOpen={isOpen} onClose={onClose} closeOnBackdrop={closeOnBackdrop} sheet>
      <div ref={panelRef} role="dialog" aria-modal="true" className={cn(sheetPanelClass, "sm:max-w-2xl", className)}>
        <div className="touch-none sm:touch-auto" {...handlers}>
          <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-dm-muted/50" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 sm:p-4 border-b border-dm-accent/10">
            <h2 className="text-lg sm:text-2xl font-display text-dm-accent uppercase tracking-widest min-w-0 break-words">{title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="p-2 -mr-2 text-dm-accent hover:text-dm-text-bright transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </Overlay>
  );
}
