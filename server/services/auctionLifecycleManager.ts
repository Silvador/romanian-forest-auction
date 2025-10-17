/**
 * Auction Lifecycle Manager
 * Handles automated status transitions and winner notifications
 * Lifecycle: draft → upcoming → active → ended → sold
 */

import admin from "firebase-admin";
import { Auction, Notification } from "@shared/schema";

export interface AuctionTransitionResult {
  auctionId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: number;
  winnerId?: string;
  winnerName?: string;
  finalPrice?: number;
}

export class AuctionLifecycleManager {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * Process all auctions and update their statuses based on current time
   * Returns array of transitions that occurred
   */
  async processAuctionLifecycles(): Promise<AuctionTransitionResult[]> {
    const now = Date.now();
    const transitions: AuctionTransitionResult[] = [];

    try {
      console.log(`[LIFECYCLE] Starting auction lifecycle check at ${new Date(now).toISOString()}`);

      // Get all auctions that might need status updates
      const auctionsSnapshot = await this.db.collection("auctions").get();

      const auctions = auctionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Auction));

      console.log(`[LIFECYCLE] Found ${auctions.length} total auctions to check`);

      for (const auction of auctions) {
        const transition = await this.processAuctionTransition(auction, now);
        if (transition) {
          transitions.push(transition);
        }
      }

      if (transitions.length > 0) {
        console.log(`[LIFECYCLE] Completed ${transitions.length} transitions:`,
          transitions.map(t => `${t.auctionId}: ${t.oldStatus} → ${t.newStatus}`).join(", ")
        );
      } else {
        console.log(`[LIFECYCLE] No transitions needed at this time`);
      }

      return transitions;
    } catch (error) {
      console.error("[LIFECYCLE] Error processing auction lifecycles:", error);
      throw error;
    }
  }

  /**
   * Process a single auction and determine if it needs a status transition
   */
  private async processAuctionTransition(
    auction: Auction,
    now: number
  ): Promise<AuctionTransitionResult | null> {
    const { id, status, startTime, endTime } = auction;

    // Skip if auction is in terminal states
    if (status === "sold" || status === "draft") {
      return null;
    }

    let newStatus: typeof auction.status | null = null;
    let shouldSettleWinner = false;

    // Determine the appropriate status based on time
    if (status === "upcoming" && now >= startTime) {
      newStatus = "active";
      console.log(`[LIFECYCLE] Auction ${id} should transition: upcoming → active`);
    } else if (status === "active" && now >= endTime) {
      newStatus = "ended";
      shouldSettleWinner = true;
      console.log(`[LIFECYCLE] Auction ${id} should transition: active → ended (will settle winner)`);
    } else if (status === "ended" && auction.currentBidderId) {
      // If auction has ended and has a winner, mark as sold
      newStatus = "sold";
      console.log(`[LIFECYCLE] Auction ${id} should transition: ended → sold`);
    }

    if (!newStatus) {
      return null; // No transition needed
    }

    // Update auction status
    await this.updateAuctionStatus(id, newStatus);

    const transition: AuctionTransitionResult = {
      auctionId: id,
      oldStatus: status,
      newStatus: newStatus,
      timestamp: now,
    };

    // Handle notifications based on transition type
    if (newStatus === "active") {
      await this.notifyAuctionStarted(auction);
    } else if (newStatus === "ended" && shouldSettleWinner) {
      await this.settleAuctionWinner(auction);
      transition.winnerId = auction.currentBidderId;
      transition.winnerName = auction.currentBidderName;
      transition.finalPrice = auction.currentPricePerM3;
    } else if (newStatus === "sold") {
      await this.notifyAuctionSold(auction);
    }

    return transition;
  }

  /**
   * Update auction status in Firestore
   */
  private async updateAuctionStatus(
    auctionId: string,
    newStatus: Auction["status"]
  ): Promise<void> {
    try {
      await this.db.collection("auctions").doc(auctionId).update({
        status: newStatus,
        updatedAt: Date.now(),
      });
      console.log(`[LIFECYCLE] Updated auction ${auctionId} status to "${newStatus}"`);
    } catch (error) {
      console.error(`[LIFECYCLE] Failed to update auction ${auctionId} status:`, error);
      throw error;
    }
  }

  /**
   * Notify owner when auction becomes active
   */
  private async notifyAuctionStarted(auction: Auction): Promise<void> {
    try {
      await this.createNotification({
        userId: auction.ownerId,
        type: "auction_ending", // Reusing this type for "auction started"
        title: "Your auction is now live!",
        message: `"${auction.title}" is now active and accepting bids.`,
        auctionId: auction.id,
        read: false,
        timestamp: Date.now(),
      });
      console.log(`[LIFECYCLE] Sent auction started notification to owner ${auction.ownerId}`);
    } catch (error) {
      console.error(`[LIFECYCLE] Failed to send auction started notification:`, error);
    }
  }

  /**
   * Settle auction winner and send notifications
   */
  private async settleAuctionWinner(auction: Auction): Promise<void> {
    try {
      if (!auction.currentBidderId) {
        console.log(`[LIFECYCLE] Auction ${auction.id} ended with no bids`);

        // Notify owner that auction ended without bids
        await this.createNotification({
          userId: auction.ownerId,
          type: "sold",
          title: "Auction ended",
          message: `Your auction "${auction.title}" has ended without any bids.`,
          auctionId: auction.id,
          read: false,
          timestamp: Date.now(),
        });

        return;
      }

      const finalPricePerM3 = auction.currentPricePerM3;
      const finalTotalPrice = auction.projectedTotalValue;

      console.log(`[LIFECYCLE] Settling auction ${auction.id} - Winner: ${auction.currentBidderName} (${auction.currentBidderId}), Final price: €${finalPricePerM3}/m³ (€${finalTotalPrice} total)`);

      // Notify winner
      await this.createNotification({
        userId: auction.currentBidderId,
        type: "won",
        title: "Congratulations! You won the auction!",
        message: `You won "${auction.title}" at €${finalPricePerM3.toFixed(2)}/m³ (Total: €${finalTotalPrice.toLocaleString()})`,
        auctionId: auction.id,
        read: false,
        timestamp: Date.now(),
      });
      console.log(`[LIFECYCLE] Sent winner notification to ${auction.currentBidderId}`);

      // Notify owner
      await this.createNotification({
        userId: auction.ownerId,
        type: "sold",
        title: "Your auction has been sold!",
        message: `"${auction.title}" sold to ${auction.currentBidderName} for €${finalPricePerM3.toFixed(2)}/m³ (Total: €${finalTotalPrice.toLocaleString()})`,
        auctionId: auction.id,
        read: false,
        timestamp: Date.now(),
      });
      console.log(`[LIFECYCLE] Sent sold notification to owner ${auction.ownerId}`);

      // Get all bidders who participated but didn't win
      const bidsSnapshot = await this.db.collection("bids")
        .where("auctionId", "==", auction.id)
        .get();

      const losingBidders = new Set<string>();
      bidsSnapshot.docs.forEach(doc => {
        const bid = doc.data();
        if (bid.bidderId !== auction.currentBidderId) {
          losingBidders.add(bid.bidderId);
        }
      });

      // Notify losing bidders
      for (const bidderId of losingBidders) {
        await this.createNotification({
          userId: bidderId,
          type: "auction_ending",
          title: "Auction ended",
          message: `The auction for "${auction.title}" has ended. The winning bid was €${finalPricePerM3.toFixed(2)}/m³.`,
          auctionId: auction.id,
          read: false,
          timestamp: Date.now(),
        });
      }
      console.log(`[LIFECYCLE] Sent notifications to ${losingBidders.size} losing bidders`);

    } catch (error) {
      console.error(`[LIFECYCLE] Failed to settle auction winner:`, error);
      throw error;
    }
  }

  /**
   * Notify when auction transitions from ended to sold
   */
  private async notifyAuctionSold(auction: Auction): Promise<void> {
    console.log(`[LIFECYCLE] Auction ${auction.id} marked as sold`);
    // Additional logic if needed when status changes to "sold"
    // Most notifications are already sent during the "ended" phase
  }

  /**
   * Create a notification in Firestore
   */
  private async createNotification(notification: Omit<Notification, "id">): Promise<void> {
    try {
      await this.db.collection("notifications").add(notification);
    } catch (error) {
      console.error("[LIFECYCLE] Failed to create notification:", error);
      throw error;
    }
  }

  /**
   * Get summary of all auctions by status
   */
  async getAuctionsSummary(): Promise<Record<string, number>> {
    try {
      const snapshot = await this.db.collection("auctions").get();
      const summary: Record<string, number> = {
        draft: 0,
        upcoming: 0,
        active: 0,
        ended: 0,
        sold: 0,
      };

      snapshot.docs.forEach(doc => {
        const auction = doc.data() as Auction;
        if (auction.status in summary) {
          summary[auction.status]++;
        }
      });

      return summary;
    } catch (error) {
      console.error("[LIFECYCLE] Failed to get auctions summary:", error);
      throw error;
    }
  }
}
