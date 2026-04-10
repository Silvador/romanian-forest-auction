import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
    } else if (wasOffline.current) {
      // Briefly show "back online", then hide
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        wasOffline.current = false;
      });
    }
  }, [isOnline, slideAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
        isOnline ? styles.bannerOnline : styles.bannerOffline,
      ]}
    >
      <Ionicons
        name={isOnline ? 'cloud-done' : 'cloud-offline'}
        size={14}
        color={isOnline ? Colors.success : Colors.warning}
      />
      <Text style={[styles.text, isOnline ? styles.textOnline : styles.textOffline]}>
        {isOnline ? 'Conexiune restabilita' : 'Offline — afisam date salvate'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  bannerOffline: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderBottomColor: 'rgba(245,158,11,0.30)',
  },
  bannerOnline: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderBottomColor: 'rgba(34,197,94,0.30)',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textOffline: {
    color: Colors.warning,
  },
  textOnline: {
    color: Colors.success,
  },
});
