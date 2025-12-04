// Ringtone service for handling incoming call audio notifications
// Implements the three-layer approach: Backend Signaling → Frontend Ringing → Browser API Persistence

class RingtoneService {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private pendingRingtone = false;
  private userGestureReceived = false;

  constructor() {
    this.setupVisibilityListener();
    this.setupUserGestureDetection();
  }

  // Browser API Layer: Listen for visibility changes
  private setupVisibilityListener() {
    this.visibilityHandler = () => {
      if (!document.hidden && this.pendingRingtone) {
        console.log('🔔 RINGTONE: Tab became visible, resuming ringtone');
        this.resumeRingtone();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // Detect user gesture to unlock audio playback
  private setupUserGestureDetection() {
    const gestureHandler = () => {
      if (!this.userGestureReceived) {
        this.userGestureReceived = true;
        console.log('🔔 RINGTONE: User gesture detected, audio unlocked');
        
        // Try to resume any pending ringtone
        if (this.pendingRingtone && !this.isPlaying) {
          this.resumeRingtone();
        }
      }
    };

    // Listen for various user interactions
    ['click', 'touchstart', 'keydown'].forEach(event => {
      document.addEventListener(event, gestureHandler, { once: false, passive: true });
    });
  }

  private async resumeRingtone() {
    if (this.pendingRingtone && !this.isPlaying) {
      this.pendingRingtone = false;
      await this.startWebAudioRingtone();
    }
  }

  // Start the ringtone with proper error handling
  async startRingtone(): Promise<void> {
    if (this.isPlaying) {
      console.log('🔔 RINGTONE: Already playing');
      return;
    }

    console.log('🔔 RINGTONE: Starting incoming call ringtone...');
    console.log('🔔 RINGTONE: Tab hidden:', document.hidden);
    console.log('🔔 RINGTONE: User gesture received:', this.userGestureReceived);

    // If tab is hidden, set pending flag for when it becomes visible
    if (document.hidden) {
      console.log('🔔 RINGTONE: Tab is hidden, setting pending flag');
      this.pendingRingtone = true;
      
      // Try to start anyway (may work in some browsers)
      try {
        await this.startWebAudioRingtone();
      } catch (error) {
        console.warn('🔔 RINGTONE: Cannot start in background, will resume when visible');
      }
      return;
    }

    // Start the ringtone
    try {
      await this.startWebAudioRingtone();
    } catch (error) {
      console.error('🔔 RINGTONE: Failed to start:', error);
      
      // Set pending flag to try again after user gesture
      if (!this.userGestureReceived) {
        this.pendingRingtone = true;
        console.log('🔔 RINGTONE: Waiting for user gesture to unlock audio');
      }
    }
  }

  private async startWebAudioRingtone(): Promise<void> {
    try {
      // Create or resume audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume if suspended (common on mobile/after tab backgrounding)
      if (this.audioContext.state === 'suspended') {
        console.log('🔔 RINGTONE: Resuming suspended audio context');
        await this.audioContext.resume();
      }

      // Create audio nodes
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.isPlaying = true;
      this.pendingRingtone = false;

      // Start the ringtone pattern
      this.playRingtonePattern();

      console.log('✅ RINGTONE: Started successfully');
    } catch (error) {
      console.error('❌ RINGTONE: Web Audio API failed:', error);
      throw error;
    }
  }

  private playRingtonePattern() {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;

    // Classic phone ring pattern: two bursts of 440Hz + 480Hz, then silence
    // Pattern: ring (0.4s) - silence (0.2s) - ring (0.4s) - silence (2s)
    const playRingBurst = (startTime: number, duration: number) => {
      if (!this.audioContext || !this.gainNode || !this.isPlaying) return;

      // Create two oscillators for dual-tone ring
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Classic phone ring frequencies (US standard: 440Hz + 480Hz)
      osc1.frequency.setValueAtTime(440, startTime);
      osc2.frequency.setValueAtTime(480, startTime);

      // Create individual gain nodes for mixing
      const gain1 = this.audioContext.createGain();
      const gain2 = this.audioContext.createGain();
      
      gain1.gain.setValueAtTime(0.3, startTime);
      gain2.gain.setValueAtTime(0.3, startTime);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(this.gainNode);
      gain2.connect(this.gainNode);

      // Ramp up
      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      
      // Hold
      this.gainNode.gain.setValueAtTime(0.5, startTime + duration - 0.02);
      
      // Ramp down
      this.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const scheduleRingCycle = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const now = this.audioContext.currentTime;

      // First burst
      playRingBurst(now, 0.4);
      
      // Second burst after 0.2s silence
      playRingBurst(now + 0.6, 0.4);

      // Schedule next cycle after 3 seconds total
      this.ringtoneInterval = setTimeout(() => {
        scheduleRingCycle();
      }, 3000);
    };

    // Start the ringtone cycle
    scheduleRingCycle();
  }

  stopRingtone() {
    console.log('🔇 RINGTONE: Stopping...');

    this.isPlaying = false;
    this.pendingRingtone = false;

    // Clear the interval
    if (this.ringtoneInterval) {
      clearTimeout(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }

    // Fade out and stop
    if (this.gainNode && this.audioContext) {
      try {
        const now = this.audioContext.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
      } catch (error) {
        console.warn('🔔 RINGTONE: Error during fade out:', error);
      }
    }

    // Clean up oscillator
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (error) {
        // Ignore - oscillator may already be stopped
      }
      this.oscillator = null;
    }

    // Close audio context after a brief delay
    setTimeout(() => {
      if (this.audioContext && !this.isPlaying) {
        try {
          this.audioContext.close();
        } catch (error) {
          // Ignore
        }
        this.audioContext = null;
        this.gainNode = null;
      }
    }, 200);

    console.log('✅ RINGTONE: Stopped');
  }

  isRingtonePlaying(): boolean {
    return this.isPlaying;
  }

  isPending(): boolean {
    return this.pendingRingtone;
  }

  // Clean up listeners when service is destroyed
  destroy() {
    this.stopRingtone();
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}

// Create singleton instance
export const ringtoneService = new RingtoneService();
