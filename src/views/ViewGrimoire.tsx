import { useEffect, useState, useMemo } from "react";
import { useSpellStore } from "../store/useSpellStore";
import { Search, Loader2, Sparkles, BookOpen, Star, Shield, Cloud, Eye, Brain, Flame, Ghost, Skull, FlaskConical } from "lucide-react";
import { cn, normalizeSearchText } from "../lib/utils";
import Markdown from "react-markdown";
import { useStore, actions } from "../store/useStore";
import { Modal } from "../components/ui/Modal";
import { Spell } from "../types/spell";





function translateLevel(level_int: number | undefined) {
  if (level_int === undefined) return "Desconocido";
  return level_int === 0 ? "Truco" : `Nv. ${level_int}`;
}


function getSchoolIcon(schoolName: string) {
  if (!schoolName) return <Sparkles className="w-4 h-4 text-dm-accent" />;
  const normalized = schoolName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (normalized.includes("abjuracion") || normalized.includes("abjuration")) return <Shield className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("conjuracion") || normalized.includes("conjuration")) return <Cloud className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("adivinacion") || normalized.includes("divination")) return <Eye className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("encantamiento") || normalized.includes("enchantment")) return <Brain className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("evocacion") || normalized.includes("evocation")) return <Flame className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("ilusion") || normalized.includes("illusion")) return <Ghost className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("nigromancia") || normalized.includes("necromancy")) return <Skull className="w-4 h-4 text-dm-accent" />;
  if (normalized.includes("transmutacion") || normalized.includes("transmutation")) return <FlaskConical className="w-4 h-4 text-dm-accent" />;
  
  return <Sparkles className="w-4 h-4 text-dm-accent" />;
}

export function ViewGrimoire() {
  const { spells, isLoading, error, fetchSpells } = useSpellStore();
  const storeState = useStore();
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  useEffect(() => {
    if (storeState.uiState.highlightedSpellId && spells.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`spell-${storeState.uiState.highlightedSpellId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const s = spells.find(x => x.index === storeState.uiState.highlightedSpellId);
          if (s) setSelectedSpell(s);
          actions.updateUI({ highlightedSpellId: undefined });
        }
      }, 100);
    }
  }, [storeState.uiState.highlightedSpellId, spells]);
  
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"name_asc" | "level_asc" | "level_desc" | "favorites">("name_asc");

  const SCHOOL_NAMES: Record<string, string> = {
  "abjuration": "Abjuración",
  "conjuration": "Conjuración",
  "divination": "Adivinación",
  "enchantment": "Encantamiento",
  "evocation": "Evocación",
  "illusion": "Ilusión",
  "necromancy": "Nigromancia",
  "transmutation": "Transmutación"
};
  const CLASS_NAMES: Record<string, string> = {
  "bard": "Bardo",
  "cleric": "Clérigo",
  "druid": "Druida",
  "paladin": "Paladín",
  "ranger": "Explorador",
  "sorcerer": "Hechicero",
  "warlock": "Brujo",
  "wizard": "Mago"
};


  useEffect(() => {
    fetchSpells();
  }, [fetchSpells]);

  const filteredSpells = useMemo(() => {
    let result = spells;

    if (search.trim()) {
      const lowerSearch = normalizeSearchText(search);
      result = result.filter(
        (s) =>
          normalizeSearchText(s.name).includes(lowerSearch) ||
          normalizeSearchText(s.desc?.join(" ")).includes(lowerSearch)
      );
    }

    if (levelFilter !== "") {
      result = result.filter((s) => s.level?.toString() === levelFilter);
    }

    if (schoolFilter !== "") {
      result = result.filter((s) => s.school?.index === schoolFilter);
    }

    if (classFilter !== "") {
      result = result.filter((s) => s.classes?.some(c => c.index === classFilter));
    }
    if (sortOrder === "favorites") {
      const favs = storeState.favoriteSpells || [];
      result = result.filter(s => favs.includes(s.index));
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === "name_asc" || sortOrder === "favorites") {
        return a.name.localeCompare(b.name);
      } else {
        const aLevel = a.level ?? 99;
        const bLevel = b.level ?? 99;
        if (aLevel !== bLevel) return sortOrder === "level_asc" ? aLevel - bLevel : bLevel - aLevel;
        return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [spells, search, levelFilter, schoolFilter, classFilter, sortOrder, storeState.favoriteSpells]);

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden relative">
      {/* HEADER: Matches standard top bar */}
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex justify-between items-center z-20 relative gap-4">
        <h2 className="text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2 truncate">
          <BookOpen className="text-dm-accent shrink-0" size={20} /> 
          <span className="hidden sm:inline">Grimorio</span><span className="sm:hidden">Grimorio</span>
        </h2>
        <div className="flex gap-2">
           <span className="text-xs uppercase tracking-widest font-bold text-dm-muted bg-dm-bg-hover px-3 py-1.5 rounded-sm border border-dm-border">
             {spells.length} Conjuros
           </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 custom-scrollbar relative z-10 text-dm-text">
        <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Search Controls */}
        <div className="bg-dm-bg-alt border border-dm-border rounded-sm p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-dm-accent" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-dm-muted" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent focus:ring-1 focus:ring-dm-accent transition-colors"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent"
            >
              <option value="">- Nivel -</option>
              <option value="0">Trucos</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n.toString()}>Nivel {n}</option>
              ))}
            </select>

            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent"
            >
              <option value="">- Escuela -</option>
              {Object.entries(SCHOOL_NAMES).map(([idx, name]) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent"
            >
              <option value="">- Clase -</option>
              {Object.entries(CLASS_NAMES).map(([idx, name]) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "name_asc" | "level_asc" | "level_desc" | "favorites")}
              className="w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent sm:col-span-2 md:col-span-2 lg:col-span-1"
            >
              <option value="name_asc">Ordenar por nombre</option>
              <option value="level_asc">Ordenar por nivel (Ascendente)</option>
              <option value="level_desc">Ordenar por nivel (Descendente)</option>
              <option value="favorites">Ordenar por Guardados</option>
            </select>
          </div>
        </div>

        {/* Status Messages */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-dm-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-dm-accent" />
            <p>Descifrando pergaminos antiguos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 rounded-sm p-4 text-red-400 text-center">
            Error al cargar los hechizos: {error}
          </div>
        )}

        {/* Spells List */}
        {!isLoading && !error && (
          <div className="flex flex-col border border-dm-border bg-dm-bg-alt rounded-sm shadow-xl">
            {filteredSpells.length === 0 ? (
              <div className="p-8 text-center text-dm-muted">
                No se encontraron conjuros con esos filtros.
              </div>
            ) : (
              filteredSpells.map((spell, idx) => (
                <div 
                  key={`${spell.index}-${idx}`} 
                  id={`spell-${spell.index}-${idx}`}
                  onClick={() => setSelectedSpell(spell)}
                  className={cn(
                    "p-3 sm:p-4 transition-colors cursor-pointer",
                    idx !== filteredSpells.length - 1 ? "border-b border-dm-border" : "",
                    "hover:bg-dm-bg-hover"
                  )}
                >
                  {/* Top row: Name and Stats */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 shrink-0">
                      {getSchoolIcon(spell.school?.name)}
                      {spell.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dm-muted items-center">
                      <span className="font-semibold text-dm-accent">{translateLevel(spell.level)}</span>
                      <span>{spell.school?.index ? (SCHOOL_NAMES[spell.school.index] || spell.school.name) : "Sin escuela"}</span>
                      <span>{spell.casting_time}</span>
                      <span>{spell.duration}</span>
                      <span>{spell.range}</span>
                      <span className="opacity-70">{spell.components?.join(", ") || ""}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-sm text-dm-text-muted leading-relaxed">
                    <p className="line-clamp-2">
                      {spell.desc?.join(" ").replace(/\*/g, "")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </div>

      <Modal
        isOpen={!!selectedSpell}
        onClose={() => setSelectedSpell(null)}
        title={selectedSpell ? `${selectedSpell.name}` : ""}
        headerRight={
          selectedSpell && (
            <button
              onClick={() => actions.toggleFavoriteSpell(selectedSpell.index)}
              className="p-1 text-dm-accent hover:text-white transition-colors flex items-center"
              title={(storeState.favoriteSpells || []).includes(selectedSpell.index) ? "Quitar de Guardados" : "Añadir a Guardados"}
            >
              <Star 
                size={22} 
                className="transition-transform active:scale-90"
                fill={(storeState.favoriteSpells || []).includes(selectedSpell.index) ? "#c1a063" : "transparent"} 
                strokeWidth={(storeState.favoriteSpells || []).includes(selectedSpell.index) ? 0 : 2}
              />
            </button>
          )
        }
      >
        {selectedSpell && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-dm-muted border-b border-dm-border pb-4">
              <span><strong>Nivel:</strong> {selectedSpell.level === 0 ? "Truco" : (selectedSpell.level ?? "Desconocido")}</span>
              <span><strong>Escuela:</strong> {selectedSpell.school?.index ? (SCHOOL_NAMES[selectedSpell.school.index] || selectedSpell.school.name) : "Sin escuela"}</span>
              <span><strong>Tiempo:</strong> {selectedSpell.casting_time}</span>
              <span><strong>Duración:</strong> {selectedSpell.duration}</span>
              <span><strong>Rango:</strong> {selectedSpell.range}</span>
              <span><strong>Componentes:</strong> {selectedSpell.components?.join(", ") || ""}</span>
            </div>
            
            <div className="text-sm text-dm-text leading-relaxed space-y-3 prose prose-invert prose-sm max-w-none prose-strong:text-dm-accent">
              <Markdown>{selectedSpell.desc?.join('\n\n') || ""}</Markdown>
              {selectedSpell.higher_level && selectedSpell.higher_level.length > 0 && (
                <div className="mt-4">
                  <strong className="text-dm-accent">A niveles superiores: </strong>
                  <Markdown>{selectedSpell.higher_level.join('\n\n')}</Markdown>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

