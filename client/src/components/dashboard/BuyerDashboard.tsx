import { useQuery } from "@tanstack/react-query";
import { Auction } from "@shared/schema";
import { StatCard } from "./StatCard";
import { DashboardCard } from "./DashboardCard";
import { AuctionStatusBadge } from "./AuctionStatusBadge";
import { Gavel, TrendingUp, Award, BarChart3, Eye, AlertCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPricePerM3, formatVolume, formatPrice } from "@/utils/formatters";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface BidWithAuction {
  auction: Auction;
  latestBid: any;
  isLeading: boolean;
  bidCount: number;
}

export function BuyerDashboard() {
  const { data: myBids, isLoading: bidsLoading } = useQuery<BidWithAuction[]>({
    queryKey: ["/api/bids/my-bids"],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const { data: wonAuctions, isLoading: wonLoading } = useQuery<Auction[]>({
    queryKey: ["/api/auctions/won"],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const { data: watchlistAuctions, isLoading: watchlistLoading } = useQuery<Auction[]>({
    queryKey: ["/api/watchlist"],
    refetchInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  // Calculate buyer stats
  const totalBids = myBids?.reduce((sum, b) => sum + b.bidCount, 0) || 0;
  const activeBids = myBids?.filter(b => b.auction.status === "active").length || 0;
  const leadingBids = myBids?.filter(b => b.isLeading && b.auction.status === "active").length || 0;
  const totalWon = wonAuctions?.length || 0;
  const winRate = totalBids > 0 ? ((totalWon / totalBids) * 100).toFixed(1) : 0;

  const totalVolumePurchased = wonAuctions?.reduce((sum, a) => sum + a.volumeM3, 0) || 0;
  const avgPricePaid = wonAuctions && wonAuctions.length > 0
    ? wonAuctions.reduce((sum, a) => sum + (a.currentPricePerM3 || 0), 0) / wonAuctions.length
    : 0;

  const isLoading = bidsLoading || wonLoading || watchlistLoading;

  return (
    <div className="space-y-8">
      {/* Buyer Stats */}
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
              title="Active Bids"
              value={activeBids}
              description={`${leadingBids} leading`}
              icon={Gavel}
            />
            <StatCard
              title="Auctions Won"
              value={totalWon}
              description={`${winRate}% win rate`}
              icon={Trophy}
            />
            <StatCard
              title="Volume Purchased"
              value={formatVolume(totalVolumePurchased)}
              description="Total m³ won"
              icon={BarChart3}
            />
            <StatCard
              title="Avg. Price Paid"
              value={formatPricePerM3(avgPricePaid)}
              description="Per m³"
              icon={Award}
            />
          </>
        )}
      </div>

      {/* Bids & Won Auctions */}
      <DashboardCard title="My Activity" description="Track your bids, watchlist, and won auctions">
        <Tabs defaultValue="active-bids" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active-bids" data-testid="tab-active-bids">
              Active Bids ({activeBids})
            </TabsTrigger>
            <TabsTrigger value="watchlist" data-testid="tab-watchlist">
              Watchlist ({watchlistAuctions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="won-auctions" data-testid="tab-won-auctions">
              Won Auctions ({totalWon})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active-bids" className="space-y-4" data-testid="content-active-bids">
            {isLoading ? (
              <BidTableSkeleton />
            ) : !myBids || myBids.length === 0 ? (
              <EmptyState 
                icon={Gavel}
                title="No active bids"
                description="Start bidding on auctions to see them here"
              />
            ) : (
              <BidsTable bids={myBids.filter(b => b.auction.status === "active")} />
            )}
          </TabsContent>

          <TabsContent value="watchlist" className="space-y-4" data-testid="content-watchlist">
            {isLoading ? (
              <WonAuctionTableSkeleton />
            ) : !watchlistAuctions || watchlistAuctions.length === 0 ? (
              <EmptyState 
                icon={Trophy}
                title="No saved auctions"
                description="Save auctions to your watchlist to track them here"
              />
            ) : (
              <WatchlistTable auctions={watchlistAuctions} />
            )}
          </TabsContent>

          <TabsContent value="won-auctions" className="space-y-4" data-testid="content-won-auctions">
            {isLoading ? (
              <WonAuctionTableSkeleton />
            ) : !wonAuctions || wonAuctions.length === 0 ? (
              <EmptyState 
                icon={Trophy}
                title="No won auctions"
                description="Auctions you win will appear here"
              />
            ) : (
              <WonAuctionsTable auctions={wonAuctions} />
            )}
          </TabsContent>
        </Tabs>
      </DashboardCard>
    </div>
  );
}

function BidsTable({ bids }: { bids: BidWithAuction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Auction</th>
            <th className="pb-3 font-medium">Your Max Bid</th>
            <th className="pb-3 font-medium">Current Price</th>
            <th className="pb-3 font-medium">Position</th>
            <th className="pb-3 font-medium">Time Left</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {bids.map(({ auction, latestBid, isLeading }) => {
            const pricePerM3 = auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0;
            const maxBidPerM3 = latestBid?.maxProxyPerM3 || latestBid?.amountPerM3 || 0;
            const timeLeft = auction.endTime - Date.now();
            
            return (
              <tr key={auction.id} className="group" data-testid={`row-bid-${auction.id}`}>
                <td className="py-4">
                  <div>
                    <p className="font-medium" data-testid={`text-title-${auction.id}`}>{auction.title}</p>
                    <p className="text-sm text-muted-foreground">{formatVolume(auction.volumeM3)}</p>
                  </div>
                </td>
                <td className="py-4" data-testid={`text-max-bid-${auction.id}`}>
                  <p className="font-semibold">{formatPricePerM3(maxBidPerM3)}</p>
                </td>
                <td className="py-4" data-testid={`text-current-price-${auction.id}`}>
                  <p className="font-semibold">{formatPricePerM3(pricePerM3)}</p>
                </td>
                <td className="py-4">
                  {isLeading ? (
                    <Badge variant="default" className="gap-1" data-testid={`badge-leading-${auction.id}`}>
                      <Trophy className="w-3 h-3" />
                      Leading
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1" data-testid={`badge-outbid-${auction.id}`}>
                      <AlertCircle className="w-3 h-3" />
                      Outbid
                    </Badge>
                  )}
                </td>
                <td className="py-4" data-testid={`text-time-left-${auction.id}`}>
                  {timeLeft > 0 ? (
                    <span className={timeLeft < 3600000 ? "text-destructive font-semibold" : ""}>
                      {formatDistanceToNow(auction.endTime, { addSuffix: false })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Ended</span>
                  )}
                </td>
                <td className="py-4 text-right">
                  <Link href={`/auction/${auction.id}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      data-testid={`button-view-auction-${auction.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WonAuctionsTable({ auctions }: { auctions: Auction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Auction</th>
            <th className="pb-3 font-medium">Volume</th>
            <th className="pb-3 font-medium">Final Price</th>
            <th className="pb-3 font-medium">Total Paid</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {auctions.map((auction) => {
            const pricePerM3 = auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0;
            const totalValue = auction.projectedTotalValue ?? (pricePerM3 * (auction.volumeM3 || 0));
            
            return (
              <tr key={auction.id} className="group" data-testid={`row-won-${auction.id}`}>
                <td className="py-4">
                  <div>
                    <p className="font-medium" data-testid={`text-title-${auction.id}`}>{auction.title}</p>
                    <p className="text-sm text-muted-foreground">{auction.location}</p>
                  </div>
                </td>
                <td className="py-4" data-testid={`text-volume-${auction.id}`}>
                  {formatVolume(auction.volumeM3)}
                </td>
                <td className="py-4" data-testid={`text-price-${auction.id}`}>
                  <p className="font-semibold">{formatPricePerM3(pricePerM3)}</p>
                </td>
                <td className="py-4" data-testid={`text-total-${auction.id}`}>
                  <p className="font-bold text-primary">{formatPrice(totalValue)}</p>
                </td>
                <td className="py-4 text-right">
                  <Link href={`/auction/${auction.id}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      data-testid={`button-view-won-${auction.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BidTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function WonAuctionTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map(i => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function WatchlistTable({ auctions }: { auctions: Auction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr className="text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Auction</th>
            <th className="pb-3 font-medium">Volume</th>
            <th className="pb-3 font-medium">Current Price</th>
            <th className="pb-3 font-medium">Time Left</th>
            <th className="pb-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {auctions.map((auction) => {
            const pricePerM3 = auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0;
            const timeLeft = auction.endTime - Date.now();
            
            return (
              <tr key={auction.id} className="group" data-testid={`row-watchlist-${auction.id}`}>
                <td className="py-4">
                  <div>
                    <p className="font-medium" data-testid={`text-title-${auction.id}`}>{auction.title}</p>
                    <p className="text-sm text-muted-foreground">{auction.location}</p>
                  </div>
                </td>
                <td className="py-4" data-testid={`text-volume-${auction.id}`}>
                  {formatVolume(auction.volumeM3)}
                </td>
                <td className="py-4" data-testid={`text-price-${auction.id}`}>
                  <p className="font-semibold">{formatPricePerM3(pricePerM3)}</p>
                </td>
                <td className="py-4" data-testid={`text-time-left-${auction.id}`}>
                  {timeLeft > 0 ? (
                    <span className={timeLeft < 3600000 ? "text-destructive font-semibold" : ""}>
                      {formatDistanceToNow(auction.endTime, { addSuffix: false })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Ended</span>
                  )}
                </td>
                <td className="py-4 text-right">
                  <Link href={`/auction/${auction.id}`}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2"
                      data-testid={`button-view-watchlist-${auction.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
