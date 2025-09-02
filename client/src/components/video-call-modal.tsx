import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Move, SwitchCamera } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { EncryptedWebRTCService } from "@/lib/encrypted-webrtc";
import { getGlobalWebRTC } from "@/lib/global-webrtc";
import { notificationService } from "@/lib/notification-service";
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
  
  const [callDuration, setCallDuration] = useState(0);
  
  // WebRTC service instance
  const webrtcService = useRef<EncryptedWebRTCService | null>(null);
  
  // Prevent multiple call initiations
  const callInitiatedRef = useRef(false);
  
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
            if (onCallStart) onCallStart();
          },
          onCallEnded: (call) => {
            setCallStatus("ended");
            if (onCallEnd) onCallEnd();
          },
          onEncryptionStatusChanged: (encrypted) => {
            // Handle encryption status changes
          }
        });
      }
    }
    
    return () => {
      // Don't cleanup global service, just clear reference
      webrtcService.current = null;
    };
  }, [isOpen, user, onCallStart, onCallEnd]);

  useEffect(() => {
    if (!isOpen) {
      // Only reset if call is not active (completely ending the call)
      if (!isCallActive) {
        setCallStatus("connecting");
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        setEncryptedCallId(null);
        callInitiatedRef.current = false; // Reset call initiation flag
        console.log('📹 VIDEO CALL: ✅ Call initiation flag reset on modal close');
      }
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      setCallStatus("connected");
      return;
    }

    // Initiate encrypted WebRTC video call for outgoing calls (only once)
    if (callType === "outgoing" && webrtcService.current && user && !encryptedCallId && !callInitiatedRef.current) {
      callInitiatedRef.current = true; // Prevent multiple calls
      setCallStatus("connecting");
      
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
      // For incoming calls, set to ringing immediately
      setCallStatus("ringing");
      
      // Show notification for incoming video calls
      if (user) {
        const callerName = user.displayName || user.signInName || `@${user.walletAddress?.slice(-6)}` || user.username || "Unknown";
        notificationService.showCallNotification(callerName, 'video');
      }
      
      // Set the encrypted call ID for incoming calls
      if (incomingCallId) {

        setEncryptedCallId(incomingCallId);
      }
    }
  }, [isOpen, isCallActive, onCallStart]); // Removed incomingCallId to prevent multiple calls

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    console.log('🎯 VIDEO ACCEPT BUTTON CLICKED');
    console.log('🆔 Encrypted Call ID:', encryptedCallId);
    console.log('🔧 WebRTC Service Available:', !!webrtcService.current);
    
    if (encryptedCallId && webrtcService.current) {
      try {
        console.log('📞 VIDEO ACCEPT: Calling webrtcService.acceptCall with:', encryptedCallId);
        await webrtcService.current.acceptCall(encryptedCallId);
        console.log('✅ VIDEO ACCEPT: Call accepted successfully');
        setCallStatus("connected");
        if (onCallStart) onCallStart();
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
    if (encryptedCallId && webrtcService.current) {
      webrtcService.current.endCall(encryptedCallId);
    }
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
    }, 1200); // 1000ms for status display + 200ms for exit animation
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
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce animation-delay-500"></span>
            </span>
          </span>
        );
      case "ringing":
        return callType === "incoming" ? (
          <span className="flex items-center justify-center gap-1">
            Incoming video call
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
        return formatDuration(callDuration);
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (callStatus === "connected") {
          // If call is connected, hide instead of closing
          handleHideCall();
        } else {
          // If not connected, trigger exit animation then close
          setAnimationType('exit');
          setIsAnimating(true);
          
          setTimeout(() => {
            onClose();
            setIsAnimating(false);
          }, 200);
        }
      }
    }}>
      <DialogContent 
        ref={dragRef}
        className={`w-[95vw] max-w-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 p-0 rounded-3xl shadow-2xl overflow-hidden select-none touch-manipulation ${
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
        <DialogTitle className="sr-only">Video Call with {user.displayName}</DialogTitle>
        
        {/* Video Area - Always shows the other person (Chris) */}
        <div className="relative aspect-video bg-slate-800">
          {/* Loading overlay for connecting/ringing states */}
          {(callStatus === "connecting" || callStatus === "ringing") && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce animation-delay-200"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce animation-delay-500"></div>
              </div>
            </div>
          )}
          
          {callStatus === "connected" ? (
            // Other person's video feed (Chris)
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="bg-slate-700 text-2xl">
                    <UserAvatarIcon className="w-12 h-12 text-slate-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-white/60 text-sm">{user.displayName}</div>
              </div>
            </div>
          ) : (
            // Connecting/Ringing state - show other person's avatar with animations
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="relative">
                  <Avatar className={`w-32 h-32 mx-auto border-4 border-white/20 shadow-xl ${
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
                </div>
                
                {/* Status text with animated dots */}
                <div className={`text-lg font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </div>
              </div>
            </div>
          )}

          {/* Self view (small preview) - YOUR camera */}
          {callStatus === "connected" && !isSelfViewExpanded && (
            <div 
              className="absolute top-4 right-4 w-32 h-24 bg-slate-700 rounded-lg border-2 border-white/20 overflow-hidden cursor-pointer hover:border-white/40 transition-all duration-300 hover:scale-105"
              onClick={() => setIsSelfViewExpanded(true)}
              title="Click to expand your view"
            >
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                {isVideoOff ? (
                  <div className="text-center">
                    <div className="text-white/40 text-xs">You</div>
                    <div className="text-red-400/80 text-xs mt-1">Camera off</div>
                  </div>
                ) : (
                  <div className="text-white/40 text-xs">You</div>
                )}
              </div>
            </div>
          )}

          {/* Expanded self view (full screen) - YOUR camera */}
          {callStatus === "connected" && isSelfViewExpanded && (
            <div 
              className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center cursor-pointer z-20"
              onClick={() => setIsSelfViewExpanded(false)}
              title="Click to return to normal view"
            >
              <div className="text-center space-y-4">
                <div className="text-white text-2xl font-medium">Your Camera</div>
                {isVideoOff ? (
                  <div className="text-red-400 text-lg">Camera is off</div>
                ) : (
                  <div className="text-green-400 text-lg">Camera is on</div>
                )}
                <div className="text-white/60 text-sm">Click anywhere to return</div>
              </div>
              
              {/* Small other user preview in corner when expanded */}
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 rounded-lg border-2 border-white/20 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <Avatar className="w-12 h-12 border-2 border-white/20">
                    <AvatarImage src={user.profilePicture || ""} />
                    <AvatarFallback className="bg-slate-700 text-xs">
                      <UserAvatarIcon className="w-6 h-6 text-slate-400" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                callStatus === "connected" ? "bg-green-400" : "bg-yellow-400"
              } animate-pulse`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* User Info & Controls */}
        <div className="p-6 space-y-6">
          {/* User Name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
          </div>

          {/* Call Controls */}
          {callStatus !== "ended" && (
            <div className="flex justify-center space-x-3">
              {callStatus === "connected" && (
                <>
                  {/* Mute Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleMute}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                      isMuted 
                        ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/20" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {/* Video Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleToggleVideo}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                      isVideoOff 
                        ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/20" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
                    }`}
                    title={isVideoOff ? "Turn on your camera" : "Turn off your camera"}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>

                  {/* Camera Switch Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSwitchCamera}
                    className="w-12 h-12 rounded-full border-2 transition-all duration-200 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
                    title="Switch camera"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* End Call Button */}
              <Button
                onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Incoming Call Actions */}
          {callType === "incoming" && callStatus === "ringing" && (
            <div className="flex justify-center space-x-8">
              <Button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
                title="Decline"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button
                onClick={handleAcceptCall}
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
                title="Accept video call"
              >
                <Video className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}