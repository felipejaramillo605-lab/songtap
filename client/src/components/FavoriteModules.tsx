import { useState } from "react";
import { Link } from "wouter";
import { Archive, Bell, ClipboardCheck, ClipboardList, Heart, LayoutGrid, Music2, QrCode, Shield, ShoppingBag, Users, UtensilsCrossed, WalletCards } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FavoriteModuleRole } from "../../../shared/favoriteModules";

const moduleIcons: Record<string, React.ReactNode> = {
  "owner.venues": <LayoutGrid size={18} />,
  "owner.requests": <ClipboardList size={18} />,
  "owner.notifications": <Bell size={18} />,
  "owner.users": <Users size={18} />,
  "owner.audit": <Shield size={18} />,
  "manager.menu": <UtensilsCrossed size={18} />,
  "manager.tables": <QrCode size={18} />,
  "manager.staff": <Users size={18} />,
  "manager.activities": <ClipboardCheck size={18} />,
  "manager.pqrs": <Archive size={18} />,
  "manager.finance": <WalletCards size={18} />,
  "staff.orders": <ShoppingBag size={18} />,
  "staff.tables": <QrCode size={18} />,
  "staff.music": <Music2 size={18} />,
  "staff.activities": <ClipboardCheck size={18} />,
  "staff.pqrs": <Archive size={18} />,
};

export default function FavoriteModules({ role }: { role: FavoriteModuleRole }) {
  const [isManaging, setIsManaging] = useState(false);
  const utils = trpc.useUtils();
  const { data: modules = [], isLoading } = trpc.users.favoriteModules.useQuery();
  const setFavorite = trpc.users.setFavoriteModule.useMutation({
    onSuccess: () => utils.users.favoriteModules.invalidate(),
  });
  const favorites = modules.filter((module) => module.isFavorite);

  const toggleFavorite = (moduleKey: string, isFavorite: boolean) => {
    setFavorite.mutate({ moduleKey, isFavorite });
  };

  return <Card className="border-border bg-card/80 shadow-premium">
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
      <div><CardTitle className="flex items-center gap-2 text-base text-foreground"><Heart size={17} className="fill-primary/20 text-primary" /> Mis módulos favoritos</CardTitle><p className="mt-1 text-xs text-muted-foreground">Fija accesos personales para abrirlos desde este panel.</p></div>
      <Button type="button" size="sm" variant="outline" aria-expanded={isManaging} onClick={() => setIsManaging((current) => !current)}>{isManaging ? "Listo" : "Personalizar"}</Button>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando favoritos…</p> : favorites.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((module) => <div key={module.key} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 p-2"><Link href={module.href} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"><span className="text-primary">{moduleIcons[module.key]}</span><span className="truncate">{module.label}</span></Link><Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" aria-label={`Quitar ${module.label} de favoritos`} title="Quitar de favoritos" onClick={() => toggleFavorite(module.key, false)} disabled={setFavorite.isPending}><Heart size={15} fill="currentColor" /></Button></div>)}</div> : <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">Aún no tienes módulos fijados. Usa <span className="font-medium text-foreground">Personalizar</span> para crear tus accesos directos.</div>}
      {isManaging && <div className="border-t border-border pt-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulos disponibles</p><div className="flex flex-wrap gap-2">{modules.map((module) => <Button key={module.key} type="button" variant={module.isFavorite ? "secondary" : "outline"} size="sm" className="gap-1.5" aria-pressed={module.isFavorite} onClick={() => toggleFavorite(module.key, !module.isFavorite)} disabled={setFavorite.isPending}><Heart size={14} className={module.isFavorite ? "fill-primary text-primary" : ""} />{module.isFavorite ? "Fijado" : "Fijar"} · {module.label}</Button>)}</div></div>}
    </CardContent>
  </Card>;
}
