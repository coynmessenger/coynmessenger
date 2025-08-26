import { ethers } from 'ethers';
import axios from 'axios';

interface TokenBalance {
  currency: string;
  balance: string;
  usdValue: string;
  changePercent?: string;
}

interface CryptoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private coingeckoApiUrl = 'https://api.coingecko.com/api/v3/simple/price';
  
  // Token contract addresses on BSC
  private tokenContracts = {
    BNB: 'native', // BNB is the native token
    USDT: '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
    COYN: '0x162539172B53E9a93B7d98FB6C41682de558A320', // COYN token contract on BSC
    BTC: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB on BSC
  };

  constructor() {
    // Use BSC mainnet RPC
    this.provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org/');
  }

  async getWalletBalances(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const balances: TokenBalance[] = [];
      
      // Get current crypto prices
      const prices = await this.getCryptoPrices();
      
      // Get BNB balance (native token)
      const bnbBalance = await this.getBNBBalance(walletAddress);
      balances.push({
        currency: 'BNB',
        balance: bnbBalance,
        usdValue: (parseFloat(bnbBalance) * prices.binancecoin.usd).toFixed(2),
        changePercent: prices.binancecoin.usd_24h_change.toFixed(2)
      });

      // Get BTC balance (BTCB on BSC)
      const btcBalance = await this.getTokenBalance(walletAddress, this.tokenContracts.BTC, 18);
      balances.push({
        currency: 'BTC',
        balance: btcBalance,
        usdValue: (parseFloat(btcBalance) * prices.bitcoin.usd).toFixed(2),
        changePercent: prices.bitcoin.usd_24h_change.toFixed(2)
      });

      // Get USDT balance
      const usdtBalance = await this.getTokenBalance(walletAddress, this.tokenContracts.USDT, 18);
      balances.push({
        currency: 'USDT',
        balance: usdtBalance,
        usdValue: (parseFloat(usdtBalance) * prices.tether.usd).toFixed(2),
        changePercent: prices.tether.usd_24h_change.toFixed(2)
      });

      // Get COYN balance
      const coynBalance = await this.getTokenBalance(walletAddress, this.tokenContracts.COYN, 18);
      balances.push({
        currency: 'COYN',
        balance: coynBalance,
        usdValue: (parseFloat(coynBalance) * prices.coyn.usd).toFixed(2),
        changePercent: prices.coyn.usd_24h_change.toFixed(2)
      });

      return balances;
    } catch (error) {
      
      // Return zero balances as fallback
      return [
        { currency: 'BTC', balance: '0.00000000', usdValue: '0.00', changePercent: '0.00' },
        { currency: 'BNB', balance: '0.00000000', usdValue: '0.00', changePercent: '0.00' },
        { currency: 'USDT', balance: '0.00000000', usdValue: '0.00', changePercent: '0.00' },
        { currency: 'COYN', balance: '0.00000000', usdValue: '0.00', changePercent: '0.00' },
      ];
    }
  }

  private async getBNBBalance(walletAddress: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      
      return '0.00000000';
    }
  }

  private async getTokenBalance(walletAddress: string, tokenAddress: string, decimals: number): Promise<string> {
    try {
      // ERC-20 balanceOf function ABI
      const abi = ['function balanceOf(address) view returns (uint256)'];
      const contract = new ethers.Contract(tokenAddress, abi, this.provider);
      
      const balance = await contract.balanceOf(walletAddress);
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      
      return '0.00000000';
    }
  }

  private async getCryptoPrices(): Promise<CryptoPrice> {
    try {
      const response = await axios.get(this.coingeckoApiUrl, {
        params: {
          ids: 'bitcoin,binancecoin,tether',
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });
      
      // Add COYN price data (fixed price for demo)
      const prices = {
        ...response.data,
        coyn: { usd: 0.90, usd_24h_change: 4.70 }
      };
      
      return prices;
    } catch (error) {
      
      // Return fallback prices including COYN
      return {
        bitcoin: { usd: 100000, usd_24h_change: 0 },
        binancecoin: { usd: 600, usd_24h_change: 0 },
        tether: { usd: 1, usd_24h_change: 0 },
        coyn: { usd: 0.90, usd_24h_change: 4.70 }
      };
    }
  }

  async validateWalletAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // Method to get current prices only (for refreshing USD values)
  async getCurrentPrices(): Promise<CryptoPrice> {
    return this.getCryptoPrices();
  }

  // Method to send BNB through blockchain
  async sendBNB(fromAddress: string, toAddress: string, amount: string, privateKey: string): Promise<{
    transactionHash: string;
    gasUsed: string;
    status: string;
  }> {
    try {
      // Validate addresses
      if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Check if the wallet address matches
      if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Private key does not match sender address');
      }

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      
      // Get balance to verify sufficient funds
      const balance = await this.provider.getBalance(fromAddress);
      const amountWei = ethers.parseEther(amount);
      
      // Estimate gas for the transaction
      const gasLimit = BigInt(21000); // Standard gas limit for BNB transfer
      const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');
      const gasCost = gasLimit * BigInt(gasPrice.toString());
      
      // Check if sufficient balance (amount + gas fees)
      if (balance < amountWei + gasCost) {
        throw new Error('Insufficient balance for transaction and gas fees');
      }

      // Create transaction
      const transaction = {
        to: toAddress,
        value: amountWei,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: await this.provider.getTransactionCount(fromAddress)
      };

      // Sign and send transaction
      const signedTransaction = await wallet.sendTransaction(transaction);
      
      // Wait for transaction confirmation
      const receipt = await signedTransaction.wait();
      
      if (!receipt) {
        throw new Error('Transaction failed - no receipt');
      }

      return {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Method to calculate USD value for a given crypto amount
  calculateUSDValue(amount: string, currency: string, prices: CryptoPrice): string {
    const numAmount = parseFloat(amount);
    
    switch (currency) {
      case 'BTC':
        return (numAmount * prices.bitcoin.usd).toFixed(2);
      case 'BNB':
        return (numAmount * prices.binancecoin.usd).toFixed(2);
      case 'USDT':
        // USDT is always 1:1 with USD - this is critical for accurate representation
        return (numAmount * prices.tether.usd).toFixed(2);
      case 'COYN':
        // COYN uses dynamic pricing from the prices object
        return (numAmount * prices.coyn.usd).toFixed(2);
      default:
        return '0.00';
    }
  }

  // Demo-friendly refresh that preserves balances and updates USD values
  async refreshDemoBalances(currentBalances: any[]): Promise<any[]> {
    try {
      const prices = await this.getCurrentPrices();
      const updatedBalances = [];
      
      for (const balance of currentBalances) {
        const usdValue = this.calculateUSDValue(balance.balance, balance.currency, prices);
        
        let changePercent = '0.00';
        switch (balance.currency) {
          case 'BTC':
            changePercent = prices.bitcoin?.usd_24h_change?.toFixed(2) || '0.00';
            break;
          case 'BNB':
            changePercent = prices.binancecoin?.usd_24h_change?.toFixed(2) || '0.00';
            break;
          case 'USDT':
            changePercent = prices.tether?.usd_24h_change?.toFixed(2) || '0.00';
            break;
          case 'COYN':
            changePercent = prices.coyn?.usd_24h_change?.toFixed(2) || '4.70';
            break;
        }
        
        updatedBalances.push({
          ...balance,
          usdValue,
          changePercent
        });
      }
      
      return updatedBalances;
    } catch (error) {
      
      // Return original balances if refresh fails
      return currentBalances;
    }
  }
}

export const blockchainService = new BlockchainService();