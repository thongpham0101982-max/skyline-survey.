"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { 
  Printer, 
  ExternalLink, 
  User, 
  Users, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  GraduationCap,
  Sparkles,
  Lock
} from "lucide-react"
import toast from "react-hot-toast"

const EVAL_PERIODS = [
  { code: "KSĐN", label: "Khảo sát đầu năm", short: "KSĐN" },
  { code: "GK1", label: "Giữa kỳ 1", short: "GK1" },
  { code: "CK1", label: "Cuối kỳ 1", short: "CK1" },
  { code: "GK2", label: "Giữa kỳ 2", short: "GK2" },
  { code: "CK2", label: "Cuối kỳ 2", short: "CK2" }
]

export interface ChildRecord {
  id: string
  studentName?: string | null
  studentCode?: string | null
  dateOfBirth?: string | Date | null
  homeroomTeacherName?: string | null
  class?: {
    className?: string | null
    grade?: string | null
    campus?: {
      campusCode?: string | null
      campusName?: string | null
    } | null
  } | null
}

export interface AcademicYearRecord {
  id: string
  name?: string | null
}

interface PeriodicGradeValue {
  display: string | null
  numeric: number | null
  badge: "good" | "fair" | "avg" | "weak" | "pass" | "fail" | "empty"
}

interface SubjectGradeItem {
  id: string
  stt: number
  name: string
  code?: string
  subjectGroup?: "MOET" | "SPECIAL"
  isSpecialSubject?: boolean
  isCommentOnly?: boolean
  score: number | null
  scoreDisplay?: string | null
  remark?: string
  scoreBadge: string
  ddgGk?: PeriodicGradeValue
  ddgCk?: PeriodicGradeValue
  dtbMhk?: PeriodicGradeValue
  specialScore?: PeriodicGradeValue
}

interface GradeResponseData {
  success: boolean
  isLockedForParent?: boolean
  lockReason?: string
  lockedPeriods?: string[]
  displayMode?: "KSDN" | "MIDTERM" | "ENDTERM"
  isPrimary?: boolean
  student?: {
    id: string
    studentCode: string
    studentName: string
    gender?: string
    dateOfBirth?: string | Date | null
  }
  classInfo?: {
    id: string
    className: string
    grade: string
    campusName: string
    campusCode: string
    homeroomTeacherName: string
    academicYearName: string
  }
  evaluationPeriod: string
  periodLabel: string
  subjects: SubjectGradeItem[]
  moetSubjects?: SubjectGradeItem[]
  specialSubjects?: SubjectGradeItem[]
  hasGrades: boolean
  exchange?: {
    teacherRemark: string
    teacherRemarkDate: string | Date | null
    teacherName: string
    parentFeedback: string
    parentFeedbackDate: string | Date | null
    logId?: string | null
  }
  error?: string
}

interface Props {
  initialChildren: ChildRecord[]
  defaultYear: AcademicYearRecord | null
  initialLockedPeriods?: string[]
}

export default function ParentGradesClient({
  initialChildren = [],
  defaultYear,
  initialLockedPeriods = ["GK1", "GK2"],
}: Props) {
  const [childrenList, setChildrenList] = useState<ChildRecord[]>(initialChildren)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialChildren[0]?.id || "")
  const [lockedPeriods, setLockedPeriods] = useState<string[]>(initialLockedPeriods)
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const firstOpen = EVAL_PERIODS.find((p) => !initialLockedPeriods.includes(p.code))
    return firstOpen?.code || ""
  })
  const [academicYearId, setAcademicYearId] = useState<string>(defaultYear?.id || "")
  
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<GradeResponseData | null>(null)
  
  const [feedbackInput, setFeedbackInput] = useState<string>("")
  const [isEditingFeedback, setIsEditingFeedback] = useState<boolean>(false)
  const [savingFeedback, setSavingFeedback] = useState<boolean>(false)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const openPeriods = useMemo(
    () => EVAL_PERIODS.filter((p) => !lockedPeriods.includes(p.code)),
    [lockedPeriods]
  )
  const allPeriodsLocked = openPeriods.length === 0

  useEffect(() => {
    if (openPeriods.length === 0) {
      if (selectedPeriod !== "") setSelectedPeriod("")
      return
    }
    if (!openPeriods.some((p) => p.code === selectedPeriod)) {
      setSelectedPeriod(openPeriods[0].code)
    }
  }, [openPeriods, selectedPeriod])

  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      if (year) setAcademicYearId(year)
    }

    async function loadChildren(targetYearId: string) {
      try {
        const url = targetYearId ? `/api/parent/children?academicYearId=${targetYearId}` : "/api/parent/children"
        const res = await fetch(url)
        if (res.ok) {
          const resData = (await res.json()) as ChildRecord[]
          if (Array.isArray(resData) && resData.length > 0) {
            setChildrenList(resData)
            setSelectedStudentId((prev) => {
              if (prev && resData.some((c) => c.id === prev)) return prev
              return resData[0].id
            })
          }
        }
      } catch (e) {
        console.error("Error loading parent children:", e)
      }
    }

    if (year) loadChildren(year)

    const handleYearChange = () => {
      if (typeof window !== "undefined") {
        const newYear = localStorage.getItem("selectedAcademicYear") || ""
        setAcademicYearId(newYear)
        loadChildren(newYear)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => {
      window.removeEventListener("academicYearChanged", handleYearChange)
    }
  }, [])

  const fetchGradesData = useCallback(async () => {
    if (!selectedStudentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const targetPeriod = selectedPeriod || "CK1"
      const url = `/api/parent/grades?studentId=${selectedStudentId}&evaluationPeriod=${encodeURIComponent(targetPeriod)}&academicYearId=${encodeURIComponent(academicYearId)}`
      const res = await fetch(url)
      const json = (await res.json()) as GradeResponseData
      if (json.success) {
        setData(json)
        if (Array.isArray(json.lockedPeriods)) {
          setLockedPeriods(json.lockedPeriods)
        }
        const existingParentMsg = json.exchange?.parentFeedback || ""
        setFeedbackInput(existingParentMsg)
        setIsEditingFeedback(!existingParentMsg)
      } else {
        toast.error(json.error || "Không thể tải dữ liệu điểm")
      }
    } catch (e) {
      console.error("Error fetching grades:", e)
      toast.error("Lỗi kết nối khi tải dữ liệu điểm")
    } finally {
      setLoading(false)
    }
  }, [selectedStudentId, selectedPeriod, academicYearId])

  useEffect(() => {
    fetchGradesData()
  }, [fetchGradesData])

  const currentChild = useMemo(() => {
    return childrenList.find(c => c.id === selectedStudentId) || childrenList[0]
  }, [childrenList, selectedStudentId])

  const getSchoolTitle = () => {
    const campusCode = (data?.classInfo?.campusCode || currentChild?.class?.campus?.campusCode || "").toUpperCase()
    const campusName = (data?.classInfo?.campusName || currentChild?.class?.campus?.campusName || "").toUpperCase()
    const className = (data?.classInfo?.className || currentChild?.class?.className || "").toUpperCase()
    const combined = `${campusCode} ${campusName} ${className}`

    if (combined.includes("CS4") || combined.includes("HILL")) {
      return "TRƯỜNG TH, THCS HPT SKY-LINE HILL"
    }
    return "TRƯỜNG TH, THCS HPT SKY-LINE"
  }

  const schoolTitle = getSchoolTitle()
  const periodLabel = EVAL_PERIODS.find(p => p.code === selectedPeriod)?.label || selectedPeriod
  const reportMainTitle = `BẢNG ĐIỂM MÔN HỌC - ${periodLabel.toUpperCase()}`
  const reportYearTitle = `NĂM HỌC: ${data?.classInfo?.academicYearName || defaultYear?.name || "2024 - 2025"}`

  const handleSaveFeedback = async () => {
    if (!feedbackInput.trim()) {
      toast.error("Vui lòng nhập nội dung trao đổi trước khi gửi")
      return
    }
    setSavingFeedback(true)
    try {
      const res = await fetch("/api/parent/grades/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId,
          evaluationPeriod: selectedPeriod,
          parentFeedback: feedbackInput
        })
      })
      const result = await res.json()
      if (result.success) {
        toast.success("Đã gửi ý kiến trao đổi đến GVCN thành công!")
        setIsEditingFeedback(false)
        fetchGradesData()
      } else {
        toast.error(result.error || "Gửi ý kiến thất bại")
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Lỗi không xác định"
      toast.error("Lỗi khi gửi ý kiến: " + errMsg)
    } finally {
      setSavingFeedback(false)
    }
  }

  const quickSuggestions = [
    "Gia đình rất vui vì sự tiến bộ của con.",
    "Xin Thầy/Cô hỗ trợ con thêm môn Toán.",
    "Con đang nỗ lực cải thiện môn Tiếng Anh.",
    "Cảm ơn Thầy/Cô đã tận tâm đồng hành cùng con."
  ]

  const effectiveDisplayMode: "KSDN" | "MIDTERM" | "ENDTERM" =
    data?.displayMode ||
    (selectedPeriod === "KSĐN"
      ? "KSDN"
      : selectedPeriod === "GK1" || selectedPeriod === "GK2"
        ? "MIDTERM"
        : "ENDTERM")

  const moetSubjectsList = useMemo(() => {
    if (data?.moetSubjects) return data.moetSubjects
    return (data?.subjects || []).filter(s => !s.isSpecialSubject && s.subjectGroup !== "SPECIAL")
  }, [data])

  const specialSubjectsList = useMemo(() => {
    if (data?.specialSubjects) return data.specialSubjects
    return (data?.subjects || []).filter(s => s.isSpecialSubject || s.subjectGroup === "SPECIAL")
  }, [data])

  const renderPeriodicBadge = (val?: PeriodicGradeValue | null, emphasize = false) => {
    if (!val || val.display === null || val.display === undefined || val.display === "") {
      return <span className="text-slate-400 font-semibold text-xs">-</span>
    }
    const badgeClass =
      val.badge === "good"
        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
        : val.badge === "fair"
          ? "bg-sky-50 text-sky-700 border-sky-300"
          : val.badge === "avg"
            ? "bg-amber-50 text-amber-700 border-amber-300"
            : val.badge === "pass"
              ? "bg-teal-50 text-teal-800 border-teal-300"
              : "bg-rose-50 text-rose-700 border-rose-300"

    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs tabular-nums shadow-2xs ${
          emphasize ? "font-black ring-1 ring-teal-500/20" : "font-bold"
        } ${badgeClass}`}
      >
        {val.display}
      </span>
    )
  }

  const getFullPrintHtml = () => {
    const student = data?.student || currentChild || {}
    const dob = student?.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "-"
    const teacherName = data?.classInfo?.homeroomTeacherName || currentChild?.homeroomTeacherName || "Giáo viên chủ nhiệm"
    const className = data?.classInfo?.className || currentChild?.class?.className || ""
    const subjects = data?.subjects || []
    const teacherRemark = data?.exchange?.teacherRemark || "Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh."
    const parentMsg = feedbackInput.trim() || data?.exchange?.parentFeedback || "Gia đình đã xem kết quả và sẽ tiếp tục đồng hành cùng con."

    const formatPrintBadge = (val?: PeriodicGradeValue | null, fallbackNum?: number | null) => {
      const display =
        val?.display ??
        (fallbackNum !== null && fallbackNum !== undefined && !isNaN(Number(fallbackNum))
          ? Number(fallbackNum).toFixed(1)
          : null)
      if (!display) return '<span class="score-empty">-</span>'
      const b = val?.badge || (fallbackNum !== null && fallbackNum !== undefined
        ? (fallbackNum >= 8.0 ? "good" : fallbackNum >= 6.5 ? "fair" : fallbackNum >= 5.0 ? "avg" : "weak")
        : "pass")
      const sc =
        b === "good" || b === "pass"
          ? "score-good"
          : b === "fair"
            ? "score-fair"
            : b === "avg"
              ? "score-avg"
              : "score-weak"
      return `<span class="score-badge ${sc}">${display}</span>`
    }

    const buildPrintTableHtml = () => {
      if (effectiveDisplayMode === "ENDTERM") {
        const moetRows = (moetSubjectsList.length > 0 ? moetSubjectsList : subjects).map((sub, idx) => `
          <tr>
            <td class="stt">${idx + 1}</td>
            <td class="subj-name">${sub.name} ${sub.code ? `<span class="subj-code">(${sub.code})</span>` : ""}</td>
            <td class="score">${formatPrintBadge(sub.ddgGk)}</td>
            <td class="score">${formatPrintBadge(sub.ddgCk)}</td>
            <td class="score">${formatPrintBadge(sub.dtbMhk)}</td>
          </tr>
        `).join("")

        const specialTableHtml = specialSubjectsList.length > 0 ? `
          <div class="section-bar" style="margin-top: 10px;">
            <div class="section-title">CÁC MÔN ĐẶC THÙ — ${periodLabel.toUpperCase()}</div>
            <div class="section-count">${specialSubjectsList.length} môn đặc thù</div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">STT</th>
                <th>Môn đặc thù</th>
                <th class="text-center" style="width: 78px;">ĐĐGgk</th>
                <th class="text-center" style="width: 78px;">ĐĐGck</th>
                <th class="text-center" style="width: 95px;">Điểm đặc thù</th>
              </tr>
            </thead>
            <tbody>
              ${specialSubjectsList.map((sub, idx) => `
                <tr>
                  <td class="stt">${idx + 1}</td>
                  <td class="subj-name">${sub.name} ${sub.code ? `<span class="subj-code">(${sub.code})</span>` : ""}</td>
                  <td class="score">${formatPrintBadge(sub.ddgGk)}</td>
                  <td class="score">${formatPrintBadge(sub.ddgCk)}</td>
                  <td class="score">${formatPrintBadge(sub.specialScore ?? sub.dtbMhk)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""

        return `
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 40px;">STT</th>
                <th>Môn học</th>
                <th class="text-center" style="width: 78px;">ĐĐGgk</th>
                <th class="text-center" style="width: 78px;">ĐĐGck</th>
                <th class="text-center" style="width: 85px;">ĐTBmhk</th>
              </tr>
            </thead>
            <tbody>
              ${moetRows}
            </tbody>
          </table>
          ${specialTableHtml}
        `
      }

      const singleColLabel = effectiveDisplayMode === "MIDTERM" ? "ĐĐGgk" : "Điểm KS"
      const rowsHtml = subjects.map((sub, idx: number) => {
        const badgeHtml =
          effectiveDisplayMode === "MIDTERM"
            ? formatPrintBadge(sub.isSpecialSubject ? (sub.specialScore ?? sub.ddgGk) : sub.ddgGk, sub.score)
            : formatPrintBadge(null, sub.score)
        return `
          <tr>
            <td class="stt">${idx + 1}</td>
            <td class="subj-name">${sub.name} ${sub.code ? `<span class="subj-code">(${sub.code})</span>` : ""}</td>
            <td class="score">${badgeHtml}</td>
          </tr>
        `
      }).join("")

      return `
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">STT</th>
              <th>Môn học</th>
              <th class="text-center" style="width: 90px;">${singleColLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    }

    const printTablesHtml = buildPrintTableHtml()

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Phieu_Bao_Diem_${student.studentName || "HocSinh"}_${selectedPeriod}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .page-card {
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #008c82;
      padding-bottom: 7px;
      margin-bottom: 9px;
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .school-logo-img {
      height: 38px;
      width: auto;
      object-fit: contain;
    }
    .school-divider {
      width: 1.5px;
      height: 30px;
      background: #cbd5e1;
    }
    .school-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #005B58;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      line-height: 1.2;
    }
    .system-info {
      text-align: right;
    }
    .system-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .system-slogan {
      font-size: 8.5px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    .class-badge {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
    }
    .report-heading {
      text-align: center;
      margin: 6px 0 10px 0;
    }
    .report-title {
      font-size: 14.5px;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 3px 0;
    }
    .year-badge {
      display: inline-block;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #008c82;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 9px;
      border-radius: 9999px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #ccfbf1;
      border-radius: 7px;
      padding: 6px 12px;
      margin-bottom: 9px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 18px;
    }
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 2px;
      font-size: 10px;
    }
    .info-row:nth-last-child(-n+2) {
      border-bottom: none;
      padding-bottom: 0;
    }
    .info-label { color: #475569; font-weight: 600; }
    .info-val { font-weight: 800; color: #0f172a; }
    .info-val-highlight { font-weight: 900; color: #003B3A; }
    .info-val-blue { font-weight: 900; color: #0284c7; text-transform: uppercase; }
    
    .section-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #003B3A;
      letter-spacing: 0.3px;
    }
    .section-count {
      font-size: 9px;
      font-weight: 700;
      color: #008c82;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
      border: 1px solid #94a3b8;
    }
    th {
      background: #005B58;
      color: #ffffff;
      font-weight: 800;
      padding: 4.5px 8px;
      text-align: left;
      border-right: 1px solid #004745;
      font-size: 10px;
    }
    th.text-center { text-align: center; }
    td {
      padding: 4px 8px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
    }
    td.stt { text-align: center; color: #64748b; font-weight: 700; width: 40px; }
    td.subj-name { font-weight: 800; color: #003B3A; }
    .subj-code { font-size: 8.5px; font-weight: 400; color: #64748b; margin-left: 3px; }
    td.score { text-align: center; width: 90px; }
    tr:nth-child(even) td { background: #f8fafc; }
    
    .score-badge {
      display: inline-block;
      padding: 1.5px 8px;
      border-radius: 4px;
      font-weight: 900;
      font-size: 10px;
    }
    .score-good { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .score-fair { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
    .score-avg { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .score-weak { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
    .score-empty { color: #94a3b8; font-weight: 700; }

    .exchange-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 9px;
    }
    .box-card {
      border: 1px solid #ccfbf1;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f0fdfa;
    }
    .box-card.parent-box {
      border-color: #bae6fd;
      background: #f0f9ff;
    }
    .box-header {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .box-header-teacher { color: #005B58; }
    .box-header-parent { color: #0369a1; }
    .box-content {
      font-size: 9.5px;
      color: #334155;
      line-height: 1.35;
      font-style: italic;
    }
    .signature-section {
      margin-top: 6px;
      page-break-inside: avoid;
    }
    .signature-date {
      text-align: right;
      font-style: italic;
      color: #475569;
      font-size: 9.5px;
      margin-bottom: 4px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      gap: 10px;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 8px;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
    }
    .sig-space {
      height: 38px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-name {
      font-weight: 900;
      color: #003B3A;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="page-card">
    <div class="header-row">
      <div class="school-brand">
        <img src="/logo.png" alt="Sky-Line" class="school-logo-img" />
        <div class="school-divider"></div>
        <div>
          <div class="school-title">${schoolTitle}</div>
        </div>
      </div>
      <div class="system-info">
        <div class="system-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
        <div class="system-slogan">Nơi Khởi nguồn hạnh phúc</div>
        <div class="class-badge">Mã lớp: <b>${className}</b></div>
      </div>
    </div>

    <div class="report-heading">
      <h1 class="report-title">${reportMainTitle}</h1>
      <div class="year-badge">📅 ${reportYearTitle}</div>
    </div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Họ và tên học sinh:</span>
        <span class="info-val-highlight">${student.studentName || "-"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Lớp:</span>
        <span class="info-val">${className}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Mã số học sinh:</span>
        <span class="info-val">${student.studentCode || "-"}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Giáo viên chủ nhiệm (GVCN):</span>
        <span class="info-val">${teacherName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ngày sinh:</span>
        <span class="info-val">${dob}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Kỳ đánh giá / Học kỳ:</span>
        <span class="info-val-blue">${periodLabel}</span>
      </div>
    </div>

    <div class="section-bar">
      <div class="section-title">BẢNG ĐIỂM MÔN HỌC — ${periodLabel.toUpperCase()}</div>
      <div class="section-count">${subjects.length} môn học</div>
    </div>

    ${printTablesHtml}

    <div class="exchange-section">
      <div class="box-card">
        <div class="box-header box-header-teacher">Ý kiến & Nhận xét của GVCN:</div>
        <div class="box-content">${teacherRemark}</div>
      </div>
      <div class="box-card parent-box">
        <div class="box-header box-header-parent">Ý kiến trao đổi của PHHS:</div>
        <div class="box-content">${parentMsg}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-date">Đà Nẵng, ngày ...... tháng ...... năm 20......</div>
      <div class="signature-grid">
        <div>
          <div class="sig-title">Phụ Huynh Học Sinh</div>
          <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
          <div class="sig-space"></div>
        </div>
        <div>
          <div class="sig-title">Giáo Viên Chủ Nhiệm</div>
          <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
          <div class="sig-space">
            <span class="sig-name">${teacherName}</span>
          </div>
        </div>
        <div>
          <div class="sig-title">Ban Giám Hiệu</div>
          <div class="sig-sub">(Ký và đóng dấu)</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  const handlePrint = () => {
    setIsPrinting(true)
    const printHtml = getFullPrintHtml()

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (!iframeDoc) {
      setIsPrinting(false)
      return
    }

    iframeDoc.open()
    iframeDoc.write(printHtml)
    iframeDoc.close()

    setTimeout(() => {
      setIsPrinting(false)
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        iframe.remove()
      }, 3000)
    }, 250)
  }

  const handleOpenHtmlTab = () => {
    const printHtml = getFullPrintHtml()
    const printWin = window.open("", "_blank")
    if (printWin) {
      printWin.document.open()
      printWin.document.write(printHtml)
      printWin.document.close()
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-slate-800 pb-16 pt-2">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] p-5 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-black text-teal-100 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>BẢNG ĐIỂM & ĐIỂM KIỂM TRA ĐỊNH KỲ</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Báo Cáo Điểm & Trao Đổi Cùng Thầy Cô GVCN
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 font-medium">
              Theo dõi kết quả các kỳ điểm kiểm tra học tập của con em và gửi ý kiến phản hồi, trao đổi trực tiếp với Giáo viên chủ nhiệm.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              disabled={loading || isPrinting || allPeriodsLocked || Boolean(data?.isLockedForParent)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#003B3A] hover:bg-teal-50 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span>{isPrinting ? "Đang chuẩn bị in..." : "In phiếu điểm (A4)"}</span>
            </button>
            <button
              onClick={handleOpenHtmlTab}
              disabled={loading || allPeriodsLocked || Boolean(data?.isLockedForParent)}
              title="Mở phiếu điểm trong tab mới"
              className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Select Child (if > 1) & Select Period */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        {childrenList.length > 1 && (
          <div>
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#008c82]" />
              <span>Chọn con em:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {childrenList.map((child) => {
                const isSelected = child.id === selectedStudentId
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedStudentId(child.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-[#003B3A] border-[#003B3A] text-white shadow-md shadow-teal-900/15"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${
                      isSelected ? "bg-white text-[#003B3A]" : "bg-teal-100 text-teal-800"
                    }`}>
                      {child.studentName ? child.studentName.charAt(0) : "H"}
                    </div>
                    <div className="text-left leading-tight">
                      <div className="font-extrabold">{child.studentName}</div>
                      <div className={`text-[10px] ${isSelected ? "text-teal-200" : "text-slate-500"}`}>
                        Lớp: {child.class?.className || "N/A"} • MS: {child.studentCode || "-"}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {openPeriods.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Kỳ đánh giá đang mở:</span>
            </div>
            <div
              className={`grid gap-2 ${
                openPeriods.length === 1
                  ? "grid-cols-1 sm:max-w-xs"
                  : openPeriods.length === 2
                    ? "grid-cols-2 sm:max-w-md"
                    : openPeriods.length === 3
                      ? "grid-cols-2 sm:grid-cols-3"
                      : openPeriods.length === 4
                        ? "grid-cols-2 sm:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-5"
              }`}
            >
              {openPeriods.map((period) => {
                const isActive = period.code === selectedPeriod
                return (
                  <button
                    key={period.code}
                    onClick={() => setSelectedPeriod(period.code)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-[#003B3A] to-[#00736E] border-[#003B3A] text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-teal-50/50 hover:border-teal-200"
                    }`}
                  >
                    <div>{period.short}</div>
                    <div className={`text-[10px] font-normal truncate mt-0.5 ${isActive ? "text-teal-100" : "text-slate-500"}`}>
                      {period.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Grade Report Card (Preview) */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/90 shadow-sm text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Đang tải phiếu điểm...</p>
        </div>
      ) : allPeriodsLocked || data?.isLockedForParent ? (
        <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-[#003B3A]">
              {allPeriodsLocked
                ? "Bảng điểm hiện đang tạm khóa hiển thị"
                : `Điểm ${periodLabel} hiện đang khóa hiển thị`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {data?.lockReason ||
                "Nhà trường hiện đang tạm khóa hiển thị điểm các kỳ đánh giá trên cổng Phụ huynh để rà soát và tổng hợp. Quý phụ huynh vui lòng quay lại sau khi nhà trường công bố hoặc liên hệ Giáo viên chủ nhiệm khi cần trao đổi thêm."}
            </p>
          </div>
          {openPeriods.length > 0 && (
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
              {openPeriods.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setSelectedPeriod(p.code)}
                  className="px-3.5 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005B58] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Xem điểm {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/90 shadow-md space-y-6">
          
          {/* Top School Branding */}
          <div className="flex items-start justify-between border-b-2 border-[#008c82] pb-4 gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Sky-Line"
                className="h-10 sm:h-12 w-auto object-contain shrink-0"
              />
              <div className="w-[1.5px] h-9 bg-slate-200 hidden sm:block"></div>
              <div>
                <div className="text-xs sm:text-sm font-black text-[#005B58] tracking-tight uppercase leading-tight">
                  {schoolTitle}
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block shrink-0">
              <div className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
                HỆ THỐNG GIÁO DỤC SKY-LINE
              </div>
              <div className="text-[9px] font-bold text-teal-700 italic">
                Nơi Khởi nguồn hạnh phúc
              </div>
              <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                Mã lớp: <span className="font-bold text-slate-900">{data?.classInfo?.className}</span>
              </div>
            </div>
          </div>

          {/* Report Main Heading */}
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-xl font-black text-[#003B3A] uppercase tracking-tight">
              {reportMainTitle}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-extrabold text-[#008c82]">
              <Calendar className="w-3.5 h-3.5 text-[#008c82]" />
              <span>{reportYearTitle}</span>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="bg-gradient-to-r from-teal-50/60 via-sky-50/40 to-teal-50/60 p-4 rounded-2xl border border-teal-200/80 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-teal-100/70 pb-1">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  Họ và tên học sinh:
                </span>
                <strong className="font-black text-[#003B3A] text-sm">
                  {data?.student?.studentName || currentChild?.studentName}
                </strong>
              </div>

              <div className="flex items-center justify-between border-b border-teal-100/70 pb-1">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  Lớp học:
                </span>
                <strong className="font-black text-teal-900">
                  {data?.classInfo?.className || currentChild?.class?.className}
                </strong>
              </div>

              <div className="flex items-center justify-between border-b border-teal-100/70 pb-1">
                <span className="text-slate-600 font-semibold">Mã số học sinh:</span>
                <span className="font-extrabold text-slate-800 tracking-wider">
                  {data?.student?.studentCode || currentChild?.studentCode || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-teal-100/70 pb-1">
                <span className="text-slate-600 font-semibold">Giáo viên chủ nhiệm (GVCN):</span>
                <span className="font-extrabold text-slate-800">
                  {data?.classInfo?.homeroomTeacherName || currentChild?.homeroomTeacherName}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-teal-100/70 pb-1 sm:border-b-0">
                <span className="text-slate-600 font-semibold">Ngày sinh:</span>
                <span className="font-bold text-slate-700">
                  {data?.student?.dateOfBirth ? new Date(data.student.dateOfBirth).toLocaleDateString("vi-VN") : "-"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">Kỳ đánh giá / Học kỳ:</span>
                <span className="font-black text-[#0284C7] uppercase">{periodLabel}</span>
              </div>
            </div>
          </div>

          {/* Periodic Subject Grades Table (Only Periodic Columns: Special Subjects, ĐĐGgk, ĐĐGck, ĐTBmhk) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#008B85]" />
                <span>
                  {effectiveDisplayMode === "ENDTERM"
                    ? `Bảng điểm định kỳ — ${periodLabel}`
                    : `Bảng điểm môn học — ${periodLabel}`}
                </span>
              </h3>
              <span className="text-xs font-semibold text-teal-800 tabular-nums">
                {data?.subjects?.length || 0} môn học
              </span>
            </div>

            {effectiveDisplayMode !== "KSDN" && (
              <div className="text-[11px] text-slate-600 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2">
                Chỉ hiển thị các cột điểm định kỳ ({effectiveDisplayMode === "ENDTERM" ? "cột điểm các môn đặc thù, ĐĐGgk, ĐĐGck, ĐTBmhk" : "ĐĐGgk và điểm định kỳ môn đặc thù"}), không hiển thị điểm đánh giá thường xuyên (ĐĐGtx).
              </div>
            )}

            {effectiveDisplayMode === "ENDTERM" ? (
              <div className="space-y-5">
                {/* 1. Standard MOET Subjects Table */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs tabular-nums">
                      <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2.5 px-3 text-center w-12 text-white font-semibold">STT</th>
                          <th className="py-2.5 px-3 text-white font-semibold">Môn học</th>
                          <th className="py-2.5 px-3 text-center w-24 text-teal-100 font-semibold">ĐĐGgk</th>
                          <th className="py-2.5 px-3 text-center w-24 text-teal-100 font-semibold">ĐĐGck</th>
                          <th className="py-2.5 px-3 text-center w-28 text-[#5EEAD4] font-semibold">ĐTBmhk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {moetSubjectsList.length > 0 ? (
                          moetSubjectsList.map((sub, idx: number) => (
                            <tr
                              key={sub.id}
                              className="transition-colors align-middle hover:bg-[#F8FAFC]"
                            >
                              <td className="py-3 px-3 text-center font-semibold text-slate-500 align-middle">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 font-bold text-[#003B3A] align-middle">
                                <span>{sub.name}</span>
                                {sub.code && <span className="text-[10px] font-normal text-slate-400 ml-1.5">({sub.code})</span>}
                                {sub.remark && (
                                  <div className="text-[10px] font-normal text-slate-500 italic mt-0.5">
                                    Nhận xét: {sub.remark}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center align-middle">
                                {renderPeriodicBadge(sub.ddgGk)}
                              </td>
                              <td className="py-3 px-3 text-center align-middle">
                                {renderPeriodicBadge(sub.ddgCk)}
                              </td>
                              <td className="py-3 px-3 text-center align-middle">
                                {renderPeriodicBadge(sub.dtbMhk, true)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 font-medium italic">
                              Chưa có dữ liệu điểm định kỳ cho các môn học chuẩn trong học kỳ này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Special Subjects Table (Sky-Line Đặc thù & Song ngữ / Quốc tế) */}
                {specialSubjectsList.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#003B3A] flex items-center gap-1.5">
                        <span className="w-1.5 h-4 rounded-full bg-[#00A19A] inline-block" />
                        <span>Cột điểm các môn đặc thù</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-teal-700 tabular-nums">
                        {specialSubjectsList.length} môn đặc thù
                      </span>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs tabular-nums">
                          <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                            <tr className="text-[11px] font-semibold whitespace-nowrap">
                              <th className="py-2.5 px-3 text-center w-12 text-white font-semibold">STT</th>
                              <th className="py-2.5 px-3 text-white font-semibold">Môn đặc thù</th>
                              <th className="py-2.5 px-3 text-center w-24 text-teal-100 font-semibold">ĐĐGgk</th>
                              <th className="py-2.5 px-3 text-center w-24 text-teal-100 font-semibold">ĐĐGck</th>
                              <th className="py-2.5 px-3 text-center w-28 text-[#5EEAD4] font-semibold">Điểm đặc thù</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                            {specialSubjectsList.map((sub, idx: number) => (
                              <tr
                                key={sub.id}
                                className="transition-colors align-middle hover:bg-[#F8FAFC]"
                              >
                                <td className="py-3 px-3 text-center font-semibold text-slate-500 align-middle">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3 font-bold text-[#003B3A] align-middle">
                                  <span>{sub.name}</span>
                                  {sub.code && <span className="text-[10px] font-normal text-slate-400 ml-1.5">({sub.code})</span>}
                                  {sub.remark && (
                                    <div className="text-[10px] font-normal text-slate-500 italic mt-0.5">
                                      Nhận xét: {sub.remark}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  {renderPeriodicBadge(sub.ddgGk)}
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  {renderPeriodicBadge(sub.ddgCk)}
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  {renderPeriodicBadge(sub.specialScore ?? sub.dtbMhk, true)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* KSĐN or MIDTERM (GK1 / GK2) 3-Column Table */
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-2.5 px-3 text-center w-12 text-white font-semibold">STT</th>
                        <th className="py-2.5 px-3 text-white font-semibold">Môn học</th>
                        <th className="py-2.5 px-3 text-center w-32 text-[#5EEAD4] font-semibold">
                          {effectiveDisplayMode === "MIDTERM" ? "ĐĐGgk" : "Điểm KS"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {data?.subjects && data.subjects.length > 0 ? (
                        data.subjects.map((sub, idx: number) => {
                          const cellVal: PeriodicGradeValue | null =
                            effectiveDisplayMode === "MIDTERM"
                              ? (sub.isSpecialSubject ? (sub.specialScore ?? sub.ddgGk ?? null) : (sub.ddgGk ?? null))
                              : sub.scoreDisplay
                                ? {
                                    display: sub.scoreDisplay,
                                    numeric: sub.score,
                                    badge: (sub.scoreBadge as PeriodicGradeValue["badge"]) || "pass",
                                  }
                                : sub.score !== null && sub.score !== undefined
                                  ? {
                                      display: Number(sub.score).toFixed(1),
                                      numeric: Number(sub.score),
                                      badge:
                                        Number(sub.score) >= 8.0
                                          ? "good"
                                          : Number(sub.score) >= 6.5
                                            ? "fair"
                                            : Number(sub.score) >= 5.0
                                              ? "avg"
                                              : "weak",
                                    }
                                  : null
                          return (
                            <tr
                              key={sub.id}
                              className="transition-colors align-middle hover:bg-[#F8FAFC]"
                            >
                              <td className="py-3 px-3 text-center font-semibold text-slate-500 align-middle">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 font-bold text-[#003B3A] align-middle">
                                <span>{sub.name}</span>
                                {sub.code && <span className="text-[10px] font-normal text-slate-400 ml-1.5">({sub.code})</span>}
                                {sub.isSpecialSubject && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-medium">
                                    Môn đặc thù
                                  </span>
                                )}
                                {sub.remark && (
                                  <div className="text-[10px] font-normal text-slate-500 italic mt-0.5">
                                    Ghi chú: {sub.remark}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center align-middle">
                                {renderPeriodicBadge(cellVal, true)}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400 font-medium italic">
                            Chưa có danh sách môn học được cấu hình cho kỳ đánh giá này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 4. Trao Đổi Với GVCN Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-teal-200 pb-2">
              <h3 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <span>Trao Đổi Giữa Giáo Viên Chủ Nhiệm & Phụ Huynh</span>
              </h3>
              <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Đồng hành 3 chiều
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: GVCN Remarks */}
              <div className="bg-gradient-to-br from-teal-50/90 to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-[#005B58] uppercase flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-teal-700" />
                    <span>Ý kiến & Nhận xét của GVCN</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
                    {data?.classInfo?.homeroomTeacherName || "GVCN"}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3 rounded-xl border border-teal-100">
                  {data?.exchange?.teacherRemark || "Giáo viên chủ nhiệm ghi nhận tinh thần và kết quả tham gia kỳ khảo sát của học sinh. Đề nghị học sinh tiếp tục nỗ lực phát huy điểm mạnh và duy trì tinh thần học tập tích cực."}
                </p>
                {data?.exchange?.teacherRemarkDate && (
                  <div className="text-[10px] text-teal-700 font-medium flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    <span>Ghi nhận: {new Date(data.exchange.teacherRemarkDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                )}
              </div>

              {/* Box 2: Parent Feedback Form */}
              <div className="bg-gradient-to-br from-sky-50/90 to-blue-50/50 p-4 sm:p-5 rounded-2xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-[#0369a1] uppercase flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-sky-600" />
                    <span>Ý kiến phản hồi từ Phụ huynh</span>
                  </div>
                  {data?.exchange?.parentFeedback && !isEditingFeedback && (
                    <button
                      onClick={() => setIsEditingFeedback(true)}
                      className="text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-sky-200 cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa ý kiến</span>
                    </button>
                  )}
                </div>

                {/* Feedback Display or Edit Box */}
                {!isEditingFeedback && data?.exchange?.parentFeedback ? (
                  <div className="space-y-2">
                    <div className="bg-white/90 p-3 rounded-xl border border-sky-200 text-xs text-slate-800 leading-relaxed font-medium">
                      &ldquo;{data.exchange.parentFeedback}&rdquo;
                    </div>
                    {data?.exchange?.parentFeedbackDate && (
                      <div className="text-[10px] text-sky-700 font-medium flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã gửi: {new Date(data.exchange.parentFeedbackDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <textarea
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      rows={3}
                      placeholder="Quý Phụ huynh vui lòng nhập ý kiến trao đổi, chia sẻ tình hình học tập của con ở nhà hoặc gửi lời nhắn tới Thầy Cô GVCN..."
                      className="w-full text-xs p-3 rounded-xl border border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white shadow-inner resize-none font-medium leading-relaxed"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFeedbackInput(prev => prev ? `${prev} ${sug}` : sug)}
                          className="text-[10px] bg-white hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full border border-sky-200 transition-colors cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {data?.exchange?.parentFeedback && isEditingFeedback && (
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackInput(data.exchange?.parentFeedback || "")
                            setIsEditingFeedback(false)
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveFeedback}
                        disabled={savingFeedback || !feedbackInput.trim()}
                        className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{savingFeedback ? "Đang gửi..." : "Gửi trao đổi cho GVCN"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Signatures (3 Columns) */}
          <div className="pt-2 text-xs">
            <div className="text-right text-slate-600 italic mb-3 text-[11px]">
              Đà Nẵng, ngày ...... tháng ...... năm 20......
            </div>

            <div className="grid grid-cols-3 text-center gap-4">
              <div className="space-y-1">
                <div className="font-black text-slate-900 uppercase text-xs">
                  Phụ Huynh Học Sinh
                </div>
                <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-bold text-slate-700 text-xs italic">
                    {data?.exchange?.parentFeedback ? "Đã phản hồi trực tuyến" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-black text-slate-900 uppercase text-xs">
                  Giáo Viên Chủ Nhiệm
                </div>
                <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-14 flex items-end justify-center">
                  <span className="font-black text-slate-900 text-xs">
                    {data?.classInfo?.homeroomTeacherName || currentChild?.homeroomTeacherName}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-black text-slate-900 uppercase text-xs">
                  Ban Giám Hiệu
                </div>
                <div className="text-[10px] text-slate-500 italic">(Ký và đóng dấu)</div>
                <div className="h-14"></div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
