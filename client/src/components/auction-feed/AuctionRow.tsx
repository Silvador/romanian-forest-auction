import { forwardRef } from "react";
import { motion } from "framer-motion";
import { MapPin, TrendingUp, Clock, Flame, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPricePerM3, formatProjectedTotal } from "@/utils/incrementLadder";
import { formatTimeRemaining, isAuctionEndingSoon, formatVolume, formatEndedDate } from "@/utils/formatters";
import { Auction } from "@shared/schema";

interface AuctionRowProps {
  auction: Auction;
  onClick: () => void;
  delay?: number;
  isCompleted?: boolean;
}

export const AuctionRow = forwardRef<HTMLDivElement, AuctionRowProps>(function AuctionRow({ auction, onClick, delay = 0, isCompleted = false }, ref) {
  const timeRemaining = formatTimeRemaining(auction.endTime);
  const isEndingSoon = isAuctionEndingSoon(auction.endTime);
  const isLive = auction.status === "active";
  const hasBids = auction.bidCount > 0;

  const pricePerM3 = auction.currentPricePerM3 ?? (auction.currentBid && auction.volumeM3 ? auction.currentBid / auction.volumeM3 : 0);
  const projectedTotal = auction.projectedTotalValue ?? (auction.currentBid || 0);
  const species = auction.dominantSpecies || "Amestec";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: 0.3, ease: "easeOut" } }}
      whileHover={{
        backgroundColor: "hsla(var(--accent), 0.08)",
        transition: { duration: 0.15 }
      }}
      onClick={onClick}
      className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border cursor-pointer hover-elevate active-elevate-2 transition-colors"
      data-testid={`auction-row-${auction.id}`}
    >
      {/* Species & Title - 4 cols */}
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          {isLive && !isCompleted && (
            <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-positive status-pulse" />
          )}
          <Badge
            variant={isCompleted ? "secondary" : isLive ? "default" : "secondary"}
            className="font-bold pointer-events-none"
          >
            {species}
          </Badge>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold truncate" data-testid={`text-title-${auction.id}`}>
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
        <div className={`text-lg font-bold tabular-nums ${isCompleted ? 'text-foreground' : 'text-primary'}`} data-testid={`text-price-${auction.id}`}>
          {formatPricePerM3(pricePerM3)}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatVolume(auction.volumeM3)}
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
        <div className="text-xs text-muted-foreground">{auction.bidCount === 1 ? "bid" : "bids"}</div>
      </div>

      {/* Last column - 3 cols: Time Left (live) or Result (completed) */}
      <div className="col-span-3 flex items-center justify-end gap-2">
        {isCompleted ? (
          <div className="flex items-center gap-1.5">
            {hasBids ? (
              <CheckCircle2 className="w-4 h-4 text-positive" />
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="text-right">
              <div className="text-sm font-medium">
                {hasBids ? "Sold" : "No bids"}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatEndedDate(auction.endTime).replace("Ended ", "")}
              </div>
            </div>
          </div>
        ) : isEndingSoon ? (
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

      <motion.div
        className="absolute inset-0 pointer-events-none border-2 border-primary rounded-md opacity-0"
        data-flash-container
      />
    </motion.div>
  );
});
