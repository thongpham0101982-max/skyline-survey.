"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Compass, Users, Calendar, Plus, Search, FileText, CheckCircle2,
  AlertTriangle, AlertCircle, Heart, MessageSquare, Send, Save, Download,
  Printer, Filter, RefreshCw, ChevronRight, Check, X, ShieldAlert, Sparkles, UserCheck
} from "lucide-react"

export default function TeacherAdvisoryPage() {
  const { data: session } = useSession()
  const [academicYearId, setAcademicYearId] = useState("")
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"consultations" | "warnings" | "help_requests" | "goals_management">("consultations")

  // Consultation states
  const [consultations, setConsultations] = useState<any[]>([])
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [consultForm, setConsultForm] = useState({
    id: "",
    studentId: "",
    meetingDate: new Date().toISOString().split("T")[0],
    content: "",
    difficulties: "",
    nextActions: "",
    deadline: "",
    notes: ""
  })

  // Warning states
  const [statusWarnings, setStatusWarnings] = useState<any[]>([])

  // Help requests state
  const [helpRequests, setHelpRequests] = useState<any[]>([])
  const [responseModal, setResponseModal] = useState<any>(null)
  const [responseNotes, setResponseNotes] = useState("")

  // Search filter
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const storedYear = typeof window !== "undefined" ? localStorage.getItem("selectedAcademicYear") || "" : ""
    setAcademicYearId(storedYear)

    const handleYearChange = () => {
      const updatedYear = localStorage.getItem("selectedAcademicYear") || ""
      setAcademicYearId(updatedYear)
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [])

  useEffect(() => {
    if (!academicYearId) return
    async function loadClasses() {
      try {
        setLoading(true)
        const res = await fetch("/api/teacher-student-records?action=getHomeroomStudents&academicYearId=" + academicYearId)
        if (res.ok) {
          const data = await res.json()
          setStudents(data || [])
          if (data.length > 0 && data[0].classId) {
            setSelectedClassId(data[0].classId)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadClasses()
  }, [academicYearId])

  useEffect(() => {
    if (!selectedClassId) return
    loadConsultations()
    loadStatusWarnings()
    loadHelpRequests()
  }, [selectedClassId, academicYearId])

  async function loadConsultations() {
    try {
      const res = await fetch(`/api/advisory/consultations?classId=${selectedClassId}&academicYearId=${academicYearId}`)
      if (res.ok) setConsultations(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function loadStatusWarnings() {
    try {
      const res = await fetch(`/api/advisory/status-warnings?classId=${selectedClassId}&academicYearId=${academicYearId}`)
      if (res.ok) setStatusWarnings(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function loadHelpRequests() {
    try {
      const res = await fetch(`/api/advisory/help-requests?classId=${selectedClassId}`)
      if (res.ok) setHelpRequests(await res.json())
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSaveConsultation() {
    if (!consultForm.studentId || !consultForm.content) {
      alert("Vui lòng chọn học sinh và nhập nội dung trao đổi")
      return
    }
    try {
      const res = await fetch("/api/advisory/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...consultForm,
          academicYearId
        })
      })
      if (res.ok) {
        setShowConsultModal(false)
        setConsultForm({
          id: "",
          studentId: "",
          meetingDate: new Date().toISOString().split("T")[0],
          content: "",
          difficulties: "",
          nextActions: "",
          deadline: "",
          notes: ""
        })
        loadConsultations()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleUpdateWarning(studentId: string, statusColor: string, reasonCategory: string, reasonDetail: string) {
    try {
      const res = await fetch("/api/advisory/status-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          statusColor,
          reasonCategory,
          reasonDetail
        })
      })
      if (res.ok) loadStatusWarnings()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleResolveHelpRequest(id: string, status: string) {
    try {
      const res = await fetch("/api/advisory/help-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, responseNotes })
      })
      if (res.ok) {
        setResponseModal(null)
        setResponseNotes("")
        loadHelpRequests()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredStudents = students.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const greenCount = statusWarnings.filter(w => w.statusColor === "GREEN").length
  const yellowCount = statusWarnings.filter(w => w.statusColor === "YELLOW").length
  const redCount = statusWarnings.filter(w => w.statusColor === "RED").length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 border border-white/20 text-teal-100 uppercase tracking-wider backdrop-blur-md">
            <Compass className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
            <span>HỆ THỐNG CỐ VẤN HỌC TẬP SKY-LINE</span>
          </div>
          <h1 className="text-2xl font-black text-white">Chăm Sóc & Theo Dõi Học Sinh 360°</h1>
          <p className="text-xs text-teal-100/90 font-medium">Quản lý nhật ký tham vấn, cập nhật trạng thái cảnh báo sớm 🟢🟡🔴 và tiếp nhận yêu cầu SOS.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setConsultForm({
                id: "",
                studentId: students[0]?.id || "",
                meetingDate: new Date().toISOString().split("T")[0],
                content: "",
                difficulties: "",
                nextActions: "",
                deadline: "",
                notes: ""
              })
              setShowConsultModal(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Nhật Ký Tham Vấn</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">TỔNG SỐ HỌC SINH</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{students.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Lớp chủ nhiệm</p>
          </div>
          <div className="p-3 rounded-2xl bg-teal-50 text-[#00A99D]">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">🟢 ỔN ĐỊNH</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{greenCount || (students.length - yellowCount - redCount)}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Học tập & rèn luyện tốt</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">🟡 CẦN CHÚ Ý</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{yellowCount}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Cần theo dõi thêm</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">🔴 CẦN HỖ TRỢ</p>
            <p className="text-2xl font-black text-rose-700 mt-1">{redCount}</p>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Cần tham vấn gấp</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("consultations")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === "consultations"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Nhật Ký Tham Vấn CVHT ({consultations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("warnings")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeTab === "warnings"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Cảnh Báo Sớm 🟢🟡🔴</span>
            </button>

            <button
              onClick={() => setActiveTab("help_requests")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 relative ${
                activeTab === "help_requests"
                  ? "bg-[#003B3A] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Yêu Cầu "Em Cần Hỗ Trợ" ({helpRequests.length})</span>
              {helpRequests.filter(r => r.status === "PENDING").length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00A99D] w-56"
            />
          </div>
        </div>

        {/* Tab 1: Nhật Ký Tham Vấn */}
        {activeTab === "consultations" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Ngày gặp</th>
                    <th className="p-3">Học sinh</th>
                    <th className="p-3">Nội dung trao đổi</th>
                    <th className="p-3">Khó khăn ghi nhận</th>
                    <th className="p-3">Hành động tiếp theo</th>
                    <th className="p-3">Thời hạn</th>
                    <th className="p-3">Ghi chú</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {consultations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        Chưa có nhật ký tham vấn nào cho lớp học này.
                      </td>
                    </tr>
                  ) : (
                    consultations.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {new Date(item.meetingDate).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="p-3">
                          <span className="font-extrabold text-[#003B3A]">{item.student?.studentName}</span>
                          <span className="block text-[10px] text-slate-400">{item.student?.studentCode}</span>
                        </td>
                        <td className="p-3 max-w-xs">{item.content}</td>
                        <td className="p-3 max-w-xs text-rose-700 font-semibold">{item.difficulties || "—"}</td>
                        <td className="p-3 max-w-xs text-emerald-800 font-semibold">{item.nextActions || "—"}</td>
                        <td className="p-3 whitespace-nowrap">
                          {item.deadline ? new Date(item.deadline).toLocaleDateString("vi-VN") : "—"}
                        </td>
                        <td className="p-3 max-w-xs text-slate-500">{item.notes || "—"}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              setConsultForm({
                                id: item.id,
                                studentId: item.studentId,
                                meetingDate: item.meetingDate.split("T")[0],
                                content: item.content || "",
                                difficulties: item.difficulties || "",
                                nextActions: item.nextActions || "",
                                deadline: item.deadline ? item.deadline.split("T")[0] : "",
                                notes: item.notes || ""
                              })
                              setShowConsultModal(true)
                            }}
                            className="text-xs font-extrabold text-teal-600 hover:text-teal-800 underline"
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Cảnh Báo Sớm 🟢🟡🔴 */}
        {activeTab === "warnings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStudents.map((st) => {
                const warningObj = statusWarnings.find(w => w.studentId === st.id) || { statusColor: "GREEN", reasonDetail: "Ổn định" }
                return (
                  <div key={st.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs hover:border-teal-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{st.studentName}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Mã HS: {st.studentCode}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        warningObj.statusColor === "RED"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : warningObj.statusColor === "YELLOW"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}>
                        {warningObj.statusColor === "RED" ? "🔴 Cần hỗ trợ" : warningObj.statusColor === "YELLOW" ? "🟡 Cần chú ý" : "🟢 Ổn định"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateWarning(st.id, "GREEN", "HOC_TAP", "Học sinh học tập & rèn luyện tốt")}
                        className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        🟢 Ổn định
                      </button>
                      <button
                        onClick={() => handleUpdateWarning(st.id, "YELLOW", "TAM_LY", "Cần theo dõi thêm về tâm lý/học tập")}
                        className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        🟡 Cần chú ý
                      </button>
                      <button
                        onClick={() => handleUpdateWarning(st.id, "RED", "HOC_TAP", "Cần tham vấn gấp với GVCN & Gia đình")}
                        className="flex-1 py-1 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                      >
                        🔴 Cần hỗ trợ
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Yêu Cầu "Em Cần Hỗ Trợ" (SOS) */}
        {activeTab === "help_requests" && (
          <div className="space-y-4">
            <div className="space-y-3">
              {helpRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold border border-dashed border-slate-200 rounded-2xl">
                  Chưa có yêu cầu hỗ trợ SOS nào từ học sinh.
                </div>
              ) : (
                helpRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 uppercase">
                          {req.urgency}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">{req.student?.studentName}</h4>
                        <span className="text-[10px] text-slate-400">({req.student?.studentCode})</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{req.content}</p>
                      <p className="text-[10px] text-slate-400">
                        Gửi lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === "RESOLVED" ? (
                        <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Đã xử lý</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setResponseModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-extrabold hover:bg-[#004D4A]"
                        >
                          Phản hồi & Xử lý
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit Consultation */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {consultForm.id ? "Sửa Nhật Ký Tham Vấn" : "Thêm Nhật Ký Tham Vấn CVHT mới"}
              </h3>
              <button onClick={() => setShowConsultModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-extrabold text-slate-700">Học sinh *</label>
                <select
                  value={consultForm.studentId}
                  onChange={(e) => setConsultForm({ ...consultForm, studentId: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.studentName} ({s.studentCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700">Ngày gặp *</label>
                <input
                  type="date"
                  value={consultForm.meetingDate}
                  onChange={(e) => setConsultForm({ ...consultForm, meetingDate: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700">Nội dung trao đổi *</label>
                <textarea
                  rows={2}
                  value={consultForm.content}
                  onChange={(e) => setConsultForm({ ...consultForm, content: e.target.value })}
                  placeholder="Nhập chi tiết nội dung tham vấn..."
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700">Khó khăn ghi nhận</label>
                  <input
                    type="text"
                    value={consultForm.difficulties}
                    onChange={(e) => setConsultForm({ ...consultForm, difficulties: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700">Hành động tiếp theo</label>
                  <input
                    type="text"
                    value={consultForm.nextActions}
                    onChange={(e) => setConsultForm({ ...consultForm, nextActions: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700">Ghi chú</label>
                <input
                  type="text"
                  value={consultForm.notes}
                  onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowConsultModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveConsultation}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-extrabold hover:bg-[#004D4A]"
              >
                Lưu Nhật Ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Response Help Request */}
      {responseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">Phản hồi Yêu cầu "Em Cần Hỗ Trợ"</h3>
            <p className="text-xs text-slate-600">Nội dung của <strong>{responseModal.student?.studentName}</strong>: "{responseModal.content}"</p>
            <div>
              <label className="text-xs font-extrabold text-slate-700">Lời nhắn phản hồi đến học sinh:</label>
              <textarea
                rows={3}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="Nhập lời khuyên hoặc hẹn giờ gặp tham vấn..."
                className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setResponseModal(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Hủy</button>
              <button
                onClick={() => handleResolveHelpRequest(responseModal.id, "RESOLVED")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black"
              >
                Xác nhận Đã Xử Lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
