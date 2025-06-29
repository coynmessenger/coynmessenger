import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import type { User } from "@shared/schema";

interface TypingIndicatorProps {
  typingUsers: User[];
  className?: string;
}

export default function TypingIndicator({ typingUsers, className = "" }: TypingIndicatorProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (typingUsers.length === 0) return;

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === "...") return ".";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [typingUsers.length]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName || typingUsers[0].username} is typing${dots}`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName || typingUsers[0].username} and ${typingUsers[1].displayName || typingUsers[1].username} are typing${dots}`;
    } else {
      return `${typingUsers.length} people are typing${dots}`;
    }
  };

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 bg-muted/30 ${className}`}>
      <div className="flex -space-x-2">
        {typingUsers.slice(0, 3).map((user, index) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.profilePicture || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 dark:from-cyan-400 dark:to-cyan-600 text-white text-xs">
              <UserAvatarIcon className="w-3 h-3" />
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground italic">
          {getTypingText()}
        </p>
        
        {/* Animated typing dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" 
               style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" 
               style={{ animationDelay: '160ms', animationDuration: '1.4s' }}></div>
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" 
               style={{ animationDelay: '320ms', animationDuration: '1.4s' }}></div>
        </div>
      </div>
    </div>
  );
}