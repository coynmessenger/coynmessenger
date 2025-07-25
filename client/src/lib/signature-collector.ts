// Comprehensive signature data collection system for Web3 wallet interactions
// This module collects all necessary signature data required for token sending

interface SignatureData {
  userAddress: string;
  signature: string;
  messageHash: string;
  timestamp: number;
  nonce: string;
  chainId: number;
}

interface TransactionSignatureData extends SignatureData {
  transactionHash?: string;
  gasPrice: string;
  gasLimit: string;
  value: string;
  to: string;
  data?: string;
}

interface PersonalSignatureData extends SignatureData {
  message: string;
  messageType: 'personal_sign' | 'eth_sign' | 'typed_data';
}

class SignatureCollector {
  private ethereum: any;
  private signatures: Map<string, SignatureData> = new Map();

  constructor() {
    this.ethereum = (window as any).ethereum;
  }

  // Collect comprehensive wallet permissions and signature data
  async collectWalletSignatures(): Promise<{
    accountSignature: PersonalSignatureData;
    permissionSignature: PersonalSignatureData;
    chainSignature: PersonalSignatureData;
  }> {
    if (!this.ethereum) {
      throw new Error('Web3 wallet not available');
    }

    try {
      // Request account access and collect account signature
      const accounts = await this.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No wallet accounts found');
      }

      const userAddress = accounts[0];
      const chainId = await this.ethereum.request({ method: 'eth_chainId' });
      const timestamp = Date.now();
      const nonce = this.generateNonce();

      // Collect account verification signature
      const accountMessage = `Verify wallet ownership for COYN Messenger\nAddress: ${userAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
      const accountSignature = await this.requestPersonalSign(accountMessage, userAddress);

      // Collect permission signature for token sending
      const permissionMessage = `Grant permission for token sending\nChain ID: ${chainId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
      const permissionSignature = await this.requestPersonalSign(permissionMessage, userAddress);

      // Collect chain verification signature
      const chainMessage = `Verify chain access for BSC network\nChain ID: ${chainId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
      const chainSignature = await this.requestPersonalSign(chainMessage, userAddress);

      const signatureData = {
        accountSignature: {
          userAddress,
          signature: accountSignature,
          messageHash: this.hashMessage(accountMessage),
          timestamp,
          nonce,
          chainId: parseInt(chainId, 16),
          message: accountMessage,
          messageType: 'personal_sign' as const
        },
        permissionSignature: {
          userAddress,
          signature: permissionSignature,
          messageHash: this.hashMessage(permissionMessage),
          timestamp,
          nonce,
          chainId: parseInt(chainId, 16),
          message: permissionMessage,
          messageType: 'personal_sign' as const
        },
        chainSignature: {
          userAddress,
          signature: chainSignature,
          messageHash: this.hashMessage(chainMessage),
          timestamp,
          nonce,
          chainId: parseInt(chainId, 16),
          message: chainMessage,
          messageType: 'personal_sign' as const
        }
      };

      // Store signatures for future reference
      this.signatures.set(`account_${userAddress}`, signatureData.accountSignature);
      this.signatures.set(`permission_${userAddress}`, signatureData.permissionSignature);
      this.signatures.set(`chain_${userAddress}`, signatureData.chainSignature);

      return signatureData;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw new Error(`Failed to collect wallet signatures: ${error.message}`);
    }
  }

  // Collect transaction-specific signature data
  async collectTransactionSignatures(transactionParams: any): Promise<TransactionSignatureData> {
    if (!this.ethereum) {
      throw new Error('Web3 wallet not available');
    }

    try {
      const userAddress = transactionParams.from;
      const chainId = await this.ethereum.request({ method: 'eth_chainId' });
      const timestamp = Date.now();
      const nonce = this.generateNonce();

      // Create transaction authorization message
      const transactionMessage = `Authorize token transfer\nFrom: ${transactionParams.from}\nTo: ${transactionParams.to}\nValue: ${transactionParams.value}\nGas: ${transactionParams.gas}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Request transaction authorization signature
      const signature = await this.requestPersonalSign(transactionMessage, userAddress);

      const transactionSignatureData: TransactionSignatureData = {
        userAddress,
        signature,
        messageHash: this.hashMessage(transactionMessage),
        timestamp,
        nonce,
        chainId: parseInt(chainId, 16),
        gasPrice: transactionParams.gasPrice || '0x4A817C800',
        gasLimit: transactionParams.gas || '0x5208',
        value: transactionParams.value || '0x0',
        to: transactionParams.to,
        data: transactionParams.data
      };

      // Store transaction signature
      this.signatures.set(`transaction_${timestamp}`, transactionSignatureData);

      return transactionSignatureData;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected transaction signature');
      }
      throw new Error(`Failed to collect transaction signature: ${error.message}`);
    }
  }

  // Request personal signature from wallet with improved handling
  private async requestPersonalSign(message: string, address: string): Promise<string> {
    try {
      console.log('🖊️ Requesting signature for message:', message.substring(0, 50) + '...');
      
      // Add small delay to prevent wallet overwhelm
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Encode message properly for signing
      const encodedMessage = `0x${Buffer.from(message, 'utf8').toString('hex')}`;
      
      const signature = await this.ethereum.request({
        method: 'personal_sign',
        params: [encodedMessage, address]
      });
      
      console.log('✅ Signature received successfully');
      return signature;
    } catch (error: any) {
      console.error('❌ Signature request failed:', error);
      
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      if (error.code === -32603) {
        throw new Error('Wallet internal error - please try again');
      }
      if (error.code === -32002) {
        throw new Error('Wallet already processing a request - please wait');
      }
      
      throw new Error(`Signature request failed: ${error.message}`);
    }
  }

  // Generate secure nonce for signatures
  private generateNonce(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Hash message for verification
  private hashMessage(message: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }) as any;
  }

  // Verify collected signatures
  async verifySignatures(userAddress: string): Promise<boolean> {
    const accountSig = this.signatures.get(`account_${userAddress}`);
    const permissionSig = this.signatures.get(`permission_${userAddress}`);
    const chainSig = this.signatures.get(`chain_${userAddress}`);

    return !!(accountSig && permissionSig && chainSig);
  }

  // Get all collected signatures for a user
  getCollectedSignatures(userAddress: string): {
    account?: SignatureData;
    permission?: SignatureData;
    chain?: SignatureData;
  } {
    return {
      account: this.signatures.get(`account_${userAddress}`),
      permission: this.signatures.get(`permission_${userAddress}`),
      chain: this.signatures.get(`chain_${userAddress}`)
    };
  }

  // Clear all stored signatures
  clearSignatures(): void {
    this.signatures.clear();
  }

  // Export signature data for backend storage
  exportSignatureData(): { [key: string]: SignatureData } {
    return Object.fromEntries(this.signatures);
  }

  // Simple signature test function for debugging wallet button issues
  async testSimpleSignature(): Promise<boolean> {
    if (!this.ethereum) {
      console.error('No wallet provider available for signature test');
      return false;
    }

    try {
      console.log('🧪 Testing simple signature functionality...');
      
      const accounts = await this.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        console.error('No accounts available for signature test');
        return false;
      }

      const testMessage = 'COYN Messenger - Signature Test';
      const encodedMessage = `0x${Buffer.from(testMessage, 'utf8').toString('hex')}`;
      
      console.log('Requesting test signature...');
      const signature = await this.ethereum.request({
        method: 'personal_sign',
        params: [encodedMessage, accounts[0]]
      });
      
      console.log('✅ Signature test successful:', signature.substring(0, 20) + '...');
      return true;
      
    } catch (error: any) {
      console.error('❌ Signature test failed:', error.message);
      
      if (error.code === 4001) {
        console.error('User rejected signature test');
      } else if (error.code === -32002) {
        console.error('Wallet already processing a request');
      } else if (error.code === -32603) {
        console.error('Wallet internal error');
      }
      
      return false;
    }
  }
}

// Create singleton instance
export const signatureCollector = new SignatureCollector();

// Export types for use in other components
export type { SignatureData, TransactionSignatureData, PersonalSignatureData };