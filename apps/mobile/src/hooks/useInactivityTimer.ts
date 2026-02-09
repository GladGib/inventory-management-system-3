import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../stores/auth.store';

/**
 * Inactivity timeout in milliseconds (30 minutes).
 */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * How often to check for inactivity while the app is in the foreground (60 seconds).
 */
const CHECK_INTERVAL_MS = 60 * 1000;

/**
 * Custom hook that manages session inactivity.
 *
 * Behavior:
 * 1. Tracks user interactions via `recordActivity()` which the caller should
 *    bind to touch/tap events (e.g. via `onTouchStart` on a root wrapper).
 * 2. Runs a foreground interval (every 60s) that compares the current time
 *    against the last recorded activity timestamp. If the difference exceeds
 *    30 minutes, the user is logged out with an inactivity message.
 * 3. When the app returns from the background, checks whether the inactivity
 *    timeout elapsed while backgrounded. If so, logs out immediately. If not,
 *    verifies the token is still valid via GET /auth/me (through the auth
 *    store's `verifyToken` method). If the token is invalid and refresh fails,
 *    logs out.
 *
 * This hook should only be active when the user is authenticated. It is a
 * no-op (does not set up timers/listeners) when `isAuthenticated` is false.
 *
 * @returns An object with `recordActivity` -- call this on every user interaction.
 */
export function useInactivityTimer() {
  const { isAuthenticated, logout, verifyToken } = useAuthStore();

  /**
   * Timestamp of the last recorded user interaction.
   * Initialised to `Date.now()` so that the timer starts fresh.
   */
  const lastActivityRef = useRef<number>(Date.now());

  /**
   * Timestamp of when the app went to the background.
   * Used to calculate elapsed time on foreground return.
   */
  const backgroundedAtRef = useRef<number | null>(null);

  /**
   * Ref to the interval ID so we can clear it on cleanup.
   */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Guard to prevent multiple simultaneous logout calls.
   */
  const isLoggingOutRef = useRef<boolean>(false);

  /**
   * Record a user interaction (tap, navigation, etc.).
   * This resets the inactivity timer.
   */
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  /**
   * Perform the inactivity logout.
   */
  const performInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      await logout('You have been logged out due to inactivity.');
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [logout]);

  /**
   * Check whether the inactivity timeout has been exceeded.
   */
  const checkInactivity = useCallback(() => {
    if (!isAuthenticated) return;

    const elapsed = Date.now() - lastActivityRef.current;
    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      performInactivityLogout();
    }
  }, [isAuthenticated, performInactivityLogout]);

  // ---------------------------------------------------------------------------
  // Foreground interval: check every 60 seconds
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any existing interval when not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset the activity timestamp when the user first authenticates
    lastActivityRef.current = Date.now();

    intervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, checkInactivity]);

  // ---------------------------------------------------------------------------
  // AppState listener: handle background / foreground transitions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Record the moment we went to the background
        backgroundedAtRef.current = Date.now();
        return;
      }

      // nextState === 'active' -- returning to foreground
      if (backgroundedAtRef.current !== null) {
        const elapsedSinceBackground = Date.now() - backgroundedAtRef.current;
        const elapsedSinceActivity = Date.now() - lastActivityRef.current;
        backgroundedAtRef.current = null;

        // If inactivity timeout elapsed while backgrounded, log out immediately
        if (
          elapsedSinceBackground >= INACTIVITY_TIMEOUT_MS ||
          elapsedSinceActivity >= INACTIVITY_TIMEOUT_MS
        ) {
          await performInactivityLogout();
          return;
        }

        // Otherwise, verify the token is still valid
        const tokenValid = await verifyToken();
        if (!tokenValid) {
          await logout('Your session has expired. Please sign in again.');
        } else {
          // Token is valid; record this moment as activity
          lastActivityRef.current = Date.now();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, logout, verifyToken, performInactivityLogout]);

  return { recordActivity };
}
