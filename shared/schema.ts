import { z } from "zod";

export const documentMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number().nonnegative(),
  storagePath: z.string(),
  downloadUrl: z.string().url(),
  apvDocumentId: z.string().optional(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

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
export const speciesTypes = [
  // Hardwood species (Foioase)
  "Stejar pedunculat",
  "Stejar brumăriu",
  "Gorun",
  "Cer",
  "Fag",
  "Carpen",
  "Frasin",
  "Jugastru",
  "Paltin de câmp",
  "Paltin de munte",
  "Tei argintiu",
  "Tei cu frunze mari",
  "Ulm de câmp",
  "Ulm de munte",
  "Anin alb",
  "Anin negru",
  "Mesteacăn",
  "Plop tremurător",
  "Plop alb",
  "Plop negru",
  "Salcie albă",
  "Salcâm",
  "Cireș sălbatic",
  "Măr sălbatic",
  "Păr sălbatic",
  "Sorb de munte",
  "Nuc",
  "Castanul",

  // Coniferous species (Răşinoase)
  "Molid",
  "Brad",
  "Pin silvestru",
  "Pin negru",
  "Larice",
  "Zâmbru",
  "Tisă",

  // Other/Generic
  "Altele"
] as const;
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
  volumeM3?: number; // Volume in cubic meters for this species
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
  documents: DocumentMetadata[];
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
  documents: z.array(documentMetadataSchema).optional(),
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
export type SortOption = "endTime" | "volumeAsc" | "volumeDesc" | "priceAsc" | "priceDesc";

export interface AuctionFilters {
  region?: typeof regions[number];
  species?: typeof speciesTypes[number];
  minVolume?: number;
  maxVolume?: number;
  minDiameter?: number;
  maxDiameter?: number;
  minPrice?: number;
  maxPrice?: number;
  treatmentType?: string;
  status?: typeof auctionStatus[number];
  sortBy?: SortOption;
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

// Price Alert schema (Phase 3)
export const alertTypes = ["price_below", "price_above", "volume_threshold"] as const;

export interface PriceAlert {
  id: string;
  userId: string;
  species?: typeof speciesTypes[number];
  region?: typeof regions[number];
  alertType: typeof alertTypes[number];
  threshold: number;
  active: boolean;
  createdAt: number;
  lastTriggered?: number;
}

export const insertPriceAlertSchema = z.object({
  species: z.enum(speciesTypes).optional(),
  region: z.enum(regions).optional(),
  alertType: z.enum(alertTypes),
  threshold: z.number().min(0.1),
  active: z.boolean().default(true),
});

export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;

// Watchlist Preset schema (Phase 3)
export interface WatchlistPreset {
  id: string;
  userId: string;
  name: string;
  filters: {
    species: typeof speciesTypes[number][];
    regions: typeof regions[number][];
    minVolume?: number;
    maxVolume?: number;
    minPrice?: number;
    maxPrice?: number;
    dateRange: "7d" | "30d" | "90d" | "1y" | "all";
  };
  createdAt: number;
  lastUsed?: number;
}

export const insertWatchlistPresetSchema = z.object({
  name: z.string().min(1).max(50),
  filters: z.object({
    species: z.array(z.enum(speciesTypes)),
    regions: z.array(z.enum(regions)),
    minVolume: z.number().optional(),
    maxVolume: z.number().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    dateRange: z.enum(["7d", "30d", "90d", "1y", "all"]),
  }),
});

export type InsertWatchlistPreset = z.infer<typeof insertWatchlistPresetSchema>;
