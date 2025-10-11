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
- **Universal Wallet Support**: Thirdweb SDK v5 provides seamless support for all major Web3 wallets
- **Supported Wallets**: WalletConnect (mobile), MetaMask, Coinbase Wallet, Bitget Wallet, Trust Wallet, Rabby, Zerion
- **Auto-Reconnection**: AutoConnect component maintains wallet connections across page navigation
- **Visual Feedback**: Loading modals and status messages during wallet redirects and connections
- **Auto-Navigation**: Post-authentication automatically opens the messenger with smart delay detection
- **Authentication Guard**: HomePage checks for existing authentication and redirects to messenger immediately
- **Session Management**: Wallet connections persist in localStorage with automatic rehydration
- **Clean Sign-out**: Proper cleanup prevents auto-reconnection after explicit sign-out

### Core Features
- Real-time text messaging.
- Cryptocurrency sending within messages.
- Wallet management for BNB, USDT, and COYN with real blockchain balances and live market prices.
- Universal wallet support with wallet-specific transaction routing (Bitget → Bitget, MetaMask → MetaMask, etc.) ensuring transactions go through the specific connected wallet.
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

### Mobile Optimizations (Current Web App)
- **Touch-optimized interactions** with 44px+ minimum touch targets
- **Mobile keyboard awareness** with dynamic viewport height
- **iOS-specific optimizations** (zoom prevention, safe area insets, visibility detection)
- **Touch scrolling optimizations** and gesture handling with `touch-manipulation` CSS
- **Mobile-first responsive design** with 768px breakpoint
- **Enhanced microphone permission** handling for mobile browsers
- **Consolidated authentication flow** preventing race conditions
- **WalletConnect deep linking** for mobile wallet app connections
- **Page Visibility API integration** for reliable wallet app return detection
- **Multi-strategy wallet return handling** (storage events, focus, visibility)
- **Active state styling** for better touch feedback on mobile devices

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
- **Universal Wallet Transaction System**: Thirdweb SDK automatically routes ALL transactions through the user's connected wallet - no wallet-specific code required.
- **Transaction Flow**: Same code works for all wallets - Thirdweb handles wallet differences internally.
- **Supported Tokens**: BNB (native), USDT (ERC-20), COYN (ERC-20) all use unified transaction preparation and signing.
- Transaction processing uses real BNB chain (BSC) for all token transfers.
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
- **Thirdweb SDK v5**: Universal Web3 wallet integration and blockchain transactions.
- **CoinGecko API**: Live cryptocurrency prices and 24h change data.
- **GIPHY API**: GIF integration.
- **Socket.IO**: Real-time communication for encrypted calls.

## Wallet Integration Architecture

### Thirdweb SDK v5 Implementation
The application uses **Thirdweb SDK v5** for universal wallet support, eliminating the need for wallet-specific transaction code.

**Key Components:**
1. **ThirdwebProvider** (`client/src/App.tsx`)
   - Wraps entire app with Thirdweb context
   - Configured with `VITE_THIRDWEB_CLIENT_ID` environment variable
   - Provides SDK access to all child components

2. **AutoConnect Component** (`client/src/App.tsx`)
   - Maintains wallet connections across page navigation
   - Automatically reconnects previously connected wallets
   - Supports all configured wallet types
   - Respects user sign-out state (disabled when `userSignedOut=true`)

3. **ConnectButton** (`client/src/components/thirdweb-wallet-connector.tsx`)
   - Primary wallet connection interface on HomePage
   - Displays wallet options in modal
   - Handles connection approval and chain switching
   - Configured for BSC (Binance Smart Chain) network

4. **Universal Transaction Handler** (`client/src/components/chat-window.tsx`)
   - Uses `useActiveWallet()` hook to get connected wallet
   - Same code works for ALL wallets (no wallet-specific logic)
   - Thirdweb SDK automatically routes transactions to the connected wallet
   - Mobile-optimized with proper deep linking for mobile wallet apps

**Transaction Flow:**
```typescript
// 1. Get active wallet (works for ANY wallet)
const activeWallet = useActiveWallet();

// 2. Prepare transaction (same for all wallets)
const transaction = prepareTransaction({
  client,
  chain: bsc,
  to: recipientAddress,
  value: amount, // For BNB
  // OR
  data: erc20TransferData, // For USDT/COYN
});

// 3. Send transaction (Thirdweb routes to connected wallet)
await sendTransaction({
  transaction: await transaction,
  account: activeWallet.getAccount(),
});
```

**Supported Wallets:**
- ✅ WalletConnect (any mobile wallet)
- ✅ MetaMask
- ✅ Coinbase Wallet
- ✅ Bitget Wallet
- ✅ Trust Wallet
- ✅ Rabby
- ✅ Zerion

**Token Support:**
- **BNB**: Native BSC transfers via `value` parameter
- **USDT**: ERC-20 token at `0x55d398326f99059fF775485246999027B3197955`
- **COYN**: ERC-20 token at `0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1`

**Key Advantages:**
- ✅ **Universal Code**: Single implementation works for all wallets
- ✅ **Automatic Routing**: Thirdweb SDK handles wallet-specific differences
- ✅ **Connection Persistence**: AutoConnect maintains state across navigation
- ✅ **No Vendor Lock-in**: Easy to add new wallets without code changes
- ✅ **Type Safety**: Full TypeScript support with proper error handling
- ✅ **Mobile-First**: WalletConnect deep linking for seamless mobile wallet integration
- ✅ **Cross-Platform**: Works identically on desktop browsers and mobile devices

## Native Mobile App Requirements

### Architecture Overview
- **Development Framework**: React Native or Flutter for cross-platform compatibility
- **Wallet Integration**: WalletConnect v2 protocol for universal wallet compatibility
- **Backend**: Maintain existing Node.js/Express backend with additions for mobile-specific features
- **Database**: Continue using PostgreSQL with enhanced mobile session management
- **Real-time Communication**: Socket.IO for messaging, WebRTC for calls (same as web)
- **Push Notifications**: Firebase Cloud Messaging (FCM) for Android, Apple Push Notification Service (APNs) for iOS

### Key Technical Requirements

#### Deep Linking & Navigation
- **Universal Links (iOS)**: Configure apple-app-site-association file for seamless web-to-app transitions
- **Android App Links**: Configure assetlinks.json for verified deep link handling
- **Custom URL Schemes**: coyn:// scheme for direct app launches and wallet returns
- **Session Management**: Enhanced session tracking for wallet connection flows across app switches

#### WalletConnect Integration
- **WalletConnect v2 SDK**: Official SDK for secure wallet-to-dApp communication
- **Deep Link Handling**: Process wallet app returns with connection state management
- **Multi-Wallet Support**: MetaMask, Trust Wallet, Rainbow, Coinbase Wallet compatibility
- **Session Persistence**: Maintain wallet connections across app lifecycle events

#### Platform-Specific Features
- **iOS Requirements**:
  - Associated Domains capability in Xcode project
  - Universal Links handling in AppDelegate/SceneDelegate
  - Camera/microphone permissions for calling features
  - Background app refresh for message notifications
  - Keychain integration for secure credential storage

- **Android Requirements**:
  - Intent filters with autoVerify for app links
  - Runtime permissions for camera, microphone, storage
  - Background service management for notifications
  - Biometric authentication integration
  - Android Keystore for secure storage

#### Enhanced Mobile Features
- **Biometric Authentication**: Face ID, Touch ID, fingerprint login
- **Push Notifications**: Real-time message and call notifications
- **Offline Capability**: Message caching and offline wallet balance viewing
- **Background Sync**: Periodic balance updates and message synchronization
- **Native Camera Integration**: Photo/video capture for message attachments
- **Contact Integration**: Device contact sync for user discovery
- **Location Services**: Optional location sharing in messages

#### Security Enhancements
- **Certificate Pinning**: Prevent man-in-the-middle attacks
- **App Attestation**: Verify app integrity on iOS and Android
- **Secure Enclave/TEE**: Hardware-backed security for sensitive operations
- **Jailbreak/Root Detection**: Enhanced security checks
- **Code Obfuscation**: Protection against reverse engineering

### Development Phases

#### Phase 1: Core Infrastructure (Weeks 1-4)
- Set up React Native/Flutter project structure
- Implement basic navigation and authentication
- Integrate WalletConnect SDK
- Configure deep linking for both platforms

#### Phase 2: Core Features (Weeks 5-8)
- Port messaging functionality to mobile
- Implement voice/video calling with WebRTC
- Add wallet management with WalletConnect
- Set up push notification infrastructure

#### Phase 3: Platform Integration (Weeks 9-12)
- Implement platform-specific features (biometrics, permissions)
- Add native camera and file handling
- Optimize performance and memory usage
- Comprehensive testing on real devices

#### Phase 4: Security & Polish (Weeks 13-16)
- Implement advanced security features
- Add offline capabilities and background sync
- Performance optimization and UI polish
- Prepare for app store submissions

### Migration Strategy
- **Parallel Development**: Maintain web app while developing native version
- **Shared Backend**: Use existing API with mobile-specific enhancements
- **Data Migration**: Seamless user account transition from web to mobile
- **Feature Parity**: Ensure all web features are available in native app
- **User Communication**: Clear migration path and benefits communication