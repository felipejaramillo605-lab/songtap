import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, UserCheck, UserX } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function ManagerStaff() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: staff, refetch } = trpc.users.list.useQuery(undefined, { enabled: !!user });
  const assignUser = trpc.users.assignToVenue.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const myStaff = staff?.filter((u) => u.venueId === venueId && u.id !== user?.id) ?? [];

  if (loading) return null;

  return (
    <SongTapLayout role="manager" title="Personal">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Equipo de trabajo</h2>
          <p className="text-sm text-muted-foreground">Gestiona los roles del personal de tu local</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Managers</p>
              <p className="text-3xl font-bold text-blue-400">{myStaff.filter((u) => u.role === "manager").length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Staff</p>
              <p className="text-3xl font-bold text-green-400">{myStaff.filter((u) => u.role === "staff").length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={16} /> Personal asignado ({myStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myStaff.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No hay personal asignado a este local.</p>
            ) : (
              <div className="space-y-3">
                {myStaff.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {u.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name ?? "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{u.email ?? "Sin email"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role === "staff" ? <UserCheck size={14} className="text-green-400" /> : <UserX size={14} className="text-blue-400" />}
                      <Select
                        value={u.role}
                        onValueChange={(role) => assignUser.mutate({ userId: u.id, venueId: venueId!, role: role as "manager" | "staff" })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SongTapLayout>
  );
}
