import { forwardRef } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPricePerM3, formatProjectedTotal } from "@/utils/incrementLadder";
import { formatTimeRemaining, isAuctionEndingSoon } from "@/utils/formatters";
import { Auction } from "@shared/schema";

interface AuctionRowProps {
  auction: Auction;
  onClick: () => void;
}

export const AuctionRow = forwardRef<HTMLDivElement, AuctionRowProps>(function AuctionRow({ auction, onClick }, ref) {
  const timeRemaining = formatTimeRemaining(auction.endTime);
  const isEndingSoon = isAuctionEndingSoon(auction.endTime);
  const isLive = auction.status === "live";

  // Backward compatibility: calculate values if new fields are missing
  const pricePerM3 = auction.currentPricePerM3 ?? (auction.currentBid && auction.volumeM3 ? auction.currentBid / auction.volumeM3 : 0);
  const projectedTotal = auction.projectedTotalValue ?? (auction.currentBid || 0);
  const species = auction.dominantSpecies || "Amestec";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        backgroundColor: "hsl(var(--accent))",
        transition: { duration: 0.15 }
      }}
      onClick={onClick}
      className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border cursor-pointer hover-elevate active-elevate-2 transition-colors"
      data-testid={`auction-row-${auction.id}`}
    >
      {/* Species & Title - 4 cols */}
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <Badge 
          variant={isLive ? "default" : "secondary"} 
          className="shrink-0 font-bold pointer-events-none"
        >
          {species}
        </Badge>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate" data-testid={`text-title-${auction.id}`}>
            {auction.title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{auction.region}</span>
          </div>
        </div>
      </div>

      {/* Price €/m³ - 2 cols */}
      <div className="col-span-2 flex flex-col justify-center">
        <div className="text-lg font-bold text-primary tabular-nums" data-testid={`text-price-${auction.id}`}>
          {formatPricePerM3(pricePerM3)}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {auction.volumeM3}m³
        </div>
      </div>

      {/* Projected Total - 2 cols */}
      <div className="col-span-2 flex flex-col justify-center">
        <div className="text-sm font-semibold tabular-nums" data-testid={`text-total-${auction.id}`}>
          {formatProjectedTotal(projectedTotal)}
        </div>
        <div className="text-xs text-muted-foreground">
          total
        </div>
      </div>

      {/* Bids - 1 col */}
      <div className="col-span-1 flex flex-col justify-center items-center">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm font-semibold tabular-nums" data-testid={`text-bids-${auction.id}`}>
            {auction.bidCount}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">bids</div>
      </div>

      {/* Time Remaining - 3 cols */}
      <div className="col-span-3 flex items-center justify-end gap-2">
        {isEndingSoon ? (
          <motion.div 
            className="flex items-center gap-1.5 text-destructive"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Flame className="w-4 h-4" />
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums">{timeRemaining}</div>
              <div className="text-xs">ENDING!</div>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <div className="text-sm font-medium tabular-nums">{timeRemaining}</div>
              <div className="text-xs text-muted-foreground">left</div>
            </div>
          </div>
        )}
      </div>

      {/* Flash animation placeholder for real-time updates */}
      <motion.div
        className="absolute inset-0 pointer-events-none border-2 border-primary rounded-md opacity-0"
        data-flash-container
      />
    </motion.div>
  );
});
