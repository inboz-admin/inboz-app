import { apiService } from '@/api/apiService';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isSubscribing = false; // Prevent duplicate subscriptions

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Get current notification permission
   */
  getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Register service worker and wait for activation
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers are not supported in this browser');
    }

    // Check if already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration('/');
    if (existingRegistration) {
      console.log('✅ Service Worker already registered');
      this.registration = existingRegistration;
      
      // Wait for it to be ready and active
      await this.waitForServiceWorkerActive(existingRegistration);
      return existingRegistration;
    }

    // Register new service worker
    console.log('📝 Registering service worker at /sw.js...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker registered, state:', registration.active?.state || 'installing');
    this.registration = registration;

    // Wait for service worker to be ready and active
    await this.waitForServiceWorkerActive(registration);
    console.log('✅ Service Worker ready and active');

    return registration;
  }

  /**
   * Wait for service worker to be in activated state
   */
  private async waitForServiceWorkerActive(registration: ServiceWorkerRegistration): Promise<void> {
    // First, wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // If already active, return immediately
    if (registration.active && registration.active.state === 'activated') {
      console.log('✅ Service Worker is already activated');
      return;
    }

    // If there's an installing worker, wait for it
    const installingWorker = registration.installing;
    if (installingWorker) {
      console.log('⏳ Waiting for service worker to install and activate...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Service Worker activation timeout after 10 seconds'));
        }, 10000);

        const stateChangeHandler = () => {
          const worker = registration.installing || registration.waiting || registration.active;
          if (!worker) {
            clearTimeout(timeout);
            reject(new Error('Service Worker was removed before activation'));
            return;
          }

          console.log(`📊 Service Worker state: ${worker.state}`);

          if (worker.state === 'activated') {
            clearTimeout(timeout);
            worker.removeEventListener('statechange', stateChangeHandler);
            resolve();
          } else if (worker.state === 'redundant') {
            clearTimeout(timeout);
            worker.removeEventListener('statechange', stateChangeHandler);
            reject(new Error('Service Worker installation failed (redundant)'));
          }
        };

        installingWorker.addEventListener('statechange', stateChangeHandler);
        
        // Check current state immediately
        if (installingWorker.state === 'activated') {
          clearTimeout(timeout);
          installingWorker.removeEventListener('statechange', stateChangeHandler);
          resolve();
        }
      });
    }

    // If there's a waiting worker, activate it
    const waitingWorker = registration.waiting;
    if (waitingWorker && waitingWorker.state !== 'activated') {
      console.log('⏳ Activating waiting service worker...');
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      await new Promise<void>((resolve) => {
        const stateChangeHandler = () => {
          if (registration.waiting?.state === 'activated' || registration.active?.state === 'activated') {
            waitingWorker.removeEventListener('statechange', stateChangeHandler);
            resolve();
          }
        };
        waitingWorker.addEventListener('statechange', stateChangeHandler);
        
        // Check immediately
        if (waitingWorker.state === 'activated' || registration.active?.state === 'activated') {
          waitingWorker.removeEventListener('statechange', stateChangeHandler);
          resolve();
        }
      });
    }

    // Final check - ensure we have an active service worker
    if (!registration.active || registration.active.state !== 'activated') {
      // Give it a moment and check again
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!registration.active || registration.active.state !== 'activated') {
        throw new Error('Service Worker is not in activated state. Current state: ' + (registration.active?.state || 'none'));
      }
    }
  }

  /**
   * Get VAPID public key from environment or API
   */
  private async getVapidPublicKey(): Promise<string> {
    // Try environment variable first
    const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
      console.log('✅ Using VAPID key from environment variable');
      return envKey.trim();
    }

    // Fallback to API
    console.log('⚠️ VAPID key not in env, fetching from API...');
    try {
      const response = await apiService.get<{ publicKey: string }>(
        '/notifications/push/vapid-key'
      );
      
      if (response.success && response.data) {
        let publicKey: string | null = null;
        
        if (typeof response.data === 'object' && response.data !== null) {
          if ('data' in response.data && typeof (response.data as any).data === 'object') {
            publicKey = (response.data as any).data.publicKey;
          } else if ('publicKey' in response.data) {
            publicKey = (response.data as any).publicKey;
          }
        }
        
        if (!publicKey) {
          throw new Error('VAPID keys are not configured on the server');
        }
        return publicKey;
      }
      throw new Error(response.message || 'Failed to get VAPID public key');
    } catch (error: any) {
      console.error('❌ Failed to get VAPID key:', error);
      throw new Error(error.message || 'Failed to get VAPID public key from server');
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid VAPID key: must be a non-empty string');
    }

    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    console.log(`✅ VAPID key converted, length: ${outputArray.length} bytes`);

    if (outputArray.length < 65) {
      throw new Error(
        `Invalid VAPID key length: ${outputArray.length}. Expected at least 65 bytes.`
      );
    }

    return outputArray;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionData | null> {
    if (this.isSubscribing) {
      throw new Error('Subscription already in progress');
    }

    this.isSubscribing = true;

    try {
      // 1. Environment checks
      if (!this.isSupported()) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Detect browser for debugging
      const userAgent = navigator.userAgent;
      let isBrave = false;
      try {
        if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
          isBrave = await (navigator as any).brave.isBrave();
        } else {
          // Fallback: check user agent
          isBrave = userAgent.includes('Brave');
        }
      } catch {
        // If detection fails, check user agent
        isBrave = userAgent.includes('Brave');
      }
      
      if (isBrave) {
        console.log('🦁 Brave browser detected - using Brave-specific push notification handling');
      }
      
      console.log('🌐 Browser info:', {
        userAgent: userAgent.substring(0, 80),
        isBrave,
        isSecureContext: window.isSecureContext,
        protocol: location.protocol,
        hostname: location.hostname,
      });

      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('Push notifications require HTTPS or localhost');
      }

      // 2. Notification permission
      const permission = this.getPermission();
      if (permission !== 'granted') {
        const newPermission = await this.requestPermission();
        if (newPermission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      // 3. Register service worker (this already waits for activation)
      const registration = await this.registerServiceWorker();

      if (!registration || !registration.active) {
        throw new Error('Service Worker registration failed - no active worker');
      }

      // Ensure service worker is activated
      if (registration.active.state !== 'activated') {
        throw new Error(`Service Worker is not activated. Current state: ${registration.active.state}`);
      }

      console.log('✅ Service Worker is active and ready for push subscription');

      // 5. Check for existing browser subscription
      const browserSubscription = await registration.pushManager.getSubscription();
      if (browserSubscription) {
        console.log('✅ Browser has existing push subscription');
        this.subscription = browserSubscription;
        
        // Check if this subscription is for the current user (user-specific check)
        try {
          const statusResponse = await apiService.get<{ subscribed: boolean; endpoint?: string }>(
            '/notifications/push/status'
          );
          
          if (statusResponse.success && statusResponse.data) {
            const data = statusResponse.data as any;
            const subscribed = data.subscribed || (data.data && data.data.subscribed);
            const userEndpoint = data.endpoint || (data.data && data.data.endpoint);
            
            // If user is subscribed and endpoint matches, return existing
            if (subscribed && userEndpoint === browserSubscription.endpoint) {
              console.log('✅ User is already subscribed with this endpoint');
              return this.subscriptionToData(browserSubscription);
            }
            
            // If endpoint doesn't match or user not subscribed, update subscription
            console.log('⚠️ Browser subscription exists but not for current user. Updating...');
          }
        } catch (error) {
          console.warn('Failed to check user subscription status:', error);
        }
        
        // Send subscription to backend (will update if needed)
        const subscriptionData = this.subscriptionToData(browserSubscription);
        await apiService.post('/notifications/push/subscribe', subscriptionData);
        return subscriptionData;
      }

      // 6. Get VAPID key
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      // 7. Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // 8. Subscribe
      console.log('📝 Subscribing to push notifications...');
      console.log('🔑 Application server key length:', applicationServerKey.length);
      console.log('📊 Service Worker state:', {
        active: registration.active?.state,
        installing: registration.installing?.state,
        waiting: registration.waiting?.state,
      });
      
      // Create a new ArrayBuffer from Uint8Array to avoid type issues
      const keyBuffer = new ArrayBuffer(applicationServerKey.length);
      new Uint8Array(keyBuffer).set(applicationServerKey);
      
      // Try subscription with detailed error handling
      try {
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        });
        console.log('✅ Push subscription created successfully');
      } catch (subscribeError: any) {
        console.error('❌ Push subscription error details:', {
          name: subscribeError.name,
          message: subscribeError.message,
          stack: subscribeError.stack,
        });
        
        // For Brave browser, try with Uint8Array directly if ArrayBuffer fails
        if (isBrave && subscribeError.name === 'AbortError') {
          console.log('🦁 Brave detected - trying with Uint8Array directly...');
          try {
            // Create a new ArrayBuffer copy for Brave
            const braveKeyBuffer = new ArrayBuffer(applicationServerKey.length);
            const braveKeyView = new Uint8Array(braveKeyBuffer);
            braveKeyView.set(applicationServerKey);
            
            this.subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: braveKeyBuffer,
            });
            console.log('✅ Push subscription created with Uint8Array');
          } catch (secondError: any) {
            console.error('❌ Second attempt also failed:', secondError);
            throw new Error(`Push subscription failed in Brave: ${secondError.message || subscribeError.message}`);
          }
        } else {
          throw new Error(`Push subscription failed: ${subscribeError.message || 'Unknown error'}`);
        }
      }

      console.log('✅ Push subscription created');

      // 9. Convert subscription to data format
      const subscriptionData = this.subscriptionToData(this.subscription);

      // 10. Send subscription to backend
      try {
        const response = await apiService.post('/notifications/push/subscribe', subscriptionData);
        if (response.success) {
          console.log('✅ Push subscription saved to backend');
          return subscriptionData;
        } else {
          throw new Error(response.message || 'Failed to save subscription');
        }
      } catch (error: any) {
        console.error('❌ Failed to save subscription to backend:', error);
        // Don't throw - subscription was created successfully, just not saved
        return subscriptionData;
      }
    } catch (error: any) {
      console.error('❌ Push subscription failed:', error);
      throw error;
    } finally {
      this.isSubscribing = false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.registration) {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration) {
        this.registration = registration;
      } else {
        return;
      }
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('✅ Push subscription unsubscribed');

        // Notify backend
        try {
          await apiService.post('/notifications/push/unsubscribe', {
            endpoint: subscription.endpoint,
          });
          console.log('✅ Unsubscription saved to backend');
        } catch (error) {
          console.error('❌ Failed to notify backend of unsubscription:', error);
        }
      }

      this.subscription = null;
    } catch (error: any) {
      console.error('❌ Unsubscribe failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is subscribed (user-specific check from backend)
   */
  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Check with backend if current user is subscribed (user-specific)
      const response = await apiService.get<{ subscribed: boolean; endpoint?: string }>(
        '/notifications/push/status'
      );
      
      if (response.success && response.data) {
        const data = response.data as any;
        // Handle nested response structure
        const subscribed = data.subscribed || (data.data && data.data.subscribed);
        return subscribed === true;
      }
      
      // Fallback to browser-level check if backend check fails
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.warn('Failed to check subscription status from backend, using browser check:', error);
      // Fallback to browser-level check
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) {
          return false;
        }
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
      } catch {
        return false;
      }
    }
  }

  /**
   * Convert subscription to data format
   */
  private subscriptionToData(subscription: PushSubscription): PushSubscriptionData {
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!key || !auth) {
      throw new Error('Invalid subscription keys');
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(key),
        auth: this.arrayBufferToBase64(auth),
      },
    };
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const pushNotificationService = new PushNotificationService();
