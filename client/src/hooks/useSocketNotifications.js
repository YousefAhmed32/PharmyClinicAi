import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';

/**
 * Hook: connects to socket and listens for real-time notifications
 * Used in non-admin layouts for patients
 */
export function useSocketNotifications() {
  const { accessToken } = useAuthStore();
  const { addFromSocket, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (!accessToken) return;

    // Fetch existing notifications
    fetchNotifications();

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(SOCKET_URL, {
      auth:       { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', (notif) => {
      addFromSocket(notif);
    });

    return () => socket.disconnect();
  }, [accessToken]);
}
