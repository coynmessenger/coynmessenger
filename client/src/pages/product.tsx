import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  Share, 
  ShoppingCart, 
  Truck, 
  Shield, 
  RotateCcw, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Users,
  Check,
  Copy,
  ArrowUp,
  Settings,
  Wallet
} from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";
import ShoppingCartComponent, { addToCart, getCartCount } from "@/components/shopping-cart";
import WalletHover from "@/components/wallet-hover";
import SettingsModal from "@/components/settings-modal";

interface AmazonProduct {
  ASIN: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  images?: string[];
  productUrl: string;
  rating: number;
  reviewCount: number;
  category: string;
  brand?: string;
  description?: string;
}

interface CryptoRates {
  BTC: number;
  BNB: number;
  USDT: number;
  COYN: number;
}

interface PurchaseModalProps {
  product: AmazonProduct | null;
  isOpen: boolean;
  onClose: () => void;
  cryptoRates: CryptoRates;
}

interface ShareModalProps {
  product: AmazonProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

function ShareModal({ product, isOpen, onClose }: ShareModalProps) {
  const { toast } = useToast();
  
  if (!product) return null;

  const shareUrl = `${window.location.origin}/product/${product.ASIN}`;
  const shareMessage = `Check out this product: ${product.title} - ${product.price} ${product.currency}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Product link has been copied to clipboard",
    });
  };

  const handleShareToChat = () => {
    // Store the share data for use in messenger
    localStorage.setItem('pendingShare', JSON.stringify({
      type: 'product',
      product: product,
      url: shareUrl,
      message: shareMessage
    }));
    
    toast({
      title: "Ready to share",
      description: "Open messenger to share this product with your contacts",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center">
            <Share className="h-5 w-5 mr-2" />
            Share Product
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">{product.title}</h4>
                <p className="text-sm text-muted-foreground">{product.price} {product.currency}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleShareToChat}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Share to Chat
            </Button>
            
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full border-border"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseModal({ product, isOpen, onClose, cryptoRates }: PurchaseModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState("COYN");
  const { toast } = useToast();

  if (!product) return null;

  const priceUSD = parseFloat(product.price.replace(/[^0-9.]/g, ''));
  const cryptoPrice = priceUSD / cryptoRates[selectedCrypto as keyof CryptoRates];

  const handlePurchase = () => {
    toast({
      title: "Purchase initiated",
      description: `Processing payment of ${cryptoPrice.toFixed(6)} ${selectedCrypto}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Complete Purchase
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">{product.title}</h4>
                <p className="text-sm text-muted-foreground">{product.price} {product.currency}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Payment Method</label>
            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="COYN">COYN</SelectItem>
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                <SelectItem value="USDT">Tether (USDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total:</span>
              <div className="text-right">
                <div className="text-lg font-bold text-foreground">
                  {cryptoPrice.toFixed(6)} {selectedCrypto}
                </div>
                <div className="text-xs text-muted-foreground">
                  ≈ ${priceUSD.toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pay with {selectedCrypto}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/product/:asin');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showWalletHover, setShowWalletHover] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  // Get product ASIN from URL params
  const productASIN = params?.asin;

  const { data: products = [] } = useQuery<AmazonProduct[]>({
    queryKey: ["/api/amazon/search", ""],
  });

  const { data: cryptoRates = { BTC: 100000, BNB: 600, USDT: 1, COYN: 0.5 } } = useQuery<CryptoRates>({
    queryKey: ["/api/crypto/rates"],
  });

  const { data: favoriteStatus } = useQuery({
    queryKey: ['/api/favorites/status', productASIN],
    enabled: !!productASIN,
  });

  // Find the current product
  const product = products.find(p => p.ASIN === productASIN);
  
  // Get suggested products (exclude current product)
  const suggestedProducts = products
    .filter(p => p.ASIN !== productASIN && p.category === product?.category)
    .slice(0, 6);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Always scroll to top when product page loads or product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCartCount(getCartCount());
  }, [productASIN]);

  // Update cart count when cart modal closes
  useEffect(() => {
    if (!showCart) {
      setCartCount(getCartCount());
    }
  }, [showCart]);

  // Update favorite status when data changes  
  useEffect(() => {
    if (favoriteStatus && typeof favoriteStatus === 'object' && favoriteStatus !== null && 'isFavorite' in favoriteStatus) {
      setIsWishlisted(Boolean((favoriteStatus as any).isFavorite));
    }
  }, [favoriteStatus]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = async () => {
    if (!product) return;

    try {
      if (isWishlisted) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${product.ASIN}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setIsWishlisted(false);
          toast({
            title: "Removed from favorites",
            description: "Product has been removed from your wishlist",
          });
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.ASIN,
            productTitle: product.title,
            productPrice: `${product.price} ${product.currency}`,
            productImage: product.imageUrl,
            productCategory: product.category,
            productRating: product.rating,
          }),
        });
        
        if (response.ok) {
          setIsWishlisted(true);
          toast({
            title: "Added to favorites",
            description: "Product has been added to your wishlist",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  if (!productASIN || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Product Not Found</h1>
          <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/marketplace')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const priceUSD = parseFloat(product.price.replace(/[^0-9.]/g, ''));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation('/marketplace')}
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => setLocation('/favorites')}
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </div>
            <img 
              src={coynLogoPath} 
              alt="COYN Logo" 
              className="w-8 h-8"
            />
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => setShowCart(true)}
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                    {cartCount}
                  </Badge>
                )}
              </Button>
              <Button
                ref={walletButtonRef}
                onClick={() => setShowWalletHover(!showWalletHover)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative"
              >
                <Wallet className="h-5 w-5 text-orange-500 dark:text-cyan-400" />
              </Button>
              <Button
                onClick={() => setShowSettingsModal(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden">
              <img
                src={images[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = product.imageUrl;
                }}
              />
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 bg-white dark:bg-slate-800 rounded border-2 overflow-hidden ${
                      index === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = product.imageUrl;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {product.brand && (
                    <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
                  )}
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                    {product.title}
                  </h1>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsWishlisted(!isWishlisted)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowShareModal(true)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Share className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share product</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-500 fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">{product.rating}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.reviewCount.toLocaleString()} reviews
                </span>
              </div>

              {/* Category */}
              <Badge variant="secondary" className="mb-4">
                {product.category}
              </Badge>
            </div>

            {/* Price */}
            <div className="bg-muted rounded-lg p-6">
              <div className="flex items-baseline space-x-2 mb-4">
                <span className="text-3xl font-bold text-foreground">
                  {product.price} {product.currency}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-4">
                <div>
                  <div className="font-medium">Crypto Equivalent:</div>
                  <div>≈ {(priceUSD / cryptoRates.COYN).toFixed(4)} COYN</div>
                  <div>≈ {(priceUSD / cryptoRates.BTC).toFixed(6)} BTC</div>
                </div>
                <div>
                  <div className="font-medium">Also accepts:</div>
                  <div>BNB, USDT</div>
                  <div>Instant conversion</div>
                </div>
              </div>

              <Button
                onClick={() => {
                  if (product) {
                    const newCount = addToCart(product);
                    setCartCount(newCount);
                    toast({
                      title: "Added to Cart",
                      description: `${product.title} has been added to your cart`
                    });
                  }
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Free Shipping</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Secure Payment</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Easy Returns</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Products - Horizontal Scroll */}
        {suggestedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">You might also like</h2>
              <Button
                onClick={() => setLocation('/marketplace')}
                variant="outline"
                size="sm"
                className="border-border text-sm"
              >
                View All
              </Button>
            </div>
            
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {suggestedProducts.map((suggestedProduct) => (
                <Card 
                  key={suggestedProduct.ASIN}
                  className="bg-card border-border hover:shadow-lg transition-shadow cursor-pointer group flex-shrink-0 w-48"
                  onClick={() => setLocation(`/product/${suggestedProduct.ASIN}`)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden mb-3">
                      <img
                        src={suggestedProduct.imageUrl}
                        alt={suggestedProduct.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {suggestedProduct.title}
                      </h3>
                      
                      <div className="flex items-center space-x-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-2.5 w-2.5 ${
                                i < Math.floor(suggestedProduct.rating)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({suggestedProduct.reviewCount})
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-foreground">
                          {suggestedProduct.price} {suggestedProduct.currency}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {suggestedProduct.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* NFT Rewards Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">NFT Purchase Rewards</h2>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              Exclusive COYN Collection
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                rank: "Bronze",
                threshold: "$50+",
                nftImage: "🥉",
                description: "Basic tier NFT with standard utility",
                rarity: "Common",
                gradient: "from-amber-600 to-amber-400"
              },
              {
                rank: "Silver", 
                threshold: "$150+",
                nftImage: "🥈",
                description: "Enhanced NFT with bonus features",
                rarity: "Uncommon",
                gradient: "from-gray-600 to-gray-400"
              },
              {
                rank: "Gold",
                threshold: "$300+", 
                nftImage: "🥇",
                description: "Premium NFT with exclusive benefits",
                rarity: "Rare",
                gradient: "from-yellow-600 to-yellow-400"
              },
              {
                rank: "Diamond",
                threshold: "$500+",
                nftImage: "💎",
                description: "Ultimate NFT with maximum utility",
                rarity: "Legendary",
                gradient: "from-cyan-600 to-blue-400"
              }
            ].map((reward, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-4">
                  <div className={`bg-gradient-to-br ${reward.gradient} rounded-lg p-4 mb-4 text-center`}>
                    <div className="text-4xl mb-2">{reward.nftImage}</div>
                    <div className="text-white font-bold text-lg">{reward.rank}</div>
                    <div className="text-white/80 text-sm">{reward.threshold}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          reward.rarity === 'Legendary' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          reward.rarity === 'Rare' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          reward.rarity === 'Uncommon' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {reward.rarity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {reward.description}
                    </p>
                    
                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground mb-1">Unlock at:</div>
                      <div className="text-sm font-semibold text-foreground">{reward.threshold} purchase value</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎁</div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1">How NFT Rewards Work</h4>
                <p className="text-sm text-muted-foreground">
                  Purchase products using COYN and unlock exclusive NFTs based on your total purchase value. 
                  Each NFT provides unique benefits including discounts, early access, and special privileges in the COYN ecosystem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 z-50"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Modals */}
      <PurchaseModal
        product={product}
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        cryptoRates={cryptoRates}
      />
      
      <ShareModal
        product={product}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
      
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        showShipping={true}
      />
      
      <ShoppingCartComponent 
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