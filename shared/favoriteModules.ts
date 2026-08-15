export type FavoriteModuleRole = "owner" | "manager" | "staff";

export type FavoriteModuleDefinition = {
  key: string;
  label: string;
  href: string;
};

export const favoriteModulesByRole: Record<FavoriteModuleRole, FavoriteModuleDefinition[]> = {
  owner: [
    { key: "owner.venues", label: "Locales", href: "/owner/venues" },
    { key: "owner.requests", label: "Solicitudes", href: "/owner/venue-requests" },
    { key: "owner.notifications", label: "Notificaciones", href: "/owner/notifications" },
    { key: "owner.users", label: "Usuarios", href: "/owner/users" },
    { key: "owner.audit", label: "Auditoría", href: "/owner/audit" },
  ],
  manager: [
    { key: "manager.menu", label: "Menú", href: "/manager/menu" },
    { key: "manager.tables", label: "Mesas y QR", href: "/manager/tables" },
    { key: "manager.staff", label: "Personal", href: "/manager/staff" },
    { key: "manager.activities", label: "Actividades", href: "/manager/activities" },
    { key: "manager.pqrs", label: "PQRS", href: "/manager/pqrs" },
    { key: "manager.finance", label: "Finanzas", href: "/manager/finance" },
  ],
  staff: [
    { key: "staff.orders", label: "Pedidos", href: "/staff" },
    { key: "staff.tables", label: "Mesas", href: "/staff/tables" },
    { key: "staff.music", label: "Música", href: "/staff/music" },
    { key: "staff.activities", label: "Mis actividades", href: "/staff/activities" },
    { key: "staff.pqrs", label: "PQRS", href: "/staff/pqrs" },
  ],
};

export function isFavoriteModuleAllowed(role: string, moduleKey: string) {
  if (!(role in favoriteModulesByRole)) return false;
  return favoriteModulesByRole[role as FavoriteModuleRole].some((module) => module.key === moduleKey);
}
