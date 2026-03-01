import { defineChain } from "thirdweb/chains";

// Uses publicnode.com — purpose-built for public browser access with full CORS support.
// Bypasses Thirdweb's authenticated RPC gateway to avoid 401 errors from domain restrictions.
// publicnode.com confirmed: 200 OK, Access-Control-Allow-Origin: *, no API key required.
export const bsc = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpc: "https://bsc-rpc.publicnode.com",
  blockExplorers: [
    {
      name: "BscScan",
      url: "https://bscscan.com",
      apiUrl: "https://api.bscscan.com/api",
    },
  ],
});
