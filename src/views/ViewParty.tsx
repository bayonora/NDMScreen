import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, actions } from "../store/useStore";
import { StatBlock } from "../components/StatBlock";
import { CharacterList } from "../components/CharacterList";
import { downloadJSON, readFileAsDataURL, cn } from "../lib/utils";
import { Modal, Overlay } from "../components/ui/Modal";
import { Input, Button, Textarea } from "../components/ui/Input";
import { ViewHeader, ToolbarButton, SegmentedTabs } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { Combobox } from "../components/ui/Combobox";
import { Character, Player, NPC, Creature } from "../types";
import { Plus, ImageIcon, Users, X, ChevronsDownUp, ChevronsUpDown, Search, LayoutGrid, List, Tag } from "lucide-react";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { showToast } from "../components/Toasts";
import { focusSearchResult } from "../lib/searchFocus";
import { characterFields } from "../lib/characterSheet";

type PartyTab = "players" | "npcs" | "creatures";

const TAB_INFO: Record<PartyTab, { noun: string; file: string; empty: string }> = {
  players: { noun: "Jugadores", file: "ndms_jugadores.json", empty: "No hay jugadores. Añade uno para empezar." },
  npcs: { noun: "NPCs", file: "ndms_npcs.json", empty: "No hay NPCs. Añade uno para empezar." },
  creatures: { noun: "Criaturas", file: "ndms_criaturas.json", empty: "No hay criaturas. Añade una para empezar." },
};

const TAB_OF: Record<Character["type"], PartyTab> = { player: "players", npc: "npcs", creature: "creatures" };

const GRID_CLASS = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 items-start w-full";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Text the search looks in: name, race, class, challenge and tags. */
function searchText(c: Character) {
  return norm([c.name, c.race, c.type === "player" ? c.classAndLevel : c.cr, ...(c.tags || []).map((t) => t.name)].filter(Boolean).join(" "));
}

export function ViewParty() {
  const players = useStore((state) => state.players);
  const allNpcs = useStore((state) => state.npcs);
  const allCreatures = useStore((state) => state.creatures);
  const tab = useStore((state) => state.uiState.partyTab) || "players";
  const view = useStore((state) => state.uiState.partyView) || "cards";
  const npcs = useMemo(() => allNpcs.filter((n) => !n.isTemp), [allNpcs]);
  const creatures = useMemo(() => allCreatures.filter((c) => !c.isTemp), [allCreatures]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const lists: Record<PartyTab, Character[]> = { players, npcs, creatures };
  const current = lists[tab];
  const info = TAB_INFO[tab];
  const collapsedIds = useStore((state) => state.uiState.collapsedCharacters);
  const allCollapsed = current.length > 0 && current.every((c) => collapsedIds?.includes(c.id));
  const toggleAll = () => actions.setCharactersCollapsed(current.map((c) => c.id), !allCollapsed);

  const setTab = (t: PartyTab) => {
    actions.updateUI({ partyTab: t });
    setTagFilter(null);
  };

  // Tags used in this tab, for the filter chips.
  const tagNames = useMemo(() => {
    const names = new Map<string, string>();
    current.forEach((c) => (c.tags || []).forEach((t) => names.set(norm(t.name), t.name)));
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [current]);
  useEffect(() => {
    if (tagFilter && !tagNames.some((t) => norm(t) === norm(tagFilter))) setTagFilter(null);
  }, [tagNames, tagFilter]);

  const isFiltering = !!query.trim() || !!tagFilter;
  const shown = useMemo(() => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    return current.filter((c) => {
      if (tagFilter && !(c.tags || []).some((t) => norm(t.name) === norm(tagFilter))) return false;
      const text = searchText(c);
      return words.every((w) => text.includes(w));
    });
  }, [current, query, tagFilter]);

  const opened = openedId ? current.find((c) => c.id === openedId) || null : null;

  const openNew = () => {
    setEditingChar(null);
    setIsModalOpen(true);
  };

  const handleEdit = (c: Character) => {
    setEditingChar(c);
    setIsModalOpen(true);
  };

  /** "Ver" on a toast: shows the new card in its tab, clearing filters that could hide it. */
  const showCreated = (id: string, t: PartyTab) => () => {
    setQuery("");
    setTagFilter(null);
    actions.updateUI({ partyTab: t });
    focusSearchResult(id);
  };

  const addTo = (type: Character["type"], data: Omit<Character, "id" | "type">) =>
    type === "player" ? actions.addPlayer(data as Omit<Player, "id" | "type">)
    : type === "npc" ? actions.addNPC(data as Omit<NPC, "id" | "type">)
    : actions.addCreature(data as Omit<Creature, "id" | "type">);

  const handleDuplicate = (c: Character) => {
    const { id, type, ...rest } = c;
    const newId = addTo(type, { ...rest, name: `${c.name} (Copia)` });
    showToast(`Copia de ${c.name} creada.`, { label: "Ver", onClick: showCreated(newId, TAB_OF[type]) });
  };

  const handleConvertToCreature = (c: Character) => {
    if (c.type !== "npc") return;
    const { id, type, ...rest } = c;
    const newId = actions.addCreature({ ...rest, name: `${c.name} (Enemigo)` });
    showToast(`${c.name} copiado como criatura enemiga.`, { label: "Ver", onClick: showCreated(newId, "creatures") });
  };

  const handleConvertToNPC = (c: Character) => {
    if (c.type !== "creature") return;
    const { id, type, ...rest } = c;
    const newId = actions.addNPC({ ...rest, name: `${c.name} (Aliado)` });
    showToast(`${c.name} copiado como NPC aliado.`, { label: "Ver", onClick: showCreated(newId, "npcs") });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    if (tab === "players") actions.deletePlayer(deleteId);
    else if (tab === "npcs") actions.deleteNPC(deleteId);
    else actions.deleteCreature(deleteId);
    if (deleteId === openedId) setOpenedId(null);
    setDeleteId(null);
  };

  const reorder = (items: Character[]) => {
    if (tab === "players") actions.reorderPlayers(items as Player[]);
    // Temp entries are hidden here but live in the same arrays; keep them at the end.
    else if (tab === "npcs") actions.reorderNPCs([...(items as NPC[]), ...allNpcs.filter((n) => n.isTemp)]);
    else actions.reorderCreatures([...(items as Creature[]), ...allCreatures.filter((c) => c.isTemp)]);
  };

  const card = (c: Character) => (
    <div data-search-id={c.id}>
      <StatBlock
        character={c}
        onEdit={handleEdit}
        onDelete={setDeleteId}
        onDuplicate={handleDuplicate}
        onConvertToCreature={tab === "npcs" ? handleConvertToCreature : undefined}
        onConvertToNPC={tab === "creatures" ? handleConvertToNPC : undefined}
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={Users}
        title="Grupo y Personajes"
        shortTitle="Personajes"
        actions={
          <>
            <ToolbarButton
              icon={view === "cards" ? List : LayoutGrid}
              label={view === "cards" ? "Vista de lista" : "Vista de fichas"}
              onClick={() => actions.updateUI({ partyView: view === "cards" ? "list" : "cards" })}
            />
            {view === "cards" && current.length > 1 && (
              <ToolbarButton
                icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp}
                label={allCollapsed ? "Expandir todas" : "Colapsar todas"}
                onClick={toggleAll}
              />
            )}
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <SegmentedTabs
            value={tab}
            onChange={setTab}
            options={[
              { value: "players", label: `Jugadores (${players.length})` },
              { value: "npcs", label: `NPCs (${npcs.length})` },
              { value: "creatures", label: `Criaturas (${creatures.length})` },
            ]}
          />
          <div className="relative sm:ml-auto sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); } }}
              placeholder="Buscar nombre, raza, clase, etiqueta…"
              aria-label={`Buscar en ${info.noun}`}
              className="w-full h-10 sm:h-9 pl-9 pr-9 bg-dm-bg-darker border border-dm-border rounded-sm text-sm text-dm-text-bright placeholder:text-dm-muted placeholder:italic focus:outline-none focus:border-dm-accent [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-dm-muted hover:text-dm-accent">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {tagNames.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap -mt-1">
            <Tag size={13} className="text-dm-muted shrink-0" aria-hidden />
            {tagNames.map((t) => {
              const active = !!tagFilter && norm(tagFilter) === norm(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTagFilter(active ? null : t)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-sm border transition-colors",
                    active ? "bg-dm-accent border-dm-accent text-dm-bg-darker font-bold" : "border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${view}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            {view === "list" ? (
              <CharacterList items={shown} onOpen={(c) => setOpenedId(c.id)} onEdit={handleEdit} />
            ) : isFiltering ? (
              // Reordering a filtered subset would scramble the hidden ones, so no dragging here.
              <div className={GRID_CLASS}>{shown.map((c) => <React.Fragment key={c.id}>{card(c)}</React.Fragment>)}</div>
            ) : (
              <SortableGrid className={GRID_CLASS} items={current} onReorder={reorder} renderItem={card} />
            )}
            {current.length === 0 ? (
              <p className="text-dm-text opacity-50 w-full text-center py-10">{info.empty}</p>
            ) : shown.length === 0 ? (
              <div className="w-full text-center py-10 space-y-3">
                <p className="text-dm-text opacity-60">Nadie coincide con la búsqueda.</p>
                <button type="button" onClick={() => { setQuery(""); setTagFilter(null); }} className="text-xs uppercase tracking-widest text-dm-accent hover:underline">
                  Quitar filtros
                </button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Full card, opened from the list view. */}
      <Overlay isOpen={!!opened} onClose={() => setOpenedId(null)}>
        <div className="relative max-w-lg w-full max-h-full sm:max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95">
          {opened && (
            <StatBlock
              character={opened}
              hideCollapse
              onEdit={handleEdit}
              onDelete={setDeleteId}
              onDuplicate={handleDuplicate}
              onConvertToCreature={tab === "npcs" ? handleConvertToCreature : undefined}
              onConvertToNPC={tab === "creatures" ? handleConvertToNPC : undefined}
            />
          )}
        </div>
      </Overlay>

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

/** Challenge ratings offered as suggestions (any other text is still allowed). */
const CR_OPTIONS = ["0", "1/8", "1/4", "1/2", ...Array.from({ length: 30 }, (_, i) => String(i + 1))].map((value) => ({ value }));

function CharacterModal({ isOpen, onClose, initialData, defaultType }: { isOpen: boolean, onClose: () => void, initialData: Character | null, defaultType: PartyTab }) {
  const isEditing = !!initialData;
  const typeFor = (t: PartyTab) => (t === "players" ? "player" : t === "npcs" ? "npc" : "creature");
  const [type, setType] = useState<Character["type"]>(initialData?.type || typeFor(defaultType));
  const [image, setImage] = useState<string | undefined>(initialData?.image);
  const [cr, setCr] = useState(String((initialData as NPC | undefined)?.cr ?? ""));
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // Older cards keep "Velocidad: …" lines in their traits: the form moves them to their own fields.
  const prefill = useMemo(() => (initialData ? characterFields(initialData) : null), [initialData]);
  const f = prefill?.fields;
  const hasDefenses = !!f && Object.values(f.props).some(Boolean);

  useEffect(() => {
    if (isOpen) {
      setType(initialData?.type || typeFor(defaultType));
      setImage(initialData?.image);
      setCr(String((initialData as NPC | null)?.cr ?? ""));
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
    const opt = (key: string) => getS(key).trim() || undefined;

    const hpMax = getNum("hpMax");
    const base = {
      name: getS("name"),
      race: getS("race"),
      hpMax,
      ac: getNum("ac"),
      stats: {
        STR: getNum("str"), DEX: getNum("dex"), CON: getNum("con"),
        INT: getNum("int"), WIS: getNum("wis"), CHA: getNum("cha"),
      },
      skills: getS("skills"),
      senses: getS("senses"),
      languages: getS("languages"),
      specialTraits: getS("specialTraits"),
      actions: getS("actions"),
      acDesc: opt("acDesc"),
      hitDice: opt("hitDice"),
      speed: opt("speed"),
      savingThrows: opt("savingThrows"),
      damageVulnerabilities: opt("damageVulnerabilities"),
      damageResistances: opt("damageResistances"),
      damageImmunities: opt("damageImmunities"),
      conditionImmunities: opt("conditionImmunities"),
      // Lowering the max never leaves more current HP than the new max.
      ...(initialData?.hpCurrent !== undefined ? { hpCurrent: Math.min(initialData.hpCurrent, hpMax) } : {}),
      image,
    };

    if (type === "player") {
      const p = { ...base, classAndLevel: getS("classAndLevel"), passivePerception: getNum("passivePerception") };
      if (isEditing && initialData) actions.updatePlayer(initialData.id, p);
      else actions.addPlayer(p);
    } else {
      const n = { ...base, cr: getS("cr") };
      if (type === "npc") {
        if (isEditing && initialData) actions.updateNPC(initialData.id, n);
        else actions.addNPC(n);
      } else {
        if (isEditing && initialData) actions.updateCreature(initialData.id, n);
        else actions.addCreature(n);
      }
    }
    onClose();
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={isEditing ? "Editar Personaje" : "Nuevo Personaje"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isEditing && (
          <div className="flex gap-2 mb-2">
            <Button type="button" variant={type === "player" ? "primary" : "secondary"} onClick={() => setType("player")} className="flex-1">Jugador</Button>
            <Button type="button" variant={type === "npc" ? "primary" : "secondary"} onClick={() => setType("npc")} className="flex-1">NPC</Button>
            <Button type="button" variant={type === "creature" ? "primary" : "secondary"} onClick={() => setType("creature")} className="flex-1">Criatura</Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre" name="name" required defaultValue={initialData?.name} />
          <Input label="Raza" name="race" defaultValue={initialData?.race} placeholder={type === "creature" ? "ej. Bestia Mediana, sin alineamiento" : undefined} />
          {type === "player" && (
            <>
              <Input label="Clase y Nivel" name="classAndLevel" defaultValue={(initialData as Player)?.classAndLevel} />
              <Input label="Percepción Pasiva" name="passivePerception" type="number" defaultValue={(initialData as Player)?.passivePerception} />
            </>
          )}
          <Input label="Clase de Armadura (AC)" name="ac" type="number" required defaultValue={initialData?.ac} />
          <Input label="Detalle de la CA" name="acDesc" defaultValue={f?.acDesc} placeholder="ej. armadura natural, cota de malla" />
          <Input label="PV Máximo" name="hpMax" type="number" required defaultValue={initialData?.hpMax} />
          <Input label="Dados de golpe" name="hitDice" defaultValue={f?.hitDice} placeholder="ej. 7d10+21" />
          {(type === "npc" || type === "creature") && (
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="character-cr" className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Desafío (CR)</label>
              <Combobox
                id="character-cr"
                name="cr"
                value={cr}
                onChange={setCr}
                options={CR_OPTIONS}
                pattern={"^\\d+(\\/\\d+)?(\\s*\\(.*\\))?$"}
                title="Un número o una fracción (ej. 1/4, 2), con los PX entre paréntesis si quieres"
                inputClassName="flex h-10 w-full bg-dm-bg border border-dm-border px-3 py-2 text-sm text-dm-text-bright placeholder:text-dm-muted placeholder:italic focus:outline-none focus:border-dm-accent"
              />
            </div>
          )}
          <div className={cn(type === "player" && "sm:col-span-2")}>
            <Input label="Velocidad" name="speed" defaultValue={f?.speed} placeholder="ej. 30 pies, trepar 30 pies" />
          </div>
        </div>

        <div className="border border-dm-border rounded-sm p-3 grid grid-cols-3 sm:grid-cols-6 gap-2 bg-dm-bg-darker">
          <Input label="FUE" name="str" type="number" required defaultValue={initialData?.stats?.STR || 10} />
          <Input label="DES" name="dex" type="number" required defaultValue={initialData?.stats?.DEX || 10} />
          <Input label="CON" name="con" type="number" required defaultValue={initialData?.stats?.CON || 10} />
          <Input label="INT" name="int" type="number" required defaultValue={initialData?.stats?.INT || 10} />
          <Input label="SAB" name="wis" type="number" required defaultValue={initialData?.stats?.WIS || 10} />
          <Input label="CAR" name="cha" type="number" required defaultValue={initialData?.stats?.CHA || 10} />
        </div>

        <Input label="Tiradas de salvación" name="savingThrows" defaultValue={f?.props["Tiradas de salvación"]} placeholder="ej. Des +5, Sab +3" />
        <Input label="Habilidades" name="skills" defaultValue={initialData?.skills} placeholder="ej. Percepción +2, Sigilo +4" />
        <Input label="Sentidos" name="senses" defaultValue={initialData?.senses} placeholder="ej. Visión en la oscuridad 120 pies, Percepción pasiva 12" />
        <Input label="Idiomas" name="languages" defaultValue={initialData?.languages} placeholder="ej. Común, élfico" />

        <details open={hasDefenses} className="border border-dm-border rounded-sm bg-dm-bg-darker group">
          <summary className="cursor-pointer select-none px-3 py-2.5 text-[10px] font-bold text-dm-accent uppercase tracking-widest">
            Resistencias, inmunidades y vulnerabilidades
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 pt-1">
            <Input label="Resistencias al daño" name="damageResistances" defaultValue={f?.props["Resistencias al daño"]} placeholder="ej. fuego, frío" />
            <Input label="Inmunidades al daño" name="damageImmunities" defaultValue={f?.props["Inmunidades al daño"]} placeholder="ej. veneno" />
            <Input label="Vulnerabilidades al daño" name="damageVulnerabilities" defaultValue={f?.props["Vulnerabilidades al daño"]} placeholder="ej. radiante" />
            <Input label="Inmunidades a estados" name="conditionImmunities" defaultValue={f?.props["Inmunidades a estados"]} placeholder="ej. envenenado, asustado" />
          </div>
        </details>

        <Textarea label="Rasgos Especiales" name="specialTraits" defaultValue={prefill ? prefill.rest : ""} placeholder="ej. Sensibilidad a la luz solar. El drow tiene desventaja en las tiradas..." />
        <Textarea label="Acciones (Ataques, Hechizos)" name="actions" defaultValue={initialData?.actions} placeholder="ej. Espada corta. Ataque con arma cuerpo a cuerpo: +4 a impactar, alcance 5 pies..." />
        <p className="-mt-2 text-xs text-dm-muted italic">
          Separa cada rasgo o acción con una línea en blanco y empieza con su nombre y un punto («Mordisco. …»): saldrá en negrita.
          Una línea en mayúsculas («REACCIONES») crea una sección.
        </p>

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
