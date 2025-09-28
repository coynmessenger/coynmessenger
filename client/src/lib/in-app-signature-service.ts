import { type Wallet } from "thirdweb/wallets";

export interface SignatureRequest {
  id: string;
  type: 'connect' | 'transaction' | 'message';
  title: string;
  description: string;
  details?: {
    amount?: string;
    token?: string;
    recipient?: string;
    message?: string;
    domain?: string;
  };
  wallet: {
    name: string;
    address: string;
    icon?: string;
  };
}

type SignatureRequestHandler = (request: SignatureRequest) => Promise<boolean>;

class InAppSignatureService {
  private signatureHandler: SignatureRequestHandler | null = null;
  private pendingSignatures: Map<string, {
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
  }> = new Map();

  setSignatureHandler(handler: SignatureRequestHandler) {
    this.signatureHandler = handler;
  }

  async requestSignature(request: SignatureRequest): Promise<boolean> {
    if (!this.signatureHandler) {
      throw new Error('No signature handler registered');
    }

    return new Promise((resolve, reject) => {
      this.pendingSignatures.set(request.id, { resolve, reject });
      
      this.signatureHandler!(request)
        .then((approved) => {
          const pending = this.pendingSignatures.get(request.id);
          if (pending) {
            pending.resolve(approved);
            this.pendingSignatures.delete(request.id);
          }
        })
        .catch((error) => {
          const pending = this.pendingSignatures.get(request.id);
          if (pending) {
            pending.reject(error);
            this.pendingSignatures.delete(request.id);
          }
        });
    });
  }

  cancelSignature(requestId: string) {
    const pending = this.pendingSignatures.get(requestId);
    if (pending) {
      pending.reject(new Error('Signature cancelled'));
      this.pendingSignatures.delete(requestId);
    }
  }

  // Helper to create wallet connection signature request
  createConnectionRequest(wallet: Wallet): SignatureRequest {
    const account = wallet.getAccount();
    const chain = wallet.getChain();
    
    return {
      id: `connect-${Date.now()}`,
      type: 'connect',
      title: 'Connect Wallet',
      description: 'Confirm connection to COYN Messenger with your wallet',
      details: {
        domain: window.location.hostname
      },
      wallet: {
        name: this.getWalletName(wallet),
        address: account?.address || '',
        icon: this.getWalletIcon(wallet)
      }
    };
  }

  // Helper to create transaction signature request
  createTransactionRequest(
    wallet: Wallet, 
    details: { amount: string; token: string; recipient: string }
  ): SignatureRequest {
    const account = wallet.getAccount();
    
    return {
      id: `transaction-${Date.now()}`,
      type: 'transaction',
      title: 'Confirm Transaction',
      description: 'Review and confirm this transaction',
      details,
      wallet: {
        name: this.getWalletName(wallet),
        address: account?.address || '',
        icon: this.getWalletIcon(wallet)
      }
    };
  }

  // Helper to create message signature request
  createMessageRequest(wallet: Wallet, message: string): SignatureRequest {
    const account = wallet.getAccount();
    
    return {
      id: `message-${Date.now()}`,
      type: 'message',
      title: 'Sign Message',
      description: 'Sign this message to verify your identity',
      details: {
        message
      },
      wallet: {
        name: this.getWalletName(wallet),
        address: account?.address || '',
        icon: this.getWalletIcon(wallet)
      }
    };
  }

  private getWalletName(wallet: Wallet): string {
    const id = wallet.id;
    
    const walletNames: Record<string, string> = {
      'io.metamask': 'MetaMask',
      'com.coinbase.wallet': 'Coinbase Wallet',
      'me.rainbow': 'Rainbow',
      'io.rabby': 'Rabby',
      'io.zerion.wallet': 'Zerion',
      'com.trustwallet.app': 'Trust Wallet',
      'com.bestwallet': 'Best Wallet',
      'walletConnect': 'WalletConnect'
    };
    
    return walletNames[id] || 'Wallet';
  }

  private getWalletIcon(wallet: Wallet): string | undefined {
    // Return appropriate wallet icon based on wallet ID
    // For now, we'll rely on the wallet's built-in icon handling
    return undefined;
  }
}

export const inAppSignatureService = new InAppSignatureService();