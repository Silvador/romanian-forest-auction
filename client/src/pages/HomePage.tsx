import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Auction, AuctionFilters } from "@shared/schema";
import { DualViewAuctionFeed } from "@/components/auction-feed";
import { AuctionFilterPanel } from "@/components/AuctionFilterPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3, TrendingUp, TreeDeciduous, Clock } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useFeedUpdates, useWebSocket } from "@/hooks/useWebSocket";
import { queryClient } from "@/lib/queryClient";

type FeedTab = "live" | "completed";

export default function HomePage() {
  const { userData } = useAuth();
  const [tab, setTab] = useState<FeedTab>("live");
  const [filters, setFilters] = useState<AuctionFilters>({});

  const { connected } = useWebSocket();
  const { onBidNew } = useFeedUpdates();

  const { data: allAuctions, isLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions/feed"],
    enabled: !!userData,
    refetchInterval: connected ? false : 10000,
  });

  // ===== WEBSOCKET REAL-TIME FEED UPDATES =====
  useEffect(() => {
    const cleanup = onBidNew((data) => {
      console.log('[WebSocket] Feed bid update:', data);
      queryClient.setQueryData(['/api/auctions/feed'], (old: Auction[] | undefined) => {
        if (!old) return old;
        return old.map(auction =>
          auction.id === String(data.auctionId)
            ? { ...auction, currentPricePerM3: data.currentPricePerM3, bidCount: data.bidCount }
            : auction
        );
      });
    });
    return cleanup;
  }, [onBidNew]);

  // Unfiltered counts for tab badges
  const liveCount = useMemo(
    () => allAuctions?.filter(a => a.status === "active" || a.status === "upcoming").length || 0,
    [allAuctions]
  );
  const completedCount = useMemo(
    () => allAuctions?.filter(a => a.status === "ended" || a.status === "sold").length || 0,
    [allAuctions]
  );

  // Apply filters to the active tab's auction list
  const applyFilters = (list: Auction[], defaultSort: "endTimeAsc" | "endTimeDesc") => {
    let filtered = [...list];

    if (filters.region) filtered = filtered.filter(a => a.region === filters.region);
    if (filters.species) filtered = filtered.filter(a => a.speciesBreakdown.some(s => s.species === filters.species));
    if (filters.minVolume !== undefined) filtered = filtered.filter(a => a.volumeM3 >= filters.minVolume!);
    if (filters.maxVolume !== undefined) filtered = filtered.filter(a => a.volumeM3 <= filters.maxVolume!);
    if (filters.minDiameter !== undefined && filters.minDiameter > 0) filtered = filtered.filter(a => a.apvAverageDiameter !== undefined && a.apvAverageDiameter >= filters.minDiameter!);
    if (filters.maxDiameter !== undefined && filters.maxDiameter > 0) filtered = filtered.filter(a => a.apvAverageDiameter !== undefined && a.apvAverageDiameter <= filters.maxDiameter!);
    if (filters.minPrice !== undefined) filtered = filtered.filter(a => a.currentPricePerM3 >= filters.minPrice!);
    if (filters.maxPrice !== undefined) filtered = filtered.filter(a => a.currentPricePerM3 <= filters.maxPrice!);
    if (filters.treatmentType?.trim()) {
      const searchTerm = filters.treatmentType.toLowerCase();
      filtered = filtered.filter(a => a.apvTreatmentType?.toLowerCase().includes(searchTerm));
    }

    const sortBy = filters.sortBy || (defaultSort === "endTimeAsc" ? "endTime" : "endTimeDesc");
    switch (sortBy) {
      case "volumeAsc": filtered.sort((a, b) => a.volumeM3 - b.volumeM3); break;
      case "volumeDesc": filtered.sort((a, b) => b.volumeM3 - a.volumeM3); break;
      case "priceAsc": filtered.sort((a, b) => a.currentPricePerM3 - b.currentPricePerM3); break;
      case "priceDesc": filtered.sort((a, b) => b.currentPricePerM3 - a.currentPricePerM3); break;
      case "endTimeDesc": filtered.sort((a, b) => b.endTime - a.endTime); break;
      case "endTime":
      default: filtered.sort((a, b) => a.endTime - b.endTime); break;
    }
    return filtered;
  };

  const liveAuctions = useMemo(() => {
    if (!allAuctions) return undefined;
    return applyFilters(
      allAuctions.filter(a => a.status === "active" || a.status === "upcoming"),
      "endTimeAsc"
    );
  }, [allAuctions, filters]);

  const completedAuctions = useMemo(() => {
    if (!allAuctions) return undefined;
    return applyFilters(
      allAuctions.filter(a => a.status === "ended" || a.status === "sold"),
      "endTimeDesc"
    );
  }, [allAuctions, filters]);

  const auctions = tab === "live" ? liveAuctions : completedAuctions;
  const isCompleted = tab === "completed";
  const totalCount = tab === "live" ? liveCount : completedCount;
  const hasActiveFilters = Object.keys(filters).some(key => key !== 'sortBy' && filters[key as keyof AuctionFilters]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Auctions</h1>
              <p className="text-sm text-muted-foreground">
                {auctions?.length || 0} {isCompleted ? "completed" : "active"} listings
              </p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationCenter />
              {userData?.role === "forest_owner" && (
                <Link href="/create">
                  <Button size="default" className="gap-2" data-testid="button-create-listing">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">List Timber</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Tab Switcher */}
          <Tabs value={tab} onValueChange={(v) => { setTab(v as FeedTab); setFilters({}); }} className="mb-4">
            <TabsList>
              <TabsTrigger value="live">Live ({liveCount})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter Panel */}
          <AuctionFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={totalCount}
            filteredCount={auctions?.length || 0}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="py-2">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border">
              <Skeleton className="col-span-4 h-4 w-24" />
              <Skeleton className="col-span-2 h-4 w-16" />
              <Skeleton className="col-span-2 h-4 w-20" />
              <Skeleton className="col-span-1 h-4 w-8 mx-auto" />
              <Skeleton className="col-span-3 h-4 w-12 ml-auto" />
            </div>
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className="grid grid-cols-12 gap-2 px-4 py-4 border-b border-border"
              >
                <div className="col-span-4 flex items-center gap-3">
                  <Skeleton className="h-6 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="col-span-2 flex flex-col justify-center gap-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="col-span-2 flex flex-col justify-center gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <div className="col-span-3 flex items-center justify-end">
                  <Skeleton className="h-4 w-16" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : auctions && auctions.length > 0 ? (
          <>
            <DualViewAuctionFeed auctions={auctions} isCompleted={isCompleted} />
            {/* Market Snapshot — only on Live tab with few auctions */}
            {!isCompleted && auctions.length <= 3 && (
              <motion.div
                className="px-4 py-6 border-t border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Market Snapshot</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: <BarChart3 className="w-4 h-4" />, label: "Active", value: liveCount, sub: "live auctions" },
                    { icon: <TrendingUp className="w-4 h-4" />, label: "Avg Price", value: liveAuctions && liveAuctions.length > 0 ? `€${Math.round(liveAuctions.reduce((s, a) => s + (a.currentPricePerM3 || 0), 0) / liveAuctions.length).toLocaleString('de-DE')}` : '—', sub: "per m³" },
                    { icon: <TreeDeciduous className="w-4 h-4" />, label: "Volume", value: `${(liveAuctions || []).reduce((s, a) => s + (a.volumeM3 || 0), 0).toLocaleString('de-DE')} m³`, sub: "total listed" },
                    { icon: <Clock className="w-4 h-4" />, label: "Total Bids", value: (liveAuctions || []).reduce((s, a) => s + (a.bidCount || 0), 0), sub: "across all auctions" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.06, duration: 0.35, ease: "easeOut" }}
                    >
                      <Card className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          {stat.icon}
                          <span className="text-xs font-medium uppercase">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.sub}</div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                <Link href="/market">
                  <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View full market dashboard
                  </Button>
                </Link>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            className="text-center py-20 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
              <TreeDeciduous className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {hasActiveFilters
                ? "No matching auctions"
                : isCompleted
                  ? "No completed auctions yet"
                  : "No live auctions right now"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your filters to broaden your search"
                : isCompleted
                  ? "Auctions will appear here once they end."
                  : "New timber lots are listed regularly. Check back soon or create your own listing."}
            </p>
            <div className="flex items-center justify-center gap-3">
              {!isCompleted && userData?.role === "forest_owner" && (
                <Link href="/create">
                  <Button>List Timber</Button>
                </Link>
              )}
              <Link href="/market">
                <Button variant="outline">View Market Data</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
