# WebSocket Real-Time Integration - Implementation Plan

## 🎯 Objective
Replace inefficient HTTP polling (every 2-30 seconds) with real-time WebSocket connections using Socket.io to provide instant auction updates, reduce server load by ~90%, and create a more engaging bidding experience.

---

## 📊 Current State Analysis

### Polling Locations & Intervals
| Component | Endpoint | Interval | Impact |
|-----------|----------|----------|--------|
| HomePage | `/api/auctions/feed` | **2 seconds** | 30 req/min per user |
| AuctionDetailPage | `/api/auctions/:id` | 30 seconds | 2 req/min per user |
| AuctionDetailPage | `/api/bids/:id` | 30 seconds | 2 req/min per user |
| NotificationCenter | `/api/notifications` | 30 seconds | 2 req/min per user |
| BuyerDashboard | Multiple endpoints | 30 seconds each | 6 req/min per user |
| ForestOwnerDashboard | Multiple endpoints | 30 seconds each | 4 req/min per user |

**Total:** ~46 HTTP requests per minute per active user
**With 100 users:** ~4,600 requests/min (~77 req/sec)

### After WebSocket Implementation
- **Connection overhead:** 1 persistent connection per user
- **Event-driven updates:** Only when data changes
- **Expected reduction:** 90%+ fewer requests
- **Latency improvement:** Sub-second updates vs 2-30 second delays

---

## 🏗️ Architecture Overview

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Client    │◄──────────────────────────►│    Server    │
│             │       Socket.io            │              │
│ - React App │                            │ - Express    │
│ - Socket.io │                            │ - Socket.io  │
│   Client    │                            │   Server     │
└─────────────┘                            └──────────────┘
      │                                            │
      │ Events:                                    │ Events:
      │ - auction:update                           │ - connection
      │ - bid:new                                  │ - watch:auction
      │ - bid:outbid                               │ - watch:feed
      │ - notification:new                         │ - watch:dashboard
      │ - auction:ending-soon                      │ - authenticate
      │ - connection:status                        │
      └────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### **Phase 1: Setup Socket.io Infrastructure**

#### 1.1 Install Dependencies
```bash
# Server
cd server
npm install socket.io @types/socket.io

# Client
cd ../client
npm install socket.io-client
```

#### 1.2 Files to Create/Modify
- `server/websocket.ts` - WebSocket server setup
- `server/types/websocket.ts` - WebSocket event types
- `client/src/lib/websocket.ts` - WebSocket client manager
- `shared/websocket-events.ts` - Shared event type definitions

---

### **Phase 2: Backend WebSocket Server Implementation**

#### 2.1 Create WebSocket Server (`server/websocket.ts`)

```typescript
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { verifyFirebaseToken } from './auth';

export interface SocketUser {
  userId: number;
  email: string;
  role: 'buyer' | 'forest_owner';
  socketId: string;
}

// Track user connections and their rooms
const userSockets = new Map<number, Set<string>>(); // userId -> socketIds
const socketUsers = new Map<string, SocketUser>(); // socketId -> user

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decodedToken = await verifyFirebaseToken(token);
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, decodedToken.uid),
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        socketId: socket.id,
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`✓ User ${user.userId} connected (${socket.id})`);

    // Track connection
    if (!userSockets.has(user.userId)) {
      userSockets.set(user.userId, new Set());
    }
    userSockets.get(user.userId)!.add(socket.id);
    socketUsers.set(socket.id, user);

    // Join user-specific room
    socket.join(`user:${user.userId}`);

    // ===== AUCTION WATCHING =====
    socket.on('watch:auction', (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
      console.log(`User ${user.userId} watching auction ${auctionId}`);
    });

    socket.on('unwatch:auction', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
      console.log(`User ${user.userId} unwatching auction ${auctionId}`);
    });

    // ===== FEED WATCHING =====
    socket.on('watch:feed', () => {
      socket.join('feed:global');
      console.log(`User ${user.userId} watching feed`);
    });

    socket.on('unwatch:feed', () => {
      socket.leave('feed:global');
    });

    // ===== DASHBOARD WATCHING =====
    socket.on('watch:dashboard', () => {
      socket.join(`dashboard:${user.userId}`);
      console.log(`User ${user.userId} watching dashboard`);
    });

    socket.on('unwatch:dashboard', () => {
      socket.leave(`dashboard:${user.userId}`);
    });

    // ===== NOTIFICATIONS =====
    socket.on('watch:notifications', () => {
      socket.join(`notifications:${user.userId}`);
      console.log(`User ${user.userId} watching notifications`);
    });

    // ===== DISCONNECTION =====
    socket.on('disconnect', () => {
      console.log(`✗ User ${user.userId} disconnected (${socket.id})`);

      const sockets = userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.userId);
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!global.io) {
    throw new Error('Socket.io not initialized');
  }
  return global.io;
}

// Export for use in routes
declare global {
  var io: SocketIOServer | undefined;
}
```

#### 2.2 Integrate WebSocket with Express (`server/index.ts`)

```typescript
import { createServer } from 'http';
import express from 'express';
import { initializeWebSocket } from './websocket';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(httpServer);
global.io = io;

// ... rest of Express setup

// Change from app.listen to httpServer.listen
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 2.3 Emit Events from Bid Endpoint (`server/routes.ts`)

```typescript
// After successful bid placement (line ~400)
app.post("/api/bids", async (req, res) => {
  // ... existing bid processing logic

  const bidResult = await processProxyBid(/* ... */);

  // ✨ NEW: Emit real-time events
  const io = getIO();

  // 1. Update all viewers of this auction
  io.to(`auction:${auctionId}`).emit('auction:update', {
    auctionId,
    currentPricePerM3: bidResult.currentPricePerM3,
    currentBidderAnonymousId: bidResult.currentBidderAnonymousId,
    bidCount: bidResult.bidCount,
    endTime: auction.endTime, // May be extended due to soft-close
    projectedTotalValue: bidResult.projectedTotalValue,
    softCloseActive: softCloseCheck.inSoftCloseWindow,
  });

  // 2. Notify new bid to feed watchers
  io.to('feed:global').emit('bid:new', {
    auctionId,
    currentPricePerM3: bidResult.currentPricePerM3,
    bidCount: bidResult.bidCount,
  });

  // 3. Notify outbid user
  if (previousBidderId) {
    io.to(`user:${previousBidderId}`).emit('bid:outbid', {
      auctionId,
      auctionTitle: auction.location,
      newPrice: bidResult.currentPricePerM3,
      yourLastBid: previousPrice,
    });
  }

  // 4. Notify auction owner
  io.to(`user:${auction.ownerId}`).emit('auction:new-bid', {
    auctionId,
    currentPrice: bidResult.currentPricePerM3,
    bidderAnonymousId: bidResult.currentBidderAnonymousId,
  });

  // 5. Update dashboards for affected users
  io.to(`dashboard:${userId}`).emit('dashboard:update', { type: 'my-bids' });
  if (previousBidderId) {
    io.to(`dashboard:${previousBidderId}`).emit('dashboard:update', { type: 'my-bids' });
  }

  res.json({ success: true, bid: bidResult });
});
```

#### 2.4 Emit Events from Auction Lifecycle Manager

```typescript
// server/services/auctionLifecycleManager.ts

import { getIO } from '../websocket';

export async function processAuctionTransitions() {
  const io = getIO();

  // When auction ends
  if (auction.status === 'ended') {
    io.to(`auction:${auction.id}`).emit('auction:ended', {
      auctionId: auction.id,
      winnerId: auction.currentBidderId,
      finalPrice: auction.currentPricePerM3,
    });

    // Notify winner
    if (auction.currentBidderId) {
      io.to(`user:${auction.currentBidderId}`).emit('auction:won', {
        auctionId: auction.id,
        auctionTitle: auction.location,
        finalPrice: auction.currentPricePerM3,
      });
    }
  }

  // When auction is ending soon (< 5 minutes)
  if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 4.5 * 60 * 1000) {
    io.to(`auction:${auction.id}`).emit('auction:ending-soon', {
      auctionId: auction.id,
      timeRemaining,
    });
  }
}
```

---

### **Phase 3: Shared WebSocket Event Types**

#### 3.1 Create Event Type Definitions (`shared/websocket-events.ts`)

```typescript
// ===== CLIENT → SERVER EVENTS =====
export interface ClientToServerEvents {
  'watch:auction': (auctionId: string) => void;
  'unwatch:auction': (auctionId: string) => void;
  'watch:feed': () => void;
  'unwatch:feed': () => void;
  'watch:dashboard': () => void;
  'unwatch:dashboard': () => void;
  'watch:notifications': () => void;
  'authenticate': (token: string) => void;
}

// ===== SERVER → CLIENT EVENTS =====
export interface ServerToClientEvents {
  // Auction updates
  'auction:update': (data: AuctionUpdateEvent) => void;
  'auction:ended': (data: AuctionEndedEvent) => void;
  'auction:ending-soon': (data: AuctionEndingSoonEvent) => void;
  'auction:new-bid': (data: NewBidEvent) => void;

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
}

// ===== EVENT DATA TYPES =====
export interface AuctionUpdateEvent {
  auctionId: string;
  currentPricePerM3: number;
  currentBidderAnonymousId: string;
  bidCount: number;
  endTime: number;
  projectedTotalValue: number;
  softCloseActive: boolean;
}

export interface BidNewEvent {
  auctionId: string;
  currentPricePerM3: number;
  bidCount: number;
}

export interface OutbidEvent {
  auctionId: string;
  auctionTitle: string;
  newPrice: number;
  yourLastBid: number;
}

export interface NotificationEvent {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: number;
}

export interface DashboardUpdateEvent {
  type: 'my-bids' | 'my-listings' | 'watchlist' | 'won-auctions';
}

export interface AuctionEndedEvent {
  auctionId: string;
  winnerId: number | null;
  finalPrice: number;
}

export interface AuctionEndingSoonEvent {
  auctionId: string;
  timeRemaining: number;
}

export interface NewBidEvent {
  auctionId: string;
  currentPrice: number;
  bidderAnonymousId: string;
}
```

---

### **Phase 4: Frontend WebSocket Client Manager**

#### 4.1 Create WebSocket Manager (`client/src/lib/websocket.ts`)

```typescript
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/websocket-events';
import { auth } from './firebase';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class WebSocketManager {
  private socket: TypedSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners = new Map<string, Set<Function>>();

  async connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

    this.socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    }) as TypedSocket;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ WebSocket disconnected:', reason);
      this.emit('connection:status', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection:error', { error: 'Failed to connect' });
      }
    });

    // Forward all server events to registered listeners
    this.socket.onAny((eventName, ...args) => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.forEach(callback => callback(...args));
      }
    });
  }

  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as Function);

    // Return cleanup function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback as Function);
      }
    };
  }

  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) {
    if (!this.socket?.connected) {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
      return;
    }
    this.socket.emit(event, ...args);
  }

  // Room management
  watchAuction(auctionId: string) {
    this.emit('watch:auction', auctionId);
  }

  unwatchAuction(auctionId: string) {
    this.emit('unwatch:auction', auctionId);
  }

  watchFeed() {
    this.emit('watch:feed');
  }

  unwatchFeed() {
    this.emit('unwatch:feed');
  }

  watchDashboard() {
    this.emit('watch:dashboard');
  }

  watchNotifications() {
    this.emit('watch:notifications');
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.eventListeners.clear();
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsManager = new WebSocketManager();

// Auto-connect when user is authenticated
auth.onAuthStateChanged((user) => {
  if (user) {
    wsManager.connect();
  } else {
    wsManager.disconnect();
  }
});
```

#### 4.2 Create React Hook (`client/src/hooks/useWebSocket.ts`)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { wsManager } from '@/lib/websocket';
import type { ServerToClientEvents } from '@/shared/websocket-events';

export function useWebSocket() {
  const [connected, setConnected] = useState(wsManager.connected);

  useEffect(() => {
    const unsubscribe = wsManager.on('connection:status', ({ connected }) => {
      setConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    connected,
    on: wsManager.on.bind(wsManager),
    emit: wsManager.emit.bind(wsManager),
    watchAuction: wsManager.watchAuction.bind(wsManager),
    unwatchAuction: wsManager.unwatchAuction.bind(wsManager),
    watchFeed: wsManager.watchFeed.bind(wsManager),
    unwatchFeed: wsManager.unwatchFeed.bind(wsManager),
  };
}

// Specialized hook for auction updates
export function useAuctionUpdates(auctionId: string | undefined) {
  const { watchAuction, unwatchAuction, on } = useWebSocket();

  useEffect(() => {
    if (!auctionId) return;

    watchAuction(auctionId);

    return () => {
      unwatchAuction(auctionId);
    };
  }, [auctionId, watchAuction, unwatchAuction]);

  const onAuctionUpdate = useCallback(
    (callback: ServerToClientEvents['auction:update']) => {
      return on('auction:update', (data) => {
        if (data.auctionId === auctionId) {
          callback(data);
        }
      });
    },
    [auctionId, on]
  );

  return { onAuctionUpdate };
}
```

---

### **Phase 5: Replace Auction Detail Polling**

#### 5.1 Update AuctionDetailPage (`client/src/pages/AuctionDetailPage.tsx`)

```typescript
import { useAuctionUpdates } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { onAuctionUpdate } = useAuctionUpdates(id);

  // Remove refetchInterval, keep initial fetch only
  const { data: auction } = useQuery({
    queryKey: [`/api/auctions/${id}`],
    enabled: !!id,
    // ❌ REMOVE: refetchInterval: 30000,
  });

  const { data: bids } = useQuery({
    queryKey: [`/api/bids/${id}`],
    enabled: !!id,
    // ❌ REMOVE: refetchInterval: 30000,
  });

  // ✨ NEW: Listen for real-time updates
  useEffect(() => {
    const cleanup = onAuctionUpdate((data) => {
      // Update auction cache
      queryClient.setQueryData([`/api/auctions/${id}`], (old: any) => ({
        ...old,
        currentPricePerM3: data.currentPricePerM3,
        currentBidderAnonymousId: data.currentBidderAnonymousId,
        bidCount: data.bidCount,
        endTime: data.endTime,
        projectedTotalValue: data.projectedTotalValue,
        softCloseActive: data.softCloseActive,
      }));

      // Refetch bids to show new bid in history
      queryClient.invalidateQueries({ queryKey: [`/api/bids/${id}`] });

      // Trigger flash animation
      setShowPriceFlash(true);
      setTimeout(() => setShowPriceFlash(false), 700);
    });

    return cleanup;
  }, [id, onAuctionUpdate, queryClient]);

  // ... rest of component
}
```

---

### **Phase 6: Replace Home Page Feed Polling**

```typescript
// client/src/pages/HomePage.tsx

export default function HomePage() {
  const { watchFeed, unwatchFeed, on } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: auctions } = useQuery({
    queryKey: ['/api/auctions/feed'],
    // ❌ REMOVE: refetchInterval: 2000,
  });

  useEffect(() => {
    watchFeed();

    const cleanup = on('bid:new', (data) => {
      // Update specific auction in feed
      queryClient.setQueryData(['/api/auctions/feed'], (old: any[]) => {
        return old?.map(auction =>
          auction.id === data.auctionId
            ? {
                ...auction,
                currentPricePerM3: data.currentPricePerM3,
                bidCount: data.bidCount,
              }
            : auction
        );
      });
    });

    return () => {
      unwatchFeed();
      cleanup();
    };
  }, [watchFeed, unwatchFeed, on, queryClient]);
}
```

---

### **Phase 7: Replace Notification Polling**

```typescript
// client/src/components/NotificationCenter.tsx

export default function NotificationCenter() {
  const { watchNotifications, on } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    // ❌ REMOVE: refetchInterval: 30000,
  });

  useEffect(() => {
    watchNotifications();

    const cleanup = on('notification:new', (notification) => {
      // Add new notification to cache
      queryClient.setQueryData(['/api/notifications'], (old: any[]) => {
        return [notification, ...(old || [])];
      });

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
      });
    });

    return cleanup;
  }, [watchNotifications, on, queryClient]);
}
```

---

### **Phase 8: Replace Dashboard Polling**

```typescript
// client/src/components/dashboard/BuyerDashboard.tsx

export default function BuyerDashboard() {
  const { watchDashboard, on } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: myBids } = useQuery({
    queryKey: ['/api/bids/my-bids'],
    // ❌ REMOVE: refetchInterval: 30000,
  });

  useEffect(() => {
    watchDashboard();

    const cleanup = on('dashboard:update', ({ type }) => {
      if (type === 'my-bids') {
        queryClient.invalidateQueries({ queryKey: ['/api/bids/my-bids'] });
      }
      // Handle other dashboard update types
    });

    return cleanup;
  }, [watchDashboard, on, queryClient]);

  // Listen for outbid events
  useEffect(() => {
    const cleanup = on('bid:outbid', (data) => {
      toast({
        title: "You've been outbid!",
        description: `${data.auctionTitle} - New bid: ${data.newPrice} RON/m³`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bids/my-bids'] });
    });

    return cleanup;
  }, [on, queryClient]);
}
```

---

### **Phase 9: Add Connection Status & Live Indicators**

#### 9.1 Connection Status Indicator

```typescript
// client/src/components/ConnectionStatus.tsx

import { useWebSocket } from '@/hooks/useWebSocket';

export function ConnectionStatus() {
  const { connected } = useWebSocket();

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>LIVE</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-yellow-600">
      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
      <span>Connecting...</span>
    </div>
  );
}
```

#### 9.2 Live Price Update Animation

```typescript
// Add to AuctionCard and AuctionDetailPage

const [showPriceFlash, setShowPriceFlash] = useState(false);

// In WebSocket update handler:
setShowPriceFlash(true);
setTimeout(() => setShowPriceFlash(false), 700);

// In JSX:
<div className={showPriceFlash ? 'animate-price-flash' : ''}>
  {currentPricePerM3} RON/m³
</div>

// In tailwind.config.ts:
animation: {
  'price-flash': 'flash 0.7s ease-in-out',
},
keyframes: {
  flash: {
    '0%, 100%': { backgroundColor: 'transparent' },
    '50%': { backgroundColor: 'rgb(34 197 94 / 0.2)' },
  },
},
```

---

### **Phase 10: Reconnection Logic & Error Handling**

#### 10.1 Automatic Reconnection

```typescript
// Already built into Socket.io client config in websocket.ts
reconnection: true,
reconnectionDelay: 1000,
reconnectionDelayMax: 5000,
reconnectionAttempts: 5,
```

#### 10.2 Handle Connection Errors

```typescript
// client/src/lib/websocket.ts

this.socket.on('connect_error', (error) => {
  console.error('WebSocket error:', error.message);

  if (error.message === 'Authentication required') {
    // Re-authenticate
    auth.currentUser?.getIdToken(true).then(token => {
      this.socket!.auth = { token };
      this.socket!.connect();
    });
  }
});
```

#### 10.3 Fallback to Polling on Failure

```typescript
// client/src/hooks/useAuctionData.ts

export function useAuctionData(auctionId: string) {
  const { connected } = useWebSocket();

  const { data: auction } = useQuery({
    queryKey: [`/api/auctions/${auctionId}`],
    // Fallback to polling if WebSocket disconnected
    refetchInterval: connected ? false : 30000,
  });

  return { auction };
}
```

---

### **Phase 11: WebSocket Authentication & Security**

#### 11.1 Token Refresh

```typescript
// client/src/lib/websocket.ts

async refreshAuth() {
  const token = await auth.currentUser?.getIdToken(true);
  if (token && this.socket) {
    this.socket.auth = { token };
    this.socket.disconnect().connect();
  }
}

// Refresh token every 50 minutes (Firebase tokens expire after 1 hour)
setInterval(() => {
  if (this.socket?.connected) {
    this.refreshAuth();
  }
}, 50 * 60 * 1000);
```

#### 11.2 Server-Side Room Authorization

```typescript
// server/websocket.ts

socket.on('watch:auction', async (auctionId) => {
  const auction = await db.query.auctions.findFirst({
    where: eq(auctions.id, parseInt(auctionId)),
  });

  if (!auction) {
    socket.emit('connection:error', 'Auction not found');
    return;
  }

  // Only allow watching published auctions or owner's own auctions
  if (auction.status !== 'active' && auction.ownerId !== user.userId) {
    socket.emit('connection:error', 'Unauthorized');
    return;
  }

  socket.join(`auction:${auctionId}`);
});
```

---

### **Phase 12: Testing & Optimization**

#### 12.1 Load Testing

```bash
# Install artillery
npm install -g artillery

# Create load test config (artillery-config.yml)
config:
  target: 'ws://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 users per second
scenarios:
  - engine: socketio
    flow:
      - emit:
          channel: 'watch:auction'
          data: '1'
      - think: 30  # Wait 30 seconds
      - emit:
          channel: 'watch:feed'

# Run test
artillery run artillery-config.yml
```

#### 12.2 Monitor WebSocket Metrics

```typescript
// server/websocket.ts

io.on('connection', (socket) => {
  console.log(`Total connections: ${io.sockets.sockets.size}`);

  socket.onAny((event) => {
    console.log(`[METRIC] Event: ${event}, Room count: ${socket.rooms.size}`);
  });
});

// Add monitoring endpoint
app.get('/api/metrics/websocket', (req, res) => {
  const io = getIO();
  res.json({
    totalConnections: io.sockets.sockets.size,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
  });
});
```

#### 12.3 Memory Leak Prevention

```typescript
// Limit room memberships per socket
socket.on('watch:auction', (auctionId) => {
  if (socket.rooms.size > 10) {
    socket.emit('connection:error', 'Too many rooms');
    return;
  }
  socket.join(`auction:${auctionId}`);
});

// Clean up on disconnect
socket.on('disconnect', () => {
  socket.rooms.clear();
});
```

---

## 🎯 Expected Improvements

### Performance Metrics
| Metric | Before (Polling) | After (WebSocket) | Improvement |
|--------|------------------|-------------------|-------------|
| Server requests/min (per user) | ~46 | ~0.1 | **99.8% reduction** |
| Update latency | 2-30 seconds | <100ms | **200x faster** |
| Server CPU usage (100 users) | High (constant polling) | Low (event-driven) | **~90% reduction** |
| Network bandwidth | High (repeated payloads) | Minimal (events only) | **~95% reduction** |

### User Experience
- ✅ Instant bid updates (no refresh lag)
- ✅ Real-time "LIVE" indicator
- ✅ Outbid notifications in real-time
- ✅ Animated price changes
- ✅ Synchronized countdown timers
- ✅ Enhanced urgency during soft-close

---

## 📦 Deployment Checklist

- [ ] Install Socket.io dependencies
- [ ] Configure CORS for WebSocket connections
- [ ] Set up environment variables (`CLIENT_URL`)
- [ ] Test WebSocket on staging environment
- [ ] Monitor connection stability
- [ ] Add fallback polling for older browsers
- [ ] Document WebSocket events in API docs
- [ ] Train team on WebSocket debugging tools
- [ ] Set up monitoring/alerting for connection drops
- [ ] Load test with expected user volume

---

## 🔧 Debugging Tools

```typescript
// Client-side debugging
window.wsManager = wsManager; // Expose to console
console.log(wsManager.connected);
console.log(wsManager.socket?.rooms);

// Server-side debugging
io.on('connection', (socket) => {
  console.log('Rooms:', socket.rooms);
  console.log('User:', socket.data.user);
});
```

---

## 📚 Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io React Hook](https://socket.io/how-to/use-with-react-hooks)
- [WebSocket Security Best Practices](https://socket.io/docs/v4/security/)

---

**Created:** 2026-01-11
**Status:** Planning Phase
**Priority:** High
**Estimated Timeline:** 2-3 weeks
