import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  MessageSquareText,
  Cog,
  DollarSign,
  Globe,
  LayoutDashboard,
  LogOut,
  Music2,
  QrCode,
  Shield,
  ShoppingBag,
  Table2,
  Users,
  UtensilsCrossed,
  User,
  Bell,
  Menu,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SongTapLayoutProps {
  children: React.ReactNode;
  role: "owner" | "manager" | "staff";
  title?: string;
}

const managerNav: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: <LayoutDashboard size={18} /> },
  { label: "Menú", href: "/manager/menu", icon: <UtensilsCrossed size={18} /> },
  { label: "Mesas & QR", href: "/manager/tables", icon: <QrCode size={18} /> },
  { label: "Personal", href: "/manager/staff", icon: <Users size={18} /> },
  { label: "Actividades", href: "/manager/activities", icon: <ClipboardCheck size={18} /> },
  { label: "PQRS", href: "/manager/pqrs", icon: <MessageSquareText size={18} /> },
  { label: "Finanzas", href: "/manager/finance", icon: <DollarSign size={18} /> },
  { label: "Configuración", href: "/manager/settings", icon: <Cog size={18} /> },
  { label: "Mi Perfil", href: "/profile", icon: <User size={18} /> },
];

const staffNav: NavItem[] = [
  { label: "Pedidos", href: "/staff", icon: <ClipboardList size={18} /> },
  { label: "Mesas", href: "/staff/tables", icon: <Table2 size={18} /> },
  { label: "Música", href: "/staff/music", icon: <Music2 size={18} /> },
  { label: "Mis actividades", href: "/staff/activities", icon: <ClipboardCheck size={18} /> },
  { label: "PQRS", href: "/staff/pqrs", icon: <MessageSquareText size={18} /> },
  { label: "Mi Perfil", href: "/profile", icon: <User size={18} /> },
];

const roleLabels = { owner: "Owner", manager: "Manager", staff: "Staff" };
const roleColors = {
  owner: "text-purple-400",
  manager: "text-blue-400",
  staff: "text-green-400",
};

export default function SongTapLayout({ children, role, title }: SongTapLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Consultar solicitudes pendientes y configuración de notificaciones para Owner
  const { data: pendingCount = 0 } = trpc.notifications.getPendingCount.useQuery(undefined, {
    enabled: role === "owner",
    refetchInterval: 10000, // cada 10s
  });

  const { data: notifSettings } = trpc.notifications.getSettings.useQuery(undefined, {
    enabled: role === "owner",
  });

  const prevPendingRef = useRef(pendingCount);

  useEffect(() => {
    if (role === "owner" && pendingCount > prevPendingRef.current) {
      // Hay nuevas solicitudes
      if (notifSettings?.enabled) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);

          const type = notifSettings.soundType || "chime";
          if (type === "chime") {
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
          } else if (type === "bell") {
            osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime);
          } else {
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          }

          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.5);
        } catch {}
      }
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount, role, notifSettings]);

  const ownerNav: NavItem[] = [
    { label: "Dashboard", href: "/owner", icon: <LayoutDashboard size={18} /> },
    { label: "Locales", href: "/owner/venues", icon: <Globe size={18} /> },
    { label: "Solicitudes", href: "/owner/venue-requests", icon: <ClipboardList size={18} />, badge: pendingCount > 0 ? pendingCount : undefined },
    { label: "Notificaciones", href: "/owner/notifications", icon: <Bell size={18} /> },
    { label: "Usuarios", href: "/owner/users", icon: <Users size={18} /> },
    { label: "Auditoría", href: "/owner/audit", icon: <Shield size={18} /> },
    { label: "Mi Perfil", href: "/profile", icon: <User size={18} /> },
  ];

  const roleNavMap = { owner: ownerNav, manager: managerNav, staff: staffNav };
  const navItems = roleNavMap[role];

  return (
    <div className="flex min-h-screen min-w-0 bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex md:sticky md:top-0 md:h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-out",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-border", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 neon-glow">
            <Music2 size={16} className="text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">SongTap</p>
              <p className="text-[10px] text-muted-foreground">by CS2</p>
            </div>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Modo Panel</p>
              <p className={cn("text-xs font-bold capitalize", roleColors[role])}>{roleLabels[role]}</p>
            </div>
            {role === "owner" && pendingCount > 0 && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm neon-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge !== undefined && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User info & Collapse */}
        <div className="p-3 border-t border-border space-y-2">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-secondary/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {user.name?.[0] || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email || role}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className={cn("w-full text-muted-foreground hover:text-foreground hover:bg-destructive/10 text-xs flex items-center justify-center gap-2", collapsed && "px-0")}
              title="Salir"
            >
              <LogOut size={16} />
              {!collapsed && <span>Salir</span>}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={collapsed ? "Expandir" : "Colapsar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Navegación móvil: el sidebar se abre como drawer y no consume el ancho del contenido. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-sm gap-0 border-r border-border bg-sidebar p-0 text-sidebar-foreground sm:w-80">
          <SheetHeader className="border-b border-border px-5 py-5 text-left">
            <SheetTitle className="flex items-center gap-3 text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground neon-glow">
                <Music2 size={18} />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight">SongTap</span>
                <span className="block text-[10px] font-normal text-muted-foreground">by CS2 · {roleLabels[role]}</span>
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive ? "bg-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            {user && (
              <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary uppercase">
                  {user.name?.[0] || "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user.email || role}</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-foreground"
              onClick={() => logout()}
            >
              <LogOut size={16} /> Salir
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border bg-sidebar/50 px-4 py-3 backdrop-blur sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <Menu size={20} />
            </Button>
            <h1 className="truncate text-base font-bold text-foreground sm:text-lg">{title || "SongTap"}</h1>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {role === "owner" && pendingCount > 0 && (
              <Link href="/owner/venue-requests">
                <span className="inline-flex max-w-36 items-center gap-1.5 truncate rounded-full border border-primary/30 bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary animate-pulse sm:max-w-none sm:px-3 sm:text-xs">
                  <Bell size={13} className="shrink-0" /> <span className="truncate">{pendingCount} {pendingCount === 1 ? "solicitud" : "solicitudes"} pendientes</span>
                </span>
              </Link>
            )}
            <span className="hidden text-xs text-muted-foreground capitalize sm:block">
              {user?.name || role}
            </span>
          </div>
        </header>

        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
