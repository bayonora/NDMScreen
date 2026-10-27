import React, { useEffect, useMemo, useState } from "react";
import { Upload as UploadIcon, X } from "lucide-react";
import { actions, useStore } from "../../store/useStore";
import type { Quest, QuestStatus } from "../../types";
import { cn, compressImage } from "../../lib/utils";
import { descendantIds, flattenForest, type QuestForest } from "../../lib/quests";
import { Modal } from "../ui/Modal";
import { Input, Button } from "../ui/Input";
import { Select } from "../ui/Select";
import { Combobox } from "../ui/Combobox";
import { DescriptionEditor } from "../DescriptionEditor";
import { QUEST_STATUS, QUEST_STATUSES, fieldClass, labelClass, questStatus } from "./questUi";

/** Create or edit a quest. `quest` null = new quest hanging from `defaultParentId`. */
export function QuestEditor({ isOpen, quest, defaultParentId, forest, onClose, onSaved }: {
  isOpen: boolean;
  quest: Quest | null;
  defaultParentId: string | null;
  forest: QuestForest;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [reward, setReward] = useState("");
  const [parentId, setParentId] = useState("");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<QuestStatus>("active");
  const [imageError, setImageError] = useState(false);
  const places = useStore((s) => s.locations);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(quest?.title || "");
    setDescription(quest?.description || "");
    setLocation(quest?.location || "");
    setReward(quest?.reward || "");
    setParentId(quest ? quest.parentId || "" : defaultParentId || "");
    setImage(quest?.image || "");
    setStatus(questStatus(quest?.status));
    setImageError(false);
  }, [isOpen, quest, defaultParentId]);

  // A quest can't hang from itself or from one of its own sub-quests (that would be a loop).
  const parentOptions = useMemo(() => {
    const blocked = quest ? descendantIds(forest, quest.id).add(quest.id) : new Set<string>();
    return [
      { value: "", label: "Ninguna (trama nueva)" },
      ...flattenForest(forest)
        .filter(({ quest: q }) => !blocked.has(q.id))
        .map(({ quest: q, depth }) => ({ value: q.id, label: q.title, indent: depth })),
    ];
  }, [forest, quest]);

  // Suggestions: places from Mapas plus every place already used by a quest.
  const locationOptions = useMemo(() => {
    const names = new Set<string>();
    places.forEach((l) => l.name && names.add(l.name));
    forest.byId.forEach((q) => q.location && names.add(q.location));
    return [...names].sort((a, b) => a.localeCompare(b, "es")).map((value) => ({ value }));
  }, [places, forest]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImage(await compressImage(file, 1024));
      setImageError(false);
    } catch {
      setImageError(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      description,
      location: location.trim(),
      reward: reward.trim(),
      parentId: parentId || null,
      image,
      status,
    };
    if (quest) {
      actions.updateQuest(quest.id, data);
      onSaved(quest.id);
    } else {
      onSaved(actions.addQuest({ ...data, details: [] }));
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={quest ? "Editar Misión" : defaultParentId ? "Nueva Rama" : "Nueva Misión"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative w-full h-36 sm:h-44 bg-dm-bg-alt border border-dm-border border-dashed flex items-center justify-center overflow-hidden rounded-sm group hover:border-dm-accent transition-colors">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
          ) : (
            <div className="text-dm-muted flex flex-col items-center group-hover:text-dm-accent transition-colors pointer-events-none">
              <UploadIcon size={22} className="mb-2" />
              <span className="text-xs uppercase tracking-widest font-bold">Añadir imagen (opcional)</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleImage} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={image ? "Cambiar imagen" : "Añadir imagen"} />
          {image && (
            <>
              <span className="absolute inset-0 flex items-center justify-center can-hover:opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="bg-dm-bg-alt/80 px-3 py-1 text-dm-text-bright text-xs uppercase tracking-widest font-bold rounded-sm">Cambiar</span>
              </span>
              <button type="button" onClick={() => setImage("")} className="absolute top-2 right-2 z-10 p-1.5 bg-black/70 rounded-full text-dm-danger hover:bg-black" title="Quitar imagen" aria-label="Quitar imagen">
                <X size={14} />
              </button>
            </>
          )}
        </div>
        {imageError && <p className="-mt-2 text-xs text-dm-danger">No se pudo procesar la imagen.</p>}

        <Input label="Título de la misión" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus={!quest} />

        <div className="flex flex-col gap-1">
          <span className={labelClass}>Estado</span>
          <div role="radiogroup" aria-label="Estado" className="grid grid-cols-3 gap-1">
            {QUEST_STATUSES.map((s) => {
              const meta = QUEST_STATUS[s];
              const Icon = meta.icon;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 h-10 border text-[11px] font-bold uppercase tracking-wider transition-colors",
                    status === s ? meta.selected : "border-dm-border text-dm-muted hover:text-dm-text hover:border-dm-border-focus"
                  )}
                >
                  <Icon size={14} /> {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="quest-location" className={labelClass}>Lugar (opcional)</label>
            <Combobox id="quest-location" value={location} onChange={setLocation} options={locationOptions} placeholder="Ciudad, mazmorra, región..." inputClassName={cn(fieldClass, "h-10")} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="quest-parent" className={labelClass}>Viene de (rama)</label>
            <Select id="quest-parent" value={parentId} onChange={setParentId} dimEmpty options={parentOptions} />
          </div>
        </div>

        <DescriptionEditor
          id="quest-description"
          label="Descripción"
          labelClassName={labelClass}
          value={description}
          onChange={setDescription}
          textareaClassName={cn(fieldClass, "min-h-32 sm:min-h-40 resize-y")}
          placeholder="El encargo, quién lo da, qué está en juego..."
          smartLists
        />

        <Input label="Recompensa (opcional)" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="500 po, un favor del duque..." />

        <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose} className="border border-dm-border">Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
