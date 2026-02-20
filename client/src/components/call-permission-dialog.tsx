import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, Phone, Video, Loader2, AlertCircle, CheckCircle, Camera, X, ShieldCheck } from "lucide-react";
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

  const accentColor = callType === "video" ? "blue" : "green";

  const getStatusIcon = (status: "pending" | "granted" | "denied") => {
    if (status === "granted") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "denied") return <AlertCircle className="w-4 h-4 text-red-400" />;
    return <div className="w-4 h-4 rounded-full border-2 border-slate-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[380px] p-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 text-white overflow-hidden rounded-2xl gap-0">
        <button
          onClick={handleCancel}
          className="absolute right-4 top-4 z-10 rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`relative px-6 pt-8 pb-6 text-center bg-gradient-to-b ${callType === "video" ? "from-blue-600/15 to-transparent" : "from-emerald-600/15 to-transparent"}`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${callType === "video" ? "bg-blue-500/20 shadow-lg shadow-blue-500/10" : "bg-emerald-500/20 shadow-lg shadow-emerald-500/10"}`}>
            {callType === "video" ? (
              <Video className="w-8 h-8 text-blue-400" />
            ) : (
              <Phone className="w-8 h-8 text-emerald-400" />
            )}
          </div>
          <DialogTitle className="text-lg font-semibold text-white mb-1">
            {callType === "video" ? "Video" : "Voice"} Call
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            Grant access to call <span className="text-slate-200 font-medium">{calleeName}</span>
          </DialogDescription>
        </div>

        <div className="px-6 pb-2">
          <div className="space-y-2">
            {callType === "video" && (
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                cameraPermission === "granted" ? "bg-emerald-500/10 border border-emerald-500/20" :
                cameraPermission === "denied" ? "bg-red-500/10 border border-red-500/20" :
                "bg-slate-800/60 border border-slate-700/50"
              }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  cameraPermission === "granted" ? "bg-emerald-500/20" :
                  cameraPermission === "denied" ? "bg-red-500/20" : "bg-blue-500/15"
                }`}>
                  <Camera className={`w-4.5 h-4.5 ${
                    cameraPermission === "granted" ? "text-emerald-400" :
                    cameraPermission === "denied" ? "text-red-400" : "text-blue-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">Camera</div>
                  <div className="text-xs text-slate-400">
                    {cameraPermission === "granted" ? "Access granted" :
                     cameraPermission === "denied" ? "Access denied" : "Required for video"}
                  </div>
                </div>
                {getStatusIcon(cameraPermission)}
              </div>
            )}

            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              micPermission === "granted" ? "bg-emerald-500/10 border border-emerald-500/20" :
              micPermission === "denied" ? "bg-red-500/10 border border-red-500/20" :
              "bg-slate-800/60 border border-slate-700/50"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                micPermission === "granted" ? "bg-emerald-500/20" :
                micPermission === "denied" ? "bg-red-500/20" : "bg-amber-500/15"
              }`}>
                <Mic className={`w-4.5 h-4.5 ${
                  micPermission === "granted" ? "text-emerald-400" :
                  micPermission === "denied" ? "text-red-400" : "text-amber-400"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Microphone</div>
                <div className="text-xs text-slate-400">
                  {micPermission === "granted" ? "Access granted" :
                   micPermission === "denied" ? "Access denied" : "Required for speaking"}
                </div>
              </div>
              {getStatusIcon(micPermission)}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              speakerEnabled ? "bg-emerald-500/10 border border-emerald-500/20" :
              "bg-slate-800/60 border border-slate-700/50"
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                speakerEnabled ? "bg-emerald-500/20" : "bg-violet-500/15"
              }`}>
                <Volume2 className={`w-4.5 h-4.5 ${speakerEnabled ? "text-emerald-400" : "text-violet-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Speaker</div>
                <div className="text-xs text-slate-400">
                  {speakerEnabled ? "Audio enabled" : "For hearing the caller"}
                </div>
              </div>
              {speakerEnabled ? getStatusIcon("granted") : getStatusIcon("pending")}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-300 leading-relaxed">{error}</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 pt-4 space-y-3">
          <Button
            onClick={handleRequestPermissions}
            disabled={isRequesting}
            className={`w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all ${
              callType === "video"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-blue-600/25"
                : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-600/25"
            } text-white`}
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
            className="w-full h-10 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium text-sm"
            data-testid="permission-cancel-btn"
          >
            Cancel
          </Button>

          <p className="text-[11px] text-center text-slate-500 leading-relaxed">
            Your browser will prompt for permission. Tap <span className="text-slate-400">"Allow"</span> to proceed.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
