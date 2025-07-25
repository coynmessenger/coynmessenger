import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TransactionDebugger from "@/lib/transaction-debugger";
import WalletAccessValidator from "@/lib/wallet-access-validator";
import { Bug, Download, RefreshCw, TestTube } from "lucide-react";

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  const [walletTestResult, setWalletTestResult] = useState<boolean | null>(null);
  const [txTestResult, setTxTestResult] = useState<boolean | null>(null);

  const runWalletTest = async () => {
    setWalletTestResult(null);
    const result = await TransactionDebugger.testWalletConnection();
    setWalletTestResult(result);
    setDebugLogs(TransactionDebugger.getLogs());
  };

  const runTransactionTest = async () => {
    setTxTestResult(null);
    const result = await TransactionDebugger.testTransactionCapability("0.001", "BNB");
    setTxTestResult(result);
    setDebugLogs(TransactionDebugger.getLogs());
  };

  const downloadDebugReport = () => {
    const report = TransactionDebugger.exportDebugReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    TransactionDebugger.clearLogs();
    setDebugLogs([]);
    setWalletTestResult(null);
    setTxTestResult(null);
  };

  const getWalletStatus = () => {
    try {
      const walletAccess = localStorage.getItem('walletAccess');
      const connectedUser = localStorage.getItem('connectedUser');
      
      return {
        hasWalletAccess: !!walletAccess,
        hasConnectedUser: !!connectedUser,
        walletData: walletAccess ? JSON.parse(walletAccess) : null,
        userData: connectedUser ? JSON.parse(connectedUser) : null,
        hasWeb3: typeof window.ethereum !== 'undefined'
      };
    } catch (error) {
      return { error: 'Failed to parse stored data' };
    }
  };

  const status = getWalletStatus();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 bg-red-500 text-white hover:bg-red-600">
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Debug Panel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Web3 Available:</span>
                <Badge variant={status.hasWeb3 ? "default" : "destructive"}>
                  {status.hasWeb3 ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Wallet Access:</span>
                <Badge variant={status.hasWalletAccess ? "default" : "destructive"}>
                  {status.hasWalletAccess ? "Stored" : "None"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span>Connected User:</span>
                <Badge variant={status.hasConnectedUser ? "default" : "destructive"}>
                  {status.hasConnectedUser ? "Yes" : "No"}
                </Badge>
              </div>
              {status.walletData && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Address: {status.walletData.address}</div>
                  <div>Provider: {status.walletData.provider || 'Unknown'}</div>
                  <div>Chain ID: {status.walletData.chainId || 'Unknown'}</div>
                  <div>Authorized: {status.walletData.authorized ? 'Yes' : 'No'}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Diagnostic Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={runWalletTest} size="sm">
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Wallet Connection
                </Button>
                {walletTestResult !== null && (
                  <Badge variant={walletTestResult ? "default" : "destructive"}>
                    {walletTestResult ? "PASS" : "FAIL"}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button onClick={runTransactionTest} size="sm">
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Transaction Capability
                </Button>
                {txTestResult !== null && (
                  <Badge variant={txTestResult ? "default" : "destructive"}>
                    {txTestResult ? "PASS" : "FAIL"}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button onClick={downloadDebugReport} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
                
                <Button onClick={clearLogs} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Debug Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Logs ({debugLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto text-sm font-mono space-y-1">
                {debugLogs.length === 0 ? (
                  <div className="text-gray-500">No logs available. Run tests to generate logs.</div>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className={`p-2 rounded border-l-4 ${
                      log.level === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                      log.level === 'warn' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span>[{log.category.toUpperCase()}]</span>
                        <Badge variant="outline" className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.data && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}