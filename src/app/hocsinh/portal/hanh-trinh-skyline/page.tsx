"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  GraduationCap,
  Award,
  LayoutDashboard,
  ArrowRight,
  BookOpen,
  Info
} from "lucide-react";
import { StudentStageView } from "@/lib/skyline-journey/service";
import {
  SkylineBirdCharacter,
  SkylineCartoonAvatar,
  SkylineMusicController,
  Skyline3DShieldBadge,
  StageGameIllustrationBanner,
  SKYLINE_CHARACTERS,
  getCharacterById,
  getStageCartoonBuddy,
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

  const [activeTab, setActiveTab] = useState<"ISLAND_MAP" | "LEADERBOARD" | "WORLD_ISLANDS" | "PASSPORT">("ISLAND_MAP");
  const [rankingScope, setRankingScope] = useState<"CLASS" | "GRADE">("CLASS");
  const [showAllLeaderboardRows, setShowAllLeaderboardRows] = useState<boolean>(false);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>("ALL");
  const [selectedGradeOverride, setSelectedGradeOverride] = useState<string>("");
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

  // Automatically start joyful adventure BGM on first user interaction for elementary students
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (overview && overview.isElementary === false) {
      stopSkylineBgm();
      return;
    }
    const handleFirstInteraction = () => {
      if (overview && overview.isElementary === false) return;
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
  }, [overview?.isElementary]);

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

  const fetchOverview = useCallback(async (gradeOverrideArg?: string) => {
    setLoading(true);
    setError(null);
    try {
      const targetGrade = gradeOverrideArg !== undefined ? gradeOverrideArg : selectedGradeOverride;
      const url = targetGrade
        ? `/api/skyline-journey/student?grade=${encodeURIComponent(targetGrade)}`
        : "/api/skyline-journey/student";
      const res = await fetch(url, { cache: "no-store" });
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
  }, [hasAutoOpenedWelcome, selectedGradeOverride]);

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
    leaderboard,
    progressMetrics,
    passport
  } = overview;

  const isElementary = overview?.isElementary ?? ["1", "2", "3", "4", "5"].includes(String(student?.grade || ""));

  if (!isElementary) {
    const studentGradeNum = Number(student?.grade || 10);
    return (
      <div className="space-y-5 pb-12 max-w-5xl mx-auto">
        {/* Masthead Banner - Sky-Line Academic Ledger */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 text-xs font-semibold border border-teal-300/30 mb-2">
                <span>Cổng học sinh Sky-Line</span>
                <span>•</span>
                <span>{studentGradeNum >= 10 ? "Cấp THPT" : "Cấp THCS"}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Cổng Học Tập Môn Đặc Thù & Định Hướng Năng Lực
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
                Học sinh: <strong className="text-white">{student.fullName}</strong> ({student.code}) • Lớp: <strong className="text-white tabular-nums">{student.className}</strong> (Khối <span className="tabular-nums">{student.grade}</span>) • {student.campusName}
              </p>
            </div>
            <Link
              href="/hocsinh/portal"
              className="self-start md:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/20 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Về Trang Tổng quan</span>
            </Link>
          </div>
        </div>

        {/* Informative Guidance Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-[#003B3A] shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <h2 className="text-base font-bold text-[#003B3A]">
                Phạm vi áp dụng phân hệ Đảo Học Tập Gamified (Hành trình Sky-Line)
              </h2>
              <p>
                Phân hệ <strong>Đảo Học Tập Gamified (Hành trình Sky-Line)</strong> với các hoạt động trải nghiệm tương tác thu thập lông vũ hiện tại được thiết kế chuyên biệt dành cho học sinh <strong>Cấp Tiểu học (Khối 1 – Khối 5)</strong> theo chuẩn chương trình môn Giáo dục Tài chính cá nhân.
              </p>
              <p>
                Đối với học sinh <strong>Khối {student.grade} ({studentGradeNum >= 10 ? "Cấp THPT" : "Cấp THCS"})</strong>, các bộ môn đặc thù bao gồm:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 text-xs">Giáo dục Hướng nghiệp (GDHN)</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Khám phá sở thích nghề nghiệp RIASEC, lập kế hoạch học tập và chuẩn bị lộ trình đại học/nghề.</div>
                </div>
                {studentGradeNum <= 9 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Giáo dục Cảm xúc - Xã hội (CXXH)</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Rèn luyện nhận thức bản thân, quản lý cảm xúc và kỹ năng xây dựng mối quan hệ.</div>
                  </div>
                )}
                {studentGradeNum <= 9 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Giáo dục Giới tính & SKSS (GDGT)</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">Hiểu biết cơ thể, bảo vệ sức khỏe và xây dựng lối sống lành mạnh, tôn trọng.</div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Các chuyên đề trên được Thầy/Cô bộ môn giảng dạy trực tiếp trên lớp và kết quả đánh giá năng lực được ghi nhận chính thức vào Sổ Đánh Giá Học Sinh cùng Báo Cáo Học Tập của Nhà trường.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links for Secondary / High School */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#003B3A]" />
            <span>Phân hệ học tập & định hướng phù hợp dành cho em</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Link
              href="/hocsinh/portal/muc-tieu"
              className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-xs transition flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-[#003B3A] flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-700">
                  Sổ Mục tiêu SMART
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Thiết lập và theo dõi mục tiêu học tập, rèn luyện theo phương pháp SMART cho từng học kỳ.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>Vào Sổ Mục tiêu</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link
              href="/hocsinh/portal/khao-sat-holland"
              className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-xs transition flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-700">
                  Khảo sát Hướng nghiệp
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Trắc nghiệm Holland Code (RIASEC) xác định nhóm năng khiếu và định hướng ngành nghề.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>Làm khảo sát</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link
              href="/hocsinh/portal/reflection"
              className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-xs transition flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-700">
                  Hành trình trưởng thành
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Đánh giá tiến bộ, ghi nhận các thành quả tự hào và phản hồi xây dựng trường học hạnh phúc.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>Mở Hành trình</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link
              href="/hocsinh/portal"
              className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-xs transition flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-700">
                  Trang Tổng quan
                </h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  Xem toàn bộ điểm số, thông báo nhà trường, lịch khảo sát và các hoạt động trải nghiệm.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
                <span>Về Tổng quan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const classLeaderboard: any[] = leaderboard?.classLeaderboard || [];
  const gradeLeaderboard: any[] = leaderboard?.gradeLeaderboard || [];
  const activeLeaderboard: any[] =
    rankingScope === "CLASS" ? classLeaderboard : gradeLeaderboard;
  const topThreePodium = activeLeaderboard.slice(0, 3);

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
            <button
              type="button"
              onClick={() => {
                playSkylineSfx("CLICK", muted);
                setActiveTab("LEADERBOARD");
              }}
              className="bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 px-3.5 py-2 rounded-2xl border-2 border-white text-center shadow-lg hover:scale-105 transition cursor-pointer"
              title="Xem Top danh sách học sinh xếp hạng học tập"
            >
              <div className="text-[10px] font-black uppercase text-slate-900">Xếp hạng Lớp</div>
              <div className="text-lg font-black text-slate-950">
                🏆 #{leaderboard?.myClassRank || 1}/{leaderboard?.totalClassStudents || 1}
              </div>
            </button>
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
              className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition cursor-pointer ${
                activeTab === "ISLAND_MAP"
                  ? "bg-amber-400 text-slate-950 shadow-md"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              🗺️ Bản đồ Chủ đề & {stages.length || 15} Chặng
            </button>
            <button
              type="button"
              onClick={() => {
                playSkylineSfx("CLICK", muted);
                setActiveTab("LEADERBOARD");
              }}
              className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "LEADERBOARD"
                  ? "bg-amber-400 text-slate-950 shadow-md ring-2 ring-white"
                  : "bg-amber-400/25 text-amber-200 border border-amber-300/60 hover:bg-amber-400/40"
              }`}
            >
              <span>🏆 Top Xếp Hạng Học Tập</span>
              <span className="px-2 py-0.5 rounded-full bg-white/90 text-slate-950 text-[10px] font-black">
                Hạng #{leaderboard?.myClassRank || 1}
              </span>
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

      {/* MỞ ĐẦU GAME: BIỆT ĐỘI NHÂN VẬT HOẠT HÌNH THIẾU NHI & KHẢO SÁT YÊU THÍCH MÔN HỌC */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-amber-50 border-2 border-sky-300 rounded-3xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative shrink-0">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-sky-400 shadow-lg bg-white p-0.5 ${
                  !reducedMotion ? "hover:scale-105 transition-transform" : ""
                }`}
              >
                <SkylineCartoonAvatar
                  characterId={selectedCharacterId}
                  mood="CELEBRATE"
                  reducedMotion={reducedMotion}
                  className="w-full h-full"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow border border-white">
                {getCharacterById(selectedCharacterId).emoji} BẠN NHỎ
              </span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold text-xs mb-1">
                <span>🎨 BIỆT ĐỘI HOẠT HÌNH GIÁO DỤC TÀI CHÍNH NHÍ SKY-LINE</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Chào mừng {student.fullName}! Cùng <span className="text-teal-700">{getCharacterById(selectedCharacterId).name}</span> vui học và săn Khiên Danh Dự nhé!
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Bạn hoạt hình đồng hành:{" "}
                <b className="text-teal-800">
                  {getCharacterById(selectedCharacterId).emoji} {getCharacterById(selectedCharacterId).name} ({getCharacterById(selectedCharacterId).roleTitle})
                </b>
                {" "}• Bài học trọng tâm: <b className="text-amber-800">{getCharacterById(selectedCharacterId).educationalLesson}</b>
              </p>
              <div className="mt-2 inline-flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-300 rounded-2xl px-3 py-1.5 text-xs">
                <span className="font-extrabold text-amber-900">
                  🎶 Vè hoạt hình: &ldquo;{getCharacterById(selectedCharacterId).cartoonRhyme}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ch = getCharacterById(selectedCharacterId);
                    speakVietnameseText(
                      `${ch.name} chào em! ${ch.cartoonRhyme} ${ch.description}`,
                      muted
                    );
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                >
                  🔊 Nghe bạn hoạt hình kể chuyện
                </button>
              </div>
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
              {welcomeSurvey ? "🎭 Đổi Bạn Hoạt Hình & Khảo sát" : "✨ Chọn Bạn Hoạt Hình (+1 🪶)"}
            </button>
          </div>
        </div>

        {/* 5-Character Cartoon Selection Bar right on the Map */}
        <div className="pt-3 border-t border-sky-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-black text-teal-950 uppercase tracking-wider">
              🐣🐷🐰🐻🐿️ CHỌN 1 NGƯỜI BẠN HOẠT HÌNH ĐÁNG YÊU CÙNG EM VƯỢT THỬ THÁCH:
            </span>
            <span className="text-[11px] font-bold text-amber-800">
              🛡️ Hoàn thành mỗi bài học sẽ được tặng +1 Khiên Danh Dự!
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
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                    isChosen
                      ? `bg-gradient-to-r ${char.auraGradient} text-white border-teal-700 shadow-md`
                      : "bg-white hover:bg-sky-50/80 text-slate-800 border-slate-200 hover:border-teal-400"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow bg-white p-0.5">
                      <SkylineCartoonAvatar
                        characterId={char.id}
                        reducedMotion={reducedMotion}
                        className="w-full h-full"
                      />
                    </div>
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
                      {isChosen ? "✅ Đang đồng hành cùng em" : char.cartoonRhyme}
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
                    🗺️ Tất cả {zones.length} Vùng ({stages.length} Chặng)
                  </div>
                  <div className="text-xs mt-1 opacity-85">
                    Xem toàn cảnh hành trình từ Chặng 1 đến Chặng {stages.length}
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

              {/* Interactive Scenic Island Map (Directly below Zone Filters for seamless navigation) */}
              <div className="bg-gradient-to-b from-sky-100/90 via-teal-50 to-emerald-100/90 border-4 border-teal-300 rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="font-black text-teal-950 text-lg sm:text-xl flex items-center gap-2">
                      <span>
                        🏝️ Bản Đồ Đảo Học Tập Khối {student.grade} (Mã chương trình: {activeIsland?.curriculumCode || "TC02S"})
                      </span>
                    </h3>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Chạm vào một chặng trên bản đồ để <b>{getCharacterById(selectedCharacterId).name}</b> bay tới thực hành nhiệm vụ và nhận <b>🛡️ Khiên Danh Dự</b>!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white">
                      🛡️🚩 Hoàn thành
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white">⏳ Chờ xác nhận</span>
                    <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white">✍️ Cần bổ sung</span>
                    <span className="px-2.5 py-1 rounded-full bg-sky-600 text-white">✨ Sẵn sàng</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-300 text-slate-700">🔒 Chưa mở</span>
                  </div>
                </div>

                {/* Zones & Stage Nodes */}
                <div className="space-y-6">
                  {zones
                    .filter((z: any) => selectedZoneCode === "ALL" || z.topicCode === selectedZoneCode)
                    .map((zone: any, zoneIdx: number) => {
                      const zoneStages: StudentStageView[] = filteredStages.filter(
                        (s) => s.topicCode === zone.topicCode
                      );
                      return (
                        <div
                          key={zone.topicCode}
                          className="bg-white/85 backdrop-blur border-2 border-teal-200 rounded-3xl p-4 sm:p-5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-teal-100">
                            <div>
                              <span className="text-xs font-extrabold uppercase text-teal-700">
                                {String(zone.creativeZoneName || "").toLowerCase().startsWith("vùng")
                                  ? zone.creativeZoneName
                                  : `Vùng ${zoneIdx + 1}: ${zone.creativeZoneName}`}
                              </span>
                              <h4 className="font-black text-slate-900 text-base sm:text-lg">
                                {zone.officialTopicName} ({zone.topicCode})
                              </h4>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              🏅 Huy hiệu vùng: {zone.badgeName}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                            {zoneStages.map((st) => {
                              const badge = statusBadge(st.status);
                              const isBirdHere = birdTargetPeriod === st.periodIndex;
                              const isLocked = st.status === "LOCKED";
                              const hasShield = st.flagPlanted || st.autoChallengePassed;

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
                                  className={`group relative rounded-2xl p-3 border-2 transition-all flex flex-col justify-between ${
                                    isLocked
                                      ? "bg-slate-100/85 border-slate-300 opacity-80 cursor-not-allowed"
                                      : isBirdHere
                                      ? "bg-gradient-to-br from-amber-50 to-white border-amber-400 ring-3 ring-amber-300 shadow-lg cursor-pointer mt-2"
                                      : hasShield
                                      ? "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-400 hover:border-emerald-500 hover:shadow-md cursor-pointer"
                                      : "bg-white border-teal-300 hover:border-teal-500 hover:shadow-md cursor-pointer"
                                  }`}
                                >
                                  {/* Chosen Companion Perched on Current Stage */}
                                  {isBirdHere && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playSkylineSfx("CLICK", muted);
                                        setShowWelcomeModal(true);
                                      }}
                                      title="Nhấn để đổi Nhân vật đồng hành hoặc xem Khảo sát đầu game"
                                      className="absolute -top-5 right-2 z-20 flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-md border-2 border-white hover:scale-105 transition"
                                    >
                                      <img
                                        src="/images/skyline-bird-mascot.jpg"
                                        alt={getCharacterById(selectedCharacterId).name}
                                        className="w-6 h-6 rounded-full object-cover border border-white bg-white shadow-xs"
                                      />
                                      <span className="text-[10px] font-black text-slate-950">
                                        {getCharacterById(selectedCharacterId).emoji} Đang ở đây
                                      </span>
                                    </div>
                                  )}

                                  <div>
                                    {/* Top header row: Chặng X + Status Pill */}
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                      <span className="text-xs font-black text-teal-900">
                                        Chặng {st.periodIndex}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}
                                      >
                                        {badge.icon} {badge.label}
                                      </span>
                                    </div>

                                    {/* Gamified Stage Illustration Banner */}
                                    <div className="mb-2.5">
                                      <StageGameIllustrationBanner
                                        periodIndex={st.periodIndex}
                                        isLocked={isLocked}
                                        isCompleted={hasShield}
                                        isCurrent={isBirdHere}
                                      />
                                    </div>

                                    <h5 className="font-extrabold text-slate-900 text-sm leading-snug">
                                      {st.lessonName}
                                    </h5>
                                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                      Mã bài: {st.lessonCode}
                                    </div>
                                    <div className="text-[11px] text-teal-800 font-semibold mt-1">
                                      📍 {st.interactive.worldLocationName}
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="font-bold text-amber-700">
                                      +1 🛡️ • +{st.feathersReward} 🪶
                                    </span>
                                    <span className="font-extrabold text-teal-700 group-hover:translate-x-0.5 transition-transform">
                                      {isLocked ? "Chưa mở 🔒" : "Vào chặng →"}
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

              {/* 🌟 BẢNG VÀNG THI ĐUA HỌC TẬP SKY-LINE (Bố cục 2 cột cân đối bên dưới Bản đồ) */}
              {activeLeaderboard.length > 0 && (
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
                  {/* Header Strip */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-l-4 border-[#003B3A] pl-4 py-1">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                          🌟 Bảng vàng thi đua học tập Sky-Line
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs tabular-nums">
                          🏫 Hạng Lớp: #{leaderboard?.myClassRank || 1}/{leaderboard?.totalClassStudents || classLeaderboard.length}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs tabular-nums">
                          🌟 Hạng Khối: #{leaderboard?.myGradeRank || 1}/{leaderboard?.totalGradeStudents || gradeLeaderboard.length}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
                        🏆 Top danh sách học sinh xếp hạng học tập ({rankingScope === "CLASS" ? `Lớp ${student.className}` : `Toàn Khối ${student.grade}`})
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Xếp hạng tính theo: <strong>Điểm bài học các chặng</strong> + <strong>Thưởng tốc độ hoàn thành (⏱️)</strong> + 🛡️ Khiên (+100đ) + 🌟 Sao GV xác nhận (+50đ) + 🪶 Lông vũ (+15đ). Cùng điểm ưu tiên thời gian hoàn thành nhanh hơn.
                      </p>
                    </div>

                    {/* Segmented Control: Class vs Grade */}
                    <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 self-start lg:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          playSkylineSfx("CLICK", muted);
                          setRankingScope("CLASS");
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer tabular-nums ${
                          rankingScope === "CLASS"
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        🏫 Lớp {student.className} ({classLeaderboard.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSkylineSfx("CLICK", muted);
                          setRankingScope("GRADE");
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer tabular-nums ${
                          rankingScope === "GRADE"
                            ? "bg-[#003B3A] text-white shadow-xs"
                            : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        🌟 Toàn Khối {student.grade} ({leaderboard?.totalGradeStudents || gradeLeaderboard.length})
                      </button>
                    </div>
                  </div>

                  {/* Main 2-Column Balanced Grid: Left = Podium Top 3, Right = Ranked Ledger Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column (4 cols): Top 3 Podium Cards */}
                    <div className="lg:col-span-4 space-y-2.5">
                      <div className="text-xs font-extrabold text-slate-700 flex items-center justify-between px-1">
                        <span>🥇 Bục vinh danh dẫn đầu</span>
                        <span className="text-[11px] text-teal-700 font-bold">Top 3 xuất sắc</span>
                      </div>

                      {topThreePodium.map((entry: any) => {
                        const charProfile = getCharacterById(entry.characterId);
                        const isRank1 = entry.rank === 1;
                        const isRank2 = entry.rank === 2;
                        const medalEmoji = isRank1 ? "👑" : isRank2 ? "🥈" : "🥉";
                        const cardStyle = isRank1
                          ? "bg-gradient-to-r from-amber-50 via-yellow-50/70 to-white border-amber-300"
                          : isRank2
                          ? "bg-slate-50/80 border-slate-200"
                          : "bg-orange-50/50 border-orange-200";

                        return (
                          <div
                            key={entry.studentId}
                            className={`rounded-2xl p-3.5 border-2 transition ${cardStyle} ${
                              entry.isCurrentUser ? "ring-2 ring-teal-500" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src="/images/skyline-bird-mascot.jpg"
                                  alt={entry.fullName}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs bg-white"
                                />
                                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-300 border border-white flex items-center justify-center text-[11px] shadow-xs">
                                  {charProfile.emoji}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                                      isRank1
                                        ? "bg-amber-400 text-slate-950"
                                        : isRank2
                                        ? "bg-slate-700 text-white"
                                        : "bg-orange-500 text-white"
                                    }`}
                                  >
                                    {medalEmoji} Hạng #{entry.rank}
                                  </span>
                                  <span className="text-xs font-black text-teal-900 tabular-nums">
                                    {entry.rankingScore} đ
                                  </span>
                                </div>

                                <div className="font-black text-slate-900 text-sm truncate mt-1 flex items-center gap-1.5">
                                  <span className="truncate">{entry.fullName}</span>
                                  {entry.isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded bg-teal-600 text-white text-[9px] font-black shrink-0">
                                      Em
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center justify-between mt-1 tabular-nums">
                                  <span>Lớp {entry.className} • ⏱️ {entry.completionTimeFormatted || "—"}</span>
                                  <span className="font-bold text-amber-800">
                                    🛡️ {entry.shieldsEarnedCount} • 🎯 {entry.totalStageScore || 0}đ ({entry.avgScorePercent}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Column (8 cols): Academic Ledger Ranking Table */}
                    <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-extrabold text-slate-800">
                          📋 Danh sách xếp hạng chi tiết ({activeLeaderboard.length} học sinh)
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("LEADERBOARD")}
                          className="text-teal-700 hover:text-teal-900 font-extrabold cursor-pointer"
                        >
                          Mở toàn màn hình bảng xếp hạng →
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs tabular-nums">
                          <thead>
                            <tr className="bg-[#003B3A] text-white text-[11px] font-bold">
                              <th className="py-2.5 px-3 text-center w-14">Hạng</th>
                              <th className="py-2.5 px-3">Học sinh & Nhân vật</th>
                              <th className="py-2.5 px-3">Lớp</th>
                              <th className="py-2.5 px-3 text-center">Khiên</th>
                              <th className="py-2.5 px-3 text-center">Điểm bài học</th>
                              <th className="py-2.5 px-3 text-center">Thời gian hoàn thành</th>
                              <th className="py-2.5 px-3 text-right">Tổng điểm</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(showAllLeaderboardRows
                              ? activeLeaderboard
                              : activeLeaderboard.slice(0, 6)
                            ).map((item: any) => {
                              const charObj = getCharacterById(item.characterId);
                              const rankBadge =
                                item.rank === 1
                                  ? "👑 #1"
                                  : item.rank === 2
                                  ? "🥈 #2"
                                  : item.rank === 3
                                  ? "🥉 #3"
                                  : `#${item.rank}`;
                              return (
                                <tr
                                  key={item.studentId}
                                  className={`transition ${
                                    item.isCurrentUser
                                      ? "bg-amber-50/90 font-bold"
                                      : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-lg font-black text-xs ${
                                        item.rank === 1
                                          ? "bg-amber-400 text-slate-950"
                                          : item.rank === 2
                                          ? "bg-slate-700 text-white"
                                          : item.rank === 3
                                          ? "bg-orange-500 text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {rankBadge}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sm shrink-0">
                                        {charObj.emoji}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                          <span className="truncate">{item.fullName}</span>
                                          {item.isCurrentUser && (
                                            <span className="px-2 py-0.2 rounded-full bg-teal-700 text-white text-[10px] font-black shrink-0">
                                              Vị trí của em
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate">
                                          {item.honorTitle} • 🪶 {item.totalFeathers}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-teal-900">
                                    {item.className}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-black text-amber-700">
                                    🛡️ {item.shieldsEarnedCount}/{stages.length || 15}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="font-black text-emerald-700">
                                      {item.totalStageScore || 0} đ
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-semibold">
                                      TB: {item.avgScorePercent}%
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-bold text-[11px]">
                                      ⏱️ {item.completionTimeFormatted || "—"}
                                    </div>
                                    {item.speedBonusPoints > 0 && (
                                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                                        +{item.speedBonusPoints}đ tốc độ
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                    {item.rankingScore} đ
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {activeLeaderboard.length > 6 && (
                        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs tabular-nums">
                          <span className="text-slate-600 font-semibold">
                            Hiển thị {showAllLeaderboardRows ? activeLeaderboard.length : Math.min(6, activeLeaderboard.length)} / {activeLeaderboard.length} học sinh
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllLeaderboardRows((v) => !v)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-teal-800 text-white font-bold text-xs cursor-pointer"
                          >
                            {showAllLeaderboardRows
                              ? "Thu gọn danh sách ▲"
                              : `Xem tất cả ${activeLeaderboard.length} học sinh ▼`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB LEADERBOARD: BẢNG VÀNG THI ĐUA & TOP DANH SÁCH HỌC SINH XẾP HẠNG HỌC TẬP */}
      {activeTab === "LEADERBOARD" && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-l-4 border-[#003B3A] pl-4 py-1">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                  🌟 Bảng vàng thi đua học tập Sky-Line
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs tabular-nums">
                  🏫 Hạng Lớp: #{leaderboard?.myClassRank || 1}/{leaderboard?.totalClassStudents || classLeaderboard.length}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs tabular-nums">
                  🌟 Hạng Khối: #{leaderboard?.myGradeRank || 1}/{leaderboard?.totalGradeStudents || gradeLeaderboard.length}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
                🏆 Top danh sách học sinh xếp hạng học tập ({rankingScope === "CLASS" ? `Lớp ${student.className}` : `Toàn Khối ${student.grade}`})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Điểm xếp hạng tính theo: <strong>Điểm bài học các chặng</strong> + <strong>Thưởng tốc độ hoàn thành (⏱️)</strong> + 🛡️ Khiên Danh Dự (+100đ) + 🌟 Sao GV xác nhận (+50đ) + 🪶 Lông vũ (+15đ). Cùng điểm ưu tiên thời gian hoàn thành nhanh hơn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRankingScope("CLASS")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer tabular-nums ${
                    rankingScope === "CLASS"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  🏫 Lớp {student.className} ({classLeaderboard.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRankingScope("GRADE")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer tabular-nums ${
                    rankingScope === "GRADE"
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  🌟 Toàn Khối {student.grade} ({leaderboard?.totalGradeStudents || gradeLeaderboard.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("ISLAND_MAP")}
                className="px-3.5 py-2.5 rounded-2xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                🗺️ Về Bản đồ Đảo Học Tập
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Top 3 Podium */}
            <div className="lg:col-span-4 space-y-2.5">
              <div className="text-xs font-extrabold text-slate-700 flex items-center justify-between px-1">
                <span>🥇 Bục vinh danh dẫn đầu</span>
                <span className="text-[11px] text-teal-700 font-bold">Top 3 xuất sắc</span>
              </div>
              {topThreePodium.map((entry: any) => {
                const charProfile = getCharacterById(entry.characterId);
                const isRank1 = entry.rank === 1;
                const isRank2 = entry.rank === 2;
                const medalEmoji = isRank1 ? "👑" : isRank2 ? "🥈" : "🥉";
                const cardStyle = isRank1
                  ? "bg-gradient-to-r from-amber-50 via-yellow-50/70 to-white border-amber-300"
                  : isRank2
                  ? "bg-slate-50/80 border-slate-200"
                  : "bg-orange-50/50 border-orange-200";

                return (
                  <div
                    key={entry.studentId}
                    className={`rounded-2xl p-3.5 border-2 transition ${cardStyle} ${
                      entry.isCurrentUser ? "ring-2 ring-teal-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src="/images/skyline-bird-mascot.jpg"
                          alt={entry.fullName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs bg-white"
                        />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-300 border border-white flex items-center justify-center text-[11px] shadow-xs">
                          {charProfile.emoji}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                              isRank1
                                ? "bg-amber-400 text-slate-950"
                                : isRank2
                                ? "bg-slate-700 text-white"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            {medalEmoji} Hạng #{entry.rank}
                          </span>
                          <span className="text-xs font-black text-teal-900 tabular-nums">
                            {entry.rankingScore} đ
                          </span>
                        </div>

                        <div className="font-black text-slate-900 text-sm truncate mt-1 flex items-center gap-1.5">
                          <span className="truncate">{entry.fullName}</span>
                          {entry.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-600 text-white text-[9px] font-black shrink-0">
                              Em
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center justify-between mt-1 tabular-nums">
                          <span>Lớp {entry.className} • ⏱️ {entry.completionTimeFormatted || "—"}</span>
                          <span className="font-bold text-amber-800">
                            🛡️ {entry.shieldsEarnedCount} • 🎯 {entry.totalStageScore || 0}đ ({entry.avgScorePercent}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Full Ranking Table */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#003B3A] text-white text-[11px] font-bold">
                      <th className="py-2.5 px-3 text-center w-14">Hạng</th>
                      <th className="py-2.5 px-3">Học sinh & Nhân vật đồng hành</th>
                      <th className="py-2.5 px-3">Lớp</th>
                      <th className="py-2.5 px-3 text-center">Khiên Danh Dự</th>
                      <th className="py-2.5 px-3 text-center">Điểm bài học</th>
                      <th className="py-2.5 px-3 text-center">Thời gian hoàn thành</th>
                      <th className="py-2.5 px-3 text-center">Lông vũ & Huy hiệu</th>
                      <th className="py-2.5 px-3 text-right">Tổng điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeLeaderboard.map((item: any) => {
                      const charObj = getCharacterById(item.characterId);
                      const rankBadge =
                        item.rank === 1
                          ? "👑 #1"
                          : item.rank === 2
                          ? "🥈 #2"
                          : item.rank === 3
                          ? "🥉 #3"
                          : `#${item.rank}`;
                      return (
                        <tr
                          key={item.studentId}
                          className={`transition ${
                            item.isCurrentUser ? "bg-amber-50/90 font-bold" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-black text-xs ${
                                item.rank === 1
                                  ? "bg-amber-400 text-slate-950"
                                  : item.rank === 2
                                  ? "bg-slate-700 text-white"
                                  : item.rank === 3
                                  ? "bg-orange-500 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {rankBadge}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sm shrink-0">
                                {charObj.emoji}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{item.fullName}</span>
                                  {item.isCurrentUser && (
                                    <span className="px-2 py-0.2 rounded-full bg-teal-700 text-white text-[10px] font-black">
                                      Vị trí của em
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {item.honorTitle} • Mã HS: {item.studentCode}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-teal-900">{item.className}</td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-700">
                            🛡️ {item.shieldsEarnedCount}/{stages.length || 15}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="font-black text-emerald-700">
                              {item.totalStageScore || 0} đ
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              TB: {item.avgScorePercent}%
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-bold text-[11px]">
                              ⏱️ {item.completionTimeFormatted || "—"}
                            </div>
                            {item.speedBonusPoints > 0 && (
                              <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                                +{item.speedBonusPoints}đ tốc độ
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-sky-700">🪶 {item.totalFeathers}</span>
                            <span className="mx-1 text-slate-300">•</span>
                            <span className="font-bold text-emerald-700">🏅 {item.badgeCount}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {item.rankingScore} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
                <div className="text-[11px] font-black text-amber-900">Khiên</div>
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

            {/* Shields Collection Hall */}
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm mb-2.5 flex items-center justify-between">
                <span>🛡️ Phòng Trưng Bày Khiên Danh Dự:</span>
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
                  Mỗi khi em hoàn thành 1 chặng phiêu lưu trên đảo, em sẽ được trao tặng 1 chiếc <b>🛡️ Khiên Danh Dự</b> lấp lánh tại đây!
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

      {/* MODAL MỞ ĐẦU GAME: CHỌN NHÂN VẬT ĐỒNG HÀNH & KHẢO SÁT YÊU THÍCH MÔN HỌC */}
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
                  Chào mừng {student.fullName}! Hãy chọn 1 Nhân vật đồng hành để bắt đầu!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Mỗi khi vượt qua 1 chặng phiêu lưu trên đảo, em sẽ được trao tặng <b>🛡️ 1 Khiên Danh Dự</b> và <b>🪶 Lông vũ</b> vào Hộ chiếu!
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
                  1. Chọn 1 Nhân vật đồng hành của em trong suốt hành trình:
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
                  3. Bạn hào hứng với hoạt động nào nhất trên đảo? (Có thể chọn nhiều)
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
                  placeholder="Ví dụ: Em rất thích chơi đóng vai cửa hàng và sưu tầm Khiên Danh Dự..."
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
