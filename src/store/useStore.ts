import { useState, useEffect } from "react";
import { Player, NPC, Creature, Character, Combatant, MapData, LocationData, Shop, ShopItem, Note, CustomItem, LootTable, Quest } from "../types";
import { v4 as uuidv4 } from "uuid";


type UIState = {
  combatActive: boolean;
  activeCombatantId: string | null;
  round: number;
  editingNoteId: string | "new" | null;
  draftNote: Partial<Note> | null;
  hasSeenWelcome?: boolean;
  partyTab?: "players" | "npcs" | "creatures";
  highlightedQuestId?: string;
  highlightedSpellId?: string;
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
  uiState: UIState;
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
  uiState: {
    combatActive: false,
    activeCombatantId: null,
    round: 1,
    editingNoteId: null,
    hasSeenWelcome: false,
    draftNote: null,
  }
};

const STORE_KEY = "dnd_dm_screen_data";

class Store {
  state: StoreState;
  listeners: Set<() => void> = new Set();

  constructor() {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.state = { ...DEFAULT_STATE, ...parsed };
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
      } catch {
        this.state = DEFAULT_STATE;
      }
    } else {
      this.state = DEFAULT_STATE;
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getState() {
    return this.state;
  }

  setState(newState: Partial<StoreState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((l) => l());
    this.save();
  }

  save() {
    try {
      const stateToSave = {
        ...this.state,
        npcs: this.state.npcs.filter((n: any) => !n.isTemp)
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save to localStorage. It might be full.", e);
      alert("Error al guardar: La memoria del navegador está llena. Reduce el tamaño de las imágenes.");
    }
  }

  exportData() {
    const stateToExport = { ...this.state, npcs: this.state.npcs.filter((n: any) => !n.isTemp), creatures: (this.state.creatures || []).filter((c: any) => !c.isTemp) };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ndms_datos_completos.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  importData(jsonString: string, mode: "merge" | "overwrite" = "overwrite") {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) || (parsed.players && parsed.npcs && !parsed.uiState)) {
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
          favoriteSpells: Array.isArray(parsed.favoriteSpells) ? parsed.favoriteSpells : []
        });
      }
 else {
        const state = this.getState();
        this.setState({
          ...parsed,
          players: [...(state.players || []), ...(Array.isArray(parsed.players) ? parsed.players : [])],
          npcs: [...(state.npcs || []), ...(Array.isArray(parsed.npcs) ? parsed.npcs : [])],
          creatures: [...(state.creatures || []), ...(Array.isArray(parsed.creatures) ? parsed.creatures : [])],
          combatants: [...(state.combatants || []), ...(Array.isArray(parsed.combatants) ? parsed.combatants : [])],
          graveyard: [...(state.graveyard || []), ...(Array.isArray(parsed.graveyard) ? parsed.graveyard : [])],
          maps: [...(state.maps || []), ...(Array.isArray(parsed.maps) ? parsed.maps : [])],
          locations: [...(state.locations || []), ...(Array.isArray(parsed.locations) ? parsed.locations : [])],
          shops: [...(state.shops || []), ...(Array.isArray(parsed.shops) ? parsed.shops : [])],
          notes: [...(state.notes || []), ...(Array.isArray(parsed.notes) ? parsed.notes : [])],
          customItems: [...(state.customItems || []), ...(Array.isArray(parsed.customItems) ? parsed.customItems : [])],
          lootTables: [...(state.lootTables || []), ...(Array.isArray(parsed.lootTables) ? parsed.lootTables : [])],
          quests: [...(state.quests || []), ...(Array.isArray(parsed.quests) ? parsed.quests : [])],
          favoriteSpells: Array.from(new Set([...(state.favoriteSpells || []), ...(Array.isArray(parsed.favoriteSpells) ? parsed.favoriteSpells : [])])),
        });
      }
      alert("Datos importados correctamente.");
    } catch (e) {
      alert("Error al importar: Archivo no válido.");
    }
  }
}

export const store = new Store();

export function useStore<T = StoreState>(selector: (state: StoreState) => T = (state: StoreState) => state as unknown as T): T {
  const [state, setState] = useState(() => selector(store.getState()));

  useEffect(() => {
    let currentState = selector(store.getState());
    const unsubscribe = store.subscribe(() => {
      const nextState = selector(store.getState());
      if (currentState !== nextState) {
        currentState = nextState;
        setState(nextState);
      }
    });
    // Check in case state changed between render and effect
    const nextState = selector(store.getState());
    if (currentState !== nextState) {
      currentState = nextState;
      setState(nextState);
    }
    return unsubscribe;
  }, []); // Not using selector in deps to avoid infinite loops if selector is passed inline, we assume it's stable or we can rely on fast equality.

  return state;
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
  // Reorder Actions
  reorderPlayers: (players: Player[]) => store.setState({ players }),
  reorderNPCs: (npcs: NPC[]) => store.setState({ npcs }),
  reorderCreatures: (creatures: Creature[]) => store.setState({ creatures }),
  reorderNotes: (notes: Note[]) => store.setState({ notes }),
  reorderShops: (shops: Shop[]) => store.setState({ shops }),
  reorderCustomItems: (customItems: CustomItem[]) => store.setState({ customItems }),
  reorderLootTables: (lootTables: LootTable[]) => store.setState({ lootTables }),

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
    store.setState({ players: [...store.getState().players, { ...p, id: uuidv4(), type: "player" }] });
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
    store.setState({ npcs: [...store.getState().npcs, { ...n, id: uuidv4(), type: "npc" }] });
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
    store.setState({ creatures: [...(store.getState().creatures || []), { ...c, id: uuidv4(), type: "creature" }] });
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
  getCharacter: (id: string): Character | undefined => {
    const state = store.getState();
    return state.players.find((p) => p.id === id) || state.npcs.find((n) => n.id === id) || (state.creatures || []).find((c) => c.id === id);
  },

  // Initiative
  addCombatant: (characterId: string, initiative: number) => {
    const state = store.getState();
    if (state.combatants.some(c => c.characterId === characterId)) {
      alert("Este personaje ya está en la iniciativa.");
      return;
    }
    const char = actions.getCharacter(characterId);
    if (!char) return;
    store.setState({
      combatants: [
        ...state.combatants,
        { id: uuidv4(), characterId, initiative, hpCurrent: char.hpMax, statuses: [] },
      ].sort((a, b) => b.initiative - a.initiative),
    });
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
  updateCombatant: (id: string, updates: Partial<Combatant>) => {
    store.setState({
      combatants: store.getState().combatants.map((c) => (c.id === id ? { ...c, ...updates } : c)).sort((a, b) => b.initiative - a.initiative),
    });
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
    store.setState({ notes: [...(store.getState().notes || []), { ...note, id: uuidv4() }] });
  },
  updateNote: (id: string, note: Partial<Note>) => {
    store.setState({
      notes: (store.getState().notes || []).map((n) => (n.id === id ? { ...n, ...note } : n)),
    });
  },
  deleteNote: (id: string) => {
    store.setState({ notes: (store.getState().notes || []).filter((n) => n.id !== id) });
  },
  
  // Custom Items
  addCustomItem: (item: Omit<CustomItem, "id">) => {
    store.setState({ customItems: [...(store.getState().customItems || []), { ...item, id: uuidv4() }] });
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
