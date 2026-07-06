import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import SongTapLayout from "@/components/SongTapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Music2, Play, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function StaffMusic() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
    if (!loading && isAuthenticated && !["staff", "manager", "owner"].includes(user?.role ?? "")) navigate("/");
  }, [loading, isAuthenticated, user, navigate]);

  const venueId = user?.venueId;
  const { data: queue, refetch } = trpc.music.getQueue.useQuery(
    { venueId: venueId! },
    { enabled: !!venueId, refetchInterval: 8000 }
  );

  const updateStatus = trpc.music.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;

  return (
    <SongTapLayout role="staff" title="Cola Musical">
      <div className="space-y-6 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cola de canciones</h2>
          <p className="text-sm text-muted-foreground">Peticiones musicales de los clientes — en orden de llegada</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Music2 size={16} className="text-primary" />
              En cola ({queue?.length ?? 0} canciones)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!queue?.length ? (
              <div className="text-center py-12">
                <Music2 size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">No hay canciones en cola. ¡Silencio total!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((req, index) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      req.status === "playing"
                        ? "bg-primary/10 border-primary/30 neon-glow"
                        : "bg-secondary/30 border-border"
                    }`}
                  >
                    {/* Position */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      {req.status === "playing" ? <Play size={14} /> : index + 1}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{req.songTitle}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {req.artist && <p className="text-xs text-muted-foreground truncate">{req.artist}</p>}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={10} /> {new Date(req.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-primary">— {req.clientName}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === "queued" && (
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
                          onClick={() => updateStatus.mutate({ id: req.id, venueId: venueId!, status: "playing" })}
                        >
                          <Play size={12} className="mr-1" /> Reproducir
                        </Button>
                      )}
                      {req.status === "playing" && (
                        <Button
                          size="sm"
                          className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 text-xs h-8"
                          onClick={() => updateStatus.mutate({ id: req.id, venueId: venueId!, status: "played" })}
                        >
                          <CheckCircle2 size={12} className="mr-1" /> Marcar reproducida
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:bg-red-400/10 h-8 w-8 p-0"
                        onClick={() => updateStatus.mutate({ id: req.id, venueId: venueId!, status: "rejected" })}
                      >
                        <XCircle size={14} />
                      </Button>
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
