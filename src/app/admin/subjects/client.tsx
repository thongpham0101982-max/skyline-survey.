"use client"
import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays,
  BookOpen, Layers, Search, Award, MessageSquare,
  CheckSquare, SlidersHorizontal, GitBranch, RotateCcw,
  Tag, Copy, Check, ExternalLink, Eye, EyeOff
} from "lucide-react"
import {
  createSubject,
  updateSubject,
  deleteSubject,
  deleteMultipleSubjects,
  bulkUpdateSubjects,
  toggleKsdvTagForSubjects,
  toggleSubjectTimetableAction
} from "./actions"
import { SYSTEM_SUBJECTS } from "@/lib/subject-mapping"
import {
  parseTeacherSplitJson,
  serializeTeacherSplitJson
} from "@/lib/timetable/teacherGroupHelper"
import { applyQd82CurriculumStandardAction } from "@/app/admin/thoi-khoa-bieu/actions"

const DEFAULT_QUOTA = {
  quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0,
  quotaG1: 0, quotaG2: 0, quotaG3: 0, quotaG4: 0, quotaG5: 0,
  quotaG6: 0, quotaG7: 0, quotaG8: 0, quotaG9: 0,
  quotaG10: 0, quotaG11: 0, quotaG12: 0,
  quotaG10TN: null as number | null,
  quotaG10XH: null as number | null,
  quotaG11TN: null as number | null,
  quotaG11XH: null as number | null,
  quotaG12TN: null as number | null,
  quotaG12XH: null as number | null,
  specialNoteFlags: "",
  teacherSplitJson: ""
}

type QuotaSlotKey =
  | "G1" | "G2" | "G3" | "G4" | "G5"
  | "G6" | "G7" | "G8" | "G9"
  | "G10TN" | "G10XH" | "G11TN" | "G11XH" | "G12TN" | "G12XH"

interface QuotaColumnDef {
  key: QuotaSlotKey
  field: string
  legacyField?: string
  shortLabel: string
  fullLabel: string
  gradeNum: number
  track?: "TN" | "XH"
  levelGroup: "PRIMARY" | "MIDDLE" | "HIGH"
}

const PRIMARY_QUOTA_COLS: QuotaColumnDef[] = [1, 2, 3, 4, 5].map(g => ({
  key: `G${g}` as QuotaSlotKey,
  field: `quotaG${g}`,
  shortLabel: `K${g}`,
  fullLabel: `Khối ${g}`,
  gradeNum: g,
  levelGroup: "PRIMARY"
}))

const MIDDLE_QUOTA_COLS: QuotaColumnDef[] = [6, 7, 8, 9].map(g => ({
  key: `G${g}` as QuotaSlotKey,
  field: `quotaG${g}`,
  shortLabel: `K${g}`,
  fullLabel: `Khối ${g}`,
  gradeNum: g,
  levelGroup: "MIDDLE"
}))

const HIGH_QUOTA_COLS: QuotaColumnDef[] = [
  { key: "G10TN", field: "quotaG10TN", legacyField: "quotaG10", shortLabel: "10 TN", fullLabel: "10 TN", gradeNum: 10, track: "TN", levelGroup: "HIGH" },
  { key: "G10XH", field: "quotaG10XH", legacyField: "quotaG10", shortLabel: "10 XH", fullLabel: "10 XH", gradeNum: 10, track: "XH", levelGroup: "HIGH" },
  { key: "G11TN", field: "quotaG11TN", legacyField: "quotaG11", shortLabel: "11 TN", fullLabel: "11 TN", gradeNum: 11, track: "TN", levelGroup: "HIGH" },
  { key: "G11XH", field: "quotaG11XH", legacyField: "quotaG11", shortLabel: "11 XH", fullLabel: "11 XH", gradeNum: 11, track: "XH", levelGroup: "HIGH" },
  { key: "G12TN", field: "quotaG12TN", legacyField: "quotaG12", shortLabel: "12 TN", fullLabel: "12 TN", gradeNum: 12, track: "TN", levelGroup: "HIGH" },
  { key: "G12XH", field: "quotaG12XH", legacyField: "quotaG12", shortLabel: "12 XH", fullLabel: "12 XH", gradeNum: 12, track: "XH", levelGroup: "HIGH" }
]

const ALL_K12_QUOTA_COLS: QuotaColumnDef[] = [
  ...PRIMARY_QUOTA_COLS,
  ...MIDDLE_QUOTA_COLS,
  ...HIGH_QUOTA_COLS
]

export const EVALUATION_TYPES = [
  {
    id: "SCORE",
    label: "Môn học cho điểm",
    badgeLabel: "Cho điểm",
    circularRef: "TT 27 & TT 22",
    description: "Đánh giá bằng điểm số kết hợp nhận xét (thang điểm 10) theo Thông tư 27 (Tiểu học) & Thông tư 22 (THCS/THPT).",
    examples: "Toán, Ngữ văn, Tiếng Việt, Tiếng Anh, KHTN, Vật lí, Hóa học...",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-[#059669]",
    icon: Award
  },
  {
    id: "GRADE",
    label: "Môn học đánh giá mức đạt",
    badgeLabel: "Đánh giá",
    circularRef: "TT 27 & TT 22",
    description: "Đánh giá theo mức Đạt / Chưa đạt (hoặc Hoàn thành tốt / Hoàn thành / Chưa hoàn thành) kết hợp nhận xét.",
    examples: "Giáo dục thể chất, Âm nhạc, Mĩ thuật, HĐTN&HN, Môn đặc thù...",
    badgeClass: "bg-[#F0FDFA] text-[#00736E] border-teal-200",
    dotClass: "bg-[#00A19A]",
    icon: CheckSquare
  },
  {
    id: "COMMENT",
    label: "Môn học nhận xét định tính",
    badgeLabel: "Nhận xét",
    circularRef: "TT 27",
    description: "Đánh giá bằng nhận xét định tính về sự tiến bộ, phẩm chất và năng lực rèn luyện của học sinh.",
    examples: "Hoạt động rèn luyện, chuyên đề trải nghiệm định tính...",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-[#D97706]",
    icon: MessageSquare
  }
]

export const CURRICULUM_CATEGORIES_CONFIG = [
  {
    id: "MOET",
    label: "Chương trình Bộ GD&ĐT",
    shortLabel: "Theo Bộ GD&ĐT",
    icon: Award,
    desc: "Môn học bắt buộc và lựa chọn theo CTGDPT 2018",
    badgeClass: "bg-slate-100 text-[#003B3A] border-slate-200"
  },
  {
    id: "SKL",
    label: "Đặc thù Sky-Line",
    shortLabel: "Đặc thù Sky-Line",
    icon: Layers,
    desc: "Chương trình phát triển năng lực riêng của Hệ thống Sky-Line",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  {
    id: "BILINGUAL",
    label: "Song ngữ & Quốc tế",
    shortLabel: "Song ngữ",
    icon: SlidersHorizontal,
    desc: "Chương trình Cambridge, IELTS, SAT và hội nhập quốc tế",
    badgeClass: "bg-[#F0FDFA] text-[#00736E] border-teal-200"
  }
]

const STUDY_PROGRAMS = ["Hệ S", "Hệ I"]

const STUDY_PROGRAM_META: Record<
  string,
  { short: string; full: string; subtitle: string; badgeClass: string }
> = {
  "Hệ S": {
    short: "Hệ S",
    full: "Hệ S (Hội nhập Sky-Line)",
    subtitle: "Áp dụng cho khối lớp Hội nhập Sky-Line (HNS, MNS)",
    badgeClass: "bg-[#F0FDFA] text-[#003B3A] border-teal-200"
  },
  "Hệ I": {
    short: "Hệ I",
    full: "Hệ I (Song bằng & Quốc tế)",
    subtitle: "Gộp Hệ Song Bằng (SB) và Hệ S Quốc tế (HNG, MNG)",
    badgeClass: "bg-emerald-50 text-[#059669] border-emerald-200"
  }
}

function normalizeProgramToken(raw?: string | null): string {
  const clean = String(raw || "").trim()
  if (!clean) return ""
  if (clean === "Hệ S" || clean.toUpperCase() === "HNS" || clean.toUpperCase() === "HE_S") {
    return "Hệ S"
  }
  if (
    clean === "Hệ I" ||
    clean === "Hệ Song Bằng" ||
    clean === "Hệ S Quốc tế" ||
    clean.toUpperCase() === "HNG" ||
    clean.toUpperCase() === "SB" ||
    clean.toUpperCase() === "HE_I"
  ) {
    return "Hệ I"
  }
  return clean
}

function parseSubjectPrograms(studyPrograms?: string | null): string[] {
  if (!studyPrograms) return []
  const seen = new Set<string>()
  studyPrograms
    .split(",")
    .map(p => normalizeProgramToken(p))
    .filter(Boolean)
    .forEach(p => seen.add(p))
  const ordered: string[] = []
  STUDY_PROGRAMS.forEach(sp => {
    if (seen.has(sp)) ordered.push(sp)
  })
  seen.forEach(p => {
    if (!ordered.includes(p)) ordered.push(p)
  })
  return ordered
}

function getSlotSplitEntry(
  quota: any,
  col: QuotaColumnDef
): { gvvn: number; gvnn: number } | null {
  if (!quota?.teacherSplitJson) return null
  const map = parseTeacherSplitJson(quota.teacherSplitJson)
  const entry =
    map[col.field] ||
    (col.legacyField ? map[col.legacyField] : undefined) ||
    map[col.key]
  if (!entry || (entry.gvvn <= 0 && entry.gvnn <= 0)) return null
  return entry
}

function getDiffSlotKeysBetweenQuotas(
  qA: any,
  qB: any,
  cols: QuotaColumnDef[]
): Set<QuotaSlotKey> {
  const diffs = new Set<QuotaSlotKey>()
  cols.forEach(col => {
    const valA = getSlotNumericValue(qA, col)
    const valB = getSlotNumericValue(qB, col)
    const starA = valA > 0 && hasSlotStar(qA, col.key)
    const starB = valB > 0 && hasSlotStar(qB, col.key)
    const splitA = getSlotSplitEntry(qA, col)
    const splitB = getSlotSplitEntry(qB, col)
    const splitDiff =
      (splitA?.gvvn || 0) !== (splitB?.gvvn || 0) ||
      (splitA?.gvnn || 0) !== (splitB?.gvnn || 0)
    if (valA !== valB || starA !== starB || splitDiff) {
      diffs.add(col.key)
    }
  })
  return diffs
}

type ViewMode = "K12_MATRIX" | "PRIMARY" | "MIDDLE" | "HIGH" | "SPLIT_LEVELS"

const LEVEL_META: Record<string, { short: string; full: string; grades: number[] }> = {
  PRIMARY: { short: "Tiểu học", full: "Bậc Tiểu học (Khối 1–5)", grades: [1, 2, 3, 4, 5] },
  MIDDLE: { short: "THCS", full: "Bậc THCS (Khối 6–9)", grades: [6, 7, 8, 9] },
  HIGH: { short: "THPT", full: "Bậc THPT (10–12 TN/XH)", grades: [10, 11, 12] }
}

function roundQuota(val: number): number {
  return Math.round((val || 0) * 100) / 100
}

function getSlotNumericValue(quota: any, col: QuotaColumnDef): number {
  if (!quota) return 0
  const raw = quota[col.field]
  if (raw !== null && raw !== undefined && raw !== "") {
    return Number(raw) || 0
  }
  if (col.legacyField) {
    return Number(quota[col.legacyField]) || 0
  }
  return 0
}

function sumQuotaColumns(quota: any, cols: QuotaColumnDef[]): number {
  if (!quota) return 0
  return roundQuota(cols.reduce((acc, col) => acc + getSlotNumericValue(quota, col), 0))
}

function parseStarFlags(flagsStr?: string | null): Set<string> {
  if (!flagsStr) return new Set()
  return new Set(
    String(flagsStr)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  )
}

function serializeStarFlags(set: Set<string>): string {
  return Array.from(set).filter(Boolean).join(",")
}

function hasSlotStar(quota: any, slotKey: QuotaSlotKey): boolean {
  if (!quota?.specialNoteFlags) return false
  return parseStarFlags(quota.specialNoteFlags).has(slotKey)
}

function hydrateEditableQuota(rawQuota?: any) {
  const resolveTrack = (trackVal: any, legacyVal: any) =>
    trackVal !== null && trackVal !== undefined ? Number(trackVal) || 0 : Number(legacyVal) || 0

  const g10 = Number(rawQuota?.quotaG10) || 0
  const g11 = Number(rawQuota?.quotaG11) || 0
  const g12 = Number(rawQuota?.quotaG12) || 0

  return {
    quotaPrimary: Number(rawQuota?.quotaPrimary) || 0,
    quotaMiddle: Number(rawQuota?.quotaMiddle) || 0,
    quotaHigh: Number(rawQuota?.quotaHigh) || 0,
    quotaG1: Number(rawQuota?.quotaG1) || 0,
    quotaG2: Number(rawQuota?.quotaG2) || 0,
    quotaG3: Number(rawQuota?.quotaG3) || 0,
    quotaG4: Number(rawQuota?.quotaG4) || 0,
    quotaG5: Number(rawQuota?.quotaG5) || 0,
    quotaG6: Number(rawQuota?.quotaG6) || 0,
    quotaG7: Number(rawQuota?.quotaG7) || 0,
    quotaG8: Number(rawQuota?.quotaG8) || 0,
    quotaG9: Number(rawQuota?.quotaG9) || 0,
    quotaG10: g10,
    quotaG11: g11,
    quotaG12: g12,
    quotaG10TN: resolveTrack(rawQuota?.quotaG10TN, g10),
    quotaG10XH: resolveTrack(rawQuota?.quotaG10XH, g10),
    quotaG11TN: resolveTrack(rawQuota?.quotaG11TN, g11),
    quotaG11XH: resolveTrack(rawQuota?.quotaG11XH, g11),
    quotaG12TN: resolveTrack(rawQuota?.quotaG12TN, g12),
    quotaG12XH: resolveTrack(rawQuota?.quotaG12XH, g12),
    specialNoteFlags: typeof rawQuota?.specialNoteFlags === "string" ? rawQuota.specialNoteFlags : "",
    teacherSplitJson: typeof rawQuota?.teacherSplitJson === "string" ? rawQuota.teacherSplitJson : ""
  }
}

function recomputeQuotaAggregates(q: any) {
  const g10tn = Number(q.quotaG10TN) || 0
  const g10xh = Number(q.quotaG10XH) || 0
  const g11tn = Number(q.quotaG11TN) || 0
  const g11xh = Number(q.quotaG11XH) || 0
  const g12tn = Number(q.quotaG12TN) || 0
  const g12xh = Number(q.quotaG12XH) || 0

  q.quotaG10 = roundQuota(Math.max(g10tn, g10xh))
  q.quotaG11 = roundQuota(Math.max(g11tn, g11xh))
  q.quotaG12 = roundQuota(Math.max(g12tn, g12xh))

  q.quotaPrimary = roundQuota(
    (Number(q.quotaG1) || 0) +
      (Number(q.quotaG2) || 0) +
      (Number(q.quotaG3) || 0) +
      (Number(q.quotaG4) || 0) +
      (Number(q.quotaG5) || 0)
  )
  q.quotaMiddle = roundQuota(
    (Number(q.quotaG6) || 0) +
      (Number(q.quotaG7) || 0) +
      (Number(q.quotaG8) || 0) +
      (Number(q.quotaG9) || 0)
  )
  q.quotaHigh = roundQuota(g10tn + g10xh + g11tn + g11xh + g12tn + g12xh)
  return q
}

function subjectMatchesLevel(levelStr: string | null | undefined, targetLevel: "PRIMARY" | "MIDDLE" | "HIGH"): boolean {
  if (!levelStr || levelStr === "ALL") return true
  return levelStr.includes(targetLevel)
}

function parseCategoryTokens(cat?: string | null): string[] {
  const raw = (cat || "MOET").trim()
  if (!raw) return ["MOET"]
  return raw
    .split(",")
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p === "INTERNATIONAL" ? "BILINGUAL" : p))
}

/** Môn có gắn tag KSĐV (gồm cả tag riêng KSĐV và môn giảng dạy dùng chung như Tiếng Anh) */
function hasKsdvTag(cat?: string | null): boolean {
  return parseCategoryTokens(cat).includes("KSDV")
}

/** Môn chuyên biệt chỉ phục vụ KSĐV (VD: EPT, NLTD, TAv, TAvd) — ẩn khỏi bảng định mức tiết */
function isPureKsdvSubject(s: any): boolean {
  const tokens = parseCategoryTokens(s?.category)
  return tokens.length > 0 && tokens.every(t => t === "KSDV")
}

/** Lấy danh mục giảng dạy chính của môn học (MOET | SKL | BILINGUAL) */
function getPrimaryCurriculumCategory(cat?: string | null): string {
  const tokens = parseCategoryTokens(cat).filter(t => t !== "KSDV")
  return tokens[0] || "MOET"
}

/** Tổng hợp danh sách từ khóa / mã cột điểm KSĐV phục vụ map điểm cho 1 môn (Loại trừ hoàn toàn mã DG_* của ĐGNL) */
function getMappingKeywordsForSubject(s: any): string[] {
  const keywords = new Set<string>()
  const code = String(s?.subjectCode || "").trim()
  const isDgnlCode = (val: string) => /^DG_/i.test(val.trim())
  if (code) {
    const sysDef = SYSTEM_SUBJECTS.find(item => item.code.toLowerCase() === code.toLowerCase())
    if (sysDef) {
      ;(sysDef.assessmentCodes || []).forEach(ac => {
        if (!isDgnlCode(ac) && ac.toLowerCase() !== code.toLowerCase()) keywords.add(ac)
      })
      ;(sysDef.aliases || []).forEach(al => {
        if (!isDgnlCode(al) && al.toLowerCase() !== code.toLowerCase()) keywords.add(al)
      })
    }
  }
  if (Array.isArray(s?.aliases)) {
    s.aliases.forEach((alObj: any) => {
      const p = String(alObj?.aliasPattern || "").trim()
      if (p && !isDgnlCode(p) && p.toLowerCase() !== code.toLowerCase()) {
        keywords.add(p)
      }
    })
  }
  return Array.from(keywords)
}

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState<any[]>(initialSubjects || [])
  const safeYears = years || []
  const [selectedYearId, setSelectedYearId] = useState<string>(defaultYearId || safeYears[0]?.id || "")

  // View mode & filters (cho bảng chương trình giảng dạy)
  const [viewMode, setViewMode] = useState<ViewMode>("K12_MATRIX")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL_CATEGORIES")
  const [filterEvalType, setFilterEvalType] = useState("ALL_EVALS")
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS")
  const [filterParent, setFilterParent] = useState("ALL_RELATIONS")
  const [filterTimetable, setFilterTimetable] = useState<"ALL_TKB" | "SCHEDULABLE_ONLY" | "NON_SCHEDULABLE_ONLY">("ALL_TKB")
  const [compactSameQuota, setCompactSameQuota] = useState(true)
  const [togglingTimetableIds, setTogglingTimetableIds] = useState<Record<string, boolean>>({})
  const [applyingQd82, setApplyingQd82] = useState(false)

  // Trạng thái dải Tag KSĐV phục vụ map điểm
  const [showKsdvKeywords, setShowKsdvKeywords] = useState(false)
  const [highlightKsdvPanel, setHighlightKsdvPanel] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Selection for batch actions
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: "",
    code: "",
    name: "",
    levels: [] as string[],
    desc: "",
    studyPrograms: [] as string[],
    parentId: "",
    baseCategory: "MOET", // "MOET" | "SKL" | "BILINGUAL" | "KSDV" (KSDV = chỉ tạo tag riêng map điểm)
    attachKsdvTag: false, // gắn thêm tag KSĐV cho môn giảng dạy chung
    evaluationType: "SCORE",
    isTimetableSchedulable: true,
    quotasByProgram: {} as Record<string, typeof DEFAULT_QUOTA>
  })
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [showTeacherSplitEditor, setShowTeacherSplitEditor] = useState<boolean>(false)

  // Map toàn bộ môn theo ID để tra cứu quan hệ cha – con
  const subjectById = useMemo(() => {
    const map = new Map<string, any>()
    subjects.forEach((s: any) => map.set(s.id, s))
    return map
  }, [subjects])

  // Tách bạch: (1) Môn giảng dạy hiển thị trên bảng tiết & (2) Danh sách Tag KSĐV phục vụ map điểm
  const curriculumSubjects = useMemo(() => {
    return subjects.filter((s: any) => !isPureKsdvSubject(s))
  }, [subjects])

  const ksdvTagSubjects = useMemo(() => {
    const list = subjects.filter((s: any) => hasKsdvTag(s.category))
    // Ưu tiên hiển thị các tag KSĐV chuyên biệt trước (EPT, NLTD, TAv, TAvd), sau đó đến môn giảng dạy gắn kèm tag KSĐV (TA...)
    return [...list].sort((a, b) => {
      const aPure = isPureKsdvSubject(a) ? 0 : 1
      const bPure = isPureKsdvSubject(b) ? 0 : 1
      if (aPure !== bPure) return aPure - bPure
      return String(a.subjectCode || "").localeCompare(String(b.subjectCode || ""), "vi")
    })
  }, [subjects])

  // Số môn con trong bảng chương trình giảng dạy (không đếm nhầm các tag con KSĐV đã ẩn)
  const curriculumChildCountById = useMemo(() => {
    const counts = new Map<string, number>()
    curriculumSubjects.forEach((s: any) => {
      if (s.parentId) {
        counts.set(s.parentId, (counts.get(s.parentId) || 0) + 1)
      }
    })
    return counts
  }, [curriculumSubjects])

  // Các tag con KSĐV gắn vào môn cha giảng dạy (VD: TAv, TAvd thuộc TA)
  const ksdvSubTagsByParentId = useMemo(() => {
    const map = new Map<string, any[]>()
    subjects.forEach((s: any) => {
      if (s.parentId && isPureKsdvSubject(s)) {
        const arr = map.get(s.parentId) || []
        arr.push(s)
        map.set(s.parentId, arr)
      }
    })
    return map
  }, [subjects])

  const activeParentSubjects = useMemo(() => {
    return curriculumSubjects.filter((s: any) => (curriculumChildCountById.get(s.id) || 0) > 0)
  }, [curriculumSubjects, curriculumChildCountById])

  const resolveSubjectQuotaForProgram = (s: any, prog: string) => {
    const matched = s.quotas?.find((q: any) => {
      if (q.academicYearId !== selectedYearId) return false
      if (!q.studyProgram && prog === "DEFAULT") return true
      return normalizeProgramToken(q.studyProgram) === prog
    })
    return matched || { ...DEFAULT_QUOTA }
  }

  // Thống kê Sổ cái (chỉ tính trên các môn giảng dạy chính thức; Tag KSĐV tách riêng)
  const stats = useMemo(() => {
    const total = curriculumSubjects.length
    const subCount = curriculumSubjects.filter((s: any) => Boolean(s.parentId)).length
    const rootCount = total - subCount
    const scoreCount = curriculumSubjects.filter((s: any) => (s.evaluationType || "SCORE") === "SCORE").length
    const gradeCount = curriculumSubjects.filter((s: any) => s.evaluationType === "GRADE").length
    const commentCount = curriculumSubjects.filter((s: any) => s.evaluationType === "COMMENT").length

    const moet = curriculumSubjects.filter((s: any) => parseCategoryTokens(s.category).includes("MOET")).length
    const skl = curriculumSubjects.filter((s: any) => parseCategoryTokens(s.category).includes("SKL")).length
    const bilingual = curriculumSubjects.filter((s: any) => parseCategoryTokens(s.category).includes("BILINGUAL")).length
    const ksdvTags = ksdvTagSubjects.length
    const pureKsdvCount = subjects.length - curriculumSubjects.length
    const tkbSchedulableCount = curriculumSubjects.filter((s: any) => s.isTimetableSchedulable !== false).length
    const tkbExcludedCount = total - tkbSchedulableCount

    let heSCount = 0
    let heICount = 0
    let sharedBothCount = 0
    let onlyICount = 0
    let onlySCount = 0
    let diffQuotaCount = 0
    let unassignedCount = 0

    curriculumSubjects.forEach((s: any) => {
      const progs = parseSubjectPrograms(s.studyPrograms)
      const hasS = progs.includes("Hệ S")
      const hasI = progs.includes("Hệ I")
      if (hasS) heSCount++
      if (hasI) heICount++
      if (hasS && hasI) {
        sharedBothCount++
        const qS = s.quotas?.find((q: any) => q.academicYearId === selectedYearId && normalizeProgramToken(q.studyProgram) === "Hệ S") || DEFAULT_QUOTA
        const qI = s.quotas?.find((q: any) => q.academicYearId === selectedYearId && normalizeProgramToken(q.studyProgram) === "Hệ I") || DEFAULT_QUOTA
        if (getDiffSlotKeysBetweenQuotas(qS, qI, ALL_K12_QUOTA_COLS).size > 0) {
          diffQuotaCount++
        }
      } else if (hasI && !hasS) {
        onlyICount++
      } else if (hasS && !hasI) {
        onlySCount++
      } else {
        unassignedCount++
      }
    })

    return {
      total,
      rootCount,
      subCount,
      scoreCount,
      gradeCount,
      commentCount,
      moet,
      skl,
      bilingual,
      ksdvTags,
      pureKsdvCount,
      heSCount,
      heICount,
      sharedBothCount,
      onlyICount,
      onlySCount,
      diffQuotaCount,
      unassignedCount,
      tkbSchedulableCount,
      tkbExcludedCount
    }
  }, [curriculumSubjects, ksdvTagSubjects, subjects.length, selectedYearId])

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {})
    }
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode(prev => (prev === code ? null : prev))
    }, 1800)
  }

  const startEdit = (s?: any, defaultAsPureKsdvTag = false) => {
    setRawInputs({})
    if (s) {
      const pureKsdv = isPureKsdvSubject(s)
      const baseCat = pureKsdv ? "KSDV" : getPrimaryCurriculumCategory(s.category)
      const hasTag = !pureKsdv && hasKsdvTag(s.category)

      const parsedProgs = parseSubjectPrograms(s.studyPrograms)
      const cleanProgs = parsedProgs.length > 0 ? parsedProgs : ["Hệ S", "Hệ I"]
      const qByProg: Record<string, any> = {}
      const yearQuotas = (s.quotas || []).filter((q: any) => q.academicYearId === selectedYearId)
      const fallbackDonor = yearQuotas[0]
      cleanProgs.forEach((p: string) => {
        const found = yearQuotas.find(
          (q: any) =>
            normalizeProgramToken(q.studyProgram) === p || (!q.studyProgram && p === "DEFAULT")
        )
        qByProg[p] = hydrateEditableQuota(found || fallbackDonor)
      })
      const parsedLevels =
        !s.level || s.level === "ALL"
          ? ["PRIMARY", "MIDDLE", "HIGH"]
          : s.level.split(",").map((l: string) => l.trim()).filter(Boolean)

      setFormData({
        id: s.id,
        code: s.subjectCode,
        name: s.subjectName,
        levels: parsedLevels,
        desc: s.description || "",
        studyPrograms: pureKsdv
          ? []
          : cleanProgs.filter((p: string) => p !== "DEFAULT").length > 0
          ? cleanProgs.filter((p: string) => p !== "DEFAULT")
          : ["Hệ S", "Hệ I"],
        parentId: s.parentId || "",
        baseCategory: baseCat,
        attachKsdvTag: hasTag,
        evaluationType: s.evaluationType || "SCORE",
        isTimetableSchedulable: pureKsdv ? false : s.isTimetableSchedulable !== false,
        quotasByProgram: qByProg
      })
      const firstTab = cleanProgs.find((p: string) => p !== "DEFAULT") || "Hệ S"
      setActiveTab(pureKsdv ? "" : firstTab)
      const hasExistingSplit = Object.values(qByProg).some(
        (qItem: any) => Boolean(qItem?.teacherSplitJson && String(qItem.teacherSplitJson).trim())
      )
      setShowTeacherSplitEditor(
        hasExistingSplit || String(s.subjectCode || "").trim().toUpperCase() === "ESL"
      )
    } else {
      const initialProgs =
        filterProgram === "Hệ S"
          ? ["Hệ S"]
          : filterProgram === "Hệ I" || filterProgram === "ONLY_HE_I"
          ? ["Hệ I"]
          : ["Hệ S", "Hệ I"]
      const initialLevels =
        viewMode === "PRIMARY"
          ? ["PRIMARY"]
          : viewMode === "MIDDLE"
          ? ["MIDDLE"]
          : viewMode === "HIGH"
          ? ["HIGH"]
          : ["PRIMARY", "MIDDLE", "HIGH"]

      const initialQuotas: Record<string, typeof DEFAULT_QUOTA> = {}
      if (!defaultAsPureKsdvTag) {
        initialProgs.forEach(p => {
          initialQuotas[p] = hydrateEditableQuota()
        })
      }

      setFormData({
        id: "new",
        code: "",
        name: "",
        levels: initialLevels,
        desc: "",
        studyPrograms: defaultAsPureKsdvTag ? [] : initialProgs,
        parentId:
          filterParent !== "ALL_RELATIONS" &&
          filterParent !== "ROOT_ONLY" &&
          filterParent !== "CHILD_ONLY"
            ? filterParent
            : "",
        baseCategory: defaultAsPureKsdvTag
          ? "KSDV"
          : filterCategory !== "ALL_CATEGORIES"
          ? filterCategory
          : "MOET",
        attachKsdvTag: false,
        evaluationType: filterEvalType !== "ALL_EVALS" ? filterEvalType : "SCORE",
        isTimetableSchedulable: defaultAsPureKsdvTag
          ? false
          : filterTimetable === "NON_SCHEDULABLE_ONLY"
          ? false
          : true,
        quotasByProgram: initialQuotas
      })
      setActiveTab(defaultAsPureKsdvTag ? "" : initialProgs[0])
    }
    setIsModalOpen(true)
  }

  const cancelEdit = () => setIsModalOpen(false)

  const handleProgramToggle = (prog: string, checked: boolean) => {
    setFormData(prev => {
      const baseProgs = prev.studyPrograms.filter(p => p !== "DEFAULT")
      const nextSet = new Set(baseProgs)
      if (checked) nextSet.add(prog)
      else nextSet.delete(prog)
      const newProgs = STUDY_PROGRAMS.filter(sp => nextSet.has(sp))
      const newQuotas = { ...prev.quotasByProgram }
      if (checked && !newQuotas[prog]) {
        const donorProg = STUDY_PROGRAMS.find(sp => sp !== prog && newQuotas[sp])
        newQuotas[prog] = donorProg
          ? hydrateEditableQuota(newQuotas[donorProg])
          : hydrateEditableQuota()
      }
      return { ...prev, studyPrograms: newProgs, quotasByProgram: newQuotas }
    })
    if (checked && !formData.studyPrograms.includes(prog)) setActiveTab(prog)
    if (!checked && activeTab === prog) {
      const remaining = formData.studyPrograms.filter(p => p !== prog && p !== "DEFAULT")
      setActiveTab(remaining[0] || "")
    }
  }

  const copyQuotaBetweenPrograms = (fromProg: string, toProg: string) => {
    setFormData(prev => {
      const donor = prev.quotasByProgram[fromProg]
      if (!donor) return prev
      const cloned = recomputeQuotaAggregates(hydrateEditableQuota(donor))
      return {
        ...prev,
        quotasByProgram: {
          ...prev.quotasByProgram,
          [toProg]: cloned
        }
      }
    })
    setRawInputs(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${toProg}-`)) delete next[k]
      })
      return next
    })
  }

  const updateQuota = (field: string, val: number, targetProg?: string, starPatch?: { key: QuotaSlotKey; starred: boolean }) => {
    const progKey = targetProg || activeTab
    if (!progKey) return
    setFormData(prev => {
      const current = prev.quotasByProgram[progKey] || hydrateEditableQuota()
      const q: any = { ...current, [field]: val }
      if (starPatch) {
        const flags = parseStarFlags(q.specialNoteFlags)
        if (starPatch.starred && val > 0) flags.add(starPatch.key)
        else flags.delete(starPatch.key)
        q.specialNoteFlags = serializeStarFlags(flags)
      }
      recomputeQuotaAggregates(q)
      return { ...prev, quotasByProgram: { ...prev.quotasByProgram, [progKey]: q } }
    })
  }

  const toggleSlotStar = (col: QuotaColumnDef, targetProg?: string) => {
    const progKey = targetProg || activeTab
    if (!progKey) return
    setFormData(prev => {
      const current = prev.quotasByProgram[progKey] || hydrateEditableQuota()
      const currentVal = getSlotNumericValue(current, col)
      const flags = parseStarFlags(current.specialNoteFlags)
      const nextStarred = !flags.has(col.key)
      if (nextStarred) flags.add(col.key)
      else flags.delete(col.key)
      const q: any = {
        ...current,
        [col.field]: nextStarred && currentVal <= 0 ? 2 : currentVal,
        specialNoteFlags: serializeStarFlags(flags)
      }
      recomputeQuotaAggregates(q)
      return { ...prev, quotasByProgram: { ...prev.quotasByProgram, [progKey]: q } }
    })
    const inputKey = `${progKey}-${col.field}`
    setRawInputs(prev => {
      if (prev[inputKey] === undefined) return prev
      const next = { ...prev }
      delete next[inputKey]
      return next
    })
  }

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      alert("Vui lòng nhập đầy đủ Mã và Tên hiển thị.")
      return
    }
    setLoading(true)

    const isPureKsdv = formData.baseCategory === "KSDV"
    const finalCategory = isPureKsdv
      ? "KSDV"
      : formData.attachKsdvTag
      ? `${formData.baseCategory}, KSDV`
      : formData.baseCategory

    const cleanProgs = isPureKsdv ? [] : Array.from(new Set(formData.studyPrograms.filter(p => p && p !== "DEFAULT")))
    const quotasArr = cleanProgs.map(prog => {
      const baseQ: any = { ...(formData.quotasByProgram[prog] || { ...DEFAULT_QUOTA }) }
      // Flush any unblurred decimal / comma rawInputs for this program
      ALL_K12_QUOTA_COLS.forEach(col => {
        const rk = `${prog}-${col.field}`
        if (rawInputs[rk] !== undefined) {
          const rawStr = String(rawInputs[rk]).trim()
          const hasStar = rawStr.endsWith("*")
          const cleanNumStr = rawStr.replace(/\*/g, "").replace(/,/g, ".")
          const parsed = cleanNumStr === "" ? 0 : parseFloat(cleanNumStr)
          const finalVal = Number.isFinite(parsed) && parsed >= 0 ? roundQuota(parsed) : 0
          baseQ[col.field] = finalVal
          const flags = parseStarFlags(baseQ.specialNoteFlags)
          if (hasStar && finalVal > 0) flags.add(col.key)
          else if (rawStr !== "" && !hasStar) flags.delete(col.key)
          baseQ.specialNoteFlags = serializeStarFlags(flags)
        }
      })
      recomputeQuotaAggregates(baseQ)
      return {
        ...baseQ,
        academicYearId: selectedYearId,
        studyProgram: prog
      }
    })

    const levelPayload = isPureKsdv
      ? "ALL"
      : formData.levels.length === 0 || formData.levels.length === 3
      ? "PRIMARY, MIDDLE, HIGH"
      : formData.levels.join(", ")

    const pId = formData.parentId || null
    const progsStr = isPureKsdv ? "" : cleanProgs.join(", ")
    const evalPayload = isPureKsdv ? "SCORE" : formData.evaluationType
    const tkbSchedulablePayload = isPureKsdv ? false : Boolean(formData.isTimetableSchedulable)

    const res =
      formData.id === "new"
        ? await createSubject(
            formData.code.trim(),
            formData.name.trim(),
            levelPayload,
            formData.desc,
            undefined,
            progsStr,
            quotasArr,
            pId,
            finalCategory,
            evalPayload,
            tkbSchedulablePayload
          )
        : await updateSubject(
            formData.id,
            formData.code.trim(),
            formData.name.trim(),
            levelPayload,
            formData.desc,
            undefined,
            progsStr,
            quotasArr,
            pId,
            finalCategory,
            evalPayload,
            tkbSchedulablePayload
          )

    if (res.success) {
      window.location.reload()
    } else {
      alert("Không thể lưu thông tin: " + res.error)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string, isTagOnly = false) => {
    const label = isTagOnly ? `tag map điểm KSĐV "${name}"` : `môn học "${name}"`
    if (!confirm(`Xác nhận xóa ${label}? Thao tác này không thể hoàn tác.`)) return
    const res = await deleteSubject(id)
    if (res.success) {
      setSubjects(prev => prev.filter((s: any) => s.id !== id))
      setSelectedSubjectIds(prev => prev.filter(item => item !== id))
    } else {
      alert("Không thể xóa: " + res.error)
    }
  }

  const handleDetachKsdvFromSharedSubject = async (s: any) => {
    if (!confirm(`Gỡ tag map điểm KSĐV khỏi môn "${s.subjectName} (${s.subjectCode})"? Môn học vẫn giữ nguyên trong chương trình giảng dạy.`)) {
      return
    }
    setLoading(true)
    const res = await toggleKsdvTagForSubjects([s.id], false)
    if (res.success && res.updatedById?.[s.id]) {
      setSubjects(prev =>
        prev.map((item: any) =>
          item.id === s.id ? { ...item, category: res.updatedById![s.id] } : item
        )
      )
    } else if (!res.success) {
      alert("Không thể gỡ tag KSĐV: " + res.error)
    }
    setLoading(false)
  }

  const toggleSelectSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAllVisible = (visibleSubjectIds: string[]) => {
    const allSelected =
      visibleSubjectIds.length > 0 &&
      visibleSubjectIds.every(id => selectedSubjectIds.includes(id))
    if (allSelected) {
      setSelectedSubjectIds(prev => prev.filter(id => !visibleSubjectIds.includes(id)))
    } else {
      setSelectedSubjectIds(Array.from(new Set([...selectedSubjectIds, ...visibleSubjectIds])))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedSubjectIds.length === 0) return
    if (!confirm(`Xác nhận xóa ${selectedSubjectIds.length} môn học đã chọn?`)) return
    setLoading(true)
    const res = await deleteMultipleSubjects(selectedSubjectIds)
    if (res.success) {
      setSubjects(prev => prev.filter((s: any) => !selectedSubjectIds.includes(s.id)))
      setSelectedSubjectIds([])
    } else {
      alert("Không thể xóa hàng loạt: " + res.error)
    }
    setLoading(false)
  }

  const handleToggleTimetable = async (s: any) => {
    if (togglingTimetableIds[s.id]) return
    const prevVal = s.isTimetableSchedulable !== false
    const nextVal = !prevVal

    setTogglingTimetableIds(prev => ({ ...prev, [s.id]: true }))
    setSubjects(prev =>
      prev.map((item: any) =>
        item.id === s.id ? { ...item, isTimetableSchedulable: nextVal } : item
      )
    )

    const res = await toggleSubjectTimetableAction(s.id, nextVal)
    if (!res.success) {
      setSubjects(prev =>
        prev.map((item: any) =>
          item.id === s.id ? { ...item, isTimetableSchedulable: prevVal } : item
        )
      )
      alert("Không thể cập nhật trạng thái chia Thời khóa biểu: " + res.error)
    }
    setTogglingTimetableIds(prev => {
      const next = { ...prev }
      delete next[s.id]
      return next
    })
  }

  const handleBulkUpdate = async (payload: {
    evaluationType?: string
    category?: string
    level?: string
    parentId?: string | null
    studyPrograms?: string
    isTimetableSchedulable?: boolean
  }) => {
    if (selectedSubjectIds.length === 0) return
    setLoading(true)
    const res = await bulkUpdateSubjects(selectedSubjectIds, {
      ...payload,
      academicYearId: selectedYearId
    })
    if (res.success) {
      if (payload.studyPrograms !== undefined) {
        window.location.reload()
        return
      }
      setSubjects(prev =>
        prev.map((s: any) =>
          selectedSubjectIds.includes(s.id)
            ? {
                ...s,
                ...(payload.evaluationType ? { evaluationType: payload.evaluationType } : {}),
                ...(payload.category ? { category: payload.category } : {}),
                ...(payload.level ? { level: payload.level } : {}),
                ...(payload.parentId !== undefined ? { parentId: payload.parentId } : {}),
                ...(typeof payload.isTimetableSchedulable === "boolean"
                  ? { isTimetableSchedulable: payload.isTimetableSchedulable }
                  : {})
              }
            : s
        )
      )
    } else {
      alert("Không thể cập nhật hàng loạt: " + res.error)
    }
    setLoading(false)
  }

  const handleBulkToggleKsdvTag = async (attach: boolean) => {
    if (selectedSubjectIds.length === 0) return
    setLoading(true)
    const res = await toggleKsdvTagForSubjects(selectedSubjectIds, attach)
    if (res.success && res.updatedById) {
      const updatedMap = res.updatedById
      setSubjects(prev =>
        prev.map((s: any) => (updatedMap[s.id] ? { ...s, category: updatedMap[s.id] } : s))
      )
    } else if (!res.success) {
      alert("Không thể cập nhật tag KSĐV: " + res.error)
    }
    setLoading(false)
  }

  // Lọc danh sách môn giảng dạy (tuyệt đối không đưa các môn chuyên biệt KSĐV vào bảng tiết)
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return curriculumSubjects.filter((s: any) => {
      const parentObj = s.parentId ? subjectById.get(s.parentId) || s.parentSubject : null
      const matchSearch =
        !q ||
        s.subjectCode.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q) ||
        (parentObj &&
          (parentObj.subjectCode?.toLowerCase().includes(q) ||
            parentObj.subjectName?.toLowerCase().includes(q)))

      const matchLevel =
        viewMode === "PRIMARY"
          ? subjectMatchesLevel(s.level, "PRIMARY")
          : viewMode === "MIDDLE"
          ? subjectMatchesLevel(s.level, "MIDDLE")
          : viewMode === "HIGH"
          ? subjectMatchesLevel(s.level, "HIGH")
          : true

      const progs = parseSubjectPrograms(s.studyPrograms)
      const normalizedProgs = progs.length > 0 ? progs : ["DEFAULT"]

      let matchProgram = true
      if (filterProgram === "ALL_PROGRAMS") {
        matchProgram = true
      } else if (filterProgram === "ONLY_HE_I") {
        matchProgram = normalizedProgs.includes("Hệ I") && !normalizedProgs.includes("Hệ S")
      } else if (filterProgram === "ONLY_HE_S") {
        matchProgram = normalizedProgs.includes("Hệ S") && !normalizedProgs.includes("Hệ I")
      } else if (filterProgram === "DIFF_S_I") {
        if (normalizedProgs.includes("Hệ S") && normalizedProgs.includes("Hệ I")) {
          const qS =
            s.quotas?.find(
              (qt: any) =>
                qt.academicYearId === selectedYearId &&
                normalizeProgramToken(qt.studyProgram) === "Hệ S"
            ) || DEFAULT_QUOTA
          const qI =
            s.quotas?.find(
              (qt: any) =>
                qt.academicYearId === selectedYearId &&
                normalizeProgramToken(qt.studyProgram) === "Hệ I"
            ) || DEFAULT_QUOTA
          matchProgram = getDiffSlotKeysBetweenQuotas(qS, qI, ALL_K12_QUOTA_COLS).size > 0
        } else {
          matchProgram = false
        }
      } else {
        matchProgram = normalizedProgs.includes(filterProgram)
      }

      const tokens = parseCategoryTokens(s.category)
      const matchCategory =
        filterCategory === "ALL_CATEGORIES" || tokens.includes(filterCategory)

      const matchEval =
        filterEvalType === "ALL_EVALS" || (s.evaluationType || "SCORE") === filterEvalType

      const matchParent =
        filterParent === "ALL_RELATIONS"
          ? true
          : filterParent === "ROOT_ONLY"
          ? !s.parentId
          : filterParent === "CHILD_ONLY"
          ? Boolean(s.parentId)
          : s.parentId === filterParent || s.id === filterParent

      const matchTimetable =
        filterTimetable === "ALL_TKB"
          ? true
          : filterTimetable === "SCHEDULABLE_ONLY"
          ? s.isTimetableSchedulable !== false
          : s.isTimetableSchedulable === false

      return (
        matchSearch &&
        matchLevel &&
        matchProgram &&
        matchCategory &&
        matchEval &&
        matchParent &&
        matchTimetable
      )
    })
  }, [
    curriculumSubjects,
    searchQuery,
    viewMode,
    filterProgram,
    filterCategory,
    filterEvalType,
    filterParent,
    filterTimetable,
    subjectById,
    selectedYearId
  ])

  // Sắp xếp cây Môn cha -> Môn con cho bảng chương trình giảng dạy
  const treeOrderedSubjects = useMemo(() => {
    const roots = filteredSubjects.filter((s: any) => !s.parentId)
    const children = filteredSubjects.filter((s: any) => Boolean(s.parentId))
    const ordered: any[] = []
    const placedIds = new Set<string>()

    roots.forEach((root: any) => {
      ordered.push(root)
      placedIds.add(root.id)
      children
        .filter((c: any) => c.parentId === root.id)
        .forEach((c: any) => {
          ordered.push(c)
          placedIds.add(c.id)
        })
    })

    children.forEach((c: any) => {
      if (!placedIds.has(c.id)) ordered.push(c)
    })

    return ordered
  }, [filteredSubjects])

  // Gom nhóm dòng theo Hệ đào tạo chuẩn (Hệ S, Hệ I) cho từng môn giảng dạy
  const buildSubjectGroups = (subjectList: any[]) => {
    return subjectList
      .map((s: any) => {
        const parsedProgs = parseSubjectPrograms(s.studyPrograms)
        const progs = parsedProgs.length > 0 ? parsedProgs : ["DEFAULT"]
        const visibleProgs = progs.filter((p: string) => {
          if (
            filterProgram === "ALL_PROGRAMS" ||
            filterProgram === "ONLY_HE_I" ||
            filterProgram === "ONLY_HE_S" ||
            filterProgram === "DIFF_S_I"
          ) {
            return true
          }
          return filterProgram === p
        })
        const programRows = visibleProgs.map((p: string) => ({
          program: p,
          quota: resolveSubjectQuotaForProgram(s, p)
        }))
        return { subject: s, programRows }
      })
      .filter(g => g.programRows.length > 0)
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    filterCategory !== "ALL_CATEGORIES" ||
    filterEvalType !== "ALL_EVALS" ||
    filterProgram !== "ALL_PROGRAMS" ||
    filterParent !== "ALL_RELATIONS" ||
    filterTimetable !== "ALL_TKB"

  const clearAllFilters = () => {
    setSearchQuery("")
    setFilterCategory("ALL_CATEGORIES")
    setFilterEvalType("ALL_EVALS")
    setFilterProgram("ALL_PROGRAMS")
    setFilterParent("ALL_RELATIONS")
    setFilterTimetable("ALL_TKB")
  }

  // Render helpers
  const renderCategoryBadges = (cat?: string) => {
    const tokens = parseCategoryTokens(cat)
    const currTokens = tokens.filter(t => t !== "KSDV")
    const isTaggedKsdv = tokens.includes("KSDV")

    return (
      <div className="flex flex-wrap items-center gap-1">
        {(currTokens.length > 0 ? currTokens : ["MOET"]).map(c => {
          const found =
            CURRICULUM_CATEGORIES_CONFIG.find(item => item.id === c) ||
            CURRICULUM_CATEGORIES_CONFIG[0]
          return (
            <span
              key={c}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${found.badgeClass}`}
            >
              {found.shortLabel}
            </span>
          )
        })}
        {isTaggedKsdv && (
          <span
            title="Môn học có gắn tag phục vụ đối chiếu & map điểm Khảo sát đầu vào"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200"
          >
            <Tag className="w-2.5 h-2.5 shrink-0" />
            <span>Map KSĐV</span>
          </span>
        )}
      </div>
    )
  }

  const renderLevelBadges = (levelStr?: string) => {
    if (!levelStr || levelStr === "ALL") {
      return (
        <span className="inline-flex items-center text-[11px] font-medium text-slate-500">
          Liên cấp K–12
        </span>
      )
    }
    const parts = levelStr.split(",").map(l => l.trim()).filter(Boolean)
    if (parts.length >= 3) {
      return (
        <span className="inline-flex items-center text-[11px] font-medium text-slate-500">
          Liên cấp K–12
        </span>
      )
    }
    const labels = parts.map(p => LEVEL_META[p]?.short || p).join(" · ")
    return <span className="inline-flex items-center text-[11px] font-medium text-slate-600">{labels}</span>
  }

  const renderParentCell = (s: any) => {
    if (s.parentId) {
      const parent = subjectById.get(s.parentId) || s.parentSubject
      if (parent) {
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#00736E] max-w-[180px]">
            <GitBranch className="w-3 h-3 shrink-0 text-[#00A19A]" />
            <span className="truncate font-semibold text-[11px]" title={`${parent.subjectName} (${parent.subjectCode})`}>
              {parent.subjectName} ({parent.subjectCode})
            </span>
          </div>
        )
      }
    }
    const childrenCount = curriculumChildCountById.get(s.id) || 0
    const ksdvSubTags = ksdvSubTagsByParentId.get(s.id) || []

    if (childrenCount > 0) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#003B3A] border border-slate-200 text-[11px] font-semibold tabular-nums">
            Môn cha ({childrenCount} môn con)
          </span>
          {ksdvSubTags.length > 0 && (
            <span className="text-[11px] text-[#D97706] font-medium tabular-nums">
              Tag con KSĐV: {ksdvSubTags.map((t: any) => t.subjectCode).join(", ")}
            </span>
          )}
        </div>
      )
    }

    if (ksdvSubTags.length > 0) {
      return (
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[11px] text-slate-400 font-medium">Môn độc lập</span>
          <span
            title="Các mã thành phần KSĐV dùng để map điểm thành phần vào môn này"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50/80 border border-amber-200/80 text-[#D97706] text-[10px] font-semibold font-mono tabular-nums"
          >
            ↳ {ksdvSubTags.map((t: any) => t.subjectCode).join(", ")}
          </span>
        </div>
      )
    }

    return <span className="text-[11px] text-slate-400 font-medium">Môn độc lập</span>
  }

  const renderEvalBadge = (evalType?: string) => {
    const type = EVALUATION_TYPES.find(t => t.id === (evalType || "SCORE")) || EVALUATION_TYPES[0]
    const IconComp = type.icon
    return (
      <span
        title={`${type.label} (${type.circularRef})`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${type.badgeClass}`}
      >
        <IconComp className="w-3 h-3 shrink-0" />
        <span>{type.badgeLabel}</span>
      </span>
    )
  }

  const renderProgramBadge = (prog: string) => {
    if (prog === "DEFAULT" || !prog) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
          Chưa phân hệ
        </span>
      )
    }
    if (prog === "Hệ S & Hệ I") {
      return (
        <span
          title="Áp dụng đồng nhất định mức tiết cho cả Hệ S (Hội nhập Sky-Line) và Hệ I (Song bằng & Quốc tế)"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#003B3A] border border-teal-300 whitespace-nowrap"
        >
          <span>Hệ S</span>
          <span className="text-[#00A19A] font-bold">&</span>
          <span className="text-[#059669]">Hệ I</span>
        </span>
      )
    }
    const meta = STUDY_PROGRAM_META[prog]
    const style = meta
      ? meta.badgeClass
      : "bg-slate-100 text-[#003B3A] border-slate-200"

    return (
      <span
        title={meta?.full || prog}
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${style}`}
      >
        {prog}
      </span>
    )
  }

  // Academic Ledger Table renderer
  const renderLedgerTable = (
    title: string,
    subtitle: string,
    groups: Array<{ subject: any; programRows: Array<{ program: string; quota: any }> }>,
    columns: QuotaColumnDef[],
    tableMode: "STANDARD" | "HIGH" | "K12_MATRIX" = "STANDARD"
  ) => {
    if (groups.length === 0) return null

    const isFullK12Matrix = tableMode === "K12_MATRIX"
    const isHighSchoolTable = tableMode === "HIGH"

    const visibleSubjectIds = groups.map(g => g.subject.id)
    const isAllVisibleSelected =
      visibleSubjectIds.length > 0 &&
      visibleSubjectIds.every(id => selectedSubjectIds.includes(id))

    const allFlatRows = groups.flatMap(g =>
      g.programRows.map(pr => ({ subject: g.subject, program: pr.program, quota: pr.quota }))
    )

    const hasAnyStarInTable = allFlatRows.some(r =>
      columns.some(col => getSlotNumericValue(r.quota, col) > 0 && hasSlotStar(r.quota, col.key))
    )

    const computeTotalsForRows = (rowsSubset: typeof allFlatRows) => {
      const byCol: Record<string, number> = {}
      columns.forEach(col => {
        byCol[col.key] = roundQuota(
          rowsSubset.reduce((sum, r) => sum + getSlotNumericValue(r.quota, col), 0)
        )
      })
      const grandTotal = roundQuota(Object.values(byCol).reduce((a, b) => a + b, 0))
      return { byCol, grandTotal }
    }

    const overallTotals = computeTotalsForRows(allFlatRows)

    const programBreakdown = STUDY_PROGRAMS.map(prog => {
      const subRows = allFlatRows.filter(r => r.program === prog)
      const totals = computeTotalsForRows(subRows)
      return { program: prog, count: subRows.length, ...totals }
    }).filter(item => item.count > 0)

    const displayGroups = groups.map(g => {
      const rowS = g.programRows.find(pr => pr.program === "Hệ S")
      const rowI = g.programRows.find(pr => pr.program === "Hệ I")
      const diffKeys =
        rowS && rowI
          ? getDiffSlotKeysBetweenQuotas(rowS.quota, rowI.quota, columns)
          : new Set<QuotaSlotKey>()

      if (
        compactSameQuota &&
        filterProgram === "ALL_PROGRAMS" &&
        g.programRows.length === 2 &&
        rowS &&
        rowI &&
        diffKeys.size === 0
      ) {
        return {
          subject: g.subject,
          programRows: [{ program: "Hệ S & Hệ I", quota: rowS.quota, diffKeys }]
        }
      }

      return {
        subject: g.subject,
        programRows: g.programRows.map(pr => ({ ...pr, diffKeys }))
      }
    })

    const hasDiffCellsInTable = displayGroups.some(g =>
      g.programRows.some(pr => pr.diffKeys.size > 0)
    )

    const getHeaderDividerClass = (col: QuotaColumnDef) => {
      if (isFullK12Matrix) {
        if (col.key === "G1" || col.key === "G6" || col.key === "G10TN") {
          return "border-l border-white/20"
        }
        if (col.key === "G11TN" || col.key === "G12TN") {
          return "border-l border-white/10"
        }
        return ""
      }
      if (isHighSchoolTable) {
        return col.track === "TN" ? "border-l border-white/20" : "border-l border-white/10"
      }
      return "border-l border-white/10"
    }

    const getBodyDividerClass = (col: QuotaColumnDef, inFooterStrong = false) => {
      if (isFullK12Matrix) {
        if (col.key === "G1" || col.key === "G6" || col.key === "G10TN") {
          return inFooterStrong ? "border-l border-teal-200" : "border-l border-[#E2E8F0]"
        }
        if (col.key === "G11TN" || col.key === "G12TN") {
          return inFooterStrong ? "border-l border-teal-200/60" : "border-l border-[#F1F5F9]"
        }
        return ""
      }
      if (isHighSchoolTable) {
        if (col.track === "TN") {
          return inFooterStrong ? "border-l border-teal-200" : "border-l border-[#E2E8F0]"
        }
        return inFooterStrong ? "border-l border-teal-200/50" : "border-l border-[#F1F5F9]"
      }
      return inFooterStrong ? "border-l border-teal-200/50" : "border-l border-[#F1F5F9]"
    }

    const schedulableInTableCount = groups.filter(
      g => g.subject.isTimetableSchedulable !== false
    ).length

    return (
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#003B3A] flex flex-wrap items-center gap-2">
              <span>{title}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 tabular-nums">
                {groups.length} môn học
              </span>
              <span
                title="Số môn đang được tick chọn để đưa vào phân bổ & xếp Thời khóa biểu"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 tabular-nums"
              >
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span>Chia TKB: {schedulableInTableCount}/{groups.length}</span>
              </span>
            </h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            {programBreakdown.length > 1 ? (
              <>
                <span className="text-slate-500 font-medium">Tổng tiết theo hệ:</span>
                {programBreakdown.map(pb => (
                  <span
                    key={pb.program}
                    title={STUDY_PROGRAM_META[pb.program]?.full || pb.program}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      pb.program === "Hệ S"
                        ? "bg-[#003B3A] text-white"
                        : "bg-[#00736E] text-white"
                    }`}
                  >
                    {pb.program}: {pb.grandTotal} tiết
                  </span>
                ))}
              </>
            ) : programBreakdown.length === 1 ? (
              <>
                <span className="text-slate-500 font-medium">
                  Tổng tiết {programBreakdown[0].program}:
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white font-semibold">
                  {programBreakdown[0].grandTotal} tiết
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-500 font-medium">Tổng phân bổ trên bảng:</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white font-semibold">
                  {overallTotals.grandTotal} tiết
                </span>
              </>
            )}
          </div>
        </div>

        {/* Chuẩn Giao diện Bảng dữ liệu Sky-Line Academic Ledger */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                {isFullK12Matrix ? (
                  <>
                    <tr className="text-[11px] font-semibold whitespace-nowrap border-b border-white/10">
                      <th rowSpan={2} className="py-2.5 px-3 w-9 text-center text-white align-middle">
                        <input
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={() => handleSelectAllVisible(visibleSubjectIds)}
                          className="w-3.5 h-3.5 rounded border-white/40 accent-[#00A19A] cursor-pointer"
                          title="Chọn tất cả môn trong bảng"
                        />
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-white min-w-[195px] align-middle">
                        Mã & tên môn học
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[135px] align-middle">
                        Bậc & danh mục
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[140px] align-middle">
                        Thuộc môn (Môn cha)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[120px] align-middle">
                        Hình thức (TT 27 & 22)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-2.5 text-center text-[#5EEAD4] min-w-[106px] align-middle">
                        Chia TKB
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[115px] align-middle">
                        Hệ đào tạo
                      </th>
                      <th colSpan={5} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/20 bg-white/5">
                        Bậc Tiểu học (Khối 1–5)
                      </th>
                      <th colSpan={4} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/20 bg-white/[0.02]">
                        Bậc THCS (Khối 6–9)
                      </th>
                      <th colSpan={6} className="py-1.5 px-2 text-center text-[#5EEAD4] border-l border-white/20 bg-white/5">
                        Bậc THPT (Tổ hợp TN & XH)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-center text-[#5EEAD4] border-l border-white/20 min-w-[110px] align-middle">
                        Tổng tiết theo khối
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-right text-white w-[76px] align-middle">
                        Thao tác
                      </th>
                    </tr>
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className={`py-2 px-1.5 text-center ${
                            col.track === "XH" ? "text-[#5EEAD4]" : "text-teal-100"
                          } ${col.levelGroup === "HIGH" ? "min-w-[46px]" : "min-w-[36px]"} ${getHeaderDividerClass(col)}`}
                        >
                          {col.shortLabel}
                        </th>
                      ))}
                    </tr>
                  </>
                ) : isHighSchoolTable ? (
                  <>
                    <tr className="text-[11px] font-semibold whitespace-nowrap border-b border-white/10">
                      <th rowSpan={2} className="py-2.5 px-3 w-9 text-center text-white align-middle">
                        <input
                          type="checkbox"
                          checked={isAllVisibleSelected}
                          onChange={() => handleSelectAllVisible(visibleSubjectIds)}
                          className="w-3.5 h-3.5 rounded border-white/40 accent-[#00A19A] cursor-pointer"
                          title="Chọn tất cả môn trong bảng"
                        />
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-white min-w-[205px] align-middle">
                        Mã & tên môn học
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[140px] align-middle">
                        Bậc & danh mục
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[150px] align-middle">
                        Thuộc môn (Môn cha)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[125px] align-middle">
                        Hình thức (TT 27 & 22)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-2.5 text-center text-[#5EEAD4] min-w-[108px] align-middle">
                        Chia TKB
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[115px] align-middle">
                        Hệ đào tạo
                      </th>
                      <th colSpan={2} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/20 bg-white/5">
                        Khối 10 (Tự nhiên · Xã hội)
                      </th>
                      <th colSpan={2} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/20 bg-white/[0.02]">
                        Khối 11 (Tự nhiên · Xã hội)
                      </th>
                      <th colSpan={2} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/20 bg-white/5">
                        Khối 12 (Tự nhiên · Xã hội)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-center text-[#5EEAD4] border-l border-white/20 min-w-[120px] align-middle">
                        Tổng tiết theo khối
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-right text-white w-[80px] align-middle">
                        Thao tác
                      </th>
                    </tr>
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className={`py-2 px-2.5 text-center min-w-[64px] ${
                            col.track === "XH" ? "text-[#5EEAD4]" : "text-teal-100"
                          } ${getHeaderDividerClass(col)}`}
                        >
                          {col.fullLabel}
                        </th>
                      ))}
                    </tr>
                  </>
                ) : (
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 w-9 text-center text-white">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={() => handleSelectAllVisible(visibleSubjectIds)}
                        className="w-3.5 h-3.5 rounded border-white/40 accent-[#00A19A] cursor-pointer"
                        title="Chọn tất cả môn trong bảng"
                      />
                    </th>
                    <th className="py-3 px-3 text-white min-w-[210px]">Mã & tên môn học</th>
                    <th className="py-3 px-3 text-teal-100 min-w-[145px]">Bậc & danh mục</th>
                    <th className="py-3 px-3 text-teal-100 min-w-[155px]">Thuộc môn (Môn cha)</th>
                    <th className="py-3 px-3 text-teal-100 min-w-[130px]">Hình thức (TT 27 & 22)</th>
                    <th className="py-3 px-2.5 text-center text-[#5EEAD4] min-w-[108px]">Chia TKB</th>
                    <th className="py-3 px-3 text-teal-100 min-w-[120px]">Hệ đào tạo</th>
                    {columns.map(col => (
                      <th key={col.key} className="py-3 px-2.5 text-center text-teal-100 min-w-[56px] border-l border-white/10">
                        {col.fullLabel}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center text-[#5EEAD4] border-l border-white/15 min-w-[125px]">
                      Tổng tiết theo khối
                    </th>
                    <th className="py-3 px-3 text-right text-white w-[80px]">Thao tác</th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {displayGroups.map(({ subject: s, programRows }) => {
                  const isSelected = selectedSubjectIds.includes(s.id)
                  const span = programRows.length
                  const isChild = Boolean(s.parentId)

                  return programRows.map((pr, pIdx) => {
                    const rowTotal = sumQuotaColumns(pr.quota, columns)
                    const rowBg = isSelected
                      ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                      : "hover:bg-[#F8FAFC]"

                    return (
                      <tr
                        key={`${s.id}-${pr.program}`}
                        className={`transition-colors align-middle ${rowBg} ${
                          pIdx > 0 ? "border-t border-[#F1F5F9]" : ""
                        }`}
                      >
                        {pIdx === 0 && (
                          <>
                            <td rowSpan={span} className="py-3 px-3 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectSubject(s.id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 accent-[#003B3A] cursor-pointer"
                              />
                            </td>

                            <td rowSpan={span} className="py-3 px-3 align-middle">
                              <div className={`flex items-start gap-2 ${isChild ? "pl-3 border-l-2 border-[#00A19A]/40" : ""}`}>
                                <span className="font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-[#003B3A] border border-slate-200 shrink-0 mt-0.5">
                                  {s.subjectCode}
                                </span>
                                <div className="min-w-0">
                                  <div className={`font-semibold text-slate-900 leading-snug ${isChild ? "text-slate-700" : ""}`}>
                                    {s.subjectName}
                                  </div>
                                  {s.description && (
                                    <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={s.description}>
                                      {s.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td rowSpan={span} className="py-3 px-3 align-middle">
                              <div className="flex flex-col items-start gap-1">
                                {renderCategoryBadges(s.category)}
                                {renderLevelBadges(s.level)}
                              </div>
                            </td>

                            <td rowSpan={span} className="py-3 px-3 align-middle">
                              {renderParentCell(s)}
                            </td>

                            <td rowSpan={span} className="py-3 px-3 align-middle">
                              {renderEvalBadge(s.evaluationType)}
                            </td>

                            <td rowSpan={span} className="py-3 px-2.5 text-center align-middle">
                              {(() => {
                                const isSchedulable = s.isTimetableSchedulable !== false
                                const isSavingToggle = Boolean(togglingTimetableIds[s.id])
                                return (
                                  <button
                                    type="button"
                                    disabled={isSavingToggle}
                                    onClick={() => handleToggleTimetable(s)}
                                    title={
                                      isSchedulable
                                        ? "Đang tick chia Thời khóa biểu — bấm để bỏ chọn khỏi phân hệ Thời khóa biểu"
                                        : "Đang tắt chia Thời khóa biểu — bấm để tick đưa môn này vào chia Thời khóa biểu"
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                      isSchedulable
                                        ? "bg-emerald-50 hover:bg-emerald-100/80 text-[#059669] border-emerald-200"
                                        : "bg-[#F8FAFC] hover:bg-slate-100 text-slate-500 border-[#E2E8F0]"
                                    } ${isSavingToggle ? "opacity-60 cursor-wait" : ""}`}
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                        isSchedulable
                                          ? "bg-[#059669] border-[#059669]"
                                          : "bg-white border-slate-300"
                                      }`}
                                    >
                                      {isSchedulable && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                    </span>
                                    <span>{isSchedulable ? "Chia TKB" : "Không chia"}</span>
                                  </button>
                                )
                              })()}
                            </td>
                          </>
                        )}

                        <td className="py-2.5 px-3 align-middle">
                          {renderProgramBadge(pr.program)}
                        </td>

                        {columns.map(col => {
                          const val = getSlotNumericValue(pr.quota, col)
                          const isStarred = val > 0 && hasSlotStar(pr.quota, col.key)
                          const isDiff = pr.diffKeys.has(col.key)
                          const splitEntry = val > 0 ? getSlotSplitEntry(pr.quota, col) : null

                          return (
                            <td
                              key={col.key}
                              className={`py-2.5 px-1.5 text-center align-middle ${getBodyDividerClass(col)} ${
                                isDiff ? "bg-[#F0FDFA]/50" : ""
                              }`}
                            >
                              {val > 0 ? (
                                <div className="inline-flex flex-col items-center gap-0.5">
                                  {isStarred ? (
                                    <span
                                      title="Tiết đặc thù (học theo nhóm lựa chọn / lớp ghép) — vẫn tính đủ số tiết/tuần vào tổng khối"
                                      className="inline-flex items-center justify-center min-w-[30px] h-6 px-1.5 rounded-md bg-amber-50 text-[#92400E] border border-amber-300 font-bold text-xs cursor-help"
                                    >
                                      {val}*
                                    </span>
                                  ) : (
                                    <span
                                      title={
                                        splitEntry
                                          ? `Tổng ${val} tiết/tuần: GVVN ${splitEntry.gvvn} tiết + GVNN ${splitEntry.gvnn} tiết`
                                          : isDiff
                                            ? "Định mức tiết chênh lệch giữa Hệ S và Hệ I"
                                            : undefined
                                      }
                                      className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md text-xs ${
                                        isDiff
                                          ? "bg-white text-[#00736E] border-2 border-[#00A19A] font-bold shadow-2xs"
                                          : "bg-[#F0FDFA] text-[#003B3A] border border-teal-200 font-semibold"
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  )}
                                  {splitEntry && (
                                    <span
                                      title={`Cơ cấu tiết tuần: Giáo viên Việt Nam (GVVN) ${splitEntry.gvvn} tiết · Giáo viên Nước ngoài (GVNN) ${splitEntry.gvnn} tiết`}
                                      className="text-[10px] leading-tight font-semibold text-[#00736E] whitespace-nowrap"
                                    >
                                      VN {splitEntry.gvvn}·NN {splitEntry.gvnn}
                                    </span>
                                  )}
                                </div>
                              ) : isDiff ? (
                                <span
                                  title="Khối này có 0 tiết ở hệ này (chênh lệch so với hệ còn lại)"
                                  className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md border border-dashed border-slate-300 text-slate-400 text-xs select-none"
                                >
                                  0
                                </span>
                              ) : (
                                <span className="text-slate-300 select-none">–</span>
                              )}
                            </td>
                          )
                        })}

                        <td className="py-2.5 px-3 text-center align-middle border-l border-[#E2E8F0] bg-[#F8FAFC]/60">
                          {rowTotal > 0 ? (
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-[#003B3A] text-white font-semibold text-xs whitespace-nowrap">
                              {rowTotal} tiết
                            </span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>

                        {pIdx === 0 && (
                          <td rowSpan={span} className="py-3 px-3 text-right align-middle border-l border-[#F1F5F9]">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(s)}
                                className="p-1.5 text-slate-500 hover:text-[#00736E] hover:bg-[#F0FDFA] rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa môn học & số tiết"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id, s.subjectName)}
                                className="p-1.5 text-slate-500 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa môn học"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                })}
              </tbody>

              {/* Footer: Tổng số tiết chuẩn hóa riêng cho Hệ S và Hệ I (không cộng gộp trùng lặp 2 hệ) */}
              <tfoot className="bg-[#F8FAFC] border-t-2 border-[#003B3A]/20 text-xs tabular-nums">
                {programBreakdown.length > 1 ? (
                  programBreakdown.map((pb, idx) => {
                    const isHeS = pb.program === "Hệ S"
                    const metaFull = STUDY_PROGRAM_META[pb.program]?.full || pb.program
                    return (
                      <tr
                        key={pb.program}
                        className={`${
                          idx === 0 ? "border-b border-[#E2E8F0] bg-[#F8FAFC]" : "bg-[#F0FDFA]/70"
                        } text-[#003B3A] font-bold`}
                      >
                        <td colSpan={7} className="py-2.5 px-3 text-right">
                          Tổng số tiết theo khối —{" "}
                          <span className={isHeS ? "text-[#003B3A]" : "text-[#059669]"}>
                            {metaFull}
                          </span>
                          :
                        </td>
                        {columns.map(col => (
                          <td
                            key={col.key}
                            className={`py-2.5 px-1.5 text-center ${
                              pb.byCol[col.key] > 0
                                ? isHeS
                                  ? "text-[#003B3A]"
                                  : "text-[#00736E]"
                                : "text-slate-400 font-normal"
                            } ${getBodyDividerClass(col, true)}`}
                          >
                            {pb.byCol[col.key] > 0 ? pb.byCol[col.key] : "–"}
                          </td>
                        ))}
                        <td
                          className={`py-2.5 px-3 text-center border-l border-teal-200 whitespace-nowrap ${
                            isHeS ? "bg-[#003B3A] text-[#5EEAD4]" : "bg-[#00736E] text-white"
                          }`}
                        >
                          {pb.grandTotal} tiết
                        </td>
                        <td className="py-2.5 px-3 bg-white" />
                      </tr>
                    )
                  })
                ) : (
                  <tr className="bg-[#F0FDFA]/70 text-[#003B3A] font-bold">
                    <td colSpan={7} className="py-3 px-3 text-right">
                      {programBreakdown.length === 1
                        ? `Tổng số tiết theo khối — ${
                            STUDY_PROGRAM_META[programBreakdown[0].program]?.full ||
                            programBreakdown[0].program
                          }:`
                        : `Tổng số tiết theo khối (${
                            filterProgram === "DEFAULT" ? "Chưa phân hệ" : filterProgram
                          }):`}
                    </td>
                    {columns.map(col => {
                      const val =
                        programBreakdown.length === 1
                          ? programBreakdown[0].byCol[col.key]
                          : overallTotals.byCol[col.key]
                      return (
                        <td
                          key={col.key}
                          className={`py-3 px-1.5 text-center ${
                            val > 0 ? "text-[#003B3A]" : "text-slate-400 font-normal"
                          } ${getBodyDividerClass(col, true)}`}
                        >
                          {val > 0 ? val : "–"}
                        </td>
                      )
                    })}
                    <td className="py-3 px-3 text-center border-l border-teal-200 bg-[#003B3A] text-[#5EEAD4] whitespace-nowrap">
                      {programBreakdown.length === 1
                        ? programBreakdown[0].grandTotal
                        : overallTotals.grandTotal}{" "}
                      tiết
                    </td>
                    <td className="py-3 px-3 bg-white" />
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {(hasAnyStarInTable || isHighSchoolTable || hasDiffCellsInTable) && (
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-4">
                {hasAnyStarInTable && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-50 text-[#92400E] border border-amber-300 font-bold tabular-nums">
                      2*
                    </span>
                    <span>
                      Tiết đặc thù (nhóm lựa chọn / lớp ghép): cộng đủ vào tổng tiết theo khối.
                    </span>
                  </div>
                )}
                {hasDiffCellsInTable && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white text-[#00736E] border-2 border-[#00A19A] font-bold tabular-nums">
                      5
                    </span>
                    <span>
                      Ô viền xanh nổi bật: khối lớp có số tiết chênh lệch giữa <strong>Hệ S</strong> và <strong>Hệ I</strong>.
                    </span>
                  </div>
                )}
              </div>
              <span className="font-medium text-slate-500">
                Tổ hợp THPT: <strong className="text-[#003B3A]">TN</strong> = Tự nhiên · <strong className="text-[#00736E]">XH</strong> = Xã hội
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Danh sách môn cha hợp lệ (chỉ lấy các môn gốc trong chương trình giảng dạy)
  const parentCandidates = curriculumSubjects.filter((s: any) => !s.parentId && s.id !== formData.id)

  // Groups per view mode (chỉ gồm môn giảng dạy)
  const fullK12Groups = useMemo(() => buildSubjectGroups(treeOrderedSubjects), [treeOrderedSubjects, filterProgram, selectedYearId])
  const primaryGroups = useMemo(
    () => buildSubjectGroups(treeOrderedSubjects.filter((s: any) => subjectMatchesLevel(s.level, "PRIMARY"))),
    [treeOrderedSubjects, filterProgram, selectedYearId]
  )
  const middleGroups = useMemo(
    () => buildSubjectGroups(treeOrderedSubjects.filter((s: any) => subjectMatchesLevel(s.level, "MIDDLE"))),
    [treeOrderedSubjects, filterProgram, selectedYearId]
  )
  const highGroups = useMemo(
    () => buildSubjectGroups(treeOrderedSubjects.filter((s: any) => subjectMatchesLevel(s.level, "HIGH"))),
    [treeOrderedSubjects, filterProgram, selectedYearId]
  )

  const isPureKsdvModal = formData.baseCategory === "KSDV"

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-12">
      {/* Masthead chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#003B3A] tracking-tight">
            Danh mục & định mức tiết môn học
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Chuẩn hóa 2 hệ đào tạo <strong>Hệ S</strong> (Hội nhập Sky-Line) & <strong>Hệ I</strong> (Song bằng & Quốc tế), định mức tiết K–12 và tag map điểm KSĐV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2">
            <CalendarDays className="w-4 h-4 text-[#00736E] shrink-0" />
            <span className="text-xs font-medium text-slate-500">Năm học:</span>
            <select
              value={selectedYearId}
              onChange={e => setSelectedYearId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#003B3A] outline-none cursor-pointer tabular-nums"
            >
              {safeYears.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Đang học)" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={applyingQd82 || !selectedYearId}
            onClick={async () => {
              const ok = window.confirm(
                "Áp dụng Khung thời lượng giáo dục chuẩn 40 tiết/tuần (K1–K12, cả Hệ S & Hệ I) theo Quyết định số 82/2026/QĐ-SKL ngày 12/06/2026 cho năm học đang chọn?"
              )
              if (!ok) return
              setApplyingQd82(true)
              try {
                const res = await applyQd82CurriculumStandardAction({
                  academicYearId: selectedYearId,
                })
                if (!res.success) {
                  alert(res.error)
                  return
                }
                window.location.reload()
              } finally {
                setApplyingQd82(false)
              }
            }}
            className="px-3.5 py-2.5 bg-[#F0FDFA] hover:bg-teal-100/80 text-[#003B3A] border border-[#00A19A]/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
            title="Đồng bộ toàn bộ định mức Hệ S & Hệ I (K1–K12) chuẩn 40 tiết/tuần theo Quyết định số 82/2026/QĐ-SKL ngày 12/06/2026"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00736E]" />
            <span>{applyingQd82 ? "Đang áp chuẩn QĐ 82..." : "Áp chuẩn QĐ 82/2026 (40 tiết)"}</span>
          </button>

          <button
            type="button"
            onClick={() => startEdit(undefined, true)}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#D97706] border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Thêm mã tag riêng cho công tác map điểm Khảo sát đầu vào (không hiển thị vào bảng tiết)"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Thêm tag KSĐV</span>
          </button>

          <button
            type="button"
            onClick={() => startEdit()}
            className="px-4 py-2.5 bg-[#003B3A] hover:bg-[#00736E] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm môn học</span>
          </button>
        </div>
      </div>

      {/* Unified Academic Ledger Strip (chỉ thống kê môn giảng dạy + nút mở nhanh Tag KSĐV) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] tabular-nums">
        {/* Khối 1: Tổng số môn giảng dạy & cơ cấu 2 Hệ */}
        <div className="lg:col-span-3 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-500">Môn học giảng dạy (2 hệ chuẩn)</div>
            <div className="text-2xl font-bold text-[#003B3A] mt-0.5">{stats.total} môn</div>
            <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-[#F0FDFA] text-[#003B3A] border border-teal-200 font-semibold">
                Hệ S: {stats.heSCount}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-200 font-semibold">
                Hệ I: {stats.heICount}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFilterTimetable(prev =>
                    prev === "SCHEDULABLE_ONLY" ? "ALL_TKB" : "SCHEDULABLE_ONLY"
                  )
                }
                title="Bấm để lọc nhanh các môn được tick chọn chia Thời khóa biểu"
                className={`px-1.5 py-0.5 rounded border font-semibold transition-colors cursor-pointer ${
                  filterTimetable === "SCHEDULABLE_ONLY"
                    ? "bg-[#059669] text-white border-[#059669]"
                    : "bg-emerald-50/70 hover:bg-emerald-100/80 text-[#059669] border-emerald-200"
                }`}
              >
                Chia TKB: {stats.tkbSchedulableCount}/{stats.total}
              </button>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#003B3A] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Khối 2: Phân bổ theo Danh mục chương trình + Tag KSĐV */}
        <div className="lg:col-span-5 p-4 flex flex-col justify-center">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Danh mục chương trình & tag map điểm
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "MOET", label: "Theo Bộ GD&ĐT", count: stats.moet },
              { id: "SKL", label: "Sky-Line", count: stats.skl },
              { id: "BILINGUAL", label: "Song ngữ", count: stats.bilingual }
            ].map(item => {
              const active = filterCategory === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterCategory(active ? "ALL_CATEGORIES" : item.id)}
                  className={`px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-[#F8FAFC] hover:bg-[#F0FDFA] text-slate-700 border-[#E2E8F0]"
                  }`}
                >
                  <div className={`text-[11px] font-medium truncate ${active ? "text-teal-100" : "text-slate-500"}`}>
                    {item.label}
                  </div>
                  <div className="text-sm font-bold mt-0.5">{item.count}</div>
                </button>
              )
            })}

            {/* Ô thứ 4: Tag KSĐV riêng phục vụ map điểm */}
            <button
              type="button"
              onClick={() => {
                setHighlightKsdvPanel(prev => !prev)
                setShowKsdvKeywords(prev => !prev)
              }}
              title="Các mã KSĐV đã ẩn khỏi bảng tiết học, chỉ hiển thị ở dải tag riêng bên dưới để tiện map điểm"
              className={`px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                highlightKsdvPanel
                  ? "bg-[#D97706] text-white border-[#D97706]"
                  : "bg-amber-50/70 hover:bg-amber-100/70 text-[#92400E] border-amber-200"
              }`}
            >
              <div className={`text-[11px] font-semibold flex items-center gap-1 truncate ${highlightKsdvPanel ? "text-amber-50" : "text-[#D97706]"}`}>
                <Tag className="w-3 h-3 shrink-0" />
                <span>Tag KSĐV</span>
              </div>
              <div className="text-sm font-bold mt-0.5">{stats.ksdvTags} tag</div>
            </button>
          </div>
        </div>

        {/* Khối 3: Hình thức đánh giá Thông tư 27 & 22 */}
        <div className="lg:col-span-4 p-4 flex flex-col justify-center">
          <div className="text-xs font-medium text-slate-500 mb-2">
            Hình thức đánh giá (Thông tư 27 & 22 BGD&ĐT)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "SCORE", label: "Cho điểm", count: stats.scoreCount, dot: "bg-[#059669]" },
              { id: "GRADE", label: "Đánh giá", count: stats.gradeCount, dot: "bg-[#00A19A]" },
              { id: "COMMENT", label: "Nhận xét", count: stats.commentCount, dot: "bg-[#D97706]" }
            ].map(ev => {
              const active = filterEvalType === ev.id
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setFilterEvalType(active ? "ALL_EVALS" : ev.id)}
                  className={`px-2.5 py-1.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : "bg-[#F8FAFC] hover:bg-[#F0FDFA] text-slate-700 border-[#E2E8F0]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-[#5EEAD4]" : ev.dot}`} />
                    <span className={`text-[11px] font-medium truncate ${active ? "text-teal-100" : "text-slate-600"}`}>
                      {ev.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-0.5">{ev.count}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dải Tag riêng phục vụ công tác Map điểm KSĐV (ẩn hoàn toàn khỏi bảng phân bổ tiết) */}
      <div
        className={`bg-white rounded-2xl border p-4 shadow-xs transition-colors tabular-nums ${
          highlightKsdvPanel
            ? "border-[#D97706] ring-2 ring-[#D97706]/15"
            : "border-[#E2E8F0] border-l-4 border-l-[#D97706]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#F1F5F9]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-xs font-bold">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>Tag mã môn KSĐV phục vụ map điểm</span>
            </span>
            <span className="text-xs text-slate-500">
              Đã ẩn {stats.pureKsdvCount} môn chuyên biệt KSĐV khỏi bảng định mức tiết · Bấm vào mã tag để sao chép nhanh khi cấu hình & nạp điểm
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowKsdvKeywords(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#003B3A] bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              {showKsdvKeywords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showKsdvKeywords ? "Thu gọn từ khóa cột điểm" : "Xem từ khóa cột điểm"}</span>
            </button>

            <Link
              href="/admin/cau-hinh-file-diem-ksdv"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#00736E] bg-[#F0FDFA] hover:bg-teal-100/70 border border-teal-200 transition-colors"
            >
              <span>Cấu hình file điểm KSĐV</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </Link>
          </div>
        </div>

        {ksdvTagSubjects.length > 0 ? (
          <div className="pt-3 flex flex-wrap items-start gap-2">
            {ksdvTagSubjects.map((s: any) => {
              const pureTag = isPureKsdvSubject(s)
              const parent = s.parentId ? subjectById.get(s.parentId) || s.parentSubject : null
              const keywords = getMappingKeywordsForSubject(s)
              const isCopied = copiedCode === s.subjectCode

              return (
                <div
                  key={s.id}
                  className={`group inline-flex flex-col gap-1 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                    pureTag
                      ? "bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-slate-800"
                      : "bg-[#F8FAFC] hover:bg-[#F0FDFA]/60 border-[#E2E8F0] text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(s.subjectCode)}
                      title={`Bấm để sao chép mã "${s.subjectCode}" phục vụ map cột file điểm`}
                      className={`inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        isCopied
                          ? "bg-[#059669] text-white border-[#059669]"
                          : pureTag
                          ? "bg-white text-[#92400E] border-amber-300 hover:border-[#D97706]"
                          : "bg-white text-[#003B3A] border-slate-300 hover:border-[#00A19A]"
                      }`}
                    >
                      <span>{s.subjectCode}</span>
                      {isCopied ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                      )}
                    </button>

                    <span className="font-semibold text-slate-800 whitespace-nowrap">
                      {s.subjectName}
                    </span>

                    {parent && (
                      <span
                        title={`Map điểm thành phần về môn cha: ${parent.subjectName} (${parent.subjectCode})`}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-amber-200 text-[#D97706] font-mono text-[10px] font-semibold"
                      >
                        ↳ {parent.subjectCode}
                      </span>
                    )}

                    {!pureTag && (
                      <span
                        title="Môn học giảng dạy chính khóa được gắn thêm tag map điểm KSĐV"
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0FDFA] border border-teal-200 text-[#00736E] text-[10px] font-semibold"
                      >
                        Môn chung
                      </span>
                    )}

                    <div className="inline-flex items-center gap-0.5 ml-0.5 pl-1 border-l border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => startEdit(s, pureTag)}
                        title="Chỉnh sửa thông tin tag map điểm"
                        className="p-1 text-slate-400 hover:text-[#00736E] rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {pureTag ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.subjectName, true)}
                          title="Xóa tag KSĐV này"
                          className="p-1 text-slate-400 hover:text-[#E11D48] rounded transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDetachKsdvFromSharedSubject(s)}
                          title="Gỡ tag KSĐV khỏi môn chung (vẫn giữ môn học trong bảng tiết)"
                          className="p-1 text-slate-400 hover:text-[#D97706] rounded transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showKsdvKeywords && (
                    <div className="text-[11px] text-slate-500 pl-0.5">
                      {keywords.length > 0 ? (
                        <span>
                          Từ khóa tự động map:{" "}
                          <span className="font-mono text-slate-700">
                            {keywords.slice(0, 6).join(", ")}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Nhận diện theo mã chuẩn: {s.subjectCode}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="pt-3 text-xs text-slate-500">
            Chưa có tag mã môn KSĐV nào. Bấm <strong>Thêm tag KSĐV</strong> hoặc gắn tag KSĐV cho môn học có sẵn để phục vụ map điểm.
          </div>
        )}
      </div>

      {/* Thanh công cụ thao tác hàng loạt khi chọn môn giảng dạy */}
      {selectedSubjectIds.length > 0 && (
        <div className="bg-[#003B3A] text-white p-3.5 sm:px-5 rounded-2xl shadow-md border border-[#003B3A] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 tabular-nums">
            <span className="px-2.5 py-1 rounded-lg bg-[#00A19A] text-white font-bold text-xs">
              Đã chọn {selectedSubjectIds.length} môn
            </span>
            <span className="text-xs text-teal-100">
              Cập nhật nhanh bậc học, danh mục, môn cha, hình thức đánh giá hoặc tag map điểm KSĐV
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <select
              onChange={e => {
                if (e.target.value === "ENABLE_TKB") {
                  handleBulkUpdate({ isTimetableSchedulable: true })
                } else if (e.target.value === "DISABLE_TKB") {
                  handleBulkUpdate({ isTimetableSchedulable: false })
                }
                e.target.value = ""
              }}
              className="bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl outline-none border border-emerald-400/40 cursor-pointer"
            >
              <option value="" className="text-slate-800 bg-white">Chia Thời khóa biểu...</option>
              <option value="ENABLE_TKB" className="text-slate-800 bg-white">✓ Tick chọn chia Thời khóa biểu</option>
              <option value="DISABLE_TKB" className="text-slate-800 bg-white">✕ Bỏ chọn chia Thời khóa biểu</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value) handleBulkUpdate({ studyPrograms: e.target.value })
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Gán hệ đào tạo...</option>
              <option value="Hệ S, Hệ I" className="text-slate-800">Áp dụng chung: Hệ S & Hệ I</option>
              <option value="Hệ S" className="text-slate-800">Chỉ áp dụng: Hệ S</option>
              <option value="Hệ I" className="text-slate-800">Chỉ áp dụng: Hệ I</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value) handleBulkUpdate({ category: e.target.value })
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Đổi danh mục chương trình...</option>
              <option value="MOET" className="text-slate-800">Theo Bộ GD&ĐT</option>
              <option value="SKL" className="text-slate-800">Đặc thù Sky-Line</option>
              <option value="BILINGUAL" className="text-slate-800">Song ngữ & Quốc tế</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value === "ATTACH") handleBulkToggleKsdvTag(true)
                else if (e.target.value === "DETACH") handleBulkToggleKsdvTag(false)
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Tag map điểm KSĐV...</option>
              <option value="ATTACH" className="text-slate-800">Gắn thêm tag map điểm KSĐV</option>
              <option value="DETACH" className="text-slate-800">Gỡ tag map điểm KSĐV</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value) handleBulkUpdate({ level: e.target.value })
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Đổi bậc học áp dụng...</option>
              <option value="PRIMARY, MIDDLE, HIGH" className="text-slate-800">Liên cấp K–12 (Cả 3 bậc)</option>
              <option value="PRIMARY" className="text-slate-800">Chỉ Bậc Tiểu học</option>
              <option value="MIDDLE" className="text-slate-800">Chỉ Bậc THCS</option>
              <option value="HIGH" className="text-slate-800">Chỉ Bậc THPT</option>
              <option value="PRIMARY, MIDDLE" className="text-slate-800">Tiểu học & THCS</option>
              <option value="MIDDLE, HIGH" className="text-slate-800">THCS & THPT</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value) handleBulkUpdate({ evaluationType: e.target.value })
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Đổi hình thức TT 27 & 22...</option>
              <option value="SCORE" className="text-slate-800">Cho điểm (Thang 10)</option>
              <option value="GRADE" className="text-slate-800">Đánh giá (Đạt / Chưa đạt)</option>
              <option value="COMMENT" className="text-slate-800">Nhận xét định tính</option>
            </select>

            <select
              onChange={e => {
                if (e.target.value !== "") {
                  handleBulkUpdate({ parentId: e.target.value === "__NONE__" ? null : e.target.value })
                  e.target.value = ""
                }
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer max-w-[190px]"
            >
              <option value="" className="text-slate-800">Gán môn cha...</option>
              <option value="__NONE__" className="text-slate-800">Đặt làm môn chính độc lập</option>
              {curriculumSubjects
                .filter((s: any) => !s.parentId && !selectedSubjectIds.includes(s.id))
                .map((p: any) => (
                  <option key={p.id} value={p.id} className="text-slate-800">
                    Thuộc: {p.subjectName} ({p.subjectCode})
                  </option>
                ))}
            </select>

            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="px-3.5 py-2 bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa đã chọn</span>
            </button>

            <button
              onClick={() => setSelectedSubjectIds([])}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-teal-100 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Khung điều hướng Bậc học & Bộ lọc chi tiết */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3.5">
        {/* Hàng 1: Segmented Control chọn Bậc học + Tùy chọn gộp dòng đồng nhất Hệ S & Hệ I */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            {[
              { id: "K12_MATRIX", label: "Tổng quan K–12" },
              { id: "PRIMARY", label: "Bậc Tiểu học (Khối 1–5)" },
              { id: "MIDDLE", label: "Bậc THCS (Khối 6–9)" },
              { id: "HIGH", label: "Bậc THPT (10–12 TN/XH)" },
              { id: "SPLIT_LEVELS", label: "Xem tách 3 bậc học" }
            ].map(tab => {
              const active = viewMode === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#003B3A] text-white shadow-xs"
                      : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ lọc nhanh Chia Thời khóa biểu */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl tabular-nums">
              {[
                { id: "ALL_TKB" as const, label: "Tất cả TKB" },
                { id: "SCHEDULABLE_ONLY" as const, label: `Chia TKB (${stats.tkbSchedulableCount})` },
                { id: "NON_SCHEDULABLE_ONLY" as const, label: `Không chia (${stats.tkbExcludedCount})` }
              ].map(tkbTab => {
                const active = filterTimetable === tkbTab.id
                return (
                  <button
                    key={tkbTab.id}
                    type="button"
                    onClick={() => setFilterTimetable(tkbTab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? tkbTab.id === "SCHEDULABLE_ONLY"
                          ? "bg-[#059669] text-white shadow-xs"
                          : "bg-[#003B3A] text-white shadow-xs"
                        : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                    }`}
                  >
                    {tkbTab.label}
                  </button>
                )
              })}
            </div>

            {/* Bộ lọc nhanh 2 Hệ đào tạo */}
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl tabular-nums">
              {[
                { id: "ALL_PROGRAMS", label: "Cả 2 hệ (S & I)" },
                { id: "Hệ S", label: `Hệ S (${stats.heSCount})` },
                { id: "Hệ I", label: `Hệ I (${stats.heICount})` },
                { id: "ONLY_HE_I", label: `Riêng Hệ I (${stats.onlyICount})` },
                { id: "DIFF_S_I", label: `Lệch tiết S ≠ I (${stats.diffQuotaCount})` }
              ].map(pTab => {
                const active = filterProgram === pTab.id
                return (
                  <button
                    key={pTab.id}
                    type="button"
                    onClick={() => setFilterProgram(pTab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? "bg-[#00736E] text-white shadow-xs"
                        : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                    }`}
                  >
                    {pTab.label}
                  </button>
                )
              })}
            </div>

            {filterProgram === "ALL_PROGRAMS" && (
              <label
                title="Gộp gọn các môn có số tiết hoàn toàn giống nhau giữa Hệ S và Hệ I thành 1 dòng Hệ S & Hệ I (tổng tiết từng hệ vẫn giữ nguyên chuẩn xác)"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  compactSameQuota
                    ? "bg-[#F0FDFA] text-[#003B3A] border-teal-200"
                    : "bg-white text-slate-600 border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={compactSameQuota}
                  onChange={e => setCompactSameQuota(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-teal-300 accent-[#003B3A] cursor-pointer"
                />
                <span>Gộp dòng Hệ S = Hệ I</span>
              </label>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E11D48] bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Tìm kiếm + 4 bộ lọc chuyên môn (chỉ áp dụng cho môn giảng dạy) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã môn, tên môn giảng dạy hoặc môn cha..."
              className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="lg:col-span-2">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none cursor-pointer"
            >
              <option value="ALL_CATEGORIES">Tất cả danh mục giảng dạy</option>
              <option value="MOET">Theo Bộ GD&ĐT</option>
              <option value="SKL">Đặc thù Sky-Line</option>
              <option value="BILINGUAL">Song ngữ & Quốc tế</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={filterParent}
              onChange={e => setFilterParent(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none cursor-pointer"
            >
              <option value="ALL_RELATIONS">Tất cả quan hệ môn</option>
              <option value="ROOT_ONLY">Môn chính độc lập</option>
              <option value="CHILD_ONLY">Môn con / thành phần</option>
              {activeParentSubjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  Nhóm môn: {p.subjectName} ({p.subjectCode})
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={filterEvalType}
              onChange={e => setFilterEvalType(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none cursor-pointer"
            >
              <option value="ALL_EVALS">Tất cả hình thức TT 27 & 22</option>
              <option value="SCORE">Cho điểm (Thang 10)</option>
              <option value="GRADE">Đánh giá (Đạt / Chưa đạt)</option>
              <option value="COMMENT">Nhận xét định tính</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={filterProgram}
              onChange={e => setFilterProgram(e.target.value)}
              className="w-full py-2 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-[#00A19A] outline-none cursor-pointer"
            >
              <option value="ALL_PROGRAMS">Tất cả hệ (Hệ S & Hệ I)</option>
              <option value="Hệ S">Hệ S — Hội nhập Sky-Line</option>
              <option value="Hệ I">Hệ I — Song bằng & Quốc tế</option>
              <option value="ONLY_HE_I">Môn đặc thù riêng Hệ I</option>
              <option value="DIFF_S_I">Môn chênh lệch tiết (S ≠ I)</option>
              {stats.unassignedCount > 0 && <option value="DEFAULT">Chưa phân hệ</option>}
            </select>
          </div>
        </div>
      </div>

      {/* Khu vực Bảng Sổ cái Học thuật (chỉ hiển thị môn giảng dạy chính thức) */}
      <div className="space-y-6">
        {viewMode === "K12_MATRIX" &&
          renderLedgerTable(
            "Bảng tổng quan chương trình & định mức tiết K–12",
            "Đối chiếu xuyên suốt Tiểu học (K1–5), THCS (K6–9) và THPT phân ban Tự nhiên / Xã hội (10 TN–12 XH)",
            fullK12Groups,
            ALL_K12_QUOTA_COLS,
            "K12_MATRIX"
          )}

        {viewMode === "PRIMARY" &&
          renderLedgerTable(
            "Bậc Tiểu học (Khối 1–5)",
            "Định mức tiết và hình thức đánh giá theo Thông tư 27/2020/TT-BGDĐT",
            primaryGroups,
            PRIMARY_QUOTA_COLS,
            "STANDARD"
          )}

        {viewMode === "MIDDLE" &&
          renderLedgerTable(
            "Bậc Trung học cơ sở (Khối 6–9)",
            "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
            middleGroups,
            MIDDLE_QUOTA_COLS,
            "STANDARD"
          )}

        {viewMode === "HIGH" &&
          renderLedgerTable(
            "Bậc Trung học phổ thông — Tổ hợp Tự nhiên (TN) & Xã hội (XH)",
            "Định mức tiết chuẩn theo 6 cột tổ hợp (10 TN, 10 XH, 11 TN, 11 XH, 12 TN, 12 XH) và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
            highGroups,
            HIGH_QUOTA_COLS,
            "HIGH"
          )}

        {viewMode === "SPLIT_LEVELS" && (
          <div className="space-y-8">
            {renderLedgerTable(
              "1. Bậc Tiểu học (Khối 1–5)",
              "Định mức tiết và hình thức đánh giá theo Thông tư 27/2020/TT-BGDĐT",
              primaryGroups,
              PRIMARY_QUOTA_COLS,
              "STANDARD"
            )}
            {renderLedgerTable(
              "2. Bậc Trung học cơ sở (Khối 6–9)",
              "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
              middleGroups,
              MIDDLE_QUOTA_COLS,
              "STANDARD"
            )}
            {renderLedgerTable(
              "3. Bậc Trung học phổ thông — Tổ hợp Tự nhiên (TN) & Xã hội (XH)",
              "Định mức tiết theo 6 cột tổ hợp (10 TN, 10 XH, 11 TN, 11 XH, 12 TN, 12 XH) và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
              highGroups,
              HIGH_QUOTA_COLS,
              "HIGH"
            )}
          </div>
        )}

        {fullK12Groups.length === 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Không có môn giảng dạy phù hợp với bộ lọc hiện tại
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Các môn chuyên biệt phục vụ Khảo sát đầu vào (như EPT, NLTD, TAv, TAvd) được hiển thị riêng trên dải tag map điểm phía trên.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-[#003B3A] text-white rounded-xl text-xs font-semibold hover:bg-[#00736E] transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Tạo mới / Chỉnh sửa môn học hoặc Tag map điểm KSĐV */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/55 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2E8F0] border-l-4 ${
                isPureKsdvModal ? "border-l-[#D97706]" : "border-l-[#003B3A]"
              }`}
            >
              <div>
                <h2 className="text-lg font-bold text-[#003B3A]">
                  {formData.id === "new"
                    ? isPureKsdvModal
                      ? "Thêm tag mã môn KSĐV (phục vụ map điểm)"
                      : "Thêm môn học giảng dạy mới"
                    : isPureKsdvModal
                    ? `Chỉnh sửa tag map điểm KSĐV: ${formData.name}`
                    : `Chỉnh sửa môn học: ${formData.name}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPureKsdvModal
                    ? "Mã tag chuyên biệt cho Khảo sát đầu vào sẽ ẩn khỏi bảng phân bổ tiết và chỉ hiển thị ở dải tag map điểm"
                    : "Thiết lập bậc học, danh mục, môn cha, hình thức đánh giá (Thông tư 27 & 22) và số tiết theo khối"}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-[#F8FAFC]">
              {/* Khối 1: Định danh & Phân loại */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                  <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                    {isPureKsdvModal ? (
                      <Tag className="w-4 h-4 text-[#D97706]" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-[#00A19A]" />
                    )}
                    <span>
                      {isPureKsdvModal
                        ? "Thông tin tag mã môn phục vụ map điểm KSĐV"
                        : "1. Bậc – Danh mục môn học & Thuộc môn học (Môn cha)"}
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {isPureKsdvModal ? "Mã tag map điểm" : "Mã môn học"}{" "}
                      <span className="text-[#E11D48]">*</span>
                    </label>
                    <input
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      placeholder={isPureKsdvModal ? "VD: EPT, NLTD, TAv, TAvd..." : "VD: TOA, NVA, MTU..."}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none font-mono font-semibold text-sm text-[#003B3A] tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {isPureKsdvModal ? "Tên hiển thị của tag KSĐV" : "Tên môn học"}{" "}
                      <span className="text-[#E11D48]">*</span>
                    </label>
                    <input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={
                        isPureKsdvModal
                          ? "VD: Tiếng Anh (viết), Năng lực tư duy..."
                          : "VD: Toán học, Mĩ thuật, Tiếng Anh..."
                      }
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none font-semibold text-sm text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Phân loại sử dụng
                    </label>
                    <select
                      value={formData.baseCategory}
                      onChange={e => {
                        const nextCat = e.target.value
                        setFormData(prev => ({
                          ...prev,
                          baseCategory: nextCat,
                          studyPrograms:
                            nextCat === "KSDV"
                              ? []
                              : prev.studyPrograms.length > 0
                              ? prev.studyPrograms
                              : ["Hệ S"],
                          quotasByProgram:
                            nextCat === "KSDV"
                              ? prev.quotasByProgram
                              : Object.keys(prev.quotasByProgram).length > 0
                              ? prev.quotasByProgram
                              : { "Hệ S": hydrateEditableQuota() }
                        }))
                        if (nextCat !== "KSDV" && !activeTab) {
                          setActiveTab("Hệ S")
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-xs text-slate-800 cursor-pointer"
                    >
                      <option value="MOET">Chương trình Bộ GD&ĐT (MOET)</option>
                      <option value="SKL">Chương trình Đặc thù Sky-Line</option>
                      <option value="BILINGUAL">Chương trình Song ngữ & Quốc tế</option>
                      <option value="KSDV">Tag riêng KSĐV — Chỉ dùng map điểm (ẩn khỏi bảng tiết)</option>
                    </select>
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {isPureKsdvModal
                        ? "Map gộp về môn chính (nếu là bài thi thành phần)"
                        : "Thuộc môn học (Môn cha)"}
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-xs text-slate-800 cursor-pointer"
                    >
                      <option value="">
                        {isPureKsdvModal
                          ? "Không chọn — Mã KSĐV độc lập (VD: EPT, NLTD)"
                          : "Không chọn — Môn chính độc lập"}
                      </option>
                      {parentCandidates.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          ↳ {p.subjectName} ({p.subjectCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {isPureKsdvModal ? (
                    <div className="md:col-span-12 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Mô tả ngắn / ghi chú map điểm (tùy chọn)
                      </label>
                      <input
                        value={formData.desc}
                        onChange={e => setFormData({ ...formData, desc: e.target.value })}
                        placeholder="VD: Bài thi Tiếng Anh phần viết đầu vào, map điểm về nhóm Tiếng Anh..."
                        className="w-full px-3.5 py-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] outline-none text-xs text-slate-700"
                      />
                    </div>
                  ) : (
                    <>
                      {/* Tùy chọn gắn kèm tag KSĐV cho môn giảng dạy chung */}
                      <div className="md:col-span-12">
                        <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.attachKsdvTag}
                            onChange={e =>
                              setFormData({ ...formData, attachKsdvTag: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-amber-300 accent-[#D97706] cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800">
                              Gắn thêm tag KSĐV cho môn học này
                            </span>
                            <span className="text-slate-500 ml-1.5">
                              (Giữ môn trong bảng phân bổ tiết, đồng thời hiển thị trên dải tag phục vụ đối chiếu & map điểm KSĐV)
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Bậc học & Hệ đào tạo */}
                      <div className="md:col-span-6 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700">
                            Bậc học áp dụng
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, levels: ["PRIMARY", "MIDDLE", "HIGH"] })
                            }
                            className="text-[11px] font-semibold text-[#00736E] hover:underline cursor-pointer"
                          >
                            Chọn cả 3 bậc
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "PRIMARY", label: "Tiểu học (K1–5)" },
                            { id: "MIDDLE", label: "THCS (K6–9)" },
                            { id: "HIGH", label: "THPT (10–12 TN/XH)" }
                          ].map(lvl => {
                            const checked =
                              formData.levels.includes(lvl.id) || formData.levels.includes("ALL")
                            return (
                              <label
                                key={lvl.id}
                                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                  checked
                                    ? "border-[#00A19A] bg-[#F0FDFA] text-[#003B3A]"
                                    : "border-[#E2E8F0] bg-white text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  onChange={e => {
                                    const lvls = new Set(formData.levels.filter(l => l !== "ALL"))
                                    if (e.target.checked) lvls.add(lvl.id)
                                    else lvls.delete(lvl.id)
                                    setFormData({ ...formData, levels: Array.from(lvls) })
                                  }}
                                />
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                    checked
                                      ? "bg-[#003B3A] border-[#003B3A]"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                </span>
                                <span>{lvl.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-6 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700">
                            Hệ đào tạo áp dụng (2 hệ chuẩn)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const nextQuotas = { ...prev.quotasByProgram }
                                STUDY_PROGRAMS.forEach(sp => {
                                  if (!nextQuotas[sp]) {
                                    const donor = STUDY_PROGRAMS.find(d => d !== sp && nextQuotas[d])
                                    nextQuotas[sp] = donor
                                      ? hydrateEditableQuota(nextQuotas[donor])
                                      : hydrateEditableQuota()
                                  }
                                })
                                return {
                                  ...prev,
                                  studyPrograms: [...STUDY_PROGRAMS],
                                  quotasByProgram: nextQuotas
                                }
                              })
                              if (!activeTab) setActiveTab("Hệ S")
                            }}
                            className="text-[11px] font-semibold text-[#00736E] hover:underline cursor-pointer"
                          >
                            Chọn cả 2 hệ
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {STUDY_PROGRAMS.map(prog => {
                            const checked = formData.studyPrograms.includes(prog)
                            const meta = STUDY_PROGRAM_META[prog]
                            return (
                              <label
                                key={prog}
                                title={meta?.subtitle}
                                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                  checked
                                    ? "border-[#00A19A] bg-[#F0FDFA] text-[#003B3A]"
                                    : "border-[#E2E8F0] bg-white text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  onChange={e => handleProgramToggle(prog, e.target.checked)}
                                />
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                    checked
                                      ? "bg-[#003B3A] border-[#003B3A]"
                                      : "border-slate-300"
                                  }`}
                                >
                                  {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                </span>
                                <span>{meta?.full || prog}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-12 pt-1">
                        <label
                          className={`flex items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                            formData.isTimetableSchedulable
                              ? "bg-emerald-50/70 border-emerald-200 text-[#003B3A]"
                              : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.isTimetableSchedulable}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  isTimetableSchedulable: e.target.checked
                                })
                              }
                            />
                            <span
                              className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                formData.isTimetableSchedulable
                                  ? "bg-[#059669] border-[#059669]"
                                  : "bg-white border-slate-300"
                              }`}
                            >
                              {formData.isTimetableSchedulable && (
                                <Check className="w-3 h-3 text-white stroke-[3]" />
                              )}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-[#003B3A]">
                                Tick chọn đưa môn học này vào chia Thời khóa biểu
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Khi bật, môn học sẽ xuất hiện trong Rà soát định mức tiết, Phân công giảng dạy và Xếp Thời khóa biểu tự động/thủ công. Bỏ chọn đối với các môn tích hợp sổ điểm hoặc không xếp tiết độc lập trên TKB.
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 whitespace-nowrap ${
                              formData.isTimetableSchedulable
                                ? "bg-white text-[#059669] border-emerald-200"
                                : "bg-white text-slate-500 border-slate-200"
                            }`}
                          >
                            {formData.isTimetableSchedulable ? "Đang chia TKB" : "Không chia TKB"}
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Khối 2 & 3 chỉ hiển thị cho môn học giảng dạy chính khóa */}
              {!isPureKsdvModal && (
                <>
                  {/* Khối 2: Hình thức đánh giá môn học (Thông tư 27 & 22 BGD&ĐT) */}
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] space-y-3.5">
                    <div className="border-b border-[#F1F5F9] pb-2.5">
                      <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#00A19A]" />
                        <span>2. Hình thức đánh giá môn học (Thông tư 27 & 22 BGD&ĐT)</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {EVALUATION_TYPES.map(type => {
                        const isSelected = formData.evaluationType === type.id
                        const Icon = type.icon
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, evaluationType: type.id })}
                            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? "border-2 border-[#00A19A] bg-[#F0FDFA]/60 shadow-xs"
                                : "border-[#E2E8F0] bg-white hover:border-slate-300"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${type.badgeClass}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span>{type.badgeLabel}</span>
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400">
                                  {type.circularRef}
                                </span>
                              </div>
                              <div className="font-bold text-xs text-slate-900 mb-1">{type.label}</div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                {type.description}
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] text-[11px] text-slate-400">
                              VD: {type.examples}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Khối 3: Số tiết theo khối / tổ hợp & Tổng số tiết theo khối */}
                  {formData.studyPrograms.filter(p => p !== "DEFAULT").length > 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                      <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#00A19A]" />
                            <span>3. Số tiết theo khối, tổ hợp TN/XH & tổng số tiết</span>
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Nhập số tiết/tuần cho từng khối hoặc tổ hợp THPT (hỗ trợ số lẻ như <strong className="text-slate-700">4.5</strong>, <strong className="text-slate-700">0,5</strong> và gõ <strong className="text-slate-700">2*</strong> cho tiết lựa chọn / lớp ghép)
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 tabular-nums">
                          <button
                            type="button"
                            onClick={() => setShowTeacherSplitEditor(v => !v)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                              showTeacherSplitEditor
                                ? "bg-[#059669] text-white border-[#059669]"
                                : "bg-white text-[#003B3A] border-teal-200 hover:bg-[#F0FDFA]"
                            }`}
                          >
                            {showTeacherSplitEditor
                              ? "Đang bật tách GVVN / GVNN"
                              : "+ Khai báo tiết GVVN / GVNN"}
                          </button>

                          {activeTab &&
                            formData.studyPrograms.filter(p => p !== "DEFAULT").length > 1 &&
                            (() => {
                              const otherProg = formData.studyPrograms.find(
                                p => p !== "DEFAULT" && p !== activeTab
                              )
                              if (!otherProg) return null
                              return (
                                <button
                                  type="button"
                                  onClick={() => copyQuotaBetweenPrograms(otherProg, activeTab)}
                                  title={`Sao chép toàn bộ số tiết từ ${otherProg} sang ${activeTab}`}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F0FDFA] hover:bg-teal-100/70 text-[#00736E] border border-teal-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 shrink-0" />
                                  <span>Sao chép từ {otherProg}</span>
                                </button>
                              )
                            })()}

                          {formData.studyPrograms
                            .filter(p => p !== "DEFAULT")
                            .map(prog => {
                              const pq = formData.quotasByProgram[prog] || DEFAULT_QUOTA
                              const progTotal = sumQuotaColumns(pq, ALL_K12_QUOTA_COLS)
                              const isActive = activeTab === prog
                              return (
                                <button
                                  key={prog}
                                  type="button"
                                  onClick={() => setActiveTab(prog)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                    isActive
                                      ? "bg-[#003B3A] text-white"
                                      : "bg-white text-slate-600 border border-[#E2E8F0] hover:border-[#00A19A]"
                                  }`}
                                >
                                  <span>{prog}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      isActive
                                        ? "bg-[#00A19A] text-white"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {progTotal} tiết
                                  </span>
                                </button>
                              )
                            })}
                        </div>
                      </div>

                      {activeTab &&
                        (() => {
                          const q = (formData.quotasByProgram[activeTab] as any) || DEFAULT_QUOTA
                          const showPrimary =
                            formData.levels.includes("PRIMARY") ||
                            formData.levels.includes("ALL") ||
                            formData.levels.length === 0
                          const showMiddle =
                            formData.levels.includes("MIDDLE") ||
                            formData.levels.includes("ALL") ||
                            formData.levels.length === 0
                          const showHigh =
                            formData.levels.includes("HIGH") ||
                            formData.levels.includes("ALL") ||
                            formData.levels.length === 0

                          const activeCols: QuotaColumnDef[] = [
                            ...(showPrimary ? PRIMARY_QUOTA_COLS : []),
                            ...(showMiddle ? MIDDLE_QUOTA_COLS : []),
                            ...(showHigh ? HIGH_QUOTA_COLS : [])
                          ]
                          const totalAllActive = sumQuotaColumns(q, activeCols)

                          const updateSlotSplit = (
                            col: QuotaColumnDef,
                            side: "gvvn" | "gvnn",
                            rawVal: string
                          ) => {
                            const normalized = rawVal.replace(/,/g, ".")
                            const parsed =
                              normalized.trim() === ""
                                ? 0
                                : Math.max(0, parseFloat(normalized) || 0)
                            setFormData(prev => {
                              const current = prev.quotasByProgram[activeTab] || hydrateEditableQuota()
                              const nextQ: any = { ...current }
                              const totalSlot = getSlotNumericValue(nextQ, col)
                              const splitMap = parseTeacherSplitJson(nextQ.teacherSplitJson)
                              const prevEntry = splitMap[col.field] || { gvvn: 0, gvnn: 0 }

                              let nextVn = prevEntry.gvvn
                              let nextNn = prevEntry.gvnn
                              if (side === "gvvn") {
                                nextVn = roundQuota(parsed)
                                if (totalSlot > 0 && nextVn <= totalSlot) {
                                  nextNn = roundQuota(totalSlot - nextVn)
                                }
                              } else {
                                nextNn = roundQuota(parsed)
                                if (totalSlot > 0 && nextNn <= totalSlot) {
                                  nextVn = roundQuota(totalSlot - nextNn)
                                }
                              }

                              if (nextVn <= 0 && nextNn <= 0) {
                                delete splitMap[col.field]
                              } else {
                                splitMap[col.field] = { gvvn: nextVn, gvnn: nextNn }
                                const sumBoth = roundQuota(nextVn + nextNn)
                                if (sumBoth > totalSlot) {
                                  nextQ[col.field] = sumBoth
                                  recomputeQuotaAggregates(nextQ)
                                }
                              }
                              nextQ.teacherSplitJson = serializeTeacherSplitJson(splitMap)
                              return {
                                ...prev,
                                quotasByProgram: { ...prev.quotasByProgram, [activeTab]: nextQ }
                              }
                            })
                          }

                          const applyBatchGvnnFill = (targetCols: QuotaColumnDef[], rawStr: string) => {
                            const trimmed = rawStr.trim()
                            if (!trimmed) return
                            const gvnnVal = Math.max(0, parseFloat(trimmed.replace(",", ".")) || 0)
                            setFormData(prev => {
                              const current = prev.quotasByProgram[activeTab] || hydrateEditableQuota()
                              const nextQ: any = { ...current }
                              const splitMap = parseTeacherSplitJson(nextQ.teacherSplitJson)
                              targetCols.forEach(c => {
                                const tot = getSlotNumericValue(nextQ, c)
                                if (tot > 0) {
                                  const nn = Math.min(tot, roundQuota(gvnnVal))
                                  const vn = roundQuota(Math.max(0, tot - nn))
                                  splitMap[c.field] = { gvvn: vn, gvnn: nn }
                                }
                              })
                              nextQ.teacherSplitJson = serializeTeacherSplitJson(splitMap)
                              return {
                                ...prev,
                                quotasByProgram: { ...prev.quotasByProgram, [activeTab]: nextQ }
                              }
                            })
                          }

                          const applyBatchFill = (targetCols: QuotaColumnDef[], rawStr: string) => {
                            const trimmed = rawStr.trim()
                            if (!trimmed) return
                            const starred = trimmed.endsWith("*")
                            const parsed = parseFloat(trimmed.replace(/\*/g, "").replace(",", "."))
                            const val = isNaN(parsed) ? 0 : parsed
                            setFormData(prev => {
                              const current = prev.quotasByProgram[activeTab] || hydrateEditableQuota()
                              const nextQ: any = { ...current }
                              const flags = parseStarFlags(nextQ.specialNoteFlags)
                              targetCols.forEach(c => {
                                nextQ[c.field] = val
                                if (starred && val > 0) flags.add(c.key)
                                else flags.delete(c.key)
                              })
                              nextQ.specialNoteFlags = serializeStarFlags(flags)
                              recomputeQuotaAggregates(nextQ)
                              return {
                                ...prev,
                                quotasByProgram: { ...prev.quotasByProgram, [activeTab]: nextQ }
                              }
                            })
                            setRawInputs(prev => {
                              const next = { ...prev }
                              targetCols.forEach(c => delete next[`${activeTab}-${c.field}`])
                              return next
                            })
                          }

                          const renderColumnGroup = (
                            label: string,
                            cols: QuotaColumnDef[],
                            isHighGroup = false
                          ) => {
                            const groupTotal = sumQuotaColumns(q, cols)

                            return (
                              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white tabular-nums">
                                <div className="px-4 py-2.5 bg-[#003B3A] text-white flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold">{label}</span>
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-teal-100">
                                        {isHighGroup ? "Cả bậc:" : "Gán nhanh cả bậc:"}
                                      </span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="VD: 2 + Enter"
                                        className="w-20 text-center text-[11px] font-semibold py-0.5 px-1.5 rounded bg-white/15 text-white placeholder:text-teal-100/70 border border-white/20 outline-none focus:bg-white focus:text-[#003B3A]"
                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault()
                                            applyBatchFill(cols, (e.target as HTMLInputElement).value)
                                            ;(e.target as HTMLInputElement).value = ""
                                          }
                                        }}
                                      />
                                    </div>

                                    {isHighGroup && (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] text-teal-100">TN:</span>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Enter"
                                            title="Gán nhanh cho 10 TN, 11 TN, 12 TN (nhấn Enter)"
                                            className="w-14 text-center text-[11px] font-semibold py-0.5 px-1.5 rounded bg-white/15 text-white placeholder:text-teal-100/70 border border-white/20 outline-none focus:bg-white focus:text-[#003B3A]"
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault()
                                                applyBatchFill(
                                                  cols.filter(c => c.track === "TN"),
                                                  (e.target as HTMLInputElement).value
                                                )
                                                ;(e.target as HTMLInputElement).value = ""
                                              }
                                            }}
                                          />
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] text-[#5EEAD4]">XH:</span>
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Enter"
                                            title="Gán nhanh cho 10 XH, 11 XH, 12 XH (nhấn Enter)"
                                            className="w-14 text-center text-[11px] font-semibold py-0.5 px-1.5 rounded bg-white/15 text-white placeholder:text-teal-100/70 border border-white/20 outline-none focus:bg-white focus:text-[#003B3A]"
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault()
                                                applyBatchFill(
                                                  cols.filter(c => c.track === "XH"),
                                                  (e.target as HTMLInputElement).value
                                                )
                                                ;(e.target as HTMLInputElement).value = ""
                                              }
                                            }}
                                          />
                                        </div>
                                      </>
                                    )}

                                    <span className="px-2.5 py-0.5 rounded-md bg-[#00A19A] text-white text-xs font-bold">
                                      Tổng: {groupTotal} tiết
                                    </span>
                                    {showTeacherSplitEditor && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] text-[#5EEAD4]">GVNN cả bậc:</span>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="VD: 4 + Enter"
                                          title="Nhập nhanh số tiết GVNN cho toàn bậc (số tiết GVVN tự động = Tổng tiết - GVNN)"
                                          className="w-20 text-center text-[11px] font-semibold py-0.5 px-1.5 rounded bg-white/15 text-white placeholder:text-teal-100/70 border border-white/20 outline-none focus:bg-white focus:text-[#003B3A]"
                                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault()
                                              applyBatchGvnnFill(cols, (e.target as HTMLInputElement).value)
                                              ;(e.target as HTMLInputElement).value = ""
                                            }
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className={`p-3 grid grid-cols-2 sm:grid-cols-3 ${
                                    cols.length === 6
                                      ? "md:grid-cols-7"
                                      : cols.length === 5
                                      ? "md:grid-cols-6"
                                      : "md:grid-cols-5"
                                  } gap-2.5 items-end`}
                                >
                                  {cols.map(col => {
                                    const inputKey = `${activeTab}-${col.field}`
                                    const numVal = getSlotNumericValue(q, col)
                                    const isStarred = numVal > 0 && hasSlotStar(q, col.key)
                                    const formattedValue =
                                      rawInputs[inputKey] !== undefined
                                        ? rawInputs[inputKey]
                                        : numVal > 0
                                        ? `${numVal}${isStarred ? "*" : ""}`
                                        : ""

                                    return (
                                      <div key={col.key} className="space-y-1">
                                        <div className="flex items-center justify-between gap-1 px-0.5">
                                          <label
                                            className={`text-[11px] font-semibold ${
                                              col.track === "XH"
                                                ? "text-[#00736E]"
                                                : col.track === "TN"
                                                ? "text-[#003B3A]"
                                                : "text-slate-600"
                                            }`}
                                          >
                                            {col.fullLabel}
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => toggleSlotStar(col)}
                                            title={
                                              isStarred
                                                ? "Bỏ đánh dấu tiết đặc thù (*)"
                                                : "Đánh dấu tiết đặc thù (VD: 2* — học theo nhóm lựa chọn / lớp ghép, vẫn tính đủ tiết)"
                                            }
                                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border transition-colors cursor-pointer leading-tight ${
                                              isStarred
                                                ? "bg-amber-100 text-[#92400E] border-amber-300"
                                                : "bg-slate-100 text-slate-400 hover:text-[#D97706] hover:border-amber-200 border-slate-200"
                                            }`}
                                          >
                                            *
                                          </button>
                                        </div>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formattedValue}
                                            onChange={e => {
                                              const raw = e.target.value
                                              if (
                                                raw !== "" &&
                                                !/^[0-9]*[.,]?[0-9]*\*?$/.test(raw)
                                              )
                                                return
                                              setRawInputs(prev => ({ ...prev, [inputKey]: raw }))
                                              const hasStar = raw.endsWith("*")
                                              const cleanStr = raw.replace(/\*/g, "").replace(",", ".")
                                              if (raw === "" || cleanStr === "") {
                                                updateQuota(col.field, 0, undefined, {
                                                  key: col.key,
                                                  starred: false
                                                })
                                              } else {
                                                const parsed = parseFloat(cleanStr)
                                                if (!isNaN(parsed)) {
                                                  updateQuota(col.field, parsed, undefined, {
                                                    key: col.key,
                                                    starred: hasStar
                                                  })
                                                }
                                              }
                                            }}
                                            onFocus={e => e.target.select()}
                                            onBlur={e => {
                                              const raw = e.target.value.trim()
                                              const hasStar =
                                                raw.endsWith("*") ||
                                                (raw !== "" && hasSlotStar(q, col.key) && !raw.includes("*"))
                                              const cleanStr = raw.replace(/\*/g, "").replace(",", ".")
                                              const parsed = parseFloat(cleanStr)
                                              const finalNum = isNaN(parsed) ? 0 : parsed
                                              const explicitTypedWithoutStar =
                                                rawInputs[inputKey] !== undefined &&
                                                !rawInputs[inputKey].endsWith("*")
                                              const finalStar =
                                                finalNum > 0 &&
                                                (raw.endsWith("*") ||
                                                  (!explicitTypedWithoutStar && hasStar))
                                              updateQuota(col.field, finalNum, undefined, {
                                                key: col.key,
                                                starred: finalStar
                                              })
                                              setRawInputs(prev => {
                                                const next = { ...prev }
                                                delete next[inputKey]
                                                return next
                                              })
                                            }}
                                            placeholder="0"
                                            className={`w-full text-center text-sm font-bold py-2 px-2 rounded-lg border outline-none transition-colors ${
                                              isStarred
                                                ? "border-amber-300 bg-amber-50/50 text-[#92400E] focus:bg-white focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/15"
                                                : "border-[#E2E8F0] bg-[#F8FAFC] text-[#003B3A] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15"
                                            }`}
                                          />
                                        </div>
                                        {showTeacherSplitEditor && numVal > 0 && (() => {
                                          const sp = getSlotSplitEntry(q, col)
                                          const vnRawKey = `${activeTab}-split-${col.field}-gvvn`
                                          const nnRawKey = `${activeTab}-split-${col.field}-gvnn`
                                          return (
                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                              <div>
                                                <span className="block text-[10px] font-semibold text-slate-500 text-center">
                                                  GVVN
                                                </span>
                                                <input
                                                  type="text"
                                                  inputMode="decimal"
                                                  value={
                                                    rawInputs[vnRawKey] !== undefined
                                                      ? rawInputs[vnRawKey]
                                                      : sp
                                                        ? String(sp.gvvn)
                                                        : ""
                                                  }
                                                  onChange={e => {
                                                    const raw = e.target.value
                                                    if (raw !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(raw)) return
                                                    setRawInputs(prev => ({ ...prev, [vnRawKey]: raw }))
                                                    if (!raw.endsWith(".") && !raw.endsWith(",")) {
                                                      updateSlotSplit(col, "gvvn", raw)
                                                    }
                                                  }}
                                                  onBlur={e => {
                                                    updateSlotSplit(col, "gvvn", e.target.value)
                                                    setRawInputs(prev => {
                                                      const next = { ...prev }
                                                      delete next[vnRawKey]
                                                      return next
                                                    })
                                                  }}
                                                  placeholder="VN"
                                                  className="w-full text-center text-[11px] font-semibold py-1 px-1 rounded border border-teal-200 bg-[#F0FDFA] text-[#003B3A] focus:bg-white focus:border-[#00A19A] outline-none"
                                                />
                                              </div>
                                              <div>
                                                <span className="block text-[10px] font-semibold text-[#059669] text-center">
                                                  GVNN
                                                </span>
                                                <input
                                                  type="text"
                                                  inputMode="decimal"
                                                  value={
                                                    rawInputs[nnRawKey] !== undefined
                                                      ? rawInputs[nnRawKey]
                                                      : sp
                                                        ? String(sp.gvnn)
                                                        : ""
                                                  }
                                                  onChange={e => {
                                                    const raw = e.target.value
                                                    if (raw !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(raw)) return
                                                    setRawInputs(prev => ({ ...prev, [nnRawKey]: raw }))
                                                    if (!raw.endsWith(".") && !raw.endsWith(",")) {
                                                      updateSlotSplit(col, "gvnn", raw)
                                                    }
                                                  }}
                                                  onBlur={e => {
                                                    updateSlotSplit(col, "gvnn", e.target.value)
                                                    setRawInputs(prev => {
                                                      const next = { ...prev }
                                                      delete next[nnRawKey]
                                                      return next
                                                    })
                                                  }}
                                                  placeholder="NN"
                                                  className="w-full text-center text-[11px] font-semibold py-1 px-1 rounded border border-emerald-200 bg-emerald-50/70 text-[#059669] focus:bg-white focus:border-[#059669] outline-none"
                                                />
                                              </div>
                                            </div>
                                          )
                                        })()}
                                      </div>
                                    )
                                  })}

                                  <div className="space-y-1">
                                    <span className="block text-[11px] font-semibold text-[#00736E] text-center">
                                      Tổng bậc
                                    </span>
                                    <div className="w-full text-center text-sm font-bold py-2 px-2 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#003B3A]">
                                      {groupTotal} tiết
                                    </div>
                                  </div>
                                </div>

                                {isHighGroup && (
                                  <div className="px-3.5 py-2 bg-[#F8FAFC] border-t border-[#F1F5F9] text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                                    <span>
                                      Gõ trực tiếp <strong className="text-slate-700">2*</strong> hoặc bấm nút <strong className="text-[#92400E]">[*]</strong> để đánh dấu tiết đặc thù (nhóm học sinh lựa chọn / học ghép — vẫn cộng đủ số tiết vào tổng).
                                    </span>
                                    <span>
                                      <strong className="text-[#003B3A]">TN</strong>: Tự nhiên · <strong className="text-[#00736E]">XH</strong>: Xã hội
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          }

                          return (
                            <div className="p-4 space-y-3">
                              {showPrimary &&
                                renderColumnGroup("Bậc Tiểu học (Khối 1–5)", PRIMARY_QUOTA_COLS)}
                              {showMiddle &&
                                renderColumnGroup("Bậc THCS (Khối 6–9)", MIDDLE_QUOTA_COLS)}
                              {showHigh &&
                                renderColumnGroup(
                                  "Bậc THPT — Tổ hợp Tự nhiên (TN) & Xã hội (XH)",
                                  HIGH_QUOTA_COLS,
                                  true
                                )}

                              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F0FDFA] border border-teal-200 text-xs tabular-nums">
                                <span className="font-semibold text-[#003B3A]">
                                  Tổng số tiết toàn cấp của môn học ({activeTab}):
                                </span>
                                <span className="text-sm font-bold text-[#003B3A]">
                                  {totalAllActive} tiết
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-[#CBD5E1] p-4 text-xs text-slate-500">
                      Chọn ít nhất một <strong className="text-slate-700">Hệ đào tạo áp dụng</strong> ở mục 1 để cấu hình số tiết/tuần theo từng khối.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-white border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 bg-white border border-[#E2E8F0] rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !formData.code.trim() || !formData.name.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#00736E] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading
                  ? "Đang lưu thay đổi..."
                  : isPureKsdvModal
                  ? "Lưu tag map điểm KSĐV"
                  : "Lưu thông tin môn học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
