import { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types
// -----------------------------------------------

interface OrderContact {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface OrderLineItem {
  item?: { name?: string; sku?: string };
  name?: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  total?: number;
}

interface OrderDetail {
  id: string;
  orderNumber?: string;
  status: string;
  contact?: OrderContact;
  customerName?: string;
  vendorName?: string;
  items?: OrderLineItem[];
  lineItems?: OrderLineItem[];
  subtotal?: number;
  total?: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal?: number;
  date?: string;
  orderDate?: string;
  createdAt?: string;
  reference?: string;
  notes?: string;
}

// -----------------------------------------------
// Main Screen
// -----------------------------------------------

export default function OrderDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const endpoint =
    type === 'purchases'
      ? `/purchases/orders/${id}`
      : `/sales/orders/${id}`;

  const { data: order, isLoading, isRefetching, refetch } = useQuery<OrderDetail>({
    queryKey: ['order', id, type],
    queryFn: async () => {
      const res = await apiClient.get(endpoint);
      return res.data;
    },
    enabled: !!id,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const headerTitle = order?.orderNumber
    ? `Order ${order.orderNumber}`
    : 'Order Details';

  if (isLoading || !order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details', headerShown: true, headerStyle: { backgroundColor: '#001529' }, headerTintColor: '#fff' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </>
    );
  }

  const contactName =
    order.contact?.displayName ||
    order.contact?.name ||
    order.customerName ||
    order.vendorName ||
    '-';
  const contactEmail = order.contact?.email || '-';
  const contactPhone = order.contact?.phone || null;

  const lineItems = order.items || order.lineItems || [];
  const subtotal = order.subtotal || order.total || 0;
  const taxAmount = order.taxAmount || 0;
  const discountAmount = order.discountAmount || 0;
  const grandTotal = order.grandTotal || order.total || 0;

  const orderDate = order.date || order.orderDate || order.createdAt;
  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  const statusColors = getStatusColors(order.status);
  const statusLabel = (order.status || 'DRAFT').replace(/_/g, ' ');

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerShown: true,
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>
            {order.orderNumber || `#${order.id.slice(0, 8)}`}
          </Text>
          <View
            style={[
              styles.headerStatusBadge,
              { backgroundColor: statusColors.bg },
            ]}
          >
            <Text
              style={[
                styles.headerStatusText,
                { color: statusColors.text },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Status Timeline */}
        <StatusTimeline
          currentStatus={order.status}
          type={type === 'purchases' ? 'purchases' : 'sales'}
        />

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {type === 'purchases' ? 'Vendor' : 'Customer'}
          </Text>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.contactDetail}>{contactEmail}</Text>
          {contactPhone && (
            <Text style={styles.contactDetail}>{contactPhone}</Text>
          )}
        </View>

        {/* Line Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Items ({lineItems.length})
          </Text>
          {lineItems.length === 0 ? (
            <Text style={styles.emptyText}>No items</Text>
          ) : (
            lineItems.map((item, i) => {
              const itemName = item.item?.name || item.name || item.description || 'Unnamed Item';
              const itemSku = item.item?.sku || item.sku || '';
              const unitPrice = item.unitPrice || item.price || 0;
              const lineTotal = item.total || item.quantity * unitPrice;

              return (
                <View
                  key={i}
                  style={[
                    styles.lineItem,
                    i < lineItems.length - 1 && styles.lineItemBorder,
                  ]}
                >
                  <View style={styles.lineItemInfo}>
                    <Text style={styles.lineItemName}>{itemName}</Text>
                    {itemSku ? (
                      <Text style={styles.lineItemSku}>{itemSku}</Text>
                    ) : null}
                  </View>
                  <View style={styles.lineItemPricing}>
                    <Text style={styles.lineItemQty}>
                      {item.quantity} x RM{' '}
                      {unitPrice.toLocaleString('en-MY', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={styles.lineItemTotal}>
                      RM{' '}
                      {lineTotal.toLocaleString('en-MY', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Totals Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              RM{' '}
              {subtotal.toLocaleString('en-MY', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#52c41a' }]}>
                -RM{' '}
                {discountAmount.toLocaleString('en-MY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>
                RM{' '}
                {taxAmount.toLocaleString('en-MY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              RM{' '}
              {grandTotal.toLocaleString('en-MY', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Date" value={formattedDate} />
          <DetailRow label="Reference" value={order.reference || '-'} />
          <DetailRow label="Notes" value={order.notes || '-'} />
        </View>
      </ScrollView>
    </>
  );
}

// -----------------------------------------------
// Sub-components
// -----------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// -----------------------------------------------
// Status Timeline component
// -----------------------------------------------

const SALES_STAGES = ['DRAFT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'];
const PURCHASE_STAGES = ['DRAFT', 'CONFIRMED', 'SENT', 'SHIPPED', 'DELIVERED'];
const TERMINAL_STATUSES = ['CANCELLED', 'VOID'];

interface StatusTimelineProps {
  currentStatus: string;
  type: 'sales' | 'purchases';
}

function StatusTimeline({ currentStatus, type }: StatusTimelineProps) {
  const stages = type === 'purchases' ? PURCHASE_STAGES : SALES_STAGES;
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus?.toUpperCase());
  const normalizedStatus = currentStatus?.toUpperCase() || 'DRAFT';
  const currentIndex = stages.indexOf(normalizedStatus);

  // If status is not in the standard pipeline (e.g. PAID, COMPLETED),
  // treat it as the last stage
  const effectiveIndex =
    currentIndex >= 0
      ? currentIndex
      : isTerminal
        ? -1
        : stages.length - 1;

  return (
    <View style={styles.timelineSection}>
      <Text style={styles.timelineSectionTitle}>Order Progress</Text>

      {isTerminal ? (
        <View style={styles.terminalBanner}>
          <Ionicons
            name={normalizedStatus === 'VOID' ? 'ban-outline' : 'close-circle-outline'}
            size={20}
            color="#ff4d4f"
          />
          <Text style={styles.terminalBannerText}>
            This order has been {normalizedStatus.toLowerCase()}.
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {stages.map((stage, index) => {
            const isCompleted = index <= effectiveIndex;
            const isCurrent = index === effectiveIndex;
            const isLast = index === stages.length - 1;
            const stageLabel = stage.replace(/_/g, ' ');

            return (
              <View key={stage} style={styles.timelineStep}>
                <View style={styles.timelineIndicator}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {isCompleted && !isCurrent && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                    {isCurrent && (
                      <View style={styles.timelineDotInner} />
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        isCompleted && index < effectiveIndex && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    isCompleted && styles.timelineLabelCompleted,
                    isCurrent && styles.timelineLabelCurrent,
                  ]}
                >
                  {stageLabel}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function getStatusColors(status: string): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: '#f0f0f0', text: '#8c8c8c' },
    CONFIRMED: { bg: '#e6f7ff', text: '#1890ff' },
    SENT: { bg: '#e6f7ff', text: '#1890ff' },
    PENDING: { bg: '#fff7e6', text: '#faad14' },
    PACKED: { bg: '#fff7e6', text: '#faad14' },
    SHIPPED: { bg: '#f6ffed', text: '#52c41a' },
    DELIVERED: { bg: '#f6ffed', text: '#52c41a' },
    COMPLETED: { bg: '#f6ffed', text: '#52c41a' },
    PAID: { bg: '#f6ffed', text: '#52c41a' },
    PARTIALLY_PAID: { bg: '#fff7e6', text: '#faad14' },
    OVERDUE: { bg: '#fff1f0', text: '#ff4d4f' },
    CANCELLED: { bg: '#fff1f0', text: '#ff4d4f' },
    VOID: { bg: '#f0f0f0', text: '#8c8c8c' },
  };
  return colorMap[status?.toUpperCase()] ?? { bg: '#f0f0f0', text: '#8c8c8c' };
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8c8c8c',
  },

  // Header
  header: {
    backgroundColor: '#001529',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Sections
  section: {
    margin: 12,
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

  // Contact
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  contactDetail: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 2,
  },

  // Line items
  lineItem: {
    paddingVertical: 10,
  },
  lineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineItemInfo: {},
  lineItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  lineItemSku: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },
  lineItemPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  lineItemQty: {
    fontSize: 13,
    color: '#434343',
  },
  lineItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1890ff',
  },

  // Totals
  totalSection: {
    marginHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  totalValue: {
    fontSize: 14,
    color: '#434343',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1890ff',
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f1f1f',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },

  // Empty
  emptyText: {
    fontSize: 14,
    color: '#bfbfbf',
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Status Timeline
  timelineSection: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  timelineSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f1f1f',
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#d9d9d9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: '#52c41a',
    borderColor: '#52c41a',
  },
  timelineDotCurrent: {
    backgroundColor: '#fff',
    borderColor: '#1890ff',
    borderWidth: 3,
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1890ff',
  },
  timelineLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#d9d9d9',
    top: 11,
    left: '50%',
    right: '-50%',
    zIndex: 0,
  },
  timelineLineCompleted: {
    backgroundColor: '#52c41a',
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#bfbfbf',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timelineLabelCompleted: {
    color: '#52c41a',
  },
  timelineLabelCurrent: {
    color: '#1890ff',
    fontWeight: '700',
  },

  // Terminal status banner
  terminalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f0',
    padding: 12,
    borderRadius: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ffa39e',
  },
  terminalBannerText: {
    fontSize: 14,
    color: '#ff4d4f',
    fontWeight: '500',
    flex: 1,
  },
});
