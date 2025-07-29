import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Laugh, Hand, Heart, DollarSign, TreePine, Package, UtensilsCrossed, Plane } from "lucide-react";
import coynSymbolPath from "@assets/COYN symbol_1753832719603.png";

// Define special emoji objects that can contain images
interface EmojiItem {
  type: 'text' | 'image';
  value: string;
  alt?: string;
}

const emojiCategories = {
  faces: [
    { type: 'text' as const, value: "😀" },
    { type: 'text' as const, value: "😂" },
    { type: 'text' as const, value: "🤣" },
    { type: 'text' as const, value: "😊" },
    { type: 'text' as const, value: "😍" },
    { type: 'text' as const, value: "🥰" },
    { type: 'text' as const, value: "😘" },
    { type: 'text' as const, value: "😎" },
    { type: 'text' as const, value: "🤔" },
    { type: 'text' as const, value: "😮" },
    { type: 'text' as const, value: "😤" },
    { type: 'text' as const, value: "😔" },
    { type: 'text' as const, value: "🥺" },
    { type: 'text' as const, value: "😭" },
    { type: 'text' as const, value: "😱" },
    { type: 'text' as const, value: "🤗" }
  ],
  gestures: [
    { type: 'text' as const, value: "👍" },
    { type: 'text' as const, value: "👎" },
    { type: 'text' as const, value: "👏" },
    { type: 'text' as const, value: "🙏" },
    { type: 'text' as const, value: "💪" },
    { type: 'text' as const, value: "✌️" },
    { type: 'text' as const, value: "🤝" },
    { type: 'text' as const, value: "👋" },
    { type: 'text' as const, value: "🤙" },
    { type: 'text' as const, value: "👌" },
    { type: 'text' as const, value: "🤞" },
    { type: 'text' as const, value: "🙌" },
    { type: 'text' as const, value: "👐" },
    { type: 'text' as const, value: "🤲" },
    { type: 'text' as const, value: "🫶" },
    { type: 'text' as const, value: "👊" }
  ],
  hearts: [
    { type: 'text' as const, value: "❤️" },
    { type: 'text' as const, value: "💙" },
    { type: 'text' as const, value: "💚" },
    { type: 'text' as const, value: "💛" },
    { type: 'text' as const, value: "🧡" },
    { type: 'text' as const, value: "💜" },
    { type: 'text' as const, value: "🖤" },
    { type: 'text' as const, value: "🤍" },
    { type: 'text' as const, value: "🤎" },
    { type: 'text' as const, value: "💗" },
    { type: 'text' as const, value: "💖" },
    { type: 'text' as const, value: "💕" },
    { type: 'text' as const, value: "💓" },
    { type: 'text' as const, value: "💘" },
    { type: 'text' as const, value: "💯" },
    { type: 'text' as const, value: "💋" }
  ],
  finance: [
    { type: 'image' as const, value: coynSymbolPath, alt: "COYN" },
    { type: 'text' as const, value: "💰" },
    { type: 'text' as const, value: "💸" },
    { type: 'text' as const, value: "🪙" },
    { type: 'text' as const, value: "💎" },
    { type: 'text' as const, value: "📈" },
    { type: 'text' as const, value: "📉" },
    { type: 'text' as const, value: "💳" },
    { type: 'text' as const, value: "🏦" },
    { type: 'text' as const, value: "🚀" },
    { type: 'text' as const, value: "⚡" },
    { type: 'text' as const, value: "🔥" },
    { type: 'text' as const, value: "💯" },
    { type: 'text' as const, value: "🎯" },
    { type: 'text' as const, value: "⭐" },
    { type: 'text' as const, value: "🌟" }
  ],
  nature: [
    { type: 'text' as const, value: "🌞" },
    { type: 'text' as const, value: "🌙" },
    { type: 'text' as const, value: "⭐" },
    { type: 'text' as const, value: "🌟" },
    { type: 'text' as const, value: "☀️" },
    { type: 'text' as const, value: "🌈" },
    { type: 'text' as const, value: "🔥" },
    { type: 'text' as const, value: "💧" },
    { type: 'text' as const, value: "🌸" },
    { type: 'text' as const, value: "🌺" },
    { type: 'text' as const, value: "🌻" },
    { type: 'text' as const, value: "🌹" },
    { type: 'text' as const, value: "🍀" },
    { type: 'text' as const, value: "🌿" },
    { type: 'text' as const, value: "🌱" },
    { type: 'text' as const, value: "🎄" }
  ],
  objects: [
    { type: 'text' as const, value: "🎉" },
    { type: 'text' as const, value: "🎊" },
    { type: 'text' as const, value: "🎈" },
    { type: 'text' as const, value: "🎁" },
    { type: 'text' as const, value: "🏆" },
    { type: 'text' as const, value: "🥇" },
    { type: 'text' as const, value: "🎖️" },
    { type: 'text' as const, value: "🏅" },
    { type: 'text' as const, value: "⚽" },
    { type: 'text' as const, value: "🏀" },
    { type: 'text' as const, value: "🎯" },
    { type: 'text' as const, value: "🎪" },
    { type: 'text' as const, value: "🎭" },
    { type: 'text' as const, value: "🎨" },
    { type: 'text' as const, value: "🎵" },
    { type: 'text' as const, value: "🎶" }
  ],
  food: [
    { type: 'text' as const, value: "🍕" },
    { type: 'text' as const, value: "🍔" },
    { type: 'text' as const, value: "🌮" },
    { type: 'text' as const, value: "🍝" },
    { type: 'text' as const, value: "🍜" },
    { type: 'text' as const, value: "🍱" },
    { type: 'text' as const, value: "🍣" },
    { type: 'text' as const, value: "🧀" },
    { type: 'text' as const, value: "🥓" },
    { type: 'text' as const, value: "🍎" },
    { type: 'text' as const, value: "🍌" },
    { type: 'text' as const, value: "🍓" },
    { type: 'text' as const, value: "🥑" },
    { type: 'text' as const, value: "🍰" },
    { type: 'text' as const, value: "🍦" },
    { type: 'text' as const, value: "☕" }
  ],
  travel: [
    { type: 'text' as const, value: "✈️" },
    { type: 'text' as const, value: "🚗" },
    { type: 'text' as const, value: "🚢" },
    { type: 'text' as const, value: "🏖️" },
    { type: 'text' as const, value: "🏔️" },
    { type: 'text' as const, value: "🗽" },
    { type: 'text' as const, value: "🏛️" },
    { type: 'text' as const, value: "🎡" },
    { type: 'text' as const, value: "🎢" },
    { type: 'text' as const, value: "🌍" },
    { type: 'text' as const, value: "🗺️" },
    { type: 'text' as const, value: "🧳" },
    { type: 'text' as const, value: "📸" },
    { type: 'text' as const, value: "🎒" },
    { type: 'text' as const, value: "🏨" },
    { type: 'text' as const, value: "🎫" }
  ]
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

// Helper function to handle emoji selection
const handleEmojiClick = (emojiItem: EmojiItem, onEmojiSelect: (emoji: string) => void) => {
  if (emojiItem.type === 'image') {
    // For COYN symbol, insert a placeholder that can be converted to the image
    onEmojiSelect('🪙COYN');
  } else {
    onEmojiSelect(emojiItem.value);
  }
};

export function EmojiPicker({ onEmojiSelect, isOpen, onOpenChange }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof emojiCategories>("faces");

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 backdrop-blur-sm transition-all duration-300 rounded-xl h-7 w-7 sm:h-8 sm:w-8 touch-manipulation ${
            isOpen 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'text-gray-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Smile className="h-4 w-4 sm:h-4 sm:w-4" />
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
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
                title={category.charAt(0).toUpperCase() + category.slice(1)}
              >
                {getEmojiCategoryIcon(category)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-8 gap-0.5">
            {emojiCategories[selectedCategory].map((emojiItem, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleEmojiClick(emojiItem, onEmojiSelect)}
                className="text-lg hover:bg-blue-100 dark:hover:bg-slate-700 rounded p-1.5 transition-colors duration-200 hover:scale-110 active:scale-95 flex items-center justify-center h-8 w-8"
                title={emojiItem.type === 'image' ? (emojiItem.alt || 'COYN') : emojiItem.value}
              >
                {emojiItem.type === 'image' ? (
                  <img 
                    src={emojiItem.value} 
                    alt={emojiItem.alt || 'COYN'} 
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  emojiItem.value
                )}
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