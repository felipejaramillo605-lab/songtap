import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

interface OrderStatusTimelineProps {
  orderId: number;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pendiente",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  preparing: {
    icon: Loader2,
    label: "En preparación",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  delivered: {
    icon: CheckCircle2,
    label: "Entregado",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  cancelled: {
    icon: AlertCircle,
    label: "Cancelado",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

export default function OrderStatusTimeline({ orderId }: OrderStatusTimelineProps) {
  const { data: history, isLoading } = trpc.orders.getStatusHistory.useQuery({ orderId });

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        Sin historial de cambios disponible
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-4 text-foreground">Historial de cambios</h3>
      <div className="space-y-3">
        {history.map((entry, index) => {
          const config = statusConfig[entry.newStatus as keyof typeof statusConfig];
          const Icon = config.icon;

          return (
            <div key={entry.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`rounded-full p-2 ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                {index < history.length - 1 && (
                  <div className="w-0.5 h-8 bg-border mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  {entry.previousStatus && (
                    <span className="text-xs text-muted-foreground">
                      desde {statusConfig[entry.previousStatus as keyof typeof statusConfig]?.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.changedByUserName || "Sistema"} •{" "}
                  {format(new Date(entry.createdAt), "PPp", { locale: es })}
                </p>
                {entry.reason && (
                  <p className="text-xs mt-1 text-muted-foreground italic">
                    Motivo: {entry.reason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
