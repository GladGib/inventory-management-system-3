import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PortalUser } from '@/lib/portal-api';

interface PortalAuthState {
  user: PortalUser | null;
  isLoading: boolean;
  setUser: (user: PortalUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        set({ user: null, isLoading: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('portalAccessToken');
          localStorage.removeItem('portalRefreshToken');
        }
      },
    }),
    {
      name: 'portal-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
