import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';

interface WebSocketWithUser extends WebSocket {
  userId?: number;
  conversationId?: number;
}

export class MessagingWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<number, WebSocketWithUser[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/messaging'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    console.log('Real-time messaging WebSocket server initialized on /ws/messaging');
  }

  private async handleConnection(ws: WebSocketWithUser) {
    console.log('New messaging connection established');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private async handleMessage(ws: WebSocketWithUser, message: any) {
    switch (message.type) {
      case 'auth':
        ws.userId = message.userId;
        this.addClient(message.userId, ws);
        await this.updateOnlineStatus(message.userId, true);
        break;
      
      case 'join':
        ws.conversationId = message.conversationId;
        break;
      
      case 'typing':
        this.broadcastTyping(message.conversationId, message.userId, message.isTyping);
        break;
      
      case 'new_message':
        this.broadcastNewMessage(message.conversationId, message.messageData);
        break;
      
      case 'message_update':
        this.broadcastMessageUpdate(message.conversationId, message.messageId, message.updateType);
        break;
    }
  }

  private addClient(userId: number, ws: WebSocketWithUser) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(ws);
  }

  private async handleDisconnection(ws: WebSocketWithUser) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId) || [];
      const updatedClients = userClients.filter(client => client !== ws);
      
      if (updatedClients.length === 0) {
        this.clients.delete(ws.userId);
        await this.updateOnlineStatus(ws.userId, false);
      } else {
        this.clients.set(ws.userId, updatedClients);
      }
    }
  }

  private async updateOnlineStatus(userId: number, isOnline: boolean) {
    try {
      await storage.updateUserOnlineStatus(userId, isOnline);
      this.broadcastOnlineStatus(userId, isOnline);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }

  private broadcastOnlineStatus(userId: number, isOnline: boolean) {
    const message = JSON.stringify({
      type: 'online_status',
      userId,
      isOnline,
      timestamp: new Date()
    });

    for (const [clientUserId, clientConnections] of this.clients.entries()) {
      if (clientUserId !== userId) {
        for (const client of clientConnections) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        }
      }
    }
  }

  private broadcastTyping(conversationId: number, userId: number, isTyping: boolean) {
    const message = JSON.stringify({
      type: 'typing',
      conversationId,
      userId,
      isTyping,
      timestamp: new Date()
    });

    this.broadcastToConversation(conversationId, message, userId);
  }

  private broadcastNewMessage(conversationId: number, messageData: any) {
    const message = JSON.stringify({
      type: 'new_message',
      conversationId,
      messageData,
      timestamp: new Date()
    });

    this.broadcastToConversation(conversationId, message);
  }

  private broadcastMessageUpdate(conversationId: number, messageId: number, updateType: string) {
    const message = JSON.stringify({
      type: 'message_update',
      conversationId,
      messageId,
      updateType,
      timestamp: new Date()
    });

    this.broadcastToConversation(conversationId, message);
  }

  private broadcastToConversation(conversationId: number, message: string, excludeUserId?: number) {
    for (const [userId, clientConnections] of this.clients.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      for (const client of clientConnections) {
        if (client.conversationId === conversationId && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }

  public notifyConversationUpdate(conversationId: number) {
    const message = JSON.stringify({
      type: 'conversation_update',
      conversationId,
      timestamp: new Date()
    });

    this.broadcastToConversation(conversationId, message);
  }
}

export let messagingWS: MessagingWebSocketServer;

export function initializeMessagingWebSocket(server: Server) {
  messagingWS = new MessagingWebSocketServer(server);
  return messagingWS;
}