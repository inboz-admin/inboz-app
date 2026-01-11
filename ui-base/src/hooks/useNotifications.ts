import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppStore } from '@/stores/appStore';
import type { Socket } from 'socket.io-client';
import type { Notification } from '@/api/notificationTypes';

export function useNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAppStore();
  const {
    addNotification,
    fetchUnreadCount,
    fetchNotifications,
    incrementUnreadCount,
  } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;

    // Join user-specific notification room
    const handleConnect = () => {
      console.log('🔌 Socket connected for notifications, joining user room:', user.id);
      socket.emit('join-user-room', user.id);
    };

    // Handle notification events
    const handleNotification = (notification: Notification) => {
      console.log('📬 Received notification:', notification);
      addNotification(notification);
      if (!notification.readAt) {
        incrementUnreadCount();
      }
    };

    // Listen for connection events
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on(`notification-${user.id}`, handleNotification);

    // Fetch initial unread count
    fetchUnreadCount();

    // Fetch initial notifications (first page)
    fetchNotifications(1, 20, null);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off(`notification-${user.id}`, handleNotification);
      if (socket.connected) {
        socket.emit('leave-user-room', user.id);
      }
    };
  }, [user?.id, addNotification, fetchUnreadCount, fetchNotifications, incrementUnreadCount]);

  return {
    socket: socketRef.current,
  };
}

