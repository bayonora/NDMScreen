import React, { useState } from "react";
import { useStore, actions } from "../store/useStore";
import { Modal } from "./ui/Modal";
import { Lightbox } from "./ui/Lightbox";
import { Input, Button, Textarea } from "./ui/Input";
import { Plus, Skull, Swords, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Character, NPC, Player } from "../types";
import { formatMod } from "../lib/utils";
import { Copy, Edit2, Trash2, Maximize2 } from "lucide-react";

interface StatBlockProps {
  key?: React.Key;
  character: Character;
  onEdit?: (c: Character) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (c: Character) => void;
  onConvertToCreature?: (c: Character) => void;
  hideCollapse?: boolean;
}

export const StatBlock: React.FC<StatBlockProps> = ({ character, onEdit, onDelete, onDuplicate, onConvertToCreature, hideCollapse }) => {

  const borderColor = character.type === "player" ? "border-l-[#c1a063]" : character.type === "npc" ? "border-l-slate-400" : "border-l-[#8a211b]";
  const titleColor = character.type === "player" ? "text-[#c1a063]" : character.type === "npc" ? "text-slate-400" : "text-[#8a211b]";
  const isPlayer = character.type === "player";
  const p = character as Player;
  const n = character as NPC;
  const [tagModal, setTagModal] = useState<{ open: boolean; tagId?: string; name: string; description: string }>({ open: false, name: "", description: "" });
  const [viewTag, setViewTag] = useState<{ open: boolean; tag: any } | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const store = useStore();
  const isCollapsed = store.uiState.collapsedCharacters?.includes(character.id) || false;

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

    if (isPlayer) {
      actions.updatePlayer(character.id, { tags: updatedTags });
    } else {
      actions.updateNPC(character.id, { tags: updatedTags });
    }
    
    setTagModal({ open: false, name: "", description: "" });
    if (viewTag) {
        setViewTag({ open: true, tag: newTag });
    }
  };

  const handleDeleteTag = (id: string) => {
    const updatedTags = tags.filter(t => t.id !== id);
    if (isPlayer) {
      actions.updatePlayer(character.id, { tags: updatedTags });
    } else {
      actions.updateNPC(character.id, { tags: updatedTags });
    }
    setViewTag(null);
  };


  return (
    <div className={`bg-[#1e1a17] border border-[#3a302a] border-l-4 ${borderColor} rounded-sm p-4 text-[#e6e2da] font-serif shadow-lg flex flex-col relative w-full overflow-hidden`}>
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
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {character.image && (
          <button onClick={() => setIsImageViewerOpen(true)} className="p-1 text-[#3a302a] hover:text-[#c1a063] transition-colors" title="Ver Retrato">
            <Maximize2 size={16} />
          </button>
        )}
        {character.type === "npc" && onConvertToCreature && (
          <button onClick={() => onConvertToCreature(character)} className="p-1 text-[#3a302a] hover:text-[#8a211b] transition-colors" title="Convertir a Criatura Enemiga">
            <Swords size={16} />
          </button>
        )}
        {onDuplicate && (
          <button onClick={() => onDuplicate(character)} className="p-1 text-[#3a302a] hover:text-[#c1a063] transition-colors" title="Duplicar">
            <Copy size={16} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => onDelete(character.id)} className="p-1 text-[#3a302a] hover:text-[#8a211b] transition-colors" title="Borrar">
            <Trash2 size={16} />
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(character)} className="p-1 text-[#3a302a] hover:text-[#c1a063] transition-colors" title="Editar">
            <Edit2 size={16} />
          </button>
        )}
        {!hideCollapse && (
          <button onClick={() => actions.toggleCharacterCollapse(character.id)} className="p-1 text-[#3a302a] hover:text-[#c1a063] transition-colors" title={isCollapsed ? "Expandir" : "Colapsar"}>
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
      </div>

      <h1 className={`text-2xl font-bold font-sans pr-24 ${titleColor}`}>
        {character.type === "creature" && <Skull size={20} className="inline-block mr-2 -mt-1" />}
        {character.type === "npc" && <UserCheck size={20} className="inline-block mr-2 -mt-1" />}
        {character.name}
      </h1>
      <p className="italic text-sm opacity-70">
        {isPlayer ? `${p.race} • ${p.classAndLevel}` : `${n.race || ""} ${n.cr ? `• CR ${n.cr}` : ""}`.trim()}
      </p>

      <div className="w-full h-px bg-[#3a302a] my-2" />
      {!isCollapsed && (<>

      <div className="space-y-1 text-sm">
        <div>
          <strong className="text-[#c1a063]">Clase de Armadura</strong> {character.ac}
        </div>
        <div>
          <strong className="text-[#c1a063]">Puntos de Vida</strong> {character.hpMax}
        </div>
      </div>

      <div className="w-full h-px bg-[#3a302a] my-2" />

      <div className="grid grid-cols-6 gap-2 text-center my-2 text-[11px] uppercase opacity-80">
        <Stat name="FUE" val={character.stats.STR} />
        <Stat name="DES" val={character.stats.DEX} />
        <Stat name="CON" val={character.stats.CON} />
        <Stat name="INT" val={character.stats.INT} />
        <Stat name="SAB" val={character.stats.WIS} />
        <Stat name="CAR" val={character.stats.CHA} />
      </div>

      <div className="w-full h-px bg-[#3a302a] my-2" />

      <div className="space-y-1 text-sm opacity-90">
        {!isPlayer && n.skills && (
          <div>
            <strong className="text-[#c1a063]">Habilidades</strong> {n.skills}
          </div>
        )}
        {!isPlayer && n.senses && (
          <div>
            <strong className="text-[#c1a063]">Sentidos</strong> {n.senses}
          </div>
        )}
        {isPlayer && (
          <div>
            <strong className="text-[#c1a063]">Percepción Pasiva</strong> {p.passivePerception}
          </div>
        )}
        {!isPlayer && n.languages && (
          <div>
            <strong className="text-[#c1a063]">Idiomas</strong> {n.languages}
          </div>
        )}
        {!isPlayer && n.cr && (
          <div>
            <strong className="text-[#c1a063]">Desafío</strong> {n.cr}
          </div>
        )}
      </div>

      {!isPlayer && (n.specialTraits || n.actions) && (
        <div className="w-full h-px bg-[#3a302a] my-2" />
      )}

      {!isPlayer && n.specialTraits && (
        <div className="mt-2 text-sm whitespace-pre-wrap opacity-90">
          {n.specialTraits}
        </div>
      )}

      {!isPlayer && n.actions && (
        <>
          <h2 className="text-lg font-bold text-[#c1a063] mt-4 mb-2 border-b border-[#3a302a]">Acciones</h2>
          <div className="text-sm whitespace-pre-wrap opacity-90">
            {n.actions}
          </div>
        </>
      )}

      {/* TAGS SECTION */}
      <div className="mt-4 pt-2 border-t border-[#3a302a] flex flex-wrap gap-2 items-center">
        {tags.map((tag: any) => (
          <button 
            key={tag.id}
            onClick={() => setViewTag({ open: true, tag })}
            className="px-2 py-0.5 rounded text-xs bg-[#2a2420] border border-[#c1a063] text-[#c1a063] hover:bg-[#c1a063] hover:text-[#1e1a17] transition-colors"
          >
            {tag.name}
          </button>
        ))}
        <button 
          onClick={() => setTagModal({ open: true, name: "", description: "" })}
          className="w-6 h-6 rounded-full flex items-center justify-center bg-[#2a2420] border border-[#3a302a] text-[#8b7355] hover:border-[#c1a063] hover:text-[#c1a063] transition-colors"
          title="Añadir Tag"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* VIEW TAG MODAL */}
      {viewTag && viewTag.open && (
        <Modal isOpen={viewTag.open} onClose={() => setViewTag(null)} title={viewTag.tag.name}>
          <div className="flex flex-col gap-4">
             <div className="text-sm whitespace-pre-wrap text-[#e6e2da] min-h-[50px]">
               {viewTag.tag.description || <span className="opacity-50 italic">Sin descripción.</span>}
             </div>
             <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#3a302a]">
                <Button type="button" variant="secondary" onClick={() => {
                   setTagModal({ open: true, tagId: viewTag.tag.id, name: viewTag.tag.name, description: viewTag.tag.description });
                }}>
                  Editar
                </Button>
                <Button type="button" className="bg-[#8a211b] hover:bg-[#a52a22] text-white" onClick={() => handleDeleteTag(viewTag.tag.id)}>
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
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#3a302a]">
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
};

function Stat({ name, val }: { name: string; val: number }) {
  return (
    <div className="flex flex-col items-center bg-[#2a2420] p-1 rounded-sm border border-[#3a302a]">
      <div className="font-bold text-[#c1a063]">{name}</div>
      <div className="font-mono mt-0.5">
        {val} <span className="opacity-60 text-[9px]">({formatMod(val)})</span>
      </div>
    </div>
  );
}
