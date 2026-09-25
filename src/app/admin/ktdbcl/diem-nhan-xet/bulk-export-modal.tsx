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
import { generateBulkGradeExcel } from "@/lib/grading/bulk-grade-excel-exporter"
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
  const [selectedGrade, setSelectedGrade] = useState("ALL")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [subjectSearch, setSubjectSearch] = useState("")
  const [onlyPeriodSubjects, setOnlyPeriodSubjects] = useState(true)

  const [includeOverviewSheet, setIncludeOverviewSheet] = useState(true)
  const [includeMasterSummarySheet, setIncludeMasterSummarySheet] = useState(true)

  const [isExporting, setIsExporting] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Identify subjects configured for current period & grade
  const periodSubjectIds = useMemo(() => {
    const ids = new Set<string>()
    savedConfigs.forEach(c => {
      const pMatch = c.evaluationPeriod === selectedPeriod || c.evaluationPeriod === "ALL"
      const gMatch = selectedGrade === "ALL" || isGradeMatching(c.grade, selectedGrade)
      if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
        ids.add(c.subjectId)
      }
    })
    return ids
  }, [savedConfigs, selectedPeriod, selectedGrade])

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultCampusId && defaultCampusId !== "ALL") {
        setSelectedCampusId(defaultCampusId)
      } else if (campuses.length > 0 && selectedCampusId === "ALL") {
        setSelectedCampusId(campuses[0].id)
      }
      if (defaultPeriod) setSelectedPeriod(defaultPeriod)
      if (defaultYearId) setSelectedYearId(defaultYearId)

      // Nếu kỳ này có cấu hình môn riêng (ví dụ 13 môn của KSĐN), mặc định chỉ chọn 13 môn này
      if (periodSubjectIds.size > 0) {
        setSelectedSubjectIds(Array.from(periodSubjectIds))
        setOnlyPeriodSubjects(true)
      } else {
        setSelectedSubjectIds(subjects.map(s => s.id))
        setOnlyPeriodSubjects(false)
      }

      setErrorMessage(null)
      setExportSuccess(false)
      setProgressPercent(0)
      setProgressMessage("")
      setSubjectSearch("")
    }
  }, [isOpen, defaultCampusId, defaultPeriod, defaultYearId, subjects, campuses])

  // Khi người dùng thay đổi Kỳ hoặc Khối: Cập nhật lại danh sách môn theo kỳ
  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod)
    // Tính toán lại các môn theo kỳ mới
    const newPeriodIds = new Set<string>()
    savedConfigs.forEach(c => {
      const pMatch = c.evaluationPeriod === newPeriod || c.evaluationPeriod === "ALL"
      const gMatch = selectedGrade === "ALL" || isGradeMatching(c.grade, selectedGrade)
      if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
        newPeriodIds.add(c.subjectId)
      }
    })
    if (onlyPeriodSubjects && newPeriodIds.size > 0) {
      setSelectedSubjectIds(Array.from(newPeriodIds))
    }
  }

  const handleGradeChange = (newGrade: string) => {
    setSelectedGrade(newGrade)
    const newPeriodIds = new Set<string>()
    savedConfigs.forEach(c => {
      const pMatch = c.evaluationPeriod === selectedPeriod || c.evaluationPeriod === "ALL"
      const gMatch = newGrade === "ALL" || isGradeMatching(c.grade, newGrade)
      if (pMatch && gMatch && c.subjectId && c.subjectId !== "ALL") {
        newPeriodIds.add(c.subjectId)
      }
    })
    if (onlyPeriodSubjects && newPeriodIds.size > 0) {
      setSelectedSubjectIds(Array.from(newPeriodIds))
    }
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

  // Danh sách ID môn THỰC SỰ được chọn để xuất (chỉ tính các môn nằm trong phạm vi đang lọc)
  const effectiveSelectedIds = useMemo(() => {
    if (onlyPeriodSubjects && periodSubjectIds.size > 0) {
      return selectedSubjectIds.filter(id => periodSubjectIds.has(id))
    }
    return selectedSubjectIds
  }, [selectedSubjectIds, onlyPeriodSubjects, periodSubjectIds])

  // Select all currently displayed subjects
  const handleSelectAll = () => {
    const idsToAdd = displayedSubjects.map(s => s.id)
    setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
  }

  // Deselect all currently displayed subjects
  const handleDeselectAll = () => {
    const idsToRemove = new Set(displayedSubjects.map(s => s.id))
    setSelectedSubjectIds(prev => prev.filter(id => !idsToRemove.has(id)))
  }

  // Select only subjects configured for this period
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
      // Khi bật chế độ chỉ môn theo kỳ: tự động loại bỏ các môn ngoài kỳ khỏi lựa chọn
      setSelectedSubjectIds(prev => {
        const kept = prev.filter(id => periodSubjectIds.has(id))
        return kept.length > 0 ? kept : Array.from(periodSubjectIds)
      })
    }
  }

  // Toggle single subject
  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    if (effectiveSelectedIds.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 môn học để xuất dữ liệu!")
      return
    }

    try {
      setIsExporting(true)
      setErrorMessage(null)
      setExportSuccess(false)
      setProgressPercent(10)
      setProgressMessage(`Đang gửi yêu cầu nạp dữ liệu cho ${effectiveSelectedIds.length} môn đã chọn...`)

      // Chỉ gửi đúng danh sách ID các môn được người dùng lựa chọn
      const queryParams = new URLSearchParams({
        academicYearId: selectedYearId,
        campusId: selectedCampusId,
        evaluationPeriod: selectedPeriod,
        grade: selectedGrade,
        subjectIds: effectiveSelectedIds.join(",")
      })

      const res = await fetch(`/api/admin/ktdbcl/export-grades-bulk?${queryParams.toString()}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tải dữ liệu xuất điểm")
      }

      if (!data.students || data.students.length === 0) {
        throw new Error("Không tìm thấy học sinh nào thuộc cơ sở/khối này trong năm học đã chọn!")
      }

      // Đảm bảo chỉ các môn nằm trong effectiveSelectedIds mới được tạo Sheet
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
        classes: data.classes || [],
        students: data.students || [],
        subjects: finalSubjects,
        configs: data.configs || [],
        entries: data.entries || [],
        teachingAssignments: data.teachingAssignments || [],
        includeOverviewSheet,
        includeMasterSummarySheet,
        onProgress: (pct, msg) => {
          setProgressPercent(pct)
          setProgressMessage(msg)
        }
      })

      setExportSuccess(true)
      setProgressPercent(100)
      setProgressMessage(`Xuất file Excel thành công với ${finalSubjects.length} môn đã chọn! Tệp tin đã được lưu về máy của bạn.`)
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#005B58] via-[#006e6a] to-[#00827d] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                Xuất Bảng Điểm Kỳ Khảo Sát
                <span className="text-[10px] font-bold bg-emerald-400 text-teal-950 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Đa Sheet
                </span>
              </h3>
              <p className="text-[11px] text-teal-100 font-medium">
                Xuất toàn bộ môn học theo cơ sở, mỗi môn 1 Sheet gồm Khối, Lớp và Điểm học sinh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
            </div>
          )}

          {exportSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{progressMessage}</div>
            </div>
          )}

          {/* SECTION 1: BỘ LỌC CƠ BẢN */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#005B58]" />
              1. Thông tin Phạm vi Xuất Bảng Điểm
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Cơ sở */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  Cơ sở xuất:
                </label>
                <select
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  disabled={isExporting}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none shadow-sm cursor-pointer"
                >
                  <option value="ALL">-- Tất cả Cơ sở trong trường --</option>
                  {campuses.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.campusName}</option>
                  ))}
                </select>
              </div>

              {/* 2. Kỳ khảo sát */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Kỳ khảo sát / Học kỳ:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  disabled={isExporting}
                  className="w-full border border-teal-300 rounded-xl px-3 py-2 text-xs font-bold text-teal-950 bg-teal-50/60 focus:ring-2 focus:ring-[#005B58] outline-none shadow-sm cursor-pointer"
                >
                  {evalPeriods.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 3. Phạm vi Khối */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  Khối lớp áp dụng:
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  disabled={isExporting}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#005B58] outline-none shadow-sm cursor-pointer"
                >
                  <option value="ALL">-- Tất cả các Khối --</option>
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: CHỌN MÔN HỌC */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#005B58]" />
                2. Chọn Danh Sách Môn Học Cần Xuất
                <span className="text-teal-900 bg-teal-100 border border-teal-300 px-2.5 py-0.5 rounded-full font-black text-[11px] shadow-2xs">
                  ĐÃ CHỌN: {effectiveSelectedIds.length}/{displayedSubjects.length} MÔN
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {periodSubjectIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectOnlyPeriodSubjects}
                    disabled={isExporting}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors shadow-2xs ${
                      onlyPeriodSubjects
                        ? "bg-teal-700 text-white border-teal-700"
                        : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                    }`}
                    title="Chỉ chọn các môn đã được cấu hình trong kỳ này"
                  >
                    Môn theo kỳ ({periodSubjectIds.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isExporting}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors shadow-2xs"
                >
                  Chọn tất cả ({displayedSubjects.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isExporting}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors shadow-2xs"
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
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#005B58] outline-none shadow-2xs"
                />
              </div>

              {periodSubjectIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleToggleOnlyPeriod}
                  className={`text-[11px] px-3 py-1.5 rounded-xl border font-bold transition-all shrink-0 cursor-pointer shadow-2xs ${
                    onlyPeriodSubjects
                      ? "bg-teal-800 text-white border-teal-800"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {onlyPeriodSubjects ? `✓ Đang lọc: Môn theo kỳ (${periodSubjectIds.size})` : `Hiện tất cả (${subjects.length} môn)`}
                </button>
              )}
            </div>

            {/* Danh sách nút chọn môn học - Click mượt mà */}
            <div className="max-h-56 overflow-y-auto p-2.5 border border-slate-200 rounded-2xl bg-white grid grid-cols-2 sm:grid-cols-3 gap-2 shadow-inner">
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
                          ? "bg-teal-50 border-teal-400 text-teal-950 font-bold shadow-xs ring-1 ring-teal-400/40"
                          : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100/90"
                      }`}
                    >
                      {/* Checkbox Icon */}
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-[#005B58] border-[#005B58] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      {/* Tên môn học */}
                      <div className="truncate flex-1">
                        <span className="truncate">{s.subjectName}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({s.subjectCode})</span>
                      </div>

                      {/* Badge nếu là môn theo kỳ */}
                      {isPeriodSubj && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"
                          title="Môn đã được cấu hình trong kỳ này"
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* SECTION 3: TÙY CHỌN NÂNG CAO */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
            <div className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              3. Tùy Chọn Bổ Sung Cho Báo Cáo
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                role="button"
                tabIndex={0}
                onClick={() => !isExporting && setIncludeOverviewSheet(!includeOverviewSheet)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  includeOverviewSheet
                    ? "bg-white border-teal-400 shadow-xs ring-1 ring-teal-400/30"
                    : "bg-white/60 border-amber-200 hover:bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    includeOverviewSheet
                      ? "bg-[#005B58] border-[#005B58] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {includeOverviewSheet && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Kèm Sheet "00_Tổng quan Báo cáo"
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    Thống kê tỷ lệ nhập điểm, điểm trung bình và phổ điểm (Giỏi / Khá / Đạt) từng môn toàn trường.
                  </div>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => !isExporting && setIncludeMasterSummarySheet(!includeMasterSummarySheet)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                  includeMasterSummarySheet
                    ? "bg-white border-teal-400 shadow-xs ring-1 ring-teal-400/30"
                    : "bg-white/60 border-amber-200 hover:bg-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all ${
                    includeMasterSummarySheet
                      ? "bg-[#005B58] border-[#005B58] text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {includeMasterSummarySheet && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Kèm Sheet "Bảng điểm Tổng hợp Toàn Môn"
                  </div>
                  <div className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    Mỗi học sinh 1 dòng kèm điểm số của tất cả các môn ngang hàng, thuận tiện xét thi đua và xếp loại.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PROGRESS BAR KHI ĐANG XUẤT */}
          {isExporting && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-teal-800">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  {progressMessage}
                </span>
                <span className="text-teal-900 font-black">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Xuất cho: <strong className="text-slate-800">{targetCampus?.campusName || "Toàn trường"}</strong> •{" "}
            Kỳ: <strong className="text-teal-700">{targetPeriod?.name || selectedPeriod}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || effectiveSelectedIds.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#005B58] hover:bg-[#004845] text-white text-xs font-bold shadow-lg shadow-teal-900/10 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang xuất file...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tiến hành Xuất Excel ({effectiveSelectedIds.length} môn)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
