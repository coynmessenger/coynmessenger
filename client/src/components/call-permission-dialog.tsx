import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, Phone, Video, Loader2, AlertCircle, CheckCircle, Camera, X } from "lucide-react";
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
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
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
        // For video calls, request both camera and microphone
        result = await permissionService.requestCameraPermission();
        if (result.success) {
          setCameraPermission("granted");
          setMicPermission("granted");
          console.log("✅ PERMISSION DIALOG: Camera + Microphone permission granted");
        } else {
          setCameraPermission("denied");
          setMicPermission("denied");
        }
      } else {
        // For voice calls, only request microphone
        result = await microphoneService.requestPermissionWithFallback();
        if (result.success) {
          setMicPermission("granted");
          console.log("✅ PERMISSION DIALOG: Microphone permission granted");
        } else {
          setMicPermission("denied");
        }
      }

      if (result.success) {
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
        // Handle different error property names from different services
        const errorMsg = (result as any).errorMessage || (result as any).error?.message || 
          (callType === "video" 
            ? "Camera and microphone access was denied. Please allow access in your browser settings."
            : "Microphone access was denied. Please allow microphone access in your browser settings.");
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("❌ PERMISSION DIALOG: Error requesting permissions:", err);
      setMicPermission("denied");
      if (callType === "video") {
        setCameraPermission("denied");
      }
      setError(err.message || "Failed to access required devices. Please check your browser settings.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancel = () => {
    setMicPermission("pending");
    setCameraPermission("pending");
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
            {/* Camera Permission - Only for video calls */}
            {callType === "video" && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  cameraPermission === "granted" ? "bg-green-500/20" : 
                  cameraPermission === "denied" ? "bg-red-500/20" : "bg-blue-500/20"
                }`}>
                  <Camera className={`w-5 h-5 ${
                    cameraPermission === "granted" ? "text-green-400" : 
                    cameraPermission === "denied" ? "text-red-400" : "text-blue-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Camera</div>
                  <div className="text-sm text-slate-400">
                    {cameraPermission === "granted" ? "Access granted" : 
                     cameraPermission === "denied" ? "Access denied" : "Required for video"}
                  </div>
                </div>
                {cameraPermission === "granted" && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {cameraPermission === "denied" && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            )}

            {/* Microphone Permission */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                micPermission === "granted" ? "bg-green-500/20" : 
                micPermission === "denied" ? "bg-red-500/20" : "bg-orange-500/20"
              }`}>
                <Mic className={`w-5 h-5 ${
                  micPermission === "granted" ? "text-green-400" : 
                  micPermission === "denied" ? "text-red-400" : "text-orange-400"
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
                speakerEnabled ? "bg-green-500/20" : "bg-purple-500/20"
              }`}>
                <Volume2 className={`w-5 h-5 ${speakerEnabled ? "text-green-400" : "text-purple-400"}`} />
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
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-12 border-slate-600 text-slate-300 hover:bg-slate-800 font-medium"
            data-testid="permission-cancel-btn"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          
          <Button
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className={`flex-1 h-12 font-medium ${
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
            ) : micPermission === "denied" || cameraPermission === "denied" ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Try Again
              </>
            ) : (
              <>
                {callType === "video" ? (
                  <Video className="w-4 h-4 mr-2" />
                ) : (
                  <Phone className="w-4 h-4 mr-2" />
                )}
                Allow & Start {callType === "video" ? "Video" : "Voice"} Call
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
