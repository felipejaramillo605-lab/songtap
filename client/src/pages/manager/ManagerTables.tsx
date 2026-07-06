import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, QrCode, RefreshCw, Trash2, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function ManagerTables() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [qrData, setQrData] = useState<{ token: string; name: string } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && user?.role !== "manager" && user?.role !== "owner") navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: tables, refetch } = trpc.tables.list.useQuery({ venueId: venueId! }, { enabled: !!venueId });

  const createTable = trpc.tables.create.useMutation({
    onSuccess: (data) => {
      toast.success("Mesa creada");
      setOpen(false);
      setTableName("");
      refetch();
      if (data.qrToken) setQrData({ token: data.qrToken, name: tableName });
    },
    onError: (e) => toast.error(e.message),
  });
  const resetQr = trpc.tables.resetQr.useMutation({
    onSuccess: (data, vars) => {
      toast.success("QR regenerado");
      refetch();
      const t = tables?.find((t) => t.id === vars.id);
      if (t) setQrData({ token: data.qrToken, name: t.name });
    },
  });
  const deleteTable = trpc.tables.delete.useMutation({
    onSuccess: () => { toast.success("Mesa eliminada"); refetch(); },
  });

  const getQrUrl = (token: string) => `${window.location.origin}/mesa/${token}`;

  if (loading) return null;

  return (
    <SongTapLayout role="manager" title="Mesas y Códigos QR">
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Mesas</h2>
            <p className="text-sm text-muted-foreground">Gestiona las mesas y sus códigos QR de acceso</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" /> Nueva mesa
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-foreground">Crear mesa</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre / Identificador *</Label>
                  <Input className="mt-1 bg-input border-border text-foreground" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Mesa 1, VIP-A, Terraza..." />
                </div>
                <Button className="w-full bg-primary text-primary-foreground" onClick={() => createTable.mutate({ venueId: venueId!, name: tableName })} disabled={!tableName}>
                  Crear y generar QR
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* QR Preview */}
        {qrData && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-foreground">QR generado: {qrData.name}</p>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setQrData(null)}>✕</Button>
              </div>
              <div ref={qrRef} className="bg-white p-4 rounded-lg inline-block mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrUrl(qrData.token))}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs text-muted-foreground break-all">{getQrUrl(qrData.token)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-primary/30 text-primary"
                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getQrUrl(qrData.token))}`, "_blank")}
              >
                <Download size={14} className="mr-2" /> Descargar QR
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables?.map((table) => (
            <Card key={table.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <QrCode size={16} />
                    </div>
                    <p className="font-semibold text-foreground text-sm">{table.name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${table.isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {table.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-md inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getQrUrl(table.qrToken))}`}
                    alt="QR"
                    className="w-24 h-24"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border text-muted-foreground hover:text-primary hover:border-primary/30 text-xs"
                    onClick={() => resetQr.mutate({ id: table.id, venueId: venueId! })}
                  >
                    <RefreshCw size={12} className="mr-1" /> Resetear QR
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-400/10 h-8 w-8 p-0"
                    onClick={() => deleteTable.mutate({ id: table.id, venueId: venueId! })}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!tables?.length && (
          <div className="text-center py-16 text-muted-foreground">
            <QrCode size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay mesas. Crea la primera para generar su QR.</p>
          </div>
        )}
      </div>
    </SongTapLayout>
  );
}
