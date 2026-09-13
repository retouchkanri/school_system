/**
 * Thin scaffolding for a future OpenAI Realtime (WebRTC) session.
 * Not connected yet — Priority B is 3D look + lip sync via TTS.
 */
import type { RealtimeSessionScaffold } from "./types";

export function createRealtimeSessionScaffold(
  onRemoteAudio?: (stream: MediaStream) => void,
): RealtimeSessionScaffold {
  let pc: RTCPeerConnection | null = null;

  return {
    async connect() {
      // FUTURE: create RTCPeerConnection, negotiate with OpenAI Realtime API,
      // attach remote audio track, then call onRemoteAudio(stream).
      console.info(
        "[akari-realtime] scaffold only — wire WebRTC + OpenAI Realtime here when ready.",
      );
      void onRemoteAudio;
      void pc;
    },
    disconnect() {
      pc?.close();
      pc = null;
    },
    attachRemoteAudio(stream: MediaStream) {
      onRemoteAudio?.(stream);
    },
  };
}
