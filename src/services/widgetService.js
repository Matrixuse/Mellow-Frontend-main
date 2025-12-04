// Mobile widget service for PWA features
class WidgetService {
    constructor() {
        this.isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
        this.registration = null;
        // Only auto-register the service worker in production builds.
        // During development the service worker can cache stale production bundles which
        // leads to confusing runtime errors (like a cached bundle referencing removed globals).
        if (import.meta.env.PROD) {
            this.init();
        } else {
            // In development try to unregister any existing service workers and clear caches
            // so the dev server serves the latest bundles from memory.
            try {
                if (this.isSupported) {
                    navigator.serviceWorker.getRegistrations().then((regs) => {
                        regs.forEach(r => r.unregister());
                        // eslint-disable-next-line no-console
                        console.info('Dev: unregistered existing service workers');
                    }).catch(() => {});
                    if (window.caches && window.caches.keys) {
                        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
                            // eslint-disable-next-line no-console
                            console.info('Dev: cleared caches');
                        }).catch(() => {});
                    }
                }
            } catch (e) {
                // ignore dev cleanup errors
            }
        }
    }

    async init() {
        if (this.isSupported) {
            await this.registerServiceWorker();
        }
    }

    async registerServiceWorker() {
        try {
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered successfully');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    async requestNotificationPermission() {
        if (!this.isSupported || !this.registration) {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    async subscribeToPush() {
        if (!this.isSupported || !this.registration) {
            return null;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
            });

            return subscription;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            return null;
        }
    }

    async installPWA() {
        if (!this.isSupported) {
            return false;
        }

        try {
            // Check if PWA is already installed
            if (window.matchMedia('(display-mode: standalone)').matches) {
                return true;
            }

            // Trigger PWA install prompt
            let deferredPrompt = window.deferredPrompt;
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                window.deferredPrompt = null;
                return outcome === 'accepted';
            }

            return false;
        } catch (error) {
            console.error('Error installing PWA:', error);
            return false;
        }
    }

    // Convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Check if app is running as PWA
    isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Check if app is running on mobile
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Get device info
    getDeviceInfo() {
        return {
            isPWA: this.isPWA(),
            isMobile: this.isMobile(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        };
    }

    // Update app badge (if supported)
    async setBadge(count) {
        if ('setAppBadge' in navigator) {
            try {
                await navigator.setAppBadge(count);
            } catch (error) {
                console.error('Error setting app badge:', error);
            }
        }
    }

    // Clear app badge
    async clearBadge() {
        if ('clearAppBadge' in navigator) {
            try {
                await navigator.clearAppBadge();
            } catch (error) {
                console.error('Error clearing app badge:', error);
            }
        }
    }

    isAvailable() {
        return this.isSupported;
    }

    getRegistration() {
        return this.registration;
    }
}

// Create a singleton instance
const widgetService = new WidgetService();

export default widgetService;
