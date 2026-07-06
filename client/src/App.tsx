import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import ClientPortal from "./pages/client/ClientPortal";
import ClientMenu from "./pages/client/ClientMenu";

// Auth
import Login from "./pages/Login";

// Owner pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerVenues from "./pages/owner/OwnerVenues";
import OwnerUsers from "./pages/owner/OwnerUsers";
import OwnerAudit from "./pages/owner/OwnerAudit";

// Manager pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerMenu from "./pages/manager/ManagerMenu";
import ManagerTables from "./pages/manager/ManagerTables";
import ManagerStaff from "./pages/manager/ManagerStaff";
import ManagerFinance from "./pages/manager/ManagerFinance";
import ManagerSettings from "./pages/manager/ManagerSettings";

// Staff pages
import StaffOrders from "./pages/staff/StaffOrders";
import StaffMusic from "./pages/staff/StaffMusic";
import StaffTables from "./pages/staff/StaffTables";

function Router() {
  return (
    <Switch>
      {/* Landing */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* Client QR Portal */}
      <Route path="/mesa/:qrToken" component={ClientPortal} />
      <Route path="/menu" component={ClientMenu} />

      {/* Owner */}
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/owner/venues" component={OwnerVenues} />
      <Route path="/owner/users" component={OwnerUsers} />
      <Route path="/owner/audit" component={OwnerAudit} />

      {/* Manager */}
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/menu" component={ManagerMenu} />
      <Route path="/manager/tables" component={ManagerTables} />
      <Route path="/manager/staff" component={ManagerStaff} />
      <Route path="/manager/finance" component={ManagerFinance} />
      <Route path="/manager/settings" component={ManagerSettings} />

      {/* Staff */}
      <Route path="/staff" component={StaffOrders} />
      <Route path="/staff/music" component={StaffMusic} />
      <Route path="/staff/tables" component={StaffTables} />

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
