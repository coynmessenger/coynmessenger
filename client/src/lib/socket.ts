import { io, Socket } from 'socket.io-client';
import { queryClient } from './queryClient';
import { notificationService } from './notification-service';

class SocketService {
  private socket: Socket | null = null;
  private currentConversationId: number | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    this.socket.on('new-message', (message) => {
      this.handleNewMessage(message);
    });

    this.socket.on('message-notification', (notification) => {
      this.handleMessageNotification(notification);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: number) {
    if (this.socket && conversationId !== this.currentConversationId) {
      // Leave previous conversation
      if (this.currentConversationId) {
        this.socket.emit('leave-conversation', this.currentConversationId);
      }
      
      // Join new conversation
      this.socket.emit('join-conversation', conversationId);
      this.currentConversationId = conversationId;
      console.log(`Joined conversation ${conversationId}`);
    }
  }

  leaveConversation() {
    if (this.socket && this.currentConversationId) {
      this.socket.emit('leave-conversation', this.currentConversationId);
      this.currentConversationId = null;
      console.log('Left conversation');
    }
  }

  private handleNewMessage(message: any) {
    console.log('New message received:', message);
    
    // Instantly update the messages cache
    queryClient.setQueryData(
      ["/api/conversations", message.conversationId, "messages"],
      (oldMessages: any[] | undefined) => {
        if (!oldMessages) return [message];
        
        // Check if message already exists to prevent duplicates
        const messageExists = oldMessages.some(msg => msg.id === message.id);
        if (messageExists) return oldMessages;
        
        // Add new message to the end
        return [...oldMessages, message];
      }
    );

    // Also invalidate queries for instant refresh
    queryClient.invalidateQueries({ 
      queryKey: ["/api/conversations", message.conversationId, "messages"] 
    });

    // Update conversations list to show latest message
    queryClient.invalidateQueries({ 
      queryKey: ["/api/conversations"] 
    });
  }

  private handleMessageNotification(notification: any) {
    console.log('Message notification received:', notification);
    
    // Show system notification if user has notifications enabled and not in current conversation
    if (this.currentConversationId !== notification.conversationId) {
      notificationService.showNotification(
        'New Message',
        notification.content || 'You have a new message',
        '/favicon.ico'
      );
      
      // Play notification sound
      notificationService.playNotificationSound();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();