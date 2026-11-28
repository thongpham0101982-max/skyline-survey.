"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  Users,
} from "lucide-react"

export interface WorkflowStepMetrics {
  /** Bước 1: Chuẩn khung định mức 40 tiết (QĐ 82/2026) */
  totalGrades: number
  exact40Grades: number
  overQuotaSubjectCount: number

  /** Bước 2: Phân công GV & tách GVVN/GVNN */
  totalQuotaPairs: number
  missingTeacherCount: number
  unhydratedSlotTeacherCount: number

  /** Bước 3: Tiết cố định & Cụm GV liên cơ sở */
  fixedRuleCount: number
  multiCampusTeacherCount: number
  multiCampusMissingPeriods: number
  multiCampusPlacedUnlockedCount: number
  multiCampusLockedCount: number

  /** Bước 4: Chia lịch & ghép luân phiên 0.5 + 0.5 */
  scheduledPeriodsTotal: number
  requiredPeriodsTotal: number
  missingActivityCount: number

  /** Bước 5: Kiểm định 10 quy tắc & Gửi duyệt */
  hardViolationCount: number
  canSubmitApproval: boolean
  versionStatus: string
}

interface TimetableWorkflowBarProps {
  metrics: WorkflowStepMetrics
  isEditableDraft: boolean
  onlyMultiCampusActive: boolean
  syncingTeachers: boolean
  autoRunning: boolean
  submittingApproval: boolean
  publishPageHref: string
  quotaPageHref: string
  onOpenGradeStats: () => void
  onApplyQd82?: () => void
  onSyncTeachers: () => void
  onFocusMultiCampusTeachers: () => void
  onLockMultiCampusSlots: () => void
  onRunAutoSchedule: () => void
  onSubmitApproval: () => void
}

export function TimetableWorkflowBar({
  metrics,
  isEditableDraft,
  onlyMultiCampusActive,
  syncingTeachers,
  autoRunning,
  submittingApproval,
  publishPageHref,
  quotaPageHref,
  onOpenGradeStats,
  onApplyQd82,
  onSyncTeachers,
  onFocusMultiCampusTeachers,
  onLockMultiCampusSlots,
  onRunAutoSchedule,
  onSubmitApproval,
}: TimetableWorkflowBarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const step1Done =
    metrics.totalGrades > 0 &&
    metrics.exact40Grades === metrics.totalGrades &&
    metrics.overQuotaSubjectCount === 0
  const step2Done =
    metrics.totalQuotaPairs > 0 &&
    metrics.missingTeacherCount === 0 &&
    metrics.unhydratedSlotTeacherCount === 0
  const step3Done =
    metrics.multiCampusMissingPeriods <= 0 &&
    metrics.multiCampusPlacedUnlockedCount === 0
  const step4Done =
    metrics.requiredPeriodsTotal > 0 && metrics.missingActivityCount === 0
  const step5Done =
    step4Done && metrics.hardViolationCount === 0

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(
    Boolean
  ).length

  const statusTone = (done: boolean, hasError = false) => {
    if (hasError) {
      return {
        card: "border-rose-300 bg-rose-50/40",
        badge: "bg-rose-100 text-[#E11D48] border-rose-200",
        dot: "bg-[#E11D48] text-white",
      }
    }
    if (done) {
      return {
        card: "border-emerald-200 bg-emerald-50/25",
        badge: "bg-emerald-50 text-[#059669] border-emerald-200",
        dot: "bg-[#059669] text-white",
      }
    }
    return {
      card: "border-[#E2E8F0] bg-[#F8FAFC]/70",
      badge: "bg-amber-50 text-[#D97706] border-amber-200",
      dot: "bg-[#003B3A] text-white",
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs overflow-hidden tabular-nums">
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#003B3A]">
            Quy trình 5 bước chia Thời khóa biểu chuẩn Sky-Line
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-semibold">
            Hoàn thành {completedStepsCount}/5 bước
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Thứ tự tối ưu: Chuẩn 40 tiết → Đồng bộ GV → Xếp & khóa GV liên cơ sở trước → Chia tự động → Kiểm định & Gửi duyệt
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC] cursor-pointer"
        >
          <span>{collapsed ? "Mở quy trình 5 bước" : "Thu gọn"}</span>
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2.5">
          {/* BƯỚC 1: ĐỊNH MỨC 40 TIẾT QĐ 82 */}
          {(() => {
            const tone = statusTone(step1Done, metrics.overQuotaSubjectCount > 0)
            return (
              <div className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${tone.card}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B3A]">
                      <span
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.dot}`}
                      >
                        1
                      </span>
                      <span>Chuẩn khung 40 tiết</span>
                    </span>
                    {step1Done && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Khớp <strong>{metrics.exact40Grades}/{metrics.totalGrades}</strong> khối đạt chuẩn 40 tiết/tuần
                    {metrics.overQuotaSubjectCount > 0 && (
                      <span className="text-[#E11D48] font-semibold">
                        {" "}• {metrics.overQuotaSubjectCount} môn vượt định mức
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={onOpenGradeStats}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#00A19A] text-[#003B3A] text-[11px] font-semibold cursor-pointer"
                  >
                    Bảng khối 40t
                  </button>
                  {!step1Done && onApplyQd82 && isEditableDraft && (
                    <button
                      type="button"
                      onClick={onApplyQd82}
                      className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/80 text-[#00736E] text-[11px] font-semibold cursor-pointer"
                    >
                      Áp chuẩn QĐ 82
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* BƯỚC 2: ĐỒNG BỘ GV & GVVN/GVNN */}
          {(() => {
            const tone = statusTone(step2Done)
            return (
              <div className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${tone.card}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B3A]">
                      <span
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.dot}`}
                      >
                        2
                      </span>
                      <span>Đồng bộ GV & GVVN/NN</span>
                    </span>
                    {step2Done && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {metrics.missingTeacherCount === 0
                      ? "Đủ 100% GV phân công (kể cả luân phiên & GVVN/GVNN)"
                      : `Còn ${metrics.missingTeacherCount} môn-lớp chưa gán GV giảng dạy`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isEditableDraft && (
                    <button
                      type="button"
                      disabled={syncingTeachers}
                      onClick={onSyncTeachers}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/80 text-[#003B3A] text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 text-[#00736E] ${syncingTeachers ? "animate-spin" : ""}`} />
                      <span>{syncingTeachers ? "Đang đồng bộ..." : "Đồng bộ GV"}</span>
                    </button>
                  )}
                  {metrics.missingTeacherCount > 0 && (
                    <Link
                      href={quotaPageHref}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#00A19A] text-slate-700 text-[11px] font-semibold"
                    >
                      Gán bổ sung
                    </Link>
                  )}
                </div>
              </div>
            )
          })()}

          {/* BƯỚC 3: TIẾT CỐ ĐỊNH & GV DẠY NHIỀU CƠ SỞ (ƯU TIÊN SỐ 1) */}
          {(() => {
            const tone = statusTone(step3Done)
            return (
              <div className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${tone.card}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B3A]">
                      <span
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.dot}`}
                      >
                        3
                      </span>
                      <span>GV liên cơ sở & Cố định</span>
                    </span>
                    {step3Done && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    <strong>{metrics.multiCampusTeacherCount}</strong> GV liên cơ sở •{" "}
                    {metrics.multiCampusMissingPeriods > 0 ? (
                      <span className="text-[#D97706] font-semibold">
                        Còn {metrics.multiCampusMissingPeriods} tiết cần gom buổi/ngày
                      </span>
                    ) : (
                      <span className="text-[#059669] font-semibold">Đã xếp đủ tiết liên CS</span>
                    )}{" "}
                    ({metrics.fixedRuleCount} tiết cố định)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isEditableDraft && (
                    <button
                      type="button"
                      onClick={onFocusMultiCampusTeachers}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        onlyMultiCampusActive
                          ? "bg-[#003B3A] border-[#003B3A] text-white"
                          : "bg-white border-[#E2E8F0] hover:border-[#00A19A] text-[#003B3A]"
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>{onlyMultiCampusActive ? "Đang lọc Liên CS" : "Lọc GV liên CS"}</span>
                    </button>
                  )}
                  {isEditableDraft && metrics.multiCampusPlacedUnlockedCount > 0 && (
                    <button
                      type="button"
                      onClick={onLockMultiCampusSlots}
                      title="Khóa bảo vệ toàn bộ các ô đã xếp của GV dạy nhiều cơ sở để Chia lịch tự động không làm xáo trộn"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-[#D97706] text-[11px] font-semibold cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Khóa ({metrics.multiCampusPlacedUnlockedCount})</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* BƯỚC 4: CHIA LỊCH TỰ ĐỘNG & LUÂN PHIÊN */}
          {(() => {
            const tone = statusTone(step4Done)
            return (
              <div className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${tone.card}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B3A]">
                      <span
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.dot}`}
                      >
                        4
                      </span>
                      <span>Chia tự động & Luân phiên</span>
                    </span>
                    {step4Done && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Đã xếp <strong>{metrics.scheduledPeriodsTotal}/{metrics.requiredPeriodsTotal}</strong> tiết/tuần
                    {metrics.missingActivityCount > 0
                      ? ` • Còn ${metrics.missingActivityCount} môn-lớp thiếu tiết`
                      : " • Đủ 100% tiết tuần"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isEditableDraft && (
                    <button
                      type="button"
                      disabled={autoRunning}
                      onClick={onRunAutoSchedule}
                      title="Giữ nguyên 100% ô đã khóa, gom cặp T1–2 / T3–4, bám lịch nền và tự ghép cặp 0.5 luân phiên"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00A19A] hover:bg-[#008B85] text-white text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{autoRunning ? "Đang chia..." : "Chia lịch tự động"}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {/* BƯỚC 5: KIỂM ĐỊNH & GỬI DUYỆT / BAN HÀNH */}
          {(() => {
            const tone = statusTone(step5Done, metrics.hardViolationCount > 0)
            return (
              <div className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${tone.card}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B3A]">
                      <span
                        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.dot}`}
                      >
                        5
                      </span>
                      <span>Kiểm định & Ban hành</span>
                    </span>
                    {step5Done && <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {metrics.hardViolationCount > 0 ? (
                      <span className="text-[#E11D48] font-semibold">
                        Còn {metrics.hardViolationCount} vi phạm ràng buộc bắt buộc
                      </span>
                    ) : step4Done ? (
                      <span className="text-[#059669] font-semibold">
                        Đạt toàn bộ 10 quy tắc — Sẵn sàng gửi duyệt
                      </span>
                    ) : (
                      "Hoàn tất đủ tiết ở Bước 4 để mở khóa gửi duyệt"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {metrics.versionStatus === "DRAFT" && metrics.canSubmitApproval ? (
                    <button
                      type="button"
                      disabled={submittingApproval}
                      onClick={onSubmitApproval}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>{submittingApproval ? "Đang gửi..." : "Gửi chờ duyệt"}</span>
                    </button>
                  ) : null}
                  <Link
                    href={publishPageHref}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#00A19A] text-[#003B3A] text-[11px] font-semibold"
                  >
                    Trang Ban hành
                  </Link>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
