import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/appStore';

export function PushNotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const pushNotificationPromptDismissed = useAppStore((state) => state.pushNotificationPromptDismissed);
  const setPushNotificationPromptDismissed = useAppStore((state) => state.setPushNotificationPromptDismissed);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = pushNotificationService.isSupported();
    setIsSupported(supported);

    if (supported) {
      // Check if already subscribed
      pushNotificationService.isSubscribed().then((subscribed) => {
        setIsSubscribed(subscribed);
        
        // Show prompt if:
        // 1. Not subscribed
        // 2. Permission is default or granted
        // 3. User hasn't dismissed it before
        const permission = pushNotificationService.getPermission();
        if (!subscribed && (permission === 'default' || permission === 'granted') && !pushNotificationPromptDismissed) {
          // Delay showing prompt slightly to avoid showing immediately on page load
          setTimeout(() => {
            setShowPrompt(true);
          }, 2000); // Show after 2 seconds
        }
      });
    }
  }, [pushNotificationPromptDismissed]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.subscribe();
      // Refresh status from backend to ensure sync
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);
      if (subscribed) {
        setShowPrompt(false);
        // Clear dismissal flag since user enabled it (so it can show again if they unsubscribe later)
        setPushNotificationPromptDismissed(false);
        toast.success('Push notifications enabled!');
      }
    } catch (error: any) {
      console.error('Failed to subscribe:', error);
      toast.error(error.message || 'Failed to enable push notifications');
      // Refresh status on error to ensure UI reflects actual state
      try {
        const subscribed = await pushNotificationService.isSubscribed();
        setIsSubscribed(subscribed);
      } catch (refreshError) {
        console.error('Failed to refresh push subscription status:', refreshError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await pushNotificationService.unsubscribe();
      // Refresh status from backend to ensure sync
      const subscribed = await pushNotificationService.isSubscribed();
      setIsSubscribed(subscribed);
      if (!subscribed) {
        toast.success('Push notifications disabled');
      }
    } catch (error: any) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable push notifications');
      // Refresh status on error to ensure UI reflects actual state
      try {
        const subscribed = await pushNotificationService.isSubscribed();
        setIsSubscribed(subscribed);
      } catch (refreshError) {
        console.error('Failed to refresh push subscription status:', refreshError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  if (showPrompt && !isSubscribed) {
    return (
      <div className="fixed bottom-4 right-4 bg-popover border rounded-lg shadow-lg p-4 max-w-sm z-50">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 mt-0.5 text-primary" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">Enable Push Notifications</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Get notified when campaigns complete or other important events occur, even when you're not on the site.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowPrompt(false);
                  // Store dismissal in store so it doesn't show again
                  setPushNotificationPromptDismissed(true);
                }}
                disabled={isLoading}
                title="Dismiss (you can enable notifications from the notification center)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

