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
  buddySpecies: string;
  weaponOrGear: string;
  auraGradient: string;
  borderCls: string;
  badgeBgCls: string;
  description: string;
  cartoonRhyme: string;
  educationalLesson: string;
}

export const SKYLINE_CHARACTERS: SkylineCharacterOption[] = [
  {
    id: "SKYLINE_EXPLORER",
    name: "Chim Non Bồ Câu Sky-Line",
    roleTitle: "Bạn Nhỏ Khám Phá Đồng Tiền",
    emoji: "🐣",
    buddySpecies: "Bồ câu non mũ vàng",
    weaponOrGear: "Mũ Học Sinh Vàng & Kính Lúp Sao",
    auraGradient: "from-teal-500 via-sky-500 to-emerald-500",
    borderCls: "border-teal-400",
    badgeBgCls: "bg-teal-600 text-white",
    description: "Vui tươi, lễ phép, dẫn các em làm quen đồng tiền Việt Nam và biết ơn công sức lao động của ba mẹ.",
    cartoonRhyme: "Đồng tiền từ sức mẹ cha, bé ngoan trân quý giữ nhà yên vui!",
    educationalLesson: "Nhận biết tờ tiền Việt Nam và hiểu tiền đến từ lao động chân chính."
  },
  {
    id: "GOLDEN_SHIELD_KNIGHT",
    name: "Bé Heo Hồng Ống Đất",
    roleTitle: "Hiệp Sĩ Giữ Tiền & Nuôi Ước Mơ",
    emoji: "🐷",
    buddySpecies: "Heo đất hồng vương miện",
    weaponOrGear: "Vương Miện Xu Vàng & Ví Khóa Kéo",
    auraGradient: "from-amber-400 via-pink-400 to-amber-600",
    borderCls: "border-amber-400",
    badgeBgCls: "bg-amber-500 text-slate-950",
    description: "Giúp em vuốt phẳng đồng tiền, cất gọn vào ví và đút heo đất mỗi ngày để nuôi ước mơ đẹp.",
    cartoonRhyme: "Tiền phẳng em cất gọn gàng, mỗi ngày một chút heo vàng lớn nhanh!",
    educationalLesson: "Giữ gìn đồng tiền sạch đẹp và rèn thói quen tiết kiệm mỗi ngày."
  },
  {
    id: "WISE_SCHOLAR",
    name: "Thỏ Trắng Thông Thái",
    roleTitle: "Khách Hàng Nhí Mua Sắm Ngoan",
    emoji: "🐰",
    buddySpecies: "Thỏ trắng đeo kính tròn",
    weaponOrGear: "Giỏ Siêu Thị Xanh & Đồng Hồ 3 Giây",
    auraGradient: "from-sky-500 via-teal-500 to-emerald-500",
    borderCls: "border-sky-400",
    badgeBgCls: "bg-sky-600 text-white",
    description: "Cùng em phân biệt thứ Cần và thứ Muốn, dừng lại nghĩ 3 giây trước khi mua và xếp hàng lịch sự.",
    cartoonRhyme: "Cần thì mua trước bé ơi, nghĩ ba giây kỹ mỉm cười thật ngoan!",
    educationalLesson: "Phân biệt Cần – Muốn, xem giá và ứng xử văn minh khi đi mua sắm."
  },
  {
    id: "ECO_HERO",
    name: "Gấu Mật Ấm Áp",
    roleTitle: "Đại Sứ Sẻ Chia & Tiết Kiệm Việc Nhỏ",
    emoji: "🐻",
    buddySpecies: "Gấu nâu choàng khăn lá",
    weaponOrGear: "Áo Choàng Lá Xanh & Hộp Quà Yêu Thương",
    auraGradient: "from-emerald-500 via-green-500 to-lime-500",
    borderCls: "border-emerald-400",
    badgeBgCls: "bg-emerald-600 text-white",
    description: "Nhắc em tắt đèn, khóa vòi nước, giữ gìn đồ dùng học tập và biết san sẻ yêu thương với bạn bè.",
    cartoonRhyme: "Tắt đèn, khóa nước, giữ đồ – sẻ chia yêu thương, điểm mười tặng em!",
    educationalLesson: "Tiết kiệm điện nước, bảo quản đồ dùng và biết chia sẻ với mọi người."
  },
  {
    id: "FUTURE_CAPTAIN",
    name: "Sóc Nâu Chăm Chỉ",
    roleTitle: "Nhà Quản Lý Tài Chính Nhí",
    emoji: "🐿️",
    buddySpecies: "Sóc nâu ba chiếc hũ",
    weaponOrGear: "Ba Chiếc Hũ Hạt Dẻ & Sổ Kế Hoạch Nhí",
    auraGradient: "from-amber-500 via-teal-600 to-cyan-500",
    borderCls: "border-teal-400",
    badgeBgCls: "bg-teal-700 text-white",
    description: "Hướng dẫn em chia tiền vào 3 chiếc hũ: Cần thiết – Tiết kiệm – Chia sẻ và ghi nhật ký tài chính nhí.",
    cartoonRhyme: "Ba chiếc hũ nhỏ xinh xinh: Cần dùng, Tiết kiệm, Nghĩa tình sẻ chia!",
    educationalLesson: "Lập kế hoạch chi tiêu đầu tiên và làm chủ 3 chiếc hũ tài chính."
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

/**
 * Illustrated Children's Cartoon SVG Mascot Avatar for each of the 5 companions
 */
export function SkylineCartoonAvatar({
  characterId = "SKYLINE_EXPLORER",
  mood = "EXPLORER",
  reducedMotion = false,
  className = "w-full h-full"
}: {
  characterId?: string;
  mood?: BirdMood;
  reducedMotion?: boolean;
  className?: string;
}) {
  const character = getCharacterById(characterId);
  const animCls = !reducedMotion && mood === "CELEBRATE" ? "animate-bounce" : "";

  if (character.id === "GOLDEN_SHIELD_KNIGHT") {
    // Bé Heo Hồng Ống Đất (Adorable Pink Piggy Bank with Golden Coin Crown)
    return (
      <svg
        viewBox="0 0 120 120"
        className={`${className} ${animCls}`}
        role="img"
        aria-label={character.name}
      >
        <circle cx="60" cy="60" r="54" fill="#FFF1F2" />
        <circle cx="60" cy="60" r="46" fill="#FFE4E6" opacity="0.7" />
        {/* Cute Piggy Ears */}
        <path d="M26 42 Q18 20 38 30 Z" fill="#FB7185" stroke="#E11D48" strokeWidth="2.5" />
        <path d="M94 42 Q102 20 82 30 Z" fill="#FB7185" stroke="#E11D48" strokeWidth="2.5" />
        {/* Golden Crown & Coin Slot */}
        <polygon points="44,26 52,14 60,23 68,14 76,26" fill="#FACC15" stroke="#D97706" strokeWidth="2" />
        <circle cx="60" cy="20" r="5" fill="#FDE047" stroke="#B45309" strokeWidth="1.5" />
        {/* Chubby Pink Head */}
        <ellipse cx="60" cy="65" rx="35" ry="31" fill="#FDA4AF" stroke="#E11D48" strokeWidth="3" />
        <rect x="50" y="36" width="20" height="4" rx="2" fill="#9F1239" />
        {/* Sparkling Eyes */}
        <circle cx="45" cy="56" r="6" fill="#0F172A" />
        <circle cx="75" cy="56" r="6" fill="#0F172A" />
        <circle cx="43" cy="54" r="2.2" fill="#FFFFFF" />
        <circle cx="73" cy="54" r="2.2" fill="#FFFFFF" />
        {/* Rosy Cheeks */}
        <ellipse cx="34" cy="66" rx="6" ry="3.8" fill="#F43F5E" opacity="0.65" />
        <ellipse cx="86" cy="66" rx="6" ry="3.8" fill="#F43F5E" opacity="0.65" />
        {/* Piggy Snout */}
        <ellipse cx="60" cy="67" rx="13" ry="9.5" fill="#FB7185" stroke="#BE123C" strokeWidth="2" />
        <circle cx="55.5" cy="67" r="2.5" fill="#881337" />
        <circle cx="64.5" cy="67" r="2.5" fill="#881337" />
        {/* Cheerful Smile */}
        <path d="M51 80 Q60 88 69 80" fill="none" stroke="#881337" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (character.id === "WISE_SCHOLAR") {
    // Thỏ Trắng Thông Thái (Cute White Bunny with Long Ears & Smart Glasses)
    return (
      <svg
        viewBox="0 0 120 120"
        className={`${className} ${animCls}`}
        role="img"
        aria-label={character.name}
      >
        <circle cx="60" cy="60" r="54" fill="#F0F9FF" />
        <circle cx="60" cy="60" r="46" fill="#E0F2FE" opacity="0.8" />
        {/* Long Bunny Ears */}
        <ellipse cx="44" cy="27" rx="8.5" ry="20" transform="rotate(-10 44 27)" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.8" />
        <ellipse cx="44" cy="28" rx="4.5" ry="13" transform="rotate(-10 44 28)" fill="#FDA4AF" />
        <ellipse cx="76" cy="27" rx="8.5" ry="20" transform="rotate(10 76 27)" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2.8" />
        <ellipse cx="76" cy="28" rx="4.5" ry="13" transform="rotate(10 76 28)" fill="#FDA4AF" />
        {/* Fluffy Bunny Head */}
        <ellipse cx="60" cy="69" rx="33" ry="28" fill="#FFFFFF" stroke="#0284C7" strokeWidth="3" />
        {/* Smart Round Glasses */}
        <circle cx="46" cy="62" r="9.5" fill="#E0F2FE" fillOpacity="0.45" stroke="#0369A1" strokeWidth="2.5" />
        <circle cx="74" cy="62" r="9.5" fill="#E0F2FE" fillOpacity="0.45" stroke="#0369A1" strokeWidth="2.5" />
        <line x1="55.5" y1="62" x2="64.5" y2="62" stroke="#0369A1" strokeWidth="2.5" />
        {/* Sparkling Eyes */}
        <circle cx="46" cy="62" r="5" fill="#0F172A" />
        <circle cx="74" cy="62" r="5" fill="#0F172A" />
        <circle cx="44.5" cy="60" r="2" fill="#FFFFFF" />
        <circle cx="72.5" cy="60" r="2" fill="#FFFFFF" />
        {/* Rosy Cheeks & Pink Nose */}
        <ellipse cx="34" cy="72" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.6" />
        <ellipse cx="86" cy="72" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.6" />
        <polygon points="56,70 64,70 60,75" fill="#F43F5E" />
        <path d="M53 78 Q60 84 67 78" fill="none" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
        {/* Cute Teal Bowtie */}
        <polygon points="48,93 60,98 48,103" fill="#0D9488" />
        <polygon points="72,93 60,98 72,103" fill="#0D9488" />
        <circle cx="60" cy="98" r="3.5" fill="#FACC15" />
      </svg>
    );
  }

  if (character.id === "ECO_HERO") {
    // Gấu Mật Ấm Áp (Cheerful Honey Bear with Green Leaf Cape)
    return (
      <svg
        viewBox="0 0 120 120"
        className={`${className} ${animCls}`}
        role="img"
        aria-label={character.name}
      >
        <circle cx="60" cy="60" r="54" fill="#ECFDF5" />
        <circle cx="60" cy="60" r="46" fill="#D1FAE5" opacity="0.75" />
        {/* Round Bear Ears */}
        <circle cx="34" cy="36" r="12" fill="#D97706" stroke="#92400E" strokeWidth="2.8" />
        <circle cx="34" cy="36" r="6.5" fill="#FDE68A" />
        <circle cx="86" cy="36" r="12" fill="#D97006" stroke="#92400E" strokeWidth="2.8" />
        <circle cx="86" cy="36" r="6.5" fill="#FDE68A" />
        {/* Green Eco Collar/Cape */}
        <path d="M28 86 Q60 108 92 86 L98 106 Q60 116 22 106 Z" fill="#10B981" stroke="#047857" strokeWidth="2.5" />
        {/* Warm Honey Bear Head */}
        <ellipse cx="60" cy="64" rx="34" ry="30" fill="#F59E0B" stroke="#92400E" strokeWidth="3" />
        {/* Sprout Leaf on Top */}
        <path d="M60 34 Q60 22 70 20 Q68 30 60 34" fill="#22C55E" stroke="#15803D" strokeWidth="2" />
        <path d="M60 34 Q58 24 49 23 Q51 31 60 34" fill="#4ADE80" stroke="#15803D" strokeWidth="2" />
        {/* Eyes */}
        <circle cx="46" cy="56" r="5.8" fill="#0F172A" />
        <circle cx="74" cy="56" r="5.8" fill="#0F172A" />
        <circle cx="44" cy="54" r="2.2" fill="#FFFFFF" />
        <circle cx="72" cy="54" r="2.2" fill="#FFFFFF" />
        {/* Cream Snout & Smile */}
        <ellipse cx="60" cy="69" rx="14" ry="11" fill="#FEF3C7" stroke="#B45309" strokeWidth="2" />
        <ellipse cx="60" cy="65" rx="5.5" ry="4" fill="#78350F" />
        <path d="M53 73 Q60 79 67 73" fill="none" stroke="#78350F" strokeWidth="2.6" strokeLinecap="round" />
        {/* Rosy Cheeks */}
        <ellipse cx="36" cy="66" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.65" />
        <ellipse cx="84" cy="66" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.65" />
      </svg>
    );
  }

  if (character.id === "FUTURE_CAPTAIN") {
    // Sóc Nâu Chăm Chỉ (Lively Acorn Squirrel with Sky-Line Star Visor)
    return (
      <svg
        viewBox="0 0 120 120"
        className={`${className} ${animCls}`}
        role="img"
        aria-label={character.name}
      >
        <circle cx="60" cy="60" r="54" fill="#FEFCE8" />
        <circle cx="60" cy="60" r="46" fill="#FEF08A" opacity="0.55" />
        {/* Fluffy Squirrel Tail */}
        <path d="M84 85 Q112 68 102 42 Q94 26 82 44 Q92 60 78 78 Z" fill="#B45309" stroke="#9A3412" strokeWidth="2.5" />
        {/* Perky Squirrel Ears */}
        <polygon points="32,42 26,20 45,32" fill="#B45309" stroke="#9A3412" strokeWidth="2.5" />
        <polygon points="88,42 94,20 75,32" fill="#B45309" stroke="#9A3412" strokeWidth="2.5" />
        {/* Head */}
        <ellipse cx="58" cy="66" rx="32" ry="28" fill="#F59E0B" stroke="#9A3412" strokeWidth="3" />
        {/* Sky-Line Teal Captain Cap */}
        <path d="M32 45 Q58 26 84 45 Z" fill="#0D9488" stroke="#115E59" strokeWidth="2.5" />
        <circle cx="58" cy="38" r="4" fill="#FACC15" />
        {/* Eyes */}
        <circle cx="45" cy="59" r="5.8" fill="#0F172A" />
        <circle cx="71" cy="59" r="5.8" fill="#0F172A" />
        <circle cx="43.5" cy="57" r="2.2" fill="#FFFFFF" />
        <circle cx="69.5" cy="57" r="2.2" fill="#FFFFFF" />
        {/* Cheeks & Cute Buck Tooth Smile */}
        <ellipse cx="35" cy="69" rx="5.5" ry="3.5" fill="#F43F5E" opacity="0.6" />
        <ellipse cx="81" cy="69" rx="5.5" ry="3.5" fill="#F43F5E" opacity="0.6" />
        <ellipse cx="58" cy="72" rx="12" ry="9" fill="#FEF3C7" />
        <circle cx="58" cy="67" r="3.5" fill="#7C2D12" />
        <rect x="55" y="74" width="6" height="5" rx="1" fill="#FFFFFF" stroke="#7C2D12" strokeWidth="1.5" />
        <path d="M49 73 Q58 80 67 73" fill="none" stroke="#7C2D12" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  // Default: SKYLINE_EXPLORER — Chim Non Bồ Câu Sky-Line (Baby Pigeon with Yellow Student Cap & Coin Star)
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} ${animCls}`}
      role="img"
      aria-label={character.name}
    >
      <circle cx="60" cy="60" r="54" fill="#F0FDFA" />
      <circle cx="60" cy="62" r="46" fill="#CCFBF1" opacity="0.75" />
      {/* Cute Flapping Wings */}
      <ellipse cx="23" cy="68" rx="10" ry="16" transform="rotate(20 23 68)" fill="#38BDF8" stroke="#0284C7" strokeWidth="2.5" />
      <ellipse cx="97" cy="68" rx="10" ry="16" transform="rotate(-20 97 68)" fill="#38BDF8" stroke="#0284C7" strokeWidth="2.5" />
      {/* Chubby Baby Bird Body */}
      <ellipse cx="60" cy="67" rx="33" ry="30" fill="#FFFFFF" stroke="#0D9488" strokeWidth="3" />
      <ellipse cx="60" cy="77" rx="24" ry="16" fill="#E0F2FE" />
      {/* Cheerful Yellow School Cap */}
      <path d="M34 44 Q60 22 86 44 Z" fill="#FACC15" stroke="#D97706" strokeWidth="2.5" />
      <ellipse cx="60" cy="44" rx="28" ry="5" fill="#F59E0B" />
      <circle cx="60" cy="29" r="4" fill="#0D9488" stroke="#FFFFFF" strokeWidth="1.5" />
      {/* Big Sparkling Cartoon Eyes */}
      <circle cx="46" cy="56" r="6.5" fill="#0F172A" />
      <circle cx="74" cy="56" r="6.5" fill="#0F172A" />
      <circle cx="44" cy="53.5" r="2.5" fill="#FFFFFF" />
      <circle cx="72" cy="53.5" r="2.5" fill="#FFFFFF" />
      {/* Rosy Cheeks */}
      <ellipse cx="35" cy="64" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.65" />
      <ellipse cx="85" cy="64" rx="5.5" ry="3.5" fill="#FB7185" opacity="0.65" />
      {/* Golden Beak */}
      <polygon points="53,60 67,60 60,70" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
      {/* Red neckerchief */}
      <polygon points="45,86 75,86 60,97" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
    </svg>
  );
}

export function SkylineBirdCharacter({
  mood = "EXPLORER",
  size = "md",
  reducedMotion = false,
  speechText,
  badgeLabel,
  characterId,
  className = ""
}: SkylineBirdCharacterProps) {
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
        <SkylineCartoonAvatar
          characterId={character.id}
          mood={mood}
          reducedMotion={reducedMotion}
          className="w-full h-full p-0.5"
        />

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
          {character.cartoonRhyme && (
            <p className="mt-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
              🎶 &ldquo;{character.cartoonRhyme}&rdquo;
            </p>
          )}
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

export interface StageVisualMeta {
  periodIndex: number;
  skyGradient: string;
  hillPrimary: string;
  hillSecondary: string;
  mainIcon: string;
  subIcons: [string, string];
  gameGenreBadge: string;
  sceneCaption: string;
  accentBgCls: string;
}

const STAGE_VISUAL_META_MAP: Record<number, Omit<StageVisualMeta, "periodIndex">> = {
  1: {
    skyGradient: "from-amber-200 via-sky-200 to-teal-200",
    hillPrimary: "#10B981",
    hillSecondary: "#059669",
    mainIcon: "🪙",
    subIcons: ["🏛️", "✨"],
    gameGenreBadge: "🎮 Khám phá Đồng xu",
    sceneCaption: "Cổng Thị Trấn & Kho Báu Xu",
    accentBgCls: "bg-amber-500 text-slate-950"
  },
  2: {
    skyGradient: "from-sky-200 via-cyan-100 to-emerald-200",
    hillPrimary: "#14B8A6",
    hillSecondary: "#0D9488",
    mainIcon: "🎒",
    subIcons: ["🧭", "⛺"],
    gameGenreBadge: "🎒 Game Soạn Ba Lô",
    sceneCaption: "Trạm Ba Lô Cần & Muốn",
    accentBgCls: "bg-teal-600 text-white"
  },
  3: {
    skyGradient: "from-emerald-200 via-teal-100 to-amber-200",
    hillPrimary: "#059669",
    hillSecondary: "#047857",
    mainIcon: "🌳",
    subIcons: ["🏺", "🪙"],
    gameGenreBadge: "🪺 Game 3 Chiếc Hũ",
    sceneCaption: "Cây Đại Thụ Ba Chiếc Hũ",
    accentBgCls: "bg-emerald-600 text-white"
  },
  4: {
    skyGradient: "from-teal-200 via-emerald-100 to-sky-200",
    hillPrimary: "#22C55E",
    hillSecondary: "#15803D",
    mainIcon: "🏡",
    subIcons: ["💡", "💧"],
    gameGenreBadge: "🦸 Game Hiệp Sĩ Xanh",
    sceneCaption: "Ngôi Làng Tiết Kiệm Xanh",
    accentBgCls: "bg-emerald-700 text-white"
  },
  5: {
    skyGradient: "from-amber-200 via-orange-100 to-sky-200",
    hillPrimary: "#0EA5E9",
    hillSecondary: "#0284C7",
    mainIcon: "📓",
    subIcons: ["🔎", "🪙"],
    gameGenreBadge: "🔎 Game Thám Tử Xu",
    sceneCaption: "Lều Nhật Ký Đồng Xu",
    accentBgCls: "bg-sky-600 text-white"
  },
  6: {
    skyGradient: "from-rose-200 via-amber-100 to-teal-200",
    hillPrimary: "#F59E0B",
    hillSecondary: "#D97706",
    mainIcon: "🏪",
    subIcons: ["🧺", "🏷️"],
    gameGenreBadge: "🏪 Game Quầy Hàng",
    sceneCaption: "Quầy Hàng Chim Xanh",
    accentBgCls: "bg-amber-500 text-white"
  },
  7: {
    skyGradient: "from-sky-200 via-indigo-100 to-amber-200",
    hillPrimary: "#0D9488",
    hillSecondary: "#0F766E",
    mainIcon: "🛠️",
    subIcons: ["👩‍⚕️", "🌾"],
    gameGenreBadge: "🌟 Game Nghề Nghiệp",
    sceneCaption: "Quảng Trường Nghề Quý",
    accentBgCls: "bg-teal-700 text-white"
  },
  8: {
    skyGradient: "from-pink-200 via-rose-100 to-amber-200",
    hillPrimary: "#10B981",
    hillSecondary: "#059669",
    mainIcon: "💝",
    subIcons: ["🎁", "🌈"],
    gameGenreBadge: "💝 Game Sẻ Chia",
    sceneCaption: "Vườn Cây Sẻ Chia",
    accentBgCls: "bg-rose-500 text-white"
  },
  9: {
    skyGradient: "from-cyan-200 via-sky-100 to-teal-200",
    hillPrimary: "#0284C7",
    hillSecondary: "#0369A1",
    mainIcon: "🛒",
    subIcons: ["🥛", "🍎"],
    gameGenreBadge: "🛒 Game Siêu Thị",
    sceneCaption: "Siêu Thị Hải Âu Thông Thái",
    accentBgCls: "bg-sky-600 text-white"
  },
  10: {
    skyGradient: "from-amber-200 via-rose-200 to-sky-200",
    hillPrimary: "#E11D48",
    hillSecondary: "#BE123C",
    mainIcon: "🎪",
    subIcons: ["🎈", "🎡"],
    gameGenreBadge: "🎪 Dự Án Hội Chợ",
    sceneCaption: "Hội Chợ Tài Chính Nhí",
    accentBgCls: "bg-amber-500 text-slate-950"
  },
  11: {
    skyGradient: "from-yellow-200 via-amber-100 to-emerald-200",
    hillPrimary: "#16A34A",
    hillSecondary: "#15803D",
    mainIcon: "🐷",
    subIcons: ["🪺", "🌟"],
    gameGenreBadge: "🐷 Game Nuôi Heo Đất",
    sceneCaption: "Đồi Tổ Ấm & Heo Đất Vàng",
    accentBgCls: "bg-amber-500 text-slate-950"
  },
  12: {
    skyGradient: "from-sky-200 via-teal-100 to-emerald-600",
    hillPrimary: "#0D9488",
    hillSecondary: "#115E59",
    mainIcon: "📋",
    subIcons: ["🗺️", "✅"],
    gameGenreBadge: "📋 Game Lập Kế Hoạch",
    sceneCaption: "Trạm Kế Hoạch Mua Sắm",
    accentBgCls: "bg-teal-600 text-white"
  },
  13: {
    skyGradient: "from-emerald-200 via-lime-100 to-teal-200",
    hillPrimary: "#15803D",
    hillSecondary: "#166534",
    mainIcon: "♻️",
    subIcons: ["🧸", "📚"],
    gameGenreBadge: "♻️ Game Tái Chế Xanh",
    sceneCaption: "Xưởng Tái Chế & Đổi Đồ Cũ",
    accentBgCls: "bg-emerald-600 text-white"
  },
  14: {
    skyGradient: "from-teal-600 via-amber-100 to-sky-200",
    hillPrimary: "#0284C7",
    hillSecondary: "#0369A1",
    mainIcon: "📺",
    subIcons: ["🕵️", "💡"],
    gameGenreBadge: "🕵️ Game Tỉnh Táo Quảng Cáo",
    sceneCaption: "Phố Quảng Cáo Rực Rỡ",
    accentBgCls: "bg-[#003B3A] text-white"
  },
  15: {
    skyGradient: "from-amber-300 via-yellow-200 to-emerald-200",
    hillPrimary: "#D97706",
    hillSecondary: "#0F766E",
    mainIcon: "🏆",
    subIcons: ["👑", "🎆"],
    gameGenreBadge: "👑 Tổng Kết Vinh Danh",
    sceneCaption: "Đài Vinh Danh Tài Chính Nhí",
    accentBgCls: "bg-amber-400 text-slate-950"
  }
};

const STAGE_CARTOON_BUDDY_IDS: Record<number, string> = {
  1: "SKYLINE_EXPLORER",
  2: "SKYLINE_EXPLORER",
  3: "ECO_HERO",
  4: "GOLDEN_SHIELD_KNIGHT",
  5: "WISE_SCHOLAR",
  6: "WISE_SCHOLAR",
  7: "WISE_SCHOLAR",
  8: "WISE_SCHOLAR",
  9: "GOLDEN_SHIELD_KNIGHT",
  10: "GOLDEN_SHIELD_KNIGHT",
  11: "ECO_HERO",
  12: "FUTURE_CAPTAIN",
  13: "ECO_HERO",
  14: "FUTURE_CAPTAIN",
  15: "FUTURE_CAPTAIN"
};

export function getStageVisualMeta(periodIndex: number): StageVisualMeta {
  const normalized = ((Math.max(1, periodIndex) - 1) % 15) + 1;
  const meta = STAGE_VISUAL_META_MAP[normalized] || STAGE_VISUAL_META_MAP[1];
  return {
    periodIndex,
    ...meta
  };
}

export function getStageCartoonBuddy(periodIndex: number): SkylineCharacterOption {
  const normalized = ((Math.max(1, periodIndex) - 1) % 15) + 1;
  return getCharacterById(STAGE_CARTOON_BUDDY_IDS[normalized] || "SKYLINE_EXPLORER");
}

/**
 * Illustrated Gamified Scene Banner for each Stage Card (Chặng 1 -> Chặng 15)
 */
export function StageGameIllustrationBanner({
  periodIndex,
  isLocked = false,
  isCompleted = false,
  isCurrent = false,
  compact = false
}: {
  periodIndex: number;
  isLocked?: boolean;
  isCompleted?: boolean;
  isCurrent?: boolean;
  compact?: boolean;
}) {
  const meta = getStageVisualMeta(periodIndex);
  const buddy = getStageCartoonBuddy(periodIndex);

  return (
    <div
      className={`relative w-full ${
        compact ? "h-20" : "h-24"
      } rounded-xl overflow-hidden border ${
        isLocked
          ? "border-slate-300 grayscale-[35%]"
          : isCurrent
          ? "border-amber-400 shadow-sm"
          : isCompleted
          ? "border-emerald-400"
          : "border-teal-200"
      } bg-gradient-to-br ${meta.skyGradient} select-none`}
    >
      {/* Illustrated Cartoon Island Landscape SVG Background */}
      <svg
        viewBox="0 0 260 95"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {/* Warm Sun & Clouds */}
        <circle cx="222" cy="22" r="14" fill="#FDE047" opacity="0.85" />
        <circle cx="222" cy="22" r="20" fill="#FEF08A" opacity="0.35" />
        <ellipse cx="48" cy="20" rx="18" ry="6" fill="#FFFFFF" opacity="0.75" />
        <ellipse cx="58" cy="18" rx="12" ry="5" fill="#FFFFFF" opacity="0.85" />
        <ellipse cx="152" cy="15" rx="15" ry="5" fill="#FFFFFF" opacity="0.65" />

        {/* Distant Island Hills */}
        <path
          d="M0 72 Q65 42 135 66 T260 58 L260 95 L0 95 Z"
          fill={meta.hillPrimary}
          opacity="0.45"
        />
        {/* Foreground Island Hills & Winding Adventure Path */}
        <path
          d="M0 80 Q85 56 170 74 T260 68 L260 95 L0 95 Z"
          fill={meta.hillSecondary}
          opacity="0.68"
        />
        <path
          d="M25 95 Q95 72 130 68 T220 95"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="5"
          strokeDasharray="6 4"
          opacity="0.85"
        />
      </svg>

      {/* Top-left Game Genre Pill */}
      <div className="absolute top-1.5 left-1.5 z-10">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-xs ${meta.accentBgCls}`}
        >
          {meta.gameGenreBadge}
        </span>
      </div>

      {/* Top-right Completed Shield / Trophy Indicator */}
      {isCompleted && (
        <div
          className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs flex items-center gap-0.5"
          title="Đã hoàn thành và nhận Khiên Danh Dự"
        >
          <span>🛡️</span>
          <span>🚩</span>
        </div>
      )}

      {/* Center Illustrated Game Scene Artwork Badge + Cartoon Buddy */}
      <div className="relative z-10 h-full flex items-center justify-center pt-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full bg-white border-2 border-teal-300 shadow-xs overflow-hidden flex items-center justify-center"
            title={`Bạn đồng hành: ${buddy.name}`}
          >
            <SkylineCartoonAvatar
              characterId={buddy.id}
              reducedMotion
              className="w-full h-full"
            />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-amber-300 shadow-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            {meta.mainIcon}
          </div>
          <span className="w-7 h-7 rounded-xl bg-white/85 backdrop-blur-xs border border-white shadow-xs flex items-center justify-center text-sm">
            {meta.subIcons[1]}
          </span>
        </div>
      </div>
    </div>
  );
}
