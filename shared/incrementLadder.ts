/**
 * Species-Based Increment Configuration — single source of truth.
 * Imported by server/utils/incrementLadder.ts (re-export).
 * silvador-mobile/lib/incrementLadder.ts must stay in sync manually
 * because the mobile tsconfig cannot resolve @shared/* paths.
 */

export interface SpeciesIncrement {
  species: string;
  incrementPerM3: number;
}

export const SPECIES_INCREMENT_MAP: SpeciesIncrement[] = [
  { species: 'Stejar', incrementPerM3: 3 },
  { species: 'Gorun', incrementPerM3: 3 },
  { species: 'Fag', incrementPerM3: 2 },
  { species: 'Molid', incrementPerM3: 1 },
  { species: 'Pin', incrementPerM3: 1 },
];

export const DEFAULT_INCREMENT_PER_M3 = 2;

export function getSpeciesIncrement(dominantSpecies: string): number {
  const config = SPECIES_INCREMENT_MAP.find((s) => s.species === dominantSpecies);
  return config?.incrementPerM3 ?? DEFAULT_INCREMENT_PER_M3;
}

export function calculateNextBidPerM3(currentPricePerM3: number, dominantSpecies: string): number {
  return currentPricePerM3 + getSpeciesIncrement(dominantSpecies);
}

export function isValidBidIncrement(
  currentPricePerM3: number,
  proposedPricePerM3: number,
  dominantSpecies: string
): boolean {
  return proposedPricePerM3 >= currentPricePerM3 + getSpeciesIncrement(dominantSpecies);
}

export function getSpeciesIncrements(): SpeciesIncrement[] {
  return SPECIES_INCREMENT_MAP;
}

export function calculateProjectedTotal(pricePerM3: number, volumeM3: number): number {
  return pricePerM3 * volumeM3;
}
