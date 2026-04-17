"use client"
import { useState, useMemo } from "react"
import { Plus, Trash2, CheckCircle2, User, BookOpen, Layers } from "lucide-react"
import { saveAssignment, deleteAssignment } from "./actions"

export function TeachingClient({ teachers, classes, subjects, years, initialAssignments }: any) {
  const [selectedYear, setSelectedYear] = useState(years[0]?.id || "")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState(initialAssignments)
  const [loading, setLoading] = useState(false)

  // Form states for new assignment
  const [newSubj, setNewSubj] = useState("")
  const [newClass, setNewClass] = useState("")
  const [hk1, setHk1] = useState(true)
  const [hk2, setHk2] = useState(true)

  // Filter classes by year
  const yearClasses = classes.filter((c:any) => c.academicYearId === selectedYear)

  const handleAdd = async () => {
    if (!selectedTeacherId || !newSubj || !newClass || (!hk1 && !hk2)) return alert("Vui lòng chọn đủ thông tin môn, lớp và ít nhất 1 học kỳ!")
    setLoading(true)
    const semesters = []
    if (hk1) semesters.push(1)
    if (hk2) semesters.push(2)
    
    const res = await saveAssignment({
      teacherId: selectedTeacherId,
      classId: newClass,
      subjectId: newSubj,
      academicYearId: selectedYear,
      semesters
    })

    if (res.success) {
      setAssignments([...assignments.filter((a:any) => 
        !(a.teacherId === selectedTeacherId && a.classId === newClass && a.subjectId === newSubj && a.academicYearId === selectedYear)
      ), ...res.added])
      setNewSubj("")
      setNewClass("")
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
  const tableData = teachers.map((t:any) => {
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 w-full overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="font-bold text-slate-700 flex items-center"><Layers className="w-5 h-5 mr-2 text-indigo-500"/>Bảng phân công</div>
          <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)} className="p-2 rounded-lg border border-slate-200 font-semibold text-sm outline-none">
            {years.map((y:any) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-bold w-1/4">Giáo viên</th>
                <th className="px-4 py-3 font-bold w-3/8">Phân công học kỳ 1</th>
                <th className="px-4 py-3 font-bold w-3/8">Phân công học kỳ 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((row:any) => (
                <tr 
                  key={row.teacher.id} 
                  onClick={() => setSelectedTeacherId(row.teacher.id)}
                  className={`cursor-pointer transition-colors ${selectedTeacherId === row.teacher.id ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.teacher.teacherName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.hk1 || <span className="text-slate-300 italic">Chưa PC</span>}</td>
                  <td className="px-4 py-3 text-slate-600">{row.hk2 || <span className="text-slate-300 italic">Chưa PC</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: CONFIG PANEL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full lg:w-[400px] flex-shrink-0 flex flex-col h-[70vh]">
        <div className="p-4 border-b border-slate-200 bg-indigo-600 text-white rounded-t-2xl">
          <h3 className="font-bold flex items-center"><User className="w-5 h-5 mr-2"/> Cài đặt phân công</h3>
          <p className="text-indigo-100 text-sm mt-1">{selectedTeacher ? selectedTeacher.teacherName : 'Chọn giáo viên bên trái'}</p>
        </div>

        {selectedTeacher ? (
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-6">
            
            {/* ADD FORM */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 text-sm mb-3">Thêm phân công mới</h4>
              <div className="space-y-3">
                <select value={newSubj} onChange={e=>setNewSubj(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">-- Chọn Môn học --</option>
                  {subjects.map((s:any) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                </select>
                <select value={newClass} onChange={e=>setNewClass(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">-- Chọn Lớp học --</option>
                  {yearClasses.map((c:any) => <option key={c.id} value={c.id}>{c.className}</option>)}
                </select>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={hk1} onChange={e=>setHk1(e.target.checked)} className="w-4 h-4 rounded text-indigo-600"/> Học kỳ 1
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={hk2} onChange={e=>setHk2(e.target.checked)} className="w-4 h-4 rounded text-indigo-600"/> Học kỳ 2
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
                      <button onClick={()=>handleDelete(a.id)} disabled={loading} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
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
