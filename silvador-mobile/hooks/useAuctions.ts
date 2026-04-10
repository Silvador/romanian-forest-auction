import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionFeed } from '../lib/api';
import type { Auction, AuctionFilters } from '../types';

export function useAuctions(filters?: AuctionFilters) {
  // Convert filters to API query params
  const params: Record<string, string> = {};
  if (filters?.region) params.region = filters.region;
  if (filters?.species) params.species = filters.species;
  if (filters?.minVolume !== undefined) params.minVolume = String(filters.minVolume);
  if (filters?.maxVolume !== undefined) params.maxVolume = String(filters.maxVolume);
  if (filters?.minPrice !== undefined) params.minPrice = String(filters.minPrice);
  if (filters?.maxPrice !== undefined) params.maxPrice = String(filters.maxPrice);
  if (filters?.sortBy) params.sortBy = filters.sortBy;
  if (filters?.status) params.status = filters.status;

  return useQuery<Auction[]>({
    queryKey: ['auctions', 'feed', params],
    queryFn: () => getAuctionFeed(Object.keys(params).length > 0 ? params : undefined),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAuctionsFeedUpdater() {
  const queryClient = useQueryClient();

  return {
    updateAuctionInCache(auctionId: string, updates: Partial<Auction>) {
      queryClient.setQueriesData<Auction[]>(
        { queryKey: ['auctions', 'feed'] },
        (old) => {
          if (!old) return old;
          return old.map((a) =>
            a.id === auctionId ? { ...a, ...updates } : a
          );
        }
      );
    },

    invalidateFeed() {
      queryClient.invalidateQueries({ queryKey: ['auctions', 'feed'] });
    },
  };
}
