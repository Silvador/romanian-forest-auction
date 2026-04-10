import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Colors, StatusColors } from '../constants/colors';
import { useMyListings, usePerformanceStats } from '../hooks/useDashboard';
import { useWebSocketRoom, useWebSocketEvent } from '../hooks/useWebSocket';
import { useAuthContext } from '../lib/AuthContext';
import { formatVolume, formatCountdown } from '../lib/formatters';
import type { Auction } from '../types';

type OwnerTab = 'active' | 'upcoming' | 'completed';

export function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [tab, setTab] = useState<OwnerTab>('active');

  const { data: listings, isLoading, refetch, isRefetching } = useMyListings();
  const { data: stats } = usePerformanceStats();

  useWebSocketRoom('watch:dashboard');
  useWebSocketEvent(
    'dashboard:update',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['performance-stats'] });
    }, [queryClient])
  );

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    return listings.filter((a) => {
      if (tab === 'active') return a.status === 'active';
      if (tab === 'upcoming') return a.status === 'upcoming' || a.status === 'draft';
      return a.status === 'ended' || a.status === 'sold';
    });
  }, [listings, tab]);

  const computedStats = useMemo(() => {
    if (!listings) return null;
    const total = listings.length;
    const active = listings.filter((a) => a.status === 'active').length;
    const sold = listings.filter((a) => a.status === 'sold');
    const completed = listings.filter((a) => a.status === 'ended' || a.status === 'sold');
    const totalBids = listings.reduce((sum, a) => sum + a.bidCount, 0);
    const avgBids = total > 0 ? totalBids / total : 0;
    const completedSum = completed.reduce((sum, a) => sum + a.currentPricePerM3, 0);
    const avgPrice = completed.length > 0 ? completedSum / completed.length : 0;
    const totalRevenue = sold.reduce((sum, a) => sum + a.currentPricePerM3 * a.volumeM3, 0);
    return { total, active, avgBids, avgPrice, totalRevenue };
  }, [listings]);

  // Sold auctions needing confirmation
  const pendingSold = useMemo(
    () => (listings ?? []).filter((a) => a.status === 'sold'),
    [listings]
  );

  const counts = {
    active: listings?.filter((a) => a.status === 'active').length ?? 0,
    upcoming: listings?.filter((a) => a.status === 'upcoming' || a.status === 'draft').length ?? 0,
    completed: listings?.filter((a) => a.status === 'ended' || a.status === 'sold').length ?? 0,
  };

  const handleCreateListing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-listing');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
        }
      >
        {/* Transaction action banner */}
        {pendingSold.length > 0 && (
          <Pressable
            style={styles.transactionBanner}
            onPress={() => setTab('completed')}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
            <Text style={styles.transactionBannerText} numberOfLines={1}>
              {pendingSold[0].title} s-a vandut — confirma tranzactia
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.success} />
          </Pressable>
        )}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {computedStats?.total ?? 0}
              </Text>
              <Text style={styles.statLabel}>Licitatii totale</Text>
              {(computedStats?.active ?? 0) > 0 && (
                <Text style={styles.statSublabel}>
                  ↑ {computedStats?.active} active
                </Text>
              )}
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {(computedStats?.avgBids ?? 0).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Oferte medii</Text>
              <Text style={styles.statSublabelMuted}>per licitatie</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {(computedStats?.avgPrice ?? 0).toFixed(0)} RON
              </Text>
              <Text style={styles.statLabel}>Pret mediu/m³</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {((computedStats?.totalRevenue ?? 0) / 1000).toFixed(1)}K
              </Text>
              <Text style={styles.statLabel}>Venit total (RON)</Text>
            </View>
          </View>
        </View>

        {/* Tab pills */}
        <View style={styles.tabs}>
          {(['active', 'upcoming', 'completed'] as OwnerTab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'active' ? 'Active' : t === 'upcoming' ? 'Viitoare' : 'Incheiate'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Listings */}
        {filteredListings.length === 0 ? (
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {tab === 'active'
                  ? 'Nicio licitatie activa'
                  : tab === 'upcoming'
                    ? 'Nicio licitatie viitoare'
                    : 'Nicio licitatie incheiata'}
              </Text>
              {(listings?.length ?? 0) === 0 && (
                <Pressable style={styles.emptyButton} onPress={handleCreateListing}>
                  <Text style={styles.emptyButtonText}>Creeaza prima licitatie</Text>
                </Pressable>
              )}
            </View>
          )
        ) : (
          <View style={styles.listingsList}>
            {filteredListings.map((auction) => (
              <ListingCard key={auction.id} auction={auction} />
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleCreateListing}>
        <Ionicons name="add" size={28} color={Colors.bg} />
      </Pressable>
    </View>
  );
}

function ListingCard({ auction }: { auction: Auction }) {
  const router = useRouter();
  const isActive = auction.status === 'active';
  const isUpcoming = auction.status === 'upcoming' || auction.status === 'draft';
  const accentColor = isActive ? Colors.success : isUpcoming ? Colors.warning : Colors.textMuted;
  const badgeLabel = isActive ? 'Live' : isUpcoming ? 'Curand' : 'Incheiat';

  return (
    <Pressable
      style={[styles.listingCard, { borderLeftColor: accentColor }]}
      onPress={() => router.push(`/auction/${auction.id}`)}
    >
      <View style={styles.listingHeader}>
        <Text style={styles.listingTitle} numberOfLines={1}>{auction.title}</Text>
        <View
          style={[
            styles.listingBadge,
            {
              backgroundColor: accentColor + '20',
              borderColor: accentColor + '50',
            },
          ]}
        >
          <Text style={[styles.listingBadgeText, { color: accentColor }]}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={styles.listingMeta}>
        <Text style={styles.listingPrice}>
          {isUpcoming ? 'Pret start: ' : ''}
          <Text style={styles.listingPriceValue}>
            {auction.currentPricePerM3} RON/m³
          </Text>
        </Text>
        <Text style={styles.listingDot}>·</Text>
        <Text style={styles.listingMetaText}>
          {formatVolume(auction.volumeM3)}
        </Text>
        {isActive && (
          <>
            <Text style={styles.listingDot}>·</Text>
            <Text style={styles.listingMetaText}>
              {formatCountdown(auction.endTime).replace(/\d+s$/, '').trim()}
            </Text>
          </>
        )}
        {isUpcoming && (
          <>
            <Text style={styles.listingDot}>·</Text>
            <Text style={styles.listingMetaText}>Incepe curand</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // Transaction banner
  transactionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  transactionBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  // Stats
  statsGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.03 * 36,
    lineHeight: 36 * 1.1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  statSublabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 3,
  },
  statSublabelMuted: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bg,
  },
  // Listing cards
  listingsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    padding: 14,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  listingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  listingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  listingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  listingPrice: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  listingPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  listingDot: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  listingMetaText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.bg,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
