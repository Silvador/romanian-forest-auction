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
      ? [{ icon: PlusCircle, label: "Create", path: "/create", testId: "nav-create" }]
      : []
    ),
    { icon: BarChart3, label: "Market", path: "/market", testId: "nav-market" },
    { icon: Bell, label: "Alerts", path: "/notifications", testId: "nav-notifications" },
    { icon: User, label: "Profile", path: "/dashboard", testId: "nav-dashboard" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <nav className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[60px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
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
  );
}
