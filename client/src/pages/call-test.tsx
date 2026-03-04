/**
 * Simple Video/Voice Call Test Page
 * Use this to test the simplified WebRTC service
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";
import { getSimpleWebRTC, retryPendingAudio, type IncomingCallData } from "@/lib/simple-webrtc";
import { useToast } from "@/hooks/use-toast";

export default function CallTestPage() {
  const { toast } = useToast();
  
  // Get user from localStorage
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserId(String(parsedUser.id));
    }
  }, []);
  
  const [targetUserId, setTargetUserId] = useState("");
  const [callType, setCallType] = useState<"voice" | "video">("video");
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const webrtcService = useRef(getSimpleWebRTC());

  // Initialize WebRTC service
  useEffect(() => {
    if (!userId) return;

    const service = webrtcService.current;
    
    // Authenticate
    service.authenticate(userId).then(() => {
      console.log('✅ Authenticated with WebRTC service');
      setCallStatus('Ready');
    });

    // Handle incoming calls
    service.onIncomingCall((data: IncomingCallData) => {
      console.log('📞 Incoming call from:', data.fromUserId);
      
      toast({
        title: `Incoming ${data.type} call`,
        description: `Call from user ${data.fromUserId}`,
      });
      
      setIncomingCall(data);
    });

    return () => {
      service.disconnect();
    };
  }, [userId, toast]);

  const handleInitiateCall = async () => {
    if (!targetUserId) {
      toast({
        title: "Error",
        description: "Please enter a target user ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setCallStatus('Initiating...');
      
      const callId = await webrtcService.current.initiateCall(
        {
          type: callType,
          targetUserId,
          localVideoElement: localVideoRef.current,
          remoteVideoElement: remoteVideoRef.current,
          remoteAudioElement: remoteAudioRef.current,
        },
        {
          onLocalStream: (stream) => {
            console.log('✅ Local stream received');
            setCallStatus('Ringing...');
          },
          onRemoteStream: (stream) => {
            console.log('✅ Remote stream received');
            // Try to play audio
            retryPendingAudio();
          },
          onCallConnected: () => {
            console.log('✅ Call connected');
            setCallStatus('Connected');
            setIsInCall(true);
          },
          onCallEnded: () => {
            console.log('📞 Call ended');
            setCallStatus('Ready');
            setIsInCall(false);
          },
          onError: (error) => {
            console.error('❌ Call error:', error);
            toast({
              title: "Call Error",
              description: error.message,
              variant: "destructive",
            });
            setCallStatus('Ready');
          },
        }
      );

      console.log('📞 Call initiated:', callId);

    } catch (error: any) {
      console.error('Failed to initiate call:', error);
      toast({
        title: "Failed to initiate call",
        description: error.message,
        variant: "destructive",
      });
      setCallStatus('Ready');
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      setCallStatus('Accepting...');
      
      // Use the callback accept method (not direct service call)
      await incomingCall.accept(
        {
          type: incomingCall.type,
          targetUserId: incomingCall.fromUserId,
          localVideoElement: localVideoRef.current,
          remoteVideoElement: remoteVideoRef.current,
          remoteAudioElement: remoteAudioRef.current,
        },
        {
          onLocalStream: (stream) => {
            console.log('✅ Local stream received');
          },
          onRemoteStream: (stream) => {
            console.log('✅ Remote stream received');
            // User clicked accept button, so we have user gesture - retry audio
            retryPendingAudio();
          },
          onCallConnected: () => {
            console.log('✅ Call connected');
            setCallStatus('Connected');
            setIsInCall(true);
            setIncomingCall(null);
          },
          onCallEnded: () => {
            console.log('📞 Call ended');
            setCallStatus('Ready');
            setIsInCall(false);
          },
          onError: (error) => {
            console.error('❌ Call error:', error);
            toast({
              title: "Call Error",
              description: error.message,
              variant: "destructive",
            });
            setCallStatus('Ready');
            setIncomingCall(null);
          },
        }
      );

      console.log('✅ Call accepted');

    } catch (error: any) {
      console.error('Failed to accept call:', error);
      toast({
        title: "Failed to accept call",
        description: error.message,
        variant: "destructive",
      });
      setCallStatus('Ready');
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      incomingCall.reject();
      setIncomingCall(null);
      toast({
        title: "Call Rejected",
        description: "You rejected the incoming call",
      });
    }
  };

  const handleEndCall = () => {
    webrtcService.current.endCall();
    setIsInCall(false);
    setCallStatus('Ready');
  };

  const handleToggleMute = () => {
    const muted = webrtcService.current.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">WebRTC Call Test</CardTitle>
            <CardDescription className="text-slate-400">
              Test video and voice calling functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            <div className="bg-slate-900 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  callStatus === 'Connected' ? 'bg-green-500' :
                  callStatus === 'Ready' ? 'bg-blue-500' :
                  'bg-yellow-500'
                } animate-pulse`}></div>
                <span className="text-white font-medium">Status: {callStatus}</span>
              </div>
              {userId && (
                <p className="text-slate-400 text-sm mt-2">
                  Your User ID: {userId}
                </p>
              )}
            </div>

            {/* Incoming Call Alert */}
            {incomingCall && (
              <Card className="bg-orange-500/20 border-orange-500">
                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-2">Incoming {incomingCall.type} call!</h3>
                  <p className="text-white/80 mb-4">From user: {incomingCall.fromUserId}</p>
                  <div className="flex space-x-4">
                    <Button 
                      onClick={handleAcceptCall}
                      className="bg-green-500 hover:bg-green-600"
                      data-testid="button-accept-call"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button 
                      onClick={handleRejectCall}
                      variant="destructive"
                      data-testid="button-reject-call"
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isInCall && !incomingCall && (
              <>
                {/* Call Controls */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="targetUserId" className="text-white">Target User ID</Label>
                    <Input
                      id="targetUserId"
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="Enter user ID to call"
                      className="bg-slate-900 border-slate-700 text-white"
                      data-testid="input-target-userid"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Call Type</Label>
                    <div className="flex space-x-4 mt-2">
                      <Button
                        variant={callType === 'voice' ? 'default' : 'outline'}
                        onClick={() => setCallType('voice')}
                        className="flex-1"
                        data-testid="button-call-type-voice"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Voice
                      </Button>
                      <Button
                        variant={callType === 'video' ? 'default' : 'outline'}
                        onClick={() => setCallType('video')}
                        className="flex-1"
                        data-testid="button-call-type-video"
                      >
                        <Video className="mr-2 h-4 w-4" />
                        Video
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={handleInitiateCall}
                    disabled={!targetUserId || callStatus !== 'Ready'}
                    className="w-full bg-green-500 hover:bg-green-600"
                    data-testid="button-initiate-call"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Start Call
                  </Button>
                </div>
              </>
            )}

            {/* Active Call Controls */}
            {isInCall && (
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handleToggleMute}
                    className={isMuted ? 'bg-red-500/20' : ''}
                    data-testid="button-toggle-mute"
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    data-testid="button-end-call"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    End Call
                  </Button>
                </div>
              </div>
            )}

            {/* Video Display */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <p className="text-center text-white/60 p-2">Your Camera</p>
              </div>
              <div className="bg-slate-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <p className="text-center text-white/60 p-2">Remote Camera</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Open this page in two different browser tabs or windows</li>
              <li>Note your User ID shown in the status section</li>
              <li>In one tab, enter the other tab's User ID in "Target User ID"</li>
              <li>Select Voice or Video call type</li>
              <li>Click "Start Call" to initiate the call</li>
              <li>In the other tab, you'll see an incoming call notification</li>
              <li>Click "Accept" to answer the call</li>
              <li>You should now hear/see each other!</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Audio Element for Remote Stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </div>
  );
}
