"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Loader2, Save, Plus, Trash2, Edit2, User, CheckCircle2 } from "lucide-react"

export default function TeacherHighlightCommentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [comments, setComments] = useState<any[]>([])
  const [editingComment, setEditingComment] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [commentText, setCommentText] = useState("")
  const [category, setCategory] = useState("Học tập")

  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingComments, setLoadingComments] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isNotGVCN, setIsNotGVCN] = useState(false)

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
            const gvcnCheckRes = await fetch("/api/teacher-student-records?action=checkGVCN")
            if (gvcnCheckRes.ok) {
              const gvcnData = await gvcnCheckRes.json()
              if (gvcnData.isGVCN) {
                setIsNotGVCN(false)
              } else {
                setIsNotGVCN(true)
              }
            } else {
              setIsNotGVCN(true)
            }
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

  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      return
    }

    async function loadComments() {
      try {
        setLoadingComments(true)
        setMessage(null)
        setShowForm(false)
        setEditingComment(null)
        const activeStudent = students.find(s => s.id === selectedStudentId)
        setSelectedStudent(activeStudent)

        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}`)
        if (res.ok) {
          const data = await res.json()
          setComments(data.highlightComments || [])
        }
      } catch (err) {
        console.error("Error loading comments:", err)
      } finally {
        setLoadingComments(false)
      }
    }
    loadComments()
  }, [selectedStudentId, students])

  const startCreate = () => {
    setEditingComment(null)
    setCommentText("")
    setCategory("Học tập")
    setShowForm(true)
    setMessage(null)
  }

  const startEdit = (c: any) => {
    setEditingComment(c)
    setCommentText(c.comment || "")
    setCategory(c.category || "Học tập")
    setShowForm(true)
    setMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return

    try {
      setSaving(true)
      setMessage(null)
      const payload = {
        id: editingComment?.id || undefined,
        studentId: selectedStudentId,
        comment: commentText,
        category
      }

      const res = await fetch("/api/teacher-student-records?action=saveHighlightComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const savedComment = await res.json()
        if (editingComment) {
          setComments(prev => prev.map(c => c.id === savedComment.id ? savedComment : c))
          setMessage({ type: "success", text: "Đã cập nhật nhận xét nổi bật thành công!" })
        } else {
          setComments(prev => [savedComment, ...prev])
          setMessage({ type: "success", text: "Đã thêm nhận xét mới thành công!" })
        }
        setShowForm(false)
      } else {
        const errData = await res.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra khi lưu." })
      }
    } catch (err) {
      console.error("Error saving comment:", err)
      setMessage({ type: "error", text: "Lỗi kết nối mạng." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhận xét nổi bật này không?")) return

    try {
      setDeletingId(id)
      setMessage(null)
      const res = await fetch("/api/teacher-student-records?action=saveHighlightComment&actionDelete=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })

      // Try actual delete highlight comment post
      const resDel = await fetch("/api/teacher-student-records?action=deleteHighlightComment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })

      if (resDel.ok) {
        setComments(prev => prev.filter(c => c.id !== id))
        setMessage({ type: "success", text: "Đã xóa nhận xét thành công!" })
        if (editingComment?.id === id) {
          setShowForm(false)
        }
      } else {
        const errData = await resDel.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra khi xóa." })
      }
    } catch (err) {
      console.error("Error deleting comment:", err)
      setMessage({ type: "error", text: "Lỗi kết nối." })
    } finally {
      setDeletingId(null)
    }
  }

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#00A99D] rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Nhận xét nổi bật (GVCN)</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">GVCN nhập nhận xét nổi bật định kỳ về học tập và rèn luyện của học sinh lớp chủ nhiệm</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Selection */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Học sinh Lớp chủ nhiệm</h3>
            <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
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

        {/* Right workspace */}
        <div className="md:col-span-2 space-y-4">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Student Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">{selectedStudent?.studentName}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Mã HS: {selectedStudent?.studentCode}</p>
                  </div>
                </div>

                {!showForm && (
                  <button
                    onClick={startCreate}
                    className="flex items-center gap-1 bg-[#00A99D] hover:bg-[#009085] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm nhận xét
                  </button>
                )}
              </div>

              {message && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* Form Editor */}
              {showForm && (
                <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                    {editingComment ? "Chỉnh sửa nhận xét nổi bật" : "Thêm mới nhận xét nổi bật"}
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Phân loại nhận xét</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A99D] transition-colors cursor-pointer"
                    >
                      <option value="Học tập">Học tập & Học thuật</option>
                      <option value="Rèn luyện">Rèn luyện & Đạo đức</option>
                      <option value="Thể chất">Thể chất & Thể thao</option>
                      <option value="Kỷ luật">Nề nếp & Kỷ luật</option>
                      <option value="Khác">Phát triển cá nhân khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nội dung nhận xét nổi bật</label>
                    <textarea
                      rows={4}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      required
                      placeholder="Nhập nhận xét cụ thể về sự tiến bộ vượt bậc, thái độ rèn luyện, năng khiếu đặc biệt của học sinh..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A99D] transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-white text-xs font-bold transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-1.5 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Lưu lại
                    </button>
                  </div>
                </form>
              )}

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#00A99D] animate-spin opacity-50" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium italic text-center py-8">Chưa có nhận xét nổi bật nào được lưu cho học sinh này.</p>
              ) : (
                <div className="space-y-4">
                  {comments.map(c => (
                    <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 bg-[#00A99D]/15 text-[#00A99D] text-[9px] font-black rounded-full uppercase tracking-wider">
                              {c.category || "Khác"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(c)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Xóa bỏ"
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-slate-700 bg-white border border-slate-200 p-3.5 rounded-xl mt-3 font-semibold leading-relaxed">
                          {c.comment}
                        </div>
                      </div>
                      
                      <div className="text-[9px] text-slate-400 font-bold border-t border-slate-200 pt-2 flex justify-between">
                        <span>Đánh giá bởi: {c.teacherName} (GVCN)</span>
                        <span>{new Date(c.updatedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Chọn học sinh ở cột bên trái để quản lý các nhận xét nổi bật.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
