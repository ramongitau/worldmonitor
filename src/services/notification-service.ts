import type { AlertEvent, AlertRule } from '@/types/alerts';

/**
 * Check if the app is running inside Tauri
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Service to handle delivering alerts to various channels
 */
export class NotificationService {
  /**
   * Request permission for a specified delivery channel
   */
  static async requestPermission(channel: 'browser_push' | 'desktop_native'): Promise<boolean> {
    if (channel === 'desktop_native') {
      if (!isTauri()) return false;
      try {
        // Use window.__TAURI_IPC__ or similar, or just try to import and catch without static analysis
        const tauriApi = (window as any).__TAURI__?.notification;
        if (!tauriApi) return false;
        
        const { isPermissionGranted, requestPermission } = tauriApi;
        if (isPermissionGranted && requestPermission) {
          let granted = await isPermissionGranted();
          if (!granted) {
            const permission = await requestPermission();
            granted = permission === 'granted';
          }
          return granted;
        }
      } catch (e) {
        console.warn('Failed to request Tauri notification permission:', e);
      }
      return false;
    }

    // Default to browser push
    if (!('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Dispatch an alert through all configured channels for a matching rule
   */
  static async dispatch(rule: AlertRule, event: AlertEvent): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const channel of rule.channels) {
      if (channel === 'browser_push') {
        promises.push(this.sendBrowserNotification(event.title, event.body));
      } else if (channel === 'desktop_native') {
        promises.push(this.sendDesktopNotification(event.title, event.body));
      } else if (channel === 'webhook' && rule.webhookUrl) {
        promises.push(this.sendWebhook(rule.webhookUrl, event, rule));
      }
    }

    await Promise.allSettled(promises);
  }

  private static async sendBrowserNotification(title: string, body: string): Promise<void> {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        // Fallback for mobile browsers that require Service Worker registration to show notifications
        console.warn('Failed to show basic notification, trying service worker...', e);
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.showNotification(title, { body, icon: '/favicon.ico' });
          }
        } catch (swErr) {
          console.error('Service worker notification also failed', swErr);
        }
      }
    }
  }

  private static async sendDesktopNotification(title: string, body: string): Promise<void> {
    if (isTauri()) {
      try {
        const tauriApi = (window as any).__TAURI__?.notification;
        const sendNotification = tauriApi?.sendNotification;
        const isPermissionGranted = tauriApi?.isPermissionGranted;
        const requestPermission = tauriApi?.requestPermission;
        
        if (sendNotification) {
          let permissionGranted = await isPermissionGranted();
          if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
          }
          if (permissionGranted) {
            sendNotification({ title, body });
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to send Tauri native notification:', e);
      }
    }
    
    // Fallback to browser notification if Tauri fails or isn't available
    await this.sendBrowserNotification(title, body);
  }

  private static async sendWebhook(url: string, event: AlertEvent, rule: AlertRule): Promise<void> {
    try {
      const payload = {
        rule_id: rule.id,
        rule_name: rule.name,
        trigger: rule.trigger,
        event_id: event.id,
        title: event.title,
        body: event.body,
        timestamp: event.timestamp.toISOString(),
        data: event.data
      };

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WorldMonitor/AlertEngine'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error(`Failed to dispatch webhook to ${url}:`, e);
    }
  }
}
