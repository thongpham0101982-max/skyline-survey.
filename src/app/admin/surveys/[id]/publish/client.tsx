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

  useEffect(() => { setMounted(true) }, [])

  const survey = initialSurvey
  const aud = useMemo(() => {
    const val = (survey?.targetAudience || "PHHS").toLowerCase()
    if (val.includes("hocsinh") || val.includes("sinh")) return AUDIENCE_MAP.HocSinh
    if (val.includes("giaovien") || val.includes("vien")) return AUDIENCE_MAP.GiaoVien
    return AUDIENCE_MAP.PHHS
  }, [survey])

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
    const res = await applyEmergencyDbFix()
    if (res.error) setResult({ type: "error", message: res.error })
    else setResult({ type: "success", message: res.message! })
    setIsLoading(false)
  }

  if (!mounted) return <div className="p-20 text-center text-slate-400 font-bold">Đang tải...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/surveys" className="p-2.5 rounded-xl bg-white border border-slate-200">←</Link>
        <h1 className="text-2xl font-black text-slate-900">Phát hành Khảo Sát</h1>
      </div>

      {result && (
        <div className={`p-6 rounded-[2rem] border-2 ${result.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : result.type === "migrate" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-red-50 border-red-200 text-red-800"}`}>
           <div className="flex items-center justify-between">
              <span className="font-black">{result.message}</span>
              {result.type === "migrate" ? (
                <button onClick={handleFixDb} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">
                  {isLoading ? "ĐANG FIX..." : "BẤM VÀO ĐÂY ĐỂ TỰ ĐỘNG SỬA DATABASE"}
                </button>
              ) : (
                <button onClick={() => setResult(null)} className="opacity-40">[x]</button>
              )}
           </div>
        </div>
      )}

      {/* Simplified UI for fast deployment */}
      <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8">
        <h2 className="text-xl font-black mb-4">{survey.name}</h2>
        <div className="flex gap-4 items-center">
            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold">{aud.label}</span>
            <span className="text-xs text-slate-400 font-bold">Lớp đang chọn: {selectedClassIds.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-8 rounded-[2.5rem] border-2">
        {classes?.map((cls: any) => (
          <button key={cls.id} onClick={() => setSelectedClassIds(prev => prev.includes(cls.id) ? prev.filter(x => x !== cls.id) : [...prev, cls.id])}
            className={`p-4 rounded-2xl border-2 text-xs font-black transition-all ${selectedClassIds.includes(cls.id) ? "bg-[#BE1E2E] border-[#BE1E2E] text-white" : "bg-white border-slate-100"}`}>
            {cls.className}
          </button>
        ))}
      </div>

      <div className="fixed bottom-4 left-0 right-0 max-w-4xl mx-auto px-4">
        <button onClick={handleDispatch} disabled={isLoading || selectedClassIds.length === 0}
          className="w-full py-5 rounded-[2rem] bg-[#BE1E2E] text-white font-black shadow-2xl active:scale-95 disabled:bg-slate-300">
          {isLoading ? "ĐANG TIẾN HÀNH..." : `XÁC NHẬN PHÁT HÀNH CHO ${selectedClassIds.length} LỚP`}
        </button>
      </div>
    </div>
  )
}