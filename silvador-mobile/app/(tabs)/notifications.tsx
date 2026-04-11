import { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { NotificationCard } from '../../components/NotificationCard';
import { useNotifications, useNotificationsList, useMarkRead, useUnreadCount, useMarkAllRead } from '../../hooks/useNotifications';
import { useWebSocketRoom, useWebSocketEvent } from '../../hooks/useWebSocket';
import { useToast } from '../../components/Toast';
import { clearNotifications, setBadgeCount } from '../../lib/pushNotifications';
import { getNotificationCopy } from '../../lib/notificationMessages';
import type { Notification } from '../../types';

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

function isYesterday(ts: number): boolean {
  const d = new Date(ts);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
}

function groupByDate(notifications: Notification[]) {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    if (isToday(n.timestamp)) today.push(n);
    else if (isYesterday(n.timestamp)) yesterday.push(n);
    else older.push(n);
  }

  const sections = [];
  if (today.length > 0) sections.push({ title: 'ASTAZI', data: today });
  if (yesterday.length > 0) sections.push({ title: 'IERI', data: yesterday });
  if (older.length > 0) sections.push({ title: 'MAI VECHI', data: older });
  return sections;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useNotifications();
  const notifications = useNotificationsList();
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const toast = useToast();

  useWebSocketRoom('watch:notifications');

  useWebSocketEvent<Notification>(
    'notification:new',
    useCallback(
      (notification) => {
        // Prepend to the first page of the infinite query cache
        queryClient.setQueryData<any>(['notifications'], (old: any) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              { ...firstPage, notifications: [notification, ...(firstPage?.notifications ?? [])] },
              ...old.pages.slice(1),
            ],
          };
        });
        const fallback = getNotificationCopy(notification.type);
        toast.show({
          type: notification.type === 'outbid' ? 'error' : notification.type === 'won' ? 'success' : 'info',
          title: notification.title || fallback.title,
          message: notification.message || fallback.message,
          auctionId: notification.auctionId,
        });
      },
      [queryClient, toast]
    )
  );

  useEffect(() => { clearNotifications(); }, []);
  useEffect(() => { setBadgeCount(unreadCount); }, [unreadCount]);

  const sections = useMemo(() => groupByDate(notifications), [notifications]);

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.auctionId) router.push(`/auction/${notification.auctionId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notificari</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAllText}>Marcheaza toate</Text>
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard notification={item} onPress={handleNotificationPress} />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
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
          isLoading ? null : (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Nicio notificare</Text>
              <Text style={styles.emptySubtitle}>
                Vei primi alerte despre licitatii si oferte aici
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasNextPage ? (
            <Pressable style={styles.loadMore} onPress={() => fetchNextPage()}>
              <Text style={styles.loadMoreText}>Incarca mai multe</Text>
            </Pressable>
          ) : null
        }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.05 * 32,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
