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
- **Wallet Authentication**: Supports MetaMask and Trust Wallet with comprehensive signature collection
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
- Wallet management for BNB, USDT, and COYN with real blockchain balances and live market prices.
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

### Mobile Optimizations (Current Web App)
- Touch-optimized interactions with 44px minimum touch targets
- Mobile keyboard awareness with dynamic viewport height
- iOS-specific optimizations (zoom prevention, safe area insets)
- Touch scrolling optimizations and gesture handling
- Mobile-first responsive design with 768px breakpoint
- Enhanced microphone permission handling for mobile browsers
- Consolidated authentication flow preventing race conditions

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