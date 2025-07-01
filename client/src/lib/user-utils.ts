import type { User } from "@shared/schema";

// Centralized utility function to get effective display name
export function getEffectiveDisplayName(user: User): string {
  // Priority: 1. Profile display name (most recent), 2. Sign-in name, 3. @id format
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
  // Ultimate fallback
  return user.displayName || user.username || "Unknown User";
}

// Utility to get user initials for avatars
export function getUserInitials(user: User): string {
  const displayName = getEffectiveDisplayName(user);
  return displayName.charAt(0).toUpperCase();
}

// Utility to format wallet address for display
export function formatWalletAddress(address: string, truncate: boolean = true): string {
  if (!address) return '';
  
  if (truncate && address.length > 10) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return address;
}