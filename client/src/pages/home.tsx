import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { MessageCircle, Check, Users, Lock, Globe, Network, ShieldCheck, Zap, Coins } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest } from "@/lib/queryClient";
import coynfulLogoPath from "@assets/Coynful logo fin copy_1759096913804.png";
import backgroundImagePath from "@assets/images(4)_1753827100393-ZmpUJssK_1759098427313.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import ThirdwebWalletConnector from "@/components/thirdweb-wallet-connector";
import type { User } from "@shared/schema";

const features = [
  {
    icon: Network,
    title: "Peer-to-Peer",
    description: "Direct encrypted P2P messaging and calls — no central server reads your data",
    accent: "from-orange-500 to-orange-600",
  },
  {
    icon: Coins,
    title: "Crypto Payments",
    description: "Send BNB, USDT, or COYN tokens directly inside any conversation",
    accent: "from-amber-500 to-orange-500",
  },
  {
    icon: ShieldCheck,
    title: "DTLS Encrypted",
    description: "DTLS-SRTP secured voice & video calls with fingerprint verification",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "Connect with anyone on BNB Chain — no borders, no intermediaries",
    accent: "from-blue-500 to-indigo-600",
  },
];

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
    const storedUser = localStorage.getItem('connectedUser');
    const storedConnected = localStorage.getItem('walletConnected');
    const userSignedOut = localStorage.getItem('userSignedOut');
    const userClickedHome = localStorage.getItem('userClickedHome');

    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.id || parsedUser?.walletAddress) {
          setIsConnected(true);
          setConnectedUser(parsedUser);

          if (userClickedHome === 'true') {
            console.log('👤 User navigated to homepage intentionally, staying');
            return;
          }

          localStorage.removeItem('userSignedOut');
          console.log('✅ Authenticated user detected, redirecting to messenger...');
          window.location.href = '/messenger';
          return;
        }
      } catch {
        // Corrupted data — fall through to clear it
      }
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('connectedUser');
      localStorage.removeItem('connectedUserId');
    }

    if (userSignedOut === 'true') {
      console.log('🚫 User signed out and no session found, staying on homepage');
    }
    setIsConnected(false);
    setConnectedUser(null);
  }, [setLocation]);

  useEffect(() => {
    if (!activeWallet) return;

    const userSignedOut = localStorage.getItem('userSignedOut');
    const userClickedHome = localStorage.getItem('userClickedHome');
    const storedUser = localStorage.getItem('connectedUser');
    const storedConnected = localStorage.getItem('walletConnected');

    if (userClickedHome === 'true') return;

    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.id || parsedUser?.walletAddress) {
          console.log('✅ Wallet autoConnected with valid session, redirecting to messenger...');
          localStorage.removeItem('userSignedOut');
          window.location.href = '/messenger';
          return;
        }
      } catch { /* ignore */ }
    }

    if (userSignedOut !== 'true' && !connectWalletMutation.isPending) {
      const account = (activeWallet as any).getAccount?.();
      const address = account?.address;
      if (address && !storedUser) {
        console.log('🔗 Wallet autoConnected without session, authenticating...');
        connectWalletMutation.mutate({ walletAddress: address });
      }
    }
  }, [activeWallet]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        console.log('📱 Storage change detected from another tab:', e.key);
        if (e.key === 'userSignedOut' && e.newValue === 'true') {
          setIsConnected(false);
          setConnectedUser(null);
        } else if (e.key === 'connectedUser' && e.newValue) {
          try {
            const parsedUser = JSON.parse(e.newValue);
            setConnectedUser(parsedUser);
            setIsConnected(true);
          } catch {
            // Ignore parse errors
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
      console.log('✅ COYN: User authenticated successfully!', { userId: user.id, walletAddress: user.walletAddress });

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

      console.log('🎯 COYN: SUCCESS! Redirecting to messenger...');
      window.location.href = "/messenger";
    },
  });

  const handleSignOut = async () => {
    try {
      console.log('🔌 Disconnecting thirdweb wallet...');
      if (activeWallet) {
        await disconnect(activeWallet);
      }
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
    console.log('🔗 COYN: Wallet approved! Address received:', address);
    console.log('🚀 COYN: Starting user authentication and AUTO-NAVIGATION to messenger...');

    localStorage.removeItem('userSignedOut');
    localStorage.removeItem('userClickedHome');
    sessionStorage.removeItem('userOnHomepage');
    localStorage.setItem('explicitWalletConnection', 'true');

    console.log('🎯 COYN: User flags cleared, proceeding with authentication and auto-navigation...');
    connectWalletMutation.mutate({ walletAddress: address });
  };

  const handleThirdwebDisconnect = () => {
    console.log('🔌 Thirdweb wallet disconnected');
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');

    setIsConnected(false);
    setConnectedUser(null);

    queryClient.clear();
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="w-full pt-5 pb-2 px-4 sm:px-6">
        <div className="flex justify-center">
          <img
            src={coynfulLogoPath}
            alt="Coynful"
            className="h-28 w-auto object-contain select-none"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>
      </header>

      {/* Main content on background */}
      <main
        className="flex-1 flex flex-col items-center px-4 pb-8 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImagePath})` }}
      >
        {/* Hero tagline — sits just above the card */}
        <div className="w-full max-w-md mx-auto mt-4 mb-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/90 text-white text-[11px] font-semibold tracking-wide shadow-sm">
              <Network className="w-3 h-3" />
              P2P
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[11px] font-semibold tracking-wide shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              DTLS Encrypted
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-white text-[11px] font-semibold tracking-wide shadow-sm">
              <Zap className="w-3 h-3" />
              Web3 Native
            </span>
          </div>
          <p className="text-white/90 text-xs font-medium drop-shadow-sm">
            Peer-to-peer messaging with built-in crypto payments
          </p>
        </div>

        {/* Connection Card */}
        <div className="w-full max-w-md mx-auto mb-8">
          <Card className="border border-white/20 shadow-2xl bg-white/88 dark:bg-slate-900/88 backdrop-blur-md rounded-2xl overflow-hidden">
            {/* Orange accent top bar */}
            <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

            <CardHeader className="text-center pt-5 pb-3 space-y-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                COYN Messenger
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Decentralized · Peer-to-peer · BNB Chain
              </p>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              {!isConnected || !connectedUser ? (
                <div className="space-y-5">
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Connect your wallet to enter
                  </p>

                  <div className="flex justify-center mobile-wallet-connector">
                    <ThirdwebWalletConnector
                      onConnect={handleThirdwebConnect}
                      onDisconnect={handleThirdwebDisconnect}
                      className="w-full min-h-[52px] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-600 touch-manipulation select-none"
                    />
                  </div>

                  {/* P2P privacy assurance */}
                  <div className="flex items-start gap-2.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 rounded-xl p-3">
                    <Network className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                      <span className="font-semibold text-orange-600 dark:text-orange-400">Fully P2P</span> — your messages and calls go directly between wallets. No account, no email, no server in the middle.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400/20 to-green-500/30 rounded-full flex items-center justify-center mx-auto ring-2 ring-green-400/30">
                    <Check className="h-7 w-7 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      Connected to COYN Network
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                      Welcome, {connectedUser?.displayName}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-full px-2 mt-1" title={connectedUser?.walletAddress}>
                      {connectedUser?.walletAddress}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      onClick={() => setLocation("/messenger")}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold rounded-xl h-12 touch-manipulation shadow-md"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Open Messenger
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl h-10 touch-manipulation text-sm"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}

              {/* BNB Chain note */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-3">
                <p className="text-center text-gray-400 dark:text-gray-500 text-[11px] flex items-center justify-center gap-1">
                  <span className="text-orange-400 font-bold text-xs">₡</span>
                  Powered by BNB Smart Chain
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature cards with glassmorphism */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl border border-white/25 bg-white/15 dark:bg-black/20 backdrop-blur-sm p-4 shadow-lg"
              >
                {/* Subtle gradient accent in corner */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${feature.accent} opacity-20 blur-xl`} />
                <div className={`w-9 h-9 bg-gradient-to-br ${feature.accent} rounded-xl flex items-center justify-center mb-2.5 shadow-sm`}>
                  <feature.icon className="h-4.5 w-4.5 text-white" style={{ width: '18px', height: '18px' }} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1 drop-shadow-sm">
                  {feature.title}
                </h3>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <button
              onClick={() => setShowTermsModal(true)}
              className="hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Privacy
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
            Powered by{" "}
            <a
              href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 transition-colors"
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
