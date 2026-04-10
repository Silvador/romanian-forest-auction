// Species-based bid increment logic
// Copied from server/utils/incrementLadder.ts

interface SpeciesIncrement {
  species: string;
  incrementPerM3: number;
}

const SPECIES_INCREMENT_MAP: SpeciesIncrement[] = [
  { species: 'Stejar', incrementPerM3: 3 },
  { species: 'Gorun', incrementPerM3: 3 },
  { species: 'Fag', incrementPerM3: 2 },
  { species: 'Molid', incrementPerM3: 1 },
  { species: 'Pin', incrementPerM3: 1 },
];

const DEFAULT_INCREMENT_PER_M3 = 2;

export function getSpeciesIncrement(dominantSpecies: string): number {
  const speciesConfig = SPECIES_INCREMENT_MAP.find(
    (s) => s.species === dominantSpecies
  );
  return speciesConfig?.incrementPerM3 || DEFAULT_INCREMENT_PER_M3;
}

export function calculateNextBidPerM3(
  currentPricePerM3: number,
  dominantSpecies: string
): number {
  const increment = getSpeciesIncrement(dominantSpecies);
  return currentPricePerM3 + increment;
}

export function isValidBidIncrement(
  currentPricePerM3: number,
  proposedPricePerM3: number,
  dominantSpecies: string
): boolean {
  const minIncrement = getSpeciesIncrement(dominantSpecies);
  const minValidBid = currentPricePerM3 + minIncrement;
  return proposedPricePerM3 >= minValidBid;
}

export function getSpeciesIncrements(): SpeciesIncrement[] {
  return SPECIES_INCREMENT_MAP;
}

export function calculateProjectedTotal(pricePerM3: number, volumeM3: number): number {
  return pricePerM3 * volumeM3;
}
