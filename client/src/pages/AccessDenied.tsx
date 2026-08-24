import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getProtectedRouteMetadata } from "@shared/accessRegistry";
import { ArrowRight, KeyRound, Loader2, LogIn, LogOut, Send, ShieldAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const roleLabels: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
  user: "Usuario",
};

export default function AccessDenied({ requestedPath }: { requestedPath?: string }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPath, navigate] = useLocation();
  const targetPath = requestedPath ?? currentPath;
  const target = getProtectedRouteMetadata(targetPath);
  const recordedPathRef = useRef<string | null>(null);
  const needsPasswordChange = Boolean(user?.mustChangePassword);
  const hasSession = Boolean(isAuthenticated && user);
  const dashboardHref = user?.role === "owner" ? "/owner" : user?.role === "manager" ? "/manager" : user?.role === "staff" ? "/staff" : "/";
  const actionHref = needsPasswordChange ? "/change-password" : hasSession ? dashboardHref : "/login";
  const actionLabel = needsPasswordChange ? "Cambiar contraseña" : hasSession ? "Ir a mi panel" : "Ir a iniciar sesión";
  const actionIcon = needsPasswordChange ? <KeyRound size={16} /> : hasSession ? <ArrowRight size={16} /> : <LogIn size={16} />;
  const message = needsPasswordChange
    ? "Tu contraseña temporal debe cambiarse antes de acceder a los módulos de SongTap."
    : hasSession
      ? "Tu rol actual no cuenta con permisos para ver esta ruta. No se mostró contenido interno."
      : "Necesitas iniciar sesión con una cuenta autorizada para acceder a esta ruta.";
  const recordDeniedMutation = trpc.access.recordDenied.useMutation();
  const requestAccessMutation = trpc.access.request.useMutation({
    onSuccess: ({ created }) => {
      toast.success(created ? "Solicitud enviada al Owner para revisión." : "Ya existe una solicitud reciente para este módulo.");
    },
    onError: (error) => toast.error(error.message || "No fue posible enviar la solicitud."),
  });

  useEffect(() => {
    if (!hasSession || !target || recordedPathRef.current === targetPath) return;
    recordedPathRef.current = targetPath;
    recordDeniedMutation.mutate({ path: targetPath, reason: needsPasswordChange ? "password_change" : "role" });
  }, [hasSession, needsPasswordChange, recordDeniedMutation, target, targetPath]);

  const canRequestAccess = Boolean(hasSession && target && !needsPasswordChange && user?.role !== "owner");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <section role="alert" aria-labelledby="access-denied-title" className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <ShieldAlert size={24} aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">Ruta protegida</p>
        <h1 id="access-denied-title" className="mt-2 text-2xl font-bold">Acceso denegado</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        {target && (
          <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm" aria-label="Módulo solicitado">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Módulo solicitado</p>
            <p className="mt-1 font-semibold text-foreground">{target.moduleName}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{targetPath}</p>
          </div>
        )}
        {hasSession && (
          <dl className="mt-5 rounded-lg border border-border bg-secondary/20 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Cuenta activa</dt><dd className="truncate font-medium">{user?.email ?? user?.name ?? "Usuario"}</dd></div>
            <div className="mt-2 flex justify-between gap-4"><dt className="text-muted-foreground">Rol actual</dt><dd className="font-medium">{roleLabels[user?.role ?? "user"] ?? user?.role ?? "Usuario"}</dd></div>
          </dl>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button type="button" className="gap-2" onClick={() => navigate(actionHref)}>{actionIcon}{actionLabel}</Button>
          {canRequestAccess && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-primary/40 text-foreground hover:bg-primary/10"
              disabled={requestAccessMutation.isPending}
              onClick={() => requestAccessMutation.mutate({ path: targetPath })}
            >
              {requestAccessMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Solicitar acceso al Owner
            </Button>
          )}
          {hasSession && (
            <Button type="button" variant="outline" className="gap-2" onClick={async () => { await logout(); navigate("/login"); }}>
              <LogOut size={16} /> Cambiar de cuenta
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
