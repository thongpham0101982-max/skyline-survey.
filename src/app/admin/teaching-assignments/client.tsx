"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
import { useState, useMemo } from "react"
import { Plus, Trash2, CheckCircle2, User, BookOpen, Layers } from "lucide-react"
import { saveAssignment, deleteAssignment } from "./actions"

export function TeachingClient({ teachers, classes, subjects, years, departments, campuses = [], initialAssignments }: any) {
  const [selectedYear, setSelectedYear] = useState(() => getDefaultAcademicYearClient(years)?.id || "")
  const [selectedDeptId, setSelectedDeptId] = useState("")
  const [selectedCampusId, setSelectedCampusId] = useState("")
  const [selectedFormCampusId, setSelectedFormCampusId] = useState("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [searchTeacher, setSearchTeacher] = useState("")

  const filteredTeachers = useMemo(() => {
    let list = teachers;
    if (searchTeacher.trim()) {
      const q = searchTeacher.toLowerCase().trim()
      list = list.filter((t: any) => 
        (t.teacherName || "").toLowerCase().includes(q) || 
        (t.teacherCode || "").toLowerCase().includes(q)
      )
    }
    if (selectedDeptId) {
      list = list.filter((t: any) => t.departmentId === selectedDeptId);
    }
    if (selectedCampusId) {
      list = list.filter((t: any) => t.campusId === selectedCampusId || t.campus?.id === selectedCampusId);
    }
    return list;
  }, [teachers, searchTeacher, selectedDeptId, selectedCampusId])
  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState(false)

  // Form states for new assignment
  const [newSubj, setNewSubj] = useState("")
  const [newClasses, setNewClasses] = useState([])
  const [hk1, setHk1] = useState(true)
  const [hk2, setHk2] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedGrade, setSelectedGrade] = useState("")

  // Extract levels and grades for the selected year
  const levels = useMemo(() => {
    const set = new Set<string>()
    classes
      .filter((c: any) => !selectedYear || c.academicYearId === selectedYear)
      .forEach((c: any) => {
        if (c.level) {
          const lvl = c.level.trim()
          if (["nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mầm non", "mam non"].includes(lvl.toLowerCase())) {
            set.add("Mầm non")
          } else {
            set.add(lvl)
          }
        }
      })
    const LEVEL_ORDER: Record<string, number> = {
      "mầm non": 1,
      "tiểu học": 2,
      "thcs": 3,
      "thpt": 4,
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
            return ["mầm non", "nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mam non"].includes(cLvl)
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
      "5 đến 6 tuổi": 7,
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
          return ["mầm non", "nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mam non"].includes(cLvl)
        }
        return cLvl === sLvl
      })
    }
    if (selectedGrade) {
      list = list.filter((c: any) => (c.grade || "").toLowerCase().trim() === selectedGrade.toLowerCase().trim())
    }
    return list
  }, [classes, selectedYear, selectedFormCampusId, selectedLevel, selectedGrade])

  const handleAdd = async () => {
    if (!selectedTeacherId || !newSubj || newClasses.length === 0 || (!hk1 && !hk2)) return alert("Vui lòng chọn đủ thông tin môn, lớp và ít nhất 1 học kỳ!")
    setLoading(true)
    const semesters = []
    if (hk1) semesters.push(1)
    if (hk2) semesters.push(2)
    
    const res = await saveAssignment({
      teacherId: selectedTeacherId,
      classIds: newClasses,
      subjectId: newSubj,
      academicYearId: selectedYear,
      semesters
    })

    if (res.success) {
      setAssignments([...assignments.filter((a:any) => 
        !(a.teacherId === selectedTeacherId && newClasses.includes(a.classId) && a.subjectId === newSubj && a.academicYearId === selectedYear)
      ), ...res.added])
      setNewSubj("")
      setNewClasses([])
    } else {
      alert("Lỗi: " + res.error)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if(!confirm("Xóa phân công này?")) return
    setLoading(true)
    const res = await deleteAssignment(id)
    if(res.success) setAssignments(assignments.filter((a:any) => a.id !== id))
    else alert("Lỗi: " + res.error)
    setLoading(false)
  }

  // Build summary for the table
  const tableData = filteredTeachers.map((t:any) => {
    const tAssigns = assignments.filter((a:any) => a.teacherId === t.id && a.academicYearId === selectedYear)
    
    // Group by semester and subject
    const getSummary = (sem: number) => {
      const semAssigns = tAssigns.filter((a:any) => a.semester === sem)
      const bySubj: any = {}
      semAssigns.forEach((a:any) => {
        if (!bySubj[a.subjectName]) bySubj[a.subjectName] = []
        bySubj[a.subjectName].push(a.className)
      })
      return Object.entries(bySubj).map(([subj, cls]: any) => `${subj}: ${cls.join(', ')}`).join('; ')
    }

    return {
      teacher: t,
      hk1: getSummary(1),
      hk2: getSummary(2)
    }
  })

  const selectedTeacher = teachers.find((t:any) => t.id === selectedTeacherId)
  const selectedTeacherAssigns = assignments.filter((a:any) => a.teacherId === selectedTeacherId && a.academicYearId === selectedYear)

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT: MAIN TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-teal-100 flex-1 w-full overflow-hidden">
        <div className="p-4 flex flex-wrap gap-3 justify-between items-center text-xs font-semibold">
          <div className="font-bold text-slate-700 flex items-center">
            <Layers className="w-5 h-5 mr-2 text-indigo-500"/>
            Bảng phân công
            <span className="ml-2 text-xs font-normal text-slate-400">({filteredTeachers.length} giáo viên)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input 
              type="text"
              placeholder="Tìm giáo viên..."
              value={searchTeacher}
              onChange={e => setSearchTeacher(e.target.value)}
              className="p-2 rounded-lg border border-slate-200 text-xs outline-none bg-white w-36 focus:border-[#48BFE3]"
            />
            <select value={selectedCampusId} onChange={e=>setSelectedCampusId(e.target.value)} className="p-2 rounded-lg border border-slate-200 font-semibold text-xs outline-none bg-white">
              <option value="">Tất cả Cơ sở</option>
              {(campuses || []).map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
            <select value={selectedDeptId} onChange={e=>setSelectedDeptId(e.target.value)} className="p-2 rounded-lg border border-slate-200 font-semibold text-xs outline-none bg-white">
              <option value="">Tất cả Tổ chuyên môn</option>
              {(departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={selectedYear} onChange={e=>{ setSelectedYear(e.target.value); setSelectedLevel(""); setSelectedGrade(""); setNewClasses([]); }} className="p-2 rounded-lg border border-slate-200 font-semibold text-xs outline-none">
              {years.filter((y: any) => !y.isOff).map((y:any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
              <tr>
                <th className="p-2 p-2 font-bold w-1/4 border border-slate-200">Giáo viên</th>
                <th className="p-2 p-2 font-bold w-3/8 border border-slate-200">Phân công học kỳ 1</th>
                <th className="p-2 p-2 font-bold w-3/8 border border-slate-200">Phân công học kỳ 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row:any) => (
                <tr 
                  key={row.teacher.id} 
                  onClick={() => setSelectedTeacherId(row.teacher.id)}
                  className={`cursor-pointer transition-colors ${selectedTeacherId === row.teacher.id ? 'bg-[#48BFE3]/10 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <td className="p-2 p-2 font-semibold text-slate-800 border border-slate-200">{row.teacher.teacherName}</td>
                  <td className="p-2 p-2 text-slate-600 border border-slate-200">{row.hk1 || <span className="text-slate-300 italic">Chưa PC</span>}</td>
                  <td className="p-2 p-2 text-slate-600 border border-slate-200">{row.hk2 || <span className="text-slate-300 italic">Chưa PC</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: CONFIG PANEL */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-100 w-full lg:w-[400px] flex-shrink-0 flex flex-col h-[70vh]">
        <div className="p-4 border-b border-slate-200 bg-[#48BFE3] text-white rounded-t-2xl">
          <h3 className="font-bold flex items-center"><User className="w-5 h-5 mr-2"/> Cài đặt phân công</h3>
          <p className="text-indigo-100 text-sm mt-1">{selectedTeacher ? selectedTeacher.teacherName : 'Chọn giáo viên bên trái'}</p>
        </div>

        {selectedTeacher ? (
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
            
            {/* ADD FORM */}
            <div className="p-4 text-xs font-semibold">
              <h4 className="font-bold text-slate-700 text-sm mb-3">Thêm phân công mới</h4>
              <div className="space-y-3">
                <select value={newSubj} onChange={e=>setNewSubj(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">-- Chọn Môn học --</option>
                  {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <select 
                    value={selectedFormCampusId} 
                    onChange={e=>{ 
                      setSelectedFormCampusId(e.target.value); 
                      setSelectedGrade(""); 
                      setNewClasses([]); 
                    }} 
                    className="w-full p-1.5 border rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả Cơ sở</option>
                    {(campuses || []).map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                  </select>
                  <select 
                    value={selectedLevel} 
                    onChange={e=>{ 
                      setSelectedLevel(e.target.value); 
                      setSelectedGrade(""); 
                      setNewClasses([]); 
                    }} 
                    className="w-full p-1.5 border rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả Bậc học</option>
                    {levels.map((l: any) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <select 
                    value={selectedGrade} 
                    onChange={e=>{ 
                      setSelectedGrade(e.target.value); 
                      setNewClasses([]); 
                    }} 
                    className="w-full p-1.5 border rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="">Tất cả Khối</option>
                    {grades.map((g: any) => (
                      <option key={g} value={g}>
                        {g.toLowerCase().startsWith("khối") ? g : (!isNaN(Number(g)) ? `Khối ${g}` : g)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-lg p-2.5 max-h-[160px] overflow-y-auto bg-slate-50">
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
                        className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold"
                      >
                        {newClasses.length === filteredClasses.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    )}
                  </div>
                  {filteredClasses.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 italic text-xs">Không có lớp phù hợp</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {filteredClasses.map((c: any) => {
                        const isChecked = newClasses.includes(c.id);
                        return (
                          <label 
                            key={c.id} 
                            title={c.className}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-xs transition-all ${isChecked ? 'bg-[#48BFE3]/10 border-[#48BFE3] text-[#48BFE3] font-bold' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
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
                              className="w-3.5 h-3.5 text-[#48BFE3] rounded border-slate-300 focus:ring-[#48BFE3]"
                            />
                            <span className="truncate">{c.className}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={hk1} onChange={e=>setHk1(e.target.checked)} className="w-4 h-4 rounded text-[#48BFE3]"/> Học kỳ 1
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={hk2} onChange={e=>setHk2(e.target.checked)} className="w-4 h-4 rounded text-[#48BFE3]"/> Học kỳ 2
                  </label>
                </div>
                <button onClick={handleAdd} disabled={loading} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm tracking-wide mt-2 hover:bg-slate-900 transition flex items-center justify-center">
                  <Plus className="w-4 h-4 mr-2"/> Cập nhật
                </button>
              </div>
            </div>

            {/* LIST */}
            <div>
              <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center"><BookOpen className="w-4 h-4 mr-2 text-indigo-500"/> Danh sách đã phân công</h4>
              {selectedTeacherAssigns.length === 0 ? (
                <div className="text-center text-slate-400 py-6 text-sm italic border-2 border-dashed rounded-xl">Giáo viên chưa có thời khóa biểu</div>
              ) : (
                <div className="space-y-2">
                  {selectedTeacherAssigns.map((a:any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300">
                      <div>
                        <div className="font-bold text-indigo-700 text-sm">{a.subjectName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-slate-700">{a.className}</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">HK{a.semester}</span>
                        </div>
                      </div>
                      <button onClick={()=>handleDelete(a.id)} disabled={loading} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-semibold">
                        <Trash2 className="w-4 h-4"/>
                      </button>
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
