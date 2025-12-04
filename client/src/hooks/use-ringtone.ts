import { useEffect, useRef, useCallback, useState } from "react";
import { ringtoneService } from "@/lib/ringtone-service";

type CallStatus = 'connecting' | 'ringing' | 'connected' | 'ended';
type CallType = 'incoming' | 'outgoing';

/**
 * useRingtone Hook (Legacy)
 * Manages ringtone playback for incoming calls using audio file
 * Handles browser autoplay restrictions and cleanup
 */
export function useRingtone(src: string, loop: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.loop = loop;
    audioRef.current.volume = 0.7;

    return () => {
      stop();
    };
  }, [src, loop]);

  const play = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        console.log('[ringtone] Playing:', src);
      }
    } catch (err) {
      console.warn('[ringtone] Autoplay blocked. Will start on user gesture.', err);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      console.log('[ringtone] Stopped');
    }
  };

  return { play, stop };
}

const DEFAULT_MAX_RING_DURATION = 45000;

interface UseCallRingtoneOptions {
  callStatus: CallStatus;
  callType: CallType;
  isOpen: boolean;
  maxDuration?: number;
  onMaxDurationReached?: () => void;
}

interface UseCallRingtoneReturn {
  isPlaying: boolean;
  isPending: boolean;
  startRingtone: () => Promise<void>;
  stopRingtone: () => void;
  retryRingtone: () => Promise<void>;
}

export function useCallRingtone({
  callStatus,
  callType,
  isOpen,
  maxDuration = DEFAULT_MAX_RING_DURATION,
  onMaxDurationReached
}: UseCallRingtoneOptions): UseCallRingtoneReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopRingtone = useCallback(() => {
    console.log('🔔 useCallRingtone: Stopping ringtone');
    clearMaxDurationTimer();
    ringtoneService.stopRingtone();
    setIsPlaying(false);
    setIsPending(false);
    hasStartedRef.current = false;
  }, [clearMaxDurationTimer]);

  const startRingtone = useCallback(async () => {
    if (hasStartedRef.current || ringtoneService.isRingtonePlaying()) {
      console.log('🔔 useCallRingtone: Ringtone already started or playing');
      return;
    }

    console.log('🔔 useCallRingtone: Starting ringtone');
    hasStartedRef.current = true;

    try {
      await ringtoneService.startRingtone();
      setIsPlaying(ringtoneService.isRingtonePlaying());
      setIsPending(ringtoneService.isPending());

      clearMaxDurationTimer();
      maxDurationTimerRef.current = setTimeout(() => {
        console.log('🔔 useCallRingtone: Max duration reached, stopping ringtone');
        stopRingtone();
        onMaxDurationReached?.();
      }, maxDuration);

    } catch (error) {
      console.error('🔔 useCallRingtone: Failed to start ringtone:', error);
      setIsPending(ringtoneService.isPending());
    }
  }, [maxDuration, onMaxDurationReached, stopRingtone, clearMaxDurationTimer]);

  const retryRingtone = useCallback(async () => {
    if (isPending && !isPlaying) {
      console.log('🔔 useCallRingtone: Retrying pending ringtone');
      hasStartedRef.current = false;
      await startRingtone();
    }
  }, [isPending, isPlaying, startRingtone]);

  useEffect(() => {
    const shouldPlayRingtone = isOpen && callStatus === 'ringing' && callType === 'incoming';

    if (shouldPlayRingtone && !hasStartedRef.current) {
      startRingtone();
    } else if (!shouldPlayRingtone && (isPlaying || hasStartedRef.current)) {
      stopRingtone();
    }
  }, [isOpen, callStatus, callType, startRingtone, stopRingtone, isPlaying]);

  useEffect(() => {
    return () => {
      clearMaxDurationTimer();
      if (hasStartedRef.current) {
        ringtoneService.stopRingtone();
      }
    };
  }, [clearMaxDurationTimer]);

  useEffect(() => {
    const checkStatus = () => {
      setIsPlaying(ringtoneService.isRingtonePlaying());
      setIsPending(ringtoneService.isPending());
    };

    const interval = setInterval(checkStatus, 500);
    return () => clearInterval(interval);
  }, []);

  return {
    isPlaying,
    isPending,
    startRingtone,
    stopRingtone,
    retryRingtone
  };
}

class RingbackService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private ringbackInterval: NodeJS.Timeout | null = null;

  async startRingback(): Promise<void> {
    if (this.isPlaying) {
      console.log('📞 RINGBACK: Already playing');
      return;
    }

    console.log('📞 RINGBACK: Starting outgoing call ringback tone...');

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.isPlaying = true;
      this.playRingbackPattern();

      console.log('✅ RINGBACK: Started successfully');
    } catch (error) {
      console.error('❌ RINGBACK: Failed to start:', error);
    }
  }

  private playRingbackPattern() {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;

    const playTone = (startTime: number, duration: number) => {
      if (!this.audioContext || !this.gainNode || !this.isPlaying) return;

      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, startTime);

      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(0.15, startTime);

      osc.connect(gain);
      gain.connect(this.gainNode);

      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      this.gainNode.gain.setValueAtTime(0.25, startTime + duration - 0.02);
      this.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const scheduleRingbackCycle = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const now = this.audioContext.currentTime;
      playTone(now, 2);

      this.ringbackInterval = setTimeout(() => {
        scheduleRingbackCycle();
      }, 6000);
    };

    scheduleRingbackCycle();
  }

  stopRingback() {
    console.log('📞 RINGBACK: Stopping...');

    this.isPlaying = false;

    if (this.ringbackInterval) {
      clearTimeout(this.ringbackInterval);
      this.ringbackInterval = null;
    }

    if (this.gainNode && this.audioContext) {
      try {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
      } catch (error) {
        console.warn('📞 RINGBACK: Error during fade out:', error);
      }
    }

    setTimeout(() => {
      if (this.audioContext && !this.isPlaying) {
        try {
          this.audioContext.close();
        } catch (error) {
        }
        this.audioContext = null;
        this.gainNode = null;
      }
    }, 200);

    console.log('✅ RINGBACK: Stopped');
  }

  isRingbackPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ringbackService = new RingbackService();

interface UseRingbackOptions {
  callStatus: CallStatus;
  callType: CallType;
  isOpen: boolean;
}

export function useRingback({
  callStatus,
  callType,
  isOpen
}: UseRingbackOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const hasStartedRef = useRef(false);

  const startRingback = useCallback(async () => {
    if (hasStartedRef.current || ringbackService.isRingbackPlaying()) {
      return;
    }

    hasStartedRef.current = true;
    await ringbackService.startRingback();
    setIsPlaying(true);
  }, []);

  const stopRingback = useCallback(() => {
    ringbackService.stopRingback();
    setIsPlaying(false);
    hasStartedRef.current = false;
  }, []);

  useEffect(() => {
    const shouldPlayRingback = isOpen && 
      (callStatus === 'connecting' || callStatus === 'ringing') && 
      callType === 'outgoing';

    if (shouldPlayRingback && !hasStartedRef.current) {
      startRingback();
    } else if (!shouldPlayRingback && (isPlaying || hasStartedRef.current)) {
      stopRingback();
    }
  }, [isOpen, callStatus, callType, startRingback, stopRingback, isPlaying]);

  useEffect(() => {
    return () => {
      if (hasStartedRef.current) {
        ringbackService.stopRingback();
      }
    };
  }, []);

  return {
    isPlaying,
    startRingback,
    stopRingback
  };
}
