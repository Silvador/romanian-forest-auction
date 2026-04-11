import { useEffect, useRef, memo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, StatusColors } from '../constants/colors';
import { SpeciesBar } from './SpeciesBar';
import { LiveDot } from './LiveDot';
import { formatPrice, formatBidCount, formatCountdown } from '../lib/formatters';
import type { Auction } from '../types';

interface Props {
  auction: Auction;
  currentUserId?: string;
  isWatchlisted?: boolean;
  /** True when the current user has been outbid on this auction. */
  isOutbid?: boolean;
  /** Whether the current user can place bids — only buyers can. Default true. */
  canBid?: boolean;
  onToggleWatchlist?: (auctionId: string) => void;
  onQuickBid?: (auction: Auction) => void;
}

function AuctionCardImpl({
  auction,
  currentUserId,
  isWatchlisted = false,
  isOutbid = false,
  canBid = true,
  onToggleWatchlist,
  onQuickBid,
}: Props) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isActive = auction.status === 'active';
  const isCompleted = auction.status === 'ended' || auction.status === 'sold';
  const isLeading = currentUserId && auction.currentBidderId === currentUserId;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/auction/${auction.id}`);
  };

  const handleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleWatchlist?.(auction.id);
  };

  const statusDotColor = isActive
    ? Colors.success
    : auction.status === 'upcoming'
      ? Colors.warning
      : Colors.textMuted;

  return (
    <Animated.View
      style={[
        styles.card,
        isOutbid && styles.cardOutbid,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Header row: status dot + location + bookmark */}
        <View style={styles.headerRow}>
          <View style={styles.locationRow}>
            <LiveDot color={statusDotColor} size={8} pulse={isActive} />
            <Text style={styles.location} numberOfLines={1}>
              {auction.location}, {auction.region}
            </Text>
          </View>
          <Pressable
            onPress={handleWatchlist}
            hitSlop={8}
            style={styles.watchlistBtn}
            accessibilityLabel={isWatchlisted ? 'Sterge din lista de urmarire' : 'Adauga la lista de urmarire'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isWatchlisted ? Colors.primary : Colors.textMuted}
            />
          </Pressable>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {auction.title}
        </Text>

        {/* Species bar + tags */}
        <View style={styles.speciesSection}>
          <SpeciesBar breakdown={auction.speciesBreakdown} maxTags={3} />
        </View>

        {/* Industrial / Firewood split pills */}
        <WoodSplitPill auction={auction} />

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metricText}>
              {(auction.volumeM3 ?? 0).toLocaleString('ro-RO')} m³
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.metricText}>{formatBidCount(auction.bidCount)}</Text>
          </View>
          {isLeading && (
            <View style={styles.leadingBadge}>
              <Ionicons name="trophy" size={11} color={Colors.success} />
              <Text style={styles.leadingText}>Tu conduci</Text>
            </View>
          )}
          {isOutbid && !isLeading && (
            <Text style={styles.outbidText}>Depasit</Text>
          )}
        </View>

        {/* Footer: "Pret curent" label + big price | countdown chip + bid button */}
        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Pret curent</Text>
            <Text style={styles.price}>{formatPrice(auction.currentPricePerM3)}</Text>
          </View>

          <View style={styles.footerRight}>
            {isActive && (
              <CountdownChip endTime={auction.endTime} startTime={auction.startTime} />
            )}

            {isCompleted ? (
              <View
                style={[
                  styles.resultBadge,
                  {
                    backgroundColor:
                      auction.status === 'sold' ? StatusColors.sold.bg : StatusColors.ended.bg,
                    borderColor:
                      auction.status === 'sold'
                        ? StatusColors.sold.border
                        : StatusColors.ended.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.resultText,
                    {
                      color:
                        auction.status === 'sold'
                          ? StatusColors.sold.text
                          : StatusColors.ended.text,
                    },
                  ]}
                >
                  {auction.status === 'sold' ? 'Vandut' : 'Fara oferte'}
                </Text>
              </View>
            ) : canBid ? (
              <Pressable
                style={styles.bidButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onQuickBid?.(auction);
                }}
              >
                <Text style={styles.bidButtonText}>Oferta</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// --- Wood split pill (industrial vs firewood) ---
function WoodSplitPill({ auction }: { auction: Auction }) {
  const sortVolumes = auction.apvSortVolumes as Record<string, number> | undefined;
  const industrialKeys = ['G1', 'G2', 'G3', 'M1', 'M2', 'M3', 'LS'];
  const industrialM3 = sortVolumes
    ? industrialKeys.reduce((sum, k) => sum + (sortVolumes[k] ?? 0), 0)
    : 0;
  const firewoodM3 = (auction.apvFirewoodVolume as number | undefined) ?? 0;

  if (industrialM3 === 0 && firewoodM3 === 0) return null;

  return (
    <View style={styles.woodSplitRow}>
      {industrialM3 > 0 && (
        <View style={[styles.woodPill, styles.woodPillIndustrial]}>
          <Text style={[styles.woodPillText, styles.woodPillIndustrialText]}>
            Ind. {Math.round(industrialM3)}m³
          </Text>
        </View>
      )}
      {firewoodM3 > 0 && (
        <View style={[styles.woodPill, styles.woodPillFirewood]}>
          <Text style={[styles.woodPillText, styles.woodPillFirewoodText]}>
            Foc {Math.round(firewoodM3)}m³
          </Text>
        </View>
      )}
    </View>
  );
}

// --- Countdown chip ---
// Replaces the SVG ring on cards. Color tracks remaining-time:
// green > 33%, orange 10-33%, red < 10%.
function CountdownChip({ endTime, startTime }: { endTime: number; startTime: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = endTime - startTime;
  const remaining = Math.max(0, endTime - now);
  const progress = totalDuration > 0 ? remaining / totalDuration : 0;
  const color =
    remaining <= 0
      ? Colors.textMuted
      : progress > 0.33
        ? Colors.success
        : progress > 0.1
          ? Colors.warning
          : Colors.error;

  // Short countdown — strip the seconds for the chip
  const text = formatCountdown(endTime).replace(/ \d+s$/, '');

  return (
    <View
      style={[
        styles.countdownChip,
        {
          borderColor: color + '55',
          backgroundColor: color + '14',
        },
      ]}
    >
      <Ionicons name="time-outline" size={11} color={color} />
      <Text style={[styles.countdownText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

// Memoized so list re-renders don't re-render every card when one auction's
// data changes via WebSocket
export const AuctionCard = memo(AuctionCardImpl, (prev, next) => {
  return (
    prev.auction.id === next.auction.id &&
    prev.auction.currentPricePerM3 === next.auction.currentPricePerM3 &&
    prev.auction.bidCount === next.auction.bidCount &&
    prev.auction.status === next.auction.status &&
    prev.auction.endTime === next.auction.endTime &&
    prev.auction.currentBidderId === next.auction.currentBidderId &&
    prev.isWatchlisted === next.isWatchlisted &&
    prev.isOutbid === next.isOutbid &&
    prev.currentUserId === next.currentUserId &&
    prev.canBid === next.canBid
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cardOutbid: {
    borderColor: 'rgba(239,68,68,0.30)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  location: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  watchlistBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    lineHeight: 18 * 1.2,
    letterSpacing: -0.02 * 18,
  },
  speciesSection: {
    marginTop: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  leadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  leadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
  },
  outbidText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 'auto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  priceBlock: {
    flex: 1,
    minWidth: 0,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 22 * 1.1,
    letterSpacing: -0.03 * 22,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bidButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  bidButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.bg,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  woodSplitRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  woodPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  woodPillIndustrial: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  woodPillFirewood: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  woodPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  woodPillIndustrialText: {
    color: '#22c55e',
  },
  woodPillFirewoodText: {
    color: '#ef4444',
  },
});
