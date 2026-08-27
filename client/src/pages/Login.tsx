import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import ThemeToggle from "@/components/ThemeToggle";
import { Music2, Mail, Building2, User, ShieldCheck } from "lucide-react";

export default function Login() {
  const { user, isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const activeVenuesQuery = trpc.venues.list.useQuery(undefined, { enabled: isAuthenticated });
  const [mode, setMode] = useState<"choose" | "password" | "register" | "forgot" | "reset">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<"user" | "manager">("user");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const roleLabels: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff", user: "Usuario" };
  const activeRole = user?.role ? roleLabels[user.role] ?? user.role : "Usuario";
  const activeOrganization = user?.role === "owner"
    ? "Acceso global a todas las organizaciones"
    : activeVenuesQuery.data?.[0]?.name ?? (user?.venueId ? "Organización asignada" : "Sin organización asignada");
  const lastSignedIn = user?.lastSignedIn
    ? new Date(user.lastSignedIn).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
    : "No disponible";

  const navigateByRole = (account?: { role?: string; mustChangePassword?: boolean | null }) => {
    if (account?.mustChangePassword) return navigate("/change-password");
    if (account?.role === "owner") return navigate("/owner");
    if (account?.role === "manager") return navigate("/manager");
    if (account?.role === "staff") return navigate("/staff");
    return navigate("/");
  };

  const loginPassword = trpc.auth.loginPassword.useMutation({
    onSuccess: async (data) => {
      setLoginNotice(null);
      toast.success("¡Bienvenido de vuelta!");
      await utils.auth.me.invalidate();
      navigateByRole(data.user);
    },
    onError: (e) => {
      setLoginNotice(e.message);
      toast.error(e.message);
    },
  });

  const registerPassword = trpc.auth.registerPassword.useMutation({
    onSuccess: async (data) => {
      if (data.user?.role === "manager") {
        toast.success("¡Cuenta de Manager creada! Tu solicitud de local fue enviada al Owner para aprobación.");
      } else {
        toast.success("¡Cuenta creada con éxito!");
      }
      await utils.auth.me.invalidate();
      navigateByRole(data.user);
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
      `El inicio de sesión con ${provider} requiere credenciales de API. Utiliza Manus OAuth o Correo y Contraseña.`
    );
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute right-4 top-4"><ThemeToggle compact /></div>
      <div className="w-full max-w-sm">
        <div className="glass-card rounded-2xl p-8 text-center space-y-6 border border-border bg-card shadow-xl">
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
              {isAuthenticated && user && <div role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-left text-xs text-muted-foreground"><p><span className="font-semibold text-foreground">Sesión activa:</span> {user.email ?? user.name ?? "usuario"}. Si necesitas usar otra cuenta, ciérrala primero.</p><p className="mt-1 leading-relaxed"><span className="font-medium text-foreground">Rol:</span> {activeRole}<br /><span className="font-medium text-foreground">Organización:</span> {activeOrganization}<br /><span className="font-medium text-foreground">Última sesión:</span> {lastSignedIn}</p><Button type="button" variant="link" size="sm" className="mt-1 h-auto px-0 text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200" onClick={async () => { await logout(); setMode("choose"); }} >Cerrar sesión y cambiar de cuenta</Button></div>}
              <div role="note" aria-label="Acceso para cuentas beta" className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-left text-xs text-muted-foreground">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
                <p><span className="font-semibold text-foreground">¿Tienes una cuenta beta?</span> Selecciona <span className="font-semibold text-primary">Correo y Contraseña</span>. No uses Manus OAuth ni necesitas un código enviado al correo.</p>
              </div>
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
                  onClick={() => handleSocialLogin("Google")}
                >
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  onClick={() => handleSocialLogin("Apple")}
                >
                  Apple
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
                  onClick={() => handleSocialLogin("Facebook")}
                >
                  Meta
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs py-2 border-border"
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
              {loginNotice && (
                <div role="alert" aria-live="assertive" className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm leading-relaxed text-foreground">
                  {loginNotice}
                </div>
              )}
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
                registerPassword.mutate({
                  email,
                  password,
                  name,
                  accountType,
                  venueName: accountType === "manager" ? venueName : undefined,
                  venueAddress: accountType === "manager" ? venueAddress : undefined,
                  venuePhone: accountType === "manager" ? venuePhone : undefined,
                });
              }}
              className="space-y-3 text-left max-h-[75vh] overflow-y-auto px-1"
            >
              <div>
                <Label className="text-xs text-muted-foreground">Tipo de cuenta</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setAccountType("user")}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      accountType === "user"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <User size={14} /> Cliente / General
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType("manager")}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      accountType === "manager"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <Building2 size={14} /> Manager / Local
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                <Input
                  type="text"
                  required
                  className="mt-1 bg-input border-border text-foreground text-xs"
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
                  className="mt-1 bg-input border-border text-foreground text-xs"
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
                  className="mt-1 bg-input border-border text-foreground text-xs"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              {accountType === "manager" && (
                <div className="pt-2 border-t border-border/50 space-y-3">
                  <p className="text-xs font-semibold text-primary">Información de tu Local / Empresa</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre del local / bar / karaoke</Label>
                    <Input
                      type="text"
                      required={accountType === "manager"}
                      className="mt-1 bg-input border-border text-foreground text-xs"
                      placeholder="Ej. Bar La Noche"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dirección</Label>
                    <Input
                      type="text"
                      className="mt-1 bg-input border-border text-foreground text-xs"
                      placeholder="Calle 50 #10-20, Medellín"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Teléfono de contacto</Label>
                    <Input
                      type="text"
                      className="mt-1 bg-input border-border text-foreground text-xs"
                      placeholder="+57 300 123 4567"
                      value={venuePhone}
                      onChange={(e) => setVenuePhone(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-3 neon-glow mt-2"
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
                <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
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
        </div>
      </div>
    </div>
  );
}
