// All 36 species types from the web app's shared/schema.ts

export const speciesTypes = [
  // Hardwood species (Foioase)
  'Stejar pedunculat',
  'Stejar brumăriu',
  'Gorun',
  'Cer',
  'Fag',
  'Carpen',
  'Frasin',
  'Jugastru',
  'Paltin de câmp',
  'Paltin de munte',
  'Tei argintiu',
  'Tei cu frunze mari',
  'Ulm de câmp',
  'Ulm de munte',
  'Anin alb',
  'Anin negru',
  'Mesteacăn',
  'Plop tremurător',
  'Plop alb',
  'Plop negru',
  'Salcie albă',
  'Salcâm',
  'Cireș sălbatic',
  'Măr sălbatic',
  'Păr sălbatic',
  'Sorb de munte',
  'Nuc',
  'Castanul',

  // Coniferous species (Răşinoase)
  'Molid',
  'Brad',
  'Pin silvestru',
  'Pin negru',
  'Larice',
  'Zâmbru',
  'Tisă',

  // Other/Generic
  'Altele',
] as const;

export type SpeciesType = typeof speciesTypes[number];

// Species categories for filtering
export const hardwoodSpecies = speciesTypes.slice(0, 28);
export const coniferousSpecies = speciesTypes.slice(28, 35);
