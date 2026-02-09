import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// -----------------------------------------------
// Constants
// -----------------------------------------------

const NOTIFICATION_PREFS_KEY = 'notification_preferences';

interface NotificationPreferences {
  orderUpdates: boolean;
  inventoryAlerts: boolean;
  paymentReminders: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  orderUpdates: true,
  inventoryAlerts: true,
  paymentReminders: true,
};

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Load saved preferences and check permission status on mount
  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationPreferences;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch {
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    } catch {
      setPermissionStatus('unavailable');
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are disabled. Please enable them in your device settings to receive alerts.',
        );
      }
    } catch {
      Alert.alert('Error', 'Could not request notification permissions.');
    }
  };

  const handleToggle = useCallback(
    (key: keyof NotificationPreferences) => (value: boolean) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
      Alert.alert('Saved', 'Notification preferences have been saved.');
    } catch {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant notification permissions first.',
      );
      return;
    }

    setIsSendingTest(true);
    try {
      // Configure notification handler for foreground display
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'IMS Pro - Test Notification',
          body: 'This is a test notification from your inventory management app.',
          data: { type: 'test' },
        },
        trigger: null, // Send immediately
      });

      Alert.alert('Sent', 'Test notification has been sent.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to send test notification.',
      );
    } finally {
      setIsSendingTest(false);
    }
  };

  const getPermissionStatusDisplay = (): { label: string; color: string; icon: keyof typeof Ionicons.glyphMap } => {
    switch (permissionStatus) {
      case 'granted':
        return { label: 'Granted', color: '#52c41a', icon: 'checkmark-circle' };
      case 'denied':
        return { label: 'Denied', color: '#ff4d4f', icon: 'close-circle' };
      case 'undetermined':
        return { label: 'Not Requested', color: '#faad14', icon: 'help-circle' };
      default:
        return { label: 'Unavailable', color: '#8c8c8c', icon: 'alert-circle' };
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Notifications',
            headerStyle: { backgroundColor: '#001529' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '600' },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      </>
    );
  }

  const permissionDisplay = getPermissionStatusDisplay();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notification Permission</Text>
          <View style={styles.permissionRow}>
            <View style={styles.permissionInfo}>
              <Ionicons
                name={permissionDisplay.icon}
                size={22}
                color={permissionDisplay.color}
              />
              <View style={styles.permissionText}>
                <Text style={styles.permissionLabel}>Status</Text>
                <Text
                  style={[
                    styles.permissionValue,
                    { color: permissionDisplay.color },
                  ]}
                >
                  {permissionDisplay.label}
                </Text>
              </View>
            </View>
            {permissionStatus !== 'granted' && (
              <TouchableOpacity
                style={styles.requestButton}
                onPress={requestPermission}
                accessibilityRole="button"
                accessibilityLabel="Request notification permission"
              >
                <Text style={styles.requestButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          <Text style={styles.sectionDescription}>
            Choose which types of notifications you want to receive.
          </Text>

          <NotificationToggle
            icon="cart-outline"
            label="Order Updates"
            description="New orders, status changes, and shipping updates"
            value={prefs.orderUpdates}
            onValueChange={handleToggle('orderUpdates')}
          />

          <NotificationToggle
            icon="alert-circle-outline"
            label="Inventory Alerts"
            description="Low stock warnings and reorder point notifications"
            value={prefs.inventoryAlerts}
            onValueChange={handleToggle('inventoryAlerts')}
          />

          <NotificationToggle
            icon="cash-outline"
            label="Payment Reminders"
            description="Overdue invoices, payment receipts, and billing alerts"
            value={prefs.paymentReminders}
            onValueChange={handleToggle('paymentReminders')}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save notification preferences"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Text>
        </TouchableOpacity>

        {/* Test Notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing</Text>
          <Text style={styles.sectionDescription}>
            Send a test notification to verify your settings are working.
          </Text>
          <TouchableOpacity
            style={[
              styles.testButton,
              (isSendingTest || permissionStatus !== 'granted') &&
                styles.buttonDisabled,
            ]}
            onPress={handleTestNotification}
            disabled={isSendingTest || permissionStatus !== 'granted'}
            accessibilityRole="button"
            accessibilityLabel="Send test notification"
          >
            {isSendingTest ? (
              <ActivityIndicator size="small" color="#1890ff" />
            ) : (
              <Ionicons name="notifications-outline" size={20} color="#1890ff" />
            )}
            <Text style={styles.testButtonText}>
              {isSendingTest ? 'Sending...' : 'Send Test Notification'}
            </Text>
          </TouchableOpacity>
          {permissionStatus !== 'granted' && (
            <Text style={styles.testDisabledHint}>
              Enable push notifications above to send a test.
            </Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

// -----------------------------------------------
// Sub-components
// -----------------------------------------------

interface NotificationToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function NotificationToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
}: NotificationToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Ionicons name={icon} size={22} color="#434343" style={styles.toggleIcon} />
        <View style={styles.toggleText}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d9d9d9', true: '#91d5ff' }}
        thumbColor={value ? '#1890ff' : '#f5f5f5'}
        accessibilityLabel={`${label} notifications`}
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
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    marginBottom: 4,
    color: '#1f1f1f',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#8c8c8c',
    marginBottom: 16,
    lineHeight: 18,
  },

  // Permission row
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionText: {},
  permissionLabel: {
    fontSize: 12,
    color: '#8c8c8c',
  },
  permissionValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1890ff',
    borderRadius: 6,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  toggleIcon: {
    marginRight: 12,
    marginTop: 2,
    width: 24,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#262626',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
    lineHeight: 16,
  },

  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1890ff',
    marginHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Test button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
    gap: 8,
  },
  testButtonText: {
    color: '#1890ff',
    fontSize: 15,
    fontWeight: '600',
  },
  testDisabledHint: {
    fontSize: 12,
    color: '#faad14',
    marginTop: 8,
    textAlign: 'center',
  },
});
