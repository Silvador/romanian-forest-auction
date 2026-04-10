import { io, Socket } from 'socket.io-client';
import { auth } from './firebase';
import { API_BASE_URL as BASE_URL } from './config';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

// WebSocket event types matching the backend
export type WSEvent =
  | 'bid:new'
  | 'bid:outbid'
  | 'auction:update'
  | 'auction:ended'
  | 'auction:soft-close'
  | 'dashboard:update'
  | 'notification:new';

export type WSRoom =
  | 'watch:feed'
  | `watch:auction:${string}`
  | 'watch:dashboard'
  | 'watch:notifications';

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await auth.currentUser?.getIdToken();

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    reconnectAttempts = 0;
    console.log('[WS] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    console.log('[WS] Connection error:', error.message, `(attempt ${reconnectAttempts})`);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
}

export function joinRoom(room: WSRoom) {
  socket?.emit('join', room);
}

export function leaveRoom(room: WSRoom) {
  socket?.emit('leave', room);
}

export function onEvent<T = unknown>(event: WSEvent, callback: (data: T) => void) {
  socket?.on(event, callback as (...args: unknown[]) => void);
}

export function offEvent(event: WSEvent, callback?: (...args: unknown[]) => void) {
  if (callback) {
    socket?.off(event, callback);
  } else {
    socket?.off(event);
  }
}
