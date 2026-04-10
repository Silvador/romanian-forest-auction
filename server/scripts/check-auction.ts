import { initializeApp, getApps, cert } from 'firebase-admin/app';
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

const db = getFirestore();

async function main() {
  const auctionId = process.argv[2] || '1OxppYGVJYERx2mCbWS8';

  const bidsSnap = await db.collection('bids').where('auctionId', '==', auctionId).get();
  console.log(`Total bids: ${bidsSnap.docs.length}`);
  bidsSnap.docs.forEach(d => {
    const b = d.data();
    console.log(JSON.stringify({
      id: d.id,
      bidderId: b.bidderId,
      bidderName: b.bidderName,
      amountPerM3: b.amountPerM3,
      maxProxyPerM3: b.maxProxyPerM3,
      isProxyBid: b.isProxyBid,
      timestamp: b.timestamp,
    }, null, 2));
  });
}

main().catch(console.error).finally(() => process.exit(0));
