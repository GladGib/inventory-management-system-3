import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

// -----------------------------------------------
// Menu item component
// -----------------------------------------------

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

function MenuItem({ icon, label, onPress, color = '#262626' }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={color} style={styles.menuIcon} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#d9d9d9" />
    </TouchableOpacity>
  );
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

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
      {user?.organization && (
        <View style={styles.orgCard}>
          <Ionicons
            name="business-outline"
            size={18}
            color="#1890ff"
            style={styles.orgIcon}
          />
          <Text style={styles.orgName}>{user.organization.name}</Text>
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
      </View>

      {/* Account Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>Account</Text>
        <MenuItem
          icon="person-outline"
          label="Profile"
          onPress={comingSoon}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={comingSoon}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={comingSoon}
        />
      </View>

      {/* General Section */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionLabel}>General</Text>
        <MenuItem
          icon="business-outline"
          label="Organization Settings"
          onPress={comingSoon}
        />
        <MenuItem
          icon="people-outline"
          label="Users & Roles"
          onPress={comingSoon}
        />
        <MenuItem
          icon="settings-outline"
          label="App Settings"
          onPress={comingSoon}
        />
        <MenuItem
          icon="help-circle-outline"
          label="Help & Support"
          onPress={comingSoon}
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
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
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
