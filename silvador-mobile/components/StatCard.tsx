import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  sublabel?: string;
  /** If sublabel starts with ↑ or ↓ it will be green/red automatically */
  highlight?: boolean;
}

export function StatCard({ icon, value, label, sublabel, highlight }: Props) {
  const trendUp = sublabel?.startsWith('↑');
  const trendDown = sublabel?.startsWith('↓');
  const trendColor = trendUp ? Colors.success : trendDown ? Colors.error : Colors.textMuted;

  return (
    <View style={styles.card}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {sublabel && (
        <Text style={[styles.sublabel, { color: trendColor }]} numberOfLines={1}>
          {sublabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
  },
  value: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.03 * 36,
    lineHeight: 36 * 1.1,
  },
  label: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  sublabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
});
