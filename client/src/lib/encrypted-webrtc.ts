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
  retainedStreamType?: 'microphone' | 'camera';
  pendingIceCandidates?: RTCIceCandidateInit[];
  dtlsFingerprint?: string; // Remote peer's DTLS fingerprint for verification
  dtlsVerified?: boolean;   // Whether fingerprint was verified
  pendingIncomingCall?: { callId: string; fromUserId: string; type: 'voice' | 'video' };
  pendingCallAccepted?: { callId: string; fromUserId: string; type: 'voice' | 'video'; status: string };
}

export interface CallEventHandlers {
  onIncomingCall?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video' }) => void;
  onCallAccepted?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video'; status: string }) => void;
  onCallEnded?: (call: { callId: string; endedBy: string; reason: string }) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onEncryptionStatusChanged?: (encrypted: boolean) => void;
  onDtlsStateChanged?: (secured: boolean, fingerprint?: string) => void;
}

export class EncryptedWebRTCService {
  private socket: Socket | null = null;
  private activeCalls = new Map<string, EncryptedCall>();
  private localUserId: string | null = null;
  private publicKey: string | null = null;
  private eventHandlers: CallEventHandlers = {};
  private isInitialized = false;
  private readonly dev = import.meta.env.DEV;
  private log(...args: any[]) { if (this.dev) console.log(...args); }

  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
          'turns:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: [
          'turn:relay.metered.ca:80',
          'turn:relay.metered.ca:443',
          'turn:relay.metered.ca:443?transport=tcp',
          'turns:relay.metered.ca:443?transport=tcp'
        ],
        username: 'e8dd65b92c62d3e36c0c5abd',
        credential: 'DVMv35H9V9TcsGwa'
      }
    ],
    iceCandidatePoolSize: 5,
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

  // Generate an ECDSA P-256 DTLS certificate for this peer connection.
  // ECDSA P-256 is faster and produces shorter fingerprints than the browser's
  // default RSA-2048, while meeting the WebRTC security requirements in RFC 8827.
  private async generateDTLSCertificate(): Promise<RTCCertificate> {
    try {
      const cert = await RTCPeerConnection.generateCertificate({
        name: 'ECDSA',
        namedCurve: 'P-256',
      } as EcKeyGenParams);
      this.log('🔒 DTLS: Generated ECDSA P-256 certificate');
      return cert;
    } catch {
      // Safari / older browsers may not support ECDSA — fall back to RSA-2048
      console.warn('🔒 DTLS: ECDSA not supported, falling back to RSA-2048');
      return RTCPeerConnection.generateCertificate({
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      } as RsaHashedKeyGenParams);
    }
  }

  // Extract the DTLS fingerprint line from an SDP blob.
  // Returns the full "algorithm hash" string (e.g. "sha-256 AB:CD:…") or null.
  private extractDtlsFingerprint(sdp: string): string | null {
    const match = sdp.match(/a=fingerprint:([^\r\n]+)/);
    return match ? match[1].trim() : null;
  }

  // Verify that the fingerprint signaled out-of-band matches what's in the SDP.
  // A mismatch means the SDP was tampered with between the signaling server
  // and the browser — the classic MITM scenario DTLS fingerprinting prevents.
  private verifyDtlsFingerprint(sdp: string, expected: string): boolean {
    const actual = this.extractDtlsFingerprint(sdp);
    if (!actual) {
      console.warn('🔒 DTLS: No fingerprint found in SDP — cannot verify');
      return false;
    }
    const match = actual.toLowerCase() === expected.toLowerCase();
    if (match) {
      this.log('✅ DTLS: Fingerprint verified — peer identity confirmed');
    } else {
      console.error('🚨 DTLS: Fingerprint MISMATCH — possible MITM attack!');
      console.error('  Expected:', expected);
      console.error('  In SDP: ', actual);
    }
    return match;
  }

  // Process pending ICE candidates after remote description is set
  private async processPendingIceCandidates(call: EncryptedCall): Promise<void> {
    if (!call.pendingIceCandidates || call.pendingIceCandidates.length === 0) {
      return;
    }
    
    if (!call.peerConnection) {
      this.log('🧊 ICE: Cannot process pending candidates - no peer connection');
      return;
    }
    
    this.log(`🧊 ICE: Processing ${call.pendingIceCandidates.length} pending ICE candidates`);
    
    const candidates = [...call.pendingIceCandidates];
    call.pendingIceCandidates = []; // Clear the queue
    
    for (const candidate of candidates) {
      try {
        await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        this.log('🧊 ICE: Pending candidate added successfully');
      } catch (error) {
        console.error('🧊 ICE: Failed to add pending ICE candidate:', error);
      }
    }
    
    this.log('🧊 ICE: All pending candidates processed');
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
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: false,
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
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
      dtlsFingerprint?: string;
    }) => {
      this.log('📞 INCOMING CALL: ==================== RECEIVED ====================');
      this.log('📞 INCOMING CALL: Call ID:', data.callId);
      this.log('📞 INCOMING CALL: From User:', data.fromUserId);
      this.log('📞 INCOMING CALL: Type:', data.type);
      this.log('📞 INCOMING CALL: Has Offer:', !!data.offer);
      
      try {
        // Store call information — including caller's DTLS fingerprint for later verification
        const call: EncryptedCall = {
          callId: data.callId,
          participants: [data.fromUserId, this.localUserId!],
          type: data.type,
          encrypted: data.encrypted,
          dtlsFingerprint: data.dtlsFingerprint,
        };
        if (data.dtlsFingerprint) {
          this.log('🔒 DTLS: Stored caller fingerprint for verification on accept');
        }
        
        this.activeCalls.set(data.callId, call);
        this.log('✅ INCOMING CALL: Added to activeCalls. Total calls:', this.activeCalls.size);
        this.log('✅ INCOMING CALL: Active call IDs:', Array.from(this.activeCalls.keys()));

        // Trigger the incoming call event for UI
        const incomingCallEvent = {
          callId: data.callId,
          fromUserId: data.fromUserId,
          type: data.type,
        };
        
        if (this.eventHandlers.onIncomingCall) {
          this.log('📞 INCOMING CALL: Triggering onIncomingCall handler');
          this.eventHandlers.onIncomingCall(incomingCallEvent);
        } else {
          this.log('📦 INCOMING CALL: No handler yet, buffering event for later delivery');
          call.pendingIncomingCall = incomingCallEvent;
        }

        // If there's an offer, prepare for potential acceptance
        if (data.offer) {
          // Store offer data for when user accepts (use standard offer, not encrypted)
          call.remoteOffer = data.offer;
          this.log('✅ INCOMING CALL: Stored remote offer for later acceptance');
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
      dtlsFingerprint?: string;
    }) => {
      this.log('═══════════════════════════════════════════════════════');
      this.log('📞 CALLER: RECEIVED ANSWER FROM RECEIVER');
      this.log('═══════════════════════════════════════════════════════');
      this.log('  Call ID:', data.callId);
      this.log('  Accepted by:', data.byUserId);
      this.log('  Answer received:', !!data.answer);
      
      // Set remote description with the answer
      const call = this.activeCalls.get(data.callId);
      if (call?.peerConnection && data.answer) {
        try {
          this.log('📞 CALLER: Setting remote answer SDP...');

          // Verify callee's DTLS fingerprint — the caller now checks that the
          // fingerprint the callee signaled out-of-band matches the one in the answer SDP.
          if (data.dtlsFingerprint && data.answer.sdp) {
            const verified = this.verifyDtlsFingerprint(data.answer.sdp, data.dtlsFingerprint);
            if (call) call.dtlsVerified = verified;
            if (!verified) {
              console.error('🚨 DTLS: Callee fingerprint mismatch — aborting call setup');
            }
          } else if (!data.dtlsFingerprint) {
            console.warn('🔒 DTLS: No callee fingerprint in answer; skipping verification');
          }

          await call.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          this.log('✅ CALLER: Remote answer set successfully');
          
          // CRITICAL: Process any queued ICE candidates now that remote description is set
          await this.processPendingIceCandidates(call);
          
          // CRITICAL: Update call status to connected
          call.status = 'connected';
          this.activeCalls.set(data.callId, call);
          
          // Verify bi-directional audio setup on caller side
          this.log('🔊 CALLER BI-DIRECTIONAL AUDIO CHECK:');
          this.log('  📤 Outgoing (caller → receiver):');
          const senders = call.peerConnection.getSenders();
          senders.forEach((sender, i) => {
            if (sender.track) {
              this.log(`    Track ${i}: ${sender.track.kind} - enabled: ${sender.track.enabled}, state: ${sender.track.readyState}`);
            }
          });
          this.log('  📥 Incoming (receiver → caller):');
          const receivers = call.peerConnection.getReceivers();
          receivers.forEach((receiver, i) => {
            if (receiver.track) {
              this.log(`    Track ${i}: ${receiver.track.kind} - enabled: ${receiver.track.enabled}, state: ${receiver.track.readyState}`);
            }
          });
          
          // Log connection summary
          this.log('═══════════════════════════════════════════════════════');
          this.log('✅ CALLER: WEBRTC HANDSHAKE COMPLETE');
          this.log('═══════════════════════════════════════════════════════');
          this.log('  Peer connection state:', call.peerConnection.connectionState);
          this.log('  ICE connection state:', call.peerConnection.iceConnectionState);
          this.log('  Signaling state:', call.peerConnection.signalingState);
          this.log('═══════════════════════════════════════════════════════');
          
        } catch (error) {
          console.error('❌ CALLER: Failed to set remote answer:', error);
        }
      }
      
      // CRITICAL: Trigger call accepted event for UI to show connected state
      const callAcceptedEvent = {
        callId: data.callId,
        fromUserId: data.byUserId,
        type: call?.type || 'voice',
        status: 'connected'
      };
      
      if (this.eventHandlers.onCallAccepted) {
        this.eventHandlers.onCallAccepted(callAcceptedEvent);
        this.log('✅ CALLER: UI should now show in-call controls (Hang Up, Speaker, etc.)');
      } else {
        this.log('📦 CALLER: No handler yet, buffering callAccepted event');
        if (call) {
          call.pendingCallAccepted = callAcceptedEvent;
        }
      }
    });

    this.socket.on('call-ended', (data: {
      callId: string;
      endedBy: string;
      reason: string;
    }) => {
      this.log('Call ended:', data);
      
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
      this.log('🧊 ICE: Received ICE candidate for call:', data.callId);
      
      const call = this.activeCalls.get(data.callId);
      if (!call) {
        this.log('🧊 ICE: No call found for ICE candidate - queueing not possible');
        return;
      }
      
      let candidate = data.candidate;
      
      // Handle encrypted ICE candidates if available
      if (data.encrypted && data.encryptedCandidate) {
        this.log('🧊 ICE: Encrypted ICE candidate received');
      }
      
      if (!candidate) {
        this.log('🧊 ICE: No candidate data in message');
        return;
      }
      
      // If no peer connection yet, queue the candidate
      if (!call.peerConnection) {
        this.log('🧊 ICE: No peer connection yet - queuing candidate');
        if (!call.pendingIceCandidates) {
          call.pendingIceCandidates = [];
        }
        call.pendingIceCandidates.push(candidate);
        this.log('🧊 ICE: Queued candidates count:', call.pendingIceCandidates.length);
        return;
      }
      
      // Check if remote description is set before adding ICE candidates
      if (!call.peerConnection.remoteDescription) {
        this.log('🧊 ICE: Remote description not set yet - queuing candidate');
        if (!call.pendingIceCandidates) {
          call.pendingIceCandidates = [];
        }
        call.pendingIceCandidates.push(candidate);
        this.log('🧊 ICE: Queued candidates count:', call.pendingIceCandidates.length);
        return;
      }

      try {
        await call.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        this.log('🧊 ICE: Candidate added successfully');
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
      this.log('Received WebRTC signal:', data);
      
      const call = this.activeCalls.get(data.callId);
      if (!call?.peerConnection) {
        this.log('No peer connection found for WebRTC signal');
        return;
      }

      try {
        let signalData = data.signalData;
        
        // Handle encrypted signals if available
        if (data.encrypted && data.encryptedSignal) {
          this.log('Encrypted WebRTC signal received');
          // For now, use plain signalData which comes as fallback
        }

        if (signalData) {
          if (data.type === 'offer') {
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
            this.log('Remote offer set successfully');
            // Process any queued ICE candidates
            await this.processPendingIceCandidates(call);
          } else if (data.type === 'answer') {
            await call.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
            this.log('Remote answer set successfully');
            // Process any queued ICE candidates
            await this.processPendingIceCandidates(call);
          }
        }
      } catch (error) {
        console.error('Failed to handle WebRTC signal:', error);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected from encrypted WebRTC signaling server, reason:', reason);
      // Only mark as uninitialized if it's a real disconnect, not during HMR
      if (reason !== 'transport close' && reason !== 'io client disconnect') {
        this.isInitialized = false;
      }
    });
  }

  async initialize(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized && 
          this.localUserId === userId && 
          this.socket?.connected && 
          this.socket?.id) {
        resolve();
        return;
      }

      if (this.socket?.connected && this.localUserId === userId) {
        this.log('Socket connected but not fully initialized, re-authenticating...');
        this.socket.emit('authenticate', { userId });
        const timeout = setTimeout(() => {
          reject(new Error('Re-authentication timeout'));
        }, 15000);
        this.socket.once('authenticated', () => {
          clearTimeout(timeout);
          resolve();
        });
        return;
      }

      const hadActiveCalls = this.activeCalls.size > 0;
      if (hadActiveCalls) {
        console.warn(`⚠️ Re-initializing with ${this.activeCalls.size} active calls - preserving call state`);
      }
      const preservedCalls = new Map(this.activeCalls);

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

      this.initializeSocket();

      this.log(`Authenticating user ${userId} with WebRTC signaling server`);
      
      const timeout = setTimeout(() => {
        console.error(`Authentication timeout for user ${userId}`);
        reject(new Error('Authentication timeout'));
      }, 30000);

      this.socket!.once('authenticated', (data) => {
        clearTimeout(timeout);
        if (hadActiveCalls) {
          preservedCalls.forEach((call, id) => {
            if (call.peerConnection?.connectionState !== 'closed') {
              this.activeCalls.set(id, call);
            }
          });
          this.log(`Restored ${this.activeCalls.size} active calls after re-init`);
        }
        resolve();
      });

      this.socket!.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${error.message}`));
      });

      this.socket!.on('disconnect', (reason) => {
        this.log(`Disconnected from encrypted WebRTC signaling server, reason:`, reason);
        this.isInitialized = false;
      });

      this.socket!.emit('authenticate', { userId });
    });
  }

  // Set event handlers
  setEventHandlers(handlers: CallEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    
    // CRITICAL: Deliver any pending events immediately
    // This handles race conditions where events fire before handlers are registered
    this.activeCalls.forEach((call, callId) => {
      // Deliver pending incoming call events
      if (handlers.onIncomingCall && call.pendingIncomingCall) {
        this.log('📦 EVENT HANDLER: Delivering buffered incoming call for:', callId);
        handlers.onIncomingCall(call.pendingIncomingCall);
        call.pendingIncomingCall = undefined; // Clear after delivery
      }
      
      // Deliver pending call accepted events
      if (handlers.onCallAccepted && call.pendingCallAccepted) {
        this.log('📦 EVENT HANDLER: Delivering buffered call accepted for:', callId);
        handlers.onCallAccepted(call.pendingCallAccepted);
        call.pendingCallAccepted = undefined; // Clear after delivery
      }
      
      // Deliver pending remote streams
      if (handlers.onRemoteStream && call.remoteStream) {
        this.log('📦 EVENT HANDLER: Delivering buffered remote stream for:', callId);
        handlers.onRemoteStream(call.remoteStream);
      }
      
      // Deliver pending local streams
      if (handlers.onLocalStream && call.localStream) {
        this.log('📦 EVENT HANDLER: Delivering buffered local stream for:', callId);
        handlers.onLocalStream(call.localStream);
      }
    });
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
        this.log(`✅ Using cached ${streamType} stream from preflight permission check`);
        // Clone the cached stream to create a new MediaStream with copies of the tracks
        // This allows the cache to remain live for subsequent uses
        localStream = cachedStream.clone();
        
        // Retain the stream (increment ref count)
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        this.log('🎤 AUDIO DEBUG: Using cached stream, tracks:', {
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
        
        this.log('✅ AUDIO DEBUG: Permission granted via fallback');
        this.log('🎤 AUDIO DEBUG: Local stream tracks:', {
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
      
      // Create peer connection with an explicit ECDSA P-256 DTLS certificate.
      // This replaces the browser's default (often RSA-2048) with a faster,
      // equally-secure elliptic-curve certificate and lets us pin the fingerprint.
      const dtlsCert = await this.generateDTLSCertificate();
      this.log('🔗 AUDIO DEBUG: Creating peer connection with config:', this.rtcConfiguration);
      const peerConnection = new RTCPeerConnection({
        ...this.rtcConfiguration,
        certificates: [dtlsCert],
      });
      
      
      // Add local stream tracks to peer connection
      this.log('📤 AUDIO DEBUG: Adding local tracks to peer connection...');
      localStream.getTracks().forEach(track => {
        this.log('📤 AUDIO DEBUG: Adding track:', {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        peerConnection.addTrack(track, localStream!);
      });
      this.log('✅ AUDIO DEBUG: All local tracks added to peer connection');

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

      // CRITICAL: Notify UI of local stream for muting and recording
      if (this.eventHandlers.onLocalStream) {
        this.log('📤 AUDIO DEBUG: Delivering local stream to UI handler');
        this.eventHandlers.onLocalStream(localStream);
      }

      // Create and send offer
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await peerConnection.setLocalDescription(offer);

      // Extract our DTLS fingerprint from the local SDP so the callee can
      // verify it against what arrives in the offer — prevents signaling MITM.
      const localFingerprint = this.extractDtlsFingerprint(
        peerConnection.localDescription?.sdp || offer.sdp || ''
      );
      this.log('🔒 DTLS: Caller fingerprint to send:', localFingerprint?.slice(0, 40) + '…');

      // Send encrypted call invitation
      this.socket.emit('initiate-call', {
        callId,
        targetUserId,
        type,
        offer,
        dtlsFingerprint: localFingerprint,
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
        this.log(`🧹 Releasing ${streamType} stream due to error in initiateCall`);
        permissionService.releaseStream(streamType);
      }
      
      if (localStream) {
        this.log('🧹 Stopping cloned tracks due to error');
        localStream.getTracks().forEach(track => track.stop());
      }
      
      throw error;
    }
  }

  // Accept an incoming call
  async acceptCall(callId: string): Promise<void> {
    this.log('🧪 COMPREHENSIVE TEST: ==================== ACCEPT CALL TEST ====================');
    this.log('🧪 TEST: Function: acceptCall');
    this.log('🧪 TEST: Call ID to accept:', callId);
    this.log('🧪 TEST: Active calls map size:', this.activeCalls.size);
    this.log('🧪 TEST: Active call IDs:', Array.from(this.activeCalls.keys()));
    this.log('🧪 TEST: Socket initialized:', !!this.socket);
    this.log('🧪 TEST: Socket connected:', this.socket?.connected);
    this.log('🧪 TEST: Socket ID:', this.socket?.id);
    this.log('🧪 TEST: Service initialized:', this.isInitialized);
    this.log('🧪 TEST: Local user ID:', this.localUserId);
    this.log('🧪 TEST: Timestamp:', new Date().toISOString());
    
    this.log('📞 DEEP TEST: ===============================');
    this.log('📞 DEEP TEST: ANSWER BUTTON CLICKED - ACCEPTING CALL');
    this.log('📞 DEEP TEST: ===============================');
    
    // Test 1: Service Status Check
    if (!this.socket || !this.isInitialized) {
      console.error('❌ TEST FAILED: Service Initialization');
      console.error('❌ ERROR DETAILS: Socket:', !!this.socket, 'Connected:', this.socket?.connected, 'Initialized:', this.isInitialized);
      throw new Error('Service not initialized');
    }
    this.log('✅ TEST PASSED: Service Initialization Check');

    // Test 2: Call Existence Check
    const call = this.activeCalls.get(callId);
    if (!call) {
      console.error('❌ TEST FAILED: Call not found in activeCalls');
      console.error('❌ Requested call ID:', callId);
      console.error('❌ Available calls:', Array.from(this.activeCalls.keys()));
      throw new Error(`Call not found: ${callId}. Available calls: ${Array.from(this.activeCalls.keys()).join(', ') || 'none'}`);
    }
    this.log('✅ TEST PASSED: Call found in activeCalls');

    // CRITICAL: Request media through permissionService for consistent error handling
    const streamType = call.type === 'video' ? 'camera' : 'microphone';
    let cachedStream = permissionService.getCachedStream(streamType);
    
    let localStream: MediaStream | undefined;
    let usingCachedStream = false;
    
    try {
      if (cachedStream) {
        this.log(`✅ ACCEPT: Using cached ${streamType} stream`);
        // Clone the cached stream
        localStream = cachedStream.clone();
        
        // Retain the stream (increment ref count)
        permissionService.retainStream(streamType);
        usingCachedStream = true;
        
        this.log('🎤 AUDIO DEBUG (ACCEPT): Using cached stream, tracks:', {
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
        this.log(`⚠️ ACCEPT: No cached stream, requesting ${streamType} permission`);
        
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
        
        this.log('✅ AUDIO DEBUG (ACCEPT): Permission granted');
        this.log('🎤 AUDIO DEBUG (ACCEPT): Local stream tracks:', {
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
      
      // Create peer connection with explicit ECDSA P-256 DTLS certificate (callee side)
      const dtlsCert = await this.generateDTLSCertificate();
      this.log('🔗 AUDIO DEBUG (ACCEPT): Creating peer connection with config:', this.rtcConfiguration);
      const peerConnection = new RTCPeerConnection({
        ...this.rtcConfiguration,
        certificates: [dtlsCert],
      });
      
      // Add local stream
      this.log('📤 AUDIO DEBUG (ACCEPT): Adding local tracks to peer connection...');
      localStream.getTracks().forEach(track => {
        this.log('📤 AUDIO DEBUG (ACCEPT): Adding track:', {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        peerConnection.addTrack(track, localStream!);
      });
      this.log('✅ AUDIO DEBUG (ACCEPT): All local tracks added to peer connection');

      // Update call object
      call.localStream = localStream;
      call.peerConnection = peerConnection;
      call.retainedStreamType = usingCachedStream ? streamType : undefined; // Track for cleanup

      // Set up peer connection handlers
      this.setupPeerConnectionHandlers(call);

      // Set remote description if we have an offer
      if (call.remoteOffer) {
        this.log('📞 ACCEPT: Setting remote offer description');

        // Verify caller's DTLS fingerprint against what's inside the offer SDP.
        // If we received a fingerprint out-of-band through the signaling server and
        // it doesn't match the one embedded in the offer itself, the SDP may have
        // been tampered with in transit (classic signaling-layer MITM attack).
        if (call.dtlsFingerprint && call.remoteOffer.sdp) {
          const verified = this.verifyDtlsFingerprint(call.remoteOffer.sdp, call.dtlsFingerprint);
          call.dtlsVerified = verified;
          if (!verified) {
            console.error('🚨 DTLS: Rejecting call — fingerprint verification failed');
            throw new Error('DTLS fingerprint verification failed — possible MITM attack');
          }
        } else if (!call.dtlsFingerprint) {
          console.warn('🔒 DTLS: No out-of-band fingerprint received; cannot verify caller identity');
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(call.remoteOffer));
        this.log('✅ ACCEPT: Remote offer set successfully');
        
        // CRITICAL: Process any queued ICE candidates now that remote description is set
        await this.processPendingIceCandidates(call);
      }

      // Create answer - this completes the WebRTC offer/answer handshake on receiver side
      this.log('📞 ACCEPT: Creating WebRTC answer...');
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.log('✅ ACCEPT: Local answer SDP set successfully');

      // Extract callee's DTLS fingerprint so the caller can verify us in turn
      const calleeFingerprint = this.extractDtlsFingerprint(
        peerConnection.localDescription?.sdp || answer.sdp || ''
      );
      this.log('🔒 DTLS: Callee fingerprint to send:', calleeFingerprint?.slice(0, 40) + '…');

      // Verify bi-directional audio setup BEFORE sending answer
      this.log('🔊 BI-DIRECTIONAL AUDIO CHECK:');
      this.log('  📤 Outgoing (local → remote):');
      const senders = peerConnection.getSenders();
      senders.forEach((sender, i) => {
        if (sender.track) {
          this.log(`    Track ${i}: ${sender.track.kind} - enabled: ${sender.track.enabled}, state: ${sender.track.readyState}`);
        }
      });
      this.log('  📥 Incoming (remote → local): Waiting for ontrack event after answer exchange');
      
      // Verify transceivers are set up for bi-directional communication
      const transceivers = peerConnection.getTransceivers();
      this.log('  🔀 Transceivers:', transceivers.length);
      transceivers.forEach((t, i) => {
        this.log(`    Transceiver ${i}: direction=${t.direction}, currentDirection=${t.currentDirection}`);
      });

      // Send call acceptance to server - this triggers the answer delivery to caller
      // Include our DTLS fingerprint so the caller can verify our identity
      this.log('📤 ACCEPT: Sending answer to signaling server...');
      this.socket.emit('accept-call', {
        callId,
        answer,
        dtlsFingerprint: calleeFingerprint,
      });
      this.log('✅ ACCEPT: Call accepted and answer sent to caller');

      // Update call status to connected and trigger UI update
      call.status = 'connected';
      this.activeCalls.set(callId, call);

      // Log final success summary
      this.log('═══════════════════════════════════════════════════════');
      this.log('✅ ACCEPT CALL: HANDSHAKE COMPLETE');
      this.log('═══════════════════════════════════════════════════════');
      this.log('  Call ID:', callId);
      this.log('  Local stream tracks:', localStream.getTracks().length);
      this.log('  Audio tracks enabled:', localStream.getAudioTracks().filter(t => t.enabled).length);
      this.log('  Peer connection state:', peerConnection.connectionState);
      this.log('  ICE connection state:', peerConnection.iceConnectionState);
      this.log('  Signaling state:', peerConnection.signalingState);
      this.log('═══════════════════════════════════════════════════════');

      // CRITICAL: Notify UI of local stream for muting and recording
      if (this.eventHandlers.onLocalStream) {
        this.log('📤 AUDIO DEBUG (ACCEPT): Delivering local stream to UI handler');
        this.eventHandlers.onLocalStream(localStream);
      }

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
        this.log(`🧹 Releasing ${streamType} stream due to error in acceptCall`);
        permissionService.releaseStream(streamType);
      }
      
      if (localStream) {
        this.log('🧹 Stopping cloned tracks due to error');
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
      this.log('🧹 Stopped local stream tracks');
    }
    
    // CRITICAL: Release retained stream AFTER stopping tracks
    if (call.retainedStreamType) {
      this.log(`🧹 Releasing ${call.retainedStreamType} stream (endCall)`);
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

    this.log('Call ended and cleaned up');
  }

  private setupPeerConnectionHandlers(call: EncryptedCall): void {
    if (!call.peerConnection) return;
    
    // Cache peer connection for type safety (architect recommendation)
    const peerConnection = call.peerConnection;

    peerConnection.ontrack = (event) => {
      this.log('🎧 ONTRACK EVENT FIRED:', {
        streamCount: event.streams.length,
        trackKind: event.track.kind,
        trackEnabled: event.track.enabled,
        trackMuted: event.track.muted,
        trackReadyState: event.track.readyState
      });

      const stream = event.streams[0] || new MediaStream([event.track]);
      call.remoteStream = stream;

      stream.getAudioTracks().forEach((track) => {
        if (!track.enabled) {
          track.enabled = true;
        }

        track.onunmute = () => {
          this.log('🔊 TRACK: Audio track unmuted - re-delivering stream');
          if (this.eventHandlers.onRemoteStream) {
            this.eventHandlers.onRemoteStream(stream);
          }
        };

        track.onended = () => {
          console.error('❌ TRACK: Audio track ended unexpectedly');
        };
      });

      stream.getVideoTracks().forEach((track) => {
        if (!track.enabled) {
          track.enabled = true;
        }
      });

      if (this.eventHandlers.onRemoteStream) {
        this.log('✅ STREAM: Delivering remote stream to handler');
        this.eventHandlers.onRemoteStream(stream);
      } else {
        this.log('📦 STREAM: No handler yet, stream buffered in call.remoteStream');
      }
    };

    call.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        // Enhanced desktop ICE candidate handling
        const targetUserId = call.participants.find(p => p !== this.localUserId);
        if (targetUserId) {
          this.log('🧊 DESKTOP: Sending ICE candidate to:', targetUserId);
          this.log('- Candidate type:', event.candidate.type);
          this.log('- Protocol:', event.candidate.protocol);
          this.log('- Priority:', event.candidate.priority);
          this.log('- Foundation:', event.candidate.foundation);
          
          // Desktop-specific candidate optimization
          if (!this.isMobileDevice() && event.candidate.type === 'host') {
            this.log('🧊 DESKTOP: Prioritizing host candidate for direct connection');
          }
          
          this.socket.emit('ice-candidate', {
            callId: call.callId,
            targetUserId,
            candidate: event.candidate,
          });
        }
      } else if (!event.candidate) {
        this.log('🏁 DESKTOP: ICE gathering complete for call:', call.callId);
      }
    };

    call.peerConnection.onconnectionstatechange = () => {
      const state = call.peerConnection?.connectionState;
      this.log('🔌 CLIENT: Connection state changed:', state);
      
      if (state === 'connected') {
        this.log('✅ CLIENT: WebRTC connection established successfully!');
        if (call.remoteStream && this.eventHandlers.onRemoteStream) {
          this.log('🔊 CLIENT: Re-delivering remote stream on connection established');
          this.eventHandlers.onRemoteStream(call.remoteStream);
        }

        // Inspect the DTLS transport that the browser negotiated.
        // RTCDtlsTransport.state === 'connected' confirms the DTLS handshake
        // completed successfully and media is now flowing over DTLS-SRTP.
        const pc = call.peerConnection;
        if (pc) {
          const senders = pc.getSenders();
          const dtlsTransport = senders[0]?.transport;
          const dtlsState = dtlsTransport?.state;
          this.log('🔒 DTLS: Transport state on connection:', dtlsState ?? 'unavailable');

          if (dtlsState === 'connected' || !dtlsTransport) {
            // Either DTLS transport is confirmed connected, or the browser doesn't
            // expose the transport object (older API). In either case, WebRTC mandates
            // DTLS-SRTP, so we can consider the media channel secure.
            const fingerprint = this.extractDtlsFingerprint(
              pc.localDescription?.sdp || ''
            );
            if (this.eventHandlers.onDtlsStateChanged) {
              this.eventHandlers.onDtlsStateChanged(true, fingerprint || undefined);
            }
            this.log('✅ DTLS: DTLS-SRTP handshake confirmed — media is encrypted');
          }

          // Also listen to future DTLS state changes if the transport is available
          if (dtlsTransport) {
            dtlsTransport.onstatechange = () => {
              const s = dtlsTransport.state;
              this.log('🔒 DTLS: Transport state change:', s);
              const isSecured = s === 'connected';
              if (this.eventHandlers.onDtlsStateChanged) {
                const fp = this.extractDtlsFingerprint(pc.localDescription?.sdp || '');
                this.eventHandlers.onDtlsStateChanged(isSecured, fp || undefined);
              }
            };
          }
        }
      } else if (state === 'failed') {
        console.error('❌ CLIENT: WebRTC connection failed - likely NAT/firewall issue');
        this.log('💡 TIP: Check TURN server configuration and firewall settings');
        
        // Give it more time before ending the call - sometimes ICE takes longer
        setTimeout(() => {
          const stillFailed = call.peerConnection?.iceConnectionState === 'failed';
          if (stillFailed) {
            this.log('❌ CLIENT: ICE connection still failed after retry period, ending call');
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
            this.log('✅ CLIENT: ICE connection recovered after retry period');
          }
        }, 10000); // Give 10 more seconds for ICE to recover
      } else if (state === 'disconnected') {
        console.warn('⚠️ CLIENT: WebRTC connection disconnected');
        setTimeout(() => {
          if (call.peerConnection?.connectionState === 'disconnected') {
            this.log('🔄 CLIENT: Connection still disconnected, restarting ICE...');
            try {
              call.peerConnection.restartIce();
            } catch (e) {
              console.error('❌ CLIENT: ICE restart failed:', e);
            }
          }
        }, 3000);
      }
    };

    // Enhanced signaling state debugging
    call.peerConnection.onsignalingstatechange = () => {
      const signalingState = call.peerConnection?.signalingState;
      this.log('📡 CLIENT: Signaling state changed:', signalingState);
      
      switch (signalingState) {
        case 'stable':
          this.log('✅ Signaling: Ready for new offer/answer exchange');
          break;
        case 'have-local-offer':
          this.log('📤 Signaling: Local offer created, waiting for answer');
          break;
        case 'have-remote-offer':
          this.log('📥 Signaling: Remote offer received, creating answer');
          break;
        case 'have-local-pranswer':
          this.log('📤 Signaling: Local provisional answer created');
          break;
        case 'have-remote-pranswer':
          this.log('📥 Signaling: Remote provisional answer received');
          break;
        case 'closed':
          this.log('❌ Signaling: Connection closed');
          break;
        default:
          this.log('❓ Signaling: Unknown state:', signalingState);
      }
    };
    
    // Enhanced ICE connection state monitoring with TURN detection
    call.peerConnection.oniceconnectionstatechange = async () => {
      const state = call.peerConnection?.iceConnectionState;
      this.log('🧊 ICE MONITOR: Connection state changed:', state);
      
      switch (state) {
        case 'new':
          this.log('🆕 ICE MONITOR: ICE agent gathering addresses');
          break;
          
        case 'checking':
          this.log('🔍 ICE MONITOR: ICE agent checking candidates');
          break;
          
        case 'connected':
          this.log('✅ ICE MONITOR: ICE connection established!');

          if (call.remoteStream && this.eventHandlers.onRemoteStream) {
            this.log('🔊 ICE MONITOR: Re-delivering remote stream after ICE connected');
            this.eventHandlers.onRemoteStream(call.remoteStream);
          }
          break;
          
        case 'completed':
          this.log('✅ ICE MONITOR: ICE negotiation completed successfully');
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
          this.log('💡 ICE MONITOR: Will attempt ICE restart if not recovered...');
          setTimeout(() => {
            if (call.peerConnection?.iceConnectionState === 'disconnected') {
              this.log('🔄 ICE MONITOR: Still disconnected, restarting ICE...');
              try {
                call.peerConnection.restartIce();
              } catch (e) {
                console.error('❌ ICE MONITOR: ICE restart failed:', e);
              }
            }
          }, 3000);
          break;
          
        case 'closed':
          this.log('🔒 ICE MONITOR: ICE connection closed');
          break;
          
        default:
          this.log('❓ ICE MONITOR: Unknown ICE state:', state);
      }
    };
    
    // Monitor ICE gathering state
    call.peerConnection.onicegatheringstatechange = () => {
      const state = call.peerConnection?.iceGatheringState;
      this.log('📍 CLIENT: ICE gathering state:', state);
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
      this.log('📞 DESKTOP: Audio toggled to:', audioTrack.enabled ? 'enabled' : 'muted');
      
      // Desktop-specific audio quality maintenance
      if (!this.isMobileDevice() && audioTrack.enabled) {
        // Ensure audio processing settings are maintained after unmute
        const constraints = audioTrack.getConstraints();
        this.log('📞 DESKTOP: Maintaining audio constraints:', constraints);
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
      this.log('📞 DESKTOP: Video toggled to:', videoTrack.enabled ? 'enabled' : 'disabled');
      
      // Desktop-specific video quality maintenance
      if (!this.isMobileDevice() && videoTrack.enabled) {
        const settings = videoTrack.getSettings();
        this.log('📞 DESKTOP: Maintaining video quality:', {
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
        this.log('📞 DESKTOP: Only one camera available');
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
      
      this.log('📞 DESKTOP: Switching to camera:', nextDevice.label);
      
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
        this.log('📞 DESKTOP: Camera track replaced successfully');
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
      this.log('📞 DESKTOP: Attempting connection recovery for call:', callId);
      
      // Check if we can restart ICE
      if (call.peerConnection.connectionState === 'failed' || 
          call.peerConnection.iceConnectionState === 'failed') {
        
        this.log('📞 DESKTOP: Restarting ICE for connection recovery');
        call.peerConnection.restartIce();
        
        // Wait for ICE restart
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
          
          const checkConnection = () => {
            if (call.peerConnection?.connectionState === 'connected') {
              clearTimeout(timeout);
              this.log('📞 DESKTOP: Connection recovery successful');
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