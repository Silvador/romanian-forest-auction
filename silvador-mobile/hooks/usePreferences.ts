import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export type ThemePreference = 'dark' | 'light' | 'system';
export type LanguagePreference = 'ro' | 'en';

export interface Preferences {
  theme: ThemePreference;
  language: LanguagePreference;
  notificationsEnabled: boolean;
}

const DEFAULT_PREFS: Preferences = {
  theme: 'dark',
  language: 'ro',
  notificationsEnabled: true,
};

const STORAGE_KEY = '@roforest:preferences';

async function loadFromStorage(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function saveToStorage(prefs: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    loadFromStorage().then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      const next = { ...prefs, theme };
      setPrefs(next);
      saveToStorage(next);
    },
    [prefs]
  );

  const setLanguage = useCallback(
    (language: LanguagePreference) => {
      const next = { ...prefs, language };
      setPrefs(next);
      saveToStorage(next);
    },
    [prefs]
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        // Request permission if turning on
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          return false;
        }
      }
      const next = { ...prefs, notificationsEnabled: enabled };
      setPrefs(next);
      saveToStorage(next);
      return true;
    },
    [prefs]
  );

  return {
    ...prefs,
    loaded,
    setTheme,
    setLanguage,
    setNotificationsEnabled,
  };
}
