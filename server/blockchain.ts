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
    COYN: '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1', // COYN token contract on BSC
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
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return formattedBalance;
    } catch (error) {
      return '0.00000000';
    }
  }

  private async getCOYNPrice(): Promise<{usd: number, usd_24h_change: number}> {
    // Try multiple sources for COYN price data
    const sources = [
      {
        name: 'CoinBrain',
        fetch: async () => {
          const response = await axios.get('https://coinbrain.com/coins/bnb-0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
          });

          const html = response.data;
          
          // Extract price using more precise regex pattern from the HTML
          const priceMatch = html.match(/\$([0-9]+\.?[0-9]*(?:e-?[0-9]+)?)/i);
          const changeMatch = html.match(/\(24h:([+-]?[0-9]+\.?[0-9]*)%\)/i);
          
          let price = 0.000000050925;
          let change = -89.77;
          
          if (priceMatch) {
            const priceStr = priceMatch[1];
            price = parseFloat(priceStr);
          }
          
          if (changeMatch) {
            change = parseFloat(changeMatch[1]);
          }
          
          return { usd: price, usd_24h_change: change };
        }
      },
      {
        name: 'DEXScreener',
        fetch: async () => {
          const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1`, {
            timeout: 8000
          });
          
          const data = response.data;
          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];
            return {
              usd: parseFloat(pair.priceUsd || '0'),
              usd_24h_change: parseFloat(pair.priceChange24h || '0')
            };
          }
          throw new Error('No pairs data found');
        }
      }
    ];

    // Try each source in order
    for (const source of sources) {
      try {
        const result = await source.fetch();
        if (result.usd > 0) {
          console.log(`✅ COYN Price fetched from ${source.name}: $${result.usd} (${result.usd_24h_change}%)`);
          return result;
        }
      } catch (error) {
        console.log(`⚠️ Failed to fetch COYN price from ${source.name}`);
      }
    }
    
    console.log(`⚠️ All COYN price sources failed, using fallback price`);
    
    // Final fallback price based on coinbrain.com data
    return {
      usd: 0.000000050925,
      usd_24h_change: -89.77
    };
  }

  private async getCryptoPrices(): Promise<CryptoPrice> {
    try {
      // Fetch BNB and USDT prices from CoinGecko
      const coingeckoResponse = await axios.get(this.coingeckoApiUrl, {
        params: {
          ids: 'binancecoin,tether',
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });
      
      // Fetch COYN price from CoinBrain
      const coynPrice = await this.getCOYNPrice();
      
      const prices = {
        ...coingeckoResponse.data,
        coyn: coynPrice
      };
      
      return prices;
    } catch (error) {
      console.log(`⚠️ Failed to fetch crypto prices, using fallback values`);
      
      // Return fallback prices including COYN
      return {
        binancecoin: { usd: 600, usd_24h_change: 0 },
        tether: { usd: 1, usd_24h_change: 0 },
        coyn: { usd: 0.000000050925, usd_24h_change: -89.77 }
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