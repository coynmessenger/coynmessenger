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
3. **Wallet Management**: View balances for BTC, ETH, USDT, and COYN
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

## User Preferences

Preferred communication style: Simple, everyday language.