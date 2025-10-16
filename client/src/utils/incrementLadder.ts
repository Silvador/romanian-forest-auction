/**
 * Species-Based Increment Configuration (Client-side)
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
 */
export function getSpeciesIncrement(dominantSpecies: string): number {
  const speciesConfig = SPECIES_INCREMENT_MAP.find(
    (s) => s.species === dominantSpecies
  );
  
  return speciesConfig?.incrementPerM3 || DEFAULT_INCREMENT_PER_M3;
}

/**
 * Calculate the next valid bid per m³ based on species increment
 */
export function calculateNextBidPerM3(
  currentPricePerM3: number, 
  dominantSpecies: string
): number {
  const increment = getSpeciesIncrement(dominantSpecies);
  return currentPricePerM3 + increment;
}

/**
 * Get quick bid increments based on species
 * Returns multiples of the species increment: 1x, 2x, 3x
 */
export function getQuickBidIncrements(dominantSpecies: string): Array<{ label: string; incrementPerM3: number }> {
  const baseIncrement = getSpeciesIncrement(dominantSpecies);
  return [
    { label: `+${baseIncrement}€/m³`, incrementPerM3: baseIncrement },
    { label: `+${baseIncrement * 2}€/m³`, incrementPerM3: baseIncrement * 2 },
    { label: `+${baseIncrement * 3}€/m³`, incrementPerM3: baseIncrement * 3 }
  ];
}

/**
 * Calculate projected total value
 */
export function calculateProjectedTotal(pricePerM3: number, volumeM3: number): number {
  return pricePerM3 * volumeM3;
}

/**
 * Format price per m³ for display
 */
export function formatPricePerM3(pricePerM3: number | undefined | null | any): string {
  const value = typeof pricePerM3 === 'number' ? pricePerM3 : 0;
  return `€${value.toFixed(1)}/m³`;
}

/**
 * Format projected total value for display
 */
export function formatProjectedTotal(total: number | undefined | null | any): string {
  const value = typeof total === 'number' ? total : 0;
  return `€${value.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}`;
}
