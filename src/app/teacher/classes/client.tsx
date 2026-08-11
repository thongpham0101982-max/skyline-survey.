"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Users, Building2, CalendarDays, ClipboardList } from "lucide-react"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"

export function TeacherClassesClient({ initialClasses, academicYears }: { initialClasses?: any[], academicYears?: any[] }) {
  const safeYears = Array.isArray(academicYears) ? academicYears : []
  const safeClasses = Array.isArray(initialClasses) ? initialClasses.filter(Boolean) : []

  const [selectedYearId, setSelectedYearId] = useState(() => getDefaultAcademicYearClient(safeYears)?.id || "")

  const filteredClasses = useMemo(() => {
    if (!selectedYearId) return safeClasses
    return safeClasses.filter(c => c && c.academicYearId === selectedYearId)
  }, [safeClasses, selectedYearId])

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-[#00A99D] rounded-lg flex items-center justify-center flex-shrink-0">
             <ClipboardList className="w-4 h-4 text-white"/>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Lớp học của tôi</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Quản lý các lớp học được phân công và xem kết quả khảo sát</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400"/>
          <select 
            value={selectedYearId} 
            onChange={e => setSelectedYearId(e.target.value)} 
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[140px] sm:max-w-none"
          >
            {safeYears.filter(ay => ay && !ay.isOff).map(ay => (
              <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center border-2 border-teal-100">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Không có lớp học nào</h3>
          <p className="text-slate-400 text-sm mt-1">Bạn chưa được phân công lớp học nào trong năm học này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClasses.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border-2 border-teal-100 overflow-hidden hover:shadow-md hover:border-[#00A99D]/30 transition-all group flex flex-col justify-between">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-[#00A99D] transition-colors">{c.className}</h3>
                    <p className="text-xs font-bold text-[#00A99D] mt-0.5">{c.classCode}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {c.isHomeroom && (
                      <span className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase bg-[#00A99D] text-white border border-[#00a99d]">
                        Lớp chủ nhiệm
                      </span>
                    )}
                    <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full uppercase ${c.status === "ACTIVE" ? "bg-teal-50 text-[#00A99D] border border-teal-100" : "bg-slate-100 text-slate-500"}`}>
                      {c.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-6">
                  <div className="flex items-center text-xs font-semibold text-slate-500">
                    <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                    Cơ sở: <span className="text-slate-700 ml-1 font-bold">{c.campus?.campusName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-slate-500">
                    <CalendarDays className="w-4 h-4 mr-2 text-slate-400" />
                    Năm học: <span className="text-slate-700 ml-1 font-bold">{c.academicYear?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-xs font-semibold text-slate-500">
                    <Users className="w-4 h-4 mr-2 text-slate-400" />
                    Học sinh: <span className="text-slate-700 ml-1 font-bold">{c._count?.students || 0} học sinh</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end text-xs font-semibold p-6 pt-0">
                <Link 
                  href={`/teacher/classes/${c.id}`} 
                  className="text-xs font-bold text-[#00A99D] hover:text-[#009085] transition-colors flex items-center gap-1.5"
                >
                  {c.isHomeroom ? "Xem chi tiết Lớp chủ nhiệm →" : "Xem chi tiết kết quả khảo sát →"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
