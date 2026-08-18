"use client"

import { useState, useEffect } from "react"
import { 
  Users, Loader2, User, UserCheck, Award, Trophy, Medal, Sparkles, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, ThumbsUp, MessageCircle, Share2, Send, Globe, Camera,
  Search, Printer, Plus, Heart, Trash2, Calendar, 
  MapPin, CheckCircle, AlertTriangle, GraduationCap
} from "lucide-react"


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

export default function TeacherStudentProfilePage() {
  const [students, setStudents] = useState<any[]>([])
  const [yearId, setYearId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored) return stored;
    }
    return "";
  });

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored && stored !== yearId) {
        setYearId(stored);
      }
    };
    window.addEventListener("academicYearChanged", handleYearChange);
    return () => window.removeEventListener("academicYearChanged", handleYearChange);
  }, [yearId]);

  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("advisory_360")
  const [entranceSubTab, setEntranceSubTab] = useState<"results" | "admin" | "academic">("results")
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isNotGVCN, setIsNotGVCN] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [newPostText, setNewPostText] = useState("")
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)
  const [apiError, setApiError] = useState("")
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Highlight comments states
  const [newCommentText, setNewCommentText] = useState("")
  const [commentCategory, setCommentCategory] = useState("CHUNG")
  const [postingComment, setPostingComment] = useState(false)
  
  // Custom interactive mock likes/comments state for the wall posts
  const [postLikes, setPostLikes] = useState<Record<string, { count: number, liked: boolean }>>({})
  const [postCommentsState, setPostCommentsState] = useState<Record<string, { author: string, text: string, time: string }[]>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Profile data
  const [profileData, setProfileData] = useState<{
    student: any
    achievements: any[]
    orientation: any
    projects: any[]
    experientialActivities?: any[]
    commitment: any
    highlightComments: any[]
    entranceSurvey: any
    transfers: any[]
    learningSupportTargets?: any[]
  } | null>(null)

  const safeFormatDate = (dateVal: any, locale = "vi-VN", fallback = "N/A") => {
    if (!dateVal) return fallback
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return fallback
      return d.toLocaleDateString(locale)
    } catch {
      return fallback
    }
  }

  useEffect(() => {
    if (!yearId) return
    async function loadHomeroomStudents() {
      try {
        setLoadingStudents(true)
        const res = await fetch(`/api/teacher-student-records?action=getHomeroomStudents&academicYearId=${yearId}&_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setStudents(Array.isArray(data) ? data : [])
          if (Array.isArray(data) && data.length > 0) {
            const hasCurrentStudent = data.some(s => s.id === selectedStudentId)
            if (!hasCurrentStudent) {
              setSelectedStudentId(data[0].id)
            }
            setIsNotGVCN(false)
          } else {
            setSelectedStudentId("")
            const gvcnCheckRes = await fetch("/api/teacher-student-records?action=checkGVCN")
            if (gvcnCheckRes.ok) {
              const gvcnData = await gvcnCheckRes.json()
              if (gvcnData.isGVCN) {
                setIsNotGVCN(false)
              } else {
                setIsNotGVCN(true)
                setApiError("checkGVCN returned isGVCN: false")
              }
            } else {
              setIsNotGVCN(true)
              const errData = await gvcnCheckRes.json().catch(() => ({}))
              setApiError(`checkGVCN failed with status ${gvcnCheckRes.status}: ${errData.error || "Unknown"}`)
            }
          }
        } else {
          setIsNotGVCN(true)
          const errData = await res.json().catch(() => ({}))
          setApiError(`getHomeroomStudents failed with status ${res.status}: ${errData.error || "Unknown"}`)
        }
      } catch (err) {
        console.error("Error loading homeroom students:", err)
        setIsNotGVCN(true)
      } finally {
        setLoadingStudents(false)
      }
    }
    loadHomeroomStudents()
  }, [yearId])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/teacher-student-records?action=uploadAvatar&studentId=${selectedStudentId}`, {
        method: "POST",
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setAvatarUrl(data.url)
        }
      }
    } catch (err) {
      console.error("Error uploading avatar:", err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostText.trim()) return

    try {
      setPostingAnnouncement(true)
      const res = await fetch("/api/teacher-student-records?action=saveHighlightComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          comment: newPostText,
          category: "ANNOUNCEMENT"
        })
      })

      if (res.ok) {
        setNewPostText("")
        // Refresh profile data
        const profileRes = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}&_t=${Date.now()}`)
        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfileData(data)
        }
      }
    } catch (err) {
      console.error("Error creating post:", err)
    } finally {
      setPostingAnnouncement(false)
    }
  }

  const handleCreateCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    try {
      setPostingComment(true)
      const res = await fetch("/api/teacher-student-records?action=saveHighlightComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          comment: newCommentText,
          category: commentCategory
        })
      })

      if (res.ok) {
        setNewCommentText("")
        // Refresh profile data
        const profileRes = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}&_t=${Date.now()}`)
        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfileData(data)
        }
      }
    } catch (err) {
      console.error("Error creating comment:", err)
    } finally {
      setPostingComment(false)
    }
  }

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

  useEffect(() => {
    setEntranceSubTab("results");
  }, [selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      setProfileData(null)
      setAvatarUrl("")
      return
    }
    setAvatarUrl(`/uploads/students/${selectedStudentId}.jpg?t=${Date.now()}`)

    async function loadProfile() {
      const activeStudent = students.find(s => s.id === selectedStudentId)
      setSelectedStudent(activeStudent)
      try {
        setLoadingProfile(true)
        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}&_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          if (data && !data.error) {
            setProfileData(data)
          } else {
            setProfileData({
              student: activeStudent || null,
              achievements: [],
              orientation: null,
              projects: [],
              experientialActivities: [],
              commitment: null,
              highlightComments: [],
              entranceSurvey: null,
              transfers: [],
              learningSupportTargets: []
            })
          }
        } else {
          setProfileData({
            student: activeStudent || null,
            achievements: [],
            orientation: null,
            projects: [],
            experientialActivities: [],
            commitment: null,
            highlightComments: [],
            entranceSurvey: null,
            transfers: [],
            learningSupportTargets: []
          })
        }
      } catch (err) {
        console.error("Error loading student profile:", err)
        setProfileData({
          student: activeStudent || null,
          achievements: [],
          orientation: null,
          projects: [],
          experientialActivities: [],
          commitment: null,
          highlightComments: [],
          entranceSurvey: null,
          transfers: [],
          learningSupportTargets: []
        })
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [selectedStudentId, students, yearId])

  // Filter students based on search query
  const filteredStudents = students.filter(s => 
    ((s?.studentName || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
    ((s?.studentCode || "").toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (isNotGVCN) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-xl mx-auto mt-20 text-center">
        <h3 className="font-extrabold text-base mb-2">Quyền truy cập hạn chế</h3>
        <p className="text-xs font-semibold mb-2">Trang này chỉ dành riêng cho Giáo viên Chủ nhiệm (GVCN). Bạn không có lớp chủ nhiệm nào được chỉ định trong năm học này.</p>
        {apiError && (
          <p className="text-[10px] text-red-500 font-mono mt-2 bg-white/50 p-2 rounded border border-red-100">
            Debug Info: {apiError}
          </p>
        )}
      </div>
    )
  }

  if (loadingStudents) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#48BFE3] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải danh sách học sinh lớp chủ nhiệm...</p>
      </div>
    )
  }

    const tabs = [
    { id: "advisory_360", label: "Cố vấn & Mục tiêu 360°", icon: Compass },
    { id: "cv", label: "Xem chi tiết HSHS", icon: User },
    { id: "academic", label: "Kết quả Học tập (MOET)", icon: FileText },
    { id: "entrance", label: "Khảo sát đầu vào", icon: ClipboardCheck },
    { id: "achievements", label: "Thành tích", icon: Award },
    { id: "orientation", label: "Hướng nghiệp", icon: Compass },
    { id: "projects", label: "Hoạt động trải nghiệm", icon: BookOpen },
    { id: "comments", label: "Nhận xét nổi bật", icon: MessageSquare },
    { id: "support", label: "Hỗ trợ học tập", icon: GraduationCap }
  ]

  // Helper to compute badge count and data availability for tab tags
  const getTabBadgeInfo = (tabId: string) => {
    if (!profileData) return { hasData: false, count: 0 }

    switch (tabId) {
      case "academic": {
        const rawScores = selectedStudent?.termScores || selectedStudent?.student?.termScores || profileData?.student?.termScores || []
        const rawSummaries = selectedStudent?.termSummaries || selectedStudent?.student?.termSummaries || profileData?.student?.termSummaries || []
        const count = rawScores.length || rawSummaries.length
        return { hasData: count > 0, count }
      }
      case "entrance": {
        const survey = profileData.entranceSurvey
        if (!survey) return { hasData: false, count: 0 }
        const count = Array.isArray(survey.scores) && survey.scores.length > 0 ? survey.scores.length : 1
        return { hasData: true, count }
      }
      case "achievements": {
        const count = profileData.achievements?.length || 0
        return { hasData: count > 0, count }
      }
      case "orientation": {
        const hasOrientation = !!(profileData.orientation?.result || profileData.orientation?.notes)
        return { hasData: hasOrientation, count: hasOrientation ? 1 : 0 }
      }
      case "projects": {
        const expCount = profileData.experientialActivities?.length || 0
        const projCount = profileData.projects?.length || 0
        const count = expCount + projCount
        return { hasData: count > 0, count }
      }
      case "comments": {
        const comments = profileData.highlightComments?.filter((c: any) => c.category !== "ANNOUNCEMENT") || []
        const count = comments.length
        return { hasData: count > 0, count }
      }
      case "support": {
        const targets = (profileData as any).learningSupportTargets || []
        const count = targets.length
        return { hasData: count > 0, count }
      }
      default:
        return { hasData: false, count: 0 }
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Dynamic Print CSS Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          /* Hide all shell menus and UI panels except A4 profile container */
          .no-print, header, footer, nav, aside, .sidebar, 
          #sidebar-container, [role="navigation"],
          .md\\:col-span-1, .header-bar, .bg-white\\/30, button, input, select, form {
            display: none !important;
          }
          /* Reset container margins for print */
          .max-w-6xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .md\\:grid-cols-4 {
            display: block !important;
          }
          .md\\:col-span-3 {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* CV Page layout force on print */
          .print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          /* Ensure columns print as grid */
          .print-grid {
            display: grid !important;
            grid-template-columns: 32% 68% !important;
            gap: 1.5rem !important;
          }
          .print-left-col {
            grid-column: span 1 / span 1 !important;
            border-right: 1px solid #E2E8F0 !important;
            padding-right: 1.5rem !important;
          }
          .print-right-col {
            grid-column: span 1 / span 1 !important;
            padding-left: 1.5rem !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.2cm;
          }
        }
      ` }} />

      {/* Header Bar */}
      <div className="header-bar bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px] no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#48BFE3] rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-805 tracking-tight leading-tight truncate">Hồ sơ Học sinh</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Theo dõi toàn diện thông tin học sinh lớp chủ nhiệm từ khảo sát đầu vào đến thành tích rèn luyện</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left column: Student list selection */}
        <div className="md:col-span-1 space-y-4 no-print">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Học sinh Lớp chủ nhiệm</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3] focus:border-[#48BFE3] transition-all"
                />
              </div>
              {students.length > 0 && (
                <button
                  onClick={() => window.open(`/teacher/ho-so-hoc-sinh/print?type=class&classId=${students[0]?.classId || selectedStudent?.classId}&academicYearId=${yearId}`, "_blank")}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-[#48BFE3] hover:bg-[#009085] text-white py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer border border-[#48BFE3]/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>In HSHS Cả lớp</span>
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <div className="text-[11px] text-slate-400 font-semibold italic text-center py-6">
                  {searchQuery ? "Không tìm thấy học sinh phù hợp." : "Lớp chủ nhiệm chưa có học sinh nào."}
                </div>
              ) : (
                filteredStudents.map(s => {
                  const isSelected = selectedStudentId === s.id;
                  const initials = s.studentName ? s.studentName.split(" ").pop()?.substring(0, 2).toUpperCase() : "HS";
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`group relative w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer border ${
                        isSelected
                          ? "bg-gradient-to-r from-[#48BFE3]/12 to-[#48BFE3]/4 text-[#48BFE3] border-[#48BFE3]/20 shadow-xs translate-x-1"
                          : "bg-white hover:bg-slate-50/80 border-slate-100 text-slate-655"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#48BFE3] rounded-r-md" />
                      )}
                      
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#48BFE3] text-white"
                          : s.isEntranceAdmitted
                            ? "bg-sky-100 text-sky-700 border border-sky-200"
                            : "bg-slate-100 text-slate-500"
                      }`}>
                        {initials}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className={`truncate text-xs font-black transition-colors ${isSelected ? "text-slate-900" : "text-slate-800 group-hover:text-slate-900"}`}>
                          {s.studentName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] opacity-60 font-semibold">{s.studentCode}</span>
                          <span className="text-[9px] opacity-40 font-bold">•</span>
                          <span className="text-[9px] opacity-60 font-bold truncate">{s.className || "Lớp chủ nhiệm"}</span>
                        </div>
                      </div>

                      {s.isEntranceAdmitted && !isSelected && (
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0">
                          KS
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right workspace: tabs & details */}
        <div className="md:col-span-3 space-y-6">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Profile header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-155 flex items-center gap-5 no-print relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#48BFE3]/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
                <div className="relative group w-16 h-16 rounded-full overflow-hidden bg-teal-50 border-2 border-[#48BFE3]/40 flex items-center justify-center text-[#48BFE3] cursor-pointer shadow-md transition-all hover:scale-105">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover animate-in fade-in duration-300" onError={() => setAvatarUrl("")} />
                  ) : (
                    <User className="w-8 h-8" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 text-white text-[8px] font-black uppercase flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-4 h-4 mb-0.5" />
                    Tải ảnh
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-lg text-slate-805 tracking-tight leading-tight">{selectedStudent?.studentName}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-bold">
                    <span>Mã HS: <span className="text-slate-700 font-extrabold">{selectedStudent?.studentCode}</span></span>
                    <span>Ngày sinh: <span className="text-slate-700 font-extrabold">{selectedStudent?.dateOfBirth ? safeFormatDate(selectedStudent.dateOfBirth) : 'N/A'}</span></span>
                    <span>Giới tính: <span className="text-slate-700 font-extrabold">{selectedStudent?.gender || 'N/A'}</span></span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50 px-2 pt-2 gap-1 overflow-x-auto no-print">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-[#48BFE3] border-[#48BFE3] border-x-slate-200 shadow-xs"
                          : "text-slate-500 border-transparent hover:text-slate-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content area */}
              <div className="p-6 flex-grow">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-10 h-10 text-[#48BFE3] animate-spin opacity-50" />
                    <p className="text-slate-400 text-xs font-bold">Đang tải chi tiết hồ sơ...</p>
                  </div>
                ) : profileData ? (
                  <div>
                    {/* TAB: CV INTERGRATED (NEW STANDARD) */}
                    {/* TAB: CV INTEGRATED - MOET VĂN HÓA & REAL DATA */}
                    {activeTab === "cv" && (() => {
                      const student = profileData;
                      const rawScores = student?.termScores || student?.student?.termScores || [];
                      const rawSummaries = student?.termSummaries || student?.student?.termSummaries || [];

                      const teacherDisplayName = 
                        student?.homeroomTeacherName || 
                        student?.class?.homeroomTeacherName || 
                        student?.student?.homeroomTeacherName || 
                        student?.highlightComments?.[0]?.teacherName || 
                        student?.class?.teachers?.[0]?.teacher?.teacherName || 
                        student?.class?.teachers?.[0]?.teacher?.fullName || 
                        "Chưa phân công";

                      // Subject score mapping
                      const subjectMap = new Map();
                      rawScores.forEach((sc: any) => {
                        const subName = sc.subject?.name || sc.subjectName || sc.subjectCode || "Môn học";
                        if (!subjectMap.has(subName)) {
                          subjectMap.set(subName, sc);
                        }
                      });
                      const subjectList = Array.from(subjectMap.entries());

                      const achievementsList = student?.achievements || [];
                      const expList = student?.experientialActivities || [];
                      const projList = student?.projectExperiences || student?.projects || [];
                      const commitmentText = student?.commitment?.commitment || student?.commitmentContent || student?.orientation;
                      const supportTargets = student?.learningSupportTargets || [];

                      const rawComments = student?.highlightComments || student?.student?.highlightComments || [];
                      const gvcnComments = rawComments.filter((c: any) => c.category !== "ANNOUNCEMENT");

                      return (
                        <div className="space-y-6">
                          <div className="bg-white border border-slate-200/90 shadow-xl rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto font-sans relative overflow-hidden space-y-7">
                            {/* TOP DECORATIVE BANNER */}
                            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#003B3A] via-[#007A72] to-[#48BFE3]" />

                            {/* SECTION 1: HEADER & ADMINISTRATIVE INFO */}
                            <div className="border-b-2 border-slate-100 pb-5 pt-2">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#007A72] flex items-center justify-center text-white shadow-md">
                                    <GraduationCap className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <div className="font-black text-[11px] tracking-widest text-[#007A72] uppercase">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-850 uppercase tracking-tight">HỒ SƠ NĂNG LỰC HỌC SINH</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Comprehensive Profile &amp; Portfolio</p>
                                  </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl text-right text-xs font-semibold text-slate-600 self-start sm:self-auto shadow-2xs">
                                  <div>Năm học: <span className="text-[#007A72] font-black">{student?.yearName || "—"}</span></div>
                                  <div>Cơ sở: <span className="text-slate-800 font-bold">{student?.campusName || "Sky-Line"}</span></div>
                                </div>
                              </div>

                              {/* PROFILE CARD: AVATAR, INFO & GVCN */}
                              <div className="bg-gradient-to-br from-slate-50/80 to-teal-50/20 border border-teal-100/80 rounded-2xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-4 gap-5 items-center">
                                <div className="md:col-span-1 text-center flex flex-col items-center justify-center space-y-2">
                                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white flex items-center justify-center text-teal-700 relative">
                                    <User className="w-12 h-12" />
                                  </div>
                                  <span className="inline-block px-3 py-1 bg-[#007A72]/10 border border-[#007A72]/20 text-[#007A72] font-black text-[11px] rounded-full uppercase tracking-wider">
                                    Lớp {student?.className || "—"}
                                  </span>
                                </div>

                                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Họ và tên học sinh</span>
                                      <span className="text-base font-black text-slate-900">{student?.studentName || "—"}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Mã học sinh</span>
                                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">{student?.studentCode || "—"}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Ngày sinh</span>
                                        <span className="font-bold text-slate-800">{student?.dob || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Giới tính</span>
                                        <span className="font-bold text-slate-800">{student?.gender || "—"}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Giáo viên chủ nhiệm (GVCN)</span>
                                      <span className="font-black text-[#007A72] flex items-center gap-1.5 text-xs mt-0.5">
                                        <User className="w-3.5 h-3.5" />
                                        {teacherDisplayName}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SECTION 2: KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2 h-2 rounded-full bg-[#007A72]" />
                                <ClipboardCheck className="w-4 h-4 text-[#007A72]" />
                                2. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)
                              </h3>
                              {subjectList.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center text-xs text-slate-400 italic">
                                  Chưa có ghi nhận điểm số môn học MOET trong hệ thống.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                                        <tr>
                                          <th className="py-2.5 px-3">Môn học MOET</th>
                                          <th className="py-2.5 px-3 text-center">Học kỳ I</th>
                                          <th className="py-2.5 px-3 text-center">Học kỳ II</th>
                                          <th className="py-2.5 px-3 text-center">Cả năm</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                        {subjectList.map(([subName, sc]: [string, any], idx: number) => {
                                          const displayScore = sc.finalScore ?? sc.score ?? sc.midTermScore ?? sc.scoreStr ?? "—";
                                          return (
                                            <tr key={idx} className="hover:bg-teal-50/20">
                                              <td className="py-2 px-3 font-bold text-[#007A72]">{subName}</td>
                                              <td className="py-2 px-3 text-center font-bold">{sc.hk1 ?? displayScore}</td>
                                              <td className="py-2 px-3 text-center font-bold">{sc.hk2 ?? "—"}</td>
                                              <td className="py-2 px-3 text-center font-black text-slate-900">{sc.cn ?? displayScore}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {rawSummaries.length > 0 &amp;&amp; (
                                    <div className="flex flex-wrap gap-4 text-xs font-semibold bg-teal-50/30 p-3.5 rounded-2xl border border-teal-100 text-slate-700">
                                      {rawSummaries.map((sum: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <span className="font-black text-[#007A72] uppercase text-[11px]">{sum.term || `Học kỳ ${idx+1}`}:</span>
                                          <span>Xếp loại Học lực: <strong className="text-slate-900 font-black">{sum.academicRank || sum.academicScore || "—"}</strong></span>
                                          <span>| Rèn luyện / Hạnh kiểm: <strong className="text-slate-900 font-black">{sum.conductRank || "—"}</strong></span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* SECTION 3: THÀNH TÍCH & KHEN THƯỞNG NỔI BẬT */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <Award className="w-4 h-4 text-amber-500" />
                                3. THÀNH TÍCH &amp; KHEN THƯỞNG NỔI BẬT
                              </h3>
                              {achievementsList.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center text-xs text-slate-400 italic">
                                  Chưa có ghi nhận giải thưởng hoặc khen thưởng trong hệ thống.
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
                                      {achievementsList.map((item: any, idx: number) => {
                                        const ach = item.achievement || item;
                                        const achName = ach.name || "Giải thưởng";
                                        const catName = getCategoryLabel(ach.category || ach.examCategoryName);
                                        const levelName = getLevelLabel(ach.level);
                                        return (
                                          <tr key={idx} className="hover:bg-amber-50/20">
                                            <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">{achName}</td>
                                            <td className="py-2.5 px-3 text-[10px] font-black text-[#007A72] uppercase">{catName}</td>
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

                            {/* SECTION 4: HOẠT ĐỘNG TRẢI NGHIỆM */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2 h-2 rounded-full bg-sky-500" />
                                <BookOpen className="w-4 h-4 text-sky-500" />
                                4. HOẠT ĐỘNG TRẢI NGHIỆM &amp; DỰ ÁN THỰC TẾ
                              </h3>
                              {expList.length === 0 &amp;&amp; projList.length === 0 ? (
                                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center text-xs text-slate-400 italic">
                                  Chưa có ghi nhận hoạt động trải nghiệm hoặc dự án trong hệ thống.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {expList.map((act: any, idx: number) => (
                                    <div key={idx} className="bg-sky-50/30 border border-sky-100 p-3 rounded-xl flex items-start gap-2.5">
                                      <Sparkles className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                                      <div className="text-xs font-semibold space-y-0.5">
                                        <h5 className="font-bold text-slate-800">{act.activityName}</h5>
                                        <div className="text-[10px] text-slate-500">
                                          Vai trò: <span className="font-bold text-slate-700">{act.role || "—"}</span> | Đánh giá: <span className="font-bold text-teal-700">{act.evalLevel || "—"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {projList.map((p: any, idx: number) => (
                                    <div key={idx} className="bg-sky-50/30 border border-sky-100 p-3 rounded-xl flex items-start gap-2.5">
                                      <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                                      <div className="text-xs font-semibold space-y-0.5">
                                        <h5 className="font-bold text-slate-800">{p.projectName}</h5>
                                        <div className="text-[10px] text-slate-500">
                                          Vai trò: <span className="font-bold text-slate-700">{p.role || "—"}</span> | Kết quả: <span className="font-bold text-indigo-700">{p.result || "—"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* SECTION 5: MỤC TIÊU HỌC TẬP (PHIẾU CỐ VẤN HỌC TẬP) */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <Compass className="w-4 h-4 text-indigo-500" />
                                5. MỤC TIÊU HỌC TẬP (PHIẾU CỐ VẤN HỌC TẬP)
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-indigo-50/30 border border-indigo-100 p-4 rounded-2xl space-y-2">
                                  <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Mục tiêu cá nhân (Cố vấn Học tập)</h4>
                                  {commitmentText ? (
                                    <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                                      "{commitmentText}"
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">Chưa thiết lập mục tiêu cá nhân trong Phiếu Cố vấn.</p>
                                  )}
                                </div>
                                <div className="bg-teal-50/30 border border-teal-100 p-4 rounded-2xl space-y-2">
                                  <h4 className="text-[11px] font-black text-[#007A72] uppercase tracking-wider">Đánh giá Năng lực Cố vấn</h4>
                                  {supportTargets.length > 0 ? (
                                    <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                                      {supportTargets.map((st: any, idx: number) => (
                                        <div key={idx} className="flex justify-between border-b border-teal-100/60 pb-1">
                                          <span className="truncate">{st.targetName || st.supportReason || "Mục tiêu hỗ trợ"}:</span>
                                          <span className="font-black text-[#007A72] flex-shrink-0 ml-2">{st.status || "—"}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-400 italic py-2">
                                      Chưa có ghi nhận đánh giá năng lực cố vấn.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SECTION 6: NHẬN XẾT NỔI BẬT TỪ GIÁO VIÊN CHỦ NHIỆM */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                6. NHẬN XẾT NỔI BẬT TỪ GIÁO VIÊN CHỦ NHIỆM
                              </h3>
                              {gvcnComments.length === 0 ? (
                                <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl text-xs font-medium text-slate-400 italic text-center">
                                  Chưa có nhận xét nổi bật định kỳ nào từ giáo viên chủ nhiệm.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {gvcnComments.map((c: any, idx: number) => (
                                    <div key={c.id || idx} className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl space-y-2 text-xs font-medium text-slate-700">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-emerald-100 pb-1.5">
                                        <span>Ghi nhận từ GVCN ({c.teacherName || teacherDisplayName}):</span>
                                        <span className="font-mono text-emerald-700 text-[10px]">
                                          {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('vi-VN') : (student?.yearName || "—")}
                                        </span>
                                      </div>
                                      <p className="italic leading-relaxed text-slate-800 pt-1">
                                        "{c.comment || c.content}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {activeTab === "academic" && (() => {
                      const rawScores = selectedStudent?.termScores || selectedStudent?.student?.termScores || profileData?.student?.termScores || []
                      const rawSummaries = selectedStudent?.termSummaries || selectedStudent?.student?.termSummaries || profileData?.student?.termSummaries || []
                      
                      const classCodeStr = String(selectedStudent?.class?.classCode || "")
                      const classGradeStr = String(selectedStudent?.class?.grade || "")
                      
                      const isPrimary = selectedStudent?.class?.level === "PRESCHOOL" ||
                                        selectedStudent?.class?.level === "preschool" ||
                                        selectedStudent?.class?.level === "PRIMARY" || 
                                        selectedStudent?.class?.level === "Tieu hoc" || 
                                        ["1", "2", "3", "4", "5"].includes(classGradeStr) ||
                                        ["1", "2", "3", "4", "5"].some(g => classCodeStr.startsWith(g + "."))

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
                        const subName = ts.subject?.subjectName || "Môn học"
                        const subCode = ts.subject?.subjectCode || ""
                        const hasScore = ts.score !== null && ts.score !== undefined
                        const hasGrade = ts.evaluationGrade !== null && ts.evaluationGrade !== undefined && String(ts.evaluationGrade).trim() !== "" && ts.evaluationGrade !== "—"
                        const displayVal = (hasScore && hasGrade) ? { score: ts.score, grade: ts.evaluationGrade } : (hasScore ? ts.score : (ts.evaluationGrade || "—"))

                        // Extract Primary KQGD if applicable
                        if (displayVal && displayVal !== "—") {
                          const isHit = isCheckSymbol(displayVal) || String(displayVal).trim() === "T" || String(displayVal).trim() === "1"
                          if (isHit) {
                            let levelName = ""
                            const normN = subName.trim().toLowerCase()
                            const normC = subCode.trim().toUpperCase()
                            if (normC === "HOAN_THANH_XUAT_SAC" || normN.includes("xuất sắc")) {
                              levelName = "Hoàn thành xuất sắc"
                            } else if (normC === "HOAN_THANH_TOT" || normN.includes("hoàn thành tốt")) {
                              levelName = "Hoàn thành tốt"
                            } else if (normC === "HOAN_THANH" || normN === "hoàn thành") {
                              levelName = "Hoàn thành"
                            } else if (normC === "CHUA_HOAN_THANH" || normN.includes("chưa hoàn thành")) {
                              levelName = "Chưa hoàn thành"
                            }

                            if (levelName) {
                              if (ts.semester === "CN") primaryKqgdCN = levelName
                              else if (ts.semester === "HK2") primaryKqgdHK2 = levelName
                              else if (ts.semester === "HK1") primaryKqgdHK1 = levelName
                            }
                          }
                        }

                        const key = ts.subjectId || subName
                        if (!subjectMap.has(key)) {
                          subjectMap.set(key, { id: key, name: subName, code: subCode, hk1: null, hk2: null, cn: null })
                        }
                        const item = subjectMap.get(key)
                        if (ts.semester === "HK1") item.hk1 = displayVal
                        else if (ts.semester === "HK2") item.hk2 = displayVal
                        else if (ts.semester === "CN") item.cn = displayVal
                      })

                      const subjectRows = Array.from(subjectMap.values())
                        .filter((row: any) => !isKqgdSubject(row.code, row.name))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name, "vi"))

                      const summariesMap: Record<string, any> = {}
                      rawSummaries.forEach((s: any) => {
                        if (s.semester) summariesMap[s.semester] = s
                      })

                      const hk1Summary = summariesMap["HK1"]
                      const hk2Summary = summariesMap["HK2"]
                      const cnSummary = summariesMap["CN"]

                      const finalKqgdHK1 = primaryKqgdHK1 || hk1Summary?.academicRating
                      const finalKqgdHK2 = primaryKqgdHK2 || hk2Summary?.academicRating
                      const finalKqgdCN = primaryKqgdCN || cnSummary?.academicRating || primaryKqgdHK2 || primaryKqgdHK1

                      const hasData = subjectRows.length > 0 || rawSummaries.length > 0 || !!finalKqgdCN

                      const formatScoreBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        const str = String(val).trim()
                        if (isCheckSymbol(str)) {
                          return <span className="inline-flex items-center justify-center bg-teal-50 text-[#48BFE3] border border-teal-200 px-2 py-0.5 rounded-lg font-black text-xs shadow-2xs">✓</span>
                        }
                        if (str === "T" || str === "Tốt") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T (Tốt)</span>
                        }
                        if (str === "H" || str === "Hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">H (Hoàn thành)</span>
                        }
                        if (str === "C" || str === "Chưa hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">C (Chưa HT)</span>
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

                      return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#48BFE3]" />
                                Kết quả Học tập Văn hóa (MOET)
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Bảng điểm môn học &amp; Đánh giá xếp loại tổng kết định kỳ</p>
                            </div>
                            <span className="bg-teal-50 text-[#48BFE3] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Năm học: {selectedStudent?.yearName || "2025-2026"}
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
                                  <GraduationCap className="w-4 h-4 text-[#48BFE3]" />
                                  Tổng kết Đánh giá &amp; Xếp loại Học tập
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* HK1 Card */}
                                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Học kỳ 1</span>
                                      <span className="text-[9px] font-extrabold text-[#48BFE3] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">HK1</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="flex justify-between items-center">
                                          <span>Đánh giá KQGD:</span>
                                          <span className="font-extrabold text-[#48BFE3] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{finalKqgdHK1 || "—"}</span>
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
                                        </>
                                      )}
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
                                        <div className="flex justify-between items-center">
                                          <span>Đánh giá KQGD:</span>
                                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{finalKqgdHK2 || "—"}</span>
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
                                      <span className="text-xs font-black text-[#48BFE3] uppercase tracking-wider">Cả Năm</span>
                                      <span className="text-[9px] font-extrabold text-white bg-[#48BFE3] px-2.5 py-0.5 rounded-full shadow-2xs">CẢ NĂM</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="flex justify-between items-center">
                                          <span>Đánh giá KQGD Cả năm:</span>
                                          <span className="font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">{finalKqgdCN || "—"}</span>
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
                                      {cnSummary?.reward && (
                                        <div className="pt-1 border-t border-teal-100 text-[11px]">
                                          <span className="text-amber-600 font-black">Danh hiệu / Khen thưởng Cuối năm: </span>
                                          <span className="text-slate-800 font-black bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block mt-1 shadow-2xs">{cnSummary.reward}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                                  Bảng điểm Chi tiết Các Môn học
                                </h5>

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                        <th className="py-3 px-4 text-center w-12">STT</th>
                                        <th className="py-3 px-4">Tên Môn học</th>
                                        <th className="py-3 px-4 text-center w-28">Học kỳ 1</th>
                                        <th className="py-3 px-4 text-center w-28">Học kỳ 2</th>
                                        <th className="py-3 px-4 text-center w-28">Cả năm</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {subjectRows.map((row: any, idx: number) => (
                                        <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                                          <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                          <td className="py-3 px-4 font-bold text-slate-800">{row.name}</td>
                                          <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk1)}</td>
                                          <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk2)}</td>
                                          <td className="py-3 px-4 text-center">{formatScoreBadge(row.cn)}</td>
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
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Kết quả khảo sát đầu vào</h4>
                          {profileData?.entranceSurvey?.type && (
                            <span className="bg-teal-50 text-[#48BFE3] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Hệ {profileData.entranceSurvey.type}
                            </span>
                          )}
                        </div>

                        {profileData?.entranceSurvey ? (
                          <div className="space-y-6">
                            {/* Entrance sub-tabs navigation */}
                            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar no-print">
                              <button
                                onClick={() => setEntranceSubTab("results")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "results"
                                    ? "border-[#48BFE3] text-[#48BFE3]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                {profileData.entranceSurvey.type === "PRESCHOOL" ? "Đánh giá phát triển" : "Kết quả đánh giá"}
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("admin")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "admin"
                                    ? "border-[#48BFE3] text-[#48BFE3]"
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
                                    ? "border-[#48BFE3] text-[#48BFE3]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {profileData.entranceSurvey.type === "PRESCHOOL" ? "Học thử & Quyết định" : "Hồ sơ & Học bạ"}
                              </button>
                            </div>

                            {/* Sub-tab: results */}
                            {entranceSubTab === "results" && (
                              <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Summary Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold">
                                  <div>Cơ sở đăng ký: <span className="text-slate-805">{profileData.entranceSurvey.admissionCampus || "N/A"}</span></div>
                                  <div>Kết quả tuyển sinh: <span className="text-slate-808">{profileData.entranceSurvey.admissionResult || "Chưa xác định"}</span></div>
                                </div>

                                {profileData.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="space-y-4">
                                    <h5 className="text-xs font-black text-slate-700">Đánh giá Phát triển Mầm non:</h5>
                                    <div className="space-y-2 text-xs font-semibold">
                                      <div>Kết quả chung: <span className="font-bold text-slate-700">{profileData.entranceSurvey.devAssessmentResult || "N/A"}</span></div>
                                      <div>Lưu ý quan trọng: <span className="font-bold text-slate-700">{profileData.entranceSurvey.devImportantNote || "Không có"}</span></div>
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
                                          {profileData.entranceSurvey.scores?.length > 0 ? (
                                            profileData.entranceSurvey.scores.map((sc: any, idx: number) => (
                                              <tr key={idx} className="font-semibold text-slate-700">
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
                                  const survey = profileData.entranceSurvey
                                  let mathVal: any = survey?.mathScore
                                  let litVal: any = survey?.literatureScore
                                  let writtenVal: any = survey?.writtenEnglishScore
                                  let oralVal: any = survey?.oralEnglishScore
                                  let psychVal: any = survey?.psychologyScore
                                  let oralComment = ""
                                  let psychConclusion = ""
                                  ;(survey?.scores || []).forEach((sc: any) => {
                                    const sName = (sc.subjectName || "").toLowerCase().normalize("NFC")
                                    const scoresArr: any[] = Array.isArray(sc.scores) ? sc.scores : []
                                    const scoreVal = scoresArr.find((x: any) => x !== undefined && x !== null && x !== "")
                                    const commentsArr: any[] = Array.isArray(sc.comments) ? sc.comments : []
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
                                  const isGrade1 = (() => { const m = String(survey?.className || survey?.grade || "").match(/\d+/); return m ? parseInt(m[0]) === 1 : false })()
                                  const writtenDisplay = writtenVal !== null && writtenVal !== undefined ? (isGrade1 ? `${writtenVal}` : `${writtenVal}/70`) : "—"
                                  const oralDisplay = oralVal !== null && oralVal !== undefined ? (isGrade1 ? `${oralVal}` : `${oralVal}/30`) : "—"
                                  const wNum = parseFloat(writtenVal), oNum = parseFloat(oralVal)
                                  const totalEnglish = (!isGrade1 && (!isNaN(wNum) || !isNaN(oNum))) ? (isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum) : null
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
                                    <div className="space-y-4">
                                      <h5 className="text-xs font-black text-slate-700">Điểm số các môn khảo sát:</h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-[#48BFE3]/5 border border-[#48BFE3]/20 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-[#48BFE3] font-bold uppercase tracking-wider">Toán</div>
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
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 70"}</div>
                                        </div>
                                        <div className="bg-sky-50/20 border border-sky-100/60 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-655 font-bold uppercase tracking-wider">Anh nói</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{oralDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 30"}</div>
                                        </div>
                                      </div>
                                      {totalEnglish !== null && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-3 rounded-xl border border-indigo-100 text-center">
                                          <span className="text-xs text-indigo-655 font-black uppercase tracking-wider">Tổng điểm Tiếng Anh: </span>
                                          <span className="text-sm font-extrabold text-indigo-700">{totalEnglish}/100</span>
                                        </div>
                                      )}
                                      {oralComment && (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-1">Nhận xét Tiếng Anh Nói</div>
                                          <p className="text-xs text-slate-655 font-semibold leading-relaxed italic">"{oralComment}"</p>
                                        </div>
                                      )}
                                      <div className={`text-xs font-semibold space-y-1 p-3 rounded-xl border ${psychClass}`}>
                                        <div className="flex items-center gap-2">
                                          <span>• Đánh giá tâm lý:</span>
                                          <span className="font-extrabold">{psychVal !== null && psychVal !== undefined ? psychVal : "Chưa có"}</span>
                                          {psychLabel && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${psychClass}`}>{psychLabel}</span>}
                                        </div>
                                        {psychConclusion && <div className="pl-3 italic opacity-80">→ {psychConclusion}</div>}
                                        <div>• Kết quả học tập cấp trước: <span className="font-extrabold text-slate-800">{survey?.kqHocTap ?? "—"}</span></div>
                                        <div>• Kết quả rèn luyện cấp trước: <span className="font-extrabold text-slate-800">{survey?.kqRenLuyen ?? "—"}</span></div>
                                      </div>

                                      {/* Committed Subjects & Approval Details */}
                                      {(survey?.directorNote || survey?.admissionResult === "Đạt cam kết" || survey?.admissionResult === "Đạt - Cam kết") && (() => {
                                        const parseCommittedSubjects = (note: string) => {
                                          if (!note) return []
                                          const match = note.match(/(?:Môn cam kết|Mon cam ket):\s*\[([^\]]+)\]/i)
                                          if (match && match[1]) {
                                            return match[1].split(',').map((s: string) => s.trim())
                                          }
                                          return []
                                        }
                                        const committedSubjects = parseCommittedSubjects(survey.directorNote || "")
                                        return (
                                          <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl space-y-3">
                                            <div className="flex items-center gap-2 border-b border-amber-200/30 pb-2">
                                              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Chi tiết xét duyệt & Cam kết</span>
                                            </div>
                                            {committedSubjects.length > 0 && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Môn cam kết:</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {committedSubjects.map((sub: string, idx: number) => (
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in duration-200 text-xs font-semibold">
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.period?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.batch?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.isPreschool ? (profileData.entranceSurvey.grade || "-") : (profileData.entranceSurvey.className || "-")}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.surveySystem || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.admissionCampus || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.admissionCriteria || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.gender || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.dateOfBirth ? safeFormatDate(profileData.entranceSurvey.dateOfBirth, "vi-VN", "-") : "-"}</span>
                                </div>
                              </div>
                            )}

                            {/* Sub-tab: academic */}
                            {entranceSubTab === "academic" && (
                              <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                                {profileData.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                                      <span className="text-xs font-black text-slate-755 mt-1 block">{profileData.entranceSurvey.probationaryResult || "Chưa có kết quả"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhận xét chi tiết của giáo viên học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{profileData.entranceSurvey.probationaryComment || "Chưa có nhận xét"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryPeriod || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryClass || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryTeacher || "-"}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{profileData.entranceSurvey.kqgdTieuHoc || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học tập</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.kqHocTap || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả rèn luyện</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.kqRenLuyen || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ / Bảng điểm khác</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed">{profileData.entranceSurvey.hoSoCtQuocTe || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học kỳ / Năm tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.hocKy || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.targetType || "-"}</span>
                                    </div>

                                    {profileData.entranceSurvey.oldSchoolName && (
                                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trường học cũ & Địa chỉ</label>
                                        <div className="text-xs font-semibold text-slate-700 mt-1.5 space-y-1.5">
                                          <div><span className="text-slate-400">Tên trường cũ:</span> {profileData.entranceSurvey.oldSchoolName} ({profileData.entranceSurvey.oldSchoolType})</div>
                                          {profileData.entranceSurvey.targetType === "Nội tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {profileData.entranceSurvey.wardName} - {profileData.entranceSurvey.cityName || "TP Đà Nẵng"}</div>
                                          )}
                                          {profileData.entranceSurvey.targetType === "Ngoại tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {profileData.entranceSurvey.wardName} - {profileData.entranceSurvey.cityName}</div>
                                          )}
                                          {profileData.entranceSurvey.targetType === "Nước ngoài" && (
                                            <div><span className="text-slate-400">Quốc gia:</span> {profileData.entranceSurvey.countryName}</div>
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
                          {profileData?.transfers && profileData.transfers.length > 0 ? (
                            <div className="space-y-3">
                              {profileData.transfers.map(tr => (
                                <div key={tr.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-xs font-semibold text-slate-705 shadow-2xs">
                                  <div className="font-black text-slate-800">Học sinh Chuyển đến / Chuyển đi: {tr.type === "IN" ? "Chuyển đến" : tr.type === "OUT" ? "Chuyển đi" : "Chuyển lớp"}</div>
                                  <div className="mt-1">Ngày thực hiện: {safeFormatDate(tr.transferDate)}</div>
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

                    {/* TAB: ACHIEVEMENTS */}
                    {activeTab === "achievements" && (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Thành tích &amp; Khen thưởng của Học sinh</h4>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Danh sách các giải thưởng, huy chương &amp; chứng nhận học sinh đã đạt được</p>
                          </div>
                          {profileData?.achievements && profileData.achievements.length > 0 && (
                            <span className="text-xs font-black bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/20 px-3 py-1 rounded-full uppercase self-start sm:self-auto">
                              {profileData.achievements.length} giải thưởng
                            </span>
                          )}
                        </div>

                        {!profileData?.achievements || profileData.achievements.length === 0 ? (
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
                                  {profileData.achievements.map((item: any, idx: number) => {
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
                                              'bg-[#00A99D]/10 text-[#00A99D]'
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

                    {/* TAB: ORIENTATION */}
                    {activeTab === "orientation" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Định hướng Nghề nghiệp & Hướng nghiệp</h4>
                        {profileData?.orientation ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                            <div className="flex items-center gap-3 bg-teal-50/30 border border-teal-100 p-3.5 rounded-xl">
                              <Compass className="w-5 h-5 text-[#48BFE3]" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Định hướng nhóm ngành chủ đạo</div>
                                <div className="text-sm font-black text-slate-805 mt-0.5">{profileData.orientation.result}</div>
                              </div>
                            </div>
                            {profileData.orientation.notes && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chi tiết nhận xét & Đánh giá của GVBM</div>
                                <p className="text-xs text-slate-655 font-semibold leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 italic shadow-2xs">
                                  "{profileData.orientation.notes}"
                                </p>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 font-bold pt-1 text-right">
                              Đánh giá bởi: {profileData.orientation.teacherName} (GVBM)
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa có thông tin nhận xét định hướng nghề nghiệp.</div>
                        )}
                      </div>
                    )}

                    {/* TAB: EXPERIENTIAL ACTIVITIES */}
                    {activeTab === "projects" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">HOẠT ĐỘNG TRẢI NGHIỆM</h4>
                        {(!profileData?.experientialActivities || profileData.experientialActivities.length === 0) && (!profileData?.projects || profileData.projects.length === 0) ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa tham gia hoạt động trải nghiệm nào.</div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                                  <th className="py-3.5 px-4">Tên hoạt động</th>
                                  <th className="py-3.5 px-4">Nhóm lĩnh vực</th>
                                  <th className="py-3.5 px-4 text-center">Vai trò</th>
                                  <th className="py-3.5 px-4 text-center">Mức đánh giá</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                {(profileData?.experientialActivities || []).map((act: any, idx: number) => (
                                  <tr key={act.id || idx} className="hover:bg-slate-50/80 transition-all">
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="py-3.5 px-4 font-extrabold text-slate-800">{act.activityName}</td>
                                    <td className="py-3.5 px-4">
                                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200">
                                        {act.groupName}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                        {act.role}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                        {act.evalLevel}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {(profileData?.projects || []).map((p: any, idx: number) => (
                                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-all">
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">{(profileData?.experientialActivities?.length || 0) + idx + 1}</td>
                                    <td className="py-3.5 px-4 font-extrabold text-slate-800">{p.projectName}</td>
                                    <td className="py-3.5 px-4">
                                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-slate-200">
                                        Dự án học tập
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                        {p.role || "Thành viên"}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                        {p.result || "Hoàn thành"}
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

                    {/* TAB: COMMENTS */}
                    {activeTab === "comments" && (
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex justify-between items-center">
                          <span>Nhận xét nổi bật định kỳ từ Giáo viên Chủ nhiệm</span>
                          <span className="bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            GVCN Đánh giá
                          </span>
                        </h4>

                        {/* Input form to add new comment */}
                        <form onSubmit={handleCreateCommentSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Phân loại nhận xét:</label>
                            <select
                              value={commentCategory}
                              onChange={(e) => setCommentCategory(e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3]"
                            >
                              <option value="CHUNG">Chung</option>
                              <option value="HỌC TẬP">Học tập</option>
                              <option value="RÈN LUYỆN">Rèn luyện</option>
                              <option value="ĐẠO ĐỨC">Đạo đức</option>
                            </select>
                          </div>
                          <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder={`Thêm nhận xét nổi bật mới về kết quả học tập/rèn luyện của học sinh ${selectedStudent?.studentName}...`}
                            rows={3}
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#48BFE3] focus:border-[#48BFE3] resize-none"
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={postingComment || !newCommentText.trim()}
                              className="flex items-center gap-1.5 bg-[#48BFE3] hover:bg-[#009085] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
                            >
                              {postingComment ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span>Thêm nhận xét</span>
                            </button>
                          </div>
                        </form>

                        {/* List of comments */}
                        {!profileData?.highlightComments || profileData.highlightComments.filter((c: any) => c.category !== "ANNOUNCEMENT").length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            Chưa có nhận xét nổi bật định kỳ nào từ giáo viên chủ nhiệm.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {profileData.highlightComments
                              .filter((c: any) => c.category !== "ANNOUNCEMENT")
                              .map((c: any) => (
                                <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold hover:border-slate-355 transition-all">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="inline-block px-2.5 py-0.5 bg-[#48BFE3]/15 text-[#48BFE3] text-[9px] font-black rounded-full uppercase tracking-wider shadow-2xs border border-[#48BFE3]/10">
                                      {c.category || "Chung"}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (!confirm("Bạn có chắc chắn muốn xóa nhận xét này?")) return
                                        try {
                                          const deleteRes = await fetch("/api/teacher-student-records?action=deleteHighlightComment", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ id: c.id })
                                          })
                                          if (deleteRes.ok) {
                                            // Refresh profile data
                                            const profileRes = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}&_t=${Date.now()}`)
                                            if (profileRes.ok) {
                                              const data = await profileRes.json()
                                              setProfileData(data)
                                            }
                                          }
                                        } catch (err) {
                                          console.error("Error deleting comment:", err)
                                        }
                                      }}
                                      className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-705 bg-white border border-slate-200 p-3 rounded-lg font-semibold leading-relaxed">
                                    {c.comment}
                                  </p>
                                  <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2 mt-3 flex justify-between">
                                    <span>Ghi nhận bởi: {c.teacherName} (GVCN)</span>
                                    <span>{safeFormatDate(c.updatedAt)}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: SUPPORT */}
                    {activeTab === "support" && (
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Lịch sử theo dõi Hỗ trợ Học tập & Tâm lý</h4>
                        {!(profileData as any)?.learningSupportTargets || (profileData as any).learningSupportTargets.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh không thuộc đối tượng nhận hỗ trợ học tập/tâm lý trong năm học này.</div>
                        ) : (
                          <div className="space-y-6">
                            {(profileData as any).learningSupportTargets.map((target: any) => {
                              const isTerminated = target.terminationStatus === "TERMINATED";
                              const isPending = target.terminationStatus === "PENDING_TERMINATION";
                              const gvName = target.assignments?.[0]?.teacher?.teacherName || "Chưa phân công";

                              return (
                                <div key={target.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white hover:border-slate-350 transition-all">
                                  <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-wrap gap-2">
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
                                        <span className="text-slate-800 font-bold">{safeFormatDate(target.startDate)}</span>
                                      </div>
                                      <div>
                                        <span>Giáo viên phụ trách: </span>
                                        <span className="text-slate-800 font-bold">{gvName}</span>
                                      </div>
                                      {target.endDate && (
                                        <div>
                                          <span>Ngày chấm dứt: </span>
                                          <span className="text-slate-800 font-bold">{safeFormatDate(target.endDate)}</span>
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
                                      <h5 className="font-black text-slate-700 text-xs uppercase tracking-wide mb-4">Nhật ký nhận xét định kỳ</h5>
                                      {!target.evaluations || target.evaluations.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic py-2">Chưa có nhận xét định kỳ từ giáo viên phụ trách.</div>
                                      ) : (
                                        <div className="relative border-l-2 border-[#48BFE3]/30 pl-5 space-y-5 ml-1.5">
                                          {target.evaluations.map((ev: any) => (
                                            <div key={ev.id} className="relative group">
                                              <span className="absolute -left-[27px] top-1 bg-white border-2 border-[#48BFE3] rounded-full h-3.5 w-3.5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                                <span className="h-1.5 w-1.5 bg-[#48BFE3] rounded-full"></span>
                                              </span>
                                              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 transition-all">
                                                <div className="text-[10px] text-slate-400 font-bold">
                                                  {safeFormatDate(ev.createdAt)} - {ev.periodName} ({ev.periodType === "WEEK" ? "Tuần" : "Tháng"})
                                                </div>
                                                <div className="text-xs font-black text-[#48BFE3]">Tiến bộ: {ev.trackingLevel}</div>
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
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-12">Có lỗi xảy ra khi tải thông tin chi tiết.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center no-print">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Chọn học sinh lớp chủ nhiệm ở danh sách cột bên trái để xem đầy đủ hồ sơ tích hợp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
