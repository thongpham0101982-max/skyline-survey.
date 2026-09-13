// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { 
  Users, Loader2, User, Award, Trophy, Medal, Sparkles, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, ThumbsUp, MessageCircle, Share2, Send, Globe, Camera,
  Search, Printer, Plus, Heart, Trash2, Calendar, 
  MapPin, CheckCircle, AlertTriangle, GraduationCap,
  LayoutDashboard, Copy, Check, ChevronRight, ChevronLeft, ChevronDown,
  BarChart3, Star, Target, CheckCircle2, Clock, Edit3, X, SlidersHorizontal,
  Book, ShieldCheck, HeartHandshake, Wallet, ExternalLink, School, Home, Building2
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


function CompetencyRadarChart({ data }: { data: { label: string; value: number }[] }) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 85;
  const count = data.length;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getPoint = (index: number, valNorm: number, radius = r) => {
    const angle = (index * 2 * Math.PI) / count - Math.PI / 2;
    return {
      x: cx + radius * valNorm * Math.cos(angle),
      y: cy + radius * valNorm * Math.sin(angle)
    };
  };

  const levelPolygons = levels.map(level => {
    return data.map((_, i) => {
      const p = getPoint(i, level);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");
  });

  const dataPolygon = data.map((d, i) => {
    const norm = Math.min(Math.max(d.value / 10, 0), 1);
    const p = getPoint(i, norm);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="relative flex flex-col items-center justify-center py-2 select-none">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible max-w-full">
        {/* Concentric grid polygons */}
        {levelPolygons.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill={idx === levels.length - 1 ? "#f8fafc" : "none"}
            stroke="#cbd5e1"
            strokeWidth={idx === levels.length - 1 ? "1.5" : "1"}
            strokeDasharray={idx === levels.length - 1 ? "none" : "2,2"}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const outer = getPoint(i, 1.0);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill="rgba(2, 132, 199, 0.18)"
          stroke="#0284c7"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Vertex dots */}
        {data.map((d, i) => {
          const norm = Math.min(Math.max(d.value / 10, 0), 1);
          const p = getPoint(i, norm);
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Scale labels (5 and 10) */}
        <text x={cx + 4} y={cy - r * 0.5 + 3} fontSize="8" fill="#94a3b8" fontWeight="bold">5</text>
        <text x={cx + 4} y={cy - r + 3} fontSize="8" fill="#94a3b8" fontWeight="bold">10</text>

        {/* Axis labels & score */}
        {data.map((d, i) => {
          const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
          const labelDist = r + 26;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle);

          let textAnchor = "middle";
          if (Math.cos(angle) > 0.35) textAnchor = "start";
          else if (Math.cos(angle) < -0.35) textAnchor = "end";

          return (
            <g key={i}>
              <text
                x={lx}
                y={ly - 6}
                textAnchor={textAnchor}
                className="fill-slate-700 font-bold text-[11px]"
                dominantBaseline="central"
              >
                {d.label}
              </text>
              <text
                x={lx}
                y={ly + 8}
                textAnchor={textAnchor}
                className="fill-[#0284c7] font-black text-[11px]"
                dominantBaseline="central"
              >
                ({d.value.toFixed(1)})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState("overview")
  const [copiedCode, setCopiedCode] = useState(false)
  const [isStudentDrawerOpen, setIsStudentDrawerOpen] = useState(false)
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
      if (activeStudent) {
        setProfileData(prev => prev || {
          student: activeStudent,
          termScores: activeStudent.termScores || [],
          termSummaries: activeStudent.termSummaries || [],
          achievements: activeStudent.achievements || [],
          orientation: activeStudent.orientation || null,
          projects: activeStudent.projects || [],
          experientialActivities: activeStudent.experientialActivities || [],
          commitment: activeStudent.commitment || null,
          highlightComments: activeStudent.highlightComments || [],
          entranceSurvey: activeStudent.entranceSurvey || null,
          transfers: activeStudent.transfers || [],
          learningSupportTargets: activeStudent.learningSupportTargets || []
        })
      }
      try {
        setLoadingProfile(true)
        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}&_t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          if (data && !data.error) {
            setProfileData({
              ...data,
              experientialActivities: (data.experientialActivities && data.experientialActivities.length > 0)
                ? data.experientialActivities
                : (activeStudent?.experientialActivities || [])
            })
          } else {
            setProfileData({
              student: activeStudent || null,
              achievements: activeStudent?.achievements || [],
              orientation: activeStudent?.orientation || null,
              projects: activeStudent?.projects || [],
              experientialActivities: activeStudent?.experientialActivities || [],
              commitment: activeStudent?.commitment || null,
              highlightComments: activeStudent?.highlightComments || [],
              entranceSurvey: activeStudent?.entranceSurvey || null,
              transfers: activeStudent?.transfers || [],
              learningSupportTargets: activeStudent?.learningSupportTargets || []
            })
          }
        } else {
          setProfileData({
            student: activeStudent || null,
            achievements: activeStudent?.achievements || [],
            orientation: activeStudent?.orientation || null,
            projects: activeStudent?.projects || [],
            experientialActivities: activeStudent?.experientialActivities || [],
            commitment: activeStudent?.commitment || null,
            highlightComments: activeStudent?.highlightComments || [],
            entranceSurvey: activeStudent?.entranceSurvey || null,
            transfers: activeStudent?.transfers || [],
            learningSupportTargets: activeStudent?.learningSupportTargets || []
          })
        }
      } catch (err) {
        console.error("Error loading student profile:", err)
        setProfileData({
          student: activeStudent || null,
          achievements: activeStudent?.achievements || [],
          orientation: activeStudent?.orientation || null,
          projects: activeStudent?.projects || [],
          experientialActivities: activeStudent?.experientialActivities || [],
          commitment: activeStudent?.commitment || null,
          highlightComments: activeStudent?.highlightComments || [],
          entranceSurvey: activeStudent?.entranceSurvey || null,
          transfers: activeStudent?.transfers || [],
          learningSupportTargets: activeStudent?.learningSupportTargets || []
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
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "academic", label: "Kết quả học tập", icon: GraduationCap },
    { id: "competencies", label: "Năng lực 360°", icon: Sparkles },
    { id: "entrance", label: "Khảo sát & Đầu vào", icon: ClipboardCheck },
    { id: "achievements", label: "Thành tích", icon: Award },
    { id: "projects", label: "Trải nghiệm", icon: BookOpen },
    { id: "orientation", label: "Hướng nghiệp", icon: Compass },
    { id: "support", label: "Hỗ trợ", icon: HeartHandshake },
    { id: "finance", label: "Tài chính", icon: Wallet },
    { id: "cv", label: "Hồ sơ & Xuất báo cáo", icon: FileText }
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

      {/* Top Breadcrumb & Quick Controls */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button 
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-1.5 text-[#0284c7] hover:text-[#0369a1] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span className="font-extrabold">Hồ sơ học sinh</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-black text-slate-800 truncate max-w-[200px] sm:max-w-none">
            {selectedStudent?.studentName || "Chi tiết học sinh"}
          </span>
        </div>

        {/* Right Controls: Year, Campus, Prev/Next, Student Switcher */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-2xs">
            <span className="text-slate-400 font-semibold">Năm học:</span>
            <span className="text-slate-800 font-black">{profileData?.student?.academicYear?.name || "2026 - 2027"}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 shadow-2xs">
            <School className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-slate-400 font-semibold">Cơ sở:</span>
            <span className="text-slate-800 font-black">{selectedStudent?.campus?.campusName || "CS3"}</span>
          </div>

          {/* Quick Prev / Next Student */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => {
                const idx = filteredStudents.findIndex(s => s.id === selectedStudentId);
                if (idx > 0) setSelectedStudentId(filteredStudents[idx - 1].id);
              }}
              disabled={filteredStudents.findIndex(s => s.id === selectedStudentId) <= 0}
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded-lg hover:bg-white transition-all cursor-pointer"
              title="Học sinh trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-black text-slate-500 px-1.5">
              {Math.max(filteredStudents.findIndex(s => s.id === selectedStudentId) + 1, 1)} / {filteredStudents.length}
            </span>
            <button
              onClick={() => {
                const idx = filteredStudents.findIndex(s => s.id === selectedStudentId);
                if (idx >= 0 && idx < filteredStudents.length - 1) setSelectedStudentId(filteredStudents[idx + 1].id);
              }}
              disabled={filteredStudents.findIndex(s => s.id === selectedStudentId) >= filteredStudents.length - 1}
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-600 rounded-lg hover:bg-white transition-all cursor-pointer"
              title="Học sinh tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Student Switcher Drawer Toggle Button */}
          <button
            onClick={() => setIsStudentDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Đổi học sinh ({students.length})</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Student Hero Profile Card with Sky-Line Brand Identity */}
      <div className="relative rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-7 no-print transition-all">
        {/* Decorative background gradient & campus illustration */}
        <div className="absolute inset-0 bg-gradient-to-r from-sky-50/60 via-white to-sky-100/40 pointer-events-none" />
        
        {/* Sky-Line Slogan & Logo Watermark on Top Right */}
        <div className="absolute right-6 top-6 sm:top-8 flex flex-col items-end pointer-events-none select-none opacity-80">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-sm sm:text-base font-bold text-sky-900/60 tracking-wide">
              “Kiến tạo tương lai tươi sáng”
            </span>
            <svg viewBox="0 0 100 45" className="w-14 h-6 text-[#0284c7]/40" fill="currentColor">
              <path d="M5 35 C 20 30, 40 16, 70 8 C 55 18, 38 28, 22 38 Z" />
              <path d="M35 24 C 60 14, 80 5, 98 2 C 82 11, 65 20, 48 27 Z" />
            </svg>
          </div>
          <div className="mt-3 w-48 sm:w-64 h-14 border-b-2 border-r-2 border-sky-200/50 rounded-br-2xl flex items-end justify-end p-1">
            <div className="flex gap-1 items-end opacity-40">
              <div className="w-3 h-8 bg-sky-300/40 rounded-t" />
              <div className="w-3 h-12 bg-sky-400/40 rounded-t" />
              <div className="w-4 h-10 bg-sky-300/40 rounded-t" />
              <div className="w-3 h-6 bg-sky-200/40 rounded-t" />
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 z-10">
          {/* Avatar Circle with Upload on hover */}
          <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-sky-200/60 flex items-center justify-center bg-slate-100 flex-shrink-0 cursor-pointer">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover animate-in fade-in duration-300" onError={() => setAvatarUrl("")} />
            ) : (
              <User className="w-12 h-12 text-slate-300" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 text-white text-[9px] font-black uppercase flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 mb-1" />
              Tải ảnh
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          {/* Student Name, Status, Code & Metadata Chips */}
          <div className="space-y-3 text-center sm:text-left min-w-0 flex-grow">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedStudent?.studentName || "Chưa chọn học sinh"}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang học
              </span>
            </div>

            {/* Code with Copy Button */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-600">
              <span className="text-slate-400 font-bold">Mã học sinh:</span>
              <span className="font-mono font-black text-slate-900 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/80">
                {selectedStudent?.studentCode || "—"}
              </span>
              <button
                onClick={() => {
                  if (selectedStudent?.studentCode) {
                    navigator.clipboard.writeText(selectedStudent.studentCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-sky-600 rounded-md transition-colors cursor-pointer"
                title="Sao chép mã học sinh"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {copiedCode && <span className="text-[10px] text-emerald-600 font-bold animate-in fade-in">Đã chép!</span>}
            </div>

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                <span>{selectedStudent?.dateOfBirth ? safeFormatDate(selectedStudent.dateOfBirth) : "4/11/2012"}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{selectedStudent?.gender || "Nam"}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                <span>Lớp {selectedStudent?.className || "9UK_CS3"}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{selectedStudent?.campus?.campusName || "Cơ sở 3"}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button (In hồ sơ / Lưu PDF) */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0 z-10">
            <button
              onClick={() => window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${yearId}`, "_blank")}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-600 border border-slate-200/90 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-600" />
              <span>In hồ sơ / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Pill Tab Navigation */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-print scrollbar-none shadow-2xs">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const badge = getTabBadgeInfo(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-[#0284c7] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {badge.hasData && badge.count > 0 && tab.id !== "overview" && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {badge.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Main Workspace Area: Full-width Card */}
      <div className="space-y-6">
        {selectedStudentId ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
            {/* Tab Content area */}
            <div className="p-4 sm:p-7 flex-grow">
              {loadingProfile ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="w-10 h-10 text-sky-500 animate-spin opacity-50" />
                  <p className="text-slate-400 text-xs font-bold">Đang tải chi tiết hồ sơ học sinh...</p>
                </div>
              ) : profileData ? (
                <div>
                  {/* TAB: TỔNG QUAN (NEW EXECUTIVE 360° DASHBOARD) */}
                  {activeTab === "overview" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* 2-Column Grid matching target mockup */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* LEFT/CENTER MAIN COLUMN (8 of 12 cols = approx 68%) */}
                        <div className="lg:col-span-8 space-y-6">
                          
                          {/* SECTION: TỔNG QUAN NĂNG LỰC */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#0284c7]" />
                                TỔNG QUAN NĂNG LỰC
                              </h3>
                            </div>

                            {/* 4 Metric KPI Cards Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                              {/* Card 1: Kết quả học tập */}
                              <div className="bg-gradient-to-br from-sky-50/80 to-white p-4 rounded-2xl border border-sky-100/90 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                                    <GraduationCap className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    ↑ +0.6
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">Kết quả học tập</div>
                                  <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                                    {profileData?.termSummaries?.[0]?.gpa ? Number(profileData.termSummaries[0].gpa).toFixed(1) : "8.4"}<span className="text-xs font-semibold text-slate-400">/10</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold mt-1">So với kỳ trước</div>
                                </div>
                              </div>

                              {/* Card 2: Năng lực tổng hợp */}
                              <div className="bg-gradient-to-br from-emerald-50/80 to-white p-4 rounded-2xl border border-emerald-100/90 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <BarChart3 className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    ↑ +0.5
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">Năng lực tổng hợp</div>
                                  <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                                    7.8<span className="text-xs font-semibold text-slate-400">/10</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold mt-1">So với kỳ trước</div>
                                </div>
                              </div>

                              {/* Card 3: Trải nghiệm & Kỹ năng */}
                              <div className="bg-gradient-to-br from-amber-50/80 to-white p-4 rounded-2xl border border-amber-100/90 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                    <Heart className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    ↑ +0.4
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">Trải nghiệm & Kỹ năng</div>
                                  <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                                    8.6<span className="text-xs font-semibold text-slate-400">/10</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold mt-1">So với kỳ trước</div>
                                </div>
                              </div>

                              {/* Card 4: Phẩm chất & Thói quen */}
                              <div className="bg-gradient-to-br from-purple-50/80 to-white p-4 rounded-2xl border border-purple-100/90 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                    <Star className="w-4 h-4" />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                    ↑ +0.3
                                  </span>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">Phẩm chất & Thói quen</div>
                                  <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                                    8.9<span className="text-xs font-semibold text-slate-400">/10</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-bold mt-1">So với kỳ trước</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ROW: RADAR CHART + REMARKS & GOALS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Subcard 1: Biểu đồ năng lực 360° */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-sky-500" />
                                    BIỂU ĐỒ NĂNG LỰC 360°
                                  </h4>
                                  <span className="text-[10px] font-bold text-slate-400">HK1 • 2026-2027</span>
                                </div>
                                {/* Interactive SVG Radar Chart */}
                                <div className="pt-2 flex items-center justify-center">
                                  <CompetencyRadarChart
                                    data={[
                                      { label: "Học tập", value: Number(profileData?.termSummaries?.[0]?.gpa) || 8.4 },
                                      { label: "Kỹ năng", value: 7.8 },
                                      { label: "Thói quen", value: 8.9 },
                                      { label: "Trải nghiệm", value: 8.6 },
                                      { label: "Định hướng", value: 7.5 },
                                      { label: "Sức khỏe", value: 8.2 }
                                    ]}
                                  />
                                </div>
                              </div>
                              <div className="text-center pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => setActiveTab("competencies")}
                                  className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  Xem phân tích năng lực chi tiết <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Subcard 2: Nhận xét nổi bật & Mục tiêu gần đây */}
                            <div className="space-y-5 flex flex-col justify-between">
                              {/* Card: Nhận xét nổi bật */}
                              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-sky-500" />
                                    Nhận xét nổi bật
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-600 font-semibold leading-relaxed italic bg-sky-50/40 p-3.5 rounded-xl border border-sky-100/60">
                                  "{profileData?.highlightComments?.filter((c: any) => c.category !== "ANNOUNCEMENT")?.[0]?.comment ||
                                    "Brian là học sinh có ý thức học tập tốt, tích cực tham gia các hoạt động trải nghiệm. Em có khả năng phân tích và tư duy logic tốt. Cần tiếp tục rèn luyện kỹ năng quản lý thời gian và tăng cường tham gia các hoạt động hướng nghiệp."}"
                                </p>
                                <div className="pt-1">
                                  <button
                                    onClick={() => setActiveTab("comments")}
                                    className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    Xem chi tiết nhận xét <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Card: Mục tiêu gần đây */}
                              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-500" />
                                    Mục tiêu gần đây
                                  </h4>
                                </div>
                                <div className="space-y-2 text-xs font-bold text-slate-700">
                                  <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>{"Duy trì điểm Toán ≥ 8.0"}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Tham gia 2 hoạt động trải nghiệm/học kỳ</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-slate-400 font-semibold">
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                                    <span>Cải thiện kỹ năng thuyết trình</span>
                                  </div>
                                </div>
                                <div className="pt-1 border-t border-slate-100">
                                  <button
                                    onClick={() => setActiveTab("support")}
                                    className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    Xem kế hoạch học tập <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* RIGHT SIDEBAR COLUMN (4 of 12 cols = approx 32%) */}
                        <div className="lg:col-span-4 space-y-6">
                          
                          {/* Card 1: THÔNG TIN NHANH */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4 text-[#0284c7]" />
                                THÔNG TIN NHANH
                              </h4>
                              <button
                                onClick={() => setActiveTab("cv")}
                                className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Chỉnh sửa
                              </button>
                            </div>

                            <div className="divide-y divide-slate-100 text-xs font-semibold">
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Họ và tên</span>
                                <span className="font-bold text-slate-800 text-right">{selectedStudent?.studentName || "Brian Wai Jia Dong"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Mã học sinh</span>
                                <span className="font-mono font-bold text-sky-700 flex items-center gap-1">
                                  {selectedStudent?.studentCode || "0501030597"}
                                  <button
                                    onClick={() => {
                                      if (selectedStudent?.studentCode) {
                                        navigator.clipboard.writeText(selectedStudent.studentCode);
                                        setCopiedCode(true);
                                        setTimeout(() => setCopiedCode(false), 2000);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Ngày sinh</span>
                                <span className="font-bold text-slate-800">{selectedStudent?.dateOfBirth ? safeFormatDate(selectedStudent.dateOfBirth) : "4/11/2012"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Giới tính</span>
                                <span className="font-bold text-slate-800">{selectedStudent?.gender || "Nam"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Lớp học</span>
                                <span className="font-bold text-slate-800">{selectedStudent?.className || "9UK_CS3"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Cơ sở</span>
                                <span className="font-bold text-slate-800">{selectedStudent?.campus?.campusName || "CS3"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Giáo viên chủ nhiệm</span>
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {selectedStudent?.homeroomTeacher || "Đang phân công"}
                                </span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Email PHHS</span>
                                <span className="font-medium text-slate-500 truncate max-w-[150px]">{selectedStudent?.parentEmail || "—"}</span>
                              </div>
                              <div className="py-2 flex justify-between items-center gap-2">
                                <span className="text-slate-400">Số điện thoại</span>
                                <span className="font-medium text-slate-500">{selectedStudent?.parentPhone || "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Card 2: HOẠT ĐỘNG GẦN ĐÂY */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#0284c7]" />
                                HOẠT ĐỘNG GẦN ĐÂY
                              </h4>
                              <button
                                onClick={() => setActiveTab("projects")}
                                className="text-[11px] font-bold text-[#0284c7] hover:text-[#0369a1] transition-colors cursor-pointer"
                              >
                                Xem tất cả
                              </button>
                            </div>

                            <div className="space-y-3.5">
                              {/* Item 1 */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                                  <Book className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-grow">
                                  <div className="text-xs font-bold text-slate-800 truncate">Cập nhật điểm môn Toán HK1</div>
                                  <div className="text-[10px] text-slate-400 font-semibold">12/09/2026</div>
                                </div>
                              </div>

                              {/* Item 2 */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                                  <Star className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-grow">
                                  <div className="text-xs font-bold text-slate-800 truncate">Tham gia Ngày hội STEM</div>
                                  <div className="text-[10px] text-slate-400 font-semibold">10/09/2026</div>
                                </div>
                              </div>

                              {/* Item 3 */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                                  <ClipboardCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-grow">
                                  <div className="text-xs font-bold text-slate-800 truncate">Hoàn thành khảo sát hướng nghiệp</div>
                                  <div className="text-[10px] text-slate-400 font-semibold">08/09/2026</div>
                                </div>
                              </div>

                              {/* Item 4 */}
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-grow">
                                  <div className="text-xs font-bold text-slate-800 truncate">Đạt giải Khuyến khích Toán cấp trường</div>
                                  <div className="text-[10px] text-slate-400 font-semibold">05/09/2026</div>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  )}

                  {/* TAB: TÀI CHÍNH CÁ NHÂN & HỌC BỔNG */}
                  {activeTab === "finance" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <div>
                            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                              <Wallet className="w-5 h-5 text-[#0284c7]" />
                              Giáo dục Tài chính &amp; Hồ sơ Học bổng
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Chương trình theo dõi định hướng tài chính cá nhân và hồ sơ học bổng của học sinh Sky-Line
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 space-y-2">
                            <span className="text-[10px] font-black uppercase text-[#0284c7]">Kiến thức tài chính</span>
                            <div className="text-xl font-black text-slate-800">8.5 / 10</div>
                            <p className="text-xs text-slate-600 font-medium">Hoàn thành module quản lý ngân sách &amp; tiết kiệm thông minh</p>
                          </div>

                          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2">
                            <span className="text-[10px] font-black uppercase text-emerald-700">Học bổng đạt được</span>
                            <div className="text-xl font-black text-slate-800">Khuyến học</div>
                            <p className="text-xs text-slate-600 font-medium">Học bổng Sky-Line Talent niên khóa 2025-2026</p>
                          </div>

                          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                            <span className="text-[10px] font-black uppercase text-purple-700">Định hướng tương lai</span>
                            <div className="text-xl font-black text-slate-800">Du học 2028</div>
                            <p className="text-xs text-slate-600 font-medium">Mục tiêu tài chính du học tại các trường đại học quốc tế</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: CV INTERGRATED (NEW STANDARD) */}
                    {(activeTab === "cv" || activeTab === "advisory_360") && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        {/* CV Action Bar */}
                        <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 no-print">
                          <div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Hồ sơ CV Tích hợp Chuẩn Quốc tế</h4>
                            <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Bản tổng hợp hồ sơ năng lực học tập và rèn luyện của học sinh</p>
                          </div>
                          <button
                            onClick={() => window.open(`/teacher/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${yearId}`, "_blank")}
                            className="flex items-center gap-2 bg-[#48BFE3] hover:bg-[#009085] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>In hồ sơ / Lưu PDF</span>
                          </button>
                        </div>

                        {/* CV Document Container */}
                        <div className="print-container bg-white border border-slate-200 shadow-xl rounded-3xl p-8 max-w-4xl mx-auto font-sans relative overflow-hidden">
                          {/* Decorative Top Accent Stripe */}
                          <div className="absolute top-0 left-0 right-0 h-2 bg-[#48BFE3]" />
                          
                          {/* Background decoration elements */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#48BFE3]/8 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none no-print"></div>
                          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-500/5 to-transparent rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none no-print"></div>
                          
                          {/* CV Header */}
                          <div className="border-b border-slate-200 pb-6 flex justify-between items-start gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#48BFE3]/10 flex items-center justify-center border border-[#48BFE3]/20">
                                  <GraduationCap className="w-5 h-5 text-[#48BFE3]" />
                                </div>
                                <span className="font-black text-xs tracking-wider text-slate-500 font-sans uppercase">SKY-LINE SYSTEM</span>
                              </div>
                              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-sans mt-2">HỒ SƠ NĂNG LỰC HỌC SINH</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">Student Comprehensive Profile & Portfolio</p>
                            </div>
                            <div className="text-right text-xs text-slate-500 font-semibold space-y-1 mt-1">
                              <div className="bg-slate-100 rounded-lg px-2.5 py-1 inline-block">
                                <span className="text-slate-400 mr-1.5">Năm học:</span>
                                <span className="text-slate-800 font-bold">{profileData?.student?.academicYear?.name || "2026-2027"}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold block">
                                Cơ sở: <span className="text-slate-700 font-extrabold">{profileData?.student?.campus?.campusName || "Sky-line Campus"}</span>
                              </div>
                            </div>
                          </div>

{/* 7-SECTION STUDENT PORTFOLIO */}
                          <div className="space-y-8 mt-6">

                            {/* SECTION I: THÔNG TIN HỌC SINH */}
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#48BFE3]" />
                                <User className="w-4 h-4 text-[#48BFE3]" />
                                I. THÔNG TIN HỌC SINH
                              </h3>
                              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xs flex items-center justify-center bg-white flex-shrink-0">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
                                  ) : (
                                    <User className="w-14 h-14 text-slate-300" />
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-semibold text-slate-700 w-full pt-1">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Họ và tên</span>
                                    <span className="font-black text-slate-900 text-sm block">{selectedStudent?.studentName}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Mã học sinh</span>
                                    <span className="font-mono font-black text-[#48BFE3] text-sm block">{selectedStudent?.studentCode}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Lớp học</span>
                                    <span className="font-bold text-slate-800 text-sm block">{selectedStudent?.className}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ngày sinh</span>
                                    <span className="font-bold text-slate-800 block">{selectedStudent?.dateOfBirth ? safeFormatDate(selectedStudent.dateOfBirth) : 'N/A'}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Giới tính</span>
                                    <span className="font-bold text-slate-800 block">{selectedStudent?.gender || 'N/A'}</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Giáo viên chủ nhiệm (GVCN)</span>
                                    <span className="font-bold text-teal-700 block">{profileData?.homeroomTeacherName || (selectedStudent as any)?.homeroomTeacherName || "Đang phân công"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SECTION II: CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                <Compass className="w-4 h-4 text-indigo-500" />
                                II. CỐ VẤN HỌC TẬP &amp; NHẬT KÝ THEO DÕI MỤC TIÊU
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl space-y-2">
                                  <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Lời cam kết &amp; Xác nhận của Học sinh</h4>
                                  <p className="text-xs text-slate-700 font-medium italic leading-relaxed">
                                    "{profileData?.commitment?.content || 'Học sinh cam kết chấp hành nội quy trường lớp, nâng cao năng lực tự học và tích cực tham gia các phong trào rèn luyện.'}"
                                  </p>
                                  {profileData?.commitment?.status && (
                                    <span className="inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      Trạng thái: {profileData.commitment.status === "COMPLETED" ? "Hoàn thành" : profileData.commitment.status === "VIOLATED" ? "Vi phạm" : "Đang thực hiện"}
                                    </span>
                                  )}
                                </div>
                                <div className="bg-teal-50/40 border border-teal-100 p-4 rounded-2xl space-y-2">
                                  <h4 className="text-[11px] font-black text-[#007A72] uppercase tracking-wider">Nhật ký theo dõi mục tiêu</h4>
                                  {!(profileData as any)?.learningSupportTargets || (profileData as any).learningSupportTargets.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">Theo dõi mục tiêu tự học và kết quả rèn luyện định kỳ duy trì ở mức Đạt/Tốt.</p>
                                  ) : (
                                    <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                                      {(profileData as any).learningSupportTargets.slice(0, 2).map((t: any) => (
                                        <div key={t.id} className="flex justify-between items-center border-b border-teal-100/60 pb-1">
                                          <span>{t.reason}:</span>
                                          <span className="font-bold text-teal-800">{t.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý"}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SECTION III: KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                <FileText className="w-4 h-4 text-blue-600" />
                                III. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)
                              </h3>
                              {(!profileData?.termScores || profileData.termScores.length === 0) ? (
                                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs text-slate-400 italic text-center">
                                  Chưa có bảng điểm kết quả học tập môn học trong cơ sở dữ liệu.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2.5 px-3">Môn học</th>
                                        <th className="py-2.5 px-3 text-center">Học kỳ</th>
                                        <th className="py-2.5 px-3 text-center">Điểm TB / Đánh giá</th>
                                        <th className="py-2.5 px-3">Nhận xét của GVBM</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {profileData.termScores.slice(0, 5).map((sc: any, idx: number) => (
                                        <tr key={sc.id || idx}>
                                          <td className="py-2 px-3 font-extrabold text-slate-800">{sc.subject?.name || sc.subjectName || "Môn học"}</td>
                                          <td className="py-2 px-3 text-center text-slate-500">{sc.semester || "Cả năm"}</td>
                                          <td className="py-2 px-3 text-center font-black text-[#48BFE3]">{sc.gpaScore ?? sc.gradeText ?? "Đạt"}</td>
                                          <td className="py-2 px-3 text-slate-600">{sc.teacherComment || "Đạt yêu cầu chuẩn môn học"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* SECTION IV: THÀNH TÍCH */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <Award className="w-4 h-4 text-amber-500" />
                                IV. THÀNH TÍCH
                              </h3>
                              {!profileData?.achievements || profileData.achievements.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic font-semibold pl-1">Chưa ghi nhận thành tích khen thưởng trong năm học.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {profileData.achievements.map((a: any) => (
                                    <div key={a.id} className="flex gap-2.5 items-start text-xs bg-amber-500/[0.04] border border-amber-500/10 p-3 rounded-xl">
                                      <Award className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-extrabold text-slate-800">{a.achievement?.name || a.achievement?.title}</div>
                                        <div className="text-[9px] text-amber-700 font-black uppercase mt-0.5">{a.achievement?.level || "Cấp Trường"}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* SECTION V: HOẠT ĐỘNG TRẢI NGHIỆM */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#48BFE3]" />
                                <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                                V. HOẠT ĐỘNG TRẢI NGHIỆM
                              </h3>
                              {(!profileData?.experientialActivities || profileData.experientialActivities.length === 0) && (!profileData?.projects || profileData.projects.length === 0) ? (
                                <p className="text-[10px] text-slate-400 italic font-semibold pl-1">Học sinh chưa tham gia hoạt động trải nghiệm nào.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                        <th className="py-2.5 px-3 text-center w-12">STT</th>
                                        <th className="py-2.5 px-3">Tên hoạt động</th>
                                        <th className="py-2.5 px-3">Nhóm hoạt động</th>
                                        <th className="py-2.5 px-3 text-center">Vai trò tham gia</th>
                                        <th className="py-2.5 px-3 text-center">Mức đánh giá</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {(profileData?.experientialActivities || []).map((act: any, idx: number) => (
                                        <tr key={act.id || idx}>
                                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                                          <td className="py-2.5 px-3 font-extrabold text-slate-800">{act.activityName}</td>
                                          <td className="py-2.5 px-3">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                                              {act.groupName}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                              {act.role}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                              {act.evalLevel}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                      {(profileData?.projects || []).map((p: any, idx: number) => (
                                        <tr key={p.id || idx}>
                                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{(profileData?.experientialActivities?.length || 0) + idx + 1}</td>
                                          <td className="py-2.5 px-3 font-extrabold text-slate-800">{p.projectName}</td>
                                          <td className="py-2.5 px-3">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">Dự án học tập</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">{p.role || "Thành viên"}</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase">{p.result || "Đạt"}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>

                            {/* SECTION VI: HƯỚNG NGHIỆP / TÀI CHÍNH CÁ NHÂN */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                                <Compass className="w-4 h-4 text-sky-600" />
                                VI. HƯỚNG NGHIỆP / TÀI CHÍNH CÁ NHÂN
                              </h3>
                              {profileData?.orientation ? (
                                <div className="bg-sky-50/40 border border-sky-100 p-4 rounded-2xl space-y-1.5">
                                  <div className="text-[10px] text-sky-700 font-black uppercase">Nhóm ngành quan tâm &amp; Định hướng tài chính cá nhân</div>
                                  <div className="text-xs font-black text-slate-800">{profileData.orientation.result}</div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic font-semibold pl-1">Chưa có thông tin định hướng ngành nghề &amp; tài chính cá nhân.</p>
                              )}
                            </div>

                            {/* SECTION VII: NHẬN XẾT NỔI BẬT */}
                            <div className="space-y-3">
                              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                VII. NHẬN XẾT NỔI BẬT
                              </h3>
                              {(() => {
                                const primaryComment = profileData?.highlightComments?.filter((c: any) => c.category !== "ANNOUNCEMENT")?.[0]
                                if (primaryComment) {
                                  return (
                                    <div className="bg-emerald-50/40 border-l-4 border-emerald-500 p-4 rounded-r-2xl space-y-2">
                                      <p className="text-xs text-slate-700 font-semibold italic whitespace-pre-wrap">
                                        "{primaryComment.comment}"
                                      </p>
                                      <div className="text-right text-[9px] text-emerald-700 font-black uppercase">
                                        — {primaryComment.teacherName} (GVCN) • {safeFormatDate(primaryComment.updatedAt)}
                                      </div>
                                    </div>
                                  )
                                }
                                return <p className="text-[10px] text-slate-400 italic font-semibold pl-1">Chưa ghi nhận đánh giá định kỳ từ Giáo viên Chủ nhiệm.</p>
                              })()}
                            </div>

                          </div>

                        </div>
                      </div>
                    )}

                    
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
                                  <th className="py-3.5 px-4">Nhóm hoạt động</th>
                                  <th className="py-3.5 px-4 text-center">Vai trò tham gia</th>
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
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center no-print space-y-4">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh lớp chủ nhiệm</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">Vui lòng bấm vào nút "Đổi học sinh" phía trên để chọn học sinh cần xem hồ sơ năng lực 360°.</p>
              <button
                onClick={() => setIsStudentDrawerOpen(true)}
                className="inline-flex items-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Mở danh sách lớp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Brand Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-400 no-print select-none">
        <div className="flex items-center gap-2 font-serif italic text-slate-500">
          <span>“Học sinh hôm nay, thế giới ngày mai”</span>
          <span className="not-italic text-slate-400 font-sans">— Sky-Line Education</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="text-[11px] font-semibold">Sky-Line Education Platform</span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors">
              <BookOpen className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors">
              <Users className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors">
              <BarChart3 className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-600 flex items-center justify-center transition-colors">
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-over Student Drawer */}
      {isStudentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end no-print animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsStudentDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800">Danh sách Học sinh Lớp</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {students.length} học sinh • {students[0]?.className || "Lớp chủ nhiệm"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsStudentDrawerOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Print in Drawer */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên, mã HS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] transition-all"
                  autoFocus
                />
              </div>
              {students.length > 0 && (
                <button
                  onClick={() => window.open(`/teacher/ho-so-hoc-sinh/print?type=class&classId=${students[0]?.classId || selectedStudent?.classId}&academicYearId=${yearId}`, "_blank")}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>In HSHS Toàn bộ Lớp</span>
                </button>
              )}
            </div>

            {/* Student List Items */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs italic">
                  Không tìm thấy học sinh phù hợp.
                </div>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isSelected = selectedStudentId === s.id;
                  const initials = s.studentName ? s.studentName.split(" ").pop()?.substring(0, 2).toUpperCase() : "HS";
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setIsStudentDrawerOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-sky-50 border border-sky-200 text-sky-700 shadow-2xs"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? "bg-[#0284c7] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <div className={`truncate text-xs font-bold ${isSelected ? "text-sky-900" : "text-slate-800"}`}>
                          {idx + 1}. {s.studentName}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="font-mono font-semibold">{s.studentCode}</span>
                          <span>•</span>
                          <span>{s.className || "Lớp CN"}</span>
                        </div>
                      </div>
                      {s.isEntranceAdmitted && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 shrink-0">
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
      )}
    </div>
  )
}
