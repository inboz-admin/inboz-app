import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationBadge } from './NotificationBadge';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { NotificationType } from '@/api/notificationTypes';
import { pushNotificationService } from '@/services/pushNotificationService';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchUnreadCount,
    hasMore,
    currentPage,
  } = useNotificationStore();

  useEffect(() => {
    // Check push notification support and status
    const supported = pushNotificationService.isSupported();
    setPushSupported(supported);
    if (supported) {
      pushNotificationService.isSubscribed().then(setPushEnabled);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // Fetch notifications when popover opens
      console.log('NotificationCenter opened, fetching notifications...');
      // Always fetch unread count from server first to get accurate count
      fetchUnreadCount().catch((error) => {
        console.error('Failed to fetch unread count:', error);
      });
      // Then fetch notifications
      fetchNotifications(1, 20, null).catch((error) => {
        console.error('Failed to fetch notifications:', error);
        toast.error('Failed to load notifications');
      });
      // Refresh push notification status when notification center opens
      if (pushSupported) {
        pushNotificationService.isSubscribed().then(setPushEnabled).catch((error) => {
          console.error('Failed to check push subscription status:', error);
        });
      }
    }
  }, [open, fetchUnreadCount, fetchNotifications, pushSupported]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // Count is automatically recalculated in the store, no need to fetch
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Count is automatically recalculated in the store, no need to fetch
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      // Count is automatically recalculated in the store, no need to fetch
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchNotifications(currentPage + 1, 20, null);
    }
  };

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        await pushNotificationService.unsubscribe();
        // Refresh status from backend to ensure sync
        const isSubscribed = await pushNotificationService.isSubscribed();
        setPushEnabled(isSubscribed);
        if (!isSubscribed) {
          toast.success('Push notifications disabled');
        }
      } else {
        await pushNotificationService.subscribe();
        // Refresh status from backend to ensure sync
        const isSubscribed = await pushNotificationService.isSubscribed();
        setPushEnabled(isSubscribed);
        if (isSubscribed) {
          toast.success('Push notifications enabled!');
        }
      }
    } catch (error: any) {
      console.error('Failed to toggle push notifications:', error);
      toast.error(error.message || 'Failed to toggle push notifications');
      // Refresh status on error to ensure UI reflects actual state
      try {
        const isSubscribed = await pushNotificationService.isSubscribed();
        setPushEnabled(isSubscribed);
      } catch (refreshError) {
        console.error('Failed to refresh push subscription status:', refreshError);
      }
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.CAMPAIGN_COMPLETED:
        return '✅';
      case NotificationType.CAMPAIGN_STARTED:
        return '🚀';
      case NotificationType.CAMPAIGN_PAUSED:
        return '⏸️';
      case NotificationType.CAMPAIGN_FAILED:
        return '❌';
      default:
        return '📢';
    }
  };

  // Debug: Log current state
  console.log('🔍 NotificationCenter render state:', {
    open,
    notificationsCount: notifications.length,
    loading,
    error,
    notifications: notifications.slice(0, 2), // First 2 for debugging
  });

  const handleBadgeClick = () => {
    console.log('🔔 Badge clicked, current open state:', open);
    const newOpen = !open;
    console.log('🔔 Setting open to:', newOpen);
    setOpen(newOpen);
  };

  return (
    <div className="relative">
      <div onClick={handleBadgeClick} style={{ cursor: 'pointer' }}>
        <NotificationBadge />
      </div>
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => {
              console.log('🔄 Backdrop clicked, closing popover');
              setOpen(false);
            }}
          />
          {/* Popover Content */}
          <div 
            className="fixed right-4 top-16 w-[500px] bg-popover border rounded-md shadow-lg z-[9999] max-h-[600px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-[600px] max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {pushSupported && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTogglePush}
                  className="h-8 hover:text-primary"
                  title={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
                >
                  <BellRing className={`h-4 w-4 mr-1 ${pushEnabled ? 'text-primary' : ''}`} />
                  {pushEnabled ? 'Push On' : 'Push Off'}
                </Button>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-8 hover:text-primary"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 hover:text-primary"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
            {error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔄 Retrying fetch notifications...');
                    fetchNotifications(1, 20, null);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Loading notifications...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground mt-2">
                  You'll see notifications here when campaigns complete or other events occur.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification, index) => {
                  // Validate notification has required fields
                  if (!notification || !notification.id) {
                    console.warn('⚠️ Invalid notification:', notification);
                    return null;
                  }
                  
                  console.log(`📋 [${index}] Rendering notification:`, {
                    id: notification.id,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    hasTitle: !!notification.title,
                    hasMessage: !!notification.message,
                  });
                  
                  return (
                    <div
                      key={notification.id}
                      className={`
                        p-4 border-b transition-colors
                        ${!notification.readAt ? 'bg-white hover:bg-primary/5' : 'bg-white hover:bg-primary/5'}
                      `}
                      style={{ minHeight: '80px' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                        if (!notification.readAt) {
                          handleMarkAsRead(notification.id);
                        }
                      }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-none">
                            {notification.title || 'Notification'}
                          </p>
                          {!notification.readAt && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message || 'No message'}
                        </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                if (!notification.createdAt) return 'Just now';
                                const date = new Date(notification.createdAt);
                                if (isNaN(date.getTime())) return 'Just now';
                                try {
                                  return formatDistanceToNow(date, { addSuffix: true });
                                } catch {
                                  return 'Just now';
                                }
                              })()}
                            </span>
                            <div className="flex items-center gap-1">
                              {!notification.readAt && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 cursor-pointer hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 cursor-pointer hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasMore && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

