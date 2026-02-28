import { useState, useEffect, useRef, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { EncryptedWebRTCService } from "@/lib/encrypted-webrtc";
import { getGlobalWebRTC } from "@/lib/global-webrtc";
import { notificationService } from "@/lib/notification-service";
import { ringtoneService } from "@/lib/ringtone-service";
import { permissionService } from "@/lib/permission-service";
import { tryPlayMedia } from "@/utils/media";
import { X, ShieldCheck } from "lucide-react";
import { 
  IncomingCallControls, 
  ActiveCallControls, 
  ConnectingCallControls,
  useCallTimer
} from "@/components/call-controls";
import { useCallRingtone, useRingback } from "@/hooks/use-ringtone";
import { useCallRecording } from "@/hooks/use-call-recording";
import type { User } from "@shared/schema";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  user?: User;
  callType?: "incoming" | "outgoing";
  isCallActive?: boolean;
  incomingCallId?: string;
}

export default function VideoCallModal({ isOpen, onClose, onHide, onCallStart, onCallEnd, user, callType = "outgoing", isCallActive = false, incomingCallId }: VideoCallModalProps) {
  
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSelfViewExpanded, setIsSelfViewExpanded] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('user');
  const [encryptedCallId, setEncryptedCallId] = useState<string | null>(null);
  const [dtlsSecured, setDtlsSecured] = useState(false);
  
  // Use the modular call timer hook
  const { duration: callDuration, formattedDuration, reset: resetCallTimer } = useCallTimer(callStatus === "connected");
  
  // Use centralized ringtone hooks for incoming and outgoing calls
  const { 
    isPlaying: isRingtonePlayingState, 
    isPending: isRingtonePending,
    stopRingtone: stopRingtoneHook 
  } = useCallRingtone({
    callStatus,
    callType,
    isOpen,
    maxDuration: 45000,
    onMaxDurationReached: () => {
      console.log('📹 VIDEO CALL: Ringtone max duration reached');
    }
  });
  
  // Ringback tone for outgoing calls
  const { isPlaying: isRingbackPlaying, stopRingback } = useRingback({
    callStatus,
    callType,
    isOpen
  });
  
  // Get current user for call recording
  const currentUserData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('connectedUser') || '{}');
    } catch {
      return {};
    }
  }, []);
  
  // Call recording hook for automatic transcription and Google Drive storage
  const callRecording = useCallRecording({
    callerAddress: callType === 'outgoing' ? (currentUserData.walletAddress || 'unknown') : (user?.walletAddress || 'unknown'),
    receiverAddress: callType === 'outgoing' ? (user?.walletAddress || 'unknown') : (currentUserData.walletAddress || 'unknown'),
    callType: 'video'
  });
  
  // Remote stream state for video display
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  
  // WebRTC service instance
  const webrtcService = useRef<EncryptedWebRTCService | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Prevent multiple call initiations
  const callInitiatedRef = useRef(false);
  
  // Stable callback refs to prevent infinite loops
  const onCallStartRef = useRef(onCallStart);
  const onCallEndRef = useRef(onCallEnd);
  
  // Stream management - REFS mirror STATE for cleanup access in effects
  const incomingStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  
  // Pending audio playback (for autoplay blocked scenarios)
  const pendingAudioPlaybackRef = useRef<MediaStream | null>(null);
  const userGestureReceivedRef = useRef(false); // Track if user has made a gesture
  
  // Prevent multiple end operations
  const isEndingRef = useRef(false);
  
  // Ref to track current callStatus inside timeouts (avoids stale closure)
  const callStatusRef = useRef(callStatus);
  
  // Keep callStatusRef in sync with callStatus state
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Keep stream refs in sync with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  
  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);
  
  useEffect(() => {
    currentStreamRef.current = currentStream;
  }, [currentStream]);
  
  // Track component mount state for proper cleanup
  const encryptedCallIdRef = useRef<string | null>(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'enter' | 'exit'>('enter');

  // Function to center the modal
  const centerModal = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Modal dimensions (matching the CSS classes)
    const modalWidth = Math.min(viewportWidth * 0.95, 672); // max-w-2xl is 672px
    const modalHeight = 500; // Approximate height for video calls
    
    // Calculate center position
    const centerX = (viewportWidth - modalWidth) / 2;
    const centerY = (viewportHeight - modalHeight) / 2;
    
    setPosition({
      x: Math.max(0, centerX),
      y: Math.max(0, centerY)
    });
  };

  // Update callback refs to prevent infinite loops
  useEffect(() => {
    onCallStartRef.current = onCallStart;
    onCallEndRef.current = onCallEnd;
  }, [onCallStart, onCallEnd]);

  // Centralized state reset function - COMPLETE IDEMPOTENT CLEANUP
  // Uses refs instead of state to ensure cleanup works in all contexts (including unmount)
  const resetLocalState = () => {
    console.log('🧹 VIDEO CALL: Starting complete cleanup...');
    
    // Reset state
    setCallStatus("connecting");
    resetCallTimer();
    setIsMuted(false);
    setIsVideoOff(false);
    setEncryptedCallId(null);
    callInitiatedRef.current = false;
    
    // Reset call recording state
    callRecording.reset();
    
    // Clean up incoming stream ref - defensive check for already-stopped tracks
    if (incomingStreamRef.current) {
      console.log('🧹 VIDEO CALL: Stopping incomingStreamRef tracks');
      incomingStreamRef.current.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log(`  Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        }
      });
      incomingStreamRef.current = null;
    }
    
    // Clean up current stream using REF (not state) for unmount access
    if (currentStreamRef.current) {
      console.log('🧹 VIDEO CALL: Stopping currentStream tracks');
      currentStreamRef.current.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log(`  Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        }
      });
      currentStreamRef.current = null;
    }
    setCurrentStream(null);
    
    // CRITICAL: Clean up remote stream using REF to release remote media resources
    if (remoteStreamRef.current) {
      console.log('🧹 VIDEO CALL: Stopping remote stream tracks');
      remoteStreamRef.current.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log(`  Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        }
      });
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);
    
    // CRITICAL: Clean up local stream using REF to release camera/mic resources
    if (localStreamRef.current) {
      console.log('🧹 VIDEO CALL: Stopping local stream tracks');
      localStreamRef.current.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log(`  Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        }
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteVideoEnabled(false);
    
    // Clear pending audio playback ref
    if (pendingAudioPlaybackRef.current) {
      console.log('🧹 VIDEO CALL: Clearing pending audio playback ref');
      pendingAudioPlaybackRef.current = null;
    }
    userGestureReceivedRef.current = false;
    
    // Clear ALL media element srcObjects to ensure complete cleanup
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      console.log('🧹 VIDEO CALL: Cleared remoteVideoRef.srcObject');
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      console.log('🧹 VIDEO CALL: Cleared localVideoRef.srcObject');
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      console.log('🧹 VIDEO CALL: Cleared remoteAudioRef.srcObject');
    }
    
    console.log('✅ VIDEO CALL: Complete cleanup finished');
  };

  // Retry pending audio playback after user gesture (accept button click)
  const retryPendingAudioPlayback = async () => {
    if (pendingAudioPlaybackRef.current && remoteAudioRef.current) {
      console.log('🔄 VIDEO CALL: Retrying audio playback after user gesture');
      // Ensure audio element is configured
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.muted = false;
      
      const played = await tryPlayMedia(remoteAudioRef.current);
      if (played) {
        console.log('✅ VIDEO CALL: Audio playback succeeded after user gesture');
        pendingAudioPlaybackRef.current = null; // Clear pending playback
      } else {
        console.error('❌ VIDEO CALL: Audio playback still failed after user gesture');
      }
    }
  };

  // Center modal when it opens and trigger entrance animation
  useEffect(() => {
    if (isOpen && !isInitialized) {
      centerModal();
      setIsInitialized(true);
      setAnimationType('enter');
      setIsAnimating(true);
      
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized]);

  // Re-center on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        centerModal();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Use global WebRTC service instead of creating new instances
  useEffect(() => {
    if (isOpen && user) {
      webrtcService.current = getGlobalWebRTC();
      
      if (webrtcService.current) {
        // Set event handlers for encrypted WebRTC
        webrtcService.current.setEventHandlers({
          onIncomingCall: (call) => {
            if (call.type === 'video') {
              setCallStatus("ringing");
              setEncryptedCallId(call.callId);
            }
          },
          onCallAccepted: (call) => {
            setCallStatus("connected");
            // Start recording when call is accepted
            if (localStreamRef.current) {
              callRecording.startRecording(localStreamRef.current);
            }
            if (onCallStart) onCallStart();
          },
          onCallEnded: async (call) => {
            console.log('📹 VIDEO CALL: onCallEnded triggered - invoking full cleanup');
            
            // Skip if already ending (handleEndCall already did cleanup)
            if (isEndingRef.current) {
              console.log('📹 VIDEO CALL: Already ending, skipping duplicate cleanup');
              return;
            }
            
            // Stop recording and process (transcription + Google Drive upload)
            await callRecording.stopRecording();
            
            // Stop ringtone if still playing
            ringtoneService.stopRingtone();
            
            // CRITICAL: Call full resetLocalState for complete cleanup
            // Don't set isEndingRef before because resetLocalState checks it
            resetLocalState();
            
            setCallStatus("ended");
            if (onCallEnd) onCallEnd();
          },
          onEncryptionStatusChanged: (encrypted) => {
            // Handle encryption status changes
          },
          onDtlsStateChanged: (secured) => {
            setDtlsSecured(secured);
          },
          onLocalStream: (stream) => {
            console.log('═══════════════════════════════════════════════════════');
            console.log('📹 VIDEO CALL: LOCAL STREAM RECEIVED');
            console.log('═══════════════════════════════════════════════════════');
            
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();
            
            console.log('📤 OUTGOING STREAM ANALYSIS:');
            console.log('  Audio tracks:', audioTracks.length);
            console.log('  Video tracks:', videoTracks.length);
            
            videoTracks.forEach((track, index) => {
              console.log(`  📹 Video track ${index}:`, {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
              });
            });
            
            // Store local stream for state tracking and mute/video controls
            setLocalStream(stream);
            setCurrentStream(stream);
            currentStreamRef.current = stream;
            
            // Attach to local video element for self-view
            if (localVideoRef.current && videoTracks.length > 0) {
              console.log('📺 VIDEO CALL: Attaching local video stream to self-view');
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.muted = true; // Always mute local playback to prevent feedback
              
              localVideoRef.current.play().then(() => {
                console.log('✅ VIDEO CALL: Local video (self-view) playing');
              }).catch((err) => {
                console.warn('⚠️ VIDEO CALL: Local video autoplay blocked:', err);
              });
            }
            
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ VIDEO CALL: LOCAL STREAM ATTACHED');
            console.log('  📤 Outgoing audio: ' + (audioTracks.length > 0 ? 'YES' : 'NO'));
            console.log('  📤 Outgoing video: ' + (videoTracks.length > 0 ? 'YES' : 'NO'));
            console.log('═══════════════════════════════════════════════════════');
          },
          onRemoteStream: (stream) => {
            console.log('═══════════════════════════════════════════════════════');
            console.log('📹 VIDEO CALL: STEP 4 - HANDLE REMOTE STREAM');
            console.log('═══════════════════════════════════════════════════════');
            
            // Step 4.1: Log all received tracks for bi-directional verification
            const audioTracks = stream.getAudioTracks();
            const videoTracks = stream.getVideoTracks();
            
            console.log('📥 INCOMING STREAM ANALYSIS:');
            console.log('  Audio tracks:', audioTracks.length);
            console.log('  Video tracks:', videoTracks.length);
            
            audioTracks.forEach((track, index) => {
              console.log(`  🔊 Audio track ${index}:`, {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
              });
            });
            
            videoTracks.forEach((track, index) => {
              console.log(`  📹 Video track ${index}:`, {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
              });
            });
            
            // Store remote stream for state tracking
            setRemoteStream(stream);
            
            // Check if remote video is available
            if (videoTracks.length > 0) {
              const hasEnabledVideo = videoTracks.some(track => track.enabled && track.readyState === 'live');
              setRemoteVideoEnabled(hasEnabledVideo);
              console.log('📹 VIDEO CALL: Remote video enabled:', hasEnabledVideo);
            }
            
            // Ensure all tracks are enabled
            audioTracks.forEach(track => {
              if (!track.enabled) {
                console.log('🔧 VIDEO CALL: Enabling disabled audio track');
                track.enabled = true;
              }
            });
            
            videoTracks.forEach(track => {
              if (!track.enabled) {
                console.log('🔧 VIDEO CALL: Enabling disabled video track');
                track.enabled = true;
              }
            });
            
            // Step 4.2a: Attach video stream to remote video element
            if (remoteVideoRef.current && videoTracks.length > 0) {
              console.log('📺 VIDEO CALL: Attaching remote video stream to video element');
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.muted = true; // Mute video element (audio handled separately)
              
              const playVideo = async () => {
                try {
                  await remoteVideoRef.current?.play();
                  console.log('✅ VIDEO CALL: Remote video playback started');
                  setRemoteVideoEnabled(true);
                } catch (err) {
                  console.warn('⚠️ VIDEO CALL: Remote video autoplay blocked, will retry on interaction');
                }
              };
              
              if (remoteVideoRef.current.readyState >= 2) {
                playVideo();
              } else {
                remoteVideoRef.current.addEventListener('loadedmetadata', playVideo, { once: true });
              }
            }
            
            const audioEl = remoteAudioRef.current;
            if (audioEl) {
              audioEl.srcObject = stream;
              audioEl.volume = 1.0;
              audioEl.muted = false;
              audioEl.defaultMuted = false;

              const tryPlay = async (label: string) => {
                try {
                  if (!audioEl.srcObject) return;
                  if (!audioEl.paused) return;
                  await audioEl.play();
                  console.log(`✅ VIDEO (${label}): Audio playback started`);
                  pendingAudioPlaybackRef.current = null;
                } catch (err: any) {
                  console.warn(`⚠️ VIDEO (${label}): play() failed:`, err.name);
                  pendingAudioPlaybackRef.current = stream;
                }
              };

              tryPlay('immediate');
              setTimeout(() => tryPlay('retry-100ms'), 100);
              setTimeout(() => tryPlay('retry-500ms'), 500);
              setTimeout(() => tryPlay('retry-1500ms'), 1500);
              audioEl.addEventListener('canplay', () => tryPlay('canplay'), { once: true });

              audioEl.onerror = (err) => {
                console.error('❌ VIDEO CALL: Audio element error:', err);
              };
            } else {
              console.error('❌ VIDEO CALL: No audio element ref available!');
            }
            
            // Monitor stream lifecycle
            stream.addEventListener('active', () => {
              console.log('✅ VIDEO CALL: Remote stream became active');
            });
            
            stream.addEventListener('inactive', () => {
              console.warn('⚠️ VIDEO CALL: Remote stream became inactive');
              setRemoteVideoEnabled(false);
            });
            
            // Log bi-directional verification summary
            console.log('═══════════════════════════════════════════════════════');
            console.log('✅ VIDEO CALL: STEP 4 COMPLETE - REMOTE STREAM ATTACHED');
            console.log('  📥 Incoming audio: ' + (audioTracks.length > 0 ? 'YES' : 'NO'));
            console.log('  📥 Incoming video: ' + (videoTracks.length > 0 ? 'YES' : 'NO'));
            console.log('═══════════════════════════════════════════════════════');
          }
        });
      }
    }
    
    return () => {
      // Don't cleanup global service, just clear reference
      webrtcService.current = null;
    };
  }, [isOpen, user, onCallStart, onCallEnd]);
  
  // CRITICAL: Keep ref in sync with current call ID (runs on every render)
  encryptedCallIdRef.current = encryptedCallId;
  
  // CRITICAL: Unmount-only cleanup - release streams when component truly unmounts
  useEffect(() => {
    return () => {
      // This cleanup only runs on true unmount (empty dependency array)
      console.log('🧹 VIDEO CALL: Component unmounting - performing full cleanup');
      
      // Stop any active call first
      if (encryptedCallIdRef.current && !isEndingRef.current) {
        console.log('🧹 VIDEO CALL: Ending active call on unmount');
        const service = getGlobalWebRTC();
        if (service) {
          service.endCall(encryptedCallIdRef.current);
        }
      }
      
      // CRITICAL: Stop ALL stream tracks using REFS (refs have current values, state doesn't)
      // This ensures camera/mic are released even when React state is stale
      const stopStreamTracks = (stream: MediaStream | null, name: string) => {
        if (stream) {
          stream.getTracks().forEach(track => {
            if (track.readyState !== 'ended') {
              console.log(`🧹 Stopping ${name} track: ${track.kind}`);
              track.stop();
            }
          });
        }
      };
      
      stopStreamTracks(localStreamRef.current, 'localStream');
      stopStreamTracks(remoteStreamRef.current, 'remoteStream');
      stopStreamTracks(currentStreamRef.current, 'currentStream');
      stopStreamTracks(incomingStreamRef.current, 'incomingStream');
      
      // Clear refs
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      currentStreamRef.current = null;
      incomingStreamRef.current = null;
      pendingAudioPlaybackRef.current = null;
      
      // Clear DOM element srcObjects
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      
      console.log('✅ VIDEO CALL: Unmount cleanup complete');
    };
  }, []); // Empty array = cleanup only on unmount

  useEffect(() => {
    if (!isOpen) {
      // Stop ringtone when modal closes
      ringtoneService.stopRingtone();
      
      // ALWAYS trigger cleanup when modal closes, regardless of isCallActive
      // This ensures camera/mic resources are released even if user just hides modal
      console.log('📹 VIDEO CALL: Modal closed, triggering full cleanup');
      resetLocalState();
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      setCallStatus("connected");
      return;
    }

    // Initiate encrypted WebRTC video call for outgoing calls (only once)
    // CRITICAL: Request camera/microphone permission IMMEDIATELY when outgoing call starts
    if (callType === "outgoing" && webrtcService.current && user && !encryptedCallId && !callInitiatedRef.current) {
      callInitiatedRef.current = true; // Prevent multiple calls
      setCallStatus("connecting");
      
      // IMMEDIATELY request camera/microphone permission before initiating call
      console.log('📹 OUTGOING VIDEO CALL: Requesting camera/microphone permission immediately...');
      permissionService.requestCameraPermission()
        .then((permissionResult) => {
          if (permissionResult.success && permissionResult.stream) {
            console.log('✅ OUTGOING VIDEO CALL: Camera/microphone permission granted');
            // Store the stream for immediate local preview
            incomingStreamRef.current = permissionResult.stream;
            setLocalStream(permissionResult.stream);
            
            // Attach to local video element for preview
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = permissionResult.stream;
              localVideoRef.current.play().catch(err => {
                console.warn('⚠️ OUTGOING VIDEO CALL: Local preview autoplay blocked:', err);
              });
            }
          } else {
            console.warn('⚠️ OUTGOING VIDEO CALL: Camera permission request failed, will retry during call');
          }
        })
        .catch((err) => {
          console.warn('⚠️ OUTGOING VIDEO CALL: Camera permission error:', err);
        });
      
      const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
      if (currentUser.id) {
        // Wait for WebRTC service to be fully initialized
        webrtcService.current.initialize(currentUser.id.toString())
          .then(() => {
            if (webrtcService.current) {
              return webrtcService.current.initiateCall(user.id.toString(), 'video');
            }
            throw new Error('WebRTC service not available');
          })
          .then((callId) => {
            setEncryptedCallId(callId);
            setCallStatus("ringing");
          })
          .catch((error) => {
            console.error('📹 VIDEO CALL: ❌ Call initiation failed:', error);
            
            // CRITICAL FIX: Reset the call initiated ref on error
            callInitiatedRef.current = false;
            
            setCallStatus("ended");
            
            // Show user-friendly error messages
            let errorMessage = 'Failed to start video call';
            if (error.message.includes('Microphone access denied')) {
              errorMessage = 'Camera/microphone access denied. Please allow camera and microphone permissions in your browser settings and try again.';
            } else if (error.message.includes('No microphone found')) {
              errorMessage = 'No microphone or camera found. Please connect a microphone and camera and try again.';
            } else if (error.message.includes('already in use')) {
              errorMessage = 'Camera/microphone is already in use by another application. Please close other apps using the camera or microphone and try again.';
            }
            
            // Show toast notification
            import("@/hooks/use-toast").then(({ toast }) => {
              toast({
                title: "Video Call Failed",
                description: errorMessage,
                variant: "destructive",
              });
            });
            
            if (onCallEnd) onCallEnd();
          });
      } else {

        setCallStatus("ended");
        if (onCallEnd) onCallEnd();
      }
    } else if (callType === "incoming") {
      // For incoming calls, start with connecting while we get permissions
      setCallStatus("connecting");
      
      // Show notification for incoming video calls
      if (user) {
        const callerName = user.displayName || user.signInName || `@${user.walletAddress?.slice(-6)}` || user.username || "Unknown";
        notificationService.showCallNotification(callerName, 'video');
      }
      
      // Set the encrypted call ID for incoming calls
      if (incomingCallId) {
        setEncryptedCallId(incomingCallId);
        
        // CRITICAL: Request camera permissions immediately for incoming video calls
        console.log('📹 INCOMING VIDEO CALL: Requesting camera permissions immediately...');
        
        // Start ringtone for incoming video call
        ringtoneService.startRingtone()
          .then(() => {
            console.log('🔔 VIDEO CALL: Ringtone started for incoming call');
          })
          .catch(err => {
            console.warn('🔕 VIDEO CALL: Ringtone autoplay blocked:', err);
          });
        
        // Request camera permissions with error handling
        permissionService.requestCameraPermission()
          .then((result) => {
            if (result.success && result.stream) {
              console.log('✅ INCOMING VIDEO CALL: Camera permissions granted');
              // Store the stream temporarily - we'll use it when user accepts
              incomingStreamRef.current = result.stream;
              setCallStatus("ringing"); // Now we can show ringing state
              
              // Add 45-second auto-timeout for incoming calls
              setTimeout(() => {
                if (callStatusRef.current === "ringing") {
                  console.log('📹 INCOMING VIDEO CALL: Call timeout - no answer after 45 seconds');
                  ringtoneService.stopRingtone();
                  setCallStatus("ended");
                  setTimeout(() => onClose(), 1500);
                }
              }, 45000);
            } else {
              throw new Error(result.errorMessage || 'Failed to get camera access');
            }
          })
          .catch(async (error) => {
            console.error('❌ INCOMING VIDEO CALL: Camera permission denied:', error);
            setCallStatus("ended");
            
            // Stop ringtone on error
            ringtoneService.stopRingtone();
            
            import("@/hooks/use-toast").then(({ toast }) => {
              toast({
                title: "Video Call Failed",
                description: 'Camera/microphone access is required to receive video calls. Please allow access in your browser settings.',
                variant: "destructive",
                duration: 8000,
              });
            });
            
            if (onCallEnd) onCallEnd();
          });
      }
    }
  }, [isOpen, isCallActive, onCallStart]); // Removed incomingCallId to prevent multiple calls

  // CRITICAL: Separate useEffect to handle incomingCallId timing
  // This ensures encryptedCallId is set even if incomingCallId arrives after modal opens
  useEffect(() => {
    if (callType === "incoming" && incomingCallId && !encryptedCallId) {
      console.log('📹 VIDEO: Setting encryptedCallId from incomingCallId:', incomingCallId);
      setEncryptedCallId(incomingCallId);
    }
  }, [callType, incomingCallId, encryptedCallId]);

  // Display local camera preview during connecting/ringing state for all calls
  useEffect(() => {
    const hasStream = localStream || incomingStreamRef.current;
    const shouldShowPreview = (callStatus === "ringing" || callStatus === "connecting") && hasStream && localVideoRef.current;
    
    if (shouldShowPreview) {
      const stream = localStream || incomingStreamRef.current;
      console.log(`📹 VIDEO CALL: Displaying camera preview during ${callStatus} state (${callType})`);
      
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Prevent feedback
        
        localVideoRef.current.play().then(() => {
          console.log('✅ VIDEO CALL: Camera preview playing');
        }).catch((err) => {
          console.warn('⚠️ VIDEO CALL: Camera preview autoplay blocked:', err);
        });
      }
    }
  }, [callType, callStatus, localStream]);

  // Note: Timer is now handled by useCallTimer hook

  const handleAcceptCall = async () => {
    console.log('🎯 VIDEO ACCEPT BUTTON CLICKED');
    console.log('🆔 Encrypted Call ID:', encryptedCallId);
    console.log('🔧 WebRTC Service Available:', !!webrtcService.current);
    
    // Mark that user has made a gesture (clicked accept button)
    userGestureReceivedRef.current = true;
    console.log('👆 VIDEO ACCEPT: User gesture received (button click)');
    
    // Stop ringtone when accepting call
    ringtoneService.stopRingtone();
    stopRingtoneHook();
    stopRingback();
    
    if (encryptedCallId && webrtcService.current) {
      try {
        setCallStatus("connecting");
        
        // Check if we already have the media stream from the incoming call preparation
        const tempStream = incomingStreamRef.current;
        if (tempStream) {
          console.log('✅ VIDEO ACCEPT: Using pre-authorized camera stream');
          // Clean up the temporary reference
          incomingStreamRef.current = null;
        }
        
        console.log('📞 VIDEO ACCEPT: Calling webrtcService.acceptCall with:', encryptedCallId);
        await webrtcService.current.acceptCall(encryptedCallId);
        console.log('✅ VIDEO ACCEPT: Call accepted successfully');
        
        // Retry any pending audio playback (autoplay might have been blocked)
        await retryPendingAudioPlayback();
      } catch (error: any) {
        console.error('❌ VIDEO ACCEPT: Failed to accept call:', error);
        setCallStatus("ended");
        
        // Show user-friendly error messages
        let errorMessage = 'Failed to accept video call';
        if (error.message && error.message.includes('Microphone access denied')) {
          errorMessage = 'Camera/microphone access denied. Please allow camera and microphone permissions in your browser settings and try again.';
        } else if (error.message && error.message.includes('No microphone found')) {
          errorMessage = 'No microphone or camera found. Please connect a microphone and camera and try again.';
        } else if (error.message && error.message.includes('already in use')) {
          errorMessage = 'Camera/microphone is already in use by another application. Please close other apps using the camera or microphone and try again.';
        }
        
        // Show toast notification
        import("@/hooks/use-toast").then(({ toast }) => {
          toast({
            title: "Video Call Failed",
            description: errorMessage,
            variant: "destructive",
          });
        });
        
        if (onCallEnd) onCallEnd();
      }
    }
  };

  // Quick action handlers
  const handleToggleMute = () => {
    if (currentStream) {
      const audioTracks = currentStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle enabled state
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    if (currentStream) {
      const videoTracks = currentStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff; // Toggle enabled state
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleSwitchCamera = async () => {
    if (!currentStream) return;
    
    try {
      // Stop current video track
      const videoTracks = currentStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());
      
      // Switch camera facing mode
      const newCamera = currentCamera === 'user' ? 'environment' : 'user';
      
      // Get new stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { 
          facingMode: newCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Update current stream
      setCurrentStream(newStream);
      setCurrentCamera(newCamera);
      
      // Update the peer connection with new video track if connected
      if (webrtcService.current && encryptedCallId) {
        const call = (webrtcService.current as any).activeCalls?.get(encryptedCallId);
        if (call?.peerConnection) {
          const sender = call.peerConnection.getSenders().find((s: any) => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            const newVideoTrack = newStream.getVideoTracks()[0];
            await sender.replaceTrack(newVideoTrack);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to switch camera:', error);
      // Show toast notification about camera switch failure
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Camera Switch Failed",
          description: "Unable to switch camera. Check camera permissions.",
          variant: "destructive",
          duration: 3000,
        });
      });
    }
  };

  const handleEndCall = () => {
    // Stop ringtone when ending/declining call
    ringtoneService.stopRingtone();
    
    // Mark as ending to prevent duplicate callbacks
    isEndingRef.current = true;
    
    if (encryptedCallId && webrtcService.current) {
      webrtcService.current.endCall(encryptedCallId);
    }
    
    // CRITICAL: Use centralized cleanup - handles all streams, refs, and state
    console.log('🧹 VIDEO CALL: handleEndCall - invoking resetLocalState');
    resetLocalState();
    
    // Clear DOM element srcObjects
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    
    setCallStatus("ended");
    if (onCallEnd) {
      onCallEnd();
    }
    
    // Trigger exit animation then close
    setAnimationType('exit');
    setIsAnimating(true);
    
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
      isEndingRef.current = false;
    }, 300);
  };

  const handleHideCall = () => {
    if (onHide) {
      onHide();
    }
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't start dragging if touching a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    updatePosition(newX, newY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    const newX = touch.clientX - dragStartRef.current.x;
    const newY = touch.clientY - dragStartRef.current.y;
    
    updatePosition(newX, newY);
  };

  const updatePosition = (newX: number, newY: number) => {
    // Allow modal to go beyond side borders but keep at least 100px visible
    const modalWidth = 672; // Approximate modal width (max-w-2xl)
    const minVisibleWidth = 100;
    const maxX = window.innerWidth - minVisibleWidth;
    const minX = -(modalWidth - minVisibleWidth);
    
    // Allow modal to go beyond top and bottom borders but keep at least 100px visible
    const modalHeight = 600; // Approximate modal height
    const minVisibleHeight = 100;
    const maxY = window.innerHeight - minVisibleHeight;
    const minY = -(modalHeight - minVisibleHeight);
    
    setPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      document.body.style.touchAction = 'none'; // Prevent scrolling on mobile
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return (
          <span className="flex items-center justify-center gap-1">
            Connecting
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-yellow-500 dark:bg-yellow-400 rounded-full animate-bounce animation-delay-500"></span>
            </span>
          </span>
        );
      case "ringing":
        return callType === "incoming" ? (
          <span className="flex items-center justify-center gap-1">
            Incoming video call
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></span>
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse animation-delay-300"></span>
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse animation-delay-600"></span>
            </span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            Ringing
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce animation-delay-500"></span>
            </span>
          </span>
        );
      case "connected":
        return formattedDuration;
      case "ended":
        return "Call ended";
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case "connecting":
        return "text-yellow-600 dark:text-yellow-400";
      case "ringing":
        return "text-blue-600 dark:text-blue-400";
      case "connected":
        return "text-green-600 dark:text-green-400";
      case "ended":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (callStatus === "connected") {
          handleHideCall();
        } else {
          setAnimationType('exit');
          setIsAnimating(true);
          
          setTimeout(() => {
            onClose();
            setIsAnimating(false);
          }, 350);
        }
      }
    }}>
      <DialogContent 
        hideCloseButton
        noAnimation
        className="p-0 border-none bg-transparent shadow-none max-w-2xl w-[95vw] overflow-visible"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          margin: 0,
          transform: 'none',
        }}
        onPointerDownCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('[role="button"]')) {
            return;
          }
        }}
      >
        <div 
          ref={dragRef}
          className={`
            relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800
            bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl
            ${isAnimating ? (animationType === 'enter' ? 'animate-modal-enter' : 'animate-modal-exit') : ''}
          `}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                {callStatus === "connecting" ? "Connecting Video..." : 
                 callStatus === "ringing" ? (callType === "incoming" ? "Incoming Video Call" : "Calling...") : 
                 callStatus === "connected" ? "Video Call" : "Call Ended"}
              </DialogTitle>
              {/* DTLS security badge — appears once the DTLS-SRTP handshake is confirmed */}
              {dtlsSecured && callStatus === "connected" && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-semibold tracking-wide">
                  <ShieldCheck className="w-3 h-3" />
                  DTLS
                </span>
              )}
            </div>
            <button 
              onClick={handleHideCall}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="p-0">
            {/* Video Area */}
            <div className="relative aspect-video bg-gradient-to-b from-gray-50 to-gray-100 dark:bg-gray-950 overflow-hidden">
              {callStatus === "connected" ? (
                <div className="w-full h-full relative">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${remoteVideoEnabled ? 'block' : 'hidden'}`}
                  />
                  {!remoteVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                      <Avatar className="w-24 h-24 border-4 border-gray-300/60 dark:border-white/20">
                        <AvatarImage src={user?.profilePicture || ""} />
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-2xl">
                          <UserAvatarIcon className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md rounded-full px-3 py-1">
                    <span className="text-white text-xs font-medium">{user?.displayName}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
                      <Avatar className="w-32 h-32 border-4 border-gray-200 dark:border-gray-800 shadow-xl relative z-10 mx-auto">
                        <AvatarImage src={user?.profilePicture || ""} />
                        <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-4xl">
                          {user?.displayName?.[0] || <UserAvatarIcon className="w-16 h-16" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className={`text-lg font-medium ${getStatusColor()}`}>
                      {getStatusText()}
                    </div>
                  </div>
                </div>
              )}

              {/* Self view preview */}
              {(localStream || incomingStreamRef.current) && (
                <div className="absolute top-4 right-4 w-32 h-24 bg-gray-900 rounded-xl border-2 border-white/20 shadow-xl overflow-hidden z-20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                </div>
              )}
            </div>

            {/* Controls Area */}
            <div className="p-6 bg-white dark:bg-gray-900 flex flex-col items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {user?.displayName || user?.signInName || "User"}
              </h2>

              <div className="w-full max-w-md">
                {callStatus === "ringing" && callType === "incoming" ? (
                  <IncomingCallControls 
                    onAnswer={handleAcceptCall} 
                    onDecline={handleEndCall}
                    callType="video"
                  />
                ) : callStatus === "connected" ? (
                  <ActiveCallControls 
                    onEndCall={handleEndCall}
                    onToggleMute={handleToggleMute}
                    onToggleVideo={handleToggleVideo}
                    onSwitchCamera={handleSwitchCamera}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                    callType="video"
                  />
                ) : (
                  <ConnectingCallControls onEndCall={handleEndCall} />
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </Dialog>
  );
}