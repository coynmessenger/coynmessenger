import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import ChatWindow from "@/components/chat-window";
import WalletModal from "@/components/wallet-modal";
import VideoCallModal from "@/components/video-call-modal";
import type { User, Conversation, Message } from "@shared/schema";
import { Home } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

export default function MessengerPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User; lastMessage?: Message })[]>({
    queryKey: ["/api/conversations"],
  });

  // Keep messenger open to contact list view by default

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Layout - Full Page Content */}
      <div className="hidden lg:flex lg:flex-col lg:w-full lg:h-screen">
        {/* Header */}
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={coynLogoPath} 
              alt="COYN Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-normal text-primary" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
              Messenger
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-muted"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
        </div>

        {/* Full Page Sidebar Content */}
        <Sidebar
          user={user}
          conversations={searchQuery ? filteredConversations : conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          isOpen={false}
          onClose={() => {}}
          onOpenWallet={() => setIsWalletOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Mobile Layout - Full Page Content */}
      <div className="lg:hidden flex flex-col w-full h-screen">
        {/* Mobile Header */}
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={coynLogoPath} 
              alt="COYN Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-normal text-primary" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
              Messenger
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-muted"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Full Page Sidebar Content */}
        <Sidebar
          user={user}
          conversations={searchQuery ? filteredConversations : conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          isOpen={false}
          onClose={() => {}}
          onOpenWallet={() => setIsWalletOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Modals */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        otherUser={currentConversation?.otherUser}
      />
    </div>
  );
}
