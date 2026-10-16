import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { useSpellStore } from "../store/useSpellStore";
import { Search, Loader2, Sparkles, BookOpen, Star, Shield, Cloud, Eye, Brain, Flame, Ghost, Skull, FlaskConical } from "lucide-react";
import { cn, normalizeSearchText } from "../lib/utils";
import { Markdown } from "../components/ui/Markdown";
import { useStore, actions } from "../store/useStore";
import { Modal } from "../components/ui/Modal";
import { ViewHeader } from "../components/ui/ViewHeader";
import { Spell } from "../types/spell";
import { SCHOOL_NAMES, CLASS_NAMES } from "../data/spellLabels";

type SortOrder = "name_asc" | "level_asc" | "level_desc" | "favorites";

const SCHOOL_ICONS: Record<string, React.ElementType> = {
  abjuration: Shield,
  conjuration: Cloud,
  divination: Eye,
  enchantment: Brain,
  evocation: Flame,
  illusion: Ghost,
  necromancy: Skull,
  transmutation: FlaskConical,
};

function translateLevel(level: number | undefined) {
  if (level === undefined) return "Desconocido";
  return level === 0 ? "Truco" : `Nv. ${level}`;
}

function schoolName(spell: Spell) {
  return spell.school?.index ? SCHOOL_NAMES[spell.school.index] || spell.school.name : "Sin escuela";
}

const selectClass = "w-full px-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm text-dm-text focus:outline-none focus:border-dm-accent";

export function ViewGrimoire() {
  const spells = useSpellStore((s) => s.spells);
  const isLoading = useSpellStore((s) => s.isLoading);
  const error = useSpellStore((s) => s.error);
  const fetchSpells = useSpellStore((s) => s.fetchSpells);
  const favoriteSpells = useStore((s) => s.favoriteSpells);
  const highlightedSpellId = useStore((s) => s.uiState.highlightedSpellId);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [levelFilter, setLevelFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name_asc");

  useEffect(() => {
    fetchSpells();
  }, [fetchSpells]);

  useEffect(() => {
    if (!highlightedSpellId || spells.length === 0) return;
    const s = spells.find((x) => x.index === highlightedSpellId);
    if (s) setSelectedSpell(s);
    actions.updateUI({ highlightedSpellId: undefined });
    // The row may be hidden by the current filters; scroll only if it is rendered.
    // No cleanup: clearing highlightedSpellId re-runs this effect and must not cancel the scroll.
    setTimeout(() => {
      document.getElementById(`spell-${highlightedSpellId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [highlightedSpellId, spells]);

  // Normalizing 350 descriptions is the expensive part, so do it once per spell list.
  const searchIndex = useMemo(
    () => spells.map((s) => ({ spell: s, name: normalizeSearchText(s.name), text: normalizeSearchText(s.desc?.join(" ")) })),
    [spells]
  );

  const filteredSpells = useMemo(() => {
    const q = normalizeSearchText(deferredSearch.trim());
    const favs = new Set(favoriteSpells);
    const result = searchIndex
      .filter(({ spell: s, name, text }) =>
        (!q || name.includes(q) || text.includes(q)) &&
        (levelFilter === "" || s.level?.toString() === levelFilter) &&
        (schoolFilter === "" || s.school?.index === schoolFilter) &&
        (classFilter === "" || s.classes?.some((c) => c.index === classFilter)) &&
        (sortOrder !== "favorites" || favs.has(s.index))
      )
      .map(({ spell }) => spell);

    return result.sort((a, b) => {
      if (sortOrder === "level_asc" || sortOrder === "level_desc") {
        const diff = (a.level ?? 99) - (b.level ?? 99);
        if (diff !== 0) return sortOrder === "level_asc" ? diff : -diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [searchIndex, deferredSearch, levelFilter, schoolFilter, classFilter, sortOrder, favoriteSpells]);

  const isFavorite = !!selectedSpell && favoriteSpells.includes(selectedSpell.index);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={BookOpen}
        title="Grimorio"
        actions={
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-dm-muted bg-dm-bg-hover px-2 sm:px-3 py-1.5 rounded-sm border border-dm-border whitespace-nowrap">
            {filteredSpells.length !== spells.length ? `${filteredSpells.length} / ` : ""}{spells.length} conjuros
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar text-dm-text">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="bg-dm-bg-alt border border-dm-border rounded-sm p-3 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-dm-accent" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="relative col-span-2 md:col-span-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-dm-muted" />
                </div>
                <input
                  type="search"
                  placeholder="Buscar..."
                  aria-label="Buscar conjuros"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent focus:ring-1 focus:ring-dm-accent"
                />
              </div>

              <select aria-label="Nivel" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={selectClass}>
                <option value="">Nivel</option>
                <option value="0">Trucos</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={String(n)}>Nivel {n}</option>
                ))}
              </select>

              <select aria-label="Escuela" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className={selectClass}>
                <option value="">Escuela</option>
                {Object.entries(SCHOOL_NAMES).map(([idx, name]) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              <select aria-label="Clase" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectClass}>
                <option value="">Clase</option>
                {Object.entries(CLASS_NAMES).map(([idx, name]) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              <select aria-label="Orden" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)} className={selectClass}>
                <option value="name_asc">Por nombre</option>
                <option value="level_asc">Nivel ↑</option>
                <option value="level_desc">Nivel ↓</option>
                <option value="favorites">Solo guardados</option>
              </select>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-dm-muted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-dm-accent" />
              <p>Descifrando pergaminos antiguos...</p>
            </div>
          )}

          {error && (
            <div className="bg-dm-danger/20 border border-dm-danger/50 rounded-sm p-4 text-dm-danger text-center">
              Error al cargar los hechizos: {error}
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col border border-dm-border bg-dm-bg-alt rounded-sm shadow-xl">
              {filteredSpells.length === 0 ? (
                <div className="p-8 text-center text-dm-muted">No se encontraron conjuros con esos filtros.</div>
              ) : (
                filteredSpells.map((spell) => {
                  const SchoolIcon = SCHOOL_ICONS[spell.school?.index] || Sparkles;
                  return (
                    <button
                      type="button"
                      key={spell.index}
                      id={`spell-${spell.index}`}
                      onClick={() => setSelectedSpell(spell)}
                      className="text-left p-3 sm:p-4 transition-colors border-b border-dm-border last:border-b-0 hover:bg-dm-bg-hover [content-visibility:auto] [contain-intrinsic-size:auto_96px]"
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-1 xl:gap-2 mb-1.5">
                        <h3 className="text-base sm:text-lg font-bold text-dm-text-bright flex items-center gap-2 min-w-0">
                          <SchoolIcon className="w-4 h-4 text-dm-accent shrink-0" />
                          <span className="truncate">{spell.name}</span>
                          {favoriteSpells.includes(spell.index) && <Star size={14} className="text-dm-accent shrink-0" fill="currentColor" strokeWidth={0} />}
                        </h3>
                        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-dm-muted items-center">
                          <span className="font-semibold text-dm-accent">{translateLevel(spell.level)}</span>
                          <span>{schoolName(spell)}</span>
                          <span>{spell.casting_time}</span>
                          <span className="hidden sm:inline">{spell.duration}</span>
                          <span>{spell.range}</span>
                          <span className="opacity-70">{spell.components?.join(", ")}</span>
                        </div>
                      </div>
                      <p className="text-sm text-dm-text-muted leading-relaxed line-clamp-2">
                        {spell.desc?.join(" ").replace(/\*/g, "")}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedSpell}
        onClose={() => setSelectedSpell(null)}
        title={selectedSpell?.name ?? ""}
        headerRight={
          selectedSpell && (
            <button
              type="button"
              onClick={() => actions.toggleFavoriteSpell(selectedSpell.index)}
              className="p-1 text-dm-accent hover:text-dm-text-bright transition-colors flex items-center"
              title={isFavorite ? "Quitar de Guardados" : "Añadir a Guardados"}
              aria-pressed={isFavorite}
            >
              <Star size={22} className="transition-transform active:scale-90" fill={isFavorite ? "currentColor" : "transparent"} strokeWidth={isFavorite ? 0 : 2} />
            </button>
          )
        }
      >
        {selectedSpell && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-sm text-dm-muted border-b border-dm-border pb-4">
              <span><strong>Nivel:</strong> {selectedSpell.level === 0 ? "Truco" : selectedSpell.level ?? "Desconocido"}</span>
              <span><strong>Escuela:</strong> {schoolName(selectedSpell)}</span>
              <span><strong>Tiempo:</strong> {selectedSpell.casting_time}</span>
              <span><strong>Duración:</strong> {selectedSpell.duration}</span>
              <span><strong>Rango:</strong> {selectedSpell.range}</span>
              <span><strong>Componentes:</strong> {selectedSpell.components?.join(", ")}</span>
            </div>

            <div className="text-sm text-dm-text leading-relaxed space-y-3 prose prose-invert prose-sm max-w-none prose-strong:text-dm-accent">
              <Markdown>{selectedSpell.desc?.join("\n\n") || ""}</Markdown>
              {selectedSpell.higher_level && selectedSpell.higher_level.length > 0 && (
                <div className="mt-4">
                  <strong className="text-dm-accent">A niveles superiores: </strong>
                  <Markdown>{selectedSpell.higher_level.join("\n\n")}</Markdown>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
