import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart as ShoppingCartIcon, Trash2, Plus, Minus, CreditCard, Wallet, X, MapPin, Check, ArrowLeft, ArrowRight, Package, Truck, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

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

interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
}

export default function ShoppingCartComponent({ isOpen, onClose }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'address' | 'review' | 'payment'>('address');
  const [selectedCrypto, setSelectedCrypto] = useState<keyof typeof CRYPTO_RATES>("BTC");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    phoneNumber: ''
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [expressShipping, setExpressShipping] = useState(false);
  const { toast } = useToast();

  // Fetch user data to pre-populate address
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    staleTime: 1000 * 60 * 5,
  });

  // Auto-open checkout when cart opens and has items
  useEffect(() => {
    if (isOpen && cartItems.length > 0 && !showCheckoutModal) {
      setShowCheckoutModal(true);
      setCheckoutStep('address');
    }
  }, [isOpen, cartItems.length, showCheckoutModal]);

  // Pre-populate address from user data
  useEffect(() => {
    if (user && showCheckoutModal) {
      setShippingAddress(prev => ({
        ...prev,
        fullName: (user as any).fullName || (user as any).displayName || '',
        addressLine1: (user as any).addressLine1 || '',
        addressLine2: (user as any).addressLine2 || '',
        city: (user as any).city || '',
        state: (user as any).state || '',
        zipCode: (user as any).zipCode || '',
        country: (user as any).country || 'United States',
        phoneNumber: (user as any).phoneNumber || ''
      }));
    }
  }, [user, showCheckoutModal]);

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

  const validateAddress = () => {
    const required = ['fullName', 'addressLine1', 'city', 'state', 'zipCode', 'phoneNumber'];
    const missing = required.filter(field => !shippingAddress[field as keyof ShippingAddress].trim());
    
    if (missing.length > 0) {
      toast({
        title: "Address Required",
        description: `Please fill in: ${missing.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const calculateShippingCost = () => {
    return expressShipping ? 15.99 : 5.99;
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.0875; // 8.75% tax rate
  };

  const calculateTotalWithExtras = () => {
    const subtotal = calculateTotal();
    const shipping = calculateShippingCost();
    const tax = calculateTax(subtotal);
    return subtotal + shipping + tax;
  };

  const handleNextStep = () => {
    if (checkoutStep === 'address') {
      if (!validateAddress()) return;
      setCheckoutStep('review');
    } else if (checkoutStep === 'review') {
      setCheckoutStep('payment');
    }
  };

  const handleFinalizePurchase = async () => {
    if (!agreedToTerms) {
      toast({
        title: "Terms Required",
        description: "Please agree to the terms and conditions",
        variant: "destructive"
      });
      return;
    }

    const total = calculateTotalWithExtras();
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
      setCheckoutStep('address');
      setAgreedToTerms(false);
      onClose();
      
      toast({
        title: "Order Confirmed!",
        description: `Order #${Date.now().toString().slice(-6)} placed successfully. Estimated delivery: ${expressShipping ? '1-2' : '3-5'} business days.`,
      });
    }, 2000);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          checkoutStep === 'address' ? 'bg-orange-500 text-white' : 
          ['review', 'payment'].includes(checkoutStep) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {['review', 'payment'].includes(checkoutStep) ? <Check className="h-4 w-4" /> : '1'}
        </div>
        <span className="text-sm font-medium">Address</span>
        
        <div className="w-8 h-px bg-gray-300"></div>
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          checkoutStep === 'review' ? 'bg-orange-500 text-white' :
          checkoutStep === 'payment' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {checkoutStep === 'payment' ? <Check className="h-4 w-4" /> : '2'}
        </div>
        <span className="text-sm font-medium">Review</span>
        
        <div className="w-8 h-px bg-gray-300"></div>
        
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          checkoutStep === 'payment' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          3
        </div>
        <span className="text-sm font-medium">Payment</span>
      </div>
    </div>
  );

  const totalUSD = calculateTotal();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5" />
              Finalize Purchase ({cartItems.length} items)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCartIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
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
                    Complete Purchase
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5" />
              Checkout - {checkoutStep === 'address' ? 'Shipping Address' : 
                        checkoutStep === 'review' ? 'Order Review' : 'Payment'}
            </DialogTitle>
          </DialogHeader>

          {renderStepIndicator()}

          <div className="space-y-6">
            {/* Address Step */}
            {checkoutStep === 'address' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">Shipping Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      value={shippingAddress.phoneNumber}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="Street address, P.O. box, company name"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={shippingAddress.addressLine2}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, addressLine2: e.target.value }))}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State or Province"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="ZIP or Postal Code"
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={shippingAddress.country} onValueChange={(value) => setShippingAddress(prev => ({ ...prev, country: value }))}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderNotes">Order Notes (Optional)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special delivery instructions..."
                    className="bg-input border-border"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="expressShipping"
                    checked={expressShipping}
                    onCheckedChange={(checked) => setExpressShipping(checked === true)}
                  />
                  <Label htmlFor="expressShipping" className="text-sm">
                    Express Shipping (+$10.00) - Delivery in 1-2 business days
                  </Label>
                </div>
              </div>
            )}

            {/* Review Step */}
            {checkoutStep === 'review' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-foreground">Order Summary</h3>
                </div>

                {/* Shipping Address Summary */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{shippingAddress.fullName}</p>
                      <p>{shippingAddress.addressLine1}</p>
                      {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
                      <p>{shippingAddress.country}</p>
                      <p className="text-muted-foreground">Phone: {shippingAddress.phoneNumber}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Package className="h-4 w-4" />
                      Order Items ({cartItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.title} className="w-12 h-12 object-cover rounded" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-sm">${(parseFloat(item.price.replace(/[,$]/g, '')) * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Order Total Breakdown */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Order Total</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>${calculateShippingCost().toFixed(2)} {expressShipping && '(Express)'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${calculateTax(calculateTotal()).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-orange-500">${calculateTotalWithExtras().toFixed(2)} USD</span>
                    </div>
                  </CardContent>
                </Card>

                {orderNotes && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">Order Notes:</p>
                    <p className="text-sm text-muted-foreground">{orderNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Step */}
            {checkoutStep === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">Payment Method</h3>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-orange-500">
                    ${calculateTotalWithExtras().toFixed(2)} USD
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <p className="font-medium text-foreground">Select Cryptocurrency:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(CRYPTO_RATES).map(([crypto, rate]) => (
                      <Button
                        key={crypto}
                        variant={selectedCrypto === crypto ? "default" : "outline"}
                        className={`flex flex-col gap-2 h-auto py-4 ${
                          selectedCrypto === crypto 
                            ? "bg-orange-500 dark:bg-cyan-500 text-white" 
                            : "hover:bg-accent"
                        }`}
                        onClick={() => setSelectedCrypto(crypto as keyof typeof CRYPTO_RATES)}
                      >
                        <span className="font-bold text-lg">{crypto}</span>
                        <span className="text-sm opacity-75">
                          {convertToCrypto(calculateTotalWithExtras(), crypto as keyof typeof CRYPTO_RATES)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-accent/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">You will pay:</p>
                  <p className="font-bold text-2xl text-orange-500">
                    {convertToCrypto(calculateTotalWithExtras(), selectedCrypto)} {selectedCrypto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${calculateTotalWithExtras().toFixed(2)} USD
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Secure Transaction
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Your {selectedCrypto} will be securely converted to USD</li>
                    <li>• Payment processed through encrypted channels</li>
                    <li>• Products shipped within 24 hours</li>
                    <li>• Full buyer protection and refund policy</li>
                  </ul>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agreeTerms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <Label htmlFor="agreeTerms" className="text-sm">
                    I agree to the Terms of Service and Privacy Policy
                  </Label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              {checkoutStep !== 'address' && (
                <Button
                  variant="outline"
                  onClick={() => setCheckoutStep(
                    checkoutStep === 'payment' ? 'review' : 'address'
                  )}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>

              {checkoutStep !== 'payment' ? (
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizePurchase}
                  disabled={!agreedToTerms}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Complete Order
                </Button>
              )}
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