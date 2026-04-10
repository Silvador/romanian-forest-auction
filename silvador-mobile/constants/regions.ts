// 8 regions from the web app's shared/schema.ts

export const regions = [
  'Maramureș',
  'Transilvania',
  'Bucovina',
  'Moldova',
  'Muntenia',
  'Oltenia',
  'Banat',
  'Crișana',
] as const;

export type Region = typeof regions[number];

// County mapping per region
export const regionCounties: Record<Region, string[]> = {
  'Maramureș': ['Maramureș', 'Satu Mare'],
  'Transilvania': ['Cluj', 'Alba', 'Bistrița-Năsăud', 'Brașov', 'Covasna', 'Harghita', 'Hunedoara', 'Mureș', 'Sibiu'],
  'Bucovina': ['Suceava'],
  'Moldova': ['Bacău', 'Botoșani', 'Galați', 'Iași', 'Neamț', 'Vaslui', 'Vrancea'],
  'Muntenia': ['Argeș', 'Buzău', 'Călărași', 'Dâmbovița', 'Giurgiu', 'Ialomița', 'Ilfov', 'Prahova', 'Teleorman'],
  'Oltenia': ['Dolj', 'Gorj', 'Mehedinți', 'Olt', 'Vâlcea'],
  'Banat': ['Arad', 'Caraș-Severin', 'Timiș'],
  'Crișana': ['Bihor', 'Sălaj'],
};
