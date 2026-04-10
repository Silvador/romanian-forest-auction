import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/api';
import type { Auction } from '../types';

const QUERY_KEY = ['watchlist'] as const;

export function useWatchlist() {
  return useQuery<Auction[]>({
    queryKey: QUERY_KEY,
    queryFn: getWatchlist,
    staleTime: 60 * 1000,
  });
}

export function useWatchlistIds() {
  const { data } = useWatchlist();
  return new Set(data?.map((a) => a.id) || []);
}

/**
 * Toggle watchlist with optimistic updates so the heart flips instantly.
 * On error, the optimistic change is rolled back.
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: addToWatchlist,
    onMutate: async (auctionId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Auction[]>(QUERY_KEY) ?? [];

      // Build a stub auction so the heart flips immediately even before
      // the next refetch. We grab the real auction from another query
      // cache if it's already loaded.
      const cached =
        queryClient.getQueryData<Auction>(['auction', auctionId]) ??
        ({ id: auctionId } as Auction);

      queryClient.setQueryData<Auction[]>(QUERY_KEY, [...previous, cached]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWatchlist,
    onMutate: async (auctionId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Auction[]>(QUERY_KEY) ?? [];
      queryClient.setQueryData<Auction[]>(
        QUERY_KEY,
        previous.filter((a) => a.id !== auctionId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return (auctionId: string) => {
    // Read current state directly from cache so we don't depend on
    // a captured-at-render-time set.
    const current = queryClient.getQueryData<Auction[]>(QUERY_KEY) ?? [];
    const isWatched = current.some((a) => a.id === auctionId);

    if (isWatched) {
      removeMutation.mutate(auctionId);
    } else {
      addMutation.mutate(auctionId);
    }
  };
}
