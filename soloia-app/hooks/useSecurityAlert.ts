"use client";

import { useCallback } from "react";

/**
 * SOLOIA Security Alert Sound
 * Usa Web Audio API para gerar tons de alerta SEM precisar de arquivos de áudio.
 * Tudo é gerado matematicamente em tempo real no browser.
 */
export function useSecurityAlert() {
  const playAlert = useCallback((severity: "critical" | "warning" | "safe") => {
    if (typeof window === "undefined") return;

    try {
      const audioCtx = new AudioContext();

      if (severity === "critical") {
        // Tom de alerta crítico: 3 beeps urgentes em frequência alta
        const beepTimings = [0, 0.15, 0.30];
        beepTimings.forEach((startTime) => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          // Sweep de frequência — soa como sirene
          oscillator.type = "sawtooth";
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + startTime);
          oscillator.frequency.linearRampToValueAtTime(
            440,
            audioCtx.currentTime + startTime + 0.12
          );

          gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
          gainNode.gain.linearRampToValueAtTime(
            0.25,
            audioCtx.currentTime + startTime + 0.01
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            audioCtx.currentTime + startTime + 0.12
          );

          oscillator.start(audioCtx.currentTime + startTime);
          oscillator.stop(audioCtx.currentTime + startTime + 0.13);
        });

        // Fecha o contexto após os tons
        setTimeout(() => audioCtx.close(), 600);
      } else if (severity === "warning") {
        // Tom de aviso: 2 beeps médios
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(550, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.3
        );

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.32);

        setTimeout(() => audioCtx.close(), 500);
      } else {
        // Tom positivo: chime ascendente
        const notes = [523, 659, 784]; // C5, E5, G5 — acorde de dó maior
        notes.forEach((freq, i) => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);

          gainNode.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.08);
          gainNode.gain.linearRampToValueAtTime(
            0.12,
            audioCtx.currentTime + i * 0.08 + 0.01
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            audioCtx.currentTime + i * 0.08 + 0.4
          );

          oscillator.start(audioCtx.currentTime + i * 0.08);
          oscillator.stop(audioCtx.currentTime + i * 0.08 + 0.42);
        });

        setTimeout(() => audioCtx.close(), 700);
      }
    } catch {
      // Browser bloqueou o áudio (política de autoplay) — silencia graciosamente
    }
  }, []);

  return { playAlert };
}
