import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Music2 } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Login() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "owner") navigate("/owner");
      else if (user.role === "manager") navigate("/manager");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center neon-glow">
              <Music2 size={28} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SongTap</h1>
            <p className="text-sm text-muted-foreground mt-1">by CS2</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Accede a tu panel de gestión
          </p>
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Iniciar sesión
          </Button>
          <p className="text-xs text-muted-foreground">
            Al ingresar aceptas nuestra{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
