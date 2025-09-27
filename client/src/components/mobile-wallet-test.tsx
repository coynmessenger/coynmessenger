import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { walletConnector } from '@/lib/wallet-connector';
import { 
  Smartphone, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare,
  Send,
  Info,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: Date;
}

export default function MobileWalletTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [signMessage, setSignMessage] = useState('Hello COYN Messenger! Test signature from mobile wallet.');
  const [testAddress, setTestAddress] = useState('');
  const [testAmount, setTestAmount] = useState('0.001');
  const [selectedToken, setSelectedToken] = useState<'BNB' | 'USDT' | 'COYN'>('BNB');
  const { toast } = useToast();

  // Mobile device detection
  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Get wallet info
  const getWalletInfo = () => {
    const wallet = walletConnector.getCurrentWallet();
    const isConnected = walletConnector.isConnected();
    
    return {
      isConnected,
      address: wallet?.address,
      chainId: wallet?.chainId,
      balance: wallet?.balance,
      isMobileDevice: isMobile(),
      userAgent: navigator.userAgent,
      providerType: wallet?.provider?.isMetaMask ? 'MetaMask' : 
                   (wallet?.provider?.isTrust || wallet?.provider?.isTrustWallet) ? 'Trust Wallet' : 
                   'Unknown'
    };
  };

  // Update test result
  const updateTestResult = (testName: string, result: TestResult) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  // Test wallet connection and provider detection
  const testWalletConnection = async () => {
    const testName = 'wallet_connection';
    setIsTesting(true);
    
    try {
      console.log('📱 ====== MOBILE WALLET CONNECTION TEST ======');
      
      const walletInfo = getWalletInfo();
      console.log('📱 Wallet Info:', walletInfo);
      
      if (!walletInfo.isConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      if (!walletInfo.isMobileDevice) {
        console.log('⚠️ Warning: Not on mobile device, but test will continue');
      }
      
      const result: TestResult = {
        success: true,
        message: `✅ Wallet connected successfully!\nProvider: ${walletInfo.providerType}\nAddress: ${walletInfo.address}\nChain: ${walletInfo.chainId}\nMobile: ${walletInfo.isMobileDevice}`,
        data: walletInfo,
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Wallet Connection Test",
        description: "✅ Successfully connected to wallet"
      });
      
    } catch (error: any) {
      console.error('❌ Wallet connection test failed:', error);
      
      const result: TestResult = {
        success: false,
        message: `❌ Wallet connection failed: ${error.message}`,
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Wallet Connection Test",
        description: "❌ " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test message signing (web3.eth.sign equivalent)
  const testMessageSigning = async () => {
    const testName = 'message_signing';
    setIsTesting(true);
    
    try {
      console.log('✍️ ====== MESSAGE SIGNING TEST ======');
      console.log('Message to sign:', signMessage);
      
      if (!walletConnector.isConnected()) {
        throw new Error('Wallet not connected');
      }
      
      // Start timing
      const startTime = Date.now();
      
      // Sign the message
      const signature = await walletConnector.signMessage(signMessage);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('✅ Message signed successfully:', signature);
      console.log(`⏱️ Signing took ${duration}ms`);
      
      // Verify the signature format (should be hex string starting with 0x and 132 chars long)
      const isValidSignature = signature.startsWith('0x') && signature.length === 132;
      
      const result: TestResult = {
        success: true,
        message: `✅ Message signed successfully!\nSignature: ${signature.slice(0, 20)}...\nDuration: ${duration}ms\nValid format: ${isValidSignature}`,
        data: {
          signature,
          message: signMessage,
          duration,
          isValidSignature,
          walletInfo: getWalletInfo()
        },
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Message Signing Test",
        description: `✅ Message signed in ${duration}ms`
      });
      
    } catch (error: any) {
      console.error('❌ Message signing test failed:', error);
      
      const result: TestResult = {
        success: false,
        message: `❌ Message signing failed: ${error.message}`,
        data: { message: signMessage },
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Message Signing Test",
        description: "❌ " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Test transaction sending (web3.eth.sendTransaction equivalent)
  const testTransactionSending = async () => {
    const testName = 'transaction_sending';
    setIsTesting(true);
    
    try {
      console.log('💸 ====== TRANSACTION SENDING TEST ======');
      console.log(`Token: ${selectedToken}, Amount: ${testAmount}, To: ${testAddress}`);
      
      if (!walletConnector.isConnected()) {
        throw new Error('Wallet not connected');
      }
      
      if (!testAddress) {
        throw new Error('Please enter a test address');
      }
      
      if (!testAmount || parseFloat(testAmount) <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Start timing
      const startTime = Date.now();
      
      // Send transaction based on selected token
      let txResult;
      switch (selectedToken) {
        case 'BNB':
          txResult = await walletConnector.sendBNB(testAddress, testAmount);
          break;
        case 'USDT':
          txResult = await walletConnector.sendUSDT(testAddress, testAmount);
          break;
        case 'COYN':
          txResult = await walletConnector.sendCOYN(testAddress, testAmount);
          break;
        default:
          throw new Error('Invalid token selected');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('✅ Transaction sent successfully:', txResult);
      console.log(`⏱️ Transaction took ${duration}ms`);
      
      const result: TestResult = {
        success: true,
        message: `✅ ${selectedToken} transaction sent successfully!\nHash: ${txResult.hash.slice(0, 20)}...\nAmount: ${testAmount} ${selectedToken}\nDuration: ${duration}ms`,
        data: {
          ...txResult,
          duration,
          token: selectedToken,
          walletInfo: getWalletInfo()
        },
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Transaction Test",
        description: `✅ ${selectedToken} transaction confirmed in ${duration}ms`
      });
      
    } catch (error: any) {
      console.error('❌ Transaction test failed:', error);
      
      const result: TestResult = {
        success: false,
        message: `❌ Transaction failed: ${error.message}`,
        data: { 
          token: selectedToken, 
          amount: testAmount, 
          address: testAddress 
        },
        timestamp: new Date()
      };
      
      updateTestResult(testName, result);
      toast({
        title: "Transaction Test",
        description: "❌ " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    await testWalletConnection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testMessageSigning();
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Note: We'll skip transaction test in "run all" to avoid accidental spending
    toast({
      title: "Test Suite",
      description: "Core tests completed (transaction test skipped for safety)"
    });
  };

  const walletInfo = getWalletInfo();

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Mobile Wallet Testing</h2>
        </div>
        <p className="text-muted-foreground">
          Comprehensive testing for mobile wallet functionality
        </p>
      </div>

      {/* Wallet Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Connected:</span>
                <Badge variant={walletInfo.isConnected ? "default" : "destructive"}>
                  {walletInfo.isConnected ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mobile Device:</span>
                <Badge variant={walletInfo.isMobileDevice ? "default" : "secondary"}>
                  {walletInfo.isMobileDevice ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider:</span>
                <Badge variant="outline">
                  {walletInfo.providerType}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Address:</span>
                <div className="font-mono text-xs break-all">
                  {walletInfo.address || 'Not connected'}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Chain ID:</span>
                <span className="ml-2">{walletInfo.chainId || 'N/A'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Connection Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Connection Test
            </CardTitle>
            <CardDescription>
              Verify wallet connection and mobile compatibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testWalletConnection}
              disabled={isTesting}
              className="w-full"
              data-testid="button-test-connection"
            >
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Message Signing Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Signing Test
            </CardTitle>
            <CardDescription>
              Test web3.eth.sign() equivalent functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sign-message">Message to Sign</Label>
              <Textarea
                id="sign-message"
                value={signMessage}
                onChange={(e) => setSignMessage(e.target.value)}
                placeholder="Enter message to sign..."
                className="mt-1"
                data-testid="input-sign-message"
              />
            </div>
            <Button 
              onClick={testMessageSigning}
              disabled={isTesting || !walletInfo.isConnected}
              className="w-full"
              data-testid="button-test-signing"
            >
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Test Message Signing
            </Button>
          </CardContent>
        </Card>

        {/* Transaction Test */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Transaction Test
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
              Test web3.eth.sendTransaction() - This will send real tokens! Use small amounts and test addresses only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="token-select">Token</Label>
                <select
                  id="token-select"
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  data-testid="select-token"
                >
                  <option value="BNB">BNB</option>
                  <option value="USDT">USDT</option>
                  <option value="COYN">COYN</option>
                </select>
              </div>
              <div>
                <Label htmlFor="test-amount">Amount</Label>
                <Input
                  id="test-amount"
                  type="number"
                  step="0.001"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  placeholder="0.001"
                  className="mt-1"
                  data-testid="input-amount"
                />
              </div>
              <div>
                <Label htmlFor="test-address">Test Address</Label>
                <Input
                  id="test-address"
                  value={testAddress}
                  onChange={(e) => setTestAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-1"
                  data-testid="input-address"
                />
              </div>
            </div>
            <Button 
              onClick={testTransactionSending}
              disabled={isTesting || !walletInfo.isConnected}
              className="w-full"
              variant="destructive"
              data-testid="button-test-transaction"
            >
              {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Test Transaction (REAL TOKENS!)
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={runAllTests}
              disabled={isTesting || !walletInfo.isConnected}
              variant="outline"
              data-testid="button-run-all-tests"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Run Core Tests
            </Button>
            <Button 
              onClick={() => setTestResults({})}
              variant="outline"
              data-testid="button-clear-results"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(testResults).map(([testName, result]) => (
              <div key={testName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium capitalize">
                    {testName.replace('_', ' ')}
                  </h4>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {result.message}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {result.timestamp.toLocaleTimeString()}
                </div>
                {result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      View Details
                    </summary>
                    <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}