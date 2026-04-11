/**
 * Auction Scheduler
 * Runs periodic jobs to manage auction lifecycles
 */

import cron from "node-cron";
import admin from "firebase-admin";
import { AuctionLifecycleManager } from "./auctionLifecycleManager";
import { getIO } from "../websocket";

export class AuctionScheduler {
  private lifecycleManager: AuctionLifecycleManager;
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
    this.lifecycleManager = new AuctionLifecycleManager(db);
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log("[SCHEDULER] Auction scheduler is already running");
      return;
    }

    console.log("[SCHEDULER] Starting auction lifecycle scheduler...");

    // Run every minute to check for auction status transitions
    const lifecycleJob = cron.schedule("* * * * *", async () => {
      try {
        await this.lifecycleManager.processAuctionLifecycles();
      } catch (error) {
        console.error("[SCHEDULER] Error in lifecycle job:", error);
      }
    });

    this.cronJobs.push(lifecycleJob);

    // Run every 5 minutes to log auction summary (for monitoring)
    const summaryJob = cron.schedule("*/5 * * * *", async () => {
      try {
        const summary = await this.lifecycleManager.getAuctionsSummary();
        console.log("[SCHEDULER] Auction summary:", summary);
      } catch (error) {
        console.error("[SCHEDULER] Error getting auction summary:", error);
      }
    });

    this.cronJobs.push(summaryJob);

    // Run every 15 minutes to evaluate price alerts
    const alertJob = cron.schedule("*/15 * * * *", async () => {
      try {
        await this.checkPriceAlerts();
      } catch (error) {
        console.error("[SCHEDULER] Error in price alert job:", error);
      }
    });

    this.cronJobs.push(alertJob);

    // Run lifecycle check immediately on startup
    this.runImmediateLifecycleCheck();

    this.isRunning = true;
    console.log("[SCHEDULER] Auction scheduler started successfully");
    console.log("[SCHEDULER] - Lifecycle check: every 1 minute");
    console.log("[SCHEDULER] - Summary report: every 5 minutes");
    console.log("[SCHEDULER] - Price alert check: every 15 minutes");
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("[SCHEDULER] Auction scheduler is not running");
      return;
    }

    console.log("[SCHEDULER] Stopping auction scheduler...");
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    this.isRunning = false;
    console.log("[SCHEDULER] Auction scheduler stopped");
  }

  /**
   * Run lifecycle check immediately (useful on startup)
   */
  private async runImmediateLifecycleCheck(): Promise<void> {
    console.log("[SCHEDULER] Running immediate lifecycle check on startup...");
    try {
      const transitions = await this.lifecycleManager.processAuctionLifecycles();
      const summary = await this.lifecycleManager.getAuctionsSummary();
      console.log("[SCHEDULER] Initial lifecycle check complete");
      console.log("[SCHEDULER] Transitions on startup:", transitions.length);
      console.log("[SCHEDULER] Current auction summary:", summary);
    } catch (error) {
      console.error("[SCHEDULER] Error in immediate lifecycle check:", error);
    }
  }

  /**
   * Manually trigger lifecycle check (useful for testing or manual intervention)
   */
  async triggerLifecycleCheck(): Promise<void> {
    console.log("[SCHEDULER] Manually triggering lifecycle check...");
    try {
      const transitions = await this.lifecycleManager.processAuctionLifecycles();
      console.log("[SCHEDULER] Manual lifecycle check complete. Transitions:", transitions.length);
      return;
    } catch (error) {
      console.error("[SCHEDULER] Error in manual lifecycle check:", error);
      throw error;
    }
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get lifecycle manager instance (for advanced use cases)
   */
  getLifecycleManager(): AuctionLifecycleManager {
    return this.lifecycleManager;
  }

  /**
   * Evaluate all active price alerts against recent auction data.
   * Fires a notification + WebSocket event when a threshold is crossed.
   * Cooldown: 24 hours per alert to avoid spam.
   */
  private async checkPriceAlerts(): Promise<void> {
    console.log("[ALERTS] Running price alert evaluation...");

    // 1. Load all active alerts
    const alertsSnap = await this.db.collection("priceAlerts")
      .where("active", "==", true)
      .get();

    if (alertsSnap.empty) {
      console.log("[ALERTS] No active price alerts found.");
      return;
    }

    // 2. Load completed/sold auctions from the last 90 days for price lookup
    const since90d = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const auctionsSnap = await this.db.collection("auctions")
      .where("status", "in", ["sold", "ended"])
      .get();

    const recentAuctions = auctionsSnap.docs
      .map(d => d.data())
      .filter(a => (a.endTime ?? 0) >= since90d);

    let triggered = 0;

    for (const alertDoc of alertsSnap.docs) {
      const alert = alertDoc.data();
      const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

      // Skip if triggered recently
      if (alert.lastTriggered && (Date.now() - alert.lastTriggered) < COOLDOWN_MS) continue;

      // 3. Filter auctions matching species and/or region
      const matching = recentAuctions.filter(a => {
        const speciesMatch = !alert.species || (a.speciesBreakdown ?? [])
          .some((s: any) => s.species === alert.species);
        const regionMatch = !alert.region || a.region === alert.region;
        return speciesMatch && regionMatch;
      });

      if (matching.length === 0) continue;

      // 4. Calculate average price/m³ from matching auctions (last 30 days preferred)
      const since30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = matching.filter(a => (a.endTime ?? 0) >= since30d);
      const pool = recent.length > 0 ? recent : matching;

      const totalPrice = pool.reduce((sum: number, a: any) =>
        sum + (a.currentPricePerM3 ?? a.startingPricePerM3 ?? 0), 0);
      const avgPrice = totalPrice / pool.length;

      if (avgPrice <= 0) continue;

      // 5. Evaluate threshold condition
      let conditionMet = false;
      if (alert.alertType === "price_below" && avgPrice < alert.threshold) conditionMet = true;
      if (alert.alertType === "price_above" && avgPrice > alert.threshold) conditionMet = true;
      if (alert.alertType === "volume_threshold") {
        const totalVol = pool.reduce((sum: number, a: any) => sum + (a.volumeM3 ?? 0), 0);
        if (totalVol >= alert.threshold) conditionMet = true;
      }

      if (!conditionMet) continue;

      // 6. Build notification text
      const speciesLabel = alert.species ?? "piata";
      const regionLabel = alert.region ? ` în ${alert.region}` : "";
      let title = "Alertă de preț";
      let message = "";

      if (alert.alertType === "price_below") {
        title = `${speciesLabel} sub ${alert.threshold} RON/m³`;
        message = `Prețul mediu pentru ${speciesLabel}${regionLabel} a scăzut la ${Math.round(avgPrice)} RON/m³ (pragul tău: ${alert.threshold} RON/m³).`;
      } else if (alert.alertType === "price_above") {
        title = `${speciesLabel} peste ${alert.threshold} RON/m³`;
        message = `Prețul mediu pentru ${speciesLabel}${regionLabel} a crescut la ${Math.round(avgPrice)} RON/m³ (pragul tău: ${alert.threshold} RON/m³).`;
      } else {
        title = `Volum disponibil pentru ${speciesLabel}`;
        message = `Volumul disponibil pentru ${speciesLabel}${regionLabel} a atins ${Math.round(totalPrice / avgPrice)} m³.`;
      }

      // 7. Write notification to Firestore
      const notification = {
        userId: alert.userId,
        type: "auction_ending" as const, // reuse closest type; schema allows this
        title,
        message,
        read: false,
        timestamp: Date.now(),
      };

      const notifRef = await this.db.collection("notifications").add(notification);

      // 8. Emit real-time WebSocket event
      try {
        const io = getIO();
        io.to(`user:${alert.userId}`).emit("notification:new", {
          id: notifRef.id,
          ...notification,
        });
      } catch (_) {
        // WebSocket not available — notification still persisted in Firestore
      }

      // 9. Update lastTriggered on the alert
      await alertDoc.ref.update({ lastTriggered: Date.now() });

      triggered++;
      console.log(`[ALERTS] Triggered alert "${title}" for user ${alert.userId}`);
    }

    console.log(`[ALERTS] Evaluation complete. ${triggered} alert(s) triggered.`);
  }
}
