import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Path, G, Rect } from 'react-native-svg';
import { Colors, ChartColors, SpeciesColors } from '../constants/colors';
import type { MarketAnalytics } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32; // Page padding
const CHART_HEIGHT = 200;

function getSpeciesColor(species: string, fallbackIdx: number = 0): string {
  if (SpeciesColors[species]) return SpeciesColors[species];
  const firstWord = species.split(' ')[0];
  const match = Object.keys(SpeciesColors).find((k) => k.startsWith(firstWord));
  return match ? SpeciesColors[match] : ChartColors[fallbackIdx % ChartColors.length];
}

// =====================================================
// Section wrapper
// =====================================================
export function ChartSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chartCard}>{children}</View>
    </View>
  );
}

// =====================================================
// 1. Price Evolution Line Chart
// =====================================================
export function PriceLineChart({
  data,
}: {
  data: MarketAnalytics['priceTrendsBySpecies'];
}) {
  // Get top 5 species by data point count
  const speciesEntries = Object.entries(data).sort(
    (a, b) => b[1].length - a[1].length
  ).slice(0, 5);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (speciesEntries.length === 0) {
    return <EmptyChart icon="trending-up-outline" message="Date insuficiente" />;
  }

  // Find global min/max for scaling — skip points with null prices
  let minPrice = Infinity, maxPrice = -Infinity;
  let minDate = Infinity, maxDate = -Infinity;
  speciesEntries.forEach(([_, points]) => {
    points.forEach((p) => {
      if (p?.pricePerM3 == null) return;
      if (p.pricePerM3 < minPrice) minPrice = p.pricePerM3;
      if (p.pricePerM3 > maxPrice) maxPrice = p.pricePerM3;
      const t = new Date(p.date).getTime();
      if (!isNaN(t)) {
        if (t < minDate) minDate = t;
        if (t > maxDate) maxDate = t;
      }
    });
  });

  if (!isFinite(minPrice) || !isFinite(maxDate)) {
    return <EmptyChart icon="trending-up-outline" message="Date insuficiente" />;
  }

  const padding = { top: 16, right: 12, bottom: 24, left: 36 };
  const innerW = CHART_WIDTH - padding.left - padding.right - 28; // -28 for card padding
  const innerH = CHART_HEIGHT - padding.top - padding.bottom;

  const xScale = (date: number) =>
    padding.left + ((date - minDate) / (maxDate - minDate || 1)) * innerW;
  const yScale = (price: number) =>
    padding.top + (1 - (price - minPrice) / (maxPrice - minPrice || 1)) * innerH;

  // Build paths
  const paths = speciesEntries.map(([species, points], idx) => {
    if (hidden.has(species)) return null;
    const sorted = [...points].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const d = sorted
      .map((p, i) => {
        const x = xScale(new Date(p.date).getTime());
        const y = yScale(p.pricePerM3);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
    return { species, d, color: getSpeciesColor(species, idx) };
  });

  return (
    <View>
      <Svg width={CHART_WIDTH - 28} height={CHART_HEIGHT}>
        {/* Y-axis grid lines */}
        {[0.25, 0.5, 0.75].map((pct, i) => (
          <Line
            key={i}
            x1={padding.left}
            x2={CHART_WIDTH - 28 - padding.right}
            y1={padding.top + innerH * pct}
            y2={padding.top + innerH * pct}
            stroke={Colors.borderSubtle}
            strokeWidth={1}
          />
        ))}

        {/* Lines */}
        {paths.map((p) =>
          p ? (
            <Path
              key={p.species}
              d={p.d}
              stroke={p.color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null
        )}
      </Svg>

      {/* Y-axis labels */}
      <View style={styles.yAxis}>
        <Text style={styles.axisLabel}>{maxPrice.toFixed(0)} RON</Text>
        <Text style={styles.axisLabel}>{minPrice.toFixed(0)} RON</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {speciesEntries.map(([species, _], idx) => {
          const isHidden = hidden.has(species);
          const color = getSpeciesColor(species, idx);
          return (
            <Pressable
              key={species}
              onPress={() => {
                const next = new Set(hidden);
                if (isHidden) next.delete(species);
                else next.add(species);
                setHidden(next);
              }}
              style={[styles.legendItem, isHidden && styles.legendItemHidden]}
            >
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, isHidden && styles.legendTextHidden]}>
                {species.split(' ')[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// =====================================================
// 2. Region Bars (horizontal)
// =====================================================
export function RegionBars({
  data,
}: {
  data: MarketAnalytics['avgPriceByRegion'];
}) {
  if (data.length === 0) {
    return <EmptyChart icon="map-outline" message="Date insuficiente" />;
  }

  // Filter out entries with no price data, then sort
  const sorted = data
    .filter((r) => r && r.avgPricePerM3 != null)
    .sort((a, b) => (b.avgPricePerM3 ?? 0) - (a.avgPricePerM3 ?? 0));
  const max = sorted.length > 0 ? Math.max(...sorted.map((r) => r.avgPricePerM3 ?? 0)) : 0;

  if (sorted.length === 0) {
    return <EmptyChart icon="map-outline" message="Date insuficiente" />;
  }

  return (
    <View style={styles.barsContainer}>
      {sorted.map((r, i) => {
        const price = r.avgPricePerM3 ?? 0;
        const widthPct = max > 0 ? (price / max) * 100 : 0;
        return (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{r.region}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${widthPct}%`, backgroundColor: Colors.primary },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{price.toFixed(0)} RON</Text>
          </View>
        );
      })}
    </View>
  );
}

// =====================================================
// 3. Volume by Species (vertical bars)
// =====================================================
export function VolumeBars({ data }: { data: MarketAnalytics['volumeBySpecies'] }) {
  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (entries.length === 0) {
    return <EmptyChart icon="cube-outline" message="Date insuficiente" />;
  }

  const max = Math.max(...entries.map(([, v]) => v));
  const barW = 48;
  const gap = 12;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.vBarsContainer}>
        {entries.map(([species, volume], idx) => {
          const heightPct = max > 0 ? (volume / max) * 100 : 0;
          const color = getSpeciesColor(species, idx);
          return (
            <View key={species} style={[styles.vBarItem, { width: barW, marginRight: gap }]}>
              <Text style={styles.vBarValue}>{(volume / 1000).toFixed(1)}k</Text>
              <View style={styles.vBarTrack}>
                <View
                  style={[
                    styles.vBarFill,
                    { height: `${heightPct}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.vBarLabel} numberOfLines={1}>
                {species.split(' ')[0]}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// =====================================================
// 4. Diameter Histogram
// =====================================================
export function DiameterHistogram({
  data,
}: {
  data: MarketAnalytics['diameterClasses'];
}) {
  if (!data || data.length === 0) {
    return <EmptyChart icon="resize-outline" message="Date insuficiente" />;
  }

  const max = Math.max(...data.map((d) => d.count));
  const barW = 38;
  const gap = 6;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.vBarsContainer}>
        {data.map((cls, i) => {
          const heightPct = max > 0 ? (cls.count / max) * 100 : 0;
          return (
            <View key={i} style={[styles.vBarItem, { width: barW, marginRight: gap }]}>
              <Text style={styles.vBarValue}>{cls.count}</Text>
              <View style={styles.vBarTrack}>
                <View
                  style={[
                    styles.vBarFill,
                    { height: `${heightPct}%`, backgroundColor: Colors.primary },
                  ]}
                />
              </View>
              <Text style={styles.vBarLabel}>{cls.range}</Text>
              <Text style={styles.vBarSubLabel}>{(cls.avgPricePerM3 ?? 0).toFixed(0)} RON</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// =====================================================
// 5. Treatment Type Donut
// =====================================================
export function TreatmentDonut({
  data,
}: {
  data: MarketAnalytics['treatmentTypes'];
}) {
  if (!data || data.length === 0) {
    return <EmptyChart icon="pie-chart-outline" message="Date insuficiente" />;
  }

  const total = data.reduce((sum, t) => sum + t.count, 0);
  const size = 160;
  const radius = 64;
  const innerRadius = 42;
  const center = size / 2;

  // Build arc segments
  let cumulativeAngle = -Math.PI / 2;
  const slices = data.map((t, idx) => {
    const angle = (t.count / total) * Math.PI * 2;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const ix1 = center + innerRadius * Math.cos(endAngle);
    const iy1 = center + innerRadius * Math.sin(endAngle);
    const ix2 = center + innerRadius * Math.cos(startAngle);
    const iy2 = center + innerRadius * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}
      Z
    `;

    return { path, color: ChartColors[idx % ChartColors.length], type: t };
  });

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutWrapper}>
        <Svg width={size} height={size}>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} />
          ))}
        </Svg>
        <View style={styles.donutCenter}>
          <Text style={styles.donutCount}>{total}</Text>
          <Text style={styles.donutLabel}>licitatii</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {slices.map((s, i) => (
          <View key={i} style={styles.donutLegendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.donutLegendText} numberOfLines={1}>
              {s.type.type}
            </Text>
            <Text style={styles.donutLegendValue}>
              {s.type.count} · {(s.type.avgPricePerM3 ?? 0).toFixed(0)} RON
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// =====================================================
// 6. Species Demand List
// =====================================================
export function SpeciesDemandList({
  volumeData,
  trendsData,
}: {
  volumeData: MarketAnalytics['volumeBySpecies'];
  trendsData: MarketAnalytics['priceTrendsBySpecies'];
}) {
  const ranked = useMemo(() => {
    // Combine volume + auction count for demand score
    return Object.entries(volumeData)
      .map(([species, volume]) => {
        const lots = trendsData[species]?.length ?? 0;
        return { species, volume, lots, score: volume * 0.7 + lots * 100 * 0.3 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [volumeData, trendsData]);

  if (ranked.length === 0) {
    return <EmptyChart icon="podium-outline" message="Date insuficiente" />;
  }

  const maxScore = Math.max(...ranked.map((r) => r.score));

  return (
    <View>
      {ranked.map((r, i) => {
        const widthPct = maxScore > 0 ? (r.score / maxScore) * 100 : 0;
        const color = getSpeciesColor(r.species, i);
        return (
          <View key={r.species} style={styles.demandRow}>
            <Text style={styles.demandRank}>#{i + 1}</Text>
            <View style={styles.demandInfo}>
              <Text style={styles.demandSpecies} numberOfLines={1}>{r.species}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: color }]} />
              </View>
            </View>
            <Text style={styles.demandLots}>{r.lots} lot</Text>
          </View>
        );
      })}
    </View>
  );
}

// =====================================================
// Empty state
// =====================================================
function EmptyChart({ icon, message }: { icon: any; message: string }) {
  return (
    <View style={styles.emptyChart}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginBottom: 8,
    letterSpacing: 0.3,
    paddingHorizontal: 16,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginHorizontal: 16,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 24,
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
  },
  legendItemHidden: {
    opacity: 0.4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  legendTextHidden: {
    textDecorationLine: 'line-through',
  },
  // Region bars
  barsContainer: {
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    width: 44,
    textAlign: 'right',
  },
  // Vertical bars
  vBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 16,
  },
  vBarItem: {
    alignItems: 'center',
  },
  vBarValue: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  vBarTrack: {
    width: '70%',
    height: 100,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  vBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  vBarLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  vBarSubLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Donut
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutCount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  donutLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  donutLegend: {
    flex: 1,
    gap: 8,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donutLegendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  donutLegendValue: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
  },
  // Demand
  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  demandRank: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    width: 22,
  },
  demandInfo: {
    flex: 1,
    gap: 4,
  },
  demandSpecies: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  demandLots: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 38,
    textAlign: 'right',
  },
  // Empty
  emptyChart: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
