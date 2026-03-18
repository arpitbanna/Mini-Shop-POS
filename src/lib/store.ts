import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAdmin: boolean;
  isGuest: boolean;
  loginAsAdmin: () => void;
  loginAsGuest: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAdmin: false,
      isGuest: false,
      loginAsAdmin: () => set({ isAdmin: true, isGuest: false }),
      loginAsGuest: () => set({ isAdmin: false, isGuest: true }),
      logout: () => set({ isAdmin: false, isGuest: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
