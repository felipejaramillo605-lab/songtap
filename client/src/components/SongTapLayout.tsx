import { useAuth } from "@/_core/hooks/useAuth";
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
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SongTapLayoutProps {
  children: React.ReactNode;
  role: "owner" | "manager" | "staff";
  title?: string;
}

const ownerNav: NavItem[] = [
  { label: "Dashboard", href: "/owner", icon: <LayoutDashboard size={18} /> },
  { label: "Locales", href: "/owner/venues", icon: <Globe size={18} /> },
  { label: "Solicitudes", href: "/owner/venue-requests", icon: <ClipboardList size={18} /> },
  { label: "Usuarios", href: "/owner/users", icon: <Users size={18} /> },
  { label: "Auditoría", href: "/owner/audit", icon: <Shield size={18} /> },
  { label: "Mi Perfil", href: "/profile", icon: <User size={18} /> },
];

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

const roleNavMap = { owner: ownerNav, manager: managerNav, staff: staffNav };
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
          <div className="px-4 py-3 border-b border-border bg-secondary/20">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Modo Panel</p>
            <p className={cn("text-xs font-bold capitalize", roleColors[role])}>{roleLabels[role]}</p>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm neon-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
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
              className={cn("w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center px-0")}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              {!collapsed && <span className="ml-2 text-xs">Salir</span>}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground"
              title={collapsed ? "Expandir" : "Contraer"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="text-lg font-bold text-foreground">{title || "SongTap Management"}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              {role.toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
