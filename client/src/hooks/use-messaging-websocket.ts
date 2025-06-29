import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  userId?: number;
  conversationId?: number;
  messageData?: any;
  messageId?: number;
  updateType?: string;
  isTyping?: boolean;
  isOnline?: boolean;
  timestamp?: string;
}

interface TypingUser {
  userId: number;
  isTyping: boolean;
}

export function useMessagingWebSocket(userId: number | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, TypingUser[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const currentConversationRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/messaging`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Messaging WebSocket connected');
        setIsConnected(true);
        
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: 'auth',
          userId
        }));

        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Messaging WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('Messaging WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [userId]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'new_message':
        handleNewMessage(message);
        break;
      
      case 'typing':
        handleTypingUpdate(message);
        break;
      
      case 'online_status':
        handleOnlineStatusUpdate(message);
        break;
      
      case 'message_update':
        handleMessageUpdate(message);
        break;
      
      case 'conversation_update':
        handleConversationUpdate(message);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const handleNewMessage = useCallback((message: WebSocketMessage) => {
    // Invalidate conversations and messages queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    
    if (message.conversationId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', message.conversationId, 'messages'] 
      });
    }

    // Show notification if message is not from current user and not in current conversation
    if (message.messageData?.senderId !== userId && 
        message.conversationId !== currentConversationRef.current) {
      toast({
        title: "New Message",
        description: `${message.messageData?.senderName || 'Someone'} sent you a message`,
        duration: 3000,
      });
    }
  }, [userId, toast]);

  const handleTypingUpdate = useCallback((message: WebSocketMessage) => {
    if (!message.conversationId || message.userId === userId) return;

    setTypingUsers(prev => {
      const newMap = new Map(prev);
      const conversationTypers = newMap.get(message.conversationId!) || [];
      
      if (message.isTyping) {
        // Add user to typing list if not already there
        const exists = conversationTypers.find(u => u.userId === message.userId);
        if (!exists) {
          const updated = [...conversationTypers, { userId: message.userId!, isTyping: true }];
          newMap.set(message.conversationId!, updated);
        }
      } else {
        // Remove user from typing list
        const updated = conversationTypers.filter(u => u.userId !== message.userId);
        if (updated.length === 0) {
          newMap.delete(message.conversationId!);
        } else {
          newMap.set(message.conversationId!, updated);
        }
      }
      
      return newMap;
    });
  }, [userId]);

  const handleOnlineStatusUpdate = useCallback((message: WebSocketMessage) => {
    if (!message.userId) return;

    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      if (message.isOnline) {
        newSet.add(message.userId!);
      } else {
        newSet.delete(message.userId!);
      }
      return newSet;
    });

    // Invalidate user queries to update online status in UI
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
  }, []);

  const handleMessageUpdate = useCallback((message: WebSocketMessage) => {
    if (!message.conversationId) return;

    // Invalidate specific conversation messages
    queryClient.invalidateQueries({ 
      queryKey: ['/api/conversations', message.conversationId, 'messages'] 
    });

    // Handle specific update types
    switch (message.updateType) {
      case 'deleted':
        toast({
          title: "Message Deleted",
          description: "A message in this conversation was deleted",
          duration: 2000,
        });
        break;
      
      case 'starred':
        toast({
          title: "Message Starred",
          description: "A message was starred",
          duration: 2000,
        });
        break;
    }
  }, [toast]);

  const handleConversationUpdate = useCallback((message: WebSocketMessage) => {
    // Refresh all conversations
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    
    if (message.conversationId) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', message.conversationId, 'messages'] 
      });
    }
  }, []);

  // Function to join a conversation room
  const joinConversation = useCallback((conversationId: number) => {
    currentConversationRef.current = conversationId;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join',
        conversationId
      }));
    }
  }, []);

  // Function to leave a conversation room
  const leaveConversation = useCallback(() => {
    currentConversationRef.current = null;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave'
      }));
    }
  }, []);

  // Function to send typing indicator
  const sendTyping = useCallback((conversationId: number, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        conversationId,
        userId,
        isTyping
      }));
    }
  }, [userId]);

  // Function to notify about new message
  const notifyNewMessage = useCallback((conversationId: number, messageData: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'new_message',
        conversationId,
        messageData
      }));
    }
  }, []);

  // Function to notify about message updates
  const notifyMessageUpdate = useCallback((conversationId: number, messageId: number, updateType: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message_update',
        conversationId,
        messageId,
        updateType
      }));
    }
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, userId]);

  return {
    isConnected,
    typingUsers,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendTyping,
    notifyNewMessage,
    notifyMessageUpdate,
    connect
  };
}