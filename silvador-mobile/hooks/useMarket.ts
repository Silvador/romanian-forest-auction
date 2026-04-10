import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMarketAnalytics,
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
} from '../lib/api';
import type { MarketAnalytics, PriceAlert } from '../types';

export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

export function useMarketAnalytics(dateRange: DateRange = 'all') {
  return useQuery<MarketAnalytics>({
    queryKey: ['market', 'analytics', dateRange],
    queryFn: () => getMarketAnalytics(dateRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePriceAlerts() {
  return useQuery<PriceAlert[]>({
    queryKey: ['price-alerts'],
    queryFn: getPriceAlerts,
    staleTime: 60 * 1000,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPriceAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-alerts'] }),
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePriceAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['price-alerts'] }),
  });
}
