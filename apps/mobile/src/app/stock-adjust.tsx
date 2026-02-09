import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { useNetwork } from './_layout';
import { OfflineQueue } from '../services/offline-queue';

// -----------------------------------------------
// Types aligned with backend CreateAdjustmentDto
// -----------------------------------------------

/**
 * The backend expects these exact enum values for the `reason` field.
 * See: apps/api/src/modules/inventory/dto/create-adjustment.dto.ts
 */
type AdjustmentReason =
  | 'OPENING_STOCK'
  | 'DAMAGE'
  | 'LOSS'
  | 'RETURN'
  | 'FOUND'
  | 'CORRECTION'
  | 'OTHER';

interface AdjustmentReasonOption {
  value: AdjustmentReason;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

/**
 * The adjustment direction controls whether the quantity sent to
 * the backend is positive (add stock) or negative (remove stock).
 */
type AdjustmentDirection = 'ADD' | 'SUBTRACT';

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

// -----------------------------------------------
// Constants
// -----------------------------------------------

const REASON_OPTIONS: AdjustmentReasonOption[] = [
  {
    value: 'CORRECTION',
    label: 'Correction',
    icon: 'build-outline',
    description: 'Fix a stock count discrepancy',
  },
  {
    value: 'DAMAGE',
    label: 'Damage',
    icon: 'alert-circle-outline',
    description: 'Items damaged or unusable',
  },
  {
    value: 'LOSS',
    label: 'Loss',
    icon: 'remove-circle-outline',
    description: 'Items lost, stolen, or missing',
  },
  {
    value: 'RETURN',
    label: 'Return',
    icon: 'return-down-back-outline',
    description: 'Customer or supplier return',
  },
  {
    value: 'FOUND',
    label: 'Found',
    icon: 'search-outline',
    description: 'Previously missing items found',
  },
  {
    value: 'OPENING_STOCK',
    label: 'Opening Stock',
    icon: 'archive-outline',
    description: 'Initial stock count entry',
  },
  {
    value: 'OTHER',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    description: 'Other reason (specify in notes)',
  },
];

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function StockAdjustScreen() {
  const { itemId, itemName } = useLocalSearchParams<{
    itemId: string;
    itemName: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { isConnected, refreshPendingCount } = useNetwork();

  const [direction, setDirection] = useState<AdjustmentDirection>('ADD');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<AdjustmentReason>('CORRECTION');
  const [notes, setNotes] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Fetch warehouses to populate the warehouse picker.
  // The backend requires a warehouseId for stock adjustments.
  const {
    data: warehouses,
    isLoading: isLoadingWarehouses,
  } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      // The backend may return { data: [...] } or a plain array
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Auto-select the default warehouse once loaded
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      const defaultWh = warehouses.find((w) => w.isDefault);
      setSelectedWarehouseId(defaultWh?.id ?? warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Fetch current item stock info for context
  const { data: itemStock } = useQuery({
    queryKey: ['inventory-stock', itemId],
    queryFn: async () => {
      const res = await apiClient.get(`/inventory/stock/${itemId}`);
      return res.data;
    },
    enabled: !!itemId,
  });

  // Submit adjustment mutation -- supports offline queueing
  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Please enter a valid positive quantity.');
      }

      // The backend expects a signed quantity:
      // positive to add stock, negative to remove stock.
      const signedQuantity = direction === 'SUBTRACT' ? -qty : qty;

      const payload = {
        itemId,
        warehouseId: selectedWarehouseId,
        quantity: signedQuantity,
        reason,
        notes: notes.trim() || undefined,
      };

      // If offline, enqueue the adjustment for later sync
      if (!isConnected) {
        await OfflineQueue.enqueue('adjustment', payload);
        await refreshPendingCount();
        return { _offline: true };
      }

      const res = await apiClient.post('/inventory/adjustments', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data?._offline) {
        // Queued offline -- show a specific message and navigate back
        Alert.alert(
          'Saved Offline',
          'Adjustment saved offline. It will sync when you reconnect.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }

      // Online success -- invalidate related queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', itemId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });

      Alert.alert(
        'Success',
        `Stock ${direction === 'ADD' ? 'increased' : 'decreased'} by ${quantity} unit(s).`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      const message =
        error.message ||
        error.response?.data?.message ||
        'Failed to adjust stock. Please try again.';
      Alert.alert('Error', message);
    },
  });

  const parsedQty = parseInt(quantity, 10);
  const isValid =
    !isNaN(parsedQty) &&
    parsedQty > 0 &&
    !!selectedWarehouseId &&
    !!reason;

  const selectedReason = REASON_OPTIONS.find((r) => r.value === reason);

  // Find current stock for the selected warehouse
  const currentWarehouseStock = Array.isArray(itemStock)
    ? itemStock.find((s: any) => s.warehouseId === selectedWarehouseId)
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Stock Adjustment',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Item info header */}
          <View style={styles.header}>
            <Ionicons name="swap-vertical" size={24} color="#1890ff" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {itemName ? decodeURIComponent(itemName) : 'Item'}
              </Text>
              {currentWarehouseStock ? (
                <Text style={styles.headerSubtitle}>
                  Current stock: {currentWarehouseStock.quantity}{' '}
                  {currentWarehouseStock.unit || 'units'}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Warehouse selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Warehouse</Text>
            {isLoadingWarehouses ? (
              <ActivityIndicator
                size="small"
                color="#1890ff"
                style={styles.warehouseLoader}
              />
            ) : warehouses && warehouses.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.warehouseScroll}
              >
                <View style={styles.warehouseChips}>
                  {warehouses.map((wh) => (
                    <TouchableOpacity
                      key={wh.id}
                      style={[
                        styles.warehouseChip,
                        selectedWarehouseId === wh.id && styles.warehouseChipActive,
                      ]}
                      onPress={() => setSelectedWarehouseId(wh.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedWarehouseId === wh.id }}
                      accessibilityLabel={`Warehouse: ${wh.name}`}
                    >
                      <Text
                        style={[
                          styles.warehouseChipText,
                          selectedWarehouseId === wh.id && styles.warehouseChipTextActive,
                        ]}
                      >
                        {wh.name}
                      </Text>
                      {wh.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noWarehouseText}>
                No warehouses found. Please add a warehouse first.
              </Text>
            )}
          </View>

          {/* Direction selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Adjustment Type</Text>
            <View style={styles.directionButtons}>
              <TouchableOpacity
                style={[
                  styles.directionButton,
                  direction === 'ADD' && styles.directionButtonAddActive,
                ]}
                onPress={() => setDirection('ADD')}
                accessibilityRole="radio"
                accessibilityState={{ selected: direction === 'ADD' }}
                accessibilityLabel="Add stock"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={22}
                  color={direction === 'ADD' ? '#fff' : '#52c41a'}
                />
                <Text
                  style={[
                    styles.directionButtonText,
                    direction === 'ADD' && styles.directionButtonTextActive,
                  ]}
                >
                  Add Stock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.directionButton,
                  direction === 'SUBTRACT' && styles.directionButtonSubtractActive,
                ]}
                onPress={() => setDirection('SUBTRACT')}
                accessibilityRole="radio"
                accessibilityState={{ selected: direction === 'SUBTRACT' }}
                accessibilityLabel="Remove stock"
              >
                <Ionicons
                  name="remove-circle-outline"
                  size={22}
                  color={direction === 'SUBTRACT' ? '#fff' : '#ff4d4f'}
                />
                <Text
                  style={[
                    styles.directionButtonText,
                    direction === 'SUBTRACT' && styles.directionButtonTextActive,
                  ]}
                >
                  Remove Stock
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quantity input */}
          <View style={styles.section}>
            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.quantityAdjustButton}
                onPress={() => {
                  const current = parseInt(quantity, 10) || 0;
                  if (current > 1) setQuantity(String(current - 1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Ionicons name="remove" size={24} color="#434343" />
              </TouchableOpacity>

              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={(text) => {
                  // Only allow digits
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setQuantity(cleaned);
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#bfbfbf"
                textAlign="center"
                maxLength={8}
                accessibilityLabel="Quantity to adjust"
              />

              <TouchableOpacity
                style={styles.quantityAdjustButton}
                onPress={() => {
                  const current = parseInt(quantity, 10) || 0;
                  setQuantity(String(current + 1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Ionicons name="add" size={24} color="#434343" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reason selector */}
          <View style={styles.section}>
            <Text style={styles.label}>Reason</Text>
            <View style={styles.reasonGrid}>
              {REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.reasonChip,
                    reason === option.value && styles.reasonChipActive,
                  ]}
                  onPress={() => setReason(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reason === option.value }}
                  accessibilityLabel={`Reason: ${option.label} - ${option.description}`}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={reason === option.value ? '#fff' : '#8c8c8c'}
                  />
                  <Text
                    style={[
                      styles.reasonChipText,
                      reason === option.value && styles.reasonChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedReason ? (
              <Text style={styles.reasonDescription}>
                {selectedReason.description}
              </Text>
            ) : null}
          </View>

          {/* Notes input */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Notes{' '}
              <Text style={styles.labelOptional}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter additional notes for this adjustment..."
              placeholderTextColor="#bfbfbf"
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Adjustment notes"
            />
            {notes.length > 0 ? (
              <Text style={styles.charCount}>{notes.length}/500</Text>
            ) : null}
          </View>

          {/* Summary */}
          {isValid ? (
            <View style={styles.summaryCard}>
              <Ionicons name="information-circle-outline" size={18} color="#1890ff" />
              <Text style={styles.summaryText}>
                This will{' '}
                <Text style={{ fontWeight: '700' }}>
                  {direction === 'ADD' ? 'add' : 'remove'} {quantity}
                </Text>{' '}
                unit(s) {direction === 'ADD' ? 'to' : 'from'} stock due to{' '}
                <Text style={{ fontWeight: '700' }}>
                  {selectedReason?.label?.toLowerCase()}
                </Text>
                .
              </Text>
            </View>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              direction === 'ADD'
                ? styles.submitButtonAdd
                : styles.submitButtonSubtract,
              (!isValid || mutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={`Submit stock adjustment: ${direction === 'ADD' ? 'add' : 'remove'} ${quantity || 0} units`}
            accessibilityState={{ disabled: !isValid || mutation.isPending }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={direction === 'ADD' ? 'add-circle' : 'remove-circle'}
                size={20}
                color="#fff"
              />
            )}
            <Text style={styles.submitButtonText}>
              {mutation.isPending
                ? 'Submitting...'
                : `${direction === 'ADD' ? 'Add' : 'Remove'} Stock`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
  },

  // Sections
  section: {
    marginHorizontal: 12,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
    marginBottom: 8,
  },
  labelOptional: {
    fontWeight: '400',
    color: '#bfbfbf',
  },

  // Warehouse selector
  warehouseLoader: {
    paddingVertical: 12,
  },
  warehouseScroll: {
    flexGrow: 0,
  },
  warehouseChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  warehouseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    gap: 6,
  },
  warehouseChipActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  warehouseChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#434343',
  },
  warehouseChipTextActive: {
    color: '#fff',
  },
  defaultBadge: {
    backgroundColor: 'rgba(24, 144, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1890ff',
  },
  noWarehouseText: {
    fontSize: 13,
    color: '#ff4d4f',
    fontStyle: 'italic',
  },

  // Direction selector
  directionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    gap: 6,
  },
  directionButtonAddActive: {
    backgroundColor: '#52c41a',
    borderColor: '#52c41a',
  },
  directionButtonSubtractActive: {
    backgroundColor: '#ff4d4f',
    borderColor: '#ff4d4f',
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
  },
  directionButtonTextActive: {
    color: '#fff',
  },

  // Quantity input
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityAdjustButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },

  // Reason selector
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    gap: 4,
  },
  reasonChipActive: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#434343',
  },
  reasonChipTextActive: {
    color: '#fff',
  },
  reasonDescription: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Notes input
  notesInput: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    fontSize: 15,
    color: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    minHeight: 80,
  },
  charCount: {
    fontSize: 11,
    color: '#bfbfbf',
    textAlign: 'right',
    marginTop: 4,
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#434343',
    lineHeight: 20,
  },

  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 20,
    gap: 8,
  },
  submitButtonAdd: {
    backgroundColor: '#52c41a',
  },
  submitButtonSubtract: {
    backgroundColor: '#ff4d4f',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
