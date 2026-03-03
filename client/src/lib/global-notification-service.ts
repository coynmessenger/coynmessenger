const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
import { io, Socket } from 'socket.io-client';
import { toast } from '@/hooks/use-toast';

interface NotificationData {
  type: 'message' | 'call' | 'transaction';
  title: string;
  body: string;
  conversationId?: string;
  messageId?: string;
  fromUserId?: string;
  fromUserName?: string;
  timestamp: string;
}

class GlobalNotificationService {
  private static instance: GlobalNotificationService;
  private socket: Socket | null = null;
  private isInitialized = false;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): GlobalNotificationService {
    if (!GlobalNotificationService.instance) {
      GlobalNotificationService.instance = new GlobalNotificationService();
    }
    return GlobalNotificationService.instance;
  }

  initialize(userId: string): void {
    if (this.isInitialized && this.userId === userId) {
      log('Global notification service already initialized for user:', userId);
      return;
    }

    this.userId = userId;
    this.setupSocketConnection();
    this.isInitialized = true;
    log('Global notification service initialized for user:', userId);
  }

  private setupSocketConnection(): void {
    if (this.socket) {
      this.socket.disconnect();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: false,
      path: '/socket.io/',
    });

    this.socket.on('connect', () => {
      log('🔔 Global notification service connected to server');
      if (this.userId) {
        this.socket!.emit('authenticate', { userId: this.userId });
      }
    });

    // Listen for instant notifications from server
    this.socket.on('instant-notification', (data: NotificationData) => {
      log('🔔 Global instant notification received:', data);
      
      // CRITICAL FIX: Handle call notifications specially
      if (data.type === 'call') {
        log('📞 CALL NOTIFICATION: Received call notification via instant notification system');
        log('📞 CALL NOTIFICATION: From user:', data.fromUserId);
        log('📞 CALL NOTIFICATION: Call ID:', data.conversationId);
        
        // Get the global WebRTC service and trigger incoming call
        const globalWebRTC = (window as any).globalWebRTCService;
        if (globalWebRTC && globalWebRTC.eventHandlers?.onIncomingCall) {
          log('📞 CALL NOTIFICATION: Triggering incoming call modal...');
          globalWebRTC.eventHandlers.onIncomingCall({
            callId: data.conversationId || 'unknown',
            fromUserId: data.fromUserId || 'unknown',
            type: data.title?.includes('video') ? 'video' : 'voice'
          });
          log('✅ CALL NOTIFICATION: Incoming call modal should now appear');
        } else {
          console.error('❌ CALL NOTIFICATION: No WebRTC service or handler available');
        }
      }
      
      this.showNotification(data);
    });

    // Listen for new messages that trigger notifications
    this.socket.on('new_message', (data: {
      conversationId: string;
      senderId: number;
      senderName: string;
      content: string;
      messageType: string;
      timestamp: string;
    }) => {
      log('🔔 Global new message notification:', data);
      
      // Only show notification if user is not the sender
      if (this.userId && data.senderId.toString() !== this.userId) {
        const isOnMessengerPage = window.location.pathname.includes('/messenger');
        
        // Always show notification if not on messenger page
        // On messenger page, let the page handle its own notifications
        if (!isOnMessengerPage) {
          this.showNotification({
            type: 'message',
            title: `New message from ${data.senderName}`,
            body: data.content ? data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '') : 'New message received',
            conversationId: data.conversationId,
            fromUserName: data.senderName,
            timestamp: data.timestamp
          });
        }
      }
    });

    this.socket.on('disconnect', () => {
      log('🔔 Global notification service disconnected');
    });
  }

  private showNotification(data: NotificationData): void {
    // Show toast notification
    toast({
      title: data.title,
      description: data.body,
      duration: 5000,
    });

    // Show browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: '/generated-icon.png',
        tag: `coyn-global-${data.type}-${data.conversationId || 'general'}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to conversation if it's a message
        if (data.type === 'message' && data.conversationId) {
          if (window.location.pathname.includes('/messenger')) {
            // Trigger focus conversation event
            const event = new CustomEvent('focusConversation', { 
              detail: { conversationId: data.conversationId } 
            });
            window.dispatchEvent(event);
          } else {
            // Navigate to messenger
            window.location.href = `/messenger?conversation=${data.conversationId}`;
          }
        }
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isInitialized = false;
    this.userId = null;
    log('Global notification service cleaned up');
  }
}

export const globalNotificationService = GlobalNotificationService.getInstance();
export { GlobalNotificationService };
export type { NotificationData };