import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Auction } from "@shared/schema";
import { TrendingUp, AlertCircle, Clock, Zap, Flame, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getSpeciesIncrement,
  calculateNextBidPerM3,
  getQuickBidIncrements,
  formatPricePerM3,
  formatProjectedTotal,
  calculateProjectedTotal
} from "@/utils/incrementLadder";

interface BidModalProps {
  auction: Auction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceBid: (amountPerM3: number, maxProxyPerM3: number) => Promise<void>;
}

export function BidModal({ auction, open, onOpenChange, onPlaceBid }: BidModalProps) {
  const [bidAmountPerM3, setBidAmountPerM3] = useState("");
  const [maxProxyPerM3, setMaxProxyPerM3] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const { toast } = useToast();

  // Fallback for old data format: calculate from currentBid if currentPricePerM3 doesn't exist
  const currentPricePerM3 = auction.currentPricePerM3 ?? ((auction as any).currentBid ? (auction as any).currentBid / auction.volumeM3 : 0);
  const dominantSpecies = auction.dominantSpecies || "Amestec"; // Fallback for old data

  const minIncrementPerM3 = getSpeciesIncrement(dominantSpecies);
  const minBidPerM3 = currentPricePerM3 + minIncrementPerM3;
  const bidAmountNum = parseFloat(bidAmountPerM3) || 0;
  const maxProxyNum = parseFloat(maxProxyPerM3) || 0;
  const isValidBid = bidAmountNum >= minBidPerM3 && maxProxyNum >= bidAmountNum;

  // Calculate projected totals for display
  const currentProjectedTotal = calculateProjectedTotal(currentPricePerM3, auction.volumeM3);
  const bidProjectedTotal = bidAmountNum > 0 ? calculateProjectedTotal(bidAmountNum, auction.volumeM3) : 0;
  const maxProjectedTotal = maxProxyNum > 0 ? calculateProjectedTotal(maxProxyNum, auction.volumeM3) : 0;

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = auction.endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining("Auction ended");
        setIsEndingSoon(false);
        setIsAuctionEnded(true);
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }

      // Mark as ending soon if less than 5 minutes
      setIsEndingSoon(remaining < 5 * 60 * 1000);
      setIsAuctionEnded(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction.endTime]);

  const quickBidIncrements = getQuickBidIncrements(dominantSpecies);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidBid) {
      toast({
        title: "Invalid bid amount",
        description: maxProxyNum < bidAmountNum 
          ? "Your maximum bid must be at least equal to your starting bid"
          : `Minimum bid is ${formatPricePerM3(minBidPerM3)}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onPlaceBid(bidAmountNum, maxProxyNum);
      setBidAmountPerM3("");
      setMaxProxyPerM3("");
      onOpenChange(false);
      toast({
        title: "Proxy bid placed!",
        description: `Your bid of ${formatPricePerM3(bidAmountNum)} (${formatProjectedTotal(bidProjectedTotal)} total) with max proxy of ${formatPricePerM3(maxProxyNum)} has been placed.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to place bid",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-bid">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Place Your Bid
          </DialogTitle>
          <DialogDescription>
            {auction.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dramatic countdown timer */}
          <div className={`${isEndingSoon ? 'bg-destructive/10 border-destructive/30 animate-pulse' : 'bg-primary/10 border-primary/30'} border rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEndingSoon ? (
                  <Flame className="w-5 h-5 text-destructive animate-pulse" />
                ) : (
                  <Clock className="w-5 h-5 text-primary" />
                )}
                <span className="text-sm font-medium">
                  {isEndingSoon ? "ENDING SOON!" : "Time Remaining"}
                </span>
              </div>
              <span className={`text-xl font-bold ${isEndingSoon ? 'text-destructive' : 'text-primary'}`}>
                {timeRemaining}
              </span>
            </div>
            {isEndingSoon && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Act fast! This auction is ending in minutes
              </p>
            )}
          </div>

          {/* Current bid card with €/m³ and projected total */}
          <div className="bg-card border border-primary/20 rounded-md p-4 space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
            <div className="relative">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary" data-testid="text-current-bid">
                    {formatPricePerM3(currentPricePerM3)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatProjectedTotal(currentProjectedTotal)} total
                  </div>
                </div>
              </div>
              
              {auction.currentBidderAnonymousId && (
                <div className="text-xs text-muted-foreground" data-testid="text-current-bidder">
                  Leading: {auction.currentBidderAnonymousId}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border mt-2">
                <TrendingUp className="w-4 h-4" />
                <span>{auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} placed • {auction.volumeM3}m³ • {dominantSpecies}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Species-based quick bid buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Bid Options ({dominantSpecies})</Label>
              <div className="grid grid-cols-3 gap-2">
                {quickBidIncrements.map(({ label, incrementPerM3 }) => {
                  const newBidPerM3 = currentPricePerM3 + incrementPerM3;
                  const suggestedMaxPerM3 = newBidPerM3 + incrementPerM3; // Suggest max as bid + same increment
                  const projectedTotal = calculateProjectedTotal(newBidPerM3, auction.volumeM3);
                  return (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      className="h-14 font-semibold flex flex-col items-center justify-center gap-0.5"
                      onClick={() => {
                        setBidAmountPerM3(String(newBidPerM3));
                        setMaxProxyPerM3(String(suggestedMaxPerM3));
                      }}
                      data-testid={`button-quick-bid-${incrementPerM3}`}
                    >
                      <span className="text-base">{label}</span>
                      <span className="text-xs text-muted-foreground">{formatProjectedTotal(projectedTotal)}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Proxy Bidding System */}
            <div className="space-y-4 p-4 bg-card border border-border rounded-md">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Proxy Bidding (€/m³)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your maximum price per m³. We'll automatically bid the minimum needed to keep you in the lead.
              </p>
              
              {/* Current Bid Input (€/m³) */}
              <div className="space-y-2">
                <Label htmlFor="bid-amount">Your Starting Bid (€/m³)</Label>
                <Input
                  id="bid-amount"
                  type="number"
                  placeholder={`Min: €${minBidPerM3}/m³`}
                  value={bidAmountPerM3}
                  onChange={(e) => {
                    setBidAmountPerM3(e.target.value);
                    // Auto-fill max proxy if empty
                    if (!maxProxyPerM3) {
                      setMaxProxyPerM3(e.target.value);
                    }
                  }}
                  className="text-lg font-semibold h-12"
                  min={minBidPerM3}
                  step={0.1}
                  data-testid="input-bid-amount"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>Min: {formatPricePerM3(minBidPerM3)} (+€{minIncrementPerM3}/m³ for {dominantSpecies})</span>
                  </div>
                  {bidAmountNum > 0 && (
                    <div className="text-xs text-primary/80 pl-5">
                      ≈ {formatProjectedTotal(bidProjectedTotal)} total
                    </div>
                  )}
                </div>
              </div>

              {/* Max Proxy Bid Input (€/m³) */}
              <div className="space-y-2">
                <Label htmlFor="max-proxy-bid">Your Maximum Bid (€/m³)</Label>
                <Input
                  id="max-proxy-bid"
                  type="number"
                  placeholder={`Enter your max €/m³`}
                  value={maxProxyPerM3}
                  onChange={(e) => setMaxProxyPerM3(e.target.value)}
                  className="text-lg font-semibold h-12 border-primary/50"
                  min={bidAmountNum}
                  step={0.1}
                  data-testid="input-max-proxy-bid"
                />
                <div className="flex flex-col gap-1">
                  <div className="flex items-start gap-2 text-xs text-primary/80">
                    <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>System will auto-bid up to this amount to keep you leading</span>
                  </div>
                  {maxProxyNum > 0 && (
                    <div className="text-xs text-primary/80 pl-5">
                      ≈ {formatProjectedTotal(maxProjectedTotal)} max total
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isValidBid && (bidAmountPerM3 || maxProxyPerM3) && (
              <div className="text-sm text-destructive flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                {maxProxyNum < bidAmountNum 
                  ? "Maximum bid must be at least equal to your starting bid"
                  : `Bid must be at least ${formatPricePerM3(minBidPerM3)}`}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isSubmitting}
                data-testid="button-cancel-bid"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={`flex-1 font-bold text-lg h-14 ${isEndingSoon && isValidBid ? 'animate-pulse bg-primary hover:bg-primary/90' : ''}`}
                disabled={!isValidBid || isSubmitting}
                data-testid="button-submit-bid"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Placing Bid...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    {isEndingSoon ? 'BID NOW!' : 'Place Bid'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
