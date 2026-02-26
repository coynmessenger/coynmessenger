import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, SwitchCamera } from 'lucide-react';

export type CallStatus = 'connecting' | 'ringing' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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

  return {
    duration,
    formattedDuration: formatCallDuration(duration),
    reset
  };
}

interface CallTimerDisplayProps {
  duration: number;
  className?: string;
}

export function CallTimerDisplay({ duration, className = '' }: CallTimerDisplayProps) {
  return (
    <div className={`font-mono text-lg font-semibold tabular-nums ${className}`} data-testid="call-timer">
      {formatCallDuration(duration)}
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
    <div className={`flex justify-center items-end gap-12 ${className}`} data-testid="incoming-call-controls">
      <button
        onClick={() => {
          console.log(`🔴 DECLINE ${callType.toUpperCase()} CALL`);
          onDecline();
        }}
        disabled={isLoading}
        title="Decline Call"
        data-testid="button-decline-call"
        className="flex flex-col items-center gap-1.5 group disabled:opacity-50"
      >
        <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-red-500/40">
          <PhoneOff className="h-7 w-7 text-white" />
        </div>
        <span className="text-xs text-gray-400 group-hover:text-gray-300 font-medium">Decline</span>
      </button>
      
      <button
        onClick={() => {
          console.log(`🎯 ANSWER ${callType.toUpperCase()} CALL`);
          onAnswer();
        }}
        disabled={isLoading}
        title={callType === 'video' ? "Answer Video Call" : "Answer Call"}
        data-testid="button-answer-call"
        className="flex flex-col items-center gap-1.5 group disabled:opacity-50"
      >
        <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-green-500/40">
          {callType === 'video' ? (
            <Video className="h-7 w-7 text-white" />
          ) : (
            <Phone className="h-7 w-7 text-white" />
          )}
        </div>
        <span className="text-xs text-gray-400 group-hover:text-gray-300 font-medium">Accept</span>
      </button>
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
  const ControlBtn = ({ onClick, active, activeColor, icon, label, testId, danger = false }: {
    onClick: () => void;
    active?: boolean;
    activeColor?: string;
    icon: ReactNode;
    label: string;
    testId: string;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={isLoading}
      data-testid={testId}
      title={label}
      className={`flex flex-col items-center gap-1.5 group disabled:opacity-50`}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg ${
        danger
          ? "bg-red-500 hover:bg-red-400 shadow-red-500/30 text-white"
          : active
          ? `${activeColor} shadow-lg`
          : "bg-white/10 hover:bg-white/20 text-white"
      }`}>
        {icon}
      </div>
      <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors font-medium">
        {label}
      </span>
    </button>
  );

  if (callType === 'voice') {
    return (
      <div className={`space-y-4 ${className}`} data-testid="active-call-controls">
        {/* Top row: mute, speaker, video */}
        <div className="flex justify-center items-end gap-6">
          <ControlBtn
            onClick={onToggleMute}
            active={isMuted}
            activeColor="bg-red-500/80 hover:bg-red-400/80 text-white shadow-red-500/30"
            icon={isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            label={isMuted ? "Unmuted" : "Mute"}
            testId="button-toggle-mute"
          />
          {onToggleSpeaker && (
            <ControlBtn
              onClick={onToggleSpeaker}
              active={isSpeakerOn}
              activeColor="bg-blue-500/80 hover:bg-blue-400/80 text-white shadow-blue-500/30"
              icon={isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              label="Speaker"
              testId="button-toggle-speaker"
            />
          )}
          {onSwitchToVideo && (
            <ControlBtn
              onClick={onSwitchToVideo}
              icon={<Video className="h-6 w-6" />}
              label="Video"
              testId="button-switch-to-video"
            />
          )}
        </div>
        {/* End call — large centered */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onEndCall}
            disabled={isLoading}
            data-testid="button-end-call"
            title="End call"
            className="flex flex-col items-center gap-1.5 group disabled:opacity-50"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-red-500/40">
              <PhoneOff className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs text-gray-400 group-hover:text-gray-300 font-medium">End</span>
          </button>
        </div>
      </div>
    );
  }

  // Video call layout (compact row)
  return (
    <div className={`flex justify-center items-end gap-4 ${className}`} data-testid="active-call-controls">
      <ControlBtn
        onClick={onToggleMute}
        active={isMuted}
        activeColor="bg-red-500/80 hover:bg-red-400/80 text-white shadow-red-500/30"
        icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        label={isMuted ? "Unmuted" : "Mute"}
        testId="button-toggle-mute"
      />
      {onToggleVideo && (
        <ControlBtn
          onClick={onToggleVideo}
          active={isVideoOff}
          activeColor="bg-red-500/80 hover:bg-red-400/80 text-white shadow-red-500/30"
          icon={isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          label={isVideoOff ? "Cam Off" : "Camera"}
          testId="button-toggle-video"
        />
      )}
      {onSwitchCamera && (
        <ControlBtn
          onClick={onSwitchCamera}
          icon={<SwitchCamera className="h-5 w-5" />}
          label="Flip"
          testId="button-switch-camera"
        />
      )}
      <ControlBtn
        onClick={onEndCall}
        danger
        icon={<PhoneOff className="h-5 w-5" />}
        label="End"
        testId="button-end-call"
      />
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
      <button
        onClick={onEndCall}
        disabled={isLoading}
        data-testid="button-cancel-call"
        title="Cancel call"
        className="flex flex-col items-center gap-1.5 group disabled:opacity-50"
      >
        <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl shadow-red-500/40">
          <PhoneOff className="h-7 w-7 text-white" />
        </div>
        <span className="text-xs text-gray-400 group-hover:text-gray-300 font-medium">Cancel</span>
      </button>
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
