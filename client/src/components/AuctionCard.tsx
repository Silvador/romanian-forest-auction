import { Auction } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Clock } from "lucide-react";
import { formatVolume, formatTimeRemaining, isAuctionEndingSoon } from "@/utils/formatters";
import { formatPricePerM3, formatProjectedTotal, calculateProjectedTotal } from "@/utils/incrementLadder";
import { Link } from "wouter";
import { WatchlistButton } from "./WatchlistButton";

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const timeRemaining = formatTimeRemaining(auction.endTime);
  const isEndingSoon = isAuctionEndingSoon(auction.endTime);
  const imageUrl = auction.imageUrls?.[0] || "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=400";
  
  // Fallback for old data format: calculate from currentBid if currentPricePerM3 doesn't exist
  const pricePerM3 = auction.currentPricePerM3 ?? ((auction as any).currentBid ? (auction as any).currentBid / auction.volumeM3 : 0);
  const projectedTotal = calculateProjectedTotal(pricePerM3, auction.volumeM3);

  return (
    <Link href={`/auction/${auction.id}`}>
      <Card 
        className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col"
        data-testid={`card-auction-${auction.id}`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img 
            src={imageUrl} 
            alt={auction.title}
            className="w-full h-full object-cover"
          />
          {auction.status === "active" && (
            <Badge 
              variant="default" 
              className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm animate-pulse"
              data-testid={`badge-live-${auction.id}`}
            >
              <div className="w-2 h-2 bg-primary-foreground rounded-full mr-1.5 animate-pulse" />
              LIVE
            </Badge>
          )}
          <div className="absolute top-2 right-2">
            <WatchlistButton auctionId={auction.id} />
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 
                className="font-semibold text-base leading-tight mb-1 truncate"
                data-testid={`text-title-${auction.id}`}
              >
                {auction.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate" data-testid={`text-location-${auction.id}`}>
                  {auction.region}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {auction.speciesBreakdown.slice(0, 3).map((item, idx) => (
              <Badge 
                key={idx}
                variant="secondary" 
                className="text-xs font-medium"
                data-testid={`badge-species-${item.species}-${auction.id}`}
              >
                {item.species} {item.percentage}%
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span data-testid={`text-volume-${auction.id}`}>{formatVolume(auction.volumeM3)}</span>
            </div>
            <div className={`flex items-center gap-1.5 ml-auto ${isEndingSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium" data-testid={`text-time-${auction.id}`}>
                {timeRemaining}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-auto">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Current Price</span>
              <div className="text-right">
                <div 
                  className="text-xl font-bold text-primary"
                  data-testid={`text-bid-${auction.id}`}
                >
                  {formatPricePerM3(pricePerM3)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatProjectedTotal(projectedTotal)} total
                </div>
                {auction.bidCount > 0 && (
                  <div className="text-xs text-muted-foreground" data-testid={`text-bidcount-${auction.id}`}>
                    {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
