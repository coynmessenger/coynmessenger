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
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Image Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Style and Size Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Style</label>
              <Select value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as 'realistic' | 'artistic' | 'cartoon' | 'abstract')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">📸 Realistic</SelectItem>
                  <SelectItem value="artistic">🎨 Artistic</SelectItem>
                  <SelectItem value="cartoon">🎭 Cartoon</SelectItem>
                  <SelectItem value="abstract">🌀 Abstract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Size</label>
              <Select value={selectedSize} onValueChange={(value) => setSelectedSize(value as '1024x1024' | '1792x1024' | '1024x1792')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                  <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Prompt Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Custom Prompt</h3>
            <div className="space-y-3">
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="min-h-[100px]"
              />
              <Button
                onClick={handleCustomGenerate}
                disabled={!customPrompt.trim() || generateImageMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {generateImageMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Suggested Prompts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Suggested Prompts</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPrompts}
                disabled={isLoadingPrompts}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingPrompts ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoadingPrompts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prompts.map((prompt: string, index: number) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {prompt}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(prompt)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateImage(prompt)}
                            disabled={generateImageMutation.isPending}
                            className="h-8 w-8 p-0"
                          >
                            <Wand2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Generated Image Display */}
          {generatedImage && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Generated Image</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={generatedImage.imageUrl}
                        alt={generatedImage.prompt}
                        className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {getStyleIcon(generatedImage.style)} {generatedImage.style}
                        </Badge>
                        <Badge variant="outline">
                          {generatedImage.size}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Prompt:</strong> {generatedImage.prompt}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleUseImage}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Send to Chat
                      </Button>
                      <Button
                        variant="outline"
                        onClick={downloadImage}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        variant="outline" 
                        onClick={onClose}
                        className="w-full"
                      >
                        Close Generator
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}