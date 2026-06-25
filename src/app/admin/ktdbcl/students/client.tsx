"use client"
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

import { useState, useEffect } from "react"
import { Calendar, Layers, MapPin, UserCheck, Users, Check, X, Loader2, AlertCircle, Search } from "lucide-react"
import { getStudentsByClassAction, registerStudentsAction, deregisterStudentsAction } from "./actions"

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
  const [selectedGrade, setSelectedGrade] = useState("10") // Default to grade 10
  const [selectedClass, setSelectedClass] = useState("")

  // Data states
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

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

  // Reset selected class when campus, grade or yearId changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      // Find if current selected class is in the filtered list
      const exists = filteredClasses.some((c) => c.id === selectedClass)
      if (!exists) {
        setSelectedClass(filteredClasses[0].id)
      }
    } else {
      setSelectedClass("")
      setStudents([])
    }
  }, [selectedCampus, selectedGrade, yearId])

  // Fetch students when class or exam changes
  const fetchStudents = async () => {
    if (!selectedClass || !selectedExam) {
      setStudents([])
      return
    }
    setLoading(true)
    try {
      const data = await getStudentsByClassAction(selectedClass, selectedExam)
      setStudents(data)
      setSelectedIds([])
    } catch (e) {
      console.error("Error loading students:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [selectedClass, selectedExam])

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
      // Unselect all visible
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)))
    } else {
      // Select all visible
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

  // Filter students based on search term
  const filteredStudents = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get active exam details
  const activeExamObj = exams.find((e) => e.id === selectedExam)

  // Get allowed grades based on selected exam's target level
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

  // Statistics
  const totalCount = students.length
  const registeredCount = students.filter((s) => s.isRegistered).length
  const unregisteredCount = totalCount - registeredCount



  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-xs font-semibold">
      {/* Sidebar Control Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-4 h-4 text-[#00A19A]" />
            Bộ Lọc Đăng Ký
          </h3>

          {/* 1. Chọn kỳ thi */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Chọn Kỳ Thi
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={filteredExams.length === 0}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A19A] transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              {filteredExams.length === 0 ? (
                <option value="">-- Không có kỳ thi --</option>
              ) : (
                filteredExams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))
              )}
            </select>
            {activeExamObj && activeExamObj.grade && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mt-1 text-[10px] text-amber-800">
                <span className="font-bold">Đối tượng mục tiêu:</span> {getLevelLabel(activeExamObj.grade)}
              </div>
            )}
          </div>

          {/* 2. Chọn cơ sở */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Cơ sở trường
            </label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A19A] transition-all bg-white"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Chọn khối */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Khối lớp
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A19A] transition-all bg-white"
            >
              {allowedGrades.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Chọn lớp */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Lớp học
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={filteredClasses.length === 0}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-[#00A19A] transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              {filteredClasses.length === 0 ? (
                <option value="">-- Không có lớp --</option>
              ) : (
                filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.className}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Batch Operations Card */}
        {selectedClass && students.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100">
              Thao Tác Hàng Loạt
            </h3>
            <div className="text-[11px] text-slate-500">
              Đã chọn <strong className="text-[#00A19A]">{selectedIds.length}</strong> học sinh trong danh sách hiển thị dưới đây.
            </div>

            <button
              onClick={handleRegister}
              disabled={selectedIds.length === 0 || updating}
              className="w-full flex items-center justify-center gap-2 bg-[#00A19A] hover:bg-[#008c85] text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-[#00A19A]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Đăng ký Dự thi ({selectedIds.length})
            </button>

            <button
              onClick={handleDeregister}
              disabled={selectedIds.length === 0 || updating}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Hủy đăng ký ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Student List Section */}
      <div className="lg:col-span-3 space-y-6">
        {/* Statistics Header */}
        {selectedClass && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Sĩ số lớp</div>
                <div className="text-base font-black text-slate-700">{totalCount}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Đã đăng ký</div>
                <div className="text-base font-black text-emerald-600">{registeredCount}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">Chưa đăng ký</div>
                <div className="text-base font-black text-slate-500">{unregisteredCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-xs">
          {/* Header bar */}
          <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-[#00A19A]" />
              <span className="font-bold text-slate-800 text-sm">
                Danh Sách Học Sinh Lớp
              </span>
            </div>

            {/* Quick Search */}
            {selectedClass && students.length > 0 && (
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm học sinh theo tên, mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#00A19A] transition-all"
                />
              </div>
            )}
          </div>

          {/* Table content */}
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-sm">Vui lòng chọn cơ sở và lớp học</p>
              <p className="text-[11px] font-medium">Chọn đầy đủ bộ lọc ở thanh bên trái để hiển thị học sinh.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#00A19A] mb-3" />
              <p className="font-bold text-sm">Đang tải danh sách học sinh...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-sm">Không tìm thấy học sinh nào</p>
              <p className="text-[11px] font-medium">Lớp chưa có học sinh hoặc không khớp từ khóa tìm kiếm.</p>
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
                        className="w-3.5 h-3.5 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3">Mã Học Sinh</th>
                    <th className="px-6 py-3">Họ Và Tên</th>
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
                          isChecked ? "bg-[#00A19A]/5 hover:bg-[#00A19A]/5" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(student.id)}
                            className="w-3.5 h-3.5 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-500 font-bold">{student.studentCode}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-800 text-sm">{student.studentName}</td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            student.gender === "MALE" || student.gender === "Nam" 
                              ? "bg-blue-50 text-blue-700" 
                              : student.gender === "FEMALE" || student.gender === "Nữ"
                              ? "bg-pink-50 text-pink-700"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {student.gender === "MALE" || student.gender === "Nam" ? "Nam" : student.gender === "FEMALE" || student.gender === "Nữ" ? "Nữ" : student.gender}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">
                          {student.dateOfBirth
                            ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
                            : "---"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {student.isRegistered ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                              <Check className="w-3 h-3" /> Đã đăng ký
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
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
    </div>
  )
}