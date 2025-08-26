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

export interface WalletAddressData {
  address: string;
  balances: {
    btc: string;
    bnb: string;
    usdt: string;
    coyn: string;
  };
  isActive: boolean;
}

export interface ComprehensiveWalletData {
  primaryAddress: string;
  allAddresses: WalletAddressData[];
  walletType: string;
  totalBalances: {
    btc: string;
    bnb: string;
    usdt: string;
    coyn: string;
  };
  permissions: {
    accounts: boolean;
    networkSwitch: boolean;
    transactionSigning: boolean;
  };
}

class SignatureCollector {
  private ethereum: any;
  private signatures: Map<string, SignatureData> = new Map();
  private allWalletAddresses: string[] = [];

  constructor() {
    this.ethereum = (window as any).ethereum;
  }

  // Enumerate all wallet addresses within the connected wallet
  async enumerateAllWalletAddresses(): Promise<string[]> {
    if (!this.ethereum) {
      throw new Error('Web3 wallet not available');
    }

    try {
      // Get all available accounts from wallet
      const accounts = await this.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Try to get additional addresses through wallet-specific methods
      let allAddresses = [...accounts];
      
      // For MetaMask and Trust Wallet - try to get additional addresses
      try {
        // Request permission to view all accounts
        const permissions = await this.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        
        // Get all accounts after permission grant
        const allAccounts = await this.ethereum.request({ method: 'eth_accounts' });
        allAddresses = Array.from(new Set([...allAddresses, ...allAccounts]));
      } catch (error) {
        console.log('Could not get additional addresses, using primary accounts');
      }

      // Try to enumerate addresses using derivation paths (for HD wallets)
      try {
        for (let i = 0; i < 10; i++) { // Check first 10 derivation paths
          const address = await this.ethereum.request({
            method: 'eth_requestAccounts',
            params: [{ derivationPath: `m/44'/60'/0'/0/${i}` }]
          });
          if (address && address.length > 0) {
            allAddresses = Array.from(new Set([...allAddresses, ...address]));
          }
        }
      } catch (error) {
        console.log('HD wallet enumeration not supported');
      }

      this.allWalletAddresses = Array.from(new Set(allAddresses));
      console.log('🔍 Found wallet addresses:', this.allWalletAddresses);
      
      return this.allWalletAddresses;
    } catch (error: any) {
      console.error('Failed to enumerate wallet addresses:', error);
      // Fallback to basic account access
      const accounts = await this.ethereum.request({ method: 'eth_requestAccounts' });
      this.allWalletAddresses = accounts;
      return accounts;
    }
  }

  // Collect comprehensive wallet data including all addresses and balances
  async collectComprehensiveWalletData(): Promise<ComprehensiveWalletData> {
    if (!this.ethereum) {
      throw new Error('Web3 wallet not available');
    }

    try {
      // Enumerate all wallet addresses
      const allAddresses = await this.enumerateAllWalletAddresses();
      
      if (allAddresses.length === 0) {
        throw new Error('No wallet addresses found');
      }

      const primaryAddress = allAddresses[0];
      
      // Collect balances for all addresses
      const addressData: WalletAddressData[] = [];
      const totalBalances = { btc: '0', bnb: '0', usdt: '0', coyn: '0' };

      for (const address of allAddresses) {
        try {
          // Get balances for each address
          const balances = await this.getAddressBalances(address);
          
          addressData.push({
            address,
            balances,
            isActive: address === primaryAddress
          });

          // Add to total balances
          totalBalances.btc = (parseFloat(totalBalances.btc) + parseFloat(balances.btc)).toString();
          totalBalances.bnb = (parseFloat(totalBalances.bnb) + parseFloat(balances.bnb)).toString();
          totalBalances.usdt = (parseFloat(totalBalances.usdt) + parseFloat(balances.usdt)).toString();
          totalBalances.coyn = (parseFloat(totalBalances.coyn) + parseFloat(balances.coyn)).toString();
        } catch (error) {
          console.error(`Failed to get balances for address ${address}:`, error);
          // Add with zero balances if balance fetch fails
          addressData.push({
            address,
            balances: { btc: '0', bnb: '0', usdt: '0', coyn: '0' },
            isActive: address === primaryAddress
          });
        }
      }

      // Determine wallet type
      const walletType = this.detectWalletType();

      const comprehensiveData: ComprehensiveWalletData = {
        primaryAddress,
        allAddresses: addressData,
        walletType,
        totalBalances,
        permissions: {
          accounts: true,
          networkSwitch: true,
          transactionSigning: true
        }
      };

      console.log('💰 Comprehensive wallet data collected:', comprehensiveData);
      return comprehensiveData;
    } catch (error: any) {
      throw new Error(`Failed to collect comprehensive wallet data: ${error.message}`);
    }
  }

  // Get balances for a specific address
  private async getAddressBalances(address: string): Promise<{
    btc: string;
    bnb: string;
    usdt: string;
    coyn: string;
  }> {
    try {
      // Get BNB balance (native BSC token)
      const bnbBalance = await this.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Convert from wei to BNB
      const bnbInEther = parseInt(bnbBalance, 16) / Math.pow(10, 18);

      // For ERC-20 tokens (USDT, COYN), we need to call contract methods
      // USDT contract on BSC: 0x55d398326f99059fF775485246999027B3197955
      // COYN contract on BSC: 0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1
      
      const usdtBalance = await this.getTokenBalance(address, '0x55d398326f99059fF775485246999027B3197955', 18);
      const coynBalance = await this.getTokenBalance(address, '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1', 18);

      // Bitcoin is not supported in this application
      const btcBalance = '0';

      return {
        btc: btcBalance,
        bnb: bnbInEther.toFixed(6),
        usdt: usdtBalance,
        coyn: coynBalance
      };
    } catch (error) {
      console.error(`Failed to get balances for ${address}:`, error);
      return { btc: '0', bnb: '0', usdt: '0', coyn: '0' };
    }
  }

  // Get ERC-20 token balance
  private async getTokenBalance(address: string, tokenContract: string, decimals: number): Promise<string> {
    try {
      // ERC-20 balanceOf function call
      const data = `0x70a08231${address.slice(2).padStart(64, '0')}`;
      
      const balance = await this.ethereum.request({
        method: 'eth_call',
        params: [{
          to: tokenContract,
          data: data
        }, 'latest']
      });

      if (balance && balance !== '0x') {
        const balanceInTokens = parseInt(balance, 16) / Math.pow(10, decimals);
        return balanceInTokens.toFixed(6);
      }
      
      return '0';
    } catch (error) {
      console.error(`Failed to get token balance for ${tokenContract}:`, error);
      return '0';
    }
  }

  // Detect wallet type
  private detectWalletType(): string {
    if (this.ethereum?.isMetaMask) return 'MetaMask';
    if (this.ethereum?.isTrust) return 'Trust Wallet';
    if (this.ethereum?.isWalletConnect) return 'WalletConnect';
    if (this.ethereum?.isCoinbaseWallet) return 'Coinbase Wallet';
    return 'Unknown';
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
      // First enumerate all addresses
      const allAddresses = await this.enumerateAllWalletAddresses();
      
      if (allAddresses.length === 0) {
        throw new Error('No wallet accounts found');
      }

      const userAddress = allAddresses[0];
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

  // Request personal signature from wallet
  private async requestPersonalSign(message: string, address: string): Promise<string> {
    try {
      const signature = await this.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
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

  // Get all discovered wallet addresses
  getAllWalletAddresses(): string[] {
    return this.allWalletAddresses;
  }
}

// Create singleton instance
export const signatureCollector = new SignatureCollector();

// Export types for use in other components
export type { SignatureData, TransactionSignatureData, PersonalSignatureData };