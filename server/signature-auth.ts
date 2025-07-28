// Comprehensive signature-based authentication system for Web3 wallet interactions
import { db } from "./db";
import { walletSignatures, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

interface SignatureAuthResult {
  isValid: boolean;
  userId?: number;
  error?: string;
}

interface SignatureData {
  userAddress: string;
  signature: string;
  message: string;
  messageHash: string;
  timestamp: number;
  nonce: string;
  chainId: number;
  signatureType: 'account' | 'permission' | 'chain' | 'transaction';
}

class SignatureAuthenticator {
  // Store wallet signature for authentication
  async storeWalletSignature(userId: number, signatureData: SignatureData): Promise<void> {
    try {
      await db.insert(walletSignatures).values({
        userId,
        walletAddress: signatureData.userAddress,
        signatureType: signatureData.signatureType,
        signature: signatureData.signature,
        message: signatureData.message,
        messageHash: signatureData.messageHash,
        nonce: signatureData.nonce,
        chainId: signatureData.chainId,
        timestamp: new Date(signatureData.timestamp),
        isValid: true,
      });
      
      console.log(`Stored ${signatureData.signatureType} signature for user ${userId}`);
    } catch (error) {
      console.error(`Failed to store signature:`, error);
      throw new Error(`Failed to store wallet signature: ${error}`);
    }
  }

  // Verify wallet signature authentication
  async verifyWalletSignature(walletAddress: string, signatureType: string = 'permission'): Promise<SignatureAuthResult> {
    try {
      // Get user by wallet address
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!user) {
        return { isValid: false, error: 'User not found for wallet address' };
      }

      // Get latest valid signature for the signature type
      const [signature] = await db
        .select()
        .from(walletSignatures)
        .where(
          and(
            eq(walletSignatures.userId, user.id),
            eq(walletSignatures.walletAddress, walletAddress),
            eq(walletSignatures.signatureType, signatureType),
            eq(walletSignatures.isValid, true)
          )
        )
        .orderBy(desc(walletSignatures.timestamp))
        .limit(1);

      if (!signature) {
        return { isValid: false, error: `No valid ${signatureType} signature found` };
      }

      // Check signature age (valid for 24 hours)
      const signatureAge = Date.now() - signature.timestamp.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (signatureAge > maxAge) {
        // Invalidate expired signature
        await db
          .update(walletSignatures)
          .set({ isValid: false })
          .where(eq(walletSignatures.id, signature.id));
        
        return { isValid: false, error: 'Signature expired. Please re-authenticate.' };
      }

      return { 
        isValid: true, 
        userId: user.id 
      };
    } catch (error) {
      console.error('Signature verification failed:', error);
      return { isValid: false, error: 'Signature verification failed' };
    }
  }

  // Verify comprehensive wallet authentication (all signature types)
  async verifyFullWalletAuth(walletAddress: string): Promise<SignatureAuthResult> {
    try {
      const requiredSignatures = ['account', 'permission', 'chain'];
      
      for (const signatureType of requiredSignatures) {
        const result = await this.verifyWalletSignature(walletAddress, signatureType);
        if (!result.isValid) {
          return { 
            isValid: false, 
            error: `Missing or invalid ${signatureType} signature. Please complete wallet authentication.` 
          };
        }
      }

      // Get user ID from first verification
      const accountResult = await this.verifyWalletSignature(walletAddress, 'account');
      return { isValid: true, userId: accountResult.userId };
    } catch (error) {
      console.error('Full wallet auth verification failed:', error);
      return { isValid: false, error: 'Wallet authentication verification failed' };
    }
  }

  // Get all signatures for a user
  async getUserSignatures(userId: number): Promise<any[]> {
    try {
      const signatures = await db
        .select()
        .from(walletSignatures)
        .where(eq(walletSignatures.userId, userId))
        .orderBy(desc(walletSignatures.timestamp));

      return signatures;
    } catch (error) {
      console.error('Failed to get user signatures:', error);
      return [];
    }
  }

  // Invalidate all signatures for a user (for logout)
  async invalidateUserSignatures(userId: number): Promise<void> {
    try {
      await db
        .update(walletSignatures)
        .set({ isValid: false })
        .where(eq(walletSignatures.userId, userId));
      
      console.log(`Invalidated all signatures for user ${userId}`);
    } catch (error) {
      console.error('Failed to invalidate signatures:', error);
      throw new Error('Failed to invalidate signatures');
    }
  }

  // Clean up expired signatures
  async cleanupExpiredSignatures(): Promise<void> {
    try {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      await db
        .update(walletSignatures)
        .set({ isValid: false })
        .where(
          and(
            eq(walletSignatures.isValid, true),
            // @ts-ignore - timestamp comparison
            walletSignatures.timestamp < expiredTime
          )
        );
      
      console.log('Cleaned up expired signatures');
    } catch (error) {
      console.error('Failed to cleanup expired signatures:', error);
    }
  }

  // Generate signature challenge for wallet
  generateSignatureChallenge(walletAddress: string, signatureType: string): {
    message: string;
    nonce: string;
    timestamp: number;
  } {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(32).toString('hex');
    
    let message: string;
    
    switch (signatureType) {
      case 'account':
        message = `Verify wallet ownership for COYN Messenger\nAddress: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
        break;
      case 'permission':
        message = `Grant permission for crypto transactions\nAddress: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
        break;
      case 'chain':
        message = `Verify BSC network access\nAddress: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
        break;
      case 'transaction':
        message = `Authorize crypto transaction\nAddress: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
        break;
      default:
        message = `COYN Messenger signature\nAddress: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
    }

    return { message, nonce, timestamp };
  }

  // Hash message for verification
  hashMessage(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  // Verify signature format and content
  verifySignatureFormat(signature: string, message: string, walletAddress: string): boolean {
    try {
      // Basic signature format validation
      if (!signature || !signature.startsWith('0x') || signature.length !== 132) {
        return false;
      }

      // Verify message contains required components
      const requiredComponents = [walletAddress, 'COYN Messenger'];
      return requiredComponents.every(component => message.includes(component));
    } catch (error) {
      console.error('Signature format verification failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const signatureAuthenticator = new SignatureAuthenticator();

// Export types
export type { SignatureAuthResult, SignatureData };