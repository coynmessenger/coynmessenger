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
- June 25, 2025: Added subtle micro-interactions for crypto send buttons - hover scale effects, icon rotations, text translations, and smooth animations
- June 25, 2025: Updated escrow manager to match light theme - white backgrounds, black text, orange accents, and proper light/dark theme consistency
- June 25, 2025: Applied consistent light theme colors across all modals - add contact, profile edit, video call, with white backgrounds and orange accents
- June 25, 2025: Fixed escrow manager completely - removed all emojis, applied proper light theme with white backgrounds and orange accents, improved functionality and status badges
- June 25, 2025: Integrated escrow payment alerts - added visual payment requirement notifications, toast alerts for funding steps, status indicators for waiting periods, and server-side logging for payment tracking
- June 25, 2025: Developed multi-step escrow confirmation process - 3-step creation flow (form → review → confirm) and 3-step funding process (amount → review → confirm) with progress indicators and detailed confirmation screens
- June 25, 2025: Removed back arrow button from chat header for cleaner interface
- June 25, 2025: Added marketplace button to homepage and created comprehensive marketplace page with product listings, search, filters, and statistics
- June 25, 2025: Integrated Amazon API for crypto purchases - real product search, crypto-to-USD conversion, purchase flow with multiple cryptocurrencies, and live pricing
- June 25, 2025: Enhanced marketplace with advanced search engine - improved search UI, filter management, search suggestions, active filter display, and better user experience
- June 25, 2025: Redesigned marketplace header with gradient styling, crypto payment indicators, and improved home button - expanded product catalog to 100+ items with authentic images and filtered out products without images
- June 25, 2025: Simplified marketplace header to clean design with COYN branding and home icon button
- June 25, 2025: Enhanced image loading with lazy loading, smooth transitions, error handling, and expanded to 25+ verified Amazon products with authentic images
- June 25, 2025: Added settings button to marketplace header and integrated mailing address functionality for shipping - users can now add full shipping details in settings for marketplace purchases
- June 25, 2025: Removed popular searches section from marketplace for cleaner interface
- June 25, 2025: Added comprehensive hover tooltips on product images with descriptions, ratings, and reviews
- June 25, 2025: Implemented expandable "Details & Reviews" sections with mock customer reviews and product specifications
- June 25, 2025: Made shipping information conditional - only appears in marketplace settings, not messenger settings
- June 25, 2025: Updated marketplace header to display just "Marketplace" in Google Product Sans font, removed COYN branding
- June 25, 2025: Simplified buy button text from "Buy with Crypto" to "Buy" for cleaner interface
- June 25, 2025: Updated messenger header to use Google Product Sans font for consistency
- June 25, 2025: Added multiple product images with slide/scroll carousel functionality - includes navigation arrows, dot indicators, and image counter for enhanced product viewing
- June 25, 2025: Fixed image carousel implementation with proper error handling - all product information remains visible even when images fail to load, enhanced fallback display with product details
- June 25, 2025: Added floating scroll to top button in marketplace with smooth scrolling animation and orange/cyan theme styling
- June 25, 2025: Optimized messenger sidebar layout - reduced padding, made elements thinner, smaller avatars and icons, more compact spacing for better contact visibility
- June 25, 2025: Redesigned chat interface to WhatsApp-style layout - green message bubbles, date separators, subtle background pattern, rounded input with attachment icons, orange/cyan theme integration
- June 25, 2025: Redesigned chat header to match WhatsApp style - compact orange header with smaller avatar, tighter spacing, clean typography, and improved button layout
- June 25, 2025: Optimized sidebar to focus on contacts - removed padding between conversations, added contact separators, compact header/footer, better space utilization for chat list
- June 25, 2025: Streamlined sidebar layout - moved add contact to icon-only button inline with search bar to maximize space for conversations
- June 25, 2025: Added comprehensive messaging features - reply functionality with message threading, share messages between conversations, message selection with visual feedback, and foundation for group chat creation
- June 25, 2025: Added profile image upload functionality - users can now upload and change their profile pictures through settings with file validation, size limits, and proper storage management
- June 25, 2025: Fixed sidebar RangeError by adding proper date validation and error handling for timestamp formatting
- June 25, 2025: Made wallet section more compact - reduced size to create more space for contacts, smaller balance display, compact buttons for better mobile experience
- June 25, 2025: Removed auto-redirect after wallet connection - users now stay on homepage and manually choose messenger or marketplace destination
- June 25, 2025: Optimized wallet modal for mobile devices - responsive spacing, smaller text/icons on mobile, reduced padding, touch-friendly button sizes
- June 25, 2025: Made contact list much tighter for mobile - reduced avatar sizes, minimal padding, compact spacing, smaller text while maintaining touch targets
- June 25, 2025: Removed add contact button from sidebar to maximize space for contact list on both mobile and desktop
- June 25, 2025: Enhanced COYN wallet modal for mobile - tighter spacing, smaller padding, compact currency cards, responsive button sizes, optimized scrollbar width
- June 25, 2025: Removed "system" theme option from appearance settings - simplified to light and dark themes only for both mobile and desktop
- June 25, 2025: Removed "COYN Messenger" text from homepage header - kept only the COYN logo for cleaner appearance
- June 25, 2025: Created comprehensive product page system with detailed product views, image carousels, suggested products, purchase flow, and chat sharing functionality
- June 25, 2025: Enhanced product pages with horizontal scrolling suggested products and NFT rewards system featuring Bronze, Silver, Gold, and Diamond tiers based on purchase value
- June 25, 2025: Added automatic scroll to top functionality for product and marketplace pages to ensure users always start at the top when navigating
- June 25, 2025: Created comprehensive favorites/wishlist system - users can heart products, view favorites page, manage wishlist with full CRUD operations and database persistence
- June 25, 2025: Simplified all page headers to be more user-friendly with icon-only navigation, reduced padding, and cleaner minimal design
- June 25, 2025: Implemented comprehensive shopping cart system with finalize purchase functionality - users can add products, manage quantities, remove items, and complete cryptocurrency purchases with live conversion rates
- June 25, 2025: Updated all purchase buttons from "Buy with Crypto" to "Add to Cart" for consistent user experience across marketplace and product pages
- June 25, 2025: Implemented comprehensive finalize purchase functionality with 3-step checkout process: address confirmation, order review, and payment verification - includes shipping address validation, tax calculation, express shipping options, order notes, terms agreement, and detailed order summary with secure cryptocurrency payment flow
- June 25, 2025: Fixed cart window closing functionality - added proper handleClose function that resets modal states, updated Dialog onOpenChange handler, and ensured Cancel button properly closes cart across all pages
- June 25, 2025: Updated COYN logo throughout application with new golden coin design - replaced all logo imports with updated image file across homepage, marketplace, messenger sidebar, and wallet modal
- June 25, 2025: Fixed wallet modal sizing and responsiveness - optimized dimensions with w-[95vw] max-w-md max-h-[95vh], improved button layouts, enhanced mobile experience with proper scaling across all screen sizes
- June 25, 2025: Enhanced mobile wallet readability - improved spacing with w-[90vw] sm:w-[85vw] dimensions, added m-5 sm:m-6 margins, increased padding p-5 sm:p-6 for better side spacing and full readability on mobile devices
- June 25, 2025: Maximized wallet modal readability - further optimized dimensions to w-[80vw] sm:w-[75vw] with enhanced margins m-10 sm:m-12 and padding p-6 sm:p-8 across all wallet modals (main, send, QR, escrow) for optimal mobile reading experience
- June 25, 2025: Simplified cart button text - replaced "Add to Cart" with "Cart" across marketplace and product pages while maintaining shopping cart icon for cleaner, more compact button design
- June 25, 2025: Enhanced mobile sizing intuition - optimized button heights, touch targets, icon sizes, and spacing across marketplace headers, sidebar wallet section, search inputs, and navigation elements for better mobile usability with larger touch-friendly buttons (h-10 w-10 on mobile, h-8 w-8 on desktop)
- June 25, 2025: Implemented Amazon-style checkout system with comprehensive 3-step purchase flow (Cart → Review → Finalize) - replaced all shopping cart components across marketplace, product, and favorites pages with unified checkout experience featuring address management, shipping options, cryptocurrency payment selection, order review, and purchase confirmation
- June 25, 2025: Fixed critical shopping cart bug - standardized localStorage key from 'shoppingCart' to 'shopping-cart' across all cart functions (addToCart, getCartCount, AmazonCheckout) to ensure cart items display properly when dialog opens
- June 25, 2025: Implemented comprehensive mobile-first optimization - enhanced touch targets (48px minimum), larger input fields (h-12 on mobile), improved spacing and padding, responsive icons, optimized shopping cart controls, marketplace search interface, chat input area, homepage navigation buttons, and sidebar elements for superior mobile usability with touch-manipulation CSS
- June 25, 2025: Fixed cart sizing and scroll functionality - optimized dialog layout with proper flexbox structure, improved scrolling behavior for cart items, enhanced mobile responsiveness with better touch targets and spacing, fixed summary section positioning for optimal user experience
- June 26, 2025: Added comprehensive legal compliance - created detailed Terms & Conditions and Privacy Policy as popup modals accessible from homepage footer links, covering cryptocurrency transactions, marketplace usage, data protection, GDPR compliance, and user rights with proper legal documentation
- June 26, 2025: Fixed heart icon state persistence on product page - heart now stays red after adding to favorites by connecting click handler to proper toggleFavorite API function instead of simple state toggle
- June 26, 2025: Added comprehensive order summary to finalize payment section - includes detailed item breakdown with images, shipping address display, cost breakdown, and order notes for complete purchase transparency
- June 26, 2025: Updated Terms and Conditions contact email to coynful@gmail.com for customer support and legal inquiries
- June 26, 2025: Removed wallet overview sidebar from favorites page - reverted to clean single-column layout using existing header wallet hover button functionality instead of dedicated sidebar for better consistency across pages
- June 26, 2025: Fixed wallet overview cryptocurrency icons - replaced generic colored circles with authentic logos (official Bitcoin/Binance icons, proper USDT branding, and authentic COYN golden coin logo) for consistent branding across marketplace and favorites pages
- June 26, 2025: Updated messenger wallet modal to use authentic BNB logo - replaced simple symbols with official Binance icon throughout send modal, balance cards, QR selector, and all currency displays for consistent cryptocurrency branding
- June 26, 2025: Added authentic Bitcoin logo to messenger wallet modal - implemented official BTC icon from react-icons throughout all wallet displays, completing comprehensive cryptocurrency branding with proper logos for all assets (BTC, BNB, USDT, COYN)
- June 26, 2025: Updated favorites page "Add" buttons to "Cart" with shopping cart icon - replaced text-only "Add" buttons with "Cart" text and ShoppingCart icon for consistent shopping experience across application
- June 26, 2025: Implemented generic user icons for missing profile pictures - replaced placeholder images and fallback text with proper Avatar components featuring UserIcon fallbacks across messenger contact list, conversation list, and sidebar for consistent user experience when profile images are unavailable
- June 26, 2025: Repositioned wallet connection section to top of homepage - moved "Connect to COYN Network" card directly under COYN logo and above features grid for improved user flow and prominent wallet connection access
- June 26, 2025: Simplified wallet connection title to "Connect Wallet" - changed from "Connect to COYN Network" for cleaner, more concise user interface messaging
- June 26, 2025: Updated wallet connection description to reference "COYN Wallet" - changed from "COYN network" for consistent terminology throughout the interface
- June 26, 2025: Removed auto-redirect after wallet connection - users now stay on homepage and manually choose messenger or marketplace destination
- June 26, 2025: Updated marketplace categories - replaced "All Category" with "Categories" and implemented more suitable category options (Electronics, Home & Garden, Clothing & Fashion, Books & Media, Sports & Outdoors) that better match Amazon product inventory
- June 26, 2025: Removed "Send" and "Receive" buttons from messenger sidebar wallet section - streamlined wallet area to show only balance information, creating cleaner interface with more space for conversation list
- June 26, 2025: Added hide and show balance functionality to messenger sidebar - implemented eye/eyeoff toggle button that allows users to hide balance display for privacy, showing dots instead of actual amount when hidden
- June 26, 2025: Extended balance privacy feature to COYN wallet modal with comprehensive hide/show functionality - added eye/eyeoff toggle in wallet header, hides total balance and individual crypto amounts with "••••••" placeholder, optimized mobile touch targets with larger buttons (h-12 w-12 on mobile, h-10 w-10 on desktop) and improved header layout with proper spacing and truncation
- June 26, 2025: Fixed scroll issue in COYN wallet modal - changed overflow from hidden to auto, optimized crypto holdings section scrolling by removing problematic negative margins, improved mobile scrolling experience with proper flex layout
- June 26, 2025: Fixed escrow release functionality - updated releaseEscrow method to accept both "pending" and "funded" statuses, corrected fund distribution logic to use required amounts instead of deposited amounts, verified complete release workflow with database status updates and timestamp recording
- June 26, 2025: Added comprehensive show/hide balance functionality to marketplace - implemented balance privacy toggles in wallet hover component and Amazon checkout payment flows, users can now hide cryptocurrency amounts, rates, and totals with eye/eyeoff buttons for enhanced privacy across all marketplace transactions
- June 26, 2025: Implemented contact list where "start conversation" appears - replaced empty state with interactive contact list showing available users to message, includes profile pictures, usernames, online status indicators, click-to-start conversation functionality, and loading states for seamless chat initiation
- June 26, 2025: Prioritized contact list display in messenger - contacts now appear first when opening messenger page, showing Chris, g stax, and other available users prominently at the top for easy access, with recent conversations displayed below as secondary content
- June 26, 2025: Successfully implemented working contact list in sidebar component - added API integration to fetch all users, filter available contacts, and display them prominently with "Start New Conversation" section at top of messenger, includes click-to-start conversation functionality with loading states
- June 26, 2025: Added wallet icon to messenger header - positioned wallet access button in top right corner of mobile header next to search and home icons for quick access to cryptocurrency wallet during messaging
- June 26, 2025: Added back button to chat interface - mobile users can now tap back arrow in chat header to return to contact list when conversation is selected, improving navigation flow
- June 26, 2025: Enhanced wallet asset breakdown with comprehensive cryptocurrency details - added current market prices, 24h price changes with trend indicators, portfolio percentages, performance classifications, and professional three-row card layout for better portfolio analytics
- June 26, 2025: Integrated enhanced wallet overview into messenger sidebar - added detailed asset breakdown showing top 3 cryptocurrencies with authentic logos, USD values, 24h changes, trend indicators, and privacy toggle functionality for quick portfolio monitoring during conversations
- June 26, 2025: Removed conversation list from sidebar - streamlined interface to focus on contact discovery and wallet monitoring, keeping only new contact list and enhanced cryptocurrency portfolio overview for cleaner user experience
- June 26, 2025: Enhanced sidebar to show all 4 cryptocurrency assets and removed search functionality - now displays complete portfolio with Bitcoin, BNB, USDT, and COYN all visible with detailed breakdowns, authentic logos, USD values, 24h changes, and privacy toggle for comprehensive wallet monitoring
- June 26, 2025: Streamlined sidebar header design - consolidated "COYN" and "Messenger" into single title "COYN Messenger" next to logo for cleaner, more professional appearance
- June 26, 2025: Removed "+1 more assets" indicator from sidebar - now displays all 4 cryptocurrency assets directly without additional text indicators for cleaner wallet overview
- June 26, 2025: Removed logo and "Conversations" header from messenger page - eliminated redundant header bar for cleaner, more streamlined interface that flows directly into contact list and messaging content
- June 26, 2025: Removed highlighted yellow "Conversations" section from mobile messenger - eliminated all redundant header elements for completely clean, streamlined interface across both desktop and mobile layouts
- June 26, 2025: Added "Messenger" header to mobile messenger page - implemented clean header with COYN logo and "Messenger" title using Google Product Sans font, matching marketplace header styling for consistency across application
- June 26, 2025: Removed highlighted "to Receive" text from COYN wallet - streamlined currency selection label to simply "Select Currency" for cleaner interface
- June 26, 2025: Moved "Messenger" branding to mobile navigation bar - removed header from main content area and positioned COYN logo with "Messenger" text in top navigation for better mobile UX
- June 26, 2025: Updated search functionality from "Search conversations" to "Search messages" - changed placeholder text in both mobile messenger interface and share modal for more accurate functionality description
- June 26, 2025: Enhanced crypto send buttons with authentic cryptocurrency logos - replaced basic colored circles with official Bitcoin, Binance, Tether icons from react-icons and authentic COYN golden coin logo for professional branding consistency
- June 26, 2025: Updated wallet balances to realistic 2025 cryptocurrency market prices - Bitcoin ~$100k (0.125 BTC = $12,500), BNB ~$600 (8.5 BNB = $5,100), USDT stable $1.00 (2,500 USDT = $2,500), COYN ~$0.85 (1,500 COYN = $1,275) for total portfolio of $21,375
- June 26, 2025: Fixed broken profile image fallbacks in messenger contact list - replaced basic img tags with proper Avatar components featuring UserIcon fallbacks for consistent user experience when profile pictures are unavailable
- June 26, 2025: Updated chat header profile fallback to show simple letter display - changed from UserIcon to clean letter format (e.g., "J" for Jane) for better visual consistency with messaging app standards
- June 26, 2025: Added professional user avatar icon component for missing profile images - created custom SVG user silhouette matching iStock style for consistent fallback display throughout messenger contact lists and conversations
- June 26, 2025: Implemented custom orange wallet icon in messenger mobile header - replaced generic SVG with branded WalletIcon component featuring wallet design with card slot detail and orange color scheme to match COYN branding
- June 26, 2025: Added comprehensive Web3 wallet connection options to homepage - implemented MetaMask, WalletConnect, Trust Wallet, and Coinbase Wallet connection buttons with authentic wallet logos, hover animations, and fallback manual address input for enhanced user onboarding
- June 26, 2025: Updated messenger header wallet icon design - replaced orange wallet with minimalist stroke-based design featuring clean lines, credit card details, and slate/cyan color scheme to better match interface aesthetic
- June 26, 2025: Redesigned homepage wallet connection to compact 2x2 grid layout - replaced full-width buttons with space-efficient squares featuring authentic MetaMask, WalletConnect, Trust Wallet, and Coinbase logos in professional outline button design
- June 26, 2025: Fixed all wallet logos with authentic designs - implemented official MetaMask fox logo with proper gradients, WalletConnect bridge symbol in blue circle, Trust Wallet shield design, and Coinbase rounded square logo with correct brand colors
- June 26, 2025: Updated wallet logos for better authenticity - replaced all wallet connection icons with cleaner, more recognizable brand designs using official color schemes and simplified geometric shapes for improved visual recognition
- June 26, 2025: Implemented completely authentic wallet logos using actual brand images - replaced all SVG designs with real MetaMask fox, WalletConnect bridge symbol, Trust Wallet shield, and Coinbase "C" logos for 100% legitimate appearance
- June 26, 2025: Updated hamburger menu icon color from turquoise/cyan to slate-400 with orange hover effect - improved visual consistency with messenger interface color scheme
- June 26, 2025: Fixed wallet overview window scroll issue on favorites page - added proper overflow handling, height constraints (max-h-[80vh]), flexible layout with scrollable content area, and improved positioning logic to prevent popup from going off-screen
- June 26, 2025: Implemented comprehensive automatic scroll-to-top functionality across all pages using custom useScrollToTop hook - ensures users always start at top when navigating between marketplace, favorites, and product pages for consistent user experience
- June 26, 2025: Removed all "Amazon" branding throughout application - renamed API endpoints from /api/amazon/ to /api/marketplace/, updated component names (AmazonCheckout to MarketplaceCheckout), interfaces (AmazonProduct to Product), and replaced all Amazon references with generic marketplace terminology for broader commercial appeal
- June 26, 2025: Implemented comprehensive blockchain escrow system with 25-confirmation requirement - enhanced database schema with confirmation tracking, notification system, automatic status updates from pending → awaiting_funds → funded → confirming → released, real-time progress indicators with visual confirmation progress bars, automated fund release after blockchain confirmations complete, and system message notifications throughout entire escrow lifecycle from creation to completion
- June 26, 2025: Enhanced escrow modal with comprehensive mobile-first responsive design - optimized form layouts with responsive grid systems (1 column on mobile, 2 on desktop), improved input field heights and touch targets, made button layouts stack vertically on mobile, enhanced typography scaling, improved padding and spacing for mobile devices, optimized funding progress indicators and blockchain confirmation displays for smaller screens
- June 26, 2025: Updated active escrow filtering and display - implemented proper filtering to exclude canceled and released escrows from "Active Escrows" section, added visual counter badge showing number of active escrows, improved empty state messaging, ensured real-time updates when escrow status changes
- June 26, 2025: Created notification system for escrow release requests - added "Request Release" and "Confirm Release" buttons for funded escrows, implemented backend notification endpoint that sends system messages to conversations, enhanced user workflow with dual-action release process (request → confirm), added proper loading states and toast notifications for better user feedback
- June 26, 2025: Implemented comprehensive elaborate escrow system - enhanced database schema with 20+ new fields including escrow types (basic/marketplace/service/custom), priority levels, timeout handling, verification requirements, dispute resolution, milestone tracking, template system, financial details with fees, terms and deliverables, metadata and external references, complete API endpoints for all escrow operations, comprehensive dashboard interface with filtering, search, dispute management, template creation, progress tracking, and multi-tab organization for active/completed/disputed escrows
- June 26, 2025: Removed escrow dashboard - streamlined application by removing standalone escrow dashboard page and keeping all escrow functionality integrated within messenger interface, removed dashboard-specific API routes (search, templates, milestones) while maintaining core escrow operations for messenger integration
- June 26, 2025: Removed Trust Wallet connection option - eliminated Trust Wallet button from homepage to prevent creation of test users, updated wallet connection grid to 3-column layout with MetaMask, WalletConnect, and Coinbase options only
- June 26, 2025: Eliminated all test wallet user creation - removed "WalletConnect User", "Coinbase User", and "MetaMask User" creation from wallet connection flow, updated MetaMask to only work with real wallet connections, WalletConnect and Coinbase buttons now show "coming soon" message directing users to manual input
- June 26, 2025: Added Trust Wallet back as sign-in option - restored Trust Wallet button to homepage with 2x2 wallet grid layout, Trust Wallet shows "coming soon" message directing users to manual input for now, maintains professional approach without creating test users
- June 26, 2025: Fixed unwanted conversations issue - removed orphaned test users "Trust Wallet User" and "WalletConnect User" from database that were appearing as unwanted conversations in messenger, cleaned up associated conversations and invalid wallet addresses to ensure clean user experience
- June 26, 2025: Removed additional test user contact - deleted "User 4Fe8e1" from database and cleaned up associated conversation to maintain clean contact list with only legitimate demo users (Chris, Jane, G Stax, Daniel)
- June 26, 2025: Implemented wallet connection safeguards - modified API to prevent new user creation during wallet connections, changed `/api/users/find-or-create` to only find existing users, added proper error handling for unregistered wallet addresses, created separate `/api/admin/users/register` endpoint for controlled user registration, updated frontend error messaging to guide users to contact administrator
- June 26, 2025: Added clickable profile popup in chat header - created comprehensive UserProfileModal component with user details, wallet address copying, action buttons for call/video/message, online status indicator, made chat header profile area clickable to display detailed user information with clean light theme styling
- June 26, 2025: Enabled user wallet connections with validation - modified system to allow legitimate wallet address connections while preventing invalid formats, added proper wallet address validation (0x format with 40 hex characters), users can now connect with valid wallet addresses and display names while maintaining security against malformed addresses
- June 26, 2025: Fixed unwanted user creation in contact list - added isSetup field to user schema, new wallet connections create users with isSetup=false so they don't appear in contact list until properly configured, only setup users (demo users) appear in "Start New Conversation" section, prevents cluttered interface from auto-created wallet users
- June 26, 2025: Fixed search modal light theme and functionality - updated search bar colors to match light theme (white background, black text, orange focus borders), implemented proper search filtering for both conversations and contacts, search now filters by display name, username, and message content with real-time results
- June 26, 2025: Added desktop back button to chat interface - implemented consistent back button functionality for both desktop and mobile layouts, users can now return to contact list from chat conversations on desktop similar to mobile experience
- June 26, 2025: Implemented comprehensive search highlighting and auto-scroll functionality - search text now highlights in real-time with yellow background in both sent and received messages, automatically scrolls to first search result, includes search result counter in chat header, adds visual pulse animation for found results, works across both light and dark themes with proper color schemes
- June 26, 2025: Fixed user profile modal header highlighting - removed unwanted yellow background from "User Profile" title by replacing DialogTitle with custom header component, ensuring clean white background without search highlighting interference
- June 26, 2025: Updated mobile messenger navigation to white theme - changed dark navigation background to white with proper color contrast, updated all button and text colors to be visible on white background, ensures consistent light theme appearance across both light and dark modes
- June 26, 2025: Removed "User Profile" header text from profile modal - eliminated title text for cleaner, more streamlined profile interface focused on user content
- June 26, 2025: Added search functionality to desktop messenger sidebar - implemented search bar with search icon, clear button, and consistent styling matching mobile search functionality for desktop users
- June 26, 2025: Enhanced wallet currency selection flow - selected currency in main wallet modal now carries over to send modal dropdown, improving user experience by pre-selecting the currency user clicked send on
- June 26, 2025: Standardized profile image fallbacks across entire application - implemented consistent UserAvatarIcon fallback for missing profile pictures in messenger contact list, conversation list, sidebar, chat header, and user profile modal, ensuring uniform user experience with professional avatar icons on both mobile and desktop
- June 26, 2025: Updated "Add New Contact" modal to light theme - replaced dark slate backgrounds with white, changed cyan accents to orange, updated all text colors to gray/black, ensuring consistent light theme appearance with white backgrounds, orange primary buttons, and proper contrast throughout modal interface
- June 26, 2025: Fixed escrow list functionality - resolved "Invalid Date" and "0.0000" display issues with proper date validation and number formatting, added comprehensive amount formatting helper function, implemented bidirectional exchange display showing both currencies, added funding progress indicators for active escrows, enhanced status colors for all escrow states (pending, funded, confirming, released, completed, cancelled, disputed), implemented active/completed tab system with proper filtering, disabled action buttons for completed escrows, and improved empty state messaging for both active and history sections
- June 26, 2025: Fixed display name synchronization between wallet connection and profile settings - modified `/api/user` endpoint to accept user ID parameter, updated settings modal to fetch current connected user data from localStorage, added proper React Query cache invalidation on wallet connection to ensure display name entered during sign-in reflects in profile settings
- June 26, 2025: Fixed profile picture upload persistence issue - modified `/api/user/upload-avatar` endpoint to accept userId parameter, updated frontend to pass connected user ID in upload requests, enhanced cache invalidation to properly update both query variations, resolved issue where uploaded images weren't displaying in settings modal due to user ID mismatch between upload and display
- June 27, 2025: Fixed delete message button light theme colors - updated dropdown menu backgrounds from dark slate to white, changed button hover states to light gray, updated delete menu item colors to proper red-600 for light theme with red-50 hover backgrounds, ensuring proper contrast and visibility in light mode

## User Preferences

Preferred communication style: Simple, everyday language.