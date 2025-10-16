import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import HomePage from "@/pages/HomePage";
import AuctionDetailPage from "@/pages/AuctionDetailPage";
import CreateListingPage from "@/pages/CreateListingPage";
import DashboardPage from "@/pages/DashboardPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MarketPage from "@/pages/MarketPage";
import DiagnosticsPage from "@/pages/DiagnosticsPage";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  return (
    <>
      <Component />
      <BottomNav />
    </>
  );
}

function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <PublicRoute component={LoginPage} />} />
      <Route path="/signup" component={() => <PublicRoute component={SignupPage} />} />
      <Route path="/" component={() => <ProtectedRoute component={HomePage} />} />
      <Route path="/auction/:id" component={() => <ProtectedRoute component={AuctionDetailPage} />} />
      <Route path="/create" component={() => <ProtectedRoute component={CreateListingPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route path="/market" component={() => <ProtectedRoute component={MarketPage} />} />
      <Route path="/diagnostics" component={DiagnosticsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
