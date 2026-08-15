import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

function getDashboardRoute(role?: string) {
  if (role === "owner") return "/owner";
  if (role === "manager") return "/manager";
  if (role === "staff") return "/staff";
  return "/";
}

export default function ForcePasswordChange() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const passwordsMatch = useMemo(() => !confirmation || newPassword === confirmation, [confirmation, newPassword]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
    if (!loading && isAuthenticated && !user?.mustChangePassword) navigate(getDashboardRoute(user?.role));
  }, [isAuthenticated, loading, navigate, user?.mustChangePassword, user?.role]);

  const completePasswordChange = trpc.users.completeTemporaryPassword.useMutation({
    onSuccess: async () => {
      toast.success("Contraseña actualizada. Ya puedes ingresar al sistema.");
      await utils.auth.me.invalidate();
      navigate(getDashboardRoute(user?.role));
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return <main className="flex min-h-screen items-center justify-center bg-background p-4">
    <Card className="w-full max-w-md border-primary/25 bg-card shadow-premium">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><KeyRound size={24} /></div>
        <CardTitle className="text-xl text-foreground">Crea tu contraseña personal</CardTitle>
        <p className="text-sm text-muted-foreground">Por seguridad, debes reemplazar la contraseña temporal antes de acceder a SongTap.</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (newPassword.length < 10) return toast.error("La nueva contraseña debe tener al menos 10 caracteres.");
          if (!passwordsMatch) return toast.error("Las contraseñas no coinciden.");
          completePasswordChange.mutate({ newPassword });
        }}>
          <div className="space-y-2"><Label htmlFor="temporary-new-password">Nueva contraseña</Label><Input id="temporary-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><PasswordStrengthIndicator password={newPassword} /></div>
          <div className="space-y-2"><Label htmlFor="temporary-confirm-password">Confirmar nueva contraseña</Label><Input id="temporary-confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-invalid={!passwordsMatch} required />{!passwordsMatch && <p role="alert" className="text-xs text-destructive">Las contraseñas no coinciden.</p>}</div>
          <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground"><ShieldCheck size={16} className="shrink-0 text-primary" />Esta clave sustituirá la contraseña temporal compartida para tu cuenta.</div>
          <Button type="submit" className="w-full" disabled={completePasswordChange.isPending}>{completePasswordChange.isPending ? "Actualizando contraseña…" : "Guardar y continuar"}</Button>
        </form>
      </CardContent>
    </Card>
  </main>;
}
