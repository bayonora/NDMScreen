import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
}

export function Lightbox({ isOpen, onClose, src, alt, title }: LightboxProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative flex flex-col items-center justify-center max-w-full max-h-full"
            style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-[#c1a063] hover:text-white transition-colors z-10"
            >
              <X size={32} />
            </button>
            <div className="relative group">
              <img
                src={src}
                alt={alt || title || "Imagen"}
                className="max-w-[95vw] max-h-[85vh] object-contain border shadow-2xl border-[#c1a063]/30 shadow-[#c1a063]/10"
              />
              
              {title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <h2 className="text-2xl font-display text-[#c1a063] uppercase tracking-widest text-center">
                    {title}
                  </h2>
                </div>
              )}
            </div>
            
            {title && (
              <div className="mt-4 text-[#c1a063] font-display uppercase tracking-widest text-xl opacity-80 md:hidden">
                {title}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
