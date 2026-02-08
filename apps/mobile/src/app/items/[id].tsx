import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types mirroring the actual backend response from
// GET /items/:id  (ItemsService.findById)
// -----------------------------------------------

interface StockLevelDetail {
  warehouseId: string;
  stockOnHand: number;
  committedStock: number;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

interface ItemDetail {
  id: string;
  sku: string;
  name: string;
  nameMalay?: string | null;
  description?: string | null;
  type: string;
  unit: string;
  brand?: string | null;
  partNumber?: string | null;
  crossReferences: string[];
  vehicleModels: string[];
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  reorderQty: number;
  trackInventory: boolean;
  trackBatches: boolean;
  trackSerials: boolean;
  hasCore: boolean;
  coreCharge: number;
  taxable: boolean;
  images: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  category?: { id: string; name: string; nameMalay?: string | null; description?: string | null } | null;
  taxRate?: { id: string; name: string; rate: number; type: string } | null;
  itemGroup?: { id: string; name: string } | null;
  stockLevels: StockLevelDetail[];
  // Computed fields from the API
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  stockValue: number;
  isLowStock: boolean;
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: item, isLoading, isRefetching, refetch } = useQuery<ItemDetail>({
    queryKey: ['item', id],
    queryFn: async () => {
      const res = await apiClient.get(`/items/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  const margin = computeMargin(item.sellingPrice, item.costPrice);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      <Stack.Screen options={{ title: item.sku }} />

      {/* ---- Header ---- */}
      <View style={styles.header}>
        <Text style={styles.headerName}>{item.name}</Text>
        {item.nameMalay ? (
          <Text style={styles.headerNameMalay}>{item.nameMalay}</Text>
        ) : null}
        <Text style={styles.headerSku}>SKU: {item.sku}</Text>
        <View style={styles.headerMeta}>
          <TypeBadge type={item.type} />
          <StatusBadge status={item.status} />
          {item.isLowStock && (
            <View style={styles.lowStockIndicator}>
              <Text style={styles.lowStockIndicatorText}>LOW STOCK</Text>
            </View>
          )}
        </View>
      </View>

      {/* ---- Pricing ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        <DetailRow
          label="Selling Price"
          value={formatRM(item.sellingPrice)}
        />
        <DetailRow label="Cost Price" value={formatRM(item.costPrice)} />
        <DetailRow label="Margin" value={margin} />
        {item.taxable && item.taxRate ? (
          <DetailRow
            label="Tax"
            value={`${item.taxRate.name} (${Number(item.taxRate.rate)}%)`}
          />
        ) : (
          <DetailRow
            label="Tax"
            value={item.taxable ? 'Taxable' : 'Non-taxable'}
          />
        )}
        {item.hasCore && Number(item.coreCharge) > 0 ? (
          <DetailRow
            label="Core Charge"
            value={formatRM(item.coreCharge)}
          />
        ) : null}
      </View>

      {/* ---- Inventory Summary ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory</Text>
        <DetailRow
          label="Stock on Hand"
          value={`${item.stockOnHand} ${item.unit}`}
          valueStyle={
            item.stockOnHand <= 0
              ? styles.valueRed
              : item.isLowStock
                ? styles.valueAmber
                : styles.valueGreen
          }
        />
        <DetailRow
          label="Committed Stock"
          value={`${item.committedStock} ${item.unit}`}
        />
        <DetailRow
          label="Available Stock"
          value={`${item.availableStock} ${item.unit}`}
        />
        <DetailRow
          label="Stock Value"
          value={formatRM(item.stockValue)}
        />
        <DetailRow
          label="Reorder Level"
          value={`${Number(item.reorderLevel)} ${item.unit}`}
        />
        <DetailRow
          label="Reorder Qty"
          value={`${Number(item.reorderQty)} ${item.unit}`}
        />
        <DetailRow label="Unit" value={item.unit} />
      </View>

      {/* ---- Stock by Warehouse ---- */}
      {item.stockLevels && item.stockLevels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock by Warehouse</Text>
          {item.stockLevels.map((sl) => (
            <View key={sl.warehouseId} style={styles.warehouseRow}>
              <View style={styles.warehouseInfo}>
                <Text style={styles.warehouseName}>
                  {sl.warehouse.name}
                </Text>
                <Text style={styles.warehouseCode}>
                  {sl.warehouse.code}
                </Text>
              </View>
              <View style={styles.warehouseStockCol}>
                <Text style={styles.warehouseStockValue}>
                  {Number(sl.stockOnHand)}
                </Text>
                <Text style={styles.warehouseStockLabel}>On hand</Text>
              </View>
              <View style={styles.warehouseStockCol}>
                <Text style={styles.warehouseStockValue}>
                  {Number(sl.committedStock)}
                </Text>
                <Text style={styles.warehouseStockLabel}>Committed</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ---- Details ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <DetailRow label="Type" value={formatType(item.type)} />
        <DetailRow label="Category" value={item.category?.name ?? '-'} />
        {item.itemGroup ? (
          <DetailRow label="Item Group" value={item.itemGroup.name} />
        ) : null}
        {item.brand ? (
          <DetailRow label="Brand" value={item.brand} />
        ) : null}
        {item.partNumber ? (
          <DetailRow label="Part Number" value={item.partNumber} />
        ) : null}
        <DetailRow
          label="Description"
          value={item.description || '-'}
        />
      </View>

      {/* ---- Tracking Flags ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tracking</Text>
        <DetailRow
          label="Track Inventory"
          value={item.trackInventory ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Track Batches"
          value={item.trackBatches ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Track Serials"
          value={item.trackSerials ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Has Core Return"
          value={item.hasCore ? 'Yes' : 'No'}
        />
      </View>

      {/* ---- Cross References ---- */}
      {item.crossReferences && item.crossReferences.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cross References</Text>
          {item.crossReferences.map((ref, i) => (
            <View key={i} style={styles.crossRefItem}>
              <Text style={styles.crossRefText}>{ref}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ---- Vehicle Models ---- */}
      {item.vehicleModels && item.vehicleModels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Models</Text>
          <View style={styles.tagRow}>
            {item.vehicleModels.map((model, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{model}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// -----------------------------------------------
// Sub-components
// -----------------------------------------------

function DetailRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, valueStyle]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    INVENTORY: '#1890ff',
    SERVICE: '#722ed1',
    NON_INVENTORY: '#8c8c8c',
  };
  const color = colorMap[type] ?? '#8c8c8c';

  return (
    <View style={[styles.typeBadge, { backgroundColor: color }]}>
      <Text style={styles.typeBadgeText}>{formatType(type)}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <View
      style={[
        styles.statusBadgeContainer,
        { backgroundColor: isActive ? '#f6ffed' : '#f0f0f0' },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          { color: isActive ? '#52c41a' : '#8c8c8c' },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function formatRM(amount: number | undefined | null): string {
  const value = amount ?? 0;
  return `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeMargin(sellingPrice: number, costPrice: number): string {
  const sp = Number(sellingPrice);
  const cp = Number(costPrice);
  if (sp <= 0) return '-';
  const pct = ((sp - cp) / sp) * 100;
  return `${pct.toFixed(1)}%`;
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },

  // Header
  header: {
    backgroundColor: '#001529',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerNameMalay: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 2,
  },
  headerSku: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },

  // Type badge
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },

  // Status badge
  statusBadgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Low stock indicator
  lowStockIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#fff7e6',
  },
  lowStockIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#faad14',
  },

  // Sections
  section: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f1f1f',
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8c8c8c',
    flexShrink: 0,
    marginRight: 16,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
    textAlign: 'right',
    flex: 1,
  },
  valueGreen: {
    color: '#52c41a',
  },
  valueAmber: {
    color: '#faad14',
  },
  valueRed: {
    color: '#ff4d4f',
  },

  // Warehouse stock
  warehouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  warehouseCode: {
    fontSize: 11,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  warehouseStockCol: {
    alignItems: 'center',
    minWidth: 64,
    marginLeft: 12,
  },
  warehouseStockValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  warehouseStockLabel: {
    fontSize: 10,
    color: '#8c8c8c',
    marginTop: 2,
  },

  // Cross references
  crossRefItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  crossRefText: {
    fontSize: 14,
    color: '#434343',
    fontFamily: 'monospace',
  },

  // Tags (vehicle models)
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f5ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
  },
});
