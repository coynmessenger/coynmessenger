import { useEffect, useRef } from "react";

/**
 * useRingtone Hook
 * Manages ringtone playback for incoming calls
 * Handles browser autoplay restrictions and cleanup
 */
export function useRingtone(src: string, loop: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.loop = loop;
    audioRef.current.volume = 0.7; // Set default volume to 70%

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, loop]);

  const play = async () => {
    try {
      if (audioRef.current) {
        await audioRef.current.play();
        console.log('[ringtone] Playing:', src);
      }
    } catch (err) {
      console.warn('[ringtone] Autoplay blocked. Will start on user gesture.', err);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      console.log('[ringtone] Stopped');
    }
  };

  return { play, stop };
}
