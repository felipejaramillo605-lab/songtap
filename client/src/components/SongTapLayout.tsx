import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

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
  { label: "Finanzas", href: "/manager/finance", icon: <DollarSign size={18} /> },
  { label: "Configuración", href: "/manager/settings", icon: <Cog size={18} /> },
  { label: "Mi Perfil", href: "/profile", icon: <User size={18} /> },
];

const staffNav: NavItem[] = [
  { label: "Pedidos", href: "/staff", icon: <ClipboardList size={18} /> },
  { label: "Mesas", href: "/staff/tables", icon: <Table2 size={18} /> },
  { label: "Música", href: "/staff/music", icon: <Music2 size={18} /> },
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-out",
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-sidebar/50 backdrop-blur">
          <h1 className="text-lg font-bold text-foreground">{title || "SongTap"}</h1>
          <div className="flex items-center gap-3">
            {role === "owner" && pendingCount > 0 && (
              <Link href="/owner/venue-requests">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30 cursor-pointer animate-pulse">
                  <Bell size={13} /> {pendingCount} {pendingCount === 1 ? "solicitud pendiente" : "solicitudes pendientes"}
                </span>
              </Link>
            )}
            <span className="text-xs text-muted-foreground capitalize">
              {user?.name || role}
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
