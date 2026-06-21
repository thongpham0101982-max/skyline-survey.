"use client"

import { useState, useEffect } from "react"
import { getSurveyFormAgeGroup } from "@/lib/preschool"
import { Baby, X, CheckCircle, AlertCircle, Save, Sparkles, Heart, ClipboardList } from "lucide-react"

interface PreschoolEvaluationFormProps {
  student: any
  onSave: (studentId: string, scores: any[], comments: {
    devProfessionalComment: string
    devPsychologyComment: string
    devImportantNote: string
    devAssessmentResult: string
  }) => Promise<void>
  onClose: () => void
  isLocked?: boolean
}

export default function PreschoolEvaluationForm({
  student,
  onSave,
  onClose,
  isLocked = false
}: PreschoolEvaluationFormProps) {
  const [devAreas, setDevAreas] = useState<any[]>([])
  const [studentScores, setStudentScores] = useState<Record<string, { result: string; note: string }>>({})
  const [devLoading, setDevLoading] = useState(true)
  const [savingEval, setSavingEval] = useState(false)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Comments & Results states
  const [devProfComment, setDevProfComment] = useState(student.devProfessionalComment || "")
  const [devPsyComment, setDevPsyComment] = useState(student.devPsychologyComment || "")
  const [devNote, setDevNote] = useState(student.devImportantNote || "")
  const [devResult, setDevResult] = useState(student.devAssessmentResult || "")

  // Approvals (from BGH & GDCS) - strictly read only
  const bghApprovalStatus = student.bghApprovalStatus || ""
  const bghApprovalComment = student.bghApprovalComment || ""
  const gdcsApprovalStatus = student.gdcsApprovalStatus || ""
  const gdcsApprovalComment = student.gdcsApprovalComment || ""

  // If approved by both BGH and GDCS, the whole form is locked for editing
  const isApprovedStatus = (s: any) => s === "DAT" || s === "DAT_MIEN_HOC_THU" || s === "DAT_HOC_THU";
  const isAssessmentLocked = isLocked || !!(isApprovedStatus(bghApprovalStatus) && isApprovedStatus(gdcsApprovalStatus));

    useEffect(() => {
    async function loadData() {
      setDevLoading(true)
      try {
        const scoresRes = await fetch(`/api/preschool-dev-scores?studentId=${student.id}`)
        let scoredList = []
        let ageGroup = ""
        if (scoresRes.ok) {
          scoredList = await scoresRes.json()
          const scoreMap: Record<string, { result: string; note: string }> = {}
          for (const sc of scoredList) {
            scoreMap[sc.criteriaId] = { result: sc.result, note: sc.note || "" }
          }
          setStudentScores(scoreMap)
          if (scoredList.length > 0 && scoredList[0].criteria?.ageGroup) {
            ageGroup = scoredList[0].criteria.ageGroup
          }
        }

        if (!ageGroup) {
          const surveyDate = new Date()
          ageGroup = getSurveyFormAgeGroup(student.grade, surveyDate)
        }
        
        const areasRes = await fetch(`/api/preschool-dev-areas?ageGroup=${encodeURIComponent(ageGroup)}`)
        if (areasRes.ok) {
          setDevAreas(await areasRes.json())
        }
      } catch (e) {
        console.error("Error loading evaluation data:", e)
      } finally {
        setDevLoading(false)
      }
    }
    async function loadHistory() {
      if (!student?.studentCode) return
      setLoadingHistory(true)
      try {
        const histRes = await fetch(`/api/teacher-assessments?action=getPreschoolRetestHistory&studentCode=${encodeURIComponent(student.studentCode)}`)
        if (histRes.ok) {
          setHistoryList(await histRes.json())
        }
      } catch (err) {
        console.error("Error fetching student preschool history:", err)
      } finally {
        setLoadingHistory(false)
      }
    }
    loadData()
    loadHistory()
  }, [student])

  const calculateBMI = () => {
    let height = 0
    let weight = 0
    for (const area of devAreas) {
      for (const crit of area.criteria) {
        if (crit.code.endsWith("_01") || crit.name.toLowerCase().includes("chiều cao")) {
          const score = studentScores[crit.id]
          if (score && score.note) {
            const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note
            const num = parseFloat(rawPart.replace(/[^\d.]/g, ""))
            if (!isNaN(num) && num > 0) height = num
          }
        }
        if (crit.code.endsWith("_02") || crit.name.toLowerCase().includes("cân nặng")) {
          const score = studentScores[crit.id]
          if (score && score.note) {
            const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note
            const num = parseFloat(rawPart.replace(/[^\d.]/g, ""))
            if (!isNaN(num) && num > 0) weight = num
          }
        }
      }
    }
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100
      return weight / (heightInMeters * heightInMeters)
    }
    return null
  }

  const getBMIClassification = (bmi: number) => {
    if (bmi < 13.5) return { label: "Gầy (Thiếu cân)", color: "text-amber-600 bg-amber-50 border-amber-100", dot: "bg-amber-400" }
    if (bmi <= 17.0) return { label: "Bình thường", color: "text-emerald-600 bg-emerald-50 border-emerald-100", dot: "bg-emerald-400" }
    if (bmi <= 18.5) return { label: "Thừa cân", color: "text-orange-600 bg-orange-50 border-orange-100", dot: "bg-orange-400" }
    return { label: "Béo phì", color: "text-rose-600 bg-rose-50 border-rose-100", dot: "bg-rose-400" }
  }

  const handleSave = async () => {
    setSavingEval(true)
    try {
      const scoresPayload = Object.entries(studentScores).map(([criteriaId, val]) => ({
        criteriaId,
        result: val.result,
        note: val.note
      }))
      await onSave(student.id, scoresPayload, {
        devProfessionalComment: devProfComment,
        devPsychologyComment: devPsyComment,
        devImportantNote: devNote,
        devAssessmentResult: devResult
      })
    } catch (e) {
      console.error(e)
      alert("Lỗi khi lưu kết quả đánh giá")
    } finally {
      setSavingEval(false)
    }
  }

  const radioOpts = [
    { key: "CHUA_THE_HIEN", label: "Chưa thể hiện", color: "peer-checked:bg-slate-100 peer-checked:text-slate-700 border-slate-200" },
    { key: "DAT", label: "Đạt", color: "peer-checked:bg-emerald-50 peer-checked:text-emerald-700 peer-checked:border-emerald-200 border-slate-200" },
    { key: "KHONG_DAT", label: "Không đạt", color: "peer-checked:bg-rose-50 peer-checked:text-rose-700 peer-checked:border-rose-200 border-slate-200" }
  ]

  const overallResultOpts = [
    { value: "", label: "Chưa đánh giá" },
    { value: "DAT", label: "Đạt" },
    { value: "KHONG_DAT", label: "Không đạt" },
    { value: "HOC_THU", label: "Học thử" }
  ]

  const Spin = () => (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-pink-100 border-t-pink-500 animate-spin"></div>
        <Baby className="w-5 h-5 text-pink-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-400 rounded-xl flex items-center justify-center shadow-md shadow-pink-200">
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight">Phiếu Đánh Giá Phát Triển Mầm Non</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
              Học sinh: {student.fullName} • Mã: {student.studentCode}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
        >
          <X className="w-4 h-4" /> Đóng lại
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        {/* Left column: Assessment Form */}
        <div className="lg:col-span-2 space-y-6">
          {isAssessmentLocked && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Phiếu Đánh Giá Ở Trạng Thái Khóa</p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                  Học sinh đã đạt cả hai bước phê duyệt (BGH &amp; GĐCS) hoặc đợt khảo sát đã đóng. Phiếu hiển thị ở chế độ Chỉ đọc.
                </p>
              </div>
            </div>
          )}

          {devLoading ? (
            <Spin />
          ) : devAreas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white rounded-2xl border border-dashed border-slate-200">
              Chưa cấu hình tiêu chí nào cho nhóm tuổi: {student.grade}
            </div>
          ) : (
            <div className="space-y-6">
              {devAreas.map((area) => (
                <div key={area.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  {/* Area title bar */}
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color || "#6366f1" }} />
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">{area.name}</h4>
                    </div>
                    
                    {/* Live BMI display in physical section */}
                    {(area.code === "THE_CHAT" || area.name?.toLowerCase().includes("thể chất")) && (() => {
                      const bmiVal = calculateBMI()
                      const bmiClass = bmiVal ? getBMIClassification(bmiVal) : null
                      if (!bmiVal || !bmiClass) return null
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-black uppercase tracking-wider ${bmiClass.color}`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${bmiClass.dot}`} />
                          <span>BMI: {bmiVal.toFixed(1)} ({bmiClass.label})</span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Criteria list inside area */}
                  <div className="divide-y divide-slate-100 p-5 space-y-5">
                    {area.criteria.map((crit: any, idx: number) => {
                      const isTheChat = area.code === "THE_CHAT" || area.name?.toLowerCase().includes("thể chất")
                      const isHeight = isTheChat && (crit.code?.endsWith("_01") || crit.name?.toLowerCase().includes("chiều cao"))
                      const isWeight = isTheChat && (crit.code?.endsWith("_02") || crit.name?.toLowerCase().includes("cân nặng"))
                      const isPhysical = isHeight || isWeight
                      const unit = isHeight ? "cm" : "kg"

                      // Parse note with pipe separator: "110 cm|obs text"
                      const rawNote = studentScores[crit.id]?.note || ""
                      const pipeIdx = rawNote.indexOf("|")
                      const rawMeasure = pipeIdx >= 0 ? rawNote.substring(0, pipeIdx) : rawNote
                      const rawObs = pipeIdx >= 0 ? rawNote.substring(pipeIdx + 1) : ""
                      const parsedNum = parseFloat(rawMeasure.replace(/[^\d.]/g, ""))
                      const numStr = (isPhysical && !isNaN(parsedNum) && parsedNum > 0) ? String(parsedNum) : ""

                      const updatePhysical = (newNum: string, newObs: string) => {
                        let combined = ""
                        if (newNum && newObs) combined = `${newNum} ${unit}|${newObs}`
                        else if (newNum) combined = `${newNum} ${unit}`
                        else if (newObs) combined = `|${newObs}`
                        setStudentScores(prev => ({
                          ...prev,
                          [crit.id]: { result: prev[crit.id]?.result || "CHUA_THE_HIEN", note: combined }
                        }))
                      }

                      return (
                        <div key={crit.id} className="pt-4 first:pt-0 space-y-3">
                          <p className="text-sm font-bold text-slate-700 flex items-start gap-2">
                            <span className="font-mono text-xs text-slate-400 font-normal">#{idx + 1}</span>
                            {crit.name}
                          </p>

                          {isPhysical ? (
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              {/* Physical Measurement Value */}
                              <div className="flex items-center bg-white border-2 border-violet-100 rounded-2xl overflow-hidden hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100/30 transition-all shadow-sm max-w-[200px]">
                                <input
                                  type="number"
                                  step={isHeight ? "1" : "0.1"}
                                  min="0"
                                  max={isHeight ? "250" : "150"}
                                  value={numStr}
                                  onChange={e => updatePhysical(e.target.value, rawObs)}
                                  placeholder={isHeight ? "0" : "0.0"}
                                  disabled={isAssessmentLocked}
                                  className="w-24 text-xl font-black text-slate-800 outline-none bg-transparent text-center px-3 py-2.5 disabled:text-slate-400 disabled:cursor-not-allowed"
                                />
                                <div className="px-3.5 py-2.5 bg-violet-50 border-l border-violet-100 text-sm font-black text-violet-600 select-none min-w-[48px] text-center">
                                  {unit}
                                </div>
                              </div>

                              {/* Physical Observation Note */}
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={rawObs}
                                  onChange={e => updatePhysical(numStr, e.target.value)}
                                  placeholder={isAssessmentLocked ? "Không có ghi chú" : "Nhập ghi chú quan sát..."}
                                  disabled={isAssessmentLocked}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-pink-400 focus:bg-white text-sm font-medium text-slate-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Assessment Radios */}
                              <div className="flex flex-wrap gap-2">
                                {radioOpts.map((opt) => {
                                  const isChecked = (studentScores[crit.id]?.result || "CHUA_THE_HIEN") === opt.key
                                  return (
                                    <label
                                      key={opt.key}
                                      className={`relative flex items-center ${isAssessmentLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`crit-opts-${crit.id}`}
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isAssessmentLocked) return
                                          setStudentScores(prev => ({
                                            ...prev,
                                            [crit.id]: { result: opt.key, note: prev[crit.id]?.note || "" }
                                          }))
                                        }}
                                        disabled={isAssessmentLocked}
                                        className="sr-only peer"
                                      />
                                      <div className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all peer-checked:shadow-sm ${opt.color}`}>
                                        {opt.label}
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>

                              {/* Observation Note */}
                              <input
                                type="text"
                                value={studentScores[crit.id]?.note || ""}
                                onChange={e => {
                                  if (isAssessmentLocked) return
                                  setStudentScores(prev => ({
                                    ...prev,
                                    [crit.id]: { result: prev[crit.id]?.result || "CHUA_THE_HIEN", note: e.target.value }
                                  }))
                                }}
                                placeholder={isAssessmentLocked ? "Không có ghi chú" : "Ghi chú quan sát..."}
                                disabled={isAssessmentLocked}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-pink-400 focus:bg-white text-xs font-medium text-slate-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Summaries, Comments, Approvals */}
        <div className="space-y-6">
          {/* General comments section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-pink-400" /> Nhận Xét &amp; Đánh Giá Chung
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Đánh giá chuyên môn
                </label>
                <textarea
                  value={devProfComment}
                  onChange={e => setDevProfComment(e.target.value)}
                  placeholder={isAssessmentLocked ? "Chưa có nhận xét" : "Nhận xét về sự phát triển chuyên môn của trẻ..."}
                  disabled={isAssessmentLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-400 focus:bg-white text-sm font-medium text-slate-700 transition-all h-24 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Nhận xét tâm lý
                </label>
                <textarea
                  value={devPsyComment}
                  onChange={e => setDevPsyComment(e.target.value)}
                  placeholder={isAssessmentLocked ? "Chưa có nhận xét" : "Nhận xét về trạng thái tâm lý, cảm xúc của trẻ..."}
                  disabled={isAssessmentLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-400 focus:bg-white text-sm font-medium text-slate-700 transition-all h-24 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Lưu ý đặc biệt
                </label>
                <textarea
                  value={devNote}
                  onChange={e => setDevNote(e.target.value)}
                  placeholder={isAssessmentLocked ? "Không có lưu ý đặc biệt" : "Những điểm cần lưu ý đặc biệt..."}
                  disabled={isAssessmentLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-400 focus:bg-white text-sm font-medium text-slate-700 transition-all h-20 resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  Kết quả khảo sát chung
                </label>
                <select
                  value={devResult}
                  onChange={e => setDevResult(e.target.value)}
                  disabled={isAssessmentLocked}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {overallResultOpts.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Approvals section: READ ONLY always */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Heart className="w-4 h-4 text-violet-400" /> Trạng Thái Phê Duyệt Của Hệ Thống
            </h3>

            <div className="space-y-4">
              {/* BGH MN Approval */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duyệt BGH MN</span>
                  {(() => {
                    if (!bghApprovalStatus) return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Chờ Duyệt</span>;
                    if (bghApprovalStatus === "DAT_MIEN_HOC_THU" || bghApprovalStatus === "DAT") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Đạt - Miễn Học Thử</span>;
                    if (bghApprovalStatus === "DAT_HOC_THU") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Đạt - Học Thử</span>;
                    if (bghApprovalStatus === "KHONG_DAT") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">Không Đạt</span>;
                    return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-250">Ý kiến khác</span>;
                  })()}
                </div>
                {bghApprovalComment && (
                  <p className="text-xs italic text-slate-600 bg-white border border-slate-100 rounded-lg p-2.5">
                    "{bghApprovalComment}"
                  </p>
                )}
              </div>

              {/* GDCS Approval */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duyệt GĐCS</span>
                  {(() => {
                    if (!gdcsApprovalStatus) return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Chờ Duyệt</span>;
                    if (gdcsApprovalStatus === "DAT_MIEN_HOC_THU" || gdcsApprovalStatus === "DAT") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Đạt - Miễn Học Thử</span>;
                    if (gdcsApprovalStatus === "DAT_HOC_THU") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Đạt - Học Thử</span>;
                    if (gdcsApprovalStatus === "KHONG_DAT") return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">Không Đạt</span>;
                    return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-250">Ý kiến khác</span>;
                  })()}
                </div>
                {gdcsApprovalComment && (
                  <p className="text-xs italic text-slate-600 bg-white border border-slate-100 rounded-lg p-2.5">
                    "{gdcsApprovalComment}"
                  </p>
                )}
              </div>

              {/* General/Final Result */}
              <div className="flex items-center justify-between bg-violet-50/40 p-4 rounded-2xl border border-violet-100">
                <span className="text-xs font-black text-violet-800 uppercase tracking-wider">Kết Quả Tuyển Sinh Cuối</span>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${
                  student.admissionResult?.includes("Đạt") ? "bg-emerald-500 text-white shadow-sm" :
                  student.admissionResult?.includes("Không") ? "bg-rose-500 text-white shadow-sm" : "bg-slate-200 text-slate-700"
                }`}>
                  {student.admissionResult || "Chưa Duyệt"}
                </span>
              </div>
            </div>
          </div>

          {/* Lược sử đánh giá mầm non block */}
          {(() => {
            const pastAssessments = historyList.filter((h: any) => h.id !== student.id);
            if (pastAssessments.length === 0) return null;
            return (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <ClipboardList className="w-4 h-4 text-indigo-500" /> Lược sử đánh giá mầm non
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full ml-auto">{pastAssessments.length} đợt</span>
                </h3>
                {loadingHistory ? (
                  <div className="text-xs text-slate-500 py-2">Đang tải lược sử...</div>
                ) : (
                  <div className="space-y-3">
                    {pastAssessments.map((histRec: any) => {
                      const isExpanded = expandedHistoryId === histRec.id;
                      return (
                        <div key={histRec.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50/50">
                          <div 
                            onClick={() => setExpandedHistoryId(isExpanded ? null : histRec.id)}
                            className="flex flex-col p-4 cursor-pointer gap-2 bg-white hover:bg-slate-50/40 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-bold text-slate-800 text-xs">{histRec.period?.name || "Kỳ khảo sát"}</h4>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                histRec.devAssessmentResult === "DAT" ? "bg-emerald-50 text-emerald-700 border border-emerald-250" :
                                histRec.devAssessmentResult === "KHONG_DAT" ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-[#00A19A]"
                              }`}>
                                {histRec.devAssessmentResult === "DAT" ? "Đạt" : histRec.devAssessmentResult === "KHONG_DAT" ? "Không Đạt" : histRec.devAssessmentResult === "HOC_THU" ? "Học thử" : "Chưa đánh giá"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Đợt: <span className="font-semibold">{histRec.batch?.name || "Khảo sát lẻ"}</span> | 
                              Ngày: <span className="font-semibold">{histRec.createdAt ? new Date(histRec.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                            </p>
                          </div>

                          {isExpanded && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-3 text-xs">
                              {histRec.devProfessionalComment && (
                                <div>
                                  <span className="font-bold text-slate-600 block">Đánh giá chuyên môn:</span>
                                  <p className="text-slate-700 mt-0.5 italic">"{histRec.devProfessionalComment}"</p>
                                </div>
                              )}
                              {histRec.devPsychologyComment && (
                                <div>
                                  <span className="font-bold text-slate-600 block">Đánh giá tâm lý:</span>
                                  <p className="text-slate-700 mt-0.5 italic">"{histRec.devPsychologyComment}"</p>
                                </div>
                              )}
                              {histRec.devImportantNote && (
                                <div>
                                  <span className="font-bold text-slate-600 block">Lưu ý quan trọng:</span>
                                  <p className="text-slate-700 mt-0.5 italic">"{histRec.devImportantNote}"</p>
                                </div>
                              )}
                              {histRec.scores && histRec.scores.length > 0 && (
                                <div className="pt-2 border-t border-slate-200">
                                  <span className="font-bold text-slate-600 block mb-1">Kết quả tiêu chí chi tiết:</span>
                                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                                      ✓ Đạt: <span className="font-bold">{histRec.scores.filter((s: any) => s.result === "DAT").length}</span>
                                    </div>
                                    <div className="bg-rose-50 text-rose-800 p-2 rounded-lg border border-rose-100">
                                      ✗ Không đạt: <span className="font-bold">{histRec.scores.filter((s: any) => s.result === "KHONG_DAT").length}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Floating Save Action Bar at the bottom */}
      {!isAssessmentLocked && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/80 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="hidden sm:block text-xs font-bold text-slate-500">
            * Vui lòng nhấn nút Lưu bên phải để cập nhật mọi thay đổi!
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm transition-all"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              disabled={savingEval}
              className="flex-1 sm:flex-initial px-10 py-3.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black rounded-2xl text-sm hover:from-pink-600 hover:to-rose-50 hover:shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {savingEval ? (
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu Kết Quả Đánh Giá
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
