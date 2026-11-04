"use client";

import React, { useEffect, useState } from "react";

export type BirdMood =
  | "EXPLORER"
  | "BACKPACK"
  | "SHOPKEEPER"
  | "NEST_BUILDER"
  | "VILLAGE_HERO"
  | "CELEBRATE"
  | "THINKING";

export type SkylineMusicTheme = "ISLAND_ADVENTURE" | "QUEST_EXCITEMENT" | "HAPPY_VILLAGE";

export interface SkylineBirdCharacterProps {
  mood?: BirdMood;
  size?: "sm" | "md" | "lg" | "xl";
  reducedMotion?: boolean;
  speechText?: string;
  badgeLabel?: string;
  className?: string;
}

// Shared singleton AudioContext & BGM scheduler so music plays smoothly across map & stage modals
let sharedAudioCtx: AudioContext | null = null;
let bgmIntervalId: ReturnType<typeof setInterval> | null = null;
let bgmActive = false;
let currentTheme: SkylineMusicTheme = "ISLAND_ADVENTURE";
let currentStep = 0;
let bgmVolume = 0.055; // Gentle, cheerful background level that never overpowers voice narration
const bgmListeners = new Set<() => void>();

function notifyBgmListeners() {
  bgmListeners.forEach((fn) => fn());
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Musical note frequencies (Hz)
const NOTES: Record<string, number> = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5
};

interface MelodyStep {
  lead?: string;
  harmony?: string;
  bass?: string;
  dur?: number;
}

const THEME_PATTERNS: Record<SkylineMusicTheme, { tempoMs: number; steps: MelodyStep[] }> = {
  // Upbeat, sunny C-major / G-major island exploration melody (Marimba + warm bass)
  ISLAND_ADVENTURE: {
    tempoMs: 210,
    steps: [
      { lead: "C5", harmony: "E4", bass: "C3", dur: 0.19 },
      { lead: "E5", dur: 0.16 },
      { lead: "G5", harmony: "C5", bass: "G3", dur: 0.22 },
      { lead: "E5", dur: 0.16 },
      { lead: "A5", harmony: "C5", bass: "F3", dur: 0.22 },
      { lead: "G5", dur: 0.18 },
      { lead: "E5", harmony: "G4", bass: "C3", dur: 0.28 },
      {},
      { lead: "D5", harmony: "F4", bass: "G3", dur: 0.19 },
      { lead: "F5", dur: 0.16 },
      { lead: "E5", harmony: "G4", bass: "C3", dur: 0.19 },
      { lead: "D5", dur: 0.16 },
      { lead: "C5", harmony: "E4", bass: "G3", dur: 0.28 },
      { lead: "G4", dur: 0.16 },
      { lead: "C5", harmony: "E4", bass: "C3", dur: 0.34 },
      {}
    ]
  },
  // Energetic, exciting quest & shopping challenge rhythm
  QUEST_EXCITEMENT: {
    tempoMs: 175,
    steps: [
      { lead: "G5", harmony: "B4", bass: "G3", dur: 0.15 },
      { lead: "D5", dur: 0.14 },
      { lead: "G5", harmony: "B4", bass: "D3", dur: 0.15 },
      { lead: "A5", dur: 0.15 },
      { lead: "B5", harmony: "D5", bass: "G3", dur: 0.22 },
      { lead: "A5", dur: 0.15 },
      { lead: "G5", harmony: "B4", bass: "D3", dur: 0.22 },
      { lead: "E5", dur: 0.15 },
      { lead: "F5", harmony: "A4", bass: "F3", dur: 0.16 },
      { lead: "G5", dur: 0.15 },
      { lead: "E5", harmony: "G4", bass: "C3", dur: 0.16 },
      { lead: "C5", dur: 0.15 },
      { lead: "D5", harmony: "G4", bass: "G3", dur: 0.22 },
      { lead: "B4", dur: 0.15 },
      { lead: "C5", harmony: "E4", bass: "C3", dur: 0.3 },
      {}
    ]
  },
  // Cheerful, playful village & dream nest melody
  HAPPY_VILLAGE: {
    tempoMs: 230,
    steps: [
      { lead: "E5", harmony: "C5", bass: "C3", dur: 0.2 },
      { lead: "G5", dur: 0.18 },
      { lead: "C6", harmony: "E5", bass: "G3", dur: 0.26 },
      { lead: "G5", dur: 0.18 },
      { lead: "A5", harmony: "F5", bass: "F3", dur: 0.22 },
      { lead: "F5", dur: 0.18 },
      { lead: "G5", harmony: "E5", bass: "C3", dur: 0.3 },
      {},
      { lead: "F5", harmony: "D5", bass: "D3", dur: 0.2 },
      { lead: "D5", dur: 0.18 },
      { lead: "E5", harmony: "C5", bass: "E3", dur: 0.2 },
      { lead: "C5", dur: 0.18 },
      { lead: "D5", harmony: "B4", bass: "G3", dur: 0.24 },
      { lead: "G5", dur: 0.18 },
      { lead: "C5", harmony: "E4", bass: "C3", dur: 0.35 },
      {}
    ]
  }
};

function scheduleNote(
  ctx: AudioContext,
  freq: number,
  duration: number,
  wave: OscillatorType,
  gainAmount: number
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(gainAmount, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function tickBgmStep() {
  if (!bgmActive) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const pattern = THEME_PATTERNS[currentTheme] || THEME_PATTERNS.ISLAND_ADVENTURE;
  const stepObj = pattern.steps[currentStep % pattern.steps.length];
  currentStep = (currentStep + 1) % pattern.steps.length;

  const dur = stepObj.dur || 0.18;
  if (stepObj.lead && NOTES[stepObj.lead]) {
    scheduleNote(ctx, NOTES[stepObj.lead], dur, "triangle", bgmVolume);
  }
  if (stepObj.harmony && NOTES[stepObj.harmony]) {
    scheduleNote(ctx, NOTES[stepObj.harmony], dur * 1.1, "sine", bgmVolume * 0.55);
  }
  if (stepObj.bass && NOTES[stepObj.bass]) {
    scheduleNote(ctx, NOTES[stepObj.bass], dur * 1.35, "sine", bgmVolume * 0.65);
  }
}

export function startSkylineBgm(theme?: SkylineMusicTheme) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("skyline_muted") === "1") return;

  if (theme) {
    currentTheme = theme;
  }
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }

  bgmActive = true;
  const tempoMs = (THEME_PATTERNS[currentTheme] || THEME_PATTERNS.ISLAND_ADVENTURE).tempoMs;
  tickBgmStep();
  bgmIntervalId = setInterval(tickBgmStep, tempoMs);
  localStorage.setItem("skyline_bgm_enabled", "1");
  localStorage.setItem("skyline_bgm_theme", currentTheme);
  notifyBgmListeners();
}

export function stopSkylineBgm() {
  bgmActive = false;
  if (bgmIntervalId) {
    clearInterval(bgmIntervalId);
    bgmIntervalId = null;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("skyline_bgm_enabled", "0");
  }
  notifyBgmListeners();
}

export function setSkylineBgmTheme(theme: SkylineMusicTheme) {
  currentTheme = theme;
  currentStep = 0;
  if (typeof window !== "undefined") {
    localStorage.setItem("skyline_bgm_theme", theme);
  }
  if (bgmActive) {
    startSkylineBgm(theme);
  } else {
    notifyBgmListeners();
  }
}

export function getSkylineBgmState() {
  return {
    isPlaying: bgmActive,
    theme: currentTheme
  };
}

/**
 * Rich Web Audio synthesizer for exciting, musical game sound effects & fanfares.
 * Respects mute setting without requiring heavy external audio files.
 */
export function playSkylineSfx(
  type: "CLICK" | "COIN" | "SUCCESS" | "RETRY" | "FLAG" | "WELCOME",
  muted: boolean
) {
  if (muted || typeof window === "undefined") return;
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      wave: OscillatorType = "triangle",
      gainVal = 0.09
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.linearRampToValueAtTime(gainVal, now + startOffset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (type === "CLICK") {
      playTone(587.33, 0, 0.065, "triangle", 0.07);
      playTone(880.0, 0.03, 0.06, "sine", 0.05);
    } else if (type === "COIN") {
      playTone(987.77, 0, 0.08, "sine", 0.1);
      playTone(1318.51, 0.07, 0.22, "triangle", 0.11);
      playTone(1975.53, 0.12, 0.18, "sine", 0.06);
    } else if (type === "WELCOME") {
      // Joyful 5-note Sky-Line greeting fanfare
      playTone(NOTES.C5, 0, 0.11, "triangle", 0.1);
      playTone(NOTES.E5, 0.09, 0.11, "triangle", 0.1);
      playTone(NOTES.G5, 0.18, 0.11, "triangle", 0.11);
      playTone(NOTES.A5, 0.27, 0.12, "triangle", 0.11);
      playTone(NOTES.C6, 0.37, 0.32, "triangle", 0.13);
      playTone(NOTES.E5, 0.37, 0.32, "sine", 0.08);
    } else if (type === "SUCCESS") {
      playTone(NOTES.C5, 0, 0.1, "triangle", 0.11);
      playTone(NOTES.E5, 0.09, 0.1, "triangle", 0.11);
      playTone(NOTES.G5, 0.18, 0.12, "triangle", 0.12);
      playTone(NOTES.C6, 0.28, 0.28, "triangle", 0.13);
      playTone(NOTES.E5, 0.28, 0.28, "sine", 0.08);
    } else if (type === "FLAG") {
      // Grand Victory Trumpet / Marimba Chord Fanfare
      playTone(NOTES.C5, 0, 0.11, "triangle", 0.12);
      playTone(NOTES.G4, 0.11, 0.1, "triangle", 0.11);
      playTone(NOTES.C5, 0.21, 0.11, "triangle", 0.12);
      playTone(NOTES.E5, 0.32, 0.13, "triangle", 0.13);
      playTone(NOTES.G5, 0.45, 0.15, "triangle", 0.13);
      playTone(NOTES.C6, 0.6, 0.42, "triangle", 0.15);
      playTone(NOTES.E5, 0.6, 0.42, "sine", 0.09);
      playTone(NOTES.G5, 0.6, 0.42, "sine", 0.09);
    } else if (type === "RETRY") {
      playTone(440.0, 0, 0.12, "sine", 0.07);
      playTone(392.0, 0.12, 0.18, "sine", 0.07);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Interactive Music Bar Component for Map & Stage Player
 */
export function SkylineMusicController({
  muted,
  onToggleMute,
  compact = false
}: {
  muted: boolean;
  onToggleMute?: () => void;
  compact?: boolean;
}) {
  const [bgmState, setBgmState] = useState(getSkylineBgmState());

  useEffect(() => {
    const sync = () => setBgmState({ ...getSkylineBgmState() });
    bgmListeners.add(sync);
    return () => {
      bgmListeners.delete(sync);
    };
  }, []);

  // Stop BGM immediately if muted
  useEffect(() => {
    if (muted && bgmState.isPlaying) {
      stopSkylineBgm();
    }
  }, [muted, bgmState.isPlaying]);

  const handleToggleBgm = () => {
    if (muted && onToggleMute) {
      onToggleMute();
    }
    if (bgmState.isPlaying) {
      stopSkylineBgm();
    } else {
      startSkylineBgm(bgmState.theme);
      playSkylineSfx("WELCOME", false);
    }
  };

  const handleSelectTheme = (theme: SkylineMusicTheme) => {
    if (muted && onToggleMute) {
      onToggleMute();
    }
    setSkylineBgmTheme(theme);
    if (!bgmState.isPlaying) {
      startSkylineBgm(theme);
    }
  };

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 transition ${
        bgmState.isPlaying && !muted
          ? "bg-amber-400/95 text-slate-950 border-white shadow-md"
          : "bg-white/15 text-white border-white/30"
      }`}
    >
      <button
        type="button"
        onClick={handleToggleBgm}
        className="flex items-center gap-1.5 font-extrabold text-xs px-2 py-1 rounded-xl bg-black/10 hover:bg-black/20 transition cursor-pointer"
        title="Bật/Tắt nhạc nền phiêu lưu"
      >
        <span className={bgmState.isPlaying && !muted ? "animate-spin" : ""}>🎵</span>
        <span>
          {bgmState.isPlaying && !muted ? "Nhạc nền: Đang phát" : "Bật nhạc phiêu lưu"}
        </span>
      </button>

      {!compact && (
        <div className="flex items-center gap-1 text-[11px] font-bold">
          {(
            [
              { id: "ISLAND_ADVENTURE", label: "🏝️ Đảo Xanh" },
              { id: "QUEST_EXCITEMENT", label: "🚀 Sôi Động" },
              { id: "HAPPY_VILLAGE", label: "🌟 Vui Nhộn" }
            ] as Array<{ id: SkylineMusicTheme; label: string }>
          ).map((t) => {
            const active = bgmState.theme === t.id && bgmState.isPlaying && !muted;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-amber-300 font-black shadow-xs"
                    : "hover:bg-black/10 opacity-85"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Optional Vietnamese voice narration helper for Primary students (Grades 1–2)
 */
export function speakVietnameseText(text: string, muted: boolean) {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    utter.rate = 0.95;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore speech synthesis errors
  }
}

const SIZE_MAP = {
  sm: "w-14 h-14",
  md: "w-20 h-20",
  lg: "w-28 h-28",
  xl: "w-36 h-36"
};

export function SkylineBirdCharacter({
  mood = "EXPLORER",
  size = "md",
  reducedMotion = false,
  speechText,
  badgeLabel,
  className = ""
}: SkylineBirdCharacterProps) {
  const [imgFallback, setImgFallback] = React.useState(false);

  const accessoryEmoji =
    mood === "BACKPACK"
      ? "🎒"
      : mood === "SHOPKEEPER"
      ? "🪙"
      : mood === "NEST_BUILDER"
      ? "🪺"
      : mood === "VILLAGE_HERO"
      ? "🦸"
      : mood === "CELEBRATE"
      ? "🚩"
      : mood === "THINKING"
      ? "🔍"
      : "🧭";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center rounded-full bg-white border-2 border-teal-400 shadow-md ${
          SIZE_MAP[size]
        } ${!reducedMotion ? "transition-transform duration-500 hover:scale-105" : ""}`}
      >
        {!imgFallback ? (
          <img
            src="/images/skyline-mascot-flag.png"
            alt="Chú chim Sky-Line"
            onError={() => setImgFallback(true)}
            className={`w-full h-full object-contain p-0.5 drop-shadow-sm ${
              !reducedMotion && mood === "CELEBRATE" ? "animate-bounce" : ""
            }`}
          />
        ) : (
          <svg
            viewBox="0 0 120 120"
            className={`w-full h-full p-1.5 ${
              !reducedMotion && mood === "CELEBRATE" ? "animate-bounce" : ""
            }`}
            role="img"
            aria-label="Chú chim Sky-Line"
          >
            <circle cx="60" cy="62" r="46" fill="#E0F2FE" opacity="0.65" />
            <ellipse cx="60" cy="65" rx="33" ry="30" fill="#FFFFFF" stroke="#0EA5E9" strokeWidth="3" />
            <ellipse cx="60" cy="74" rx="28" ry="18" fill="#38BDF8" />
            <circle cx="48" cy="52" r="6.5" fill="#0F172A" />
            <circle cx="72" cy="52" r="6.5" fill="#0F172A" />
            <circle cx="46" cy="50" r="2.3" fill="#FFFFFF" />
            <circle cx="70" cy="50" r="2.3" fill="#FFFFFF" />
            <polygon points="54,56 66,56 60,65" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
          </svg>
        )}

        {/* Role / Mechanic Accessory Badge */}
        <span
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow flex items-center justify-center text-sm"
          title="Trang bị hành trình"
        >
          {accessoryEmoji}
        </span>

        {badgeLabel && (
          <span className="absolute -top-2.5 right-0 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold shadow whitespace-nowrap">
            {badgeLabel}
          </span>
        )}
      </div>

      {speechText && (
        <div className="relative bg-white/95 border-2 border-teal-200 rounded-2xl px-4 py-2.5 shadow-sm max-w-md text-slate-800 text-sm leading-relaxed">
          <div className="font-bold text-teal-700 text-xs mb-0.5 flex items-center gap-1.5">
            <span>🐦 Chim Sky-Line nhắn nhủ:</span>
          </div>
          <p>{speechText}</p>
        </div>
      )}
    </div>
  );
}
