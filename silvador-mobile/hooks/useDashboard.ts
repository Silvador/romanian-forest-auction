import { useQuery } from '@tanstack/react-query';
import {
  getMyListings,
  getPerformanceStats,
  getMyBids,
  getWonAuctions,
} from '../lib/api';
import type { Auction, MyBidEntry, DashboardStats } from '../types';

// --- Forest Owner ---

export function useMyListings() {
  return useQuery<Auction[]>({
    queryKey: ['my-listings'],
    queryFn: getMyListings,
    staleTime: 30 * 1000,
  });
}

export function usePerformanceStats() {
  return useQuery<DashboardStats>({
    queryKey: ['performance-stats'],
    queryFn: getPerformanceStats,
    staleTime: 60 * 1000,
  });
}

// --- Buyer ---

export function useMyBids() {
  return useQuery<MyBidEntry[]>({
    queryKey: ['my-bids'],
    queryFn: getMyBids,
    staleTime: 30 * 1000,
  });
}

export function useWonAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['won-auctions'],
    queryFn: getWonAuctions,
    staleTime: 60 * 1000,
  });
}
