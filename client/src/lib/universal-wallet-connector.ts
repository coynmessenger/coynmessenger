// Universal Web3 Wallet Connector - Works across ALL browsers
// Prevents concurrent request conflicts and handles all wallet types

interface WalletConnection {
  address: string;
  chainId: string;
  walletType: 'metamask' | 'trust' | 'coinbase' | 'walletconnect' | 'other';
  isConnected: boolean;
}

interface WalletProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isCoinbaseWallet?: boolean;
  request: (params: { method: string; params?: any[] }) => Promise<any>;
}

class UniversalWalletConnector {
  private provider: WalletProvider | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<WalletConnection> | null = null;
  private lastConnectionAttempt = 0;
  private connectionCooldown = 2000; // 2 second cooldown between attempts

  constructor() {
    this.detectProvider();
  }

  // Detect available wallet provider across all browsers
  private detectProvider(): void {
    if (typeof window === 'undefined') return;

    // Check for injected providers
    if ((window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      
      // Handle multiple providers (like when multiple wallets are installed)
      if (ethereum.providers && ethereum.providers.length > 0) {
        // Find specific wallet provider
        const metaMask = ethereum.providers.find((p: any) => p.isMetaMask);
        const trustWallet = ethereum.providers.find((p: any) => p.isTrust);
        
        this.provider = metaMask || trustWallet || ethereum.providers[0];
      } else {
        this.provider = ethereum;
      }
    } else if ((window as any).trustWallet) {
      this.provider = (window as any).trustWallet;
    }
  }

  // Universal wallet connection with enhanced conflict prevention
  async connect(forceNetwork: string = '0x38', preferredWallet?: 'metamask' | 'trust'): Promise<WalletConnection> {
    // Enhanced cooldown to prevent rapid clicks
    const now = Date.now();
    if (now - this.lastConnectionAttempt < this.connectionCooldown) {
      throw new Error('Please wait before trying to connect again.');
    }
    
    // Prevent multiple concurrent connections
    if (this.isConnecting && this.connectionPromise) {
      console.log('🔄 Connection already in progress, please wait...');
      throw new Error('Wallet connection already in progress. Please wait.');
    }

    this.lastConnectionAttempt = now;
    this.isConnecting = true;
    this.connectionPromise = this._performConnection(forceNetwork, preferredWallet);

    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _performConnection(forceNetwork: string, preferredWallet?: 'metamask' | 'trust'): Promise<WalletConnection> {
    // Re-detect provider for specific wallet if needed
    if (preferredWallet) {
      this.detectSpecificProvider(preferredWallet);
    }
    
    if (!this.provider) {
      // Handle wallet not installed case
      if (preferredWallet === 'metamask') {
        if (this.isMobile()) {
          window.location.href = `https://metamask.app.link/dapp/${window.location.host}`;
        } else {
          window.open('https://metamask.io/download/', '_blank');
        }
        throw new Error('MetaMask not installed. Redirecting to install page.');
      } else if (preferredWallet === 'trust') {
        if (this.isMobile()) {
          window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
        } else {
          window.open('https://trustwallet.com/download', '_blank');
        }
        throw new Error('Trust Wallet not installed. Redirecting to install page.');
      }
      throw new Error('No Web3 wallet detected.');
    }

    try {
      console.log('🔗 Connecting to wallet...');
      
      // Step 1: Check if already connected first
      let accounts: string[] = [];
      try {
        accounts = await this.provider.request({ method: 'eth_accounts' });
        console.log('📋 Found existing accounts:', accounts.length);
      } catch (error) {
        console.log('⚠️ Could not get existing accounts:', error);
      }

      // Step 2: Only request accounts if none are connected
      if (!accounts || accounts.length === 0) {
        console.log('📋 No accounts connected, requesting wallet access...');
        console.log('👆 Please approve the connection in your wallet popup');
        
        try {
          accounts = await this.provider.request({ method: 'eth_requestAccounts' });
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('Connection cancelled. Please click "Connect" in your wallet to proceed.');
          } else if (error.code === -32002) {
            throw new Error('Wallet connection request already pending. Please check your wallet and approve the connection.');
          } else {
            throw error;
          }
        }
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts available. Please unlock your wallet and try again.');
      }

      const address = accounts[0];
      console.log('✅ Wallet address:', address);

      // Step 3: Check current network
      let currentChainId: string;
      try {
        currentChainId = await this.provider.request({ method: 'eth_chainId' });
        console.log('🌐 Current network:', currentChainId);
      } catch (error) {
        console.error('❌ Failed to get current network:', error);
        throw new Error('Could not detect current network. Please check your wallet connection.');
      }

      // Step 4: Force network switch if needed
      if (currentChainId !== forceNetwork) {
        console.log(`🔄 Switching from ${currentChainId} to ${forceNetwork}...`);
        console.log('👆 Please approve the network switch in your wallet');
        
        try {
          await this.switchNetwork(forceNetwork);
        } catch (error: any) {
          if (error.code === 4001) {
            throw new Error('Network switch cancelled. This app requires BSC network to function.');
          } else {
            throw error;
          }
        }
      }

      // Step 5: Verify final network
      const finalChainId = await this.provider.request({ method: 'eth_chainId' });
      if (finalChainId !== forceNetwork) {
        throw new Error(`Network switch incomplete. Please manually switch to BSC network in your wallet.`);
      }

      // Step 6: Detect wallet type
      const walletType = this.detectWalletType();
      
      console.log('🎉 Wallet connected successfully!');
      console.log('📍 Address:', address);
      console.log('🌐 Network:', finalChainId);
      console.log('💼 Wallet:', walletType);

      return {
        address,
        chainId: finalChainId,
        walletType,
        isConnected: true
      };

    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      
      // Provide specific guidance based on error type
      if (error.code === 4001) {
        throw new Error('Connection cancelled. Please try again and click "Connect" when your wallet asks for permission.');
      } else if (error.code === -32002) {
        throw new Error('Connection request pending. Please check your wallet popup and approve the connection.');
      } else if (error.code === -32603) {
        throw new Error('Internal wallet error. Please refresh the page and try again.');
      } else if (error.message && error.message.includes('User denied')) {
        throw new Error('Connection denied. Please approve the connection in your wallet to continue.');
      } else {
        // Re-throw custom errors we created
        throw error;
      }
    }
  }

  // Switch network with automatic BSC addition
  private async switchNetwork(chainId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet provider available');
    }

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
      console.log('✅ Network switched successfully');
    } catch (error: any) {
      if (error.code === 4902 && chainId === '0x38') {
        // BSC network not found, add it
        console.log('📝 Adding BSC network...');
        await this.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'BNB Smart Chain',
            rpcUrls: ['https://bsc-dataseed1.binance.org/'],
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18,
            },
            blockExplorerUrls: ['https://bscscan.com/'],
          }]
        });
        console.log('✅ BSC network added successfully');
      } else if (error.code === 4001) {
        throw new Error('Network switch cancelled by user. This app requires BSC network.');
      } else {
        throw error;
      }
    }
  }

  // Detect specific provider for targeted wallet connection
  private detectSpecificProvider(walletType: 'metamask' | 'trust'): void {
    if (typeof window === 'undefined') return;

    if (walletType === 'metamask') {
      // Look specifically for MetaMask
      if ((window as any).ethereum?.isMetaMask) {
        this.provider = (window as any).ethereum;
      } else if ((window as any).ethereum?.providers) {
        const metaMask = (window as any).ethereum.providers.find((p: any) => p.isMetaMask);
        if (metaMask) this.provider = metaMask;
      }
    } else if (walletType === 'trust') {
      // Look specifically for Trust Wallet
      if ((window as any).trustWallet) {
        this.provider = (window as any).trustWallet;
      } else if ((window as any).ethereum?.isTrust) {
        this.provider = (window as any).ethereum;
      } else if ((window as any).ethereum?.providers) {
        const trust = (window as any).ethereum.providers.find((p: any) => p.isTrust);
        if (trust) this.provider = trust;
      }
    }
  }
  
  // Check if on mobile device
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Detect wallet type
  private detectWalletType(): 'metamask' | 'trust' | 'coinbase' | 'walletconnect' | 'other' {
    if (!this.provider) return 'other';

    if (this.provider.isMetaMask) return 'metamask';
    if (this.provider.isTrust) return 'trust';
    if (this.provider.isCoinbaseWallet) return 'coinbase';
    
    return 'other';
  }

  // Check if wallet is connected
  async isConnected(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch {
      return false;
    }
  }

  // Get current account
  async getCurrentAccount(): Promise<string | null> {
    if (!this.provider) return null;

    try {
      const accounts = await this.provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch {
      return null;
    }
  }

  // Get account balance
  async getBalance(address?: string): Promise<string> {
    if (!this.provider) throw new Error('No wallet provider available');

    const account = address || await this.getCurrentAccount();
    if (!account) throw new Error('No account available');

    try {
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [account, 'latest']
      });
      
      // Convert from wei to BNB
      const balanceInBNB = parseInt(balance, 16) / Math.pow(10, 18);
      return balanceInBNB.toFixed(6);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }
}

// Export singleton instance
export const walletConnector = new UniversalWalletConnector();
export type { WalletConnection };