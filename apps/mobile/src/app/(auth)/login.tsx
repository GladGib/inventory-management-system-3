import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth.store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    login,
    biometricLogin,
    enableBiometric,
    biometricAvailable,
    biometricEnabled,
    rememberedEmail,
    loadRememberedEmail,
    setRememberMe: persistRememberMe,
    logoutMessage,
    clearLogoutMessage,
  } = useAuthStore();

  // ---------------------------------------------------------------------------
  // Load remembered email on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadRememberedEmail();
  }, [loadRememberedEmail]);

  // Pre-fill email and toggle when remembered email is loaded
  useEffect(() => {
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, [rememberedEmail]);

  // ---------------------------------------------------------------------------
  // Display and clear logout message (e.g. inactivity)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (logoutMessage) {
      Alert.alert('Session Ended', logoutMessage);
      clearLogoutMessage();
    }
  }, [logoutMessage, clearLogoutMessage]);

  /**
   * After a successful password login, check whether the device supports
   * biometrics and the user has not yet opted in. If so, prompt them.
   */
  const promptBiometricEnrollment = () => {
    if (!biometricAvailable || biometricEnabled) return;

    // Use a short delay so the login state has time to settle before
    // showing a second alert (avoids alert-stacking on iOS).
    setTimeout(() => {
      Alert.alert(
        'Enable Biometric Login',
        'Enable biometric login for faster access?',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const success = await enableBiometric();
              if (success) {
                Alert.alert('Success', 'Biometric login enabled. You can use it next time you sign in.');
              }
            },
          },
        ],
      );
    }, 600);
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);

      // Persist or clear remembered email based on toggle
      if (rememberMe) {
        await persistRememberMe(trimmedEmail);
      } else {
        await persistRememberMe(null);
      }

      // Prompt biometric enrollment after successful login
      promptBiometricEnrollment();
      // Navigation is handled by the root layout auth redirect
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Invalid credentials. Please try again.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      await biometricLogin();
      // Navigation is handled by the root layout auth redirect
    } catch (error: any) {
      const message = error.message || 'Biometric authentication failed.';
      // Only show the error if the user did not simply cancel
      if (!message.includes('cancelled')) {
        Alert.alert('Biometric Login Failed', message);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const isAnyLoading = loading || biometricLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>IMS Pro</Text>
            <Text style={styles.subtitle}>Inventory Management System</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@company.com"
                placeholderTextColor="#8c8c8c"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                editable={!isAnyLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#8c8c8c"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!isAnyLoading}
              />
            </View>

            {/* Remember Me toggle */}
            <View style={styles.rememberMeRow}>
              <Text style={styles.rememberMeLabel}>Remember me</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#595959', true: '#1890ff' }}
                thumbColor={rememberMe ? '#fff' : '#d9d9d9'}
                disabled={isAnyLoading}
                accessibilityLabel="Remember me"
                accessibilityRole="switch"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isAnyLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isAnyLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Biometric login button -- only shown when enabled */}
            {biometricEnabled && (
              <TouchableOpacity
                style={[styles.biometricButton, isAnyLoading && styles.buttonDisabled]}
                onPress={handleBiometricLogin}
                disabled={isAnyLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Sign in with biometrics"
              >
                {biometricLoading ? (
                  <ActivityIndicator color="#1890ff" />
                ) : (
                  <View style={styles.biometricButtonContent}>
                    <Ionicons
                      name="finger-print-outline"
                      size={24}
                      color="#1890ff"
                    />
                    <Text style={styles.biometricButtonText}>
                      Sign in with Biometrics
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Malaysian SME Inventory Solution
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#001529',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8c8c8c',
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d9d9d9',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#262626',
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rememberMeLabel: {
    fontSize: 14,
    color: '#d9d9d9',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#1890ff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    borderWidth: 1,
    borderColor: '#1890ff',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  biometricButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  biometricButtonText: {
    color: '#1890ff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 48,
  },
  footerText: {
    fontSize: 13,
    color: '#595959',
  },
});
