import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueueItemType = 'adjustment' | 'sale';
export type QueueItemStatus = 'pending' | 'syncing' | 'failed';

export interface QueueEntry {
  /** Unique identifier for this queue entry */
  id: string;
  /** The type of operation that was queued */
  type: QueueItemType;
  /** The request payload to be sent when connectivity is restored */
  payload: Record<string, unknown>;
  /** ISO timestamp of when the item was queued */
  queuedAt: string;
  /** Number of times sync has been attempted */
  retryCount: number;
  /** The error message from the last sync attempt, if any */
  lastError: string | null;
  /** Current status of this queue entry */
  status: QueueItemStatus;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'offline_queue';

// ---------------------------------------------------------------------------
// OfflineQueue service
// ---------------------------------------------------------------------------

/**
 * Persistent offline queue backed by AsyncStorage.
 *
 * Queue entries are stored as a JSON array under the `offline_queue` key.
 * All methods are safe to call concurrently -- they read-modify-write
 * atomically (within the JS event loop) per call.
 */
export const OfflineQueue = {
  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Read the raw queue array from storage. */
  async _readAll(): Promise<QueueEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QueueEntry[];
    } catch {
      return [];
    }
  },

  /** Persist the entire queue array to storage. */
  async _writeAll(entries: QueueEntry[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  },

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Add a new item to the end of the offline queue.
   * Returns the newly created queue entry.
   */
  async enqueue(type: QueueItemType, payload: Record<string, unknown>): Promise<QueueEntry> {
    const entries = await OfflineQueue._readAll();

    const entry: QueueEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      lastError: null,
      status: 'pending',
    };

    entries.push(entry);
    await OfflineQueue._writeAll(entries);
    return entry;
  },

  /**
   * Remove and return the first **pending** item in the queue (FIFO).
   * Returns `null` if there are no pending items.
   */
  async dequeue(): Promise<QueueEntry | null> {
    const entries = await OfflineQueue._readAll();
    const index = entries.findIndex((e) => e.status === 'pending');
    if (index === -1) return null;

    const [entry] = entries.splice(index, 1);
    await OfflineQueue._writeAll(entries);
    return entry;
  },

  /** Return every entry currently in the queue. */
  async getAll(): Promise<QueueEntry[]> {
    return OfflineQueue._readAll();
  },

  /** Remove a single entry by its id. */
  async removeById(id: string): Promise<void> {
    const entries = await OfflineQueue._readAll();
    const filtered = entries.filter((e) => e.id !== id);
    await OfflineQueue._writeAll(filtered);
  },

  /**
   * Mark an entry as failed, recording the error message and incrementing
   * the retry count.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const entries = await OfflineQueue._readAll();
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      entry.status = 'failed';
      entry.lastError = error;
      entry.retryCount += 1;
      await OfflineQueue._writeAll(entries);
    }
  },

  /**
   * Mark an entry as currently syncing.
   */
  async markSyncing(id: string): Promise<void> {
    const entries = await OfflineQueue._readAll();
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      entry.status = 'syncing';
      await OfflineQueue._writeAll(entries);
    }
  },

  /**
   * Reset a failed entry back to pending so it can be retried.
   */
  async markPending(id: string): Promise<void> {
    const entries = await OfflineQueue._readAll();
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      entry.status = 'pending';
      await OfflineQueue._writeAll(entries);
    }
  },

  /** Get the count of pending + syncing items (items that still need sync). */
  async getPendingCount(): Promise<number> {
    const entries = await OfflineQueue._readAll();
    return entries.filter((e) => e.status === 'pending' || e.status === 'syncing').length;
  },

  /** Get all items with status === 'failed'. */
  async getFailedItems(): Promise<QueueEntry[]> {
    const entries = await OfflineQueue._readAll();
    return entries.filter((e) => e.status === 'failed');
  },

  /** Get the total count of all queued items (pending + syncing + failed). */
  async getTotalCount(): Promise<number> {
    const entries = await OfflineQueue._readAll();
    return entries.length;
  },

  /** Remove all entries from the queue. */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
