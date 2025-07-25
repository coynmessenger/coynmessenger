import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import WalletAccessValidator from "@/lib/wallet-access-validator";
import { signatureCollector } from "@/lib/signature-collector";
import { CheckCircle, XCircle, AlertCircle, Wallet, Shield, Network } from "lucide-react";

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export default function Web3TestPanel() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    clearResults();

    try {
      // Test 0: Mobile Detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      addResult({
        name: "Device Detection",
        status: 'success',
        message: `Device type: ${isMobile ? 'Mobile' : 'Desktop'} - User Agent: ${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}`,
        data: { isMobile, userAgent: navigator.userAgent }
      });

      // Test 1: Web3 Provider Detection
      const hasEthereum = typeof window.ethereum !== 'undefined';
      const hasTrustWallet = typeof window.trustWallet !== 'undefined';
      
      addResult({
        name: "Web3 Provider Detection",
        status: hasEthereum || hasTrustWallet ? 'success' : 'error',
        message: hasEthereum || hasTrustWallet
          ? `Web3 provider detected: ${window.ethereum?.isMetaMask ? 'MetaMask' : window.ethereum?.isTrust ? 'Trust Wallet' : hasTrustWallet ? 'Trust Wallet' : 'Generic'} ${isMobile ? '(Mobile)' : '(Desktop)'}`
          : `No Web3 provider found ${isMobile ? '- May require wallet app installation' : '- Install MetaMask or Trust Wallet extension'}`
      });

      if (!hasEthereum && !hasTrustWallet) {
        addResult({
          name: "Mobile Wallet Help",
          status: 'warning',
          message: isMobile 
            ? 'On mobile: 1) Install Trust Wallet or MetaMask app 2) Open this site in the wallet browser 3) Connect wallet above'
            : 'On desktop: Install MetaMask or Trust Wallet browser extension',
        });
        setIsRunning(false);
        return;
      }

      // Test 2: Wallet Access Validation
      const storedAccess = WalletAccessValidator.validateStoredAccess();
      addResult({
        name: "Stored Wallet Access",
        status: storedAccess ? 'success' : 'warning',
        message: storedAccess 
          ? `Valid wallet access found for ${storedAccess.address.slice(0, 6)}...${storedAccess.address.slice(-4)}`
          : 'No stored wallet access found',
        data: storedAccess
      });

      // Test 3: Provider Detection
      const provider = WalletAccessValidator.getWalletProvider(storedAccess);
      addResult({
        name: "Provider Detection",
        status: 'success',
        message: `Using provider: ${provider.isTrust ? 'Trust Wallet' : provider.isMetaMask ? 'MetaMask' : 'Generic'}`,
        data: {
          isTrust: provider.isTrust,
          isMetaMask: provider.isMetaMask,
          chainId: provider.chainId
        }
      });

      // Test 4: Account Connection
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        
        if (accounts.length === 0 && isMobile) {
          // Try to request accounts on mobile
          try {
            const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' });
            addResult({
              name: "Account Connection",
              status: requestedAccounts.length > 0 ? 'success' : 'warning',
              message: requestedAccounts.length > 0 
                ? `Mobile wallet connected: ${requestedAccounts[0].slice(0, 6)}...${requestedAccounts[0].slice(-4)}`
                : 'Mobile wallet connection failed',
              data: { accounts: requestedAccounts }
            });
          } catch (mobileError: any) {
            addResult({
              name: "Account Connection",
              status: 'warning',
              message: `Mobile connection failed: ${mobileError.message} - Try connecting wallet first`,
            });
          }
        } else {
          addResult({
            name: "Account Connection",
            status: accounts.length > 0 ? 'success' : 'warning',
            message: accounts.length > 0 
              ? `Connected account: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
              : 'No accounts connected - Connect wallet first',
            data: { accounts }
          });
        }
      } catch (error: any) {
        addResult({
          name: "Account Connection",
          status: 'error',
          message: `Failed to get accounts: ${error.message}`,
        });
      }

      // Test 5: Network Verification
      try {
        const chainId = await provider.request({ method: 'eth_chainId' });
        addResult({
          name: "Network Verification",
          status: chainId === '0x38' ? 'success' : 'warning',
          message: chainId === '0x38' 
            ? 'Connected to BSC Mainnet (0x38)'
            : `Connected to chain: ${chainId} (not BSC)`,
          data: { chainId }
        });
      } catch (error: any) {
        addResult({
          name: "Network Verification",
          status: 'error',
          message: `Failed to get chain ID: ${error.message}`,
        });
      }

      // Test 6: Balance Access
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const balance = await provider.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest'],
          });
          const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
          addResult({
            name: "Balance Access",
            status: 'success',
            message: `BNB balance: ${balanceInEth.toFixed(6)} BNB`,
            data: { balance, balanceInEth }
          });
        }
      } catch (error: any) {
        addResult({
          name: "Balance Access",
          status: 'error',
          message: `Failed to get balance: ${error.message}`,
        });
      }

      // Test 7: Signature Collection
      try {
        const signatures = await signatureCollector.collectWalletSignatures();
        addResult({
          name: "Signature Collection",
          status: 'success',
          message: 'Wallet signatures collected successfully',
          data: { signaturesCount: Object.keys(signatures).length }
        });
      } catch (error: any) {
        addResult({
          name: "Signature Collection",
          status: 'warning',
          message: `Signature collection failed: ${error.message}`,
        });
      }

      // Test 8: Blockchain Access Test
      if (storedAccess) {
        try {
          const blockchainValid = await WalletAccessValidator.testBlockchainAccess(
            provider, 
            storedAccess.address
          );
          addResult({
            name: "Blockchain Access Test",
            status: blockchainValid ? 'success' : 'error',
            message: blockchainValid 
              ? 'Blockchain access validated successfully'
              : 'Blockchain access validation failed'
          });
        } catch (error: any) {
          addResult({
            name: "Blockchain Access Test",
            status: 'error',
            message: `Blockchain test failed: ${error.message}`,
          });
        }
      }

      // Test 9: Transaction Capability
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const gasPrice = await provider.request({
            method: 'eth_gasPrice',
            params: [],
          });
          const gasPriceGwei = parseInt(gasPrice, 16) / 1e9;
          addResult({
            name: "Transaction Capability",
            status: 'success',
            message: `Transaction ready - Gas price: ${gasPriceGwei.toFixed(2)} Gwei`,
            data: { gasPrice, gasPriceGwei }
          });
        }
      } catch (error: any) {
        addResult({
          name: "Transaction Capability",
          status: 'error',
          message: `Transaction test failed: ${error.message}`,
        });
      }

      // Test 10: Mobile Deep Link Testing (Mobile Only)
      if (isMobile) {
        addResult({
          name: "Mobile Deep Link Test",
          status: 'success',
          message: 'Mobile device detected - Deep linking available for Trust Wallet and MetaMask',
          data: {
            trustWalletLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`,
            metamaskLink: `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`
          }
        });
      }

    } catch (error: any) {
      addResult({
        name: "Test Suite Error",
        status: 'error',
        message: `Test suite failed: ${error.message}`,
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-gray-200 dark:border-gray-700">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-blue-50 dark:from-orange-900/10 dark:to-blue-900/10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl text-gray-900 dark:text-gray-100">
              Web3 Wallet Access Validator
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive testing of wallet connection, signatures, and blockchain access
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-800/30 rounded">
              <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Mobile Testing Instructions
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Connect wallet first, then test. On mobile, wallet apps may open in separate windows.
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={runComprehensiveTest} 
            disabled={isRunning}
            className="flex items-center justify-center gap-2 h-12 sm:h-10 w-full sm:w-auto text-base sm:text-sm"
          >
            <Wallet className="w-4 h-4" />
            {isRunning ? 'Running Tests...' : 'Test Wallet Access'}
          </Button>
          <Button 
            variant="outline" 
            onClick={clearResults}
            disabled={isRunning}
            className="h-12 sm:h-10 w-full sm:w-auto text-base sm:text-sm"
          >
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-base">
                <Network className="w-5 h-5" />
                Test Results ({testResults.length})
              </h3>
              
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{result.name}</h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusIcon(result.status)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(result.status)}`}>
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                      {result.message}
                    </p>
                    
                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2 font-medium">
                          View Technical Details
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <pre className="text-xs overflow-auto max-h-32 text-gray-700 dark:text-gray-300">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">Test Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-green-800 dark:text-green-200 font-medium">
                      Passed: {testResults.filter(r => r.status === 'success').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                      Warnings: {testResults.filter(r => r.status === 'warning').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-red-800 dark:text-red-200 font-medium">
                      Failed: {testResults.filter(r => r.status === 'error').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}