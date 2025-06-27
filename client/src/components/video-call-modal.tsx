import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, VideoOff, Mic, MicOff, Phone } from "lucide-react";

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

  useEffect(() => {
    if (isOpen && callStatus === 'connecting') {
      onCallStart?.();
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
      <DialogContent className="w-[95vw] max-w-2xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {recipientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold">{recipientName}</h3>
              <p className="text-sm text-gray-500">{getStatusText()}</p>
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            {isVideoOn ? (
              <>
                <Video className="h-16 w-16 mx-auto mb-4" />
                <p>Video call with {recipientName}</p>
              </>
            ) : (
              <>
                <VideoOff className="h-16 w-16 mx-auto mb-4" />
                <p>Camera is off</p>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t">
          <div className="flex justify-center gap-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={() => setIsMuted(!isMuted)}
              className="rounded-full w-12 h-12"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoOn ? "secondary" : "destructive"}
              size="lg"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="rounded-full w-12 h-12"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndCall}
              className="rounded-full w-12 h-12"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}