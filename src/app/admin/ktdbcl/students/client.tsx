"use client"
import { useState, useEffect } from "react"
import { Calendar, Layers, MapPin, UserCheck, Users, Check, X, Loader2, AlertCircle, Search, Filter, Sparkles } from "lucide-react"
import { getStudentsByClassAction, registerStudentsAction, deregisterStudentsAction, getAllRegisteredStudentsAction } from "./actions"

const LEVEL_LABELS: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "THCS",
  THPT: "THPT",
  TH_THCS: "Liên cấp TH-THCS",
  THCS_THPT: "Liên cấp THCS-THPT",
  ALL: "Mọi cấp học"
}

function getLevelLabel(val: string) {
  if (!val) return "";
  if (val.includes(",") || /^\d+$/.test(val)) {
    return val.split(",").map((g: any) => `Khối ${g}`).join(", ");
  }
  return LEVEL_LABELS[val] || val;
}

interface StudentsClientProps {
  exams: any[]
  campuses: any[]
  classes: any[]
  academicYears: any[]
}

export function StudentsClient({ exams, campuses, classes, academicYears }: StudentsClientProps) {
  const [yearId, setYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : (academicYears[0]?.id || "")
  })

  // Listen to year change event
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

  // Filter exams based on academic year
  const filteredExams = exams.filter((e) => e.academicYearId === yearId)

  // Selection states
  const [selectedExam, setSelectedExam] = useState("")
  const [selectedCampus, setSelectedCampus] = useState(campuses[0]?.id || "")
  const [selectedGrade, setSelectedGrade] = useState("10")
  const [selectedClass, setSelectedClass] = useState("")

  // Active exam and allowed grades definitions
  const activeExamObj = exams.find((e) => e.id === selectedExam)
  const getAllowedGrades = () => {
    if (!activeExamObj || !activeExamObj.grade) {
      return Array.from({ length: 12 }, (_, i) => String(i + 1))
    }
    const val = activeExamObj.grade;
    if (val.includes(",") || /^\d+$/.test(val)) {
      return val.split(",")
    }
    const levelGradesMap: Record<string, string[]> = {
      TIEU_HOC: ["1", "2", "3", "4", "5"],
      THCS: ["6", "7", "8", "9"],
      THPT: ["10", "11", "12"],
      TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
      ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    };
    return levelGradesMap[val] || Array.from({ length: 12 }, (_, i) => String(i + 1))
  }
  const allowedGrades = getAllowedGrades()

  // Ensure selectedGrade is set when switching showAllRegistered to false
  useEffect(() => {
    if (!showAllRegistered && !selectedGrade) {
      const grades = getAllowedGrades()
      setSelectedGrade(grades[0] || "10")
    }
  }, [showAllRegistered, selectedGrade, activeExamObj])

  // Data states
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAllRegistered, setShowAllRegistered] = useState(false)

  // Filter classes based on Campus, Grade and Academic Year
  const filteredClasses = classes.filter(
    (c) => c.campusId === selectedCampus && c.grade === selectedGrade && c.academicYearId === yearId
  )

  // Sync selected exam with filtered exams
  useEffect(() => {
    if (filteredExams.length > 0) {
      const exists = filteredExams.some((e) => e.id === selectedExam)
      if (!exists) {
        setSelectedExam(filteredExams[0].id)
      }
    } else {
      setSelectedExam("")
      setStudents([])
    }
  }, [filteredExams, selectedExam])

  // Reset selected class when campus, grade or yearId changes (only in non-all-registered mode)
  useEffect(() => {
    if (!showAllRegistered) {
      if (filteredClasses.length > 0) {
        const exists = filteredClasses.some((c) => c.id === selectedClass)
        if (!exists) {
          setSelectedClass(filteredClasses[0].id)
        }
      } else {
        setSelectedClass("")
        setStudents([])
      }
    }
  }, [selectedCampus, selectedGrade, yearId, showAllRegistered, filteredClasses, selectedClass])

  // Ensure selectedCampus is set when switching showAllRegistered to false
  useEffect(() => {
    if (!showAllRegistered && !selectedCampus) {
      setSelectedCampus(campuses[0]?.id || "")
    }
  }, [showAllRegistered, selectedCampus, campuses])

  // Fetch students when class or exam changes
  const fetchStudents = async () => {
    if (!selectedExam) {
      setStudents([])
      return
    }
    setLoading(true)
    try {
      if (showAllRegistered) {
        const data = await getAllRegisteredStudentsAction(selectedExam)
        setStudents(data)
      } else {
        if (!selectedClass) {
          setStudents([])
          setLoading(false)
          return
        }
        const data = await getStudentsByClassAction(selectedClass, selectedExam)
        setStudents(data)
      }
      setSelectedIds([])
    } catch (e) {
      console.error("Error loading students:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [selectedClass, selectedExam, showAllRegistered])

  // Auto-set grade from selected exam target if available
  useEffect(() => {
    if (selectedExam) {
      const exam = exams.find((e) => e.id === selectedExam)
      if (exam && exam.grade) {
        let examGrades: string[] = []
        const val = exam.grade
        if (val.includes(",") || /^\d+$/.test(val)) {
          examGrades = val.split(",")
        } else {
          const levelGradesMap: Record<string, string[]> = {
            TIEU_HOC: ["1", "2", "3", "4", "5"],
            THCS: ["6", "7", "8", "9"],
            THPT: ["10", "11", "12"],
            TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
            THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
            ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
          }
          examGrades = levelGradesMap[val] || []
        }
        if (examGrades.length > 0 && !examGrades.includes(selectedGrade)) {
          setSelectedGrade(examGrades[0])
        }
      }
    }
  }, [selectedExam])

  // Selection handlers
  const handleToggleSelectAll = () => {
    const visibleIds = filteredStudents.map((s) => s.id)
    const allSelected = visibleIds.every((id) => selectedIds.includes(id))

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)))
    } else {
      const newSelections = [...selectedIds]
      visibleIds.forEach((id) => {
        if (!newSelections.includes(id)) {
          newSelections.push(id)
        }
      })
      setSelectedIds(newSelections)
    }
  }

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Registration Actions
  const handleRegister = async () => {
    if (selectedIds.length === 0) return
    setUpdating(true)
    try {
      await registerStudentsAction(selectedExam, selectedIds)
      alert(`Đã đăng ký dự thi thành công cho ${selectedIds.length} học sinh!`)
      await fetchStudents()
    } catch (e) {
      alert("Đăng ký thất bại. Vui lòng thử lại!")
    } finally {
      setUpdating(false)
    }
  }

  const handleDeregister = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Hủy đăng ký dự thi cho ${selectedIds.length} học sinh đã chọn?`)) return
    setUpdating(true)
    try {
      await deregisterStudentsAction(selectedExam, selectedIds)
      alert(`Đã hủy đăng ký dự thi cho ${selectedIds.length} học sinh!`)
      await fetchStudents()
    } catch (e) {
      alert("Hủy đăng ký thất bại. Vui lòng thử lại!")
    } finally {
      setUpdating(false)
    }
  }

  // Filter students based on search term and selected filters
  const getFilteredStudents = () => {
    let list = students
    if (showAllRegistered) {
      if (selectedCampus) {
        list = list.filter((s) => s.campusId === selectedCampus)
      }
      if (selectedGrade) {
        list = list.filter((s) => s.grade === selectedGrade)
      }
      if (selectedClass) {
        list = list.filter((s) => s.classId === selectedClass)
      }
    }
    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(term) ||
          s.studentCode.toLowerCase().includes(term)
      )
    }
    return list
  }

  const filteredStudents = getFilteredStudents()



  // Statistics
  const totalCount = students.length
  const registeredCount = students.filter((s) => s.isRegistered).length
  const unregisteredCount = totalCount - registeredCount

  // Statistics for currently filtered view
  const currentFilteredCount = filteredStudents.length
  const currentRegisteredCount = filteredStudents.filter((s) => s.isRegistered).length

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Sub-tabs */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex gap-2 w-fit no-print animate-fade-in">
        <button
          type="button"
          onClick={() => {
            setShowAllRegistered(false);
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
            !showAllRegistered
              ? "bg-[#00A99D] text-white shadow-md shadow-[#00A99D]/10"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Đăng ký HS dự thi</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setShowAllRegistered(true);
            setSearchTerm("");
            setSelectedCampus("");
            setSelectedGrade("");
            setSelectedClass("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
            showAllRegistered
              ? "bg-[#00A99D] text-white shadow-md shadow-[#00A99D]/10"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>DS học sinh dự thi</span>
        </button>
      </div>

      {/* Top Filter Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00A99D]" />
            <h3 className="text-sm font-bold text-slate-800">Bộ Lọc Đăng Ký &amp; Theo Dõi</h3>
          </div>
          {activeExamObj && activeExamObj.grade && (
            <span className="bg-[#E6F6F5] border border-[#00A99D]/15 rounded-lg px-2.5 py-1 text-[10px] text-[#009085] font-bold flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#00A99D] flex-shrink-0" />
              Đối tượng mục tiêu: {getLevelLabel(activeExamObj.grade)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

          {/* Chọn kỳ thi */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Chọn Kỳ Thi</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={filteredExams.length === 0}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D] transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400 text-xs"
            >
              {filteredExams.length === 0 ? (
                <option value="">-- Không có kỳ thi --</option>
              ) : (
                filteredExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e._count?.students || 0} HS đã đăng ký)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Chọn cơ sở */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cơ sở trường</label>
            <select
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value)
                setSelectedClass("")
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D] transition-all bg-white text-xs"
            >
              {showAllRegistered && <option value="">-- Tất cả cơ sở --</option>}
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn khối */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Khối lớp</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value)
                setSelectedClass("")
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D] transition-all bg-white text-xs"
            >
              {showAllRegistered && <option value="">-- Tất cả khối --</option>}
              {allowedGrades.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn lớp */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lớp học</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!showAllRegistered && filteredClasses.length === 0}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D] transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400 text-xs"
            >
              {showAllRegistered ? (
                <>
                  <option value="">-- Tất cả lớp --</option>
                  {classes
                    .filter((c) => (!selectedCampus || c.campusId === selectedCampus) && (!selectedGrade || c.grade === selectedGrade) && c.academicYearId === yearId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.campus?.campusCode || "N/A"}) - {c._count?.students || 0} HS
                      </option>
                    ))}
                </>
              ) : filteredClasses.length === 0 ? (
                <option value="">-- Không có lớp --</option>
              ) : (
                filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className} ({c._count?.students || 0} học sinh)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      {(selectedClass || showAllRegistered) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {showAllRegistered ? (
            <>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng Đăng Ký Toàn Kỳ Thi</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5">{totalCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HS Đăng Ký theo Bộ lọc</div>
                  <div className="text-base font-black text-indigo-600 mt-0.5">{currentFilteredCount}</div>
                </div>
              </div>

              <div className="bg-[#E6F6F5]/50 border border-[#00A99D]/15 rounded-2xl p-4 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-white text-[#00A99D] flex items-center justify-center border border-[#00A99D]/20 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-[#009085] font-bold uppercase tracking-wider">Trạng thái bộ lọc</div>
                  <div className="text-[11px] font-bold text-slate-600 mt-1 truncate max-w-[200px]">
                    {selectedCampus ? campuses.find(c => c.id === selectedCampus)?.campusName : "Tất cả cơ sở"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-200/50">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sĩ số lớp</div>
                  <div className="text-base font-black text-slate-700 mt-0.5">{totalCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đã đăng ký</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5">{registeredCount}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-200/50">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chưa đăng ký</div>
                  <div className="text-base font-black text-slate-400 mt-0.5">{unregisteredCount}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Batch Action Alert Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-[#E6F6F5] border border-[#00A99D]/20 px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in no-print shadow-xs">
          <div className="flex items-center gap-2 text-[#009085]">
            <Check className="w-4.5 h-4.5 text-[#00A99D]" />
            <span>Đã chọn <strong className="text-slate-800 text-sm font-black">{selectedIds.length}</strong> học sinh trong danh sách.</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {!showAllRegistered && (
              <button
                type="button"
                onClick={handleRegister}
                disabled={updating}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#00A99D] hover:bg-[#009085] text-white px-5 py-2 rounded-xl font-bold transition-all shadow-sm shadow-[#00A99D]/15 disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Đăng ký Dự thi
              </button>
            )}
            <button
              type="button"
              onClick={handleDeregister}
              disabled={updating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/80 px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Hủy đăng ký
            </button>
          </div>
        </div>
      )}

      {/* Student List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs animate-fade-in">
        {/* Header bar */}
        <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-[#00A99D]" />
            <span className="font-bold text-slate-800 text-sm">
              {showAllRegistered ? "Danh Sách Học Sinh Đã Đăng Ký" : "Danh Sách Học Sinh Lớp"}
            </span>
            {showAllRegistered && (
              <span className="text-[9.5px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/50 uppercase tracking-wider">
                {filteredStudents.length} học sinh
              </span>
            )}
          </div>

          {/* Quick Search */}
          {(showAllRegistered || selectedClass) && students.length > 0 && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên, mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-lg outline-none focus:border-[#00A99D] transition-all bg-white"
              />
            </div>
          )}
        </div>

        {/* Table content */}
        {!showAllRegistered && !selectedClass ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-bold text-sm">Vui lòng chọn cơ sở và lớp học</p>
            <p className="text-[11px] font-medium">Chọn đầy đủ bộ lọc ở thanh bên trên để hiển thị học sinh.</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#00A99D] mb-3" />
            <p className="font-bold text-sm">Đang tải danh sách học sinh...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-bold text-sm">Không tìm thấy học sinh nào</p>
            <p className="text-[11px] font-medium text-center max-w-xs">
              {showAllRegistered 
                ? "Chưa có học sinh nào đăng ký khớp với bộ lọc hoặc từ khóa tìm kiếm."
                : "Lớp chưa có học sinh hoặc không khớp từ khóa tìm kiếm."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedIds.includes(s.id))
                      }
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3">Mã Học Sinh</th>
                  <th className="px-6 py-3">Họ Và Tên</th>
                  {showAllRegistered && <th className="px-6 py-3">Cơ sở</th>}
                  {showAllRegistered && <th className="px-6 py-3">Lớp</th>}
                  <th className="px-6 py-3">Giới Tính</th>
                  <th className="px-6 py-3">Ngày Sinh</th>
                  <th className="px-6 py-3 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStudents.map((student) => {
                  const isChecked = selectedIds.includes(student.id)
                  return (
                    <tr
                      key={student.id}
                      onClick={() => handleToggleSelect(student.id)}
                      className={`hover:bg-slate-50/40 transition-colors cursor-pointer ${
                        isChecked ? "bg-[#00A99D]/5 hover:bg-[#00A99D]/5" : ""
                      }`}
                    >
                      <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(student.id)}
                          className="w-3.5 h-3.5 rounded text-[#00A99D] focus:ring-[#00A99D] cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500 font-bold">{student.studentCode}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-800 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center font-bold text-[9px] uppercase ${
                            isChecked ? "bg-[#00A99D] text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            {student.studentName.split(" ").pop()?.charAt(0) || "HS"}
                          </div>
                          <span className="truncate max-w-[220px]">{student.studentName}</span>
                        </div>
                      </td>
                      {showAllRegistered && <td className="px-6 py-3.5 text-slate-600 font-bold">{student.campusName}</td>}
                      {showAllRegistered && <td className="px-6 py-3.5 text-slate-600 font-bold">{student.className}</td>}
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[9.5px] ${
                          student.gender === "MALE" || student.gender === "Nam" 
                            ? "bg-blue-50 text-blue-700 border border-blue-100" 
                            : student.gender === "FEMALE" || student.gender === "Nữ"
                            ? "bg-pink-50 text-pink-700 border border-pink-100"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {student.gender === "MALE" || student.gender === "Nam" ? "Nam" : student.gender === "FEMALE" || student.gender === "Nữ" ? "Nữ" : student.gender}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-medium">
                        {student.dateOfBirth
                          ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
                          : "---"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {student.isRegistered ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                            <Check className="w-3 h-3" /> Đã đăng ký
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-400 border border-slate-100 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                            <X className="w-3 h-3" /> Chưa đăng ký
                          </span>
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
  )
}
