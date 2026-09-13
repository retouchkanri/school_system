/**
 * Avatar Controller — audio → lip sync, emotion → expression, intent → gesture.
 *
 * Produces ARKit-like blendshape weights. Today: browser Web Audio Analyser
 * (amplitude + spectrum → viseme-ish mouth). Tomorrow: swap `setExternalBlendshapes`
 * / Audio2Face ACE without changing the 3D avatar consumer.
 */

import {
  createNeutralBlendshapes,
  type ArkitBlendshapes,
  type AvatarControllerState,
  type AvatarEmotion,
  type AvatarGesture,
} from "./types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class AvatarController {
  private blendshapes: ArkitBlendshapes = createNeutralBlendshapes();
  private emotion: AvatarEmotion = "neutral";
  private gesture: AvatarGesture = "idle";
  private speaking = false;
  private mouthOpen = 0;
  private breath = 0;
  private swayX = 0;
  private swayY = 0;
  private headTilt = 0;
  private blinkTimer = 0;
  private nextBlinkIn = 2.4;
  private gestureT = 0;
  private externalOverride: ArkitBlendshapes | null = null;
  private startedAt = performance.now();

  /**
   * FUTURE HOOK — NVIDIA Audio2Face / ACE:
   * Push ARKit-compatible weights from a remote A2F stream here.
   * When set, analyser-driven mouth update is skipped until cleared.
   */
  setExternalBlendshapes(weights: ArkitBlendshapes | null) {
    this.externalOverride = weights;
  }

  setEmotion(emotion: AvatarEmotion) {
    this.emotion = emotion;
  }

  setGesture(gesture: AvatarGesture) {
    this.gesture = gesture;
    this.gestureT = 0;
  }

  setSpeaking(speaking: boolean) {
    this.speaking = speaking;
    if (speaking) this.emotion = "speaking";
  }

  /**
   * Drive lip sync from Web Audio Analyser frequency + time-domain data.
   * Maps mid-band energy + peak amplitude to jaw/mouth ARKit keys (viseme proxy).
   */
  updateFromAnalyser(freq: Uint8Array, time: Uint8Array, dt: number) {
    if (this.externalOverride) {
      this.blendshapes = { ...this.externalOverride };
      this.mouthOpen = clamp01(this.blendshapes.jawOpen);
      this.tickIdle(dt);
      return;
    }

    let band = 0;
    const bandEnd = Math.min(freq.length, 48);
    for (let i = 2; i < bandEnd; i++) band += freq[i];
    const bandAvg = band / Math.max(1, bandEnd - 2) / 255;

    // High-mid for “consonant” brightness → funnel/pucker hints
    let bright = 0;
    const brightStart = Math.min(freq.length, 48);
    const brightEnd = Math.min(freq.length, 96);
    for (let i = brightStart; i < brightEnd; i++) bright += freq[i];
    const brightAvg = bright / Math.max(1, brightEnd - brightStart) / 255;

    let peak = 0;
    let rms = 0;
    for (let i = 0; i < time.length; i++) {
      const v = (time[i] - 128) / 128;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      rms += v * v;
    }
    rms = Math.sqrt(rms / Math.max(1, time.length));

    const raw = clamp01(bandAvg * 2.4 + peak * 1.5 + rms * 1.1);
    this.mouthOpen = lerp(this.mouthOpen, this.speaking ? raw : 0, this.speaking ? 0.55 : 0.25);

    const jaw = clamp01(this.mouthOpen * 1.05);
    const funnel = clamp01(brightAvg * 1.8 * this.mouthOpen);
    const pucker = clamp01((1 - brightAvg) * this.mouthOpen * 0.35);
    const lower = clamp01(jaw * 0.85);

    this.blendshapes = {
      ...this.blendshapes,
      jawOpen: jaw,
      mouthClose: clamp01(1 - jaw * 1.2) * (this.speaking ? 0.15 : 0.4),
      mouthFunnel: funnel,
      mouthPucker: pucker,
      mouthLowerDownLeft: lower,
      mouthLowerDownRight: lower,
      mouthUpperUpLeft: clamp01(jaw * 0.35 + funnel * 0.2),
      mouthUpperUpRight: clamp01(jaw * 0.35 + funnel * 0.2),
      mouthStretchLeft: clamp01(this.mouthOpen * 0.25),
      mouthStretchRight: clamp01(this.mouthOpen * 0.25),
    };

    this.tickIdle(dt);
  }

  /** Fallback when AnalyserNode is unavailable — rhythmic pseudo visemes. */
  updateFakeSpeech(dt: number) {
    if (this.externalOverride) {
      this.blendshapes = { ...this.externalOverride };
      this.mouthOpen = clamp01(this.blendshapes.jawOpen);
      this.tickIdle(dt);
      return;
    }
    const t = (performance.now() - this.startedAt) / 1000;
    const pulse = this.speaking
      ? 0.22 + 0.55 * Math.abs(Math.sin(t * 9.5)) * (0.55 + 0.45 * Math.sin(t * 3.1))
      : 0;
    this.mouthOpen = lerp(this.mouthOpen, pulse, 0.45);
    this.blendshapes.jawOpen = this.mouthOpen;
    this.blendshapes.mouthLowerDownLeft = this.mouthOpen * 0.8;
    this.blendshapes.mouthLowerDownRight = this.mouthOpen * 0.8;
    this.tickIdle(dt);
  }

  /** Call each frame when idle (no audio tick). */
  tick(dt: number) {
    if (!this.speaking && !this.externalOverride) {
      this.mouthOpen = lerp(this.mouthOpen, 0, 0.2);
      this.blendshapes.jawOpen = this.mouthOpen;
      this.blendshapes.mouthFunnel = lerp(this.blendshapes.mouthFunnel, 0, 0.2);
      this.blendshapes.mouthPucker = lerp(this.blendshapes.mouthPucker, 0, 0.2);
    }
    this.tickIdle(dt);
  }

  private tickIdle(dt: number) {
    const t = (performance.now() - this.startedAt) / 1000;
    this.breath = 0.5 + 0.5 * Math.sin(t * 1.35);
    this.swayX = Math.sin(t * 0.55) * 0.012 + Math.sin(t * 1.1) * 0.004;
    this.swayY = Math.sin(t * 0.7) * 0.008;

    // Emotion expression overlays
    const smile =
      this.emotion === "happy" || this.emotion === "speaking"
        ? 0.28
        : this.emotion === "listening"
          ? 0.18
          : 0.1;
    const brow =
      this.emotion === "thinking" ? 0.35 : this.emotion === "listening" ? 0.12 : 0.04;
    this.blendshapes.mouthSmileLeft = lerp(this.blendshapes.mouthSmileLeft, smile, 0.08);
    this.blendshapes.mouthSmileRight = lerp(this.blendshapes.mouthSmileRight, smile, 0.08);
    this.blendshapes.browInnerUp = lerp(this.blendshapes.browInnerUp, brow, 0.08);
    this.blendshapes.cheekSquintLeft = lerp(
      this.blendshapes.cheekSquintLeft,
      smile * 0.4,
      0.08,
    );
    this.blendshapes.cheekSquintRight = this.blendshapes.cheekSquintLeft;

    // Blink
    this.blinkTimer += dt;
    if (this.blinkTimer >= this.nextBlinkIn) {
      this.blinkTimer = 0;
      this.nextBlinkIn = 2.2 + Math.random() * 3.5;
    }
    const b =
      this.blinkTimer < 0.14 ? Math.sin(clamp01(this.blinkTimer / 0.14) * Math.PI) : 0;
    this.blendshapes.eyeBlinkLeft = b;
    this.blendshapes.eyeBlinkRight = b * 0.95;

    // Gestures
    this.gestureT += dt;
    if (this.gesture === "nod") {
      this.headTilt = Math.sin(this.gestureT * 6) * 0.08 * Math.exp(-this.gestureT * 1.2);
      if (this.gestureT > 1.4) this.gesture = "idle";
    } else if (this.gesture === "lean_in") {
      this.swayY -= 0.01;
      this.headTilt = -0.04;
      if (this.gestureT > 2) this.gesture = "idle";
    } else if (this.gesture === "wave_subtle") {
      this.swayX += Math.sin(this.gestureT * 8) * 0.01 * Math.exp(-this.gestureT);
      if (this.gestureT > 1.6) this.gesture = "idle";
    } else {
      this.headTilt = lerp(this.headTilt, Math.sin(t * 0.4) * 0.015, 0.05);
    }
  }

  getState(): AvatarControllerState {
    return {
      blendshapes: { ...this.blendshapes },
      emotion: this.emotion,
      gesture: this.gesture,
      speaking: this.speaking,
      mouthOpen: this.mouthOpen,
      breath: this.breath,
      swayX: this.swayX,
      swayY: this.swayY,
      headTilt: this.headTilt,
    };
  }
}
