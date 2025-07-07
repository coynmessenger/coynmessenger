import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Image } from "lucide-react";

const mockGifs = {
  trending: [
    { id: 1, url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", title: "Hello Wave" },
    { id: 2, url: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif", title: "Thank You" },
    { id: 3, url: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif", title: "Good Morning" },
    { id: 4, url: "https://media.giphy.com/media/l0MYP6WAFfaR7Q1jO/giphy.gif", title: "Thumbs Up" },
    { id: 5, url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Goodbye" },
    { id: 6, url: "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif", title: "See You Later" }
  ],
  reactions: [
    { id: 7, url: "https://media.giphy.com/media/l0MYzxkg0o1tkGSaI/giphy.gif", title: "OMG Surprised" },
    { id: 8, url: "https://media.giphy.com/media/26tn6jEVRIelPhdJC/giphy.gif", title: "Mind Blown" },
    { id: 9, url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Love Heart" },
    { id: 10, url: "https://media.giphy.com/media/l0MYzxkg0o1tkGSaI/giphy.gif", title: "LOL Laughing" },
    { id: 14, url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", title: "Wow Amazing" },
    { id: 15, url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", title: "Funny Reaction" }
  ],
  celebration: [
    { id: 11, url: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif", title: "Party Time" },
    { id: 12, url: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif", title: "Success Dance" },
    { id: 13, url: "https://media.giphy.com/media/l0MYP6WAFfaR7Q1jO/giphy.gif", title: "Winner Champion" },
    { id: 16, url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", title: "Congratulations" },
    { id: 17, url: "https://media.giphy.com/media/3o6fIShUdNpuOaWWha/giphy.gif", title: "Great Job" },
    { id: 18, url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif", title: "Awesome Win" }
  ]
};

const contextKeywords = {
  celebration: ['congrats', 'celebrate', 'party', 'win', 'success', 'achievement', 'great', 'awesome', 'amazing'],
  reactions: ['wow', 'omg', 'surprised', 'shocked', 'funny', 'lol', 'haha', 'laugh'],
  trending: ['hello', 'hi', 'goodbye', 'bye', 'thanks', 'thank you', 'morning', 'evening']
};

interface GifPickerProps {
  onGifSelect: (gif: any) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMessage?: string;
}

export function GifPicker({ onGifSelect, isOpen, onOpenChange, currentMessage = "" }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getContextualGifs = () => {
    const messageText = currentMessage.toLowerCase();
    let bestCategory = 'trending';
    let maxMatches = 0;
    
    Object.entries(contextKeywords).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => messageText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    });
    
    return mockGifs[bestCategory as keyof typeof mockGifs] || mockGifs.trending;
  };

  const getFilteredGifs = () => {
    if (!searchQuery.trim()) {
      return getContextualGifs();
    }
    
    const allGifs = [...mockGifs.trending, ...mockGifs.reactions, ...mockGifs.celebration];
    return allGifs.filter(gif => 
      gif.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-orange-400 h-8 w-8 sm:h-8 sm:w-8 touch-manipulation"
        >
          <Image className="h-4 w-4 sm:h-4 sm:w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm">GIFs</h3>
            {!searchQuery.trim() && (
              <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                ✨ Smart suggestions
              </span>
            )}
          </div>
          
          <div className="relative">
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-orange-400 dark:focus:border-orange-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {getFilteredGifs().map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onGifSelect(gif)}
                className="relative aspect-square bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors group"
              >
                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
                  <span className="text-xs text-gray-600 dark:text-slate-300 text-center p-2 group-hover:text-orange-600 dark:group-hover:text-orange-300">
                    {gif.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
          
          <div className="pt-1.5 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {getFilteredGifs().length} GIFs {searchQuery.trim() ? 'found' : 'suggested'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}