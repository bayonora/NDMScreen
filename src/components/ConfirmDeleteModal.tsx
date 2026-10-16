import { X, AlertTriangle } from "lucide-react";
import { Overlay } from "./ui/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
};

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Eliminación",
  message = "¿Estás seguro de que quieres eliminar esto? Esta acción no se puede deshacer.",
}: Props) {
  return (
    <Overlay isOpen={isOpen} onClose={onClose} zIndex="z-[60]">
      <div role="alertdialog" aria-modal="true" className="bg-dm-bg/80 backdrop-blur-xl border border-dm-danger/40 rounded-xl p-6 max-w-sm w-full relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-dm-muted hover:text-dm-accent"
        >
          <X size={20} />
        </button>
        <div className="flex items-center space-x-3 mb-4 text-dm-danger pr-6">
          <AlertTriangle size={24} className="shrink-0" />
          <h2 className="text-xl tracking-widest uppercase font-light border-b border-dm-danger/50 pb-2 flex-1">
            {title}
          </h2>
        </div>
        <p className="text-sm text-dm-text mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm uppercase tracking-wider text-dm-muted hover:text-dm-text-bright transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-dm-danger/20 text-dm-danger border border-dm-danger hover:bg-dm-danger hover:text-dm-text-bright text-sm uppercase tracking-wider transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </Overlay>
  );
}
