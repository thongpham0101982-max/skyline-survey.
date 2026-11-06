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
    roomTitle: "Lớp Học Trải Nghiệm Đồng Xu Nhí • Khối 1 (TC01S)",
    wallGradient: "from-sky-50 via-teal-50 to-emerald-50",
    floorColor: "from-white via-amber-50/50 to-teal-50/60",
    boardBorder: "border-amber-400",
    teacherRole: "Chim Sky-Line & Cô Giáo Tài Chính Lớp 1",
    classmatesNote: "Các bạn nhỏ lớp 1 đang cùng quan sát đồng xu và chiếc heo đất trên bàn!"
  },
  2: {
    roomTitle: "Lớp Thực Hành Tài Chính Thông Thái • Khối 2 (TC02S)",
    wallGradient: "from-teal-50 via-sky-50 to-emerald-50",
    floorColor: "from-white via-sky-50/50 to-teal-50/60",
    boardBorder: "border-teal-400",
    teacherRole: "Chim Sky-Line & Thầy Cô Cố Vấn Tài Chính 2S",
    classmatesNote: "Lớp học Khối 2 đang thảo luận sôi nổi về Cần – Muốn và Cửa hàng thông thái!"
  },
  3: {
    roomTitle: "Lớp Thực Hành Quyết Định & Hệ Quả • Khối 3 (TC03S)",
    wallGradient: "from-sky-50 via-indigo-50/60 to-teal-50",
    floorColor: "from-white via-sky-50/50 to-emerald-600/40",
    boardBorder: "border-sky-400",
    teacherRole: "Chim Sky-Line & Chuyên Gia Phân Tích Nhí 3S",
    classmatesNote: "Tổ thực hành Khối 3 đang phân tích hóa đơn và kiểm tra chất lượng hàng hóa!"
  },
  4: {
    roomTitle: "Không Gian Kiến Trúc Ngân Sách & Hợp Tác • Khối 4 (TC04S)",
    wallGradient: "from-emerald-50 via-teal-50 to-sky-50",
    floorColor: "from-white via-emerald-50/50 to-teal-50/50",
    boardBorder: "border-emerald-400",
    teacherRole: "Chim Sky-Line & Cố Vấn Quản Lý Tài Nguyên 4S",
    classmatesNote: "Nhóm dự án Khối 4 đang điều phối ngân sách sự kiện trên bàn thực hành!"
  },
  5: {
    roomTitle: "Trung Tâm Thực Hành Dự Án Tài Chính Nhí • Khối 5 (TC05S)",
    wallGradient: "from-amber-50/70 via-sky-50 to-teal-50",
    floorColor: "from-white via-amber-50/40 to-teal-50/50",
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
  const [handRaised, setHandRaised] = useState(false);
  const [classroomAnnouncement, setClassroomAnnouncement] = useState<string | null>(null);

  const roomTheme = GRADE_CLASSROOM_THEMES[grade] || GRADE_CLASSROOM_THEMES[2];
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
    const tip = `Hoan hô ${studentName} đã giơ tay phát biểu! Gợi ý cho tiết học này: ${stage.interactive.mascotGuideTip}`;
    setClassroomAnnouncement(tip);
    speakVietnameseText(tip, muted);
    setTimeout(() => setHandRaised(false), 3500);
  };

  // Render Interactive Scenario Objects inside the Classroom Table according to the active mechanic
  const render3DTableDiorama = () => {
    const mechanic = stage.interactive.mechanic;

    // A. BACKPACK_BUILDER
    if (mechanic === "BACKPACK_BUILDER" && stage.interactive.backpackConfig) {
      const cfg = stage.interactive.backpackConfig;
      const ctx = cfg.contexts[activeContextIdx] || cfg.contexts[0];
      const currentMap = backpackPlacements[ctx.id] || {};
      const groupACount = Object.values(currentMap).filter((v) => v === "GROUP_A").length;
      const groupBCount = Object.values(currentMap).filter((v) => v === "GROUP_B").length;
      const totalAssigned = groupACount + groupBCount;
      const tiltDeg = Math.max(-10, Math.min(10, (groupBCount - groupACount) * 3));

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-teal-900">
                🎒 Bàn thực hành: {ctx.title} ({ctx.badge})
              </span>
              {cfg.contexts.length > 1 && (
                <div className="flex items-center gap-1">
                  {cfg.contexts.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectContextIdx?.(idx)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                        idx === activeContextIdx
                          ? "bg-teal-600 text-white font-black"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Bối cảnh {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold">
              Chạm thẻ để đổi nhóm • Đã xếp: {totalAssigned}/{ctx.items.length}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left: Item Cards on the Classroom Table */}
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
                    className={`group relative rounded-2xl p-3 text-left transition-all duration-200 border-2 cursor-pointer ${
                      group === "GROUP_A"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm"
                        : group === "GROUP_B"
                        ? "bg-amber-50 border-amber-500 text-amber-950 shadow-sm"
                        : "bg-white border-slate-200 text-slate-800 hover:border-teal-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-2xl">{item.emoji}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full truncate max-w-[95px] ${
                          group === "GROUP_A"
                            ? "bg-emerald-600 text-white"
                            : group === "GROUP_B"
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {group === "GROUP_A"
                          ? ctx.targetGroupAName
                          : group === "GROUP_B"
                          ? ctx.targetGroupBName
                          : "Chạm phân loại"}
                      </span>
                    </div>
                    <div className="font-extrabold text-xs mt-1.5 line-clamp-1">{item.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Right: Balance Scale */}
            <div className="lg:col-span-5 bg-teal-50/80 border-2 border-teal-200 rounded-2xl p-4 text-center">
              <div className="text-xs font-extrabold text-teal-900 mb-3">
                ⚖️ Bàn Cân Quyết Định Trong Lớp Học
              </div>
              <div
                className="mx-auto max-w-xs transition-transform duration-300"
                style={{
                  transform: reducedMotion ? undefined : `rotateZ(${tiltDeg}deg)`
                }}
              >
                <div className="flex items-end justify-between px-3">
                  <div className="bg-white border-2 border-emerald-400 rounded-2xl px-3 py-2 text-center shadow-xs">
                    <div className="text-xl">🛡️</div>
                    <div className="text-[10px] font-black text-emerald-800 truncate max-w-[95px]">
                      {ctx.targetGroupAName}
                    </div>
                    <div className="text-base font-black text-emerald-700">{groupACount} món</div>
                  </div>

                  <div className="text-3xl pb-1">🎒</div>

                  <div className="bg-white border-2 border-amber-400 rounded-2xl px-3 py-2 text-center shadow-xs">
                    <div className="text-xl">🎈</div>
                    <div className="text-[10px] font-black text-amber-800 truncate max-w-[95px]">
                      {ctx.targetGroupBName}
                    </div>
                    <div className="text-base font-black text-amber-700">{groupBCount} món</div>
                  </div>
                </div>
                <div className="h-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 rounded-full mt-1" />
              </div>
              <div className="w-6 h-3 mx-auto bg-teal-500/60 mt-0.5 rounded-b" />
              <p className="text-[11px] text-slate-600 mt-2">
                Chạm vào từng vật phẩm bên trái để đặt lên bàn cân quyết định!
              </p>
            </div>
          </div>
        </div>
      );
    }

    // B. BIRD_SHOP
    if (mechanic === "BIRD_SHOP" && stage.interactive.shopConfig) {
      const cfg = stage.interactive.shopConfig;
      const totalSpent = cfg.items
        .filter((it) => selectedShopItemIds.includes(it.id))
        .reduce((sum, it) => sum + it.price, 0);
      const remaining = cfg.walletBudget - totalSpent;

      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-teal-50 border-2 border-teal-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-black text-teal-900 flex items-center gap-1.5">
              <span>🏪</span>
              <span>GÓC THỰC HÀNH: {cfg.shopName.toUpperCase()} (Chạm kệ hàng để chọn/bỏ món)</span>
            </span>
            <div className="flex items-center gap-3 font-extrabold">
              <span className="text-slate-700">Ví: {cfg.walletBudget} xu</span>
              <span className="text-amber-700">Chi: {totalSpent} xu</span>
              <span className={remaining >= 0 ? "text-emerald-700" : "text-rose-600"}>
                Còn: {remaining} xu
              </span>
            </div>
          </div>

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
                    className={`rounded-2xl p-3 text-left transition-all duration-200 border-2 cursor-pointer ${
                      picked
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm"
                        : "bg-white border-slate-200 text-slate-800 hover:border-teal-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px]">
                        {item.price} xu
                      </span>
                    </div>
                    <div className="font-extrabold text-xs mt-1.5 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">
                      {picked ? "🛒 Đã đặt vào giỏ" : `🏷️ ${item.qualityLabel}`}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-4 bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="text-xs font-black text-amber-900">📠 QUẦY THU NGÂN NHÍ</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                  {selectedShopItemIds.length} món
                </span>
              </div>
              <div className="min-h-[60px] flex flex-wrap gap-1.5 items-center justify-center bg-white rounded-xl p-2 border border-amber-200">
                {selectedShopItemIds.length === 0 ? (
                  <span className="text-[11px] text-slate-500">
                    Giỏ hàng đang trống — Hãy chạm chọn món trên kệ!
                  </span>
                ) : (
                  cfg.items
                    .filter((it) => selectedShopItemIds.includes(it.id))
                    .map((it) => (
                      <span
                        key={it.id}
                        className="px-2 py-1 rounded-lg bg-teal-50 border border-teal-300 text-teal-900 text-xs font-bold flex items-center gap-1"
                      >
                        <span>{it.icon}</span>
                        <span>{it.price}</span>
                      </span>
                    ))
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <div className="text-[10px] text-slate-500">Tổng thanh toán</div>
                  <div className="font-black text-amber-700 text-sm">{totalSpent} xu</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <div className="text-[10px] text-slate-500">Ngân sách còn</div>
                  <div
                    className={`font-black text-sm ${
                      remaining >= 0 ? "text-emerald-700" : "text-rose-600"
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

    // C. DREAM_NEST
    if (mechanic === "DREAM_NEST" && stage.interactive.nestConfig) {
      const cfg = stage.interactive.nestConfig;
      const goal = cfg.goals?.find((g) => g.id === selectedGoalId) || cfg.goals?.[0];
      const totalAllocated = Object.values(jarAllocations).reduce((s, v) => s + v, 0);

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <span className="font-extrabold text-teal-900">
              🪺 Góc thực hành: Cây Đại Thụ Ba Chiếc Hũ & Tổ Ấm Ước Mơ
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 font-bold text-emerald-900">
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
                  className="bg-white border-2 border-teal-200 rounded-2xl p-3 text-center shadow-xs"
                >
                  <div className="text-xs font-black text-teal-900 truncate">
                    {jar.emoji} {jar.name}
                  </div>
                  <div className="relative h-24 w-16 mx-auto my-2 rounded-2xl border-2 border-amber-300 bg-amber-50/50 overflow-hidden flex items-end justify-center p-1">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-amber-500 via-yellow-400 to-amber-300 transition-all duration-300"
                      style={{ height: `${Math.max(12, fillPct)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-900">
                      {coins} xu
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600">Tỷ lệ: {fillPct}%</div>
                </div>
              );
            })}

            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 text-center">
              <div className="text-4xl">{goal?.emoji || "🪺"}</div>
              <div className="font-black text-xs text-amber-900 mt-1">
                {goal ? goal.name : "Tổ Ấm Ước Mơ"}
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5 font-semibold">
                {totalAllocated === cfg.totalCoins
                  ? "✨ Đã cân đối đủ 100% quỹ xu!"
                  : `Còn ${cfg.totalCoins - totalAllocated} xu cần xếp`}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // D. VILLAGE_RESCUE
    if (mechanic === "VILLAGE_RESCUE" && stage.interactive.villageConfig) {
      const hotspots = stage.interactive.villageConfig.hotspots;
      const resolvedCount = hotspots.filter(
        (h) => hotspotActions[h.id] === h.correctActionId
      ).length;

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <span className="font-extrabold text-teal-900">
              🏡 Góc thực hành: Ngôi Làng Sinh Thái & Tiết Kiệm Tài Nguyên
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold">
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
                  className={`rounded-2xl p-3.5 border-2 transition-all duration-200 ${
                    isGreen
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                      : selectedActId
                      ? "bg-amber-50 border-amber-400 text-amber-950"
                      : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{spot.icon}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
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
                            ? "bg-teal-600 text-white font-black"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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

    // E. COIN_DIARY_AD_STREET
    if (mechanic === "COIN_DIARY_AD_STREET" && stage.interactive.diaryAdConfig) {
      const cfg = stage.interactive.diaryAdConfig;
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <span className="font-extrabold text-teal-900">
              🔎 Góc thực hành: Sổ Nhật Ký Đồng Xu & Phố Mua Sắm
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold">
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
                    className={`rounded-2xl p-3 text-left border-2 transition cursor-pointer ${
                      isMarkedNecessary === true
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                        : isMarkedNecessary === false
                        ? "bg-amber-50 border-amber-500 text-amber-950"
                        : "bg-white border-slate-200 text-slate-800 hover:border-teal-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{entry.emoji}</span>
                      <span className="text-xs font-black text-amber-700">-{entry.cost} xu</span>
                    </div>
                    <div className="font-bold text-xs mt-1 line-clamp-1">{entry.itemName}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      {isMarkedNecessary === true
                        ? "✅ Khoản Cần thiết"
                        : isMarkedNecessary === false
                        ? "🎈 Khoản Mong muốn"
                        : "Chạm để phân loại"}
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
                    className="bg-white border-2 border-amber-300 rounded-2xl p-3.5 flex flex-col justify-between gap-2 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{ad.emoji}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black">
                          📺 {ad.hookLabel}
                        </span>
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 mt-1.5">
                        {ad.productName} ({ad.price} xu)
                      </div>
                      <div className="text-[11px] text-amber-800 italic mt-0.5">
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
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
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
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3">
                  <div className="text-xs text-emerald-800 font-bold">🛡️ Chi tiêu Cần thiết</div>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {capstoneAllocations.needCoins} xu
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3">
                  <div className="text-xs text-amber-800 font-bold">🐷 Tiết kiệm Tương lai</div>
                  <div className="text-xl font-black text-amber-950 mt-1">
                    {capstoneAllocations.saveCoins} xu
                  </div>
                </div>
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3">
                  <div className="text-xs text-rose-800 font-bold">💝 Chia sẻ Nhân ái</div>
                  <div className="text-xl font-black text-rose-950 mt-1">
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
    <div className="rounded-3xl overflow-hidden border-2 border-teal-300 shadow-md bg-white text-slate-900">
      {/* Top Classroom Control Bar */}
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-emerald-700 px-4 py-3 text-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-xl bg-amber-300 text-slate-950 font-black text-xs shadow-xs">
            🏫 LỚP HỌC TÀI CHÍNH
          </span>
          <div>
            <div className="font-extrabold text-xs sm:text-sm text-white">{roomTheme.roomTitle}</div>
            <div className="text-[11px] text-sky-100">
              🎵 Nhạc tiết học: <b>{musicMeta.label}</b> ({musicMeta.bpm} BPM)
            </div>
          </div>
        </div>

        {/* Classroom Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleRingClassroomBell}
            className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-extrabold cursor-pointer"
            title="Rung chuông bắt đầu tiết học Tài chính"
          >
            🔔 Chuông vào tiết
          </button>

          <button
            type="button"
            onClick={handleRaiseHandInClass}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              handRaised
                ? "bg-amber-300 text-slate-950"
                : "bg-emerald-500 hover:bg-emerald-400 border border-emerald-300 text-white"
            }`}
          >
            🙋 Em giơ tay phát biểu!
          </button>
        </div>
      </div>

      {/* Main Bright & Clean Classroom View */}
      <div className={`p-4 sm:p-5 bg-gradient-to-b ${roomTheme.wallGradient} space-y-4`}>
        {/* Classroom Smartboard + Teacher Mascot Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div
            className={`lg:col-span-8 rounded-2xl bg-white border-2 ${roomTheme.boardBorder} p-4 shadow-xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-800">
                  📋 BẢNG TƯƠNG TÁC LỚP HỌC • TIẾT {stage.periodIndex}: {stage.lessonCode}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                  📍 {stage.interactive.worldLocationName}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                Bài học: {stage.lessonName}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {classroomAnnouncement || stage.interactive.storyBrief}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>👩‍🏫 {roomTheme.teacherRole}</span>
              <span className="text-teal-800 font-bold">✨ {roomTheme.classmatesNote}</span>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-2xl bg-white border-2 border-sky-200 p-4 flex flex-col items-center justify-between text-center shadow-xs">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-sky-400 shadow-sm bg-white mx-auto">
                <img
                  src="/images/skyline-bird-mascot.jpg"
                  alt="Trợ giảng Chim Sky-Line"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-xs">
                Khối {grade}
              </span>
            </div>

            <div className="mt-2">
              <div className="font-black text-xs text-teal-900">
                Góc Hướng Dẫn Chim Sky-Line
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                “{stage.interactive.mascotGuideTip}”
              </p>
            </div>

            <div className="w-full mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200 text-[10px] font-bold">
                👧 Bạn Minh: “Hay quá!”
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
                👦 Bạn An: “Cùng tính nhé!”
              </span>
              {handRaised && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  🙋 {studentName} đang phát biểu!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Classroom Desk & Quick Scenario Summary */}
        <div
          className={`rounded-2xl bg-gradient-to-b ${roomTheme.floorColor} border-2 border-teal-200 p-4 shadow-xs`}
        >
          {render3DTableDiorama()}
        </div>
      </div>
    </div>
  );
}
