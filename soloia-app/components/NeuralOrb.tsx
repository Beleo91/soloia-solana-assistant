"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect } from "react";

type OrbState = "idle" | "listening" | "processing" | "result" | "error";

interface NeuralOrbProps {
  state: OrbState;
  onClick: () => void;
  audioLevel?: number; // 0-1
}

const ORB_CONFIGS = {
  idle: {
    primary: "#9945ff",
    secondary: "#6b21ff",
    glow: "rgba(153, 69, 255, 0.4)",
    label: "TAP TO SPEAK",
    subLabel: "Ask about any Solana term",
    ringColor: "rgba(153, 69, 255, 0.2)",
  },
  listening: {
    primary: "#14f195",
    secondary: "#00c983",
    glow: "rgba(20, 241, 149, 0.5)",
    label: "LISTENING...",
    subLabel: "Speak naturally",
    ringColor: "rgba(20, 241, 149, 0.25)",
  },
  processing: {
    primary: "#00c3ff",
    secondary: "#0096cc",
    glow: "rgba(0, 195, 255, 0.5)",
    label: "PROCESSING",
    subLabel: "Searching the Solana glossary",
    ringColor: "rgba(0, 195, 255, 0.2)",
  },
  result: {
    primary: "#9945ff",
    secondary: "#14f195",
    glow: "rgba(153, 69, 255, 0.4)",
    label: "TAP TO SPEAK AGAIN",
    subLabel: "Result displayed below",
    ringColor: "rgba(153, 69, 255, 0.15)",
  },
  error: {
    primary: "#ff4757",
    secondary: "#cc2233",
    glow: "rgba(255, 71, 87, 0.4)",
    label: "TAP TO RETRY",
    subLabel: "Speech not recognized",
    ringColor: "rgba(255, 71, 87, 0.2)",
  },
};

export function NeuralOrb({ state, onClick, audioLevel = 0 }: NeuralOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const config = ORB_CONFIGS[state];

  // Canvas particle system for the orb interior
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 200;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
      maxLife: number;
    }> = [];

    const cx = 100;
    const cy = 100;
    const radius = 80;

    function spawnParticle() {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.7;
      particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        life: 0,
        maxLife: 60 + Math.random() * 60,
      });
    }

    // Pre-spawn particles
    for (let i = 0; i < 30; i++) spawnParticle();

    let frame = 0;
    function draw() {
      ctx!.clearRect(0, 0, 200, 200);

      frame++;
      if (frame % 3 === 0 && particles.length < 50) {
        spawnParticle();
      }

      // Draw + update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Keep within orb bounds
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius * 0.8) {
          p.vx *= -0.8;
          p.vy *= -0.8;
        }

        const progress = p.life / p.maxLife;
        const fadeOpacity =
          progress < 0.2
            ? progress / 0.2
            : progress > 0.8
            ? (1 - progress) / 0.2
            : 1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle =
          state === "listening"
            ? `rgba(20, 241, 149, ${p.opacity * fadeOpacity * 0.7})`
            : state === "processing"
            ? `rgba(0, 195, 255, ${p.opacity * fadeOpacity * 0.7})`
            : state === "error"
            ? `rgba(255, 71, 87, ${p.opacity * fadeOpacity * 0.7})`
            : `rgba(153, 69, 255, ${p.opacity * fadeOpacity * 0.7})`;
        ctx!.fill();

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state]);

  const isListening = state === "listening";
  const isProcessing = state === "processing";
  const dynamicScale = isListening ? 1 + audioLevel * 0.15 : 1;

  return (
    <div className="flex flex-col items-center gap-8 pointer-events-none">
      {/* Orb wrapper */}
      <div className="relative flex items-center justify-center pointer-events-none" style={{ width: 260, height: 260 }}>
        
        {/* Outermost spinning ring */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ opacity: isListening || isProcessing ? 1 : 0.4 }}
        >
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r="125"
              fill="none"
              stroke={config.primary}
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="8 12"
            />
          </svg>
        </motion.div>

        {/* Second ring counter-spin */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ width: 220, height: 220 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r="106"
              fill="none"
              stroke={config.secondary}
              strokeWidth="1.5"
              strokeOpacity={isListening ? 0.6 : 0.2}
              strokeDasharray="4 16"
            />
          </svg>
        </motion.div>

        {/* Pulsing glow rings */}
        <AnimatePresence>
          {(isListening || isProcessing) && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  initial={{ scale: 0.6, opacity: 0.6 }}
                  animate={{ scale: 1.4 + i * 0.2, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeOut",
                  }}
                  style={{
                    border: `2px solid ${config.primary}`,
                    boxShadow: `0 0 20px ${config.glow}`,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Main orb button */}
        <motion.button
          id="neural-orb"
          aria-label={`SOLOIA Neural Orb - ${config.label}`}
          onClick={onClick}
          className="relative rounded-full overflow-hidden cursor-pointer z-10 flex items-center justify-center pointer-events-auto"
          style={{
            width: 200,
            height: 200,
            boxShadow: `0 0 40px ${config.glow}, 0 0 80px ${config.glow}, inset 0 0 60px rgba(0,0,0,0.5)`,
          }}
          animate={{
            scale: dynamicScale,
            boxShadow: isListening
              ? [
                  `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
                  `0 0 60px ${config.glow}, 0 0 120px ${config.glow}`,
                  `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
                ]
              : isProcessing
              ? [
                  `0 0 30px ${config.glow}, 0 0 60px ${config.glow}`,
                  `0 0 50px ${config.glow}, 0 0 100px ${config.glow}`,
                  `0 0 30px ${config.glow}, 0 0 60px ${config.glow}`,
                ]
              : `0 0 40px ${config.glow}, 0 0 80px ${config.glow}`,
          }}
          transition={{
            scale: { duration: 0.1 },
            boxShadow: isListening || isProcessing
              ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 },
          }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {/* Orb gradient background */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${config.primary}40, ${config.secondary}60, #030712)`,
            }}
          />

          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 rounded-full"
            style={{ width: "100%", height: "100%" }}
          />

          {/* Core inner glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              background: `radial-gradient(circle, ${config.primary}80, transparent)`,
            }}
            animate={{
              scale: isListening
                ? [1, 1.4 + audioLevel, 1]
                : [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: isListening ? 0.5 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* State icon overlay */}
          <div className="relative z-10 flex items-center justify-center">
            {state === "idle" || state === "result" ? (
              <MicrophoneIcon color={config.primary} />
            ) : state === "listening" ? (
              <WaveformIcon color={config.primary} audioLevel={audioLevel} />
            ) : state === "processing" ? (
              <ProcessingIcon color={config.primary} />
            ) : (
              <ErrorIcon />
            )}
          </div>
        </motion.button>
      </div>

      {/* Label */}
      <motion.div
        className="text-center pointer-events-none"
        key={state}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p
          className="font-orbitron text-xs font-bold tracking-widest mb-1"
          style={{ color: config.primary }}
        >
          {config.label}
        </p>
        <p className="text-xs font-jetbrains" style={{ color: "var(--text-muted)" }}>
          {config.subLabel}
        </p>
      </motion.div>
    </div>
  );
}

function MicrophoneIcon({ color }: { color: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={color} opacity="0.9" />
      <path
        d="M5 10c0 3.866 3.134 7 7 7s7-3.134 7-7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="9" y1="21" x2="15" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function WaveformIcon({ color, audioLevel }: { color: string; audioLevel: number }) {
  const bars = [0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4];
  return (
    <div className="flex items-center gap-[3px]">
      {bars.map((baseH, i) => (
        <motion.div
          key={i}
          style={{
            width: 3,
            background: color,
            borderRadius: 2,
            originY: "center",
          }}
          animate={{
            height: [
              8 + baseH * 24 * (0.5 + audioLevel * 0.5),
              8 + (1 - baseH) * 24 * (0.5 + audioLevel * 0.5),
              8 + baseH * 24 * (0.5 + audioLevel * 0.5),
            ],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.06,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function ProcessingIcon({ color }: { color: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" strokeOpacity="0.3" />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

function ErrorIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#ff4757" strokeWidth="2" opacity="0.8" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="#ff4757" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="#ff4757" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
