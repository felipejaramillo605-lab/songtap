import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Heading2, ImagePlus, Italic, Link2, List, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import GuideRichContent from "./GuideRichContent";

type UploadedGuideImage = { url: string; altText: string };

export default function GuideRichTextEditor({ value, onChange, onUploadImage }: { value: string; onChange: (next: string) => void; onUploadImage: (input: { filename: string; base64Data: string; contentType: "image/jpeg" | "image/png" | "image/webp"; altText: string }) => Promise<UploadedGuideImage> }) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const insert = (before: string, after = "", fallback = "texto") => {
    const element = editorRef.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const selection = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { editorRef.current?.focus(); editorRef.current?.setSelectionRange(start + before.length, start + before.length + selection.length); });
  };

  const uploadFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Solo se permiten imágenes JPEG, PNG o WEBP.");
    if (file.size > 4 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 4 MB.");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsUploading(true);
        const altText = file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || "Imagen del tutorial";
        const media = await onUploadImage({ filename: file.name, base64Data: String(reader.result), contentType: file.type as "image/jpeg" | "image/png" | "image/webp", altText });
        insert(`\n![${media.altText}](${media.url})\n`, "", "");
        toast.success("Imagen subida e insertada en el contenido.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible subir la imagen."); }
      finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsDataURL(file);
  };

  return <div className="grid gap-3"><div className="flex flex-wrap gap-1 rounded-lg border border-border bg-secondary/30 p-1.5" aria-label="Herramientas de formato"><Button type="button" size="icon" variant="ghost" onClick={() => insert("## ", "", "Título de sección")} aria-label="Añadir título"><Heading2 className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => insert("**", "**", "negrita")} aria-label="Aplicar negrita"><Bold className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => insert("*", "*", "énfasis")} aria-label="Aplicar cursiva"><Italic className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => insert("- ", "", "Paso o recomendación")} aria-label="Añadir lista"><List className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => insert("[", "](/ruta-interna)", "Abrir módulo")} aria-label="Añadir enlace interno"><Link2 className="h-4 w-4" /></Button><Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploading} aria-label="Subir e insertar imagen">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{isUploading ? "Subiendo…" : "Imagen"}</Button><input ref={fileInputRef} type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadFile(event.target.files?.[0])} /></div><div className="grid gap-2"><Label htmlFor="guide-body">Contenido enriquecido</Label><Textarea ref={editorRef} id="guide-body" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Usa títulos, listas, negrita, enlaces internos e imágenes para explicar el procedimiento." rows={10} maxLength={8000} /><p className="text-xs text-muted-foreground">Formato compatible: títulos, listas, **negrita**, *cursiva*, enlaces internos e imágenes gestionadas por SongTap.</p></div>{value.trim() && <div className="rounded-lg border border-border bg-background p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista previa</p><GuideRichContent value={value} /></div>}</div>;
}
