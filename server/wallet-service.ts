import { ethers } from 'ethers';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const BSC_RPCS = [
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
];

const TOKEN_CONTRACTS = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  COYN: '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1',
};

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

function getEncryptionKey(): Buffer {
  const keyHex = process.env.WALLET_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('WALLET_ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
  }
  return Buffer.from(keyHex, 'hex');
}

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BSC_RPCS[0]);
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

export async function sendBNBInternal(
  encryptedPrivateKey: string,
  toAddress: string,
  amount: string
): Promise<{ transactionHash: string }> {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  const amountWei = ethers.parseEther(amount);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits('5', 'gwei');

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
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);

  const tokenAddress = TOKEN_CONTRACTS[tokenSymbol];
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  const amountWei = ethers.parseUnits(amount, 18);
  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('No receipt received from BSC network');
  return { transactionHash: receipt.hash };
}
