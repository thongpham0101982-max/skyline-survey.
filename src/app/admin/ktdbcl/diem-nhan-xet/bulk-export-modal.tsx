// @ts-nocheck
"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  FileSpreadsheet,
  Download,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  Sparkles,
  BookOpen,
  Filter,
  Search
} from "lucide-react"
import {
  generateBulkGradeExcel,
  getPeriodScoreColumnLabel
} from "@/lib/grading/bulk-grade-excel-exporter"
import { isGradeMatching } from "./grade-utils"

interface BulkExportModalProps {
  isOpen: boolean
  onClose: () => void
  campuses: any[]
  academicYears: any[]
  defaultCampusId?: string
  defaultPeriod?: string
  defaultYearId?: string
  subjects: any[]
  evalPeriods: { code: string; name: string }[]
  grades: string[]
  savedConfigs?: any[]
}

function getGradeNum(grade: string): number | null {
  const digits = String(grade || "").replace(/\D/g, "")
  if (!digits) return null
  const n = parseInt(digits, 10)
  return isNaN(n) ? null : n
}

export function BulkExportModal({
  isOpen,
  onClose,
  campuses,
  academicYears,
  defaultCampusId = "ALL",
  defaultPeriod = "KSDN",
  defaultYearId = "",
  subjects = [],
  evalPeriods = [],
  grades = [],
  savedConfigs = []
}: BulkExportModalProps) {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId || "ALL")
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod || "KSDN")
  const [selectedYearId, setSelectedYearId] = useState(defaultYearId || "")
  const [selectedGrades, setSelectedGrades] = useState<string[]>(() => [...grades])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [subjectSearch, setSubjectSearch] = useState("")
  const [onlyPeriodSubjects, setOnlyPeriodSubjects] = useState(true)

  const [includeOverviewSheet, setIncludeOverviewSheet] = useState(true)
  const [includeMasterSummarySheet, setIncludeMasterSummarySheet] = useState(true)
  const [onlyPeriodScoreColumn, setOnlyPeriodScoreColumn] = useState(false)

  const [isExporting, setIsExporting] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  const isAllGradesSelected = grades.length > 0 && selectedGrades.length === grades.length
  const periodScoreLabel = getPeriodScoreColumnLabel(selectedPeriod)

  // Compute configured subjects for a given period & selected grade list
  const computePeriodSubjectIds = (periodCode: string, activeGrades: string[]) => {
    const ids = new Set<string>()
    const isKsdn = periodCode === "KSĐN" || periodCode === "KSDN"
    const allSelected = activeGrades.length === 0 || (grades.length > 0 && activeGrades.length === grades.length)
    const fallbackSem =
      periodCode === "GK1" || periodCode === "CK1"
        ? "HK1"
        : periodCode === "GK2" || periodCode === "CK2"
        ? "HK2"
        : ""

    savedConfigs.forEach(c => {
      if (c.isActive === false) return
      if (isKsdn && (c.configType || "INTERNAL") !== "INTERNAL") return
      const pMatch =
        c.evaluationPeriod === periodCode ||
        (fallbackSem && c.evaluationPeriod === fallbackSem) ||
        c.evaluationPeriod === "ALL"
      const gMatch = allSelected || activeGrades.some(g => isGradeMatching(c.grade, g))
      if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
        ids.add(c.subjectId)
      }
    })
    return ids
  }

  const periodSubjectIds = useMemo(
    () => computePeriodSubjectIds(selectedPeriod, selectedGrades),
    [savedConfigs, selectedPeriod, selectedGrades, grades.length]
  )

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultCampusId && defaultCampusId !== "ALL") {
        setSelectedCampusId(defaultCampusId)
      } else if (campuses.length > 0 && selectedCampusId === "ALL") {
        setSelectedCampusId(campuses[0].id)
      }
      const nextPeriod = defaultPeriod || "KSDN"
      setSelectedPeriod(nextPeriod)
      if (defaultYearId) setSelectedYearId(defaultYearId)

      const initialGrades = [...grades]
      setSelectedGrades(initialGrades)

      const initialPeriodIds = computePeriodSubjectIds(nextPeriod, initialGrades)
      if (initialPeriodIds.size > 0) {
        setSelectedSubjectIds(Array.from(initialPeriodIds))
        setOnlyPeriodSubjects(true)
      } else {
        setSelectedSubjectIds(subjects.map(s => s.id))
        setOnlyPeriodSubjects(false)
      }

      setOnlyPeriodScoreColumn(false)
      setErrorMessage(null)
      setExportSuccess(false)
      setProgressPercent(0)
      setProgressMessage("")
      setSubjectSearch("")
    }
  }, [isOpen, defaultCampusId, defaultPeriod, defaultYearId, subjects, campuses, grades])

  const applyPeriodAndGradesUpdate = (newPeriod: string, newGrades: string[]) => {
    const newPeriodIds = computePeriodSubjectIds(newPeriod, newGrades)
    if (onlyPeriodSubjects && newPeriodIds.size > 0) {
      setSelectedSubjectIds(Array.from(newPeriodIds))
    }
  }

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod)
    if (!getPeriodScoreColumnLabel(newPeriod)) {
      setOnlyPeriodScoreColumn(false)
    }
    applyPeriodAndGradesUpdate(newPeriod, selectedGrades)
  }

  const updateSelectedGrades = (nextGrades: string[]) => {
    setSelectedGrades(nextGrades)
    setErrorMessage(null)
    applyPeriodAndGradesUpdate(selectedPeriod, nextGrades)
  }

  const toggleGrade = (grade: string) => {
    const next = selectedGrades.includes(grade)
      ? selectedGrades.filter(g => g !== grade)
      : grades.filter(g => g === grade || selectedGrades.includes(g))
    updateSelectedGrades(next)
  }

  const selectGradePreset = (preset: "ALL" | "TIEU_HOC" | "THCS" | "THPT" | "NONE") => {
    if (preset === "ALL") {
      updateSelectedGrades([...grades])
      return
    }
    if (preset === "NONE") {
      updateSelectedGrades([])
      return
    }
    const filtered = grades.filter(g => {
      const n = getGradeNum(g)
      if (n === null) return false
      if (preset === "TIEU_HOC") return n >= 1 && n <= 5
      if (preset === "THCS") return n >= 6 && n <= 9
      if (preset === "THPT") return n >= 10 && n <= 12
      return false
    })
    updateSelectedGrades(filtered)
  }

  const isPresetActive = (preset: "ALL" | "TIEU_HOC" | "THCS" | "THPT") => {
    if (preset === "ALL") return isAllGradesSelected
    const expected = grades.filter(g => {
      const n = getGradeNum(g)
      if (n === null) return false
      if (preset === "TIEU_HOC") return n >= 1 && n <= 5
      if (preset === "THCS") return n >= 6 && n <= 9
      if (preset === "THPT") return n >= 10 && n <= 12
      return false
    })
    return (
      expected.length > 0 &&
      selectedGrades.length === expected.length &&
      expected.every(g => selectedGrades.includes(g))
    )
  }

  // Filtered subjects based on search & period filter
  const displayedSubjects = useMemo(() => {
    return subjects.filter(s => {
      if (onlyPeriodSubjects && periodSubjectIds.size > 0 && !periodSubjectIds.has(s.id)) {
        return false
      }
      if (subjectSearch.trim()) {
        const q = subjectSearch.toLowerCase().trim()
        const sName = (s.subjectName || "").toLowerCase()
        const sCode = (s.subjectCode || "").toLowerCase()
        if (!sName.includes(q) && !sCode.includes(q)) return false
      }
      return true
    })
  }, [subjects, subjectSearch, onlyPeriodSubjects, periodSubjectIds])

  const effectiveSelectedIds = useMemo(() => {
    if (onlyPeriodSubjects && periodSubjectIds.size > 0) {
      return selectedSubjectIds.filter(id => periodSubjectIds.has(id))
    }
    return selectedSubjectIds
  }, [selectedSubjectIds, onlyPeriodSubjects, periodSubjectIds])

  const handleSelectAll = () => {
    const idsToAdd = displayedSubjects.map(s => s.id)
    setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
  }

  const handleDeselectAll = () => {
    const idsToRemove = new Set(displayedSubjects.map(s => s.id))
    setSelectedSubjectIds(prev => prev.filter(id => !idsToRemove.has(id)))
  }

  const handleSelectOnlyPeriodSubjects = () => {
    if (periodSubjectIds.size > 0) {
      setOnlyPeriodSubjects(true)
      setSelectedSubjectIds(Array.from(periodSubjectIds))
    }
  }

  const handleToggleOnlyPeriod = () => {
    const nextVal = !onlyPeriodSubjects
    setOnlyPeriodSubjects(nextVal)
    if (nextVal && periodSubjectIds.size > 0) {
      setSelectedSubjectIds(prev => {
        const kept = prev.filter(id => periodSubjectIds.has(id))
        return kept.length > 0 ? kept : Array.from(periodSubjectIds)
      })
    }
  }

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const gradeSummaryText = useMemo(() => {
    if (selectedGrades.length === 0) return "Chưa chọn khối"
    if (isAllGradesSelected) return "Tất cả các khối"
    const shortLabels = selectedGrades.map(g => {
      const n = getGradeNum(g)
      return n !== null ? `K${n}` : g
    })
    return shortLabels.join(", ")
  }, [selectedGrades, isAllGradesSelected])

  const handleExport = async () => {
    if (selectedGrades.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 khối lớp để xuất dữ liệu!")
      return
    }
    if (effectiveSelectedIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 môn học để xuất dữ liệu!")
      return
    }

    try {
      setIsExporting(true)
      setErrorMessage(null)
      setExportSuccess(false)
      setProgressPercent(10)
      setProgressMessage(`Đang tải dữ liệu cho ${effectiveSelectedIds.length} môn (${gradeSummaryText})...`)

      const queryParams = new URLSearchParams({
        academicYearId: selectedYearId,
        campusId: selectedCampusId,
        evaluationPeriod: selectedPeriod,
        grade: isAllGradesSelected ? "ALL" : selectedGrades[0],
        grades: isAllGradesSelected ? "ALL" : selectedGrades.join(","),
        subjectIds: effectiveSelectedIds.join(",")
      })

      const res = await fetch(`/api/admin/ktdbcl/export-grades-bulk?${queryParams.toString()}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tải dữ liệu xuất điểm")
      }

      if (!data.students || data.students.length === 0) {
        throw new Error("Không tìm thấy học sinh nào thuộc cơ sở/khối đã chọn trong năm học này!")
      }

      const finalSubjects = (data.subjects || []).filter(s => effectiveSelectedIds.includes(s.id))
      if (finalSubjects.length === 0) {
        throw new Error("Không tìm thấy dữ liệu môn học tương ứng với các môn đã chọn!")
      }

      setProgressPercent(30)
      setProgressMessage(`Đang phân tích bảng tính và tạo Sheet cho ${finalSubjects.length} môn...`)

      const campusObj = campuses.find(c => c.id === selectedCampusId)
      const campusName = campusObj?.campusName || (selectedCampusId === "ALL" ? "Toan_Truong" : "CoSo")
      const yearObj = academicYears.find(y => y.id === selectedYearId)
      const yearName = yearObj?.name || data.academicYear?.name || "2026-2027"
      const periodObj = evalPeriods.find(p => p.code === selectedPeriod)
      const periodName = periodObj?.name || selectedPeriod

      await generateBulkGradeExcel({
        campusName,
        academicYearName: yearName,
        evaluationPeriodCode: selectedPeriod,
        evaluationPeriodName: periodName,
        selectedGrades: isAllGradesSelected ? [] : selectedGrades,
        classes: data.classes || [],
        students: data.students || [],
        subjects: finalSubjects,
        configs: data.configs || [],
        entries: data.entries || [],
        teachingAssignments: data.teachingAssignments || [],
        includeOverviewSheet,
        includeMasterSummarySheet,
        onlyPeriodScoreColumn: Boolean(onlyPeriodScoreColumn && periodScoreLabel),
        onProgress: (pct, msg) => {
          setProgressPercent(pct)
          setProgressMessage(msg)
        }
      })

      setExportSuccess(true)
      setProgressPercent(100)
      setProgressMessage(`Xuất file Excel thành công với ${finalSubjects.length} môn (${gradeSummaryText})! Tệp tin đã được lưu về máy của bạn.`)
    } catch (err: any) {
      console.error("Bulk export error:", err)
      setErrorMessage(err.message || "Đã xảy ra sự cố khi xuất file Excel")
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  const targetCampus = campuses.find(c => c.id === selectedCampusId)
  const targetPeriod = evalPeriods.find(p => p.code === selectedPeriod)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between border-b border-[#002E2D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/15">
              <FileSpreadsheet className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Xuất bảng điểm kỳ khảo sát
                <span className="text-[11px] font-semibold bg-[#00A19A] text-white px-2.5 py-0.5 rounded-full">
                  Đa sheet
                </span>
              </h3>
              <p className="text-xs text-teal-100">
                Xuất theo cơ sở, tùy chọn nhiều khối lớp và danh sách môn học (hỗ trợ chuẩn ĐĐGgk / ĐĐGck)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8FAFC]">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {exportSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{progressMessage}</div>
            </div>
          )}

          {/* SECTION 1: PHẠM VI XUẤT BẢNG ĐIỂM */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] space-y-4">
            <div className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#00736E]" />
              1. Thông tin phạm vi xuất bảng điểm
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cơ sở */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00736E]" />
                  Cơ sở xuất:
                </label>
                <select
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  disabled={isExporting}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none cursor-pointer"
                >
                  <option value="ALL">-- Tất cả cơ sở trong trường --</option>
                  {campuses.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.campusName}</option>
                  ))}
                </select>
              </div>

              {/* Kỳ khảo sát */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00736E]" />
                  Kỳ khảo sát / Học kỳ:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  disabled={isExporting}
                  className="w-full border border-[#00A19A]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#003B3A] bg-[#F0FDFA] focus:ring-2 focus:ring-[#00A19A] outline-none cursor-pointer"
                >
                  {evalPeriods.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Khối lớp áp dụng (Multi-select) */}
            <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00736E]" />
                    Khối lớp áp dụng:
                  </label>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                      selectedGrades.length === 0
                        ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                        : "bg-[#F0FDFA] text-[#003B3A] border border-[#00A19A]/30"
                    }`}
                  >
                    {isAllGradesSelected
                      ? `Tất cả (${grades.length}/${grades.length} khối)`
                      : `Đã chọn: ${selectedGrades.length}/${grades.length} khối`}
                  </span>
                </div>

                {/* Preset chọn nhanh theo cấp học */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => selectGradePreset("ALL")}
                    disabled={isExporting}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      isPresetActive("ALL")
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGradePreset("TIEU_HOC")}
                    disabled={isExporting}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer tabular-nums ${
                      isPresetActive("TIEU_HOC")
                        ? "bg-[#00736E] text-white border-[#00736E]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    Tiểu học (K1–K5)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGradePreset("THCS")}
                    disabled={isExporting}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer tabular-nums ${
                      isPresetActive("THCS")
                        ? "bg-[#00736E] text-white border-[#00736E]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    THCS (K6–K9)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGradePreset("THPT")}
                    disabled={isExporting}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer tabular-nums ${
                      isPresetActive("THPT")
                        ? "bg-[#00736E] text-white border-[#00736E]"
                        : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    THPT (K10–K12)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGradePreset("NONE")}
                    disabled={isExporting || selectedGrades.length === 0}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-[#E11D48] hover:bg-rose-100 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Lưới chọn từng khối */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 tabular-nums">
                {grades.map(g => {
                  const checked = selectedGrades.includes(g)
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => !isExporting && toggleGrade(g)}
                      disabled={isExporting}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                        checked
                          ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A] ring-1 ring-[#00A19A]/30"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                          checked
                            ? "bg-[#003B3A] border-[#003B3A] text-white"
                            : "bg-white border-slate-300"
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{g}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: CHỌN MÔN HỌC */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#003B3A] flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#00736E]" />
                <span>2. Chọn danh sách môn học cần xuất</span>
                <span className="text-[#003B3A] bg-[#F0FDFA] border border-[#00A19A]/30 px-2.5 py-0.5 rounded-full font-semibold text-[11px] tabular-nums">
                  Đã chọn: {effectiveSelectedIds.length}/{displayedSubjects.length} môn
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {periodSubjectIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectOnlyPeriodSubjects}
                    disabled={isExporting}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer tabular-nums ${
                      onlyPeriodSubjects
                        ? "bg-[#003B3A] text-white border-[#003B3A]"
                        : "text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100 border-[#00A19A]/40"
                    }`}
                    title="Chỉ chọn các môn đã được cấu hình trong kỳ và khối đang chọn"
                  >
                    Môn theo kỳ ({periodSubjectIds.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isExporting}
                  className="text-[11px] font-semibold text-[#00736E] hover:text-[#003B3A] bg-[#F0FDFA] hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-[#00A19A]/30 transition-colors cursor-pointer tabular-nums"
                >
                  Chọn tất cả ({displayedSubjects.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isExporting}
                  className="text-[11px] font-semibold text-[#E11D48] hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm và bộ lọc nhanh */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  placeholder="Tìm nhanh môn học theo tên hoặc mã môn..."
                  disabled={isExporting}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#00A19A] outline-none"
                />
              </div>

              {periodSubjectIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleToggleOnlyPeriod}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border font-semibold transition-all shrink-0 cursor-pointer tabular-nums ${
                    onlyPeriodSubjects
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {onlyPeriodSubjects ? `✓ Đang lọc: Môn theo kỳ (${periodSubjectIds.size})` : `Hiện tất cả (${subjects.length} môn)`}
                </button>
              )}
            </div>

            {/* Danh sách môn học */}
            <div className="max-h-52 overflow-y-auto p-2.5 border border-[#E2E8F0] rounded-2xl bg-[#F8FAFC] grid grid-cols-2 sm:grid-cols-3 gap-2">
              {displayedSubjects.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 font-medium">
                  Không tìm thấy môn học nào phù hợp với bộ lọc
                </div>
              ) : (
                displayedSubjects.map(s => {
                  const isSelected = effectiveSelectedIds.includes(s.id)
                  const isPeriodSubj = periodSubjectIds.has(s.id)

                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => !isExporting && toggleSubject(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          !isExporting && toggleSubject(s.id)
                        }
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        isSelected
                          ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A] font-semibold ring-1 ring-[#00A19A]/30"
                          : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-[#003B3A] border-[#003B3A] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="truncate flex-1">
                        <span className="truncate">{s.subjectName}</span>
                        <span className="text-[11px] text-slate-400 ml-1">({s.subjectCode})</span>
                      </div>

                      {isPeriodSubj && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#00A19A] shrink-0"
                          title="Môn đã được cấu hình trong kỳ này"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 3: TÙY CHỌN BỔ SUNG */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] space-y-2.5">
            <div className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              3. Tùy chọn bổ sung cho báo cáo
            </div>

            <div className={`grid grid-cols-1 ${periodScoreLabel ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3 pt-1`}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => !isExporting && setIncludeOverviewSheet(!includeOverviewSheet)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  includeOverviewSheet
                    ? "bg-[#F0FDFA]/60 border-[#00A19A] ring-1 ring-[#00A19A]/20"
                    : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    includeOverviewSheet
                      ? "bg-[#003B3A] border-[#003B3A] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {includeOverviewSheet && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Kèm Sheet &quot;00_Tổng quan Báo cáo&quot;
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Thống kê tỷ lệ nhập điểm, điểm TB và phổ điểm{periodScoreLabel ? ` theo cột ${periodScoreLabel}` : ""} từng môn.
                  </div>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => !isExporting && setIncludeMasterSummarySheet(!includeMasterSummarySheet)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  includeMasterSummarySheet
                    ? "bg-[#F0FDFA]/60 border-[#00A19A] ring-1 ring-[#00A19A]/20"
                    : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    includeMasterSummarySheet
                      ? "bg-[#003B3A] border-[#003B3A] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {includeMasterSummarySheet && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Kèm Sheet &quot;Bảng điểm Tổng hợp&quot;
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Mỗi học sinh 1 dòng kèm điểm {periodScoreLabel || "tổng hợp"} tất cả các môn ngang hàng.
                  </div>
                </div>
              </div>

              {periodScoreLabel && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !isExporting && setOnlyPeriodScoreColumn(!onlyPeriodScoreColumn)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    onlyPeriodScoreColumn
                      ? "bg-[#F0FDFA]/60 border-[#00A19A] ring-1 ring-[#00A19A]/20"
                      : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                      onlyPeriodScoreColumn
                        ? "bg-[#003B3A] border-[#003B3A] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {onlyPeriodScoreColumn && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      Chỉ xuất cột <span className="text-[#00736E] font-bold">{periodScoreLabel}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Sheet từng môn chỉ giữ cột {periodScoreLabel} và Nhận xét (ẩn các cột TX/thành phần khác).
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PROGRESS BAR KHI ĐANG XUẤT */}
          {isExporting && (
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 tabular-nums">
                <span className="flex items-center gap-1.5 text-[#003B3A]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
                  {progressMessage}
                </span>
                <span className="text-[#003B3A] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00A19A] h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium tabular-nums">
            Xuất cho: <strong className="text-slate-900">{targetCampus?.campusName || "Toàn trường"}</strong> •{" "}
            Kỳ: <strong className="text-[#00736E]">{targetPeriod?.name || selectedPeriod}</strong> •{" "}
            Khối: <strong className="text-[#003B3A]">{gradeSummaryText}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || effectiveSelectedIds.length === 0 || selectedGrades.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#002E2D] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer tabular-nums"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang xuất file...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tiến hành xuất Excel ({effectiveSelectedIds.length} môn)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
