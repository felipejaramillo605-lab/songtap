import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, UserCheck, Trash2, Mail, Phone, FileText, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import ImageUpload from "@/components/ImageUpload";

export default function ManagerStaff() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: staff, refetch } = trpc.users.list.useQuery(undefined, { enabled: !!user });
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => { toast.success("Perfil actualizado"); setSelectedUser(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUser = trpc.users.deleteUser.useMutation({
    onSuccess: () => { toast.success("Empleado eliminado"); setSelectedUser(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const cvDownload = trpc.users.getCvDownloadUrl.useMutation({
    onSuccess: (data) => window.open(data.url, "_blank", "noopener,noreferrer"),
    onError: (e) => toast.error(e.message || "No fue posible generar el enlace temporal del CV"),
  });

  const myStaff = staff?.filter((u) => u.venueId === venueId && u.id !== user?.id && u.role === "staff") ?? [];

  if (loading) return null;

  const openUserDetails = (u: any) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      cedula: u.cedula || "",
      address: u.address || "",
      photoUrl: u.photoUrl || "",
    });
    setImagePreview(u.photoUrl || "");
  };

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setImagePreview(preview);
      setEditForm({ ...editForm, photoUrl: preview });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({
      userId: selectedUser.id,
      ...editForm,
    });
  };

  return (
    <SongTapLayout role="manager" title="Equipo">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Equipo de trabajo</h2>
          <p className="text-sm text-muted-foreground">Gestiona el personal de tu local</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Actividades por asignar</p>
              <p className="text-3xl font-bold text-blue-400">{myStaff.length}</p>
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
              <Users size={16} /> Equipo asignado ({myStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myStaff.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No hay personal asignado a este local.</p>
            ) : (
              <div className="space-y-3">
                {myStaff.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openUserDetails(u)}>
                    <div className="flex items-center gap-3 flex-1">
                      {u.photoUrl ? (
                        <img src={u.photoUrl || ""} alt={u.name || ""} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {u.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{u.name ?? "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">{u.email ?? "Sin email"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <UserCheck size={14} className="text-green-400" />
                      <span className="rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400">Staff</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalles del usuario */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalles del equipo</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-xs text-muted-foreground">Foto de perfil</Label>
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  preview={imagePreview || undefined}
                  onRemove={() => { setImagePreview(""); setEditForm({ ...editForm, photoUrl: "" }); }}
                  label="Cargar foto"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Nombre *</Label>
                <Input
                  className="mt-1 bg-input border-border text-foreground"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={12} /> Email</Label>
                <Input
                  className="mt-1 bg-input border-border text-foreground"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={12} /> Teléfono</Label>
                <Input
                  className="mt-1 bg-input border-border text-foreground"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Cédula</Label>
                <Input
                  className="mt-1 bg-input border-border text-foreground"
                  value={editForm.cedula}
                  onChange={(e) => setEditForm({ ...editForm, cedula: e.target.value })}
                  placeholder="1234567890"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Dirección</Label>
                <Input
                  className="mt-1 bg-input border-border text-foreground"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Calle 123, Apartamento 4"
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><FileText size={12} /> Hoja de vida (CV)</Label>
                {selectedUser.hasCv ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => cvDownload.mutate({ userId: selectedUser.id })}
                    disabled={cvDownload.isPending}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {cvDownload.isPending ? "Generando enlace..." : "Descargar CV privado"}
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">El integrante aún no ha cargado un CV privado desde su perfil.</p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteUser.mutate({ userId: selectedUser.id })}
                  disabled={deleteUser.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SongTapLayout>
  );
}
