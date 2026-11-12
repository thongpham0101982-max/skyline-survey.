"use client"
import React, { useState, useMemo } from "react"
import {
  Plus, Edit2, Trash2, CheckCircle2, X, CalendarDays,
  BookOpen, Layers, Search, Award, MessageSquare,
  CheckSquare, SlidersHorizontal, GitBranch, RotateCcw
} from "lucide-react"
import {
  createSubject,
  updateSubject,
  deleteSubject,
  deleteMultipleSubjects,
  bulkUpdateSubjects
} from "./actions"

const DEFAULT_QUOTA = {
  quotaPrimary: 0, quotaMiddle: 0, quotaHigh: 0,
  quotaG1: 0, quotaG2: 0, quotaG3: 0, quotaG4: 0, quotaG5: 0,
  quotaG6: 0, quotaG7: 0, quotaG8: 0, quotaG9: 0,
  quotaG10: 0, quotaG11: 0, quotaG12: 0
}

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

export const CATEGORIES_CONFIG = [
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
  },
  {
    id: "KSDV",
    label: "Khảo sát đầu vào (KSĐV)",
    shortLabel: "KSĐV",
    icon: CheckSquare,
    desc: "Môn đánh giá năng lực đầu vào và xếp lớp",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200"
  }
]

const STUDY_PROGRAMS = ["Hệ S", "Hệ Song Bằng", "Hệ S Quốc tế"]

type ViewMode = "K12_MATRIX" | "PRIMARY" | "MIDDLE" | "HIGH" | "SPLIT_LEVELS"

const LEVEL_META: Record<string, { short: string; full: string; grades: number[] }> = {
  PRIMARY: { short: "Tiểu học", full: "Bậc Tiểu học (Khối 1–5)", grades: [1, 2, 3, 4, 5] },
  MIDDLE: { short: "THCS", full: "Bậc THCS (Khối 6–9)", grades: [6, 7, 8, 9] },
  HIGH: { short: "THPT", full: "Bậc THPT (Khối 10–12)", grades: [10, 11, 12] }
}

function roundQuota(val: number): number {
  return Math.round((val || 0) * 100) / 100
}

function sumGrades(quota: any, grades: number[]): number {
  if (!quota) return 0
  return roundQuota(grades.reduce((acc, g) => acc + (Number(quota[`quotaG${g}`]) || 0), 0))
}

function subjectMatchesLevel(levelStr: string | null | undefined, targetLevel: "PRIMARY" | "MIDDLE" | "HIGH"): boolean {
  if (!levelStr || levelStr === "ALL") return true
  return levelStr.includes(targetLevel)
}

export function SubjectsClient({ initialSubjects, years, defaultYearId }: any) {
  const [subjects, setSubjects] = useState<any[]>(initialSubjects || [])
  const safeYears = years || []
  const [selectedYearId, setSelectedYearId] = useState<string>(defaultYearId || safeYears[0]?.id || "")

  // View mode & filters
  const [viewMode, setViewMode] = useState<ViewMode>("K12_MATRIX")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("ALL_CATEGORIES")
  const [filterEvalType, setFilterEvalType] = useState("ALL_EVALS")
  const [filterProgram, setFilterProgram] = useState("ALL_PROGRAMS")
  const [filterParent, setFilterParent] = useState("ALL_RELATIONS")

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
    category: "MOET",
    evaluationType: "SCORE",
    quotasByProgram: {} as Record<string, typeof DEFAULT_QUOTA>
  })
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})

  // Map subjects by id for live parent/children lookup
  const subjectById = useMemo(() => {
    const map = new Map<string, any>()
    subjects.forEach((s: any) => map.set(s.id, s))
    return map
  }, [subjects])

  const childCountById = useMemo(() => {
    const counts = new Map<string, number>()
    subjects.forEach((s: any) => {
      if (s.parentId) {
        counts.set(s.parentId, (counts.get(s.parentId) || 0) + 1)
      }
    })
    return counts
  }, [subjects])

  const activeParentSubjects = useMemo(() => {
    return subjects.filter((s: any) => (childCountById.get(s.id) || 0) > 0)
  }, [subjects, childCountById])

  // Ledger summary metrics
  const stats = useMemo(() => {
    const total = subjects.length
    const subCount = subjects.filter((s: any) => Boolean(s.parentId)).length
    const rootCount = total - subCount
    const scoreCount = subjects.filter((s: any) => (s.evaluationType || "SCORE") === "SCORE").length
    const gradeCount = subjects.filter((s: any) => s.evaluationType === "GRADE").length
    const commentCount = subjects.filter((s: any) => s.evaluationType === "COMMENT").length

    const moet = subjects.filter((s: any) => (s.category || "MOET").includes("MOET")).length
    const skl = subjects.filter((s: any) => s.category?.includes("SKL")).length
    const bilingual = subjects.filter((s: any) => s.category?.includes("BILINGUAL") || s.category === "INTERNATIONAL").length
    const ksdv = subjects.filter((s: any) => s.category?.includes("KSDV")).length

    return { total, rootCount, subCount, scoreCount, gradeCount, commentCount, moet, skl, bilingual, ksdv }
  }, [subjects])

  const startEdit = (s?: any) => {
    setRawInputs({})
    if (s) {
      const progs = s.studyPrograms
        ? s.studyPrograms.split(",").map((p: string) => p.trim()).filter(Boolean)
        : ["DEFAULT"]
      const cleanProgs = progs.length > 0 ? progs : ["Hệ S"]
      const qByProg: Record<string, any> = {}
      cleanProgs.forEach((p: string) => {
        const found = s.quotas?.find(
          (q: any) =>
            q.academicYearId === selectedYearId &&
            (q.studyProgram === p || (!q.studyProgram && p === "DEFAULT"))
        )
        qByProg[p] = found ? { ...DEFAULT_QUOTA, ...found } : { ...DEFAULT_QUOTA }
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
        studyPrograms: cleanProgs.filter((p: string) => p !== "DEFAULT").length > 0
          ? cleanProgs.filter((p: string) => p !== "DEFAULT")
          : cleanProgs,
        parentId: s.parentId || "",
        category: s.category || "MOET",
        evaluationType: s.evaluationType || "SCORE",
        quotasByProgram: qByProg
      })
      const firstTab = cleanProgs.find((p: string) => p !== "DEFAULT") || cleanProgs[0] || ""
      setActiveTab(firstTab)
    } else {
      const initialProg =
        filterProgram !== "ALL_PROGRAMS" && filterProgram !== "DEFAULT" ? filterProgram : "Hệ S"
      const initialLevels =
        viewMode === "PRIMARY"
          ? ["PRIMARY"]
          : viewMode === "MIDDLE"
          ? ["MIDDLE"]
          : viewMode === "HIGH"
          ? ["HIGH"]
          : ["PRIMARY", "MIDDLE", "HIGH"]

      setFormData({
        id: "new",
        code: "",
        name: "",
        levels: initialLevels,
        desc: "",
        studyPrograms: [initialProg],
        parentId:
          filterParent !== "ALL_RELATIONS" &&
          filterParent !== "ROOT_ONLY" &&
          filterParent !== "CHILD_ONLY"
            ? filterParent
            : "",
        category: filterCategory !== "ALL_CATEGORIES" ? filterCategory : "MOET",
        evaluationType: filterEvalType !== "ALL_EVALS" ? filterEvalType : "SCORE",
        quotasByProgram: { [initialProg]: { ...DEFAULT_QUOTA } }
      })
      setActiveTab(initialProg)
    }
    setIsModalOpen(true)
  }

  const cancelEdit = () => setIsModalOpen(false)

  const handleProgramToggle = (prog: string, checked: boolean) => {
    setFormData(prev => {
      const baseProgs = prev.studyPrograms.filter(p => p !== "DEFAULT")
      const newProgs = checked ? [...baseProgs, prog] : baseProgs.filter(p => p !== prog)
      const newQuotas = { ...prev.quotasByProgram }
      if (checked && !newQuotas[prog]) {
        newQuotas[prog] = { ...DEFAULT_QUOTA }
      }
      return { ...prev, studyPrograms: newProgs, quotasByProgram: newQuotas }
    })
    if (checked && !formData.studyPrograms.includes(prog)) setActiveTab(prog)
    if (!checked && activeTab === prog) {
      const remaining = formData.studyPrograms.filter(p => p !== prog && p !== "DEFAULT")
      setActiveTab(remaining[0] || "")
    }
  }

  const updateQuota = (field: string, val: number, targetProg?: string) => {
    const progKey = targetProg || activeTab
    if (!progKey) return
    setFormData(prev => {
      const current = prev.quotasByProgram[progKey] || { ...DEFAULT_QUOTA }
      const q: any = { ...current, [field]: val }
      q.quotaPrimary = roundQuota(q.quotaG1 + q.quotaG2 + q.quotaG3 + q.quotaG4 + q.quotaG5)
      q.quotaMiddle = roundQuota(q.quotaG6 + q.quotaG7 + q.quotaG8 + q.quotaG9)
      q.quotaHigh = roundQuota(q.quotaG10 + q.quotaG11 + q.quotaG12)
      return { ...prev, quotasByProgram: { ...prev.quotasByProgram, [progKey]: q } }
    })
  }

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      alert("Vui lòng nhập đầy đủ Mã môn học và Tên môn học.")
      return
    }
    setLoading(true)
    const cleanProgs = formData.studyPrograms.filter(p => p && p !== "DEFAULT")
    const quotasArr = cleanProgs.map(prog => ({
      academicYearId: selectedYearId,
      studyProgram: prog,
      ...(formData.quotasByProgram[prog] || { ...DEFAULT_QUOTA })
    }))

    const levelPayload =
      formData.levels.length === 0 || formData.levels.length === 3
        ? "PRIMARY, MIDDLE, HIGH"
        : formData.levels.join(", ")

    const pId = formData.parentId || null
    const progsStr = cleanProgs.join(", ")

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
            formData.category,
            formData.evaluationType
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
            formData.category,
            formData.evaluationType
          )

    if (res.success) {
      window.location.reload()
    } else {
      alert("Không thể lưu môn học: " + res.error)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xác nhận xóa môn học "${name}"? Thao tác này không thể hoàn tác.`)) return
    const res = await deleteSubject(id)
    if (res.success) {
      setSubjects(prev => prev.filter((s: any) => s.id !== id))
      setSelectedSubjectIds(prev => prev.filter(item => item !== id))
    } else {
      alert("Không thể xóa môn học: " + res.error)
    }
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

  const handleBulkUpdate = async (payload: {
    evaluationType?: string
    category?: string
    level?: string
    parentId?: string | null
  }) => {
    if (selectedSubjectIds.length === 0) return
    setLoading(true)
    const res = await bulkUpdateSubjects(selectedSubjectIds, payload)
    if (res.success) {
      setSubjects(prev =>
        prev.map((s: any) =>
          selectedSubjectIds.includes(s.id)
            ? {
                ...s,
                ...(payload.evaluationType ? { evaluationType: payload.evaluationType } : {}),
                ...(payload.category ? { category: payload.category } : {}),
                ...(payload.level ? { level: payload.level } : {}),
                ...(payload.parentId !== undefined ? { parentId: payload.parentId } : {})
              }
            : s
        )
      )
    } else {
      alert("Không thể cập nhật hàng loạt: " + res.error)
    }
    setLoading(false)
  }

  // Filter subjects
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return subjects.filter((s: any) => {
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

      const progs = s.studyPrograms
        ? s.studyPrograms.split(",").map((p: string) => p.trim()).filter(Boolean)
        : ["DEFAULT"]
      const normalizedProgs = progs.length > 0 ? progs : ["DEFAULT"]
      const matchProgram =
        filterProgram === "ALL_PROGRAMS" || normalizedProgs.includes(filterProgram)

      const rawCat = s.category || "MOET"
      const matchCategory =
        filterCategory === "ALL_CATEGORIES" ||
        rawCat.includes(filterCategory) ||
        (filterCategory === "BILINGUAL" && rawCat === "INTERNATIONAL")

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

      return matchSearch && matchLevel && matchProgram && matchCategory && matchEval && matchParent
    })
  }, [subjects, searchQuery, viewMode, filterProgram, filterCategory, filterEvalType, filterParent, subjectById])

  // Order subjects as Parent -> Child tree
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

    // Append orphan children (when parent is filtered out)
    children.forEach((c: any) => {
      if (!placedIds.has(c.id)) ordered.push(c)
    })

    return ordered
  }, [filteredSubjects])

  // Build grouped subject blocks with per-program rows
  const buildSubjectGroups = (subjectList: any[]) => {
    return subjectList
      .map((s: any) => {
        const rawProgs = s.studyPrograms
          ? s.studyPrograms.split(",").map((p: string) => p.trim()).filter(Boolean)
          : []
        const progs = rawProgs.length > 0 ? rawProgs : ["DEFAULT"]
        const visibleProgs = progs.filter(
          (p: string) => filterProgram === "ALL_PROGRAMS" || filterProgram === p
        )
        const programRows = visibleProgs.map((p: string) => {
          const quota =
            s.quotas?.find(
              (q: any) =>
                q.academicYearId === selectedYearId &&
                (q.studyProgram === p || (!q.studyProgram && p === "DEFAULT"))
            ) || { ...DEFAULT_QUOTA }
          return { program: p, quota }
        })
        return { subject: s, programRows }
      })
      .filter(g => g.programRows.length > 0)
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    filterCategory !== "ALL_CATEGORIES" ||
    filterEvalType !== "ALL_EVALS" ||
    filterProgram !== "ALL_PROGRAMS" ||
    filterParent !== "ALL_RELATIONS"

  const clearAllFilters = () => {
    setSearchQuery("")
    setFilterCategory("ALL_CATEGORIES")
    setFilterEvalType("ALL_EVALS")
    setFilterProgram("ALL_PROGRAMS")
    setFilterParent("ALL_RELATIONS")
  }

  // Render helpers
  const renderCategoryBadges = (cat?: string) => {
    const raw = cat || "MOET"
    const parts = raw.split(",").map(p => p.trim()).filter(Boolean)
    return (
      <div className="flex flex-wrap items-center gap-1">
        {parts.map(c => {
          const found =
            CATEGORIES_CONFIG.find(item => item.id === c) ||
            (c === "INTERNATIONAL" ? CATEGORIES_CONFIG.find(item => item.id === "BILINGUAL") : null) ||
            CATEGORIES_CONFIG[0]
          return (
            <span
              key={c}
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${found.badgeClass}`}
            >
              {found.shortLabel}
            </span>
          )
        })}
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
    const childrenCount = childCountById.get(s.id) || 0
    if (childrenCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#003B3A] border border-slate-200 text-[11px] font-semibold tabular-nums">
          Môn cha ({childrenCount} môn con)
        </span>
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
    const style =
      prog === "Hệ S"
        ? "bg-[#F0FDFA] text-[#003B3A] border-teal-200"
        : prog === "Hệ Song Bằng"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-800 border-amber-200"

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${style}`}>
        {prog}
      </span>
    )
  }

  // Academic Ledger Table renderer
  const renderLedgerTable = (
    title: string,
    subtitle: string,
    groups: Array<{ subject: any; programRows: Array<{ program: string; quota: any }> }>,
    grades: number[],
    isFullK12Matrix = false
  ) => {
    if (groups.length === 0) return null

    const visibleSubjectIds = groups.map(g => g.subject.id)
    const isAllVisibleSelected =
      visibleSubjectIds.length > 0 &&
      visibleSubjectIds.every(id => selectedSubjectIds.includes(id))

    const allFlatRows = groups.flatMap(g =>
      g.programRows.map(pr => ({ subject: g.subject, program: pr.program, quota: pr.quota }))
    )

    // Compute vertical totals per grade & grand total
    const computeTotalsForRows = (rowsSubset: typeof allFlatRows) => {
      const byGrade: Record<number, number> = {}
      grades.forEach(g => {
        byGrade[g] = roundQuota(
          rowsSubset.reduce((sum, r) => sum + (Number(r.quota[`quotaG${g}`]) || 0), 0)
        )
      })
      const grandTotal = roundQuota(Object.values(byGrade).reduce((a, b) => a + b, 0))
      return { byGrade, grandTotal }
    }

    const overallTotals = computeTotalsForRows(allFlatRows)

    // Per-program totals when viewing all programs
    const programBreakdown =
      filterProgram === "ALL_PROGRAMS"
        ? STUDY_PROGRAMS.map(prog => {
            const subRows = allFlatRows.filter(r => r.program === prog)
            const totals = computeTotalsForRows(subRows)
            return { program: prog, count: subRows.length, ...totals }
          }).filter(item => item.count > 0 && item.grandTotal > 0)
        : []

    return (
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#003B3A] flex items-center gap-2">
              <span>{title}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-teal-200 tabular-nums">
                {groups.length} môn học
              </span>
            </h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="text-slate-500 font-medium">Tổng phân bổ trên bảng:</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white font-semibold">
              {overallTotals.grandTotal} tiết
            </span>
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
                      <th rowSpan={2} className="py-2.5 px-3 text-teal-100 min-w-[115px] align-middle">
                        Hệ đào tạo
                      </th>
                      <th colSpan={5} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/15 bg-white/5">
                        Bậc Tiểu học (Khối 1–5)
                      </th>
                      <th colSpan={4} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/15 bg-white/[0.02]">
                        Bậc THCS (Khối 6–9)
                      </th>
                      <th colSpan={3} className="py-1.5 px-2 text-center text-teal-100 border-l border-white/15 bg-white/5">
                        Bậc THPT (Khối 10–12)
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-center text-[#5EEAD4] border-l border-white/15 min-w-[110px] align-middle">
                        Tổng tiết theo khối
                      </th>
                      <th rowSpan={2} className="py-2.5 px-3 text-right text-white w-[76px] align-middle">
                        Thao tác
                      </th>
                    </tr>
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      {grades.map(g => (
                        <th
                          key={g}
                          className={`py-2 px-1.5 text-center text-teal-100 min-w-[36px] ${
                            g === 1 || g === 6 || g === 10 ? "border-l border-white/15" : ""
                          }`}
                        >
                          K{g}
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
                    <th className="py-3 px-3 text-teal-100 min-w-[120px]">Hệ đào tạo</th>
                    {grades.map(g => (
                      <th key={g} className="py-3 px-2.5 text-center text-teal-100 min-w-[56px] border-l border-white/10">
                        Khối {g}
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
                {groups.map(({ subject: s, programRows }) => {
                  const isSelected = selectedSubjectIds.includes(s.id)
                  const span = programRows.length
                  const isChild = Boolean(s.parentId)

                  return programRows.map((pr, pIdx) => {
                    const rowTotal = sumGrades(pr.quota, grades)
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
                          </>
                        )}

                        <td className="py-2.5 px-3 align-middle">
                          {renderProgramBadge(pr.program)}
                        </td>

                        {grades.map(g => {
                          const val = Number(pr.quota[`quotaG${g}`]) || 0
                          const groupDivider =
                            isFullK12Matrix && (g === 1 || g === 6 || g === 10)
                              ? "border-l border-[#E2E8F0]"
                              : !isFullK12Matrix
                              ? "border-l border-[#F1F5F9]"
                              : ""

                          return (
                            <td key={g} className={`py-2.5 px-1.5 text-center align-middle ${groupDivider}`}>
                              {val > 0 ? (
                                <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-[#F0FDFA] text-[#003B3A] border border-teal-200 font-semibold text-xs">
                                  {val}
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
                                className="p-1.5 text-slate-500 hover:text-[#00736E] hover:bg-[#F0FDFA] rounded-lg transition-colors"
                                title="Chỉnh sửa môn học & số tiết"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id, s.subjectName)}
                                className="p-1.5 text-slate-500 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors"
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

              {/* Footer: Tổng số tiết theo từng Khối */}
              <tfoot className="bg-[#F8FAFC] border-t-2 border-[#003B3A]/20 text-xs tabular-nums">
                {(programBreakdown.length > 1 ||
                  (programBreakdown.length === 1 &&
                    programBreakdown[0].grandTotal !== overallTotals.grandTotal)) &&
                  programBreakdown.map(pb => (
                    <tr key={pb.program} className="border-b border-[#E2E8F0] text-slate-600">
                      <td colSpan={6} className="py-2 px-3 text-right font-medium">
                        Tổng số tiết theo khối — <span className="font-semibold text-[#003B3A]">{pb.program}</span>:
                      </td>
                      {grades.map(g => (
                        <td
                          key={g}
                          className={`py-2 px-1.5 text-center font-semibold ${
                            pb.byGrade[g] > 0 ? "text-[#00736E]" : "text-slate-300"
                          } ${isFullK12Matrix && (g === 1 || g === 6 || g === 10) ? "border-l border-[#E2E8F0]" : ""}`}
                        >
                          {pb.byGrade[g] > 0 ? pb.byGrade[g] : "–"}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-center font-bold text-[#003B3A] border-l border-[#E2E8F0] bg-[#F0FDFA]/50 whitespace-nowrap">
                        {pb.grandTotal} tiết
                      </td>
                      <td className="py-2 px-3" />
                    </tr>
                  ))}

                <tr className="bg-[#F0FDFA]/70 text-[#003B3A] font-bold">
                  <td colSpan={6} className="py-3 px-3 text-right">
                    {filterProgram === "ALL_PROGRAMS"
                      ? "Tổng cộng số tiết phân bổ theo khối (tất cả hệ đang hiển thị):"
                      : `Tổng số tiết theo khối (${filterProgram === "DEFAULT" ? "Chưa phân hệ" : filterProgram}):`}
                  </td>
                  {grades.map(g => (
                    <td
                      key={g}
                      className={`py-3 px-1.5 text-center ${
                        overallTotals.byGrade[g] > 0 ? "text-[#003B3A]" : "text-slate-400 font-normal"
                      } ${isFullK12Matrix && (g === 1 || g === 6 || g === 10) ? "border-l border-teal-200" : ""}`}
                    >
                      {overallTotals.byGrade[g] > 0 ? overallTotals.byGrade[g] : "–"}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-center border-l border-teal-200 bg-[#003B3A] text-[#5EEAD4] whitespace-nowrap">
                    {overallTotals.grandTotal} tiết
                  </td>
                  <td className="py-3 px-3 bg-white" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const parentCandidates = subjects.filter((s: any) => !s.parentId && s.id !== formData.id)

  // Groups per view mode
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

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto pb-12">
      {/* Masthead chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#003B3A] tracking-tight">
            Danh mục & định mức tiết môn học
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Quản lý bậc học, danh mục chương trình, quan hệ môn cha – môn con, hình thức đánh giá (Thông tư 27 & 22 BGD&ĐT) và số tiết theo khối
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
            onClick={() => startEdit()}
            className="px-4 py-2.5 bg-[#003B3A] hover:bg-[#00736E] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm môn học</span>
          </button>
        </div>
      </div>

      {/* Unified Academic Ledger Strip (tổng quan nhanh & bấm để lọc trực tiếp) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] tabular-nums">
        {/* Khối 1: Tổng số môn & quan hệ môn cha */}
        <div className="lg:col-span-3 p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-500">Tổng danh mục môn</div>
            <div className="text-2xl font-bold text-[#003B3A] mt-0.5">{stats.total} môn</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.rootCount} môn chính · {stats.subCount} môn thành phần
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#003B3A] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Khối 2: Phân bổ theo Danh mục môn học */}
        <div className="lg:col-span-5 p-4 flex flex-col justify-center">
          <div className="text-xs font-medium text-slate-500 mb-2">Danh mục môn học (bấm để lọc nhanh)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "MOET", label: "Theo Bộ GD&ĐT", count: stats.moet },
              { id: "SKL", label: "Sky-Line", count: stats.skl },
              { id: "BILINGUAL", label: "Song ngữ", count: stats.bilingual },
              { id: "KSDV", label: "KSĐV", count: stats.ksdv }
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

      {/* Thanh công cụ thao tác hàng loạt khi chọn môn */}
      {selectedSubjectIds.length > 0 && (
        <div className="bg-[#003B3A] text-white p-3.5 sm:px-5 rounded-2xl shadow-md border border-[#003B3A] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 tabular-nums">
            <span className="px-2.5 py-1 rounded-lg bg-[#00A19A] text-white font-bold text-xs">
              Đã chọn {selectedSubjectIds.length} môn
            </span>
            <span className="text-xs text-teal-100">
              Cập nhật nhanh bậc học, danh mục, môn cha hoặc hình thức đánh giá
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <select
              onChange={e => {
                if (e.target.value) handleBulkUpdate({ category: e.target.value })
                e.target.value = ""
              }}
              className="bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl outline-none border border-white/20 cursor-pointer"
            >
              <option value="" className="text-slate-800">Đổi danh mục môn...</option>
              <option value="MOET" className="text-slate-800">Theo Bộ GD&ĐT</option>
              <option value="SKL" className="text-slate-800">Đặc thù Sky-Line</option>
              <option value="BILINGUAL" className="text-slate-800">Song ngữ & Quốc tế</option>
              <option value="KSDV" className="text-slate-800">Khảo sát đầu vào (KSĐV)</option>
              <option value="MOET, KSDV" className="text-slate-800">Bộ GD&ĐT & KSĐV</option>
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
              {subjects
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
        {/* Hàng 1: Segmented Control chọn Bậc học */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            {[
              { id: "K12_MATRIX", label: "Tổng quan K–12 (Khối 1–12)" },
              { id: "PRIMARY", label: "Bậc Tiểu học (Khối 1–5)" },
              { id: "MIDDLE", label: "Bậc THCS (Khối 6–9)" },
              { id: "HIGH", label: "Bậc THPT (Khối 10–12)" },
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E11D48] bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* Hàng 2: Tìm kiếm + 4 bộ lọc chuyên môn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã môn, tên môn hoặc môn cha..."
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
              <option value="ALL_CATEGORIES">Tất cả danh mục</option>
              <option value="MOET">Theo Bộ GD&ĐT</option>
              <option value="SKL">Đặc thù Sky-Line</option>
              <option value="BILINGUAL">Song ngữ & Quốc tế</option>
              <option value="KSDV">Khảo sát đầu vào (KSĐV)</option>
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
              <option value="ALL_PROGRAMS">Tất cả hệ đào tạo</option>
              {STUDY_PROGRAMS.map(prog => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
              <option value="DEFAULT">Chưa phân hệ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Khu vực Bảng Sổ cái Học thuật */}
      <div className="space-y-6">
        {viewMode === "K12_MATRIX" &&
          renderLedgerTable(
            "Bảng tổng quan chương trình & định mức tiết K–12",
            "Đối chiếu xuyên suốt từ Khối 1 đến Khối 12 cùng tổng số tiết theo từng khối",
            fullK12Groups,
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            true
          )}

        {viewMode === "PRIMARY" &&
          renderLedgerTable(
            "Bậc Tiểu học (Khối 1–5)",
            "Định mức tiết và hình thức đánh giá theo Thông tư 27/2020/TT-BGDĐT",
            primaryGroups,
            [1, 2, 3, 4, 5]
          )}

        {viewMode === "MIDDLE" &&
          renderLedgerTable(
            "Bậc Trung học cơ sở (Khối 6–9)",
            "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
            middleGroups,
            [6, 7, 8, 9]
          )}

        {viewMode === "HIGH" &&
          renderLedgerTable(
            "Bậc Trung học phổ thông (Khối 10–12)",
            "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
            highGroups,
            [10, 11, 12]
          )}

        {viewMode === "SPLIT_LEVELS" && (
          <div className="space-y-8">
            {renderLedgerTable(
              "1. Bậc Tiểu học (Khối 1–5)",
              "Định mức tiết và hình thức đánh giá theo Thông tư 27/2020/TT-BGDĐT",
              primaryGroups,
              [1, 2, 3, 4, 5]
            )}
            {renderLedgerTable(
              "2. Bậc Trung học cơ sở (Khối 6–9)",
              "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
              middleGroups,
              [6, 7, 8, 9]
            )}
            {renderLedgerTable(
              "3. Bậc Trung học phổ thông (Khối 10–12)",
              "Định mức tiết và hình thức đánh giá theo Thông tư 22/2021/TT-BGDĐT",
              highGroups,
              [10, 11, 12]
            )}
          </div>
        )}

        {fullK12Groups.length === 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center">
            <div className="w-12 h-12 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Không có môn học phù hợp với bộ lọc hiện tại
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc danh mục, hình thức đánh giá và hệ đào tạo.
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

      {/* Modal Tạo mới / Chỉnh sửa môn học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/55 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A]">
              <div>
                <h2 className="text-lg font-bold text-[#003B3A]">
                  {formData.id === "new" ? "Thêm môn học mới" : `Chỉnh sửa môn học: ${formData.name}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thiết lập bậc học, danh mục, môn cha, hình thức đánh giá (Thông tư 27 & 22) và số tiết theo khối
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
              {/* Khối 1: Định danh, Bậc - Danh mục môn học & Thuộc môn học (Môn cha) */}
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5">
                  <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#00A19A]" />
                    <span>1. Bậc – Danh mục môn học & Thuộc môn học (Môn cha)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Mã môn học <span className="text-[#E11D48]">*</span>
                    </label>
                    <input
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VD: TOA, NVA, MTU..."
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none font-mono font-semibold text-sm text-[#003B3A] tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tên môn học <span className="text-[#E11D48]">*</span>
                    </label>
                    <input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Toán học, Mĩ thuật, Tiếng Anh..."
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none font-semibold text-sm text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Danh mục môn học
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-xs text-slate-800 cursor-pointer"
                    >
                      <option value="MOET">Chương trình Bộ GD&ĐT (MOET)</option>
                      <option value="SKL">Chương trình Đặc thù Sky-Line</option>
                      <option value="BILINGUAL">Chương trình Song ngữ & Quốc tế</option>
                      <option value="KSDV">Môn Khảo sát đầu vào (KSĐV)</option>
                      <option value="MOET, KSDV">Dùng chung Bộ GD&ĐT & KSĐV</option>
                    </select>
                  </div>

                  <div className="md:col-span-6 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Thuộc môn học (Môn cha)
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#00A19A] outline-none font-semibold text-xs text-slate-800 cursor-pointer"
                    >
                      <option value="">Không chọn — Môn chính độc lập</option>
                      {parentCandidates.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          ↳ {p.subjectName} ({p.subjectCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bậc học & Hệ đào tạo */}
                  <div className="md:col-span-6 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Bậc học áp dụng
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, levels: ["PRIMARY", "MIDDLE", "HIGH"] })}
                        className="text-[11px] font-semibold text-[#00736E] hover:underline cursor-pointer"
                      >
                        Chọn cả 3 bậc
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "PRIMARY", label: "Tiểu học (K1–5)" },
                        { id: "MIDDLE", label: "THCS (K6–9)" },
                        { id: "HIGH", label: "THPT (K10–12)" }
                      ].map(lvl => {
                        const checked = formData.levels.includes(lvl.id) || formData.levels.includes("ALL")
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
                                checked ? "bg-[#003B3A] border-[#003B3A]" : "border-slate-300"
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
                    <label className="block text-xs font-semibold text-slate-700">
                      Hệ đào tạo áp dụng
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STUDY_PROGRAMS.map(prog => {
                        const checked = formData.studyPrograms.includes(prog)
                        return (
                          <label
                            key={prog}
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
                                checked ? "bg-[#003B3A] border-[#003B3A]" : "border-slate-300"
                              }`}
                            >
                              {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                            </span>
                            <span>{prog}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

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
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${type.badgeClass}`}>
                              <Icon className="w-3 h-3" />
                              <span>{type.badgeLabel}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">{type.circularRef}</span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 mb-1">{type.label}</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{type.description}</p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] text-[11px] text-slate-400">
                          VD: {type.examples}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Khối 3: Số tiết theo khối & Tổng số tiết theo khối */}
              {formData.studyPrograms.filter(p => p !== "DEFAULT").length > 0 ? (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
                  <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-[#003B3A] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#00A19A]" />
                        <span>3. Số tiết theo khối & tổng số tiết theo khối</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Nhập số tiết/tuần cho từng khối ở mỗi hệ đào tạo (tự động cộng tổng tiết theo khối)
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 tabular-nums">
                      {formData.studyPrograms
                        .filter(p => p !== "DEFAULT")
                        .map(prog => {
                          const pq = formData.quotasByProgram[prog] || DEFAULT_QUOTA
                          const progTotal = sumGrades(pq, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
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
                                  isActive ? "bg-[#00A19A] text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {progTotal} tiết
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  {activeTab && (() => {
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

                    const totalAllActive = sumGrades(q, [
                      ...(showPrimary ? [1, 2, 3, 4, 5] : []),
                      ...(showMiddle ? [6, 7, 8, 9] : []),
                      ...(showHigh ? [10, 11, 12] : [])
                    ])

                    const renderGradeGroup = (label: string, grades: number[]) => {
                      const groupTotal = sumGrades(q, grades)
                      const fillAll = (val: number) => grades.forEach(g => updateQuota(`quotaG${g}`, val))

                      return (
                        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white tabular-nums">
                          <div className="px-4 py-2.5 bg-[#003B3A] text-white flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{label}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-teal-100">Gán nhanh cả bậc:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Số tiết + Enter"
                                  className="w-24 text-center text-[11px] font-semibold py-0.5 px-2 rounded bg-white/15 text-white placeholder:text-teal-100/70 border border-white/20 outline-none focus:bg-white focus:text-[#003B3A]"
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      const val = parseFloat((e.target as HTMLInputElement).value.replace(",", ".")) || 0
                                      fillAll(val)
                                      ;(e.target as HTMLInputElement).value = ""
                                    }
                                  }}
                                />
                              </div>
                              <span className="px-2.5 py-0.5 rounded-md bg-[#00A19A] text-white text-xs font-bold">
                                Tổng theo khối: {groupTotal} tiết
                              </span>
                            </div>
                          </div>

                          <div
                            className={`p-3 grid grid-cols-2 sm:grid-cols-3 ${
                              grades.length === 5
                                ? "md:grid-cols-6"
                                : grades.length === 4
                                ? "md:grid-cols-5"
                                : "md:grid-cols-4"
                            } gap-2.5 items-end`}
                          >
                            {grades.map(g => {
                              const inputKey = `${activeTab}-quotaG${g}`
                              return (
                                <div key={g} className="space-y-1">
                                  <label className="block text-[11px] font-semibold text-slate-600 text-center">
                                    Khối {g}
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        rawInputs[inputKey] !== undefined
                                          ? rawInputs[inputKey]
                                          : q[`quotaG${g}`]
                                          ? String(q[`quotaG${g}`])
                                          : ""
                                      }
                                      onChange={e => {
                                        const raw = e.target.value
                                        if (raw !== "" && !/^-?[0-9]*[.,]?[0-9]*$/.test(raw)) return
                                        setRawInputs(prev => ({ ...prev, [inputKey]: raw }))
                                        const parsed = parseFloat(raw.replace(",", "."))
                                        if (!isNaN(parsed)) updateQuota(`quotaG${g}`, parsed)
                                        else if (raw === "") updateQuota(`quotaG${g}`, 0)
                                      }}
                                      onFocus={e => e.target.select()}
                                      onBlur={e => {
                                        const parsed = parseFloat(e.target.value.replace(",", "."))
                                        updateQuota(`quotaG${g}`, isNaN(parsed) ? 0 : parsed)
                                        setRawInputs(prev => {
                                          const next = { ...prev }
                                          delete next[inputKey]
                                          return next
                                        })
                                      }}
                                      placeholder="0"
                                      className="w-full text-center text-sm font-bold py-2 px-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 text-[#003B3A] outline-none"
                                    />
                                  </div>
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
                        </div>
                      )
                    }

                    return (
                      <div className="p-4 space-y-3">
                        {showPrimary && renderGradeGroup("Bậc Tiểu học (Khối 1–5)", [1, 2, 3, 4, 5])}
                        {showMiddle && renderGradeGroup("Bậc THCS (Khối 6–9)", [6, 7, 8, 9])}
                        {showHigh && renderGradeGroup("Bậc THPT (Khối 10–12)", [10, 11, 12])}

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
                  Chọn ít nhất một <strong className="text-slate-700">Hệ đào tạo áp dụng</strong> ở mục 1 để cấu hình số tiết/tuần theo từng khối (không bắt buộc đối với môn chỉ phục vụ Khảo sát đầu vào).
                </div>
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
                {loading ? "Đang lưu thay đổi..." : "Lưu thông tin môn học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
