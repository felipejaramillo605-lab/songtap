import { EyeOff, TestTube2 } from "lucide-react";
import { useLocation } from "wouter";
import { clearPreviewMode } from "@/lib/previewMode";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PreviewModeBanner() {
  const { actualUser, isPreviewMode, previewMode } = useAuth();
  const [, navigate] = useLocation();
  if (!isPreviewMode || actualUser?.role !== "owner" || !previewMode) return null;

  const exitPreview = () => {
    clearPreviewMode();
    navigate("/owner");
  };

  return (
    <aside className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[min(94%,760px)] flex-col gap-2 rounded-xl border border-primary/40 bg-card/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-foreground"><TestTube2 className="h-5 w-5 shrink-0 text-primary" /><span><strong>Modo de pruebas:</strong> vista {previewMode.role === "manager" ? "Manager" : "Staff"} · {previewMode.venueName || `Local #${previewMode.venueId}`}. Cambios bloqueados.</span></p>
      <button type="button" onClick={exitPreview} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"><EyeOff className="h-4 w-4" /> Salir del modo</button>
    </aside>
  );
}
