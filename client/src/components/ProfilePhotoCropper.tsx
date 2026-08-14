import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Crop, RotateCw, Check, X } from "lucide-react";

interface ProfilePhotoCropperProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export function ProfilePhotoCropper({ isOpen, imageSrc, onClose, onCropComplete }: ProfilePhotoCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offsetX, y: e.clientY - offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.current.x);
    setOffsetY(e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    const size = 400; // tamaño de salida cuadrado
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(offsetX - img.width / 2, offsetY - img.height / 2);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Recorte circular o cuadrado centrado
      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      onCropComplete(base64);
      onClose();
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" /> Recortar y Ajustar Foto
          </DialogTitle>
          <DialogDescription>
            Arrastra para centrar, usa el zoom y rota la imagen para obtener tu foto de perfil perfecta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 my-2">
          {/* Contenedor de previsualización */}
          <div
            className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary/50 bg-black/40 cursor-grab active:cursor-grabbing select-none flex items-center justify-center shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              src={imageSrc}
              alt="Preview"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxWidth: "none",
              }}
              className="absolute pointer-events-none object-contain"
            />
            <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-full pointer-events-none" />
          </div>

          {/* Controles de ajuste */}
          <div className="w-full space-y-3 px-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Zoom</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <Slider
                value={[zoom]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={(val) => setZoom(val[0])}
                className="py-1"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Rotación</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-8 text-xs border-border flex items-center gap-1"
              >
                <RotateCw className="h-3.5 w-3.5" /> {rotation}°
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold">
            <Check className="h-4 w-4 mr-1" /> Aplicar y Usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
