import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiClient } from '../api/client';

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await apiClient.put('/auth/me', { name: newName });
      return res.data;
    },
    onSuccess: (data) => {
      // Update the auth store with the new user data
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        useAuthStore.setState({
          user: { ...authStore.user, name: data.name || name },
        });
      }
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        // Endpoint not available -- treat as display-only
        Alert.alert(
          'Not Available',
          'Profile editing is not available at this time. Your changes have not been saved.',
        );
        setName(user?.name || '');
        setIsEditing(false);
      } else {
        const message =
          error?.response?.data?.message ||
          error.message ||
          'Failed to update profile. Please try again.';
        Alert.alert('Error', message);
      }
    },
  });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      Alert.alert('Validation Error', 'Name must be at least 2 characters.');
      return;
    }
    updateMutation.mutate(trimmed);
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setIsEditing(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profile',
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
          {/* Avatar and basic info */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role || 'USER'}
              </Text>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="#bfbfbf"
                  maxLength={50}
                  autoCapitalize="words"
                  autoFocus
                  accessibilityLabel="Full name input"
                />
              ) : (
                <View style={styles.fieldValueRow}>
                  <Text style={styles.fieldValue}>{user?.name || '-'}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit name"
                  >
                    <Ionicons name="pencil-outline" size={18} color="#1890ff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={updateMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    updateMutation.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Save name"
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user?.email || '-'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={styles.fieldValue}>{user?.phone || '-'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <Text style={styles.fieldValue}>
                {user?.role
                  ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                  : '-'}
              </Text>
            </View>
          </View>

          {/* Organization */}
          {user?.organization && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organization</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <Text style={styles.fieldValue}>
                  {user.organization.name}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Slug</Text>
                <Text style={[styles.fieldValue, styles.monoValue]}>
                  {user.organization.slug}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Organization ID</Text>
                <Text style={[styles.fieldValue, styles.monoValue]}>
                  {user.organizationId}
                </Text>
              </View>
            </View>
          )}

          {/* Multiple organizations */}
          {user?.organizations && user.organizations.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Organizations ({user.organizations.length})
              </Text>
              {user.organizations.map((org) => (
                <View key={org.id} style={styles.orgItem}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color="#1890ff"
                  />
                  <View style={styles.orgItemInfo}>
                    <Text style={styles.orgItemName}>{org.name}</Text>
                    <Text style={styles.orgItemSlug}>{org.slug}</Text>
                  </View>
                  {org.id === user.organizationId && (
                    <View style={styles.currentOrgBadge}>
                      <Text style={styles.currentOrgBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* App version */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>IMS Pro v1.0.0</Text>
            <Text style={styles.versionSubtext}>
              Build {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
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

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    backgroundColor: '#001529',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1890ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(24, 144, 255, 0.2)',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#91d5ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    marginBottom: 16,
    color: '#1f1f1f',
  },

  // Field groups
  fieldGroup: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#8c8c8c',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  fieldValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monoValue: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#8c8c8c',
  },

  // Edit
  editButton: {
    padding: 6,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#1890ff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#434343',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 6,
    backgroundColor: '#1890ff',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Organization items
  orgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  orgItemInfo: {
    flex: 1,
  },
  orgItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  orgItemSlug: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  currentOrgBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f6ffed',
    borderRadius: 4,
  },
  currentOrgBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52c41a',
  },

  // Version
  versionSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#8c8c8c',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#bfbfbf',
    marginTop: 4,
  },
});
