import { defineChain } from "thirdweb/chains";

// Uses public BSC RPC endpoints directly — bypasses Thirdweb's authenticated
// RPC gateway to avoid 401 errors from domain restrictions on the Client ID.
// Fallback list (try in order if primary is unavailable):
//   https://bsc-rpc.publicnode.com
//   https://bsc-dataseed1.binance.org
//   https://bsc-dataseed2.binance.org
//   https://bsc-dataseed.binance.org
//   https://rpc.ankr.com/bsc
export const bsc = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpc: "https://bsc-dataseed1.binance.org",
  blockExplorers: [
    {
      name: "BscScan",
      url: "https://bscscan.com",
      apiUrl: "https://api.bscscan.com/api",
    },
  ],
});
