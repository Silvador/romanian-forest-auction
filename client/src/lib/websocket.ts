import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/websocket-events';
import { auth } from './firebase';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class WebSocketManager {
  private socket: TypedSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners = new Map<string, Set<Function>>();
  private connectionStatusListeners = new Set<Function>();

  async connect() {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      console.error('[WebSocket] No authentication token available');
      return;
    }

    const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;

    console.log('[WebSocket] Connecting to:', serverUrl);

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
      console.log('✓ [WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ [WebSocket] Disconnected:', reason);
      this.notifyConnectionStatus(false);
    });

    this.socket.on('connect_error', async (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.reconnectAttempts++;

      // If authentication error, try refreshing token
      if (error.message.includes('Authentication') || error.message.includes('Invalid token')) {
        try {
          const token = await auth.currentUser?.getIdToken(true);
          if (token && this.socket) {
            this.socket.auth = { token };
          }
        } catch (refreshError) {
          console.error('[WebSocket] Failed to refresh token:', refreshError);
        }
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached');
        this.notifyConnectionStatus(false);
      }
    });

    this.socket.on('connection:authenticated', () => {
      console.log('[WebSocket] Authentication successful');
    });

    this.socket.on('connection:error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    // Forward all server events to registered listeners
    this.socket.onAny((eventName, ...args) => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error(`[WebSocket] Error in listener for ${eventName}:`, error);
          }
        });
      }
    });
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionStatusListeners.forEach(callback => {
      try {
        callback({ connected, timestamp: Date.now() });
      } catch (error) {
        console.error('[WebSocket] Error in connection status listener:', error);
      }
    });
  }

  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): () => void {
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

  onConnectionStatus(callback: (status: { connected: boolean; timestamp: number }) => void): () => void {
    this.connectionStatusListeners.add(callback);

    // Return cleanup function
    return () => {
      this.connectionStatusListeners.delete(callback);
    };
  }

  emit<E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ): void {
    if (!this.socket?.connected) {
      console.warn(`[WebSocket] Cannot emit ${event}: not connected`);
      return;
    }
    this.socket.emit(event, ...args as any);
  }

  // ===== ROOM MANAGEMENT =====

  watchAuction(auctionId: string | number) {
    this.emit('watch:auction', String(auctionId));
  }

  unwatchAuction(auctionId: string | number) {
    this.emit('unwatch:auction', String(auctionId));
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

  unwatchDashboard() {
    this.emit('unwatch:dashboard');
  }

  watchNotifications() {
    this.emit('watch:notifications');
  }

  unwatchNotifications() {
    this.emit('unwatch:notifications');
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
    this.connectionStatusListeners.clear();
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Auto-refresh token every 50 minutes (Firebase tokens expire after 1 hour)
  private startTokenRefresh() {
    setInterval(async () => {
      if (this.socket?.connected && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(true);
          if (this.socket) {
            this.socket.auth = { token };
            console.log('[WebSocket] Token refreshed');
          }
        } catch (error) {
          console.error('[WebSocket] Failed to refresh token:', error);
        }
      }
    }, 50 * 60 * 1000); // 50 minutes
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();

// Auto-connect when user is authenticated
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log('[WebSocket] User authenticated, connecting...');
    await wsManager.connect();
    (wsManager as any).startTokenRefresh?.();
  } else {
    console.log('[WebSocket] User signed out, disconnecting...');
    wsManager.disconnect();
  }
});

// Expose to window for debugging
if (import.meta.env.DEV) {
  (window as any).wsManager = wsManager;
}
