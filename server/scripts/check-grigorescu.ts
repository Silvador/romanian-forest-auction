import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.resolve('/Users/vladvc/Desktop/romanian-forest-auction/firebase-admin-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

async function main() {
  const userRecord = await auth.getUserByEmail('grigorescu@gmail.com');
  console.log('UID:', userRecord.uid);
  
  const doc = await db.collection('users').doc(userRecord.uid).get();
  if (!doc.exists) {
    console.log('NO FIRESTORE DOC EXISTS');
  } else {
    const data = doc.data();
    console.log('Firestore doc:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error).finally(() => process.exit(0));
