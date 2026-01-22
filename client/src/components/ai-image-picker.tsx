import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, X, Loader2, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageData: string;
}

interface AiImagePickerProps {
  onImageSelect: (image: { prompt: string; imageData: string }) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiImagePicker({ onImageSelect, isOpen, onOpenChange }: AiImagePickerProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateImage = async (imagePrompt: string) => {
    if (!imagePrompt.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/generate-image", {
        prompt: imagePrompt,
        size: "512x512",
        count: 2,
        varied: true
      });
      
      if (response.images && response.images.length > 0) {
        const newImages: GeneratedImage[] = response.images.map((img: { b64_json?: string; url?: string }, index: number) => ({
          id: `ai_${Date.now()}_${index}`,
          prompt: imagePrompt,
          imageData: img.b64_json ? `data:image/png;base64,${img.b64_json}` : img.url
        }));
        setGeneratedImages(prev => [...newImages, ...prev]);
        setPrompt("");
      } else {
        throw new Error("No image data received");
      }
    } catch (err: any) {
      console.error("Failed to generate image:", err);
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateImage(prompt);
  };

  const handleImageClick = (image: GeneratedImage) => {
    onImageSelect({ prompt: image.prompt, imageData: image.imageData });
    onOpenChange(false);
  };

  const clearHistory = () => {
    setGeneratedImages([]);
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`backdrop-blur-sm transition-all duration-300 rounded-xl h-8 w-8 sm:h-8 sm:w-8 touch-manipulation ${
            isOpen 
              ? 'bg-purple-500 text-white shadow-md' 
              : 'text-gray-500 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-gray-100/50 dark:hover:bg-slate-700/50'
          }`}
          title="Generate AI Image"
        >
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 h-[420px] p-0 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Image Generator
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Prompt Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Describe your image..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="h-9 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-purple-400 dark:focus:border-purple-400 rounded-lg flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !prompt.trim()}
                className="h-9 px-3 bg-purple-500 hover:bg-purple-600 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                  <Sparkles className="h-4 w-4 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Creating your image...</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">This may take a moment</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-4">
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError(null)}
                  className="text-xs"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Generated Images Grid */}
          {!loading && !error && (
            <div className="flex-1 overflow-hidden">
              {generatedImages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-4">
                    <Sparkles className="h-12 w-12 text-purple-300 dark:text-purple-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">No images yet</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Describe what you want to create</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {generatedImages.length} image{generatedImages.length !== 1 ? 's' : ''} generated
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-6 px-2 text-xs text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <ScrollArea className="h-[calc(100%-32px)]">
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {generatedImages.map((image) => (
                        <button
                          key={image.id}
                          onClick={() => handleImageClick(image)}
                          className="relative aspect-square bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 group"
                        >
                          <img
                            src={image.imageData}
                            alt={image.prompt}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-end">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 w-full">
                              <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
                            </div>
                          </div>
                          <div className="absolute top-1 right-1">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-purple-500/90 text-white border-0">
                              AI
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
