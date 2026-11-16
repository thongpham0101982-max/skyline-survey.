"use client"

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  CheckCircle2,
  Edit3,
  History,
  Plus,
  RefreshCw,
  X,
} from "lucide-react"
import type { WorkHubPlanObjective, WorkHubPlanRecord } from "@/lib/workhub/types"

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "Tuần",
  MONTHLY: "Tháng",
  SEMESTER: "Học kỳ",
  ACADEMIC_YEAR: "Năm học",
}

const PLAN_STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Đang soạn", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-50 text-[#059669] border-emerald-200" },
  ADJUSTED: { label: "Đã điều chỉnh", cls: "bg-amber-50 text-[#D97706] border-amber-200" },
}

export default function WorkHubPlansPage() {
  const [periodFilter, setPeriodFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any | null>(null)

  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingPlan, setEditingPlan] = useState<WorkHubPlanRecord | null>(null)
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [periodType, setPeriodType] = useState<"WEEKLY" | "MONTHLY" | "SEMESTER" | "ACADEMIC_YEAR">("MONTHLY")
  const [periodLabel, setPeriodLabel] = useState<string>(`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`)
  const [deptId, setDeptId] = useState<string>("")
  const [campusId, setCampusId] = useState<string>("")
  const [ownerId, setOwnerId] = useState<string>("")
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const [objectives, setObjectives] = useState<WorkHubPlanObjective[]>([
    { id: "obj_1", title: "", targetMetric: "" },
  ])
  const [adjustmentReason, setAdjustmentReason] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)

  const [versionsModalPlan, setVersionsModalPlan] = useState<WorkHubPlanRecord | null>(null)
  const [versionsList, setVersionsList] = useState<any[]>([])

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        resource: "plans",
        periodType: periodFilter,
        status: statusFilter,
      })
      const res = await fetch(`/api/workhub?${qs.toString()}`)
      const json = await res.json()
      if (json.success) {
        setData(json)
        if (!ownerId && json.actor?.userId) {
          setOwnerId(json.actor.userId)
          setDeptId(json.actor.primaryDepartmentId || "")
          setCampusId(json.actor.primaryCampusId || "")
        }
      } else {
        toast.error(json.error || "Lỗi tải kế hoạch công tác")
      }
    } finally {
      setLoading(false)
    }
  }, [periodFilter, statusFilter, ownerId])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const openCreateModal = () => {
    setEditingPlan(null)
    setTitle("")
    setDescription("")
    setAdjustmentReason("")
    setObjectives([{ id: `obj_${Date.now()}`, title: "", targetMetric: "" }])
    setShowModal(true)
  }

  const openEditModal = (plan: WorkHubPlanRecord) => {
    setEditingPlan(plan)
    setTitle(plan.title)
    setDescription(plan.description || "")
    setPeriodType(plan.periodType)
    setPeriodLabel(plan.periodLabel)
    setStartDate(plan.startDate.slice(0, 10))
    setEndDate(plan.endDate.slice(0, 10))
    setObjectives(
      plan.objectives.length > 0
        ? plan.objectives
        : [{ id: `obj_${Date.now()}`, title: "", targetMetric: "" }]
    )
    setAdjustmentReason("")
    setShowModal(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cleanObjs = objectives.filter((o) => o.title.trim())
      if (!editingPlan) {
        const res = await fetch("/api/workhub", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_PLAN",
            payload: {
              title,
              description,
              periodType,
              periodLabel,
              academicYearId: data?.academicYears?.[0]?.id || null,
              departmentId: deptId || null,
              campusId: campusId || null,
              ownerUserId: ownerId,
              startDate,
              endDate,
              objectives: cleanObjs,
            },
          }),
        })
        const json = await res.json()
        if (json.success) {
          toast.success(`Đã tạo kế hoạch ${json.planCode}`)
          setShowModal(false)
          await loadPlans()
        } else {
          toast.error(json.error || "Không tạo được kế hoạch")
        }
      } else {
        const res = await fetch("/api/workhub", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_OR_APPROVE_PLAN",
            payload: {
              planId: editingPlan.id,
              mode: "UPDATE_OR_ADJUST",
              title,
              description,
              periodLabel,
              startDate,
              endDate,
              objectives: cleanObjs,
              adjustmentReason,
            },
          }),
        })
        const json = await res.json()
        if (json.success) {
          toast.success(
            json.status === "ADJUSTED"
              ? `Đã lưu điều chỉnh phiên bản v${json.versionNumber}`
              : "Đã cập nhật kế hoạch đang soạn"
          )
          setShowModal(false)
          await loadPlans()
        } else {
          toast.error(json.error || "Lỗi cập nhật kế hoạch")
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleApprovePlan = async (planId: string) => {
    const res = await fetch("/api/workhub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_OR_APPROVE_PLAN",
        payload: { planId, mode: "APPROVE" },
      }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success("Đã phê duyệt kế hoạch công tác")
      await loadPlans()
    } else {
      toast.error(json.error || "Không thể phê duyệt")
    }
  }

  const openVersions = async (plan: WorkHubPlanRecord) => {
    setVersionsModalPlan(plan)
    const res = await fetch(`/api/workhub?resource=plan-versions&planId=${plan.id}`)
    const json = await res.json()
    if (json.success) setVersionsList(json.versions || [])
  }

  const plans: WorkHubPlanRecord[] = data?.plans || []
  const actor = data?.actor
  const canApprove =
    actor?.isExecutive || actor?.isDepartmentHead || actor?.isCampusHead

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-[#003B3A] pl-3">
          <h2 className="text-sm font-bold text-[#003B3A]">
            Kế hoạch công tác (Tuần • Tháng • Học kỳ • Năm học)
          </h2>
          <p className="text-xs text-slate-500">
            Theo dõi tiến độ thực hiện từ các công việc liên kết, nhận diện riêng việc phát sinh và quản lý phiên bản điều chỉnh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Mọi chu kỳ kế hoạch</option>
            <option value="WEEKLY">Kế hoạch Tuần</option>
            <option value="MONTHLY">Kế hoạch Tháng</option>
            <option value="SEMESTER">Kế hoạch Học kỳ</option>
            <option value="ACADEMIC_YEAR">Kế hoạch Năm học</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="DRAFT">Đang soạn</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="ADJUSTED">Đã điều chỉnh</option>
          </select>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
          >
            <Plus className="w-3.5 h-3.5" />
            Lập kế hoạch mới
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-xs text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-[#00A19A] mx-auto mb-2" />
          Đang tải danh sách kế hoạch công tác...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center space-y-2">
          <p className="text-sm font-bold text-[#003B3A]">Chưa có kế hoạch công tác nào</p>
          <p className="text-xs text-slate-500">
            Hãy lập kế hoạch tuần, tháng, học kỳ hoặc năm học để gắn các đầu việc thực thi.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white">
                    Mã & Tên kế hoạch
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Chu kỳ & Thời hạn
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100">
                    Phụ trách & Đơn vị
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-teal-100 text-center">
                    Việc theo KH / Phát sinh
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-[#5EEAD4] text-center">
                    Tiến độ & Trạng thái
                  </th>
                  <th className="py-3 px-3 text-[11px] font-semibold whitespace-nowrap text-white text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {plans.map((p) => {
                  const st = PLAN_STATUS_META[p.status] || PLAN_STATUS_META.DRAFT
                  const m = p.metrics!
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] align-middle">
                      <td className="py-3 px-3 min-w-[240px]">
                        <div className="font-bold text-[#003B3A]">
                          {p.planCode} • {p.title}
                        </div>
                        {p.objectives.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {p.objectives.length} mục tiêu trọng tâm
                          </div>
                        )}
                        {p.lastAdjustmentReason && (
                          <div className="text-[11px] text-[#D97706] mt-0.5">
                            Lý do điều chỉnh v{p.versionNumber}: {p.lastAdjustmentReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {PERIOD_LABELS[p.periodType] || p.periodType}: {p.periodLabel}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(p.startDate).toLocaleDateString("vi-VN")} –{" "}
                          {new Date(p.endDate).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{p.ownerName}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.departmentName || p.campusName || "Hệ thống"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-semibold text-[#00736E]">
                          {m.plannedTasksCount} kế hoạch
                        </span>{" "}
                        /{" "}
                        <span className="font-semibold text-[#D97706]">
                          {m.adhocTasksCount} phát sinh
                        </span>
                        <div className="text-[11px] text-slate-500">
                          Hoàn thành: {m.completedTasksCount}/{m.totalCanonicalTasks}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center min-w-[150px]">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${st.cls}`}
                        >
                          {st.label} (v{p.versionNumber})
                        </span>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#00A19A]"
                              style={{ width: `${m.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-[#003B3A]">
                            {m.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        {canApprove && p.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => handleApprovePlan(p.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200"
                          >
                            Duyệt KH
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]"
                        >
                          {p.status === "DRAFT" ? "Sửa" : "Điều chỉnh"}
                        </button>
                        {p.versionNumber > 1 && (
                          <button
                            type="button"
                            onClick={() => openVersions(p)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200"
                          >
                            Lịch sử v{p.versionNumber}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Lập / Điều chỉnh Kế hoạch */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePlan}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full p-5 space-y-3.5 text-xs my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                {editingPlan
                  ? `Điều chỉnh Kế hoạch ${editingPlan.planCode} (Hiện tại: v${editingPlan.versionNumber})`
                  : "Lập Kế hoạch công tác mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingPlan && (editingPlan.status === "APPROVED" || editingPlan.status === "ADJUSTED") && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                <div className="font-bold text-[#D97706]">
                  Kế hoạch đã được phê duyệt — Điều chỉnh sẽ tạo phiên bản v{editingPlan.versionNumber + 1}
                </div>
                <input
                  required
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh kế hoạch (bắt buộc)..."
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-slate-800"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tên kế hoạch *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  placeholder="VD: Kế hoạch khảo thí & kiểm định Học kỳ I..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại chu kỳ</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                >
                  <option value="WEEKLY">Theo Tuần</option>
                  <option value="MONTHLY">Theo Tháng</option>
                  <option value="SEMESTER">Theo Học kỳ</option>
                  <option value="ACADEMIC_YEAR">Theo Năm học</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nhãn kỳ kế hoạch *</label>
                <input
                  required
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  placeholder="VD: Tháng 11/2026 hoặc Học kỳ I (2026-2027)"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Từ ngày *</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Đến ngày *</label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Mục tiêu trọng tâm (OKRs / Kết quả kỳ vọng)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setObjectives((prev) => [
                      ...prev,
                      { id: `obj_${Date.now()}`, title: "", targetMetric: "" },
                    ])
                  }
                  className="text-[#00736E] font-semibold hover:underline"
                >
                  + Thêm mục tiêu
                </button>
              </div>

              {objectives.map((obj, idx) => (
                <div key={obj.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={obj.title}
                    onChange={(e) =>
                      setObjectives((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, title: e.target.value } : o))
                      )
                    }
                    placeholder={`Mục tiêu ${idx + 1}...`}
                    className="rounded-xl border border-[#E2E8F0] px-3 py-1.5"
                  />
                  <input
                    type="text"
                    value={obj.targetMetric}
                    onChange={(e) =>
                      setObjectives((prev) =>
                        prev.map((o, i) =>
                          i === idx ? { ...o, targetMetric: e.target.value } : o
                        )
                      )
                    }
                    placeholder="Chỉ số kết quả cần đạt (VD: 100% đúng hạn)"
                    className="rounded-xl border border-[#E2E8F0] px-3 py-1.5"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3.5 py-2 rounded-xl font-semibold text-slate-600 border border-[#E2E8F0]"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl font-semibold bg-[#003B3A] text-white"
              >
                {saving ? "Đang lưu..." : "Lưu kế hoạch"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Lịch sử Phiên bản Kế hoạch */}
      {versionsModalPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#003B3A]">
                Lịch sử điều chỉnh kế hoạch {versionsModalPlan.planCode}
              </h3>
              <button
                type="button"
                onClick={() => setVersionsModalPlan(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto tabular-nums">
              {versionsList.map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-[#003B3A]">
                    <span>Phiên bản trước điều chỉnh: v{v.versionNumber}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(v.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="text-slate-600">Người điều chỉnh: {v.changedByName}</div>
                  <div className="text-[#D97706] font-medium">
                    Lý do điều chỉnh: {v.adjustmentReason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
