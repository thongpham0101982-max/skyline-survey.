"use client";

import React, { useEffect, useMemo, useState } from "react";
import { StudentStageView } from "@/lib/skyline-journey/service";
import { StageValidationResult } from "@/lib/skyline-journey/validator";
import {
  SkylineBirdCharacter,
  SkylineMusicController,
  playSkylineSfx,
  speakVietnameseText,
  startSkylineBgm,
  getSkylineBgmState
} from "./SkylineBirdCharacter";

export interface StageGamePlayerProps {
  stage: StudentStageView;
  studentName: string;
  grade: string;
  muted: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  onStageUpdated: (updatedOverview: any) => void;
}

type LoopStep =
  | "MISSION_BRIEF"       // 1. Nhận nhiệm vụ & Khám phá bối cảnh
  | "INTERACTIVE_PLAY"    // 2. Khám phá bối cảnh & Thao tác tương tác thế giới
  | "CONSEQUENCE_FEEDBACK"// 3. Quan sát hệ quả -> Nhận phản hồi -> Hoàn thành chặng
  ;

export function StageGamePlayer({
  stage,
  studentName,
  grade,
  muted,
  reducedMotion,
  onClose,
  onStageUpdated
}: StageGamePlayerProps) {
  const [loopStep, setLoopStep] = useState<LoopStep>("MISSION_BRIEF");
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [validationResult, setValidationResult] = useState<StageValidationResult | null>(null);
  const [newRewards, setNewRewards] = useState<Array<any>>([]);
  const [practicalNote, setPracticalNote] = useState<string>(stage.studentReflection || "");

  // --- Mechanic A State: BACKPACK_BUILDER ---
  const [activeContextIdx, setActiveContextIdx] = useState(0);
  const [backpackPlacements, setBackpackPlacements] = useState<
    Record<string, Record<string, "GROUP_A" | "GROUP_B">>
  >(() => stage.savedActionPayload?.placements || {});
  const [selectedReasonOptionId, setSelectedReasonOptionId] = useState<string>(
    () => stage.savedActionPayload?.selectedReasonOptionId || ""
  );
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // --- Mechanic B State: BIRD_SHOP ---
  const [selectedShopItemIds, setSelectedShopItemIds] = useState<string[]>(
    () => stage.savedActionPayload?.selectedItemIds || []
  );
  const [calcTotalInput, setCalcTotalInput] = useState<string>(() =>
    stage.savedActionPayload?.calculatedTotalCost !== undefined
      ? String(stage.savedActionPayload.calculatedTotalCost)
      : ""
  );
  const [calcRemainInput, setCalcRemainInput] = useState<string>(() =>
    stage.savedActionPayload?.calculatedRemainingCoins !== undefined
      ? String(stage.savedActionPayload.calculatedRemainingCoins)
      : ""
  );
  const [selectedPoliteResponseId, setSelectedPoliteResponseId] = useState<string>(
    () => stage.savedActionPayload?.selectedPoliteResponseId || ""
  );

  // --- Mechanic C State: DREAM_NEST ---
  const [jarAllocations, setJarAllocations] = useState<Record<string, number>>(() => {
    if (stage.savedActionPayload?.jarAllocations) {
      return stage.savedActionPayload.jarAllocations;
    }
    const init: Record<string, number> = {};
    for (const jar of stage.interactive.nestConfig?.jars || []) {
      init[jar.id] = jar.minCoins;
    }
    return init;
  });
  const [selectedGoalId, setSelectedGoalId] = useState<string>(
    () => stage.savedActionPayload?.selectedGoalId || stage.interactive.nestConfig?.goals?.[0]?.id || ""
  );
  const [selectedTwistOptionId, setSelectedTwistOptionId] = useState<string>(
    () => stage.savedActionPayload?.selectedTwistOptionId || ""
  );

  // --- Mechanic D State: VILLAGE_RESCUE ---
  const [hotspotActions, setHotspotActions] = useState<Record<string, string>>(
    () => stage.savedActionPayload?.hotspotActions || {}
  );
  const [activeHotspotId, setActiveHotspotId] = useState<string>(
    () => stage.interactive.villageConfig?.hotspots?.[0]?.id || ""
  );
  const [selectedReflectionOptionId, setSelectedReflectionOptionId] = useState<string>(
    () => stage.savedActionPayload?.selectedReflectionOptionId || ""
  );

  // --- Mechanic E State: COIN_DIARY_AD_STREET ---
  const [diarySpentInput, setDiarySpentInput] = useState<string>(() =>
    stage.savedActionPayload?.calculatedTotalSpent !== undefined
      ? String(stage.savedActionPayload.calculatedTotalSpent)
      : ""
  );
  const [diaryRemainInput, setDiaryRemainInput] = useState<string>(() =>
    stage.savedActionPayload?.calculatedRemainingCoins !== undefined
      ? String(stage.savedActionPayload.calculatedRemainingCoins)
      : ""
  );
  const [entryClassifications, setEntryClassifications] = useState<Record<string, boolean>>(
    () => stage.savedActionPayload?.entryClassifications || {}
  );
  const [adDecisions, setAdDecisions] = useState<
    Record<string, { identifiedHookType?: string; shouldBuy: boolean }>
  >(() => stage.savedActionPayload?.adDecisions || {});
  const [capstoneAllocations, setCapstoneAllocations] = useState<{
    needCoins: number;
    saveCoins: number;
    shareCoins: number;
  }>(
    () =>
      stage.savedActionPayload?.capstoneAllocations || {
        needCoins: 15,
        saveCoins: 10,
        shareCoins: 5
      }
  );
  const [selectedSurpriseOptionId, setSelectedSurpriseOptionId] = useState<string>(
    () => stage.savedActionPayload?.selectedSurpriseOptionId || ""
  );

  // Detect online/offline state for resilience
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Build current payload snapshot
  const currentActionPayload = useMemo(() => {
    const m = stage.interactive.mechanic;
    if (m === "BACKPACK_BUILDER") {
      return {
        placements: backpackPlacements,
        selectedReasonOptionId,
        practicalNote
      };
    }
    if (m === "BIRD_SHOP") {
      const cfg = stage.interactive.shopConfig!;
      const selectedObjs = cfg.items.filter((i) => selectedShopItemIds.includes(i.id));
      const liveSum = selectedObjs.reduce((s, it) => s + it.price, 0);
      const liveRem = cfg.walletBudget - liveSum;
      return {
        selectedItemIds: selectedShopItemIds,
        calculatedTotalCost: calcTotalInput !== "" ? Number(calcTotalInput) : liveSum,
        calculatedRemainingCoins: calcRemainInput !== "" ? Number(calcRemainInput) : liveRem,
        selectedPoliteResponseId,
        practicalNote
      };
    }
    if (m === "DREAM_NEST") {
      return {
        jarAllocations,
        selectedGoalId,
        selectedTwistOptionId,
        practicalNote
      };
    }
    if (m === "VILLAGE_RESCUE") {
      return {
        hotspotActions,
        selectedReflectionOptionId,
        practicalNote
      };
    }
    return {
      calculatedTotalSpent: diarySpentInput !== "" ? Number(diarySpentInput) : undefined,
      calculatedRemainingCoins: diaryRemainInput !== "" ? Number(diaryRemainInput) : undefined,
      entryClassifications,
      adDecisions,
      capstoneAllocations,
      selectedSurpriseOptionId,
      practicalNote
    };
  }, [
    stage.interactive,
    backpackPlacements,
    selectedReasonOptionId,
    selectedShopItemIds,
    calcTotalInput,
    calcRemainInput,
    selectedPoliteResponseId,
    jarAllocations,
    selectedGoalId,
    selectedTwistOptionId,
    hotspotActions,
    selectedReflectionOptionId,
    diarySpentInput,
    diaryRemainInput,
    entryClassifications,
    adDecisions,
    capstoneAllocations,
    selectedSurpriseOptionId,
    practicalNote
  ]);

  // Save draft to localStorage + server
  const handleSaveDraft = async (silent = false) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `skyline_draft_${stage.lessonCode}`,
          JSON.stringify({
            actionPayload: currentActionPayload,
            practicalNote,
            savedAt: new Date().toISOString()
          })
        );
      } catch {
        // Ignore storage quota
      }
    }
    if (!silent) setSavingDraft(true);
    setNetworkError(null);
    try {
      const res = await fetch("/api/skyline-journey/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          lessonCode: stage.lessonCode,
          actionPayload: currentActionPayload,
          studentReflection: practicalNote
        })
      });
      if (!res.ok && !silent) {
        const err = await res.json().catch(() => ({}));
        setNetworkError(err.error || "Đã lưu tạm trên máy. Khi mạng ổn định em có thể gửi lại.");
      }
    } catch {
      if (!silent) {
        setNetworkError("Đã lưu nháp trên thiết bị. Khi có mạng trở lại, em bấm Thử gửi lại nhé!");
      }
    } finally {
      if (!silent) setSavingDraft(false);
    }
  };

  // Submit stage action to server validator
  const handleSubmitAction = async () => {
    setSubmitting(true);
    setNetworkError(null);
    playSkylineSfx("CLICK", muted);

    // Save local backup first so network loss never loses student's work
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `skyline_draft_${stage.lessonCode}`,
          JSON.stringify({
            actionPayload: currentActionPayload,
            practicalNote,
            savedAt: new Date().toISOString()
          })
        );
      } catch {
        // Ignore
      }
    }

    try {
      const res = await fetch("/api/skyline-journey/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_STAGE",
          lessonCode: stage.lessonCode,
          actionPayload: currentActionPayload,
          studentReflection: practicalNote
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNetworkError(
          data.error || "Kết nối mạng đang chập chờn. Dữ liệu của em đã được giữ an toàn, hãy bấm 'Thử gửi lại' nhé!"
        );
        playSkylineSfx("RETRY", muted);
        return;
      }

      const vResult: StageValidationResult = data.validation;
      setValidationResult(vResult);
      setNewRewards(data.newRewardsGranted || []);
      setLoopStep("CONSEQUENCE_FEEDBACK");

      if (vResult.autoChallengePassed) {
        playSkylineSfx("FLAG", muted);
      } else {
        playSkylineSfx("RETRY", muted);
      }

      if (data.overview) {
        onStageUpdated(data.overview);
      }
    } catch {
      setNetworkError(
        "Mạng đang gián đoạn! Lựa chọn của em đã được lưu tạm trên thiết bị. Hãy kiểm tra mạng và bấm 'Thử gửi lại' nhé!"
      );
      playSkylineSfx("RETRY", muted);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Mechanic A: BACKPACK_BUILDER ---
  const renderBackpackMechanic = () => {
    const cfg = stage.interactive.backpackConfig!;
    const currentCtx = cfg.contexts[activeContextIdx] || cfg.contexts[0];
    const ctxPlacements = backpackPlacements[currentCtx.id] || {};

    const assignItem = (itemId: string, group: "GROUP_A" | "GROUP_B") => {
      playSkylineSfx("COIN", muted);
      setBackpackPlacements((prev) => ({
        ...prev,
        [currentCtx.id]: {
          ...(prev[currentCtx.id] || {}),
          [itemId]: group
        }
      }));
    };

    const groupAItems = currentCtx.items.filter((i) => ctxPlacements[i.id] === "GROUP_A");
    const groupBItems = currentCtx.items.filter((i) => ctxPlacements[i.id] === "GROUP_B");
    const totalPlacedInCtx = Object.keys(ctxPlacements).length;

    return (
      <div className="space-y-6">
        {/* Context Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-sky-50 border-2 border-sky-200 rounded-2xl p-3.5">
          <div className="flex flex-wrap gap-2">
            {cfg.contexts.map((ctx, idx) => {
              const placedCount = Object.keys(backpackPlacements[ctx.id] || {}).length;
              const isDone = placedCount === ctx.items.length;
              return (
                <button
                  key={ctx.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setActiveContextIdx(idx);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition flex items-center gap-2 ${
                    activeContextIdx === idx
                      ? "bg-teal-600 text-white shadow-md"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-teal-50"
                  }`}
                >
                  <span>{ctx.badge}</span>
                  <span>{ctx.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isDone
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {placedCount}/{ctx.items.length}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="text-xs font-medium text-teal-800 bg-white px-3 py-1.5 rounded-xl border border-teal-200">
            💡 Có thể <b>chạm/bấm nút</b> hoặc <b>kéo thả</b> hoặc nhấn phím <b>1 / 2</b>
          </div>
        </div>

        {/* Visual World State: Sky-Line's Interactive Backpack & Context Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-5 bg-gradient-to-br from-teal-600 via-sky-600 to-cyan-700 text-white rounded-3xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                {currentCtx.badge}
              </span>
              <h4 className="text-lg font-extrabold">{currentCtx.title}</h4>
              <p className="text-sm text-sky-100 mt-1">{currentCtx.subtitle}</p>
            </div>

            {/* Animated Visual Backpack */}
            <div className="my-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/25">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm flex items-center gap-2">
                  <span className="text-2xl">🎒</span> Trạng thái Ba lô Sky-Line
                </span>
                <span className="text-xs bg-amber-400 text-slate-900 font-bold px-2.5 py-0.5 rounded-full">
                  Đã xếp {totalPlacedInCtx}/{currentCtx.items.length} món
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const itemId = e.dataTransfer.getData("text/plain");
                    if (itemId) assignItem(itemId, "GROUP_A");
                  }}
                  className="bg-emerald-900/40 border-2 border-dashed border-emerald-300/70 rounded-xl p-2.5 min-h-[92px]"
                >
                  <div className="text-xs font-bold text-emerald-200 mb-1.5">
                    ✅ {currentCtx.targetGroupAName} ({groupAItems.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupAItems.map((it) => (
                      <span
                        key={it.id}
                        className="inline-flex items-center gap-1 text-xs bg-white text-slate-800 px-2 py-1 rounded-lg font-semibold shadow-sm"
                      >
                        <span>{it.emoji}</span>
                        <span>{it.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const itemId = e.dataTransfer.getData("text/plain");
                    if (itemId) assignItem(itemId, "GROUP_B");
                  }}
                  className="bg-amber-900/40 border-2 border-dashed border-amber-300/70 rounded-xl p-2.5 min-h-[92px]"
                >
                  <div className="text-xs font-bold text-amber-200 mb-1.5">
                    🎈 {currentCtx.targetGroupBName} ({groupBItems.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groupBItems.map((it) => (
                      <span
                        key={it.id}
                        className="inline-flex items-center gap-1 text-xs bg-white text-slate-800 px-2 py-1 rounded-lg font-semibold shadow-sm"
                      >
                        <span>{it.emoji}</span>
                        <span>{it.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-sky-100 flex items-center justify-between">
              <span>🐦 Chim Sky-Line đang chờ em xếp đủ các món đồ!</span>
              {activeContextIdx < cfg.contexts.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveContextIdx((i) => i + 1)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-900 font-bold hover:bg-amber-300 transition"
                >
                  Qua bối cảnh {activeContextIdx + 2} →
                </button>
              )}
            </div>
          </div>

          {/* Items Cards with Click/Touch & Keyboard & Drag Support */}
          <div className="lg:col-span-7 space-y-3">
            {currentCtx.items.map((item) => {
              const chosenGroup = ctxPlacements[item.id];
              return (
                <div
                  key={item.id}
                  draggable
                  tabIndex={0}
                  onFocus={() => setFocusedItemId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "1") assignItem(item.id, "GROUP_A");
                    if (e.key === "2") assignItem(item.id, "GROUP_B");
                  }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", item.id);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    chosenGroup === "GROUP_A"
                      ? "bg-emerald-50/80 border-emerald-400"
                      : chosenGroup === "GROUP_B"
                      ? "bg-amber-50/80 border-amber-400"
                      : focusedItemId === item.id
                      ? "bg-sky-50 border-sky-400"
                      : "bg-white border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {item.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm sm:text-base">
                        {item.name}
                      </div>
                      {chosenGroup && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          📌 {item.contextReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => assignItem(item.id, "GROUP_A")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                        chosenGroup === "GROUP_A"
                          ? "bg-emerald-600 text-white border-emerald-700 shadow"
                          : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      [1] {currentCtx.targetGroupAName}
                    </button>
                    <button
                      type="button"
                      onClick={() => assignItem(item.id, "GROUP_B")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                        chosenGroup === "GROUP_B"
                          ? "bg-amber-500 text-white border-amber-600 shadow"
                          : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                      }`}
                    >
                      [2] {currentCtx.targetGroupBName}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Context Reasoning Question */}
        <div className="bg-amber-50/90 border-2 border-amber-200 rounded-3xl p-5">
          <h4 className="font-extrabold text-amber-900 text-base mb-3 flex items-center gap-2">
            <span>🧠</span>
            <span>Câu hỏi khám phá bối cảnh: {cfg.reasonQuestion.prompt}</span>
          </h4>
          <div className="grid grid-cols-1 gap-2.5">
            {cfg.reasonQuestion.options.map((opt) => {
              const selected = selectedReasonOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setSelectedReasonOptionId(opt.id);
                  }}
                  className={`text-left p-3.5 rounded-2xl border-2 transition flex items-start gap-3 ${
                    selected
                      ? "bg-teal-600 text-white border-teal-700 shadow-md"
                      : "bg-white text-slate-800 border-amber-200 hover:border-teal-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      selected ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {selected ? "✓" : "•"}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Render Mechanic B: BIRD_SHOP ---
  const renderBirdShopMechanic = () => {
    const cfg = stage.interactive.shopConfig!;
    const selectedItems = cfg.items.filter((it) => selectedShopItemIds.includes(it.id));
    const totalCost = selectedItems.reduce((sum, it) => sum + it.price, 0);
    const remainingCoins = cfg.walletBudget - totalCost;
    const isOverBudget = totalCost > cfg.walletBudget;

    const toggleShopItem = (itemId: string) => {
      playSkylineSfx("COIN", muted);
      setSelectedShopItemIds((prev) => {
        const next = prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId];
        const nextItems = cfg.items.filter((it) => next.includes(it.id));
        const nextSum = nextItems.reduce((s, it) => s + it.price, 0);
        setCalcTotalInput(String(nextSum));
        setCalcRemainInput(String(cfg.walletBudget - nextSum));
        return next;
      });
    };

    return (
      <div className="space-y-6">
        {/* Live Shop Header: Wallet, Cart Summary & Multi-Solution Hint */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 text-white rounded-3xl p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-3 py-1 rounded-full">
                🏪 {cfg.shopName}
              </span>
              <h4 className="text-lg font-extrabold mt-2">
                Chọn mua ít nhất {cfg.minRequiredItems} món thiết yếu phù hợp trong phạm vi ngân sách!
              </h4>
              <p className="text-xs text-emerald-100 mt-1">
                ✨ Có thể có nhiều phương án giỏ hàng hợp lệ miễn đáp ứng đúng nhu cầu, chất lượng và không vượt ngân sách.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/25 text-center">
                <div className="text-[11px] text-emerald-100">Ví tiền của chim</div>
                <div className="text-xl font-black text-amber-300">🪙 {cfg.walletBudget} Xu</div>
              </div>
              <div className="bg-white/15 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/25 text-center">
                <div className="text-[11px] text-emerald-100">Tổng giỏ hàng</div>
                <div className={`text-xl font-black ${isOverBudget ? "text-rose-300" : "text-white"}`}>
                  🛒 {totalCost} Xu
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/25 text-center">
                <div className="text-[11px] text-emerald-100">Tiền còn lại</div>
                <div className={`text-xl font-black ${isOverBudget ? "text-rose-300" : "text-emerald-200"}`}>
                  💰 {remainingCoins} Xu
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Stalls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cfg.items.map((item) => {
            const inCart = selectedShopItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleShopItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleShopItem(item.id);
                  }
                }}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                  inCart
                    ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-200"
                    : "bg-white border-slate-200 hover:border-teal-400"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-extrabold text-sm shadow-sm">
                      🪙 {item.price} Xu
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-800 mt-3 text-base">{item.name}</h5>
                  <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                  <div className="mt-2.5 inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    🏷️ {item.qualityLabel}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700">
                    {inCart ? "✅ Đã có trong giỏ hàng" : "➕ Chạm để bỏ vào giỏ"}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      inCart ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {inCart ? "✓" : "+"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 2 of Shop: Checkout Calculation & Polite Change Verification */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-sky-50 border-2 border-sky-200 rounded-3xl p-5 space-y-3">
            <h4 className="font-extrabold text-sky-900 text-base flex items-center gap-2">
              <span>🧮</span> Quầy Thanh Toán Nhí (Kiểm tra phép tính)
            </h4>
            <p className="text-xs text-slate-600">
              Hệ thống đã cập nhật giỏ hàng của em. Em hãy kiểm tra lại tổng tiền chi và số tiền còn lại trong ví ({cfg.walletBudget} Xu):
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tổng tiền mua (Xu):
                </label>
                <input
                  type="number"
                  value={calcTotalInput !== "" ? calcTotalInput : totalCost}
                  onChange={(e) => setCalcTotalInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-sky-300 font-bold text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiền còn lại (Xu):
                </label>
                <input
                  type="number"
                  value={calcRemainInput !== "" ? calcRemainInput : remainingCoins}
                  onChange={(e) => setCalcRemainInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-sky-300 font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 space-y-3">
            <h4 className="font-extrabold text-amber-900 text-base flex items-center gap-2">
              <span>🤝</span> Tình huống kiểm tra tiền trả lại & Ứng xử lịch sự
            </h4>
            <p className="text-sm text-slate-800 font-medium">
              {cfg.changeScenario.prompt}
            </p>
            <div className="space-y-2">
              {cfg.changeScenario.politeResponses.map((resp) => {
                const selected = selectedPoliteResponseId === resp.id;
                return (
                  <button
                    key={resp.id}
                    type="button"
                    onClick={() => {
                      playSkylineSfx("CLICK", muted);
                      setSelectedPoliteResponseId(resp.id);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-start gap-3 ${
                      selected
                        ? "bg-teal-600 text-white border-teal-700 shadow"
                        : "bg-white text-slate-800 border-amber-200 hover:border-teal-400"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        selected ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {selected ? "✓" : "•"}
                    </span>
                    <span className="text-sm font-medium">{resp.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Render Mechanic C: DREAM_NEST ---
  const renderDreamNestMechanic = () => {
    const cfg = stage.interactive.nestConfig!;
    const totalAllocated = cfg.jars.reduce(
      (sum, j) => sum + Number(jarAllocations[j.id] ?? 0),
      0
    );
    const unallocatedCoins = cfg.totalCoins - totalAllocated;

    const adjustJar = (jarId: string, delta: number) => {
      playSkylineSfx("COIN", muted);
      setJarAllocations((prev) => {
        const current = Number(prev[jarId] ?? 0);
        const nextVal = Math.max(0, Math.min(cfg.totalCoins, current + delta));
        return { ...prev, [jarId]: nextVal };
      });
    };

    const nestVisualStage =
      totalAllocated === cfg.totalCoins
        ? "🌟 Tổ Ấm Rực Rỡ Hoa Nở & Đèn Lồng Vàng"
        : totalAllocated > cfg.totalCoins
        ? "⚠️ Tổng xu phân bổ đang vượt quá số xu hiện có"
        : "🪹 Tổ Chim Đang Được Bồi Đắp Từng Nhành Cây";

    return (
      <div className="space-y-6">
        {/* Visual Nest Progress Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
              🪺 Xây Tổ Ước Mơ & Hũ Xu Thông Thái
            </span>
            <h4 className="text-lg font-extrabold mt-2">{nestVisualStage}</h4>
            <p className="text-xs text-amber-100 mt-1">
              Hãy phân bổ đúng <b>{cfg.totalCoins} Xu</b> vào các hũ sao cho mỗi hũ nằm trong khoảng gợi ý hợp lý!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 px-4 py-2.5 rounded-2xl border border-white/25 text-center">
              <div className="text-xs text-amber-100">Tổng xu cần phân bổ</div>
              <div className="text-xl font-black">🪙 {cfg.totalCoins} Xu</div>
            </div>
            <div className="bg-white/15 px-4 py-2.5 rounded-2xl border border-white/25 text-center">
              <div className="text-xs text-amber-100">Đã xếp vào hũ</div>
              <div className="text-xl font-black text-amber-200">{totalAllocated} Xu</div>
            </div>
            <div className="bg-white/15 px-4 py-2.5 rounded-2xl border border-white/25 text-center">
              <div className="text-xs text-amber-100">Còn chưa xếp</div>
              <div className="text-xl font-black">{unallocatedCoins} Xu</div>
            </div>
          </div>
        </div>

        {/* Optional Piggy Bank Goal Selector (e.g. Stage 11) */}
        {cfg.goals && cfg.goals.length > 0 && (
          <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-5">
            <h4 className="font-extrabold text-teal-900 text-base mb-3">
              🎯 Bước 1: Chọn Mục Tiêu Nuôi Heo Đất Phù Hợp Với Học Sinh Lớp 2
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {cfg.goals.map((g) => {
                const selected = selectedGoalId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      playSkylineSfx("CLICK", muted);
                      setSelectedGoalId(g.id);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition ${
                      selected
                        ? "bg-teal-600 text-white border-teal-700 shadow-md"
                        : "bg-white text-slate-800 border-teal-200 hover:border-teal-400"
                    }`}
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="font-bold text-sm">{g.name}</div>
                    <div className={`text-xs mt-1 ${selected ? "text-teal-100" : "text-slate-500"}`}>
                      Cần {g.targetCoins} Xu • Dự kiến {g.weeksSuggested} tuần
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Coin Jars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cfg.jars.map((jar) => {
            const val = Number(jarAllocations[jar.id] ?? 0);
            const inRange = val >= jar.minCoins && val <= jar.maxCoins;
            return (
              <div
                key={jar.id}
                className={`p-5 rounded-3xl border-2 transition flex flex-col justify-between ${
                  inRange
                    ? "bg-emerald-50/70 border-emerald-400 shadow-sm"
                    : "bg-white border-amber-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{jar.emoji}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        inRange
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      Gợi ý: {jar.minCoins}–{jar.maxCoins} Xu
                    </span>
                  </div>
                  <h5 className="font-extrabold text-slate-800 mt-3 text-base">{jar.name}</h5>
                  <p className="text-xs text-slate-600 mt-1">{jar.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-200/80">
                  <div className="text-center text-2xl font-black text-teal-700 mb-3">
                    🪙 {val} Xu
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustJar(jar.id, -5)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustJar(jar.id, -1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustJar(jar.id, 1)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustJar(jar.id, 5)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs"
                    >
                      +5
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unexpected Twist Adjustment */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
          <h4 className="font-extrabold text-amber-900 text-base mb-2 flex items-center gap-2">
            <span>⚡</span> Tình huống điều chỉnh kế hoạch:
          </h4>
          <p className="text-sm text-slate-800 font-medium mb-3">
            {cfg.unexpectedTwist.prompt}
          </p>
          <div className="space-y-2">
            {cfg.unexpectedTwist.options.map((opt) => {
              const selected = selectedTwistOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setSelectedTwistOptionId(opt.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-start gap-3 ${
                    selected
                      ? "bg-teal-600 text-white border-teal-700 shadow"
                      : "bg-white text-slate-800 border-amber-200 hover:border-teal-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      selected ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {selected ? "✓" : "•"}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Render Mechanic D: VILLAGE_RESCUE ---
  const renderVillageRescueMechanic = () => {
    const cfg = stage.interactive.villageConfig!;
    const activeHotspot =
      cfg.hotspots.find((h) => h.id === activeHotspotId) || cfg.hotspots[0];

    const restoredCount = cfg.hotspots.filter(
      (h) => hotspotActions[h.id] === h.correctActionId
    ).length;

    const selectHotspotAction = (hotspotId: string, actionId: string) => {
      playSkylineSfx("COIN", muted);
      setHotspotActions((prev) => ({ ...prev, [hotspotId]: actionId }));
    };

    return (
      <div className="space-y-6">
        {/* Village Restoration Meter */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-sky-700 text-white rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
              🏡 Giải Cứu & Khôi Phục Ngôi Làng Sky-Line
            </span>
            <h4 className="text-lg font-extrabold mt-2">
              Đã khôi phục {restoredCount}/{cfg.hotspots.length} khu vực trong ngôi làng!
            </h4>
            <p className="text-xs text-emerald-100 mt-1">
              Lưu ý phân biệt rõ: <b>Việc em tự thực hiện được</b> và <b>Việc cần nhờ người lớn hỗ trợ an toàn</b>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cfg.hotspots.map((h) => {
              const isRestored = hotspotActions[h.id] === h.correctActionId;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setActiveHotspotId(h.id);
                  }}
                  className={`px-3.5 py-2 rounded-2xl font-bold text-xs transition flex items-center gap-1.5 border ${
                    activeHotspot.id === h.id
                      ? "bg-amber-400 text-slate-900 border-white shadow"
                      : isRestored
                      ? "bg-emerald-500/40 text-white border-emerald-300"
                      : "bg-white/15 text-white border-white/20"
                  }`}
                >
                  <span>{h.icon}</span>
                  <span>{isRestored ? "Đã khôi phục ✓" : "Cần xử lý"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Village Hotspots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-3">
            {cfg.hotspots.map((h) => {
              const chosenId = hotspotActions[h.id];
              const isRestored = chosenId === h.correctActionId;
              const isSelected = activeHotspot.id === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setActiveHotspotId(h.id);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-teal-50 border-teal-600 shadow-md"
                      : isRestored
                      ? "bg-emerald-50/70 border-emerald-400"
                      : "bg-white border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    {h.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-sm">{h.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          h.safetyType === "ASK_ADULT"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {h.safetyType === "ASK_ADULT" ? "👨‍👩‍👧 Nhờ người lớn" : "🙋 Em tự làm được"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {isRestored ? `✨ ${h.restoredState}` : `⚠️ ${h.problemState}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Hotspot Action Panel */}
          <div className="lg:col-span-7 bg-white border-2 border-teal-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-2 text-base font-extrabold text-teal-900">
                  <span className="text-2xl">{activeHotspot.icon}</span>
                  <span>{activeHotspot.title}</span>
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    activeHotspot.safetyType === "ASK_ADULT"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-sky-100 text-sky-800 border border-sky-300"
                  }`}
                >
                  {activeHotspot.safetyType === "ASK_ADULT"
                    ? "⚠️ Việc cần nhờ người lớn hỗ trợ"
                    : "✅ Việc học sinh lớp 2 tự thực hiện được"}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-2xl mb-4 text-sm font-medium border ${
                  hotspotActions[activeHotspot.id] === activeHotspot.correctActionId
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                {hotspotActions[activeHotspot.id] === activeHotspot.correctActionId
                  ? `🌱 Hệ quả thế giới: ${activeHotspot.restoredState}`
                  : `🔍 Hiện trạng: ${activeHotspot.problemState}`}
              </div>

              <div className="space-y-2.5">
                {activeHotspot.actions.map((act) => {
                  const isChosen = hotspotActions[activeHotspot.id] === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => selectHotspotAction(activeHotspot.id, act.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 transition ${
                        isChosen
                          ? "bg-teal-600 text-white border-teal-700 shadow"
                          : "bg-slate-50 text-slate-800 border-slate-200 hover:border-teal-400"
                      }`}
                    >
                      <div className="font-bold text-sm">{act.label}</div>
                      {isChosen && (
                        <div className="text-xs mt-1 text-teal-100">💬 {act.feedback}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Reflection Question */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
          <h4 className="font-extrabold text-amber-900 text-base mb-3">
            💡 Câu hỏi đúc kết ngôi làng: {cfg.reflectionQuestion.prompt}
          </h4>
          <div className="space-y-2">
            {cfg.reflectionQuestion.options.map((opt) => {
              const selected = selectedReflectionOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setSelectedReflectionOptionId(opt.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-start gap-3 ${
                    selected
                      ? "bg-teal-600 text-white border-teal-700 shadow"
                      : "bg-white text-slate-800 border-amber-200 hover:border-teal-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      selected ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {selected ? "✓" : "•"}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Render Mechanic E: COIN_DIARY_AD_STREET ---
  const renderDiaryAdMechanic = () => {
    const cfg = stage.interactive.diaryAdConfig!;

    if (cfg.mode === "COIN_DIARY") {
      const entries = cfg.diaryEntries || [];
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-700 via-sky-700 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
                📓 Sổ Nhật Ký Đồng Xu Của Chim Sky-Line
              </span>
              <h4 className="text-lg font-extrabold mt-2">
                Số tiền ban đầu trong ví: 🪙 {cfg.startingCoins} Xu
              </h4>
              <p className="text-xs text-sky-100 mt-1">
                Hãy đánh dấu từng khoản chi là Hợp lý (Cần thiết) hay Chưa hợp lý, sau đó tính Tổng tiền đã dùng và Số tiền còn lại!
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => {
              const chosenVal = entryClassifications[entry.id];
              return (
                <div
                  key={entry.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
                      {entry.emoji}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{entry.itemName}</div>
                      <div className="text-xs font-extrabold text-amber-700">
                        Đã chi: 🪙 {entry.cost} Xu
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSkylineSfx("CLICK", muted);
                        setEntryClassifications((p) => ({ ...p, [entry.id]: true }));
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                        chosenVal === true
                          ? "bg-emerald-600 text-white border-emerald-700"
                          : "bg-white text-emerald-700 border-emerald-300"
                      }`}
                    >
                      ✅ Chi tiêu hợp lý / cần thiết
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playSkylineSfx("CLICK", muted);
                        setEntryClassifications((p) => ({ ...p, [entry.id]: false }));
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                        chosenVal === false
                          ? "bg-rose-600 text-white border-rose-700"
                          : "bg-white text-rose-700 border-rose-300"
                      }`}
                    >
                      ⚠️ Khoản chi ngẫu hứng / chưa cần
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tổng số tiền đã dùng (Xu):
              </label>
              <input
                type="number"
                placeholder="Nhập tổng số xu đã chi..."
                value={diarySpentInput}
                onChange={(e) => setDiarySpentInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-sky-300 font-bold text-slate-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số tiền còn lại trong ví (từ {cfg.startingCoins} Xu):
              </label>
              <input
                type="number"
                placeholder="Nhập số xu còn lại..."
                value={diaryRemainInput}
                onChange={(e) => setDiaryRemainInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-sky-300 font-bold text-slate-900 bg-white"
              />
            </div>
          </div>
        </div>
      );
    }

    if (cfg.mode === "AD_DETECTIVE") {
      const boards = cfg.adBillboards || [];
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-amber-500 text-white rounded-3xl p-5 shadow-lg">
            <span className="text-xs uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
              🔍 Phố Quảng Cáo Rực Rỡ • Ví hiện có: {cfg.startingCoins} Xu
            </span>
            <h4 className="text-lg font-extrabold mt-2">
              Soi Kính Lúp Thông Thái: Nhận diện chi tiết thu hút và đối chiếu với nhu cầu & túi tiền!
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boards.map((b) => {
              const dec = adDecisions[b.id];
              return (
                <div
                  key={b.id}
                  className="bg-white border-2 border-purple-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{b.emoji}</span>
                      <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-extrabold text-sm">
                        🪙 {b.price} Xu
                      </span>
                    </div>
                    <h5 className="font-extrabold text-slate-800 mt-3 text-base">
                      {b.productName}
                    </h5>
                    <div className="mt-2 p-2.5 rounded-xl bg-fuchsia-50 border border-fuchsia-200 text-xs font-bold text-fuchsia-900">
                      📢 &ldquo;{b.adSlogan}&rdquo;
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      🔍 <b>{b.hookLabel}</b>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-bold text-slate-700">
                      Quyết định của em (Ví có {cfg.startingCoins} Xu, đang cần mua Hộp bút màu):
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playSkylineSfx("COIN", muted);
                          setAdDecisions((prev) => ({
                            ...prev,
                            [b.id]: { identifiedHookType: b.hookType, shouldBuy: true }
                          }));
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          dec?.shouldBuy === true
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-white text-emerald-700 border-emerald-300"
                        }`}
                      >
                        🛒 Chọn mua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSkylineSfx("CLICK", muted);
                          setAdDecisions((prev) => ({
                            ...prev,
                            [b.id]: { identifiedHookType: b.hookType, shouldBuy: false }
                          }));
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          dec?.shouldBuy === false
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-white text-rose-700 border-rose-300"
                        }`}
                      >
                        ✋ Không mua
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Mode 3: MASTER_FINANCE_CAPSTONE (Stage 15)
    const cap = cfg.capstoneChallenge!;
    const sumAlloc =
      Number(capstoneAllocations.needCoins || 0) +
      Number(capstoneAllocations.saveCoins || 0) +
      Number(capstoneAllocations.shareCoins || 0);

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-amber-500 via-teal-600 to-sky-700 text-white rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
              🏆 Chặng Đích Vinh Quang • Tổng ngân sách: {cap.totalBudget} Xu
            </span>
            <h4 className="text-lg font-extrabold mt-2">
              Lập kế hoạch 30 Xu cho đủ 3 mục tiêu: Cần thiết – Tiết kiệm – Chia sẻ
            </h4>
          </div>
          <div className="bg-white/15 px-4 py-2 rounded-2xl border border-white/25 text-center">
            <div className="text-xs">Tổng đã phân bổ</div>
            <div className="text-xl font-black">
              🪙 {sumAlloc} / {cap.totalBudget} Xu
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-2 border-sky-300 rounded-3xl p-4">
            <div className="text-2xl">📚</div>
            <div className="font-bold text-slate-800 mt-1">1. Mua đồ dùng cần thiết</div>
            <p className="text-xs text-slate-500">Mua bộ vở ô li & bút chì học tập</p>
            <input
              type="number"
              value={capstoneAllocations.needCoins}
              onChange={(e) =>
                setCapstoneAllocations((p) => ({ ...p, needCoins: Number(e.target.value) }))
              }
              className="mt-3 w-full px-3 py-2 rounded-xl border-2 border-sky-300 font-extrabold text-slate-900"
            />
          </div>
          <div className="bg-white border-2 border-emerald-300 rounded-3xl p-4">
            <div className="text-2xl">🐷</div>
            <div className="font-bold text-slate-800 mt-1">
              2. Bỏ ống heo tiết kiệm (Tối thiểu {cap.minSaveCoins} Xu)
            </div>
            <p className="text-xs text-slate-500">Dành dụm cho mục tiêu tương lai</p>
            <input
              type="number"
              value={capstoneAllocations.saveCoins}
              onChange={(e) =>
                setCapstoneAllocations((p) => ({ ...p, saveCoins: Number(e.target.value) }))
              }
              className="mt-3 w-full px-3 py-2 rounded-xl border-2 border-emerald-300 font-extrabold text-slate-900"
            />
          </div>
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-4">
            <div className="text-2xl">💝</div>
            <div className="font-bold text-slate-800 mt-1">
              3. Quỹ sẻ chia yêu thương (Tối thiểu {cap.minShareCoins} Xu)
            </div>
            <p className="text-xs text-slate-500">Giúp đỡ bạn nhỏ có hoàn cảnh khó khăn</p>
            <input
              type="number"
              value={capstoneAllocations.shareCoins}
              onChange={(e) =>
                setCapstoneAllocations((p) => ({ ...p, shareCoins: Number(e.target.value) }))
              }
              className="mt-3 w-full px-3 py-2 rounded-xl border-2 border-rose-300 font-extrabold text-slate-900"
            />
          </div>
        </div>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
          <h4 className="font-extrabold text-amber-900 text-base mb-2">
            🌟 Tình huống phát sinh tổng hợp:
          </h4>
          <p className="text-sm text-slate-800 font-medium mb-3">{cap.surpriseQuestion}</p>
          <div className="space-y-2">
            {cap.surpriseOptions.map((opt) => {
              const selected = selectedSurpriseOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setSelectedSurpriseOptionId(opt.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition flex items-start gap-3 ${
                    selected
                      ? "bg-teal-600 text-white border-teal-700 shadow"
                      : "bg-white text-slate-800 border-amber-200 hover:border-teal-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      selected ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {selected ? "✓" : "•"}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border-4 border-teal-500 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Stage Adventure Bar */}
        <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-emerald-700 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow">
              Chặng {stage.periodIndex}/15 • {stage.lessonCode}
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                {stage.lessonName}
              </h3>
              <p className="text-xs text-sky-100">
                {stage.officialTopicName} • 📍 {stage.interactive.worldLocationName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Background Music Controller inside Stage Player */}
            <SkylineMusicController muted={muted} compact={false} />

            {/* Voice narration button for Primary grades */}
            <button
              type="button"
              onClick={() =>
                speakVietnameseText(
                  `${stage.lessonName}. ${stage.interactive.storyBrief}. ${stage.interactive.mascotGuideTip}`,
                  muted
                )
              }
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 border border-white/25"
              title="Nghe chim Sky-Line đọc lời dẫn"
            >
              <span>🔊</span>
              <span className="hidden sm:inline">Đọc lời dẫn</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveDraft(false)}
              disabled={savingDraft}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold border border-white/25"
            >
              {savingDraft ? "Đang lưu..." : "💾 Lưu nháp"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-rose-500 text-white font-bold flex items-center justify-center transition"
              aria-label="Đóng màn chơi"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 6-Step Adventure Progress Stepper */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => setLoopStep("MISSION_BRIEF")}
              className={`px-3 py-1 rounded-full transition ${
                loopStep === "MISSION_BRIEF"
                  ? "bg-teal-600 text-white shadow"
                  : "bg-teal-100 text-teal-800"
              }`}
            >
              1. Nhận nhiệm vụ & Khám phá bối cảnh
            </button>
            <span>→</span>
            <button
              type="button"
              onClick={() => setLoopStep("INTERACTIVE_PLAY")}
              className={`px-3 py-1 rounded-full transition ${
                loopStep === "INTERACTIVE_PLAY"
                  ? "bg-teal-600 text-white shadow"
                  : "bg-teal-100 text-teal-800"
              }`}
            >
              2. Thao tác tương tác thế giới
            </button>
            <span>→</span>
            <span
              className={`px-3 py-1 rounded-full ${
                loopStep === "CONSEQUENCE_FEEDBACK"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              3. Quan sát hệ quả • Nhận phản hồi • Cắm cờ
            </span>
          </div>

          <div className="text-amber-700 font-extrabold flex items-center gap-1">
            <span>🪶 Thưởng chặng: +{stage.feathersReward} Lông vũ</span>
          </div>
        </div>

        {/* Offline / Network Retry Banner */}
        {(isOffline || networkError) && (
          <div className="bg-amber-100 border-b border-amber-300 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 font-semibold shrink-0">
            <div className="flex items-center gap-2">
              <span>📡</span>
              <span>
                {networkError ||
                  "Thiết bị đang ngoại tuyến. Thao tác của em vẫn được giữ an toàn trên màn hình!"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSubmitAction}
              disabled={submitting}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm"
            >
              🔄 Thử gửi lại ngay
            </button>
          </div>
        )}

        {/* Teacher Revision Request Alert if status === NEEDS_REVISION */}
        {stage.status === "NEEDS_REVISION" && stage.teacherFeedback && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-xs text-rose-900 flex items-start gap-2.5 shrink-0">
            <span className="text-base">👩‍🏫</span>
            <div>
              <div className="font-extrabold">Nhận xét cần bổ sung từ Thầy/Cô:</div>
              <p className="mt-0.5">{stage.teacherFeedback}</p>
            </div>
          </div>
        )}

        {/* Main Scrollable Stage Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loopStep === "MISSION_BRIEF" && (
            <div className="space-y-6">
              {/* Mascot Story Brief Card */}
              <div className="bg-gradient-to-br from-sky-50 via-teal-50 to-amber-50 border-2 border-teal-200 rounded-3xl p-6 shadow-sm">
                <SkylineBirdCharacter
                  mood="EXPLORER"
                  size="lg"
                  reducedMotion={reducedMotion}
                  badgeLabel={`Khối ${grade}`}
                  speechText={stage.interactive.storyBrief}
                />

                {stage.teacherGuidance && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-white border border-teal-300 text-xs text-teal-900">
                    <b>📌 Lời dặn của giáo viên lớp em:</b> {stage.teacherGuidance}
                  </div>
                )}

                <div className="mt-5 p-4 rounded-2xl bg-white/90 border border-amber-200">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-800 mb-2">
                    🎯 Mục tiêu nhiệm vụ (Ánh xạ Yêu cầu cần đạt / Tiêu chuẩn {stage.lessonCode}):
                  </div>
                  <ul className="space-y-2">
                    {stage.criteria.map((c) => (
                      <li key={c.code} className="flex items-start gap-2.5 text-sm text-slate-800">
                        <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-mono text-xs font-bold shrink-0 mt-0.5">
                          {c.code}
                        </span>
                        <span>
                          <b className="text-teal-700">[{c.competencyGroup} - {c.level}]</b>{" "}
                          {c.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    playSkylineSfx("WELCOME", muted);
                    if (
                      !muted &&
                      typeof window !== "undefined" &&
                      localStorage.getItem("skyline_bgm_enabled") !== "0"
                    ) {
                      startSkylineBgm("QUEST_EXCITEMENT");
                    }
                    setLoopStep("INTERACTIVE_PLAY");
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-base shadow-lg flex items-center gap-2 transition"
                >
                  <span>🚀 Bắt đầu Khám phá bối cảnh & Thao tác</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {loopStep === "INTERACTIVE_PLAY" && (
            <div className="space-y-6">
              {/* Mascot Guide Strip */}
              <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-teal-950">
                  <span className="text-2xl">🐦</span>
                  <span>
                    <b>Mẹo của chim Sky-Line:</b> {stage.interactive.mascotGuideTip}
                  </span>
                </div>
              </div>

              {/* Render Active Mechanic */}
              {stage.interactive.mechanic === "BACKPACK_BUILDER" && renderBackpackMechanic()}
              {stage.interactive.mechanic === "BIRD_SHOP" && renderBirdShopMechanic()}
              {stage.interactive.mechanic === "DREAM_NEST" && renderDreamNestMechanic()}
              {stage.interactive.mechanic === "VILLAGE_RESCUE" && renderVillageRescueMechanic()}
              {stage.interactive.mechanic === "COIN_DIARY_AD_STREET" && renderDiaryAdMechanic()}

              {/* Practical / Open Situation Reflection Box for HYBRID_TEACHER stages (or optional sharing) */}
              {stage.interactive.practicalPrompt && (
                <div className="bg-indigo-50/80 border-2 border-indigo-200 rounded-3xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-indigo-950 text-sm sm:text-base flex items-center gap-2">
                      <span>✍️</span>
                      <span>Nhiệm vụ thực hành / Liên hệ thực tế (Thầy/Cô sẽ xem và xác nhận):</span>
                    </label>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-200 text-indigo-900">
                      Cần giáo viên xác nhận
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-indigo-900 font-medium">
                    {stage.interactive.practicalPrompt}
                  </p>
                  <textarea
                    rows={3}
                    value={practicalNote}
                    onChange={(e) => setPracticalNote(e.target.value)}
                    placeholder="Em hãy gõ vài dòng chia sẻ cách làm hoặc ý tưởng của em tại đây nhé (ít nhất 5 ký tự)..."
                    className="w-full p-3.5 rounded-2xl border-2 border-indigo-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLoopStep("MISSION_BRIEF")}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100"
                >
                  ← Xem lại nhiệm vụ
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAction}
                  disabled={submitting}
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base shadow-lg transition flex items-center gap-2"
                >
                  <span>{submitting ? "⏳ Đang kiểm tra hệ quả..." : "✨ Quan sát hệ quả & Hoàn thành chặng!"}</span>
                </button>
              </div>
            </div>
          )}

          {loopStep === "CONSEQUENCE_FEEDBACK" && validationResult && (
            <div className="space-y-6">
              <div
                className={`rounded-3xl p-6 border-4 shadow-md ${
                  validationResult.autoChallengePassed
                    ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50 border-emerald-400"
                    : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <SkylineBirdCharacter
                    mood={validationResult.autoChallengePassed ? "CELEBRATE" : "THINKING"}
                    size="lg"
                    reducedMotion={reducedMotion}
                    speechText={validationResult.feedbackSummary}
                  />

                  <div className="text-right shrink-0">
                    <div className="inline-block px-4 py-2 rounded-2xl bg-white border-2 border-teal-300 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Mức độ hoàn thành</div>
                      <div className="text-2xl font-black text-teal-700">
                        {validationResult.scorePercent}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* World State Change Visual */}
                <div className="mt-5 p-4 rounded-2xl bg-white/90 border-2 border-teal-200 flex items-center gap-3">
                  <span className="text-3xl">
                    {validationResult.autoChallengePassed ? "🚩" : "🌱"}
                  </span>
                  <div>
                    <div className="text-xs font-bold uppercase text-teal-700">
                      Trạng thái thế giới thay đổi:
                    </div>
                    <div className="font-extrabold text-slate-900 text-base">
                      {validationResult.worldStateEffect.headline}
                    </div>
                  </div>
                </div>

                {/* Detailed Pedagogical Feedback */}
                {validationResult.detailedFeedback.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-extrabold uppercase text-slate-700">
                      Chi tiết phản hồi từ chim Sky-Line:
                    </div>
                    {validationResult.detailedFeedback.map((fb, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 flex items-start gap-2"
                      >
                        <span>{validationResult.autoChallengePassed ? "🌟" : "💡"}</span>
                        <span>{fb}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Separate Status Explanation: Auto Challenge vs Teacher Confirmation */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">1. Trạng thái tham gia</div>
                    <div className="font-extrabold text-emerald-700 text-sm mt-0.5">
                      ✅ Đã chơi chặng này
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">2. Thử thách tự động</div>
                    <div
                      className={`font-extrabold text-sm mt-0.5 ${
                        validationResult.autoChallengePassed
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {validationResult.autoChallengePassed
                        ? "✅ Đã vượt thử thách tự động"
                        : "🔄 Cần thử lại một chút"}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="text-xs text-slate-500">3. Xác nhận thực hành</div>
                    <div className="font-extrabold text-indigo-700 text-sm mt-0.5">
                      {stage.interactive.evaluationMode === "HYBRID_TEACHER"
                        ? stage.teacherConfirmed
                          ? "✅ Đã được GV xác nhận"
                          : validationResult.nextStatus === "WAITING_CONFIRMATION"
                          ? "⏳ Đang chờ GV xác nhận"
                          : "✍️ Cần viết chia sẻ thực hành"
                        : "✅ Chấm khách quan tự động"}
                    </div>
                  </div>
                </div>

                {/* New Rewards Granted Banner */}
                {newRewards.length > 0 && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-100 border-2 border-amber-400 text-amber-950">
                    <div className="font-black text-sm mb-1">
                      🎉 Phần thưởng mới ghi vào Hộ chiếu Hành trình của {studentName}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newRewards.map((rw) => (
                        <span
                          key={rw.rewardCode}
                          className="px-3 py-1.5 rounded-xl bg-white border border-amber-400 font-bold text-xs shadow-sm"
                        >
                          🚩 {rw.title} (+{rw.feathers} 🪶)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setLoopStep("INTERACTIVE_PLAY");
                  }}
                  className="px-5 py-3 rounded-2xl border-2 border-teal-600 text-teal-700 font-extrabold text-sm hover:bg-teal-50"
                >
                  🔄 Thử lại / Điều chỉnh phương án (Không bị trừ thành tích đã đạt)
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-sm shadow-lg"
                >
                  🗺️ Quay về Bản đồ Đảo Tài Chính 2S
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
