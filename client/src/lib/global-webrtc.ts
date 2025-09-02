import { EncryptedWebRTCService } from './encrypted-webrtc.js';

// Global WebRTC service singleton
let globalWebRTCService: EncryptedWebRTCService | null = null;

// Initialize the global WebRTC service with retry mechanism
export const initializeGlobalWebRTC = async (userId: string, maxRetries: number = 3): Promise<void> => {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      
      // Clean up any existing service first to prevent multiple connections
      if (globalWebRTCService) {
        globalWebRTCService.cleanup();
        globalWebRTCService = null;
      }

      globalWebRTCService = new EncryptedWebRTCService();
      await globalWebRTCService.initialize(userId);
      
      // Add safety checks before accessing methods
      if (globalWebRTCService) {
        
        // Verify the service is actually working
        if (globalWebRTCService.socket?.connected) {
          return; // Success! Exit retry loop
        } else {
          throw new Error('Socket not connected after initialization');
        }
      } else {
        throw new Error('WebRTC service is null after initialization');
      }
      
    } catch (error) {
      console.error(`❌ RETRY: WebRTC initialization attempt ${attempt}/${maxRetries} failed:`, error);
      
      // If this was the last attempt, cleanup and throw
      if (attempt >= maxRetries) {
        if (globalWebRTCService && !globalWebRTCService.socket?.connected) {
          globalWebRTCService = null;
        }
        throw new Error(`WebRTC initialization failed after ${maxRetries} attempts: ${error}`);
      }
      
      // Wait before next retry (exponential backoff: 2s, 4s, 8s)
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Get the global WebRTC service
export const getGlobalWebRTC = (): EncryptedWebRTCService | null => {
  return globalWebRTCService;
};

// Cleanup the global WebRTC service
export const cleanupGlobalWebRTC = (): void => {
  if (globalWebRTCService) {
    globalWebRTCService.cleanup();
    globalWebRTCService = null;
  }
};

// Set event handlers for the global WebRTC service
export const setGlobalWebRTCHandlers = (handlers: {
  onIncomingCall?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video' }) => void;
  onCallAccepted?: (call: { callId: string; byUserId: string }) => void;
  onCallEnded?: (call: { callId: string; endedBy: string; reason: string }) => void;
  onEncryptionStatusChanged?: (encrypted: boolean) => void;
}): void => {
  if (globalWebRTCService) {
    console.log('🔧 Setting global WebRTC handlers:', Object.keys(handlers));
    globalWebRTCService.setEventHandlers(handlers);
  } else {
    console.log('❌ Cannot set global WebRTC handlers - service not initialized');
  }
};