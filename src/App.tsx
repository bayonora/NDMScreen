/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { ViewParty } from "./views/ViewParty";
import { ViewInitiative } from "./views/ViewInitiative";
import { ViewMaps } from "./views/ViewMaps";
import { ViewShops } from "./views/ViewShops";
import { ViewNotes } from "./views/ViewNotes";
import { ViewQuests } from "./views/ViewQuests";
import { ViewItems } from "./views/ViewItems";
import { ViewGrimoire } from "./views/ViewGrimoire";
import { cn } from "./lib/utils";
import { Users, Swords, BookOpen, Map as MapIcon, Store as StoreIcon, Settings, Download, Upload, X, StickyNote, Backpack, Calculator, Target } from "lucide-react";
import { store, actions, useStore } from "./store/useStore";
import { AnimatePresence, motion } from "framer-motion";
import { CalculatorModal } from "./components/CalculatorModal";
import { DiceRollerModal, D20Icon } from "./components/DiceRollerModal";
import { WelcomeModal, FullTutorialModal } from "./components/Tutorial";
import { GlobalSearch } from "./components/GlobalSearch";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { Info } from "lucide-react";
import { TitleTorch } from "./components/TitleTorch";
import { ImportModal } from "./components/ImportModal";

type Tab = "party" | "initiative" | "quests" | "maps" | "shops" | "notes" | "items" | "spells";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("party");

  const { uiState } = useStore();
  const theme = uiState?.theme || 'clasico';
  React.useEffect(() => {
    console.log('Current theme:', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [showSettings, setShowSettings] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const unsubscribe = store.subscribe(() => {
      setSaveIndicator(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setSaveIndicator(false), 2000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPendingImport(content);
        setShowSettings(false);
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (pendingImport) {
      store.importData(pendingImport, mode);
      setPendingImport(null);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "party": return <ViewParty />;
      case "initiative": return <ViewInitiative />;
      case "quests": return <ViewQuests />;
      case "maps": return <ViewMaps />;
      case "shops": return <ViewShops />;
      case "notes": return <ViewNotes />;
      case "items": return <ViewItems />;
      case "spells": return <ViewGrimoire />;
      default: return null;
    }
  };

  return (
    <div 
      className="flex flex-col h-screen w-full text-dm-text overflow-hidden font-sans select-none"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--theme-bg-hover) 0%, var(--theme-bg-darker) 100%)', backgroundColor: 'var(--theme-bg-darker)' }}
    >
      <header className="flex flex-wrap justify-between items-center gap-y-3 px-4 sm:px-6 py-3 border-b border-dm-accent/10 bg-dm-bg-darker">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 border-2 border-dm-accent rotate-45 flex items-center justify-center shrink-0">
            <span className="-rotate-45 font-bold text-xl text-dm-accent font-display">DM</span>
          </div>
          <TitleTorch />
        </div>
        <div className="w-full sm:flex-1 flex justify-center sm:px-4 max-w-lg order-last sm:order-none"><GlobalSearch onNavigate={setActiveTab} /></div>
        <div className="flex items-center space-x-2">
          {saveIndicator && (
            <span className="text-[10px] text-dm-accent uppercase tracking-widest animate-in fade-in mr-2 opacity-70">
              Guardado
            </span>
          )}
          <button onClick={() => setShowCalculator(true)} className="text-dm-muted hover:text-dm-text transition-colors p-2"><Calculator size={20} /></button>
          <button onClick={() => setShowDiceRoller(true)} className="text-dm-muted hover:text-dm-text transition-colors p-2"><D20Icon size={20} /></button>
          <button onClick={() => setShowTutorial(true)} className="text-dm-muted hover:text-dm-text transition-colors p-2"><Info size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="text-dm-muted hover:text-dm-text transition-colors p-2"><Settings size={20} /></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 pb-24">
          {renderTab()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-dm-bg-darker border-t border-dm-accent/10 z-40 overflow-x-auto custom-scrollbar">
        <div className="flex justify-start sm:justify-center min-w-max">
          <NavButton active={activeTab === 'party'} onClick={() => setActiveTab('party')} label="Grupo" icon={Users} />
          <NavButton active={activeTab === 'initiative'} onClick={() => setActiveTab('initiative')} label="Iniciativa" icon={Swords} />
          <NavButton active={activeTab === 'quests'} onClick={() => setActiveTab('quests')} label="Misiones" icon={Target} />
          <NavButton active={activeTab === 'maps'} onClick={() => setActiveTab('maps')} label="Mapas" icon={MapIcon} />
          <NavButton active={activeTab === 'shops'} onClick={() => setActiveTab('shops')} label="Tiendas" icon={StoreIcon} />
          <NavButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} label="Notas" icon={StickyNote} />
          <NavButton active={activeTab === 'items'} onClick={() => setActiveTab('items')} label="Objetos" icon={Backpack} />
          <NavButton active={activeTab === 'spells'} onClick={() => setActiveTab('spells')} label="Grimorio" icon={BookOpen} />
        </div>
      </nav>

{/* Ajustes Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dm-bg border border-dm-border p-6 rounded-sm w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-dm-muted hover:text-dm-accent"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-6 font-light border-b border-dm-accent/10 pb-2">
              Ajustes de Interfaz
            </h2>
            <div className="flex flex-col space-y-4 mb-8">
              <label className="text-sm text-dm-muted tracking-wider uppercase">Tema de Color</label>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <button 
                  onClick={() => actions.updateUI({ theme: 'clasico' })}
                  className={cn("p-3 border transition-colors text-left flex items-center justify-between", theme === 'clasico' ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text")}
                >
                  <span>NELLIE</span>
                  <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-[#1e1a17] border border-[#3a302a]" /><div className="w-3 h-3 rounded-full bg-[#c1a063] border border-[#3a302a]" /></div>
                </button>
                <button 
                  onClick={() => actions.updateUI({ theme: 'direi' })}
                  className={cn("p-3 border transition-colors text-left flex items-center justify-between", theme === 'direi' ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text")}
                >
                  <span>DIREI</span>
                  <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-[#000000] border border-[#333333]" /><div className="w-3 h-3 rounded-full bg-[#ffffff] border border-[#333333]" /></div>
                </button>
                <button 
                  onClick={() => actions.updateUI({ theme: 'noche' })}
                  className={cn("p-3 border transition-colors text-left flex items-center justify-between", theme === 'noche' ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text")}
                >
                  <span>HEAVEN</span>
                  <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-[#0d1117] border border-[#30363d]" /><div className="w-3 h-3 rounded-full bg-[#79c0ff] border border-[#30363d]" /></div>
                </button>
                <button 
                  onClick={() => actions.updateUI({ theme: 'sangre' })}
                  className={cn("p-3 border transition-colors text-left flex items-center justify-between", theme === 'sangre' ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text")}
                >
                  <span>NAUTHIZ</span>
                  <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-[#1a0f0f] border border-[#3d1c1c]" /><div className="w-3 h-3 rounded-full bg-[#ff4d4d] border border-[#3d1c1c]" /></div>
                </button>
              </div>
            </div>

            <h2 className="text-xl text-dm-accent tracking-widest uppercase mb-6 font-light border-b border-dm-accent/10 pb-2">
              Ajustes de Datos
            </h2>

            <div className="flex flex-col space-y-4">
              <button
                onClick={() => { store.exportData(); setShowSettings(false); }}
                className="flex items-center justify-center space-x-3 w-full p-4 border border-dm-border hover:border-dm-accent hover:text-dm-accent transition-colors group"
              >
                <Upload size={20} className="text-dm-muted group-hover:text-dm-accent" />
                <span className="uppercase tracking-wider text-sm">Exportar Todo</span>
              </button>
              
              <button
                onClick={handleImportClick}
                className="flex items-center justify-center space-x-3 w-full p-4 border border-dm-border hover:border-dm-accent hover:text-dm-accent transition-colors group"
              >
                <Download size={20} className="text-dm-muted group-hover:text-dm-accent" />
                <span className="uppercase tracking-wider text-sm">Importar Datos</span>
              </button>
              <input 
                type="file" 
                accept=".json"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            <p className="text-xs text-center text-dm-muted mt-6 px-4">
              Al importar, podrás elegir entre fusionar con los datos actuales o sobrescribirlos por completo. Se recomienda exportar primero como copia de seguridad.
            </p>
          </div>
        </div>
      )}
      
      <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
      <DiceRollerModal isOpen={showDiceRoller} onClose={() => setShowDiceRoller(false)} />
      <WelcomeModal />
      <FullTutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      <ImportModal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onMerge={() => confirmImport("merge")}
        onOverwrite={() => confirmImport("overwrite")}
      />
    </div>
  );
}

function NavButton({
  active,
  onClick,
  label,
  icon: Icon
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 sm:px-8 py-3 flex flex-col items-center group relative",
        active ? "text-dm-accent" : "text-dm-muted hover:text-dm-accent"
      )}
    >
      <Icon 
        size={24}
        strokeWidth={active ? 2 : 1.5}
        className={cn(
          "mb-1 transition-all duration-300",
          active ? "drop-shadow-[0_0_8px_rgba(193,160,99,0.5)] scale-110" : ""
        )} 
      />
      <span 
        className={cn(
          "text-[10px] sm:text-xs uppercase tracking-widest transition-colors",
          active ? "" : ""
        )}
      >
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="navIndicator"
          className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-dm-accent shadow-[0_0_12px_#c1a063]"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
}

