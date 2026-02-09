import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';

// -----------------------------------------------
// Constants
// -----------------------------------------------

const SETTINGS_KEY = 'app_settings';

type LanguageCode = 'en' | 'ms';
type ThemeMode = 'light' | 'dark' | 'system';

interface AppSettingsData {
  language: LanguageCode;
  theme: ThemeMode;
}

const DEFAULT_SETTINGS: AppSettingsData = {
  language: 'en',
  theme: 'system',
};

interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ms', label: 'Bahasa Malaysia', nativeLabel: 'Bahasa Malaysia' },
];

const THEMES: ThemeOption[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

// -----------------------------------------------
// Main screen
// -----------------------------------------------

export default function AppSettingsScreen() {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<AppSettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    keys: number;
    estimatedSize: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
    loadStorageInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppSettingsData;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      // Estimate storage size by reading all values
      let totalSize = 0;
      const allEntries = await AsyncStorage.multiGet(keys);
      for (const [key, value] of allEntries) {
        totalSize += (key?.length || 0) + (value?.length || 0);
      }
      setStorageInfo({
        keys: keys.length,
        estimatedSize: formatBytes(totalSize * 2), // rough estimate (UTF-16)
      });
    } catch {
      setStorageInfo(null);
    }
  };

  const handleLanguageSelect = (code: LanguageCode) => {
    setSettings((prev) => ({ ...prev, language: code }));
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme: mode }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      Alert.alert('Saved', 'App settings have been saved.');
    } catch {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached API data. You may need to reload screens to see fresh data.\n\nThis does not affect your login session or saved preferences.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              // Clear TanStack Query cache
              queryClient.clear();
              // Refresh storage info after clearing
              await loadStorageInfo();
              Alert.alert('Done', 'Cache has been cleared successfully.');
            } catch {
              Alert.alert('Error', 'Failed to clear cache.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All App Data',
      'This will remove all locally stored data including preferences and cached data. Your login session will NOT be affected (tokens are stored in secure storage).\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              queryClient.clear();
              setSettings(DEFAULT_SETTINGS);
              await loadStorageInfo();
              Alert.alert(
                'Done',
                'All app data has been cleared. Some settings have been reset to defaults.',
              );
            } catch {
              Alert.alert('Error', 'Failed to clear app data.');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'App Settings',
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

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'App Settings',
          headerStyle: { backgroundColor: '#001529' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <Text style={styles.sectionDescription}>
            Select your preferred display language.
          </Text>
          <View style={styles.optionsGrid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionCard,
                  settings.language === lang.code && styles.optionCardActive,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.language === lang.code }}
                accessibilityLabel={`Language: ${lang.label}`}
              >
                <Text style={styles.optionFlag}>
                  {lang.code === 'en' ? 'EN' : 'BM'}
                </Text>
                <Text
                  style={[
                    styles.optionLabel,
                    settings.language === lang.code &&
                      styles.optionLabelActive,
                  ]}
                >
                  {lang.label}
                </Text>
                <Text
                  style={[
                    styles.optionSubLabel,
                    settings.language === lang.code &&
                      styles.optionSubLabelActive,
                  ]}
                >
                  {lang.nativeLabel}
                </Text>
                {settings.language === lang.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#1890ff"
                    style={styles.optionCheck}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <Text style={styles.sectionDescription}>
            Choose how the app looks. System will follow your device settings.
          </Text>
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => (
              <TouchableOpacity
                key={theme.mode}
                style={[
                  styles.themeCard,
                  settings.theme === theme.mode && styles.themeCardActive,
                ]}
                onPress={() => handleThemeSelect(theme.mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected: settings.theme === theme.mode }}
                accessibilityLabel={`Theme: ${theme.label}`}
              >
                <Ionicons
                  name={theme.icon}
                  size={24}
                  color={
                    settings.theme === theme.mode ? '#1890ff' : '#8c8c8c'
                  }
                />
                <Text
                  style={[
                    styles.themeLabel,
                    settings.theme === theme.mode && styles.themeLabelActive,
                  ]}
                >
                  {theme.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Save app settings"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="save-outline" size={20} color="#fff" />
          )}
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Management</Text>
          <Text style={styles.sectionDescription}>
            Clear cached data to free up storage or fix display issues.
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, isClearing && styles.buttonDisabled]}
            onPress={handleClearCache}
            disabled={isClearing}
            accessibilityRole="button"
            accessibilityLabel="Clear API cache"
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#faad14" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#faad14" />
            )}
            <View style={styles.actionButtonText}>
              <Text style={styles.actionButtonLabel}>Clear API Cache</Text>
              <Text style={styles.actionButtonDescription}>
                Clears cached API responses. Does not affect saved data.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d9d9d9" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAllData}
            accessibilityRole="button"
            accessibilityLabel="Clear all app data"
          >
            <Ionicons name="nuclear-outline" size={20} color="#ff4d4f" />
            <View style={styles.actionButtonText}>
              <Text style={[styles.actionButtonLabel, { color: '#ff4d4f' }]}>
                Clear All App Data
              </Text>
              <Text style={styles.actionButtonDescription}>
                Remove all locally stored data and reset preferences.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#d9d9d9" />
          </TouchableOpacity>
        </View>

        {/* Storage Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          {storageInfo ? (
            <>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Stored Keys</Text>
                <Text style={styles.storageValue}>{storageInfo.keys}</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Estimated Size</Text>
                <Text style={styles.storageValue}>
                  {storageInfo.estimatedSize}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.storageUnavailable}>
              Storage information unavailable.
            </Text>
          )}
        </View>

        {/* Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>IMS Pro v1.0.0</Text>
        </View>
      </ScrollView>
    </>
  );
}

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${sizes[i]}`;
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

  // Language options
  optionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1.5,
    borderColor: '#d9d9d9',
    alignItems: 'center',
    position: 'relative',
  },
  optionCardActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  optionFlag: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1890ff',
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434343',
    textAlign: 'center',
  },
  optionLabelActive: {
    color: '#1890ff',
  },
  optionSubLabel: {
    fontSize: 11,
    color: '#8c8c8c',
    marginTop: 2,
    textAlign: 'center',
  },
  optionSubLabelActive: {
    color: '#1890ff',
  },
  optionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Theme options
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1.5,
    borderColor: '#d9d9d9',
    alignItems: 'center',
    gap: 8,
  },
  themeCardActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#434343',
  },
  themeLabelActive: {
    color: '#1890ff',
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

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#434343',
  },
  actionButtonDescription: {
    fontSize: 12,
    color: '#8c8c8c',
    marginTop: 2,
  },

  // Storage info
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storageLabel: {
    fontSize: 14,
    color: '#8c8c8c',
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f1f1f',
  },
  storageUnavailable: {
    fontSize: 14,
    color: '#bfbfbf',
    fontStyle: 'italic',
  },

  // Version
  versionSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#bfbfbf',
  },
});
