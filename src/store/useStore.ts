import { useSyncExternalStore } from "react";
import { get, set } from "idb-keyval";
import { Player, NPC, Creature, Character, Combatant, MapData, LocationData, Shop, ShopItem, Note, CustomItem, LootTable, Quest } from "../types";
import { v4 as uuidv4 } from "uuid";
import { mergeDedupe, downloadJSON } from "../lib/utils";

export type Tab = "party" | "initiative" | "quests" | "maps" | "shops" | "notes" | "items" | "spells" | "bestiary";

// Collections that can be imported/exported on their own from their section.
export type CollectionKey = "players" | "npcs" | "creatures" | "maps" | "locations" | "shops" | "notes" | "customItems" | "lootTables" | "quests";

type UIState = {
  activeTab?: Tab;
  combatActive: boolean;
  activeCombatantId: string | null;
  round: number;
  draftNote: Partial<Note> | null;
  hasSeenWelcome?: boolean;
  partyTab?: "players" | "npcs" | "creatures";
  /** Cards (default) or the compact list in Grupo. */
  partyView?: "cards" | "list";
  highlightedQuestId?: string;
  highlightedSpellId?: string;
  highlightedMonsterId?: string;
  /** Element (data-search-id) to scroll to and highlight once its view shows. See lib/searchFocus. */
  searchFocusId?: string;
  /** Shop to open when the Tiendas tab shows (from the global search). */
  openShopId?: string;
  /** Hides the fixed shops (lib/shops) from the Tiendas grid and the search. */
  hideBuiltinShops?: boolean;
  /** Items of the fixed shops hidden from the players (they can't be edited, so it's kept here). */
  hiddenBuiltinItems?: string[];
  /** Map or place to open when the Mapas tab shows (from the global search). */
  mapsFocusId?: string;
  /** Note to open when the Notas tab shows (from the global search). */
  highlightedNoteId?: string;
  notesSort?: "manual" | "recent" | "alpha";
  /** Category filter of the Notas view; undefined shows every note. */
  notesCategory?: string;
  /** Sub-tab of the Objetos view. */
  itemsTab?: "items" | "loot" | "srd";
  /** Catalog entry to open when the Objetos tab shows (from the global search). */
  highlightedItemId?: string;
  /** Homebrew item to open in the editor when the Objetos tab shows. */
  editCustomItemId?: string;
  collapsedCharacters?: string[];
  theme?: string;
};

type StoreState = {
  players: Player[];
  npcs: NPC[];
  creatures: Creature[];
  combatants: Combatant[];
  graveyard: Combatant[];
  maps: MapData[];
  locations: LocationData[];
  shops: Shop[];
  notes: Note[];
  customItems: CustomItem[];
  lootTables: LootTable[];
  quests: Quest[];
  favoriteSpells: string[];
  favoriteMonsters: string[];
  uiState: UIState;
  isHydrated: boolean;
};

const DEFAULT_STATE: StoreState = {
  players: [],
  npcs: [],
  creatures: [],
  combatants: [],
  graveyard: [],
  maps: [],
  locations: [],
  shops: [],
  notes: [],
  customItems: [],
  lootTables: [],
  quests: [],
  favoriteSpells: [],
  favoriteMonsters: [],
  uiState: {
    combatActive: false,
    activeCombatantId: null,
    round: 1,
    hasSeenWelcome: false,
    draftNote: null,
  },
  isHydrated: false,
};

const STORE_KEY = "dnd_dm_screen_data";

class Store {
  state: StoreState;
  listeners: Set<() => void> = new Set();
  saveTimeout: ReturnType<typeof setTimeout> | null = null;
  saveErrorShown = false;

  constructor() {
    this.state = DEFAULT_STATE;
    this.init();
    // Flush the debounced save so the last changes aren't lost when the tab is hidden or closed.
    window.addEventListener("pagehide", () => this.flush());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flush();
    });
  }

  async init() {
    try {
      let saved = await get(STORE_KEY);
      if (!saved) {
        // Migration from localStorage
        const local = localStorage.getItem(STORE_KEY);
        if (local) {
          saved = JSON.parse(local);
        }
      }

      if (saved) {
        this.state = { ...DEFAULT_STATE, ...saved, isHydrated: true };
        if (!this.state.uiState) {
          this.state.uiState = DEFAULT_STATE.uiState;
        }
        
        // Ensure all arrays exist
        this.state.players = this.state.players || [];
        this.state.npcs = this.state.npcs || [];
        this.state.creatures = this.state.creatures || [];
        this.state.combatants = this.state.combatants || [];
        this.state.graveyard = this.state.graveyard || [];
        this.state.maps = this.state.maps || [];
        this.state.locations = this.state.locations || [];
        this.state.shops = this.state.shops || [];
        this.state.notes = this.state.notes || [];
        this.state.customItems = this.state.customItems || [];
        this.state.lootTables = this.state.lootTables || [];
        this.state.quests = this.state.quests || [];
        this.state.favoriteSpells = this.state.favoriteSpells || [];
        this.state.favoriteMonsters = this.state.favoriteMonsters || [];

        // Heal ghosts
        const isGhost = (c: any) => {
           if (c.isTemp && c.tempData) return false;
           return !this.state.players.some((p) => p.id === c.characterId) && 
                  !this.state.npcs.some((n) => n.id === c.characterId) &&
                  !(this.state.creatures || []).some((cr) => cr.id === c.characterId);
        };
        if (this.state.combatants) {
           this.state.combatants = this.state.combatants.filter((c) => !isGhost(c));
        }
        if (this.state.graveyard) {
           this.state.graveyard = this.state.graveyard.filter((c) => !isGhost(c));
        }
      } else {
         this.state = { ...DEFAULT_STATE, isHydrated: true };
      }
    } catch {
      this.state = { ...DEFAULT_STATE, isHydrated: true };
    }
    this.listeners.forEach((l) => l());
  }

  // Arrow functions so they can be passed around unbound (e.g. to useSyncExternalStore).
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getState = () => this.state;

  setState(newState: Partial<StoreState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((l) => l());
    this.save();
  }

  save() {
    // Never persist the empty default state over saved data before hydration finishes.
    if (!this.state.isHydrated) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.flush(), 500); // Debounce to prevent blocking IO spam
  }

  // Writes pending changes immediately (also called when the page is hidden or closed).
  async flush() {
    if (!this.saveTimeout) return;
    clearTimeout(this.saveTimeout);
    this.saveTimeout = null;
    try {
      const { isHydrated, ...rest } = this.state;
      await set(STORE_KEY, { ...rest, npcs: rest.npcs.filter((n) => !n.isTemp) });
      this.saveErrorShown = false;
    } catch (e) {
      console.error("Failed to save to IndexedDB.", e);
      // Show the alert once per failure streak instead of on every keystroke.
      if (this.saveErrorShown) return;
      this.saveErrorShown = true;
      const isQuota = e instanceof DOMException && e.name === "QuotaExceededError";
      alert(isQuota
        ? "Error al guardar: la memoria del navegador está llena. Reduce el tamaño o el número de imágenes."
        : `Error al guardar los datos: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  exportData() {
    const { isHydrated, ...rest } = this.state;
    downloadJSON(
      { ...rest, npcs: rest.npcs.filter((n) => !n.isTemp), creatures: rest.creatures.filter((c) => !c.isTemp) },
      "ndms_datos_completos.json"
    );
  }

  importData(jsonString: string, mode: "merge" | "overwrite" = "overwrite") {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.uiState) {
        alert("Parece que estás intentando importar un archivo de una sección específica (como Notas o Grupo) en el Importador Global. Ve a la sección correspondiente para importarlo o usa un archivo de Exportación Total.");
        return;
      }
      if (typeof parsed !== 'object' || parsed === null) {
        alert("Error al importar: Formato no válido.");
        return;
      }
      if (parsed.npcs) {
        parsed.npcs = parsed.npcs.filter((n: any) => !n.isTemp);
      }
      if (parsed.creatures) {
        parsed.creatures = parsed.creatures.filter((c: any) => !c.isTemp);
      }


      if (mode === "overwrite") {
        this.setState({
          ...DEFAULT_STATE,
          ...parsed,
          isHydrated: true,
          uiState: { ...DEFAULT_STATE.uiState, ...parsed.uiState },
          players: Array.isArray(parsed.players) ? parsed.players : [],
          npcs: Array.isArray(parsed.npcs) ? parsed.npcs : [],
          creatures: Array.isArray(parsed.creatures) ? parsed.creatures : [],
          combatants: Array.isArray(parsed.combatants) ? parsed.combatants : [],
          graveyard: Array.isArray(parsed.graveyard) ? parsed.graveyard : [],
          maps: Array.isArray(parsed.maps) ? parsed.maps : [],
          locations: Array.isArray(parsed.locations) ? parsed.locations : [],
          shops: Array.isArray(parsed.shops) ? parsed.shops : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
          customItems: Array.isArray(parsed.customItems) ? parsed.customItems : [],
          lootTables: Array.isArray(parsed.lootTables) ? parsed.lootTables : [],
          quests: Array.isArray(parsed.quests) ? parsed.quests : [],
          favoriteSpells: Array.isArray(parsed.favoriteSpells) ? parsed.favoriteSpells : [],
          favoriteMonsters: Array.isArray(parsed.favoriteMonsters) ? parsed.favoriteMonsters : [],
        });
      }
 else {
        const state = this.getState();
        
        // Only the data collections are merged; the current UI state (tabs, active combat...) is kept.
        this.setState({
          players: mergeDedupe(state.players || [], parsed.players),
          npcs: mergeDedupe(state.npcs || [], parsed.npcs),
          creatures: mergeDedupe(state.creatures || [], parsed.creatures),
          combatants: mergeDedupe(state.combatants || [], parsed.combatants),
          graveyard: mergeDedupe(state.graveyard || [], parsed.graveyard),
          maps: mergeDedupe(state.maps || [], parsed.maps),
          locations: mergeDedupe(state.locations || [], parsed.locations),
          shops: mergeDedupe(state.shops || [], parsed.shops),
          notes: mergeDedupe(state.notes || [], parsed.notes),
          customItems: mergeDedupe(state.customItems || [], parsed.customItems),
          lootTables: mergeDedupe(state.lootTables || [], parsed.lootTables),
          quests: mergeDedupe(state.quests || [], parsed.quests),
          favoriteSpells: Array.from(new Set([...(state.favoriteSpells || []), ...(Array.isArray(parsed.favoriteSpells) ? parsed.favoriteSpells : [])])),
          favoriteMonsters: Array.from(new Set([...(state.favoriteMonsters || []), ...(Array.isArray(parsed.favoriteMonsters) ? parsed.favoriteMonsters : [])])),
        });
      }
      alert("Datos importados correctamente.");
    } catch (e) {
      alert("Error al importar: Archivo no válido.");
    }
  }
}

export const store = new Store();

/**
 * Subscribes a component to a slice of the store. The component only re-renders when the
 * selected value changes (by reference), so select the narrowest slice you need and never
 * build new objects/arrays inside the selector.
 */
export function useStore<T>(selector: (state: StoreState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export const actions = {
  toggleFavoriteSpell: (spellId: string) => {
    const current = store.getState().favoriteSpells || [];
    if (current.includes(spellId)) {
      store.setState({ favoriteSpells: current.filter(id => id !== spellId) });
    } else {
      store.setState({ favoriteSpells: [...current, spellId] });
    }
  },
  toggleFavoriteMonster: (monsterId: string) => {
    const current = store.getState().favoriteMonsters || [];
    store.setState({
      favoriteMonsters: current.includes(monsterId) ? current.filter((id) => id !== monsterId) : [...current, monsterId],
    });
  },
  // Reorder Actions
  reorderPlayers: (players: Player[]) => store.setState({ players }),
  reorderNPCs: (npcs: NPC[]) => store.setState({ npcs }),
  reorderCreatures: (creatures: Creature[]) => store.setState({ creatures }),
  reorderNotes: (notes: Note[]) => store.setState({ notes }),
  reorderShops: (shops: Shop[]) => store.setState({ shops }),
  reorderCustomItems: (customItems: CustomItem[]) => store.setState({ customItems }),
  reorderLootTables: (lootTables: LootTable[]) => store.setState({ lootTables }),

  // Imports one section's data. Temp NPCs/creatures are never persisted, so they're dropped.
  importCollection: (key: CollectionKey, items: any[], mode: "merge" | "overwrite") => {
    const clean = key === "npcs" || key === "creatures" ? items.filter((i) => !i?.isTemp) : items;
    const current = store.getState()[key] as { id: string }[];
    store.setState({ [key]: mode === "overwrite" ? clean : mergeDedupe(current, clean) } as Partial<StoreState>);
  },

  updateUI: (updates: Partial<UIState>) => {
    store.setState({ uiState: { ...store.getState().uiState, ...updates } });
  },
  toggleCharacterCollapse: (id: string, force?: boolean) => {
    const ui = store.getState().uiState;
    const collapsed = ui.collapsedCharacters || [];
    const isCollapsed = collapsed.includes(id);
    
    if (force === true || (!force && !isCollapsed)) {
      if (!isCollapsed) actions.updateUI({ collapsedCharacters: [...collapsed, id] });
    } else {
      if (isCollapsed) actions.updateUI({ collapsedCharacters: collapsed.filter(x => x !== id) });
    }
  },
  /** Collapses or expands several cards at once (the "Colapsar todas" button). */
  setCharactersCollapsed: (ids: string[], collapse: boolean) => {
    const current = new Set(store.getState().uiState.collapsedCharacters || []);
    ids.forEach((id) => (collapse ? current.add(id) : current.delete(id)));
    actions.updateUI({ collapsedCharacters: [...current] });
  },
  
  // Quests
  addQuest: (q: Omit<Quest, "id" | "createdAt">) => {
    store.setState({ quests: [...store.getState().quests, { ...q, id: uuidv4(), createdAt: Date.now() }] });
  },
  updateQuest: (id: string, q: Partial<Quest>) => {
    store.setState({
      quests: store.getState().quests.map((x) => (x.id === id ? { ...x, ...q } : x)),
    });
  },
  deleteQuest: (id: string) => {
    store.setState({ 
      quests: store.getState().quests.map(q => q.parentId === id ? { ...q, parentId: null } : q).filter((x) => x.id !== id) 
    });
  },

  // Party & NPCs
  addPlayer: (p: Omit<Player, "id" | "type">) => {
    const id = uuidv4();
    store.setState({ players: [...store.getState().players, { ...p, id, type: "player" }] });
    return id;
  },
  updatePlayer: (id: string, p: Partial<Player>) => {
    store.setState({
      players: store.getState().players.map((x) => (x.id === id ? { ...x, ...p } : x)),
    });
  },
  deletePlayer: (id: string) => {
    const state = store.getState();
    store.setState({ 
      players: state.players.filter((x) => x.id !== id),
      combatants: state.combatants.filter((c) => c.characterId !== id),
      graveyard: state.graveyard.filter((c) => c.characterId !== id),
    });
  },
  addNPC: (n: Omit<NPC, "id" | "type">) => {
    const id = uuidv4();
    store.setState({ npcs: [...store.getState().npcs, { ...n, id, type: "npc" }] });
    return id;
  },
  updateNPC: (id: string, n: Partial<NPC>) => {
    store.setState({
      npcs: store.getState().npcs.map((x) => (x.id === id ? { ...x, ...n } : x)),
    });
  },
  deleteNPC: (id: string) => {
    const state = store.getState();
    store.setState({ 
      npcs: state.npcs.filter((x) => x.id !== id),
      combatants: state.combatants.filter((c) => c.characterId !== id),
      graveyard: state.graveyard.filter((c) => c.characterId !== id),
    });
  },
  addCreature: (c: Omit<Creature, "id" | "type">) => {
    const id = uuidv4();
    store.setState({ creatures: [...(store.getState().creatures || []), { ...c, id, type: "creature" }] });
    return id;
  },
  updateCreature: (id: string, c: Partial<Creature>) => {
    store.setState({
      creatures: (store.getState().creatures || []).map((x) => (x.id === id ? { ...x, ...c } : x)),
    });
  },
  deleteCreature: (id: string) => {
    const state = store.getState();
    store.setState({ 
      creatures: (state.creatures || []).filter((x) => x.id !== id),
      combatants: state.combatants.filter((c) => c.characterId !== id),
      graveyard: state.graveyard.filter((c) => c.characterId !== id),
    });
  },
  // Updates a character wherever it lives: players, npcs, creatures, or a temp combatant's tempData.
  updateCharacter: (char: Character, updates: Partial<Character>) => {
    if (char.type === "player") return actions.updatePlayer(char.id, updates as Partial<Player>);
    if (char.isTemp) {
      const state = store.getState();
      const patch = (list: Combatant[]) =>
        list.map((c) => (c.tempData && c.tempData.id === char.id ? { ...c, tempData: { ...c.tempData, ...updates } as Combatant["tempData"] } : c));
      return store.setState({ combatants: patch(state.combatants), graveyard: patch(state.graveyard) });
    }
    if (char.type === "npc") return actions.updateNPC(char.id, updates as Partial<NPC>);
    return actions.updateCreature(char.id, updates as Partial<Creature>);
  },
  /**
   * Sets the HP tracked on a card. A character that is in the initiative keeps the same HP there,
   * so damage taken in or out of combat is never lost.
   */
  setCharacterHp: (char: Character, hpCurrent: number, hpTemp: number) => {
    const hp = Math.max(0, Math.min(char.hpMax, Math.round(hpCurrent)));
    actions.updateCharacter(char, { hpCurrent: hp, hpTemp: Math.max(0, Math.round(hpTemp)) || undefined });
    if (char.type !== "player" && char.isTemp) return;
    const state = store.getState();
    if (state.combatants.some((c) => c.characterId === char.id && !c.isTemp)) {
      store.setState({ combatants: state.combatants.map((c) => (c.characterId === char.id && !c.isTemp ? { ...c, hpCurrent: hp } : c)) });
    }
  },
  getCharacter: (id: string): Character | undefined => {
    const state = store.getState();
    return state.players.find((p) => p.id === id) || state.npcs.find((n) => n.id === id) || (state.creatures || []).find((c) => c.id === id);
  },

  // Initiative
  addCombatant: (characterId: string, initiative: number) => {
    const state = store.getState();
    if (state.combatants.some(c => c.characterId === characterId)) return false;
    const char = actions.getCharacter(characterId);
    if (!char) return false;
    // Starts with the HP tracked on the card (full if it was never touched).
    const hpCurrent = Math.min(char.hpMax, char.hpCurrent ?? char.hpMax);
    store.setState({
      combatants: [
        ...state.combatants,
        { id: uuidv4(), characterId, initiative, hpCurrent, statuses: [] },
      ].sort((a, b) => b.initiative - a.initiative),
    });
    return true;
  },
  addTempCombatant: (npc: Omit<NPC, "id" | "type">, initiative: number, isEnemy: boolean = true) => {
    const state = store.getState();
    const id = uuidv4();
    const fullNpc = { ...npc, id, type: (isEnemy ? "creature" : "npc") as any };
    store.setState({
      combatants: [
        ...state.combatants,
        { id, characterId: id, initiative, hpCurrent: fullNpc.hpMax, statuses: [], isTemp: true, tempData: fullNpc },
      ].sort((a, b) => b.initiative - a.initiative),
    });
  },
  duplicateTempCombatant: (combatantId: string) => {
    const state = store.getState();
    const source = state.combatants.find((c) => c.id === combatantId);
    if (!source || !source.isTemp || !source.tempData) return;

    const newId = uuidv4();
    // Helper to generate a nice numbered or copied name
    const baseName = source.tempData.name.replace(/\s*\(\d+\)$/, "");
    // Count how many combatants with similar base name already exist
    const count = state.combatants.filter(
      (c) => c.tempData && c.tempData.name.replace(/\s*\(\d+\)$/, "") === baseName
    ).length;
    const newName = `${baseName} (${count + 1})`;

    const newTempData = {
      ...source.tempData,
      id: newId,
      name: newName,
    };

    const newCombatant: Combatant = {
      id: newId,
      characterId: newId,
      initiative: source.initiative,
      hpCurrent: newTempData.hpMax,
      statuses: [],
      isTemp: true,
      tempData: newTempData,
    };

    store.setState({
      combatants: [...state.combatants, newCombatant].sort((a, b) => b.initiative - a.initiative),
    });
  },
  updateCombatant: (id: string, updates: Partial<Combatant>) => {
    const state = store.getState();
    store.setState({
      combatants: state.combatants.map((c) => (c.id === id ? { ...c, ...updates } : c)).sort((a, b) => b.initiative - a.initiative),
    });
    // Saved characters carry their combat HP back to their card.
    const target = state.combatants.find((c) => c.id === id);
    if (updates.hpCurrent !== undefined && target && !target.isTemp) {
      const char = actions.getCharacter(target.characterId);
      if (char) actions.updateCharacter(char, { hpCurrent: Math.max(0, Math.min(char.hpMax, updates.hpCurrent)) });
    }
  },
  /** Damage taken in combat: temporary HP absorb it first, as on the card. */
  damageCombatant: (id: string, amount: number) => {
    const combatant = store.getState().combatants.find((c) => c.id === id);
    if (!combatant || amount <= 0) return;
    const char = combatant.isTemp && combatant.tempData ? combatant.tempData : actions.getCharacter(combatant.characterId);
    const temp = char?.hpTemp || 0;
    const absorbed = Math.min(temp, amount);
    if (char && absorbed) actions.updateCharacter(char, { hpTemp: temp - absorbed || undefined });
    actions.updateCombatant(id, { hpCurrent: Math.max(0, combatant.hpCurrent - (amount - absorbed)) });
  },
  killCombatant: (id: string) => {
    const state = store.getState();
    const cIndex = state.combatants.findIndex((x) => x.id === id);
    if (cIndex === -1) return;
    const c = state.combatants[cIndex];
    
    let nextActiveId = state.uiState.activeCombatantId;
    if (c.id === state.uiState.activeCombatantId) {
       if (state.combatants.length > 1) {
           const nextIndex = (cIndex + 1) % state.combatants.length;
           nextActiveId = state.combatants[nextIndex]?.id || null;
       } else {
           nextActiveId = null;
       }
    }

    store.setState({
      combatants: state.combatants.filter((x) => x.id !== id),
      graveyard: [...state.graveyard, c],
      uiState: { ...state.uiState, activeCombatantId: nextActiveId }
    });
  },
  reviveCombatant: (id: string) => {
    const state = store.getState();
    const c = state.graveyard.find((x) => x.id === id);
    if (!c) return;
    store.setState({
      graveyard: state.graveyard.filter((x) => x.id !== id),
      combatants: [...state.combatants, c].sort((a, b) => b.initiative - a.initiative),
    });
  },
  deleteFromGraveyard: (id: string) => {
    store.setState({
      graveyard: store.getState().graveyard.filter((x) => x.id !== id),
    });
  },

  // Maps
  importMaps: (importedMaps: MapData[]) => {
    const state = store.getState();
    const newMaps = importedMaps.map(m => ({ ...m, id: m.id || uuidv4() }));
    store.setState({ maps: [...state.maps, ...newMaps] });
  },
  addMap: (map: Omit<MapData, "id">) => {
    store.setState({ maps: [...store.getState().maps, { ...map, id: uuidv4() }] });
  },
  updateMap: (id: string, map: Partial<MapData>) => {
    store.setState({
      maps: store.getState().maps.map((m) => (m.id === id ? { ...m, ...map } : m)),
    });
  },
  deleteMap: (id: string) => {
    store.setState({ maps: store.getState().maps.filter((m) => m.id !== id) });
  },

  // Locations
  importLocations: (importedLocs: LocationData[]) => {
    const state = store.getState();
    const newLocs = importedLocs.map(l => ({ ...l, id: l.id || uuidv4() }));
    store.setState({ locations: [...(state.locations || []), ...newLocs] });
  },
  addLocation: (loc: Omit<LocationData, "id">) => {
    store.setState({ locations: [...(store.getState().locations || []), { ...loc, id: uuidv4() }] });
  },
  updateLocation: (id: string, loc: Partial<LocationData>) => {
    store.setState({
      locations: (store.getState().locations || []).map((l) => (l.id === id ? { ...l, ...loc } : l)),
    });
  },
  deleteLocation: (id: string) => {
    store.setState({ locations: (store.getState().locations || []).filter((l) => l.id !== id) });
  },

  // Shops
  addShop: (shop: Omit<Shop, "id" | "items">) => {
    store.setState({ shops: [...store.getState().shops, { ...shop, id: uuidv4(), items: [] }] });
  },
  updateShop: (id: string, shop: Omit<Shop, "id" | "items">) => {
    store.setState({
      shops: store.getState().shops.map((s) => (s.id === id ? { ...s, ...shop } : s)),
    });
  },
  deleteShop: (id: string) => {
    store.setState({ shops: store.getState().shops.filter((s) => s.id !== id) });
  },
  /**
   * Copies any shop as a new editable shop: right after the original, or first among the user's
   * shops (just after the fixed ones) when copying a fixed shop. Returns the copy's id.
   */
  duplicateShop: (shop: Shop) => {
    const id = uuidv4();
    const copy: Shop = { ...shop, id, name: `${shop.name} (copia)`, items: shop.items.map((it) => ({ ...it, id: uuidv4() })) };
    const next = [...store.getState().shops];
    next.splice(next.findIndex((s) => s.id === shop.id) + 1, 0, copy);
    store.setState({ shops: next });
    return id;
  },
  /** Hides or shows an item of a fixed shop (the eye button). */
  toggleBuiltinItemHidden: (itemId: string) => {
    const hidden = store.getState().uiState.hiddenBuiltinItems || [];
    actions.updateUI({ hiddenBuiltinItems: hidden.includes(itemId) ? hidden.filter((x) => x !== itemId) : [...hidden, itemId] });
  },
  addShopItem: (shopId: string, item: Omit<ShopItem, "id">) => {
    const state = store.getState();
    store.setState({
      shops: state.shops.map((s) =>
        s.id === shopId ? { ...s, items: [...s.items, { ...item, id: uuidv4() }] } : s
      ),
    });
  },
  updateShopItem: (shopId: string, itemId: string, item: Partial<ShopItem>) => {
    const state = store.getState();
    store.setState({
      shops: state.shops.map((s) =>
        s.id === shopId
          ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...item } : i)) }
          : s
      ),
    });
  },
  deleteShopItem: (shopId: string, itemId: string) => {
    const state = store.getState();
    store.setState({
      shops: state.shops.map((s) =>
        s.id === shopId
          ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
          : s
      ),
    });
  },

  // Notes
  addNote: (note: Omit<Note, "id">) => {
    const now = Date.now();
    const id = uuidv4();
    store.setState({ notes: [...(store.getState().notes || []), { ...note, id, createdAt: now, updatedAt: now }] });
    return id;
  },
  /** `touch` bumps updatedAt; off for things like pinning that shouldn't count as an edit. */
  updateNote: (id: string, note: Partial<Note>, touch = true) => {
    store.setState({
      notes: (store.getState().notes || []).map((n) => (n.id === id ? { ...n, ...note, ...(touch ? { updatedAt: Date.now() } : {}) } : n)),
    });
  },
  /** Inserts a copy right after the original and returns its id. */
  duplicateNote: (id: string) => {
    const notes = store.getState().notes || [];
    const i = notes.findIndex((n) => n.id === id);
    if (i < 0) return null;
    const now = Date.now();
    const copy = { ...notes[i], id: uuidv4(), title: notes[i].title ? `${notes[i].title} (copia)` : "", pinned: false, createdAt: now, updatedAt: now };
    store.setState({ notes: [...notes.slice(0, i + 1), copy, ...notes.slice(i + 1)] });
    return copy.id;
  },
  deleteNote: (id: string) => {
    store.setState({ notes: (store.getState().notes || []).filter((n) => n.id !== id) });
  },
  
  // Custom Items
  /** Adds a homebrew item and returns its new id. */
  addCustomItem: (item: Omit<CustomItem, "id">) => {
    const id = uuidv4();
    store.setState({ customItems: [...(store.getState().customItems || []), { ...item, id }] });
    return id;
  },
  updateCustomItem: (id: string, item: Partial<CustomItem>) => {
    store.setState({
      customItems: (store.getState().customItems || []).map((i) => (i.id === id ? { ...i, ...item } : i)),
    });
  },
  deleteCustomItem: (id: string) => {
    store.setState({ customItems: (store.getState().customItems || []).filter((i) => i.id !== id) });
  },

  // Loot Tables
  addLootTable: (table: Omit<LootTable, "id">) => {
    store.setState({ lootTables: [...(store.getState().lootTables || []), { ...table, id: uuidv4() }] });
  },
  updateLootTable: (id: string, table: Partial<LootTable>) => {
    store.setState({
      lootTables: (store.getState().lootTables || []).map((t) => (t.id === id ? { ...t, ...table } : t)),
    });
  },
  deleteLootTable: (id: string) => {
    store.setState({ lootTables: (store.getState().lootTables || []).filter((t) => t.id !== id) });
  },
};
