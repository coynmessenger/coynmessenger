import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Send, Bot, User, Sparkles, Mic, MicOff, Pause, Square, Play } from "lucide-react";
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
    audioLevel: 0
  });
  const [showChatMode, setShowChatMode] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize voice mode on component mount
  useEffect(() => {
    if (voiceMode.isActive && !voiceMode.isPaused) {
      startVoiceRecognition();
      startAudioVisualization();
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
    };
  }, []);

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
    setVoiceMode(prev => ({ ...prev, isPaused: true }));
    setIsListening(false);
  };

  const resumeVoiceMode = () => {
    setVoiceMode(prev => ({ ...prev, isPaused: false }));
    startVoiceRecognition();
    startAudioVisualization();
  };

  const stopVoiceMode = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Add transcript to messages if available
    if (voiceMode.transcript.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: voiceMode.transcript,
        timestamp: new Date()
      }]);
    }
    
    setVoiceMode(prev => ({ ...prev, isActive: false, isPaused: false }));
    setShowChatMode(true);
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message,
          history: messages.slice(-5) // Send last 5 messages for context
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
        timestamp: new Date()
      }]);
    }
  });

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
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse"
                  style={{
                    opacity: 0.2 + voiceMode.audioLevel * 0.8,
                    filter: `blur(${voiceMode.audioLevel * 10}px)`
                  }}
                />
                <div 
                  className="absolute inset-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"
                  style={{
                    opacity: 0.3 + voiceMode.audioLevel * 0.7,
                    animation: `spin ${2 - voiceMode.audioLevel}s linear infinite`
                  }}
                />
                <div className="absolute inset-4 rounded-full overflow-hidden border-4 border-white/30 backdrop-blur-sm">
                  <img 
                    src={coynLogoPath} 
                    alt="COYN" 
                    className="w-full h-full object-cover"
                    style={{
                      filter: `brightness(${1 + voiceMode.audioLevel * 0.5}) saturate(${1 + voiceMode.audioLevel * 0.3})`
                    }}
                  />
                </div>
                
                {/* Audio visualization rings */}
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 border-2 border-purple-400/30 rounded-full"
                    style={{
                      transform: `scale(${1 + (voiceMode.audioLevel * (i + 1) * 0.2)})`,
                      opacity: voiceMode.audioLevel * (1 - i * 0.3),
                      animation: `pulse ${1 + i * 0.5}s ease-in-out infinite`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status and Transcript */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                {isListening && !voiceMode.isPaused ? (
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
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Ready to listen
                    </span>
                  </>
                )}
              </div>

              {/* Live Transcript */}
              {voiceMode.transcript && (
                <div className="max-w-2xl mx-auto p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg border border-white/20">
                  <p className="text-gray-800 dark:text-gray-200 text-center">
                    "{voiceMode.transcript}"
                  </p>
                </div>
              )}

              {/* Instructions */}
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Speak naturally and I'll transcribe your words. Use the pause button to temporarily stop listening, or stop to switch to chat mode.
              </p>
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