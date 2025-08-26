// Ringtone service for handling incoming call audio notifications

class RingtoneService {
  private ringtoneElement: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    this.initializeRingtone();
  }

  private initializeRingtone() {
    // Try to get the ringtone audio element
    this.ringtoneElement = document.getElementById('incoming-call-ringtone') as HTMLAudioElement;
    
    if (!this.ringtoneElement) {
      console.warn('Ringtone audio element not found');
      return;
    }

    // Set volume to a reasonable level
    this.ringtoneElement.volume = 0.7;
    
    // Create a simple ringtone using Web Audio API as fallback
    this.createFallbackRingtone();
  }

  private createFallbackRingtone() {
    if (!this.ringtoneElement) return;

    try {
      // Create a simple ringtone using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a simple ringtone pattern (classic phone ring frequencies)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      // Store reference for cleanup
      (this.ringtoneElement as any)._audioContext = audioContext;
      (this.ringtoneElement as any)._oscillator = oscillator;
      (this.ringtoneElement as any)._gainNode = gainNode;
      
    } catch (error) {
      console.warn('Web Audio API not available for ringtone:', error);
    }
  }

  startRingtone(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ringtoneElement) {
        console.warn('Cannot start ringtone: audio element not available');
        reject(new Error('Ringtone not available'));
        return;
      }

      if (this.isPlaying) {
        console.log('Ringtone already playing');
        resolve();
        return;
      }

      console.log('🔔 Starting incoming call ringtone...');
      
      this.ringtoneElement.loop = true;
      this.ringtoneElement.currentTime = 0;
      
      const playPromise = this.ringtoneElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            console.log('✅ Ringtone started successfully');
            resolve();
          })
          .catch(error => {
            console.error('❌ Failed to start ringtone:', error);
            
            // Try fallback Web Audio API ringtone
            this.tryWebAudioRingtone();
            reject(error);
          });
      } else {
        this.isPlaying = true;
        resolve();
      }
    });
  }

  private tryWebAudioRingtone() {
    try {
      const audioContext = (this.ringtoneElement as any)?._audioContext;
      const oscillator = (this.ringtoneElement as any)?._oscillator;
      
      if (audioContext && oscillator) {
        console.log('🔔 Trying Web Audio API ringtone fallback...');
        oscillator.start();
        
        // Create ringtone pattern
        const now = audioContext.currentTime;
        const duration = 0.5;
        
        for (let i = 0; i < 10; i++) {
          const startTime = now + (i * duration * 2);
          oscillator.frequency.setValueAtTime(800, startTime);
          oscillator.frequency.setValueAtTime(1000, startTime + duration * 0.5);
        }
      }
    } catch (error) {
      console.error('Web Audio API ringtone fallback failed:', error);
    }
  }

  stopRingtone() {
    if (!this.ringtoneElement) {
      console.warn('Cannot stop ringtone: audio element not available');
      return;
    }

    if (!this.isPlaying) {
      console.log('Ringtone not playing');
      return;
    }

    console.log('🔇 Stopping incoming call ringtone...');
    
    this.ringtoneElement.pause();
    this.ringtoneElement.currentTime = 0;
    this.isPlaying = false;

    // Stop Web Audio API ringtone if it was used
    try {
      const oscillator = (this.ringtoneElement as any)?._oscillator;
      if (oscillator) {
        oscillator.stop();
        console.log('✅ Web Audio API ringtone stopped');
      }
    } catch (error) {
      // Oscillator might already be stopped
    }

    console.log('✅ Ringtone stopped successfully');
  }

  isRingtonePlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(volume: number) {
    if (this.ringtoneElement && volume >= 0 && volume <= 1) {
      this.ringtoneElement.volume = volume;
      console.log(`🔊 Ringtone volume set to ${Math.round(volume * 100)}%`);
    }
  }
}

// Create singleton instance
export const ringtoneService = new RingtoneService();