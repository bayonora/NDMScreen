import { Modal } from "./ui/Modal";
import { Button } from "./ui/Input";
import { Plus, RefreshCw } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: () => void;
  onOverwrite: () => void;
}

export function ImportModal({ isOpen, onClose, onMerge, onOverwrite }: ImportModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Datos">
      <div className="space-y-6">
        <p className="text-[#e6e2da] text-sm leading-relaxed text-center">
          ¿Cómo deseas importar los datos en esta sección?
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => { onMerge(); onClose(); }} className="flex-1 flex flex-col items-center justify-center p-4 h-auto bg-[#1a1614] border border-[#c1a063] text-[#c1a063] hover:bg-[#c1a063] hover:text-[#1a1614] transition-colors">
            <Plus size={24} className="mb-2" />
            <span className="font-bold tracking-widest uppercase text-xs">Añadir (Fusionar)</span>
            <span className="text-[10px] mt-2 opacity-80 text-center normal-case">Mantendrá tus datos actuales y añadirá los nuevos.</span>
          </Button>
          <Button onClick={() => { onOverwrite(); onClose(); }} variant="secondary" className="flex-1 flex flex-col items-center justify-center p-4 h-auto border-red-900/50 hover:bg-red-900/20 text-red-400">
            <RefreshCw size={24} className="mb-2" />
            <span className="font-bold tracking-widest uppercase text-xs">Sobrescribir</span>
            <span className="text-[10px] mt-2 opacity-80 text-center normal-case">Borrará los datos actuales y los reemplazará por los importados.</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
