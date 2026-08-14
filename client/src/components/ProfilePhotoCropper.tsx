import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Crop, RotateCw, Check, X, ScanFace, Sparkles } from "lucide-react";

interface ProfilePhotoCropperProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FaceDetectorInstance = {
  detect: (source: HTMLImageElement) => Promise<Array<{ boundingBox: FaceBox }>>;
};

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

type FaceDetectionWindow = Window & {
  FaceDetector?: FaceDetectorConstructor;
};

const PREVIEW_SIZE = 256;
const OUTPUT_SIZE = 400;

export function ProfilePhotoCropper({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: ProfilePhotoCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [faceStatus, setFaceStatus] = useState<
    "idle" | "detecting" | "detected" | "not-found" | "unsupported" | "error"
  >("idle");
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    let cancelled = false;
    const image = new Image();

    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setFaceStatus("detecting");

    image.onload = async () => {
      if (cancelled) return;

      const scale = Math.max(
        PREVIEW_SIZE / image.naturalWidth,
        PREVIEW_SIZE / image.naturalHeight,
      );
      setDisplayScale(scale);
      setImageDimensions({
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale,
      });

      const FaceDetector = (window as FaceDetectionWindow).FaceDetector;
      if (!FaceDetector) {
        setFaceStatus("unsupported");
        return;
      }

      try {
        const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(image);
        if (cancelled) return;

        const face = faces[0]?.boundingBox;
        if (!face) {
          setFaceStatus("not-found");
          return;
        }

        const faceCenterX = face.x + face.width / 2;
        const faceCenterY = face.y + face.height / 2;
        const imageCenterX = image.naturalWidth / 2;
        const imageCenterY = image.naturalHeight / 2;

        setOffsetX(-(faceCenterX - imageCenterX) * scale);
        setOffsetY(-(faceCenterY - imageCenterY) * scale);
        setFaceStatus("detected");
      } catch {
        setFaceStatus("error");
      }
    };

    image.onerror = () => {
      if (!cancelled) setFaceStatus("error");
    };
    image.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc, isOpen]);

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
    if (!imageDimensions.width || !displayScale) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.save();
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.translate(
        offsetX / displayScale - image.naturalWidth / 2,
        offsetY / displayScale - image.naturalHeight / 2,
      );
      ctx.drawImage(image, 0, 0);
      ctx.restore();

      onCropComplete(canvas.toDataURL("image/jpeg", 0.9));
      onClose();
    };
    image.src = imageSrc;
  };

  const statusMessage = {
    detecting: "Buscando un rostro para centrarlo automáticamente…",
    detected: "Rostro detectado y centrado automáticamente. Puedes ajustar el resultado manualmente.",
    "not-found": "No se detectó un rostro. Puedes centrar la imagen manualmente arrastrándola.",
    unsupported: "La detección automática no está disponible en este navegador. Puedes centrar la imagen manualmente.",
    error: "No fue posible detectar el rostro. Puedes centrar la imagen manualmente.",
    idle: "",
  }[faceStatus];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" /> Recortar y Ajustar Foto
          </DialogTitle>
          <DialogDescription>
            SongTap intentará detectar tu rostro y centrarlo automáticamente. También puedes arrastrar, ampliar o rotar la imagen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 my-2">
          <div
            className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary/50 bg-black/40 cursor-grab active:cursor-grabbing select-none flex items-center justify-center shadow-inner touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="img"
            aria-label="Previsualización recortada de la foto de perfil"
          >
            <img
              src={imageSrc}
              alt="Previsualización de la foto de perfil"
              style={{
                width: imageDimensions.width ? `${imageDimensions.width}px` : "auto",
                height: imageDimensions.height ? `${imageDimensions.height}px` : "auto",
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                transformOrigin: "center center",
                maxWidth: "none",
                maxHeight: "none",
              }}
              className="absolute pointer-events-none object-contain"
            />
            <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-full pointer-events-none" />
          </div>

          <div className="w-full min-h-10 rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2" aria-live="polite">
            {faceStatus === "detected" || faceStatus === "detecting" ? (
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <ScanFace className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>

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
                onValueChange={(val) => setZoom(val[0] ?? 1)}
                aria-label="Ajustar zoom de la foto"
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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={faceStatus === "detecting" || !imageDimensions.width}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold"
          >
            <Check className="h-4 w-4 mr-1" /> Aplicar y Usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfilePhotoCropper;
