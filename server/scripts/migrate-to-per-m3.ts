/**
 * Migration script to convert existing auction data from total EUR pricing to €/m³ pricing
 * 
 * This script:
 * 1. Fetches all auctions from Firestore
 * 2. Calculates dominantSpecies from speciesBreakdown (highest percentage)
 * 3. Converts startingPrice → startingPricePerM3
 * 4. Converts currentBid → currentPricePerM3
 * 5. Calculates projectedTotalValue
 * 6. Updates secondHighestPricePerM3 and highestMaxProxyPerM3 if they exist
 * 7. Updates all bids: amount → amountPerM3, maxProxyBid → maxProxyPerM3
 */

import { listDocuments, getDocument, setDocument } from '../services/firestoreRestClient';

interface OldAuction {
  id: string;
  volumeM3: number;
  startingPrice?: number;
  currentBid?: number;
  currentPricePerM3?: number; // Check if already migrated
  speciesBreakdown: Array<{ species: string; percentage: number }>;
  [key: string]: any;
}

interface OldBid {
  id: string;
  auctionId: string;
  amount?: number;
  maxProxyBid?: number;
  amountPerM3?: number; // Check if already migrated
  [key: string]: any;
}

function calculateDominantSpecies(speciesBreakdown: Array<{ species: string; percentage: number }>): string {
  if (!speciesBreakdown || speciesBreakdown.length === 0) {
    return "Amestec"; // Default fallback
  }
  
  const sorted = [...speciesBreakdown].sort((a, b) => b.percentage - a.percentage);
  return sorted[0].species;
}

async function migrateAuctions() {
  console.log('🔄 Starting auction migration to €/m³ pricing...\n');

  try {
    // Fetch all auctions
    const auctionDocs = await listDocuments('auctions');
    const auctions: OldAuction[] = auctionDocs.map(doc => ({ ...doc, id: doc.id }));

    console.log(`Found ${auctions.length} auctions to migrate\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const auction of auctions) {
      try {
        // Skip if already migrated (has currentPricePerM3)
        if (auction.currentPricePerM3 !== undefined) {
          console.log(`⏭️  Skipping ${auction.id} - already migrated`);
          skippedCount++;
          continue;
        }

        const volumeM3 = auction.volumeM3;
        
        if (!volumeM3 || volumeM3 <= 0) {
          console.error(`❌ Auction ${auction.id} has invalid volume: ${volumeM3}`);
          errorCount++;
          continue;
        }

        // Skip if missing required fields
        if (!auction.startingPrice || !auction.currentBid) {
          console.log(`⏭️  Skipping ${auction.id} - missing price fields`);
          skippedCount++;
          continue;
        }

        // Calculate new fields
        const dominantSpecies = calculateDominantSpecies(auction.speciesBreakdown);
        const startingPricePerM3 = auction.startingPrice / volumeM3;
        const currentPricePerM3 = auction.currentBid / volumeM3;
        const projectedTotalValue = currentPricePerM3 * volumeM3;

        // Build update object with new fields
        const updates: any = {
          ...auction,
          dominantSpecies,
          startingPricePerM3: Number(startingPricePerM3.toFixed(2)),
          currentPricePerM3: Number(currentPricePerM3.toFixed(2)),
          projectedTotalValue: Number(projectedTotalValue.toFixed(2)),
        };

        // Initialize proxy bid fields if they don't exist
        if (updates.secondHighestPricePerM3 === undefined) {
          updates.secondHighestPricePerM3 = Number(startingPricePerM3.toFixed(2));
        }
        if (updates.highestMaxProxyPerM3 === undefined) {
          updates.highestMaxProxyPerM3 = auction.currentBidderId ? Number(currentPricePerM3.toFixed(2)) : 0;
        }

        // Update auction in Firestore
        await setDocument('auctions', auction.id, updates);

        console.log(`✅ Migrated auction ${auction.id}:`);
        console.log(`   - Dominant species: ${dominantSpecies}`);
        console.log(`   - Starting: €${updates.startingPricePerM3}/m³`);
        console.log(`   - Current: €${updates.currentPricePerM3}/m³`);
        console.log(`   - Projected total: €${updates.projectedTotalValue}`);

        successCount++;
      } catch (error: any) {
        console.error(`❌ Error migrating auction ${auction.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Auction Migration Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);

  } catch (error: any) {
    console.error('❌ Fatal error during auction migration:', error.message);
    throw error;
  }
}

async function migrateBids() {
  console.log('\n🔄 Starting bids migration to €/m³ pricing...\n');

  try {
    // Fetch all bids
    const bidDocs = await listDocuments('bids');
    const allBids: OldBid[] = bidDocs.map(doc => ({ ...doc, id: doc.id }));

    console.log(`Found ${allBids.length} bids to migrate\n`);

    // Also need auctions to get volumeM3
    const auctionDocs = await listDocuments('auctions');
    const auctions: OldAuction[] = auctionDocs.map(doc => ({ ...doc, id: doc.id }));
    const auctionMap = new Map(auctions.map(a => [a.id, a]));

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const bid of allBids) {
      try {
        // Skip if already migrated
        if (bid.amountPerM3 !== undefined) {
          console.log(`⏭️  Skipping bid ${bid.id} - already migrated`);
          skippedCount++;
          continue;
        }

        const auction = auctionMap.get(bid.auctionId);
        if (!auction) {
          console.error(`❌ Bid ${bid.id} references non-existent auction ${bid.auctionId}`);
          errorCount++;
          continue;
        }

        const volumeM3 = auction.volumeM3;
        if (!volumeM3 || volumeM3 <= 0) {
          console.error(`❌ Bid ${bid.id} auction has invalid volume: ${volumeM3}`);
          errorCount++;
          continue;
        }

        // Skip if missing required fields
        if (!bid.amount || !bid.maxProxyBid) {
          console.log(`⏭️  Skipping bid ${bid.id} - missing price fields`);
          skippedCount++;
          continue;
        }

        // Calculate new fields
        const amountPerM3 = bid.amount / volumeM3;
        const maxProxyPerM3 = bid.maxProxyBid / volumeM3;

        const updates = {
          ...bid,
          amountPerM3: Number(amountPerM3.toFixed(2)),
          maxProxyPerM3: Number(maxProxyPerM3.toFixed(2)),
        };

        // Update bid in Firestore
        await setDocument('bids', bid.id, updates);

        console.log(`✅ Migrated bid ${bid.id}: €${updates.amountPerM3}/m³ (max: €${updates.maxProxyPerM3}/m³)`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Error migrating bid ${bid.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Bids Migration Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);

  } catch (error: any) {
    console.error('❌ Fatal error during bids migration:', error.message);
    throw error;
  }
}

async function runMigration() {
  console.log('🚀 Starting data migration to €/m³ pricing system\n');
  console.log('=' .repeat(60) + '\n');

  try {
    await migrateAuctions();
    await migrateBids();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('=' .repeat(60) + '\n');
  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed:', error.message);
    console.error('=' .repeat(60) + '\n');
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration, migrateAuctions, migrateBids };
