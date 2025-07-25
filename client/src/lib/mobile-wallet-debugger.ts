// Mobile Wallet Connection Debugger
// Comprehensive debugging system for Trust Wallet mobile connections

export class MobileWalletDebugger {
  private static logs: string[] = [];
  private static isEnabled = true;

  static log(message: string, data?: any) {
    if (!this.isEnabled) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry, data || '');
    this.logs.push(logEntry + (data ? ` ${JSON.stringify(data)}` : ''));
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  static getLogs(): string[] {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static async debugWalletEnvironment() {
    this.log('=== WALLET ENVIRONMENT DEBUG ===');
    
    // Check user agent
    this.log('User Agent', navigator.userAgent);
    
    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.log('Is Mobile Device', isMobile);
    
    // Check Web3 availability
    const hasEthereum = typeof window.ethereum !== 'undefined';
    this.log('Window.ethereum available', hasEthereum);
    
    if (hasEthereum && window.ethereum) {
      this.log('Ethereum provider details', {
        isMetaMask: window.ethereum.isMetaMask,
        isTrust: (window.ethereum as any).isTrust,
        chainId: (window.ethereum as any).chainId,
      });
    }
    
    // Check Trust Wallet specific
    const hasTrustWallet = typeof (window as any).trustWallet !== 'undefined';
    this.log('Window.trustWallet available', hasTrustWallet);
    
    // Check localStorage state
    const pendingConnection = localStorage.getItem('pendingWalletConnection');
    const pendingWalletType = localStorage.getItem('pendingWalletType');
    const walletConnectionAttempt = localStorage.getItem('walletConnectionAttempt');
    const walletConnected = localStorage.getItem('walletConnected');
    
    this.log('LocalStorage State', {
      pendingConnection,
      pendingWalletType,
      walletConnectionAttempt,
      walletConnected
    });
    
    return {
      isMobile,
      hasEthereum,
      hasTrustWallet,
      pendingConnection,
      pendingWalletType,
      walletConnected
    };
  }

  static async testWalletConnection() {
    this.log('=== TESTING WALLET CONNECTION ===');
    
    if (typeof window.ethereum === 'undefined') {
      this.log('❌ No Web3 provider available');
      return null;
    }
    
    try {
      // Test eth_accounts (passive check)
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      this.log('✅ eth_accounts result', accounts);
      
      if (accounts && accounts.length > 0) {
        this.log('✅ Wallet already connected', accounts[0]);
        return accounts[0];
      }
      
      // Test eth_requestAccounts (active connection)
      this.log('Attempting eth_requestAccounts...');
      const requestedAccounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      this.log('✅ eth_requestAccounts result', requestedAccounts);
      
      if (requestedAccounts && requestedAccounts.length > 0) {
        this.log('✅ Wallet connection successful', requestedAccounts[0]);
        return requestedAccounts[0];
      }
      
    } catch (error: any) {
      this.log('❌ Wallet connection failed', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return null;
    }
    
    return null;
  }

  static startMobileReturnMonitoring() {
    this.log('🔍 Starting mobile return monitoring...');
    
    let checkAttempts = 0;
    const maxAttempts = 20; // 10 seconds total
    
    const checkInterval = setInterval(async () => {
      checkAttempts++;
      
      this.log(`Mobile check attempt ${checkAttempts}/${maxAttempts}`);
      
      const environment = await this.debugWalletEnvironment();
      
      if (environment.hasEthereum) {
        this.log('✅ Web3 provider detected on mobile return!');
        
        const connectedAccount = await this.testWalletConnection();
        
        if (connectedAccount) {
          this.log('✅ Successfully connected to wallet on mobile return', connectedAccount);
          clearInterval(checkInterval);
          
          // Trigger connection event
          window.dispatchEvent(new CustomEvent('mobileWalletConnected', {
            detail: { address: connectedAccount }
          }));
          
          return;
        }
      }
      
      if (checkAttempts >= maxAttempts) {
        this.log('❌ Mobile return monitoring timeout reached');
        clearInterval(checkInterval);
      }
    }, 500);
    
    return checkInterval;
  }

  static async simulateTrustWalletReturn() {
    this.log('🧪 Simulating Trust Wallet return for testing...');
    
    // Set pending state
    localStorage.setItem('pendingWalletConnection', 'true');
    localStorage.setItem('pendingWalletType', 'trust');
    localStorage.setItem('walletConnectionAttempt', Date.now().toString());
    
    // Start monitoring
    this.startMobileReturnMonitoring();
    
    // Check current environment
    await this.debugWalletEnvironment();
    
    return 'Trust Wallet return simulation started';
  }
}

// Export for global access
(window as any).MobileWalletDebugger = MobileWalletDebugger;