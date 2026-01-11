import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Auction, AuctionFilters } from "@shared/schema";
import { DualViewAuctionFeed } from "@/components/auction-feed";
import { AuctionFilterPanel } from "@/components/AuctionFilterPanel";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useFeedUpdates, useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { userData } = useAuth();
  const [filters, setFilters] = useState<AuctionFilters>({});

  const { connected } = useWebSocket();
  const { onBidNew } = useFeedUpdates();

  const { data: allAuctions, isLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions/feed"],
    enabled: !!userData,
    // Removed refetchInterval - using WebSocket for real-time updates
    // Fallback to occasional polling if WebSocket disconnected
    refetchInterval: connected ? false : 10000,
  });

  // ===== WEBSOCKET REAL-TIME FEED UPDATES =====
  useEffect(() => {
    const cleanup = onBidNew((data) => {
      console.log('[WebSocket] Feed bid update:', data);

      // Update specific auction in feed cache
      queryClient.setQueryData(['/api/auctions/feed'], (old: Auction[] | undefined) => {
        if (!old) return old;

        return old.map(auction =>
          auction.id === String(data.auctionId)
            ? {
                ...auction,
                currentPricePerM3: data.currentPricePerM3,
                bidCount: data.bidCount,
              }
            : auction
        );
      });
    });

    return cleanup;
  }, [onBidNew]);

  // Apply filters and sorting client-side
  const auctions = useMemo(() => {
    if (!allAuctions) return undefined;

    let filtered = allAuctions
      .filter(a => a.status === "active" || a.status === "upcoming");

    // Apply filters
    if (filters.region) {
      filtered = filtered.filter(a => a.region === filters.region);
    }

    if (filters.species) {
      filtered = filtered.filter(a =>
        a.speciesBreakdown.some(s => s.species === filters.species)
      );
    }

    if (filters.minVolume !== undefined) {
      filtered = filtered.filter(a => a.volumeM3 >= filters.minVolume!);
    }

    if (filters.maxVolume !== undefined) {
      filtered = filtered.filter(a => a.volumeM3 <= filters.maxVolume!);
    }

    if (filters.minDiameter !== undefined && filters.minDiameter > 0) {
      filtered = filtered.filter(a =>
        a.apvAverageDiameter !== undefined && a.apvAverageDiameter >= filters.minDiameter!
      );
    }

    if (filters.maxDiameter !== undefined && filters.maxDiameter > 0) {
      filtered = filtered.filter(a =>
        a.apvAverageDiameter !== undefined && a.apvAverageDiameter <= filters.maxDiameter!
      );
    }

    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(a => a.currentPricePerM3 >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(a => a.currentPricePerM3 <= filters.maxPrice!);
    }

    if (filters.treatmentType && filters.treatmentType.trim()) {
      const searchTerm = filters.treatmentType.toLowerCase();
      filtered = filtered.filter(a =>
        a.apvTreatmentType?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    const sortBy = filters.sortBy || "endTime";

    switch (sortBy) {
      case "volumeAsc":
        filtered.sort((a, b) => a.volumeM3 - b.volumeM3);
        break;
      case "volumeDesc":
        filtered.sort((a, b) => b.volumeM3 - a.volumeM3);
        break;
      case "priceAsc":
        filtered.sort((a, b) => a.currentPricePerM3 - b.currentPricePerM3);
        break;
      case "priceDesc":
        filtered.sort((a, b) => b.currentPricePerM3 - a.currentPricePerM3);
        break;
      case "endTime":
      default:
        filtered.sort((a, b) => a.endTime - b.endTime);
        break;
    }

    return filtered;
  }, [allAuctions, filters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Live Auctions</h1>
              <p className="text-sm text-muted-foreground">
                {auctions?.length || 0} active listings
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationCenter />
              {userData?.role === "forest_owner" && (
                <Link href="/create">
                  <Button size="default" className="gap-2" data-testid="button-create-listing">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Listing</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          <AuctionFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={allAuctions?.filter(a => a.status === "active" || a.status === "upcoming").length || 0}
            filteredCount={auctions?.length || 0}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : auctions && auctions.length > 0 ? (
          <DualViewAuctionFeed auctions={auctions} />
        ) : (
          <div className="text-center py-16">
            <Filter className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No auctions found</h3>
            <p className="text-muted-foreground mb-6">
              {Object.keys(filters).some(key => key !== 'sortBy' && filters[key as keyof AuctionFilters])
                ? "Try adjusting your filters or clear them to see all auctions"
                : "Be the first to create a listing"}
            </p>
            {userData?.role === "forest_owner" && (
              <Link href="/create">
                <Button>Create Listing</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
