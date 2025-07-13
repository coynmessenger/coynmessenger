import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SignalEncryptionService } from './signal-encryption.js';

export interface CallParticipant {
  userId: string;
  socketId: string;
  encryptionService: SignalEncryptionService;
}

export interface ActiveCall {
  id: string;
  participants: CallParticipant[];
  type: 'voice' | 'video';
  startTime: Date;
  encrypted: boolean;
}

export class EncryptedWebRTCSignaling {
  private io: SocketIOServer;
  private activeCalls = new Map<string, ActiveCall>();
  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private encryptionServices = new Map<string, SignalEncryptionService>(); // userId -> service
  private conversationRooms = new Map<string, Set<string>>(); // conversationId -> Set of socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/socket.io/'
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      

      // User authentication and encryption setup
      socket.on('authenticate', async (data: { userId: string }) => {
        const { userId } = data;
        
        // Store user-socket mapping
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);

        // Initialize encryption service for user
        if (!this.encryptionServices.has(userId)) {
          const encryptionService = new SignalEncryptionService(userId);
          await encryptionService.initializeIdentity();
          this.encryptionServices.set(userId, encryptionService);
        }

        const encryptionService = this.encryptionServices.get(userId)!;
        const identity = await encryptionService.initializeIdentity();

        socket.emit('authenticated', { 
          userId, 
          publicKey: identity.publicKey,
          encryptionEnabled: true 
        });

        
      });

      // Join conversation room for real-time messages
      socket.on('join-conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;
        console.log('User joined conversation:', conversationId);
        
        socket.join(`conversation-${conversationId}`);
        
        // Track this connection in conversation rooms
        if (!this.conversationRooms.has(conversationId)) {
          this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId)!.add(socket.id);
      });

      // Leave conversation room
      socket.on('leave-conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;
        console.log('User left conversation:', conversationId);
        
        socket.leave(`conversation-${conversationId}`);
        
        // Remove from conversation rooms tracking
        const roomUsers = this.conversationRooms.get(conversationId);
        if (roomUsers) {
          roomUsers.delete(socket.id);
          if (roomUsers.size === 0) {
            this.conversationRooms.delete(conversationId);
          }
        }
      });

      // Clear notifications for a specific conversation
      socket.on('clear-notifications', (data: { conversationId: string }) => {
        const { conversationId } = data;
        const userId = this.socketUsers.get(socket.id);
        
        if (userId) {
          console.log(`Clearing notifications for user ${userId} in conversation ${conversationId}`);
          
          // Send clear notification event to the user
          socket.emit('notifications-cleared', { conversationId });
        }
      });

      // Exchange encryption keys between users
      socket.on('exchange-keys', async (data: { targetUserId: string, publicKey: string }) => {
        const senderId = this.socketUsers.get(socket.id);
        if (!senderId) return;

        const senderEncryption = this.encryptionServices.get(senderId);
        const targetSocketId = this.userSockets.get(data.targetUserId);

        if (senderEncryption && targetSocketId) {
          // Establish session between users
          await senderEncryption.establishSession(data.targetUserId, data.publicKey);
          
          // Send sender's public key to target
          const senderPublicKey = await senderEncryption.getPublicKey();
          this.io.to(targetSocketId).emit('keys-exchanged', {
            fromUserId: senderId,
            publicKey: senderPublicKey
          });

          
        }
      });

      // Initiate encrypted call
      socket.on('initiate-call', async (data: { 
        targetUserId: string, 
        type: 'voice' | 'video',
        offer?: RTCSessionDescriptionInit 
      }) => {
        const callerId = this.socketUsers.get(socket.id);
        
        console.log(`🔥 CALL INITIATION DEBUG:`);
        console.log(`- Caller socket ID: ${socket.id}`);
        console.log(`- Caller user ID: ${callerId}`);
        console.log(`- Target user ID: ${data.targetUserId}`);
        console.log(`- Call type: ${data.type}`);
        console.log(`- User sockets map:`, Array.from(this.userSockets.entries()));
        console.log(`- Socket users map:`, Array.from(this.socketUsers.entries()));
        
        if (!callerId) {
          console.log(`❌ No caller ID found for socket ${socket.id}`);
          return;
        }

        const targetSocketId = this.userSockets.get(data.targetUserId);
        const callerEncryption = this.encryptionServices.get(callerId);
        
        console.log(`- Target socket ID: ${targetSocketId}`);
        console.log(`- Caller encryption service exists: ${!!callerEncryption}`);
        console.log(`- Available encryption services:`, Array.from(this.encryptionServices.keys()));

        if (targetSocketId && callerEncryption) {
          const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Get target user's encryption service
          const targetEncryption = this.encryptionServices.get(data.targetUserId);
          if (!targetEncryption) {
            
            return;
          }

          try {
            // Ensure shared secret is established between users
            const callerPublicKey = await callerEncryption.getPublicKey();
            const targetPublicKey = await targetEncryption.getPublicKey();
            
            // Establish shared secrets for both users
            await callerEncryption.establishSession(data.targetUserId, targetPublicKey);
            await targetEncryption.establishSession(callerId, callerPublicKey);
            
            
            
            // Create active call record
            const call: ActiveCall = {
              id: callId,
              participants: [
                {
                  userId: callerId,
                  socketId: socket.id,
                  encryptionService: callerEncryption
                }
              ],
              type: data.type,
              startTime: new Date(),
              encrypted: true
            };

            this.activeCalls.set(callId, call);

            // Encrypt call initiation data if offer is provided
            let encryptedOffer: string | undefined;
            if (data.offer) {
              encryptedOffer = await callerEncryption.encryptSignalingData(data.targetUserId, data.offer);
            }

            // Send encrypted call invitation
            console.log(`📞 Sending incoming-call event to target socket ${targetSocketId}`);
            console.log(`- Call ID: ${callId}`);
            console.log(`- From user: ${callerId}`);
            console.log(`- Call type: ${data.type}`);
            console.log(`- Encrypted offer available: ${!!encryptedOffer}`);
            
            this.io.to(targetSocketId).emit('incoming-call', {
              callId,
              fromUserId: callerId,
              type: data.type,
              encryptedOffer,
              encrypted: true
            });

            console.log(`✅ Encrypted call invitation sent successfully`);
            
          } catch (error) {
            
            // Send unencrypted call as fallback
            const call: ActiveCall = {
              id: callId,
              participants: [
                {
                  userId: callerId,
                  socketId: socket.id,
                  encryptionService: callerEncryption
                }
              ],
              type: data.type,
              startTime: new Date(),
              encrypted: false
            };

            this.activeCalls.set(callId, call);

            this.io.to(targetSocketId).emit('incoming-call', {
              callId,
              fromUserId: callerId,
              type: data.type,
              offer: data.offer,
              encrypted: false
            });

            
          }
        } else {
          
          if (!targetSocketId) {
            
          }
          if (!callerEncryption) {
            
          }
        }
      });

      // Accept encrypted call
      socket.on('accept-call', async (data: { 
        callId: string, 
        answer?: RTCSessionDescriptionInit 
      }) => {
        const accepterId = this.socketUsers.get(socket.id);
        if (!accepterId) return;

        const call = this.activeCalls.get(data.callId);
        if (!call) return;

        const accepterEncryption = this.encryptionServices.get(accepterId);
        if (!accepterEncryption) return;

        // Add accepter to call
        call.participants.push({
          userId: accepterId,
          socketId: socket.id,
          encryptionService: accepterEncryption
        });

        // Encrypt answer if provided and encryption is available
        let encryptedAnswer: string | undefined;
        let isEncrypted = call.encrypted;
        
        if (data.answer && call.participants.length > 1 && call.encrypted) {
          const callerId = call.participants[0].userId;
          try {
            encryptedAnswer = await accepterEncryption.encryptSignalingData(callerId, data.answer);
          } catch (error) {
            
            // Fall back to unencrypted
            isEncrypted = false;
          }
        }

        // Notify caller that call was accepted
        const callerSocketId = call.participants[0].socketId;
        this.io.to(callerSocketId).emit('call-accepted', {
          callId: data.callId,
          byUserId: accepterId,
          encryptedAnswer: isEncrypted ? encryptedAnswer : undefined,
          answer: !isEncrypted ? data.answer : undefined,
          encrypted: isEncrypted
        });

        
      });

      // Handle encrypted ICE candidates
      socket.on('ice-candidate', async (data: {
        callId: string,
        targetUserId: string,
        candidate: RTCIceCandidateInit
      }) => {
        const senderId = this.socketUsers.get(socket.id);
        if (!senderId) return;

        const senderEncryption = this.encryptionServices.get(senderId);
        const targetSocketId = this.userSockets.get(data.targetUserId);

        if (senderEncryption && targetSocketId) {
          try {
            // Encrypt ICE candidate
            const encryptedCandidate = await senderEncryption.encryptSignalingData(
              data.targetUserId, 
              data.candidate
            );

            this.io.to(targetSocketId).emit('ice-candidate', {
              callId: data.callId,
              fromUserId: senderId,
              encryptedCandidate,
              encrypted: true
            });
          } catch (error) {
            
            // Send unencrypted as fallback
            this.io.to(targetSocketId).emit('ice-candidate', {
              callId: data.callId,
              fromUserId: senderId,
              candidate: data.candidate,
              encrypted: false
            });
          }
        }
      });

      // Handle encrypted SDP offers/answers
      socket.on('webrtc-signal', async (data: {
        callId: string,
        targetUserId: string,
        signalData: any,
        type: 'offer' | 'answer' | 'ice-candidate'
      }) => {
        const senderId = this.socketUsers.get(socket.id);
        if (!senderId) return;

        const senderEncryption = this.encryptionServices.get(senderId);
        const targetSocketId = this.userSockets.get(data.targetUserId);

        if (senderEncryption && targetSocketId) {
          try {
            // Encrypt signaling data
            const encryptedSignal = await senderEncryption.encryptSignalingData(
              data.targetUserId,
              data.signalData
            );

            this.io.to(targetSocketId).emit('webrtc-signal', {
              callId: data.callId,
              fromUserId: senderId,
              encryptedSignal,
              type: data.type,
              encrypted: true
            });
          } catch (error) {
            
            // Send unencrypted as fallback
            this.io.to(targetSocketId).emit('webrtc-signal', {
              callId: data.callId,
              fromUserId: senderId,
              signalData: data.signalData,
              type: data.type,
              encrypted: false
            });
          }
        }
      });

      // End call
      socket.on('end-call', (data: { callId: string }) => {
        const call = this.activeCalls.get(data.callId);
        if (!call) return;

        // Notify all participants
        call.participants.forEach(participant => {
          if (participant.socketId !== socket.id) {
            this.io.to(participant.socketId).emit('call-ended', {
              callId: data.callId,
              endedBy: this.socketUsers.get(socket.id),
              reason: 'user-ended'
            });
          }
        });

        // Remove call from active calls
        this.activeCalls.delete(data.callId);
        
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userId = this.socketUsers.get(socket.id);
        
        if (userId) {
          // End any active calls for this user
          const callsToEnd: string[] = [];
          this.activeCalls.forEach((call, callId) => {
            const participantIndex = call.participants.findIndex((p: CallParticipant) => p.socketId === socket.id);
            if (participantIndex !== -1) {
              // Notify other participants
              call.participants.forEach((participant: CallParticipant) => {
                if (participant.socketId !== socket.id) {
                  this.io.to(participant.socketId).emit('call-ended', {
                    callId,
                    endedBy: userId,
                    reason: 'disconnect'
                  });
                }
              });
              
              callsToEnd.push(callId);
            }
          });
          
          callsToEnd.forEach(callId => this.activeCalls.delete(callId));

          // Clean up mappings
          this.userSockets.delete(userId);
          this.socketUsers.delete(socket.id);
        }

        
      });
    });
  }

  // Get active calls for monitoring
  getActiveCalls(): ActiveCall[] {
    return Array.from(this.activeCalls.values());
  }

  // Force end a call (admin function)
  forceEndCall(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    call.participants.forEach(participant => {
      this.io.to(participant.socketId).emit('call-ended', {
        callId,
        endedBy: 'system',
        reason: 'admin-ended'
      });
    });

    this.activeCalls.delete(callId);
    return true;
  }

  // Broadcast new message to all users in a conversation
  broadcastNewMessage(conversationId: string, message: any): void {
    const roomName = `conversation-${conversationId}`;
    console.log(`Broadcasting message to room: ${roomName}`);
    this.io.to(roomName).emit('new_message', {
      conversationId,
      senderId: message.senderId,
      senderName: message.sender?.effectiveDisplayName || 'Unknown User',
      content: message.content,
      messageType: message.messageType,
      timestamp: new Date().toISOString()
    });
  }

  // Send instant notification to specific user
  sendInstantNotification(userId: string, notification: {
    type: 'message' | 'call' | 'transaction';
    title: string;
    body: string;
    conversationId?: string;
    messageId?: string;
    fromUserId?: string;
    fromUserName?: string;
  }): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      console.log(`Sending instant notification to user ${userId}`);
      this.io.to(socketId).emit('instant-notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get Socket.IO instance for external use
  getSocketIOInstance(): any {
    return this.io;
  }
}