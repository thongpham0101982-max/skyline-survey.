"use client"
import { useState, useCallback, useRef, useEffect } from "react"
import { submitSurveyAction } from "./actions"
import { CheckCircle2, ChevronLeft, ChevronRight, Send, Star, AlertCircle, X, Edit3 } from "lucide-react"

const npsColor = (n: number) => {
  if (n <= 3) return "bg-red-600 border-red-600 text-white shadow-red-200"
  if (n <= 6) return "bg-amber-500 border-amber-500 text-white shadow-amber-200"
  if (n <= 8) return "bg-lime-600 border-lime-600 text-white shadow-lime-200"
  return "bg-emerald-600 border-emerald-600 text-white shadow-emerald-200"
}

function QuestionCard({ q, idx, total, answer, onChange, onNext, visible }: any) {
  let opts = { choices: [], hasOther: false }
  try {
    const raw = q.options ? JSON.parse(q.options) : []
    if (Array.isArray(raw)) {
      opts = { choices: raw, hasOther: false }
    } else {
      opts = raw
    }
  } catch (e) {
    opts = { choices: [], hasOther: false }
  }

  const [hoverStar, setHoverStar] = useState(0)
  const otherInputRef = useRef<HTMLInputElement>(null)

  const handleRadio = (v: any) => {
    onChange(v)
    if (q.questionType === "MULTIPLE_CHOICE" && !v.startsWith("__OTHER__: ")) {
      setTimeout(() => onNext(), 380)
    }
  }

  const isOther = (v: any) => typeof v === "string" && v.startsWith("__OTHER__: ")
  const getOtherVal = (v: any) => isOther(v) ? v.replace("__OTHER__: ", "") : ""

  return (
    <div
      style={{
        transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
        pointerEvents: visible ? "auto" : "none",
        position: visible ? "relative" : "absolute",
        width: "100%"
      }}
      className="w-full font-outfit"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#d90429] text-white text-sm font-black shadow-xl shadow-red-200 flex-shrink-0">
          {idx + 1}
        </div>
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Câu hỏi {idx + 1}/{total}</span>
        {q.isRequired && <span className="ml-auto text-[10px] font-black text-white bg-red-600 px-3 py-1 rounded-full uppercase tracking-tighter">Bắt buộc</span>}
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-[1.3] mb-8">
        {q.questionText || "Nội dung câu hỏi..."}
      </h2>

      {q.questionType === "MULTIPLE_CHOICE" && (
        <div className="space-y-3">
          {opts.choices.map((opt: string, i: number) => (
            <div
              key={i}
              onClick={() => handleRadio(opt)}
              className={`flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 select-none
                ${answer === opt ? "border-[#d90429] bg-red-50/50 shadow-xl shadow-red-100/50 -translate-y-1" : "border-slate-100 bg-slate-50/50 hover:border-red-300 hover:bg-white hover:shadow-lg"}`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${answer === opt ? "border-[#d90429] bg-[#d90429]" : "border-slate-300"}`}>
                {answer === opt && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-300" />}
              </div>
              <span className={`font-bold text-sm sm:text-base ${answer === opt ? "text-red-900" : "text-slate-600"}`}>{opt}</span>
            </div>
          ))}
          {opts.hasOther && (
            <div className="space-y-3">
               <div
                onClick={() => {
                  const currentOther = isOther(answer) ? answer : "__OTHER__: "
                  handleRadio(currentOther)
                  setTimeout(() => otherInputRef.current?.focus(), 100)
                }}
                className={`flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 select-none
                  ${isOther(answer) ? "border-amber-500 bg-amber-50 shadow-xl shadow-amber-100" : "border-slate-100 bg-slate-50/50 hover:border-amber-300"}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isOther(answer) ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}>
                  {isOther(answer) && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className={`font-black text-sm sm:text-base ${isOther(answer) ? "text-amber-900" : "text-slate-400"}`}>Lựa chọn khác...</span>
              </div>
              {isOther(answer) && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <input
                    ref={otherInputRef}
                    type="text"
                    value={getOtherVal(answer)}
                    onChange={(e) => onChange("__OTHER__: " + e.target.value)}
                    placeholder="Vui lòng nhập ý kiến của bạn tại đây..."
                    className="w-full bg-white border-2 border-amber-400 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none shadow-inner transition-all"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {q.questionType === "CHECKBOX" && (
        <div className="space-y-3">
          {opts.choices.map((opt: string, i: number) => {
            const checked = Array.isArray(answer) && answer.includes(opt)
            return (
              <div
                key={i}
                onClick={() => {
                  const cur: string[] = Array.isArray(answer) ? answer : []
                  onChange(checked ? cur.filter((v: string) => v !== opt) : [...cur, opt])
                }}
                className={`flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300
                  ${checked ? "border-[#d90429] bg-red-50/50 shadow-xl shadow-red-100/50 -translate-y-1" : "border-slate-100 bg-slate-50/50 hover:border-red-300 hover:bg-white"}`}
              >
                <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "border-[#d90429] bg-[#d90429] shadow-md shadow-red-200" : "border-slate-300"}`}>
                  {checked && <svg className="w-4 h-4 text-white animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`font-bold text-sm sm:text-base ${checked ? "text-red-900" : "text-slate-600"}`}>{opt}</span>
              </div>
            )
          })}
          {opts.hasOther && (
            <div className="space-y-3">
              {(() => {
                const otherAnswer = Array.isArray(answer) ? answer.find(isOther) : null
                const hasOtherChecked = !!otherAnswer
                return (
                  <>
                    <div
                      onClick={() => {
                        const cur: string[] = Array.isArray(answer) ? answer : []
                        if (hasOtherChecked) {
                          onChange(cur.filter(v => !isOther(v)))
                        } else {
                          onChange([...cur, "__OTHER__: "])
                          setTimeout(() => otherInputRef.current?.focus(), 100)
                        }
                      }}
                      className={`flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300
                        ${hasOtherChecked ? "border-amber-500 bg-amber-50 shadow-xl shadow-amber-100" : "border-slate-100 bg-slate-50/50 hover:border-amber-300"}`}
                    >
                      <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${hasOtherChecked ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}>
                        {hasOtherChecked && <svg className="w-4 h-4 text-white animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`font-black text-sm sm:text-base ${hasOtherChecked ? "text-amber-900" : "text-slate-400"}`}>Lựa chọn khác...</span>
                    </div>
                    {hasOtherChecked && (
                       <div className="animate-in slide-in-from-top-2 duration-300">
                        <input
                          ref={otherInputRef}
                          type="text"
                          value={getOtherVal(otherAnswer)}
                          onChange={(e) => {
                             const cur: string[] = Array.isArray(answer) ? answer : []
                             onChange(cur.map(v => isOther(v) ? "__OTHER__: " + e.target.value : v))
                          }}
                          placeholder="Vui lòng nhập ý kiến của bạn tại đây..."
                          className="w-full bg-white border-2 border-amber-400 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none shadow-inner transition-all"
                        />
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {q.questionType === "NPS" && (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="grid grid-cols-11 gap-2 sm:gap-3 mb-6">
            {[0,1,2,3,4,5,6,7,8,9,10].map((n: number) => (
              <button key={n} type="button" onClick={() => onChange(n)}
                className={`aspect-square rounded-[1.25rem] border-2 font-black text-xs sm:text-lg transition-all duration-300 shadow-sm flex items-center justify-center
                  ${answer === n ? npsColor(n) + " shadow-xl scale-110 -translate-y-2" : "border-slate-100 bg-slate-50 text-slate-400 hover:border-red-400 hover:bg-white hover:text-red-600 hover:shadow-lg"}`}
              >{n}</button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
            <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Không hài lòng</span>
            <span className="flex items-center gap-1.5 text-emerald-600">Rất hài lòng <CheckCircle2 className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      )}

      {q.questionType === "RATING" && (
        <div className="text-center py-8">
          <div className="flex gap-4 sm:gap-6 justify-center my-4">
            {[1,2,3,4,5].map((v: number) => (
              <button key={v} type="button"
                onMouseEnter={() => setHoverStar(v)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => onChange(v)}
                className="transition-all duration-300 hover:scale-125 active:scale-95 focus:outline-none drop-shadow-xl"
              >
                <Star className={`w-14 h-14 transition-all duration-300 ${(hoverStar || answer || 0) >= v ? "text-amber-400 fill-amber-400 rotate-[360deg] scale-110" : "text-slate-100 fill-slate-100"}`}
                  strokeWidth={1}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {q.questionType === "TEXT" && (
        <textarea rows={5} placeholder="Chia sẻ cảm nghĩ, mong muốn của bạn với nhà trường..."
          value={answer || ""}
          onChange={(e: any) => onChange(e.target.value)}
          className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-[2rem] p-6 text-slate-800 font-bold resize-none focus:border-red-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 text-base sm:text-lg shadow-inner focus:shadow-2xl focus:shadow-red-50/50"
        />
      )}

      {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
        <div className="w-full overflow-x-auto -mx-1 px-1 custom-scrollbar pb-6 animate-in fade-in duration-700">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left bg-slate-50 rounded-l-[1.5rem] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-white">Tiêu chí</th>
                {opts.columns?.map((col: string, i: number) => (
                  <th key={i} className={`p-4 text-center bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b-2 border-white ${i === opts.columns.length - 1 ? "rounded-r-[1.5rem]" : ""}`}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y-8 divide-transparent">
              {opts.rows?.map((row: string, rIndex: number) => (
                <tr key={rIndex} className="group transition-all">
                  <td className="p-4 text-sm font-black text-slate-700 group-hover:text-red-600 transition-colors">{row}</td>
                  {opts.columns?.map((col: string, cIndex: number) => {
                    const isCheckbox = q.questionType === "CB_GRID"
                    const isSelected = isCheckbox 
                      ? (answer && answer[row] && Array.isArray(answer[row]) && answer[row].includes(col))
                      : (answer && answer[row] === col)
                    
                    return (
                      <td key={cIndex} className="p-4 text-center">
                        <div 
                          onClick={() => {
                            let newValue;
                            if (isCheckbox) {
                              const currentSelected = (answer && answer[row] && Array.isArray(answer[row])) ? answer[row] : []
                              newValue = currentSelected.includes(col) 
                                ? currentSelected.filter((v: string) => v !== col)
                                : [...currentSelected, col]
                            } else {
                              newValue = col
                            }
                            onChange({ ...(answer || {}), [row]: newValue })
                          }}
                          className={`w-8 h-8 border-2 mx-auto cursor-pointer flex items-center justify-center transition-all duration-200
                            ${isCheckbox ? "rounded-xl" : "rounded-full"}
                            ${isSelected ? "border-[#d90429] bg-[#d90429] shadow-xl shadow-red-200" : "border-slate-100 bg-slate-100/50 group-hover:border-red-300"}`}
                        >
                          {isSelected && (
                            isCheckbox 
                              ? <svg className="w-4 h-4 text-white animate-in zoom-in duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              : <div className="w-2.5 h-2.5 rounded-full bg-white animate-in zoom-in duration-300" />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-center">
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full text-[9px] font-black text-slate-300 uppercase tracking-widest animate-pulse">
               <Edit3 className="w-3 h-3" /> Cuộn ngang để xem hết các mức
             </div>
          </div>
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
    if (typeof a === "string" && a.startsWith("__OTHER__: ") && a.trim() === "__OTHER__:") return false
    
    if (Array.isArray(a)) {
       if (a.length === 0) return false
       const otherChoice = a.find(v => typeof v === "string" && v.startsWith("__OTHER__: "))
       if (otherChoice !== undefined && otherChoice.trim() === "__OTHER__:") return false
    }
    
    if (q.questionType === "MC_GRID" || q.questionType === "CB_GRID") {
      const opts = JSON.parse(q.options)
      if (!opts.rows || opts.rows.length === 0) return true
      return opts.rows.every((row: string) => {
        const val = a[row]
        if (q.questionType === "CB_GRID") return Array.isArray(val) && val.length > 0
        return val !== undefined && val !== null && val !== ""
      })
    }
    return true
  }

  const goNext = () => {
    if (!validate(current)) { showToast("Vui lòng hoàn thành câu hỏi này trước nhé!"); return }
    if (current < total - 1) setCurrent((c: number) => c + 1)
  }

  const goBack = () => { if (current > 0) setCurrent((c: number) => c - 1) }

  const handleSubmit = async () => {
    for (let i = 0; i < total; i++) {
        if (!validate(i)) { setCurrent(i); showToast(`Câu hỏi số ${i + 1} là bắt buộc.`); return }
    }
    setLoading(true)
    try {
      const responses = questions.map((q: any) => ({ 
        questionId: q.id, 
        type: q.questionType, 
        value: answers[q.id] 
      }))
      const res = await submitSurveyAction({ surveyPeriodId: periodId, studentId: student.id, responses })
      if (res?.error) { showToast(res.error); setLoading(false); return }
      setDone(true)
    } catch (e: any) { if (e.message !== "NEXT_REDIRECT") showToast("Co loi xay ra.") }
    setLoading(false)
  }

  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k]; 
    if (v === undefined || v === null || v === "") return false
    if (Array.isArray(v) && v.length === 0) return false
    if (typeof v === "string" && v.startsWith("__OTHER__: ") && v.trim() === "__OTHER__:") return false
    if (Array.isArray(v)) {
        const otherChoice = v.find(val => typeof val === "string" && val.startsWith("__OTHER__: "))
        if (otherChoice !== undefined && otherChoice.trim() === "__OTHER__:") return false
    }

    const q = questions.find((ques: any) => ques.id === k)
    if (q?.questionType === "MC_GRID" || q?.questionType === "CB_GRID") {
      const opts = JSON.parse(q.options)
      return opts.rows && opts.rows.length > 0 && opts.rows.every((row: string) => {
          const val = v[row]
          if (q.questionType === "CB_GRID") return Array.isArray(val) && val.length > 0
          return val !== undefined && val !== null && val !== ""
      })
    }
    return true
  }).length
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0

  if (done) return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 font-outfit animate-in fade-in zoom-in duration-500">
      <div className="w-32 h-32 rounded-[2.5rem] bg-emerald-50 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-100/50">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-in zoom-in duration-700" strokeWidth={1.5} />
      </div>
      <h2 className="text-4xl font-black text-slate-900 mb-4">Cảm ơn bạn!</h2>
      <p className="text-slate-500 text-lg max-w-md font-bold leading-relaxed">
        Phản hồi của bạn đã được ghi nhận thành công.
      </p>
    </div>
  )

  return (
    <div className="relative w-full max-w-2xl mx-auto font-outfit p-4 sm:p-0 pb-32">
      {/* Toast */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-full duration-300">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
             <AlertCircle className="w-5 h-5 text-amber-400" />
             <span className="font-bold text-sm">{toast}</span>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-10 animate-in fade-in slide-in-from-left duration-500">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tiến độ hoàn thành</span>
          <div className="bg-[#d90429] text-white px-3 py-1 rounded-lg text-[11px] font-black shadow-lg shadow-red-100">{progress}%</div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-red-600 via-[#d90429] to-red-400 rounded-full transition-all duration-700 ease-out shadow-lg" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="h-2 bg-gradient-to-r from-red-600 via-red-500 to-red-400" />
        <div className="p-8 sm:p-12 min-h-[420px] flex flex-col">
          <div className="flex-1 relative">
            {questions.map((q: any, i: number) => (
              <QuestionCard key={q.id} q={q} idx={i} total={total}
                answer={answers[q.id]} onChange={(v: any) => handleChange(q.id, v)}
                onNext={goNext} visible={i === current}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-12 pt-8 border-t border-slate-50">
            <button type="button" onClick={goBack} disabled={current === 0}
              className="flex items-center justify-center w-14 h-14 sm:w-auto sm:px-8 rounded-[1.5rem] font-black text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-20 transition-all active:scale-90"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="hidden sm:inline ml-2">Quay lại</span>
            </button>
            <div className="flex gap-2 items-center">
              {questions.map((_: any, i: number) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-8 bg-[#d90429]" : (answers[questions[i].id] ? "w-3 bg-emerald-400" : "w-1.5 bg-slate-100")}`} />
              ))}
            </div>
            {current < total - 1 ? (
              <button type="button" onClick={goNext}
                className="flex items-center justify-center w-14 h-14 sm:w-auto sm:px-10 rounded-[1.5rem] font-black text-white bg-[#d90429] hover:bg-red-700 active:scale-95 shadow-2xl shadow-red-200 transition-all"
              >
                <span className="hidden sm:inline mr-2">Tiếp theo</span>
                <ChevronRight className="w-6 h-6" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-3 px-8 sm:px-12 py-4 rounded-[1.5rem] font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 shadow-2xl shadow-emerald-200 disabled:opacity-60 transition-all"
              >
                <Send className="w-5 h-5" />
                <span>{loading ? "Đang gửi..." : "Hoàn tất"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
