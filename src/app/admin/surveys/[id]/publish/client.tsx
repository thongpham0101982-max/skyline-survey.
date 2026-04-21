"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { dispatchSurveyAction, revokeSurveyAction, applyEmergencyDbFix } from "./actions"

const AUDIENCE_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PHHS: { label: "Phụ huynh học sinh", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  HocSinh: { label: "Học sinh", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  GiaoVien: { label: "Giáo viên", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
}

export default function PublishSurveyClient({ initialSurvey, classes }: any) {
  const [mounted, setMounted] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error" | "migrate"; message: string } | null>(null)
  const [activeCampusId, setActiveCampusId] = useState<string | "all">("all")

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
    if (activeCampusId === "all") return classes
    return classes.filter((cls: any) => cls.campus?.id === activeCampusId)
  }, [classes, activeCampusId])

  const handleDispatch = async () => {
    if (selectedClassIds.length === 0) return
    setIsLoading(true); setResult(null)
    const res: any = await dispatchSurveyAction(survey.id, selectedClassIds)
    if (res?.error === "DATABASE_MIGRATION_REQUIRED") {
      setResult({ type: "migrate", message: "⚠️ DATABASE CẦU CẬP NHẬT: Vui lòng nhấn nút sửa lỗi bên phải." })
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

  if (!mounted) return <div className="p-20 text-center text-slate-400 font-bold">Đang tải...</div>

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 px-4 mt-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/surveys" className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">←</Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Quản lý Phát hành & Thu hồi</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{survey.name} • {aud.label}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
           <div className="bg-slate-100 rounded-xl px-4 py-2 text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Tổng số lớp</span>
              <span className="text-sm font-black text-slate-700">{classes.length}</span>
           </div>
           <div className="bg-emerald-50 rounded-xl px-4 py-2 text-center border border-emerald-100">
              <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-wider mb-1">Đã gán</span>
              <span className="text-sm font-black text-emerald-700">{classes.filter((c:any) => c._count.surveyForms > 0).length}</span>
           </div>
           <div className="bg-rose-50 rounded-xl px-4 py-2 text-center border border-rose-100">
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

      {/* Campus Selector Tabs */}
      <div className="bg-white/50 p-2 rounded-[2.5rem] border border-slate-200 flex flex-wrap gap-2">
        <button onClick={() => setActiveCampusId("all")} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}>
          Tất cả {classes.length} lớp
        </button>
        {campuses.map(c => (
          <button key={c.id} onClick={() => setActiveCampusId(c.id)} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === c.id ? "bg-[#BE1E2E] text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}>
            {c.name} ({classes.filter((cl: any) => cl.campus?.id === c.id).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 min-h-[400px] shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredClasses.map((cls: any) => {
            const isAssigned = cls._count.surveyForms > 0;
            const isSelected = selectedClassIds.includes(cls.id);
            return (
              <button key={cls.id} onClick={() => setSelectedClassIds(p => p.includes(cls.id) ? p.filter(x => x !== cls.id) : [...p, cls.id])}
                className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center ${
                  isSelected ? "bg-slate-900 border-slate-900 text-white translate-y-[-4px] shadow-2xl" : 
                  isAssigned ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                  "bg-slate-50/30 border-slate-100 text-slate-600 hover:border-slate-300"
                }`}>
                
                {isAssigned && !isSelected && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase">ĐÃ GÁN</div>
                )}
                
                <div className="text-sm font-black mb-1 text-center">{cls.className}</div>
                <div className={`text-[10px] font-bold opacity-40 uppercase tracking-widest`}>{cls.campus?.campusName}</div>
                
                {isSelected && (
                  <div className="mt-2 text-[10px] font-black border-t border-white/20 pt-2 w-full text-center animate-in fade-in">ĐANG CHỌN</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-8 left-0 right-0 max-w-5xl mx-auto px-4 z-50">
        <div className="bg-slate-900/90 backdrop-blur-2xl p-4 rounded-[3rem] border border-white/10 shadow-2xl flex items-center gap-4">
           <div className="px-6 border-r border-white/10 hidden md:block">
              <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Đã chọn</span>
              <span className="text-xl font-black text-white">{selectedClassIds.length} lớp</span>
           </div>

           <button onClick={handleDispatch} disabled={isLoading || selectedClassIds.length === 0}
             className="flex-1 py-4 rounded-[2rem] bg-emerald-500 text-white font-black shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-20 active:scale-95">
             {isLoading ? "ĐANG XỬ LÝ..." : `PHÁT HÀNH (${selectedClassIds.length})`}
           </button>
           
           <button onClick={handleRevoke} disabled={isLoading || selectedClassIds.length === 0}
             className="flex-1 py-4 rounded-[2rem] bg-rose-600 text-white font-black shadow-lg hover:bg-rose-700 transition-all disabled:opacity-20 active:scale-95">
             {isLoading ? "ĐANG XOÁ..." : `THU HỒI (${selectedClassIds.length})`}
           </button>
        </div>
      </div>
    </div>
  )
}