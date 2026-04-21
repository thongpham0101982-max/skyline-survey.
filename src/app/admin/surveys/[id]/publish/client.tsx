"use client"
import { useState, useMemo, useEffect } from "react"
import {
  Send, RotateCcw, CheckCircle2, Clock, Users, GraduationCap,
  UserCheck, Layers, ChevronDown, ChevronRight, Search,
  AlertCircle, Info, ArrowLeft, CheckSquare, Square, Building2,
  Loader2, X
} from "lucide-react"
import Link from "next/link"
import { dispatchSurveyAction, revokeSurveyAction } from "./actions"

const AUDIENCE_MAP: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  PHHS: { label: "Phụ huynh học sinh", icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  HocSinh: { label: "Học sinh", icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  GiaoVien: { label: "Giáo viên", icon: UserCheck, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
}

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
    const val = survey?.targetAudience || "PHHS"
    // Normalize targetAudience match
    const match = Object.keys(AUDIENCE_MAP).find(k => k.toLowerCase() === val.toLowerCase())
    return match ? AUDIENCE_MAP[match] : AUDIENCE_MAP.PHHS
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
    if (selectedClassIds.length === 0) { setResult({ type: "error", message: "Vui lòng chọn ít nhất một lớp để phát hành." }); return }
    setIsLoading(true); setResult(null)
    try {
      const res: any = await dispatchSurveyAction(survey.id, selectedClassIds)
      if (res?.error) setResult({ type: "error", message: res.error })
      else setResult({ type: "success", message: `✅ Đã phát hành ${res.created} phiếu. ${res.alreadyExisted > 0 ? `${res.alreadyExisted} phiếu đã tồn tại.` : ""} ${res.missingRequirementCount > 0 ? `${res.missingRequirementCount} HS chưa có PH.` : ""}` })
    } catch (e: any) { setResult({ type: "error", message: e?.message || "Lỗi hệ thống!" }) }
    setIsLoading(false)
  }

  const handleRevoke = async () => {
    if (selectedClassIds.length === 0) { setResult({ type: "error", message: "Vui lòng chọn lớp để thu hồi." }); return }
    if (!confirm(`Thu hồi phiếu PENDING của ${selectedClassIds.length} lớp?`)) return
    setIsLoading(true); setResult(null)
    try {
      const res: any = await revokeSurveyAction(survey.id, selectedClassIds)
      if (res?.success) setResult({ type: "revoke", message: `🔙 Đã thu hồi ${res.count} phiếu.` })
    } catch (e: any) { setResult({ type: "error", message: e?.message || "Lỗi hệ thống!" }) }
    setIsLoading(false)
  }

  const fmt = (d: string) => {
    if (!mounted) return "" // Don't render dates on server to avoid hydration mismatch
    try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) }
    catch (e) { return String(d) }
  }

  if (!survey) return <div className="p-10 text-center">Đang tải...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Link href="/admin/surveys" className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Phát hành Khảo Sát</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">Chọn lớp để phân bổ phiếu khảo sát</p>
        </div>
      </div>

      {/* Info Card */}
      <div className={`bg-white border ${aud.border} rounded-3xl p-6 shadow-sm`}>
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-2xl ${aud.bg} flex-shrink-0`}>
            <aud.icon className={`w-7 h-7 ${aud.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{survey.code}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${aud.bg} ${aud.color} ${aud.border} uppercase`}>{aud.label}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${survey.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"} uppercase`}>
                {survey.isActive ? "Đang hoạt động" : "Bản nháp"}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 break-words">{survey.name}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500 font-bold">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{fmt(survey.startDate)} - {fmt(survey.endDate)}</span>
              <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />{survey.academicYear?.name || "N/A"}</span>
              {survey.campus && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{survey.campus.campusName}</span>}
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-semibold border ${result.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : result.type === "revoke" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-600 border-red-100"}`}>
          {result.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <span className="flex-1">{result.message}</span>
          <button onClick={() => setResult(null)} className="flex-shrink-0 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Class List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Chọn Lớp Phát Hành</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Đã chọn <span className="text-[#BE1E2E] font-black">{selectedClassIds.length}</span> / {classes?.length || 0} lớp</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Tìm lớp..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <button onClick={toggleAll} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 whitespace-nowrap">
              {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {isAllSelected ? "Bỏ tất cả" : "Chọn tất cả"}
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {!mounted ? (
             <div className="py-20 text-center text-slate-300">Đang chuẩn bị...</div>
          ) : campusGroups.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Không tìm thấy lớp nào</p>
            </div>
          ) : (
            campusGroups.map((group: any) => {
              const campusName = group.campus?.campusName || "Chưa phân cơ sở"
              const campusIds = group.classes.map((c: any) => c.id)
              const campusSelected = campusIds.filter((id: string) => selectedClassIds.includes(id)).length
              const campusAllSelected = campusSelected === campusIds.length
              const isExpanded = expandedCampus === group.key || campusGroups.length === 1 || !!searchQuery
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-3 px-6 py-3.5 bg-slate-50/70 hover:bg-slate-100 cursor-pointer" onClick={() => setExpandedCampus(isExpanded ? null : group.key)}>
                    <button onClick={e => { e.stopPropagation(); toggleCampusAll(group) }} className="flex-shrink-0">
                      {campusAllSelected ? <CheckSquare className="w-4 h-4 text-[#BE1E2E]" /> : campusSelected > 0 ? <div className="w-4 h-4 border-2 border-[#BE1E2E] rounded bg-red-50 flex items-center justify-center"><div className="w-2 h-2 bg-[#BE1E2E] rounded-sm" /></div> : <Square className="w-4 h-4 text-slate-300" />}
                    </button>
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-bold text-slate-700 text-sm flex-1">{campusName}</span>
                    <span className="text-[11px] font-bold text-slate-400">{campusSelected}/{campusIds.length} lớp</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                  {isExpanded && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-6 py-4">
                      {group.classes.map((cls: any) => {
                        const sel = selectedClassIds.includes(cls.id)
                        return (
                          <button key={cls.id} onClick={() => toggleClass(cls.id)}
                            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm font-bold transition-all text-left ${sel ? "bg-[#BE1E2E] border-[#BE1E2E] text-white shadow-md shadow-red-100" : "bg-white border-slate-200 text-slate-700 hover:border-[#BE1E2E] hover:text-[#BE1E2E]"}`}>
                            {sel ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <Layers className="w-4 h-4 flex-shrink-0 opacity-40" />}
                            <span className="truncate">{cls.className}</span>
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

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4">
        <button onClick={handleRevoke} disabled={isLoading || selectedClassIds.length === 0}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all border-2 ${selectedClassIds.length === 0 ? "border-slate-200 bg-white text-slate-300 cursor-not-allowed" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-md"}`}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
          Thu hồi ({selectedClassIds.length} lớp)
        </button>
        <button onClick={handleDispatch} disabled={isLoading || selectedClassIds.length === 0}
          className={`flex-[2] flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${selectedClassIds.length === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-[#BE1E2E] hover:bg-[#a01927] text-white shadow-red-200 active:scale-[0.98]"}`}>
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          Phát hành cho {selectedClassIds.length} lớp đã chọn
        </button>
      </div>
    </div>
  )
}