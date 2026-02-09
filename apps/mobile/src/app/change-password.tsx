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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// -----------------------------------------------
// Types
// -----------------------------------------------

interface PasswordField {
  value: string;
  visible: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState<PasswordField>({
    value: '',
    visible: false,
  });
  const [newPassword, setNewPassword] = useState<PasswordField>({
    value: '',
    visible: false,
  });
  const [confirmPassword, setConfirmPassword] = useState<PasswordField>({
    value: '',
    visible: false,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const validate = (): boolean => {
    const errors: ValidationError[] = [];

    if (!currentPassword.value) {
      errors.push({
        field: 'currentPassword',
        message: 'Current password is required.',
      });
    }

    if (!newPassword.value) {
      errors.push({
        field: 'newPassword',
        message: 'New password is required.',
      });
    } else if (newPassword.value.length < 8) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be at least 8 characters.',
      });
    }

    if (!confirmPassword.value) {
      errors.push({
        field: 'confirmPassword',
        message: 'Please confirm your new password.',
      });
    } else if (newPassword.value !== confirmPassword.value) {
      errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match.',
      });
    }

    if (
      currentPassword.value &&
      newPassword.value &&
      currentPassword.value === newPassword.value
    ) {
      errors.push({
        field: 'newPassword',
        message: 'New password must be different from current password.',
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find((e) => e.field === field)?.message;
  };

  const changeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error.message ||
        'Failed to change password.';

      if (status === 400 || status === 401) {
        // Likely wrong current password or validation error
        Alert.alert('Error', message);
      } else if (status === 404 || status === 405) {
        Alert.alert(
          'Not Available',
          'Password change is not available at this time. Please contact your administrator.',
        );
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const handleSubmit = () => {
    if (validate()) {
      changeMutation.mutate();
    }
  };

  // Password strength indicator
  const getPasswordStrength = (
    password: string,
  ): { label: string; color: string; width: number } => {
    if (!password) return { label: '', color: '#d9d9d9', width: 0 };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', color: '#ff4d4f', width: 20 };
    if (score <= 2) return { label: 'Fair', color: '#faad14', width: 40 };
    if (score <= 3) return { label: 'Good', color: '#1890ff', width: 60 };
    if (score <= 4) return { label: 'Strong', color: '#52c41a', width: 80 };
    return { label: 'Very Strong', color: '#389e0d', width: 100 };
  };

  const strength = getPasswordStrength(newPassword.value);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Change Password',
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
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#1890ff"
            />
            <Text style={styles.infoBannerText}>
              Choose a strong password with at least 8 characters, including
              uppercase, lowercase, numbers, and symbols.
            </Text>
          </View>

          {/* Current Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                style={[
                  styles.passwordInput,
                  getFieldError('currentPassword') && styles.inputError,
                ]}
                value={currentPassword.value}
                onChangeText={(text) =>
                  setCurrentPassword((prev) => ({ ...prev, value: text }))
                }
                secureTextEntry={!currentPassword.visible}
                placeholder="Enter current password"
                placeholderTextColor="#bfbfbf"
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                accessibilityLabel="Current password"
              />
              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() =>
                  setCurrentPassword((prev) => ({
                    ...prev,
                    visible: !prev.visible,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  currentPassword.visible
                    ? 'Hide current password'
                    : 'Show current password'
                }
              >
                <Ionicons
                  name={currentPassword.visible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>
            {getFieldError('currentPassword') && (
              <Text style={styles.errorText}>
                {getFieldError('currentPassword')}
              </Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                style={[
                  styles.passwordInput,
                  getFieldError('newPassword') && styles.inputError,
                ]}
                value={newPassword.value}
                onChangeText={(text) =>
                  setNewPassword((prev) => ({ ...prev, value: text }))
                }
                secureTextEntry={!newPassword.visible}
                placeholder="Enter new password (min. 8 chars)"
                placeholderTextColor="#bfbfbf"
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="New password"
              />
              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() =>
                  setNewPassword((prev) => ({
                    ...prev,
                    visible: !prev.visible,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  newPassword.visible
                    ? 'Hide new password'
                    : 'Show new password'
                }
              >
                <Ionicons
                  name={newPassword.visible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>
            {getFieldError('newPassword') && (
              <Text style={styles.errorText}>
                {getFieldError('newPassword')}
              </Text>
            )}

            {/* Password strength bar */}
            {newPassword.value.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        backgroundColor: strength.color,
                        width: `${strength.width}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <View style={styles.passwordInputRow}>
              <TextInput
                style={[
                  styles.passwordInput,
                  getFieldError('confirmPassword') && styles.inputError,
                ]}
                value={confirmPassword.value}
                onChangeText={(text) =>
                  setConfirmPassword((prev) => ({ ...prev, value: text }))
                }
                secureTextEntry={!confirmPassword.visible}
                placeholder="Re-enter new password"
                placeholderTextColor="#bfbfbf"
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                accessibilityLabel="Confirm new password"
              />
              <TouchableOpacity
                style={styles.visibilityToggle}
                onPress={() =>
                  setConfirmPassword((prev) => ({
                    ...prev,
                    visible: !prev.visible,
                  }))
                }
                accessibilityRole="button"
                accessibilityLabel={
                  confirmPassword.visible
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
              >
                <Ionicons
                  name={
                    confirmPassword.visible ? 'eye-off-outline' : 'eye-outline'
                  }
                  size={22}
                  color="#8c8c8c"
                />
              </TouchableOpacity>
            </View>
            {getFieldError('confirmPassword') && (
              <Text style={styles.errorText}>
                {getFieldError('confirmPassword')}
              </Text>
            )}

            {/* Match indicator */}
            {confirmPassword.value.length > 0 &&
              newPassword.value.length > 0 && (
                <View style={styles.matchIndicator}>
                  <Ionicons
                    name={
                      newPassword.value === confirmPassword.value
                        ? 'checkmark-circle'
                        : 'close-circle'
                    }
                    size={16}
                    color={
                      newPassword.value === confirmPassword.value
                        ? '#52c41a'
                        : '#ff4d4f'
                    }
                  />
                  <Text
                    style={[
                      styles.matchText,
                      {
                        color:
                          newPassword.value === confirmPassword.value
                            ? '#52c41a'
                            : '#ff4d4f',
                      },
                    ]}
                  >
                    {newPassword.value === confirmPassword.value
                      ? 'Passwords match'
                      : 'Passwords do not match'}
                  </Text>
                </View>
              )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              changeMutation.isPending && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={changeMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            {changeMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="lock-closed-outline" size={20} color="#fff" />
            )}
            <Text style={styles.submitButtonText}>
              {changeMutation.isPending
                ? 'Changing Password...'
                : 'Change Password'}
            </Text>
          </TouchableOpacity>
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

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e6f7ff',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 16,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#434343',
    lineHeight: 20,
  },

  // Field groups
  fieldGroup: {
    marginHorizontal: 12,
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
    marginBottom: 8,
  },

  // Password input
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  inputError: {
    borderColor: '#ff4d4f',
  },
  visibilityToggle: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },

  // Error text
  errorText: {
    fontSize: 12,
    color: '#ff4d4f',
    marginTop: 4,
  },

  // Strength indicator
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 72,
  },

  // Match indicator
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Submit button
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1890ff',
    marginHorizontal: 12,
    marginTop: 32,
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
});
