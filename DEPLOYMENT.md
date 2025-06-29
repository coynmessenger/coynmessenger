# COYN Messenger - Deployment Guide

## Pre-Deployment Checklist

### ✅ Core Application Features
- [x] Full-stack TypeScript architecture (React + Express)
- [x] PostgreSQL database with Drizzle ORM
- [x] Real-time messaging system
- [x] Encrypted voice and video calls (WebRTC + Signal Protocol)
- [x] Cryptocurrency wallet integration with live price feeds
- [x] Marketplace functionality with shopping cart
- [x] Mobile-responsive design with touch interactions
- [x] File upload and attachment system
- [x] User authentication and profile management
- [x] Search functionality with message highlighting
- [x] Group chat capabilities
- [x] Escrow system for secure transactions

### ✅ Security & Production Features
- [x] Security headers middleware
- [x] Input validation and sanitization
- [x] File upload security validation
- [x] CORS configuration
- [x] Error handling middleware
- [x] Health check endpoints (/health, /health/ready, /health/live)
- [x] Environment variable configuration (.env.example)
- [x] Production build configuration

### ✅ Performance Optimizations
- [x] React Query for efficient data fetching and caching
- [x] Optimized database queries with performance headers
- [x] Image lazy loading and optimization
- [x] Mobile-first responsive design
- [x] Efficient WebSocket connections for real-time features

## Environment Variables Required

### Essential
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/coyn_messenger
NODE_ENV=production
```

### Optional (will use fallbacks if not provided)
```bash
# Blockchain APIs
COINGECKO_API_KEY=your-coingecko-api-key
BSC_RPC_URL=https://bsc-dataseed1.binance.org/

# Amazon API (uses mock data without these)
AMAZON_ACCESS_KEY=your-amazon-access-key
AMAZON_SECRET_KEY=your-amazon-secret-key
AMAZON_ASSOCIATE_TAG=your-associate-tag

# Security
SESSION_SECRET=your-secure-session-secret
ALLOWED_ORIGINS=https://your-domain.replit.app

# File Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf
```

## Deployment Steps

### 1. Database Setup
The application automatically:
- Initializes database schema on startup
- Creates necessary tables and relationships
- Seeds demo data if tables are empty

### 2. Build Process
```bash
npm run build
```
This will:
- Build the React frontend to `dist/public`
- Bundle the Express server to `dist/index.js`

### 3. Production Start
```bash
npm start
```
Runs the production server on port 5000

### 4. Health Monitoring
- **Health Check**: `GET /health` - Comprehensive system status
- **Readiness**: `GET /health/ready` - Database connectivity check
- **Liveness**: `GET /health/live` - Basic service availability

## Replit Deployment Configuration

The application is pre-configured for Replit with:
- Auto-scaling deployment target
- PostgreSQL 16 database
- Node.js 20 runtime
- Automatic build and start commands
- Port mapping (5000 → 80)

## Features Summary

### Core Messaging
- Real-time text messaging
- Voice and video calls with end-to-end encryption
- File attachments (images, videos, documents)
- Message search and highlighting
- Group chat creation and management
- Swipe-to-reply functionality
- Message starring and organization

### Cryptocurrency Features
- Multi-wallet support (BTC, BNB, USDT, COYN)
- Live price feeds from CoinGecko API
- Real blockchain balance integration
- Secure escrow transactions
- Cryptocurrency payments in marketplace

### Marketplace
- Product catalog with authentic Amazon integration
- Shopping cart and checkout system
- Multiple cryptocurrency payment options
- Favorites/wishlist management
- Purchase history tracking
- Mobile-optimized shopping experience

### Security
- Signal Protocol-inspired encryption for calls
- Secure file upload validation
- SQL injection prevention
- XSS protection with CSP headers
- Rate limiting capabilities
- Authentication middleware

## Known Dependencies

### Critical
- PostgreSQL database (configured automatically on Replit)
- Node.js 20+ runtime environment

### External APIs (Optional)
- CoinGecko API for live crypto prices (falls back to static prices)
- Amazon Product API (falls back to mock product data)
- Binance Smart Chain RPC (falls back to demo balances)

## Mobile Support

The application is fully optimized for mobile devices with:
- Touch-friendly interface elements
- Responsive design breakpoints
- Mobile gesture support (swipe, long press, double tap)
- Optimized virtual keyboard handling
- Mobile-specific spacing and sizing

## Performance Considerations

- Uses React Query for intelligent caching
- Implements lazy loading for images
- Optimized database queries with indexing
- Efficient WebSocket usage for real-time features
- Compressed assets for faster loading

## Ready for Deployment ✅

The application is production-ready and can be deployed immediately on Replit with:
1. PostgreSQL database (automatically configured)
2. Environment variables set as needed
3. Deployment button click

All core functionality works without external API keys, falling back to demo data where necessary.