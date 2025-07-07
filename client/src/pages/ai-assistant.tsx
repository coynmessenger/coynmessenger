import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Send, Bot, User, Sparkles, Mic, MicOff, Pause, Square, Play, Hand } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceMode {
  isActive: boolean;
  isPaused: boolean;
  transcript: string;
  audioLevel: number;
  isProcessing: boolean;
  currentResponse: string;
  gestureDetected: string | null;
  gestureConfidence: number;
}

export default function AIAssistantPage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>({
    isActive: true,
    isPaused: false,
    transcript: "",
    audioLevel: 0,
    isProcessing: false,
    currentResponse: "",
    gestureDetected: null,
    gestureConfidence: 0
  });
  const [showChatMode, setShowChatMode] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize AI Assistant immediately
  useEffect(() => {
    // Set permissions as granted by default
    setPermissionsGranted(true);
    
    // Initialize voice mode immediately
    if (voiceMode.isActive && !voiceMode.isPaused) {
      setTimeout(() => {
        initializeAIAssistant();
      }, 1000);
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      stopGestureRecognition();
    };
  }, []);

  // Initialize AI Assistant with ChatGPT welcome
  const initializeAIAssistant = async () => {
    try {
      console.log('Initializing ChatGPT AI Assistant...');
      
      // Add welcome message to show ChatGPT is active
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Hello! I'm your ChatGPT-powered AI Assistant. I can help you with questions, have conversations, and assist with various tasks. You can speak to me or type messages. How can I help you today?",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      
      // Speak welcome message
      speakResponse("Hello! I'm your ChatGPT-powered AI Assistant. I'm ready to help you with questions and conversations. How can I assist you today?");
      
      // Try to get permissions gracefully
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(track => track.stop());
        
        // Initialize voice recognition
        startVoiceRecognition();
        startAudioVisualization();
      } catch (error) {
        console.log('Audio permissions not granted, voice recognition disabled');
      }
      
      // Try gesture recognition
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
        startGestureRecognition();
      } catch (error) {
        console.log('Camera permissions not granted, gesture recognition disabled');
      }
      
    } catch (error) {
      console.error('AI Assistant initialization error:', error);
    }
  };

  // User-triggered speech test
  const testSpeech = () => {
    console.log('Testing speech synthesis...');
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const testMessage = "Hello! I can hear you and speak back to you. Voice system is working!";
      speakResponse(testMessage);
    } else {
      console.error('Speech synthesis not available');
    }
  };

  // Start audio visualization for voice-sensitive logo
  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const animate = () => {
        if (analyserRef.current && !voiceMode.isPaused) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = average / 255;
          
          setVoiceMode(prev => ({ ...prev, audioLevel: normalizedLevel }));
        }
        
        if (voiceMode.isActive && !voiceMode.isPaused) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      
      animate();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const pauseVoiceMode = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    // Stop any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    stopGestureRecognition();
    setVoiceMode(prev => ({ ...prev, isPaused: true }));
    setIsListening(false);
  };

  const resumeVoiceMode = () => {
    setVoiceMode(prev => ({ ...prev, isPaused: false, currentResponse: "", gestureDetected: null, gestureConfidence: 0 }));
    startVoiceRecognition();
    startAudioVisualization();
    startGestureRecognition();
  };

  const stopVoiceMode = () => {
    // Cleanup all voice mode resources
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    stopGestureRecognition();
    
    // Add current transcript and response to messages if available
    if (voiceMode.transcript.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: voiceMode.transcript,
        timestamp: new Date()
      }]);
    }
    
    if (voiceMode.currentResponse.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: voiceMode.currentResponse,
        timestamp: new Date()
      }]);
    }
    
    setVoiceMode(prev => ({ 
      ...prev, 
      isActive: false, 
      isPaused: false, 
      transcript: "", 
      currentResponse: "",
      isProcessing: false,
      gestureDetected: null,
      gestureConfidence: 0
    }));
    setShowChatMode(true);
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message,
          conversationHistory: messages.slice(-10) // Send last 10 messages for better context
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      if (voiceMode.isActive) {
        setVoiceMode(prev => ({ 
          ...prev, 
          isProcessing: false, 
          currentResponse: data.response 
        }));
        // Speak the response if voice mode is active
        speakResponse(data.response);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-ai',
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }]);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      const errorMessage = "I apologize, but I'm having trouble processing your request right now. Please try again.";
      
      if (voiceMode.isActive) {
        setVoiceMode(prev => ({ 
          ...prev, 
          isProcessing: false, 
          currentResponse: errorMessage 
        }));
        speakResponse(errorMessage);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        }]);
      }
    }
  });

  // Direct text-to-speech function
  const speakResponse = (text: string) => {
    console.log('Attempting to speak:', text);
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Clear any existing speech
      try {
        speechSynthesis.cancel();
      } catch (e) {
        console.log('Cancel speech error:', e);
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Simple, reliable settings
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        console.log('✓ AI Assistant started speaking');
        setVoiceMode(prev => ({ ...prev, currentResponse: text }));
      };
      
      utterance.onend = () => {
        console.log('✓ AI Assistant finished speaking');
        setTimeout(() => {
          setVoiceMode(prev => ({ ...prev, currentResponse: "" }));
        }, 200);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech error:', event.error);
        setVoiceMode(prev => ({ ...prev, currentResponse: "" }));
      };
      
      // Force speech to work
      try {
        speechSynthesis.speak(utterance);
        console.log('✓ Speech command sent');
      } catch (error) {
        console.error('Speech failed:', error);
      }
    } else {
      console.error('Speech synthesis not available');
    }
  };

  // Process voice input automatically when user pauses
  const processVoiceInput = (transcript: string) => {
    if (!transcript.trim() || transcript === lastTranscriptRef.current) return;
    
    lastTranscriptRef.current = transcript;
    
    // Clear existing timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    // Set timeout to process after 2 seconds of silence
    silenceTimeoutRef.current = setTimeout(() => {
      if (voiceMode.isActive && !voiceMode.isPaused && transcript.trim()) {
        setVoiceMode(prev => ({ ...prev, isProcessing: true }));
        
        // Include gesture context in the message if detected
        let finalTranscript = transcript;
        if (voiceMode.gestureDetected && voiceMode.gestureConfidence > 0.7) {
          finalTranscript = `${transcript} [Gesture: ${voiceMode.gestureDetected}]`;
        }
        
        // Add user message to conversation
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: finalTranscript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Send to AI
        chatMutation.mutate(finalTranscript);
        
        // Clear transcript after processing
        setVoiceMode(prev => ({ ...prev, transcript: "", gestureDetected: null, gestureConfidence: 0 }));
        lastTranscriptRef.current = "";
      }
    }, 2000);
  };

  // Start camera for gesture recognition
  const startGestureRecognition = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start gesture detection loop
        gestureIntervalRef.current = setInterval(() => {
          detectGestures();
        }, 500); // Check for gestures every 500ms
      }
    } catch (error) {
      console.error('Error accessing camera for gesture recognition:', error);
    }
  };

  // Simple gesture detection based on hand position analysis
  const detectGestures = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Simple gesture detection based on motion and color analysis
    const gesture = analyzeHandGesture(data, canvas.width, canvas.height);
    
    if (gesture.type && gesture.confidence > 0.6) {
      setVoiceMode(prev => ({
        ...prev,
        gestureDetected: gesture.type,
        gestureConfidence: gesture.confidence
      }));
      
      // Handle specific gestures
      handleGestureCommand(gesture.type, gesture.confidence);
    }
  };

  // Analyze hand gesture from image data
  const analyzeHandGesture = (data: Uint8ClampedArray, width: number, height: number) => {
    // Simple analysis based on movement patterns and positioning
    let motionPixels = 0;
    let skinColorPixels = 0;
    let topQuadrantMotion = 0;
    let bottomQuadrantMotion = 0;
    let leftMotion = 0;
    let rightMotion = 0;
    
    // Analyze pixels for skin-like colors and motion patterns
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Simple skin color detection
      if (r > 95 && g > 40 && b > 20 && 
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 && r > g && r > b) {
        skinColorPixels++;
        
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Quadrant analysis
        if (y < height / 2) topQuadrantMotion++;
        else bottomQuadrantMotion++;
        
        if (x < width / 2) leftMotion++;
        else rightMotion++;
      }
    }
    
    // Gesture recognition based on patterns
    const totalPixels = data.length / 4;
    const skinRatio = skinColorPixels / totalPixels;
    
    if (skinRatio > 0.02) { // Hand detected
      if (topQuadrantMotion > bottomQuadrantMotion * 2) {
        return { type: 'wave', confidence: Math.min(0.9, skinRatio * 10) };
      } else if (leftMotion > rightMotion * 1.5) {
        return { type: 'point-left', confidence: Math.min(0.8, skinRatio * 8) };
      } else if (rightMotion > leftMotion * 1.5) {
        return { type: 'point-right', confidence: Math.min(0.8, skinRatio * 8) };
      } else if (skinRatio > 0.05) {
        return { type: 'open-palm', confidence: Math.min(0.7, skinRatio * 6) };
      }
    }
    
    return { type: null, confidence: 0 };
  };

  // Handle gesture commands
  const handleGestureCommand = (gestureType: string, confidence: number) => {
    if (confidence < 0.7) return;
    
    switch (gestureType) {
      case 'wave':
        // Wave gesture could trigger a greeting or attention
        if (!voiceMode.isProcessing && !voiceMode.isPaused) {
          console.log('Wave gesture detected - AI attention activated');
        }
        break;
      case 'open-palm':
        // Open palm could pause/resume
        if (!voiceMode.isPaused && !voiceMode.isProcessing) {
          pauseVoiceMode();
          console.log('Open palm gesture - pausing voice mode');
        }
        break;
      case 'point-left':
        // Point left could trigger previous/back action
        console.log('Point left gesture detected');
        break;
      case 'point-right':
        // Point right could trigger next/forward action
        console.log('Point right gesture detected');
        break;
    }
  };

  // Stop gesture recognition
  const stopGestureRecognition = () => {
    if (gestureIntervalRef.current) {
      clearInterval(gestureIntervalRef.current);
      gestureIntervalRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Send to AI
    chatMutation.mutate(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startVoiceRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      const fullTranscript = finalTranscript + interimTranscript;
      
      if (voiceMode.isActive) {
        setVoiceMode(prev => ({ ...prev, transcript: fullTranscript }));
        
        // Process final transcript for AI response
        if (finalTranscript.trim()) {
          processVoiceInput(finalTranscript.trim());
        }
      } else {
        setInputMessage(fullTranscript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceMode.isActive && !voiceMode.isPaused) {
        // Restart recognition if in voice mode
        setTimeout(() => {
          if (voiceMode.isActive && !voiceMode.isPaused) {
            recognition.start();
          }
        }, 100);
      }
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Home className="h-5 w-5" />
            </Button>
            <img 
              src={coynLogoPath} 
              alt="COYN" 
              className="h-8 w-8 rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {voiceMode.isActive ? "Voice Mode Active" : "Powered by Hugging Face"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {voiceMode.isActive && !showChatMode ? (
              <div className="flex items-center space-x-2">
                {voiceMode.isPaused ? (
                  <Button
                    onClick={resumeVoiceMode}
                    variant="outline"
                    size="sm"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseVoiceMode}
                    variant="outline"
                    size="sm"
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={testSpeech}
                  variant="outline"
                  size="sm"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  🔊 Test Voice
                </Button>
                <Button
                  onClick={stopVoiceMode}
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
            ) : (
              <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Voice Mode Interface */}
      {voiceMode.isActive && !showChatMode ? (
        <div className="flex flex-col h-[calc(100vh-80px)] justify-center items-center p-8">
          <div className="text-center space-y-8">
            {/* Voice-Sensitive COYN Logo */}
            <div className="relative">
              <div 
                className="w-48 h-48 mx-auto rounded-full overflow-hidden relative"
                style={{
                  transform: `scale(${1 + voiceMode.audioLevel * 0.3})`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                {/* Background glow based on state */}
                <div 
                  className={`absolute inset-0 rounded-full animate-pulse ${
                    voiceMode.isProcessing 
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                      : voiceMode.currentResponse 
                      ? 'bg-gradient-to-r from-green-400 to-blue-400'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500'
                  }`}
                  style={{
                    opacity: voiceMode.isProcessing 
                      ? 0.6 
                      : voiceMode.currentResponse 
                      ? 0.5
                      : 0.2 + voiceMode.audioLevel * 0.8,
                    filter: `blur(${voiceMode.isProcessing ? 15 : voiceMode.audioLevel * 10}px)`,
                    animation: voiceMode.isProcessing 
                      ? 'pulse 1s ease-in-out infinite' 
                      : voiceMode.currentResponse
                      ? 'pulse 2s ease-in-out infinite'
                      : undefined
                  }}
                />
                
                {/* Rotating ring */}
                <div 
                  className={`absolute inset-2 rounded-full ${
                    voiceMode.isProcessing 
                      ? 'bg-gradient-to-r from-purple-400 to-blue-400' 
                      : voiceMode.currentResponse
                      ? 'bg-gradient-to-r from-green-300 to-blue-300'
                      : 'bg-gradient-to-r from-purple-400 to-blue-400'
                  }`}
                  style={{
                    opacity: voiceMode.isProcessing 
                      ? 0.8 
                      : voiceMode.currentResponse 
                      ? 0.6
                      : 0.3 + voiceMode.audioLevel * 0.7,
                    animation: voiceMode.isProcessing 
                      ? 'spin 1s linear infinite' 
                      : voiceMode.currentResponse
                      ? 'spin 3s linear infinite'
                      : `spin ${2 - voiceMode.audioLevel}s linear infinite`
                  }}
                />
                
                {/* Logo container */}
                <div className="absolute inset-4 rounded-full overflow-hidden border-4 border-white/30 backdrop-blur-sm">
                  <img 
                    src={coynLogoPath} 
                    alt="COYN" 
                    className="w-full h-full object-cover"
                    style={{
                      filter: voiceMode.isProcessing 
                        ? 'brightness(1.3) saturate(1.2) hue-rotate(10deg)' 
                        : voiceMode.currentResponse
                        ? 'brightness(1.1) saturate(1.1) hue-rotate(-10deg)'
                        : `brightness(${1 + voiceMode.audioLevel * 0.5}) saturate(${1 + voiceMode.audioLevel * 0.3})`
                    }}
                  />
                </div>
                
                {/* Dynamic visualization rings */}
                {Array.from({ length: voiceMode.isProcessing ? 4 : 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 border-2 rounded-full ${
                      voiceMode.isProcessing 
                        ? 'border-purple-400/40' 
                        : voiceMode.currentResponse
                        ? 'border-green-400/40'
                        : 'border-purple-400/30'
                    }`}
                    style={{
                      transform: voiceMode.isProcessing 
                        ? `scale(${1 + (i + 1) * 0.15})` 
                        : voiceMode.currentResponse
                        ? `scale(${1 + (i + 1) * 0.1})`
                        : `scale(${1 + (voiceMode.audioLevel * (i + 1) * 0.2)})`,
                      opacity: voiceMode.isProcessing 
                        ? 0.6 * (1 - i * 0.15) 
                        : voiceMode.currentResponse
                        ? 0.5 * (1 - i * 0.2)
                        : voiceMode.audioLevel * (1 - i * 0.3),
                      animation: voiceMode.isProcessing 
                        ? `pulse ${0.8 + i * 0.2}s ease-in-out infinite` 
                        : voiceMode.currentResponse
                        ? `pulse ${1.5 + i * 0.3}s ease-in-out infinite`
                        : `pulse ${1 + i * 0.5}s ease-in-out infinite`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status and Transcript */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                {voiceMode.isProcessing ? (
                  <>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-lg font-medium text-purple-600 dark:text-purple-400">
                      AI is thinking...
                    </span>
                  </>
                ) : isListening && !voiceMode.isPaused ? (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Listening...
                    </span>
                  </>
                ) : voiceMode.isPaused ? (
                  <>
                    <Pause className="h-5 w-5 text-yellow-500" />
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Paused
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Ready to listen
                    </span>
                  </>
                )}
              </div>

              {/* AI Response Display */}
              {voiceMode.currentResponse && (
                <div className="max-w-2xl mx-auto p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-md rounded-lg border border-purple-300/30">
                  <div className="flex items-start space-x-3">
                    <Bot className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">AI Assistant</p>
                      <p className="text-gray-800 dark:text-gray-200">
                        {voiceMode.currentResponse}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio Troubleshooting */}
              <div className="max-w-2xl mx-auto p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
                  🔊 Audio Troubleshooting:
                </h3>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <div>• Make sure your device volume is turned up</div>
                  <div>• Check that your browser isn't muted</div>
                  <div>• Click the "Test Voice" button to hear the AI speak</div>
                  <div>• Grant microphone permissions when prompted</div>
                  <div>• Try refreshing the page if audio issues persist</div>
                </div>
              </div>

              {/* Live Transcript */}
              {voiceMode.transcript && !voiceMode.currentResponse && (
                <div className="max-w-2xl mx-auto p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg border border-white/20">
                  <div className="flex items-start space-x-3">
                    <User className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">You</p>
                      <p className="text-gray-800 dark:text-gray-200">
                        "{voiceMode.transcript}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Gesture Detection Status */}
              {voiceMode.gestureDetected && voiceMode.gestureConfidence > 0.6 && (
                <div className="max-w-sm mx-auto p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-md rounded-lg border border-blue-300/30">
                  <div className="flex items-center space-x-2 justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Gesture: {voiceMode.gestureDetected.replace('-', ' ')} 
                      <span className="text-xs ml-1">
                        ({Math.round(voiceMode.gestureConfidence * 100)}%)
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Instructions */}
              <div className="max-w-md mx-auto text-center">
                {voiceMode.isProcessing ? (
                  <p className="text-purple-600 dark:text-purple-400 animate-pulse">
                    Processing your request and preparing response...
                  </p>
                ) : voiceMode.currentResponse ? (
                  <p className="text-green-600 dark:text-green-400">
                    🔊 Speaking response - continue the conversation naturally
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-400">
                      💬 Speak naturally and I'll respond automatically after you finish
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      ✋ Use hand gestures for voice control: wave to get attention, open palm to pause
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden camera and canvas for gesture detection */}
            <div className="hidden">
              <video 
                ref={videoRef} 
                className="w-1 h-1" 
                autoPlay 
                muted 
                playsInline
              />
              <canvas 
                ref={canvasRef} 
                className="w-1 h-1"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Chat Mode Interface */
        <div className="flex flex-col h-[calc(100vh-80px)]">
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="glass-card p-8 rounded-3xl border border-white/20 backdrop-blur-md bg-white/10 dark:bg-gray-800/10">
                    <Bot className="h-16 w-16 mx-auto mb-4 text-purple-500" />
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Welcome to COYN AI Assistant
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Ask me anything! I can help with questions, explanations, creative writing, and more.
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start space-x-2 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <Card className={`${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-white/20'
                    }`}>
                      <CardContent className="p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' 
                            ? 'text-blue-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2 max-w-3xl">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-purple-500 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-white/20">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="pr-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-white/20 focus:border-purple-500 focus:ring-purple-500"
                    disabled={chatMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startVoiceRecognition}
                    disabled={chatMutation.isPending}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                  >
                    {isListening ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-purple-500" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || chatMutation.isPending}
                  className="h-12 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}