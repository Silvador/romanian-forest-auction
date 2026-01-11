import { useEffect, useState, useCallback } from 'react';
import { wsManager } from '@/lib/websocket';
import type { ServerToClientEvents } from '../../../shared/websocket-events';

/**
 * Hook to access WebSocket connection and methods
 */
export function useWebSocket() {
  const [connected, setConnected] = useState(wsManager.connected);

  useEffect(() => {
    const unsubscribe = wsManager.onConnectionStatus(({ connected }) => {
      setConnected(connected);
    });

    // Update initial state
    setConnected(wsManager.connected);

    return unsubscribe;
  }, []);

  const on = useCallback(<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ) => {
    return wsManager.on(event, callback);
  }, []);

  const emit = useCallback(wsManager.emit.bind(wsManager), []);

  return {
    connected,
    on,
    emit,
    watchAuction: wsManager.watchAuction.bind(wsManager),
    unwatchAuction: wsManager.unwatchAuction.bind(wsManager),
    watchFeed: wsManager.watchFeed.bind(wsManager),
    unwatchFeed: wsManager.unwatchFeed.bind(wsManager),
    watchDashboard: wsManager.watchDashboard.bind(wsManager),
    unwatchDashboard: wsManager.unwatchDashboard.bind(wsManager),
    watchNotifications: wsManager.watchNotifications.bind(wsManager),
    unwatchNotifications: wsManager.unwatchNotifications.bind(wsManager),
  };
}

/**
 * Hook for watching and receiving real-time updates for a specific auction
 */
export function useAuctionUpdates(auctionId: string | number | undefined) {
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
        if (data.auctionId === Number(auctionId)) {
          callback(data);
        }
      });
    },
    [auctionId, on]
  );

  const onAuctionEnded = useCallback(
    (callback: ServerToClientEvents['auction:ended']) => {
      return on('auction:ended', (data) => {
        if (data.auctionId === Number(auctionId)) {
          callback(data);
        }
      });
    },
    [auctionId, on]
  );

  const onAuctionSoftClose = useCallback(
    (callback: ServerToClientEvents['auction:soft-close']) => {
      return on('auction:soft-close', (data) => {
        if (data.auctionId === Number(auctionId)) {
          callback(data);
        }
      });
    },
    [auctionId, on]
  );

  const onNewBid = useCallback(
    (callback: ServerToClientEvents['auction:new-bid']) => {
      return on('auction:new-bid', (data) => {
        if (data.auctionId === Number(auctionId)) {
          callback(data);
        }
      });
    },
    [auctionId, on]
  );

  return {
    onAuctionUpdate,
    onAuctionEnded,
    onAuctionSoftClose,
    onNewBid,
  };
}

/**
 * Hook for watching feed updates (homepage)
 */
export function useFeedUpdates() {
  const { watchFeed, unwatchFeed, on } = useWebSocket();

  useEffect(() => {
    watchFeed();

    return () => {
      unwatchFeed();
    };
  }, [watchFeed, unwatchFeed]);

  const onBidNew = useCallback(
    (callback: ServerToClientEvents['bid:new']) => {
      return on('bid:new', callback);
    },
    [on]
  );

  return { onBidNew };
}

/**
 * Hook for watching dashboard updates
 */
export function useDashboardUpdates() {
  const { watchDashboard, unwatchDashboard, on } = useWebSocket();

  useEffect(() => {
    watchDashboard();

    return () => {
      unwatchDashboard();
    };
  }, [watchDashboard, unwatchDashboard]);

  const onDashboardUpdate = useCallback(
    (callback: ServerToClientEvents['dashboard:update']) => {
      return on('dashboard:update', callback);
    },
    [on]
  );

  return { onDashboardUpdate };
}

/**
 * Hook for watching notifications
 */
export function useNotificationUpdates() {
  const { watchNotifications, unwatchNotifications, on } = useWebSocket();

  useEffect(() => {
    watchNotifications();

    return () => {
      unwatchNotifications();
    };
  }, [watchNotifications, unwatchNotifications]);

  const onNotificationNew = useCallback(
    (callback: ServerToClientEvents['notification:new']) => {
      return on('notification:new', callback);
    },
    [on]
  );

  return { onNotificationNew };
}

/**
 * Hook for listening to outbid events
 */
export function useOutbidNotifications() {
  const { on } = useWebSocket();

  const onOutbid = useCallback(
    (callback: ServerToClientEvents['bid:outbid']) => {
      return on('bid:outbid', callback);
    },
    [on]
  );

  return { onOutbid };
}
