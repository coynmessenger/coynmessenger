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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";

// Utility function to format prices with commas
const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "NZ", name: "New Zealand" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "RU", name: "Russia" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "GR", name: "Greece" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "TW", name: "Taiwan" },
] as const;

const STATES_PROVINCES: Record<string, string[]> = {
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
  ],
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon"
  ],
  GB: [
    "England", "Scotland", "Wales", "Northern Ireland"
  ],
  AU: [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
    "South Australia", "Tasmania", "Victoria", "Western Australia"
  ],
  DE: [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
    "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz",
    "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
  ],
  FR: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine",
    "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur"
  ],
  IT: [
    "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia",
    "Lazio", "Liguria", "Lombardia", "Marche", "Molise", "Piemonte", "Puglia", "Sardegna",
    "Sicilia", "Toscana", "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
  ],
  ES: [
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria", "Castilla-La Mancha",
    "Castilla y León", "Cataluña", "Ceuta", "Extremadura", "Galicia", "La Rioja", "Madrid",
    "Melilla", "Murcia", "Navarra", "País Vasco", "Valencia"
  ],
  NL: [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "Noord-Brabant",
    "Noord-Holland", "Overijssel", "Utrecht", "Zeeland", "Zuid-Holland"
  ],
  BE: [
    "Antwerpen", "Brussels", "Hainaut", "Limburg", "Liège", "Luxembourg", "Namur",
    "Oost-Vlaanderen", "Vlaams-Brabant", "West-Vlaanderen"
  ],
  CH: [
    "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft", "Basel-Stadt",
    "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden", "Jura", "Lucerne", "Neuchâtel",
    "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Thurgau",
    "Ticino", "Uri", "Valais", "Vaud", "Zug", "Zurich"
  ],
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"
  ],
  JP: [
    "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima", "Ibaraki",
    "Tochigi", "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa", "Niigata", "Toyama",
    "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie",
    "Shiga", "Kyoto", "Osaka", "Hyogo", "Nara", "Wakayama", "Tottori", "Shimane",
    "Okayama", "Hiroshima", "Yamaguchi", "Tokushima", "Kagawa", "Ehime", "Kochi",
    "Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa"
  ],
  BR: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo",
    "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba",
    "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
    "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ],
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "México",
    "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
    "Veracruz", "Yucatán", "Zacatecas", "Ciudad de México"
  ]
};

interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export default function ShoppingCartComponent({ isOpen, onClose }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'review' | 'payment'>('cart');
  const [selectedCrypto, setSelectedCrypto] = useState<keyof typeof CRYPTO_RATES>("BTC");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [expressShipping, setExpressShipping] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch user data to pre-populate address - Get connected user from localStorage
  const [connectedUser, setConnectedUser] = useState(() => {
    const connectedUserString = localStorage.getItem('connectedUser');
    return connectedUserString ? JSON.parse(connectedUserString) : null;
  });
  
  const { data: user } = useQuery({
    queryKey: ['/api/user', connectedUser?.id],
    enabled: !!connectedUser, // Only fetch when we have a connected user
    staleTime: 1000 * 60 * 5,
  });

  // Start with cart view when opening
  useEffect(() => {
    if (isOpen) {
      setCheckoutStep('cart');
      setShowCheckoutModal(false);
    }
  }, [isOpen]);

  // Pre-populate address from user data only when starting checkout
  useEffect(() => {
    if (user && checkoutStep === 'address' && !shippingAddress.fullName) {
      setShippingAddress(prev => ({
        ...prev,
        fullName: (user as any).fullName || (user as any).displayName || '',
        addressLine1: (user as any).addressLine1 || '',
        addressLine2: (user as any).addressLine2 || '',
        city: (user as any).city || '',
        state: (user as any).state || '',
        zipCode: (user as any).zipCode || '',
        country: (user as any).country || 'US'
      }));
    }
  }, [user, checkoutStep]);

  // Load cart from localStorage on mount and when modal opens
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('shopping-cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
        } catch (e) {
          console.error('Error loading cart:', e);
        }
      }
    };

    loadCart(); // Load immediately
    
    // Listen for cart updates and display name updates
    const handleCartUpdate = () => {
      loadCart();
    };
    
    const handleDisplayNameUpdate = () => {
      // Refresh connected user from localStorage
      const updatedUserString = localStorage.getItem('connectedUser');
      if (updatedUserString) {
        const updatedUser = JSON.parse(updatedUserString);
        setConnectedUser(updatedUser);
        queryClient.invalidateQueries({ queryKey: ['/api/user', updatedUser.id] });
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('displayNameUpdated', handleDisplayNameUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdate);
    };
  }, [isOpen]); // Re-load when modal opens

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopping-cart', JSON.stringify(cartItems));
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
    const required = ['fullName', 'addressLine1', 'city', 'state', 'zipCode'];
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

  const handleProductClick = (productId: string) => {
    onClose(); // Close the cart modal
    setLocation(`/product/${productId}`); // Navigate to product page
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

    if (!connectedUser) {
      toast({
        title: "User Required",
        description: "Please sign in to complete purchase",
        variant: "destructive"
      });
      return;
    }

    const total = calculateTotalWithExtras();
    const cryptoAmount = convertToCrypto(total, selectedCrypto);

    // Show processing message
    toast({
      title: "Processing Purchase...",
      description: `Converting ${cryptoAmount} ${selectedCrypto} to ${total.toFixed(2)} USD`
    });

    try {
      // Create purchase record in database
      const purchaseData = {
        userId: connectedUser.id,
        totalAmount: total,
        cryptoCurrency: selectedCrypto,
        cryptoAmount: parseFloat(cryptoAmount),
        items: cartItems,
        shippingAddress: shippingAddress,
        orderNotes: orderNotes,
        status: 'confirmed',
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        estimatedDelivery: expressShipping ? '1-2 business days' : '3-5 business days'
      };

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseData),
      });

      if (!response.ok) {
        throw new Error('Failed to record purchase');
      }

      const purchase = await response.json();

      // Clear cart only after successful purchase recording
      setCartItems([]);
      localStorage.setItem('shopping-cart', JSON.stringify([]));
      
      // Remove purchased items from favorites
      try {
        for (const item of cartItems) {
          const removeResponse = await apiRequest("DELETE", `/api/favorites/${item.id}`, {
            userId: connectedUser.id
          });
        }
        // Invalidate favorites cache to update UI
        queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      } catch (error) {
        console.error('Error removing items from favorites:', error);
        // Don't fail the purchase if favorites removal fails
      }
      
      // Emit cart update event
      window.dispatchEvent(new Event('cartUpdated'));
      
      // Reset form state
      setShowCheckoutModal(false);
      setCheckoutStep('cart');
      setAgreedToTerms(false);
      setShippingAddress({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      });
      setOrderNotes('');
      
      onClose();
      
      toast({
        title: "Order Confirmed!",
        description: `Order #${purchase.orderNumber} placed successfully. Estimated delivery: ${purchase.estimatedDelivery}`,
      });

      // Invalidate purchase history to show new purchase
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-2">
      <div className="flex items-center space-x-1">
        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
          checkoutStep === 'address' ? 'bg-orange-500 text-white' : 
          ['review', 'payment'].includes(checkoutStep) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {['review', 'payment'].includes(checkoutStep) ? <Check className="h-3 w-3" /> : '1'}
        </div>
        <span className="text-xs font-medium">Address</span>
        
        <div className="w-4 h-px bg-gray-300"></div>
        
        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
          checkoutStep === 'review' ? 'bg-orange-500 text-white' :
          checkoutStep === 'payment' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {checkoutStep === 'payment' ? <Check className="h-3 w-3" /> : '2'}
        </div>
        <span className="text-xs font-medium">Review</span>
        
        <div className="w-4 h-px bg-gray-300"></div>
        
        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
          checkoutStep === 'payment' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          3
        </div>
        <span className="text-xs font-medium">Pay</span>
      </div>
    </div>
  );

  const totalUSD = calculateTotal();

  const handleClose = () => {
    setShowCheckoutModal(false);
    setCheckoutStep('cart');
    setAgreedToTerms(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] max-w-4xl h-[85vh] max-h-[85vh] bg-background border-border p-2 sm:p-3">
          <DialogHeader className="pb-1.5 border-b border-border">
            <DialogTitle className="flex items-center gap-1.5 text-foreground text-sm sm:text-base">
              <ShoppingCartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              Cart ({cartItems.length})
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-full max-h-[calc(85vh-60px)] overflow-hidden">
            {cartItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-12">
                  <ShoppingCartIcon className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-xl font-medium text-foreground mb-3">Your cart is empty</h3>
                  <p className="text-muted-foreground text-lg">Add some items from the marketplace to get started</p>
                </div>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-1">
                  <div className="text-xs text-muted-foreground mb-2 px-1">
                    {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in your cart
                  </div>
                  
                  {cartItems.map((item) => (
                    <Card key={item.id} className="bg-card border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-1.5 sm:p-2">
                        <div className="flex items-start gap-2">
                          {item.imageUrl && (
                            <div 
                              className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleProductClick(item.id)}
                            >
                              <img 
                                src={item.imageUrl} 
                                alt={item.title}
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg border border-border"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 
                              className="font-semibold text-foreground text-xs sm:text-sm mb-0.5 line-clamp-2 cursor-pointer hover:text-orange-500 dark:hover:text-cyan-400 transition-colors"
                              onClick={() => handleProductClick(item.id)}
                            >
                              {item.title}
                            </h4>
                            <p className="text-sm sm:text-base font-bold text-orange-500 dark:text-cyan-400 mb-1">
                              ${item.price} each
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-semibold text-sm text-foreground">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-sm font-bold text-foreground">
                                    ${formatPrice(parseFloat(item.price.replace(/[,$]/g, '')) * item.quantity)}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Cart Summary */}
                <div className="border-t border-border pt-1.5 mt-1.5 space-y-2 flex-shrink-0">
                  <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground text-xs sm:text-sm">Total:</span>
                      <span className="text-sm sm:text-base font-bold text-orange-500 dark:text-cyan-400">
                        ${formatPrice(totalUSD)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      + shipping & taxes
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setCheckoutStep('address');
                      setShowCheckoutModal(true);
                    }}
                    className="w-full h-9 sm:h-10 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-semibold text-xs sm:text-sm"
                  >
                    <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                    Checkout
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="w-[95vw] max-w-4xl h-[70vh] max-h-[70vh] overflow-y-auto bg-background border-border p-1">
          <DialogHeader className="pb-0">
            <DialogTitle className="flex items-center gap-2 text-foreground text-xs">
              <Package className="h-3 w-3" />
              Checkout - {checkoutStep === 'address' ? 'Shipping Address' : 
                        checkoutStep === 'review' ? 'Order Review' : 'Payment'}
            </DialogTitle>
          </DialogHeader>

          {renderStepIndicator()}

          <div className="space-y-0.5 px-0.5">
            {/* Address Step */}
            {checkoutStep === 'address' && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="h-3 w-3 text-orange-500" />
                  <h3 className="text-xs font-semibold text-foreground">Shipping Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-1">
                  <div className="space-y-0">
                    <Label htmlFor="fullName" className="text-xs font-medium">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                      className="bg-input border-border h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-0 sm:col-span-2">
                    <Label htmlFor="addressLine1" className="text-xs font-medium">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="Street address, P.O. box, company name"
                      className="bg-input border-border h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-0 sm:col-span-2">
                    <Label htmlFor="addressLine2" className="text-xs font-medium">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={shippingAddress.addressLine2}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, addressLine2: e.target.value }))}
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="bg-input border-border h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-0">
                    <Label htmlFor="city" className="text-xs font-medium">City *</Label>
                    <Input
                      id="city"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="bg-input border-border h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-0">
                    <Label htmlFor="country" className="text-xs font-medium">Country *</Label>
                    <Select 
                      value={shippingAddress.country} 
                      onValueChange={(value) => {
                        setShippingAddress(prev => ({ 
                          ...prev, 
                          country: value,
                          state: "" // Reset state when country changes
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-input border-border h-8 text-sm">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-0">
                    <Label htmlFor="state" className="text-xs font-medium">State/Province *</Label>
                    {shippingAddress.country && STATES_PROVINCES[shippingAddress.country] ? (
                      <Select 
                        value={shippingAddress.state} 
                        onValueChange={(value) => setShippingAddress(prev => ({ ...prev, state: value }))}
                      >
                        <SelectTrigger className="bg-input border-border h-8 text-sm">
                          <SelectValue placeholder="Select state/province" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {STATES_PROVINCES[shippingAddress.country].map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State, Province, or Region"
                        className="bg-input border-border h-8 text-sm"
                      />
                    )}
                  </div>

                  <div className="space-y-0">
                    <Label htmlFor="zipCode" className="text-xs font-medium">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="ZIP or Postal Code"
                      className="bg-input border-border h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label htmlFor="orderNotes" className="text-xs font-medium">Order Notes (Optional)</Label>
                  <Textarea
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Any special delivery instructions..."
                    className="bg-input border-border text-sm min-h-[40px]"
                    rows={1}
                  />
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
                      <p className="font-medium">{shippingAddress.fullName || "Name not provided"}</p>
                      <p>{shippingAddress.addressLine1 || "Address not provided"}</p>
                      {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                      <p>{shippingAddress.city || "City"}, {shippingAddress.state || "State"} {shippingAddress.zipCode || "ZIP"}</p>
                      <p>{COUNTRIES.find(c => c.code === shippingAddress.country)?.name || shippingAddress.country || "Country not selected"}</p>
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
                        <p className="font-medium text-sm">${formatPrice(parseFloat(item.price.replace(/[,$]/g, '')) * item.quantity)}</p>
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
                      <span>${formatPrice(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>${formatPrice(calculateShippingCost())} {expressShipping && '(Express)'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${formatPrice(calculateTax(calculateTotal()))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-orange-500">${formatPrice(calculateTotalWithExtras())} USD</span>
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
                  <h3 className="text-lg font-semibold text-foreground">Finalize Your Order</h3>
                </div>

                {/* Complete Order Summary */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Order Items */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Items ({cartItems.length}):</p>
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.title} className="w-10 h-10 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ${formatPrice(parseFloat(item.price.replace(/[,$]/g, '')))}</p>
                          </div>
                          <p className="font-medium text-sm">${formatPrice(parseFloat(item.price.replace(/[,$]/g, '')) * item.quantity)}</p>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Shipping Address */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Shipping to:</p>
                      <div className="text-sm bg-muted rounded-lg p-3">
                        <p className="font-medium">{shippingAddress.fullName}</p>
                        <p>{shippingAddress.addressLine1}</p>
                        {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                        <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
                        <p>{shippingAddress.country}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Cost Breakdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${formatPrice(calculateTotal())}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Shipping {expressShipping ? '(Express)' : '(Standard)'}:</span>
                        <span>${formatPrice(calculateShippingCost())}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>${formatPrice(calculateTax(calculateTotal()))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Order Total:</span>
                        <span className="text-orange-500">${formatPrice(calculateTotalWithExtras())} USD</span>
                      </div>
                    </div>

                    {orderNotes && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Order Notes:</p>
                          <p className="text-sm text-muted-foreground bg-muted rounded p-2">{orderNotes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

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
                    ≈ ${formatPrice(calculateTotalWithExtras())} USD
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
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-orange-500 hover:text-orange-600 underline"
                    >
                      Terms and Conditions
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-orange-500 hover:text-orange-600 underline"
                    >
                      Privacy Policy
                    </button>
                  </Label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              {checkoutStep !== 'address' && (
                <Button
                  variant="outline"
                  onClick={() => setCheckoutStep(
                    checkoutStep === 'payment' ? 'review' : 'address'
                  )}
                  className="flex-1 h-10 text-sm"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-10 text-sm"
              >
                Cancel
              </Button>

              {checkoutStep !== 'payment' ? (
                <Button
                  onClick={handleNextStep}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm"
                >
                  Continue
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizePurchase}
                  disabled={!agreedToTerms}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 h-10 text-sm"
                >
                  <Wallet className="h-3 w-3 mr-1" />
                  Complete Order
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms and Privacy Modals with higher z-index */}
      {showTermsModal && (
        <TermsModal 
          isOpen={showTermsModal} 
          onClose={() => setShowTermsModal(false)} 
        />
      )}
      {showPrivacyModal && (
        <PrivacyModal 
          isOpen={showPrivacyModal} 
          onClose={() => setShowPrivacyModal(false)} 
        />
      )}
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
  try {
    const cartItems = JSON.parse(localStorage.getItem('shopping-cart') || '[]') as CartItem[];
    
    const existingItem = cartItems.find(item => item.id === product.ASIN);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const newItem = {
        id: product.ASIN,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: 1,
        currency: product.currency || 'USD'
      };
      cartItems.push(newItem);
    }
    
    localStorage.setItem('shopping-cart', JSON.stringify(cartItems));
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    
    // Dispatch custom event to update cart count across components
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count: totalItems } }));
    
    return totalItems;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return 0;
  }
};

// Export function to get cart count
export const getCartCount = (): number => {
  const cartItems = JSON.parse(localStorage.getItem('shopping-cart') || '[]') as CartItem[];
  return cartItems.reduce((total, item) => total + item.quantity, 0);
};