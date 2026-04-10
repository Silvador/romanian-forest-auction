import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyBRZG5F0BBipY96K-2_r2PDnduXWVtHsJA',
  authDomain: 'silvador-mlp-marketplace-app.firebaseapp.com',
  databaseURL: 'https://silvador-mlp-marketplace-app.firebaseio.com',
  projectId: 'silvador-mlp-marketplace-app',
  storageBucket: 'silvador-mlp-marketplace-app.firebasestorage.app',
  messagingSenderId: '839579186853',
  appId: '1:839579186853:web:5ca89a4004a8bb97b33f4c',
};

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // React Native: use AsyncStorage for auth persistence
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  // @ts-ignore — available in the RN bundle entry point
  const { getReactNativePersistence } = require('firebase/auth');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
