import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request push notification permissions and register the device token with
 * the backend. Returns the Expo push token string on success, or null if
 * permissions were denied or the device is an emulator/simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Set up Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('inventory', {
      name: 'Inventory Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Low stock and reorder notifications',
    });

    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Sales and purchase order notifications',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register token with backend
  try {
    await apiClient.post('/notifications/register-device', {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName,
    });
  } catch (error) {
    console.error('Failed to register push token:', error);
  }

  return token;
}

/**
 * Listen for notifications received while the app is in the foreground.
 */
export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Listen for user interactions with notifications (taps).
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Schedule a local notification. Pass `triggerSeconds` for a delayed trigger,
 * or omit / set to null for immediate display.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  triggerSeconds?: number,
) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: triggerSeconds ? { seconds: triggerSeconds } : null,
  });
}
