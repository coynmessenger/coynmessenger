import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GifData {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  size: number;
}

interface GifSearchResponse {
  gifs: GifData[];
  hasMore: boolean;
  offset: number;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gif: GifData) => void;
}

export function GifPicker({ isOpen, onClose, onSelectGif }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("trending");
  const [currentOffset, setCurrentOffset] = useState(0);
  const [allGifs, setAllGifs] = useState<GifData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get trending categories
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/gifs/categories"],
    queryFn: () => apiRequest("GET", "/api/gifs/categories"),
    enabled: isOpen,
  });

  const categories = categoriesData?.categories || ["trending", "reaction", "happy", "love"];

  // Search/Category GIFs
  const { data: gifsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/gifs/search", searchQuery || activeCategory, currentOffset],
    queryFn: () => {
      const query = searchQuery.trim() || activeCategory;
      return apiRequest("GET", `/api/gifs/search?q=${encodeURIComponent(query)}&limit=20&offset=${currentOffset}`);
    },
    enabled: isOpen,
  });

  // Register GIF view
  const registerViewMutation = useMutation({
    mutationFn: (gifId: string) => apiRequest("POST", "/api/gifs/view", { gifId }),
    onError: () => {
      // Silently fail - analytics not critical
    }
  });

  // Reset and load new GIFs when search/category changes
  useEffect(() => {
    if (gifsData) {
      if (currentOffset === 0) {
        setAllGifs(gifsData.gifs || []);
      } else {
        setAllGifs(prev => [...prev, ...(gifsData.gifs || [])]);
      }
      setIsLoadingMore(false);
    }
  }, [gifsData, currentOffset]);

  // Reset when switching categories or clearing search
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchQuery("");
    setCurrentOffset(0);
    setAllGifs([]);
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentOffset(0);
      setAllGifs([]);
    }, 500);
  };

  // Load more GIFs on scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !gifsData?.hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      setIsLoadingMore(true);
      setCurrentOffset(prev => prev + 20);
    }
  }, [isLoadingMore, gifsData?.hasMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Handle GIF selection
  const handleGifSelect = (gif: GifData) => {
    registerViewMutation.mutate(gif.id);
    onSelectGif(gif);
    onClose();
    
    toast({
      title: "GIF Selected",
      description: "GIF added to your message",
      duration: 2000,
    });
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentOffset(0);
    setAllGifs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">Choose a GIF</h2>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Categories */}
        {!searchQuery && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {categories.map((category: string) => (
                <Badge
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  className={`cursor-pointer whitespace-nowrap capitalize transition-all hover:scale-105 ${
                    activeCategory === category 
                      ? "bg-orange-500 hover:bg-orange-600 text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* GIF Grid */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        >
          {isLoading && currentOffset === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="text-sm text-gray-500">Loading GIFs...</p>
              </div>
            </div>
          ) : allGifs.length > 0 ? (
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allGifs.map((gif, index) => (
                  <div
                    key={`${gif.id}-${index}`}
                    className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-lg"
                    onClick={() => handleGifSelect(gif)}
                  >
                    <img
                      src={gif.preview_url || gif.url}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-end">
                      <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-white text-xs font-medium truncate">
                          {gif.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    <p className="text-sm text-gray-500">Loading more GIFs...</p>
                  </div>
                </div>
              )}

              {/* End of results */}
              {!gifsData?.hasMore && allGifs.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No more GIFs to load</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No GIFs found</p>
                <p className="text-sm text-gray-400">Try a different search term</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}