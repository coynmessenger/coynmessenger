import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Copy, RefreshCw, Wand2, MessageSquare } from "lucide-react";

interface AIMessageSuggestion {
  message: string;
  tone: 'casual' | 'professional' | 'friendly' | 'formal';
  category: 'response' | 'question' | 'greeting' | 'followup';
}

interface AIChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  userId: number;
  onSelectMessage: (message: string) => void;
  context?: string;
}

export function AIChatAssistant({ 
  isOpen, 
  onClose, 
  conversationId, 
  userId, 
  onSelectMessage,
  context 
}: AIChatAssistantProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const { toast } = useToast();

  // Get AI suggestions
  const { data: aiData, isLoading: isLoadingSuggestions, refetch } = useQuery({
    queryKey: ["ai-suggestions", conversationId, userId],
    queryFn: () => apiRequest("POST", "/api/ai/suggestions", { 
      conversationId, 
      userId, 
      context 
    }),
    enabled: isOpen
  });

  // Generate smart reply mutation
  const smartReplyMutation = useMutation({
    mutationFn: async (originalMessage: string) => {
      return apiRequest("POST", "/api/ai/smart-reply", { 
        originalMessage, 
        conversationContext: context 
      });
    },
    onSuccess: (data) => {
      if (data.reply) {
        setSelectedSuggestion(data.reply);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate smart reply",
        variant: "destructive"
      });
    }
  });

  const suggestions = aiData?.suggestions || [];

  const handleUseMessage = (message: string) => {
    onSelectMessage(message);
    onClose();
    toast({
      title: "Message Added",
      description: "AI suggestion has been added to your message",
    });
  };

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleRefreshSuggestions = () => {
    refetch();
  };

  const handleGenerateSmartReply = () => {
    if (!customPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message to generate a reply for",
        variant: "destructive"
      });
      return;
    }
    smartReplyMutation.mutate(customPrompt);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'casual': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'friendly': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'formal': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'response': return <MessageSquare className="w-3 h-3" />;
      case 'question': return <Wand2 className="w-3 h-3" />;
      case 'greeting': return <Sparkles className="w-3 h-3" />;
      case 'followup': return <RefreshCw className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            AI Chat Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Smart Suggestions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshSuggestions}
                disabled={isLoadingSuggestions}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingSuggestions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion: AIMessageSuggestion, index: number) => (
                  <Card key={index} className="border-2 hover:border-orange-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getCategoryIcon(suggestion.category)}
                            <Badge variant="outline" className={getToneColor(suggestion.tone)}>
                              {suggestion.tone}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {suggestion.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {suggestion.message}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUseMessage(suggestion.message)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyMessage(suggestion.message)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Custom Smart Reply Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Smart Reply</h3>
            <div className="space-y-3">
              <Textarea
                placeholder="Enter a message to generate a smart reply for..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                onClick={handleGenerateSmartReply}
                disabled={smartReplyMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {smartReplyMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Smart Reply
                  </>
                )}
              </Button>
            </div>

            {selectedSuggestion && (
              <Card className="border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-orange-700 dark:text-orange-300">
                          Generated Reply
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedSuggestion}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUseMessage(selectedSuggestion)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyMessage(selectedSuggestion)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}