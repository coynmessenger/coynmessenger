import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Gift, Star, Diamond, Award, Coins, Copy, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NFTReward {
  id: number;
  userId: number;
  tier: string;
  productId: string;
  productTitle: string;
  purchaseValue: string;
  currency: string;
  nftTokenId?: string;
  isRedeemed: boolean;
  earnedAt: string;
  redeemedAt?: string;
}

interface Purchase {
  id: number;
  productId: string;
  productTitle: string;
  quantity: number;
  totalValue: string;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const tierConfig = {
  bronze: {
    icon: Award,
    color: "from-amber-500 via-amber-600 to-amber-700",
    bgColor: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-300",
    threshold: "$50+",
    description: "Bronze Collector NFT",
    shadow: "shadow-amber-500/25",
    glow: "hover:shadow-amber-500/40 hover:shadow-lg",
    ring: "ring-amber-500/20"
  },
  silver: {
    icon: Star,
    color: "from-slate-400 via-slate-500 to-slate-600",
    bgColor: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/50 dark:to-slate-900/30",
    textColor: "text-slate-700 dark:text-slate-300",
    threshold: "$100+",
    description: "Silver Collector NFT",
    shadow: "shadow-slate-500/25",
    glow: "hover:shadow-slate-500/40 hover:shadow-lg",
    ring: "ring-slate-500/20"
  },
  gold: {
    icon: Trophy,
    color: "from-yellow-400 via-yellow-500 to-yellow-600",
    bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-300",
    threshold: "$200+",
    description: "Gold Collector NFT",
    shadow: "shadow-yellow-500/25",
    glow: "hover:shadow-yellow-500/40 hover:shadow-lg",
    ring: "ring-yellow-500/20"
  },
  diamond: {
    icon: Diamond,
    color: "from-cyan-400 via-blue-500 to-purple-600",
    bgColor: "bg-gradient-to-br from-cyan-50 to-purple-100 dark:from-cyan-950/50 dark:to-purple-900/30",
    textColor: "text-blue-700 dark:text-blue-300",
    threshold: "$500+",
    description: "Diamond Collector NFT",
    shadow: "shadow-purple-500/25",
    glow: "hover:shadow-purple-500/40 hover:shadow-lg",
    ring: "ring-purple-500/20"
  }
};

export function NFTRewardsModal({ trigger }: { trigger: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState("rewards");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rewards = [], isLoading: loadingRewards } = useQuery<NFTReward[]>({
    queryKey: ["/api/nft-rewards"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
    refetchInterval: 30000,
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await fetch(`/api/nft-rewards/${rewardId}/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to redeem NFT");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nft-rewards"] });
      toast({
        title: "NFT Redeemed!",
        description: "Your NFT reward has been successfully redeemed to your wallet.",
      });
    },
    onError: () => {
      toast({
        title: "Redemption Failed",
        description: "Unable to redeem NFT reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyTokenId = (tokenId: string) => {
    navigator.clipboard.writeText(tokenId);
    toast({
      title: "Copied!",
      description: "NFT Token ID copied to clipboard",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unredeemedRewards = (rewards as NFTReward[]).filter((r: NFTReward) => !r.isRedeemed);
  const redeemedRewards = (rewards as NFTReward[]).filter((r: NFTReward) => r.isRedeemed);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] overflow-hidden flex flex-col bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-2 border-white/20 dark:border-slate-700/50 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-cyan-500/10 rounded-t-lg"></div>
          <DialogTitle className="text-xl sm:text-3xl font-black bg-gradient-to-r from-orange-500 via-orange-600 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3 relative z-10 py-2">
            <div className="relative">
              <Gift className="h-7 w-7 text-orange-500 drop-shadow-sm" />
              <div className="absolute inset-0 bg-orange-400 rounded-full blur-sm opacity-30 animate-pulse"></div>
            </div>
            <span className="drop-shadow-sm">NFT Purchase Rewards</span>
          </DialogTitle>
          <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mt-2"></div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">My Rewards</span>
              <span className="sm:hidden">Rewards</span>
              {unredeemedRewards.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-orange-500 text-white text-xs">
                  {unredeemedRewards.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Collection</span>
              <span className="sm:hidden">NFTs</span>
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Purchase History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="rewards" className="space-y-4 mt-0">
              <div className="grid gap-4">
                <Card className="glass-card border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-orange-500" />
                      Reward Tiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(tierConfig).map(([tier, config]) => {
                        const Icon = config.icon;
                        return (
                          <div 
                            key={tier} 
                            className={`relative p-4 rounded-xl ${config.bgColor} text-center transform transition-all duration-300 hover:scale-105 ${config.glow} border border-white/20 dark:border-black/20 cursor-pointer group`}
                          >
                            <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                            <div className={`relative p-2 rounded-lg bg-gradient-to-r ${config.color} mx-auto mb-3 w-fit ${config.shadow} transform group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <div className={`font-bold text-sm ${config.textColor} capitalize mb-1 relative`}>{tier}</div>
                            <div className="text-xs text-muted-foreground font-medium relative">{config.threshold}</div>
                            <div className={`absolute inset-0 rounded-xl ring-2 ${config.ring} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {loadingRewards ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading rewards...</p>
                  </div>
                ) : unredeemedRewards.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="text-center py-8">
                      <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No pending rewards</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Make purchases to earn NFT rewards!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Available Rewards ({unredeemedRewards.length})</h3>
                    {unredeemedRewards.map((reward: NFTReward) => {
                      const config = tierConfig[reward.tier as keyof typeof tierConfig];
                      const Icon = config.icon;
                      
                      return (
                        <Card key={reward.id} className={`relative overflow-hidden border-2 ${config.ring} hover:${config.ring.replace('ring-', 'border-')} transition-all duration-300 hover:shadow-xl ${config.shadow} group hover:scale-[1.02] backdrop-blur-sm bg-white/80 dark:bg-slate-900/80`}>
                          <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                          <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`relative p-3 rounded-xl bg-gradient-to-r ${config.color} ${config.shadow} transform group-hover:scale-110 transition-all duration-300`}>
                                  <Icon className="h-6 w-6 text-white drop-shadow-lg" />
                                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config.color} animate-pulse opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
                                </div>
                                <div className="space-y-1">
                                  <div className="font-bold text-lg capitalize bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                    {reward.tier} NFT Reward
                                  </div>
                                  <div className="text-sm font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
                                    {reward.productTitle}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span className="font-semibold text-green-600 dark:text-green-400">${reward.purchaseValue}</span>
                                    <span>•</span>
                                    <span>{formatDate(reward.earnedAt)}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => redeemMutation.mutate(reward.id)}
                                disabled={redeemMutation.isPending}
                                className="bg-gradient-to-r from-orange-500 via-orange-600 to-cyan-500 hover:from-orange-600 hover:via-orange-700 hover:to-cyan-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              >
                                {redeemMutation.isPending ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Redeeming...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4" />
                                    Redeem NFT
                                  </div>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="collection" className="space-y-4 mt-0">
              {loadingRewards ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading collection...</p>
                </div>
              ) : redeemedRewards.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="text-center py-8">
                    <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No NFTs in collection</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Redeem your earned rewards to start your collection!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">My NFT Collection ({redeemedRewards.length})</h3>
                  <div className="grid gap-3">
                    {redeemedRewards.map((reward: NFTReward) => {
                      const config = tierConfig[reward.tier as keyof typeof tierConfig];
                      const Icon = config.icon;
                      
                      return (
                        <Card key={reward.id} className={`relative overflow-hidden border-2 ${config.ring} transition-all duration-300 hover:shadow-xl ${config.shadow} group hover:scale-[1.01] backdrop-blur-sm bg-white/90 dark:bg-slate-900/90`}>
                          <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-5`}></div>
                          <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${config.color} opacity-10 rounded-bl-full`}></div>
                          <CardContent className="p-6 relative">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`relative p-3 rounded-xl bg-gradient-to-r ${config.color} ${config.shadow} transform group-hover:scale-105 transition-all duration-300`}>
                                  <Icon className="h-6 w-6 text-white drop-shadow-lg" />
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="font-bold text-lg capitalize bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                    {reward.tier} Collector NFT
                                  </div>
                                  <div className="text-sm font-medium text-gray-600 dark:text-gray-300 line-clamp-1">
                                    {reward.productTitle}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="text-green-600 dark:text-green-400 font-semibold">Redeemed:</span> {reward.redeemedAt ? formatDate(reward.redeemedAt) : 'N/A'}
                                  </div>
                                  {reward.nftTokenId && (
                                    <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                                      <span className="text-xs font-medium text-muted-foreground">Token ID:</span>
                                      <code className="text-xs font-mono bg-white dark:bg-gray-900 px-2 py-1 rounded border text-blue-600 dark:text-blue-400 flex-1 min-w-0">
                                        {reward.nftTokenId.slice(0, 16)}...
                                      </code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                        onClick={() => copyTokenId(reward.nftTokenId!)}
                                      >
                                        <Copy className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold px-3 py-1 shadow-sm">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    Owned
                                  </div>
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-3 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchases" className="space-y-4 mt-0">
              {loadingPurchases ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading purchases...</p>
                </div>
              ) : (purchases as Purchase[]).length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="text-center py-8">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No purchases yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start shopping to see your purchase history!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Purchase History ({(purchases as Purchase[]).length})</h3>
                  {(purchases as Purchase[]).map((purchase: Purchase) => (
                    <Card key={purchase.id} className="glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{purchase.productTitle}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {purchase.quantity} • ${purchase.totalValue} • {purchase.paymentMethod}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(purchase.createdAt)}
                            </div>
                          </div>
                          <Badge 
                            variant={purchase.status === 'confirmed' ? 'default' : 'secondary'}
                            className={purchase.status === 'confirmed' ? 'bg-green-500 text-white' : ''}
                          >
                            {purchase.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}