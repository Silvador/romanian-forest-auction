import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getNotifications, markNotificationRead } from '../lib/api';
import type { Notification } from '../types';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => getNotifications(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/** Flat list of all loaded notifications, newest first */
export function useNotificationsList(): Notification[] {
  const { data } = useNotifications();
  return useMemo(
    () => data?.pages.flatMap((p) => p.notifications) ?? [],
    [data]
  );
}

export function useUnreadCount(): number {
  const notifications = useNotificationsList();
  return useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData<any>(['notifications'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((n: Notification) =>
              n.id === id ? { ...n, read: true } : n
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications'], context.previous);
      }
    },
  });
}

export function useMarkAllRead() {
  const notifications = useNotificationsList();
  const markRead = useMarkRead();

  return () => {
    const unread = notifications.filter((n) => !n.read);
    unread.forEach((n) => markRead.mutate(n.id));
  };
}
