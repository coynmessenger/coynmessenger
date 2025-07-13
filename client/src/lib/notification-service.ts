export interface NotificationSettings {
  pushNotifications: boolean;
  messagePreview: boolean;
  autoConnectWallet: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings;

  private constructor() {
    this.settings = this.loadSettings();
    this.requestPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private loadSettings(): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      pushNotifications: true,
      messagePreview: true,
      autoConnectWallet: false
    };

    try {
      const pushNotifications = localStorage.getItem('pushNotifications');
      const messagePreview = localStorage.getItem('messagePreview');
      const autoConnectWallet = localStorage.getItem('autoConnectWallet');

      return {
        pushNotifications: pushNotifications !== null ? JSON.parse(pushNotifications) : defaultSettings.pushNotifications,
        messagePreview: messagePreview !== null ? JSON.parse(messagePreview) : defaultSettings.messagePreview,
        autoConnectWallet: autoConnectWallet !== null ? JSON.parse(autoConnectWallet) : defaultSettings.autoConnectWallet
      };
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      return defaultSettings;
    }
  }

  private async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Save to localStorage
    Object.entries(newSettings).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  showNotification(title: string, body: string, icon?: string): void {
    if (!this.settings.pushNotifications) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        silent: false
      });
    }
  }

  playNotificationSound(): void {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800 Hz tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio notification failed:', error);
    }
  }

  async showMessageNotification(
    senderName: string,
    messageContent: string,
    conversationId: string,
    messageType: 'text' | 'crypto_transfer' | 'product_share' = 'text'
  ): Promise<void> {
    if (!this.settings.pushNotifications) {
      return;
    }

    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return;
    }

    let title = 'COYN Messenger';
    let body = '';
    let icon = '/generated-icon.png';

    // Create notification content based on message type and preview settings
    if (messageType === 'crypto_transfer') {
      title = this.settings.messagePreview ? `${senderName} sent crypto` : 'New crypto transfer';
      body = this.settings.messagePreview 
        ? `${senderName}: ${messageContent}` 
        : `${senderName} sent you a crypto transfer`;
      icon = '/generated-icon.png';
    } else if (messageType === 'product_share') {
      title = this.settings.messagePreview ? `${senderName} shared a product` : 'New product share';
      body = this.settings.messagePreview 
        ? `${senderName}: Shared a product with you` 
        : `${senderName} shared something with you`;
    } else {
      title = this.settings.messagePreview ? `${senderName}` : 'New message';
      body = this.settings.messagePreview 
        ? messageContent.length > 50 ? `${messageContent.substring(0, 50)}...` : messageContent
        : `${senderName} sent you a message`;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag: `coyn-message-${conversationId}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to conversation if possible
        if (window.location.pathname.includes('/messenger')) {
          // Focus on the conversation
          const event = new CustomEvent('focusConversation', { 
            detail: { conversationId } 
          });
          window.dispatchEvent(event);
        } else {
          // Navigate to messenger
          window.location.href = `/messenger?conversation=${conversationId}`;
        }
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async showCallNotification(
    callerName: string,
    callType: 'voice' | 'video'
  ): Promise<void> {
    if (!this.settings.pushNotifications) {
      return;
    }

    if (!('Notification' in window)) {
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return;
    }

    const title = `Incoming ${callType} call`;
    const body = `${callerName} is calling you`;
    const icon = '/generated-icon.png';

    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag: 'coyn-incoming-call',
        requireInteraction: true,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds for calls
      setTimeout(() => {
        notification.close();
      }, 10000);

    } catch (error) {
      console.error('Failed to show call notification:', error);
    }
  }

  async showSystemNotification(
    title: string,
    message: string,
    persistent: boolean = false
  ): Promise<void> {
    if (!this.settings.pushNotifications) {
      return;
    }

    if (!('Notification' in window)) {
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/generated-icon.png',
        tag: 'coyn-system',
        requireInteraction: persistent,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      if (!persistent) {
        setTimeout(() => {
          notification.close();
        }, 4000);
      }

    } catch (error) {
      console.error('Failed to show system notification:', error);
    }
  }

  // Check if auto-connect wallet is enabled
  shouldAutoConnectWallet(): boolean {
    return this.settings.autoConnectWallet;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();