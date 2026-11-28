"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import type {
  KtdbclPositionDef,
  RaciRoleCode,
} from "@/lib/qa-workspace/positionRaciParser"
import { POSITION_NAME_BY_CODE } from "@/lib/qa-workspace/positionRaciParser"
import type {
  PositionStaffMapping,
  PositionTaskTemplateRecord,
} from "@/lib/qa-workspace/positionRaciSchema"
import {
  reseedPositionRaciAction,
  savePositionStaffAssignmentsAction,
  updatePositionTaskTemplateAction,
} from "../position_raci_actions"

export interface PositionCatalogBundle {
  positions: KtdbclPositionDef[]
  staffMappings: PositionStaffMapping[]
  templates: PositionTaskTemplateRecord[]
}

interface PositionTasksViewProps {
  catalog: PositionCatalogBundle
  onCatalogChange: (next: PositionCatalogBundle) => void
  allStaffUsers: any[]
  canConfigure: boolean
  onAssignFromTemplate: (
    template: PositionTaskTemplateRecord,
    selectedPositionCode?: string | null
  ) => void
}

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Tuần",
  MONTHLY: "Tháng",
  SEMESTER: "Kỳ học",
  YEARLY: "Năm học",
  EVENT: "Theo kỳ/đợt",
}

export function PositionTasksView({
  catalog,
  onCatalogChange,
  allStaffUsers,
  canConfigure,
  onAssignFromTemplate,
}: PositionTasksViewProps) {
  const [selectedPositionCode, setSelectedPositionCode] = useState<string>(
    catalog.positions[0]?.positionCode || "VT293"
  )
  const [selectedRaciRole, setSelectedRaciRole] = useState<"ALL" | RaciRoleCode>("R")
  const [selectedFunctionGroup, setSelectedFunctionGroup] = useState<string>("ALL")
  const [selectedCadence, setSelectedCadence] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [syncingRaci, setSyncingRaci] = useState(false)

  // Staff assignment modal state
  const [staffModalPosCode, setStaffModalPosCode] = useState<string | null>(null)
  const [staffModalUserIds, setStaffModalUserIds] = useState<string[]>([])
  const [staffModalPrimaryId, setStaffModalPrimaryId] = useState<string>("")
  const [staffSearch, setStaffSearch] = useState("")
  const [savingStaff, setSavingStaff] = useState(false)

  // Edit template modal state
  const [editingTpl, setEditingTpl] = useState<PositionTaskTemplateRecord | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDetailTask, setEditDetailTask] = useState("")
  const [editFrequency, setEditFrequency] = useState("")
  const [editDeliverables, setEditDeliverables] = useState("")
  const [editKpiTarget, setEditKpiTarget] = useState("")
  const [editCriteria, setEditCriteria] = useState("")
  const [editAdminNote, setEditAdminNote] = useState("")
  const [savingTpl, setSavingTpl] = useState(false)

  const staffByPosition = useMemo(() => {
    const map = new Map<string, PositionStaffMapping[]>()
    for (const sm of catalog.staffMappings) {
      if (!map.has(sm.positionCode)) map.set(sm.positionCode, [])
      map.get(sm.positionCode)!.push(sm)
    }
    return map
  }, [catalog.staffMappings])

  const roleCountsByPosition = useMemo(() => {
    const map = new Map<string, { R: number; C: number; I: number }>()
    for (const pos of catalog.positions) {
      map.set(pos.positionCode, { R: 0, C: 0, I: 0 })
    }
    for (const tpl of catalog.templates) {
      if (!tpl.isActive && !showInactive) continue
      for (const link of tpl.raciLinks) {
        const entry = map.get(link.positionCode)
        if (!entry) continue
        if (link.raciRole === "R") entry.R++
        else if (link.raciRole === "C") entry.C++
        else if (link.raciRole === "I") entry.I++
      }
    }
    return map
  }, [catalog.positions, catalog.templates, showInactive])

  const functionGroups = useMemo(() => {
    return Array.from(new Set(catalog.templates.map((t) => t.functionGroup).filter(Boolean)))
  }, [catalog.templates])

  const selectedPosition = useMemo(() => {
    if (selectedPositionCode === "ALL") return null
    return catalog.positions.find((p) => p.positionCode === selectedPositionCode) || null
  }, [catalog.positions, selectedPositionCode])

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return catalog.templates.filter((tpl) => {
      if (!showInactive && !tpl.isActive) return false
      if (selectedFunctionGroup !== "ALL" && tpl.functionGroup !== selectedFunctionGroup) {
        return false
      }
      if (selectedCadence !== "ALL" && !tpl.reportCadences.includes(selectedCadence as any)) {
        return false
      }

      if (selectedPositionCode !== "ALL") {
        const link = tpl.raciLinks.find((l) => l.positionCode === selectedPositionCode)
        if (!link) return false
        if (selectedRaciRole !== "ALL" && link.raciRole !== selectedRaciRole) return false
      } else if (selectedRaciRole !== "ALL") {
        const hasRole = tpl.raciLinks.some((l) => l.raciRole === selectedRaciRole)
        if (!hasRole) return false
      }

      if (q) {
        const hay = `${tpl.itemCode} ${tpl.title} ${tpl.mainTask} ${tpl.detailTask} ${tpl.deliverables} ${tpl.kpiTarget} ${tpl.adminNote || ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [
    catalog.templates,
    showInactive,
    selectedFunctionGroup,
    selectedCadence,
    selectedPositionCode,
    selectedRaciRole,
    searchQuery,
  ])

  const openStaffModal = (posCode: string) => {
    const current = staffByPosition.get(posCode) || []
    setStaffModalPosCode(posCode)
    setStaffModalUserIds(current.map((s) => s.userId))
    setStaffModalPrimaryId(current.find((s) => s.isPrimary)?.userId || current[0]?.userId || "")
    setStaffSearch("")
  }

  const handleSaveStaffModal = async () => {
    if (!staffModalPosCode) return
    setSavingStaff(true)
    try {
      const res: any = await savePositionStaffAssignmentsAction({
        positionCode: staffModalPosCode,
        userIds: staffModalUserIds,
        primaryUserId: staffModalPrimaryId || staffModalUserIds[0] || null,
      })
      if (res.success && res.data) {
        onCatalogChange(res.data)
        toast.success(`Đã cập nhật nhân sự giữ vị trí ${staffModalPosCode}`)
        setStaffModalPosCode(null)
      } else {
        toast.error(res.error || "Không lưu được nhân sự giữ vị trí")
      }
    } finally {
      setSavingStaff(false)
    }
  }

  const openEditTemplateModal = (tpl: PositionTaskTemplateRecord) => {
    setEditingTpl(tpl)
    setEditTitle(tpl.title)
    setEditDetailTask(tpl.detailTask)
    setEditFrequency(tpl.frequency)
    setEditDeliverables(tpl.deliverables)
    setEditKpiTarget(tpl.kpiTarget)
    setEditCriteria(tpl.completionCriteria)
    setEditAdminNote(tpl.adminNote || "")
  }

  const handleSaveTemplateEdit = async () => {
    if (!editingTpl) return
    setSavingTpl(true)
    try {
      const res: any = await updatePositionTaskTemplateAction({
        templateId: editingTpl.id,
        title: editTitle,
        detailTask: editDetailTask,
        frequency: editFrequency,
        deliverables: editDeliverables,
        kpiTarget: editKpiTarget,
        completionCriteria: editCriteria,
        adminNote: editAdminNote || null,
      })
      if (res.success && res.data) {
        onCatalogChange(res.data)
        toast.success(
          `Đã cập nhật mẫu ${editingTpl.itemCode} lên phiên bản v${res.version} (công việc cũ vẫn giữ nguyên lịch sử)`
        )
        setEditingTpl(null)
      } else {
        toast.error(res.error || "Không cập nhật được mẫu nhiệm vụ")
      }
    } finally {
      setSavingTpl(false)
    }
  }

  const handleToggleActive = async (tpl: PositionTaskTemplateRecord) => {
    const res: any = await updatePositionTaskTemplateAction({
      templateId: tpl.id,
      isActive: !tpl.isActive,
    })
    if (res.success && res.data) {
      onCatalogChange(res.data)
      toast.success(
        tpl.isActive
          ? `Đã ngừng áp dụng mẫu ${tpl.itemCode}`
          : `Đã kích hoạt lại mẫu ${tpl.itemCode}`
      )
    } else {
      toast.error(res.error || "Không cập nhật được trạng thái mẫu")
    }
  }

  const handleReseedRaci = async () => {
    setSyncingRaci(true)
    try {
      const res: any = await reseedPositionRaciAction(false)
      if (res.success && res.data) {
        onCatalogChange(res.data)
        toast.success(
          `Đã đối soát đồng bộ ${res.stats?.positionsCount || 7} vị trí và ${res.stats?.templatesCount || 78} mẫu nhiệm vụ RACI`
        )
      } else {
        toast.error(res.error || "Lỗi đồng bộ Ma trận RACI")
      }
    } finally {
      setSyncingRaci(false)
    }
  }

  const filteredStaffOptions = useMemo(() => {
    const q = staffSearch.trim().toLowerCase()
    return (allStaffUsers || []).filter((u: any) => {
      if (!q) return true
      return (
        String(u.fullName || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q)
      )
    })
  }, [allStaffUsers, staffSearch])

  return (
    <div className="space-y-5 tabular-nums">
      {/* 1. HEADER & 07 POSITION SELECTOR GRID */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#F1F5F9]">
          <div className="border-l-4 border-[#003B3A] pl-3">
            <h2 className="text-sm sm:text-base font-bold text-[#003B3A]">
              Nhiệm vụ theo vị trí — Ban Khảo thí &amp; Đảm bảo chất lượng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuẩn hóa 07 vị trí &amp; {catalog.templates.length} mẫu nhiệm vụ từ Ma trận RACI (Accountable: VT123 — Trưởng phòng KT&amp;ĐBCL Dạy và Học)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPositionCode("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                selectedPositionCode === "ALL"
                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                  : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
              }`}
            >
              Tất cả 07 vị trí ({catalog.templates.length} mẫu)
            </button>

            {canConfigure && (
              <button
                type="button"
                disabled={syncingRaci}
                onClick={handleReseedRaci}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-50 cursor-pointer"
                title="Chạy kiểm tra đồng bộ idempotent từ Ma trận RACI chuẩn hóa (giữ nguyên phân công nhân sự)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRaci ? "animate-spin" : ""}`} />
                Đối soát Ma trận RACI
              </button>
            )}
          </div>
        </div>

        {/* 07 Position Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {catalog.positions.map((pos) => {
            const isSelected = selectedPositionCode === pos.positionCode
            const counts = roleCountsByPosition.get(pos.positionCode) || { R: 0, C: 0, I: 0 }
            const assignedStaff = staffByPosition.get(pos.positionCode) || []

            return (
              <div
                key={pos.positionCode}
                onClick={() => setSelectedPositionCode(pos.positionCode)}
                className={`rounded-xl border p-3 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm"
                    : "bg-[#F8FAFC]/80 text-[#003B3A] border-[#E2E8F0] hover:border-[#00A19A] hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSelected
                          ? "bg-white/15 text-[#5EEAD4]"
                          : "bg-[#003B3A] text-white"
                      }`}
                    >
                      {pos.positionCode}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? "text-teal-100" : "text-[#00736E]"
                      }`}
                    >
                      R: {counts.R} · C: {counts.C}
                    </span>
                  </div>
                  <div className="text-xs font-bold leading-snug mt-1.5 line-clamp-2">
                    {pos.positionName}
                  </div>
                </div>

                <div
                  className={`pt-2 border-t text-[10px] flex items-center justify-between gap-1 ${
                    isSelected ? "border-white/15 text-teal-100" : "border-[#E2E8F0] text-slate-500"
                  }`}
                >
                  <span className="truncate">
                    {assignedStaff.length > 0
                      ? assignedStaff.map((s) => s.fullName.split(" ").slice(-2).join(" ")).join(", ")
                      : "Chưa gán nhân sự"}
                  </span>
                  {canConfigure && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openStaffModal(pos.positionCode)
                      }}
                      title={`Gán nhân sự giữ vị trí ${pos.positionCode}`}
                      className={`p-1 rounded hover:bg-black/10 shrink-0 cursor-pointer ${
                        isSelected ? "text-[#5EEAD4]" : "text-[#00736E]"
                      }`}
                    >
                      <UserPlus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Position Profile Detail Strip */}
        {selectedPosition && (
          <div className="rounded-xl bg-[#F0FDFA]/70 border border-teal-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-xs font-bold">
                  {selectedPosition.positionCode}
                </span>
                <h3 className="text-sm font-bold text-[#003B3A]">
                  {selectedPosition.positionName}
                </h3>
                <span className="text-xs text-[#00736E] font-medium">
                  ({selectedPosition.shortCode})
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-teal-200 text-[11px] font-semibold text-[#059669]">
                  A: VT123 — Trưởng phòng KT&amp;ĐBCL
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
                {selectedPosition.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {(staffByPosition.get(selectedPosition.positionCode) || []).map((st) => (
                  <span
                    key={st.userId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-xs font-semibold text-[#003B3A]"
                  >
                    <Users className="w-3 h-3 text-[#00736E]" />
                    {st.fullName}
                    {st.isPrimary && (
                      <span className="text-[10px] text-[#059669] font-bold">(Chính)</span>
                    )}
                  </span>
                ))}
              </div>
              {canConfigure && (
                <button
                  type="button"
                  onClick={() => openStaffModal(selectedPosition.positionCode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  Gán nhân sự vị trí
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. FILTER BAR & ACADEMIC LEDGER TABLE OF POSITION TEMPLATES */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* RACI Role Segmented Control (Default: R) */}
            <div className="inline-flex items-center bg-white p-1 rounded-xl border border-[#E2E8F0]">
              {(
                [
                  { id: "R", label: "Thực hiện (R)" },
                  { id: "C", label: "Tham vấn (C)" },
                  { id: "I", label: "Nhận thông tin (I)" },
                  { id: "ALL", label: "Tất cả RACI" },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRaciRole(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedRaciRole === r.id
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <select
              value={selectedFunctionGroup}
              onChange={(e) => setSelectedFunctionGroup(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 max-w-[230px]"
            >
              <option value="ALL">Tất cả nhóm nghiệp vụ ({functionGroups.length})</option>
              {functionGroups.map((fg) => (
                <option key={fg} value={fg}>
                  {fg}
                </option>
              ))}
            </select>

            <select
              value={selectedCadence}
              onChange={(e) => setSelectedCadence(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">Mọi chu kỳ báo cáo</option>
              <option value="WEEKLY">Báo cáo Tuần</option>
              <option value="MONTHLY">Báo cáo Tháng</option>
              <option value="SEMESTER">Báo cáo Kỳ học</option>
              <option value="YEARLY">Báo cáo Năm học</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã mục (2.4.1, 4.6.2), tên việc..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl text-slate-700 w-56 focus:outline-none focus:border-[#00A19A]"
              />
            </div>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-300 text-[#00736E]"
              />
              Hiện mẫu ngừng áp dụng
            </label>

            <span className="text-xs font-semibold text-[#003B3A] bg-white px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
              {filteredTemplates.length} mẫu
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse tabular-nums">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-white w-24">Mã mục</th>
                <th className="py-3 px-3 text-white min-w-[270px]">Nhiệm vụ chi tiết &amp; Nhóm nghiệp vụ</th>
                <th className="py-3 px-3 text-[#5EEAD4] min-w-[190px]">Phân vai RACI</th>
                <th className="py-3 px-3 text-teal-100 min-w-[130px]">Tần suất &amp; Kỳ BC</th>
                <th className="py-3 px-3 text-teal-100 min-w-[250px]">Đầu ra (Deliverables) &amp; KPI</th>
                <th className="py-3 px-3 text-white text-right min-w-[165px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                    Không có mẫu nhiệm vụ nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isMultiR = tpl.rPositions.length > 1
                  return (
                    <tr
                      key={tpl.id}
                      className={`transition-colors align-top ${
                        !tpl.isActive
                          ? "bg-slate-50/70 opacity-65"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-[#003B3A]">{tpl.itemCode}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">v{tpl.version}</div>
                        {!tpl.isActive && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                            Ngừng áp dụng
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="font-semibold text-[#003B3A] leading-snug">
                          {tpl.detailTask}
                        </div>
                        <div className="text-[11px] text-slate-500">{tpl.mainTask}</div>
                        {tpl.adminNote && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold mt-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {tpl.adminNote}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-[#003B3A]">R:</span>
                          {tpl.rPositions.map((code) => (
                            <span
                              key={code}
                              title={POSITION_NAME_BY_CODE[code] || code}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#003B3A] text-white"
                            >
                              {code}
                            </span>
                          ))}
                          {isMultiR && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200">
                              Phối hợp chung 1 việc
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="font-bold text-[#059669]">A:</span>
                          <span
                            title={POSITION_NAME_BY_CODE[tpl.accountablePositionCode]}
                            className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-200 font-semibold"
                          >
                            {tpl.accountablePositionCode}
                          </span>
                          {tpl.cPositions.length > 0 && (
                            <>
                              <span className="font-bold text-[#D97706] ml-1">C:</span>
                              {tpl.cPositions.map((code) => (
                                <span
                                  key={code}
                                  title={POSITION_NAME_BY_CODE[code] || code}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 text-[#D97706] border border-amber-200 font-medium"
                                >
                                  {code}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="text-xs font-medium text-slate-700">{tpl.frequency}</div>
                        <div className="flex flex-wrap gap-1">
                          {tpl.reportCadences.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F8FAFC] text-[#00736E] border border-[#E2E8F0]"
                            >
                              {CADENCE_LABELS[c] || c}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="text-xs text-slate-700 leading-snug">
                          {tpl.deliverables}
                        </div>
                        {tpl.kpiTarget && (
                          <div className="text-[11px] text-[#00736E] bg-[#F0FDFA]/70 border border-teal-100 rounded-lg px-2 py-1 leading-snug">
                            <span className="font-semibold">KPI: </span>
                            {tpl.kpiTarget}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1.5">
                          {tpl.isActive && (
                            <button
                              type="button"
                              onClick={() =>
                                onAssignFromTemplate(
                                  tpl,
                                  selectedPositionCode !== "ALL"
                                    ? selectedPositionCode
                                    : tpl.rPositions[0]
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#003B3A] hover:bg-[#005250] text-white transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                              Giao việc từ mẫu
                            </button>
                          )}

                          {canConfigure && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditTemplateModal(tpl)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0] cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-[#00736E]" />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(tpl)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                  tpl.isActive
                                    ? "bg-rose-50 text-[#E11D48] border-rose-200 hover:bg-rose-100"
                                    : "bg-emerald-50 text-[#059669] border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                {tpl.isActive ? (
                                  <>
                                    <PauseCircle className="w-3 h-3" /> Ngừng
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-3 h-3" /> Bật lại
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: GÁN NHÂN SỰ GIỮ VỊ TRÍ */}
      {staffModalPosCode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#5EEAD4]" />
                  Gán nhân sự giữ vị trí {staffModalPosCode}
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  {POSITION_NAME_BY_CODE[staffModalPosCode] || staffModalPosCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffModalPosCode(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Tìm tên hoặc email nhân sự SSM..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#00A19A]"
              />

              <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl">
                {filteredStaffOptions.map((u: any) => {
                  const checked = staffModalUserIds.includes(u.id)
                  const isPrimary = staffModalPrimaryId === u.id
                  return (
                    <div
                      key={u.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStaffModalUserIds((prev) => [...prev, u.id])
                              if (!staffModalPrimaryId) setStaffModalPrimaryId(u.id)
                            } else {
                              setStaffModalUserIds((prev) => prev.filter((id) => id !== u.id))
                              if (staffModalPrimaryId === u.id) setStaffModalPrimaryId("")
                            }
                          }}
                          className="rounded border-slate-300 text-[#00736E]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#003B3A] truncate">
                            {u.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                        </div>
                      </label>

                      {checked && (
                        <button
                          type="button"
                          onClick={() => setStaffModalPrimaryId(u.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer ${
                            isPrimary
                              ? "bg-[#059669] text-white border-[#059669]"
                              : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#059669]"
                          }`}
                        >
                          {isPrimary ? "Đầu mối chính" : "Đặt làm chính"}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModalPosCode(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingStaff}
                  onClick={handleSaveStaffModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#005250] text-white disabled:opacity-50 cursor-pointer"
                >
                  {savingStaff ? "Đang lưu..." : "Lưu phân công vị trí"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA MẪU NHIỆM VỤ (TĂNG VERSION, BẢO TOÀN SNAPSHOT VIỆC CŨ) */}
      {editingTpl && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  Cập nhật mẫu nhiệm vụ {editingTpl.itemCode} (hiện tại: v{editingTpl.version})
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  Thay đổi sẽ tạo phiên bản v{editingTpl.version + 1} — các công việc đã giao trước đó vẫn giữ nguyên nội dung gốc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTpl(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề mẫu</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả nhiệm vụ chi tiết</label>
                <textarea
                  rows={2}
                  value={editDetailTask}
                  onChange={(e) => setEditDetailTask(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tần suất</label>
                  <input
                    type="text"
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ghi chú quản trị</label>
                  <input
                    type="text"
                    value={editAdminNote}
                    onChange={(e) => setEditAdminNote(e.target.value)}
                    placeholder="VD: Cần xác nhận đối tượng khảo sát"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kết quả đầu ra (Deliverables)</label>
                <textarea
                  rows={2}
                  value={editDeliverables}
                  onChange={(e) => setEditDeliverables(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">KPI cụ thể</label>
                <textarea
                  rows={2}
                  value={editKpiTarget}
                  onChange={(e) => setEditKpiTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu chí đánh giá hoàn thành</label>
                <textarea
                  rows={2}
                  value={editCriteria}
                  onChange={(e) => setEditCriteria(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTpl(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingTpl}
                onClick={handleSaveTemplateEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#005250] text-white disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5EEAD4]" />
                {savingTpl ? "Đang lưu..." : `Lưu phiên bản v${editingTpl.version + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
