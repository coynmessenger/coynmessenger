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
      if (this.isPlaying) {
        console.log('Ringtone already playing');
        resolve();
        return;
      }

      console.log('🔔 Starting incoming call ringtone...');
      
      // First try to find the ringtone element
      if (!this.ringtoneElement) {
        this.ringtoneElement = document.getElementById('incoming-call-ringtone') as HTMLAudioElement;
      }
      
      if (this.ringtoneElement) {
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
              console.error('❌ Failed to start ringtone audio element:', error);
              
              // Try fallback Web Audio API ringtone
              this.startWebAudioRingtone()
                .then(() => {
                  this.isPlaying = true;
                  resolve();
                })
                .catch(reject);
            });
        } else {
          this.isPlaying = true;
          resolve();
        }
      } else {
        console.warn('Ringtone audio element not found, using Web Audio API fallback');
        // Fallback to Web Audio API
        this.startWebAudioRingtone()
          .then(() => {
            this.isPlaying = true;
            resolve();
          })
          .catch(reject);
      }
    });
  }

  private startWebAudioRingtone(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔔 Starting Web Audio API ringtone...');
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create oscillator for ringtone
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set ringtone frequency (classic phone ring)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        
        // Set volume
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        // Start the oscillator
        oscillator.start();
        
        // Create ringtone pattern - alternating frequencies
        let currentTime = audioContext.currentTime;
        
        // Create a looping pattern
        const createRingPattern = () => {
          if (!this.isPlaying) return;
          
          // Ring pattern: 800Hz for 0.4s, 1000Hz for 0.4s, silence for 0.2s
          oscillator.frequency.setValueAtTime(800, currentTime);
          oscillator.frequency.setValueAtTime(1000, currentTime + 0.4);
          gainNode.gain.setValueAtTime(0, currentTime + 0.8);
          gainNode.gain.setValueAtTime(0.3, currentTime + 1.0);
          
          currentTime += 1.0;
          
          // Schedule next ring
          setTimeout(createRingPattern, 1000);
        };
        
        createRingPattern();
        
        // Store references for cleanup
        (this as any)._webAudioContext = audioContext;
        (this as any)._webAudioOscillator = oscillator;
        (this as any)._webAudioGain = gainNode;
        
        console.log('✅ Web Audio API ringtone started');
        resolve();
        
      } catch (error) {
        console.error('❌ Web Audio API ringtone failed:', error);
        reject(error);
      }
    });
  }

  stopRingtone() {
    console.log('🔇 Stopping ringtone...');
    
    if (!this.isPlaying) {
      console.log('Ringtone not playing');
      return;
    }

    this.isPlaying = false;

    // Stop HTML audio element if available
    if (this.ringtoneElement) {
      try {
        this.ringtoneElement.pause();
        this.ringtoneElement.currentTime = 0;
        console.log('✅ Audio element ringtone stopped');
      } catch (error) {
        console.warn('Error stopping audio element:', error);
      }
    }

    // Stop Web Audio API ringtone if it was used
    try {
      const oscillator = (this as any)._webAudioOscillator;
      const audioContext = (this as any)._webAudioContext;
      
      if (oscillator) {
        oscillator.stop();
        console.log('✅ Web Audio API oscillator stopped');
      }
      
      if (audioContext) {
        audioContext.close();
        console.log('✅ Web Audio API context closed');
      }
      
      // Clean up references
      (this as any)._webAudioOscillator = null;
      (this as any)._webAudioContext = null;
      (this as any)._webAudioGain = null;
      
    } catch (error) {
      console.warn('Error stopping Web Audio API ringtone:', error);
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