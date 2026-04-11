// ROForest Mobile — Shared Types
// Copied from web app's shared/schema.ts (without Zod — mobile doesn't need server validation)

export const userRoles = ['forest_owner', 'buyer'] as const;
export type UserRole = typeof userRoles[number];

export const kycStatus = ['pending', 'verified', 'rejected'] as const;
export type KycStatus = typeof kycStatus[number];

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  kycStatus: KycStatus;
  kycDocumentUrl?: string;
  createdAt: number;
}

export const auctionStatus = ['draft', 'upcoming', 'active', 'ended', 'sold'] as const;
export type AuctionStatus = typeof auctionStatus[number];

export interface SpeciesBreakdown {
  species: string;
  percentage: number;
  volumeM3?: number;
}

export interface DocumentMetadata {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
  isApvDocument: boolean;
  thumbnailUrl?: string;
}

export interface Auction {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  region: string;
  location: string;
  gpsCoordinates?: { lat: number; lng: number };
  speciesBreakdown: SpeciesBreakdown[];
  dominantSpecies: string;
  volumeM3: number;
  startingPricePerM3: number;
  currentPricePerM3: number;
  projectedTotalValue: number;
  currentBidderId?: string;
  currentBidderName?: string;
  currentBidderAnonymousId?: string;
  secondHighestPricePerM3: number;
  highestMaxProxyPerM3?: number;
  status: AuctionStatus;
  imageUrls: string[];
  documentUrls: string[];
  documents: DocumentMetadata[];
  apvDocumentId?: string;
  startTime: number;
  endTime: number;
  originalEndTime: number;
  activityWindowCutoff: number;
  softCloseActive: boolean;
  createdAt: number;
  bidCount: number;
  // APV fields
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
  apvDendrometryPerSpecies?: Record<string, {
    dt_cm?: number;
    dcg_cm?: number;
    ht_m?: number;
    hc_m?: number;
    age_years?: number;
    volPerTree_m3?: number;
    treeCount?: number;
  }>;
  apvSortVolumesPerSpecies?: Record<string, {
    G1?: number; G2?: number; G3?: number;
    M1?: number; M2?: number; M3?: number;
    LS?: number; firewood?: number; bark?: number;
    grossVolume?: number;
  }>;
  apvRottenTreesCount?: number;
  apvRottenTreesVolume?: number;
  apvDryTreesCount?: number;
  apvDryTreesVolume?: number;
  apvExploitationDeadline?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderAnonymousId: string;
  amountPerM3: number;
  maxProxyPerM3: number;
  isProxyBid: boolean;
  timestamp: number;
}

// What `/api/bids/my-bids` actually returns: a wrapped shape per auction,
// not raw Bid[]. The endpoint groups all of a buyer's bids by auction
// and gives back the latest bid + leading status alongside the auction.
export interface MyBidEntry {
  auction: Auction;
  latestBid: Bid;
  isLeading: boolean;
  bidCount: number;
}

export const notificationTypes = ['outbid', 'won', 'sold', 'new_bid', 'auction_ending'] as const;
export type NotificationType = typeof notificationTypes[number];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  auctionId?: string;
  read: boolean;
  timestamp: number;
}

export type SortOption = 'endTime' | 'volumeAsc' | 'volumeDesc' | 'priceAsc' | 'priceDesc';

export interface AuctionFilters {
  region?: string;
  species?: string;
  minVolume?: number;
  maxVolume?: number;
  minDiameter?: number;
  maxDiameter?: number;
  minPrice?: number;
  maxPrice?: number;
  treatmentType?: string;
  status?: AuctionStatus;
  sortBy?: SortOption;
}

export interface DashboardStats {
  totalVolume: number;
  averagePricePerM3: number;
  activeListings?: number;
  totalSales?: number;
  activeBids?: number;
  auctionsWon?: number;
}

export interface MarketDataPoint {
  date: string;
  pricePerM3: number;
  species: string;
}

export interface MarketAnalytics {
  stats: {
    totalVolume: number;
    avgMarketPrice: number;
    mostPopularSpecies: string;
    totalAuctions: number;
  };
  priceTrendsBySpecies: Record<string, { date: string; pricePerM3: number; count: number }[]>;
  volumeBySpecies: Record<string, number>;
  avgPriceByRegion: { region: string; avgPricePerM3: number }[];
  diameterClasses?: { range: string; count: number; avgPricePerM3: number }[];
  treatmentTypes?: { type: string; count: number; avgPricePerM3: number }[];
  scatterData?: { volume: number; price: number; title: string }[];
}

export const alertTypes = ['price_below', 'price_above', 'volume_threshold'] as const;

export interface PriceAlert {
  id: string;
  userId: string;
  species?: string;
  region?: string;
  alertType: typeof alertTypes[number];
  threshold: number;
  active: boolean;
  createdAt: number;
  lastTriggered?: number;
}

export interface WatchlistPreset {
  id: string;
  userId: string;
  name: string;
  filters: {
    species: string[];
    regions: string[];
    minVolume?: number;
    maxVolume?: number;
    minPrice?: number;
    maxPrice?: number;
    dateRange: '7d' | '30d' | '90d' | '1y' | 'all';
  };
  createdAt: number;
  lastUsed?: number;
}

// Insert types (for creating new entities)
export interface InsertUser {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface InsertBid {
  auctionId: string;
  amountPerM3: number;
  maxProxyPerM3: number;
}

export interface InsertAuction {
  title: string;
  description: string;
  region: string;
  location: string;
  gpsCoordinates?: { lat: number; lng: number };
  speciesBreakdown: SpeciesBreakdown[];
  dominantSpecies?: string;
  volumeM3: number;
  startingPricePerM3: number;
  imageUrls?: string[];
  documentUrls?: string[];
  startTime: number;
  endTime: number;
  // APV fields (all optional)
  apvPermitNumber?: string;
  apvUpLocation?: string;
  apvUaLocation?: string;
  apvForestCompany?: string;
  apvTreatmentType?: string;
  apvExtractionMethod?: string;
  apvNumberOfTrees?: number;
  apvAverageHeight?: number;
  apvAverageDiameter?: number;
  apvSurfaceHa?: number;
  apvSlopePercent?: number;
  apvDendrometryPerSpecies?: Record<string, any>;
  apvSortVolumesPerSpecies?: Record<string, any>;
  apvRottenTreesCount?: number;
  apvRottenTreesVolume?: number;
  apvDryTreesCount?: number;
  apvDryTreesVolume?: number;
  apvExploitationDeadline?: string;
}
