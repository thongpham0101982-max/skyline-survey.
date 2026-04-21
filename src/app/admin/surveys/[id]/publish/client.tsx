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
  
  // New: State for campus filtering
  const [activeCampusId, setActiveCampusId] = useState<string | "all">("all")

  useEffect(() => { setMounted(true) }, [])

  const survey = initialSurvey
  const aud = useMemo(() => {
    const val = (survey?.targetAudience || "PHHS").toLowerCase()
    if (val.includes("hocsinh") || val.includes("sinh")) return AUDIENCE_MAP.HocSinh
    if (val.includes("giaovien") || val.includes("vien")) return AUDIENCE_MAP.GiaoVien
    return AUDIENCE_MAP.PHHS
  }, [survey])

  // Group classes by campus
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
    try {
      const res: any = await dispatchSurveyAction(survey.id, selectedClassIds)
      if (res?.error === "DATABASE_MIGRATION_REQUIRED") {
        setResult({ type: "migrate", message: "⚠️ DATABASE CỦA BẠN ĐANG CŨ: Cần cập nhật cấu trúc bảng để hỗ trợ khảo sát học sinh." })
      } else if (res?.error) {
        setResult({ type: "error", message: res.error })
      } else {
        setResult({ 
          type: "success", 
          message: `✅ PHÁT HÀNH THÀNH CÔNG: Đã phát hành cho ${res.classCount} lớp, tổng cộng ${res.totalParticipants} học sinh tham gia khảo sát.` 
        })
      }
    } catch (e: any) { setResult({ type: "error", message: e.message }) }
    setIsLoading(false)
  }

  const handleFixDb = async () => {
    setIsLoading(true)
    const res: any = await applyEmergencyDbFix()
    if (res.error) setResult({ type: "error", message: res.error })
    else setResult({ type: "success", message: res.message! })
    setIsLoading(false)
  }

  if (!mounted) return <div className="p-20 text-center text-slate-400 font-bold">Đang tải...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-32 px-4 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/surveys" className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">←</Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">Phát hành Khảo Sát</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{survey.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-slate-200">
          <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase block leading-none mb-1">Đối tượng</span>
            <span className={`text-xs font-black ${aud.color}`}>{aud.label}</span>
          </div>
          <div className="px-4 py-2 bg-[#BE1E2E] rounded-xl shadow-lg border border-[#BE1E2E]">
            <span className="text-[10px] font-black text-white/60 uppercase block leading-none mb-1">Đang chọn</span>
            <span className="text-xs font-black text-white">{selectedClassIds.length} lớp</span>
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
                <span className="text-2xl">{result.type === "success" ? "🎉" : "⚠️"}</span>
                <span className="font-black leading-tight">{result.message}</span>
              </div>
              {result.type === "migrate" ? (
                <button onClick={handleFixDb} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95 flex-shrink-0">
                  {isLoading ? "ĐANG FIX..." : "SỬA DATABASE NGAY"}
                </button>
              ) : (
                <button onClick={() => setResult(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors opacity-40">✕</button>
              )}
           </div>
        </div>
      )}

      {/* Campus Selector Tabs */}
      <div className="bg-white/50 p-2 rounded-[2.5rem] border border-slate-200 flex flex-wrap gap-2">
        <button 
          onClick={() => setActiveCampusId("all")}
          className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === "all" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"}`}
        >
          Tất cả cơ sở ({classes.length})
        </button>
        {campuses.map(c => (
          <button 
            key={c.id}
            onClick={() => setActiveCampusId(c.id)}
            className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${activeCampusId === c.id ? "bg-[#BE1E2E] text-white shadow-lg" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"}`}
          >
            {c.name} ({classes.filter((cl: any) => cl.campus?.id === c.id).length})
          </button>
        ))}
      </div>

      {/* Selector Container */}
      <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 min-h-[400px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls: any) => (
              <button 
                key={cls.id} 
                onClick={() => setSelectedClassIds(prev => prev.includes(cls.id) ? prev.filter(x => x !== cls.id) : [...prev, cls.id])}
                className={`group relative p-5 rounded-3xl border-2 transition-all duration-300 ${
                  selectedClassIds.includes(cls.id) 
                  ? "bg-[#BE1E2E] border-[#BE1E2E] text-white shadow-xl scale-95" 
                  : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {selectedClassIds.includes(cls.id) && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-[#BE1E2E] animate-in zoom-in">
                    <span className="text-[#BE1E2E] text-[10px] font-black">✓</span>
                  </div>
                )}
                <div className="text-sm font-black mb-1 group-hover:scale-105 transition-transform">{cls.className}</div>
                <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedClassIds.includes(cls.id) ? "text-white/60" : "text-slate-400"}`}>
                  {cls.campus?.campusName || "No Camp"}
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
               <div className="text-4xl mb-4 opacity-20">📂</div>
               <div className="text-slate-400 font-bold">Không tìm thấy lớp học ở cơ sở này.</div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 max-w-6xl mx-auto px-4 z-50">
        <div className="bg-white/80 backdrop-blur-xl p-3 rounded-[3rem] border border-white shadow-2xl flex items-center gap-4">
           <button 
             onClick={() => setSelectedClassIds(filteredClasses.every((c: any) => selectedClassIds.includes(c.id)) ? selectedClassIds.filter(id => !filteredClasses.some((c: any) => c.id === id)) : Array.from(new Set([...selectedClassIds, ...filteredClasses.map((c: any) => c.id)])))}
             className="px-6 py-4 rounded-[2rem] bg-slate-100 text-slate-600 font-black text-xs hover:bg-slate-200 transition-colors whitespace-nowrap"
           >
             {filteredClasses.every((c: any) => selectedClassIds.includes(c.id)) ? "BỎ CHỌN NHÓM NÀY" : "CHỌN TẤT CẢ NHÓM NÀY"}
           </button>
           
           <button 
             onClick={handleDispatch} 
             disabled={isLoading || selectedClassIds.length === 0}
             className="flex-1 py-4 rounded-[2rem] bg-[#BE1E2E] text-white font-black shadow-xl shadow-[#BE1E2E]/20 hover:bg-[#A01927] transition-all disabled:bg-slate-200 disabled:shadow-none active:scale-95 group"
           >
             <span className="flex items-center justify-center gap-2">
               {isLoading ? (
                 <span className="flex gap-1">
                   <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                   <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                   <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                 </span>
               ) : (
                 <>
                   XÁC NHẬN PHÁT HÀNH CHO {selectedClassIds.length} LỚP ĐÃ CHỌN
                   <span className="text-xl group-hover:translate-x-1 transition-transform">🚀</span>
                 </>
               )}
             </span>
           </button>
        </div>
      </div>
    </div>
  )
}