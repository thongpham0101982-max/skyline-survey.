 "use client"

import { useState, useEffect, useMemo } from "react"
import * as XLSX from "xlsx"
import { 
  Compass, 
  Search, 
  RefreshCcw, 
  BookOpen, 
  Edit3, 
  Save, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from "lucide-react"

interface Props {
  academicYears: any[]
  activeYearId: string
  initialClasses: any[]
  initialSubjects: any[]
  teacherName: string
  teacherId: string
}

export function OrientationTeacherClient({
  academicYears,
  activeYearId,
  initialClasses,
  initialSubjects,
  teacherName,
  teacherId
}: Props) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))
  const [classes, setClasses] = useState<any[]>(initialClasses)
  const [subjects, setSubjects] = useState<any[]>(initialSubjects)

  const [selectedLevelFilter, setSelectedLevelFilter] = useState("ALL")
  const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL")

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (selectedLevelFilter !== "ALL") {
        const cLevel = (c.level || "").toLowerCase()
        const cGrade = (c.grade || "").toLowerCase()
        const cName = (c.className || "").toLowerCase()

        if (selectedLevelFilter === "THCS") {
          const isMatch = cLevel.includes("thcs") ||
            ["6", "7", "8", "9"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        } else if (selectedLevelFilter === "THPT") {
          const isMatch = cLevel.includes("thpt") ||
            ["10", "11", "12"].some(g => cGrade === g || cGrade === `khối ${g}` || cName.startsWith(g))
          if (!isMatch) return false
        }
      }

      if (selectedGradeFilter !== "ALL") {
        const targetNum = selectedGradeFilter.replace(/\D/g, "")
        const cGrade = (c.grade || "").trim()
        const cName = (c.className || "").trim()
        const cGradeNum = cGrade.replace(/\D/g, "")
        const cNameNum = (cName.match(/^(\d+)/) || [])[1] || ""

        const isMatch = cGrade === selectedGradeFilter || (targetNum && (cGradeNum === targetNum || cNameNum === targetNum))
        if (!isMatch) return false
      }

      return true
    })
  }, [classes, selectedLevelFilter, selectedGradeFilter])

  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id || "")
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => {
    const hngSub = initialSubjects.find(s => (s.subjectCode || "").toUpperCase().includes("HNG") || (s.subjectName || "").includes("Hướng nghiệp"))
    return hngSub?.id || initialSubjects[0]?.id || ""
  })
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [formSurveyResult, setFormSurveyResult] = useState("")
  const [formInitialOrientation, setFormInitialOrientation] = useState("")
  const [formGvcnRemark, setFormGvcnRemark] = useState("")
  const [formGvbmRemark, setFormGvbmRemark] = useState("")
  const [formCounselingResult, setFormCounselingResult] = useState("")
  const [formStatus, setFormStatus] = useState("DA_TU_VAN")
  const [formNotes, setFormNotes] = useState("")

  useEffect(() => {
    if (filteredClasses.length > 0 && !filteredClasses.some(c => c.id === selectedClassId)) {
      setSelectedClassId(filteredClasses[0].id)
    }
  }, [filteredClasses])

  // Reload assignments & classes if academicYearId changes
  useEffect(() => {
    if (!selectedYearId) return
    async function loadYearData() {
      try {
        const res = await fetch("/api/ktdbcl/huong-nghiep?action=getAssignedClasses&academicYearId=" + selectedYearId + "&_t=" + Date.now())
        if (res.ok) {
          const data = await res.json()
          setClasses(data)
          if (data.length > 0 && !data.some((c: any) => c.id === selectedClassId)) {
            setSelectedClassId(data[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading assigned classes:", err)
      }
    }
    loadYearData()
  }, [selectedYearId])

  const fetchRecords = async () => {
    if (!selectedYearId) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        action: "getLogbook"
      })
      if (selectedClassId) params.append("classId", selectedClassId)
      if (selectedStatusFilter !== "ALL") params.append("status", selectedStatusFilter)
      if (searchQuery) params.append("search", searchQuery)

      params.append("_t", Date.now().toString())
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
  }, [selectedYearId, selectedClassId, selectedStatusFilter, searchQuery])

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
  }

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return

    try {
      setSaving(true)
      const payload = {
        studentId: editingRecord.studentId,
        academicYearId: selectedYearId,
        counselorId: teacherId,
        counselorName: teacherName,
        counselorRole: editingRecord.counselorRole || "GVBM",
        surveyResult: formSurveyResult,
        initialOrientation: formInitialOrientation,
        gvcnRemark: formGvcnRemark,
        gvbmRemark: formGvbmRemark,
        counselingResult: formCounselingResult,
        counselingDate: new Date().toISOString(),
        status: formStatus,
        notes: formNotes
      }

      const res = await fetch("/api/ktdbcl/huong-nghiep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setMessage({ text: "Đã lưu sổ theo dõi hướng nghiệp thành công!", type: "success" })
        setIsModalOpen(false)
        fetchRecords()
      } else {
        const errData = await res.json()
        setMessage({ text: errData.error || "Lỗi lưu dữ liệu sổ", type: "error" })
      }
    } catch (err) {
      console.error("Error saving log record:", err)
      setMessage({ text: "Lỗi kết nối máy chủ", type: "error" })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleInlineChange = (recordId: string, field: string, value: string) => {
    setRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        return { ...r, [field]: value, isDirty: true }
      }
      return r
    }))
  }

  const handleSaveAllDirty = async () => {
    const dirtyRecords = records.filter(r => r.isDirty)
    if (dirtyRecords.length === 0) {
      setMessage({ text: "Không có thay đổi nào cần lưu", type: "success" })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    try {
      setSaving(true)
      for (const rec of dirtyRecords) {
        await fetch("/api/ktdbcl/huong-nghiep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: rec.studentId,
            academicYearId: selectedYearId,
            counselorId: teacherId,
            counselorName: teacherName,
            counselorRole: rec.counselorRole || "GVBM",
            surveyResult: rec.surveyResult,
            initialOrientation: rec.initialOrientation,
            gvcnRemark: rec.gvcnRemark,
            gvbmRemark: rec.gvbmRemark,
            counselingResult: rec.counselingResult,
            status: rec.status || "DA_TU_VAN",
            notes: rec.notes
          })
        })
      }
      setMessage({ text: `Đã lưu thành công ${dirtyRecords.length} học sinh!`, type: "success" })
      fetchRecords()
    } catch (err) {
      console.error("Error saving dirty records:", err)
      setMessage({ text: "Lỗi khi lưu danh sách học sinh", type: "error" })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const handleExportExcel = () => {
    if (records.length === 0) return

    const selectedClass = classes.find(c => c.id === selectedClassId)
    const exportData = records.map((r, idx) => ({
      "STT": idx + 1,
      "Mã HS": r.studentCode,
      "Lớp": r.className,
      "Họ tên Học sinh": r.studentName,
      "KQKS (Khảo sát)": r.surveyResult || "",
      "Kết quả định hướng ban đầu": r.initialOrientation || "",
      "Nhận xét GVCN": r.gvcnRemark || "",
      "Nhận xét GVBM (HNG)": r.gvbmRemark || "",
      "Kết quả tư vấn": r.counselingResult || "",
      "Người tư vấn": r.counselorName || "",
      "Vai trò tư vấn": r.counselorRole || "",
      "Trạng thái": r.status === "DA_TU_VAN" ? "Đã tư vấn" : "Chưa tư vấn",
      "Ghi chú": r.notes || ""
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "So_Theo_Doi_Huong_Nghiep")
    XLSX.writeFile(wb, `So_Theo_Doi_Huong_Nghiep_${selectedClass?.className || "All"}.xlsx`)
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 text-slate-800">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-sky-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <Compass className="w-7 h-7 text-teal-200" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Sổ Theo dõi Hướng nghiệp
              <span className="text-xs bg-teal-400/20 border border-teal-300/30 text-teal-200 font-bold px-2.5 py-0.5 rounded-full">Bộ môn HNG</span>
            </h1>
            <p className="text-teal-100 text-xs font-normal mt-1">
              Nhật ký tư vấn hướng nghiệp chuẩn hóa phân công dành cho Giáo viên Chủ nhiệm (GVCN) & Giáo viên Bộ môn (GVBM - HNG)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveAllDirty}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold transition shadow-md border border-emerald-400"
          >
            <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu nhanh tất cả"}
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur-md"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          <button
            onClick={fetchRecords}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur-md"
          >
            <RefreshCcw className="w-4 h-4" /> Tải lại
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Năm học:</label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.yearName || y.yearCode}</option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Cấp học:</label>
              <select
                value={selectedLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">Tất cả Cấp học</option>
                <option value="THCS">Khối THCS (Khối 6 - 9)</option>
                <option value="THPT">Khối THPT (Khối 10 - 12)</option>
              </select>
            </div>

            {/* Class Selection */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Lớp phân công:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Tất cả các Lớp phân công --</option>
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.className} {c.isHomeroom ? "(Lớp Chủ nhiệm - GVCN)" : "(Lớp Bộ môn - GVBM)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Bộ môn:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="px-3 py-1.5 bg-teal-50/50 border border-teal-200 rounded-xl text-xs font-bold text-teal-900 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Tất cả Bộ môn --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã HS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-3.5 rounded-xl text-xs font-bold border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Main 11-Column Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            Sổ Theo dõi Hướng nghiệp Môn HNG ({records.length} học sinh)
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>Giáo viên tư vấn: <strong className="text-teal-700 font-bold">{teacherName}</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 text-center w-10">STT</th>
                  <th className="py-3.5 px-3 w-24">Mã HS</th>
                  <th className="py-3.5 px-3 w-20">Lớp</th>
                  <th className="py-3.5 px-3 min-w-[150px]">Họ tên Học sinh</th>
                  <th className="py-3.5 px-3 min-w-[120px]">KQKS</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Định hướng ban đầu</th>
                  <th className="py-3.5 px-3 min-w-[160px] bg-teal-50/50 text-teal-900">Cột Nhận xét GVCN</th>
                  <th className="py-3.5 px-3 min-w-[160px] bg-sky-50/50 text-sky-900">Cột Nhận xét GVBM (HNG)</th>
                  <th className="py-3.5 px-3 min-w-[160px] bg-emerald-50/50 text-emerald-900">Cột Kết quả tư vấn</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Người tư vấn</th>
                  <th className="py-3.5 px-3 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={r.id} className={`hover:bg-teal-50/30 transition ${r.isDirty ? "bg-amber-50/40" : ""}`}>
                    <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-700">{r.studentCode}</td>
                    <td className="py-3 px-3 font-bold text-slate-700">{r.className}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">{r.studentName}</td>

                    {/* KQKS */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Năng lực/Trắc nghiệm..."
                        value={r.surveyResult || ""}
                        onChange={(e) => handleInlineChange(r.id, "surveyResult", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </td>

                    {/* Định hướng ban đầu */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Định hướng..."
                        value={r.initialOrientation || ""}
                        onChange={(e) => handleInlineChange(r.id, "initialOrientation", e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </td>

                    {/* Cột Nhận xét GVCN */}
                    <td className="py-3 px-3 bg-teal-50/20">
                      <textarea
                        rows={1}
                        placeholder="Nhận xét GVCN..."
                        value={r.gvcnRemark || ""}
                        onChange={(e) => handleInlineChange(r.id, "gvcnRemark", e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-teal-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-teal-500 resize-none"
                      />
                    </td>

                    {/* Cột Nhận xét GVBM */}
                    <td className="py-3 px-3 bg-sky-50/20">
                      <textarea
                        rows={1}
                        placeholder="Nhận xét GVBM (HNG)..."
                        value={r.gvbmRemark || ""}
                        onChange={(e) => handleInlineChange(r.id, "gvbmRemark", e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-sky-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-sky-500 resize-none"
                      />
                    </td>

                    {/* Cột Kết quả tư vấn */}
                    <td className="py-3 px-3 bg-emerald-50/20">
                      <input
                        type="text"
                        placeholder="Kết quả tư vấn..."
                        value={r.counselingResult || ""}
                        onChange={(e) => handleInlineChange(r.id, "counselingResult", e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-emerald-200 rounded-md text-xs font-extrabold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Người tư vấn */}
                    <td className="py-3 px-3 text-slate-600">
                      <div className="font-bold text-slate-800 truncate max-w-[120px]">{r.counselorName}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{r.counselorRole}</div>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openEditModal(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Ghi Sổ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Ghi Sổ Theo Dõi Hướng Nghiệp (Môn HNG)
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Học sinh: {editingRecord.studentName} - Mã HS: {editingRecord.studentCode} ({editingRecord.className})
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
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
                <label className="block text-xs font-bold text-sky-800 mb-1">Cột Nhận xét GVBM (Giáo viên bộ môn HNG)</label>
                <textarea
                  rows={2}
                  placeholder="Nhập nhận xét của GVBM môn Hướng nghiệp (HNG)..."
                  value={formGvbmRemark}
                  onChange={(e) => setFormGvbmRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-sky-50/30 border border-sky-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">Cột Kết quả tư vấn (Chính thức)</label>
                <textarea
                  rows={2}
                  placeholder="Kết quả tư vấn chính thức..."
                  value={formCounselingResult}
                  onChange={(e) => setFormCounselingResult(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/30 border border-emerald-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái tư vấn</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="DA_TU_VAN">Đã tư vấn</option>
                    <option value="DANG_TU_VAN">Đang tư vấn</option>
                    <option value="CHUA_TU_VAN">Chưa tư vấn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                  <input
                    type="text"
                    placeholder="Ghi chú thêm..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
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
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold transition shadow-md"
                >
                  {saving ? "Đang lưu..." : "Lưu Sổ Theo Dõi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
