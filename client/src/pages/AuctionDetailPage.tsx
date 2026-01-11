import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Auction, Bid } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BidModal } from "@/components/BidModal";
import { MapPin, Calendar, TrendingUp, Clock, FileText, ChevronLeft, RefreshCw } from "lucide-react";
import { AuctionImage } from "@/components/auction/AuctionImage";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { formatVolume, formatTimeRemaining, isAuctionEndingSoon, getRelativeTime } from "@/utils/formatters";
import { formatPricePerM3, formatProjectedTotal, calculateProjectedTotal, getSpeciesIncrement } from "@/utils/incrementLadder";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuctionUpdates, useWebSocket } from "@/hooks/useWebSocket";

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const { toast } = useToast();
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [initialBidPerM3, setInitialBidPerM3] = useState<number | undefined>(undefined);
  const [initialMaxProxyPerM3, setInitialMaxProxyPerM3] = useState<number | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isEndingSoon, setIsEndingSoon] = useState(false);
  const [showPriceFlash, setShowPriceFlash] = useState(false);

  const { connected } = useWebSocket();
  const { onAuctionUpdate, onAuctionEnded, onAuctionSoftClose } = useAuctionUpdates(id);

  const { data: auction, isLoading, dataUpdatedAt, isFetching } = useQuery<Auction>({
    queryKey: [`/api/auctions/${id}`],
    enabled: !!id && !!userData,
    // Removed refetchInterval - using WebSocket for real-time updates
    // Fallback to occasional polling if WebSocket disconnected
    refetchInterval: connected ? false : 30000,
  });

  const { data: bids } = useQuery<Bid[]>({
    queryKey: [`/api/bids/${id}`],
    enabled: !!id && !!userData,
    // Removed refetchInterval - using WebSocket for real-time updates
    refetchInterval: connected ? false : 30000,
  });

  // Real-time countdown timer (updates every second)
  useEffect(() => {
    if (!auction) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = auction.endTime - now;

      if (remaining <= 0) {
        setTimeRemaining("Auction ended");
        setIsEndingSoon(false);
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }

      setIsEndingSoon(remaining < 5 * 60 * 1000); // Less than 5 minutes
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime]);

  // ===== WEBSOCKET REAL-TIME UPDATES =====
  useEffect(() => {
    if (!id) return;

    // Listen for auction updates (new bids, price changes)
    const cleanupAuctionUpdate = onAuctionUpdate((data) => {
      console.log('[WebSocket] Auction update received:', data);

      // Update auction cache with new data
      queryClient.setQueryData([`/api/auctions/${id}`], (old: Auction | undefined) => {
        if (!old) return old;
        return {
          ...old,
          currentPricePerM3: data.currentPricePerM3,
          currentBidderAnonymousId: data.currentBidderAnonymousId,
          bidCount: data.bidCount,
          endTime: data.endTime,
          projectedTotalValue: data.projectedTotalValue,
          softCloseActive: data.softCloseActive,
          secondHighestPricePerM3: data.secondHighestPricePerM3,
        };
      });

      // Refetch bids to show new bid in history
      queryClient.invalidateQueries({ queryKey: [`/api/bids/${id}`] });

      // Trigger price flash animation
      setShowPriceFlash(true);
      setTimeout(() => setShowPriceFlash(false), 700);
    });

    // Listen for auction ending
    const cleanupAuctionEnded = onAuctionEnded((data) => {
      console.log('[WebSocket] Auction ended:', data);

      toast({
        title: "Auction Ended",
        description: `This auction has ended. ${data.winnerId ? `Winner: ${data.winnerAnonymousId}` : 'No bids received'}`,
      });

      // Refetch auction data to update status
      queryClient.invalidateQueries({ queryKey: [`/api/auctions/${id}`] });
    });

    // Listen for soft-close extensions
    const cleanupSoftClose = onAuctionSoftClose((data) => {
      console.log('[WebSocket] Soft-close extension:', data);

      toast({
        title: "Auction Extended",
        description: data.message,
        duration: 5000,
      });

      // Update end time in cache
      queryClient.setQueryData([`/api/auctions/${id}`], (old: Auction | undefined) => {
        if (!old) return old;
        return {
          ...old,
          endTime: data.newEndTime,
          softCloseActive: true,
        };
      });
    });

    return () => {
      cleanupAuctionUpdate();
      cleanupAuctionEnded();
      cleanupSoftClose();
    };
  }, [id, onAuctionUpdate, onAuctionEnded, onAuctionSoftClose, toast]);

  // Analyze user's bid status and suggest actions
  const userBidAnalysis = useMemo(() => {
    if (!auction || !bids || !userData) return null;

    const userBids = bids.filter(bid => bid.bidderId === userData.id);
    if (userBids.length === 0) return null;

    const latestUserBid = userBids[0]; // Bids should be sorted by timestamp desc
    const userMaxProxyPerM3 = latestUserBid.maxProxyPerM3 ?? latestUserBid.amountPerM3;
    const currentPricePerM3 = auction.currentPricePerM3 ?? 0;
    const dominantSpecies = auction.dominantSpecies || "Amestec";
    const increment = getSpeciesIncrement(dominantSpecies);

    const isLeading = auction.currentBidderId === userData.id;
    const buffer = userMaxProxyPerM3 - currentPricePerM3;
    const suggestedRaise = userMaxProxyPerM3 + (increment * 3); // Suggest 3x increment raise
    const competitiveBid = currentPricePerM3 + increment;

    return {
      latestBid: latestUserBid,
      maxProxyPerM3: userMaxProxyPerM3,
      currentPricePerM3,
      isLeading,
      buffer,
      bufferStatus: buffer < increment * 2 ? 'danger' : buffer < increment * 5 ? 'warning' : 'safe',
      suggestedRaise,
      competitiveBid,
      increment,
    };
  }, [auction, bids, userData]);

  const handlePlaceBid = async (amountPerM3: number, maxProxyPerM3: number) => {
    await apiRequest("POST", "/api/bids", {
      auctionId: id,
      amountPerM3,
      maxProxyPerM3,
    });

    // Invalidate queries to refresh auction data and bids after successful bid
    await queryClient.invalidateQueries({ queryKey: [`/api/auctions/${id}`] });
    await queryClient.invalidateQueries({ queryKey: [`/api/bids/${id}`] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Auction not found</h2>
          <Link href="/">
            <Button>Back to Auctions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const isAuctionLive = now >= auction.startTime && now < auction.endTime;
  const canBid = userData?.role === "buyer" && userData?.id !== auction.ownerId;
  const isOwner = userData?.id === auction.ownerId;

  // Fallback for old data format: calculate from currentBid/startingPrice if new fields don't exist
  const currentPricePerM3 = auction.currentPricePerM3 ?? ((auction as any).currentBid ? (auction as any).currentBid / auction.volumeM3 : 0);
  const startingPricePerM3 = auction.startingPricePerM3 ?? ((auction as any).startingPrice ? (auction as any).startingPrice / auction.volumeM3 : 0);

  // Check if user is leading or has been outbid
  const isUserLeading = userData?.id === auction.currentBidderId;
  const userHasBid = bids?.some(bid => bid.bidderId === userData?.id);
  const wasOutbid = userHasBid && !isUserLeading;

  // Data freshness indicator
  const dataAge = Date.now() - dataUpdatedAt;
  const isDataFresh = dataAge < 60000; // Fresh if less than 1 minute old

  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back">
            <ChevronLeft className="w-4 h-4" />
            Back to Auctions
          </Button>
        </Link>

        {/* Enhanced Status Banners with Quick Actions */}
        {canBid && isAuctionLive && isUserLeading && userBidAnalysis && (
          <div className="mb-4 p-4 bg-primary/10 border-2 border-primary rounded-md" data-testid="banner-leading">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-primary">YOU ARE LEADING</h3>
                  <p className="text-sm text-muted-foreground">
                    Max proxy: {formatPricePerM3(userBidAnalysis.maxProxyPerM3)} •
                    Buffer: {formatPricePerM3(userBidAnalysis.buffer)} ({userBidAnalysis.bufferStatus})
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInitialBidPerM3(userBidAnalysis.suggestedRaise);
                  setInitialMaxProxyPerM3(userBidAnalysis.suggestedRaise + userBidAnalysis.increment);
                  setBidModalOpen(true);
                }}
                className="shrink-0"
              >
                Raise Max Proxy
              </Button>
            </div>
          </div>
        )}

        {canBid && isAuctionLive && wasOutbid && userBidAnalysis && (
          <div className="mb-4 p-4 bg-destructive/10 border-2 border-destructive rounded-md" data-testid="banner-outbid">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-destructive rotate-180" />
                <div>
                  <h3 className="text-lg font-bold text-destructive">YOU WERE OUTBID!</h3>
                  <p className="text-sm text-muted-foreground">
                    Current: {formatPricePerM3(currentPricePerM3)} • Your max was: {formatPricePerM3(userBidAnalysis.maxProxyPerM3)}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setInitialBidPerM3(userBidAnalysis.competitiveBid);
                  setInitialMaxProxyPerM3(userBidAnalysis.competitiveBid + (userBidAnalysis.increment * 3));
                  setBidModalOpen(true);
                }}
                className="shrink-0"
              >
                Bid {formatPricePerM3(userBidAnalysis.competitiveBid)}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-title">{auction.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-location">{auction.region} • {auction.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>by {auction.ownerName}</span>
              </div>
            </div>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Current Price</h3>
                  {/* Data freshness indicator */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-amber-500' : 'text-primary'}`} />
                    <span className={isFetching ? 'text-amber-500' : 'text-primary'}>
                      {isFetching ? 'Updating...' : isDataFresh ? 'Live' : `${Math.floor(dataAge / 1000)}s ago`}
                    </span>
                  </div>
                </div>
                <div className="text-4xl font-bold text-primary mb-1" data-testid="text-current-bid">
                  {formatPricePerM3(currentPricePerM3)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatProjectedTotal(calculateProjectedTotal(currentPricePerM3, auction.volumeM3))} total
                </div>
                {auction.currentBidderAnonymousId && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Leading: {auction.currentBidderAnonymousId}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Time Remaining</div>
                  <div className={`text-2xl font-bold ${isEndingSoon ? 'text-destructive animate-pulse' : ''}`} data-testid="text-time-remaining">
                    <Clock className="w-5 h-5 inline mr-2" />
                    {timeRemaining}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Bids</div>
                  <div className="text-xl font-semibold" data-testid="text-bid-count">
                    {auction.bidCount}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Lot Details
            </h3>
            
            <div className="space-y-6">
              {/* Table 1 - Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {auction.apvPermitNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">APV Number</span>
                      <span className="text-sm font-semibold" data-testid="text-apv-number">{auction.apvPermitNumber}</span>
                    </div>
                  )}
                  {auction.apvPermitCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Permit Code</span>
                      <span className="text-sm font-semibold">{auction.apvPermitCode}</span>
                    </div>
                  )}
                  {auction.apvUpLocation && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Production Unit</span>
                      <span className="text-sm font-semibold">{auction.apvUpLocation}</span>
                    </div>
                  )}
                  {auction.apvSurfaceHa && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Surface Area</span>
                      <span className="text-sm font-semibold" data-testid="text-surface-ha">{auction.apvSurfaceHa} ha</span>
                    </div>
                  )}
                  {auction.apvTreatmentType && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Treatment Type</span>
                      <span className="text-sm font-semibold">{auction.apvTreatmentType}</span>
                    </div>
                  )}
                  {auction.apvProductType && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Product Type</span>
                      <span className="text-sm font-semibold">{auction.apvProductType}</span>
                    </div>
                  )}
                  {auction.apvExtractionMethod && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Extraction Method</span>
                      <span className="text-sm font-semibold">{auction.apvExtractionMethod}</span>
                    </div>
                  )}
                  {auction.apvDateOfMarking && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Inventory Date</span>
                      <span className="text-sm font-semibold">{auction.apvDateOfMarking}</span>
                    </div>
                  )}
                  {auction.apvHarvestYear && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Harvest Year</span>
                      <span className="text-sm font-semibold">{auction.apvHarvestYear}</span>
                    </div>
                  )}
                  {auction.apvInventoryMethod && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Inventory Method</span>
                      <span className="text-sm font-semibold">{auction.apvInventoryMethod}</span>
                    </div>
                  )}
                  {auction.apvHammerMark && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Hammer Mark</span>
                      <span className="text-sm font-semibold">{auction.apvHammerMark}</span>
                    </div>
                  )}
                  {auction.apvAccessibility && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Accessibility</span>
                      <span className="text-sm font-semibold">{auction.apvAccessibility}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table 2 - Tree/Forest Metrics */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Tree & Forest Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Primary Species</span>
                    <Badge variant="secondary" className="font-semibold">
                      {auction.speciesBreakdown[0]?.species || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Volume</span>
                    <span className="text-sm font-semibold text-primary" data-testid="text-volume">{formatVolume(auction.volumeM3)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Starting Price</span>
                    <span className="text-sm font-semibold text-primary" data-testid="text-starting-price">
                      {formatPricePerM3(startingPricePerM3)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Projected Total</span>
                    <span className="text-sm font-semibold">
                      {formatProjectedTotal(calculateProjectedTotal(startingPricePerM3, auction.volumeM3))}
                    </span>
                  </div>
                  {auction.apvNumberOfTrees && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Number of Trees</span>
                      <span className="text-sm font-semibold">{auction.apvNumberOfTrees}</span>
                    </div>
                  )}
                  {auction.apvAverageDiameter && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Diameter</span>
                      <span className="text-sm font-semibold">{auction.apvAverageDiameter} cm</span>
                    </div>
                  )}
                  {auction.apvAverageHeight && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Height</span>
                      <span className="text-sm font-semibold">{auction.apvAverageHeight} m</span>
                    </div>
                  )}
                  {auction.apvAverageAge && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Age</span>
                      <span className="text-sm font-semibold">{auction.apvAverageAge} years</span>
                    </div>
                  )}
                  {auction.apvSlopePercent && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Slope</span>
                      <span className="text-sm font-semibold">{auction.apvSlopePercent}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table 3 - Volume Breakdown */}
              {(auction.apvSortVolumes && Object.keys(auction.apvSortVolumes).length > 0) || auction.apvFirewoodVolume || auction.apvBarkVolume ? (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Volume Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {auction.apvSortVolumes?.G1 && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">G1 (High Quality)</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvSortVolumes.G1} m³</div>
                      </div>
                    )}
                    {auction.apvSortVolumes?.G2 && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">G2 (Standard)</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvSortVolumes.G2} m³</div>
                      </div>
                    )}
                    {auction.apvSortVolumes?.G3 && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">G3 (Low Quality)</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvSortVolumes.G3} m³</div>
                      </div>
                    )}
                    {auction.apvSortVolumes?.M1 && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">M1 (Firewood)</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvSortVolumes.M1} m³</div>
                      </div>
                    )}
                    {auction.apvSortVolumes?.M2 && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">M2 (Secondary)</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvSortVolumes.M2} m³</div>
                      </div>
                    )}
                    {auction.apvBarkVolume && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Bark Volume</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvBarkVolume} m³</div>
                      </div>
                    )}
                    {auction.apvFirewoodVolume && (
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Firewood Total</div>
                        <div className="text-sm font-semibold text-primary">{auction.apvFirewoodVolume} m³</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Species Breakdown */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Species Composition</h4>
                <div className="space-y-2">
                  {auction.speciesBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <Badge variant="secondary" className="font-medium">
                        {item.species}
                      </Badge>
                      <div className="flex-1 mx-3 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
              {auction.description}
            </p>
          </Card>

          {(auction.apvPermitNumber || auction.apvUpLocation || auction.apvDateOfMarking) && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                APV Permit Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auction.apvPermitNumber && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Permit Number</div>
                    <div className="font-semibold">{auction.apvPermitNumber}</div>
                  </div>
                )}
                {auction.apvUpLocation && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">UP Location</div>
                    <div className="font-semibold">{auction.apvUpLocation}</div>
                  </div>
                )}
                {auction.apvUaLocation && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">UA Location</div>
                    <div className="font-semibold">{auction.apvUaLocation}</div>
                  </div>
                )}
                {auction.apvForestCompany && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Forest Company</div>
                    <div className="font-semibold">{auction.apvForestCompany}</div>
                  </div>
                )}
                {auction.apvDateOfMarking && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Date of Marking</div>
                    <div className="font-semibold">{auction.apvDateOfMarking}</div>
                  </div>
                )}
                {auction.apvNumberOfTrees && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Number of Trees</div>
                    <div className="font-semibold">{auction.apvNumberOfTrees}</div>
                  </div>
                )}
                {auction.apvAverageHeight && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Average Height</div>
                    <div className="font-semibold">{auction.apvAverageHeight} m</div>
                  </div>
                )}
                {auction.apvAverageDiameter && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Average Diameter</div>
                    <div className="font-semibold">{auction.apvAverageDiameter} cm</div>
                  </div>
                )}
                {auction.apvNetVolume && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Net Volume</div>
                    <div className="font-semibold">{auction.apvNetVolume} m³</div>
                  </div>
                )}
                {auction.apvGrossVolume && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Gross Volume</div>
                    <div className="font-semibold">{auction.apvGrossVolume} m³</div>
                  </div>
                )}
                {auction.apvSurfaceHa && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Surface Area</div>
                    <div className="font-semibold">{auction.apvSurfaceHa} ha</div>
                  </div>
                )}
                {auction.apvFirewoodVolume && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Firewood Volume</div>
                    <div className="font-semibold">{auction.apvFirewoodVolume} m³</div>
                  </div>
                )}
                {auction.apvBarkVolume && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Bark Volume</div>
                    <div className="font-semibold">{auction.apvBarkVolume} m³</div>
                  </div>
                )}
                {auction.apvTreatmentType && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Treatment Type</div>
                    <div className="font-semibold">{auction.apvTreatmentType}</div>
                  </div>
                )}
                {auction.apvExtractionMethod && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Extraction Method</div>
                    <div className="font-semibold">{auction.apvExtractionMethod}</div>
                  </div>
                )}
              </div>
              {auction.apvSortVolumes && Object.keys(auction.apvSortVolumes).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Sort Volumes (Dimensional Sorting)</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(auction.apvSortVolumes).map(([sort, volume]) => (
                      <div key={sort} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                        <span className="font-medium text-sm">{sort}</span>
                        <span className="text-sm font-semibold text-primary">{volume} m³</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {auction.apvDimensionalSorting && !auction.apvSortVolumes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Dimensional Sorting</div>
                  <div className="font-medium text-sm bg-muted/30 p-3 rounded-md">
                    {auction.apvDimensionalSorting}
                  </div>
                </div>
              )}
              {auction.apvVolumePerSpecies && Object.keys(auction.apvVolumePerSpecies).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Volume per Species</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(auction.apvVolumePerSpecies).map(([species, volume]) => (
                      <div key={species} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                        <span className="font-medium text-sm">{species}</span>
                        <span className="text-sm font-semibold text-primary">{volume} m³</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Documents Section */}
          {auction.documents && auction.documents.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documents
              </h3>
              <div className="space-y-2">
                {auction.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    showDelete={false}
                  />
                ))}
              </div>
            </Card>
          )}

          {bids && bids.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Recent Bids</h3>
              <div className="space-y-3">
                {bids.map((bid) => {
                  // Fallback for old bid format
                  const bidPerM3 = bid.amountPerM3 ?? ((bid as any).amount / auction.volumeM3);
                  return (
                    <div key={bid.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <div className="font-medium">{bid.bidderAnonymousId || bid.bidderName}</div>
                        <div className="text-xs text-muted-foreground">
                          {getRelativeTime(bid.timestamp)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {formatPricePerM3(bidPerM3)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatProjectedTotal(calculateProjectedTotal(bidPerM3, auction.volumeM3))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {canBid && !bidModalOpen && isAuctionLive && (
        <div className="fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 z-10">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Main price and bid button row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-2xl font-bold text-primary">
                  {formatPricePerM3(currentPricePerM3)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatProjectedTotal(calculateProjectedTotal(currentPricePerM3, auction.volumeM3))} total
                </div>
              </div>
              <div className="flex gap-2">
                {userBidAnalysis && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-6"
                    onClick={() => {
                      setInitialBidPerM3(userBidAnalysis.suggestedRaise);
                      setInitialMaxProxyPerM3(userBidAnalysis.suggestedRaise + userBidAnalysis.increment);
                      setBidModalOpen(true);
                    }}
                  >
                    Quick Raise
                  </Button>
                )}
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-semibold"
                  onClick={() => {
                    setInitialBidPerM3(undefined);
                    setInitialMaxProxyPerM3(undefined);
                    setBidModalOpen(true);
                  }}
                  data-testid="button-place-bid"
                >
                  Place Bid
                </Button>
              </div>
            </div>

            {/* User bid status row (only if user has bid) */}
            {userBidAnalysis && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Your max: <span className="font-semibold text-foreground">{formatPricePerM3(userBidAnalysis.maxProxyPerM3)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Buffer: <span className={`font-semibold ${
                      userBidAnalysis.bufferStatus === 'danger' ? 'text-destructive' :
                      userBidAnalysis.bufferStatus === 'warning' ? 'text-amber-500' :
                      'text-primary'
                    }`}>{formatPricePerM3(userBidAnalysis.buffer)}</span>
                  </span>
                </div>
                {userBidAnalysis.latestBid && (
                  <span className="text-muted-foreground">
                    Last bid: {getRelativeTime(userBidAnalysis.latestBid.timestamp)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {canBid && (
        <BidModal
          auction={auction}
          open={bidModalOpen}
          onOpenChange={setBidModalOpen}
          onPlaceBid={handlePlaceBid}
          initialBidPerM3={initialBidPerM3}
          initialMaxProxyPerM3={initialMaxProxyPerM3}
        />
      )}
    </div>
  );
}
