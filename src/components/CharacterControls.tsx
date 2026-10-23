import React, { useEffect, useRef, useState } from "react";
import { Heart, Swords, Dices, Minus, Plus, RotateCcw, Shield, ArrowRight } from "lucide-react";
import { useStore, actions } from "../store/useStore";
import { useModalLayer } from "./ui/Modal";
import { Character } from "../types";
import { cn, formatMod } from "../lib/utils";
import { showToast } from "./Toasts";

/*
 * Small controls shared by the character cards and the compact list in Grupo:
 * the HP tracker and the "add to initiative" button, each with its own popover.
 */

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  panelClassName?: string;
}

/** Panel under its trigger. Closes on outside click and on Escape (only the popover, not a modal under it). */
export function Popover({ open, onOpenChange, trigger, children, align = "right", className, panelClassName }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  useModalLayer(open, () => onOpenChange(false));
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onOpenChange(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger}
      {open && (
        <div
          role="menu"
          data-no-dnd="true"
          className={cn(
            "absolute top-full mt-1 z-40 bg-dm-bg-darker border border-dm-border rounded-sm shadow-xl font-sans text-dm-text cursor-default",
            align === "right" ? "right-0" : "left-0",
            panelClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const hpColor = (pct: number) => (pct > 50 ? "bg-dm-accent" : pct > 25 ? "bg-dm-danger-hover" : "bg-dm-danger");

/** HP bar with current / max and temporary HP. Clicking it opens damage / heal controls. */
export function HpTracker({ character, open, onOpenChange, hitDice, compact }: {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hitDice?: string;
  /** Narrow version for the list rows. */
  compact?: boolean;
}) {
  const max = character.hpMax || 0;
  const cur = Math.min(max, character.hpCurrent ?? max);
  const temp = character.hpTemp || 0;
  const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const [amount, setAmount] = useState("");
  useEffect(() => { if (open) setAmount(""); }, [open]);

  const n = Math.max(0, parseInt(amount, 10) || 0);
  const set = (hp: number, t: number) => { actions.setCharacterHp(character, hp, t); setAmount(""); };
  const damage = () => {
    if (!n) return;
    const absorbed = Math.min(temp, n);
    set(cur - (n - absorbed), temp - absorbed);
  };
  const heal = () => n && set(cur + n, temp);
  const setTemp = () => set(cur, n);
  const restore = () => { set(max, 0); onOpenChange(false); };

  const trigger = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      title="Puntos de golpe: pulsa para aplicar daño o curación"
      aria-label={`Puntos de golpe ${cur} de ${max}${temp ? `, ${temp} temporales` : ""}`}
      className={cn("w-full text-left rounded-sm group", compact ? "py-0.5" : "px-2 py-1.5 bg-dm-bg-hover border border-dm-border hover:border-dm-accent/60 transition-colors")}
    >
      <div className="flex items-center gap-1.5 text-xs font-sans">
        {!compact && <Heart size={13} className="text-dm-accent shrink-0" />}
        {!compact && <span className="text-[10px] uppercase tracking-wider text-dm-muted">PV</span>}
        <span className={cn("font-bold tabular-nums", cur === 0 ? "text-dm-danger" : "text-dm-text-bright")}>{cur}</span>
        <span className="text-dm-muted tabular-nums">/ {max}</span>
        {temp > 0 && <span className="text-sky-400 font-semibold tabular-nums" title="Puntos de golpe temporales">+{temp}</span>}
        {!compact && hitDice && <span className="text-dm-muted tabular-nums truncate">({hitDice})</span>}
        {!compact && <span className="ml-auto text-[10px] uppercase tracking-wider text-dm-muted group-hover:text-dm-accent transition-colors">Ajustar</span>}
      </div>
      <div className={cn("relative bg-dm-bg-darker rounded-full overflow-hidden", compact ? "h-1 mt-1" : "h-1.5 mt-1.5")}>
        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", hpColor(pct))} style={{ width: `${pct}%` }} />
        {temp > 0 && <div className="absolute inset-y-0 right-0 bg-sky-400/80 rounded-full" style={{ width: `${Math.min(100, (temp / Math.max(1, max)) * 100)}%` }} />}
      </div>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} trigger={trigger} align="left" panelClassName="w-64 p-3 space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-dm-muted">Puntos de golpe</span>
        <span className="tabular-nums">
          <b className="text-lg text-dm-text-bright">{cur}</b> <span className="text-dm-muted">/ {max}</span>
          {temp > 0 && <span className="text-sky-400 font-semibold"> +{temp}</span>}
        </span>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); damage(); }}>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Cantidad"
          aria-label="Cantidad"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full h-10 px-3 bg-dm-bg border border-dm-border rounded-sm text-center text-lg font-bold tabular-nums focus:outline-none focus:border-dm-accent"
        />
      </form>
      <div className="grid grid-cols-3 gap-1.5">
        <PopButton onClick={damage} disabled={!n} tone="danger" title="Intro también aplica daño. Los PV temporales se gastan primero."><Minus size={14} /> Daño</PopButton>
        <PopButton onClick={heal} disabled={!n} tone="accent"><Plus size={14} /> Curar</PopButton>
        <PopButton onClick={setTemp} tone="sky" title="Fija los PV temporales a esta cantidad (0 los quita)"><Shield size={14} /> Temp.</PopButton>
      </div>
      <button
        type="button"
        onClick={restore}
        className="w-full flex items-center justify-center gap-2 py-1.5 text-xs uppercase tracking-wider text-dm-muted border-t border-dm-border pt-2.5 hover:text-dm-accent transition-colors"
      >
        <RotateCcw size={13} /> Restaurar al máximo
      </button>
    </Popover>
  );
}

function PopButton({ onClick, disabled, tone, title, children }: { onClick: () => void; disabled?: boolean; tone: "danger" | "accent" | "sky"; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center justify-center gap-1 py-2 text-xs font-bold uppercase tracking-wide border rounded-sm transition-colors disabled:opacity-40 disabled:pointer-events-none",
        tone === "danger" && "border-dm-danger/60 text-dm-danger hover:bg-dm-danger hover:text-dm-text-bright",
        tone === "accent" && "border-dm-accent/60 text-dm-accent hover:bg-dm-accent hover:text-dm-bg-darker",
        tone === "sky" && "border-sky-400/50 text-sky-400 hover:bg-sky-400 hover:text-dm-bg-darker"
      )}
    >
      {children}
    </button>
  );
}

const goToInitiative = { label: "Ver", onClick: () => actions.updateUI({ activeTab: "initiative" }) };

/** Sword button that adds the character to the initiative, rolling d20 + DEX or with a typed value. */
export function InitiativeButton({ character, open, onOpenChange, buttonClassName }: {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buttonClassName?: string;
}) {
  const combatants = useStore((s) => s.combatants);
  const linked = combatants.find((c) => c.characterId === character.id && !c.isTemp);
  const isCreature = character.type === "creature";
  const dexMod = Math.floor((character.stats.DEX - 10) / 2);
  const [autoRoll, setAutoRoll] = useState(true);
  const [manual, setManual] = useState("");
  const [count, setCount] = useState(1);
  useEffect(() => { if (open) { setManual(""); setCount(1); } }, [open]);

  const roll = () => (autoRoll ? Math.floor(Math.random() * 20) + 1 + dexMod : Number(manual) || 0);
  const canAdd = autoRoll || manual !== "";

  const add = () => {
    if (!canAdd) return;
    if (!linked && count === 1) {
      const value = roll();
      actions.addCombatant(character.id, value);
      showToast(`${character.name} entra en la iniciativa con ${value}.`, goToInitiative);
    } else {
      // More copies of a creature: numbered temporary combatants, like the bestiary does.
      const { id, type, hpCurrent, hpTemp, tags, ...rest } = character as Extract<Character, { type: "creature" }>;
      const already = combatants.filter((c) => c.characterId === id || c.tempData?.name.replace(/\s*\(\d+\)$/, "") === character.name).length;
      const values: number[] = [];
      for (let i = 0; i < count; i++) {
        const value = roll();
        values.push(value);
        actions.addTempCombatant({ ...rest, isTemp: true, name: `${character.name} (${already + i + 1})` }, value, true);
      }
      showToast(`${count > 1 ? `${character.name} ×${count}` : character.name} en la iniciativa: ${values.join(", ")}.`, goToInitiative);
    }
    onOpenChange(false);
  };

  const trigger = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      title={linked ? `En la iniciativa (${linked.initiative})` : "Añadir a la iniciativa"}
      aria-label="Añadir a la iniciativa"
      className={cn("p-2.5 sm:p-1.5 rounded-sm transition-colors hover:text-dm-accent", linked || open ? "text-dm-accent" : "text-dm-muted", buttonClassName)}
    >
      <Swords size={16} />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} trigger={trigger} panelClassName="w-64 p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-widest text-dm-muted">Añadir a la iniciativa</div>

      {linked && !isCreature ? (
        <>
          <p className="text-sm">Ya está en la iniciativa con <b className="text-dm-accent">{linked.initiative}</b>.</p>
          <button
            type="button"
            onClick={() => { onOpenChange(false); goToInitiative.onClick(); }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-wider border border-dm-border text-dm-muted rounded-sm hover:text-dm-accent hover:border-dm-accent transition-colors"
          >
            Ir a iniciativa <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <>
          {linked && <p className="text-xs text-dm-muted">Ya hay una en combate ({linked.initiative}); se añadirán copias numeradas.</p>}
          {isCreature && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Cantidad</span>
              <div className="flex items-center border border-dm-border rounded-sm bg-dm-bg">
                <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="p-2 text-dm-muted hover:text-dm-accent" aria-label="Una menos"><Minus size={13} /></button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{count}</span>
                <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} className="p-2 text-dm-muted hover:text-dm-accent" aria-label="Una más"><Plus size={13} /></button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 border border-dm-border rounded-sm overflow-hidden" role="radiogroup">
            <button type="button" role="radio" aria-checked={autoRoll} onClick={() => setAutoRoll(true)}
              className={cn("flex items-center justify-center gap-1.5 py-2 text-xs transition-colors", autoRoll ? "bg-dm-accent/15 text-dm-accent font-bold" : "text-dm-muted hover:text-dm-accent")}>
              <Dices size={14} /> d20{formatMod(character.stats.DEX)}
            </button>
            <button type="button" role="radio" aria-checked={!autoRoll} onClick={() => setAutoRoll(false)}
              className={cn("py-2 text-xs border-l border-dm-border transition-colors", !autoRoll ? "bg-dm-accent/15 text-dm-accent font-bold" : "text-dm-muted hover:text-dm-accent")}>
              Manual
            </button>
          </div>
          {!autoRoll && (
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              placeholder="Valor de iniciativa"
              aria-label="Valor de iniciativa"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); }}
              className="w-full h-9 px-3 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent"
            />
          )}
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="w-full flex items-center justify-center gap-2 py-2 bg-dm-accent text-dm-bg-darker font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-dm-accent-hover transition-colors disabled:opacity-50"
          >
            <Swords size={14} /> Añadir a combate
          </button>
        </>
      )}
    </Popover>
  );
}
