"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "こんにちは、あかりです。東関東馬事学院の案内を担当しています。入学・見学・資料請求など、なんでも聞いてくださいね。",
};

const AVATAR_SRC = "/images/chat-avatar.jpg";

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
 * ヘッダーのチャットアイコンから開閉する。
 * OpenAI チャット + TTS (nova) + Web Audio リップシンク。
 * 音声入力は Web Speech API (ja-JP)、失敗時は Whisper にフォールバック。
 */
export default function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [lipLevel, setLipLevel] = useState(0);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopListening(false);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopSpeaking() {
    speakGenRef.current += 1;
    if (analyserRafRef.current != null) {
      cancelAnimationFrame(analyserRafRef.current);
      analyserRafRef.current = null;
    }
    setLipLevel(0);
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
      setSpeaking(true);

      const finish = () => {
        if (gen === speakGenRef.current) stopSpeaking();
      };

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
          analyser.getByteFrequencyData(freq);
          analyser.getByteTimeDomainData(time);

          // 中低域のエネルギー + 波形振幅で口の開きを推定
          let band = 0;
          const bandEnd = Math.min(freq.length, 48);
          for (let i = 2; i < bandEnd; i++) band += freq[i];
          const bandAvg = band / Math.max(1, bandEnd - 2) / 255;

          let peak = 0;
          for (let i = 0; i < time.length; i++) {
            const v = Math.abs(time[i] - 128) / 128;
            if (v > peak) peak = v;
          }

          const level = Math.min(1, bandAvg * 2.6 + peak * 1.4);
          setLipLevel((prev) => prev * 0.35 + level * 0.65);
          analyserRafRef.current = requestAnimationFrame(tick);
        };

        await ctx.resume();
        if (gen !== speakGenRef.current) return;
        analyserRafRef.current = requestAnimationFrame(tick);
      } catch {
        // Analyser が使えなくても再生は続行（疑似口パク）
        const started = performance.now();
        const fakeTick = () => {
          if (gen !== speakGenRef.current) return;
          const t = (performance.now() - started) / 1000;
          const pulse = 0.25 + 0.55 * Math.abs(Math.sin(t * 9.5)) * (0.55 + 0.45 * Math.sin(t * 3.1));
          setLipLevel(pulse);
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
      // ブラウザ STT が不安定な場合は Whisper にフォールバック
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

  const mouthOpen = speaking ? 0.18 + lipLevel * 0.82 : 0;
  const jawShift = speaking ? lipLevel * 6 : 0;

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
        <div className="relative h-[40%] min-h-[180px] shrink-0 overflow-hidden bg-brand-900 sm:min-h-[200px]">
          <div className={`absolute inset-0 ${speaking ? "akari-avatar-speak" : "akari-avatar-idle"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AVATAR_SRC}
              alt="案内スタッフ あかり"
              className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
              draggable={false}
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-800/25 to-transparent" />

          {/* 口パク: 振幅連動の顎・口楕円 */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute left-1/2 top-[56%] w-[22%] max-w-[72px] -translate-x-1/2"
              style={{
                opacity: speaking ? 0.92 : 0,
                transition: speaking ? "opacity 60ms linear" : "opacity 280ms ease",
              }}
            >
              <div
                className="mx-auto origin-top rounded-[50%] bg-[#3a1f1a]"
                style={{
                  width: `${55 + lipLevel * 28}%`,
                  height: `${6 + mouthOpen * 22}px`,
                  transform: `translateY(${jawShift * 0.35}px) scaleY(${0.55 + mouthOpen * 1.35})`,
                  boxShadow: `0 ${2 + lipLevel * 4}px ${6 + lipLevel * 10}px rgba(0,0,0,0.35)`,
                }}
              />
              <div
                className="mx-auto mt-[-2px] h-[3px] w-[42%] rounded-full bg-[#c4786a]/40"
                style={{
                  opacity: 0.35 + lipLevel * 0.45,
                  transform: `scaleX(${0.7 + lipLevel * 0.5})`,
                }}
              />
            </div>
          </div>

          <div className="absolute left-3 top-3 flex items-center gap-2">
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

          <div className="absolute right-2 top-2 flex gap-1">
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

          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-base font-bold tracking-wide text-white drop-shadow">あかり</p>
            <p className="text-[11px] text-brand-100/95">東関東馬事学院 案内スタッフ</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/80 px-3 py-2">
          <p className="text-[11px] text-brand-800">ビデオチャット · 音声ガイド付き</p>
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
                  className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover object-top ring-1 ring-brand-200"
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
                className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover object-top ring-1 ring-brand-200"
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
