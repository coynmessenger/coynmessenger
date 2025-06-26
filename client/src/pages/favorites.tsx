import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Home, Star, Trash2, ShoppingCart, Wallet, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AmazonCheckout from "@/components/amazon-checkout";
import { addToCart, getCartCount } from "@/components/shopping-cart";
import WalletHover from "@/components/wallet-hover";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";

interface Favorite {
  id: number;
  userId: number;
  productId: string;
  productTitle: string;
  productPrice: string;
  productImage: string;
  productCategory: string;
  productRating: number;
  createdAt: Date;
}

export default function FavoritesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCart, setShowCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showWalletHover, setShowWalletHover] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCartCount(getCartCount());
    
    const handleCartUpdate = (event: CustomEvent) => {
      setCartCount(event.detail.count);
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
    };
  }, []);

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
  });

  const { data: walletBalances = [] } = useQuery<any[]>({
    queryKey: ["/api/wallet/balances"],
  });

  // Currency logo mapping
  const getCurrencyLogo = (currency: string) => {
    switch (currency) {
      case 'COYN':
        return coynLogoPath;
      case 'BTC':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGNzkzMUEiLz4KPHBhdGggZD0iTTIzLjE4OSAxNC4wMkMyMy42MDkgMTEuNTI2IDIxLjc5OCA5Ljk2IDE5LjM3NCAxMC4zOTFMMTguNzQ5IDEwLjUxOUwxOS4yNjkgOC4zOUwxOC4wNDkgOC4xM0wxNy41MzkgMTAuMjM5TDE2Ljc1OSAxMC4wOEwxNy4yNjkgNy45NEwxNi4wNDkgNy42OEwxNS41MjkgOS44M0wxNC4yNTkgOS41OFYxMC44OEwxNS4xMzkgMTEuMDdDMTUuODQ5IDExLjIyIDE2LjE3OSAxMS43OCAxNi4wMjkgMTIuNTVMMTUuNTI5IDE0LjUyQzE1LjUzOSAxNC41NyAxNS41OTkgMTQuNjEgMTUuNjY5IDE0LjY2SDE1LjY2OUMxNS42MjkgMTQuNjYgMTUuNTY5IDE0LjY0IDE1LjQ5OSAxNC42MUwxNC42MzkgMTcuNEMxNC41NjkgMTcuNjMgMTQuMzkgMTcuNzggMTQuMTQgMTcuNzFMMTMuMjc5IDE3LjVMMTIuNjQ5IDE5LjEyTDE0LjY2OSAxOS41OEwxNS4yODkgMTkuNzJMMTQuNzc5IDIxLjgxTDE1Ljk5OSAyMi4wN0wxNi41MTkgMTkuOTZMMTcuMjk5IDIwLjExTDE2Ljc3OSAyMi4yMkwxNy45OTkgMjIuNDhMMTguNTA5IDIwLjM5TDE5LjA5OSAyMC41MEMyMS4yNDkgMjAuODkgMjIuODk5IDE5LjM4IDIzLjE4OSAxNC4wMlpNMjAuMzUgMTYuNEMyMC4xNyAxOC41OSAxNy44ODkgMTguNDkgMTYuOTI5IDE4LjI0TDE3LjUwOSAxNS43NEMxOC40NjkgMTUuOTkgMjAuNTQ5IDE0LjEyIDIwLjM1IDE2LjRaTTIwLjY2OSAxMy45OUMyMC41MDkgMTUuODggMTguNzM5IDE1LjggMTcuOTQ5IDE1LjYxTDE4LjQ2OSAxMy4zNkMxOS4yNTkgMTMuNTUgMjAuODM5IDEyLjAyIDIwLjY2OSAxMy45OVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
      case 'BNB':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGM0JBMkYiLz4KPHBhdGggZD0iTTEyLjQ2IDEwLjQ2TDE2IDYuOTJMMTkuNTQgMTAuNDZMMjEuNzggOC4yMkwxNiA0LjQ0TDEwLjIyIDguMjJMMTIuNDYgMTAuNDZaTTQuNDQgMTZMNi45MiAxNi4wMUw5LjE2IDEzLjc3TDYuOTIgMTEuNTNMNC40NCAxNFoiIGZpbGw9IiMxRTFFMUUiLz4KPC9zdmc+Cg==';
      case 'USDT':
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMyNkE3N0EiLz4KPHBhdGggZD0iTTE3LjkxIDkuNzNIMjEuOThWMTIuNDhIMTcuOTFWMTQuOThDMjAuNDcgMTUuMDggMjIuMzMgMTUuNDIgMjIuMzMgMTUuODJTMjAuNDcgMTYuNTYgMTcuOTEgMTYuNjVWMjFIMTQuMDlWMTYuNjVDMTEuNTMgMTYuNTYgOS42NyAxNi4yMiA5LjY3IDE1LjgyUzExLjUzIDE1LjA4IDE0LjA5IDE0Ljk4VjEyLjQ4SDEwLjAyVjkuNzNIMTcuOTFaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
      default:
        return null;
    }
  };

  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`/api/favorites/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Removed from favorites",
        description: "Product has been removed from your wishlist",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove product from favorites",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFromFavorites = (productId: string) => {
    removeFromFavoritesMutation.mutate(productId);
  };

  const handleViewProduct = (productId: string) => {
    setLocation(`/product/${productId}`);
  };

  const handleGoToMarketplace = () => {
    setLocation('/marketplace');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your favorites...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation('/')}
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
              >
                <Home className="h-5 w-5" />
              </Button>
              <Heart className="h-6 w-6 text-red-500 fill-current" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                ref={walletButtonRef}
                onClick={() => setShowWalletHover(!showWalletHover)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative"
              >
                <Wallet className="h-5 w-5" />
              </Button>
              
              <Button
                onClick={() => setShowCart(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 dark:bg-cyan-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Wallet Overview */}
          <div className="lg:w-80 flex-shrink-0">
            <Card className="bg-card border-border sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Wallet Overview</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBalances(!showBalances)}
                    className="h-8 w-8"
                  >
                    {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="space-y-4">
                  {walletBalances.map((balance) => {
                    const logo = getCurrencyLogo(balance.currency);
                    return (
                      <div key={balance.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center space-x-3">
                          {logo ? (
                            <img 
                              src={logo} 
                              alt={balance.currency}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {balance.currency.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground text-sm flex items-center gap-1">
                              {balance.currency}
                              <span className="text-xs opacity-60">
                                {balance.currency === 'BTC' ? '₿' :
                                 balance.currency === 'BNB' ? '⬢' :
                                 balance.currency === 'USDT' ? '₮' :
                                 balance.currency === 'COYN' ? 'C' : ''}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {balance.currency === 'BTC' ? 'Bitcoin' :
                               balance.currency === 'BNB' ? 'Binance Coin' :
                               balance.currency === 'USDT' ? 'Tether' :
                               balance.currency === 'COYN' ? 'COYN Token' : balance.currency}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground text-sm">
                            {showBalances ? balance.balance : '****'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {showBalances ? `$${balance.usdValue}` : '****'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {walletBalances.length === 0 && (
                  <div className="text-center py-6">
                    <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No wallet balances found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Favorites */}
          <div className="flex-1">
            {favorites.length === 0 ? (
              <div className="text-center py-16">
                <div className="mb-6">
                  <Heart className="h-24 w-24 text-muted-foreground mx-auto opacity-50" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Your wishlist is empty</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Start adding products to your favorites by clicking the heart icon on any product you like.
                </p>
                <Button
                  onClick={handleGoToMarketplace}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Explore Marketplace
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                      {favorites.length} {favorites.length === 1 ? 'item' : 'items'} in your wishlist
                    </p>
                    <Badge variant="secondary" className="text-sm">
                      {favorites.length} Favorites
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {favorites.map((favorite) => (
                    <Card 
                      key={favorite.id} 
                      className="bg-card border-border hover:shadow-lg transition-all duration-300 group"
                    >
                      <CardContent className="p-4">
                        <div className="relative mb-4">
                          <div className="aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
                            <img
                              src={favorite.productImage}
                              alt={favorite.productTitle}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                          <Button
                            onClick={() => handleRemoveFromFavorites(favorite.productId)}
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black hover:scale-110 transition-all duration-200"
                            disabled={removeFromFavoritesMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <h3 className="font-medium text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                              onClick={() => handleViewProduct(favorite.productId)}>
                            {favorite.productTitle}
                          </h3>

                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < Math.floor(favorite.productRating)
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ({favorite.productRating})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-foreground">
                              {favorite.productPrice}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {favorite.productCategory}
                            </Badge>
                          </div>

                          <Button
                            onClick={() => {
                              const cartItem = {
                                ASIN: favorite.productId,
                                title: favorite.productTitle,
                                price: favorite.productPrice,
                                imageUrl: favorite.productImage,
                                currency: 'USD'
                              };
                              const newCount = addToCart(cartItem);
                              setCartCount(newCount);
                              toast({
                                title: "Added to Cart",
                                description: `${favorite.productTitle} has been added to your cart`
                              });
                            }}
                            size="sm"
                            className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AmazonCheckout 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />

      <WalletHover
        isVisible={showWalletHover}
        onClose={() => setShowWalletHover(false)}
        anchorRef={walletButtonRef}
      />
    </div>
  );
}