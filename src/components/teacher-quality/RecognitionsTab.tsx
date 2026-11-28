"use client"

import React, { useState } from "react"
import toast from "react-hot-toast"
import {
  Award,
  Cpu,
  Edit3,
  Link2,
  Loader2,
  MessageSquareHeart,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react"
import type {
  RecognitionGroupType,
  RecognitionRecordItem,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"
import { RecognitionModal } from "./RecognitionModal"

interface RecognitionsTabProps {
  data: TeacherQualityWorkspaceResponse | null
  loading: boolean
  onRefresh: () => void
}

const GROUPS: Array<{
  key: RecognitionGroupType
  label: string
  desc: string
  icon: any
}> = [
  {
    key: "DEPT_AWARD",
    label: "Khen thưởng Sở, ngành",
    desc: "Danh hiệu hoặc hình thức khen thưởng, cơ quan khen thưởng, thời điểm ghi nhận.",
    icon: Award,
  },
  {
    key: "SYSTEM_AWARD",
    label: "Khen thưởng hệ thống",
    desc: "Danh hiệu, đợt khen thưởng, cấp cơ sở hoặc hệ thống. Liên kết Thi đua – Khen thưởng khi có dữ liệu.",
    icon: Award,
  },
  {
    key: "STUDENT_COMPETITION",
    label: "Bồi dưỡng HS các kỳ thi",
    desc: "Kỳ thi, cấp thi, môn/lĩnh vực, vai trò GV, số HS dự thi và kết quả. Lấy từ Thành tích HS khi có liên kết; báo cáo tổng hợp chỉ đếm mỗi kết quả HS một lần.",
    icon: Trophy,
  },
  {
    key: "PARENT_NPS",
    label: "NPS PHHS",
    desc: "Điểm NPS và số phản hồi hợp lệ theo từng đợt từ phân hệ Khảo sát NPS, tách riêng GVCN và GVBM.",
    icon: MessageSquareHeart,
  },
  {
    key: "AI_TECH",
    label: "Ứng dụng AI & công nghệ",
    desc: "Nội dung đã áp dụng, mục đích, thời điểm, phạm vi và ghi nhận ngắn về kết quả.",
    icon: Cpu,
  },
]

export function RecognitionsTab({ data, loading, onRefresh }: RecognitionsTabProps) {
  const [activeGroup, setActiveGroup] = useState<RecognitionGroupType>("DEPT_AWARD")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecognitionRecordItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const recognitions = data?.recognitions || []
  const npsRows = data?.npsRows || []
  const scope = data?.scope

  const groupCounts: Record<RecognitionGroupType, number> = {
    DEPT_AWARD: recognitions.filter((r) => r.groupType === "DEPT_AWARD").length,
    SYSTEM_AWARD: recognitions.filter((r) => r.groupType === "SYSTEM_AWARD").length,
    STUDENT_COMPETITION: recognitions.filter((r) => r.groupType === "STUDENT_COMPETITION").length,
    PARENT_NPS: npsRows.length,
    AI_TECH: recognitions.filter((r) => r.groupType === "AI_TECH").length,
  }

  const activeItems = recognitions.filter((r) => r.groupType === activeGroup)
  const activeGroupMeta = GROUPS.find((g) => g.key === activeGroup)!

  const canAddInActiveGroup =
    activeGroup !== "PARENT_NPS" &&
    (Boolean(scope?.canEditRecognitions) ||
      (activeGroup === "AI_TECH" && Boolean(scope?.canSelfAddAiTech)))

  const handleDelete = async (rec: RecognitionRecordItem) => {
    if (!window.confirm(`Xóa bản ghi "${rec.title}" của GV ${rec.teacherName}?`)) return
    setDeletingId(rec.id)
    try {
      const res = await fetch(`/api/admin/teacher-quality/recognitions/${rec.id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Không thể xóa")
      toast.success("Đã xóa bản ghi")
      onRefresh()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xóa")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* 5-Group Sub-navigation */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {GROUPS.map((g) => {
              const Icon = g.icon
              const active = activeGroup === g.key
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setActiveGroup(g.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors tabular-nums ${
                    active
                      ? "bg-[#003B3A] text-white"
                      : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{g.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-[#00A19A] text-white" : "bg-[#E2E8F0] text-slate-700"
                    }`}
                  >
                    {groupCounts[g.key]}
                  </span>
                </button>
              )
            })}
          </div>

          {canAddInActiveGroup && (
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null)
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#003B3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#005250] transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-[#5EEAD4]" />
              Thêm bản ghi
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 border-t border-[#F1F5F9] pt-2">
          {activeGroupMeta.desc}
        </p>
      </div>

      {/* Table Content */}
      {activeGroup === "PARENT_NPS" ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Giáo viên · Tổ chuyên môn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Đợt khảo sát NPS
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Vai trò
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-right">
                    Phản hồi hợp lệ
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-right">
                    Điểm NPS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {loading && npsRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-[#00A19A] mx-auto mb-2" />
                      Đang đồng bộ dữ liệu NPS PHHS...
                    </td>
                  </tr>
                ) : npsRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Chưa có dữ liệu khảo sát NPS PHHS cho phạm vi đang chọn. Dữ liệu được tự động cập nhật từ phân hệ Khảo sát NPS.
                    </td>
                  </tr>
                ) : (
                  npsRows.map((row) => (
                    <tr key={row.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle">
                        <div className="font-semibold text-slate-900">{row.teacherName}</div>
                        <div className="text-[11px] text-slate-500">
                          {row.teacherCode} · {row.campusName} · {row.departmentName}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="font-medium text-slate-800">{row.periodTitle}</div>
                        {row.semester && (
                          <div className="text-[11px] text-slate-500">{row.semester}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-middle text-center">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            row.roleType === "GVCN"
                              ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {row.roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-middle text-right font-medium text-slate-800">
                        {row.validResponses} PH
                        <div className="text-[10px] text-slate-400">
                          Ủng hộ: {row.promoters} · Trung lập: {row.passives} · Chưa hài lòng: {row.detractors}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-middle text-right">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            row.npsScore >= 50
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.npsScore >= 0
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {row.npsScore > 0 ? `+${row.npsScore}` : row.npsScore}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Giáo viên · Cơ sở
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    {activeGroup === "STUDENT_COMPETITION"
                      ? "Kỳ thi · Cấp thi · Môn/Lĩnh vực"
                      : activeGroup === "AI_TECH"
                        ? "Nội dung AI / công nghệ · Mục đích"
                        : "Danh hiệu / Hình thức khen thưởng"}
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    {activeGroup === "STUDENT_COMPETITION"
                      ? "Vai trò GV · Số HS · Kết quả"
                      : activeGroup === "AI_TECH"
                        ? "Phạm vi · Kết quả áp dụng"
                        : activeGroup === "SYSTEM_AWARD"
                          ? "Đợt khen thưởng · Cấp"
                          : "Cơ quan khen thưởng"}
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Thời điểm · Nguồn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {loading && activeItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-[#00A19A] mx-auto mb-2" />
                      Đang tải dữ liệu ghi nhận...
                    </td>
                  </tr>
                ) : activeItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Chưa có bản ghi nào trong nhóm <strong>{activeGroupMeta.label}</strong>.
                    </td>
                  </tr>
                ) : (
                  activeItems.map((rec) => (
                    <tr key={rec.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 align-middle min-w-[190px]">
                        <div className="font-semibold text-slate-900">{rec.teacherName}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.teacherCode} · {rec.campusName}
                        </div>
                        <div className="text-[11px] text-slate-400">{rec.departmentName}</div>
                      </td>

                      <td className="py-3 px-3 align-middle min-w-[230px]">
                        <div className="font-semibold text-slate-900">{rec.title}</div>
                        {(rec.issuingAuthority || rec.eventBatch) && activeGroup !== "DEPT_AWARD" && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {[rec.issuingAuthority, rec.eventBatch].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle min-w-[220px]">
                        {activeGroup === "DEPT_AWARD" && (
                          <span className="text-slate-700">{rec.issuingAuthority || "—"}</span>
                        )}
                        {activeGroup === "SYSTEM_AWARD" && (
                          <div>
                            <div className="text-slate-800">{rec.eventBatch || "—"}</div>
                            {rec.awardScope && (
                              <span className="mt-0.5 inline-flex rounded bg-[#F0FDFA] border border-[#99F6E4] px-1.5 py-0.5 text-[10px] font-semibold text-[#00736E]">
                                {rec.awardScope}
                              </span>
                            )}
                          </div>
                        )}
                        {activeGroup === "STUDENT_COMPETITION" && (
                          <div className="space-y-0.5">
                            <div className="text-slate-800">
                              <span className="font-medium">{rec.teacherRole || "GV bồi dưỡng"}</span>
                              {rec.participantCount !== null && (
                                <span className="text-slate-500"> · {rec.participantCount} HS</span>
                              )}
                            </div>
                            {rec.resultSummary && (
                              <div className="text-[11px] font-medium text-emerald-700">
                                {rec.resultSummary}
                              </div>
                            )}
                          </div>
                        )}
                        {activeGroup === "AI_TECH" && (
                          <div className="space-y-0.5">
                            {rec.awardScope && (
                              <div className="text-[11px] font-medium text-[#00736E]">
                                Phạm vi: {rec.awardScope}
                              </div>
                            )}
                            <div className="text-slate-700">{rec.resultSummary || "—"}</div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="text-slate-800">{rec.recordedDate || "—"}</div>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                            rec.sourceType === "LINKED"
                              ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {rec.sourceType === "LINKED" && <Link2 className="h-2.5 w-2.5" />}
                          {rec.sourceLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                        {rec.canEdit ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(rec)
                                setModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-[#00A19A] hover:text-[#003B3A]"
                            >
                              <Edit3 className="h-3 w-3" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rec)}
                              disabled={deletingId === rec.id}
                              className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            >
                              {deletingId === rec.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Cập nhật ở phân hệ nguồn</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeGroup !== "PARENT_NPS" && (
        <RecognitionModal
          open={modalOpen}
          groupType={activeGroup}
          academicYearId={data?.academicYear.id || ""}
          teachers={data?.availableFilters.teachers || []}
          defaultTeacherId={
            scope?.roleTier === "GV" ? scope.currentTeacherId : data?.filters.teacherId
          }
          lockTeacher={scope?.roleTier === "GV"}
          editingRecord={editingRecord}
          onClose={() => setModalOpen(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  )
}
