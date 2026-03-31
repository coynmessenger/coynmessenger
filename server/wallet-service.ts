import { ethers } from 'ethers';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const BSC_RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
];

const TOKEN_CONTRACTS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  COYN: '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1',
};

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

function getEncryptionKey(): Buffer {
  const keyHex = process.env.WALLET_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }
  return Buffer.from(keyHex, 'hex');
}

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpc of BSC_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const network = await provider.getNetwork();
      if (network.chainId !== 56n) {
        console.warn(`RPC ${rpc} returned wrong chainId ${network.chainId} (expected 56), skipping...`);
        continue;
      }
      return provider;
    } catch {
      console.warn(`RPC ${rpc} unavailable, trying next...`);
    }
  }
  throw new Error('All BSC RPC endpoints are unavailable');
}

export function generateWallet(): { address: string; privateKey: string } {
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encHex] = encryptedData.split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted private key format');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

export async function getOnChainBalance(
  walletAddress: string,
  currency: 'BNB' | 'USDT' | 'COYN'
): Promise<string> {
  const provider = await getProvider();
  if (currency === 'BNB') {
    const balance = await provider.getBalance(walletAddress);
    return ethers.formatEther(balance);
  }
  const tokenAddress = TOKEN_CONTRACTS[currency];
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await contract.balanceOf(walletAddress);
  return ethers.formatUnits(balance, 18);
}

export async function sendBNBInternal(
  encryptedPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ transactionHash: string }> {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const provider = await getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  const amountWei = ethers.parseEther(amount);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
  const gasCost = gasPrice * 21000n;

  const bnbBalance = await provider.getBalance(wallet.address);
  const totalRequired = amountWei + gasCost;
  if (bnbBalance < totalRequired) {
    const formatted = ethers.formatEther(bnbBalance);
    const required = ethers.formatEther(totalRequired);
    throw new Error(
      `Insufficient on-chain BNB. Wallet has ${formatted} BNB but needs ${required} BNB (including gas). ` +
      `Please deposit BNB to your COYN wallet: ${wallet.address}`
    );
  }

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: amountWei,
    gasLimit: 21000n,
    gasPrice,
  });

  const receipt = await tx.wait();
  if (!receipt) throw new Error('No receipt received from BSC network');
  return { transactionHash: receipt.hash };
}

export async function sendERC20Internal(
  encryptedPrivateKey: string,
  tokenSymbol: 'USDT' | 'COYN',
  toAddress: string,
  amount: string
): Promise<{ transactionHash: string }> {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const provider = await getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  const tokenAddress = TOKEN_CONTRACTS[tokenSymbol];
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  const amountWei = ethers.parseUnits(amount, 18);

  const tokenBalance = await contract.balanceOf(wallet.address);
  if (tokenBalance < amountWei) {
    const formatted = ethers.formatUnits(tokenBalance, 18);
    throw new Error(
      `Insufficient on-chain ${tokenSymbol}. Wallet has ${formatted} ${tokenSymbol} on BSC but needs ${amount}. ` +
      `Please deposit real ${tokenSymbol} to your COYN wallet: ${wallet.address}`
    );
  }

  const bnbBalance = await provider.getBalance(wallet.address);
  const estimatedGas = await contract.transfer.estimateGas(toAddress, amountWei);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
  const gasCost = estimatedGas * gasPrice;

  if (bnbBalance < gasCost) {
    const formatted = ethers.formatEther(bnbBalance);
    const required = ethers.formatEther(gasCost);
    throw new Error(
      `Insufficient BNB for gas. Wallet has ${formatted} BNB but needs ~${required} BNB for fees. ` +
      `Please deposit BNB to your COYN wallet: ${wallet.address}`
    );
  }

  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('No receipt received from BSC network');
  return { transactionHash: receipt.hash };
}

// Platform wallet — used to sign all user-to-user on-chain transfers so users
// never need to fund their internal wallets themselves.
// Requires PLATFORM_WALLET_KEY env var (raw BSC private key, not encrypted).
function getPlatformWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const key = process.env.PLATFORM_WALLET_KEY;
  if (!key) throw new Error('PLATFORM_WALLET_KEY is not set — cannot broadcast on-chain');
  return new ethers.Wallet(key.startsWith('0x') ? key : `0x${key}`, provider);
}

export async function platformSendBNB(
  toAddress: string,
  amount: string
): Promise<{ transactionHash: string; fromAddress: string }> {
  const provider = await getProvider();
  const wallet = getPlatformWallet(provider);

  const amountWei = ethers.parseEther(amount);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
  const gasCost = gasPrice * 21000n;

  const bnbBalance = await provider.getBalance(wallet.address);
  if (bnbBalance < amountWei + gasCost) {
    const have = ethers.formatEther(bnbBalance);
    const need = ethers.formatEther(amountWei + gasCost);
    throw new Error(`Platform wallet low on BNB: has ${have}, needs ${need} (amount + gas)`);
  }

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: amountWei,
    gasLimit: 21000n,
    gasPrice,
  });
  const receipt = await tx.wait();
  if (!receipt) throw new Error('No receipt from BSC network');
  return { transactionHash: receipt.hash, fromAddress: wallet.address };
}

export async function platformSendERC20(
  tokenSymbol: 'USDT' | 'COYN',
  toAddress: string,
  amount: string
): Promise<{ transactionHash: string; fromAddress: string }> {
  const provider = await getProvider();
  const wallet = getPlatformWallet(provider);

  const tokenAddress = TOKEN_CONTRACTS[tokenSymbol];
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const amountWei = ethers.parseUnits(amount, 18);

  const tokenBalance = await contract.balanceOf(wallet.address);
  if (tokenBalance < amountWei) {
    const have = ethers.formatUnits(tokenBalance, 18);
    throw new Error(`Platform wallet has insufficient ${tokenSymbol}: has ${have}, needs ${amount}`);
  }

  const estimatedGas = await contract.transfer.estimateGas(toAddress, amountWei);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');
  const gasCost = estimatedGas * gasPrice;

  const bnbBalance = await provider.getBalance(wallet.address);
  if (bnbBalance < gasCost) {
    const have = ethers.formatEther(bnbBalance);
    const need = ethers.formatEther(gasCost);
    throw new Error(`Platform wallet needs BNB for gas: has ${have}, needs ~${need}`);
  }

  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('No receipt from BSC network');
  return { transactionHash: receipt.hash, fromAddress: wallet.address };
}

export function hasPlatformWallet(): boolean {
  return !!process.env.PLATFORM_WALLET_KEY;
}
