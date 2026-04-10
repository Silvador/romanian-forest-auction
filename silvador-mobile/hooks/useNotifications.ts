import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getNotifications, markNotificationRead } from '../lib/api';
import type { Notification } from '../types';

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return useMemo(() => data?.filter((n) => !n.read).length ?? 0, [data]);
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
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
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const markRead = useMarkRead();

  return () => {
    const unread = data?.filter((n) => !n.read) ?? [];
    unread.forEach((n) => markRead.mutate(n.id));
  };
}
