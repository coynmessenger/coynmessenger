import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, Copy, RefreshCw, Wand2, Image as ImageIcon, Download, Loader2 } from "lucide-react";

interface AIImageGeneration {
  id: string;
  prompt: string;
  imageUrl: string;
  style: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
  size: '1024x1024' | '1792x1024' | '1024x1792';
}

interface AIImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  userId: number;
  onSelectImage: (imageUrl: string, prompt: string) => void;
  context?: string;
}

export function AIImageGenerator({ 
  isOpen, 
  onClose, 
  conversationId, 
  userId, 
  onSelectImage,
  context 
}: AIImageGeneratorProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<'realistic' | 'artistic' | 'cartoon' | 'abstract'>('realistic');
  const [selectedSize, setSelectedSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [generatedImage, setGeneratedImage] = useState<AIImageGeneration | null>(null);
  const { toast } = useToast();

  // Get AI image prompt suggestions
  const { data: promptData, isLoading: isLoadingPrompts, refetch } = useQuery({
    queryKey: ["ai-image-prompts", conversationId, userId],
    queryFn: () => apiRequest("POST", "/api/ai/image-prompts", { 
      conversationId, 
      userId, 
      context 
    }),
    enabled: isOpen
  });

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return apiRequest("POST", "/api/ai/generate-image", { 
        prompt, 
        style: selectedStyle,
        size: selectedSize
      });
    },
    onSuccess: (data: AIImageGeneration) => {
      setGeneratedImage(data);
      toast({
        title: "Image Generated!",
        description: "Your AI image has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive"
      });
    }
  });

  const prompts = promptData?.prompts || [];

  const handleGenerateImage = (prompt: string) => {
    generateImageMutation.mutate(prompt);
  };

  const handleCustomGenerate = () => {
    if (customPrompt.trim()) {
      handleGenerateImage(customPrompt.trim());
    }
  };

  const handleUseImage = () => {
    if (generatedImage) {
      onSelectImage(generatedImage.imageUrl, generatedImage.prompt);
      // Don't close the modal - let user continue generating images
      toast({
        title: "Image Sent!",
        description: "Image sent to chat. You can generate more images.",
      });
    }
  };

  const handleRefreshPrompts = () => {
    refetch();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard",
    });
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage.imageUrl;
      link.download = `ai-generated-${generatedImage.id}.png`;
      link.click();
    }
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'realistic': return '📸';
      case 'artistic': return '🎨';
      case 'cartoon': return '🎭';
      case 'abstract': return '🌀';
      default: return '🖼️';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-2xl w-[95vw] sm:w-auto h-[90dvh] sm:max-h-[85vh] overflow-hidden flex flex-col m-2 sm:m-auto p-3 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-3">
          <DialogTitle className="flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="hidden sm:inline">AI Image Generator</span>
              <span className="sm:hidden">AI Generator</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Select value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as any)}>
                <SelectTrigger className="w-20 sm:w-28 h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">📸 Real</SelectItem>
                  <SelectItem value="artistic">🎨 Art</SelectItem>
                  <SelectItem value="cartoon">🎭 Cartoon</SelectItem>
                  <SelectItem value="abstract">🌀 Abstract</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as any)}>
                <SelectTrigger className="w-16 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square</SelectItem>
                  <SelectItem value="1792x1024">Wide</SelectItem>
                  <SelectItem value="1024x1792">Tall</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Generated Image Display - Priority Position */}
          {generatedImage && (
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <img
                      src={generatedImage.imageUrl}
                      alt={generatedImage.prompt}
                      className="w-24 h-24 object-cover rounded-lg shadow-md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {generatedImage.prompt}
                    </p>
                    <div className="flex gap-1 mb-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        {getStyleIcon(generatedImage.style)}
                      </Badge>
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                        {generatedImage.size.split('x')[0]}×{generatedImage.size.split('x')[1]}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        onClick={handleUseImage}
                        size="sm"
                        className="flex-1 h-7 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                      >
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadImage}
                        className="h-7 px-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Prompt Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe your image..."
                className="flex-1 min-h-[50px] sm:min-h-[60px] text-sm resize-none"
                rows={2}
              />
              <Button
                onClick={handleCustomGenerate}
                disabled={!customPrompt.trim() || generateImageMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-2 sm:px-3 h-auto self-start"
              >
                {generateImageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Compact Suggested Prompts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Quick Ideas</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshPrompts}
                disabled={isLoadingPrompts}
                className="h-8 px-2 touch-manipulation"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoadingPrompts ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid gap-2">
                {prompts.slice(0, 4).map((prompt: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 sm:p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors touch-manipulation">
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex-1 line-clamp-2">
                      {prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(prompt)}
                        className="h-8 w-8 p-0 touch-manipulation"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateImage(prompt)}
                        disabled={generateImageMutation.isPending}
                        className="h-8 w-8 p-0 touch-manipulation"
                      >
                        <Wand2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline" 
            onClick={onClose}
            className="w-full h-10 sm:h-8 text-sm sm:text-xs touch-manipulation"
          >
            Close Generator
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}