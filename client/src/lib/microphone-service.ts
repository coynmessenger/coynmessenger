const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
// Enhanced microphone permission service with better error handling

export interface MicrophonePermissionResult {
  success: boolean;
  stream?: MediaStream;
  error?: {
    type: 'permission_denied' | 'no_microphone' | 'already_in_use' | 'other';
    message: string;
    userAction?: string;
  };
}

class MicrophoneService {
  private currentStream: MediaStream | null = null;

  async requestMicrophonePermission(): Promise<MicrophonePermissionResult> {
    try {
      log('🎤 Requesting microphone permissions...');
      
      // Check if we already have permission
      const permissionStatus = await this.checkPermissionStatus();
      log('🎤 Permission status:', permissionStatus);

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Test that the microphone is actually working
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }

      log('✅ Microphone access granted successfully');
      log('🎤 Audio tracks:', audioTracks.map(track => ({
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState
      })));

      this.currentStream = stream;
      
      return {
        success: true,
        stream: stream
      };

    } catch (error: any) {
      console.error('❌ Microphone permission error:', error);
      
      let errorType: 'permission_denied' | 'no_microphone' | 'already_in_use' | 'other' = 'other';
      let message = 'Failed to access microphone';
      let userAction = '';

      switch (error.name) {
        case 'NotAllowedError':
          errorType = 'permission_denied';
          message = 'Microphone access denied. Please allow microphone permissions in your browser settings and try again.';
          userAction = 'Click the camera/microphone icon in your browser\'s address bar and select "Allow" for microphone access.';
          break;
          
        case 'NotFoundError':
          errorType = 'no_microphone';
          message = 'No microphone found. Please connect a microphone to receive calls.';
          userAction = 'Connect a microphone to your device and refresh the page.';
          break;
          
        case 'NotReadableError':
          errorType = 'already_in_use';
          message = 'Microphone is already in use by another application.';
          userAction = 'Close other apps that might be using your microphone (like video chat apps) and try again.';
          break;
          
        case 'OverconstrainedError':
          errorType = 'other';
          message = 'Your microphone doesn\'t support the required audio settings.';
          userAction = 'Try using a different microphone or check your audio device settings.';
          break;
          
        default:
          errorType = 'other';
          message = `Microphone error: ${error.message || 'Unknown error'}`;
          userAction = 'Please check your microphone settings and try again.';
      }

      return {
        success: false,
        error: {
          type: errorType,
          message,
          userAction
        }
      };
    }
  }

  private async checkPermissionStatus(): Promise<string> {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return permission.state;
      }
      return 'unknown';
    } catch (error) {
      console.warn('Could not check microphone permission status:', error);
      return 'unknown';
    }
  }

  async requestPermissionWithFallback(): Promise<MicrophonePermissionResult> {
    // First attempt with full constraints
    let result = await this.requestMicrophonePermission();
    
    if (!result.success && result.error?.type === 'other') {
      log('🎤 Trying fallback with basic constraints...');
      
      try {
        // Fallback with basic constraints
        const basicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        return {
          success: true,
          stream: basicStream
        };
      } catch (fallbackError: any) {
        console.error('❌ Fallback microphone request also failed:', fallbackError);
        // Return the original error, not the fallback error
        return result;
      }
    }
    
    return result;
  }

  stopCurrentStream() {
    if (this.currentStream) {
      log('🎤 Stopping current microphone stream...');
      this.currentStream.getTracks().forEach(track => {
        track.stop();
      });
      this.currentStream = null;
    }
  }

  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }
}

// Export singleton instance
export const microphoneService = new MicrophoneService();