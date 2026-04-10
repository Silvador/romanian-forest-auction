import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
