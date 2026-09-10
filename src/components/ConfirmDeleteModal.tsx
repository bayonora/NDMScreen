import { X, AlertTriangle } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-[#1e1a17]/60 backdrop-blur-xl border border-red-900/40 rounded-xl p-6 max-w-sm w-full relative shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8b7355] hover:text-[#c1a063]"
        >
          <X size={20} />
        </button>
        <div className="flex items-center space-x-3 mb-4 text-red-500">
          <AlertTriangle size={24} />
          <h2 className="text-xl tracking-widest uppercase font-light border-b border-red-900/50 pb-2 flex-1">
            {title}
          </h2>
        </div>
        <p className="text-sm text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm uppercase tracking-wider text-[#8b7355] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-900 hover:text-white text-sm uppercase tracking-wider transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
