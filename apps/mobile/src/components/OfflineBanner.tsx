import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OfflineBannerProps {
  /** Whether the device currently has network connectivity */
  isConnected: boolean;
  /** Whether the offline queue is currently syncing */
  isSyncing?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Persistent warning banner displayed when the device is offline.
 *
 * Slides in from the top when connectivity is lost and slides out
 * when connectivity is restored.  Uses a #faad14 (amber) background
 * for high visibility.
 *
 * When `isSyncing` is true and the device is back online, shows a
 * brief "Syncing..." message before sliding out.
 */
export function OfflineBanner({ isConnected, isSyncing = false }: OfflineBannerProps) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const isVisible = !isConnected || isSyncing;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  // Determine banner text and icon
  let message: string;
  let iconName: keyof typeof Ionicons.glyphMap;
  let bgColor: string;

  if (!isConnected) {
    message = 'You are offline. Some features may be unavailable.';
    iconName = 'cloud-offline-outline';
    bgColor = '#faad14';
  } else if (isSyncing) {
    message = 'Syncing offline changes...';
    iconName = 'sync-outline';
    bgColor = '#1890ff';
  } else {
    message = '';
    iconName = 'cloud-offline-outline';
    bgColor = '#faad14';
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <View style={styles.content}>
        <Ionicons name={iconName} size={16} color="#fff" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});
