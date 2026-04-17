"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Save, CloudUpload, X, Tag } from "lucide-react"
import { saveSurveyQuestionsAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ surveyPeriodId, initialQuestions, categories = [] }) {
  const [questions, setQuestions] = useState(
    initialQuestions.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
      sectionId: q.section?.id || q.sectionId || ""
    }))
  )
  const [activeTab, setActiveTab] = useState("editor")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const addQuestion = (type) => {
    const newQ = {
      id: `new_${Date.now()}`,
      code: `Q-${Date.now()}`,
      questionText: "",
      questionType: type,
      isRequired: true,
      options: type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN" ? ["Tuy chon 1"] : [],
      ratingScaleMin: 1,
      ratingScaleMax: type === "NPS" ? 10 : 5,
      weight: 1,
      sectionId: ""
    }
    setQuestions([...questions, newQ])
  }

  const updateQuestion = (index, key, value) => {
    const newQs = [...questions]
    newQs[index][key] = value
    setQuestions(newQs)
  }

  const updateOption = (qIndex, optIndex, value) => {
    const newQs = [...questions]
    newQs[qIndex].options[optIndex] = value
    setQuestions(newQs)
  }

  const addOption = (qIndex) => {
    const newQs = [...questions]
    newQs[qIndex].options.push(`Tuy chon ${newQs[qIndex].options.length + 1}`)
    setQuestions(newQs)
  }

  const removeOption = (qIndex, optIndex) => {
    const newQs = [...questions]
    newQs[qIndex].options = newQs[qIndex].options.filter((_, i) => i !== optIndex)
    setQuestions(newQs)
  }

  const moveQuestion = (index, dir) => {
    if (index + dir < 0 || index + dir >= questions.length) return
    const newQs = [...questions]
    const temp = newQs[index]
    newQs[index] = newQs[index + dir]
    newQs[index + dir] = temp
    setQuestions(newQs)
  }

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async (publish = false) => {
    setSaving(true)
    const res = await saveSurveyQuestionsAction(surveyPeriodId, questions)
    setSaving(false)
    if (res?.success) {
      if (publish) {
        router.push(`/admin/surveys/${surveyPeriodId}/publish`)
      } else {
        alert("Da luu ban nhap thanh cong!")
      }
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-6">
      
      {/* LEFT PANE */}
      <div className={`flex-1 md:w-1/2 flex flex-col ${activeTab === "preview" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-0 z-10 w-full overflow-x-auto whitespace-nowrap">
          <h2 className="font-bold text-slate-800 text-lg mr-4">Trinh thiet ke (Builder)</h2>
          <div className="flex space-x-2">
            <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100">+ Trac nghiem</button>
            <button onClick={() => addQuestion("TEXT")} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-sm font-medium hover:bg-indigo-100">+ Tu luan</button>
            <button onClick={() => addQuestion("RATING")} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded text-sm font-medium hover:bg-amber-100">+ Star Rating</button>
            <button onClick={() => addQuestion("NPS")} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-sm font-medium hover:bg-emerald-100">+ NPS Score</button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-20 pr-2">
          {questions.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
              Ban chua cau truc cau hoi nao. Bam nut mau xanh phia tren de bat dau them moi!
            </div>
          ) : (
            questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-r border-slate-100 hover:bg-slate-200 cursor-move">
                  <GripVertical className="w-5 h-5 text-slate-400" />
                </div>
                <div className="p-6 md:pl-14">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                        placeholder="Nhap tieu de hoac Mo ta cau hoi tai day..."
                        className="w-full text-lg font-semibold border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none pb-1 transition-colors bg-transparent"
                      />
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500">
                        <label className="flex items-center space-x-1">
                          <span>Ma:</span>
                          <input type="text" value={q.code} onChange={e => updateQuestion(qIndex, "code", e.target.value)} className="border-b focus:border-blue-500 outline-none w-28 bg-transparent text-slate-800 font-medium" />
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 text-sm font-medium outline-blue-500 cursor-pointer"
                        >
                          <option value="TEXT">Tu luan (Text)</option>
                          <option value="MULTIPLE_CHOICE">Trac nghiem Radio</option>
                          <option value="CHECKBOX">Trac nghiem Checkbox</option>
                          <option value="DROPDOWN">Menu Dropdown</option>
                          <option value="RATING">Danh gia sao (Rating)</option>
                          <option value="NPS">Khao sat NPS (0-10)</option>
                        </select>

                        {/* CATEGORY DROPDOWN */}
                        <label className="flex items-center space-x-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="text-slate-500">Danh muc:</span>
                          <select
                            value={q.sectionId || ""}
                            onChange={(e) => updateQuestion(qIndex, "sectionId", e.target.value)}
                            className="bg-indigo-50 border border-indigo-200 rounded p-1.5 text-sm font-medium outline-indigo-500 cursor-pointer text-indigo-700 max-w-[200px]"
                          >
                            <option value="">-- Chua phan loai --</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="mt-4">
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                      <div className="space-y-2 max-w-lg">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-3 group/opt w-full">
                            <div className={`w-4 h-4 border border-slate-300 flex-shrink-0 ${q.questionType === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-sm"}`} />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none flex-1 pb-1 transition-colors bg-transparent"
                              placeholder={`Tuy chon ${optIndex + 1}`}
                            />
                            <button onClick={() => removeOption(qIndex, optIndex)} className="text-red-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600 transition-opacity p-1"><X className="w-5 h-5" /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(qIndex)} className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md mt-3 flex items-center transition-colors"><Plus className="w-4 h-4 mr-1"/> Them tuy chon</button>
                      </div>
                    )}
                    {q.questionType === "TEXT" && (
                      <div className="border-b-2 border-dashed border-slate-300 pb-2 text-slate-400 w-full sm:w-2/3">Van ban binh luan dai... (Phu huynh tu nhap)</div>
                    )}
                    {q.questionType === "RATING" && (
                      <div className="flex items-center text-amber-400 text-3xl">
                        ★ ★ ★ ★ ★ <span className="text-sm text-slate-500 ml-3 font-medium">({q.ratingScaleMax} Muc do danh gia)</span>
                      </div>
                    )}
                    {q.questionType === "NPS" && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-600 shadow-sm">{n}</div>)}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 mt-6 pt-4 text-sm gap-4">
                    <div className="flex flex-wrap items-center gap-6 text-slate-600">
                      <label className="flex items-center space-x-2 cursor-pointer font-medium hover:text-slate-800">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(qIndex, "isRequired", e.target.checked)} className="rounded text-blue-600 w-4 h-4 accent-blue-600 cursor-pointer" />
                        <span>Cau hoi bat buoc tra loi</span>
                      </label>
                      <label className="flex items-center space-x-2 font-medium">
                        <span>Trong so / Diem:</span>
                        <input type="number" value={q.weight} onChange={(e) => updateQuestion(qIndex, "weight", parseFloat(e.target.value))} className="w-16 border border-slate-300 rounded px-2 py-1 text-center bg-slate-50 focus:border-blue-500 outline-none" min="0" step="0.5" />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 md:border-l border-slate-200 md:pl-4">
                      <button onClick={() => moveQuestion(qIndex, -1)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100" title="Len tren"><ArrowUp className="w-5 h-5" /></button>
                      <button onClick={() => moveQuestion(qIndex, 1)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100" title="Xuong duoi"><ArrowDown className="w-5 h-5" /></button>
                      <button onClick={() => removeQuestion(qIndex)} className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 ml-2" title="Xoa cau hoi"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Preview */}
      <div className={`flex-1 md:w-1/2 flex flex-col bg-slate-50/50 rounded-xl overflow-hidden border border-slate-200 shadow-inner ${activeTab === "editor" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <h2 className="font-bold text-slate-600 text-sm flex items-center uppercase tracking-wider"><Eye className="w-4 h-4 mr-2 text-indigo-500"/> Live Preview</h2>
          <div className="flex md:hidden space-x-2">
            <button onClick={() => setActiveTab("editor")} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium shadow-sm">Chinh Sua</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-lg mx-auto space-y-4 pb-24">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                  </div>
                  <span className="text-xs font-black text-indigo-600 whitespace-nowrap">33%</span>
                </div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phieu Khao sat Preview</p>
                <p className="text-sm text-slate-500 mt-1">Mo phong giao dien hien thi thuc te - one question per view</p>
              </div>
            </div>
            {questions.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-5xl mb-4">📋</div>
                <p className="font-medium">Them cau hoi de xem preview</p>
              </div>
            ) : questions.map((q, idx) => {
              const catName = categories.find((c) => c.id === q.sectionId)?.name
              const opts = q.options || []
              return (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-5">
                    {catName && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full mb-3">
                        <Tag className="w-2.5 h-2.5" />{catName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-md shadow-indigo-500/30 flex-shrink-0">{idx+1}</div>
                      <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Cau hoi {idx+1}/{questions.length}</span>
                      {q.isRequired && <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">Bat buoc *</span>}
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800 leading-snug mb-4">
                      {q.questionText || "Chua nhap noi dung..."}
                    </h3>
                    {q.questionType === "MULTIPLE_CHOICE" && (
                      <div className="space-y-1.5">
                        {opts.slice(0,3).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 bg-white">
                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-700">{opt || `Tuy chon ${i+1}`}</span>
                          </div>
                        ))}
                        {opts.length > 3 && <p className="text-[10px] text-slate-400 pl-1">+{opts.length-3} lua chon khac...</p>}
                      </div>
                    )}
                    {q.questionType === "CHECKBOX" && (
                      <div className="space-y-1.5">
                        {opts.slice(0,3).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-slate-200 bg-white">
                            <div className="w-4 h-4 rounded-md border-2 border-slate-300 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-700">{opt || `Tuy chon ${i+1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.questionType === "TEXT" && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-slate-400 text-xs bg-slate-50/50">Nhap y kien cua ban...</div>
                    )}
                    {q.questionType === "RATING" && (
                      <div className="flex gap-1 justify-center py-2">
                        {[1,2,3,4,5].map(n => <span key={n} className="text-xl text-slate-200">★</span>)}
                      </div>
                    )}
                    {q.questionType === "NPS" && (
                      <div>
                        <div className="grid grid-cols-11 gap-1 mb-1.5">
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                            <div key={n} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-black border-2
                              ${n<=3?"border-red-300 bg-red-50 text-red-600":n<=6?"border-amber-300 bg-amber-50 text-amber-600":n<=8?"border-lime-300 bg-lime-50 text-lime-600":"border-emerald-300 bg-emerald-50 text-emerald-600"}`}
                            >{n}</div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                          <span>Rat khong HL</span><span>Rat hai long</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                    <div className="w-14 h-7 rounded-xl bg-slate-200 opacity-50" />
                    <div className="flex gap-1">
                      {questions.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all ${i===idx?"w-3 h-1.5 bg-indigo-600":"w-1.5 h-1.5 bg-slate-300"}`} />
                      ))}
                    </div>
                    <div className={`h-7 rounded-xl font-bold text-[11px] text-white flex items-center px-2.5 ${idx===questions.length-1?"bg-gradient-to-r from-emerald-500 to-teal-500":"bg-indigo-600"}`}>
                      {idx===questions.length-1?"Hoan tat":"Tiep theo →"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* FIXED ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.15)] flex justify-center z-50 md:left-64 lg:p-5">
        <div className="flex items-center space-x-2 md:space-x-4 max-w-[1600px] w-full justify-between">
          <Link href="/admin/surveys" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center md:mr-auto px-4">&larr;<span className="hidden sm:inline ml-2">Thoat ra ngoai</span></Link>
          <div className="flex md:hidden rounded-lg bg-slate-100 p-1 font-semibold text-sm">
            <button onClick={() => setActiveTab("editor")} className={`px-4 py-2 rounded-md ${activeTab==="editor"? "bg-white shadow": "text-slate-500"}`}>Edit</button>
            <button onClick={() => setActiveTab("preview")} className={`px-4 py-2 rounded-md ${activeTab==="preview"? "bg-white shadow": "text-slate-500"}`}>Review</button>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2.5 md:px-6 md:py-3 flex items-center bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 shadow-sm transition-colors justify-center">
              <Save className="w-5 h-5 md:mr-2" /><span className="hidden md:inline">Luu Nhap Tam Thoi</span>
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2.5 md:px-8 md:py-3 flex items-center bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-600/30 transition-all justify-center">
              <CloudUpload className="w-5 h-5 md:mr-2" /><span className="hidden md:inline">Publish Online Ngay</span><span className="md:hidden">Publish</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
