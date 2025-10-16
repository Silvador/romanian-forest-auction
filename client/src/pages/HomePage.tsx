import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Auction, AuctionFilters, regions, speciesTypes } from "@shared/schema";
import { DualViewAuctionFeed } from "@/components/auction-feed";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationCenter } from "@/components/NotificationCenter";

export default function HomePage() {
  const { userData } = useAuth();
  const [filters, setFilters] = useState<AuctionFilters>({});

  const { data: allAuctions, isLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions/feed"],
    enabled: !!userData,
  });

  // Apply filters and sorting client-side
  const auctions = allAuctions
    ?.filter(a => a.status === "active" || a.status === "upcoming")
    .filter(a => !filters.region || a.region === filters.region)
    .filter(a => !filters.species || a.speciesBreakdown.some(s => s.species === filters.species))
    .sort((a, b) => a.endTime - b.endTime);

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

          <div className="flex flex-wrap gap-3">
            <Select
              value={filters.region || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, region: value === "all" ? undefined : value as any }))}
            >
              <SelectTrigger className="w-[160px]" data-testid="select-region">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.species || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, species: value === "all" ? undefined : value as any }))}
            >
              <SelectTrigger className="w-[160px]" data-testid="select-species">
                <SelectValue placeholder="All Species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Species</SelectItem>
                {speciesTypes.map(species => (
                  <SelectItem key={species} value={species}>{species}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filters.region || filters.species) && (
              <Button
                variant="outline"
                size="default"
                onClick={() => setFilters({})}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
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
              {filters.region || filters.species 
                ? "Try adjusting your filters" 
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
