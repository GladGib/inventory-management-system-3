import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface CartItem {
  itemId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function QuickSaleScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');

  // If itemId passed, fetch and add to cart
  const { data: initialItem } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      const res = await apiClient.get(`/items/${itemId}`);
      return res.data;
    },
    enabled: !!itemId,
  });

  useEffect(() => {
    if (initialItem && cart.length === 0) {
      addToCart(initialItem);
    }
  }, [initialItem]);

  const addToCart = (item: any) => {
    const existing = cart.find((c) => c.itemId === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.itemId === item.id
            ? {
                ...c,
                quantity: c.quantity + 1,
                total: (c.quantity + 1) * c.unitPrice,
              }
            : c,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unitPrice: item.sellingPrice,
          total: item.sellingPrice,
        },
      ]);
    }
  };

  const updateQuantity = (targetItemId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.itemId !== targetItemId));
    } else {
      setCart(
        cart.map((c) =>
          c.itemId === targetItemId
            ? { ...c, quantity: qty, total: qty * c.unitPrice }
            : c,
        ),
      );
    }
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const createSale = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/sales/orders', {
        customerName: customerName || 'Walk-in Customer',
        items: cart.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
        status: 'CONFIRMED',
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      Alert.alert(
        'Sale Created',
        `Order #${data.orderNumber || data.id} created successfully`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create sale',
      );
    },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quick Sale</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Customer (Optional)</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Walk-in Customer"
          placeholderTextColor="#bfbfbf"
          accessibilityLabel="Customer name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Cart ({cart.length} items)</Text>
        {cart.map((item) => (
          <View key={item.itemId} style={styles.cartItem}>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <Text style={styles.cartItemPrice}>
                RM {item.unitPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => updateQuantity(item.itemId, item.quantity - 1)}
                accessibilityRole="button"
                accessibilityLabel={`Decrease quantity of ${item.name}`}
              >
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => updateQuantity(item.itemId, item.quantity + 1)}
                accessibilityRole="button"
                accessibilityLabel={`Increase quantity of ${item.name}`}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.itemTotal}>RM {item.total.toFixed(2)}</Text>
            </View>
          </View>
        ))}

        {cart.length === 0 && (
          <Text style={styles.emptyCart}>
            No items in cart. Scan a barcode or search to add items.
          </Text>
        )}
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Grand Total</Text>
        <Text style={styles.totalValue}>RM {grandTotal.toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (cart.length === 0 || createSale.isPending) && styles.disabled,
        ]}
        onPress={() => createSale.mutate()}
        disabled={cart.length === 0 || createSale.isPending}
        accessibilityRole="button"
        accessibilityLabel="Complete sale"
      >
        <Text style={styles.submitText}>
          {createSale.isPending ? 'Processing...' : 'Complete Sale'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#001529',
    padding: 20,
    paddingTop: 48,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: '#8c8c8c',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    margin: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    color: '#1f1f1f',
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f1f1f',
    flex: 1,
    marginRight: 8,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#434343',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
    color: '#1f1f1f',
  },
  itemTotal: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '700',
    color: '#1890ff',
  },
  emptyCart: {
    textAlign: 'center',
    color: '#8c8c8c',
    padding: 20,
    fontSize: 14,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 12,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1890ff',
  },
  submitButton: {
    backgroundColor: '#52c41a',
    padding: 18,
    borderRadius: 8,
    margin: 12,
    marginBottom: 40,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
