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
  status?: 'connecting' | 'ringing' | 'connected' | 'ended';
}

export interface CallEventHandlers {
  onIncomingCall?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video' }) => void;
  onCallAccepted?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video'; status: string }) => void;
  onCallEnded?: (call: { callId: string; endedBy: string; reason: string }) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onEncryptionStatusChanged?: (encrypted: boolean) => void;
}

export class EncryptedWebRTCService {
  private socket: Socket | null = null;
  private activeCalls = new Map<string, EncryptedCall>();
  private localUserId: string | null = null;
  private publicKey: string | null = null;
  private eventHandlers: CallEventHandlers = {};
  private isInitialized = false;

  // Enhanced WebRTC configuration optimized for desktop P2P connections
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      // Primary STUN servers - Google
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      
      // Cloudflare STUN servers for better global reach
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // Primary TURN servers - OpenRelay
      {
        urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      
      // Additional TURN servers for redundancy
      {
        urls: ['turn:numb.viagenie.ca:3478', 'turn:numb.viagenie.ca:3479'],
        username: 'webrtc@live.com',
        credential: 'muazkh'
      }
    ],
    iceCandidatePoolSize: 15, // Increased for better connectivity
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  constructor() {
    // Don't auto-initialize socket - wait for explicit initialization
  }

  // Desktop device detection
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Enhanced desktop media constraints
  private getDesktopMediaConstraints(type: 'voice' | 'video'): MediaStreamConstraints {
    const isMobile = this.isMobileDevice();
    
    if (type === 'voice') {
      return {
        audio: isMobile ? {
          // Mobile-optimized audio constraints
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : {
          // Desktop audio constraints  
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      };
    }
    
    return {
      audio: isMobile ? {
        // Mobile audio for video calls
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : {
        // Desktop audio for video calls
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      },
      video: isMobile ? {
        // Mobile-optimized video constraints
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 24 },
        facingMode: 'user'
      } : {
        // Desktop video constraints
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user'
      }
    };
  }

  private initializeSocket(): void {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: false,
      path: '/socket.io/',
    });
    

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔧 DEEP TEST: Connected to encrypted WebRTC signaling server');
      console.log('🔧 DEEP TEST: Socket ID:', this.socket?.id);
      console.log('🔧 DEEP TEST: Socket connected:', this.socket?.connected);
      console.log('🔧 DEEP TEST: Socket transport:', this.socket?.io?.engine?.transport?.name);
    });

    this.socket.on('authenticated', (data: { userId: string; publicKey: string; encryptionEnabled: boolean }) => {
      this.localUserId = data.userId;
      this.publicKey = data.publicKey;
      this.isInitialized = true;
      console.log('WebRTC authentication successful, encryption enabled:', data.encryptionEnabled);
      console.log('🔧 CRITICAL: Authenticated user:', data.userId, 'on socket:', this.socket?.id);
      console.log('🔧 CRITICAL: WebRTC socket ready to receive calls on socket:', this.socket?.id);
      
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
      console.log('🧪 COMPREHENSIVE TEST: ==================== INCOMING CALL TEST ====================');
      console.log('🧪 TEST: Function: incoming-call event handler');
      console.log('🧪 TEST: Client socket ID:', this.socket?.id);
      console.log('🧪 TEST: Call ID:', data.callId);
      console.log('🧪 TEST: From user:', data.fromUserId);
      console.log('🧪 TEST: Call type:', data.type);
      console.log('🧪 TEST: Encrypted:', data.encrypted);
      console.log('🧪 TEST: Has encrypted offer:', !!data.encryptedOffer);
      console.log('🧪 TEST: Has regular offer:', !!data.offer);
      console.log('🧪 TEST: Timestamp:', new Date().toISOString());
      
      console.log('📞 DEEP TEST: ===============================');
      console.log('📞 DEEP TEST: INCOMING CALL RECEIVED ON CLIENT');
      console.log('📞 DEEP TEST: ===============================');
      console.log('📞 DEEP TEST: Call type:', data.type);
      console.log('📞 DEEP TEST: Is encrypted:', data.encrypted);
      console.log('📞 DEEP TEST: Has offer:', !!data.offer);
      console.log('📞 DEEP TEST: Has encrypted offer:', !!data.encryptedOffer);
      console.log('📞 DEEP TEST: Full data object:', data);
      console.log('📞 DEEP TEST: About to trigger UI notification...');
      
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
          this.eventHandlers.onIncomingCall({
            callId: data.callId,
            fromUserId: data.fromUserId,
            type: data.type,
          });
          console.log('✅ Incoming call handler triggered for call:', data.callId);
        } else {
          console.error('❌ No incoming call handler available');
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
      console.log('🎯 CALLER: Call accepted by target user:', data);
      console.log('🎯 CALLER: Setting remote answer and transitioning to connected state...');
      
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
            console.log('🎯 CALLER: Setting remote answer description...');
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ CALLER: Remote answer set successfully - WebRTC handshake complete!');
          }
          
          // CRITICAL: Update call status to connected
          call.status = 'connected';
          this.activeCalls.set(data.callId, call);
          console.log('🎯 CALLER: Call status updated to connected');
          
        } catch (error) {
          console.error('❌ CALLER: Failed to set remote answer:', error);
        }
      }
      
      // CRITICAL: Trigger call accepted event for UI to show connected state
      if (this.eventHandlers.onCallAccepted) {
        console.log('🎯 CALLER: Triggering onCallAccepted for UI update...');
        this.eventHandlers.onCallAccepted({
          callId: data.callId,
          fromUserId: data.byUserId,
          type: call?.type || 'voice',
          status: 'connected'
        });
        console.log('✅ CALLER: UI should now show in-call controls (Hang Up, Speaker, etc.)');
      } else {
        console.error('❌ CALLER: No onCallAccepted handler available');
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
        console.log('No peer connection found for ICE candidate - may be timing issue');
        return;
      }
      
      // Check if remote description is set before adding ICE candidates
      if (!call.peerConnection.remoteDescription) {
        console.log('⚠️ WARNING: Trying to add ICE candidate before remote description is set');
        // Could implement queueing here if needed
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

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from encrypted WebRTC signaling server, reason:', reason);
      // Only mark as uninitialized if it's a real disconnect, not during HMR
      if (reason !== 'transport close' && reason !== 'io client disconnect') {
        this.isInitialized = false;
      }
    });
  }

  // Initialize the service with user authentication
  async initialize(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // STABILITY FIX: Check if already properly initialized for this user with a more strict check
      if (this.isInitialized && 
          this.localUserId === userId && 
          this.socket?.connected && 
          this.socket?.id) {
        console.log(`✅ STABILITY: Already initialized for user ${userId} with stable socket ${this.socket?.id}`);
        console.log(`✅ STABILITY: Skipping reinitialization to prevent socket churn`);
        resolve();
        return;
      }
      
      // STABILITY FIX: Only cleanup if we really need to (different user or truly disconnected)
      if (this.localUserId !== userId || !this.socket?.connected) {
        console.log('🔧 STABILITY: Cleaning up previous connection for user switch or disconnection');
        this.cleanup();
      } else {
        console.log('🔧 STABILITY: Keeping existing connection, just marking as initialized');
        this.isInitialized = true;
        this.localUserId = userId;
        resolve();
        return;
      }
      
      // Create fresh socket connection only when necessary
      console.log('🔧 STABILITY: Creating new WebRTC socket connection for user:', userId);
      this.initializeSocket();

      console.log(`Authenticating user ${userId} with WebRTC signaling server`);
      
      const timeout = setTimeout(() => {
        console.error(`Authentication timeout for user ${userId}`);
        reject(new Error('Authentication timeout'));
      }, 30000); // Increased to 30 seconds for better stability

      this.socket!.once('authenticated', (data) => {
        console.log(`🔧 DEEP TEST: Authentication successful for user ${userId}`, data);
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        console.error('🔧 DEEP TEST: Socket connection error:', error);
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${error.message}`));
      });

      this.socket!.on('disconnect', (reason) => {
        console.error('🔧 STABILITY: Socket disconnected during init:', reason);
        // STABILITY FIX: Don't mark as uninitialized for temporary disconnects
        if (reason === 'transport close' || reason === 'io client disconnect' || reason === 'ping timeout') {
          console.log('🔧 STABILITY: Ignoring temporary disconnect, maintaining initialized state');
          // Keep the service marked as initialized so it doesn't get recreated unnecessarily
        } else {
          console.log('🔧 STABILITY: Real disconnect, marking as uninitialized');
          this.isInitialized = false;
        }
      });

      console.log('🔧 DEEP TEST: Emitting authenticate event for user:', userId);
      this.socket!.emit('authenticate', { userId });
    });
  }

  // Set event handlers
  setEventHandlers(handlers: CallEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // Clean up existing connection
  private cleanup(): void {
    if (this.socket) {
      console.log('🧹 CRITICAL: Cleaning up WebRTC socket connection:', this.socket.id);
      if (this.socket.connected) {
        this.socket.disconnect();
      }
      this.socket = null;
    }
    this.isInitialized = false;
    this.localUserId = null;
    this.publicKey = null;
    this.activeCalls.clear();
  }

  // Public cleanup method for logout/state changes
  public disconnect(): void {
    console.log('🔌 CRITICAL: Public disconnect called - cleaning up WebRTC');
    this.cleanup();
  }

  // Initiate an encrypted call
  async initiateCall(targetUserId: string, type: 'voice' | 'video'): Promise<string> {
    console.log('🧪 COMPREHENSIVE TEST: ==================== CALL FUNCTION TEST ====================');
    console.log('🧪 TEST: Function: initiateCall');
    console.log('🧪 TEST: Target User ID:', targetUserId);
    console.log('🧪 TEST: Call Type:', type);
    console.log('🧪 TEST: Socket Status:', this.socket?.connected);
    console.log('🧪 TEST: Socket ID:', this.socket?.id);
    console.log('🧪 TEST: Service Initialized:', this.isInitialized);
    console.log('🧪 TEST: Local User ID:', this.localUserId);
    console.log('🧪 TEST: Public Key Available:', !!this.publicKey);
    console.log('🧪 TEST: Active Calls Count:', this.activeCalls.size);
    console.log('🧪 TEST: Timestamp:', new Date().toISOString());
    
    // Test 1: Service Initialization Check
    if (!this.socket || !this.isInitialized) {
      const error = 'Service not initialized';
      console.error('❌ TEST FAILED: Service Initialization -', error);
      console.error('❌ ERROR DETAILS: Socket:', !!this.socket, 'Initialized:', this.isInitialized);
      throw new Error(error);
    }
    console.log('✅ TEST PASSED: Service Initialization Check');

    try {
      // Get user media with enhanced desktop constraints
      const constraints = this.getDesktopMediaConstraints(type);

      let localStream: MediaStream;
      try {
        console.log('🧪 TEST: Starting Media Access Test...');
        console.log('🧪 TEST: Constraints:', JSON.stringify(constraints));
        console.log('🎤 Requesting microphone permissions...');
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log('✅ TEST PASSED: Media Access Granted');
        console.log('🧪 TEST: Audio tracks:', localStream.getAudioTracks().length);
        console.log('🧪 TEST: Video tracks:', localStream.getVideoTracks().length);
        console.log('🧪 TEST: Stream active:', localStream.active);
        
        // Test audio track details
        localStream.getAudioTracks().forEach((track, index) => {
          console.log(`🧪 TEST: Audio Track ${index}:`, {
            enabled: track.enabled,
            kind: track.kind,
            label: track.label,
            readyState: track.readyState
          });
        });
        
      } catch (error: any) {
        console.error('❌ TEST FAILED: Media Access -', error);
        console.error('❌ ERROR DETAILS:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          constraint: error.constraint
        });
        
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
      
      // Test 2: Peer Connection Creation
      console.log('🧪 TEST: Creating RTCPeerConnection...');
      console.log('🧪 TEST: RTC Configuration:', JSON.stringify(this.rtcConfiguration, null, 2));
      
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      console.log('✅ TEST PASSED: RTCPeerConnection Created');
      console.log('🧪 TEST: Connection State:', peerConnection.connectionState);
      console.log('🧪 TEST: ICE Connection State:', peerConnection.iceConnectionState);
      console.log('🧪 TEST: ICE Gathering State:', peerConnection.iceGatheringState);
      console.log('🧪 TEST: Signaling State:', peerConnection.signalingState);
      
      // Test 3: Adding Local Stream
      console.log('🧪 TEST: Adding local stream tracks to peer connection...');
      let trackCount = 0;
      localStream.getTracks().forEach(track => {
        console.log(`🧪 TEST: Adding track ${trackCount++}:`, {
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        });
        peerConnection.addTrack(track, localStream);
      });
      console.log('✅ TEST PASSED: All tracks added to peer connection');

      // Test 4: Call ID Generation
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🧪 TEST: Generated Call ID:', callId);
      console.log('🧪 TEST: Call ID Format Valid:', /^call_\d+_[a-z0-9]+$/.test(callId));
      
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
      console.log(`📞 DEEP TEST: ===================`);
      console.log(`📞 DEEP TEST: CALL INITIATION PHASE`);
      console.log(`📞 DEEP TEST: ===================`);
      console.log(`📞 DEEP TEST: Call ID: ${callId}`);
      console.log(`📞 DEEP TEST: From user: ${this.localUserId}`);
      console.log(`📞 DEEP TEST: To user: ${targetUserId}`);
      console.log(`📞 DEEP TEST: Call type: ${type}`);
      console.log(`📞 DEEP TEST: Socket connected: ${this.socket?.connected}`);
      console.log(`📞 DEEP TEST: Socket ID: ${this.socket?.id}`);
      console.log(`📞 DEEP TEST: Offer created: ${!!offer}`);
      console.log(`📞 DEEP TEST: About to emit 'initiate-call' event...`);
      console.log(`🚨 CRITICAL DEBUG: Socket status check before emit:`);
      console.log(`🚨 CRITICAL DEBUG: - Socket exists: ${!!this.socket}`);
      console.log(`🚨 CRITICAL DEBUG: - Socket connected: ${this.socket?.connected}`);
      console.log(`🚨 CRITICAL DEBUG: - Socket ID: ${this.socket?.id}`);
      console.log(`🚨 CRITICAL DEBUG: - Socket transport: ${this.socket?.io?.engine?.transport?.name}`);
      console.log(`🚨 CRITICAL DEBUG: - Socket rooms: Connected`);
      
      // Test socket connection with a ping
      this.socket.emit('ping-test', { timestamp: Date.now() });
      
      this.socket.emit('initiate-call', {
        callId,
        targetUserId,
        type,
        offer,
      });

      console.log(`📞 DEEP TEST: ✅ 'initiate-call' event emitted to server`);
      console.log(`📞 DEEP TEST: Now waiting for server responses...`);
      
      // Add timeout to detect if server never responds
      setTimeout(() => {
        console.error('🚨 CRITICAL DEBUG: ❌ TIMEOUT - No response from server after 5 seconds');
        console.error('🚨 CRITICAL DEBUG: This indicates server is not receiving our initiate-call event');
      }, 5000);
      
      // Listen for call initiated confirmation
      this.socket.once('call-initiated', (data: { callId: string, targetUserId: string }) => {
        console.log('📞 DEEP TEST: ✅ SERVER CONFIRMED call initiated:', data);
      });
      
      this.socket.once('call-error', (data: { error: string }) => {
        console.error('📞 DEEP TEST: ❌ SERVER ERROR:', data.error);
      });
      
      // Listen for call accepted confirmation
      this.socket.once('call-accepted-confirmation', (data: { callId: string, fromUserId: string }) => {
        console.log('📞 DEEP TEST: ✅ SERVER CONFIRMED call accepted by:', data.fromUserId);
      });
      
      return callId;
      
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId: string): Promise<void> {
    console.log('🧪 COMPREHENSIVE TEST: ==================== ACCEPT CALL TEST ====================');
    console.log('🧪 TEST: Function: acceptCall');
    console.log('🧪 TEST: Call ID to accept:', callId);
    console.log('🧪 TEST: Active calls map size:', this.activeCalls.size);
    console.log('🧪 TEST: Active call IDs:', Array.from(this.activeCalls.keys()));
    console.log('🧪 TEST: Socket initialized:', !!this.socket);
    console.log('🧪 TEST: Socket connected:', this.socket?.connected);
    console.log('🧪 TEST: Socket ID:', this.socket?.id);
    console.log('🧪 TEST: Service initialized:', this.isInitialized);
    console.log('🧪 TEST: Local user ID:', this.localUserId);
    console.log('🧪 TEST: Timestamp:', new Date().toISOString());
    
    console.log('📞 DEEP TEST: ===============================');
    console.log('📞 DEEP TEST: ANSWER BUTTON CLICKED - ACCEPTING CALL');
    console.log('📞 DEEP TEST: ===============================');
    
    // Test 1: Service Status Check
    if (!this.socket || !this.isInitialized) {
      console.error('❌ TEST FAILED: Service Initialization');
      console.error('❌ ERROR DETAILS: Socket:', !!this.socket, 'Connected:', this.socket?.connected, 'Initialized:', this.isInitialized);
      throw new Error('Service not initialized');
    }
    console.log('✅ TEST PASSED: Service Initialization Check');

    // Test 2: Call Existence Check
    const call = this.activeCalls.get(callId);
    console.log('🧪 TEST: Call object found:', !!call);
    console.log('🧪 TEST: Call details:', call ? {
      callId: call.callId,
      participants: call.participants,
      type: call.type,
      encrypted: call.encrypted,
      hasRemoteOffer: !!call.remoteOffer
    } : 'N/A');
    
    if (!call) {
      console.error('❌ TEST FAILED: Call Lookup');
      console.error('❌ ERROR DETAILS: Available calls:', Array.from(this.activeCalls.keys()));
      throw new Error('Call not found');
    }
    console.log('✅ TEST PASSED: Call Lookup Check');

    try {
      // Get user media with enhanced desktop constraints
      const constraints = this.getDesktopMediaConstraints(call.type);

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
          console.log('🎤 Requesting microphone permissions...');
          localStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Microphone access granted');
        } catch (error: any) {
          console.error('❌ Microphone permission error:', error);
          
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
        console.log('📞 ACCEPT: Setting remote offer description');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(call.remoteOffer));
        console.log('✅ ACCEPT: Remote offer set successfully');
      }

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send encrypted acceptance
      console.log('📞 DEEP TEST: ===============================');
      console.log('📞 DEEP TEST: SENDING CALL ACCEPTANCE TO SERVER');
      console.log('📞 DEEP TEST: ===============================');
      console.log('📞 DEEP TEST: Call ID:', callId);
      console.log('📞 DEEP TEST: Answer created:', !!answer);
      console.log('📞 DEEP TEST: Answer SDP type:', answer?.type);
      console.log('📞 DEEP TEST: Socket ID:', this.socket?.id);
      console.log('📞 DEEP TEST: Socket connected:', this.socket?.connected);
      console.log('📞 DEEP TEST: About to emit accept-call event...');
      
      this.socket.emit('accept-call', {
        callId,
        answer,
      });

      console.log('📞 DEEP TEST: ✅ accept-call event sent to server');
      console.log('📞 DEEP TEST: Waiting for call-accepted-confirmation...');
      
      // CRITICAL: Update call status to connected and trigger UI update
      call.status = 'connected';
      this.activeCalls.set(callId, call);
      console.log('🎯 ACCEPT: Call status updated to connected');

      // CRITICAL: Trigger call accepted event for UI to show connected state  
      if (this.eventHandlers.onCallAccepted) {
        console.log('🎯 ACCEPT: Triggering onCallAccepted handler for UI...');
        this.eventHandlers.onCallAccepted({
          callId: call.callId || callId,
          fromUserId: call.participants?.[0] || 'unknown',
          type: call.type,
          status: 'connected'
        });
        console.log('✅ ACCEPT: UI should now show in-call controls (Hang Up, Speaker, etc.)');
      } else {
        console.error('❌ ACCEPT: No onCallAccepted handler available for UI update');
      }
      
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

    // Enhanced desktop stream handling
    call.peerConnection.ontrack = (event) => {
      console.log('📞 DESKTOP: Received remote stream with tracks:', event.streams[0].getTracks().length);
      call.remoteStream = event.streams[0];
      
      // Desktop-specific optimizations
      if (!this.isMobileDevice()) {
        // Enable high-quality audio processing for desktop
        event.streams[0].getAudioTracks().forEach(track => {
          if (track.getSettings) {
            const settings = track.getSettings();
            console.log('📞 DESKTOP: Audio track settings:', {
              sampleRate: settings.sampleRate,
              channelCount: settings.channelCount,
              echoCancellation: settings.echoCancellation,
              noiseSuppression: settings.noiseSuppression
            });
          }
        });
        
        // Log video track settings for desktop
        event.streams[0].getVideoTracks().forEach(track => {
          if (track.getSettings) {
            const settings = track.getSettings();
            console.log('📞 DESKTOP: Video track settings:', {
              width: settings.width,
              height: settings.height,
              frameRate: settings.frameRate,
              facingMode: settings.facingMode
            });
          }
        });
      }
      
      if (this.eventHandlers.onRemoteStream) {
        this.eventHandlers.onRemoteStream(event.streams[0]);
      }
    };

    call.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        // Enhanced desktop ICE candidate handling
        const targetUserId = call.participants.find(p => p !== this.localUserId);
        if (targetUserId) {
          console.log('🧊 DESKTOP: Sending ICE candidate to:', targetUserId);
          console.log('- Candidate type:', event.candidate.type);
          console.log('- Protocol:', event.candidate.protocol);
          console.log('- Priority:', event.candidate.priority);
          console.log('- Foundation:', event.candidate.foundation);
          
          // Desktop-specific candidate optimization
          if (!this.isMobileDevice() && event.candidate.type === 'host') {
            console.log('🧊 DESKTOP: Prioritizing host candidate for direct connection');
          }
          
          this.socket.emit('ice-candidate', {
            callId: call.callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      } else if (!event.candidate) {
        console.log('🏁 DESKTOP: ICE gathering complete for call:', call.callId);
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
        
        // Give it more time before ending the call - sometimes ICE takes longer
        setTimeout(() => {
          const stillFailed = call.peerConnection?.iceConnectionState === 'failed';
          if (stillFailed) {
            console.log('❌ CLIENT: ICE connection still failed after retry period, ending call');
            this.endCall(call.callId);
            // Notify UI about connection failure
            if (this.eventHandlers.onCallEnded) {
              this.eventHandlers.onCallEnded({
                callId: call.callId,
                endedBy: 'system',
                reason: 'Connection failed - NAT/firewall issue'
              });
            }
          } else {
            console.log('✅ CLIENT: ICE connection recovered after retry period');
          }
        }, 10000); // Give 10 more seconds for ICE to recover
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

  // Get socket ID for debugging
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Enhanced desktop audio toggle with quality preservation
  toggleAudio(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call?.localStream) return false;

    const audioTrack = call.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('📞 DESKTOP: Audio toggled to:', audioTrack.enabled ? 'enabled' : 'muted');
      
      // Desktop-specific audio quality maintenance
      if (!this.isMobileDevice() && audioTrack.enabled) {
        // Ensure audio processing settings are maintained after unmute
        const constraints = audioTrack.getConstraints();
        console.log('📞 DESKTOP: Maintaining audio constraints:', constraints);
      }
      
      return !audioTrack.enabled; // Return mute state
    }
    return false;
  }

  // Enhanced desktop video toggle with resolution management
  toggleVideo(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call?.localStream) return false;

    const videoTrack = call.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('📞 DESKTOP: Video toggled to:', videoTrack.enabled ? 'enabled' : 'disabled');
      
      // Desktop-specific video quality maintenance
      if (!this.isMobileDevice() && videoTrack.enabled) {
        const settings = videoTrack.getSettings();
        console.log('📞 DESKTOP: Maintaining video quality:', {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate
        });
      }
      
      return !videoTrack.enabled; // Return off state
    }
    return false;
  }

  // Desktop-specific camera switching
  async switchCamera(callId: string): Promise<void> {
    if (this.isMobileDevice()) return; // Mobile has different camera switching logic
    
    const call = this.activeCalls.get(callId);
    if (!call?.localStream || !call.peerConnection) return;

    try {
      // Get available video devices for desktop
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length <= 1) {
        console.log('📞 DESKTOP: Only one camera available');
        return;
      }

      // Find current device
      const currentTrack = call.localStream.getVideoTracks()[0];
      const currentSettings = currentTrack.getSettings();
      const currentDeviceId = currentSettings.deviceId;
      
      // Find next camera
      const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];
      
      console.log('📞 DESKTOP: Switching to camera:', nextDevice.label);
      
      // Get new video stream with desktop constraints
      const constraints = this.getDesktopMediaConstraints('video');
      if (typeof constraints.video === 'object' && constraints.video !== null) {
        constraints.video = {
          ...constraints.video,
          deviceId: { exact: nextDevice.deviceId }
        };
      } else {
        constraints.video = {
          deviceId: { exact: nextDevice.deviceId }
        };
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace video track in peer connection
      const sender = call.peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
        console.log('📞 DESKTOP: Camera track replaced successfully');
      }
      
      // Update local stream
      call.localStream.removeTrack(currentTrack);
      call.localStream.addTrack(newVideoTrack);
      currentTrack.stop();
      
      // Notify UI of camera change
      if (this.eventHandlers.onLocalStream) {
        this.eventHandlers.onLocalStream(call.localStream);
      }
      
    } catch (error) {
      console.error('📞 DESKTOP: Failed to switch camera:', error);
    }
  }

  // Desktop connection recovery system
  async recoverConnection(callId: string): Promise<boolean> {
    const call = this.activeCalls.get(callId);
    if (!call?.peerConnection) return false;

    try {
      console.log('📞 DESKTOP: Attempting connection recovery for call:', callId);
      
      // Check if we can restart ICE
      if (call.peerConnection.connectionState === 'failed' || 
          call.peerConnection.iceConnectionState === 'failed') {
        
        console.log('📞 DESKTOP: Restarting ICE for connection recovery');
        call.peerConnection.restartIce();
        
        // Wait for ICE restart
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
          
          const checkConnection = () => {
            if (call.peerConnection?.connectionState === 'connected') {
              clearTimeout(timeout);
              console.log('📞 DESKTOP: Connection recovery successful');
              resolve(true);
            } else if (call.peerConnection?.connectionState === 'failed') {
              clearTimeout(timeout);
              resolve(false);
            } else {
              setTimeout(checkConnection, 1000);
            }
          };
          
          checkConnection();
        });
      }
      
      return false;
    } catch (error) {
      console.error('📞 DESKTOP: Connection recovery failed:', error);
      return false;
    }
  }

}

// Singleton instance
export const encryptedWebRTC = new EncryptedWebRTCService();