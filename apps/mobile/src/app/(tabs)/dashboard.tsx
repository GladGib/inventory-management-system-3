import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types mirroring the actual backend response from
// GET /dashboard  (DashboardService.getDashboardOverview)
// -----------------------------------------------

interface DashboardKpis {
  monthSales: { total: number; count: number };
  ytdSales: number;
  receivables: { total: number; count: number };
  payables: { total: number; count: number };
  lowStockItems: number;
  pendingOrders: number;
}

interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  status: string;
  customer: { displayName: string };
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  total: number;
  status: string;
  customer: { displayName: string };
}

interface DashboardOverview {
  kpis: DashboardKpis;
  recentActivity: {
    invoices: RecentInvoice[];
    orders: RecentOrder[];
  };
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function DashboardScreen() {
  const router = useRouter();

  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard');
      return res.data;
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const kpis = overview?.kpis;
  const recentInvoices = overview?.recentActivity?.invoices ?? [];
  const recentOrders = overview?.recentActivity?.orders ?? [];

  if (isLoading && !overview) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.heading}>Dashboard</Text>

      {/* ---- Quick Actions ---- */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/stocktake')}
          accessibilityRole="button"
          accessibilityLabel="Start batch stocktake"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#e6f7ff' }]}>
            <Ionicons name="clipboard-outline" size={20} color="#1890ff" />
          </View>
          <Text style={styles.quickActionLabel}>Stocktake</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/adjustments')}
          accessibilityRole="button"
          accessibilityLabel="View adjustment history"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#f6ffed' }]}>
            <Ionicons name="swap-vertical-outline" size={20} color="#52c41a" />
          </View>
          <Text style={styles.quickActionLabel}>Adjustments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/quick-sale')}
          accessibilityRole="button"
          accessibilityLabel="Create quick sale"
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#fff7e6' }]}>
            <Ionicons name="cart-outline" size={20} color="#faad14" />
          </View>
          <Text style={styles.quickActionLabel}>Quick Sale</Text>
        </TouchableOpacity>
      </View>

      {/* ---- KPI Cards ---- */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Sales (Month)"
          value={formatRM(kpis?.monthSales?.total)}
          subtitle={`${kpis?.monthSales?.count ?? 0} invoices`}
          color="#52c41a"
        />
        <StatCard
          title="Sales (YTD)"
          value={formatRM(kpis?.ytdSales)}
          color="#1890ff"
        />
        <StatCard
          title="Receivables"
          value={formatRM(kpis?.receivables?.total)}
          subtitle={`${kpis?.receivables?.count ?? 0} outstanding`}
          color="#faad14"
        />
        <StatCard
          title="Payables"
          value={formatRM(kpis?.payables?.total)}
          subtitle={`${kpis?.payables?.count ?? 0} outstanding`}
          color="#ff4d4f"
        />
      </View>

      {/* ---- Pending Actions ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Actions</Text>
        <ActionItem
          title="Low Stock Items"
          count={kpis?.lowStockItems ?? 0}
        />
        <ActionItem
          title="Pending Sales Orders"
          count={kpis?.pendingOrders ?? 0}
        />
      </View>

      {/* ---- Recent Invoices ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        {recentInvoices.length === 0 ? (
          <Text style={styles.emptyText}>No recent invoices</Text>
        ) : (
          recentInvoices.map((inv) => (
            <View key={inv.id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityPrimary}>{inv.invoiceNumber}</Text>
                <Text style={styles.activitySecondary}>
                  {inv.customer.displayName}
                </Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityAmount}>
                  RM {Number(inv.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </Text>
                <StatusBadge status={inv.status} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* ---- Recent Orders ---- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>No recent orders</Text>
        ) : (
          recentOrders.map((order) => (
            <View key={order.id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityPrimary}>
                  {order.orderNumber}
                </Text>
                <Text style={styles.activitySecondary}>
                  {order.customer.displayName}
                </Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityAmount}>
                  RM {Number(order.total).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </Text>
                <StatusBadge status={order.status} />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// -----------------------------------------------
// Sub-components
// -----------------------------------------------

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle ? (
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function ActionItem({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.actionItem}>
      <Text style={styles.actionTitle}>{title}</Text>
      <View
        style={[
          styles.badge,
          count > 0 ? styles.badgeActive : styles.badgeInactive,
        ]}
      >
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: '#f0f0f0', text: '#8c8c8c' },
    CONFIRMED: { bg: '#e6f7ff', text: '#1890ff' },
    SENT: { bg: '#e6f7ff', text: '#1890ff' },
    PACKED: { bg: '#fff7e6', text: '#faad14' },
    SHIPPED: { bg: '#f6ffed', text: '#52c41a' },
    DELIVERED: { bg: '#f6ffed', text: '#52c41a' },
    PAID: { bg: '#f6ffed', text: '#52c41a' },
    PARTIALLY_PAID: { bg: '#fff7e6', text: '#faad14' },
    OVERDUE: { bg: '#fff1f0', text: '#ff4d4f' },
    VOID: { bg: '#f0f0f0', text: '#8c8c8c' },
    CANCELLED: { bg: '#f0f0f0', text: '#8c8c8c' },
  };

  const colors = colorMap[status] ?? { bg: '#f0f0f0', text: '#8c8c8c' };
  const label = status.replace(/_/g, ' ');

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {label}
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

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 8,
    color: '#1f1f1f',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#434343',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  statCard: {
    width: '46%',
    margin: '2%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  statTitle: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#bfbfbf',
    marginTop: 2,
  },

  // Sections
  section: {
    marginHorizontal: 12,
    marginTop: 16,
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

  // Action items
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionTitle: {
    fontSize: 14,
    color: '#434343',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#ff4d4f',
  },
  badgeInactive: {
    backgroundColor: '#d9d9d9',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Activity rows
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLeft: {
    flex: 1,
    marginRight: 12,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  activitySecondary: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Empty
  emptyText: {
    fontSize: 14,
    color: '#bfbfbf',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
