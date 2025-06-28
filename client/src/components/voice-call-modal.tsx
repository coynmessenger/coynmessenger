import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, Move } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
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
  // Early return if no user is provided
  if (!user) {
    return null;
  }
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Floating controls state
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [gestureStart, setGestureStart] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const gestureRef = useRef<HTMLDivElement>(null);

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

  // Center modal when it opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      centerModal();
      setIsInitialized(true);
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

  // Gesture handlers for floating controls
  const handleGestureStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isDragging) return; // Don't interfere with dragging
    
    setIsGesturing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setGestureStart({ x: clientX, y: clientY });
  };

  const handleGestureMove = (e: TouchEvent | MouseEvent) => {
    if (!isGesturing || isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - gestureStart.x;
    const deltaY = clientY - gestureStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Show floating controls on upward swipe (> 50px)
    if (deltaY < -50 && Math.abs(deltaX) < 50 && distance > 50) {
      setShowFloatingControls(true);
      setIsGesturing(false);
    }
    // Hide floating controls on downward swipe
    else if (deltaY > 50 && Math.abs(deltaX) < 50 && distance > 50) {
      setShowFloatingControls(false);
      setIsGesturing(false);
    }
  };

  const handleGestureEnd = () => {
    setIsGesturing(false);
  };

  // Add gesture event listeners
  useEffect(() => {
    if (isGesturing && !isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleGestureMove(e);
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleGestureMove(e);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleGestureEnd);
      document.addEventListener('touchend', handleGestureEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleGestureEnd);
        document.removeEventListener('touchend', handleGestureEnd);
      };
    }
  }, [isGesturing, isDragging]);

  useEffect(() => {
    if (!isOpen) {
      // Only reset if call is not active (completely ending the call)
      if (!isCallActive) {
        setCallStatus("connecting");
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeakerOn(false);
      }
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      setCallStatus("connected");
      return;
    }

    const timer1 = setTimeout(() => {
      setCallStatus("ringing");
    }, 1000);

    const timer2 = setTimeout(() => {
      setCallStatus("connected");
      if (onCallStart) onCallStart();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
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

  const handleEndCall = () => {
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
      // If call is not active or not connected, end the call normally
      handleEndCall();
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

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent 
        ref={dragRef}
        className="w-[90vw] max-w-sm bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 p-0 text-center rounded-3xl shadow-2xl select-none touch-manipulation"
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

        <div 
          className="p-8 space-y-8"
          onMouseDown={handleGestureStart}
          onTouchStart={handleGestureStart}
          ref={gestureRef}
        >
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

          {/* Gesture Hint */}
          {callStatus === "connected" && !showFloatingControls && (
            <div className="text-center">
              <p className="text-slate-400 text-sm animate-pulse">
                Swipe up for controls
              </p>
            </div>
          )}

          {/* Single End Call Button for non-connected states */}
          {callStatus !== "ended" && callStatus !== "connected" && callType !== "incoming" && (
            <div className="flex justify-center">
              <Button
                onClick={handleEndCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
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
                onClick={() => setCallStatus("connected")}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-110"
              >
                <Phone className="h-8 w-8" />
              </Button>
            </div>
          )}
        </div>

        {/* Floating Call Controls */}
        {callStatus === "connected" && showFloatingControls && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl animate-slide-up">
              <div className="grid grid-cols-4 gap-3">
                {/* Mute Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    isMuted 
                      ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30" 
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  }`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                {/* Video Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (onSwitchToVideo) {
                      onSwitchToVideo();
                      onClose();
                    }
                  }}
                  className="w-12 h-12 rounded-full border-2 transition-all duration-300 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-green-500/30 hover:border-green-400 hover:text-green-400"
                  title="Switch to video call"
                >
                  <Video className="h-5 w-5" />
                </Button>

                {/* Speaker Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    isSpeakerOn 
                      ? "bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30" 
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>

                {/* End Call Button */}
                <Button
                  onClick={handleEndCall}
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Hide Controls Hint */}
              <div className="text-center mt-2">
                <p className="text-slate-400 text-xs">Swipe down to hide</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}