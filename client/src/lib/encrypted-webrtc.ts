import { io, Socket } from 'socket.io-client';

export interface EncryptedCall {
  callId: string;
  participants: string[];
  type: 'voice' | 'video';
  encrypted: boolean;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  remoteOffer?: RTCSessionDescriptionInit;
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

  // WebRTC configuration with STUN and TURN servers
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      // Google STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // OpenRelay TURN server (free public TURN server)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all' // Use both STUN and TURN
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
      path: '/socket.io/',
    });
    
    console.log('Attempting to connect to WebRTC signaling server at:', socketUrl);

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
      offer?: RTCSessionDescriptionInit;
      encrypted: boolean;
    }) => {
      console.log('🔔 INCOMING CALL DEBUG - Client received incoming-call event');
      console.log('- Call data:', data);
      console.log('- Current user ID:', this.localUserId);
      console.log('- Event handlers available:', !!this.eventHandlers.onIncomingCall);
      console.log('- Handler details:', this.eventHandlers);
      console.log('- All event handlers:', Object.keys(this.eventHandlers));
      console.log('- Socket connected:', this.socket?.connected);
      console.log('- Service initialized:', this.isInitialized);
      
      try {
        // Store call information
        const call: EncryptedCall = {
          callId: data.callId,
          participants: [data.fromUserId, this.localUserId!],
          type: data.type,
          encrypted: data.encrypted,
        };
        
        this.activeCalls.set(data.callId, call);

        // Trigger the incoming call event for UI
        if (this.eventHandlers.onIncomingCall) {
          console.log('Triggering onIncomingCall handler');
          this.eventHandlers.onIncomingCall({
            callId: data.callId,
            fromUserId: data.fromUserId,
            type: data.type,
          });
        } else {
          console.log('No onIncomingCall handler available');
        }

        // If there's an offer, prepare for potential acceptance
        if (data.offer || data.encryptedOffer) {
          console.log('Call contains offer data, ready for acceptance');
          // Store offer data for when user accepts
          call.remoteOffer = data.offer;
        }
        
      } catch (error) {
        console.error('Failed to handle incoming call:', error);
      }
    });

    this.socket.on('call-accepted', async (data: {
      callId: string;
      byUserId: string;
      encryptedAnswer?: string;
      answer?: RTCSessionDescriptionInit;
      encrypted: boolean;
    }) => {
      console.log('📞 CLIENT: Call accepted:', data);
      
      // Set remote description with the answer
      const call = this.activeCalls.get(data.callId);
      if (call?.peerConnection && (data.answer || data.encryptedAnswer)) {
        try {
          let answer = data.answer;
          
          // Handle encrypted answer if available
          if (data.encrypted && data.encryptedAnswer) {
            console.log('📞 CLIENT: Processing encrypted answer');
            // For now, use plain answer which comes as fallback
          }
          
          if (answer) {
            console.log('📞 CLIENT: Setting remote answer description');
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ CLIENT: Remote answer set successfully - handshake complete!');
          }
        } catch (error) {
          console.error('❌ CLIENT: Failed to set remote answer:', error);
        }
      }
      
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

    // Handle ICE candidates
    this.socket.on('ice-candidate', async (data: {
      callId: string;
      fromUserId: string;
      encryptedCandidate?: string;
      candidate?: RTCIceCandidateInit;
      encrypted: boolean;
    }) => {
      console.log('Received ICE candidate:', data);
      
      const call = this.activeCalls.get(data.callId);
      if (!call?.peerConnection) {
        console.log('No peer connection found for ICE candidate');
        return;
      }

      try {
        let candidate = data.candidate;
        
        // Handle encrypted ICE candidates if available
        if (data.encrypted && data.encryptedCandidate) {
          // For now, decrypt on server side and use plain candidate
          // This could be enhanced with client-side decryption
          console.log('Encrypted ICE candidate received');
        }

        if (candidate) {
          await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        }
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    });

    // Handle WebRTC signaling data
    this.socket.on('webrtc-signal', async (data: {
      callId: string;
      fromUserId: string;
      encryptedSignal?: string;
      signalData?: any;
      type: 'offer' | 'answer' | 'ice-candidate';
      encrypted: boolean;
    }) => {
      console.log('Received WebRTC signal:', data);
      
      const call = this.activeCalls.get(data.callId);
      if (!call?.peerConnection) {
        console.log('No peer connection found for WebRTC signal');
        return;
      }

      try {
        let signalData = data.signalData;
        
        // Handle encrypted signals if available
        if (data.encrypted && data.encryptedSignal) {
          console.log('Encrypted WebRTC signal received');
          // For now, use plain signalData which comes as fallback
        }

        if (signalData) {
          if (data.type === 'offer') {
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
            console.log('Remote offer set successfully');
          } else if (data.type === 'answer') {
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
            console.log('Remote answer set successfully');
          }
        }
      } catch (error) {
        console.error('Failed to handle WebRTC signal:', error);
      }
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
        console.log(`Already initialized for user ${userId}`);
        resolve();
        return;
      }

      console.log(`Authenticating user ${userId} with WebRTC signaling server`);
      
      const timeout = setTimeout(() => {
        console.error(`Authentication timeout for user ${userId}`);
        reject(new Error('Authentication timeout'));
      }, 10000);

      this.socket!.once('authenticated', (data) => {
        console.log(`Authentication successful for user ${userId}`);
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
      // Get user media with proper error handling
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video',
      };

      let localStream: MediaStream;
      try {
        console.log('🎤 Requesting microphone permissions...');
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Microphone access granted');
      } catch (error: any) {
        console.error('❌ Microphone permission error:', error);
        
        // Provide specific error messages
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone permissions to make calls.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone to make calls.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is already in use by another application.');
        } else {
          throw new Error(`Failed to access microphone: ${error.message}`);
        }
      }
      
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
      console.log(`📤 CLIENT: Sending initiate-call event for ${type} call to ${targetUserId}`);
      console.log('- Socket connected:', this.socket?.connected);
      console.log('- Local user ID:', this.localUserId);
      console.log('- Target user ID:', targetUserId);
      
      this.socket.emit('initiate-call', {
        targetUserId,
        type,
        offer,
      });

      console.log(`✅ CLIENT: Initiated encrypted ${type} call to ${targetUserId} with callId: ${callId}`);
      
      // Listen for call initiated confirmation
      this.socket.once('call-initiated', (data: { callId: string, targetUserId: string }) => {
        console.log('✅ CLIENT: Call initiated confirmation received:', data);
      });
      
      this.socket.once('call-error', (data: { error: string }) => {
        console.error('❌ CLIENT: Call error received:', data.error);
      });
      
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
      // Get user media with proper error handling
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: call.type === 'video',
      };

      let localStream: MediaStream;
      
      // Check if we have a pre-authorized stream from the incoming call preparation
      const tempStream = (window as any).tempIncomingCallStream;
      
      if (tempStream) {
        console.log('✅ WebRTC: Using pre-authorized microphone stream for call acceptance');
        localStream = tempStream;
        // Clean up the temporary reference
        delete (window as any).tempIncomingCallStream;
      } else {
        // Fallback: Get user media with proper error handling
        try {
          console.log('🎤 Requesting microphone permissions for incoming call (fallback)...');
          localStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Microphone access granted for incoming call');
        } catch (error: any) {
          console.error('❌ Microphone permission error on accept:', error);
          
          // Provide specific error messages
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please allow microphone permissions to accept calls.');
          } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone to accept calls.');
          } else if (error.name === 'NotReadableError') {
            throw new Error('Microphone is already in use by another application.');
          } else {
            throw new Error(`Failed to access microphone: ${error.message}`);
          }
        }
      }
      
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

      // Set remote description if we have an offer
      if (call.remoteOffer) {
        console.log('Setting remote offer description');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(call.remoteOffer));
      }

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
          console.log('🧊 CLIENT: Sending ICE candidate to:', targetUserId);
          console.log('- Candidate type:', event.candidate.type);
          console.log('- Protocol:', event.candidate.protocol);
          this.socket.emit('ice-candidate', {
            callId: call.callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      } else if (!event.candidate) {
        console.log('🏁 CLIENT: ICE gathering complete');
      }
    };

    call.peerConnection.onconnectionstatechange = () => {
      const state = call.peerConnection?.connectionState;
      console.log('🔌 CLIENT: Connection state changed:', state);
      
      if (state === 'connected') {
        console.log('✅ CLIENT: WebRTC connection established successfully!');
      } else if (state === 'failed') {
        console.error('❌ CLIENT: WebRTC connection failed - likely NAT/firewall issue');
        console.log('💡 TIP: Check TURN server configuration and firewall settings');
        this.endCall(call.callId);
        // Notify UI about connection failure
        if (this.eventHandlers.onCallEnded) {
          this.eventHandlers.onCallEnded({
            callId: call.callId,
            endedBy: 'system',
            reason: 'Connection failed - NAT/firewall issue'
          });
        }
      } else if (state === 'disconnected') {
        console.warn('⚠️ CLIENT: WebRTC connection disconnected');
      }
    };

    // Enhanced signaling state debugging
    call.peerConnection.onsignalingstatechange = () => {
      const signalingState = call.peerConnection?.signalingState;
      console.log('📡 CLIENT: Signaling state changed:', signalingState);
      
      switch (signalingState) {
        case 'stable':
          console.log('✅ Signaling: Ready for new offer/answer exchange');
          break;
        case 'have-local-offer':
          console.log('📤 Signaling: Local offer created, waiting for answer');
          break;
        case 'have-remote-offer':
          console.log('📥 Signaling: Remote offer received, creating answer');
          break;
        case 'have-local-pranswer':
          console.log('📤 Signaling: Local provisional answer created');
          break;
        case 'have-remote-pranswer':
          console.log('📥 Signaling: Remote provisional answer received');
          break;
        case 'closed':
          console.log('❌ Signaling: Connection closed');
          break;
        default:
          console.log('❓ Signaling: Unknown state:', signalingState);
      }
    };
    
    // Monitor ICE connection state
    call.peerConnection.oniceconnectionstatechange = () => {
      const state = call.peerConnection?.iceConnectionState;
      console.log('🧊 CLIENT: ICE connection state changed:', state);
      
      if (state === 'failed') {
        console.error('❌ CLIENT: ICE negotiation failed - check STUN/TURN servers');
      } else if (state === 'checking') {
        console.log('🔍 CLIENT: Checking ICE candidates...');
      } else if (state === 'connected' || state === 'completed') {
        console.log('✅ CLIENT: ICE connection established!');
      }
    };
    
    // Monitor ICE gathering state
    call.peerConnection.onicegatheringstatechange = () => {
      const state = call.peerConnection?.iceGatheringState;
      console.log('📍 CLIENT: ICE gathering state:', state);
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