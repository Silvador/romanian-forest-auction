import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { SpeciesColors } from '../constants/colors';
import type { SpeciesBreakdown } from '../types';

interface Props {
  breakdown: SpeciesBreakdown[];
  showTags?: boolean;
  maxTags?: number;
}

function getSpeciesColor(species: string): string {
  // Try exact match first, then partial match on first word
  if (SpeciesColors[species]) return SpeciesColors[species];
  const firstWord = species.split(' ')[0];
  const match = Object.keys(SpeciesColors).find((k) => k.startsWith(firstWord));
  return match ? SpeciesColors[match] : '#9CA3AF';
}

export function SpeciesBar({ breakdown, showTags = true, maxTags = 3 }: Props) {
  const sorted = [...(breakdown ?? [])].sort((a, b) => b.percentage - a.percentage);
  const visible = sorted.slice(0, maxTags);
  const remaining = sorted.length - maxTags;

  return (
    <View>
      {/* Bar */}
      <View style={styles.barTrack}>
        {sorted.map((s, i) => (
          <View
            key={i}
            style={[
              styles.barSegment,
              {
                backgroundColor: getSpeciesColor(s.species),
                flex: s.percentage,
              },
              i === 0 && styles.barFirst,
              i === sorted.length - 1 && styles.barLast,
            ]}
          />
        ))}
      </View>

      {/* Tags */}
      {showTags && (
        <View style={styles.tags}>
          {visible.map((s, i) => {
            const color = getSpeciesColor(s.species);
            return (
              <View
                key={i}
                style={[styles.tag, { backgroundColor: color + '1A', borderColor: color + '33' }]}
              >
                <Text style={[styles.tagText, { color }]}>
                  {s.species.split(' ')[0]} {s.percentage.toFixed(0)}%
                </Text>
              </View>
            );
          })}
          {remaining > 0 && (
            <View style={styles.moreTag}>
              <Text style={styles.moreText}>+{remaining}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 6,
    borderRadius: 9999,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  barSegment: {
    height: 6,
  },
  barFirst: {
    borderTopLeftRadius: 9999,
    borderBottomLeftRadius: 9999,
  },
  barLast: {
    borderTopRightRadius: 9999,
    borderBottomRightRadius: 9999,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
});
