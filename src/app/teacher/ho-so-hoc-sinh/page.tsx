"use client"

import { useState, useEffect } from "react"
import { 
  Users, Loader2, User, Award, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, ThumbsUp, MessageCircle, Share2, Send, Globe, Camera
} from "lucide-react"

export default function TeacherStudentProfilePage() {
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("entrance")
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isNotGVCN, setIsNotGVCN] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState("")
  const [newPostText, setNewPostText] = useState("")
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)
  
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
    async function loadHomeroomStudents() {
      try {
        setLoadingStudents(true)
        const res = await fetch("/api/teacher-student-records?action=getHomeroomStudents")
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
          } else {
            setIsNotGVCN(true)
          }
        } else {
          setIsNotGVCN(true)
        }
      } catch (err) {
        console.error("Error loading homeroom students:", err)
        setIsNotGVCN(true)
      } finally {
        setLoadingStudents(false)
      }
    }
    loadHomeroomStudents()
  }, [])

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
        const profileRes = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}`)
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

        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}`)
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
        <p className="text-xs font-semibold">Trang này chỉ dành riêng cho Giáo viên Chủ nhiệm (GVCN). Bạn không có lớp chủ nhiệm nào được chỉ định trong năm học này.</p>
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
    { id: "comments", label: "Nhận xét nổi bật", icon: MessageSquare }
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
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    selectedStudentId === s.id
                      ? "bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/30"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div>
                    <div className="truncate font-black">{s.studentName}</div>
                    <div className="text-[9px] opacity-60 font-bold mt-0.5">{s.className || "Lớp chủ nhiệm"}</div>
                  </div>
                  <span className="text-[9px] opacity-60 font-semibold">{s.studentCode}</span>
                </button>
              ))}
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
                            {/* Summary Box */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold">
                              <div>Cơ sở đăng ký: <span className="text-slate-800">{profileData.entranceSurvey.admissionCampus || "N/A"}</span></div>
                              <div>Kết quả tuyển sinh: <span className="text-slate-800">{profileData.entranceSurvey.admissionResult || "Chưa xác định"}</span></div>
                            </div>

                            {/* Scores details */}
                            {profileData.entranceSurvey.type === "PRESCHOOL" ? (
                              <div className="space-y-4">
                                <h5 className="text-xs font-black text-slate-700">Đánh giá Phát triển Mầm non:</h5>
                                <div className="space-y-2">
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
                            ) : (
                              <div className="space-y-4">
                                <h5 className="text-xs font-black text-slate-700">Điểm số các môn khảo sát:</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Toán</div>
                                    <div className="text-xl font-extrabold text-slate-800 mt-1">{profileData.entranceSurvey.mathScore ?? "N/A"}</div>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Văn</div>
                                    <div className="text-xl font-extrabold text-slate-800 mt-1">{profileData.entranceSurvey.literatureScore ?? "N/A"}</div>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Anh viết</div>
                                    <div className="text-xl font-extrabold text-slate-800 mt-1">{profileData.entranceSurvey.writtenEnglishScore ?? "N/A"}</div>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Anh nói</div>
                                    <div className="text-xl font-extrabold text-slate-800 mt-1">{profileData.entranceSurvey.oralEnglishScore ?? "N/A"}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500 font-semibold space-y-1 mt-2">
                                  <div>• Đánh giá tâm lý học sinh: <span className="font-bold text-slate-800">{profileData.entranceSurvey.psychologyScore ?? "N/A"}</span></div>
                                  <div>• Kết quả học tập cấp trước: <span className="font-bold text-slate-800">{profileData.entranceSurvey.kqHocTap ?? "N/A"}</span></div>
                                  <div>• Kết quả rèn luyện cấp trước: <span className="font-bold text-slate-800">{profileData.entranceSurvey.kqRenLuyen ?? "N/A"}</span></div>
                                </div>
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

                    {/* TAB: ANNOUNCEMENTS */}
                    {activeTab === "announcements" && (
                      <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Bản tin & Thông báo Lớp học</h4>
                          <span className="bg-[#E6F7F6] text-[#00A99D] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Facebook Feed
                          </span>
                        </div>

                        {/* Facebook-style Write Post Box */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                            <form onSubmit={handleCreatePostSubmit} className="flex-1 space-y-3">
                              <textarea
                                value={newPostText}
                                onChange={e => setNewPostText(e.target.value)}
                                placeholder={`Chia sẻ thông báo hoặc bản tin lớp học cho học sinh ${selectedStudent?.studentName}...`}
                                className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00A99D] outline-none min-h-[72px] resize-none bg-slate-50/50"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  disabled={postingAnnouncement || !newPostText.trim()}
                                  className="px-4 py-2 bg-[#00A99D] hover:bg-[#008b82] disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-sm text-xs flex items-center gap-1.5"
                                >
                                  <Send className="w-3 h-3" />
                                  {postingAnnouncement ? "Đang đăng..." : "Đăng tin"}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>

                        {/* Combined feed list */}
                        {(() => {
                          const sysPosts = (profileData.transfers || []).map((tr: any) => ({
                            id: `transfer-${tr.id}`,
                            type: "SYSTEM",
                            author: "Hệ thống Luân chuyển Học sinh",
                            avatarColor: "bg-orange-100 text-orange-600",
                            avatarIcon: ArrowLeftRight,
                            content: tr.type === "IN" 
                              ? `📢 BẢN TIN LUÂN CHUYỂN: Học sinh ${selectedStudent?.studentName} đã chính thức LUÂN CHUYỂN ĐẾN lớp ${selectedStudent?.className} từ trường ${tr.destinationSchool || "N/A"} vào ngày ${new Date(tr.transferDate).toLocaleDateString('vi-VN')}. Lý do: ${tr.reason || "Không có"}.`
                              : tr.type === "OUT"
                              ? `📢 BẢN TIN LUÂN CHUYỂN: Học sinh ${selectedStudent?.studentName} đã thực hiện thủ tục LUÂN CHUYỂN ĐI vào ngày ${new Date(tr.transferDate).toLocaleDateString('vi-VN')}. Trường chuyển đến: ${tr.destinationSchool || "N/A"}. Lý do: ${tr.reason || "Không có"}.`
                              : `📢 BẢN TIN LUÂN CHUYỂN: Học sinh ${selectedStudent?.studentName} đã được điều chuyển lớp vào ngày ${new Date(tr.transferDate).toLocaleDateString('vi-VN')}. Lý do: ${tr.reason || "Không có"}.`,
                            date: new Date(tr.transferDate)
                          }));

                          const teacherPosts = (profileData.highlightComments || [])
                            .filter((c: any) => c.category === "ANNOUNCEMENT")
                            .map((c: any) => ({
                              id: `announcement-${c.id}`,
                              type: "TEACHER",
                              author: c.teacherName || "Giáo viên chủ nhiệm",
                              avatarColor: "bg-teal-100 text-[#00A99D]",
                              avatarIcon: User,
                              content: c.comment,
                              date: new Date(c.updatedAt)
                            }));

                          const combinedFeed = [...sysPosts, ...teacherPosts].sort((a, b) => b.date.getTime() - a.date.getTime());

                          if (combinedFeed.length === 0) {
                            return (
                              <div className="text-xs text-slate-400 italic text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                Chưa có thông báo hoặc hoạt động luân chuyển nào được ghi nhận trên bảng tin.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              {combinedFeed.map(post => {
                                const Icon = post.avatarIcon;
                                const likesInfo = postLikes[post.id] || { count: 0, liked: false };
                                const commentsList = postCommentsState[post.id] || [];
                                const commentText = newCommentTexts[post.id] || "";

                                return (
                                  <div key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                    {/* Post Header */}
                                    <div className="p-4 flex items-center gap-3">
                                      <div className={`w-9 h-9 rounded-full ${post.avatarColor} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-xs font-black text-slate-800 leading-tight truncate">{post.author}</h5>
                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                          <span>{post.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                          <span>•</span>
                                          <Globe className="w-2.5 h-2.5" />
                                        </p>
                                      </div>
                                    </div>

                                    {/* Post Content */}
                                    <div className="px-4 pb-3.5 text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                                      {post.content}
                                    </div>

                                    {/* Post Footer / Actions */}
                                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] font-black text-slate-500 select-none">
                                      <div className="flex items-center gap-1 text-[#00A99D]">
                                        <ThumbsUp className="w-3.5 h-3.5 fill-[#00A99D]/20" />
                                        <span>{likesInfo.count} lượt thích</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span>{commentsList.length} bình luận</span>
                                      </div>
                                    </div>

                                    <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-around gap-2 text-xs font-black text-slate-500 border-b">
                                      <button 
                                        onClick={() => toggleLike(post.id)}
                                        className={`flex-1 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-all ${likesInfo.liked ? "text-[#00A99D]" : ""}`}
                                      >
                                        <ThumbsUp className={`w-4 h-4 ${likesInfo.liked ? "fill-current" : ""}`} />
                                        <span>Thích</span>
                                      </button>
                                      <button className="flex-1 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
                                        <MessageCircle className="w-4 h-4" />
                                        <span>Bình luận</span>
                                      </button>
                                      <button className="flex-1 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
                                        <Share2 className="w-4 h-4" />
                                        <span>Chia sẻ</span>
                                      </button>
                                    </div>

                                    {/* Comments section */}
                                    <div className="p-4 bg-slate-50/30 space-y-3">
                                      {commentsList.length > 0 && (
                                        <div className="space-y-2">
                                          {commentsList.map((comm, cIdx) => (
                                            <div key={cIdx} className="flex gap-2.5 items-start">
                                              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                <User className="w-3.5 h-3.5" />
                                              </div>
                                              <div className="bg-slate-100 p-2.5 rounded-2xl text-[10px] font-semibold text-slate-700 flex-1 leading-snug">
                                                <span className="font-black text-slate-800 mr-1.5">{comm.author}</span>
                                                {comm.text}
                                                <div className="text-[8px] text-slate-400 font-bold mt-1">{comm.time}</div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Add comment input */}
                                      <div className="flex gap-2.5 items-center">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                                          <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                          <input
                                            type="text"
                                            value={commentText}
                                            onChange={e => setNewCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                            placeholder="Viết bình luận..."
                                            className="flex-1 text-[10px] font-semibold px-3 py-1.5 border border-slate-200 bg-white rounded-full focus:ring-1 focus:ring-[#00A99D] outline-none"
                                            onKeyDown={e => {
                                              if (e.key === "Enter") {
                                                handleAddComment(post.id, selectedStudent?.className ? `GVCN lớp ${selectedStudent.className}` : "Giáo viên chủ nhiệm");
                                              }
                                            }}
                                          />
                                          <button 
                                            onClick={() => handleAddComment(post.id, selectedStudent?.className ? `GVCN lớp ${selectedStudent.className}` : "Giáo viên chủ nhiệm")}
                                            className="p-1.5 bg-[#00A99D] hover:bg-[#008b82] text-white rounded-full transition-colors flex items-center justify-center"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
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
