import { ethers } from 'ethers';

interface WalletProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  constructor?: { name?: string };
  providerType?: string;
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

  // Mobile device detection
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Enhanced mobile provider detection with comprehensive debugging
  private async waitForWalletProvider(timeout: number = 15000): Promise<WalletProvider | null> {
    if (typeof window === 'undefined') return null;
    
    const startTime = Date.now();
    
    // 📱 COMPREHENSIVE MOBILE DEBUGGING SYSTEM 📱
    console.log('🔍 ====== TRUST WALLET MOBILE DEBUG START ======');
    console.log('📱 DEVICE INFO:');
    console.log('  📱 User Agent:', navigator.userAgent);
    console.log('  📱 Is Mobile:', this.isMobile());
    console.log('  📱 Platform:', navigator.platform);
    console.log('  📱 Screen:', `${screen.width}x${screen.height}`);
    console.log('  📱 Window size:', `${window.innerWidth}x${window.innerHeight}`);
    
    console.log('🔗 URL INFO:');
    console.log('  🔗 Full URL:', window.location.href);
    console.log('  🔗 Origin:', window.location.origin);
    console.log('  🔗 Pathname:', window.location.pathname);
    console.log('  🔗 Search params:', window.location.search);
    console.log('  🔗 Hash:', window.location.hash);
    console.log('  🔗 Referrer:', document.referrer);
    
    console.log('💙 TRUST WALLET DETECTION:');
    const userAgentHasTrust = navigator.userAgent.includes('Trust') || navigator.userAgent.includes('TrustWallet');
    const urlHasTrust = window.location.href.includes('trustwallet');
    const referrerHasTrust = document.referrer.includes('trustwallet');
    const searchHasTrust = window.location.search.includes('trustwallet');
    
    console.log('  💙 UserAgent has Trust:', userAgentHasTrust);
    console.log('  💙 URL has trustwallet:', urlHasTrust);
    console.log('  💙 Referrer has trustwallet:', referrerHasTrust);
    console.log('  💙 Search params has trustwallet:', searchHasTrust);
    
    console.log('🌐 WALLET PROVIDERS:');
    console.log('  🌐 window.ethereum exists:', !!window.ethereum);
    console.log('  🌐 window.trustWallet exists:', !!window.trustWallet);
    console.log('  🌐 window.ethereum.isMetaMask:', !!window.ethereum?.isMetaMask);
    console.log('  🌐 window.ethereum.isTrust:', !!window.ethereum?.isTrust);
    console.log('  🌐 window.ethereum.isTrustWallet:', !!window.ethereum?.isTrustWallet);
    
    if (window.ethereum) {
      console.log('  🌐 ethereum provider details:', {
        isMetaMask: window.ethereum.isMetaMask,
        isTrust: (window.ethereum as any).isTrust,
        isTrustWallet: (window.ethereum as any).isTrustWallet,
        constructor: (window.ethereum as any).constructor?.name,
        providerType: (window.ethereum as any).providerType
      });
    }
    
    console.log('💾 LOCAL STORAGE:');
    console.log('  💾 trustWalletConnectionInitiated:', localStorage.getItem('trustWalletConnectionInitiated'));
    console.log('  💾 walletConnectionPending:', localStorage.getItem('walletConnectionPending'));
    console.log('  💾 walletConnectionSource:', localStorage.getItem('walletConnectionSource'));
    console.log('  💾 authenticated_user exists:', !!localStorage.getItem('authenticated_user'));
    
    // Enhanced Trust Wallet environment detection
    const detectTrustWalletEnvironment = () => {
      return userAgentHasTrust || urlHasTrust || referrerHasTrust || searchHasTrust ||
             window.ethereum?.isTrust || window.ethereum?.isTrustWallet || window.trustWallet;
    };
    
    const isInTrustWallet = detectTrustWalletEnvironment();
    console.log('💙 FINAL TRUST WALLET DETECTION:', isInTrustWallet);
    console.log('🔍 ====== TRUST WALLET MOBILE DEBUG END ======');
    
    while (Date.now() - startTime < timeout) {
      // Enhanced Trust Wallet detection (check first to override MetaMask detection)
      if (isInTrustWallet) {
        // In Trust Wallet environment, prioritize any available provider
        if (window.ethereum) {
          console.log('💙 Trust Wallet detected via environment with ethereum provider');
          return window.ethereum;
        }
        if (window.trustWallet) {
          console.log('💙 Trust Wallet detected via trustWallet object');
          return window.trustWallet;
        }
        
        // Check for Trust Wallet specific properties
        if ((window.ethereum as any)?.isTrust || (window.ethereum as any)?.isTrustWallet) {
          console.log('💙 Trust Wallet detected via provider flags');
          return window.ethereum || null;
        }
      }
      
      // Direct Trust Wallet provider detection
      if ((window.ethereum as any)?.isTrust || window.trustWallet || (window.ethereum as any)?.isTrustWallet) {
        console.log('💙 Trust Wallet detected via direct provider flags');
        return (window.trustWallet as WalletProvider) || window.ethereum;
      }
      
      // Check for MetaMask (only if not in Trust Wallet environment)
      if (!isInTrustWallet && window.ethereum?.isMetaMask) {
        console.log('🦊 MetaMask detected');
        return window.ethereum;
      }
      
      // Check for Trust Wallet via constructor
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        try {
          if ((window.ethereum as any).constructor?.name === 'TrustWalletProvider' || 
              (window.ethereum as any).providerType === 'trust') {
            console.log('💙 Trust Wallet detected via constructor');
            return window.ethereum;
          }
        } catch (e) {
          // Ignore detection errors
        }
      }
      
      // Generic Web3 provider (for Trust Wallet that doesn't set identification flags)
      if (window.ethereum && (this.isMobile() || isInTrustWallet)) {
        console.log('🌐 Mobile/Trust Web3 wallet detected');
        return window.ethereum;
      }
      
      // Desktop generic provider
      if (window.ethereum && !this.isMobile()) {
        console.log('🌐 Desktop Web3 wallet detected');
        return window.ethereum;
      }
      
      // Longer wait for Trust Wallet provider injection
      const waitTime = isInTrustWallet ? 1000 : (this.isMobile() ? 500 : 100);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    return null;
  }

  // Deep linking for mobile wallets
  private openWalletApp(walletType: 'metamask' | 'trust'): void {
    if (!this.isMobile()) return;
    
    // Set up return tracking
    localStorage.setItem('walletConnectionPending', 'true');
    localStorage.setItem('walletConnectionType', walletType);
    localStorage.setItem('walletConnectionTimestamp', Date.now().toString());
    
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const fullUrl = window.location.href;
    
    if (walletType === 'trust') {
      // Create a connection-ready URL with auto-connect parameters
      const connectionUrl = `${baseUrl}/?wallet_connect=trust&auto_connect=true&source=trust_wallet`;
      
      // Trust Wallet universal links optimized for direct connection
      const trustDappUrls = [
        // Method 1: Trust Wallet dapp browser with BSC network (most reliable)
        `https://link.trustwallet.com/open_url?coin_id=56&url=${encodeURIComponent(connectionUrl)}`,
        // Method 2: Trust Wallet with auto-connection flag
        `https://link.trustwallet.com/browser?url=${encodeURIComponent(connectionUrl)}`,
        // Method 3: Direct Trust Wallet scheme
        `trust://open_url?coin_id=56&url=${encodeURIComponent(connectionUrl)}`,
        // Method 4: Fallback to current URL
        `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(fullUrl)}`
      ];
      
      console.log('🔗 ====== TRUST WALLET MOBILE BUTTON DEBUG ======');
      console.log('📱 MOBILE DEVICE DETECTION:');
      console.log('  📱 Is Mobile:', this.isMobile());
      console.log('  📱 User Agent:', navigator.userAgent);
      console.log('  📱 Platform:', navigator.platform);
      console.log('  📱 Screen:', `${screen.width}x${screen.height}`);
      
      console.log('🌐 CURRENT WALLET STATE:');
      console.log('  🌐 window.ethereum:', !!window.ethereum);
      console.log('  🌐 window.trustWallet:', !!window.trustWallet);
      console.log('  🌐 Any provider available:', !!(window.ethereum || window.trustWallet));
      
      console.log('🔗 DEEP LINK SETUP:');
      console.log('  🔗 Base URL:', baseUrl);
      console.log('  🔗 Connection URL:', connectionUrl);
      console.log('  🔗 Primary deep link:', trustDappUrls[0]);
      console.log('  🔗 All deep link options:');
      trustDappUrls.forEach((url, index) => {
        console.log(`    ${index + 1}. ${url}`);
      });
      
      // Set connection flags for immediate auto-connection
      localStorage.setItem('trustWalletConnectionInitiated', 'true');
      localStorage.setItem('walletConnectionSource', 'trust_button');
      localStorage.setItem('walletConnectionPending', 'true');
      
      console.log('💾 CONNECTION FLAGS SET:');
      console.log('  💾 trustWalletConnectionInitiated: true');
      console.log('  💾 walletConnectionSource: trust_button');
      console.log('  💾 walletConnectionPending: true');
      
      // Immediate redirect to Trust Wallet
      window.location.href = trustDappUrls[0];
      
      // Quick fallback system for better reliability
      let fallbackIndex = 1;
      const tryFallback = () => {
        if (localStorage.getItem('walletConnectionPending') === 'true' && fallbackIndex < trustDappUrls.length) {
          console.log(`🔄 Trust Wallet fallback ${fallbackIndex}:`, trustDappUrls[fallbackIndex]);
          window.location.href = trustDappUrls[fallbackIndex];
          fallbackIndex++;
          
          if (fallbackIndex < trustDappUrls.length) {
            setTimeout(tryFallback, 1500);
          }
        }
      };
      
      setTimeout(tryFallback, 1500);
      
    } else if (walletType === 'metamask') {
      // MetaMask dapp browser deep link - open our site in MetaMask's browser
      const metamaskDappUrl = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
      
      console.log('🔗 Opening MetaMask with URL:', metamaskDappUrl);
      
      // Direct redirect to MetaMask dapp browser
      window.location.href = metamaskDappUrl;
      
      // Alternative fallback using MetaMask app scheme
      setTimeout(() => {
        if (localStorage.getItem('walletConnectionPending') === 'true') {
          const metamaskScheme = `metamask://dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
          window.location.href = metamaskScheme;
        }
      }, 3000);
    }
    
    // Set up return detection
    this.setupReturnDetection();
  }
  
  // Set up detection for when user returns from wallet
  private setupReturnDetection(): void {
    const checkConnection = async () => {
      if (localStorage.getItem('walletConnectionPending') !== 'true') return;
      
      // Check if we now have a Web3 provider (means we're in wallet browser)
      const provider = await this.waitForWalletProvider(1000);
      if (provider) {
        console.log('🎉 Wallet provider detected after return, attempting auto-connection...');
        localStorage.removeItem('walletConnectionPending');
        
        // Auto-trigger connection
        try {
          const wallet = await this.connectWallet();
          console.log('✅ Auto-connection successful:', wallet.address);
          
          // Trigger page refresh or navigation to messenger
          window.dispatchEvent(new CustomEvent('walletConnected', { detail: wallet }));
        } catch (error) {
          console.log('Auto-connection failed, user needs to click connect again');
        }
      }
    };
    
    // Check periodically for provider
    const intervalId = setInterval(checkConnection, 2000);
    
    // Clean up after 30 seconds
    setTimeout(() => {
      clearInterval(intervalId);
      if (localStorage.getItem('walletConnectionPending') === 'true') {
        localStorage.removeItem('walletConnectionPending');
        console.log('Wallet connection attempt timed out');
      }
    }, 30000);
  }

  // Enhanced mobile-aware wallet connection
  async connectWallet(walletType?: 'metamask' | 'trust'): Promise<ConnectedWallet> {
    console.log('🔗 ====== STARTING MOBILE WALLET CONNECTION ======');
    console.log('📱 MOBILE CONNECTION DEBUG:');
    console.log('  📱 Is Mobile Device:', this.isMobile());
    console.log('  📱 Requested Wallet Type:', walletType);
    console.log('  📱 User Agent:', navigator.userAgent);
    console.log('  📱 Current URL:', window.location.href);
    console.log('  📱 Screen Size:', `${screen.width}x${screen.height}`);
    console.log('  📱 Platform:', navigator.platform);
    
    // On mobile, enhanced connection flow with comprehensive debugging
    if (this.isMobile() && walletType) {
      console.log('📱 MOBILE DEVICE DETECTED - Starting mobile-specific connection flow');
      
      // Quick provider check first
      console.log('🔍 QUICK PROVIDER CHECK (2 second timeout)...');
      const provider = await this.waitForWalletProvider(2000);
      
      console.log('🔍 QUICK CHECK RESULTS:');
      console.log('  🔍 Provider found:', !!provider);
      console.log('  🔍 Provider type:', provider ? 'Available' : 'None');
      
      if (!provider) {
        console.log('❌ NO PROVIDER FOUND ON MOBILE - Attempting deep link');
        console.log('📱 MOBILE DEEP LINK DETAILS:');
        console.log('  📱 Target wallet:', walletType);
        console.log('  📱 Will open wallet app and wait for return...');
        console.log('  📱 User should see wallet app opening now...');
        
        this.openWalletApp(walletType);
        throw new Error(`Opening ${walletType === 'trust' ? 'Trust Wallet' : 'MetaMask'} app...`);
      } else {
        console.log('✅ PROVIDER FOUND ON MOBILE - Proceeding with direct connection');
      }
    }
    
    // Wait for wallet provider (longer timeout on mobile)
    const walletProvider = await this.waitForWalletProvider(this.isMobile() ? 15000 : 5000);
    
    if (!walletProvider) {
      const isMobile = this.isMobile();
      if (isMobile) {
        throw new Error('Please open this page in Trust Wallet or MetaMask mobile browser, or connect your wallet first.');
      } else {
        throw new Error('No Web3 wallet detected. Please install MetaMask or Trust Wallet extension.');
      }
    }

    try {
      console.log('🔗 Requesting wallet connection...');
      
      // Mobile-aware timeout (longer for mobile due to app switching)
      const connectionTimeout = this.isMobile() ? 60000 : 30000;
      
      // Request account access with mobile-friendly timeout
      const accounts = await Promise.race([
        walletProvider.request({ method: 'eth_requestAccounts' }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Wallet connection timeout - please try again')), connectionTimeout)
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
      console.log(`💰 Preparing ${tokenSymbol} transaction...`);
      console.log(`From: ${this.currentWallet.address}`);
      console.log(`To: ${toAddress}`);
      console.log(`Amount: ${amount} ${tokenSymbol}`);

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

      console.log('📝 Signing token transfer transaction...');
      
      // Send token transfer transaction
      const transaction = await tokenContract.transfer(toAddress, value);
      
      console.log('✅ Token transaction sent:', transaction.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for confirmation
      const receipt = await transaction.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Token transaction failed');
      }

      console.log(`🎉 ${tokenSymbol} transaction confirmed!`);
      
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
      isTrustWallet?: boolean;
      providerType?: string;
      constructor?: { name?: string };
    };
    trustWallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}