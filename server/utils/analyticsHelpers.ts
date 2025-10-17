/**
 * Analytics Helper Functions
 * Modular utilities for processing market analytics data
 */

// ==================== CONSTANTS ====================

/** Maximum diameter boundary for classification (in centimeters) */
export const MAX_DIAMETER_BOUNDARY = 1000;

/** Configurable diameter ranges for classification */
export const DIAMETER_RANGES = [
  { label: "< 20cm", min: 0, max: 20 },
  { label: "20-30cm", min: 20, max: 30 },
  { label: "30-40cm", min: 30, max: 40 },
  { label: "40-50cm", min: 40, max: 50 },
  { label: "50-60cm", min: 50, max: 60 },
  { label: "> 60cm", min: 60, max: MAX_DIAMETER_BOUNDARY },
] as const;

// ==================== TYPESCRIPT INTERFACES ====================

/** Statistics for a diameter class grouping */
export interface DiameterClassStats {
  /** Human-readable label for the diameter range */
  label: string;
  /** Number of auctions in this diameter class */
  auctionCount: number;
  /** Average price per m³ for this class */
  avgPricePerM3: number;
  /** Total volume sold in this class (m³) */
  totalVolume: number;
  /** Minimum price per m³ in this class (optional enhancement) */
  minPricePerM3?: number;
  /** Maximum price per m³ in this class (optional enhancement) */
  maxPricePerM3?: number;
  /** Median price per m³ in this class (optional enhancement) */
  medianPricePerM3?: number;
  /** Percentage of total volume (optional enhancement) */
  volumePercentage?: number;
}

/** Statistics for a treatment type grouping */
export interface TreatmentTypeStats {
  /** APV treatment type identifier */
  treatmentType: string;
  /** Number of auctions with this treatment type */
  auctionCount: number;
  /** Total volume sold with this treatment (m³) */
  totalVolume: number;
  /** Average price per m³ for this treatment type */
  avgPricePerM3: number;
  /** Percentage of total volume (optional enhancement) */
  volumePercentage?: number;
}

/** Single data point for volume vs price scatter plot */
export interface ScatterPoint {
  /** Total volume of the auction (m³) */
  volume: number;
  /** Final or current price per m³ (€) */
  pricePerM3: number;
  /** Dominant tree species */
  species: string;
  /** Geographic region */
  region: string;
  /** Average diameter (cm) */
  diameter?: number;
  /** APV treatment type */
  treatmentType?: string;
}

/** Auction data interface (subset of fields needed for analytics) */
interface AuctionData {
  volumeM3?: number;
  currentPricePerM3?: number;
  startingPricePerM3?: number;
  apvAverageDiameter?: number;
  apvTreatmentType?: string;
  dominantSpecies?: string;
  region?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extracts the effective price per m³ from an auction
 * Falls back to starting price if no current price exists
 *
 * @param auction - Auction data object
 * @returns Price per m³ in euros
 */
export function getAuctionPrice(auction: AuctionData): number {
  return auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0;
}

/**
 * Finds the appropriate diameter range for a given diameter value
 *
 * @param diameter - Diameter value in centimeters
 * @param ranges - Array of diameter range definitions
 * @returns Matching range object or undefined
 */
function findDiameterRange(
  diameter: number,
  ranges: typeof DIAMETER_RANGES
): typeof DIAMETER_RANGES[number] | undefined {
  return ranges.find(range => diameter >= range.min && diameter < range.max);
}

/**
 * Calculates median value from an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Median value
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ==================== MAIN TRANSFORMATION FUNCTIONS ====================

/**
 * Groups completed auctions by diameter class and calculates statistics
 *
 * Transformation steps:
 * 1. Filter auctions with valid diameter data
 * 2. Classify each auction into diameter ranges
 * 3. Aggregate statistics per diameter class using reduce pattern
 * 4. Calculate enhanced metrics (min/max/median, percentages)
 *
 * @param auctions - Array of completed auction data
 * @param ranges - Diameter range configuration (optional, uses default)
 * @returns Map of diameter class labels to statistics
 */
export function groupByDiameterClass(
  auctions: AuctionData[],
  ranges: typeof DIAMETER_RANGES = DIAMETER_RANGES
): Record<string, DiameterClassStats> {
  // Step 1: Filter auctions with valid diameter data
  const auctionsWithDiameter = auctions.filter(a => a.apvAverageDiameter !== undefined);

  // Calculate total volume for percentage calculations
  const totalVolume = auctionsWithDiameter.reduce((sum, a) => sum + (a.volumeM3 || 0), 0);

  // Step 2-3: Classify and aggregate using reduce (immutable pattern)
  const diameterGroups = auctionsWithDiameter.reduce((acc, auction) => {
    const diameter = auction.apvAverageDiameter!;
    const range = findDiameterRange(diameter, ranges);

    if (!range) return acc; // Skip if no matching range

    const pricePerM3 = getAuctionPrice(auction);
    const volume = auction.volumeM3 || 0;

    // Initialize group if it doesn't exist
    if (!acc[range.label]) {
      acc[range.label] = {
        label: range.label,
        auctionCount: 0,
        avgPricePerM3: 0,
        totalVolume: 0,
        prices: [], // Temporary array for enhanced stats
      };
    }

    const group = acc[range.label];

    // Accumulate statistics
    return {
      ...acc,
      [range.label]: {
        ...group,
        auctionCount: group.auctionCount + 1,
        avgPricePerM3: group.avgPricePerM3 + pricePerM3, // Sum for now, divide later
        totalVolume: group.totalVolume + volume,
        prices: [...(group.prices || []), pricePerM3], // Track all prices for enhanced stats
      },
    };
  }, {} as Record<string, DiameterClassStats & { prices?: number[] }>);

  // Step 4: Calculate final averages and enhanced metrics
  return Object.entries(diameterGroups).reduce((acc, [label, group]) => {
    const prices = group.prices || [];
    const count = group.auctionCount;

    return {
      ...acc,
      [label]: {
        label,
        auctionCount: count,
        avgPricePerM3: count > 0 ? group.avgPricePerM3 / count : 0,
        totalVolume: group.totalVolume,
        // Enhanced metrics
        minPricePerM3: prices.length > 0 ? Math.min(...prices) : 0,
        maxPricePerM3: prices.length > 0 ? Math.max(...prices) : 0,
        medianPricePerM3: calculateMedian(prices),
        volumePercentage: totalVolume > 0 ? (group.totalVolume / totalVolume) * 100 : 0,
      },
    };
  }, {} as Record<string, DiameterClassStats>);
}

/**
 * Groups completed auctions by APV treatment type and calculates statistics
 *
 * Transformation steps:
 * 1. Filter auctions with valid treatment type data
 * 2. Group by treatment type using reduce pattern
 * 3. Calculate aggregate statistics per treatment type
 * 4. Calculate percentages of total volume
 *
 * @param auctions - Array of completed auction data
 * @returns Map of treatment types to statistics
 */
export function groupByTreatmentType(
  auctions: AuctionData[]
): Record<string, TreatmentTypeStats> {
  // Step 1: Filter auctions with valid treatment type
  const auctionsWithTreatment = auctions.filter(a => a.apvTreatmentType !== undefined);

  // Calculate total volume for percentage calculations
  const totalVolume = auctionsWithTreatment.reduce((sum, a) => sum + (a.volumeM3 || 0), 0);

  // Step 2-3: Group and aggregate using reduce (immutable pattern)
  const treatmentGroups = auctionsWithTreatment.reduce((acc, auction) => {
    const treatmentType = auction.apvTreatmentType!;
    const pricePerM3 = getAuctionPrice(auction);
    const volume = auction.volumeM3 || 0;

    // Initialize group if it doesn't exist
    if (!acc[treatmentType]) {
      acc[treatmentType] = {
        treatmentType,
        auctionCount: 0,
        totalVolume: 0,
        avgPricePerM3: 0,
      };
    }

    const group = acc[treatmentType];

    // Accumulate statistics (immutable update)
    return {
      ...acc,
      [treatmentType]: {
        ...group,
        auctionCount: group.auctionCount + 1,
        totalVolume: group.totalVolume + volume,
        avgPricePerM3: group.avgPricePerM3 + pricePerM3, // Sum for now, divide later
      },
    };
  }, {} as Record<string, TreatmentTypeStats>);

  // Step 4: Calculate final averages and percentages
  return Object.entries(treatmentGroups).reduce((acc, [type, group]) => {
    const count = group.auctionCount;

    return {
      ...acc,
      [type]: {
        ...group,
        avgPricePerM3: count > 0 ? group.avgPricePerM3 / count : 0,
        volumePercentage: totalVolume > 0 ? (group.totalVolume / totalVolume) * 100 : 0,
      },
    };
  }, {} as Record<string, TreatmentTypeStats>);
}

/**
 * Builds scatter plot data points for volume vs price analysis
 *
 * Transformation steps:
 * 1. Map each auction to a scatter point with relevant dimensions
 * 2. Include additional context (species, region, diameter, treatment)
 * 3. Filter out invalid data points (missing volume or price)
 *
 * @param auctions - Array of completed auction data
 * @returns Array of scatter plot data points
 */
export function buildScatterData(auctions: AuctionData[]): ScatterPoint[] {
  // Step 1-2: Map auctions to scatter points
  return auctions
    .map(auction => ({
      volume: auction.volumeM3 || 0,
      pricePerM3: getAuctionPrice(auction),
      species: auction.dominantSpecies || "Unknown",
      region: auction.region || "Unknown",
      diameter: auction.apvAverageDiameter,
      treatmentType: auction.apvTreatmentType,
    }))
    // Step 3: Filter out invalid data points
    .filter(point => point.volume > 0 && point.pricePerM3 > 0);
}
