import { db } from "./db";
import { users, conversations, messages, walletBalances } from "@shared/schema";

async function seedDatabase() {
  console.log("Seeding database...");

  // Create users
  const seedUsers = [
    {
      username: "chris",
      displayName: "CHRIS",
      walletAddress: "0x84fa...3501",
      profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
    },
    {
      username: "jane",
      displayName: "JANE",
      walletAddress: "0x92ba...4602",
      profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b332c2bd?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
    },
    {
      username: "gstax",
      displayName: "G STAX",
      walletAddress: "0x73cf...5703",
      profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: false,
    },
    {
      username: "daniel",
      displayName: "DANIEL",
      walletAddress: "0x12...0920",
      profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
    },
    {
      username: "user",
      displayName: "You",
      walletAddress: "0x51E073...ed3E",
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
    },
  ];

  const insertedUsers = await db.insert(users).values(seedUsers).returning();
  console.log(`Created ${insertedUsers.length} users`);

  // Create conversations
  const seedConversations = [
    { participant1Id: 5, participant2Id: 1 },
    { participant1Id: 5, participant2Id: 2 },
    { participant1Id: 5, participant2Id: 3 },
    { participant1Id: 5, participant2Id: 4 },
  ];

  const insertedConversations = await db.insert(conversations).values(seedConversations).returning();
  console.log(`Created ${insertedConversations.length} conversations`);

  // Create messages for all conversations with more formal, engaging content and crypto transactions
  const seedMessages = [
    // Chris conversation (conversation ID 1) - Business & DeFi Discussion
    {
      conversationId: 1,
      senderId: 1,
      content: "Good afternoon! I hope you've been following the recent developments in the DeFi space.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Hello Chris! Yes, indeed. The institutional adoption of blockchain technology has been remarkable this quarter.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Absolutely. I've been particularly impressed with the Layer 2 scaling solutions. Have you had a chance to review the quarterly portfolio performance?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "I have, and the results are quite promising. The diversification across multiple blockchain ecosystems has yielded substantial returns.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Excellent. Speaking of diversification, I'd like to settle our consulting agreement from last month. Here's the payment in Bitcoin as discussed.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "",
      messageType: "crypto",
      cryptoAmount: "0.0025",
      cryptoCurrency: "BTC",
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Thank you for the prompt payment. I appreciate your professionalism in handling our business arrangements.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Of course. Now, regarding the upcoming DeFi protocol launch, I believe we should consider increasing our COYN allocation.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "I concur with that strategy. The tokenomics look solid, and the team has a proven track record.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Perfect. Let me transfer some additional COYN tokens for our joint investment pool.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "",
      messageType: "crypto",
      cryptoAmount: "150",
      cryptoCurrency: "COYN",
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Excellent contribution. This positions us well for the upcoming liquidity mining opportunities.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Agreed. The yield farming potential in this ecosystem is quite compelling. Have you reviewed the smart contract audit results?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Yes, the security audit passed with flying colors. The risk assessment indicates this is a sound investment opportunity.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Wonderful. I'm confident this partnership will prove mutually beneficial as we navigate the evolving blockchain landscape.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },

    // Jane conversation (conversation ID 2) - Trading & Market Analysis
    {
      conversationId: 2,
      senderId: 2,
      content: "Good morning! I've completed the technical analysis you requested for the BNB/USDT pair.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 5,
      content: "Excellent timing, Jane. What are your findings on the current market sentiment?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 2,
      content: "The indicators suggest a strong bullish momentum. The RSI is showing healthy levels, and volume has increased significantly.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 5,
      content: "That aligns with my fundamental analysis. The Binance Smart Chain ecosystem continues to show robust development activity.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 2,
      content: "Precisely. I recommend we execute the trading strategy we discussed. Here's my contribution to the shared trading fund.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 2,
      content: "",
      messageType: "crypto",
      cryptoAmount: "1.5",
      cryptoCurrency: "BNB",
    },
    {
      conversationId: 2,
      senderId: 5,
      content: "Thank you for the BNB contribution. I'll match it with USDT for our arbitrage opportunities.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 5,
      content: "",
      messageType: "crypto",
      cryptoAmount: "900",
      cryptoCurrency: "USDT",
    },
    {
      conversationId: 2,
      senderId: 2,
      content: "Perfect balance for our cross-chain trading strategy. The market timing couldn't be better.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 2,
      senderId: 5,
      content: "Indeed. Your expertise in identifying these market inefficiencies has been invaluable to our trading success.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },

    // G Stax conversation (conversation ID 3) - NFT & Gaming Economics
    {
      conversationId: 3,
      senderId: 3,
      content: "Hey there! Hope you're doing well. I wanted to discuss the upcoming NFT collection launch and gaming tokenomics.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 5,
      content: "Hello G Stax! I'm doing great, thank you. The gaming integration with blockchain assets is fascinating. How's the development progressing?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 3,
      content: "The play-to-earn mechanics are working beautifully. Players are earning substantial rewards through our innovative staking system.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 5,
      content: "That's impressive! The gamification of DeFi has tremendous potential. I'd like to support the ecosystem development.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 5,
      content: "",
      messageType: "crypto",
      cryptoAmount: "75",
      cryptoCurrency: "COYN",
    },
    {
      conversationId: 3,
      senderId: 3,
      content: "Wow, thank you for this generous contribution! This will help accelerate our gaming platform development significantly.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 5,
      content: "I believe in the vision you're creating. The intersection of gaming and blockchain technology represents the future of digital economies.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 3,
      senderId: 3,
      content: "Your support means everything. Here's an early access NFT from our premium collection as a token of appreciation.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },

    // Daniel conversation (conversation ID 4) - Enterprise & Institutional
    {
      conversationId: 4,
      senderId: 4,
      content: "Good afternoon! I trust you've had time to review the enterprise blockchain implementation proposal we discussed.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "Good afternoon, Daniel. Yes, I've thoroughly analyzed the proposal. The enterprise-grade security features are particularly impressive.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 4,
      content: "I'm pleased you find it compelling. The integration with existing corporate infrastructure was a key design consideration.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "Absolutely. The compliance features and audit trails make it suitable for regulated industries. Here's the first milestone payment as agreed.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "",
      messageType: "crypto",
      cryptoAmount: "500",
      cryptoCurrency: "USDT",
    },
    {
      conversationId: 4,
      senderId: 4,
      content: "Thank you for the prompt payment. I appreciate your confidence in our development capabilities.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "Your team's expertise in enterprise blockchain solutions is unmatched. I'm confident this project will set new industry standards.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 4,
      content: "We're committed to delivering exceptional results. The next phase will focus on scalability optimizations and cross-chain interoperability.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "Perfect. Let me also contribute some BTC to the development fund for the enhanced security modules.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 4,
      senderId: 5,
      content: "",
      messageType: "crypto",
      cryptoAmount: "0.001",
      cryptoCurrency: "BTC",
    },
    {
      conversationId: 4,
      senderId: 4,
      content: "Excellent! This additional funding will enable us to implement the advanced cryptographic features we discussed.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
  ];

  const insertedMessages = await db.insert(messages).values(seedMessages).returning();
  console.log(`Created ${insertedMessages.length} messages`);

  // Create wallet balances for current user (user ID 5) - 2025 market prices
  const seedBalances = [
    {
      userId: 5,
      currency: "BTC",
      balance: "0.125",
      usdValue: "12500.00",
      changePercent: "3.2",
    },
    {
      userId: 5,
      currency: "BNB",
      balance: "8.5",
      usdValue: "5100.00",
      changePercent: "1.8",
    },
    {
      userId: 5,
      currency: "USDT",
      balance: "2500.00",
      usdValue: "2500.00",
      changePercent: "0.0",
    },
    {
      userId: 5,
      currency: "COYN",
      balance: "1500.00",
      usdValue: "1275.00",
      changePercent: "4.7",
    },
  ];

  const insertedBalances = await db.insert(walletBalances).values(seedBalances).returning();
  console.log(`Created ${insertedBalances.length} wallet balances`);

  console.log("Database seeded successfully!");
}

// Run if called directly
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });

export { seedDatabase };