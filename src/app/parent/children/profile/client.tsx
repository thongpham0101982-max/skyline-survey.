"use client"

import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import {
  GraduationCap,
  User,
  UserCheck,
  Award,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  Star,
  Calendar,
  School,
  Users,
  Sparkles,
  FileText,
  Compass,
  Phone,
  Mail,
  Printer,
  Download,
  MessageSquare,
  Bookmark,
  Heart,
  Globe,
  Loader2,
  ChevronRight
} from "lucide-react"
import StudentProfileCoverA4 from "@/components/student/StudentProfileCoverA4"
import { StudentSpecialSubjectsSection } from "@/components/student/StudentSpecialSubjectsSection"
import { StudentCompetencyPortfolio } from "@/components/competency/StudentCompetencyPortfolio"
import { resolveStudentSectionVisibility } from "@/lib/studentProfileSectionConfig"

const getCategoryLabel = (cat: string) => {
  if (!cat) return "Lĩnh vực khác"
  const str = String(cat).toUpperCase()
  if (str === "OLYMPIC") return "Olympic"
  if (str === "KHKT") return "Khoa học kỹ thuật"
  if (str === "THE_THAO") return "Thể dục thể thao"
  if (str === "VAN_NGHE") return "Văn nghệ - Nghệ thuật"
  if (str === "HOC_THUAT") return "Học thuật"
  if (str === "STEM") return "STEM / Robotics"
  return cat
}

const getLevelLabel = (lvl: string) => {
  if (!lvl) return "Cấp Trường"
  const str = String(lvl).toUpperCase()
  if (str === "VANG" || str === "NHAT") return "Giải Vàng / Hạng Nhất"
  if (str === "BAC" || str === "NHI") return "Giải Bạc / Hạng Nhì"
  if (str === "DONG" || str === "BA") return "Giải Đồng / Hạng Ba"
  if (str === "KHUYEN_KHICH") return "Giải Khuyến Khích"
  if (str === "CAP_QUOC_TE" || str === "5") return "Cấp Quốc tế"
  if (str === "CAP_QUOC_GIA" || str === "4") return "Cấp Quốc gia"
  if (str === "CAP_THANH_PHO" || str === "CAP_TINH" || str === "3") return "Cấp Thành phố / Tỉnh"
  if (str === "CAP_QUAN" || str === "CAP_HUYEN" || str === "2") return "Cấp Quận / Huyện"
  if (str === "CAP_TRUONG" || str === "1") return "Cấp Trường"
  return lvl.startsWith("Cấp") || lvl.startsWith("Giải") ? lvl : `Giải/Cấp: ${lvl}`
}

export default function ParentStudentProfilePage({
  initialChildren = []
}: {
  initialChildren?: any[]
}) {
  const [childrenList, setChildrenList] = useState<any[]>(initialChildren)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialChildren[0]?.id || "")
  const [academicYearId, setAcademicYearId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(initialChildren.length === 0)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [cvViewMode, setCvViewMode] = useState<"all" | "cover" | "content">("all")
  const [configMap, setConfigMap] = useState<Record<string, Record<string, boolean>>>({})
  const [activeTab, setActiveTab] = useState<
    | "hshs_detail"
    | "advisory"
    | "moet"
    | "competencies"
    | "entrance"
    | "achievements"
    | "experiences"
    | "orientation"
    | "comments"
    | "support"
  >("hshs_detail")

  useEffect(() => {
    fetch("/api/admin/student-profiles/section-config")
      .then(res => res.json())
      .then(json => {
        if (json?.success && json?.data) {
          setConfigMap(json.data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let year = ""
    if (typeof window !== "undefined") {
      year = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(year)
      const qId = new URLSearchParams(window.location.search).get("studentId")
      if (qId) setSelectedStudentId(qId)
    }

    async function loadChildren(targetYearId: string) {
      try {
        const url = targetYearId ? `/api/parent/children?academicYearId=${targetYearId}` : "/api/parent/children"
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setChildrenList(data)
            setSelectedStudentId(prev => {
              if (prev && data.some((c: any) => c.id === prev)) return prev
              return data[0].id
            })
          } else if (!initialChildren.length) {
            setChildrenList([])
            setSelectedStudentId("")
          }
        }
      } catch (e) {
        console.error("Error loading parent children:", e)
      }
    }

    if (year) {
      loadChildren(year)
    }

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

  useEffect(() => {
    if (!selectedStudentId) {
      if (childrenList.length === 0) {
        setLoading(false)
      }
      return
    }

    async function load360Profile() {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/advisory/profile-360?studentId=${selectedStudentId}&academicYearId=${academicYearId}&_t=${Date.now()}`
        )
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (e) {
        console.error("Error loading 360 profile:", e)
      } finally {
        setLoading(false)
      }
    }
    load360Profile()
  }, [selectedStudentId, academicYearId])

  const selectedChild = childrenList.find(c => c.id === selectedStudentId) || {}
  const rawStudent = profile?.student || selectedChild
  const termSummaries = profile?.termSummaries || rawStudent?.termSummaries || []
  const termScores = profile?.termScores || rawStudent?.termScores || []
  const subjectGradeEntries = profile?.subjectGradeEntries || rawStudent?.subjectGradeEntries || []
  const entranceSurvey = profile?.entranceSurvey || profile?.inputAssessment || null
  const achievements = profile?.achievements || []
  const goals = profile?.goals || rawStudent?.goals || []
  const goalTrackings = profile?.goalTrackings || rawStudent?.goalTrackings || []
  const termEvaluations = profile?.termEvaluations || rawStudent?.termEvaluations || []
  const careerOrientation = profile?.careerOrientation || profile?.orientation || null
  const learningCommitment = profile?.learningCommitment || profile?.commitment || null
  const highlightComments = profile?.highlightComments || []
  const experientialActivities = profile?.experientialActivities || []
  const projectExperiences = profile?.projectExperiences || profile?.projects || []
  const learningSupportTargets = profile?.learningSupportTargets || []
  const consultationLogs = profile?.consultationLogs || []

  const dateOfBirthStr = rawStudent?.dateOfBirth
    ? new Date(rawStudent.dateOfBirth).toLocaleDateString("vi-VN")
    : "N/A"
  const genderStr = rawStudent?.gender || "Nam"
  const classNameStr = rawStudent?.class?.className || selectedChild?.class?.className || rawStudent?.className || "N/A"
  const campusNameStr =
    rawStudent?.class?.campus?.campusName ||
    rawStudent?.campus?.campusName ||
    selectedChild?.class?.campus?.campusName ||
    "Sky-Line"
  const academicYearNameStr =
    rawStudent?.academicYear?.name ||
    rawStudent?.class?.academicYear?.name ||
    selectedChild?.academicYear?.name ||
    "2026-2027"
  const homeroomTeacherName =
    profile?.homeroomTeacherName && profile.homeroomTeacherName !== "Chưa phân công"
      ? profile.homeroomTeacherName
      : rawStudent?.homeroomTeacherName && rawStudent.homeroomTeacherName !== "Chưa phân công"
      ? rawStudent.homeroomTeacherName
      : selectedChild?.homeroomTeacherName && selectedChild.homeroomTeacherName !== "Chưa phân công"
      ? selectedChild.homeroomTeacherName
      : "Chưa phân công"
  const homeroomTeacherInfo = profile?.homeroomTeacher || rawStudent?.homeroomTeacher || null

  // Enriched student object matching GVCN's selectedStudent structure
  const enrichedStudent = useMemo(
    () => ({
      ...selectedChild,
      ...rawStudent,
      ...profile,
      id: rawStudent?.id || selectedChild?.id || selectedStudentId,
      studentName: rawStudent?.studentName || selectedChild?.studentName || "Học sinh",
      studentCode: rawStudent?.studentCode || selectedChild?.studentCode || "",
      vneduCode: rawStudent?.vneduCode || null,
      gender: genderStr,
      dob: dateOfBirthStr,
      className: classNameStr,
      campusName: campusNameStr,
      yearName: academicYearNameStr,
      yearTheme: rawStudent?.academicYear?.theme || rawStudent?.class?.academicYear?.theme || null,
      homeroomTeacherName,
      termScores,
      termSummaries,
      subjectGradeEntries,
      goals,
      goalTrackings,
      termEvaluations,
      achievements,
      experientialActivities,
      projectExperiences,
      highlightComments,
      entranceSurvey,
      learningSupportTargets,
      specialSubjectsPortfolio: profile?.specialSubjectsPortfolio || rawStudent?.specialSubjectsPortfolio || null,
      specialGradeEntries: profile?.specialGradeEntries || rawStudent?.specialGradeEntries || []
    }),
    [
      selectedChild,
      rawStudent,
      profile,
      selectedStudentId,
      genderStr,
      dateOfBirthStr,
      classNameStr,
      campusNameStr,
      academicYearNameStr,
      homeroomTeacherName,
      termScores,
      termSummaries,
      subjectGradeEntries,
      goals,
      goalTrackings,
      termEvaluations,
      achievements,
      experientialActivities,
      projectExperiences,
      highlightComments,
      entranceSurvey,
      learningSupportTargets
    ]
  )

  // Process MOET & Bilingual periodic and term grades (synchronized with GVCN view)
  const gradeData = useMemo(() => {
    const isBilingualSub = (name: string, code: string) => {
      const s = `${name} ${code}`.toLowerCase()
      return (
        s.includes("esl") ||
        s.includes("english") ||
        s.includes("tiếng anh tăng cường") ||
        s.includes("tav") ||
        s.includes("bilingual") ||
        s.includes("song ngữ") ||
        s.includes("maths") ||
        s.includes("science") ||
        s.includes("robotics")
      )
    }

    const periodicMap = new Map<
      string,
      { name: string; code: string; ksdn: any; gk1: any; ck1: any; gk2: any; ck2: any }
    >()
    subjectGradeEntries.forEach((entry: any) => {
      const sName = entry.subject?.subjectName || "Môn học"
      const sCode = entry.subject?.subjectCode || ""
      const key = (entry.subjectId || sName).trim()
      if (!periodicMap.has(key)) {
        periodicMap.set(key, { name: sName, code: sCode, ksdn: null, gk1: null, ck1: null, gk2: null, ck2: null })
      }
      const item = periodicMap.get(key)!
      const period = String(entry.evaluationPeriod || "").toUpperCase().trim()
      const scoreVal =
        entry.compositeScore !== null && entry.compositeScore !== undefined
          ? Number(entry.compositeScore).toFixed(1)
          : null
      if (period === "KSĐN" || period === "KSDN" || period.includes("ĐẦU NĂM")) item.ksdn = scoreVal
      else if (period === "GK1" || period.includes("GIỮA KỲ 1") || period.includes("GIỮA KÌ 1")) item.gk1 = scoreVal
      else if (period === "CK1" || period.includes("CUỐI KỲ 1") || period.includes("CUỐI KÌ 1")) item.ck1 = scoreVal
      else if (period === "GK2" || period.includes("GIỮA KỲ 2") || period.includes("GIỮA KÌ 2")) item.gk2 = scoreVal
      else if (period === "CK2" || period.includes("CUỐI KỲ 2") || period.includes("CUỐI KÌ 2")) item.ck2 = scoreVal
    })

    const termMap = new Map<string, { name: string; code: string; hk1: any; hk2: any; cn: any }>()
    termScores.forEach((ts: any) => {
      const sName = ts.subject?.subjectName || "Môn học"
      const sCode = ts.subject?.subjectCode || ""
      const key = (ts.subjectId || sName).trim()
      if (!termMap.has(key)) {
        termMap.set(key, { name: sName, code: sCode, hk1: null, hk2: null, cn: null })
      }
      const item = termMap.get(key)!
      const sem = String(ts.semester || "").toUpperCase().trim()
      const val =
        ts.score !== null && ts.score !== undefined
          ? Number(ts.score).toFixed(1)
          : ts.evaluationGrade || ts.gpaScore || ts.gradeText || null
      if (sem === "HK1" || sem === "HKI" || sem.includes("HỌC KỲ 1") || sem === "1") item.hk1 = val
      else if (sem === "HK2" || sem === "HKII" || sem.includes("HỌC KỲ 2") || sem === "2") item.hk2 = val
      else if (sem === "CN" || sem.includes("CẢ NĂM")) item.cn = val
    })

    const moetPeriodicRows = Array.from(periodicMap.values())
      .filter(r => !isBilingualSub(r.name, r.code))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    const bilingualPeriodicRows = Array.from(periodicMap.values())
      .filter(r => isBilingualSub(r.name, r.code))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))

    const moetTermRows = Array.from(termMap.values())
      .filter(r => !isBilingualSub(r.name, r.code))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))
    const bilingualTermRows = Array.from(termMap.values())
      .filter(r => isBilingualSub(r.name, r.code))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"))

    const sumHK1 = termSummaries.find(
      (s: any) => String(s.semester).toUpperCase().includes("1") || String(s.semester).toUpperCase() === "HK1"
    )
    const sumHK2 = termSummaries.find(
      (s: any) => String(s.semester).toUpperCase().includes("2") || String(s.semester).toUpperCase() === "HK2"
    )
    const sumCN = termSummaries.find(
      (s: any) => String(s.semester).toUpperCase().includes("CN") || String(s.semester).toUpperCase() === "NĂM"
    )

    return {
      moetPeriodicRows,
      bilingualPeriodicRows,
      moetTermRows,
      bilingualTermRows,
      sumHK1,
      sumHK2,
      sumCN
    }
  }, [subjectGradeEntries, termScores, termSummaries])

  const handleDownloadPDF = async () => {
    const targetElementId =
      cvViewMode === "content"
        ? "a4-student-portfolio"
        : cvViewMode === "cover"
        ? "a4-student-cover-wrapper"
        : "a4-student-portfolio-full-wrapper"
    const element = document.getElementById(targetElementId) || document.getElementById("a4-student-portfolio")
    if (!element) {
      window.print()
      return
    }
    setIsDownloadingPDF(true)
    try {
      const html2pdf = (await import("html2pdf.js")).default
      const sClass = String(enrichedStudent.className || "Lop")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
      const sCode = String(enrichedStudent.studentCode || "HS")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
      const sName = String(enrichedStudent.studentName || "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "_")
      const filename = `${sClass}_${sCode}_${sName}.pdf`
      const opt: any = {
        margin: [0, 0, 0, 0],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: Document) => {
            clonedDoc.querySelectorAll("style").forEach(styleEl => {
              if (styleEl.textContent && /(lab|oklch|oklab|lch)\([^)]*\)/i.test(styleEl.textContent)) {
                styleEl.textContent = styleEl.textContent
                  .replace(/lab\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/oklch\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/oklab\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/lch\([^)]*\)/gi, "rgba(0,0,0,0)")
              }
            })
            const portfolio = clonedDoc.getElementById("a4-student-portfolio")
            if (portfolio) {
              portfolio.style.border = "none"
              portfolio.style.boxShadow = "none"
              portfolio.style.borderRadius = "0px"
              portfolio.style.padding = "12mm 14mm"
              portfolio.style.width = "210mm"
              portfolio.style.maxWidth = "210mm"
            }
            clonedDoc.querySelectorAll(".no-print, .pdf-hide, button").forEach((el: any) => {
              el.style.display = "none"
            })
          }
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      }
      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error("Download PDF error:", err)
      window.print()
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans text-slate-800 pb-16">
      {/* Child Switcher & GVCN Class Info Bar */}
      {childrenList.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00A19A]" />
              <span>Chọn học sinh xem Hồ sơ Năng lực:</span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {childrenList.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedStudentId(c.id)}
                  className={
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer " +
                    (selectedStudentId === c.id
                      ? "bg-[#003B3A] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                  }
                >
                  {c.studentName} ({c.class?.className || "Lớp hiện tại"})
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 bg-teal-50/90 border border-teal-200/80 text-teal-900 px-3 py-1.5 rounded-xl font-bold shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-[#00A19A]" />
              <span className="text-slate-500 font-semibold">GVCN lớp {classNameStr}:</span>
              <span className="font-black text-[#003B3A]">{homeroomTeacherName}</span>
            </div>
            {homeroomTeacherInfo?.phone && (
              <a
                href={`tel:${homeroomTeacherInfo.phone}`}
                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl font-bold transition-colors"
                title="Số điện thoại GVCN"
              >
                <Phone className="w-3 h-3 text-[#00A19A]" />
                <span>{homeroomTeacherInfo.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {childrenList.length === 0 ? (
        loading ? (
          <div className="py-20 text-center text-xs font-extrabold text-slate-400 animate-pulse space-y-2">
            <GraduationCap className="w-8 h-8 mx-auto text-[#00A19A] animate-bounce" />
            <p>Đang tải Hồ sơ Năng lực Học sinh từ GVCN lớp...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Chưa có dữ liệu con em</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Tài khoản chưa có thông tin học sinh liên kết. Quý Phụ huynh vui lòng liên hệ Ban Giám hiệu hoặc GVCN để được hỗ trợ đồng bộ dữ liệu.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                href="/parent"
                className="px-5 py-2.5 rounded-2xl bg-[#003B3A] text-white text-xs font-bold hover:bg-[#004D4A] transition-all"
              >
                Chuyển sang trang Tổng quan
              </Link>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* TAB BAR SYNCHRONIZED WITH GVCN STUDENT PROFILE */}
          <div className="bg-white rounded-[28px] p-5 border border-slate-200/90 shadow-sm space-y-3 font-sans">
            {/* Row 1 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setActiveTab("hshs_detail")}
                className={
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold transition-all cursor-pointer " +
                  (activeTab === "hshs_detail"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <User className="w-4 h-4 text-[#00A19A]" />
                <span>Xem chi tiết HSHS (A4)</span>
              </button>

              <button
                onClick={() => setActiveTab("advisory")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "advisory"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>Cố vấn &amp; Mục tiêu 360°</span>
              </button>

              <button
                onClick={() => setActiveTab("moet")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "moet"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Kết quả Học tập (MOET &amp; Song ngữ)</span>
              </button>

              <button
                onClick={() => setActiveTab("competencies")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "competencies"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Đánh giá Năng lực 360°</span>
              </button>

              <button
                onClick={() => setActiveTab("entrance")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "entrance"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <ClipboardCheck className="w-4 h-4 text-slate-500" />
                <span>Khảo sát đầu vào</span>
              </button>
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 border-t border-slate-100">
              <button
                onClick={() => setActiveTab("achievements")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "achievements"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <Bookmark className="w-4 h-4 text-slate-500" />
                <span>Thành tích &amp; Khen thưởng</span>
              </button>

              <button
                onClick={() => setActiveTab("experiences")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "experiences"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span>Hoạt động trải nghiệm</span>
              </button>

              <button
                onClick={() => setActiveTab("orientation")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "orientation"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span>Hướng nghiệp</span>
              </button>

              <button
                onClick={() => setActiveTab("comments")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "comments"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span>Nhận xét từ GVCN</span>
              </button>

              <button
                onClick={() => setActiveTab("support")}
                className={
                  "flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer " +
                  (activeTab === "support"
                    ? "border-2 border-[#48BFE3] text-[#003B3A] bg-teal-50/50 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                }
              >
                <GraduationCap className="w-4 h-4 text-slate-500" />
                <span>Hỗ trợ học tập</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-extrabold text-slate-400 animate-pulse bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-7 h-7 mx-auto mb-2 text-[#00A19A] animate-spin" />
              Đang đồng bộ Hồ sơ Học sinh 360° từ Giáo viên Chủ nhiệm...
            </div>
          ) : (
            <div className="transition-all">
              {/* TAB 1: XEM CHI TIẾT HSHS (A4 PORTFOLIO ĐỒNG BỘ 100% VỚI GVCN LỚP) */}
              {activeTab === "hshs_detail" &&
                (() => {
                  const sectionVisibility = resolveStudentSectionVisibility(enrichedStudent, configMap)
                  const coverStudentData = {
                    studentName: enrichedStudent.studentName || "HỌC SINH SKY-LINE",
                    studentCode: enrichedStudent.studentCode || "",
                    vneduCode: enrichedStudent.vneduCode || null,
                    className: enrichedStudent.className || "",
                    campusName: enrichedStudent.campusName || "Sky-Line",
                    yearName: enrichedStudent.yearName || "2026-2027",
                    yearTheme: enrichedStudent.yearTheme || null,
                    qrDataUrl: null
                  }

                  return (
                    <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-300/60 shadow-inner flex flex-col items-center">
                      {/* SUB-TOOLBAR: Chọn chế độ xem Bìa A4 / Ruột A4 / Trọn bộ & Xuất PDF */}
                      <div className="w-full max-w-[210mm] mb-5 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-300 shadow-sm">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                          <button
                            onClick={() => setCvViewMode("all")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              cvViewMode === "all"
                                ? "bg-[#003B3A] text-white shadow-xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Trọn bộ (Bìa A4 + Ruột)
                          </button>
                          <button
                            onClick={() => setCvViewMode("cover")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              cvViewMode === "cover"
                                ? "bg-[#003B3A] text-white shadow-xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Bìa Học Sinh (A4)
                          </button>
                          <button
                            onClick={() => setCvViewMode("content")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              cvViewMode === "content"
                                ? "bg-[#003B3A] text-white shadow-xs font-black"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Ruột Hồ Sơ (A4)
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-110 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-60"
                          >
                            {isDownloadingPDF ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang xuất PDF...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Tải Hồ sơ PDF (A4)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div id="a4-student-portfolio-full-wrapper" className="w-full flex flex-col items-center">
                        {/* TRANG 1: BÌA HỒ SƠ HỌC SINH (A4) */}
                        {(cvViewMode === "all" || cvViewMode === "cover") && (
                          <div id="a4-student-cover-wrapper" className="w-full max-w-[210mm] mb-8 space-y-3">
                            <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-1.5 text-[#003B3A] font-extrabold uppercase tracking-wider text-[11px]">
                                <GraduationCap className="w-4 h-4 text-[#00A19A]" />
                                Trang Bìa Hồ Sơ Học Sinh (Khổ A4)
                              </span>
                              <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                                Đồng bộ từ GVCN: {homeroomTeacherName}
                              </span>
                            </div>
                            <StudentProfileCoverA4 student={coverStudentData} mode="preview" showExtraMeta={true} />
                          </div>
                        )}

                        {/* DẢI PHÂN CÁCH TRANG */}
                        {cvViewMode === "all" && (
                          <div className="no-print pdf-hide w-full max-w-[210mm] my-6 flex items-center gap-3 text-slate-400 text-xs font-bold">
                            <div className="flex-1 h-px bg-slate-300" />
                            <span className="px-4 py-1.5 bg-white rounded-full border border-slate-300 shadow-2xs text-slate-700 uppercase tracking-widest text-[11px] font-black flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#00A19A]" />
                              Ruột Hồ Sơ Năng Lực Học Sinh 360°
                            </span>
                            <div className="flex-1 h-px bg-slate-300" />
                          </div>
                        )}

                        {/* TRANG 2: RUỘT HỒ SƠ A4 */}
                        {(cvViewMode === "all" || cvViewMode === "content") && (
                          <div
                            id="a4-student-portfolio"
                            className="w-full max-w-[210mm] min-h-[297mm] bg-white border border-slate-300 shadow-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 font-sans relative overflow-hidden space-y-6 text-slate-800"
                          >
                            {/* TOP DECORATIVE BANNER */}
                            <div className="absolute top-0 left-0 right-0 h-3.5 bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-[#48BFE3]" />

                            {/* HEADER & ADMINISTRATIVE INFO */}
                            <div className="border-b-2 border-slate-100 pb-5 pt-2">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                                <div className="flex items-center gap-3.5">
                                  <img src="/logo.png" alt="Sky-Line School" className="h-11 w-auto object-contain" />
                                  <div>
                                    <div className="font-black text-[11px] tracking-widest text-[#00A19A] uppercase">
                                      HỆ THỐNG GIÁO DỤC SKY-LINE
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                                      HỒ SƠ NĂNG LỰC HỌC SINH
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      Student Comprehensive Profile &amp; Portfolio
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl text-right text-xs font-semibold text-slate-600 self-start sm:self-auto shadow-2xs">
                                  <div>
                                    Năm học: <span className="text-[#00A19A] font-black">{academicYearNameStr}</span>
                                  </div>
                                  <div>
                                    Cơ sở: <span className="text-slate-800 font-bold">{campusNameStr}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-8 mt-6">
                                {/* SECTION I: THÔNG TIN HỌC SINH */}
                                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                                    <User className="w-4 h-4 text-[#00A19A]" />
                                    I. THÔNG TIN HỌC SINH
                                  </h3>
                                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                      <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-teal-300 shadow-sm flex items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50/50">
                                        <img
                                          key={`parent-cv-photo-${enrichedStudent.id}`}
                                          src={`/api/student-photos/${enrichedStudent.id}?code=${encodeURIComponent(
                                            enrichedStudent.studentCode || ""
                                          )}`}
                                          alt={enrichedStudent.studentName}
                                          className="w-full h-full object-cover"
                                          onError={(e: any) => {
                                            e.currentTarget.style.display = "none"
                                            const fallback = e.currentTarget.nextElementSibling
                                            if (fallback && fallback.style) fallback.style.display = "flex"
                                          }}
                                          onLoad={(e: any) => {
                                            e.currentTarget.style.display = "block"
                                            const fallback = e.currentTarget.nextElementSibling
                                            if (fallback && fallback.style) fallback.style.display = "none"
                                          }}
                                        />
                                        <div
                                          style={{ display: "none" }}
                                          className="flex flex-col items-center justify-center text-slate-400 space-y-1 w-full h-full"
                                        >
                                          <User className="w-12 h-12 text-teal-700/60" />
                                          <span className="text-[10px] font-bold text-teal-800">Ảnh học sinh</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 w-full pt-1">
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Họ và tên
                                        </span>
                                        <span className="font-black text-slate-900 text-sm block">
                                          {enrichedStudent.studentName}
                                        </span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Mã học sinh
                                        </span>
                                        <span className="font-mono font-black text-[#00A19A] text-sm block">
                                          {enrichedStudent.studentCode}
                                        </span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Lớp học
                                        </span>
                                        <span className="font-bold text-slate-800 text-sm block">{classNameStr}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Ngày sinh
                                        </span>
                                        <span className="font-bold text-slate-800 block">{dateOfBirthStr}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Giới tính
                                        </span>
                                        <span className="font-bold text-slate-800 block">{genderStr}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                          Giáo viên chủ nhiệm (GVCN)
                                        </span>
                                        <span className="font-black text-teal-700 block">{homeroomTeacherName}</span>
                                      </div>
                                      {enrichedStudent.yearTheme && (
                                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-2.5 mt-0.5 border-t border-teal-100/80">
                                          <div className="inline-flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5 bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-transparent px-3.5 py-2 rounded-xl border-l-3 border-[#00A19A]">
                                            <span className="text-[10px] text-teal-700 font-extrabold uppercase tracking-widest shrink-0">
                                              ✦ Chủ đề theo Năm học:
                                            </span>
                                            <span className="text-sm font-bold italic text-[#003B3A]">
                                              &ldquo;{enrichedStudent.yearTheme}&rdquo;
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* SECTION II: CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU */}
                                {sectionVisibility.advisoryGoals &&
                                  (() => {
                                    const evalItem = termEvaluations[0] || null
                                    const gradeLevel = String(
                                      enrichedStudent.className || enrichedStudent.grade || ""
                                    ).toUpperCase()
                                    const isSecondaryOrHigh =
                                      !gradeLevel.match(/^(?:LỚP\s*)?[1-5][A-Z\.]/i) &&
                                      !gradeLevel.includes("KHỐI 1") &&
                                      !gradeLevel.includes("KHỐI 2") &&
                                      !gradeLevel.includes("KHỐI 3") &&
                                      !gradeLevel.includes("KHỐI 4") &&
                                      !gradeLevel.includes("KHỐI 5")

                                    const categories = isSecondaryOrHigh
                                      ? [
                                          { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                                          { key: "THOI_QUEN", label: "2. Mục tiêu thói quen", weight: 15 },
                                          { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng & Cảm xúc", weight: 15 },
                                          {
                                            key: "DINH_HUONG",
                                            label: "4. Mục tiêu định hướng & Hướng nghiệp",
                                            weight: 20
                                          }
                                        ]
                                      : [
                                          { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                                          { key: "SUC_KHOE", label: "2. Mục tiêu sức khỏe & Thói quen", weight: 20 },
                                          { key: "SO_THICH", label: "3. Mục tiêu sở thích & Năng khiếu", weight: 15 },
                                          { key: "PHAM_CHAT", label: "4. Mục tiêu phẩm chất & Đạo đức", weight: 15 }
                                        ]

                                    const advisoryRows: any[] = []
                                    categories.forEach(cat => {
                                      const matchedGoals = goals.filter((g: any) => {
                                        const gc = String(g.category || "").toUpperCase()
                                        if (cat.key === "HOC_TAP" && (gc.includes("HOC_TAP") || gc.includes("HỌC TẬP")))
                                          return true
                                        if (
                                          cat.key === "THOI_QUEN" &&
                                          (gc.includes("THOI_QUEN") ||
                                            gc.includes("THÓI QUEN") ||
                                            gc.includes("SUC_KHOE"))
                                        )
                                          return true
                                        if (
                                          cat.key === "KY_NANG_CAM_XUC" &&
                                          (gc.includes("KY_NANG") ||
                                            gc.includes("KỸ NĂNG") ||
                                            gc.includes("CAM_XUC") ||
                                            gc.includes("CẢM XÚC") ||
                                            gc.includes("SO_THICH"))
                                        )
                                          return true
                                        if (
                                          cat.key === "DINH_HUONG" &&
                                          (gc.includes("DINH_HUONG") ||
                                            gc.includes("ĐỊNH HƯỚNG") ||
                                            gc.includes("HUONG_NGHIEP") ||
                                            gc.includes("PHAM_CHAT"))
                                        )
                                          return true
                                        return false
                                      })

                                      if (matchedGoals.length === 0) {
                                        advisoryRows.push({
                                          catKey: cat.key,
                                          catLabel: cat.label,
                                          weight: cat.weight,
                                          isFirstInCat: true,
                                          totalInCat: 1,
                                          subIndex: 1,
                                          targetText: "Học sinh chưa cập nhật mục tiêu nhóm này",
                                          actionText: "",
                                          progressStatus: "CHUA_DANH_GIA",
                                          goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                                          initiativeLevel: evalItem?.initiativeLevel || null,
                                          participationAttitude: evalItem?.participationAttitude || null
                                        })
                                      } else {
                                        matchedGoals.forEach((g: any, idx: number) => {
                                          const tracking = goalTrackings.find(
                                            (t: any) =>
                                              (t.goalId && t.goalId === g.id) ||
                                              (t.targetText &&
                                                g.targetText &&
                                                t.targetText.trim() === g.targetText.trim()) ||
                                              (t.category && String(t.category).includes(cat.label))
                                          )
                                          const actionText = g.actions?.[0]?.actionText || ""
                                          advisoryRows.push({
                                            catKey: cat.key,
                                            catLabel: cat.label,
                                            weight: cat.weight,
                                            isFirstInCat: idx === 0,
                                            totalInCat: matchedGoals.length,
                                            subIndex: idx + 1,
                                            targetText: g.targetText,
                                            actionText,
                                            progressStatus: tracking?.progressStatus || "TIEN_TRIEN",
                                            goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                                            initiativeLevel: evalItem?.initiativeLevel || null,
                                            participationAttitude: evalItem?.participationAttitude || null
                                          })
                                        })
                                      }
                                    })

                                    const renderProgressBadge = (status: any) => {
                                      const s = String(status || "").toUpperCase()
                                      if (s === "DAT" || s === "HOAN_THANH") {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>Đạt (100%)</span>
                                          </span>
                                        )
                                      }
                                      if (s === "TIEN_TRIEN") {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span>Tiến triển (50%)</span>
                                          </span>
                                        )
                                      }
                                      if (s === "CAN_CO_GANG") {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                            <span>Cần cố gắng (25%)</span>
                                          </span>
                                        )
                                      }
                                      if (s === "CHUA_DAT") {
                                        return (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span>Chưa đạt</span>
                                          </span>
                                        )
                                      }
                                      return (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                          <span>Chưa đánh giá</span>
                                        </span>
                                      )
                                    }

                                    return (
                                      <div className="space-y-3 print-section-avoid">
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                          <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                            <Compass className="w-4 h-4 text-indigo-500" />
                                            <span>II. CỐ VẤN HỌC TẬP &amp; NHẬT KÝ THEO DÕI MỤC TIÊU</span>
                                          </h3>
                                          <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                            GVCN theo dõi &amp; đánh giá
                                          </span>
                                        </div>

                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                          <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 text-[9px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                              <tr>
                                                <th className="py-2 px-2.5 border-r border-slate-200 w-[180px]">
                                                  Nhóm mục tiêu (Trọng số)
                                                </th>
                                                <th className="py-2 px-2.5 border-r border-slate-200 min-w-[220px]">
                                                  Mục tiêu cụ thể
                                                </th>
                                                <th className="py-2 px-2 text-center border-r border-slate-200 w-[115px]">
                                                  Kết quả theo dõi
                                                </th>
                                                <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">
                                                  Mức hoàn thành MT (1-5)
                                                </th>
                                                <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">
                                                  Mức độ chủ động (1-5)
                                                </th>
                                                <th className="py-2 px-2 text-center w-[110px]">
                                                  Thái độ tham gia (1-5)
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                                              {advisoryRows.map((r, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-slate-50/50">
                                                  {r.isFirstInCat && (
                                                    <td
                                                      rowSpan={r.totalInCat}
                                                      className="py-2.5 px-2.5 border-r border-slate-200 align-top bg-slate-50/60"
                                                    >
                                                      <div className="space-y-1.5">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-black bg-teal-100 text-teal-900 border border-teal-200 leading-tight">
                                                          {r.catLabel}
                                                        </span>
                                                        <div>
                                                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-300">
                                                            Trọng số: {r.weight}%
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-2.5 border-r border-slate-200 align-top">
                                                    <div className="space-y-1">
                                                      <span className="inline-block px-2 py-0.5 rounded bg-[#003B3A] text-white text-[9px] font-black">
                                                        #{r.subIndex} MỤC TIÊU CỤ THỂ #{r.subIndex}
                                                      </span>
                                                      <p className="text-[11px] font-bold text-slate-900 leading-snug p-2 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap">
                                                        {r.targetText}
                                                      </p>
                                                      {r.actionText ? (
                                                        <p className="text-[10px] font-semibold text-amber-900 bg-amber-50/70 p-1.5 rounded border border-amber-200 whitespace-pre-wrap">
                                                          ⚡ Việc làm: {r.actionText}
                                                        </p>
                                                      ) : null}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-2 border-r border-slate-200 align-top text-center">
                                                    {renderProgressBadge(r.progressStatus)}
                                                  </td>
                                                  <td className="py-2 px-1.5 border-r border-slate-200 align-top text-center font-bold text-xs">
                                                    {r.goalCompletionLevel ? (
                                                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                                        Mức {r.goalCompletionLevel}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 font-normal">—</span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-1.5 border-r border-slate-200 align-top text-center font-bold text-xs">
                                                    {r.initiativeLevel ? (
                                                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                                        Mức {r.initiativeLevel}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 font-normal">—</span>
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-2 align-top text-center font-bold text-xs">
                                                    {r.participationAttitude ? (
                                                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                                        Mức {r.participationAttitude}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 font-normal">—</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )
                                  })()}

                                {/* SECTION III: KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) */}
                                {(sectionVisibility.moetPeriodicGrades || sectionVisibility.moetTermGrades) && (
                                  <div className="space-y-4">
                                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                                        <ClipboardCheck className="w-4 h-4 text-[#00A19A]" />
                                        <span>III. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                        Chương trình Bộ GD&amp;ĐT
                                      </span>
                                    </h3>

                                    {sectionVisibility.moetPeriodicGrades && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                          <span>1. Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)</span>
                                          <span className="text-[10px] font-normal text-slate-400">Thang điểm 10</span>
                                        </div>
                                        {gradeData.moetPeriodicRows.length === 0 ? (
                                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center text-xs text-slate-400 italic">
                                            Chưa có dữ liệu bài kiểm tra định kỳ MOET.
                                          </div>
                                        ) : (
                                          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                              <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                                <tr>
                                                  <th className="py-2 px-3 text-center w-8">STT</th>
                                                  <th className="py-2 px-3">Môn học</th>
                                                  <th className="py-2 px-2 text-center bg-teal-50/50 text-[#00A19A]">
                                                    KSĐN
                                                  </th>
                                                  <th className="py-2 px-2 text-center">Giữa kỳ 1</th>
                                                  <th className="py-2 px-2 text-center">Cuối kỳ 1</th>
                                                  <th className="py-2 px-2 text-center">Giữa kỳ 2</th>
                                                  <th className="py-2 px-2 text-center">Cuối kỳ 2</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {gradeData.moetPeriodicRows.map((r, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/80">
                                                    <td className="py-2 px-3 text-center font-mono text-slate-400">
                                                      {idx + 1}
                                                    </td>
                                                    <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                                                    <td className="py-2 px-2 text-center font-black text-[#00A19A] bg-teal-50/20">
                                                      {r.ksdn || "—"}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">
                                                      {r.gk1 || "—"}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">
                                                      {r.ck1 || "—"}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">
                                                      {r.gk2 || "—"}
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">
                                                      {r.ck2 || "—"}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {sectionVisibility.moetTermGrades && (
                                      <div className="space-y-1.5 pt-2">
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                          <span>2. Bảng điểm Học tập tổng kết (HK1, HK2, Cả năm)</span>
                                          <span className="text-[10px] font-normal text-slate-400">
                                            Kết quả Học bạ từ GVCN
                                          </span>
                                        </div>
                                        {gradeData.moetTermRows.length === 0 ? (
                                          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center text-xs text-slate-400 italic">
                                            Chưa có bảng điểm học tập tổng kết MOET.
                                          </div>
                                        ) : (
                                          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                                            <table className="w-full text-left text-xs border-collapse">
                                              <thead className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                                <tr>
                                                  <th className="py-2 px-3 text-center w-8">STT</th>
                                                  <th className="py-2 px-3">Môn học</th>
                                                  <th className="py-2 px-3 text-center">Học kỳ 1 (HK1)</th>
                                                  <th className="py-2 px-3 text-center">Học kỳ 2 (HK2)</th>
                                                  <th className="py-2 px-3 text-center bg-teal-50/60 text-[#00A19A]">
                                                    Cả năm (CN)
                                                  </th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {gradeData.moetTermRows.map((r, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/80">
                                                    <td className="py-2 px-3 text-center font-mono text-slate-400">
                                                      {idx + 1}
                                                    </td>
                                                    <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                                                    <td className="py-2 px-3 text-center font-black text-slate-800">
                                                      {r.hk1 || "—"}
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-black text-slate-800">
                                                      {r.hk2 || "—"}
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-black text-[#00A19A] bg-teal-50/30">
                                                      {r.cn || "—"}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}

                                        {/* Thẻ Đánh giá & Xếp loại Học tập Tổng thể */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                                          <div className="bg-teal-50/50 border border-teal-200/80 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">
                                              Điểm TB (GPA)
                                            </div>
                                            <div className="text-base font-black text-slate-900 mt-0.5">
                                              {gradeData.sumCN?.gpa
                                                ? Number(gradeData.sumCN.gpa).toFixed(1)
                                                : gradeData.sumHK2?.gpa
                                                ? Number(gradeData.sumHK2.gpa).toFixed(1)
                                                : gradeData.sumHK1?.gpa
                                                ? Number(gradeData.sumHK1.gpa).toFixed(1)
                                                : "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">Tổng kết</div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-200/80 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">
                                              Học lực (KQHT)
                                            </div>
                                            <div className="text-base font-black text-teal-700 mt-0.5">
                                              {gradeData.sumCN?.academicRating ||
                                                gradeData.sumHK2?.academicRating ||
                                                gradeData.sumHK1?.academicRating ||
                                                "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">
                                              Theo quy định BGD
                                            </div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-200/80 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">
                                              Rèn luyện (Hạnh kiểm)
                                            </div>
                                            <div className="text-base font-black text-emerald-700 mt-0.5">
                                              {gradeData.sumCN?.conductRating ||
                                                gradeData.sumHK2?.conductRating ||
                                                gradeData.sumHK1?.conductRating ||
                                                "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">
                                              Đánh giá GVCN
                                            </div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-200/80 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-amber-700 font-black uppercase">
                                              Khen thưởng
                                            </div>
                                            <div
                                              className="text-base font-black text-amber-800 mt-0.5 truncate"
                                              title={
                                                gradeData.sumCN?.reward ||
                                                gradeData.sumHK2?.reward ||
                                                gradeData.sumHK1?.reward ||
                                                "—"
                                              }
                                            >
                                              {gradeData.sumCN?.reward ||
                                                gradeData.sumHK2?.reward ||
                                                gradeData.sumHK1?.reward ||
                                                "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">
                                              Danh hiệu Sky-Line
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* MÔN HỌC ĐẶC THÙ SKY-LINE (SKL) */}
                                {sectionVisibility.specialSubjects && (
                                  <StudentSpecialSubjectsSection student={enrichedStudent} />
                                )}

                                {/* SECTION IV: KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ */}
                                {sectionVisibility.bilingualGrades && (
                                  <div className="space-y-3">
                                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                        <Globe className="w-4 h-4 text-blue-600" />
                                        <span>IV. KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                                        Hệ Song ngữ Sky-Line
                                      </span>
                                    </h3>

                                    {gradeData.bilingualTermRows.length === 0 &&
                                    gradeData.bilingualPeriodicRows.length === 0 ? (
                                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
                                        Học sinh học chương trình Chất lượng cao / Đang cập nhật môn song ngữ.
                                      </div>
                                    ) : (
                                      <div className="border border-blue-200/90 rounded-xl overflow-hidden bg-white shadow-2xs">
                                        <table className="w-full text-left text-xs border-collapse">
                                          <thead className="bg-blue-50/70 text-[10px] font-black text-blue-900 uppercase tracking-wider border-b border-blue-200">
                                            <tr>
                                              <th className="py-2.5 px-3 text-center w-8">STT</th>
                                              <th className="py-2.5 px-3">Môn Song ngữ</th>
                                              <th className="py-2.5 px-2 text-center">KSĐN / GK</th>
                                              <th className="py-2.5 px-3 text-center">Học kỳ 1</th>
                                              <th className="py-2.5 px-3 text-center">Học kỳ 2</th>
                                              <th className="py-2.5 px-3 text-center bg-blue-100/60 text-blue-900">
                                                Cả năm (CN)
                                              </th>
                                              <th className="py-2.5 px-3 text-center">Đánh giá Năng lực</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-blue-50 font-semibold text-slate-700">
                                            {(gradeData.bilingualTermRows.length > 0
                                              ? gradeData.bilingualTermRows
                                              : gradeData.bilingualPeriodicRows
                                            ).map((r: any, idx: number) => {
                                              const pItem = gradeData.bilingualPeriodicRows.find(p => p.name === r.name)
                                              const ksdnVal = pItem ? pItem.ksdn || pItem.gk1 : "—"
                                              return (
                                                <tr key={idx} className="hover:bg-blue-50/30">
                                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                                    {idx + 1}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                                                  <td className="py-2.5 px-2 text-center font-black text-blue-700">
                                                    {ksdnVal || "—"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-black text-slate-800">
                                                    {r.hk1 || "—"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-black text-slate-800">
                                                    {r.hk2 || "—"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-black text-blue-900 bg-blue-50/40">
                                                    {r.cn || "—"}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                                                      Hoàn thành Tốt
                                                    </span>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* SECTION V: THÀNH TÍCH & KHEN THƯỞNG */}
                                {sectionVisibility.achievements && (
                                  <div className="space-y-3">
                                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                      <Award className="w-4 h-4 text-amber-500" />
                                      V. THÀNH TÍCH &amp; BẢNG VÀNG KHEN THƯỞNG
                                    </h3>
                                    {achievements.length === 0 ? (
                                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
                                        Học sinh chưa có ghi nhận giải thưởng hoặc khen thưởng trong năm học.
                                      </div>
                                    ) : (
                                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                            <tr>
                                              <th className="py-2.5 px-3 text-center w-10">STT</th>
                                              <th className="py-2.5 px-3">Tên Giải thưởng</th>
                                              <th className="py-2.5 px-3">Lĩnh vực</th>
                                              <th className="py-2.5 px-3 text-center">Hạng / Cấp giải</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-semibold">
                                            {achievements.map((item: any, idx: number) => {
                                              const ach = item.achievement || item
                                              const achName = ach.name || ach.title || "Giải thưởng"
                                              const catName = getCategoryLabel(
                                                ach.category || ach.exam?.category?.name || ach.examCategoryName
                                              )
                                              const levelName = getLevelLabel(ach.level || ach.exam?.round?.name)
                                              return (
                                                <tr key={idx} className="hover:bg-amber-50/20">
                                                  <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                                                    {idx + 1}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-bold text-slate-800">{achName}</td>
                                                  <td className="py-2.5 px-3 text-[10px] font-black text-[#00A19A] uppercase">
                                                    {catName}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                                      {levelName}
                                                    </span>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* SECTION VI: HOẠT ĐỘNG TRẢI NGHIỆM */}
                                {sectionVisibility.experientialActivities && (
                                  <div className="space-y-3">
                                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                                      <BookOpen className="w-4 h-4 text-sky-500" />
                                      VI. HOẠT ĐỘNG TRẢI NGHIỆM
                                    </h3>
                                    {experientialActivities.length === 0 ? (
                                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
                                        Học sinh chưa tham gia dự án trải nghiệm ngoại khóa nào.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                                        <table className="w-full text-xs text-left border-collapse">
                                          <thead>
                                            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                              <th className="py-2.5 px-3 text-center w-10">STT</th>
                                              <th className="py-2.5 px-3 min-w-[180px]">Tên hoạt động</th>
                                              <th className="py-2.5 px-3 min-w-[130px]">Chủ đề GD</th>
                                              <th className="py-2.5 px-3 min-w-[200px]">Nội dung giáo dục</th>
                                              <th className="py-2.5 px-3 text-center min-w-[110px]">Vai trò</th>
                                              <th className="py-2.5 px-3 text-center min-w-[110px]">Kết quả</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {experientialActivities.map((act: any, idx: number) => (
                                              <tr key={act.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-3 text-center text-slate-400 font-bold">
                                                  {idx + 1}
                                                </td>
                                                <td className="py-3 px-3 font-extrabold text-[#003B3A] text-xs">
                                                  {act.activityName}
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 font-medium">
                                                  {act.themeName || act.groupName || "—"}
                                                </td>
                                                <td className="py-3 px-3 text-slate-600 font-normal leading-relaxed text-[11px]">
                                                  {act.educationalContent || act.deliverables || "—"}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                  <span className="inline-block bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                                    {act.role || "Thành viên"}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                                                    {act.evalLevel || "Đạt"}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* SECTION VIII: NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM */}
                                {sectionVisibility.homeroomTeacherComment && (
                                  <div className="space-y-3">
                                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                                      VIII. NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM (GVCN)
                                    </h3>
                                    <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl space-y-2 text-xs font-medium text-slate-700 shadow-2xs">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-emerald-100 pb-1.5">
                                        <span>Ghi nhận từ GVCN ({homeroomTeacherName}):</span>
                                        <span className="font-mono text-emerald-700 text-[10px]">
                                          Năm học {academicYearNameStr}
                                        </span>
                                      </div>
                                      <p className="italic leading-relaxed text-slate-700 pt-1">
                                        &ldquo;
                                        {highlightComments?.[0]?.comment ||
                                          highlightComments?.[0]?.content ||
                                          termEvaluations?.[0]?.recommendations ||
                                          gradeData.sumCN?.notes ||
                                          "Học sinh có ý thức kỷ luật tốt, hăng hái phát biểu xây dựng bài, có tinh thần giúp đỡ bạn bè và tham gia tích cực các hoạt động trải nghiệm của trường."}
                                        &rdquo;
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* SECTION IX: KHUNG KÝ XÁC THỰC 3 BÊN */}
                                <div className="pt-6 border-t-2 border-slate-100 mt-8">
                                  <div className="text-right text-[11px] font-medium text-slate-500 italic mb-4">
                                    Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm{" "}
                                    {new Date().getFullYear()}
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="space-y-16">
                                      <div>
                                        <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                                          HỌC SINH CAM KẾT
                                        </div>
                                        <div className="text-[10px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                                      </div>
                                      <div className="font-black text-xs text-slate-900">
                                        {enrichedStudent.studentName}
                                      </div>
                                    </div>

                                    <div className="space-y-16">
                                      <div>
                                        <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                                          CỐ VẤN / GVCN
                                        </div>
                                        <div className="text-[10px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                                      </div>
                                      <div className="font-black text-xs text-[#00A19A]">{homeroomTeacherName}</div>
                                    </div>

                                    <div className="space-y-16">
                                      <div>
                                        <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                                          BAN GIÁM HIỆU PHÊ DUYỆT
                                        </div>
                                        <div className="text-[10px] text-slate-400 italic">
                                          (Ký, đóng dấu &amp; ghi rõ họ tên)
                                        </div>
                                      </div>
                                      <div className="font-black text-xs text-slate-800 uppercase">
                                        HIỆU TRƯỞNG / GĐCS SKY-LINE
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-8 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-[10px] font-semibold text-slate-400 gap-1">
                                    <span>HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ NĂNG LỰC HỌC SINH 360°</span>
                                    <span>Trang A4 Chuẩn • Đồng bộ từ GVCN Lớp {classNameStr}</span>
                                  </div>

                                  {/* PHỤ LỤC: KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN (RADAR 360°) */}
                                  {sectionVisibility.subjectCompetencyRadar !== false && (
                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-teal-300 space-y-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-4 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                          <div className="w-3 h-3 rounded-full bg-[#00A19A]" />
                                          <div>
                                            <span className="text-[10px] font-black uppercase text-[#00A19A] tracking-wider block">
                                              PHỤ LỤC HỒ SƠ
                                            </span>
                                            <h3 className="text-xs sm:text-sm font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                                              <Sparkles className="w-4 h-4 text-teal-600" />
                                              <span>PHỤ LỤC: KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN (RADAR 360°)</span>
                                            </h3>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-extrabold text-teal-800 bg-white px-2.5 py-1 rounded-full border border-teal-200 shadow-2xs">
                                            Khung 5 Phẩm chất - 10 Năng lực GDPT 2018
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setActiveTab("competencies")}
                                            className="text-[11px] font-bold text-[#00A19A] hover:text-[#005B55] flex items-center gap-1 hover:underline cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs transition-all"
                                          >
                                            <span>Mở rộng</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 sm:p-5 shadow-2xs">
                                        <StudentCompetencyPortfolio
                                          studentId={enrichedStudent.id}
                                          studentCode={enrichedStudent.studentCode}
                                          studentName={enrichedStudent.studentName}
                                          initialAcademicYearId={academicYearId}
                                          isReadOnly={true}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

              {/* TAB 2: CỐ VẤN & MỤC TIÊU 360° */}
              {activeTab === "advisory" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Compass className="w-5 h-5 text-[#00A19A]" />
                        Cố vấn Học tập &amp; Mục tiêu 360°
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Kế hoạch phát triển cá nhân, cam kết học tập và nhật ký đồng hành từ GVCN ({homeroomTeacherName}).
                      </p>
                    </div>
                    <span className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-xl text-xs font-bold">
                      GVCN: {homeroomTeacherName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Mục tiêu Cá nhân trong Năm học
                      </h4>
                      {goals.length > 0 ? (
                        <div className="space-y-3">
                          {goals.map((g: any) => {
                            const tracking = goalTrackings.find(
                              (t: any) =>
                                (t.goalId && t.goalId === g.id) ||
                                (t.targetText && g.targetText && t.targetText.trim() === g.targetText.trim())
                            )
                            return (
                              <div key={g.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-black uppercase">
                                    {g.category || "Học tập"}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    {tracking?.progressStatus === "DAT"
                                      ? "Đạt (100%)"
                                      : tracking?.progressStatus === "TIEN_TRIEN"
                                      ? "Tiến triển (50%)"
                                      : g.semester || "Cả năm"}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-800">{g.targetText}</p>
                                {g.actions && g.actions.length > 0 && (
                                  <ul className="pl-4 list-disc text-[11px] text-slate-600 space-y-1 pt-1">
                                    {g.actions.map((act: any) => (
                                      <li key={act.id}>{act.actionText}</li>
                                    ))}
                                  </ul>
                                )}
                                {tracking?.teacherNotes && (
                                  <div className="text-[11px] text-teal-800 bg-teal-50/70 border border-teal-200/60 p-2 rounded-lg">
                                    <strong>Nhận xét GVCN:</strong> {tracking.teacherNotes}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-400">Học sinh chưa thiết lập mục tiêu 360°.</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                        Cam kết Học tập &amp; Đồng hành từ GVCN
                      </h4>
                      {learningCommitment ? (
                        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                          <div className="text-xs font-bold text-amber-900">Bản cam kết học tập đầu năm</div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {learningCommitment.commitmentText ||
                              learningCommitment.content ||
                              "Đã ký cam kết rèn luyện và học tập."}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-400">Chưa có bản cam kết học tập đặc biệt.</p>
                      )}

                      <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider pt-2">
                        Nhật ký Tư vấn của Giáo viên ({consultationLogs.length})
                      </h4>
                      {consultationLogs.length > 0 ? (
                        <div className="space-y-2.5">
                          {consultationLogs.slice(0, 5).map((log: any) => (
                            <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                              <div className="flex justify-between font-bold text-slate-700 mb-1">
                                <span>GV: {log.teacher?.teacherName || homeroomTeacherName}</span>
                                <span className="text-slate-400">
                                  {log.meetingDate ? new Date(log.meetingDate).toLocaleDateString("vi-VN") : ""}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px]">{log.content || log.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-400">Chưa có biên bản tư vấn riêng.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: KẾT QUẢ HỌC TẬP (MOET & SONG NGỮ) */}
              {activeTab === "moet" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#00A19A]" />
                        Kết quả Học tập (Chương trình MOET, Song ngữ &amp; Đặc thù)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Bảng điểm kiểm tra định kỳ, điểm tổng kết học kỳ và xếp loại học lực đồng bộ từ GVCN ({homeroomTeacherName}).
                      </p>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Học kỳ 1 (HK1)", sum: gradeData.sumHK1 },
                      { label: "Học kỳ 2 (HK2)", sum: gradeData.sumHK2 },
                      { label: "Cả năm (CN)", sum: gradeData.sumCN }
                    ].map((blk, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <span className="text-[11px] font-black uppercase text-[#00A19A]">{blk.label}</span>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Học lực</span>
                            <span className="text-sm font-black text-slate-800">{blk.sum?.academicRating || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Rèn luyện</span>
                            <span className="text-sm font-black text-emerald-700">{blk.sum?.conductRating || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Danh hiệu</span>
                            <span className="text-xs font-black text-amber-700">{blk.sum?.reward || "—"}</span>
                          </div>
                        </div>
                        {blk.sum?.notes && (
                          <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                            Ghi chú GVCN: <span className="font-bold text-slate-800">{blk.sum.notes}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Bảng 1: Điểm kiểm tra định kỳ */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      1. Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)
                    </h3>
                    {gradeData.moetPeriodicRows.length === 0 && gradeData.bilingualPeriodicRows.length === 0 ? (
                      <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-200">
                        Chưa có dữ liệu điểm kiểm tra định kỳ.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                              <th className="py-3 px-4 w-10 text-center">STT</th>
                              <th className="py-3 px-4">Môn học</th>
                              <th className="py-3 px-3 text-center text-[#00A19A]">KSĐN</th>
                              <th className="py-3 px-3 text-center">Giữa kỳ 1</th>
                              <th className="py-3 px-3 text-center">Cuối kỳ 1</th>
                              <th className="py-3 px-3 text-center">Giữa kỳ 2</th>
                              <th className="py-3 px-3 text-center">Cuối kỳ 2</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {[...gradeData.moetPeriodicRows, ...gradeData.bilingualPeriodicRows].map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">{r.name}</td>
                                <td className="py-2.5 px-3 text-center font-black text-[#00A19A]">{r.ksdn || "—"}</td>
                                <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.gk1 || "—"}</td>
                                <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.ck1 || "—"}</td>
                                <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.gk2 || "—"}</td>
                                <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.ck2 || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Bảng 2: Điểm tổng kết học tập */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      2. Bảng điểm tổng kết môn học (HK1, HK2, Cả năm)
                    </h3>
                    {gradeData.moetTermRows.length === 0 && gradeData.bilingualTermRows.length === 0 ? (
                      <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 rounded-2xl border border-slate-200">
                        Chưa có dữ liệu điểm tổng kết học kỳ.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                              <th className="py-3 px-4 w-10 text-center">STT</th>
                              <th className="py-3 px-4">Môn học</th>
                              <th className="py-3 px-4 text-center">Học kỳ 1 (HK1)</th>
                              <th className="py-3 px-4 text-center">Học kỳ 2 (HK2)</th>
                              <th className="py-3 px-4 text-center text-[#00A19A]">Cả năm (CN)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold">
                            {[...gradeData.moetTermRows, ...gradeData.bilingualTermRows].map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">{r.name}</td>
                                <td className="py-2.5 px-4 text-center font-black text-slate-800">{r.hk1 || "—"}</td>
                                <td className="py-2.5 px-4 text-center font-black text-slate-800">{r.hk2 || "—"}</td>
                                <td className="py-2.5 px-4 text-center font-black text-[#00A19A]">{r.cn || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Môn học đặc thù Sky-Line */}
                  <div className="pt-2">
                    <StudentSpecialSubjectsSection student={enrichedStudent} />
                  </div>
                </div>
              )}

              {/* TAB 4: ĐÁNH GIÁ NĂNG LỰC 360° */}
              {activeTab === "competencies" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#00A19A]" />
                      Đánh giá Năng lực Toàn diện 360°
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Biểu đồ Radar năng lực các môn học theo Khung 5 Phẩm chất - 10 Năng lực GDPT 2018.
                    </p>
                  </div>
                  <StudentCompetencyPortfolio
                    studentId={enrichedStudent.id}
                    studentCode={enrichedStudent.studentCode}
                    studentName={enrichedStudent.studentName}
                    initialAcademicYearId={academicYearId}
                    isReadOnly={true}
                  />
                </div>
              )}

              {/* TAB 5: KHẢO SÁT ĐẦU VÀO */}
              {activeTab === "entrance" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-[#00A19A]" />
                      Hồ sơ Học thuật Đầu vào (Intake Evaluation)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Kết quả khảo sát năng lực đầu vào và định hướng xếp lớp tại Hệ thống Giáo dục Sky-Line.
                    </p>
                  </div>

                  {entranceSurvey ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                          <span className="text-[11px] font-bold text-slate-400 block">Môn Toán</span>
                          <span className="text-xl font-black text-slate-800">{entranceSurvey.mathScore ?? "—"}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                          <span className="text-[11px] font-bold text-slate-400 block">Ngữ Văn / Tiếng Việt</span>
                          <span className="text-xl font-black text-slate-800">
                            {entranceSurvey.literatureScore ?? "—"}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                          <span className="text-[11px] font-bold text-slate-400 block">Tiếng Anh (Viết)</span>
                          <span className="text-xl font-black text-slate-800">
                            {entranceSurvey.writtenEnglishScore ?? "—"}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                          <span className="text-[11px] font-bold text-slate-400 block">Tiếng Anh (Vấn đáp)</span>
                          <span className="text-xl font-black text-slate-800">
                            {entranceSurvey.oralEnglishScore ?? "—"}
                          </span>
                        </div>
                      </div>
                      {(entranceSurvey.result || entranceSurvey.generalComment || entranceSurvey.note) && (
                        <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 text-xs space-y-1.5">
                          {entranceSurvey.result && (
                            <div>
                              <span className="font-black text-teal-900">Kết luận Hội đồng Tuyển sinh: </span>
                              <span className="font-bold text-slate-800">{entranceSurvey.result}</span>
                            </div>
                          )}
                          {(entranceSurvey.generalComment || entranceSurvey.note) && (
                            <p className="text-slate-700 leading-relaxed">
                              {entranceSurvey.generalComment || entranceSurvey.note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">Chưa ghi nhận điểm khảo sát đầu vào.</p>
                  )}
                </div>
              )}

              {/* TAB 6: THÀNH TÍCH & KHEN THƯỞNG */}
              {activeTab === "achievements" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#00A19A]" />
                      Thành tích Nổi bật &amp; Chứng chỉ
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Các giải thưởng học thuật, năng khiếu, thể thao và chứng chỉ quốc tế của học sinh.
                    </p>
                  </div>

                  {achievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {achievements.map((item: any, idx: number) => {
                        const ach = item.achievement || item
                        return (
                          <div
                            key={item.id || idx}
                            className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex items-start gap-3.5"
                          >
                            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-slate-800">
                                {ach.title || ach.name || "Thành tích xuất sắc"}
                              </h4>
                              <p className="text-[11px] text-slate-600">
                                {getCategoryLabel(ach.category || ach.exam?.category?.name)} •{" "}
                                {getLevelLabel(ach.level || ach.exam?.round?.name)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">Chưa ghi nhận thành tích.</p>
                  )}
                </div>
              )}

              {/* TAB 7: HOẠT ĐỘNG TRẢI NGHIỆM */}
              {activeTab === "experiences" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#00A19A]" />
                      Hoạt động Trải nghiệm &amp; Dự án Học tập
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Hồ sơ tham gia các hoạt động trải nghiệm, sự kiện ngoại khóa và dự án cộng đồng.
                    </p>
                  </div>

                  {experientialActivities.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                            <th className="py-3 px-4 text-center w-10">STT</th>
                            <th className="py-3 px-4">Tên hoạt động</th>
                            <th className="py-3 px-4">Chủ đề / Lĩnh vực</th>
                            <th className="py-3 px-4 text-center">Vai trò</th>
                            <th className="py-3 px-4 text-center">Đánh giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {experientialActivities.map((act: any, idx: number) => (
                            <tr key={act.id || idx} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">{act.activityName}</td>
                              <td className="py-3 px-4 text-slate-600">{act.themeName || act.groupName || "—"}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold text-[10px]">
                                  {act.role || "Thành viên"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px]">
                                  {act.evalLevel || "Đạt"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : projectExperiences.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectExperiences.map((proj: any) => (
                        <div key={proj.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-800">
                              {proj.projectName || proj.title || "Dự án trải nghiệm"}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold">
                              {proj.role || "Thành viên"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{proj.description || proj.outcome}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">
                      Học sinh chưa tham gia hoạt động trải nghiệm nào.
                    </p>
                  )}
                </div>
              )}

              {/* TAB 8: HƯỚNG NGHIỆP */}
              {activeTab === "orientation" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#00A19A]" />
                      Định hướng Ngành nghề &amp; Hướng nghiệp
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Kết quả trắc nghiệm sở thích nghề nghiệp và tư vấn định hướng tương lai.
                    </p>
                  </div>

                  {careerOrientation ? (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="text-xs font-black text-slate-800 uppercase">Kết quả Định hướng Nghề nghiệp</div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {careerOrientation.result ||
                          careerOrientation.notes ||
                          careerOrientation.description ||
                          careerOrientation.targetField ||
                          "Đã cập nhật hồ sơ định hướng ngành nghề."}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">Chưa định hướng ngành nghề.</p>
                  )}
                </div>
              )}

              {/* TAB 9: NHẬN XÉT TỪ GVCN */}
              {activeTab === "comments" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#00A19A]" />
                        Nhận xét Định kỳ từ Giáo viên Chủ nhiệm (GVCN)
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Đánh giá định kỳ, nhận xét học bạ và khuyến nghị đồng hành từ GVCN ({homeroomTeacherName}).
                      </p>
                    </div>
                    <span className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-xl text-xs font-bold">
                      GVCN: {homeroomTeacherName}
                    </span>
                  </div>

                  {highlightComments.length > 0 || termEvaluations.length > 0 || gradeData.sumCN?.notes ? (
                    <div className="space-y-4">
                      {highlightComments.map((c: any) => (
                        <div key={c.id} className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                            <span>GVCN: {homeroomTeacherName}</span>
                            <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {c.comment || c.commentText || c.content}
                          </p>
                        </div>
                      ))}

                      {termEvaluations.map((te: any) => (
                        <div key={te.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Đánh giá Kỳ Cố vấn ({te.term || "Định kỳ"}) — GVCN {homeroomTeacherName}</span>
                            <span>{te.createdAt ? new Date(te.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                          </div>
                          {te.generalEvaluation && (
                            <p className="text-xs text-slate-700 leading-relaxed">{te.generalEvaluation}</p>
                          )}
                          {te.recommendations && (
                            <p className="text-xs text-teal-800 font-semibold">
                              Khuyến nghị: {te.recommendations}
                            </p>
                          )}
                        </div>
                      ))}

                      {gradeData.sumCN?.notes && (
                        <div className="p-5 rounded-2xl bg-teal-50/40 border border-teal-200/80 space-y-1.5">
                          <div className="text-[11px] font-bold text-teal-900">
                            Ghi chú Tổng kết Học bạ Cả năm
                          </div>
                          <p className="text-xs font-bold text-slate-800">{gradeData.sumCN.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">Chưa ghi nhận đánh giá định kỳ.</p>
                  )}
                </div>
              )}

              {/* TAB 10: HỖ TRỢ HỌC TẬP */}
              {activeTab === "support" && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-[#00A19A]" />
                      Kế hoạch Hỗ trợ Học tập &amp; Phát triển
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Theo dõi tiến độ bồi dưỡng, phụ đạo và hỗ trợ chuyên biệt từ giáo viên bộ môn &amp; GVCN.
                    </p>
                  </div>

                  {learningSupportTargets.length > 0 ? (
                    <div className="space-y-4">
                      {learningSupportTargets.map((target: any) => (
                        <div key={target.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-black">
                              {target.category || target.supportType || "Hỗ trợ học tập"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              Trạng thái: {target.status || "Đang theo dõi"}
                            </span>
                          </div>
                          {target.reason && <p className="text-xs text-slate-700">Nội dung: {target.reason}</p>}
                          {target.assignments && target.assignments.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                              {target.assignments.map((asg: any) => (
                                <span
                                  key={asg.id}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                                >
                                  Môn {asg.subject?.subjectName || "Chuyên môn"} • GV:{" "}
                                  {asg.teacher?.teacherName || "Phụ trách"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400 py-8 text-center">
                      Không thuộc đối tượng nhận hỗ trợ trong năm học này.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
