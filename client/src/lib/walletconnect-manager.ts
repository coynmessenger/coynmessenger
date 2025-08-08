// WalletConnect integration for Web3 wallet connections
// Browser-compatible implementation

// Add global polyfill for WalletConnect compatibility
if (typeof globalThis !== 'undefined' && typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}

// Dynamic imports to handle potential loading issues
let WalletConnect: any = null;
let QRCodeModal: any = null;
let WalletConnectProvider: any = null;

// Initialize WalletConnect modules safely
const initializeWalletConnectModules = async () => {
  try {
    if (!WalletConnect) {
      WalletConnect = (await import("@walletconnect/client")).default;
    }
    if (!QRCodeModal) {
      QRCodeModal = (await import("@walletconnect/qrcode-modal")).default;
    }
    if (!WalletConnectProvider) {
      WalletConnectProvider = (await import("@walletconnect/web3-provider")).default;
    }
    return { WalletConnect, QRCodeModal, WalletConnectProvider };
  } catch (error) {
    console.error("Failed to initialize WalletConnect modules:", error);
    throw new Error("WalletConnect not available in this environment");
  }
};

export interface WalletConnectConfig {
  bridge: string;
  qrcodeModal: any;
  rpc: {
    [chainId: number]: string;
  };
  chainId: number;
  accounts?: string[];
}

export interface WalletConnectSession {
  connected: boolean;
  accounts: string[];
  chainId: number;
  peerId: string;
  peerMeta: {
    description: string;
    url: string;
    icons: string[];
    name: string;
  };
}

class WalletConnectManager {
  private connector: any = null;
  private provider: any = null;
  private config: WalletConnectConfig;
  private modulesInitialized = false;

  constructor() {
    this.config = {
      bridge: "https://bridge.walletconnect.org",
      qrcodeModal: null, // Will be set during initialization
      rpc: {
        1: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID", // Ethereum
        56: "https://bsc-dataseed.binance.org/", // BSC
        137: "https://polygon-rpc.com/", // Polygon
      },
      chainId: 56, // Default to BSC for COYN
    };
  }

  // Initialize WalletConnect session
  async initializeWalletConnect(): Promise<any> {
    try {
      // Initialize modules if not already done
      if (!this.modulesInitialized) {
        const modules = await initializeWalletConnectModules();
        this.config.qrcodeModal = modules.QRCodeModal;
        this.modulesInitialized = true;
      }

      // Kill existing session if any
      if (this.connector?.connected) {
        await this.disconnect();
      }

      // Create new connector
      this.connector = new WalletConnect({
        bridge: this.config.bridge,
        qrcodeModal: this.config.qrcodeModal,
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log("WalletConnect initialized");
      return this.connector;
    } catch (error) {
      console.error("Failed to initialize WalletConnect:", error);
      throw error;
    }
  }

  // Create WalletConnect provider
  async createProvider(): Promise<any> {
    try {
      // Initialize modules if not already done
      if (!this.modulesInitialized) {
        await initializeWalletConnectModules();
        this.modulesInitialized = true;
      }

      this.provider = new WalletConnectProvider({
        bridge: this.config.bridge,
        qrcodeModal: this.config.qrcodeModal,
        rpc: this.config.rpc,
        chainId: this.config.chainId,
      });

      // Enable session (triggers QR Code modal)
      await this.provider.enable();

      console.log("WalletConnect provider created and enabled");
      return this.provider;
    } catch (error) {
      console.error("Failed to create WalletConnect provider:", error);
      throw error;
    }
  }

  // Connect to WalletConnect
  async connect(): Promise<WalletConnectSession> {
    try {
      if (!this.connector) {
        await this.initializeWalletConnect();
      }

      // Check if already connected
      if (this.connector!.connected) {
        return this.getSession();
      }

      // Create session
      await this.connector!.createSession();

      // Wait for connection
      return new Promise((resolve, reject) => {
        this.connector!.on("connect", (error, payload) => {
          if (error) {
            reject(error);
            return;
          }

          const { accounts, chainId, peerId, peerMeta } = payload.params[0];
          const session: WalletConnectSession = {
            connected: true,
            accounts,
            chainId,
            peerId,
            peerMeta: peerMeta || {
              description: "",
              url: "",
              icons: [],
              name: "Unknown Wallet"
            },
          };

          console.log("WalletConnect connected:", session);
          resolve(session);
        });

        // Handle session rejection
        this.connector!.on("session_reject", (error) => {
          console.error("WalletConnect session rejected:", error);
          reject(new Error("Session rejected by user"));
        });

        // Timeout after 2 minutes
        setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 120000);
      });
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      throw error;
    }
  }

  // Get current session info
  getSession(): WalletConnectSession {
    if (!this.connector?.connected) {
      throw new Error("WalletConnect not connected");
    }

    return {
      connected: this.connector.connected,
      accounts: this.connector.accounts,
      chainId: this.connector.chainId,
      peerId: this.connector.peerId,
      peerMeta: this.connector.peerMeta || {
        description: "",
        url: "",
        icons: [],
        name: "Unknown Wallet"
      },
    };
  }

  // Sign message with WalletConnect
  async signMessage(message: string, address: string): Promise<string> {
    try {
      if (!this.connector?.connected) {
        throw new Error("WalletConnect not connected");
      }

      const signature = await this.connector.signMessage([address, message]);
      console.log("Message signed via WalletConnect:", signature);
      return signature;
    } catch (error) {
      console.error("Failed to sign message via WalletConnect:", error);
      throw error;
    }
  }

  // Sign personal message
  async signPersonalMessage(message: string, address: string): Promise<string> {
    try {
      if (!this.connector?.connected) {
        throw new Error("WalletConnect not connected");
      }

      const signature = await this.connector.signPersonalMessage([message, address]);
      console.log("Personal message signed via WalletConnect:", signature);
      return signature;
    } catch (error) {
      console.error("Failed to sign personal message via WalletConnect:", error);
      throw error;
    }
  }

  // Send transaction
  async sendTransaction(transaction: any): Promise<string> {
    try {
      if (!this.connector?.connected) {
        throw new Error("WalletConnect not connected");
      }

      const txHash = await this.connector.sendTransaction(transaction);
      console.log("Transaction sent via WalletConnect:", txHash);
      return txHash;
    } catch (error) {
      console.error("Failed to send transaction via WalletConnect:", error);
      throw error;
    }
  }

  // Switch network
  async switchNetwork(chainId: number): Promise<void> {
    try {
      if (!this.connector?.connected) {
        throw new Error("WalletConnect not connected");
      }

      await this.connector.sendCustomRequest({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      console.log(`Switched to network: ${chainId}`);
    } catch (error) {
      console.error("Failed to switch network:", error);
      throw error;
    }
  }

  // Disconnect WalletConnect
  async disconnect(): Promise<void> {
    try {
      if (this.connector?.connected) {
        await this.connector.killSession();
      }

      if (this.provider) {
        await this.provider.disconnect();
      }

      this.connector = null;
      this.provider = null;

      // Clear QR modal
      if (this.config.qrcodeModal) {
        this.config.qrcodeModal.close();
      }

      console.log("WalletConnect disconnected");
    } catch (error) {
      console.error("Failed to disconnect WalletConnect:", error);
      throw error;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.connector?.connected || false;
  }

  // Get connected accounts
  getAccounts(): string[] {
    return this.connector?.accounts || [];
  }

  // Get current chain ID
  getChainId(): number {
    return this.connector?.chainId || this.config.chainId;
  }

  // Setup event listeners
  private setupEventListeners(): void {
    if (!this.connector) return;

    this.connector.on("session_update", (error, payload) => {
      if (error) {
        console.error("WalletConnect session update error:", error);
        return;
      }

      const { accounts, chainId } = payload.params[0];
      console.log("WalletConnect session updated:", { accounts, chainId });
    });

    this.connector.on("disconnect", (error, payload) => {
      if (error) {
        console.error("WalletConnect disconnect error:", error);
      }

      console.log("WalletConnect disconnected:", payload);
      this.connector = null;
      this.provider = null;
    });
  }

  // Get wallet info from peer meta
  getWalletInfo(): { name: string; icon: string } | null {
    if (!this.connector?.connected || !this.connector.peerMeta) {
      return null;
    }

    const { name, icons } = this.connector.peerMeta;
    return {
      name: name || "Unknown Wallet",
      icon: icons?.[0] || "",
    };
  }
}

// Export singleton instance
export const walletConnectManager = new WalletConnectManager();
export default walletConnectManager;