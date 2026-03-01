// Clears all Thirdweb and WalletConnect session data from localStorage
// so no stale wallet is auto-reconnected on the next sign-in.
export function clearAllWalletSessions() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("tw:") ||
      key.startsWith("thirdweb") ||
      key.startsWith("wc@") ||
      key.startsWith("wc2@") ||
      key.startsWith("WalletConnect") ||
      key.startsWith("walletlink") ||
      key.startsWith("WALLETCONNECT") ||
      key === "-walletlink:https://www.walletlink.org:session:id" ||
      key === "-walletlink:https://www.walletlink.org:session:secret"
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
