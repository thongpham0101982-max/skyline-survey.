"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Compass,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Eye,
  RefreshCcw,
  MessageSquare
} from "lucide-react"

interface ClientProps {
  academicYears: any[]
  campuses: any[]
  classes: any[]
  teachers: any[]
  currentUser: any
  userRole: string
  isKTDBCL: boolean
}

export function CareerGuidanceClient({
  academicYears,
  campuses,
  classes,
  teachers,
  currentUser,
  userRole,
  isKTDBCL
}: ClientProps) {
  const [selectedYearId, setSelectedYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    return academicYears[0]?.id || ""
  })

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored && stored !== selectedYearId) {
        setSelectedYearId(stored)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [selectedYearId])

  const [selectedCampusId, setSelectedCampusId] = useState<string>("")
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  const [editingRecord, setEditingRecord] = useState<any | null>(null)
  const [viewingRecord, setViewingRecord] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  const [formSurveyResult, setFormSurveyResult] = useState("")
  const [formInitialOrientation, setFormInitialOrientation] = useState("")
  const [formGvcnRemark, setFormGvcnRemark] = useState("")
  const [formGvbmRemark, setFormGvbmRemark] = useState("")
  const [formCounselingResult, setFormCounselingResult] = useState("")
  const [formCounselorName, setFormCounselorName] = useState("")
  const [formCounselorRole, setFormCounselorRole] = useState("GVCN")
  const [formStatus, setFormStatus] = useState("DA_TU_VAN")
  const [formNotes, setFormNotes] = useState("")

  const filteredClasses = useMemo(() => {
    if (!selectedCampusId) return classes
    return classes.filter(c => c.campusId === selectedCampusId)
  }, [classes, selectedCampusId])

  const fetchRecords = async () => {
    if (!selectedYearId) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        academicYearId: selectedYearId,
        action: "getRecords"
      })
      if (selectedCampusId) params.append("campusId", selectedCampusId)
      if (selectedClassId) params.append("classId", selectedClassId)
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter)
      if (searchQuery) params.append("search", searchQuery)

      const res = await fetch("/api/ktdbcl/huong-nghiep?" + params.toString())
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (err) {
      console.error("Error fetching guidance records:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [selectedYearId, selectedCampusId, selectedClassId, statusFilter, searchQuery])

  const stats = useMemo(() => {
    const total = records.length
    const done = records.filter(r => r.status === "HOAN_THANH").length
    const inProgress = records.filter(r => r.status === "DA_TU_VAN").length
    const followUp = records.filter(r => r.status === "CAN_THEO_DOI").length
    const pending = records.filter(r => r.status === "CHUA_TU_VAN").length
    return { total, done, inProgress, followUp, pending }
  }, [records])

  const openEditModal = (rec: any) => {
    setEditingRecord(rec)
    setFormSurveyResult(rec.surveyResult || "")
    setFormInitialOrientation(rec.initialOrientation || "")
    setFormGvcnRemark(rec.gvcnRemark || "")
    setFormGvbmRemark(rec.gvbmRemark || "")
    setFormCounselingResult(rec.counselingResult || "")
    setFormCounselorName(rec.counselorName || currentUser?.name || "")
    setFormCounselorRole(rec.counselorRole || "GVCN")
    setFormStatus(rec.status === "CHUA_TU_VAN" ? "DA_TU_VAN" : rec.status)
    setFormNotes(rec.notes || "")
    setIsModalOpen(true)
  }

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return
    try {
      setSaving(true)
      const res = await fetch("/api/ktdbcl/huong-nghiep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editingRecord.studentId,
          academicYearId: selectedYearId,
          counselorName: formCounselorName,
          counselorRole: formCounselorRole,
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
        setIsModalOpen(false)
        fetchRecords()
      }
    } catch (err) {
      console.error("Error saving career record:", err)
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = () => {
    const headers = [
      "STT", "Mã HS", "Họ tên Học sinh", "KQKS", 
      "Kết quả định hướng ban đầu", "NX GVCN", "NX GVBM(HNG)", 
      "KQ Tư vấn", "Người tư vấn", "Trạng thái", "Ghi chú"
    ]
    const rows = records.map((r, idx) => [
      idx + 1,
      r.studentCode,
      r.studentName,
      r.surveyResult || "",
      r.initialOrientation || "",
      r.gvcnRemark || "",
      r.gvbmRemark || "",
      r.counselingResult || "",
      r.counselorName + " (" + r.counselorRole + ")",
      r.status === "HOAN_THANH" ? "Hoàn thành" : r.status === "CAN_THEO_DOI" ? "Cần theo dõi" : r.status === "DA_TU_VAN" ? "Đã tư vấn" : "Chưa tư vấn",
      r.notes || ""
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "Nhat_ky_Huong_nghiep_" + new Date().toISOString().slice(0,10) + ".csv"
    link.click()
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "HOAN_THANH":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">✓ Hoàn thành</span>
      case "CAN_THEO_DOI":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">⚠ Cần theo dõi</span>
      case "DA_TU_VAN":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300">💬 Đã tư vấn</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">○ Chưa tư vấn</span>
    }
  }

  return (
    <div className="space-y-6 text-slate-800">
      <div className="bg-gradient-to-r from-sky-700 via-teal-700 to-emerald-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Compass className="w-8 h-8 text-sky-200" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Danh mục Quản lý Hướng nghiệp</h1>
              <p className="text-sky-100 text-xs font-normal mt-1">
                Nhật ký làm tư vấn hướng nghiệp, theo dõi KQKS, nhận xét GVCN & GVBM toàn hệ thống
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchRecords}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur-md"
          >
            <RefreshCcw className="w-4 h-4" /> Tải lại
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Nhật Ký CSV/Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Tổng số HS</div>
            <div className="text-xl font-black text-slate-800">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Đã tư vấn</div>
            <div className="text-xl font-black text-teal-700">{stats.inProgress}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Hoàn thành</div>
            <div className="text-xl font-black text-emerald-700">{stats.done}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Cần theo dõi</div>
            <div className="text-xl font-black text-amber-700">{stats.followUp}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Chưa tư vấn</div>
            <div className="text-xl font-black text-slate-700">{stats.pending}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCampusId}
            onChange={(e) => setSelectedCampusId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">-- Tất cả Cơ sở --</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.campusName}</option>
            ))}
          </select>

          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">-- Tất cả Lớp --</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>{c.className}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">-- Tất cả Trạng thái --</option>
            <option value="DA_TU_VAN">Đã tư vấn</option>
            <option value="HOAN_THANH">Hoàn thành</option>
            <option value="CAN_THEO_DOI">Cần theo dõi</option>
            <option value="CHUA_TU_VAN">Chưa tư vấn</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã HS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Nhật ký Làm việc & Tư vấn Hướng nghiệp ({records.length} học sinh)
          </h2>
          <span className="text-xs text-slate-500 font-normal">Cấu hình chuẩn 11 cột (Đáp ứng tối thiểu 7 cột)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            Đang tải dữ liệu nhật ký hướng nghiệp...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            Không tìm thấy học sinh hoặc dữ liệu hướng nghiệp nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 w-28">Mã HS</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Họ tên Học sinh</th>
                  <th className="py-3.5 px-4 min-w-[120px]">KQKS</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Kết quả định hướng ban đầu</th>
                  <th className="py-3.5 px-4 min-w-[160px]">NX GVCN</th>
                  <th className="py-3.5 px-4 min-w-[160px]">NX GVBM(HNG)</th>
                  <th className="py-3.5 px-4 min-w-[160px]">KQ Tư vấn</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Người & Ngày tư vấn</th>
                  <th className="py-3.5 px-4 text-center w-32">Trạng thái & Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-sky-50/40 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">{r.studentCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{r.studentName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.campusName}</div>
                    </td>
                    <td className="py-3 px-4">
                      {r.surveyResult ? (
                        <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-md font-semibold border border-violet-200 block text-center">
                          {r.surveyResult}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa khảo sát</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.initialOrientation ? (
                        <span className="font-semibold text-slate-800">{r.initialOrientation}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.gvcnRemark ? (
                        <p className="line-clamp-2 text-xs">{r.gvcnRemark}</p>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có nhận xét</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.gvbmRemark ? (
                        <p className="line-clamp-2 text-xs">{r.gvbmRemark}</p>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có nhận xét</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.counselingResult ? (
                        <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 block">
                          {r.counselingResult}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có kết quả</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">{r.counselorName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {r.counselorRole} • {new Date(r.counselingDate).toLocaleDateString("vi-VN")}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {getStatusBadge(r.status)}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 text-sky-600 hover:bg-sky-100 rounded-lg transition"
                            title="Cập nhật nhật ký tư vấn"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingRecord(r)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Xem chi tiết nhật ký"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Cập nhật Nhật ký Tư vấn Hướng nghiệp
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editingRecord.studentName} - Lớp {editingRecord.className} ({editingRecord.studentCode})
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">KQKS (Kết quả khảo sát)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: MBTI: ENFJ, Holland: Nghệ thuật - Xã hội"
                    value={formSurveyResult}
                    onChange={(e) => setFormSurveyResult(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kết quả định hướng ban đầu</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Định hướng ngành Thiết kế Đồ họa / Công nghệ"
                    value={formInitialOrientation}
                    onChange={(e) => setFormInitialOrientation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cột Nhận xét GVCN (Giáo viên chủ nhiệm)</label>
                <textarea
                  rows={2}
                  placeholder="Nhận xét của GVCN về định hướng, thái độ và mong muốn của HS/PHHS..."
                  value={formGvcnRemark}
                  onChange={(e) => setFormGvcnRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cột Nhận xét GVBM (Giáo viên bộ môn)</label>
                <textarea
                  rows={2}
                  placeholder="Nhận xét của GVBM về năng lực bộ môn, tố chất liên quan..."
                  value={formGvbmRemark}
                  onChange={(e) => setFormGvbmRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cột Kết quả tư vấn (Chính thức)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khuyên chọn Khối A01 & Đăng ký Ngành Công nghệ Thông tin"
                  value={formCounselingResult}
                  onChange={(e) => setFormCounselingResult(e.target.value)}
                  className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người tư vấn & Vai trò</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tên GV tư vấn..."
                      value={formCounselorName}
                      onChange={(e) => setFormCounselorName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    />
                    <select
                      value={formCounselorRole}
                      onChange={(e) => setFormCounselorRole(e.target.value)}
                      className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="GVCN">GVCN</option>
                      <option value="GVBM">GVBM</option>
                      <option value="KTDBCL">KTDBCL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái tư vấn</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="DA_TU_VAN">Đã tư vấn</option>
                    <option value="CAN_THEO_DOI">Cần theo dõi</option>
                    <option value="HOAN_THANH">Hoàn thành</option>
                    <option value="CHUA_TU_VAN">Chưa tư vấn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm trong nhật ký</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú chi tiết về buổi gặp mặt, lịch hẹn tư vấn tiếp theo..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
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
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md transition"
                >
                  {saving ? "Đang lưu..." : "Lưu Nhật Ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white max-w-md w-full h-full p-6 shadow-2xl space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-sky-600 tracking-wider">Chi tiết Nhật ký Tư vấn</span>
                <h3 className="text-lg font-black text-slate-900">{viewingRecord.studentName}</h3>
                <p className="text-xs text-slate-500">{viewingRecord.studentCode} • Lớp {viewingRecord.className}</p>
              </div>
              <button onClick={() => setViewingRecord(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
                <span className="text-slate-500 font-medium block">Trạng thái</span>
                <div className="mt-1">{getStatusBadge(viewingRecord.status)}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Kết quả Khảo sát (KQKS)</div>
                <div className="text-slate-700 font-semibold">{viewingRecord.surveyResult || "Chưa ghi nhận"}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Kết quả Định hướng Ban đầu</div>
                <div className="text-slate-700 font-semibold">{viewingRecord.initialOrientation || "Chưa ghi nhận"}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Nhận xét GVCN (Giáo viên chủ nhiệm)</div>
                <div className="text-slate-700">{viewingRecord.gvcnRemark || "Chưa có nhận xét"}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Nhận xét GVBM (Giáo viên bộ môn)</div>
                <div className="text-slate-700">{viewingRecord.gvbmRemark || "Chưa có nhận xét"}</div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-extrabold text-emerald-900">Kết quả Tư vấn Chính thức</div>
                <div className="text-emerald-800 font-bold">{viewingRecord.counselingResult || "Chưa có kết quả"}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Người thực hiện tư vấn</div>
                <div className="text-slate-700">{viewingRecord.counselorName} ({viewingRecord.counselorRole})</div>
                <div className="text-slate-400 text-[11px]">{new Date(viewingRecord.counselingDate).toLocaleString("vi-VN")}</div>
              </div>

              {viewingRecord.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">Ghi chú Nhật ký</div>
                  <div className="text-slate-700">{viewingRecord.notes}</div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => { setViewingRecord(null); openEditModal(viewingRecord); }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                Chỉnh sửa thông tin tư vấn này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}