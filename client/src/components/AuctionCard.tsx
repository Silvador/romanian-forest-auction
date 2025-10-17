import { Auction } from "@shared/schema";
import { Trees, Gavel, Flame } from "lucide-react";
import {
  formatVolume,
  formatTimeRemaining,
  calculatePriceChange,
  formatTrend,
  calculateHeat,
} from "@/utils/formatters";
import { formatPricePerM3 } from "@/utils/incrementLadder";
import { Link } from "wouter";
import { WatchlistButton } from "./WatchlistButton";
import { SpeciesCompositionBar } from "./auction/SpeciesCompositionBar";
import { MetricChip } from "./auction/MetricChip";
import { UrgencyPulse } from "./auction/UrgencyPulse";
import { StatusDot } from "./auction/StatusDot";
import { CardHeatRing } from "./auction/CardHeatRing";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const timeRemaining = formatTimeRemaining(auction.endTime);

  // Fallback for old data format
  const pricePerM3 =
    auction.currentPricePerM3 ??
    ((auction as any).currentBid
      ? (auction as any).currentBid / auction.volumeM3
      : auction.startingPricePerM3);

  // Price trend calculation
  const priceChange = calculatePriceChange(auction.startingPricePerM3, pricePerM3);
  const trend = formatTrend(priceChange);

  // Price flicker effect state
  const [flashClass, setFlashClass] = useState("");
  const previousPriceRef = useRef<number>(pricePerM3);

  useEffect(() => {
    const previousPrice = previousPriceRef.current;

    // Only trigger flash if price actually changed
    if (previousPrice !== pricePerM3) {
      const diff = pricePerM3 - previousPrice;
      const percentageChange = Math.abs((diff / previousPrice) * 100);

      let newFlashClass = "";

      if (diff > 0) {
        newFlashClass = "price-flash-up";
      } else if (diff < 0) {
        newFlashClass = "price-flash-down";
      }

      // Add shake effect for high volatility (>10% change)
      if (percentageChange > 10) {
        newFlashClass += " price-shake";
      }

      setFlashClass(newFlashClass);

      // Clear animation classes after animation completes
      const timeout = setTimeout(() => setFlashClass(""), 700);

      // Update ref for next comparison
      previousPriceRef.current = pricePerM3;

      return () => clearTimeout(timeout);
    }
  }, [pricePerM3]);

  // Heat score for glow effect
  const heatScore = calculateHeat(auction.bidCount, auction.endTime);

  // APV and Production Unit for title
  const apvNumber = auction.apvPermitNumber || "N/A";
  const productionUnit = auction.apvUpLocation || "Unknown UP";

  // Status determination
  const now = Date.now();
  const auctionStatus: "live" | "upcoming" | "ended" =
    auction.status === "active"
      ? "live"
      : auction.startTime > now
      ? "upcoming"
      : "ended";

  // Convert species breakdown to SpeciesCompositionBar format
  const speciesSegments = auction.speciesBreakdown.map((item) => ({
    species: item.species,
    volume: item.volumeM3 ?? (auction.volumeM3 * item.percentage) / 100,
  }));

  return (
    <Link href={`/auction/${auction.id}`}>
      <CardHeatRing heatScore={heatScore}>
        <div
          className="p-4 rounded-lg hover-elevate-card transition-all bg-background/80 border border-border/40 h-full flex flex-col"
          data-testid={`card-auction-${auction.id}`}
        >
          {/* Species Composition Bar - Data-Driven Header */}
          <div className="mb-3">
            <SpeciesCompositionBar
              breakdown={speciesSegments}
              totalVolume={auction.volumeM3}
              live={auctionStatus === "live"}
            />
          </div>

          {/* Ticker Header - Financial Style */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3
                className="font-semibold text-base uppercase tracking-widest leading-tight truncate"
                data-testid={`text-title-${auction.id}`}
              >
                {apvNumber} • {productionUnit}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusDot status={auctionStatus} size={8} />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  {auctionStatus === "live" ? "LIVE" : auctionStatus === "upcoming" ? "UPCOMING" : "ENDED"}
                </span>
              </div>
              {/* APV & Region Info */}
              <div className="mt-1.5 space-y-0.5">
                <div className="text-xs text-muted-foreground truncate">
                  <span className="font-medium">📍 {auction.region}</span>
                </div>
                {auction.apvPermitNumber && (
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="font-medium">APV: {auction.apvPermitNumber}</span>
                  </div>
                )}
                {auction.apvTreatmentType && (
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="font-medium">🌲 {auction.apvTreatmentType}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <WatchlistButton auctionId={auction.id} />
            </div>
          </div>

          {/* Price Block - Trading Dashboard */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div
                className={cn(
                  "text-3xl font-bold tracking-tight tabular-nums px-1 rounded-sm transition-all",
                  flashClass
                )}
                data-testid={`text-bid-${auction.id}`}
              >
                {formatPricePerM3(pricePerM3)}
              </div>
            </div>
            {priceChange.direction !== "flat" && (
              <MetricChip
                icon={<span className="text-sm">{trend.arrow}</span>}
                label={trend.text}
                tone={priceChange.direction === "up" ? "positive" : "negative"}
              />
            )}
            {/* Sparkline Placeholder */}
            <div className="w-16 h-[22px] opacity-60">
              {/* Future: <Sparkline data={bidHistory} /> */}
            </div>
          </div>

          {/* Metrics Row - Compact Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <MetricChip
              icon={<Trees className="w-3.5 h-3.5" />}
              label={formatVolume(auction.volumeM3)}
            />
            {auction.bidCount > 0 && (
              <MetricChip
                icon={<Gavel className="w-3.5 h-3.5" />}
                label={`${auction.bidCount} ${auction.bidCount === 1 ? "bid" : "bids"}`}
                tone={auction.bidCount > 5 ? "positive" : "neutral"}
              />
            )}
            {heatScore === "high" && (
              <MetricChip
                icon={<Flame className="w-3.5 h-3.5" />}
                label="High Activity"
                tone="urgent"
              />
            )}
          </div>

          {/* Species Breakdown Line */}
          <div className="text-xs text-muted-foreground mb-3 truncate">
            {auction.speciesBreakdown.length === 1 ? (
              <span>{auction.speciesBreakdown[0].species} 100%</span>
            ) : (
              <>
                {auction.speciesBreakdown.slice(0, 2).map((item, idx, arr) => (
                  <span key={idx}>
                    {item.species} {item.percentage.toFixed(0)}%
                    {idx < arr.length - 1 && " • "}
                  </span>
                ))}
                {auction.speciesBreakdown.length > 2 && (
                  <span> • +{auction.speciesBreakdown.length - 2} more</span>
                )}
              </>
            )}
          </div>

          {/* Footer - Urgency Pulse */}
          <div className="mt-auto pt-3 border-t border-border/40">
            <UrgencyPulse endTime={auction.endTime} timeRemaining={timeRemaining} />
          </div>
        </div>
      </CardHeatRing>
    </Link>
  );
}
