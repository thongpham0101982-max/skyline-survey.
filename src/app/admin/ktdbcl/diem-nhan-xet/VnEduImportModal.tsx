"use client"

import React, { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  Search,
  Upload,
  X,
  XCircle,
} from "lucide-react"
import toast from "react-hot-toast"
import {
  buildPrimaryVnEduDefaultConfig,
  buildSecondaryTt22VnEduDefaultConfig,
  extractGradeNumber,
  getSubjectCurriculumGroup,
  isEnglishSubjectName,
  isPrimaryGrade,
  isSecondaryOrHighGrade,
  normalizeGradeColumnDefs,
} from "@/lib/grading/vnedu-config-types"

interface VnEduImportModalProps {
  isOpen: boolean
  onClose: () => void
  academicYearId: string
  academicYearName: string
  defaultPeriod: string
  defaultClassId?: string
  initialFiles?: File[]
  classes: any[]
  subjects: any[]
  configs: any[]
  onImportSuccess: () => void
}

const EVAL_PERIOD_OPTIONS = [
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "HK1", name: "Học kỳ 1 (HK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" },
  { code: "HK2", name: "Học kỳ 2 (HK2)" },
  { code: "CN", name: "Cả năm (CN)" },
]

export function VnEduImportModal({
  isOpen,
  onClose,
  academicYearId,
  academicYearName,
  defaultPeriod,
  defaultClassId = "",
  initialFiles = [],
  classes,
  subjects,
  configs,
  onImportSuccess,
}: VnEduImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [files, setFiles] = useState<File[]>([])
  const [parsing, setParsing] = useState(false)
  const [sessionId, setSessionId] = useState<string>("")
  const [workbookWarnings, setWorkbookWarnings] = useState<any[]>([])
  const [sheetRows, setSheetRows] = useState<any[]>([])
  const [subjectSearchBySheet, setSubjectSearchBySheet] = useState<Record<string, string>>({})
  const [selectedSheetKeys, setSelectedSheetKeys] = useState<Set<string>>(new Set())

  const [mode, setMode] = useState<"FILL_EMPTY" | "UPDATE_EXISTING">("FILL_EMPTY")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTimestamp, setPreviewTimestamp] = useState<string>("")
  const [previewSheetResults, setPreviewSheetResults] = useState<any[]>([])
  const [previewItems, setPreviewItems] = useState<any[]>([])
  const [selectedItemKeys, setSelectedItemKeys] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [sheetFilter, setSheetFilter] = useState<string>("ALL")
  const [ignoreExtraConfirmed, setIgnoreExtraConfirmed] = useState<boolean>(false)

  const [committing, setCommitting] = useState(false)
  const [commitSummary, setCommitSummary] = useState<any>(null)

  const vnEduConfigs = useMemo(
    () => configs.filter(c => c.configType === "VNEDU" && c.isActive !== false),
    [configs]
  )

  const resetAll = () => {
    setStep(1)
    setFiles([])
    setSessionId("")
    setWorkbookWarnings([])
    setSheetRows([])
    setSelectedSheetKeys(new Set())
    setPreviewSheetResults([])
    setPreviewItems([])
    setSelectedItemKeys(new Set())
    setCommitSummary(null)
    setIgnoreExtraConfirmed(false)
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  const getSheetKey = (s: { fileName: string; sheetName: string }) => `${s.fileName}::${s.sheetName}`

  const resolveSheetConfigInfo = (classId: string, subjectId: string, period: string) => {
    if (!classId || !subjectId) {
      return { found: false, label: "Chưa xác định môn đích", isUnconfirmed: false, config: null }
    }
    const cls = classes.find(c => c.id === classId)
    const rawGrade = String(cls?.grade || cls?.className || "").trim()
    const numMatch = rawGrade.match(/(\d+)/)
    const gNum = numMatch ? numMatch[1] : ""
    const gradeCandidates = new Set([rawGrade, gNum ? `Khối ${gNum}` : "", gNum].filter(Boolean))

    const matched =
      vnEduConfigs.find(
        c => c.subjectId === subjectId && gradeCandidates.has(String(c.grade).trim()) && c.evaluationPeriod === period
      ) ||
      vnEduConfigs.find(
        c => c.subjectId === subjectId && gradeCandidates.has(String(c.grade).trim()) && c.evaluationPeriod === "ALL"
      ) ||
      vnEduConfigs.find(c => c.subjectId === subjectId && c.grade === "ALL" && c.evaluationPeriod === period)

    if (!matched) {
      const subj = subjects.find(s => s.id === subjectId)
      const gradeInt = extractGradeNumber(rawGrade)
      if (subj && isEnglishSubjectName(subj.subjectName) && (gradeInt === 1 || gradeInt === 2)) {
        return {
          found: false,
          label: "Chưa xác nhận cấu hình vnEdu (Tiếng Anh K1–2)",
          isUnconfirmed: true,
          config: null,
        }
      }
      if (isPrimaryGrade(rawGrade)) {
        const autoPrimary = buildPrimaryVnEduDefaultConfig({
          grade: rawGrade || "Khối 1",
          subjectId,
          subjectName: subj?.subjectName || subj?.subjectCode || "",
          evaluationPeriod: period,
        })
        const defs = normalizeGradeColumnDefs(autoPrimary)
        return {
          found: true,
          label: `Chuẩn TT27: ${defs.map(d => d.label).join(", ")}`,
          isUnconfirmed: false,
          config: autoPrimary,
        }
      }
      if (isSecondaryOrHighGrade(rawGrade)) {
        const autoSecondary = buildSecondaryTt22VnEduDefaultConfig({
          grade: rawGrade || "Khối 6",
          subjectId,
          subjectName: subj?.subjectName || subj?.subjectCode || "",
          evaluationPeriod: period,
        })
        const defs = normalizeGradeColumnDefs(autoSecondary)
        return {
          found: true,
          label: `Chuẩn TT22: ${defs.map(d => d.label).join(", ")}`,
          isUnconfirmed: false,
          config: autoSecondary,
        }
      }
      return {
        found: false,
        label: "Thiếu cấu hình vnEdu cho môn/khối/kỳ",
        isUnconfirmed: true,
        config: null,
      }
    }
    if (matched.confirmationStatus === "UNCONFIRMED") {
      return {
        found: true,
        label: "Chưa xác nhận cấu hình vnEdu",
        isUnconfirmed: true,
        config: matched,
      }
    }

    let colLabels: string[] = []
    try {
      if (matched.columnsJson) {
        colLabels = JSON.parse(matched.columnsJson).map((c: any) => c.label)
      } else {
        colLabels = JSON.parse(matched.columnNames || "[]")
        if (matched.hasRatingColumn) colLabels.push(matched.ratingColumnName || "Xếp loại")
        if (matched.hasRemarkColumn !== false) colLabels.push("Nhận xét")
      }
    } catch {
      colLabels = []
    }

    return {
      found: true,
      label: `v${matched.version || 1}: ${colLabels.join(", ") || "Không có cột điểm"}`,
      isUnconfirmed: false,
      config: matched,
    }
  }

  const resolveForeignLanguageFallbackId = (rawDetectedSubject: string): string => {
    const lower = String(rawDetectedSubject || "").toLowerCase().trim()
    if (lower.includes("ngoại ngữ") || lower.includes("ngoai ngu")) {
      const exactForeign = subjects.find(s => String(s.subjectName || "").toLowerCase().includes("ngoại ngữ"))
      if (exactForeign) return exactForeign.id
      const moetEnglish = subjects.find(
        s => isEnglishSubjectName(s.subjectName) && getSubjectCurriculumGroup(s) === "MOET"
      )
      if (moetEnglish) return moetEnglish.id
      const anyEnglish = subjects.find(s => isEnglishSubjectName(s.subjectName))
      if (anyEnglish) return anyEnglish.id
    }
    return ""
  }

  const handleParseFiles = async (overrideFiles?: File[]) => {
    const activeFiles = overrideFiles && overrideFiles.length > 0 ? overrideFiles : files
    if (activeFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 file Excel (.xls / .xlsx)")
      return
    }
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append("academicYearId", academicYearId)
      fd.append("evaluationPeriod", defaultPeriod || "GK1")
      if (defaultClassId) {
        fd.append("defaultClassId", defaultClassId)
      }
      activeFiles.forEach(f => fd.append("files", f))

      const res = await fetch("/api/admin/ktdbcl/vnedu-import", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể đọc file Excel vnEdu")
        return
      }

      setSessionId(data.sessionId)
      setWorkbookWarnings(data.workbooks || [])
      const rows = (data.sheets || []).map((sh: any) => {
        const resolvedClassId = sh.suggestedClassId || defaultClassId || ""
        const resolvedSubjectId =
          sh.suggestedSubjectId || resolveForeignLanguageFallbackId(sh.detectedSubject || sh.sheetName) || ""
        return {
          ...sh,
          targetClassId: resolvedClassId,
          targetSubjectId: resolvedSubjectId,
          evaluationPeriod: sh.detectedPeriod || defaultPeriod || "GK1",
          confirmedByUser: Boolean(resolvedClassId && resolvedSubjectId),
          skip: false,
        }
      })
      setSheetRows(rows)
      setSelectedSheetKeys(new Set(rows.map((r: any) => getSheetKey(r))))
      setStep(2)
      toast.success(`Đã nhận diện ${rows.length} sheet (môn học) từ ${activeFiles.length} file`)
    } catch (err: any) {
      toast.error(err?.message || "Lỗi kết nối khi đọc file")
    } finally {
      setParsing(false)
    }
  }

  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0 && step === 1 && sheetRows.length === 0 && !parsing) {
      setFiles(initialFiles)
      handleParseFiles(initialFiles)
    }
  }, [isOpen, initialFiles])

  const updateSheetRow = (key: string, patch: Record<string, any>) => {
    setSheetRows(prev =>
      prev.map(r => {
        if (getSheetKey(r) !== key) return r
        const next = { ...r, ...patch }
        if ("targetSubjectId" in patch || "targetClassId" in patch || "evaluationPeriod" in patch) {
          next.confirmedByUser = Boolean(next.targetClassId && next.targetSubjectId)
          setPreviewItems([])
          setPreviewSheetResults([])
        }
        return next
      })
    )
  }

  const handleApplyClassToAllSheets = (classId: string) => {
    if (!classId) return
    setSheetRows(prev =>
      prev.map(r => ({
        ...r,
        targetClassId: classId,
        confirmedByUser: Boolean(classId && r.targetSubjectId),
      }))
    )
    setPreviewItems([])
    setPreviewSheetResults([])
    const clsName = classes.find(c => c.id === classId)?.className || ""
    toast.success(`Đã áp dụng lớp ${clsName} cho tất cả các sheet`)
  }

  const handleApplyPeriodToAllSheets = (periodCode: string) => {
    if (!periodCode) return
    setSheetRows(prev =>
      prev.map(r => ({
        ...r,
        evaluationPeriod: periodCode,
        confirmedByUser: Boolean(r.targetClassId && r.targetSubjectId),
      }))
    )
    setPreviewItems([])
    setPreviewSheetResults([])
    toast.success(`Đã áp dụng kỳ ${periodCode} cho tất cả các sheet`)
  }

  const handleBatchConfirmSelected = () => {
    let confirmedCount = 0
    setSheetRows(prev =>
      prev.map(r => {
        const key = getSheetKey(r)
        if (!selectedSheetKeys.has(key) || r.skip) return r
        if (!r.targetSubjectId || !r.targetClassId) return r
        confirmedCount++
        return { ...r, confirmedByUser: true }
      })
    )
    if (confirmedCount === 0) {
      toast.error("Vui lòng chọn lớp và môn SSM cho các dòng được chọn trước khi xác nhận")
    } else {
      toast.success(`Đã xác nhận mapping cho ${confirmedCount} sheet`)
    }
  }

  const handleRunPreview = async (overrideMode?: "FILL_EMPTY" | "UPDATE_EXISTING") => {
    const activeMode = overrideMode || mode
    const active = sheetRows.filter(r => !r.skip)
    if (active.length === 0) {
      toast.error("Tất cả sheet đang được đánh dấu bỏ qua")
      return
    }
    const missingTarget = active.find(r => !r.targetSubjectId || !r.targetClassId)
    if (missingTarget) {
      toast.error(`Sheet "${missingTarget.sheetName}" chưa chọn lớp hoặc môn SSM đích`)
      return
    }

    // Automatically mark active rows with valid class & subject as confirmedByUser when user proceeds to Preview
    setSheetRows(prev =>
      prev.map(r => (r.skip || !r.targetClassId || !r.targetSubjectId ? r : { ...r, confirmedByUser: true }))
    )

    setPreviewLoading(true)
    try {
      const res = await fetch("/api/admin/ktdbcl/vnedu-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          academicYearId,
          sessionId,
          mode: activeMode,
          sheetMappings: sheetRows.map(r => ({
            fileName: r.fileName,
            sheetName: r.sheetName,
            targetClassId: r.targetClassId,
            confirmedSubjectId: r.targetSubjectId,
            confirmedByUser: Boolean(r.targetClassId && r.targetSubjectId),
            evaluationPeriod: r.evaluationPeriod,
            skip: r.skip,
            parsedSheet: r.parsedSheet,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể kiểm dò và xem trước dữ liệu")
        return
      }

      setPreviewTimestamp(data.previewTimestamp)
      setPreviewSheetResults(data.sheetResults || [])
      const items = data.previewItems || []
      setPreviewItems(items)
      setSelectedItemKeys(
        new Set(items.filter((i: any) => i.selected && (i.status === "ADD" || i.status === "UPDATE")).map((i: any) => i.rowKey))
      )
      setStep(3)
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi xem trước")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCommitImport = async () => {
    const hasExtraCols = previewSheetResults.some(sr => (sr.extraColumns || []).length > 0)
    if (hasExtraCols && !ignoreExtraConfirmed) {
      toast.error("Vui lòng xác nhận bỏ qua các cột ngoài cấu hình trước khi nhập")
      return
    }
    if (selectedItemKeys.size === 0) {
      toast.error("Không có trường kết quả hợp lệ nào được chọn để nhập")
      return
    }

    setCommitting(true)
    try {
      const idempotencyKey = `vnedu_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const res = await fetch("/api/admin/ktdbcl/vnedu-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          academicYearId,
          sessionId,
          mode,
          previewTimestamp,
          idempotencyKey,
          selectedRowKeys: Array.from(selectedItemKeys),
          sheetMappings: sheetRows.map(r => ({
            fileName: r.fileName,
            sheetName: r.sheetName,
            targetClassId: r.targetClassId,
            confirmedSubjectId: r.targetSubjectId,
            confirmedByUser: Boolean(r.targetClassId && r.targetSubjectId),
            evaluationPeriod: r.evaluationPeriod,
            skip: r.skip,
            parsedSheet: r.parsedSheet,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error || "Nhập kết quả thất bại")
        return
      }

      setCommitSummary(data.summary)
      setStep(4)
      toast.success("Đã nhập kết quả hợp lệ vào Sổ điểm SSM")
      onImportSuccess()
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi lưu dữ liệu")
    } finally {
      setCommitting(false)
    }
  }

  const handleDownloadReport = () => {
    const rows = previewItems.map(it => ({
      "File": it.fileName,
      "Sheet": it.sheetName,
      "Dòng": it.rowIndex,
      "Môn nguồn": it.sourceSubject,
      "Môn SSM": it.confirmedSubjectName,
      "Lớp": it.className,
      "Mã vnEdu": it.vnEduCode,
      "Mã HS SSM": it.studentCode || "",
      "Họ và tên": it.studentName || "",
      "Trường kết quả": it.fieldLabel,
      "Giá trị cũ": it.oldValue,
      "Giá trị mới": it.newValue,
      "Trạng thái": it.status,
      "Lý do": it.reason,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "BaoCao_Import_vnEdu")
    XLSX.writeFile(wb, `BaoCao_Import_vnEdu_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const filteredPreviewItems = useMemo(() => {
    return previewItems.filter(it => {
      if (statusFilter !== "ALL" && it.status !== statusFilter) return false
      if (sheetFilter !== "ALL" && `${it.fileName}::${it.sheetName}` !== sheetFilter) return false
      return true
    })
  }, [previewItems, statusFilter, sheetFilter])

  const previewCounts = useMemo(() => {
    const counts = { ADD: 0, UPDATE: 0, UNCHANGED: 0, SKIPPED: 0, ERROR: 0, CONFLICT: 0 }
    for (const it of previewItems) {
      if (it.status in counts) counts[it.status as keyof typeof counts]++
    }
    return counts
  }, [previewItems])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#003B3A] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Import trực tiếp Excel vnEdu vào Sổ điểm</h3>
              <p className="text-xs text-teal-100">
                Năm học {academicYearName} • Giữ nguyên cấu trúc file vnEdu, xác nhận môn đích & đối chiếu Mã vnEdu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-teal-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-2 text-xs overflow-x-auto shrink-0">
          {[
            { num: 1, label: "1. Tải file & Nhận diện" },
            { num: 2, label: "2. Xác nhận lớp & môn đích" },
            { num: 3, label: "3. Kiểm dò & Xem trước" },
            { num: 4, label: "4. Kết quả nhập" },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${
                  step === s.num
                    ? "bg-[#003B3A] text-white"
                    : step > s.num
                    ? "bg-emerald-50 text-[#059669] border border-emerald-200"
                    : "bg-white text-slate-500 border border-[#E2E8F0]"
                }`}
              >
                {s.label}
              </div>
              {idx < 3 && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-2xl p-8 text-center space-y-3">
                <Upload className="w-10 h-10 text-[#008B85] mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800">Chọn một hoặc nhiều file Excel xuất từ vnEdu (.xls, .xlsx)</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Hỗ trợ nhiều sheet, 1 môn – nhiều lớp hoặc 1 lớp – nhiều môn, cột ẩn, tiêu đề nhiều tầng và họ tên tách cột.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Chọn file Excel vnEdu
                  <input
                    type="file"
                    multiple
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || [])
                      if (picked.length > 0) setFiles(picked)
                    }}
                  />
                </label>
              </div>

              {files.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#003B3A] text-white text-xs font-semibold">
                    Danh sách file đã chọn ({files.length})
                  </div>
                  <div className="divide-y divide-[#E2E8F0] text-xs tabular-nums">
                    {files.map((f, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                        <span className="font-medium text-slate-800">{f.name}</span>
                        <span className="text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              {workbookWarnings.some(w => (w.warnings || []).length > 0 || w.usedFallbackParser) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                    Cảnh báo đọc file nguồn
                  </div>
                  {workbookWarnings.flatMap((w: any) => w.warnings || []).map((msg: string, idx: number) => (
                    <p key={idx}>• {msg}</p>
                  ))}
                </div>
              )}

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-[#003B3A] tabular-nums">
                    Đã ghép {sheetRows.filter(r => !r.skip && r.targetClassId && r.targetSubjectId).length} / {sheetRows.filter(r => !r.skip).length} sheet (mỗi sheet 1 môn)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Áp dụng nhanh Lớp:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleApplyClassToAllSheets(e.target.value)
                      }}
                      className="border border-[#E2E8F0] rounded-lg px-2 py-1 bg-white text-xs font-medium"
                    >
                      <option value="">-- Chọn lớp cho tất cả sheet --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600">Áp dụng nhanh Kỳ:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleApplyPeriodToAllSheets(e.target.value)
                      }}
                      className="border border-[#E2E8F0] rounded-lg px-2 py-1 bg-white text-xs font-medium"
                    >
                      <option value="">-- Chọn kỳ cho tất cả sheet --</option>
                      {EVAL_PERIOD_OPTIONS.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBatchConfirmSelected}
                  className="px-3.5 py-1.5 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Xác nhận hàng loạt dòng đã chọn
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-center w-10">Chọn</th>
                        <th className="py-3 px-3">File / Sheet</th>
                        <th className="py-3 px-3 text-teal-100">Môn nguồn Excel</th>
                        <th className="py-3 px-3">Lớp SSM</th>
                        <th className="py-3 px-3 text-teal-100">Kỳ / Học kỳ</th>
                        <th className="py-3 px-3">Môn SSM nhận kết quả</th>
                        <th className="py-3 px-3 text-teal-100">Cấu hình áp dụng</th>
                        <th className="py-3 px-3 text-[#5EEAD4]">Trạng thái</th>
                        <th className="py-3 px-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {sheetRows.map(row => {
                        const key = getSheetKey(row)
                        const searchKw = (subjectSearchBySheet[key] || "").toLowerCase().trim()
                        const filteredSubjs = subjects.filter(
                          s =>
                            !searchKw ||
                            s.subjectName.toLowerCase().includes(searchKw) ||
                            s.subjectCode.toLowerCase().includes(searchKw)
                        )
                        const cfgInfo = resolveSheetConfigInfo(row.targetClassId, row.targetSubjectId, row.evaluationPeriod)
                        const hasConflict = (row.metadataConflicts || []).length > 0

                        return (
                          <tr key={key} className={`align-middle hover:bg-[#F8FAFC] ${row.skip ? "opacity-50 bg-slate-50" : ""}`}>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedSheetKeys.has(key)}
                                onChange={(e) => {
                                  const next = new Set(selectedSheetKeys)
                                  if (e.target.checked) next.add(key)
                                  else next.delete(key)
                                  setSelectedSheetKeys(next)
                                }}
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{row.sheetName}</div>
                              <div className="text-[11px] text-slate-500">{row.fileName} • {row.nonEmptyRowCount}/{row.rowCount} HS có KQ</div>
                              {hasConflict && (
                                <div className="text-[11px] text-[#E11D48] font-medium mt-0.5">
                                  ⚠ {row.metadataConflicts.join("; ")}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-medium">
                              {row.detectedSubject || <span className="italic text-slate-400">Không rõ</span>}
                            </td>
                            <td className="py-3 px-3 min-w-[130px]">
                              <select
                                value={row.targetClassId}
                                disabled={row.skip}
                                onChange={(e) => updateSheetRow(key, { targetClassId: e.target.value })}
                                className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs bg-white"
                              >
                                <option value="">-- Chọn lớp --</option>
                                {classes.map(c => (
                                  <option key={c.id} value={c.id}>{c.className}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-3 min-w-[120px]">
                              <select
                                value={row.evaluationPeriod}
                                disabled={row.skip}
                                onChange={(e) => updateSheetRow(key, { evaluationPeriod: e.target.value })}
                                className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs bg-white"
                              >
                                {EVAL_PERIOD_OPTIONS.map(p => (
                                  <option key={p.code} value={p.code}>{p.code}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-3 min-w-[210px] space-y-1">
                              <div className="relative">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                                <input
                                  type="text"
                                  value={subjectSearchBySheet[key] || ""}
                                  onChange={(e) => setSubjectSearchBySheet(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder="Tìm môn SSM..."
                                  disabled={row.skip}
                                  className="w-full border border-[#E2E8F0] rounded-lg pl-6 pr-2 py-1 text-[11px]"
                                />
                              </div>
                              <select
                                value={row.targetSubjectId}
                                disabled={row.skip}
                                onChange={(e) => updateSheetRow(key, { targetSubjectId: e.target.value })}
                                className="w-full border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs bg-white font-medium"
                              >
                                <option value="">-- Chưa xác định môn đích --</option>
                                {filteredSubjs.map(s => (
                                  <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-3 max-w-[200px]">
                              <span className={cfgInfo.isUnconfirmed || !cfgInfo.found ? "text-[#D97706] font-medium" : "text-slate-700"}>
                                {cfgInfo.label}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {row.skip ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">Bỏ qua</span>
                              ) : row.confirmedByUser ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                                  Đã xác nhận
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                                  Chờ xác nhận
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center space-y-1">
                              {!row.skip && (
                                <button
                                  type="button"
                                  disabled={!row.targetSubjectId || !row.targetClassId}
                                  onClick={() => updateSheetRow(key, { confirmedByUser: true })}
                                  className="px-2.5 py-1 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-lg text-[11px] font-semibold disabled:opacity-40 block w-full"
                                >
                                  Xác nhận mapping môn
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => updateSheetRow(key, { skip: !row.skip })}
                                className="px-2.5 py-1 border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium block w-full"
                              >
                                {row.skip ? "Khôi phục" : "Bỏ qua sheet"}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Mode & Filters */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-slate-700">Chế độ nhập:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="vneduMode"
                      checked={mode === "FILL_EMPTY"}
                      onChange={() => {
                        setMode("FILL_EMPTY")
                        handleRunPreview("FILL_EMPTY")
                      }}
                    />
                    <span className="font-medium text-slate-800">Chỉ bổ sung trường đang trống (mặc định)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="vneduMode"
                      checked={mode === "UPDATE_EXISTING"}
                      onChange={() => {
                        setMode("UPDATE_EXISTING")
                        handleRunPreview("UPDATE_EXISTING")
                      }}
                    />
                    <span className="font-medium text-slate-800">Cập nhật kết quả đã có</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 flex-wrap tabular-nums">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#059669] font-semibold">Bổ sung: {previewCounts.ADD}</span>
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-[#008B85] font-semibold">Cập nhật: {previewCounts.UPDATE}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Không đổi: {previewCounts.UNCHANGED}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-[#D97706]">Bỏ qua: {previewCounts.SKIPPED}</span>
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-[#E11D48] font-semibold">Lỗi/Xung đột: {previewCounts.ERROR + previewCounts.CONFLICT}</span>
                </div>
              </div>

              {/* Extra columns notice */}
              {previewSheetResults.some(sr => (sr.extraColumns || []).length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>Cột ngoài cấu hình (không tự nhập):</strong>{" "}
                    {previewSheetResults
                      .filter(sr => (sr.extraColumns || []).length > 0)
                      .map(sr => `${sr.sheetName}: ${sr.extraColumns.map((e: any) => e.excelHeader).join(", ")}`)
                      .join(" | ")}
                  </div>
                  <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ignoreExtraConfirmed}
                      onChange={(e) => setIgnoreExtraConfirmed(e.target.checked)}
                    />
                    Xác nhận bỏ qua các cột ngoài cấu hình
                  </label>
                </div>
              )}

              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Filter className="w-3.5 h-3.5" /> Lọc:
                </div>
                <select
                  value={sheetFilter}
                  onChange={(e) => setSheetFilter(e.target.value)}
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white"
                >
                  <option value="ALL">Tất cả File / Sheet</option>
                  {previewSheetResults.map(sr => (
                    <option key={`${sr.fileName}::${sr.sheetName}`} value={`${sr.fileName}::${sr.sheetName}`}>
                      {sr.fileName} / {sr.sheetName} ({sr.confirmedSubjectName})
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ADD">Bổ sung</option>
                  <option value="UPDATE">Cập nhật</option>
                  <option value="UNCHANGED">Không thay đổi</option>
                  <option value="SKIPPED">Bỏ qua</option>
                  <option value="ERROR">Lỗi</option>
                  <option value="CONFLICT">Xung đột</option>
                </select>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto max-h-[42vh]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A] sticky top-0 z-10">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-center w-10">Nhập</th>
                        <th className="py-3 px-3">File / Sheet / Dòng</th>
                        <th className="py-3 px-3 text-teal-100">Môn nguồn</th>
                        <th className="py-3 px-3">Môn đích đã xác nhận</th>
                        <th className="py-3 px-3 text-teal-100">Lớp</th>
                        <th className="py-3 px-3">Mã vnEdu</th>
                        <th className="py-3 px-3">Học sinh SSM</th>
                        <th className="py-3 px-3 text-teal-100">Trường kết quả</th>
                        <th className="py-3 px-3 text-teal-100">Giá trị cũ</th>
                        <th className="py-3 px-3">Giá trị mới</th>
                        <th className="py-3 px-3 text-[#5EEAD4]">Trạng thái / Lý do</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {filteredPreviewItems.slice(0, 500).map(it => {
                        const canSelect = it.status === "ADD" || it.status === "UPDATE"
                        return (
                          <tr key={it.rowKey} className="align-middle hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 text-center">
                              {canSelect && (
                                <input
                                  type="checkbox"
                                  checked={selectedItemKeys.has(it.rowKey)}
                                  onChange={(e) => {
                                    const next = new Set(selectedItemKeys)
                                    if (e.target.checked) next.add(it.rowKey)
                                    else next.delete(it.rowKey)
                                    setSelectedItemKeys(next)
                                  }}
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800">{it.sheetName}</span>
                              <span className="text-slate-500"> • Dòng {it.rowIndex}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{it.sourceSubject}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{it.confirmedSubjectName}</td>
                            <td className="py-2.5 px-3 text-slate-700">{it.className}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">{it.vnEduCode || "—"}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {it.studentName || "—"}
                              {it.studentCode && <span className="text-[11px] text-slate-500 ml-1">({it.studentCode})</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{it.fieldLabel}</td>
                            <td className="py-2.5 px-3 text-slate-500">{it.oldValue || "—"}</td>
                            <td className="py-2.5 px-3 font-semibold text-[#003B3A]">{it.newValue || "—"}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-block ${
                                  it.status === "ADD"
                                    ? "bg-emerald-50 text-[#059669]"
                                    : it.status === "UPDATE"
                                    ? "bg-teal-50 text-[#008B85]"
                                    : it.status === "ERROR" || it.status === "CONFLICT"
                                    ? "bg-rose-50 text-[#E11D48]"
                                    : it.status === "SKIPPED"
                                    ? "bg-amber-50 text-[#D97706]"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {it.reason}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && commitSummary && (
            <div className="space-y-4 py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-[#059669] mx-auto" />
                <h4 className="text-base font-bold text-slate-900">Hoàn tất nhập kết quả vnEdu vào SSM</h4>
                <p className="text-xs text-slate-600">Sổ điểm đã được cập nhật và tự động tải lại.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center tabular-nums">
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-lg font-bold text-[#059669]">{commitSummary.addedCount}</div>
                  <div className="text-xs text-slate-500">Dòng bổ sung</div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-lg font-bold text-[#008B85]">{commitSummary.updatedCount}</div>
                  <div className="text-xs text-slate-500">Dòng cập nhật</div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-lg font-bold text-slate-700">{commitSummary.unchangedCount}</div>
                  <div className="text-xs text-slate-500">Không thay đổi</div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-lg font-bold text-[#D97706]">{commitSummary.skippedCount}</div>
                  <div className="text-xs text-slate-500">Bỏ qua</div>
                </div>
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <div className="text-lg font-bold text-[#E11D48]">{commitSummary.failedCount}</div>
                  <div className="text-xs text-slate-500">Thất bại</div>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Tải báo cáo đối soát & lỗi (.xlsx)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {step === 3 && `Đã chọn ${selectedItemKeys.size} trường hợp lệ để nhập`}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && step < 4 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="px-4 py-2 border border-[#E2E8F0] bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Quay lại
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={parsing || files.length === 0}
                onClick={() => handleParseFiles()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {parsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Đọc & Nhận diện nguồn
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={previewLoading}
                onClick={() => handleRunPreview()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Kiểm dò & Xem trước kết quả
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={committing || selectedItemKeys.size === 0}
                onClick={handleCommitImport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                {committing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Nhập kết quả hợp lệ vào SSM
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
