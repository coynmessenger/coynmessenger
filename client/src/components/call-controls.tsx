import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, SwitchCamera } from 'lucide-react';

export type CallStatus = 'connecting' | 'ringing' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

export function useCallTimer(isActive: boolean) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive]);

  const reset = useCallback(() => {
    setDuration(0);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    duration,
    formattedDuration: formatDuration(duration),
    reset
  };
}

interface CallTimerDisplayProps {
  duration: number;
  className?: string;
}

export function CallTimerDisplay({ duration, className = '' }: CallTimerDisplayProps) {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`font-mono text-lg font-semibold tabular-nums ${className}`} data-testid="call-timer">
      {formatDuration(duration)}
    </div>
  );
}

interface CallStatusIndicatorProps {
  status: CallStatus;
  callType?: CallType;
  duration?: number;
  className?: string;
}

export function CallStatusIndicator({ status, callType = 'voice', duration = 0, className = '' }: CallStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return 'text-yellow-400';
      case 'ringing':
        return 'text-orange-400';
      case 'connected':
        return 'text-green-400';
      case 'ended':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getIndicatorColor = () => {
    switch (status) {
      case 'connecting':
        return 'bg-yellow-400';
      case 'ringing':
        return 'bg-orange-400';
      case 'connected':
        return 'bg-green-400';
      case 'ended':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return (
          <span className="flex items-center gap-1">
            Connecting
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </span>
          </span>
        );
      case 'ringing':
        return (
          <span className="flex items-center gap-1">
            {callType === 'video' ? 'Incoming Video Call' : 'Incoming Call'}
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping"></span>
            </span>
          </span>
        );
      case 'connected':
        return <CallTimerDisplay duration={duration} className="text-green-400" />;
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="call-status-indicator">
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()} ${status !== 'ended' ? 'animate-pulse' : ''}`}></div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
    </div>
  );
}

interface IncomingCallControlsProps {
  onAnswer: () => void;
  onDecline: () => void;
  callType?: CallType;
  isLoading?: boolean;
  className?: string;
}

export function IncomingCallControls({ 
  onAnswer, 
  onDecline, 
  callType = 'voice',
  isLoading = false,
  className = '' 
}: IncomingCallControlsProps) {
  return (
    <div className={`flex justify-center items-center gap-8 ${className}`} data-testid="incoming-call-controls">
      <Button
        onClick={() => {
          console.log(`🔴 DECLINE ${callType.toUpperCase()} CALL`);
          onDecline();
        }}
        disabled={isLoading}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-red-400 disabled:opacity-50 disabled:hover:scale-100"
        title="Decline Call"
        data-testid="button-decline-call"
      >
        <PhoneOff className="h-8 w-8 sm:h-10 sm:w-10" />
      </Button>
      
      <Button
        onClick={() => {
          console.log(`🎯 ANSWER ${callType.toUpperCase()} CALL`);
          onAnswer();
        }}
        disabled={isLoading}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-green-400 disabled:opacity-50 disabled:hover:scale-100"
        title={callType === 'video' ? "Answer Video Call" : "Answer Call"}
        data-testid="button-answer-call"
      >
        {callType === 'video' ? (
          <Video className="h-8 w-8 sm:h-10 sm:w-10" />
        ) : (
          <Phone className="h-8 w-8 sm:h-10 sm:w-10" />
        )}
      </Button>
    </div>
  );
}

interface ActiveCallControlsProps {
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo?: () => void;
  onToggleSpeaker?: () => void;
  onSwitchCamera?: () => void;
  onSwitchToVideo?: () => void;
  isMuted: boolean;
  isVideoOff?: boolean;
  isSpeakerOn?: boolean;
  callType: CallType;
  isLoading?: boolean;
  className?: string;
}

export function ActiveCallControls({
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onSwitchToVideo,
  isMuted,
  isVideoOff = false,
  isSpeakerOn = false,
  callType,
  isLoading = false,
  className = ''
}: ActiveCallControlsProps) {
  return (
    <div className={`flex justify-center items-center gap-3 ${className}`} data-testid="active-call-controls">
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleMute}
        disabled={isLoading}
        className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
          isMuted 
            ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/20" 
            : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
        data-testid="button-toggle-mute"
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      {callType === 'voice' && onToggleSpeaker && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSpeaker}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
            isSpeakerOn 
              ? "bg-blue-500/20 border-blue-400 text-blue-400 hover:bg-blue-500/30 shadow-lg shadow-blue-500/20" 
              : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
          }`}
          title={isSpeakerOn ? "Turn off speaker" : "Turn on speaker"}
          data-testid="button-toggle-speaker"
        >
          {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      )}

      {callType === 'video' && onToggleVideo && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleVideo}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
            isVideoOff 
              ? "bg-red-500/20 border-red-400 text-red-400 hover:bg-red-500/30 shadow-lg shadow-red-500/20" 
              : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
          }`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          data-testid="button-toggle-video"
        >
          {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
      )}

      {callType === 'video' && onSwitchCamera && (
        <Button
          variant="outline"
          size="icon"
          onClick={onSwitchCamera}
          disabled={isLoading}
          className="w-12 h-12 rounded-full border-2 transition-all duration-200 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500"
          title="Switch camera"
          data-testid="button-switch-camera"
        >
          <SwitchCamera className="h-5 w-5" />
        </Button>
      )}

      {callType === 'voice' && onSwitchToVideo && (
        <Button
          variant="outline"
          size="icon"
          onClick={onSwitchToVideo}
          disabled={isLoading}
          className="w-12 h-12 rounded-full border-2 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-green-500/30 hover:border-green-400 hover:text-green-400 transition-all duration-200"
          title="Switch to video call"
          data-testid="button-switch-to-video"
        >
          <Video className="h-5 w-5" />
        </Button>
      )}

      <Button
        onClick={onEndCall}
        disabled={isLoading}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30"
        title="End call"
        data-testid="button-end-call"
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}

interface ConnectingCallControlsProps {
  onEndCall: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ConnectingCallControls({ onEndCall, isLoading = false, className = '' }: ConnectingCallControlsProps) {
  return (
    <div className={`flex justify-center ${className}`} data-testid="connecting-call-controls">
      <Button
        onClick={onEndCall}
        disabled={isLoading}
        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
        title="Cancel call"
        data-testid="button-cancel-call"
      >
        <PhoneOff className="h-6 w-6" />
      </Button>
    </div>
  );
}

interface CallerInfoProps {
  displayName: string;
  avatarUrl?: string;
  callType: CallType;
  status: CallStatus;
  className?: string;
}

export function CallerInfo({ displayName, avatarUrl, callType, status, className = '' }: CallerInfoProps) {
  const getCallTypeLabel = () => {
    if (status === 'ringing') {
      return callType === 'video' ? 'Video Call' : 'Voice Call';
    }
    return null;
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} data-testid="caller-info">
      <div className="relative">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {status === 'ringing' && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center animate-pulse">
            {callType === 'video' ? (
              <Video className="h-3 w-3 text-white" />
            ) : (
              <Phone className="h-3 w-3 text-white" />
            )}
          </div>
        )}
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">{displayName}</h2>
        {getCallTypeLabel() && (
          <p className="text-sm text-gray-400 mt-1">{getCallTypeLabel()}</p>
        )}
      </div>
    </div>
  );
}
