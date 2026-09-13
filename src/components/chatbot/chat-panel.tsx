"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { AvatarController } from "./avatar-controller";
import { createRealtimeSessionScaffold } from "./realtime-scaffold";

const AvatarCanvas = dynamic(() => import("./avatar-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
    </div>
  ),
});

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "こんにちは、あかりです。東関東馬事学院の案内を担当しています。入学・見学・資料請求など、なんでも聞いてくださいね。",
};

const AVATAR_SRC = "/images/chat-avatar-cutout.png";
const AVATAR_FALLBACK = "/images/chat-avatar.jpg";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * AIビデオチャットのモーダル。
 * 3Dアバター (R3F) + AvatarController リップシンク + OpenAI TTS。
 */
export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const [transcribing, setTranscribing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRafRef = useRef<number | null>(null);
  const speakGenRef = useRef(0);
  const messagesRef = useRef(messages);
  const pendingRef = useRef(pending);
  const voiceOnRef = useRef(voiceOn);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const sttModeRef = useRef<"speech" | "whisper" | null>(null);
  const listeningRef = useRef(false);
  const controllerRef = useRef<AvatarController | null>(null);
  if (!controllerRef.current) controllerRef.current = new AvatarController();
  const controller = controllerRef.current;

  // Scaffold only — Realtime WebRTC not enabled (Priority B).
  const realtimeRef = useRef(createRealtimeSessionScaffold());

  messagesRef.current = messages;
  pendingRef.current = pending;
  voiceOnRef.current = voiceOn;

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, pending, interimSpeech]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      stopListening(false);
      stopSpeaking();
      controller.setEmotion("neutral");
      controller.setGesture("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopListening(false);
      stopSpeaking();
      realtimeRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listening) {
      controller.setEmotion("listening");
      controller.setGesture("lean_in");
    } else if (pending || transcribing) {
      controller.setEmotion("thinking");
    } else if (!speaking) {
      controller.setEmotion("happy");
    }
  }, [listening, pending, transcribing, speaking, controller]);

  function stopSpeaking() {
    speakGenRef.current += 1;
    if (analyserRafRef.current != null) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    controller.setSpeaking(false);
    setSpeaking(false);
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }

  function clearMicStream() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
  }

  function stopListening(keepInterim = false) {
    listeningRef.current = false;
    setListening(false);
    if (!keepInterim) setInterimSpeech("");
    sttModeRef.current = null;

    const rec = recognitionRef.current;
    if (rec) {
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    } else {
      clearMicStream();
    }
  }

  async function speak(text: string) {
    if (!voiceOnRef.current || !text.trim()) return;
    stopSpeaking();
    const gen = speakGenRef.current;

    try {
      const res = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || gen !== speakGenRef.current) return;

      const blob = await res.blob();
      if (gen !== speakGenRef.current) return;

      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audioRef.current = audio;
      controller.setSpeaking(true);
      controller.setEmotion("speaking");
      controller.setGesture("nod");
      setSpeaking(true);

      const finish = () => {
        if (gen === speakGenRef.current) stopSpeaking();
      };

      let lastT = performance.now();

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        const freq = new Uint8Array(analyser.frequencyBinCount);
        const time = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (gen !== speakGenRef.current) return;
          const now = performance.now();
          const dt = Math.min(0.05, (now - lastT) / 1000);
          lastT = now;
          analyser.getByteFrequencyData(freq);
          analyser.getByteTimeDomainData(time);
          controller.updateFromAnalyser(freq, time, dt);
          analyserRafRef.current = requestAnimationFrame(tick);
        };

        await ctx.resume();
        if (gen !== speakGenRef.current) return;
        analyserRafRef.current = requestAnimationFrame(tick);
      } catch {
        const fakeTick = () => {
          if (gen !== speakGenRef.current) return;
          const now = performance.now();
          const dt = Math.min(0.05, (now - lastT) / 1000);
          lastT = now;
          controller.updateFakeSpeech(dt);
          analyserRafRef.current = requestAnimationFrame(fakeTick);
        };
        analyserRafRef.current = requestAnimationFrame(fakeTick);
      }

      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
    } catch {
      if (gen === speakGenRef.current) stopSpeaking();
    }
  }

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || pendingRef.current) return;

    stopListening(false);
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messagesRef.current, userMessage];
    setMessages(nextMessages);
    setInput("");
    setInterimSpeech("");
    setError(null);
    setPending(true);
    stopSpeaking();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました");
        return;
      }
      const reply = typeof data.reply === "string" ? data.reply : "";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      if (reply) void speak(reply);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(false);
    }
  }

  async function transcribeWithWhisper(blob: Blob) {
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      const type = blob.type || "audio/webm";
      const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
      form.append("file", blob, `speech.${ext}`);
      const res = await fetch("/api/chat/stt", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "音声認識に失敗しました");
        return;
      }
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!text) {
        setError("うまく聞き取れませんでした。もう一度お試しください。");
        return;
      }
      await sendText(text);
    } catch {
      setError("音声認識で通信エラーが発生しました");
    } finally {
      setTranscribing(false);
    }
  }

  async function startWhisperRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("このブラウザではマイク入力に対応していません");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];

      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = mimeCandidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      sttModeRef.current = "whisper";
      listeningRef.current = true;
      setListening(true);
      setInterimSpeech("録音中…（もう一度マイクを押すと送信）");
      setError(null);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const chunks = mediaChunksRef.current;
        const type = recorder.mimeType || "audio/webm";
        clearMicStream();
        listeningRef.current = false;
        setListening(false);
        setInterimSpeech("");
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type });
        void transcribeWithWhisper(blob);
      };

      recorder.start();
    } catch {
      clearMicStream();
      listeningRef.current = false;
      setListening(false);
      setInterimSpeech("");
      setError("マイクへのアクセスが拒否されました");
    }
  }

  function startBrowserSpeech() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      void startWhisperRecording();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    sttModeRef.current = "speech";
    listeningRef.current = true;
    setListening(true);
    setInterimSpeech("");
    setError(null);
    stopSpeaking();

    let finalized = false;

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += piece;
        else interim += piece;
      }
      if (interim) setInterimSpeech(interim);
      if (finalText.trim()) {
        finalized = true;
        const text = finalText.trim();
        setInterimSpeech("");
        stopListening(false);
        void sendText(text);
      }
    };

    recognition.onerror = (event) => {
      const err = event.error ?? "";
      if (err === "aborted" || err === "no-speech") {
        stopListening(false);
        if (err === "no-speech") setError("音声が検出できませんでした");
        return;
      }
      stopListening(false);
      void startWhisperRecording();
    };

    recognition.onend = () => {
      if (!finalized && listeningRef.current && sttModeRef.current === "speech") {
        listeningRef.current = false;
        setListening(false);
        setInterimSpeech("");
      }
    };

    try {
      recognition.start();
    } catch {
      stopListening(false);
      void startWhisperRecording();
    }
  }

  function toggleMic() {
    if (pending || transcribing) return;
    if (listening) {
      if (sttModeRef.current === "whisper") {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === "recording") {
          recorder.stop();
          return;
        }
      }
      stopListening(false);
      return;
    }
    startBrowserSpeech();
  }

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(input);
    }
  }

  function toggleVoice() {
    if (voiceOn) {
      stopSpeaking();
      setVoiceOn(false);
    } else {
      setVoiceOn(true);
    }
  }

  const statusLabel = transcribing
    ? "文字起こし中…"
    : listening
      ? "聞いています…"
      : pending
        ? "考えています…"
        : speaking
          ? "お話し中…"
          : "オンライン";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="チャットを閉じる"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="あかり — AIビデオチャット"
        className="relative z-[1] flex h-[min(92vh,720px)] w-full max-w-[440px] flex-col overflow-hidden border border-brand-200/80 bg-white shadow-2xl sm:max-w-[480px]"
      >
        {/* Avatar stage — soft brand wash behind transparent R3F canvas */}
        <div className="relative h-[42%] min-h-[200px] shrink-0 overflow-hidden sm:min-h-[220px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,255,255,0.14) 0%, transparent 55%), linear-gradient(165deg, #1a3a2e 0%, #0f241c 45%, #0a1812 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <AvatarCanvas controller={controller} className="absolute inset-0 z-[1]" />

          <div className="absolute left-3 top-3 z-[2] flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  listening || pending || speaking || transcribing
                    ? "animate-pulse bg-accent-500"
                    : "bg-emerald-400"
                }`}
              />
              {statusLabel}
            </span>
          </div>

          <div className="absolute right-2 top-2 z-[2] flex gap-1">
            <button
              type="button"
              onClick={toggleVoice}
              className="rounded-md bg-black/45 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
              aria-label={voiceOn ? "音声をオフ" : "音声をオン"}
              title={voiceOn ? "音声をオフ" : "音声をオン"}
            >
              {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-black/45 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
              aria-label="チャットを閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[2]">
            <p className="text-base font-bold tracking-wide text-white drop-shadow">あかり</p>
            <p className="text-[11px] text-brand-100/95">東関東馬事学院 案内スタッフ</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/80 px-3 py-2">
          <p className="text-[11px] text-brand-800">3Dアバター · 音声ガイド付き</p>
          {!voiceOn && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
              <MicOff className="h-3 w-3" />
              ミュート中
            </span>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
              {m.role === "assistant" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={AVATAR_SRC}
                  alt=""
                  className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-brand-100 object-cover object-top ring-1 ring-brand-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = AVATAR_FALLBACK;
                  }}
                />
              )}
              <div
                className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-brand-50 text-gray-800 ring-1 ring-brand-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {interimSpeech && (
            <div className="flex justify-end">
              <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-dashed border-brand-300 bg-brand-50/70 px-3 py-2 text-sm leading-relaxed text-brand-800/80">
                {interimSpeech}
              </div>
            </div>
          )}

          {(pending || transcribing) && (
            <div className="flex justify-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={AVATAR_SRC}
                alt=""
                className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-brand-100 object-cover object-top ring-1 ring-brand-200"
              />
              <div className="rounded-2xl rounded-bl-md bg-brand-50 px-3 py-2 text-sm text-brand-700 ring-1 ring-brand-100">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-brand-100 bg-white p-3">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={pending || transcribing}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                listening
                  ? "border-red-400 bg-red-500 text-white hover:bg-red-600"
                  : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
              }`}
              aria-label={listening ? "音声入力を停止" : "マイクで話す"}
              title={listening ? "音声入力を停止" : "マイクで話す"}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={listening ? "話してください…" : "あかりに質問する…"}
              className="max-h-28 flex-1 resize-none rounded-xl border border-brand-200 bg-brand-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              disabled={pending || listening || transcribing}
            />
            <button
              type="button"
              onClick={() => void sendText(input)}
              disabled={pending || listening || transcribing || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="送信"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-500">
            マイク: ブラウザ音声認識 (日本語) · 失敗時は Whisper で文字起こし
          </p>
        </div>
      </div>
    </div>
  );
}
