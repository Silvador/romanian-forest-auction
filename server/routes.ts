import type { Express } from "express";
import { createServer, type Server } from "http";
import admin from "firebase-admin";
import { z } from "zod";
import { insertAuctionSchema, insertBidSchema, Auction, Bid } from "@shared/schema";
import { getDocument, setDocument } from "./services/firestoreRestClient";
import { extractApvData } from "./services/ocrService";
import {
  validateBid,
  processProxyBid,
  checkActivityEligibility,
  checkSoftClose,
  generateAnonymousBidderId
} from "./utils/auctionEngine";
import { AuctionScheduler } from "./services/auctionScheduler";
import {
  groupByDiameterClass,
  groupByTreatmentType,
  buildScatterData,
  getAuctionPrice,
} from "./utils/analyticsHelpers";

// Initialize Firebase Admin (optional for MVP - client SDK handles most operations)
// Server-side Firebase Admin is not required for this MVP as all operations
// use client-side Firebase SDK with Firestore security rules
let db: admin.firestore.Firestore | null = null;
let auctionScheduler: AuctionScheduler | null = null;

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Force Firestore to use REST instead of gRPC
      process.env.FIRESTORE_EMULATOR_HOST = '';
      process.env.GOOGLE_CLOUD_PROJECT = projectId;
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      // Use default database (not a named database)
      db = admin.firestore();
      // Firestore settings
      db.settings({
        ignoreUndefinedProperties: true,
        // Force REST API usage by disabling gRPC
        useBigInt: false,
      });
      console.log("✅ Firebase Admin initialized successfully");

      // Initialize auction scheduler for lifecycle management
      auctionScheduler = new AuctionScheduler(db);
      auctionScheduler.start();
      console.log("✅ Auction lifecycle scheduler initialized and started");
    } else {
      console.log("ℹ️  Firebase Admin not configured - All operations use client-side Firebase SDK");
      console.log("   This is expected for the MVP. The app will work fully with Firestore security rules.");
    }
  } catch (error) {
    console.warn("⚠️  Firebase Admin initialization failed - client SDK fallbacks will be used:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create auction
  app.post("/api/auctions", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Server-side Firebase not configured. Please use client SDK to create auctions directly." 
        });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Get user data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      if (userData?.role !== "forest_owner") {
        return res.status(403).json({ error: "Only forest owners can create auctions" });
      }

      // Validate request body
      const validatedData = insertAuctionSchema.parse(req.body);

      // Determine dominant species (highest percentage, or first if all equal)
      const dominantSpecies = validatedData.dominantSpecies || 
        validatedData.speciesBreakdown.reduce((max, current) => 
          current.percentage > max.percentage ? current : max
        ).species;

      // Calculate projected total value
      const projectedTotalValue = validatedData.startingPricePerM3 * validatedData.volumeM3;

      // Create auction with €/m³ proxy bidding fields
      const auctionData = {
        ...validatedData,
        ownerId: userId,
        ownerName: userData.displayName,
        dominantSpecies,
        currentPricePerM3: validatedData.startingPricePerM3,
        secondHighestPricePerM3: validatedData.startingPricePerM3, // Initialize to starting price
        projectedTotalValue,
        originalEndTime: validatedData.endTime, // Track original end time
        activityWindowCutoff: validatedData.endTime - (15 * 60 * 1000), // T-15min timestamp
        softCloseActive: false,
        status: req.body.status || "upcoming",
        bidCount: 0,
        createdAt: Date.now(),
      };

      const auctionRef = await db.collection("auctions").add(auctionData);
      
      res.status(201).json({ 
        id: auctionRef.id,
        ...auctionData 
      });
    } catch (error: any) {
      console.error("Error creating auction:", error);
      res.status(400).json({ error: error.message || "Failed to create auction" });
    }
  });

  // Place bid with proxy bidding
  app.post("/api/bids", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Server-side Firebase not configured. Please use client SDK to place bids directly." 
        });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Get user data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data();
      if (userData?.role !== "buyer") {
        return res.status(403).json({ error: "Only buyers can place bids" });
      }

      // Validate request body with proxy bid (€/m³)
      const validatedData = insertBidSchema.parse(req.body);
      const { auctionId, amountPerM3, maxProxyPerM3 } = validatedData;

      // Get auction
      const auctionDoc = await db.collection("auctions").doc(auctionId).get();
      if (!auctionDoc.exists) {
        return res.status(404).json({ error: "Auction not found" });
      }

      const auction = auctionDoc.data() as Auction;
      if (!auction) {
        return res.status(404).json({ error: "Auction not found" });
      }

      // Validate basic bid using auction engine (€/m³)
      const validation = validateBid(auction, userId, amountPerM3, maxProxyPerM3);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Get user's previous bids for activity check
      const userBidsSnapshot = await db.collection("bids")
        .where("auctionId", "==", auctionId)
        .where("bidderId", "==", userId)
        .get();
      
      const userBids = userBidsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Bid));

      // Check activity eligibility for soft-close period
      const activityCheck = checkActivityEligibility(auction, userId, userBids);
      if (!activityCheck.canBid) {
        return res.status(403).json({ error: activityCheck.reason });
      }

      // Store previous bidder for notifications
      const previousBidderId = auction.currentBidderId;

      // Process proxy bid through auction engine (€/m³)
      const bidResult = processProxyBid(
        auction,
        userId,
        userData.displayName,
        amountPerM3,
        maxProxyPerM3,
        auction.highestMaxProxyPerM3,
        auction.currentBidderId
      );

      if (!bidResult.success) {
        return res.status(400).json({ error: bidResult.error });
      }

      // Check for soft-close extension
      const softCloseCheck = checkSoftClose(auction);
      const shouldExtendAuction = softCloseCheck.shouldExtend;
      const newEndTime = softCloseCheck.newEndTime || auction.endTime;

      // Create bid record with €/m³ proxy info
      const bidData = {
        auctionId,
        bidderId: userId,
        bidderName: userData.displayName,
        bidderAnonymousId: bidResult.currentBidderAnonymousId,
        amountPerM3: bidResult.actualPricePerM3,
        maxProxyPerM3: maxProxyPerM3,
        isProxyBid: bidResult.isProxyBid,
        timestamp: Date.now(),
      };

      await db.collection("bids").add(bidData);

      // Update auction with €/m³ proxy bidding fields
      const auctionUpdate: any = {
        currentPricePerM3: bidResult.currentPricePerM3,
        currentBidderId: bidResult.currentBidderId,
        currentBidderName: userData.displayName,
        currentBidderAnonymousId: bidResult.currentBidderAnonymousId,
        secondHighestPricePerM3: bidResult.secondHighestPricePerM3,
        highestMaxProxyPerM3: bidResult.highestMaxProxyPerM3,
        projectedTotalValue: bidResult.projectedTotalValue,
        softCloseActive: softCloseCheck.inSoftCloseWindow,
        bidCount: admin.firestore.FieldValue.increment(1),
      };

      // Extend auction if in soft-close window
      if (shouldExtendAuction) {
        auctionUpdate.endTime = newEndTime;
        console.log(`[SOFT-CLOSE] Extending auction ${auctionId} to ${new Date(newEndTime).toISOString()}`);
      }

      await db.collection("auctions").doc(auctionId).update(auctionUpdate);

      // Create notification for previous bidder (if exists and different user)
      if (previousBidderId && previousBidderId !== userId) {
        console.log(`[NOTIFICATION] Creating outbid notification for ${previousBidderId}`);
        await db.collection("notifications").add({
          userId: previousBidderId,
          type: "outbid",
          title: "You've been outbid!",
          message: `You've been outbid on "${auction.title}". Current: €${bidResult.currentPricePerM3}/m³ (€${bidResult.projectedTotalValue.toLocaleString()} total)`,
          auctionId,
          read: false,
          timestamp: Date.now(),
        });
        console.log(`[NOTIFICATION] Outbid notification created successfully`);
      } else {
        console.log(`[NOTIFICATION] Skipping outbid notification - previousBidderId: ${previousBidderId}, currentUser: ${userId}`);
      }

      // Create notification for auction owner
      console.log(`[NOTIFICATION] Creating new_bid notification for owner ${auction.ownerId}`);
      await db.collection("notifications").add({
        userId: auction.ownerId,
        type: "new_bid",
        title: "New bid received!",
        message: `New bid: €${bidResult.currentPricePerM3}/m³ (€${bidResult.projectedTotalValue.toLocaleString()} total) on "${auction.title}"`,
        auctionId,
        read: false,
        timestamp: Date.now(),
      });
      console.log(`[NOTIFICATION] New_bid notification created successfully`);

      res.status(201).json({ 
        success: true,
        bid: bidData,
        auctionUpdate: {
          currentPricePerM3: bidResult.currentPricePerM3,
          secondHighestPricePerM3: bidResult.secondHighestPricePerM3,
          highestMaxProxyPerM3: bidResult.highestMaxProxyPerM3,
          projectedTotalValue: bidResult.projectedTotalValue,
          endTime: shouldExtendAuction ? newEndTime : auction.endTime,
          softCloseActive: softCloseCheck.inSoftCloseWindow
        }
      });
    } catch (error: any) {
      console.error("Error placing bid:", error);
      res.status(400).json({ error: error.message || "Failed to place bid" });
    }
  });

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  
  // Get all auctions for feed (public listing)
  app.get("/api/auctions/feed", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { listDocuments } = await import("./services/firestoreRestClient");
      const allAuctions = await listDocuments("auctions");

      res.json(allAuctions);
    } catch (error: any) {
      console.error("Error fetching auction feed:", error);
      res.status(500).json({ error: "Failed to fetch auctions" });
    }
  });

  // Get forest owner's listings (My Auctions dashboard)
  app.get("/api/auctions/my-listings", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { getDocument, listDocuments } = await import("./services/firestoreRestClient");
      const userData = await getDocument("users", userId);
      
      if (userData?.role !== "forest_owner") {
        return res.status(403).json({ error: "Only forest owners can view their listings" });
      }

      const allAuctions = await listDocuments("auctions");
      const myAuctions = allAuctions.filter(a => a.ownerId === userId);

      res.json(myAuctions);
    } catch (error: any) {
      console.error("Error fetching my listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Get forest owner's performance stats
  app.get("/api/auctions/performance-stats", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { getDocument, listDocuments } = await import("./services/firestoreRestClient");
      const userData = await getDocument("users", userId);
      
      if (userData?.role !== "forest_owner") {
        return res.status(403).json({ error: "Only forest owners can view performance stats" });
      }

      const allAuctions = await listDocuments("auctions");
      const myAuctions = allAuctions.filter(a => a.ownerId === userId);

      const totalAuctions = myAuctions.length;
      const activeAuctions = myAuctions.filter(a => a.status === "active").length;
      const completedAuctions = myAuctions.filter(a => a.status === "completed").length;
      
      const totalBids = myAuctions.reduce((sum, a) => sum + (a.bidCount || 0), 0);
      const avgBidsPerAuction = totalAuctions > 0 ? totalBids / totalAuctions : 0;
      
      const completedWithBids = myAuctions.filter(a => a.status === "completed" && (a.bidCount || 0) > 0);
      const avgPrice = completedWithBids.length > 0 
        ? completedWithBids.reduce((sum, a) => sum + (a.currentPricePerM3 || 0), 0) / completedWithBids.length
        : 0;
      
      const successRate = totalAuctions > 0 ? (completedWithBids.length / totalAuctions) * 100 : 0;

      res.json({
        totalAuctions,
        activeAuctions,
        completedAuctions,
        totalBids,
        avgBidsPerAuction: parseFloat(avgBidsPerAuction.toFixed(1)),
        avgPricePerM3: parseFloat(avgPrice.toFixed(2)),
        successRate: parseFloat(successRate.toFixed(1)),
      });
    } catch (error: any) {
      console.error("Error fetching performance stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get buyer's active bids
  app.get("/api/bids/my-bids", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { getDocument, listDocuments } = await import("./services/firestoreRestClient");
      const userData = await getDocument("users", userId);
      
      if (userData?.role !== "buyer") {
        return res.status(403).json({ error: "Only buyers can view their bids" });
      }

      const allBids = await listDocuments("bids");
      const myBids = allBids.filter(b => b.bidderId === userId);
      
      // Get unique auction IDs
      const auctionIds = Array.from(new Set(myBids.map(b => b.auctionId)));
      
      // Fetch auction details
      const allAuctions = await listDocuments("auctions");
      const bidAuctions = allAuctions.filter(a => auctionIds.includes(a.id));
      
      // Combine bid data with auction data
      const bidsWithAuctions = bidAuctions.map(auction => {
        const userBids = myBids.filter(b => b.auctionId === auction.id);
        const latestBid = userBids.sort((a, b) => b.timestamp - a.timestamp)[0];
        
        return {
          auction,
          latestBid,
          isLeading: auction.currentBidderId === userId,
          bidCount: userBids.length,
        };
      });

      res.json(bidsWithAuctions);
    } catch (error: any) {
      console.error("Error fetching my bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Get buyer's won auctions
  app.get("/api/auctions/won", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { getDocument, listDocuments } = await import("./services/firestoreRestClient");
      const userData = await getDocument("users", userId);
      
      if (userData?.role !== "buyer") {
        return res.status(403).json({ error: "Only buyers can view won auctions" });
      }

      const allAuctions = await listDocuments("auctions");
      const wonAuctions = allAuctions.filter(a =>
        (a.status === "sold" || a.status === "ended") && a.currentBidderId === userId
      );

      res.json(wonAuctions);
    } catch (error: any) {
      console.error("Error fetching won auctions:", error);
      res.status(500).json({ error: "Failed to fetch won auctions" });
    }
  });

  // Get user's watchlist
  app.get("/api/watchlist", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { listDocuments } = await import("./services/firestoreRestClient");
      const allWatchlistItems = await listDocuments("watchlist");
      const userWatchlist = allWatchlistItems.filter(w => w.userId === userId);
      
      // Get auction details for each watchlist item
      const allAuctions = await listDocuments("auctions");
      const watchlistAuctions = allAuctions.filter(a => 
        userWatchlist.some(w => w.auctionId === a.id)
      );

      res.json(watchlistAuctions);
    } catch (error: any) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  // Add auction to watchlist
  app.post("/api/watchlist", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Server-side Firebase not configured" 
        });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { auctionId } = req.body;
      if (!auctionId) {
        return res.status(400).json({ error: "Auction ID is required" });
      }

      // Check if already in watchlist
      const existingSnapshot = await db.collection("watchlist")
        .where("userId", "==", userId)
        .where("auctionId", "==", auctionId)
        .get();

      if (!existingSnapshot.empty) {
        return res.status(400).json({ error: "Auction already in watchlist" });
      }

      // Add to watchlist
      const watchlistItem = {
        userId,
        auctionId,
        addedAt: Date.now(),
      };

      await db.collection("watchlist").add(watchlistItem);
      res.status(201).json({ success: true, watchlistItem });
    } catch (error: any) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  // Remove auction from watchlist
  app.delete("/api/watchlist/:auctionId", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: "Server-side Firebase not configured" 
        });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { auctionId } = req.params;

      // Find and delete watchlist item
      const snapshot = await db.collection("watchlist")
        .where("userId", "==", userId)
        .where("auctionId", "==", auctionId)
        .get();

      if (snapshot.empty) {
        return res.status(404).json({ error: "Auction not in watchlist" });
      }

      await snapshot.docs[0].ref.delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Get auctions for current user (dashboard - filtered by ownership/bids)
  app.get("/api/auctions", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Get user data to determine role
      const { getDocument, listDocuments } = await import("./services/firestoreRestClient");
      const userData = await getDocument("users", userId);
      if (!userData) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get all auctions and filter in JavaScript
      const allAuctions = await listDocuments("auctions");

      let filteredAuctions;
      // Filter based on role
      if (userData?.role === "forest_owner") {
        filteredAuctions = allAuctions.filter(a => a.ownerId === userId);
      } else if (userData?.role === "buyer") {
        filteredAuctions = allAuctions.filter(a => a.currentBidderId === userId);
      } else {
        // For general users, return all auctions
        filteredAuctions = allAuctions;
      }

      res.json(filteredAuctions);
    } catch (error: any) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ error: "Failed to fetch auctions" });
    }
  });

  // Get auction by ID (parameterized route - must come AFTER specific routes)
  app.get("/api/auctions/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { id } = req.params;
      const { getDocument } = await import("./services/firestoreRestClient");
      const auction = await getDocument("auctions", id);
      
      if (!auction) {
        return res.status(404).json({ error: "Auction not found" });
      }

      res.json(auction);
    } catch (error: any) {
      console.error("Error fetching auction:", error);
      res.status(500).json({ error: "Failed to fetch auction" });
    }
  });

  // Get bids for an auction
  app.get("/api/bids/:auctionId", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { auctionId } = req.params;
      const { listDocuments } = await import("./services/firestoreRestClient");
      const allBids = await listDocuments("bids");
      
      // Filter bids for this auction and sort by timestamp descending
      const auctionBids = allBids
        .filter((bid: any) => bid.auctionId === auctionId)
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 10); // Limit to 10 most recent bids

      res.json(auctionBids);
    } catch (error: any) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Create user document
  app.post("/api/users", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const authEmail = decodedToken.email;

      const { email, displayName, role, kycStatus } = req.body;

      console.log(`[USER-CREATE] Creating user document for UID: ${userId}`);
      console.log(`[USER-CREATE] Email: ${email}, Display Name: ${displayName}, Role: ${role}, KYC: ${kycStatus || "pending"}`);

      const userData = {
        id: userId,
        email,
        displayName,
        role,
        kycStatus: kycStatus || "pending",
        createdAt: Date.now()
      };

      await setDocument("users", userId, userData);

      console.log(`[USER-CREATE] User document created successfully for ${email} with role: ${role}`);
      res.status(201).json(userData);
    } catch (error: any) {
      console.error("[USER-CREATE] Error creating user:", error);
      res.status(500).json({ error: "Failed to create user document", details: error.message });
    }
  });

  // Get current user data
  app.get("/api/user/me", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const email = decodedToken.email;

      console.log(`[USER-ME] Fetching user data for UID: ${userId}, Email: ${email}`);

      const userData = await getDocument("users", userId);
      if (!userData) {
        console.error(`[USER-ME] User document not found for UID: ${userId}, Email: ${email}`);
        console.log(`[USER-ME] The user exists in Auth but has no Firestore document. This usually means signup didn't complete successfully.`);
        return res.status(404).json({
          error: "User not found",
          details: "User document missing in database. Please try signing up again or contact support."
        });
      }

      console.log(`[USER-ME] User found: ${userData.displayName}, Role: ${userData.role}`);
      res.json(userData);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // OCR extraction endpoint for APV documents
  app.post("/api/ocr/extract-apv", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const extractedData = await extractApvData(imageBase64);
      res.json(extractedData);
    } catch (error: any) {
      console.error("OCR extraction error:", error);
      res.status(500).json({ error: error.message || "Failed to extract APV data" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const snapshot = await db.collection("notifications")
        .where("userId", "==", userId)
        .limit(50)
        .get();

      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp instanceof admin.firestore.Timestamp 
          ? data.timestamp.toMillis() 
          : (typeof data.timestamp === 'number' ? data.timestamp : 0);
        
        return {
          id: doc.id,
          ...data,
          timestamp, // Normalize to number
        };
      }).sort((a: any, b: any) => b.timestamp - a.timestamp);

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Create notification (internal/triggered by system events)
  app.post("/api/notifications", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { userId, type, title, message, auctionId } = req.body;
      
      const notificationData = {
        userId,
        type,
        title,
        message,
        auctionId: auctionId || null,
        read: false,
        timestamp: Date.now(),
      };

      const notificationRef = await db.collection("notifications").add(notificationData);
      
      res.status(201).json({ 
        id: notificationRef.id,
        ...notificationData 
      });
    } catch (error: any) {
      console.error("Error creating notification:", error);
      res.status(400).json({ error: error.message || "Failed to create notification" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const { id } = req.params;

      const notificationDoc = await db.collection("notifications").doc(id).get();
      
      if (!notificationDoc.exists) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const notificationData = notificationDoc.data();
      if (notificationData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await notificationDoc.ref.update({ read: true });
      
      res.json({ 
        id: notificationDoc.id,
        ...notificationData,
        read: true 
      });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Get market analytics data
  app.get("/api/market/analytics", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      const { listDocuments } = await import("./services/firestoreRestClient");
      const allAuctions = await listDocuments("auctions");
      const allBids = await listDocuments("bids");

      // Filter completed/sold auctions
      const completedAuctions = allAuctions.filter(a => a.status === "sold" || a.status === "ended");

      // Calculate total volume sold
      const totalVolume = completedAuctions.reduce((sum, a) => sum + (a.volumeM3 || 0), 0);

      // Calculate average market price (weighted by volume) using helper function
      const totalValue = completedAuctions.reduce((sum, a) => {
        const pricePerM3 = getAuctionPrice(a);
        const volume = a.volumeM3 || 0;
        return sum + (pricePerM3 * volume);
      }, 0);
      const avgMarketPrice = totalVolume > 0 ? totalValue / totalVolume : 0;

      // Find most popular species
      const speciesCount: Record<string, number> = {};
      completedAuctions.forEach(a => {
        if (a.speciesBreakdown) {
          a.speciesBreakdown.forEach((sb: any) => {
            speciesCount[sb.species] = (speciesCount[sb.species] || 0) + 1;
          });
        }
      });
      const mostPopularSpecies = Object.entries(speciesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      // Price trends by species (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentAuctions = completedAuctions.filter(a => a.createdAt >= thirtyDaysAgo);

      const priceTrendsBySpecies: Record<string, { date: string; pricePerM3: number; count: number }[]> = {};
      recentAuctions.forEach(a => {
        const dateStr = new Date(a.createdAt).toISOString().split('T')[0];
        const pricePerM3 = getAuctionPrice(a);

        if (a.speciesBreakdown) {
          a.speciesBreakdown.forEach((sb: any) => {
            if (!priceTrendsBySpecies[sb.species]) {
              priceTrendsBySpecies[sb.species] = [];
            }
            const existing = priceTrendsBySpecies[sb.species].find(t => t.date === dateStr);
            if (existing) {
              existing.pricePerM3 = (existing.pricePerM3 * existing.count + pricePerM3) / (existing.count + 1);
              existing.count++;
            } else {
              priceTrendsBySpecies[sb.species].push({ date: dateStr, pricePerM3, count: 1 });
            }
          });
        }
      });

      // Volume sold by species
      const volumeBySpecies: Record<string, number> = {};
      completedAuctions.forEach(a => {
        if (a.speciesBreakdown && a.volumeM3) {
          a.speciesBreakdown.forEach((sb: any) => {
            const speciesVolume = (a.volumeM3 * sb.percentage) / 100;
            volumeBySpecies[sb.species] = (volumeBySpecies[sb.species] || 0) + speciesVolume;
          });
        }
      });

      // Average price by region
      const priceByRegion: Record<string, { total: number; count: number }> = {};
      completedAuctions.forEach(a => {
        const pricePerM3 = getAuctionPrice(a);
        if (!priceByRegion[a.region]) {
          priceByRegion[a.region] = { total: 0, count: 0 };
        }
        priceByRegion[a.region].total += pricePerM3;
        priceByRegion[a.region].count++;
      });

      const avgPriceByRegion = Object.entries(priceByRegion).map(([region, data]) => ({
        region,
        avgPricePerM3: data.count > 0 ? data.total / data.count : 0
      }));

      // ==================== PHASE 2: NEW ANALYTICS ====================

      // Diameter class analysis - using modular helper function
      const diameterClasses = groupByDiameterClass(completedAuctions);

      // Treatment type breakdown - using modular helper function
      const treatmentTypes = groupByTreatmentType(completedAuctions);

      // Volume vs Price scatter data - using modular helper function
      const scatterData = buildScatterData(completedAuctions);

      res.json({
        stats: {
          totalVolume: parseFloat(totalVolume.toFixed(2)),
          avgMarketPrice: parseFloat(avgMarketPrice.toFixed(2)),
          mostPopularSpecies,
          totalAuctions: completedAuctions.length,
        },
        priceTrendsBySpecies,
        volumeBySpecies,
        avgPriceByRegion,
        // Phase 2 analytics
        diameterClasses,
        treatmentTypes,
        scatterData,
      });
    } catch (error: any) {
      console.error("Error fetching market analytics:", error);
      res.status(500).json({ error: "Failed to fetch market analytics" });
    }
  });

  // ==================== PHASE 3: WATCHLIST PRESETS ====================

  // Get user's watchlist presets
  app.get("/api/market/watchlist/presets", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const snapshot = await db.collection("watchlistPresets")
        .where("userId", "==", userId)
        .get();

      const presets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a: any, b: any) => (b.lastUsed || 0) - (a.lastUsed || 0));

      res.json(presets);
    } catch (error: any) {
      console.error("Error fetching watchlist presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  // Create watchlist preset
  app.post("/api/market/watchlist/presets", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { name, filters } = req.body;

      if (!name || !filters) {
        return res.status(400).json({ error: "Name and filters are required" });
      }

      const presetData = {
        userId,
        name,
        filters,
        createdAt: Date.now(),
      };

      const presetRef = await db.collection("watchlistPresets").add(presetData);

      res.status(201).json({
        id: presetRef.id,
        ...presetData,
      });
    } catch (error: any) {
      console.error("Error creating preset:", error);
      res.status(400).json({ error: error.message || "Failed to create preset" });
    }
  });

  // Update preset last used timestamp
  app.patch("/api/market/watchlist/presets/:id/use", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const { id } = req.params;

      const presetDoc = await db.collection("watchlistPresets").doc(id).get();

      if (!presetDoc.exists) {
        return res.status(404).json({ error: "Preset not found" });
      }

      const presetData = presetDoc.data();
      if (presetData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await presetDoc.ref.update({ lastUsed: Date.now() });

      res.json({
        id: presetDoc.id,
        ...presetData,
        lastUsed: Date.now(),
      });
    } catch (error: any) {
      console.error("Error updating preset:", error);
      res.status(500).json({ error: "Failed to update preset" });
    }
  });

  // Delete watchlist preset
  app.delete("/api/market/watchlist/presets/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const { id } = req.params;

      const presetDoc = await db.collection("watchlistPresets").doc(id).get();

      if (!presetDoc.exists) {
        return res.status(404).json({ error: "Preset not found" });
      }

      const presetData = presetDoc.data();
      if (presetData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await presetDoc.ref.delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ error: "Failed to delete preset" });
    }
  });

  // ==================== PHASE 3: PRICE ALERTS ====================

  // Get user's price alerts
  app.get("/api/market/alerts", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const snapshot = await db.collection("priceAlerts")
        .where("userId", "==", userId)
        .get();

      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a: any, b: any) => b.createdAt - a.createdAt);

      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching price alerts:", error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Create price alert
  app.post("/api/market/alerts", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { species, region, alertType, threshold, active } = req.body;

      if (!alertType || !threshold) {
        return res.status(400).json({ error: "Alert type and threshold are required" });
      }

      const alertData = {
        userId,
        species: species || null,
        region: region || null,
        alertType,
        threshold,
        active: active !== undefined ? active : true,
        createdAt: Date.now(),
      };

      const alertRef = await db.collection("priceAlerts").add(alertData);

      res.status(201).json({
        id: alertRef.id,
        ...alertData,
      });
    } catch (error: any) {
      console.error("Error creating alert:", error);
      res.status(400).json({ error: error.message || "Failed to create alert" });
    }
  });

  // Update price alert (toggle active status or modify settings)
  app.patch("/api/market/alerts/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const { id } = req.params;

      const alertDoc = await db.collection("priceAlerts").doc(id).get();

      if (!alertDoc.exists) {
        return res.status(404).json({ error: "Alert not found" });
      }

      const alertData = alertDoc.data();
      if (alertData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updates: any = {};
      if (req.body.active !== undefined) updates.active = req.body.active;
      if (req.body.threshold !== undefined) updates.threshold = req.body.threshold;
      if (req.body.species !== undefined) updates.species = req.body.species;
      if (req.body.region !== undefined) updates.region = req.body.region;

      await alertDoc.ref.update(updates);

      res.json({
        id: alertDoc.id,
        ...alertData,
        ...updates,
      });
    } catch (error: any) {
      console.error("Error updating alert:", error);
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  // Delete price alert
  app.delete("/api/market/alerts/:id", async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: "Server-side Firebase not configured" });
      }

      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;
      const { id } = req.params;

      const alertDoc = await db.collection("priceAlerts").doc(id).get();

      if (!alertDoc.exists) {
        return res.status(404).json({ error: "Alert not found" });
      }

      const alertData = alertDoc.data();
      if (alertData?.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await alertDoc.ref.delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Auction lifecycle management endpoints

  // Manually trigger lifecycle check (admin/testing endpoint)
  app.post("/api/admin/lifecycle/trigger", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      if (!auctionScheduler) {
        return res.status(503).json({ error: "Auction scheduler not initialized" });
      }

      await auctionScheduler.triggerLifecycleCheck();
      res.json({ success: true, message: "Lifecycle check triggered successfully" });
    } catch (error: any) {
      console.error("Error triggering lifecycle check:", error);
      res.status(500).json({ error: "Failed to trigger lifecycle check" });
    }
  });

  // Get auction lifecycle scheduler status
  app.get("/api/admin/lifecycle/status", async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await admin.auth().verifyIdToken(token);

      if (!auctionScheduler) {
        return res.json({
          schedulerActive: false,
          message: "Auction scheduler not initialized"
        });
      }

      const summary = await auctionScheduler.getLifecycleManager().getAuctionsSummary();

      res.json({
        schedulerActive: auctionScheduler.isActive(),
        auctionsSummary: summary,
        timestamp: Date.now()
      });
    } catch (error: any) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ error: "Failed to get scheduler status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
