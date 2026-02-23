import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, Phone, Video, Loader2, AlertCircle, CheckCircle, Camera, ShieldCheck } from "lucide-react";
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
      console.log(`🎤 PERMISSION DIALOG: Requesting ${callType} permissions...`);
      
      let result;
      if (callType === "video") {
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
        result = await microphoneService.requestPermissionWithFallback();
        if (result.success) {
          setMicPermission("granted");
          console.log("✅ PERMISSION DIALOG: Microphone permission granted");
        } else {
          setMicPermission("denied");
        }
      }

      if (result.success) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          await audioContext.resume();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0;
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.001);
          setSpeakerEnabled(true);
          console.log("✅ PERMISSION DIALOG: Speaker audio unlocked");
          await new Promise(resolve => setTimeout(resolve, 500));
          onPermissionGranted();
        } catch (audioErr) {
          console.warn("⚠️ PERMISSION DIALOG: Could not unlock audio context:", audioErr);
          setSpeakerEnabled(true);
          onPermissionGranted();
        }
      } else {
        console.error("❌ PERMISSION DIALOG: Permission denied");
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

  const getStatusIcon = (status: "pending" | "granted" | "denied") => {
    if (status === "granted") return <CheckCircle className="w-4 h-4 text-orange-500" />;
    if (status === "denied") return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
            {callType === "video" ? (
              <Video className="w-8 h-8 text-orange-500" />
            ) : (
              <Phone className="w-8 h-8 text-orange-500" />
            )}
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {callType === "video" ? "Video" : "Voice"} Call
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Grant access to call <span className="text-orange-600 font-medium">{calleeName}</span>
          </DialogDescription>
        </div>

        <div className="px-6 pb-2">
          <div className="space-y-2">
            {callType === "video" && (
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                cameraPermission === "granted" ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700" :
                cameraPermission === "denied" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" :
                "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  cameraPermission === "granted" ? "bg-orange-100 dark:bg-orange-900/40" :
                  cameraPermission === "denied" ? "bg-red-100" : "bg-orange-50 dark:bg-orange-900/30"
                }`}>
                  <Camera className={`w-[18px] h-[18px] ${
                    cameraPermission === "granted" ? "text-orange-500" :
                    cameraPermission === "denied" ? "text-red-500" : "text-orange-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Camera</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {cameraPermission === "granted" ? "Access granted" :
                     cameraPermission === "denied" ? "Access denied" : "Required for video"}
                  </div>
                </div>
                {getStatusIcon(cameraPermission)}
              </div>
            )}

            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              micPermission === "granted" ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700" :
              micPermission === "denied" ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" :
              "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                micPermission === "granted" ? "bg-orange-100 dark:bg-orange-900/40" :
                micPermission === "denied" ? "bg-red-100" : "bg-orange-50 dark:bg-orange-900/30"
              }`}>
                <Mic className={`w-[18px] h-[18px] ${
                  micPermission === "granted" ? "text-orange-500" :
                  micPermission === "denied" ? "text-red-500" : "text-orange-400"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Microphone</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {micPermission === "granted" ? "Access granted" :
                   micPermission === "denied" ? "Access denied" : "Required for speaking"}
                </div>
              </div>
              {getStatusIcon(micPermission)}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              speakerEnabled ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700" :
              "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                speakerEnabled ? "bg-orange-100 dark:bg-orange-900/40" : "bg-orange-50 dark:bg-orange-900/30"
              }`}>
                <Volume2 className={`w-[18px] h-[18px] ${speakerEnabled ? "text-orange-500" : "text-orange-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Speaker</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {speakerEnabled ? "Audio enabled" : "For hearing the caller"}
                </div>
              </div>
              {speakerEnabled ? getStatusIcon("granted") : getStatusIcon("pending")}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{error}</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-4 space-y-3">
          <Button
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white"
            data-testid="permission-allow-btn"
          >
            {isRequesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Requesting Access...
              </>
            ) : micPermission === "denied" || cameraPermission === "denied" ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Try Again
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Allow & Start Call
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
            data-testid="permission-cancel-btn"
          >
            Cancel
          </Button>

          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 leading-relaxed">
            Your browser will prompt for permission. Tap <span className="text-orange-500">"Allow"</span> to proceed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
