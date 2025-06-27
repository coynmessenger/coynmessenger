import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, Monitor, Phone, Maximize2, Minimize2 } from "lucide-react";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallEnd: () => void;
  recipientName: string;
  onCallStart?: () => void;
}

export default function VideoCallModal({ 
  isOpen, 
  onClose, 
  onCallEnd, 
  recipientName,
  onCallStart 
}: VideoCallModalProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (isOpen && callStatus === 'connecting') {
      onCallStart?.();
      
      // Simulate call progression
      setTimeout(() => setCallStatus('ringing'), 1000);
      setTimeout(() => setCallStatus('connected'), 3000);
    }
  }, [isOpen, callStatus, onCallStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleEndCall = () => {
    setCallStatus('connecting');
    setCallDuration(0);
    onCallEnd();
    onClose();
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'connected': return formatDuration(callDuration);
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`
          glass-card border-orange-500/20 
          ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none m-0' : 'w-[95vw] max-w-4xl h-[95vh]'}
          ${isMinimized ? 'h-20 w-80' : ''}
          flex flex-col
        `}
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Video Call Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {recipientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-white">{recipientName}</h3>
              <p className="text-sm text-gray-400">{getStatusText()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMinimize}
              className="text-gray-400 hover:text-white"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFullscreen}
              className="text-gray-400 hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Video Area */}
            <div className="flex-1 relative bg-gray-900 rounded-lg m-4">
              {callStatus === 'connected' ? (
                <div className="h-full flex items-center justify-center">
                  {isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Video className="h-16 w-16 mx-auto mb-4" />
                        <p>Video call with {recipientName}</p>
                        {isScreenSharing && (
                          <Badge className="mt-2 bg-green-500/20 text-green-400">
                            Screen Sharing
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <VideoOff className="h-16 w-16 mx-auto mb-4" />
                      <p>Camera is off</p>
                    </div>
                  )}
                  
                  {/* Self preview window */}
                  <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                      You
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-4">
                      {recipientName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-lg">{getStatusText()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="p-4 border-t border-orange-500/20">
              <div className="flex justify-center gap-4">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  onClick={handleToggleMute}
                  className="rounded-full w-12 h-12"
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>

                <Button
                  variant={isVideoOn ? "secondary" : "destructive"}
                  size="lg"
                  onClick={handleToggleVideo}
                  className="rounded-full w-12 h-12"
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="lg"
                  onClick={handleToggleScreenShare}
                  className="rounded-full w-12 h-12"
                >
                  <Monitor className="h-5 w-5" />
                </Button>

                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleEndCall}
                  className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}