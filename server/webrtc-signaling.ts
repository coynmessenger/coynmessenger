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
      console.log('User connected:', socket.id);

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

        console.log(`User ${userId} authenticated with encryption`);
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

          console.log(`Encryption keys exchanged between ${senderId} and ${data.targetUserId}`);
        }
      });

      // Initiate encrypted call
      socket.on('initiate-call', async (data: { 
        targetUserId: string, 
        type: 'voice' | 'video',
        offer?: RTCSessionDescriptionInit 
      }) => {
        const callerId = this.socketUsers.get(socket.id);
        if (!callerId) return;

        const targetSocketId = this.userSockets.get(data.targetUserId);
        const callerEncryption = this.encryptionServices.get(callerId);

        if (targetSocketId && callerEncryption) {
          const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
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
          this.io.to(targetSocketId).emit('incoming-call', {
            callId,
            fromUserId: callerId,
            type: data.type,
            encryptedOffer,
            encrypted: true
          });

          console.log(`Encrypted ${data.type} call initiated: ${callId} from ${callerId} to ${data.targetUserId}`);
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

        // Encrypt answer if provided
        let encryptedAnswer: string | undefined;
        if (data.answer && call.participants.length > 1) {
          const callerId = call.participants[0].userId;
          encryptedAnswer = await accepterEncryption.encryptSignalingData(callerId, data.answer);
        }

        // Notify caller that call was accepted
        const callerSocketId = call.participants[0].socketId;
        this.io.to(callerSocketId).emit('call-accepted', {
          callId: data.callId,
          byUserId: accepterId,
          encryptedAnswer,
          encrypted: true
        });

        console.log(`Encrypted call ${data.callId} accepted by ${accepterId}`);
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
        console.log(`Call ${data.callId} ended`);
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

        console.log('User disconnected:', socket.id);
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
}