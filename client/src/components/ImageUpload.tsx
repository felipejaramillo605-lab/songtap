import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  preview?: string;
  onRemove?: () => void;
  accept?: string;
  label?: string;
  disabled?: boolean;
}

export default function ImageUpload({
  onImageSelect,
  preview,
  onRemove,
  accept = "image/*",
  label = "Cargar imagen",
  disabled = false,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      } else {
        toast.error("Por favor selecciona un archivo de imagen");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      } else {
        toast.error("Por favor selecciona un archivo de imagen válido");
      }
    }
  };

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative w-full max-w-xs">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg border border-border"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Arrastra la imagen aquí o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Formatos: JPG, PNG, GIF, WebP
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
