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

export type SkylineMusicTheme =
  | "GRADE_1_WONDER"
  | "GRADE_2_ADVENTURE"
  | "GRADE_3_DETECTIVE"
  | "GRADE_4_ARCHITECT"
  | "GRADE_5_STARTUP"
  | "ISLAND_ADVENTURE"
  | "QUEST_EXCITEMENT"
  | "HAPPY_VILLAGE";

export interface SkylineBirdCharacterProps {
  mood?: BirdMood;
  size?: "sm" | "md" | "lg" | "xl";
  reducedMotion?: boolean;
  speechText?: string;
  badgeLabel?: string;
  characterId?: string;
  className?: string;
}

export interface SkylineCharacterOption {
  id: string;
  name: string;
  roleTitle: string;
  emoji: string;
  weaponOrGear: string;
  auraGradient: string;
  borderCls: string;
  badgeBgCls: string;
  description: string;
}

export const SKYLINE_CHARACTERS: SkylineCharacterOption[] = [
  {
    id: "SKYLINE_EXPLORER",
    name: "Chiến Binh Chim Sky-Line",
    roleTitle: "Nhà Thám Hiểm Đảo Xanh",
    emoji: "🧭",
    weaponOrGear: "La Bàn Vàng & Khiên Ngọc",
    auraGradient: "from-teal-500 via-sky-500 to-emerald-500",
    borderCls: "border-teal-400",
    badgeBgCls: "bg-teal-600 text-white",
    description: "Nhanh nhẹn, thông thái, luôn dẫn đầu khám phá mọi vùng đất tài chính."
  },
  {
    id: "GOLDEN_SHIELD_KNIGHT",
    name: "Hiệp Sĩ Khiên Vàng",
    roleTitle: "Hộ Vệ Ngân Sách & Tiết Kiệm",
    emoji: "🛡️",
    weaponOrGear: "Khiên Vàng Bất Bại & Heo Đất",
    auraGradient: "from-amber-400 via-yellow-500 to-orange-500",
    borderCls: "border-amber-400",
    badgeBgCls: "bg-amber-500 text-slate-950",
    description: "Bảo vệ ví xu an toàn trước cám dỗ mua sắm và kiên trì xây tổ ước mơ."
  },
  {
    id: "WISE_SCHOLAR",
    name: "Pháp Sư Thông Thái",
    roleTitle: "Bậc Thầy Tính Toán & Kiểm Toán",
    emoji: "🔮",
    weaponOrGear: "Kính Soi Quảng Cáo & Sổ Kim Cương",
    auraGradient: "from-indigo-500 via-purple-500 to-pink-500",
    borderCls: "border-purple-400",
    badgeBgCls: "bg-purple-600 text-white",
    description: "Tinh tường phát hiện mọi chiêu trò quảng cáo và cân đối sổ sách chuẩn xác."
  },
  {
    id: "ECO_HERO",
    name: "Siêu Anh Hùng Xanh",
    roleTitle: "Đại Sứ Sống Xanh & Nhân Ái",
    emoji: "🦸",
    weaponOrGear: "Áo Choàng Lá Xanh & Trái Tim Ấm",
    auraGradient: "from-emerald-500 via-green-500 to-lime-500",
    borderCls: "border-emerald-400",
    badgeBgCls: "bg-emerald-600 text-white",
    description: "Giải cứu ngôi làng khỏi lãng phí điện nước và lan tỏa đồng tiền hạnh phúc."
  },
  {
    id: "FUTURE_CAPTAIN",
    name: "Thuyền Trưởng Tương Lai",
    roleTitle: "Thủ Lĩnh Dự Án Khởi Nghiệp Nhí",
    emoji: "🚀",
    weaponOrGear: "Đôi Cánh Phản Lực 3D & Huy Hiệu Sao",
    auraGradient: "from-sky-500 via-blue-600 to-cyan-400",
    borderCls: "border-sky-400",
    badgeBgCls: "bg-blue-600 text-white",
    description: "Dẫn dắt các kế hoạch mua sắm, hội chợ và dự án tài chính sáng tạo."
  }
];

export function getCharacterById(id?: string): SkylineCharacterOption {
  return (
    SKYLINE_CHARACTERS.find((c) => c.id === id) || SKYLINE_CHARACTERS[0]
  );
}

export function getDefaultThemeForGrade(grade?: number): SkylineMusicTheme {
  switch (grade) {
    case 1:
      return "GRADE_1_WONDER";
    case 2:
      return "GRADE_2_ADVENTURE";
    case 3:
      return "GRADE_3_DETECTIVE";
    case 4:
      return "GRADE_4_ARCHITECT";
    case 5:
      return "GRADE_5_STARTUP";
    default:
      return "GRADE_2_ADVENTURE";
  }
}

export const GRADE_MUSIC_META: Record<
  SkylineMusicTheme,
  { label: string; shortLabel: string; badge: string; bpm: number; description: string }
> = {
  GRADE_1_WONDER: {
    label: "Khối 1: Nhịp Điệu Đồng Xu Nhí",
    shortLabel: "🎵 K1: Đồng Xu Nhí",
    badge: "1S • Vui tươi",
    bpm: 136,
    description: "Giai điệu Marimba & Chuông ngân rộn ràng, nhịp vỗ tay sôi nổi cho học sinh lớp 1"
  },
  GRADE_2_ADVENTURE: {
    label: "Khối 2: Phiêu Lưu Đảo Thông Thái",
    shortLabel: "🏝️ K2: Đảo Thông Thái",
    badge: "2S • Hào hứng",
    bpm: 144,
    description: "Nhịp trống nhiệt đới & kèn đồng thám hiểm hào hứng trên Đảo Tài Chính 2S"
  },
  GRADE_3_DETECTIVE: {
    label: "Khối 3: Nhịp Đập Siêu Thị Thông Minh",
    shortLabel: "⚡ K3: Siêu Thị Sôi Động",
    badge: "3S • Năng động",
    bpm: 150,
    description: "Nhạc Chiptune-Pop tiết tấu nhanh, kích thích tư duy phân tích lựa chọn & hệ quả"
  },
  GRADE_4_ARCHITECT: {
    label: "Khối 4: Giao Hưởng Kiến Trúc Ngân Sách",
    shortLabel: "🏛️ K4: Kiến Trúc Ngân Sách",
    badge: "4S • Hùng tráng",
    bpm: 156,
    description: "Giai điệu Synth-Brass hùng tráng kết hợp trống hành quân cho nhà lập kế hoạch tài chính"
  },
  GRADE_5_STARTUP: {
    label: "Khối 5: Đấu Trường Khởi Nghiệp Nhí",
    shortLabel: "🚀 K5: Đấu Trường Dự Án",
    badge: "5S • Bứt phá",
    bpm: 164,
    description: "Nhạc Electro-Adventure bùng nổ năng lượng dành cho các thủ lĩnh dự án tài chính nhí"
  },
  ISLAND_ADVENTURE: {
    label: "Khối 2: Phiêu Lưu Đảo Thông Thái",
    shortLabel: "🏝️ Đảo Xanh",
    badge: "Đảo Xanh",
    bpm: 144,
    description: "Giai điệu khám phá đảo xanh"
  },
  QUEST_EXCITEMENT: {
    label: "Nhịp Đập Thử Thách Sôi Động",
    shortLabel: "🔥 Cao Trào",
    badge: "Cao trào",
    bpm: 156,
    description: "Tiết tấu nhanh khi bước vào thử thách"
  },
  HAPPY_VILLAGE: {
    label: "Ngôi Làng Hạnh Phúc",
    shortLabel: "🌟 Vui Nhộn",
    badge: "Vui nhộn",
    bpm: 138,
    description: "Giai điệu ấm áp, tươi sáng"
  }
};

// Shared singleton AudioContext & BGM scheduler so music plays smoothly across map & stage modals
let sharedAudioCtx: AudioContext | null = null;
let bgmIntervalId: ReturnType<typeof setInterval> | null = null;
let bgmActive = false;
let currentTheme: SkylineMusicTheme = "GRADE_2_ADVENTURE";
let currentStep = 0;
let bgmVolume = 0.068; // Clear, energetic classroom game soundtrack level
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

// Musical note frequencies (Hz) across 4 octaves
const NOTES: Record<string, number> = {
  A2: 110.0,
  B2: 123.47,
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
  F4S: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  F5S: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51
};

interface MelodyStep {
  lead?: string;
  harmony?: string;
  arp?: string;
  bass?: string;
  drum?: "KICK" | "SNARE" | "HIHAT" | "KICK_HIHAT";
  dur?: number;
}

interface ThemeConfig {
  tempoMs: number;
  leadWave: OscillatorType;
  harmonyWave: OscillatorType;
  bassWave: OscillatorType;
  steps: MelodyStep[];
}

const THEME_PATTERNS: Record<SkylineMusicTheme, ThemeConfig> = {
  // KHỐI 1: Bright, bouncy Marimba + Bell + cheerful rhythm (C Major Pentatonic)
  GRADE_1_WONDER: {
    tempoMs: 165,
    leadWave: "triangle",
    harmonyWave: "sine",
    bassWave: "triangle",
    steps: [
      { lead: "C5", harmony: "E4", arp: "G5", bass: "C3", drum: "KICK", dur: 0.15 },
      { lead: "E5", arp: "C6", drum: "HIHAT", dur: 0.14 },
      { lead: "G5", harmony: "C5", bass: "G3", drum: "SNARE", dur: 0.16 },
      { lead: "A5", arp: "E5", drum: "HIHAT", dur: 0.14 },
      { lead: "G5", harmony: "E5", bass: "C3", drum: "KICK", dur: 0.18 },
      { lead: "E5", arp: "G5", drum: "HIHAT", dur: 0.14 },
      { lead: "D5", harmony: "G4", bass: "G3", drum: "SNARE", dur: 0.16 },
      { lead: "E5", arp: "G5", drum: "HIHAT", dur: 0.14 },
      { lead: "C5", harmony: "E4", bass: "F3", drum: "KICK", dur: 0.15 },
      { lead: "D5", arp: "A5", drum: "HIHAT", dur: 0.14 },
      { lead: "E5", harmony: "G4", bass: "C3", drum: "SNARE", dur: 0.16 },
      { lead: "G5", arp: "C6", drum: "HIHAT", dur: 0.15 },
      { lead: "A5", harmony: "F5", bass: "G3", drum: "KICK", dur: 0.16 },
      { lead: "B5", arp: "D6", drum: "HIHAT", dur: 0.14 },
      { lead: "C6", harmony: "E5", bass: "C3", drum: "SNARE", dur: 0.25 },
      { arp: "G5", drum: "HIHAT", dur: 0.14 }
    ]
  },

  // KHỐI 2: Energetic Island Adventure Groove (Upbeat G-Major / C-Major adventure fanfare)
  GRADE_2_ADVENTURE: {
    tempoMs: 152,
    leadWave: "triangle",
    harmonyWave: "triangle",
    bassWave: "sine",
    steps: [
      { lead: "G5", harmony: "B4", arp: "D6", bass: "G3", drum: "KICK", dur: 0.14 },
      { lead: "D5", arp: "G5", drum: "HIHAT", dur: 0.13 },
      { lead: "G5", harmony: "B4", bass: "D3", drum: "SNARE", dur: 0.14 },
      { lead: "A5", arp: "D6", drum: "HIHAT", dur: 0.14 },
      { lead: "B5", harmony: "D5", arp: "G5", bass: "G3", drum: "KICK", dur: 0.18 },
      { lead: "A5", drum: "HIHAT", dur: 0.13 },
      { lead: "G5", harmony: "B4", bass: "D3", drum: "SNARE", dur: 0.16 },
      { lead: "E5", arp: "C6", drum: "HIHAT", dur: 0.13 },
      { lead: "F5", harmony: "A4", bass: "F3", drum: "KICK", dur: 0.15 },
      { lead: "G5", arp: "C6", drum: "HIHAT", dur: 0.14 },
      { lead: "E5", harmony: "G4", bass: "C3", drum: "SNARE", dur: 0.15 },
      { lead: "C5", arp: "G5", drum: "HIHAT", dur: 0.13 },
      { lead: "D5", harmony: "F4S", bass: "D3", drum: "KICK", dur: 0.16 },
      { lead: "A5", arp: "D6", drum: "HIHAT", dur: 0.14 },
      { lead: "G5", harmony: "B4", bass: "G3", drum: "SNARE", dur: 0.24 },
      { arp: "B5", drum: "HIHAT", dur: 0.13 }
    ]
  },

  // KHỐI 3: Funky, Fast-Paced Smart Market & Decision Detective Rhythm
  GRADE_3_DETECTIVE: {
    tempoMs: 142,
    leadWave: "square",
    harmonyWave: "triangle",
    bassWave: "triangle",
    steps: [
      { lead: "E5", harmony: "G4", arp: "B5", bass: "E3", drum: "KICK", dur: 0.12 },
      { lead: "G5", arp: "E6", drum: "HIHAT", dur: 0.11 },
      { lead: "A5", harmony: "C5", bass: "A2", drum: "SNARE", dur: 0.13 },
      { lead: "B5", arp: "E5", drum: "HIHAT", dur: 0.12 },
      { lead: "C6", harmony: "E5", bass: "C3", drum: "KICK", dur: 0.15 },
      { lead: "B5", arp: "G5", drum: "HIHAT", dur: 0.11 },
      { lead: "A5", harmony: "C5", bass: "D3", drum: "SNARE", dur: 0.14 },
      { lead: "G5", arp: "D5", drum: "HIHAT", dur: 0.12 },
      { lead: "F5S", harmony: "A4", bass: "D3", drum: "KICK", dur: 0.13 },
      { lead: "G5", arp: "B5", drum: "HIHAT", dur: 0.12 },
      { lead: "A5", harmony: "D5", bass: "F3", drum: "SNARE", dur: 0.14 },
      { lead: "B5", arp: "D6", drum: "HIHAT", dur: 0.12 },
      { lead: "G5", harmony: "B4", bass: "G3", drum: "KICK", dur: 0.14 },
      { lead: "E5", arp: "B5", drum: "HIHAT", dur: 0.12 },
      { lead: "E5", harmony: "G4", bass: "E3", drum: "SNARE", dur: 0.22 },
      { arp: "G5", drum: "HIHAT", dur: 0.11 }
    ]
  },

  // KHỐI 4: Heroic Orchestral-Synth Brass & Budget Architect March
  GRADE_4_ARCHITECT: {
    tempoMs: 138,
    leadWave: "sawtooth",
    harmonyWave: "triangle",
    bassWave: "triangle",
    steps: [
      { lead: "C5", harmony: "E4", arp: "G5", bass: "C3", drum: "KICK", dur: 0.13 },
      { arp: "C6", bass: "C3", drum: "HIHAT", dur: 0.11 },
      { lead: "G5", harmony: "C5", bass: "G3", drum: "SNARE", dur: 0.14 },
      { lead: "E5", arp: "G5", drum: "HIHAT", dur: 0.12 },
      { lead: "A5", harmony: "C5", arp: "E6", bass: "F3", drum: "KICK", dur: 0.16 },
      { lead: "G5", bass: "F3", drum: "HIHAT", dur: 0.12 },
      { lead: "F5", harmony: "A4", bass: "D3", drum: "SNARE", dur: 0.14 },
      { lead: "D5", arp: "A5", drum: "HIHAT", dur: 0.12 },
      { lead: "E5", harmony: "G4", bass: "E3", drum: "KICK", dur: 0.14 },
      { lead: "G5", arp: "B5", drum: "HIHAT", dur: 0.12 },
      { lead: "C6", harmony: "E5", bass: "A2", drum: "SNARE", dur: 0.16 },
      { lead: "B5", arp: "E5", drum: "HIHAT", dur: 0.12 },
      { lead: "A5", harmony: "D5", bass: "D3", drum: "KICK", dur: 0.14 },
      { lead: "B5", arp: "G5", bass: "G3", drum: "HIHAT", dur: 0.12 },
      { lead: "C6", harmony: "E5", arp: "G5", bass: "C3", drum: "SNARE", dur: 0.24 },
      { arp: "C6", drum: "HIHAT", dur: 0.11 }
    ]
  },

  // KHỐI 5: High-Energy Electro-Anthem for Startup & Financial Leaders
  GRADE_5_STARTUP: {
    tempoMs: 132,
    leadWave: "sawtooth",
    harmonyWave: "triangle",
    bassWave: "triangle",
    steps: [
      { lead: "D5", harmony: "F4S", arp: "A5", bass: "D3", drum: "KICK", dur: 0.12 },
      { lead: "F5S", arp: "D6", bass: "D3", drum: "HIHAT", dur: 0.11 },
      { lead: "A5", harmony: "D5", bass: "A2", drum: "SNARE", dur: 0.13 },
      { lead: "D6", arp: "A5", drum: "HIHAT", dur: 0.12 },
      { lead: "B5", harmony: "D5", arp: "G5", bass: "G3", drum: "KICK", dur: 0.15 },
      { lead: "A5", bass: "G3", drum: "HIHAT", dur: 0.11 },
      { lead: "G5", harmony: "B4", bass: "E3", drum: "SNARE", dur: 0.14 },
      { lead: "E5", arp: "B5", drum: "HIHAT", dur: 0.11 },
      { lead: "F5S", harmony: "A4", bass: "F3", drum: "KICK", dur: 0.13 },
      { lead: "A5", arp: "C6", drum: "HIHAT", dur: 0.11 },
      { lead: "B5", harmony: "D5", bass: "G3", drum: "SNARE", dur: 0.14 },
      { lead: "C6", arp: "E6", drum: "HIHAT", dur: 0.12 },
      { lead: "D6", harmony: "F5S", bass: "A3", drum: "KICK", dur: 0.16 },
      { lead: "A5", arp: "D6", bass: "A2", drum: "HIHAT", dur: 0.12 },
      { lead: "D6", harmony: "F5S", arp: "A5", bass: "D3", drum: "SNARE", dur: 0.24 },
      { arp: "D6", drum: "HIHAT", dur: 0.11 }
    ]
  },

  // Legacy aliases mapped to enhanced multi-track patterns
  ISLAND_ADVENTURE: {
    tempoMs: 152,
    leadWave: "triangle",
    harmonyWave: "triangle",
    bassWave: "sine",
    steps: []
  },
  QUEST_EXCITEMENT: {
    tempoMs: 138,
    leadWave: "sawtooth",
    harmonyWave: "triangle",
    bassWave: "triangle",
    steps: []
  },
  HAPPY_VILLAGE: {
    tempoMs: 165,
    leadWave: "triangle",
    harmonyWave: "sine",
    bassWave: "triangle",
    steps: []
  }
};

// Link legacy themes to Grade themes
THEME_PATTERNS.ISLAND_ADVENTURE = THEME_PATTERNS.GRADE_2_ADVENTURE;
THEME_PATTERNS.QUEST_EXCITEMENT = THEME_PATTERNS.GRADE_4_ARCHITECT;
THEME_PATTERNS.HAPPY_VILLAGE = THEME_PATTERNS.GRADE_1_WONDER;

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

  const effectiveGain = wave === "sawtooth" || wave === "square" ? gainAmount * 0.55 : gainAmount;

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(effectiveGain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function schedulePercussion(ctx: AudioContext, type: "KICK" | "SNARE" | "HIHAT" | "KICK_HIHAT", vol: number) {
  const now = ctx.currentTime;
  if (type === "KICK" || type === "KICK_HIHAT") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    gain.gain.setValueAtTime(vol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }
  if (type === "SNARE") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.065);
    gain.gain.setValueAtTime(vol * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
  if (type === "HIHAT" || type === "KICK_HIHAT") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.025);
    gain.gain.setValueAtTime(vol * 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }
}

function tickBgmStep() {
  if (!bgmActive) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const pattern = THEME_PATTERNS[currentTheme] || THEME_PATTERNS.GRADE_2_ADVENTURE;
  const stepObj = pattern.steps[currentStep % pattern.steps.length];
  currentStep = (currentStep + 1) % pattern.steps.length;

  const dur = stepObj.dur || 0.15;
  if (stepObj.lead && NOTES[stepObj.lead]) {
    scheduleNote(ctx, NOTES[stepObj.lead], dur, pattern.leadWave, bgmVolume);
  }
  if (stepObj.harmony && NOTES[stepObj.harmony]) {
    scheduleNote(ctx, NOTES[stepObj.harmony], dur * 1.15, pattern.harmonyWave, bgmVolume * 0.52);
  }
  if (stepObj.arp && NOTES[stepObj.arp]) {
    scheduleNote(ctx, NOTES[stepObj.arp], dur * 0.75, "sine", bgmVolume * 0.42);
  }
  if (stepObj.bass && NOTES[stepObj.bass]) {
    scheduleNote(ctx, NOTES[stepObj.bass], dur * 1.35, pattern.bassWave, bgmVolume * 0.78);
  }
  if (stepObj.drum) {
    schedulePercussion(ctx, stepObj.drum, bgmVolume);
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
  const tempoMs = (THEME_PATTERNS[currentTheme] || THEME_PATTERNS.GRADE_2_ADVENTURE).tempoMs;
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
 * Rich Web Audio synthesizer for exciting, musical game sound effects & classroom fanfares.
 * Respects mute setting without requiring heavy external audio files.
 */
export function playSkylineSfx(
  type:
    | "CLICK"
    | "COIN"
    | "SUCCESS"
    | "RETRY"
    | "FLAG"
    | "WELCOME"
    | "STAGE_TRANSITION"
    | "CLASSROOM_BELL"
    | "CLASSROOM_APPLAUSE",
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
      playTone(987.77, 0, 0.08, "sine", 0.11);
      playTone(1318.51, 0.06, 0.22, "triangle", 0.12);
      playTone(1975.53, 0.11, 0.18, "sine", 0.07);
    } else if (type === "CLASSROOM_BELL") {
      // Classic school chime (Westminster / Sky-Line Classroom Chime: E5 -> G5 -> A5 -> D5 -> G5 -> E5)
      playTone(NOTES.E5, 0, 0.24, "sine", 0.12);
      playTone(NOTES.G5, 0.22, 0.24, "sine", 0.12);
      playTone(NOTES.A5, 0.44, 0.28, "triangle", 0.13);
      playTone(NOTES.C6, 0.68, 0.45, "sine", 0.14);
      playTone(NOTES.E5, 0.68, 0.45, "triangle", 0.08);
    } else if (type === "CLASSROOM_APPLAUSE") {
      // Joyful classroom cheer chord arpeggio
      playTone(NOTES.C5, 0, 0.12, "triangle", 0.11);
      playTone(NOTES.E5, 0.06, 0.12, "triangle", 0.11);
      playTone(NOTES.G5, 0.12, 0.14, "triangle", 0.12);
      playTone(NOTES.C6, 0.18, 0.25, "triangle", 0.13);
      playTone(NOTES.E6, 0.26, 0.35, "sine", 0.11);
    } else if (type === "WELCOME") {
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
      playTone(NOTES.C5, 0, 0.11, "triangle", 0.12);
      playTone(NOTES.G4, 0.11, 0.1, "triangle", 0.11);
      playTone(NOTES.C5, 0.21, 0.11, "triangle", 0.12);
      playTone(NOTES.E5, 0.32, 0.13, "triangle", 0.13);
      playTone(NOTES.G5, 0.45, 0.15, "triangle", 0.13);
      playTone(NOTES.C6, 0.6, 0.42, "triangle", 0.15);
      playTone(NOTES.E5, 0.6, 0.42, "sine", 0.09);
      playTone(NOTES.G5, 0.6, 0.42, "sine", 0.09);
    } else if (type === "STAGE_TRANSITION") {
      playTone(NOTES.C5, 0, 0.09, "sine", 0.1);
      playTone(NOTES.D5, 0.07, 0.09, "sine", 0.1);
      playTone(NOTES.E5, 0.14, 0.09, "triangle", 0.11);
      playTone(NOTES.G5, 0.21, 0.1, "triangle", 0.12);
      playTone(NOTES.A5, 0.29, 0.11, "triangle", 0.12);
      playTone(NOTES.C6, 0.38, 0.36, "triangle", 0.14);
      playTone(NOTES.G5, 0.38, 0.36, "sine", 0.09);
    } else if (type === "RETRY") {
      playTone(440.0, 0, 0.12, "sine", 0.07);
      playTone(392.0, 0.12, 0.18, "sine", 0.07);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

/**
 * Interactive Grade-Aware Music Bar Component for Map & Stage Player
 */
export function SkylineMusicController({
  muted,
  onToggleMute,
  compact = false,
  grade = 2
}: {
  muted: boolean;
  onToggleMute?: () => void;
  compact?: boolean;
  grade?: number;
}) {
  const [bgmState, setBgmState] = useState(getSkylineBgmState());

  useEffect(() => {
    const sync = () => setBgmState({ ...getSkylineBgmState() });
    bgmListeners.add(sync);
    return () => {
      bgmListeners.delete(sync);
    };
  }, []);

  // Automatically align default theme with the student's grade when mounting
  useEffect(() => {
    const gradeTheme = getDefaultThemeForGrade(grade);
    if (bgmState.theme !== gradeTheme && bgmState.theme === "GRADE_2_ADVENTURE" && grade !== 2) {
      setSkylineBgmTheme(gradeTheme);
    }
  }, [grade]);

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
      const targetTheme = bgmState.theme || getDefaultThemeForGrade(grade);
      startSkylineBgm(targetTheme);
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

  const gradeThemes: Array<{ id: SkylineMusicTheme; label: string; gradeNum: number }> = [
    { id: "GRADE_1_WONDER", label: "🎵 K1: Đồng Xu Nhí", gradeNum: 1 },
    { id: "GRADE_2_ADVENTURE", label: "🏝️ K2: Đảo Thông Thái", gradeNum: 2 },
    { id: "GRADE_3_DETECTIVE", label: "⚡ K3: Siêu Thị Sôi Động", gradeNum: 3 },
    { id: "GRADE_4_ARCHITECT", label: "🏛️ K4: Kiến Trúc Ngân Sách", gradeNum: 4 },
    { id: "GRADE_5_STARTUP", label: "🚀 K5: Đấu Trường Dự Án", gradeNum: 5 }
  ];

  const activeMeta =
    GRADE_MUSIC_META[bgmState.theme] || GRADE_MUSIC_META[getDefaultThemeForGrade(grade)];

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
        className="flex items-center gap-1.5 font-extrabold text-xs px-2.5 py-1 rounded-xl bg-black/15 hover:bg-black/25 transition cursor-pointer"
        title={activeMeta.description}
      >
        <span className={bgmState.isPlaying && !muted ? "animate-spin" : ""}>🎵</span>
        <span>
          {bgmState.isPlaying && !muted
            ? `${activeMeta.shortLabel} (${activeMeta.bpm} BPM)`
            : `Bật nhạc Khối ${grade} sôi động`}
        </span>
      </button>

      {!compact && (
        <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
          {gradeThemes.map((t) => {
            const active = bgmState.theme === t.id && bgmState.isPlaying && !muted;
            const isStudentGrade = t.gradeNum === grade;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTheme(t.id)}
                title={GRADE_MUSIC_META[t.id].description}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  active
                    ? "bg-slate-900 text-amber-300 font-black shadow-xs ring-1 ring-white"
                    : isStudentGrade
                    ? "bg-white/25 font-extrabold hover:bg-white/35"
                    : "hover:bg-black/15 opacity-85"
                }`}
              >
                <span>{t.label}</span>
                {isStudentGrade && (
                  <span className="text-[9px] px-1 rounded bg-emerald-500 text-white font-black">
                    Lớp em
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Optional Vietnamese voice narration helper for Primary students (Grades 1–5)
 */
export function speakVietnameseText(text: string, muted: boolean) {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    utter.rate = 0.96;
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
  characterId,
  className = ""
}: SkylineBirdCharacterProps) {
  const [imgFallback, setImgFallback] = React.useState(false);
  const character = getCharacterById(characterId);

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
      ? "🛡️"
      : mood === "THINKING"
      ? "🔍"
      : character.emoji;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center rounded-full bg-white border-4 ${
          character.borderCls
        } shadow-lg overflow-hidden ${SIZE_MAP[size]} ${
          !reducedMotion ? "transition-transform duration-500 hover:scale-105" : ""
        }`}
      >
        {!imgFallback ? (
          <img
            src="/images/skyline-bird-mascot.jpg"
            alt={character.name}
            onError={() => setImgFallback(true)}
            className={`w-full h-full object-cover ${
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
            aria-label={character.name}
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

        {/* Role / Character Gear Badge */}
        <span
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 border-2 border-white shadow flex items-center justify-center text-sm"
          title={character.weaponOrGear}
        >
          {accessoryEmoji}
        </span>

        {badgeLabel && (
          <span
            className={`absolute -top-2.5 right-0 px-2 py-0.5 rounded-full text-[10px] font-bold shadow whitespace-nowrap ${character.badgeBgCls}`}
          >
            {badgeLabel}
          </span>
        )}
      </div>

      {speechText && (
        <div className="relative bg-white/95 border-2 border-teal-200 rounded-2xl px-4 py-2.5 shadow-sm max-w-md text-slate-800 text-sm leading-relaxed">
          <div className="font-bold text-teal-700 text-xs mb-0.5 flex items-center gap-1.5">
            <span>{character.emoji}</span>
            <span>{character.name} nhắn nhủ:</span>
          </div>
          <p>{speechText}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 3D Golden/Emerald Shield of Honor Component awarded when a student completes a stage
 */
export function Skyline3DShieldBadge({
  periodIndex,
  lessonName,
  size = "md",
  animated = true
}: {
  periodIndex: number;
  lessonName?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}) {
  const dims =
    size === "sm"
      ? "w-11 h-12 text-xs"
      : size === "lg"
      ? "w-24 h-28 text-xl"
      : "w-16 h-20 text-sm";

  return (
    <div className="inline-flex flex-col items-center group">
      <div
        className={`relative ${dims} flex flex-col items-center justify-center select-none ${
          animated ? "transition-transform duration-500 hover:scale-110" : ""
        }`}
        style={{
          filter: "drop-shadow(0 8px 14px rgba(245, 158, 11, 0.45))"
        }}
      >
        {/* 3D SVG Metallic Shield */}
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <linearGradient id={`shieldGold_${periodIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id={`shieldInner_${periodIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0D9488" />
              <stop offset="50%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#064E3B" />
            </linearGradient>
          </defs>
          {/* Outer 3D Gold Rim */}
          <path
            d="M50 4 L92 20 L92 58 C92 86 73 105 50 116 C27 105 8 86 8 58 L8 20 Z"
            fill={`url(#shieldGold_${periodIndex})`}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          {/* Inner 3D Emerald Core */}
          <path
            d="M50 13 L83 26 L83 56 C83 79 68 96 50 106 C32 96 17 79 17 56 L17 26 Z"
            fill={`url(#shieldInner_${periodIndex})`}
            stroke="#FDE047"
            strokeWidth="2"
          />
          {/* Top Star Crown */}
          <polygon
            points="50,20 53,28 62,28 55,33 58,41 50,36 42,41 45,33 38,28 47,28"
            fill="#FDE047"
          />
        </svg>

        {/* Center Stage Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3 pointer-events-none">
          <span className="font-black text-amber-200 drop-shadow leading-none">
            🛡️ C.{periodIndex}
          </span>
        </div>
      </div>

      {lessonName && (
        <span className="mt-1 text-[11px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full max-w-[150px] truncate">
          Khiên Chặng {periodIndex}
        </span>
      )}
    </div>
  );
}
