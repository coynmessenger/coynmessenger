// Comprehensive signature-based wallet authentication system
import { tenderlyWalletService } from "./tenderly-service";

interface SignatureChallenge {
  message: string;
  nonce: string;
  timestamp: number;
}

interface SignatureData {
  walletAddress: string;
  signature: string;
  message: string;
  signatureType: 'account' | 'permission' | 'chain' | 'transaction';
  nonce: string;
  timestamp: number;
  chainId: number;
}

interface AuthenticationResult {
  isAuthenticated: boolean;
  userId?: number;
  error?: string;
}

class SignatureAuthenticator {
  private baseUrl = '';

  // Complete wallet authentication flow for transaction authorization
  async authenticateWalletForTransactions(walletAddress: string): Promise<AuthenticationResult> {
    try {
      console.log('Starting comprehensive wallet authentication for:', walletAddress);

      // Check if wallet is already authenticated
      const existingAuth = await this.verifyExistingAuthentication(walletAddress);
      if (existingAuth.isAuthenticated) {
        console.log('Wallet already authenticated');
        return existingAuth;
      }

      // Perform comprehensive signature collection
      const signatureTypes = ['account', 'permission', 'chain'] as const;
      
      for (const signatureType of signatureTypes) {
        console.log(`Collecting ${signatureType} signature...`);
        
        // Generate challenge
        const challenge = await this.generateSignatureChallenge(walletAddress, signatureType);
        
        // Request signature from wallet
        const signature = await this.requestWalletSignature(challenge.message, walletAddress);
        
        // Verify and store signature
        const signatureData: SignatureData = {
          walletAddress,
          signature,
          message: challenge.message,
          signatureType,
          nonce: challenge.nonce,
          timestamp: challenge.timestamp,
          chainId: 56 // BSC mainnet
        };

        await this.verifyAndStoreSignature(signatureData);
        console.log(`${signatureType} signature collected and verified`);
      }

      // Final verification
      const finalAuth = await this.verifyWalletAuthentication(walletAddress);
      
      if (finalAuth.isAuthenticated) {
        // Store authentication status in localStorage
        localStorage.setItem('walletAuthenticated', JSON.stringify({
          walletAddress,
          userId: finalAuth.userId,
          timestamp: Date.now()
        }));
        
        console.log('Wallet fully authenticated for transactions');
      }

      return finalAuth;
    } catch (error: any) {
      console.error('Wallet authentication failed:', error);
      return {
        isAuthenticated: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  // Generate signature challenge from backend
  private async generateSignatureChallenge(walletAddress: string, signatureType: string): Promise<SignatureChallenge> {
    const response = await fetch(`${this.baseUrl}/api/auth/signature-challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, signatureType }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate signature challenge');
    }

    return response.json();
  }

  // Request signature from wallet using Tenderly
  private async requestWalletSignature(message: string, walletAddress: string): Promise<string> {
    try {
      // Use Tenderly wallet service for signature
      const signature = await tenderlyWalletService.signMessage(message, walletAddress);
      
      if (!signature) {
        throw new Error('Failed to get signature from wallet');
      }

      return signature;
    } catch (error: any) {
      console.error('Signature request failed:', error);
      
      // Fallback to direct wallet interaction if available
      if ((window as any).ethereum) {
        try {
          const signature = await (window as any).ethereum.request({
            method: 'personal_sign',
            params: [message, walletAddress]
          });
          return signature;
        } catch (fallbackError) {
          console.error('Fallback signature request failed:', fallbackError);
        }
      }
      
      throw new Error('Wallet signature request failed');
    }
  }

  // Verify and store signature on backend
  private async verifyAndStoreSignature(signatureData: SignatureData): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signatureData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify signature');
    }
  }

  // Check existing authentication status
  private async verifyExistingAuthentication(walletAddress: string): Promise<AuthenticationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/verify-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          isAuthenticated: result.isAuthenticated,
          userId: result.userId
        };
      } else {
        return { isAuthenticated: false };
      }
    } catch (error) {
      console.error('Error checking existing authentication:', error);
      return { isAuthenticated: false };
    }
  }

  // Final wallet authentication verification
  private async verifyWalletAuthentication(walletAddress: string): Promise<AuthenticationResult> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        isAuthenticated: false,
        error: error.message || 'Authentication verification failed'
      };
    }

    const result = await response.json();
    return {
      isAuthenticated: result.isAuthenticated,
      userId: result.userId
    };
  }

  // Check if wallet is authenticated for transactions
  async isWalletAuthenticated(walletAddress: string): Promise<boolean> {
    try {
      // Check localStorage first
      const stored = localStorage.getItem('walletAuthenticated');
      if (stored) {
        const authData = JSON.parse(stored);
        if (authData.walletAddress === walletAddress) {
          // Check if authentication is still valid (24 hours)
          const age = Date.now() - authData.timestamp;
          if (age < 24 * 60 * 60 * 1000) {
            return true;
          }
        }
      }

      // Verify with backend
      const result = await this.verifyExistingAuthentication(walletAddress);
      return result.isAuthenticated;
    } catch (error) {
      console.error('Error checking wallet authentication:', error);
      return false;
    }
  }

  // Clear authentication data
  async clearAuthentication(userId?: number): Promise<void> {
    try {
      localStorage.removeItem('walletAuthenticated');
      
      if (userId) {
        await fetch(`${this.baseUrl}/api/auth/invalidate-signatures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
      }
    } catch (error) {
      console.error('Error clearing authentication:', error);
    }
  }

  // Get authentication status from localStorage
  getStoredAuthentication(): { walletAddress: string; userId: number } | null {
    try {
      const stored = localStorage.getItem('walletAuthenticated');
      if (stored) {
        const authData = JSON.parse(stored);
        // Check if authentication is still valid (24 hours)
        const age = Date.now() - authData.timestamp;
        if (age < 24 * 60 * 60 * 1000) {
          return authData;
        } else {
          localStorage.removeItem('walletAuthenticated');
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting stored authentication:', error);
      return null;
    }
  }
}

// Create singleton instance
export const signatureAuthenticator = new SignatureAuthenticator();

// Export types
export type { SignatureChallenge, SignatureData, AuthenticationResult };