import { useEffect, useRef, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncOfflineQueue, SyncResult } from '../services/offline-sync';
import { OfflineQueue } from '../services/offline-queue';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface NetworkStatus {
  /** Whether there is any network connectivity at all */
  isConnected: boolean;
  /** Whether the internet is actually reachable (may be null while checking) */
  isInternetReachable: boolean | null;
  /** Whether the offline queue is currently syncing */
  isSyncing: boolean;
  /** Number of items waiting to be synced (pending + syncing) */
  pendingCount: number;
  /** Manually trigger a sync of the offline queue */
  triggerSync: () => Promise<SyncResult>;
  /** Refresh the pending count from storage */
  refreshPendingCount: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * Tracks network connectivity using @react-native-community/netinfo.
 *
 * When connectivity is restored after being offline, automatically
 * triggers a sync of the offline queue.
 *
 * Returns the current network status and pending queue count.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Track previous connectivity state so we can detect reconnection
  const wasConnectedRef = useRef(true);

  const refreshPendingCount = useCallback(async () => {
    const count = await OfflineQueue.getTotalCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      await refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    // Load the initial pending count
    refreshPendingCount();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      const reachable = state.isInternetReachable ?? null;

      setIsConnected(connected);
      setIsInternetReachable(reachable);

      // Detect reconnection: was offline, now online
      const wasOffline = !wasConnectedRef.current;
      const isNowOnline = connected && (reachable === true || reachable === null);

      if (wasOffline && isNowOnline) {
        // Auto-sync after a small delay to let the network stabilize
        const timer = setTimeout(async () => {
          setIsSyncing(true);
          try {
            await syncOfflineQueue();
            await refreshPendingCount();
          } finally {
            setIsSyncing(false);
          }
        }, 1500);

        // Clean up timer if component unmounts or state changes again
        // before the delay fires.  We store the timer ID and clear it
        // in the unsubscribe handler via a closure.
        return () => clearTimeout(timer);
      }

      wasConnectedRef.current = connected;
    });

    return () => {
      unsubscribe();
    };
  }, [refreshPendingCount]);

  return {
    isConnected,
    isInternetReachable,
    isSyncing,
    pendingCount,
    triggerSync,
    refreshPendingCount,
  };
}
