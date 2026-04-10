import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuthContext } from '../lib/AuthContext';
import { ToastProvider } from '../components/Toast';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary as AppErrorBoundary } from '../components/ErrorBoundary';
import { registerForPushNotifications } from '../lib/pushNotifications';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      gcTime: 24 * 60 * 60 * 1000, // 24h — needed for persistence
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@roforest:query-cache',
  throttleTime: 1000,
});

function AuthGate() {
  const { isAuthenticated, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  // Register for push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  return (
    <>
      <OfflineBanner />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'SpaceGrotesk-Bold': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#080808' }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000, // 24h
          // Only persist auctions, market, and notifications — not bids/auth-sensitive data
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey[0];
              return (
                key === 'auctions' ||
                key === 'auction' ||
                key === 'market' ||
                key === 'watchlist' ||
                key === 'notifications' ||
                key === 'my-listings' ||
                key === 'my-bids' ||
                key === 'won-auctions'
              );
            },
          },
        }}
      >
        <AuthProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <AppErrorBoundary>
              <AuthGate />
            </AppErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
