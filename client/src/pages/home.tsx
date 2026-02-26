import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Check, Users, Lock, Globe, Zap, Shield } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest } from "@/lib/queryClient";
import coynfulLogoPath from "@assets/Coynful logo fin copy_1759096913804.png";
import coynCoinPath from "@assets/image_1759095831947.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import ThirdwebWalletConnector from "@/components/thirdweb-wallet-connector";
import type { User } from "@shared/schema";

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('connectedUser');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse connectedUser from localStorage:', error);
      localStorage.removeItem('connectedUser');
      return null;
    }
  });
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    const userSignedOut = localStorage.getItem('userSignedOut');
    if (userSignedOut === 'true') {
      console.log('🚫 User signed out, staying on homepage');
      setIsConnected(false);
      setConnectedUser(null);
      return;
    }
    
    const storedConnected = localStorage.getItem('walletConnected');
    const storedUser = localStorage.getItem('connectedUser');
    const userClickedHome = localStorage.getItem('userClickedHome');
    
    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.id || parsedUser?.address || parsedUser?.walletAddress) {
          setIsConnected(true);
          setConnectedUser(parsedUser);
          if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
            sessionStorage.setItem('userOnHomepage', 'true');
            return;
          }
          setLocation("/messenger");
          return;
        } else {
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
          setIsConnected(false);
          setConnectedUser(null);
        }
      } catch (error) {
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('connectedUser');
        localStorage.removeItem('connectedUserId');
        setIsConnected(false);
        setConnectedUser(null);
      }
    } else {
      setIsConnected(false);
      setConnectedUser(null);
    }
  }, [setLocation]);
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        if (e.key === 'userSignedOut' && e.newValue === 'true') {
          setIsConnected(false);
          setConnectedUser(null);
        } else if (e.key === 'connectedUser' && e.newValue) {
          try {
            const parsedUser = JSON.parse(e.newValue);
            setConnectedUser(parsedUser);
            setIsConnected(true);
          } catch {
            // ignore
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      localStorage.removeItem('explicitWalletConnection');
      localStorage.removeItem('userSignedOut');
      localStorage.removeItem('userClickedHome');
      sessionStorage.removeItem('userOnHomepage');
      
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      setConnectedUser(user);
      setIsConnected(true);
      
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
      
      window.location.href = "/messenger";
    },
  });

  const handleSignOut = async () => {
    try {
      if (activeWallet) await disconnect(activeWallet);
    } catch (error) {
      console.error('Error disconnecting thirdweb wallet:', error);
    }
    localStorage.setItem('userSignedOut', 'true');
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    sessionStorage.clear();
    setIsConnected(false);
    setConnectedUser(null);
    window.location.reload();
  };

  const handleThirdwebConnect = (address: string) => {
    localStorage.removeItem('userSignedOut');
    localStorage.removeItem('userClickedHome');
    sessionStorage.removeItem('userOnHomepage');
    localStorage.setItem('explicitWalletConnection', 'true');
    connectWalletMutation.mutate({ walletAddress: address });
  };

  const handleThirdwebDisconnect = () => {
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    setIsConnected(false);
    setConnectedUser(null);
    queryClient.clear();
  };

  const features = [
    { icon: MessageCircle, title: "Real-time Messaging", description: "Instant Web3 communication" },
    { icon: Users, title: "Wallet Integration", description: "Send crypto in chats" },
    { icon: Shield, title: "Encrypted Calls", description: "Secure voice & video" },
    { icon: Globe, title: "Global Network", description: "Chat internationally" },
  ];

  return (
    <div className="min-h-[100dvh] watercolor-bg bg-background text-foreground flex flex-col relative">
      {/* Same watercolor overlay as messenger */}
      <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark -z-10" />

      {/* Header */}
      <header className="w-full pt-8 pb-2 px-4 flex justify-center">
        <img
          src={coynfulLogoPath}
          alt="Coynful"
          className="h-28 sm:h-36 w-auto object-contain select-none drop-shadow-lg"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-4 pb-8">

        {/* Connect Card */}
        <div className="w-full max-w-sm mx-auto mt-4 mb-8">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl">

            {/* Card header stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600" />

            <div className="p-6">
              {/* COYN coin + title */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <img
                  src={coynCoinPath}
                  alt="COYN"
                  className="w-16 h-16 object-contain drop-shadow-md"
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    COYN Messenger
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Web3 messaging on BNB Smart Chain
                  </p>
                </div>
              </div>

              {!isConnected || !connectedUser ? (
                <div className="space-y-4">
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Connect your wallet to get started
                  </p>

                  <div className="flex justify-center mobile-wallet-connector">
                    <ThirdwebWalletConnector
                      onConnect={handleThirdwebConnect}
                      onDisconnect={handleThirdwebDisconnect}
                      className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-orange-500/30 touch-manipulation select-none"
                    />
                  </div>

                  {/* Supported wallets hint */}
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                    MetaMask · Trust · Coinbase · WalletConnect + more
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected state */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-green-500/15 dark:bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Wallet Connected
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        Welcome, {connectedUser?.displayName || "User"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-1 truncate max-w-[220px]">
                        {connectedUser?.walletAddress}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setLocation("/messenger")}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl h-12 shadow-lg hover:shadow-orange-500/30 transition-all duration-200 touch-manipulation"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Open Messenger
                  </Button>

                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl h-10 transition-all duration-200 touch-manipulation"
                  >
                    Sign Out
                  </Button>
                </div>
              )}

              {/* BNB chain badge */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Powered by BNB Smart Chain
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature tiles */}
        <div className="w-full max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <feature.icon className="h-4.5 w-4.5 text-white" style={{ width: '18px', height: '18px' }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </button>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
            Powered by{" "}
            <a
              href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              ₡ COYN
            </a>
          </p>
        </div>
      </footer>

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <PWAInstallPrompt />
    </div>
  );
}
