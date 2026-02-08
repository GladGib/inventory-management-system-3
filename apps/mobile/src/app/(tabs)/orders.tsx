import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types
// -----------------------------------------------

type OrderTab = 'sales' | 'purchases';

interface OrderContact {
  name?: string;
  displayName?: string;
  email?: string;
}

interface OrderListItem {
  id: string;
  orderNumber?: string;
  customerName?: string;
  vendorName?: string;
  contact?: OrderContact;
  status: string;
  total?: number;
  grandTotal?: number;
  date?: string;
  orderDate?: string;
  createdAt?: string;
  itemCount?: number;
}

// -----------------------------------------------
// Main Screen
// -----------------------------------------------

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderTab>('sales');
  const router = useRouter();

  const {
    data: salesOrders,
    isLoading: salesLoading,
    isRefetching: salesRefetching,
    refetch: refetchSales,
  } = useQuery<OrderListItem[]>({
    queryKey: ['sales-orders-mobile'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/orders', {
        params: { limit: 50, sort: 'createdAt:desc' },
      });
      return res.data?.orders || res.data || [];
    },
    enabled: activeTab === 'sales',
  });

  const {
    data: purchaseOrders,
    isLoading: purchasesLoading,
    isRefetching: purchasesRefetching,
    refetch: refetchPurchases,
  } = useQuery<OrderListItem[]>({
    queryKey: ['purchase-orders-mobile'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/orders', {
        params: { limit: 50, sort: 'createdAt:desc' },
      });
      return res.data?.orders || res.data || [];
    },
    enabled: activeTab === 'purchases',
  });

  const orders = activeTab === 'sales' ? salesOrders : purchaseOrders;
  const isLoading = activeTab === 'sales' ? salesLoading : purchasesLoading;
  const isRefetching = activeTab === 'sales' ? salesRefetching : purchasesRefetching;
  const refetch = activeTab === 'sales' ? refetchSales : refetchPurchases;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusColor = (status: string): { bg: string; text: string } => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: '#f0f0f0', text: '#8c8c8c' },
      CONFIRMED: { bg: '#e6f7ff', text: '#1890ff' },
      SENT: { bg: '#e6f7ff', text: '#1890ff' },
      PENDING: { bg: '#fff7e6', text: '#faad14' },
      PACKED: { bg: '#fff7e6', text: '#faad14' },
      SHIPPED: { bg: '#f6ffed', text: '#52c41a' },
      DELIVERED: { bg: '#f6ffed', text: '#52c41a' },
      COMPLETED: { bg: '#f6ffed', text: '#52c41a' },
      CANCELLED: { bg: '#fff1f0', text: '#ff4d4f' },
      VOID: { bg: '#f0f0f0', text: '#8c8c8c' },
    };
    return colorMap[status?.toUpperCase()] ?? { bg: '#f0f0f0', text: '#8c8c8c' };
  };

  const getContactName = (item: OrderListItem): string => {
    if (activeTab === 'sales') {
      return item.customerName || item.contact?.displayName || item.contact?.name || 'Unknown Customer';
    }
    return item.vendorName || item.contact?.displayName || item.contact?.name || 'Unknown Vendor';
  };

  const getOrderTotal = (item: OrderListItem): number => {
    return item.total || item.grandTotal || 0;
  };

  const getOrderDate = (item: OrderListItem): string => {
    const dateStr = item.date || item.orderDate || item.createdAt;
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY');
  };

  // Show full-screen loader only on first mount
  if (isLoading && !orders) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'sales' && styles.tabTextActive,
            ]}
          >
            Sales Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
          onPress={() => setActiveTab('purchases')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'purchases' && styles.tabTextActive,
            ]}
          >
            Purchase Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Order List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const statusColors = getStatusColor(item.status);
          const statusLabel = (item.status || 'DRAFT').replace(/_/g, ' ');

          return (
            <TouchableOpacity
              style={styles.orderCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/orders/${item.id}?type=${activeTab}`)
              }
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>
                  {item.orderNumber || `#${item.id.slice(0, 8)}`}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColors.text },
                    ]}
                  >
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <Text style={styles.contactName}>{getContactName(item)}</Text>

              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>{getOrderDate(item)}</Text>
                <Text style={styles.orderTotal}>
                  RM{' '}
                  {getOrderTotal(item).toLocaleString('en-MY', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No {activeTab === 'sales' ? 'sales' : 'purchase'} orders found
            </Text>
          </View>
        }
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1890ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8c8c8c',
  },
  tabTextActive: {
    color: '#1890ff',
  },

  // List
  listContent: {
    paddingVertical: 8,
  },

  // Order card
  orderCard: {
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
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  contactName: {
    fontSize: 14,
    color: '#434343',
    marginTop: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderDate: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1890ff',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#8c8c8c',
    fontSize: 16,
    textAlign: 'center',
  },
});
