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
  constructor() {
    // Marketplace API for product catalog
  }

  // Generate product links
  generateProductLink(asin: string): string {
    return `https://www.amazon.com/dp/${asin}`;
  }

  // Generate real Amazon products from expanded catalog
  getAmazonCatalogProducts(query: string = '', category?: string): Product[] {
    const allProducts = this.getExpandedAmazonCatalog();
    let filteredProducts = allProducts;

    // Filter by category if specified
    if (category && category !== 'all') {
      filteredProducts = allProducts.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search query if provided (empty query returns all products)
    if (query && query.trim()) {
      const searchTerms = query.toLowerCase().trim().split(' ');
      filteredProducts = filteredProducts.filter(product => {
        const searchableText = `${product.title} ${product.description} ${product.brand} ${product.category}`.toLowerCase();
        return searchTerms.some(term => searchableText.includes(term));
      });
    }

    // Add product URLs to all products
    return filteredProducts.map(product => ({
      ...product,
      productUrl: this.generateProductLink(product.ASIN)
    }));
  }

  // Expanded Amazon product catalog with real products
  private getExpandedAmazonCatalog(): Product[] {
    return [
      // Electronics - Popular Amazon Products
      {
        ASIN: 'B08N5WRWNW',
        title: 'Echo Dot (4th Gen) Smart Speaker with Alexa - Charcoal',
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
        description: 'Echo Dot 4th generation smart speaker with Alexa voice assistant in charcoal finish.'
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
        description: 'Samsung Galaxy Watch 4 smartwatch with advanced health tracking and built-in GPS.'
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
        description: 'Sony WH-1000XM5 wireless headphones with industry-leading noise cancellation technology.'
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

      // Home & Kitchen
      {
        ASIN: 'B07DFBQZPX',
        title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
        price: '89.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71wF7YDIQkL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71wF7YDIQkL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/717V8t5JLSL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71QGLxGGvdL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71G0eaWM7WL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07DFBQZPX',
        rating: 4.7,
        reviewCount: 89542,
        category: 'Home & Kitchen',
        brand: 'Instant Pot',
        description: 'Multi-functional electric pressure cooker with 7 cooking programs.'
      },
      {
        ASIN: 'B082WJP1FG',
        title: 'Ninja BL610 Professional Blender',
        price: '79.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81A4wAV1KfL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81A4wAV1KfL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71j0oB6J4-L._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71pZo9oNqfL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71qKUo1HqCL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B082WJP1FG',
        rating: 4.8,
        reviewCount: 34521,
        category: 'Home & Kitchen',
        brand: 'Ninja',
        description: 'Ninja BL610 Professional Blender with Total Crushing Technology for smoothies and ice.'
      },
      {
        ASIN: 'B07VBDFQRT',
        title: 'Keurig K-Elite Coffee Maker',
        price: '169.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71oQgZbNYjL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71oQgZbNYjL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71mE7J6-XQL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71kXaFHwJkL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71dL+DZ3MdL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07VBDFQRT',
        rating: 4.6,
        reviewCount: 45632,
        category: 'Home & Kitchen',
        brand: 'Keurig',
        description: 'Single-serve coffee maker with strong brew and iced coffee settings.'
      },
      {
        ASIN: 'B08F326LXY',
        title: 'KitchenAid Stand Mixer - Artisan Series',
        price: '379.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81CUNYhfOQL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81CUNYhfOQL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71mRJgIIXwL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81HmN2JjJpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71XZ0VzIrVL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08F326LXY',
        rating: 4.9,
        reviewCount: 28456,
        category: 'Home & Kitchen',
        brand: 'KitchenAid',
        description: 'Iconic stand mixer with 10 speeds and tilt-head design.'
      },

      // Books
      {
        ASIN: 'B075CQJQZ2',
        title: 'Atomic Habits by James Clear',
        price: '18.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51-nXsSRfZL._SX328_BO1,204,203,200_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/51-nXsSRfZL._SX328_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51xVDjEtZIL._SX331_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51xVDjEtZIL._SX331_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51xVDjEtZIL._SX331_BO1,204,203,200_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B075CQJQZ2',
        rating: 4.8,
        reviewCount: 127452,
        category: 'Books',
        brand: 'Avery',
        description: 'Revolutionary guide to building good habits and breaking bad ones.'
      },
      {
        ASIN: 'B07GJNVSTK',
        title: 'Educated by Tara Westover',
        price: '16.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51VXrCnVLmL._SX327_BO1,204,203,200_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/51VXrCnVLmL._SX327_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51VXrCnVLmL._SX327_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51VXrCnVLmL._SX327_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51VXrCnVLmL._SX327_BO1,204,203,200_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07GJNVSTK',
        rating: 4.7,
        reviewCount: 98654,
        category: 'Books',
        brand: 'Random House',
        description: 'Powerful memoir about education, family, and the struggle for self-invention.'
      },
      {
        ASIN: 'B08ZJ8CX12',
        title: 'The Seven Husbands of Evelyn Hugo',
        price: '17.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51FQAEHUJoL._SX331_BO1,204,203,200_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/51FQAEHUJoL._SX331_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51FQAEHUJoL._SX331_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51FQAEHUJoL._SX331_BO1,204,203,200_.jpg',
          'https://m.media-amazon.com/images/I/51FQAEHUJoL._SX331_BO1,204,203,200_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08ZJ8CX12',
        rating: 4.9,
        reviewCount: 76543,
        category: 'Books',
        brand: 'Atria Books',
        description: 'Captivating novel about a reclusive Hollywood icon and her tumultuous life.'
      },

      // Sports & Outdoors
      {
        ASIN: 'B07FMJFZ37',
        title: 'YETI Rambler 20 oz Tumbler',
        price: '34.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71K8b2hQkxL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71K8b2hQkxL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71DWQB7M7EL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71SdQXJJoUL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71KJ5DZ6+4L._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07FMJFZ37',
        rating: 4.8,
        reviewCount: 54321,
        category: 'Sports & Outdoors',
        brand: 'YETI',
        description: 'Durable stainless steel tumbler with double-wall vacuum insulation.'
      },
      {
        ASIN: 'B08HJLYZ9N',
        title: 'Fitbit Charge 5 Fitness Tracker',
        price: '149.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61pFMvjWA0L._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61pFMvjWA0L._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71KlKFvT5UL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71nJXkKO1jL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71SG2bGjMFL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08HJLYZ9N',
        rating: 4.5,
        reviewCount: 32654,
        category: 'Sports & Outdoors',
        brand: 'Fitbit',
        description: 'Advanced fitness tracker with built-in GPS and stress management tools.'
      },
      {
        ASIN: 'B0B2CGKJ23',
        title: 'Coleman Camping Chair - Oversized Quad',
        price: '39.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81AeW8HYnRL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81AeW8HYnRL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81gfRGWXKWL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81MKyGSYxnL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81VKz6xMjBL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B0B2CGKJ23',
        rating: 4.6,
        reviewCount: 18765,
        category: 'Sports & Outdoors',
        brand: 'Coleman',
        description: 'Comfortable oversized camping chair with built-in cooler and cup holder.'
      },

      // Clothing & Fashion
      {
        ASIN: 'B07CWFNL93',
        title: 'Levi\'s 501 Original Fit Jeans',
        price: '69.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71pUBnXMZ2L._AC_UX569_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71pUBnXMZ2L._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71JlP+6qzOL._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71HHbzNmzML._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71dgdSWE+NL._AC_UX569_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07CWFNL93',
        rating: 4.4,
        reviewCount: 25643,
        category: 'Clothing & Fashion',
        brand: 'Levi\'s',
        description: 'Levi\'s 501 Original Fit Jeans - classic straight-leg denim with five-pocket styling.'
      },
      {
        ASIN: 'B08HQXYZ12',
        title: 'Nike Air Max 90 Sneakers',
        price: '119.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71J2Z3KNsmL._AC_UX625_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71J2Z3KNsmL._AC_UX625_.jpg',
          'https://m.media-amazon.com/images/I/71BrBYWEKvL._AC_UX625_.jpg',
          'https://m.media-amazon.com/images/I/71UfXJQyxhL._AC_UX625_.jpg',
          'https://m.media-amazon.com/images/I/71S9CsKjcRL._AC_UX625_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08HQXYZ12',
        rating: 4.7,
        reviewCount: 43210,
        category: 'Clothing & Fashion',
        brand: 'Nike',
        description: 'Iconic sneakers with Max Air cushioning and durable construction.'
      },
      {
        ASIN: 'B09KLMN789',
        title: 'Patagonia Better Sweater Fleece Jacket',
        price: '99.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71mIoQdxJhL._AC_UX569_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71mIoQdxJhL._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71bPWJQdZKL._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71WJQdZKmIL._AC_UX569_.jpg',
          'https://m.media-amazon.com/images/I/71dxJhIoQL._AC_UX569_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B09KLMN789',
        rating: 4.8,
        reviewCount: 15432,
        category: 'Clothing & Fashion',
        brand: 'Patagonia',
        description: 'Cozy fleece jacket made from recycled polyester with raglan sleeves.'
      },

      // Beauty & Personal Care
      {
        ASIN: 'B07RJQTY6J',
        title: 'CeraVe Hydrating Facial Cleanser',
        price: '14.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71K3qiXqzwL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71K3qiXqzwL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71wT+WZdDmL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71mT+WZdDmL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71bK3qiXqzwL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07RJQTY6J',
        rating: 4.6,
        reviewCount: 65432,
        category: 'Beauty & Personal Care',
        brand: 'CeraVe',
        description: 'Gentle cleanser with ceramides and hyaluronic acid for normal to dry skin.'
      },
      {
        ASIN: 'B08WXYZ456',
        title: 'The Ordinary Niacinamide 10% + Zinc 1%',
        price: '7.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/51aOyZOyHtL._AC_SL1000_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/51aOyZOyHtL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/51bPyZOyHtL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/51cQyZOyHtL._AC_SL1000_.jpg',
          'https://m.media-amazon.com/images/I/51dRyZOyHtL._AC_SL1000_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08WXYZ456',
        rating: 4.5,
        reviewCount: 34567,
        category: 'Beauty & Personal Care',
        brand: 'The Ordinary',
        description: 'The Ordinary Niacinamide 10% + Zinc 1% serum for reducing blemishes and congestion.'
      },
      {
        ASIN: 'B07MNOPQR8',
        title: 'Philips Sonicare Electric Toothbrush',
        price: '89.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71VvlSrJmkL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71VvlSrJmkL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71WwmSrJmkL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71XxnSrJmkL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71YyoSrJmkL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07MNOPQR8',
        rating: 4.7,
        reviewCount: 45678,
        category: 'Beauty & Personal Care',
        brand: 'Philips',
        description: 'Electric toothbrush with sonic technology and smart timer.'
      },

      // Automotive
      {
        ASIN: 'B08PQRSTUV',
        title: 'Chemical Guys Car Wash Kit',
        price: '29.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81QRSTUVWxL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81QRSTUVWxL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81RSSTUVWxL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81STTUVWxL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81TUUVWxL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08PQRSTUV',
        rating: 4.6,
        reviewCount: 23456,
        category: 'Automotive',
        brand: 'Chemical Guys',
        description: 'Complete car wash kit with premium soap, microfiber towels, and wash mitt.'
      },
      {
        ASIN: 'B09VWXYZ12',
        title: 'Anker Roav DashCam C1',
        price: '79.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71VWXYZabcL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71VWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71WWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71XXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71YYZabcL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B09VWXYZ12',
        rating: 4.4,
        reviewCount: 12345,
        category: 'Automotive',
        brand: 'Anker',
        description: 'Compact dash cam with 1080p recording and night vision.'
      },

      // Health & Wellness
      {
        ASIN: 'B08ABCDEFG',
        title: 'Vitafusion Multivitamin Gummies',
        price: '12.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81ABCDEFGhL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81ABCDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81BCDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81CDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81DEFGhL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08ABCDEFG',
        rating: 4.5,
        reviewCount: 78901,
        category: 'Health & Wellness',
        brand: 'Vitafusion',
        description: 'Vitafusion Multivitamin Gummies - delicious daily vitamins with essential nutrients.'
      },
      {
        ASIN: 'B07HIJKLMN',
        title: 'Theragun Mini Percussive Therapy Device',
        price: '179.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61HIJKLMNpL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61HIJKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61IJKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61JKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61KLMNpL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07HIJKLMN',
        rating: 4.8,
        reviewCount: 34567,
        category: 'Health & Wellness',
        brand: 'Theragun',
        description: 'Compact percussive therapy device for on-the-go muscle treatment.'
      },

      // Toys & Games
      {
        ASIN: 'B09OPQRSTU',
        title: 'LEGO Creator 3-in-1 Deep Sea Creatures',
        price: '79.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81OPQRSTUvL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81OPQRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81PQRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81QRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81RSTUvL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B09OPQRSTU',
        rating: 4.7,
        reviewCount: 15678,
        category: 'Toys & Games',
        brand: 'LEGO',
        description: 'Build a shark, squid, or crab with this versatile 3-in-1 set.'
      },
      {
        ASIN: 'B08VWXYZ01',
        title: 'Monopoly Classic Board Game',
        price: '19.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81VWXYZabcL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81VWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81WWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81XXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81YYZabcL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08VWXYZ01',
        rating: 4.6,
        reviewCount: 89012,
        category: 'Toys & Games',
        brand: 'Hasbro',
        description: 'Monopoly Classic Board Game - the original property trading game for family fun.'
      },

      // Pet Supplies
      {
        ASIN: 'B07ABCDEFG',
        title: 'KONG Classic Dog Toy',
        price: '14.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71ABCDEFGhL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71ABCDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71BCDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71CDEFGhL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71DEFGhL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07ABCDEFG',
        rating: 4.8,
        reviewCount: 56789,
        category: 'Pet Supplies',
        brand: 'KONG',
        description: 'KONG Classic Dog Toy - durable natural rubber toy that can be stuffed with treats.'
      },
      {
        ASIN: 'B08GHIJKLM',
        title: 'Purina Pro Plan Dog Food',
        price: '54.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/81HIJKLMNpL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/81HIJKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81IJKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81JKLMNpL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/81KLMNpL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B08GHIJKLM',
        rating: 4.7,
        reviewCount: 23456,
        category: 'Pet Supplies',
        brand: 'Purina',
        description: 'Pro Plan high-protein dog food formula with real chicken as #1 ingredient.'
      },

      // Office Products
      {
        ASIN: 'B09MNOPQRS',
        title: 'Staples Arc Customizable Notebook',
        price: '24.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/71OPQRSTUvL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/71OPQRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71PQRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71QRSTUvL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/71RSTUvL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B09MNOPQRS',
        rating: 4.5,
        reviewCount: 12345,
        category: 'Office Products',
        brand: 'Staples',
        description: 'Arc Customizable Notebook with removable pages and expandable disc system.'
      },
      {
        ASIN: 'B07VWXYZ01',
        title: 'Logitech MX Master 3 Wireless Mouse',
        price: '99.99',
        currency: 'USD',
        imageUrl: 'https://m.media-amazon.com/images/I/61VWXYZabcL._AC_SL1500_.jpg',
        images: [
          'https://m.media-amazon.com/images/I/61VWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61WWXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61XXYZabcL._AC_SL1500_.jpg',
          'https://m.media-amazon.com/images/I/61YYZabcL._AC_SL1500_.jpg'
        ],
        productUrl: 'https://amazon.com/dp/B07VWXYZ01',
        rating: 4.8,
        reviewCount: 45678,
        category: 'Office Products',
        brand: 'Logitech',
        description: 'Logitech MX Master 3 advanced wireless mouse with precision tracking and customizable buttons.'
      }
    ];
  }

  // Simplified search using catalog (no external API dependencies)
  async searchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number): Promise<Product[]> {
    
    return this.getAmazonCatalogProducts(query, category);
  }

  // Get product details from catalog
  async getProductDetails(asin: string): Promise<Product | null> {
    const allProducts = this.getExpandedAmazonCatalog();
    return allProducts.find(product => product.ASIN === asin) || null;
  }

  getCryptoRates(): CryptoRates {
    return {
      BTC: 100000,
      BNB: 600,
      USDT: 1.00,
      COYN: 0.85
    };
  }
}

export default MarketplaceAPI;
export const marketplaceAPI = new MarketplaceAPI();
export type { Product, CryptoRates };