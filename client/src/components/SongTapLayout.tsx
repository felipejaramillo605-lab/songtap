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
  { label: "Usuarios", href: "/owner/users", icon: <Users size={18} /> },
  { label: "Auditoría", href: "/owner/audit", icon: <Shield size={18} /> },
];

const managerNav: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: <LayoutDashboard size={18} /> },
  { label: "Menú", href: "/manager/menu", icon: <UtensilsCrossed size={18} /> },
  { label: "Mesas & QR", href: "/manager/tables", icon: <QrCode size={18} /> },
  { label: "Personal", href: "/manager/staff", icon: <Users size={18} /> },
  { label: "Finanzas", href: "/manager/finance", icon: <DollarSign size={18} /> },
  { label: "Configuración", href: "/manager/settings", icon: <Cog size={18} /> },
];

const staffNav: NavItem[] = [
  { label: "Pedidos", href: "/staff", icon: <ClipboardList size={18} /> },
  { label: "Mesas", href: "/staff/tables", icon: <Table2 size={18} /> },
  { label: "Música", href: "/staff/music", icon: <Music2 size={18} /> },
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
          <div className="px-4 py-3 border-b border-border">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", roleColors[role])}>
              {roleLabels[role]}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
                    "hover:bg-sidebar-accent hover:text-foreground",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "text-muted-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn("flex-shrink-0", isActive && "text-primary")}>{item.icon}</span>
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className={cn("border-t border-border p-3 space-y-2", collapsed && "px-2")}>
          {!collapsed && user && (
            <div className="px-2 py-1">
              <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className={cn("w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10", collapsed && "px-2")}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            {!collapsed && <span className="ml-2 text-xs">Cerrar sesión</span>}
          </Button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-[calc(var(--sidebar-w)-12px)] top-20 w-6 h-6 rounded-full bg-border border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors z-10"
          style={{ "--sidebar-w": collapsed ? "64px" : "240px" } as React.CSSProperties}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-foreground">{title || "SongTap"}</h1>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium px-2 py-1 rounded-full border", roleColors[role], "border-current/30 bg-current/10")}>
              {roleLabels[role]}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
