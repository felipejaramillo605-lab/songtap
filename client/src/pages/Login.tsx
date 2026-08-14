import { Music2, Lock, Mail, User, ArrowRight, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function Login() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"choose" | "password" | "register" | "forgot" | "reset">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "owner") navigate("/owner");
      else if (user.role === "manager") navigate("/manager");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/");
    }
  }, [isAuthenticated, user, navigate]);

  const loginPassword = trpc.auth.loginPassword.useMutation({
    onSuccess: async () => {
      toast.success("¡Bienvenido de vuelta!");
      await utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const registerPassword = trpc.auth.registerPassword.useMutation({
    onSuccess: async () => {
      toast.success("¡Cuenta creada con éxito!");
      await utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const forgotPassword = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMode("reset");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMode("password");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSocialLogin = (provider: string) => {
    toast.error(
      `El inicio de sesión con ${provider} requiere credenciales de API (Client ID / Secret). Actualmente está disponible Manus OAuth o Correo y Contraseña.`
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 text-center space-y-6 border border-border bg-card">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center neon-glow">
              <Music2 size={28} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SongTap</h1>
            <p className="text-sm text-muted-foreground mt-1">by CS2 — ERP & Música</p>
          </div>

          {mode === "choose" && (
            <div className="space-y-3">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Continuar con Manus OAuth
              </Button>
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-secondary font-semibold py-3"
                onClick={() => setMode("password")}
              >
                <Mail size={16} className="mr-2" /> Correo y Contraseña
              </Button>

              <div className="pt-2 border-t border-border/50 grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  title="Google (Configuración pendiente)"
                  onClick={() => handleSocialLogin("Google")}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  title="Apple (Configuración pendiente)"
                  onClick={() => handleSocialLogin("Apple")}
                >
                  Apple
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  title="Facebook (Configuración pendiente)"
                  onClick={() => handleSocialLogin("Facebook")}
                >
                  Meta
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  title="Microsoft (Configuración pendiente)"
                  onClick={() => handleSocialLogin("Microsoft")}
                >
                  MS
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground pt-1"
                onClick={() => setMode("register")}
              >
                ¿No tienes cuenta? Regístrate aquí
              </Button>
            </div>
          )}

          {mode === "password" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loginPassword.mutate({ email, password });
              }}
              className="space-y-4 text-left"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input
                  type="email"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input
                  type="password"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
                disabled={loginPassword.isPending}
              >
                {loginPassword.isPending ? "Ingresando..." : "Iniciar sesión"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("choose")}
              >
                ← Volver a opciones
              </Button>
            </form>
          )}

          {mode === "register" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                registerPassword.mutate({ email, password, name });
              }}
              className="space-y-4 text-left"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                <Input
                  type="text"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="Tu Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input
                  type="email"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contraseña (mín. 6 caracteres)</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordStrengthIndicator password={password} />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
                disabled={registerPassword.isPending}
              >
                {registerPassword.isPending ? "Registrando..." : "Crear cuenta"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("choose")}
              >
                ← Volver a opciones
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                forgotPassword.mutate({ email });
              }}
              className="space-y-4 text-left"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Correo electrónico de recuperación</Label>
                <Input
                  type="email"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Te enviaremos un código/token de recuperación (revisa la consola del servidor en entorno de desarrollo).
                </p>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("password")}
              >
                ← Volver a inicio de sesión
              </Button>
            </form>
          )}

          {mode === "reset" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPassword.mutate({ token: resetToken, newPassword });
              }}
              className="space-y-4 text-left"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Token de recuperación</Label>
                <Input
                  type="text"
                  required
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="Pega tu token aquí"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nueva contraseña (mín. 6 caracteres)</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 bg-input border-border text-foreground"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? "Actualizando..." : "Restablecer contraseña"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setMode("password")}
              >
                ← Volver a inicio de sesión
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Al ingresar aceptas nuestra{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
