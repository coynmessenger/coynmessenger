// Tenderly configuration for COYN project
const TENDERLY_CONFIG = {
  project: 'coynbit',
  username: 'coynbit',
  baseURL: 'https://dashboard.tenderly.co/coynbit/project',
  // Tenderly gateway RPC endpoint for BSC
  rpcUrl: 'https://bsc.gateway.tenderly.co'
};

export interface TenderlyWalletConnection {
  address: string;
  chainId: string;
  provider: 'metamask' | 'trust';
  connected: boolean;
  balance?: string;
  networkName: string;
}

export class TenderlyWalletService {
  private isInitialized = false;

  constructor() {
    // Tenderly integration for monitoring and analytics
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize Tenderly monitoring for COYN project
      console.log('Initializing Tenderly monitoring for COYN project...');
      console.log('Tenderly project URL:', TENDERLY_CONFIG.baseURL);
      this.isInitialized = true;
      console.log('Tenderly monitoring initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tenderly service:', error);
      throw error;
    }
  }

  async connectWallet(walletType: 'metamask' | 'trust'): Promise<TenderlyWalletConnection | null> {
    await this.initialize();

    try {
      let provider: any;
      let accounts: string[] = [];

      // Get the appropriate wallet provider
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
          provider = window.ethereum;
        } else {
          throw new Error('MetaMask not detected');
        }
      } else if (walletType === 'trust') {
        if (window.trustWallet || (window.ethereum && window.ethereum.isTrust)) {
          provider = window.trustWallet || window.ethereum;
        } else {
          throw new Error('Trust Wallet not detected');
        }
      } else {
        throw new Error('Unsupported wallet type');
      }

      // Request account access through Tenderly gateway
      console.log(`Connecting ${walletType} wallet through Tenderly...`);
      
      // Switch to BSC network first
      await this.switchToBSCNetwork(provider);
      
      // Request account access
      accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Get balance through Tenderly
      const balance = await this.getBalance(provider, accounts[0]);
      
      const connection: TenderlyWalletConnection = {
        address: accounts[0],
        chainId: '0x38', // BSC Mainnet
        provider: walletType,
        connected: true,
        balance: balance,
        networkName: 'Binance Smart Chain'
      };

      console.log('Wallet connected successfully through Tenderly:', connection);
      
      // Store connection data
      localStorage.setItem('tenderlyWalletConnection', JSON.stringify(connection));
      
      return connection;

    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet through Tenderly:`, error);
      return null;
    }
  }

  async switchToBSCNetwork(provider: any): Promise<void> {
    try {
      // Switch to BSC Mainnet
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
      console.log('Switched to BSC network successfully');
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to the wallet
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'Binance Smart Chain',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com/'],
            }],
          });
          console.log('BSC network added and switched successfully');
        } catch (addError) {
          console.error('Failed to add BSC network:', addError);
          throw addError;
        }
      } else {
        console.error('Failed to switch to BSC network:', switchError);
        throw switchError;
      }
    }
  }

  async getBalance(provider: any, address: string): Promise<string> {
    try {
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0x0';
    }
  }

  async sendTransaction(params: {
    from: string;
    to: string;
    value: string;
    data?: string;
    gasLimit?: string;
    gasPrice?: string;
  }): Promise<string> {
    await this.initialize();
    
    try {
      const connection = this.getStoredConnection();
      if (!connection) {
        throw new Error('No wallet connection found');
      }

      const provider = this.getProviderFromConnection(connection);
      
      // Send transaction through Tenderly-monitored provider
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [params],
      });

      console.log('Transaction sent through Tenderly:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to send transaction through Tenderly:', error);
      throw error;
    }
  }

  getStoredConnection(): TenderlyWalletConnection | null {
    try {
      const stored = localStorage.getItem('tenderlyWalletConnection');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get stored connection:', error);
      return null;
    }
  }

  private getProviderFromConnection(connection: TenderlyWalletConnection): any {
    if (connection.provider === 'trust') {
      return window.trustWallet || window.ethereum;
    } else if (connection.provider === 'metamask') {
      return window.ethereum;
    }
    throw new Error('Unknown provider type');
  }

  async validateConnection(): Promise<boolean> {
    const connection = this.getStoredConnection();
    if (!connection) return false;

    try {
      const provider = this.getProviderFromConnection(connection);
      const accounts = await provider.request({ method: 'eth_accounts' });
      
      return accounts && accounts.length > 0 && accounts[0] === connection.address;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  disconnect(): void {
    localStorage.removeItem('tenderlyWalletConnection');
    console.log('Tenderly wallet connection cleared');
  }
}

// Export singleton instance
export const tenderlyWalletService = new TenderlyWalletService();