import { ethers } from 'ethers';

interface WalletProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
}

interface ConnectedWallet {
  address: string;
  provider: WalletProvider;
  chainId: string;
  balance: string;
}

class WalletConnector {
  private currentWallet: ConnectedWallet | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  // BSC Network Configuration
  private readonly BSC_CONFIG = {
    chainId: '0x38', // 56 in decimal
    chainName: 'BNB Smart Chain',
    rpcUrls: ['https://bsc-dataseed1.binance.org/'],
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrls: ['https://bscscan.com/'],
  };

  // Check if wallet is available
  private getWalletProvider(): WalletProvider | null {
    if (typeof window === 'undefined') return null;
    
    // Check for MetaMask
    if (window.ethereum?.isMetaMask) {
      console.log('🦊 MetaMask detected');
      return window.ethereum;
    }
    
    // Check for Trust Wallet
    if (window.ethereum?.isTrust) {
      console.log('💙 Trust Wallet detected');
      return window.ethereum;
    }
    
    // Generic Web3 provider
    if (window.ethereum) {
      console.log('🌐 Generic Web3 wallet detected');
      return window.ethereum;
    }
    
    return null;
  }

  // Connect to wallet with retry logic
  async connectWallet(): Promise<ConnectedWallet> {
    const walletProvider = this.getWalletProvider();
    
    if (!walletProvider) {
      throw new Error('No Web3 wallet detected. Please install MetaMask or Trust Wallet.');
    }

    try {
      console.log('🔗 Requesting wallet connection...');
      
      // Request account access with timeout
      const accounts = await Promise.race([
        walletProvider.request({ method: 'eth_requestAccounts' }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Wallet connection timeout')), 30000)
        )
      ]);

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      const address = accounts[0];
      console.log('✅ Connected to wallet:', address);

      // Get current chain ID
      const chainId = await walletProvider.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);

      // Switch to BSC if needed
      await this.ensureBSCNetwork(walletProvider);

      // Get balance
      const balance = await walletProvider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Create ethers provider and signer
      this.provider = new ethers.BrowserProvider(walletProvider);
      this.signer = await this.provider.getSigner();

      this.currentWallet = {
        address,
        provider: walletProvider,
        chainId,
        balance: ethers.formatEther(balance)
      };

      // Set up event listeners
      this.setupEventListeners(walletProvider);

      return this.currentWallet;

    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      
      // Handle specific error types
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      } else if (error.code === -32002) {
        throw new Error('Wallet connection is already pending. Please check your wallet.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Wallet connection timed out. Please try again.');
      }
      
      throw new Error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
    }
  }

  // Ensure we're on BSC network
  private async ensureBSCNetwork(provider: WalletProvider): Promise<void> {
    try {
      const currentChainId = await provider.request({ method: 'eth_chainId' });
      
      if (currentChainId === this.BSC_CONFIG.chainId) {
        console.log('✅ Already on BSC network');
        return;
      }

      console.log(`🔄 Switching from ${currentChainId} to BSC...`);
      
      try {
        // Try to switch to BSC
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: this.BSC_CONFIG.chainId }],
        });
        console.log('✅ Switched to BSC network');
      } catch (switchError: any) {
        // If BSC network doesn't exist, add it
        if (switchError.code === 4902) {
          console.log('➕ Adding BSC network to wallet...');
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [this.BSC_CONFIG],
          });
          console.log('✅ BSC network added');
        } else {
          throw switchError;
        }
      }
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Please approve the network switch to BSC in your wallet');
      }
      throw new Error(`Failed to switch to BSC network: ${error.message}`);
    }
  }

  // Send BNB transaction
  async sendBNB(toAddress: string, amount: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: string;
  }> {
    if (!this.currentWallet || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('💰 Preparing BNB transaction...');
      console.log(`From: ${this.currentWallet.address}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amount} BNB`);

      // Validate addresses
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Convert amount to Wei
      const value = ethers.parseEther(amount);
      
      // Check balance
      const balance = await this.provider!.getBalance(this.currentWallet.address);
      if (balance < value) {
        throw new Error('Insufficient BNB balance');
      }

      // Prepare transaction
      const tx = {
        to: toAddress,
        value: value,
        gasLimit: BigInt(21000), // Standard gas limit for BNB transfer
      };

      console.log('📝 Signing transaction...');
      
      // Send transaction
      const transaction = await this.signer.sendTransaction(tx);
      
      console.log('✅ Transaction sent:', transaction.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      console.log('🎉 Transaction confirmed!');
      
      return {
        hash: transaction.hash,
        from: this.currentWallet.address,
        to: toAddress,
        value: amount
      };

    } catch (error: any) {
      console.error('❌ BNB transaction failed:', error);
      
      if (error.code === 4001) {
        throw new Error('Transaction cancelled by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for transaction and gas');
      } else if (error.reason) {
        throw new Error(error.reason);
      }
      
      throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Set up wallet event listeners
  private setupEventListeners(provider: WalletProvider): void {
    if (!provider.on) return;

    // Account changes
    provider.on('accountsChanged', (accounts: string[]) => {
      console.log('👤 Accounts changed:', accounts);
      if (accounts.length === 0) {
        this.disconnect();
      } else if (this.currentWallet) {
        this.currentWallet.address = accounts[0];
      }
    });

    // Network changes
    provider.on('chainChanged', (chainId: string) => {
      console.log('🔗 Network changed:', chainId);
      if (this.currentWallet) {
        this.currentWallet.chainId = chainId;
      }
      // Reload page to reset state
      window.location.reload();
    });

    // Disconnection
    provider.on('disconnect', () => {
      console.log('🔌 Wallet disconnected');
      this.disconnect();
    });
  }

  // Disconnect wallet
  disconnect(): void {
    console.log('🔌 Disconnecting wallet...');
    this.currentWallet = null;
    this.provider = null;
    this.signer = null;
  }

  // Get current wallet info
  getCurrentWallet(): ConnectedWallet | null {
    return this.currentWallet;
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.currentWallet !== null;
  }

  // Get wallet balance
  async getBalance(): Promise<string> {
    if (!this.currentWallet || !this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.getBalance(this.currentWallet.address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  // Sign message for authentication
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('✍️ Signing message...');
      const signature = await this.signer.signMessage(message);
      console.log('✅ Message signed');
      return signature;
    } catch (error: any) {
      console.error('Failed to sign message:', error);
      
      if (error.code === 4001) {
        throw new Error('User rejected message signing');
      }
      
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }
}

// Export singleton instance
export const walletConnector = new WalletConnector();

// Type definitions for window.ethereum and trustWallet
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isTrust?: boolean;
    };
    trustWallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}