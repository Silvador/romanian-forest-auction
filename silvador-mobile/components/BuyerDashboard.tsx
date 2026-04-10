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
import { Colors } from '../constants/colors';
import { StatCard } from './StatCard';
import { AuctionCard } from './AuctionCard';
import { BidModal } from './BidModal';
import { useMyBids, useWonAuctions } from '../hooks/useDashboard';
import { useWatchlist, useWatchlistIds, useToggleWatchlist } from '../hooks/useWatchlist';
import { useWebSocketRoom, useWebSocketEvent } from '../hooks/useWebSocket';
import { useAuthContext } from '../lib/AuthContext';
import { formatDate, formatVolume, formatRon, formatCountdown } from '../lib/formatters';
import type { Auction, MyBidEntry } from '../types';

type BuyerTab = 'bids' | 'watchlist' | 'won';

export function BuyerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [tab, setTab] = useState<BuyerTab>('bids');
  const [rebidAuction, setRebidAuction] = useState<Auction | null>(null);

  const { data: myBids, isLoading: bidsLoading, refetch: refetchBids, isRefetching } = useMyBids();
  const { data: watchlist } = useWatchlist();
  const { data: wonAuctions } = useWonAuctions();
  const watchlistIds = useWatchlistIds();
  const toggleWatchlist = useToggleWatchlist();

  // WebSocket
  useWebSocketRoom('watch:dashboard');
  useWebSocketEvent(
    'bid:outbid',
    useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ['my-bids'] });
    }, [queryClient])
  );
  useWebSocketEvent(
    'dashboard:update',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['my-bids'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['won-auctions'] });
    }, [queryClient])
  );

  // Outbid summary
  const outbidEntries = useMemo(() => (myBids ?? []).filter((e) => !e.isLeading), [myBids]);
  const outbidCount = outbidEntries.length;
  const soonestOutbidEnd = useMemo(() => {
    if (outbidEntries.length === 0) return 0;
    return outbidEntries.reduce((min, e) => {
      const t = e.auction?.endTime ?? 0;
      return t > 0 && t < min ? t : min;
    }, Infinity);
  }, [outbidEntries]);

  // Compute stats
  const stats = useMemo(() => {
    const activeBids = myBids?.length ?? 0;
    const wonCount = wonAuctions?.length ?? 0;
    const totalAttempted = activeBids + wonCount; // approx
    const winRate = totalAttempted > 0 ? (wonCount / totalAttempted) * 100 : 0;
    const totalVolume = wonAuctions?.reduce((sum, a) => sum + a.volumeM3, 0) ?? 0;
    const totalSpent = wonAuctions?.reduce((sum, a) => sum + a.currentPricePerM3 * a.volumeM3, 0) ?? 0;
    const avgPrice = totalVolume > 0 ? totalSpent / totalVolume : 0;

    return { activeBids, wonCount, winRate, totalVolume, avgPrice };
  }, [myBids, wonAuctions]);

  const counts = {
    bids: myBids?.length ?? 0,
    watchlist: watchlist?.length ?? 0,
    won: wonAuctions?.length ?? 0,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchBids}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="hammer-outline"
              value={String(stats.activeBids)}
              label="Oferte active"
              highlight
            />
            <StatCard
              icon="trophy-outline"
              value={String(stats.wonCount)}
              label="Castigate"
              sublabel={`${stats.winRate.toFixed(0)}% rata`}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon="cube-outline"
              value={`${(stats.totalVolume / 1000).toFixed(1)}k`}
              label="Volum (m³)"
              sublabel="achizitionat"
            />
            <StatCard
              icon="trending-up-outline"
              value={`${stats.avgPrice.toFixed(0)} RON`}
              label="Pret mediu"
              sublabel="per m³"
            />
          </View>
        </View>

        {/* Outbid alert banner */}
        {outbidCount > 0 && (
          <Pressable
            style={styles.outbidBanner}
            onPress={() => setTab('bids')}
          >
            <Ionicons name="warning" size={18} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.outbidBannerTitle}>
                Ai fost depasit pe {outbidCount === 1 ? '1 licitatie' : `${outbidCount} licitatii`}
              </Text>
              {soonestOutbidEnd > 0 && soonestOutbidEnd !== Infinity && (
                <Text style={styles.outbidBannerSub}>
                  {formatCountdown(soonestOutbidEnd)} ramas
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.error} />
          </Pressable>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['bids', 'watchlist', 'won'] as BuyerTab[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'bids'
                  ? `Ofertele mele (${counts.bids})`
                  : t === 'watchlist'
                    ? `Urmarite (${counts.watchlist})`
                    : `Castigate (${counts.won})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        {tab === 'bids' && <MyBidsTab bids={myBids ?? []} loading={bidsLoading} onRebid={setRebidAuction} />}
        {tab === 'watchlist' && (
          <WatchlistTab
            auctions={watchlist ?? []}
            currentUserId={user?.id}
            watchlistIds={watchlistIds}
            onToggleWatchlist={toggleWatchlist}
            onExplore={() => router.push('/(tabs)')}
          />
        )}
        {tab === 'won' && <WonTab auctions={wonAuctions ?? []} />}

        <View style={{ height: 40 }} />
      </ScrollView>

      <BidModal
        visible={!!rebidAuction}
        auction={rebidAuction}
        onClose={() => setRebidAuction(null)}
        onSuccess={() => setRebidAuction(null)}
      />
    </View>
  );
}

// --- My Bids Tab ---
function MyBidsTab({
  bids,
  loading,
  onRebid,
}: {
  bids: MyBidEntry[];
  loading: boolean;
  onRebid: (auction: Auction) => void;
}) {
  const router = useRouter();

  if (loading) return null;

  if (bids.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="hammer-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Nicio oferta activa</Text>
        <Text style={styles.emptySubtitle}>
          Plaseaza prima ta oferta din feed-ul de licitatii
        </Text>
        <Pressable style={styles.emptyButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.emptyButtonText}>Exploreaza piata</Text>
        </Pressable>
      </View>
    );
  }

  // Sort: outbid first, then ending soon
  const sorted = [...bids].sort((a, b) => {
    if (a.isLeading !== b.isLeading) return a.isLeading ? 1 : -1;
    return (a.auction?.endTime ?? 0) - (b.auction?.endTime ?? 0);
  });

  return (
    <View style={styles.list}>
      {sorted.map((entry) => (
        <BidStatusCard
          key={entry.auction?.id ?? entry.latestBid?.id}
          entry={entry}
          onRebid={onRebid}
        />
      ))}
    </View>
  );
}

function BidStatusCard({
  entry,
  onRebid,
}: {
  entry: MyBidEntry;
  onRebid: (auction: Auction) => void;
}) {
  const router = useRouter();
  const { auction, latestBid, isLeading, bidCount } = entry;

  if (!auction || !latestBid) return null;

  const currentPrice = auction.currentPricePerM3 ?? 0;
  const myBid = latestBid.amountPerM3 ?? 0;
  const myProxy = latestBid.maxProxyPerM3 ?? 0;
  const endTime = auction.endTime ?? 0;
  const now = Date.now();
  const remaining = Math.max(0, endTime - now);
  const isEndingSoon = remaining > 0 && remaining < 3_600_000; // < 1h
  const timeLabel = endTime > 0 ? formatCountdown(endTime) + ' ramas' : null;

  return (
    <Pressable
      style={[styles.bidCard, !isLeading && styles.bidCardOutbid]}
      onPress={() => router.push(`/auction/${auction.id}`)}
    >
      <View style={styles.bidHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bidTitle} numberOfLines={1}>
            {auction.title || `Licitatie #${auction.id?.slice(0, 8) ?? '?'}`}
          </Text>
          {auction.dominantSpecies && (
            <Text style={styles.bidMeta}>
              {auction.dominantSpecies} · {bidCount} oferte
            </Text>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          isLeading ? styles.statusBadgeLeading : styles.statusBadgeOutbid,
        ]}>
          <Ionicons
            name={isLeading ? 'trophy' : 'alert-circle'}
            size={11}
            color={isLeading ? Colors.success : Colors.error}
          />
          <Text style={[
            styles.statusBadgeText,
            { color: isLeading ? Colors.success : Colors.error },
          ]}>
            {isLeading ? 'CONDUCI' : 'DEPASIT'}
          </Text>
        </View>
      </View>

      <View style={styles.bidStatsRow}>
        <View style={styles.bidStat}>
          <Text style={styles.bidStatLabel}>Oferta ta</Text>
          <Text style={styles.bidStatValue}>{myBid} RON/m³</Text>
        </View>
        <View style={styles.bidStat}>
          <Text style={styles.bidStatLabel}>Max proxy</Text>
          <Text style={styles.bidStatValue}>{myProxy} RON/m³</Text>
        </View>
        <View style={styles.bidStat}>
          <Text style={styles.bidStatLabel}>Pret curent</Text>
          <Text style={[styles.bidStatValue, { color: Colors.primary }]}>
            {currentPrice} RON/m³
          </Text>
        </View>
      </View>

      {/* Footer: time remaining + rebid CTA */}
      <View style={styles.bidFooter}>
        {timeLabel ? (
          <Text style={[styles.bidTimeLabel, isEndingSoon && styles.bidTimeLabelUrgent]}>
            {timeLabel}
          </Text>
        ) : <View />}
        {!isLeading && auction.status === 'active' && (
          <Pressable
            style={styles.rebidButton}
            onPress={(e) => {
              e.stopPropagation?.();
              onRebid(auction);
            }}
            hitSlop={8}
          >
            <Text style={styles.rebidButtonText}>Liciteaza din nou</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// --- Watchlist Tab ---
function WatchlistTab({
  auctions,
  currentUserId,
  watchlistIds,
  onToggleWatchlist,
  onExplore,
}: {
  auctions: Auction[];
  currentUserId?: string;
  watchlistIds: Set<string>;
  onToggleWatchlist: (id: string) => void;
  onExplore: () => void;
}) {
  if (auctions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Nu urmaresti nicio licitatie</Text>
        <Text style={styles.emptySubtitle}>
          Adauga licitatii la lista de urmarire pentru a le accesa rapid
        </Text>
        <Pressable style={styles.emptyButton} onPress={onExplore}>
          <Text style={styles.emptyButtonText}>Exploreaza piata</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {auctions.map((auction) => (
        <AuctionCard
          key={auction.id}
          auction={auction}
          currentUserId={currentUserId}
          isWatchlisted={watchlistIds.has(auction.id)}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </View>
  );
}

// --- Won Tab ---
function WonTab({ auctions }: { auctions: Auction[] }) {
  const router = useRouter();

  if (auctions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Nicio licitatie castigata inca</Text>
        <Text style={styles.emptySubtitle}>
          Castiga prima ta licitatie pentru a o vedea aici
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {auctions.map((auction) => (
        <Pressable
          key={auction.id}
          style={styles.wonCard}
          onPress={() => router.push(`/auction/${auction.id}`)}
        >
          <View style={styles.wonHeader}>
            <Text style={styles.wonTitle} numberOfLines={1}>{auction.title}</Text>
            <View style={styles.wonBadge}>
              <Ionicons name="trophy" size={11} color={Colors.success} />
              <Text style={styles.wonBadgeText}>CASTIGATOR</Text>
            </View>
          </View>
          <View style={styles.wonStats}>
            <View style={styles.wonStat}>
              <Text style={styles.wonStatLabel}>Pret final</Text>
              <Text style={styles.wonStatValue}>{auction.currentPricePerM3} RON/m³</Text>
            </View>
            <View style={styles.wonStat}>
              <Text style={styles.wonStatLabel}>Volum</Text>
              <Text style={styles.wonStatValue}>{formatVolume(auction.volumeM3)}</Text>
            </View>
            <View style={styles.wonStat}>
              <Text style={styles.wonStatLabel}>Total</Text>
              <Text style={[styles.wonStatValue, { color: Colors.primary }]}>
                {formatRon(auction.currentPricePerM3 * auction.volumeM3)}
              </Text>
            </View>
          </View>
          <Text style={styles.wonDate}>{formatDate(auction.endTime)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  statsGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bg,
  },
  list: {
    paddingHorizontal: 16,
  },
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
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
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
  outbidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  outbidBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
  },
  outbidBannerSub: {
    fontSize: 11,
    color: Colors.error,
    opacity: 0.7,
    marginTop: 2,
  },
  // Bid status card
  bidCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  bidCardOutbid: {
    borderColor: 'rgba(239,68,68,0.30)',
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  bidTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  bidStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bidStat: {
    flex: 1,
  },
  bidStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bidStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  bidMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  bidFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  bidTimeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  bidTimeLabelUrgent: {
    color: Colors.error,
    fontWeight: '700',
  },
  rebidButton: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rebidButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeLeading: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.30)',
  },
  statusBadgeOutbid: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Won card
  wonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.20)',
    padding: 14,
    marginBottom: 8,
  },
  wonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  wonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  wonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.30)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  wonStats: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  wonStat: {
    flex: 1,
  },
  wonStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  wonStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  wonDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
