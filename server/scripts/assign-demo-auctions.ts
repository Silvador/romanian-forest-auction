/**
 * assign-demo-auctions.ts
 * Reassigns all demo auctions (ownerId = 'demo-owner-seed') to a real user.
 * Usage: tsx server/scripts/assign-demo-auctions.ts <email>
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

async function assign() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx server/scripts/assign-demo-auctions.ts <email>');
    process.exit(1);
  }

  // Look up the user
  const user = await auth.getUserByEmail(email);
  console.log(`Found user: ${user.displayName || user.email} (${user.uid})`);

  // Find all demo auctions
  const snap = await db.collection('auctions').where('ownerId', '==', 'demo-owner-seed').get();
  if (snap.empty) {
    console.log('No demo auctions found. Run seed-demo-auctions.ts first.');
    process.exit(0);
  }

  // Batch update ownerId + ownerName
  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, {
      ownerId: user.uid,
      ownerName: user.displayName || user.email || 'Demo Proprietar',
    });
  });
  await batch.commit();

  console.log(`✅ Assigned ${snap.size} demo auctions to ${user.email}`);
}

assign().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
