import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Vibration,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

// -----------------------------------------------
// Types
// -----------------------------------------------

interface Warehouse {
  id: string;
  name: string;
  code?: string;
  isDefault?: boolean;
}

interface ItemListItem {
  id: string;
  sku: string;
  name: string;
  nameMalay?: string | null;
  unit: string;
  stockOnHand: number;
  availableStock: number;
  isLowStock: boolean;
  category?: { id: string; name: string } | null;
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

interface StocktakeItem {
  id: string; // unique row key
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  systemStock: number;
  actualCount: string; // kept as string for TextInput
}

interface StockLevelEntry {
  itemId: string;
  warehouseId: string;
  stockOnHand: number;
  committedStock: number;
  item: {
    id: string;
    sku: string;
    name: string;
    costPrice: number;
    reorderLevel: number;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  availableStock: number;
  stockValue: number;
  isLowStock: boolean;
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function getVariance(actualStr: string, system: number): number | null {
  const actual = parseInt(actualStr, 10);
  if (isNaN(actual)) return null;
  return actual - system;
}

function varianceColor(variance: number | null): string {
  if (variance === null || variance === 0) return '#8c8c8c';
  return variance > 0 ? '#52c41a' : '#ff4d4f';
}

function varianceText(variance: number | null): string {
  if (variance === null) return '-';
  if (variance === 0) return '0';
  return variance > 0 ? `+${variance}` : `${variance}`;
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function StocktakeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  // Undo snackbar state
  const [undoItem, setUndoItem] = useState<{ item: StocktakeItem; index: number } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Success animation
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.3)).current;

  // Fetch warehouses
  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses');
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Auto-select default warehouse
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      const defaultWh = warehouses.find((w) => w.isDefault);
      setSelectedWarehouseId(defaultWh?.id ?? warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Fetch stock levels for the selected warehouse (used to get system stock)
  const { data: stockLevels } = useQuery<StockLevelEntry[]>({
    queryKey: ['stock-levels', selectedWarehouseId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/stock', {
        params: { warehouseId: selectedWarehouseId },
      });
      return res.data ?? [];
    },
    enabled: !!selectedWarehouseId,
  });

  // Search items for the add-item modal
  const { data: searchResults, isLoading: isSearching } = useQuery<ItemsListResponse>({
    queryKey: ['items-search-stocktake', searchQuery],
    queryFn: async () => {
      const res = await apiClient.get('/items', {
        params: { search: searchQuery || undefined, limit: 30, sortBy: 'name', sortOrder: 'asc' },
      });
      return res.data;
    },
    enabled: showSearchModal,
  });

  // -----------------------------------------------
  // Item management
  // -----------------------------------------------

  const addItem = useCallback(
    (item: ItemListItem) => {
      // Prevent duplicates
      if (items.some((i) => i.itemId === item.id)) {
        Alert.alert('Already Added', `${item.name} is already in the stocktake list.`);
        return;
      }

      // Find system stock for this item in the selected warehouse
      const stockEntry = stockLevels?.find((sl) => sl.itemId === item.id);
      const systemStock = stockEntry ? Number(stockEntry.stockOnHand) : 0;

      const newItem: StocktakeItem = {
        id: `${item.id}-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        unit: item.unit,
        systemStock,
        actualCount: '',
      };

      setItems((prev) => [...prev, newItem]);
    },
    [items, stockLevels],
  );

  const removeItem = useCallback(
    (index: number) => {
      const removedItem = items[index];
      setItems((prev) => prev.filter((_, i) => i !== index));

      // Show undo snackbar
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoItem({ item: removedItem, index });
      undoTimerRef.current = setTimeout(() => {
        setUndoItem(null);
      }, 4000);
    },
    [items],
  );

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setItems((prev) => {
      const copy = [...prev];
      copy.splice(undoItem.index, 0, undoItem.item);
      return copy;
    });
    setUndoItem(null);
  }, [undoItem]);

  const updateActualCount = useCallback((id: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, actualCount: cleaned } : item)),
    );
  }, []);

  // -----------------------------------------------
  // Barcode scanning
  // -----------------------------------------------

  const [permission, requestPermission] = useCameraPermissions();
  const [scanLocked, setScanLocked] = useState(false);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (scanLocked) return;
      setScanLocked(true);
      Vibration.vibrate(100);

      try {
        const res = await apiClient.get<ItemsListResponse>('/items', {
          params: { search: data, limit: 1 },
        });
        const found = res.data?.data ?? [];
        if (found.length > 0) {
          addItem(found[0]);
        } else {
          Alert.alert('Not Found', `No item found for code: ${data}`);
        }
      } catch {
        Alert.alert('Error', 'Failed to look up barcode.');
      } finally {
        // Small delay before allowing next scan
        setTimeout(() => setScanLocked(false), 1500);
      }
    },
    [scanLocked, addItem],
  );

  // -----------------------------------------------
  // Review calculations
  // -----------------------------------------------

  const itemsWithVariance = items.filter((item) => {
    const v = getVariance(item.actualCount, item.systemStock);
    return v !== null && v !== 0;
  });

  const itemsWithoutVariance = items.filter((item) => {
    const v = getVariance(item.actualCount, item.systemStock);
    return v === 0;
  });

  const itemsNotCounted = items.filter((item) => {
    return item.actualCount === '' || isNaN(parseInt(item.actualCount, 10));
  });

  // -----------------------------------------------
  // Submit
  // -----------------------------------------------

  const handleSubmit = useCallback(async () => {
    if (itemsWithVariance.length === 0) {
      Alert.alert('No Variances', 'There are no items with variance to submit.');
      return;
    }

    Alert.alert(
      'Confirm Stocktake',
      `You are about to submit ${itemsWithVariance.length} stock adjustment(s) for items with variance. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            setShowReviewModal(false);

            const today = new Date().toISOString().split('T')[0];
            const notes = `Stocktake adjustment on ${today}`;
            let successfulCount = 0;
            const errors: string[] = [];

            for (const item of itemsWithVariance) {
              const variance = getVariance(item.actualCount, item.systemStock);
              if (variance === null || variance === 0) continue;

              try {
                await apiClient.post('/inventory/adjustments', {
                  itemId: item.itemId,
                  warehouseId: selectedWarehouseId,
                  quantity: variance,
                  reason: 'CORRECTION',
                  notes,
                });
                successfulCount++;
              } catch (error: any) {
                const msg =
                  error.response?.data?.message || `Failed to adjust ${item.itemName}`;
                errors.push(msg);
              }
            }

            setIsSubmitting(false);

            if (errors.length > 0 && successfulCount === 0) {
              Alert.alert('Error', `All adjustments failed.\n\n${errors.join('\n')}`);
            } else if (errors.length > 0) {
              Alert.alert(
                'Partial Success',
                `${successfulCount} adjustment(s) saved.\n${errors.length} failed:\n${errors.join('\n')}`,
              );
            }

            if (successfulCount > 0) {
              // Invalidate related queries
              queryClient.invalidateQueries({ queryKey: ['items'] });
              queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
              queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
              queryClient.invalidateQueries({ queryKey: ['adjustments'] });

              // Show success animation
              setSuccessCount(successfulCount);
              setShowSuccess(true);
              successOpacity.setValue(0);
              successScale.setValue(0.3);

              Animated.parallel([
                Animated.timing(successOpacity, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }),
                Animated.spring(successScale, {
                  toValue: 1,
                  friction: 4,
                  tension: 40,
                  useNativeDriver: true,
                }),
              ]).start();

              // Auto dismiss after 2.5s
              setTimeout(() => {
                Animated.timing(successOpacity, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setShowSuccess(false);
                  router.back();
                });
              }, 2500);
            }
          },
        },
      ],
    );
  }, [itemsWithVariance, selectedWarehouseId, queryClient, router, successOpacity, successScale]);

  // -----------------------------------------------
  // Render item row
  // -----------------------------------------------

  const renderStocktakeItem = useCallback(
    ({ item, index }: { item: StocktakeItem; index: number }) => {
      const variance = getVariance(item.actualCount, item.systemStock);
      const vColor = varianceColor(variance);

      return (
        <View style={styles.itemRow}>
          <View style={styles.itemRowHeader}>
            <View style={styles.itemRowInfo}>
              <Text style={styles.itemRowName} numberOfLines={1}>
                {item.itemName}
              </Text>
              <Text style={styles.itemRowSku}>{item.sku}</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeItem(index)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.itemName}`}
            >
              <Ionicons name="close-circle-outline" size={22} color="#ff4d4f" />
            </TouchableOpacity>
          </View>

          <View style={styles.itemRowColumns}>
            <View style={styles.itemRowCol}>
              <Text style={styles.colLabel}>System</Text>
              <Text style={styles.colValueSystem}>
                {item.systemStock} {item.unit}
              </Text>
            </View>

            <View style={styles.itemRowCol}>
              <Text style={styles.colLabel}>Actual</Text>
              <TextInput
                style={styles.actualInput}
                value={item.actualCount}
                onChangeText={(val) => updateActualCount(item.id, val)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#bfbfbf"
                textAlign="center"
                maxLength={8}
                accessibilityLabel={`Actual count for ${item.itemName}`}
              />
            </View>

            <View style={styles.itemRowCol}>
              <Text style={styles.colLabel}>Variance</Text>
              <Text style={[styles.colValueVariance, { color: vColor }]}>
                {varianceText(variance)}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [removeItem, updateActualCount],
  );

  const keyExtractor = useCallback((item: StocktakeItem) => item.id, []);

  // -----------------------------------------------
  // Search modal item render
  // -----------------------------------------------

  const renderSearchItem = useCallback(
    ({ item }: { item: ItemListItem }) => {
      const alreadyAdded = items.some((i) => i.itemId === item.id);

      return (
        <TouchableOpacity
          style={[styles.searchResultItem, alreadyAdded && styles.searchResultItemDisabled]}
          onPress={() => {
            if (!alreadyAdded) {
              addItem(item);
              setShowSearchModal(false);
              setSearchQuery('');
            }
          }}
          disabled={alreadyAdded}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name} to stocktake`}
        >
          <View style={styles.searchResultInfo}>
            <Text style={styles.searchResultName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.searchResultSku}>
              {item.sku} {item.category ? `  |  ${item.category.name}` : ''}
            </Text>
          </View>
          {alreadyAdded ? (
            <Ionicons name="checkmark-circle" size={20} color="#52c41a" />
          ) : (
            <Ionicons name="add-circle-outline" size={20} color="#1890ff" />
          )}
        </TouchableOpacity>
      );
    },
    [items, addItem],
  );

  // -----------------------------------------------
  // Render
  // -----------------------------------------------

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Batch Stocktake',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Step 1: Warehouse selector */}
          <View style={styles.warehouseSection}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="business-outline" size={14} color="#434343" /> Warehouse
            </Text>
            {isLoadingWarehouses ? (
              <ActivityIndicator size="small" color="#1890ff" style={{ paddingVertical: 12 }} />
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
                      onPress={() => {
                        if (wh.id === selectedWarehouseId) return;
                        // Reset items when warehouse changes if items exist
                        if (items.length > 0) {
                          Alert.alert(
                            'Change Warehouse?',
                            'Changing warehouse will clear your current stocktake items.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Change',
                                onPress: () => {
                                  setSelectedWarehouseId(wh.id);
                                  setItems([]);
                                },
                              },
                            ],
                          );
                        } else {
                          setSelectedWarehouseId(wh.id);
                        }
                      }}
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
              <Text style={styles.noWarehouseText}>No warehouses found.</Text>
            )}
          </View>

          {/* Step 2: Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSearchQuery('');
                setShowSearchModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Search and add item"
            >
              <Ionicons name="search-outline" size={18} color="#1890ff" />
              <Text style={styles.actionButtonText}>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setScanLocked(false);
                setShowScanModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Scan barcode to add item"
            >
              <Ionicons name="barcode-outline" size={18} color="#1890ff" />
              <Text style={styles.actionButtonText}>Scan</Text>
            </TouchableOpacity>

            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{items.length} item(s)</Text>
            </View>
          </View>

          {/* Stocktake items list */}
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#d9d9d9" />
              <Text style={styles.emptyTitle}>No items added yet</Text>
              <Text style={styles.emptySubtitle}>
                Use "Add Item" to search or "Scan" to add items via barcode
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={keyExtractor}
              renderItem={renderStocktakeItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Floating Review button */}
          {items.length > 0 && (
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => setShowReviewModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Review stocktake"
              >
                <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                <Text style={styles.reviewButtonText}>Review & Submit</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Undo snackbar */}
          {undoItem && (
            <View style={styles.undoSnackbar}>
              <Text style={styles.undoSnackbarText} numberOfLines={1}>
                Removed "{undoItem.item.itemName}"
              </Text>
              <TouchableOpacity
                onPress={handleUndo}
                accessibilityRole="button"
                accessibilityLabel="Undo remove"
              >
                <Text style={styles.undoButtonText}>UNDO</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ====== Search Modal ====== */}
        <Modal
          visible={showSearchModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSearchModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Close search"
              >
                <Ionicons name="close" size={24} color="#434343" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="#8c8c8c" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, SKU, part number..."
                placeholderTextColor="#bfbfbf"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel="Search items"
              />
            </View>

            {isSearching ? (
              <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={searchResults?.data ?? []}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchItem}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchText}>
                      {searchQuery ? 'No items match your search' : 'Type to search for items'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>

        {/* ====== Scan Modal ====== */}
        <Modal
          visible={showScanModal}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowScanModal(false)}
        >
          <View style={styles.scanModalContainer}>
            {!permission?.granted ? (
              <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={64} color="#8c8c8c" />
                <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                <Text style={styles.permissionText}>
                  Allow camera access to scan barcodes for stocktake.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={requestPermission}
                  accessibilityRole="button"
                  accessibilityLabel="Grant camera permission"
                >
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    'ean13',
                    'ean8',
                    'upc_a',
                    'upc_e',
                    'code128',
                    'code39',
                    'qr',
                  ],
                }}
                onBarcodeScanned={scanLocked ? undefined : handleBarCodeScanned}
              >
                <View style={styles.scanOverlay}>
                  <View style={styles.scanOverlayTop} />
                  <View style={styles.scanOverlayMiddle}>
                    <View style={styles.scanOverlaySide} />
                    <View style={styles.scanArea}>
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.scanOverlaySide} />
                  </View>
                  <View style={styles.scanOverlayTop} />
                </View>
              </CameraView>
            )}

            {/* Scan bottom bar */}
            <View style={styles.scanBottomBar}>
              <View style={styles.scanInfoRow}>
                <Ionicons
                  name={scanLocked ? 'hourglass-outline' : 'barcode-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.scanInfoText}>
                  {scanLocked
                    ? 'Processing...'
                    : 'Point camera at barcode to add item'}
                </Text>
              </View>
              <Text style={styles.scanItemCount}>
                {items.length} item(s) in stocktake
              </Text>
              <TouchableOpacity
                style={styles.scanDoneButton}
                onPress={() => setShowScanModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Done scanning"
              >
                <Text style={styles.scanDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ====== Review Modal ====== */}
        <Modal
          visible={showReviewModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stocktake Review</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close review"
              >
                <Ionicons name="close" size={24} color="#434343" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Summary cards */}
              <View style={styles.reviewSummary}>
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewCardValue}>{items.length}</Text>
                  <Text style={styles.reviewCardLabel}>Total Items</Text>
                </View>
                <View style={[styles.reviewCard, { borderLeftColor: '#ff4d4f' }]}>
                  <Text style={[styles.reviewCardValue, { color: '#ff4d4f' }]}>
                    {itemsWithVariance.length}
                  </Text>
                  <Text style={styles.reviewCardLabel}>With Variance</Text>
                </View>
                <View style={[styles.reviewCard, { borderLeftColor: '#52c41a' }]}>
                  <Text style={[styles.reviewCardValue, { color: '#52c41a' }]}>
                    {itemsWithoutVariance.length}
                  </Text>
                  <Text style={styles.reviewCardLabel}>No Variance</Text>
                </View>
              </View>

              {itemsNotCounted.length > 0 && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={16} color="#faad14" />
                  <Text style={styles.warningText}>
                    {itemsNotCounted.length} item(s) have not been counted yet
                  </Text>
                </View>
              )}

              {/* Items with variance */}
              {itemsWithVariance.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>
                    Items with Variance ({itemsWithVariance.length})
                  </Text>
                  {itemsWithVariance.map((item) => {
                    const variance = getVariance(item.actualCount, item.systemStock);
                    return (
                      <View key={item.id} style={styles.reviewRow}>
                        <View style={styles.reviewRowInfo}>
                          <Text style={styles.reviewRowName} numberOfLines={1}>
                            {item.itemName}
                          </Text>
                          <Text style={styles.reviewRowSku}>{item.sku}</Text>
                        </View>
                        <View style={styles.reviewRowNumbers}>
                          <Text style={styles.reviewRowSystem}>
                            {item.systemStock} {'->'} {item.actualCount}
                          </Text>
                          <Text
                            style={[
                              styles.reviewRowVariance,
                              { color: varianceColor(variance) },
                            ]}
                          >
                            {varianceText(variance)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Items without variance */}
              {itemsWithoutVariance.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>
                    No Variance ({itemsWithoutVariance.length})
                  </Text>
                  {itemsWithoutVariance.map((item) => (
                    <View key={item.id} style={styles.reviewRow}>
                      <View style={styles.reviewRowInfo}>
                        <Text style={styles.reviewRowName} numberOfLines={1}>
                          {item.itemName}
                        </Text>
                        <Text style={styles.reviewRowSku}>{item.sku}</Text>
                      </View>
                      <View style={styles.reviewRowNumbers}>
                        <Ionicons name="checkmark-circle" size={18} color="#52c41a" />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Submit button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  itemsWithVariance.length === 0 && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={itemsWithVariance.length === 0 || isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={`Submit ${itemsWithVariance.length} adjustments`}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                )}
                <Text style={styles.submitButtonText}>
                  {isSubmitting
                    ? 'Submitting...'
                    : `Submit ${itemsWithVariance.length} Adjustment(s)`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

        {/* ====== Submitting overlay ====== */}
        {isSubmitting && (
          <View style={styles.submittingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.submittingText}>Submitting adjustments...</Text>
          </View>
        )}

        {/* ====== Success overlay ====== */}
        {showSuccess && (
          <View style={styles.successOverlay}>
            <Animated.View
              style={[
                styles.successContent,
                {
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                },
              ]}
            >
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={styles.successTitle}>Stocktake Complete</Text>
              <Text style={styles.successSubtitle}>
                {successCount} adjustment{successCount !== 1 ? 's' : ''} saved
                successfully
              </Text>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

// -----------------------------------------------
// Constants
// -----------------------------------------------

const SCAN_AREA_SIZE = 240;

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

  // Warehouse section
  warehouseSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#434343',
    marginBottom: 8,
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

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1890ff',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1890ff',
  },
  itemCountBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Item rows
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  itemRow: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  itemRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemRowInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1f1f',
  },
  itemRowSku: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  itemRowColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemRowCol: {
    flex: 1,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 10,
    color: '#8c8c8c',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  colValueSystem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#434343',
  },
  actualInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
    minWidth: 72,
    textAlign: 'center',
  },
  colValueVariance: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Floating button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1890ff',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Undo snackbar
  undoSnackbar: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  undoSnackbarText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  undoButtonText: {
    color: '#40a9ff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f1f1f',
  },

  // Search
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f1f1f',
    paddingVertical: 6,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  searchResultItemDisabled: {
    opacity: 0.5,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  searchResultSku: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptySearch: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  emptySearchText: {
    fontSize: 14,
    color: '#bfbfbf',
    textAlign: 'center',
  },

  // Scan modal
  scanModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f1f1f',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#1890ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanOverlay: {
    flex: 1,
  },
  scanOverlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scanOverlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  scanOverlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#52c41a',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanBottomBar: {
    backgroundColor: '#001529',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanInfoText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  scanItemCount: {
    color: '#8c8c8c',
    fontSize: 12,
    marginTop: 4,
  },
  scanDoneButton: {
    backgroundColor: '#1890ff',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  scanDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Review modal
  reviewSummary: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 8,
  },
  reviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  reviewCardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  reviewCardLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderWidth: 1,
    borderColor: '#ffe58f',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#ad8b00',
    flex: 1,
  },

  reviewSection: {
    marginHorizontal: 12,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
    marginBottom: 8,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  reviewRowInfo: {
    flex: 1,
    marginRight: 12,
  },
  reviewRowName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  reviewRowSku: {
    fontSize: 11,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  reviewRowNumbers: {
    alignItems: 'flex-end',
  },
  reviewRowSystem: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  reviewRowVariance: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#52c41a',
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 20,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Submitting overlay
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#52c41a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  successSubtitle: {
    color: '#d9d9d9',
    fontSize: 15,
    marginTop: 8,
  },
});
