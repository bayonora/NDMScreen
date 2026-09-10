import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, actions, store } from "../store/useStore";
import { StatBlock } from "../components/StatBlock";
import { Modal } from "../components/ui/Modal";
import { Input, Button, Textarea } from "../components/ui/Input";
import { Character, Player, NPC } from "../types";
import { Plus, Download, Upload, ImageIcon, Users } from "lucide-react";
import { compressImage, cropAndCompressImage } from "../lib/utils";

import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { readFileAsDataURL } from "../lib/utils";
import { ImportModal } from "../components/ImportModal";

export function ViewParty() {
  const { players, npcs: allNpcs, creatures: allCreatures, uiState } = useStore();
  const creatures = (allCreatures || []).filter(c => !c.isTemp);
  const npcs = allNpcs.filter(n => !n.isTemp);
  const tab = uiState?.partyTab || "players";
  const setTab = (t: "players" | "npcs" | "creatures") => actions.updateUI({ partyTab: t });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);

  const openNew = () => {
    setEditingChar(null);
    setIsModalOpen(true);
  };

  const handleEdit = (c: Character) => {
    setEditingChar(c);
    setIsModalOpen(true);
  };

  const handleDuplicate = (c: Character) => {
    if (c.type === "player") {
      actions.addPlayer({ ...c, name: `${c.name} (Copia)` } as Player);
    } else if (c.type === "npc") {
      actions.addNPC({ ...c, name: `${c.name} (Copia)` } as NPC);
    } else {
      actions.addCreature({ ...c, name: `${c.name} (Copia)` } as any);
    }
  };

  const handleConvertToCreature = (c: Character) => {
    if (c.type === "npc") {
      actions.addCreature({ ...c, name: `${c.name} (Enemigo)` } as any);
      alert(`${c.name} se ha copiado como Criatura enemiga.`);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    if (tab === "players") actions.deletePlayer(deleteId);
    else if (tab === "npcs") actions.deleteNPC(deleteId);
    else actions.deleteCreature(deleteId);
    setDeleteId(null);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        try {
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            setPendingImport(parsed);
          } else if (Array.isArray(parsed.players) || Array.isArray(parsed.npcs) || Array.isArray(parsed.creatures)) {
             // Legacy full import
             setPendingImport(parsed);
          } else {
             alert(`El archivo no parece ser una exportación de ${tab === "players" ? "Jugadores" : tab === "npcs" ? "NPCs" : "Criaturas"} válida.`);
          }
        } catch (err) {
          alert("Archivo inválido.");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    
    if (!Array.isArray(pendingImport) && (pendingImport.players || pendingImport.npcs || pendingImport.creatures)) {
      if (mode === "overwrite") {
        if (Array.isArray(pendingImport.players)) store.setState({ players: pendingImport.players });
        if (Array.isArray(pendingImport.npcs)) store.setState({ npcs: pendingImport.npcs.filter((n: any) => !n.isTemp) });
        if (Array.isArray(pendingImport.creatures)) store.setState({ creatures: pendingImport.creatures.filter((c: any) => !c.isTemp) });
      } else {
        const state = store.getState();
        if (Array.isArray(pendingImport.players)) store.setState({ players: [...state.players, ...pendingImport.players] });
        if (Array.isArray(pendingImport.npcs)) store.setState({ npcs: [...state.npcs, ...pendingImport.npcs.filter((n: any) => !n.isTemp)] });
        if (Array.isArray(pendingImport.creatures)) store.setState({ creatures: [...(state.creatures || []), ...pendingImport.creatures.filter((c: any) => !c.isTemp)] });
      }
    } else {
      const arrayData = Array.isArray(pendingImport) ? pendingImport : [];
      if (tab === "players") {
        if (mode === "overwrite") store.setState({ players: arrayData });
        else store.setState({ players: [...store.getState().players, ...arrayData] });
      } else if (tab === "npcs") {
        const validData = arrayData.filter((n: any) => !n.isTemp);
        if (mode === "overwrite") store.setState({ npcs: validData });
        else store.setState({ npcs: [...store.getState().npcs, ...validData] });
      } else {
        const validData = arrayData.filter((c: any) => !c.isTemp);
        if (mode === "overwrite") store.setState({ creatures: validData });
        else store.setState({ creatures: [...(store.getState().creatures || []), ...validData] });
      }
    }
    setPendingImport(null);
  };

  const exportData = () => {
    let data;
    let filename;
    if (tab === "players") {
      data = players;
      filename = "ndms_jugadores.json";
    } else if (tab === "npcs") {
      data = npcs;
      filename = "ndms_npcs.json";
    } else {
      data = creatures;
      filename = "ndms_criaturas.json";
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden">
      <div className="bg-[#1e1a17] px-4 sm:px-6 py-4 border-b border-[#3a302a] flex justify-between items-center z-20 relative gap-4">
        <h2 className="text-lg uppercase tracking-widest text-[#c1a063] font-light flex items-center gap-2 truncate">
          <Users className="text-[#c1a063] shrink-0" size={20} /> 
          <span className="hidden sm:inline">Grupo y Personajes</span><span className="sm:hidden">Personajes</span>
        </h2>
      </div>
      <div className="bg-[#1e1a17] px-4 sm:px-6 py-4 border-b border-[#3a302a] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <Button variant={tab === "players" ? "primary" : "secondary"} onClick={() => setTab("players")} className="whitespace-nowrap">
            Jugadores ({players.length})
          </Button>
          <Button variant={tab === "npcs" ? "primary" : "secondary"} onClick={() => setTab("npcs")} className="whitespace-nowrap">
            NPCs ({npcs.length})
          </Button>
          <Button variant={tab === "creatures" ? "primary" : "secondary"} onClick={() => setTab("creatures")} className="whitespace-nowrap">
            Criaturas ({creatures.length})
          </Button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <label className="cursor-pointer px-3 sm:px-4 py-2 bg-[#1a1614] border border-[#3a302a] text-[#8b7355] text-xs uppercase tracking-widest hover:bg-[#2a2420] hover:border-[#c1a063] hover:text-[#c1a063] inline-flex items-center justify-center transition-all shadow-sm rounded-none whitespace-nowrap">
            <Download size={14} className="mr-2" /> Importar {tab === "players" ? "Jugadores" : tab === "npcs" ? "NPCs" : "Criaturas"}
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
          <Button variant="secondary" onClick={exportData} className="whitespace-nowrap">
            <Upload size={14} className="mr-2" /> Exportar {tab === "players" ? "Jugadores" : tab === "npcs" ? "NPCs" : "Criaturas"}
          </Button>
          <Button onClick={openNew} className="whitespace-nowrap">
            <Plus size={14} className="mr-2" /> Añadir
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {tab === "players" && (
                <SortableGrid
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start w-full"
                  items={players || []}
                  onReorder={(newPlayers) => actions.reorderPlayers(newPlayers)}
                  renderItem={(p) => <StatBlock character={p} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />}
                />
              )}
              {tab === "npcs" && (
                <SortableGrid
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start w-full"
                  items={npcs || []}
                  onReorder={(newNPCs) => actions.reorderNPCs(newNPCs)}
                  renderItem={(n) => <StatBlock character={n} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} onConvertToCreature={handleConvertToCreature} />}
                />
              )}
              {tab === "creatures" && (
                <SortableGrid
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start w-full"
                  items={creatures || []}
                  onReorder={(newCreatures) => actions.reorderCreatures(newCreatures)}
                  renderItem={(c) => <StatBlock character={c} onEdit={handleEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} />}
                />
              )}
            </motion.div>
          </AnimatePresence>
          
          {tab === "players" && players.length === 0 && (
             <p className="text-[#e6e2da] opacity-50 w-full text-center py-10 ">No hay jugadores. Añade uno para empezar.</p>
          )}
          {tab === "npcs" && npcs.length === 0 && (
             <p className="text-[#e6e2da] opacity-50 w-full text-center py-10 ">No hay NPCs. Añade uno para empezar.</p>
          )}
          {tab === "creatures" && creatures.length === 0 && (
             <p className="text-[#e6e2da] opacity-50 w-full text-center py-10 ">No hay Criaturas. Añade una para empezar.</p>
          )}
        </div>
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
      <ImportModal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onMerge={() => confirmImport("merge")}
        onOverwrite={() => confirmImport("overwrite")}
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
      if (isEditing && initialData) actions.updateCreature(initialData.id, c as any);
      else actions.addCreature(c as any);
    }
    onClose();
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Personaje" : "Nuevo Personaje"}>
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

        <div className="border border-[#3a302a] rounded-sm p-3 grid grid-cols-3 sm:grid-cols-6 gap-2 bg-[#0a0a09]">
          <Input label="FUE" name="str" type="number" required defaultValue={initialData?.stats?.STR || 10} />
          <Input label="DEX" name="dex" type="number" required defaultValue={initialData?.stats?.DEX || 10} />
          <Input label="CON" name="con" type="number" required defaultValue={initialData?.stats?.CON || 10} />
          <Input label="INT" name="int" type="number" required defaultValue={initialData?.stats?.INT || 10} />
          <Input label="SAB" name="wis" type="number" required defaultValue={initialData?.stats?.WIS || 10} />
          <Input label="CAR" name="cha" type="number" required defaultValue={initialData?.stats?.CHA || 10} />
        </div>

        {(type === "npc" || type === "creature") && (
          <>
            <Input label="Habilidades" name="skills" defaultValue={(initialData as NPC)?.skills} placeholder="ej. Percepción +2, Sigilo +4" />
            <Input label="Sentidos" name="senses" defaultValue={(initialData as NPC)?.senses} placeholder="ej. Visión en la oscuridad 120 pies, Percepción pasiva 12" />
            <Input label="Idiomas" name="languages" defaultValue={(initialData as NPC)?.languages} placeholder="ej. Común, élfico" />
            <Textarea label="Rasgos Especiales" name="specialTraits" defaultValue={(initialData as NPC)?.specialTraits} placeholder="ej. Sensibilidad a la Luz Solar: El drow tiene desventaja en las tiradas..." />
            <Textarea label="Acciones (Ataques, Hechizos)" name="actions" defaultValue={(initialData as NPC)?.actions} placeholder="ej. Espada corta. Ataque con arma cuerpo a cuerpo: +4 a impactar, alcance 5 pies..." />
          </>
        )}

        <div className="flex items-center gap-4 mt-2">
          {image ? (
            <div className="relative w-16 h-16 border border-[#c1a063] group">
              <img src={image} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImage(undefined)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity">X</button>
            </div>
          ) : (
            <label className="w-16 h-16 border border-[#3a302a] flex items-center justify-center text-[#8b7355] cursor-pointer hover:border-[#c1a063] hover:text-[#c1a063] transition-colors shrink-0">
              <ImageIcon size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
          <span className="text-xs text-gray-500 italic">Sube un retrato para mostrarlo en la ficha del personaje.</span>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#3a302a]">
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
