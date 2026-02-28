import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Laugh, Hand, Heart, DollarSign, TreePine, Package, UtensilsCrossed, Plane } from "lucide-react";

const emojiCategories = {
  faces: ["😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔", "😮", "😤", "😔", "🥺", "😭", "😱", "🤗"],
  gestures: ["👍", "👎", "👏", "🙏", "💪", "✌️", "🤝", "👋", "🤙", "👌", "🤞", "🙌", "👐", "🤲", "🫶", "👊"],
  hearts: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💗", "💖", "💕", "💓", "💘", "💯", "💋"],
  finance: ["💰", "💸", "🪙", "💎", "📈", "📉", "💳", "🏦", "🚀", "⚡", "🔥", "💯", "🎯", "⭐", "🌟", "🎉"],
  nature: ["🌞", "🌙", "⭐", "🌟", "☀️", "🌈", "🔥", "💧", "🌸", "🌺", "🌻", "🌹", "🍀", "🌿", "🌱", "🎄"],
  objects: ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎖️", "🏅", "⚽", "🏀", "🎯", "🎪", "🎭", "🎨", "🎵", "🎶"],
  food: ["🍕", "🍔", "🌮", "🍝", "🍜", "🍱", "🍣", "🧀", "🥓", "🍎", "🍌", "🍓", "🥑", "🍰", "🍦", "☕"],
  travel: ["✈️", "🚗", "🚢", "🏖️", "🏔️", "🗽", "🏛️", "🎡", "🎢", "🌍", "🗺️", "🧳", "📸", "🎒", "🏨", "🎫"]
};

const getEmojiCategoryIcon = (category: string) => {
  const icons = {
    faces: <Laugh className="w-4 h-4" />,
    gestures: <Hand className="w-4 h-4" />,
    hearts: <Heart className="w-4 h-4" />,
    finance: <DollarSign className="w-4 h-4" />,
    nature: <TreePine className="w-4 h-4" />,
    objects: <Package className="w-4 h-4" />,
    food: <UtensilsCrossed className="w-4 h-4" />,
    travel: <Plane className="w-4 h-4" />
  };
  return icons[category as keyof typeof icons] || <Smile className="w-4 h-4" />;
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmojiPicker({ onEmojiSelect, isOpen, onOpenChange }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof emojiCategories>("faces");

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`transition-all duration-200 rounded-xl h-6 w-6 touch-manipulation shrink-0 ${
            isOpen 
              ? 'bg-orange-500 text-white shadow-sm' 
              : 'text-gray-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-100/60 dark:hover:bg-orange-500/10'
          }`}
        >
          <Smile className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm">Emojis</h3>
          
          <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-slate-700 pb-2">
            {Object.keys(emojiCategories).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category as keyof typeof emojiCategories)}
                className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                  selectedCategory === category
                    ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                    : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {getEmojiCategoryIcon(category)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-0.5">
            {emojiCategories[selectedCategory].map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onEmojiSelect(emoji)}
                className="text-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded p-1.5 transition-colors duration-200 hover:scale-110 active:scale-95 flex items-center justify-center h-8 w-8"
              >
                {emoji}
              </button>
            ))}
          </div>
          
          <div className="pt-1.5 border-t border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Tip: You can also type emojis directly!
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}