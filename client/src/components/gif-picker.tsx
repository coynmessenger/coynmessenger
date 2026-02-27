import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2 } from "lucide-react";

const GIPHY_PROXY_URL = '/api/giphy';

interface GifData {
  id: string;
  title: string;
  images: {
    fixed_height_small: {
      url: string;
      width: string;
      height: string;
    };
    original: {
      url: string;
      width: string;
      height: string;
    };
  };
}

interface GifPickerProps {
  onGifSelect: (gif: GifData) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GifPicker({ onGifSelect, isOpen, onOpenChange }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("trending");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const categories = [
    { id: "trending", label: "Trending", emoji: "🔥" },
    { id: "reactions", label: "Reactions", emoji: "😀" },
    { id: "animals", label: "Animals", emoji: "🐱" },
    { id: "sports", label: "Sports", emoji: "⚽" },
    { id: "entertainment", label: "TV & Movies", emoji: "🎬" },
    { id: "stickers", label: "Stickers", emoji: "✨" }
  ];

  const fetchGifs = async (query: string = "", category: string = "trending") => {
    setLoading(true);
    setError(null);
    
    try {
      let url = "";
      
      if (query.trim()) {
        url = `${GIPHY_PROXY_URL}/search?q=${encodeURIComponent(query)}&limit=20`;
      } else if (category === "trending") {
        url = `${GIPHY_PROXY_URL}/trending?limit=20`;
      } else {
        url = `${GIPHY_PROXY_URL}/search?q=${encodeURIComponent(category)}&limit=20`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data) {
        setGifs(data.data);
      } else {
        setGifs([]);
      }
    } catch (err) {

      setError('Failed to load GIFs. Please try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  // Load initial trending GIFs when component mounts
  useEffect(() => {
    if (isOpen) {
      fetchGifs("", selectedCategory);
    }
  }, [isOpen, selectedCategory]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchGifs(searchQuery);
      }, 500);
    } else {
      fetchGifs("", selectedCategory);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedCategory]);

  const handleGifClick = (gif: GifData) => {
    onGifSelect(gif);
    onOpenChange(false);
    setSearchQuery("");
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery("");
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={`transition-all duration-200 rounded-xl h-8 px-2 touch-manipulation shrink-0 font-bold tracking-tight text-xs ${
            isOpen 
              ? 'bg-orange-500 text-white shadow-sm' 
              : 'text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-100/60 dark:hover:bg-orange-500/10'
          }`}
        >
          GIF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 h-96 p-0 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm">GIFs</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Search GIFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-4 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-orange-400 dark:focus:border-orange-400 rounded-lg"
              />
            </div>
          </div>

          {/* Categories */}
          {!searchQuery.trim() && (
            <div className="p-2 border-b border-gray-200 dark:border-slate-700">
              <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleCategoryChange(category.id)}
                    className={`flex-shrink-0 h-8 w-8 p-0 text-xs font-medium transition-all duration-200 ${
                      selectedCategory === category.id
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }`}
                    title={category.label}
                  >
                    {category.emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* GIFs Grid */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">Loading GIFs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-red-500 mb-2">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchGifs(searchQuery, selectedCategory)}
                    className="text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">No GIFs found</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Try a different search term</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-2 gap-1 p-2">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => handleGifClick(gif)}
                      className="relative aspect-square bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 group"
                    >
                      <img
                        src={gif.images.fixed_height_small.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Badge variant="secondary" className="text-xs px-2 py-1 bg-white/90 text-gray-800">
                            GIF
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>


        </div>
      </PopoverContent>
    </Popover>
  );
}