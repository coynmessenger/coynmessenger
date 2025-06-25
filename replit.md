# COYN Messenger

## Overview

COYN Messenger is a modern full-stack messaging application that combines traditional chat functionality with cryptocurrency wallet integration. Built with React and Express, it provides users with the ability to send messages, manage crypto wallets, and conduct video calls within a sleek, dark-themed interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom COYN branding
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: TSX for TypeScript execution

## Key Components

### Database Schema
The application uses four main tables:
- **users**: User profiles with wallet addresses and online status
- **conversations**: Chat conversations between users
- **messages**: Individual messages with support for text and crypto transfers
- **wallet_balances**: User cryptocurrency balances and USD values

### API Routes
- `GET /api/user` - Get current user information
- `GET /api/conversations` - Get user's conversations
- `GET /api/conversations/:id/messages` - Get messages for a conversation
- `POST /api/conversations/:id/messages` - Send new message

### Core Features
1. **Real-time Messaging**: Text messaging between users
2. **Crypto Integration**: Send cryptocurrency within messages
3. **Wallet Management**: View balances for BTC, BNB, USDT, and COYN
4. **Video Calling**: Mock video call interface
5. **Responsive Design**: Mobile-first responsive layout

## Data Flow

1. **User Authentication**: Currently hardcoded to user ID 5 for demo purposes
2. **Message Flow**: 
   - Frontend sends message via POST to `/api/conversations/:id/messages`
   - Backend stores message in database
   - Frontend refetches conversation data to display new message
3. **Wallet Data**: Fetched on-demand when wallet modal is opened
4. **Real-time Updates**: Currently uses polling via TanStack Query

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **date-fns**: Date formatting utilities
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Fast build tool and dev server
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

## Deployment Strategy

The application is configured for deployment on Replit with auto-scaling:
- **Build Process**: 
  1. Vite builds the frontend to `dist/public`
  2. esbuild bundles the server code to `dist/index.js`
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Requires `DATABASE_URL` environment variable

## Changelog

- June 24, 2025: Initial setup, messaging, wallet, escrow system with dual-currency trades
- June 24, 2025: Added emoji picker with popular crypto/finance emojis for enhanced messaging
- June 24, 2025: Created home page with wallet connection flow - button shows "Wallet Connected" after connection
- June 24, 2025: Fixed TypeScript errors in storage layer and improved chat spacing/scrolling behavior
- June 24, 2025: Added COYN logo branding to wallet modal with gradient styling and glow effects
- June 24, 2025: Replaced all gradient logo placeholders with authentic COYN token logo throughout application
- June 24, 2025: Fixed empty space error above profile pictures in chat and removed "Token" from COYN branding
- June 24, 2025: Eliminated empty space at top of chat messages for cleaner interface
- June 24, 2025: Restored + button for crypto functionality while maintaining improved chat spacing
- June 24, 2025: Fixed inaccessible layer in header by removing non-functional Phone button
- June 24, 2025: Fixed hover bar positioning with proper absolute positioning and improved visual styling
- June 24, 2025: Removed COYN title text from mobile navigation hover bar for cleaner interface
- June 24, 2025: Implemented functional search for conversations in both mobile and desktop interfaces
- June 24, 2025: Made hover bars fully transparent with subtle hover effects for cleaner appearance
- June 24, 2025: Added user management features - add contacts by wallet address and edit user profiles
- June 24, 2025: Updated database schema to support voice messages with transcription fields
- June 24, 2025: Implemented Web 3.0 wallet connection on homepage with wallet address input and validation
- June 25, 2025: Changed homepage wallet connection from Ethereum to COYN addresses for ecosystem alignment
- June 25, 2025: Updated COYN address validation to support BNB network format (bnb... and 0x... addresses)
- June 25, 2025: Simplified COYN address validation to use standard 0x format only for consistency
- June 25, 2025: Modified wallet connection to allow proceeding even when API fails for better user experience
- June 25, 2025: Fixed header/hover bar overlapping issues in messenger with proper responsive layout separation
- June 25, 2025: Fixed sidebar scroll functionality on mobile by adding proper flex layout and scroll containment
- June 25, 2025: Removed "New Chat" button from sidebar for cleaner interface
- June 25, 2025: Created comprehensive settings modal with profile, appearance, notifications, privacy, and about sections
- June 25, 2025: Added settings button to both desktop sidebar header and mobile actions section for better accessibility
- June 25, 2025: Implemented functional light/dark theme toggle with proper CSS variables and responsive design
- June 25, 2025: Fixed profile update functionality - Save settings button now works correctly with proper error handling and success feedback
- June 25, 2025: Created comprehensive light theme with white/orange color scheme - clean white backgrounds with orange primary accents throughout entire application
- June 25, 2025: Enhanced light theme for consumer appeal with improved contrast, warm orange palette, subtle shadows, and better visual hierarchy
- June 25, 2025: Updated home page and chat area for light theme - white backgrounds with black text for better readability and consumer appeal
- June 25, 2025: Implemented WhatsApp-style color scheme with green primary colors, clean white message bubbles, and modern rounded interface elements
- June 25, 2025: Changed primary colors from green to orange and updated dark text to pure black for better contrast and readability
- June 25, 2025: Updated header and footer areas from dark to light orange backgrounds for consistent light theme appearance
- June 25, 2025: Made contacts lighter in sidebar, changed all header/footer areas to white, and implemented strict black and white theme for homepage
- June 25, 2025: Updated wallet section to use white/gray color scheme in light theme for cleaner appearance
- June 25, 2025: Made conversation items lighter with white backgrounds and black text, updated mobile header to white theme
- June 25, 2025: Changed homepage turquoise colors to black lettering in light theme while maintaining glow effects for dark theme
- June 25, 2025: Updated chat message input box to white background with black text and gray borders for light theme consistency
- June 25, 2025: Fixed profile update API endpoint - added PATCH route and corrected HTTP method in settings modal
- June 25, 2025: Integrated chat header into sidebar and removed separate header from chat window for cleaner layout
- June 25, 2025: Added wallet sign out functionality to homepage with persistent connection state stored in localStorage
- June 25, 2025: Updated wallet modal to use consistent light theme colors - white backgrounds, black text, orange accents throughout
- June 25, 2025: Added comprehensive send functionality to wallet with multi-step transaction flow and confirmation
- June 25, 2025: Integrated escrow functionality into wallet send feature with secure transaction options and detailed confirmation flow
- June 25, 2025: Enhanced wallet-escrow integration with active escrow display, management interface, and release/cancel functionality
- June 25, 2025: Completed light theme integration for escrow manager with improved UI, sorting, and enhanced functionality
- June 25, 2025: Added floating back to top button in chat with smooth scrolling and orange theme styling
- June 25, 2025: Redesigned COYN logo with sleek modern styling - reduced size, added glow effects, improved gradients, and enhanced visual hierarchy
- June 25, 2025: Reverted to original logo design and added "Powered by Coynful" attribution at bottom of homepage
- June 25, 2025: Updated to Binance Smart Chain (BSC) - replaced ETH with BNB throughout application for better transaction costs and speed
- June 25, 2025: Fixed settings modal wallet address display - now shows full address with copy functionality, removed edit capability for security
- June 25, 2025: Added quick crypto sending options in chat - users can send BTC, BNB, USDT, or COYN directly from the + menu
- June 25, 2025: Fixed profile settings - wallet address is now read-only with copy functionality, displays full address without truncation

## User Preferences

Preferred communication style: Simple, everyday language.