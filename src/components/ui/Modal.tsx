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
  className?: string;
  zIndex?: string;
}

/** Bare full-screen overlay: portal + backdrop + Escape handling. Content is up to the caller. */
export function Overlay({ isOpen, onClose, children, closeOnBackdrop = true, className, zIndex = "z-50" }: OverlayProps) {
  useModalLayer(isOpen, onClose);
  if (!isOpen) return null;

  return createPortal(
    <div className={cn("fixed inset-0 flex items-center justify-center p-2 sm:p-6", zIndex, className)}>
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
  "relative bg-dm-bg/80 backdrop-blur-xl border border-dm-accent/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden";

export function Modal({ isOpen, onClose, title, children, className, headerRight, closeOnBackdrop }: ModalProps) {
  return (
    <Overlay isOpen={isOpen} onClose={onClose} closeOnBackdrop={closeOnBackdrop}>
      <div role="dialog" aria-modal="true" className={cn(modalPanelClass, "max-w-2xl", className)}>
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-dm-accent/10">
          <h2 className="text-lg sm:text-2xl font-display text-dm-accent uppercase tracking-widest min-w-0 break-words">{title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1 text-dm-accent hover:text-dm-text-bright transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </Overlay>
  );
}
