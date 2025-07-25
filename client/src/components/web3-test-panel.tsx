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
      // Test 1: Web3 Provider Detection
      addResult({
        name: "Web3 Provider Detection",
        status: typeof window.ethereum !== 'undefined' ? 'success' : 'error',
        message: typeof window.ethereum !== 'undefined' 
          ? `Web3 provider detected: ${window.ethereum.isMetaMask ? 'MetaMask' : window.ethereum.isTrust ? 'Trust Wallet' : 'Unknown'}`
          : 'No Web3 provider found'
      });

      if (typeof window.ethereum === 'undefined') {
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
        addResult({
          name: "Account Connection",
          status: accounts.length > 0 ? 'success' : 'warning',
          message: accounts.length > 0 
            ? `Connected account: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
            : 'No accounts connected',
          data: { accounts }
        });
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
          addResult({
            name: "Transaction Capability",
            status: 'success',
            message: `Transaction ready - Gas price: ${parseInt(gasPrice, 16)} wei`,
            data: { gasPrice }
          });
        }
      } catch (error: any) {
        addResult({
          name: "Transaction Capability",
          status: 'error',
          message: `Transaction test failed: ${error.message}`,
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          <CardTitle>Web3 Wallet Access Validator</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Comprehensive testing of wallet connection, signatures, and blockchain access
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runComprehensiveTest} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {isRunning ? 'Running Tests...' : 'Test Wallet Access'}
          </Button>
          <Button 
            variant="outline" 
            onClick={clearResults}
            disabled={isRunning}
          >
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Network className="w-4 h-4" />
                Test Results ({testResults.length})
              </h3>
              
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.name}</span>
                    <Badge className={getStatusColor(result.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(result.status)}
                        {result.status.toUpperCase()}
                      </div>
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {result.message}
                  </p>
                  
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Passed: {testResults.filter(r => r.status === 'success').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span>Warnings: {testResults.filter(r => r.status === 'warning').length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Failed: {testResults.filter(r => r.status === 'error').length}</span>
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