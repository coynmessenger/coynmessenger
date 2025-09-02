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
        
        console.log('🔐 SERVER: User authentication request');
        console.log('- User ID:', userId);
        console.log('- Socket ID:', socket.id);
        
        // Store user-socket mapping (OVERWRITE previous connections)
        const previousSocketId = this.userSockets.get(userId);
        if (previousSocketId) {
          console.log('⚠️ SERVER: User', userId, 'had previous socket:', previousSocketId, 'replacing with:', socket.id);
        }
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, userId);
        
        console.log('- User sockets map size:', this.userSockets.size);
        console.log('- All authenticated users:', Array.from(this.userSockets.keys()));

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
        const userId = this.socketUsers.get(socket.id);

        console.log('🏠 SERVER: User joining conversation room');
        console.log('- User ID:', userId);
        console.log('- Socket ID:', socket.id);
        console.log('- Conversation ID:', conversationId);
        
        socket.join(`conversation-${conversationId}`);
        
        // Track this connection in conversation rooms
        if (!this.conversationRooms.has(conversationId)) {
          this.conversationRooms.set(conversationId, new Set());
        }
        this.conversationRooms.get(conversationId)!.add(socket.id);
        
        console.log('- Room users count:', this.conversationRooms.get(conversationId)?.size || 0);
      });

      // Leave conversation room
      socket.on('leave-conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;

        
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

          
          // Send clear notification event to the user
          socket.emit('notifications-cleared', { conversationId });
        }
      });

      // Test ping handler for debugging
      socket.on('ping-test', (data: { timestamp: number }) => {
        console.log('🚨 CRITICAL DEBUG: Received ping-test from socket:', socket.id, 'at', new Date().toISOString());
        console.log('🚨 CRITICAL DEBUG: Ping data:', data);
        const userId = this.socketUsers.get(socket.id);
        console.log('🚨 CRITICAL DEBUG: User ID for this socket:', userId);
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
        
        console.log('📞 DEEP TEST: ===============================');
        console.log('📞 DEEP TEST: SERVER RECEIVED initiate-call EVENT');
        console.log('📞 DEEP TEST: ===============================');
        console.log('📞 DEEP TEST: Caller socket ID:', socket.id);
        console.log('📞 DEEP TEST: Caller user ID:', callerId);
        console.log('📞 DEEP TEST: Target user ID:', data.targetUserId);
        console.log('📞 DEEP TEST: Call type:', data.type);
        console.log('📞 DEEP TEST: Offer provided:', !!data.offer);
        console.log('📞 DEEP TEST: Current user-socket mappings:');
        this.userSockets.forEach((socketId, userId) => {
          console.log(`📞 DEEP TEST:   User ${userId} -> Socket ${socketId}`);
        });
        
        // Debug: Call initiation
        if (!callerId) {
          console.error('📞 DEEP TEST: ❌ AUTHENTICATION ERROR - No caller ID found for socket:', socket.id);
          socket.emit('call-error', { error: 'Caller not authenticated' });
          return;
        }

        const targetSocketId = this.userSockets.get(data.targetUserId);
        const callerEncryption = this.encryptionServices.get(callerId);
        
        console.log('📞 DEEP TEST: Target socket lookup result:', targetSocketId);
        console.log('📞 DEEP TEST: Caller encryption service available:', !!callerEncryption);
        
        if (!targetSocketId) {
          console.error('📞 DEEP TEST: ❌ TARGET USER NOT FOUND - User', data.targetUserId, 'is not connected');
          socket.emit('call-error', { error: 'Target user not found or not connected' });
          return;
        }

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
            console.log('📞 DEEP TEST: ===============================');
            console.log('📞 DEEP TEST: SENDING CALL TO TARGET USER');
            console.log('📞 DEEP TEST: ===============================');
            console.log('📞 DEEP TEST: Target socket ID:', targetSocketId);
            console.log('📞 DEEP TEST: Call ID:', callId);
            console.log('📞 DEEP TEST: From user:', callerId);
            console.log('📞 DEEP TEST: Call type:', data.type);
            console.log('📞 DEEP TEST: Offer data available:', !!data.offer);
            console.log('📞 DEEP TEST: Encrypted offer available:', !!encryptedOffer);
            console.log('📞 DEEP TEST: About to emit incoming-call event...');
            
            this.io.to(targetSocketId).emit('incoming-call', {
              callId,
              fromUserId: callerId,
              type: data.type,
              encryptedOffer,
              offer: data.offer, // Always include plain offer as fallback
              encrypted: true
            });

            console.log('📤 SERVER: incoming-call event sent successfully');
            
            // Notify caller that call is being placed
            socket.emit('call-initiated', { callId, targetUserId: data.targetUserId });
            
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
        if (!accepterId) {
          console.error('❌ SERVER: accept-call - accepter not found');
          return;
        }

        console.log('📞 SERVER: accept-call received');
        console.log('- Accepter ID:', accepterId);
        console.log('- Call ID:', data.callId);

        const call = this.activeCalls.get(data.callId);
        if (!call) {
          console.error('❌ SERVER: Call not found:', data.callId);
          return;
        }

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
        console.log('📤 SERVER: Sending call-accepted to caller');
        console.log('- To socket:', callerSocketId);
        console.log('- Answer included:', !!data.answer);
        console.log('- Encrypted:', isEncrypted);
        
        this.io.to(callerSocketId).emit('call-accepted', {
          callId: data.callId,
          byUserId: accepterId,
          encryptedAnswer: isEncrypted ? encryptedAnswer : undefined,
          answer: !isEncrypted ? data.answer : undefined,
          encrypted: isEncrypted
        });
        
        console.log('✅ SERVER: call-accepted event sent successfully');
        
        // Send confirmation back to accepter that acceptance was processed
        socket.emit('call-accepted-confirmation', {
          callId: data.callId,
          fromUserId: call.participants[0].userId
        });

        
      });

      // Handle encrypted ICE candidates
      socket.on('ice-candidate', async (data: {
        callId: string,
        targetUserId: string,
        candidate: RTCIceCandidateInit
      }) => {
        const senderId = this.socketUsers.get(socket.id);
        if (!senderId) {
          console.error('❌ SERVER: ICE candidate sender not found');
          return;
        }

        console.log('🧊 SERVER: ICE candidate received');
        console.log('- From:', senderId);
        console.log('- To:', data.targetUserId);
        console.log('- Call ID:', data.callId);
        console.log('- Candidate type:', (data.candidate as any).type);

        const senderEncryption = this.encryptionServices.get(senderId);
        const targetSocketId = this.userSockets.get(data.targetUserId);

        if (senderEncryption && targetSocketId) {
          try {
            // Encrypt ICE candidate
            const encryptedCandidate = await senderEncryption.encryptSignalingData(
              data.targetUserId, 
              data.candidate
            );

            console.log('📤 SERVER: Sending encrypted ICE candidate to target');
            this.io.to(targetSocketId).emit('ice-candidate', {
              callId: data.callId,
              fromUserId: senderId,
              encryptedCandidate,
              encrypted: true
            });
          } catch (error) {
            
            console.log('📤 SERVER: Sending unencrypted ICE candidate to target (fallback)');
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

          // Clean up mappings - CRITICAL: Only remove if this socket is the current one
          const currentSocketId = this.userSockets.get(userId);
          if (currentSocketId === socket.id) {
            console.log('🔌 SERVER: Removing user socket mapping on disconnect');
            console.log('- User ID:', userId);
            console.log('- Socket ID:', socket.id);
            this.userSockets.delete(userId);
          } else {
            console.log('🔌 SERVER: Skipping socket removal - not current socket');
            console.log('- User ID:', userId);
            console.log('- Disconnected socket:', socket.id);
            console.log('- Current socket for user:', currentSocketId);
          }
          
          // Always remove from socketUsers mapping
          this.socketUsers.delete(socket.id);
        }

        // Clean up conversation rooms
        this.conversationRooms.forEach((sockets, conversationId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.conversationRooms.delete(conversationId);
          }
        });
        
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
    const roomUsers = this.conversationRooms.get(conversationId);

    console.log('📡 SERVER: Broadcasting new message');
    console.log('- Conversation ID:', conversationId);
    console.log('- Room name:', roomName);
    console.log('- Room users count:', roomUsers?.size || 0);
    console.log('- Sender ID:', message.senderId);
    console.log('- Message content:', message.content);

    this.io.to(roomName).emit('new_message', {
      conversationId,
      senderId: message.senderId,
      senderName: message.sender?.effectiveDisplayName || 'Unknown User',
      content: message.content,
      messageType: message.messageType,
      timestamp: new Date().toISOString()
    });

    console.log('✅ SERVER: new_message event emitted to room:', roomName);
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
    
    console.log('🔔 SERVER: Sending instant notification');
    console.log('- Target User ID:', userId);
    console.log('- Target Socket ID:', socketId);
    console.log('- Notification type:', notification.type);
    console.log('- Notification title:', notification.title);
    
    if (socketId) {
      this.io.to(socketId).emit('instant-notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      console.log('✅ SERVER: instant-notification event emitted to socket:', socketId);
    } else {
      console.log('❌ SERVER: No socket found for user:', userId);
    }
  }

  // Get Socket.IO instance for external use
  getSocketIOInstance(): any {
    return this.io;
  }
}