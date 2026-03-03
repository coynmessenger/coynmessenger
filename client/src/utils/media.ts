const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
/**
 * tryPlayMedia()
 * Safely attempts to play a given HTMLMediaElement.
 * Returns true if playback succeeded, false if blocked (autoplay policy, etc).
 * Used in WebRTC modals to handle autoplay restrictions gracefully.
 */
export async function tryPlayMedia(element: HTMLMediaElement | null): Promise<boolean> {
  if (!element) {
    console.warn("🔊 AUDIO DEBUG (PLAY): Element is null, cannot play");
    return false;
  }

  // Log element state BEFORE play attempt
  log("🔊 AUDIO DEBUG (PLAY): Attempting playback...", {
    elementType: element.tagName,
    readyState: element.readyState,
    paused: element.paused,
    muted: element.muted,
    volume: element.volume,
    hasSrcObject: !!element.srcObject,
    networkState: element.networkState,
    currentTime: element.currentTime,
    duration: element.duration
  });

  // Log srcObject details if available
  if (element.srcObject instanceof MediaStream) {
    log("🔊 AUDIO DEBUG (PLAY): MediaStream details:", {
      active: element.srcObject.active,
      id: element.srcObject.id,
      audioTracks: element.srcObject.getAudioTracks().length,
      videoTracks: element.srcObject.getVideoTracks().length,
      audioTrackDetails: element.srcObject.getAudioTracks().map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        label: t.label
      }))
    });
  }

  try {
    await element.play();
    log("✅ AUDIO DEBUG (PLAY): Playback SUCCEEDED", {
      readyState: element.readyState,
      paused: element.paused,
      currentTime: element.currentTime
    });
    return true;
  } catch (err: any) {
    console.error("❌ AUDIO DEBUG (PLAY): Playback FAILED", {
      errorName: err.name,
      errorMessage: err.message,
      elementState: {
        readyState: element.readyState,
        paused: element.paused,
        muted: element.muted,
        volume: element.volume
      }
    });
    return false;
  }
}
