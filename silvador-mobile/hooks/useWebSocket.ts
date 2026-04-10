import { useEffect, useCallback } from 'react';
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  onEvent,
  offEvent,
  type WSEvent,
  type WSRoom,
} from '../lib/websocket';
import { useAuthContext } from '../lib/AuthContext';

export function useWebSocketConnection() {
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);
}

export function useWebSocketRoom(room: WSRoom | null) {
  useEffect(() => {
    if (!room) return;
    joinRoom(room);
    return () => {
      leaveRoom(room);
    };
  }, [room]);
}

export function useWebSocketEvent<T = unknown>(
  event: WSEvent,
  callback: (data: T) => void
) {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    onEvent(event, stableCallback);
    return () => {
      offEvent(event, stableCallback as (...args: unknown[]) => void);
    };
  }, [event, stableCallback]);
}
