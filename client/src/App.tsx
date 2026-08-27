import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense, type ComponentType, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { Toaster } from "sonner";
import { useAuth } from "./_core/hooks/useAuth";
import SongTapLayout from "./components/SongTapLayout";
import { DashboardLayoutSkeleton } from "./components/DashboardLayoutSkeleton";
import AccessDenied from "./pages/AccessDenied";

import PreviewModeBanner from "./components/PreviewModeBanner";

// Las rutas operativas se cargan bajo demanda, de modo que el portal QR, el
// acceso y cada rol descargan solo el código de la pantalla que necesita.
const Home = lazy(() => import("./pages/Home"));
const ClientPortal = lazy(() => import("./pages/client/ClientPortal"));
const ClientMenu = lazy(() => import("./pages/client/ClientMenu"));
const PrivacyPolicy = lazy(() => import("./pages/client/PrivacyPolicy"));
const Login = lazy(() => import("./pages/Login"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const Profile = lazy(() => import("./pages/Profile"));
const OwnerDashboard = lazy(() => import("./pages/owner/OwnerDashboard"));
const OwnerVenues = lazy(() => import("./pages/owner/OwnerVenues"));
const OwnerUsers = lazy(() => import("./pages/owner/OwnerUsers"));
const OwnerAudit = lazy(() => import("./pages/owner/OwnerAudit"));
const OwnerVenueRequests = lazy(() => import("./pages/owner/OwnerVenueRequests"));
const OwnerNotificationsSettings = lazy(() => import("./pages/owner/OwnerNotificationsSettings"));
const OwnerPreviewMode = lazy(() => import("./pages/owner/OwnerPreviewMode"));
const OwnerGuideContent = lazy(() => import("./pages/owner/OwnerGuideContent"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerMenu = lazy(() => import("./pages/manager/ManagerMenu"));
const ManagerTables = lazy(() => import("./pages/manager/ManagerTables"));
const ManagerStaff = lazy(() => import("./pages/manager/ManagerStaff"));
const ManagerFinance = lazy(() => import("./pages/manager/ManagerFinance"));
const ManagerSettings = lazy(() => import("./pages/manager/ManagerSettings"));
const ManagerActivities = lazy(() => import("./pages/manager/ManagerActivities"));
const ManagerPqrs = lazy(() => import("./pages/manager/ManagerPqrs"));
const ManagerInventory = lazy(() => import("./pages/manager/ManagerInventory"));
const StaffOrders = lazy(() => import("./pages/staff/StaffOrders"));
const StaffMusic = lazy(() => import("./pages/staff/StaffMusic"));
const StaffTables = lazy(() => import("./pages/staff/StaffTables"));
const StaffActivities = lazy(() => import("./pages/staff/StaffActivities"));

function ProfilePageWrapper() {
  const { user } = useAuth();
  const role = user?.role === "owner" ? "owner" : user?.role === "manager" ? "manager" : "staff";
  return (
    <SongTapLayout role={role} title="Mi Perfil">
      <Profile />
    </SongTapLayout>
  );
}

type InternalRole = "owner" | "manager" | "staff" | "user";

export function RoleGate({ allowedRoles, children }: { allowedRoles: InternalRole[]; children: ReactNode }) {
  const { user, actualUser, isAuthenticated, isPreviewMode, loading } = useAuth();
  const [currentPath] = useLocation();
  const isRolePreviewAllowed = Boolean(isPreviewMode && actualUser?.role === "owner" && user && ["manager", "staff"].includes(user.role) && allowedRoles.includes(user.role as InternalRole));
  const isAllowed = Boolean(user && allowedRoles.includes(user.role as InternalRole)) || isRolePreviewAllowed;

  if (loading) return <main className="min-h-screen bg-background" aria-busy="true" aria-label="Verificando acceso" />;
  if (!isAuthenticated || !user || !isAllowed) return <AccessDenied requestedPath={currentPath} />;
  return <>{children}</>;
}

const ownerOnly = (Component: ComponentType) => () => <RoleGate allowedRoles={["owner"]}><Component /></RoleGate>;
const managerOnly = (Component: ComponentType) => () => <RoleGate allowedRoles={["manager"]}><Component /></RoleGate>;
const staffOnly = (Component: ComponentType) => () => <RoleGate allowedRoles={["staff"]}><Component /></RoleGate>;
const signedIn = (Component: ComponentType) => () => <RoleGate allowedRoles={["owner", "manager", "staff", "user"]}><Component /></RoleGate>;

// Las rutas se crean una vez fuera del render. Crear estos wrappers dentro de
// Router cambiaba la identidad del componente ante cada actualización de auth,
// desmontando el panel activo y volviendo a disparar todas sus consultas.
const ProfileRoute = signedIn(ProfilePageWrapper);
const OwnerDashboardRoute = ownerOnly(OwnerDashboard);
const OwnerVenuesRoute = ownerOnly(OwnerVenues);
const OwnerVenueRequestsRoute = ownerOnly(OwnerVenueRequests);
const OwnerUsersRoute = ownerOnly(OwnerUsers);
const OwnerAuditRoute = ownerOnly(OwnerAudit);
const OwnerNotificationsRoute = ownerOnly(OwnerNotificationsSettings);
const OwnerPreviewModeRoute = ownerOnly(OwnerPreviewMode);
const OwnerGuideContentRoute = ownerOnly(OwnerGuideContent);
const ManagerDashboardRoute = managerOnly(ManagerDashboard);
const ManagerMenuRoute = managerOnly(ManagerMenu);
const ManagerTablesRoute = managerOnly(ManagerTables);
const ManagerStaffRoute = managerOnly(ManagerStaff);
const ManagerFinanceRoute = managerOnly(ManagerFinance);
const ManagerSettingsRoute = managerOnly(ManagerSettings);
const ManagerActivitiesRoute = managerOnly(ManagerActivities);
const ManagerPqrsRoute = managerOnly(ManagerPqrs);
const ManagerInventoryRoute = managerOnly(ManagerInventory);
const StaffOrdersRoute = staffOnly(StaffOrders);
const StaffMusicRoute = staffOnly(StaffMusic);
const StaffTablesRoute = staffOnly(StaffTables);
const StaffActivitiesRoute = staffOnly(StaffActivities);
const StaffPqrsRoute = staffOnly(ManagerPqrs);

function Router() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (isAuthenticated && user?.mustChangePassword) return <Suspense fallback={<DashboardLayoutSkeleton />}><ForcePasswordChange /></Suspense>;

  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
    <Switch>
      {/* Landing */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/change-password" component={ForcePasswordChange} />
      <Route path="/access-denied" component={() => <AccessDenied />} />

      {/* Client QR Portal */}
      <Route path="/mesa/:qrToken" component={ClientPortal} />
      <Route path="/menu" component={ClientMenu} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />

      {/* Profile */}
      <Route path="/profile" component={ProfileRoute} />

      {/* Owner */}
      <Route path="/owner" component={OwnerDashboardRoute} />
      <Route path="/owner/venues" component={OwnerVenuesRoute} />
      <Route path="/owner/venue-requests" component={OwnerVenueRequestsRoute} />
      <Route path="/owner/users" component={OwnerUsersRoute} />
      <Route path="/owner/audit" component={OwnerAuditRoute} />
      <Route path="/owner/notifications" component={OwnerNotificationsRoute} />
      <Route path="/owner/test-mode" component={OwnerPreviewModeRoute} />
      <Route path="/owner/guides" component={OwnerGuideContentRoute} />

      {/* Manager */}
      <Route path="/manager" component={ManagerDashboardRoute} />
      <Route path="/manager/dashboard" component={ManagerDashboardRoute} />
      <Route path="/manager/menu" component={ManagerMenuRoute} />
      <Route path="/manager/tables" component={ManagerTablesRoute} />
      <Route path="/manager/staff" component={ManagerStaffRoute} />
      <Route path="/manager/finance" component={ManagerFinanceRoute} />
      <Route path="/manager/settings" component={ManagerSettingsRoute} />
      <Route path="/manager/activities" component={ManagerActivitiesRoute} />
      <Route path="/manager/pqrs" component={ManagerPqrsRoute} />
      <Route path="/manager/inventory" component={ManagerInventoryRoute} />

      {/* Staff */}
      <Route path="/staff" component={StaffOrdersRoute} />
      <Route path="/staff/orders" component={StaffOrdersRoute} />
      <Route path="/staff/music" component={StaffMusicRoute} />
      <Route path="/staff/tables" component={StaffTablesRoute} />
      <Route path="/staff/activities" component={StaffActivitiesRoute} />
      <Route path="/staff/pqrs" component={StaffPqrsRoute} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function ProtectedRouteTransition({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  const previousPath = useRef(path);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isProtectedPath = (value: string) => value === "/profile" || value.startsWith("/owner") || value.startsWith("/manager") || value.startsWith("/staff");

  useLayoutEffect(() => {
    if (previousPath.current === path) return;
    const shouldShowSkeleton = isProtectedPath(previousPath.current) || isProtectedPath(path);
    previousPath.current = path;
    if (!shouldShowSkeleton) return;
    setIsTransitioning(true);
    const timeout = window.setTimeout(() => setIsTransitioning(false), 160);
    return () => window.clearTimeout(timeout);
  }, [path]);

  return isTransitioning ? <DashboardLayoutSkeleton /> : <>{children}</>;
}

function AppToaster() {
  const { theme } = useTheme();
  return <Toaster
    theme={theme}
    toastOptions={{
      style: theme === "dark"
        ? { background: "oklch(0.14 0.005 240)", border: "1px solid oklch(0.22 0.005 240)", color: "oklch(0.97 0.005 240)" }
        : { background: "oklch(0.99 0.004 145)", border: "1px solid oklch(0.84 0.01 145)", color: "oklch(0.20 0.02 145)" },
    }}
  />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <AppToaster />
          <PreviewModeBanner />
          <ProtectedRouteTransition><Router /></ProtectedRouteTransition>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
