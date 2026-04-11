import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, StatusColors, SpeciesColors } from '../../constants/colors';
import { SegmentedBurnRing } from '../../components/SegmentedBurnRing';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveDot } from '../../components/LiveDot';
import { BufferGauge } from '../../components/BufferGauge';
import { BidRow } from '../../components/BidRow';
import { BidModal } from '../../components/BidModal';
import { useAuction, useAuctionUpdater } from '../../hooks/useAuction';
import { useBids } from '../../hooks/useBids';
import { useWatchlistIds, useToggleWatchlist } from '../../hooks/useWatchlist';
import { useWebSocketRoom, useWebSocketEvent } from '../../hooks/useWebSocket';
import { useAuthContext } from '../../lib/AuthContext';
import { getSpeciesIncrement } from '../../lib/incrementLadder';
import { formatVolume, formatPrice, formatRon, formatPercent, formatCountdown } from '../../lib/formatters';
import type { Auction } from '../../types';

type DetailTab = 'detalii' | 'oferte' | 'padure' | 'documente';

function getSpeciesColor(species: string): string {
  if (SpeciesColors[species]) return SpeciesColors[species];
  const firstWord = species.split(' ')[0];
  const match = Object.keys(SpeciesColors).find((k) => k.startsWith(firstWord));
  return match ? SpeciesColors[match] : '#9CA3AF';
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isBuyer } = useAuthContext();
  const [tab, setTab] = useState<DetailTab>('detalii');
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [prefillBid, setPrefillBid] = useState<number | undefined>();
  const [showApvDetails, setShowApvDetails] = useState(false);

  const { data: auction, isLoading } = useAuction(id);
  const { data: bids } = useBids(id);
  const watchlistIds = useWatchlistIds();
  const toggleWatchlist = useToggleWatchlist();
  const { updateInCache, invalidate } = useAuctionUpdater(id);

  // Price flash animation
  const priceFlash = useRef(new Animated.Value(1)).current;
  const flashPrice = useCallback(() => {
    Animated.sequence([
      Animated.timing(priceFlash, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.timing(priceFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [priceFlash]);

  // WebSocket subscription
  useWebSocketRoom(id ? `watch:auction:${id}` : null);

  useWebSocketEvent<{ currentPricePerM3: number; bidCount: number; currentBidderId?: string }>(
    'auction:update',
    useCallback((data) => {
      updateInCache(data);
      flashPrice();
    }, [updateInCache, flashPrice])
  );

  useWebSocketEvent<{ auctionId: string }>(
    'bid:outbid',
    useCallback(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      invalidate();
    }, [invalidate])
  );

  useWebSocketEvent<{ endTime: number }>(
    'auction:soft-close',
    useCallback((data) => {
      updateInCache({ endTime: data.endTime, softCloseActive: true });
    }, [updateInCache])
  );

  useWebSocketEvent<{}>(
    'auction:ended',
    useCallback(() => {
      invalidate();
    }, [invalidate])
  );

  if (isLoading || !auction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const isWatchlisted = watchlistIds.has(auction.id);
  const isLeading = user?.id && auction.currentBidderId === user.id;
  const userHasBid = user?.id && bids?.some((b) => b.bidderId === user.id);
  const isOutbid = userHasBid && !isLeading;
  const isActive = auction.status === 'active';
  const userMaxProxy = bids
    ?.filter((b) => b.bidderId === user?.id)
    .reduce((max, b) => Math.max(max, b.maxProxyPerM3), 0) ?? 0;

  const increment = getSpeciesIncrement(auction.dominantSpecies);

  const handleQuickBid = (multiplier: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrefillBid(auction.currentPricePerM3 + increment * multiplier);
    setBidModalVisible(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: auction.title,
        message: `${auction.title} — ${auction.currentPricePerM3} RON/m³ pe Romanian Forest`,
      });
    } catch {}
  };

  // gpsCoordinates is set by the resolver on new auctions.
  // publicApvPoint is the legacy field written before the gpsCoordinates fix — use as fallback.
  const displayCoords: { lat: number; lng: number } | null =
    auction.gpsCoordinates ?? (auction as any).publicApvPoint ?? null;

  const openMaps = () => {
    if (!displayCoords) return;
    Linking.openURL(`https://maps.google.com/?q=${displayCoords.lat},${displayCoords.lng}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — back arrow + inline title + actions + status pill */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} hitSlop={8} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {auction.title}
        </Text>
        <Pressable
          onPress={() => toggleWatchlist(auction.id)}
          hitSlop={8}
          style={styles.iconButtonSmall}
        >
          <Ionicons
            name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isWatchlisted ? Colors.primary : Colors.text}
          />
        </Pressable>
        <Pressable onPress={handleShare} hitSlop={8} style={styles.iconButtonSmall}>
          <Ionicons name="share-outline" size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.headerStatusBadge}>
          <StatusBadge status={auction.status} variant="outline" />
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['detalii', 'oferte', 'padure', 'documente'] as DetailTab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabButton, tab === t && styles.tabButtonActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'detalii' ? 'Detalii' : t === 'oferte' ? 'Oferte' : t === 'padure' ? 'Padure' : 'Documente'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'detalii' && (
          <DetailsTab
            auction={auction}
            isLeading={!!isLeading}
            isOutbid={!!isOutbid}
            userMaxProxy={userMaxProxy}
            canBid={isBuyer}
            priceFlash={priceFlash}
            onQuickBid={handleQuickBid}
            onOpenMaps={openMaps}
            showApvDetails={showApvDetails}
            setShowApvDetails={setShowApvDetails}
          />
        )}

        {tab === 'oferte' && (
          <BidsTab bids={bids ?? []} currentUserId={user?.id} />
        )}

        {tab === 'padure' && <ForestTab auction={auction} />}

        {tab === 'documente' && <DocumentsTab auction={auction} />}
      </ScrollView>

      {/* Sticky bid CTA — only buyers can bid */}
      {isActive && isBuyer && tab === 'detalii' && (
        <View style={styles.stickyBar}>
          <Pressable
            style={styles.stickyButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPrefillBid(undefined);
              setBidModalVisible(true);
            }}
          >
            <Text style={styles.stickyButtonText}>Plaseaza Oferta</Text>
          </Pressable>
        </View>
      )}

      <BidModal
        visible={bidModalVisible}
        auction={auction}
        prefillAmount={prefillBid}
        onClose={() => setBidModalVisible(false)}
        onSuccess={() => setBidModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// --- DetailsTab ---
interface DetailsTabProps {
  auction: Auction;
  isLeading: boolean;
  isOutbid: boolean;
  userMaxProxy: number;
  canBid: boolean;
  priceFlash: Animated.Value;
  onQuickBid: (multiplier: number) => void;
  onOpenMaps: () => void;
  showApvDetails: boolean;
  setShowApvDetails: (v: boolean) => void;
}

function DetailsTab({
  auction,
  isLeading,
  isOutbid,
  userMaxProxy,
  canBid,
  priceFlash,
  onQuickBid,
  onOpenMaps,
  showApvDetails,
  setShowApvDetails,
}: DetailsTabProps) {
  const increment = getSpeciesIncrement(auction.dominantSpecies);
  const projectedTotal = auction.currentPricePerM3 * auction.volumeM3;
  const isActive = auction.status === 'active';
  const displayCoords: { lat: number; lng: number } | null =
    auction.gpsCoordinates ?? (auction as any).publicApvPoint ?? null;

  // Compute total session length for the "din 3h 24m total" line
  const totalDurationLabel = formatCountdown(auction.endTime).replace(/\d+s$/, '').trim();
  const sessionDurationMs = (auction.endTime ?? 0) - (auction.startTime ?? 0);
  const sessionLabel = (() => {
    if (sessionDurationMs <= 0) return '';
    const hours = Math.floor(sessionDurationMs / 3_600_000);
    const minutes = Math.floor((sessionDurationMs % 3_600_000) / 60_000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  })();

  return (
    <View style={styles.tabContent}>
      {/* Bid status banner — leading or outbid */}
      {isLeading && (
        <View style={[styles.banner, styles.bannerSuccess]}>
          <Ionicons name="trophy" size={18} color={Colors.success} />
          <Text style={[styles.bannerText, { color: Colors.success }]}>
            Oferta ta conduce
          </Text>
        </View>
      )}
      {isOutbid && (
        <View style={[styles.banner, styles.bannerError]}>
          <Ionicons name="alert-circle" size={18} color={Colors.error} />
          <Text style={[styles.bannerText, { color: Colors.error }]}>
            Ai fost depasit! · {(auction.currentPricePerM3 ?? 0).toLocaleString('ro-RO')} RON/m³
          </Text>
        </View>
      )}
      {auction.softCloseActive && (
        <View style={styles.softCloseBanner}>
          <Ionicons name="time" size={14} color={Colors.warning} />
          <Text style={styles.softCloseText}>SOFT-CLOSE — licitatia se prelungeste</Text>
        </View>
      )}

      {/* Hero: LIVE label + segmented burn ring + price + total */}
      <View style={styles.heroSection}>
        {isActive && (
          <View style={styles.liveRow}>
            <LiveDot color={Colors.success} size={8} pulse />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {isActive ? (
          <SegmentedBurnRing
            endTime={auction.endTime}
            startTime={auction.startTime}
            size={220}
            segments={24}
          />
        ) : null}

        {sessionLabel && (
          <Text style={styles.sessionLabel}>din {sessionLabel} total</Text>
        )}

        <Animated.View style={{ transform: [{ scale: priceFlash }] }}>
          <Text style={styles.heroPrice}>
            {(auction.currentPricePerM3 ?? 0).toLocaleString('ro-RO')}
          </Text>
        </Animated.View>
        <Text style={styles.heroPriceUnit}>RON/m³</Text>
        <Text style={styles.heroTotal}>
          Total proiectat: {formatRon(projectedTotal)}
        </Text>
      </View>

      {/* Buffer gauge (if user has bid) */}
      {userMaxProxy > 0 && (
        <View style={styles.section}>
          <BufferGauge
            currentPrice={auction.currentPricePerM3}
            maxProxy={userMaxProxy}
            dominantSpecies={auction.dominantSpecies}
          />
        </View>
      )}

      {/* Quick bid buttons — only buyers can bid */}
      {isActive && canBid && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>OFERTA RAPIDA</Text>
          <View style={styles.quickRow}>
            {[1, 3, 5].map((mult) => (
              <Pressable
                key={mult}
                style={styles.quickButton}
                onPress={() => onQuickBid(mult)}
              >
                <Text style={styles.quickLabel}>+{mult}×</Text>
                <Text style={styles.quickPrice}>
                  {(auction.currentPricePerM3 ?? 0) + increment * mult} RON
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Info grid — 2x2 cards */}
      <Text style={styles.sectionHeader}>INFORMATII LOT</Text>
      <View style={styles.infoGrid}>
        <InfoItem icon="location-outline" label="Locatie" value={auction.location || '—'} />
        <InfoItem icon="person-outline" label="Proprietar" value={auction.ownerName || '—'} />
        <InfoItem icon="cube-outline" label="Volum" value={formatVolume(auction.volumeM3)} />
        <InfoItem icon="people-outline" label="Oferte" value={String(auction.bidCount ?? 0)} />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Locatie</Text>
        <View style={styles.locationCard}>
          <Ionicons name="location-outline" size={18} color={Colors.primary} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>{auction.location}</Text>
            <Text style={styles.locationRegion}>{auction.region}</Text>
            {(auction.apvUpLocation || auction.apvUaLocation) && (
              <Text style={styles.locationApv}>
                {[auction.apvUpLocation && `UP ${auction.apvUpLocation}`, auction.apvUaLocation && `UA ${auction.apvUaLocation}`].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          {displayCoords && (
            <View style={styles.locationVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
              <Text style={styles.locationVerifiedText}>GPS</Text>
            </View>
          )}
        </View>
        {displayCoords && (
          <Pressable style={styles.mapsButton} onPress={onOpenMaps}>
            <Ionicons name="navigate-outline" size={16} color={Colors.bg} />
            <Text style={styles.mapsButtonText}>Deschide în Google Maps</Text>
          </Pressable>
        )}
      </View>

      {/* Owner */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Proprietar</Text>
        <View style={styles.ownerCard}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.ownerName}>{auction.ownerName}</Text>
        </View>
      </View>

      {/* Description */}
      {auction.description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descriere</Text>
          <Text style={styles.description}>{auction.description}</Text>
        </View>
      )}

      {/* APV technical data accordion */}
      {(auction.apvPermitNumber || auction.apvSurfaceHa) && (
        <View style={styles.section}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => setShowApvDetails(!showApvDetails)}
          >
            <Text style={styles.sectionLabel}>Date tehnice APV</Text>
            <Ionicons
              name={showApvDetails ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
          {showApvDetails && (
            <View style={styles.apvCard}>
              {auction.apvPermitNumber && (
                <ApvRow label="Numar permis" value={auction.apvPermitNumber} />
              )}
              {auction.apvTreatmentType && (
                <ApvRow label="Tratament" value={auction.apvTreatmentType} />
              )}
              {auction.apvExtractionMethod && (
                <ApvRow label="Extractie" value={auction.apvExtractionMethod} />
              )}
              {auction.apvSurfaceHa !== undefined && (
                <ApvRow label="Suprafata" value={`${auction.apvSurfaceHa} ha`} />
              )}
              {auction.apvSlopePercent !== undefined && (
                <ApvRow label="Panta" value={`${auction.apvSlopePercent}%`} />
              )}
              {auction.apvAccessibility && (
                <ApvRow label="Accesibilitate" value={auction.apvAccessibility} />
              )}
              {auction.apvAverageAge !== undefined && (
                <ApvRow label="Varsta medie" value={`${auction.apvAverageAge} ani`} />
              )}
              {auction.apvAverageDiameter !== undefined && (
                <ApvRow label="Diametru mediu" value={`${auction.apvAverageDiameter} cm`} />
              )}
              {auction.apvAverageHeight !== undefined && (
                <ApvRow label="Inaltime medie" value={`${auction.apvAverageHeight} m`} />
              )}
              {auction.apvNumberOfTrees !== undefined && (
                <ApvRow label="Numar arbori" value={String(auction.apvNumberOfTrees)} />
              )}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 80 }} />
    </View>
  );
}

function InfoItem({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ApvRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.apvRow}>
      <Text style={styles.apvLabel}>{label}</Text>
      <Text style={styles.apvValue}>{value}</Text>
    </View>
  );
}

// --- BidsTab ---
function BidsTab({ bids, currentUserId }: { bids: any[]; currentUserId?: string }) {
  if (bids.length === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.empty}>
          <Ionicons name="hammer-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Nicio oferta inca</Text>
          <Text style={styles.emptySubtitle}>Fii primul care liciteaza pe acest lot</Text>
        </View>
      </View>
    );
  }

  // Sort by amount desc, then by timestamp desc
  const sorted = [...bids].sort((a, b) => {
    if (b.amountPerM3 !== a.amountPerM3) return b.amountPerM3 - a.amountPerM3;
    return b.timestamp - a.timestamp;
  });

  return (
    <View style={styles.tabContent}>
      <Text style={styles.bidsCount}>{sorted.length} oferte</Text>
      {sorted.map((bid, idx) => (
        <BidRow
          key={bid.id}
          bid={bid}
          rank={idx + 1}
          isCurrentUser={bid.bidderId === currentUserId}
        />
      ))}
      <View style={{ height: 40 }} />
    </View>
  );
}

// --- ForestTab ---
function ForestTab({ auction }: { auction: Auction }) {
  const sorted = [...auction.speciesBreakdown].sort((a, b) => b.percentage - a.percentage);
  const totalVolume = auction.volumeM3;
  const dendrometry = auction.apvDendrometryPerSpecies;
  const sortVolumes = auction.apvSortVolumes;

  return (
    <View style={styles.tabContent}>
      {/* Species composition table */}
      <Text style={styles.sectionLabel}>Compozitie specii</Text>
      <View style={styles.speciesTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Specie</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>m³</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: 'right' }]}>%</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Arb.</Text>
        </View>
        {sorted.map((s, i) => {
          const isDominant = s.species === auction.dominantSpecies;
          const speciesVolume = s.volumeM3
            ?? auction.apvVolumePerSpecies?.[s.species]
            ?? (totalVolume * s.percentage / 100);
          const treeCount = dendrometry?.[s.species]?.treeCount;
          return (
            <View key={i} style={[styles.tableRow, isDominant && styles.tableRowDominant]}>
              <View style={[styles.speciesNameCell, { flex: 2 }]}>
                <View style={[styles.speciesDot, { backgroundColor: getSpeciesColor(s.species) }]} />
                <Text style={[styles.speciesName, isDominant && styles.speciesNameDominant]} numberOfLines={1}>
                  {s.species}
                </Text>
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {formatVolume(speciesVolume)}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.7, textAlign: 'right' }]}>
                {s.percentage.toFixed(0)}%
              </Text>
              <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', color: Colors.textMuted }]}>
                {treeCount != null ? treeCount : '—'}
              </Text>
            </View>
          );
        })}
        <View style={[styles.tableRow, styles.tableRowTotal]}>
          <Text style={[styles.tableCell, styles.tableCellTotal, { flex: 2 }]}>Total</Text>
          <Text style={[styles.tableCell, styles.tableCellTotal, { flex: 1, textAlign: 'right' }]}>
            {formatVolume(totalVolume)}
          </Text>
          <Text style={[styles.tableCell, styles.tableCellTotal, { flex: 0.7, textAlign: 'right' }]}>
            100%
          </Text>
          <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', color: Colors.textMuted }]}>
            {auction.apvNumberOfTrees != null ? auction.apvNumberOfTrees : '—'}
          </Text>
        </View>
      </View>

      {/* Assortment breakdown */}
      {sortVolumes && Object.keys(sortVolumes).length > 0 && (
        <AssortmentBars sortVolumes={sortVolumes} firewoodVolume={auction.apvFirewoodVolume} barkVolume={auction.apvBarkVolume} />
      )}

      {/* Dendrometric chips */}
      <MetricChips auction={auction} />

      {/* Condition indicators */}
      <ConditionWarnings auction={auction} />

      <View style={{ height: 40 }} />
    </View>
  );
}

// --- AssortmentBars ---
function AssortmentBars({ sortVolumes, firewoodVolume, barkVolume }: {
  sortVolumes: Record<string, number>;
  firewoodVolume?: number;
  barkVolume?: number;
}) {
  const cheresteaKeys = ['G1', 'G2', 'G3'];
  const industrieKeys = ['M1', 'M2', 'M3', 'LS'];

  const cheresteaM3 = cheresteaKeys.reduce((s, k) => s + (sortVolumes[k] ?? 0), 0);
  const industrieM3 = industrieKeys.reduce((s, k) => s + (sortVolumes[k] ?? 0), 0);
  const foc = firewoodVolume ?? 0;
  const coaja = barkVolume ?? 0;
  const total = cheresteaM3 + industrieM3 + foc + coaja;
  const rendament = total > 0 ? Math.round((cheresteaM3 + industrieM3) / total * 100) : 0;

  const tiers = [
    {
      label: 'CHERESTEA / FURNIR',
      sublabel: 'G1 + G2 + G3',
      m3: cheresteaM3,
      pct: total > 0 ? Math.round(cheresteaM3 / total * 100) : 0,
      color: '#22c55e',
      bgColor: 'rgba(34,197,94,0.08)',
      borderColor: 'rgba(34,197,94,0.20)',
      dotColor: '#16a34a',
      items: cheresteaKeys
        .map(k => ({ label: k, value: sortVolumes[k] ?? 0 }))
        .filter(i => i.value > 0),
    },
    {
      label: 'LEMN INDUSTRIE',
      sublabel: 'M1 + M2 + M3 + LS',
      m3: industrieM3,
      pct: total > 0 ? Math.round(industrieM3 / total * 100) : 0,
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.08)',
      borderColor: 'rgba(245,158,11,0.20)',
      dotColor: '#d97706',
      items: industrieKeys
        .map(k => ({ label: k, value: sortVolumes[k] ?? 0 }))
        .filter(i => i.value > 0),
    },
    {
      label: 'LEMN FOC',
      sublabel: 'Lemn de foc',
      m3: foc,
      pct: total > 0 ? Math.round(foc / total * 100) : 0,
      color: '#ef4444',
      bgColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.20)',
      dotColor: '#dc2626',
      items: [],
    },
  ].filter(t => t.m3 > 0);

  return (
    <View style={{ marginTop: 24 }}>
      {/* Section header with big rendament number */}
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.sectionLabel}>Sortimente lemnoase</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#22c55e', letterSpacing: -1 }}>
            {rendament}%
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textMuted, fontWeight: '500' }}>
            randament industrial
          </Text>
        </View>
      </View>

      {/* Tier cards */}
      {tiers.map((tier, ti) => (
        <View
          key={ti}
          style={{
            backgroundColor: tier.bgColor,
            borderWidth: 1,
            borderColor: tier.borderColor,
            borderRadius: 12,
            padding: 14,
            marginBottom: 8,
          }}
        >
          {/* Card header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: tier.items.length > 0 ? 10 : 0 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tier.color, letterSpacing: 0.6 }}>
                {tier.label}
              </Text>
              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
                {tier.sublabel}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: tier.color, letterSpacing: -0.5 }}>
                {tier.m3.toFixed(0)} m³
              </Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted, fontWeight: '600' }}>
                {tier.pct}% din total
              </Text>
            </View>
          </View>

          {/* Inline bar */}
          {tier.m3 > 0 && total > 0 && (
            <View style={{ height: 4, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: tier.items.length > 0 ? 10 : 0, overflow: 'hidden' }}>
              <View style={{ width: `${tier.pct}%`, height: 4, backgroundColor: tier.color, borderRadius: 9999 }} />
            </View>
          )}

          {/* Sub-items (G1/G2/G3 or M1/M2/LS) */}
          {tier.items.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {tier.items.map((item, ii) => (
                <View
                  key={ii}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    borderRadius: 8,
                    padding: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: tier.color, letterSpacing: 0.4 }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.text, marginTop: 2 }}>
                    {item.value.toFixed(0)}m³
                  </Text>
                  <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                    {total > 0 ? Math.round(item.value / total * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Coajă as a quiet footnote row */}
      {coaja > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingTop: 4 }}>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>Coajă</Text>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>{coaja.toFixed(2)} m³  ({total > 0 ? Math.round(coaja / total * 100) : 0}%)</Text>
        </View>
      )}
    </View>
  );
}

// --- MetricChips ---
function MetricChips({ auction }: { auction: Auction }) {
  const chips: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Diametru med.', value: auction.apvAverageDiameter != null ? `${auction.apvAverageDiameter} cm` : null },
    { label: 'Înălțime med.', value: auction.apvAverageHeight != null ? `${auction.apvAverageHeight} m` : null },
    { label: 'Vârstă med.', value: auction.apvAverageAge != null ? `${auction.apvAverageAge} ani` : null },
    { label: 'Vol./arbore', value: (auction.apvGrossVolume != null && auction.apvNumberOfTrees != null && auction.apvNumberOfTrees > 0) ? `${(auction.apvGrossVolume / auction.apvNumberOfTrees).toFixed(2)} m³` : null },
    { label: 'Nr. arbori', value: auction.apvNumberOfTrees != null ? auction.apvNumberOfTrees : null },
    { label: 'Suprafață', value: auction.apvSurfaceHa != null ? `${auction.apvSurfaceHa} ha` : null },
  ].filter(c => c.value != null);

  if (chips.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>Date dendrometrice</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((c, i) => (
          <View key={i} style={styles.metricChip}>
            <Text style={styles.metricChipLabel}>{c.label}</Text>
            <Text style={styles.metricChipValue}>{c.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- ConditionWarnings ---
function ConditionWarnings({ auction }: { auction: Auction }) {
  const rottenCount = auction.apvRottenTreesCount;
  const rottenVol = auction.apvRottenTreesVolume;
  const dryCount = auction.apvDryTreesCount;
  const dryVol = auction.apvDryTreesVolume;

  if (!rottenCount && !dryCount) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Starea arboretului</Text>
      {rottenCount != null && rottenCount > 0 && (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            {rottenCount} arbori putreziți{rottenVol != null ? ` (${rottenVol.toFixed(2)} m³)` : ''}
          </Text>
        </View>
      )}
      {dryCount != null && dryCount > 0 && (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={16} color={Colors.warning} />
          <Text style={styles.warningText}>
            {dryCount} arbori uscați{dryVol != null ? ` (${dryVol.toFixed(2)} m³)` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// --- DocumentsTab ---
function DocumentsTab({ auction }: { auction: Auction }) {
  const docs = auction.documents ?? [];

  if (docs.length === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Niciun document</Text>
          <Text style={styles.emptySubtitle}>Aceasta licitatie nu are documente atasate</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {docs.map((doc) => {
        const isPdf = doc.mimeType?.includes('pdf');
        const sizeKB = (doc.fileSize / 1024).toFixed(0);
        return (
          <Pressable
            key={doc.id}
            style={styles.docCard}
            onPress={() => {
              if (doc.storagePath) Linking.openURL(doc.storagePath);
            }}
          >
            <View style={[styles.docIcon, doc.isApvDocument && styles.docIconApv]}>
              <Ionicons
                name={isPdf ? 'document-text' : 'image'}
                size={20}
                color={doc.isApvDocument ? Colors.primary : Colors.textSecondary}
              />
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
              <Text style={styles.docMeta}>{sizeKB} KB</Text>
            </View>
            {doc.isApvDocument && (
              <View style={styles.apvBadge}>
                <Text style={styles.apvBadgeText}>APV</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        );
      })}
      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSmall: {
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerStatusBadge: {
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  auctionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.04 * 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  softCloseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.30)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  softCloseText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerSuccess: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderColor: 'rgba(34,197,94,0.30)',
  },
  bannerError: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 1,
  },
  sessionLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  softCloseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
    marginBottom: 12,
  },
  heroPrice: {
    fontSize: 64,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: -2,
  },
  heroPriceUnit: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: -4,
  },
  heroTotal: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textStrong,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.surface,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoItem: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationInfo: {
    flex: 1,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  locationRegion: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  locationApv: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  locationVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  locationVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.bg,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apvCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 8,
  },
  apvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  apvLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  apvValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  // Bids tab
  bidsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
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
  // Forest tab
  speciesTable: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  tableRowDominant: {
    backgroundColor: Colors.primaryMuted,
  },
  tableRowTotal: {
    backgroundColor: Colors.surfaceElevated,
    borderTopColor: Colors.border,
  },
  speciesNameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speciesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  speciesName: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  speciesNameDominant: {
    fontWeight: '700',
  },
  tableCell: {
    fontSize: 13,
    color: Colors.text,
  },
  tableCellTotal: {
    fontWeight: '700',
  },
  woodPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  metricChip: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '30%',
    flex: 1,
  },
  metricChipLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  metricChipValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.20)',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: Colors.warning,
    fontWeight: '500',
  },
  // Documents tab
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docIconApv: {
    backgroundColor: Colors.primarySoft,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  docMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  apvBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  apvBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  // Sticky CTA
  stickyBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bgSoft,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stickyButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
});
