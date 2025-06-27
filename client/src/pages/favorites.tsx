import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Home, ShoppingCart, Star, ArrowUp, Settings, Wallet, Store } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import MarketplaceCheckout from "@/components/marketplace-checkout";
import MarketplaceWalletHover from "@/components/marketplace-wallet-hover";
import WalletModal from "@/components/wallet-modal";

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
  useScrollToTop();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showWalletHover, setShowWalletHover] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

  // Wallet modal handlers
  const handleOpenSend = () => {
    setShowWalletModal(true);
  };

  const handleOpenReceive = () => {
    setShowWalletModal(true);
  };
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest('DELETE', `/api/favorites/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Removed from Favorites",
        description: "Item has been removed from your favorites list.",
      });
    },
    onError: (error) => {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from favorites. Please try again.",
        variant: "destructive",
      });
    }
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleCartUpdate = () => {
      // Just invalidate queries when cart is updated - don't force cart dialog open
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
  }, [queryClient]);

  const addToCart = (favorite: Favorite) => {
    const cartItem = {
      id: favorite.productId,
      title: favorite.productTitle,
      price: favorite.productPrice,
      imageUrl: favorite.productImage,
      quantity: 1,
      currency: 'USD'
    };

    const existingCart = JSON.parse(localStorage.getItem('shopping-cart') || '[]');
    const existingItemIndex = existingCart.findIndex((item: any) => item.id === cartItem.id);

    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem('shopping-cart', JSON.stringify(existingCart));
    
    // Dispatch custom event to update cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    toast({
      title: "Added to Cart",
      description: `${favorite.productTitle} has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 sm:px-4 py-3 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-3">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
                >
                  <Home className="h-6 w-6 sm:h-4 sm:w-4" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
                >
                  <Store className="h-6 w-6 sm:h-4 sm:w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Google Product Sans, sans-serif' }}>
                Favorites
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-2">
              <Button
                ref={walletButtonRef}
                onClick={() => setShowWalletHover(!showWalletHover)}
                variant="outline"
                size="sm"
                className="hover:bg-accent relative h-12 sm:h-9 px-4 sm:px-3 touch-manipulation bg-white/80 dark:bg-slate-800/80 border-orange-200 dark:border-cyan-600"
                title="View payment methods and balance"
              >
                <Wallet className="h-4 w-4 sm:h-3 sm:w-3 text-orange-500 dark:text-cyan-400 mr-2 sm:mr-1" />
                <span className="text-sm font-medium text-orange-600 dark:text-cyan-400">Balance</span>
              </Button>
              
              <Button
                onClick={() => setShowCart(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <ShoppingCart className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">No Favorites Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start adding products to your favorites by clicking the heart icon on any product in the marketplace.
              </p>
            </div>
            <Link href="/marketplace">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Explore Marketplace
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {favorites.length} {favorites.length === 1 ? 'item' : 'items'} in your favorites
                </p>
                <Badge variant="secondary" className="text-sm">
                  {favorites.length} Favorites
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <Card 
                  key={favorite.id} 
                  className="group hover:shadow-lg transition-all duration-200 border-border bg-card overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={favorite.productImage}
                        alt={favorite.productTitle}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background text-red-500 hover:text-red-600"
                        onClick={() => removeFavoriteMutation.mutate(favorite.productId)}
                        disabled={removeFavoriteMutation.isPending}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-medium text-foreground mb-2 line-clamp-2 text-sm leading-tight">
                        {favorite.productTitle}
                      </h3>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-primary">
                          ${favorite.productPrice}
                        </span>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="text-xs text-muted-foreground">
                            {favorite.productRating}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link href={`/product/${favorite.productId}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            View Details
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                          onClick={() => addToCart(favorite)}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Cart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-50"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      <MarketplaceCheckout 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />

      <MarketplaceWalletHover
        isVisible={showWalletHover}
        onClose={() => setShowWalletHover(false)}
        anchorRef={walletButtonRef}
        onProceedToCheckout={() => setShowCart(true)}
      />

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
  );
}