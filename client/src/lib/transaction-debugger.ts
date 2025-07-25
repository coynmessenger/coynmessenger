// Transaction Debugger - Comprehensive debugging for crypto transactions
// This module provides detailed logging and testing for transaction failures

interface DebugLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: any;
}

class TransactionDebugger {
  private static logs: DebugLog[] = [];
  
  static log(level: 'info' | 'warn' | 'error', category: string, message: string, data?: any) {
    const logEntry: DebugLog = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Also log to console with enhanced formatting
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }
  }
  
  static async testWalletConnection(): Promise<boolean> {
    this.log('info', 'wallet-test', 'Starting comprehensive wallet connection test');
    
    try {
      // Test 1: Check if Web3 is available
      if (typeof window.ethereum === 'undefined') {
        this.log('error', 'wallet-test', 'No Web3 wallet detected');
        return false;
      }
      
      this.log('info', 'wallet-test', 'Web3 wallet detected', {
        isMetaMask: window.ethereum.isMetaMask,
        isTrust: window.ethereum.isTrust
      });
      
      // Test 2: Check wallet access
      const walletAccess = localStorage.getItem('walletAccess');
      if (!walletAccess) {
        this.log('warn', 'wallet-test', 'No stored wallet access found');
        return false;
      }
      
      let walletData;
      try {
        walletData = JSON.parse(walletAccess);
      } catch (parseError) {
        this.log('error', 'wallet-test', 'Invalid wallet access data', parseError);
        return false;
      }
      this.log('info', 'wallet-test', 'Found stored wallet access', {
        address: walletData.address,
        authorized: walletData.authorized,
        provider: walletData.provider,
        chainId: walletData.chainId
      });
      
      // Test 3: Check account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      this.log('info', 'wallet-test', 'Current accounts', { accounts });
      
      if (accounts.length === 0) {
        this.log('error', 'wallet-test', 'No accounts available');
        return false;
      }
      
      // Test 4: Check network
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      this.log('info', 'wallet-test', 'Current network', { chainId });
      
      if (chainId !== '0x38') {
        this.log('warn', 'wallet-test', 'Not on BSC network', { chainId });
      }
      
      // Test 5: Check balance access
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      });
      
      this.log('info', 'wallet-test', 'Balance access successful', { 
        address: accounts[0],
        balance: balance
      });
      
      return true;
    } catch (error) {
      this.log('error', 'wallet-test', 'Wallet connection test failed', error);
      return false;
    }
  }
  
  static async testTransactionCapability(amount: string, currency: string): Promise<boolean> {
    this.log('info', 'tx-test', 'Testing transaction capability', { amount, currency });
    
    try {
      if (!window.ethereum) {
        this.log('error', 'tx-test', 'No ethereum provider available');
        return false;
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length === 0) {
        this.log('error', 'tx-test', 'No accounts for transaction test');
        return false;
      }
      
      const fromAddress = accounts[0];
      
      // Test gas estimation for different currency types
      let testParams;
      
      if (currency === 'BNB') {
        testParams = {
          from: fromAddress,
          to: fromAddress, // Send to self for testing
          value: '0x1', // Minimal amount
        };
      } else {
        // ERC-20 token test (USDT/COYN)
        const tokenContracts = {
          'USDT': '0x55d398326f99059fF775485246999027B3197955',
          'COYN': '0x1234567890123456789012345678901234567890' // Placeholder
        };
        
        const tokenAddress = tokenContracts[currency as keyof typeof tokenContracts];
        
        if (!tokenAddress) {
          this.log('error', 'tx-test', 'Unknown token contract', { currency });
          return false;
        }
        
        // ERC-20 transfer function data
        const transferData = '0xa9059cbb' + 
          fromAddress.slice(2).padStart(64, '0') + 
          '1'.padStart(64, '0'); // Minimal amount
        
        testParams = {
          from: fromAddress,
          to: tokenAddress,
          data: transferData,
        };
      }
      
      // Test gas estimation
      const gasEstimate = await window.ethereum.request({
        method: 'eth_estimateGas',
        params: [testParams]
      });
      
      this.log('info', 'tx-test', 'Gas estimation successful', {
        currency,
        gasEstimate,
        testParams
      });
      
      return true;
    } catch (error: any) {
      this.log('error', 'tx-test', 'Transaction capability test failed', { 
        currency, 
        error: error?.message || 'Unknown error'
      });
      return false;
    }
  }
  
  static getLogs(): DebugLog[] {
    return [...this.logs];
  }
  
  static getLogsAsString(): string {
    return this.logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      return `[${timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`;
    }).join('\n');
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static exportDebugReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      walletAccess: localStorage.getItem('walletAccess'),
      connectedUser: localStorage.getItem('connectedUser'),
      logs: this.logs
    };
    
    return JSON.stringify(report, null, 2);
  }
}

export default TransactionDebugger;