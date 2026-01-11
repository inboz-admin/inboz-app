import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification, NotificationResponse, UnreadCountResponse } from '@/api/notificationTypes';
import { notificationService } from '@/api/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
}

interface NotificationActions {
  fetchNotifications: (page?: number, limit?: number, read?: boolean | null) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setUnreadCount: (count: number) => void;
  fetchUnreadCount: () => Promise<void>;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  hasMore: true,
  currentPage: 1,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchNotifications: async (page = 1, limit = 20, read = null) => {
        set({ loading: true, error: null });
        try {
          const response = await notificationService.getNotifications({
            page,
            limit,
            read,
          });

          console.log('🔔 Notifications API response:', response);

          if (response.success && response.data) {
            // Backend returns: { data: Notification[], total, page, limit }
            // SuccessInterceptor wraps it, so response.data is the NotificationResponse object
            const notificationData = response.data as any;
            
            // Extract the actual notifications array
            let data: Notification[] = [];
            let total = 0;
            let currentPageNum = page;

            if (Array.isArray(notificationData)) {
              // If response.data is directly an array (unlikely but handle it)
              data = notificationData;
              total = notificationData.length;
            } else if (notificationData && notificationData.data && Array.isArray(notificationData.data)) {
              // Normal case: response.data = { data: [...], total, page, limit }
              data = notificationData.data;
              total = notificationData.total || 0;
              currentPageNum = notificationData.page || page;
            } else {
              console.error('Unexpected response structure:', notificationData);
              set({ error: 'Unexpected response format', loading: false });
              return;
            }
            
            console.log('✅ Parsed notifications:', { 
              count: data.length, 
              total, 
              page: currentPageNum,
              notifications: data 
            });

            // Combine notifications (for pagination)
            const allNotifications = page === 1 ? data : [...get().notifications, ...data];

            // Sort notifications by createdAt DESC (newest first) to ensure proper order
            const sortedNotifications = allNotifications.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA; // DESC order (newest first)
            });

            // When fetching page 1, always fetch the accurate unread count from server
            // Don't recalculate from local store as it may have stale data
            if (page === 1) {
              // Fetch unread count from server to get accurate count
              try {
                const countResponse = await notificationService.getUnreadCount();
                if (countResponse.success && countResponse.data) {
                  let serverUnreadCount = 0;
                  if (typeof countResponse.data === 'number') {
                    serverUnreadCount = countResponse.data;
                  } else if (typeof countResponse.data === 'object' && countResponse.data !== null) {
                    serverUnreadCount = (countResponse.data as any).count || 0;
                  }
                  console.log('📊 Server unread count (from fetchNotifications):', serverUnreadCount);
                  set({
                    notifications: sortedNotifications,
                    currentPage: currentPageNum,
                    hasMore: data.length === limit && (page === 1 ? data.length : get().notifications.length + data.length) < total,
                    loading: false,
                    error: null,
                    unreadCount: serverUnreadCount, // Use server count as source of truth
                  });
                  return;
                }
              } catch (error) {
                console.error('Failed to fetch unread count, using local calculation:', error);
                // Fall through to local calculation
              }
            }

            // For pagination (page > 1), keep existing unread count
            // Don't recalculate as we only have a subset of notifications
            set({
              notifications: sortedNotifications,
              currentPage: currentPageNum,
              hasMore: data.length === limit && (page === 1 ? data.length : get().notifications.length + data.length) < total,
              loading: false,
              error: null,
              // Keep existing unread count for pagination
              unreadCount: get().unreadCount,
            });
          } else {
            console.error('❌ Failed to fetch notifications:', response);
            set({ error: response.message || 'Failed to fetch notifications', loading: false });
          }
        } catch (error) {
          console.error('❌ Error fetching notifications:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch notifications',
            loading: false,
          });
        }
      },

      addNotification: (notification: Notification) => {
        const notifications = get().notifications;
        // Check if notification already exists
        if (!notifications.find((n) => n.id === notification.id)) {
          // Add notification and sort by createdAt DESC (newest first)
          const updatedNotifications = [notification, ...notifications].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // DESC order (newest first)
          });
          
          // Recalculate unread count from actual notifications
          const unreadCount = updatedNotifications.filter(n => !n.readAt).length;
          
          set({
            notifications: updatedNotifications,
            unreadCount,
          });
        }
      },

      markAsRead: async (notificationId: string) => {
        try {
          const response = await notificationService.markAsRead(notificationId);
          if (response.success && response.data) {
            const notification = response.data as Notification;
            const updatedNotifications = get().notifications.map((n) =>
              n.id === notificationId ? { ...n, readAt: notification.readAt, readBy: notification.readBy } : n
            );
            
            // Recalculate unread count from actual notifications
            const unreadCount = updatedNotifications.filter(n => !n.readAt).length;
            
            set({
              notifications: updatedNotifications,
              unreadCount,
            });
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to mark notification as read' });
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await notificationService.markAllAsRead();
          if (response.success && response.data) {
            const updatedNotifications = get().notifications.map((n) => ({ ...n, readAt: new Date().toISOString() }));
            
            // Recalculate unread count from actual notifications (should be 0)
            const unreadCount = updatedNotifications.filter(n => !n.readAt).length;
            
            set({
              notifications: updatedNotifications,
              unreadCount,
            });
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to mark all as read' });
        }
      },

      deleteNotification: async (notificationId: string) => {
        try {
          const response = await notificationService.deleteNotification(notificationId);
          if (response.success) {
            const updatedNotifications = get().notifications.filter((n) => n.id !== notificationId);
            
            // Recalculate unread count from actual notifications
            const unreadCount = updatedNotifications.filter(n => !n.readAt).length;
            
            set({
              notifications: updatedNotifications,
              unreadCount,
            });
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete notification' });
        }
      },

      incrementUnreadCount: () => {
        set({ unreadCount: get().unreadCount + 1 });
      },

      decrementUnreadCount: () => {
        set({ unreadCount: Math.max(0, get().unreadCount - 1) });
      },

      setUnreadCount: (count: number) => {
        set({ unreadCount: count });
      },

      fetchUnreadCount: async () => {
        try {
          const response = await notificationService.getUnreadCount();
          console.log('📊 Unread count API response:', response);
          if (response.success && response.data) {
            // Handle different response formats
            let actualCount = 0;
            if (typeof response.data === 'number') {
              actualCount = response.data;
            } else if (typeof response.data === 'object' && response.data !== null) {
              const countData = response.data as any;
              actualCount = countData.count || countData || 0;
            }
            console.log('✅ Setting unread count to:', actualCount);
            set({ unreadCount: actualCount });
          } else {
            console.warn('⚠️ Unread count response not successful:', response);
            // Fallback: calculate from notifications array
            const unreadInStore = get().notifications.filter(n => !n.readAt).length;
            console.log('📊 Fallback: calculating unread count from store:', unreadInStore);
            set({ unreadCount: unreadInStore });
          }
        } catch (error) {
          // Silently fail - don't show error for unread count
          console.error('Failed to fetch unread count:', error);
          // Fallback: calculate from notifications array
          const unreadInStore = get().notifications.filter(n => !n.readAt).length;
          console.log('📊 Fallback: calculating unread count from store:', unreadInStore);
          set({ unreadCount: unreadInStore });
        }
      },

      clearNotifications: () => {
        set(initialState);
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'notification-store',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        unreadCount: state.unreadCount,
      } as any),
    }
  )
);

