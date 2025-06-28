import { io, Socket } from 'socket.io-client';

export interface EncryptedCall {
  callId: string;
  participants: string[];
  type: 'voice' | 'video';
  encrypted: boolean;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
}

export interface CallEventHandlers {
  onIncomingCall?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video' }) => void;
  onCallAccepted?: (call: { callId: string; byUserId: string }) => void;
  onCallEnded?: (call: { callId: string; endedBy: string; reason: string }) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onEncryptionStatusChanged?: (encrypted: boolean) => void;
}

export class EncryptedWebRTCService {
  private socket: Socket | null = null;
  private activeCalls = new Map<string, EncryptedCall>();
  private localUserId: string | null = null;
  private publicKey: string | null = null;
  private eventHandlers: CallEventHandlers = {};
  private isInitialized = false;

  // WebRTC configuration with STUN servers
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: true,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to encrypted WebRTC signaling server');
    });

    this.socket.on('authenticated', (data: { userId: string; publicKey: string; encryptionEnabled: boolean }) => {
      this.localUserId = data.userId;
      this.publicKey = data.publicKey;
      this.isInitialized = true;
      console.log('WebRTC authentication successful, encryption enabled:', data.encryptionEnabled);
      
      if (this.eventHandlers.onEncryptionStatusChanged) {
        this.eventHandlers.onEncryptionStatusChanged(data.encryptionEnabled);
      }
    });

    this.socket.on('keys-exchanged', (data: { fromUserId: string; publicKey: string }) => {
      console.log('Encryption keys exchanged with user:', data.fromUserId);
      // Keys are automatically handled on the server side
    });

    this.socket.on('incoming-call', async (data: {
      callId: string;
      fromUserId: string;
      type: 'voice' | 'video';
      encryptedOffer?: string;
      encrypted: boolean;
    }) => {
      console.log('Incoming encrypted call:', data);
      
      if (this.eventHandlers.onIncomingCall) {
        this.eventHandlers.onIncomingCall({
          callId: data.callId,
          fromUserId: data.fromUserId,
          type: data.type,
        });
      }

      // Store call information
      this.activeCalls.set(data.callId, {
        callId: data.callId,
        participants: [data.fromUserId, this.localUserId!],
        type: data.type,
        encrypted: data.encrypted,
      });
    });

    this.socket.on('call-accepted', async (data: {
      callId: string;
      byUserId: string;
      encryptedAnswer?: string;
      encrypted: boolean;
    }) => {
      console.log('Call accepted:', data);
      
      if (this.eventHandlers.onCallAccepted) {
        this.eventHandlers.onCallAccepted({
          callId: data.callId,
          byUserId: data.byUserId,
        });
      }
    });

    this.socket.on('call-ended', (data: {
      callId: string;
      endedBy: string;
      reason: string;
    }) => {
      console.log('Call ended:', data);
      
      if (this.eventHandlers.onCallEnded) {
        this.eventHandlers.onCallEnded(data);
      }

      this.endCall(data.callId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from encrypted WebRTC signaling server');
      this.isInitialized = false;
    });
  }

  // Initialize the service with user authentication
  async initialize(userId: string): Promise<void> {
    if (!this.socket) {
      this.initializeSocket();
    }

    return new Promise((resolve, reject) => {
      if (this.isInitialized && this.localUserId === userId) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 10000);

      this.socket!.once('authenticated', (data) => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.emit('authenticate', { userId });
    });
  }

  // Set event handlers
  setEventHandlers(handlers: CallEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // Initiate an encrypted call
  async initiateCall(targetUserId: string, type: 'voice' | 'video'): Promise<string> {
    if (!this.socket || !this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // Add local stream to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Generate call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store call information
      const call: EncryptedCall = {
        callId,
        participants: [this.localUserId!, targetUserId],
        type,
        encrypted: true,
        localStream,
        peerConnection,
      };
      
      this.activeCalls.set(callId, call);

      // Set up peer connection event handlers
      this.setupPeerConnectionHandlers(call);

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send encrypted call invitation
      this.socket.emit('initiate-call', {
        targetUserId,
        type,
        offer,
      });

      console.log(`Initiated encrypted ${type} call to ${targetUserId}`);
      return callId;
      
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId: string): Promise<void> {
    if (!this.socket || !this.isInitialized) {
      throw new Error('Service not initialized');
    }

    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error('Call not found');
    }

    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: call.type === 'video',
      };

      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // Add local stream
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // Update call object
      call.localStream = localStream;
      call.peerConnection = peerConnection;

      // Set up peer connection handlers
      this.setupPeerConnectionHandlers(call);

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send encrypted acceptance
      this.socket.emit('accept-call', {
        callId,
        answer,
      });

      console.log('Call accepted with encryption');
      
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  }

  // End a call
  endCall(callId: string): void {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    // Clean up media streams
    if (call.localStream) {
      call.localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (call.peerConnection) {
      call.peerConnection.close();
    }

    // Remove from active calls
    this.activeCalls.delete(callId);

    // Notify server
    if (this.socket) {
      this.socket.emit('end-call', { callId });
    }

    console.log('Call ended and cleaned up');
  }

  private setupPeerConnectionHandlers(call: EncryptedCall): void {
    if (!call.peerConnection) return;

    call.peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      call.remoteStream = event.streams[0];
      
      if (this.eventHandlers.onRemoteStream) {
        this.eventHandlers.onRemoteStream(event.streams[0]);
      }
    };

    call.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        // Send encrypted ICE candidate
        const targetUserId = call.participants.find(p => p !== this.localUserId);
        if (targetUserId) {
          this.socket.emit('ice-candidate', {
            callId: call.callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      }
    };

    call.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', call.peerConnection?.connectionState);
      
      if (call.peerConnection?.connectionState === 'connected') {
        console.log('Encrypted call connection established');
      } else if (call.peerConnection?.connectionState === 'failed') {
        console.log('Call connection failed');
        this.endCall(call.callId);
      }
    };
  }

  // Get active calls
  getActiveCalls(): EncryptedCall[] {
    return Array.from(this.activeCalls.values());
  }

  // Toggle audio mute
  toggleAudio(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call?.localStream) return false;

    const audioTrack = call.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // Return mute state
    }
    return false;
  }

  // Toggle video
  toggleVideo(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call?.localStream) return false;

    const videoTrack = call.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // Return off state
    }
    return false;
  }

  // Cleanup when component unmounts
  cleanup(): void {
    // End all active calls
    this.activeCalls.forEach((call) => {
      this.endCall(call.callId);
    });

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isInitialized = false;
  }
}

// Singleton instance
export const encryptedWebRTC = new EncryptedWebRTCService();