import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBidHistory, placeBid } from '../lib/api';
import type { Bid } from '../types';

export function useBids(auctionId: string) {
  return useQuery<Bid[]>({
    queryKey: ['bids', auctionId],
    queryFn: () => getBidHistory(auctionId),
    staleTime: 10 * 1000,
    enabled: !!auctionId,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeBid,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bids', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions', 'feed'] });
    },
  });
}
