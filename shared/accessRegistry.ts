export type SongTapRole = "owner" | "manager" | "staff" | "user";

export type ProtectedRouteMetadata = {
  moduleName: string;
  allowedRoles: SongTapRole[];
};

export const protectedRouteRegistry: Record<string, ProtectedRouteMetadata> = {
  "/profile": { moduleName: "Mi perfil", allowedRoles: ["owner", "manager", "staff", "user"] },
  "/owner": { moduleName: "Panel Owner", allowedRoles: ["owner"] },
  "/owner/venues": { moduleName: "Locales", allowedRoles: ["owner"] },
  "/owner/venue-requests": { moduleName: "Solicitudes de locales", allowedRoles: ["owner"] },
  "/owner/users": { moduleName: "Usuarios", allowedRoles: ["owner"] },
  "/owner/audit": { moduleName: "Auditoría del sistema", allowedRoles: ["owner"] },
  "/owner/notifications": { moduleName: "Notificaciones", allowedRoles: ["owner"] },
  "/manager": { moduleName: "Panel Manager", allowedRoles: ["manager"] },
  "/manager/dashboard": { moduleName: "Dashboard Manager", allowedRoles: ["manager"] },
  "/manager/menu": { moduleName: "Gestión de menú", allowedRoles: ["manager"] },
  "/manager/tables": { moduleName: "Gestión de mesas", allowedRoles: ["manager"] },
  "/manager/staff": { moduleName: "Equipo", allowedRoles: ["manager"] },
  "/manager/finance": { moduleName: "Finanzas", allowedRoles: ["manager"] },
  "/manager/settings": { moduleName: "Configuración del local", allowedRoles: ["manager"] },
  "/manager/activities": { moduleName: "Actividades", allowedRoles: ["manager"] },
  "/manager/pqrs": { moduleName: "PQRS", allowedRoles: ["manager"] },
  "/staff": { moduleName: "Pedidos", allowedRoles: ["staff"] },
  "/staff/orders": { moduleName: "Pedidos", allowedRoles: ["staff"] },
  "/staff/music": { moduleName: "Control de música", allowedRoles: ["staff"] },
  "/staff/tables": { moduleName: "Mesas", allowedRoles: ["staff"] },
  "/staff/activities": { moduleName: "Mis actividades", allowedRoles: ["staff"] },
  "/staff/pqrs": { moduleName: "PQRS", allowedRoles: ["staff"] },
};

export function getProtectedRouteMetadata(path: string) {
  const pathname = path.split("?")[0] || path;
  return protectedRouteRegistry[pathname];
}
