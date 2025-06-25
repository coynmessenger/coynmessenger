import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  title: string;
  price: string;
  imageUrl?: string;
  quantity: number;
  currency: string;
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRYPTO_RATES = {
  BTC: "96,845.23",
  BNB: "683.12", 
  USDT: "1.00",
  COYN: "2.45"
} as const;

export default function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<keyof typeof CRYPTO_RATES>("BTC");
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('shoppingCart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
  }, [cartItems]);

  const updateQuantity = (id: string, change: number) => {
    setCartItems(items => 
      items.map(item => 
        item.id === id 
          ? { ...item, quantity: Math.max(0, item.quantity + change) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart"
    });
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace(/[,$]/g, ''));
      return total + (price * item.quantity);
    }, 0);
  };

  const convertToCrypto = (usdAmount: number, crypto: keyof typeof CRYPTO_RATES) => {
    const rate = parseFloat(CRYPTO_RATES[crypto].replace(/[,$]/g, ''));
    return (usdAmount / rate).toFixed(8);
  };

  const handleFinalizePurchase = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to your cart before checking out",
        variant: "destructive"
      });
      return;
    }

    const total = calculateTotal();
    const cryptoAmount = convertToCrypto(total, selectedCrypto);

    // Simulate purchase processing
    toast({
      title: "Processing Purchase...",
      description: `Converting ${total.toFixed(2)} USD to ${cryptoAmount} ${selectedCrypto}`
    });

    // Simulate API call delay
    setTimeout(() => {
      // Clear cart after successful purchase
      setCartItems([]);
      setShowCheckoutModal(false);
      onClose();
      
      toast({
        title: "Purchase Complete!",
        description: `Successfully purchased ${cartItems.length} items for ${cryptoAmount} ${selectedCrypto}`,
      });
    }, 2000);
  };

  const totalUSD = calculateTotal();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({cartItems.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground">Add some items from the marketplace to get started</p>
              </div>
            ) : (
              <>
                {cartItems.map((item) => (
                  <Card key={item.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground line-clamp-2">{item.title}</h4>
                          <p className="text-lg font-bold text-orange-500 dark:text-cyan-400">
                            ${item.price}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-foreground">Total:</span>
                    <span className="text-2xl font-bold text-orange-500 dark:text-cyan-400">
                      ${totalUSD.toFixed(2)} USD
                    </span>
                  </div>

                  <Button
                    onClick={() => setShowCheckoutModal(true)}
                    className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-medium py-3"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Finalize Purchase
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Wallet className="h-5 w-5" />
              Complete Purchase
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-orange-500 dark:text-cyan-400">
                ${totalUSD.toFixed(2)} USD
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="font-medium text-foreground">Pay with Cryptocurrency:</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CRYPTO_RATES).map(([crypto, rate]) => (
                  <Button
                    key={crypto}
                    variant={selectedCrypto === crypto ? "default" : "outline"}
                    className={`flex flex-col gap-1 h-auto py-3 ${
                      selectedCrypto === crypto 
                        ? "bg-orange-500 dark:bg-cyan-500 text-white" 
                        : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedCrypto(crypto as keyof typeof CRYPTO_RATES)}
                  >
                    <span className="font-bold">{crypto}</span>
                    <span className="text-xs opacity-75">
                      {convertToCrypto(totalUSD, crypto as keyof typeof CRYPTO_RATES)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-accent/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground mb-1">You will pay:</p>
              <p className="font-bold text-lg text-orange-500 dark:text-cyan-400">
                {convertToCrypto(totalUSD, selectedCrypto)} {selectedCrypto}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFinalizePurchase}
                className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Confirm Purchase
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export function to add items to cart
export const addToCart = (product: {
  ASIN: string;
  title: string;
  price: string;
  imageUrl?: string;
  currency?: string;
}) => {
  const cartItems = JSON.parse(localStorage.getItem('shoppingCart') || '[]') as CartItem[];
  
  const existingItem = cartItems.find(item => item.id === product.ASIN);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({
      id: product.ASIN,
      title: product.title,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
      currency: product.currency || 'USD'
    });
  }
  
  localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
  
  return cartItems.length;
};

// Export function to get cart count
export const getCartCount = (): number => {
  const cartItems = JSON.parse(localStorage.getItem('shoppingCart') || '[]') as CartItem[];
  return cartItems.reduce((total, item) => total + item.quantity, 0);
};