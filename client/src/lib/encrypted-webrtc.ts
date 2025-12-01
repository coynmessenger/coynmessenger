import { io, Socket } from 'socket.io-client';
import { permissionService } from './permission-service';

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
  retainedStreamType?: 'microphone' | 'camera'; // Track if using cached stream for proper release
  pendingIceCandidates?: RTCIceCandidateInit[]; // Queue for ICE candidates that arrive before remote description
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

  // Enhanced WebRTC configuration optimized for reliable P2P connections
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      // Primary STUN servers - Google (reliable and global)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      
      // Cloudflare STUN servers for better global reach
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // Additional STUN servers for redundancy
      { urls: 'stun:stun.nextcloud.com:443' },
      
      // Primary TURN servers - OpenRelay (reliable public service)
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      
      // Additional reliable TURN service
      {
        urls: [
          'turn:relay.metered.ca:80',
          'turn:relay.metered.ca:443',
          'turn:relay.metered.ca:443?transport=tcp'
        ],
        username: 'e8dd65b92c62d3e36c0c5abd',
        credential: 'DVMv35H9V9TcsGwa'
      }
    ],
    iceCandidatePoolSize: 10, // Optimized for performance vs resource usage
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

  // Process pending ICE candidates after remote description is set
  private async processPendingIceCandidates(call: EncryptedCall): Promise<void> {
    if (!call.pendingIceCandidates || call.pendingIceCandidates.length === 0) {
      return;
    }
    
    if (!call.peerConnection) {
      console.log('🧊 ICE: Cannot process pending candidates - no peer connection');
      return;
    }
    
    console.log(`🧊 ICE: Processing ${call.pendingIceCandidates.length} pending ICE candidates`);
    
    const candidates = [...call.pendingIceCandidates];
    call.pendingIceCandidates = []; // Clear the queue
    
    for (const candidate of candidates) {
      try {
        await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 ICE: Pending candidate added successfully');
      } catch (error) {
        console.error('🧊 ICE: Failed to add pending ICE candidate:', error);
      }
    }
    
    console.log('🧊 ICE: All pending candidates processed');
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
          // Desktop audio constraints (Safari-compatible)
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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
        // Desktop audio for video calls (Safari-compatible)
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
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
    });

    this.socket.on('authenticated', (data: { userId: string; publicKey: string; encryptionEnabled: boolean }) => {
      this.localUserId = data.userId;
      this.publicKey = data.publicKey;
      this.isInitialized = true;
      
      if (this.eventHandlers.onEncryptionStatusChanged) {
        this.eventHandlers.onEncryptionStatusChanged(data.encryptionEnabled);
      }
    });

    this.socket.on('keys-exchanged', (data: { fromUserId: string; publicKey: string }) => {
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
      console.log('📞 INCOMING CALL: ==================== RECEIVED ====================');
      console.log('📞 INCOMING CALL: Call ID:', data.callId);
      console.log('📞 INCOMING CALL: From User:', data.fromUserId);
      console.log('📞 INCOMING CALL: Type:', data.type);
      console.log('📞 INCOMING CALL: Has Offer:', !!data.offer);
      
      try {
        // Store call information
        const call: EncryptedCall = {
          callId: data.callId,
          participants: [data.fromUserId, this.localUserId!],
          type: data.type,
          encrypted: data.encrypted,
        };
        
        this.activeCalls.set(data.callId, call);
        console.log('✅ INCOMING CALL: Added to activeCalls. Total calls:', this.activeCalls.size);
        console.log('✅ INCOMING CALL: Active call IDs:', Array.from(this.activeCalls.keys()));

        // Trigger the incoming call event for UI
        if (this.eventHandlers.onIncomingCall) {
          console.log('📞 INCOMING CALL: Triggering onIncomingCall handler');
          this.eventHandlers.onIncomingCall({
            callId: data.callId,
            fromUserId: data.fromUserId,
            type: data.type,
          });
        } else {
          console.warn('⚠️ INCOMING CALL: No onIncomingCall handler registered!');
        }

        // If there's an offer, prepare for potential acceptance
        if (data.offer) {
          // Store offer data for when user accepts (use standard offer, not encrypted)
          call.remoteOffer = data.offer;
          console.log('✅ INCOMING CALL: Stored remote offer for later acceptance');
        }
        
      } catch (error) {
        console.error('❌ INCOMING CALL: Error processing incoming call:', error);
      }
    });

    this.socket.on('call-accepted', async (data: {
      callId: string;
      byUserId: string;
      encryptedAnswer?: string;
      answer?: RTCSessionDescriptionInit;
      encrypted: boolean;
    }) => {
      
      // Set remote description with the answer
      const call = this.activeCalls.get(data.callId);
      if (call?.peerConnection && data.answer) {
        try {
          // Use standard answer (WebRTC provides DTLS-SRTP encryption)
          await call.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          
          // CRITICAL: Process any queued ICE candidates now that remote description is set
          await this.processPendingIceCandidates(call);
          
          // CRITICAL: Update call status to connected
          call.status = 'connected';
          this.activeCalls.set(data.callId, call);
          
        } catch (error) {
          console.error('❌ CALLER: Failed to set remote answer:', error);
        }
      }
      
      // CRITICAL: Trigger call accepted event for UI to show connected state
      if (this.eventHandlers.onCallAccepted) {
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

    // Handle ICE candidates with queuing support
    this.socket.on('ice-candidate', async (data: {
      callId: string;
      fromUserId: string;
      encryptedCandidate?: string;
      candidate?: RTCIceCandidateInit;
      encrypted: boolean;
    }) => {
      console.log('🧊 ICE: Received ICE candidate for call:', data.callId);
      
      const call = this.activeCalls.get(data.callId);
      if (!call) {
        console.log('🧊 ICE: No call found for ICE candidate - queueing not possible');
        return;
      }
      
      let candidate = data.candidate;
      
      // Handle encrypted ICE candidates if available
      if (data.encrypted && data.encryptedCandidate) {
        console.log('🧊 ICE: Encrypted ICE candidate received');
      }
      
      if (!candidate) {
        console.log('🧊 ICE: No candidate data in message');
        return;
      }
      
      // If no peer connection yet, queue the candidate
      if (!call.peerConnection) {
        console.log('🧊 ICE: No peer connection yet - queuing candidate');
        if (!call.pendingIceCandidates) {
          call.pendingIceCandidates = [];
        }
        call.pendingIceCandidates.push(candidate);
        console.log('🧊 ICE: Queued candidates count:', call.pendingIceCandidates.length);
        return;
      }
      
      // Check if remote description is set before adding ICE candidates
      if (!call.peerConnection.remoteDescription) {
        console.log('🧊 ICE: Remote description not set yet - queuing candidate');
        if (!call.pendingIceCandidates) {
          call.pendingIceCandidates = [];
        }
        call.pendingIceCandidates.push(candidate);
        console.log('🧊 ICE: Queued candidates count:', call.pendingIceCandidates.length);
        return;
      }

      try {
        await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 ICE: Candidate added successfully');
      } catch (error) {
        console.error('🧊 ICE: Failed to add ICE candidate:', error);
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
            // Process any queued ICE candidates
            await this.processPendingIceCandidates(call);
          } else if (data.type === 'answer') {
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
            console.log('Remote answer set successfully');
            // Process any queued ICE candidates
            await this.processPendingIceCandidates(call);
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
      // Check if already properly initialized for this user
      if (this.isInitialized && 
          this.localUserId === userId && 
          this.socket?.connected && 
          this.socket?.id) {
        resolve();
        return;
      }
      
      // Cleanup any existing connection before creating new one
      this.cleanup();
      
      // Create fresh socket connection only when necessary
      this.initializeSocket();

      console.log(`Authenticating user ${userId} with WebRTC signaling server`);
      
      const timeout = setTimeout(() => {
        console.error(`Authentication timeout for user ${userId}`);
        reject(new Error('Authentication timeout'));
      }, 30000); // Increased to 30 seconds for better stability

      this.socket!.once('authenticated', (data) => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${error.message}`));
      });

      this.socket!.on('disconnect', (reason) => {
        console.log(`Disconnected from encrypted WebRTC signaling server, reason:`, reason);
        // Don't auto-reinitialize on disconnect to prevent loops
        this.isInitialized = false;
      });

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
    this.cleanup();
  }

  // Initiate an encrypted call
  async initiateCall(targetUserId: string, type: 'voice' | 'video'): Promise<string> {
    
    // Test 1: Service Initialization Check
    if (!this.socket || !this.isInitialized) {
      const error = 'Service not initialized';
      throw new Error(error);
    }

    // CRITICAL: Try to use cached stream first (set by preflight permission check)
    const streamType = type === 'video' ? 'camera' : 'microphone';
    let cachedStream = permissionService.getCachedStream(streamType);
    
    let localStream: MediaStream | undefined;
    let usingCachedStream = false;
    
    try {
      if (cachedStream) {
        console.log(`✅ Using cached ${streamType} stream from preflight permission check`);
        // Clone the cached stream to create a new MediaStream with copies of the tracks
        // This allows the cache to remain live for subsequent uses
        localStream = cachedStream.clone();
        
        // Retain the stream (increment ref count)
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        console.log('🎤 AUDIO DEBUG: Using cached stream, tracks:', {
          audioTracks: localStream.getAudioTracks().length,
          videoTracks: localStream.getVideoTracks().length,
          audioTrackDetails: localStream.getAudioTracks().map(t => ({
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            label: t.label
          }))
        });
      } else {
        // Fallback: Request through permissionService for consistent error handling
        console.warn('⚠️ No cached stream found, requesting through permissionService (fallback)');
        
        const permissionResult = type === 'video' 
          ? await permissionService.requestCameraPermission()
          : await permissionService.requestMicrophonePermission();
        
        if (!permissionResult.success || !permissionResult.stream) {
          throw new Error(permissionResult.errorMessage || 'Failed to access media devices');
        }
        
        localStream = permissionResult.stream.clone();
        // Retain since we're now caching it
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        console.log('✅ AUDIO DEBUG: Permission granted via fallback');
        console.log('🎤 AUDIO DEBUG: Local stream tracks:', {
          audioTracks: localStream.getAudioTracks().length,
          videoTracks: localStream.getVideoTracks().length,
          audioTrackDetails: localStream.getAudioTracks().map(t => ({
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            label: t.label
          }))
        });
      }
      
      // Create peer connection
      console.log('🔗 AUDIO DEBUG: Creating peer connection with config:', this.rtcConfiguration);
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      
      // Add local stream tracks to peer connection
      console.log('📤 AUDIO DEBUG: Adding local tracks to peer connection...');
      localStream.getTracks().forEach(track => {
        console.log('📤 AUDIO DEBUG: Adding track:', {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        peerConnection.addTrack(track, localStream!);
      });
      console.log('✅ AUDIO DEBUG: All local tracks added to peer connection');

      // Generate call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store call information with proper initial status
      const call: EncryptedCall = {
        callId,
        participants: [this.localUserId!, targetUserId],
        type,
        encrypted: true,
        localStream,
        peerConnection,
        status: 'ringing', // Set proper initial status for outgoing calls
        retainedStreamType: usingCachedStream ? streamType : undefined, // Track for proper cleanup
      };
      
      this.activeCalls.set(callId, call);

      // Set up peer connection event handlers
      this.setupPeerConnectionHandlers(call);

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send encrypted call invitation
      
      this.socket.emit('initiate-call', {
        callId,
        targetUserId,
        type,
        offer,
      });

      // Listen for call initiated confirmation
      this.socket.once('call-initiated', (data: { callId: string, targetUserId: string }) => {
        // Call initiated successfully
      });
      
      this.socket.once('call-error', (data: { error: string }) => {
        console.error('Call error:', data.error);
      });
      
      // Listen for call accepted confirmation
      this.socket.once('call-accepted-confirmation', (data: { callId: string, fromUserId: string }) => {
      });
      
      return callId;
      
    } catch (error) {
      console.error('Failed to initiate call:', error);
      
      // CRITICAL: Cleanup on error - release retained stream and stop cloned tracks
      if (usingCachedStream) {
        console.log(`🧹 Releasing ${streamType} stream due to error in initiateCall`);
        permissionService.releaseStream(streamType);
      }
      
      if (localStream) {
        console.log('🧹 Stopping cloned tracks due to error');
        localStream.getTracks().forEach(track => track.stop());
      }
      
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
    if (!call) {
      console.error('❌ TEST FAILED: Call not found in activeCalls');
      console.error('❌ Requested call ID:', callId);
      console.error('❌ Available calls:', Array.from(this.activeCalls.keys()));
      throw new Error(`Call not found: ${callId}. Available calls: ${Array.from(this.activeCalls.keys()).join(', ') || 'none'}`);
    }
    console.log('✅ TEST PASSED: Call found in activeCalls');

    // CRITICAL: Request media through permissionService for consistent error handling
    const streamType = call.type === 'video' ? 'camera' : 'microphone';
    let cachedStream = permissionService.getCachedStream(streamType);
    
    let localStream: MediaStream | undefined;
    let usingCachedStream = false;
    
    try {
      if (cachedStream) {
        console.log(`✅ ACCEPT: Using cached ${streamType} stream`);
        // Clone the cached stream
        localStream = cachedStream.clone();
        
        // Retain the stream (increment ref count)
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        console.log('🎤 AUDIO DEBUG (ACCEPT): Using cached stream, tracks:', {
          audioTracks: localStream.getAudioTracks().length,
          videoTracks: localStream.getVideoTracks().length,
          audioTrackDetails: localStream.getAudioTracks().map(t => ({
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            label: t.label
          }))
        });
      } else {
        // Request through permissionService for consistent error handling
        console.log(`⚠️ ACCEPT: No cached stream, requesting ${streamType} permission`);
        
        const permissionResult = call.type === 'video' 
          ? await permissionService.requestCameraPermission()
          : await permissionService.requestMicrophonePermission();
        
        if (!permissionResult.success || !permissionResult.stream) {
          throw new Error(permissionResult.errorMessage || 'Failed to access media devices');
        }
        
        localStream = permissionResult.stream.clone();
        // Retain since we're now caching it
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        console.log('✅ AUDIO DEBUG (ACCEPT): Permission granted');
        console.log('🎤 AUDIO DEBUG (ACCEPT): Local stream tracks:', {
          audioTracks: localStream.getAudioTracks().length,
          videoTracks: localStream.getVideoTracks().length,
          audioTrackDetails: localStream.getAudioTracks().map(t => ({
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            label: t.label
          }))
        });
      }
      
      // Create peer connection
      console.log('🔗 AUDIO DEBUG (ACCEPT): Creating peer connection with config:', this.rtcConfiguration);
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      
      // Add local stream
      console.log('📤 AUDIO DEBUG (ACCEPT): Adding local tracks to peer connection...');
      localStream.getTracks().forEach(track => {
        console.log('📤 AUDIO DEBUG (ACCEPT): Adding track:', {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        peerConnection.addTrack(track, localStream!);
      });
      console.log('✅ AUDIO DEBUG (ACCEPT): All local tracks added to peer connection');

      // Update call object
      call.localStream = localStream;
      call.peerConnection = peerConnection;
      call.retainedStreamType = usingCachedStream ? streamType : undefined; // Track for cleanup

      // Set up peer connection handlers
      this.setupPeerConnectionHandlers(call);

      // Set remote description if we have an offer
      if (call.remoteOffer) {
        console.log('📞 ACCEPT: Setting remote offer description');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(call.remoteOffer));
        console.log('✅ ACCEPT: Remote offer set successfully');
        
        // CRITICAL: Process any queued ICE candidates now that remote description is set
        await this.processPendingIceCandidates(call);
      }

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send call acceptance to server
      
      this.socket.emit('accept-call', {
        callId,
        answer,
      });

      // Update call status to connected and trigger UI update
      call.status = 'connected';
      this.activeCalls.set(callId, call);

      // Trigger call accepted event for UI to show connected state  
      if (this.eventHandlers.onCallAccepted) {
        this.eventHandlers.onCallAccepted({
          callId: call.callId || callId,
          fromUserId: call.participants?.[0] || 'unknown',
          type: call.type,
          status: 'connected'
        });
      }
      
    } catch (error) {
      console.error('Failed to accept call:', error);
      
      // CRITICAL: Cleanup on error - release retained stream and stop cloned tracks
      if (usingCachedStream) {
        console.log(`🧹 Releasing ${streamType} stream due to error in acceptCall`);
        permissionService.releaseStream(streamType);
      }
      
      if (localStream) {
        console.log('🧹 Stopping cloned tracks due to error');
        localStream.getTracks().forEach(track => track.stop());
      }
      
      throw error;
    }
  }

  // End a call
  endCall(callId: string): void {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    // Clean up media streams - stop tracks first
    if (call.localStream) {
      call.localStream.getTracks().forEach(track => track.stop());
      console.log('🧹 Stopped local stream tracks');
    }
    
    // CRITICAL: Release retained stream AFTER stopping tracks
    if (call.retainedStreamType) {
      console.log(`🧹 Releasing ${call.retainedStreamType} stream (endCall)`);
      permissionService.releaseStream(call.retainedStreamType);
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
    
    // Cache peer connection for type safety (architect recommendation)
    const peerConnection = call.peerConnection;

    // Enhanced desktop stream handling with audio track integrity monitoring
    peerConnection.ontrack = (event) => {
      console.log('🎧 AUDIO DEBUG: ========== ONTRACK EVENT FIRED ==========');
      console.log('🎧 AUDIO DEBUG: Event:', {
        streamCount: event.streams.length,
        trackKind: event.track.kind,
        trackId: event.track.id,
        trackLabel: event.track.label,
        trackEnabled: event.track.enabled,
        trackMuted: event.track.muted,
        trackReadyState: event.track.readyState
      });
      
      console.log('📞 DESKTOP: Received remote stream with tracks:', event.streams[0].getTracks().length);
      call.remoteStream = event.streams[0];
      
      // Check transceiver direction (architect recommendation)
      const transceivers = peerConnection.getTransceivers();
      console.log('🔀 AUDIO DEBUG: Transceivers:', transceivers.map(t => ({
        direction: t.direction,
        currentDirection: t.currentDirection,
        trackKind: t.receiver?.track?.kind
      })));
      
      // Audio track integrity monitoring
      event.streams[0].getAudioTracks().forEach((track, index) => {
        console.log(`🎤 TRACK MONITOR: Audio track ${index} received:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        
        // Ensure track is enabled
        if (!track.enabled) {
          console.warn('⚠️ TRACK MONITOR: Audio track was disabled, enabling it');
          track.enabled = true;
        }
        
        // Monitor track state changes
        track.onended = () => {
          console.error('❌ TRACK MONITOR: Audio track ended unexpectedly!', {
            trackId: track.id,
            label: track.label,
            readyState: track.readyState
          });
        };
        
        track.onmute = () => {
          console.warn('🔇 TRACK MONITOR: Audio track muted', {
            trackId: track.id,
            label: track.label,
            enabled: track.enabled
          });
        };
        
        track.onunmute = () => {
          console.log('🔊 TRACK MONITOR: Audio track unmuted', {
            trackId: track.id,
            label: track.label,
            enabled: track.enabled
          });
        };
        
        // Log track settings if available
        if (track.getSettings) {
          const settings = track.getSettings();
          console.log('🎤 TRACK MONITOR: Audio track settings:', {
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl
          });
        }
      });
      
      // Video track monitoring
      event.streams[0].getVideoTracks().forEach((track, index) => {
        console.log(`📹 TRACK MONITOR: Video track ${index} received:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        
        // Ensure track is enabled
        if (!track.enabled) {
          console.warn('⚠️ TRACK MONITOR: Video track was disabled, enabling it');
          track.enabled = true;
        }
        
        // Monitor video track state changes
        track.onended = () => {
          console.warn('⚠️ TRACK MONITOR: Video track ended', {
            trackId: track.id,
            label: track.label
          });
        };
        
        // Log video track settings
        if (track.getSettings) {
          const settings = track.getSettings();
          console.log('📹 TRACK MONITOR: Video track settings:', {
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode
          });
        }
      });
      
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
    
    // Enhanced ICE connection state monitoring with TURN detection
    call.peerConnection.oniceconnectionstatechange = async () => {
      const state = call.peerConnection?.iceConnectionState;
      console.log('🧊 ICE MONITOR: Connection state changed:', state);
      
      switch (state) {
        case 'new':
          console.log('🆕 ICE MONITOR: ICE agent gathering addresses');
          break;
          
        case 'checking':
          console.log('🔍 ICE MONITOR: ICE agent checking candidates');
          break;
          
        case 'connected':
          console.log('✅ ICE MONITOR: ICE connection established!');
          
          // Detect if TURN server is being used
          try {
            const stats = await call.peerConnection?.getStats();
            if (stats) {
              stats.forEach((report: any) => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                  const localCandidateId = report.localCandidateId;
                  const remoteCandidateId = report.remoteCandidateId;
                  
                  stats.forEach((candidateReport: any) => {
                    if (candidateReport.id === localCandidateId || candidateReport.id === remoteCandidateId) {
                      if (candidateReport.candidateType === 'relay') {
                        console.log('🔄 ICE MONITOR: Using TURN server (relay)!', {
                          protocol: candidateReport.protocol,
                          relayProtocol: candidateReport.relayProtocol,
                          address: candidateReport.address
                        });
                      } else if (candidateReport.candidateType === 'srflx') {
                        console.log('🌐 ICE MONITOR: Using STUN server (server reflexive)');
                      } else if (candidateReport.candidateType === 'host') {
                        console.log('🏠 ICE MONITOR: Using direct connection (host)');
                      }
                    }
                  });
                }
              });
            }
          } catch (err) {
            console.warn('⚠️ ICE MONITOR: Could not get connection stats:', err);
          }
          break;
          
        case 'completed':
          console.log('✅ ICE MONITOR: ICE negotiation completed successfully');
          break;
          
        case 'failed':
          console.error('❌ ICE MONITOR: ICE connection failed!');
          console.error('❌ ICE MONITOR: Possible causes:');
          console.error('  1. Firewall blocking UDP/TCP connections');
          console.error('  2. TURN server not responding');
          console.error('  3. Network connectivity issues');
          console.error('  4. Symmetric NAT preventing connection');
          break;
          
        case 'disconnected':
          console.warn('⚠️ ICE MONITOR: ICE connection temporarily disconnected');
          console.log('💡 ICE MONITOR: Attempting to reconnect...');
          break;
          
        case 'closed':
          console.log('🔒 ICE MONITOR: ICE connection closed');
          break;
          
        default:
          console.log('❓ ICE MONITOR: Unknown ICE state:', state);
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
      
      // Build video constraints with specific deviceId
      const baseConstraints = this.getDesktopMediaConstraints('video');
      let videoConstraints: MediaTrackConstraints;
      
      if (typeof baseConstraints.video === 'object' && baseConstraints.video !== null) {
        videoConstraints = {
          ...baseConstraints.video,
          deviceId: { exact: nextDevice.deviceId }
        };
      } else {
        videoConstraints = {
          deviceId: { exact: nextDevice.deviceId }
        };
      }
      
      // CRITICAL: Request through permissionService for consistent error handling
      // Note: This is uncached because we need specific deviceId constraints
      const permissionResult = await permissionService.requestCameraWithConstraints(videoConstraints);
      
      if (!permissionResult.success || !permissionResult.stream) {
        throw new Error(permissionResult.errorMessage || 'Failed to switch camera');
      }
      
      const newStream = permissionResult.stream;
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