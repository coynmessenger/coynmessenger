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
        className="sm:max-w-[320px] bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Incoming Voice Call from {callerName}</DialogTitle>
        
        <div className="p-6 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-20 h-20 border-3 border-orange-500/50 shadow-lg animate-pulse">
                <AvatarImage src={caller?.profilePicture || ""} />
                <AvatarFallback className="bg-slate-700 text-2xl">
                  <UserAvatarIcon className="w-10 h-10 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full border-2 border-orange-400/60 animate-ping"></div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-orange-400 text-sm font-medium uppercase tracking-wide">
              Incoming Voice Call
            </p>
            <h3 className="text-xl font-bold text-white truncate">
              {callerName}
            </h3>
          </div>

          <div className="flex justify-center items-center gap-6 pt-2">
            <Button
              onClick={onDecline}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-red-400"
              title="Decline"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            <Button
              onClick={onAnswer}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center border-2 border-green-400"
              title="Answer"
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <PhoneOff className="w-3 h-3 text-red-400" /> Decline
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-green-400" /> Answer
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
