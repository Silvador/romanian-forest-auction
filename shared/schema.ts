import { z } from "zod";

// User schema
export const userRoles = ["forest_owner", "buyer"] as const;
export const kycStatus = ["pending", "verified", "rejected"] as const;

export interface User {
  id: string;
  email: string;
  role: typeof userRoles[number];
  displayName: string;
  kycStatus: typeof kycStatus[number];
  kycDocumentUrl?: string;
  createdAt: number;
}

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(userRoles),
  displayName: z.string().min(2),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Auction schema
export const auctionStatus = ["draft", "upcoming", "active", "ended", "sold"] as const;
export const speciesTypes = ["Stejar", "Gorun", "Fag", "Molid", "Pin", "Paltin", "Frasin"] as const;
export const regions = [
  "Maramureș",
  "Transilvania",
  "Bucovina",
  "Moldova",
  "Muntenia",
  "Oltenia",
  "Banat",
  "Crișana"
] as const;

export interface SpeciesBreakdown {
  species: typeof speciesTypes[number];
  percentage: number;
}

export interface Auction {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  region: typeof regions[number];
  location: string;
  gpsCoordinates?: { lat: number; lng: number };
  speciesBreakdown: SpeciesBreakdown[];
  dominantSpecies: string; // Primary species for increment calculation
  volumeM3: number;
  startingPricePerM3: number; // €/m³ starting price
  currentPricePerM3: number; // €/m³ current price
  projectedTotalValue: number; // Calculated: currentPricePerM3 × volumeM3
  currentBidderId?: string;
  currentBidderName?: string;
  currentBidderAnonymousId?: string; // BIDDER-XXXX format for anonymity
  secondHighestPricePerM3: number; // For second-price clearing (€/m³)
  highestMaxProxyPerM3?: number; // Highest proxy bid (€/m³)
  status: typeof auctionStatus[number];
  imageUrls: string[];
  documentUrls: string[];
  startTime: number;
  endTime: number;
  originalEndTime: number; // Track original end time before soft-close extensions
  activityWindowCutoff: number; // T-15min timestamp for activity rule
  softCloseActive: boolean; // Whether in soft-close period
  createdAt: number;
  bidCount: number;
  apvPermitNumber?: string;
  apvUpLocation?: string;
  apvUaLocation?: string;
  apvForestCompany?: string;
  apvDateOfMarking?: string;
  apvDimensionalSorting?: string;
  apvVolumePerSpecies?: Record<string, number>;
  apvNumberOfTrees?: number;
  apvAverageHeight?: number;
  apvAverageDiameter?: number;
  apvNetVolume?: number;
  apvGrossVolume?: number;
  apvSurfaceHa?: number;
  apvFirewoodVolume?: number;
  apvBarkVolume?: number;
  apvTreatmentType?: string;
  apvExtractionMethod?: string;
  apvSortVolumes?: Record<string, number>;
  apvPermitCode?: string;
  apvProductType?: string;
  apvHarvestYear?: number;
  apvInventoryMethod?: string;
  apvHammerMark?: string;
  apvAccessibility?: string;
  apvAverageAge?: number;
  apvSlopePercent?: number;
}

export const insertAuctionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  region: z.enum(regions),
  location: z.string().min(3, "Location must be at least 3 characters"),
  gpsCoordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  speciesBreakdown: z.array(z.object({
    species: z.enum(speciesTypes),
    percentage: z.number().min(0).max(100),
  })).min(1).refine(
    (breakdown) => {
      const total = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      return Math.abs(total - 100) <= 0.01;
    },
    { message: "Species breakdown must total exactly 100%" }
  ),
  dominantSpecies: z.string().optional(), // Will auto-calculate if not provided
  volumeM3: z.coerce.number().min(1, "Volume must be at least 1 m³"),
  startingPricePerM3: z.coerce.number().min(0.1, "Starting price must be at least €0.1/m³"),
  imageUrls: z.array(z.string()).optional(),
  documentUrls: z.array(z.string()).optional(),
  startTime: z.number(),
  endTime: z.number(),
  apvPermitNumber: z.string().optional(),
  apvUpLocation: z.string().optional(),
  apvUaLocation: z.string().optional(),
  apvForestCompany: z.string().optional(),
  apvDateOfMarking: z.string().optional(),
  apvDimensionalSorting: z.string().optional(),
  apvVolumePerSpecies: z.record(z.number()).optional(),
  apvNumberOfTrees: z.number().optional(),
  apvAverageHeight: z.number().optional(),
  apvAverageDiameter: z.number().optional(),
  apvNetVolume: z.number().optional(),
  apvGrossVolume: z.number().optional(),
  apvSurfaceHa: z.number().optional(),
  apvFirewoodVolume: z.number().optional(),
  apvBarkVolume: z.number().optional(),
  apvTreatmentType: z.string().optional(),
  apvExtractionMethod: z.string().optional(),
  apvSortVolumes: z.record(z.number()).optional(),
  apvPermitCode: z.string().optional(),
  apvProductType: z.string().optional(),
  apvHarvestYear: z.number().optional(),
  apvInventoryMethod: z.string().optional(),
  apvHammerMark: z.string().optional(),
  apvAccessibility: z.string().optional(),
  apvAverageAge: z.number().optional(),
  apvSlopePercent: z.number().optional(),
});

export type InsertAuction = z.infer<typeof insertAuctionSchema>;

// Bid schema
export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderAnonymousId: string; // BIDDER-XXXX format
  amountPerM3: number; // Bid amount in €/m³
  maxProxyPerM3: number; // Maximum €/m³ user is willing to pay
  isProxyBid: boolean; // Whether this was auto-placed by auction engine
  timestamp: number;
}

export const insertBidSchema = z.object({
  auctionId: z.string(),
  amountPerM3: z.number().min(0.1, "Bid must be at least €0.1/m³"),
  maxProxyPerM3: z.number().min(0.1, "Max proxy bid must be at least €0.1/m³"),
});

export type InsertBid = z.infer<typeof insertBidSchema>;

// Notification schema
export const notificationTypes = ["outbid", "won", "sold", "new_bid", "auction_ending"] as const;

export interface Notification {
  id: string;
  userId: string;
  type: typeof notificationTypes[number];
  title: string;
  message: string;
  auctionId?: string;
  read: boolean;
  timestamp: number;
}

export type InsertNotification = Omit<Notification, "id">;

// Filter types for auction feed
export interface AuctionFilters {
  region?: typeof regions[number];
  species?: typeof speciesTypes[number];
  minVolume?: number;
  maxVolume?: number;
  status?: typeof auctionStatus[number];
}

// Dashboard stats
export interface DashboardStats {
  totalVolume: number;
  averagePricePerM3: number;
  activeListings?: number;
  totalSales?: number;
  activeBids?: number;
  auctionsWon?: number;
}

// Market data for charts
export interface MarketDataPoint {
  date: string;
  pricePerM3: number;
  species: typeof speciesTypes[number];
}

// APV document extraction
export interface ApvExtractionResult {
  permitNumber: string;
  upLocation: string;
  uaLocation: string;
  forestCompany: string;
  volumeM3: number;
  species: string;
  speciesBreakdown: SpeciesBreakdown[];
  diameter?: string;
  grading?: string;
  dateOfMarking?: string;
  dimensionalSorting?: string;
  volumePerSpecies?: Record<string, number>;
  numberOfTrees?: number;
  averageHeight?: number;
  averageDiameter?: number;
  netVolume?: number;
  grossVolume?: number;
  surfaceHa?: number;
  firewoodVolume?: number;
  barkVolume?: number;
  treatmentType?: string;
  extractionMethod?: string;
  sortVolumes?: Record<string, number>;
  permitCode?: string;
  productType?: string;
  harvestYear?: number;
  inventoryMethod?: string;
  hammerMark?: string;
  accessibility?: string;
  averageAge?: number;
  slopePercent?: number;
  rawText?: string;
}
