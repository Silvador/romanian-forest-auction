import { auth } from './firebase';
import { API_BASE_URL as BASE_URL } from './config';
import type { Auction, Bid, MyBidEntry, User, Notification, DashboardStats, PriceAlert, WatchlistPreset, MarketAnalytics } from '../types';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const json = JSON.parse(body);
      if (Array.isArray(json)) {
        message = json.map((e: any) => e.message || e.msg || JSON.stringify(e)).filter(Boolean).join('. ') || body;
      } else {
        message = json.message || json.error || json.detail || body;
      }
    } catch {
      message = body;
    }
    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

// --- Auctions ---

export function getAuctionFeed(params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<Auction[]>(`/api/auctions/feed${query}`);
}

export function getAuction(id: string) {
  return request<Auction>(`/api/auctions/${id}`);
}

export function getMyListings() {
  return request<Auction[]>('/api/auctions/my-listings');
}

export function getPerformanceStats() {
  return request<DashboardStats>('/api/auctions/performance-stats');
}

export function getWonAuctions() {
  return request<Auction[]>('/api/auctions/won');
}

export function createDraftAuction(data: Partial<Auction>) {
  return request<Auction>('/api/auctions/draft', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function publishAuction(data: Record<string, unknown>) {
  return request<Auction>('/api/auctions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAuction(id: string, data: Partial<Auction>) {
  return request<Auction>(`/api/auctions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// --- Bids ---

export function placeBid(data: { auctionId: string; amountPerM3: number; maxProxyPerM3: number }) {
  return request<Bid>('/api/bids', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getBidHistory(auctionId: string) {
  return request<Bid[]>(`/api/bids/${auctionId}`);
}

export function getMyBids() {
  return request<MyBidEntry[]>('/api/bids/my-bids');
}

// --- Watchlist ---

export function getWatchlist() {
  return request<Auction[]>('/api/watchlist');
}

export function addToWatchlist(auctionId: string) {
  return request<void>('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ auctionId }),
  });
}

export function removeFromWatchlist(auctionId: string) {
  return request<void>(`/api/watchlist/${auctionId}`, {
    method: 'DELETE',
  });
}

// --- Notifications ---

export async function getNotifications(cursor?: string): Promise<{ notifications: Notification[]; nextCursor: string | null }> {
  const query = cursor ? `?cursor=${cursor}` : '';
  return request<{ notifications: Notification[]; nextCursor: string | null }>(`/api/notifications${query}`);
}

export function markNotificationRead(id: string) {
  return request<void>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

// --- Market ---

export function getMarketAnalytics(dateRange?: string) {
  const query = dateRange ? `?dateRange=${dateRange}` : '';
  return request<MarketAnalytics>(`/api/market/analytics${query}`);
}

export function getPriceAlerts() {
  return request<PriceAlert[]>('/api/market/alerts');
}

export function createPriceAlert(data: Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>) {
  return request<PriceAlert>('/api/market/alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deletePriceAlert(id: string) {
  return request<void>(`/api/market/alerts/${id}`, {
    method: 'DELETE',
  });
}

export function getWatchlistPresets() {
  return request<WatchlistPreset[]>('/api/market/watchlist/presets');
}

export function createWatchlistPreset(data: { name: string; filters: WatchlistPreset['filters'] }) {
  return request<WatchlistPreset>('/api/market/watchlist/presets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Users ---

export function registerUser(data: { email: string; password: string; role: string; displayName: string }) {
  return request<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getCurrentUser() {
  return request<User>('/api/user/me');
}

export function registerPushToken(token: string) {
  return request<void>('/api/users/push-token', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// --- OCR ---

export function extractApv(fileBase64: string, mimeType: string = 'image/jpeg') {
  const isPdf = mimeType === 'application/pdf';
  return request<Record<string, unknown>>('/api/ocr/extract-apv', {
    method: 'POST',
    body: JSON.stringify(isPdf ? { pdfBase64: fileBase64 } : { imageBase64: fileBase64 }),
  });
}

export function checkPermitExists(permitNumber: string) {
  return request<{ exists: boolean; auctionId: string | null }>(
    `/api/auctions/check-permit/${encodeURIComponent(permitNumber)}`
  );
}

// --- APV Geolocation ---

export interface ApvLocationResult {
  locationResolutionStatus: string;
  notFoundSubtype: string | null;
  matchScore: number;
  operationalStatus: string;
  listingEligibility: string;
  eligibilityReasons: string[];
  publicApvPoint: { lat: number; lng: number } | null;
  primaryRampPoints: Array<{ lat: number; lng: number }> | null;
  county: string | null;
  geolocationDocId: string | null;
  cached?: boolean;
}

export function resolveApvLocation(auctionId: string, ocrConfidence?: string) {
  return request<ApvLocationResult>(`/api/auctions/${auctionId}/resolve-apv-location`, {
    method: 'POST',
    body: JSON.stringify(ocrConfidence ? { ocrConfidence } : {}),
  });
}

export function setSellerPin(auctionId: string, lat: number, lng: number) {
  return request<{ success: boolean; sellerDisplayPin: { lat: number; lng: number }; displayLocationSource: string }>(
    `/api/auctions/${auctionId}/seller-pin`,
    {
      method: 'PUT',
      body: JSON.stringify({ lat, lng }),
    }
  );
}

export function attestApvRights(auctionId: string) {
  return request<{ success: boolean }>(`/api/auctions/${auctionId}/attest-apv-rights`, {
    method: 'POST',
  });
}
