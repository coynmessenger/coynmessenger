import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Gif {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  size: number;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gif: Gif) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ isOpen, onClose, onSelectGif }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('trending');
  const [allGifs, setAllGifs] = useState<Gif[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [hoveredGif, setHoveredGif] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/gifs/categories'],
    enabled: isOpen,
  });

  const categories = (categoriesData as any)?.categories || ['trending', 'reaction', 'happy', 'love', 'sad'];

  // Fetch GIFs
  const { data: gifsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/gifs/search', debouncedQuery, activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '20',
        offset: '0'
      });
      
      if (debouncedQuery.trim()) {
        params.append('q', debouncedQuery);
      } else if (activeCategory) {
        params.append('category', activeCategory);
      } else {
        params.append('q', 'trending');
      }

      const response = await fetch(`/api/gifs/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch GIFs');
      return response.json();
    },
    enabled: isOpen,
  });

  // Reset GIFs when query or category changes
  useEffect(() => {
    if (gifsData?.gifs) {
      setAllGifs(gifsData.gifs);
      setHasMore(gifsData.hasMore);
      setNextOffset(gifsData.offset || gifsData.gifs.length);
    }
  }, [gifsData]);

  // Load more GIFs for infinite scroll
  const loadMoreGifs = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: nextOffset.toString()
      });
      
      if (debouncedQuery.trim()) {
        params.append('q', debouncedQuery);
      } else if (activeCategory) {
        params.append('category', activeCategory);
      } else {
        params.append('q', 'trending');
      }

      const response = await fetch(`/api/gifs/search?${params}`);
      if (!response.ok) throw new Error('Failed to fetch more GIFs');
      
      const moreData = await response.json();
      setAllGifs(prev => [...prev, ...moreData.gifs]);
      setHasMore(moreData.hasMore);
      setNextOffset(moreData.offset || nextOffset + moreData.gifs.length);
    } catch (error) {
      console.error('Error loading more GIFs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextOffset, debouncedQuery, activeCategory]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreGifs();
    }
  }, [loadMoreGifs]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory('trending');
      setAllGifs([]);
      setNextOffset(0);
      setHasMore(true);
    }
  }, [isOpen]);

  const handleGifSelect = (gif: Gif) => {
    onSelectGif(gif);
    onClose();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveCategory('trending');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-cyan-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 backdrop-blur-xl border-orange-200/50 dark:border-gray-600/50 shadow-2xl">
        {/* Enhanced Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-pink-400/20 to-cyan-400/20 animate-pulse"></div>
          <div className="relative flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-600/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 dark:from-orange-400 dark:to-pink-400 bg-clip-text text-transparent">
                  GIF Gallery
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">Choose the perfect GIF for your message</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/20 dark:bg-gray-700/50 backdrop-blur-sm hover:bg-white/30 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-600/30 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-cyan-400/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <Input
                placeholder="Search for the perfect GIF..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveCategory(''); // Clear category when searching
                }}
                className="pl-12 pr-12 h-12 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 focus:border-orange-400/70 dark:focus:border-orange-400/70 rounded-xl shadow-lg text-lg transition-all duration-300 focus:shadow-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-gray-200/50 dark:bg-gray-600/50 backdrop-blur-sm hover:bg-gray-300/50 dark:hover:bg-gray-500/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Categories */}
        {!searchQuery && (
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-600/30 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
            <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-300/50 dark:scrollbar-thumb-gray-500/50 pb-2">
              {categories.map((category: string) => (
                <Badge
                  key={category}
                  variant={activeCategory === category ? "default" : "outline"}
                  className={`cursor-pointer whitespace-nowrap capitalize text-sm px-4 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                    activeCategory === category
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg border-0'
                      : 'bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm hover:bg-orange-100/80 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-300 border-gray-300/50 dark:border-gray-500/50 hover:border-orange-300 dark:hover:border-orange-400'
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced GIFs Grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50/50 via-white/30 to-gray-100/50 dark:from-gray-900/50 dark:via-gray-800/30 dark:to-gray-700/50 backdrop-blur-sm"
          style={{ scrollbarWidth: 'thin' }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full animate-ping opacity-20"></div>
                <Loader2 className="h-12 w-12 animate-spin text-orange-500 relative z-10" />
              </div>
              <div className="text-center">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Finding amazing GIFs...</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This won't take long!</p>
              </div>
            </div>
          ) : allGifs.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {allGifs.map((gif) => (
                  <div
                    key={gif.id}
                    className="relative group aspect-square bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-gray-200/50 dark:border-gray-600/50 hover:border-orange-300/70 dark:hover:border-orange-400/70"
                    onClick={() => handleGifSelect(gif)}
                    onMouseEnter={() => setHoveredGif(gif.id)}
                    onMouseLeave={() => setHoveredGif(null)}
                  >
                    <img
                      src={gif.preview_url}
                      alt={gif.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
                      hoveredGif === gif.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium truncate">
                          {gif.title}
                        </p>
                      </div>
                    </div>
                    <div className={`absolute top-2 right-2 transition-all duration-300 ${
                      hoveredGif === gif.id ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                    }`}>
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-1.5">
                        <Sparkles className="h-4 w-4 text-orange-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Enhanced Load More Indicator */}
              {isLoadingMore && (
                <div className="flex items-center justify-center mt-8 py-6">
                  <div className="flex items-center space-x-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Loading more amazing GIFs...</span>
                  </div>
                </div>
              )}
              
              {!hasMore && allGifs.length > 0 && (
                <div className="text-center mt-8 py-6">
                  <div className="bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 backdrop-blur-sm rounded-2xl p-6 border border-orange-200/50 dark:border-orange-600/30">
                    <span className="text-4xl mb-3 block">🎉</span>
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">That's all the GIFs we have!</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You've seen our entire collection</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 backdrop-blur-sm rounded-3xl p-8 border border-orange-200/50 dark:border-orange-600/30">
                <span className="text-6xl mb-4 block">🔍</span>
                <span className="text-xl font-medium text-gray-700 dark:text-gray-300 block">No GIFs found</span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try a different search term or category</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};