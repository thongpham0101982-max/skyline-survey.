"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, Save, User, CheckCircle2 } from "lucide-react"

export default function TeacherCommitmentPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [content, setContent] = useState("")
  const [status, setStatus] = useState("ACTIVE")

  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingRecord, setLoadingRecord] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function loadClasses() {
      try {
        setLoadingClasses(true)
        const res = await fetch("/api/teacher-student-records?action=getAssignedClasses")
        if (res.ok) {
          const data = await res.json()
          setClasses(data)
          if (data.length > 0) {
            setSelectedClassId(data[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading classes:", err)
      } finally {
        setLoadingClasses(false)
      }
    }
    loadClasses()
  }, [])

  useEffect(() => {
    if (!selectedClassId) return
    
    async function loadStudents() {
      try {
        setLoadingStudents(true)
        setSelectedStudentId("")
        setSelectedStudent(null)
        setContent("")
        setStatus("ACTIVE")
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

    async function loadRecord() {
      try {
        setLoadingRecord(true)
        setMessage(null)
        const activeStudent = students.find(s => s.id === selectedStudentId)
        setSelectedStudent(activeStudent)

        const res = await fetch(`/api/teacher-student-records?action=getStudentRecord&studentId=${selectedStudentId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.commitment) {
            setContent(data.commitment.content || "")
            setStatus(data.commitment.status || "ACTIVE")
          } else {
            // Set default template
            const defaultContent = `BẢN CAM KẾT HỌC TẬP & RÈN LUYỆN\n\nHọc sinh: ${activeStudent?.studentName || ""}\nLớp: ${activeStudent?.className || activeStudent?.class?.className || ""}\n\nHọc sinh và gia đình cam kết thực hiện nghiêm túc các điều khoản rèn luyện:\n1. Đi học đúng giờ, chuyên cần học tập.\n2. Tích cực tham gia các hoạt động học tập nhóm và hoạt động trải nghiệm.\n3. Phối hợp với thầy cô giáo bộ môn để hoàn thành đầy đủ nhiệm vụ học tập.\n4. Rèn luyện đạo đức, tác phong chuẩn mực của học sinh trường Sky-Line.`
            setContent(defaultContent)
            setStatus("ACTIVE")
          }
        }
      } catch (err) {
        console.error("Error loading student record:", err)
      } finally {
        setLoadingRecord(false)
      }
    }
    loadRecord()
  }, [selectedStudentId, students])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return

    try {
      setSaving(true)
      setMessage(null)
      const res = await fetch("/api/teacher-student-records?action=saveCommitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          content,
          status
        })
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Đã lưu cam kết học tập thành công!" })
      } else {
        const errData = await res.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra khi lưu." })
      }
    } catch (err) {
      console.error("Error saving commitment:", err)
      setMessage({ type: "error", text: "Lỗi kết nối mạng." })
    } finally {
      setSaving(false)
    }
  }

  if (loadingClasses) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#00A99D] animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải danh sách lớp...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#00A99D] rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Cam kết học tập</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Xem và biên tập bản cam kết học tập rèn luyện của học sinh</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column Selection */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">1. Chọn lớp học</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A99D] transition-colors cursor-pointer"
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
                  <Loader2 className="w-5 h-5 text-[#00A99D] animate-spin" />
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
                          ? "bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/30"
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

        {/* Right column editor */}
        <div className="md:col-span-2">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Student Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">{selectedStudent?.studentName}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Mã HS: {selectedStudent?.studentCode}</p>
                </div>
              </div>

              {loadingRecord ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-8 h-8 text-[#00A99D] animate-spin opacity-50" />
                  <p className="text-slate-400 text-xs font-bold">Đang tải cam kết...</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  {message && (
                    <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{message.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                    <label className="block text-xs font-black text-slate-700 sm:col-span-1">Trạng thái cam kết</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A99D] transition-colors cursor-pointer"
                    >
                      <option value="ACTIVE">Đang hoạt động (Đang thực hiện)</option>
                      <option value="COMPLETED">Đã hoàn thành xuất sắc</option>
                      <option value="VIOLATED">Vi phạm cam kết</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">Nội dung Bản cam kết học tập</label>
                    <textarea
                      rows={10}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      required
                      placeholder="Nhập nội dung cam kết rèn luyện và học tập..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-[#00A99D] transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Lưu cam kết
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Chọn học sinh ở cột bên trái để biên tập bản cam kết học tập.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
