import crypto from 'crypto';

interface Product {
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

class MarketplaceAPI {
  private accessKey: string;
  private secretKey: string;
  private associateTag: string;
  private endpoint = 'webservices.amazon.com';
  private region = 'us-east-1';
  private service = 'ProductAdvertisingAPI';

  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY || '';
    this.secretKey = process.env.AMAZON_SECRET_KEY || '';
    this.associateTag = process.env.AMAZON_ASSOCIATE_TAG || '';
  }

  private createSignature(stringToSign: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64');
  }

  private createAuthHeaders(payload: string): Record<string, string> {
    const timestamp = new Date().toISOString().slice(0, 19) + 'Z';
    const date = timestamp.slice(0, 10);
    
    const canonicalHeaders = [
      'content-encoding:amz-1.0',
      'content-type:application/json; charset=utf-8',
      `host:${this.endpoint}`,
      `x-amz-date:${timestamp}`,
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`
    ].join('\n');

    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    
    const canonicalRequest = [
      'POST',
      '/paapi5/searchitems',
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');

    const credentialScope = `${date}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signature = this.createSignature(stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      'Authorization': authorization,
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      'Host': this.endpoint,
      'X-Amz-Date': timestamp,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
    };
  }

  async searchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number): Promise<Product[]> {
    if (!this.accessKey || !this.secretKey || !this.associateTag) {
      console.log('[AMAZON API] Missing credentials, returning mock data');
      return this.getMockProducts(query);
    }

    const payload = {
      Keywords: query,
      Resources: [
        'Images.Primary.Medium',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ProductInfo',
        'Offers.Listings.Price'
      ],
      PartnerTag: this.associateTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      ...(category && { SearchIndex: category }),
      ...(minPrice && { MinPrice: Math.round(minPrice * 100) }),
      ...(maxPrice && { MaxPrice: Math.round(maxPrice * 100) })
    };

    try {
      const payloadString = JSON.stringify(payload);
      const headers = this.createAuthHeaders(payloadString);

      const response = await fetch(`https://${this.endpoint}/paapi5/searchitems`, {
        method: 'POST',
        headers,
        body: payloadString
      });

      if (!response.ok) {
        throw new Error(`Amazon API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('[AMAZON API] Search failed:', error);
      return this.getMockProducts(query);
    }
  }

  private parseResponse(data: any): Product[] {
    if (!data.SearchResult?.Items) {
      return [];
    }

    return data.SearchResult.Items.map((item: any) => ({
      ASIN: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      price: item.Offers?.Listings?.[0]?.Price?.Amount || '0',
      currency: item.Offers?.Listings?.[0]?.Price?.Currency || 'USD',
      imageUrl: item.Images?.Primary?.Medium?.URL || '',
      productUrl: item.DetailPageURL || '',
      rating: 4.5, // Amazon API doesn't provide ratings in search
      reviewCount: 0,
      category: item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue || 'General',
      brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
      description: item.ItemInfo?.Features?.DisplayValues?.join('. ')
    }));
  }

  private getMockProducts(query: string): Product[] {
    const mockProducts: Product[] = [
      // Electronics
      {
        ASIN: 'B08N5WRWNW',
        title: 'Echo Dot (4th Gen) Smart Speaker with Alexa',
        price: '49.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/714Rq4k05UL._AC_SL1000_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/714Rq4k05UL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/71dJp+8zuhL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/71Hk3c9HsqL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/61-FBUq7MpL._AC_SL1000_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08N5WRWNW',
        rating: 4.7,
        reviewCount: 45231,
        category: 'Electronics',
        brand: 'Amazon',
        description: 'Smart speaker with Alexa voice control and premium sound quality.'
      },
      {
        ASIN: 'B087CQR456',
        title: 'Apple AirPods Pro (2nd Generation)',
        price: '249.00',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61f1YfTkTtL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61PquuGLIaL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61mjCa1RQKL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B087CQR456',
        rating: 4.8,
        reviewCount: 12456,
        category: 'Electronics',
        brand: 'Apple',
        description: 'Wireless earbuds with active noise cancellation and spatial audio.'
      },
      {
        ASIN: 'B08GGGHLZD',
        title: 'Samsung Galaxy Watch 4',
        price: '279.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61MWOGeVCJL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61MWOGeVCJL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81R5qNfzPdL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71XHJ7vW8uL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71vKPYLIBqL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08GGGHLZD',
        rating: 4.4,
        reviewCount: 8234,
        category: 'Electronics',
        brand: 'Samsung',
        description: 'Advanced smartwatch with health tracking and GPS.'
      },
      {
        ASIN: 'B0BSHF7LKS',
        title: 'Sony WH-1000XM5 Wireless Headphones',
        price: '399.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61+btPaYVNL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61eVIKUU5ML._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71QnHktdBQL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B0BSHF7LKS',
        rating: 4.6,
        reviewCount: 15642,
        category: 'Electronics',
        brand: 'Sony',
        description: 'Industry-leading noise cancellation with exceptional sound quality.'
      },
      {
        ASIN: 'B09JQMJHXY',
        title: 'iPad Air (5th Generation)',
        price: '599.00',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61NGnpjoTDL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61NGnpjoTDL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71ZOtNdaXCL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71jWx8YkxJL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61yRkPLOQfL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B09JQMJHXY',
        rating: 4.8,
        reviewCount: 23156,
        category: 'Electronics',
        brand: 'Apple',
        description: 'Powerful tablet with M1 chip and stunning Liquid Retina display.'
      },
      {
        ASIN: 'B08N5WRWNZ',
        title: 'Nintendo Switch OLED Model',
        price: '349.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71X8dJLnNGL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61J0ZyS-LlL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71YKVeGXmWL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08N5WRWNZ',
        rating: 4.7,
        reviewCount: 18567,
        category: 'Electronics',
        brand: 'Nintendo',
        description: 'Gaming console with vibrant 7-inch OLED screen.'
      },
      {
        ASIN: 'B087XZQGBW',
        title: 'MacBook Air M2',
        price: '1199.00',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71TPda7cwUL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71vFKBpKakL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71GWdGSiSzL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B087XZQGBW',
        rating: 4.9,
        reviewCount: 12489,
        category: 'Electronics',
        brand: 'Apple',
        description: 'Ultralight laptop with M2 chip and all-day battery life.'
      },
      {
        ASIN: 'B08HLZLZDF',
        title: 'Ring Video Doorbell',
        price: '179.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71YLcVFlH8L._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08HLZLZDF',
        rating: 4.3,
        reviewCount: 34567,
        category: 'Electronics',
        brand: 'Ring',
        description: 'Smart doorbell with HD video and two-way talk.'
      },
      {
        ASIN: 'B09BG326KG',
        title: 'iPhone 14 Pro',
        price: '999.00',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71ZOtVbpp5L._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B09BG326KG',
        rating: 4.8,
        reviewCount: 45123,
        category: 'Electronics',
        brand: 'Apple',
        description: 'Pro camera system with 48MP main camera and A16 Bionic chip.'
      },
      {
        ASIN: 'B08KRV7S22',
        title: 'Tesla Model S Plaid',
        price: '89999.00',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71vK0WVQ4GL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08KRV7S22',
        rating: 4.9,
        reviewCount: 567,
        category: 'Automotive',
        brand: 'Tesla',
        description: 'Electric vehicle with ludicrous acceleration and autopilot.'
      },

      // Home & Kitchen
      {
        ASIN: 'B09B8WRQNB',
        title: 'YETI Rambler 20 oz Tumbler',
        price: '34.95',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71J8Q3dnJSL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B09B8WRQNB',
        rating: 4.9,
        reviewCount: 8924,
        category: 'Kitchen',
        brand: 'YETI',
        description: 'Insulated stainless steel tumbler that keeps drinks cold or hot.'
      },
      {
        ASIN: 'B08FF5YGDQ',
        title: 'Instant Pot Duo 7-in-1',
        price: '89.95',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71XQmKjq2HL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08FF5YGDQ',
        rating: 4.7,
        reviewCount: 67890,
        category: 'Kitchen',
        brand: 'Instant Pot',
        description: 'Multi-use pressure cooker, slow cooker, rice cooker, and more.'
      },
      {
        ASIN: 'B07GDJJXS5',
        title: 'Ninja Foodi Personal Blender',
        price: '69.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81M-VjTwRtL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B07GDJJXS5',
        rating: 4.6,
        reviewCount: 23456,
        category: 'Kitchen',
        brand: 'Ninja',
        description: 'Powerful personal blender for smoothies and shakes.'
      },
      {
        ASIN: 'B08GFGH567',
        title: 'KitchenAid Stand Mixer',
        price: '349.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81dCdZp+D8L._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08GFGH567',
        rating: 4.8,
        reviewCount: 34567,
        category: 'Kitchen',
        brand: 'KitchenAid',
        description: 'Professional-grade stand mixer for all your baking needs.'
      },
      {
        ASIN: 'B09HHQWWRT',
        title: 'Dyson V15 Detect Vacuum',
        price: '749.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61qIrYR2CDL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B09HHQWWRT',
        rating: 4.5,
        reviewCount: 12345,
        category: 'Home',
        brand: 'Dyson',
        description: 'Cordless vacuum with laser dust detection technology.'
      },

      // Books
      {
        ASIN: 'B0B2S4NHJK',
        title: 'Atomic Habits by James Clear',
        price: '13.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81YkqyaFVEL._AC_UL600_SR600,600_.jpg',
        productUrl: 'https://amazon.com/dp/B0B2S4NHJK',
        rating: 4.8,
        reviewCount: 89123,
        category: 'Books',
        brand: 'Avery',
        description: 'Life-changing guide to building good habits and breaking bad ones.'
      },
      {
        ASIN: 'B075FQMZL9',
        title: 'The 7 Habits of Highly Effective People',
        price: '16.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51Myx8VS-NL._AC_UY600_.jpg',
        productUrl: 'https://amazon.com/dp/B075FQMZL9',
        rating: 4.7,
        reviewCount: 56789,
        category: 'Books',
        brand: 'Simon & Schuster',
        description: 'Timeless principles for personal and professional effectiveness.'
      },
      {
        ASIN: 'B086P2VKPV',
        title: 'Think and Grow Rich',
        price: '12.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61y04z8SKEL._AC_UY600_.jpg',
        productUrl: 'https://amazon.com/dp/B086P2VKPV',
        rating: 4.6,
        reviewCount: 34567,
        category: 'Books',
        brand: 'Napoleon Hill Foundation',
        description: 'Classic guide to wealth building and success mindset.'
      },

      // Fashion
      {
        ASIN: 'B08F3J4K5L',
        title: 'Nike Air Force 1 Sneakers',
        price: '89.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71KmTk4PthL._AC_UX500_.jpg',
        productUrl: 'https://amazon.com/dp/B08F3J4K5L',
        rating: 4.7,
        reviewCount: 23456,
        category: 'Fashion',
        brand: 'Nike',
        description: 'Classic basketball sneakers with timeless style.'
      },
      {
        ASIN: 'B09HTNB789',
        title: 'Levi\'s 501 Original Jeans',
        price: '59.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81ORL3dvVPL._AC_UX466_.jpg',
        productUrl: 'https://amazon.com/dp/B09HTNB789',
        rating: 4.5,
        reviewCount: 18765,
        category: 'Fashion',
        brand: 'Levi\'s',
        description: 'Original straight fit jeans with authentic vintage styling.'
      },
      {
        ASIN: 'B08M9KL567',
        title: 'Ray-Ban Aviator Sunglasses',
        price: '149.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/714u35Wb6nL._AC_UX466_.jpg',
        productUrl: 'https://amazon.com/dp/B08M9KL567',
        rating: 4.8,
        reviewCount: 34567,
        category: 'Fashion',
        brand: 'Ray-Ban',
        description: 'Iconic aviator sunglasses with premium UV protection.'
      },

      // Sports & Outdoors
      {
        ASIN: 'B09J5K6L7M',
        title: 'Hydro Flask Water Bottle',
        price: '44.95',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61f7FhDVOJL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B09J5K6L7M',
        rating: 4.7,
        reviewCount: 23456,
        category: 'Sports',
        brand: 'Hydro Flask',
        description: 'Insulated stainless steel water bottle keeps drinks cold for 24 hours.'
      },
      {
        ASIN: 'B08H7J8K9L',
        title: 'Yoga Mat Premium',
        price: '29.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71XBvyUdDUL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08H7J8K9L',
        rating: 4.6,
        reviewCount: 12345,
        category: 'Sports',
        brand: 'Gaiam',
        description: 'Non-slip yoga mat with extra cushioning for comfort.'
      },
      
      // Additional Electronics with verified images
      {
        ASIN: 'B08HLZZ9NR',
        title: 'Logitech MX Master 3 Mouse',
        price: '99.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61ni3t1ryQL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08HLZZ9NR',
        rating: 4.6,
        reviewCount: 25678,
        category: 'Electronics',
        brand: 'Logitech',
        description: 'Advanced wireless mouse with precision scroll wheel and ergonomic design.'
      },
      {
        ASIN: 'B08FF3BKMV',
        title: 'Sony PlayStation 5',
        price: '499.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61qVrcPuKAL._SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08FF3BKMV',
        rating: 4.8,
        reviewCount: 89456,
        category: 'Electronics',
        brand: 'Sony',
        description: 'Next-generation gaming console with ultra-fast SSD and ray tracing.'
      },
      {
        ASIN: 'B08HLMS3NZ',
        title: 'Mechanical Keyboard RGB',
        price: '129.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81+lrJ4HHJL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08HLMS3NZ',
        rating: 4.5,
        reviewCount: 15678,
        category: 'Electronics',
        brand: 'Corsair',
        description: 'Mechanical gaming keyboard with RGB backlighting and tactile switches.'
      },
      
      // Additional Home & Kitchen
      {
        ASIN: 'B08FF5KBRV',
        title: 'Keurig K-Elite Coffee Maker',
        price: '179.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81rHdWFz+gL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B08FF5KBRV',
        rating: 4.4,
        reviewCount: 34567,
        category: 'Kitchen',
        brand: 'Keurig',
        description: 'Single-serve coffee maker with multiple brew sizes and strong brew setting.'
      },
      {
        ASIN: 'B09HJNM8KL',
        title: 'Lodge Cast Iron Skillet',
        price: '39.90',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81WZhDKS9HL._AC_SL1500_.jpg',
        productUrl: 'https://amazon.com/dp/B09HJNM8KL',
        rating: 4.7,
        reviewCount: 23456,
        category: 'Kitchen',
        brand: 'Lodge',
        description: 'Pre-seasoned cast iron skillet perfect for searing, baking, and frying.'
      },
      
      // Additional Books
      {
        ASIN: 'B08BB57GS7',
        title: 'Rich Dad Poor Dad',
        price: '8.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81BE7eeKzAL.jpg',
        productUrl: 'https://amazon.com/dp/B08BB57GS7',
        rating: 4.6,
        reviewCount: 67890,
        category: 'Books',
        brand: 'Plata Publishing',
        description: 'Financial education classic about building wealth and financial literacy.'
      },
      {
        ASIN: 'B075RMVVPQ',
        title: 'The Lean Startup',
        price: '14.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51Gu9-QpVpL.jpg',
        productUrl: 'https://amazon.com/dp/B075RMVVPQ',
        rating: 4.5,
        reviewCount: 34567,
        category: 'Books',
        brand: 'Crown Business',
        description: 'Revolutionary approach to creating and managing successful startups.'
      },
      
      // Additional Fashion
      {
        ASIN: 'B08GMVK567',
        title: 'Adidas Ultraboost Running Shoes',
        price: '189.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/719npMzWQSL._AC_UX500_.jpg',
        productUrl: 'https://amazon.com/dp/B08GMVK567',
        rating: 4.6,
        reviewCount: 18765,
        category: 'Fashion',
        brand: 'Adidas',
        description: 'Premium running shoes with responsive cushioning and energy return.'
      },
      {
        ASIN: 'B09KJMN789',
        title: 'Timex Weekender Watch',
        price: '35.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81RiPrQAKfL._AC_UX500_.jpg',
        productUrl: 'https://amazon.com/dp/B09KJMN789',
        rating: 4.3,
        reviewCount: 12345,
        category: 'Fashion',
        brand: 'Timex',
        description: 'Classic analog watch with easy-read dial and comfortable fabric strap.'
      }
    ];

    // Filter products based on query or return all if no specific query
    if (!query || query.trim() === '') {
      return mockProducts;
    }

    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase()) ||
      product.brand?.toLowerCase().includes(query.toLowerCase()) ||
      product.description?.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getCryptoRates(): Promise<CryptoRates> {
    try {
      // In a real implementation, this would call a crypto price API like CoinGecko
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,binancecoin,tether,coyn&vs_currencies=usd');
      const data = await response.json();
      
      return {
        BTC: data.bitcoin?.usd || 45000,
        BNB: data.binancecoin?.usd || 300,
        USDT: data.tether?.usd || 1,
        COYN: data.coyn?.usd || 0.15 // Mock COYN price
      };
    } catch (error) {
      console.error('[CRYPTO RATES] Failed to fetch rates:', error);
      // Return mock rates
      return {
        BTC: 45000,
        BNB: 300,
        USDT: 1,
        COYN: 0.15
      };
    }
  }

  convertUSDToCrypto(usdAmount: number, cryptoRates: CryptoRates): Record<string, number> {
    return {
      BTC: usdAmount / cryptoRates.BTC,
      BNB: usdAmount / cryptoRates.BNB,
      USDT: usdAmount / cryptoRates.USDT,
      COYN: usdAmount / cryptoRates.COYN
    };
  }
}

export const marketplaceAPI = new MarketplaceAPI();
export type { Product, CryptoRates };