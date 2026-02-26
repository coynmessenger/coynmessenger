import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { Phone, PhoneOff } from "lucide-react";
import type { User } from "@shared/schema";

interface IncomingVoiceCallModalProps {
  isOpen: boolean;
  onAnswer: () => void;
  onDecline: () => void;
  caller?: User;
}

export default function IncomingVoiceCallModal({
  isOpen,
  onAnswer,
  onDecline,
  caller
}: IncomingVoiceCallModalProps) {
  const callerName = caller?.displayName || caller?.signInName || caller?.username || "Unknown Caller";

  return (
    <Dialog open={isOpen} modal>
      <DialogContent 
        className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Incoming Voice Call from {callerName}</DialogTitle>
        
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-20 h-20 border-3 border-orange-200 dark:border-orange-700 shadow-lg animate-pulse">
                <AvatarImage src={caller?.profilePicture || ""} />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-2xl">
                  <UserAvatarIcon className="w-10 h-10 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full border-2 border-orange-300/60 dark:border-orange-500/40 animate-ping"></div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-orange-500 text-sm font-medium uppercase tracking-wide">
              Incoming Voice Call
            </p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {callerName}
            </h3>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex justify-center items-center gap-6 pt-2">
            <Button
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-red-300 dark:border-red-700"
              title="Decline"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={onAnswer}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-green-300 dark:border-green-700"
              title="Answer"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center gap-4 text-xs text-gray-400 pt-6">
            <span className="flex items-center gap-1">
              <PhoneOff className="w-3 h-3 text-red-500" /> Decline
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-green-500" /> Answer
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
