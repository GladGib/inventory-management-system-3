import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  OfflineQueue,
  QueueEntry,
  QueueItemType,
} from '../services/offline-queue';
import { retrySingleItem, retryAllFailed } from '../services/offline-sync';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable labels for queue item types. */
const TYPE_LABELS: Record<QueueItemType, string> = {
  adjustment: 'Stock Adjustment',
  sale: 'Quick Sale',
};

/** Icons for queue item types. */
const TYPE_ICONS: Record<QueueItemType, keyof typeof Ionicons.glyphMap> = {
  adjustment: 'swap-vertical-outline',
  sale: 'cart-outline',
};

/** Format a queue entry payload into a short summary string. */
function summarise(entry: QueueEntry): string {
  const p = entry.payload;

  if (entry.type === 'adjustment') {
    const qty = p.quantity as number;
    const direction = qty >= 0 ? 'Add' : 'Remove';
    const reason = (p.reason as string) || '';
    return `${direction} ${Math.abs(qty)} unit(s) - ${reason.replace(/_/g, ' ')}`;
  }

  if (entry.type === 'sale') {
    const items = (p.items as any[]) || [];
    const customer = (p.customerName as string) || 'Walk-in';
    return `${items.length} item(s) for ${customer}`;
  }

  return JSON.stringify(p).substring(0, 60);
}

/** Format an ISO timestamp to a short local string. */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function OfflineQueueScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await OfflineQueue.getAll();
      setEntries(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRetrySingle = async (id: string) => {
    setRetryingId(id);
    try {
      const success = await retrySingleItem(id);
      if (success) {
        Alert.alert('Success', 'Item synced successfully.');
      } else {
        Alert.alert('Failed', 'Could not sync this item. It has been kept for retry.');
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while retrying.');
    } finally {
      setRetryingId(null);
      await loadEntries();
    }
  };

  const handleDiscard = (id: string) => {
    Alert.alert(
      'Discard Item',
      'Are you sure you want to discard this queued item? The data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await OfflineQueue.removeById(id);
            await loadEntries();
          },
        },
      ],
    );
  };

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      const result = await retryAllFailed();
      Alert.alert(
        'Retry Complete',
        `Attempted: ${result.attempted}\nSucceeded: ${result.succeeded}\nFailed: ${result.failed}`,
      );
    } catch {
      Alert.alert('Error', 'An unexpected error occurred while retrying.');
    } finally {
      setIsRetryingAll(false);
      await loadEntries();
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to discard ALL queued items? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await OfflineQueue.clearAll();
            await loadEntries();
          },
        },
      ],
    );
  };

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const pendingEntries = entries.filter(
    (e) => e.status === 'pending' || e.status === 'syncing',
  );
  const failedEntries = entries.filter((e) => e.status === 'failed');

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Offline Queue',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadEntries} />
        }
      >
        {/* Summary header */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{pendingEntries.length}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryCount, failedEntries.length > 0 && styles.failedText]}>
                {failedEntries.length}
              </Text>
              <Text style={styles.summaryLabel}>Failed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{entries.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        {entries.length > 0 && (
          <View style={styles.actionsRow}>
            {failedEntries.length > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.retryAllButton]}
                onPress={handleRetryAll}
                disabled={isRetryingAll}
                accessibilityRole="button"
                accessibilityLabel="Retry all failed items"
              >
                {isRetryingAll ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                )}
                <Text style={styles.actionButtonText}>
                  {isRetryingAll ? 'Retrying...' : 'Retry All Failed'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.clearAllButton]}
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel="Clear all queued items"
            >
              <Ionicons name="trash-outline" size={16} color="#ff4d4f" />
              <Text style={[styles.actionButtonText, styles.clearAllButtonText]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {entries.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#52c41a" />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>
              All offline changes have been synced or there are no pending items.
            </Text>
          </View>
        )}

        {/* Pending items */}
        {pendingEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Sync</Text>
            {pendingEntries.map((entry) => (
              <QueueEntryCard
                key={entry.id}
                entry={entry}
                isRetrying={false}
                onRetry={() => {}}
                onDiscard={() => handleDiscard(entry.id)}
                showRetry={false}
              />
            ))}
          </View>
        )}

        {/* Failed items */}
        {failedEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Failed Items</Text>
            {failedEntries.map((entry) => (
              <QueueEntryCard
                key={entry.id}
                entry={entry}
                isRetrying={retryingId === entry.id}
                onRetry={() => handleRetrySingle(entry.id)}
                onDiscard={() => handleDiscard(entry.id)}
                showRetry={true}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ---------------------------------------------------------------------------
// QueueEntryCard sub-component
// ---------------------------------------------------------------------------

interface QueueEntryCardProps {
  entry: QueueEntry;
  isRetrying: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  showRetry: boolean;
}

function QueueEntryCard({
  entry,
  isRetrying,
  onRetry,
  onDiscard,
  showRetry,
}: QueueEntryCardProps) {
  const iconName = TYPE_ICONS[entry.type] || 'document-outline';
  const typeLabel = TYPE_LABELS[entry.type] || entry.type;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTypeRow}>
          <Ionicons name={iconName} size={18} color="#1890ff" />
          <Text style={styles.cardType}>{typeLabel}</Text>
        </View>
        <Text style={styles.cardTime}>{formatTime(entry.queuedAt)}</Text>
      </View>

      {/* Summary */}
      <Text style={styles.cardSummary}>{summarise(entry)}</Text>

      {/* Error message */}
      {entry.lastError && (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={14} color="#ff4d4f" />
          <Text style={styles.errorText} numberOfLines={3}>
            {entry.lastError}
          </Text>
        </View>
      )}

      {/* Retry count */}
      {entry.retryCount > 0 && (
        <Text style={styles.retryCountText}>
          Attempted {entry.retryCount} time(s)
        </Text>
      )}

      {/* Action buttons */}
      <View style={styles.cardActions}>
        {showRetry && (
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={onRetry}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel={`Retry ${typeLabel}`}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              <Ionicons name="refresh-outline" size={16} color="#1890ff" />
            )}
            <Text style={styles.cardActionRetryText}>
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cardActionButton}
          onPress={onDiscard}
          accessibilityRole="button"
          accessibilityLabel={`Discard ${typeLabel}`}
        >
          <Ionicons name="trash-outline" size={16} color="#ff4d4f" />
          <Text style={styles.cardActionDiscardText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Summary card
  summaryCard: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f0f0f0',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
  },
  failedText: {
    color: '#ff4d4f',
  },

  // Action row
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  retryAllButton: {
    backgroundColor: '#1890ff',
  },
  clearAllButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4d4f',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  clearAllButtonText: {
    color: '#ff4d4f',
  },

  // Sections
  section: {
    marginHorizontal: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8c8c8c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f1f1f',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  cardTime: {
    fontSize: 12,
    color: '#bfbfbf',
  },
  cardSummary: {
    fontSize: 13,
    color: '#595959',
    lineHeight: 18,
    marginBottom: 8,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff1f0',
    borderRadius: 6,
    padding: 8,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  errorText: {
    fontSize: 12,
    color: '#ff4d4f',
    flex: 1,
    lineHeight: 16,
  },

  // Retry count
  retryCountText: {
    fontSize: 11,
    color: '#bfbfbf',
    marginBottom: 8,
  },

  // Card actions
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardActionRetryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1890ff',
  },
  cardActionDiscardText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ff4d4f',
  },
});
