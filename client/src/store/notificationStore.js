import { create } from 'zustand';
import api from '@/api/axios';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  isLoading:     false,

  // ── Fetch from backend ─────────────────────────────────────────────
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/notifications', { params: { limit: 30 } });
      set({
        notifications: data.data || [],
        unreadCount:   data.meta?.unreadCount || 0,
        isLoading:     false,
      });
    } catch { set({ isLoading: false }); }
  },

  // ── Mark one read ──────────────────────────────────────────────────
  markRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set(state => ({
        notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
        unreadCount:   Math.max(0, state.unreadCount - 1),
      }));
    } catch { /* silent */ }
  },

  // ── Mark all read ──────────────────────────────────────────────────
  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadCount:   0,
      }));
    } catch { /* silent */ }
  },

  // ── Delete one ────────────────────────────────────────────────────
  deleteOne: async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      set(state => {
        const notifs   = state.notifications.filter(n => n._id !== id);
        const unread   = notifs.filter(n => !n.isRead).length;
        return { notifications: notifs, unreadCount: unread };
      });
    } catch { /* silent */ }
  },

  // ── Clear all ────────────────────────────────────────────────────
  clearAll: async () => {
    try {
      await api.delete('/notifications');
      set({ notifications: [], unreadCount: 0 });
    } catch { /* silent */ }
  },

  // ── Add from socket (real-time) ───────────────────────────────────
  addFromSocket: (notif) => {
    set(state => ({
      notifications: [notif, ...state.notifications].slice(0, 50),
      unreadCount:   state.unreadCount + 1,
    }));
  },
}));

export default useNotificationStore;
