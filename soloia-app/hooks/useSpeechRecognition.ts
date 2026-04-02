"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API type declarations (not in @types/node)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null;
}

interface ISpeechRecognitionEvent extends Event {
  results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionResultList {
  [index: number]: ISpeechRecognitionResult;
  length: number;
}

interface ISpeechRecognitionResult {
  [index: number]: ISpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface ISpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface UseSpeechRecognitionOptions {
  onResult: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
  lang?: "en" | "pt";
}

export function useSpeechRecognition({
  onResult,
  onError,
  onStart,
  onEnd,
  onAudioLevel,
  lang = "en",
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sr = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!sr);
    }
  }, []);

  // Audio level monitoring via Web Audio API
  const startAudioMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        const level = Math.min(avg / 80, 1);
        onAudioLevel?.(level);
        animFrameRef.current = requestAnimationFrame(tick);
      }

      tick();
    } catch {
      // Microphone permission denied or unavailable — silent fail
    }
  }, [onAudioLevel]);

  const stopAudioMonitoring = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onAudioLevel?.(0);
  }, [onAudioLevel]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      onError?.(
        "Speech recognition is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    // Stop any existing session
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      onStart?.();
      startAudioMonitoring();
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const results = event.results[0];
      const best = results[0];
      onResult({
        transcript: best.transcript,
        confidence: best.confidence,
      });
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      const messages: Record<string, Record<string, string>> = {
        "not-allowed": {
          pt: "Microfone não detectado ou permissão negada. Por favor, digite sua busca na barra abaixo.",
          en: "Microphone not detected or permission denied. Please type your search in the bar below.",
        },
        "no-speech": {
          pt: "Nenhuma fala detectada. Tente novamente.",
          en: "No speech detected. Try again.",
        },
        "audio-capture": {
          pt: "Microfone não detectado. Por favor, digite sua busca na barra abaixo.",
          en: "Microphone not detected. Please type your search in the bar below.",
        },
        network: {
          pt: "Erro de rede durante o reconhecimento de voz.",
          en: "Network error during speech recognition.",
        },
      };

      const msgObj = messages[event.error];
      const msg = msgObj ? msgObj[lang] : (lang === 'pt' ? `Erro de fala: ${event.error}` : `Speech error: ${event.error}`);
      
      if (event.error !== "aborted") {
        onError?.(msg);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      stopAudioMonitoring();
      onEnd?.();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult, onError, onStart, onEnd, startAudioMonitoring, stopAudioMonitoring]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    stopAudioMonitoring();
  }, [stopAudioMonitoring]);

  return { isListening, isSupported, startListening, stopListening };
}
