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

type DrawerTab = "intake" | "health" | "evaluation" | "trial" | "psychology" | "review" | "letters" | "history"

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

  // B5/B4B Integrated Phiếu đánh giá phát triển
  const [devScoresMap, setDevScoresMap] = useState<Record<string, { result: string; note: string }>>({})
  const [devProfComment, setDevProfComment] = useState("")
  const [devPsyComment, setDevPsyComment] = useState("")
  const [devImportantNote, setDevImportantNote] = useState("")

  // B6 Trial (Phân công học trải nghiệm, Kết quả học trải nghiệm & Sàng lọc tâm lý)
  const [trialClass, setTrialClass] = useState("")
  const [trialTeacher, setTrialTeacher] = useState("")
  const [trialPeriod, setTrialPeriod] = useState("")
  const [trialResult, setTrialResult] = useState("")
  const [trialComment, setTrialComment] = useState("")
  const [trialBghStatus, setTrialBghStatus] = useState("")
  const [trialBghComment, setTrialBghComment] = useState("")
  const [trialPsyScreening, setTrialPsyScreening] = useState(false)
  const [trialPsyId, setTrialPsyId] = useState("")
  const [trialPsyNote, setTrialPsyNote] = useState("")
  const [trialCriteriaMap, setTrialCriteriaMap] = useState<Record<string, { trialResult: string; evaluator: string; psyFlag: boolean }>>({})

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
      hydrateRoundFields(data.student, latest, data.suggestion, data.legacyDevSummary)
    } catch (err: any) {
      setError(err?.message || "Lỗi tải dữ liệu.")
    } finally {
      setLoading(false)
    }
  }

  const hydrateRoundFields = (student: any, round: any, suggestion: any, legacyDev?: any) => {
    setIntakeMode(student?.intakeMode === "HOC_TRAI_NGHIEM" ? "HOC_TRAI_NGHIEM" : "KHAO_SAT_MOI")
    setAssignedTeacherId(round?.assignedTeacherId || "")
    setAssignedMedicalId(round?.assignedMedicalId || "")
    setAssignedPsychologistId(round?.assignedPsychologistId || "")

    const effHeight = round?.heightCm != null ? round.heightCm : legacyDev?.heightCm ?? null
    const effWeight = round?.weightKg != null ? round.weightKg : legacyDev?.weightKg ?? null
    setHeightCm(effHeight != null ? String(effHeight) : "")
    setWeightKg(effWeight != null ? String(effWeight) : "")
    setPhysicalStatus(round?.physicalStatus && round.physicalStatus !== "DA_KIEM_TRA_AN_CHI_TIET" ? round.physicalStatus : "BINH_THUONG")
    setPhysicalNote(round?.physicalNote || "")

    const fCode = round?.formCode || suggestion?.suggestedFormCode || "BM.KTĐBCL.01"
    setSelectedFormCode(fCode)
    setGeneralComment(round?.generalComment || "")
    setExperienceObservation(round?.experienceObservation || "")

    // Hydrate integrated Phiếu đánh giá phát triển (B5/B4B)
    const nextDevMap: Record<string, { result: string; note: string }> = {}
    const devRows: any[] =
      Array.isArray(legacyDev?.availableCriteria) && legacyDev.availableCriteria.length > 0
        ? legacyDev.availableCriteria
        : Array.isArray(legacyDev?.scores)
          ? legacyDev.scores
          : []
    for (const row of devRows) {
      const cid = row.criteriaId || row.id
      if (!cid) continue
      nextDevMap[cid] = { result: row.result || "", note: row.note || "" }
    }
    setDevScoresMap(nextDevMap)
    setDevProfComment(student?.devProfessionalComment || round?.generalComment || "")
    setDevPsyComment(student?.devPsychologyComment || "")
    setDevImportantNote(student?.devImportantNote || "")

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
    setPsyConclusion(psyConc || student?.trialPsychologyFeedback || student?.trialPsychologyConclusion || student?.devPsychologyComment || "")
    setMsTeamsReported(Boolean(round?.msTeamsReported))
    setMsTeamsReportNote(round?.msTeamsReportNote || "")

    const fallbackReviewDecision =
      round?.reviewDecision ||
      (student?.bghApprovalStatus === "DE_XUAT_DAT" ||
      student?.bghApprovalStatus === "DAT" ||
      student?.bghApprovalStatus === "DAT_MIEN_HOC_THU"
        ? "DE_XUAT_DAT"
        : student?.bghApprovalStatus === "DE_XUAT_CHUA_DAT" ||
            student?.bghApprovalStatus === "KHONG_DAT" ||
            student?.bghApprovalStatus === "CHUA_DAT"
          ? "DE_XUAT_CHUA_DAT"
          : student?.bghApprovalStatus === "HEN_TRAI_NGHIEM" || student?.bghApprovalStatus === "DAT_HOC_THU"
            ? "HEN_TRAI_NGHIEM_BO_SUNG"
            : "DE_XUAT_DAT")

    setReviewDecision(fallbackReviewDecision)
    setReviewComment(round?.reviewComment || student?.bghApprovalComment || "")
    setGdcsComment(round?.gdcsComment || student?.gdcsApprovalComment || "")
    setParentConsultNote(student?.parentConsultationNote || "")
    setDeliveryNote(student?.resultDeliveryNote || "")
    setArchiveNote(student?.archiveNote || "")

    // Hydrate B6 Trial & Psychology Screening
    setTrialClass(student?.probationaryClass || "")
    setTrialTeacher(student?.probationaryTeacher || "")
    setTrialPeriod(student?.probationaryPeriod || "")
    setTrialResult(student?.probationaryResult || "")
    setTrialComment(student?.probationaryComment || "")
    setTrialBghStatus(student?.probationaryBghStatus || "")
    setTrialBghComment(student?.probationaryBghComment || "")
    setTrialPsyScreening(Boolean(Number(student?.trialPsychologyScreening || 0)))
    setTrialPsyId(student?.trialPsychologistId || round?.assignedPsychologistId || "")
    setTrialPsyNote(student?.trialPsychologyFeedback || "")
    const parsedTrialMap: Record<string, { trialResult: string; evaluator: string; psyFlag: boolean }> = {}
    try {
      if (student?.trialPsychologyCriteriaJson) {
        const raw = JSON.parse(student.trialPsychologyCriteriaJson)
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
          for (const [k, v] of Object.entries(raw as Record<string, any>)) {
            if (typeof v === "boolean") {
              parsedTrialMap[k] = { trialResult: "", evaluator: student?.probationaryTeacher || "", psyFlag: v }
            } else if (v && typeof v === "object") {
              parsedTrialMap[k] = {
                trialResult: String(v.trialResult || ""),
                evaluator: String(v.evaluator || student?.probationaryTeacher || ""),
                psyFlag: Boolean(v.psyFlag),
              }
            }
          }
        }
      }
    } catch {}
    setTrialCriteriaMap(parsedTrialMap)
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

  const staffDir = dossier?.staffDirectory || null
  const legacyDev = dossier?.legacyDevSummary || null

  const allDirectoryUsers: Array<{ id: string; fullName: string; email: string; role: string; departmentName?: string; homeroomClasses?: string[] }> = staffDir
    ? [
        ...(staffDir.homeroomTeachers || []),
        ...(staffDir.medicalStaff || []),
        ...(staffDir.psychologyStaff || []),
        ...(staffDir.otherStaff || []),
      ]
    : staffUsers

  const formatStaffOptionLabel = (u: any) => {
    const extras: string[] = []
    if (Array.isArray(u.homeroomClasses) && u.homeroomClasses.length > 0) {
      extras.push(`GVCN ${u.homeroomClasses.join(", ")}`)
    }
    if (u.departmentName) {
      extras.push(u.departmentName)
    } else if (u.role) {
      extras.push(u.role)
    }
    return extras.length > 0 ? `${u.fullName} (${extras.join(" · ")})` : u.fullName
  }

  // Tính toán nhân sự hiệu lực & trạng thái hoàn thành / đang đợi của từng bước
  const effectiveTeacherName =
    viewingRound?.assignedTeacherName ||
    viewingRound?.teacherUserName ||
    (legacyDev?.assignedTeachersFromBatch?.length ? legacyDev.assignedTeachersFromBatch.join(", ") : "") ||
    "Chưa phân công"

  const effectiveMedicalName =
    viewingRound?.assignedMedicalName ||
    viewingRound?.medicalUserName ||
    (legacyDev?.assignedMedicalFromBatch?.length ? legacyDev.assignedMedicalFromBatch.join(", ") : "") ||
    "Chưa phân công"

  const hasHealthResult = Boolean(
    viewingRound?.medicalCheckedAt ||
      (viewingRound?.heightCm > 0 && viewingRound?.weightKg > 0) ||
      (legacyDev?.heightCm > 0 && legacyDev?.weightKg > 0)
  )
  const hasEvalResult = Boolean(
    viewingRound?.teacherSubmittedAt ||
      (legacyDev?.totalScored || 0) > 0 ||
      Object.values(criteriaRatings).some((c) => Boolean(c.result))
  )
  const hasPsyResult = Boolean(viewingRound?.psychologySubmittedAt)
  const hasReviewDone = Boolean(student?.finalApprovedOutcome || student?.gdcsApprovalStatus)
  const hasLettersDone = Boolean(student?.archivedAt || student?.resultDeliveredAt)

  type StepStatus = "done" | "waiting" | "optional" | "pending"
  const stepStatusMap: Record<DrawerTab, { status: StepStatus; label: string }> = {
    intake:
      wfStatus !== "DA_HEN" || viewingRound?.intakeConfirmedAt
        ? { status: "done", label: "Đã hoàn thành" }
        : { status: "waiting", label: "Đang đợi đón trẻ" },
    health:
      viewingRound?.roundType === "HOC_TRAI_NGHIEM"
        ? { status: "optional", label: "Không bắt buộc" }
        : hasHealthResult
          ? { status: "done", label: "Đã hoàn thành" }
          : { status: "waiting", label: "Đang đợi Y tế" },
    evaluation: hasEvalResult
      ? { status: "done", label: "Đã hoàn thành" }
      : { status: "waiting", label: "Đang đợi GV đánh giá" },
    trial:
      student?.probationaryBghStatus || student?.probationaryResult
        ? { status: "done", label: "Đã có KQ học trải nghiệm" }
        : student?.probationaryTeacher || student?.probationaryClass || String(student?.bghApprovalStatus || "").includes("HOC_THU")
          ? { status: "waiting", label: "Đang học trải nghiệm" }
          : { status: "optional", label: "Khi học trải nghiệm" },
    psychology: hasPsyResult
      ? { status: "done", label: "Đã hoàn thành" }
      : wfStatus === "CHO_PHONG_VAN_TAM_LY"
        ? { status: "waiting", label: "Đang đợi Tâm lý" }
        : { status: "optional", label: "Khi cần" },
    review: hasReviewDone
      ? { status: "done", label: "Đã hoàn thành" }
      : wfStatus === "CHO_DUYET" || student?.bghApprovalStatus || hasEvalResult
        ? { status: "waiting", label: "Đang đợi duyệt" }
        : { status: "pending", label: "Chờ bước trước" },
    letters: hasLettersDone
      ? { status: "done", label: "Đã hoàn thành" }
      : wfStatus === "DA_DUYET" || wfStatus === "DA_TRA_KET_QUA"
        ? { status: "waiting", label: "Đang đợi trả KQ" }
        : { status: "pending", label: "Chờ bước trước" },
    history: { status: "optional", label: "" },
  }

  const tabs: Array<{ id: DrawerTab; label: string; icon: any }> = [
    { id: "intake", label: "B1–B3 Tiếp nhận", icon: ClipboardCheck },
    { id: "health", label: "B4A Y tế", icon: Stethoscope },
    { id: "evaluation", label: "B5/B4B Đánh giá", icon: FileText },
    { id: "trial", label: "B6 Học trải nghiệm", icon: CalendarPlus },
    { id: "psychology", label: "B7 Tâm lý (khi cần)", icon: Brain },
    { id: "review", label: "B6/B9A/B10 Duyệt", icon: CheckCircle2 },
    { id: "letters", label: "B11–B13 Thư & Lưu", icon: Archive },
    { id: "history", label: "Lịch sử", icon: History },
  ]

  const completedStepLabels = tabs
    .filter((t) => t.id !== "history" && stepStatusMap[t.id].status === "done")
    .map((t) => t.label.split(" ")[0])
  const waitingStepLabels = tabs
    .filter((t) => t.id !== "history" && stepStatusMap[t.id].status === "waiting")
    .map((t) => t.label)

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

          {/* Navigation Tabs with Completion / Waiting Indicators */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              const st = stepStatusMap[t.id]
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
                  <span>{t.label}</span>
                  {t.id !== "history" && st.status === "done" && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold" title="Đã hoàn thành">
                      ✓
                    </span>
                  )}
                  {t.id !== "history" && st.status === "waiting" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title={st.label} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Workflow Progress Summary Strip */}
          {!loading && student && (
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Đã hoàn thành ({completedStepLabels.length}):{" "}
                <strong className="text-slate-800">{completedStepLabels.length > 0 ? completedStepLabels.join(", ") : "Chưa có"}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Đang đợi ({waitingStepLabels.length}):{" "}
                <strong className="text-slate-800">{waitingStepLabels.length > 0 ? waitingStepLabels.join(" · ") : "Không còn bước chờ"}</strong>
              </span>
            </div>
          )}

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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#003B3A]">Phân công nhân sự thực hiện</h3>
                    <span className="text-[11px] text-slate-500">
                      Ưu tiên nhóm đúng Tổ chuyên môn · Tổ Tâm lý chỉ chọn khi cần
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        GV đánh giá / Quan sát
                        <span className="ml-1 text-[10px] font-medium text-[#00736E]">(GVCN / Tổ Mầm non)</span>
                      </label>
                      <select
                        value={assignedTeacherId}
                        onChange={(e) => setAssignedTeacherId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Chưa phân công</option>
                        {staffDir ? (
                          <>
                            {staffDir.homeroomTeachers?.length > 0 && (
                              <optgroup label="GVCN lớp / Giáo viên Mầm non">
                                {staffDir.homeroomTeachers.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                            {staffDir.otherStaff?.length > 0 && (
                              <optgroup label="Nhân sự khác">
                                {staffDir.otherStaff.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                          ))
                        )}
                      </select>
                      {!assignedTeacherId && legacyDev?.assignedTeachersFromBatch?.length > 0 && (
                        <p className="text-[10px] text-[#00736E] mt-1">
                          Đang theo phân công đợt: <strong>{legacyDev.assignedTeachersFromBatch.join(", ")}</strong>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Y tế (B4A)
                        <span className="ml-1 text-[10px] font-medium text-[#00736E]">(Tổ Y tế)</span>
                      </label>
                      <select
                        value={assignedMedicalId}
                        onChange={(e) => setAssignedMedicalId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Chưa phân công</option>
                        {staffDir ? (
                          <>
                            {staffDir.medicalStaff?.length > 0 && (
                              <optgroup label="Tổ Y tế học đường">
                                {staffDir.medicalStaff.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                            {staffDir.otherStaff?.length > 0 && (
                              <optgroup label="Nhân sự khác">
                                {staffDir.otherStaff.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                          ))
                        )}
                      </select>
                      {!assignedMedicalId && legacyDev?.assignedMedicalFromBatch?.length > 0 && (
                        <p className="text-[10px] text-[#00736E] mt-1">
                          Đang theo phân công đợt: <strong>{legacyDev.assignedMedicalFromBatch.join(", ")}</strong>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tâm lý (B7A)
                        <span className="ml-1 text-[10px] font-medium text-amber-700">(Tổ Tâm lý · Khi cần)</span>
                      </label>
                      <select
                        value={assignedPsychologistId}
                        onChange={(e) => setAssignedPsychologistId(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                      >
                        <option value="">Không yêu cầu / Khi cần mới chọn</option>
                        {staffDir ? (
                          <>
                            {staffDir.psychologyStaff?.length > 0 && (
                              <optgroup label="Tổ Tâm lý học đường">
                                {staffDir.psychologyStaff.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                            {staffDir.otherStaff?.length > 0 && (
                              <optgroup label="Nhân sự khác">
                                {staffDir.otherStaff.map((u: any) => (
                                  <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          staffUsers.map((u) => (
                            <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  {perms.canAssignStaff && isViewingLatest && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        const t = allDirectoryUsers.find((u) => u.id === assignedTeacherId)
                        const m = allDirectoryUsers.find((u) => u.id === assignedMedicalId)
                        const p = allDirectoryUsers.find((u) => u.id === assignedPsychologistId)
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#003B3A]">B4A: Y tế kiểm tra thể chất (Chiều cao · Cân nặng · Sức khỏe)</h3>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      hasHealthResult
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {hasHealthResult ? "✓ Đã hoàn thành" : "● Đang đợi Tổ Y tế"}
                  </span>
                </div>

                {/* Thẻ trạng thái nhân sự & kết quả B4A */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs tabular-nums">
                  <div>
                    <span className="text-[11px] text-slate-500 block">NV Tổ Y tế phân công</span>
                    <strong className="text-[#003B3A]">{effectiveMedicalName}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Trạng thái thực hiện</span>
                    <strong className={hasHealthResult ? "text-emerald-700" : "text-amber-700"}>
                      {viewingRound?.medicalCheckedAt
                        ? `Đã đo (${new Date(viewingRound.medicalCheckedAt).toLocaleString("vi-VN")})`
                        : hasHealthResult
                          ? "Đã ghi nhận chỉ số"
                          : "Chưa đo chiều cao / cân nặng"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kết quả thể chất</span>
                    <strong className="text-slate-800">
                      {Number(heightCm) > 0 && Number(weightKg) > 0
                        ? `${heightCm} cm · ${weightKg} kg (BMI ${(Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)).toFixed(1)})`
                        : "Chưa có dữ liệu"}
                    </strong>
                  </div>
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        hasEvalResult
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {hasEvalResult ? "✓ Đã hoàn thành" : "● Đang đợi GV đánh giá"}
                    </span>
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
                </div>

                {/* Thẻ trạng thái nhân sự, tiến độ & kết quả B5/B4B */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs tabular-nums">
                  <div>
                    <span className="text-[11px] text-slate-500 block">GV phân công đánh giá</span>
                    <strong className="text-[#003B3A]">{effectiveTeacherName}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Trạng thái bước B5/B4B</span>
                    <strong className={hasEvalResult ? "text-emerald-700" : "text-amber-700"}>
                      {viewingRound?.teacherSubmittedAt
                        ? `Đã nộp (${new Date(viewingRound.teacherSubmittedAt).toLocaleString("vi-VN")})`
                        : (legacyDev?.totalScored || 0) > 0
                          ? `Đã chấm ${legacyDev.totalScored} tiêu chí trên Phiếu đánh giá`
                          : "Chưa nhập kết quả đánh giá"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kết quả tóm tắt</span>
                    {(legacyDev?.totalScored || 0) > 0 ? (
                      <strong className="text-slate-800">
                        {legacyDev.datCount}/{legacyDev.totalScored} Đạt ({legacyDev.pctDat}%)
                        {legacyDev.khongDatCount > 0 ? ` · ${legacyDev.khongDatCount} Không đạt` : ""}
                      </strong>
                    ) : (
                      <strong className="text-slate-500">Chưa có kết quả</strong>
                    )}
                  </div>
                </div>

                {/* Phiếu đánh giá phát triển tích hợp trực tiếp vào B5/B4B */}
                {(() => {
                  const devCriteriaRows: any[] =
                    Array.isArray(legacyDev?.availableCriteria) && legacyDev.availableCriteria.length > 0
                      ? legacyDev.availableCriteria
                      : Array.isArray(legacyDev?.scores) && legacyDev.scores.length > 0
                        ? legacyDev.scores
                        : []

                  if (devCriteriaRows.length > 0) {
                    const liveDat = devCriteriaRows.filter((r) => (devScoresMap[r.criteriaId || r.id]?.result || "") === "DAT").length
                    const liveKhongDat = devCriteriaRows.filter((r) => (devScoresMap[r.criteriaId || r.id]?.result || "") === "KHONG_DAT").length
                    const liveChuaTh = devCriteriaRows.filter((r) => (devScoresMap[r.criteriaId || r.id]?.result || "") === "CHUA_THE_HIEN").length
                    const liveScored = liveDat + liveKhongDat + liveChuaTh
                    const livePct = liveScored > 0 ? Math.round((liveDat / liveScored) * 100) : 0

                    return (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-teal-200/80 bg-[#F0FDFA]/40 p-3.5 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#003B3A]">
                              Phiếu đánh giá phát triển ({devCriteriaRows.length} tiêu chí)
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
                              <span className="font-semibold text-emerald-700">
                                {liveDat}/{devCriteriaRows.length} Đạt ({livePct}%)
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-rose-700 font-medium">{liveKhongDat} Không đạt</span>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-700 font-medium">{liveChuaTh} Chưa thể hiện</span>
                            </div>
                          </div>
                          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white">
                            <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                              <thead className="bg-[#003B3A] text-white sticky top-0 z-10">
                                <tr>
                                  <th className="py-2.5 px-2.5 text-teal-100 font-semibold">Lĩnh vực</th>
                                  <th className="py-2.5 px-2.5 text-white font-semibold">Tiêu chí</th>
                                  <th className="py-2.5 px-2.5 text-[#5EEAD4] font-semibold w-[142px]">Kết quả</th>
                                  <th className="py-2.5 px-2.5 text-teal-100 font-semibold w-[190px]">Ghi chú</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2E8F0]">
                                {devCriteriaRows.map((sc: any) => {
                                  const cid = sc.criteriaId || sc.id
                                  const cur = devScoresMap[cid] || { result: sc.result || "", note: sc.note || "" }
                                  return (
                                    <tr key={cid} className="hover:bg-[#F8FAFC]">
                                      <td className="py-2 px-2.5 text-slate-600 align-middle">{sc.areaName || "—"}</td>
                                      <td className="py-2 px-2.5 text-slate-800 align-middle">{sc.criteriaName}</td>
                                      <td className="py-2 px-2.5 align-middle">
                                        {perms.canEditEvaluation && isViewingLatest ? (
                                          <select
                                            value={cur.result}
                                            onChange={(e) =>
                                              setDevScoresMap((prev) => ({
                                                ...prev,
                                                [cid]: { ...cur, result: e.target.value },
                                              }))
                                            }
                                            className={`w-full rounded-lg border px-2 py-1 text-[11px] font-semibold bg-white outline-none ${
                                              cur.result === "DAT"
                                                ? "border-emerald-300 text-emerald-700"
                                                : cur.result === "KHONG_DAT"
                                                  ? "border-rose-300 text-rose-700"
                                                  : cur.result === "CHUA_THE_HIEN"
                                                    ? "border-amber-300 text-amber-700"
                                                    : "border-[#E2E8F0] text-slate-500"
                                            }`}
                                          >
                                            <option value="">-- Chọn --</option>
                                            <option value="DAT">Đạt</option>
                                            <option value="CHUA_THE_HIEN">Chưa thể hiện</option>
                                            <option value="KHONG_DAT">Không đạt</option>
                                          </select>
                                        ) : (
                                          <span
                                            className={
                                              cur.result === "DAT"
                                                ? "font-semibold text-emerald-700"
                                                : cur.result === "KHONG_DAT"
                                                  ? "font-semibold text-rose-700"
                                                  : "font-semibold text-amber-700"
                                            }
                                          >
                                            {cur.result === "DAT" ? "Đạt" : cur.result === "KHONG_DAT" ? "Không đạt" : cur.result === "CHUA_THE_HIEN" ? "Chưa thể hiện" : "—"}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-2.5 align-middle">
                                        {perms.canEditEvaluation && isViewingLatest ? (
                                          <input
                                            type="text"
                                            value={cur.note}
                                            onChange={(e) =>
                                              setDevScoresMap((prev) => ({
                                                ...prev,
                                                [cid]: { ...cur, note: e.target.value },
                                              }))
                                            }
                                            placeholder="Ghi chú..."
                                            className="w-full rounded-lg border border-[#E2E8F0] px-2 py-1 text-[11px] bg-white"
                                          />
                                        ) : (
                                          <span className="text-slate-500">{cur.note ? String(cur.note).replace(/\|/g, " — ") : "—"}</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Nhận xét chuyên môn, tâm lý & lưu ý quan trọng từ Phiếu đánh giá phát triển */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#003B3A] mb-1">
                              Nhận xét chuyên môn (Phát triển của trẻ)
                            </label>
                            <textarea
                              rows={3}
                              value={devProfComment}
                              onChange={(e) => setDevProfComment(e.target.value)}
                              disabled={!perms.canEditEvaluation || !isViewingLatest}
                              placeholder="Nhận xét về sự phát triển chuyên môn của trẻ..."
                              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs bg-white disabled:bg-slate-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#003B3A] mb-1">
                              Nhận xét tâm lý, cảm xúc của trẻ
                            </label>
                            <textarea
                              rows={3}
                              value={devPsyComment}
                              onChange={(e) => setDevPsyComment(e.target.value)}
                              disabled={!perms.canEditEvaluation || !isViewingLatest}
                              placeholder="Nhận xét về trạng thái tâm lý, cảm xúc của trẻ..."
                              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs bg-white disabled:bg-slate-50"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                          <label className="block text-[11px] font-bold text-amber-900 mb-1">
                            Lưu ý quan trọng (Dị ứng, sức khỏe, thói quen...)
                          </label>
                          <textarea
                            rows={2}
                            value={devImportantNote}
                            onChange={(e) => setDevImportantNote(e.target.value)}
                            disabled={!perms.canEditEvaluation || !isViewingLatest}
                            placeholder="Ghi nhận dị ứng thực phẩm hoặc lưu ý quan trọng của trẻ..."
                            className="w-full rounded-lg border border-amber-200/80 bg-white px-3 py-1.5 text-xs disabled:bg-slate-50"
                          />
                        </div>

                        {perms.canEditEvaluation && isViewingLatest && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true)
                              setError(null)
                              setNotice(null)
                              try {
                                const scoresPayload = devCriteriaRows
                                  .map((r) => {
                                    const cid = r.criteriaId || r.id
                                    const val = devScoresMap[cid]
                                    return val?.result
                                      ? { criteriaId: cid, result: val.result, note: val.note || "" }
                                      : null
                                  })
                                  .filter(Boolean)

                                const devRes = await fetch("/api/preschool-dev-scores", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    studentId,
                                    scores: scoresPayload,
                                    devProfessionalComment: devProfComment,
                                    devPsychologyComment: devPsyComment,
                                    devImportantNote,
                                  }),
                                })
                                if (!devRes.ok) {
                                  const errD = await devRes.json().catch(() => ({}))
                                  throw new Error(errD?.error || "Không thể lưu Phiếu đánh giá phát triển.")
                                }

                                // Đồng bộ sang PreschoolAssessmentRound (B5/B4B)
                                const roundCriteria = devCriteriaRows.map((r) => {
                                  const cid = r.criteriaId || r.id
                                  const val = devScoresMap[cid] || { result: "", note: "" }
                                  return {
                                    code: r.criteriaCode || cid,
                                    area: r.areaName || "",
                                    name: r.criteriaName || "",
                                    result:
                                      val.result === "DAT"
                                        ? "Đạt"
                                        : val.result === "KHONG_DAT"
                                          ? "Không đạt"
                                          : val.result === "CHUA_THE_HIEN"
                                            ? "Chưa thể hiện"
                                            : "",
                                    note: val.note || "",
                                  }
                                })
                                await fetch(`/api/preschool-workflow/${studentId}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "SAVE_EVALUATION",
                                    roundId: viewingRound?.id,
                                    formCode: selectedFormCode,
                                    criteria: roundCriteria,
                                    generalComment: devProfComment,
                                    experienceObservation,
                                  }),
                                })

                                setNotice("Đã lưu Phiếu đánh giá phát triển (B5/B4B) thành công.")
                                await fetchDossier(studentId!)
                                onUpdated()
                              } catch (err: any) {
                                setError(err?.message || "Lỗi khi lưu Phiếu đánh giá phát triển.")
                              } finally {
                                setSaving(false)
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {saving ? "Đang lưu..." : "Lưu Phiếu đánh giá phát triển (B5/B4B)"}
                          </button>
                        )}
                      </div>
                    )
                  }

                  return viewingRound?.roundType === "KHAO_SAT_MOI" ? (
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
                      {perms.canEditEvaluation && isViewingLatest && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runAction(
                              {
                                action: "SAVE_EVALUATION",
                                formCode: selectedFormCode,
                                criteria: [],
                                generalComment,
                                experienceObservation,
                              },
                              "Đã lưu kết quả quan sát trải nghiệm."
                            )
                          }
                          className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                        >
                          Lưu kết quả quan sát
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* TAB 3B: B6 PHÂN CÔNG HỌC TRẢI NGHIỆM, KẾT QUẢ HỌC TRẢI NGHIỆM & SÀNG LỌC TÂM LÝ */}
            {!loading && student && activeTab === "trial" && (() => {
              const trialCriteriaRows: Array<{ key: string; area: string; name: string; initialResult: string }> =
                legacyDev && legacyDev.scores?.length > 0
                  ? legacyDev.scores.map((sc: any) => ({
                      key: sc.criteriaCode || sc.id || sc.criteriaName,
                      area: sc.areaName || "Đánh giá phát triển",
                      name: sc.criteriaName || "—",
                      initialResult:
                        sc.result === "DAT" ? "Đạt" : sc.result === "KHONG_DAT" ? "Không đạt" : "Chưa thể hiện",
                    }))
                  : activeFormDef.defaultCriteria.map((c) => ({
                      key: c.code,
                      area: c.area,
                      name: c.name,
                      initialResult: criteriaRatings[c.code]?.result || "—",
                    }))

              const selectedPsyUser = allDirectoryUsers.find((u) => u.id === trialPsyId)
              const psyStatus = String(student.trialPsychologyStatus || "").toUpperCase()
              const psyStatusBadge =
                psyStatus === "COMPLETED"
                  ? { label: "✓ GV Tâm lý đã hoàn tất đánh giá", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                  : psyStatus === "CONFIRMED"
                    ? { label: "✓ GV Tâm lý đã xác nhận tiếp nhận", cls: "bg-teal-50 text-[#00736E] border-teal-200" }
                    : student.trialPsychologyEmailSentAt
                      ? { label: "● Đã gửi email — Chờ GV Tâm lý xác nhận", cls: "bg-amber-50 text-amber-800 border-amber-200" }
                      : null

              const saveTrial = (sendEmailFlag: boolean) => {
                const flaggedNames = trialCriteriaRows
                  .filter((r) => trialCriteriaMap[r.key]?.psyFlag)
                  .map((r) => r.name)
                runAction(
                  {
                    action: "SAVE_TRIAL_WORKFLOW",
                    probationaryClass: trialClass,
                    probationaryTeacher: trialTeacher,
                    probationaryPeriod: trialPeriod,
                    probationaryResult: trialResult,
                    probationaryComment: trialComment,
                    probationaryBghStatus: trialBghStatus,
                    probationaryBghComment: trialBghComment,
                    trialPsychologyScreening: trialPsyScreening,
                    trialPsychologistId: trialPsyScreening ? (selectedPsyUser?.id || trialPsyId || null) : null,
                    trialPsychologistName: trialPsyScreening ? (selectedPsyUser?.fullName || student.trialPsychologistName || null) : null,
                    trialPsychologistEmail: trialPsyScreening ? (selectedPsyUser?.email || student.trialPsychologistEmail || null) : null,
                    trialCriteriaPayload: trialCriteriaMap,
                    flaggedCriteriaNames: flaggedNames,
                    psychologyNote: trialPsyNote,
                    sendPsychologyEmail: sendEmailFlag,
                  },
                  sendEmailFlag
                    ? "Đã lưu B6 Học trải nghiệm và gửi email yêu cầu xác nhận tới GV Tâm lý."
                    : "Đã lưu phân công & kết quả học trải nghiệm (B6)."
                )
              }

              return (
                <div className="space-y-4 text-xs">
                  {/* 1. Phân công học trải nghiệm */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-[#003B3A]">B6: Phân công học trải nghiệm &amp; Kết quả học trải nghiệm</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ghi nhận phân công lớp/GV học trải nghiệm, đánh giá lại theo mẫu phiếu và sàng lọc tâm lý (khi cần).
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          student.probationaryBghStatus === "DAT" || student.probationaryResult === "DAT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : trialTeacher || trialClass
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {student.probationaryBghStatus === "DAT"
                          ? "✓ BGH đã duyệt Đạt sau học trải nghiệm"
                          : trialResult === "DAT"
                            ? "GV học trải nghiệm: Đạt"
                            : trialTeacher || trialClass
                              ? "● Đang học trải nghiệm"
                              : "Chưa phân công học trải nghiệm"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Lớp học trải nghiệm</label>
                        <input
                          type="text"
                          value={trialClass}
                          onChange={(e) => setTrialClass(e.target.value)}
                          placeholder="VD: ROOTS - C1, SEEDS - A2..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">GV đánh giá học trải nghiệm</label>
                        <input
                          type="text"
                          list="preschool-trial-teachers-list"
                          value={trialTeacher}
                          onChange={(e) => setTrialTeacher(e.target.value)}
                          placeholder="Chọn hoặc nhập tên GV..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                        />
                        <datalist id="preschool-trial-teachers-list">
                          {(staffDir?.homeroomTeachers || allDirectoryUsers).map((u: any) => (
                            <option key={u.id} value={u.fullName} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Thời gian học trải nghiệm</label>
                        <input
                          type="text"
                          value={trialPeriod}
                          onChange={(e) => setTrialPeriod(e.target.value)}
                          placeholder="VD: 01/12/2026 - 05/12/2026"
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                        />
                      </div>
                    </div>

                    {/* Khối Sàng lọc tâm lý */}
                    <div className={`rounded-xl border p-4 space-y-3 ${trialPsyScreening ? "bg-amber-50/60 border-amber-200" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={trialPsyScreening}
                          onChange={(e) => setTrialPsyScreening(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#003B3A] cursor-pointer"
                        />
                        <span className="font-bold text-[#003B3A]">
                          Sàng lọc tâm lý (trẻ có dấu hiệu / vấn đề tâm lý cần GV Tâm lý đánh giá)
                        </span>
                      </label>

                      {trialPsyScreening && (
                        <div className="space-y-3 pt-2 border-t border-amber-200/70">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">
                                Chọn GV Tâm lý đánh giá <span className="text-rose-600">*</span>
                              </label>
                              <select
                                value={trialPsyId}
                                onChange={(e) => setTrialPsyId(e.target.value)}
                                className="w-full rounded-xl border border-[#E2E8F0] px-2.5 py-2 bg-white"
                              >
                                <option value="">-- Chọn chuyên viên Tổ Tâm lý --</option>
                                {staffDir?.psychologyStaff?.length > 0 && (
                                  <optgroup label="Tổ Tâm lý học đường">
                                    {staffDir.psychologyStaff.map((u: any) => (
                                      <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {staffDir?.otherStaff?.length > 0 && (
                                  <optgroup label="Nhân sự khác">
                                    {staffDir.otherStaff.map((u: any) => (
                                      <option key={u.id} value={u.id}>{formatStaffOptionLabel(u)}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">Ghi chú gửi GV Tâm lý</label>
                              <input
                                type="text"
                                value={trialPsyNote}
                                onChange={(e) => setTrialPsyNote(e.target.value)}
                                placeholder="Mô tả dấu hiệu cần sàng lọc tâm lý..."
                                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {psyStatusBadge && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${psyStatusBadge.cls}`}>
                                  {psyStatusBadge.label}
                                </span>
                              )}
                              {student.trialPsychologyConfirmedAt && (
                                <span className="text-[11px] text-slate-500 tabular-nums">
                                  Xác nhận lúc: {new Date(student.trialPsychologyConfirmedAt).toLocaleString("vi-VN")}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              disabled={saving || !trialPsyId}
                              onClick={() => saveTrial(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                              Lưu &amp; Gửi email cho GV Tâm lý
                            </button>
                          </div>

                          {(student.trialPsychologyConclusion || student.trialPsychologyFeedback) && (
                            <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-1">
                              <div className="font-bold text-[#003B3A]">Phản hồi từ GV Tâm lý ({student.trialPsychologistName || "Tổ Tâm lý"}):</div>
                              {student.trialPsychologyConclusion && (
                                <div className="text-slate-700"><strong>Kết luận:</strong> {student.trialPsychologyConclusion}</div>
                              )}
                              {student.trialPsychologyFeedback && (
                                <div className="text-slate-600"><strong>Nhận xét:</strong> {student.trialPsychologyFeedback}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Phiếu đánh giá phát triển kèm cột Học trải nghiệm & GV đánh giá */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#003B3A]">
                        Phiếu theo dõi đánh giá Học trải nghiệm ({trialCriteriaRows.length} tiêu chí)
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Tick <strong>Sàng lọc tâm lý</strong> ở cột Học trải nghiệm nếu phát hiện dấu hiệu cần đánh giá tâm lý
                      </span>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto rounded-xl border border-[#E2E8F0]">
                      <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                        <thead className="bg-[#003B3A] text-white sticky top-0 z-10">
                          <tr>
                            <th className="py-2 px-2.5 text-teal-100 font-semibold">Lĩnh vực</th>
                            <th className="py-2 px-2.5 text-white font-semibold">Tiêu chí</th>
                            <th className="py-2 px-2.5 text-teal-100 font-semibold whitespace-nowrap">KQ Đánh giá</th>
                            <th className="py-2 px-2.5 text-[#5EEAD4] font-semibold">Học trải nghiệm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] bg-white">
                          {trialCriteriaRows.map((row) => {
                            const entry = trialCriteriaMap[row.key] || {
                              trialResult: "",
                              evaluator: trialTeacher || "",
                              psyFlag: false,
                            }
                            return (
                              <tr key={row.key} className="hover:bg-[#F8FAFC]">
                                <td className="py-2 px-2.5 text-slate-600 align-middle">{row.area}</td>
                                <td className="py-2 px-2.5 text-slate-800 align-middle">{row.name}</td>
                                <td className="py-2 px-2.5 font-semibold whitespace-nowrap align-middle">
                                  <span
                                    className={
                                      row.initialResult === "Đạt"
                                        ? "text-emerald-700"
                                        : row.initialResult === "Không đạt"
                                          ? "text-rose-700"
                                          : "text-amber-700"
                                    }
                                  >
                                    {row.initialResult}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 align-middle">
                                  <div className="flex flex-col gap-1">
                                    <select
                                      value={entry.trialResult}
                                      onChange={(e) =>
                                        setTrialCriteriaMap((prev) => ({
                                          ...prev,
                                          [row.key]: { ...entry, trialResult: e.target.value },
                                        }))
                                      }
                                      className="rounded-lg border border-[#E2E8F0] px-2 py-1 bg-white text-[11px]"
                                    >
                                      <option value="">-- Chọn --</option>
                                      <option value="DAT">Đạt</option>
                                      <option value="CHUA_DAT">Chưa đạt</option>
                                      <option value="CHUA_THE_HIEN">Chưa thể hiện</option>
                                    </select>
                                    <label className="inline-flex items-center gap-1 text-[10px] text-amber-800 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={entry.psyFlag}
                                        onChange={(e) => {
                                          const checked = e.target.checked
                                          setTrialCriteriaMap((prev) => ({
                                            ...prev,
                                            [row.key]: { ...entry, psyFlag: checked },
                                          }))
                                          if (checked && !trialPsyScreening) setTrialPsyScreening(true)
                                        }}
                                        className="w-3.5 h-3.5 rounded accent-amber-600 cursor-pointer"
                                      />
                                      Sàng lọc tâm lý
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. Kết quả đánh giá học trải nghiệm & BGH duyệt KQ học trải nghiệm */}
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                    <h4 className="text-sm font-bold text-[#003B3A]">Kết quả học trải nghiệm &amp; BGH Mầm non duyệt kết quả học trải nghiệm</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kết quả GV đánh giá học trải nghiệm</label>
                        <select
                          value={trialResult}
                          onChange={(e) => setTrialResult(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                        >
                          <option value="">Chưa đánh giá</option>
                          <option value="DAT">Đạt</option>
                          <option value="CHUA_DAT">Chưa đạt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">BGH Mầm non duyệt kết quả học trải nghiệm</label>
                        <select
                          value={trialBghStatus}
                          onChange={(e) => setTrialBghStatus(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white"
                        >
                          <option value="">Chưa duyệt</option>
                          <option value="DAT">Đạt (chuyển GĐCS xét duyệt)</option>
                          <option value="KHONG_DAT">Không đạt</option>
                          <option value="Y_KIEN_KHAC">Ý kiến khác</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nhận xét kết quả học trải nghiệm</label>
                      <textarea
                        rows={2}
                        value={trialComment}
                        onChange={(e) => setTrialComment(e.target.value)}
                        placeholder="Ghi nhận khả năng hòa nhập, vận động, ngôn ngữ, tâm lý trong thời gian học trải nghiệm..."
                        className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveTrial(false)}
                        className="px-4 py-2 rounded-xl bg-[#00A19A] hover:bg-[#008B85] text-white font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Lưu phân công &amp; Kết quả học trải nghiệm (B6)
                      </button>
                      {trialPsyScreening && trialPsyId && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveTrial(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                          Lưu &amp; Gửi email GV Tâm lý
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* TAB 4: B7 TÂM LÝ — KẾT QUẢ KHẢO SÁT TÂM LÝ TỪ GV TÂM LÝ */}
            {!loading && student && activeTab === "psychology" && (
              <div className="space-y-4 text-xs">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#003B3A]">B7: Kết quả khảo sát tâm lý (BM.KTĐBCL.09)</h3>
                      <p className="text-slate-500 mt-0.5">Cập nhật kết quả khảo sát, phỏng vấn và khuyến nghị từ GV Tâm lý.</p>
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

                  {/* Thông tin GV Tâm lý & trạng thái phản hồi */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs tabular-nums">
                    <div>
                      <span className="text-[11px] text-slate-500 block">GV Tâm lý phân công</span>
                      <strong className="text-[#003B3A]">
                        {student.trialPsychologistName || viewingRound?.assignedPsychologistName || "Chưa phân công"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Trạng thái khảo sát tâm lý</span>
                      <strong
                        className={
                          hasPsyResult || student.trialPsychologyStatus === "COMPLETED"
                            ? "text-emerald-700"
                            : student.trialPsychologyStatus === "CONFIRMED"
                              ? "text-[#00736E]"
                              : student.trialPsychologyEmailSentAt || Number(student.trialPsychologyScreening || 0) === 1
                                ? "text-amber-700"
                                : "text-slate-500"
                        }
                      >
                        {hasPsyResult || student.trialPsychologyStatus === "COMPLETED"
                          ? `Đã hoàn thành${viewingRound?.psychologistSubmittedAt ? ` (${new Date(viewingRound.psychologistSubmittedAt).toLocaleString("vi-VN")})` : ""}`
                          : student.trialPsychologyStatus === "CONFIRMED"
                            ? `GV Tâm lý đã xác nhận${student.trialPsychologyConfirmedAt ? ` (${new Date(student.trialPsychologyConfirmedAt).toLocaleString("vi-VN")})` : ""}`
                            : student.trialPsychologyEmailSentAt
                              ? `Đã gửi email chờ xác nhận (${new Date(student.trialPsychologyEmailSentAt).toLocaleString("vi-VN")})`
                              : Number(student.trialPsychologyScreening || 0) === 1
                                ? "Đã đánh dấu cần sàng lọc tâm lý"
                                : "Không phát sinh"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Người cập nhật kết quả</span>
                      <strong className="text-slate-800">
                        {viewingRound?.psychologistSubmittedBy || student.trialPsychologistName || "—"}
                      </strong>
                    </div>
                  </div>

                  {student.trialPsychologyFeedback && (
                    <div className="rounded-xl border border-teal-200 bg-[#F0FDFA] p-3.5 text-xs space-y-1">
                      <span className="font-bold text-[#003B3A] block">Phản hồi / Nhận xét từ GV Tâm lý</span>
                      <p className="text-slate-700 leading-relaxed">{student.trialPsychologyFeedback}</p>
                    </div>
                  )}

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
                        <label className="block font-semibold text-slate-700 mb-1">Kết luận & khuyến nghị từ GV Tâm lý</label>
                        <textarea
                          rows={3}
                          value={psyConclusion}
                          onChange={(e) => setPsyConclusion(e.target.value)}
                          placeholder="Ghi nhận kết quả khảo sát tâm lý và khuyến nghị từ GV Tâm lý..."
                          className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2"
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
                              },
                              "Đã cập nhật kết quả khảo sát tâm lý từ GV Tâm lý."
                            )
                          }}
                          className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white font-semibold cursor-pointer"
                        >
                          Cập nhật kết quả khảo sát tâm lý
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: B6 / B9A REVIEW & B10 APPROVAL */}
            {!loading && student && activeTab === "review" && (() => {
              const hasTrialInfo = Boolean(
                student.probationaryClass ||
                  student.probationaryTeacher ||
                  student.probationaryPeriod ||
                  student.probationaryResult ||
                  student.probationaryBghStatus ||
                  student.probationaryComment
              )
              const hasPsyNeeded = Boolean(
                hasPsyResult ||
                  Number(student.trialPsychologyScreening || 0) === 1 ||
                  student.trialPsychologyStatus ||
                  student.trialPsychologistName ||
                  viewingRound?.psychologyRequired ||
                  viewingRound?.assignedPsychologistName ||
                  psyConclusion
              )
              const psyStatusLabel =
                hasPsyResult || student.trialPsychologyStatus === "COMPLETED"
                  ? "Đã hoàn thành"
                  : student.trialPsychologyStatus === "CONFIRMED"
                    ? "GV Tâm lý đã xác nhận"
                    : hasPsyNeeded
                      ? "Đang chờ đánh giá"
                      : "Không yêu cầu"
              const psyStatusClass =
                hasPsyResult || student.trialPsychologyStatus === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : student.trialPsychologyStatus === "CONFIRMED"
                    ? "bg-teal-50 text-[#00736E] border-teal-200"
                    : hasPsyNeeded
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"

              const b6DecisionLabels: Record<string, string> = {
                DE_XUAT_DAT: "Đề xuất Đạt → Trình B10",
                DE_XUAT_CHUA_DAT: "Đề xuất Chưa đạt → B10",
                CAN_TAM_LY: "Cần PV tâm lý (B7A)",
                HEN_TRAI_NGHIEM_BO_SUNG: "Hẹn trải nghiệm (B7B)",
                HEN_TRAI_NGHIEM: "Hẹn trải nghiệm (B7B)",
                DAT: "Đề xuất Đạt → Trình B10",
                DAT_MIEN_HOC_THU: "Đề xuất Đạt → Trình B10",
                KHONG_DAT: "Đề xuất Chưa đạt → B10",
              }
              const effectiveB6Decision = viewingRound?.reviewDecision || student.bghApprovalStatus || ""
              const b6ReviewDone = Boolean(viewingRound?.reviewedAt || effectiveB6Decision)
              const b6ReviewerName = viewingRound?.reviewedByName || student.bghApprovalUser || ""
              const b6ReviewedAt = viewingRound?.reviewedAt || student.bghApprovalDate || null
              const b10Outcome = student.finalApprovedOutcome || viewingRound?.gdcsDecision || ""
              const b10Done = Boolean(b10Outcome)
              const b10ApproverName = viewingRound?.gdcsUserName || student.gdcsApprovalUser || ""
              const b10ApprovedAt = viewingRound?.gdcsApprovedAt || student.gdcsApprovalDate || null
              const autoSkipToGdcs = !hasTrialInfo && !hasPsyNeeded && effectiveB6Decision !== "CAN_TAM_LY" && effectiveB6Decision !== "HEN_TRAI_NGHIEM_BO_SUNG" && effectiveB6Decision !== "HEN_TRAI_NGHIEM"
              const approvalAuditLogs = (dossier?.auditLogs || []).filter((l: any) =>
                ["SUBMIT_EVALUATION", "REVIEW_B6_B9A", "ASSIGN_TRIAL", "BGH_TRIAL_APPROVE", "APPROVE_B10", "SEND_APPROVAL_EMAIL"].includes(
                  String(l.action || "").toUpperCase()
                )
              )

              return (
              <div className="space-y-4 text-xs">
                {/* Tổng quan kết quả B5/B4B · Học trải nghiệm · B7 Tâm lý */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 border-l-4 border-l-[#003B3A]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#003B3A]">
                      Tổng quan kết quả trước khi phê duyệt
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("health")}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer tabular-nums ${
                        hasHealthResult
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      B4A Y tế:{" "}
                      {hasHealthResult
                        ? `${heightCm || viewingRound?.heightCm || legacyDev?.heightCm || "—"} cm · ${weightKg || viewingRound?.weightKg || legacyDev?.weightKg || "—"} kg`
                        : "Chưa ghi nhận"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
                    {/* Card 1: B5/B4B Đánh giá phát triển */}
                    <div
                      onClick={() => setActiveTab("evaluation")}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#00A19A] p-3 space-y-1.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-[#003B3A]">B5/B4B · Đánh giá</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            hasEvalResult
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {hasEvalResult ? "Đã đánh giá" : "Chưa đánh giá"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Mẫu: <strong className="text-slate-800">{viewingRound?.formCode || selectedFormCode}</strong>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        GV: <strong className="text-slate-800">{effectiveTeacherName}</strong>
                      </div>
                      {(legacyDev?.totalScored || 0) > 0 ? (
                        <div className="pt-1 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-800 font-semibold">
                            {legacyDev.datCount}/{legacyDev.totalScored} Đạt ({legacyDev.pctDat}%)
                          </span>
                          {legacyDev.chuaTheHienCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 font-medium">
                              {legacyDev.chuaTheHienCount} Chưa thể hiện
                            </span>
                          )}
                          {legacyDev.khongDatCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100/80 text-rose-800 font-semibold">
                              {legacyDev.khongDatCount} Không đạt
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic">Chưa có điểm tiêu chí B5</div>
                      )}
                      {(student.devProfessionalComment || generalComment || experienceObservation) && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 pt-1 border-t border-slate-200/70">
                          “{student.devProfessionalComment || generalComment || experienceObservation}”
                        </p>
                      )}
                    </div>

                    {/* Card 2: B6 Học trải nghiệm */}
                    <div
                      onClick={() => setActiveTab("trial")}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#00A19A] p-3 space-y-1.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-[#003B3A]">Học trải nghiệm</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            student.probationaryResult === "Đạt" || student.probationaryResult === "DAT"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : student.probationaryResult === "Chưa đạt" || student.probationaryResult === "KHONG_DAT" || student.probationaryResult === "CHUA_DAT"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : hasTrialInfo
                                  ? "bg-teal-50 text-[#00736E] border-teal-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {student.probationaryResult
                            ? student.probationaryResult
                            : hasTrialInfo
                              ? "Đã phân công"
                              : "Không phát sinh"}
                        </span>
                      </div>
                      {hasTrialInfo ? (
                        <>
                          <div className="text-[11px] text-slate-600 truncate">
                            Lớp: <strong className="text-slate-800">{student.probationaryClass || "—"}</strong>
                            {student.probationaryPeriod ? ` · ${student.probationaryPeriod}` : ""}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            GV phụ trách: <strong className="text-slate-800">{student.probationaryTeacher || "—"}</strong>
                          </div>
                          {student.probationaryBghStatus && (
                            <div className="text-[11px] text-slate-600">
                              BGH duyệt KQ: <strong className="text-[#00736E]">{student.probationaryBghStatus}</strong>
                            </div>
                          )}
                          {(student.probationaryComment || student.probationaryBghComment) && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 pt-1 border-t border-slate-200/70">
                              “{student.probationaryComment || student.probationaryBghComment}”
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Chưa có phân công hoặc kết quả học trải nghiệm.
                        </div>
                      )}
                    </div>

                    {/* Card 3: B7 Tâm lý */}
                    <div
                      onClick={() => setActiveTab("psychology")}
                      className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#00A19A] p-3 space-y-1.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-[#003B3A]">B7 · Tâm lý</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${psyStatusClass}`}>
                          {psyStatusLabel}
                        </span>
                      </div>
                      {hasPsyNeeded ? (
                        <>
                          <div className="text-[11px] text-slate-600 truncate">
                            GV Tâm lý:{" "}
                            <strong className="text-slate-800">
                              {student.trialPsychologistName || viewingRound?.assignedPsychologistName || "Chưa phân công"}
                            </strong>
                          </div>
                          {student.trialPsychologyConfirmedAt && (
                            <div className="text-[11px] text-emerald-700 font-medium">
                              Đã xác nhận ({new Date(student.trialPsychologyConfirmedAt).toLocaleDateString("vi-VN")})
                            </div>
                          )}
                          {(student.trialPsychologyFeedback || psyConclusion || student.devPsychComment) ? (
                            <p className="text-[11px] text-slate-600 line-clamp-2 pt-1 border-t border-slate-200/70">
                              “{student.trialPsychologyFeedback || psyConclusion || student.devPsychComment}”
                            </p>
                          ) : (
                            <div className="text-[11px] text-slate-500 italic">Chưa có kết luận từ GV Tâm lý</div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Không phát sinh yêu cầu phỏng vấn tâm lý (BM.KTĐBCL.09).
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pre-Approval Gate Checklist */}
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    gate.ready
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    {gate.ready ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    {gate.ready
                      ? autoSkipToGdcs
                        ? "Không phát sinh Học trải nghiệm & Tâm lý — Hồ sơ tự động bỏ qua và chuyển thẳng sang Bước 2 (GĐCS phê duyệt B10)."
                        : "Hồ sơ đã đủ điều kiện bắt buộc của nhánh hiện tại để trình duyệt GĐCS (B10)."
                      : "Chưa mở phê duyệt B10 — còn thiếu nội dung bắt buộc:"}
                  </div>
                  {!gate.ready && gate.missing.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {gate.missing.map((m: string, i: number) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                  {!gate.ready && autoSkipToGdcs && (
                    <div className="text-[11px] text-[#00736E] bg-white/80 border border-teal-200 rounded-lg px-2.5 py-1.5 font-medium">
                      Lưu ý: Hồ sơ không có Học trải nghiệm &amp; Tâm lý — sau khi Nhóm trưởng Mầm non xác nhận <strong>Bước 1 (Đề xuất Đạt / Chưa đạt)</strong>, hệ thống sẽ tự động bỏ qua B6 Học trải nghiệm &amp; B7 Tâm lý để mở ngay <strong>Bước 2 (GĐCS phê duyệt B10)</strong>.
                    </div>
                  )}
                  {Array.isArray(gate.warnings) && gate.warnings.length > 0 && (
                    <div className="text-[11px] text-amber-800 bg-amber-100/60 border border-amber-200/80 rounded-lg px-2.5 py-1.5">
                      {gate.warnings.join(" ")}
                    </div>
                  )}
                </div>

                {/* Bước 1 — B6 / B9A Review */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#003B3A] text-white text-[11px] font-bold">
                        Bước 1
                      </span>
                      <h3 className="text-sm font-bold text-[#003B3A]">
                        B6 / B9A: Nhóm trưởng Mầm non rà soát & định tuyến
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        b6ReviewDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {b6ReviewDone
                        ? `Đã định tuyến: ${b6DecisionLabels[effectiveB6Decision] || effectiveB6Decision}`
                        : "Chờ phê duyệt Bước 1"}
                    </span>
                  </div>
                  {(b6ReviewerName || b6ReviewedAt) && (
                    <div className="text-[11px] text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                      <span>GV đánh giá B5/B4B: <strong className="text-[#003B3A]">{effectiveTeacherName}</strong></span>
                      {b6ReviewerName && (
                        <span>Người rà soát B6/B9A: <strong className="text-slate-800">{b6ReviewerName}</strong></span>
                      )}
                      {b6ReviewedAt && (
                        <span>Thời gian: <strong className="text-slate-800">{new Date(b6ReviewedAt).toLocaleString("vi-VN")}</strong></span>
                      )}
                    </div>
                  )}
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
                      Xác nhận rà soát B6/B9A (Bước 1)
                    </button>
                  )}
                </div>

                {/* Bước 2 — B10 GĐCS Approval + 1-Tap Email Approval */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#00A19A] text-white text-[11px] font-bold">
                        Bước 2
                      </span>
                      <h3 className="text-sm font-bold text-[#003B3A]">
                        B10: Giám đốc Điều hành Cơ sở phê duyệt
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        b10Done
                          ? b10Outcome === "DAT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                          : gate.ready
                            ? "bg-teal-50 text-[#00736E] border-teal-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {b10Done
                        ? `Đã phê duyệt: ${b10Outcome === "DAT" ? "Đạt" : "Chưa đạt"}`
                        : gate.ready
                          ? "Sẵn sàng phê duyệt Bước 2"
                          : "Chờ hoàn tất điều kiện Bước 1"}
                    </span>
                  </div>
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
                  {(b10ApproverName || b10ApprovedAt) && (
                    <div className="text-[11px] text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                      {b10ApproverName && (
                        <span>Người phê duyệt B10: <strong className="text-[#003B3A]">{b10ApproverName}</strong></span>
                      )}
                      {b10ApprovedAt && (
                        <span>Thời gian: <strong className="text-slate-800">{new Date(b10ApprovedAt).toLocaleString("vi-VN")}</strong></span>
                      )}
                    </div>
                  )}
                </div>

                {/* Nhật ký đánh giá & phê duyệt */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#003B3A]">Nhật ký đánh giá & phê duyệt</h4>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {approvalAuditLogs.length} ghi nhận
                    </span>
                  </div>
                  {approvalAuditLogs.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic">Chưa có nhật ký phê duyệt nào.</div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9] text-[11px] tabular-nums">
                      {approvalAuditLogs.map((log: any) => (
                        <div key={log.id} className="py-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[#003B3A]">
                              {log.actorName || "Cán bộ SSM"}{" "}
                              <span className="font-normal text-slate-500">
                                ({log.action === "SUBMIT_EVALUATION"
                                  ? "GV đánh giá B5/B4B"
                                  : log.action === "REVIEW_B6_B9A"
                                    ? "Nhóm trưởng / BGH Mầm non (Bước 1)"
                                    : log.action === "APPROVE_B10"
                                      ? "GĐCS phê duyệt (Bước 2)"
                                      : log.action === "SEND_APPROVAL_EMAIL"
                                        ? "Gửi email trình duyệt B10"
                                        : log.action === "ASSIGN_TRIAL"
                                          ? "Phân lớp học trải nghiệm"
                                          : "BGH duyệt học trải nghiệm"})
                              </span>
                            </div>
                            {log.detailText && <div className="text-slate-600">{log.detailText}</div>}
                          </div>
                          {log.createdAt && (
                            <span className="text-slate-400 whitespace-nowrap shrink-0">
                              {new Date(log.createdAt).toLocaleString("vi-VN")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )
            })()}

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
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#003B3A]">Lược sử phân công, cập nhật phiếu, chuyển bước &amp; phê duyệt</h3>
                  <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                    {(dossier?.auditLogs || []).length} sự kiện
                  </span>
                </div>
                {(dossier?.auditLogs || []).length === 0 ? (
                  <p className="text-slate-500">Chưa có nhật ký tác động.</p>
                ) : (
                  <div className="space-y-2.5">
                    {dossier.auditLogs.map((log: any) => {
                      const ACTION_LABELS: Record<string, string> = {
                        CREATE_INTAKE: "B1–B2: Tiếp nhận hồ sơ khảo sát",
                        CONFIRM_INTAKE: "B3: Xác nhận đón trẻ & hình thức khảo sát",
                        ASSIGN_STAFF: "Phân công nhân sự thực hiện",
                        SAVE_HEALTH_CHECK: "B4A: Y tế kiểm tra thể chất",
                        CONFIRM_FORM: "Xác nhận biểu mẫu BM.KTĐBCL",
                        SUBMIT_EVALUATION: "B5/B4B: Giáo viên đánh giá phát triển",
                        SAVE_PSYCHOLOGY: "B7A: Đánh giá tâm lý (BM.KTĐBCL.09)",
                        SCHEDULE_FOLLOW_UP: "B7B: Hẹn lịch trải nghiệm / khảo sát lại",
                        REVIEW_B6_B9A: "B6/B9A: BGH Mầm non rà soát & xét duyệt",
                        ASSIGN_TRIAL: "Phân lớp & GV học trải nghiệm",
                        BGH_TRIAL_APPROVE: "BGH Mầm non duyệt kết quả học trải nghiệm",
                        APPROVE_B10: "B10: Giám đốc Cơ sở phê duyệt",
                        SEND_APPROVAL_EMAIL: "Gửi email yêu cầu phê duyệt",
                        DELIVER_RESULT: "B12: Trả kết quả cho Phụ huynh",
                        ARCHIVE_RECORD: "B13: Hoàn tất lưu hồ sơ",
                      }
                      const actionTitle = ACTION_LABELS[log.action] || log.action
                      let detailSummary = log.detailText || ""
                      if (!detailSummary && log.detailJson) {
                        try {
                          const d = JSON.parse(log.detailJson)
                          const pairs: string[] = []
                          if (d.assignedTeacherName) pairs.push(`GV: ${d.assignedTeacherName}`)
                          if (d.assignedMedicalName) pairs.push(`Y tế: ${d.assignedMedicalName}`)
                          if (d.assignedPsychologistName) pairs.push(`Tâm lý: ${d.assignedPsychologistName}`)
                          if (d.heightCm && d.weightKg) pairs.push(`${d.heightCm} cm · ${d.weightKg} kg${d.bmi ? ` (BMI ${d.bmi})` : ""}`)
                          if (d.formCode) pairs.push(`Mẫu: ${d.formCode}`)
                          if (d.decision || d.outcome) pairs.push(`Quyết định: ${d.decision || d.outcome}`)
                          if (d.note || d.comment) pairs.push(`Ghi chú: ${d.note || d.comment}`)
                          detailSummary = pairs.join(" · ")
                        } catch {}
                      }
                      return (
                        <div key={log.id} className="rounded-xl border border-[#E2E8F0] p-3.5 bg-[#F8FAFC] flex flex-wrap justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="font-bold text-[#003B3A] flex flex-wrap items-center gap-1.5">
                              <span>{actionTitle}</span>
                              {log.fromStatus || log.toStatus ? (
                                <span className="font-medium text-[11px] text-[#00736E] bg-[#F0FDFA] border border-[#CCFBF1] px-2 py-0.5 rounded-md">
                                  {log.fromStatus || "Khởi tạo"} → {log.toStatus || "—"}
                                </span>
                              ) : null}
                            </div>
                            {detailSummary && (
                              <div className="text-slate-700 leading-relaxed">{detailSummary}</div>
                            )}
                            <div className="text-[11px] text-slate-500">
                              Thực hiện: <strong className="text-slate-700">{log.actorName || "Hệ thống"}</strong> ({log.actorRole || "SYSTEM"}) · Nguồn:{" "}
                              <strong>{log.source === "EMAIL_ONE_TAP" ? "Email 1 chạm" : "Cổng SSM"}</strong>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 tabular-nums shrink-0">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "—"}
                          </div>
                        </div>
                      )
                    })}
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
        legacyDevSummary={dossier?.legacyDevSummary}
      />
    </>
  )
}
