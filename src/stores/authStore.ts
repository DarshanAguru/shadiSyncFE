import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBiometricsEnabled: boolean;
  isLocked: boolean; // Transient state to require biometric lock on app launch
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setLocked: (locked: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isBiometricsEnabled: false,
      isLocked: true, // Always start locked if persisted token is found
      setAuth: (token, user) => set({ token, user, isAuthenticated: true, isLocked: false }),
      clearAuth: () => {
        try {
          // Reset workspace store to prevent leaking state to other users
          const { useWorkspaceStore } = require('./workspaceStore');
          useWorkspaceStore.getState().setCurrentWorkspace(null);
          useWorkspaceStore.getState().setWorkspaces([]);
        } catch (e) {
          console.error('Failed to clear workspace store:', e);
        }
        set({ token: null, user: null, isAuthenticated: false, isLocked: true });
      },
      setBiometricsEnabled: (enabled) => set({ isBiometricsEnabled: enabled }),
      setLocked: (locked) => set({ isLocked: locked }),
    }),
    {
      name: 'shadisync-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isBiometricsEnabled: state.isBiometricsEnabled,
      }),
    }
  )
);
