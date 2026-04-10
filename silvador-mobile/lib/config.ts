/**
 * App-wide configuration resolved from environment variables.
 *
 * Expo bundles any var prefixed with EXPO_PUBLIC_ at build time.
 * Set them in .env / .env.local — see .env.example for documentation.
 */

import { Platform } from 'react-native';

const DEFAULT_DEV_URL = 'http://localhost:5000';
const DEFAULT_PROD_URL = 'https://roforest.ro';

/**
 * Base URL for the REST API and WebSocket server.
 *
 * Resolution order (in dev):
 *   - On WEB: always `http://localhost:5000` — the browser is on the same
 *     machine as the dev server, so localhost is the most reliable. The
 *     LAN IP env var is irrelevant here and easy to get wrong when your
 *     Wi-Fi DHCP renews.
 *   - On NATIVE (iOS/Android): use EXPO_PUBLIC_API_URL if set, otherwise
 *     fall back to localhost (which only works on the iOS simulator).
 *     For real devices set EXPO_PUBLIC_API_URL=http://<lan-ip>:5000 in
 *     .env.local.
 *
 * In production, EXPO_PUBLIC_API_URL still wins; otherwise default to the
 * deployed URL.
 */
function resolveBaseUrl(): string {
  if (!__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL || DEFAULT_PROD_URL;
  }

  // Dev mode
  if (Platform.OS === 'web') {
    // Browser is on the dev machine — localhost is bulletproof
    return DEFAULT_DEV_URL;
  }

  // Native dev — needs a reachable URL from the device
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_DEV_URL;
}

export const API_BASE_URL: string = resolveBaseUrl();
