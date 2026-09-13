import React, { useState } from "react";
import { useStore, actions } from "../store/useStore";
import { StatusEffect } from "../types";
import { Input, Button, Textarea } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Play, SkipForward, Square, Plus, Shield, Heart, Trash2, RotateCcw, Skull, UserCheck, User } from "lucide-react";
import { cn } from "../lib/utils";
import { StatBlock } from "../components/StatBlock";
import { motion, AnimatePresence } from "motion/react";
import { MathInput } from "../components/MathInput";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

export function ViewInitiative() {
  const combatants = useStore((state) => state.combatants);
  const graveyard = useStore((state) => state.graveyard);
  const uiState = useStore((state) => state.uiState);
  
  const isCombatActive = uiState?.combatActive || false;
  const activeCombatantId = uiState?.activeCombatantId || null;
  let activeTurnIdx = combatants.findIndex(c => c.id === activeCombatantId);
  if (activeTurnIdx === -1) activeTurnIdx = 0;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGraveyardOpen, setIsGraveyardOpen] = useState(false);
  const [statusModal, setStatusModal] = useState<{ open: boolean; combatantId: string; effect?: StatusEffect }>({ open: false, combatantId: "" });
  const [viewCharModal, setViewCharModal] = useState<{ open: boolean; char?: any }>({ open: false });

  const handleStartCombat = () => {
    actions.updateUI({ combatActive: true, activeCombatantId: combatants[0]?.id || null });
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
    actions.updateUI({ activeCombatantId: combatants[nextIndex]?.id || null });
  };

  const handleEndCombat = () => {
    actions.updateUI({ combatActive: false, activeCombatantId: null });
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden">
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <h2 className="text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2 truncate"><span className="hidden sm:inline">Iniciativa</span><span className="sm:hidden">Iniciativa</span></h2>
          <div className="flex gap-2">
            {!isCombatActive ? (
              <Button onClick={handleStartCombat} className="whitespace-nowrap">
                <Play size={14} className="mr-1" /> Iniciar Combate
              </Button>
            ) : (
              <>
                <Button onClick={handleNextTurn} variant="secondary" className="border-dm-border text-dm-accent whitespace-nowrap">
                  <SkipForward size={14} className="mr-1" /> Siguiente Turno
                </Button>
                <Button onClick={handleEndCombat} variant="danger" className="whitespace-nowrap">
                  <Square size={14} className="mr-1" /> Finalizar
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <Button variant="secondary" onClick={() => setIsGraveyardOpen(true)} className="whitespace-nowrap">
            <span className="mr-2">💀</span> Cementerio ({graveyard.length})
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="whitespace-nowrap">
            <Plus size={14} className="mr-1" /> Añadir
          </Button>
          
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">

        <div className="flex flex-col">
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
                  className={cn(
                    "flex items-center px-3 sm:px-6 py-4 border-b transition-colors relative overflow-hidden group",
                    isDead ? "border-dm-danger/30" : "border-dm-bg-card",
                    isActive ? "bg-dm-bg-card" : "hover:bg-dm-bg",
                    isFull && !isDead ? "shadow-[inset_0_0_10px_rgba(193,160,99,0.02)]" : "",
                    isHurt && !isDead ? "shadow-[inset_0_0_15px_rgba(138,33,27,0.03)]" : "",
                    isBloodied && !isDead ? "shadow-[inset_0_0_20px_rgba(138,33,27,0.08)]" : "",
                    isBadlyWounded && !isDead ? "shadow-[inset_0_0_30px_rgba(138,33,27,0.15)] border-dm-danger/30" : "",
                    isCritical && !isDead ? "shadow-[inset_0_0_40px_rgba(138,33,27,0.25)] border-dm-danger/60" : ""
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-dm-accent shadow-[0_0_10px_#c1a063] z-10 pointer-events-none" />
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
                    <div className="absolute right-32 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none rotate-12 scale-150">
                      <Skull size={100} />
                    </div>
                  )}
                  {isDead && (
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 w-[60%] h-px bg-dm-danger/70 shadow-[0_0_10px_#8a211b] pointer-events-none z-10" />
                  )}

                  <div className={cn("w-16 flex items-center justify-center font-bold", isActive ? "text-dm-accent" : "text-dm-text-bright opacity-50")}>
                    <input 
                      type="number" 
                      value={c.initiative} 
                      onChange={(e) => actions.updateCombatant(c.id, { initiative: Number(e.target.value) })}
                      className="w-12 text-center text-2xl h-10 px-0 font-bold border-none bg-transparent focus:bg-dm-border rounded-sm outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between min-w-0 pr-4 gap-4">
                    <div className="flex-1 flex flex-col min-w-0 gap-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <button 
                          onClick={() => setViewCharModal({ open: true, char })}
                          className={cn(
                            "font-bold text-lg text-left truncate transition-colors", 
                            isActive ? "text-dm-text-bright" : "text-dm-text-bright opacity-80", 
                            isDead ? "line-through text-gray-500 decoration-dm-danger" : "",
                            "hover:text-dm-accent"
                          )}
                        >
                          {char.type === "player" && <User size={16} className="inline-block mr-2 text-green-600" />}
                          {char.type === "creature" && <Skull size={16} className="inline-block mr-2 text-dm-danger" />}
                          {char.type === "npc" && <UserCheck size={16} className="inline-block mr-2 text-blue-500" />}
                          {char.name}
                        </button>
                        
                        <div className="flex flex-wrap gap-1 items-center ml-2">
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
                            className="w-5 h-5 rounded-sm border border-dm-border flex items-center justify-center text-[12px] opacity-40 hover:opacity-100 hover:text-dm-accent hover:border-dm-accent"
                            title="Añadir Estado"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className={cn("text-[10px] uppercase font-bold", isActive ? "opacity-100 text-dm-accent" : "opacity-30")}>
                        {isActive ? "▶ TURNO ACTIVO" : (char.type === "player" ? "Jugador" : char.type === "creature" ? "Criatura" : "NPC")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 shrink-0 mt-3 md:mt-0 justify-between w-full md:w-auto">
                      <div className="flex-1 md:w-48 flex flex-col justify-center md:items-end md:pr-4">
                        <div className="flex items-center gap-1 text-sm font-mono mb-1 justify-start md:justify-end w-full">
                            <Heart size={14} className={cn(
                              "mr-auto shrink-0 transition-colors", 
                              isDead ? "text-gray-600" : 
                              isCritical ? "text-dm-danger animate-bounce" : 
                              isBadlyWounded ? "text-dm-danger animate-pulse" :
                              isActive ? "text-red-500" : "text-dm-danger"
                            )} />
                            <MathInput 
                              value={c.hpCurrent}
                              onValueChange={(val) => actions.updateCombatant(c.id, { hpCurrent: val })}
                              className="w-20 h-6 p-0 md:text-right text-left border-none bg-transparent text-dm-text text-xl font-bold focus:bg-dm-border rounded-sm"
                            />
                            <span className="opacity-50 text-base select-none shrink-0">/ {char.hpMax}</span>
                        </div>
                        <div className={cn("w-full md:w-32 h-1.5 bg-dm-bg-hover rounded-full relative overflow-hidden border", (isCritical || isBadlyWounded) ? "border-dm-danger" : "border-dm-border", isCritical ? "animate-pulse" : "")}>
                          <div 
                            className={cn(
                              "absolute inset-0 transition-all duration-500", 
                              isDead ? "bg-gray-600" : 
                              isCritical ? "bg-dm-danger" : 
                              isBadlyWounded ? "bg-dm-danger-hover" :
                              char.type === "player" ? "bg-green-600" : 
                              char.type === "npc" ? "bg-blue-600" : "bg-red-800"
                            )} 
                            style={{ width: `${hpPct}%` }} 
                          />
                        </div>
                      </div>

                      <div className="w-16 flex items-center justify-center">
                        <div className="flex items-center justify-center p-1 relative" title="Clase de Armadura">
                          <Shield size={36} className={cn("opacity-80", isActive ? "text-dm-accent" : "text-dm-border-focus")} />
                          <span className="absolute text-[13px] font-bold mt-[-2px]">{char.ac}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-12 shrink-0 flex justify-end items-center">
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

      <AddCombatantModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      
      <StatusModal 
        isOpen={statusModal.open} 
        onClose={() => setStatusModal({ open: false, combatantId: "" })} 
        combatantId={statusModal.combatantId}
        effect={statusModal.effect}
      />
      <GraveyardModal isOpen={isGraveyardOpen} onClose={() => setIsGraveyardOpen(false)} onViewChar={(char) => setViewCharModal({ open: true, char })} />
      <AnimatePresence>
        {viewCharModal.open && viewCharModal.char && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" 
            onClick={() => setViewCharModal({ open: false })}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} 
              className="max-w-md w-full max-h-[90vh] overflow-y-auto custom-scrollbar flex justify-center"
            >
              <StatBlock character={viewCharModal.char} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
          className={cn("pb-2 uppercase tracking-widest text-xs font-bold transition-colors", mode === "existing" ? "text-dm-accent border-b-2 border-dm-accent" : "text-dm-muted hover:text-white border-b-2 border-transparent")}
          onClick={() => setMode("existing")}
        >
          Existente
        </button>
        <button 
          type="button"
          className={cn("pb-2 uppercase tracking-widest text-xs font-bold transition-colors", mode === "temp" ? "text-dm-accent border-b-2 border-dm-accent" : "text-dm-muted hover:text-white border-b-2 border-transparent")}
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
              <input type="checkbox" id="isTempEnemy" checked={isTempEnemy} onChange={(e) => setIsTempEnemy(e.target.checked)} className="w-4 h-4 rounded bg-[#0a0a09] border-dm-border text-dm-danger focus:ring-dm-danger" />
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

function GraveyardModal({ isOpen, onClose, onViewChar }: { isOpen: boolean, onClose: () => void, onViewChar: (char: any) => void }) {
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




