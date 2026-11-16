"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  Star,
  Search,
  Filter,
  Award,
  UserCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRightLeft,
} from "lucide-react"
import {
  createExamAction,
  updateExamAction,
  deleteExamAction,
  bulkAssignExamYearAction,
  cloneExamsToYearAction,
} from "./actions"

const LEVEL_LABELS: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "THCS",
  THPT: "THPT",
  TH_THCS: "Liên cấp TH-THCS",
  THCS_THPT: "Liên cấp THCS-THPT",
  ALL: "Toàn trường",
}

function getLevelLabel(val: string) {
  if (!val) return "Tất cả khối"
  if (val.includes(",") || /^\d+$/.test(val)) {
    return val
      .split(",")
      .map((g: string) => `Khối ${g}`)
      .join(", ")
  }
  return LEVEL_LABELS[val] || val
}

function matchesLevelFilter(examGrade: string, filterVal: string) {
  if (!filterVal) return true
  if (!examGrade) return false
  if (examGrade === filterVal) return true

  const levelGradesMap: Record<string, string[]> = {
    TIEU_HOC: ["1", "2", "3", "4", "5"],
    THCS: ["6", "7", "8", "9"],
    THPT: ["10", "11", "12"],
    TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
    ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  }

  const allowedGrades = levelGradesMap[filterVal]
  if (!allowedGrades) return false

  const examGradesList = examGrade.split(",")
  return examGradesList.some((g) => allowedGrades.includes(g))
}

const generateNextExamCode = (existingExams: any[], yearName?: string) => {
  const match = (yearName || "").match(/(\d{4})/)
  const yearSuffix = match ? match[1].slice(-2) : String(new Date().getFullYear()).slice(-2)
  const prefix = `CT-${yearSuffix}-`

  const codes = existingExams
    .map((e) => e.code || "")
    .filter((code) => code.startsWith(prefix))

  let maxSeq = 0
  for (const code of codes) {
    const seqStr = code.slice(prefix.length)
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  }

  const nextSeqStr = String(maxSeq + 1).padStart(4, "0")
  return `${prefix}${nextSeqStr}`
}

const PLAN_LABELS: Record<string, string> = {
  HE_THONG: "Hệ thống",
  TRUONG: "Trường",
  PHUONG: "Phường",
  SO: "Sở GD&ĐT",
  BO: "Bộ GD&ĐT",
  TU_DANG_KY: "Tự đăng ký",
}

function getExamStatus(startDate: any, endDate: any) {
  if (!startDate && !endDate) {
    return {
      key: "UNSCHEDULED",
      label: "Chưa xếp lịch",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  const now = new Date()
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null

  if (start && now < start) {
    return {
      key: "UPCOMING",
      label: "Sắp diễn ra",
      className: "bg-amber-50 text-[#D97706] border-amber-200",
    }
  }
  if (end && now > end) {
    return {
      key: "ENDED",
      label: "Đã kết thúc",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    }
  }
  return {
    key: "ACTIVE",
    label: "Đang diễn ra",
    className: "bg-emerald-50 text-[#059669] border-emerald-200",
  }
}

interface ExamsClientProps {
  initialExams: any[]
  categories: any[]
  rounds: any[]
  departments: any[]
  academicYears: any[]
  initialYearId?: string
}

export function ExamsClient({
  initialExams,
  categories,
  rounds,
  departments,
  academicYears,
  initialYearId = "",
}: ExamsClientProps) {
  const [yearId, setYearId] = useState<string>(() => {
    if (initialYearId) return initialYearId
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : academicYears[0]?.id || ""
  })

  // Đồng bộ năm học với bộ chọn toàn cục
  useEffect(() => {
    const syncYear = () => {
      try {
        const stored = localStorage.getItem("selectedAcademicYear")
        if (stored && academicYears.some((y: any) => y.id === stored)) {
          setYearId((prev) => (prev === "__UNASSIGNED__" ? prev : stored))
        }
      } catch {}
    }
    syncYear()
    window.addEventListener("academicYearChanged", syncYear)
    return () => window.removeEventListener("academicYearChanged", syncYear)
  }, [academicYears])

  const handleSelectYear = (newYearId: string) => {
    setYearId(newYearId)
    setSelectedExamIds(new Set())
    if (newYearId && newYearId !== "__UNASSIGNED__") {
      try {
        localStorage.setItem("selectedAcademicYear", newYearId)
        document.cookie = `selectedAcademicYear=${newYearId}; path=/; max-age=31536000; SameSite=Lax`
        window.dispatchEvent(new Event("academicYearChanged"))
      } catch {}
    }
  }

  const [exams, setExams] = useState(initialExams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Batch Reassign Year State
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set())
  const [targetMoveYearId, setTargetMoveYearId] = useState("")
  const [movingBatch, setMovingBatch] = useState(false)

  // Clone Exams From Another Academic Year Modal State
  const [cloneModalOpen, setCloneModalOpen] = useState(false)
  const [cloneSourceYearId, setCloneSourceYearId] = useState("")
  const [cloneSelectedIds, setCloneSelectedIds] = useState<Set<string>>(new Set())
  const [cloneSearch, setCloneSearch] = useState("")
  const [cloning, setCloning] = useState(false)

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev))
    }, 3500)
  }

  const activeYearObj = useMemo(
    () => academicYears.find((y: any) => y.id === yearId) || null,
    [academicYears, yearId]
  )

  const unassignedExamsCount = useMemo(
    () => exams.filter((e) => !e.academicYearId).length,
    [exams]
  )

  const standardPlans = ["HE_THONG", "TRUONG", "PHUONG", "SO", "BO", "TU_DANG_KY"]
  const customPlansInDB = useMemo(
    () =>
      Array.from(
        new Set(exams.map((e) => e.plan).filter((p) => p && !standardPlans.includes(p)))
      ) as string[],
    [exams]
  )

  const [form, setForm] = useState({
    name: "",
    code: "",
    academicYearId: "",
    description: "",
    startDate: "",
    endDate: "",
    categoryId: "",
    roundId: "",
    departmentId: "",
    plan: "HE_THONG",
    isPriority: false,
    grade: "ALL",
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [quickFilter, setQuickFilter] = useState<"ALL" | "ACTIVE" | "UPCOMING" | "PRIORITY">("ALL")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterExamId, setFilterExamId] = useState("")
  const [filterRound, setFilterRound] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterGrade, setFilterGrade] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [customPlan, setCustomPlan] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [
    yearId,
    searchTerm,
    quickFilter,
    filterCategory,
    filterExamId,
    filterRound,
    filterDept,
    filterGrade,
    filterPlan,
  ])

  const effectiveFormYearId =
    form.academicYearId ||
    (yearId !== "__UNASSIGNED__" ? yearId : academicYears[0]?.id || "")

  const filteredCategoriesForSelect = useMemo(
    () =>
      categories.filter(
        (c) =>
          !effectiveFormYearId ||
          c.academicYearId === effectiveFormYearId ||
          c.academicYearId === null
      ),
    [categories, effectiveFormYearId]
  )
  const filteredRoundsForSelect = useMemo(
    () =>
      rounds.filter(
        (r) =>
          !effectiveFormYearId ||
          r.academicYearId === effectiveFormYearId ||
          r.academicYearId === null
      ),
    [rounds, effectiveFormYearId]
  )

  const openCreate = () => {
    const defaultYrId =
      yearId && yearId !== "__UNASSIGNED__"
        ? yearId
        : academicYears.find((y: any) => y.status === "ACTIVE")?.id || academicYears[0]?.id || ""
    const yrObj = academicYears.find((y: any) => y.id === defaultYrId)
    const autoCode = generateNextExamCode(exams, yrObj?.name)
    const validCat = filteredCategoriesForSelect[0]?.id || categories[0]?.id || ""
    setEditingId(null)
    setForm({
      name: "",
      code: autoCode,
      academicYearId: defaultYrId,
      description: "",
      startDate: "",
      endDate: "",
      categoryId: validCat,
      roundId: "",
      departmentId: "",
      plan: "HE_THONG",
      isPriority: false,
      grade: "ALL",
    })
    setCustomPlan("")
    setCreating(true)
    setErrorMsg("")
  }

  const openEdit = (exam: any) => {
    setCreating(false)
    setEditingId(exam.id)
    const isStandard = exam.plan && standardPlans.includes(exam.plan)
    const fallbackYrId =
      yearId && yearId !== "__UNASSIGNED__" ? yearId : academicYears[0]?.id || ""
    setForm({
      name: exam.name,
      code: exam.code,
      academicYearId: exam.academicYearId || fallbackYrId,
      description: exam.description || "",
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 16) : "",
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : "",
      categoryId: exam.categoryId,
      roundId: exam.roundId || "",
      departmentId: exam.departmentId || "",
      plan: isStandard ? exam.plan : exam.plan ? "KHAC" : "HE_THONG",
      isPriority: exam.isPriority || false,
      grade: exam.grade || "ALL",
    })
    setCustomPlan(isStandard ? "" : exam.plan || "")
    setErrorMsg("")
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId || !form.academicYearId) {
      setErrorMsg("Vui lòng nhập Tên kỳ thi, chọn Năm học và Danh mục kỳ thi.")
      return
    }
    const finalPlan = form.plan === "KHAC" ? customPlan.trim() : form.plan
    if (form.plan === "KHAC" && !finalPlan) {
      setErrorMsg("Vui lòng nhập tên kế hoạch khác.")
      return
    }
    setSaving(true)
    setErrorMsg("")
    try {
      const payload = {
        ...form,
        plan: finalPlan,
        academicYearId: form.academicYearId,
      }
      if (editingId) {
        const res = await updateExamAction({ id: editingId, ...payload })
        if (res.exam) {
          setExams((prev) => prev.map((e) => (e.id === editingId ? res.exam : e)))
        }
        setEditingId(null)
        showToast(
          "success",
          `Đã lưu kỳ thi thuộc năm học ${res.exam?.academicYear?.name || ""}.`
        )
      } else {
        const res = await createExamAction(payload)
        if (res.exam) {
          setExams((prev) => [res.exam, ...prev])
          if (res.exam.academicYearId && res.exam.academicYearId !== yearId) {
            handleSelectYear(res.exam.academicYearId)
          }
        }
        setCreating(false)
        showToast(
          "success",
          `Đã tạo kỳ thi "${res.exam?.name || form.name}" trong năm học ${
            res.exam?.academicYear?.name || ""
          }.`
        )
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Không thể lưu kỳ thi. Vui lòng kiểm tra lại.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Xóa kỳ thi "${name}"? Toàn bộ đăng ký và kết quả thuộc kỳ thi này cũng sẽ bị xóa.`
      )
    )
      return
    try {
      await deleteExamAction(id)
      setExams((prev) => prev.filter((e) => e.id !== id))
      setSelectedExamIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      showToast("success", `Đã xóa kỳ thi "${name}".`)
    } catch (e: any) {
      showToast("error", e?.message || "Có lỗi xảy ra khi xóa kỳ thi.")
    }
  }

  const handleBatchMoveYear = async () => {
    if (selectedExamIds.size === 0 || !targetMoveYearId) return
    const targetYrObj = academicYears.find((y) => y.id === targetMoveYearId)
    if (
      !confirm(
        `Chuyển ${selectedExamIds.size} kỳ thi đã chọn (cùng kết quả giải thưởng liên quan) sang Năm học ${
          targetYrObj?.name || ""
        }?`
      )
    ) {
      return
    }
    setMovingBatch(true)
    try {
      const res = await bulkAssignExamYearAction({
        examIds: Array.from(selectedExamIds),
        targetAcademicYearId: targetMoveYearId,
      })
      if (res.exams) {
        const map = new Map(res.exams.map((ex: any) => [ex.id, ex]))
        setExams((prev) => prev.map((e) => map.get(e.id) || e))
      }
      setSelectedExamIds(new Set())
      setTargetMoveYearId("")
      showToast(
        "success",
        `Đã chuyển ${res.exams?.length || 0} kỳ thi sang năm học ${res.yearName}.`
      )
    } catch (e: any) {
      showToast("error", e?.message || "Không thể chuyển năm học cho kỳ thi.")
    } finally {
      setMovingBatch(false)
    }
  }

  const openCloneModal = () => {
    const otherYears = academicYears.filter((y) => y.id !== yearId)
    const defaultSrcYear =
      otherYears.find((y) => exams.some((e) => e.academicYearId === y.id))?.id ||
      otherYears[0]?.id ||
      ""
    setCloneSourceYearId(defaultSrcYear)
    const srcExams = exams.filter((e) => e.academicYearId === defaultSrcYear)
    setCloneSelectedIds(new Set(srcExams.map((e) => e.id)))
    setCloneSearch("")
    setCloneModalOpen(true)
  }

  const sourceYearExamsForClone = useMemo(() => {
    const q = cloneSearch.trim().toLowerCase()
    return exams
      .filter((e) => e.academicYearId === cloneSourceYearId)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          (e.code || "").toLowerCase().includes(q) ||
          (e.category?.name || "").toLowerCase().includes(q)
      )
  }, [exams, cloneSourceYearId, cloneSearch])

  const handleExecuteClone = async () => {
    const targetYrId =
      yearId && yearId !== "__UNASSIGNED__" ? yearId : academicYears[0]?.id || ""
    if (!targetYrId || cloneSelectedIds.size === 0) return
    setCloning(true)
    try {
      const res = await cloneExamsToYearAction({
        sourceExamIds: Array.from(cloneSelectedIds),
        targetAcademicYearId: targetYrId,
      })
      if (res.clonedExams && res.clonedExams.length > 0) {
        setExams((prev) => [...res.clonedExams, ...prev])
      }
      setCloneModalOpen(false)
      showToast(
        "success",
        `Đã kế thừa ${res.clonedExams.length} kỳ thi sang năm học ${res.yearName}${
          res.skippedCount > 0 ? ` (bỏ qua ${res.skippedCount} kỳ thi đã tồn tại)` : ""
        }.`
      )
    } catch (e: any) {
      showToast("error", e?.message || "Không thể sao chép kỳ thi.")
    } finally {
      setCloning(false)
    }
  }

  // Các kỳ thi thuộc Năm học đang chọn
  const examsInYear = useMemo(() => {
    if (yearId === "__UNASSIGNED__") {
      return exams.filter((e) => !e.academicYearId)
    }
    return exams.filter((e) => e.academicYearId === yearId)
  }, [exams, yearId])

  const examsForFilterDropdown = useMemo(() => {
    if (!filterCategory) return examsInYear
    return examsInYear.filter((e) => e.categoryId === filterCategory)
  }, [examsInYear, filterCategory])

  useEffect(() => {
    if (filterExamId && !examsForFilterDropdown.some((e) => e.id === filterExamId)) {
      setFilterExamId("")
    }
  }, [examsForFilterDropdown, filterExamId])

  const filteredExams = useMemo(() => {
    return examsInYear.filter((exam) => {
      const q = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !q ||
        exam.name.toLowerCase().includes(q) ||
        exam.code.toLowerCase().includes(q) ||
        (exam.category?.name || "").toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (quickFilter !== "ALL") {
        const status = getExamStatus(exam.startDate, exam.endDate)
        if (quickFilter === "ACTIVE" && status.key !== "ACTIVE") return false
        if (quickFilter === "UPCOMING" && status.key !== "UPCOMING") return false
        if (quickFilter === "PRIORITY" && !exam.isPriority) return false
      }

      if (filterCategory && exam.categoryId !== filterCategory) return false
      if (filterExamId && exam.id !== filterExamId) return false
      if (filterRound && exam.roundId !== filterRound) return false
      if (filterDept && exam.departmentId !== filterDept) return false
      if (!matchesLevelFilter(exam.grade || "", filterGrade)) return false
      if (filterPlan && exam.plan !== filterPlan) return false

      return true
    })
  }, [
    examsInYear,
    searchTerm,
    quickFilter,
    filterCategory,
    filterExamId,
    filterRound,
    filterDept,
    filterGrade,
    filterPlan,
  ])

  const statsTotal = examsInYear.length
  const statsActive = examsInYear.filter(
    (e) => getExamStatus(e.startDate, e.endDate).key === "ACTIVE"
  ).length
  const statsUpcoming = examsInYear.filter(
    (e) => getExamStatus(e.startDate, e.endDate).key === "UPCOMING"
  ).length
  const statsTotalRegs = examsInYear.reduce((acc, e) => acc + (e._count?.students || 0), 0)
  const statsTotalAchs = examsInYear.reduce((acc, e) => acc + (e._count?.achievements || 0), 0)

  const activeFiltersCount = [
    filterCategory,
    filterExamId,
    filterRound,
    filterDept,
    filterGrade,
    filterPlan,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchTerm("")
    setQuickFilter("ALL")
    setFilterCategory("")
    setFilterExamId("")
    setFilterRound("")
    setFilterDept("")
    setFilterGrade("")
    setFilterPlan("")
  }

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / rowsPerPage))
  const pagedExams = filteredExams.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold ${
            toast.type === "success"
              ? "bg-[#003B3A] text-white border-[#008B85]"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#5EEAD4] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. Unified Academic Ledger Strip + Academic Year Scope + Action Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-3.5 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9] tabular-nums">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {/* Bộ chọn Năm học trực tiếp cho Danh sách Kỳ thi */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A]">
              <Calendar className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
              <span className="text-slate-600 font-medium">Kỳ thi năm học:</span>
              <select
                value={yearId}
                onChange={(e) => handleSelectYear(e.target.value)}
                className="bg-transparent font-bold text-[#003B3A] outline-none cursor-pointer"
              >
                {academicYears.map((y: any) => {
                  const countInYr = exams.filter((ex) => ex.academicYearId === y.id).length
                  return (
                    <option key={y.id} value={y.id}>
                      {y.name} ({countInYr} kỳ thi)
                    </option>
                  )
                })}
                {unassignedExamsCount > 0 && (
                  <option value="__UNASSIGNED__">
                    Chưa gắn năm học ({unassignedExamsCount})
                  </option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Tổng số:</span>
              <strong className="text-[#003B3A] font-bold text-sm">{statsTotal}</strong>
            </div>
            <span className="text-slate-200 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Đang diễn ra:</span>
              <strong className="text-[#059669] font-bold">{statsActive}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Sắp diễn ra:</span>
              <strong className="text-[#D97706] font-bold">{statsUpcoming}</strong>
            </div>
            <span className="text-slate-200 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Lượt đăng ký:</span>
              <strong className="text-slate-800 font-bold">{statsTotalRegs}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Giải thưởng:</span>
              <strong className="text-[#008B85] font-bold">{statsTotalAchs}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {academicYears.length > 1 && yearId !== "__UNASSIGNED__" && (
              <button
                type="button"
                onClick={openCloneModal}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-[#E2E8F0] hover:border-[#00A19A]/40 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
                title="Sao chép danh sách kỳ thi thường niên từ năm học khác sang năm học đang chọn"
              >
                <Copy className="w-3.5 h-3.5 text-[#008B85]" />
                <span>Kế thừa từ năm học khác</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-[#003B3A] hover:bg-[#002928] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
              <span>Tạo kỳ thi mới</span>
            </button>
          </div>
        </div>

        {/* Search + Segmented Quick Status + Filter Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên kỳ thi, mã CT-..., hoặc danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-7 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00A19A] focus:bg-white rounded-xl text-xs text-slate-800 outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick segmented pills */}
            <div className="inline-flex items-center gap-0.5 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] self-start">
              {(
                [
                  { id: "ALL", label: "Tất cả" },
                  { id: "ACTIVE", label: "Đang diễn ra" },
                  { id: "UPCOMING", label: "Sắp diễn ra" },
                  { id: "PRIORITY", label: "Ưu tiên (*)" },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setQuickFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    quickFilter === pill.id
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00A19A] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="">Tất cả danh mục</option>
              {filteredCategoriesForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterExamId}
              onChange={(e) => setFilterExamId(e.target.value)}
              title={
                examsForFilterDropdown.find((ex) => ex.id === filterExamId)?.name ||
                "Lọc theo kỳ thi"
              }
              className="max-w-[240px] bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00A19A] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none truncate"
            >
              <option value="">Tất cả kỳ thi ({examsForFilterDropdown.length})</option>
              {examsForFilterDropdown.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                activeFiltersCount > 0 || showFilters
                  ? "bg-[#F0FDFA] border-[#00A19A]/40 text-[#003B3A]"
                  : "bg-white border-[#E2E8F0] text-slate-600 hover:bg-[#F8FAFC]"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Bộ lọc</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#008B85] text-white text-[10px] font-bold tabular-nums">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Extra Filters */}
        {showFilters && (
          <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Vòng thi</label>
              <select
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="">Tất cả vòng thi</option>
                {filteredRoundsForSelect.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Tổ chuyên môn</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="">Tất cả tổ chuyên môn</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Đối tượng dự thi</label>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="">Tất cả đối tượng</option>
                <option value="TIEU_HOC">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="TH_THCS">Liên cấp TH-THCS</option>
                <option value="THCS_THPT">Liên cấp THCS-THPT</option>
                <option value="ALL">Toàn trường</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-600">Kế hoạch</label>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00A19A]"
              >
                <option value="">Tất cả kế hoạch</option>
                <option value="HE_THONG">Hệ thống</option>
                <option value="TRUONG">Trường</option>
                <option value="PHUONG">Phường</option>
                <option value="SO">Sở GD&ĐT</option>
                <option value="BO">Bộ GD&ĐT</option>
                <option value="TU_DANG_KY">Tự đăng ký</option>
                {customPlansInDB.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Batch Move Academic Year Bar */}
        {selectedExamIds.size > 0 && (
          <div className="px-4 py-2.5 bg-[#F0FDFA] border-b border-[#CCFBF1] flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-[#003B3A]">
                Đã chọn {selectedExamIds.size} kỳ thi
              </span>
              <button
                type="button"
                onClick={() => setSelectedExamIds(new Set())}
                className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600 font-medium inline-flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#008B85]" />
                <span>Chuyển sang năm học:</span>
              </span>
              <select
                value={targetMoveYearId}
                onChange={(e) => setTargetMoveYearId(e.target.value)}
                className="border border-[#CCFBF1] bg-white rounded-lg px-2.5 py-1 text-xs font-semibold text-[#003B3A] outline-none"
              >
                <option value="">-- Chọn năm học đích --</option>
                {academicYears
                  .filter((y) => y.id !== yearId)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      Năm học {y.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!targetMoveYearId || movingBatch}
                onClick={handleBatchMoveYear}
                className="px-3.5 py-1 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                {movingBatch && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Chuyển năm học</span>
              </button>
            </div>
          </div>
        )}

        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-4 text-center">
            <Calendar className="w-10 h-10 mb-2.5 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">
              {examsInYear.length === 0
                ? `Năm học ${activeYearObj?.name || ""} chưa có kỳ thi nào`
                : "Không tìm thấy kỳ thi phù hợp với bộ lọc"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              {examsInYear.length === 0
                ? "Tạo kỳ thi mới cho năm học này hoặc nhấn “Kế thừa từ năm học khác” để sao chép nhanh danh sách các kỳ thi thường niên."
                : "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc danh mục."}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {examsInYear.length === 0 ? (
                <>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 bg-[#003B3A] hover:bg-[#002928] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>Tạo kỳ thi cho năm học {activeYearObj?.name || ""}</span>
                  </button>
                  {academicYears.length > 1 && (
                    <button
                      type="button"
                      onClick={openCloneModal}
                      className="inline-flex items-center gap-1.5 bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] border border-[#CCFBF1] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#008B85]" />
                      <span>Kế thừa từ năm học khác</span>
                    </button>
                  )}
                </>
              ) : (
                (searchTerm || quickFilter !== "ALL" || activeFiltersCount > 0) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3.5 py-1.5 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đặt lại bộ lọc
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse tabular-nums">
                <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                  <tr className="text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-3 w-10 text-center text-white">
                      <input
                        type="checkbox"
                        checked={
                          pagedExams.length > 0 &&
                          pagedExams.every((ex) => selectedExamIds.has(ex.id))
                        }
                        onChange={(e) => {
                          setSelectedExamIds((prev) => {
                            const next = new Set(prev)
                            pagedExams.forEach((ex) => {
                              if (e.target.checked) next.add(ex.id)
                              else next.delete(ex.id)
                            })
                            return next
                          })
                        }}
                        className="w-3.5 h-3.5 rounded accent-[#00A19A] cursor-pointer"
                        title="Chọn các kỳ thi trên trang hiện tại"
                      />
                    </th>
                    <th className="py-3 px-3 text-white">Kỳ thi &amp; năm học</th>
                    <th className="py-3 px-3 text-teal-100">Danh mục &amp; đối tượng</th>
                    <th className="py-3 px-3 text-teal-100">Kế hoạch &amp; đơn vị</th>
                    <th className="py-3 px-3 text-teal-100">Thời gian</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái</th>
                    <th className="py-3 px-3 text-center text-[#5EEAD4]">Đăng ký / Giải</th>
                    <th className="py-3 px-3 text-right text-white">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                  {pagedExams.map((exam) => {
                    const status = getExamStatus(exam.startDate, exam.endDate)
                    const regCount = exam._count?.students || 0
                    const achCount = exam._count?.achievements || 0
                    const isChecked = selectedExamIds.has(exam.id)
                    const examYearName =
                      exam.academicYear?.name ||
                      academicYears.find((y) => y.id === exam.academicYearId)?.name ||
                      "Chưa gắn NH"

                    return (
                      <tr
                        key={exam.id}
                        className={`transition-colors align-middle ${
                          isChecked
                            ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                            : exam.isPriority
                            ? "bg-[#F0FDFA]/30 hover:bg-[#F8FAFC]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="py-3 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedExamIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(exam.id)
                                else next.delete(exam.id)
                                return next
                              })
                            }}
                            className="w-3.5 h-3.5 rounded accent-[#003B3A] cursor-pointer"
                          />
                        </td>

                        {/* Kỳ thi & Năm học */}
                        <td className="py-3 px-3 align-middle max-w-[310px]">
                          <div className="flex items-start gap-2">
                            {exam.isPriority && (
                              <span title="Kỳ thi trọng điểm / ưu tiên" className="shrink-0 mt-0.5">
                                <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/admin/ktdbcl/results?examId=${exam.id}`}
                                className="font-semibold text-slate-900 hover:text-[#008B85] transition-colors line-clamp-2 leading-snug"
                                title={exam.name}
                              >
                                {exam.name}
                              </Link>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="font-mono text-[11px] text-slate-500">
                                  {exam.code}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] font-semibold text-[#00736E]">
                                  NH {examYearName}
                                </span>
                                {exam.round?.name && (
                                  <span className="text-[11px] text-slate-400">
                                    • {exam.round.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Danh mục & Đối tượng */}
                        <td className="py-3 px-3 align-middle">
                          <div className="font-medium text-slate-800">
                            {exam.category?.name || "—"}
                          </div>
                          <div className="text-[11px] text-[#00736E] mt-0.5">
                            {getLevelLabel(exam.grade)}
                          </div>
                        </td>

                        {/* Kế hoạch & Tổ */}
                        <td className="py-3 px-3 align-middle">
                          <div className="text-slate-700 font-medium">
                            {exam.plan ? PLAN_LABELS[exam.plan] || exam.plan : "—"}
                          </div>
                          {exam.department?.name && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                              {exam.department.name}
                            </div>
                          )}
                        </td>

                        {/* Thời gian */}
                        <td className="py-3 px-3 align-middle whitespace-nowrap text-slate-600">
                          {exam.startDate || exam.endDate ? (
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                {exam.startDate
                                  ? new Date(exam.startDate).toLocaleDateString("vi-VN")
                                  : "—"}
                              </div>
                              {exam.endDate && (
                                <div className="text-slate-400">
                                  đến {new Date(exam.endDate).toLocaleDateString("vi-VN")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chưa xếp lịch</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* Đăng ký / Giải */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-slate-700 font-medium text-[11px]"
                              title="Số học sinh đăng ký"
                            >
                              {regCount} ĐK
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md border font-semibold text-[11px] ${
                                achCount > 0
                                  ? "bg-[#F0FDFA] border-[#CCFBF1] text-[#00736E]"
                                  : "bg-[#F8FAFC] border-[#E2E8F0] text-slate-400"
                              }`}
                              title="Số giải thưởng đã ghi nhận"
                            >
                              {achCount} giải
                            </span>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/ktdbcl/results?examId=${exam.id}`}
                              className="inline-flex items-center gap-1 bg-[#003B3A] hover:bg-[#00736E] text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                              title="Nhập kết quả và giải thưởng cho kỳ thi này"
                            >
                              <Award className="w-3.5 h-3.5 text-[#5EEAD4]" />
                              <span>Nhập kết quả</span>
                            </Link>
                            <Link
                              href={`/admin/ktdbcl/students?examId=${exam.id}`}
                              className="inline-flex items-center gap-1 bg-white hover:bg-[#F0FDFA] text-slate-700 hover:text-[#003B3A] border border-[#E2E8F0] px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                              title="Quản lý danh sách học sinh đăng ký dự thi"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-[#008B85]" />
                              <span>Đăng ký</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(exam)}
                              className="p-1.5 text-slate-500 hover:text-[#003B3A] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin hoặc chuyển năm học"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exam.id, exam.name)}
                              className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa kỳ thi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Footer */}
            {filteredExams.length > rowsPerPage && (
              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs tabular-nums">
                <span className="text-slate-500">
                  Hiển thị{" "}
                  <strong className="text-slate-800">
                    {(currentPage - 1) * rowsPerPage + 1}–
                    {Math.min(currentPage * rowsPerPage, filteredExams.length)}
                  </strong>{" "}
                  / <strong className="text-slate-800">{filteredExams.length}</strong> kỳ thi thuộc
                  năm học {activeYearObj?.name || ""}
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <div key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-slate-400">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            currentPage === p
                              ? "bg-[#003B3A] text-white"
                              : "text-slate-600 hover:bg-white border border-transparent hover:border-[#E2E8F0]"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Create / Edit Exam Modal */}
      {(creating || editingId) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5EEAD4]" />
                <h3 className="font-bold text-sm">
                  {editingId ? "Cập nhật thông tin kỳ thi" : "Tạo kỳ thi mới theo năm học"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setEditingId(null)
                }}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {errorMsg && (
                <div className="text-[#E11D48] bg-rose-50 px-3.5 py-2.5 rounded-xl border border-rose-200 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2 space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Tên kỳ thi <span className="text-[#E11D48]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ví dụ: Kỳ thi Olympic Tiếng Anh trên Internet (IOE)..."
                    className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:border-[#00A19A] focus:bg-white outline-none text-slate-800 bg-[#F8FAFC]"
                  />
                </div>

                {/* Trường Năm học bắt buộc */}
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Năm học áp dụng <span className="text-[#E11D48]">*</span>
                  </label>
                  <select
                    value={form.academicYearId}
                    onChange={(e) => {
                      const nextYrId = e.target.value
                      const yrObj = academicYears.find((y) => y.id === nextYrId)
                      setForm((prev) => ({
                        ...prev,
                        academicYearId: nextYrId,
                        code: creating ? generateNextExamCode(exams, yrObj?.name) : prev.code,
                      }))
                    }}
                    className="w-full border border-[#00A19A]/40 rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none font-bold text-[#003B3A] bg-[#F0FDFA]/60 tabular-nums"
                  >
                    {academicYears.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        Năm học {y.name} {y.status === "ACTIVE" ? "(Hiện hành)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Mã kỳ thi</label>
                  <input
                    type="text"
                    value={form.code}
                    disabled
                    className="w-full border border-[#E2E8F0] bg-slate-100 rounded-xl px-3.5 py-2 font-mono text-slate-500 cursor-not-allowed tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Danh mục kỳ thi <span className="text-[#E11D48]">*</span>
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {filteredCategoriesForSelect.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Vòng thi</label>
                  <select
                    value={form.roundId}
                    onChange={(e) => setForm({ ...form, roundId: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                  >
                    <option value="">-- Không chọn / Chung --</option>
                    {filteredRoundsForSelect.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Đối tượng dự thi</label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                  >
                    <option value="ALL">Toàn trường (Mọi cấp học)</option>
                    <option value="TIEU_HOC">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                    <option value="TH_THCS">Liên cấp TH-THCS</option>
                    <option value="THCS_THPT">Liên cấp THCS-THPT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Tổ chuyên môn phụ trách
                  </label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                  >
                    <option value="">-- Chọn tổ chuyên môn --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-semibold text-slate-700">
                    Cấp / Kế hoạch tổ chức
                  </label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                  >
                    <option value="HE_THONG">Hệ thống</option>
                    <option value="TRUONG">Trường</option>
                    <option value="PHUONG">Phường</option>
                    <option value="SO">Sở GD&ĐT</option>
                    <option value="BO">Bộ GD&ĐT</option>
                    <option value="TU_DANG_KY">Tự đăng ký</option>
                    <option value="KHAC">Khác...</option>
                  </select>
                </div>

                {form.plan === "KHAC" && (
                  <div className="md:col-span-2 space-y-1">
                    <label className="block font-semibold text-slate-700">
                      Tên kế hoạch khác <span className="text-[#E11D48]">*</span>
                    </label>
                    <input
                      type="text"
                      value={customPlan}
                      onChange={(e) => setCustomPlan(e.target.value)}
                      placeholder="Ví dụ: Quốc tế, Khu vực, Cụm..."
                      className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC] tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC] tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Ghi chú / Nội dung kỳ thi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ghi chú thể lệ, địa điểm thi hoặc hướng dẫn đăng ký..."
                  rows={2}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2 focus:border-[#00A19A] outline-none text-slate-800 bg-[#F8FAFC]"
                />
              </div>

              <label className="flex items-center gap-2.5 bg-[#F8FAFC] px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isPriority}
                  onChange={(e) => setForm({ ...form, isPriority: e.target.checked })}
                  className="w-4 h-4 accent-[#003B3A] rounded cursor-pointer"
                />
                <Star
                  className={`w-4 h-4 ${
                    form.isPriority ? "text-[#D97706] fill-[#D97706]" : "text-slate-400"
                  }`}
                />
                <span className="font-semibold text-slate-700">
                  Đánh dấu là kỳ thi trọng điểm / ưu tiên (*)
                </span>
              </label>
            </div>

            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#003B3A] hover:bg-[#002928] text-white rounded-xl font-semibold text-xs transition-colors disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>{editingId ? "Lưu cập nhật" : "Tạo kỳ thi"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Clone Exams From Another Academic Year Modal */}
      {cloneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[88vh]">
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#5EEAD4]" />
                <h3 className="font-bold text-sm">
                  Kế thừa danh mục kỳ thi sang năm học {activeYearObj?.name || ""}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCloneModalOpen(false)}
                className="text-white/75 hover:text-white hover:bg-white/10 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Sao chép nhanh cấu trúc các kỳ thi thường niên từ năm học trước sang{" "}
                <strong className="text-[#003B3A]">Năm học {activeYearObj?.name}</strong> (tự động
                cấp mã mới, không sao chép danh sách học sinh hay giải thưởng cũ).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lấy kỳ thi từ năm học nguồn
                  </label>
                  <select
                    value={cloneSourceYearId}
                    onChange={(e) => {
                      const nextSrc = e.target.value
                      setCloneSourceYearId(nextSrc)
                      const list = exams.filter((ex) => ex.academicYearId === nextSrc)
                      setCloneSelectedIds(new Set(list.map((ex) => ex.id)))
                    }}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 bg-[#F8FAFC] font-semibold text-slate-800 outline-none focus:border-[#00A19A] tabular-nums"
                  >
                    {academicYears
                      .filter((y) => y.id !== yearId)
                      .map((y) => {
                        const cnt = exams.filter((ex) => ex.academicYearId === y.id).length
                        return (
                          <option key={y.id} value={y.id}>
                            Năm học {y.name} ({cnt} kỳ thi)
                          </option>
                        )
                      })}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tìm nhanh</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cloneSearch}
                      onChange={(e) => setCloneSearch(e.target.value)}
                      placeholder="Lọc tên kỳ thi cần sao chép..."
                      className="w-full pl-8.5 pr-3 py-2 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="bg-[#F8FAFC] px-3.5 py-2 border-b border-[#E2E8F0] flex items-center justify-between tabular-nums">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        sourceYearExamsForClone.length > 0 &&
                        sourceYearExamsForClone.every((ex) => cloneSelectedIds.has(ex.id))
                      }
                      onChange={(e) => {
                        setCloneSelectedIds((prev) => {
                          const next = new Set(prev)
                          sourceYearExamsForClone.forEach((ex) => {
                            if (e.target.checked) next.add(ex.id)
                            else next.delete(ex.id)
                          })
                          return next
                        })
                      }}
                      className="w-3.5 h-3.5 rounded accent-[#003B3A]"
                    />
                    <span>Chọn tất cả ({sourceYearExamsForClone.length} kỳ thi)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#00736E]">
                    Đã chọn: {cloneSelectedIds.size}
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9]">
                  {sourceYearExamsForClone.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      Năm học nguồn chưa có kỳ thi nào để sao chép.
                    </div>
                  ) : (
                    sourceYearExamsForClone.map((ex) => {
                      const checked = cloneSelectedIds.has(ex.id)
                      return (
                        <label
                          key={ex.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setCloneSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(ex.id)
                                  else next.delete(ex.id)
                                  return next
                                })
                              }}
                              className="w-3.5 h-3.5 rounded accent-[#003B3A] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">{ex.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {ex.category?.name || "Danh mục"} • {getLevelLabel(ex.grade)}
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                            {ex.code}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setCloneModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={cloning || cloneSelectedIds.size === 0}
                onClick={handleExecuteClone}
                className="px-4 py-2 bg-[#003B3A] hover:bg-[#002928] text-white rounded-xl font-semibold text-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer tabular-nums"
              >
                {cloning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />
                )}
                <span>Kế thừa {cloneSelectedIds.size} kỳ thi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
