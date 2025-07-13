import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, Move } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { EncryptedWebRTCService } from "@/lib/encrypted-webrtc";
import { getGlobalWebRTC } from "@/lib/global-webrtc";
import { notificationService } from "@/lib/notification-service";
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
  isCallActive = false 
}: VoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [encryptedCallId, setEncryptedCallId] = useState<string | null>(null);
  
  // WebRTC service instance
  const webrtcService = useRef<EncryptedWebRTCService | null>(null);
  
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
            if (call.type === 'voice') {
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
        setIsSpeakerOn(false);
        setEncryptedCallId(null);
      }
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      setCallStatus("connected");
      return;
    }

    // Show notification for incoming calls
    if (callType === "incoming" && user) {
      const callerName = user.displayName || user.signInName || `@${user.walletAddress?.slice(-6)}` || user.username || "Unknown";
      notificationService.showCallNotification(callerName, 'voice');
    }

    // Initiate encrypted WebRTC call for outgoing calls
    if (callType === "outgoing" && webrtcService.current && user) {
      setCallStatus("connecting");
      
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
            setEncryptedCallId(callId);
            setCallStatus("ringing");
          })
          .catch((error) => {
            console.error('Failed to initiate voice call:', error);
            setCallStatus("ended");
            if (onCallEnd) onCallEnd();
          });
      } else {
        console.error('Current user not found');
        setCallStatus("ended");
        if (onCallEnd) onCallEnd();
      }
    } else if (callType === "incoming") {
      // For incoming calls, set to ringing immediately
      setCallStatus("ringing");
    }
  }, [isOpen, isCallActive, onCallStart]);

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
    if (encryptedCallId && webrtcService.current) {
      try {
        await webrtcService.current.acceptCall(encryptedCallId);
        setCallStatus("connected");
        if (onCallStart) onCallStart();
      } catch (error) {
        setCallStatus("ended");
        if (onCallEnd) onCallEnd();
      }
    }
  };

  const handleEndCall = () => {
    if (encryptedCallId && webrtcService.current) {
      webrtcService.current.endCall(encryptedCallId);
    }
    setCallStatus("ended");
    if (onCallEnd) onCallEnd();
    setTimeout(() => {
      onClose();
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

          {/* Call Controls */}
          {callStatus !== "ended" && (
            <div className="flex justify-center">
              {callStatus === "connected" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Top Row */}
                  {/* Mute Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-14 h-14 rounded-full border-2 transition-all duration-300 ${
                      isMuted 
                        ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>

                  {/* Video Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (onSwitchToVideo) {
                        // End voice call first
                        if (onCallEnd) {
                          onCallEnd();
                        }
                        // Then switch to video
                        onSwitchToVideo();
                        onClose(); // Close voice call modal
                      }
                    }}
                    className="w-14 h-14 rounded-full border-2 transition-all duration-300 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-green-500/30 hover:border-green-400 hover:text-green-400"
                    title="Switch to video call"
                  >
                    <Video className="h-6 w-6" />
                  </Button>

                  {/* Bottom Row */}
                  {/* Speaker Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`w-14 h-14 rounded-full border-2 transition-all duration-300 ${
                      isSpeakerOn 
                        ? "bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </Button>

                  {/* End Call Button */}
                  <Button
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </div>
              )}

              {/* Single End Call Button for non-connected states */}
              {callStatus !== "connected" && (
                <Button
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              )}
            </div>
          )}

          {/* Incoming Call Actions */}
          {callType === "incoming" && callStatus === "ringing" && (
            <div className="flex justify-center space-x-8">
              <Button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
              >
                <PhoneOff className="h-8 w-8" />
              </Button>
              <Button
                onClick={handleAcceptCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
              >
                <Phone className="h-8 w-8" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}