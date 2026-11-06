"use client"

import React, { useState } from "react"
import {
  CheckCircle2,
  Printer,
  Sparkles,
  UserCheck,
  HeartHandshake,
  Send,
  Calendar,
  Target,
  PlusCircle,
  AlertTriangle
} from "lucide-react"
import {
  DISC_STYLE_TABLE,
  EPI_TEMPERAMENT_PROFILES,
  LYUSIN_EQ_SCALES,
  MBTI_PROFILES,
  OFFICIAL_DISCLAIMER_VI,
  RIASEC_PROFILES,
  type SklPsychTestCode,
  type RiasecCode
} from "@/lib/advisory/skl-psych-suite"

interface SklPsychReportViewerProps {
  assessment: any
  viewerRole: "STUDENT" | "PARENT" | "TEACHER" | "ADMIN"
  orientationGoals?: any[]
  onUpdated?: (updatedAssessment: any) => void
}

export default function SklPsychReportViewer({
  assessment,
  viewerRole,
  orientationGoals = [],
  onUpdated
}: SklPsychReportViewerProps) {
  const [showAllMbti, setShowAllMbti] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState("")

  // Student states
  const [reflectionText, setReflectionText] = useState(assessment?.studentReflection || "")
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(
    Array.isArray(assessment?.linkedGoalIds) ? assessment.linkedGoalIds : []
  )
  const [newGoalContent, setNewGoalContent] = useState("")
  const [newGoalAction, setNewGoalAction] = useState("")
  const [consultTopic, setConsultTopic] = useState(assessment?.consultationRequestTopic || "")
  const [consultNote, setConsultNote] = useState(assessment?.consultationRequestNote || "")

  // Teacher states
  const [advisorNote, setAdvisorNote] = useState(assessment?.advisorReviewNote || "")
  const [consultStatus, setConsultStatus] = useState(
    assessment?.consultationRequestStatus || "NONE"
  )
  const [scheduledDate, setScheduledDate] = useState(
    assessment?.consultationScheduledDate || ""
  )
  const [publishParent, setPublishParent] = useState(
    Boolean(assessment?.isPublishedToParent ?? true)
  )

  // Parent states
  const [parentFeedbackText, setParentFeedbackText] = useState(assessment?.parentFeedback || "")

  if (!assessment) return null

  const testCode = (assessment.testCode || "HOLLAND") as SklPsychTestCode
  const scoresSummary = assessment.scoresSummary || {}
  const profileAnalysis = assessment.profileAnalysis || {}

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(""), 4000)
  }

  const handlePatch = async (payload: Record<string, any>, successMsg: string) => {
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/psych-suite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assessment.id,
          ...payload
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.assessment) {
        showToast(successMsg)
        onUpdated?.(json.assessment)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // 1. HOLLAND SECTION
  // ---------------------------------------------------------------------------
  const renderHolland = () => {
    const hData = scoresSummary.HOLLAND || {
      scores: assessment.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
      maxScorePerGroup: 18,
      top3: (assessment.top3 || []).map((t: any) => t.code || t),
      top3Code: assessment.primaryResultCode || assessment.hollandCode || "RIA"
    }
    const scores = hData.scores || {}
    const maxScore = hData.maxScorePerGroup || 18
    const groupsOrder: RiasecCode[] = ["R", "I", "A", "S", "E", "C"]
    const sortedOrder = [...groupsOrder].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
    const top3: RiasecCode[] =
      Array.isArray(hData.top3) && hData.top3.length > 0
        ? hData.top3
        : sortedOrder.slice(0, 3)
    const top3Code = hData.top3Code || assessment.primaryResultCode || top3.join("")
    const tieNotice = profileAnalysis.tieNotice ?? hData.tieNotice ?? null
    const subjectCombs: string[] = profileAnalysis.skylineSubjectCombinations || []

    return (
      <div className="space-y-5">
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-200/80">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
                Mã Holland 3 Chữ Cái Chủ Đạo
              </span>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <span className="text-2xl md:text-3xl font-black tracking-wider text-amber-700 font-mono bg-white px-4 py-1.5 rounded-xl border border-amber-300 shadow-xs">
                  {top3Code}
                </span>
                <div className="text-xs text-slate-700 space-y-0.5">
                  {top3.slice(0, 4).map((c, idx) => {
                    const meta = RIASEC_PROFILES[c]
                    return (
                      <div key={c} className="font-semibold">
                        #{idx + 1}:{" "}
                        <span className="font-bold text-amber-900">{meta?.nameVi || c}</span> (
                        {c} = {scores[c] ?? 0}/{maxScore} điểm)
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="bg-white/90 border border-amber-200 rounded-xl p-3 text-xs text-slate-600 max-w-xs">
              <span className="font-bold text-amber-800 block mb-0.5">
                💡 Cơ sở tư vấn hướng nghiệp:
              </span>
              Mỗi nhóm có điểm tối đa là <strong>{maxScore} điểm</strong>. Cùng một mã chủ đạo
              nhưng điểm số từng nhóm càng cao thì nét tính cách nghề nghiệp của nhóm đó càng đậm
              nét.
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
              Điểm tổng kết 6 nhóm sở thích nghề nghiệp (Tối đa {maxScore} điểm/nhóm):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {groupsOrder.map(code => {
                const sc = scores[code] ?? 0
                const isTop = top3.includes(code)
                return (
                  <div
                    key={code}
                    className={`p-3 rounded-xl border text-center transition ${
                      isTop
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="text-xs font-bold opacity-85">Nhóm {code}</div>
                    <div className="text-lg font-black font-mono mt-0.5">
                      {code} = {sc}/{maxScore}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {tieNotice && (
          <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-50/80 to-teal-50/70 border border-amber-300/90 rounded-2xl text-xs md:text-sm text-amber-950 leading-relaxed shadow-xs flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">⚖️</span>
            <p className="font-medium">{tieNotice}</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Biểu Đồ Phân Bổ Điểm Số 6 Nhóm RIASEC
          </h4>
          <div className="space-y-3">
            {groupsOrder.map(code => {
              const sc = scores[code] ?? 0
              const pct = Math.round((sc / maxScore) * 100)
              const meta = RIASEC_PROFILES[code]
              const isTop = top3.includes(code)
              return (
                <div key={code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${isTop ? "text-amber-700" : "text-slate-700"}`}>
                      {code} – {meta?.nameVi} ({meta?.role}) {isTop && "★"}
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {sc}/{maxScore} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        meta?.color || "from-teal-500 to-emerald-600"
                      } transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">{meta?.summary}</p>
                </div>
              )
            })}
          </div>
        </div>

        {subjectCombs.length > 0 && (
          <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2">
              📚 Tổ hợp môn học THPT gợi ý tại Sky-Line
            </h4>
            <div className="flex flex-wrap gap-2">
              {subjectCombs.map((comb, idx) => (
                <span
                  key={idx}
                  className="text-xs font-bold bg-white text-teal-800 border border-teal-300 px-3 py-1 rounded-xl shadow-xs"
                >
                  {comb}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // 2. DISC SECTION
  // ---------------------------------------------------------------------------
  const renderDisc = () => {
    const dData = scoresSummary.DISC
    if (!dData || !dData.dimensions) return null
    const dims = dData.dimensions
    const primary: "D" | "I" | "S" | "C" = dData.primary || "D"
    const secondary: "D" | "I" | "S" | "C" = dData.secondary || "I"
    const pattern = dData.pattern || `${primary}${secondary}`
    const top2 = [primary, secondary]

    return (
      <div className="space-y-5">
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
              Mã Phong Cách Hành Vi Kết Hợp (2 Nhóm Cao Nhất)
            </span>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-3xl font-black font-mono text-rose-700 bg-white px-4 py-1.5 rounded-xl border border-rose-300 shadow-xs">
                {pattern}
              </span>
              <div className="text-xs text-slate-700 space-y-0.5">
                <div>
                  Nhóm chủ đạo #1:{" "}
                  <strong className="text-rose-900">
                    Nhóm {primary} – {DISC_STYLE_TABLE[primary]?.displayName}
                  </strong>
                </div>
                <div>
                  Nhóm kết hợp #2:{" "}
                  <strong className="text-rose-900">
                    Nhóm {secondary} – {DISC_STYLE_TABLE[secondary]?.displayName}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Biểu Đồ Điểm Số 4 Nhóm Hành Vi D - I - S - C
            </h4>
            <span className="text-[11px] text-slate-400">
              Điểm Giống nhất (Most) & Điểm ròng (Net = Giống nhất - Ít giống nhất)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {(["D", "I", "S", "C"] as const).map(k => {
              const meta = DISC_STYLE_TABLE[k]
              const sc = dims[k] || { most: 0, least: 0, net: 0 }
              const pct = Math.min(100, Math.round((sc.most / 28) * 100))
              return (
                <div
                  key={k}
                  className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    top2.includes(k)
                      ? `${meta.bgLight} ${meta.borderColor} shadow-xs`
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-slate-800">{meta.groupLabel}</span>
                      {k === primary && (
                        <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                          Cao nhất #1
                        </span>
                      )}
                      {k === secondary && (
                        <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                          Cao thứ #2
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-3">
                      {meta.displayName}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${meta.color}`}
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-emerald-700 font-bold">Giống nhất: {sc.most}</span>
                      <span className="text-rose-700">Ít giống: {sc.least}</span>
                    </div>
                    <div className="text-xs font-mono font-black text-slate-800 pt-0.5 border-t border-slate-200/60">
                      Điểm chuẩn (Net): {sc.net > 0 ? `+${sc.net}` : sc.net}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bảng Tham Chiếu Đặc Điểm 4 Nhóm Phong Cách DISC
            </h4>
            <span className="text-[11px] text-slate-500">
              Các hàng in đậm và đánh dấu ★ là 2 nhóm phong cách nổi trội nhất (
              <strong>{primary}</strong> & <strong>{secondary}</strong>)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 whitespace-nowrap">Nhóm</th>
                  <th className="p-3 whitespace-nowrap">Tên hiển thị</th>
                  <th className="p-3">Điểm mạnh khi học tập & làm dự án</th>
                  <th className="p-3">Vai trò phù hợp trong nhóm</th>
                  <th className="p-3">Điểm cần lưu ý để hoàn thiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(["D", "I", "S", "C"] as const).map(k => {
                  const meta = DISC_STYLE_TABLE[k]
                  const isP = k === primary
                  const isS = k === secondary
                  const isTop = isP || isS
                  return (
                    <tr
                      key={k}
                      className={
                        isP
                          ? "bg-rose-50/80 border-l-4 border-l-rose-500"
                          : isS
                          ? "bg-amber-50/75 border-l-4 border-l-amber-500"
                          : "bg-white hover:bg-slate-50"
                      }
                    >
                      <td className="p-3 whitespace-nowrap align-top">
                        <div className={`font-black ${isTop ? "text-slate-900" : "text-slate-700"}`}>
                          {meta.groupLabel} {isTop && <span className="text-amber-500">★</span>}
                        </div>
                        {isP && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full">
                            Chủ đạo #1
                          </span>
                        )}
                        {isS && (
                          <span className="inline-block mt-1 text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                            Kết hợp #2
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap align-top font-bold text-teal-800">
                        {meta.displayName}
                      </td>
                      <td className="p-3 leading-relaxed align-top text-slate-700">
                        {meta.academicStrengths}
                      </td>
                      <td className="p-3 leading-relaxed align-top text-slate-700">
                        {meta.teamRole}
                      </td>
                      <td className="p-3 leading-relaxed align-top text-slate-700">
                        {meta.improvementNote}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // 3. EPI SECTION
  // ---------------------------------------------------------------------------
  const renderEpi = () => {
    const eData = scoresSummary.EPI
    if (!eData) return null
    const eScore = Number(eData.e_score ?? 0)
    const nScore = Number(eData.n_score ?? 0)
    const lScore = Number(eData.l_score ?? 0)
    const isLieHigh = lScore >= 5

    const bars = [
      {
        key: "E",
        label: "Hướng ngoại (E)",
        score: eScore,
        max: 24,
        barClass: "from-teal-500 to-teal-600",
        statusClass: "text-teal-600",
        low: "Hướng nội (< 12)",
        high: "Hướng ngoại (≥ 12)",
        status: eScore >= 12 ? "Thiên hướng Hướng ngoại" : "Thiên hướng Hướng nội"
      },
      {
        key: "N",
        label: "Dễ kích động / Cảm xúc (N)",
        score: nScore,
        max: 24,
        barClass: "from-teal-600 to-blue-600",
        statusClass: "text-teal-800",
        low: "Ổn định (< 12)",
        high: "Dễ xúc động (≥ 12)",
        status: nScore >= 12 ? "Dễ xúc động / Nhạy cảm" : "Ổn định / Kiên định"
      },
      {
        key: "L",
        label: "Độ chân thật / Tính khách quan (L)",
        score: lScore,
        max: 9,
        barClass: isLieHigh ? "from-amber-500 to-amber-500" : "from-emerald-500 to-emerald-500",
        statusClass: isLieHigh ? "text-amber-600" : "text-emerald-600",
        low: "Khách quan (< 5)",
        high: "Cần lưu ý (≥ 5)",
        status: isLieHigh ? "Xu hướng chọn theo khuôn mẫu" : "Bài làm có độ tin cậy tốt"
      }
    ]

    return (
      <div className="space-y-5">
        {/* 4 Quadrants Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["Sanguine", "Choleric", "Phlegmatic", "Melancholic"] as const).map(temp => {
            const p = EPI_TEMPERAMENT_PROFILES[temp]
            const active = (eData.temperament || assessment.primaryResultCode) === temp
            return (
              <div
                key={temp}
                className={`p-3.5 rounded-2xl border transition ${
                  active
                    ? "bg-teal-600 text-white border-teal-600 shadow-md"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase opacity-80">{temp}</div>
                <div className="text-xs font-black mt-0.5">{p.vietnameseName}</div>
                {active && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    ★ Khí chất chủ đạo
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Chi tiết chỉ số đo lường Khí chất Eysenck (EPI)
          </h4>
          {bars.map(b => (
            <div key={b.key} className="space-y-1">
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-slate-600 font-medium">{b.label}</span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  {b.score} / {b.max}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${b.barClass}`}
                  style={{ width: `${Math.round((b.score / b.max) * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-x-2 text-[10px] text-slate-400 font-medium">
                <span>{b.low}</span>
                <span className={`font-bold ${b.statusClass}`}>{b.status}</span>
                <span>{b.high}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // 4. LYUSIN EQ SECTION
  // ---------------------------------------------------------------------------
  const renderLyusinEq = () => {
    const eqData = scoresSummary.LYUSIN_EQ
    if (!eqData) return null
    const compositeScales = eqData.compositeScales || {}
    const subScales = eqData.subScales || {}
    const rawDetail = Array.isArray(profileAnalysis.scalesDetail)
      ? profileAnalysis.scalesDetail
      : Array.isArray(eqData.scalesDetail)
      ? eqData.scalesDetail
      : []

    const scales = LYUSIN_EQ_SCALES.map(s => {
      const found =
        rawDetail.find((r: any) => r.code === s.code) ||
        compositeScales[s.code] ||
        subScales[s.code] ||
        {}
      const score = typeof found.score === "number" ? found.score : 0
      const pct = Math.min(100, Math.round((score / s.maxScore) * 100))
      return { ...s, score, percentage: pct }
    })

    const highlights: string[] = Array.isArray(profileAnalysis.highlights)
      ? profileAnalysis.highlights
      : []
    const developmentAreas: string[] = Array.isArray(profileAnalysis.developmentAreas)
      ? profileAnalysis.developmentAreas
      : []
    const totalScore = eqData.totalEI?.score ?? null
    const totalMax = eqData.totalEI?.maxScore ?? 138
    const totalPct =
      totalScore !== null ? Math.round((totalScore / totalMax) * 100) : null

    return (
      <div className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-800">
                Kết quả chi tiết 9 thang đo & tiểu thang đo Trí tuệ Cảm xúc (EQ)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bao gồm 4 thang đo tổng hợp (MEI, VEI, PE, UE) và 5 tiểu thang đo thành phần (MP,
                MU, VP, VU, VE)
              </p>
            </div>
            {totalScore !== null && totalPct !== null && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Tổng điểm EQ (EI)
                </span>
                <span className="text-sm font-black text-teal-700 font-mono">
                  {totalScore}/{totalMax} điểm ({totalPct}%)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3.5">
            {scales.map(s => (
              <div
                key={s.code}
                className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-mono text-xs font-black">
                      {s.code}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-slate-800">{s.nameVi}</span>
                  </div>
                  <div className="text-xs font-mono font-black text-slate-800">
                    {s.score} / {s.maxScore} điểm ({s.percentage}%)
                  </div>
                </div>
                <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      s.type === "COMPOSITE"
                        ? "from-teal-500 to-emerald-600"
                        : "from-sky-500 to-teal-500"
                    } transition-all duration-500`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌟</span> Điểm nổi bật
            </h4>
            <ul className="space-y-2">
              {highlights.map((h, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🌱</span> Khía cạnh có thể phát triển
            </h4>
            <ul className="space-y-2">
              {developmentAreas.map((d, i) => (
                <li
                  key={i}
                  className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-amber-600 font-bold shrink-0">→</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // 5. MBTI SECTION
  // ---------------------------------------------------------------------------
  const renderMbti = () => {
    const mData = scoresSummary.MBTI
    const code = String(mData?.code || assessment.primaryResultCode || "ENFP").toUpperCase()
    const prof = MBTI_PROFILES[code]
    const dims = mData?.dimensions
    if (!prof || !dims) return null

    const pairs = [
      {
        title: "Xu hướng năng lượng: Hướng ngoại (E) – Hướng nội (I)",
        leftLabel: "Hướng ngoại (E)",
        leftScore: Number(dims.EI?.E || 0),
        rightLabel: "Hướng nội (I)",
        rightScore: Number(dims.EI?.I || 0),
        colorLeft: "bg-[#003B3A]",
        colorRight: "bg-teal-600"
      },
      {
        title: "Tiếp nhận thông tin: Giác quan (S) – Trực giác (N)",
        leftLabel: "Giác quan (S)",
        leftScore: Number(dims.SN?.S || 0),
        rightLabel: "Trực giác (N)",
        rightScore: Number(dims.SN?.N || 0),
        colorLeft: "bg-sky-600",
        colorRight: "bg-[#003B3A]"
      },
      {
        title: "Ra quyết định: Lý trí (T) – Cảm xúc (F)",
        leftLabel: "Lý trí (T)",
        leftScore: Number(dims.TF?.T || 0),
        rightLabel: "Cảm xúc (F)",
        rightScore: Number(dims.TF?.F || 0),
        colorLeft: "bg-emerald-600",
        colorRight: "bg-rose-500"
      },
      {
        title: "Lối sống & Tổ chức: Nguyên tắc (J) – Linh hoạt (P)",
        leftLabel: "Nguyên tắc (J)",
        leftScore: Number(dims.JP?.J || 0),
        rightLabel: "Linh hoạt (P)",
        rightScore: Number(dims.JP?.P || 0),
        colorLeft: "bg-amber-600",
        colorRight: "bg-cyan-600"
      }
    ]

    return (
      <div className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Thanh Tỷ Lệ 4 Cặp Đối Cực Tính Cách MBTI
          </h4>
          <div className="space-y-4">
            {pairs.map((p, idx) => {
              const total = p.leftScore + p.rightScore || 1
              const leftPct = Math.round((p.leftScore / total) * 100)
              const rightPct = 100 - leftPct
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 text-center">{p.title}</div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">
                      {p.leftLabel}: {leftPct}% ({p.leftScore}/{total})
                    </span>
                    <span className="text-slate-800">
                      {p.rightLabel}: {rightPct}% ({p.rightScore}/{total})
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${p.colorLeft} transition-all duration-500`}
                      style={{ width: `${leftPct}%` }}
                    />
                    <div
                      className={`h-full ${p.colorRight} transition-all duration-500`}
                      style={{ width: `${rightPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-teal-200/70">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block">
                Chân Dung Tính Cách & Phương Pháp Học Tập
              </span>
              <h4 className="text-xl font-black text-slate-800 mt-0.5">
                {prof.code} – {prof.labelVi}
              </h4>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800">
              Nhóm {prof.temperamentCode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <strong className="text-teal-700 uppercase tracking-wider block">
                🌟 Điểm mạnh tự nhiên
              </strong>
              <p className="text-slate-700 leading-relaxed">{prof.naturalStrengths}</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <strong className="text-blue-700 uppercase tracking-wider block">
                📖 Phong cách học tập hiệu quả
              </strong>
              <p className="text-slate-700 leading-relaxed">{prof.learningStyle}</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <strong className="text-teal-800 uppercase tracking-wider block">
                🤝 Vai trò phù hợp trong nhóm
              </strong>
              <p className="text-slate-700 leading-relaxed">{prof.teamRole}</p>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <strong className="text-amber-700 uppercase tracking-wider block">
                🌱 Điểm cần lưu ý rèn luyện
              </strong>
              <p className="text-slate-700 leading-relaxed">{prof.growthNotes}</p>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-teal-200 space-y-1 text-xs">
            <strong className="text-teal-800 uppercase tracking-wider block">
              🎯 Nhóm lĩnh vực tham khảo
            </strong>
            <p className="text-slate-700 font-medium leading-relaxed">{prof.referenceFields}</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowAllMbti(v => !v)}
            className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left flex items-center justify-between text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            <span>📋 Xem bảng đối chiếu đầy đủ 16 nhóm tính cách MBTI (NT, NF, SJ, SP)</span>
            <span className="text-teal-600">{showAllMbti ? "Thu gọn ▲" : "Mở rộng ▼"}</span>
          </button>
          {showAllMbti && (
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Mã</th>
                    <th className="p-2.5">Tên hiển thị</th>
                    <th className="p-2.5">Điểm mạnh tự nhiên</th>
                    <th className="p-2.5">Phong cách học tập</th>
                    <th className="p-2.5">Vai trò nhóm</th>
                    <th className="p-2.5">Lĩnh vực tham khảo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(MBTI_PROFILES).map(item => {
                    const isCurrent = item.code === code
                    return (
                      <tr
                        key={item.code}
                        className={isCurrent ? "bg-teal-50/70" : "hover:bg-slate-50"}
                      >
                        <td className="p-2.5 font-mono font-black text-teal-800 whitespace-nowrap">
                          {item.code} {isCurrent && "★"}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800">{item.labelVi}</td>
                        <td className="p-2.5 text-slate-600">{item.naturalStrengths}</td>
                        <td className="p-2.5 text-slate-600">{item.learningStyle}</td>
                        <td className="p-2.5 text-slate-600">{item.teamRole}</td>
                        <td className="p-2.5 text-slate-600">{item.referenceFields}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 text-left">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Key Conclusion Banner */}
      <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Kết luận đặc trưng ({testCode}):
          </span>
          <div className="flex items-center gap-2">
            {assessment.lookupCode && (
              <span className="text-[11px] font-mono font-bold bg-white border border-teal-200 text-teal-800 px-2.5 py-0.5 rounded-lg">
                Mã tra cứu: {assessment.lookupCode}
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition print:hidden cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In báo cáo / PDF</span>
            </button>
          </div>
        </div>

        <div className="text-xl md:text-2xl font-black text-teal-900 mt-1.5 flex flex-wrap items-center gap-2">
          <span>{assessment.primaryResultLabel || assessment.primaryResultCode}</span>
          {testCode !== "LYUSIN_EQ" && assessment.primaryResultCode && (
            <span className="text-xs font-mono font-bold text-teal-700 bg-white border border-teal-200 px-2.5 py-0.5 rounded-lg">
              Mã: {assessment.primaryResultCode}
            </span>
          )}
        </div>

        {profileAnalysis.description && (
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed mt-2">
            {profileAnalysis.description}
          </p>
        )}
      </div>

      {/* Test-specific visual breakdown */}
      {testCode === "HOLLAND" && renderHolland()}
      {testCode === "DISC" && renderDisc()}
      {testCode === "EPI" && renderEpi()}
      {testCode === "LYUSIN_EQ" && renderLyusinEq()}
      {testCode === "MBTI" && renderMbti()}

      {/* Strengths & Career Suggestions for EPI & HOLLAND */}
      {(testCode === "EPI" || testCode === "HOLLAND") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(profileAnalysis.strengths) && profileAnalysis.strengths.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                💪 Điểm mạnh & Năng lực nổi trội
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {profileAnalysis.strengths.map((s: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(profileAnalysis.suggestedCareers) &&
            profileAnalysis.suggestedCareers.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  🎯 Gợi ý định hướng nghề nghiệp
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {profileAnalysis.suggestedCareers.map((c: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-medium"
                    >
                      💼 {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {assessment.validityStatus === "WARNING" && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">⚠️ Lưu ý chuyên môn: </span>
            {profileAnalysis.lieWarning ||
              "Chỉ số kiểm soát phản ánh tính khách quan chưa tối ưu, nên tham vấn thêm cùng Giáo viên Cố vấn hoặc Chuyên viên tâm lý."}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ROLE-BASED 3-PARTY COLLABORATION SECTION                              */}
      {/* ===================================================================== */}
      {viewerRole === "STUDENT" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
          <form
            onSubmit={e => {
              e.preventDefault()
              handlePatch(
                {
                  action: "STUDENT_REFLECTION_AND_GOALS",
                  studentReflection: reflectionText,
                  linkedGoalIds: selectedGoalIds,
                  createSmartGoal: newGoalContent.trim()
                    ? {
                        category: "DINH_HUONG",
                        goalContent: newGoalContent.trim(),
                        actionPlan: newGoalAction.trim()
                      }
                    : undefined
                },
                "Đã lưu tự nhận thức và liên kết Mục tiêu SMART!"
              )
              setNewGoalContent("")
              setNewGoalAction("")
            }}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
          >
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-teal-600" />
              <span>Liên Kết Sổ Mục Tiêu SMART & Tự Phản Tư</span>
            </h4>
            <textarea
              rows={2}
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="Cảm nhận của em về kết quả bài trắc nghiệm này..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-500"
            />
            {orientationGoals.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {orientationGoals.slice(0, 4).map((g: any) => {
                  const checked = selectedGoalIds.includes(g.id)
                  return (
                    <label
                      key={g.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedGoalIds(prev =>
                            prev.includes(g.id)
                              ? prev.filter(x => x !== g.id)
                              : [...prev, g.id]
                          )
                        }
                        className="mt-0.5 rounded text-teal-600"
                      />
                      <span className="font-medium text-slate-700 line-clamp-1">
                        {g.goalContent}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-200/70 space-y-2">
              <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Tạo nhanh Mục tiêu Định hướng mới:
              </span>
              <input
                type="text"
                value={newGoalContent}
                onChange={e => setNewGoalContent(e.target.value)}
                placeholder="Nội dung mục tiêu SMART mới..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Lưu liên kết Mục tiêu & Tự phản tư
            </button>
          </form>

          <form
            onSubmit={e => {
              e.preventDefault()
              handlePatch(
                {
                  action: "REQUEST_CONSULTATION_1ON1",
                  consultationTopic:
                    consultTopic ||
                    `Tư vấn kết quả ${testCode} (${assessment.primaryResultCode})`,
                  consultationNote: consultNote
                },
                "Đã gửi đề nghị Tư vấn 1:1 tới Thầy/Cô GVCN!"
              )
            }}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-800" />
                  <span>Đề Nghị Tư Vấn 1:1 Cùng GVCN / CVHT</span>
                </h4>
                {assessment.consultationRequested && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Đã gửi ({assessment.consultationRequestStatus})
                  </span>
                )}
              </div>
              <input
                type="text"
                value={consultTopic}
                onChange={e => setConsultTopic(e.target.value)}
                placeholder={`Chủ đề: Tư vấn chuyên sâu kết quả ${testCode} (${assessment.primaryResultCode})`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <textarea
                rows={3}
                value={consultNote}
                onChange={e => setConsultNote(e.target.value)}
                placeholder="Câu hỏi hoặc băn khoăn em muốn trao đổi trực tiếp 1:1 cùng Thầy/Cô..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              {assessment.advisorReviewNote && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                  <strong>💬 Phản hồi từ GVCN ({assessment.advisorName || "CVHT"}): </strong>
                  {assessment.advisorReviewNote}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi đề nghị Tư vấn 1:1</span>
            </button>
          </form>
        </div>
      )}

      {(viewerRole === "TEACHER" || viewerRole === "ADMIN") && (
        <form
          onSubmit={e => {
            e.preventDefault()
            handlePatch(
              {
                action: "ADVISOR_REVIEW_AND_PUBLISH",
                advisorReviewNote: advisorNote,
                consultationRequestStatus: consultStatus,
                consultationScheduledDate: scheduledDate,
                isPublishedToParent: publishParent
              },
              "Đã lưu nhận xét chuyên môn và cập nhật công bố tới Phụ huynh!"
            )
          }}
          className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 print:hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Nhận Xét Tư Vấn Của GVCN/CVHT & Công Bố PHHS</span>
            </span>
            <label className="flex items-center gap-1.5 text-xs font-bold text-teal-700 cursor-pointer">
              <input
                type="checkbox"
                checked={publishParent}
                onChange={e => setPublishParent(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Công bố báo cáo này trên Cổng Phụ huynh (PHHS)</span>
            </label>
          </div>

          {assessment.studentReflection && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
              <strong>💭 Tự nhận thức của học sinh: </strong>“{assessment.studentReflection}”
            </div>
          )}

          {assessment.consultationRequested && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>🙋 Học sinh/PHHS đề nghị tư vấn 1:1: </strong>
              {assessment.consultationRequestTopic} — {assessment.consultationRequestNote}
            </div>
          )}

          <textarea
            rows={2}
            value={advisorNote}
            onChange={e => setAdvisorNote(e.target.value)}
            placeholder="Nhập nhận xét chuyên môn, gợi ý phương pháp học tập và lời khuyên đồng hành gửi Học sinh & Phụ huynh..."
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Trạng thái Tư vấn 1:1
              </label>
              <select
                value={consultStatus}
                onChange={e => setConsultStatus(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold"
              >
                <option value="NONE">Chưa yêu cầu</option>
                <option value="PENDING">Chờ xếp lịch 1:1</option>
                <option value="SCHEDULED">Đã xếp lịch hẹn 1:1</option>
                <option value="COMPLETED">Đã hoàn thành tư vấn 1:1</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Ngày hẹn tư vấn 1:1
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{saving ? "Đang lưu..." : "Lưu nhận xét & Công bố"}</span>
            </button>
          </div>

          {assessment.parentAcknowledged && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <strong>👨‍👩‍👧 Phản hồi từ Phụ huynh: </strong>
              {assessment.parentFeedback || "Phụ huynh đã xác nhận xem báo cáo."}
            </div>
          )}
        </form>
      )}

      {viewerRole === "PARENT" && (
        <div className="space-y-3 print:hidden">
          {assessment.advisorReviewNote && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs space-y-1">
              <span className="font-extrabold text-emerald-900 block">
                👩‍🏫 Nhận xét & Định hướng từ GVCN/CVHT ({assessment.advisorName || "Thầy/Cô Cố vấn"}):
              </span>
              <p className="text-emerald-800 leading-relaxed">{assessment.advisorReviewNote}</p>
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault()
              handlePatch(
                {
                  action: "PARENT_FEEDBACK",
                  parentFeedback: parentFeedbackText
                },
                "Đã xác nhận xem báo cáo và gửi phản hồi đồng hành tới GVCN!"
              )
            }}
            className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-teal-600" />
                <span>Ý Kiến Phản Hồi & Đồng Hành Cùng Con Của Phụ Huynh</span>
              </span>
              {assessment.parentAcknowledged && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ✓ Phụ huynh đã xác nhận xem
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={parentFeedbackText}
              onChange={e => setParentFeedbackText(e.target.value)}
              placeholder="Chia sẻ góc nhìn của Gia đình về tính cách, sở thích của con hoặc đề nghị phối hợp cùng Thầy/Cô GVCN..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  handlePatch(
                    {
                      action: "REQUEST_CONSULTATION_1ON1",
                      consultationTopic: `PHHS đề nghị trao đổi kết quả ${testCode} (${assessment.primaryResultCode})`,
                      consultationNote:
                        parentFeedbackText ||
                        "Gia đình mong muốn trao đổi thêm cùng GVCN về định hướng cho con."
                    },
                    "Đã gửi đề nghị trao đổi 1:1 tới Thầy/Cô GVCN!"
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
              >
                🙋 Đề nghị trao đổi 1:1 cùng GVCN
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {assessment.parentAcknowledged
                    ? "Cập nhật phản hồi của Gia đình"
                    : "Xác nhận đã xem & Gửi phản hồi"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official Sky-Line Disclaimer Footer */}
      <div className="p-4 bg-slate-100/90 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
        <span className="text-base shrink-0">🏫</span>
        <p className="italic">{OFFICIAL_DISCLAIMER_VI}</p>
      </div>
    </div>
  )
}
