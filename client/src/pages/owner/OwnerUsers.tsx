import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Crown, Briefcase, UserCheck, KeyRound, Copy, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown size={14} className="text-purple-400" />,
  manager: <Briefcase size={14} className="text-blue-400" />,
  staff: <UserCheck size={14} className="text-green-400" />,
  user: <Users size={14} className="text-muted-foreground" />,
};

const roleColors: Record<string, string> = {
  owner: "text-purple-400 bg-purple-400/10",
  manager: "text-blue-400 bg-blue-400/10",
  staff: "text-green-400 bg-green-400/10",
  user: "text-muted-foreground bg-muted",
};

export default function OwnerUsers() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const { data: users, refetch } = trpc.users.list.useQuery(undefined, { enabled: !!user });
  const { data: venues } = trpc.venues.list.useQuery(undefined, { enabled: !!user });
  const [resetTarget, setResetTarget] = useState<(NonNullable<typeof users>[number]) | null>(null);
  const [revealedCredential, setRevealedCredential] = useState<{ email: string; password: string } | null>(null);
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const resetBetaPassword = trpc.users.resetBetaPassword.useMutation({
    onSuccess: (result) => {
      setRevealedCredential({ email: result.email ?? "Cuenta beta", password: result.temporaryPassword });
      setResetTarget(null);
      toast.success("Contraseña beta restablecida. Copia la nueva clave antes de ocultarla.");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const betaUsers = users?.filter((account) => account.email?.endsWith("@songtap.test") && (account.role === "manager" || account.role === "staff")) ?? [];
  const venueNameFor = (venueId: number | null) => venues?.find((venue) => venue.id === venueId)?.name ?? "Sin organización";
  const copyTemporaryPassword = async () => {
    if (!revealedCredential) return;
    await navigator.clipboard.writeText(revealedCredential.password);
    toast.success("Nueva clave copiada al portapapeles.");
  };

  if (loading) return null;

  return (
    <SongTapLayout role="owner" title="Gestión de Usuarios">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Usuarios</h2>
          <p className="text-sm text-muted-foreground">Gestión global de roles y accesos</p>
        </div>

        {revealedCredential && <Card role="status" aria-live="polite" className="border-primary/50 bg-primary/10">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound size={16} className="text-primary" /> Nueva clave temporal</p><p className="mt-1 text-xs text-muted-foreground">Comparte esta clave sólo con <span className="font-medium text-foreground">{revealedCredential.email}</span>. Se ocultará cuando cierres este aviso.</p><code className="mt-2 block w-fit rounded bg-background px-2 py-1 font-mono text-sm font-bold text-foreground">{revealedCredential.password}</code></div>
            <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={copyTemporaryPassword}><Copy size={14} className="mr-2" /> Copiar</Button><Button type="button" size="sm" variant="outline" onClick={() => setRevealedCredential(null)}><EyeOff size={14} className="mr-2" /> Ocultar</Button></div>
          </CardContent>
        </Card>}

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground"><KeyRound size={16} className="text-primary" /> Cuentas beta</CardTitle><p className="text-xs text-muted-foreground">Restablece una clave temporal para las cuentas beta operativas. Esta acción no está disponible para cuentas Owner ni ajenas al entorno beta.</p></CardHeader>
          <CardContent><div className="space-y-2">{betaUsers.length ? betaUsers.map((betaUser) => <div key={`beta-${betaUser.id}`} className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/20 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-foreground">{betaUser.name ?? betaUser.email}</p><p className="text-xs text-muted-foreground">{betaUser.email} · {venueNameFor(betaUser.venueId)}</p></div><div className="flex items-center gap-3"><span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${roleColors[betaUser.role]}`}>{roleIcons[betaUser.role]} {betaUser.role}</span><Button type="button" size="sm" variant="outline" onClick={() => setResetTarget(betaUser)}><KeyRound size={14} className="mr-2" /> Restablecer clave</Button></div></div>) : <p className="py-4 text-center text-sm text-muted-foreground">No hay cuentas beta elegibles.</p>}</div></CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={16} /> Todos los usuarios ({users?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users?.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {u.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name ?? "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">{u.email ?? "Sin email"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${roleColors[u.role]}`}>
                      {roleIcons[u.role]} {u.role}
                    </span>
                    {u.id !== user?.id && (
                      <Select
                        value={u.role}
                        onValueChange={(role) =>
                          updateRole.mutate({
                            userId: u.id,
                            role: role as "owner" | "manager" | "staff" | "user",
                            venueId: u.venueId,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="user">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={Boolean(resetTarget)} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Restablecer contraseña beta?</AlertDialogTitle><AlertDialogDescription>Se generará una nueva clave temporal para <span className="font-medium text-foreground">{resetTarget?.email}</span>. La clave anterior dejará de funcionar inmediatamente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={resetBetaPassword.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={!resetTarget || resetBetaPassword.isPending} onClick={() => resetTarget && resetBetaPassword.mutate({ userId: resetTarget.id })}>{resetBetaPassword.isPending ? "Restableciendo..." : "Sí, restablecer"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SongTapLayout>
  );
}
