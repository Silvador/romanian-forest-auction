import { Home, PlusCircle, BarChart3, Bell, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { userData } = useAuth();

  const navItems = [
    { icon: Home, label: "Feed", path: "/", testId: "nav-feed" },
    ...(userData?.role === "forest_owner"
      ? [{ icon: PlusCircle, label: "List", path: "/create", testId: "nav-create" }]
      : []
    ),
    { icon: BarChart3, label: "Market", path: "/market", testId: "nav-market" },
    { icon: Bell, label: "Alerts", path: "/notifications", testId: "nav-notifications" },
    { icon: User, label: "Profile", path: "/dashboard", testId: "nav-dashboard" },
  ];

  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 border-r border-border z-50 flex-col items-center py-6 gap-2" style={{background: 'linear-gradient(180deg, rgba(28,28,28,0.88), rgba(18,18,18,0.92))'}}>
        {/* Logo */}
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground text-sm font-bold">🌲</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-sm transition-colors",
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  data-testid={item.testId}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom bar — hidden at lg */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
        <nav className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[60px] rounded-lg transition-colors",
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  data-testid={item.testId}
                >
                  <Icon className={cn("w-6 h-6", isActive && "text-primary")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
