import { View, Text, StyleSheet } from 'react-native';
import { StatusColors } from '../constants/colors';
import type { AuctionStatus } from '../types';

const statusLabels: Record<AuctionStatus, string> = {
  active: 'Activa',
  upcoming: 'Viitoare',
  ended: 'Incheiata',
  sold: 'Vanduta',
  draft: 'Ciorna',
};

interface Props {
  status: AuctionStatus;
  /**
   * "filled" (default) — soft tint background.
   * "outline" — transparent background, status-colored border + text.
   *   Used in the Pencil designs for the auction detail header.
   */
  variant?: 'filled' | 'outline';
}

export function StatusBadge({ status, variant = 'filled' }: Props) {
  const colors = StatusColors[status] || StatusColors.ended;

  if (variant === 'outline') {
    return (
      <View
        style={[
          styles.badgeOutline,
          { borderColor: colors.text },
        ]}
      >
        <Text style={[styles.textOutline, { color: colors.text }]}>
          {statusLabels[status]}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {statusLabels[status].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeOutline: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  textOutline: {
    fontSize: 12,
    fontWeight: '700',
  },
});
