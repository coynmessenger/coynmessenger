// Ringtone service for handling incoming call audio notifications
// Uses HTML Audio element with MP3 file for standard phone ringtone

import ringtoneAudio from "@assets/office-phone-ring-6248_1765060348162.mp3";

class RingtoneService {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private visibilityHandler: (() => void) | null = null;
  private pendingRingtone = false;
  private userGestureReceived = false;

  constructor() {
    this.setupVisibilityListener();
    this.setupUserGestureDetection();
    this.preloadAudio();
  }

  private preloadAudio() {
    try {
      this.audioElement = new Audio(ringtoneAudio);
      this.audioElement.loop = true;
      this.audioElement.volume = 1.0;
      this.audioElement.preload = 'auto';
      console.log('🔔 RINGTONE: Audio file preloaded:', ringtoneAudio);
    } catch (error) {
      console.error('🔔 RINGTONE: Failed to preload audio:', error);
    }
  }

  private setupVisibilityListener() {
    this.visibilityHandler = () => {
      if (!document.hidden && this.pendingRingtone) {
        console.log('🔔 RINGTONE: Tab became visible, resuming ringtone');
        this.resumeRingtone();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupUserGestureDetection() {
    const gestureHandler = () => {
      if (!this.userGestureReceived) {
        this.userGestureReceived = true;
        console.log('🔔 RINGTONE: User gesture detected, audio unlocked');
        
        if (this.pendingRingtone && !this.isPlaying) {
          this.resumeRingtone();
        }
      }
    };

    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, gestureHandler, { once: false, passive: true });
    });
  }

  private async resumeRingtone() {
    if (this.pendingRingtone && !this.isPlaying) {
      console.log('🔔 RINGTONE: Resuming pending ringtone');
      this.pendingRingtone = false;
      await this.playAudio();
    }
  }

  async retryPendingRingtone(): Promise<boolean> {
    if (this.pendingRingtone && !this.isPlaying) {
      console.log('🔔 RINGTONE: Retrying pending ringtone on user gesture');
      try {
        await this.resumeRingtone();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.warn('🔔 RINGTONE: Retry failed:', error);
        return false;
      }
    }
    return this.isPlaying;
  }

  async startRingtone(): Promise<void> {
    if (this.isPlaying) {
      console.log('🔔 RINGTONE: Already playing');
      return;
    }

    console.log('🔔 RINGTONE: Starting incoming call ringtone...');
    console.log('🔔 RINGTONE: Tab hidden:', document.hidden);
    console.log('🔔 RINGTONE: User gesture received:', this.userGestureReceived);

    if (document.hidden) {
      console.log('🔔 RINGTONE: Tab is hidden, setting pending flag');
      this.pendingRingtone = true;
      
      try {
        await this.playAudio();
      } catch (error) {
        console.warn('🔔 RINGTONE: Cannot start in background, will resume when visible');
      }
      return;
    }

    try {
      await this.playAudio();
    } catch (error) {
      console.error('🔔 RINGTONE: Failed to start:', error);
      
      if (!this.userGestureReceived) {
        this.pendingRingtone = true;
        console.log('🔔 RINGTONE: Waiting for user gesture to unlock audio');
      }
    }
  }

  private async playAudio(): Promise<void> {
    try {
      if (!this.audioElement) {
        this.audioElement = new Audio(ringtoneAudio);
        this.audioElement.loop = true;
        this.audioElement.volume = 1.0;
      }

      this.audioElement.currentTime = 0;
      
      if ('setSinkId' in this.audioElement) {
        try {
          await (this.audioElement as any).setSinkId('default');
          console.log('🔔 RINGTONE: Audio routed to default speaker');
        } catch (sinkError) {
          console.warn('🔔 RINGTONE: setSinkId not supported');
        }
      }

      console.log('🔔 RINGTONE: Attempting to play audio file...');
      
      const playPromise = this.audioElement.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        this.isPlaying = true;
        this.pendingRingtone = false;
        console.log('✅ RINGTONE: Playing office phone ring!');
      }
    } catch (error) {
      console.error('❌ RINGTONE: Playback failed:', error);
      this.pendingRingtone = true;
      throw error;
    }
  }

  stopRingtone() {
    console.log('🔇 RINGTONE: Stopping...');

    this.isPlaying = false;
    this.pendingRingtone = false;

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (error) {
        console.warn('🔔 RINGTONE: Error stopping audio:', error);
      }
    }

    console.log('✅ RINGTONE: Stopped');
  }

  isRingtonePlaying(): boolean {
    return this.isPlaying;
  }

  isPending(): boolean {
    return this.pendingRingtone;
  }

  async testRingtone(durationMs: number = 5000): Promise<void> {
    console.log('🔔 RINGTONE TEST: Starting test for', durationMs, 'ms');
    
    try {
      this.userGestureReceived = true;
      
      await this.startRingtone();
      
      if (this.isPlaying) {
        console.log('✅ RINGTONE TEST: Ringtone is playing!');
        
        setTimeout(() => {
          console.log('🔔 RINGTONE TEST: Test complete, stopping');
          this.stopRingtone();
        }, durationMs);
      } else {
        console.log('❌ RINGTONE TEST: Ringtone did not start');
      }
    } catch (error) {
      console.error('❌ RINGTONE TEST: Failed:', error);
    }
  }

  destroy() {
    this.stopRingtone();
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.audioElement) {
      this.audioElement.src = '';
      this.audioElement = null;
    }
  }
}

export const ringtoneService = new RingtoneService();

if (typeof window !== 'undefined') {
  (window as any).testRingtone = (durationMs?: number) => ringtoneService.testRingtone(durationMs);
  console.log('🔔 RINGTONE: Test available - run window.testRingtone() or testRingtone() in console');
}
