"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { dispatchSurveyAction, revokeSurveyAction } from "./actions"

const AUDIENCE_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PHHS: { label: "Phụ huynh học sinh", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  HocSinh: { label: "Học sinh", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  GiaoVien: { label: "Giáo viên", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
}

// Minimalist fallback icons to avoid lucide-react resolution errors in production
const IconS = () => <span className="text-lg">🏫</span>
const IconP = () => <span className="text-lg">👥</span> 
const IconT = () => <span className="text-lg">👨‍🏫</span>

export default function PublishSurveyClient({ initialSurvey, classes }: any) {
  const [mounted, setMounted] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCampus, setExpandedCampus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error" | "revoke"; message: string } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const survey = initialSurvey
  const aud = useMemo(() => {
    const val = (survey?.targetAudience || "PHHS").toLowerCase()
    if (val.includes("hocsinh") || val.includes("sinh")) return AUDIENCE_MAP.HocSinh
    if (val.includes("giaovien") || val.includes("vien")) return AUDIENCE_MAP.GiaoVien
    return AUDIENCE_MAP.PHHS
  }, [survey])

  const campusGroups = useMemo(() => {
    if (!classes) return []
    const filtered = classes.filter((c: any) =>
      (c.className || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.classCode || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    const groups = new Map<string, { campus: any; classes: any[] }>()
    for (const cls of filtered) {
      const key = cls.campusId || "none"
      if (!groups.has(key)) groups.set(key, { campus: cls.campus, classes: [] })
      groups.get(key)!.classes.push(cls)
    }
    return Array.from(groups.entries()).map(([key, val]) => ({ key, ...val }))
  }, [classes, searchQuery])

  const allFilteredIds = useMemo(() => campusGroups.flatMap((g: any) => g.classes.map((c: any) => c.id)), [campusGroups])
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id: string) => selectedClassIds.includes(id))

  const toggleAll = () => {
    if (isAllSelected) setSelectedClassIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    else setSelectedClassIds(prev => Array.from(new Set([...prev, ...allFilteredIds])))
  }

  const toggleClass = (id: string) =>
    setSelectedClassIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleCampusAll = (group: any) => {
    const ids = group.classes.map((c: any) => c.id)
    const all = ids.every((id: string) => selectedClassIds.includes(id))
    if (all) setSelectedClassIds(prev => prev.filter(id => !ids.includes(id)))
    else setSelectedClassIds(prev => Array.from(new Set([...prev, ...ids])))
  }

  const handleDispatch = async () => {
    if (selectedClassIds.length === 0) return
    setIsLoading(true); setResult(null)
    try {
      const res: any = await dispatchSurveyAction(survey.id, selectedClassIds)
      if (res?.error) {
        setResult({ type: "error", message: res.error })
      } else {
        setResult({ 
          type: "success", 
          message: `✅ Đã phát hành thành công cho ${res.classCount} lớp, tổng cộng ${res.created} phiếu khảo sát. ${res.missingRequirementCount > 0 ? `(${res.missingRequirementCount} học sinh chưa có thông tin PHHS)` : ""}` 
        })
      }
    } catch (e: any) { 
      setResult({ type: "error", message: "Đã có lỗi xảy ra khi phát hành." }) 
    }
    setIsLoading(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleRevoke = async () => {
    if (selectedClassIds.length === 0) return
    if (!confirm(`Thu hồi phiếu chờ xử lý của ${selectedClassIds.length} lớp?`)) return
    setIsLoading(true); setResult(null)
    try {
      const res: any = await revokeSurveyAction(survey.id, selectedClassIds)
      if (res?.success) {
        setResult({ type: "revoke", message: `🔙 Đã thu hồi thành công phiếu của ${res.classCount} lớp (tổng ${res.count} phiếu).` })
      }
    } catch (e: any) { 
      setResult({ type: "error", message: "Đã có lỗi xảy ra khi thu hồi." }) 
    }
    setIsLoading(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (!mounted) return <div className="p-20 text-center text-slate-400 font-bold">Đang tải dữ liệu...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/admin/surveys" className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-slate-500">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Phát hành Khảo Sát</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Chọn lớp để phân bổ phiếu khảo sát</p>
        </div>
      </div>

      {result && (
        <div className={`p-5 rounded-2xl text-sm font-bold border-2 animate-in slide-in-from-top-4 duration-300 ${result.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : result.type === "revoke" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"}`}>
           <div className="flex items-center justify-between gap-4">
              <span className="flex-1">{result.message}</span>
              <button onClick={() => setResult(null)} className="opacity-40 hover:opacity-100 italic">ẩn [x]</button>
           </div>
        </div>
      )}

      <div className={`bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm`}>
        <div className="flex items-start gap-6">
          <div className={`p-5 rounded-[1.5rem] ${aud.bg} flex-shrink-0`}>
             {survey?.targetAudience === "HocSinh" ? <IconS /> : <IconP />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 uppercase tracking-wider">{survey.code}</span>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${aud.bg} ${aud.color} ${aud.border} uppercase`}>{aud.label}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 break-words mb-3">{survey.name}</h2>
            <div className="flex flex-wrap gap-5 text-sm text-slate-500 font-bold">
               <span>📅 {new Date(survey.startDate).toLocaleDateString("vi-VN")} - {new Date(survey.endDate).toLocaleDateString("vi-VN")}</span>
               <span>🎓 {survey.academicYear?.name || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Chọn Lớp Phát Hành</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Đã chọn <span className="text-[#BE1E2E] text-sm">{selectedClassIds.length}</span> / {classes?.length || 0} lớp</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input type="text" placeholder="Tìm lớp..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-64 px-4 py-2.5 text-sm bg-white rounded-xl border-2 border-slate-200 outline-none focus:border-slate-400 transition-all" />
            <button onClick={toggleAll} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[11px] font-black text-slate-700 whitespace-nowrap transition-colors uppercase">
              {isAllSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {campusGroups.length === 0 ? (
            <div className="py-20 text-center text-slate-300 font-bold italic">Không tìm thấy lớp nào</div>
          ) : (
            campusGroups.map((group: any) => {
              const campusName = group.campus?.campusName || "Cơ sở khác"
              const campusIds = group.classes.map((c: any) => c.id)
              const campusSelected = campusIds.filter((id: string) => selectedClassIds.includes(id)).length
              const campusAllSelected = campusSelected === campusIds.length
              const isExpanded = expandedCampus === group.key || campusGroups.length === 1 || !!searchQuery
              
              return (
                <div key={group.key} className="bg-white">
                  <div className="flex items-center gap-3 px-8 py-4 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setExpandedCampus(isExpanded ? null : group.key)}>
                    <input type="checkbox" checked={campusAllSelected} onChange={() => toggleCampusAll(group)} onClick={e => e.stopPropagation()} className="w-5 h-5 rounded accent-[#BE1E2E]" />
                    <span className="font-black text-slate-800 text-sm flex-1">{campusName}</span>
                    <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{campusSelected}/{campusIds.length} lớp</span>
                    <span className="text-slate-300 ml-2">{isExpanded ? "▼" : "▶"}</span>
                  </div>
                  {isExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 p-8 pt-2 bg-slate-50/30">
                      {group.classes.map((cls: any) => {
                        const sel = selectedClassIds.includes(cls.id)
                        return (
                          <button key={cls.id} onClick={() => toggleClass(cls.id)}
                            className={`flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 text-xs font-black transition-all ${sel ? "bg-[#BE1E2E] border-[#BE1E2E] text-white shadow-lg shadow-red-100" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"}`}>
                            <span className="truncate">{cls.className}</span>
                            {sel && <span>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sticky bottom-4 z-40 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] border-2 border-white shadow-2xl">
        <button onClick={handleRevoke} disabled={isLoading || selectedClassIds.length === 0}
          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedClassIds.length === 0 ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed" : "bg-white border-amber-400 text-amber-600 hover:bg-amber-50"}`}>
          {isLoading ? "Đang xử lý..." : `THU HỒI (${selectedClassIds.length} lớp)`}
        </button>
        <button onClick={handleDispatch} disabled={isLoading || selectedClassIds.length === 0}
          className={`flex-[2] py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-red-200 ${selectedClassIds.length === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-[#BE1E2E] hover:bg-[#a01927] text-white active:scale-95"}`}>
          {isLoading ? "ĐANG TIẾN HÀNH PHÁT HÀNH..." : `PHÁT HÀNH CHO ${selectedClassIds.length} LỚP ĐÃ CHỌN`}
        </button>
      </div>

      <style jsx global>{`
         .animate-in { animation: fadeIn 0.5s ease-out forwards; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}