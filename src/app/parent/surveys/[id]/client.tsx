"use client"
import { useState, useCallback } from "react"
import { submitSurveyAction } from "./actions"
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Star, AlertCircle, X } from "lucide-react"

const npsColor = (n: number) => {
  if (n <= 3) return "bg-red-500 border-red-500 text-white shadow-red-200"
  if (n <= 6) return "bg-amber-400 border-amber-400 text-white shadow-amber-200"
  if (n <= 8) return "bg-lime-500 border-lime-500 text-white shadow-lime-200"
  return "bg-emerald-500 border-emerald-500 text-white shadow-emerald-200"
}
const npsIdle = "border-2 border-slate-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"

function QuestionCard({ q, idx, total, answer, onChange, onNext, visible }: any) {
  const opts = q.options ? JSON.parse(q.options) : []
  const [hoverStar, setHoverStar] = useState(0)

  const handleRadio = (v: any) => {
    onChange(v)
    if (q.questionType === "MULTIPLE_CHOICE") setTimeout(() => onNext(), 380)
  }

  return (
    <div
      style={{
        transition: "opacity 0.35s ease, transform 0.35s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        pointerEvents: visible ? "auto" : "none",
        position: visible ? "relative" : "absolute",
      }}
      className="w-full"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-500/30 flex-shrink-0">
          {idx + 1}
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Cau hoi {idx + 1}/{total}</span>
        {q.isRequired && <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Bat buoc</span>}
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug mb-7">
        {q.questionText || "Noi dung cau hoi..."}
      </h2>

      {q.questionType === "MULTIPLE_CHOICE" && (
        <div className="space-y-3">
          {opts.map((opt: string, i: number) => (
            <div
              key={i}
              onClick={() => handleRadio(opt)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none min-h-[52px]
                ${answer === opt ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answer === opt ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                {answer === opt && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <span className={`font-semibold text-sm sm:text-base ${answer === opt ? "text-indigo-700" : "text-slate-700"}`}>{opt}</span>
            </div>
          ))}
        </div>
      )}

      {q.questionType === "CHECKBOX" && (
        <div className="space-y-3">
          {opts.map((opt: string, i: number) => {
            const checked = Array.isArray(answer) && answer.includes(opt)
            return (
              <div
                key={i}
                onClick={() => {
                  const cur: string[] = Array.isArray(answer) ? answer : []
                  onChange(checked ? cur.filter((v: string) => v !== opt) : [...cur, opt])
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 min-h-[52px]
                  ${checked ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"}`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                  {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`font-semibold text-sm sm:text-base ${checked ? "text-indigo-700" : "text-slate-700"}`}>{opt}</span>
              </div>
            )
          })}
        </div>
      )}

      {q.questionType === "NPS" && (
        <div>
          <div className="grid grid-cols-11 gap-1.5 sm:gap-2 mb-3">
            {[0,1,2,3,4,5,6,7,8,9,10].map((n: number) => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`aspect-square rounded-xl border-2 font-black text-sm sm:text-base transition-all duration-150 shadow-sm
                  ${answer === n ? npsColor(n) + " shadow-md scale-110" : npsIdle}`}
              >{n}</button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
            <span>Rat khong hai long</span>
            <span>Rat hai long</span>
          </div>
          {answer !== undefined && answer !== null && (
            <div className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-2xl font-bold text-sm
              ${answer <= 3 ? "bg-red-50 text-red-600" : answer <= 6 ? "bg-amber-50 text-amber-600" : answer <= 8 ? "bg-lime-50 text-lime-700" : "bg-emerald-50 text-emerald-700"}`}>
              Ban da chon diem <span className="text-xl font-black">{answer}</span>/10
            </div>
          )}
        </div>
      )}

      {q.questionType === "RATING" && (
        <div className="text-center">
          <div className="flex gap-2 sm:gap-3 justify-center my-4">
            {[1,2,3,4,5].map((v: number) => (
              <button key={v} type="button"
                onMouseEnter={() => setHoverStar(v)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => onChange(v)}
                className="transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none"
              >
                <Star className="w-10 h-10 sm:w-12 sm:h-12 transition-all duration-150"
                  fill={(hoverStar || answer || 0) >= v ? "#F59E0B" : "none"}
                  stroke={(hoverStar || answer || 0) >= v ? "#F59E0B" : "#CBD5E1"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          {(hoverStar || answer) > 0 && (
            <p className="font-bold text-amber-600 text-sm">
              {["","Rat te","Te","Binh thuong","Tot","Xuat sac"][hoverStar || answer]}
            </p>
          )}
        </div>
      )}

      {q.questionType === "TEXT" && (
        <textarea rows={4} placeholder="Nhap y kien cua ban tai day..."
          value={answer || ""}
          onChange={(e: any) => onChange(e.target.value)}
          className="w-full border-2 border-slate-200 rounded-2xl p-4 text-slate-800 font-medium resize-none focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-300 text-sm sm:text-base"
        />
      )}

      {q.questionType === "DROPDOWN" && (
        <div className="relative">
          <select value={answer || ""} onChange={(e: any) => onChange(e.target.value)}
            className="w-full appearance-none border-2 border-slate-200 rounded-2xl p-4 font-semibold text-slate-800 bg-white focus:border-indigo-500 outline-none cursor-pointer pr-10 transition-colors"
          >
            <option value="" disabled>Chon mot lua chon</option>
            {opts.map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">▼</div>
        </div>
      )}
    </div>
  )
}

export function SurveyFormClient({ periodId, student, questions }: any) {
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [done, setDone] = useState(false)

  const total = questions.length

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3500)
  }

  const handleChange = useCallback((qId: string, v: any) => {
    setAnswers((prev: any) => ({ ...prev, [qId]: v }))
  }, [])

  const validate = (idx: number) => {
    const q = questions[idx]
    if (!q.isRequired) return true
    const a = answers[q.id]
    if (a === undefined || a === null || a === "") return false
    if (Array.isArray(a) && a.length === 0) return false
    return true
  }

  const goNext = () => {
    if (!validate(current)) { showToast("Vui long tra loi cau hoi nay truoc khi tiep tuc."); return }
    if (current < total - 1) setCurrent((c: number) => c + 1)
  }

  const goBack = () => { if (current > 0) setCurrent((c: number) => c - 1) }

  const handleSubmit = async () => {
    for (let i = 0; i < total; i++) {
      if (!validate(i)) { setCurrent(i); showToast(`Cau hoi ${i + 1} la bat buoc.`); return }
    }
    setLoading(true)
    try {
      const responses = questions.map((q: any) => ({ questionId: q.id, type: q.questionType, value: answers[q.id] }))
      const res = await submitSurveyAction({ surveyPeriodId: periodId, studentId: student.id, responses })
      if (res?.error) { showToast(res.error); setLoading(false); return }
      setDone(true)
    } catch (e: any) { if (e.message !== "NEXT_REDIRECT") showToast("Co loi xay ra.") }
    setLoading(false)
  }

  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k]; return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
  }).length
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0

  if (done) return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
        <CheckCircle2 className="w-14 h-14 text-emerald-500" strokeWidth={1.5} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-3">Cam on ban!</h2>
      <p className="text-slate-500 text-lg max-w-md leading-relaxed">
        Phan hoi cua ban ve hoc sinh <strong className="text-slate-800">{student.studentName}</strong> da duoc ghi nhan thanh cong.
      </p>
    </div>
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tien do hoan thanh</span>
          <span className="text-xs font-black text-indigo-600">{progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-1 mt-2">
          {questions.map((_: any, i: number) => (
            <button key={i} type="button" onClick={() => setCurrent(i)}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < current ? "bg-indigo-400" : i === current ? "bg-indigo-600" : "bg-slate-200"}`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="p-6 sm:p-10 min-h-[380px] flex flex-col">
          <div className="flex-1 relative">
            {questions.map((q: any, i: number) => (
              <QuestionCard key={q.id} q={q} idx={i} total={total}
                answer={answers[q.id]} onChange={(v: any) => handleChange(q.id, v)}
                onNext={goNext} visible={i === current}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-100">
            <button type="button" onClick={goBack} disabled={current === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[48px]"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Quay lai</span>
            </button>

            <div className="flex gap-1.5 items-center">
              {questions.map((_: any, i: number) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-2 bg-indigo-600" : "w-2 h-2 bg-slate-200"}`} />
              ))}
            </div>

            {current < total - 1 ? (
              <button type="button" onClick={goNext}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/30 transition-all min-h-[48px]"
              >
                <span>Tiep theo</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 shadow-lg shadow-emerald-500/30 disabled:opacity-60 transition-all min-h-[48px]"
              >
                <Send className="w-5 h-5" />
                <span>{loading ? "Dang gui..." : "Hoan tat & Gui"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-red-500/40 font-semibold text-sm max-w-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}