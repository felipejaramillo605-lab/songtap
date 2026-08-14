import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Lock, Phone, CreditCard, Home, Mail, FileText, ShieldCheck, Upload, CheckCircle2 } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function Profile() {
  const { user, refresh } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [cedula, setCedula] = useState(user?.cedula || "");
  const [address, setAddress] = useState(user?.address || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || "");
  const [cvUrl, setCvUrl] = useState(user?.cvUrl || "");
  const [language, setLanguage] = useState(user?.language || "es");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  const uploadMutation = trpc.upload.uploadFile.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "cv") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo supera el tamaño máximo de 5MB");
      return;
    }

    if (type === "photo") {
      setUploadingPhoto(true);
    } else {
      setUploadingCv(true);
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await uploadMutation.mutateAsync({
          filename: file.name,
          base64Data,
          contentType: file.type || "application/octet-stream",
        });

        if (type === "photo") {
          setPhotoUrl(res.url);
          toast.success("Foto de perfil cargada correctamente");
        } else {
          setCvUrl(res.url);
          toast.success("Hoja de vida (CV) cargada correctamente");
        }
      } catch (err: any) {
        toast.error(`Error al subir archivo: ${err.message}`);
      } finally {
        if (type === "photo") setUploadingPhoto(false);
        else setUploadingCv(false);
      }
    };
    reader.onerror = () => {
      toast.error("No se pudo leer el archivo");
      if (type === "photo") setUploadingPhoto(false);
      else setUploadingCv(false);
    };
    reader.readAsDataURL(file);
  };

  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado con éxito");
      refresh();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al actualizar perfil");
    },
  });

  const updatePreferencesMutation = trpc.users.updateMyPreferences.useMutation({
    onSuccess: () => {
      toast.success("Idioma actualizado");
      refresh();
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al actualizar idioma");
    },
  });

  const updatePasswordMutation = trpc.users.updateMyPassword.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al cambiar contraseña");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateProfileMutation.mutate({
      userId: user.id,
      name,
      email,
      phone: phone || undefined,
      cedula: cedula || undefined,
      address: address || undefined,
      photoUrl: photoUrl || undefined,
      cvUrl: cvUrl || undefined,
    });
  };

  const handleSaveLanguage = (val: string) => {
    setLanguage(val);
    updatePreferencesMutation.mutate({ language: val as "es" | "en" });
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">Cargando perfil...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <User className="h-8 w-8 text-primary" /> Mi Perfil de Usuario
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal, documentos, credenciales de acceso y preferencias regionales en SongTap.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta resumen de rol y estado */}
        <Card className="bg-card border-border md:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border-2 border-primary/50 mb-2">
              {photoUrl ? (
                <img src={photoUrl} alt={name || "User"} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-xl">{name || user.name}</CardTitle>
            <CardDescription className="capitalize font-medium text-primary">
              Rol: {user.role} {user.venueId ? `(Venue #${user.venueId})` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="truncate">{email || user.email || "Sin correo"}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span>Método: {user.loginMethod || "local"}</span>
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-foreground font-semibold mb-2 block">Idioma Preferido</Label>
              <Select value={language} onValueChange={handleSaveLanguage}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Selecciona idioma" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  <SelectItem value="es">Español (Colombia / ES)</SelectItem>
                  <SelectItem value="en">English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de información personal y credenciales */}
        <div className="space-y-6 md:col-span-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Información Personal y DIAN / Habeas Data
              </CardTitle>
              <CardDescription>
                Actualiza tus datos de contacto y carga tu foto y hoja de vida desde tu dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Teléfono / Celular
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 000 0000"
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cedula" className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-primary" /> Cédula / Documento
                    </Label>
                    <Input
                      id="cedula"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="12345678"
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5 text-primary" /> Dirección de Residencia
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle 100 # 15-20, Bogotá"
                    className="bg-background border-border"
                  />
                </div>

                {/* Subida local de Foto y CV */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      <Upload className="h-4 w-4 text-primary" /> Fotografía de Perfil
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "photo")}
                        className="bg-background border-border text-xs cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                    {uploadingPhoto && <p className="text-xs text-primary animate-pulse">Subiendo foto...</p>}
                    {photoUrl && !uploadingPhoto && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Foto cargada correctamente
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 font-medium">
                      <Upload className="h-4 w-4 text-primary" /> Hoja de Vida (CV - PDF/Doc)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf"
                        onChange={(e) => handleFileUpload(e, "cv")}
                        className="bg-background border-border text-xs cursor-pointer file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                    {uploadingCv && <p className="text-xs text-primary animate-pulse">Subiendo CV...</p>}
                    {cvUrl && !uploadingCv && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> CV cargado correctamente
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || uploadingPhoto || uploadingCv}
                  className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold mt-4"
                >
                  {updateProfileMutation.isPending ? "Guardando cambios..." : "Guardar Cambios de Perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Cambiar contraseña */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" /> Seguridad y Contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña de acceso local. (Nota: Si inicias sesión con Google, puedes establecer una contraseña local aquí).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background border-border"
                  />
                  <div className="pt-2">
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-background border-border"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10 mt-2 font-semibold"
                >
                  {updatePasswordMutation.isPending ? "Actualizando..." : "Actualizar Contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
