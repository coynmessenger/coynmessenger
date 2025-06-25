import crypto from 'crypto';

interface AmazonProduct {
  ASIN: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
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

class AmazonAPI {
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

  async searchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number): Promise<AmazonProduct[]> {
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
      return this.parseAmazonResponse(data);
    } catch (error) {
      console.error('[AMAZON API] Search failed:', error);
      return this.getMockProducts(query);
    }
  }

  private parseAmazonResponse(data: any): AmazonProduct[] {
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

  private getMockProducts(query: string): AmazonProduct[] {
    const mockProducts: AmazonProduct[] = [
      {
        ASIN: 'B08N5WRWNW',
        title: 'Echo Dot (4th Gen) Smart Speaker with Alexa',
        price: '49.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/714Rq4k05UL._AC_SL1000_.jpg',
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
        productUrl: 'https://amazon.com/dp/B087CQR456',
        rating: 4.8,
        reviewCount: 12456,
        category: 'Electronics',
        brand: 'Apple',
        description: 'Wireless earbuds with active noise cancellation and spatial audio.'
      },
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
      }
    ];

    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
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

export const amazonAPI = new AmazonAPI();
export type { AmazonProduct, CryptoRates };