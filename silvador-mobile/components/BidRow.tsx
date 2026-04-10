import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { formatRelative } from '../lib/formatters';
import type { Bid } from '../types';

interface Props {
  bid: Bid;
  rank: number;
  isCurrentUser: boolean;
}

export function BidRow({ bid, rank, isCurrentUser }: Props) {
  const isLeader = rank === 1;
  const initials = bid.bidderAnonymousId.replace('BIDDER-', '').slice(0, 2);

  return (
    <View style={[
      styles.row,
      isLeader && styles.rowLeader,
      isCurrentUser && styles.rowCurrentUser,
    ]}>
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isLeader ? (
          <Ionicons name="trophy" size={16} color="#FFD700" />
        ) : (
          <Text style={styles.rankText}>#{rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[
        styles.avatar,
        isLeader && styles.avatarLeader,
        isCurrentUser && styles.avatarCurrentUser,
      ]}>
        <Text style={[
          styles.avatarText,
          isLeader && styles.avatarTextLeader,
        ]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isCurrentUser && styles.nameHighlight]}>
            {isCurrentUser ? 'Tu' : bid.bidderAnonymousId}
          </Text>
          {bid.isProxyBid && (
            <View style={styles.proxyBadge}>
              <Text style={styles.proxyText}>PROXY</Text>
            </View>
          )}
          {isLeader && (
            <View style={styles.leaderBadge}>
              <Text style={styles.leaderText}>LIDER</Text>
            </View>
          )}
        </View>
        <Text style={styles.timestamp}>{formatRelative(bid.timestamp)}</Text>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, isLeader && styles.amountLeader]}>
          {(bid.amountPerM3 ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.amountUnit}>RON/m³</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    gap: 10,
  },
  rowLeader: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.20)',
  },
  rowCurrentUser: {
    borderColor: Colors.primaryBorder,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLeader: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  avatarCurrentUser: {
    backgroundColor: Colors.primarySoft,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  avatarTextLeader: {
    color: Colors.success,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  nameHighlight: {
    color: Colors.primary,
  },
  proxyBadge: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  proxyText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  leaderBadge: {
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  leaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  amountLeader: {
    color: Colors.success,
  },
  amountUnit: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
