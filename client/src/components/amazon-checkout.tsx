import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingCart as ShoppingCartIcon, Trash2, Plus, Minus, CreditCard, Wallet, X, MapPin, Check, ArrowLeft, ArrowRight, Package, Truck, Shield, ChevronRight } from "lucide-react";
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

interface AmazonCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const CRYPTO_RATES = {
  BTC: "107,260.45",
  BNB: "645.13", 
  USDT: "1.00",
  COYN: "2.45"
} as const;

export default function AmazonCheckout({ isOpen, onClose }: AmazonCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<'cart' | 'review' | 'finalize'>('cart');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
  const [shippingOption, setShippingOption] = useState<'standard' | 'express'>('standard');
  const [orderNotes, setOrderNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  // Fetch user data for address pre-population
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    staleTime: 1000 * 60 * 5,
  });

  // Load cart from localStorage
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('shopping-cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
        } catch (error) {
          console.error('Error loading cart:', error);
          setCartItems([]);
        }
      }
    };
    loadCart();
  }, []);

  // Refresh cart when dialog opens
  useEffect(() => {
    if (isOpen) {
      const savedCart = localStorage.getItem('shopping-cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
        } catch (error) {
          console.error('Error loading cart:', error);
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    }
  }, [isOpen]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopping-cart', JSON.stringify(cartItems));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { count: cartItems.reduce((total, item) => total + item.quantity, 0) }
    }));
  }, [cartItems]);

  // Pre-populate address when moving to review step
  useEffect(() => {
    if (currentStep === 'review' && user) {
      setShippingAddress(prev => ({
        ...prev,
        fullName: (user as any).fullName || (user as any).displayName || prev.fullName,
        addressLine1: (user as any).addressLine1 || prev.addressLine1,
        addressLine2: (user as any).addressLine2 || prev.addressLine2,
        city: (user as any).city || prev.city,
        state: (user as any).state || prev.state,
        zipCode: (user as any).zipCode || prev.zipCode,
        country: (user as any).country || prev.country || 'United States',
        phoneNumber: (user as any).phoneNumber || prev.phoneNumber
      }));
    }
  }, [currentStep, user]);

  // Reset to cart step when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('cart');
    }
  }, [isOpen]);

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price.replace('$', ''));
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateShipping = () => {
    return shippingOption === 'express' ? 9.99 : 4.99;
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax();
  };

  const convertToCrypto = (usdAmount: number) => {
    const rate = parseFloat(CRYPTO_RATES[selectedCrypto].replace(',', ''));
    return (usdAmount / rate).toFixed(8);
  };

  const proceedToReview = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before proceeding.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('review');
  };

  const proceedToFinalize = () => {
    // Validate shipping address
    if (!shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      toast({
        title: "Incomplete Address",
        description: "Please fill in all required shipping address fields.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('finalize');
  };

  const completePurchase = () => {
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    // Simulate purchase completion
    toast({
      title: "Order Placed Successfully!",
      description: `Your order of ${cartItems.length} item(s) has been confirmed. You'll receive a confirmation email shortly.`,
    });
    
    // Clear cart and close
    setCartItems([]);
    localStorage.removeItem('shopping-cart');
    setCurrentStep('cart');
    onClose();
  };

  const goBackToCart = () => setCurrentStep('cart');
  const goBackToReview = () => setCurrentStep('review');

  const handleClose = () => {
    setCurrentStep('cart');
    onClose();
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-6 px-4">
      <div className="flex items-center space-x-4">
        {/* Step 1: Cart */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'cart' ? 'bg-orange-500 text-white' : 
            currentStep === 'review' || currentStep === 'finalize' ? 'bg-green-500 text-white' : 
            'bg-gray-200 text-gray-600'
          }`}>
            {currentStep === 'review' || currentStep === 'finalize' ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <span className={`ml-2 text-sm font-medium ${currentStep === 'cart' ? 'text-orange-500' : 'text-gray-600'}`}>
            Cart
          </span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-400" />
        
        {/* Step 2: Review */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'review' ? 'bg-orange-500 text-white' : 
            currentStep === 'finalize' ? 'bg-green-500 text-white' : 
            'bg-gray-200 text-gray-600'
          }`}>
            {currentStep === 'finalize' ? <Check className="w-4 h-4" /> : '2'}
          </div>
          <span className={`ml-2 text-sm font-medium ${currentStep === 'review' ? 'text-orange-500' : 'text-gray-600'}`}>
            Review
          </span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-gray-400" />
        
        {/* Step 3: Finalize */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'finalize' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <span className={`ml-2 text-sm font-medium ${currentStep === 'finalize' ? 'text-orange-500' : 'text-gray-600'}`}>
            Finalize
          </span>
        </div>
      </div>
    </div>
  );

  const renderCartStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shopping Cart ({cartItems.length} items)</h3>
      </div>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Your cart is empty</p>
          <Button onClick={onClose} className="mt-4">Continue Shopping</Button>
        </div>
      ) : (
        <>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center space-x-4">
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.title}</h4>
                    <p className="text-green-600 font-semibold">{item.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <Card className="p-4 bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>${calculateShipping().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </Card>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Continue Shopping
            </Button>
            <Button onClick={proceedToReview} className="bg-orange-500 hover:bg-orange-600">
              Proceed to Review
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Review Your Order</h3>
      
      {/* Shipping Address */}
      <Card className="p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Shipping Address
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={shippingAddress.fullName}
                onChange={(e) => setShippingAddress(prev => ({...prev, fullName: e.target.value}))}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={shippingAddress.phoneNumber}
                onChange={(e) => setShippingAddress(prev => ({...prev, phoneNumber: e.target.value}))}
                placeholder="Enter phone number"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="addressLine1">Address Line 1 *</Label>
            <Input
              id="addressLine1"
              value={shippingAddress.addressLine1}
              onChange={(e) => setShippingAddress(prev => ({...prev, addressLine1: e.target.value}))}
              placeholder="Street address"
            />
          </div>
          
          <div>
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={shippingAddress.addressLine2}
              onChange={(e) => setShippingAddress(prev => ({...prev, addressLine2: e.target.value}))}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress(prev => ({...prev, city: e.target.value}))}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress(prev => ({...prev, state: e.target.value}))}
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={shippingAddress.zipCode}
                onChange={(e) => setShippingAddress(prev => ({...prev, zipCode: e.target.value}))}
                placeholder="ZIP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Options */}
      <Card className="p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base flex items-center">
            <Truck className="w-4 h-4 mr-2" />
            Shipping Options
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <RadioGroup value={shippingOption} onValueChange={(value: 'standard' | 'express') => setShippingOption(value)}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="standard" id="standard" />
              <Label htmlFor="standard" className="flex-1 cursor-pointer">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Standard Shipping</p>
                    <p className="text-sm text-gray-600">5-7 business days</p>
                  </div>
                  <span className="font-semibold">$4.99</span>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="express" id="express" />
              <Label htmlFor="express" className="flex-1 cursor-pointer">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">Express Shipping</p>
                    <p className="text-sm text-gray-600">2-3 business days</p>
                  </div>
                  <span className="font-semibold">$9.99</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card className="p-4 bg-gray-50">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Items ({cartItems.length}):</span>
              <span>${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>${calculateShipping().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${calculateTax().toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg text-orange-600">
              <span>Order Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBackToCart}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>
        <Button onClick={proceedToFinalize} className="bg-orange-500 hover:bg-orange-600">
          Continue to Payment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderFinalizeStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Finalize Your Order</h3>
      
      {/* Payment Method */}
      <Card className="p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base flex items-center">
            <Wallet className="w-4 h-4 mr-2" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Select value={selectedCrypto} onValueChange={(value: keyof typeof CRYPTO_RATES) => setSelectedCrypto(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select cryptocurrency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">Bitcoin (BTC) - ${CRYPTO_RATES.BTC}</SelectItem>
              <SelectItem value="BNB">Binance Coin (BNB) - ${CRYPTO_RATES.BNB}</SelectItem>
              <SelectItem value="USDT">Tether (USDT) - ${CRYPTO_RATES.USDT}</SelectItem>
              <SelectItem value="COYN">COYN Token - ${CRYPTO_RATES.COYN}</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              Total: ${calculateTotal().toFixed(2)} = {convertToCrypto(calculateTotal())} {selectedCrypto}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Rate: 1 {selectedCrypto} = ${CRYPTO_RATES[selectedCrypto]}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Review */}
      <Card className="p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base">Shipping Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-sm space-y-1">
            <p className="font-medium">{shippingAddress.fullName}</p>
            <p>{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
            <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
            <p>{shippingAddress.country}</p>
            <p>Phone: {shippingAddress.phoneNumber}</p>
            <p className="text-orange-600 font-medium mt-2">
              {shippingOption === 'express' ? 'Express Shipping (2-3 days)' : 'Standard Shipping (5-7 days)'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Notes */}
      <Card className="p-4">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base">Order Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Special delivery instructions, gift message, etc."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="terms"
          checked={agreedToTerms}
          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
        />
        <Label htmlFor="terms" className="text-sm leading-relaxed">
          I agree to the{" "}
          <a href="#" className="text-orange-600 hover:underline">Terms and Conditions</a>
          {" "}and{" "}
          <a href="#" className="text-orange-600 hover:underline">Privacy Policy</a>.
          By placing this order, I understand that payment will be processed in cryptocurrency.
        </Label>
      </div>

      {/* Final Order Summary */}
      <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
        <div className="space-y-2">
          <div className="flex justify-between font-semibold text-lg">
            <span>Final Total:</span>
            <span className="text-orange-600">${calculateTotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-orange-700">
            <span>Crypto Amount:</span>
            <span>{convertToCrypto(calculateTotal())} {selectedCrypto}</span>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={goBackToReview}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Review
        </Button>
        <Button 
          onClick={completePurchase} 
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={!agreedToTerms}
        >
          <Shield className="w-4 h-4 mr-2" />
          Place Order
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 sm:p-6 border-b border-border">
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {currentStep === 'cart' && 'Shopping Cart'}
              {currentStep === 'review' && 'Review Your Order'}
              {currentStep === 'finalize' && 'Finalize Purchase'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {currentStep === 'cart' && 'Manage items in your shopping cart and proceed to checkout'}
              {currentStep === 'review' && 'Review your order details and shipping information before finalizing'}
              {currentStep === 'finalize' && 'Complete your purchase with cryptocurrency payment'}
            </DialogDescription>
          </DialogHeader>
          
          {renderProgressBar()}
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {currentStep === 'cart' && renderCartStep()}
            {currentStep === 'review' && renderReviewStep()}
            {currentStep === 'finalize' && renderFinalizeStep()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}