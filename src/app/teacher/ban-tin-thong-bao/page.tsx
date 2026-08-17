"use client"

import { useState, useEffect } from "react"
import { 
  Bell, 
  Loader2, 
  User, 
  Send, 
  ArrowLeftRight, 
  Globe, 
  ThumbsUp, 
  MessageCircle, 
  Share2,
  Users
} from "lucide-react"

export default function TeacherAnnouncementsPage() {
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

  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileData, setProfileData] = useState<{
    transfers: any[]
    highlightComments: any[]
  } | null>(null)

  const [newPostText, setNewPostText] = useState("")
  const [postingAnnouncement, setPostingAnnouncement] = useState(false)

  // Interactive mock likes/comments state for the wall posts
  const [postLikes, setPostLikes] = useState<Record<string, { count: number, liked: boolean }>>({})
  const [postCommentsState, setPostCommentsState] = useState<Record<string, { author: string, text: string, time: string }[]>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Fetch homeroom students list
  useEffect(() => {
    if (!yearId) return
    async function loadStudents() {
      try {
        setLoadingStudents(true)
        const res = await fetch(`/api/teacher-student-records?action=getHomeroomStudents&academicYearId=${yearId}`)
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
          } else {
            setSelectedStudentId("")
            setSelectedStudent(null)
          }
        }
      } catch (err) {
        console.error("Error loading homeroom students:", err)
      } finally {
        setLoadingStudents(false)
      }
    }
    loadStudents()
  }, [yearId])

  // Fetch student details when a student is selected
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      setProfileData(null)
      return
    }

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
  }, [selectedStudentId, students, yearId])

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

  if (loadingStudents) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#48BFE3] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải danh sách học sinh...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#48BFE3] rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Bản tin & Thông báo</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Xem tin tức luân chuyển lớp và gửi thông báo cho học sinh</p>
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
                        ? "bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/30"
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

        {/* Right workspace: announcements feed */}
        <div className="md:col-span-3">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {loadingProfile ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                  <Loader2 className="w-10 h-10 text-[#48BFE3] animate-spin opacity-50" />
                  <p className="text-slate-400 text-xs font-bold">Đang tải bản tin...</p>
                </div>
              ) : profileData ? (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Bản tin & Thông báo Lớp học</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Học sinh: {selectedStudent?.studentName} ({selectedStudent?.studentCode})</p>
                    </div>
                    <span className="bg-[#E6F7F6] text-[#48BFE3] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
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
                          className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#48BFE3] outline-none min-h-[72px] resize-none bg-slate-50/50"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={postingAnnouncement || !newPostText.trim()}
                            className="px-4 py-2 bg-[#48BFE3] hover:bg-[#008b82] disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-sm text-xs flex items-center gap-1.5"
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
                        avatarColor: "bg-teal-100 text-[#48BFE3]",
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
                            <div key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                              {/* Post Header */}
                              <div className="p-4 flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full ${post.avatarColor} flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="w-4 h-4 animate-pulse" />
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
                                <div className="flex items-center gap-1 text-[#48BFE3]">
                                  <ThumbsUp className="w-3.5 h-3.5 fill-[#48BFE3]/20" />
                                  <span>{likesInfo.count} lượt thích</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>{commentsList.length} bình luận</span>
                                </div>
                              </div>

                              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-around gap-2 text-xs font-black text-slate-500 border-b">
                                <button 
                                  onClick={() => toggleLike(post.id)}
                                  className={`flex-1 py-1.5 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-all ${likesInfo.liked ? "text-[#48BFE3]" : ""}`}
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
                                      <div key={cIdx} className="flex gap-2.5 items-start animate-in fade-in duration-200">
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
                                      className="flex-1 text-[10px] font-semibold px-3 py-1.5 border border-slate-200 bg-white rounded-full focus:ring-1 focus:ring-[#48BFE3] outline-none"
                                      onKeyDown={e => {
                                        if (e.key === "Enter") {
                                          handleAddComment(post.id, selectedStudent?.className ? `GVCN lớp ${selectedStudent.className}` : "Giáo viên chủ nhiệm");
                                        }
                                      }}
                                    />
                                    <button 
                                      onClick={() => handleAddComment(post.id, selectedStudent?.className ? `GVCN lớp ${selectedStudent.className}` : "Giáo viên chủ nhiệm")}
                                      className="p-1.5 bg-[#48BFE3] hover:bg-[#008b82] text-white rounded-full transition-colors flex items-center justify-center"
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
              ) : null}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Chọn học sinh lớp chủ nhiệm ở danh sách cột bên trái để xem bản tin và chia sẻ thông báo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
