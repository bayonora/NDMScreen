import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Input";
import { getCroppedImg } from "../lib/utils";

interface ImageCropperModalProps {
  aspect?: number;
  title?: string;
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (base64: string) => void;
}

export function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete, aspect = 1, title = "Ajustar Retrato" }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      onCropComplete(croppedImage);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="relative w-full h-64 bg-black sm:h-80 mb-4 rounded overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onCropComplete={handleCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-dm-muted">Zoom</span>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-dm-accent"
        />
      </div>
      <div className="flex justify-end gap-2 border-t border-dm-border pt-4">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>Recortar y Guardar</Button>
      </div>
    </Modal>
  );
}
