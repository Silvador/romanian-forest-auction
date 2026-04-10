import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/colors';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Header */}
      <View style={styles.row}>
        <View style={[styles.bone, { width: 140, height: 12 }]} />
        <View style={[styles.bone, { width: 24, height: 24, borderRadius: 12 }]} />
      </View>
      {/* Title */}
      <View style={[styles.bone, { width: '80%', height: 17, marginTop: 8 }]} />
      {/* Species bar */}
      <View style={[styles.bone, { width: '100%', height: 6, marginTop: 10, borderRadius: 3 }]} />
      {/* Tags */}
      <View style={[styles.row, { marginTop: 6 }]}>
        <View style={[styles.bone, { width: 60, height: 18, borderRadius: 6 }]} />
        <View style={[styles.bone, { width: 50, height: 18, borderRadius: 6 }]} />
        <View style={[styles.bone, { width: 40, height: 18, borderRadius: 6 }]} />
      </View>
      {/* Metrics */}
      <View style={[styles.bone, { width: '60%', height: 12, marginTop: 10 }]} />
      {/* Footer */}
      <View style={[styles.footer]}>
        <View style={[styles.bone, { width: 60, height: 22 }]} />
        <View style={[styles.bone, { width: 44, height: 44, borderRadius: 22 }]} />
        <View style={[styles.bone, { width: 60, height: 28, borderRadius: 10 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bone: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
});
