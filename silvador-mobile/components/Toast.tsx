import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  auctionId?: string;
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeIcons: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

const typeColors: Record<ToastType, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.info,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setToast(null));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [slideAnim]);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = Date.now();
      setToast({ id, ...options });

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, options.duration ?? 4000);
    },
    [slideAnim]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = () => {
    if (toast?.auctionId) {
      router.push(`/auction/${toast.auctionId}`);
    }
    dismiss();
  };

  const type = toast?.type ?? 'info';
  const color = typeColors[type];
  const icon = typeIcons[type];

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.wrapper,
            { transform: [{ translateY: slideAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <SafeAreaView edges={['top']}>
            <Pressable
              style={[styles.toast, { borderColor: color + '4D' }]}
              onPress={handlePress}
            >
              <View style={[styles.iconBox, { backgroundColor: color + '1A' }]}>
                <Ionicons name={icon} size={18} color={color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
                {toast.message && (
                  <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
                )}
              </View>
              <Pressable onPress={dismiss} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={16} color={Colors.textMuted} />
              </Pressable>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.bgSoft,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  message: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
