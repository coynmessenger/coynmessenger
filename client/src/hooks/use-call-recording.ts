const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
import { useState, useRef, useCallback } from 'react';

interface CallRecordingOptions {
  callerAddress: string;
  receiverAddress: string;
  callType: 'voice' | 'video';
}

interface CallRecordingResult {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  recordingId: string | null;
  error: string | null;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => Promise<void>;
  reset: () => void;
}

export function useCallRecording(options: CallRecordingOptions): CallRecordingResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const callIdRef = useRef<string>(`call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const startTimeRef = useRef<string | null>(null);

  const startRecording = useCallback((stream: MediaStream) => {
    try {
      // Reset state
      audioChunksRef.current = [];
      setError(null);
      setTranscript(null);
      setRecordingId(null);
      callIdRef.current = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      startTimeRef.current = new Date().toISOString();

      // Create audio-only stream for recording
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('No audio tracks available for recording');
        return;
      }

      const audioStream = new MediaStream(audioTracks);
      
      // Check for supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      log('🎙️ Call recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<void> => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    setIsProcessing(true);

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        try {
          const endTime = new Date().toISOString();
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          
          if (audioBlob.size < 1000) {
            log('Recording too short, skipping upload');
            setIsProcessing(false);
            resolve();
            return;
          }

          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            try {
              // Upload encrypted recording to Google Drive
              const uploadRes = await fetch('/api/recordings/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Audio,
                  callId: callIdRef.current,
                  callerAddress: options.callerAddress,
                  receiverAddress: options.receiverAddress,
                  startTime: startTimeRef.current,
                  endTime,
                  duration: Math.floor((new Date(endTime).getTime() - new Date(startTimeRef.current!).getTime()) / 1000),
                  type: options.callType
                })
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                if (uploadData.fileId) {
                  setRecordingId(uploadData.fileId);
                  log('📁 Call recording uploaded:', uploadData.fileId);
                }
              }

              // Transcribe the audio
              const transcribeRes = await fetch('/api/audio/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audio: base64Audio,
                  format: 'webm'
                })
              });

              if (transcribeRes.ok) {
                const transcribeData = await transcribeRes.json();
                if (transcribeData.transcript) {
                  setTranscript(transcribeData.transcript);
                  log('📝 Call transcribed:', transcribeData.transcript.substring(0, 100) + '...');
                }
              }
            } catch (apiError) {
              console.error('Failed to process recording:', apiError);
              setError('Failed to save recording');
            }

            setIsProcessing(false);
            resolve();
          };

          reader.readAsDataURL(audioBlob);
        } catch (err) {
          console.error('Failed to process recording:', err);
          setError('Failed to process recording');
          setIsProcessing(false);
          resolve();
        }
      };

      mediaRecorder.stop();
    });
  }, [options.callerAddress, options.receiverAddress, options.callType]);

  const reset = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setTranscript(null);
    setRecordingId(null);
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    recordingId,
    error,
    startRecording,
    stopRecording,
    reset
  };
}
