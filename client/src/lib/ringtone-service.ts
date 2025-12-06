// Ringtone service for handling incoming call audio notifications
// Uses HTML Audio element with speaker routing for maximum compatibility

class RingtoneService {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
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
      console.log('🔔 RINGTONE: Resuming pending ringtone');
      this.pendingRingtone = false;
      await this.startWebAudioRingtone();
    }
  }

  // Public method to retry pending ringtone (call before stopRingtone)
  async retryPendingRingtone(): Promise<boolean> {
    if (this.pendingRingtone && !this.isPlaying) {
      console.log('🔔 RINGTONE: Retrying pending ringtone on user gesture');
      try {
        await this.resumeRingtone();
        // Play briefly so user hears it
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch (error) {
        console.warn('🔔 RINGTONE: Retry failed:', error);
        return false;
      }
    }
    return this.isPlaying;
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

      // Create the audio routing graph
      // gainNode -> mediaStreamDestination -> audioElement (for speaker routing)
      // Also connect directly to destination as fallback
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      // Try to use MediaStreamDestination for speaker routing
      try {
        this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
        this.gainNode.connect(this.mediaStreamDestination);
        
        // Create audio element and route through it for speaker output
        this.audioElement = new Audio();
        this.audioElement.srcObject = this.mediaStreamDestination.stream;
        this.audioElement.volume = 1.0;
        
        // Try to set speaker output (mobile devices)
        if ('setSinkId' in this.audioElement) {
          try {
            // @ts-ignore - setSinkId exists but TypeScript doesn't know about it
            await this.audioElement.setSinkId('default');
            console.log('🔔 RINGTONE: Audio routed to default speaker');
          } catch (sinkError) {
            console.warn('🔔 RINGTONE: setSinkId not supported, using default output');
          }
        }
        
        // Play the audio element
        await this.audioElement.play();
        console.log('🔔 RINGTONE: Audio element playing');
      } catch (mediaError) {
        console.warn('🔔 RINGTONE: MediaStreamDestination failed, using direct output:', mediaError);
        // Fallback: connect directly to audio context destination
        this.gainNode.connect(this.audioContext.destination);
      }

      // Also connect to destination as backup
      this.gainNode.connect(this.audioContext.destination);

      this.isPlaying = true;
      this.pendingRingtone = false;

      // Start the ringtone pattern
      this.playRingtonePattern();

      console.log('✅ RINGTONE: Started successfully');
    } catch (error) {
      console.error('❌ RINGTONE: Web Audio API failed:', error);
      this.pendingRingtone = true;
      throw error;
    }
  }

  private playRingtonePattern() {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;

    console.log('🔔 RINGTONE: Playing classic phone ring pattern');

    // Classic phone ring pattern: UK/EU style - continuous warbling ring
    // More audible and recognizable than simple dual-tone
    const playRingBurst = (startTime: number, duration: number) => {
      if (!this.audioContext || !this.gainNode || !this.isPlaying) return;

      // Create oscillators for a rich, classic phone ring sound
      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const osc3 = this.audioContext.createOscillator();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc3.type = 'triangle'; // Add harmonics for richer sound
      
      // Classic phone ring frequencies - UK style (400Hz + 450Hz) with modulation
      osc1.frequency.setValueAtTime(400, startTime);
      osc2.frequency.setValueAtTime(450, startTime);
      osc3.frequency.setValueAtTime(25, startTime); // Low frequency modulator for warble

      // Create gain nodes for mixing - MAXIMUM VOLUME
      const gain1 = this.audioContext.createGain();
      const gain2 = this.audioContext.createGain();
      const modulatorGain = this.audioContext.createGain();
      
      // Higher individual gains for louder output
      gain1.gain.setValueAtTime(0.6, startTime);
      gain2.gain.setValueAtTime(0.6, startTime);
      modulatorGain.gain.setValueAtTime(0.15, startTime); // Subtle warble effect

      // Connect modulator to create warbling effect
      osc3.connect(modulatorGain);
      modulatorGain.connect(gain1.gain);
      modulatorGain.connect(gain2.gain);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(this.gainNode);
      gain2.connect(this.gainNode);

      // MAXIMUM master volume (1.0) with smooth envelope
      this.gainNode.gain.setValueAtTime(0, startTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0, startTime + 0.02); // Quick attack
      
      // Hold at max volume
      this.gainNode.gain.setValueAtTime(1.0, startTime + duration - 0.02);
      
      // Quick release
      this.gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
      osc3.stop(startTime + duration);
      
      console.log('🔔 RINGTONE: Ring burst scheduled at', startTime.toFixed(2), 'for', duration, 'seconds');
    };

    const scheduleRingCycle = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const now = this.audioContext.currentTime;
      console.log('🔔 RINGTONE: Scheduling ring cycle at time:', now.toFixed(2));

      // UK-style ring pattern: ring (0.4s) - pause (0.2s) - ring (0.4s) - long pause (2s)
      // First burst
      playRingBurst(now, 0.4);
      
      // Second burst after 0.2s silence
      playRingBurst(now + 0.6, 0.4);

      // Schedule next cycle after 3 seconds total (1 second of ringing + 2 seconds silence)
      this.ringtoneInterval = setTimeout(() => {
        scheduleRingCycle();
      }, 3000);
    };

    // Start the ringtone cycle immediately
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

    // Stop audio element
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.srcObject = null;
      } catch (error) {
        console.warn('🔔 RINGTONE: Error stopping audio element:', error);
      }
      this.audioElement = null;
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

    // Disconnect media stream destination
    if (this.mediaStreamDestination) {
      try {
        this.mediaStreamDestination.disconnect();
      } catch (error) {
        // Ignore
      }
      this.mediaStreamDestination = null;
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

  // Test method - plays ringtone for specified duration then stops
  async testRingtone(durationMs: number = 5000): Promise<void> {
    console.log('🔔 RINGTONE TEST: Starting test for', durationMs, 'ms');
    
    try {
      // Mark user gesture as received for testing
      this.userGestureReceived = true;
      
      await this.startRingtone();
      
      if (this.isPlaying) {
        console.log('✅ RINGTONE TEST: Ringtone is playing!');
        
        // Stop after duration
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

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testRingtone = (durationMs?: number) => ringtoneService.testRingtone(durationMs);
  console.log('🔔 RINGTONE: Test available - run window.testRingtone() or testRingtone() in console');
}
