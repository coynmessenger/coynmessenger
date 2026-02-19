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
  private verboseLogging = process.env.NODE_ENV === 'development'; // Enable detailed logs in development only

  // Helper method for verbose logging
  private log(...args: any[]) {
    if (this.verboseLogging) {
      console.log(...args);
    }
  }

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
      socket.on('authenticate', async (data: { userId: string | number }) => {
        const userId = String(data.userId); // Ensure consistent string format
        
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
        callId: string,
        targetUserId: string, 
        type: 'voice' | 'video',
        offer?: RTCSessionDescriptionInit 
      }) => {
        const callerId = this.socketUsers.get(socket.id);
        
        if (this.verboseLogging) {
          console.log('\n');
          console.log('════════════════════════════════════════════════════════');
          console.log('📞 CALL FLOW: [1/6] INITIATE-CALL EVENT RECEIVED');
          console.log('════════════════════════════════════════════════════════');
          console.log('📞 Timestamp:', new Date().toISOString());
          console.log('📞 Caller Socket ID:', socket.id);
          console.log('📞 Caller User ID:', callerId);
          console.log('📞 Target User ID:', data.targetUserId);
          console.log('📞 Call ID:', data.callId);
          console.log('📞 Call Type:', data.type);
          console.log('📞 Offer Provided:', !!data.offer);
          console.log('📞 Current Active User-Socket Mappings:');
          this.userSockets.forEach((socketId, userId) => {
            const socket = this.io.sockets.sockets.get(socketId);
            const isConnected = socket?.connected ? '✅' : '❌';
            console.log(`   ${isConnected} User ${userId} -> Socket ${socketId}`);
          });
        } else {
          // Production: minimal logging
          console.log(`📞 Call initiated: ${callerId} → ${data.targetUserId} (${data.type})`);
        }
        
        // Validate caller authentication
        if (!callerId) {
          console.error('❌ CALL FLOW: ERROR - Caller not authenticated');
          console.error('   Socket ID:', socket.id);
          socket.emit('call-error', { error: 'Caller not authenticated' });
          return;
        }

        this.log('✅ CALL FLOW: Caller authenticated');
        
        // Lookup target socket
        const targetSocketId = this.userSockets.get(data.targetUserId);
        this.log('\n📞 CALL FLOW: [2/6] TARGET SOCKET LOOKUP');
        this.log('   Target User ID:', data.targetUserId);
        this.log('   Target Socket ID:', targetSocketId || 'NOT FOUND');
        
        if (!targetSocketId) {
          console.error('❌ CALL FLOW: ERROR - Target user not found or not connected');
          console.error('   Requested User ID:', data.targetUserId);
          console.error('   Available users:', Array.from(this.userSockets.keys()).join(', '));
          socket.emit('call-error', { error: 'Target user not found or not connected' });
          return;
        }
        
        const targetSocket = this.io.sockets.sockets.get(targetSocketId);
        if (!targetSocket || !targetSocket.connected) {
          console.error('❌ CALL FLOW: ERROR - Target socket disconnected');
          console.error('   Socket ID:', targetSocketId);
          console.error('   Connected:', targetSocket?.connected);
          socket.emit('call-error', { error: 'Target user disconnected' });
          return;
        }
        
        this.log('✅ CALL FLOW: Target socket is connected and reachable');
        
        const callerEncryption = this.encryptionServices.get(callerId);
        this.log('\n📞 CALL FLOW: [3/6] ENCRYPTION SETUP');
        this.log('   Caller encryption available:', !!callerEncryption);
        this.log('   Target encryption available:', !!this.encryptionServices.get(data.targetUserId));

        if (targetSocketId && callerEncryption) {
          // Use the incoming callId from client to maintain synchronization
          const callId = data.callId || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('✅ CALL FLOW: Using call ID:', callId);
          
          // Send instant notification for toast/browser notification
          console.log('\n📞 CALL FLOW: [4/6] SENDING NOTIFICATIONS');
          console.log('   Sending instant notification for UI toast...');
          this.sendInstantNotification(data.targetUserId, {
            type: 'call',
            title: `Incoming ${data.type} call`,
            body: `Call from user ${callerId}`,
            fromUserId: callerId,
            fromUserName: `User ${callerId}`,
            conversationId: callId,
          });
          console.log('✅ Instant notification sent');
          
          // Get target user's encryption service
          const targetEncryption = this.encryptionServices.get(data.targetUserId);
          if (!targetEncryption) {
            console.error('❌ CALL FLOW: ERROR - No encryption service for target user');
            socket.emit('call-error', { error: 'Target user encryption not available' });
            return;
          }

          try {
            // Ensure shared secret is established between users
            const callerPublicKey = await callerEncryption.getPublicKey();
            const targetPublicKey = await targetEncryption.getPublicKey();
            
            console.log('   Establishing encrypted session...');
            await callerEncryption.establishSession(data.targetUserId, targetPublicKey);
            await targetEncryption.establishSession(callerId, callerPublicKey);
            console.log('✅ Encrypted session established');
            
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
            console.log('✅ Active call record created');

            // Encrypt call initiation data if offer is provided
            let encryptedOffer: string | undefined;
            if (data.offer) {
              encryptedOffer = await callerEncryption.encryptSignalingData(data.targetUserId, data.offer);
              console.log('✅ WebRTC offer encrypted');
            }

            // Send encrypted call invitation to target
            console.log('\n════════════════════════════════════════════════════════');
            console.log('📞 CALL FLOW: [5/6] SENDING INCOMING-CALL EVENT');
            console.log('════════════════════════════════════════════════════════');
            console.log('   Event: incoming-call');
            console.log('   Target Socket ID:', targetSocketId);
            console.log('   Call ID:', callId);
            console.log('   From User:', callerId);
            console.log('   Call Type:', data.type);
            console.log('   Plain Offer Included:', !!data.offer);
            console.log('   Encrypted Offer Included:', !!encryptedOffer);
            console.log('   Encrypted:', true);
            
            const targetSocket = this.io.sockets.sockets.get(targetSocketId);
            if (targetSocket && targetSocket.connected) {
              targetSocket.emit('incoming-call', {
                callId,
                fromUserId: callerId,
                type: data.type,
                encryptedOffer,
                offer: data.offer, // Always include plain offer as fallback
                encrypted: true
              });
              console.log('✅ CALL FLOW: incoming-call event emitted successfully');
              console.log('   Target should now receive the call!\n');
            } else {
              console.error('❌ CRITICAL: Target socket not found or disconnected:', targetSocketId);
              socket.emit('call-error', { error: 'Target user disconnected' });
              return;
            }
            
            // Notify caller that call was initiated (SINGLE EMISSION)
            console.log('📞 CALL FLOW: [6/6] CONFIRMING TO CALLER');
            console.log('   Sending call-initiated confirmation to caller');
            socket.emit('call-initiated', { callId, targetUserId: data.targetUserId });
            console.log('✅ CALL FLOW: Call initiation complete!\n');
            
          } catch (error) {
            console.error('⚠️ CALL FLOW: Encryption failed, falling back to unencrypted call');
            console.error('   Error:', error);
            
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
            console.log('✅ Active call record created (unencrypted)');

            console.log('\n📞 CALL FLOW: FALLBACK - Sending unencrypted incoming-call');
            const targetSocket = this.io.sockets.sockets.get(targetSocketId);
            if (targetSocket && targetSocket.connected) {
              targetSocket.emit('incoming-call', {
                callId,
                fromUserId: callerId,
                type: data.type,
                offer: data.offer,
                encrypted: false
              });
              console.log('✅ CALL FLOW: Unencrypted incoming-call sent\n');
            } else {
              console.error('❌ CRITICAL: Target socket not found in fallback:', targetSocketId);
              socket.emit('call-error', { error: 'Target user disconnected' });
              return;
            }

            // Confirm to caller
            socket.emit('call-initiated', { callId, targetUserId: data.targetUserId });
          }
        } else {
          console.error('❌ CALL FLOW: Missing requirements');
          if (!targetSocketId) {
            console.error('   Target socket ID not found');
          }
          if (!callerEncryption) {
            console.error('   Caller encryption service not available');
          }
        }
      });

      // Accept encrypted call
      socket.on('accept-call', async (data: { 
        callId: string, 
        answer?: RTCSessionDescriptionInit 
      }) => {
        const accepterId = this.socketUsers.get(socket.id);
        
        console.log('\n');
        console.log('════════════════════════════════════════════════════════');
        console.log('📞 ACCEPT FLOW: [1/4] ACCEPT-CALL EVENT RECEIVED');
        console.log('════════════════════════════════════════════════════════');
        console.log('📞 Timestamp:', new Date().toISOString());
        console.log('📞 Accepter Socket ID:', socket.id);
        console.log('📞 Accepter User ID:', accepterId || 'NOT FOUND');
        console.log('📞 Call ID:', data.callId);
        console.log('📞 Answer Provided:', !!data.answer);
        
        if (!accepterId) {
          console.error('❌ ACCEPT FLOW: ERROR - Accepter not authenticated');
          return;
        }

        const call = this.activeCalls.get(data.callId);
        if (!call) {
          console.error('❌ ACCEPT FLOW: ERROR - Call not found');
          console.error('   Call ID:', data.callId);
          console.error('   Active calls:', Array.from(this.activeCalls.keys()).join(', '));
          return;
        }
        
        console.log('✅ ACCEPT FLOW: Call found in active calls');
        console.log('   Caller:', call.participants[0]?.userId || 'unknown');

        const accepterEncryption = this.encryptionServices.get(accepterId);
        if (!accepterEncryption) {
          console.error('❌ ACCEPT FLOW: ERROR - No encryption service for accepter');
          return;
        }

        console.log('\n📞 ACCEPT FLOW: [2/4] ADDING ACCEPTER TO CALL');
        // Add accepter to call
        call.participants.push({
          userId: accepterId,
          socketId: socket.id,
          encryptionService: accepterEncryption
        });
        console.log('✅ Accepter added to call participants');
        console.log('   Total participants:', call.participants.length);

        // Encrypt answer if provided and encryption is available
        let encryptedAnswer: string | undefined;
        let isEncrypted = call.encrypted;
        
        console.log('\n📞 ACCEPT FLOW: [3/4] PROCESSING ANSWER');
        if (data.answer && call.participants.length > 1 && call.encrypted) {
          const callerId = call.participants[0].userId;
          try {
            console.log('   Encrypting WebRTC answer...');
            encryptedAnswer = await accepterEncryption.encryptSignalingData(callerId, data.answer);
            console.log('✅ Answer encrypted successfully');
          } catch (error) {
            console.error('⚠️ Answer encryption failed, falling back to unencrypted');
            console.error('   Error:', error);
            // Fall back to unencrypted
            isEncrypted = false;
          }
        } else {
          console.log('   Using unencrypted answer');
        }

        const callerId = call.participants[0].userId;
        const storedCallerSocketId = call.participants[0].socketId;
        const currentCallerSocketId = this.userSockets.get(callerId) || storedCallerSocketId;
        
        if (currentCallerSocketId !== storedCallerSocketId) {
          console.log('⚠️ ACCEPT FLOW: Caller socket changed since call initiation');
          console.log('   Old socket:', storedCallerSocketId, '→ New socket:', currentCallerSocketId);
          call.participants[0].socketId = currentCallerSocketId;
        }
        
        console.log('\n════════════════════════════════════════════════════════');
        console.log('📞 ACCEPT FLOW: [4/4] SENDING CALL-ACCEPTED TO CALLER');
        console.log('════════════════════════════════════════════════════════');
        console.log('   Event: call-accepted');
        console.log('   To Socket ID:', currentCallerSocketId);
        console.log('   By User:', accepterId);
        console.log('   Call ID:', data.callId);
        console.log('   Plain Answer Included:', !!data.answer);
        console.log('   Encrypted Answer Included:', !!encryptedAnswer);
        console.log('   Encrypted:', isEncrypted);
        
        this.io.to(currentCallerSocketId).emit('call-accepted', {
          callId: data.callId,
          byUserId: accepterId,
          encryptedAnswer: isEncrypted ? encryptedAnswer : undefined,
          answer: data.answer, // CRITICAL: Always include plain answer for WebRTC handshake
          encrypted: isEncrypted
        });
        
        console.log('✅ ACCEPT FLOW: call-accepted event sent to caller');
        
        // Send confirmation back to accepter that acceptance was processed
        socket.emit('call-accepted-confirmation', {
          callId: data.callId,
          fromUserId: call.participants[0].userId
        });
        
        console.log('✅ ACCEPT FLOW: Confirmation sent to accepter');
        console.log('✅ ACCEPT FLOW: Call acceptance complete!\n');
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
              candidate: data.candidate, // CRITICAL: Always include plain candidate for WebRTC
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
        const userId = this.socketUsers.get(socket.id);
        
        console.log('\n');
        console.log('════════════════════════════════════════════════════════');
        console.log('📞 END CALL: EVENT RECEIVED');
        console.log('════════════════════════════════════════════════════════');
        console.log('📞 Timestamp:', new Date().toISOString());
        console.log('📞 Ended by Socket ID:', socket.id);
        console.log('📞 Ended by User ID:', userId || 'unknown');
        console.log('📞 Call ID:', data.callId);
        
        const call = this.activeCalls.get(data.callId);
        if (!call) {
          console.error('❌ END CALL: Call not found');
          console.error('   Call ID:', data.callId);
          console.error('   Active calls:', Array.from(this.activeCalls.keys()).join(', '));
          return;
        }

        console.log('✅ END CALL: Call found');
        console.log('   Participants:', call.participants.length);

        let notifiedCount = 0;
        call.participants.forEach(participant => {
          if (participant.userId !== userId) {
            const currentSocketId = this.userSockets.get(participant.userId) || participant.socketId;
            console.log('   Notifying participant:', participant.userId, 'at socket:', currentSocketId);
            this.io.to(currentSocketId).emit('call-ended', {
              callId: data.callId,
              endedBy: userId,
              reason: 'user-ended'
            });
            notifiedCount++;
          }
        });
        
        console.log('✅ END CALL: Notified', notifiedCount, 'participant(s)');

        // Remove call from active calls
        this.activeCalls.delete(data.callId);
        console.log('✅ END CALL: Call removed from active calls');
        console.log('   Remaining active calls:', this.activeCalls.size);
        console.log('✅ END CALL: Complete!\n');
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