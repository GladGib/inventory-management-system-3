import { useEffect, createContext, useContext } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNetworkStatus, NetworkStatus } from '../hooks/useNetworkStatus';

// ---------------------------------------------------------------------------
// Network status context -- allows any screen to access connectivity state
// ---------------------------------------------------------------------------

const NetworkContext = createContext<NetworkStatus>({
  isConnected: true,
  isInternetReachable: true,
  isSyncing: false,
  pendingCount: 0,
  triggerSync: async () => ({ attempted: 0, succeeded: 0, failed: 0 }),
  refreshPendingCount: async () => {},
});

/** Hook to access network connectivity state from any component. */
export function useNetwork(): NetworkStatus {
  return useContext(NetworkContext);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Do not retry on auth errors
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

function RootNavigator() {
  const { isAuthenticated, isLoading, needsOrgSelection, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Set up the inactivity timer (active only when authenticated)
  const { recordActivity } = useInactivityTimer();

  // Hydrate auth state on first mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Redirect based on auth state once loading is complete
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onSelectOrg = segments[0] === '(auth)' && segments[1] === 'select-org';

    if (!isAuthenticated && !inAuthGroup) {
      // User is not signed in and not on an auth screen -- redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsOrgSelection && !onSelectOrg) {
      // User is signed in but needs to pick an organization
      router.replace('/(auth)/select-org');
    } else if (isAuthenticated && !needsOrgSelection && inAuthGroup) {
      // User is signed in, org is selected, but still on auth screen -- go to dashboard
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading, needsOrgSelection, segments]);

  // Show a full-screen loading indicator while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1890ff" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.rootContainer} onTouchStart={recordActivity}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </View>
  );
}

function NetworkAwareRoot() {
  const networkStatus = useNetworkStatus();

  return (
    <NetworkContext.Provider value={networkStatus}>
      <RootNavigator />
      <OfflineBanner
        isConnected={networkStatus.isConnected}
        isSyncing={networkStatus.isSyncing}
      />
    </NetworkContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkAwareRoot />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001529',
  },
  rootContainer: {
    flex: 1,
  },
});
