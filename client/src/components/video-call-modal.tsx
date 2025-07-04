import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Move, Palette, X } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
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
}

export default function VideoCallModal({ isOpen, onClose, onHide, onCallStart, onCallEnd, user, callType = "outgoing", isCallActive = false }: VideoCallModalProps) {
  
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSelfViewExpanded, setIsSelfViewExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Artistic filters available
  const artisticFilters = [
    { id: 'none', name: 'None', icon: '🎨', description: 'No filter' },
    { id: 'picasso', name: 'Picasso', icon: '🎭', description: 'Cubist art style' },
    { id: 'vangogh', name: 'Van Gogh', icon: '🌻', description: 'Swirling brushstrokes' },
    { id: 'basquiat', name: 'Basquiat', icon: '👑', description: 'Neo-expressionist style' },
    { id: 'monet', name: 'Monet', icon: '🌊', description: 'Impressionist painting' },
    { id: 'warhol', name: 'Warhol', icon: '🎨', description: 'Pop art style' },
    { id: 'kandinsky', name: 'Kandinsky', icon: '🔺', description: 'Abstract expressionism' }
  ];

  // Request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setMediaStream(stream);
      setHasMediaPermission(true);
      
      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setHasMediaPermission(false);
      return null;
    }
  };

  // Apply artistic filter to video feed
  const applyArtisticFilter = (filter: string) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply filter effects
    switch (filter) {
      case 'picasso':
        // Cubist effect with geometric shapes
        ctx.filter = 'contrast(150%) saturate(80%) hue-rotate(15deg)';
        ctx.globalCompositeOperation = 'multiply';
        break;
      case 'vangogh':
        // Swirling brushstroke effect
        ctx.filter = 'contrast(120%) saturate(150%) blur(0.5px)';
        ctx.globalCompositeOperation = 'overlay';
        break;
      case 'basquiat':
        // Neo-expressionist high contrast
        ctx.filter = 'contrast(200%) saturate(120%) brightness(110%)';
        ctx.globalCompositeOperation = 'hard-light';
        break;
      case 'monet':
        // Impressionist soft focus
        ctx.filter = 'blur(1px) saturate(130%) brightness(105%)';
        ctx.globalCompositeOperation = 'soft-light';
        break;
      case 'warhol':
        // Pop art high contrast colors
        ctx.filter = 'contrast(180%) saturate(200%) hue-rotate(45deg)';
        ctx.globalCompositeOperation = 'color-dodge';
        break;
      case 'kandinsky':
        // Abstract expressionism
        ctx.filter = 'contrast(140%) saturate(160%) hue-rotate(30deg)';
        ctx.globalCompositeOperation = 'difference';
        break;
      default:
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
    }
  };

  // Toggle artistic filter
  const toggleFilter = (filterId: string) => {
    setActiveFilter(activeFilter === filterId ? null : filterId);
    if (filterId !== 'none') {
      applyArtisticFilter(filterId);
    }
  };
  
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

  useEffect(() => {
    console.log('VideoCallModal: Effect triggered', { isOpen, isCallActive, callStatus, user: user?.displayName });
    
    if (!isOpen) {
      // Only reset if call is not active (completely ending the call)
      if (!isCallActive) {
        console.log('VideoCallModal: Resetting call state (modal closed, call not active)');
        setCallStatus("connecting");
        setCallDuration(0);
        setIsMuted(false);
        setIsVideoOff(false);
        
      }
      return;
    }

    // If rejoining an active call, go directly to connected state
    if (isCallActive) {
      console.log('VideoCallModal: Rejoining active call or transferred from voice');
      setCallStatus("connected");
      // Request media access for active calls
      requestMediaAccess();
      return;
    }

    // Otherwise, go through normal connection process
    console.log('VideoCallModal: Starting new call sequence');
    const timer1 = setTimeout(() => {
      console.log('VideoCallModal: Call status -> ringing');
      setCallStatus("ringing");
    }, 1000);

    const timer2 = setTimeout(() => {
      console.log('VideoCallModal: Call status -> connected, calling onCallStart');
      setCallStatus("connected");
      // Request camera and microphone access when call connects
      requestMediaAccess();
      if (onCallStart) {
        onCallStart();
      }
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
    console.log('VideoCallModal: No user provided, modal will not render');
    return null;
  }
  
  console.log('VideoCallModal: Rendering with user:', user.displayName, 'isOpen:', isOpen);

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
            // Other person's video feed 
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative">
              {/* Hidden video element for user's camera */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="hidden"
              />
              
              {/* Canvas for applying artistic filters */}
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Mock remote user video - showing other person */}
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
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center relative">
                {isVideoOff ? (
                  <div className="text-center">
                    <div className="text-white/40 text-xs">You</div>
                    <div className="text-red-400/80 text-xs mt-1">Camera off</div>
                  </div>
                ) : hasMediaPermission ? (
                  <div className="relative w-full h-full">
                    {/* Show canvas with filter or direct video */}
                    {activeFilter && activeFilter !== 'none' ? (
                      <canvas
                        className="w-full h-full object-cover rounded"
                        style={{ transform: 'scaleX(-1)' }} // Mirror effect
                      />
                    ) : (
                      <video
                        className="w-full h-full object-cover rounded"
                        style={{ transform: 'scaleX(-1)' }} // Mirror effect
                        autoPlay
                        muted
                        playsInline
                      />
                    )}
                    {activeFilter && activeFilter !== 'none' && (
                      <div className="absolute bottom-1 left-1 bg-black/50 px-1 py-0.5 rounded text-xs text-white">
                        {artisticFilters.find(f => f.id === activeFilter)?.icon}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-white/40 text-xs">You</div>
                    <div className="text-orange-400/80 text-xs mt-1">Camera starting...</div>
                  </div>
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
            <div className="flex justify-center space-x-4">
              {callStatus === "connected" && (
                <>
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
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {/* Video Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      isVideoOff 
                        ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                    }`}
                    title={isVideoOff ? "Turn on your camera" : "Turn off your camera"}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>

                  {/* Artistic Filters Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      showFilters || activeFilter
                        ? "bg-orange-500/20 border-orange-400 text-orange-400 hover:bg-orange-500/30" 
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                    }`}
                    title="Artistic Filters"
                  >
                    <Palette className="h-5 w-5" />
                  </Button>
                </>
              )}

              {/* End Call Button */}
              <Button
                onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
                title="End call"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Artistic Filters Panel */}
          {showFilters && callStatus === "connected" && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Palette className="h-5 w-5 text-orange-400" />
                  Artistic Filters
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {artisticFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    variant="outline"
                    onClick={() => toggleFilter(filter.id)}
                    className={`flex flex-col items-center p-3 h-auto border-2 transition-all duration-300 ${
                      activeFilter === filter.id
                        ? "bg-orange-500/20 border-orange-400 text-orange-400"
                        : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
                    }`}
                    title={filter.description}
                  >
                    <span className="text-xl mb-1">{filter.icon}</span>
                    <span className="text-xs font-medium">{filter.name}</span>
                  </Button>
                ))}
              </div>
              
              {activeFilter && (
                <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-medium">Active Filter:</span>
                    <span className="text-white">
                      {artisticFilters.find(f => f.id === activeFilter)?.name}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1">
                    {artisticFilters.find(f => f.id === activeFilter)?.description}
                  </p>
                </div>
              )}
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
                onClick={() => setCallStatus("connected")}
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