"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  Award, Search, Calendar, MapPin, Users, Edit3, Check, X, 
  Trash2, Plus, FileSpreadsheet, Printer, Download, Eye, BookOpen, AlertCircle, UserCheck, Loader2
} from "lucide-react"
import { 
  getStudentsByClassAction, 
  getAllRegisteredStudentsAction,
  registerStudentsAction,
  deregisterStudentsAction
} from "./actions"

interface StudentClientProps {
  exams: any[]
  campuses: any[]
  academicYears: any[]
}

export default function StudentsClient({ exams, campuses, classes, academicYears }: StudentClientProps) {
  const [yearId, setYearId] = useState("")
  const [filteredExams, setFilteredExams] = useState<any[]>([])
  
  // Lọc kỳ thi
  const [selectedExam, setSelectedExam] = useState("")

  // State Main View (Danh sách đã đăng ký)
  const [students, setStudents] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // State Modal (Thêm học sinh)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCampus, setModalCampus] = useState(campuses[0]?.id || "")
  const [modalGrade, setModalGrade] = useState("")
  const [modalClass, setModalClass] = useState("")
  const [modalStudents, setModalStudents] = useState<any[]>([])
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSearchTerm, setModalSearchTerm] = useState("")

  // Phân trang Main View
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Reset exam when year changes
  useEffect(() => {
    if (yearId) {
      const yearExams = exams.filter(e => e.academicYearId === yearId)
      setFilteredExams(yearExams)
      setSelectedExam("")
      setStudents([])
    } else {
      setFilteredExams([])
      setSelectedExam("")
      setStudents([])
    }
  }, [yearId, exams])

  // Lấy danh sách học sinh ĐÃ ĐĂNG KÝ (Main View)
  const fetchMainStudents = async () => {
    if (!selectedExam) {
      setStudents([])
      return
    }
    setLoading(true)
    try {
      const data = await getAllRegisteredStudentsAction(selectedExam)
      setStudents(data)
      setSelectedIds([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMainStudents()
  }, [selectedExam])

  // Khi mở Modal hoặc đổi bộ lọc Modal, load danh sách lớp
  const fetchModalStudents = async () => {
    if (!selectedExam || !modalClass) {
      setModalStudents([])
      return
    }
    setModalLoading(true)
    try {
      const data = await getStudentsByClassAction(modalClass, selectedExam)
      setModalStudents(data)
      setModalSelectedIds([])
    } catch (e) {
      console.error(e)
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    if (isModalOpen && modalClass) {
      fetchModalStudents()
    } else if (isModalOpen && !modalClass) {
      setModalStudents([])
    }
  }, [isModalOpen, modalClass, selectedExam])

  // Lọc hiển thị Main View
  const filteredMainStudents = useMemo(() => {
    let result = students
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        s => (s.studentName || '').toLowerCase().includes(term) || (s.studentCode || '').toLowerCase().includes(term)
      )
    }
    return result
  }, [students, searchTerm])

  const totalPages = Math.ceil(filteredMainStudents.length / rowsPerPage) || 1
  const pagedStudents = filteredMainStudents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [filteredMainStudents, totalPages, currentPage])

  // Lọc hiển thị Modal
  const filteredModalStudents = useMemo(() => {
    let result = modalStudents
    if (modalSearchTerm) {
      const term = modalSearchTerm.toLowerCase()
      result = result.filter(
        s => (s.studentName || '').toLowerCase().includes(term) || (s.studentCode || '').toLowerCase().includes(term)
      )
    }
    return result
  }, [modalStudents, modalSearchTerm])

  // Handlers Main View
  const handleToggleSelectMain = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }
  const handleToggleSelectAllMain = (e: any) => {
    if (e.target.checked) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredMainStudents.forEach(s => next.add(s.id))
        return Array.from(next)
      })
    } else {
      setSelectedIds([])
    }
  }

  const handleDeregister = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Bạn có chắc muốn hủy đăng ký cho ${selectedIds.length} học sinh này?`)) return

    setUpdating(true)
    try {
      await deregisterStudentsAction(selectedExam, selectedIds)
      alert("Đã hủy đăng ký thành công!")
      await fetchMainStudents()
    } catch (e) {
      alert("Lỗi khi hủy đăng ký")
    } finally {
      setUpdating(false)
    }
  }

  // Handlers Modal View
  const handleToggleSelectModal = (id: string) => {
    setModalSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }
  const handleToggleSelectAllModal = (e: any) => {
    if (e.target.checked) {
      setModalSelectedIds(prev => {
        const next = new Set(prev)
        filteredModalStudents.forEach(s => next.add(s.id))
        return Array.from(next)
      })
    } else {
      setModalSelectedIds([])
    }
  }

  const handleRegisterModal = async () => {
    if (modalSelectedIds.length === 0) return
    setUpdating(true)
    try {
      await registerStudentsAction(selectedExam, modalSelectedIds)
      alert("Đã đăng ký danh sách thi thành công!")
      setIsModalOpen(false)
      await fetchMainStudents()
    } catch (e) {
      alert("Lỗi khi đăng ký")
    } finally {
      setUpdating(false)
    }
  }

  // Computed data for Modal filters
  const grades = useMemo(() => {
    const campus = campuses.find((c) => c.id === modalCampus)
    if (!campus) return []
    let gradeList: string[] = []
    if (["TIEU_HOC", "TH_THCS", "THCS_THPT", "ALL"].includes(campus.level)) {
      gradeList.push("1", "2", "3", "4", "5")
    }
    if (["THCS", "TH_THCS", "THCS_THPT", "ALL"].includes(campus.level)) {
      gradeList.push("6", "7", "8", "9")
    }
    if (["THPT", "THCS_THPT", "ALL"].includes(campus.level)) {
      gradeList.push("10", "11", "12")
    }
    return gradeList
  }, [modalCampus, campuses])

  const filteredClasses = useMemo(() => {
    return classes.filter((cls: any) => cls.campusId === modalCampus && cls.grade === modalGrade)
  }, [modalCampus, modalGrade, classes])

  // Reset lớp khi đổi khối
  useEffect(() => {
    setModalClass("")
  }, [modalGrade])

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-[#00A99D]" />
            Danh Sách Học Sinh Dự Thi
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Tổng hợp và quản lý danh sách học sinh tham gia kỳ thi
          </p>
        </div>
      </div>

      {/* --- BỘ LỌC KỲ THI (MAIN) --- */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full sm:w-64 flex flex-col gap-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Năm học</label>
              <select
                value={yearId}
                onChange={e => setYearId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 font-semibold text-slate-700 transition-all"
              >
                <option value="">-- Chọn Năm học --</option>
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-96 flex flex-col gap-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chọn Kỳ Thi</label>
              <select
                value={selectedExam}
                onChange={e => setSelectedExam(e.target.value)}
                disabled={!yearId}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-slate-50 focus:bg-white focus:border-[#00A99D] focus:ring-4 focus:ring-[#00A99D]/10 font-semibold text-slate-700 transition-all disabled:opacity-50"
              >
                <option value="">-- Chọn Kỳ thi --</option>
                {filteredExams.map(e => (
                  <option key={e.id} value={e.id}>[{e.code}] {e.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedExam && (
        <>
          {/* --- BẢNG MAIN VIEW --- */}
          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs animate-fade-in flex flex-col">
            <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00A99D]" />
                <span className="font-bold text-slate-800 text-[15px]">
                  Danh Sách Tổng Hợp
                </span>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wider">
                  {students.length} học sinh
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl outline-none focus:border-[#00A99D] transition-all bg-white"
                  />
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="whitespace-nowrap flex items-center justify-center gap-1.5 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2 rounded-xl font-bold transition-all shadow-sm shadow-[#00A99D]/15 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Học sinh
                </button>
              </div>
            </div>

            {/* Batch Action Banner */}
            {selectedIds.length > 0 && (
              <div className="bg-[#fff1f2] border-b border-rose-100 px-6 py-3 flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Đã chọn <strong className="font-black">{selectedIds.length}</strong> học sinh.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDeregister}
                  disabled={updating}
                  className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/80 px-4 py-1.5 rounded-lg font-bold transition-all text-xs disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Hủy đăng ký
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#00A99D] mb-3" />
                <p className="font-bold text-sm">Đang tải danh sách...</p>
              </div>
            ) : filteredMainStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                <UserCheck className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold text-sm">Chưa có học sinh nào dự thi</p>
                <p className="text-[11px] font-medium text-center mt-1">Bấm "Thêm Học sinh" để bắt đầu chọn danh sách.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-6 py-3 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredMainStudents.length > 0 && filteredMainStudents.every((s) => selectedIds.includes(s.id))}
                          onChange={handleToggleSelectAllMain}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3">Mã Học Sinh</th>
                      <th className="px-6 py-3">Họ Và Tên</th>
                      <th className="px-6 py-3">Cơ sở</th>
                      <th className="px-6 py-3">Lớp</th>
                      <th className="px-6 py-3">Giới Tính</th>
                      <th className="px-6 py-3 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pagedStudents.map((student) => {
                      const isChecked = selectedIds.includes(student.id)
                      return (
                        <tr
                          key={student.id}
                          onClick={() => handleToggleSelectMain(student.id)}
                          className={`hover:bg-slate-50/40 transition-colors cursor-pointer ${isChecked ? "bg-rose-50/30" : ""}`}
                        >
                          <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectMain(student.id)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-3.5 font-mono text-slate-500 font-bold text-xs">{student.studentCode}</td>
                          <td className="px-6 py-3.5 font-bold text-slate-800 text-xs sm:text-sm">{student.studentName}</td>
                          <td className="px-6 py-3.5 text-slate-600 font-bold text-xs">{student.campusName}</td>
                          <td className="px-6 py-3.5 text-slate-600 font-bold text-xs">{student.className}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9.5px] ${
                              student.gender === "MALE" || student.gender === "Nam" 
                                ? "bg-blue-50 text-blue-700" 
                                : student.gender === "FEMALE" || student.gender === "Nữ"
                                ? "bg-pink-50 text-pink-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {student.gender === "MALE" || student.gender === "Nam" ? "Nam" : student.gender === "FEMALE" || student.gender === "Nữ" ? "Nữ" : student.gender}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded border border-emerald-100 font-bold text-[10px]">
                              <Check className="w-3 h-3" /> Dự thi
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {filteredMainStudents.length > 0 && (
              <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-2xl">
                <p className="text-xs font-bold text-slate-500">
                  Hiển thị <strong className="text-indigo-700">{(currentPage - 1) * rowsPerPage + 1}</strong> đến <strong className="text-indigo-700">{Math.min(currentPage * rowsPerPage, filteredMainStudents.length)}</strong> / <strong className="text-slate-800">{filteredMainStudents.length}</strong> học sinh
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => (
                      <div key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400 font-bold">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-all ${
                            currentPage === p ? 'bg-[#00A99D] text-white' : 'text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MODAL THÊM HỌC SINH --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00A99D]" />
                Chọn Học sinh đăng ký dự thi
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cơ sở</label>
                  <select value={modalCampus} onChange={e => setModalCampus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#00A99D] font-semibold text-slate-700">
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Khối</label>
                  <select value={modalGrade} onChange={e => setModalGrade(e.target.value)} disabled={!modalCampus} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#00A99D] font-semibold text-slate-700 disabled:opacity-50">
                    <option value="">-- Chọn khối --</option>
                    {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Lớp</label>
                  <select value={modalClass} onChange={e => setModalClass(e.target.value)} disabled={!modalGrade} className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#00A99D] font-semibold text-slate-700 disabled:opacity-50">
                    <option value="">-- Chọn lớp --</option>
                    {filteredClasses.map((c: any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col mt-2 min-h-[300px]">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Sĩ số: {modalStudents.length} HS</span>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="Tìm tên..." value={modalSearchTerm} onChange={e => setModalSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg outline-none focus:border-[#00A99D]" />
                  </div>
                </div>

                {modalLoading ? (
                  <div className="flex-1 flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00A99D]" />
                  </div>
                ) : !modalClass ? (
                  <div className="flex-1 flex items-center justify-center py-10 text-slate-400 text-sm font-medium">
                    Vui lòng chọn Lớp để xem danh sách
                  </div>
                ) : filteredModalStudents.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-10 text-slate-400 text-sm font-medium">
                    Không tìm thấy học sinh
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-sm">
                        <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={filteredModalStudents.length > 0 && filteredModalStudents.every(s => modalSelectedIds.includes(s.id))}
                              onChange={handleToggleSelectAllModal}
                              className="w-3.5 h-3.5 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-2">Mã HS</th>
                          <th className="px-4 py-2">Họ & Tên</th>
                          <th className="px-4 py-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredModalStudents.map(student => {
                          const isChecked = modalSelectedIds.includes(student.id)
                          return (
                            <tr key={student.id} onClick={() => handleToggleSelectModal(student.id)} className={`cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? 'bg-[#00A99D]/5' : ''}`}>
                              <td className="px-4 py-2 text-center" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isChecked} onChange={() => handleToggleSelectModal(student.id)} className="w-3.5 h-3.5 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer" />
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-500 text-xs">{student.studentCode}</td>
                              <td className="px-4 py-2 font-bold text-slate-700">{student.studentName}</td>
                              <td className="px-4 py-2 text-right">
                                {student.isRegistered ? (
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100">Đã đăng ký</span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded border border-slate-200">Chưa ĐK</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-600">
                Đã chọn: <span className="text-[#00A99D] text-base">{modalSelectedIds.length}</span> học sinh
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  Đóng
                </button>
                <button 
                  onClick={handleRegisterModal}
                  disabled={modalSelectedIds.length === 0 || updating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#00A99D] hover:bg-[#009085] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Đăng ký vào Danh sách
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
