// Trust Wallet Mobile Browser Detection
// Specialized detection for Trust Wallet mobile app browser

export class TrustWalletMobileDetector {
  private static checkAttempts = 0;
  private static maxAttempts = 30; // 15 seconds total
  private static checkInterval: NodeJS.Timeout | null = null;

  static async detectTrustWalletMobile(): Promise<boolean> {
    return new Promise((resolve) => {
      this.checkAttempts = 0;
      
      const performCheck = () => {
        this.checkAttempts++;
        
        console.log(`Trust Wallet detection attempt ${this.checkAttempts}/${this.maxAttempts}`);
        
        // Check for various Trust Wallet indicators
        const hasTrustWallet = this.isTrustWalletEnvironment();
        
        if (hasTrustWallet) {
          console.log('✅ Trust Wallet environment detected!');
          this.cleanup();
          resolve(true);
          return;
        }
        
        // Timeout reached
        if (this.checkAttempts >= this.maxAttempts) {
          console.log('❌ Trust Wallet detection timeout');
          this.cleanup();
          resolve(false);
          return;
        }
      };
      
      // Start checking immediately and then every 500ms
      performCheck();
      this.checkInterval = setInterval(performCheck, 500);
    });
  }

  static isTrustWalletEnvironment(): boolean {
    // Check multiple indicators for Trust Wallet
    const indicators = [
      // Standard Web3 provider
      typeof window.ethereum !== 'undefined',
      
      // Trust Wallet specific properties
      typeof (window as any).trustWallet !== 'undefined',
      
      // User agent contains Trust
      navigator.userAgent.includes('Trust'),
      
      // Trust Wallet specific ethereum properties
      window.ethereum?.isTrust === true,
      
      // Trust Wallet provider name
      (window.ethereum as any)?.isReactNative === true,
      
      // Trust Wallet wallet detect
      (window.ethereum as any)?.isTrustWallet === true
    ];
    
    const detectedCount = indicators.filter(Boolean).length;
    console.log(`Trust Wallet indicators detected: ${detectedCount}/6`, indicators);
    
    return detectedCount > 0;
  }

  static async tryConnection(): Promise<string | null> {
    if (!this.isTrustWalletEnvironment()) {
      console.log('❌ Trust Wallet environment not detected');
      return null;
    }

    try {
      console.log('🔄 Attempting Trust Wallet connection...');
      
      // First try eth_accounts (passive check)
      let accounts = await window.ethereum!.request({ method: 'eth_accounts' });
      
      if (!accounts || accounts.length === 0) {
        console.log('No existing accounts, requesting access...');
        // Try eth_requestAccounts (active connection)
        accounts = await window.ethereum!.request({ method: 'eth_requestAccounts' });
      }
      
      if (accounts && accounts.length > 0) {
        console.log('✅ Trust Wallet connected:', accounts[0]);
        return accounts[0];
      }
      
      console.log('❌ No accounts returned from Trust Wallet');
      return null;
      
    } catch (error: any) {
      console.log('❌ Trust Wallet connection error:', error.message);
      return null;
    }
  }

  static cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.checkAttempts = 0;
  }

  static async detectAndConnect(): Promise<string | null> {
    console.log('🔍 Starting Trust Wallet mobile detection and connection...');
    
    const detected = await this.detectTrustWalletMobile();
    
    if (detected) {
      return await this.tryConnection();
    }
    
    return null;
  }
}

// Make it globally available for debugging
(window as any).TrustWalletMobileDetector = TrustWalletMobileDetector;