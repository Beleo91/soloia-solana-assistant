"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type TTSState = "idle" | "playing" | "paused";

export function useTTS() {
  const [state, setState] = useState<TTSState>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load and filter voices
  const updateVoices = useCallback(() => {
    if (!synth) return;
    const availableVoices = synth.getVoices();
    setVoices(availableVoices);
  }, [synth]);

  useEffect(() => {
    updateVoices();
    if (synth?.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = updateVoices;
    }
  }, [synth, updateVoices]);

  const getBestVoice = useCallback((lang: "en" | "pt") => {
    if (voices.length === 0) return null;

    if (lang === "pt") {
      // Prefer "Google" or "Natural" for PT-BR
      const ptBrVoices = voices.filter(v => v.lang.includes("pt-BR") || v.lang.includes("pt_BR"));
      return (
        ptBrVoices.find(v => v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("natural")) ||
        ptBrVoices[0] || 
        null
      );
    } else {
      // Prefer "Google US English", "Microsoft Zira", or "Microsoft Mark" for EN
      const enUsVoices = voices.filter(v => v.lang.includes("en-US") || v.lang.includes("en_US"));
      return (
        enUsVoices.find(v => v.name.includes("Google US English")) ||
        enUsVoices.find(v => v.name.includes("Zira")) ||
        enUsVoices.find(v => v.name.includes("Mark")) ||
        enUsVoices[0] ||
        null
      );
    }
  }, [voices]);

  const speak = useCallback((text: string, lang: "en" | "pt" = "pt") => {
    if (!synth) return;

    // Stop current
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getBestVoice(lang);
    if (voice) utterance.voice = voice;
    
    utterance.lang = lang === "pt" ? "pt-BR" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setState("playing");
    utterance.onend = () => setState("idle");
    utterance.onerror = () => setState("idle");

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [synth, getBestVoice]);

  const pause = useCallback(() => {
    if (!synth) return;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setState("paused");
    }
  }, [synth]);

  const resume = useCallback(() => {
    if (!synth) return;
    if (synth.paused) {
      synth.resume();
      setState("playing");
    }
  }, [synth]);

  const stop = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    setState("idle");
  }, [synth]);

  return {
    state,
    speak,
    pause,
    resume,
    stop,
    isPlaying: state === "playing",
    isPaused: state === "paused",
  };
}
