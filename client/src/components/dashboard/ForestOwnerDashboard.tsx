import { useQuery } from "@tanstack/react-query";
import { Auction } from "@shared/schema";
import { StatCard } from "./StatCard";
import { DashboardCard } from "./DashboardCard";
import { AuctionStatusBadge } from "./AuctionStatusBadge";
import { Gavel, TrendingUp, Award, BarChart3, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPricePerM3, formatVolume, formatPrice } from "@/utils/formatters";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PerformanceStats {
  totalAuctions: number;
  activeAuctions: number;
  completedAuctions: number;
  totalBids: number;
  avgBidsPerAuction: number;
  avgPricePerM3: number;
  successRate: number;
}

export function ForestOwnerDashboard() {
  const { data: myAuctions, isLoading: auctionsLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions/my-listings"],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PerformanceStats>({
    queryKey: ["/api/auctions/performance-stats"],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const activeAuctions = myAuctions?.filter(a => a.status === "active") || [];
  const upcomingAuctions = myAuctions?.filter(a => a.status === "upcoming") || [];
  const completedAuctions = myAuctions?.filter(a => a.status === "ended" || a.status === "sold") || [];

  const isLoading = auctionsLoading || statsLoading;

  return (
    <div className="space-y-8">
      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Auctions"
              value={stats?.totalAuctions || 0}
              description={`${stats?.activeAuctions || 0} active`}
              icon={Gavel}
            />
            <StatCard
              title="Avg. Bids/Auction"
              value={stats?.avgBidsPerAuction || 0}
              description="Engagement metric"
              icon={TrendingUp}
            />
            <StatCard
              title="Avg. Price/m³"
              value={formatPricePerM3(stats?.avgPricePerM3 || 0)}
              description="Completed auctions"
              icon={Award}
            />
            <StatCard
              title="Success Rate"
              value={`${stats?.successRate || 0}%`}
              description="Sold vs. total"
              icon={BarChart3}
            />
          </>
        )}
      </div>

      {/* My Auctions with Tabs */}
      <DashboardCard title="My Auctions" description="Manage your timber listings">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active" data-testid="tab-active-auctions">
              Active ({activeAuctions.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming-auctions">
              Upcoming ({upcomingAuctions.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-auctions">
              Completed ({completedAuctions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4" data-testid="content-active-auctions">
            {isLoading ? (
              <AuctionTableSkeleton />
            ) : activeAuctions.length === 0 ? (
              <EmptyState 
                icon={Gavel}
                title="No active auctions"
                description="Your active listings will appear here"
              />
            ) : (
              <AuctionTable auctions={activeAuctions} />
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4" data-testid="content-upcoming-auctions">
            {isLoading ? (
              <AuctionTableSkeleton />
            ) : upcomingAuctions.length === 0 ? (
              <EmptyState 
                icon={Gavel}
                title="No upcoming auctions"
                description="Your scheduled auctions will appear here"
              />
            ) : (
              <AuctionTable auctions={upcomingAuctions} />
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4" data-testid="content-completed-auctions">
            {isLoading ? (
              <AuctionTableSkeleton />
            ) : completedAuctions.length === 0 ? (
              <EmptyState 
                icon={Award}
                title="No completed auctions"
                description="Your completed auctions will appear here"
              />
            ) : (
              <AuctionTable auctions={completedAuctions} showWinner />
            )}
          </TabsContent>
        </Tabs>
      </DashboardCard>
    </div>
  );
}

function AuctionTable({ auctions, showWinner = false }: { auctions: Auction[], showWinner?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Auction</th>
            <th className="pb-3 font-medium">Volume</th>
            <th className="pb-3 font-medium">Current Price</th>
            <th className="pb-3 font-medium">Bids</th>
            <th className="pb-3 font-medium">Status</th>
            {showWinner && <th className="pb-3 font-medium">Winner</th>}
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {auctions.map((auction) => {
            const pricePerM3 = auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0;
            const totalValue = auction.projectedTotalValue ?? (pricePerM3 * (auction.volumeM3 || 0));
            
            return (
              <tr key={auction.id} className="group" data-testid={`row-auction-${auction.id}`}>
                <td className="py-4">
                  <div>
                    <p className="font-medium" data-testid={`text-title-${auction.id}`}>{auction.title}</p>
                    <p className="text-sm text-muted-foreground">{auction.location}</p>
                  </div>
                </td>
                <td className="py-4" data-testid={`text-volume-${auction.id}`}>
                  {formatVolume(auction.volumeM3)}
                </td>
                <td className="py-4">
                  <div>
                    <p className="font-semibold" data-testid={`text-price-${auction.id}`}>
                      {formatPricePerM3(pricePerM3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(totalValue)} total
                    </p>
                  </div>
                </td>
                <td className="py-4" data-testid={`text-bids-${auction.id}`}>
                  {auction.bidCount || 0}
                </td>
                <td className="py-4">
                  <AuctionStatusBadge status={auction.status as any} />
                </td>
                {showWinner && (
                  <td className="py-4">
                    {auction.currentBidderName ? (
                      <div>
                        <p className="text-sm font-medium">{auction.currentBidderName}</p>
                        <p className="text-xs text-muted-foreground">{auction.currentBidderAnonymousId || 'N/A'}</p>
                      </div>
                    ) : (
                      <Badge variant="outline">No winner</Badge>
                    )}
                  </td>
                )}
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/auction/${auction.id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                        data-testid={`button-view-${auction.id}`}
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/auction/${auction.id}#bids`}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-bids-${auction.id}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuctionTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
