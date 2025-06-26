import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import ChatWindow from "@/components/chat-window";
import WalletModal from "@/components/wallet-modal";
import VideoCallModal from "@/components/video-call-modal";
import type { User, Conversation, Message } from "@shared/schema";
import { Home, ArrowLeft } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

export default function MessengerPage() {
  const params = useParams();
  const conversationId = params.conversationId ? parseInt(params.conversationId) : null;
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

  const currentConversation = conversations.find(c => c.id === conversationId);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationSelect = (id: number) => {
    setLocation(`/messenger/${id}`);
  };

  // If we have a conversation ID, show the individual chat view
  if (conversationId && currentConversation) {
    return (
      <div className="flex h-screen bg-background text-foreground">
        <div className="flex flex-col w-full h-screen">
          {/* Chat Header */}
          <div className="bg-card border-b border-border p-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation("/messenger")}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <img 
                src={currentConversation.otherUser.profilePicture || coynLogoPath} 
                alt={currentConversation.otherUser.displayName}
                className="w-8 h-8 rounded-full"
              />
              <h1 className="text-xl font-normal text-primary" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
                {currentConversation.otherUser.displayName}
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

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            <ChatWindow
              conversation={currentConversation}
              onOpenVideoCall={() => setIsVideoCallOpen(true)}
              onToggleSidebar={() => {}}
            />
          </div>
        </div>

        {/* Modals */}
        <WalletModal 
          isOpen={isWalletOpen} 
          onClose={() => setIsWalletOpen(false)} 
        />
        
        <VideoCallModal 
          isOpen={isVideoCallOpen} 
          onClose={() => setIsVideoCallOpen(false)} 
          otherUser={currentConversation.otherUser}
        />
      </div>
    );
  }

  // Main messenger page - show conversations list as the primary interface
  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex flex-col w-full h-screen">
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

        {/* Main Content - Full Width Conversations List */}
        <div className="flex-1">
          <Sidebar
            user={user}
            conversations={searchQuery ? filteredConversations : conversations}
            selectedConversation={conversationId}
            onSelectConversation={handleConversationSelect}
            isOpen={false}
            onClose={() => {}}
            onOpenWallet={() => setIsWalletOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Modals */}
      <WalletModal 
        isOpen={isWalletOpen} 
        onClose={() => setIsWalletOpen(false)} 
      />
      
      <VideoCallModal 
        isOpen={isVideoCallOpen} 
        onClose={() => setIsVideoCallOpen(false)} 
        otherUser={user}
      />
    </div>
  );
}