import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, SpeciesColors } from '../constants/colors';
import { PriceAlertModal } from '../components/PriceAlertModal';
import {
  useMarketAnalytics,
  usePriceAlerts,
  useDeletePriceAlert,
} from '../hooks/useMarket';
import type { PriceAlert } from '../types';

function getSpeciesColor(species: string): string {
  if (SpeciesColors[species]) return SpeciesColors[species];
  const firstWord = species.split(' ')[0];
  const match = Object.keys(SpeciesColors).find((k) => k.startsWith(firstWord));
  return match ? SpeciesColors[match] : '#9CA3AF';
}

export default function DetailedAnalyticsScreen() {
  const router = useRouter();
  const [alertModalVisible, setAlertModalVisible] = useState(false);

  const { data, isLoading } = useMarketAnalytics('30d');
  const { data: alerts } = usePriceAlerts();
  const deleteAlert = useDeletePriceAlert();

  const handleDeleteAlert = (id: string) => {
    Alert.alert('Sterge alerta', 'Esti sigur?', [
      { text: 'Anuleaza', style: 'cancel' },
      { text: 'Sterge', style: 'destructive', onPress: () => deleteAlert.mutate(id) },
    ]);
  };

  // Build region data sorted by price desc
  const regionData = (data?.avgPriceByRegion ?? [])
    .filter((r) => r.avgPricePerM3 > 0)
    .sort((a, b) => b.avgPricePerM3 - a.avgPricePerM3)
    .map((r) => ({ region: r.region, price: r.avgPricePerM3, volume: (r as any).totalVolumeM3 ?? 0 }));

  const maxRegionPrice = regionData[0]?.price ?? 1;

  // Build species positioning data
  const speciesPositioning = data
    ? Object.entries(data.volumeBySpecies ?? {})
        .map(([species, vol]) => {
          const points = (data.priceTrendsBySpecies?.[species] ?? []).sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const latest = points[points.length - 1]?.pricePerM3 ?? 0;
          const first = points[0]?.pricePerM3 ?? latest;
          const change = first > 0 ? ((latest - first) / first) * 100 : 0;
          // Mini sparkbar: last 8 data points normalized
          const last8 = points.slice(-8).map((p) => p.pricePerM3 ?? 0);
          return { species, volume: vol as number, price: latest, change, last8 };
        })
        .filter((s) => s.price > 0)
        .sort((a, b) => b.change - a.change)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/market')} hitSlop={8} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Analiza detaliata</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* PRET MEDIU PE JUDEȚ */}
          {regionData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardSectionHeader}>PRET MEDIU PE JUDEȚ</Text>
              {regionData.map((r) => {
                const barWidth = (r.price / maxRegionPrice) * 100;
                return (
                  <View key={r.region} style={styles.regionRow}>
                    <Text style={styles.regionName}>{r.region}</Text>
                    <View style={styles.regionBarTrack}>
                      <View
                        style={[
                          styles.regionBarFill,
                          { width: `${barWidth}%` as any },
                        ]}
                      />
                    </View>
                    <Text style={styles.regionValue}>
                      {r.price.toFixed(0)} RON
                      {r.volume > 0 && (
                        <Text style={styles.regionVolume}> · {r.volume.toLocaleString('ro-RO')}m³</Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* POZITIONARE PIATA */}
          {speciesPositioning.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardSectionHeader}>POZITIONARE PIATA</Text>
              {speciesPositioning.map((s) => {
                const isUp = s.change >= 0;
                const accentColor = isUp ? Colors.success : Colors.error;
                const max8 = Math.max(...s.last8, 1);
                return (
                  <View key={s.species} style={[styles.posRow, { borderLeftColor: accentColor }]}>
                    <View style={styles.posLeft}>
                      <Text style={styles.posSpecies}>{s.species}</Text>
                      <Text style={styles.posMeta}>
                        {(s.volume / 1000).toFixed(1)}k m³
                      </Text>
                    </View>
                    <Text style={styles.posPrice}>{s.price.toFixed(0)} RON</Text>
                    {/* Mini sparkbar */}
                    <View style={styles.sparkbar}>
                      {s.last8.map((v, i) => (
                        <View
                          key={i}
                          style={[
                            styles.sparkbarBar,
                            {
                              height: Math.max(4, (v / max8) * 28),
                              backgroundColor: accentColor,
                              opacity: i === s.last8.length - 1 ? 0.9 : 0.35,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <View
                      style={[
                        styles.changeBadge,
                        { backgroundColor: accentColor + '20', borderColor: accentColor + '40' },
                      ]}
                    >
                      <Text style={[styles.changeBadgeText, { color: accentColor }]}>
                        {isUp ? '↑' : '↓'}{Math.abs(s.change).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ALERTE DE PRET */}
          <View style={styles.card}>
            <View style={styles.alertsHeader}>
              <Text style={styles.cardSectionHeader}>ALERTE DE PRET</Text>
              <Pressable
                style={styles.createAlertButton}
                onPress={() => setAlertModalVisible(true)}
              >
                <Ionicons name="add" size={14} color={Colors.primary} />
                <Text style={styles.createAlertText}>Creeaza</Text>
              </Pressable>
            </View>

            {alerts && alerts.length > 0 ? (
              <View style={{ gap: 8 }}>
                {alerts.map((a) => (
                  <AlertRow key={a.id} alert={a} onDelete={handleDeleteAlert} />
                ))}
              </View>
            ) : (
              <View style={styles.alertsEmpty}>
                <Ionicons name="notifications-off-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.alertsEmptyText}>Nu ai nicio alerta de pret</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <PriceAlertModal
        visible={alertModalVisible}
        onClose={() => setAlertModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: (id: string) => void }) {
  const isAbove = alert.alertType === 'price_above';
  return (
    <View style={styles.alertRow}>
      <Ionicons
        name="notifications-outline"
        size={18}
        color={Colors.textMuted}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>
          {alert.species || 'Toate speciile'}{' '}
          {isAbove ? 'peste' : 'sub'} {alert.threshold} RON/m³
        </Text>
        {alert.region ? (
          <Text style={styles.alertMeta}>{alert.region}</Text>
        ) : (
          <Text style={styles.alertMeta}>Toate regiunile</Text>
        )}
      </View>
      <View style={styles.alertActiveDot} />
      <Pressable onPress={() => onDelete(alert.id)} hitSlop={8} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={16} color={Colors.error} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  // Region bars
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  regionName: {
    width: 88,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  regionBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  regionBarFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  regionValue: {
    width: 90,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },
  regionVolume: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  // Species positioning
  posRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: Colors.bg,
  },
  posLeft: {
    width: 96,
  },
  posSpecies: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  posMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  posPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    width: 66,
  },
  sparkbar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 28,
    width: 80,
  },
  sparkbarBar: {
    width: 6,
    borderRadius: 2,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  changeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Alerts
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  createAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  alertMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  alertActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  alertsEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  alertsEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
