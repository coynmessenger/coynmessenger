/**
 * Simplified WebRTC Service for Video/Voice Calling
 * Focuses on reliable audio/video transmission with proper error handling
 */

import { io, Socket } from 'socket.io-client';

export interface CallConfig {
  type: 'voice' | 'video';
  targetUserId: string;
  localVideoElement?: HTMLVideoElement | null;
  remoteVideoElement?: HTMLVideoElement | null;
  remoteAudioElement?: HTMLAudioElement | null;
}

export interface CallEvents {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onCallConnected?: () => void;
  onCallEnded?: () => void;
  onError?: (error: Error) => void;
}

export interface IncomingCallData {
  callId: string;
  fromUserId: string;
  type: 'voice' | 'video';
  accept: (config: CallConfig, events: CallEvents) => Promise<void>;
  reject: () => void;
}

interface PendingCall {
  callId: string;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  config: CallConfig;
}

export class SimpleWebRTCService {
  private socket: Socket | null = null;
  private localUserId: string | null = null;
  private pendingCall: PendingCall | null = null;
  private events: CallEvents = {};
  private onIncomingCallHandler: ((data: IncomingCallData) => void) | null = null;
  private pendingOffer: any = null;
  
  // ICE servers configuration with public STUN servers
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor() {
    this.connectSocket();
  }

  private connectSocket() {
    this.socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ WebRTC: Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebRTC: Socket disconnected');
    });

    // Handle incoming call
    this.socket.on('incoming-call', async (data: {
      callId: string;
      fromUserId: string;
      type: 'voice' | 'video';
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log('📞 WebRTC: Incoming call from', data.fromUserId);
      
      // Store offer for acceptance
      this.pendingOffer = data;
      
      // Notify UI via callback
      if (this.onIncomingCallHandler) {
        const incomingCallData: IncomingCallData = {
          callId: data.callId,
          fromUserId: data.fromUserId,
          type: data.type,
          accept: async (config: CallConfig, events: CallEvents) => {
            // Accept the call with provided config
            console.log('✅ WebRTC: Accepting call via callback...');
            await this.acceptCall(config, events);
          },
          reject: () => {
            console.log('❌ WebRTC: Call rejected by user');
            this.pendingOffer = null;
            if (this.socket) {
              this.socket.emit('end-call', { callId: data.callId });
            }
          },
        };
        
        this.onIncomingCallHandler(incomingCallData);
      }
    });

    // Handle call accepted
    this.socket.on('call-accepted', async (data: {
      callId: string;
      byUserId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log('✅ WebRTC: Call accepted by', data.byUserId);
      
      if (this.pendingCall && data.answer) {
        try {
          await this.pendingCall.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log('✅ WebRTC: Remote description set');
          
          if (this.events.onCallConnected) {
            this.events.onCallConnected();
          }
        } catch (error) {
          console.error('❌ WebRTC: Failed to set remote description:', error);
          if (this.events.onError) {
            this.events.onError(error as Error);
          }
        }
      }
    });

    // Handle ICE candidates
    this.socket.on('ice-candidate', async (data: {
      callId: string;
      fromUserId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      console.log('🧊 WebRTC: Received ICE candidate');
      
      if (this.pendingCall && data.candidate) {
        try {
          await this.pendingCall.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log('✅ WebRTC: ICE candidate added');
        } catch (error) {
          console.error('❌ WebRTC: Failed to add ICE candidate:', error);
        }
      }
    });

    // Handle call ended
    this.socket.on('call-ended', (data: { callId: string }) => {
      console.log('📞 WebRTC: Call ended:', data.callId);
      this.cleanup();
      
      if (this.events.onCallEnded) {
        this.events.onCallEnded();
      }
    });
  }

  /**
   * Authenticate user with the signaling server
   */
  authenticate(userId: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        console.error('❌ WebRTC: Socket not initialized');
        resolve();
        return;
      }

      this.localUserId = userId;
      
      this.socket.emit('authenticate', { userId });
      
      this.socket.once('authenticated', (data: { userId: string }) => {
        console.log('✅ WebRTC: Authenticated as', data.userId);
        resolve();
      });
    });
  }

  /**
   * Set handler for incoming calls
   */
  onIncomingCall(handler: (data: IncomingCallData) => void) {
    this.onIncomingCallHandler = handler;
  }

  /**
   * Initiate an outgoing call
   */
  async initiateCall(config: CallConfig, events: CallEvents): Promise<string> {
    this.events = events;
    
    try {
      // Get local media
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: config.type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      console.log('🎤 WebRTC: Requesting media access...');
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ WebRTC: Media access granted');
      console.log('🎤 Audio tracks:', localStream.getAudioTracks().length);
      console.log('📹 Video tracks:', localStream.getVideoTracks().length);

      // Attach local stream to video element if provided
      if (config.localVideoElement && config.type === 'video') {
        config.localVideoElement.srcObject = localStream;
        config.localVideoElement.muted = true; // Mute own audio
      }

      // Notify app of local stream
      if (events.onLocalStream) {
        events.onLocalStream(localStream);
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Add local tracks to peer connection
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log('📤 WebRTC: Added track to peer connection:', track.kind);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📥 WebRTC: Received remote track:', event.track.kind);
        
        const remoteStream = event.streams[0];
        
        // Attach to remote video element if video call
        if (config.remoteVideoElement && config.type === 'video') {
          config.remoteVideoElement.srcObject = remoteStream;
        }

        // CRITICAL: Always attach audio to dedicated audio element
        if (config.remoteAudioElement) {
          config.remoteAudioElement.srcObject = remoteStream;
          config.remoteAudioElement.volume = 1.0;
          config.remoteAudioElement.muted = false;
          
          // Attempt playback with user gesture
          config.remoteAudioElement.play()
            .then(() => {
              console.log('✅ WebRTC: Remote audio playback started');
            })
            .catch((error) => {
              console.warn('⚠️ WebRTC: Autoplay blocked, will retry on user gesture');
              console.error(error);
              
              // Store for retry on user interaction
              (window as any).__pendingAudioElement = config.remoteAudioElement;
            });
        }

        // Notify app of remote stream
        if (events.onRemoteStream) {
          events.onRemoteStream(remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          console.log('🧊 WebRTC: Sending ICE candidate');
          this.socket.emit('ice-candidate', {
            callId: this.pendingCall?.callId,
            targetUserId: config.targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 WebRTC: Connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC: Peer connection established');
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC: Connection failed');
          if (events.onError) {
            events.onError(new Error('WebRTC connection failed'));
          }
        }
      };

      // Create offer
      console.log('📝 WebRTC: Creating offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: config.type === 'video',
      });
      
      await peerConnection.setLocalDescription(offer);
      console.log('✅ WebRTC: Local description set');

      // Generate call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store pending call
      this.pendingCall = {
        callId,
        peerConnection,
        localStream,
        remoteStream: null,
        config,
      };

      // Send call initiation to server
      if (this.socket) {
        console.log('📤 WebRTC: Sending call initiation...');
        this.socket.emit('initiate-call', {
          callId,
          targetUserId: config.targetUserId,
          type: config.type,
          offer: offer,
        });
      }

      return callId;

    } catch (error) {
      console.error('❌ WebRTC: Failed to initiate call:', error);
      if (events.onError) {
        events.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(config: CallConfig, events: CallEvents): Promise<void> {
    this.events = events;
    
    if (!this.pendingOffer) {
      throw new Error('No pending call offer found');
    }
    
    const pendingOffer = this.pendingOffer;

    try {
      // Get local media
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: config.type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      console.log('🎤 WebRTC: Requesting media access for answer...');
      const localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ WebRTC: Media access granted');

      // Attach local stream
      if (config.localVideoElement && config.type === 'video') {
        config.localVideoElement.srcObject = localStream;
        config.localVideoElement.muted = true;
      }

      if (events.onLocalStream) {
        events.onLocalStream(localStream);
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Add local tracks
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log('📤 WebRTC: Added track to peer connection:', track.kind);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📥 WebRTC: Received remote track:', event.track.kind);
        
        const remoteStream = event.streams[0];
        
        if (config.remoteVideoElement && config.type === 'video') {
          config.remoteVideoElement.srcObject = remoteStream;
        }

        // CRITICAL: Audio element handling
        if (config.remoteAudioElement) {
          config.remoteAudioElement.srcObject = remoteStream;
          config.remoteAudioElement.volume = 1.0;
          config.remoteAudioElement.muted = false;
          
          // Since this is triggered by accept button click, we have user gesture
          config.remoteAudioElement.play()
            .then(() => {
              console.log('✅ WebRTC: Remote audio playback started');
            })
            .catch((error) => {
              console.error('❌ WebRTC: Audio playback failed:', error);
            });
        }

        if (events.onRemoteStream) {
          events.onRemoteStream(remoteStream);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          console.log('🧊 WebRTC: Sending ICE candidate');
          this.socket.emit('ice-candidate', {
            callId: pendingOffer.callId,
            targetUserId: pendingOffer.fromUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Monitor connection state
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 WebRTC: Connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC: Peer connection established');
          if (events.onCallConnected) {
            events.onCallConnected();
          }
        }
      };

      // Set remote description from offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer.offer));
      console.log('✅ WebRTC: Remote description set from offer');

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log('✅ WebRTC: Local description set with answer');

      // Store pending call
      this.pendingCall = {
        callId: pendingOffer.callId,
        peerConnection,
        localStream,
        remoteStream: null,
        config,
      };

      // Send answer to server
      if (this.socket) {
        this.socket.emit('accept-call', {
          callId: pendingOffer.callId,
          answer: answer,
        });
        console.log('✅ WebRTC: Answer sent to server');
      }

      // Clean up pending offer
      this.pendingOffer = null;

    } catch (error) {
      console.error('❌ WebRTC: Failed to accept call:', error);
      if (events.onError) {
        events.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * End the current call
   */
  endCall() {
    if (this.pendingCall) {
      // Notify server
      if (this.socket) {
        this.socket.emit('end-call', {
          callId: this.pendingCall.callId,
        });
      }

      this.cleanup();
      
      if (this.events.onCallEnded) {
        this.events.onCallEnded();
      }
    }
  }

  /**
   * Toggle mute on local audio
   */
  toggleMute(): boolean {
    if (this.pendingCall?.localStream) {
      const audioTracks = this.pendingCall.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }

  /**
   * Toggle video on/off
   */
  toggleVideo(): boolean {
    if (this.pendingCall?.localStream) {
      const videoTracks = this.pendingCall.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !videoTracks[0]?.enabled;
    }
    return false;
  }

  /**
   * Clean up resources
   */
  private cleanup() {
    if (this.pendingCall) {
      // Stop all tracks
      this.pendingCall.localStream?.getTracks().forEach(track => track.stop());
      
      // Close peer connection
      this.pendingCall.peerConnection.close();
      
      this.pendingCall = null;
    }

    // Clear pending audio element
    delete (window as any).__pendingAudioElement;
    delete (window as any).__pendingCallOffer;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    this.cleanup();
    this.socket?.disconnect();
  }
}

/**
 * Global singleton instance
 */
let globalService: SimpleWebRTCService | null = null;

export function getSimpleWebRTC(): SimpleWebRTCService {
  if (!globalService) {
    globalService = new SimpleWebRTCService();
  }
  return globalService;
}

/**
 * Retry audio playback for any pending audio element
 * Call this from user gesture handlers (buttons, clicks, etc.)
 */
export function retryPendingAudio(): Promise<boolean> {
  return new Promise((resolve) => {
    const audioElement = (window as any).__pendingAudioElement as HTMLAudioElement;
    
    if (!audioElement || !audioElement.srcObject) {
      resolve(false);
      return;
    }

    audioElement.play()
      .then(() => {
        console.log('✅ Retry: Audio playback started after user gesture');
        delete (window as any).__pendingAudioElement;
        resolve(true);
      })
      .catch((error) => {
        console.error('❌ Retry: Audio playback still blocked:', error);
        resolve(false);
      });
  });
}
