"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useMemo } from "react"
import Link from "next/link"
import toast from "react-hot-toast"
import { Plus, Trash2, User, BookOpen, Layers, RefreshCw, CalendarRange } from "lucide-react"
import {
  saveAssignment,
  deleteAssignment,
  syncAllAssignmentsToTimetableAction,
  updateAssignmentWeeklyPeriods
} from "./actions"

export function TeachingClient({
  teachers,
  classes,
  subjects,
  years,
  departments,
  campuses = [],
  initialAssignments
}: any) {
  const [selectedYear, setSelectedYear] = useState(
    () => getDefaultAcademicYearClient(years)?.id || ""
  )
  const [selectedDeptId, setSelectedDeptId] = useState("")
  const [selectedCampusId, setSelectedCampusId] = useState("")
  const [selectedTeacherGroup, setSelectedTeacherGroup] = useState<"ALL" | "GVVN" | "GVNN">("ALL")
  const [selectedFormCampusId, setSelectedFormCampusId] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [searchTeacher, setSearchTeacher] = useState("")

  const filteredTeachers = useMemo(() => {
    let list = teachers
    if (selectedTeacherGroup !== "ALL") {
      list = list.filter((t: any) => (t.teacherGroup || "GVVN") === selectedTeacherGroup)
    }
    if (searchTeacher.trim()) {
      const q = searchTeacher.toLowerCase().trim()
      list = list.filter(
        (t: any) =>
          (t.teacherName || "").toLowerCase().includes(q) ||
          (t.teacherCode || "").toLowerCase().includes(q)
      )
    }
    if (selectedDeptId) {
      list = list.filter(
        (t: any) =>
          t.departmentId === selectedDeptId ||
          (t.departmentAssignments || []).some((da: any) => da.departmentId === selectedDeptId)
      )
    }
    if (selectedCampusId) {
      list = list.filter(
        (t: any) => t.campusId === selectedCampusId || t.campus?.id === selectedCampusId
      )
    }
    return list
  }, [teachers, selectedTeacherGroup, searchTeacher, selectedDeptId, selectedCampusId])

  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState(false)
  const [syncingTimetable, setSyncingTimetable] = useState(false)

  // Form states for new assignment
  const [newSubj, setNewSubj] = useState("")
  const [newWeeklyPeriods, setNewWeeklyPeriods] = useState("")
  const [newClasses, setNewClasses] = useState<string[]>([])
  const [hk1, setHk1] = useState(true)
  const [hk2, setHk2] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")

  const selectedSubjectObj = useMemo(
    () => subjects.find((s: any) => s.id === newSubj),
    [subjects, newSubj]
  )
  const isSelectedSubjDual = useMemo(() => {
    if (!selectedSubjectObj) return false
    const code = String(selectedSubjectObj.subjectCode || "").trim().toUpperCase()
    const name = String(selectedSubjectObj.subjectName || "").trim().toUpperCase()
    return code === "ESL" || name === "ESL" || name.includes("ENGLISH AS A SECOND LANGUAGE")
  }, [selectedSubjectObj])

  // Extract levels and grades for the selected year
  const levels = useMemo(() => {
    const set = new Set<string>()
    classes
      .filter((c: any) => !selectedYear || c.academicYearId === selectedYear)
      .forEach((c: any) => {
        if (c.level) {
          const lvl = c.level.trim()
          if (
            [
              "nhà trẻ",
              "mẫu giáo bé",
              "mẫu giáo nhỡ",
              "mẫu giáo lớn",
              "mầm non",
              "mam non"
            ].includes(lvl.toLowerCase())
          ) {
            set.add("Mầm non")
          } else {
            set.add(lvl)
          }
        }
      })
    const LEVEL_ORDER: Record<string, number> = {
      "mầm non": 1,
      "tiểu học": 2,
      thcs: 3,
      thpt: 4
    }
    return Array.from(set).sort((a, b) => {
      const oa = LEVEL_ORDER[a.toLowerCase()] ?? 99
      const ob = LEVEL_ORDER[b.toLowerCase()] ?? 99
      if (oa !== ob) return oa - ob
      return a.localeCompare(b)
    })
  }, [classes, selectedYear])

  const grades = useMemo(() => {
    const set = new Set<string>()
    classes
      .filter((c: any) => {
        if (selectedYear && c.academicYearId !== selectedYear) return false
        if (selectedFormCampusId && c.campusId !== selectedFormCampusId) return false
        if (selectedLevel) {
          const cLvl = (c.level || "").toLowerCase().trim()
          const sLvl = selectedLevel.toLowerCase().trim()
          if (sLvl === "mầm non") {
            return [
              "mầm non",
              "nhà trẻ",
              "mẫu giáo bé",
              "mẫu giáo nhỡ",
              "mẫu giáo lớn",
              "mam non"
            ].includes(cLvl)
          }
          return cLvl === sLvl
        }
        return true
      })
      .forEach((c: any) => {
        const g = (c.grade || "").trim()
        if (g && g.toLowerCase() !== "ko thấy") {
          set.add(g)
        }
      })

    const MN_ORDER: Record<string, number> = {
      "nhà trẻ 12-18 tháng": 1,
      "12 đến 18 tháng": 1,
      "nhà trẻ 18-24 tháng": 2,
      "18 đến 24 tháng": 2,
      "nhà trẻ 24-36 tháng": 3,
      "24 đến 36 tháng": 3,
      "nhà trẻ": 4,
      "mẫu giáo bé": 5,
      "3 đến 4 tuổi": 5,
      "mẫu giáo nhỡ": 6,
      "4 đến 5 tuổi": 6,
      "mẫu giáo lớn": 7,
      "5 đến 6 tuổi": 7
    }

    return Array.from(set).sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aMn = MN_ORDER[aLower]
      const bMn = MN_ORDER[bLower]

      if (aMn !== undefined && bMn !== undefined) return aMn - bMn
      if (aMn !== undefined) return -1
      if (bMn !== undefined) return 1

      const na = parseInt(a, 10)
      const nb = parseInt(b, 10)
      if (!isNaN(na) && !isNaN(nb)) return na - nb
      return String(a).localeCompare(String(b))
    })
  }, [classes, selectedYear, selectedFormCampusId, selectedLevel])

  // Filter classes by year, campus, level and grade
  const filteredClasses = useMemo(() => {
    let list = classes.filter((c: any) => !selectedYear || c.academicYearId === selectedYear)
    if (selectedFormCampusId) {
      list = list.filter((c: any) => c.campusId === selectedFormCampusId)
    }
    if (selectedLevel) {
      const sLvl = selectedLevel.toLowerCase().trim()
      list = list.filter((c: any) => {
        const cLvl = (c.level || "").toLowerCase().trim()
        if (sLvl === "mầm non") {
          return [
            "mầm non",
            "nhà trẻ",
            "mẫu giáo bé",
            "mẫu giáo nhỡ",
            "mẫu giáo lớn",
            "mam non"
          ].includes(cLvl)
        }
        return cLvl === sLvl
      })
    }
    if (selectedGrade) {
      list = list.filter(
        (c: any) => (c.grade || "").toLowerCase().trim() === selectedGrade.toLowerCase().trim()
      )
    }
    return list
  }, [classes, selectedYear, selectedFormCampusId, selectedLevel, selectedGrade])

  const handleAdd = async () => {
    if (!selectedTeacherId || !newSubj || newClasses.length === 0 || (!hk1 && !hk2)) {
      return alert("Vui lòng chọn đủ thông tin môn, lớp và ít nhất 1 học kỳ!")
    }
    setLoading(true)
    const semesters: number[] = []
    if (hk1) semesters.push(1)
    if (hk2) semesters.push(2)

    const cleanNewPeriods = newWeeklyPeriods.trim().replace(/,/g, ".")
    const parsedPeriods =
      cleanNewPeriods === "" ? null : Math.max(0, Number(cleanNewPeriods))

    const res = await saveAssignment({
      teacherId: selectedTeacherId,
      classIds: newClasses,
      subjectId: newSubj,
      academicYearId: selectedYear,
      semesters,
      weeklyPeriods: parsedPeriods !== null && !Number.isNaN(parsedPeriods) ? parsedPeriods : null
    })

    if (res.success) {
      setAssignments((prev: any[]) => {
        const filtered = prev.filter((a: any) => {
          const sameSlot =
            newClasses.includes(a.classId) &&
            a.subjectId === newSubj &&
            a.academicYearId === selectedYear &&
            semesters.includes(Number(a.semester))
          if (!sameSlot) return true
          if (res.preservedOppositeGroup) {
            return (a.teacherRole || "GVVN") !== res.targetRole
          }
          return false
        })
        return [...filtered, ...res.added]
      })
      setNewSubj("")
      setNewWeeklyPeriods("")
      setNewClasses([])
      toast.success("Đã cập nhật phân công giảng dạy.")
    } else {
      alert("Lỗi: " + res.error)
    }
    setLoading(false)
  }

  const handleInlinePeriodUpdate = async (assignmentId: string, rawVal: string) => {
    const cleanVal = rawVal.trim().replace(/,/g, ".")
    const parsed = cleanVal === "" ? null : Math.max(0, Number(cleanVal))
    if (parsed !== null && Number.isNaN(parsed)) return
    const res = await updateAssignmentWeeklyPeriods(assignmentId, parsed)
    if (!res.success) {
      toast.error(res.error || "Không thể lưu số tiết.")
      return
    }
    setAssignments((prev: any[]) =>
      prev.map((a: any) => (a.id === assignmentId ? { ...a, weeklyPeriods: res.weeklyPeriods } : a))
    )
    toast.success(
      res.weeklyPeriods !== null
        ? `Đã cập nhật: ${res.weeklyPeriods} tiết/tuần.`
        : "Đã chuyển về tự động theo định mức khối."
    )
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa phân công này?")) return
    setLoading(true)
    const res = await deleteAssignment(id)
    if (res.success) setAssignments(assignments.filter((a: any) => a.id !== id))
    else alert("Lỗi: " + res.error)
    setLoading(false)
  }

  const handleSyncToTimetable = async () => {
    if (!selectedYear) {
      toast.error("Vui lòng chọn Năm học cần đồng bộ.")
      return
    }
    setSyncingTimetable(true)
    const res = await syncAllAssignmentsToTimetableAction(selectedYear)
    setSyncingTimetable(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    if (res.versionCount === 0) {
      toast.success(
        "Chưa có phương án TKB nháp nào trong năm học này — dữ liệu phân công sẽ tự áp dụng ngay khi tạo nháp TKB."
      )
      return
    }

    toast.success(
      res.updatedCount > 0
        ? `Đã đồng bộ Phân công sang ${res.versionCount} phương án TKB nháp: cập nhật ${res.filledPrimaryCount} tiết chính và ${res.filledAltCount} tiết luân phiên.`
        : `Tất cả ${res.versionCount} phương án TKB nháp đều đã đồng bộ đầy đủ với Phân công giảng dạy.`
    )
  }

  // Build summary for the table
  const tableData = filteredTeachers.map((t: any) => {
    const tAssigns = assignments.filter(
      (a: any) => a.teacherId === t.id && a.academicYearId === selectedYear
    )

    const getSummary = (sem: number) => {
      const semAssigns = tAssigns.filter((a: any) => a.semester === sem)
      const bySubj: Record<string, string[]> = {}
      let totalExplicitPeriods = 0
      semAssigns.forEach((a: any) => {
        if (!bySubj[a.subjectName]) bySubj[a.subjectName] = []
        const label =
          a.weeklyPeriods !== null && a.weeklyPeriods !== undefined
            ? `${a.className} (${a.weeklyPeriods} tiết)`
            : a.className
        bySubj[a.subjectName].push(label)
        if (a.weeklyPeriods !== null && a.weeklyPeriods !== undefined) {
          totalExplicitPeriods += Number(a.weeklyPeriods) || 0
        }
      })
      const text = Object.entries(bySubj)
        .map(([subj, cls]) => `${subj}: ${cls.join(", ")}`)
        .join("; ")
      return { text, totalExplicitPeriods: Math.round(totalExplicitPeriods * 100) / 100 }
    }

    return {
      teacher: t,
      hk1: getSummary(1),
      hk2: getSummary(2)
    }
  })

  const selectedTeacher = teachers.find((t: any) => t.id === selectedTeacherId)
  const selectedTeacherAssigns = assignments.filter(
    (a: any) => a.teacherId === selectedTeacherId && a.academicYearId === selectedYear
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start tabular-nums">
      {/* LEFT: MAIN TABLE */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] flex-1 w-full overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap gap-3 justify-between items-center text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-bold text-[#003B3A] flex items-center">
              <Layers className="w-4 h-4 mr-2 text-[#008B85]" />
              Bảng phân công
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({filteredTeachers.length} giáo viên)
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
              {[
                { id: "ALL", label: "Tất cả" },
                { id: "GVVN", label: "GVVN" },
                { id: "GVNN", label: "GVNN" }
              ].map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedTeacherGroup(g.id as "ALL" | "GVVN" | "GVNN")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedTeacherGroup === g.id
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/thoi-khoa-bieu/phan-cong${
                selectedYear ? `?academicYearId=${encodeURIComponent(selectedYear)}` : ""
              }`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-semibold hover:bg-emerald-100/70 transition-colors"
            >
              <span>Đối chiếu tiết ESL (GVVN / GVNN)</span>
            </Link>
            <button
              type="button"
              onClick={handleSyncToTimetable}
              disabled={syncingTimetable}
              title="Đồng bộ toàn bộ phân công môn chính & môn luân phiên sang các phương án Thời khóa biểu nháp"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#003B3A] text-white text-xs font-semibold hover:bg-[#005250] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#5EEAD4] ${syncingTimetable ? "animate-spin" : ""}`}
              />
              <span>{syncingTimetable ? "Đang đồng bộ..." : "Đồng bộ sang Thời khóa biểu"}</span>
            </button>
            <Link
              href={`/admin/thoi-khoa-bieu/xep-lich${
                selectedYear ? `?academicYearId=${encodeURIComponent(selectedYear)}` : ""
              }`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F0FDFA] border border-teal-200 text-[#003B3A] text-xs font-semibold hover:bg-teal-100/70 transition-colors"
            >
              <CalendarRange className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Mở Thời khóa biểu</span>
            </Link>
            <input
              type="text"
              placeholder="Tìm giáo viên..."
              value={searchTeacher}
              onChange={e => setSearchTeacher(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs outline-none bg-[#F8FAFC] w-40 focus:border-[#00A19A] focus:bg-white"
            />
            <select
              value={selectedCampusId}
              onChange={e => setSelectedCampusId(e.target.value)}
              className="px-2.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-xs outline-none bg-[#F8FAFC] text-slate-700 focus:border-[#00A19A]"
            >
              <option value="">Tất cả cơ sở</option>
              {(campuses || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
            <select
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              className="px-2.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-xs outline-none bg-[#F8FAFC] text-slate-700 focus:border-[#00A19A]"
            >
              <option value="">Tất cả tổ chuyên môn</option>
              {(departments || []).map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => {
                setSelectedYear(e.target.value)
                setSelectedLevel("")
                setSelectedGrade("")
                setNewClasses([])
              }}
              className="px-2.5 py-2 rounded-xl border border-[#E2E8F0] font-semibold text-xs outline-none bg-[#F8FAFC] text-slate-700 focus:border-[#00A19A]"
            >
              {years
                .filter((y: any) => !y.isOff)
                .map((y: any) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] sticky top-0 z-10 border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-2.5 px-3 text-white w-1/4">Giáo viên &amp; nhóm</th>
                <th className="py-2.5 px-3 text-teal-100 w-3/8">Phân công học kỳ 1</th>
                <th className="py-2.5 px-3 text-teal-100 w-3/8">Phân công học kỳ 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {tableData.map((row: any) => {
                const isGvnn = row.teacher.teacherGroup === "GVNN"
                return (
                  <tr
                    key={row.teacher.id}
                    onClick={() => setSelectedTeacherId(row.teacher.id)}
                    className={`cursor-pointer transition-colors align-middle ${
                      selectedTeacherId === row.teacher.id
                        ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                        : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="py-3 px-3 align-middle font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{row.teacher.teacherName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            isGvnn
                              ? "bg-emerald-50 text-[#059669] border-emerald-200"
                              : "bg-[#F0FDFA] text-[#003B3A] border-teal-200"
                          }`}
                        >
                          {isGvnn ? "GVNN" : "GVVN"}
                        </span>
                      </div>
                      {row.teacher.teacherCode && (
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          {row.teacher.teacherCode}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">
                      {row.hk1.text ? (
                        <div>
                          <div>{row.hk1.text}</div>
                          {row.hk1.totalExplicitPeriods > 0 && (
                            <div className="text-[11px] font-semibold text-[#00736E] mt-0.5">
                              Tổng tiết khai báo riêng: {row.hk1.totalExplicitPeriods} tiết/tuần
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-middle text-slate-600">
                      {row.hk2.text ? (
                        <div>
                          <div>{row.hk2.text}</div>
                          {row.hk2.totalExplicitPeriods > 0 && (
                            <div className="text-[11px] font-semibold text-[#00736E] mt-0.5">
                              Tổng tiết khai báo riêng: {row.hk2.totalExplicitPeriods} tiết/tuần
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: CONFIG PANEL */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] w-full lg:w-[410px] flex-shrink-0 flex flex-col h-[70vh] overflow-hidden">
        <div className="p-4 border-b border-[#003B3A] bg-[#003B3A] text-white">
          <h3 className="font-bold text-sm flex items-center">
            <User className="w-4 h-4 mr-2 text-[#5EEAD4]" /> Cài đặt phân công
          </h3>
          <p className="text-teal-100 text-xs mt-1">
            {selectedTeacher
              ? `${selectedTeacher.teacherName} (${
                  selectedTeacher.teacherGroup === "GVNN" ? "GVNN" : "GVVN"
                })`
              : "Chọn giáo viên bên trái"}
          </p>
        </div>

        {selectedTeacher ? (
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
            {/* ADD FORM */}
            <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 text-xs font-semibold">
              <h4 className="font-bold text-slate-700 text-sm mb-3">Thêm phân công mới</h4>
              <div className="space-y-3">
                <select
                  value={newSubj}
                  onChange={e => setNewSubj(e.target.value)}
                  className="w-full p-2 border border-[#E2E8F0] bg-white rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.subjectName} {s.subjectCode ? `(${s.subjectCode})` : ""}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Số tiết/tuần giao cho{" "}
                    {selectedTeacher.teacherGroup === "GVNN" ? "GVNN" : "GVVN"} này (tùy chọn)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newWeeklyPeriods}
                      onChange={e => {
                        const raw = e.target.value
                        if (raw !== "" && !/^[0-9]*[.,]?[0-9]*$/.test(raw)) return
                        setNewWeeklyPeriods(raw)
                      }}
                      placeholder="Để trống = lấy trọn định mức khối (VD: 4, 4.5, 0,5)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] outline-none"
                    />
                  </div>
                  {isSelectedSubjDual && (
                    <p className="text-[11px] text-[#059669] font-medium mt-1">
                      Môn ESL tự động giữ nguyên giáo viên{" "}
                      {selectedTeacher.teacherGroup === "GVNN" ? "GVVN" : "GVNN"} cùng lớp mà không
                      ghi đè.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={selectedFormCampusId}
                    onChange={e => {
                      setSelectedFormCampusId(e.target.value)
                      setSelectedGrade("")
                      setNewClasses([])
                    }}
                    className="w-full p-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả cơ sở</option>
                    {(campuses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.campusName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedLevel}
                    onChange={e => {
                      setSelectedLevel(e.target.value)
                      setSelectedGrade("")
                      setNewClasses([])
                    }}
                    className="w-full p-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả bậc học</option>
                    {levels.map((l: any) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedGrade}
                    onChange={e => {
                      setSelectedGrade(e.target.value)
                      setNewClasses([])
                    }}
                    className="w-full p-1.5 border border-[#E2E8F0] rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả khối</option>
                    {grades.map((g: any) => (
                      <option key={g} value={g}>
                        {g.toLowerCase().startsWith("khối")
                          ? g
                          : !isNaN(Number(g))
                            ? `Khối ${g}`
                            : g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 border border-[#E2E8F0] rounded-lg p-2.5 max-h-[150px] overflow-y-auto bg-white">
                  <div className="font-bold text-slate-700 mb-1.5 text-[11px] flex justify-between items-center">
                    <span>Lớp học ({filteredClasses.length})</span>
                    {filteredClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (newClasses.length === filteredClasses.length) {
                            setNewClasses([])
                          } else {
                            setNewClasses(filteredClasses.map((c: any) => c.id))
                          }
                        }}
                        className="text-[#00736E] hover:underline text-[11px] font-semibold cursor-pointer"
                      >
                        {newClasses.length === filteredClasses.length
                          ? "Bỏ chọn tất cả"
                          : "Chọn tất cả"}
                      </button>
                    )}
                  </div>
                  {filteredClasses.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 italic text-xs">
                      Không có lớp phù hợp
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredClasses.map((c: any) => {
                        const isChecked = newClasses.includes(c.id)
                        return (
                          <label
                            key={c.id}
                            title={c.className}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-xs transition-all ${
                              isChecked
                                ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A] font-semibold"
                                : "bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setNewClasses(newClasses.filter(id => id !== c.id))
                                } else {
                                  setNewClasses([...newClasses, c.id])
                                }
                              }}
                              className="w-3.5 h-3.5 accent-[#003B3A] rounded border-slate-300"
                            />
                            <span className="truncate">{c.className}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hk1}
                      onChange={e => setHk1(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#003B3A]"
                    />{" "}
                    Học kỳ 1
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hk2}
                      onChange={e => setHk2(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#003B3A]"
                    />{" "}
                    Học kỳ 2
                  </label>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="w-full py-2 bg-[#003B3A] text-white rounded-xl font-semibold text-xs mt-1 hover:bg-[#005250] transition flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Cập nhật phân công
                </button>
              </div>
            </div>

            {/* LIST */}
            <div>
              <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2 text-[#00736E]" /> Danh sách đã phân công
              </h4>
              {selectedTeacherAssigns.length === 0 ? (
                <div className="text-center text-slate-400 py-6 text-sm italic border border-dashed border-[#E2E8F0] rounded-xl">
                  Giáo viên chưa có phân công trong năm học này
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTeacherAssigns.map((a: any) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 p-3 bg-white border border-[#E2E8F0] rounded-xl hover:border-teal-200"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#003B3A] text-xs">{a.subjectName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-semibold text-slate-700">{a.className}</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            HK{a.semester}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              a.teacherRole === "GVNN"
                                ? "bg-emerald-50 text-[#059669]"
                                : "bg-[#F0FDFA] text-[#00736E]"
                            }`}
                          >
                            {a.teacherRole || "GVVN"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={a.weeklyPeriods ?? ""}
                          placeholder="ĐM"
                          title="Số tiết/tuần riêng cho giáo viên này (hỗ trợ 4.5, 0,5 — nhập rồi nhấn ra ngoài để lưu)"
                          onBlur={e => {
                            const curStr =
                              a.weeklyPeriods !== null && a.weeklyPeriods !== undefined
                                ? String(a.weeklyPeriods)
                                : ""
                            const nextNorm = e.target.value.trim().replace(/,/g, ".")
                            if (nextNorm !== curStr) {
                              void handleInlinePeriodUpdate(a.id, e.target.value)
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              ;(e.target as HTMLInputElement).blur()
                            }
                          }}
                          className="w-14 text-right px-1.5 py-1 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#003B3A] focus:border-[#00A19A] outline-none"
                        />
                        <span className="text-[11px] text-slate-400">tiết</span>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={loading}
                          className="p-1.5 text-slate-400 hover:text-[#E11D48] hover:bg-rose-50 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 p-6 text-center text-sm">
            Vui lòng chọn một giáo viên từ danh sách bên trái để xem và cài đặt phân công.
          </div>
        )}
      </div>
    </div>
  )
}
