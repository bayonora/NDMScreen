import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, actions } from "../store/useStore";
import { StatBlock } from "../components/StatBlock";
import { downloadJSON, readFileAsDataURL } from "../lib/utils";
import { Modal } from "../components/ui/Modal";
import { Input, Button, Textarea } from "../components/ui/Input";
import { ViewHeader, ToolbarButton, SegmentedTabs } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { Character, Player, NPC, Creature } from "../types";
import { Plus, ImageIcon, Users, X } from "lucide-react";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImageCropperModal } from "../components/ImageCropperModal";

type PartyTab = "players" | "npcs" | "creatures";

const TAB_INFO: Record<PartyTab, { noun: string; file: string; empty: string }> = {
  players: { noun: "Jugadores", file: "ndms_jugadores.json", empty: "No hay jugadores. Añade uno para empezar." },
  npcs: { noun: "NPCs", file: "ndms_npcs.json", empty: "No hay NPCs. Añade uno para empezar." },
  creatures: { noun: "Criaturas", file: "ndms_criaturas.json", empty: "No hay criaturas. Añade una para empezar." },
};

const GRID_CLASS = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 items-start w-full";

export function ViewParty() {
  const players = useStore((state) => state.players);
  const allNpcs = useStore((state) => state.npcs);
  const allCreatures = useStore((state) => state.creatures);
  const tab = useStore((state) => state.uiState.partyTab) || "players";
  const npcs = useMemo(() => allNpcs.filter((n) => !n.isTemp), [allNpcs]);
  const creatures = useMemo(() => allCreatures.filter((c) => !c.isTemp), [allCreatures]);
  const setTab = (t: PartyTab) => actions.updateUI({ partyTab: t });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const lists: Record<PartyTab, Character[]> = { players, npcs, creatures };
  const current = lists[tab];
  const info = TAB_INFO[tab];

  const openNew = () => {
    setEditingChar(null);
    setIsModalOpen(true);
  };

  const handleEdit = (c: Character) => {
    setEditingChar(c);
    setIsModalOpen(true);
  };

  const handleDuplicate = (c: Character) => {
    const { id, type, ...rest } = c;
    const copy = { ...rest, name: `${c.name} (Copia)` };
    if (type === "player") actions.addPlayer(copy as Omit<Player, "id" | "type">);
    else if (type === "npc") actions.addNPC(copy as Omit<NPC, "id" | "type">);
    else actions.addCreature(copy as Omit<Creature, "id" | "type">);
  };

  const handleConvertToCreature = (c: Character) => {
    if (c.type !== "npc") return;
    const { id, type, ...rest } = c;
    actions.addCreature({ ...rest, name: `${c.name} (Enemigo)` });
    alert(`${c.name} se ha copiado como Criatura enemiga.`);
  };

  const handleConvertToNPC = (c: Character) => {
    if (c.type !== "creature") return;
    const { id, type, ...rest } = c;
    actions.addNPC({ ...rest, name: `${c.name} (Aliado)` });
    alert(`${c.name} se ha copiado como NPC Aliado.`);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    if (tab === "players") actions.deletePlayer(deleteId);
    else if (tab === "npcs") actions.deleteNPC(deleteId);
    else actions.deleteCreature(deleteId);
    setDeleteId(null);
  };

  const reorder = (items: Character[]) => {
    if (tab === "players") actions.reorderPlayers(items as Player[]);
    // Temp entries are hidden here but live in the same arrays; keep them at the end.
    else if (tab === "npcs") actions.reorderNPCs([...(items as NPC[]), ...allNpcs.filter((n) => n.isTemp)]);
    else actions.reorderCreatures([...(items as Creature[]), ...allCreatures.filter((c) => c.isTemp)]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={Users}
        title="Grupo y Personajes"
        shortTitle="Personajes"
        actions={
          <>
            <ImportExportActions
              noun={info.noun}
              onExport={() => downloadJSON(current, info.file)}
              parse={arrayOrKey(tab)}
              onImport={(items, mode) => actions.importCollection(tab, items, mode)}
              invalidMessage={`El archivo no parece ser una exportación de ${info.noun} válida.`}
            />
            <ToolbarButton icon={Plus} label="Añadir" variant="primary" showLabel="always" onClick={openNew} />
          </>
        }
      >
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "players", label: `Jugadores (${players.length})` },
            { value: "npcs", label: `NPCs (${npcs.length})` },
            { value: "creatures", label: `Criaturas (${creatures.length})` },
          ]}
        />
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <SortableGrid
              className={GRID_CLASS}
              items={current}
              onReorder={reorder}
              renderItem={(c) => (
                <StatBlock
                  character={c}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                  onDuplicate={handleDuplicate}
                  onConvertToCreature={tab === "npcs" ? handleConvertToCreature : undefined}
                  onConvertToNPC={tab === "creatures" ? handleConvertToNPC : undefined}
                />
              )}
            />
            {current.length === 0 && (
              <p className="text-dm-text opacity-50 w-full text-center py-10">{info.empty}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <CharacterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingChar}
        defaultType={tab}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Eliminar Personaje"
        message="¿Estás seguro de que quieres eliminar a este personaje de forma permanente?"
      />
    </div>
  );
}

function CharacterModal({ isOpen, onClose, initialData, defaultType }: { isOpen: boolean, onClose: () => void, initialData: Character | null, defaultType: "players" | "npcs" | "creatures" }) {
  const isEditing = !!initialData;
  const [type, setType] = useState<"player" | "npc" | "creature">(initialData?.type || (defaultType === "players" ? "player" : defaultType === "npcs" ? "npc" : "creature"));
  const [image, setImage] = useState<string | undefined>(initialData?.image);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      setType(initialData?.type || (defaultType === "players" ? "player" : defaultType === "npcs" ? "npc" : "creature"));
      setImage(initialData?.image);
      setRawImageSrc(null);
    }
  }, [isOpen, initialData, defaultType]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file);
      setRawImageSrc(dataUrl);
    } catch (err) {
      console.error("Error reading image", err);
    }
    // reset input so same file can be selected again if cancelled
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const getS = (key: string) => (formData.get(key) as string) || "";
    const getNum = (key: string) => Number(formData.get(key)) || 0;
    
    const stats = {
      STR: getNum("str"), DEX: getNum("dex"), CON: getNum("con"), 
      INT: getNum("int"), WIS: getNum("wis"), CHA: getNum("cha")
    };

    if (type === "player") {
      const p: Omit<Player, "id" | "type"> = {
        name: getS("name"),
        classAndLevel: getS("classAndLevel"),
        race: getS("race"),
        hpMax: getNum("hpMax"),
        ac: getNum("ac"),
        passivePerception: getNum("passivePerception"),
        skills: getS("skills"),
        senses: getS("senses"),
        languages: getS("languages"),
        specialTraits: getS("specialTraits"),
        actions: getS("actions"),
        stats,
        image
      };
      if (isEditing && initialData) actions.updatePlayer(initialData.id, p);
      else actions.addPlayer(p);
    } else if (type === "npc") {
      const n: Omit<NPC, "id" | "type"> = {
        name: getS("name"),
        race: getS("race"),
        hpMax: getNum("hpMax"),
        ac: getNum("ac"),
        cr: getS("cr"),
        skills: getS("skills"),
        senses: getS("senses"),
        languages: getS("languages"),
        specialTraits: getS("specialTraits"),
        actions: getS("actions"),
        stats,
        image
      };
      if (isEditing && initialData) actions.updateNPC(initialData.id, n);
      else actions.addNPC(n);
    } else {
      const c: Omit<NPC, "id" | "type"> = { 
        name: getS("name"),
        race: getS("race"),
        hpMax: getNum("hpMax"),
        ac: getNum("ac"),
        cr: getS("cr"),
        skills: getS("skills"),
        senses: getS("senses"),
        languages: getS("languages"),
        specialTraits: getS("specialTraits"),
        actions: getS("actions"),
        stats,
        image
      };
      if (isEditing && initialData) actions.updateCreature(initialData.id, c);
      else actions.addCreature(c);
    }
    onClose();
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={isEditing ? "Editar Personaje" : "Nuevo Personaje"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEditing && (
          <div className="flex gap-2 mb-2">
            <Button type="button" variant={type === "player" ? "primary" : "secondary"} onClick={() => setType("player")} className="flex-1">Player</Button>
            <Button type="button" variant={type === "npc" ? "primary" : "secondary"} onClick={() => setType("npc")} className="flex-1">NPC</Button>
            <Button type="button" variant={type === "creature" ? "primary" : "secondary"} onClick={() => setType("creature")} className="flex-1">Criatura</Button>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre" name="name" required defaultValue={initialData?.name} />
          <Input label="Raza" name="race" defaultValue={initialData?.race} />
          {type === "player" && (
            <>
              <Input label="Clase y Nivel" name="classAndLevel" defaultValue={(initialData as Player)?.classAndLevel} />
              <Input label="Percepción Pasiva" name="passivePerception" type="number" defaultValue={(initialData as Player)?.passivePerception} />
            </>
          )}
          {(type === "npc" || type === "creature") && ( <> <Input label="Desafío (CR)" name="cr" defaultValue={(initialData as NPC)?.cr} list="cr-options" pattern="^\d+(\/\d+)?$" title="Debe ser un número o una fracción (ej. 1/4, 2)" />
            <datalist id="cr-options">
              <option value="0" />
              <option value="1/8" />
              <option value="1/4" />
              <option value="1/2" />
              {[...Array(30)].map((_, i) => <option key={i} value={String(i + 1)} />)}
            </datalist>
            </>
          )}
          <Input label="HP Máximo" name="hpMax" type="number" required defaultValue={initialData?.hpMax} />
          <Input label="Clase de Armadura (AC)" name="ac" type="number" required defaultValue={initialData?.ac} />
        </div>

        <div className="border border-dm-border rounded-sm p-3 grid grid-cols-3 sm:grid-cols-6 gap-2 bg-dm-bg-darker">
          <Input label="FUE" name="str" type="number" required defaultValue={initialData?.stats?.STR || 10} />
          <Input label="DEX" name="dex" type="number" required defaultValue={initialData?.stats?.DEX || 10} />
          <Input label="CON" name="con" type="number" required defaultValue={initialData?.stats?.CON || 10} />
          <Input label="INT" name="int" type="number" required defaultValue={initialData?.stats?.INT || 10} />
          <Input label="SAB" name="wis" type="number" required defaultValue={initialData?.stats?.WIS || 10} />
          <Input label="CAR" name="cha" type="number" required defaultValue={initialData?.stats?.CHA || 10} />
        </div>

        <>
            <Input label="Habilidades" name="skills" defaultValue={(initialData as any)?.skills} placeholder="ej. Percepción +2, Sigilo +4" />
            <Input label="Sentidos" name="senses" defaultValue={(initialData as any)?.senses} placeholder="ej. Visión en la oscuridad 120 pies, Percepción pasiva 12" />
            <Input label="Idiomas" name="languages" defaultValue={(initialData as any)?.languages} placeholder="ej. Común, élfico" />
            <Textarea label="Rasgos Especiales" name="specialTraits" defaultValue={(initialData as any)?.specialTraits} placeholder="ej. Sensibilidad a la Luz Solar: El drow tiene desventaja en las tiradas..." />
            <Textarea label="Acciones (Ataques, Hechizos)" name="actions" defaultValue={(initialData as any)?.actions} placeholder="ej. Espada corta. Ataque con arma cuerpo a cuerpo: +4 a impactar, alcance 5 pies..." />
          </>

        <div className="flex items-center gap-4 mt-2">
          {image ? (
            <div className="relative w-16 h-16 border border-dm-accent group">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImage(undefined)} aria-label="Quitar imagen" className="absolute inset-0 bg-black/50 can-hover:opacity-0 group-hover:opacity-100 flex items-center justify-center text-dm-danger transition-opacity"><X size={18} /></button>
            </div>
          ) : (
            <label className="w-16 h-16 border border-dm-border flex items-center justify-center text-dm-muted cursor-pointer hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0">
              <ImageIcon size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
          <span className="text-xs text-dm-muted italic">Sube un retrato para mostrarlo en la ficha del personaje.</span>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
    {rawImageSrc && (
      <ImageCropperModal
        isOpen={!!rawImageSrc}
        imageSrc={rawImageSrc}
        onClose={() => setRawImageSrc(null)}
        onCropComplete={(croppedBase64) => setImage(croppedBase64)}
      />
    )}
    </>
  );
}
