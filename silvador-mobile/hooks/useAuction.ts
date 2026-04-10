import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuction } from '../lib/api';
import type { Auction } from '../types';

export function useAuction(id: string) {
  return useQuery<Auction>({
    queryKey: ['auction', id],
    queryFn: () => getAuction(id),
    staleTime: 10 * 1000,
    enabled: !!id,
  });
}

export function useAuctionUpdater(id: string) {
  const queryClient = useQueryClient();

  return {
    updateInCache(updates: Partial<Auction>) {
      queryClient.setQueryData<Auction>(['auction', id], (old) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
    },
    invalidate() {
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
    },
  };
}
