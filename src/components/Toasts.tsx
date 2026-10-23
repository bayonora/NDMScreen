import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void } };

// Tiny shared store so any part of the app can confirm an action without a blocking alert().
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const emit = (next: Toast[]) => {
  toasts = next;
  listeners.forEach((l) => l());
};
const dismiss = (id: number) => emit(toasts.filter((t) => t.id !== id));

/** Shows a short message at the bottom of the screen, with an optional button ("Ver"). */
export function showToast(message: string, action?: Toast["action"]) {
  emit([...toasts, { id: Date.now() + Math.random(), message, action }].slice(-3));
}

function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), toast.action ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      role="status"
      className="pointer-events-auto flex items-center gap-3 max-w-full pl-3 pr-1.5 py-1.5 rounded-lg border border-dm-accent/50 bg-dm-bg/95 backdrop-blur-md shadow-xl shadow-black/60 text-sm"
    >
      <Check size={16} className="text-dm-accent shrink-0" />
      <span className="text-dm-text min-w-0">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); dismiss(toast.id); }}
          className="shrink-0 px-2.5 py-1 text-xs uppercase tracking-wider font-bold text-dm-accent border border-dm-accent/50 rounded-sm hover:bg-dm-accent hover:text-dm-bg-darker transition-colors"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Cerrar aviso" className="shrink-0 p-1.5 text-dm-muted hover:text-dm-accent">
        <X size={14} />
      </button>
    </motion.div>
  );
}

/** Mounted once in App. */
export function ToastHost() {
  const current = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => toasts
  );
  return createPortal(
    <div className="fixed z-[105] left-4 right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] flex flex-col items-center gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {current.map((t) => <ToastItem key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>,
    document.body
  );
}
