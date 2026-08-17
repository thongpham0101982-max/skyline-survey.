"use client"

import { useState, useEffect } from "react"
import { BookOpen, Loader2, Save, Plus, Trash2, Edit2, User, CheckCircle2 } from "lucide-react"

export default function TeacherProjectsPage() {
  const [classes, setClasses] = useState<any[]>([])
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
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [projects, setProjects] = useState<any[]>([])
  const [editingProject, setEditingProject] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [projectName, setProjectName] = useState("")
  const [role, setRole] = useState("")
  const [result, setResult] = useState("")
  const [notes, setNotes] = useState("")

  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (!yearId) return
    async function loadClasses() {
      try {
        setLoadingClasses(true)
        const res = await fetch(`/api/teacher-student-records?action=getAssignedClasses&academicYearId=${yearId}`)
        if (res.ok) {
          const data = await res.json()
          setClasses(data)
          if (data.length > 0) {
            setSelectedClassId(data[0].id)
          } else {
            setSelectedClassId("")
            setStudents([])
          }
        }
      } catch (err) {
        console.error("Error loading classes:", err)
      } finally {
        setLoadingClasses(false)
      }
    }
    loadClasses()
  }, [yearId])

  useEffect(() => {
    if (!selectedClassId) return
    
    async function loadStudents() {
      try {
        setLoadingStudents(true)
        setSelectedStudentId("")
        setSelectedStudent(null)
        setProjects([])
        setShowForm(false)
        const res = await fetch(`/api/teacher-student-records?action=getClassStudents&classId=${selectedClassId}`)
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
          if (data.length > 0) {
            setSelectedStudentId(data[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading students:", err)
      } finally {
        setLoadingStudents(false)
      }
    }
    loadStudents()
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      return
    }

    async function loadStudentRecord() {
      try {
        setLoadingProjects(true)
        setMessage(null)
        setShowForm(false)
        setEditingProject(null)
        const activeStudent = students.find(s => s.id === selectedStudentId)
        setSelectedStudent(activeStudent)

        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch (err) {
        console.error("Error loading projects:", err)
      } finally {
        setLoadingProjects(false)
      }
    }
    loadStudentRecord()
  }, [selectedStudentId, students])

  const startCreate = () => {
    setEditingProject(null)
    setProjectName("")
    setRole("")
    setResult("")
    setNotes("")
    setShowForm(true)
    setMessage(null)
  }

  const startEdit = (p: any) => {
    setEditingProject(p)
    setProjectName(p.projectName || "")
    setRole(p.role || "")
    setResult(p.result || "")
    setNotes(p.notes || "")
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
        id: editingProject?.id || undefined,
        studentId: selectedStudentId,
        projectName,
        role,
        result,
        notes
      }

      const res = await fetch("/api/teacher-student-records?action=saveProjectExperience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const savedProject = await res.json()
        if (editingProject) {
          setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p))
          setMessage({ type: "success", text: "Đã cập nhật dự án thành công!" })
        } else {
          setProjects(prev => [savedProject, ...prev])
          setMessage({ type: "success", text: "Đã thêm dự án mới thành công!" })
        }
        setShowForm(false)
      } else {
        const errData = await res.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra." })
      }
    } catch (err) {
      console.error("Error saving project:", err)
      setMessage({ type: "error", text: "Lỗi kết nối mạng." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đánh giá dự án này không?")) return

    try {
      setDeletingId(id)
      setMessage(null)
      const res = await fetch("/api/teacher-student-records?action=deleteProjectExperience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      })

      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id))
        setMessage({ type: "success", text: "Đã xóa dự án thành công!" })
        if (editingProject?.id === id) {
          setShowForm(false)
        }
      } else {
        const errData = await res.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra khi xóa." })
      }
    } catch (err) {
      console.error("Error deleting project:", err)
      setMessage({ type: "error", text: "Lỗi kết nối." })
    } finally {
      setDeletingId(null)
    }
  }

  if (loadingClasses) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#36E08F] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải danh sách lớp...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#36E08F] rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Quản lý: Dự án & Trải nghiệm</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Theo dõi kết quả thực hiện các dự án nghiên cứu học tập và hoạt động trải nghiệm</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left selection column */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">1. Chọn lớp học</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#36E08F] transition-colors cursor-pointer"
              >
                {classes.length === 0 ? (
                  <option value="">Không có lớp học nào</option>
                ) : (
                  classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">2. Danh sách học sinh</label>
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#36E08F] animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Không có học sinh nào</p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {students.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        selectedStudentId === s.id
                          ? "bg-[#36E08F]/10 text-[#36E08F] border border-[#36E08F]/30"
                          : "text-slate-600 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <span className="truncate">{s.studentName}</span>
                      <span className="text-[9px] opacity-60 font-semibold">{s.studentCode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right workspace column */}
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
                    className="flex items-center gap-1 bg-[#36E08F] hover:bg-[#009085] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm dự án
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
                    {editingProject ? "Chỉnh sửa đánh giá dự án" : "Thêm mới đánh giá dự án"}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Dự án / Trải nghiệm</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        required
                        placeholder="Ví dụ: Robot dọn rác mini, STEM..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#36E08F] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Vai trò học sinh</label>
                      <input
                        type="text"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        placeholder="Ví dụ: Trưởng nhóm, Thành viên..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#36E08F] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Kết quả đánh giá (Đạt / Không đạt / Xuất sắc)</label>
                    <input
                      type="text"
                      value={result}
                      onChange={e => setResult(e.target.value)}
                      required
                      placeholder="Ví dụ: Xuất sắc, Hoàn thành tốt..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#36E08F] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nhận xét chi tiết</label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Nhận xét tinh thần làm việc nhóm, kỹ năng thuyết trình, kết quả cụ thể..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#36E08F] transition-all resize-none"
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
                      className="flex items-center gap-1.5 bg-[#36E08F] hover:bg-[#009085] text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Lưu lại
                    </button>
                  </div>
                </form>
              )}

              {/* Projects List */}
              {loadingProjects ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#36E08F] animate-spin opacity-50" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium italic text-center py-8">Chưa có dự án nào được ghi nhận cho học sinh này.</p>
              ) : (
                <div className="space-y-4">
                  {projects.map(p => (
                    <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-800">{p.projectName}</h4>
                            <p className="text-[10px] text-[#36E08F] font-bold mt-0.5">Vai trò: {p.role || "N/A"} • Kết quả: {p.result}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(p)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Xóa bỏ"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {p.notes && (
                          <div className="text-xs text-slate-600 bg-white border border-slate-200 p-3 rounded-xl mt-3 font-semibold">
                            {p.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-[9px] text-slate-400 font-bold border-t border-slate-200 pt-2 flex justify-between">
                        <span>Đánh giá bởi: {p.teacherName}</span>
                        <span>{new Date(p.updatedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Chọn học sinh ở cột bên trái để quản lý dự án & hoạt động trải nghiệm.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
