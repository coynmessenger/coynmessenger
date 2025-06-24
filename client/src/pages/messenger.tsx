import { useState } from "react";
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
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User; lastMessage?: Message })[]>({
    queryKey: ["/api/conversations"],
  });

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-50">
      {/* Top Header with Return to Home */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={coynLogoPath} 
            alt="COYN Logo" 
            className="w-8 h-8"
          />
          <div className="text-xl font-bold text-cyan-400">COYN Messenger</div>
        </div>
        <Button
          onClick={() => setLocation("/")}
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700"
        >
          <Home className="h-4 w-4 mr-2" />
          Return to Home
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Mobile Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 z-50 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-cyan-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
              />
            </div>
            <button 
              className="text-slate-400 hover:text-cyan-400 transition-colors"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="fixed top-16 left-0 right-0 bg-slate-800 border-b border-slate-700 p-4 z-40 lg:hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sidebar */}
        <Sidebar
          user={user}
          conversations={searchQuery ? filteredConversations : conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenWallet={() => setIsWalletOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col pt-16 lg:pt-0 bg-slate-900">
        {selectedConversation && currentConversation ? (
          <ChatWindow
            conversation={currentConversation}
            onOpenVideoCall={() => setIsVideoCallOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-900">
            <div className="text-center text-slate-400">
              <div className="mx-auto mb-4">
                <img 
                  src={coynLogoPath} 
                  alt="COYN Logo" 
                  className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to COYN Messenger</h2>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modals */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        otherUser={currentConversation?.otherUser}
      />

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
