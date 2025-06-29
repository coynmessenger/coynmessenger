import { queryClient } from "./queryClient";

export interface ProfileUpdate {
  userId: number;
  displayName?: string;
  profilePicture?: string;
  signInName?: string;
}

/**
 * Synchronizes profile changes across all components in the messenger app.
 * This function invalidates all relevant React Query caches and updates localStorage
 * to ensure profile changes are reflected everywhere.
 */
export async function syncProfileUpdate(profileUpdate: ProfileUpdate) {
  const { userId, displayName, profilePicture, signInName } = profileUpdate;
  
  console.log("Syncing profile update:", profileUpdate);
  
  // Update localStorage for current user if this is their profile
  const connectedUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
  if (connectedUser.id === userId) {
    const updatedUser = { 
      ...connectedUser,
      ...(displayName && { displayName }),
      ...(profilePicture && { profilePicture }),
      ...(signInName && { signInName })
    };
    localStorage.setItem('connectedUser', JSON.stringify(updatedUser));
    
    // Dispatch custom event for components that listen to localStorage changes
    window.dispatchEvent(new CustomEvent('profileUpdated', { 
      detail: updatedUser 
    }));
  }
  
  // Invalidate all user-related queries to trigger fresh data fetching
  const queriesToInvalidate = [
    // User data queries
    ['/api/user'],
    [`/api/user/${userId}`],
    ['/api/user', userId],
    
    // Conversations queries (to update profile data in conversations)
    ['/api/conversations'],
    
    // Users list queries (for contact lists)
    ['/api/users'],
    
    // Messages queries (to update sender profile data)
    ['/api/conversations', undefined, 'messages'],
    
    // Group member queries
    ['/api/groups'],
    
    // Any other queries that might contain user profile data
    ['/api/wallet/balances'],
  ];
  
  // Invalidate all relevant queries
  for (const queryKey of queriesToInvalidate) {
    await queryClient.invalidateQueries({ queryKey });
  }
  
  // Force refresh of specific queries that might be cached
  await queryClient.refetchQueries({ 
    predicate: (query) => {
      const key = query.queryKey;
      return (
        key.some(k => typeof k === 'string' && (
          k.includes('/api/user') ||
          k.includes('/api/conversations') ||
          k.includes('/api/messages') ||
          k.includes('/api/users')
        ))
      );
    }
  });
  
  console.log("Profile sync completed for user:", userId);
}

/**
 * Utility function to get effective display name with fallback logic
 */
export function getEffectiveDisplayName(user: any): string {
  if (!user) return "Unknown User";
  
  // Priority: signInName -> displayName -> @id fallback
  if (user.signInName && user.signInName.trim()) {
    return user.signInName;
  }
  
  if (user.displayName && user.displayName.trim() && user.displayName !== "COYNUSER") {
    return user.displayName;
  }
  
  // Generate @id fallback from wallet address
  if (user.walletAddress) {
    const cleanAddress = user.walletAddress.replace('0x', '');
    return `@${cleanAddress.slice(-6)}`;
  }
  
  return user.username || "Unknown User";
}

/**
 * Hook to listen for profile updates and refresh component state
 */
export function useProfileSync() {
  const handleProfileUpdate = (event: CustomEvent) => {
    console.log("Profile update received:", event.detail);
    // Components can listen to this event to update their local state
  };
  
  // Add event listener on mount
  if (typeof window !== 'undefined') {
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }
}