/**
 * Species-Based Increment Configuration
 * Determines minimum bid increment per m³ based on dominant species
 */

interface SpeciesIncrement {
  species: string;
  incrementPerM3: number;
}

const SPECIES_INCREMENT_MAP: SpeciesIncrement[] = [
  { species: "Stejar", incrementPerM3: 3 },
  { species: "Gorun", incrementPerM3: 3 },
  { species: "Fag", incrementPerM3: 2 },
  { species: "Molid", incrementPerM3: 1 },
  { species: "Pin", incrementPerM3: 1 },
];

const DEFAULT_INCREMENT_PER_M3 = 2;

/**
 * Get minimum bid increment per m³ for a given species
 * @param dominantSpecies - Primary species of the timber lot
 * @returns Minimum increment per m³ in EUR
 */
export function getSpeciesIncrement(dominantSpecies: string): number {
  const speciesConfig = SPECIES_INCREMENT_MAP.find(
    (s) => s.species === dominantSpecies
  );
  
  return speciesConfig?.incrementPerM3 || DEFAULT_INCREMENT_PER_M3;
}

/**
 * Calculate the next valid bid per m³ based on species increment
 * @param currentPricePerM3 - Current auction price per m³
 * @param dominantSpecies - Primary species of the timber lot
 * @returns Next valid bid per m³
 */
export function calculateNextBidPerM3(
  currentPricePerM3: number, 
  dominantSpecies: string
): number {
  const increment = getSpeciesIncrement(dominantSpecies);
  return currentPricePerM3 + increment;
}

/**
 * Validate if a bid per m³ meets the minimum increment requirement
 * @param currentPricePerM3 - Current auction price per m³
 * @param proposedPricePerM3 - Proposed new bid per m³
 * @param dominantSpecies - Primary species of the timber lot
 * @returns True if bid is valid, false otherwise
 */
export function isValidBidIncrement(
  currentPricePerM3: number,
  proposedPricePerM3: number,
  dominantSpecies: string
): boolean {
  const minIncrement = getSpeciesIncrement(dominantSpecies);
  const minValidBid = currentPricePerM3 + minIncrement;
  return proposedPricePerM3 >= minValidBid;
}

/**
 * Get all species increments for display purposes
 */
export function getSpeciesIncrements(): SpeciesIncrement[] {
  return SPECIES_INCREMENT_MAP;
}

/**
 * Calculate projected total value
 * @param pricePerM3 - Price per cubic meter
 * @param volumeM3 - Total volume in cubic meters
 * @returns Total projected value in EUR
 */
export function calculateProjectedTotal(pricePerM3: number, volumeM3: number): number {
  return pricePerM3 * volumeM3;
}
