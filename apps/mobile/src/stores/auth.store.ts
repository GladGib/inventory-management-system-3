import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import type { User, Organization, LoginRequest, RegisterRequest, TokensResponse, RegisterResponse } from '../types/auth';

// SecureStore key for the biometric-enabled flag
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

// AsyncStorage keys
const REMEMBERED_EMAIL_KEY = 'remembered_email';
const SELECTED_ORG_KEY = 'selected_organization_id';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  /** Whether the device supports biometric authentication */
  biometricAvailable: boolean;
  /** Whether the user has opted in to biometric login */
  biometricEnabled: boolean;

  /** Email persisted via "Remember Me" toggle on the login screen. */
  rememberedEmail: string | null;

  /**
   * When set, this message is displayed on the login screen after an
   * automatic logout (e.g. inactivity timeout, invalid token).
   */
  logoutMessage: string | null;

  /** The organization currently selected for the session. */
  selectedOrganization: Organization | null;

  /**
   * True when the user has multiple organizations and has not yet selected
   * one. The root layout uses this flag to route to the org selection screen.
   */
  needsOrgSelection: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: (message?: string) => Promise<void>;
  checkAuth: () => Promise<void>;

  /** Probe the device for biometric hardware + enrollment */
  checkBiometricAvailability: () => Promise<boolean>;
  /** Enable biometric login (performs a biometric check first) */
  enableBiometric: () => Promise<boolean>;
  /** Disable biometric login */
  disableBiometric: () => Promise<void>;
  /**
   * Perform a full biometric login flow:
   *   1. Authenticate with device biometrics
   *   2. Read the stored refresh token
   *   3. Exchange it for a new access token via POST /auth/refresh
   *   4. Hydrate user state via GET /auth/me
   */
  biometricLogin: () => Promise<void>;

  /** Load the remembered email from AsyncStorage on app launch. */
  loadRememberedEmail: () => Promise<void>;

  /**
   * Save or clear the remembered email.
   * Pass a non-null email string to persist it; pass null to clear.
   */
  setRememberMe: (email: string | null) => Promise<void>;

  /** Select an organization (multi-org flow). */
  selectOrganization: (org: Organization) => Promise<void>;

  /** Clear the one-time logout message after it has been displayed. */
  clearLogoutMessage: () => void;

  /**
   * Verify the current token is still valid by calling GET /auth/me.
   * Returns true if the token (or a refreshed token) is valid.
   */
  verifyToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  biometricAvailable: false,
  biometricEnabled: false,
  rememberedEmail: null,
  logoutMessage: null,
  selectedOrganization: null,
  needsOrgSelection: false,

  // ---------------------------------------------------------------------------
  // Remember Me
  // ---------------------------------------------------------------------------

  loadRememberedEmail: async () => {
    try {
      const email = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      set({ rememberedEmail: email });
    } catch {
      // AsyncStorage failure is non-critical
    }
  },

  setRememberMe: async (email: string | null) => {
    try {
      if (email) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      set({ rememberedEmail: email });
    } catch {
      // AsyncStorage failure is non-critical
    }
  },

  // ---------------------------------------------------------------------------
  // Organization selection
  // ---------------------------------------------------------------------------

  selectOrganization: async (org: Organization) => {
    try {
      await AsyncStorage.setItem(SELECTED_ORG_KEY, org.id);
    } catch {
      // non-critical
    }
    set({ selectedOrganization: org, needsOrgSelection: false });
  },

  // ---------------------------------------------------------------------------
  // Logout message
  // ---------------------------------------------------------------------------

  clearLogoutMessage: () => {
    set({ logoutMessage: null });
  },

  // ---------------------------------------------------------------------------
  // Token verification (used by inactivity timer on foreground return)
  // ---------------------------------------------------------------------------

  verifyToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return false;

      const response = await apiClient.get<User>('/auth/me');
      const user = response.data;

      set({ user, token, isAuthenticated: true });
      return true;
    } catch {
      // Token is invalid and refresh (handled by the interceptor) also failed
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with email and password.
   *
   * The backend POST /api/v1/auth/login returns:
   *   { accessToken, refreshToken, tokenType, expiresIn }
   *
   * After obtaining tokens we fetch the user profile from
   * GET /api/v1/auth/me which returns the full User object
   * with organization details.
   */
  login: async (email: string, password: string) => {
    const loginResponse = await apiClient.post<TokensResponse>('/auth/login', {
      email,
      password,
    });

    const { accessToken, refreshToken } = loginResponse.data;

    // Persist tokens in secure storage
    await SecureStore.setItemAsync('auth_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);

    // Fetch user profile (the token is attached by the request interceptor)
    const profileResponse = await apiClient.get<User>('/auth/me');
    const user = profileResponse.data;

    // Determine whether the user needs to pick an organization
    const orgs = user.organizations ?? [];
    const hasMultipleOrgs = orgs.length > 1;

    if (hasMultipleOrgs) {
      // Check if a previously selected org is still valid
      let preselected: Organization | null = null;
      try {
        const storedOrgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
        if (storedOrgId) {
          preselected = orgs.find((o) => o.id === storedOrgId) ?? null;
        }
      } catch {
        // non-critical
      }

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        logoutMessage: null,
        selectedOrganization: preselected,
        needsOrgSelection: preselected === null,
      });
    } else {
      // Single org (or none) -- auto-select
      const singleOrg = orgs.length === 1 ? orgs[0] : user.organization;
      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        logoutMessage: null,
        selectedOrganization: singleOrg,
        needsOrgSelection: false,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // Register
  // ---------------------------------------------------------------------------

  /**
   * Register a new organization and admin user.
   *
   * The backend POST /api/v1/auth/register returns:
   *   { user, accessToken, refreshToken, tokenType, expiresIn }
   */
  register: async (data: RegisterRequest) => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);

    const { accessToken, refreshToken, user } = response.data;

    await SecureStore.setItemAsync('auth_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);

    set({
      user,
      token: accessToken,
      isAuthenticated: true,
      isLoading: false,
      logoutMessage: null,
      selectedOrganization: user.organization,
      needsOrgSelection: false,
    });
  },

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  /**
   * Log out the current user.
   *
   * Calls the backend to invalidate the refresh token, then clears
   * local secure storage and resets state.
   *
   * @param message - Optional message to display on the login screen
   *   (e.g. "You have been logged out due to inactivity.").
   */
  logout: async (message?: string) => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Logout API failure is not critical; clear local state regardless
    }

    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      selectedOrganization: null,
      needsOrgSelection: false,
      logoutMessage: message ?? null,
    });
  },

  // ---------------------------------------------------------------------------
  // Check auth (app launch hydration)
  // ---------------------------------------------------------------------------

  /**
   * Check whether the user is already authenticated on app launch.
   *
   * Reads the stored token from SecureStore, then calls GET /api/v1/auth/me
   * to verify it is still valid and to hydrate user state.
   *
   * Also checks biometric availability and stored preference.
   */
  checkAuth: async () => {
    try {
      // Check biometric availability in parallel with token check
      const biometricAvailable = await get().checkBiometricAvailability();

      // Read biometric preference from SecureStore
      let biometricEnabled = false;
      if (biometricAvailable) {
        const storedFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        biometricEnabled = storedFlag === 'true';
      }

      set({ biometricAvailable, biometricEnabled });

      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Token will be attached by the request interceptor
      const response = await apiClient.get<User>('/auth/me');
      const user = response.data;

      // Resolve organization selection
      const orgs = user.organizations ?? [];
      const hasMultipleOrgs = orgs.length > 1;

      let selectedOrg: Organization | null = user.organization;
      let needsSelection = false;

      if (hasMultipleOrgs) {
        try {
          const storedOrgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
          if (storedOrgId) {
            const found = orgs.find((o) => o.id === storedOrgId);
            if (found) {
              selectedOrg = found;
            } else {
              needsSelection = true;
              selectedOrg = null;
            }
          } else {
            needsSelection = true;
            selectedOrg = null;
          }
        } catch {
          needsSelection = true;
          selectedOrg = null;
        }
      }

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        selectedOrganization: selectedOrg,
        needsOrgSelection: needsSelection,
      });
    } catch {
      // Token invalid or network error -- clear stored tokens
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        selectedOrganization: null,
        needsOrgSelection: false,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // Biometric authentication
  // ---------------------------------------------------------------------------

  /**
   * Probe the device for biometric hardware and enrollment.
   * Returns true if biometrics are both supported and enrolled.
   */
  checkBiometricAvailability: async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        set({ biometricAvailable: false });
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;
      set({ biometricAvailable: available });
      return available;
    } catch {
      set({ biometricAvailable: false });
      return false;
    }
  },

  /**
   * Enable biometric login.
   *
   * Performs a biometric check to verify the user can authenticate,
   * then persists the preference in SecureStore.
   * Returns true if successfully enabled.
   */
  enableBiometric: async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable biometric login',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        set({ biometricEnabled: true });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  },

  /**
   * Disable biometric login by removing the stored flag.
   */
  disableBiometric: async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    set({ biometricEnabled: false });
  },

  /**
   * Perform a biometric login flow:
   *   1. Authenticate with device biometrics
   *   2. Read the stored refresh token from SecureStore
   *   3. Exchange it for a new access token via POST /auth/refresh
   *   4. Hydrate user state via GET /auth/me
   *
   * Throws if biometric auth fails or token exchange fails so the caller
   * can fall back to the email/password form.
   */
  biometricLogin: async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to IMS Pro',
      cancelLabel: 'Use Password',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error(
        result.error === 'user_cancel'
          ? 'Biometric authentication cancelled'
          : 'Biometric authentication failed',
      );
    }

    // Read the stored refresh token
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      throw new Error('No stored session found. Please sign in with your password.');
    }

    // Exchange refresh token for new access token
    const refreshResponse = await apiClient.post<TokensResponse>('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

    // Persist new tokens
    await SecureStore.setItemAsync('auth_token', accessToken);
    if (newRefreshToken) {
      await SecureStore.setItemAsync('refresh_token', newRefreshToken);
    }

    // Fetch user profile
    const profileResponse = await apiClient.get<User>('/auth/me');
    const user = profileResponse.data;

    // Resolve organization selection for biometric login as well
    const orgs = user.organizations ?? [];
    const hasMultipleOrgs = orgs.length > 1;

    if (hasMultipleOrgs) {
      let preselected: Organization | null = null;
      try {
        const storedOrgId = await AsyncStorage.getItem(SELECTED_ORG_KEY);
        if (storedOrgId) {
          preselected = orgs.find((o) => o.id === storedOrgId) ?? null;
        }
      } catch {
        // non-critical
      }

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        logoutMessage: null,
        selectedOrganization: preselected,
        needsOrgSelection: preselected === null,
      });
    } else {
      const singleOrg = orgs.length === 1 ? orgs[0] : user.organization;
      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        logoutMessage: null,
        selectedOrganization: singleOrg,
        needsOrgSelection: false,
      });
    }
  },
}));
