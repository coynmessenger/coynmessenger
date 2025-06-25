import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Home, Star, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
  });

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
            <Button
              onClick={handleGoToMarketplace}
              variant="ghost"
              size="icon"
              className="hover:bg-accent"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                          const newCount = addToCart(favorite);
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
  );
}