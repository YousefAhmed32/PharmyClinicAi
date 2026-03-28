import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/services';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,

      // ── Computed ──
      isAuthenticated: () => !!get().accessToken && !!get().user,
      isAdmin:         () => get().user?.role === 'admin',

      // ── Actions ──
      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, refreshToken });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.login({ email, password });
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const message = err.response?.data?.message || 'Login failed';
          return { success: false, message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const { data } = await authAPI.register(userData);
          const { user, accessToken, refreshToken } = data.data;
          localStorage.setItem('accessToken',  accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          set({ user, accessToken, refreshToken, isLoading: false });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          const message = err.response?.data?.message || 'Registration failed';
          const errors  = err.response?.data?.errors  || [];
          return { success: false, message, errors };
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authAPI.logout(refreshToken);
        } catch { /* silent */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null });
      },

      fetchMe: async () => {
        try {
          const { data } = await authAPI.getMe();
          set({ user: data.data });
        } catch {
          get().logout();
        }
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
