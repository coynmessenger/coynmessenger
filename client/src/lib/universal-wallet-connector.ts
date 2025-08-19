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

  constructor() {
    this.detectProvider();
  }

  // Detect available wallet provider across all browsers
  private detectProvider(): void {
    if (typeof window === 'undefined') return;

    // Check for injected providers
    if ((window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      
      // Handle multiple providers
      if (ethereum.providers && ethereum.providers.length > 0) {
        // Find MetaMask or Trust Wallet
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

  // Universal wallet connection that works in all browsers
  async connect(forceNetwork: string = '0x38'): Promise<WalletConnection> {
    // Prevent multiple concurrent connections
    if (this.isConnecting && this.connectionPromise) {
      console.log('🔄 Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this._performConnection(forceNetwork);

    try {
      const result = await this.connectionPromise;
      return result;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _performConnection(forceNetwork: string): Promise<WalletConnection> {
    if (!this.provider) {
      throw new Error('No Web3 wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet.');
    }

    try {
      console.log('🔗 Connecting to wallet...');
      
      // Step 1: Get existing accounts first (prevents permission popups if already connected)
      let accounts: string[] = [];
      try {
        accounts = await this.provider.request({ method: 'eth_accounts' });
      } catch (error) {
        // Ignore error, will request accounts next
      }

      // Step 2: Request accounts if none are connected
      if (!accounts || accounts.length === 0) {
        console.log('📋 Requesting wallet access...');
        accounts = await this.provider.request({ method: 'eth_requestAccounts' });
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts available');
      }

      const address = accounts[0];
      console.log('✅ Wallet address:', address);

      // Step 3: Check current network
      const currentChainId = await this.provider.request({ method: 'eth_chainId' });
      console.log('🌐 Current network:', currentChainId);

      // Step 4: Force network switch if needed
      if (currentChainId !== forceNetwork) {
        console.log(`🔄 Switching to network ${forceNetwork}...`);
        await this.switchNetwork(forceNetwork);
      }

      // Step 5: Verify final network
      const finalChainId = await this.provider.request({ method: 'eth_chainId' });
      if (finalChainId !== forceNetwork) {
        throw new Error(`Failed to switch to required network. Current: ${finalChainId}, Required: ${forceNetwork}`);
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
      
      if (error.code === 4001) {
        throw new Error('Connection cancelled by user. Please try again and approve the wallet connection.');
      } else if (error.code === -32002) {
        throw new Error('Wallet request already pending. Please check your wallet and try again.');
      } else {
        throw new Error(error.message || 'Failed to connect wallet. Please try again.');
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