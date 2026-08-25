import { Button } from "@/components/ui/button";
import { useOptionalTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const context = useOptionalTheme();
  if (!context?.switchable || !context.toggleTheme) return null;
  const { theme, toggleTheme } = context;
  const nextLabel = theme === "dark" ? "Activar modo claro" : "Activar modo oscuro";
  return <Button
    type="button"
    variant="ghost"
    size={compact ? "icon" : "sm"}
    onClick={toggleTheme}
    className={compact ? "h-8 w-8 border border-border bg-card/90 text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground" : "w-full justify-start gap-2 text-muted-foreground hover:text-foreground"}
    aria-label={nextLabel}
    title={nextLabel}
  >
    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    {!compact && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
  </Button>;
}
