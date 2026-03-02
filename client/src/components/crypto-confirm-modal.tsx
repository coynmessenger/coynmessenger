import { useState, useEffect } from "react";
import { useSendTransaction, useActiveWallet } from "thirdweb/react";
import { useActiveAccount } from "thirdweb/react";
import { prepareContractCall, prepareTransaction, getContract, toWei, toUnits } from "thirdweb";
import { bsc } from "@/lib/bsc-chain";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

const TOKEN_CONTRACTS: Record<string, string> = {
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  COYN: "0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1",
};

const WALLET_DEEP_LINKS: Record<string, string> = {
  "io.metamask": "metamask://",
  "com.trustwallet.app": "trust://",
  "com.coinbase.wallet": "cbwallet://",
  "com.bitget.web3": "bitkeep://",
  "io.rabby": "rabby://",
};

const WALLET_NAMES: Record<string, string> = {
  "io.metamask": "MetaMask",
  "com.trustwallet.app": "Trust Wallet",
  "com.coinbase.wallet": "Coinbase Wallet",
  "com.bitget.web3": "Bitget Wallet",
  "io.rabby": "Rabby",
  "walletConnect": "WalletConnect",
};

type TxStatus = "idle" | "fetching" | "ready" | "approving" | "broadcasting" | "confirmed" | "error";

interface CryptoConfirmModalProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  amount: string;
  toUserId: number;
  recipientDisplayName: string;
  conversationId?: number;
  senderId: number;
  onSuccess?: (txHash: string) => void;
}

function getCurrencyIcon(currency: string) {
  if (currency === "BNB") return "🟡";
  if (currency === "USDT") return "💵";
  if (currency === "COYN") return "🪙";
  return "💰";
}

export default function CryptoConfirmModal({
  open,
  onClose,
  currency,
  amount,
  toUserId,
  recipientDisplayName,
  conversationId,
  senderId,
  onSuccess,
}: CryptoConfirmModalProps) {
  const { toast } = useToast();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { mutateAsync: sendTx } = useSendTransaction();

  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [internalAddress, setInternalAddress] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const walletId = activeWallet?.id || localStorage.getItem("connectedWalletId") || "";
  const walletName = WALLET_NAMES[walletId] || "Your Wallet";

  useEffect(() => {
    if (!open || !toUserId) return;
    setTxStatus("fetching");
    setInternalAddress("");
    setTxHash("");
    setErrorMsg("");

    fetch(`/api/wallet/internal-address?userId=${toUserId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch recipient address");
        return r.json();
      })
      .then((data) => {
        setInternalAddress(data.walletAddress);
        setTxStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Could not load recipient wallet address");
        setTxStatus("error");
      });
  }, [open, toUserId]);

  const copyAddress = () => {
    if (!internalAddress) return;
    navigator.clipboard.writeText(internalAddress);
    toast({ title: "Address Copied", description: "Wallet address copied to clipboard" });
  };

  const openWalletApp = () => {
    const deepLink = WALLET_DEEP_LINKS[walletId];
    if (deepLink) window.open(deepLink, "_blank");
  };

  const handleApprove = async () => {
    if (!activeAccount) {
      toast({
        title: "Wallet not connected",
        description: "Please reconnect your wallet on the home page.",
        variant: "destructive",
      });
      return;
    }
    if (!internalAddress) {
      toast({ title: "Address missing", description: "Recipient address not loaded yet.", variant: "destructive" });
      return;
    }

    setTxStatus("approving");
    setErrorMsg("");
    openWalletApp();

    try {
      let tx;
      if (currency === "BNB") {
        tx = prepareTransaction({
          client: thirdwebClient,
          chain: bsc,
          to: internalAddress,
          value: toWei(amount),
        });
      } else {
        const tokenAddress = TOKEN_CONTRACTS[currency];
        if (!tokenAddress) throw new Error(`Unsupported currency: ${currency}`);
        const contract = getContract({ client: thirdwebClient, chain: bsc, address: tokenAddress });
        tx = prepareContractCall({
          contract,
          method: "function transfer(address to, uint256 amount) returns (bool)",
          params: [internalAddress, toUnits(amount, 18)],
        });
      }

      setTxStatus("broadcasting");
      const result = await sendTx(tx);
      const hash = result.transactionHash;
      setTxHash(hash);

      await apiRequest("POST", "/api/wallet/record-transfer", {
        fromUserId: senderId,
        toUserId,
        currency,
        amount,
        transactionHash: hash,
        conversationId,
      });

      setTxStatus("confirmed");
      onSuccess?.(hash);
    } catch (err: any) {
      console.error("❌ CryptoConfirmModal tx error:", err);
      const msg = err?.message || "Transaction failed. Please try again.";
      setErrorMsg(
        msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("4001")
          ? "You rejected the transaction in your wallet."
          : msg.includes("insufficient funds") || msg.includes("Insufficient")
          ? "Insufficient funds. Make sure you have enough token and BNB for gas."
          : msg
      );
      setTxStatus("error");
    }
  };

  const handleClose = () => {
    if (txStatus === "approving" || txStatus === "broadcasting") return;
    setTxStatus("idle");
    setInternalAddress("");
    setTxHash("");
    setErrorMsg("");
    onClose();
  };

  const isPending = txStatus === "approving" || txStatus === "broadcasting";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[92vw] sm:w-[85vw] max-w-sm max-h-[90vh] m-3 sm:m-6 p-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex flex-col rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">Confirm</span>
            <span className="text-yellow-500 dark:text-yellow-400">{currency}</span>
            <span>{getCurrencyIcon(currency)}</span>
            <span className="text-blue-600 dark:text-blue-400">Transfer</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {txStatus === "confirmed" ? (
            <ConfirmedView hash={txHash} amount={amount} currency={currency} onClose={handleClose} />
          ) : txStatus === "error" ? (
            <ErrorView
              message={errorMsg}
              onRetry={() => { setTxStatus("ready"); setErrorMsg(""); }}
              onClose={handleClose}
            />
          ) : (
            <>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 space-y-3 border border-gray-100 dark:border-slate-700">
                <Row label="Amount">
                  <span className="text-lg font-bold text-black dark:text-white">
                    {amount} {currency}
                  </span>
                </Row>
                <Row label="Sending via">
                  <span className="text-sm font-medium text-blue-500">{walletName}</span>
                </Row>
                <Row label="Network">
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">BSC (Binance Smart Chain)</span>
                </Row>
                <Row label="Recipient">
                  <span className="text-sm font-semibold text-black dark:text-white">
                    {recipientDisplayName}
                  </span>
                </Row>

                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Wallet Address:</span>
                    {internalAddress && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-7 px-2 text-blue-500 hover:text-blue-600 dark:text-blue-400"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                    )}
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-gray-200 dark:border-slate-600 min-h-[2.5rem] flex items-center">
                    {txStatus === "fetching" ? (
                      <span className="flex items-center gap-2 text-gray-400 text-xs">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading address…
                      </span>
                    ) : (
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                        {internalAddress}
                      </code>
                    )}
                  </div>
                </div>
              </div>

              {txStatus === "broadcasting" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Broadcasting to BSC… please wait
                  </p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-yellow-900/20 border border-amber-200 dark:border-yellow-700/60 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-yellow-200 leading-relaxed">
                  <strong>⚠️ Important:</strong> This transaction cannot be reversed. Please verify all details before confirming.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleApprove}
                  disabled={isPending || txStatus === "fetching" || !internalAddress}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txStatus === "approving" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Approve in {walletName}…
                    </span>
                  ) : txStatus === "broadcasting" ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Broadcasting…
                    </span>
                  ) : (
                    `Approve in ${walletName}`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 h-12 border-gray-300 dark:border-slate-600 text-black dark:text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}:</span>
      <div>{children}</div>
    </div>
  );
}

function ConfirmedView({ hash, amount, currency, onClose }: { hash: string; amount: string; currency: string; onClose: () => void }) {
  const { toast } = useToast();
  return (
    <div className="text-center space-y-4 py-2">
      <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
      <div>
        <p className="text-lg font-bold text-black dark:text-white">Transaction Confirmed!</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {amount} {currency} sent on BSC
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Transaction Hash</p>
        <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{hash}</code>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-10 rounded-xl text-sm"
          onClick={() => window.open(`https://bscscan.com/tx/${hash}`, "_blank")}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-2" />
          View on BSCScan
        </Button>
        <Button
          className="flex-1 h-10 rounded-xl text-sm bg-orange-500 hover:bg-orange-600 text-white"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

function ErrorView({ message, onRetry, onClose }: { message: string; onRetry: () => void; onClose: () => void }) {
  return (
    <div className="text-center space-y-4 py-2">
      <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />
      <div>
        <p className="text-lg font-bold text-black dark:text-white">Transaction Failed</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-10 rounded-xl text-sm"
          onClick={onRetry}
        >
          Try Again
        </Button>
        <Button
          className="flex-1 h-10 rounded-xl text-sm bg-orange-500 hover:bg-orange-600 text-white"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
