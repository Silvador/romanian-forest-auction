import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { getSpeciesIncrement } from '../lib/incrementLadder';

interface Props {
  currentPrice: number;
  maxProxy: number;
  dominantSpecies: string;
}

type Level = 'safe' | 'warning' | 'danger';

function getLevel(buffer: number, increment: number): Level {
  if (buffer >= increment * 3) return 'safe';
  if (buffer >= increment) return 'warning';
  return 'danger';
}

const levelConfig: Record<Level, { color: string; icon: string; label: string }> = {
  safe: { color: Colors.success, icon: '\u2713', label: 'Sigur — marja >= 3× increment' },
  warning: { color: Colors.warning, icon: '\u26A0', label: 'Atentie — marja >= 1× increment' },
  danger: { color: Colors.error, icon: '\u25CF', label: 'Pericol — marja < 1× increment' },
};

export function BufferGauge({ currentPrice, maxProxy, dominantSpecies }: Props) {
  const increment = getSpeciesIncrement(dominantSpecies);
  const buffer = maxProxy - currentPrice;
  const level = getLevel(buffer, increment);
  const config = levelConfig[level];

  // Progress: 0 to 1, capped at 5x increment = full
  const maxBuffer = increment * 5;
  const progress = Math.min(1, Math.max(0, buffer / maxBuffer));

  return (
    <View style={[styles.container, { borderColor: config.color + '4D' }]}>
      <Text style={styles.label}>Buffer proxy</Text>

      {/* Bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: config.color,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>

      {/* Status text */}
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.icon} {config.label}
      </Text>

      {/* Numbers */}
      <View style={styles.numbersRow}>
        <Text style={styles.numberLabel}>
          Pret curent: <Text style={styles.numberValue}>{currentPrice} RON/m³</Text>
        </Text>
        <Text style={styles.numberLabel}>
          Proxy max: <Text style={styles.numberValue}>{maxProxy} RON/m³</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
  },
  barTrack: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  numberValue: {
    color: Colors.text,
    fontWeight: '600',
  },
});
