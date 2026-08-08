"use client"

import { useState, useEffect, useMemo } from "react"
import { Compass, Loader2, Save, BookOpen, User, CheckCircle2, Edit3, Eye, Search, FileSpreadsheet, RefreshCcw } from "lucide-react"

export default function TeacherOrientationPage() {
  const [yearId, setYearId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    return ""
  })

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored && stored !== yearId) {
        setYearId(stored)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [yearId])

  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form fields
  const [formSurveyResult, setFormSurveyResult] = useState("")
  const [formInitialOrientation, setFormInitialOrientation] = useState("")
  const [formGvcnRemark, setFormGvcnRemark] = useState("")
  const [formGvbmRemark, setFormGvbmRemark] = useState("")
  const [formCounselingResult, setFormCounselingResult] = useState("")
  const [formStatus, setFormStatus] = useState("DA_TU_VAN")
  const [formNotes, setFormNotes] = useState("")

  useEffect(() => {
    if (!yearId) return
    async function loadAssignedClasses() {
      try {
        const res = await fetch("/api/ktdbcl/huong-nghiep?action=getAssignedClasses&academicYearId=" + yearId)
        if (res.ok) {
          const data = await res.json()
          setClasses(data)
        }
      } catch (err) {
        console.error("Error loading assigned classes:", err)
      }
    }
    loadAssignedClasses()
  }, [yearId])

  const fetchRecords = async () => {
    if (!yearId) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: yearId,
        action: "getLogbook"
      })
      if (selectedClassId) params.append("classId", selectedClassId)
      if (searchQuery) params.append("search", searchQuery)

      const res = await fetch("/api/ktdbcl/huong-nghiep?" + params.toString())
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (err) {
      console.error("Error fetching logbook records:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [yearId, selectedClassId, searchQuery])

  const openEditModal = (rec: any) => {
    setEditingRecord(rec)
    setFormSurveyResult(rec.surveyResult || "")
    setFormInitialOrientation(rec.initialOrientation || "")
    setFormGvcnRemark(rec.gvcnRemark || "")
    setFormGvbmRemark(rec.gvbmRemark || "")
    setFormCounselingResult(rec.counselingResult || "")
    setFormStatus(rec.status === "CHUA_TU_VAN" ? "DA_TU_VAN" : rec.status)
    setFormNotes(rec.notes || "")
    setIsModalOpen(true)
    setMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return
    try {
      setSaving(true)
      setMessage(null)
      const res = await fetch("/api/ktdbcl/huong-nghiep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editingRecord.studentId,
          academicYearId: yearId,
          surveyResult: formSurveyResult,
          initialOrientation: formInitialOrientation,
          gvcnRemark: formGvcnRemark,
          gvbmRemark: formGvbmRemark,
          counselingResult: formCounselingResult,
          status: formStatus,
          notes: formNotes
        })
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Lưu sổ theo dõi hướng nghiệp thành công!" })
        setIsModalOpen(false)
        fetchRecords()
      } else {
        const errData = await res.json()
        setMessage({ type: "error", text: errData.error || "Có lỗi xảy ra." })
      }
    } catch (err) {
      console.error("Error saving logbook record:", err)
      setMessage({ type: "error", text: "Lỗi kết nối mạng." })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "HOAN_THANH":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Hoàn thành</span>
      case "CAN_THEO_DOI":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">⚠ Cần theo dõi</span>
      case "DA_TU_VAN":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">💬 Đã tư vấn</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">○ Chưa tư vấn</span>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <Compass className="w-7 h-7 text-teal-200" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sổ Theo dõi Hướng nghiệp</h1>
            <p className="text-teal-100 text-xs font-normal mt-1">
              Nhật ký tư vấn hướng nghiệp học sinh dành cho Giáo viên Chủ nhiệm (GVCN) & Giáo viên Bộ môn (GVBM)
            </p>
          </div>
        </div>
        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur-md shrink-0"
        >
          <RefreshCcw className="w-4 h-4" /> Tải lại dữ liệu
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp được phân công:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">-- Tất cả các Lớp phân công --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.className}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên hoặc mã học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs font-bold border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Logbook Table 11 Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            Sổ Theo dõi Hướng nghiệp Lớp ({records.length} học sinh)
          </h2>
          <span className="text-xs text-slate-400 font-medium">Bổ sung cột Nhận xét GVCN, GVBM & Kết quả tư vấn</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            Đang tải dữ liệu sổ theo dõi hướng nghiệp...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            Chưa có học sinh nào trong lớp được phân công.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 w-28">Mã HS</th>
                  <th className="py-3.5 px-4 w-20">Lớp</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Họ tên Học sinh</th>
                  <th className="py-3.5 px-4 min-w-[120px]">KQKS</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Định hướng ban đầu</th>
                  <th className="py-3.5 px-4 min-w-[160px] bg-teal-50/40 text-teal-900">Cột Nhận xét GVCN</th>
                  <th className="py-3.5 px-4 min-w-[160px] bg-sky-50/40 text-sky-900">Cột Nhận xét GVBM</th>
                  <th className="py-3.5 px-4 min-w-[160px] bg-emerald-50/40 text-emerald-900">Cột Kết quả tư vấn</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Người tư vấn</th>
                  <th className="py-3.5 px-4 text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-teal-50/30 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{r.studentCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-700">{r.className}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{r.studentName}</td>
                    <td className="py-3 px-4">
                      {r.surveyResult ? (
                        <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-md font-semibold border border-violet-200 block text-center">
                          {r.surveyResult}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa KS</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{r.initialOrientation || "Chưa có"}</td>
                    <td className="py-3 px-4 bg-teal-50/20 text-slate-700">
                      {r.gvcnRemark ? (
                        <p className="line-clamp-2 text-xs font-medium">{r.gvcnRemark}</p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa nhập nhận xét GVCN</span>
                      )}
                    </td>
                    <td className="py-3 px-4 bg-sky-50/20 text-slate-700">
                      {r.gvbmRemark ? (
                        <p className="line-clamp-2 text-xs font-medium">{r.gvbmRemark}</p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa nhập nhận xét GVBM</span>
                      )}
                    </td>
                    <td className="py-3 px-4 bg-emerald-50/20 font-bold text-emerald-900">
                      {r.counselingResult || <span className="text-slate-400 italic font-normal text-[11px]">Chưa có KQ tư vấn</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{r.counselorName}</div>
                      <div className="text-[10px] text-slate-400">{r.counselorRole}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openEditModal(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Ghi Sổ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Edit / Update Entry */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Nhập Sổ Theo Dõi Hướng Nghiệp
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Học sinh: {editingRecord.studentName} - Mã HS: {editingRecord.studentCode} ({editingRecord.className})
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">KQKS (Kết quả khảo sát)</label>
                  <input
                    type="text"
                    placeholder="KQKS trắc nghiệm / năng lực..."
                    value={formSurveyResult}
                    onChange={(e) => setFormSurveyResult(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Định hướng ban đầu</label>
                  <input
                    type="text"
                    placeholder="Định hướng ban đầu..."
                    value={formInitialOrientation}
                    onChange={(e) => setFormInitialOrientation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-800 mb-1">Cột Nhận xét GVCN (Giáo viên chủ nhiệm)</label>
                <textarea
                  rows={2}
                  placeholder="Nhập nhận xét của GVCN..."
                  value={formGvcnRemark}
                  onChange={(e) => setFormGvcnRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-teal-50/30 border border-teal-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-800 mb-1">Cột Nhận xét GVBM (Giáo viên bộ môn)</label>
                <textarea
                  rows={2}
                  placeholder="Nhập nhận xét của GVBM..."
                  value={formGvbmRemark}
                  onChange={(e) => setFormGvbmRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-sky-50/30 border border-sky-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Cột Kết quả tư vấn (Chính thức)</label>
                <input
                  type="text"
                  placeholder="Kết quả tư vấn chính thức cho học sinh..."
                  value={formCounselingResult}
                  onChange={(e) => setFormCounselingResult(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Sổ Theo Dõi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
)
}