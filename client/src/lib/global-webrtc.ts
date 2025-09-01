import { EncryptedWebRTCService } from './encrypted-webrtc.js';

// Global WebRTC service singleton
let globalWebRTCService: EncryptedWebRTCService | null = null;

// Initialize the global WebRTC service
export const initializeGlobalWebRTC = async (userId: string): Promise<void> => {
  // Clean up any existing service first to prevent multiple connections
  if (globalWebRTCService) {
    console.log('🔧 CRITICAL DEBUG: Cleaning up existing WebRTC service before reinitializing');
    globalWebRTCService.cleanup();
    globalWebRTCService = null;
  }

  try {
    console.log('🔧 CRITICAL DEBUG: Initializing NEW global WebRTC service for user:', userId);
    globalWebRTCService = new EncryptedWebRTCService();
    await globalWebRTCService.initialize(userId);
    console.log('🔧 CRITICAL DEBUG: Global WebRTC service initialized successfully for user:', userId);
    console.log('🔧 CRITICAL DEBUG: New socket ID:', globalWebRTCService.getSocketId());
    console.log('🔧 CRITICAL DEBUG: New socket connected:', globalWebRTCService.socket?.connected);
  } catch (error) {
    console.error('Failed to initialize global WebRTC service:', error);
    globalWebRTCService = null;
    throw error;
  }
};

// Get the global WebRTC service
export const getGlobalWebRTC = (): EncryptedWebRTCService | null => {
  return globalWebRTCService;
};

// Cleanup the global WebRTC service
export const cleanupGlobalWebRTC = (): void => {
  if (globalWebRTCService) {
    console.log('Cleaning up global WebRTC service');
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