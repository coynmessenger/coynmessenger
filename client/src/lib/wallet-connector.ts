const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
import { ethers } from 'ethers';

interface WalletProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
}

export interface ConnectedWallet {
  address: string;
  provider: WalletProvider;
  chainId: string;
  balance: string;
}

class WalletConnector {
  private currentWallet: ConnectedWallet | null = null;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  // Mobile detection utilities
  private isMobile(): boolean {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobileDevice;
  }

  private isInAppWallet(): boolean {
    return !!(window.ethereum?.isMetaMask || window.ethereum?.isTrust);
  }


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
      return window.ethereum;
    }
    
    // Check for Trust Wallet
    if (window.ethereum?.isTrust) {
      return window.ethereum;
    }
    
    // Generic Web3 provider
    if (window.ethereum) {
      return window.ethereum;
    }
    
    return null;
  }

  // MetaMask deep linking for mobile
  private openMetaMaskDeepLink(): void {
    
    // Store pending connection state
    localStorage.setItem('pendingWalletConnection', 'metamask');
    
    // Extract just the hostname (without protocol) for MetaMask deep links
    const hostname = window.location.hostname;
    
    // Try multiple MetaMask deep link formats for maximum compatibility
    const deepLinkFormats = [
      `https://metamask.app.link/dapp/${hostname}`,    // Standard format (most compatible)
      `https://link.metamask.io/dapp/${hostname}`,     // New 2024 format
      `metamask://dapp/${hostname}`,                   // Custom scheme fallback
    ];
    
    log('⚠️ MetaMask mobile deep links have known reliability issues');
    
    // Use the primary format that should show the dapp in MetaMask browser
    const primaryDeepLink = deepLinkFormats[0];
    
    // Clear pending state after 10 seconds to prevent perpetual pending state
    setTimeout(() => {
      localStorage.removeItem('pendingWalletConnection');
    }, 10000);
    
    // Navigate to MetaMask app
    window.location.href = primaryDeepLink;
  }

  // Connect to wallet with retry logic and wallet type support
  async connectWallet(walletType?: 'metamask' | 'trust'): Promise<ConnectedWallet> {
    const walletProvider = this.getWalletProvider();
    
    // Handle mobile deep linking for MetaMask
    if (!walletProvider && walletType === 'metamask' && this.isMobile()) {
      this.openMetaMaskDeepLink();
      // Return a resolved state - the handshake continues after redirect
      throw new Error('Opening MetaMask app...');
    }
    
    if (!walletProvider) {
      throw new Error('No Web3 wallet detected. Please connect your wallet.');
    }

    try {
      
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

      // Get current chain ID
      const chainId = await walletProvider.request({ method: 'eth_chainId' });

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
        return;
      }

      log(`🔄 Switching from ${currentChainId} to BSC...`);
      
      try {
        // Try to switch to BSC
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: this.BSC_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        // If BSC network doesn't exist, add it
        if (switchError.code === 4902) {
          log('➕ Adding BSC network to wallet...');
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [this.BSC_CONFIG],
          });
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
      log('💰 Preparing BNB transaction...');
      log(`From: ${this.currentWallet.address}`);
      log(`To: ${toAddress}`);
      log(`Amount: ${amount} BNB`);

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

      
      // Send transaction
      const transaction = await this.signer.sendTransaction(tx);
      
      log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      
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

  // Send USDT token
  async sendUSDT(toAddress: string, amount: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: string;
  }> {
    return this.sendToken(toAddress, amount, 'USDT', '0x55d398326f99059fF775485246999027B3197955', 18);
  }

  // Send COYN token
  async sendCOYN(toAddress: string, amount: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: string;
  }> {
    return this.sendToken(toAddress, amount, 'COYN', '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1', 18);
  }

  // Generic token transfer method
  private async sendToken(toAddress: string, amount: string, tokenSymbol: string, tokenAddress: string, decimals: number): Promise<{
    hash: string;
    from: string;
    to: string;
    value: string;
  }> {
    if (!this.currentWallet || !this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      log(`💰 Preparing ${tokenSymbol} transaction...`);
      log(`From: ${this.currentWallet.address}`);
      log(`To: ${toAddress}`);
      log(`Amount: ${amount} ${tokenSymbol}`);

      // Validate addresses
      if (!ethers.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Invalid token contract address');
      }

      // Convert amount to token units (with specified decimals)
      const value = ethers.parseUnits(amount, decimals);
      
      // Create token contract instance
      const tokenAbi = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, this.signer);

      // Check token balance
      const balance = await tokenContract.balanceOf(this.currentWallet.address);
      if (balance < value) {
        throw new Error(`Insufficient ${tokenSymbol} balance`);
      }

      log('📝 Signing token transfer transaction...');
      
      // Send token transfer transaction
      const transaction = await tokenContract.transfer(toAddress, value);
      
      log('✅ Token transaction sent:', transaction.hash);
      log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Token transaction failed');
      }

      log(`🎉 ${tokenSymbol} transaction confirmed!`);
      
      return {
        hash: transaction.hash,
        from: this.currentWallet.address,
        to: toAddress,
        value: amount
      };

    } catch (error: any) {
      console.error(`❌ ${tokenSymbol} transaction failed:`, error);
      
      if (error.code === 4001) {
        throw new Error('Transaction cancelled by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error(`Insufficient funds for ${tokenSymbol} transaction and gas`);
      } else if (error.reason) {
        throw new Error(error.reason);
      }
      
      throw new Error(`${tokenSymbol} transaction failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Set up wallet event listeners
  private setupEventListeners(provider: WalletProvider): void {
    if (!provider.on) return;

    // Account changes
    provider.on('accountsChanged', (accounts: string[]) => {
      log('👤 Accounts changed:', accounts);
      if (accounts.length === 0) {
        this.disconnect();
      } else if (this.currentWallet) {
        this.currentWallet.address = accounts[0];
      }
    });

    // Network changes
    provider.on('chainChanged', (chainId: string) => {
      log('🔗 Network changed:', chainId);
      if (this.currentWallet) {
        this.currentWallet.chainId = chainId;
      }
      // Reload page to reset state
      window.location.reload();
    });

    // Disconnection
    provider.on('disconnect', () => {
      log('🔌 Wallet disconnected');
      this.disconnect();
    });
  }

  // Disconnect wallet
  disconnect(): void {
    log('🔌 Disconnecting wallet...');
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
      log('✍️ Signing message...');
      const signature = await this.signer.signMessage(message);
      log('✅ Message signed');
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

// Export singleton instance and class
export const walletConnector = new WalletConnector();
export { WalletConnector };

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