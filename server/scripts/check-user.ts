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

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx server/scripts/check-user.ts <email>');
    process.exit(1);
  }

  const userRecord = await auth.getUserByEmail(email);
  console.log('Firebase Auth UID:', userRecord.uid);
  console.log('Display name:', userRecord.displayName);
  console.log('Email:', userRecord.email);

  const doc = await db.collection('users').doc(userRecord.uid).get();
  if (!doc.exists) {
    console.log('\nNO FIRESTORE DOC — user cannot log in properly');
  } else {
    const data = doc.data();
    console.log('\nFirestore users doc:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error).finally(() => process.exit(0));
