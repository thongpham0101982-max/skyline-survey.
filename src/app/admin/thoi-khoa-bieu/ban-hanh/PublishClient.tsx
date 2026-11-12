"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { TimetableShell, VERSION_STATUS_BADGE } from "@/components/timetable/TimetableShell"
import { TimetableFilterBar } from "@/components/timetable/TimetableFilterBar"
import { ValidationSummaryPanel } from "@/components/timetable/ValidationSummaryPanel"
import { useTimetableFilterNavigation } from "@/components/timetable/useTimetableFilterNavigation"
import {
  createTimetableVersionAction,
  getTimetablePublishPageAction,
  transitionTimetableVersionStatusAction,
} from "../actions"
import type { ManageableScopeGroup } from "@/lib/timetable/types"

type PublishPageData = Extract<
  Awaited<ReturnType<typeof getTimetablePublishPageAction>>,
  { success: true }
>

const WORKFLOW_STEPS = [
  { code: "DRAFT", label: "1. Bản nháp" },
  { code: "PENDING_APPROVAL", label: "2. Chờ duyệt" },
  { code: "APPROVED", label: "3. Đã duyệt" },
  { code: "PUBLISHED", label: "4. Đã ban hành" },
  { code: "EXPIRED", label: "5. Hết hiệu lực" },
]

export function PublishClient({ initialData }: { initialData: PublishPageData }) {
  const { data, loading, errorMessage, reloadWithPatch } =
    useTimetableFilterNavigation<PublishPageData>(initialData, getTimetablePublishPageAction)

  const {
    filterContext,
    allVersionsInScope,
    selectedVersion,
    validationReport,
    quotaSummary,
    auditLogs,
  } = data

  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    selectedVersion?.effectiveFrom || ""
  )
  const [effectiveTo, setEffectiveTo] = useState<string>(selectedVersion?.effectiveTo || "")
  const [comment, setComment] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    setEffectiveFrom(selectedVersion?.effectiveFrom || "")
    setEffectiveTo(selectedVersion?.effectiveTo || "")
    setComment("")
  }, [selectedVersion?.id, selectedVersion?.revision])

  const handleTransition = async (
    transition: "SUBMIT_APPROVAL" | "RETURN_DRAFT" | "APPROVE" | "PUBLISH" | "EXPIRE"
  ) => {
    if (!selectedVersion) return
    setFeedback(null)

    if (transition === "RETURN_DRAFT" && !comment.trim()) {
      setFeedback({
        type: "err",
        text: "Vui lòng nhập ý kiến phản hồi cụ thể trước khi trả lại bản nháp.",
      })
      return
    }

    if (transition === "PUBLISH" && !effectiveFrom) {
      setFeedback({
        type: "err",
        text: "Vui lòng chọn ngày bắt đầu áp dụng (Hiệu lực từ ngày) trước khi ban hành chính thức.",
      })
      return
    }

    if (transition === "EXPIRE") {
      const ok = window.confirm(
        `Kết thúc hiệu lực phiên bản "${selectedVersion.name}"? Lịch học sẽ ngừng hiển thị cho những ngày sau mốc kết thúc.`
      )
      if (!ok) return
    }

    setSubmitting(true)
    try {
      const res = await transitionTimetableVersionStatusAction({
        versionId: selectedVersion.id,
        expectedRevision: selectedVersion.revision,
        transition,
        effectiveFrom: effectiveFrom || null,
        effectiveTo: effectiveTo || null,
        comment: comment.trim() || null,
      })

      if (!res.success) {
        setFeedback({ type: "err", text: res.error })
        return
      }

      setFeedback({
        type: "ok",
        text: `Đã cập nhật trạng thái phiên bản "${selectedVersion.name}" thành công.`,
      })
      setComment("")
      await reloadWithPatch({ versionId: selectedVersion.id })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloneNewDraft = async () => {
    if (!selectedVersion) return
    const nextName = window.prompt(
      "Nhập tên phiên bản nháp mới được sao chép từ lịch này (giữ nguyên lịch sử phiên bản cũ):",
      `${selectedVersion.name} (Điều chỉnh đợt mới)`
    )
    if (!nextName || !nextName.trim()) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const scopeGroup =
        filterContext.selectedScopeGroup === "LIEN_CAP"
          ? "TRUNG_HOC"
          : (filterContext.selectedScopeGroup as ManageableScopeGroup)

      const res = await createTimetableVersionAction({
        academicYearId: filterContext.selectedYearId,
        semester: filterContext.semester,
        campusId: filterContext.selectedCampusId,
        scopeGroup,
        name: nextName.trim(),
        cloneFromVersionId: selectedVersion.id,
        notes: `Tạo phiên bản mới kế thừa từ ${selectedVersion.code}`,
      })

      if (!res.success) {
        setFeedback({ type: "err", text: res.error })
        return
      }

      setFeedback({
        type: "ok",
        text: `Đã tạo phiên bản nháp mới "${res.version.name}". Bạn có thể chỉnh sửa trên trang Xếp thời khóa biểu mà không làm hỏng lịch đã ban hành.`,
      })
      await reloadWithPatch({ versionId: res.version.id })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TimetableShell
      title="Duyệt & Ban hành thời khóa biểu"
      subtitle="Kiểm định toàn vẹn định mức - phân công - xung đột trên dữ liệu mới nhất trước khi phê duyệt, ban hành và quản lý vòng đời hiệu lực"
      activeTabCode="PUBLISH"
    >
      <TimetableFilterBar
        context={filterContext}
        loading={loading}
        showGradeAndClass={false}
        showVersion={true}
        onChange={(patch) => reloadWithPatch(patch)}
      />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-[#E11D48] rounded-2xl px-4 py-3 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-medium border ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-[#059669]"
              : "bg-rose-50 border-rose-200 text-[#E11D48]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Workflow Stepper & Action Panel */}
      {!selectedVersion ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center text-xs text-slate-600">
          Chưa có phiên bản thời khóa biểu nào trong phạm vi đang chọn. Hãy sang trang{" "}
          <Link
            href="/admin/thoi-khoa-bieu/xep-lich"
            className="text-[#008B85] font-semibold underline"
          >
            Xếp thời khóa biểu
          </Link>{" "}
          để khởi tạo phương án nháp.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
          {/* Pipeline Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{selectedVersion.code}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                    VERSION_STATUS_BADGE[selectedVersion.status]?.className ||
                    "bg-slate-100 text-slate-700"
                  }`}
                >
                  {VERSION_STATUS_BADGE[selectedVersion.status]?.label || selectedVersion.status}
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  Revision #{selectedVersion.revision}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#003B3A] mt-1">{selectedVersion.name}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {WORKFLOW_STEPS.map((st) => {
                const isActive = selectedVersion.status === st.code
                return (
                  <span
                    key={st.code}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
                      isActive
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-[#F8FAFC] text-slate-500 border-[#E2E8F0]"
                    }`}
                  >
                    {st.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Readiness Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="text-[11px] font-semibold text-slate-500">
                Điều kiện ban hành tự động
              </div>
              <div
                className={`text-sm font-bold mt-1 ${
                  validationReport.canPublish ? "text-[#059669]" : "text-[#E11D48]"
                }`}
              >
                {validationReport.canPublish
                  ? "Đạt chuẩn — Cho phép phê duyệt & ban hành"
                  : "Chưa đủ điều kiện ban hành"}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="text-[11px] font-semibold text-slate-500">
                Đối chiếu định mức & phân công
              </div>
              <div className="text-sm font-bold text-[#003B3A] mt-1">
                {quotaSummary.underScheduledCount} môn-lớp thiếu tiết •{" "}
                {quotaSummary.missingTeacherCount} thiếu GV
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="text-[11px] font-semibold text-slate-500">
                Ý kiến thẩm định gần nhất
              </div>
              <div className="text-xs text-slate-700 mt-1">
                {selectedVersion.reviewComment || "Chưa có ghi chú phản hồi"}
              </div>
            </div>
          </div>

          {/* Effective Dates & Reviewer Comment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hiệu lực từ ngày (bắt buộc khi ban hành)
              </label>
              <input
                type="date"
                value={effectiveFrom}
                disabled={submitting || selectedVersion.status === "EXPIRED"}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hiệu lực đến ngày (để trống nếu áp dụng đến hết kỳ)
              </label>
              <input
                type="date"
                value={effectiveTo}
                disabled={submitting || selectedVersion.status === "EXPIRED"}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Ý kiến thẩm định / Lý do trả lại bản nháp
              </label>
              <input
                type="text"
                value={comment}
                disabled={submitting}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Nhập nhận xét phê duyệt hoặc yêu cầu chỉnh sửa..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
              />
            </div>
          </div>

          {/* Workflow Transition Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2">
              {selectedVersion.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTransition("SUBMIT_APPROVAL")}
                  className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Gửi chờ duyệt
                </button>
              )}

              {(selectedVersion.status === "PENDING_APPROVAL" ||
                selectedVersion.status === "APPROVED") && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTransition("RETURN_DRAFT")}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[#D97706] text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Trả lại bản nháp kèm ý kiến
                </button>
              )}

              {(selectedVersion.status === "PENDING_APPROVAL" ||
                selectedVersion.status === "DRAFT") && (
                <button
                  type="button"
                  disabled={submitting || !validationReport.canPublish}
                  title={
                    !validationReport.canPublish
                      ? "Cần xử lý hết tiết thiếu và vi phạm bắt buộc trước khi phê duyệt"
                      : undefined
                  }
                  onClick={() => handleTransition("APPROVE")}
                  className="px-4 py-2 rounded-xl bg-[#008B85] text-white text-xs font-semibold hover:bg-[#00736E] transition-colors disabled:opacity-45 cursor-pointer"
                >
                  Phê duyệt lịch
                </button>
              )}

              {(selectedVersion.status === "APPROVED" ||
                selectedVersion.status === "PENDING_APPROVAL") && (
                <button
                  type="button"
                  disabled={submitting || !validationReport.canPublish}
                  title={
                    !validationReport.canPublish
                      ? "Không được phép ban hành khi còn thiếu tiết hoặc vi phạm quy tắc bắt buộc"
                      : undefined
                  }
                  onClick={() => handleTransition("PUBLISH")}
                  className="px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-45 cursor-pointer"
                >
                  Ban hành chính thức
                </button>
              )}

              {selectedVersion.status === "PUBLISHED" && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleTransition("EXPIRE")}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Kết thúc hiệu lực
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCloneNewDraft}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#003B3A] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              Tạo phiên bản nháp mới kế thừa lịch này
            </button>
          </div>
        </div>
      )}

      {/* Live 10-Rule Validation Panel */}
      <ValidationSummaryPanel report={validationReport} defaultExpanded={true} />

      {/* All Versions History in Scope */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#003B3A]">
            Danh mục phiên bản & lịch sử hiệu lực trong phạm vi ({allVersionsInScope.length})
          </h2>
          <span className="text-xs text-slate-500">
            Ngăn chồng hiệu lực tự động cho các lịch cùng bộ TKB và cơ sở
          </span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Phiên bản
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Thời gian hiệu lực
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">
                Trạng thái
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Người gửi / Phê duyệt / Ban hành
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Ý kiến thẩm định
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {allVersionsInScope.map((v) => {
              const st = VERSION_STATUS_BADGE[v.status] || {
                label: v.status,
                className: "bg-slate-100 text-slate-700",
              }
              const isSelected = selectedVersion?.id === v.id
              return (
                <tr
                  key={v.id}
                  className={`transition-colors align-middle ${
                    isSelected
                      ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                      : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <td className="py-3 px-3 align-middle">
                    <div className="font-semibold text-slate-900">{v.name}</div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {v.code} • Rev #{v.revision}
                    </div>
                  </td>
                  <td className="py-3 px-3 align-middle text-slate-700 whitespace-nowrap">
                    {v.effectiveFrom || "Chưa đặt"} → {v.effectiveTo || "Cuối kỳ"}
                  </td>
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${st.className}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 align-middle text-slate-600 text-[11px] space-y-0.5">
                    {v.submittedByName && <div>Gửi duyệt: {v.submittedByName}</div>}
                    {v.approvedByName && <div>Duyệt: {v.approvedByName}</div>}
                    {v.publishedByName && <div>Ban hành: {v.publishedByName}</div>}
                    {v.returnedByName && (
                      <div className="text-[#D97706]">Trả lại: {v.returnedByName}</div>
                    )}
                    {!v.submittedByName && !v.publishedByName && <span>—</span>}
                  </td>
                  <td className="py-3 px-3 align-middle text-slate-600 max-w-[240px]">
                    {v.reviewComment || "—"}
                  </td>
                  <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                    {!isSelected ? (
                      <button
                        type="button"
                        onClick={() => reloadWithPatch({ versionId: v.id })}
                        className="text-[#008B85] hover:underline font-semibold cursor-pointer"
                      >
                        Chọn kiểm định
                      </button>
                    ) : (
                      <span className="text-slate-400 font-semibold">Đang xem</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Audit Log Trail */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-bold text-[#003B3A]">
            Nhật ký kiểm toán quy trình duyệt & thay đổi ({auditLogs.length})
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003B3A] border-b border-[#003B3A]">
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap">
                Thời điểm
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Người thực hiện
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap">
                Hành động
              </th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-white">
                Nội dung chi tiết
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 px-4 text-center text-slate-500">
                  Chưa có nhật ký thao tác cho phiên bản này.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                  <td className="py-3 px-3 align-middle text-slate-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3 px-3 align-middle font-semibold text-[#003B3A] whitespace-nowrap">
                    {log.actorName || "Hệ thống"}{" "}
                    {log.actorRole ? (
                      <span className="font-normal text-slate-500">({log.actorRole})</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-3 align-middle font-mono text-[11px] text-[#00736E] whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 align-middle text-slate-800">{log.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </TimetableShell>
  )
}
