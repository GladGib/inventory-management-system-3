import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import type { User, LoginRequest, RegisterRequest, TokensResponse, RegisterResponse } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

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

    set({
      user,
      token: accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

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
    });
  },

  /**
   * Log out the current user.
   *
   * Calls the backend to invalidate the refresh token, then clears
   * local secure storage and resets state.
   */
  logout: async () => {
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
    });
  },

  /**
   * Check whether the user is already authenticated on app launch.
   *
   * Reads the stored token from SecureStore, then calls GET /api/v1/auth/me
   * to verify it is still valid and to hydrate user state.
   */
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Token will be attached by the request interceptor
      const response = await apiClient.get<User>('/auth/me');
      const user = response.data;

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
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
      });
    }
  },
}));
