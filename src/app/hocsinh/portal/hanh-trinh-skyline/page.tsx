"use client";

import React, { useCallback, useEffect, useState } from "react";
import { StudentStageView } from "@/lib/skyline-journey/service";
import {
  SkylineBirdCharacter,
  SkylineMusicController,
  Skyline3DShieldBadge,
  SKYLINE_CHARACTERS,
  getCharacterById,
  playSkylineSfx,
  speakVietnameseText,
  startSkylineBgm,
  stopSkylineBgm,
  getSkylineBgmState,
  getDefaultThemeForGrade
} from "@/components/skyline-journey/SkylineBirdCharacter";
import { StageGamePlayer } from "@/components/skyline-journey/StageGamePlayer";

const INTEREST_OPTIONS = [
  {
    id: "VERY_LOVE",
    emoji: "😍",
    label: "Rất yêu thích!",
    desc: "Em rất hào hứng khám phá trò chơi và bài học!",
    colorCls: "border-emerald-400 bg-emerald-50 text-emerald-950"
  },
  {
    id: "LOVE",
    emoji: "😊",
    label: "Yêu thích!",
    desc: "Em thấy hoạt động và môn học này thú vị, bổ ích.",
    colorCls: "border-sky-400 bg-sky-50 text-sky-950"
  },
  {
    id: "NORMAL",
    emoji: "🤔",
    label: "Bình thường",
    desc: "Em muốn chơi thử để khám phá thêm.",
    colorCls: "border-amber-400 bg-amber-50 text-amber-950"
  },
  {
    id: "NEED_SUPPORT",
    emoji: "🌱",
    label: "Cần thêm hướng dẫn",
    desc: "Em mong có thêm gợi ý dễ hiểu khi tham gia.",
    colorCls: "border-purple-400 bg-purple-50 text-purple-950"
  }
];

const FAVORITE_ACTIVITIES = [
  "🎒 Chuẩn bị ba lô Cần – Muốn",
  "🏪 Cửa hàng của chim & Mua sắm",
  "🪺 Xây tổ ước mơ & Heo đất",
  "🏡 Giải cứu ngôi làng xanh",
  "🪶 Sưu tầm lông vũ & Huy hiệu"
];

export default function StudentSkylineJourneyPage() {
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ISLAND_MAP" | "WORLD_ISLANDS" | "PASSPORT">("ISLAND_MAP");
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>("ALL");
  const [activeStage, setActiveStage] = useState<StudentStageView | null>(null);
  const [birdTargetPeriod, setBirdTargetPeriod] = useState<number>(1);
  const [is3DIslandMode, setIs3DIslandMode] = useState<boolean>(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("SKYLINE_EXPLORER");

  // Welcome & Subject Interest Survey Modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [hasAutoOpenedWelcome, setHasAutoOpenedWelcome] = useState<boolean>(false);
  const [surveyInterestId, setSurveyInterestId] = useState<string>("VERY_LOVE");
  const [surveyActivities, setSurveyActivities] = useState<string[]>([
    "🏪 Cửa hàng của chim & Mua sắm",
    "🪶 Sưu tầm lông vũ & Huy hiệu"
  ]);
  const [surveyNote, setSurveyNote] = useState<string>("");
  const [submittingSurvey, setSubmittingSurvey] = useState<boolean>(false);
  const [surveyFeedbackMsg, setSurveyFeedbackMsg] = useState<string | null>(null);

  // Accessibility & comfort toggles (persisted in localStorage)
  const [muted, setMuted] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMuted(localStorage.getItem("skyline_muted") === "1");
      setReducedMotion(localStorage.getItem("skyline_reduced_motion") === "1");
      const savedChar = localStorage.getItem("skyline_character_id");
      if (savedChar) {
        setSelectedCharacterId(savedChar);
      }
    }
  }, []);

  // Automatically start joyful adventure BGM on first user interaction unless muted or disabled
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleFirstInteraction = () => {
      const isMuted = localStorage.getItem("skyline_muted") === "1";
      const bgmDisabled = localStorage.getItem("skyline_bgm_enabled") === "0";
      if (!isMuted && !bgmDisabled && !getSkylineBgmState().isPlaying) {
        const savedTheme = (localStorage.getItem("skyline_bgm_theme") as any) || "ISLAND_ADVENTURE";
        startSkylineBgm(savedTheme);
      }
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      stopSkylineBgm();
    };
  }, []);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("skyline_muted", next ? "1" : "0");
      }
      return next;
    });
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("skyline_reduced_motion", next ? "1" : "0");
      }
      return next;
    });
  };

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/skyline-journey/student", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tải bản đồ Hành trình Sky-Line");
        return;
      }
      setOverview(data);
      if (data.continueStage?.periodIndex) {
        setBirdTargetPeriod(data.continueStage.periodIndex);
      }
      if (data.welcomeSurvey) {
        setSurveyInterestId(data.welcomeSurvey.interestLevel || "VERY_LOVE");
        if (Array.isArray(data.welcomeSurvey.favoriteActivities)) {
          setSurveyActivities(data.welcomeSurvey.favoriteActivities);
        }
        setSurveyNote(data.welcomeSurvey.note || "");
        if (data.welcomeSurvey.characterId) {
          setSelectedCharacterId(data.welcomeSurvey.characterId);
          if (typeof window !== "undefined") {
            localStorage.setItem("skyline_character_id", data.welcomeSurvey.characterId);
          }
        }
      } else if (!hasAutoOpenedWelcome && data.activeIsland?.configStatus === "ACTIVE_APPROVED") {
        setShowWelcomeModal(true);
        setHasAutoOpenedWelcome(true);
      }
    } catch {
      setError("Mạng đang gián đoạn. Em bấm Thử tải lại bản đồ nhé!");
    } finally {
      setLoading(false);
    }
  }, [hasAutoOpenedWelcome]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleOpenStage = (stage: StudentStageView) => {
    setBirdTargetPeriod(stage.periodIndex);
    if (stage.status === "LOCKED") {
      playSkylineSfx("RETRY", muted);
      return;
    }
    playSkylineSfx("CLASSROOM_BELL", muted);
    if (!muted && typeof window !== "undefined" && localStorage.getItem("skyline_bgm_enabled") !== "0") {
      startSkylineBgm(getDefaultThemeForGrade(Number(overview?.student?.grade) || 2));
    }
    setActiveStage(stage);
  };

  const toggleFavoriteActivity = (act: string) => {
    setSurveyActivities((prev) =>
      prev.includes(act) ? prev.filter((x) => x !== act) : [...prev, act]
    );
  };

  const handleSelectCharacter = (charId: string) => {
    playSkylineSfx("CLICK", muted);
    setSelectedCharacterId(charId);
    if (typeof window !== "undefined") {
      localStorage.setItem("skyline_character_id", charId);
    }
  };

  const handleSubmitWelcomeSurvey = async (openFirstStageAfter = false) => {
    const chosen =
      INTEREST_OPTIONS.find((o) => o.id === surveyInterestId) || INTEREST_OPTIONS[0];
    const chosenChar = getCharacterById(selectedCharacterId);
    setSubmittingSurvey(true);
    setSurveyFeedbackMsg(null);
    try {
      const res = await fetch("/api/skyline-journey/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_WELCOME_SURVEY",
          interestLevel: chosen.id,
          interestLabel: `${chosen.emoji} ${chosen.label}`,
          favoriteActivities: surveyActivities,
          note: surveyNote,
          characterId: chosenChar.id,
          characterName: chosenChar.name
        })
      });
      const data = await res.json();
      if (res.ok && data.overview) {
        playSkylineSfx("FLAG", muted);
        setOverview(data.overview);
        setSurveyFeedbackMsg(
          data.firstTimeBonus
            ? `🎉 Tuyệt vời! Em đã chọn nhân vật "${chosenChar.name}" và nhận +1 Lông vũ Khởi Hành!`
            : `✅ Đã lưu nhân vật đồng hành "${chosenChar.name}" và khảo sát yêu thích của em!`
        );
        setTimeout(() => {
          setShowWelcomeModal(false);
          if (openFirstStageAfter && data.overview.continueStage) {
            setActiveStage(data.overview.continueStage);
          }
        }, 900);
      }
    } catch {
      setSurveyFeedbackMsg("Không thể lưu khảo sát lúc này, em thử lại nhé!");
    } finally {
      setSubmittingSurvey(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <SkylineBirdCharacter mood="EXPLORER" size="xl" />
        <h2 className="mt-4 text-xl font-extrabold text-teal-800">
          Chim Sky-Line đang mở Bản đồ Đảo Học Tập cho em...
        </h2>
        <p className="text-sm text-slate-500 mt-1">Chờ một xíu nhé!</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white border-2 border-amber-300 rounded-3xl p-6 text-center shadow-lg">
        <SkylineBirdCharacter mood="THINKING" size="lg" />
        <h3 className="mt-3 text-lg font-extrabold text-slate-800">
          {error || "Chưa tải được dữ liệu hành trình"}
        </h3>
        <button
          type="button"
          onClick={fetchOverview}
          className="mt-4 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow"
        >
          🔄 Thử tải lại bản đồ
        </button>
      </div>
    );
  }

  const {
    student,
    gradeProfile,
    islands = [],
    activeIsland,
    zones = [],
    stages = [],
    continueStage,
    needsRevisionStages = [],
    welcomeSurvey,
    progressMetrics,
    passport
  } = overview;

  const filteredStages: StudentStageView[] =
    selectedZoneCode === "ALL"
      ? stages
      : stages.filter((s: StudentStageView) => s.topicCode === selectedZoneCode);

  const statusBadge = (status: StudentStageView["status"]) => {
    switch (status) {
      case "COMPLETED":
        return { label: "Hoàn thành", cls: "bg-emerald-600 text-white", icon: "🚩" };
      case "WAITING_CONFIRMATION":
        return { label: "Chờ GV xác nhận", cls: "bg-indigo-600 text-white", icon: "⏳" };
      case "NEEDS_REVISION":
        return { label: "Cần bổ sung", cls: "bg-rose-600 text-white", icon: "✍️" };
      case "IN_PROGRESS":
        return { label: "Đang thực hiện", cls: "bg-amber-500 text-slate-950", icon: "🧭" };
      case "READY":
        return { label: "Sẵn sàng", cls: "bg-sky-600 text-white", icon: "✨" };
      default:
        return { label: "Chưa mở", cls: "bg-slate-300 text-slate-700", icon: "🔒" };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Adventure Hero Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <SkylineBirdCharacter
              mood="EXPLORER"
              size="lg"
              characterId={selectedCharacterId}
              reducedMotion={reducedMotion}
              badgeLabel={`Lớp ${student.className}`}
            />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold mb-1.5">
                <span>🏝️ HÀNH TRÌNH SKY-LINE • CẤP TIỂU HỌC</span>
                <span>•</span>
                <span>{gradeProfile?.label}</span>
                <span>•</span>
                <span className="text-amber-300">
                  {getCharacterById(selectedCharacterId).emoji} {getCharacterById(selectedCharacterId).name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Chào nhà thám hiểm nhí {student.fullName}!
              </h1>
              <p className="text-xs sm:text-sm text-sky-100 mt-1 max-w-2xl">
                {gradeProfile?.pedagogicalFocus}
              </p>
            </div>
          </div>

          {/* Quick Passport Stats & Accessibility Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-amber-400/20 backdrop-blur px-3.5 py-2 rounded-2xl border-2 border-amber-300 text-center shadow">
              <div className="text-[11px] text-amber-100 font-bold">Khiên Danh Dự</div>
              <div className="text-lg font-black text-amber-300">
                🛡️ {passport?.shieldsEarnedCount ?? passport?.flagsPlantedCount ?? 0}/{stages.length || 15}
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur px-3.5 py-2 rounded-2xl border border-white/25 text-center">
              <div className="text-[11px] text-sky-100 font-semibold">Lông vũ</div>
              <div className="text-lg font-black text-amber-300">
                🪶 {passport?.totalFeathers || 0}
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur px-3.5 py-2 rounded-2xl border border-white/25 text-center">
              <div className="text-[11px] text-sky-100 font-semibold">Cờ đã cắm</div>
              <div className="text-lg font-black text-emerald-300">
                🚩 {passport?.flagsPlantedCount || 0}/{stages.length || 15}
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur px-3.5 py-2 rounded-2xl border border-white/25 text-center">
              <div className="text-[11px] text-sky-100 font-semibold">Huy hiệu</div>
              <div className="text-lg font-black text-amber-200">
                🏅 {passport?.badges?.length || 0}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <SkylineMusicController
                muted={muted}
                onToggleMute={toggleMute}
                grade={Number(student.grade) || 2}
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    muted
                      ? "bg-rose-500/80 text-white border-rose-300"
                      : "bg-white/15 text-white border-white/30 hover:bg-white/25"
                  }`}
                >
                  {muted ? "🔇 Đã tắt âm" : "🔊 Bật âm thanh"}
                </button>
                <button
                  type="button"
                  onClick={toggleReducedMotion}
                  className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    reducedMotion
                      ? "bg-amber-400 text-slate-950 border-white"
                      : "bg-white/15 text-white border-white/30 hover:bg-white/25"
                  }`}
                >
                  {reducedMotion ? "🐢 Giảm chuyển động" : "✨ Chuyển động"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Continue Journey Button + Tab Switcher */}
        <div className="mt-5 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ISLAND_MAP")}
              className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition ${
                activeTab === "ISLAND_MAP"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              🗺️ Bản đồ Chủ đề & {stages.length || 15} Chặng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("WORLD_ISLANDS")}
              className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition ${
                activeTab === "WORLD_ISLANDS"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              🏝️ Bản đồ các Đảo môn học ({islands.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PASSPORT")}
              className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition ${
                activeTab === "PASSPORT"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              🛂 Hộ chiếu Hành trình cá nhân
            </button>
            <button
              type="button"
              onClick={() => {
                playSkylineSfx("CLICK", muted);
                setShowWelcomeModal(true);
              }}
              className="px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm bg-white text-teal-900 hover:bg-amber-100 shadow-md transition flex items-center gap-1.5"
            >
              <span>👋 Mở đầu Game & Khảo sát yêu thích</span>
            </button>
          </div>

          {continueStage && (
            <button
              type="button"
              onClick={() => handleOpenStage(continueStage)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-sm shadow-lg flex items-center gap-2 transition"
            >
              <span>🚀 Tiếp tục hành trình: Chặng {continueStage.periodIndex} ({continueStage.lessonName})</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* MỞ ĐẦU GAME: CHỌN NHÂN VẬT ĐỒNG HÀNH 3D & KHẢO SÁT YÊU THÍCH MÔN HỌC */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-amber-50 border-2 border-sky-300 rounded-3xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <img
                src="/images/skyline-bird-mascot.jpg"
                alt="Chú chim Sky-Line 3D chào mừng"
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-sky-400 shadow-lg bg-white ${
                  !reducedMotion ? "hover:scale-105 transition-transform" : ""
                }`}
              />
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow border border-white">
                {getCharacterById(selectedCharacterId).emoji} SKY-LINE
              </span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold text-xs mb-1">
                <span>🎉 MỞ ĐẦU GAME • CHỌN NHÂN VẬT 3D & KHẢO SÁT YÊU THÍCH</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Chào mừng {student.fullName}! Em hãy chọn 1 Nhân vật đồng hành để bắt đầu hành trình săn Khiên Danh Dự nhé!
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Nhân vật đang đồng hành:{" "}
                <b className="text-teal-800">
                  {getCharacterById(selectedCharacterId).emoji} {getCharacterById(selectedCharacterId).name} ({getCharacterById(selectedCharacterId).roleTitle})
                </b>
                {welcomeSurvey && (
                  <>
                    {" "}• Cảm nhận môn học: <b className="text-teal-700">{welcomeSurvey.interestLabel}</b>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            {INTEREST_OPTIONS.map((opt) => {
              const isSelected = welcomeSurvey?.interestLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    playSkylineSfx("CLICK", muted);
                    setSurveyInterestId(opt.id);
                    setShowWelcomeModal(true);
                  }}
                  className={`px-3 py-2 rounded-2xl border-2 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-700 shadow-md scale-105"
                      : "bg-white hover:bg-sky-50 text-slate-800 border-slate-200 hover:border-sky-400"
                  }`}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                playSkylineSfx("CLICK", muted);
                setShowWelcomeModal(true);
              }}
              className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow cursor-pointer"
            >
              {welcomeSurvey ? "🎭 Đổi Nhân Vật & Khảo sát" : "✨ Chọn Nhân Vật & Khảo sát (+1 🪶)"}
            </button>
          </div>
        </div>

        {/* 5-Character 3D Selection Bar right on the Map */}
        <div className="pt-3 border-t border-sky-200/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black text-teal-950 uppercase tracking-wider">
              🎭 CHỌN 1 NHÂN VẬT 3D ĐỂ BẮT ĐẦU HÀNH TRÌNH CỦA EM:
            </span>
            <span className="text-[11px] font-bold text-amber-800">
              🛡️ Hoàn thành mỗi chặng sẽ được tặng +1 Khiên Danh Dự 3D!
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {SKYLINE_CHARACTERS.map((char) => {
              const isChosen = selectedCharacterId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelectCharacter(char.id)}
                  className={`p-3 rounded-2xl border-2 border-b-4 text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isChosen
                      ? `bg-gradient-to-r ${char.auraGradient} text-white border-white shadow-lg scale-[1.02]`
                      : "bg-white hover:bg-sky-50/80 text-slate-800 border-slate-200 hover:border-teal-400"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src="/images/skyline-bird-mascot.jpg"
                      alt={char.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow bg-white"
                    />
                    <span className="absolute -bottom-1 -right-1 text-sm bg-amber-300 rounded-full w-5 h-5 flex items-center justify-center shadow">
                      {char.emoji}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs truncate">{char.name}</div>
                    <div
                      className={`text-[10px] font-bold truncate ${
                        isChosen ? "text-amber-100" : "text-teal-700"
                      }`}
                    >
                      {char.roleTitle}
                    </div>
                    <div
                      className={`text-[9px] truncate mt-0.5 ${
                        isChosen ? "text-white/90" : "text-slate-500"
                      }`}
                    >
                      {isChosen ? "✅ Đang đồng hành" : char.weaponOrGear}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alert Banner: Nhiệm vụ cần bổ sung (if any) */}
      {needsRevisionStages.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <h3 className="font-extrabold text-rose-900 text-sm sm:text-base">
                Em có {needsRevisionStages.length} nhiệm vụ cần bổ sung theo góp ý của Thầy/Cô!
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                Chặng {needsRevisionStages[0].periodIndex} ({needsRevisionStages[0].lessonName}):{" "}
                &ldquo;{needsRevisionStages[0].teacherFeedback || "Em hãy bổ sung thêm phần chia sẻ thực hành nhé!"}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenStage(needsRevisionStages[0])}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shrink-0 shadow"
          >
            Mở chặng để bổ sung ngay →
          </button>
        </div>
      )}

      {/* Dual Progress Bar: Tiến độ bài đã giao vs Tiến độ toàn chương trình + 3 Trạng thái tách biệt */}
      {stages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-white border-2 border-teal-100 rounded-3xl p-4 sm:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>🎯 Tiến độ các chặng đã mở/giao</span>
                <span className="text-teal-700">
                  {progressMetrics.completedAssignedCount}/{progressMetrics.assignedStagesCount} chặng ({progressMetrics.assignedProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressMetrics.assignedProgressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Các chặng chưa mở hoặc được miễn không tính là quá hạn.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>📚 Tiến độ toàn chương trình {activeIsland?.curriculumCode || "TC02S"}</span>
                <span className="text-sky-700">
                  {progressMetrics.completedCurriculumCount}/{progressMetrics.totalCurriculumStages} chặng ({progressMetrics.curriculumProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${progressMetrics.curriculumProgressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {zones.length} Vùng chủ đề • {stages.length} Bài học • {stages.reduce((sum: number, s: any) => sum + (s.criteria?.length || 0), 0)} Yêu cầu cần đạt
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border-2 border-teal-100 rounded-3xl p-4 sm:p-5 shadow-sm grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-2xl bg-sky-50 border border-sky-200">
              <div className="text-lg font-black text-sky-800">
                {progressMetrics.hasPlayedCount}/{stages.length || 15}
              </div>
              <div className="text-[11px] font-bold text-slate-600">Đã tham gia chơi</div>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-lg font-black text-emerald-800">
                {progressMetrics.autoChallengePassedCount}/{stages.length || 15}
              </div>
              <div className="text-[11px] font-bold text-slate-600">Vượt thử thách & Nhận Khiên</div>
            </div>
            <div className="p-2 rounded-2xl bg-indigo-50 border border-indigo-200">
              <div className="text-lg font-black text-indigo-800">
                {progressMetrics.teacherConfirmedCount}
              </div>
              <div className="text-[11px] font-bold text-slate-600">Đã được GV xác nhận</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: BẢN ĐỒ CHỦ ĐỀ VÀ CÁC CHẶNG MÔ HÌNH 3D SỐNG ĐỘNG */}
      {activeTab === "ISLAND_MAP" && (
        <div className="space-y-6">
          {!activeIsland || activeIsland.configStatus !== "ACTIVE_APPROVED" ? (
            <div className="bg-white border-2 border-amber-300 rounded-3xl p-8 text-center shadow-sm max-w-2xl mx-auto">
              <SkylineBirdCharacter mood="THINKING" size="xl" characterId={selectedCharacterId} />
              <h3 className="text-xl font-extrabold text-slate-800 mt-4">
                Đảo học tập của Khối {student.grade} đang chờ cấu hình chương trình chính thức
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                {activeIsland?.statusMessage ||
                  `Hiện tại lớp ${student.className} (Khối ${student.grade}) chưa có chương trình game được duyệt. Hệ thống tuân thủ nguyên tắc không tự tạo nội dung giả hoặc gán nhầm chương trình của khối khác.`}
              </p>
            </div>
          ) : (
            <>
              {/* Zones Filter Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <button
                  type="button"
                  onClick={() => setSelectedZoneCode("ALL")}
                  className={`p-4 rounded-3xl border-2 text-left transition ${
                    selectedZoneCode === "ALL"
                      ? "bg-teal-700 text-white border-teal-800 shadow-md"
                      : "bg-white text-slate-800 border-slate-200 hover:border-teal-400"
                  }`}
                >
                  <div className="text-xs font-bold uppercase opacity-80">
                    Toàn bộ Đảo {activeIsland?.curriculumCode || "TC02S"}
                  </div>
                  <div className="text-base font-extrabold mt-1">
                    🗺️ Tất cả {zones.length} Vùng ({stages.length} Chặng 3D)
                  </div>
                  <div className="text-xs mt-1 opacity-85">
                    Xem toàn cảnh mô hình 3D từ Chặng 1 đến Chặng {stages.length}
                  </div>
                </button>

                {zones.map((z: any) => {
                  const isSel = selectedZoneCode === z.topicCode;
                  const zoneStages = stages.filter((s: StudentStageView) => s.topicCode === z.topicCode);
                  const passedInZone = zoneStages.filter((s: StudentStageView) => s.flagPlanted).length;
                  return (
                    <button
                      key={z.topicCode}
                      type="button"
                      onClick={() => setSelectedZoneCode(z.topicCode)}
                      className={`p-4 rounded-3xl border-2 text-left transition ${
                        isSel
                          ? "bg-teal-700 text-white border-teal-800 shadow-md"
                          : "bg-white text-slate-800 border-slate-200 hover:border-teal-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase opacity-80">
                          Mã {z.topicCode}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isSel ? "bg-amber-400 text-slate-900" : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          🛡️🚩 {passedInZone}/{zoneStages.length} chặng
                        </span>
                      </div>
                      <div className="text-sm font-extrabold mt-1">{z.creativeZoneName}</div>
                      <div className={`text-[11px] mt-0.5 ${isSel ? "text-teal-100" : "text-slate-500"}`}>
                        {z.officialTopicName}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Interactive 3D Scenic Island Map with 3D Stage Monuments & Chosen Companion */}
              <div
                className="bg-gradient-to-b from-sky-900 via-teal-900 to-emerald-950 border-4 border-teal-400 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-white"
                style={{ perspective: "1400px" }}
              >
                {/* Ambient 3D Island Clouds & Ocean Glow */}
                <div className="pointer-events-none absolute -top-20 left-1/4 w-96 h-48 bg-sky-400/15 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 right-1/4 w-96 h-48 bg-emerald-400/15 rounded-full blur-3xl" />

                <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
                  <div>
                    <h3 className="font-black text-amber-300 text-lg sm:text-xl flex items-center gap-2">
                      <span>
                        🏝️ Sa Bàn Đảo 3D Khối {student.grade} ({activeIsland?.curriculumCode || "TC02S"})
                      </span>
                    </h3>
                    <p className="text-xs text-sky-100 mt-0.5">
                      Chạm vào công trình 3D của từng chặng để <b>{getCharacterById(selectedCharacterId).name}</b> bay tới thực hành nhiệm vụ và nhận <b>🛡️ Khiên Danh Dự</b>!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setIs3DIslandMode((v) => !v)}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black shadow hover:bg-amber-300 cursor-pointer"
                    >
                      {is3DIslandMode ? "📐 Đang bật Góc nhìn Đảo Nổi 3D" : "🗺️ Bật Góc nhìn Đảo Nổi 3D"}
                    </button>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-black">
                      🛡️🚩 Đã nhận Khiên
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500 text-white">⏳ Chờ xác nhận</span>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500 text-white">✨ Sẵn sàng</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">🔒 Chưa mở</span>
                  </div>
                </div>

                {/* 3D Zones & Extruded 3D Stage Monuments */}
                <div
                  className="space-y-7 transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform:
                      !reducedMotion && is3DIslandMode
                        ? "rotateX(8deg) scale(0.99)"
                        : "none"
                  }}
                >
                  {zones
                    .filter((z: any) => selectedZoneCode === "ALL" || z.topicCode === selectedZoneCode)
                    .map((zone: any, zoneIdx: number) => {
                      const zoneStages: StudentStageView[] = filteredStages.filter(
                        (s) => s.topicCode === zone.topicCode
                      );
                      return (
                        <div
                          key={zone.topicCode}
                          className="bg-gradient-to-b from-teal-950/90 to-slate-950/95 backdrop-blur-md border-2 border-b-8 border-teal-400/60 rounded-3xl p-5 shadow-[0_18px_35px_rgba(0,0,0,0.55)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-6 border-b border-white/15">
                            <div>
                              <span className="text-xs font-extrabold uppercase text-amber-300">
                                🏝️ Vùng Đảo 3D số {zoneIdx + 1}: {zone.creativeZoneName}
                              </span>
                              <h4 className="font-black text-white text-base sm:text-lg mt-0.5">
                                {zone.officialTopicName} ({zone.topicCode})
                              </h4>
                            </div>
                            <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/60">
                              🏅 Huy hiệu vùng: {zone.badgeName}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-3">
                            {zoneStages.map((st) => {
                              const badge = statusBadge(st.status);
                              const isBirdHere = birdTargetPeriod === st.periodIndex;
                              const isLocked = st.status === "LOCKED";
                              const hasShield = st.flagPlanted || st.autoChallengePassed;

                              const monumentIcon =
                                st.interactive.mechanic === "BACKPACK_BUILDER"
                                  ? "🎒"
                                  : st.interactive.mechanic === "BIRD_SHOP"
                                  ? "🏪"
                                  : st.interactive.mechanic === "DREAM_NEST"
                                  ? "🌳"
                                  : st.interactive.mechanic === "VILLAGE_RESCUE"
                                  ? "🏡"
                                  : "🏛️";

                              return (
                                <div
                                  key={st.lessonCode}
                                  onClick={() => handleOpenStage(st)}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleOpenStage(st);
                                    }
                                  }}
                                  style={{
                                    transform:
                                      !reducedMotion && is3DIslandMode
                                        ? isBirdHere
                                          ? "translateZ(26px) translateY(-8px)"
                                          : hasShield
                                          ? "translateZ(16px) translateY(-4px)"
                                          : "translateZ(6px)"
                                        : undefined
                                  }}
                                  className={`group relative rounded-3xl p-4 border-2 border-b-[10px] transition-all duration-300 flex flex-col justify-between ${
                                    isLocked
                                      ? "bg-slate-900/75 border-slate-700 border-b-slate-800 text-slate-400 opacity-75 cursor-not-allowed"
                                      : isBirdHere
                                      ? "bg-gradient-to-b from-amber-50 via-white to-sky-50 text-slate-900 border-amber-400 border-b-amber-600 ring-4 ring-amber-300/80 shadow-[0_20px_35px_rgba(245,158,11,0.45)] cursor-pointer mt-2"
                                      : hasShield
                                      ? "bg-gradient-to-b from-emerald-50 via-white to-teal-50 text-slate-900 border-emerald-400 border-b-emerald-700 hover:-translate-y-1.5 shadow-[0_14px_28px_rgba(16,185,129,0.3)] cursor-pointer"
                                      : "bg-gradient-to-b from-white to-sky-50 text-slate-900 border-sky-300 border-b-teal-700 hover:-translate-y-1.5 hover:shadow-[0_14px_28px_rgba(14,165,233,0.35)] cursor-pointer"
                                  }`}
                                >
                                  {/* Chosen 3D Companion Character Perched on Current Stage Monument */}
                                  {isBirdHere && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playSkylineSfx("CLICK", muted);
                                        setShowWelcomeModal(true);
                                      }}
                                      title="Nhấn để đổi Nhân vật đồng hành 3D hoặc xem Khảo sát đầu game"
                                      className={`absolute -top-8 right-2 z-20 flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-sky-400 text-slate-950 font-black text-[11px] shadow-xl border-2 border-white hover:scale-105 transition ${
                                        !reducedMotion ? "animate-bounce" : ""
                                      }`}
                                    >
                                      <img
                                        src="/images/skyline-bird-mascot.jpg"
                                        alt={getCharacterById(selectedCharacterId).name}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white bg-white shadow-sm"
                                      />
                                      <div className="leading-tight text-left">
                                        <span className="block text-[10px] font-black text-slate-950">
                                          {getCharacterById(selectedCharacterId).emoji} Đang ở đây
                                        </span>
                                        <span className="block text-[9px] font-extrabold text-teal-950">
                                          Đổi nhân vật ✨
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div className={isBirdHere ? "pt-3" : ""}>
                                    {/* Top Row: Stage Number + 3D Monument Roof Icon + Status */}
                                    <div className="flex items-center justify-between gap-1 mb-2.5">
                                      <span
                                        className={`text-xs font-black px-2.5 py-0.5 rounded-xl ${
                                          isLocked
                                            ? "bg-slate-800 text-slate-300"
                                            : "bg-teal-700 text-white shadow-xs"
                                        }`}
                                      >
                                        Chặng {st.periodIndex}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}
                                      >
                                        {badge.icon} {badge.label}
                                      </span>
                                    </div>

                                    {/* 3D Architectural Building / Scenario Preview inside Card */}
                                    <div
                                      className={`rounded-2xl p-2.5 mb-2.5 flex items-center justify-between border ${
                                        isLocked
                                          ? "bg-slate-800/80 border-slate-700"
                                          : hasShield
                                          ? "bg-gradient-to-r from-emerald-100/90 to-amber-100/90 border-emerald-300"
                                          : "bg-gradient-to-r from-sky-100/80 to-teal-100/80 border-sky-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-2xl drop-shadow-sm shrink-0">
                                          {monumentIcon}
                                        </span>
                                        <div className="min-w-0">
                                          <div
                                            className={`text-[10px] font-black uppercase truncate ${
                                              isLocked ? "text-slate-400" : "text-teal-900"
                                            }`}
                                          >
                                            Mô hình 3D
                                          </div>
                                          <div
                                            className={`text-[11px] font-bold truncate ${
                                              isLocked ? "text-slate-300" : "text-slate-800"
                                            }`}
                                          >
                                            {st.interactive.worldLocationName}
                                          </div>
                                        </div>
                                      </div>

                                      {/* 3D Shield Emblem if completed */}
                                      {hasShield ? (
                                        <span
                                          className="px-2 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-0.5 shrink-0"
                                          title={`Đã nhận Khiên Danh Dự Chặng ${st.periodIndex}`}
                                        >
                                          🛡️
                                        </span>
                                      ) : (
                                        <span className="text-xs opacity-60 shrink-0">🛡️</span>
                                      )}
                                    </div>

                                    <h5
                                      className={`font-extrabold text-sm leading-snug ${
                                        isLocked ? "text-slate-200" : "text-slate-900"
                                      }`}
                                    >
                                      {st.lessonName}
                                    </h5>
                                    <div
                                      className={`text-[10px] font-mono mt-0.5 ${
                                        isLocked ? "text-slate-400" : "text-slate-500"
                                      }`}
                                    >
                                      Mã bài: {st.lessonCode}
                                    </div>
                                  </div>

                                  <div
                                    className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${
                                      isLocked ? "border-slate-800" : "border-slate-200/80"
                                    }`}
                                  >
                                    <span
                                      className={`font-black ${
                                        isLocked ? "text-slate-400" : "text-amber-700"
                                      }`}
                                    >
                                      +1 🛡️ • +{st.feathersReward} 🪶
                                    </span>
                                    <span
                                      className={`font-black ${
                                        isLocked ? "text-slate-400" : "text-teal-700 group-hover:translate-x-0.5 transition-transform"
                                      }`}
                                    >
                                      {isLocked ? "Chưa mở 🔒" : "Vào 3D →"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: BẢN ĐỒ CÁC ĐẢO MÔN HỌC ĐƯỢC GÁN */}
      {activeTab === "WORLD_ISLANDS" && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-teal-200 rounded-3xl p-5 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-lg">
              🏝️ Quần Đảo Môn Học Của Lớp {student.className} (Khối {student.grade})
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Hệ thống chỉ hiển thị các đảo thuộc chương trình đang được phân công cho lớp của em. Các môn học diễn ra song song; em không bắt buộc phải hoàn thành hết môn này mới được khám phá môn khác.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {islands.map((isl: any) => {
                const isApproved = isl.configStatus === "ACTIVE_APPROVED";
                return (
                  <div
                    key={isl.islandId}
                    className={`p-5 rounded-3xl border-2 flex flex-col justify-between ${
                      isApproved
                        ? "bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-400 shadow-sm"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-4xl">{isl.icon}</span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            isApproved
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isApproved
                            ? `Đã kích hoạt (${isl.curriculumCode})`
                            : "Chưa cấu hình chương trình"}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-lg mt-3">
                        Đảo {isl.subjectName}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">{isl.statusMessage}</p>
                    </div>

                    {isApproved ? (
                      <div className="mt-4 pt-3 border-t border-teal-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-800">
                          Đã hoàn thành {isl.completedStagesCount}/{isl.totalCurriculumStages} chặng • 🪶 {isl.feathersEarned}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("ISLAND_MAP")}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
                        >
                          Vào đảo →
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
                        Đảo sẽ mở khi chương trình Khối {isl.grade} được phê duyệt.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HỘ CHIẾU HÀNH TRÌNH CÁ NHÂN */}
      {activeTab === "PASSPORT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Passport ID, Shields & Badges */}
          <div className="lg:col-span-5 bg-gradient-to-br from-amber-50 via-white to-teal-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-4 border-b border-amber-200 pb-4">
              <SkylineBirdCharacter
                mood="CELEBRATE"
                size="md"
                characterId={selectedCharacterId}
                reducedMotion={reducedMotion}
              />
              <div>
                <div className="text-xs font-mono font-bold text-amber-800">
                  MÃ HỘ CHIẾU: {passport?.passportCode}
                </div>
                <h3 className="text-xl font-black text-slate-900">{student.fullName}</h3>
                <div className="text-xs text-slate-600">
                  Lớp {student.className} • {getCharacterById(selectedCharacterId).emoji}{" "}
                  {getCharacterById(selectedCharacterId).name}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-amber-100/80 border-2 border-amber-400">
                <div className="text-xl font-black text-amber-700">
                  🛡️ {passport?.shieldsEarnedCount ?? passport?.flagsPlantedCount ?? 0}
                </div>
                <div className="text-[11px] font-black text-amber-900">Khiên 3D</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white border border-amber-200">
                <div className="text-xl font-black text-amber-600">
                  🪶 {passport?.totalFeathers || 0}
                </div>
                <div className="text-[11px] font-bold text-slate-600">Lông vũ</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white border border-emerald-200">
                <div className="text-xl font-black text-emerald-600">
                  🚩 {passport?.flagsPlantedCount || 0}
                </div>
                <div className="text-[11px] font-bold text-slate-600">Cờ cắm</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-white border border-teal-200">
                <div className="text-xl font-black text-teal-600">
                  🏅 {passport?.badges?.length || 0}
                </div>
                <div className="text-[11px] font-bold text-slate-600">Huy hiệu</div>
              </div>
            </div>

            {/* 3D Shields Collection Hall */}
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm mb-2.5 flex items-center justify-between">
                <span>🛡️ Phòng Trưng Bày Khiên Danh Dự 3D:</span>
                <span className="text-xs text-amber-800">
                  {passport?.shields?.length || 0}/{stages.length || 15} Khiên
                </span>
              </h4>
              {passport?.shields?.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-white/90 p-3.5 rounded-2xl border-2 border-amber-300">
                  {passport.shields.map((sh: any) => (
                    <Skyline3DShieldBadge
                      key={sh.shieldCode}
                      periodIndex={sh.periodIndex}
                      lessonName={sh.lessonName}
                      size="sm"
                      animated={!reducedMotion}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/80 border border-dashed border-amber-300 text-xs text-slate-600 text-center">
                  Mỗi khi em hoàn thành 1 chặng phiêu lưu trên đảo, em sẽ được trao tặng 1 chiếc <b>🛡️ Khiên Danh Dự 3D</b> lấp lánh tại đây!
                </div>
              )}
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 text-sm mb-2.5">
                🏅 Bộ sưu tập Huy hiệu Hành trình:
              </h4>
              {passport?.badges?.length > 0 ? (
                <div className="space-y-2">
                  {passport.badges.map((b: any) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-white border-2 border-amber-300 flex items-center gap-3 shadow-sm"
                    >
                      <span className="text-2xl">🏅</span>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{b.badgeName}</div>
                        <div className="text-xs text-slate-500">{b.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/80 border border-dashed border-slate-300 text-xs text-slate-500 text-center">
                  Hoàn thành trọn vẹn các chặng của mỗi vùng để nhận Huy hiệu Danh dự nhé!
                </div>
              )}
            </div>
          </div>

          {/* Student Works & Teacher Feedback */}
          <div className="lg:col-span-7 bg-white border-2 border-teal-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-lg">
              📔 Sản phẩm thực hành & Nhận xét của Thầy/Cô
            </h3>
            {passport?.studentWorks?.length > 0 ? (
              <div className="space-y-3">
                {passport.studentWorks.map((w: any) => (
                  <div
                    key={w.lessonCode}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold text-teal-900 text-sm">
                        🛡️ Chặng {w.periodIndex}: {w.lessonName} ({w.lessonCode})
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          w.teacherConfirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {w.teacherConfirmed ? "✅ GV đã xác nhận" : "🛡️🚩 Đã nhận Khiên & Lưu hành trình"}
                      </span>
                    </div>
                    {w.studentReflection && (
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                        <b>✍️ Chia sẻ / Kế hoạch của em:</b> {w.studentReflection}
                      </div>
                    )}
                    {w.teacherFeedback && (
                      <div className="text-xs text-teal-900 bg-teal-50 p-3 rounded-xl border border-teal-200">
                        <b>👩‍🏫 Nhận xét của Giáo viên:</b> {w.teacherFeedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-sm text-slate-500">
                Khi em hoàn thành các chặng phiêu lưu và viết chia sẻ thực hành, sản phẩm và lời khen của Thầy/Cô sẽ xuất hiện tại đây!
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MỞ ĐẦU GAME: CHỌN NHÂN VẬT 3D & KHẢO SÁT YÊU THÍCH MÔN HỌC */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-4 border-sky-400 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-auto">
            <button
              type="button"
              onClick={() => setShowWelcomeModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-slate-200">
              <div className="relative shrink-0">
                <img
                  src="/images/skyline-bird-mascot.jpg"
                  alt={getCharacterById(selectedCharacterId).name}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-sky-400 shadow-xl bg-white"
                />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-600 text-white font-black text-[10px] shadow whitespace-nowrap">
                  {getCharacterById(selectedCharacterId).emoji} {getCharacterById(selectedCharacterId).name}
                </span>
              </div>

              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs mb-2">
                  <span>🌟 MỞ ĐẦU GAME HÀNH TRÌNH SKY-LINE</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  Chào mừng {student.fullName}! Hãy chọn 1 Nhân vật đồng hành 3D để bắt đầu!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Mỗi khi vượt qua 1 chặng mô phỏng 3D trên đảo, em sẽ được trao tặng <b>🛡️ 1 Khiên Danh Dự 3D</b> và <b>🪶 Lông vũ</b> vào Hộ chiếu!
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!muted && !getSkylineBgmState().isPlaying) {
                        startSkylineBgm(getDefaultThemeForGrade(Number(student.grade) || 2));
                      }
                      playSkylineSfx("WELCOME", muted);
                      speakVietnameseText(
                        `Chào mừng ${student.fullName} đến với Game Hành trình Sky-Line! Em hãy chọn một nhân vật đồng hành và cho biết cảm nhận về môn học nhé!`,
                        muted
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200 cursor-pointer"
                  >
                    <span>🔊 Nghe chim Sky-Line chào mừng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (muted) toggleMute();
                      startSkylineBgm(getDefaultThemeForGrade(Number(student.grade) || 2));
                      playSkylineSfx("WELCOME", false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-xs border border-amber-300 cursor-pointer"
                  >
                    <span>🎵 Bật nhạc Khối {student.grade} sôi động</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Step 1: Choose 1 Character to Start Journey */}
              <div>
                <label className="block font-black text-slate-900 text-sm sm:text-base mb-2.5">
                  1. Chọn 1 Nhân vật đồng hành 3D của em trong suốt hành trình:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {SKYLINE_CHARACTERS.map((char) => {
                    const active = selectedCharacterId === char.id;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => handleSelectCharacter(char.id)}
                        className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center justify-between cursor-pointer ${
                          active
                            ? `bg-gradient-to-b ${char.auraGradient} text-white border-amber-300 ring-3 ring-amber-300 shadow-lg scale-[1.03]`
                            : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src="/images/skyline-bird-mascot.jpg"
                            alt={char.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow bg-white"
                          />
                          <span className="absolute -bottom-1 -right-1 text-sm bg-amber-300 rounded-full w-5 h-5 flex items-center justify-center shadow">
                            {char.emoji}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="font-black text-xs leading-tight">{char.name}</div>
                          <div
                            className={`text-[10px] font-bold mt-0.5 ${
                              active ? "text-amber-100" : "text-teal-700"
                            }`}
                          >
                            {char.roleTitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Subject Interest Survey */}
              <div>
                <label className="block font-black text-slate-900 text-sm sm:text-base mb-2">
                  2. Khảo sát: Bạn có yêu thích hoạt động và môn học này không?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INTEREST_OPTIONS.map((opt) => {
                    const active = surveyInterestId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          playSkylineSfx("CLICK", muted);
                          setSurveyInterestId(opt.id);
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                          active
                            ? `${opt.colorCls} ring-3 ring-sky-400 shadow-md`
                            : "bg-slate-50 hover:bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <span className="text-2xl shrink-0">{opt.emoji}</span>
                        <div>
                          <div className="font-extrabold text-sm">{opt.label}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-900 text-xs sm:text-sm mb-2">
                  3. Bạn hào hứng với hoạt động 3D nào nhất trên đảo? (Có thể chọn nhiều)
                </label>
                <div className="flex flex-wrap gap-2">
                  {FAVORITE_ACTIVITIES.map((act) => {
                    const selected = surveyActivities.includes(act);
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => toggleFavoriteActivity(act)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          selected
                            ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        {selected ? "✓ " : "+ "}
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-black text-slate-900 text-xs sm:text-sm mb-1.5">
                  4. Lời nhắn của bạn gửi chú chim Sky-Line (không bắt buộc):
                </label>
                <input
                  type="text"
                  value={surveyNote}
                  onChange={(e) => setSurveyNote(e.target.value)}
                  placeholder="Ví dụ: Em rất thích chơi đóng vai cửa hàng 3D và sưu tầm Khiên Danh Dự..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-xs sm:text-sm"
                />
              </div>

              {surveyFeedbackMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs sm:text-sm text-center">
                  {surveyFeedbackMsg}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWelcomeModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Để sau
                </button>
                <button
                  type="button"
                  disabled={submittingSurvey}
                  onClick={() => handleSubmitWelcomeSurvey(false)}
                  className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs sm:text-sm shadow cursor-pointer disabled:opacity-50"
                >
                  {submittingSurvey ? "Đang lưu..." : "💾 Lưu Nhân Vật & Khảo sát (+1 🪶)"}
                </button>
                <button
                  type="button"
                  disabled={submittingSurvey}
                  onClick={() => handleSubmitWelcomeSurvey(true)}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg cursor-pointer disabled:opacity-50"
                >
                  🚀 Chọn Nhân Vật & Vào ngay Chặng 1 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Interactive Player Modal */}
      {activeStage && (
        <StageGamePlayer
          stage={activeStage}
          allStages={stages}
          studentName={student.fullName}
          grade={student.grade}
          characterId={selectedCharacterId}
          muted={muted}
          reducedMotion={reducedMotion}
          onClose={() => setActiveStage(null)}
          onNavigateToStage={(nextSt) => {
            setBirdTargetPeriod(nextSt.periodIndex);
            setActiveStage(nextSt);
          }}
          onStageUpdated={(newOverview) => {
            setOverview(newOverview);
            const updatedStage = newOverview.stages?.find(
              (s: StudentStageView) => s.lessonCode === activeStage.lessonCode
            );
            if (updatedStage) {
              setActiveStage(updatedStage);
            }
          }}
        />
      )}
    </div>
  );
}
