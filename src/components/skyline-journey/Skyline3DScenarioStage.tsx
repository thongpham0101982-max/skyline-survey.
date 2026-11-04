"use client";

import React, { useState } from "react";
import type { StudentStageView } from "@/lib/skyline-journey/service";
import {
  playSkylineSfx,
  speakVietnameseText,
  GRADE_MUSIC_META,
  getDefaultThemeForGrade
} from "./SkylineBirdCharacter";

export interface Skyline3DScenarioStageProps {
  stage: StudentStageView;
  grade: number;
  studentName: string;
  muted: boolean;
  reducedMotion: boolean;
  // Mechanic A: BACKPACK_BUILDER
  activeContextIdx: number;
  onSelectContextIdx?: (idx: number) => void;
  backpackPlacements: Record<string, Record<string, "GROUP_A" | "GROUP_B">>;
  onCycleBackpackItem?: (contextId: string, itemId: string) => void;
  // Mechanic B: BIRD_SHOP
  selectedShopItemIds: string[];
  onToggleShopItem?: (id: string) => void;
  // Mechanic C: DREAM_NEST
  jarAllocations: Record<string, number>;
  selectedGoalId: string;
  // Mechanic D: VILLAGE_RESCUE
  hotspotActions: Record<string, string>;
  onSelectHotspotAction?: (hotspotId: string, actionId: string) => void;
  // Mechanic E: COIN_DIARY_AD_STREET
  entryClassifications: Record<string, boolean>;
  onToggleEntryClassification?: (entryId: string) => void;
  adDecisions: Record<string, { identifiedHookType?: string; shouldBuy: boolean }>;
  onToggleAdShouldBuy?: (adId: string) => void;
  capstoneAllocations?: { needCoins: number; saveCoins: number; shareCoins: number };
}

type CameraPreset = "CLASSROOM_FRONT" | "ISOMETRIC_TABLE" | "LEFT_ANGLE" | "RIGHT_ANGLE";

const CAMERA_TRANSFORMS: Record<
  CameraPreset,
  { rotateX: number; rotateY: number; scale: number; label: string }
> = {
  CLASSROOM_FRONT: {
    rotateX: 9,
    rotateY: 0,
    scale: 1,
    label: "🏫 Chính diện Lớp học 3D"
  },
  ISOMETRIC_TABLE: {
    rotateX: 20,
    rotateY: -9,
    scale: 0.98,
    label: "📐 Góc nhìn Sa bàn 3D"
  },
  LEFT_ANGLE: {
    rotateX: 13,
    rotateY: 13,
    scale: 0.98,
    label: "↖️ Nghiêng Trái 3D"
  },
  RIGHT_ANGLE: {
    rotateX: 13,
    rotateY: -13,
    scale: 0.98,
    label: "↗️ Nghiêng Phải 3D"
  }
};

const GRADE_CLASSROOM_THEMES: Record<
  number,
  {
    roomTitle: string;
    wallGradient: string;
    floorColor: string;
    boardBorder: string;
    teacherRole: string;
    classmatesNote: string;
  }
> = {
  1: {
    roomTitle: "Phòng Học Trải Nghiệm Đồng Xu Nhí 3D • Khối 1 (TC01S)",
    wallGradient: "from-sky-900 via-teal-900 to-emerald-900",
    floorColor: "from-amber-900/80 via-amber-800/70 to-teal-950",
    boardBorder: "border-amber-300",
    teacherRole: "Chim Sky-Line & Cô Giáo Tài Chính Lớp 1",
    classmatesNote: "Các bạn nhỏ lớp 1 đang cùng quan sát đồng xu và chiếc heo đất 3D trên bàn!"
  },
  2: {
    roomTitle: "Phòng Thực Hành Tài Chính Thông Thái 3D • Khối 2 (TC02S)",
    wallGradient: "from-teal-900 via-sky-900 to-indigo-950",
    floorColor: "from-amber-950/80 via-slate-900 to-teal-950",
    boardBorder: "border-teal-300",
    teacherRole: "Chim Sky-Line & Thầy Cô Cố Vấn Tài Chính 2S",
    classmatesNote: "Lớp học Khối 2 đang thảo luận sôi nổi về Cần – Muốn và Siêu thị 3D!"
  },
  3: {
    roomTitle: "Phòng Mô Phỏng Quyết Định & Hệ Quả 3D • Khối 3 (TC03S)",
    wallGradient: "from-indigo-950 via-sky-900 to-teal-900",
    floorColor: "from-slate-900 via-indigo-950 to-slate-950",
    boardBorder: "border-sky-300",
    teacherRole: "Chim Sky-Line & Chuyên Gia Phân Tích Nhí 3S",
    classmatesNote: "Tổ thực hành Khối 3 đang phân tích hóa đơn và kiểm tra chất lượng hàng hóa 3D!"
  },
  4: {
    roomTitle: "Studio Kiến Trúc Ngân Sách & Hợp Tác 3D • Khối 4 (TC04S)",
    wallGradient: "from-slate-900 via-emerald-950 to-sky-950",
    floorColor: "from-slate-950 via-emerald-950/80 to-slate-900",
    boardBorder: "border-emerald-300",
    teacherRole: "Chim Sky-Line & Cố Vấn Quản Lý Tài Nguyên 4S",
    classmatesNote: "Nhóm dự án Khối 4 đang điều phối ngân sách sự kiện trên bàn sa bàn 3D!"
  },
  5: {
    roomTitle: "Trung Tâm Điều Hành Dự Án Tài Chính Nhí 3D • Khối 5 (TC05S)",
    wallGradient: "from-purple-950 via-indigo-950 to-teal-950",
    floorColor: "from-slate-950 via-indigo-950 to-purple-950",
    boardBorder: "border-amber-400",
    teacherRole: "Chim Sky-Line & Hội Đồng Cố Vấn Dự Án 5S",
    classmatesNote: "Hội đồng Khối 5 đang đánh giá kế hoạch tài chính, điều chỉnh rủi ro và tự nhìn nhận!"
  }
};

export function Skyline3DScenarioStage({
  stage,
  grade,
  studentName,
  muted,
  reducedMotion,
  activeContextIdx,
  onSelectContextIdx,
  backpackPlacements,
  onCycleBackpackItem,
  selectedShopItemIds,
  onToggleShopItem,
  jarAllocations,
  selectedGoalId,
  hotspotActions,
  onSelectHotspotAction,
  entryClassifications,
  onToggleEntryClassification,
  adDecisions,
  onToggleAdShouldBuy,
  capstoneAllocations
}: Skyline3DScenarioStageProps) {
  const [camera, setCamera] = useState<CameraPreset>("CLASSROOM_FRONT");
  const [handRaised, setHandRaised] = useState(false);
  const [classroomAnnouncement, setClassroomAnnouncement] = useState<string | null>(null);

  const roomTheme = GRADE_CLASSROOM_THEMES[grade] || GRADE_CLASSROOM_THEMES[2];
  const camTransform = CAMERA_TRANSFORMS[camera];
  const musicMeta = GRADE_MUSIC_META[getDefaultThemeForGrade(grade)];

  const handleRingClassroomBell = () => {
    playSkylineSfx("CLASSROOM_BELL", muted);
    const msg = `Kính coong! Chào mừng bạn ${studentName} bước vào tiết học Giáo dục Tài chính Khối ${grade}, Bài ${stage.periodIndex}: ${stage.lessonName}!`;
    setClassroomAnnouncement(msg);
    speakVietnameseText(msg, muted);
  };

  const handleRaiseHandInClass = () => {
    playSkylineSfx("CLASSROOM_APPLAUSE", muted);
    setHandRaised(true);
    const tip = `Hoan hô ${studentName} đã giơ tay phát biểu! Gợi ý trên bảng 3D cho tiết học này: ${stage.interactive.mascotGuideTip}`;
    setClassroomAnnouncement(tip);
    speakVietnameseText(tip, muted);
    setTimeout(() => setHandRaised(false), 3500);
  };

  // Render 3D Diorama Objects inside the Classroom Simulation Table according to the active mechanic
  const render3DTableDiorama = () => {
    const mechanic = stage.interactive.mechanic;

    // A. BACKPACK_BUILDER 3D DIORAMA
    if (mechanic === "BACKPACK_BUILDER" && stage.interactive.backpackConfig) {
      const cfg = stage.interactive.backpackConfig;
      const ctx = cfg.contexts[activeContextIdx] || cfg.contexts[0];
      const currentMap = backpackPlacements[ctx.id] || {};
      const groupACount = Object.values(currentMap).filter((v) => v === "GROUP_A").length;
      const groupBCount = Object.values(currentMap).filter((v) => v === "GROUP_B").length;
      const totalAssigned = groupACount + groupBCount;
      const tiltDeg = Math.max(-14, Math.min(14, (groupBCount - groupACount) * 4));

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-amber-300">
                🎒 Sa bàn 3D: {ctx.title} ({ctx.badge})
              </span>
              {cfg.contexts.length > 1 && (
                <div className="flex items-center gap-1">
                  {cfg.contexts.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectContextIdx?.(idx)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                        idx === activeContextIdx
                          ? "bg-amber-400 text-slate-950 font-black"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      Bối cảnh {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 font-bold">
              Chạm vật thể 3D để đổi nhóm • Đã xếp: {totalAssigned}/{ctx.items.length}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left: 3D Floating Item Cubes on the Classroom Table */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ctx.items.map((item) => {
                const group = currentMap[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playSkylineSfx("CLICK", muted);
                      onCycleBackpackItem?.(ctx.id, item.id);
                    }}
                    style={{
                      transform: reducedMotion
                        ? undefined
                        : group === "GROUP_A"
                        ? "translateZ(26px) translateY(-4px)"
                        : group === "GROUP_B"
                        ? "translateZ(18px) translateY(-2px)"
                        : "translateZ(8px)"
                    }}
                    className={`group relative rounded-2xl p-3 text-left transition-all duration-300 border-b-4 cursor-pointer ${
                      group === "GROUP_A"
                        ? "bg-gradient-to-b from-emerald-500 to-teal-700 border-emerald-900 text-white shadow-[0_10px_20px_rgba(16,185,129,0.4)]"
                        : group === "GROUP_B"
                        ? "bg-gradient-to-b from-amber-400 to-orange-600 border-orange-900 text-slate-950 shadow-[0_10px_20px_rgba(245,158,11,0.4)]"
                        : "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-950 text-slate-200 hover:from-slate-700 hover:to-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-2xl drop-shadow">{item.emoji}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full truncate max-w-[95px] ${
                          group === "GROUP_A"
                            ? "bg-white text-emerald-900"
                            : group === "GROUP_B"
                            ? "bg-slate-950 text-amber-300"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {group === "GROUP_A"
                          ? ctx.targetGroupAName
                          : group === "GROUP_B"
                          ? ctx.targetGroupBName
                          : "Chạm xếp 3D"}
                      </span>
                    </div>
                    <div className="font-extrabold text-xs mt-1.5 line-clamp-1">{item.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Right: 3D Volumetric Balance Scale & Backpack Model */}
            <div className="lg:col-span-5 bg-slate-950/75 border-2 border-teal-400/40 rounded-2xl p-4 text-center">
              <div className="text-xs font-extrabold text-teal-200 mb-3">
                ⚖️ Cân Thăng Bằng Quyết Định 3D Trong Lớp Học
              </div>
              <div
                className="mx-auto max-w-xs transition-transform duration-500"
                style={{
                  transform: reducedMotion ? undefined : `rotateZ(${tiltDeg}deg)`
                }}
              >
                <div className="flex items-end justify-between px-3">
                  <div className="bg-emerald-500/25 border-2 border-emerald-400 rounded-2xl px-3 py-2 text-center shadow-lg">
                    <div className="text-xl">🛡️</div>
                    <div className="text-[10px] font-black text-emerald-300 truncate max-w-[95px]">
                      {ctx.targetGroupAName}
                    </div>
                    <div className="text-base font-black text-white">{groupACount} món</div>
                  </div>

                  <div className="text-3xl pb-1">🎒</div>

                  <div className="bg-amber-500/25 border-2 border-amber-400 rounded-2xl px-3 py-2 text-center shadow-lg">
                    <div className="text-xl">🎈</div>
                    <div className="text-[10px] font-black text-amber-300 truncate max-w-[95px]">
                      {ctx.targetGroupBName}
                    </div>
                    <div className="text-base font-black text-white">{groupBCount} món</div>
                  </div>
                </div>
                <div className="h-2.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 rounded-full mt-1 shadow" />
              </div>
              <div className="w-6 h-4 mx-auto bg-teal-400/60 mt-0.5 rounded-b" />
              <p className="text-[11px] text-sky-200 mt-2">
                Chạm vào từng vật phẩm trên bàn học 3D để đặt lên bàn cân quyết định!
              </p>
            </div>
          </div>
        </div>
      );
    }

    // B. BIRD_SHOP 3D DIORAMA
    if (mechanic === "BIRD_SHOP" && stage.interactive.shopConfig) {
      const cfg = stage.interactive.shopConfig;
      const totalSpent = cfg.items
        .filter((it) => selectedShopItemIds.includes(it.id))
        .reduce((sum, it) => sum + it.price, 0);
      const remaining = cfg.walletBudget - totalSpent;

      return (
        <div className="space-y-4">
          {/* 3D Market Stall Awning */}
          <div className="rounded-2xl bg-gradient-to-r from-rose-500 via-amber-400 to-teal-500 p-1 shadow-lg">
            <div className="bg-slate-950/90 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-black text-amber-300 flex items-center gap-1.5">
                <span>🏪</span>
                <span>MÔ HÌNH 3D: {cfg.shopName.toUpperCase()} (Chạm kệ hàng 3D để lấy/bỏ món)</span>
              </span>
              <div className="flex items-center gap-3 font-extrabold">
                <span className="text-sky-200">Ví: {cfg.walletBudget} xu</span>
                <span className="text-amber-300">Chi: {totalSpent} xu</span>
                <span className={remaining >= 0 ? "text-emerald-300" : "text-rose-400"}>
                  Còn: {remaining} xu
                </span>
              </div>
            </div>
          </div>

          {/* 3D Store Shelves & 3D Checkout Counter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {cfg.items.map((item) => {
                const picked = selectedShopItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playSkylineSfx("COIN", muted);
                      onToggleShopItem?.(item.id);
                    }}
                    style={{
                      transform: reducedMotion
                        ? undefined
                        : picked
                        ? "translateZ(28px) translateY(-5px)"
                        : "translateZ(10px)"
                    }}
                    className={`rounded-2xl p-3 text-left transition-all duration-300 border-b-4 cursor-pointer ${
                      picked
                        ? "bg-gradient-to-b from-teal-500 to-emerald-700 border-emerald-950 text-white shadow-[0_12px_24px_rgba(20,184,166,0.45)]"
                        : "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-950 text-slate-100 hover:from-slate-700 hover:to-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl drop-shadow">{item.icon}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow">
                        {item.price} xu
                      </span>
                    </div>
                    <div className="font-extrabold text-xs mt-1.5 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] opacity-85 mt-0.5 line-clamp-1">
                      {picked ? "🛒 Đã đặt vào giỏ 3D" : `🏷️ ${item.qualityLabel}`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3D POS Cash Register & Shopping Basket */}
            <div className="lg:col-span-4 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/50 rounded-2xl p-4 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                <span className="text-xs font-black text-amber-300">📠 QUẦY THU NGÂN 3D</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                  {selectedShopItemIds.length} món
                </span>
              </div>
              <div className="min-h-[60px] flex flex-wrap gap-1.5 items-center justify-center bg-black/40 rounded-xl p-2 border border-white/10">
                {selectedShopItemIds.length === 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Khay hàng 3D đang trống — Hãy chạm chọn món trên kệ!
                  </span>
                ) : (
                  cfg.items
                    .filter((it) => selectedShopItemIds.includes(it.id))
                    .map((it) => (
                      <span
                        key={it.id}
                        className="px-2 py-1 rounded-lg bg-teal-600/40 border border-teal-400 text-white text-xs font-bold flex items-center gap-1"
                      >
                        <span>{it.icon}</span>
                        <span>{it.price}</span>
                      </span>
                    ))
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400">Tổng thanh toán</div>
                  <div className="font-black text-amber-300 text-sm">{totalSpent} xu</div>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400">Ngân sách còn</div>
                  <div
                    className={`font-black text-sm ${
                      remaining >= 0 ? "text-emerald-300" : "text-rose-400"
                    }`}
                  >
                    {remaining} xu
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // C. DREAM_NEST 3D DIORAMA
    if (mechanic === "DREAM_NEST" && stage.interactive.nestConfig) {
      const cfg = stage.interactive.nestConfig;
      const goal = cfg.goals?.find((g) => g.id === selectedGoalId) || cfg.goals?.[0];
      const totalAllocated = Object.values(jarAllocations).reduce((s, v) => s + v, 0);

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
            <span className="font-extrabold text-amber-300">
              🪺 Sa bàn 3D: Cây Đại Thụ Ba Chiếc Hũ & Tổ Ấm Ước Mơ
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-300 font-bold text-emerald-200">
              Đã phân bổ: {totalAllocated}/{cfg.totalCoins} đồng xu
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            {cfg.jars.map((jar) => {
              const coins = jarAllocations[jar.id] ?? jar.minCoins;
              const fillPct =
                cfg.totalCoins > 0 ? Math.min(100, Math.round((coins / cfg.totalCoins) * 100)) : 35;
              return (
                <div
                  key={jar.id}
                  style={{
                    transform: reducedMotion ? undefined : "translateZ(18px)"
                  }}
                  className="bg-slate-900/90 border-2 border-teal-400/50 rounded-2xl p-3 text-center shadow-lg"
                >
                  <div className="text-xs font-black text-amber-200 truncate">
                    {jar.emoji} {jar.name}
                  </div>
                  {/* 3D Transparent Cylinder Jar with Rising Coin Column */}
                  <div className="relative h-24 w-16 mx-auto my-2 rounded-2xl border-2 border-white/40 bg-gradient-to-b from-white/10 to-white/5 overflow-hidden flex items-end justify-center p-1 shadow-inner">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-amber-500 via-yellow-400 to-amber-200 transition-all duration-300 shadow-[0_0_15px_rgba(251,191,36,0.7)]"
                      style={{ height: `${Math.max(12, fillPct)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-950 drop-shadow">
                      {coins} xu
                    </span>
                  </div>
                  <div className="text-[10px] text-sky-200">Tỷ lệ: {fillPct}%</div>
                </div>
              );
            })}

            {/* 3D Glowing Dream Nest Model */}
            <div className="bg-gradient-to-b from-amber-500/25 to-emerald-600/25 border-2 border-amber-300 rounded-2xl p-3.5 text-center shadow-xl">
              <div className="text-4xl drop-shadow">{goal?.emoji || "🪺"}</div>
              <div className="font-black text-xs text-amber-200 mt-1">
                {goal ? goal.name : "Tổ Ấm Ước Mơ 3D"}
              </div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {totalAllocated === cfg.totalCoins
                  ? "✨ Đã cân đối đủ 100% quỹ xu!"
                  : `Còn ${cfg.totalCoins - totalAllocated} xu cần xếp`}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // D. VILLAGE_RESCUE 3D DIORAMA
    if (mechanic === "VILLAGE_RESCUE" && stage.interactive.villageConfig) {
      const hotspots = stage.interactive.villageConfig.hotspots;
      const resolvedCount = hotspots.filter(
        (h) => hotspotActions[h.id] === h.correctActionId
      ).length;

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
            <span className="font-extrabold text-emerald-300">
              🏡 Sa bàn 3D: Ngôi Làng Sinh Thái & Tiết Kiệm Tài Nguyên (Chạm xử lý trực tiếp trên mô hình 3D)
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400 font-bold">
              Đã khôi phục xanh: {resolvedCount}/{hotspots.length} địa điểm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hotspots.map((spot) => {
              const selectedActId = hotspotActions[spot.id];
              const isGreen = selectedActId === spot.correctActionId;

              return (
                <div
                  key={spot.id}
                  style={{
                    transform: reducedMotion
                      ? undefined
                      : isGreen
                      ? "translateZ(24px) translateY(-4px)"
                      : "translateZ(10px)"
                  }}
                  className={`rounded-2xl p-3.5 border-b-4 transition-all duration-300 ${
                    isGreen
                      ? "bg-gradient-to-b from-emerald-600 to-teal-800 border-emerald-950 text-white shadow-[0_10px_24px_rgba(16,185,129,0.4)]"
                      : selectedActId
                      ? "bg-gradient-to-b from-amber-600 to-orange-800 border-orange-950 text-white"
                      : "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-950 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{spot.icon}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-black/30">
                      {isGreen
                        ? "🌿 Đã Khôi Phục"
                        : spot.safetyType === "ASK_ADULT"
                        ? "👨‍👩‍👧 Nhờ người lớn"
                        : "🧒 Em tự làm"}
                    </span>
                  </div>
                  <div className="font-extrabold text-xs mt-1.5">{spot.title}</div>
                  <div className="text-[11px] opacity-90 mt-0.5 line-clamp-1">
                    {isGreen ? spot.restoredState : spot.problemState}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {spot.actions.map((act, idx) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          playSkylineSfx("CLICK", muted);
                          onSelectHotspotAction?.(spot.id, act.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          selectedActId === act.id
                            ? "bg-amber-300 text-slate-950 font-black shadow"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        Cách {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // E. COIN_DIARY_AD_STREET 3D DIORAMA
    if (mechanic === "COIN_DIARY_AD_STREET" && stage.interactive.diaryAdConfig) {
      const cfg = stage.interactive.diaryAdConfig;
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
            <span className="font-extrabold text-amber-300">
              🔎 Sa bàn 3D: Phố Quảng Cáo & Bàn Kiểm Toán Nhí
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 font-bold">
              Ngân sách đầu kỳ: {cfg.startingCoins} xu
            </span>
          </div>

          {cfg.diaryEntries && cfg.diaryEntries.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {cfg.diaryEntries.map((entry) => {
                const isMarkedNecessary = entryClassifications[entry.id];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      playSkylineSfx("COIN", muted);
                      onToggleEntryClassification?.(entry.id);
                    }}
                    className={`rounded-2xl p-3 text-left border-b-4 transition cursor-pointer ${
                      isMarkedNecessary === true
                        ? "bg-gradient-to-b from-emerald-600 to-teal-800 border-emerald-950 text-white shadow-lg"
                        : isMarkedNecessary === false
                        ? "bg-gradient-to-b from-amber-500 to-orange-700 border-orange-950 text-white shadow-lg"
                        : "bg-slate-800/90 border-slate-950 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{entry.emoji}</span>
                      <span className="text-xs font-black text-amber-300">-{entry.cost} xu</span>
                    </div>
                    <div className="font-bold text-xs mt-1 line-clamp-1">{entry.itemName}</div>
                    <div className="text-[10px] opacity-90 mt-0.5">
                      {isMarkedNecessary === true
                        ? "✅ Khoản Cần thiết"
                        : isMarkedNecessary === false
                        ? "🎈 Khoản Mong muốn"
                        : "Chạm phân loại sổ 3D"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : cfg.adBillboards && cfg.adBillboards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cfg.adBillboards.map((ad) => {
                const dec = adDecisions[ad.id];
                return (
                  <div
                    key={ad.id}
                    className="bg-slate-900/90 border-2 border-amber-400/50 rounded-2xl p-3.5 flex flex-col justify-between gap-2 shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{ad.emoji}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/30 border border-rose-300 text-rose-200 text-[10px] font-black">
                          📺 {ad.hookLabel}
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-white mt-1.5">
                        {ad.productName} ({ad.price} xu)
                      </div>
                      <div className="text-[11px] text-amber-200 italic mt-0.5">
                        “{ad.adSlogan}”
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSkylineSfx("CLICK", muted);
                        onToggleAdShouldBuy?.(ad.id);
                      }}
                      className={`w-full py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                        dec?.shouldBuy
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-white/15 hover:bg-white/25 text-white"
                      }`}
                    >
                      {dec?.shouldBuy ? "🛒 Quyết định: Mua" : "🛑 Quyết định: Không mua"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            capstoneAllocations && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-900/60 border border-emerald-400 rounded-2xl p-3">
                  <div className="text-xs text-emerald-200 font-bold">🛡️ Chi tiêu Cần thiết</div>
                  <div className="text-xl font-black text-white mt-1">
                    {capstoneAllocations.needCoins} xu
                  </div>
                </div>
                <div className="bg-amber-900/60 border border-amber-400 rounded-2xl p-3">
                  <div className="text-xs text-amber-200 font-bold">🐷 Tiết kiệm Tương lai</div>
                  <div className="text-xl font-black text-white mt-1">
                    {capstoneAllocations.saveCoins} xu
                  </div>
                </div>
                <div className="bg-rose-900/60 border border-rose-400 rounded-2xl p-3">
                  <div className="text-xs text-rose-200 font-bold">💝 Chia sẻ Nhân ái</div>
                  <div className="text-xl font-black text-white mt-1">
                    {capstoneAllocations.shareCoins} xu
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-3xl overflow-hidden border-4 border-teal-500/80 shadow-2xl bg-slate-950 text-white">
      {/* Top 3D Classroom Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-4 py-3 border-b border-white/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow">
            🏫 MÔ PHỎNG LỚP HỌC 3D
          </span>
          <div>
            <div className="font-extrabold text-xs sm:text-sm text-white">{roomTheme.roomTitle}</div>
            <div className="text-[11px] text-teal-200">
              🎵 Nhạc tiết học: <b>{musicMeta.label}</b> ({musicMeta.bpm} BPM)
            </div>
          </div>
        </div>

        {/* 3D Camera Angle Switcher + Classroom Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(CAMERA_TRANSFORMS) as CameraPreset[]).map((presetKey) => {
            const active = camera === presetKey;
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => {
                  playSkylineSfx("CLICK", muted);
                  setCamera(presetKey);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  active
                    ? "bg-teal-400 text-slate-950 font-black shadow"
                    : "bg-white/10 hover:bg-white/20 text-sky-100"
                }`}
              >
                {CAMERA_TRANSFORMS[presetKey].label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleRingClassroomBell}
            className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/60 text-amber-200 text-[11px] font-extrabold cursor-pointer"
            title="Rung chuông bắt đầu tiết học Tài chính"
          >
            🔔 Chuông vào tiết
          </button>

          <button
            type="button"
            onClick={handleRaiseHandInClass}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
              handRaised
                ? "bg-emerald-400 text-slate-950 animate-bounce"
                : "bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-300/60 text-emerald-200"
            }`}
          >
            🙋 Em giơ tay phát biểu!
          </button>
        </div>
      </div>

      {/* Main 3D Perspective Viewport */}
      <div
        className={`relative p-4 sm:p-6 bg-gradient-to-b ${roomTheme.wallGradient} overflow-hidden`}
        style={{
          perspective: "1200px"
        }}
      >
        {/* Ambient Classroom Sunlight Rays */}
        <div className="pointer-events-none absolute -top-16 left-10 w-64 h-64 bg-amber-300/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -top-10 right-12 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl" />

        {/* 3D Scene Container with Preserve-3D */}
        <div
          className="transition-transform duration-500 ease-out space-y-5"
          style={{
            transformStyle: "preserve-3d",
            transform: reducedMotion
              ? "none"
              : `rotateX(${camTransform.rotateX}deg) rotateY(${camTransform.rotateY}deg) scale(${camTransform.scale})`
          }}
        >
          {/* BACK WALL: 3D Interactive Classroom Smartboard + Teacher Mascot Podium */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 3D Smartboard (Bảng tương tác thông minh lớp học) */}
            <div
              className={`lg:col-span-8 rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 border-4 ${roomTheme.boardBorder} p-4 shadow-[0_14px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                    📋 BẢNG TƯƠNG TÁC LỚP HỌC • TIẾT {stage.periodIndex}: {stage.lessonCode}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-emerald-200 font-bold">
                    📍 Bối cảnh 3D: {stage.interactive.worldLocationName}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white mt-2">
                  Bài học: {stage.lessonName}
                </h4>
                <p className="text-xs text-sky-100 mt-1 leading-relaxed">
                  {classroomAnnouncement || stage.interactive.storyBrief}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-teal-200">
                <span>👩‍🏫 {roomTheme.teacherRole}</span>
                <span className="text-amber-300 font-bold">✨ {roomTheme.classmatesNote}</span>
              </div>
            </div>

            {/* 3D Teacher Mascot Podium & Virtual Classmates */}
            <div className="lg:col-span-4 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 p-4 flex flex-col items-center justify-between text-center shadow-xl">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-xl bg-white mx-auto">
                  <img
                    src="/images/skyline-bird-mascot.jpg"
                    alt="Trợ giảng 3D Chim Sky-Line"
                    className={`w-full h-full object-cover ${
                      !reducedMotion && handRaised ? "animate-bounce" : ""
                    }`}
                  />
                </div>
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow">
                  Khối {grade}
                </span>
              </div>

              <div className="mt-2">
                <div className="font-black text-xs text-amber-200">
                  Bục Giảng 3D Chim Sky-Line
                </div>
                <p className="text-[11px] text-sky-100 mt-0.5 line-clamp-2">
                  “{stage.interactive.mascotGuideTip}”
                </p>
              </div>

              {/* Virtual Classmates Row */}
              <div className="w-full mt-2 pt-2 border-t border-white/15 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                  👧 Bạn Minh: “Hay quá!”
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">
                  👦 Bạn An: “Cùng tính nhé!”
                </span>
                {handRaised && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                    🙋 {studentName} đang phát biểu!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CENTER FOREGROUND: 3D Classroom Desk & Live Scenario Diorama */}
          <div
            className={`rounded-3xl bg-gradient-to-b ${roomTheme.floorColor} border-2 border-amber-300/40 p-4 sm:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.65)]`}
          >
            {render3DTableDiorama()}
          </div>
        </div>
      </div>
    </div>
  );
}
