const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
// Wallet Access Validator - Ensures proper blockchain transaction access
// This module validates that the wallet has proper authorization for transactions

interface WalletAccess {
  address: string;
  balance: string;
  chainId: string;
  authorized: boolean;
  provider?: string;
  timestamp: number;
}

class WalletAccessValidator {
  
  // Validate that wallet access exists and is current
  static validateStoredAccess(): WalletAccess | null {
    try {
      const storedAccess = localStorage.getItem('walletAccess');
      if (!storedAccess) {
        log('No wallet access found in storage');
        return null;
      }
      
      const walletData = JSON.parse(storedAccess);
      
      // Check if access is expired (older than 1 hour)
      if (Date.now() - walletData.timestamp > 3600000) {
        log('Wallet access expired, removing from storage');
        localStorage.removeItem('walletAccess');
        return null;
      }
      
      // Validate required fields
      if (!walletData.address || !walletData.authorized) {
        log('Invalid wallet access data found');
        localStorage.removeItem('walletAccess');
        return null;
      }
      
      return walletData;
    } catch (error) {
      console.error('Error validating wallet access:', error);
      localStorage.removeItem('walletAccess');
      return null;
    }
  }
  
  // Test actual blockchain connection
  static async testBlockchainAccess(provider: any, address: string): Promise<boolean> {
    try {
      // Test 1: Check if we can get account balance
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      if (!balance) {
        console.error('Failed to retrieve wallet balance');
        return false;
      }
      
      // Test 2: Check if we can get current chain ID
      const chainId = await provider.request({
        method: 'eth_chainId'
      });
      
      if (chainId !== '0x38') {
        console.warn('Wallet not on BSC network, chain ID:', chainId);
        // Try to switch network
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }],
          });
        } catch (switchError) {
          console.error('Failed to switch to BSC network:', switchError);
          return false;
        }
      }
      
      // Test 3: Verify account access
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (!accounts.includes(address)) {
        console.error('Wallet address not found in connected accounts');
        return false;
      }
      
      log('Blockchain access validated successfully');
      return true;
    } catch (error) {
      console.error('Blockchain access test failed:', error);
      return false;
    }
  }
  
  // Re-establish wallet access if validation fails
  static async establishWalletAccess(provider: any): Promise<WalletAccess | null> {
    try {
      log('Establishing fresh wallet access...');
      
      // Request account access
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No accounts available');
      }
      
      // Switch to BSC network
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
      
      // Get current balance to verify access
      const balance = await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      
      // Create wallet access data
      const walletAccess: WalletAccess = {
        address: accounts[0],
        balance: balance,
        chainId: '0x38',
        authorized: true,
        provider: provider.isTrust ? 'trust' : 'metamask',
        timestamp: Date.now()
      };
      
      // Store wallet access
      localStorage.setItem('walletAccess', JSON.stringify(walletAccess));
      
      log('Fresh wallet access established successfully');
      return walletAccess;
    } catch (error) {
      console.error('Failed to establish wallet access:', error);
      return null;
    }
  }
  
  // Get the correct provider based on stored wallet data
  static getWalletProvider(walletData?: WalletAccess | null): any {
    if (!window.ethereum) {
      throw new Error('No Web3 wallet detected');
    }
    
    // Use stored provider preference
    if (walletData?.provider === 'trust' && window.trustWallet) {
      return window.trustWallet;
    }
    
    // Detect current provider
    if (window.ethereum.isTrust || window.trustWallet) {
      return window.trustWallet || window.ethereum;
    }
    
    return window.ethereum;
  }
}

export default WalletAccessValidator;