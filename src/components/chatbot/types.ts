/**
 * ARKit-compatible blendshape weights.
 * Subset of Apple ARKit face blendshapes — enough for lip sync + expression.
 * Future: map Audio2Face / ACE output into the same shape keys.
 */
export type ArkitBlendshapes = {
  jawOpen: number;
  mouthClose: number;
  mouthFunnel: number;
  mouthPucker: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthStretchLeft: number;
  mouthStretchRight: number;
  mouthUpperUpLeft: number;
  mouthUpperUpRight: number;
  mouthLowerDownLeft: number;
  mouthLowerDownRight: number;
  browInnerUp: number;
  browDownLeft: number;
  browDownRight: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
};

export type AvatarEmotion = "neutral" | "happy" | "thinking" | "listening" | "speaking";

export type AvatarGesture = "idle" | "nod" | "lean_in" | "wave_subtle";

export type AvatarControllerState = {
  blendshapes: ArkitBlendshapes;
  emotion: AvatarEmotion;
  gesture: AvatarGesture;
  speaking: boolean;
  /** 0–1 aggregate mouth openness (convenience for simple meshes) */
  mouthOpen: number;
  /** Body sway / breath phase drivers */
  breath: number;
  swayX: number;
  swayY: number;
  headTilt: number;
};

export function createNeutralBlendshapes(): ArkitBlendshapes {
  return {
    jawOpen: 0,
    mouthClose: 0,
    mouthFunnel: 0,
    mouthPucker: 0,
    mouthSmileLeft: 0.12,
    mouthSmileRight: 0.12,
    mouthStretchLeft: 0,
    mouthStretchRight: 0,
    mouthUpperUpLeft: 0,
    mouthUpperUpRight: 0,
    mouthLowerDownLeft: 0,
    mouthLowerDownRight: 0,
    browInnerUp: 0,
    browDownLeft: 0,
    browDownRight: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    cheekSquintLeft: 0,
    cheekSquintRight: 0,
  };
}

/** Optional future Realtime / WebRTC session hook (not wired yet). */
export type RealtimeSessionScaffold = {
  connect: (opts?: { model?: string }) => Promise<void>;
  disconnect: () => void;
  /** Push remote audio media stream into the AvatarController analyser path */
  attachRemoteAudio: (stream: MediaStream) => void;
};
