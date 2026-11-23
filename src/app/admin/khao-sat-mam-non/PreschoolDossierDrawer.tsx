"use client"

import { useEffect, useState } from "react"
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Stethoscope,
  ClipboardCheck,
  Brain,
  CalendarPlus,
  Send,
  FileText,
  Archive,
  History,
  Printer,
  ArrowRight,
  Lock,
} from "lucide-react"
import {
  EVALUATION_FORM_CODES,
  PRESCHOOL_FORM_REGISTRY,
  PRESCHOOL_WORKFLOW_STATUS_META,
  PreschoolWorkflowStatus,
  addBusinessDays,
} from "@/lib/preschool-workflow"
import { PreschoolPrintableDocument } from "./PreschoolPrintableDocument"

interface Props {
  studentId: string | null
  onClose: () => void
  onUpdated: () => void
  staffUsers: Array<{ id: string; fullName: string; email: string; role: string }>
}

type DrawerTab = "intake" | "health" | "evaluation" | "psychology" | "review" | "letters" | "history"

export function PreschoolDossierDrawer({ studentId, onClose, onUpdated, staffUsers }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [dossier, setDossier] = useState<any>(null)
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DrawerTab>("intake")
  const [printDoc, setPrintDoc] = useState<"LETTER_17" | "LETTER_04" | "EVALUATION_FORM" | "PSYCHOLOGY_09" | null>(null)

  // Local form states
  const [intakeMode, setIntakeMode] = useState<"KHAO_SAT_MOI" | "HOC_TRAI_NGHIEM">("KHAO_SAT_MOI")
  const [assignedTeacherId, setAssignedTeacherId] = useState("")
  const [assignedMedicalId, setAssignedMedicalId] = useState("")
  const [assignedPsychologistId, setAssignedPsychologistId] = useState("")

  // B4A Health
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [physicalStatus, setPhysicalStatus] = useState("BINH_THUONG")
  const [physicalNote, setPhysicalNote] = useState("")

  // B5 / B4B / B8 Evaluation
  const [selectedFormCode, setSelectedFormCode] = useState("")
  const [criteriaRatings, setCriteriaRatings] = useState<Record<string, { result: string; note: string }>>({})
  const [generalComment, setGeneralComment] = useState("")
  const [experienceObservation, setExperienceObservation] = useState("")

  // B7A Psychology (BM.KTĐBCL.09)
  const [psyRatings, setPsyRatings] = useState<Record<string, { result: string; note: string }>>({})
  const [psyConclusion, setPsyConclusion] = useState("")
  const [msTeamsReported, setMsTeamsReported] = useState(false)
  const [msTeamsReportNote, setMsTeamsReportNote] = useState("")

  // B7B Follow-up scheduling (>= 2 business days)
  const [followUpDate, setFollowUpDate] = useState(() => addBusinessDays(new Date(), 2).toISOString().slice(0, 16))
  const [followUpNote, setFollowUpNote] = useState("")

  // B6/B9A Review & B10 Approval
  const [reviewDecision, setReviewDecision] = useState("DE_XUAT_DAT")
  const [reviewComment, setReviewComment] = useState("")
  const [gdcsComment, setGdcsComment] = useState("")
  const [approvalEmailTo, setApprovalEmailTo] = useState("")
  const [approvalEmailName, setApprovalEmailName] = useState("Giám đốc Điều hành Cơ sở")
  const [emailPreview, setEmailPreview] = useState<{ open: boolean; to: string; subject: string; html: string }>({
    open: false,
    to: "",
    subject: "",
    html: "",
  })

  // B11–B13
  const [parentConsultNote, setParentConsultNote] = useState("")
  const [deliveryNote, setDeliveryNote] = useState("")
  const [archiveNote, setArchiveNote] = useState("")

  const fetchDossier = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/preschool-workflow/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tải hồ sơ.")
      setDossier(data)
      const latest = data.activeRound || data.rounds?.[data.rounds.length - 1] || null
      setSelectedRoundId(latest?.id || null)
      hydrateRoundFields(data.student, latest, data.suggestion)
    } catch (err: any) {
      setError(err?.message || "Lỗi tải dữ liệu.")
    } finally {
      setLoading(false)
    }
  }

  const hydrateRoundFields = (student: any, round: any, suggestion: any) => {
    setIntakeMode(student?.intakeMode === "HOC_TRAI_NGHIEM" ? "HOC_TRAI_NGHIEM" : "KHAO_SAT_MOI")
    setAssignedTeacherId(round?.assignedTeacherId || "")
    setAssignedMedicalId(round?.assignedMedicalId || "")
    setAssignedPsychologistId(round?.assignedPsychologistId || "")

    setHeightCm(round?.heightCm != null ? String(round.heightCm) : "")
    setWeightKg(round?.weightKg != null ? String(round.weightKg) : "")
    setPhysicalStatus(round?.physicalStatus && round.physicalStatus !== "DA_KIEM_TRA_AN_CHI_TIET" ? round.physicalStatus : "BINH_THUONG")
    setPhysicalNote(round?.physicalNote || "")

    const fCode = round?.formCode || suggestion?.suggestedFormCode || "BM.KTĐBCL.01"
    setSelectedFormCode(fCode)
    setGeneralComment(round?.generalComment || "")
    setExperienceObservation(round?.experienceObservation || "")

    const parsedCrit: Record<string, { result: string; note: string }> = {}
    try {
      if (round?.criteriaPayloadJson) {
        const p = JSON.parse(round.criteriaPayloadJson)
        for (const c of p.criteria || []) {
          parsedCrit[c.code] = { result: c.result || "", note: c.note || "" }
        }
      }
    } catch {}
    setCriteriaRatings(parsedCrit)

    const parsedPsy: Record<string, { result: string; note: string }> = {}
    let psyConc = ""
    try {
      if (round?.psychologyPayloadJson) {
        const p = JSON.parse(round.psychologyPayloadJson)
        for (const c of p.criteria || []) {
          parsedPsy[c.code] = { result: c.result || "", note: c.note || "" }
        }
        psyConc = p.conclusionNote || ""
      }
    } catch {}
    setPsyRatings(parsedPsy)
    setPsyConclusion(psyConc)
    setMsTeamsReported(Boolean(round?.msTeamsReported))
    setMsTeamsReportNote(round?.msTeamsReportNote || "")

    setReviewDecision(round?.reviewDecision || "DE_XUAT_DAT")
    setReviewComment(round?.reviewComment || "")
    setGdcsComment(round?.gdcsComment || "")
    setParentConsultNote(student?.parentConsultationNote || "")
    setDeliveryNote(student?.resultDeliveryNote || "")
    setArchiveNote(student?.archiveNote || "")
  }

  useEffect(() => {
    if (studentId) {
      setNotice(null)
      setActiveTab("intake")
      fetchDossier(studentId)
    }
  }, [studentId])

  if (!studentId) return null

  const student = dossier?.student
  const rounds: any[] = dossier?.rounds || []
  const viewingRound = rounds.find((r) => r.id === selectedRoundId) || dossier?.activeRound || null
  const isViewingLatest = !viewingRound || viewingRound.id === dossier?.activeRound?.id
  const perms = dossier?.viewerPermissions || {}
  const gate = dossier?.preApprovalGate || { ready: false, missing: [] }
  const suggestion = dossier?.suggestion
  const wfStatus = (student?.workflowStatus || "DA_HEN") as PreschoolWorkflowStatus
  const statusMeta = PRESCHOOL_WORKFLOW_STATUS_META[wfStatus] || PRESCHOOL_WORKFLOW_STATUS_META.DA_HEN

  const runAction = async (payload: Record<string, any>, successMsg: string) => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/preschool-workflow/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, roundId: viewingRound?.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = Array.isArray(data.missing) ? ` ${data.missing.join(" ")}` : ""
        throw new Error((data.error || "Thao tác thất bại.") + detail)
      }
      setNotice(successMsg)
      await fetchDossier(studentId)
      onUpdated()
    } catch (err: any) {
      setError(err?.message || "Lỗi cập nhật.")
    } finally {
      setSaving(false)
    }
  }

  // Compute the single primary CTA appropriate for current workflowStatus
  const getPrimaryCta = (): { label: string; onClick: () => void; disabled?: boolean } | null => {
    if (!student || !isViewingLatest) return null
    if (wfStatus === "DA_HEN" && perms.canConfirmIntake) {
      return {
        label: "B3: Xác nhận đón trẻ & Bắt đầu",
        onClick: () => runAction({ action: "CONFIRM_INTAKE", intakeMode }, "Đã xác nhận đón trẻ và chuyển sang Đang đánh giá."),
      }
    }
    if (wfStatus === "DANG_DANH_GIA") {
      if (viewingRound?.roundType === "KHAO_SAT_MOI" && !viewingRound?.medicalCheckedAt && perms.canEditHealth) {
        return { label: "Mở bước B4A: Y tế kiểm tra thể chất", onClick: () => setActiveTab("health") }
      }
      if (!viewingRound?.teacherSubmittedAt && perms.canEditEvaluation) {
        return { label: "Mở bước B5/B4B: Nhập đánh giá / quan sát", onClick: () => setActiveTab("evaluation") }
      }
      if (perms.canReviewB6B9A) {
        return { label: "Mở bước B6/B9A: Nhóm trưởng MN rà soát", onClick: () => setActiveTab("review") }
      }
    }
    if (wfStatus === "CHO_PHONG_VAN_TAM_LY") {
      return { label: "Mở bước B7A: Phiếu tâm lý BM.KTĐBCL.09", onClick: () => setActiveTab("psychology") }
    }
    if (wfStatus === "CHO_TRAI_NGHIEM") {
      return { label: "Mở bước B8: Ghi quan sát trải nghiệm", onClick: () => setActiveTab("evaluation") }
    }
    if (wfStatus === "CHO_DUYET" && perms.canApproveB10) {
      return { label: "Mở bước B10: Phê duyệt Đạt / Chưa đạt", onClick: () => setActiveTab("review"), disabled: !gate.ready }
    }
    if (wfStatus === "DA_DUYET") {
      return { label: "Mở bước B11–B12: Xuất thư & Trả kết quả", onClick: () => setActiveTab("letters") }
    }
    if (wfStatus === "DA_TRA_KET_QUA" && perms.canArchive) {
      return {
        label: "B13: Hoàn tất lưu hồ sơ",
        onClick: () => runAction({ action: "ARCHIVE_RECORD", note: archiveNote }, "Đã hoàn tất lưu hồ sơ (B13)."),
      }
    }
    return null
  }

  const primaryCta = getPrimaryCta()
  const activeFormDef = PRESCHOOL_FORM_REGISTRY[selectedFormCode] || PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.01"]
  const psyFormDef = PRESCHOOL_FORM_REGISTRY["BM.KTĐBCL.09"]

  const tabs: Array<{ id: DrawerTab; label: string; icon: any }> = [
    { id: "intake", label: "B1–B3 Tiếp nhận", icon: ClipboardCheck },
    { id: "health", label: "B4A Y tế", icon: Stethoscope },
    { id: "evaluation", label: "B5/B4B Đánh giá", icon: FileText },
    { id: "psychology", label: "B7 Tâm lý & Hẹn lại", icon: Brain },
    { id: "review", label: "B6/B9A/B10 Duyệt", icon: CheckCircle2 },
    { id: "letters", label: "B11–B13 Thư & Lưu", icon: Archive },
    { id: "history", label: "Lịch sử", icon: History },
  ]

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs">
        <div className="bg-[#F8FAFC] w-full max-w-4xl h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#003B3A] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#5EEAD4] font-medium">
                <span>Hồ sơ Khảo sát Mầm non 2026</span>
                <span>·</span>
                <span className="tabular-nums">{student?.studentCode || "..."}</span>
                {student && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}>
                    {statusMeta.label}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold mt-0.5">
                {student?.fullName || "Đang tải hồ sơ..."}
                {student?.finalApprovedOutcome && (
                  <span
                    className={`ml-2.5 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      student.finalApprovedOutcome === "DAT"
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                        : "bg-rose-500/20 text-rose-200 border border-rose-400/40"
                    }`}
                  >
                    Kết quả: {student.finalApprovedOutcome === "DAT" ? "Đạt" : "Chưa đạt"}
                  </span>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {primaryCta && (
                <button
                  type="button"
                  disabled={saving || primaryCta.disabled}
                  onClick={primaryCta.onClick}
                  className="px-3.5 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {primaryCta.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-teal-100 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Round Timeline Strip */}
          {rounds.length > 0 && (
            <div className="bg-white border-b border-[#E2E8F0] px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Lịch sử các lần:</span>
              {rounds.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoundId(r.id)
                    hydrateRoundFields(student, r, suggestion)
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors shrink-0 tabular-nums cursor-pointer ${
                    viewingRound?.id === r.id
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-slate-50 text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
                  }`}
                >
                  Lần {r.roundNumber} · {r.roundType}
                  {r.formCode ? ` (${r.formCode})` : ""}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "border-[#003B3A] text-[#003B3A]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#00A19A]" />
                Đang tải chi tiết hồ sơ...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium">
                {notice}
              </div>
            )}

            {!loading && student && !isViewingLatest && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                Bạn đang xem lại dữ liệu lịch sử <strong>Lần {viewingRound?.roundNumber}</strong>. Chọn lần mới nhất để thao tác tiếp quy trình.
              </div>
            )}

            {/* TAB 1: B1–B3 INTAKE & ASSIGNMENT */}
            {!loading && student && activeTab === "intake" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs tabular-nums">
                  <div><span className="text-slate-500 block">Họ tên trẻ</span><strong className="text-slate-900">{student.fullName}</strong></div>
                  <div><span className="text-slate-500 block">Ngày sinh</span><strong>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</strong></div>
                  <div><span className="text-slate-500 block">Cơ sở</span><strong>{student.registeredCampus || student.admissionCampus || "—"}</strong></div>
                  <div><span className="text-slate-500 block">Nhóm tuổi / Lớp</span><strong>{student.grade || "—"}</strong></div>
                  <div><span className="text-slate-500 block">Hệ đăng ký</span><strong>{student.surveySystem || "Hệ S"}</strong></div>
                  <div><span className="text-slate-500 block">Lịch hẹn</span><strong>{viewingRound?.scheduledAt ? new Date(viewingRound.scheduledAt).toLocaleString("vi-VN") : "—"}</strong></div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#003B3A]">B3: Xác nhận đón trẻ & Hình thức thực hiện</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(["KHAO_SAT_MOI", "HOC_TRAI_NGHIEM"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setIntakeMode(m)}
                        className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                          intakeMode === m
                            ? "border-[#003B3A] bg-[#F0FDFA] text-[#003B3A]"
                            : "border-[#E2E8F0] bg-white text-slate-600"
                        }`}
                      >
                        <div className="font-bold">{m === "KHAO_SAT_MOI" ? "Khảo sát mới (B4A–B6)" : "Học trải nghiệm (B4B)"}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {m === "KHAO_SAT_MOI"
                            ? "Y tế kiểm tra thể chất + GV đánh giá phiếu BM.KTĐBCL"
                            : "Trẻ vào lớp học trải nghiệm, GV ghi nhận quan sát → B9A"}
                        </div>
                      </button>
                    ))}
                  </div>
                  {perms.canConfirmIntake && isViewingLatest && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => runAction({ action: "CONFIRM_INTAKE", intakeMode }, "Đã xác nhận hình thức đón trẻ.")}
                      className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold cursor-pointer"
                    >
                      Xác nhận đón trẻ ({intakeMode === "KHAO_SAT_MOI" ? "Khảo sát mới" : "Học trải nghiệm"})
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#003B3A]">Phân công nhân sự thực hiện</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">GV đánh giá / Quan sát</label>
                      <select
                        value={assignedTeacherId}
                        onChange={(e) => setAssignedTeacherId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Chưa phân công</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Y tế (B4A)</label>
                      <select
                        value={assignedMedicalId}
                        onChange={(e) => setAssignedMedicalId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Chưa phân công</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tâm lý (B7A)</label>
                      <select
                        value={assignedPsychologistId}
                        onChange={(e) => setAssignedPsychologistId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Chưa phân công</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {perms.canAssignStaff && isViewingLatest && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const t = staffUsers.find((u) => u.id === assignedTeacherId)
                        const m = staffUsers.find((u) => u.id === assignedMedicalId)
                        const p = staffUsers.find((u) => u.id === assignedPsychologistId)
                        runAction(
                          {
                            action: "ASSIGN_STAFF",
                            assignedTeacherId: t?.id || null,
                            assignedTeacherName: t?.fullName || null,
                            assignedMedicalId: m?.id || null,
                            assignedMedicalName: m?.fullName || null,
                            assignedPsychologistId: p?.id || null,
                            assignedPsychologistName: p?.fullName || null,
                          },
                          "Đã cập nhật phân công nhân sự."
                        )
                      }}
                      className="px-4 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white text-xs font-semibold cursor-pointer"
                    >
                      Lưu phân công
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: B4A HEALTH */}
            {!loading && student && activeTab === "health" && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#003B3A]">B4A: Y tế kiểm tra thể chất</h3>
                  {viewingRound?.medicalCheckedAt && (
                    <span className="text-xs text-emerald-700 font-semibold">
                      Đã kiểm tra lúc {new Date(viewingRound.medicalCheckedAt).toLocaleString("vi-VN")}
                    </span>
                  )}
                </div>

                {!perms.canViewHealth ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    Chi tiết sức khỏe trẻ được giới hạn chỉ hiển thị cho bộ phận Y tế và nhân sự được phân công xử lý hồ sơ.
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Chiều cao (cm) *</label>
                        <input
                          type="number"
                          step="0.1"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          placeholder="102.5"
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Cân nặng (kg) *</label>
                        <input
                          type="number"
                          step="0.1"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value)}
                          placeholder="16.2"
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Chỉ số BMI (tự động)</label>
                        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-bold text-[#003B3A]">
                          {Number(heightCm) > 0 && Number(weightKg) > 0
                            ? (Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kết quả kiểm tra thể chất</label>
                      <select
                        value={physicalStatus}
                        onChange={(e) => setPhysicalStatus(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                      >
                        <option value="BINH_THUONG">Bình thường, đủ sức khỏe tham gia khảo sát</option>
                        <option value="CAN_THEO_DOI">Cần theo dõi thêm về thể chất / dinh dưỡng</option>
                        <option value="LUU_Y_DAC_BIET">Có lưu ý y tế đặc biệt (dị ứng / bệnh nền)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ghi chú Y tế</label>
                      <textarea
                        rows={3}
                        value={physicalNote}
                        onChange={(e) => setPhysicalNote(e.target.value)}
                        placeholder="Ghi chú sức khỏe, dị ứng, lưu ý ăn uống / vận động..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>

                    {perms.canEditHealth && isViewingLatest && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          runAction(
                            { action: "SAVE_HEALTH_CHECK", heightCm, weightKg, physicalStatus, physicalNote },
                            "Đã lưu kết quả kiểm tra thể chất (B4A)."
                          )
                        }
                        className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                      >
                        Lưu kết quả Y tế (B4A)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: B5 / B4B / B8 EVALUATION */}
            {!loading && student && activeTab === "evaluation" && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#003B3A]">
                      {viewingRound?.roundType === "KHAO_SAT_MOI"
                        ? "B5: Giáo viên đánh giá theo biểu mẫu BM.KTĐBCL"
                        : viewingRound?.roundType === "HOC_TRAI_NGHIEM"
                          ? "B4B: Giáo viên ghi nhận quan sát Học trải nghiệm tại lớp"
                          : "B8: Ghi nhận kết quả quan sát buổi Trải nghiệm kết hợp tâm lý"}
                    </h3>
                    {viewingRound?.formCode && (
                      <p className="text-slate-500 mt-0.5">
                        Mẫu đang áp dụng: <strong>{viewingRound.formCode}</strong> (v{viewingRound.formVersion || "2026.1"})
                      </p>
                    )}
                  </div>
                  {viewingRound?.roundType === "KHAO_SAT_MOI" && (
                    <button
                      type="button"
                      onClick={() => setPrintDoc("EVALUATION_FORM")}
                      className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Mở / In đúng mẫu đã dùng
                    </button>
                  )}
                </div>

                {viewingRound?.roundType === "KHAO_SAT_MOI" ? (
                  <>
                    {/* Form Selection & Age Boundary Confirmation */}
                    <div
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        viewingRound.isAgeBoundary && !viewingRound.formConfirmedAt
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-[#F0FDFA] border-teal-200 text-[#005854]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold flex items-center gap-1.5">
                          {viewingRound.isAgeBoundary && !viewingRound.formConfirmedAt && (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                          <span>
                            Gợi ý: {viewingRound.suggestedFormCode || suggestion?.suggestedFormCode} ·{" "}
                            {viewingRound.formConfirmedAt ? `Đã xác nhận (${viewingRound.formConfirmedBy})` : "Chưa xác nhận mẫu"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedFormCode}
                            onChange={(e) => setSelectedFormCode(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                          >
                            {EVALUATION_FORM_CODES.map((code) => (
                              <option key={code} value={code}>
                                {code} — {PRESCHOOL_FORM_REGISTRY[code].shortTitle}
                              </option>
                            ))}
                          </select>
                          {isViewingLatest && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                runAction(
                                  { action: "CONFIRM_FORM", formCode: selectedFormCode },
                                  `Đã xác nhận sử dụng mẫu ${selectedFormCode}.`
                                )
                              }
                              className="px-3 py-1 rounded-lg bg-[#003B3A] text-white font-semibold cursor-pointer"
                            >
                              Xác nhận mẫu
                            </button>
                          )}
                        </div>
                      </div>
                      {viewingRound.ageBoundaryReason && (
                        <p className="text-[11px]">{viewingRound.ageBoundaryReason}</p>
                      )}
                    </div>

                    {/* Criteria Table */}
                    <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#003B3A] text-white text-[11px] font-semibold">
                          <tr>
                            <th className="py-2.5 px-3 text-teal-100">Lĩnh vực</th>
                            <th className="py-2.5 px-3 text-white">Tiêu chí ({activeFormDef.code})</th>
                            <th className="py-2.5 px-3 text-[#5EEAD4]">Đánh giá</th>
                            <th className="py-2.5 px-3 text-teal-100">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] bg-white">
                          {activeFormDef.defaultCriteria.map((c) => {
                            const cur = criteriaRatings[c.code] || { result: "", note: "" }
                            return (
                              <tr key={c.code} className="hover:bg-[#F8FAFC]">
                                <td className="py-2.5 px-3 font-medium text-slate-600 align-middle">{c.area}</td>
                                <td className="py-2.5 px-3 text-slate-800 align-middle">{c.name}</td>
                                <td className="py-2.5 px-3 align-middle">
                                  <select
                                    value={cur.result}
                                    onChange={(e) =>
                                      setCriteriaRatings((prev) => ({
                                        ...prev,
                                        [c.code]: { ...cur, result: e.target.value },
                                      }))
                                    }
                                    className="rounded-lg border border-[#E2E8F0] px-2 py-1 bg-white text-xs"
                                  >
                                    <option value="">-- Chọn --</option>
                                    {c.options.map((o) => (
                                      <option key={o.key} value={o.label}>{o.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 px-3 align-middle">
                                  <input
                                    type="text"
                                    value={cur.note}
                                    onChange={(e) =>
                                      setCriteriaRatings((prev) => ({
                                        ...prev,
                                        [c.code]: { ...cur, note: e.target.value },
                                      }))
                                    }
                                    placeholder="Nhận xét..."
                                    className="w-full rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nhận xét tổng hợp của Giáo viên</label>
                      <textarea
                        rows={3}
                        value={generalComment}
                        onChange={(e) => setGeneralComment(e.target.value)}
                        placeholder="Điểm nổi bật, khả năng thích nghi, lưu ý cần hỗ trợ..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nội dung quan sát tại lớp ({viewingRound?.roundType === "HOC_TRAI_NGHIEM" ? "B4B" : "B8"}) *
                      </label>
                      <textarea
                        rows={5}
                        value={experienceObservation}
                        onChange={(e) => setExperienceObservation(e.target.value)}
                        placeholder="Ghi nhận chi tiết thái độ, tương tác với cô và bạn, khả năng tham gia hoạt động, ăn ngủ và phản hồi của trẻ trong buổi trải nghiệm..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nhận xét bổ sung</label>
                      <textarea
                        rows={2}
                        value={generalComment}
                        onChange={(e) => setGeneralComment(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {perms.canEditEvaluation && isViewingLatest && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      const criteriaList = activeFormDef.defaultCriteria.map((c) => ({
                        code: c.code,
                        area: c.area,
                        name: c.name,
                        result: criteriaRatings[c.code]?.result || "",
                        note: criteriaRatings[c.code]?.note || "",
                      }))
                      runAction(
                        {
                          action: "SAVE_EVALUATION",
                          formCode: selectedFormCode,
                          criteria: criteriaList,
                          generalComment,
                          experienceObservation,
                        },
                        "Đã lưu kết quả đánh giá / quan sát."
                      )
                    }}
                    className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                  >
                    Lưu kết quả đánh giá
                  </button>
                )}
              </div>
            )}

            {/* TAB 4: B7A PSYCHOLOGY (BM.KTĐBCL.09) & B7B FOLLOW-UP */}
            {!loading && student && activeTab === "psychology" && (
              <div className="space-y-4 text-xs">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#003B3A]">B7A: Phiếu sàng lọc tâm lý (BM.KTĐBCL.09)</h3>
                      <p className="text-slate-500 mt-0.5">Áp dụng khi bố trí phỏng vấn tâm lý ngay và báo cáo nhanh qua MS Teams.</p>
                    </div>
                    {perms.canViewPsychology && (
                      <button
                        type="button"
                        onClick={() => setPrintDoc("PSYCHOLOGY_09")}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In BM.KTĐBCL.09
                      </button>
                    )}
                  </div>

                  {!perms.canViewPsychology ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-400" />
                      Chi tiết phiếu sàng lọc tâm lý BM.KTĐBCL.09 được bảo mật, chỉ hiển thị cho nhân sự tâm lý và cấp quản lý được giao.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#003B3A] text-white text-[11px] font-semibold">
                            <tr>
                              <th className="py-2.5 px-3 text-teal-100">Hạng mục</th>
                              <th className="py-2.5 px-3 text-white">Nội dung quan sát / phỏng vấn</th>
                              <th className="py-2.5 px-3 text-[#5EEAD4]">Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] bg-white">
                            {psyFormDef.defaultCriteria.map((c) => {
                              const cur = psyRatings[c.code] || { result: "", note: "" }
                              return (
                                <tr key={c.code}>
                                  <td className="py-2.5 px-3 font-medium text-slate-600">{c.area}</td>
                                  <td className="py-2.5 px-3 text-slate-800">{c.name}</td>
                                  <td className="py-2.5 px-3">
                                    <select
                                      value={cur.result}
                                      onChange={(e) =>
                                        setPsyRatings((prev) => ({
                                          ...prev,
                                          [c.code]: { ...cur, result: e.target.value },
                                        }))
                                      }
                                      className="rounded-lg border border-[#E2E8F0] px-2 py-1 bg-white"
                                    >
                                      <option value="">-- Chọn --</option>
                                      {c.options.map((o) => (
                                        <option key={o.key} value={o.label}>{o.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kết luận & khuyến nghị tâm lý</label>
                        <textarea
                          rows={3}
                          value={psyConclusion}
                          onChange={(e) => setPsyConclusion(e.target.value)}
                          placeholder="Ghi nhận kết quả phỏng vấn và khuyến nghị..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                        />
                      </div>

                      <div className="rounded-xl border border-teal-200 bg-[#F0FDFA] p-3.5 space-y-2">
                        <label className="flex items-center gap-2 font-semibold text-[#003B3A] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={msTeamsReported}
                            onChange={(e) => setMsTeamsReported(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          Đã thực hiện báo cáo nhanh qua MS Teams theo lưu đồ (B7A)
                        </label>
                        <input
                          type="text"
                          value={msTeamsReportNote}
                          onChange={(e) => setMsTeamsReportNote(e.target.value)}
                          placeholder="Ghi chú kênh / thời điểm báo cáo MS Teams..."
                          className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5"
                        />
                      </div>

                      {perms.canEditPsychology && isViewingLatest && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            const criteriaList = psyFormDef.defaultCriteria.map((c) => ({
                              code: c.code,
                              area: c.area,
                              name: c.name,
                              result: psyRatings[c.code]?.result || "",
                              note: psyRatings[c.code]?.note || "",
                            }))
                            runAction(
                              {
                                action: "SAVE_PSYCHOLOGY",
                                criteria: criteriaList,
                                conclusionNote: psyConclusion,
                                msTeamsReported,
                                msTeamsReportNote,
                              },
                              "Đã lưu phiếu BM.KTĐBCL.09 và ghi nhận báo cáo MS Teams."
                            )
                          }}
                          className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                        >
                          Lưu phiếu BM.KTĐBCL.09
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* B7B Follow-up Experience */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                    <CalendarPlus className="w-4 h-4 text-[#00A19A]" />
                    B7B: Hẹn trải nghiệm kết hợp quan sát tâm lý (≥ 2 ngày làm việc)
                  </h3>
                  <p className="text-slate-600">
                    Khi chưa thể phỏng vấn tâm lý ngay, tạo <strong>Lần khảo sát mới</strong> trên cùng hồ sơ này (giữ nguyên toàn bộ lịch sử và kết quả các lần trước).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Thời gian hẹn mới (tối thiểu sau 2 ngày làm việc)</label>
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Ghi chú thống nhất với phụ huynh</label>
                      <input
                        type="text"
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        placeholder="Lớp trải nghiệm, nhân sự phối hợp..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>
                  </div>
                  {perms.canScheduleFollowUp && isViewingLatest && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        runAction(
                          { action: "SCHEDULE_FOLLOWUP", scheduledAt: followUpDate, note: followUpNote },
                          "Đã tạo lịch trải nghiệm bổ sung mới và bảo toàn lịch sử lần trước."
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                    >
                      Tạo lịch trải nghiệm bổ sung (Lần {rounds.length + 1})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: B6 / B9A REVIEW & B10 APPROVAL */}
            {!loading && student && activeTab === "review" && (
              <div className="space-y-4 text-xs">
                {/* Pre-Approval Gate Checklist */}
                <div
                  className={`rounded-2xl border p-4 ${
                    gate.ready
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    {gate.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                    )}
                    {gate.ready
                      ? "Hồ sơ đã đủ điều kiện bắt buộc của nhánh hiện tại để trình duyệt GĐCS (B10)."
                      : "Chưa mở phê duyệt B10 — còn thiếu nội dung bắt buộc:"}
                  </div>
                  {!gate.ready && gate.missing.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {gate.missing.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* B6 / B9A Review */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#003B3A]">B6 / B9A: Nhóm trưởng Mầm non rà soát & định tuyến</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { k: "DE_XUAT_DAT", label: "Đề xuất Đạt → Trình B10" },
                      { k: "DE_XUAT_CHUA_DAT", label: "Đề xuất Chưa đạt → B10" },
                      { k: "CAN_TAM_LY", label: "Cần PV tâm lý (B7A)" },
                      { k: "HEN_TRAI_NGHIEM_BO_SUNG", label: "Hẹn trải nghiệm (B7B)" },
                    ].map((opt) => (
                      <button
                        key={opt.k}
                        type="button"
                        onClick={() => setReviewDecision(opt.k)}
                        className={`p-2.5 rounded-xl border font-semibold text-left cursor-pointer ${
                          reviewDecision === opt.k
                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                            : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Ý kiến rà soát của Nhóm trưởng Mầm non..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                  {perms.canReviewB6B9A && isViewingLatest && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        runAction(
                          { action: "REVIEW_B6_B9A", reviewDecision, reviewComment },
                          "Đã lưu kết quả rà soát B6/B9A và chuyển bước."
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white font-semibold cursor-pointer"
                    >
                      Xác nhận rà soát B6/B9A
                    </button>
                  )}
                </div>

                {/* B10 GĐCS Approval + 1-Tap Email Approval */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[#003B3A]">B10: Giám đốc Điều hành Cơ sở phê duyệt</h3>
                  <textarea
                    rows={2}
                    value={gdcsComment}
                    onChange={(e) => setGdcsComment(e.target.value)}
                    placeholder="Ý kiến phê duyệt của Giám đốc Điều hành Cơ sở (nếu có)..."
                    className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                  />
                  {perms.canApproveB10 && isViewingLatest && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={saving || !gate.ready}
                        onClick={() =>
                          runAction(
                            { action: "APPROVE_B10", decision: "DAT", comment: gdcsComment },
                            "Đã phê duyệt Đạt (B10). Tiến độ tự động chuyển sang Đã duyệt."
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Phê duyệt Đạt
                      </button>
                      <button
                        type="button"
                        disabled={saving || !gate.ready}
                        onClick={() =>
                          runAction(
                            { action: "APPROVE_B10", decision: "CHUA_DAT", comment: gdcsComment },
                            "Đã phê duyệt Chưa đạt (B10). Tiến độ tự động chuyển sang Đã duyệt."
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Phê duyệt Chưa đạt
                      </button>
                    </div>
                  )}

                  {/* Send 1-Tap Email Approval */}
                  <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                    <div className="font-semibold text-[#003B3A] flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#00A19A]" />
                      Gửi Email phê duyệt chạm 1 lần tới GĐCS (tự động cập nhật trạng thái)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="email"
                        value={approvalEmailTo}
                        onChange={(e) => setApprovalEmailTo(e.target.value)}
                        placeholder="email-gdcs@skylineschool.edu.vn"
                        className="rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                      <input
                        type="text"
                        value={approvalEmailName}
                        onChange={(e) => setApprovalEmailName(e.target.value)}
                        placeholder="Họ tên GĐCS"
                        className="rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving || !gate.ready || !approvalEmailTo.trim()}
                          onClick={async () => {
                            setSaving(true)
                            setError(null)
                            try {
                              const res = await fetch(`/api/preschool-workflow/${studentId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "SEND_APPROVAL_EMAIL",
                                  roundId: viewingRound?.id,
                                  recipientEmail: approvalEmailTo.trim(),
                                  recipientName: approvalEmailName.trim(),
                                  previewOnly: true,
                                }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || "Không thể tạo bản xem trước.")
                              setEmailPreview({
                                open: true,
                                to: data.to || approvalEmailTo.trim(),
                                subject: data.subject || "",
                                html: data.html || "",
                              })
                            } catch (err: any) {
                              setError(err?.message || "Lỗi xem trước email.")
                            } finally {
                              setSaving(false)
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-xl border border-[#003B3A] text-[#003B3A] hover:bg-[#F0FDFA] font-semibold disabled:opacity-40 cursor-pointer"
                        >
                          Xem trước Email
                        </button>
                      </div>
                    </div>

                    {emailPreview.open && (
                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden space-y-3 p-3.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#003B3A]">
                            Xem trước Email gửi tới: {emailPreview.to}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmailPreview((p) => ({ ...p, open: false }))}
                            className="text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Đóng xem trước
                          </button>
                        </div>
                        <input
                          type="text"
                          value={emailPreview.subject}
                          onChange={(e) => setEmailPreview((p) => ({ ...p, subject: e.target.value }))}
                          className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs"
                        />
                        <iframe
                          title="Xem trước Email duyệt B10"
                          srcDoc={emailPreview.html}
                          className="w-full h-[380px] rounded-xl border border-[#E2E8F0] bg-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEmailPreview((p) => ({ ...p, open: false }))}
                            className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 font-semibold cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              await runAction(
                                {
                                  action: "SEND_APPROVAL_EMAIL",
                                  recipientEmail: emailPreview.to,
                                  recipientName: approvalEmailName.trim(),
                                  customSubject: emailPreview.subject,
                                },
                                `Đã gửi email phê duyệt chạm tới ${emailPreview.to}.`
                              )
                              setEmailPreview((p) => ({ ...p, open: false }))
                            }}
                            className="px-4 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                          >
                            Xác nhận gửi Email
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: B11–B13 LETTERS, DELIVERY & ARCHIVE */}
            {!loading && student && activeTab === "letters" && (
              <div className="space-y-4 text-xs">
                {!student.finalApprovedOutcome ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 font-medium">
                    Hồ sơ chưa có quyết định phê duyệt B10 của Giám đốc Điều hành Cơ sở. Bước xuất thư và trả kết quả sẽ mở sau khi phê duyệt.
                  </div>
                ) : (
                  <>
                    {/* B11A: Đạt -> BM.KTĐBCL.17 */}
                    {student.finalApprovedOutcome === "DAT" && (
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                        <h3 className="text-sm font-bold text-emerald-700">B11A: Xuất Thư chúc mừng (BM.KTĐBCL.17)</h3>
                        <p className="text-slate-600">
                          Hồ sơ đã được phê duyệt <strong>Đạt</strong>. Xuất Thư chúc mừng đúng phiên bản và bàn giao Tư vấn trả kết quả cho phụ huynh.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              await runAction({ action: "ISSUE_LETTER" }, "Đã ghi nhận xuất Thư chúc mừng BM.KTĐBCL.17.")
                              setPrintDoc("LETTER_17")
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Xuất & In BM.KTĐBCL.17
                          </button>
                        </div>
                      </div>
                    )}

                    {/* B11B: Chưa đạt -> Trao đổi PH -> BM.KTĐBCL.04 */}
                    {student.finalApprovedOutcome === "CHUA_DAT" && (
                      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                        <h3 className="text-sm font-bold text-rose-700">B11B: Ghi nhận trao đổi Phụ huynh & Xuất Thư cảm ơn (BM.KTĐBCL.04)</h3>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Nội dung trao đổi với phụ huynh (bắt buộc trước khi xuất BM.KTĐBCL.04) *
                          </label>
                          <textarea
                            rows={3}
                            value={parentConsultNote}
                            onChange={(e) => setParentConsultNote(e.target.value)}
                            placeholder="Ghi nhận thời điểm trao đổi, nội dung tư vấn đồng hành và phản hồi của phụ huynh..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={saving || !parentConsultNote.trim()}
                            onClick={() =>
                              runAction(
                                { action: "RECORD_PARENT_CONSULTATION", note: parentConsultNote },
                                "Đã ghi nhận nội dung trao đổi với phụ huynh."
                              )
                            }
                            className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold disabled:opacity-40 cursor-pointer"
                          >
                            Lưu nội dung trao đổi PH
                          </button>
                          <button
                            type="button"
                            disabled={saving || !student.parentConsultationNote}
                            onClick={async () => {
                              await runAction({ action: "ISSUE_LETTER" }, "Đã ghi nhận xuất Thư cảm ơn BM.KTĐBCL.04.")
                              setPrintDoc("LETTER_04")
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Xuất & In BM.KTĐBCL.04
                          </button>
                        </div>
                      </div>
                    )}

                    {/* B12: Tư vấn xác nhận trả kết quả */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                      <h3 className="text-sm font-bold text-[#003B3A]">B12: Tư vấn xác nhận đã trả kết quả cho phụ huynh</h3>
                      {student.resultDeliveredAt ? (
                        <div className="text-emerald-700 font-semibold">
                          Đã trả kết quả lúc {new Date(student.resultDeliveredAt).toLocaleString("vi-VN")} bởi {student.resultDeliveredBy}.
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            placeholder="Kênh trả kết quả (trực tiếp / email / Zalo) & ghi chú..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                          />
                          {perms.canConfirmDelivery && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                runAction(
                                  { action: "CONFIRM_DELIVERY", note: deliveryNote },
                                  "Đã xác nhận trả kết quả cho phụ huynh (B12)."
                                )
                              }
                              className="px-4 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white font-semibold cursor-pointer"
                            >
                              Xác nhận đã trả kết quả (B12)
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* B13: Giáo vụ / Khảo thí hoàn tất lưu hồ sơ */}
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                      <h3 className="text-sm font-bold text-[#003B3A]">B13: Giáo vụ / Khảo thí hoàn tất lưu hồ sơ</h3>
                      {student.archivedAt ? (
                        <div className="text-[#003B3A] font-semibold">
                          Đã lưu hồ sơ lúc {new Date(student.archivedAt).toLocaleString("vi-VN")} bởi {student.archivedBy}.
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={archiveNote}
                            onChange={(e) => setArchiveNote(e.target.value)}
                            placeholder="Mã lưu trữ / vị trí hồ sơ giấy & điện tử..."
                            className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                          />
                          {perms.canArchive && (
                            <button
                              type="button"
                              disabled={saving || wfStatus !== "DA_TRA_KET_QUA"}
                              onClick={() =>
                                runAction(
                                  { action: "ARCHIVE_RECORD", note: archiveNote },
                                  "Đã hoàn tất lưu hồ sơ (B13)."
                                )
                              }
                              className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold disabled:opacity-40 cursor-pointer"
                            >
                              Hoàn tất lưu hồ sơ (B13)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 7: AUDIT HISTORY */}
            {!loading && student && activeTab === "history" && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 text-xs">
                <h3 className="text-sm font-bold text-[#003B3A]">Lịch sử phân công, cập nhật phiếu, chuyển bước & phê duyệt</h3>
                {(dossier?.auditLogs || []).length === 0 ? (
                  <p className="text-slate-500">Chưa có nhật ký tác động.</p>
                ) : (
                  <div className="space-y-2.5">
                    {dossier.auditLogs.map((log: any) => (
                      <div key={log.id} className="rounded-xl border border-[#E2E8F0] p-3 bg-[#F8FAFC] flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="font-bold text-[#003B3A]">
                            {log.action}
                            {log.fromStatus || log.toStatus ? (
                              <span className="ml-2 font-normal text-slate-600">
                                ({log.fromStatus || "—"} → {log.toStatus || "—"})
                              </span>
                            ) : null}
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            {log.actorName || "Hệ thống"} ({log.actorRole || "SYSTEM"}) · Nguồn: <strong>{log.source}</strong>
                          </div>
                        </div>
                        <div className="text-slate-500 tabular-nums">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <PreschoolPrintableDocument
        open={Boolean(printDoc)}
        onClose={() => setPrintDoc(null)}
        docType={printDoc || "LETTER_17"}
        student={student}
        round={viewingRound}
      />
    </>
  )
}
