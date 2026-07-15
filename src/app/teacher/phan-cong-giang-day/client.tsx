"use client"
import { useState, useMemo, useEffect } from "react"
import { 
  BookOpen, 
  Users, 
  CalendarDays, 
  Building2, 
  Search, 
  Mail, 
  Phone, 
  User, 
  ClipboardList,
  GraduationCap,
  CalendarRange,
  Layers,
  ChevronRight,
  UserCheck
} from "lucide-react"

interface TeacherInfo {
  id: string
  teacherName: string
  teacherCode: string
  email: string | null
  phone: string | null
  position: string
  departmentRel: {
    id: string
    code: string
    name: string
  } | null
  campus: {
    id: string
    campusName: string
  }
}

interface Assignment {
  id: string
  teacherId: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  academicYearId: string
  semester: number
  class: {
    className: string
    classCode: string
  }
  subject: {
    subjectName: string
    subjectCode: string
  }
  academicYear: {
    name: string
  }
}

interface DeptTeacher {
  id: string
  teacherName: string
  teacherCode: string
  email: string | null
  phone: string | null
  position: string
  departmentRel: {
    name: string
  } | null
  TeachingAssignment: Array<{
    id: string
    classId: string
    subjectId: string
    academicYearId: string
    semester: number
    class: {
      className: string
    }
    subject: {
      subjectName: string
    }
    academicYear: {
      name: string
    }
  }>
}

interface ClientProps {
  teacher: TeacherInfo
  initialMyAssignments: Assignment[]
  initialDeptTeachers: DeptTeacher[]
  academicYears: any[]
  selectedYearCookie?: string
}

export function TeachingAssignmentClient({
  teacher,
  initialMyAssignments,
  initialDeptTeachers,
  academicYears,
  selectedYearCookie
}: ClientProps) {
  // Sync selected academic year with local storage / cookie
  const [selectedYearId, setSelectedYearId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedAcademicYear") || selectedYearCookie || academicYears[0]?.id || ""
    }
    return selectedYearCookie || academicYears[0]?.id || ""
  })

  const [activeTab, setActiveTab] = useState<"me" | "department">("me")
  const [searchQuery, setSearchQuery] = useState("")
  const [semesterFilter, setSemesterFilter] = useState<"all" | "1" | "2">("all")

  // Handle year selection and reload page to fetch new DB records
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId)
    localStorage.setItem("selectedAcademicYear", yearId)
    document.cookie = `selectedAcademicYear=${yearId}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  // Filter my assignments based on selected academic year, semester, and search query
  const filteredMyAssignments = useMemo(() => {
    return initialMyAssignments.filter(a => {
      // 1. Filter by year
      if (a.academicYearId !== selectedYearId) return false

      // 2. Filter by semester
      if (semesterFilter !== "all" && a.semester.toString() !== semesterFilter) return false

      // 3. Filter by search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim()
        const matchClass = a.class.className.toLowerCase().includes(query)
        const matchSubject = a.subject.subjectName.toLowerCase().includes(query)
        return matchClass || matchSubject
      }

      return true
    })
  }, [initialMyAssignments, selectedYearId, semesterFilter, searchQuery])

  // Filter department teachers and their assignments based on selected academic year, semester, and search query
  const filteredDeptTeachers = useMemo(() => {
    return initialDeptTeachers.map(t => {
      // Filter the teacher's teaching assignments for the selected academic year and semester
      const yearAssignments = t.TeachingAssignment.filter(a => {
        if (a.academicYearId !== selectedYearId) return false
        if (semesterFilter !== "all" && a.semester.toString() !== semesterFilter) return false
        return true
      })

      return {
        ...t,
        filteredAssignments: yearAssignments
      }
    }).filter(t => {
      // Apply search query: search by teacher name, class name, or subject name
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim()
        const matchName = t.teacherName.toLowerCase().includes(query)
        const matchClassOrSubject = t.filteredAssignments.some(a => 
          a.class.className.toLowerCase().includes(query) || 
          a.subject.subjectName.toLowerCase().includes(query)
        )
        return matchName || matchClassOrSubject
      }
      return true
    })
  }, [initialDeptTeachers, selectedYearId, semesterFilter, searchQuery])

  const currentYearName = useMemo(() => {
    const year = academicYears.find(y => y.id === selectedYearId)
    return year ? year.name : "N/A"
  }, [academicYears, selectedYearId])

  // Calculate stats for current teacher
  const stats = useMemo(() => {
    const myYearAssignments = initialMyAssignments.filter(a => a.academicYearId === selectedYearId)
    
    // Unique classes
    const classes = new Set(myYearAssignments.map(a => a.classId))
    // Unique subjects
    const subjects = new Set(myYearAssignments.map(a => a.subjectId))
    
    return {
      totalClasses: classes.size,
      totalSubjects: subjects.size,
      totalDepartmentTeachers: initialDeptTeachers.length
    }
  }, [initialMyAssignments, selectedYearId, initialDeptTeachers])

  return (
    <div className="space-y-6 pb-12 teacher-fade-in">
      {/* Header bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#00A99D] to-[#0EA5E9] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/10">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight">Phân công giảng dạy</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block mt-0.5">
              Quản lý phân công lớp học, môn học và tổ chuyên môn
            </p>
          </div>
        </div>
        
        {/* Academic Year Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 self-start md:self-auto">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedYearId} 
            onChange={e => handleYearChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            {academicYears.filter(ay => !ay.isOff).map(ay => (
              <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teacher Profile Card */}
      <div className="bg-gradient-to-r from-[#003B3A] to-[#005D5B] rounded-2xl text-white shadow-lg overflow-hidden relative">
        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-teal-400/10 rounded-full -mb-20 blur-xl pointer-events-none" />

        <div className="p-6 relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center flex-shrink-0 text-xl font-black shadow-inner">
              {teacher.teacherName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-black tracking-tight">{teacher.teacherName}</h2>
                <span className="bg-white/15 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                  {teacher.teacherCode}
                </span>
                <span className="bg-teal-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                  {teacher.position || "GV"}
                </span>
              </div>
              <p className="text-teal-200 text-xs font-semibold mt-1 flex items-center justify-center sm:justify-start gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-300" />
                {teacher.campus?.campusName}
                {teacher.departmentRel && (
                  <>
                    <span className="text-white/40">|</span>
                    <span className="text-teal-300 font-extrabold uppercase tracking-wide">
                      {teacher.departmentRel.name}
                    </span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[11px] text-white/70 mt-3">
                {teacher.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal-300/80" /> {teacher.email}
                  </span>
                )}
                {teacher.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-300/80" /> {teacher.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 self-stretch lg:self-auto justify-items-center">
            <div className="text-center px-2">
              <p className="text-[10px] text-teal-200 font-bold uppercase tracking-wider">Lớp dạy</p>
              <p className="text-xl font-black mt-1 text-white">{stats.totalClasses}</p>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="text-center px-2">
              <p className="text-[10px] text-teal-200 font-bold uppercase tracking-wider">Môn dạy</p>
              <p className="text-xl font-black mt-1 text-white">{stats.totalSubjects}</p>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="text-center px-2">
              <p className="text-[10px] text-teal-200 font-bold uppercase tracking-wider">Tổ viên</p>
              <p className="text-xl font-black mt-1 text-white">{stats.totalDepartmentTeachers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("me")}
            className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "me" 
                ? "border-[#00A99D] text-[#00A99D]" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <User className="w-4 h-4" />
            Phân công của tôi
          </button>
          <button
            onClick={() => setActiveTab("department")}
            className={`py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "department" 
                ? "border-[#00A99D] text-[#00A99D]" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Users className="w-4 h-4" />
            Tổ chuyên môn ({teacher.departmentRel?.name || "N/A"})
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "me" 
                ? "Tìm lớp, môn học..." 
                : "Tìm giáo viên, lớp, môn..."
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#00A99D] focus:bg-white transition-all"
          />
        </div>

        {/* Semester Filter */}
        <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-slate-50 self-end sm:self-auto">
          <button
            onClick={() => setSemesterFilter("all")}
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
              semesterFilter === "all"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Cả năm
          </button>
          <button
            onClick={() => setSemesterFilter("1")}
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
              semesterFilter === "1"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Học kỳ I
          </button>
          <button
            onClick={() => setSemesterFilter("2")}
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
              semesterFilter === "2"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Học kỳ II
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "me" ? (
        filteredMyAssignments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-200">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Chưa có phân công giảng dạy</h3>
            <p className="text-slate-400 text-xs mt-1">
              Không tìm thấy phân công giảng dạy phù hợp cho Năm học {currentYearName}
              {semesterFilter !== "all" && ` - Học kỳ ${semesterFilter}`}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Lớp học</th>
                    <th className="px-6 py-4">Môn học</th>
                    <th className="px-6 py-4">Học kỳ</th>
                    <th className="px-6 py-4">Năm học</th>
                    <th className="px-6 py-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMyAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold group-hover:scale-105 transition-transform">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 text-[13px]">{a.class.className}</span>
                            <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{a.class.classCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-slate-800 text-[13px]">{a.subject.subjectName}</span>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{a.subject.subjectCode}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider ${
                          a.semester === 1 
                            ? "bg-blue-50 text-blue-600 border border-blue-100" 
                            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        }`}>
                          HỌC KỲ {a.semester}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-500">
                        {a.academicYear.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-[#00A99D] font-extrabold text-[11px]">
                          <UserCheck className="w-3.5 h-3.5" /> Đang phụ trách
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        // Department teachers list
        filteredDeptTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy giáo viên nào</h3>
            <p className="text-slate-400 text-xs mt-1">
              Không tìm thấy thành viên phù hợp trong Tổ chuyên môn của bạn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDeptTeachers.map((t) => {
              const totalDeptAssigns = t.filteredAssignments.length
              
              // Group assignments by class to show them nicely
              const classGroups = t.filteredAssignments.reduce((acc, curr) => {
                const classKey = curr.class.className
                if (!acc[classKey]) {
                  acc[classKey] = {
                    className: classKey,
                    subjects: new Set<string>(),
                    semesters: new Set<number>()
                  }
                }
                acc[classKey].subjects.add(curr.subject.subjectName)
                acc[classKey].semesters.add(curr.semester)
                return acc
              }, {} as Record<string, { className: string, subjects: Set<string>, semesters: Set<number> }>)

              const groupedList = Object.values(classGroups)

              return (
                <div 
                  key={t.id} 
                  className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                    t.id === teacher.id 
                      ? "border-[#00A99D]/40 bg-teal-50/5" 
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="p-5">
                    {/* Header info */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                          t.id === teacher.id 
                            ? "bg-[#00A99D] text-white" 
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {t.teacherName.split(" ").slice(-1)[0].charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                            {t.teacherName}
                            {t.id === teacher.id && (
                              <span className="bg-teal-50 text-[#00A99D] border border-teal-200 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider">Bạn</span>
                            )}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                            Mã GV: {t.teacherCode} &nbsp;·&nbsp; {t.position || "GV"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-4" />

                    {/* Assignments sub list */}
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2.5 flex items-center gap-1">
                        <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                        Phân công giảng dạy ({totalDeptAssigns} đợt)
                      </p>
                      
                      {groupedList.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2">Chưa được phân công trong kỳ này.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {groupedList.map((g) => (
                            <div key={g.className} className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex flex-col gap-1.5 hover:bg-slate-100/50 transition-colors">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-[12px] text-[#008A81]">{g.className}</span>
                                <div className="flex gap-1">
                                  {Array.from(g.semesters).sort().map(sem => (
                                    <span key={sem} className="bg-white border border-slate-200 px-1 py-0.2 rounded text-[8px] font-black text-slate-600">
                                      HK{sem}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Array.from(g.subjects).map(sub => (
                                  <span key={sub} className="bg-teal-50/50 text-[#007068] text-[9.5px] font-extrabold px-1.5 py-0.5 rounded border border-teal-100/50">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer contact info */}
                  <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                    <span className="truncate max-w-[130px] flex items-center gap-1.5" title={t.email || ""}>
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {t.email || "N/A"}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {t.phone || "N/A"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
