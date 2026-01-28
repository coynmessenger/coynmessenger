import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowLeft, Check, Coins } from "lucide-react";
import { signatureCollector, type WalletAddressData, type ComprehensiveWalletData } from "@/lib/signature-collector";

interface WalletAddressSelectorProps {
  walletType: 'metamask' | 'trust';
  onAddressSelect: (address: string, walletData: ComprehensiveWalletData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function WalletAddressSelector({ 
  walletType, 
  onAddressSelect, 
  onBack, 
  isLoading = false 
}: WalletAddressSelectorProps) {
  const [addresses, setAddresses] = useState<WalletAddressData[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveWalletData | null>(null);

  useEffect(() => {
    loadWalletAddresses();
  }, [walletType]);

  const loadWalletAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      console.log(`Loading ${walletType} addresses...`);
      
      // First ensure wallet is connected
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Wallet not available');
      }

      // Get comprehensive wallet data
      const walletData = await signatureCollector.collectComprehensiveWalletData();
      setComprehensiveData(walletData);
      setAddresses(walletData.allAddresses);
      
      // Auto-select the primary address
      if (walletData.allAddresses.length > 0) {
        setSelectedAddress(walletData.primaryAddress);
      }
      
      console.log(`Found ${walletData.allAddresses.length} addresses in ${walletType}`);
    } catch (error) {
      console.error('Failed to load wallet addresses:', error);
      // Fallback to basic address retrieval
      try {
        const accounts = await window.ethereum?.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const fallbackAddresses = accounts.map((address: string) => ({
            address,
            balances: { btc: '0', bnb: '0', usdt: '0', coyn: '0' },
            isActive: address === accounts[0]
          }));
          setAddresses(fallbackAddresses);
          setSelectedAddress(accounts[0]);
        }
      } catch (fallbackError) {
        console.error('Fallback address loading also failed:', fallbackError);
      }
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddressSelect = (address: string) => {
    setSelectedAddress(address);
  };

  const handleConfirmSelection = () => {
    if (selectedAddress && comprehensiveData) {
      // Update the comprehensive data with selected address as primary
      const updatedData = {
        ...comprehensiveData,
        primaryAddress: selectedAddress,
        allAddresses: comprehensiveData.allAddresses.map(addr => ({
          ...addr,
          isActive: addr.address === selectedAddress
        }))
      };
      onAddressSelect(selectedAddress, updatedData);
    }
  };

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${currency}`;
    if (num < 0.001) return `<0.001 ${currency}`;
    return `${num.toFixed(3)} ${currency}`;
  };

  const getTotalBalance = (balances: { btc: string; bnb: string; usdt: string; coyn: string }) => {
    const bnb = parseFloat(balances.bnb);
    const usdt = parseFloat(balances.usdt);
    const coyn = parseFloat(balances.coyn);
    return bnb + usdt + coyn; // Rough USD equivalent
  };

  const walletName = walletType === 'metamask' ? 'MetaMask' : 'Trust Wallet';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="p-2"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Choose Address</h2>
          <p className="text-sm text-muted-foreground">
            Select which {walletName} address to sign in with
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingAddresses && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Loading {walletName} Addresses</h3>
                <p className="text-sm text-muted-foreground">
                  Discovering available addresses and balances...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address List */}
      {!isLoadingAddresses && addresses.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Found {addresses.length} address{addresses.length > 1 ? 'es' : ''} in your {walletName}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {addresses.map((addressData, index) => (
              <Card 
                key={addressData.address}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedAddress === addressData.address 
                    ? 'ring-2 ring-primary border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAddressSelect(addressData.address)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">
                          Address {index + 1}
                        </span>
                        {addressData.isActive && (
                          <Badge variant="secondary" className="text-xs">Primary</Badge>
                        )}
                        {selectedAddress === addressData.address && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="text-xs font-mono text-muted-foreground break-all mb-3">
                        {addressData.address}
                      </div>

                      {/* Balances */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {parseFloat(addressData.balances.bnb) > 0 && (
                          <div className="flex items-center space-x-1">
                            <Coins className="h-3 w-3 text-yellow-500" />
                            <span>{formatBalance(addressData.balances.bnb, 'BNB')}</span>
                          </div>
                        )}
                        {parseFloat(addressData.balances.usdt) > 0 && (
                          <div className="flex items-center space-x-1">
                            <Coins className="h-3 w-3 text-green-500" />
                            <span>{formatBalance(addressData.balances.usdt, 'USDT')}</span>
                          </div>
                        )}
                        {parseFloat(addressData.balances.coyn) > 0 && (
                          <div className="flex items-center space-x-1">
                            <Coins className="h-3 w-3 text-lime-1000" />
                            <span>{formatBalance(addressData.balances.coyn, 'COYN')}</span>
                          </div>
                        )}
                        {getTotalBalance(addressData.balances) === 0 && (
                          <div className="col-span-2 text-muted-foreground">
                            No balances detected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedAddress || isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </div>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Sign In with Selected Address
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error State */}
      {!isLoadingAddresses && addresses.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-medium text-foreground">No Addresses Found</h3>
                <p className="text-sm text-muted-foreground">
                  Unable to find any addresses in your {walletName}. Please ensure it's unlocked and connected.
                </p>
              </div>
              <Button onClick={loadWalletAddresses} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}