import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

// -----------------------------------------------
// Types aligned with backend getAdjustments response
// -----------------------------------------------

interface Adjustment {
  id: string;
  adjustmentNumber: string;
  organizationId: string;
  itemId: string;
  warehouseId: string;
  type: 'INCREASE' | 'DECREASE';
  quantity: number; // always positive in DB (abs value)
  reason: string;
  notes?: string | null;
  date: string;
  adjustmentDate: string;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  item: { sku: string; name: string };
  warehouse: { name: string; code: string };
  createdBy: { name: string };
}

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

// -----------------------------------------------
// Constants
// -----------------------------------------------

const REASON_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CORRECTION: { label: 'Correction', color: '#1890ff', bg: '#e6f7ff' },
  DAMAGE: { label: 'Damage', color: '#ff4d4f', bg: '#fff1f0' },
  LOSS: { label: 'Loss', color: '#ff4d4f', bg: '#fff1f0' },
  RETURN: { label: 'Return', color: '#722ed1', bg: '#f9f0ff' },
  FOUND: { label: 'Found', color: '#52c41a', bg: '#f6ffed' },
  OPENING_STOCK: { label: 'Opening', color: '#faad14', bg: '#fffbe6' },
  OTHER: { label: 'Other', color: '#8c8c8c', bg: '#f0f0f0' },
};

const REASON_FILTER_OPTIONS = [
  { value: '', label: 'All Reasons' },
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'RETURN', label: 'Return' },
  { value: 'FOUND', label: 'Found' },
  { value: 'OPENING_STOCK', label: 'Opening' },
  { value: 'OTHER', label: 'Other' },
];

const PAGE_SIZE = 20;

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function AdjustmentsScreen() {
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('');
  const [filterReason, setFilterReason] = useState<string>('');

  // Fetch warehouses for filter
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Fetch adjustments with infinite scroll
  // The backend GET /inventory/adjustments does not support limit/page params
  // natively, so we fetch all and do client-side pagination for infinite scroll.
  // This is fine for reasonable volumes; a backend pagination enhancement could
  // be added later.
  const {
    data: adjustmentsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Adjustment[]>({
    queryKey: ['adjustments', filterWarehouseId, filterReason],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterWarehouseId) params.warehouseId = filterWarehouseId;
      // reason is not a backend filter param, so we filter client-side
      const res = await apiClient.get('/inventory/adjustments', { params });
      return res.data ?? [];
    },
  });

  // Client-side reason filter
  const filteredAdjustments = (adjustmentsData ?? []).filter((adj) => {
    if (filterReason && adj.reason !== filterReason) return false;
    return true;
  });

  // Client-side pagination for infinite scroll feel
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleAdjustments = filteredAdjustments.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAdjustments.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  const onRefresh = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    refetch();
  }, [refetch]);

  // Reset visible count when filters change
  const handleFilterWarehouse = useCallback((id: string) => {
    setFilterWarehouseId(id);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleFilterReason = useCallback((reason: string) => {
    setFilterReason(reason);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // -----------------------------------------------
  // Render adjustment row
  // -----------------------------------------------

  const renderAdjustment = useCallback(
    ({ item }: { item: Adjustment }) => {
      const reasonInfo = REASON_LABELS[item.reason] ?? REASON_LABELS.OTHER;
      const signedQty = item.type === 'INCREASE' ? `+${item.quantity}` : `-${item.quantity}`;
      const qtyColor = item.type === 'INCREASE' ? '#52c41a' : '#ff4d4f';

      return (
        <View style={styles.adjustmentRow}>
          <View style={styles.rowTop}>
            <View style={styles.rowTopLeft}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.item.name}
              </Text>
              <Text style={styles.itemSku}>{item.item.sku}</Text>
            </View>
            <View style={styles.rowTopRight}>
              <Text style={[styles.quantity, { color: qtyColor }]}>{signedQty}</Text>
            </View>
          </View>

          <View style={styles.rowBottom}>
            <View style={styles.rowBottomLeft}>
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={12} color="#8c8c8c" />
                <Text style={styles.metaText}>{item.warehouse.name}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={12} color="#8c8c8c" />
                <Text style={styles.metaText}>{item.createdBy.name}</Text>
              </View>
            </View>

            <View style={styles.rowBottomRight}>
              <View
                style={[
                  styles.reasonBadge,
                  { backgroundColor: reasonInfo.bg },
                ]}
              >
                <Text style={[styles.reasonBadgeText, { color: reasonInfo.color }]}>
                  {reasonInfo.label}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {formatDate(item.adjustmentDate)} {formatTime(item.adjustmentDate)}
              </Text>
            </View>
          </View>

          {item.notes ? (
            <View style={styles.notesRow}>
              <Ionicons name="document-text-outline" size={12} color="#bfbfbf" />
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [],
  );

  const keyExtractor = useCallback((item: Adjustment) => item.id, []);

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Adjustment History',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <View style={styles.container}>
        {/* Filter bar */}
        <View style={styles.filterSection}>
          {/* Warehouse filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterWarehouseId && styles.filterChipActive,
                ]}
                onPress={() => handleFilterWarehouse('')}
                accessibilityRole="radio"
                accessibilityState={{ selected: !filterWarehouseId }}
                accessibilityLabel="All warehouses"
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !filterWarehouseId && styles.filterChipTextActive,
                  ]}
                >
                  All Warehouses
                </Text>
              </TouchableOpacity>
              {(warehouses ?? []).map((wh) => (
                <TouchableOpacity
                  key={wh.id}
                  style={[
                    styles.filterChip,
                    filterWarehouseId === wh.id && styles.filterChipActive,
                  ]}
                  onPress={() => handleFilterWarehouse(wh.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: filterWarehouseId === wh.id }}
                  accessibilityLabel={`Filter by ${wh.name}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterWarehouseId === wh.id && styles.filterChipTextActive,
                    ]}
                  >
                    {wh.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Reason filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <View style={styles.filterChips}>
              {REASON_FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.filterChipSmall,
                    filterReason === opt.value && styles.filterChipSmallActive,
                  ]}
                  onPress={() => handleFilterReason(opt.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: filterReason === opt.value }}
                  accessibilityLabel={`Filter by ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipSmallText,
                      filterReason === opt.value && styles.filterChipSmallTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Results count */}
        <View style={styles.resultsMeta}>
          <Text style={styles.resultsMetaText}>
            {filteredAdjustments.length} adjustment{filteredAdjustments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Adjustments list */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={visibleAdjustments}
            keyExtractor={keyExtractor}
            renderItem={renderAdjustment}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              hasMore ? (
                <ActivityIndicator
                  size="small"
                  color="#1890ff"
                  style={{ paddingVertical: 16 }}
                />
              ) : filteredAdjustments.length > 0 ? (
                <Text style={styles.endOfListText}>End of list</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="swap-vertical-outline" size={64} color="#d9d9d9" />
                <Text style={styles.emptyTitle}>No adjustments found</Text>
                <Text style={styles.emptySubtitle}>
                  {filterWarehouseId || filterReason
                    ? 'Try changing filters'
                    : 'Stock adjustments will appear here'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  // Filter section
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScroll: {
    flexGrow: 0,
    paddingVertical: 4,
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  filterChipActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#434343',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  filterChipSmallActive: {
    backgroundColor: '#e6f7ff',
    borderColor: '#91d5ff',
  },
  filterChipSmallText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8c8c8c',
  },
  filterChipSmallTextActive: {
    color: '#1890ff',
  },

  // Results meta
  resultsMeta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsMetaText: {
    fontSize: 12,
    color: '#8c8c8c',
  },

  // List
  listContent: {
    paddingBottom: 24,
  },

  // Adjustment row
  adjustmentRow: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowTopLeft: {
    flex: 1,
    marginRight: 12,
  },
  rowTopRight: {
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  itemSku: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  quantity: {
    fontSize: 18,
    fontWeight: '700',
  },

  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  rowBottomLeft: {
    flex: 1,
    gap: 4,
  },
  rowBottomRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  reasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: '#bfbfbf',
  },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#bfbfbf',
    fontStyle: 'italic',
    flex: 1,
  },

  // Footer
  endOfListText: {
    textAlign: 'center',
    color: '#bfbfbf',
    fontSize: 12,
    paddingVertical: 16,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8c8c8c',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#bfbfbf',
    marginTop: 8,
    textAlign: 'center',
  },
});
