import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { type ReactNode } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "sonner";
import { useAuth } from "./_core/hooks/useAuth";
import SongTapLayout from "./components/SongTapLayout";

// Public pages
import Home from "./pages/Home";
import ClientPortal from "./pages/client/ClientPortal";
import ClientMenu from "./pages/client/ClientMenu";
import PrivacyPolicy from "./pages/client/PrivacyPolicy";

// Auth
import Login from "./pages/Login";
import ForcePasswordChange from "./pages/ForcePasswordChange";
import AccessDenied from "./pages/AccessDenied";

// Profile Page
import Profile from "./pages/Profile";

// Owner pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerVenues from "./pages/owner/OwnerVenues";
import OwnerUsers from "./pages/owner/OwnerUsers";
import OwnerAudit from "./pages/owner/OwnerAudit";
import OwnerVenueRequests from "./pages/owner/OwnerVenueRequests";
import OwnerNotificationsSettings from "./pages/owner/OwnerNotificationsSettings";

// Manager pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerMenu from "./pages/manager/ManagerMenu";
import ManagerTables from "./pages/manager/ManagerTables";
import ManagerStaff from "./pages/manager/ManagerStaff";
import ManagerFinance from "./pages/manager/ManagerFinance";
import ManagerSettings from "./pages/manager/ManagerSettings";
import ManagerActivities from "./pages/manager/ManagerActivities";
import ManagerPqrs from "./pages/manager/ManagerPqrs";

// Staff pages
import StaffOrders from "./pages/staff/StaffOrders";
import StaffMusic from "./pages/staff/StaffMusic";
import StaffTables from "./pages/staff/StaffTables";
import StaffActivities from "./pages/staff/StaffActivities";

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
  const { user, isAuthenticated, loading } = useAuth();
  const isAllowed = Boolean(user && allowedRoles.includes(user.role as InternalRole));

  if (loading) return <main className="min-h-screen bg-background" aria-busy="true" aria-label="Verificando acceso" />;
  if (!isAuthenticated || !user || !isAllowed) return <AccessDenied />;
  return <>{children}</>;
}

const ownerOnly = (Component: () => ReactNode) => () => <RoleGate allowedRoles={["owner"]}><Component /></RoleGate>;
const managerOnly = (Component: () => ReactNode) => () => <RoleGate allowedRoles={["manager"]}><Component /></RoleGate>;
const staffOnly = (Component: () => ReactNode) => () => <RoleGate allowedRoles={["staff"]}><Component /></RoleGate>;
const signedIn = (Component: () => ReactNode) => () => <RoleGate allowedRoles={["owner", "manager", "staff", "user"]}><Component /></RoleGate>;

function Router() {
  const { user, isAuthenticated, loading } = useAuth();
  if (!loading && isAuthenticated && user?.mustChangePassword) return <ForcePasswordChange />;

  return (
    <Switch>
      {/* Landing */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/change-password" component={ForcePasswordChange} />
      <Route path="/access-denied" component={AccessDenied} />

      {/* Client QR Portal */}
      <Route path="/mesa/:qrToken" component={ClientPortal} />
      <Route path="/menu" component={ClientMenu} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />

      {/* Profile */}
      <Route path="/profile" component={signedIn(ProfilePageWrapper)} />

      {/* Owner */}
      <Route path="/owner" component={ownerOnly(OwnerDashboard)} />
      <Route path="/owner/venues" component={ownerOnly(OwnerVenues)} />
      <Route path="/owner/venue-requests" component={ownerOnly(OwnerVenueRequests)} />
      <Route path="/owner/users" component={ownerOnly(OwnerUsers)} />
      <Route path="/owner/audit" component={ownerOnly(OwnerAudit)} />
      <Route path="/owner/notifications" component={ownerOnly(OwnerNotificationsSettings)} />

      {/* Manager */}
      <Route path="/manager" component={managerOnly(ManagerDashboard)} />
      <Route path="/manager/dashboard" component={managerOnly(ManagerDashboard)} />
      <Route path="/manager/menu" component={managerOnly(ManagerMenu)} />
      <Route path="/manager/tables" component={managerOnly(ManagerTables)} />
      <Route path="/manager/staff" component={managerOnly(ManagerStaff)} />
      <Route path="/manager/finance" component={managerOnly(ManagerFinance)} />
      <Route path="/manager/settings" component={managerOnly(ManagerSettings)} />
      <Route path="/manager/activities" component={managerOnly(ManagerActivities)} />
      <Route path="/manager/pqrs" component={managerOnly(ManagerPqrs)} />

      {/* Staff */}
      <Route path="/staff" component={staffOnly(StaffOrders)} />
      <Route path="/staff/orders" component={staffOnly(StaffOrders)} />
      <Route path="/staff/music" component={staffOnly(StaffMusic)} />
      <Route path="/staff/tables" component={staffOnly(StaffTables)} />
      <Route path="/staff/activities" component={staffOnly(StaffActivities)} />
      <Route path="/staff/pqrs" component={staffOnly(ManagerPqrs)} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.005 240)",
                border: "1px solid oklch(0.22 0.005 240)",
                color: "oklch(0.97 0.005 240)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
