"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
  X,
} from "lucide-react"
import type {
  MonthlyTeacherObservationRow,
  ObservationDetailItem,
  ObservationRecordState,
} from "@/lib/teacher-quality/types"

export type DrilldownTabKey = "taught" | "observed" | "pending"

interface ObservationDrilldownDrawerProps {
  open: boolean
  teacherRow: MonthlyTeacherObservationRow | null
  initialTab: DrilldownTabKey
  monthLabel: string
  canCreateCoaching: boolean
  onClose: () => void
  onCreateCoaching: (item: ObservationDetailItem) => void
  onOpenCoachingTab: () => void
}

function recordStateBadgeClass(state: ObservationRecordState): string {
  switch (state) {
    case "OFFICIAL_APPROVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "PENDING_APPROVAL":
    case "NEEDS_REVISION":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "CANCELLED_OR_REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

function coachingStatusLabel(status: string): { label: string; cls: string } {
  switch (status) {
    case "COMPLETED":
      return { label: "Hoàn thành bồi dưỡng", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "IN_PROGRESS":
      return { label: "Đang thực hiện bồi dưỡng", cls: "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]" }
    default:
      return { label: "Chưa thực hiện bồi dưỡng", cls: "bg-amber-50 text-amber-700 border-amber-200" }
  }
}

export function ObservationDrilldownDrawer({
  open,
  teacherRow,
  initialTab,
  monthLabel,
  canCreateCoaching,
  onClose,
  onCreateCoaching,
  onOpenCoachingTab,
}: ObservationDrilldownDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrilldownTabKey>(initialTab)

  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab, teacherRow?.teacherId])

  if (!open || !teacherRow) return null

  const items: ObservationDetailItem[] =
    activeTab === "taught"
      ? teacherRow.taughtDetails
      : activeTab === "observed"
        ? teacherRow.observedDetails
        : teacherRow.pendingDetails

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
        {/* Top Masthead */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
              <span>Chi tiết tiết & phiếu dự giờ gốc</span>
              <span>·</span>
              <span>{monthLabel}</span>
            </div>
            <h3 className="text-base font-semibold mt-0.5">
              {teacherRow.teacherName}{" "}
              <span className="text-teal-200 font-normal text-xs tabular-nums">
                ({teacherRow.teacherCode})
              </span>
            </h3>
            <p className="text-xs text-teal-100 mt-1">
              {teacherRow.campusName} · {teacherRow.departmentName} · Thâm niên: {teacherRow.seniorityLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Strip inside drawer */}
        <div className="grid grid-cols-3 divide-x divide-[#E2E8F0] border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs tabular-nums">
          <button
            type="button"
            onClick={() => setActiveTab("taught")}
            className={`px-4 py-3 text-left transition-colors ${
              activeTab === "taught"
                ? "bg-white border-b-2 border-[#003B3A]"
                : "hover:bg-white/70"
            }`}
          >
            <div className="text-slate-500">Tiết GV dạy được dự</div>
            <div className="mt-0.5 text-sm font-semibold text-[#003B3A]">
              {teacherRow.taughtObservedOfficial} tiết chính thức
              <span className="text-slate-400 font-normal ml-1">
                ({teacherRow.taughtDetails.length} phiếu)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("observed")}
            className={`px-4 py-3 text-left transition-colors ${
              activeTab === "observed"
                ? "bg-white border-b-2 border-[#003B3A]"
                : "hover:bg-white/70"
            }`}
          >
            <div className="text-slate-500">Tiết GV đi dự</div>
            <div className="mt-0.5 text-sm font-semibold text-[#003B3A]">
              {teacherRow.observedQuotaDisplay}
              <span className="text-slate-400 font-normal ml-1">
                ({teacherRow.observedDetails.length} lượt)
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-3 text-left transition-colors ${
              activeTab === "pending"
                ? "bg-white border-b-2 border-[#003B3A]"
                : "hover:bg-white/70"
            }`}
          >
            <div className="text-slate-500">Phiếu chờ duyệt</div>
            <div
              className={`mt-0.5 text-sm font-semibold ${
                teacherRow.pendingFormsCount > 0 ? "text-amber-700" : "text-slate-700"
              }`}
            >
              {teacherRow.pendingFormsCount} phiếu
            </div>
          </button>
        </div>

        {/* Rule note */}
        <div className="px-5 py-2.5 bg-[#F0FDFA] border-b border-[#CCFBF1] text-[11px] text-[#00736E] flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Chốt tháng theo <strong>Ngày dự thực tế</strong>. Chỉ cộng vào số tiết chính thức khi phiếu đã duyệt và đáp ứng điều kiện ghi nhận của phân hệ Dự giờ.
          </span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#F8FAFC]">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {activeTab === "taught"
                  ? "Chưa có tiết dạy nào được dự trong tháng này"
                  : activeTab === "observed"
                    ? "Giáo viên chưa có lượt đi dự giờ nào trong tháng này"
                    : "Không có phiếu dự giờ nào đang chờ duyệt"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Dữ liệu tự động đồng bộ từ phân hệ Dự giờ theo ngày dự thực tế.
              </p>
            </div>
          ) : (
            items.map((item, idx) => {
              const linked = item.linkedCoaching
              const coachingBadge = linked ? coachingStatusLabel(linked.status) : null

              return (
                <div
                  key={`${item.slotId}-${item.registrationId || "noreg"}-${idx}`}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs space-y-3"
                >
                  {/* Row 1: Date + Status badges */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#003B3A] px-2.5 py-1 text-white font-semibold">
                        <Calendar className="h-3 w-3 text-[#5EEAD4]" />
                        {item.actualDateVi}
                      </span>
                      <span className="text-slate-600 font-medium">{item.timeRange}</span>
                      {item.isDoublePeriod && (
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          Tiết đôi (2 tiết)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${recordStateBadgeClass(
                          item.recordState
                        )}`}
                      >
                        {item.isCountedOfficial ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {item.recordStateLabel}
                      </span>

                      {item.overallRating && (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                            item.teachingCompliancePass === false
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.teachingCompliancePass === true
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.overallRating}
                          {item.totalScore !== null ? ` · ${item.totalScore}đ` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Lesson metadata */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{item.topic}</h4>
                    <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {item.campusName} · Lớp <strong className="text-slate-800">{item.className}</strong> ({item.level})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          Môn / HĐ: <strong className="text-slate-800">{item.subjectName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          GV dạy: <strong className="text-slate-800">{item.hostTeacherName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          Người dự:{" "}
                          <strong className="text-slate-800">
                            {item.observerTeacherName || "Chưa có người đăng ký"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Evaluation contents from original form */}
                  {(item.strengths || item.improvements || item.generalComment) && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2 text-xs">
                      {item.strengths && (
                        <div>
                          <span className="font-semibold text-emerald-700">Ưu điểm: </span>
                          <span className="text-slate-700 whitespace-pre-line">{item.strengths}</span>
                        </div>
                      )}
                      {item.improvements && (
                        <div>
                          <span className="font-semibold text-amber-700">Nội dung cần cải thiện: </span>
                          <span className="text-slate-800 whitespace-pre-line">{item.improvements}</span>
                        </div>
                      )}
                      {item.generalComment && (
                        <div>
                          <span className="font-semibold text-slate-700">Nhận xét chung: </span>
                          <span className="text-slate-600 whitespace-pre-line">{item.generalComment}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 4: Linked coaching or Action bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <Link
                        href={item.sourceRoute}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#00736E] hover:text-[#003B3A] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Mở phân hệ Dự giờ gốc
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {linked && coachingBadge ? (
                        <button
                          type="button"
                          onClick={onOpenCoachingTab}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors hover:opacity-90 ${coachingBadge.cls}`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {coachingBadge.label}
                        </button>
                      ) : item.canCreateCoaching && canCreateCoaching ? (
                        <button
                          type="button"
                          onClick={() => onCreateCoaching(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005250] transition-colors"
                        >
                          <BookOpenCheck className="h-3.5 w-3.5 text-[#5EEAD4]" />
                          Tạo nội dung bồi dưỡng
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
