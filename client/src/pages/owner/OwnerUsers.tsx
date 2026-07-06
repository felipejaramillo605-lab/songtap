import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Crown, Briefcase, UserCheck } from "lucide-react";
import { useEffect } from "react";
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
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  return (
    <SongTapLayout role="owner" title="Gestión de Usuarios">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Usuarios</h2>
          <p className="text-sm text-muted-foreground">Gestión global de roles y accesos</p>
        </div>

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
    </SongTapLayout>
  );
}
