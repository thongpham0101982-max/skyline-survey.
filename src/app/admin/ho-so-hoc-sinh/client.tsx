"use client"
// Build portfolio version: 30.0-1788358433056
// Build version: 30.0-1788358433056

import { useState, useEffect, useMemo, useRef } from "react"
import { StudentCompetencyPortfolio } from "@/components/competency/StudentCompetencyPortfolio"
import { 
  Users, Loader2, User, UserCheck, Award, Trophy, Medal, Sparkles, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, Heart, MessageCircle, Send, Globe, Printer, Download,
  Search, Calendar, MapPin, CheckCircle, AlertTriangle, GraduationCap,
  Layers, School, Building2, RotateCcw, RefreshCw, Trash2,
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Camera, Upload, Phone, Mail, Activity, ChevronDown, X, Check,
  FolderArchive, FolderDown, Sliders
} from "lucide-react"
import StudentProfileCoverA4 from "@/components/student/StudentProfileCoverA4"
import StudentProfileSectionConfigModal from "@/components/student/StudentProfileSectionConfigModal"
import StudentProfileInlineSectionToggles from "@/components/student/StudentProfileInlineSectionToggles"
import { StudentSpecialSubjectsSection } from "@/components/student/StudentSpecialSubjectsSection"
import { resolveStudentSectionVisibility } from "@/lib/studentProfileSectionConfig"

function normalizeClassKey(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[\.\/]/g, "/")
    .replace(/[\s_]+/g, " ")
    .replace(/^lớp\s+/i, "");
}


interface StudentProfilesAdminClientProps {
  academicYears: any[]
  campuses: any[]
  classes: any[]
  activeYearId: string
  activeYearName: string
}


const getCategoryLabel = (cat: string) => {
  if (!cat) return "Lĩnh vực khác";
  const str = String(cat).toUpperCase();
  if (str === "OLYMPIC") return "Olympic";
  if (str === "KHKT") return "Khoa học kỹ thuật";
  if (str === "THE_THAO") return "Thể dục thể thao";
  if (str === "VAN_NGHE") return "Văn nghệ - Nghệ thuật";
  if (str === "HOC_THUAT") return "Học thuật";
  if (str === "STEM") return "STEM / Robotics";
  return cat;
};

const getLevelLabel = (lvl: string) => {
  if (!lvl) return "Cấp Trường";
  const str = String(lvl).toUpperCase();
  if (str === "VANG" || str === "NHAT") return "Giải Vàng / Hạng Nhất";
  if (str === "BAC" || str === "NHI") return "Giải Bạc / Hạng Nhì";
  if (str === "DONG" || str === "BA") return "Giải Đồng / Hạng Ba";
  if (str === "KHUYEN_KHICH") return "Giải Khuyến Khích";
  if (str === "CAP_QUOC_TE" || str === "5") return "Cấp Quốc tế";
  if (str === "CAP_QUOC_GIA" || str === "4") return "Cấp Quốc gia";
  if (str === "CAP_THANH_PHO" || str === "CAP_TINH" || str === "3") return "Cấp Thành phố / Tỉnh";
  if (str === "CAP_QUAN" || str === "CAP_HUYEN" || str === "2") return "Cấp Quận / Huyện";
  if (str === "CAP_TRUONG" || str === "1") return "Cấp Trường";
  return lvl.startsWith("Cấp") || lvl.startsWith("Giải") ? lvl : `Giải/Cấp: ${lvl}`;
};

const getYearLabel = (ach: any) => {
  if (ach?.academicYear?.name) return ach.academicYear.name;
  if (ach?.yearName) return ach.yearName;
  if (ach?.academicYearId) {
    if (ach.academicYearId === "AY-2026") return "Năm học 2025-2026";
    if (ach.academicYearId.startsWith("AY-")) {
      const yearNum = ach.academicYearId.replace("AY-", "");
      if (yearNum.length === 4) {
        const startY = parseInt(yearNum) - 1;
        return `Năm học ${startY}-${yearNum}`;
      }
    }
    return ach.academicYearId;
  }
  return "N/A";
};

export function StudentProfilesAdminClient({
  academicYears,
  campuses,
  classes,
  activeYearId,
  activeYearName
}: StudentProfilesAdminClientProps) {
  const handleResetMOETData = async () => {
    if (!confirm("Bạn có chắc chắn muốn RESET XÓA SẠCH toàn bộ dữ liệu Kết quả Học tập (MOET) năm học 2025-2026 không?\n\nThao tác này sẽ làm sạch cơ sở dữ liệu để bạn tải lên tệp Import hoàn toàn mới.")) return
    try {
      const res = await fetch("/api/admin/ktdbcl/reset-kqht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear: "2025-2026" })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message || "Đã reset xong dữ liệu MOET 2025-2026!")
        window.location.reload()
      } else {
        alert("Lỗi reset: " + data.message)
      }
    } catch (err: any) {
      alert("Lỗi reset dữ liệu: " + err.message)
    }
  }
  // Filter States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId)
  const [schoolBlock, setSchoolBlock] = useState<"k12" | "preschool">("k12")
  const [selectedCampusId, setSelectedCampusId] = useState(campuses?.[0]?.id || "all")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [selectedClassId, setSelectedClassId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Students list and loading states
  const [students, setStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isExpandedView, setIsExpandedView] = useState<boolean>(true)
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false)
  const studentDropdownRef = useRef<HTMLDivElement>(null)

  // Section Config State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [configMap, setConfigMap] = useState<Record<string, Record<string, boolean>>>({})

  const loadConfigs = async () => {
    try {
      const res = await fetch("/api/admin/student-profiles/section-config")
      const json = await res.json()
      if (json.success && json.data) {
        setConfigMap(json.data)
      }
    } catch (e) {
      console.error("Error loading section configs:", e)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setIsStudentDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now())
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [cvViewMode, setCvViewMode] = useState<"all" | "cover" | "content">("all")
  const [avatarErrorMap, setAvatarErrorMap] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDownloadPDF = async () => {
    const targetElementId = cvViewMode === "content" 
      ? "a4-student-portfolio" 
      : (cvViewMode === "cover" ? "a4-student-cover-wrapper" : "a4-student-portfolio-full-wrapper");
    const element = document.getElementById(targetElementId) || document.getElementById("a4-student-portfolio");
    if (!element) {
      window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=${cvViewMode === 'cover' ? 'cover' : (cvViewMode === 'content' ? 'content' : 'all')}`, "_blank");
      return;
    }
    setIsDownloadingPDF(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const sClass = String(selectedStudent?.className || selectedStudent?.class?.className || "Lop").trim().replace(/[\\/:*?"<>|]/g, "_");
      const sCode = String(selectedStudent?.studentCode || selectedStudent?.code || "HS").trim().replace(/[\\/:*?"<>|]/g, "_");
      const sName = String(selectedStudent?.studentName || selectedStudent?.fullName || "").trim().replace(/[\\/:*?"<>|]/g, "_");
      const filename = `${sClass}_${sCode}_${sName}.pdf`;
      const opt: any = {
        margin: [0, 0, 0, 0],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          onclone: (clonedDoc: Document) => {
            clonedDoc.querySelectorAll("style").forEach((styleEl) => {
              if (styleEl.textContent && /(lab|oklch|oklab|lch)\([^)]*\)/i.test(styleEl.textContent)) {
                styleEl.textContent = styleEl.textContent
                  .replace(/lab\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/oklch\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/oklab\([^)]*\)/gi, "rgba(0,0,0,0)")
                  .replace(/lch\([^)]*\)/gi, "rgba(0,0,0,0)");
              }
            });
            const portfolio = clonedDoc.getElementById("a4-student-portfolio");
            if (portfolio) {
              portfolio.style.border = "none";
              portfolio.style.boxShadow = "none";
              portfolio.style.borderRadius = "0px";
              portfolio.style.padding = "12mm 14mm";
              portfolio.style.width = "210mm";
              portfolio.style.maxWidth = "210mm";
            }
            clonedDoc.querySelectorAll(".no-print, .pdf-hide, button").forEach((el: any) => {
              el.style.display = "none";
            });
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Download PDF error, fallback to print window:", err);
      window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=${cvViewMode === 'cover' ? 'cover' : (cvViewMode === 'content' ? 'content' : 'all')}`, "_blank");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedStudentId) return

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP)!")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Kích thước ảnh không được vượt quá 5MB!")
      return
    }

    try {
      setIsUploadingAvatar(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/student-photos/${selectedStudentId}`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setAvatarErrorMap((prev) => ({ ...prev, [selectedStudentId]: false }))
        setAvatarTimestamp(Date.now())
      } else {
        alert(data.error || "Không thể tải lên ảnh đại diện.")
      }
    } catch (err: any) {
      console.error("Upload avatar error:", err)
      alert("Lỗi kết nối khi tải lên ảnh đại diện.")
    } finally {
      setIsUploadingAvatar(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleDeleteAvatar = async () => {
    if (!selectedStudentId || !confirm("Bạn có chắc chắn muốn xóa ảnh đại diện của học sinh này?")) return
    try {
      setIsUploadingAvatar(true)
      const res = await fetch(`/api/student-photos/${selectedStudentId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setAvatarErrorMap((prev) => ({ ...prev, [selectedStudentId]: true }))
        setAvatarTimestamp(Date.now())
      }
    } catch (err) {
      console.error("Delete avatar error:", err)
    } finally {
      setIsUploadingAvatar(false)
    }
  }
  
  // Tab states
  const [selectedStudentType, setSelectedStudentType] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("cv")
  const [entranceSubTab, setEntranceSubTab] = useState<"results" | "admin" | "academic">("results")
  const [loadingProfile, setLoadingProfile] = useState(false)
  
  // Custom mock interactive likes & comments for the wall posts
  const [postLikes, setPostLikes] = useState<Record<string, { count: number, liked: boolean }>>({})
  const [postCommentsState, setPostCommentsState] = useState<Record<string, { author: string, text: string, time: string }[]>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Dynamic Grade options based on Bậc học (schoolBlock)
  const gradeOptions = useMemo(() => {
    if (schoolBlock === "k12") {
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    } else {
      return ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"]
    }
  }, [schoolBlock])

  // Filtered classes based on selected Year, Campus, and schoolBlock
  const filteredClassesList = useMemo(() => {
    return classes.filter(c => {
      // Filter by academic year
      if (c.academicYearId !== selectedYearId) return false
      
      // Filter by campus
      if (selectedCampusId !== "all" && c.campusId !== selectedCampusId) return false
      
      // Filter by Block & Grade
      const blockMatch = schoolBlock === "k12" 
        ? !["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(c.grade)
        : ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(c.grade)
      
      if (!blockMatch) return false

      if (selectedGrade !== "all" && c.grade !== selectedGrade) return false

      return true
    })
  }, [classes, selectedYearId, selectedCampusId, schoolBlock, selectedGrade])

  // Automatically reset Grade & Class filter when schoolBlock changes
  useEffect(() => {
    setSelectedGrade("all")
    setSelectedClassId("all")
    setSelectedStudentId("")
    setSelectedStudent(null)
  }, [schoolBlock])

  // Automatically reset Class filter when Grade or Campus changes
  useEffect(() => {
    setSelectedClassId("all")
  }, [selectedGrade, selectedCampusId])

  // Load students from API when filters change
  useEffect(() => {
    // To prevent loading thousands of records, we require at least Campus or Grade or Class to be selected
    // unless searchQuery is populated
    // If no filter selected, we automatically query the active year students

    async function fetchStudentsList() {
      try {
        setLoadingStudents(true)
        const params = new URLSearchParams()
        params.set("action", "getProfiles")
        params.set("academicYearId", selectedYearId)
        
        if (selectedCampusId !== "all") params.set("campusId", selectedCampusId)
        if (selectedClassId !== "all") params.set("classId", selectedClassId)
        if (searchQuery.trim()) params.set("search", searchQuery.trim())

        // Fetch
        const res = await fetch(`/api/admin/student-profiles?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          let data = result.data || []
          
          // If we filtered by grade locally (only when no specific class is selected)
          if (selectedGrade !== "all" && selectedClassId === "all") {
            data = data.filter((s: any) => s.class?.grade === selectedGrade)
          }

          // If block filter is preschool/k12 (only when no specific class is selected)
          if (selectedClassId === "all") {
            data = data.filter((s: any) => {
              const isPreschoolGrade = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(s.class?.grade)
              return schoolBlock === "k12" ? !isPreschoolGrade : isPreschoolGrade
            })
          }

          setStudents(data)
        }
      } catch (err) {
        console.error("Error loading students list:", err)
      } finally {
        setLoadingStudents(false)
      }
    }

    const timer = setTimeout(fetchStudentsList, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [selectedYearId, schoolBlock, selectedCampusId, selectedGrade, selectedClassId, searchQuery])

  // Load detailed profile for selected student
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      return
    }
    const student = students.find(s => s.id === selectedStudentId)
    setSelectedStudent(student || null)
  }, [selectedStudentId, students])

  // Batch Export PDF / ZIP Handler
  const handleBatchPdfExport = (scope: "class" | "grade" | "campus" | "block", asZip: boolean = false) => {
    const params = new URLSearchParams()
    params.set("type", scope)
    params.set("academicYearId", selectedYearId)
    params.set("block", schoolBlock)
    params.set("mode", cvViewMode === "cover" ? "cover" : (cvViewMode === "content" ? "content" : "all"))
    if (asZip) params.set("autoexportzip", "1")

    if (scope === "class") {
      if (selectedClassId === "all") {
        alert("Vui lòng chọn một Lớp cụ thể để xuất.")
        return
      }
      params.set("classId", selectedClassId)
    } else if (scope === "grade") {
      if (selectedGrade === "all") {
        alert("Vui lòng chọn một Khối cụ thể để xuất.")
        return
      }
      params.set("grade", selectedGrade)
      if (selectedCampusId !== "all") params.set("campusId", selectedCampusId)
    } else if (scope === "campus") {
      if (selectedCampusId === "all") {
        alert("Vui lòng chọn một Cơ sở cụ thể để xuất.")
        return
      }
      params.set("campusId", selectedCampusId)
    }

    // Open print window
    window.open(`/admin/ho-so-hoc-sinh/print?${params.toString()}`, "_blank")
  }

  // Filter students by local search query & studentType
  const filteredStudentsList = useMemo(() => {
    let list = students || [];
    if (selectedStudentType === "GIAO_LUU") {
      list = list.filter((s: any) => (s.studentType || s.student?.studentType) === "GIAO_LUU");
    } else if (selectedStudentType === "CHINH_KHOA") {
      list = list.filter((s: any) => (s.studentType || s.student?.studentType) !== "GIAO_LUU");
    }
    return list;
  }, [students, selectedStudentType]);

  // Dynamic counts for student types
  const studentTypeCounts = useMemo(() => {
    let chinhKhoa = 0;
    let giaoLuu = 0;
    for (const s of (students || [])) {
      if ((s.studentType || s.student?.studentType) === "GIAO_LUU") {
        giaoLuu++;
      } else {
        chinhKhoa++;
      }
    }
    return {
      all: (students || []).length,
      chinhKhoa,
      giaoLuu,
    };
  }, [students]);

  // Synchronize selected student whenever filteredStudentsList changes
  useEffect(() => {
    if (filteredStudentsList.length > 0) {
      setSelectedStudentId((currId) => {
        const hasCurrent = filteredStudentsList.some((s: any) => s.id === currId);
        return hasCurrent ? currId : filteredStudentsList[0].id;
      });
    } else {
      setSelectedStudentId("");
      setSelectedStudent(null);
    }
  }, [filteredStudentsList]);

  const tabs = [
    { id: "cv", label: "Xem chi tiết HSHS (A4)", icon: User },
    { id: "academic", label: "Kết quả Học tập (MOET & Song ngữ)", icon: FileText },
    { id: "competencies", label: "Đánh giá Năng lực Toàn diện", icon: Sparkles },
    { id: "achievements", label: "Thành tích & Khen thưởng", icon: Award },
    { id: "projects", label: "Hoạt động trải nghiệm", icon: BookOpen },
    { id: "orientation", label: "Hướng nghiệp & Định hướng", icon: Compass },
    { id: "comments", label: "Nhận xét nổi bật GVCN", icon: MessageSquare }
  ]

  const toggleLike = (postId: string) => {
    setPostLikes(prev => {
      const current = prev[postId] || { count: 0, liked: false }
      return {
        ...prev,
        [postId]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked
        }
      }
    })
  }

  const handleAddComment = (postId: string, authorName: string) => {
    const commentText = newCommentTexts[postId]
    if (!commentText || !commentText.trim()) return

    setPostCommentsState(prev => {
      const currentList = prev[postId] || []
      return {
        ...prev,
        [postId]: [
          ...currentList,
          {
            author: authorName,
            text: commentText,
            time: "Vừa xong"
          }
        ]
      }
    })

    setNewCommentTexts(prev => ({
      ...prev,
      [postId]: ""
    }))
  }

  return (
    <div className="space-y-6">
      {/* 1. Selector Bar (Admin filters) */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-xs font-black text-slate-800 uppercase tracking-wider">
            <div className="p-1.5 bg-[#00A19A]/10 text-[#00A19A] rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <span>Bộ Lọc Tra Cứu &amp; Xuất Báo Cáo Hồ Sơ Học Sinh</span>
          </div>
          <span className="text-[10px] font-extrabold text-[#00A19A] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            Năm học: {academicYears.find(y => y.id === selectedYearId)?.name || activeYearName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Year selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
              Năm học
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* School Block selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-[#00A19A]" />
              Bậc học
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSchoolBlock("k12")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "k12" ? "bg-white text-[#00A19A] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Phổ thông
              </button>
              <button
                type="button"
                onClick={() => setSchoolBlock("preschool")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "preschool" ? "bg-white text-[#00A19A] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Mầm non
              </button>
            </div>
          </div>

          {/* Campus selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#00A19A]" />
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
            >
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName}</option>
              ))}
            </select>
          </div>

          {/* Grade selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#00A19A]" />
              Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
            >
              <option value="all">Tất cả Khối</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>


          {/* Class selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
              Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
            >
              <option value="all">Tất cả Lớp ({filteredClassesList.length})</option>
              {filteredClassesList.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          {/* Student Type selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
              Diện học sinh
            </label>
            <select
              value={selectedStudentType}
              onChange={(e) => setSelectedStudentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
            >
              <option value="all">Tất cả diện HS ({studentTypeCounts.all})</option>
              <option value="CHINH_KHOA">Chính khóa ({studentTypeCounts.chinhKhoa})</option>
              <option value="GIAO_LUU">Giao lưu ({studentTypeCounts.giaoLuu})</option>
            </select>
          </div>

        </div>

        {/* INLINE SECTION VISIBILITY TOGGLES (BẬT / TẮT TRỰC QUAN THEO KHỐI & HỆ HỌC) */}
        <StudentProfileInlineSectionToggles
          configMap={configMap}
          onConfigMapChange={setConfigMap}
          selectedStudent={selectedStudent}
          selectedGradeFilter={selectedGrade}
          academicYearId={selectedYearId}
          onOpenFullModal={() => setIsConfigModalOpen(true)}
        />

        {/* Batch Export PDF buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-500">
            <Printer className="w-4 h-4 text-[#00A19A]" />
            <span>Xuất báo cáo PDF đồng loạt:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBatchPdfExport("class", true)}
              disabled={selectedClassId === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-teal-600 hover:from-purple-800 hover:to-teal-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs font-bold"
              title="Xuất theo lớp thành thư mục ZIP, bên trong là từng file PDF theo từng học sinh (Lớp_MaHS_Hovaten.pdf)"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Xuất ZIP Lớp (Từng file HS)</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("class", false)}
              disabled={selectedClassId === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Cả Lớp</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("grade", false)}
              disabled={selectedGrade === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Khối</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("campus", false)}
              disabled={selectedCampusId === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Cơ sở</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("block", false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#00A19A] to-[#009085] hover:opacity-95 text-white rounded-xl shadow-md shadow-[#00A19A]/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Bậc Học</span>
            </button>
          </div>
        </div>

        {/* SMART STUDENT SELECTOR TOOLBAR (Gọn gàng, không tràn danh sách) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-50/40 via-white to-slate-50 p-2.5 rounded-xl border border-teal-100/60">
          {/* Dropdown Popover Chọn học sinh nhanh */}
          <div className="relative" ref={studentDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
              className="flex items-center gap-2.5 bg-white hover:bg-teal-50/50 border border-slate-200/90 hover:border-[#00A19A] px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-2xs cursor-pointer group"
              title="Bấm để chọn học sinh khác trong danh sách"
            >
              <div className="w-6 h-6 rounded-lg bg-[#00A19A] text-white flex items-center justify-center font-black text-[11px] shadow-2xs">
                {selectedStudent?.studentName ? selectedStudent.studentName.split(" ").pop()?.charAt(0) : "H"}
              </div>
              <div className="text-left">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Học sinh đang xem:</span>
                <span className="font-extrabold text-slate-900 group-hover:text-[#00A19A] text-xs transition-colors">
                  {selectedStudent?.studentName || "Chọn học sinh..."}
                  {selectedStudent?.studentCode && (
                    <span className="font-mono text-slate-400 font-normal ml-1.5 text-[11px]">({selectedStudent.studentCode})</span>
                  )}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isStudentDropdownOpen ? "rotate-180 text-[#00A19A]" : ""}`} />
            </button>

            {/* Smart Dropdown Menu */}
            {isStudentDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-84 max-w-[92vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                    Chọn học sinh
                  </span>
                  <span className="text-[10px] font-bold bg-teal-50 text-[#00A19A] px-2 py-0.5 rounded-full">
                    {filteredStudentsList.length} HS
                  </span>
                </div>

                {/* Quick Search inside Dropdown */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã HS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Compact Scrollable List */}
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredStudentsList.length === 0 ? (
                    <div className="py-6 px-3 text-center text-xs text-slate-400">
                      {loadingStudents ? (
                        <div className="flex items-center justify-center gap-1.5 text-slate-500 font-semibold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
                          <span>Đang tải học sinh...</span>
                        </div>
                      ) : (
                        <>
                          <p>Không có học sinh nào phù hợp.</p>
                          {students.length > 0 && selectedStudentType !== "all" && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentType("all")}
                              className="mt-2 text-[11px] text-[#00A19A] font-bold hover:underline cursor-pointer block mx-auto"
                            >
                              Bỏ lọc diện ({students.length} HS trong lớp)
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ) : filteredStudentsList.map((s: any) => {
                    const isSelected = s.id === selectedStudentId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setIsStudentDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? "bg-teal-50 text-[#00A19A] border-[#00A19A] shadow-2xs"
                            : "hover:bg-slate-50 border-transparent text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] flex-shrink-0 ${
                            isSelected ? "bg-[#00A19A] text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {s.studentName ? s.studentName.split(" ").pop()?.charAt(0) : "H"}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-extrabold text-slate-800 text-xs block truncate">{s.studentName}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">{s.className || "Lớp"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">{s.studentCode}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#00A19A]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Drawer Button & Prev/Next Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStudentDrawerOpen(true)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Mở danh sách toàn bộ học sinh để chọn nhanh theo danh sách trực quan"
            >
              <Users className="w-3.5 h-3.5 text-[#00A19A]" />
              <span>Toàn bộ HS ({filteredStudentsList.length})</span>
            </button>

            {/* Quick Prev / Next Navigator */}
            {filteredStudentsList.length > 1 && (() => {
              const cIdx = filteredStudentsList.findIndex((s: any) => s.id === selectedStudentId);
              return (
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs px-2 py-1">
                  <button
                    type="button"
                    disabled={cIdx <= 0}
                    onClick={() => cIdx > 0 && setSelectedStudentId(filteredStudentsList[cIdx - 1].id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all text-xs font-bold"
                    title="Học sinh trước đó"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Trước</span>
                  </button>
                  <span className="px-2 text-xs font-mono font-black text-[#00A19A] bg-teal-50 py-0.5 rounded-lg border border-teal-100">
                    {cIdx + 1} / {filteredStudentsList.length}
                  </span>
                  <button
                    type="button"
                    disabled={cIdx >= filteredStudentsList.length - 1}
                    onClick={() => cIdx < filteredStudentsList.length - 1 && setSelectedStudentId(filteredStudentsList[cIdx + 1].id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all text-xs font-bold"
                    title="Học sinh kế tiếp"
                  >
                    <span className="hidden sm:inline">Tiếp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Slide-over Drawer for Full Student List */}
      {isStudentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsStudentDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl z-50 p-5 flex flex-col space-y-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00A19A]" />
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Danh sách học sinh</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStudentDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên hoặc mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A19A]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredStudentsList.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-slate-400">
                  {loadingStudents ? (
                    <div className="flex flex-col items-center gap-2 text-slate-500 font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-[#00A19A]" />
                      <span>Đang tải học sinh...</span>
                    </div>
                  ) : (
                    <>
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>Không có học sinh nào phù hợp bộ lọc.</p>
                      {students.length > 0 && selectedStudentType !== "all" && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentType("all")}
                          className="mt-3 px-3 py-1.5 bg-teal-50 text-[#00A19A] border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 transition-all cursor-pointer"
                        >
                          Xem tất cả {students.length} học sinh của lớp
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : filteredStudentsList.map((s: any) => {
                const isSelected = s.id === selectedStudentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setIsStudentDrawerOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? "bg-teal-50 text-[#00A19A] border-[#00A19A] shadow-2xs"
                        : "hover:bg-slate-50 border-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                        isSelected ? "bg-[#00A19A] text-white shadow-2xs" : "bg-slate-100 text-slate-600"
                      }`}>
                        {s.studentName ? s.studentName.split(" ").pop()?.charAt(0) : "H"}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="font-extrabold text-slate-900 text-xs block truncate">{s.studentName}</span>
                        <span className="text-[10px] text-slate-400 font-normal block">{s.className || "Lớp"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">{s.studentCode}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#00A19A]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Student list */}
        {!isExpandedView && (
          <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#00A19A]" />
                  Danh sách Học sinh
                </h3>
                <span className="text-[10px] font-extrabold bg-teal-50 text-[#00A19A] px-2.5 py-0.5 rounded-full border border-teal-200/80">
                  {filteredStudentsList.length} học sinh
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] transition-all text-slate-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 text-[#00A19A] animate-spin opacity-60" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Đang tải...</span>
                </div>
              ) : filteredStudentsList.length === 0 ? (
                <div className="text-[10px] text-slate-400 font-semibold italic text-center py-8">
                  {selectedCampusId === "all" && selectedGrade === "all" && selectedClassId === "all" && !searchQuery
                    ? "Vui lòng lọc theo Cơ sở, Khối hoặc tìm kiếm để hiển thị học sinh."
                    : "Không tìm thấy học sinh nào."}
                </div>
              ) : (
                filteredStudentsList.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      selectedStudentId === s.id
                        ? "bg-teal-50/80 text-[#00A19A] border-[#00A19A] shadow-xs"
                        : "bg-slate-50/40 hover:bg-slate-100/60 border-slate-200/60 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase flex-shrink-0 ${
                        selectedStudentId === s.id ? "bg-[#00A19A] text-white shadow-2xs" : "bg-slate-200/80 text-slate-700"
                      }`}>
                        {s.studentName.split(" ").pop()?.charAt(0) || "H"}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="truncate font-black text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{s.studentName}</span>
                          {s.studentType === "GIAO_LUU" && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0" title="Học sinh giao lưu">
                              GL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{s.className || s.classCode || "Chưa xếp lớp"}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-white border border-slate-200/80 px-2 py-0.5 rounded text-slate-500 flex-shrink-0 font-extrabold">
                      {s.studentCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {/* Right workspace: Selected Student Details */}
        <div className={`${isExpandedView ? "lg:col-span-12" : "lg:col-span-8"} space-y-6`}>
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Profile Details Header with Student Switcher & Fullscreen Mode */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-100/70 border-b border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00A19A]/5 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex items-center gap-3.5 z-10">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group w-13 h-13 rounded-2xl overflow-hidden bg-gradient-to-br from-[#003B3A] to-[#00A19A] border-2 border-white shadow-md flex items-center justify-center text-white font-black text-base cursor-pointer flex-shrink-0"
                    title="Bấm để tải lên / thay đổi ảnh đại diện"
                  >
                    <img
                      key={`hdr-photo-${selectedStudentId}-${avatarTimestamp}`}
                      src={`/api/student-photos/${selectedStudentId}?code=${encodeURIComponent(selectedStudent?.studentCode || "")}&t=${avatarTimestamp}`}
                      alt={selectedStudent?.studentName || "Avatar"}
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback && fallback.style) fallback.style.display = 'flex';
                      }}
                      onLoad={(e: any) => {
                        e.currentTarget.style.display = 'block';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback && fallback.style) fallback.style.display = 'none';
                      }}
                    />
                    <span style={{ display: 'none' }} className="items-center justify-center w-full h-full">
                      {selectedStudent?.studentName ? String(selectedStudent.studentName).trim().split(" ").pop()?.charAt(0) : <User className="w-6 h-6" />}
                    </span>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-5 h-5" />
                    </div>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-800 tracking-tight leading-tight">
                        {selectedStudent?.studentName}
                      </h3>
                      {selectedStudent?.className && (
                        <span className="bg-teal-50 text-[#00A19A] border border-teal-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Lớp {selectedStudent.className}
                        </span>
                      )}
                      {selectedStudent?.studentType === "GIAO_LUU" ? (
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          Học sinh Giao lưu
                        </span>
                      ) : (
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Chính khóa
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-bold">
                      <span>Mã HS: <span className="text-slate-700 font-extrabold">{selectedStudent?.studentCode}</span></span>
                      <span>Ngày sinh: <span className="text-slate-700 font-extrabold">{selectedStudent?.dob || "N/A"}</span></span>
                      <span>Giới tính: <span className="text-slate-700 font-extrabold">{selectedStudent?.gender || "N/A"}</span></span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation & Action Tools */}
                <div className="flex items-center gap-2 z-10 self-end md:self-auto flex-wrap">
                  {/* Prev / Next Student Switcher */}
                  {filteredStudentsList.length > 1 && (() => {
                    const cIdx = filteredStudentsList.findIndex((s: any) => s.id === selectedStudentId);
                    return (
                      <div className="flex items-center bg-white border border-slate-200/90 rounded-xl shadow-2xs p-0.5">
                        <button
                          disabled={cIdx <= 0}
                          onClick={() => cIdx > 0 && setSelectedStudentId(filteredStudentsList[cIdx - 1].id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                          title="Học sinh trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 text-[10px] font-bold text-slate-500">
                          {cIdx + 1} / {filteredStudentsList.length}
                        </span>
                        <button
                          disabled={cIdx >= filteredStudentsList.length - 1}
                          onClick={() => cIdx < filteredStudentsList.length - 1 && setSelectedStudentId(filteredStudentsList[cIdx + 1].id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
                          title="Học sinh tiếp theo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Toggle Fullscreen / Expansive View */}
                  <button
                    onClick={() => setIsExpandedView(!isExpandedView)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs border transition-all cursor-pointer ${
                      isExpandedView
                        ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-teal-800"
                    }`}
                    title={isExpandedView ? "Thu gọn danh sách" : "Xem toàn màn hình (Mở rộng tối đa không gian)"}
                  >
                    {isExpandedView ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Thu gọn</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-teal-600" />
                        <span className="hidden sm:inline">Toàn màn hình</span>
                      </>
                    )}
                  </button>

                  {/* PDF Download & Print Actions */}
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPDF}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all cursor-pointer transform active:scale-95 disabled:opacity-75"
                    title="Xuất trực tiếp file PDF chỉ chứa nội dung hồ sơ (không dính giao diện web, URL hay ngày giờ)"
                  >
                    {isDownloadingPDF ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xuất PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất file PDF (.pdf)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="flex items-center gap-1.5 bg-white border border-teal-500 text-teal-800 hover:bg-teal-50 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer"
                    title="Cấu hình hiển thị các mục Hồ sơ theo Khối và Hệ học"
                  >
                    <Sliders className="w-3.5 h-3.5 text-teal-600" />
                    <span>Cấu hình Hồ sơ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=${cvViewMode === 'cover' ? 'cover' : (cvViewMode === 'content' ? 'content' : 'all')}`, "_blank")}
                    className="hidden sm:flex items-center gap-1.5 bg-white border border-teal-400 text-[#00A19A] hover:bg-teal-50 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
                    title="Mở hộp thoại in / Lưu dưới dạng PDF chuẩn vector"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In / Lưu PDF Trình duyệt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetClassId = (selectedClassId && selectedClassId !== "all") 
                        ? selectedClassId 
                        : (selectedStudent?.classId || selectedStudent?.class?.id);
                      const targetParam = targetClassId ? `&classId=${targetClassId}` : "";
                      window.open(`/admin/ho-so-hoc-sinh/print?type=class${targetParam}&academicYearId=${selectedYearId}&mode=${cvViewMode === 'cover' ? 'cover' : (cvViewMode === 'content' ? 'content' : 'all')}&autoexportzip=1`, "_blank");
                    }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-[#00A19A] hover:from-purple-800 hover:to-teal-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer transform active:scale-95"
                    title="Xuất theo lớp thành thư mục ZIP, bên trong là từng file PDF theo từng học sinh (Lớp_MaHS_Hovaten.pdf)"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-purple-200" />
                    <span>Xuất ZIP Theo Lớp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetClassId = (selectedClassId && selectedClassId !== "all") 
                        ? selectedClassId 
                        : (selectedStudent?.classId || selectedStudent?.class?.id);
                      const targetParam = targetClassId ? `&classId=${targetClassId}` : "";
                      window.open(`/admin/ho-so-hoc-sinh/print?type=class${targetParam}&academicYearId=${selectedYearId}&mode=${cvViewMode === 'cover' ? 'cover' : (cvViewMode === 'content' ? 'content' : 'all')}&autoprint=1`, "_blank");
                    }}
                    className="hidden md:flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    title="In toàn bộ hồ sơ học sinh trong lớp qua máy in trình duyệt"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>In Cả Lớp</span>
                  </button>
                </div>
              </div>

              {/* Smart Segmented Pill Tab Bar (Horizontal Scrollable) */}
              <div className="border-b border-slate-200/80 bg-slate-50/70 px-3 py-2 overflow-x-auto custom-scrollbar flex items-center gap-1.5">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white shadow-sm shadow-teal-900/20 font-black scale-[1.02]"
                          : "bg-white/80 hover:bg-white text-slate-600 hover:text-teal-900 border border-slate-200/60 shadow-2xs"
                      }`}
                    >
                      {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-300" : "text-slate-400"}`} />}
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6 flex-grow">
                {selectedStudent ? (
                  <div>
                    {/* TAB: CV INTEGRATED - 6 CORE SECTIONS */}
                    {(activeTab === "cv" || activeTab === "advisory_360") && (() => {
                      const sectionVisibility = resolveStudentSectionVisibility(selectedStudent, configMap);
                      const coverStudentData = {
                        studentName: selectedStudent?.studentName || selectedStudent?.fullName || "HỌC SINH SKY-LINE",
                        studentCode: selectedStudent?.studentCode || selectedStudent?.code || "",
                        vneduCode: selectedStudent?.vneduCode || selectedStudent?.markFileCode || null,
                        className: selectedStudent?.className || selectedStudent?.class?.className || "",
                        campusName: selectedStudent?.campusName || selectedStudent?.campus?.campusName || "Sky-Line",
                        yearName: selectedStudent?.yearName || selectedStudent?.academicYear?.name || "2025-2026",
                        yearTheme: selectedStudent?.yearTheme || selectedStudent?.academicYear?.theme || null,
                        qrDataUrl: selectedStudent?.qrDataUrl || null,
                      };

                      return (
                        <div className="bg-slate-200/60 p-3 sm:p-6 rounded-3xl border border-slate-300/60 shadow-inner flex flex-col items-center">
                          {/* CV VIEW SUB-TOOLBAR: Điều khiển chọn Bìa / Ruột / Trọn bộ */}
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
                              {cvViewMode === "cover" && (
                                <button
                                  onClick={() => window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=cover`, "_blank")}
                                  className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="In hoặc Lưu PDF riêng trang bìa A4"
                                >
                                  <Printer className="w-3.5 h-3.5 text-[#00A19A]" />
                                  <span>In / Xuất PDF Bìa A4</span>
                                </button>
                              )}
                              {cvViewMode === "content" && (
                                <button
                                  onClick={() => window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=content`, "_blank")}
                                  className="inline-flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                  title="In hoặc Lưu PDF đúng mẫu Hồ sơ Năng lực (Ruột A4)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-[#00A19A]" />
                                  <span>In / Xuất PDF Ruột Hồ Sơ</span>
                                </button>
                              )}
                              <button
                                onClick={() => window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}&mode=all`, "_blank")}
                                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-110 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                                title="In trọn bộ gồm trang bìa A4 và toàn bộ hồ sơ năng lực"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>In Trọn Bộ A4</span>
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
                                  Mã QR e-Portfolio Lifelong
                                </span>
                              </div>
                              <StudentProfileCoverA4 student={coverStudentData} mode="preview" showExtraMeta={true} />
                            </div>
                          )}

                          {/* DẢI PHÂN CÁCH TRANG TRỰC QUAN */}
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
                            <div id="a4-student-portfolio" className="w-full max-w-[210mm] min-h-[297mm] bg-white border border-slate-300 shadow-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 font-sans relative overflow-hidden space-y-6 text-slate-800">
                          {/* TOP DECORATIVE BANNER */}
                          <div className="absolute top-0 left-0 right-0 h-3.5 bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-[#48BFE3]" />

                          {/* SECTION 1: HEADER & ADMINISTRATIVE INFO */}
                          <div className="border-b-2 border-slate-100 pb-5 pt-2">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                              <div className="flex items-center gap-3.5">
                                <img src="/logo.png" alt="Sky-Line School" className="h-11 w-auto object-contain" />
                                <div>
                                  <div className="font-black text-[11px] tracking-widest text-[#00A19A] uppercase">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
                                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">HỒ SƠ NĂNG LỰC HỌC SINH</h2>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Comprehensive Profile &amp; Portfolio</p>
                                </div>
                              </div>
                              <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl text-right text-xs font-semibold text-slate-600 self-start sm:self-auto shadow-2xs">
                                <div>Năm học: <span className="text-[#00A19A] font-black">{selectedStudent?.yearName || "2025-2026"}</span></div>
                                <div>Cơ sở: <span className="text-slate-800 font-bold">{selectedStudent?.campusName || "Sky-Line"}</span></div>
                              </div>
                            </div>

                            {/* Restructured 7-Section Student Portfolio */}
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
                                    <div
                                      onClick={() => fileInputRef.current?.click()}
                                      className="relative group w-28 h-28 rounded-2xl overflow-hidden border-2 border-teal-300 shadow-sm flex items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50/50 cursor-pointer"
                                      title="Bấm để tải lên hoặc thay đổi ảnh đại diện học sinh"
                                    >
                                      <img
                                        key={`cv-photo-${selectedStudentId}-${avatarTimestamp}`}
                                        src={`/api/student-photos/${selectedStudentId}?code=${encodeURIComponent(selectedStudent?.studentCode || "")}&t=${avatarTimestamp}`}
                                        alt={selectedStudent?.studentName || "Avatar"}
                                        className="w-full h-full object-cover"
                                        onError={(e: any) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback && fallback.style) fallback.style.display = 'flex';
                      }}
                                        onLoad={(e: any) => {
                        e.currentTarget.style.display = 'block';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback && fallback.style) fallback.style.display = 'none';
                      }}
                                      />
                                      <div style={{ display: 'none' }} className="flex flex-col items-center justify-center text-slate-400 space-y-1 w-full h-full">
                                        <User className="w-12 h-12 text-teal-700/60" />
                                        <span className="text-[10px] font-bold text-teal-800">Chưa có ảnh</span>
                                      </div>
                                      <div className="no-print pdf-hide absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black space-y-1">
                                        <Camera className="w-6 h-6" />
                                        <span>Đổi ảnh</span>
                                      </div>
                                      {isUploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                                          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                                          <span>Đang lưu...</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="no-print pdf-hide flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1 text-[10px] font-bold text-[#00A19A] hover:text-[#005B55] bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer transition-all shadow-2xs"
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span>Tải ảnh lên</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleDeleteAvatar}
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-all"
                                        title="Xóa ảnh đại diện"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 w-full pt-1">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Họ và tên</span>
                                      <span className="font-black text-slate-900 text-sm block">{selectedStudent?.studentName}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã học sinh</span>
                                      <span className="font-mono font-black text-[#00A19A] text-sm block">{selectedStudent?.studentCode}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Lớp học</span>
                                      <span className="font-bold text-slate-800 text-sm block">{selectedStudent?.className}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngày sinh</span>
                                      <span className="font-bold text-slate-800 block">{selectedStudent?.dob || 'N/A'}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Giới tính</span>
                                      <span className="font-bold text-slate-800 block">{selectedStudent?.gender || 'N/A'}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Giáo viên chủ nhiệm (GVCN)</span>
                                      <span className="font-bold text-teal-700 block">
                                        {(() => {
                                          if (selectedStudent?.homeroomTeacherName && selectedStudent.homeroomTeacherName !== "Chưa phân công") {
                                            return selectedStudent.homeroomTeacherName;
                                          }
                                          const sNorm = normalizeClassKey(selectedStudent?.className || "");
                                          const matchedCls = classes.find((c: any) => 
                                            c.id === selectedStudent?.classId || 
                                            c.className === selectedStudent?.className || 
                                            c.classCode === selectedStudent?.classCode ||
                                            (sNorm && normalizeClassKey(c.className) === sNorm)
                                          );
                                          if (matchedCls?.homeroomTeacherName && matchedCls.homeroomTeacherName !== "Chưa phân công") {
                                            return matchedCls.homeroomTeacherName;
                                          }
                                          return "Chưa phân công";
                                        })()}
                                      </span>
                                    </div>
                                    {(selectedStudent?.yearTheme || selectedStudent?.academicYear?.theme) && (
                                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-2.5 mt-0.5 border-t border-teal-100/80">
                                        <div className="inline-flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5 bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-transparent px-3.5 py-2 rounded-xl border-l-3 border-[#00A19A]">
                                          <span className="text-[10px] text-teal-700 font-extrabold uppercase tracking-widest shrink-0">
                                            ✦ Chủ đề theo Năm học:
                                          </span>
                                          <span
                                            className="text-base sm:text-[17px] font-bold italic text-[#003B3A] tracking-wide leading-snug"
                                            style={{
                                              fontFamily: "var(--font-playfair), 'Playfair Display', 'Palatino Linotype', 'Book Antiqua', Georgia, 'Times New Roman', serif",
                                            }}
                                          >
                                            &ldquo;{selectedStudent?.yearTheme || selectedStudent?.academicYear?.theme}&rdquo;
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* DATA PROCESSOR FOR MOET & BILINGUAL GRADES */}
                              {(() => {
                                const gradeEntries: any[] = selectedStudent?.subjectGradeEntries || [];
                                const termScores: any[] = selectedStudent?.termScores || [];
                                const termSummaries: any[] = selectedStudent?.termSummaries || [];

                                const isBilingualSub = (name: string, code: string) => {
                                  const s = `${name} ${code}`.toLowerCase();
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
                                  );
                                };

                                // 1. Map Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)
                                const periodicMap = new Map<string, { name: string; code: string; ksdn: any; gk1: any; ck1: any; gk2: any; ck2: any }>();
                                gradeEntries.forEach((entry: any) => {
                                  const sName = entry.subject?.subjectName || "Môn học";
                                  const sCode = entry.subject?.subjectCode || "";
                                  const key = (entry.subjectId || sName).trim();
                                  if (!periodicMap.has(key)) {
                                    periodicMap.set(key, { name: sName, code: sCode, ksdn: null, gk1: null, ck1: null, gk2: null, ck2: null });
                                  }
                                  const item = periodicMap.get(key)!;
                                  const period = String(entry.evaluationPeriod || "").toUpperCase().trim();
                                  const scoreVal = entry.compositeScore !== null && entry.compositeScore !== undefined ? Number(entry.compositeScore).toFixed(1) : null;
                                  if (period === "KSĐN" || period === "KSDN" || period.includes("ĐẦU NĂM")) item.ksdn = scoreVal;
                                  else if (period === "GK1" || period.includes("GIỮA KỲ 1") || period.includes("GIỮA KÌ 1")) item.gk1 = scoreVal;
                                  else if (period === "CK1" || period.includes("CUỐI KỲ 1") || period.includes("CUỐI KÌ 1")) item.ck1 = scoreVal;
                                  else if (period === "GK2" || period.includes("GIỮA KỲ 2") || period.includes("GIỮA KÌ 2")) item.gk2 = scoreVal;
                                  else if (period === "CK2" || period.includes("CUỐI KỲ 2") || period.includes("CUỐI KÌ 2")) item.ck2 = scoreVal;
                                });

                                // 2. Map Điểm tổng kết học tập (CK1, CK2, CN)
                                const termMap = new Map<string, { name: string; code: string; hk1: any; hk2: any; cn: any }>();
                                termScores.forEach((ts: any) => {
                                  const sName = ts.subject?.subjectName || "Môn học";
                                  const sCode = ts.subject?.subjectCode || "";
                                  const key = (ts.subjectId || sName).trim();
                                  if (!termMap.has(key)) {
                                    termMap.set(key, { name: sName, code: sCode, hk1: null, hk2: null, cn: null });
                                  }
                                  const item = termMap.get(key)!;
                                  const sem = String(ts.semester || "").toUpperCase().trim();
                                  const val = ts.score !== null && ts.score !== undefined ? Number(ts.score).toFixed(1) : (ts.evaluationGrade || null);
                                  if (sem === "HK1" || sem === "HKI" || sem.includes("HỌC KỲ 1") || sem === "1") item.hk1 = val;
                                  else if (sem === "HK2" || sem === "HKII" || sem.includes("HỌC KỲ 2") || sem === "2") item.hk2 = val;
                                  else if (sem === "CN" || sem.includes("CẢ NĂM")) item.cn = val;
                                });

                                // Phân chia danh sách
                                const moetPeriodicRows = Array.from(periodicMap.values()).filter(r => !isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));
                                const bilingualPeriodicRows = Array.from(periodicMap.values()).filter(r => isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));

                                const moetTermRows = Array.from(termMap.values()).filter(r => !isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));
                                const bilingualTermRows = Array.from(termMap.values()).filter(r => isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));

                                // Xếp loại tổng kết
                                const sumHK1 = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("1") || String(s.semester).toUpperCase() === "HK1");
                                const sumHK2 = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("2") || String(s.semester).toUpperCase() === "HK2");
                                const sumCN = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("CN") || String(s.semester).toUpperCase() === "NĂM");

                                return (
                                  <div className="space-y-7">
                                    {/* SECTION II: CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU */}
            {sectionVisibility.advisoryGoals && (() => {
              const goals = (selectedStudent?.goals || []);
              const trackings = (selectedStudent?.goalTrackings || []);
              const evaluations = (selectedStudent?.termEvaluations || []);
              const evalItem = evaluations[0] || null;

              const gradeLevel = String(selectedStudent?.className || selectedStudent?.grade || "").toUpperCase();
              const isSecondaryOrHigh = !gradeLevel.match(/^(?:LỚP\s*)?[1-5][A-Z\.]/i) && !gradeLevel.includes("KHỐI 1") && !gradeLevel.includes("KHỐI 2") && !gradeLevel.includes("KHỐI 3") && !gradeLevel.includes("KHỐI 4") && !gradeLevel.includes("KHỐI 5");

              const categories = isSecondaryOrHigh ? [
                { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                { key: "THOI_QUEN", label: "2. Mục tiêu thói quen", weight: 15 },
                { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng & Cảm xúc", weight: 15 },
                { key: "DINH_HUONG", label: "4. Mục tiêu định hướng & Hướng nghiệp", weight: 20 }
              ] : [
                { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                { key: "SUC_KHOE", label: "2. Mục tiêu sức khỏe & Thói quen", weight: 20 },
                { key: "SO_THICH", label: "3. Mục tiêu sở thích & Năng khiếu", weight: 15 },
                { key: "PHAM_CHAT", label: "4. Mục tiêu phẩm chất & Đạo đức", weight: 15 }
              ];

              const advisoryRows: any[] = [];
              categories.forEach(cat => {
                const matchedGoals = goals.filter((g: any) => {
                  const gc = String(g.category || "").toUpperCase();
                  if (cat.key === "HOC_TAP" && (gc.includes("HOC_TAP") || gc.includes("HỌC TẬP"))) return true;
                  if (cat.key === "THOI_QUEN" && (gc.includes("THOI_QUEN") || gc.includes("THÓI QUEN") || gc.includes("SUC_KHOE"))) return true;
                  if (cat.key === "KY_NANG_CAM_XUC" && (gc.includes("KY_NANG") || gc.includes("KỸ NĂNG") || gc.includes("CAM_XUC") || gc.includes("CẢM XÚC") || gc.includes("SO_THICH"))) return true;
                  if (cat.key === "DINH_HUONG" && (gc.includes("DINH_HUONG") || gc.includes("ĐỊNH HƯỚNG") || gc.includes("HUONG_NGHIEP") || gc.includes("PHAM_CHAT"))) return true;
                  return false;
                });

                if (matchedGoals.length === 0) {
                  advisoryRows.push({
                    catKey: cat.key,
                    catLabel: cat.label,
                    weight: cat.weight,
                    isFirstInCat: true,
                    totalInCat: 1,
                    subIndex: 1,
                    targetText: "Em chưa điền nội dung mục tiêu nhóm này",
                    actionText: "",
                    progressStatus: "CHUA_DANH_GIA",
                    goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                    initiativeLevel: evalItem?.initiativeLevel || null,
                    participationAttitude: evalItem?.participationAttitude || null,
                    recommendations: evalItem?.recommendations || ""
                  });
                } else {
                  matchedGoals.forEach((g: any, idx: number) => {
                    const tracking = trackings.find((t: any) =>
                      (t.goalId && t.goalId === g.id) ||
                      (t.targetText && g.targetText && t.targetText.trim() === g.targetText.trim()) ||
                      (t.category && String(t.category).includes(cat.label))
                    );
                    const actionText = g.actions?.[0]?.actionText || "";
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
                      teacherNotes: tracking?.teacherNotes || "",
                      goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                      initiativeLevel: evalItem?.initiativeLevel || null,
                      participationAttitude: evalItem?.participationAttitude || null,
                      recommendations: tracking?.teacherNotes || evalItem?.recommendations || ""
                    });
                  });
                }
              });

              const renderProgressBadge = (status: any) => {
                const s = String(status || "").toUpperCase();
                if (s === "DAT" || s === "HOAN_THANH") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Đạt (100%)</span>
                    </span>
                  );
                }
                if (s === "TIEN_TRIEN") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>Tiến triển (50%)</span>
                    </span>
                  );
                }
                if (s === "CAN_CO_GANG") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      <span>Cần cố gắng (25%)</span>
                    </span>
                  );
                }
                if (s === "CHUA_DAT") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>Chưa đạt</span>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    <span>Chưa đánh giá</span>
                  </span>
                );
              };

              return (
                <div className="space-y-3 print-section-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <Compass className="w-4 h-4 text-indigo-500" />
                      <span>II. CỐ VẤN HỌC TẬP &amp; NHẬT KÝ THEO DÕI MỤC TIÊU</span>
                    </h3>
                    <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Phiếu Đánh Giá Kỳ Cố Vấn Học Tập
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[9px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 border-r border-slate-200 w-[180px]">Nhóm mục tiêu (Trọng số)</th>
                          <th className="py-2 px-2.5 border-r border-slate-200 min-w-[220px]">Mục tiêu cụ thể</th>
                          <th className="py-2 px-2 text-center border-r border-slate-200 w-[115px]">Kết quả theo dõi</th>
                          <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">Mức hoàn thành MT (1-5)</th>
                          <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">Mức độ chủ động (1-5)</th>
                          <th className="py-2 px-2 text-center w-[110px]">Thái độ tham gia (1-5)</th>
                          
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
                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                      ({r.totalInCat} mục tiêu nhỏ)
                                    </p>
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
                                  {r.targetText || "Em chưa điền nội dung mục tiêu nhóm này"}
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
              );
            })()}

                                    {/* SECTION III: KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) */}
                                     {(sectionVisibility.moetPeriodicGrades || sectionVisibility.moetTermGrades) && (
                                       <div className="space-y-4">
                                         <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2">
                                           <div className="flex items-center gap-2">
                                             <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                                             <ClipboardCheck className="w-4 h-4 text-[#00A19A]" />
                                             <span>I. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)</span>
                                           </div>
                                           <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                             Chương trình Bộ GD&amp;ĐT
                                           </span>
                                         </h3>

                                         {sectionVisibility.moetPeriodicGrades && (
                                      <div className="space-y-1.5">
                                        {/* Bảng 1: Kết quả kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2) */}
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                          <span>1. Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)</span>
                                          <span className="text-[10px] font-normal text-slate-400">Thang điểm 10</span>
                                        </div>
                                        {moetPeriodicRows.length === 0 ? (
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
                                                  <th className="py-2 px-2 text-center bg-teal-50/50 text-[#00A19A]">KSĐN</th>
                                                  <th className="py-2 px-2 text-center">Giữa kỳ 1</th>
                                                  <th className="py-2 px-2 text-center">Cuối kỳ 1</th>
                                                  <th className="py-2 px-2 text-center">Giữa kỳ 2</th>
                                                  <th className="py-2 px-2 text-center">Cuối kỳ 2</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {moetPeriodicRows.map((r, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/80">
                                                    <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                                                    <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                                                    <td className="py-2 px-2 text-center font-black text-[#00A19A] bg-teal-50/20">{r.ksdn || "—"}</td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">{r.gk1 || "—"}</td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">{r.ck1 || "—"}</td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">{r.gk2 || "—"}</td>
                                                    <td className="py-2 px-2 text-center font-black text-slate-800">{r.ck2 || "—"}</td>
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
                                        {/* Bảng 2: Bảng điểm Học tập tổng kết (CK1 / HK1, CK2 / HK2, Cả năm) */}
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-800 uppercase tracking-wide">
                                          <span>2. Bảng điểm Học tập tổng kết (CK1, CK2, Cả năm)</span>
                                          <span className="text-[10px] font-normal text-slate-400">Kết quả Học bạ</span>
                                        </div>
                                        {moetTermRows.length === 0 ? (
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
                                                  <th className="py-2 px-3 text-center">Học kỳ 1 (CK1)</th>
                                                  <th className="py-2 px-3 text-center">Học kỳ 2 (CK2)</th>
                                                  <th className="py-2 px-3 text-center bg-teal-50/60 text-[#00A19A]">Cả năm (CN)</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {moetTermRows.map((r, idx) => (
                                                  <tr key={idx} className="hover:bg-slate-50/80">
                                                    <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                                                    <td className="py-2 px-3 font-bold text-slate-900">{r.name}</td>
                                                    <td className="py-2 px-3 text-center font-black text-slate-800">{r.hk1 || "—"}</td>
                                                    <td className="py-2 px-3 text-center font-black text-slate-800">{r.hk2 || "—"}</td>
                                                    <td className="py-2 px-3 text-center font-black text-[#00A19A] bg-teal-50/30">{r.cn || "—"}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}

                                        {/* Thẻ Đánh giá & Xếp loại Học tập Tổng thể */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                                          <div className="bg-teal-50/50 border border-teal-150 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">Điểm TB (GPA)</div>
                                            <div className="text-base font-black text-slate-900 mt-0.5">
                                              {sumCN?.gpa ? Number(sumCN.gpa).toFixed(1) : sumHK1?.gpa ? Number(sumHK1.gpa).toFixed(1) : "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">Cả năm</div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-150 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">Học lực (KQHT)</div>
                                            <div className="text-base font-black text-teal-700 mt-0.5">
                                              {sumCN?.academicRating || sumHK1?.academicRating || "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">Theo quy định BGD</div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-150 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-teal-800 font-black uppercase">Rèn luyện (Hạnh kiểm)</div>
                                            <div className="text-base font-black text-emerald-700 mt-0.5">
                                              {sumCN?.conductRating || sumHK1?.conductRating || "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">Đánh giá GVCN</div>
                                          </div>
                                          <div className="bg-teal-50/50 border border-teal-150 p-2.5 rounded-xl text-center shadow-2xs">
                                            <div className="text-[10px] text-amber-700 font-black uppercase">Khen thưởng</div>
                                            <div className="text-base font-black text-amber-800 mt-0.5 truncate" title={sumCN?.reward || sumHK1?.reward || "—"}>
                                              {sumCN?.reward || sumHK1?.reward || "—"}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold">Danh hiệu Sky-Line</div>
                                          </div>
                                        </div>
                                      </div>
                                         )}
                                       </div>
                                     )}

                                     {/* MÔN HỌC ĐẶC THÙ SKY-LINE (SKL) */}
                                     {sectionVisibility.specialSubjects && (
                                       <StudentSpecialSubjectsSection student={selectedStudent} />
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

                                      {bilingualTermRows.length === 0 && bilingualPeriodicRows.length === 0 ? (
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
                                                <th className="py-2.5 px-3 text-center bg-blue-100/60 text-blue-900">Cả năm (CN)</th>
                                                <th className="py-2.5 px-3 text-center">Đánh giá Năng lực</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50 font-semibold text-slate-700">
                                              {(bilingualTermRows.length > 0 ? (bilingualTermRows as any[]) : (bilingualPeriodicRows as any[])).map((r: any, idx: number) => {
                                                const pItem = bilingualPeriodicRows.find(p => p.name === r.name);
                                                const ksdnVal = pItem ? (pItem.ksdn || pItem.gk1) : "—";
                                                return (
                                                  <tr key={idx} className="hover:bg-blue-50/30">
                                                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                                                    <td className="py-2.5 px-2 text-center font-black text-blue-700">{ksdnVal || "—"}</td>
                                                    <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.hk1 || "—"}</td>
                                                    <td className="py-2.5 px-3 text-center font-black text-slate-800">{r.hk2 || "—"}</td>
                                                    <td className="py-2.5 px-3 text-center font-black text-blue-900 bg-blue-50/40">{r.cn || "—"}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                      <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                                                        Hoàn thành Tốt
                                                      </span>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                     )}

                                     {/* SECTION V: THÀNH TÍCH & KHEN THƯỞNG CỦA HỌC SINH */}
                                     {sectionVisibility.achievements && (
<div className="space-y-3">
                                      <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                        <Award className="w-4 h-4 text-amber-500" />
                                        VI. THÀNH TÍCH &amp; BẢNG VÀNG KHEN THƯỞNG
                                      </h3>
                                      {(!selectedStudent?.achievements || selectedStudent.achievements.length === 0) ? (
                                        <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
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
                                              {selectedStudent.achievements.slice(0, 4).map((item: any, idx: number) => {
                                                const ach = item.achievement || item;
                                                const achName = ach.name || "Giải thưởng";
                                                const catName = getCategoryLabel(ach.category || ach.examCategoryName);
                                                const levelName = getLevelLabel(ach.level);
                                                return (
                                                  <tr key={idx} className="hover:bg-amber-50/20">
                                                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-800">{achName}</td>
                                                    <td className="py-2.5 px-3 text-[10px] font-black text-[#00A19A] uppercase">{catName}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                      <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                                                        {levelName}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                );
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
                                      {(!selectedStudent?.experientialActivities || selectedStudent.experientialActivities.length === 0) ? (
                                        <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-center text-xs text-slate-400 italic">
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
                                              {selectedStudent.experientialActivities.map((act: any, idx: number) => (
                                                <tr key={act.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                  <td className="py-3 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                                  <td className="py-3 px-3 font-extrabold text-[#003B3A] text-xs">
                                                    {act.activityName}
                                                  </td>
                                                  <td className="py-3 px-3 text-slate-600 font-medium">
                                                    {act.themeName || act.groupName || '—'}
                                                  </td>
                                                  <td className="py-3 px-3 text-slate-600 font-normal leading-relaxed text-[11px]">
                                                    {act.educationalContent || act.deliverables || act.themeAxisName || '—'}
                                                  </td>
                                                  <td className="py-3 px-3 text-center">
                                                    <span className="inline-block bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                                      {act.role || 'Thành viên'}
                                                    </span>
                                                  </td>
                                                  <td className="py-3 px-3 text-center">
                                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                                                      {act.evalLevel || 'Đạt'}
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
                                        VIII. NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM
                                      </h3>
                                      <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl space-y-2 text-xs font-medium text-slate-700 shadow-2xs">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-emerald-100 pb-1.5">
                                          <span>Ghi nhận từ GVCN ({selectedStudent?.homeroomTeacherName || "Giáo viên chủ nhiệm"}):</span>
                                          <span className="font-mono text-emerald-700 text-[10px]">Năm học {selectedStudent?.yearName || "2025-2026"}</span>
                                        </div>
                                        <p className="italic leading-relaxed text-slate-700 pt-1">
                                          "{selectedStudent?.highlightComments?.[0]?.comment || selectedStudent?.highlightComments?.[0]?.content || 'Học sinh có ý thức kỷ luật tốt, hăng hái phát biểu xây dựng bài, có tinh thần giúp đỡ bạn bè và tham gia tích cực các hoạt động trải nghiệm của trường.'}"
                                        </p>
                                      </div>
                                    </div>
                                     )}

                                     {/* SECTION IX: KHUNG KÝ XÁC THỰC 3 BÊN */}
                                    <div className="pt-6 border-t-2 border-slate-100 mt-8">
                                      <div className="text-right text-[11px] font-medium text-slate-500 italic mb-4">
                                        Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                                      </div>
                                      <div className="grid grid-cols-3 gap-4 text-center">
                                        {/* Cột 1: Học sinh */}
                                        <div className="space-y-16">
                                          <div>
                                            <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">HỌC SINH CAM KẾT</div>
                                            <div className="text-[10px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                                          </div>
                                          <div className="font-black text-xs text-slate-900">
                                            {selectedStudent?.studentName || "Học sinh"}
                                          </div>
                                        </div>

                                        {/* Cột 2: GVCN */}
                                        <div className="space-y-16">
                                          <div>
                                            <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">CỐ VẤN / GVCN</div>
                                            <div className="text-[10px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                                          </div>
                                          <div className="font-black text-xs text-[#00A19A]">
                                            {selectedStudent?.homeroomTeacherName || "Thầy/Cô Chủ nhiệm"}
                                          </div>
                                        </div>

                                        {/* Cột 3: BGH */}
                                        <div className="space-y-16">
                                          <div>
                                            <div className="font-bold text-xs uppercase text-slate-700 tracking-wider">BAN GIÁM HIỆU PHÊ DUYỆT</div>
                                            <div className="text-[10px] text-slate-400 italic">(Ký, đóng dấu &amp; ghi rõ họ tên)</div>
                                          </div>
                                          <div className="font-black text-xs text-slate-800 uppercase">
                                            HIỆU TRƯỞNG / GĐCS SKY-LINE
                                          </div>
                                        </div>
                                      </div>

                                      {/* Official Document Footer */}
                                      <div className="mt-8 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center text-[10px] font-semibold text-slate-400 gap-1">
                                        <span>HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ NĂNG LỰC HỌC SINH 360°</span>
                                        <span>Trang A4 Chuẩn • Học bạ Điện tử Chính thức</span>
                                      </div>
                                      {/* PHỤ LỤC: KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN (RADAR 360°) */}
                                      <div className="mt-8 pt-6 border-t-2 border-dashed border-teal-300 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 p-4 rounded-2xl">
                                          <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-[#00A19A]" />
                                            <div>
                                              <span className="text-[10px] font-black uppercase text-[#00A19A] tracking-wider block">PHỤ LỤC HỒ SƠ</span>
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
                                            studentId={selectedStudent?.id || selectedStudentId}
                                            studentCode={selectedStudent?.studentCode}
                                            studentName={selectedStudent?.studentName}
                                            initialAcademicYearId={selectedYearId}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

                    
                    {activeTab === "competencies" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <StudentCompetencyPortfolio
                          studentId={selectedStudent?.id || selectedStudentId}
                          studentCode={selectedStudent?.studentCode}
                          studentName={selectedStudent?.studentName}
                          initialAcademicYearId={selectedYearId}
                        />
                      </div>
                    )}

                    {activeTab === "academic" && (() => {
                      const rawScores = selectedStudent?.termScores || selectedStudent?.student?.termScores || []
                      const rawSummaries = selectedStudent?.termSummaries || selectedStudent?.student?.termSummaries || []
                      
                      const classCodeStr = String(
                        selectedStudent?.class?.classCode || 
                        selectedStudent?.classCode || 
                        selectedStudent?.className || 
                        selectedStudent?.student?.class?.classCode || 
                        ""
                      )
                      const classGradeStr = String(
                        selectedStudent?.class?.grade || 
                        selectedStudent?.grade || 
                        selectedStudent?.student?.class?.grade || 
                        ""
                      )
                      const levelStr = String(
                        selectedStudent?.class?.level || 
                        selectedStudent?.level || 
                        selectedStudent?.student?.class?.level || 
                        ""
                      ).toUpperCase()

                      const isPrimary = 
                        schoolBlock === "preschool" ||
                        levelStr === "PRIMARY" || 
                        levelStr.includes("TIEU HOC") || 
                        levelStr.includes("TIỂU HỌC") ||
                        ["1", "2", "3", "4", "5"].includes(classGradeStr) ||
                        ["1", "2", "3", "4", "5"].some(g => classCodeStr.startsWith(g + ".") || classCodeStr.startsWith(g + "_")) ||
                        /^[1-5][._\s]/i.test(classCodeStr)

                      const isCheckSymbol = (v: any) => {
                        if (!v || v === "—") return false
                        const s = String(v).trim()
                        if (["✓", "", "v", "V", "x", "X", "1", "true", "True"].includes(s)) return true
                        const code = s.charCodeAt(0)
                        return code === 61692 || code === 10003 || code === 10004
                      }

                      let primaryKqgdHK1 = ""
                      let primaryKqgdHK2 = ""
                      let primaryKqgdCN = ""

                      const isKqgdSubject = (code: any, name: any) => {
                        const c = String(code || "").toUpperCase()
                        const n = String(name || "").trim().toLowerCase()
                        return c === "HOAN_THANH_XUAT_SAC" || c === "HOAN_THANH_TOT" || c === "HOAN_THANH" || c === "CHUA_HOAN_THANH" ||
                               n === "hoàn thành xuất sắc" || n === "hoàn thành tốt" || n === "hoàn thành" || n === "chưa hoàn thành" ||
                               n === "khen thưởng" || n === "khen thưởng cấp trường"
                      }

                      const subjectMap = new Map()
                      rawScores.forEach((ts: any) => {
                        let subName = ts.subject?.subjectName || "Môn học"
                        let subCode = ts.subject?.subjectCode || ""

                                                if (isPrimary) {
                          const lowerN = (subName + " " + subCode).toLowerCase()
                          if (lowerN.includes("tiếng việt") || lowerN.includes("tieng viet") || lowerN.includes("tvi")) subName = "Tiếng Việt"
                          else if (lowerN.includes("toán") || lowerN.includes("toan")) subName = "Toán"
                          else if (lowerN.includes("tiếng anh") || lowerN.includes("tieng anh") || lowerN.includes("esl") || lowerN.includes("eng")) subName = "Tiếng Anh"
                          else if (lowerN.includes("đạo đức") || lowerN.includes("dao duc") || lowerN.includes("giáo dục công dân") || lowerN.includes("gcd")) subName = "Đạo đức"
                          else if (lowerN.includes("tn-xh") || lowerN.includes("tự nhiên") || lowerN.includes("tnxh") || lowerN.includes("khoa học") || lowerN.includes("kht")) subName = "TN-XH / Khoa học"
                          else if (lowerN.includes("tin học") || lowerN.includes("công nghệ") || lowerN.includes("tin")) subName = "Tin học và Công nghệ"
                          else if (lowerN.includes("âm nhạc") || lowerN.includes("am nhac") || lowerN.includes("nth") || lowerN.includes("music")) subName = "Âm nhạc"
                          else if (lowerN.includes("mĩ thuật") || lowerN.includes("mỹ thuật") || lowerN.includes("mi thuat") || lowerN.includes("art")) subName = "Mĩ thuật"
                          else if (lowerN.includes("thể chất") || lowerN.includes("gdc") || lowerN.includes("gtc")) subName = "Giáo dục thể chất"
                          else if (lowerN.includes("trải nghiệm") || lowerN.includes("hdtn") || lowerN.includes("hđtn")) subName = "Hoạt động trải nghiệm"
                        }

                        const hasScore = ts.score !== null && ts.score !== undefined
                        const hasGrade = ts.evaluationGrade !== null && ts.evaluationGrade !== undefined && String(ts.evaluationGrade).trim() !== "" && ts.evaluationGrade !== "—"
                        const displayVal = (hasScore && hasGrade) ? { score: ts.score, grade: ts.evaluationGrade } : (hasScore ? ts.score : (ts.evaluationGrade || "—"))

                        const key = (isPrimary ? subName : (ts.subjectId || subName)).normalize("NFC").trim()
                        if (!subjectMap.has(key)) {
                          subjectMap.set(key, { id: key, name: subName, code: subCode, hk1: null, hk2: null, cn: null })
                        }
                        const item = subjectMap.get(key)
                        const normSem = String(ts.semester || "").trim().toUpperCase()
                        const isHK1 = normSem === "HK1" || normSem === "HKI" || normSem.includes("HỌC KỲ 1") || normSem.includes("HỌC KÌ 1") || normSem.includes("HỌC KỲ I") || normSem === "1"
                        const isHK2 = normSem === "HK2" || normSem === "HKII" || normSem.includes("HỌC KỲ 2") || normSem.includes("HỌC KÌ 2") || normSem.includes("HỌC KỲ II") || normSem === "2"
                        const isCN = normSem === "CN" || normSem.includes("CẢ NĂM") || normSem.includes("CA NAM")

                        if (isHK1) item.hk1 = displayVal
                        else if (isHK2) item.hk2 = displayVal
                        else if (isCN) item.cn = displayVal
                        else item.hk1 = displayVal
                      })

                      // Primary full subjects catalog
                      if (isPrimary) {
                        const standardPrimarySubjects = [
                          { code: "TVI", name: "Tiếng Việt" },
                          { code: "TOA", name: "Toán" },
                          { code: "ENG", name: "Tiếng Anh" },
                          { code: "DAO_DUC", name: "Đạo đức" },
                          { code: "TNXH", name: "TN-XH / Khoa học" },
                          { code: "TIN", name: "Tin học và Công nghệ" },
                          { code: "AM_NHAC", name: "Âm nhạc" },
                          { code: "MI_THUAT", name: "Mĩ thuật" },
                          { code: "GTC", name: "Giáo dục thể chất" },
                          { code: "HDTN", name: "Hoạt động trải nghiệm" }
                        ]
                        standardPrimarySubjects.forEach(ps => {
                          const existingKey = Array.from(subjectMap.keys()).find((k: any) => {
                            const item = subjectMap.get(k)
                            const n = (item?.name || "").normalize("NFC").toLowerCase().trim()
                            const c = (item?.code || "").normalize("NFC").toLowerCase().trim()
                            const targetN = ps.name.normalize("NFC").toLowerCase().trim()
                            const targetC = ps.code.normalize("NFC").toLowerCase().trim()
                            return n === targetN || c === targetC || n.includes(targetN.split(" ")[0]) || targetN.includes(n.split(" ")[0])
                          })
                          if (!existingKey) {
                            subjectMap.set(ps.code, { id: ps.code, name: ps.name, code: ps.code, hk1: null, hk2: null, cn: null })
                          }
                        })
                      }

                      const subjectRows = Array.from(subjectMap.values())
                        .filter((row: any) => !isKqgdSubject(row.code, row.name))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name, "vi"))

                      const summariesMap: Record<string, any> = {}
                      rawSummaries.forEach((s: any) => {
                        const normS = String(s.semester || "").trim().toUpperCase()
                        if (normS === "HK1" || normS === "HKI" || normS.includes("HỌC KỲ 1") || normS === "1") summariesMap["HK1"] = s
                        else if (normS === "HK2" || normS === "HKII" || normS.includes("HỌC KỲ 2") || normS === "2") summariesMap["HK2"] = s
                        else if (normS === "CN" || normS.includes("CẢ NĂM")) summariesMap["CN"] = s
                        else if (s.semester) summariesMap[s.semester] = s
                      })

                      const hk1Summary = summariesMap["HK1"]
                      const hk2Summary = summariesMap["HK2"]
                      const cnSummary = summariesMap["CN"]

                      const computePrimaryKqgd = (rows: any[], sem: "hk1" | "hk2" | "cn") => {
                        if (!rows || rows.length === 0) return null
                        let hasVal = false
                        let allT = true
                        let anyC = false

                        rows.forEach(r => {
                          const val = r[sem]
                          if (!val || val === "—") return
                          hasVal = true
                          let g = ""
                          let num = NaN
                          if (typeof val === "object" && val !== null) {
                            g = val.grade ? String(val.grade).trim().toUpperCase() : ""
                            num = val.score !== null && val.score !== undefined ? Number(val.score) : NaN
                          } else if (typeof val === "number") {
                            num = val
                          } else {
                            g = String(val).trim().toUpperCase()
                            if (!isNaN(Number(g))) num = Number(g)
                          }

                          if (g === "C" || g.includes("CHƯA") || (!isNaN(num) && num < 5.0)) {
                            anyC = true
                            allT = false
                          } else if (g === "H" || g.includes("HOÀN THÀNH") || (!isNaN(num) && num < 9.0)) {
                            allT = false
                          }
                        })

                        if (!hasVal) return null
                        if (anyC) return "Chưa hoàn thành"
                        if (allT) return "Hoàn thành xuất sắc"
                        return "Hoàn thành tốt"
                      }

                      const computedKqgdHK1 = computePrimaryKqgd(subjectRows, "hk1")
                      const computedKqgdHK2 = computePrimaryKqgd(subjectRows, "hk2")
                      const computedKqgdCN = computePrimaryKqgd(subjectRows, "cn")

                      // Primary: Dynamic Summary computation based on imported data without hardcoded defaults
                      const computedPrimaryCN = computePrimaryKqgd(subjectRows, "cn") || computePrimaryKqgd(subjectRows, "hk1")
                      const finalKqgdHK1 = primaryKqgdHK1 || hk1Summary?.academicRating || computedKqgdHK1 || null
                      const finalKqgdHK2 = primaryKqgdHK2 || hk2Summary?.academicRating || computedKqgdHK2 || null
                      const finalKqgdCN = primaryKqgdCN || cnSummary?.academicRating || computedPrimaryCN || null


                      const hasData = subjectRows.length > 0 || rawSummaries.length > 0 || !!finalKqgdCN

                      const formatScoreBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        
                        if (typeof val === "object" && val !== null && (val.score !== undefined || val.grade !== undefined)) {
                          const gStr = val.grade ? String(val.grade).trim() : ""
                          const num = val.score !== null && val.score !== undefined ? (typeof val.score === "number" ? val.score : parseFloat(val.score)) : NaN

                          let gradeBadge = null
                          if (gStr === "T" || gStr === "Tốt" || gStr === "Hoàn thành tốt") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                          } else if (gStr === "H" || gStr === "Hoàn thành") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                          } else if (gStr === "C" || gStr === "Chưa hoàn thành") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                          } else if (gStr) {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{gStr}</span>
                          }

                          let scoreBadge = null
                          if (!isNaN(num)) {
                            let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                            if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                            else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                            else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                            else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                            scoreBadge = <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                          }

                          return (
                            <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                              {gradeBadge}
                              {scoreBadge}
                            </div>
                          )
                        }

                        const str = String(val).trim()
                        if (isCheckSymbol(str)) {
                          return <span className="inline-flex items-center justify-center bg-teal-50 text-[#00A19A] border border-teal-200 px-2 py-0.5 rounded-lg font-black text-xs shadow-2xs">✓</span>
                        }
                        if (str === "T" || str === "Tốt") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                        }
                        if (str === "H" || str === "Hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                        }
                        if (str === "C" || str === "Chưa hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                        }
                        const num = typeof val === "number" ? val : parseFloat(val)
                        if (!isNaN(num)) {
                          let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                          if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                          else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                          else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                          else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                          return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                        }
                        return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{str}</span>
                      }

                                            const renderGradeBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        let gStr = ""
                        let scoreNum = NaN
                        if (typeof val === "object" && val !== null) {
                          gStr = val.grade ? String(val.grade).trim() : ""
                          scoreNum = val.score !== null && val.score !== undefined ? Number(val.score) : NaN
                        } else if (typeof val === "number") {
                          scoreNum = val
                        } else {
                          gStr = String(val).trim()
                          if (!isNaN(Number(gStr))) scoreNum = Number(gStr)
                        }

                        // Infer Primary grade if missing but score is available
                        if (!gStr && !isNaN(scoreNum)) {
                          if (scoreNum >= 9.0) gStr = "T"
                          else if (scoreNum >= 5.0) gStr = "H"
                          else gStr = "C"
                        }

                        if (gStr === "T" || gStr === "Tốt" || gStr === "Hoàn thành tốt") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                        }
                        if (gStr === "H" || gStr === "Hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                        }
                        if (gStr === "C" || gStr === "Chưa hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                        }
                        if (gStr && isNaN(Number(gStr))) {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{gStr}</span>
                        }
                        return <span className="text-slate-400 font-normal">—</span>
                      }

                      const renderScoreOnlyBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        let num = NaN
                        if (typeof val === "object" && val !== null) {
                          num = val.score !== null && val.score !== undefined ? (typeof val.score === "number" ? val.score : parseFloat(val.score)) : NaN
                        } else if (typeof val === "number") {
                          num = val
                        } else if (!isNaN(parseFloat(val))) {
                          num = parseFloat(val)
                        }

                        if (!isNaN(num)) {
                          let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                          if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                          else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                          else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                          else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                          return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                        }
                        return <span className="text-slate-400 font-normal">—</span>
                      }

return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#00A19A]" />
                                Kết quả Học tập Văn hóa (MOET)
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Bảng điểm môn học &amp; Đánh giá xếp loại tổng kết định kỳ</p>
                            </div>
                            <span className="bg-teal-50 text-[#00A19A] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Năm học: {selectedStudent?.yearName || activeYearName}
                            </span>
                          </div>

                          {!hasData ? (
                            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-80" />
                              <div className="text-sm font-black text-slate-700">Hệ thống đang cập nhật điểm. Vui lòng quay lại sau.</div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <GraduationCap className="w-4 h-4 text-[#00A19A]" />
                                  Tổng kết Đánh giá &amp; Xếp loại Học tập
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* HK1 Card */}
                                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Học kỳ 1</span>
                                      <span className="text-[9px] font-extrabold text-[#00A19A] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">HK1</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD HK1:</span>
                                            {finalKqgdHK1 ? (
                                              <span className="font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">{finalKqgdHK1}</span>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic font-medium">Không đánh giá định kỳ HK1</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk1Summary?.absencesTotal !== undefined && hk1Summary?.absencesTotal !== null 
                                                ? `${hk1Summary.absencesTotal} buổi (CP: ${hk1Summary.absencesPermitted || 0}, KP: ${hk1Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực / Đánh giá:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk1Summary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Hạnh kiểm / Rèn luyện:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk1Summary?.conductRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk1Summary?.absencesTotal !== undefined && hk1Summary?.absencesTotal !== null 
                                                ? `${hk1Summary.absencesTotal} buổi (CP: ${hk1Summary.absencesPermitted || 0}, KP: ${hk1Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                          {hk1Summary?.reward && (
                                            <div className="pt-1 border-t border-slate-100 text-[11px]">
                                              <span className="text-amber-600 font-bold">Khen thưởng: </span>
                                              <span className="text-slate-800 font-bold">{hk1Summary.reward}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* HK2 Card */}
                                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Học kỳ 2</span>
                                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">HK2</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2 text-xs font-semibold text-slate-600">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD HK2:</span>
                                            {finalKqgdHK2 ? (
                                              <span className="font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">{finalKqgdHK2}</span>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic font-medium">Không đánh giá định kỳ HK2</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk2Summary?.absencesTotal !== undefined && hk2Summary?.absencesTotal !== null 
                                                ? `${hk2Summary.absencesTotal} buổi (CP: ${hk2Summary.absencesPermitted || 0}, KP: ${hk2Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực / Đánh giá:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk2Summary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Hạnh kiểm / Rèn luyện:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk2Summary?.conductRating || "—"}</span>
                                          </div>
                                        </>
                                      )}
                                      <div className="flex justify-between items-center">
                                        <span>Số ngày nghỉ:</span>
                                        <span className="font-bold text-slate-700">
                                          {hk2Summary?.absencesTotal !== undefined && hk2Summary?.absencesTotal !== null 
                                            ? `${hk2Summary.absencesTotal} buổi (CP: ${hk2Summary.absencesPermitted || 0}, KP: ${hk2Summary.absencesUnpermitted || 0})`
                                            : "—"}
                                        </span>
                                      </div>
                                      {hk2Summary?.reward && (
                                        <div className="pt-1 border-t border-slate-100 text-[11px]">
                                          <span className="text-amber-600 font-bold">Khen thưởng: </span>
                                          <span className="text-slate-800 font-bold">{hk2Summary.reward}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* CN Card */}
                                  <div className="bg-gradient-to-br from-teal-50/40 to-slate-50 border border-teal-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                                      <span className="text-xs font-black text-[#00A19A] uppercase tracking-wider">Cả Năm</span>
                                      <span className="text-[9px] font-extrabold text-white bg-[#00A19A] px-2.5 py-0.5 rounded-full shadow-2xs">CẢ NĂM</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2.5">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD Cả năm:</span>
                                            <span className="font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">{finalKqgdCN}</span>
                                          </div>
                                          <div className="pt-2 border-t border-teal-100/80 flex justify-between items-center flex-wrap gap-1">
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực Cả năm:</span>
                                            <span className="font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">{cnSummary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Rèn luyện Cả năm:</span>
                                            <span className="font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">{cnSummary?.conductRating || "—"}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <BookOpen className="w-4 h-4 text-[#00A19A]" />
                                  Bảng điểm Chi tiết Các Môn học
                                </h5>

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      {isPrimary ? (
                                        <>
                                          <tr className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                            <th rowSpan={2} className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                                            <th rowSpan={2} className="py-3 px-4 border-r border-slate-200">Tên Môn học</th>
                                            <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 text-teal-700 bg-teal-50/50">Học kỳ 1</th>
                                            <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 text-indigo-700 bg-indigo-50/50">Học kỳ 2</th>
                                            <th colSpan={2} className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/50">Cả năm</th>
                                          </tr>
                                          <tr className="bg-slate-50/80 text-slate-600 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20">Điểm KT</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20">Điểm KT</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center w-20">Điểm KT</th>
                                          </tr>
                                        </>
                                      ) : (
                                        <tr className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                          <th className="py-3 px-4 text-center w-12">STT</th>
                                          <th className="py-3 px-4">Tên Môn học</th>
                                          <th className="py-3 px-4 text-center w-28">Học kỳ 1</th>
                                          <th className="py-3 px-4 text-center w-28">Học kỳ 2</th>
                                          <th className="py-3 px-4 text-center w-28">Cả năm</th>
                                        </tr>
                                      )}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {subjectRows.map((row: any, idx: number) => (
                                        <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                                          <td className="py-3 px-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                                          <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-100">{row.name}</td>
                                          {isPrimary ? (
                                            <>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.hk1)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderScoreOnlyBadge(row.hk1)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.hk2)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderScoreOnlyBadge(row.hk2)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.cn)}</td>
                                              <td className="py-3 px-2 text-center">{renderScoreOnlyBadge(row.cn)}</td>
                                            </>
                                          ) : (
                                            <>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk1)}</td>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk2)}</td>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.cn)}</td>
                                            </>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {activeTab === "entrance" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide">Kết quả khảo sát đầu vào</h4>
                          {selectedStudent.entranceSurvey?.type && (
                            <span className="bg-teal-50 text-[#00A19A] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Hệ {selectedStudent.entranceSurvey.type}
                            </span>
                          )}
                        </div>

                        {selectedStudent.entranceSurvey ? (
                          <div className="space-y-6">
                            {/* Entrance sub-tabs navigation */}
                            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar no-print">
                              <button
                                onClick={() => setEntranceSubTab("results")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "results"
                                    ? "border-[#00A19A] text-[#00A19A]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? "Đánh giá phát triển" : "Kết quả đánh giá"}
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("admin")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "admin"
                                    ? "border-[#00A19A] text-[#00A19A]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <User className="w-3.5 h-3.5" />
                                Thông tin hành chính
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("academic")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "academic"
                                    ? "border-[#00A19A] text-[#00A19A]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? "Học thử & Quyết định" : "Hồ sơ & Học bạ"}
                              </button>
                            </div>

                            {/* Sub-tab: results */}
                            {entranceSubTab === "results" && (
                              <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Summary Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                                  <div>Cơ sở đăng ký: <span className="text-slate-800">{selectedStudent.entranceSurvey.admissionCampus || "N/A"}</span></div>
                                  <div>Kết quả tuyển sinh: <span className="text-slate-800">{selectedStudent.entranceSurvey.admissionResult || "Chưa xác định"}</span></div>
                                </div>

                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="space-y-4 animate-in fade-in duration-200">
                                    <h5 className="text-xs font-black text-slate-700">Đánh giá Phát triển Mầm non:</h5>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      <div>Kết quả chung: <span className="font-bold text-slate-700">{selectedStudent.entranceSurvey.devAssessmentResult || "N/A"}</span></div>
                                      <div>Lưu ý quan trọng: <span className="font-bold text-slate-700">{selectedStudent.entranceSurvey.devImportantNote || "Không có"}</span></div>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left border-collapse border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-600 font-bold">
                                            <th className="p-2 border border-slate-200">Lĩnh vực phát triển</th>
                                            <th className="p-2 border border-slate-200">Tiêu chí đánh giá</th>
                                            <th className="p-2 border border-slate-200">Kết quả</th>
                                            <th className="p-2 border border-slate-200">Ghi chú</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(selectedStudent.entranceSurvey.scores || []).length > 0 ? (
                                            selectedStudent.entranceSurvey.scores.map((sc: any, idx: number) => (
                                              <tr key={idx} className="font-semibold text-slate-705">
                                                <td className="p-2 border border-slate-200 font-bold">{sc.areaName}</td>
                                                <td className="p-2 border border-slate-200">{sc.criterionName}</td>
                                                <td className="p-2 border border-slate-200">{sc.result}</td>
                                                <td className="p-2 border border-slate-200">{sc.note || "-"}</td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr><td colSpan={4} className="p-2 text-center text-slate-400 italic">Không tìm thấy chi tiết điểm tiêu chí mầm non.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (() => {
                                  const survey = selectedStudent.entranceSurvey
                                  let mathVal = survey.mathScore
                                  let litVal = survey.literatureScore
                                  let writtenVal = survey.writtenEnglishScore
                                  let oralVal = survey.oralEnglishScore
                                  let psychVal = survey.psychologyScore
                                  let oralComment = ""
                                  let psychConclusion = ""
                                  ;(survey.scores || []).forEach((sc: any) => {
                                    const sName = (sc.subjectName || "").toLowerCase().normalize("NFC")
                                    const scoresArr = Array.isArray(sc.scores) ? sc.scores : []
                                    const scoreVal = scoresArr.find((x: any) => x !== undefined && x !== null && x !== "")
                                    const commentsArr = Array.isArray(sc.comments) ? sc.comments : []
                                    if (sName.includes("toán") || sName.includes("math")) {
                                      if (scoreVal !== undefined) mathVal = scoreVal
                                    } else if (sName.includes("tiếng việt") || sName.includes("ngữ văn")) {
                                      if (scoreVal !== undefined) litVal = scoreVal
                                    } else if (sName.includes("tiếng anh")) {
                                      if (sName.includes("viết") || sName.includes("written")) {
                                        if (scoreVal !== undefined) writtenVal = scoreVal
                                      } else if (sName.includes("vấn đáp") || sName.includes("nói") || sName.includes("oral")) {
                                        if (scoreVal !== undefined) oralVal = scoreVal
                                        oralComment = commentsArr[0] || ""
                                      }
                                    } else if (sName.includes("tâm lý")) {
                                      const total = scoresArr.reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0)
                                      psychVal = total
                                      psychConclusion = commentsArr[0] || ""
                                    }
                                  })
                                  const isGrade1 = (() => { const m = String(survey.className || survey.grade || "").match(/\d+/); return m ? parseInt(m[0]) === 1 : false })()
                                  const writtenDisplay = isGrade1 ? "Không áp dụng" : (writtenVal !== null && writtenVal !== undefined ? `${writtenVal}/70` : "—")
                                  const oralDisplay = oralVal !== null && oralVal !== undefined ? `${oralVal}/30` : "—"
                                  const wNum = parseFloat(writtenVal), oNum = parseFloat(oralVal)
                                  const totalEnglish = !isGrade1 && (!isNaN(wNum) || !isNaN(oNum)) ? `${(isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum)}/100` : (isGrade1 && !isNaN(oNum) ? `${oralVal}/30 (Quy đổi thang 10: ${(Math.round((oNum / 3) * 10) / 10)}đ)` : null)
                                  let psychLabel = ""; let psychClass = "bg-slate-50 border-slate-200 text-slate-700"
                                  if (psychVal !== null && psychVal !== undefined) {
                                    const pn = parseFloat(psychVal)
                                    if (!isNaN(pn)) {
                                      if (pn <= 15) { psychLabel = "Bình thường"; psychClass = "bg-teal-50 border-teal-200 text-teal-700" }
                                      else if (pn <= 31) { psychLabel = "Dấu hiệu nhẹ"; psychClass = "bg-amber-50 border-amber-200 text-amber-700" }
                                      else if (pn <= 47) { psychLabel = "Dấu hiệu vừa"; psychClass = "bg-orange-50 border-orange-200 text-orange-700" }
                                      else { psychLabel = "Nguy cơ cao"; psychClass = "bg-rose-50 border-rose-200 text-rose-700" }
                                    }
                                  }
                                  return (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                      <h5 className="text-xs font-black text-slate-700">Điểm số các môn khảo sát:</h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-[#00A19A]/5 border border-[#00A19A]/20 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-[#00A19A] font-bold uppercase tracking-wider">Toán</div>
                                          <div className="text-2xl font-extrabold text-slate-805 mt-1">{mathVal !== null && mathVal !== undefined ? mathVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Ngữ văn</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{litVal !== null && litVal !== undefined ? litVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-sky-50/30 border border-sky-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-655 font-bold uppercase tracking-wider">Anh viết</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{writtenDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Không thi (K1)" : "Thang 70"}</div>
                                        </div>
                                        <div className="bg-sky-50/20 border border-sky-100/60 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-655 font-bold uppercase tracking-wider">Anh nói</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{oralDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 30</div>
                                        </div>
                                      </div>
                                      {totalEnglish !== null && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-3 rounded-xl border border-indigo-100 text-center">
                                          <span className="text-xs text-indigo-655 font-black uppercase tracking-wider">Tổng điểm Tiếng Anh: </span>
                                          <span className="text-sm font-extrabold text-indigo-700">{totalEnglish}</span>
                                        </div>
                                      )}
                                      {oralComment && (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-1">Nhận xét Tiếng Anh Nói</div>
                                          <p className="text-xs text-slate-655 font-semibold leading-relaxed italic">"${oralComment}"</p>
                                        </div>
                                      )}
                                      <div className={`text-xs font-semibold space-y-1 p-3 rounded-xl border ${psychClass}`}>
                                        <div className="flex items-center gap-2">
                                          <span>• Đánh giá tâm lý:</span>
                                          <span className="font-extrabold">{psychVal !== null && psychVal !== undefined ? psychVal : "Chưa có"}</span>
                                          {psychLabel && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${psychClass}`}>{psychLabel}</span>}
                                        </div>
                                        {psychConclusion && <div className="pl-3 italic opacity-80">→ {psychConclusion}</div>}
                                        <div>• Kết quả học tập cấp trước: <span className="font-extrabold text-slate-808">{survey.kqHocTap ?? "—"}</span></div>
                                        <div>• Kết quả rèn luyện cấp trước: <span className="font-extrabold text-slate-808">{survey.kqRenLuyen ?? "—"}</span></div>
                                      </div>

                                      {/* Committed Subjects & Approval Details */}
                                      {(survey.directorNote || survey.admissionResult === "Đạt cam kết" || survey.admissionResult === "Đạt - Cam kết") && (() => {
                                        const parseCommittedSubjects = (note: any) => {
                                          if (!note) return []
                                          const match = note.match(/(?:Môn cam kết|Mon cam ket):\s*\[([^\]]+)\]/i)
                                          if (match && match[1]) {
                                            return match[1].split(',').map((s: any) => s.trim())
                                          }
                                          return []
                                        }
                                        const committedSubjects = parseCommittedSubjects(survey.directorNote || "")
                                        return (
                                          <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl space-y-3">
                                            <div className="flex items-center gap-2 border-b border-amber-200/30 pb-2">
                                              <span className="text-[10px] font-black text-amber-808 uppercase tracking-wider">Chi tiết xét duyệt & Cam kết</span>
                                            </div>
                                            {committedSubjects.length > 0 && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Môn cam kết:</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {committedSubjects.map((sub: any, idx: number) => (
                                                    <span key={idx} className="bg-amber-100/80 text-amber-850 border border-amber-200/60 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                                                      {sub}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {survey.directorNote && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Ý kiến chỉ đạo / Ghi chú xét duyệt:</span>
                                                <p className="text-slate-705 bg-white border border-slate-200 p-3 rounded-lg font-semibold mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                  {survey.directorNote}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )
                                })()}
                              </div>
                            )}

                            {/* Sub-tab: admin */}
                            {entranceSubTab === "admin" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in duration-200 text-xs font-semibold text-slate-700">
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.period?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.batch?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.isPreschool ? (selectedStudent.entranceSurvey.grade || "-") : (selectedStudent.entranceSurvey.className || "-")}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.surveySystem || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.admissionCampus || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.admissionCriteria || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.gender || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.dateOfBirth ? new Date(selectedStudent.entranceSurvey.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span>
                                </div>
                              </div>
                            )}

                            {/* Sub-tab: academic */}
                            {entranceSubTab === "academic" && (
                              <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                                      <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.probationaryResult || "Chưa có kết quả"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhận xét chi tiết của giáo viên học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.entranceSurvey.probationaryComment || "Chưa có nhận xét"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryPeriod || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryClass || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryTeacher || "-"}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.entranceSurvey.kqgdTieuHoc || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học tập</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.kqHocTap || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả rèn luyện</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.kqRenLuyen || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ / Bảng điểm khác</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block leading-relaxed">{selectedStudent.entranceSurvey.hoSoCtQuocTe || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học kỳ / Năm tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.hocKy || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.targetType || "-"}</span>
                                    </div>

                                    {selectedStudent.entranceSurvey.oldSchoolName && (
                                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3 text-slate-700">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trường học cũ & Địa chỉ</label>
                                        <div className="text-xs font-semibold text-slate-705 mt-1.5 space-y-1.5">
                                          <div><span className="text-slate-400">Tên trường cũ:</span> {selectedStudent.entranceSurvey.oldSchoolName} ({selectedStudent.entranceSurvey.oldSchoolType})</div>
                                          {selectedStudent.entranceSurvey.targetType === "Nội tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.entranceSurvey.wardName} - {selectedStudent.entranceSurvey.cityName || "TP Đà Nẵng"}</div>
                                          )}
                                          {selectedStudent.entranceSurvey.targetType === "Ngoại tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.entranceSurvey.wardName} - {selectedStudent.entranceSurvey.cityName}</div>
                                          )}
                                          {selectedStudent.entranceSurvey.targetType === "Nước ngoài" && (
                                            <div><span className="text-slate-400">Quốc gia:</span> {selectedStudent.entranceSurvey.countryName}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">
                            Không tìm thấy dữ liệu khảo sát đầu vào trùng khớp với mã học sinh này.
                          </div>
                        )}

                        {/* Transfers info */}
                        <div className="pt-6 border-t border-slate-100">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                            Thông tin Học sinh chuyển trường (nếu có)
                          </h4>
                          {(selectedStudent.transfers || []).length > 0 ? (
                            <div className="space-y-3">
                              {selectedStudent.transfers.map((tr: any) => (
                                <div key={tr.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-xs font-semibold text-slate-705 shadow-2xs animate-in fade-in duration-200">
                                  <div className="font-black text-slate-800">Học sinh Chuyển đến / Chuyển đi: {tr.type === "IN" ? "Chuyển đến" : tr.type === "OUT" ? "Chuyển đi" : "Chuyển lớp"}</div>
                                  <div className="mt-1">Ngày thực hiện: {new Date(tr.transferDate).toLocaleDateString('vi-VN')}</div>
                                  {tr.destinationSchool && <div>Trường chuyển đến/đi: {tr.destinationSchool}</div>}
                                  {tr.reason && <div className="mt-1 text-slate-500">Lý do: {tr.reason}</div>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic font-semibold">Học sinh học bình thường, không có lịch sử chuyển trường.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "achievements" && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide">Thành tích &amp; Khen thưởng của Học sinh</h4>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Danh sách các giải thưởng, huy chương &amp; chứng nhận học sinh đã đạt được</p>
                          </div>
                          {selectedStudent.achievements && selectedStudent.achievements.length > 0 && (
                            <span className="text-xs font-black bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
                              {selectedStudent.achievements.length} giải thưởng
                            </span>
                          )}
                        </div>

                        {(!selectedStudent.achievements || selectedStudent.achievements.length === 0) ? (
                          <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl py-14 text-center text-slate-400 space-y-2 shadow-2xs">
                            <Award className="w-12 h-12 mx-auto opacity-20 text-slate-400 mb-1" />
                            <h5 className="font-extrabold text-slate-600 text-sm">Chưa ghi nhận thành tích nào</h5>
                            <p className="text-xs text-slate-400 font-medium">Học sinh chưa có giải thưởng hoặc kết quả khen thưởng trong hệ thống.</p>
                          </div>
                        ) : (
                          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 text-center w-12">STT</th>
                                    <th className="py-3.5 px-4">Năm học</th>
                                    <th className="py-3.5 px-4">Tên Giải thưởng / Thành tích</th>
                                    <th className="py-3.5 px-4">Kỳ thi / Cuộc thi</th>
                                    <th className="py-3.5 px-4">Lĩnh vực</th>
                                    <th className="py-3.5 px-4 text-center">Cấp độ / Hạng giải</th>
                                    
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                  {selectedStudent.achievements.map((item: any, idx: number) => {
                                    const ach = item.achievement || item;
                                    const achName = ach.name || "Giải thưởng / Khen thưởng";
                                    const catName = getCategoryLabel(ach.category || ach.examCategoryName);
                                    const levelName = getLevelLabel(ach.level);
                                    const yearName = getYearLabel(ach);
                                    const examName = ach.exam?.name || ach.examName || "Ngoài hệ thống";
                                    
                                    const nameLower = achName.toLowerCase();
                                    const isGold = nameLower.includes("vàng") || nameLower.includes("nhất");
                                    const isSilver = nameLower.includes("bạc") || nameLower.includes("nhì");
                                    const isBronze = nameLower.includes("đồng") || nameLower.includes("ba");

                                    return (
                                      <tr key={item.id || ach.id || idx} className="hover:bg-teal-50/20 transition-colors">
                                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] font-bold">
                                          {idx + 1}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 whitespace-nowrap">
                                          <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60 text-[11px]">
                                            {yearName}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 font-black text-slate-800">
                                          <div className="flex items-center gap-2">
                                            <span className={`p-1 rounded-md flex-shrink-0 ${
                                              isGold ? 'bg-amber-100 text-amber-600' :
                                              isSilver ? 'bg-slate-100 text-slate-600' :
                                              isBronze ? 'bg-orange-100 text-orange-600' :
                                              'bg-[#00A19A]/10 text-[#00A19A]'
                                            }`}>
                                              {isGold ? <Trophy className="w-3.5 h-3.5" /> : isSilver || isBronze ? <Medal className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
                                            </span>
                                            <span>{achName}</span>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                                          {examName !== "Ngoài hệ thống" ? (
                                            <span className="flex items-center gap-1 text-[#009085] font-semibold">
                                              <Sparkles className="w-3 h-3 text-[#48BFE3] flex-shrink-0" />
                                              {examName}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic">Ngoài hệ thống</span>
                                          )}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                          <span className="text-[10px] font-black uppercase tracking-wider text-[#009085] bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/80">
                                            {catName}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${
                                            isGold ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                            isSilver ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                            isBronze ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                            'bg-indigo-50 text-indigo-700 border-indigo-200'
                                          }`}>
                                            {levelName}
                                          </span>
                                        </td>
                                        
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "orientation" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Định hướng Nghề nghiệp & Hướng nghiệp</h4>
                        {selectedStudent.orientation ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                            <div className="flex items-center gap-3 bg-teal-50/30 border border-teal-100 p-3.5 rounded-xl">
                              <Compass className="w-5 h-5 text-[#00A19A]" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Định hướng nhóm ngành chủ đạo</div>
                                <div className="text-sm font-black text-slate-805 mt-0.5">{selectedStudent.orientation.result}</div>
                              </div>
                            </div>
                            {selectedStudent.orientation.notes && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chi tiết nhận xét & Đánh giá của GVBM</div>
                                <p className="text-xs text-slate-655 font-semibold leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 italic shadow-2xs">
                                  "${selectedStudent.orientation.notes}"
                                </p>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 font-bold pt-1 text-right">
                              Đánh giá bởi: {selectedStudent.orientation.teacherName} (GVBM)
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa có thông tin nhận xét định hướng nghề nghiệp.</div>
                        )}
                      </div>
                    )}

                    {activeTab === "projects" && (() => {
  const acts = selectedStudent.experientialActivities || [];
  const projs = selectedStudent.projects || [];
  const diSanCount = acts.filter((a: any) => a.themeAxis === "DI_SAN").length;
  const moiTruongCount = acts.filter((a: any) => a.themeAxis === "MOI_TRUONG").length;
  const stemCount = acts.filter((a: any) => a.themeAxis === "STEM").length;
  const ngonNguCount = acts.filter((a: any) => a.themeAxis === "NGON_NGU").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h4 className="text-sm font-black text-[#003B3A] uppercase tracking-wide flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#00A19A]" />
            Hoạt động giáo dục ngoại khóa &amp; Tích hợp liên môn
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Theo Kế hoạch Tổng thể &amp; 7 Phụ lục Năm học 2026–2027 • Hồ sơ trải nghiệm học sinh
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#003B3A]/10 text-[#003B3A] border border-[#003B3A]/20 px-3 py-1 rounded-full text-[11px] font-black">
            {acts.length} hoạt động ghi nhận
          </span>
        </div>
      </div>

      {/* 4 Core Theme Axes Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center font-black text-lg">
            🏛️
          </div>
          <div>
            <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Di sản &amp; Lịch sử</div>
            <div className="text-lg font-black text-slate-900">{diSanCount} <span className="text-[10px] font-semibold text-slate-500">hoạt động</span></div>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-black text-lg">
            🌿
          </div>
          <div>
            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Môi trường &amp; Sinh thái</div>
            <div className="text-lg font-black text-slate-900">{moiTruongCount} <span className="text-[10px] font-semibold text-slate-500">hoạt động</span></div>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-700 flex items-center justify-center font-black text-lg">
            🔬
          </div>
          <div>
            <div className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Khoa học &amp; STEM</div>
            <div className="text-lg font-black text-slate-900">{stemCount} <span className="text-[10px] font-semibold text-slate-500">hoạt động</span></div>
          </div>
        </div>

        <div className="bg-violet-50/70 border border-violet-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-700 flex items-center justify-center font-black text-lg">
            🌐
          </div>
          <div>
            <div className="text-[10px] font-black text-violet-800 uppercase tracking-wider">Ngôn ngữ &amp; Hội nhập</div>
            <div className="text-lg font-black text-slate-900">{ngonNguCount} <span className="text-[10px] font-semibold text-slate-500">hoạt động</span></div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {acts.length === 0 && projs.length === 0 ? (
        <div className="text-xs text-slate-400 italic text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          Học sinh chưa tham gia hoạt động ngoại khóa hoặc dự án trải nghiệm nào trong năm học.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4 min-w-[200px]">Hoạt động &amp; Thời gian</th>
                <th className="py-3 px-3 min-w-[150px]">Trục chủ đề cốt lõi</th>
                <th className="py-3 px-3 min-w-[180px]">Môn chủ trì &amp; Tích hợp / Sản phẩm</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Vai trò</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Kết quả đánh giá</th>
                <th className="py-3 px-4 min-w-[220px]">Nhận xét của giáo viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {acts.map((act: any, idx: number) => {
                const axisBadge = (() => {
                  switch (act.themeAxis) {
                    case "DI_SAN":
                      return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">🏛️ Di sản &amp; Lịch sử</span>;
                    case "MOI_TRUONG":
                      return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">🌿 Môi trường &amp; Sinh thái</span>;
                    case "STEM":
                      return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">🔬 Khoa học &amp; STEM</span>;
                    case "NGON_NGU":
                      return <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-800 border border-violet-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">🌐 Ngôn ngữ &amp; Hội nhập</span>;
                    default:
                      return <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold">{act.themeAxisName || act.groupName || "Trải nghiệm"}</span>;
                  }
                })();

                const evalBadge = (() => {
                  const ev = (act.evalLevel || "").toLowerCase();
                  if (ev.includes("tốt") || ev.includes("xuất sắc") || ev.includes("nổi bật") || ev.includes("tot")) {
                    return <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">{act.evalLevel}</span>;
                  }
                  if (ev.includes("đạt") || ev.includes("dat")) {
                    return <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">{act.evalLevel}</span>;
                  }
                  if (ev.includes("hỗ trợ") || ev.includes("chưa đạt")) {
                    return <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">{act.evalLevel}</span>;
                  }
                  return <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">{act.evalLevel || "Tham gia"}</span>;
                })();

                return (
                  <tr key={act.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#003B3A] text-xs leading-snug">{act.activityName}</div>
                      {act.educationalContent && (
                        <div className="text-[11px] text-slate-600 font-normal leading-relaxed mt-1">
                          {act.educationalContent}
                        </div>
                      )}
                      {act.date && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold mt-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{act.date}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">{axisBadge}</td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        {act.primarySubject && (
                          <div className="text-[11px] font-bold text-slate-800">
                            Môn: <span className="text-[#00A19A]">{act.primarySubject}</span>
                            {act.integratedSubjects && <span className="text-slate-500 font-medium"> + {act.integratedSubjects}</span>}
                          </div>
                        )}
                        {act.deliverables ? (
                          <div className="text-[10px] text-slate-500 font-medium line-clamp-2">
                            📦 {act.deliverables}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Theo kế hoạch</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                        {act.role || "Thành viên"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {evalBadge}
                        {act.score !== undefined && act.score !== null && (
                          <span className="text-[10px] font-bold text-slate-500">({act.score}%)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {act.remarks ? (
                        <div className="text-[11px] text-slate-600 font-normal italic bg-slate-50 border border-slate-150 p-2 rounded-xl">
                          &ldquo;{act.remarks}&rdquo;
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa có nhận xét riêng</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Projects (Dự án học tập) */}
              {projs.map((p: any, idx: number) => (
                <tr key={p.id || `proj-${idx}`} className="hover:bg-slate-50/80 transition-colors bg-sky-50/20">
                  <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{acts.length + idx + 1}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-sky-950 text-xs">{p.projectName || p.name}</div>
                    <div className="text-[10px] text-sky-700 font-semibold mt-0.5">Dự án học tập liên môn</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-block bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold">
                      📚 Dự án môn học
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="text-[11px] text-slate-700 font-medium">
                      {p.subjectName || p.field || "Học phần trải nghiệm"}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                      {p.role || "Thành viên"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                      {p.result || "Đạt"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-[11px] text-slate-600 italic">
                      {p.notes || p.description || "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
})()}

                    {activeTab === "comments" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3 flex justify-between items-center">
                          <span>Nhận xét nổi bật định kỳ từ Giáo viên Chủ nhiệm</span>
                          <span className="bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            GVCN Đánh giá
                          </span>
                        </h4>

                        {((selectedStudent.highlightComments || []).filter((c: any) => c.category !== "ANNOUNCEMENT")).length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            Chưa có nhận xét nổi bật định kỳ nào từ giáo viên chủ nhiệm.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(selectedStudent.highlightComments || [])
                              .filter((c: any) => c.category !== "ANNOUNCEMENT")
                              .map((c: any) => (
                                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold hover:border-slate-355 transition-all animate-in fade-in duration-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="inline-block px-2.5 py-0.5 bg-[#00A19A]/15 text-[#00A19A] text-[9px] font-black rounded-full uppercase tracking-wider shadow-2xs border border-[#00A19A]/10">
                                      {c.category || "Chung"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-705 bg-white border border-slate-200 p-3 rounded-lg font-semibold leading-relaxed">
                                    {c.comment}
                                  </p>
                                  <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2 mt-3 flex justify-between">
                                    <span>Ghi nhận bởi: {c.teacherName} (GVCN)</span>
                                    <span>{new Date(c.updatedAt).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "support" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-850 uppercase tracking-wide border-b border-slate-100 pb-3">Lịch sử theo dõi Hỗ trợ Học tập & Tâm lý</h4>
                        {!selectedStudent.learningSupportTargets || selectedStudent.learningSupportTargets.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh không thuộc đối tượng nhận hỗ trợ học tập/tâm lý trong năm học này.</div>
                        ) : (
                          <div className="space-y-6">
                            {selectedStudent.learningSupportTargets.map((target: any) => {
                              const isTerminated = target.terminationStatus === "TERMINATED";
                              const isPending = target.terminationStatus === "PENDING_TERMINATION";
                              const gvName = target.assignments?.[0]?.teacher?.teacherName || "Chưa phân công";

                              return (
                                <div key={target.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white hover:border-slate-355 transition-all animate-in fade-in duration-200">
                                  <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2 text-slate-700">
                                    <div>
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mr-2 ${
                                        target.supportType === "ACADEMIC" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                      }`}>
                                        {target.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý"}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800">{target.reason}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                        isTerminated ? "bg-emerald-100 text-emerald-800" : isPending ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                                      }`}>
                                        {isTerminated ? "Đã hoàn thành" : isPending ? "Chờ duyệt hoàn thành" : target.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-slate-500">
                                      <div>
                                        <span>Ngày bắt đầu: </span>
                                        <span className="text-slate-800 font-bold">{new Date(target.startDate).toLocaleDateString("vi-VN")}</span>
                                      </div>
                                      <div>
                                        <span>Giáo viên phụ trách: </span>
                                        <span className="text-slate-800 font-bold">{gvName}</span>
                                      </div>
                                      {target.endDate && (
                                        <div>
                                          <span>Ngày chấm dứt: </span>
                                          <span className="text-slate-800 font-bold">{new Date(target.endDate).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                      )}
                                    </div>

                                    {target.outcome && (
                                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-semibold">
                                        <span className="font-extrabold">Kết quả đạt được: </span> {target.outcome}
                                      </div>
                                    )}

                                    {/* Evaluation timeline for this student target */}
                                    <div className="pt-2 border-t border-slate-100">
                                      <h5 className="font-black text-slate-705 text-xs uppercase tracking-wide mb-4">Nhật ký nhận xét định kỳ</h5>
                                      {!target.evaluations || target.evaluations.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic py-2">Chưa có nhận xét định kỳ từ giáo viên phụ trách.</div>
                                      ) : (
                                        <div className="relative border-l-2 border-[#00A19A]/30 pl-5 space-y-5 ml-1.5">
                                          {(target.evaluations || []).map((ev: any) => (
                                            <div key={ev.id} className="relative group">
                                              <span className="absolute -left-[27px] top-1 bg-white border-2 border-[#00A19A] rounded-full h-3.5 w-3.5 flex items-center justify-center shadow-sm">
                                                <span className="h-1.5 w-1.5 bg-[#00A19A] rounded-full"></span>
                                              </span>
                                              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 transition-all">
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                  {new Date(ev.createdAt).toLocaleDateString("vi-VN")} - {ev.periodName} ({ev.periodType === "WEEK" ? "Tuần" : "Tháng"})
                                                </div>
                                                <div className="text-xs font-black text-[#00A19A]">Tiến bộ: {ev.trackingLevel}</div>
                                                <p className="text-xs text-slate-655 font-semibold leading-relaxed">{ev.comment}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-12">Có lỗi xảy ra khi tải dữ liệu học sinh.</div>
                )}
              </div>

            </div>
          ) : loadingStudents ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <Loader2 className="w-10 h-10 text-[#00A19A] animate-spin mx-auto mb-3 opacity-70" />
              <h3 className="text-base font-bold text-slate-800">Đang tải danh sách học sinh...</h3>
              <p className="text-slate-400 text-xs mt-1">Hệ thống đang truy xuất hồ sơ học sinh theo bộ lọc đã chọn.</p>
            </div>
          ) : students.length > 0 && filteredStudentsList.length === 0 && selectedStudentType !== "all" ? (
            <div className="bg-white rounded-2xl border border-teal-200 bg-teal-50/20 shadow-sm p-12 text-center max-w-xl mx-auto my-8">
              <Sparkles className="w-10 h-10 text-[#00A19A] mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">
                {selectedStudentType === "GIAO_LUU" ? "Không có học sinh diện Giao lưu" : "Không có học sinh diện Chính khóa"}
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Lớp này có {students.length} học sinh nhưng {selectedStudentType === "GIAO_LUU" ? "tất cả đều thuộc diện Chính khóa." : "tất cả đều thuộc diện Giao lưu."}
              </p>
              <button
                type="button"
                onClick={() => setSelectedStudentType("all")}
                className="mt-4 px-4 py-2 bg-[#00A19A] hover:bg-[#008f88] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Xem tất cả {students.length} học sinh lớp này</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">
                {filteredStudentsList.length === 0
                  ? (selectedClassId !== "all" ? "Lớp học này chưa có dữ liệu học sinh trong năm học đã chọn." : "Sử dụng bộ lọc ở thanh phía trên và chọn một lớp hoặc học sinh để hiển thị hồ sơ chi tiết.")
                  : "Sử dụng bộ lọc ở thanh phía trên và chọn một học sinh trong danh sách để hiển thị hồ sơ CV chi tiết."}
              </p>
            </div>
          )}
        </div>


      {/* MODAL CẤU HÌNH HỒ SƠ THEO KHỐI & HỆ */}
      <StudentProfileSectionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaved={loadConfigs}
      />
      </div>
    </div>
  )
}
