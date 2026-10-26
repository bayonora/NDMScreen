import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Dices } from "lucide-react";
import { rollDice, DiceResult } from "../lib/dice";

type Roll = DiceResult & { id: number; label: string };

// Tiny shared store so any part of the app (notes, search previews...) can show a roll result.
let rolls: Roll[] = [];
const listeners = new Set<() => void>();
const emit = (next: Roll[]) => {
  rolls = next;
  listeners.forEach((l) => l());
};

/** Rolls `notation` ("1d20+5") and shows the result in the corner. `label` says where it came from. */
export function showRoll(notation: string, label: string) {
  const r = rollDice(notation);
  if (r) emit([{ ...r, id: Date.now() + Math.random(), label }, ...rolls].slice(0, 3));
}

/** Mounted once in App: the stack of the latest roll results. */
export function RollToastHost() {
  const current = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => rolls
  );
  const onDismiss = () => emit([]);

  // Results fade away a few seconds after the last roll.
  useEffect(() => {
    if (!current.length) return;
    const t = setTimeout(onDismiss, 7000);
    return () => clearTimeout(t);
  }, [current]);

  return createPortal(
    <div className="fixed z-[110] bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 left-4 sm:left-auto flex flex-col items-stretch sm:items-end gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {current.map((r, i) => {
          const color = r.crit === "hit" ? "#4ade80" : r.crit === "miss" ? "var(--theme-danger)" : "var(--theme-accent)";
          return (
            <motion.button
              type="button"
              key={r.id}
              layout
              onClick={onDismiss}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: i === 0 ? 1 : 0.65, y: 0, scale: i === 0 ? 1 : 0.94 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              title="Cerrar"
              className="pointer-events-auto origin-bottom-right flex items-center gap-3 sm:min-w-64 pl-3 pr-4 py-2.5 rounded-lg border bg-dm-bg/95 shadow-xl shadow-black/60 text-left"
              style={{ borderColor: color }}
            >
              <Dices size={22} style={{ color }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-dm-muted truncate">{r.label} · <span className="text-dm-text">{r.notation}</span></div>
                <div className="text-xs text-dm-text-muted tabular-nums truncate">
                  [{r.rolls.join(", ")}]{r.modifier ? ` ${r.modifier > 0 ? "+" : "−"} ${Math.abs(r.modifier)}` : ""}
                  {r.crit === "hit" && <span className="ml-2 font-bold" style={{ color }}>¡Crítico!</span>}
                  {r.crit === "miss" && <span className="ml-2 font-bold" style={{ color }}>Pifia</span>}
                </div>
              </div>
              <span className="font-display text-3xl font-bold tabular-nums leading-none" style={{ color }}>{r.total}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
