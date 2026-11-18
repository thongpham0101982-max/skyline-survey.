"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  FileSpreadsheet,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react"
import {
  calculateTt22SemesterAverage,
  isTt22CommentOnlySubject,
  normalizeTt22DatInput,
} from "@/lib/grading/vnedu-config-types"

export interface SecondaryStudentEntry {
  componentScores: Record<string, string>
  compositeScore: string
  ratingValue?: string
  remark: string
}

export interface VnEduSecondaryGradebookProps {
  classObj: any
  subjectObj: any
  evaluationPeriod: string
  onChangePeriod?: (nextPeriod: string) => void
  teacherName: string
  roleLabel?: string
  isLocked?: boolean
  config: any
  students: any[]
  entries: Record<string, SecondaryStudentEntry>
  searchKeyword?: string
  homeroomCoordination?: Record<string, any>
  onOpenCoordModal?: (student: any) => void
  onChangeScore: (studentId: string, colIndex: number, val: string) => void
  onChangeRating: (studentId: string, val: string) => void
  onChangeRemark: (studentId: string, val: string) => void
  onBulkUpdateEntries: (updater: (prev: Record<string, SecondaryStudentEntry>) => Record<string, SecondaryStudentEntry>) => void
  onOpenMultiSheetImport?: () => void
  onSave?: () => void
  saving?: boolean
}

interface Tt22RemarkTemplate {
  id: string
  tier: "TOT" | "KHA" | "DAT" | "CHUA_DAT"
  text: string
  scope: "MINE" | "SUBJECT" | "GRADE"
}

const DEFAULT_TT22_REMARK_TEMPLATES: Tt22RemarkTemplate[] = [
  {
    id: "tt22_tot_1",
    tier: "TOT",
    text: "Nắm vững kiến thức bộ môn, vận dụng giải quyết vấn đề linh hoạt và tích cực xây dựng bài.",
    scope: "SUBJECT",
  },
  {
    id: "tt22_tot_2",
    tier: "TOT",
    text: "Có tư duy khoa học tốt, hoàn thành xuất sắc các nhiệm vụ học tập và bài kiểm tra định kỳ.",
    scope: "GRADE",
  },
  {
    id: "tt22_kha_1",
    tier: "KHA",
    text: "Hiểu bài, nắm được kiến thức trọng tâm và làm bài khá tốt; cần rèn thêm kỹ năng trình bày chặt chẽ hơn.",
    scope: "SUBJECT",
  },
  {
    id: "tt22_dat_1",
    tier: "DAT",
    text: "Đạt yêu cầu cơ bản của môn học; cần chủ động ôn tập và làm thêm bài tập để nâng cao kết quả.",
    scope: "SUBJECT",
  },
  {
    id: "tt22_cd_1",
    tier: "CHUA_DAT",
    text: "Chưa nắm vững kiến thức cơ bản của môn học; cần tập trung hơn trên lớp và ôn luyện bổ sung.",
    scope: "SUBJECT",
  },
]

function splitFullName(fullName: string): { lastName: string; firstName: string } {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ")
  if (!clean) return { lastName: "", firstName: "" }
  const lastSpace = clean.lastIndexOf(" ")
  if (lastSpace === -1) return { lastName: "", firstName: clean }
  return {
    lastName: clean.slice(0, lastSpace).trim(),
    firstName: clean.slice(lastSpace + 1).trim(),
  }
}

function formatDob(dob: any): string {
  if (!dob) return "-"
  try {
    const d = new Date(dob)
    if (isNaN(d.getTime())) return "-"
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return "-"
  }
}

function cleanRemarkTrailingComma(text: string, stripComma: boolean): string {
  if (!stripComma) return text
  return text.replace(/,\s*$/, "")
}

export function VnEduSecondaryGradebook({
  classObj,
  subjectObj,
  evaluationPeriod,
  onChangePeriod,
  teacherName,
  roleLabel = "Bạn có quyền Admin",
  isLocked = false,
  config,
  students,
  entries,
  searchKeyword = "",
  homeroomCoordination = {},
  onOpenCoordModal,
  onChangeRemark,
  onBulkUpdateEntries,
  onOpenMultiSheetImport,
  onSave,
  saving = false,
}: VnEduSecondaryGradebookProps) {
  // Determine view mode: HK1 | HK2 | CN
  const [viewMode, setViewMode] = useState<"HK1" | "HK2" | "CN">(() => {
    const p = String(evaluationPeriod || "").toUpperCase()
    if (p === "CN") return "CN"
    if (p === "GK2" || p === "CK2" || p === "HK2") return "HK2"
    return "HK1"
  })

  useEffect(() => {
    const p = String(evaluationPeriod || "").toUpperCase()
    if (p === "CN") setViewMode("CN")
    else if (p === "GK2" || p === "CK2" || p === "HK2") setViewMode("HK2")
    else setViewMode("HK1")
  }, [evaluationPeriod])

  // Determine if this subject is Comment-Only (Đ/CĐ) under TT22
  const defaultIsCommentOnly = useMemo(() => {
    if (config && typeof config.isTt22CommentOnly === "boolean") {
      return config.isTt22CommentOnly
    }
    return isTt22CommentOnlySubject(subjectObj?.subjectName || subjectObj?.subjectCode)
  }, [config, subjectObj])

  const [overrideCommentOnly, setOverrideCommentOnly] = useState<boolean | null>(null)
  useEffect(() => {
    setOverrideCommentOnly(null)
  }, [subjectObj?.id, classObj?.id])

  const isCommentOnly = overrideCommentOnly !== null ? overrideCommentOnly : defaultIsCommentOnly

  // Determine number of TX columns (default 4 on vnEdu grid: TX1, TX2, TX3, TX4)
  const [txCount, setTxCount] = useState<2 | 3 | 4>(4)

  // vnEdu toolbar checkboxes
  const [filterMine, setFilterMine] = useState(true)
  const [filterSubject, setFilterSubject] = useState(true)
  const [filterGrade, setFilterGrade] = useState(true)
  const [stripTrailingComma, setStripTrailingComma] = useState(true)
  const [showSubmittedBadges, setShowSubmittedBadges] = useState(false)

  // Modals
  const [isByRatingModalOpen, setIsByRatingModalOpen] = useState(false)
  const [ratingForm, setRatingForm] = useState({
    TOT: "Nắm vững kiến thức bộ môn, vận dụng giải quyết vấn đề linh hoạt và tích cực xây dựng bài.",
    KHA: "Hiểu bài, nắm được kiến thức trọng tâm và làm bài khá tốt; cần rèn thêm kỹ năng trình bày chặt chẽ hơn.",
    DAT: "Đạt yêu cầu cơ bản của môn học; cần chủ động ôn tập và làm thêm bài tập để nâng cao kết quả.",
    CHUA_DAT: "Chưa nắm vững kiến thức cơ bản của môn học; cần tập trung hơn trên lớp và ôn luyện bổ sung.",
    onlyEmpty: false,
  })

  const [isByScoreModalOpen, setIsByScoreModalOpen] = useState(false)
  const [scoreForm, setScoreForm] = useState({
    range8_10: "Nắm vững kiến thức bộ môn, vận dụng giải quyết vấn đề linh hoạt và làm bài kiểm tra đạt kết quả tốt.",
    range65_79: "Hiểu bài, nắm được kiến thức trọng tâm và vận dụng khá tốt; cần rèn tính cẩn thận để đạt điểm tối đa.",
    range5_64: "Đạt yêu cầu cơ bản của môn học; cần tăng cường ôn luyện các dạng bài tập tự luận và vận dụng.",
    rangeUnder5: "Hổng kiến thức cơ bản, cần bám sát hướng dẫn của giáo viên bộ môn và ôn tập thường xuyên hơn.",
    onlyEmpty: false,
  })

  const [activeRemarkStudentId, setActiveRemarkStudentId] = useState<string | null>(null)

  const filteredStudents = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    if (!kw) return students
    return students.filter(
      st =>
        String(st.studentCode || "").toLowerCase().includes(kw) ||
        String(st.vnEduCode || "").toLowerCase().includes(kw) ||
        String(st.studentName || "").toLowerCase().includes(kw)
    )
  }, [students, searchKeyword])

  // Helpers to read/write TX1..TX4, ĐĐGgk, ĐĐGck from componentScores
  const getTxValue = (studentId: string, txIdx: number): string => {
    const comp = entries[studentId]?.componentScores || {}
    return String(comp[`tx${txIdx + 1}`] ?? comp[`col${txIdx}`] ?? "")
  }

  const getGkValue = (studentId: string): string => {
    const comp = entries[studentId]?.componentScores || {}
    return String(comp.gk ?? comp[`col${txCount}`] ?? comp.col4 ?? "")
  }

  const getCkValue = (studentId: string): string => {
    const comp = entries[studentId]?.componentScores || {}
    return String(comp.ck ?? comp[`col${txCount + 1}`] ?? comp.col5 ?? "")
  }

  const updateSemesterField = (
    studentId: string,
    field: "tx1" | "tx2" | "tx3" | "tx4" | "gk" | "ck",
    rawVal: string
  ) => {
    if (isLocked) return
    const val = isCommentOnly ? normalizeTt22DatInput(rawVal) : rawVal

    onBulkUpdateEntries(prev => {
      const cur = prev[studentId] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
      const nextComp = { ...cur.componentScores, [field]: val }

      // Also sync legacy col0..col5 keys so backend/Excel exports stay 100% compatible
      const txArr: string[] = []
      for (let i = 0; i < txCount; i++) {
        const k = `tx${i + 1}`
        const v = k === field ? val : String(nextComp[k] ?? nextComp[`col${i}`] ?? "")
        nextComp[k] = v
        nextComp[`col${i}`] = v
        txArr.push(v)
      }
      const gkVal = field === "gk" ? val : String(nextComp.gk ?? nextComp[`col${txCount}`] ?? "")
      const ckVal = field === "ck" ? val : String(nextComp.ck ?? nextComp[`col${txCount + 1}`] ?? "")
      nextComp.gk = gkVal
      nextComp[`col${txCount}`] = gkVal
      nextComp.ck = ckVal
      nextComp[`col${txCount + 1}`] = ckVal

      const dtbmhk = calculateTt22SemesterAverage(
        { txValues: txArr, gkValue: gkVal, ckValue: ckVal },
        isCommentOnly
      )

      return {
        ...prev,
        [studentId]: {
          ...cur,
          componentScores: nextComp,
          compositeScore: isCommentOnly ? "" : dtbmhk,
          ratingValue: isCommentOnly ? dtbmhk : cur.ratingValue,
        },
      }
    })
  }

  // Helpers for Cả năm (CN) view: TBHK 1, TBHK 2, Điểm thi lại, Ghi chú
  const updateCnField = (
    studentId: string,
    field: "tbhk1" | "tbhk2" | "thi_lai" | "ghi_chu",
    rawVal: string
  ) => {
    if (isLocked) return
    const val = isCommentOnly && field !== "ghi_chu" ? normalizeTt22DatInput(rawVal) : rawVal
    onBulkUpdateEntries(prev => {
      const cur = prev[studentId] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
      const nextComp = { ...cur.componentScores, [field]: val }
      if (field === "tbhk1") nextComp.col0 = val
      if (field === "tbhk2") nextComp.col1 = val
      if (field === "thi_lai") nextComp.col2 = val
      if (field === "ghi_chu") nextComp.col3 = val

      const hk1Str = String(nextComp.tbhk1 ?? nextComp.col0 ?? "").trim()
      const hk2Str = String(nextComp.tbhk2 ?? nextComp.col1 ?? "").trim()

      let tbCn = ""
      if (hk2Str !== "") {
        if (isCommentOnly) {
          tbCn = normalizeTt22DatInput(hk2Str) === "Đ" ? "Đ" : "CĐ"
        } else if (hk1Str !== "") {
          const n1 = Number(hk1Str.replace(",", "."))
          const n2 = Number(hk2Str.replace(",", "."))
          if (!isNaN(n1) && !isNaN(n2)) {
            tbCn = (Math.round(((n1 + 2 * n2) / 3 + Number.EPSILON) * 10) / 10).toFixed(1)
          }
        }
      }

      return {
        ...prev,
        [studentId]: {
          ...cur,
          componentScores: nextComp,
          compositeScore: isCommentOnly ? "" : tbCn,
          ratingValue: isCommentOnly ? tbCn : cur.ratingValue,
        },
      }
    })
  }

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colKey: string,
    studentId: string,
    onSetDat?: (val: string) => void
  ) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      const next = document.querySelector<HTMLInputElement>(
        `input[data-tt22-row="${rowIdx + 1}"][data-tt22-col="${colKey}"]`
      )
      if (next) {
        next.focus()
        next.select()
      }
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = document.querySelector<HTMLInputElement>(
        `input[data-tt22-row="${rowIdx - 1}"][data-tt22-col="${colKey}"]`
      )
      if (prev) {
        prev.focus()
        prev.select()
      }
      return
    }

    if (isCommentOnly && onSetDat && !isLocked) {
      const k = e.key.toLowerCase()
      if (k === "1" || k === "d" || k === "đ") {
        e.preventDefault()
        onSetDat("Đ")
      } else if (k === "0" || k === "c") {
        e.preventDefault()
        onSetDat("CĐ")
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        onSetDat("")
      }
    }
  }

  // Batch fill remarks by Rating / Tier
  const handleApplyRemarksByRating = () => {
    if (isLocked) return
    onBulkUpdateEntries(prev => {
      const next = { ...prev }
      students.forEach(st => {
        const cur = next[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        if (ratingForm.onlyEmpty && cur.remark?.trim()) return

        let tpl = ""
        if (isCommentOnly) {
          const r = cur.ratingValue || calculateTt22SemesterAverage(
            {
              txValues: [getTxValue(st.id, 0), getTxValue(st.id, 1), getTxValue(st.id, 2), getTxValue(st.id, 3)],
              gkValue: getGkValue(st.id),
              ckValue: getCkValue(st.id),
            },
            true
          )
          if (r === "Đ") tpl = ratingForm.TOT
          else if (r === "CĐ") tpl = ratingForm.CHUA_DAT
        } else {
          const avgStr =
            cur.compositeScore ||
            calculateTt22SemesterAverage(
              {
                txValues: [getTxValue(st.id, 0), getTxValue(st.id, 1), getTxValue(st.id, 2), getTxValue(st.id, 3)],
                gkValue: getGkValue(st.id),
                ckValue: getCkValue(st.id),
              },
              false
            )
          const num = Number(avgStr || getCkValue(st.id) || getGkValue(st.id))
          if (!isNaN(num) && avgStr !== "") {
            if (num >= 8.0) tpl = ratingForm.TOT
            else if (num >= 6.5) tpl = ratingForm.KHA
            else if (num >= 5.0) tpl = ratingForm.DAT
            else tpl = ratingForm.CHUA_DAT
          }
        }

        if (tpl) {
          next[st.id] = {
            ...cur,
            remark: cleanRemarkTrailingComma(tpl.trim(), stripTrailingComma),
          }
        }
      })
      return next
    })
    setIsByRatingModalOpen(false)
  }

  // Batch fill remarks by Score range
  const handleApplyRemarksByScore = () => {
    if (isLocked) return
    onBulkUpdateEntries(prev => {
      const next = { ...prev }
      students.forEach(st => {
        const cur = next[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        if (scoreForm.onlyEmpty && cur.remark?.trim()) return

        const dtb =
          cur.compositeScore ||
          calculateTt22SemesterAverage(
            {
              txValues: [getTxValue(st.id, 0), getTxValue(st.id, 1), getTxValue(st.id, 2), getTxValue(st.id, 3)],
              gkValue: getGkValue(st.id),
              ckValue: getCkValue(st.id),
            },
            false
          ) ||
          getCkValue(st.id) ||
          getGkValue(st.id)

        const num = Number(String(dtb).replace(",", "."))
        if (String(dtb).trim() === "" || isNaN(num)) return

        let tpl = ""
        if (num >= 8.0) tpl = scoreForm.range8_10
        else if (num >= 6.5) tpl = scoreForm.range65_79
        else if (num >= 5.0) tpl = scoreForm.range5_64
        else tpl = scoreForm.rangeUnder5

        if (tpl) {
          next[st.id] = {
            ...cur,
            remark: cleanRemarkTrailingComma(tpl.trim(), stripTrailingComma),
          }
        }
      })
      return next
    })
    setIsByScoreModalOpen(false)
  }

  const semesterDisplayTitle =
    viewMode === "CN" ? "Cả năm" : viewMode === "HK2" ? "Học kỳ 2" : "Học kỳ 1"

  return (
    <div className="space-y-3">
      {/* DÒNG 1: THANH CÔNG CỤ SỔ ĐIỂM VNEDU THCS & THPT (THÔNG TƯ 22) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Bộ chọn Học kỳ chuẩn vnEdu: Học kỳ 1 | Học kỳ 2 | Cả năm */}
          <div className="inline-flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            {[
              { code: "HK1" as const, label: "Học kỳ 1", targetPeriod: "CK1" },
              { code: "HK2" as const, label: "Học kỳ 2", targetPeriod: "CK2" },
              { code: "CN" as const, label: "Cả năm", targetPeriod: "CN" },
            ].map(sem => (
              <button
                key={sem.code}
                type="button"
                onClick={() => {
                  setViewMode(sem.code)
                  if (onChangePeriod && sem.code !== "CN") {
                    onChangePeriod(sem.targetPeriod)
                  }
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  viewMode === sem.code
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {sem.label}
              </button>
            ))}
          </div>

          <span className="text-slate-300">|</span>

          <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#008B85]" />
            Danh mục nhận xét:
          </span>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterMine}
              onChange={(e) => setFilterMine(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>của tôi</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterSubject}
              onChange={(e) => setFilterSubject(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>của môn học</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterGrade}
              onChange={(e) => setFilterGrade(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>theo khối của lớp</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={stripTrailingComma}
              onChange={(e) => setStripTrailingComma(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>Xóa dấu , ở cuối nội dung nhận xét</span>
          </label>
        </div>

        {/* Các nút chức năng bên phải giống vnEdu THCS/THPT */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === "CN" && (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => {
                onBulkUpdateEntries(prev => {
                  const next = { ...prev }
                  students.forEach(st => {
                    const cur = next[st.id]
                    if (cur && cur.remark) {
                      next[st.id] = {
                        ...cur,
                        remark: cleanRemarkTrailingComma(cur.remark, stripTrailingComma),
                      }
                    }
                  })
                  return next
                })
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-[#E2E8F0] rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-[#008B85]" />
              Copy nhận xét học kỳ 2
            </button>
          )}

          <button
            type="button"
            disabled={isLocked}
            onClick={() => setIsByRatingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#008B85]" />
            Nhập nhận xét theo xếp loại
          </button>

          {!isCommentOnly && (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setIsByScoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              Nhập nhận xét theo khoảng điểm
            </button>
          )}

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showSubmittedBadges}
              onChange={(e) => setShowSubmittedBadges(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>Hiển thị con điểm đã gửi</span>
          </label>

          {onOpenMultiSheetImport && (
            <button
              type="button"
              disabled={isLocked}
              onClick={onOpenMultiSheetImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#008B85] hover:bg-[#00736E] text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50"
              title="Import 1 hoặc nhiều file Excel nhiều sheet (mỗi sheet là 1 môn học)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-100" />
              Import Excel (Nhiều sheet / Các môn)
            </button>
          )}

          {onSave && (
            <button
              type="button"
              disabled={isLocked || saving}
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          )}
        </div>
      </div>

      {/* DÒNG 2: DẢI THÔNG TIN SỔ ĐIỂM CHI TIẾT THCS & THPT CHUẨN VNEDU */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold text-[#003B3A] tracking-tight">SỔ ĐIỂM CHI TIẾT</span>
            <span>
              Lớp: <strong className="text-slate-900 font-bold">{classObj?.className || "Chưa chọn"}</strong>
            </span>
            <span>
              Môn học:{" "}
              <strong className="text-slate-900 font-bold">
                {subjectObj?.subjectName || "Chưa chọn"} - {semesterDisplayTitle}
              </strong>
            </span>
            <span>
              Giáo viên dạy: <strong className="text-slate-900 font-bold">{teacherName || "Chưa phân công"}</strong>
              <span className="text-slate-500"> + 0 GV được ủy quyền</span>
            </span>
            <span>
              Quyền hạn:{" "}
              <strong className={isLocked ? "text-[#E11D48]" : "text-slate-900"}>
                {isLocked ? "Sổ điểm đã khóa (Chỉ xem)" : roleLabel}
              </strong>
            </span>
          </div>

          {viewMode !== "CN" && (
            <div className="text-[11px] text-[#E11D48] italic font-medium">
              (Ghi chú: Sau khi có điểm thi học kỳ hệ thống mới tính Điểm TBHK của môn học. Giáo viên giảng dạy chỉ có thể sửa các con điểm chưa bị khóa)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {viewMode !== "CN" && (
            <div className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[11px]">
              <span className="text-slate-500 font-medium">Số cột ĐĐGtx:</span>
              {([2, 3, 4] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTxCount(n)}
                  className={`w-6 h-6 rounded font-bold transition-colors ${
                    txCount === n
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setOverrideCommentOnly(!isCommentOnly)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
              isCommentOnly
                ? "bg-teal-50 text-[#003B3A] border-teal-200"
                : "bg-white text-slate-700 border-[#E2E8F0]"
            }`}
            title="Chuyển đổi giữa Môn tính điểm (Thang 10) và Môn đánh giá bằng nhận xét (Đ / CĐ) theo Thông tư 22"
          >
            {isCommentOnly ? "TT22: Môn nhận xét (Đ / CĐ)" : "TT22: Môn tính điểm (Thang 10)"}
          </button>
        </div>
      </div>

      {/* DÒNG 3: BẢNG SỔ ĐIỂM CHI TIẾT THCS & THPT (SKY-LINE ACADEMIC LEDGER TABLE) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === "CN" ? (
            /* CHẾ ĐỘ CẢ NĂM (CN) - KHỚP 100% HÌNH 4 VNEDU */
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-3 px-3 w-12 text-center border-r border-white/15">STT</th>
                  <th className="py-3 px-3 w-28 text-center border-r border-white/15 text-teal-100">Mã HS</th>
                  <th colSpan={2} className="py-3 px-3 text-center border-r border-white/15 min-w-[200px]">
                    Họ và tên
                  </th>
                  <th className="py-3 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-white/15 text-teal-100">TBHK 1</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-white/15 text-teal-100">TBHK 2</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-white/15 text-[#5EEAD4]">TB Cả năm</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-white/15 text-teal-100">Điểm thi lại</th>
                  <th className="py-3 px-3 w-36 text-center border-r border-white/15 text-teal-100">Ghi chú</th>
                  <th className="py-3 px-4 text-center min-w-[300px]">Nhận xét</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredStudents.map((st, rowIdx) => {
                  const { lastName, firstName } = splitFullName(st.studentName)
                  const entry = entries[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
                  const comp = entry.componentScores || {}
                  const tbhk1 = String(comp.tbhk1 ?? comp.col0 ?? "")
                  const tbhk2 = String(comp.tbhk2 ?? comp.col1 ?? "")
                  const thiLai = String(comp.thi_lai ?? comp.col2 ?? "")
                  const ghiChu = String(comp.ghi_chu ?? comp.col3 ?? "")
                  const tbCn = isCommentOnly ? entry.ratingValue || "" : entry.compositeScore || ""

                  return (
                    <tr key={st.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      <td className="py-2 px-3 text-center font-semibold text-slate-600 border-r border-[#E2E8F0]">
                        {rowIdx + 1}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-[#E2E8F0]">
                        {st.vnEduCode || st.studentCode}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-100 min-w-[130px]">
                        {lastName}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-20">
                        {firstName}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700 border-r border-[#E2E8F0]">
                        {formatDob(st.dateOfBirth)}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0]">
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="tbhk1"
                          value={tbhk1}
                          onChange={(e) => updateCnField(st.id, "tbhk1", e.target.value)}
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIdx, "tbhk1", st.id, (v) => updateCnField(st.id, "tbhk1", v))
                          }
                          className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0]">
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="tbhk2"
                          value={tbhk2}
                          onChange={(e) => updateCnField(st.id, "tbhk2", e.target.value)}
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIdx, "tbhk2", st.id, (v) => updateCnField(st.id, "tbhk2", v))
                          }
                          className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-[#003B3A] border-r border-[#E2E8F0] bg-teal-50/30">
                        {tbCn}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0] relative">
                        <span className="absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-t-[#059669] border-r-[5px] border-r-transparent pointer-events-none" />
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="thi_lai"
                          value={thiLai}
                          onChange={(e) => updateCnField(st.id, "thi_lai", e.target.value)}
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIdx, "thi_lai", st.id, (v) => updateCnField(st.id, "thi_lai", v))
                          }
                          className="w-16 text-center border border-slate-200 rounded-lg py-1 text-xs font-semibold text-slate-800 focus:border-[#008B85] outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-[#E2E8F0] relative">
                        <span className="absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-t-[#059669] border-r-[5px] border-r-transparent pointer-events-none" />
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="ghi_chu"
                          value={ghiChu}
                          onChange={(e) => updateCnField(st.id, "ghi_chu", e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, "ghi_chu", st.id)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:border-[#008B85] outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 relative">
                        <span className="absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-t-[#059669] border-r-[5px] border-r-transparent pointer-events-none" />
                        <input
                          type="text"
                          disabled={isLocked}
                          value={entry.remark || ""}
                          onChange={(e) => onChangeRemark(st.id, e.target.value)}
                          onBlur={(e) => {
                            if (stripTrailingComma && e.target.value.trim().endsWith(",")) {
                              onChangeRemark(st.id, cleanRemarkTrailingComma(e.target.value, true))
                            }
                          }}
                          className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:border-[#008B85] outline-none"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            /* CHẾ ĐỘ HỌC KỲ 1 / HỌC KỲ 2 - KHỚP 100% HÌNH 2 & HÌNH 3 VNEDU */
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                {/* TẦNG 1 */}
                <tr className="text-[11px] font-semibold whitespace-nowrap border-b border-white/15">
                  <th rowSpan={2} className="py-2.5 px-3 w-12 text-center border-r border-white/15">
                    STT
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 w-28 text-center border-r border-white/15 text-teal-100">
                    Mã HS
                  </th>
                  <th rowSpan={2} colSpan={2} className="py-2.5 px-3 text-center border-r border-white/15 min-w-[200px]">
                    Họ và tên
                  </th>
                  <th rowSpan={2} className="py-2.5 px-3 w-28 text-center border-r border-white/15 text-teal-100">
                    Ngày sinh
                  </th>
                  <th colSpan={txCount} className="py-2 px-3 text-center border-r border-white/15 text-teal-100">
                    ĐĐGtx
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 w-20 text-center border-r border-white/15 text-white">
                    ĐĐGgk
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 w-20 text-center border-r border-white/15 text-white">
                    ĐĐGck
                  </th>
                  <th rowSpan={2} className="py-2.5 px-2 w-20 text-center border-r border-white/15 text-[#5EEAD4]">
                    ĐTBmhk
                  </th>
                  <th rowSpan={2} className="py-2.5 px-4 text-center min-w-[300px]">
                    Nhận xét
                  </th>
                </tr>
                {/* TẦNG 2: TX1 .. TX4 */}
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  {Array.from({ length: txCount }).map((_, idx) => (
                    <th key={idx} className="py-1.5 px-2 w-16 text-center border-r border-white/15 text-white">
                      TX{idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {filteredStudents.map((st, rowIdx) => {
                  const { lastName, firstName } = splitFullName(st.studentName)
                  const entry = entries[st.id] || {
                    componentScores: {},
                    compositeScore: "",
                    ratingValue: "",
                    remark: "",
                  }
                  const txVals = Array.from({ length: txCount }).map((_, idx) => getTxValue(st.id, idx))
                  const gkVal = getGkValue(st.id)
                  const ckVal = getCkValue(st.id)
                  const computedDtb = calculateTt22SemesterAverage(
                    { txValues: txVals, gkValue: gkVal, ckValue: ckVal },
                    isCommentOnly
                  )
                  const isRemarkPickerOpen = activeRemarkStudentId === st.id

                  return (
                    <tr key={st.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                      {/* STT */}
                      <td className="py-2 px-3 text-center font-semibold text-slate-600 border-r border-[#E2E8F0]">
                        {rowIdx + 1}
                      </td>

                      {/* Mã HS */}
                      <td className="py-2 px-3 text-center font-mono text-slate-700 border-r border-[#E2E8F0]">
                        {st.vnEduCode || st.studentCode}
                      </td>

                      {/* Họ và tên đệm */}
                      <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-100 min-w-[130px]">
                        <div>{lastName}</div>
                        {homeroomCoordination[st.id] && onOpenCoordModal && (
                          <div className="mt-1">
                            {homeroomCoordination[st.id].gvbmResponse ? (
                              <button
                                type="button"
                                onClick={() => onOpenCoordModal(st)}
                                className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200 font-semibold text-[10px] inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã phản hồi GVCN</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenCoordModal(st)}
                                className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 font-semibold text-[10px] inline-flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Ý kiến PHHS</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tên */}
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-20">
                        {firstName}
                      </td>

                      {/* Ngày sinh */}
                      <td className="py-2 px-3 text-center text-slate-700 border-r border-[#E2E8F0]">
                        {formatDob(st.dateOfBirth)}
                      </td>

                      {/* Cụm cột ĐĐGtx: TX1 .. TX4 */}
                      {txVals.map((tv, idx) => {
                        const fieldKey = `tx${idx + 1}` as "tx1" | "tx2" | "tx3" | "tx4"
                        const num = Number(String(tv).replace(",", "."))
                        const isInvalidNum =
                          !isCommentOnly && tv.trim() !== "" && (isNaN(num) || num < 0 || num > 10)
                        return (
                          <td
                            key={fieldKey}
                            className="py-1.5 px-1.5 text-center border-r border-[#E2E8F0] relative"
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-r-[5px] border-r-transparent pointer-events-none ${
                                tv.trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                              }`}
                            />
                            <input
                              type="text"
                              disabled={isLocked}
                              data-tt22-row={rowIdx}
                              data-tt22-col={fieldKey}
                              value={tv}
                              onChange={(e) => updateSemesterField(st.id, fieldKey, e.target.value)}
                              onKeyDown={(e) =>
                                handleCellKeyDown(e, rowIdx, fieldKey, st.id, (v) =>
                                  updateSemesterField(st.id, fieldKey, v)
                                )
                              }
                              placeholder={isCommentOnly ? "Đ/CĐ" : ""}
                              className={`w-13 text-center border rounded-lg py-1 text-xs font-bold outline-none transition-colors ${
                                isInvalidNum
                                  ? "border-[#E11D48] bg-rose-50 text-[#E11D48]"
                                  : "border-slate-200 text-slate-900 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85]"
                              }`}
                            />
                          </td>
                        )
                      })}

                      {/* ĐĐGgk */}
                      <td className="py-1.5 px-1.5 text-center border-r border-[#E2E8F0] relative">
                        <span
                          className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-r-[5px] border-r-transparent pointer-events-none ${
                            gkVal.trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                          }`}
                        />
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="gk"
                          value={gkVal}
                          onChange={(e) => updateSemesterField(st.id, "gk", e.target.value)}
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIdx, "gk", st.id, (v) =>
                              updateSemesterField(st.id, "gk", v)
                            )
                          }
                          placeholder={isCommentOnly ? "Đ/CĐ" : ""}
                          className="w-14 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold text-slate-900 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85] outline-none"
                        />
                      </td>

                      {/* ĐĐGck */}
                      <td className="py-1.5 px-1.5 text-center border-r border-[#E2E8F0] relative">
                        <span
                          className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-r-[5px] border-r-transparent pointer-events-none ${
                            ckVal.trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                          }`}
                        />
                        <input
                          type="text"
                          disabled={isLocked}
                          data-tt22-row={rowIdx}
                          data-tt22-col="ck"
                          value={ckVal}
                          onChange={(e) => updateSemesterField(st.id, "ck", e.target.value)}
                          onKeyDown={(e) =>
                            handleCellKeyDown(e, rowIdx, "ck", st.id, (v) =>
                              updateSemesterField(st.id, "ck", v)
                            )
                          }
                          placeholder={isCommentOnly ? "Đ/CĐ" : ""}
                          className="w-14 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold text-slate-900 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85] outline-none"
                        />
                      </td>

                      {/* ĐTBmhk (Chỉ hiển thị sau khi đã nhập ĐĐGck theo đúng quy tắc vnEdu!) */}
                      <td className="py-2 px-2 text-center border-r border-[#E2E8F0] bg-teal-50/25 font-bold">
                        {computedDtb ? (
                          <span
                            className={
                              computedDtb === "CĐ" || (!isNaN(Number(computedDtb)) && Number(computedDtb) < 5.0)
                                ? "text-[#E11D48]"
                                : computedDtb === "Đ" || Number(computedDtb) >= 8.0
                                ? "text-[#059669]"
                                : "text-[#003B3A]"
                            }
                          >
                            {computedDtb}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>

                      {/* Nhận xét */}
                      <td className="py-1.5 px-2 relative">
                        <span
                          className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[5px] border-r-[5px] border-r-transparent pointer-events-none ${
                            (entry.remark || "").trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                          }`}
                        />
                        <div className="relative">
                          <input
                            type="text"
                            disabled={isLocked}
                            value={entry.remark || ""}
                            onChange={(e) => onChangeRemark(st.id, e.target.value)}
                            onBlur={(e) => {
                              if (stripTrailingComma && e.target.value.trim().endsWith(",")) {
                                onChangeRemark(st.id, cleanRemarkTrailingComma(e.target.value, true))
                              }
                            }}
                            onDoubleClick={() => {
                              if (!isLocked) setActiveRemarkStudentId(isRemarkPickerOpen ? null : st.id)
                            }}
                            placeholder="Nhập nhận xét hoặc nhấp đúp chuột để chọn mẫu..."
                            className="w-full border border-slate-200 rounded-lg px-2.5 py-1 pr-12 text-xs text-slate-800 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85] outline-none"
                          />
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => setActiveRemarkStudentId(isRemarkPickerOpen ? null : st.id)}
                              className="absolute right-1.5 top-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#003B3A] border border-slate-200 text-[10px] font-semibold"
                            >
                              Mẫu
                            </button>
                          )}
                        </div>

                        {isRemarkPickerOpen && (
                          <div className="mt-1 bg-white border border-[#003B3A]/20 rounded-xl shadow-lg p-2.5 space-y-1.5 z-20 relative">
                            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1">
                              <span className="font-semibold text-[#003B3A] text-[11px]">
                                Chọn nhanh nhận xét bộ môn (Thông tư 22):
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveRemarkStudentId(null)}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {DEFAULT_TT22_REMARK_TEMPLATES.map(tpl => (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    onChangeRemark(st.id, cleanRemarkTrailingComma(tpl.text, stripTrailingComma))
                                    setActiveRemarkStudentId(null)
                                  }}
                                  className="w-full text-left py-1.5 px-2 hover:bg-teal-50/70 rounded text-xs text-slate-700"
                                >
                                  {tpl.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* DẢI HƯỚNG DẪN CHÂN BẢNG CHUẨN THÔNG TƯ 22 */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums text-slate-600">
          <div>
            {isCommentOnly ? (
              <span>
                <strong>Cách nhập môn Nhận xét (TT22):</strong> Gõ phím <strong>1</strong> hoặc <strong>d, đ</strong> →{" "}
                <strong className="text-[#059669]">Đ (Đạt)</strong> | Gõ phím <strong>0</strong> hoặc <strong>c</strong> →{" "}
                <strong className="text-[#E11D48]">CĐ (Chưa đạt)</strong>.
              </span>
            ) : (
              <span>
                <strong>Công thức ĐTBmhk (Điều 9 Thông tư 22):</strong>{" "}
                <code>(Tổng ĐĐGtx + 2 × ĐĐGgk + 3 × ĐĐGck) / (Số ĐĐGtx + 5)</code> — tự động tính khi đã nhập{" "}
                <strong>ĐĐGck</strong>.
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Sĩ số: <strong className="text-slate-900">{students.length}</strong> HS • Phím{" "}
            <strong>Enter / ↓ / ↑</strong> để nhảy dòng
          </div>
        </div>
      </div>

      {/* MODAL 1: NHẬP NHẬN XÉT THEO XẾP LOẠI */}
      {isByRatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Nhập nhận xét theo xếp loại (Thông tư 22)</h4>
              <button type="button" onClick={() => setIsByRatingModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#059669] mb-1">Mức Tốt / Đạt (Đ):</label>
                <textarea
                  rows={2}
                  value={ratingForm.TOT}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, TOT: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              {!isCommentOnly && (
                <>
                  <div>
                    <label className="block font-semibold text-[#008B85] mb-1">Mức Khá (6.5 – 7.9đ):</label>
                    <textarea
                      rows={2}
                      value={ratingForm.KHA}
                      onChange={(e) => setRatingForm(prev => ({ ...prev, KHA: e.target.value }))}
                      className="w-full border border-[#E2E8F0] rounded-xl p-2"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#D97706] mb-1">Mức Đạt (5.0 – 6.4đ):</label>
                    <textarea
                      rows={2}
                      value={ratingForm.DAT}
                      onChange={(e) => setRatingForm(prev => ({ ...prev, DAT: e.target.value }))}
                      className="w-full border border-[#E2E8F0] rounded-xl p-2"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block font-semibold text-[#E11D48] mb-1">Mức Chưa đạt (CĐ / &lt; 5.0đ):</label>
                <textarea
                  rows={2}
                  value={ratingForm.CHUA_DAT}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, CHUA_DAT: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ratingForm.onlyEmpty}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, onlyEmpty: e.target.checked }))}
                />
                <span>Chỉ điền cho học sinh đang trống ô Nhận xét</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsByRatingModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold text-slate-600"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyRemarksByRating}
                  className="px-4 py-2 bg-[#003B3A] text-white rounded-xl font-semibold"
                >
                  Áp dụng nhận xét
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NHẬP NHẬN XÉT THEO KHOẢNG ĐIỂM */}
      {isByScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Nhập nhận xét theo khoảng điểm (Thông tư 22)</h4>
              <button type="button" onClick={() => setIsByScoreModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#059669] mb-1">Điểm từ 8.0 đến 10.0đ:</label>
                <textarea
                  rows={2}
                  value={scoreForm.range8_10}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, range8_10: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#008B85] mb-1">Điểm từ 6.5 đến 7.9đ:</label>
                <textarea
                  rows={2}
                  value={scoreForm.range65_79}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, range65_79: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#D97706] mb-1">Điểm từ 5.0 đến 6.4đ:</label>
                <textarea
                  rows={2}
                  value={scoreForm.range5_64}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, range5_64: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#E11D48] mb-1">Điểm dưới 5.0đ:</label>
                <textarea
                  rows={2}
                  value={scoreForm.rangeUnder5}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, rangeUnder5: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl p-2"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scoreForm.onlyEmpty}
                  onChange={(e) => setScoreForm(prev => ({ ...prev, onlyEmpty: e.target.checked }))}
                />
                <span>Chỉ điền cho học sinh đang trống ô Nhận xét</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsByScoreModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold text-slate-600"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyRemarksByScore}
                  className="px-4 py-2 bg-[#003B3A] text-white rounded-xl font-semibold"
                >
                  Áp dụng cho cả lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
