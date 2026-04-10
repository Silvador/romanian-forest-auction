// ===== CLIENT → SERVER EVENTS =====
export interface ClientToServerEvents {
  'watch:auction': (auctionId: string) => void;
  'unwatch:auction': (auctionId: string) => void;
  'watch:feed': () => void;
  'unwatch:feed': () => void;
  'watch:dashboard': () => void;
  'unwatch:dashboard': () => void;
  'watch:notifications': () => void;
  'unwatch:notifications': () => void;
}

// ===== SERVER → CLIENT EVENTS =====
export interface ServerToClientEvents {
  // Auction updates
  'auction:update': (data: AuctionUpdateEvent) => void;
  'auction:ended': (data: AuctionEndedEvent) => void;
  'auction:ending-soon': (data: AuctionEndingSoonEvent) => void;
  'auction:new-bid': (data: NewBidEvent) => void;
  'auction:soft-close': (data: AuctionSoftCloseEvent) => void;

  // Bid events
  'bid:new': (data: BidNewEvent) => void;
  'bid:outbid': (data: OutbidEvent) => void;

  // Notifications
  'notification:new': (data: NotificationEvent) => void;

  // Dashboard
  'dashboard:update': (data: DashboardUpdateEvent) => void;

  // Connection
  'connection:authenticated': () => void;
  'connection:error': (error: string) => void;
  'connection:status': (data: ConnectionStatusEvent) => void;
}

// ===== EVENT DATA TYPES =====

export interface AuctionUpdateEvent {
  auctionId: string;
  currentPricePerM3: number;
  currentBidderAnonymousId: string | null;
  bidCount: number;
  endTime: number;
  projectedTotalValue: number;
  softCloseActive: boolean;
  secondHighestPricePerM3?: number;
}

export interface BidNewEvent {
  auctionId: string;
  currentPricePerM3: number;
  bidCount: number;
  timestamp: number;
}

export interface OutbidEvent {
  auctionId: string;
  auctionTitle: string;
  newPrice: number;
  yourLastBid: number;
  outbidBy: string; // Anonymous bidder ID
}

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  auctionId?: string;
  isRead: boolean;
}

export interface DashboardUpdateEvent {
  type: 'my-bids' | 'my-listings' | 'watchlist' | 'won-auctions' | 'performance-stats';
  timestamp: number;
}

export interface AuctionEndedEvent {
  auctionId: string;
  winnerId: string | null;
  winnerAnonymousId: string | null;
  finalPrice: number;
  totalValue: number;
}

export interface AuctionEndingSoonEvent {
  auctionId: string;
  timeRemaining: number;
  message: string;
}

export interface NewBidEvent {
  auctionId: string;
  currentPrice: number;
  bidderAnonymousId: string;
  timestamp: number;
}

export interface AuctionSoftCloseEvent {
  auctionId: string;
  newEndTime: number;
  extensionMinutes: number;
  message: string;
}

export interface ConnectionStatusEvent {
  connected: boolean;
  timestamp?: number;
}

// ===== SOCKET DATA TYPES =====

export interface SocketUser {
  userId: string;
  email: string;
  role: 'buyer' | 'forest_owner';
  socketId: string;
}
