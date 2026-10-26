/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import { cn } from "./lib/utils";
import { Users, Swords, BookOpen, Map as MapIcon, Store as StoreIcon, Settings, Download, Upload, StickyNote, Backpack, Calculator, Target, Info, LayoutGrid, Skull } from "lucide-react";
import { store, actions, useStore, Tab } from "./store/useStore";
import { motion } from "motion/react";
import { Modal } from "./components/ui/Modal";
import { CalculatorModal } from "./components/CalculatorModal";
import { DiceRollerModal, D20Icon } from "./components/DiceRollerModal";
import { WelcomeModal, FullTutorialModal } from "./components/Tutorial";
import { GlobalSearch } from "./components/GlobalSearch";
import { RollToastHost } from "./components/RollToasts";
import { ToastHost } from "./components/Toasts";
import { useSearchFocus } from "./lib/searchFocus";
import { emitTabReselect } from "./lib/tabReselect";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TitleTorch } from "./components/TitleTorch";
import { ImportModal } from "./components/ImportModal";
import { readFileAsText } from "./lib/utils";

// Each view is its own chunk, so the first load only downloads what's on screen.
const ViewParty = lazy(() => import("./views/ViewParty").then((m) => ({ default: m.ViewParty })));
const ViewInitiative = lazy(() => import("./views/ViewInitiative").then((m) => ({ default: m.ViewInitiative })));
const ViewQuests = lazy(() => import("./views/ViewQuests").then((m) => ({ default: m.ViewQuests })));
const ViewMaps = lazy(() => import("./views/ViewMaps").then((m) => ({ default: m.ViewMaps })));
const ViewShops = lazy(() => import("./views/ViewShops").then((m) => ({ default: m.ViewShops })));
const ViewNotes = lazy(() => import("./views/ViewNotes").then((m) => ({ default: m.ViewNotes })));
const ViewItems = lazy(() => import("./views/ViewItems").then((m) => ({ default: m.ViewItems })));
const ViewGrimoire = lazy(() => import("./views/ViewGrimoire").then((m) => ({ default: m.ViewGrimoire })));
const ViewBestiary = lazy(() => import("./views/ViewBestiary").then((m) => ({ default: m.ViewBestiary })));

const TABS: { id: Tab; label: string; icon: React.ElementType; view: React.ComponentType }[] = [
  { id: "party", label: "Grupo", icon: Users, view: ViewParty },
  { id: "initiative", label: "Iniciativa", icon: Swords, view: ViewInitiative },
  { id: "quests", label: "Misiones", icon: Target, view: ViewQuests },
  { id: "maps", label: "Mapas", icon: MapIcon, view: ViewMaps },
  { id: "shops", label: "Tiendas", icon: StoreIcon, view: ViewShops },
  { id: "notes", label: "Notas", icon: StickyNote, view: ViewNotes },
  { id: "items", label: "Objetos", icon: Backpack, view: ViewItems },
  { id: "spells", label: "Grimorio", icon: BookOpen, view: ViewGrimoire },
  { id: "bestiary", label: "Bestiario", icon: Skull, view: ViewBestiary },
];

/** Tabs that get their own slot in the phone nav bar; the rest live in the "Más" sheet. */
const PHONE_PRIMARY_TABS: Tab[] = ["party", "initiative", "maps", "spells"];

const THEMES = [
  { id: "clasico", label: "NELLIE", swatches: ["#1e1a17", "#c1a063"], ring: "#3a302a" },
  { id: "fiveseven", label: "FIVESEVEN", swatches: ["#000000", "#ffffff"], ring: "#333333" },
  { id: "noche", label: "HEAVEN", swatches: ["#0d1117", "#79c0ff"], ring: "#30363d" },
  { id: "sangre", label: "NAUTHIZ", swatches: ["#1a0f0f", "#ff4d4d"], ring: "#3d1c1c" },
];

export default function App() {
  const isHydrated = useStore((state) => state.isHydrated);
  const theme = useStore((state) => state.uiState.theme) || "clasico";
  const activeTab = useStore((state) => state.uiState.activeTab) || "party";
  const setActiveTab = (tab: Tab) => actions.updateUI({ activeTab: tab });
  // Nav buttons: pressing the current tab again takes its view back to the start (see tabReselect).
  const pressTab = (tab: Tab) => (tab === activeTab ? emitTabReselect(tab) : setActiveTab(tab));
  useSearchFocus();

  useEffect(() => {
    const root = document.documentElement;
    // Animate colors only while switching themes, instead of on every element all the time.
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", getComputedStyle(root).getPropertyValue("--theme-bg-darker").trim());
    const t = setTimeout(() => root.classList.remove("theme-transition"), 400);
    return () => clearTimeout(t);
  }, [theme]);

  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const content = await readFileAsText(file);
    if (content) {
      setPendingImport(content);
      setShowSettings(false);
    }
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (pendingImport) {
      store.importData(pendingImport, mode);
      setPendingImport(null);
    }
  };

  if (!isHydrated) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-dm-bg-darker">
        <div className="flex flex-col items-center gap-4 text-dm-accent">
          <div className="w-8 h-8 border-4 border-dm-accent border-t-transparent rounded-full animate-spin" />
          <p className="tracking-widest uppercase text-sm">Cargando Campaña...</p>
        </div>
      </div>
    );
  }

  const activeTabInfo = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveView = activeTabInfo.view;

  return (
    <div
      className="flex flex-col h-dvh w-full text-dm-text overflow-hidden font-sans select-none"
      style={{ backgroundImage: "radial-gradient(circle at 50% 50%, var(--theme-bg-hover) 0%, var(--theme-bg-darker) 100%)", backgroundColor: "var(--theme-bg-darker)" }}
    >
      {/* Phones: one slim row (logo · search icon · tools). From `sm` up: logo · search bar · tools. */}
      <header className="flex justify-between items-center gap-2 px-3 sm:px-6 py-1.5 sm:py-3 pt-[max(0.375rem,env(safe-area-inset-top))] border-b border-dm-accent/10 bg-dm-bg-darker">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-dm-accent rotate-45 flex items-center justify-center shrink-0 ml-1">
            <span className="-rotate-45 font-bold text-base sm:text-xl text-dm-accent font-display">DM</span>
          </div>
          <TitleTorch />
        </div>
        <div className="ml-auto sm:ml-0 sm:flex-1 flex justify-center sm:px-4 max-w-lg">
          <GlobalSearch onNavigate={setActiveTab} />
        </div>
        <div className="flex items-center sm:gap-1">
          {saveIndicator && (
            <span className="hidden sm:inline text-[10px] text-dm-accent uppercase tracking-widest animate-in fade-in mr-2 opacity-70">
              Guardado
            </span>
          )}
          <HeaderButton label="Calculadora" onClick={() => setShowCalculator(true)}><Calculator size={20} /></HeaderButton>
          <HeaderButton label="Lanzar dados" onClick={() => setShowDiceRoller(true)}><D20Icon size={20} /></HeaderButton>
          <HeaderButton label="Tutorial" onClick={() => setShowTutorial(true)} className="hidden sm:block"><Info size={20} /></HeaderButton>
          <HeaderButton label="Ajustes" onClick={() => setShowSettings(true)} className="hidden sm:block"><Settings size={20} /></HeaderButton>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <ErrorBoundary resetKey={activeTab}>
          <Suspense fallback={<ViewLoading />}>
            <ActiveView />
          </Suspense>
        </ErrorBoundary>
      </main>
      <RollToastHost />
      <ToastHost />

      <nav className="shrink-0 bg-dm-bg-darker border-t border-dm-accent/10 z-40 select-none pb-[env(safe-area-inset-bottom,0px)]">
        {/* Phones: the main tabs plus "Más", which opens a sheet with the rest and the tools. */}
        <div className="flex sm:hidden">
          {TABS.filter((t) => PHONE_PRIMARY_TABS.includes(t.id)).map((t) => (
            <NavButton key={t.id} active={activeTab === t.id} onClick={() => pressTab(t.id)} label={t.label} icon={t.icon} indicatorId="navIndicatorPhone" />
          ))}
          <NavButton
            indicatorId="navIndicatorPhone"
            active={!PHONE_PRIMARY_TABS.includes(activeTab)}
            onClick={() => setShowMore(true)}
            label={PHONE_PRIMARY_TABS.includes(activeTab) ? "Más" : activeTabInfo.label}
            icon={PHONE_PRIMARY_TABS.includes(activeTab) ? LayoutGrid : activeTabInfo.icon}
            badge={!PHONE_PRIMARY_TABS.includes(activeTab)}
          />
        </div>
        <div className="hidden sm:flex max-w-5xl mx-auto">
          {TABS.map((t) => (
            <NavButton key={t.id} active={activeTab === t.id} onClick={() => pressTab(t.id)} label={t.label} icon={t.icon} />
          ))}
        </div>
      </nav>

      <Modal isOpen={showMore} onClose={() => setShowMore(false)} title="Más">
        <div className="grid grid-cols-4 gap-2 mb-5">
          {TABS.filter((t) => !PHONE_PRIMARY_TABS.includes(t.id)).map((t) => (
            <MoreTile
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={activeTab === t.id}
              onClick={() => { pressTab(t.id); setShowMore(false); }}
            />
          ))}
        </div>
        <h3 className="text-[10px] text-dm-muted tracking-widest uppercase mb-2">Herramientas</h3>
        <div className="grid grid-cols-3 gap-2">
          <MoreTile icon={Calculator} label="Calculadora" onClick={() => { setShowMore(false); setShowCalculator(true); }} />
          <MoreTile icon={Info} label="Tutorial" onClick={() => { setShowMore(false); setShowTutorial(true); }} />
          <MoreTile icon={Settings} label="Ajustes" onClick={() => { setShowMore(false); setShowSettings(true); }} />
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Ajustes" className="sm:max-w-md">
        <h3 className="text-sm text-dm-muted tracking-wider uppercase mb-3">Tema de Color</h3>
        <div className="grid grid-cols-1 gap-2 text-sm mb-8">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => actions.updateUI({ theme: t.id })}
              className={cn(
                "p-3 border transition-colors text-left flex items-center justify-between",
                theme === t.id ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text"
              )}
            >
              <span>{t.label}</span>
              <span className="flex gap-1">
                {t.swatches.map((c) => (
                  <span key={c} className="w-3 h-3 rounded-full border" style={{ backgroundColor: c, borderColor: t.ring }} />
                ))}
              </span>
            </button>
          ))}
        </div>

        <h3 className="text-sm text-dm-muted tracking-wider uppercase mb-3">Datos</h3>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { store.exportData(); setShowSettings(false); }}
            className="flex items-center justify-center space-x-3 w-full p-4 border border-dm-border hover:border-dm-accent hover:text-dm-accent transition-colors group"
          >
            <Upload size={20} className="text-dm-muted group-hover:text-dm-accent" />
            <span className="uppercase tracking-wider text-sm">Exportar Todo</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-3 w-full p-4 border border-dm-border hover:border-dm-accent hover:text-dm-accent transition-colors group"
          >
            <Download size={20} className="text-dm-muted group-hover:text-dm-accent" />
            <span className="uppercase tracking-wider text-sm">Importar Datos</span>
          </button>
          <input type="file" accept=".json,application/json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
        <p className="text-xs text-center text-dm-muted mt-6 px-4">
          Al importar, podrás elegir entre fusionar con los datos actuales o sobrescribirlos por completo. Se recomienda exportar primero como copia de seguridad.
        </p>
      </Modal>

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

function ViewLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-dm-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function HeaderButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cn("text-dm-muted hover:text-dm-text active:text-dm-accent transition-colors p-2.5 sm:p-2", className)}>
      {children}
    </button>
  );
}

function MoreTile({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-4 px-1 border rounded-lg transition-colors active:scale-95",
        active ? "border-dm-accent bg-dm-accent/10 text-dm-accent" : "border-dm-border bg-dm-bg-alt/60 text-dm-text hover:border-dm-accent hover:text-dm-accent"
      )}
    >
      <Icon size={24} strokeWidth={1.5} />
      <span className="text-xs tracking-wide truncate max-w-full">{label}</span>
    </button>
  );
}

function NavButton({ active, onClick, label, icon: Icon, badge, indicatorId = "navIndicator" }: { active: boolean; onClick: () => void; label: string; icon: React.ElementType; badge?: boolean; indicatorId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex-1 min-w-0 px-0.5 pt-2.5 pb-2 sm:py-3 flex flex-col items-center relative",
        active ? "text-dm-accent" : "text-dm-muted hover:text-dm-accent"
      )}
    >
      <span className="relative">
        <Icon
          size={22}
          strokeWidth={active ? 2 : 1.5}
          className={cn("mb-1 transition-transform duration-300", active && "drop-shadow-[0_0_8px_var(--theme-glow)] scale-110")}
        />
        {badge && <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-dm-accent" aria-hidden />}
      </span>
      <span className="max-w-full truncate text-[11px] sm:text-[10px] md:text-xs sm:uppercase tracking-normal sm:tracking-widest">
        {label}
      </span>
      {active && (
        <motion.div
          layoutId={indicatorId}
          className="absolute bottom-0 left-[15%] right-[15%] h-[2px] bg-dm-accent shadow-[0_0_12px_var(--theme-accent)]"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
}
