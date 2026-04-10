import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AuctionCard } from '../../components/AuctionCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { FilterSheet } from '../../components/FilterSheet';
import { BidModal } from '../../components/BidModal';
import { AuctionMap } from '../../components/AuctionMap';
import { LiveDot } from '../../components/LiveDot';
import { useAuctions, useAuctionsFeedUpdater } from '../../hooks/useAuctions';
import { useWatchlistIds, useToggleWatchlist } from '../../hooks/useWatchlist';
import {
  useWebSocketConnection,
  useWebSocketRoom,
  useWebSocketEvent,
} from '../../hooks/useWebSocket';
import { useAuthContext } from '../../lib/AuthContext';
import type { Auction, AuctionFilters } from '../../types';

type StatusFilter = 'all' | 'active' | 'upcoming' | 'completed';
type ViewMode = 'list' | 'map';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Toate' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'In curand' },
  { key: 'completed', label: 'Incheiate' },
];

function formatClock(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AuctionFeedScreen() {
  const { user, isBuyer } = useAuthContext();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<AuctionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [bidModalAuction, setBidModalAuction] = useState<Auction | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number>(Date.now());

  const { data: auctions, isLoading, refetch, isRefetching, dataUpdatedAt } =
    useAuctions(filters);
  const watchlistIds = useWatchlistIds();
  const toggleWatchlist = useToggleWatchlist();
  const { updateAuctionInCache } = useAuctionsFeedUpdater();

  // Update the live timestamp whenever React Query gives us new data
  useEffect(() => {
    if (dataUpdatedAt > 0) setLastRefreshAt(dataUpdatedAt);
  }, [dataUpdatedAt]);

  // WebSocket
  useWebSocketConnection();
  useWebSocketRoom('watch:feed');

  useWebSocketEvent<{ auctionId: string; currentPricePerM3: number; bidCount: number }>(
    'bid:new',
    useCallback(
      (data) => {
        updateAuctionInCache(data.auctionId, {
          currentPricePerM3: data.currentPricePerM3,
          bidCount: data.bidCount,
        });
        setLastRefreshAt(Date.now());
      },
      [updateAuctionInCache]
    )
  );

  useWebSocketEvent<{ auctionId: string; endTime: number }>(
    'auction:soft-close',
    useCallback(
      (data) => {
        updateAuctionInCache(data.auctionId, {
          endTime: data.endTime,
          softCloseActive: true,
        });
      },
      [updateAuctionInCache]
    )
  );

  useWebSocketEvent<{ auctionId: string }>(
    'auction:ended',
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Counts per status (for the title subtitle)
  const counts = useMemo(() => {
    const all = auctions ?? [];
    return {
      all: all.length,
      active: all.filter((a) => a.status === 'active').length,
      upcoming: all.filter((a) => a.status === 'upcoming').length,
      completed: all.filter((a) => a.status === 'ended' || a.status === 'sold').length,
    };
  }, [auctions]);

  // Filter by selected status filter pill + search
  const filteredAuctions = useMemo(() => {
    if (!auctions) return [];

    let list = auctions.filter((a) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return a.status === 'active';
      if (statusFilter === 'upcoming') return a.status === 'upcoming';
      return a.status === 'ended' || a.status === 'sold';
    });

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q) ||
          (a.speciesBreakdown ?? []).some((s) => s.species.toLowerCase().includes(q))
      );
    }

    return list;
  }, [auctions, statusFilter, searchText]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.species) count++;
    if (filters.region) count++;
    if (filters.minPrice !== undefined) count++;
    if (filters.maxPrice !== undefined) count++;
    if (filters.minVolume !== undefined) count++;
    if (filters.maxVolume !== undefined) count++;
    if (filters.sortBy && filters.sortBy !== 'endTime') count++;
    return count;
  }, [filters]);

  const handleQuickBid = (auction: Auction) => {
    setBidModalAuction(auction);
  };

  const renderAuction = useCallback(
    ({ item }: { item: Auction }) => (
      <AuctionCard
        auction={item}
        currentUserId={user?.id}
        isWatchlisted={watchlistIds.has(item.id)}
        canBid={isBuyer}
        onToggleWatchlist={toggleWatchlist}
        onQuickBid={handleQuickBid}
      />
    ),
    [user?.id, watchlistIds, toggleWatchlist, isBuyer]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — title + subtitle with active/upcoming counts */}
      <View style={styles.header}>
        <Text style={styles.title}>Licitatii</Text>
        <Text style={styles.subtitle}>
          {counts.active} active · {counts.upcoming} in curand
        </Text>
      </View>

      {/* Search bar with view toggle */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Cauta loturi, judete, specii..."
            placeholderTextColor={Colors.textMuted}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={styles.iconButton}
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          accessibilityLabel={viewMode === 'list' ? 'Vezi pe harta' : 'Vezi ca lista'}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color={Colors.text}
          />
        </Pressable>
      </View>

      {/* Filter pill row: Toate / Active / In curand / Incheiate / Filtre */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <Pressable
              key={f.key}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.pill, styles.pillFilter]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={14} color={Colors.primary} />
          <Text style={[styles.pillText, styles.pillFilterText]}>Filtre</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>

      {/* "X loturi gasite · ● 16:32" indicator row */}
      <View style={styles.indicatorRow}>
        <Text style={styles.indicatorText}>{filteredAuctions.length} loturi gasite</Text>
        <View style={styles.timestampRow}>
          <LiveDot color={Colors.success} size={6} pulse />
          <Text style={styles.timestampText}>{formatClock(lastRefreshAt)}</Text>
        </View>
      </View>

      {/* Active filter chips (from FilterSheet) */}
      {activeFilterCount > 0 && (
        <View style={styles.chipRow}>
          {filters.species && (
            <Pressable
              style={styles.activeChip}
              onPress={() => setFilters((f) => ({ ...f, species: undefined }))}
            >
              <Text style={styles.activeChipText}>{filters.species}</Text>
              <Ionicons name="close" size={12} color={Colors.primary} />
            </Pressable>
          )}
          {filters.region && (
            <Pressable
              style={styles.activeChip}
              onPress={() => setFilters((f) => ({ ...f, region: undefined }))}
            >
              <Text style={styles.activeChipText}>{filters.region}</Text>
              <Ionicons name="close" size={12} color={Colors.primary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Auction list or map */}
      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : viewMode === 'map' ? (
        <AuctionMap auctions={filteredAuctions} />
      ) : (
        <FlatList
          data={filteredAuctions}
          renderItem={renderAuction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="leaf-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nicio licitatie gasita</Text>
              <Text style={styles.emptySubtitle}>
                Incearca alt filtru sau cauta dupa specie
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={showFilters}
        filters={filters}
        onApply={setFilters}
        onClose={() => setShowFilters(false)}
      />

      <BidModal
        visible={!!bidModalAuction}
        auction={bidModalAuction}
        onClose={() => setBidModalAuction(null)}
        onSuccess={() => setBidModalAuction(null)}
      />
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
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.05 * 32,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: 44,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillScroll: {
    flexShrink: 0,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
    minHeight: 52,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.bg,
  },
  pillFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: Colors.primaryBorder,
  },
  pillFilterText: {
    color: Colors.primary,
  },
  filterCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.bg,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  indicatorText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
