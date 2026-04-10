/**
 * seed-demo-auctions.ts
 * Creates 50 demo auctions in Firestore for Piata analytics visualisation.
 * Run with: tsx server/scripts/seed-demo-auctions.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });

// ── Firebase Admin init ────────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// ── Reference data ─────────────────────────────────────────────────────────────
const REGIONS = [
  'Maramureș', 'Transilvania', 'Bucovina', 'Moldova',
  'Muntenia', 'Oltenia', 'Banat', 'Crișana',
];

const LOCATIONS = [
  'Vișeu de Sus', 'Borșa', 'Câmpulung Moldovenesc', 'Suceava',
  'Brașov', 'Cluj-Napoca', 'Piatra Neamț', 'Roman',
  'Sinaia', 'Câmpina', 'Rm. Vâlcea', 'Horezu',
  'Reșița', 'Caransebeș', 'Oradea', 'Beiuș',
];

// Species with realistic price ranges (RON/m³)
const SPECIES_CONFIG: Record<string, { minPrice: number; maxPrice: number }> = {
  'Molid':             { minPrice: 160, maxPrice: 260 },
  'Brad':              { minPrice: 140, maxPrice: 220 },
  'Fag':               { minPrice: 180, maxPrice: 310 },
  'Stejar pedunculat': { minPrice: 220, maxPrice: 380 },
  'Gorun':             { minPrice: 200, maxPrice: 350 },
  'Carpen':            { minPrice: 120, maxPrice: 190 },
  'Frasin':            { minPrice: 190, maxPrice: 320 },
  'Cer':               { minPrice: 150, maxPrice: 240 },
  'Paltin de munte':   { minPrice: 160, maxPrice: 270 },
  'Tei argintiu':      { minPrice: 130, maxPrice: 200 },
  'Jugastru':          { minPrice: 120, maxPrice: 180 },
  'Mesteacăn':         { minPrice: 100, maxPrice: 160 },
  'Pin silvestru':     { minPrice: 130, maxPrice: 210 },
  'Larice':            { minPrice: 170, maxPrice: 280 },
};

const SPECIES_NAMES = Object.keys(SPECIES_CONFIG);

const TREATMENT_TYPES = ['Tăieri rase', 'Tăieri progresive', 'Tăieri de igienă', 'Tăieri selective'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 0) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a timestamp N days ago with optional hour offset */
function daysAgo(days: number, hourOffset = 0): number {
  return Date.now() - days * 86_400_000 + hourOffset * 3_600_000;
}

/** Build a speciesBreakdown that sums to exactly 100 */
function buildSpeciesBreakdown(dominant: string, count: 1 | 2 | 3) {
  if (count === 1) return [{ species: dominant, percentage: 100 }];
  if (count === 2) {
    const pct = randInt(60, 80);
    const secondary = pick(SPECIES_NAMES.filter(s => s !== dominant));
    return [
      { species: dominant, percentage: pct },
      { species: secondary, percentage: 100 - pct },
    ];
  }
  // 3 species
  const p1 = randInt(50, 70);
  const p2 = randInt(15, 100 - p1 - 5);
  const p3 = 100 - p1 - p2;
  const others = SPECIES_NAMES.filter(s => s !== dominant);
  const s2 = pick(others);
  const s3 = pick(others.filter(s => s !== s2));
  return [
    { species: dominant, percentage: p1 },
    { species: s2,        percentage: p2 },
    { species: s3,        percentage: p3 },
  ];
}

// ── Auction template ───────────────────────────────────────────────────────────
interface DemoAuction {
  title: string;
  description: string;
  region: string;
  location: string;
  speciesBreakdown: { species: string; percentage: number }[];
  dominantSpecies: string;
  volumeM3: number;
  startingPricePerM3: number;
  currentPricePerM3: number;
  secondHighestPricePerM3: number;
  projectedTotalValue: number;
  status: string;
  startTime: number;
  endTime: number;
  originalEndTime: number;
  activityWindowCutoff: number;
  softCloseActive: boolean;
  bidCount: number;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  gpsCoordinates: { lat: number; lng: number };
  apvTreatmentType: string;
  apvAverageDiameter: number;
  imageUrls: string[];
  documentUrls: string[];
  documents: any[];
}

function makeDemoAuction(
  i: number,
  status: 'ended' | 'sold' | 'active' | 'upcoming',
  endDaysAgo: number,
): DemoAuction {
  const dominant = pick(SPECIES_NAMES);
  const cfg = SPECIES_CONFIG[dominant];
  const speciesCount = pick([1, 2, 2, 3] as const);
  const breakdown = buildSpeciesBreakdown(dominant, speciesCount);

  const volume = randInt(200, 2800);
  const startingPrice = randFloat(cfg.minPrice * 0.85, cfg.minPrice);
  // Ended/sold auctions have been bid up; active ones may have some bids
  const priceMultiplier =
    status === 'ended' || status === 'sold' ? randFloat(1.05, 1.45, 2) :
    status === 'active'   ? randFloat(1.0,  1.15, 2) : 1;
  const currentPrice = parseFloat((startingPrice * priceMultiplier).toFixed(0));
  const bids = status === 'ended' || status === 'sold' ? randInt(3, 22) :
               status === 'active' ? randInt(0, 8) : 0;

  const endTs   = daysAgo(endDaysAgo, randInt(-12, 12));
  const startTs = endTs - randInt(3, 14) * 86_400_000;

  const region   = pick(REGIONS);
  const location = pick(LOCATIONS);

  return {
    title: `Lot ${String(i + 1).padStart(3, '0')} — ${dominant}, ${region}`,
    description: `Lot demonstrativ cu ${dominant} din zona ${location}. Suprafata impadurita, acces auto, APV emis. Calitate superioara.`,
    region,
    location,
    speciesBreakdown: breakdown,
    dominantSpecies: dominant,
    volumeM3: volume,
    startingPricePerM3: startingPrice,
    currentPricePerM3: currentPrice,
    secondHighestPricePerM3: parseFloat((currentPrice * 0.97).toFixed(0)),
    projectedTotalValue: currentPrice * volume,
    status,
    startTime: startTs,
    endTime: endTs,
    originalEndTime: endTs,
    activityWindowCutoff: endTs - 15 * 60 * 1000,
    softCloseActive: false,
    bidCount: bids,
    ownerId: 'demo-owner-seed',
    ownerName: 'Demo Proprietar',
    createdAt: startTs - randInt(1, 5) * 86_400_000,
    gpsCoordinates: {
      lat: randFloat(44.5, 47.8, 4),
      lng: randFloat(22.0, 29.5, 4),
    },
    apvTreatmentType: pick(TREATMENT_TYPES),
    apvAverageDiameter: randInt(18, 65),
    imageUrls: [],
    documentUrls: [],
    documents: [],
  };
}

// ── Build 50 auctions ──────────────────────────────────────────────────────────
//
// Distribution:
//   30 × ended/sold  — spread over last 90 days (drives analytics trends)
//   10 × active      — ending in the next 1–14 days
//    5 × sold        — ended 7–30 days ago (recent wins)
//    5 × upcoming    — starting in the future
//
function buildAuctions(): DemoAuction[] {
  const auctions: DemoAuction[] = [];

  // 30 ended — spread over 90-day history for chart trends
  for (let i = 0; i < 30; i++) {
    const daysBack = randInt(1, 90);
    auctions.push(makeDemoAuction(i, 'ended', daysBack));
  }

  // 5 recently sold
  for (let i = 30; i < 35; i++) {
    const daysBack = randInt(7, 30);
    auctions.push(makeDemoAuction(i, 'sold', daysBack));
  }

  // 10 active — endTime in the future (negative daysAgo = future)
  for (let i = 35; i < 45; i++) {
    const futureDays = -randInt(1, 14); // endTime in the future
    auctions.push(makeDemoAuction(i, 'active', futureDays));
  }

  // 5 upcoming
  for (let i = 45; i < 50; i++) {
    const futureDays = -randInt(5, 21);
    auctions.push(makeDemoAuction(i, 'upcoming', futureDays));
  }

  return auctions;
}

// ── Write to Firestore ─────────────────────────────────────────────────────────
async function seed() {
  const auctions = buildAuctions();
  const col = db.collection('auctions');

  // Delete old demo data first
  console.log('Cleaning up old demo auctions...');
  const existing = await col.where('ownerId', '==', 'demo-owner-seed').get();
  const deleteOps = existing.docs.map(d => d.ref.delete());
  await Promise.all(deleteOps);
  console.log(`  Deleted ${deleteOps.length} old demo auctions.`);

  // Write new ones in batches of 499 (Firestore limit)
  console.log(`Writing ${auctions.length} demo auctions...`);
  const batch = db.batch();
  for (const auction of auctions) {
    const ref = col.doc();
    batch.set(ref, auction);
  }
  await batch.commit();

  // Summary
  const byStatus: Record<string, number> = {};
  for (const a of auctions) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  console.log('\n✅ Done!');
  console.log('Status breakdown:', byStatus);
  console.log('Species in set:', [...new Set(auctions.map(a => a.dominantSpecies))].sort().join(', '));
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
