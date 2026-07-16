"use client"

import { useState, useEffect } from "react"
import { 
  Users, Loader2, User, Award, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, ThumbsUp, MessageCircle, Share2, Send, Globe, Camera
} from "lucide-react"

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
  const [activeTab, setActiveTab] = useState("entrance")
  const [entranceSubTab, setEntranceSubTab] = useState<"results" | "admin" | "academic">("results")
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isNotGVCN, setIsNotGVCN] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [newPostText, setNewPostText] = useState("")
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)
  const [apiError, setApiError] = useState("")
  
  // Custom interactive mock likes/comments state for the wall posts
  const [postLikes, setPostLikes] = useState<Record<string, { count: number, liked: boolean }>>({})
  const [postCommentsState, setPostCommentsState] = useState<Record<string, { author: string, text: string, time: string }[]>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Profile data
  const [profileData, setProfileData] = useState<{
    achievements: any[]
    orientation: any
    projects: any[]
    commitment: any
    highlightComments: any[]
    entranceSurvey: any
    transfers: any[]
  } | null>(null)

  useEffect(() => {
    if (!yearId) return
    async function loadHomeroomStudents() {
      try {
        setLoadingStudents(true)
        const res = await fetch(`/api/teacher-student-records?action=getHomeroomStudents&academicYearId=${yearId}`)
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
            setIsNotGVCN(false)
          } else {
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
        const profileRes = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}`)
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
      try {
        setLoadingProfile(true)
        const activeStudent = students.find(s => s.id === selectedStudentId)
        setSelectedStudent(activeStudent)

        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}&academicYearId=${yearId}`)
        if (res.ok) {
          const data = await res.json()
          setProfileData(data)
        }
      } catch (err) {
        console.error("Error loading student profile:", err)
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [selectedStudentId, students])

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
        <Loader2 className="w-12 h-12 text-[#00A99D] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải danh sách học sinh lớp chủ nhiệm...</p>
      </div>
    )
  }

  const tabs = [
    { id: "entrance", label: "Khảo sát đầu vào", icon: ClipboardCheck },
    { id: "announcements", label: "Bản tin & Thông báo", icon: Bell },
    { id: "achievements", label: "Thành tích", icon: Award },
    { id: "orientation", label: "Hướng nghiệp", icon: Compass },
    { id: "commitment", label: "Cam kết học tập", icon: FileText },
    { id: "projects", label: "Dự án & Trải nghiệm", icon: BookOpen },
    { id: "comments", label: "Nhận xét nổi bật", icon: MessageSquare },
    { id: "support", label: "Hỗ trợ học tập", icon: FileText }
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#00A99D] rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Hồ sơ Học sinh</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Theo dõi toàn diện thông tin học sinh lớp chủ nhiệm từ khảo sát đầu vào đến thành tích rèn luyện</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left column: Student list selection */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Học sinh Lớp chủ nhiệm</h3>
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {students.length === 0 ? (
                <div className="text-[11px] text-slate-400 font-semibold italic text-center py-6">
                  Lớp chủ nhiệm chưa có học sinh nào.
                </div>
              ) : (
                students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedStudentId === s.id
                        ? "bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/30"
                        : s.isEntranceAdmitted
                          ? "bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100/60"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div>
                      <div className="truncate font-black">{s.studentName}</div>
                      <div className="text-[9px] opacity-60 font-bold mt-0.5">{s.className || "Lớp chủ nhiệm"}</div>
                    </div>
                    <span className="text-[9px] opacity-60 font-semibold">{s.studentCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right workspace: tabs & details */}
        <div className="md:col-span-3 space-y-6">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Profile header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                <div className="relative group w-14 h-14 rounded-full overflow-hidden bg-teal-50 border border-teal-100 flex items-center justify-center text-[#00A99D] cursor-pointer">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
                  ) : (
                    <User className="w-7 h-7" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 text-white text-[8px] font-black uppercase flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-3.5 h-3.5 mb-0.5" />
                    Tải ảnh
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">{selectedStudent?.studentName}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-bold mt-1.5">
                    <span>Mã HS: <span className="text-slate-700">{selectedStudent?.studentCode}</span></span>
                    <span>Ngày sinh: <span className="text-slate-700">{selectedStudent?.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString('vi-VN') : 'N/A'}</span></span>
                    <span>Giới tính: <span className="text-slate-700">{selectedStudent?.gender || 'N/A'}</span></span>
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
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all ${
                        isActive
                          ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200"
                          : "text-slate-500 border-transparent hover:text-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content area */}
              <div className="p-6 flex-grow">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-10 h-10 text-[#00A99D] animate-spin opacity-50" />
                    <p className="text-slate-400 text-xs font-bold">Đang tải chi tiết hồ sơ...</p>
                  </div>
                ) : profileData ? (
                  <div>
                    {/* TAB: ENTRANCE */}
                    {activeTab === "entrance" && (
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Kết quả khảo sát đầu vào</h4>
                          {profileData.entranceSurvey?.type && (
                            <span className="bg-teal-50 text-[#00A99D] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Hệ {profileData.entranceSurvey.type}
                            </span>
                          )}
                        </div>

                        {profileData.entranceSurvey ? (
                          <div className="space-y-6">
                            {/* Entrance sub-tabs navigation */}
                            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">
                              <button
                                onClick={() => setEntranceSubTab("results")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                                  entranceSubTab === "results"
                                    ? "border-[#00A99D] text-[#00A99D]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                {profileData.entranceSurvey.type === "PRESCHOOL" ? "Đánh giá phát triển" : "Kết quả đánh giá"}
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("admin")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                                  entranceSubTab === "admin"
                                    ? "border-[#00A99D] text-[#00A99D]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <User className="w-3.5 h-3.5" />
                                Thông tin hành chính
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("academic")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                                  entranceSubTab === "academic"
                                    ? "border-[#00A99D] text-[#00A99D]"
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
                                  <div>Cơ sở đăng ký: <span className="text-slate-800">{profileData.entranceSurvey.admissionCampus || "N/A"}</span></div>
                                  <div>Kết quả tuyển sinh: <span className="text-slate-800">{profileData.entranceSurvey.admissionResult || "Chưa xác định"}</span></div>
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
                                  let mathVal: any = survey.mathScore
                                  let litVal: any = survey.literatureScore
                                  let writtenVal: any = survey.writtenEnglishScore
                                  let oralVal: any = survey.oralEnglishScore
                                  let psychVal: any = survey.psychologyScore
                                  let oralComment = ""
                                  let psychConclusion = ""
                                  ;(survey.scores || []).forEach((sc: any) => {
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
                                  const isGrade1 = (() => { const m = String(survey.className || survey.grade || "").match(/\d+/); return m ? parseInt(m[0]) === 1 : false })()
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
                                        <div className="bg-[#00A99D]/5 border border-[#00A99D]/20 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-[#00A99D] font-bold uppercase tracking-wider">Toán</div>
                                          <div className="text-2xl font-extrabold text-slate-800 mt-1">{mathVal !== null && mathVal !== undefined ? mathVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Ngữ văn</div>
                                          <div className="text-2xl font-extrabold text-slate-800 mt-1">{litVal !== null && litVal !== undefined ? litVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-sky-50/30 border border-sky-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Anh viết</div>
                                          <div className="text-2xl font-extrabold text-slate-800 mt-1">{writtenDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 70"}</div>
                                        </div>
                                        <div className="bg-sky-50/20 border border-sky-100/60 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Anh nói</div>
                                          <div className="text-2xl font-extrabold text-slate-800 mt-1">{oralDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 30"}</div>
                                        </div>
                                      </div>
                                      {totalEnglish !== null && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-3 rounded-xl border border-indigo-100 text-center">
                                          <span className="text-xs text-indigo-600 font-black uppercase tracking-wider">Tổng điểm Tiếng Anh: </span>
                                          <span className="text-sm font-extrabold text-indigo-700">{totalEnglish}/100</span>
                                        </div>
                                      )}
                                      {oralComment && (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-1">Nhận xét Tiếng Anh Nói</div>
                                          <p className="text-xs text-slate-600 font-semibold leading-relaxed italic">"{oralComment}"</p>
                                        </div>
                                      )}
                                      <div className={`text-xs font-semibold space-y-1 p-3 rounded-xl border ${psychClass}`}>
                                        <div className="flex items-center gap-2">
                                          <span>• Đánh giá tâm lý:</span>
                                          <span className="font-extrabold">{psychVal !== null && psychVal !== undefined ? psychVal : "Chưa có"}</span>
                                          {psychLabel && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${psychClass}`}>{psychLabel}</span>}
                                        </div>
                                        {psychConclusion && <div className="pl-3 italic opacity-80">→ {psychConclusion}</div>}
                                        <div>• Kết quả học tập cấp trước: <span className="font-extrabold text-slate-800">{survey.kqHocTap ?? "—"}</span></div>
                                        <div>• Kết quả rèn luyện cấp trước: <span className="font-extrabold text-slate-800">{survey.kqRenLuyen ?? "—"}</span></div>
                                      </div>

                                      {/* Committed Subjects & Approval Details */}
                                      {(survey.directorNote || survey.admissionResult === "Đạt cam kết" || survey.admissionResult === "Đạt - Cam kết") && (() => {
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
                                                    <span key={idx} className="bg-amber-100/80 text-amber-800 border border-amber-200/60 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                                                      {sub}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {survey.directorNote && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Ý kiến chỉ đạo / Ghi chú xét duyệt:</span>
                                                <p className="text-slate-700 bg-white border border-slate-200 p-3 rounded-lg font-semibold mt-1.5 leading-relaxed whitespace-pre-wrap">
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
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.period?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.batch?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.isPreschool ? (profileData.entranceSurvey.grade || "-") : (profileData.entranceSurvey.className || "-")}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.surveySystem || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.admissionCampus || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.admissionCriteria || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.gender || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                                  <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.dateOfBirth ? new Date(profileData.entranceSurvey.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span>
                                </div>
                              </div>
                            )}

                            {/* Sub-tab: academic */}
                            {entranceSubTab === "academic" && (
                              <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                                {profileData.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Kết quả học thử</label>
                                      <span className="text-xs font-black text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryResult || "Chưa có kết quả"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Nhận xét chi tiết của giáo viên học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{profileData.entranceSurvey.probationaryComment || "Chưa có nhận xét"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Đợt học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryPeriod || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Lớp học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryClass || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Giáo viên phụ trách học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.probationaryTeacher || "-"}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Học bạ tiểu học / THCS</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{profileData.entranceSurvey.kqgdTieuHoc || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Kết quả học tập</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.kqHocTap || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Kết quả rèn luyện</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.kqRenLuyen || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Hồ sơ / Bảng điểm khác</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed">{profileData.entranceSurvey.hoSoCtQuocTe || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Học kỳ / Năm tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.hocKy || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Đối tượng tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block">{profileData.entranceSurvey.targetType || "-"}</span>
                                    </div>

                                    {profileData.entranceSurvey.oldSchoolName && (
                                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Trường học cũ & Địa chỉ</label>
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
                          {profileData.transfers?.length > 0 ? (
                            <div className="space-y-3">
                              {profileData.transfers.map(tr => (
                                <div key={tr.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-xs font-semibold text-slate-700">
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

                    {/* TAB: ACHIEVEMENTS */}
                    {activeTab === "achievements" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Thành tích & Khen thưởng của Học sinh</h4>
                        {profileData.achievements?.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa có ghi nhận giải thưởng hoặc thành tích nổi bật nào.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {profileData.achievements.map((a: any) => (
                              <div key={a.id} className="bg-amber-50/35 border-2 border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                  <Award className="w-5 h-5" />
                                </div>
                                <div className="text-xs font-semibold">
                                  <h4 className="font-black text-slate-800">{a.achievement?.name}</h4>
                                  <div className="text-amber-700 font-bold mt-1 uppercase tracking-wide text-[9px]">
                                    Cấp độ giải: {a.achievement?.level || "N/A"}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Năm học: {a.achievement?.academicYearId || "N/A"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: ORIENTATION */}
                    {activeTab === "orientation" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Định hướng Nghề nghiệp & Hướng nghiệp</h4>
                        {profileData.orientation ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Định hướng nhóm ngành</div>
                              <div className="text-sm font-black text-slate-800 mt-1">{profileData.orientation.result}</div>
                            </div>
                            {profileData.orientation.notes && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Chi tiết nhận xét của GVBM</div>
                                <p className="text-xs text-slate-600 font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200">{profileData.orientation.notes}</p>
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

                    {/* TAB: COMMITMENT */}
                    {activeTab === "commitment" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Bản cam kết học tập & Rèn luyện</h4>
                        {profileData.commitment ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái rèn luyện</span>
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                profileData.commitment.status === "COMPLETED"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : profileData.commitment.status === "VIOLATED"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}>
                                {profileData.commitment.status === "COMPLETED" ? "Đã hoàn thành tốt" : profileData.commitment.status === "VIOLATED" ? "Vi phạm" : "Đang thực hiện"}
                              </span>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                              {profileData.commitment.content}
                            </div>
                            
                            <div className="text-[9px] text-slate-400 font-bold text-right">
                              Lập bởi: {profileData.commitment.teacherName} • Cập nhật cuối: {new Date(profileData.commitment.updatedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa thiết lập bản cam kết học tập & rèn luyện cho học sinh này.</div>
                        )}
                      </div>
                    )}

                    {/* TAB: PROJECTS */}
                    {activeTab === "projects" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Dự án khoa học & Hoạt động trải nghiệm</h4>
                        {profileData.projects?.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa tham gia dự án học tập nào.</div>
                        ) : (
                          <div className="space-y-3">
                            {profileData.projects.map((p: any) => (
                              <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h4 className="font-extrabold text-sm text-slate-800">{p.projectName}</h4>
                                    <p className="text-[10px] text-[#00A99D] font-bold mt-0.5">Vai trò: {p.role || "N/A"} • Kết quả: {p.result}</p>
                                  </div>
                                </div>
                                {p.notes && (
                                  <div className="text-xs text-slate-600 bg-white border border-slate-200 p-3 rounded-lg mt-3 font-semibold">
                                    {p.notes}
                                  </div>
                                )}
                                <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2 mt-3 flex justify-between">
                                  <span>Đánh giá bởi: {p.teacherName}</span>
                                  <span>{new Date(p.updatedAt).toLocaleDateString('vi-VN')}</span>
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
                        {!(profileData as any).learningSupportTargets || (profileData as any).learningSupportTargets.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh không thuộc đối tượng nhận hỗ trợ học tập/tâm lý trong năm học này.</div>
                        ) : (
                          <div className="space-y-6">
                            {(profileData as any).learningSupportTargets.map((target: any) => {
                              const isTerminated = target.terminationStatus === "TERMINATED";
                              const isPending = target.terminationStatus === "PENDING_TERMINATION";
                              const gvName = target.assignments?.[0]?.teacher?.teacherName || "Chưa phân công";

                              return (
                                <div key={target.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
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
                                        <span className="text-slate-800">{new Date(target.startDate).toLocaleDateString("vi-VN")}</span>
                                      </div>
                                      <div>
                                        <span>Giáo viên phụ trách: </span>
                                        <span className="text-slate-800">{gvName}</span>
                                      </div>
                                      {target.endDate && (
                                        <div>
                                          <span>Ngày chấm dứt: </span>
                                          <span className="text-slate-800">{new Date(target.endDate).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                      )}
                                    </div>

                                    {target.outcome && (
                                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs font-semibold">
                                        <span className="font-extrabold">Kết quả đạt được: </span> {target.outcome}
                                      </div>
                                    )}

                                    {/* Evaluation timeline for this student target */}
                                    <div className="pt-2">
                                      <h5 className="font-black text-slate-700 text-xs uppercase tracking-wide mb-3">Nhật ký nhận xét định kỳ</h5>
                                      {!target.evaluations || target.evaluations.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic py-2">Chưa có nhận xét định kỳ từ giáo viên phụ trách.</div>
                                      ) : (
                                        <div className="relative border-l border-slate-200 pl-4 space-y-4 ml-1">
                                          {target.evaluations.map((ev: any) => (
                                            <div key={ev.id} className="relative">
                                              <span className="absolute -left-[21px] top-1 bg-indigo-500 rounded-full h-2.5 w-2.5 border border-white shadow-xs"></span>
                                              <div className="text-[10px] text-slate-400 font-bold">
                                                {new Date(ev.createdAt).toLocaleDateString("vi-VN")} - {ev.periodName} ({ev.periodType === "WEEK" ? "Tuần" : "Tháng"})
                                              </div>
                                              <div className="text-xs font-black text-indigo-700 mt-0.5">Tiến bộ: {ev.trackingLevel}</div>
                                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ev.comment}</p>
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

                    {/* TAB: COMMENTS */}
                    {activeTab === "comments" && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">Nhận xét nổi bật định kỳ từ Giáo viên Chủ nhiệm</h4>
                        {profileData.highlightComments?.filter((c: any) => c.category !== "ANNOUNCEMENT").length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa có nhận xét nổi bật định kỳ từ giáo viên chủ nhiệm.</div>
                        ) : (
                          <div className="space-y-3">
                            {profileData.highlightComments.filter((c: any) => c.category !== "ANNOUNCEMENT").map((c: any) => (
                              <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold">
                                <span className="inline-block px-2.5 py-0.5 bg-[#00A99D]/15 text-[#00A99D] text-[9px] font-black rounded-full uppercase tracking-wider mb-2">
                                  {c.category || "Chung"}
                                </span>
                                <p className="text-xs text-slate-700 bg-white border border-slate-200 p-3 rounded-lg font-semibold leading-relaxed">
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
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-12">Có lỗi xảy ra khi tải thông tin chi tiết.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
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
