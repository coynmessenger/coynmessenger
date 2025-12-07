/**
 * Preflight Permission Service
 * 
 * Handles camera/microphone permissions with mobile-first approach.
 * CRITICAL: Must be called within user gesture (button click) for mobile Chrome.
 */

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unavailable';

export interface PermissionResult {
  success: boolean;
  stream?: MediaStream;
  state: PermissionState;
  errorType?: 'permission_denied' | 'no_device' | 'device_in_use' | 'insecure_context' | 'unknown';
  errorMessage?: string;
  userAction?: string; // What user needs to do to fix
}

class PermissionService {
  private cachedStreams = new Map<string, MediaStream>();
  private retentionCounts = new Map<string, number>();
  
  constructor() {
    // Cleanup cached streams on window unload to avoid stale handles
    window.addEventListener('beforeunload', () => {
      this.clearAllCachedStreams();
    });
  }
  
  /**
   * Retain a cached stream (increment ref count)
   * Call this when you acquire a cached stream for use
   */
  retainStream(type: 'microphone' | 'camera'): void {
    const currentCount = this.retentionCounts.get(type) || 0;
    this.retentionCounts.set(type, currentCount + 1);
    console.log(`🔒 Retained ${type} stream (count: ${currentCount + 1})`);
  }
  
  /**
   * Release a cached stream (decrement ref count)
   * Call this when you're done using the stream
   * Stream is stopped and removed when count reaches 0
   */
  releaseStream(type: 'microphone' | 'camera'): void {
    const currentCount = this.retentionCounts.get(type) || 0;
    
    if (currentCount <= 0) {
      console.warn(`⚠️ Attempted to release ${type} stream with count ${currentCount}`);
      return;
    }
    
    const newCount = currentCount - 1;
    this.retentionCounts.set(type, newCount);
    console.log(`🔓 Released ${type} stream (count: ${newCount})`);
    
    // If no one is using the stream anymore, clear it
    if (newCount === 0) {
      this.clearCachedStream(type);
      this.retentionCounts.delete(type);
    }
  }
  
  /**
   * Check permission state without requesting
   */
  async checkPermissionState(type: 'microphone' | 'camera'): Promise<PermissionState> {
    try {
      // Check if we're in secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn('⚠️ Not a secure context - permissions may be blocked');
        return 'unavailable';
      }
      
      // Try to query permission state
      if ('permissions' in navigator) {
        const permissionName = type === 'microphone' ? 'microphone' : 'camera';
        const result = await navigator.permissions.query({ name: permissionName as PermissionName });
        console.log(`🔒 Permission state for ${type}:`, result.state);
        return result.state as PermissionState;
      }
      
      // Fallback: assume we need to prompt
      return 'prompt';
    } catch (error) {
      console.error(`❌ Failed to check ${type} permission:`, error);
      return 'prompt';
    }
  }
  
  /**
   * Request microphone permission (for voice calls)
   * MUST be called within user gesture on mobile!
   */
  async requestMicrophonePermission(): Promise<PermissionResult> {
    console.log('🎤 Requesting microphone permission...');
    
    // Check security context first
    if (!window.isSecureContext) {
      return {
        success: false,
        state: 'unavailable',
        errorType: 'insecure_context',
        errorMessage: 'Microphone access requires HTTPS connection',
        userAction: 'Please access this site via HTTPS'
      };
    }
    
    try {
      // Request with minimal constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('✅ Microphone permission granted');
      
      // Cache the stream for reuse
      this.cachedStreams.set('microphone', stream);
      
      return {
        success: true,
        stream,
        state: 'granted'
      };
      
    } catch (error: any) {
      console.error('❌ Microphone permission failed:', error);
      return this.classifyPermissionError(error, 'microphone');
    }
  }
  
  /**
   * Request camera + microphone permission (for video calls)
   * MUST be called within user gesture on mobile!
   */
  async requestCameraPermission(): Promise<PermissionResult> {
    console.log('📹 Requesting camera + microphone permission...');
    
    // Check security context first
    if (!window.isSecureContext) {
      return {
        success: false,
        state: 'unavailable',
        errorType: 'insecure_context',
        errorMessage: 'Camera/microphone access requires HTTPS connection',
        userAction: 'Please access this site via HTTPS'
      };
    }
    
    try {
      // Detect mobile for appropriate constraints
      const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isMobile ? {
          width: { ideal: 480 },
          height: { ideal: 360 },
          frameRate: { ideal: 15 },
          facingMode: 'user'
        } : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        }
      });
      
      console.log('✅ Camera + microphone permission granted');
      
      // Cache the stream for reuse
      this.cachedStreams.set('camera', stream);
      
      return {
        success: true,
        stream,
        state: 'granted'
      };
      
    } catch (error: any) {
      console.error('❌ Camera permission failed:', error);
      return this.classifyPermissionError(error, 'camera');
    }
  }
  
  /**
   * Request camera with custom constraints (bypasses cache)
   * Used for camera switching where we need specific facingMode or other constraints
   * MUST be called within user gesture on mobile!
   */
  async requestCameraWithConstraints(videoConstraints: MediaTrackConstraints): Promise<PermissionResult> {
    console.log('📹 Requesting camera with custom constraints (uncached):', videoConstraints);
    
    // Check security context first
    if (!window.isSecureContext) {
      return {
        success: false,
        state: 'unavailable',
        errorType: 'insecure_context',
        errorMessage: 'Camera/microphone access requires HTTPS connection',
        userAction: 'Please access this site via HTTPS'
      };
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: videoConstraints
      });
      
      console.log('✅ Camera with custom constraints granted (uncached)');
      
      // Do NOT cache this stream - it's for specific use cases like camera switching
      return {
        success: true,
        stream,
        state: 'granted'
      };
      
    } catch (error: any) {
      console.error('❌ Camera with custom constraints failed:', error);
      return this.classifyPermissionError(error, 'camera');
    }
  }
  
  /**
   * Classify permission errors for better user guidance
   */
  private classifyPermissionError(error: any, type: 'microphone' | 'camera'): PermissionResult {
    const deviceName = type === 'camera' ? 'camera and microphone' : 'microphone';
    
    // User denied permission (clicked "Block" or "Deny")
    if (error.name === 'NotAllowedError') {
      // Check if it was user denial or browser block
      const isPriorDenial = document.location.protocol === 'https:' || document.location.hostname === 'localhost';
      
      if (isPriorDenial) {
        return {
          success: false,
          state: 'denied',
          errorType: 'permission_denied',
          errorMessage: `${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)} access was denied`,
          userAction: `Click the 🔒 icon in your browser's address bar and allow ${deviceName} access, then try again`
        };
      } else {
        return {
          success: false,
          state: 'unavailable',
          errorType: 'insecure_context',
          errorMessage: 'Cannot access camera/microphone on insecure connection',
          userAction: 'Please access this site via HTTPS'
        };
      }
    }
    
    // No device found
    if (error.name === 'NotFoundError') {
      return {
        success: false,
        state: 'unavailable',
        errorType: 'no_device',
        errorMessage: `No ${deviceName} found`,
        userAction: `Please connect a ${deviceName} to your device and try again`
      };
    }
    
    // Device already in use (another app or tab)
    if (error.name === 'NotReadableError') {
      return {
        success: false,
        state: 'unavailable',
        errorType: 'device_in_use',
        errorMessage: `${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)} is already in use`,
        userAction: `Close other apps or tabs using the ${deviceName} and try again`
      };
    }
    
    // Unknown error
    return {
      success: false,
      state: 'unavailable',
      errorType: 'unknown',
      errorMessage: `Failed to access ${deviceName}: ${error.message || 'Unknown error'}`,
      userAction: 'Please check your device settings and try again'
    };
  }
  
  /**
   * Get cached stream if available
   */
  getCachedStream(type: 'microphone' | 'camera'): MediaStream | null {
    return this.cachedStreams.get(type) || null;
  }
  
  /**
   * Clear cached stream and stop all tracks
   */
  clearCachedStream(type: 'microphone' | 'camera'): void {
    const stream = this.cachedStreams.get(type);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.cachedStreams.delete(type);
      console.log(`🧹 Cleared cached ${type} stream`);
    }
  }
  
  /**
   * Clear all cached streams
   */
  clearAllCachedStreams(): void {
    this.cachedStreams.forEach((stream, type) => {
      stream.getTracks().forEach(track => track.stop());
      console.log(`🧹 Cleared cached ${type} stream`);
    });
    this.cachedStreams.clear();
  }
  
  /**
   * Test if browser supports required APIs
   */
  isBrowserSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      'RTCPeerConnection' in window
    );
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
