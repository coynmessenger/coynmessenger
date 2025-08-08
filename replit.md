# COYN Messenger

## Overview
COYN Messenger is a full-stack messaging application integrating chat, cryptocurrency wallet management, and video calls. It aims to provide a seamless, secure, and intuitive platform for communication and crypto transactions within a dark-themed interface. The project envisions significant market potential by blending essential communication tools with burgeoning blockchain technology.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter with authentication-based routing
- **UI**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom COYN branding
- **State Management**: TanStack Query
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Session Management**: Express sessions with PostgreSQL store

### Authentication Flow
- **Standalone App Experience**: Authenticated users are automatically redirected to the main messenger interface
- **Wallet Authentication**: Supports MetaMask, Trust Wallet, and WalletConnect with comprehensive signature collection
- **WalletConnect Integration**: Universal QR code connection supporting 200+ wallets with secure bridge communication
- **Multi-Address Selection**: Users can choose specific addresses from wallets with multiple accounts
- **Trust Wallet Deep Linking**: Enhanced mobile deep linking with multiple fallback approaches and session tracking
- **Return Detection**: URL parameter system (?wallet_return=true&session=ID) to detect wallet app returns
- **Visual Feedback**: Loading modals and status messages during wallet redirects and connections
- **Auto-Navigation**: Post-authentication automatically opens the messenger with smart delay detection
- **Authentication Guard**: HomePage checks for existing authentication and redirects to messenger immediately
- **Session Management**: Unique session IDs track wallet connection attempts and returns
- **Clean Sign-out**: Proper cleanup prevents auto-reconnection after explicit sign-out

### Core Features
- Real-time text messaging.
- Cryptocurrency sending within messages.
- Wallet management for BTC, BNB, USDT, and COYN with real blockchain balances and live market prices.
- Multi-address wallet support with user-selectable wallet addresses from MetaMask and Trust Wallet.
- Encrypted wallet-to-wallet voice and video calling (WebRTC with Signal Protocol-inspired encryption).
- Comprehensive marketplace for crypto purchases with Amazon-style checkout.
- Favorites/wishlist system.
- Comprehensive purchase history.
- Group chat functionality.
- File attachment (documents, photos, videos).
- Emoji and GIF integration.
- Swipe-to-reply functionality.
- Responsive design with mobile-first optimization.
- Light/Dark theme toggle.
- Secure sign-out with data cleanup.
- Draggable call modals with persistence.

### UI/UX Decisions
- Dark-themed interface with orange accents.
- Glassmorphism effects throughout the application (sidebar, chat messages, modals).
- Modern typography (Inter, Space Grotesk, JetBrains Mono, Poppins).
- Intuitive icon-based navigation.
- Consistent branding with authentic cryptocurrency logos.
- Watercolor background.

### System Design
- Database schema includes `users`, `conversations`, `messages`, and `wallet_balances`.
- API routes for user, conversations, messages, and marketplace interactions.
- Web3 wallet authentication system (MetaMask, Trust Wallet) with real blockchain balance synchronization.
- Transaction processing uses real BNB chain for BNB, USDT, and COYN.
- Comprehensive signature data collection for token transactions.
- Automated scroll-to-top functionality on page navigation.
- Optimized performance with React Query caching and HTTP cache headers.
- Comprehensive security with wallet address validation and controlled user registration.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Headless UI components.
- **date-fns**: Date formatting.
- **tailwindcss**: CSS framework.
- **ethers.js**: Web3 interaction for blockchain.
- **CoinGecko API**: Live cryptocurrency prices and 24h change data.
- **GIPHY API**: GIF integration.
- **Socket.IO**: Real-time communication for encrypted calls.