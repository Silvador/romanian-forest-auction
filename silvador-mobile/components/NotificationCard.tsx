import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { formatRelative } from '../lib/formatters';
import { getNotificationCopy } from '../lib/notificationMessages';
import type { Notification, NotificationType } from '../types';

interface Props {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

interface IconStyle {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const iconStyles: Record<NotificationType, IconStyle> = {
  outbid:         { icon: 'arrow-down-circle', color: Colors.error },
  won:            { icon: 'trophy',            color: Colors.success },
  sold:           { icon: 'cash',              color: Colors.success },
  new_bid:        { icon: 'cash',              color: Colors.primary },
  auction_ending: { icon: 'time',              color: Colors.warning },
};

export function NotificationCard({ notification, onPress }: Props) {
  const style = iconStyles[notification.type] || iconStyles.new_bid;
  const copy = getNotificationCopy(notification.type);
  const isUnread = !notification.read;

  return (
    <Pressable
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={() => onPress(notification)}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: style.color + '22' }]}>
        <Ionicons name={style.icon} size={20} color={style.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, isUnread && styles.titleUnread]}>
          {copy.title}
        </Text>
        <Text style={styles.message} numberOfLines={3}>
          {copy.message}
        </Text>
        <Text style={styles.timestamp}>{formatRelative(notification.timestamp)}</Text>
      </View>

      {/* Unread dot — top right */}
      {isUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  titleUnread: {
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
