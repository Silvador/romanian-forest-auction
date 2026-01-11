import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import admin from 'firebase-admin';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketUser
} from '../shared/websocket-events';
import { getDocument } from './services/firestoreRestClient';

// Track user connections and their rooms
const userSockets = new Map<string, Set<string>>(); // userId -> socketIds
const socketUsers = new Map<string, SocketUser>(); // socketId -> user

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.CLIENT_URL
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log('[WebSocket] Connection attempt without token');
        return next(new Error('Authentication required'));
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Get user data from Firestore
      const userData = await getDocument('users', userId);
      if (!userData) {
        console.log(`[WebSocket] User not found in Firestore: ${userId}`);
        return next(new Error('User not found'));
      }

      // Attach user data to socket
      socket.data.user = {
        userId,
        email: userData.email || decodedToken.email || '',
        role: userData.role as 'buyer' | 'forest_owner',
        socketId: socket.id,
      };

      next();
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`✓ [WebSocket] User ${user.userId} (${user.role}) connected [${socket.id}]`);

    // Track connection
    if (!userSockets.has(user.userId)) {
      userSockets.set(user.userId, new Set());
    }
    userSockets.get(user.userId)!.add(socket.id);
    socketUsers.set(socket.id, user);

    // Join user-specific room (for notifications, outbid alerts, etc.)
    socket.join(`user:${user.userId}`);

    // Send authentication confirmation
    socket.emit('connection:authenticated');

    // ===== AUCTION WATCHING =====
    socket.on('watch:auction', (auctionId: string) => {
      const roomName = `auction:${auctionId}`;
      socket.join(roomName);
      console.log(`[WebSocket] User ${user.userId} watching auction ${auctionId}`);
    });

    socket.on('unwatch:auction', (auctionId: string) => {
      const roomName = `auction:${auctionId}`;
      socket.leave(roomName);
      console.log(`[WebSocket] User ${user.userId} stopped watching auction ${auctionId}`);
    });

    // ===== FEED WATCHING =====
    socket.on('watch:feed', () => {
      socket.join('feed:global');
      console.log(`[WebSocket] User ${user.userId} watching feed`);
    });

    socket.on('unwatch:feed', () => {
      socket.leave('feed:global');
      console.log(`[WebSocket] User ${user.userId} stopped watching feed`);
    });

    // ===== DASHBOARD WATCHING =====
    socket.on('watch:dashboard', () => {
      socket.join(`dashboard:${user.userId}`);
      console.log(`[WebSocket] User ${user.userId} watching dashboard`);
    });

    socket.on('unwatch:dashboard', () => {
      socket.leave(`dashboard:${user.userId}`);
      console.log(`[WebSocket] User ${user.userId} stopped watching dashboard`);
    });

    // ===== NOTIFICATIONS =====
    socket.on('watch:notifications', () => {
      socket.join(`notifications:${user.userId}`);
      console.log(`[WebSocket] User ${user.userId} watching notifications`);
    });

    socket.on('unwatch:notifications', () => {
      socket.leave(`notifications:${user.userId}`);
      console.log(`[WebSocket] User ${user.userId} stopped watching notifications`);
    });

    // ===== DISCONNECTION =====
    socket.on('disconnect', (reason) => {
      console.log(`✗ [WebSocket] User ${user.userId} disconnected [${socket.id}] - Reason: ${reason}`);

      const sockets = userSockets.get(user.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.userId);
        }
      }
      socketUsers.delete(socket.id);
    });

    // ===== ERROR HANDLING =====
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for user ${user.userId}:`, error);
    });
  });

  // Log total connections periodically
  setInterval(() => {
    const totalConnections = io.sockets.sockets.size;
    const totalUsers = userSockets.size;
    if (totalConnections > 0) {
      console.log(`[WebSocket] Active connections: ${totalConnections} (${totalUsers} unique users)`);
    }
  }, 60000); // Every minute

  return io;
}

// Singleton pattern for IO instance
let ioInstance: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call initializeWebSocket first.');
  }
  return ioInstance;
}

export function setIO(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
  ioInstance = io;
}

// Helper function to get all socket IDs for a user
export function getUserSockets(userId: string): Set<string> {
  return userSockets.get(userId) || new Set();
}

// Helper function to check if user is online
export function isUserOnline(userId: string): boolean {
  const sockets = userSockets.get(userId);
  return sockets ? sockets.size > 0 : false;
}
