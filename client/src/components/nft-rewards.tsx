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
    color: "from-amber-600 to-amber-700",
    bgColor: "bg-amber-100 dark:bg-amber-900/20",
    textColor: "text-amber-700 dark:text-amber-300",
    threshold: "$50+",
    description: "Bronze Collector NFT"
  },
  silver: {
    icon: Star,
    color: "from-gray-400 to-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    textColor: "text-gray-700 dark:text-gray-300",
    threshold: "$100+",
    description: "Silver Collector NFT"
  },
  gold: {
    icon: Trophy,
    color: "from-yellow-400 to-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    textColor: "text-yellow-700 dark:text-yellow-300",
    threshold: "$200+",
    description: "Gold Collector NFT"
  },
  diamond: {
    icon: Diamond,
    color: "from-blue-400 to-purple-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    textColor: "text-blue-700 dark:text-blue-300",
    threshold: "$500+",
    description: "Diamond Collector NFT"
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
      <DialogContent className="w-[95vw] sm:w-[85vw] max-w-4xl max-h-[95vh] overflow-hidden flex flex-col glass-card">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
            <Gift className="h-6 w-6 text-orange-500" />
            NFT Purchase Rewards
          </DialogTitle>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(tierConfig).map(([tier, config]) => {
                        const Icon = config.icon;
                        return (
                          <div key={tier} className={`p-3 rounded-lg ${config.bgColor} text-center`}>
                            <Icon className={`h-6 w-6 mx-auto mb-2 ${config.textColor}`} />
                            <div className={`font-semibold text-sm ${config.textColor} capitalize`}>{tier}</div>
                            <div className="text-xs text-muted-foreground">{config.threshold}</div>
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
                        <Card key={reward.id} className="glass-card border-orange-200 dark:border-orange-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-r ${config.color}`}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <div className="font-semibold capitalize">{reward.tier} NFT Reward</div>
                                  <div className="text-sm text-muted-foreground">{reward.productTitle}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Purchase: ${reward.purchaseValue} • {formatDate(reward.earnedAt)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => redeemMutation.mutate(reward.id)}
                                disabled={redeemMutation.isPending}
                                className="bg-gradient-to-r from-orange-500 to-cyan-500 hover:from-orange-600 hover:to-cyan-600 text-white"
                              >
                                {redeemMutation.isPending ? "Redeeming..." : "Redeem NFT"}
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
                        <Card key={reward.id} className="glass-card">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-r ${config.color}`}>
                                  <Icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold capitalize">{reward.tier} Collector NFT</div>
                                  <div className="text-sm text-muted-foreground">{reward.productTitle}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Redeemed: {reward.redeemedAt ? formatDate(reward.redeemedAt) : 'N/A'}
                                  </div>
                                  {reward.nftTokenId && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-xs text-muted-foreground">Token ID:</span>
                                      <code className="text-xs bg-muted px-1 rounded">{reward.nftTokenId.slice(0, 12)}...</code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyTokenId(reward.nftTokenId!)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                  Owned
                                </Badge>
                                <Button size="sm" variant="outline" className="h-8">
                                  <ExternalLink className="h-3 w-3" />
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