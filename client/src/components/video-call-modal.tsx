import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Move } from "lucide-react";
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
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
  const [callDuration, setCallDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setMediaStream(stream);
      setHasMediaPermission(true);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setHasMediaPermission(false);
      return null;
    }
  };

  // Stop media stream
  const stopMediaStream = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setHasMediaPermission(false);
  };

  // Toggle mute
  const toggleMute = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Handle end call
  const handleEndCall = () => {
    stopMediaStream();
    setCallStatus("ended");
    if (onCallEnd) onCallEnd();
    onClose();
  };

  // Handle minimize call
  const handleMinimizeCall = () => {
    if (onHide) onHide();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
    };
  }, []);

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
    const modalHeight = Math.min(viewportHeight * 0.95, 600); // Approximate height
    
    const x = (viewportWidth - modalWidth) / 2;
    const y = (viewportHeight - modalHeight) / 2;
    
    setPosition({ x, y });
  };

  // Initialize position when modal opens
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
        setIsSelfViewExpanded(false);
        stopMediaStream();
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
      if (onCallStart) onCallStart();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, isCallActive, callStatus, user?.displayName]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    // Boundary constraints
    const maxX = window.innerWidth - 672; // max-w-2xl
    const maxY = window.innerHeight - 600; // approximate height
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse move and mouse up listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      const maxX = window.innerWidth - 672;
      const maxY = window.innerHeight - 600;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Don't render if no user
  if (!user) {
    console.log('VideoCallModal: No user provided, modal will not render');
    return null;
  }

  console.log('VideoCallModal: Rendering with user:', user.displayName, 'isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 border-0 bg-transparent shadow-none max-w-none w-auto h-auto"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none',
          zIndex: 100
        }}
      >
        <DialogTitle className="sr-only">
          Video Call with {user.displayName}
        </DialogTitle>
        
        <div 
          ref={dragRef}
          className={`
            relative w-[95vw] sm:w-[600px] h-[70vh] sm:h-[400px] 
            bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
            rounded-2xl shadow-2xl border border-slate-700
            overflow-hidden cursor-move select-none
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            ${isAnimating ? (animationType === 'enter' ? 'animate-scale-in' : 'animate-scale-out') : ''}
          `}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Drag Handle */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-12 h-1 bg-slate-500 rounded-full cursor-grab active:cursor-grabbing" />
          </div>

          {/* Video Area */}
          <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden">
            {/* Main Video (Remote User) */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              {callStatus === "connected" ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white">
                  <Avatar className="w-24 h-24 mb-4">
                    <AvatarImage src={user.profilePicture ?? undefined} alt={user.displayName} />
                    <AvatarFallback>
                      <UserAvatarIcon className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold mb-2">{user.displayName}</h3>
                  <p className="text-slate-300 capitalize">{callStatus}...</p>
                </div>
              )}
            </div>

            {/* Self View (Picture-in-Picture) */}
            {callStatus === "connected" && (
              <div 
                className={`absolute ${isSelfViewExpanded ? 'inset-0' : 'top-4 right-4 w-32 h-24'} 
                  bg-slate-800 rounded-lg border-2 border-slate-600 overflow-hidden cursor-pointer
                  transition-all duration-300 ${isSelfViewExpanded ? 'z-20' : 'z-10'}`}
                onClick={() => setIsSelfViewExpanded(!isSelfViewExpanded)}
              >
                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                  <div className="text-white text-sm">You</div>
                </div>
              </div>
            )}

            {/* Call Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex justify-center items-center space-x-4">
                {/* Mute Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white border-0`}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                {/* Video Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-12 h-12 rounded-full ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} text-white border-0`}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>

                {/* End Call Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>

                {/* Minimize Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white border-0"
                  onClick={handleMinimizeCall}
                >
                  <Move className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Call Duration */}
            {callStatus === "connected" && (
              <div className="absolute top-4 left-4 bg-black/50 rounded-lg px-3 py-1">
                <span className="text-white text-sm font-mono">
                  {formatDuration(callDuration)}
                </span>
              </div>
            )}

            {/* Call Status */}
            {callStatus !== "connected" && (
              <div className="absolute top-4 left-4 bg-black/50 rounded-lg px-3 py-1">
                <span className="text-white text-sm capitalize">
                  {callStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}