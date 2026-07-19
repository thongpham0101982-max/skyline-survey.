"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  Users, Loader2, User, Award, Compass, 
  FileText, BookOpen, MessageSquare, ClipboardCheck, ArrowLeftRight,
  Bell, Heart, MessageCircle, Send, Globe, Printer, Download,
  Search, Calendar, MapPin, CheckCircle, AlertTriangle, GraduationCap,
  Layers, School, Building2
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
    { id: "cv", label: "Hồ sơ CV Quốc tế", icon: User },
    { id: "entrance", label: "Khảo sát đầu vào", icon: ClipboardCheck },
    { id: "announcements", label: "Bản tin & Thông báo", icon: Bell },
    { id: "achievements", label: "Thành tích", icon: Award },
    { id: "orientation", label: "Hướng nghiệp", icon: Compass },
    { id: "commitment", label: "Cam kết học tập", icon: FileText },
    { id: "projects", label: "Dự án & Trải nghiệm", icon: BookOpen },
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Year selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#00A99D]" />
              Năm học
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D]"
            >
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* School Block selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-[#00A99D]" />
              Bậc học
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSchoolBlock("k12")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "k12" ? "bg-white text-[#00A99D] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Phổ thông
              </button>
              <button
                type="button"
                onClick={() => setSchoolBlock("preschool")}
                className={`py-1.5 rounded-lg transition-all ${schoolBlock === "preschool" ? "bg-white text-[#00A99D] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                Mầm non
              </button>
            </div>
          </div>

          {/* Campus selector */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
              Cơ sở
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D]"
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
              <Layers className="w-3.5 h-3.5 text-[#00A99D]" />
              Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D]"
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
              <GraduationCap className="w-3.5 h-3.5 text-[#00A99D]" />
              Lớp học
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D]"
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
          <span className="text-slate-400">Xuất báo cáo PDF đồng loạt:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBatchPdfExport("class")}
              disabled={selectedClassId === "all"}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất PDF Lớp</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("grade")}
              disabled={selectedGrade === "all"}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất PDF Khối</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("campus")}
              disabled={selectedCampusId === "all"}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất PDF Cơ sở</span>
            </button>
            <button
              onClick={() => handleBatchPdfExport("block")}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00A99D] hover:bg-[#009085] text-white rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xuất PDF Bậc Học</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left column: Student list */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Danh sách Học sinh</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#00A99D] focus:border-[#00A99D] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 text-[#00A99D] animate-spin opacity-60" />
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
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedStudentId === s.id
                        ? "bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/30 shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-grow pr-2">
                      <div className="truncate font-black">{s.studentName}</div>
                      <div className="text-[9px] opacity-60 font-bold mt-0.5">{s.className || s.classCode || "Chưa xếp lớp"}</div>
                    </div>
                    <span className="text-[9px] opacity-60 font-semibold flex-shrink-0">{s.studentCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right workspace: Selected Student Details */}
        <div className="md:col-span-3 space-y-6">
          {selectedStudentId ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Profile Details Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-slate-100/70 border-b border-slate-155 flex items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#00A99D]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-teal-50 border border-[#00A99D]/30 flex items-center justify-center text-[#00A99D] shadow-sm">
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
                  className="flex items-center gap-1.5 bg-[#00A99D] hover:bg-[#009085] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
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
                          ? "bg-white text-[#00A99D] border-[#00A99D] border-x-slate-200 shadow-xs"
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
                          <div className="border-b-2 border-[#00A99D] pb-6 flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-6 h-6 text-[#00A99D]" />
                                <span className="font-extrabold text-sm tracking-wider text-slate-700 font-sans">SKY-LINE SYSTEM</span>
                              </div>
                              <h2 className="text-xl font-black text-slate-805 uppercase tracking-tight font-sans">Hồ sơ Năng lực Học sinh</h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Student Comprehensive Profile & Portfolio</p>
                            </div>
                            <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5">
                              <div>Năm học: <span className="text-slate-800 font-bold">{selectedStudent.yearName}</span></div>
                              <div>Cơ sở: <span className="text-slate-800 font-bold">{selectedStudent.campusName}</span></div>
                            </div>
                          </div>

                          {/* CV Body Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            {/* Left Column */}
                            <div className="md:col-span-1 border-r border-slate-100 pr-6 space-y-6">
                              <div className="text-center space-y-3">
                                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-[#00A99D]/20 shadow-inner flex items-center justify-center bg-slate-50 text-slate-355">
                                  <User className="w-16 h-16" />
                                </div>
                                <div>
                                  <h3 className="font-black text-base text-slate-800">{selectedStudent.studentName}</h3>
                                  <p className="text-[10px] text-[#00A99D] font-extrabold uppercase tracking-widest mt-0.5">Lớp: {selectedStudent.className || "N/A"}</p>
                                </div>
                              </div>

                              {/* Administrative Info */}
                              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-xs text-slate-655 font-semibold">
                                <div className="flex justify-between">
                                  <span>Mã học sinh:</span>
                                  <span className="font-bold text-slate-805">{selectedStudent.studentCode}</span>
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
                                  <Award className="w-4 h-4 text-[#00A99D]" />
                                  Thành tích nổi bật
                                </h4>
                                {(!selectedStudent.achievements || selectedStudent.achievements.length === 0) ? (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa ghi nhận thành tích.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {selectedStudent.achievements.slice(0, 3).map((a: any) => (
                                      <div key={a.id} className="flex gap-2 items-start text-xs bg-amber-50/30 border border-amber-100 p-2 rounded-lg">
                                        <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <div className="font-bold text-slate-850 leading-tight">{a.achievement?.name}</div>
                                          <div className="text-[9px] text-amber-700 font-extrabold uppercase mt-0.5">{a.achievement?.level}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Learning Commitment */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <FileText className="w-4 h-4 text-[#00A99D]" />
                                  Cam kết rèn luyện
                                </h4>
                                {selectedStudent.commitmentContent ? (
                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                                    <p className="text-[10px] text-slate-600 italic leading-relaxed line-clamp-4 font-semibold">
                                      "{selectedStudent.commitmentContent}"
                                    </p>
                                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                                      <span className="text-[9px] text-slate-400 font-bold">Trạng thái:</span>
                                      <span className="text-[8px] font-black uppercase text-teal-700">{selectedStudent.commitmentStatus}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Chưa thiết lập cam kết.</p>
                                )}
                              </div>

                              {/* Career Orientation */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <Compass className="w-4 h-4 text-[#00A99D]" />
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
                                  <ClipboardCheck className="w-4 h-4 text-[#00A99D]" />
                                  Hồ sơ học thuật đầu vào (Intake Evaluation)
                                </h4>
                                {selectedStudent.admitted !== "Không" ? (
                                  <div className="space-y-3">
                                    {schoolBlock === "preschool" ? (
                                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                                        <div className="text-xs font-bold text-slate-700">Đánh giá phát triển mầm non: <span className="font-extrabold text-[#00A99D]">{selectedStudent.devAssessment || "N/A"}</span></div>
                                        {selectedStudent.probationaryComment && (
                                          <div className="bg-white p-2.5 rounded border border-slate-100 text-[10px] text-slate-500 italic leading-relaxed">
                                            "{selectedStudent.probationaryComment}"
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center shadow-2xs">
                                          <div className="text-[9px] text-[#00A99D] font-bold uppercase tracking-wider">Toán học</div>
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
                                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                                  Dự án học tập & Hoạt động trải nghiệm
                                </h4>
                                {(!selectedStudent.projectExperiences || selectedStudent.projectExperiences.length === 0) ? (
                                  <p className="text-[10px] text-slate-400 italic font-semibold">Học sinh chưa tham gia dự án học tập nào.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {selectedStudent.projectExperiences.slice(0, 2).map((p: any) => (
                                      <div key={p.id} className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg text-xs">
                                        <div className="flex justify-between items-start">
                                          <div className="font-bold text-slate-805">{p.projectName}</div>
                                          <span className="text-[8px] font-black uppercase bg-[#00A99D]/10 text-[#00A99D] px-2 py-0.5 rounded">
                                            {p.role || "Thành viên"}
                                          </span>
                                        </div>
                                        {p.notes && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">"{p.notes}"</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Section: Learning Support Progress */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                  <GraduationCap className="w-4 h-4 text-[#00A99D]" />
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
                                  <MessageSquare className="w-4 h-4 text-[#00A99D]" />
                                  Nhận xét định kỳ từ Giáo viên Chủ nhiệm
                                </h4>
                                {selectedStudent.latestGvcnComment ? (
                                  <div className="bg-teal-50/10 border-l-4 border-[#00A99D] p-3 rounded-r-lg space-y-2">
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

                    {/* OTHER TABS: Fallback to messages or basic views */}
                    {activeTab !== "cv" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs font-semibold text-slate-400 italic">
                        Xem chi tiết nội dung các tab khác có thể truy cập qua Giao diện CV chính ở trên hoặc qua các cổng kiểm tra riêng.
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
