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
  user?: User;
  callType?: "incoming" | "outgoing";
  onSwitchToVideo?: () => void;
}

export default function VoiceCallModal({ isOpen, onClose, user, callType = "outgoing", onSwitchToVideo }: VoiceCallModalProps) {
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

  // Center modal when it opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      const centerX = (window.innerWidth - 400) / 2; // 400 is approximate modal width
      const centerY = (window.innerHeight - 500) / 2; // 500 is approximate modal height
      setPosition({
        x: Math.max(0, centerX),
        y: Math.max(0, centerY)
      });
      setIsInitialized(true);
    } else if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized]);

  useEffect(() => {
    if (!isOpen) {
      setCallStatus("connecting");
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(false);
      return;
    }

    const timer1 = setTimeout(() => {
      setCallStatus("ringing");
    }, 1000);

    const timer2 = setTimeout(() => {
      setCallStatus("connected");
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

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
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    
    // Allow modal to go beyond side borders but keep at least 100px visible
    const modalWidth = 400; // Approximate modal width
    const minVisibleWidth = 100;
    const maxX = window.innerWidth - minVisibleWidth;
    const minX = -(modalWidth - minVisibleWidth);
    
    // Keep full modal visible vertically
    const maxY = window.innerHeight - 500; // Approximate modal height
    
    setPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return "Connecting...";
      case "ringing":
        return callType === "incoming" ? "Incoming call" : "Ringing...";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={dragRef}
        className="w-[90vw] max-w-sm bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 p-0 text-center rounded-3xl shadow-2xl select-none"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none',
          margin: 0
        }}
      >
        <DialogTitle className="sr-only">Voice Call with {user.displayName}</DialogTitle>
        
        {/* Draggable Header */}
        <div 
          className="flex items-center justify-center p-4 cursor-grab active:cursor-grabbing rounded-t-3xl bg-slate-800/50 border-b border-slate-700/50"
          onMouseDown={handleMouseDown}
        >
          <Move className="h-4 w-4 text-slate-400" />
        </div>

        <div className="p-8 space-y-8">
          {/* User Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white/20 shadow-xl">
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="bg-slate-700 text-4xl">
                  <UserAvatarIcon className="w-16 h-16 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              {callStatus === "connected" && (
                <div className="absolute inset-0 rounded-full border-4 border-green-400/60 animate-pulse"></div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">{user.displayName}</h2>
            <p className={`text-lg font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
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
                onClick={() => setCallStatus("connected")}
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