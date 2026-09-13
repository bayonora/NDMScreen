import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from './ui/Modal';
import { cn } from '../lib/utils';
import { RotateCcw, Trash2 } from 'lucide-react';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

export const D20Icon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 10 12 22 22 10 12 2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="12" y1="22" x2="7" y2="10" />
    <line x1="12" y1="22" x2="17" y2="10" />
  </svg>
);

interface RollRecord {
  id: string;
  die: number;
  quantity: number;
  results: number[];
  total: number;
  timestamp: Date;
}

export function DiceRollerModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [selectedDie, setSelectedDie] = useState<number>(20);
  const [quantity, setQuantity] = useState<number>(1);
  const [customDie, setCustomDie] = useState<number | "">("");
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<RollRecord[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setIsRolling(false);
    }
  }, [isOpen]);

  const handleRoll = () => {
    if (quantity < 1 || isRolling) return;
    setIsRolling(true);
    
    setTimeout(() => {
      const results = Array.from({ length: quantity }, () => Math.floor(Math.random() * selectedDie) + 1);
      const total = results.reduce((a, b) => a + b, 0);
      
      const newRecord: RollRecord = {
        id: Math.random().toString(36).substring(7),
        die: selectedDie,
        quantity,
        results,
        total,
        timestamp: new Date()
      };
      
      setHistory(prev => [newRecord, ...prev].slice(0, 4));
      setIsRolling(false);
    }, 600);
  };

  const clearHistory = () => setHistory([]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lanzador de Dados">
      <div className="flex flex-col md:flex-row gap-8 h-[450px] w-full">
        
        {/* Left Column: Controls */}
        <div className="flex-1 flex flex-col gap-8">
          
          {/* Die Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-dm-accent uppercase tracking-widest text-center">
              Selecciona el Dado
            </label>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4">
              {DICE_TYPES.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDie(d)}
                  className={cn(
                    "h-14 rounded-sm border font-bold text-lg flex flex-col items-center justify-center transition-all",
                    selectedDie === d 
                      ? "bg-dm-accent text-dm-bg-darker border-dm-accent shadow-[0_0_15px_rgba(193,160,99,0.4)] scale-105" 
                      : "bg-dm-bg-alt border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent"
                  )}
                >
                  <span>d{d}</span>
                </button>
              ))}
              <div
                className={cn(
                  "h-14 rounded-sm border font-bold text-lg flex items-center justify-center transition-all px-1 cursor-text overflow-hidden",
                  selectedDie === customDie && String(customDie) !== ""
                    ? "bg-dm-accent text-dm-bg-darker border-dm-accent shadow-[0_0_15px_rgba(193,160,99,0.4)] scale-105" 
                    : "bg-dm-bg border-dashed border-dm-border text-dm-muted focus-within:border-solid focus-within:border-dm-accent focus-within:text-dm-accent shadow-inner"
                )}
                onClick={() => {
                   if (customDie) setSelectedDie(customDie as number);
                }}
              >
                <span className="opacity-70">d</span>
                <input
                  type="number"
                  min="2"
                  max="999"
                  value={customDie}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : "";
                    setCustomDie(val);
                    if (val) setSelectedDie(val);
                  }}
                  className="w-full bg-transparent outline-none text-center font-bold text-inherit placeholder:opacity-0 placeholder:text-inherit -ml-1 pl-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder=""
                />
              </div>
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="flex flex-col gap-3 items-center">
            <label className="text-xs font-bold text-dm-accent uppercase tracking-widest">
              Cantidad
            </label>
            <div className="flex items-center gap-6 bg-dm-bg-alt border border-dm-border rounded-full p-2 px-4 shadow-inner w-full max-w-[200px] justify-between">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-dm-muted hover:text-dm-accent hover:bg-dm-bg rounded-full transition-colors font-bold text-xl"
              >
                -
              </button>
              <span className="text-3xl font-display font-bold text-dm-text w-12 text-center">
                {quantity}
              </span>
              <button 
                type="button"
                onClick={() => setQuantity(Math.min(12, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center text-dm-muted hover:text-dm-accent hover:bg-dm-bg rounded-full transition-colors font-bold text-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center mt-auto pt-4">
            <button 
              type="button"
              onClick={handleRoll}
              disabled={isRolling}
              className={cn(
                "w-full py-4 rounded-sm font-bold uppercase tracking-widest text-xl transition-all border flex items-center justify-center gap-3",
                isRolling 
                  ? "bg-dm-bg-alt text-dm-muted border-dm-border cursor-not-allowed" 
                  : "bg-dm-accent text-dm-bg-darker border-dm-accent hover:bg-dm-accent-hover shadow-[0_0_15px_rgba(193,160,99,0.3)] hover:shadow-[0_0_20px_rgba(193,160,99,0.5)]"
              )}
            >
              {isRolling ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                >
                  <RotateCcw size={24} />
                </motion.div>
              ) : (
                <D20Icon size={24} />
              )}
              {isRolling ? "Rodando..." : `¡Lanzar ${quantity}d${selectedDie}!`}
            </button>
          </div>

        </div>

        {/* Right Column: History & Results */}
        <div className="flex-1 flex flex-col bg-dm-bg-alt border border-dm-border rounded-sm p-4 relative h-full">
          <div className="flex items-center justify-between mb-4 border-b border-dm-border pb-2">
            <h3 className="text-dm-accent font-bold uppercase tracking-widest text-sm flex items-center gap-2">
              <D20Icon size={16} /> Historial de Tiradas
            </h3>
            {history.length > 0 && (
              <button 
                type="button"
                onClick={clearHistory}
                className="text-dm-muted hover:text-red-400 transition-colors"
                title="Limpiar Historial"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
            <AnimatePresence>
              {history.length === 0 && !isRolling && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-dm-muted italic m-auto opacity-50"
                >
                  Las tiradas aparecerán aquí...
                </motion.div>
              )}

              {history.map((record, index) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  layout
                  className={cn(
                    "flex flex-col gap-2 p-3 rounded-sm border",
                    index === 0 
                      ? "bg-dm-bg border-dm-accent shadow-md" // Highlight latest
                      : "bg-dm-bg-hover border-dm-border opacity-80"
                  )}
                >
                  <div className="flex justify-between items-center text-xs text-dm-muted">
                    <span className="font-bold uppercase tracking-wider">
                      {record.quantity}d{record.die}
                    </span>
                    <span>
                      {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {record.results.map((res, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-sm font-bold border",
                          res === record.die 
                            ? "bg-dm-accent text-dm-bg-darker border-dm-accent" // Crit Success
                            : res === 1
                            ? "bg-dm-danger text-dm-text border-dm-danger" // Crit Fail
                            : "bg-dm-bg-alt text-dm-text border-dm-border" // Normal
                        )}
                      >
                        {res}
                      </div>
                    ))}
                  </div>

                  {record.quantity > 1 && (
                    <div className="mt-1 pt-2 border-t border-dm-border/50 text-right">
                      <span className="text-dm-muted text-xs uppercase tracking-widest mr-2">Total</span>
                      <span className="text-xl font-bold text-dm-accent">{record.total}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </Modal>
  );
}
