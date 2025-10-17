/**
 * Auction Scheduler
 * Runs periodic jobs to manage auction lifecycles
 */

import cron from "node-cron";
import admin from "firebase-admin";
import { AuctionLifecycleManager } from "./auctionLifecycleManager";

export class AuctionScheduler {
  private lifecycleManager: AuctionLifecycleManager;
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;

  constructor(db: admin.firestore.Firestore) {
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

    // Run lifecycle check immediately on startup
    this.runImmediateLifecycleCheck();

    this.isRunning = true;
    console.log("[SCHEDULER] Auction scheduler started successfully");
    console.log("[SCHEDULER] - Lifecycle check: every 1 minute");
    console.log("[SCHEDULER] - Summary report: every 5 minutes");
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
}
