import { useQuery } from "@tanstack/react-query";
import { Auction } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Gavel, Plus } from "lucide-react";
import { Link } from "wouter";
import { ForestOwnerDashboard, BuyerDashboard } from "@/components/dashboard";

export default function DashboardPage() {
  const { userData, signOut } = useAuth();

  if (!userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please sign in to view your dashboard</h2>
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isForestOwner = userData.role === "forest_owner";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
              {isForestOwner ? "Forest Owner Dashboard" : "Buyer Dashboard"}
            </h1>
            <div className="flex items-center gap-2">
              {isForestOwner && (
                <Link href="/create-listing">
                  <Button variant="default" className="gap-2" data-testid="button-create-listing">
                    <Plus className="w-4 h-4" />
                    Create Listing
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => signOut()}
                className="gap-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground" data-testid="text-user-name">{userData.displayName}</p>
            <span className="text-xs text-muted-foreground">•</span>
            <p className="text-sm text-muted-foreground capitalize" data-testid="text-user-role">
              {userData.role.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Role-specific dashboard content */}
        {isForestOwner ? <ForestOwnerDashboard /> : <BuyerDashboard />}

        {/* Browse auctions CTA for buyers */}
        {!isForestOwner && (
          <div className="mt-8 text-center">
            <Link href="/">
              <Button variant="outline" className="gap-2" data-testid="button-browse-auctions">
                <Gavel className="w-4 h-4" />
                Browse All Auctions
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
