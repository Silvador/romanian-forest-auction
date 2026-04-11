import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
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

// ── Per-species line chart ─────────────────────────────────────────────────────
function toWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function PriceLineChart({
  data,
  periodLabel,
}: {
  data: Record<string, { date: string; pricePerM3: number }[]> | undefined;
  periodLabel: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Build per-species weekly-averaged series, top 4 by data density
  const series = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([species, pts]) => {
        const buckets = new Map<string, { sum: number; count: number; date: string }>();
        pts.forEach(({ date, pricePerM3 }) => {
          if (!Number.isFinite(pricePerM3) || pricePerM3 <= 0) return;
          const key = toWeekKey(date);
          const b = buckets.get(key) ?? { sum: 0, count: 0, date };
          b.sum += pricePerM3;
          b.count += 1;
          buckets.set(key, b);
        });
        const weekly = Array.from(buckets.entries())
          .map(([key, { sum, count, date }]) => ({ weekKey: key, date, price: sum / count }))
          .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
        return { species, pts: weekly };
      })
      .filter((s) => s.pts.length >= 2)
      .sort((a, b) => b.pts.length - a.pts.length)
      .slice(0, 4);
  }, [data]);

  // Clamp selectedIdx if series shrinks
  const safeIdx = Math.min(selectedIdx, Math.max(0, series.length - 1));
  const selected = series[safeIdx];

  if (!selected) {
    return (
      <View style={chartStyles.card}>
        <View style={chartStyles.header}>
          <Text style={chartStyles.title}>Evolutie pret (RON/m³)</Text>
          <Text style={chartStyles.period}>{periodLabel}</Text>
        </View>
        <Text style={chartStyles.emptyText}>Date insuficiente</Text>
      </View>
    );
  }

  const color = getSpeciesColor(selected.species);
  const pts = selected.pts;

  // Chart geometry
  const PAD_LEFT = 38;
  const PAD_RIGHT = 12;
  const PAD_TOP = 10;
  const PAD_BOTTOM = 20;
  const chartW = screenWidth - 64;
  const chartH = 155;
  const plotW = chartW - PAD_LEFT - PAD_RIGHT;
  const plotH = chartH - PAD_TOP - PAD_BOTTOM;

  // Scale: y from minPrice*0.85 to maxPrice*1.12 so the line fills the chart
  const prices = pts.map((p) => p.price).filter((v) => Number.isFinite(v) && v > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minY = minPrice * 0.85;
  const maxY = maxPrice * 1.12;
  const priceRange = Math.max(maxY - minY, 1);

  const n = pts.length;
  const xScale = (i: number) => PAD_LEFT + (i / Math.max(n - 1, 1)) * plotW;
  const yScale = (price: number) => PAD_TOP + plotH - ((price - minY) / priceRange) * plotH;

  // Build coords, filtering bad values
  const coords = pts
    .map((p, i) => {
      const x = xScale(i);
      const y = yScale(p.price);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y, p } : null;
    })
    .filter((c): c is { x: number; y: number; p: typeof pts[0] } => c !== null);

  if (coords.length < 2) return null;

  // SVG path for the line
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  // SVG path for the filled area (closes at bottom)
  const plotBottom = PAD_TOP + plotH;
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${plotBottom} L${coords[0].x},${plotBottom} Z`;

  // % change: first weekly point → last weekly point
  const firstPrice = pts[0].price;
  const lastPrice = pts[pts.length - 1].price;
  const pctChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const changeColor = pctChange >= 0 ? '#4ADE80' : '#F87171';
  const changeArrow = pctChange >= 0 ? '↑' : '↓';

  // X-axis: 4 evenly-spaced labels
  const xLabelIndices = [...new Set([0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1])];

  // Y-axis: 3 grid lines
  const yGridLevels = [0.25, 0.5, 0.75];

  const lastCoord = coords[coords.length - 1];

  return (
    <View style={chartStyles.card}>
      {/* Header */}
      <View style={chartStyles.header}>
        <Text style={chartStyles.title}>Evolutie pret (RON/m³)</Text>
        <Text style={chartStyles.period}>{periodLabel}</Text>
      </View>

      {/* Price + change row */}
      <View style={chartStyles.priceRow}>
        <Text style={chartStyles.currentPrice}>{Math.round(lastPrice)} RON/m³</Text>
        <View style={[chartStyles.changeBadge, {
          backgroundColor: changeColor + '22',
          borderColor: changeColor + '66',
        }]}>
          <Text style={[chartStyles.changeBadgeText, { color: changeColor }]}>
            {changeArrow}  {Math.abs(pctChange).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Species selector tabs */}
      <View style={chartStyles.speciesTabs}>
        {series.map((s, idx) => {
          const tabColor = getSpeciesColor(s.species);
          const isActive = idx === safeIdx;
          return (
            <Pressable
              key={s.species}
              onPress={() => setSelectedIdx(idx)}
              style={[
                chartStyles.speciesTab,
                isActive && { backgroundColor: tabColor + '28', borderColor: tabColor },
              ]}
            >
              <Text style={[
                chartStyles.speciesTabText,
                isActive && { color: tabColor, fontWeight: '700' },
              ]}>
                {s.species.substring(0, 2).toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* SVG chart */}
      <Svg width={chartW} height={chartH}>
        {/* Y-axis grid lines + labels */}
        {yGridLevels.map((lvl) => {
          const y = PAD_TOP + plotH - lvl * plotH;
          const priceAtLvl = minY + lvl * priceRange;
          return [
            <Line key={`grid-${lvl}`} x1={PAD_LEFT} y1={y} x2={PAD_LEFT + plotW} y2={y}
              stroke="#FFFFFF0D" strokeWidth={1} />,
            <SvgText key={`ylabel-${lvl}`} x={PAD_LEFT - 4} y={y + 4}
              fontSize={9} fill="#4B5563" textAnchor="end">
              {Math.round(priceAtLvl)}
            </SvgText>,
          ];
        })}

        {/* Area fill */}
        <Path d={areaPath} fill={color} fillOpacity={0.12} />

        {/* Line */}
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* End dot */}
        <Circle cx={lastCoord.x} cy={lastCoord.y} r={4} fill={color} />

        {/* X-axis date labels */}
        {xLabelIndices.map((idx) => (
          <SvgText key={idx} x={xScale(idx)} y={chartH - 2}
            fontSize={9} fill="#4B5563" textAnchor="middle">
            {formatChartDate(pts[idx]?.date)}
          </SvgText>
        ))}
      </Svg>
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
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  changeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  changeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  speciesTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  speciesTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  speciesTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    letterSpacing: 0.5,
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

          {/* Line chart */}
          {data && (
            <PriceLineChart
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
