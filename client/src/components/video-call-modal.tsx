import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";
import { Mic, Video, PhoneOff, Monitor } from "lucide-react";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser?: User;
}

export default function VideoCallModal({ isOpen, onClose, otherUser }: VideoCallModalProps) {
  if (!otherUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 bg-black border-0">
        {/* Background video area */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
          {/* Main video area showing other user */}
          <img 
            src={otherUser.profilePicture || ""} 
            alt={`${otherUser.displayName} on video call`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Call UI Overlay */}
        <div className="absolute inset-0 bg-black/20">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage src={otherUser.profilePicture || ""} />
                  <AvatarFallback>{otherUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-white">{otherUser.displayName}</h2>
                  <p className="text-xs text-white/80">{otherUser.walletAddress}</p>
                </div>
              </div>
              <div className="text-white text-sm font-medium">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Picture-in-Picture Self View */}
          <div className="absolute top-20 right-4 w-32 h-24 bg-slate-800 rounded-xl overflow-hidden border-2 border-white/20">
            {/* Self video placeholder */}
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <Avatar className="h-12 w-12">
                <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces" />
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-center space-x-6">
              <Button
                size="lg"
                variant="secondary"
                className="w-14 h-14 rounded-full bg-slate-600/80 hover:bg-slate-500"
              >
                <Mic className="h-6 w-6 text-white" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-14 h-14 rounded-full bg-slate-600/80 hover:bg-slate-500"
              >
                <Video className="h-6 w-6 text-white" />
              </Button>
              <Button
                size="lg"
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-14 h-14 rounded-full bg-slate-600/80 hover:bg-slate-500"
              >
                <Monitor className="h-6 w-6 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
