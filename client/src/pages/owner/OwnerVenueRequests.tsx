import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, Clock, Mail, MapPin, Phone } from "lucide-react";

export default function OwnerVenueRequests() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const { data: requests, isLoading, refetch } = trpc.venues.getPendingRequests.useQuery(undefined, {
    enabled: user?.role === "owner",
  });

  const approveMutation = trpc.venues.approveRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud aprobada. Venue creado y asignado al manager.");
      refetch();
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const rejectMutation = trpc.venues.rejectRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud rechazada.");
      refetch();
      setSelectedRequest(null);
      setRejectionReason("");
      setIsRejectDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (user?.role !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando solicitudes...</p>
      </div>
    );
  }

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const approvedRequests = requests?.filter((r) => r.status === "approved") || [];
  const rejectedRequests = requests?.filter((r) => r.status === "rejected") || [];

  const handleApprove = (request: any) => {
    approveMutation.mutate({ requestId: request.id });
  };

  const handleRejectClick = (request: any) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedRequest && rejectionReason.trim()) {
      rejectMutation.mutate({ requestId: selectedRequest.id, reason: rejectionReason });
    } else {
      toast.error("Debes proporcionar un motivo de rechazo.");
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
          Solicitudes de Empresas
        </h1>
        <p className="text-muted-foreground mt-2">Gestiona las solicitudes de creación de empresas de los managers</p>
      </div>

      {/* Solicitudes Pendientes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Pendientes ({pendingRequests.length})</h2>
        </div>

        {pendingRequests.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No hay solicitudes pendientes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((request: any) => (
              <Card key={request.id} className="border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.venueName}</CardTitle>
                      <CardDescription>Manager ID: {request.managerId}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      Pendiente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{request.venueAddress || "No especificada"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{request.venuePhone || "No especificado"}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{request.venueEmail || "No especificado"}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => handleRejectClick(request)}
                      disabled={rejectMutation.isPending}
                      variant="outline"
                      className="flex-1 border-red-500/30 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Solicitudes Aprobadas */}
      {approvedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-semibold">Aprobadas ({approvedRequests.length})</h2>
          </div>
          <div className="grid gap-4">
            {approvedRequests.map((request: any) => (
              <Card key={request.id} className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.venueName}</CardTitle>
                      <CardDescription>Aprobado el {new Date(request.approvedAt).toLocaleDateString()}</CardDescription>
                    </div>
                    <Badge className="bg-green-600">Aprobada</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Solicitudes Rechazadas */}
      {rejectedRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold">Rechazadas ({rejectedRequests.length})</h2>
          </div>
          <div className="grid gap-4">
            {rejectedRequests.map((request: any) => (
              <Card key={request.id} className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{request.venueName}</CardTitle>
                      <CardDescription className="text-red-600">{request.rejectionReason}</CardDescription>
                    </div>
                    <Badge variant="destructive">Rechazada</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog para rechazar */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              {selectedRequest?.venueName} - Proporciona un motivo para el rechazo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo del rechazo..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-24"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleRejectConfirm}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Confirmar Rechazo
              </Button>
              <Button onClick={() => setIsRejectDialogOpen(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
