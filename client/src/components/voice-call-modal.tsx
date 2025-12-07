import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { EncryptedWebRTCService } from "@/lib/encrypted-webrtc";
import { getGlobalWebRTC } from "@/lib/global-webrtc";
import { notificationService } from "@/lib/notification-service";
import { ringtoneService } from "@/lib/ringtone-service";
import { microphoneService } from "@/lib/microphone-service";
import { tryPlayMedia } from "@/utils/media";
import { 
  IncomingCallControls, 
  ActiveCallControls, 
  ConnectingCallControls,
  useCallTimer
} from "@/components/call-controls";
import { useCallRingtone, useRingback } from "@/hooks/use-ringtone";
import type { User } from "@shared/schema";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  user?: User;
  callType?: "incoming" | "outgoing";
  onSwitchToVideo?: () => void;
  isCallActive?: boolean;
  incomingCallId?: string;
}

export default function VoiceCallModal({ 
  isOpen, 
  onClose, 
  onHide, 
  onCallStart, 
  onCallEnd, 
  user, 
  callType = "outgoing", 
  onSwitchToVideo,
  isCallActive = false,
  incomingCallId
}: VoiceCallModalProps) {
  
  // Add debugging for props
  console.log('🎙️ VOICE MODAL: Rendered with props:', {
    isOpen,
    user: user ? { id: user.id, name: user.displayName } : null,
    callType,
    incomingCallId
  });
  
  // Initialize WebRTC service from global service on mount
  useEffect(() => {
    const globalService = getGlobalWebRTC();
    if (globalService) {
      console.log('🔧 VOICE MODAL: Setting WebRTC service from global service');
      webrtcService.current = globalService;
    } else {
      console.log('❌ VOICE MODAL: No global WebRTC service available');
    }
  }, []);
  
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [encryptedCallId, setEncryptedCallId] = useState<string | null>(null);
  
  // Use the modular call timer hook
  const { duration: callDuration, formattedDuration, reset: resetCallTimer } = useCallTimer(callStatus === "connected");
  
  // Use centralized ringtone hooks for incoming and outgoing calls
  const { 
    isPlaying: isRingtonePlayingState, 
    isPending: isRingtonePending,
    stopRingtone 
  } = useCallRingtone({
    callStatus,
    callType,
    isOpen,
    maxDuration: 45000,
    onMaxDurationReached: () => {
      console.log('🔔 VOICE CALL: Ringtone max duration reached');
    }
  });
  
  // Ringback tone for outgoing calls
  const { isPlaying: isRingbackPlaying, stopRingback } = useRingback({
    callStatus,
    callType,
    isOpen
  });
  
  // WebRTC service instance - get from global service
  const webrtcService = useRef<EncryptedWebRTCService | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  // Prevent multiple call initiations
  const callInitiatedRef = useRef(false);
  
  // Stable callback refs to prevent infinite loops
  const onCallStartRef = useRef(onCallStart);
  const onCallEndRef = useRef(onCallEnd);
  
  // Stream management - REFS mirror STATE for cleanup access in effects
  const incomingStreamRef = useRef<MediaStream | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  
  // Pending audio playback (for autoplay blocked scenarios)
  const pendingAudioPlaybackRef = useRef<MediaStream | null>(null);
  const userGestureReceivedRef = useRef(false); // Track if user has made a gesture
  
  // Prevent multiple end operations
  const isEndingRef = useRef(false);
  
  // Keep stream ref in sync with state for unmount cleanup access
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
    const modalWidth = Math.min(viewportWidth * 0.9, 384); // max-w-sm is 384px
    const modalHeight = 450; // Approximate height
    
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
    console.log('📞 VOICE CALL: Starting complete cleanup...');
    
    // Reset state
    setCallStatus("connecting");
    resetCallTimer();
    setIsMuted(false);
    setIsSpeakerOn(false);
    setEncryptedCallId(null);
    callInitiatedRef.current = false;
    userGestureReceivedRef.current = false;
    pendingAudioPlaybackRef.current = null;
    
    // Clean up incoming stream ref - defensive check for already-stopped tracks
    if (incomingStreamRef.current) {
      console.log('🧹 VOICE CALL: Stopping incomingStreamRef tracks');
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
      console.log('🧹 VOICE CALL: Stopping currentStream tracks');
      currentStreamRef.current.getTracks().forEach(track => {
        if (track.readyState !== 'ended') {
          console.log(`  Stopping track: ${track.kind} (${track.label})`);
          track.stop();
        }
      });
      currentStreamRef.current = null;
    }
    setCurrentStream(null);
    
    // Clear audio element srcObject
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    console.log('✅ VOICE CALL: Cleanup complete');
  };

  // Retry pending audio playback after user gesture (accept button click)
  const retryPendingAudioPlayback = async () => {
    if (pendingAudioPlaybackRef.current && remoteAudioRef.current) {
      console.log('🔄 VOICE CALL: Retrying audio playback after user gesture');
      // Ensure audio element is configured
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.muted = false;
      
      const played = await tryPlayMedia(remoteAudioRef.current);
      if (played) {
        console.log('✅ VOICE CALL: Audio playback succeeded after user gesture');
        pendingAudioPlaybackRef.current = null; // Clear pending playback
      } else {
        console.error('❌ VOICE CALL: Audio playback still failed after user gesture');
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
        // Set event handlers for encrypted WebRTC using stable refs
        webrtcService.current.setEventHandlers({
          onIncomingCall: (call) => {
            if (call.type === 'voice') {
              setCallStatus("ringing");
              setEncryptedCallId(call.callId);
            }
          },
          onCallAccepted: (call) => {
            setCallStatus("connected");
            if (onCallStartRef.current) onCallStartRef.current();
          },
          onCallEnded: (call) => {
            console.log('📞 VOICE CALL: onCallEnded triggered - invoking full cleanup');
            
            // Skip if already ending (handleEndCall already did cleanup)
            if (isEndingRef.current) {
              console.log('📞 VOICE CALL: Already ending, skipping duplicate cleanup');
              return;
            }
            
            // Stop ringtone/ringback if still playing (handled by hooks but ensure cleanup)
            stopRingtone();
            stopRingback();
            
            // CRITICAL: Call full resetLocalState for complete cleanup
            resetLocalState();
            
            setCallStatus("ended");
            if (onCallEndRef.current) onCallEndRef.current();
            
            // Auto-close modal after delay
            setTimeout(() => {
              console.log('📞 VOICE CALL: Auto-closing modal after call ended');
              onClose();
            }, 1500);
          },
          onEncryptionStatusChanged: (encrypted) => {
            // Handle encryption status changes
          },
          onRemoteStream: (stream) => {
            console.log('🔊 VOICE CALL: ========== REMOTE STREAM RECEIVED ==========');
            
            // Validate stream has active audio tracks
            const audioTracks = stream.getAudioTracks();
            console.log('🔊 VOICE CALL: Stream active:', stream.active);
            console.log('🔊 VOICE CALL: Audio tracks:', audioTracks.length, 'tracks');
            audioTracks.forEach((track, index) => {
              console.log(`🔊 VOICE CALL: Audio track ${index}:`, {
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
              });
            });
            
            // Ensure all audio tracks are enabled
            audioTracks.forEach(track => {
              if (!track.enabled) {
                console.log('🔧 VOICE CALL: Enabling disabled audio track');
                track.enabled = true;
              }
            });
            
            // CRITICAL: Attach stream to audio element and play IMMEDIATELY
            const audioEl = remoteAudioRef.current;
            if (audioEl) {
              console.log('🔊 VOICE CALL: Attaching stream to audio element');
              
              // Stop any previous stream
              if (audioEl.srcObject) {
                console.log('🔊 VOICE CALL: Clearing previous srcObject');
              }
              
              // Set the stream source
              audioEl.srcObject = stream;
              
              // CRITICAL: Configure audio element for maximum compatibility
              audioEl.volume = 1.0; // Maximum volume
              audioEl.muted = false; // Ensure not muted
              audioEl.defaultMuted = false;
              
              // AGGRESSIVE MULTI-STRATEGY AUDIO PLAYBACK
              const attemptPlayback = async (attempt: number): Promise<boolean> => {
                console.log(`🔊 VOICE CALL: Playback attempt #${attempt}...`);
                console.log('🔊 VOICE CALL: Audio element state:', {
                  paused: audioEl.paused,
                  muted: audioEl.muted,
                  volume: audioEl.volume,
                  readyState: audioEl.readyState,
                  srcObject: !!audioEl.srcObject,
                  currentTime: audioEl.currentTime
                });
                
                try {
                  // Reset any previous pause state
                  audioEl.load();
                  await audioEl.play();
                  console.log('✅ VOICE CALL: ========== AUDIO PLAYBACK STARTED ==========');
                  return true;
                } catch (err: any) {
                  console.error(`❌ VOICE CALL: Attempt #${attempt} failed:`, err.name, err.message);
                  return false;
                }
              };
              
              // Strategy 1: Immediate play
              attemptPlayback(1).then(async (success) => {
                if (!success) {
                  // Strategy 2: Wait for canplay event
                  audioEl.addEventListener('canplay', async () => {
                    console.log('🔊 VOICE CALL: canplay event fired');
                    const played = await attemptPlayback(2);
                    if (!played) {
                      pendingAudioPlaybackRef.current = stream;
                    }
                  }, { once: true });
                  
                  // Strategy 3: Delayed retry with user gesture flag
                  if (userGestureReceivedRef.current) {
                    setTimeout(() => attemptPlayback(3), 300);
                    setTimeout(() => attemptPlayback(4), 800);
                  }
                  
                  // Strategy 4: Retry on loadedmetadata
                  audioEl.addEventListener('loadedmetadata', () => {
                    console.log('🔊 VOICE CALL: loadedmetadata fired');
                    if (audioEl.paused) {
                      attemptPlayback(5);
                    }
                  }, { once: true });
                }
              });
              
              // Monitor track state changes
              audioTracks.forEach(track => {
                track.onended = () => {
                  console.error('❌ VOICE CALL: Audio track ended!');
                };
                track.onmute = () => {
                  console.warn('🔇 VOICE CALL: Audio track muted');
                };
                track.onunmute = () => {
                  console.log('🔊 VOICE CALL: Audio track unmuted');
                };
              });
              
              // Add error handler
              audioEl.onerror = (err) => {
                console.error('❌ VOICE CALL: Audio element error:', err);
              };
            } else {
              console.error('❌ VOICE CALL: No audio element ref available!');
            }
          }
        });
      }
    }
    
    return () => {
      // Reset ending flag and cleanup on unmount
      isEndingRef.current = false;
      // Don't cleanup global service, just clear reference
      webrtcService.current = null;
    };
  }, [isOpen, user]);
  
  // CRITICAL: Keep ref in sync with current call ID (runs on every render)
  encryptedCallIdRef.current = encryptedCallId;
  
  // CRITICAL: Unmount-only cleanup - release streams when component truly unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 VOICE CALL: Component unmounting - performing full cleanup');
      
      // Stop any active call first
      if (encryptedCallIdRef.current && !isEndingRef.current) {
        console.log('🧹 VOICE CALL: Ending active call on unmount');
        const service = getGlobalWebRTC();
        if (service) {
          service.endCall(encryptedCallIdRef.current);
        }
      }
      
      // CRITICAL: Stop ALL stream tracks using REFS (refs have current values, state doesn't)
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
      
      stopStreamTracks(currentStreamRef.current, 'currentStream');
      stopStreamTracks(incomingStreamRef.current, 'incomingStream');
      
      // Clear refs
      currentStreamRef.current = null;
      incomingStreamRef.current = null;
      pendingAudioPlaybackRef.current = null;
      
      // Clear DOM element srcObject
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      
      console.log('✅ VOICE CALL: Unmount cleanup complete');
    };
  }, []); // Empty array = cleanup only on unmount

  useEffect(() => {
    if (!isOpen) {
      // Stop ringtone when modal closes
      ringtoneService.stopRingtone();
      
      // ALWAYS trigger cleanup when modal closes, regardless of isEndingRef
      // This ensures microphone resources are released even if user just hides modal
      console.log('📞 VOICE CALL: Modal closed, triggering full cleanup');
      resetLocalState();
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      setCallStatus("connected");
      return;
    }

    // Show notification for incoming calls and immediately request microphone permissions
    if (callType === "incoming" && user) {
      const callerName = user.displayName || user.signInName || `@${user.walletAddress?.slice(-6)}` || user.username || "Unknown";
      notificationService.showCallNotification(callerName, 'voice');
      
      // Set the encrypted call ID for incoming calls
      if (incomingCallId) {
        setEncryptedCallId(incomingCallId);
        setCallStatus("connecting"); // Start with connecting while we get permissions
        
        // CRITICAL: Request microphone permissions immediately for incoming calls
        console.log('🎤 INCOMING CALL: Requesting microphone permissions immediately...');
        
        // Start ringtone for incoming call
        ringtoneService.startRingtone()
          .then(() => {
            console.log('🔔 INCOMING CALL: Ringtone started');
          })
          .catch((error) => {
            console.warn('🔔 INCOMING CALL: Ringtone failed to start:', error);
          });
        
        // Request microphone permissions with enhanced error handling
        microphoneService.requestPermissionWithFallback()
          .then((result) => {
            if (result.success && result.stream) {
              console.log('✅ INCOMING CALL: Microphone permissions granted');
              // Store the stream temporarily - we'll use it when user accepts
              incomingStreamRef.current = result.stream;
              setCallStatus("ringing"); // Now we can show ringing state
              
              // Add 30-second auto-timeout for incoming calls
              setTimeout(() => {
                if (callStatus === "ringing") {
                  console.log('📞 INCOMING CALL: Call timeout - no answer after 30 seconds');
                  ringtoneService.stopRingtone();
                  setCallStatus("ended");
                  setTimeout(() => onClose(), 1500);
                }
              }, 30000);
            } else {
              throw new Error(result.error?.message || 'Failed to get microphone access');
            }
          })
          .catch(async (error) => {
            console.error('❌ INCOMING CALL: Microphone permission denied:', error);
            setCallStatus("ended");
            
            // Stop ringtone on error
            ringtoneService.stopRingtone();
            
            // Get detailed error information
            const permissionResult = await microphoneService.requestPermissionWithFallback();
            
            let title = "Call Failed";
            let description = 'Microphone access is required to receive calls.';
            
            if (!permissionResult.success && permissionResult.error) {
              title = permissionResult.error.type === 'permission_denied' ? 'Microphone Access Denied' : 'Call Failed';
              description = permissionResult.error.message;
              
              if (permissionResult.error.userAction) {
                description += `\n\n${permissionResult.error.userAction}`;
              }
            }
            
            import("@/hooks/use-toast").then(({ toast }) => {
              toast({
                title,
                description,
                variant: "destructive",
                duration: 8000, // Longer duration for important error messages
              });
            });
            
            if (onCallEnd) onCallEnd();
          });
      }
    }

    // Initiate encrypted WebRTC call for outgoing calls (only once)
    // CRITICAL: Request microphone permission IMMEDIATELY when outgoing call starts
    if (callType === "outgoing" && webrtcService.current && user && !encryptedCallId && isOpen) {
      // Force reset and set the flag
      if (callInitiatedRef.current) {
        callInitiatedRef.current = false;
      }
      
      if (!callInitiatedRef.current) {
        callInitiatedRef.current = true; // Prevent multiple calls
        console.log('📞 OUTGOING CALL: ✅ Starting call initiation with immediate microphone permission request');
        
        setCallStatus("connecting");
        
        // IMMEDIATELY request microphone permission before initiating call
        console.log('🎤 OUTGOING CALL: Requesting microphone permission immediately...');
        microphoneService.requestPermissionWithFallback()
          .then((permissionResult) => {
            if (permissionResult.success) {
              console.log('✅ OUTGOING CALL: Microphone permission granted');
              // Store the stream for later use
              if (permissionResult.stream) {
                incomingStreamRef.current = permissionResult.stream;
              }
            } else {
              console.warn('⚠️ OUTGOING CALL: Microphone permission request failed, will retry during call');
            }
          })
          .catch((err) => {
            console.warn('⚠️ OUTGOING CALL: Microphone permission error:', err);
          });
        
        const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
        if (currentUser.id) {
        // Wait for WebRTC service to be fully initialized
        webrtcService.current.initialize(currentUser.id.toString())
          .then(() => {
            if (webrtcService.current) {
              return webrtcService.current.initiateCall(user.id.toString(), 'voice');
            }
            throw new Error('WebRTC service not available');
          })
          .then((callId) => {
            console.log('📞 OUTGOING CALL: Call initiated successfully, ID:', callId);
            setEncryptedCallId(callId);
            setCallStatus("ringing");
            
            // Add timeout to automatically end call if no response after 30 seconds
            setTimeout(() => {
              if (callStatus === "ringing") {
                console.log('📞 OUTGOING CALL: Call timeout - no response after 30 seconds');
                setCallStatus("ended");
                setTimeout(() => onClose(), 1500);
              }
            }, 30000);
          })
          .catch((error) => {
            console.error('📞 DEEP TEST: ❌ Call initiation failed:', error);
            
            // CRITICAL FIX: Reset the call initiated ref on error
            callInitiatedRef.current = false;
            
            setCallStatus("ended");
            
            // Show user-friendly error messages
            let errorMessage = 'Failed to start call';
            if (error.message.includes('Microphone access denied')) {
              errorMessage = 'Microphone access denied. Please allow microphone permissions in your browser settings and try again.';
            } else if (error.message.includes('No microphone found')) {
              errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.message.includes('already in use')) {
              errorMessage = 'Microphone is already in use by another application. Please close other apps using the microphone and try again.';
            }
            
            // Show toast notification
            import("@/hooks/use-toast").then(({ toast }) => {
              toast({
                title: "Call Failed",
                description: errorMessage,
                variant: "destructive",
              });
            });
            
            if (onCallEnd) onCallEnd();
          });
        } else {
          console.error('📞 DEEP TEST: ❌ No current user found');
          callInitiatedRef.current = false;
          setCallStatus("ended");
          if (onCallEnd) onCallEnd();
        }
      }
    } else if (callType === "incoming") {
      // For incoming calls, set to ringing immediately
      setCallStatus("ringing");
    }
  }, [isOpen, isCallActive, onCallStart, callType, user?.id]); // Fixed dependencies to prevent infinite loops

  // CRITICAL: Separate useEffect to handle incomingCallId timing
  // This ensures encryptedCallId is set even if incomingCallId arrives after modal opens
  useEffect(() => {
    if (callType === "incoming" && incomingCallId && !encryptedCallId) {
      console.log('🎙️ VOICE: Setting encryptedCallId from incomingCallId:', incomingCallId);
      setEncryptedCallId(incomingCallId);
    }
  }, [callType, incomingCallId, encryptedCallId]);

  // Note: Timer is now handled by useCallTimer hook

  const handleAcceptCall = async () => {
    console.log('🎯 ACCEPT BUTTON CLICKED');
    console.log('🆔 Encrypted Call ID:', encryptedCallId);
    console.log('🔧 WebRTC Service Available:', !!webrtcService.current);
    console.log('🎙️ Call Status:', callStatus);
    console.log('🔧 Call Type:', callType);
    console.log('👤 User:', user);
    
    if (encryptedCallId && webrtcService.current) {
      try {
        console.log('📞 INCOMING CALL: Starting accept call process...');
        setCallStatus("connecting");
        
        // Stop ringtone when call is accepted
        ringtoneService.stopRingtone();
        
        // Check if we already have the media stream from the incoming call preparation
        const tempStream = incomingStreamRef.current;
        if (tempStream) {
          console.log('✅ ACCEPT: Using pre-authorized microphone stream');
          // Clean up the temporary reference
          incomingStreamRef.current = null;
        }
        
        // Mark that user has made a gesture (clicked accept button)
        userGestureReceivedRef.current = true;
        console.log('👆 VOICE ACCEPT: User gesture received (button click)');
        
        console.log('📞 ACCEPT: Calling webrtcService.acceptCall with:', encryptedCallId);
        await webrtcService.current.acceptCall(encryptedCallId);
        console.log('✅ ACCEPT: Call accepted successfully');
        
        // Retry any pending audio playback (autoplay might have been blocked)
        // Note: If remote stream hasn't arrived yet, retry will happen when stream arrives and checks userGestureReceivedRef
        await retryPendingAudioPlayback();
        
        setCallStatus("connected");
        if (onCallStart) onCallStart();
      } catch (error: any) {
        console.error('❌ ACCEPT: Failed to accept call:', error);
        setCallStatus("ended");
        
        // Get detailed error information for better user guidance
        const permissionResult = await microphoneService.requestPermissionWithFallback();
        
        let title = "Call Failed";
        let description = 'Failed to accept call';
        
        if (!permissionResult.success && permissionResult.error) {
          title = permissionResult.error.type === 'permission_denied' ? 'Microphone Access Required' : 'Call Failed';
          description = permissionResult.error.message;
          
          if (permissionResult.error.userAction) {
            description += `\n\n${permissionResult.error.userAction}`;
          }
        } else if (error.message) {
          description = error.message;
        }
        
        // Show toast notification
        import("@/hooks/use-toast").then(({ toast }) => {
          toast({
            title,
            description,
            variant: "destructive",
            duration: 8000, // Longer duration for important error messages
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

  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      try {
        // Toggle speaker/earpiece output
        if (typeof (remoteAudioRef.current as any).setSinkId === 'function') {
          // Use setSinkId if available (Chrome/Edge)
          (remoteAudioRef.current as any).setSinkId(isSpeakerOn ? 'default' : 'speaker');
        } else {
          // Fallback: adjust volume
          remoteAudioRef.current.volume = isSpeakerOn ? 0.7 : 1.0;
        }
      } catch (error) {
        console.log('Speaker toggle not supported on this device');
      }
    }
    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleEndCall = () => {
    // Stop ringtone when call is ended/rejected
    ringtoneService.stopRingtone();
    
    // Mark as ending to prevent duplicate callbacks
    isEndingRef.current = true;
    
    if (encryptedCallId && webrtcService.current) {
      webrtcService.current.endCall(encryptedCallId);
    }
    
    // CRITICAL: Use centralized cleanup - handles all streams, refs, and state
    console.log('📞 VOICE CALL: handleEndCall - invoking resetLocalState');
    resetLocalState();
    
    setCallStatus("ended");
    if (onCallEnd) onCallEnd();
    
    setTimeout(() => {
      onClose();
      isEndingRef.current = false; // Reset for next call
    }, 1000);
  };
  
  const handleCloseModal = () => {
    // If call is active, just hide the modal without ending the call
    if (isCallActive && callStatus === "connected") {
      if (onHide) onHide();
    } else {
      // If call is not active or not connected, trigger exit animation then end call
      setAnimationType('exit');
      setIsAnimating(true);
      
      setTimeout(() => {
        handleEndCall();
        setIsAnimating(false);
      }, 200);
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
    const modalWidth = 400; // Approximate modal width
    const minVisibleWidth = 100;
    const maxX = window.innerWidth - minVisibleWidth;
    const minX = -(modalWidth - minVisibleWidth);
    
    // Allow modal to go beyond top and bottom borders but keep at least 100px visible
    const modalHeight = 500; // Approximate modal height
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
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce animation-delay-500"></span>
            </span>
          </span>
        );
      case "ringing":
        return callType === "incoming" ? (
          <span className="flex items-center justify-center gap-1">
            Incoming call
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse animation-delay-300"></span>
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse animation-delay-600"></span>
            </span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            Ringing
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce animation-delay-500"></span>
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
        return "text-yellow-400";
      case "ringing":
        return "text-blue-400";
      case "connected":
        return "text-green-400";
      case "ended":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent 
        ref={dragRef}
        className={`w-[90vw] max-w-sm bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 p-0 text-center rounded-3xl shadow-2xl select-none touch-manipulation ${
          isAnimating 
            ? animationType === 'enter' 
              ? 'animate-modal-enter' 
              : 'animate-modal-exit'
            : ''
        }`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none',
          margin: 0,
          touchAction: 'none'
        }}
      >
        <DialogTitle className="sr-only">Voice Call with {user.displayName}</DialogTitle>

        <div className="p-8 space-y-8">
          {/* User Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className={`w-32 h-32 border-4 border-white/20 shadow-xl ${
                callStatus === "connecting" || callStatus === "ringing" ? "animate-loading-pulse" : ""
              }`}>
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="bg-slate-700 text-4xl">
                  <UserAvatarIcon className="w-16 h-16 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              
              {/* Animated loading rings for connecting state */}
              {callStatus === "connecting" && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-400/40 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-400/60 animate-pulse animation-delay-200"></div>
                  <div className="absolute inset-[-8px] rounded-full border-2 border-yellow-400/20 animate-spin animation-delay-500"></div>
                </>
              )}
              
              {/* Pulsing ring for ringing state */}
              {callStatus === "ringing" && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-400/60 animate-pulse"></div>
                  <div className="absolute inset-[-8px] rounded-full border-2 border-blue-400/40 animate-ping"></div>
                </>
              )}
              
              {/* Connected state animation */}
              {callStatus === "connected" && (
                <div className="absolute inset-0 rounded-full border-4 border-green-400/60 animate-pulse"></div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
            <div className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>

          {/* Call Controls - Using Modular Components */}
          {callStatus !== "ended" && (
            <>
              {/* Active Call Controls - When connected */}
              {callStatus === "connected" && (
                <ActiveCallControls
                  onEndCall={handleEndCall}
                  onToggleMute={handleToggleMute}
                  onToggleSpeaker={handleToggleSpeaker}
                  onSwitchToVideo={onSwitchToVideo ? () => {
                    if (onCallEnd) onCallEnd();
                    onSwitchToVideo();
                    onClose();
                  } : undefined}
                  isMuted={isMuted}
                  isSpeakerOn={isSpeakerOn}
                  callType="voice"
                />
              )}

              {/* Connecting/Outgoing Call Controls */}
              {callStatus !== "connected" && !(callType === "incoming" && callStatus === "ringing") && (
                <ConnectingCallControls onEndCall={handleEndCall} />
              )}

              {/* Incoming Call Controls - Answer/Decline */}
              {callType === "incoming" && callStatus === "ringing" && (
                <IncomingCallControls
                  onAnswer={handleAcceptCall}
                  onDecline={handleEndCall}
                  callType="voice"
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
      
    </Dialog>
      
    {/* Hidden audio element for remote stream - OUTSIDE Dialog for portal compatibility */}
    {/* CRITICAL: Using visibility:hidden instead of off-screen positioning for better browser compatibility */}
    <audio 
      ref={remoteAudioRef} 
      autoPlay 
      playsInline
      data-testid="voice-call-remote-audio"
      style={{ 
        position: 'absolute',
        width: '1px',
        height: '1px',
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
    />
    </>
  );
}