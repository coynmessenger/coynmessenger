# COYN Messenger

## Overview
COYN Messenger is a full-stack messaging application that integrates chat, cryptocurrency wallet management, and video calls. It aims to provide a seamless, secure, and intuitive platform for communication and crypto transactions within a dark-themed interface. The project envisions significant market potential by blending essential communication tools with burgeoning blockchain technology. Key capabilities include real-time text messaging, cryptocurrency transfers, comprehensive wallet management, and encrypted voice/video calls.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript
-   **Routing**: Wouter with authentication-based routing
-   **UI**: Radix UI components with shadcn/ui styling
-   **Styling**: Tailwind CSS with custom COYN branding
-   **State Management**: TanStack Query
-   **Build Tool**: Vite

### Backend
-   **Runtime**: Node.js with Express.js
-   **Language**: TypeScript (ES modules)
-   **Database ORM**: Drizzle ORM
-   **Database**: PostgreSQL (Neon serverless)
-   **Session Management**: Express sessions with PostgreSQL store

### Authentication & Transaction Architecture
-   **Universal Wallet Support**: Thirdweb SDK v5 provides seamless support for all major Web3 wallets for sign-in.
-   **Server-Side Internal Wallets**: Each user has an auto-generated BSC wallet with AES-256-GCM encrypted private keys stored server-side, enabling transactions without external wallet popups.
-   **Dual Transfer Model**: Supports instant user-to-user (internal DB transfer) and external on-chain sends, with pre-flight checks for token and gas balances.
-   **RPC Fallback**: Rotates through 5 BSC RPC endpoints with automatic failover.
-   **Supported Wallets**: WalletConnect (mobile), MetaMask, Coinbase Wallet, Bitget Wallet, Trust Wallet, Rabby, Zerion.
-   **Supported Tokens**: BNB (native), USDT (ERC-20), COYN (ERC-20).

### Core Features
-   Real-time text messaging with file attachments, emojis, and GIFs.
-   Cryptocurrency sending within messages and wallet management for BNB, USDT, and COYN.
-   Encrypted wallet-to-wallet voice and video calling (WebRTC with Signal Protocol-inspired encryption).
-   Automatic call recording with encrypted storage and transcription using OpenAI Whisper.
-   Comprehensive marketplace for crypto purchases with favorites/wishlist and purchase history.
-   Group chat functionality.
-   Responsive design with mobile-first optimization, including touch-optimized interactions and mobile keyboard awareness.
-   Dark-themed interface with orange accents, glassmorphism effects, and modern typography.

### System Design
-   Database schema includes `users`, `conversations`, `messages`, and `wallet_balances`.
-   API routes for user, conversations, messages, and marketplace interactions.
-   Universal Wallet Transaction System using Thirdweb SDK for routing transactions through the user's connected wallet.
-   Transaction processing uses the real BNB chain (BSC) for all token transfers.

### Security Architecture
-   **Session-based API gates**: Wallet send, record-transfer, send-internal, balance refresh, message delete, and clear-all-data routes all require a valid server-side session. Client-supplied `userId`/`fromUserId` is cross-validated against the session; mismatches return 403.
-   **Socket.IO room authorization**: `join-conversation` verifies the authenticated user is a participant (direct: `participant1Id`/`participant2Id`; group: `getGroupMembers()` lookup) before admitting to the room.
-   **Profile picture size cap**: Base64 image payloads are capped at 2 MB (413 returned if exceeded) to prevent database bloat.
-   **Startup key validation**: `PLATFORM_WALLET_KEY` presence and format (32-byte hex) are validated at boot with a [FATAL] log if missing/malformed.
-   **RPC chainId verification**: Each BSC RPC provider is verified to be on chainId 56 before use; wrong-chain providers are skipped in the rotation.
-   **CSP headers**: Explicit WebSocket relay origins (`wss://relay.walletconnect.com`, `wss://*.walletconnect.com`) whitelisted; `upgrade-insecure-requests` removed to avoid Firefox WebSocket interference.
-   **Rate limiting**: All sensitive endpoints are covered by specific rate limiters (authLimiter, walletLimiter, messageLimiter, uploadLimiter, searchLimiter) plus a global 300 req/15 min cap.
-   **AES-256-GCM**: User internal wallet private keys encrypted at rest.
-   **Known accepted risk**: Core auth state is localStorage-based for read routes — a full server-side session overhaul of the frontend is a future task.

## External Dependencies
-   **@neondatabase/serverless**: PostgreSQL database connection.
-   **drizzle-orm**: Type-safe database ORM.
-   **@tanstack/react-query**: Server state management.
-   **@radix-ui/***: Headless UI components.
-   **tailwindcss**: CSS framework.
-   **Thirdweb SDK v5**: Universal Web3 wallet integration and blockchain transactions.
-   **CoinGecko API**: Live cryptocurrency prices and 24h change data.
-   **GIPHY API**: GIF integration.
-   **Socket.IO**: Real-time communication.
-   **OpenAI (Replit AI Integrations)**: Call transcription via Whisper/gpt-4o-mini-transcribe model.
-   **Google Drive API (googleapis)**: Encrypted call recording storage.
-   **FFmpeg (system)**: Audio/video processing.
-   **OpenCV (system)**: Video processing.