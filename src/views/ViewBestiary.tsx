import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import { Search, Loader2, Skull, Star, SlidersHorizontal, Swords, UserPlus, Check, Minus, Plus, Dices, Copy, ArrowRight } from "lucide-react";
import { focusSearchResult } from "../lib/searchFocus";
import { copyMonster } from "../lib/monsterClipboard";
import { useMonsterStore } from "../store/useMonsterStore";
import { useStore, actions, store } from "../store/useStore";
import { cn, formatMod, normalizeSearchText } from "../lib/utils";
import { Modal } from "../components/ui/Modal";
import { ViewHeader } from "../components/ui/ViewHeader";
import { Select } from "../components/ui/Select";
import { MonsterStatBlock } from "../components/MonsterStatBlock";
import { Monster } from "../types/monster";
import { MONSTER_TYPE_NAMES, MONSTER_SIZES, CHALLENGE_RATINGS, abilityModifier, monsterKind, monsterToCreature } from "../data/monsterLabels";

type SortOrder = "name_asc" | "cr_asc" | "cr_desc" | "favorites";

/** Filter dropdowns: as tall as the search box next to them. */
const selectClass = "h-auto py-2 rounded-sm";

export function ViewBestiary() {
  const monsters = useMonsterStore((s) => s.monsters);
  const isLoading = useMonsterStore((s) => s.isLoading);
  const error = useMonsterStore((s) => s.error);
  const fetchMonsters = useMonsterStore((s) => s.fetchMonsters);
  const favoriteMonsters = useStore((s) => s.favoriteMonsters);
  const highlightedMonsterId = useStore((s) => s.uiState.highlightedMonsterId);
  const [selected, setSelected] = useState<Monster | null>(null);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [crFilter, setCrFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name_asc");
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = [crFilter, typeFilter, sizeFilter].filter(Boolean).length + (sortOrder !== "name_asc" ? 1 : 0);

  useEffect(() => {
    fetchMonsters();
  }, [fetchMonsters]);

  useEffect(() => {
    if (!highlightedMonsterId || monsters.length === 0) return;
    const m = monsters.find((x) => x.index === highlightedMonsterId);
    if (m) setSelected(m);
    actions.updateUI({ highlightedMonsterId: undefined });
    // No cleanup: clearing highlightedMonsterId re-runs this effect and must not cancel the scroll.
    setTimeout(() => {
      document.getElementById(`monster-${highlightedMonsterId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [highlightedMonsterId, monsters]);

  // Only the CRs that actually appear, in SRD order.
  const crOptions = useMemo(() => {
    const present = new Set(monsters.map((m) => m.cr));
    return CHALLENGE_RATINGS.filter((cr) => present.has(cr));
  }, [monsters]);

  const searchIndex = useMemo(
    () => monsters.map((m) => ({ monster: m, name: normalizeSearchText(`${m.name} ${m.name_en || ""}`), extra: normalizeSearchText(`${m.type} ${m.subtype || ""}`) })),
    [monsters]
  );

  const filtered = useMemo(() => {
    const q = normalizeSearchText(deferredSearch.trim());
    const favs = new Set(favoriteMonsters);
    const result = searchIndex
      .filter(({ monster: m, name, extra }) =>
        (!q || name.includes(q) || extra.includes(q)) &&
        (crFilter === "" || m.cr === crFilter) &&
        (typeFilter === "" || m.type_key === typeFilter) &&
        (sizeFilter === "" || m.size === sizeFilter) &&
        (sortOrder !== "favorites" || favs.has(m.index))
      )
      .map(({ monster }) => monster);

    return result.sort((a, b) => {
      if (sortOrder === "cr_asc" || sortOrder === "cr_desc") {
        const diff = a.cr_value - b.cr_value;
        if (diff !== 0) return sortOrder === "cr_asc" ? diff : -diff;
      }
      return a.name.localeCompare(b.name, "es");
    });
  }, [searchIndex, deferredSearch, crFilter, typeFilter, sizeFilter, sortOrder, favoriteMonsters]);

  const isFavorite = !!selected && favoriteMonsters.includes(selected.index);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={Skull}
        title="Bestiario"
        actions={
          <span className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-dm-muted bg-dm-bg-hover px-2 sm:px-3 py-1.5 rounded-sm border border-dm-border whitespace-nowrap">
            {filtered.length !== monsters.length ? `${filtered.length} / ` : ""}{monsters.length} criaturas
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar text-dm-text">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <div className="bg-dm-bg-alt border border-dm-border rounded-sm p-3 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-dm-accent" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="col-span-2 md:col-span-1 flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-dm-muted" />
                  </div>
                  <input
                    type="search"
                    placeholder="Buscar..."
                    aria-label="Buscar criaturas"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent focus:ring-1 focus:ring-dm-accent"
                  />
                </div>
                {/* Phones: the filters fold away behind this button to leave room for the list. */}
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-expanded={showFilters}
                  className={cn(
                    "md:hidden relative shrink-0 flex items-center gap-1.5 px-3 border rounded-sm text-xs uppercase tracking-wider transition-colors",
                    showFilters || activeFilterCount ? "border-dm-accent text-dm-accent" : "border-dm-border text-dm-muted"
                  )}
                >
                  <SlidersHorizontal size={16} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-dm-accent text-dm-bg-darker text-[11px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              <div className={cn("col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4", !showFilters && "hidden md:grid")}>
                <Select
                  aria-label="Desafío"
                  value={crFilter}
                  onChange={setCrFilter}
                  dimEmpty
                  className={selectClass}
                  options={[{ value: "", label: "Desafío" }, ...crOptions.map((cr) => ({ value: cr, label: `Desafío ${cr}` }))]}
                />
                <Select
                  aria-label="Tipo"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  dimEmpty
                  className={selectClass}
                  options={[
                    { value: "", label: "Tipo" },
                    ...Object.entries(MONSTER_TYPE_NAMES)
                      .sort((a, b) => a[1].localeCompare(b[1], "es"))
                      .map(([key, name]) => ({ value: key, label: name })),
                  ]}
                />
                <Select
                  aria-label="Tamaño"
                  value={sizeFilter}
                  onChange={setSizeFilter}
                  dimEmpty
                  className={selectClass}
                  options={[{ value: "", label: "Tamaño" }, ...MONSTER_SIZES.map((s) => ({ value: s, label: s }))]}
                />
                <Select<SortOrder>
                  aria-label="Orden"
                  value={sortOrder}
                  onChange={setSortOrder}
                  className={selectClass}
                  options={[
                    { value: "name_asc", label: "Por nombre" },
                    { value: "cr_asc", label: "Desafío ↑" },
                    { value: "cr_desc", label: "Desafío ↓" },
                    { value: "favorites", label: "Solo guardados" },
                  ]}
                />
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setCrFilter(""); setTypeFilter(""); setSizeFilter(""); setSortOrder("name_asc"); }}
                    className="md:hidden col-span-2 py-2 text-xs uppercase tracking-wider text-dm-muted hover:text-dm-accent"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-dm-muted">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-dm-accent" />
              <p>Despertando a las bestias...</p>
            </div>
          )}

          {error && (
            <div className="bg-dm-danger/20 border border-dm-danger/50 rounded-sm p-4 text-dm-danger text-center">
              Error al cargar el bestiario: {error}
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col border border-dm-border bg-dm-bg-alt rounded-sm shadow-xl">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-dm-muted">No se encontraron criaturas con esos filtros.</div>
              ) : (
                filtered.map((m) => (
                  <button
                    type="button"
                    key={m.index}
                    id={`monster-${m.index}`}
                    onClick={() => setSelected(m)}
                    className="text-left p-3 sm:p-4 transition-colors border-b border-dm-border last:border-b-0 hover:bg-dm-bg-hover [content-visibility:auto] [contain-intrinsic-size:auto_80px]"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-dm-text-bright flex items-center gap-2 min-w-0">
                          <span className="truncate">{m.name}</span>
                          {favoriteMonsters.includes(m.index) && <Star size={14} className="text-dm-accent shrink-0" fill="currentColor" strokeWidth={0} />}
                        </h3>
                        <p className="text-xs text-dm-muted truncate">
                          {monsterKind(m)}
                          {m.name_en && <span className="hidden sm:inline opacity-70"> · {m.name_en}</span>}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-4 text-xs text-dm-muted tabular-nums">
                        <span className="font-semibold text-dm-accent whitespace-nowrap">Desafío {m.cr}</span>
                        <span className="whitespace-nowrap">CA {m.ac} · PG {m.hp}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        headerRight={
          selected && (
            <button
              type="button"
              onClick={() => actions.toggleFavoriteMonster(selected.index)}
              className="p-1 text-dm-accent hover:text-dm-text-bright transition-colors flex items-center"
              title={isFavorite ? "Quitar de Guardados" : "Añadir a Guardados"}
              aria-pressed={isFavorite}
            >
              <Star size={22} className="transition-transform active:scale-90" fill={isFavorite ? "currentColor" : "transparent"} strokeWidth={isFavorite ? 0 : 2} />
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <MonsterActions key={selected.index} monster={selected} />
            <MonsterStatBlock monster={selected} />
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Quick actions for a bestiary entry: drop N copies into the initiative tracker or save it to the campaign. */
function MonsterActions({ monster }: { monster: Monster }) {
  const [count, setCount] = useState(1);
  const [autoRoll, setAutoRoll] = useState(true);
  const [manualInit, setManualInit] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  // Id of the copy saved in Grupo › Criaturas, so the button can take the user there.
  const [savedId, setSavedId] = useState<string | null>(null);
  const dexMod = abilityModifier(monster.stats.DEX);

  const addToCombat = () => {
    const base = monsterToCreature(monster);
    // Number copies after any of the same creature already in combat: "Goblin (3)", "Goblin (4)"...
    const existing = store.getState().combatants.filter((c) => c.tempData?.name.replace(/\s*\(\d+\)$/, "") === monster.name).length;
    const numbered = count > 1 || existing > 0;
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      const initiative = autoRoll ? Math.floor(Math.random() * 20) + 1 + dexMod : Number(manualInit) || 0;
      rolls.push(initiative);
      actions.addTempCombatant({ ...base, isTemp: true, name: numbered ? `${monster.name} (${existing + i + 1})` : monster.name }, initiative, true);
    }
    setFeedback(
      count === 1
        ? `Añadido a la iniciativa con ${rolls[0]}.`
        : `Añadidos ${count} a la iniciativa: ${rolls.join(", ")}.`
    );
  };

  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const copySheet = async () => {
    setCopied((await copyMonster(monster)) ? "ok" : "fail");
    setTimeout(() => setCopied("idle"), 2500);
  };

  const saveToCreatures = () => setSavedId(actions.addCreature(monsterToCreature(monster)));
  const showSaved = () => {
    if (!savedId) return;
    actions.updateUI({ activeTab: "party", partyTab: "creatures" });
    focusSearchResult(savedId);
  };

  return (
    <div className="bg-dm-bg-hover border border-dm-border rounded-sm p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center border border-dm-border rounded-sm bg-dm-bg" role="group" aria-label="Cantidad">
          <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="p-2 text-dm-muted hover:text-dm-accent" aria-label="Uno menos">
            <Minus size={14} />
          </button>
          <span className="w-8 text-center tabular-nums text-dm-text-bright" aria-live="polite">{count}</span>
          <button type="button" onClick={() => setCount((c) => Math.min(20, c + 1))} className="p-2 text-dm-muted hover:text-dm-accent" aria-label="Uno más">
            <Plus size={14} />
          </button>
        </div>

        {/* Initiative: rolled by the app (d20 + DEX modifier) or typed by the DM. */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-dm-muted">Iniciativa</span>
          <div className="flex border border-dm-border rounded-sm overflow-hidden" role="radiogroup" aria-label="Iniciativa">
            <button
              type="button"
              role="radio"
              aria-checked={autoRoll}
              onClick={() => setAutoRoll(true)}
              title={`La app tira 1d20 y suma el modificador de Destreza (${formatMod(monster.stats.DEX)})`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 text-xs tabular-nums transition-colors",
                autoRoll ? "bg-dm-accent/15 text-dm-accent font-bold" : "text-dm-muted hover:text-dm-accent"
              )}
            >
              <Dices size={14} /> Tirar (d20{formatMod(monster.stats.DEX)})
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!autoRoll}
              onClick={() => setAutoRoll(false)}
              title="Escribe tú el resultado de la iniciativa"
              className={cn(
                "px-2.5 py-2 text-xs border-l border-dm-border transition-colors",
                !autoRoll ? "bg-dm-accent/15 text-dm-accent font-bold" : "text-dm-muted hover:text-dm-accent"
              )}
            >
              Manual
            </button>
          </div>
          {!autoRoll && (
            <input
              type="number"
              inputMode="numeric"
              placeholder="Valor"
              aria-label="Valor de iniciativa"
              value={manualInit}
              onChange={(e) => setManualInit(e.target.value)}
              className="w-20 px-2 py-2 bg-dm-bg border border-dm-border rounded-sm text-sm focus:outline-none focus:border-dm-accent"
            />
          )}
        </div>

        <button
          type="button"
          onClick={addToCombat}
          className="flex-1 sm:flex-none min-w-36 flex items-center justify-center gap-2 px-3 py-2 bg-dm-accent text-dm-bg-darker font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-dm-accent-hover transition-colors active:scale-95"
        >
          <Swords size={16} /> Añadir a combate
        </button>
        <button
          type="button"
          onClick={savedId ? showSaved : saveToCreatures}
          title={savedId ? "Guardada. Abre Grupo › Criaturas y la resalta" : "Guarda una copia editable en Grupo › Criaturas, para adaptarla a tu campaña"}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border text-xs uppercase tracking-wider rounded-sm transition-colors",
            savedId ? "border-dm-accent text-dm-accent bg-dm-accent/10 hover:bg-dm-accent hover:text-dm-bg-darker" : "border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent"
          )}
        >
          {savedId ? <><Check size={16} /> Guardada · Ver en Criaturas <ArrowRight size={14} /></> : <><UserPlus size={16} /> Guardar en tus criaturas</>}
        </button>
        <button
          type="button"
          onClick={copySheet}
          title="Copia la ficha como tabla para pegarla en Google Docs, Word…"
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border text-xs uppercase tracking-wider rounded-sm transition-colors",
            copied === "ok" ? "border-dm-accent text-dm-accent" : "border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent"
          )}
        >
          {copied === "ok" ? <Check size={16} /> : <Copy size={16} />} {copied === "ok" ? "Ficha copiada" : copied === "fail" ? "No se pudo copiar" : "Copiar ficha"}
        </button>
      </div>
      {feedback && <p className="text-xs text-dm-accent" role="status">{feedback}</p>}
    </div>
  );
}
