import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, Phone, Video, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { microphoneService } from "@/lib/microphone-service";
import { permissionService } from "@/lib/permission-service";

interface CallPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  callType: "voice" | "video";
  calleeName?: string;
}

export default function CallPermissionDialog({
  isOpen,
  onClose,
  onPermissionGranted,
  callType,
  calleeName = "this contact"
}: CallPermissionDialogProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Step 1: Request microphone (and camera for video calls)
      console.log(`🎤 PERMISSION DIALOG: Requesting ${callType} permissions...`);
      
      let result;
      if (callType === "video") {
        result = await permissionService.requestCameraPermission();
      } else {
        result = await microphoneService.requestPermissionWithFallback();
      }

      if (result.success) {
        console.log("✅ PERMISSION DIALOG: Microphone permission granted");
        setMicPermission("granted");

        // Step 2: Enable speaker audio by playing a silent audio context
        // This user gesture unlocks audio autoplay
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          await audioContext.resume();
          
          // Play a very short silent sound to fully unlock audio
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0; // Silent
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.001);
          
          setSpeakerEnabled(true);
          console.log("✅ PERMISSION DIALOG: Speaker audio unlocked");
          
          // Small delay to show success state
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // All permissions granted - proceed with call
          onPermissionGranted();
        } catch (audioErr) {
          console.warn("⚠️ PERMISSION DIALOG: Could not unlock audio context:", audioErr);
          // Still proceed - audio might work anyway
          setSpeakerEnabled(true);
          onPermissionGranted();
        }
      } else {
        console.error("❌ PERMISSION DIALOG: Permission denied");
        setMicPermission("denied");
        // Handle different error property names from different services
        const errorMsg = (result as any).errorMessage || (result as any).error?.message || "Microphone access was denied. Please allow microphone access in your browser settings.";
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("❌ PERMISSION DIALOG: Error requesting permissions:", err);
      setMicPermission("denied");
      setError(err.message || "Failed to access microphone. Please check your browser settings.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancel = () => {
    setMicPermission("pending");
    setSpeakerEnabled(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-xl font-semibold text-center flex items-center justify-center gap-2">
          {callType === "video" ? (
            <Video className="w-6 h-6 text-blue-400" />
          ) : (
            <Phone className="w-6 h-6 text-green-400" />
          )}
          {callType === "video" ? "Video" : "Voice"} Call Permissions
        </DialogTitle>
        
        <DialogDescription className="text-center text-slate-300">
          To call {calleeName}, we need access to your microphone
          {callType === "video" && " and camera"} so you can be heard{callType === "video" && " and seen"}.
        </DialogDescription>

        <div className="space-y-4 py-4">
          {/* Permission Status Items */}
          <div className="space-y-3">
            {/* Microphone Permission */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                micPermission === "granted" ? "bg-green-500/20" : 
                micPermission === "denied" ? "bg-red-500/20" : "bg-slate-700"
              }`}>
                <Mic className={`w-5 h-5 ${
                  micPermission === "granted" ? "text-green-400" : 
                  micPermission === "denied" ? "text-red-400" : "text-slate-400"
                }`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">Microphone</div>
                <div className="text-sm text-slate-400">
                  {micPermission === "granted" ? "Access granted" : 
                   micPermission === "denied" ? "Access denied" : "Required for speaking"}
                </div>
              </div>
              {micPermission === "granted" && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {micPermission === "denied" && (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            {/* Speaker Status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                speakerEnabled ? "bg-green-500/20" : "bg-slate-700"
              }`}>
                <Volume2 className={`w-5 h-5 ${speakerEnabled ? "text-green-400" : "text-slate-400"}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">Speaker</div>
                <div className="text-sm text-slate-400">
                  {speakerEnabled ? "Audio enabled" : "For hearing the caller"}
                </div>
              </div>
              {speakerEnabled && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Permission Required</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            data-testid="permission-cancel-btn"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className={`flex-1 ${
              callType === "video" 
                ? "bg-blue-600 hover:bg-blue-700" 
                : "bg-green-600 hover:bg-green-700"
            } text-white`}
            data-testid="permission-allow-btn"
          >
            {isRequesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : micPermission === "denied" ? (
              "Try Again"
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Allow & Start Call
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-slate-500 mt-2">
          Your browser will ask for permission. Click "Allow" to proceed.
        </p>
      </DialogContent>
    </Dialog>
  );
}
