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
        globalWebRTCService.disconnect();
        globalWebRTCService = null;
      }

      globalWebRTCService = new EncryptedWebRTCService();
      await globalWebRTCService.initialize(userId);
      
      // Verify the service is working
      if (globalWebRTCService?.getSocketId()) {
        return; // Success! Exit retry loop
      } else {
        throw new Error('Socket not connected after initialization');
      }
      
    } catch (error) {
      // If this was the last attempt, cleanup and throw
      if (attempt >= maxRetries) {
        if (globalWebRTCService && !globalWebRTCService.getSocketId()) {
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
    globalWebRTCService.disconnect();
    globalWebRTCService = null;
  }
};

// Set event handlers for the global WebRTC service
export const setGlobalWebRTCHandlers = (handlers: {
  onIncomingCall?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video' }) => void;
  onCallAccepted?: (call: { callId: string; fromUserId: string; type: 'voice' | 'video'; status: string }) => void;
  onCallEnded?: (call: { callId: string; endedBy: string; reason: string }) => void;
  onEncryptionStatusChanged?: (encrypted: boolean) => void;
}): void => {
  if (globalWebRTCService) {
    globalWebRTCService.setEventHandlers(handlers);
  }
};