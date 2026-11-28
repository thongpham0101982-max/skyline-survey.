"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  Check,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  Lock,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
  Wand2,
  X,
} from "lucide-react"
import {
  extractGradeNumber,
  getPrimaryPeriodMeta,
  normalizePrimaryXlInput,
  shouldPrimarySubjectHaveKtColumn,
} from "@/lib/grading/vnedu-config-types"

export interface PrimaryStudentEntry {
  componentScores: Record<string, string>
  compositeScore: string
  ratingValue?: string
  remark: string
}

export interface VnEduPrimaryGradebookProps {
  academicYearName?: string
  classObj: any
  subjectObj: any
  evaluationPeriod: string
  onChangePeriod?: (nextPeriod: string) => void
  teacherName: string
  roleLabel?: string
  isLocked?: boolean
  config: any
  students: any[]
  entries: Record<string, PrimaryStudentEntry>
  searchKeyword?: string
  homeroomCoordination?: Record<string, any>
  onOpenCoordModal?: (student: any) => void
  onChangeScore: (studentId: string, colIndex: number, val: string) => void
  onChangeRating: (studentId: string, val: string) => void
  onChangeRemark: (studentId: string, val: string) => void
  onBulkUpdateEntries: (updater: (prev: Record<string, PrimaryStudentEntry>) => Record<string, PrimaryStudentEntry>) => void
  onOpenMultiSheetImport?: () => void
  onSave?: () => void
  saving?: boolean
  onToggleLock?: () => void
  togglingLock?: boolean
}

interface RemarkTemplateItem {
  id: string
  level: "T" | "H" | "C"
  text: string
  scope: "MINE" | "SUBJECT" | "GRADE"
  subjectMatch?: string
  gradeMatch?: number
}

const DEFAULT_PRIMARY_REMARK_TEMPLATES: RemarkTemplateItem[] = [
  // Tiếng Việt
  {
    id: "tv_t_1",
    level: "T",
    text: "Đọc to, rõ ràng, lưu loát; hiểu nội dung bài đọc và viết chữ đúng mẫu, trình bày sạch đẹp.",
    scope: "SUBJECT",
    subjectMatch: "tiếng việt",
  },
  {
    id: "tv_t_2",
    level: "T",
    text: "Nắm vững kiến thức Tiếng Việt, vốn từ phong phú, diễn đạt câu văn mạch lạc và giàu hình ảnh.",
    scope: "SUBJECT",
    subjectMatch: "tiếng việt",
  },
  {
    id: "tv_h_1",
    level: "H",
    text: "Đọc được bài văn, trả lời được câu hỏi tìm hiểu bài; cần rèn chữ viết đều nét và cẩn thận hơn.",
    scope: "SUBJECT",
    subjectMatch: "tiếng việt",
  },
  {
    id: "tv_h_2",
    level: "H",
    text: "Hoàn thành yêu cầu môn Tiếng Việt, cần luyện đọc diễn cảm và chú ý chính tả các âm vần dễ lẫn.",
    scope: "SUBJECT",
    subjectMatch: "tiếng việt",
  },
  {
    id: "tv_c_1",
    level: "C",
    text: "Đọc còn chậm, viết còn sai chính tả; cần luyện đọc và rèn viết thường xuyên hơn ở lớp và ở nhà.",
    scope: "SUBJECT",
    subjectMatch: "tiếng việt",
  },

  // Toán
  {
    id: "toan_t_1",
    level: "T",
    text: "Nắm vững kiến thức toán học, thực hiện các phép tính nhanh, chính xác và vận dụng giải toán có lời văn tốt.",
    scope: "SUBJECT",
    subjectMatch: "toán",
  },
  {
    id: "toan_t_2",
    level: "T",
    text: "Tư duy toán học nhạy bén, trình bày bài giải rõ ràng, khoa học và tích cực phát biểu xây dựng bài.",
    scope: "SUBJECT",
    subjectMatch: "toán",
  },
  {
    id: "toan_h_1",
    level: "H",
    text: "Biết thực hiện các phép tính và giải bài toán cơ bản; cần tính toán cẩn thận hơn để tránh nhầm lẫn.",
    scope: "SUBJECT",
    subjectMatch: "toán",
  },
  {
    id: "toan_c_1",
    level: "C",
    text: "Kỹ năng tính toán còn chậm, lúng túng khi giải toán có lời văn; cần ôn tập thêm các phép tính cơ bản.",
    scope: "SUBJECT",
    subjectMatch: "toán",
  },

  // Tiếng Anh / Ngoại ngữ
  {
    id: "ta_t_1",
    level: "T",
    text: "Phát âm chuẩn, ghi nhớ từ vựng và mẫu câu tốt; tự tin giao tiếp và hoàn thành tốt các kỹ năng Nghe - Nói - Đọc - Viết.",
    scope: "SUBJECT",
    subjectMatch: "tiếng anh",
  },
  {
    id: "ta_h_1",
    level: "H",
    text: "Nắm được từ vựng và mẫu câu cơ bản trong chương trình; cần mạnh dạn luyện nói và phản xạ giao tiếp nhiều hơn.",
    scope: "SUBJECT",
    subjectMatch: "tiếng anh",
  },
  {
    id: "ta_c_1",
    level: "C",
    text: "Chưa nhớ từ vựng và mẫu câu cơ bản; cần ôn luyện từ mới và nghe băng thường xuyên hơn.",
    scope: "SUBJECT",
    subjectMatch: "tiếng anh",
  },

  // Tự nhiên & Xã hội / Khoa học / Lịch sử & Địa lí
  {
    id: "kh_t_1",
    level: "T",
    text: "Ham học hỏi, nắm vững kiến thức bài học và biết vận dụng tốt vào thực tiễn cuộc sống hằng ngày.",
    scope: "SUBJECT",
    subjectMatch: "khoa học",
  },
  {
    id: "kh_h_1",
    level: "H",
    text: "Nắm được nội dung bài học, có tham gia thảo luận nhóm; cần mạnh dạn chia sẻ ý kiến cá nhân hơn.",
    scope: "SUBJECT",
    subjectMatch: "khoa học",
  },

  // Theo khối (Khối 1-2 vs Khối 3-5)
  {
    id: "g12_t_1",
    level: "T",
    text: "Con ngoan, nề nếp học tập tốt, tiếp thu bài nhanh và hoàn thành tốt các nhiệm vụ học tập trên lớp.",
    scope: "GRADE",
    gradeMatch: 1,
  },
  {
    id: "g12_h_1",
    level: "H",
    text: "Con có cố gắng trong giờ học, hoàn thành bài tập được giao; cần tập trung hơn để làm bài nhanh hơn.",
    scope: "GRADE",
    gradeMatch: 1,
  },
  {
    id: "g12_c_1",
    level: "C",
    text: "Con còn chậm trong giờ học, cần rèn thêm thói quen tập trung và hoàn thành bài học đầy đủ.",
    scope: "GRADE",
    gradeMatch: 1,
  },
  {
    id: "g35_t_1",
    level: "T",
    text: "Chủ động, tích cực trong học tập, nắm vững kiến thức kỹ năng môn học và vận dụng hiệu quả.",
    scope: "GRADE",
    gradeMatch: 4,
  },
  {
    id: "g35_h_1",
    level: "H",
    text: "Nắm được kiến thức cơ bản của môn học, hoàn thành nhiệm vụ học tập; cần phát huy tính chủ động hơn.",
    scope: "GRADE",
    gradeMatch: 4,
  },
  {
    id: "g35_c_1",
    level: "C",
    text: "Chưa nắm vững kiến thức cơ bản của môn học, cần cố gắng ôn tập và rèn luyện thêm dưới sự hướng dẫn của giáo viên.",
    scope: "GRADE",
    gradeMatch: 4,
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

export function VnEduPrimaryGradebook({
  classObj,
  subjectObj,
  evaluationPeriod,
  onChangePeriod,
  teacherName,
  roleLabel = "Bạn có quyền nhập điểm",
  isLocked = false,
  config,
  students,
  entries,
  searchKeyword = "",
  homeroomCoordination = {},
  onOpenCoordModal,
  onChangeScore,
  onChangeRating,
  onChangeRemark,
  onBulkUpdateEntries,
  onOpenMultiSheetImport,
  onSave,
  saving = false,
  onToggleLock,
  togglingLock = false,
}: VnEduPrimaryGradebookProps) {
  const periodMeta = useMemo(() => getPrimaryPeriodMeta(evaluationPeriod), [evaluationPeriod])
  const gradeNum = useMemo(
    () => extractGradeNumber(classObj?.grade || classObj?.className) || 1,
    [classObj]
  )

  // Determine if this Primary subject + period has a KT column
  const configHasKtColumn = useMemo(() => {
    if (config && typeof config.columnCount === "number") {
      if (config.isPrimaryVnEduDefault) {
        return config.columnCount > 0
      }
      // If config is an explicit VNEDU config saved in DB
      if (config.configType === "VNEDU") {
        return config.columnCount > 0
      }
    }
    return shouldPrimarySubjectHaveKtColumn(subjectObj?.subjectName || subjectObj?.subjectCode, classObj?.grade || classObj?.className, evaluationPeriod)
  }, [config, subjectObj, classObj, evaluationPeriod])

  const [overrideShowKt, setOverrideShowKt] = useState<boolean | null>(null)
  useEffect(() => {
    setOverrideShowKt(null)
  }, [classObj?.id, subjectObj?.id, evaluationPeriod, configHasKtColumn])

  const hasKtColumn = overrideShowKt !== null ? overrideShowKt : configHasKtColumn

  // vnEdu toolbar states
  const [filterMine, setFilterMine] = useState(true)
  const [filterSubject, setFilterSubject] = useState(true)
  const [filterGrade, setFilterGrade] = useState(true)
  const [stripTrailingComma, setStripTrailingComma] = useState(true)
  const [showSubmittedBadges, setShowSubmittedBadges] = useState(false)
  const [showStudentCodes, setShowStudentCodes] = useState(false)

  // Custom teacher remark templates in localStorage
  const [myTemplates, setMyTemplates] = useState<RemarkTemplateItem[]>([
    {
      id: "mine_t_1",
      level: "T",
      text: "Nắm vững kiến thức, kỹ năng môn học; tích cực phát biểu và hoàn thành tốt các bài tập.",
      scope: "MINE",
    },
    {
      id: "mine_h_1",
      level: "H",
      text: "Hoàn thành nội dung bài học, nắm được kiến thức cơ bản; cần rèn tính cẩn thận khi làm bài.",
      scope: "MINE",
    },
    {
      id: "mine_c_1",
      level: "C",
      text: "Cần cố gắng tập trung hơn trong giờ học và ôn luyện thêm kiến thức cơ bản của môn học.",
      scope: "MINE",
    },
  ])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ssm_vnedu_primary_my_remarks")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMyTemplates(parsed)
        }
      }
    } catch {}
  }, [])

  const saveMyTemplates = (next: RemarkTemplateItem[]) => {
    setMyTemplates(next)
    try {
      localStorage.setItem("ssm_vnedu_primary_my_remarks", JSON.stringify(next))
    } catch {}
  }

  // Active student for Quick Remark Popover (when double-clicking a remark cell or clicking "Mẫu")
  const [activeRemarkStudentId, setActiveRemarkStudentId] = useState<string | null>(null)
  const [activeRemarkTab, setActiveRemarkTab] = useState<"T" | "H" | "C">("T")

  // Modals
  const [isByRatingModalOpen, setIsByRatingModalOpen] = useState(false)
  const [ratingTemplatesForm, setRatingTemplatesForm] = useState({
    T: "Nắm vững kiến thức, kỹ năng môn học; tích cực phát biểu và hoàn thành tốt các nhiệm vụ học tập.",
    H: "Nắm được kiến thức cơ bản, hoàn thành yêu cầu bài học; cần rèn tính cẩn thận hơn.",
    C: "Chưa nắm vững kiến thức cơ bản; cần tập trung hơn trong giờ học và rèn luyện thêm.",
    onlyEmpty: false,
  })

  const [isByScoreModalOpen, setIsByScoreModalOpen] = useState(false)
  const [scoreTemplatesForm, setScoreTemplatesForm] = useState({
    range9_10: "Nắm vững kiến thức và kỹ năng môn học, làm bài kiểm tra chính xác, trình bày sạch đẹp.",
    range7_8: "Hiểu bài, nắm được kiến thức cơ bản và vận dụng làm bài khá tốt; cần rèn tính cẩn thận hơn.",
    range5_6: "Đạt yêu cầu cơ bản của môn học; cần ôn tập kỹ hơn các nội dung đã học để đạt kết quả cao hơn.",
    rangeUnder5: "Chưa nắm vững kiến thức cơ bản của môn học; cần được hướng dẫn và rèn luyện thêm thường xuyên.",
    autoSetXl: true,
    onlyEmpty: false,
  })

  // Double-click XL header modal (Nhấp đúp chuột vào tiêu đề cột XL để nhận xét/xếp loại cho tất cả)
  const [isBulkXlModalOpen, setIsBulkXlModalOpen] = useState(false)
  const [bulkXlForm, setBulkXlForm] = useState<{
    level: "T" | "H" | "C"
    alsoFillRemark: boolean
    remarkText: string
    onlyEmpty: boolean
  }>({
    level: "T",
    alsoFillRemark: true,
    remarkText: "Nắm vững kiến thức, kỹ năng môn học; tích cực phát biểu và hoàn thành tốt các nhiệm vụ học tập.",
    onlyEmpty: false,
  })

  // Manage remark bank modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [newTemplateLevel, setNewTemplateLevel] = useState<"T" | "H" | "C">("T")
  const [newTemplateText, setNewTemplateText] = useState("")

  // Filtered remark templates based on checkboxes: của tôi / của môn học / theo khối của lớp
  const availableTemplates = useMemo(() => {
    const subjNameNorm = String(subjectObj?.subjectName || "").toLowerCase()
    const list: RemarkTemplateItem[] = []
    if (filterMine) {
      list.push(...myTemplates)
    }
    if (filterSubject) {
      const matchedSubj = DEFAULT_PRIMARY_REMARK_TEMPLATES.filter(
        t => t.scope === "SUBJECT" && t.subjectMatch && subjNameNorm.includes(t.subjectMatch)
      )
      if (matchedSubj.length > 0) {
        list.push(...matchedSubj)
      } else {
        list.push(...DEFAULT_PRIMARY_REMARK_TEMPLATES.filter(t => t.scope === "SUBJECT").slice(0, 6))
      }
    }
    if (filterGrade) {
      const targetGroup = gradeNum <= 2 ? 1 : 4
      list.push(
        ...DEFAULT_PRIMARY_REMARK_TEMPLATES.filter(t => t.scope === "GRADE" && t.gradeMatch === targetGroup)
      )
    }
    return list
  }, [filterMine, filterSubject, filterGrade, myTemplates, subjectObj, gradeNum])

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

  // Get primary rating (XL) from entry (either ratingValue or componentScores.xl_gk1 / col_xl)
  const getStudentXl = (studentId: string): string => {
    const entry = entries[studentId]
    if (!entry) return ""
    if (entry.ratingValue) return entry.ratingValue
    const fromComp = entry.componentScores?.xl_gk1 || entry.componentScores?.xl_ck1 || entry.componentScores?.ratingValue || ""
    return fromComp
  }

  // Get primary KT score from entry
  const getStudentKt = (studentId: string): string => {
    const entry = entries[studentId]
    if (!entry) return ""
    const raw =
      entry.componentScores?.col0 ??
      entry.componentScores?.kt_gk1 ??
      entry.componentScores?.kt_ck1 ??
      entry.componentScores?.kt_gk2 ??
      entry.componentScores?.kt_ck2 ??
      ""
    return String(raw ?? "")
  }

  // Handle typing or shortcut in XL column
  const handleXlInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string, rowIdx: number) => {
    if (isLocked) return

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      const next = document.querySelector<HTMLInputElement>(`input[data-primary-xl-row="${rowIdx + 1}"]`)
      if (next) {
        next.focus()
        next.select()
      }
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = document.querySelector<HTMLInputElement>(`input[data-primary-xl-row="${rowIdx - 1}"]`)
      if (prev) {
        prev.focus()
        prev.select()
      }
      return
    }

    // Fast single-key entry: 2 / t / T -> T, 1 / h / H -> H, 0 / c / C -> C
    const k = e.key.toLowerCase()
    if (k === "2" || k === "t") {
      e.preventDefault()
      onChangeRating(studentId, "T")
      return
    }
    if (k === "1" || k === "h") {
      e.preventDefault()
      onChangeRating(studentId, "H")
      return
    }
    if (k === "0" || k === "c") {
      e.preventDefault()
      onChangeRating(studentId, "C")
      return
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault()
      onChangeRating(studentId, "")
      return
    }
  }

  const handleKtInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault()
      const next = document.querySelector<HTMLInputElement>(`input[data-primary-kt-row="${rowIdx + 1}"]`)
      if (next) {
        next.focus()
        next.select()
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const prev = document.querySelector<HTMLInputElement>(`input[data-primary-kt-row="${rowIdx - 1}"]`)
      if (prev) {
        prev.focus()
        prev.select()
      }
    }
  }

  const handleApplyTemplateToStudent = (studentId: string, tpl: RemarkTemplateItem) => {
    if (isLocked) return
    const cleaned = cleanRemarkTrailingComma(tpl.text, stripTrailingComma)
    onChangeRemark(studentId, cleaned)
    onChangeRating(studentId, tpl.level)
    setActiveRemarkStudentId(null)
  }

  // Batch fill remarks by XL (Nhập nhận xét theo xếp loại)
  const handleApplyRemarksByRating = () => {
    if (isLocked) return
    onBulkUpdateEntries(prev => {
      const next = { ...prev }
      students.forEach(st => {
        const cur = next[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        const xl = normalizePrimaryXlInput(cur.ratingValue || cur.componentScores?.xl_gk1 || "")
        if (!xl) return
        if (ratingTemplatesForm.onlyEmpty && cur.remark && cur.remark.trim() !== "") return

        let tpl = ""
        if (xl === "T") tpl = ratingTemplatesForm.T
        else if (xl === "H") tpl = ratingTemplatesForm.H
        else if (xl === "C") tpl = ratingTemplatesForm.C

        if (tpl) {
          next[st.id] = {
            ...cur,
            ratingValue: xl,
            remark: cleanRemarkTrailingComma(tpl.trim(), stripTrailingComma),
          }
        }
      })
      return next
    })
    setIsByRatingModalOpen(false)
  }

  // Batch fill remarks by KT score range (Nhập nhận xét theo khoảng điểm)
  const handleApplyRemarksByScore = () => {
    if (isLocked) return
    onBulkUpdateEntries(prev => {
      const next = { ...prev }
      students.forEach(st => {
        const cur = next[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        const ktStr = String(cur.componentScores?.col0 ?? "").trim().replace(",", ".")
        if (ktStr === "") return
        const ktNum = Number(ktStr)
        if (isNaN(ktNum)) return
        if (scoreTemplatesForm.onlyEmpty && cur.remark && cur.remark.trim() !== "") return

        let tpl = ""
        let suggestedXl = cur.ratingValue || ""
        if (ktNum >= 9.0) {
          tpl = scoreTemplatesForm.range9_10
          if (scoreTemplatesForm.autoSetXl) suggestedXl = "T"
        } else if (ktNum >= 7.0) {
          tpl = scoreTemplatesForm.range7_8
          if (scoreTemplatesForm.autoSetXl) suggestedXl = "T"
        } else if (ktNum >= 5.0) {
          tpl = scoreTemplatesForm.range5_6
          if (scoreTemplatesForm.autoSetXl) suggestedXl = "H"
        } else {
          tpl = scoreTemplatesForm.rangeUnder5
          if (scoreTemplatesForm.autoSetXl) suggestedXl = "C"
        }

        next[st.id] = {
          ...cur,
          ratingValue: suggestedXl,
          remark: cleanRemarkTrailingComma(tpl.trim(), stripTrailingComma),
        }
      })
      return next
    })
    setIsByScoreModalOpen(false)
  }

  // Double-click XL header batch fill for all students
  const handleApplyBulkXlAll = () => {
    if (isLocked) return
    onBulkUpdateEntries(prev => {
      const next = { ...prev }
      students.forEach(st => {
        const cur = next[st.id] || { componentScores: {}, compositeScore: "", ratingValue: "", remark: "" }
        const hasExistingXl = Boolean(cur.ratingValue && cur.ratingValue.trim() !== "")
        if (bulkXlForm.onlyEmpty && hasExistingXl) return

        const nextRemark =
          bulkXlForm.alsoFillRemark && bulkXlForm.remarkText.trim()
            ? bulkXlForm.onlyEmpty && cur.remark?.trim()
              ? cur.remark
              : cleanRemarkTrailingComma(bulkXlForm.remarkText.trim(), stripTrailingComma)
            : cur.remark

        next[st.id] = {
          ...cur,
          ratingValue: bulkXlForm.level,
          remark: nextRemark,
        }
      })
      return next
    })
    setIsBulkXlModalOpen(false)
  }

  // Primary TT27 Summary Stats
  const stats = useMemo(() => {
    let countT = 0
    let countH = 0
    let countC = 0
    let countRemark = 0
    let countKt = 0
    let sumKt = 0

    students.forEach(st => {
      const xl = normalizePrimaryXlInput(getStudentXl(st.id))
      if (xl === "T") countT++
      else if (xl === "H") countH++
      else if (xl === "C") countC++

      const rem = entries[st.id]?.remark?.trim()
      if (rem) countRemark++

      const ktStr = getStudentKt(st.id).trim().replace(",", ".")
      if (ktStr !== "") {
        const n = Number(ktStr)
        if (!isNaN(n)) {
          countKt++
          sumKt += n
        }
      }
    })

    return {
      total: students.length,
      countT,
      countH,
      countC,
      totalRated: countT + countH + countC,
      countRemark,
      countKt,
      avgKt: countKt > 0 ? (sumKt / countKt).toFixed(1) : "-",
    }
  }, [students, entries])

  return (
    <div className="space-y-3">
      {/* DÒNG 1: THANH CÔNG CỤ SỔ NHẬN XÉT CHUẨN VNEDU TIỂU HỌC */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {onChangePeriod && (
            <>
              {/* Bộ chọn Học kỳ nhanh: Học kỳ 1 | Học kỳ 2 */}
              <div className="inline-flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
                {[
                  { sem: 1 as const, label: "Học kỳ 1", targetPeriod: periodMeta.isMidterm ? "GK1" : "CK1" },
                  { sem: 2 as const, label: "Học kỳ 2", targetPeriod: periodMeta.isMidterm ? "GK2" : "CK2" },
                ].map((item) => (
                  <button
                    key={item.sem}
                    type="button"
                    onClick={() => onChangePeriod(item.targetPeriod)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                      periodMeta.semesterNumber === item.sem
                        ? "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="text-slate-300">|</span>
            </>
          )}

          <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#008B85]" />
            Danh mục nhận xét:
          </span>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterMine}
              onChange={(e) => setFilterMine(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A] focus:ring-[#008B85]"
            />
            <span>của tôi</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterSubject}
              onChange={(e) => setFilterSubject(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A] focus:ring-[#008B85]"
            />
            <span>của môn học</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700">
            <input
              type="checkbox"
              checked={filterGrade}
              onChange={(e) => setFilterGrade(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A] focus:ring-[#008B85]"
            />
            <span>theo khối của lớp</span>
          </label>

          <span className="text-slate-300">|</span>

          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={stripTrailingComma}
              onChange={(e) => setStripTrailingComma(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A] focus:ring-[#008B85]"
            />
            <span>Xóa dấu , ở cuối nội dung nhận xét</span>
          </label>
        </div>

        {/* Các nút chức năng bên phải giống vnEdu */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setIsByRatingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
            title="Tự động điền nhận xét theo mức xếp loại T / H / C"
          >
            <Wand2 className="w-3.5 h-3.5 text-[#008B85]" />
            Nhập nhận xét theo xếp loại
          </button>

          {hasKtColumn && (
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setIsByScoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 rounded-xl font-semibold transition-colors disabled:opacity-50"
              title="Tự động điền nhận xét và gợi ý xếp loại theo khoảng điểm KTĐK"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              Nhập nhận xét theo khoảng điểm
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] rounded-xl font-medium transition-colors"
            title="Quản lý kho câu nhận xét mẫu của tôi"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            Kho nhận xét ({availableTemplates.length})
          </button>

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
              title={`Lưu sổ điểm ${periodMeta.semesterLabel} (${periodMeta.periodShortLabel})`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />
              {saving ? "Đang lưu..." : `Lưu điểm HK${periodMeta.semesterNumber} (${periodMeta.periodCode})`}
            </button>
          )}

          {onToggleLock && (
            <button
              type="button"
              disabled={togglingLock}
              onClick={onToggleLock}
              title={isLocked ? "Mở khóa sổ điểm để cho phép chỉnh sửa" : "Khóa sổ điểm lớp và môn này"}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold border transition-colors disabled:opacity-50 ${
                isLocked
                  ? "bg-emerald-50 hover:bg-emerald-100 text-[#059669] border-emerald-200"
                  : "bg-rose-50 hover:bg-rose-100 text-[#E11D48] border-rose-200"
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {togglingLock ? "Đang xử lý..." : isLocked ? "Mở điểm" : "Khóa điểm"}
            </button>
          )}
        </div>
      </div>

      {/* DÒNG 2: DẢI THÔNG TIN SỔ ĐIỂM CHI TIẾT CHUẨN VNEDU */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold text-[#003B3A] tracking-tight">SỔ ĐIỂM CHI TIẾT</span>
          <span>
            Lớp: <strong className="text-slate-900 font-bold">{classObj?.className || "Chưa chọn"}</strong>
          </span>
          <span>
            Môn học:{" "}
            <strong className="text-slate-900 font-bold">
              {subjectObj?.subjectName || "Chưa chọn"} - {periodMeta.semesterLabel} ({periodMeta.periodShortLabel})
            </strong>
          </span>
          <span>
            Giáo viên dạy: <strong className="text-slate-900 font-bold">{teacherName || "Chưa phân công"}</strong>
            <span className="text-slate-500"> + 0 GV được ủy quyền</span>
          </span>
          <span>
            Quyền hạn:{" "}
            <strong className={isLocked ? "text-[#E11D48]" : "text-[#059669]"}>
              {isLocked ? "Sổ điểm đã khóa (Chỉ xem)" : roleLabel}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={showStudentCodes}
              onChange={(e) => setShowStudentCodes(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>Hiện cột Mã HS / vnEdu</span>
          </label>

          <label
            className="inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-[#003B3A] font-semibold bg-white px-2.5 py-1 rounded-lg border border-[#E2E8F0]"
            title="Bật/tắt cột Điểm kiểm tra định kỳ (KT) theo đặc thù môn/kỳ Tiểu học"
          >
            <input
              type="checkbox"
              checked={hasKtColumn}
              onChange={(e) => setOverrideShowKt(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A]"
            />
            <span>Có cột {periodMeta.ktColumnLabel}</span>
          </label>
        </div>
      </div>

      {/* DÒNG 3: BẢNG SỔ ĐIỂM CHI TIẾT TIỂU HỌC (SKY-LINE ACADEMIC LEDGER TABLE) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 w-12 text-center border-r border-white/15 text-white">STT</th>
                {showStudentCodes && (
                  <th className="py-3 px-3 w-32 border-r border-white/15 text-teal-100">Mã HS / vnEdu</th>
                )}
                <th colSpan={2} className="py-3 px-3 text-center border-r border-white/15 text-white min-w-[210px]">
                  Họ và tên
                </th>
                <th className="py-3 px-3 w-28 text-center border-r border-white/15 text-teal-100">Ngày sinh</th>
                <th className="py-3 px-4 text-center border-r border-white/15 text-white min-w-[360px]">
                  {periodMeta.remarkColumnLabel}
                </th>
                {hasKtColumn && (
                  <th className="py-2.5 px-2 w-20 text-center border-r border-white/15 text-[#5EEAD4]">
                    <div className="leading-tight">{periodMeta.ktColumnLabel.split(" ")[0]}</div>
                    <div className="leading-tight">{periodMeta.ktColumnLabel.split(" ").slice(1).join(" ")}</div>
                  </th>
                )}
                <th
                  onDoubleClick={() => {
                    if (!isLocked) setIsBulkXlModalOpen(true)
                  }}
                  title="Nhấp đúp chuột vào tiêu đề cột XL để xếp loại và nhận xét nhanh cho tất cả học sinh"
                  className="py-2.5 px-2 w-20 text-center text-[#5EEAD4] cursor-pointer select-none hover:bg-[#005B58] transition-colors"
                >
                  <div className="leading-tight">{periodMeta.xlColumnLabel.split(" ")[0]}</div>
                  <div className="leading-tight">{periodMeta.xlColumnLabel.split(" ").slice(1).join(" ")}</div>
                </th>
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
                const ktVal = getStudentKt(st.id)
                const xlVal = normalizePrimaryXlInput(getStudentXl(st.id))
                const remarkVal = entry.remark || ""
                const ktNum = Number(String(ktVal).replace(",", "."))
                const isKtInvalid = ktVal.trim() !== "" && (isNaN(ktNum) || ktNum < 0 || ktNum > 10)
                const isRemarkPickerOpen = activeRemarkStudentId === st.id

                return (
                  <tr key={st.id} className="transition-colors align-middle hover:bg-[#F8FAFC]">
                    {/* STT */}
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-600 border-r border-[#E2E8F0]">
                      {rowIdx + 1}
                    </td>

                    {/* Mã HS / vnEdu (Tuỳ chọn) */}
                    {showStudentCodes && (
                      <td className="py-2.5 px-3 border-r border-[#E2E8F0] font-mono text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">{st.studentCode}</div>
                        {st.vnEduCode && <div className="text-[#008B85]">{st.vnEduCode}</div>}
                      </td>
                    )}

                    {/* Họ và tên đệm */}
                    <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-100 min-w-[140px]">
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
                    <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-[#E2E8F0] w-24">
                      {firstName}
                    </td>

                    {/* Ngày sinh */}
                    <td className="py-2.5 px-3 text-center text-slate-700 border-r border-[#E2E8F0]">
                      {formatDob(st.dateOfBirth)}
                    </td>

                    {/* Nhận xét cuối kỳ / giữa kỳ (Đặt trước KT & XL đúng chuẩn vnEdu) */}
                    <td className="py-1.5 px-2 border-r border-[#E2E8F0] relative align-top">
                      {/* Dấu tam giác xanh góc trái trên giống vnEdu */}
                      <span
                        className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[6px] border-r-[6px] border-r-transparent pointer-events-none ${
                          remarkVal.trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                        }`}
                      />

                      <div className="relative">
                        <textarea
                          rows={2}
                          disabled={isLocked}
                          value={remarkVal}
                          onChange={(e) => onChangeRemark(st.id, e.target.value)}
                          onBlur={(e) => {
                            if (stripTrailingComma && e.target.value.trim().endsWith(",")) {
                              onChangeRemark(st.id, cleanRemarkTrailingComma(e.target.value, true))
                            }
                          }}
                          onDoubleClick={() => {
                            if (!isLocked) {
                              setActiveRemarkStudentId(st.id)
                              setActiveRemarkTab((xlVal as "T" | "H" | "C") || "T")
                            }
                          }}
                          placeholder="Nhập nhận xét hoặc nhấp đúp chuột để chọn từ danh mục nhận xét..."
                          className="w-full min-h-[44px] border border-slate-200 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85] rounded-lg px-2.5 py-1.5 pr-14 text-xs text-slate-800 outline-none resize-y bg-white leading-relaxed"
                        />

                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isRemarkPickerOpen) {
                                setActiveRemarkStudentId(null)
                              } else {
                                setActiveRemarkStudentId(st.id)
                                setActiveRemarkTab((xlVal as "T" | "H" | "C") || "T")
                              }
                            }}
                            className="absolute right-1.5 top-1.5 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#003B3A] border border-slate-200 text-[10px] font-semibold transition-colors"
                            title="Chọn nhanh từ Danh mục nhận xét"
                          >
                            Mẫu
                          </button>
                        )}

                        {showSubmittedBadges && remarkVal.trim() !== "" && (
                          <span className="absolute right-2 bottom-1.5 text-[10px] text-[#059669] font-semibold">
                            Đã lưu
                          </span>
                        )}
                      </div>

                      {/* Popover chọn nhanh Danh mục nhận xét (Nhấp đúp chuột vào các nhận xét T / H / C) */}
                      {isRemarkPickerOpen && (
                        <div className="mt-1.5 bg-white border border-[#003B3A]/20 rounded-xl shadow-lg p-3 space-y-2 z-20 relative">
                          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                            <div className="flex items-center gap-1">
                              {[
                                { code: "T" as const, label: "Hoàn thành tốt (T)", color: "text-[#059669]" },
                                { code: "H" as const, label: "Hoàn thành (H)", color: "text-[#003B3A]" },
                                { code: "C" as const, label: "Chưa hoàn thành (C)", color: "text-[#E11D48]" },
                              ].map(tab => (
                                <button
                                  key={tab.code}
                                  type="button"
                                  onClick={() => setActiveRemarkTab(tab.code)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                    activeRemarkTab === tab.code
                                      ? "bg-[#003B3A] text-white"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveRemarkStudentId(null)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                            {availableTemplates.filter(t => t.level === activeRemarkTab).length === 0 ? (
                              <div className="py-3 text-center text-slate-400 text-[11px]">
                                Không có mẫu nhận xét nào trong bộ lọc đang chọn.
                              </div>
                            ) : (
                              availableTemplates
                                .filter(t => t.level === activeRemarkTab)
                                .map(tpl => (
                                  <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => handleApplyTemplateToStudent(st.id, tpl)}
                                    onDoubleClick={() => handleApplyTemplateToStudent(st.id, tpl)}
                                    className="w-full text-left py-1.5 px-2 hover:bg-teal-50/70 rounded-lg text-xs text-slate-700 flex items-start justify-between gap-2 group"
                                  >
                                    <span>{tpl.text}</span>
                                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-teal-50 text-[#003B3A] font-semibold text-[10px] opacity-80 group-hover:opacity-100">
                                      Chọn → XL: {tpl.level}
                                    </span>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Cột KT (Điểm kiểm tra định kỳ thang 10 - nếu có) */}
                    {hasKtColumn && (
                      <td className="py-1.5 px-2 text-center border-r border-[#E2E8F0] relative align-middle">
                        <span
                          className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[6px] border-r-[6px] border-r-transparent pointer-events-none ${
                            ktVal.trim() !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                          }`}
                        />
                        <input
                          type="text"
                          disabled={isLocked}
                          data-primary-kt-row={rowIdx}
                          value={ktVal}
                          onChange={(e) => {
                            const val = e.target.value
                            onChangeScore(st.id, 0, val)
                            // Tự động gợi ý XL nếu học sinh chưa có XL và điểm hợp lệ
                            const num = Number(val.trim().replace(",", "."))
                            if (!isNaN(num) && val.trim() !== "" && num >= 0 && num <= 10 && !xlVal) {
                              if (num >= 7) onChangeRating(st.id, "T")
                              else if (num >= 5) onChangeRating(st.id, "H")
                              else onChangeRating(st.id, "C")
                            }
                          }}
                          onKeyDown={(e) => handleKtInputKeyDown(e, rowIdx)}
                          placeholder="-"
                          className={`w-14 text-center border rounded-lg py-1.5 text-xs font-bold outline-none transition-colors ${
                            isKtInvalid
                              ? "border-[#E11D48] bg-rose-50 text-[#E11D48]"
                              : ktVal.trim() !== "" && ktNum < 5
                              ? "border-rose-300 bg-rose-50/60 text-[#E11D48]"
                              : ktVal.trim() !== "" && ktNum >= 9
                              ? "border-emerald-300 bg-emerald-50/50 text-[#059669]"
                              : "border-slate-200 text-slate-900 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85]"
                          }`}
                        />
                      </td>
                    )}

                    {/* Cột XL (Mức đạt được: T / H / C) */}
                    <td className="py-1.5 px-2 text-center relative align-middle">
                      <span
                        className={`absolute top-0.5 left-0.5 w-0 h-0 border-t-[6px] border-r-[6px] border-r-transparent pointer-events-none ${
                          xlVal !== "" ? "border-t-[#059669]" : "border-t-emerald-500/40"
                        }`}
                      />
                      <input
                        type="text"
                        disabled={isLocked}
                        data-primary-xl-row={rowIdx}
                        value={xlVal}
                        onChange={(e) => {
                          const norm = normalizePrimaryXlInput(e.target.value)
                          if (norm === "" || norm === "T" || norm === "H" || norm === "C") {
                            onChangeRating(st.id, norm)
                          }
                        }}
                        onKeyDown={(e) => handleXlInputKeyDown(e, st.id, rowIdx)}
                        onDoubleClick={() => {
                          if (isLocked) return
                          const nextCycle = xlVal === "T" ? "H" : xlVal === "H" ? "C" : "T"
                          onChangeRating(st.id, nextCycle)
                        }}
                        placeholder="T/H/C"
                        title="Gõ 2 hoặc T -> T (Hoàn thành tốt) | Gõ 1 hoặc H -> H (Hoàn thành) | Gõ 0 hoặc C -> C (Chưa hoàn thành)"
                        className={`w-14 text-center border rounded-lg py-1.5 text-xs font-bold outline-none transition-colors ${
                          xlVal === "T"
                            ? "border-emerald-300 bg-emerald-50/70 text-[#059669]"
                            : xlVal === "H"
                            ? "border-teal-300 bg-teal-50/60 text-[#003B3A]"
                            : xlVal === "C"
                            ? "border-rose-300 bg-rose-50 text-[#E11D48]"
                            : "border-slate-200 text-slate-800 focus:border-[#008B85] focus:ring-1 focus:ring-[#008B85]"
                        }`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* DẢI HƯỚNG DẪN NHẬP NHANH CHUẨN VNEDU TIỂU HỌC */}
        <div className="bg-rose-50/70 border-t border-rose-200/80 px-4 py-2 text-[11px] text-[#E11D48] font-medium leading-relaxed">
          <strong>Cách nhập XL:</strong> Nhập số <strong>2</strong>, chữ <strong>t, T</strong> hoặc nhấp đúp chuột vào các nhận xét{" "}
          <strong>&quot;Hoàn Thành Tốt&quot;</strong>. Nhập số <strong>1</strong>, chữ <strong>h, H</strong> hoặc nhấp đúp chuột vào các nhận xét{" "}
          <strong>&quot;Hoàn Thành&quot;</strong>. Nhập số <strong>0</strong>, chữ <strong>c, C</strong> vào các nhận xét{" "}
          <strong>&quot;Chưa Hoàn Thành&quot;</strong>. Nhấp đúp chuột vào tiêu đề cột <strong>{periodMeta.xlColumnLabel}</strong> để nhận xét và xếp loại cho tất cả.
        </div>

        {/* DẢI THỐNG KÊ SỔ CÁI HỌC THUẬT TIỂU HỌC (TT27) */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums text-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Sĩ số: <strong className="text-slate-900">{stats.total}</strong> HS
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Hoàn thành tốt (T): <strong className="text-[#059669]">{stats.countT}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Hoàn thành (H): <strong className="text-[#003B3A]">{stats.countH}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Chưa hoàn thành (C): <strong className="text-[#E11D48]">{stats.countC}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Đã có nhận xét: <strong className="text-[#008B85]">{stats.countRemark}</strong>/{stats.total}
            </span>
            {hasKtColumn && (
              <>
                <span className="text-slate-300">•</span>
                <span>
                  Đã nhập {periodMeta.ktColumnLabel}: <strong className="text-slate-900">{stats.countKt}</strong>/{stats.total} (TB:{" "}
                  <strong className="text-[#003B3A]">{stats.avgKt}</strong>)
                </span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            Phím tắt: <strong>Enter / ↓ / ↑</strong> để nhảy dòng liên tiếp
          </div>
        </div>
      </div>

      {/* MODAL 1: NHẬP NHẬN XÉT THEO XẾP LOẠI (T / H / C) */}
      {isByRatingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#5EEAD4]" />
                <h4 className="text-sm font-bold">Nhập nhận xét theo xếp loại ({periodMeta.xlColumnLabel})</h4>
              </div>
              <button type="button" onClick={() => setIsByRatingModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Hệ thống sẽ tự động điền nội dung nhận xét cho học sinh dựa trên mức xếp loại <strong>T, H, C</strong> đã nhập tại cột{" "}
                <strong>{periodMeta.xlColumnLabel}</strong>.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-[#059669] mb-1">
                    Mức Hoàn thành tốt (T):
                  </label>
                  <textarea
                    rows={2}
                    value={ratingTemplatesForm.T}
                    onChange={(e) => setRatingTemplatesForm(prev => ({ ...prev, T: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2.5 text-xs outline-none focus:border-[#008B85]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#003B3A] mb-1">
                    Mức Hoàn thành (H):
                  </label>
                  <textarea
                    rows={2}
                    value={ratingTemplatesForm.H}
                    onChange={(e) => setRatingTemplatesForm(prev => ({ ...prev, H: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2.5 text-xs outline-none focus:border-[#008B85]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#E11D48] mb-1">
                    Mức Chưa hoàn thành (C):
                  </label>
                  <textarea
                    rows={2}
                    value={ratingTemplatesForm.C}
                    onChange={(e) => setRatingTemplatesForm(prev => ({ ...prev, C: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2.5 text-xs outline-none focus:border-[#008B85]"
                  />
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={ratingTemplatesForm.onlyEmpty}
                    onChange={(e) => setRatingTemplatesForm(prev => ({ ...prev, onlyEmpty: e.target.checked }))}
                  />
                  <span className="font-medium text-slate-700">Chỉ điền cho học sinh đang trống ô Nhận xét</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsByRatingModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyRemarksByRating}
                  className="px-4 py-2 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl font-semibold"
                >
                  Áp dụng nhận xét theo xếp loại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NHẬP NHẬN XÉT THEO KHOẢNG ĐIỂM KTĐK */}
      {isByScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5EEAD4]" />
                <h4 className="text-sm font-bold">Nhập nhận xét theo khoảng điểm ({periodMeta.ktColumnLabel})</h4>
              </div>
              <button type="button" onClick={() => setIsByScoreModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-[#059669] mb-1">Điểm từ 9.0 đến 10đ (Hoàn thành xuất sắc / Tốt):</label>
                  <textarea
                    rows={2}
                    value={scoreTemplatesForm.range9_10}
                    onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, range9_10: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#008B85] mb-1">Điểm từ 7.0 đến 8.9đ (Hoàn thành tốt):</label>
                  <textarea
                    rows={2}
                    value={scoreTemplatesForm.range7_8}
                    onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, range7_8: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#D97706] mb-1">Điểm từ 5.0 đến 6.9đ (Hoàn thành):</label>
                  <textarea
                    rows={2}
                    value={scoreTemplatesForm.range5_6}
                    onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, range5_6: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#E11D48] mb-1">Điểm dưới 5.0đ (Chưa hoàn thành):</label>
                  <textarea
                    rows={2}
                    value={scoreTemplatesForm.rangeUnder5}
                    onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, rangeUnder5: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreTemplatesForm.autoSetXl}
                      onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, autoSetXl: e.target.checked }))}
                    />
                    <span className="font-medium text-slate-700">
                      Đồng thời tự động điền cột {periodMeta.xlColumnLabel} (≥ 7đ → T; 5–6.9đ → H; &lt; 5đ → C)
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scoreTemplatesForm.onlyEmpty}
                      onChange={(e) => setScoreTemplatesForm(prev => ({ ...prev, onlyEmpty: e.target.checked }))}
                    />
                    <span className="font-medium text-slate-700">Chỉ điền cho học sinh đang trống ô Nhận xét</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsByScoreModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleApplyRemarksByScore}
                  className="px-4 py-2 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl font-semibold"
                >
                  Áp dụng cho cả lớp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NHẤP ĐÚP TIÊU ĐỀ CỘT XL ĐỂ XẾP LOẠI & NHẬN XÉT CHO TẤT CẢ */}
      {isBulkXlModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Xếp loại & Nhận xét nhanh cho tất cả ({periodMeta.xlColumnLabel})</h4>
              <button type="button" onClick={() => setIsBulkXlModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Chọn mức xếp loại áp dụng:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: "T" as const, title: "T - Hoàn thành tốt", defaultRem: ratingTemplatesForm.T },
                    { code: "H" as const, title: "H - Hoàn thành", defaultRem: ratingTemplatesForm.H },
                    { code: "C" as const, title: "C - Chưa hoàn thành", defaultRem: ratingTemplatesForm.C },
                  ].map(opt => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() =>
                        setBulkXlForm(prev => ({
                          ...prev,
                          level: opt.code,
                          remarkText: opt.defaultRem,
                        }))
                      }
                      className={`py-2 px-2.5 rounded-xl border font-semibold text-center transition-colors ${
                        bulkXlForm.level === opt.code
                          ? "bg-[#003B3A] text-white border-[#003B3A]"
                          : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50"
                      }`}
                    >
                      {opt.title}
                    </button>
                  ))}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkXlForm.alsoFillRemark}
                  onChange={(e) => setBulkXlForm(prev => ({ ...prev, alsoFillRemark: e.target.checked }))}
                />
                <span className="font-semibold text-slate-800">Điền kèm nội dung nhận xét tương ứng</span>
              </label>

              {bulkXlForm.alsoFillRemark && (
                <div>
                  <textarea
                    rows={3}
                    value={bulkXlForm.remarkText}
                    onChange={(e) => setBulkXlForm(prev => ({ ...prev, remarkText: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl p-2.5 text-xs"
                  />
                </div>
              )}

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkXlForm.onlyEmpty}
                  onChange={(e) => setBulkXlForm(prev => ({ ...prev, onlyEmpty: e.target.checked }))}
                />
                <span className="font-medium text-slate-700">Chỉ áp dụng cho học sinh chưa có xếp loại</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsBulkXlModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkXlAll}
                  className="px-4 py-2 bg-[#003B3A] hover:bg-[#002B2A] text-white rounded-xl font-semibold"
                >
                  Áp dụng cho tất cả
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: QUẢN LÝ KHO NHẬN XÉT CỦA TÔI */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Danh mục nhận xét cá nhân (&quot;của tôi&quot;)</h4>
              <button type="button" onClick={() => setIsBankModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2.5">
                <div className="font-semibold text-slate-800">Thêm câu nhận xét mới vào danh mục &quot;của tôi&quot;:</div>
                <div className="flex items-center gap-2">
                  <select
                    value={newTemplateLevel}
                    onChange={(e) => setNewTemplateLevel(e.target.value as "T" | "H" | "C")}
                    className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white font-semibold"
                  >
                    <option value="T">Mức T (Hoàn thành tốt)</option>
                    <option value="H">Mức H (Hoàn thành)</option>
                    <option value="C">Mức C (Chưa hoàn thành)</option>
                  </select>
                  <input
                    type="text"
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    placeholder="Nhập câu nhận xét mẫu..."
                    className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-1.5 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTemplateText.trim()) return
                      const next: RemarkTemplateItem[] = [
                        ...myTemplates,
                        {
                          id: `mine_${Date.now()}`,
                          level: newTemplateLevel,
                          text: newTemplateText.trim(),
                          scope: "MINE",
                        },
                      ]
                      saveMyTemplates(next)
                      setNewTemplateText("")
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003B3A] text-white rounded-lg font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-700">Danh sách nhận xét của tôi ({myTemplates.length}):</div>
                <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                  {myTemplates.map(item => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 bg-white hover:bg-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            item.level === "T"
                              ? "bg-emerald-50 text-[#059669]"
                              : item.level === "H"
                              ? "bg-teal-50 text-[#003B3A]"
                              : "bg-rose-50 text-[#E11D48]"
                          }`}
                        >
                          {item.level}
                        </span>
                        <span className="text-slate-800">{item.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => saveMyTemplates(myTemplates.filter(x => x.id !== item.id))}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
