"use client"

import React, { useMemo, useState } from "react"
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  ListChecks,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
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
  assignTemplatesToPositionAction,
  batchCreateTasksFromPositionTemplatesAction,
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
  years?: any[]
  campuses?: any[]
  canConfigure: boolean
  onAssignFromTemplate: (
    template: PositionTaskTemplateRecord,
    selectedPositionCode?: string | null
  ) => void
  onBatchTasksCreated?: () => void
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
  years = [],
  campuses = [],
  canConfigure,
  onAssignFromTemplate,
  onBatchTasksCreated,
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

  // Assign templates to position modal state
  const [assignTplPosCode, setAssignTplPosCode] = useState<string | null>(null)
  const [assignTplRole, setAssignTplRole] = useState<"R" | "C" | "I">("R")
  const [assignTplIds, setAssignTplIds] = useState<string[]>([])
  const [assignTplSearch, setAssignTplSearch] = useState("")
  const [savingAssignTpls, setSavingAssignTpls] = useState(false)

  // Multi-select checkboxes & Batch Create Tasks modal state
  const [checkedTemplateIds, setCheckedTemplateIds] = useState<Set<string>>(new Set())
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchAssigneeId, setBatchAssigneeId] = useState("")
  const [batchStartDate, setBatchStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [batchEndDate, setBatchEndDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  )
  const [batchYearId, setBatchYearId] = useState<string>(years[0]?.id || "")
  const [batchCampusId, setBatchCampusId] = useState<string>("")
  const [batchPeriodNote, setBatchPeriodNote] = useState<string>("")
  const [batchSendMail, setBatchSendMail] = useState<boolean>(true)
  const [submittingBatch, setSubmittingBatch] = useState(false)

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

  const openAssignTemplatesModal = (posCode: string, role: "R" | "C" | "I" = "R") => {
    setAssignTplPosCode(posCode)
    setAssignTplRole(role)
    const matched = catalog.templates
      .filter((t) => t.raciLinks.some((l) => l.positionCode === posCode && l.raciRole === role))
      .map((t) => t.id)
    setAssignTplIds(matched)
    setAssignTplSearch("")
  }

  const handleChangeAssignTplRole = (nextRole: "R" | "C" | "I") => {
    if (!assignTplPosCode) return
    setAssignTplRole(nextRole)
    const matched = catalog.templates
      .filter((t) =>
        t.raciLinks.some((l) => l.positionCode === assignTplPosCode && l.raciRole === nextRole)
      )
      .map((t) => t.id)
    setAssignTplIds(matched)
  }

  const handleSaveAssignTemplates = async () => {
    if (!assignTplPosCode) return
    setSavingAssignTpls(true)
    try {
      const res: any = await assignTemplatesToPositionAction({
        positionCode: assignTplPosCode,
        templateIds: assignTplIds,
        raciRole: assignTplRole,
      })
      if (res.success && res.data) {
        onCatalogChange(res.data)
        toast.success(
          `Đã gán ${res.assignedCount} mẫu nhiệm vụ (vai trò ${assignTplRole}) cho vị trí ${assignTplPosCode}`
        )
        setAssignTplPosCode(null)
      } else {
        toast.error(res.error || "Không lưu được danh sách nhiệm vụ cho vị trí")
      }
    } finally {
      setSavingAssignTpls(false)
    }
  }

  const openBatchAssignModal = () => {
    const posCode = selectedPositionCode !== "ALL" ? selectedPositionCode : "VT293"
    const staffForPos = staffByPosition.get(posCode) || []
    const defaultStaff = staffForPos.find((s) => s.isPrimary)?.userId || staffForPos[0]?.userId || ""
    setBatchAssigneeId(defaultStaff)
    setBatchYearId(years[0]?.id || "")
    setShowBatchModal(true)
  }

  const handleSubmitBatchCreate = async () => {
    const posCode = selectedPositionCode !== "ALL" ? selectedPositionCode : "VT293"
    if (!batchAssigneeId) {
      toast.error("Vui lòng chọn nhân sự phụ trách chính")
      return
    }
    const ids = Array.from(checkedTemplateIds)
    if (ids.length === 0) return

    setSubmittingBatch(true)
    try {
      const res: any = await batchCreateTasksFromPositionTemplatesAction({
        positionCode: posCode,
        templateIds: ids,
        assignedToUserId: batchAssigneeId,
        startDate: batchStartDate,
        endDate: batchEndDate,
        academicYearId: batchYearId || null,
        scopeCampusId: batchCampusId || null,
        scopeSurveyPeriod: batchPeriodNote.trim() || null,
        sendEmailNotification: batchSendMail,
      })
      if (res.success) {
        toast.success(
          `Đã giao thành công ${res.createdCount} nhiệm vụ chuẩn RACI cho vị trí ${posCode} (${res.emailsSentCount || 0} email)`
        )
        setCheckedTemplateIds(new Set())
        setShowBatchModal(false)
        if (onBatchTasksCreated) onBatchTasksCreated()
      } else {
        toast.error(res.error || "Không thể giao việc hàng loạt")
      }
    } finally {
      setSubmittingBatch(false)
    }
  }

  const allFilteredActiveIds = useMemo(
    () => filteredTemplates.filter((t) => t.isActive).map((t) => t.id),
    [filteredTemplates]
  )
  const allChecked =
    allFilteredActiveIds.length > 0 &&
    allFilteredActiveIds.every((id) => checkedTemplateIds.has(id))

  const toggleCheckAll = () => {
    if (allChecked) {
      setCheckedTemplateIds(new Set())
    } else {
      setCheckedTemplateIds(new Set(allFilteredActiveIds))
    }
  }

  const toggleCheckOne = (id: string) => {
    setCheckedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
              {canConfigure
                ? "Nhiệm vụ theo vị trí — Ban Khảo thí & Đảm bảo chất lượng"
                : "Nhiệm vụ theo vị trí được gán cho bạn"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {canConfigure
                ? `Chuẩn hóa ${catalog.positions.length} vị trí & ${catalog.templates.length} mẫu nhiệm vụ từ Ma trận RACI (Accountable: VT123 — Trưởng phòng KT&ĐBCL Dạy và Học)`
                : `Chế độ xem cá nhân: chỉ hiển thị ${catalog.positions.length} vị trí & ${catalog.templates.length} mẫu nhiệm vụ RACI được gán cho tài khoản của bạn.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(canConfigure || catalog.positions.length > 1) && (
              <button
                type="button"
                onClick={() => setSelectedPositionCode("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  selectedPositionCode === "ALL"
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                }`}
              >
                {canConfigure
                  ? `Tất cả ${catalog.positions.length} vị trí (${catalog.templates.length} mẫu)`
                  : `Tất cả vị trí của tôi (${catalog.positions.length})`}
              </button>
            )}

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

        {/* Position Cards (or Personal Empty State) */}
        {catalog.positions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-6 text-center text-xs text-slate-600">
            Tài khoản của bạn hiện chưa được gán vào vị trí RACI nào trong Ban KT&amp;ĐBCL. Vui lòng liên hệ Trưởng phòng / Quản trị Ban để được phân công vị trí.
          </div>
        ) : (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            catalog.positions.length <= 2
              ? "lg:grid-cols-2"
              : catalog.positions.length <= 4
              ? "lg:grid-cols-4"
              : "lg:grid-cols-4 xl:grid-cols-7"
          } gap-2.5`}
        >
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
        )}

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
                <>
                  <button
                    type="button"
                    onClick={() => openAssignTemplatesModal(selectedPosition.positionCode, "R")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#00736E] text-white hover:bg-[#005B58] transition-colors cursor-pointer"
                  >
                    <ListChecks className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    Gán nhiệm vụ cho vị trí
                  </button>
                  <button
                    type="button"
                    onClick={() => openStaffModal(selectedPosition.positionCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    Gán nhân sự vị trí
                  </button>
                </>
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

            {canConfigure && checkedTemplateIds.size > 0 && (
              <button
                type="button"
                onClick={openBatchAssignModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Giao việc hàng loạt ({checkedTemplateIds.size} mẫu)
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse tabular-nums">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                {canConfigure && (
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleCheckAll}
                      title="Chọn tất cả mẫu đang hiển thị để giao việc hàng loạt"
                      className="rounded border-white/40 text-[#00A19A] cursor-pointer"
                    />
                  </th>
                )}
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
                  <td colSpan={canConfigure ? 7 : 6} className="py-10 text-center text-slate-500 text-xs">
                    Không có mẫu nhiệm vụ nào khớp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isMultiR = tpl.rPositions.length > 1
                  const isChecked = checkedTemplateIds.has(tpl.id)
                  return (
                    <tr
                      key={tpl.id}
                      className={`transition-colors align-top ${
                        !tpl.isActive
                          ? "bg-slate-50/70 opacity-65"
                          : isChecked
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {canConfigure && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            disabled={!tpl.isActive}
                            checked={isChecked}
                            onChange={() => toggleCheckOne(tpl.id)}
                            className="rounded border-slate-300 text-[#00736E] cursor-pointer disabled:opacity-40"
                          />
                        </td>
                      )}
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
                placeholder="Tìm nhân sự thuộc Ban KT&ĐBCL..."
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

      {/* MODAL 3: GÁN DANH SÁCH MẪU NHIỆM VỤ CHO TỪNG VỊ TRÍ */}
      {assignTplPosCode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-[#5EEAD4]" />
                  Gán nhiệm vụ theo Ma trận chức năng cho {assignTplPosCode}
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  {POSITION_NAME_BY_CODE[assignTplPosCode] || assignTplPosCode} · Đang chọn{" "}
                  <strong>{assignTplIds.length}</strong> mẫu ở vai trò {assignTplRole}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignTplPosCode(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex bg-white p-1 rounded-xl border border-[#E2E8F0]">
                {(
                  [
                    { id: "R", label: "Vai trò R (Thực hiện)" },
                    { id: "C", label: "Vai trò C (Tham vấn)" },
                    { id: "I", label: "Vai trò I (Nhận thông tin)" },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleChangeAssignTplRole(r.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      assignTplRole === r.id
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-[#003B3A]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={assignTplSearch}
                onChange={(e) => setAssignTplSearch(e.target.value)}
                placeholder="Tìm mã mục (2.1.1, 4.6.2...) hoặc tên nhiệm vụ..."
                className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl w-64 focus:outline-none focus:border-[#00A19A]"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] p-2">
              {catalog.templates
                .filter((t) => {
                  const q = assignTplSearch.trim().toLowerCase()
                  if (!q) return true
                  return `${t.itemCode} ${t.detailTask} ${t.mainTask} ${t.deliverables}`
                    .toLowerCase()
                    .includes(q)
                })
                .map((t) => {
                  const checked = assignTplIds.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        checked ? "bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignTplIds((prev) => Array.from(new Set([...prev, t.id])))
                          } else {
                            setAssignTplIds((prev) => prev.filter((id) => id !== t.id))
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-[#00736E]"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#003B3A]">{t.itemCode}</span>
                          <span className="font-semibold text-slate-800">{t.detailTask}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tần suất: {t.frequency} · Hiện R: {t.rPositions.join(", ") || "—"}
                        </div>
                      </div>
                    </label>
                  )
                })}
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-slate-600">
                Đã chọn <strong className="text-[#003B3A]">{assignTplIds.length}</strong> /{" "}
                {catalog.templates.length} mẫu nhiệm vụ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignTplPosCode(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-[#E2E8F0] hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingAssignTpls}
                  onClick={handleSaveAssignTemplates}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#005250] text-white disabled:opacity-50 cursor-pointer"
                >
                  {savingAssignTpls ? "Đang lưu..." : `Lưu phân vai ${assignTplRole} cho ${assignTplPosCode}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: GIAO VIỆC HÀNG LOẠT THEO VỊ TRÍ */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#5EEAD4]" />
                  Giao việc hàng loạt theo vị trí ({checkedTemplateIds.size} mẫu)
                </h3>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  Tự động gắn mã mục RACI, snapshot phiên bản mẫu, KPI &amp; chu kỳ báo cáo Tuần/Tháng/Kỳ học.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nhân sự Ban KT&amp;ĐBCL chịu trách nhiệm chính * ({(allStaffUsers || []).length} nhân sự)
                </label>
                <select
                  value={batchAssigneeId}
                  onChange={(e) => setBatchAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white font-semibold text-[#003B3A]"
                >
                  <option value="">-- Chọn nhân sự Ban KT&amp;ĐBCL --</option>
                  {(allStaffUsers || []).map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} {u.position ? `· ${u.position}` : ""} {u.email ? `(${u.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={(e) => setBatchStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn hoàn thành *</label>
                  <input
                    type="date"
                    value={batchEndDate}
                    onChange={(e) => setBatchEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Năm học</label>
                  <select
                    value={batchYearId}
                    onChange={(e) => setBatchYearId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                  >
                    <option value="">-- Chọn năm học --</option>
                    {years.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cơ sở áp dụng</label>
                  <select
                    value={batchCampusId}
                    onChange={(e) => setBatchCampusId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white"
                  >
                    <option value="">Toàn hệ thống</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.campusName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kỳ kiểm tra / Đợt khảo sát (nếu có)
                </label>
                <input
                  type="text"
                  value={batchPeriodNote}
                  onChange={(e) => setBatchPeriodNote(e.target.value)}
                  placeholder="VD: Giữa kỳ 1, Đợt KSDV Tháng 11, Học kỳ 1..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={batchSendMail}
                  onChange={(e) => setBatchSendMail(e.target.checked)}
                  className="rounded border-slate-300 text-[#00736E]"
                />
                Gửi email thông báo giao việc cho nhân sự nhận nhiệm vụ
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={submittingBatch}
                  onClick={handleSubmitBatchCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] hover:bg-[#005250] text-white disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  {submittingBatch
                    ? "Đang phát hành..."
                    : `Xác nhận giao ${checkedTemplateIds.size} nhiệm vụ`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
