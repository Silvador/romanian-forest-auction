import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, SpeciesColors } from '../../constants/colors';
import {
  useMarketAnalytics,
  type DateRange,
} from '../../hooks/useMarket';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d':  '7z',
  '30d': '30z',
  '90d': '90z',
  '1y':  '1an',
  'all': 'Tot',
};

function getSpeciesColor(species: string): string {
  if (SpeciesColors[species]) return SpeciesColors[species];
  const firstWord = species.split(' ')[0];
  const match = Object.keys(SpeciesColors).find((k) => k.startsWith(firstWord));
  return match ? SpeciesColors[match] : '#9CA3AF';
}

// ── Aggregate bar chart ───────────────────────────────────────────────────────
interface BarPoint { date: string; price: number }

function PriceBarChart({
  data,
  periodLabel,
}: {
  data: Record<string, { date: string; pricePerM3: number }[]> | undefined;
  periodLabel: string;
}) {
  const points = useMemo<BarPoint[]>(() => {
    if (!data) return [];
    const map = new Map<string, { sum: number; count: number }>();
    Object.values(data).forEach((series) => {
      series.forEach(({ date, pricePerM3 }) => {
        const entry = map.get(date) ?? { sum: 0, count: 0 };
        entry.sum += pricePerM3;
        entry.count += 1;
        map.set(date, entry);
      });
    });
    return Array.from(map.entries())
      .map(([date, { sum, count }]) => ({ date, price: sum / count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-15);
  }, [data]);

  const species = useMemo(() => Object.keys(data ?? {}), [data]);

  if (points.length === 0) return null;

  // Use 90th-percentile as scale max so one outlier spike doesn't flatten all other bars
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const p90idx = Math.floor(sorted.length * 0.9);
  const maxPrice = Math.max(sorted[p90idx]?.price ?? sorted[sorted.length - 1].price, 1);
  const BAR_HEIGHT = 100;

  // Date axis: 5 evenly-spaced labels
  const n = points.length;
  const axisIndices = [
    0,
    Math.floor(n / 4),
    Math.floor(n / 2),
    Math.floor(3 * n / 4),
    n - 1,
  ];
  // Deduplicate in case n < 5
  const uniqueIndices = [...new Set(axisIndices)];

  return (
    <View style={chartStyles.card}>
      {/* Header */}
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>Evolutie pret (RON/m³)</Text>
        <Text style={chartStyles.period}>{periodLabel}</Text>
      </View>

      {/* Bars */}
      <View style={[chartStyles.barsContainer, { height: BAR_HEIGHT }]}>
        {points.map((p, i) => {
          const heightPct = Math.min(1, Math.max(0.08, p.price / maxPrice));
          const barH = BAR_HEIGHT * heightPct;
          return (
            <View key={i} style={[chartStyles.bar, { height: barH }]} />
          );
        })}
      </View>

      {/* Date axis — 5 labels */}
      <View style={chartStyles.dateAxis}>
        {uniqueIndices.map((idx) => (
          <Text key={idx} style={chartStyles.dateLabel}>
            {formatChartDate(points[idx]?.date)}
          </Text>
        ))}
      </View>

      {/* Legend */}
      {species.length > 0 && (
        <View style={chartStyles.legend}>
          {species.slice(0, 4).map((s) => (
            <View key={s} style={chartStyles.legendItem}>
              <View style={[chartStyles.legendDot, { backgroundColor: getSpeciesColor(s) }]} />
              <Text style={chartStyles.legendText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function formatChartDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return `${d.getDate()} ${['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
  } catch {
    return '';
  }
}

const chartStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  period: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    backgroundColor: 'rgba(204,255,0,0.35)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  dateAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MarketScreen() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useMarketAnalytics(dateRange);

  const speciesMovement = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.volumeBySpecies ?? {})
      .map(([species, vol]) => {
        const points = (data.priceTrendsBySpecies?.[species] ?? []).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const latest = points[points.length - 1]?.pricePerM3 ?? 0;
        const first  = points[0]?.pricePerM3 ?? latest;
        const change = first > 0 ? ((latest - first) / first) * 100 : 0;
        const loturi = points.reduce((s, p) => s + ((p as any).count ?? 0), 0);
        return { species, volume: vol as number, price: latest, change, loturi };
      })
      .filter((s) => s.price > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [data]);

  // Overall market price change — average across all species
  const avgMarketChange = useMemo(() => {
    if (speciesMovement.length === 0) return null;
    const withChange = speciesMovement.filter((s) => s.change !== 0);
    if (withChange.length === 0) return null;
    return withChange.reduce((s, x) => s + x.change, 0) / withChange.length;
  }, [speciesMovement]);

  const periodLabel = DATE_RANGE_LABELS[dateRange];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Piata</Text>
      </View>

      {/* Analiza detaliata — prominent entry card */}
      <Pressable
        style={styles.analyticsCard}
        onPress={() => router.push('/detailed-analytics')}
      >
        <View style={styles.analyticsCardLeft}>
          <Ionicons name="bar-chart" size={18} color={Colors.primary} />
          <View>
            <Text style={styles.analyticsCardTitle}>Analiza Detaliata</Text>
            <Text style={styles.analyticsCardSub}>Preturi pe regiuni · Sparkbars · Alerte</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
      </Pressable>

      {/* Date range pills */}
      <View style={styles.rangeRow}>
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
          <Pressable
            key={r}
            style={[styles.rangePill, dateRange === r && styles.rangePillActive]}
            onPress={() => setDateRange(r)}
          >
            <Text style={[styles.rangeText, dateRange === r && styles.rangeTextActive]}>
              {DATE_RANGE_LABELS[r]}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
        >
          {/* 3 stat cards */}
          {data?.stats && (
            <View style={styles.statsRow}>
              {/* Card 1 — volume */}
              <View style={styles.statCard}>
                <Text style={styles.statValueLime} numberOfLines={1} adjustsFontSizeToFit>
                  {(data.stats.totalVolume / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.statLabel}>m³ vanduti</Text>
              </View>

              {/* Card 2 — avg price + change delta */}
              <View style={styles.statCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.statValueLime} numberOfLines={1} adjustsFontSizeToFit>
                    {(data.stats.avgMarketPrice ?? 0).toFixed(0)} RON
                  </Text>
                  {avgMarketChange !== null && (
                    <Text style={[
                      styles.priceChange,
                      { color: avgMarketChange >= 0 ? Colors.success : Colors.error },
                    ]}>
                      {avgMarketChange >= 0 ? '↑' : '↓'} {Math.abs(avgMarketChange).toFixed(1)}%
                    </Text>
                  )}
                </View>
                <Text style={styles.statLabel}>pret mediu/m³</Text>
              </View>

              {/* Card 3 — auctions count */}
              <View style={styles.statCard}>
                <Text style={styles.statValueWhite} numberOfLines={1} adjustsFontSizeToFit>
                  {data.stats.totalAuctions}
                </Text>
                <Text style={styles.statLabel}>licitatii</Text>
              </View>
            </View>
          )}

          {/* Bar chart */}
          {data && (
            <PriceBarChart
              data={data.priceTrendsBySpecies}
              periodLabel={periodLabel}
            />
          )}

          {/* SPECII — MISCARE PRET */}
          {speciesMovement.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>SPECII — MISCARE PRET</Text>
              {speciesMovement.map((s) => {
                const isUp = s.change >= 0;
                const loturiStr = s.loturi > 0 ? ` · ${s.loturi} lot.` : '';
                return (
                  <View key={s.species} style={styles.speciesCard}>
                    <View style={[styles.speciesDot, { backgroundColor: getSpeciesColor(s.species) }]} />
                    <View style={styles.speciesLeft}>
                      <Text style={styles.speciesName}>{s.species}</Text>
                      <Text style={styles.speciesMeta}>
                        {(s.volume / 1000).toFixed(1)}k m³{loturiStr}
                      </Text>
                    </View>
                    <View style={styles.speciesRight}>
                      <Text style={styles.speciesPrice}>
                        {s.price.toFixed(0)} RON/m³
                      </Text>
                      <Text style={[
                        styles.speciesChange,
                        { color: isUp ? Colors.primary : Colors.error },
                      ]}>
                        {isUp ? '↑' : '↓'} {Math.abs(s.change).toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.05 * 28,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rangePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  rangePillActive: {
    backgroundColor: Colors.primary,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  rangeTextActive: {
    color: Colors.bg,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  // Stat cards
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
  },
  priceChange: {
    fontSize: 11,
    fontWeight: '700',
  },
  statValueLime: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.03 * 20,
  },
  statValueWhite: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.03 * 20,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  // Species section
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  speciesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  speciesDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  speciesLeft: {
    flex: 1,
    gap: 2,
  },
  speciesName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  speciesMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  speciesRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  speciesPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  speciesChange: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Analytics entry card
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  analyticsCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyticsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  analyticsCardSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
