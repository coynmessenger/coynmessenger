import { db } from "./db";
import { users, conversations, messages, walletBalances } from "@shared/schema";

async function seedDatabase() {
  

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
  

  // Create conversations
  const seedConversations = [
    { participant1Id: 5, participant2Id: 1 },
    { participant1Id: 5, participant2Id: 2 },
    { participant1Id: 5, participant2Id: 3 },
    { participant1Id: 5, participant2Id: 4 },
  ];

  const insertedConversations = await db.insert(conversations).values(seedConversations).returning();
  

  // Create messages for Chris conversation (conversation ID 1)
  const seedMessages = [
    {
      conversationId: 1,
      senderId: 1,
      content: "Hi, how are you?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "It's going well!! How are you?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "I'm doing great, thanks.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "That's awesome! I've been working on some crypto trading lately.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Nice! How's that going for you?",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Pretty well! The market has been really interesting this year.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Yeah, I've heard Bitcoin is doing really well in 2025.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Definitely! It's around $100k now. Crazy to think about.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "That's incredible. I should probably start investing more seriously.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "You should! Here, let me send you some COYN to get started.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "",
      messageType: "crypto",
      cryptoAmount: "0.5",
      cryptoCurrency: "COYN",
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Thanks so much! That's really generous of you.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "No problem! We're all in this together.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Absolutely! This COYN Messenger app is pretty cool too.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 1,
      content: "Yeah, I love how seamless the crypto integration is.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
    {
      conversationId: 1,
      senderId: 5,
      content: "Right? Being able to send crypto directly in chat is game-changing.",
      messageType: "text",
      cryptoAmount: null,
      cryptoCurrency: null,
    },
  ];

  const insertedMessages = await db.insert(messages).values(seedMessages).returning();
  

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
  

  
}

// Run if called directly
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    
    process.exit(1);
  });

export { seedDatabase };