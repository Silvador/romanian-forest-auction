import { View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface Props {
  current: number; // 1-indexed
  total: number;
}

export function StepIndicator({ current, total }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isPast = step < current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && styles.dotActive,
              isPast && styles.dotPast,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotPast: {
    backgroundColor: Colors.primaryBorder,
  },
});
