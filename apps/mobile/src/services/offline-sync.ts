import { apiClient } from '../api/client';
import { OfflineQueue, QueueEntry, QueueItemType } from './offline-queue';

// ---------------------------------------------------------------------------
// Endpoint mapping
// ---------------------------------------------------------------------------

/**
 * Maps queue item types to their corresponding API endpoints (POST).
 * These paths are relative to the apiClient baseURL which already
 * includes `/api/v1`.
 */
const ENDPOINT_MAP: Record<QueueItemType, string> = {
  adjustment: '/inventory/adjustments',
  sale: '/sales/orders',
};

// ---------------------------------------------------------------------------
// Sync result types
// ---------------------------------------------------------------------------

export interface SyncResult {
  /** Total number of items that were attempted */
  attempted: number;
  /** Number of items that synced successfully */
  succeeded: number;
  /** Number of items that failed */
  failed: number;
}

// ---------------------------------------------------------------------------
// Sync lock
// ---------------------------------------------------------------------------

let isSyncing = false;

// ---------------------------------------------------------------------------
// Core sync function
// ---------------------------------------------------------------------------

/**
 * Process all **pending** items in the offline queue in FIFO order.
 *
 * For each item:
 * 1. Mark it as `syncing`
 * 2. POST the payload to the appropriate API endpoint
 * 3. On success, remove it from the queue
 * 4. On failure, mark it as `failed` with the error message
 *
 * This function is safe to call multiple times -- it uses a simple lock
 * to prevent concurrent sync runs.
 *
 * @param onProgress Optional callback invoked after each item is processed.
 */
export async function syncOfflineQueue(
  onProgress?: (result: SyncResult) => void,
): Promise<SyncResult> {
  if (isSyncing) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  isSyncing = true;

  const result: SyncResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
  };

  try {
    // Get a snapshot of all entries and process pending ones in order
    const allEntries = await OfflineQueue.getAll();
    const pendingEntries = allEntries.filter((e) => e.status === 'pending');

    for (const entry of pendingEntries) {
      result.attempted++;

      try {
        // Mark as syncing first
        await OfflineQueue.markSyncing(entry.id);

        // Determine the endpoint
        const endpoint = ENDPOINT_MAP[entry.type];
        if (!endpoint) {
          throw new Error(`Unknown queue item type: ${entry.type}`);
        }

        // POST the payload
        await apiClient.post(endpoint, entry.payload);

        // Success -- remove from queue
        await OfflineQueue.removeById(entry.id);
        result.succeeded++;
      } catch (error: any) {
        // Extract a meaningful error message
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Unknown error during sync';

        await OfflineQueue.markFailed(entry.id, message);
        result.failed++;
      }

      // Notify caller of progress
      if (onProgress) {
        onProgress({ ...result });
      }
    }
  } finally {
    isSyncing = false;
  }

  return result;
}

/**
 * Retry a single failed queue entry by resetting it to pending,
 * then immediately attempting to sync it.
 */
export async function retrySingleItem(id: string): Promise<boolean> {
  const allEntries = await OfflineQueue.getAll();
  const entry = allEntries.find((e) => e.id === id);

  if (!entry) return false;

  try {
    await OfflineQueue.markSyncing(entry.id);

    const endpoint = ENDPOINT_MAP[entry.type];
    if (!endpoint) {
      throw new Error(`Unknown queue item type: ${entry.type}`);
    }

    await apiClient.post(endpoint, entry.payload);
    await OfflineQueue.removeById(entry.id);
    return true;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Unknown error during retry';

    await OfflineQueue.markFailed(entry.id, message);
    return false;
  }
}

/**
 * Retry all failed items in the queue.
 * First resets them all to pending, then runs a full sync pass.
 */
export async function retryAllFailed(): Promise<SyncResult> {
  const failedItems = await OfflineQueue.getFailedItems();

  // Reset all failed items back to pending
  for (const item of failedItems) {
    await OfflineQueue.markPending(item.id);
  }

  // Now run the sync
  return syncOfflineQueue();
}
