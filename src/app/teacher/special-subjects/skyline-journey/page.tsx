"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SkylineBirdCharacter } from "@/components/skyline-journey/SkylineBirdCharacter";

export default function TeacherSkylineJourneyPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"STAGES" | "STUDENTS">("STAGES");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Stage preview & guidance modal state
  const [previewStage, setPreviewStage] = useState<any | null>(null);
  const [guidanceDraft, setGuidanceDraft] = useState<string>("");
  const [savingStageCode, setSavingStageCode] = useState<string | null>(null);

  // Student review modal state
  const [reviewTarget, setReviewTarget] = useState<{
    studentId: string;
    studentName: string;
    studentCode: string;
    lessonCode: string;
    periodIndex: number;
    lessonName: string;
    scorePercent?: number | null;
    achievedCriteriaCount?: number;
    totalCriteriaCount?: number;
    attemptsCount?: number;
    studentReflection: string | null;
    teacherFeedback: string | null;
    status: string;
  } | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadDashboard = useCallback(async (clsId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = clsId ? `?classId=${encodeURIComponent(clsId)}` : "";
      const res = await fetch(`/api/skyline-journey/teacher${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Không thể tải dữ liệu lớp phân công");
        return;
      }
      setData(json);
      if (json.selectedClass?.id && !clsId) {
        setSelectedClassId(json.selectedClass.id);
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi tải dữ liệu Hành trình Sky-Line");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(selectedClassId || undefined);
  }, [loadDashboard, selectedClassId]);

  const handleToggleStageUnlock = async (stage: any, nextUnlocked: boolean, customGuidance?: string) => {
    if (!data?.selectedClass?.id) return;
    setSavingStageCode(stage.lessonCode);
    try {
      const res = await fetch("/api/skyline-journey/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_STAGE",
          classId: data.selectedClass.id,
          lessonCode: stage.lessonCode,
          isUnlocked: nextUnlocked,
          customGuidance: customGuidance ?? stage.customGuidance
        })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Không thể cập nhật trạng thái mở chặng");
        return;
      }
      await loadDashboard(data.selectedClass.id);
      if (previewStage?.lessonCode === stage.lessonCode) {
        setPreviewStage((prev: any) =>
          prev ? { ...prev, isUnlocked: nextUnlocked, customGuidance: customGuidance ?? prev.customGuidance } : null
        );
      }
    } finally {
      setSavingStageCode(null);
    }
  };

  const handleReviewSubmit = async (decision: "CONFIRM" | "REQUEST_REVISION") => {
    if (!reviewTarget) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/skyline-journey/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVIEW_STUDENT",
          studentId: reviewTarget.studentId,
          lessonCode: reviewTarget.lessonCode,
          decision,
          teacherFeedback:
            feedbackDraft.trim() ||
            (decision === "CONFIRM"
              ? "Thầy/Cô xác nhận em đã hoàn thành tốt nhiệm vụ thực hành!"
              : "Em hãy bổ sung rõ hơn cách thực hiện thực tế của mình nhé!")
        })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Không thể lưu nhận xét");
        return;
      }
      setReviewTarget(null);
      setFeedbackDraft("");
      await loadDashboard(data?.selectedClass?.id);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center">
        <SkylineBirdCharacter mood="EXPLORER" size="lg" />
        <p className="mt-3 font-bold text-slate-700">
          Đang tải dữ liệu quản lý Hành trình Sky-Line theo phân công giảng dạy...
        </p>
      </div>
    );
  }

  const classes = data?.classes || [];
  const selectedClass = data?.selectedClass;
  const classRole = data?.classRole;
  const canEdit = classRole === "SPECIAL_TEACHER" || classRole === "ADMIN";
  const stages = data?.stages || [];
  const students = data?.students || [];
  const recentClassResults = data?.recentClassResults || [];

  const filteredStudents = students.filter((stu: any) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "WAITING_CONFIRMATION") return stu.waitingConfirmationCount > 0;
    if (statusFilter === "NEEDS_REVISION") return stu.needsRevisionCount > 0;
    if (statusFilter === "COMPLETED_SOME") return stu.completedStagesCount > 0;
    if (statusFilter === "NOT_STARTED")
      return stu.stages.every((s: any) => s.status === "NOT_STARTED");
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-sky-800 rounded-3xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkylineBirdCharacter mood="EXPLORER" size="md" />
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase bg-white/15 px-3 py-1 rounded-full">
              <span>👩‍🏫 Quản lý Hành trình Sky-Line</span>
              <span>•</span>
              <span>
                {classRole === "GVCN"
                  ? "Chế độ GVCN theo dõi lớp chủ nhiệm"
                  : "Giáo viên Môn học đặc thù (Giáo dục Tài chính)"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              Điều phối Chặng Phiêu Lưu & Theo dõi Kết quả Game ({selectedClass?.curriculumTitle || "Đảo Tài Chính Khối 1–5"})
            </h1>
            <p className="text-xs text-teal-100 mt-0.5">
              Xong mỗi game, kết quả điểm số, tiêu chuẩn đạt được và phản hồi thực hành của học sinh đều được cập nhật tức thì cho GVBM và Quản trị.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/teacher/special-subjects/eval"
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/25"
          >
            ← Về Sổ Đánh giá Mức chuẩn
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Class Selector & Summary Bar */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-extrabold uppercase text-slate-600">
            Lớp được phân công ({classes.length}):
          </label>
          <select
            value={selectedClass?.id || ""}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-4 py-2.5 rounded-2xl border-2 border-teal-500 font-extrabold text-sm text-slate-900 bg-teal-50/50"
          >
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name} (Khối {c.grade} • {c.curriculumCode || `TC0${c.grade}S`} • {c.campusName} • {c.studentCount} HS •{" "}
                {c.accessRole === "GVCN" ? "GVCN" : "GV Bộ môn"})
              </option>
            ))}
          </select>

          {selectedClass && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
              ✅ Mã chương trình: {selectedClass.curriculumCode || `TC0${selectedClass.grade}S`} ({stages.length} chặng game)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("STAGES")}
            className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition ${
              activeTab === "STAGES"
                ? "bg-teal-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            🗺️ {stages.length} Chặng bài học & Mở khóa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("STUDENTS")}
            className={`px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm transition ${
              activeTab === "STUDENTS"
                ? "bg-teal-700 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            👧👦 Theo dõi Kết quả Game & Xác nhận ({students.length} HS)
          </button>
        </div>
      </div>

      {/* TAB 1: STAGE SELECTION, PREVIEW, UNLOCK & STATUS COUNTS */}
      {activeTab === "STAGES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((st: any) => (
            <div
              key={st.lessonCode}
              className={`rounded-3xl p-5 border-2 transition flex flex-col justify-between ${
                st.isUnlocked
                  ? "bg-white border-teal-300 shadow-sm"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-black text-xs">
                    Chặng {st.periodIndex} • {st.lessonCode}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      st.isUnlocked
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {st.isUnlocked ? "🔓 Đang mở cho HS" : "🔒 Chưa mở"}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{st.lessonName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{st.officialTopicName}</p>

                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    Cơ chế: {st.mechanic}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded ${
                      st.evaluationMode === "HYBRID_TEACHER"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {st.evaluationMode === "HYBRID_TEACHER"
                      ? "👩‍🏫 Có nhiệm vụ thực hành GV xác nhận"
                      : "⚡ Chấm khách quan tự động"}
                  </span>
                </div>

                {/* 5 Status Counts for this stage */}
                <div className="mt-4 grid grid-cols-5 gap-1 text-center bg-slate-50 p-2 rounded-2xl border border-slate-200 text-[10px]">
                  <div>
                    <div className="font-black text-slate-700 text-xs">{st.counts.notStarted}</div>
                    <div className="text-slate-500">Chưa chơi</div>
                  </div>
                  <div>
                    <div className="font-black text-amber-600 text-xs">{st.counts.inProgress}</div>
                    <div className="text-slate-500">Đang chơi</div>
                  </div>
                  <div>
                    <div className="font-black text-indigo-600 text-xs">
                      {st.counts.waitingConfirmation}
                    </div>
                    <div className="text-slate-500">Chờ duyệt</div>
                  </div>
                  <div>
                    <div className="font-black text-rose-600 text-xs">{st.counts.needsRevision}</div>
                    <div className="text-slate-500">Cần bổ sung</div>
                  </div>
                  <div>
                    <div className="font-black text-emerald-600 text-xs">{st.counts.completed}</div>
                    <div className="text-slate-500">Hoàn thành</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewStage(st);
                    setGuidanceDraft(st.customGuidance || "");
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                >
                  👁️ Xem trước & Giao lời dặn
                </button>

                {canEdit && (
                  <button
                    type="button"
                    disabled={savingStageCode === st.lessonCode}
                    onClick={() => handleToggleStageUnlock(st, !st.isUnlocked)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs transition ${
                      st.isUnlocked
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                        : "bg-teal-600 hover:bg-teal-500 text-white shadow"
                    }`}
                  >
                    {savingStageCode === st.lessonCode
                      ? "Đang lưu..."
                      : st.isUnlocked
                      ? "Tạm khóa chặng"
                      : "🔓 Mở chặng này"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: STUDENT PROGRESS MATRIX & TEACHER CONFIRMATION */}
      {activeTab === "STUDENTS" && (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "ALL", label: `Tất cả (${students.length})` },
                {
                  id: "WAITING_CONFIRMATION",
                  label: `⏳ Cần GV xác nhận (${students.filter((s: any) => s.waitingConfirmationCount > 0).length})`
                },
                {
                  id: "NEEDS_REVISION",
                  label: `✍️ Đang chờ HS bổ sung (${students.filter((s: any) => s.needsRevisionCount > 0).length})`
                },
                {
                  id: "COMPLETED_SOME",
                  label: `🚩 Đã cắm cờ (${students.filter((s: any) => s.completedStagesCount > 0).length})`
                },
                {
                  id: "NOT_STARTED",
                  label: `Chưa bắt đầu (${
                    students.filter((s: any) => s.stages.every((st: any) => st.status === "NOT_STARTED")).length
                  })`
                }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                    statusFilter === tab.id
                      ? "bg-teal-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500">
              💡 Bấm vào một ô chặng của học sinh để xem sản phẩm thực hành, viết nhận xét hoặc xác nhận.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-extrabold sticky left-0 bg-slate-100 z-10 min-w-[200px]">
                    Học sinh ({filteredStudents.length})
                  </th>
                  <th className="p-3 font-extrabold text-center">Tổng kết</th>
                  {stages.map((st: any) => (
                    <th
                      key={st.lessonCode}
                      className="p-2 font-extrabold text-center min-w-[58px]"
                      title={`${st.lessonCode}: ${st.lessonName}`}
                    >
                      <div>C.{st.periodIndex}</div>
                      <div className="text-[9px] font-normal text-slate-500">
                        {st.evaluationMode === "HYBRID_TEACHER" ? "👩‍🏫" : "⚡"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((stu: any) => (
                  <tr key={stu.studentId} className="hover:bg-slate-50/80">
                    <td className="p-3 sticky left-0 bg-white font-bold text-slate-900 border-r border-slate-100">
                      <div>{stu.fullName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{stu.studentCode}</div>
                      {stu.welcomeSurvey && (
                        <div className="text-[10px] text-teal-700 font-semibold mt-0.5">
                          Khảo sát: {stu.welcomeSurvey.interestLabel}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="font-extrabold text-emerald-700">
                        🚩 {stu.completedStagesCount}/{stages.length}
                      </span>
                      <span className="ml-2 text-amber-700 font-bold">🪶 {stu.totalFeathers}</span>
                    </td>
                    {stu.stages.map((cell: any) => {
                      const stMeta = stages.find((s: any) => s.lessonCode === cell.lessonCode);
                      const cellStyle =
                        cell.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : cell.status === "WAITING_CONFIRMATION"
                          ? "bg-indigo-600 text-white border-indigo-700 animate-pulse"
                          : cell.status === "NEEDS_REVISION"
                          ? "bg-rose-100 text-rose-900 border-rose-300"
                          : cell.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-400 border-slate-200";

                      const icon =
                        cell.status === "COMPLETED"
                          ? cell.teacherConfirmed
                            ? "🌟"
                            : "🚩"
                          : cell.status === "WAITING_CONFIRMATION"
                          ? "⏳"
                          : cell.status === "NEEDS_REVISION"
                          ? "✍️"
                          : cell.status === "IN_PROGRESS"
                          ? "🧭"
                          : "·";

                      return (
                        <td key={cell.lessonCode} className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewTarget({
                                studentId: stu.studentId,
                                studentName: stu.fullName,
                                studentCode: stu.studentCode,
                                lessonCode: cell.lessonCode,
                                periodIndex: cell.periodIndex,
                                lessonName: stMeta?.lessonName || cell.lessonCode,
                                scorePercent: cell.scorePercent,
                                achievedCriteriaCount: cell.achievedCriteriaCount,
                                totalCriteriaCount: cell.totalCriteriaCount,
                                attemptsCount: cell.attemptsCount,
                                studentReflection: cell.studentReflection,
                                teacherFeedback: cell.teacherFeedback,
                                status: cell.status
                              });
                              setFeedbackDraft(cell.teacherFeedback || "");
                            }}
                            className={`w-11 h-11 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center mx-auto transition hover:scale-105 ${cellStyle}`}
                            title={`Chặng ${cell.periodIndex} (${cell.status}) - Điểm: ${cell.scorePercent ?? "-"}% - Đạt ${cell.achievedCriteriaCount || 0}/${cell.totalCriteriaCount || 0} YCCĐ`}
                          >
                            <span>{icon}</span>
                            {cell.scorePercent !== null && cell.scorePercent !== undefined && (
                              <span className="text-[9px] font-extrabold leading-none mt-0.5">
                                {cell.scorePercent}%
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recentClassResults.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                ⚡ Nhật ký Kết quả Game vừa hoàn thành của Học sinh trong lớp ({recentClassResults.length} lượt gần nhất)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentClassResults.slice(0, 9).map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">
                          {r.studentName} ({r.studentCode})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Điểm: {r.scorePercent}%
                        </span>
                      </div>
                      <div className="font-semibold text-teal-800 mt-1">
                        Chặng {r.periodIndex}: {r.lessonName} ({r.lessonCode})
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Đạt {r.achievedCriteriaCount}/{r.totalCriteriaCount} YCCĐ • Lượt thử: {r.attemptsCount} • +{r.feathersEarned} 🪶
                      </div>
                      {r.studentReflection && (
                        <div className="mt-1.5 p-2 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700">
                          ✍️ &ldquo;{r.studentReflection}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Stage Preview & Teacher Guidance */}
      {previewStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 shadow-2xl border-2 border-teal-500 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900">
                  Xem trước Chặng {previewStage.periodIndex} • {previewStage.lessonCode}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {previewStage.lessonName}
                </h3>
                <p className="text-xs text-slate-500">{previewStage.officialTopicName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sm text-slate-800">
              <div className="font-bold text-teal-800 text-xs uppercase mb-1">
                🐦 Bối cảnh & Câu chuyện nhiệm vụ:
              </div>
              <p>{previewStage.storyBrief}</p>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase text-slate-700 mb-2">
                🎯 Tiêu chuẩn / Yêu cầu cần đạt của bài ({previewStage.criteria?.length || 0}):
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {previewStage.criteria?.map((c: any) => (
                  <li key={c.code} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <b className="font-mono text-teal-800">{c.code}</b> ({c.competencyGroup} - {c.level}):{" "}
                    {c.description}
                  </li>
                ))}
              </ul>
            </div>

            {canEdit && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-extrabold text-slate-700">
                  📌 Lời dặn / Hướng dẫn của Giáo viên khi giao chặng này cho lớp {selectedClass?.name}:
                </label>
                <textarea
                  rows={2}
                  value={guidanceDraft}
                  onChange={(e) => setGuidanceDraft(e.target.value)}
                  placeholder="Ví dụ: Các con hoàn thành chặng này trước thứ Sáu và chia sẻ 1 việc tiết kiệm điện ở nhà nhé..."
                  className="w-full p-3 rounded-2xl border-2 border-slate-300 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleStageUnlock(previewStage, true, guidanceDraft)
                    }
                    className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow"
                  >
                    💾 Lưu lời dặn & Mở chặng cho lớp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Review & Confirm Student Practical Task */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border-2 border-indigo-500 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900">
                  Chặng {reviewTarget.periodIndex} ({reviewTarget.lessonCode})
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  Học sinh: {reviewTarget.studentName} ({reviewTarget.studentCode})
                </h3>
                <p className="text-xs text-slate-500">{reviewTarget.lessonName}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="font-black text-emerald-800 text-base">
                  {reviewTarget.scorePercent ?? 0}%
                </div>
                <div className="text-[11px] text-slate-600">Điểm nhiệm vụ</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                <div className="font-black text-sky-800 text-base">
                  {reviewTarget.achievedCriteriaCount ?? 0}/{reviewTarget.totalCriteriaCount ?? 0}
                </div>
                <div className="text-[11px] text-slate-600">YCCĐ đạt được</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-black text-amber-800 text-base">
                  {reviewTarget.attemptsCount ?? 0}
                </div>
                <div className="text-[11px] text-slate-600">Số lần thực hiện</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm">
              <div className="text-xs font-bold text-slate-500 mb-1">
                ✍️ Chia sẻ thực hành / Kế hoạch của học sinh:
              </div>
              <p className="font-medium text-slate-800">
                {reviewTarget.studentReflection ||
                  "(Học sinh chưa ghi chia sẻ thực hành bằng chữ ở chặng này)"}
              </p>
            </div>

            {canEdit ? (
              <>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    👩‍🏫 Nhận xét khích lệ hoặc yêu cầu bổ sung của Giáo viên:
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackDraft}
                    onChange={(e) => setFeedbackDraft(e.target.value)}
                    placeholder="Nhập lời khen hoặc gợi ý bổ sung cho học sinh..."
                    className="w-full p-3 rounded-2xl border-2 border-slate-300 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={() => handleReviewSubmit("REQUEST_REVISION")}
                    className="px-4 py-2.5 rounded-2xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs"
                  >
                    ✍️ Yêu cầu bổ sung
                  </button>
                  <button
                    type="button"
                    disabled={submittingReview}
                    onClick={() => handleReviewSubmit("CONFIRM")}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow"
                  >
                    ✅ Xác nhận hoàn thành thực hành
                  </button>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 italic">
                Chế độ GVCN chỉ xem tiến độ và chia sẻ của học sinh lớp chủ nhiệm.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
