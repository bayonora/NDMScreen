import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, BookOpen, Users, Swords, Sparkles, Target, Map as MapIcon, Store as StoreIcon, StickyNote, Package, User, ExternalLink, Skull } from "lucide-react";
import { Modal } from "./ui/Modal";
import { StatBlock } from "./StatBlock";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useStore, actions } from "../store/useStore";
import { useSpellStore } from "../store/useSpellStore";
import { cn, normalizeSearchText } from "../lib/utils";
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
import { motion, AnimatePresence } from "framer-motion";

type Tab = "party" | "initiative" | "quests" | "maps" | "shops" | "notes" | "items" | "spells";

interface SearchResult {
  id: string;
  type: string;
  label: string;
  subLabel?: string;
  tab: Tab;
  score: number;
  icon: React.ReactNode;
  action?: () => void;
}

export function GlobalSearch({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const storeState = useStore();
  const { spells, fetchSpells } = useSpellStore();

  useEffect(() => {
    fetchSpells();
  }, [fetchSpells]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          setIsOpen(true);
          document.getElementById('global-search-input')?.focus();
        }
        return;
      }
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, query]);

  const scoreString = (q: string, text: string) => {
    if (!text || !q) return 0;
    const t = normalizeSearchText(text);
    
    // Direct matches
    if (t === q) return 100;
    if (t.startsWith(q)) return 50;
    if (t.includes(q)) return 10;
    
    // Only apply loose subsequence fuzzy match to short strings (like names)
    if (t.length < 60) {
      let qIdx = 0;
      for (let i = 0; i < t.length; i++) {
        if (t[i] === q[qIdx]) {
          qIdx++;
          if (qIdx === q.length) {
             return 5;
          }
        }
      }
    }
    return 0;
  };

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = normalizeSearchText(query).trim();
    let res: SearchResult[] = [];

    // Search Players
    storeState.players.forEach(p => {
      const score = Math.max(scoreString(q, p.name), scoreString(q, p.classAndLevel), scoreString(q, p.race));
      if (score > 0) res.push({ id: p.id, type: "Jugador", label: p.name, subLabel: `${p.race} - ${p.classAndLevel}`, tab: "party", score, icon: <User size={16} />, action: () => actions.updateUI({ partyTab: "players" }) });
    });

    // Search NPCs
    storeState.npcs.forEach(n => {
      const score = Math.max(scoreString(q, n.name), scoreString(q, n.type || ""), scoreString(q, n.cr || ""));
      if (score > 0) res.push({ id: n.id, type: "NPC", label: n.name, subLabel: n.type, tab: "party", score, icon: <Users size={16} />, action: () => actions.updateUI({ partyTab: "npcs" }) });
    });

    // Search Creatures
    (storeState.creatures || []).forEach(c => {
      const score = Math.max(scoreString(q, c.name), scoreString(q, c.type || ""), scoreString(q, c.cr || ""));
      if (score > 0) res.push({ id: c.id, type: "Criatura", label: c.name, subLabel: c.type, tab: "party", score, icon: <Skull size={16} />, action: () => actions.updateUI({ partyTab: "creatures" }) });
    });

    // Search Quests
    storeState.quests.forEach(qu => {
      const score = Math.max(scoreString(q, qu.title), scoreString(q, qu.description));
      if (score > 0) res.push({ id: qu.id, type: "Misión", label: qu.title, subLabel: qu.description, tab: "quests", score, icon: <Target size={16} /> });
    });

    // Search Maps
    storeState.maps.forEach(m => {
      const score = scoreString(q, m.name);
      if (score > 0) res.push({ id: m.id, type: "Mapa", label: m.name, tab: "maps", score, icon: <MapIcon size={16} /> });
    });

    // Search Locations
    storeState.locations.forEach(l => {
      const score = Math.max(scoreString(q, l.name), scoreString(q, l.description), scoreString(q, l.region || ""));
      if (score > 0) res.push({ id: l.id, type: "Lugar", label: l.name, subLabel: l.region, tab: "maps", score, icon: <MapIcon size={16} /> });
    });

    // Search Shops
    storeState.shops.forEach(s => {
      const score = Math.max(scoreString(q, s.name), scoreString(q, s.ownerName));
      if (score > 0) res.push({ id: s.id, type: "Tienda", label: s.name, subLabel: s.ownerName, tab: "shops", score, icon: <StoreIcon size={16} /> });
    });

    // Search Notes
    storeState.notes.forEach(n => {
      const score = Math.max(scoreString(q, n.title), scoreString(q, n.content));
      if (score > 0) res.push({ 
        id: n.id, 
        type: "Nota", 
        label: n.title, 
        tab: "notes", 
        score, 
        icon: <StickyNote size={16} />,
        action: () => actions.updateUI({ editingNoteId: n.id }) 
      });
    });

    // Search Items
    storeState.customItems.forEach(ci => {
      const score = Math.max(scoreString(q, ci.name), scoreString(q, ci.description || ""));
      if (score > 0) res.push({ id: ci.id, type: "Objeto", label: ci.name, subLabel: "Objeto Personalizado", tab: "items", score, icon: <Package size={16} /> });
    });

    // Search Spells
    spells.forEach(s => {
      // Búsqueda ESTRICTA para hechizos según petición: nombre exacto o palabra exacta
      let score = 0;
      const t = normalizeSearchText(s.name);
      
      if (t === q) {
        score = 100; // Coincidencia exacta de todo el nombre
      } else {
        const words = t.split(/\s+/);
        if (words.includes(q)) {
          score = 80; // Coincidencia exacta de una de sus palabras (ej: buscar "fuego" encuentra "Bola de fuego")
        } else if (q.includes(" ") && t.includes(q)) {
          score = 60; // Si el usuario escribe varias palabras incompletas (ej: "bola de"), lo permitimos si está en el título
        } else if (q.length > 3 && t.startsWith(q)) {
          // Extra opcional para que no parezca que la búsqueda está "rota" si escribe "armadur..."
          score = 30;
        }
      }

      if (score > 0) res.push({ id: s.index, type: "Conjuro", label: s.name, subLabel: s.level === 0 ? "Truco" : `Nivel ${s.level}`, tab: "spells", score, icon: <BookOpen size={16} /> });
    });

    return res.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [query, storeState, spells]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelect = (res: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    
    if (res.tab === "quests" || res.tab === "shops") {
      if (res.tab === "quests") actions.updateUI({ highlightedQuestId: res.id });
      if (res.action) res.action();
      onNavigate(res.tab);
    } else {
      setPreviewResult(res);
    }
  };
  
  const handleNavigate = (e: React.MouseEvent, res: SearchResult) => {
    e.stopPropagation();
    if (res.action) res.action();
    onNavigate(res.tab);
    setIsOpen(false);
    setQuery("");
    setPreviewResult(null);
  };


  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-[#8b7355]" />
        </div>
        <input
          id="global-search-input"
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-[#3a302a] rounded-md leading-5 bg-[#14110f] text-[#e6e2da] placeholder-[#8b7355] focus:outline-none focus:ring-1 focus:ring-[#c1a063] focus:border-[#c1a063] sm:text-sm transition-colors"
          placeholder="Buscar personajes, notas, mapas... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full bg-[#1e1a17] shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm border border-[#3a302a]"
          >
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[#8b7355] text-center">
                No se encontraron resultados para "{query}"
              </div>
            ) : (
              <ul className="custom-scrollbar">
                {results.map((res, idx) => (
                  <li
                    key={`${res.type}-${res.id}`}
                    onClick={() => handleSelect(res)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "cursor-pointer select-none relative py-2 pl-3 pr-9 border-l-2 transition-colors",
                      selectedIndex === idx
                        ? "bg-[#14110f] border-[#c1a063] text-white"
                        : "border-transparent text-[#e6e2da] hover:bg-[#1a1614] hover:border-[#8b7355]"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 truncate">
                          <div className={cn("shrink-0", selectedIndex === idx ? "text-[#c1a063]" : "text-[#8b7355]")}>
                            {res.icon}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-medium truncate">{res.label}</span>
                            {(res.subLabel || res.type) && (
                              <span className="text-xs text-[#8b7355] truncate flex gap-2 mt-0.5">
                                <span className="px-1.5 rounded-sm bg-[#14110f] border border-[#3a302a] text-[10px] uppercase tracking-wider shrink-0">{res.type}</span>
                                <span className="truncate opacity-80">{res.subLabel}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleNavigate(e, res)}
                          className={cn(
                            "shrink-0 p-2 rounded-sm border transition-colors flex items-center justify-center ml-2",
                            selectedIndex === idx ? "bg-[#14110f] border-[#c1a063] text-[#c1a063] hover:bg-[#2a2420]" : "border-transparent text-[#8b7355] hover:text-[#c1a063] hover:border-[#3a302a]"
                          )}
                          title="Ir a la pestaña"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREVIEW BACKDROP */}
      <AnimatePresence>
      {previewResult && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setPreviewResult(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] overflow-y-auto custom-scrollbar">
            {(() => {
              const res = previewResult;
              if (res.tab === "party") {
                 const p = storeState.players.find(x => x.id === res.id);
                 const n = storeState.npcs.find(x => x.id === res.id);
                 const c = storeState.creatures?.find(x => x.id === res.id);
                 const char = p || n || c;
                 if (char) return <StatBlock character={char} hideCollapse={true} />;
              }
              if (res.tab === "notes") {
                 const n = storeState.notes.find(x => x.id === res.id);
                 if (n) return (
                    <div className="bg-[#1e1a17]/60 backdrop-blur-xl border border-[#c1a063]/20 rounded-xl p-6 max-w-2xl w-full shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
                      <h2 className="text-2xl font-bold text-[#c1a063] mb-4">{n.title}</h2>
                      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-[#c1a063] prose-a:text-orange-400">
                        <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{n.content}</Markdown>
                      </div>
                    </div>
                 );
              }
              if (res.tab === "maps") {
                 const m = storeState.maps.find(x => x.id === res.id);
                 if (m) return <img src={m.image} alt={m.name} className="max-w-4xl max-h-[80vh] object-contain rounded-sm border border-[#3a302a] shadow-2xl" />;
                 const loc = storeState.locations.find(x => x.id === res.id);
                 if (loc) return (
                   <div className="bg-[#1e1a17] border border-[#3a302a] rounded-sm p-6 max-w-md w-full shadow-2xl text-[#e6e2da] space-y-2">
                     <h2 className="text-xl font-bold text-[#c1a063]">{loc.name}</h2>
                     <div className="text-sm italic opacity-70">Región: {loc.region}</div>
                     <p className="text-sm">{loc.description}</p>
                   </div>
                 );
              }
              if (res.tab === "shops") {
                 const s = storeState.shops.find(x => x.id === res.id);
                 if (s) return (
                   <div className="bg-[#1e1a17] border border-[#3a302a] rounded-sm p-6 max-w-md w-full shadow-2xl text-[#e6e2da] space-y-2">
                     <h2 className="text-xl font-bold text-[#c1a063]">{s.name}</h2>
                     <div className="text-sm italic opacity-70">Tendero: {s.ownerName}</div>
                     {s.ownerImage && <img src={s.ownerImage} alt={s.ownerName} className="w-full rounded-sm my-2" />}
                     <p className="text-sm">Objetos en venta: {s.items?.length || 0}</p>
                   </div>
                 );
              }
              if (res.tab === "items") {
                 const i = storeState.customItems.find(x => x.id === res.id);
                 if (i) return (
                   <div className="bg-[#1e1a17] border border-[#3a302a] rounded-sm p-6 max-w-sm w-full shadow-2xl text-[#e6e2da] space-y-2">
                     <h2 className="text-xl font-bold text-[#c1a063]">{i.name}</h2>
                     <div className="text-[#c1a063] font-bold text-lg">{i.value}</div>
                     <p className="text-sm whitespace-pre-wrap">{i.description}</p>
                     {i.image && <img src={i.image} alt={i.name} className="w-full rounded-sm my-2" />}
                   </div>
                 );
              }
              if (res.tab === "spells") {
                 const s = spells.find(x => x.index === res.id);
                 if (s) return (
                   <div className="bg-[#1e1a17] border border-[#3a302a] rounded-sm p-6 max-w-2xl w-full shadow-2xl text-[#e6e2da] space-y-4">
                     <h2 className="text-2xl font-bold text-[#c1a063] flex items-center gap-2"><Sparkles /> {s.name}</h2>
                     <div className="flex flex-wrap gap-4 text-sm text-[#8b7355] border-y border-[#3a302a] py-3">
                       <span><strong>Nivel:</strong> {s.level === 0 ? "Truco" : s.level}</span>
                       <span><strong>Escuela:</strong> {s.school?.index ? SCHOOL_NAMES[s.school.index] : (s.school?.name || "Sin escuela")}</span>
                       <span><strong>Tiempo:</strong> {s.casting_time}</span>
                       <span><strong>Duración:</strong> {s.duration}</span>
                       <span><strong>Rango:</strong> {s.range}</span>
                       <span><strong>Componentes:</strong> {s.components?.join(", ") || ""}</span>
                     </div>
                     <div className="text-sm leading-relaxed max-h-64 overflow-y-auto custom-scrollbar pr-2 space-y-2 prose prose-invert prose-sm max-w-none prose-strong:text-[#c1a063]">
                       <Markdown>{s.desc?.join('\n\n') || ""}</Markdown>
                       {s.higher_level && s.higher_level.length > 0 && (
                         <div className="mt-4">
                           <strong className="text-[#c1a063]">A niveles superiores: </strong>
                           <Markdown>{s.higher_level.join('\n\n')}</Markdown>
                         </div>
                       )}
                     </div>
                     <div className="flex justify-end pt-4">
                       <button onClick={() => {
                          actions.updateUI({ highlightedSpellId: s.index });
                          onNavigate("spells");
                          setPreviewResult(null);
                          setIsOpen(false);
                          setQuery("");
                       }} className="px-4 py-2 bg-[#c1a063] text-[#14110f] font-semibold rounded-sm hover:bg-[#d4b881] transition-colors flex items-center gap-2">
                         <BookOpen size={16} /> Ir al Grimorio
                       </button>
                     </div>
                   </div>
                 );
              }
              return <div className="bg-[#1e1a17] p-6 rounded-sm text-[#e6e2da]">{res.subLabel || "No hay más detalles."}</div>;
            })()}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

