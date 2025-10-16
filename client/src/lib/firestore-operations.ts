import { collection, addDoc, updateDoc, doc, increment, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { InsertAuction, InsertBid } from "@shared/schema";

export async function createAuctionFirestore(data: InsertAuction, status: "draft" | "upcoming" = "upcoming") {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) throw new Error("User data not found");

  const userData = userDoc.data();
  if (userData.role !== "forest_owner") {
    throw new Error("Only forest owners can create auctions");
  }

  const auctionData = {
    ...data,
    ownerId: user.uid,
    ownerName: userData.displayName,
    currentBid: data.startingPrice,
    status,
    bidCount: 0,
    createdAt: Date.now(),
    imageUrls: data.imageUrls || [],
    documentUrls: data.documentUrls || [],
  };

  const auctionRef = await addDoc(collection(db, "auctions"), auctionData);
  return { id: auctionRef.id, ...auctionData };
}

export async function placeBidFirestore(auctionId: string, amount: number) {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) throw new Error("User data not found");

  const userData = userDoc.data();
  if (userData.role !== "buyer") {
    throw new Error("Only buyers can place bids");
  }

  const auctionRef = doc(db, "auctions", auctionId);
  const auctionDoc = await getDoc(auctionRef);
  
  if (!auctionDoc.exists()) {
    throw new Error("Auction not found");
  }

  const auction = auctionDoc.data();
  
  if (auction.status !== "active") {
    throw new Error("Auction is not active");
  }

  if (amount <= auction.currentBid) {
    throw new Error(`Bid must be higher than current bid of €${auction.currentBid}`);
  }

  const previousBidderId = auction.currentBidderId;

  const bidData = {
    auctionId,
    bidderId: user.uid,
    bidderName: userData.displayName,
    amount,
    timestamp: Date.now(),
  };

  await addDoc(collection(db, "bids"), bidData);

  await updateDoc(auctionRef, {
    currentBid: amount,
    currentBidderId: user.uid,
    currentBidderName: userData.displayName,
    bidCount: increment(1),
  });

  if (previousBidderId && previousBidderId !== user.uid) {
    await addDoc(collection(db, "notifications"), {
      userId: previousBidderId,
      type: "outbid",
      title: "You've been outbid!",
      message: `${userData.displayName} placed a higher bid of €${amount.toLocaleString()} on "${auction.title}"`,
      auctionId,
      read: false,
      timestamp: Date.now(),
    });
  }

  await addDoc(collection(db, "notifications"), {
    userId: auction.ownerId,
    type: "new_bid",
    title: "New bid received!",
    message: `${userData.displayName} placed a bid of €${amount.toLocaleString()} on "${auction.title}"`,
    auctionId,
    read: false,
    timestamp: Date.now(),
  });

  return { success: true, bid: bidData };
}
