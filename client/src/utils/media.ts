/**
 * tryPlayMedia()
 * Safely attempts to play a given HTMLMediaElement.
 * Returns true if playback succeeded, false if blocked (autoplay policy, etc).
 * Used in WebRTC modals to handle autoplay restrictions gracefully.
 */
export async function tryPlayMedia(element: HTMLMediaElement | null): Promise<boolean> {
  if (!element) return false;

  try {
    await element.play();
    console.debug("[tryPlayMedia] Playback succeeded");
    return true;
  } catch (err) {
    console.debug("[tryPlayMedia] Playback blocked or failed:", err);
    return false;
  }
}
