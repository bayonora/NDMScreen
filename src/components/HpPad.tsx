import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, Minus, Plus, Shield, RotateCcw } from "lucide-react";
import { useModalLayer } from "./ui/Modal";
import { cn } from "../lib/utils";
import { evaluateExpr, parseHpChange } from "../lib/mathExpr";

/*
 * Quick HP editor shared by the party cards and the initiative tracker.
 * One field: "-5" deals 5 damage, "+5" heals 5, "20" sets HP to 20. Enter applies.
 * The buttons apply the typed amount for mouse / touch users.
 */

export interface HpPadProps {
  cur: number;
  max: number;
  temp: number;
  title?: string;
  /** Damage taken: temporary HP absorb it first. */
  onDamage: (n: number) => void;
  onHeal: (n: number) => void;
  onSet: (hp: number) => void;
  onTemp: (n: number) => void;
  onRestore: () => void;
  /** Called after any change is applied. */
  onDone: () => void;
}

export function HpPad({ cur, max, temp, title, onDamage, onHeal, onSet, onTemp, onRestore, onDone }: HpPadProps) {
  const [text, setText] = useState("");
  const change = text.trim() ? parseHpChange(text) : null;
  const raw = text.trim() ? evaluateExpr(text) : null;
  const amount = raw === null ? 0 : Math.abs(raw);

  const run = (fn: () => void) => { fn(); setText(""); onDone(); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!change) return;
    if (change.kind === "damage") run(() => onDamage(change.amount));
    else if (change.kind === "heal") run(() => onHeal(change.amount));
    else run(() => onSet(Math.min(max, change.amount)));
  };

  // What Enter will do, shown under the field.
  let hint: React.ReactNode = <span className="text-dm-muted">−5 daño · +5 cura · 20 fija</span>;
  if (text.trim() && !change) hint = <span className="text-dm-muted">Escribe un número o una suma</span>;
  else if (change) {
    const absorbed = change.kind === "damage" ? Math.min(temp, change.amount) : 0;
    const next =
      change.kind === "damage" ? Math.max(0, cur - (change.amount - absorbed))
      : change.kind === "heal" ? Math.min(max, cur + change.amount)
      : Math.min(max, change.amount);
    hint = (
      <>
        <span className={cn("font-bold uppercase tracking-wide", change.kind === "damage" ? "text-dm-danger" : change.kind === "heal" ? "text-green-500" : "text-dm-accent")}>
          {change.kind === "damage" ? `Daño ${change.amount}` : change.kind === "heal" ? `Cura ${change.amount}` : "Fijar"}
        </span>
        {absorbed > 0 && <span className="text-sky-400"> ({absorbed} temp.)</span>}
        <span className="text-dm-muted"> → </span>
        <b className="text-dm-text-bright tabular-nums">{next}</b>
        <span className="ml-auto text-dm-muted">Intro ↵</span>
      </>
    );
  }

  return (
    <div className="w-60 p-2.5 space-y-2 font-sans text-dm-text">
      {title && <div className="text-[10px] uppercase tracking-widest text-dm-muted truncate">{title}</div>}
      <form onSubmit={submit}>
        <label className="flex items-center gap-2 h-11 px-3 bg-dm-bg border border-dm-border rounded-sm focus-within:border-dm-accent transition-colors cursor-text">
          <Heart size={14} className={cn("shrink-0", cur === 0 ? "text-dm-muted" : "text-dm-danger")} />
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="done"
            placeholder={String(cur)}
            aria-label={`Puntos de golpe: ${cur} de ${max}. Escribe −5 para daño, +5 para curar o un valor nuevo`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-xl font-bold tabular-nums text-dm-text-bright placeholder:text-dm-text-bright/70"
          />
          <span className="text-sm text-dm-muted tabular-nums shrink-0">/ {max}</span>
          {temp > 0 && <span className="text-sm text-sky-400 font-bold tabular-nums shrink-0" title="Puntos de golpe temporales">+{temp}</span>}
        </label>
      </form>
      <div className="flex items-center gap-1 h-4 text-[11px] leading-none whitespace-nowrap">{hint}</div>
      <div className="grid grid-cols-4 gap-1">
        <PadButton tone="danger" disabled={!amount} onClick={() => run(() => onDamage(amount))} title="Aplica la cantidad como daño (los PV temporales se gastan primero)">
          <Minus size={13} /> Daño
        </PadButton>
        <PadButton tone="heal" disabled={!amount} onClick={() => run(() => onHeal(amount))} title="Cura la cantidad">
          <Plus size={13} /> Cura
        </PadButton>
        <PadButton tone="sky" disabled={raw === null} onClick={() => run(() => onTemp(amount))} title="Fija los PV temporales a la cantidad (0 los quita)">
          <Shield size={13} /> Temp
        </PadButton>
        <PadButton tone="muted" onClick={() => run(onRestore)} title="Restaura los PV al máximo y quita los temporales">
          <RotateCcw size={13} /> Máx
        </PadButton>
      </div>
    </div>
  );
}

function PadButton({ tone, disabled, onClick, title, children }: {
  tone: "danger" | "heal" | "sky" | "muted";
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 h-11 text-[10px] font-bold uppercase tracking-wide border rounded-sm transition-colors disabled:opacity-35 disabled:pointer-events-none",
        tone === "danger" && "border-dm-danger/40 text-dm-danger hover:bg-dm-danger hover:text-dm-text-bright",
        tone === "heal" && "border-green-600/40 text-green-500 hover:bg-green-700 hover:text-white",
        tone === "sky" && "border-sky-400/40 text-sky-400 hover:bg-sky-400 hover:text-dm-bg-darker",
        tone === "muted" && "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Floating panel pinned to an element, drawn in a portal so rows with overflow-hidden
 * don't clip it. Opens below the anchor (above if there is no room) and stays inside the screen.
 * Closes on Escape or on a click outside.
 */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

export function AnchoredPanel({ anchor, onClose, children }: { anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useModalLayer(!!anchor, onClose);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      if (!anchor.isConnected) return onCloseRef.current();
      const r = anchor.getBoundingClientRect();
      const panel = ref.current;
      const w = panel?.offsetWidth ?? 240;
      const h = panel?.offsetHeight ?? 160;
      const vw = window.innerWidth, vh = window.innerHeight, gap = 6, edge = 8;
      const left = Math.max(edge, Math.min(r.left, vw - w - edge));
      const below = r.bottom + gap;
      const top = below + h > vh - edge && r.top - gap - h >= edge ? r.top - gap - h : Math.min(below, vh - h - edge);
      setPos((p) => (p && p.top === top && p.left === left ? p : { top, left }));
    };
    place();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onCloseRef.current();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [anchor]);

  if (!anchor) return null;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      data-no-dnd="true"
      // The panel lives in a portal but React still bubbles its events to the card: keep drags and clicks here.
      onMouseDown={stop}
      onTouchStart={stop}
      onClick={stop}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      className="fixed z-50 bg-dm-bg-darker border border-dm-border rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-100"
    >
      {children}
    </div>,
    document.body
  );
}
