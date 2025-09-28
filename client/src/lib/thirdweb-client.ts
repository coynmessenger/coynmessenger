import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Create thirdweb client
// You need to replace "your_client_id_here" with your actual client ID from https://thirdweb.com/dashboard
export const thirdwebClient = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your_client_id_here", // Get this from thirdweb dashboard
});

// Define BSC chain with proper thirdweb format
export const bscChain = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpc: "https://bsc-dataseed1.binance.org/",
  blockExplorers: [
    {
      name: "BscScan",
      url: "https://bscscan.com",
    },
  ],
});

// Default chain (BSC for COYN token)
export const defaultChain = bscChain;