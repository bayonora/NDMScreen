import React, { useEffect, useRef, useState } from "react";
import { useStore, actions } from "../store/useStore";
import { Character, StatusEffect } from "../types";
import { Input, Button, Textarea } from "../components/ui/Input";
import { Modal, Overlay } from "../components/ui/Modal";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { Play, SkipForward, Square, Plus, Shield, Heart, Trash2, RotateCcw, Skull, UserCheck, User, Copy, Swords } from "lucide-react";
import { cn } from "../lib/utils";
import { StatBlock } from "../components/StatBlock";
import { motion, AnimatePresence } from "motion/react";
import { MathInput } from "../components/MathInput";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

export function ViewInitiative() {
  const combatants = useStore((state) => state.combatants);
  const graveyard = useStore((state) => state.graveyard);
  const isCombatActive = useStore((state) => state.uiState.combatActive) || false;
  const activeCombatantId = useStore((state) => state.uiState.activeCombatantId) || null;
  const round = useStore((state) => state.uiState.round) || 1;
  let activeTurnIdx = combatants.findIndex(c => c.id === activeCombatantId);
  if (activeTurnIdx === -1) activeTurnIdx = 0;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ open: boolean; combatantId: string; effect?: StatusEffect }>({ open: false, combatantId: "" });
  const [viewCharModal, setViewCharModal] = useState<{ open: boolean; char?: Character }>({ open: false });
  const [hpModalId, setHpModalId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  // Keep the active combatant on screen as turns advance (long lists on phones).
  useEffect(() => {
    if (!isCombatActive || !activeCombatantId) return;
    rowRefs.current.get(activeCombatantId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isCombatActive, activeCombatantId]);
  // Subscribed so the open stat block re-renders when the character is edited (e.g. tags).
  useStore((state) => state.players);
  useStore((state) => state.npcs);
  useStore((state) => state.creatures);
  const viewedChar = (() => {
    const snapshot = viewCharModal.char;
    if (!snapshot) return undefined;
    const temp = [...combatants, ...graveyard].find((c) => c.tempData?.id === snapshot.id)?.tempData;
    return temp || actions.getCharacter(snapshot.id) || snapshot;
  })();

  const handleStartCombat = () => {
    actions.updateUI({ combatActive: true, activeCombatantId: combatants[0]?.id || null, round: 1 });
  };

  const handleNextTurn = () => {
    if (combatants.length === 0) return;

    // Decrementar estados del combatiente cuyo turno termina
    const currentCombatant = combatants[activeTurnIdx];
    if (currentCombatant) {
      const updatedStatuses = currentCombatant.statuses.reduce((acc, s) => {
        if (s.duration === 0) {
          // Infinito
          acc.push(s);
        } else if (s.duration > 0) {
          const newDuration = s.duration - 1;
          if (newDuration > 0) {
            acc.push({ ...s, duration: newDuration });
          }
        } else {
          // Sin duración (legacy)
          acc.push(s);
        }
        return acc;
      }, [] as StatusEffect[]);

      actions.updateCombatant(currentCombatant.id, { statuses: updatedStatuses });
    }

    const nextIndex = (activeTurnIdx + 1) % combatants.length;
    // Wrapping back to the top of the order starts a new round.
    actions.updateUI({ activeCombatantId: combatants[nextIndex]?.id || null, round: nextIndex === 0 ? round + 1 : round });
  };

  const handleEndCombat = () => {
    actions.updateUI({ combatActive: false, activeCombatantId: null, round: 1 });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={Swords}
        title="Iniciativa"
        actions={
          <>
            <ToolbarButton icon={Skull} label={`Cementerio (${graveyard.length})`} onClick={() => setIsGraveyardOpen(true)} />
            <ToolbarButton icon={Plus} label="Añadir" variant="primary" showLabel="always" onClick={() => setIsAddModalOpen(true)} />
          </>
        }
      >
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {!isCombatActive ? (
            <Button onClick={handleStartCombat} disabled={combatants.length === 0} className="whitespace-nowrap">
              <Play size={14} className="mr-1" /> Iniciar Combate
            </Button>
          ) : (
            <>
              <span className="text-xs uppercase tracking-widest text-dm-accent font-bold border border-dm-accent/40 bg-dm-accent/10 px-3 py-2">
                Ronda {round}
              </span>
              <Button onClick={handleNextTurn} className="whitespace-nowrap flex-1 sm:flex-none">
                <SkipForward size={14} className="mr-1" /> Siguiente Turno
              </Button>
              <Button onClick={handleEndCombat} variant="danger" className="whitespace-nowrap">
                <Square size={14} className="mr-1" /> Finalizar
              </Button>
            </>
          )}
        </div>
      </ViewHeader>


      <div className="flex-1 overflow-y-auto custom-scrollbar">

        <div className="flex flex-col pb-12 sm:pb-16">
          <AnimatePresence mode="popLayout">
            {combatants.map((c, idx) => {
              const char = (c.isTemp && c.tempData) ? c.tempData : actions.getCharacter(c.characterId);
              if (!char) return null;
              const isActive = isCombatActive && idx === activeTurnIdx;
              
              const hpPct = Math.max(0, Math.min(100, (c.hpCurrent / char.hpMax) * 100));
              const isDead = c.hpCurrent <= 0;
              const isCritical = hpPct <= 25 && hpPct > 0;
              const isBadlyWounded = hpPct <= 50 && hpPct > 25;
              const isBloodied = hpPct <= 75 && hpPct > 50;
              const isHurt = hpPct < 100 && hpPct > 75;
              const isFull = hpPct === 100;
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: isDead ? 0.6 : 1, 
                    x: 0,
                    filter: isDead ? 'grayscale(100%)' : 'grayscale(0%)'
                  }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ duration: 0.3 }}
                  key={c.id} 
                  ref={(el: HTMLDivElement | null) => { if (el) rowRefs.current.set(c.id, el); else rowRefs.current.delete(c.id); }}
                  className={cn(
                    "flex items-center px-2 sm:px-6 py-2.5 sm:py-4 border-b transition-colors relative overflow-hidden group",
                    isDead ? "border-dm-danger/30" : "border-dm-bg-card",
                    isActive ? "bg-dm-bg-card" : "hover:bg-dm-bg",
                    isFull && !isDead ? "shadow-[inset_0_0_10px_color-mix(in_srgb,var(--theme-accent)_3%,transparent)]" : "",
                    isHurt && !isDead ? "shadow-[inset_0_0_15px_color-mix(in_srgb,var(--theme-danger)_3%,transparent)]" : "",
                    isBloodied && !isDead ? "shadow-[inset_0_0_20px_color-mix(in_srgb,var(--theme-danger)_8%,transparent)]" : "",
                    isBadlyWounded && !isDead ? "shadow-[inset_0_0_30px_color-mix(in_srgb,var(--theme-danger)_15%,transparent)] border-dm-danger/30" : "",
                    isCritical && !isDead ? "shadow-[inset_0_0_40px_color-mix(in_srgb,var(--theme-danger)_25%,transparent)] border-dm-danger/60" : ""
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-dm-accent shadow-[0_0_10px_var(--theme-accent)] z-10 pointer-events-none" />
                  )}
                  {(isCritical || isBadlyWounded) && !isDead && (
                    <motion.div 
                      className={cn("absolute inset-0 pointer-events-none mix-blend-screen", isCritical ? "bg-dm-danger/20" : "bg-dm-danger/10")}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: isCritical ? 1 : 2, ease: "easeInOut" }}
                    />
                  )}
                  {isDead && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-dm-danger/10 to-dm-danger/30 pointer-events-none" />
                  )}
                  {isDead && (
                    <div className="absolute right-16 sm:right-32 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none rotate-12 scale-150">
                      <Skull size={100} />
                    </div>
                  )}
                  {isDead && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 w-[60%] h-px bg-dm-danger/70 shadow-[0_0_10px_var(--theme-danger)] pointer-events-none z-10" />
                  )}

                  <div className={cn("w-11 sm:w-16 shrink-0 flex items-center justify-center font-bold", isActive ? "text-dm-accent" : "text-dm-text-bright opacity-50")}>
                    <MathInput
                      value={c.initiative}
                      onValueChange={(val) => actions.updateCombatant(c.id, { initiative: val })}
                      inputMode="numeric"
                      className="w-10 sm:w-12 text-center text-xl sm:text-2xl h-10 px-0 font-bold border-none bg-transparent focus:bg-dm-border rounded-sm"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between min-w-0 pr-1 sm:pr-4 gap-1 md:gap-4">
                    <div className="flex-1 flex flex-col min-w-0 gap-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <button 
                          onClick={() => setViewCharModal({ open: true, char })}
                          className={cn(
                            "font-bold text-lg text-left truncate transition-colors", 
                            isActive ? "text-dm-text-bright" : "text-dm-text-bright opacity-80", 
                            isDead ? "line-through text-dm-muted decoration-dm-danger" : "",
                            "hover:text-dm-accent"
                          )}
                        >
                          {char.type === "player" && <User size={16} className="inline-block mr-2 text-green-600" />}
                          {char.type === "creature" && <Skull size={16} className="inline-block mr-2 text-dm-danger" />}
                          {char.type === "npc" && <UserCheck size={16} className="inline-block mr-2 text-blue-500" />}
                          {char.name}
                        </button>
                        
                        <div className="flex flex-wrap gap-1 items-center sm:ml-2">
                          {c.statuses.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => setStatusModal({ open: true, combatantId: c.id, effect: s })}
                              className="px-2 py-0.5 bg-dm-danger/20 text-dm-danger text-[11px] uppercase tracking-wider rounded-sm border border-dm-danger/50 cursor-pointer hover:bg-dm-danger/40 truncate max-w-[150px] font-bold"
                              title={s.description}
                            >
                              {s.name}{s.duration ? ` (${s.duration})` : ""}
                            </button>
                          ))}
                          <button 
                            onClick={() => setStatusModal({ open: true, combatantId: c.id })}
                            className="w-7 h-7 sm:w-5 sm:h-5 rounded-sm border border-dm-border flex items-center justify-center text-sm sm:text-[12px] opacity-60 sm:opacity-40 hover:opacity-100 hover:text-dm-accent hover:border-dm-accent"
                            title="Añadir Estado"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className={cn("text-[10px] uppercase font-bold", isActive ? "opacity-100 text-dm-accent" : "opacity-30 hidden sm:inline")}>
                        {isActive ? "▶ TURNO ACTIVO" : (char.type === "player" ? "Jugador" : char.type === "creature" ? "Criatura" : "NPC")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 md:mt-0 justify-between w-full md:w-auto">
                      <div className="flex-1 md:w-48 flex flex-col justify-center md:items-end md:pr-4">
                        <div className="flex items-center gap-1 text-sm font-mono mb-1 justify-start md:justify-end w-full">
                            <button
                              type="button"
                              onClick={() => setHpModalId(c.id)}
                              title="Daño / curación"
                              aria-label={`Daño o curación para ${char.name}`}
                              className="mr-auto -m-1.5 p-1.5 shrink-0 rounded-sm hover:bg-dm-bg-hover"
                            >
                              <Heart size={14} className={cn(
                                "transition-colors",
                                isDead ? "text-dm-muted-alt" :
                                isCritical ? "text-dm-danger animate-bounce" :
                                isBadlyWounded ? "text-dm-danger animate-pulse" :
                                isActive ? "text-red-500" : "text-dm-danger"
                              )} />
                            </button>
                            <MathInput
                              value={c.hpCurrent}
                              onValueChange={(val) => actions.updateCombatant(c.id, { hpCurrent: val })}
                              className="hidden sm:block w-20 h-6 p-0 md:text-right text-left border-none bg-transparent text-dm-text text-xl font-bold focus:bg-dm-border rounded-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setHpModalId(c.id)}
                              className="sm:hidden flex items-baseline gap-1 px-2 -my-1 py-1 rounded-sm border border-transparent active:border-dm-accent"
                            >
                              <span className="text-dm-text text-xl font-bold">{c.hpCurrent}</span>
                              <span className="opacity-50 text-base">/ {char.hpMax}</span>
                            </button>
                            <span className="hidden sm:inline opacity-50 text-base select-none shrink-0">/ {char.hpMax}</span>
                        </div>
                        <div className={cn("w-full md:w-32 h-1.5 bg-dm-bg-hover rounded-full relative overflow-hidden border", (isCritical || isBadlyWounded) ? "border-dm-danger" : "border-dm-border", isCritical ? "animate-pulse" : "")}>
                          <div 
                            className={cn(
                              "absolute inset-0 transition-all duration-500", 
                              isDead ? "bg-dm-muted-alt" : 
                              isCritical ? "bg-dm-danger" : 
                              isBadlyWounded ? "bg-dm-danger-hover" :
                              char.type === "player" ? "bg-green-600" : 
                              char.type === "npc" ? "bg-blue-600" : "bg-red-800"
                            )} 
                            style={{ width: `${hpPct}%` }} 
                          />
                        </div>
                      </div>

                      <div className="w-12 sm:w-16 flex items-center justify-center">
                        <div className="flex items-center justify-center p-1 relative" title="Clase de Armadura">
                          <Shield size={34} className={cn("opacity-80", isActive ? "text-dm-accent" : "text-dm-border-focus")} />
                          <span className="absolute text-[13px] font-bold mt-[-2px]">{char.ac}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex justify-end items-center gap-1">
                    {c.isTemp && (
                      <button 
                        onClick={() => actions.duplicateTempCombatant(c.id)}
                        className="p-2 text-dm-muted hover:text-dm-accent transition-colors"
                        title="Duplicar criatura temporal"
                      >
                        <Copy size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => actions.killCombatant(c.id)}
                      className="p-2 text-dm-border hover:text-dm-danger transition-colors"
                      title="Mandar al cementerio"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {combatants.length === 0 && (
            <p className="text-center opacity-50 py-10 font-mono text-sm">El tracker está vacío.</p>
          )}
        </div>
      </div>

      {/* Phones: combat controls sit at the bottom, within thumb reach. */}
      {combatants.length > 0 && (
        <div className="sm:hidden shrink-0 flex items-stretch gap-2 px-3 py-2 border-t border-dm-border bg-dm-bg/95 backdrop-blur">
          {!isCombatActive ? (
            <Button onClick={handleStartCombat} className="flex-1 h-12 text-sm">
              <Play size={16} className="mr-2" /> Iniciar Combate
            </Button>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center px-3 border border-dm-accent/40 bg-dm-accent/10 text-dm-accent leading-none">
                <span className="text-[9px] uppercase tracking-widest">Ronda</span>
                <span className="text-lg font-bold">{round}</span>
              </div>
              <Button onClick={handleNextTurn} className="flex-1 h-12 text-sm">
                <SkipForward size={16} className="mr-2" /> Siguiente Turno
              </Button>
              <Button onClick={handleEndCombat} variant="danger" className="h-12 w-12 px-0" aria-label="Finalizar combate" title="Finalizar combate">
                <Square size={16} />
              </Button>
            </>
          )}
        </div>
      )}

      <AddCombatantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <HpAdjustModal combatantId={hpModalId} onClose={() => setHpModalId(null)} />
      
      <StatusModal 
        isOpen={statusModal.open} 
        onClose={() => setStatusModal({ open: false, combatantId: "" })} 
        combatantId={statusModal.combatantId}
        effect={statusModal.effect}
      />
      <GraveyardModal isOpen={isGraveyardOpen} onClose={() => setIsGraveyardOpen(false)} onViewChar={(char) => setViewCharModal({ open: true, char })} />
      <Overlay isOpen={viewCharModal.open && !!viewedChar} onClose={() => setViewCharModal({ open: false })}>
        <div className="relative max-w-md w-full max-h-full sm:max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
          {viewedChar && <StatBlock character={viewedChar} />}
        </div>
      </Overlay>
    </div>
  );
}

function AddCombatantModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const players = useStore((state) => state.players);
  const npcs = useStore((state) => state.npcs);
  const creatures = useStore((state) => state.creatures);
  const combatants = useStore((state) => state.combatants);
  const [mode, setMode] = useState<"existing" | "temp">("existing");
  const [selectedId, setSelectedId] = useState("");
  const [initiative, setInitiative] = useState("");
  
  const [tempName, setTempName] = useState("");
  const [tempHpMax, setTempHpMax] = useState("");
  const [tempAc, setTempAc] = useState("");
  const [isTempEnemy, setIsTempEnemy] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "existing") {
      if (selectedId && initiative) {
        actions.addCombatant(selectedId, Number(initiative));
        onClose();
        setSelectedId("");
        setInitiative("");
      }
    } else {
      if (!tempName) return;
      const npc = {
        name: tempName,
        hpMax: Number(tempHpMax) || 10,
        ac: Number(tempAc) || 10,
        isTemp: true,
        race: "Criatura Temporal",
        stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        cr: "",
        skills: "",
        senses: "",
        languages: "",
        specialTraits: "",
        actions: ""
      };
      actions.addTempCombatant(npc, Number(initiative) || 0, isTempEnemy);
      
      setTempName("");
      setTempHpMax("");
      setTempAc("");
      setInitiative("");
      onClose();
    }
  };

  const availablePlayers = players.filter(p => !combatants.some(c => c.characterId === p.id));
  const availableNpcs = npcs.filter(n => !combatants.some(c => c.characterId === n.id));
  const availableCreatures = (creatures || []).filter(cr => !combatants.some(c => c.characterId === cr.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir a Iniciativa">
      <div className="flex space-x-4 mb-6 border-b border-dm-accent/10">
        <button 
          type="button"
          className={cn("pb-2 uppercase tracking-widest text-xs font-bold transition-colors", mode === "existing" ? "text-dm-accent border-b-2 border-dm-accent" : "text-dm-muted hover:text-dm-text-bright border-b-2 border-transparent")}
          onClick={() => setMode("existing")}
        >
          Existente
        </button>
        <button 
          type="button"
          className={cn("pb-2 uppercase tracking-widest text-xs font-bold transition-colors", mode === "temp" ? "text-dm-accent border-b-2 border-dm-accent" : "text-dm-muted hover:text-dm-text-bright border-b-2 border-transparent")}
          onClick={() => setMode("temp")}
        >
          Nueva Temporal
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "existing" ? (
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Personaje</label>
            <select 
              value={selectedId} 
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex h-10 w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright focus:outline-none focus:border-dm-accent"
              required={mode === "existing"}
            >
              <option value="">Selecciona...</option>
              {availablePlayers.length > 0 && (
                <optgroup label="Jugadores">
                  {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
              {availableNpcs.length > 0 && (
                <optgroup label="NPCs">
                  {availableNpcs.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </optgroup>
              )}
              {availableCreatures.length > 0 && (
                <optgroup label="Criaturas">
                  {availableCreatures.map(cr => <option key={cr.id} value={cr.id}>{cr.name}</option>)}
                </optgroup>
              )}
            </select>
            {availablePlayers.length === 0 && availableNpcs.length === 0 && availableCreatures.length === 0 && (
              <p className="text-xs text-dm-danger mt-1">Todos los personajes ya están en la iniciativa.</p>
            )}
          </div>
        ) : (
          <>
            <Input label="Nombre de Criatura" value={tempName} onChange={e => setTempName(e.target.value)} required={mode === "temp"} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Vida Máxima (HP)" type="number" value={tempHpMax} onChange={e => setTempHpMax(e.target.value)} required={mode === "temp"} />
              <Input label="Armadura (CA)" type="number" value={tempAc} onChange={e => setTempAc(e.target.value)} required={mode === "temp"} />
            </div>
            <div className="flex items-center gap-2 text-sm text-dm-text mt-2">
              <input type="checkbox" id="isTempEnemy" checked={isTempEnemy} onChange={(e) => setIsTempEnemy(e.target.checked)} className="w-4 h-4 rounded accent-dm-danger" />
              <label htmlFor="isTempEnemy">Es Enemigo (Criatura)</label>
            </div>
          </>
        )}
        
        <Input 
          label="Tirada de Iniciativa" 
          type="number" 
          required 
          value={initiative}
          onChange={(e) => setInitiative(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mode === "existing" && !selectedId}>Añadir</Button>
        </div>
      </form>
    </Modal>
  );
}

const PREDEFINED_STATUSES = [
  { name: "Agarrado", description: "La velocidad de una criatura agarrada es 0 y no puede aumentar por encima de ese valor." },
  { name: "Apresado", description: "La velocidad de una criatura apresada es 0 y no puede aumentar por encima de este valor." },
  { name: "Asustado", description: "Una criatura asustada tiene desventaja en las pruebas de característica y tiradas de ataque mientras pueda ver a la fuente de su miedo." },
  { name: "Aturdido", description: "Una criatura aturdida está incapacitada, no puede moverse y solo es capaz de hablar con voz entrecortada." },
  { name: "Cegado", description: "Una criatura cegada no puede ver y falla automáticamente todas las pruebas de característica que requieran vista." },
  { name: "Concentración", description: "Cada vez que sufras daño mientras te concentras en un conjuro tendrás que hacer una tirada de salvación de Constitución. La CD será de 10 o la mitad del daño, lo mayor." },
  { name: "Dormido", description: "Permaneces inconsciente hasta que el conjuro termina, reciba daño o alguien le zarandee para que despierte." },
  { name: "Derribado", description: "Solo podrá moverse arrastrándose o levantarse. Desventaja en tiradas de ataque. Ataques en su contra tienen ventaja a 5 pies o menos, y desventaja a más distancia." },
  { name: "Envenenado", description: "Una criatura envenenada tiene desventaja en las tiradas de ataque y las pruebas de característica." },
  { name: "Hechizado", description: "No puede atacar ni elegir como objetivo de efectos dañinos/mágicos a quien la hechizó. Quien la hechizó tiene ventaja en pruebas de interacción social con ella." },
  { name: "Incapacitado", description: "Una criatura incapacitada no puede llevar a cabo acciones ni reacciones." },
  { name: "Inconsciente", description: "Incapacitada, no puede moverse/hablar, no es consciente. Suelta todo y cae derribada. Falla salvaciones de FUE y DES. Ataques en contra tienen ventaja y son críticos si están a 5 pies." },
  { name: "Invisible", description: "Imposible verla sin magia/sentidos. Para esconderse, se considera en zona muy oscura. Ataques en contra tienen desventaja, y sus ataques tienen ventaja." },
  { name: "Muriendo", description: "Si el daño que no te mata te reduce a 0 puntos de golpe, caes inconsciente y comienzas a morir." },
  { name: "Paralizado", description: "Incapacitada, no puede moverse/hablar. Falla salvaciones FUE/DES. Ataques en contra tienen ventaja y son críticos si están a 5 pies." }
];

function StatusModal({ isOpen, onClose, combatantId, effect }: { isOpen: boolean, onClose: () => void, combatantId: string, effect?: StatusEffect }) {
  const combatants = useStore((state) => state.combatants);
  const [name, setName] = useState(effect?.name || "");
  const [desc, setDesc] = useState(effect?.description || "");
  const [duration, setDuration] = useState(effect?.duration !== undefined ? String(effect.duration) : "0");

  React.useEffect(() => {
    if (isOpen) {
      setName(effect?.name || "");
      setDesc(effect?.description || "");
      setDuration(effect?.duration !== undefined ? String(effect.duration) : "0");
    }
  }, [isOpen, effect]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const c = combatants.find(x => x.id === combatantId);
    if (!c) return;

    const parsedDuration = Number(duration);
    if (isNaN(parsedDuration) || parsedDuration < 0) {
      alert("La duración debe ser un número válido mayor o igual a 0.");
      return;
    }

    let newStatuses = [...c.statuses];
    if (effect) {
      newStatuses = newStatuses.map(s => s.id === effect.id ? { ...s, name, description: desc, duration: parsedDuration } : s);
    } else {
      newStatuses.push({ id: Math.random().toString(), name, description: desc, duration: parsedDuration });
    }
    
    actions.updateCombatant(combatantId, { statuses: newStatuses });
    onClose();
  };

  const handleDelete = () => {
    const c = combatants.find(x => x.id === combatantId);
    if (!c || !effect) return;
    actions.updateCombatant(combatantId, { statuses: c.statuses.filter(s => s.id !== effect.id) });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={effect ? "Editar Estado" : "Nuevo Estado"}>
      <div className="flex flex-col md:flex-row gap-6 max-h-[70vh]">
        {!effect && (
          <div className="w-full md:w-1/3 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-dm-border pb-4 md:pb-0 md:pr-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] uppercase tracking-widest text-dm-accent font-bold mb-2">Predefinidos (D&D 5e)</h3>
            {PREDEFINED_STATUSES.map((status) => (
              <button
                key={status.name}
                type="button"
                onClick={() => {
                  setName(status.name);
                  setDesc(status.description);
                }}
                className="text-left text-sm px-3 py-2 bg-dm-bg-hover border border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent transition-colors"
              >
                {status.name}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-4", effect ? "w-full" : "w-full md:w-2/3")}>
          <Input 
            label="Nombre del Estado" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required 
          />
          <Textarea 
            label="Descripción" 
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-1"
          />
          <Input 
            label="Duración (Turnos, 0 = Indefinido)" 
            type="number"
            min="0"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          
          <div className="flex justify-between mt-auto pt-4 border-t border-dm-border">
            {effect ? (
              <Button type="button" variant="danger" onClick={handleDelete}>Borrar Estado</Button>
            ) : <div></div>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function GraveyardModal({ isOpen, onClose, onViewChar }: { isOpen: boolean, onClose: () => void, onViewChar: (char: Character) => void }) {
  const graveyard = useStore((state) => state.graveyard);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cementerio (Historial)">
      <div className="flex flex-col gap-2">
        {graveyard.map(c => {
          const char = (c.isTemp && c.tempData) ? c.tempData : actions.getCharacter(c.characterId);
          if (!char) return null;
          return (
            <div key={c.id} className="flex items-center justify-between p-3 bg-dm-bg border border-dm-border rounded-sm shadow-md">
              <div>
                <button onClick={() => { onViewChar(char); onClose(); }} className="font-bold hover:text-dm-accent truncate max-w-[200px] text-dm-text">
                  {char.name}
                </button>
                <div className="text-[10px] uppercase text-dm-accent opacity-60">HP al morir: {c.hpCurrent}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => actions.reviveCombatant(c.id)} title="Devolver a Iniciativa">
                  <RotateCcw size={14} />
                </Button>
                <Button variant="danger" onClick={() => setDeleteId(c.id)} title="Borrar del historial">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )
        })}
        {graveyard.length === 0 && <p className="text-dm-text opacity-50 text-center py-4 ">El cementerio está vacío.</p>}
      </div>
      <ConfirmDeleteModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={() => { if (deleteId) actions.deleteFromGraveyard(deleteId); }}
        title="Eliminar Permanente"
        message="¿Estás seguro de que quieres eliminar a este personaje del cementerio de forma permanente?"
      />
    </Modal>
  );
}





const HP_QUICK = [1, 2, 5, 10];

/** Damage / healing pad: phones adjust HP here without fiddling with a tiny inline field. */
function HpAdjustModal({ combatantId, onClose }: { combatantId: string | null; onClose: () => void }) {
  const combatant = useStore((state) => state.combatants.find((c) => c.id === combatantId));
  const [amount, setAmount] = useState("");
  const char = combatant ? ((combatant.isTemp && combatant.tempData) ? combatant.tempData : actions.getCharacter(combatant.characterId)) : undefined;

  useEffect(() => setAmount(""), [combatantId]);

  const value = Math.max(0, parseInt(amount, 10) || 0);
  const apply = (hp: number) => {
    if (!combatant) return;
    actions.updateCombatant(combatant.id, { hpCurrent: hp });
    setAmount("");
  };
  const damage = (n: number) => combatant && apply(Math.max(0, combatant.hpCurrent - n));
  const heal = (n: number) => combatant && char && apply(Math.min(char.hpMax, Math.max(0, combatant.hpCurrent) + n));

  return (
    <Modal isOpen={!!combatant && !!char} onClose={onClose} title={char?.name || "Puntos de Vida"} className="sm:max-w-sm">
      {combatant && char && (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-dm-muted">Puntos de Vida</div>
            <div className="font-mono">
              <span className="text-4xl font-bold text-dm-text-bright">{combatant.hpCurrent}</span>
              <span className="text-xl opacity-50"> / {char.hpMax}</span>
            </div>
          </div>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Cantidad"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            className="h-12 text-center text-2xl font-bold"
            aria-label="Cantidad"
          />

          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" className="h-12 text-sm" disabled={!value} onClick={() => damage(value)}>
              Daño
            </Button>
            <Button className="h-12 text-sm !bg-green-700 !border-green-700 !text-white hover:!bg-green-600" disabled={!value} onClick={() => heal(value)}>
              Curar
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {HP_QUICK.map((n) => (
              <Button key={`d${n}`} variant="secondary" className="h-10 !text-dm-danger" onClick={() => damage(n)}>−{n}</Button>
            ))}
            {HP_QUICK.map((n) => (
              <Button key={`h${n}`} variant="secondary" className="h-10 !text-green-500" onClick={() => heal(n)}>+{n}</Button>
            ))}
          </div>

          <div className="flex gap-2 pt-3 border-t border-dm-border">
            <Button variant="secondary" className="flex-1 h-10" disabled={amount === ""} onClick={() => apply(value)}>
              Fijar a {amount === "" ? "…" : value}
            </Button>
            <Button variant="secondary" className="flex-1 h-10" onClick={() => apply(char.hpMax)}>
              Curar todo
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
