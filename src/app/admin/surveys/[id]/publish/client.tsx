"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { dispatchSurveyAction, revokeSurveyAction, applyEmergencyDbFix } from "./actions"
import { Layers } from "lucide-react"

const AUDIENCE_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PHHS: { label: "Phụ huynh học sinh", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  HocSinh: { label: "Học sinh", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  GiaoVien: { label: "Giáo viên", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
}

const EDU_SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  HNG: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", activeBg: "bg-indigo-600" },
  SB:  { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", activeBg: "bg-purple-600" },
  HNS: { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   activeBg: "bg-teal-600" },
  MNS: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", activeBg: "bg-rose-600" },
  MNG: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", activeBg: "bg-emerald-600" },
}

function getEduColor(code: string) {
  return EDU_SYSTEM_COLORS[code] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", activeBg: "bg-slate-700" }
}

export default function PublishSurveyClient({ initialSurvey, classes, eduSystems }: any) {
  const [mounted, setMounted] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error" | "migrate"; message: string } | null>(null)
  const [activeCampusId, setActiveCampusId] = useState<string | "all">("all")
  const [activeEduSystem, setActiveEduSystem] = useState<string | "all">("all")

  useEffect(() => { setMounted(true) }, [])

  const survey = initialSurvey
  const aud = useMemo(() => {
    const val = (survey?.targetAudience || "PHHS").toLowerCase()
    if (val.includes("hocsinh") || val.includes("sinh")) return AUDIENCE_MAP.HocSinh
    if (val.includes("giaovien") || val.includes("vien")) return AUDIENCE_MAP.GiaoVien
    return AUDIENCE_MAP.PHHS
  }, [survey])

  const campuses = useMemo(() => {
    const map = new Map()
    classes.forEach((cls: any) => {
      const c = cls.campus || { id: "unknown", campusName: "Chưa phân loại" }
      if (!map.has(c.id)) map.set(c.id, c.campusName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const filteredClasses = useMemo(() => {
    let result = classes
    if (activeCampusId !== "all") result = result.filter((cls: any) => cls.campus?.id === activeCampusId)
    if (activeEduSystem !== "all") result = result.filter((cls: any) => cls.educationSystem === activeEduSystem)
    return result
  }, [classes, activeCampusId, activeEduSystem])

  const handleDispatch = async () => {
    if (selectedClassIds.length === 0) return
    setIsLoading(true); setResult(null)
    const res: any = await dispatchSurveyAction(survey.id, selectedClassIds)
    if (res?.error === "DATABASE_MIGRATION_REQUIRED") {
      setResult({ type: "migrate", message: "⚠️ DATABASE CẦN CẬP NHẬT: Vui lòng nhấn nút sửa lỗi bên phải." })
    } else if (res?.error) {
      setResult({ type: "error", message: res.error })
    } else {
      setResult({ type: "success", message: `✅ ĐÃ PHÁT HÀNH: ${res.created} phiếu khảo sát mới đã được tạo.` })
      setSelectedClassIds([])
    }
    setIsLoading(false)
  }

  const handleRevoke = async () => {
    if (selectedClassIds.length === 0) return
    if (!confirm(`Bạn có chắc chắn muốn THU HỒI toàn bộ phiếu khảo sát của ${selectedClassIds.length} lớp đã chọn?`)) return
    setIsLoading(true); setResult(null)
    const res: any = await revokeSurveyAction(survey.id, selectedClassIds)
    if (res?.error) setResult({ type: "error", message: res.error })
    else {
      setResult({ type: "success", message: `✅ ĐÃ THU HỒI: Xóa thành công ${res.count} phiếu khảo sát.` })
      setSelectedClassIds([])
    }
    setIsLoading(false)
  }

  const handleSelectAllVisible = () => {
    const visibleIds = filteredClasses.map((c: any) => c.id)
    const allSelected = visibleIds.every((id: string) => selectedClassIds.includes(id))
    if (allSelected) {
      setSelectedClassIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedClassIds(prev => [...new Set([...prev, ...visibleIds])])
    }
  }

  if (!mounted) return <div className="p-20 text-center text-slate-400 font-bold">Đang tải...</div>

  const allVisibleSelected = filteredClasses.length > 0 && filteredClasses.every((c: any) => selectedClassIds.includes(c.id))

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 px-4 mt-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/surveys" className="p-3 shadow-sm hover:bg-slate-50 transition-colors text-xs font-semibold">←</Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Quản lý Phát hành & Thu hồi</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{survey.name} • {aud.label} • {survey.academicYear?.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
           <div className="bg-slate-100 rounded-xl px-4 py-2 text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Tổng số lớp</span>
              <span className="text-sm font-black text-slate-700">{classes.length}</span>
           </div>
           <div className="text-center text-xs font-semibold">
              <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-wider mb-1">Đã gán</span>
              <span className="text-sm font-black text-emerald-700">{classes.filter((c:any) => c._count.surveyForms > 0).length}</span>
           </div>
           <div className="text-center text-xs font-semibold">
              <span className="block text-[8px] font-black text-rose-400 uppercase tracking-wider mb-1">Chưa gán</span>
              <span className="text-sm font-black text-rose-700">{classes.filter((c:any) => c._count.surveyForms === 0).length}</span>
           </div>
        </div>
      </div>

      {result && (
        <div className={`p-6 rounded-[2.5rem] border-2 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 ${
          result.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : 
          result.type === "migrate" ? "bg-amber-50 border-amber-200 text-amber-800" : 
          "bg-red-50 border-red-200 text-red-800"
        }`}>
           <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{result.type === "success" ? "✅" : "⚠️"}</span>
                <span className="font-black leading-tight">{result.message}</span>
              </div>
              <button onClick={() => setResult(null)} className="p-2 hover:bg-black/5 rounded-full opacity-40">✕</button>
           </div>
        </div>
      )}

      {/* Filters: Campus + Hệ học */}
      <div className="space-y-3">
        {/* Campus Selector Tabs */}
        {campuses.length > 0 && (
          <div className="bg-white/50 p-2 rounded-[2.5rem] border border-slate-200 flex flex-wrap gap-2">
            <button onClick={() => setActiveCampusId("all")} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}>
              Tất cả cơ sở
            </button>
            {campuses.map(c => (
              <button key={c.id} onClick={() => setActiveCampusId(c.id)} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === c.id ? "bg-[#1E8B87] text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100 hover:border-teal-200"}`}>
                {c.name} ({classes.filter((cl: any) => cl.campus?.id === c.id).length})
              </button>
            ))}
          </div>
        )}

        {/* Hệ học Filter Tabs - unified with Hệ học standard */}
        {eduSystems.length > 0 && (
          <div className="bg-white/50 p-2 rounded-[2.5rem] border border-indigo-100 flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 px-4 text-xs font-black text-indigo-400 uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5" />
              Hệ học:
            </div>
            <button onClick={() => setActiveEduSystem("all")} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeEduSystem === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}>
              Tất cả hệ
            </button>
            {eduSystems.map((es: any) => {
              const col = getEduColor(es.code)
              const isActive = activeEduSystem === es.code
              const countInFilter = activeCampusId === "all"
                ? classes.filter((c: any) => c.educationSystem === es.code).length
                : classes.filter((c: any) => c.educationSystem === es.code && c.campus?.id === activeCampusId).length
              return (
                <button key={es.id} onClick={() => setActiveEduSystem(es.code)}
                  className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${isActive ? col.activeBg + " text-white shadow-lg" : "bg-white " + col.text + " border " + col.border + " hover:opacity-80"}`}>
                  {es.code} - {es.name} ({countInFilter})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Grid Header with Select All */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">
          Hiển thị <span className="text-slate-800 font-black">{filteredClasses.length}</span> lớp
          {activeEduSystem !== "all" && <span className="ml-1 text-indigo-600">· Hệ {activeEduSystem}</span>}
          {activeCampusId !== "all" && <span className="ml-1 text-teal-600">· {campuses.find(c => c.id === activeCampusId)?.name}</span>}
        </p>
        <button onClick={handleSelectAllVisible} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${allVisibleSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {allVisibleSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${filteredClasses.length})`}
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 min-h-[400px] shadow-sm">
        {filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold text-lg">Không có lớp nào</p>
            <p className="text-sm mt-1">Thử chọn bộ lọc khác</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredClasses.map((cls: any) => {
              const isAssigned = cls._count.surveyForms > 0;
              const isSelected = selectedClassIds.includes(cls.id);
              const eduCol = getEduColor(cls.educationSystem)
              return (
                <button key={cls.id} onClick={() => setSelectedClassIds(p => p.includes(cls.id) ? p.filter(x => x !== cls.id) : [...p, cls.id])}
                  className={`group relative p-5 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center ${
                    isSelected ? "bg-slate-900 border-slate-900 text-white translate-y-[-4px] shadow-2xl" : 
                    isAssigned ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                    "bg-slate-50/30 border-slate-100 text-slate-600 hover:border-slate-300"
                  }`}>
                  
                  {isAssigned && !isSelected && (
                    <div className="absolute top-3 right-3 text-white text-[8px] font-black uppercase text-xs font-semibold">ĐÃ GÁN</div>
                  )}

                  {/* Hệ học badge */}
                  {cls.educationSystem && !isSelected && (
                    <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-black ${eduCol.bg} ${eduCol.text}`}>
                      {cls.educationSystem}
                    </div>
                  )}
                  
                  <div className="text-sm font-black mb-1 text-center mt-4">{cls.className}</div>
                  <div className={`text-[10px] font-bold opacity-40 uppercase tracking-widest`}>{cls.campus?.campusName}</div>
                  
                  {isSelected && (
                    <div className="mt-2 text-[10px] font-black border-t border-white/20 pt-2 w-full text-center animate-in fade-in">ĐANG CHỌN</div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-8 left-0 right-0 max-w-5xl mx-auto px-4 z-50">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-4 rounded-[3rem] border border-white/10 shadow-2xl flex items-center gap-4">
           <div className="px-6 border-r border-white/10 hidden md:block">
              <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Đã chọn</span>
              <span className="text-xl font-black text-white">{selectedClassIds.length} lớp</span>
           </div>

           <button onClick={handleDispatch} disabled={isLoading || selectedClassIds.length === 0}
             className="flex-1 text-white font-black shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-20 active:scale-95 text-xs font-semibold">
             {isLoading ? "ĐANG XỬ LÝ..." : `PHÁT HÀNH (${selectedClassIds.length})`}
           </button>
           
           <button onClick={handleRevoke} disabled={isLoading || selectedClassIds.length === 0}
             className="flex-1 text-white font-black shadow-lg hover:bg-rose-700 transition-all disabled:opacity-20 active:scale-95 text-xs font-semibold">
             {isLoading ? "ĐANG XOÁ..." : `THU HỒI (${selectedClassIds.length})`}
           </button>
        </div>
      </div>
    </div>
  )
}
