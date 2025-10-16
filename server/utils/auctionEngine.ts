/**
 * Centralized Auction Engine (€/m³ Pricing)
 * Handles proxy bidding, second-price clearing, soft-close, and activity rules
 * All bidding is done in €/m³ (price per cubic meter)
 */

import { Auction, Bid } from "@shared/schema";
import { getSpeciesIncrement, calculateProjectedTotal } from "./incrementLadder";

const SOFT_CLOSE_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const SOFT_CLOSE_EXTENSION_MS = 3 * 60 * 1000; // Extend by 3 minutes
const ACTIVITY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes before end

export interface BidResult {
  success: boolean;
  currentPricePerM3: number;
  secondHighestPricePerM3: number;
  highestMaxProxyPerM3: number;
  projectedTotalValue: number; // Calculated: pricePerM3 × volumeM3
  currentBidderId: string;
  currentBidderAnonymousId: string;
  shouldExtendAuction: boolean;
  newEndTime?: number;
  softCloseActive: boolean;
  isProxyBid: boolean;
  actualPricePerM3: number; // What was actually bid per m³ (not max proxy)
  error?: string;
}

export interface ActivityCheck {
  canBid: boolean;
  reason?: string;
}

/**
 * Generate anonymous bidder ID in format BIDDER-XXXX
 */
export function generateAnonymousBidderId(bidderId: string, auctionId: string): string {
  // Create a consistent hash from bidderId and auctionId
  const combined = `${bidderId}-${auctionId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const anonymousCode = Math.abs(hash % 10000).toString().padStart(4, '0');
  return `BIDDER-${anonymousCode}`;
}

/**
 * Check if user is eligible to bid based on activity rule
 * Only users who bid before T-15min can bid during soft-close
 */
export function checkActivityEligibility(
  auction: Auction,
  bidderId: string,
  userBids: Bid[]
): ActivityCheck {
  const now = Date.now();
  const timeUntilEnd = auction.endTime - now;
  const inSoftCloseWindow = timeUntilEnd <= SOFT_CLOSE_WINDOW_MS && timeUntilEnd > 0;

  // If not in soft-close window, anyone can bid
  if (!inSoftCloseWindow) {
    return { canBid: true };
  }

  // In soft-close window - check if user bid before T-15min
  const activityCutoff = auction.activityWindowCutoff;
  const userBidsBeforeCutoff = userBids.filter(
    (bid) => bid.bidderId === bidderId && bid.timestamp < activityCutoff
  );

  if (userBidsBeforeCutoff.length === 0) {
    return {
      canBid: false,
      reason: "You must have placed a bid before the final 15 minutes to bid during the closing period"
    };
  }

  return { canBid: true };
}

/**
 * Check if auction is in soft-close window and should be extended
 */
export function checkSoftClose(auction: Auction): {
  inSoftCloseWindow: boolean;
  shouldExtend: boolean;
  newEndTime?: number;
} {
  const now = Date.now();
  const timeUntilEnd = auction.endTime - now;
  const inSoftCloseWindow = timeUntilEnd <= SOFT_CLOSE_WINDOW_MS && timeUntilEnd > 0;

  if (inSoftCloseWindow) {
    // Extend auction by 3 minutes
    const newEndTime = now + SOFT_CLOSE_EXTENSION_MS;
    return {
      inSoftCloseWindow: true,
      shouldExtend: true,
      newEndTime
    };
  }

  return {
    inSoftCloseWindow: false,
    shouldExtend: false
  };
}

/**
 * Process a proxy bid and determine actual price per m³
 * Implements eBay-style proxy bidding with second-price clearing
 * All values are in €/m³
 */
export function processProxyBid(
  auction: Auction,
  bidderId: string,
  bidderName: string,
  startingBidPerM3: number,
  maxProxyPerM3: number,
  currentHighestMaxProxyPerM3?: number,
  currentLeaderId?: string
): BidResult {
  // BACKWARD COMPATIBILITY: Calculate €/m³ from legacy fields if needed
  const currentPricePerM3 = auction.currentPricePerM3 ?? 
    ((auction as any).currentBid && auction.volumeM3 ? (auction as any).currentBid / auction.volumeM3 : 
    (auction as any).startingPrice ? (auction as any).startingPrice / auction.volumeM3 : 0);
  
  const secondHighestPricePerM3 = auction.secondHighestPricePerM3 ?? currentPricePerM3;
  const dominantSpecies = auction.dominantSpecies || "Amestec"; // Default if missing
  const minIncrementPerM3 = getSpeciesIncrement(dominantSpecies);
  const anonymousId = generateAnonymousBidderId(bidderId, auction.id);

  console.log(`\n[AUCTION ENGINE] Processing proxy bid (€/m³):`, {
    auctionId: auction.id,
    bidderId,
    startingBidPerM3,
    maxProxyPerM3,
    currentPricePerM3: currentPricePerM3,
    currentLeader: currentLeaderId,
    currentHighestMaxProxy: currentHighestMaxProxyPerM3,
    minIncrementPerM3,
    dominantSpecies: dominantSpecies
  });

  // Case 1: First bid or no competition
  if (!currentLeaderId || !currentHighestMaxProxyPerM3) {
    const minRequiredBid = currentPricePerM3 + minIncrementPerM3;
    
    // Use the user's starting bid, but ensure it meets minimum requirement
    const actualPricePerM3 = Math.max(startingBidPerM3, minRequiredBid);
    
    if (maxProxyPerM3 < actualPricePerM3) {
      return {
        success: false,
        error: `Your maximum bid of €${maxProxyPerM3}/m³ is below the required bid of €${actualPricePerM3}/m³`,
        currentPricePerM3: currentPricePerM3,
        secondHighestPricePerM3: secondHighestPricePerM3,
        highestMaxProxyPerM3: currentHighestMaxProxyPerM3 || currentPricePerM3,
        projectedTotalValue: calculateProjectedTotal(currentPricePerM3, auction.volumeM3),
        currentBidderId: currentLeaderId || '',
        currentBidderAnonymousId: '',
        shouldExtendAuction: false,
        softCloseActive: false,
        isProxyBid: false,
        actualPricePerM3: 0
      };
    }

    const projectedTotal = calculateProjectedTotal(actualPricePerM3, auction.volumeM3);
    console.log(`[AUCTION ENGINE] First bid - Setting to €${actualPricePerM3}/m³ (user bid: €${startingBidPerM3}/m³, min: €${minRequiredBid}/m³, projected total: €${projectedTotal})`);
    
    return {
      success: true,
      currentPricePerM3: actualPricePerM3,
      secondHighestPricePerM3: currentPricePerM3, // Starting price is second-highest
      highestMaxProxyPerM3: maxProxyPerM3,
      projectedTotalValue: projectedTotal,
      currentBidderId: bidderId,
      currentBidderAnonymousId: anonymousId,
      shouldExtendAuction: false,
      softCloseActive: false,
      isProxyBid: false,
      actualPricePerM3: actualPricePerM3
    };
  }

  // Case 2: Same bidder updating their max proxy
  if (currentLeaderId === bidderId) {
    const projectedTotal = calculateProjectedTotal(currentPricePerM3, auction.volumeM3);
    console.log(`[AUCTION ENGINE] Same bidder updating max proxy from €${currentHighestMaxProxyPerM3}/m³ to €${maxProxyPerM3}/m³`);
    
    return {
      success: true,
      currentPricePerM3: currentPricePerM3, // No change to current price
      secondHighestPricePerM3: secondHighestPricePerM3,
      highestMaxProxyPerM3: maxProxyPerM3,
      projectedTotalValue: projectedTotal,
      currentBidderId: bidderId,
      currentBidderAnonymousId: anonymousId,
      shouldExtendAuction: false,
      softCloseActive: false,
      isProxyBid: false,
      actualPricePerM3: currentPricePerM3
    };
  }

  // Case 3: New bidder vs existing leader - PROXY BATTLE
  const existingMaxProxy = currentHighestMaxProxyPerM3;
  
  // New bidder's max is lower than current leader's max
  if (maxProxyPerM3 <= existingMaxProxy) {
    // Cap the price at the winner's (current leader's) max proxy bid
    const idealPricePerM3 = maxProxyPerM3 + minIncrementPerM3;
    const newCurrentPricePerM3 = Math.min(idealPricePerM3, existingMaxProxy);
    const projectedTotal = calculateProjectedTotal(newCurrentPricePerM3, auction.volumeM3);
    
    console.log(`[AUCTION ENGINE] New bidder loses proxy battle. Their max €${maxProxyPerM3}/m³ <= leader's max €${existingMaxProxy}/m³`);
    console.log(`[AUCTION ENGINE] Auto-bidding for current leader to €${newCurrentPricePerM3}/m³ (capped at leader's max)`);
    
    // Current leader stays on top, auto-bid to new bidder's max + increment (capped at leader's max)
    return {
      success: true,
      currentPricePerM3: newCurrentPricePerM3,
      secondHighestPricePerM3: maxProxyPerM3, // New bidder's max becomes second-highest
      highestMaxProxyPerM3: existingMaxProxy,
      projectedTotalValue: projectedTotal,
      currentBidderId: currentLeaderId,
      currentBidderAnonymousId: generateAnonymousBidderId(currentLeaderId, auction.id),
      shouldExtendAuction: false,
      softCloseActive: false,
      isProxyBid: true, // This was an auto-bid by the system
      actualPricePerM3: newCurrentPricePerM3
    };
  }

  // Case 4: New bidder's max is higher - they take the lead
  // Cap the price at the winner's (new bidder's) max proxy bid
  const idealPricePerM3 = existingMaxProxy + minIncrementPerM3;
  const newCurrentPricePerM3 = Math.min(idealPricePerM3, maxProxyPerM3);
  const projectedTotal = calculateProjectedTotal(newCurrentPricePerM3, auction.volumeM3);
  
  console.log(`[AUCTION ENGINE] New bidder wins proxy battle. Their max €${maxProxyPerM3}/m³ > leader's max €${existingMaxProxy}/m³`);
  console.log(`[AUCTION ENGINE] New leader takes over at €${newCurrentPricePerM3}/m³ (capped at their max)`);
  
  return {
    success: true,
    currentPricePerM3: newCurrentPricePerM3,
    secondHighestPricePerM3: existingMaxProxy, // Previous leader's max becomes second-highest
    highestMaxProxyPerM3: maxProxyPerM3,
    projectedTotalValue: projectedTotal,
    currentBidderId: bidderId,
    currentBidderAnonymousId: anonymousId,
    shouldExtendAuction: false,
    softCloseActive: false,
    isProxyBid: false,
    actualPricePerM3: newCurrentPricePerM3
  };
}

/**
 * Validate and process a new bid (€/m³)
 */
export function validateBid(
  auction: Auction,
  bidderId: string,
  amountPerM3: number,
  maxProxyPerM3: number
): { valid: boolean; error?: string } {
  // Check if auction has started
  if (Date.now() < auction.startTime) {
    return { valid: false, error: "Auction has not started yet" };
  }

  // Check if auction has ended
  if (Date.now() > auction.endTime) {
    return { valid: false, error: "Auction has ended" };
  }

  // Check if bidder is the owner
  if (bidderId === auction.ownerId) {
    return { valid: false, error: "You cannot bid on your own auction" };
  }

  // BACKWARD COMPATIBILITY: Calculate €/m³ from legacy fields if needed
  const currentPricePerM3 = auction.currentPricePerM3 ?? 
    ((auction as any).currentBid && auction.volumeM3 ? (auction as any).currentBid / auction.volumeM3 : 
    (auction as any).startingPrice ? (auction as any).startingPrice / auction.volumeM3 : 0);
  const dominantSpecies = auction.dominantSpecies || "Amestec";

  // Validate increment (€/m³)
  const minIncrementPerM3 = getSpeciesIncrement(dominantSpecies);
  const minValidPricePerM3 = currentPricePerM3 + minIncrementPerM3;

  if (amountPerM3 < minValidPricePerM3) {
    return {
      valid: false,
      error: `Minimum bid is €${minValidPricePerM3}/m³ (current €${currentPricePerM3}/m³ + €${minIncrementPerM3}/m³ increment for ${dominantSpecies})`
    };
  }

  // Validate max proxy bid
  if (maxProxyPerM3 < amountPerM3) {
    return {
      valid: false,
      error: "Your maximum bid must be at least equal to your current bid"
    };
  }

  return { valid: true };
}
