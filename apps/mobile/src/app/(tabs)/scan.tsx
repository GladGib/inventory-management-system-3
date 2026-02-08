import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

// -----------------------------------------------
// Types mirroring the actual backend response from
// GET /items  (ItemsService.findAll)
// -----------------------------------------------

interface ItemCategory {
  id: string;
  name: string;
}

interface ScannedItem {
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
  stockOnHand: number;
  committedStock: number;
  availableStock: number;
  isLowStock: boolean;
  category?: ItemCategory | null;
  taxRate?: { id: string; name: string; rate: number } | null;
}

interface ItemsListResponse {
  data: ScannedItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedItem | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const router = useRouter();

  // Camera permission not yet determined
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
      </View>
    );
  }

  // Camera permission denied
  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="camera-outline" size={64} color="#8c8c8c" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          Allow camera access to scan barcodes and QR codes for quick item lookup.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Ionicons name="lock-open-outline" size={18} color="#fff" />
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;
    setScanned(true);
    setIsSearching(true);
    setLastScannedCode(data);
    Vibration.vibrate(100);

    try {
      // Search for item by barcode/SKU/part number using the backend search param
      const res = await apiClient.get<ItemsListResponse>('/items', {
        params: { search: data, limit: 1 },
      });

      const items = res.data?.data ?? [];

      if (items.length > 0) {
        setScanResult(items[0]);
      } else {
        Alert.alert(
          'Not Found',
          `No item found for code: ${data}`,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                setScanned(false);
                setScanResult(null);
                setLastScannedCode('');
              },
            },
          ],
        );
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to lookup barcode. Please try again.';
      Alert.alert('Error', message, [
        {
          text: 'Retry',
          onPress: () => {
            setScanned(false);
            setScanResult(null);
          },
        },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScanResult(null);
    setLastScannedCode('');
  };

  // -----------------------------------------------
  // Result view after a successful scan
  // -----------------------------------------------

  if (scanResult) {
    const stockColor =
      scanResult.stockOnHand <= 0
        ? '#ff4d4f'
        : scanResult.isLowStock
          ? '#faad14'
          : '#52c41a';

    const stockLabel =
      scanResult.stockOnHand <= 0
        ? 'OUT OF STOCK'
        : scanResult.isLowStock
          ? 'LOW STOCK'
          : 'IN STOCK';

    return (
      <View style={styles.resultContainer}>
        {/* Header */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultHeaderTitle}>Item Found</Text>
          <Text style={styles.resultHeaderCode}>
            Scanned: {lastScannedCode}
          </Text>
        </View>

        {/* Item card */}
        <View style={styles.resultCard}>
          <View style={styles.resultCardHeader}>
            <Text style={styles.itemName} numberOfLines={2}>
              {scanResult.name}
            </Text>
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '1A' }]}>
              <Text style={[styles.stockBadgeText, { color: stockColor }]}>
                {stockLabel}
              </Text>
            </View>
          </View>

          {scanResult.nameMalay ? (
            <Text style={styles.itemNameMalay}>{scanResult.nameMalay}</Text>
          ) : null}

          <Text style={styles.itemSku}>SKU: {scanResult.sku}</Text>

          {scanResult.partNumber ? (
            <Text style={styles.itemPartNumber}>
              Part No: {scanResult.partNumber}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.resultDetails}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Selling Price</Text>
              <Text style={styles.detailValue}>
                RM {Number(scanResult.sellingPrice).toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Cost Price</Text>
              <Text style={styles.detailValue}>
                RM {Number(scanResult.costPrice).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.resultDetails}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Stock on Hand</Text>
              <Text style={[styles.detailValue, { color: stockColor, fontWeight: '700' }]}>
                {scanResult.stockOnHand} {scanResult.unit}
              </Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Available</Text>
              <Text style={styles.detailValue}>
                {scanResult.availableStock} {scanResult.unit}
              </Text>
            </View>
          </View>

          {scanResult.category ? (
            <View style={styles.categoryRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.categoryValue}>{scanResult.category.name}</Text>
            </View>
          ) : null}

          {scanResult.brand ? (
            <View style={styles.categoryRow}>
              <Text style={styles.detailLabel}>Brand</Text>
              <Text style={styles.categoryValue}>{scanResult.brand}</Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push(`/items/${scanResult.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${scanResult.name}`}
          >
            <Ionicons name="eye-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSuccess]}
            onPress={() =>
              router.push(
                `/stock-adjust?itemId=${scanResult.id}&itemName=${encodeURIComponent(scanResult.name)}`,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Adjust stock for ${scanResult.name}`}
          >
            <Ionicons name="swap-vertical-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Adjust Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonWarning]}
            onPress={() =>
              router.push(`/quick-sale?itemId=${scanResult.id}`)
            }
            accessibilityRole="button"
            accessibilityLabel={`Quick sale for ${scanResult.name}`}
          >
            <Ionicons name="cart-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Quick Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Scan again */}
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={resetScanner}
          accessibilityRole="button"
          accessibilityLabel="Scan another barcode"
        >
          <Ionicons name="barcode-outline" size={20} color="#1890ff" />
          <Text style={styles.scanAgainText}>Scan Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -----------------------------------------------
  // Camera / scanner view
  // -----------------------------------------------

  return (
    <View style={styles.cameraContainer}>
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
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={styles.overlaySection} />

          {/* Middle row with scan area */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySection} />
            <View style={styles.scanArea}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <View style={styles.overlaySection} />
          </View>

          {/* Bottom overlay */}
          <View style={styles.overlaySection} />
        </View>
      </CameraView>

      {/* Instruction bar */}
      <View style={styles.instructionBar}>
        {isSearching ? (
          <View style={styles.instructionRow}>
            <ActivityIndicator size="small" color="#1890ff" />
            <Text style={styles.instructionText}>Looking up item...</Text>
          </View>
        ) : (
          <View style={styles.instructionRow}>
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={styles.instructionText}>
              Point camera at a barcode or QR code
            </Text>
          </View>
        )}
        <Text style={styles.instructionSubtext}>
          Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR
        </Text>
      </View>
    </View>
  );
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const SCAN_AREA_SIZE = 260;

const styles = StyleSheet.create({
  // Permission screen
  centeredContainer: {
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1890ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera view
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },

  // Overlay
  overlay: {
    flex: 1,
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    backgroundColor: 'transparent',
  },

  // Corner markers for the scan area
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#1890ff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },

  // Instruction bar
  instructionBar: {
    backgroundColor: '#001529',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  instructionSubtext: {
    color: '#8c8c8c',
    fontSize: 11,
    marginTop: 4,
  },

  // Result screen
  resultContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resultHeader: {
    backgroundColor: '#001529',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  resultHeaderCode: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 4,
    fontFamily: 'monospace',
  },

  // Result card
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f1f1f',
    flex: 1,
    marginRight: 12,
  },
  itemNameMalay: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemSku: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  itemPartNumber: {
    fontSize: 13,
    color: '#8c8c8c',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  resultDetails: {
    flexDirection: 'row',
    marginBottom: 8,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#434343',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  categoryValue: {
    fontSize: 13,
    color: '#434343',
    fontWeight: '500',
  },

  // Action buttons
  actionButtons: {
    paddingHorizontal: 12,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: '#1890ff',
  },
  actionButtonSuccess: {
    backgroundColor: '#52c41a',
  },
  actionButtonWarning: {
    backgroundColor: '#faad14',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Scan again
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 14,
    gap: 8,
  },
  scanAgainText: {
    color: '#1890ff',
    fontSize: 16,
    fontWeight: '600',
  },
});
