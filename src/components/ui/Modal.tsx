import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className, headerRight }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />
      
      <div 
        className={cn(
          "relative bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/20 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden",
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-dm-accent/10">
          <h2 className="text-2xl font-display text-dm-accent uppercase tracking-widest">{title}</h2>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1 text-dm-accent hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
