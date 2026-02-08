import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types mirroring the actual backend response from
// GET /items  (ItemsService.findAll)
// -----------------------------------------------

interface ItemCategory {
  id: string;
  name: string;
}

interface ItemListItem {
  id: string;
  sku: string;
  name: string;
  nameMalay?: string | null;
  description?: string | null;
  type: string;
  unit: string;
  brand?: string | null;
  partNumber?: string | null;
  categoryId?: string | null;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  trackInventory: boolean;
  taxable: boolean;
  status: string;
  createdAt: string;
  // Computed fields added by the API
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  isLowStock: boolean;
  // Relations
  category?: ItemCategory | null;
  taxRate?: { id: string; name: string; rate: number } | null;
}

interface ItemsListResponse {
  data: ItemListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// -----------------------------------------------
// Debounce hook
// -----------------------------------------------

function useDebounce(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function ItemsScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();

  const { data, isLoading, isRefetching, refetch } = useQuery<ItemsListResponse>({
    queryKey: ['items', debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get('/items', {
        params: {
          search: debouncedSearch || undefined,
          limit: 50,
          sortBy: 'name',
          sortOrder: 'asc',
        },
      });
      return res.data;
    },
  });

  const items: ItemListItem[] = data?.data ?? [];

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: ItemListItem }) => (
      <TouchableOpacity
        style={styles.itemCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/items/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${item.name}`}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemSku}>{item.sku}</Text>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>
              RM {Number(item.sellingPrice).toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text
              style={[
                styles.detailValue,
                item.stockOnHand <= 0
                  ? styles.outOfStock
                  : item.isLowStock
                    ? styles.lowStock
                    : styles.inStock,
              ]}
            >
              {item.stockOnHand} {item.unit}
            </Text>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.category?.name ?? '-'}
            </Text>
          </View>
        </View>

        {item.isLowStock && item.stockOnHand > 0 && (
          <View style={styles.lowStockBanner}>
            <Text style={styles.lowStockBannerText}>LOW STOCK</Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    [router],
  );

  const keyExtractor = useCallback((item: ItemListItem) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items by name, SKU, part number..."
          placeholderTextColor="#bfbfbf"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search items"
        />
      </View>

      {/* Results count */}
      {data?.meta && (
        <View style={styles.resultsMeta}>
          <Text style={styles.resultsMetaText}>
            {data.meta.total} item{data.meta.total !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}

      {/* Item list */}
      {isLoading && !data ? (
        <ActivityIndicator size="large" style={styles.loader} color="#1890ff" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'Try a different search term'
                  : 'Items will appear here once added'}
              </Text>
            </View>
          }
        />
      )}
    </View>
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

  // Search
  searchBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#1f1f1f',
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

  // Loading
  loader: {
    marginTop: 40,
  },

  // List
  listContent: {
    paddingBottom: 24,
  },

  // Item card
  itemCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f1f1f',
    flex: 1,
    marginRight: 8,
  },
  itemSku: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
  },
  itemDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#434343',
  },
  outOfStock: {
    color: '#ff4d4f',
  },
  lowStock: {
    color: '#faad14',
  },
  inStock: {
    color: '#52c41a',
  },

  // Low stock banner
  lowStockBanner: {
    position: 'absolute',
    top: 8,
    right: -28,
    backgroundColor: '#fff7e6',
    paddingHorizontal: 24,
    paddingVertical: 2,
    transform: [{ rotate: '45deg' }],
  },
  lowStockBannerText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#faad14',
    letterSpacing: 0.5,
  },

  // Empty
  empty: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8c8c8c',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#bfbfbf',
    marginTop: 8,
    textAlign: 'center',
  },
});
