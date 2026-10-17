import React, { useState } from "react";
import { useStore, actions } from "../store/useStore";
import { Modal } from "./ui/Modal";
import { Lightbox } from "./ui/Lightbox";
import { Input, Button, Textarea } from "./ui/Input";
import { Plus, Skull, Swords, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Character, CharacterTag, NPC, Player } from "../types";
import { cn, formatMod } from "../lib/utils";
import { Copy, Edit2, Trash2, Maximize2 } from "lucide-react";

interface StatBlockProps {
  character: Character;
  onEdit?: (c: Character) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (c: Character) => void;
  onConvertToCreature?: (c: Character) => void;
  onConvertToNPC?: (c: Character) => void;
  hideCollapse?: boolean;
}

export function StatBlock({ character, onEdit, onDelete, onDuplicate, onConvertToCreature, onConvertToNPC, hideCollapse }: StatBlockProps) {

  const borderColor = character.type === "player" ? "border-l-dm-accent" : character.type === "npc" ? "border-l-slate-400" : "border-l-dm-danger";
  const titleColor = character.type === "player" ? "text-dm-accent" : character.type === "npc" ? "text-slate-400" : "text-dm-danger";
  const isPlayer = character.type === "player";
  const p = character as Player;
  const n = character as NPC;
  const [tagModal, setTagModal] = useState<{ open: boolean; tagId?: string; name: string; description: string }>({ open: false, name: "", description: "" });
  const [viewTag, setViewTag] = useState<{ open: boolean; tag: CharacterTag } | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const isCollapsed = useStore((state) => state.uiState.collapsedCharacters?.includes(character.id) ?? false);

  const tags = character.tags || [];

  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagModal.name.trim()) return;

    const newTag = {
      id: tagModal.tagId || uuidv4(),
      name: tagModal.name.trim(),
      description: tagModal.description.trim()
    };

    let updatedTags = [...tags];
    if (tagModal.tagId) {
      updatedTags = updatedTags.map(t => t.id === tagModal.tagId ? newTag : t);
    } else {
      updatedTags.push(newTag);
    }

    actions.updateCharacter(character, { tags: updatedTags });
    
    setTagModal({ open: false, name: "", description: "" });
    if (viewTag) {
        setViewTag({ open: true, tag: newTag });
    }
  };

  const handleDeleteTag = (id: string) => {
    const updatedTags = tags.filter(t => t.id !== id);
    actions.updateCharacter(character, { tags: updatedTags });
    setViewTag(null);
  };


  return (
    <div className={`@container bg-dm-bg border border-dm-border border-l-4 ${borderColor} rounded-sm p-3 sm:p-4 text-dm-text font-serif shadow-lg flex flex-col relative w-full overflow-hidden`}>
            {character.image && (
        <div 
          className="absolute top-0 right-0 bottom-0 w-[60%] opacity-20 pointer-events-none mix-blend-screen"
          style={{ 
            backgroundImage: `url(${character.image})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center right', 
            backgroundRepeat: 'no-repeat',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 50%, black 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 50%, black 100%)'
          }} 
        />
      )}
      <div className="flex items-start gap-2 relative z-10">
        <h1 className={`flex-1 min-w-0 break-words text-xl sm:text-2xl font-bold font-sans ${titleColor}`}>
          {character.type === "creature" && <Skull size={20} className="inline-block mr-2 -mt-1" />}
          {character.type === "npc" && <UserCheck size={20} className="inline-block mr-2 -mt-1" />}
          {character.name}
        </h1>
        <div className="flex flex-wrap justify-end shrink-0 max-w-[55%] -mr-1 -mt-1">
          {character.image && (
            <CardAction label="Ver Retrato" onClick={() => setIsImageViewerOpen(true)}><Maximize2 size={16} /></CardAction>
          )}
          {character.type === "npc" && onConvertToCreature && (
            <CardAction label="Convertir a Criatura Enemiga" danger onClick={() => onConvertToCreature(character)}><Swords size={16} /></CardAction>
          )}
          {character.type === "creature" && onConvertToNPC && (
            <CardAction label="Convertir a NPC Aliado" onClick={() => onConvertToNPC(character)}><UserCheck size={16} /></CardAction>
          )}
          {onDuplicate && (
            <CardAction label="Duplicar" onClick={() => onDuplicate(character)}><Copy size={16} /></CardAction>
          )}
          {onDelete && (
            <CardAction label="Borrar" danger onClick={() => onDelete(character.id)}><Trash2 size={16} /></CardAction>
          )}
          {onEdit && (
            <CardAction label="Editar" onClick={() => onEdit(character)}><Edit2 size={16} /></CardAction>
          )}
          {!hideCollapse && (
            <CardAction label={isCollapsed ? "Expandir" : "Colapsar"} onClick={() => actions.toggleCharacterCollapse(character.id)}>
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </CardAction>
          )}
        </div>
      </div>
      <p className="italic text-sm opacity-70">
        {isPlayer ? `${p.race} • ${p.classAndLevel}` : `${n.race || ""} ${n.cr ? `• CR ${n.cr}` : ""}`.trim()}
      </p>

      <div className="w-full h-px bg-dm-border my-2" />
      {!isCollapsed && (<>

      <div className="space-y-1 text-sm">
        <div>
          <strong className="text-dm-accent">Clase de Armadura</strong> {character.ac}
        </div>
        <div>
          <strong className="text-dm-accent">Puntos de Vida</strong> {character.hpMax}
        </div>
      </div>

      <div className="w-full h-px bg-dm-border my-2" />

      <div className="grid grid-cols-3 @xs:grid-cols-6 gap-1.5 sm:gap-2 text-center my-2 text-[11px] uppercase opacity-80">
        <Stat name="FUE" val={character.stats.STR} />
        <Stat name="DES" val={character.stats.DEX} />
        <Stat name="CON" val={character.stats.CON} />
        <Stat name="INT" val={character.stats.INT} />
        <Stat name="SAB" val={character.stats.WIS} />
        <Stat name="CAR" val={character.stats.CHA} />
      </div>

      <div className="w-full h-px bg-dm-border my-2" />

      <div className="space-y-1 text-sm opacity-90">
        {character.skills && (
          <div>
            <strong className="text-dm-accent">Habilidades</strong> {character.skills}
          </div>
        )}
        {character.senses && (
          <div>
            <strong className="text-dm-accent">Sentidos</strong> {character.senses}
          </div>
        )}
        {isPlayer && (
          <div>
            <strong className="text-dm-accent">Percepción Pasiva</strong> {p.passivePerception}
          </div>
        )}
        {character.languages && (
          <div>
            <strong className="text-dm-accent">Idiomas</strong> {character.languages}
          </div>
        )}
        {!isPlayer && n.cr && (
          <div>
            <strong className="text-dm-accent">Desafío</strong> {n.cr}
          </div>
        )}
      </div>

      {(character.specialTraits || character.actions) && (
        <div className="w-full h-px bg-dm-border my-2" />
      )}

      {character.specialTraits && (
        <div className="mt-2 text-sm whitespace-pre-wrap opacity-90">
          {character.specialTraits}
        </div>
      )}

      {character.actions && (
        <>
          <h2 className="text-lg font-bold text-dm-accent mt-4 mb-2 border-b border-dm-border">Acciones</h2>
          <div className="text-sm whitespace-pre-wrap opacity-90">
            {character.actions}
          </div>
        </>
      )}

      {/* TAGS SECTION */}
      <div className="mt-4 pt-2 border-t border-dm-border flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <button 
            key={tag.id}
            onClick={() => setViewTag({ open: true, tag })}
            className="px-2 py-0.5 rounded text-xs bg-dm-bg-hover border border-dm-accent text-dm-accent hover:bg-dm-accent hover:text-dm-bg transition-colors"
          >
            {tag.name}
          </button>
        ))}
        <button 
          onClick={() => setTagModal({ open: true, name: "", description: "" })}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-dm-bg-hover border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent transition-colors"
          title="Añadir Tag"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* VIEW TAG MODAL */}
      {viewTag && viewTag.open && (
        <Modal isOpen={viewTag.open} onClose={() => setViewTag(null)} title={viewTag.tag.name}>
          <div className="flex flex-col gap-4">
             <div className="text-sm whitespace-pre-wrap text-dm-text min-h-[50px]">
               {viewTag.tag.description || <span className="opacity-50 italic">Sin descripción.</span>}
             </div>
             <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
                <Button type="button" variant="secondary" onClick={() => {
                   setTagModal({ open: true, tagId: viewTag.tag.id, name: viewTag.tag.name, description: viewTag.tag.description });
                }}>
                  Editar
                </Button>
                <Button type="button" className="bg-dm-danger hover:bg-dm-danger-hover text-dm-text-bright" onClick={() => handleDeleteTag(viewTag.tag.id)}>
                  Borrar
                </Button>
             </div>
          </div>
        </Modal>
      )}

      </>)}
      {/* EDIT / CREATE TAG MODAL */}
      <Modal isOpen={tagModal.open} onClose={() => setTagModal({ open: false, name: "", description: "" })} title={tagModal.tagId ? "Editar Tag" : "Nuevo Tag"}>
         <form onSubmit={handleSaveTag} className="flex flex-col gap-4">
            <Input label="Nombre del Tag" value={tagModal.name} onChange={e => setTagModal({...tagModal, name: e.target.value})} required placeholder="Ej. Maldito" />
            <Textarea label="Descripción" value={tagModal.description} onChange={e => setTagModal({...tagModal, description: e.target.value})} placeholder="Detalles de este tag..." rows={4} />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
              <Button type="button" variant="ghost" onClick={() => setTagModal({ open: false, name: "", description: "" })}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
         </form>
      </Modal>

      {character.image && (
        <Lightbox
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          src={character.image}
          title={character.name}
        />
      )}
    </div>
  );
}

function CardAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("p-2.5 sm:p-1.5 text-dm-muted transition-colors", danger ? "hover:text-dm-danger" : "hover:text-dm-accent")}
    >
      {children}
    </button>
  );
}

function Stat({ name, val }: { name: string; val: number }) {
  return (
    <div className="flex flex-col items-center bg-dm-bg-hover p-1 rounded-sm border border-dm-border">
      <div className="font-bold text-dm-accent">{name}</div>
      <div className="font-mono mt-0.5">
        {val} <span className="opacity-60 text-[9px]">({formatMod(val)})</span>
      </div>
    </div>
  );
}
