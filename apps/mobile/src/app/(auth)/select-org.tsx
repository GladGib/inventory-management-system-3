import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import type { Organization } from '../../types/auth';

export default function SelectOrgScreen() {
  const { user, selectOrganization, logout } = useAuthStore();
  const router = useRouter();

  const organizations: Organization[] = user?.organizations ?? [];

  const handleSelectOrg = async (org: Organization) => {
    await selectOrganization(org);
    // Navigation to dashboard is handled by the root layout auth redirect
    // which checks needsOrgSelection.
    router.replace('/(tabs)/dashboard');
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderOrgItem = ({ item }: { item: Organization }) => (
    <TouchableOpacity
      style={styles.orgItem}
      onPress={() => handleSelectOrg(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Select organization ${item.name}`}
    >
      <View style={styles.orgIconContainer}>
        <Ionicons name="business" size={24} color="#1890ff" />
      </View>
      <View style={styles.orgInfo}>
        <Text style={styles.orgName}>{item.name}</Text>
        <Text style={styles.orgSlug}>{item.slug}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#d9d9d9" />
    </TouchableOpacity>
  );

  if (organizations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#8c8c8c" />
          <Text style={styles.emptyTitle}>No Organizations</Text>
          <Text style={styles.emptyText}>
            You are not a member of any organization. Please contact your
            administrator.
          </Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Organization</Text>
          <Text style={styles.subtitle}>
            You belong to multiple organizations. Please select one to continue.
          </Text>
        </View>

        <FlatList
          data={organizations}
          renderItem={renderOrgItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.signOutLink}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#ff4d4f" />
            <Text style={styles.signOutLinkText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#001529',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8c8c8c',
    lineHeight: 20,
  },
  list: {
    padding: 16,
  },
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
  },
  orgIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 2,
  },
  orgSlug: {
    fontSize: 13,
    color: '#8c8c8c',
  },
  separator: {
    height: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 32,
  },
  signOutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  signOutLinkText: {
    fontSize: 14,
    color: '#ff4d4f',
    fontWeight: '500',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#262626',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8c8c8c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
