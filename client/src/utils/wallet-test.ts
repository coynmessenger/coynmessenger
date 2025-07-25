// Quick wallet connection test utility
export const testWalletConnection = async () => {
  console.log('🧪 Testing Trust Wallet Demo Connection...');
  
  try {
    const response = await fetch('/api/users/find-or-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        displayName: 'Trust Wallet Demo User'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Connection failed:', error);
      return false;
    }
    
    const user = await response.json();
    console.log('✅ Connection successful:', user);
    
    // Test wallet access establishment
    const walletAccess = {
      address: user.walletAddress,
      balance: '0x2386f26fc10000',
      chainId: '0x38',
      authorized: true,
      provider: 'trust',
      timestamp: Date.now(),
      isDemoMode: true
    };
    
    localStorage.setItem('walletAccess', JSON.stringify(walletAccess));
    localStorage.setItem('walletConnected', 'true');
    localStorage.setItem('connectedUser', JSON.stringify(user));
    
    console.log('✅ Demo wallet access established');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};