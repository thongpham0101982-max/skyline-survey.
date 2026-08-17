"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  getClassStudentsWithParentsAction, 
  generateParentAccountsAction, 
  deleteParentAccountsAction,
  searchStudentsForLinkingAction,
  linkParentStudentAction,
  unlinkParentStudentAction,
  resetParentPasswordAction 
} from "./actions"
import { 
  Users, KeyRound, UserCheck, RefreshCw, CalendarDays, Trash2, X, 
  School, Search, ShieldCheck, ArrowRight, Link, Unlink, UserPlus, 
  FileSpreadsheet, Eye, ChevronRight, CheckCircle2, Sparkles, Filter, Info, Lock 
} from "lucide-react"

export function ParentAccountsClient({ classes, years, campuses, defaultYearId }: any) {
  const [filterYearId, setFilterYearId] = useState(defaultYearId || "ALL")
  const [selectedCampusId, setSelectedCampusId] = useState("ALL")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CREATED" | "PENDING" | "MULTICHILD">("ALL")

  // Modal states for Multi-Child Details & Link Student
  const [multiChildModalParent, setMultiChildModalParent] = useState<any>(null)
  
  const [linkModalStudent, setLinkModalStudent] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [linking, setLinking] = useState(false)
  
  // Notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string, type: "success" | "error" } | null>(null)

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const filteredClasses = useMemo(() => {
    return classes.filter((c: any) => {
      const yearMatch = filterYearId === "ALL" || c.academicYear?.id === filterYearId
      const campusMatch = selectedCampusId === "ALL" || c.campusId === selectedCampusId
      return yearMatch && campusMatch
    })
  }, [classes, filterYearId, selectedCampusId])

  const fetchStudents = async (cid: string) => {
    if (!cid) {
      setStudents([])
      return
    }
    setLoading(true)
    try {
      const data = await getClassStudentsWithParentsAction(cid)
      setStudents(data)
      setSelectedStudentIds([])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId)
    else setStudents([])
  }, [selectedClassId])

  useEffect(() => {
    setSelectedClassId("")
    setStudents([])
    setSelectedStudentIds([])
  }, [filterYearId, selectedCampusId])

  // Process Search & Status Filtering
  const processedStudents = useMemo(() => {
    return students.filter((s) => {
      const parentObj = s.parents[0]?.parent
      const user = parentObj?.user
      const hasAccount = !!user
      const linkedStudentsCount = parentObj?.students?.length || 0
      const isMultiChild = linkedStudentsCount > 1

      // Search matching
      const sName = s.studentName.toLowerCase()
      const sCode = s.studentCode.toLowerCase()
      const pCode = (user?.email || parentObj?.parentCode || "").toLowerCase()
      const term = searchTerm.toLowerCase().trim()

      const matchSearch = !term || sName.includes(term) || sCode.includes(term) || pCode.includes(term)

      // Status matching
      let matchStatus = true
      if (statusFilter === "CREATED") matchStatus = hasAccount
      if (statusFilter === "PENDING") matchStatus = !hasAccount
      if (statusFilter === "MULTICHILD") matchStatus = isMultiChild

      return matchSearch && matchStatus
    })
  }, [students, searchTerm, statusFilter])

  // Statistics counters
  const stats = useMemo(() => {
    let created = 0
    let pending = 0
    let multiChild = 0

    students.forEach((s) => {
      const parentObj = s.parents[0]?.parent
      if (parentObj?.user) {
        created++
        if (parentObj.students && parentObj.students.length > 1) {
          multiChild++
        }
      } else {
        pending++
      }
    })

    return {
      total: students.length,
      created,
      pending,
      multiChild
    }
  }, [students])

  const handleGenerate = async () => {
    if (!selectedClassId) return
    setGenerating(true)
    try {
      const res = await generateParentAccountsAction(selectedClassId)
      if (res.success) {
        showToast(`Khởi tạo thành công ${res.count} tài khoản PHHS mới!`)
        fetchStudents(selectedClassId)
      } else {
        showToast(res.error || "Khởi tạo thất bại", "error")
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteMany = async () => {
    if (selectedStudentIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản Phụ huynh của ${selectedStudentIds.length} học sinh được chọn?`)) return
    
    setDeleting(true)
    try {
      const res = await deleteParentAccountsAction(selectedStudentIds)
      if (res.success) {
        showToast(`Đã xóa thành công tài khoản PHHS được chọn.`)
        fetchStudents(selectedClassId)
      } else {
        showToast(res.error || "Xóa thất bại", "error")
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async (parentId: string, studentCode: string) => {
    if (!confirm(`Khôi phục mật khẩu mặc định thành Mã Học Sinh (${studentCode}) cho Phụ huynh này?`)) return
    try {
      const res = await resetParentPasswordAction(parentId, studentCode)
      if (res.success) {
        showToast(`Đã khôi phục mật khẩu mặc định: ${studentCode}`)
      } else {
        showToast(res.error || "Thất bại", "error")
      }
    } catch (e) {
      showToast("Lỗi hệ thống", "error")
    }
  }

  // Live search students for multi-child linking
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchStudentsForLinkingAction(searchQuery)
        setSearchResults(res)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLinkStudent = async (targetStudentId: string) => {
    if (!linkModalStudent || !linkModalStudent.parents[0]?.parent?.id) return
    const parentId = linkModalStudent.parents[0].parent.id
    setLinking(true)
    try {
      const res = await linkParentStudentAction(parentId, targetStudentId)
      if (res.success) {
        showToast(res.message || "Đã liên kết học sinh vào tài khoản Phụ huynh thành công!")
        setLinkModalStudent(null)
        setSearchQuery("")
        fetchStudents(selectedClassId)
      } else {
        showToast(res.error || "Liên kết thất bại", "error")
      }
    } finally {
      setLinking(false)
    }
  }

  const handleUnlinkStudent = async (parentId: string, targetStudentId: string) => {
    if (!confirm("Bạn có chắc muốn hủy liên kết học sinh này khỏi tài khoản Phụ huynh?")) return
    try {
      const res = await unlinkParentStudentAction(parentId, targetStudentId)
      if (res.success) {
        showToast("Đã hủy liên kết học sinh.")
        if (multiChildModalParent) {
          setMultiChildModalParent((prev: any) => {
            if (!prev) return null
            const updatedStudents = prev.students.filter((st: any) => st.student.id !== targetStudentId)
            return { ...prev, students: updatedStudents }
          })
        }
        fetchStudents(selectedClassId)
      } else {
        showToast(res.error || "Hủy liên kết thất bại", "error")
      }
    } catch (e) {
      showToast("Lỗi hệ thống", "error")
    }
  }

  // Export excel helper
  const handleExportCSV = () => {
    if (processedStudents.length === 0) return
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    csvContent += "STT,Mã Học Sinh,Tên Học Sinh,Ngày Sinh,Tài Khoản PHHS,Mật Khẩu Mặc Định,Số Con Liên Kết,Trạng Thái\n"

    processedStudents.forEach((s, i) => {
      const parentObj = s.parents[0]?.parent
      const user = parentObj?.user
      const hasAcc = !!user
      const pAccount = user ? user.email : "Chưa khởi tạo"
      const pPassword = s.studentCode
      const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : ""
      const linkedCount = parentObj?.students?.length || 0
      const statusText = hasAcc ? "Hoàn tất" : "Chưa tạo"

      csvContent += `${i + 1},"${s.studentCode}","${s.studentName}","${dob}","${pAccount}","${pPassword}",${linkedCount},"${statusText}"\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Danh_sach_tai_khoan_PHHS_${selectedClassId || 'toan_truong'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8 font-sans text-slate-800 animate-in fade-in duration-500">

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold animate-in slide-in-from-top-5 duration-300 ${
          toastMessage.type === "success" 
            ? "bg-[#003B3A] text-white border-emerald-500/30" 
            : "bg-rose-900 text-white border-rose-500/30"
        }`}>
          <Sparkles className="w-5 h-5 text-[#36E08F]" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP FILTER & CONTROLS PANEL */}
      <div className="relative rounded-[2rem] bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,59,58,0.05)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005A5B] to-[#36E08F] p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/15 text-emerald-300 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Sky-Line Identity</span>
              <span className="text-white/60 text-xs font-semibold">• Quản trị dữ liệu PHHS</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Danh Mục & Khởi Tạo Tài Khoản PHHS</h2>
            <p className="text-xs text-emerald-100/70 font-medium">Quy chuẩn tài khoản: <code className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">P + Mã Học Sinh</code> | Mật khẩu mặc định: <code className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">Mã Học Sinh</code></p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={processedStudents.length === 0}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all active:scale-95 disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>Xuất danh sách (CSV)</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={!selectedClassId || generating || loading}
              className="px-6 py-3 rounded-2xl bg-[#36E08F] hover:bg-[#009688] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-lg shadow-[#36E08F]/30 transition-all active:scale-95 disabled:opacity-40"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Khởi tạo tài khoản</span>
            </button>
          </div>
        </div>

        {/* SELECTORS GRID */}
        <div className="p-6 sm:p-8 space-y-6 bg-slate-50/40">
          
          {/* Year & Campus Buttons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Year Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#36E08F]" />
                1. Chọn Niên Khoá
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterYearId("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    filterYearId === "ALL" 
                      ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20" 
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#36E08F] hover:text-[#36E08F]"
                  }`}
                >Tất cả niên khoá</button>
                {years.filter((y: any) => !y.isOff).map((y: any) => (
                  <button
                    key={y.id}
                    onClick={() => setFilterYearId(y.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      filterYearId === y.id 
                        ? "bg-[#36E08F] text-white shadow-md shadow-[#36E08F]/20 scale-105" 
                        : "bg-white text-slate-600 border border-slate-200 hover:border-[#36E08F] hover:text-[#36E08F]"
                    }`}
                  >
                    {y.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Campus Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <School className="w-3.5 h-3.5 text-[#36E08F]" />
                2. Chọn Cơ Sở Đào Tạo
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCampusId("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCampusId === "ALL" 
                      ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20" 
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#36E08F] hover:text-[#36E08F]"
                  }`}
                >Toàn hệ thống</button>
                {campuses.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampusId(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCampusId === c.id 
                        ? "bg-[#36E08F] text-white shadow-md shadow-[#36E08F]/20 scale-105" 
                        : "bg-white text-slate-600 border border-slate-200 hover:border-[#36E08F] hover:text-[#36E08F]"
                    }`}
                  >
                    {c.campusName}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Class Select Dropdown */}
          <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-xl space-y-2">
              <label className="text-[11px] font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[#36E08F]" />
                3. Chọn Lớp Học ({filteredClasses.length} lớp khả dụng)
              </label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 bg-white border-2 border-slate-200 focus:border-[#36E08F] rounded-2xl font-bold text-slate-800 text-sm outline-none transition-all cursor-pointer shadow-sm"
                >
                  <option value="">-- Vui lòng chọn lớp học để xem danh sách --</option>
                  {filteredClasses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.className} • {c.campus?.campusName || "Sky-Line"} ({c.academicYear?.name})
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
              </div>
            </div>

            {selectedClassId && (
              <div className="flex items-center gap-2 self-end sm:self-center text-xs text-slate-500 font-semibold bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lớp đã chọn: <strong className="text-emerald-800">{classes.find((c: any) => c.id === selectedClassId)?.className}</strong></span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#36E08F] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng học sinh</p>
            <p className="text-2xl font-black text-slate-800">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã có tài khoản</p>
            <p className="text-2xl font-black text-emerald-600">{stats.created}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa khởi tạo</p>
            <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Link className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PHHS Nhiều con</p>
            <p className="text-2xl font-black text-indigo-600">{stats.multiChild}</p>
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE SECTION */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden">
        
        {/* TABLE HEADER TOOLBAR */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên HS, mã HS, tài khoản PHHS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 focus:border-[#36E08F] rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right: Filters & Batch Delete */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "ALL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >Tất cả ({students.length})</button>
              <button
                onClick={() => setStatusFilter("CREATED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "CREATED" ? "bg-[#003B3A] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >Đã tạo ({stats.created})</button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "PENDING" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >Chưa tạo ({stats.pending})</button>
              <button
                onClick={() => setStatusFilter("MULTICHILD")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === "MULTICHILD" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >Nhiều con ({stats.multiChild})</button>
            </div>

            {selectedStudentIds.length > 0 && (
              <button
                onClick={handleDeleteMany}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-2 border border-rose-200 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa {selectedStudentIds.length} tài khoản</span>
              </button>
            )}

          </div>

        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 font-black uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length > 0 && selectedStudentIds.length === processedStudents.length}
                    onChange={() => {
                      if (selectedStudentIds.length === processedStudents.length) setSelectedStudentIds([])
                      else setSelectedStudentIds(processedStudents.map(s => s.id))
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-[#36E08F] focus:ring-[#36E08F] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4">STT / Thông tin học sinh</th>
                <th className="py-4 px-4">Ngày sinh</th>
                <th className="py-4 px-4">Mã Học sinh</th>
                <th className="py-4 px-4">Tài khoản PHHS (P + Mã HS)</th>
                <th className="py-4 px-4 text-center">Quan hệ Multi-Child</th>
                <th className="py-4 px-4 text-center">Trạng thái</th>
                <th className="py-4 px-4 text-right pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {(!selectedClassId || loading) && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-xs mx-auto flex flex-col items-center space-y-4 opacity-50">
                      {loading ? <RefreshCw className="w-10 h-10 animate-spin text-[#36E08F]" /> : <Search className="w-10 h-10 text-slate-400" />}
                      <p className="font-bold text-slate-600">
                        {loading ? "Đang tải dữ liệu học sinh & tài khoản Phụ huynh..." : "Vui lòng chọn Lớp học phía trên để hiển thị danh sách tài khoản"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && selectedClassId && processedStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-bold">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {!loading && processedStudents.map((s, idx) => {
                const parentLinkObj = s.parents[0]
                const parentObj = parentLinkObj?.parent
                const user = parentObj?.user
                const hasAccount = !!user
                const parentUsername = user?.email || (hasAccount ? `P${s.studentCode}` : "")
                const isSelected = selectedStudentIds.includes(s.id)

                // Multi-child check
                const linkedStudents = parentObj?.students || []
                const linkedCount = linkedStudents.length
                const isMultiChild = linkedCount > 1

                return (
                  <tr key={s.id} className={`hover:bg-teal-50/20 transition-all ${isSelected ? "bg-teal-50/40" : ""}`}>
                    
                    {/* Checkbox */}
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedStudentIds(prev => 
                            isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id]
                          )
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-[#36E08F] focus:ring-[#36E08F] cursor-pointer"
                      />
                    </td>

                    {/* Student Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${hasAccount ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{s.studentName}</p>
                          {parentObj?.parentName && (
                            <p className="text-[11px] text-slate-400 font-medium">{parentObj.parentName}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* DOB */}
                    <td className="py-4 px-4 font-semibold text-slate-500">
                      {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "---"}
                    </td>

                    {/* Student Code */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-600 bg-slate-50/50 rounded-lg py-1 px-2.5 inline-block my-3">
                      {s.studentCode}
                    </td>

                    {/* Parent Username */}
                    <td className="py-4 px-4">
                      {hasAccount ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[#003B3A] text-sm bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-xl">
                            {parentUsername}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-300 italic">Chưa khởi tạo</span>
                      )}
                    </td>

                    {/* Multi-Child Badge */}
                    <td className="py-4 px-4 text-center">
                      {isMultiChild ? (
                        <button
                          onClick={() => setMultiChildModalParent(parentObj)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200/60 transition-all cursor-pointer shadow-sm"
                        >
                          <Link className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Multi-Child ({linkedCount} con)</span>
                          <Eye className="w-3.5 h-3.5 text-indigo-400 ml-1" />
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300 font-medium">1 con</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {hasAccount ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-200/60">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Hoàn tất
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          Chưa tạo
                        </span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="py-4 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasAccount && (
                          <>
                            {/* Link Sibling Button */}
                            <button
                              onClick={() => setLinkModalStudent(s)}
                              title="Liên kết học sinh khác cho Phụ huynh này"
                              className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition-all"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleResetPassword(parentObj.id, s.studentCode)}
                              title="Khôi phục mật khẩu mặc định (Mã Học Sinh)"
                              className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 hover:border-amber-200 transition-all"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER CREDENTIAL REMINDER */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#36E08F]/10 text-[#36E08F] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p>
              Mật khẩu đăng nhập mặc định: <strong className="text-slate-800">Mã Học Sinh (8-10 chữ số)</strong>. Phụ huynh có thể tự đổi mật khẩu sau lần đăng nhập đầu tiên.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Hệ thống Quản trị Sky-Line</span>
        </div>

      </div>

      {/* MODAL 1: MULTI-CHILD DETAILS VIEW */}
      {multiChildModalParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Danh Sách Con Của Phụ Huynh</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tài khoản chính: <code className="font-mono text-indigo-600 font-bold">{multiChildModalParent.user?.email || multiChildModalParent.parentCode}</code></p>
                </div>
              </div>
              <button onClick={() => setMultiChildModalParent(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {multiChildModalParent.students?.map((item: any, i: number) => {
                const child = item.student
                return (
                  <div key={child.id || i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-black text-slate-800 text-sm">{child.studentName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                        <span>Mã HS: <strong className="font-mono text-slate-700">{child.studentCode}</strong></span>
                        <span>•</span>
                        <span>Lớp: <strong className="text-indigo-600">{child.class?.className || "---"}</strong></span>
                      </div>
                    </div>
                    {multiChildModalParent.students.length > 1 && (
                      <button
                        onClick={() => handleUnlinkStudent(multiChildModalParent.id, child.id)}
                        title="Hủy liên kết con này khỏi Phụ huynh"
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Hủy liên kết</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setMultiChildModalParent(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LINK SIBLING TO PARENT */}
      {linkModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#36E08F] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Liên Kết Con (Multi-Child)</h3>
                  <p className="text-xs text-slate-400 font-semibold">Tài khoản Phụ huynh của: <strong>{linkModalStudent.studentName}</strong></p>
                </div>
              </div>
              <button onClick={() => { setLinkModalStudent(null); setSearchQuery(""); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Tìm kiếm Học sinh thứ 2 (theo tên hoặc Mã HS):</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nhập tên học sinh hoặc Mã HS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 focus:border-[#36E08F] rounded-xl text-xs font-semibold outline-none"
                />
                {searching && <RefreshCw className="w-4 h-4 animate-spin text-[#36E08F] absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
            </div>

            {/* Search Results list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <p className="text-center text-xs text-slate-400 py-4 font-semibold">Không tìm thấy học sinh nào phù hợp.</p>
              )}

              {searchResults.map((resSt) => {
                if (resSt.id === linkModalStudent.id) return null
                return (
                  <div key={resSt.id} className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-100 flex items-center justify-between gap-3 transition-all">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{resSt.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Mã HS: {resSt.studentCode} • Lớp: {resSt.class?.className}</p>
                    </div>
                    <button
                      onClick={() => handleLinkStudent(resSt.id)}
                      disabled={linking}
                      className="px-3 py-1.5 rounded-lg bg-[#36E08F] hover:bg-[#009688] text-white font-bold text-[11px] transition-all disabled:opacity-50"
                    >
                      {linking ? "Đang lưu..." : "Liên kết"}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => { setLinkModalStudent(null); setSearchQuery(""); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >Hủy</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
