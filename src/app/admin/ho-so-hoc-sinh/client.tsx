"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Users, Loader2, User, Award, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, Heart, MessageCircle, Send, Globe, Printer, Download,
  Search, Calendar, MapPin, CheckCircle, AlertTriangle, GraduationCap,
  Layers, School, Building2, RotateCcw, RefreshCw, Trash2
} from "lucide-react"

interface StudentProfilesAdminClientProps {
  academicYears: any[]
  campuses: any[]
  classes: any[]
  activeYearId: string
  activeYearName: string
}

export function StudentProfilesAdminClient({
  academicYears,
  campuses,
  classes,
  activeYearId,
  activeYearName
}: StudentProfilesAdminClientProps) {
  const handleResetMOETData = async () => {
    if (!confirm("Bạn có chắc chắn muốn RESET XÓA SẠCH toàn bộ dữ liệu Kết quả Học tập (MOET) năm học 2025-2026 không?\n\nThao tác này sẽ làm sạch cơ sở dữ liệu để bạn tải lên tệp Import hoàn toàn mới.")) return
    try {
      const res = await fetch("/api/admin/ktdbcl/reset-kqht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear: "2025-2026" })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message || "Đã reset xong dữ liệu MOET 2025-2026!")
        window.location.reload()
      } else {
        alert("Lỗi reset: " + data.message)
      }
    } catch (err: any) {
      alert("Lỗi reset dữ liệu: " + err.message)
    }
  }
  // Filter States
  const [selectedYearId, setSelectedYearId] = useState(activeYearId)
  const [schoolBlock, setSchoolBlock] = useState<"k12" | "preschool">("k12")
  const [selectedCampusId, setSelectedCampusId] = useState("all")
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [selectedClassId, setSelectedClassId] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Students list and loading states
  const [students, setStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  // Tab states
  const [activeTab, setActiveTab] = useState("cv")
  const [entranceSubTab, setEntranceSubTab] = useState<"results" | "admin" | "academic">("results")
  const [loadingProfile, setLoadingProfile] = useState(false)
  
  // Custom mock interactive likes & comments for the wall posts
  const [postLikes, setPostLikes] = useState<Record<string, { count: number, liked: boolean }>>({})
  const [postCommentsState, setPostCommentsState] = useState<Record<string, { author: string, text: string, time: string }[]>>({})
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({})

  // Dynamic Grade options based on Bậc học (schoolBlock)
  const gradeOptions = useMemo(() => {
    if (schoolBlock === "k12") {
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    } else {
      return ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"]
    }
  }, [schoolBlock])

  // Filtered classes based on selected Year, Campus, and schoolBlock
  const filteredClassesList = useMemo(() => {
    return classes.filter(c => {
      // Filter by academic year
      if (c.academicYearId !== selectedYearId) return false
      
      // Filter by campus
      if (selectedCampusId !== "all" && c.campusId !== selectedCampusId) return false
      
      // Filter by Block & Grade
      const blockMatch = schoolBlock === "k12" 
        ? !["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(c.grade)
        : ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(c.grade)
      
      if (!blockMatch) return false

      if (selectedGrade !== "all" && c.grade !== selectedGrade) return false

      return true
    })
  }, [classes, selectedYearId, selectedCampusId, schoolBlock, selectedGrade])

  // Automatically reset Grade & Class filter when schoolBlock changes
  useEffect(() => {
    setSelectedGrade("all")
    setSelectedClassId("all")
    setSelectedStudentId("")
    setSelectedStudent(null)
  }, [schoolBlock])

  // Automatically reset Class filter when Grade or Campus changes
  useEffect(() => {
    setSelectedClassId("all")
  }, [selectedGrade, selectedCampusId])

  // Load students from API when filters change
  useEffect(() => {
    // To prevent loading thousands of records, we require at least Campus or Grade or Class to be selected
    // unless searchQuery is populated
    if (selectedCampusId === "all" && selectedGrade === "all" && selectedClassId === "all" && !searchQuery.trim()) {
      setStudents([])
      setSelectedStudentId("")
      setSelectedStudent(null)
      return
    }

    async function fetchStudentsList() {
      try {
        setLoadingStudents(true)
        const params = new URLSearchParams()
        params.set("action", "getProfiles")
        params.set("academicYearId", selectedYearId)
        
        if (selectedCampusId !== "all") params.set("campusId", selectedCampusId)
        if (selectedClassId !== "all") params.set("classId", selectedClassId)
        if (searchQuery.trim()) params.set("search", searchQuery.trim())

        // Fetch
        const res = await fetch(`/api/admin/student-profiles?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          let data = result.data || []
          
          // If we filtered by grade locally (since database doesn't have grade on Student directly but has classId)
          if (selectedGrade !== "all") {
            data = data.filter((s: any) => s.class?.grade === selectedGrade)
          }

          // If block filter is preschool/k12
          data = data.filter((s: any) => {
            const isPreschoolGrade = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"].includes(s.class?.grade)
            return schoolBlock === "k12" ? !isPreschoolGrade : isPreschoolGrade
          })

          setStudents(data)

          // Set default selected student if not empty
          if (data.length > 0) {
            const hasCurrentStudent = data.some((s: any) => s.id === selectedStudentId)
            if (!hasCurrentStudent) {
              setSelectedStudentId(data[0].id)
            }
          } else {
            setSelectedStudentId("")
            setSelectedStudent(null)
          }
        }
      } catch (err) {
        console.error("Error loading students list:", err)
      } finally {
        setLoadingStudents(false)
      }
    }

    const timer = setTimeout(fetchStudentsList, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [selectedYearId, schoolBlock, selectedCampusId, selectedGrade, selectedClassId, searchQuery])

  // Load detailed profile for selected student
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null)
      return
    }
    const student = students.find(s => s.id === selectedStudentId)
    setSelectedStudent(student || null)
  }, [selectedStudentId, students])

  // Batch Export PDF Handler
  const handleBatchPdfExport = (scope: "class" | "grade" | "campus" | "block") => {
    const params = new URLSearchParams()
    params.set("type", scope)
    params.set("academicYearId", selectedYearId)
    params.set("block", schoolBlock)

    if (scope === "class") {
      if (selectedClassId === "all") {
        alert("Vui lòng chọn một Lớp cụ thể để xuất PDF.")
        return
      }
      params.set("classId", selectedClassId)
    } else if (scope === "grade") {
      if (selectedGrade === "all") {
        alert("Vui lòng chọn một Khối cụ thể để xuất PDF.")
        return
      }
      params.set("grade", selectedGrade)
      if (selectedCampusId !== "all") params.set("campusId", selectedCampusId)
    } else if (scope === "campus") {
      if (selectedCampusId === "all") {
        alert("Vui lòng chọn một Cơ sở cụ thể để xuất PDF.")
        return
      }
      params.set("campusId", selectedCampusId)
    }

    // Open print window
    window.open(`/admin/ho-so-hoc-sinh/print?${params.toString()}`, "_blank")
  }

  // Filter students by local search query
  const filteredStudentsList = students

    const tabs = [
    { id: "cv", label: "Xem chi tiết HSHS", icon: User },
    { id: "academic", label: "Kết quả Học tập (MOET)", icon: FileText },
    { id: "entrance", label: "Khảo sát đầu vào", icon: ClipboardCheck },
    { id: "achievements", label: "Thành tích", icon: Award },
    { id: "orientation", label: "Hướng nghiệp", icon: Compass },
    { id: "projects", label: "Hoạt động trải nghiệm", icon: BookOpen },
    { id: "comments", label: "Nhận xét nổi bật", icon: MessageSquare },
    { id: "support", label: "Hỗ trợ học tập", icon: GraduationCap }
  ]

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

  return (
    <div className="space-y-6">
      {/* 1. Selector Bar (Admin filters) */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-xs font-black text-slate-800 uppercase tracking-wider">
            <div className="p-1.5 bg-[#48BFE3]/10 text-[#48BFE3] rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <span>Bộ Lọc Tra Cứu &amp; Xuất Báo Cáo Hồ Sơ Học Sinh</span>
          </div>
          <span className="text-[10px] font-extrabold text-[#48BFE3] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            Năm học: {academicYears.find(y => y.id === selectedYearId)?.name || activeYearName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Year selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#48BFE3]" />
              Năm học
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* School Block selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-[#48BFE3]" />
              Bậc học
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSchoolBlock("k12")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "k12" ? "bg-white text-[#48BFE3] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Phổ thông
              </button>
              <button
                type="button"
                onClick={() => setSchoolBlock("preschool")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "preschool" ? "bg-white text-[#48BFE3] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Mầm non
              </button>
            </div>
          </div>

          {/* Campus selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#48BFE3]" />
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3]"
            >
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.campusName}</option>
              ))}
            </select>
          </div>

          {/* Grade selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#48BFE3]" />
              Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3]"
            >
              <option value="all">Tất cả Khối</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          </div>

          {/* Class selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#48BFE3]" />
              Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#48BFE3]"
            >
              <option value="all">Tất cả Lớp ({filteredClassesList.length})</option>
              {filteredClassesList.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Batch Export PDF buttons */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-500">
            <Printer className="w-4 h-4 text-[#48BFE3]" />
            <span>Xuất báo cáo PDF đồng loạt:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBatchPdfExport("class")}
              disabled={selectedClassId === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất PDF Lớp</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("grade")}
              disabled={selectedGrade === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất PDF Khối</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("campus")}
              disabled={selectedCampusId === "all"}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất PDF Cơ sở</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("block")}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#48BFE3] to-[#009085] hover:opacity-95 text-white rounded-xl shadow-md shadow-[#48BFE3]/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất PDF Bậc Học</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Student list */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#48BFE3]" />
                  Danh sách Học sinh
                </h3>
                <span className="text-[10px] font-extrabold bg-teal-50 text-[#48BFE3] px-2.5 py-0.5 rounded-full border border-teal-200/80">
                  {filteredStudentsList.length} học sinh
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã hoặc tên học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#48BFE3]/20 focus:border-[#48BFE3] transition-all text-slate-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 text-[#48BFE3] animate-spin opacity-60" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Đang tải...</span>
                </div>
              ) : filteredStudentsList.length === 0 ? (
                <div className="text-[10px] text-slate-400 font-semibold italic text-center py-8">
                  {selectedCampusId === "all" && selectedGrade === "all" && selectedClassId === "all" && !searchQuery
                    ? "Vui lòng lọc theo Cơ sở, Khối hoặc tìm kiếm để hiển thị học sinh."
                    : "Không tìm thấy học sinh nào."}
                </div>
              ) : (
                filteredStudentsList.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      selectedStudentId === s.id
                        ? "bg-teal-50/80 text-[#48BFE3] border-[#48BFE3] shadow-xs"
                        : "bg-slate-50/40 hover:bg-slate-100/60 border-slate-200/60 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase flex-shrink-0 ${
                        selectedStudentId === s.id ? "bg-[#48BFE3] text-white shadow-2xs" : "bg-slate-200/80 text-slate-700"
                      }`}>
                        {s.studentName.split(" ").pop()?.charAt(0) || "H"}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="truncate font-black text-slate-800 text-xs">{s.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5">{s.className || s.classCode || "Chưa xếp lớp"}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-white border border-slate-200/80 px-2 py-0.5 rounded text-slate-500 flex-shrink-0 font-extrabold">
                      {s.studentCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right workspace: Selected Student Details */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Profile Details Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-155 flex items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#48BFE3]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-teal-50 border border-[#48BFE3]/30 flex items-center justify-center text-[#48BFE3] shadow-sm">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-base text-slate-805 tracking-tight leading-tight">{selectedStudent?.studentName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-bold">
                      <span>Mã HS: <span className="text-slate-700 font-extrabold">{selectedStudent?.studentCode}</span></span>
                      <span>Ngày sinh: <span className="text-slate-700 font-extrabold">{selectedStudent?.dob || "N/A"}</span></span>
                      <span>Giới tính: <span className="text-slate-700 font-extrabold">{selectedStudent?.gender || "N/A"}</span></span>
                    </div>
                  </div>
                </div>
                
                {/* Print individual PDF */}
                <button
                  onClick={() => window.open(`/admin/ho-so-hoc-sinh/print?type=student&studentId=${selectedStudentId}&academicYearId=${selectedYearId}`, "_blank")}
                  className="flex items-center gap-1.5 bg-[#48BFE3] hover:bg-[#009085] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In CV</span>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50 px-2 pt-2 gap-1 overflow-x-auto">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-t-2 border-x rounded-t-xl transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-[#48BFE3] border-[#48BFE3] border-x-slate-200 shadow-xs"
                          : "text-slate-500 border-transparent hover:text-slate-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6 flex-grow">
                {selectedStudent ? (
                  <div>
                    {/* TAB: CV INTEGRATED */}
                    {activeTab === "cv" && (
                      <div className="space-y-6">
                        <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-8 max-w-4xl mx-auto font-sans relative overflow-hidden">
                          {/* CV Header */}
                          <div className="border-b-2 border-[#48BFE3] pb-6 flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-6 h-6 text-[#48BFE3]" />
                                <span className="font-extrabold text-sm tracking-wider text-slate-700 font-sans">SKY-LINE SYSTEM</span>
                              </div>
                              <h2 className="text-xl font-black text-slate-805 uppercase tracking-tight font-sans">Hồ sơ Năng lực Học sinh</h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Student Comprehensive Profile & Portfolio</p>
                            </div>
                            <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
                              <div>Năm học: <span className="text-slate-800 font-bold">{selectedStudent?.yearName}</span></div>
                              <div>Cơ sở: <span className="text-slate-800 font-bold">{selectedStudent.campusName}</span></div>
                            </div>
                          </div>

                          {/* CV Body Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            {/* Left Column */}
                            <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-6">
                              <div className="text-center space-y-3">
                                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#48BFE3]/20 shadow-inner flex items-center justify-center bg-slate-50 text-slate-355">
                                  <User className="w-16 h-16" />
                                </div>
                                <div>
                                  <h3 className="font-black text-base text-slate-800">{selectedStudent?.studentName}</h3>
                                  <p className="text-[10px] text-[#48BFE3] font-extrabold uppercase tracking-widest mt-0.5">Lớp: {selectedStudent.className || "N/A"}</p>
                                </div>
                              </div>

                              {/* Administrative Info */}
                              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs text-slate-655 font-semibold">
                                <div className="flex justify-between">
                                  <span>Mã học sinh:</span>
                                  <span className="font-bold text-slate-805">{selectedStudent?.studentCode}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Ngày sinh:</span>
                                  <span className="font-bold text-slate-805">{selectedStudent.dob}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Giới tính:</span>
                                  <span className="font-bold text-slate-805">{selectedStudent.gender}</span>
                                </div>
                              </div>

                              {/* Outstanding Achievements */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <Award className="w-4 h-4 text-[#48BFE3]" />
                                  Thành tích nổi bật
                                </h4>
                                {(!selectedStudent.achievements || selectedStudent.achievements.length === 0) ? (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận thành tích.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {selectedStudent.achievements.slice(0, 3).map((a: any) => {
                                      const displayExam = a.achievement?.exam?.name || a.achievement?.examName || a.examName || "Kỳ thi Khảo thí";
                                      const displayRound = a.achievement?.exam?.round?.name || a.achievement?.roundName || a.roundName || "Vòng thi";
                                      const displayPrize = a.achievement?.name || a.name || "Giải thưởng";
                                      return (
                                        <div key={a.id} className="bg-amber-50/50 border border-amber-200/70 p-3 rounded-xl space-y-1.5">
                                          <div>
                                            <span className="text-[9px] font-bold text-amber-800/60 uppercase tracking-wider block">Kỳ thi</span>
                                            <span className="font-black text-slate-800 text-xs leading-tight block">{displayExam}</span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/40">
                                            <span className="text-[10px] font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                                              Giải: {displayPrize}
                                            </span>
                                            <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50">
                                              Vòng: {displayRound}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Career Orientation */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <Compass className="w-4 h-4 text-[#48BFE3]" />
                                  Định hướng ngành nghề
                                </h4>
                                {selectedStudent.orientation ? (
                                  <div className="bg-teal-50/20 border border-teal-100 p-3 rounded-lg space-y-1">
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nhóm ngành quan tâm</div>
                                    <div className="text-xs font-black text-slate-750">{selectedStudent.orientation}</div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa định hướng ngành nghề.</p>
                                )}
                              </div>
                            </div>

                            {/* Right Column */}
                            <div className="md:col-span-2 space-y-6">
                              {/* Section: Academic Intake Profile */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <ClipboardCheck className="w-4 h-4 text-[#48BFE3]" />
                                  Hồ sơ học thuật đầu vào (Intake Evaluation)
                                </h4>
                                {selectedStudent.admitted !== "Không" ? (
                                  <div className="space-y-3">
                                    {schoolBlock === "preschool" ? (
                                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                                        <div className="text-xs font-bold text-slate-700">Đánh giá phát triển mầm non: <span className="font-extrabold text-[#48BFE3]">{selectedStudent.devAssessment || "N/A"}</span></div>
                                        {selectedStudent.probationaryComment && (
                                          <div className="bg-white p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 italic leading-relaxed">
                                            "{selectedStudent.probationaryComment}"
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                                          <div className="text-[9px] text-[#48BFE3] font-bold uppercase tracking-wider">Toán học</div>
                                          <div className="text-lg font-black text-slate-805 mt-0.5">{selectedStudent.mathScore || "—"}</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                                          <div className="text-[9px] text-indigo-650 font-bold uppercase tracking-wider">Ngữ văn</div>
                                          <div className="text-lg font-black text-slate-805 mt-0.5">{selectedStudent.literatureScore || "—"}</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                                          <div className="text-[9px] text-sky-655 font-bold uppercase tracking-wider">Anh viết</div>
                                          <div className="text-lg font-black text-slate-805 mt-0.5">{selectedStudent.writtenEnglishScore || "—"}</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                                          <div className="text-[9px] text-sky-655 font-bold uppercase tracking-wider">Anh nói</div>
                                          <div className="text-lg font-black text-slate-850 mt-0.5">{selectedStudent.oralEnglishScore || "—"}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận điểm khảo sát đầu vào.</p>
                                )}
                              </div>

                              {/* Section: Projects & Experiences */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                                  Hoạt động trải nghiệm
                                </h4>
                                {(!selectedStudent.experientialActivities || selectedStudent.experientialActivities.length === 0) && (!selectedStudent.projectExperiences || selectedStudent.projectExperiences.length === 0) ? (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Học sinh chưa tham gia hoạt động trải nghiệm nào.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {(selectedStudent.experientialActivities || []).slice(0, 3).map((act: any) => (
                                      <div key={act.id} className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg text-xs">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-bold text-slate-805">{act.activityName}</div>
                                            <div className="text-[9px] text-slate-400 mt-0.5">{act.groupName}</div>
                                          </div>
                                          <div className="flex gap-1.5 items-center">
                                            <span className="text-[8px] font-black uppercase bg-[#48BFE3]/10 text-[#48BFE3] px-2 py-0.5 rounded">
                                              {act.role}
                                            </span>
                                            <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                                              {act.evalLevel}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    {(selectedStudent.projectExperiences || []).slice(0, 3).map((p: any) => (
                                      <div key={p.id} className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-lg text-xs">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <div className="font-bold text-slate-805">{p.projectName}</div>
                                            <div className="text-[9px] text-slate-400 mt-0.5">Dự án học tập</div>
                                          </div>
                                          <div className="flex gap-1.5 items-center">
                                            <span className="text-[8px] font-black uppercase bg-[#48BFE3]/10 text-[#48BFE3] px-2 py-0.5 rounded">
                                              {p.role || "Thành viên"}
                                            </span>
                                            <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                                              {p.result || "Đạt"}
                                            </span>
                                          </div>
                                        </div>
                                        {p.notes && <p className="text-[9px] text-slate-500 mt-1 line-clamp-1 leading-relaxed">"${p.notes}"</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Section: Learning Support Progress */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <GraduationCap className="w-4 h-4 text-[#48BFE3]" />
                                  Kế hoạch hỗ trợ học tập & Phát triển
                                </h4>
                                {!selectedStudent.supportReason ? (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Không thuộc đối tượng nhận hỗ trợ trong năm học này.</p>
                                ) : (
                                  <div className="border border-slate-100 bg-slate-50/30 p-3 rounded-lg text-xs space-y-2">
                                    <div className="font-semibold text-slate-705">Mục tiêu: <span className="font-bold text-slate-800">{selectedStudent.supportReason}</span></div>
                                    <div className="text-[10px] text-slate-400 font-bold">GV phụ trách: {selectedStudent.supportTeacher}</div>
                                  </div>
                                )}
                              </div>

                              {/* Section: GVCN Testimonial */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <MessageSquare className="w-4 h-4 text-[#48BFE3]" />
                                  Nhận xét định kỳ từ Giáo viên Chủ nhiệm
                                </h4>
                                {selectedStudent.latestGvcnComment ? (
                                  <div className="bg-teal-50/10 border-l-4 border-[#48BFE3] p-3 rounded-r-lg space-y-2">
                                    <p className="text-xs text-slate-705 font-semibold italic leading-relaxed whitespace-pre-wrap">
                                      "{selectedStudent.latestGvcnComment}"
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận đánh giá định kỳ.</p>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    )}

                                                                                {activeTab === "academic" && (() => {
                      const rawScores = selectedStudent?.termScores || selectedStudent?.student?.termScores || []
                      const rawSummaries = selectedStudent?.termSummaries || selectedStudent?.student?.termSummaries || []
                      
                      const classCodeStr = String(
                        selectedStudent?.class?.classCode || 
                        selectedStudent?.classCode || 
                        selectedStudent?.className || 
                        selectedStudent?.student?.class?.classCode || 
                        ""
                      )
                      const classGradeStr = String(
                        selectedStudent?.class?.grade || 
                        selectedStudent?.grade || 
                        selectedStudent?.student?.class?.grade || 
                        ""
                      )
                      const levelStr = String(
                        selectedStudent?.class?.level || 
                        selectedStudent?.level || 
                        selectedStudent?.student?.class?.level || 
                        ""
                      ).toUpperCase()

                      const isPrimary = 
                        schoolBlock === "preschool" ||
                        levelStr === "PRIMARY" || 
                        levelStr.includes("TIEU HOC") || 
                        levelStr.includes("TIỂU HỌC") ||
                        ["1", "2", "3", "4", "5"].includes(classGradeStr) ||
                        ["1", "2", "3", "4", "5"].some(g => classCodeStr.startsWith(g + ".") || classCodeStr.startsWith(g + "_")) ||
                        /^[1-5][._\s]/i.test(classCodeStr)

                      const isCheckSymbol = (v) => {
                        if (!v || v === "—") return false
                        const s = String(v).trim()
                        if (["✓", "", "v", "V", "x", "X", "1", "true", "True"].includes(s)) return true
                        const code = s.charCodeAt(0)
                        return code === 61692 || code === 10003 || code === 10004
                      }

                      let primaryKqgdHK1 = ""
                      let primaryKqgdHK2 = ""
                      let primaryKqgdCN = ""

                      const isKqgdSubject = (code, name) => {
                        const c = String(code || "").toUpperCase()
                        const n = String(name || "").trim().toLowerCase()
                        return c === "HOAN_THANH_XUAT_SAC" || c === "HOAN_THANH_TOT" || c === "HOAN_THANH" || c === "CHUA_HOAN_THANH" ||
                               n === "hoàn thành xuất sắc" || n === "hoàn thành tốt" || n === "hoàn thành" || n === "chưa hoàn thành" ||
                               n === "khen thưởng" || n === "khen thưởng cấp trường"
                      }

                      const subjectMap = new Map()
                      rawScores.forEach((ts) => {
                        let subName = ts.subject?.subjectName || "Môn học"
                        let subCode = ts.subject?.subjectCode || ""

                                                if (isPrimary) {
                          const lowerN = (subName + " " + subCode).toLowerCase()
                          if (lowerN.includes("tiếng việt") || lowerN.includes("tieng viet") || lowerN.includes("tvi")) subName = "Tiếng Việt"
                          else if (lowerN.includes("toán") || lowerN.includes("toan")) subName = "Toán"
                          else if (lowerN.includes("tiếng anh") || lowerN.includes("tieng anh") || lowerN.includes("esl") || lowerN.includes("eng")) subName = "Tiếng Anh"
                          else if (lowerN.includes("đạo đức") || lowerN.includes("dao duc") || lowerN.includes("giáo dục công dân") || lowerN.includes("gcd")) subName = "Đạo đức"
                          else if (lowerN.includes("tn-xh") || lowerN.includes("tự nhiên") || lowerN.includes("tnxh") || lowerN.includes("khoa học") || lowerN.includes("kht")) subName = "TN-XH / Khoa học"
                          else if (lowerN.includes("tin học") || lowerN.includes("công nghệ") || lowerN.includes("tin")) subName = "Tin học và Công nghệ"
                          else if (lowerN.includes("âm nhạc") || lowerN.includes("am nhac") || lowerN.includes("nth") || lowerN.includes("music")) subName = "Âm nhạc"
                          else if (lowerN.includes("mĩ thuật") || lowerN.includes("mỹ thuật") || lowerN.includes("mi thuat") || lowerN.includes("art")) subName = "Mĩ thuật"
                          else if (lowerN.includes("thể chất") || lowerN.includes("gdc") || lowerN.includes("gtc")) subName = "Giáo dục thể chất"
                          else if (lowerN.includes("trải nghiệm") || lowerN.includes("hdtn") || lowerN.includes("hđtn")) subName = "Hoạt động trải nghiệm"
                        }

                        const hasScore = ts.score !== null && ts.score !== undefined
                        const hasGrade = ts.evaluationGrade !== null && ts.evaluationGrade !== undefined && String(ts.evaluationGrade).trim() !== "" && ts.evaluationGrade !== "—"
                        const displayVal = (hasScore && hasGrade) ? { score: ts.score, grade: ts.evaluationGrade } : (hasScore ? ts.score : (ts.evaluationGrade || "—"))

                        const key = (isPrimary ? subName : (ts.subjectId || subName)).normalize("NFC").trim()
                        if (!subjectMap.has(key)) {
                          subjectMap.set(key, { id: key, name: subName, code: subCode, hk1: null, hk2: null, cn: null })
                        }
                        const item = subjectMap.get(key)
                        const normSem = String(ts.semester || "").trim().toUpperCase()
                        const isHK1 = normSem === "HK1" || normSem === "HKI" || normSem.includes("HỌC KỲ 1") || normSem.includes("HỌC KÌ 1") || normSem.includes("HỌC KỲ I") || normSem === "1"
                        const isHK2 = normSem === "HK2" || normSem === "HKII" || normSem.includes("HỌC KỲ 2") || normSem.includes("HỌC KÌ 2") || normSem.includes("HỌC KỲ II") || normSem === "2"
                        const isCN = normSem === "CN" || normSem.includes("CẢ NĂM") || normSem.includes("CA NAM")

                        if (isHK1) item.hk1 = displayVal
                        else if (isHK2) item.hk2 = displayVal
                        else if (isCN) item.cn = displayVal
                        else item.hk1 = displayVal
                      })

                      // Primary full subjects catalog
                      if (isPrimary) {
                        const standardPrimarySubjects = [
                          { code: "TVI", name: "Tiếng Việt" },
                          { code: "TOA", name: "Toán" },
                          { code: "ENG", name: "Tiếng Anh" },
                          { code: "DAO_DUC", name: "Đạo đức" },
                          { code: "TNXH", name: "TN-XH / Khoa học" },
                          { code: "TIN", name: "Tin học và Công nghệ" },
                          { code: "AM_NHAC", name: "Âm nhạc" },
                          { code: "MI_THUAT", name: "Mĩ thuật" },
                          { code: "GTC", name: "Giáo dục thể chất" },
                          { code: "HDTN", name: "Hoạt động trải nghiệm" }
                        ]
                        standardPrimarySubjects.forEach(ps => {
                          const existingKey = Array.from(subjectMap.keys()).find((k: any) => {
                            const item = subjectMap.get(k)
                            const n = (item?.name || "").normalize("NFC").toLowerCase().trim()
                            const c = (item?.code || "").normalize("NFC").toLowerCase().trim()
                            const targetN = ps.name.normalize("NFC").toLowerCase().trim()
                            const targetC = ps.code.normalize("NFC").toLowerCase().trim()
                            return n === targetN || c === targetC || n.includes(targetN.split(" ")[0]) || targetN.includes(n.split(" ")[0])
                          })
                          if (!existingKey) {
                            subjectMap.set(ps.code, { id: ps.code, name: ps.name, code: ps.code, hk1: null, hk2: null, cn: null })
                          }
                        })
                      }

                      const subjectRows = Array.from(subjectMap.values())
                        .filter((row: any) => !isKqgdSubject(row.code, row.name))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name, "vi"))

                      const summariesMap: Record<string, any> = {}
                      rawSummaries.forEach((s: any) => {
                        const normS = String(s.semester || "").trim().toUpperCase()
                        if (normS === "HK1" || normS === "HKI" || normS.includes("HỌC KỲ 1") || normS === "1") summariesMap["HK1"] = s
                        else if (normS === "HK2" || normS === "HKII" || normS.includes("HỌC KỲ 2") || normS === "2") summariesMap["HK2"] = s
                        else if (normS === "CN" || normS.includes("CẢ NĂM")) summariesMap["CN"] = s
                        else if (s.semester) summariesMap[s.semester] = s
                      })

                      const hk1Summary = summariesMap["HK1"]
                      const hk2Summary = summariesMap["HK2"]
                      const cnSummary = summariesMap["CN"]

                      const computePrimaryKqgd = (rows: any[], sem: "hk1" | "hk2" | "cn") => {
                        if (!rows || rows.length === 0) return null
                        let hasVal = false
                        let allT = true
                        let anyC = false

                        rows.forEach(r => {
                          const val = r[sem]
                          if (!val || val === "—") return
                          hasVal = true
                          let g = ""
                          let num = NaN
                          if (typeof val === "object" && val !== null) {
                            g = val.grade ? String(val.grade).trim().toUpperCase() : ""
                            num = val.score !== null && val.score !== undefined ? Number(val.score) : NaN
                          } else if (typeof val === "number") {
                            num = val
                          } else {
                            g = String(val).trim().toUpperCase()
                            if (!isNaN(Number(g))) num = Number(g)
                          }

                          if (g === "C" || g.includes("CHƯA") || (!isNaN(num) && num < 5.0)) {
                            anyC = true
                            allT = false
                          } else if (g === "H" || g.includes("HOÀN THÀNH") || (!isNaN(num) && num < 9.0)) {
                            allT = false
                          }
                        })

                        if (!hasVal) return null
                        if (anyC) return "Chưa hoàn thành"
                        if (allT) return "Hoàn thành xuất sắc"
                        return "Hoàn thành tốt"
                      }

                      const computedKqgdHK1 = computePrimaryKqgd(subjectRows, "hk1")
                      const computedKqgdHK2 = computePrimaryKqgd(subjectRows, "hk2")
                      const computedKqgdCN = computePrimaryKqgd(subjectRows, "cn")

                      // Primary: Dynamic Summary computation based on imported data without hardcoded defaults
                      const computedPrimaryCN = computePrimaryKqgd(subjectRows, "cn") || computePrimaryKqgd(subjectRows, "hk1")
                      const finalKqgdHK1 = primaryKqgdHK1 || hk1Summary?.academicRating || computedKqgdHK1 || null
                      const finalKqgdHK2 = primaryKqgdHK2 || hk2Summary?.academicRating || computedKqgdHK2 || null
                      const finalKqgdCN = primaryKqgdCN || cnSummary?.academicRating || computedPrimaryCN || null


                      const hasData = subjectRows.length > 0 || rawSummaries.length > 0 || !!finalKqgdCN

                      const formatScoreBadge = (val) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        
                        if (typeof val === "object" && val !== null && (val.score !== undefined || val.grade !== undefined)) {
                          const gStr = val.grade ? String(val.grade).trim() : ""
                          const num = val.score !== null && val.score !== undefined ? (typeof val.score === "number" ? val.score : parseFloat(val.score)) : NaN

                          let gradeBadge = null
                          if (gStr === "T" || gStr === "Tốt" || gStr === "Hoàn thành tốt") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                          } else if (gStr === "H" || gStr === "Hoàn thành") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                          } else if (gStr === "C" || gStr === "Chưa hoàn thành") {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                          } else if (gStr) {
                            gradeBadge = <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{gStr}</span>
                          }

                          let scoreBadge = null
                          if (!isNaN(num)) {
                            let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                            if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                            else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                            else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                            else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                            scoreBadge = <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                          }

                          return (
                            <div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                              {gradeBadge}
                              {scoreBadge}
                            </div>
                          )
                        }

                        const str = String(val).trim()
                        if (isCheckSymbol(str)) {
                          return <span className="inline-flex items-center justify-center bg-teal-50 text-[#48BFE3] border border-teal-200 px-2 py-0.5 rounded-lg font-black text-xs shadow-2xs">✓</span>
                        }
                        if (str === "T" || str === "Tốt") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                        }
                        if (str === "H" || str === "Hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                        }
                        if (str === "C" || str === "Chưa hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                        }
                        const num = typeof val === "number" ? val : parseFloat(val)
                        if (!isNaN(num)) {
                          let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                          if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                          else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                          else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                          else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                          return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                        }
                        return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{str}</span>
                      }

                                            const renderGradeBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        let gStr = ""
                        let scoreNum = NaN
                        if (typeof val === "object" && val !== null) {
                          gStr = val.grade ? String(val.grade).trim() : ""
                          scoreNum = val.score !== null && val.score !== undefined ? Number(val.score) : NaN
                        } else if (typeof val === "number") {
                          scoreNum = val
                        } else {
                          gStr = String(val).trim()
                          if (!isNaN(Number(gStr))) scoreNum = Number(gStr)
                        }

                        // Infer Primary grade if missing but score is available
                        if (!gStr && !isNaN(scoreNum)) {
                          if (scoreNum >= 9.0) gStr = "T"
                          else if (scoreNum >= 5.0) gStr = "H"
                          else gStr = "C"
                        }

                        if (gStr === "T" || gStr === "Tốt" || gStr === "Hoàn thành tốt") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">T</span>
                        }
                        if (gStr === "H" || gStr === "Hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-teal-50 text-teal-700 border border-teal-200">HT</span>
                        }
                        if (gStr === "C" || gStr === "Chưa hoàn thành") {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">CHT</span>
                        }
                        if (gStr && isNaN(Number(gStr))) {
                          return <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{gStr}</span>
                        }
                        return <span className="text-slate-400 font-normal">—</span>
                      }

                      const renderScoreOnlyBadge = (val: any) => {
                        if (val === null || val === undefined || val === "—") return <span className="text-slate-400 font-normal">—</span>
                        let num = NaN
                        if (typeof val === "object" && val !== null) {
                          num = val.score !== null && val.score !== undefined ? (typeof val.score === "number" ? val.score : parseFloat(val.score)) : NaN
                        } else if (typeof val === "number") {
                          num = val
                        } else if (!isNaN(parseFloat(val))) {
                          num = parseFloat(val)
                        }

                        if (!isNaN(num)) {
                          let colorClass = "bg-slate-100 text-slate-700 border-slate-200"
                          if (num >= 8.0) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                          else if (num >= 6.5) colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                          else if (num >= 5.0) colorClass = "bg-amber-50 text-amber-700 border-amber-200"
                          else colorClass = "bg-rose-50 text-rose-700 border-rose-200"
                          return <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black border ${colorClass}`}>{num.toFixed(1)}</span>
                        }
                        return <span className="text-slate-400 font-normal">—</span>
                      }

return (
                        <div className="space-y-6 animate-in fade-in duration-300">
                          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#48BFE3]" />
                                Kết quả Học tập Văn hóa (MOET)
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Bảng điểm môn học &amp; Đánh giá xếp loại tổng kết định kỳ</p>
                            </div>
                            <span className="bg-teal-50 text-[#48BFE3] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Năm học: {selectedStudent?.yearName || activeYearName}
                            </span>
                          </div>

                          {!hasData ? (
                            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-80" />
                              <div className="text-sm font-black text-slate-700">Hệ thống đang cập nhật điểm. Vui lòng quay lại sau.</div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <GraduationCap className="w-4 h-4 text-[#48BFE3]" />
                                  Tổng kết Đánh giá &amp; Xếp loại Học tập
                                </h5>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* HK1 Card */}
                                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Học kỳ 1</span>
                                      <span className="text-[9px] font-extrabold text-[#48BFE3] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">HK1</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD HK1:</span>
                                            {finalKqgdHK1 ? (
                                              <span className="font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">{finalKqgdHK1}</span>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic font-medium">Không đánh giá định kỳ HK1</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk1Summary?.absencesTotal !== undefined && hk1Summary?.absencesTotal !== null 
                                                ? `${hk1Summary.absencesTotal} buổi (CP: ${hk1Summary.absencesPermitted || 0}, KP: ${hk1Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực / Đánh giá:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk1Summary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Hạnh kiểm / Rèn luyện:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk1Summary?.conductRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk1Summary?.absencesTotal !== undefined && hk1Summary?.absencesTotal !== null 
                                                ? `${hk1Summary.absencesTotal} buổi (CP: ${hk1Summary.absencesPermitted || 0}, KP: ${hk1Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                          {hk1Summary?.reward && (
                                            <div className="pt-1 border-t border-slate-100 text-[11px]">
                                              <span className="text-amber-600 font-bold">Khen thưởng: </span>
                                              <span className="text-slate-800 font-bold">{hk1Summary.reward}</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* HK2 Card */}
                                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Học kỳ 2</span>
                                      <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">HK2</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2 text-xs font-semibold text-slate-600">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD HK2:</span>
                                            {finalKqgdHK2 ? (
                                              <span className="font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">{finalKqgdHK2}</span>
                                            ) : (
                                              <span className="text-[11px] text-slate-400 italic font-medium">Không đánh giá định kỳ HK2</span>
                                            )}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Số ngày nghỉ:</span>
                                            <span className="font-bold text-slate-700">
                                              {hk2Summary?.absencesTotal !== undefined && hk2Summary?.absencesTotal !== null 
                                                ? `${hk2Summary.absencesTotal} buổi (CP: ${hk2Summary.absencesPermitted || 0}, KP: ${hk2Summary.absencesUnpermitted || 0})`
                                                : "—"}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực / Đánh giá:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk2Summary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Hạnh kiểm / Rèn luyện:</span>
                                            <span className="font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{hk2Summary?.conductRating || "—"}</span>
                                          </div>
                                        </>
                                      )}
                                      <div className="flex justify-between items-center">
                                        <span>Số ngày nghỉ:</span>
                                        <span className="font-bold text-slate-700">
                                          {hk2Summary?.absencesTotal !== undefined && hk2Summary?.absencesTotal !== null 
                                            ? `${hk2Summary.absencesTotal} buổi (CP: ${hk2Summary.absencesPermitted || 0}, KP: ${hk2Summary.absencesUnpermitted || 0})`
                                            : "—"}
                                        </span>
                                      </div>
                                      {hk2Summary?.reward && (
                                        <div className="pt-1 border-t border-slate-100 text-[11px]">
                                          <span className="text-amber-600 font-bold">Khen thưởng: </span>
                                          <span className="text-slate-800 font-bold">{hk2Summary.reward}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* CN Card */}
                                  <div className="bg-gradient-to-br from-teal-50/40 to-slate-50 border border-teal-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                                      <span className="text-xs font-black text-[#48BFE3] uppercase tracking-wider">Cả Năm</span>
                                      <span className="text-[9px] font-extrabold text-white bg-[#48BFE3] px-2.5 py-0.5 rounded-full shadow-2xs">CẢ NĂM</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      {isPrimary ? (
                                        <div className="space-y-2.5">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-700">Đánh giá KQGD Cả năm:</span>
                                            <span className="font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shadow-2xs">{finalKqgdCN}</span>
                                          </div>
                                          <div className="pt-2 border-t border-teal-100/80 flex justify-between items-center flex-wrap gap-1">
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex justify-between items-center">
                                            <span>Học lực Cả năm:</span>
                                            <span className="font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">{cnSummary?.academicRating || "—"}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span>Rèn luyện Cả năm:</span>
                                            <span className="font-extrabold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">{cnSummary?.conductRating || "—"}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <BookOpen className="w-4 h-4 text-[#48BFE3]" />
                                  Bảng điểm Chi tiết Các Môn học
                                </h5>

                                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      {isPrimary ? (
                                        <>
                                          <tr className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                            <th rowSpan={2} className="py-3 px-3 text-center w-12 border-r border-slate-200">STT</th>
                                            <th rowSpan={2} className="py-3 px-4 border-r border-slate-200">Tên Môn học</th>
                                            <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 text-teal-700 bg-teal-50/50">Học kỳ 1</th>
                                            <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 text-indigo-700 bg-indigo-50/50">Học kỳ 2</th>
                                            <th colSpan={2} className="py-2 px-3 text-center text-emerald-800 bg-emerald-50/50">Cả năm</th>
                                          </tr>
                                          <tr className="bg-slate-50/80 text-slate-600 font-bold text-[9px] uppercase tracking-wider border-b border-slate-200">
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20">Điểm KT</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-20">Điểm KT</th>
                                            <th className="py-1.5 px-2 text-center border-r border-slate-200 w-24">Mức đạt</th>
                                            <th className="py-1.5 px-2 text-center w-20">Điểm KT</th>
                                          </tr>
                                        </>
                                      ) : (
                                        <tr className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                                          <th className="py-3 px-4 text-center w-12">STT</th>
                                          <th className="py-3 px-4">Tên Môn học</th>
                                          <th className="py-3 px-4 text-center w-28">Học kỳ 1</th>
                                          <th className="py-3 px-4 text-center w-28">Học kỳ 2</th>
                                          <th className="py-3 px-4 text-center w-28">Cả năm</th>
                                        </tr>
                                      )}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                      {subjectRows.map((row: any, idx: number) => (
                                        <tr key={row.id} className="hover:bg-slate-50/80 transition-all">
                                          <td className="py-3 px-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                                          <td className="py-3 px-4 font-bold text-slate-800 border-r border-slate-100">{row.name}</td>
                                          {isPrimary ? (
                                            <>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.hk1)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderScoreOnlyBadge(row.hk1)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.hk2)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderScoreOnlyBadge(row.hk2)}</td>
                                              <td className="py-3 px-2 text-center border-r border-slate-100">{renderGradeBadge(row.cn)}</td>
                                              <td className="py-3 px-2 text-center">{renderScoreOnlyBadge(row.cn)}</td>
                                            </>
                                          ) : (
                                            <>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk1)}</td>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.hk2)}</td>
                                              <td className="py-3 px-4 text-center">{formatScoreBadge(row.cn)}</td>
                                            </>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {activeTab === "entrance" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                          <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide">Kết quả khảo sát đầu vào</h4>
                          {selectedStudent.entranceSurvey?.type && (
                            <span className="bg-teal-50 text-[#48BFE3] border border-teal-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Hệ {selectedStudent.entranceSurvey.type}
                            </span>
                          )}
                        </div>

                        {selectedStudent.entranceSurvey ? (
                          <div className="space-y-6">
                            {/* Entrance sub-tabs navigation */}
                            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar no-print">
                              <button
                                onClick={() => setEntranceSubTab("results")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "results"
                                    ? "border-[#48BFE3] text-[#48BFE3]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? "Đánh giá phát triển" : "Kết quả đánh giá"}
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("admin")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "admin"
                                    ? "border-[#48BFE3] text-[#48BFE3]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <User className="w-3.5 h-3.5" />
                                Thông tin hành chính
                              </button>
                              <button
                                onClick={() => setEntranceSubTab("academic")}
                                className={`flex items-center gap-1.5 pb-3 pt-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                                  entranceSubTab === "academic"
                                    ? "border-[#48BFE3] text-[#48BFE3]"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? "Học thử & Quyết định" : "Hồ sơ & Học bạ"}
                              </button>
                            </div>

                            {/* Sub-tab: results */}
                            {entranceSubTab === "results" && (
                              <div className="space-y-6 animate-in fade-in duration-200">
                                {/* Summary Box */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                                  <div>Cơ sở đăng ký: <span className="text-slate-800">{selectedStudent.entranceSurvey.admissionCampus || "N/A"}</span></div>
                                  <div>Kết quả tuyển sinh: <span className="text-slate-800">{selectedStudent.entranceSurvey.admissionResult || "Chưa xác định"}</span></div>
                                </div>

                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="space-y-4 animate-in fade-in duration-200">
                                    <h5 className="text-xs font-black text-slate-700">Đánh giá Phát triển Mầm non:</h5>
                                    <div className="space-y-2 text-xs font-semibold text-slate-600">
                                      <div>Kết quả chung: <span className="font-bold text-slate-700">{selectedStudent.entranceSurvey.devAssessmentResult || "N/A"}</span></div>
                                      <div>Lưu ý quan trọng: <span className="font-bold text-slate-700">{selectedStudent.entranceSurvey.devImportantNote || "Không có"}</span></div>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs text-left border-collapse border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-600 font-bold">
                                            <th className="p-2 border border-slate-200">Lĩnh vực phát triển</th>
                                            <th className="p-2 border border-slate-200">Tiêu chí đánh giá</th>
                                            <th className="p-2 border border-slate-200">Kết quả</th>
                                            <th className="p-2 border border-slate-200">Ghi chú</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(selectedStudent.entranceSurvey.scores || []).length > 0 ? (
                                            selectedStudent.entranceSurvey.scores.map((sc, idx) => (
                                              <tr key={idx} className="font-semibold text-slate-705">
                                                <td className="p-2 border border-slate-200 font-bold">{sc.areaName}</td>
                                                <td className="p-2 border border-slate-200">{sc.criterionName}</td>
                                                <td className="p-2 border border-slate-200">{sc.result}</td>
                                                <td className="p-2 border border-slate-200">{sc.note || "-"}</td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr><td colSpan={4} className="p-2 text-center text-slate-400 italic">Không tìm thấy chi tiết điểm tiêu chí mầm non.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ) : (() => {
                                  const survey = selectedStudent.entranceSurvey
                                  let mathVal = survey.mathScore
                                  let litVal = survey.literatureScore
                                  let writtenVal = survey.writtenEnglishScore
                                  let oralVal = survey.oralEnglishScore
                                  let psychVal = survey.psychologyScore
                                  let oralComment = ""
                                  let psychConclusion = ""
                                  ;(survey.scores || []).forEach((sc) => {
                                    const sName = (sc.subjectName || "").toLowerCase().normalize("NFC")
                                    const scoresArr = Array.isArray(sc.scores) ? sc.scores : []
                                    const scoreVal = scoresArr.find((x) => x !== undefined && x !== null && x !== "")
                                    const commentsArr = Array.isArray(sc.comments) ? sc.comments : []
                                    if (sName.includes("toán") || sName.includes("math")) {
                                      if (scoreVal !== undefined) mathVal = scoreVal
                                    } else if (sName.includes("tiếng việt") || sName.includes("ngữ văn")) {
                                      if (scoreVal !== undefined) litVal = scoreVal
                                    } else if (sName.includes("tiếng anh")) {
                                      if (sName.includes("viết") || sName.includes("written")) {
                                        if (scoreVal !== undefined) writtenVal = scoreVal
                                      } else if (sName.includes("vấn đáp") || sName.includes("nói") || sName.includes("oral")) {
                                        if (scoreVal !== undefined) oralVal = scoreVal
                                        oralComment = commentsArr[0] || ""
                                      }
                                    } else if (sName.includes("tâm lý")) {
                                      const total = scoresArr.reduce((s, v) => s + (parseFloat(v) || 0), 0)
                                      psychVal = total
                                      psychConclusion = commentsArr[0] || ""
                                    }
                                  })
                                  const isGrade1 = (() => { const m = String(survey.className || survey.grade || "").match(/\d+/); return m ? parseInt(m[0]) === 1 : false })()
                                  const writtenDisplay = writtenVal !== null && writtenVal !== undefined ? (isGrade1 ? `${writtenVal}` : `${writtenVal}/70`) : "—"
                                  const oralDisplay = oralVal !== null && oralVal !== undefined ? (isGrade1 ? `${oralVal}` : `${oralVal}/30`) : "—"
                                  const wNum = parseFloat(writtenVal), oNum = parseFloat(oralVal)
                                  const totalEnglish = (!isGrade1 && (!isNaN(wNum) || !isNaN(oNum))) ? (isNaN(wNum) ? 0 : wNum) + (isNaN(oNum) ? 0 : oNum) : null
                                  let psychLabel = ""; let psychClass = "bg-slate-50 border-slate-200 text-slate-700"
                                  if (psychVal !== null && psychVal !== undefined) {
                                    const pn = parseFloat(psychVal)
                                    if (!isNaN(pn)) {
                                      if (pn <= 15) { psychLabel = "Bình thường"; psychClass = "bg-teal-50 border-teal-200 text-teal-700" }
                                      else if (pn <= 31) { psychLabel = "Dấu hiệu nhẹ"; psychClass = "bg-amber-50 border-amber-200 text-amber-700" }
                                      else if (pn <= 47) { psychLabel = "Dấu hiệu vừa"; psychClass = "bg-orange-50 border-orange-200 text-orange-700" }
                                      else { psychLabel = "Nguy cơ cao"; psychClass = "bg-rose-50 border-rose-200 text-rose-700" }
                                    }
                                  }
                                  return (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                      <h5 className="text-xs font-black text-slate-700">Điểm số các môn khảo sát:</h5>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-[#48BFE3]/5 border border-[#48BFE3]/20 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-[#48BFE3] font-bold uppercase tracking-wider">Toán</div>
                                          <div className="text-2xl font-extrabold text-slate-805 mt-1">{mathVal !== null && mathVal !== undefined ? mathVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Ngữ văn</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{litVal !== null && litVal !== undefined ? litVal : "—"}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">Thang 10</div>
                                        </div>
                                        <div className="bg-sky-50/30 border border-sky-100 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-655 font-bold uppercase tracking-wider">Anh viết</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{writtenDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 70"}</div>
                                        </div>
                                        <div className="bg-sky-50/20 border border-sky-100/60 p-3.5 rounded-xl text-center">
                                          <div className="text-[10px] text-sky-655 font-bold uppercase tracking-wider">Anh nói</div>
                                          <div className="text-2xl font-extrabold text-slate-850 mt-1">{oralDisplay}</div>
                                          <div className="text-[9px] text-slate-400 font-bold">{isGrade1 ? "Thang 10" : "Thang 30"}</div>
                                        </div>
                                      </div>
                                      {totalEnglish !== null && (
                                        <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-3 rounded-xl border border-indigo-100 text-center">
                                          <span className="text-xs text-indigo-655 font-black uppercase tracking-wider">Tổng điểm Tiếng Anh: </span>
                                          <span className="text-sm font-extrabold text-indigo-700">{totalEnglish}/100</span>
                                        </div>
                                      )}
                                      {oralComment && (
                                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                          <div className="text-[10px] font-black text-sky-700 uppercase tracking-wider mb-1">Nhận xét Tiếng Anh Nói</div>
                                          <p className="text-xs text-slate-655 font-semibold leading-relaxed italic">"${oralComment}"</p>
                                        </div>
                                      )}
                                      <div className={`text-xs font-semibold space-y-1 p-3 rounded-xl border ${psychClass}`}>
                                        <div className="flex items-center gap-2">
                                          <span>• Đánh giá tâm lý:</span>
                                          <span className="font-extrabold">{psychVal !== null && psychVal !== undefined ? psychVal : "Chưa có"}</span>
                                          {psychLabel && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${psychClass}`}>{psychLabel}</span>}
                                        </div>
                                        {psychConclusion && <div className="pl-3 italic opacity-80">→ {psychConclusion}</div>}
                                        <div>• Kết quả học tập cấp trước: <span className="font-extrabold text-slate-808">{survey.kqHocTap ?? "—"}</span></div>
                                        <div>• Kết quả rèn luyện cấp trước: <span className="font-extrabold text-slate-808">{survey.kqRenLuyen ?? "—"}</span></div>
                                      </div>

                                      {/* Committed Subjects & Approval Details */}
                                      {(survey.directorNote || survey.admissionResult === "Đạt cam kết" || survey.admissionResult === "Đạt - Cam kết") && (() => {
                                        const parseCommittedSubjects = (note) => {
                                          if (!note) return []
                                          const match = note.match(/(?:Môn cam kết|Mon cam ket):\s*\[([^\]]+)\]/i)
                                          if (match && match[1]) {
                                            return match[1].split(',').map((s) => s.trim())
                                          }
                                          return []
                                        }
                                        const committedSubjects = parseCommittedSubjects(survey.directorNote || "")
                                        return (
                                          <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-xl space-y-3">
                                            <div className="flex items-center gap-2 border-b border-amber-200/30 pb-2">
                                              <span className="text-[10px] font-black text-amber-808 uppercase tracking-wider">Chi tiết xét duyệt & Cam kết</span>
                                            </div>
                                            {committedSubjects.length > 0 && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Môn cam kết:</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                  {committedSubjects.map((sub, idx) => (
                                                    <span key={idx} className="bg-amber-100/80 text-amber-850 border border-amber-200/60 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                                                      {sub}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {survey.directorNote && (
                                              <div className="text-xs">
                                                <span className="text-slate-500 font-bold">Ý kiến chỉ đạo / Ghi chú xét duyệt:</span>
                                                <p className="text-slate-705 bg-white border border-slate-200 p-3 rounded-lg font-semibold mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                  {survey.directorNote}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )
                                })()}
                              </div>
                            )}

                            {/* Sub-tab: admin */}
                            {entranceSubTab === "admin" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in duration-200 text-xs font-semibold text-slate-700">
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kỳ khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.period?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt khảo sát</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.batch?.name || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.isPreschool ? (selectedStudent.entranceSurvey.grade || "-") : (selectedStudent.entranceSurvey.className || "-")}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hệ đào tạo</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.surveySystem || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở dự tuyển</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.admissionCampus || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diện tuyển sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.admissionCriteria || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.gender || "-"}</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày sinh</label>
                                  <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.dateOfBirth ? new Date(selectedStudent.entranceSurvey.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span>
                                </div>
                              </div>
                            )}

                            {/* Sub-tab: academic */}
                            {entranceSubTab === "academic" && (
                              <div className="space-y-6 animate-in fade-in duration-200 text-xs">
                                {selectedStudent.entranceSurvey.type === "PRESCHOOL" ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học thử</label>
                                      <span className="text-xs font-black text-slate-755 mt-1 block">{selectedStudent.entranceSurvey.probationaryResult || "Chưa có kết quả"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-2 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhận xét chi tiết của giáo viên học thử</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.entranceSurvey.probationaryComment || "Chưa có nhận xét"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đợt học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryPeriod || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lớp học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryClass || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách học thử</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.probationaryTeacher || "-"}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3 text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học bạ tiểu học / THCS</label>
                                      <span className="text-xs font-semibold text-slate-700 mt-1 block leading-relaxed whitespace-pre-wrap">{selectedStudent.entranceSurvey.kqgdTieuHoc || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả học tập</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.kqHocTap || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kết quả rèn luyện</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.kqRenLuyen || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hồ sơ / Bảng điểm khác</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block leading-relaxed">{selectedStudent.entranceSurvey.hoSoCtQuocTe || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học kỳ / Năm tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.hocKy || "-"}</span>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-700">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đối tượng tuyển sinh</label>
                                      <span className="text-xs font-semibold text-slate-750 mt-1 block">{selectedStudent.entranceSurvey.targetType || "-"}</span>
                                    </div>

                                    {selectedStudent.entranceSurvey.oldSchoolName && (
                                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl md:col-span-3 text-slate-700">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trường học cũ & Địa chỉ</label>
                                        <div className="text-xs font-semibold text-slate-705 mt-1.5 space-y-1.5">
                                          <div><span className="text-slate-400">Tên trường cũ:</span> {selectedStudent.entranceSurvey.oldSchoolName} ({selectedStudent.entranceSurvey.oldSchoolType})</div>
                                          {selectedStudent.entranceSurvey.targetType === "Nội tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.entranceSurvey.wardName} - {selectedStudent.entranceSurvey.cityName || "TP Đà Nẵng"}</div>
                                          )}
                                          {selectedStudent.entranceSurvey.targetType === "Ngoại tỉnh" && (
                                            <div><span className="text-slate-400">Địa chỉ trường cũ:</span> {selectedStudent.entranceSurvey.wardName} - {selectedStudent.entranceSurvey.cityName}</div>
                                          )}
                                          {selectedStudent.entranceSurvey.targetType === "Nước ngoài" && (
                                            <div><span className="text-slate-400">Quốc gia:</span> {selectedStudent.entranceSurvey.countryName}</div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">
                            Không tìm thấy dữ liệu khảo sát đầu vào trùng khớp với mã học sinh này.
                          </div>
                        )}

                        {/* Transfers info */}
                        <div className="pt-6 border-t border-slate-100">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                            Thông tin Học sinh chuyển trường (nếu có)
                          </h4>
                          {(selectedStudent.transfers || []).length > 0 ? (
                            <div className="space-y-3">
                              {selectedStudent.transfers.map((tr) => (
                                <div key={tr.id} className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-xs font-semibold text-slate-705 shadow-2xs animate-in fade-in duration-200">
                                  <div className="font-black text-slate-800">Học sinh Chuyển đến / Chuyển đi: {tr.type === "IN" ? "Chuyển đến" : tr.type === "OUT" ? "Chuyển đi" : "Chuyển lớp"}</div>
                                  <div className="mt-1">Ngày thực hiện: {new Date(tr.transferDate).toLocaleDateString('vi-VN')}</div>
                                  {tr.destinationSchool && <div>Trường chuyển đến/đi: {tr.destinationSchool}</div>}
                                  {tr.reason && <div className="mt-1 text-slate-500">Lý do: {tr.reason}</div>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic font-semibold">Học sinh học bình thường, không có lịch sử chuyển trường.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === "achievements" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Thành tích & Khen thưởng của Học sinh</h4>
                        {(!selectedStudent.achievements || selectedStudent.achievements.length === 0) ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Học sinh chưa có ghi nhận giải thưởng hoặc thành tích nổi bật nào.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {selectedStudent.achievements.map((a: any) => {
                              const rawExamName = a.achievement?.exam?.name || a.achievement?.examName || a.examName;
                              const rawRoundName = a.achievement?.exam?.round?.name || a.achievement?.roundName || a.roundName;
                              const rawPrizeName = a.achievement?.name || a.name || "Giải Ba";
                              const rawLevelVal = a.achievement?.level || a.level;

                              const displayExam = rawExamName || "Kỳ thi Khảo thí & Khuyến học";
                              const displayRound = rawRoundName || "Vòng thi chính thức";
                              const displayPrize = rawPrizeName;
                              const displayLevel = rawLevelVal ? (rawLevelVal === '3' ? 'Cấp độ 3' : (rawLevelVal === 'NHAT' ? 'Giải Nhất' : (rawLevelVal === 'NHI' ? 'Giải Nhì' : (rawLevelVal === 'BA' ? 'Giải Ba' : (rawLevelVal === 'VANG' ? 'Huy chương Vàng' : rawLevelVal))))) : '';

                              return (
                                <div key={a.id} className="bg-amber-50/40 border border-amber-200/80 p-4 rounded-2xl flex items-start gap-3.5 hover:shadow-md transition-all animate-in fade-in duration-200">
                                  <div className="p-3 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-2xs border border-amber-200/80 shrink-0">
                                    <Award className="w-6 h-6 text-amber-600" />
                                  </div>
                                  <div className="text-xs space-y-2 flex-1 min-w-0">
                                    <div>
                                      <span className="text-[10px] font-extrabold text-amber-800/70 uppercase tracking-wider block mb-0.5">Tên kỳ thi</span>
                                      <h4 className="font-black text-slate-800 text-sm leading-snug">{displayExam}</h4>
                                    </div>
                                    
                                    <div className="space-y-1 pt-1 border-t border-amber-200/50">
                                      <div className="flex items-center gap-1.5 text-slate-700">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider min-w-[70px]">Vòng thi:</span>
                                        <span className="font-bold text-blue-700 bg-blue-50/80 border border-blue-200/60 px-2 py-0.5 rounded-md text-[11px]">
                                          {displayRound}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 text-slate-700">
                                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider min-w-[70px]">Giải thưởng:</span>
                                        <span className="font-black text-amber-900 bg-amber-200/80 border border-amber-300/80 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                                          {displayPrize}
                                        </span>
                                      </div>

                                      {displayLevel && (
                                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px] pt-0.5">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">Cấp độ giải:</span>
                                          <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                            {displayLevel}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-amber-200/40 flex justify-between">
                                      <span>Năm học: {a.achievement?.academicYearId || a.academicYearId || "AY-2026"}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "orientation" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Định hướng Nghề nghiệp & Hướng nghiệp</h4>
                        {selectedStudent.orientation ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                            <div className="flex items-center gap-3 bg-teal-50/30 border border-teal-100 p-3.5 rounded-xl">
                              <Compass className="w-5 h-5 text-[#48BFE3]" />
                              <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-bold">Định hướng nhóm ngành chủ đạo</div>
                                <div className="text-sm font-black text-slate-805 mt-0.5">{selectedStudent.orientation.result}</div>
                              </div>
                            </div>
                            {selectedStudent.orientation.notes && (
                              <div className="pt-3 border-t border-slate-200">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chi tiết nhận xét & Đánh giá của GVBM</div>
                                <p className="text-xs text-slate-655 font-semibold leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 italic shadow-2xs">
                                  "{selectedStudent.orientation.notes}"
                                </p>
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 font-bold pt-1 text-right">
                              Đánh giá bởi: {selectedStudent.orientation.teacherName} (GVBM)
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa ghi nhận đánh giá định hướng nghề nghiệp.</div>
                        )}
                      </div>
                    )}

                    {activeTab === "experiential" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Hoạt động Trải nghiệm & Dự án</h4>
                        {(!selectedStudent.experientialActivities || selectedStudent.experientialActivities.length === 0) ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa ghi nhận tham gia hoạt động trải nghiệm nào.</div>
                        ) : (
                          <div className="space-y-3">
                            {selectedStudent.experientialActivities.map((act: any) => (
                              <div key={act.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-black text-slate-800 text-xs">{act.name}</h5>
                                  <span className="text-[10px] font-bold text-[#48BFE3] bg-[#48BFE3]/10 px-2 py-0.5 rounded-md">{act.role}</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                                  <span>Loại: {act.group}</span>
                                  <span>Đánh giá: <strong className="text-teal-700">{act.evalLevel}</strong></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "comments" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Nhận xét nổi bật từ GVBM & GVCN</h4>
                        {(!selectedStudent.highlightComments || selectedStudent.highlightComments.length === 0) ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa có nhận xét nổi bật nào.</div>
                        ) : (
                          <div className="space-y-3">
                            {selectedStudent.highlightComments.map((c: any) => (
                              <div key={c.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                  <span>{c.subjectName || "GVCN"}</span>
                                  <span>Học kỳ {c.semester || "1"}</span>
                                </div>
                                <p className="text-xs text-slate-700 font-semibold italic">"{c.content}"</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "support" && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <h4 className="text-sm font-black text-slate-805 uppercase tracking-wide border-b border-slate-100 pb-3">Hỗ trợ học tập & Phụ đạo</h4>
                        {(!selectedStudent.learningSupportTargets || selectedStudent.learningSupportTargets.length === 0) ? (
                          <div className="text-xs text-slate-400 italic text-center py-12">Chưa có kế hoạch hỗ trợ học tập.</div>
                        ) : (
                          <div className="space-y-3">
                            {selectedStudent.learningSupportTargets.map((st: any) => (
                              <div key={st.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                  <span>Mục tiêu: {st.targetName || "Phụ đạo môn học"}</span>
                                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">{st.status || "ĐANG HỖ TRỢ"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-12">Có lỗi xảy ra khi tải dữ liệu học sinh.</div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-800">Chọn học sinh</h3>
              <p className="text-slate-400 text-xs mt-1">Sử dụng bộ lọc ở thanh phía trên và chọn một học sinh trong danh sách bên trái để hiển thị hồ sơ CV chi tiết.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
