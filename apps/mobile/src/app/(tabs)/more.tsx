import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useNetwork } from '../_layout';

// -----------------------------------------------
// Menu item component
// -----------------------------------------------

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  /** Optional numeric badge displayed to the right of the label */
  badge?: number;
}

function MenuItem({ icon, label, onPress, color = '#262626', badge }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} pending` : label}
    >
      <Ionicons name={icon} size={22} color={color} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#d9d9d9" />
    </TouchableOpacity>
  );
}

// -----------------------------------------------
// Toggle menu item component (for switches)
// -----------------------------------------------

interface ToggleMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

function ToggleMenuItem({
  icon,
  label,
  value,
  onValueChange,
  disabled = false,
}: ToggleMenuItemProps) {
  return (
    <View style={[styles.menuItem, disabled && styles.menuItemDisabled]}>
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? '#bfbfbf' : '#262626'}
        style={styles.menuIcon}
      />
      <Text
        style={[styles.menuLabel, disabled && styles.menuLabelDisabled]}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d9d9d9', true: '#91d5ff' }}
        thumbColor={value ? '#1890ff' : '#f5f5f5'}
        accessibilityLabel={label}
      />
    </View>
  );
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function MoreScreen() {
  const {
    user,
    logout,
    biometricAvailable,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    selectedOrganization,
  } = useAuthStore();
  const router = useRouter();
  const { pendingCount } = useNetwork();
  const [biometricToggling, setBiometricToggling] = useState(false);

  // Determine if the user has multiple organizations
  const organizations = user?.organizations ?? [];
  const hasMultipleOrgs = organizations.length > 1;

  // Check if user is admin for admin-only menu items
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'OWNER';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  const comingSoon = () => {
    Alert.alert(
      'Coming Soon',
      'This feature will be available in a future update.',
    );
  };

  const handleHelpSupport = () => {
    Linking.openURL('https://support.imspro.app').catch(() => {
      // Fallback if URL cannot be opened
      Alert.alert(
        'Help & Support',
        'For support, please contact us at support@imspro.app or visit our website.',
      );
    });
  };

  const handleSwitchOrganization = () => {
    router.push('/(auth)/select-org');
  };

  const handleBiometricToggle = async (newValue: boolean) => {
    if (biometricToggling) return;
    setBiometricToggling(true);

    try {
      if (newValue) {
        const success = await enableBiometric();
        if (!success) {
          // User cancelled or biometric verification failed -- stay off
          Alert.alert(
            'Biometric Setup Failed',
            'Could not verify your biometrics. Please try again.',
          );
        }
      } else {
        await disableBiometric();
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setBiometricToggling(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          <Text style={styles.userRole}>{user?.role || ''}</Text>
        </View>
      </View>

      {/* Organization */}
      {(selectedOrganization || user?.organization) && (
        <View style={styles.orgCard}>
          <Ionicons
            name="business-outline"
            size={18}
            color="#1890ff"
            style={styles.orgIcon}
          />
          <Text style={styles.orgName}>
            {selectedOrganization?.name ?? user?.organization?.name}
          </Text>
          {hasMultipleOrgs && (
            <TouchableOpacity
              style={styles.switchOrgButton}
              onPress={handleSwitchOrganization}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Switch organization"
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="#1890ff" />
              <Text style={styles.switchOrgText}>Switch</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <MenuItem
          icon="cart-outline"
          label="Quick Sale"
          onPress={() => router.push('/quick-sale')}
        />
        <MenuItem
          icon="swap-vertical-outline"
          label="Stock Adjustments"
          onPress={() => router.push('/stock-adjust' as any)}
        />
        <MenuItem
          icon="clipboard-outline"
          label="Batch Stocktake"
          onPress={() => router.push('/stocktake' as any)}
        />
        <MenuItem
          icon="time-outline"
          label="Adjustment History"
          onPress={() => router.push('/adjustments' as any)}
        />
        <MenuItem
          icon="cloud-offline-outline"
          label="Offline Queue"
          onPress={() => router.push('/offline-queue' as any)}
          badge={pendingCount}
        />
      </View>

      {/* Account Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Account</Text>
        <MenuItem
          icon="person-outline"
          label="Profile"
          onPress={() => router.push('/profile' as any)}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push('/notification-settings' as any)}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => router.push('/change-password' as any)}
        />
      </View>

      {/* Security Section -- only shown when device supports biometrics */}
      {biometricAvailable && (
        <View style={styles.menuSection}>
          <Text style={styles.sectionLabel}>Security</Text>
          <ToggleMenuItem
            icon="finger-print-outline"
            label="Biometric Login"
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={biometricToggling}
          />
        </View>
      )}

      {/* General Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>General</Text>
        {hasMultipleOrgs && (
          <MenuItem
            icon="swap-horizontal-outline"
            label="Switch Organization"
            onPress={handleSwitchOrganization}
          />
        )}
        {isAdmin && (
          <MenuItem
            icon="business-outline"
            label="Organization Settings"
            onPress={comingSoon}
          />
        )}
        {isAdmin && (
          <MenuItem
            icon="people-outline"
            label="Users & Roles"
            onPress={comingSoon}
          />
        )}
        <MenuItem
          icon="settings-outline"
          label="App Settings"
          onPress={() => router.push('/app-settings' as any)}
        />
        <MenuItem
          icon="help-circle-outline"
          label="Help & Support"
          onPress={handleHelpSupport}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.menuSection}>
        <MenuItem
          icon="log-out-outline"
          label="Sign Out"
          onPress={handleLogout}
          color="#ff4d4f"
        />
      </View>

      {/* Version Info */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>IMS Pro v1.0.0</Text>
      </View>
    </ScrollView>
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

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  userEmail: {
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#1890ff',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Organization card
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bae7ff',
  },
  orgIcon: {
    marginRight: 10,
  },
  orgName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1890ff',
    flex: 1,
  },
  switchOrgButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#91d5ff',
    backgroundColor: '#fff',
  },
  switchOrgText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1890ff',
  },

  // Menu sections
  menuSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c8c8c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
  },
  menuLabelDisabled: {
    color: '#bfbfbf',
  },
  menuBadge: {
    backgroundColor: '#ff4d4f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Version info
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#bfbfbf',
  },
});
