# COYN Messenger Design Guidelines (Compacted)

## Design Philosophy
Telegram-inspired messaging with Discord community features, enhanced by crypto-native glassmorphism and dark theme. Prioritizes message clarity with premium tech-forward aesthetics.

**Principles**: Glassmorphism depth • Message-first hierarchy • Transparent wallet integration • Dark-optimized contrast

---

## Typography

**Fonts**: Inter (body), Space Grotesk (headings, crypto amounts, addresses)

**Scale**:
- Display: `text-4xl` to `text-6xl font-bold` (Space Grotesk)
- H1/H2/H3: `text-3xl/2xl/xl font-bold/semibold`
- Body: `text-base/sm font-medium/normal leading-relaxed`
- Small/Micro: `text-xs font-normal/light`

**Message-Specific**:
- Sender: `text-sm font-semibold`
- Message: `text-sm font-normal leading-relaxed`
- Addresses: `text-xs font-mono`
- Crypto amounts: `text-lg font-bold tabular-nums` (Space Grotesk)

---

## Layout & Spacing

**Spacing**: `p-2, p-4, p-6, p-8, py-12, py-16` | `gap-2, gap-4, gap-6, gap-8`

**Grid Breakpoints**:
- Mobile: Single column, full-width
- Tablet (md): 2-column (sidebar + main)
- Desktop (lg): 3-column (sidebar 280px + chat list 360px + conversation flex-1)

**Constraints**: Max conversation `max-w-4xl` • Sidebar `w-70` • Chat list `w-90`

---

## Color System

**Backgrounds**:
- Primary: `bg-slate-900` (#0f172a)
- Secondary: `bg-slate-800` (#1e293b)
- Elevated: `bg-slate-700/50 backdrop-blur-xl`
- Inputs: `bg-slate-800/80 backdrop-blur-md`

**Accent Orange** (#FF6B35): CTAs, active states, unread badges, send buttons, transaction highlights

**Text & Status**:
- Primary: `text-slate-50` • Secondary: `text-slate-400` • Muted: `text-slate-500`
- Success: `text-emerald-500` • Warning: `text-amber-500` • Error: `text-red-500`
- Links/Mentions: `text-sky-400`

**Glassmorphism Template**:
```css
bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 shadow-2xl
```

---

## Core Components

### Navigation

**Top Bar** (`h-16 sticky top-0 z-50`):
- `bg-slate-900/95 backdrop-blur-md border-b border-slate-800`
- Layout: Logo (40px) • Search (center, glassmorphism) • Wallet + Profile (right)
- Avatar: `w-10 h-10 rounded-full ring-2 ring-orange-500` when active

**Sidebar** (`w-70 fixed`):
- `bg-slate-900` with right border
- Sections: DMs • Groups • Wallet Quick Actions • Settings
- Active: `bg-slate-800 border-l-4 border-orange-500`

**Mobile Tabs** (`h-16 bottom`):
- `bg-slate-900 backdrop-blur-md`
- Tabs: Chats • Calls • Wallet • Profile
- Active: `text-orange-500`

### Messages

**Chat List Item** (`h-20 p-4`):
- Avatar (48px) + Content + Meta
- `hover:bg-slate-800/50 active:bg-slate-800`
- Unread: `bg-orange-500 rounded-full px-2 py-1 text-xs font-bold`
- Online: green dot `absolute bottom-0 right-0`

**Message Bubbles**:
- Sent: `bg-orange-500/90 backdrop-blur-sm text-white rounded-2xl rounded-br-sm ml-auto max-w-md px-4 py-3`
- Received: `bg-slate-800/80 backdrop-blur-sm text-slate-50 rounded-2xl rounded-bl-sm mr-auto max-w-md px-4 py-3`
- Gap: `gap-2` between bubbles, `gap-6` between senders
- Meta: `text-xs text-slate-400` timestamp + read status

**Input** (`min-h-14`):
- `bg-slate-800/60 backdrop-blur-xl border-t border-slate-700/50`
- Layout: Attachment + Input (`flex-1`) + Send (orange circle `w-10 h-10`)
- Focus: `focus:ring-2 focus:ring-orange-500/50`

### Wallet

**Balance Card**:
- `bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-2xl border border-slate-700/40`
- Balance: `text-5xl font-bold tabular-nums text-white` + `text-orange-400` symbol
- Actions: Send • Receive • Swap (`gap-3`)

**Transaction Item** (`h-16 p-4`):
- Icon (pending: `animate-pulse ring-orange-500/50`, confirmed: green ✓) + Details + Amount
- Amount: `text-lg font-bold`, green (in) / white (out)

**Payment Bubble**:
- `bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-l-4 border-orange-500`
- CTA: `bg-orange-500 hover:bg-orange-600`

### Calls

**Full Screen**:
- Background: Blurred video or `bg-gradient-to-br from-slate-900 to-slate-800`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Tiles: `rounded-xl aspect-video bg-slate-800/50 backdrop-blur-md`
- Controls: `fixed bottom-8` center, glassmorphism rounded-full, `w-12 h-12` buttons

**Incoming Modal**:
- `bg-slate-800/95 backdrop-blur-2xl rounded-3xl p-8 max-w-sm`
- Avatar: `w-24 h-24 rounded-full ring-4 ring-orange-500 animate-pulse`
- Actions: Accept (`bg-emerald-500`) • Decline (`bg-red-500`)

### Forms

**Inputs**:
- `bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 px-4 py-3`
- Focus: `focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/30`

**Buttons**:
- Primary: `bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-orange-500/20`
- Secondary: `bg-slate-700/50 hover:bg-slate-700/70 backdrop-blur-sm border border-slate-600/50`
- Ghost: `bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-orange-500`
- Icon: `w-10 h-10 rounded-full p-2`

**Search**: `w-96 bg-slate-800/40 backdrop-blur-md rounded-full px-4 py-2`

### Cards

**Standard Card**:
```css
bg-slate-800/40 backdrop-blur-xl border border-slate-700/40 
shadow-2xl rounded-2xl p-6
```

**Feature Card**: Same + Icon (`w-12 h-12 bg-orange-500/10 rounded-xl p-3 text-orange-500`)

---

## Page Templates

### Landing Hero (`h-screen`):
- Background: Mockup image + `bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-orange-900/20`
- Headline: `text-6xl font-bold bg-gradient-to-r from-white to-orange-300`
- CTAs: Primary (orange) + Secondary (glassmorphism), `gap-4`
- Screenshot: Absolute positioned, rotated, with `shadow-2xl` glow

### Features (`py-20`): 3-col grid, glassmorphism cards (Encryption • Calls • Wallet)

### App Views:
- **Chat**: Header (sticky `h-16`) + Messages (`flex-1 overflow-y-auto px-4 py-6`) + Input (fixed)
- **Wallet**: Balance card + Quick actions + Transaction list on `bg-gradient-to-b from-slate-900 to-slate-800`

---

## Animations

**Micro**: Button hover `scale-105 duration-200` • Message send slide-in `duration-300` • Pulse online dot `animate-pulse` • Modal fade `opacity + scale duration-300`

**Default**: `transition-all duration-300 ease-in-out`

---

## Assets

**Hero Image**: 3D smartphone mockup showing dark theme interface with orange accents, 70% dark gradient overlay, slight edge blur

**Screenshots**: 1) Chat interface 2) Video call grid 3) Wallet dashboard

**Icons**: Heroicons • Abstract crypto visuals with orange accents