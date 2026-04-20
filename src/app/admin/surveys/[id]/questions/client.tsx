"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Save, CloudUpload, X, Tag, ListPlus, LayoutGrid, CheckSquare, Settings2 } from "lucide-react"
import { saveSurveyQuestionsAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ surveyPeriodId, initialQuestions, categories = [] }) {
  const [questions, setQuestions] = useState(
    initialQuestions.map((q) => {
      let parsedOptions = { choices: [], hasOther: false }
      try {
        const raw = q.options ? JSON.parse(q.options) : []
        if (Array.isArray(raw)) {
          parsedOptions = { choices: raw, hasOther: false }
        } else {
          parsedOptions = raw
        }
      } catch (e) {
        parsedOptions = { choices: [], hasOther: false }
      }
      return {
        ...q,
        options: parsedOptions,
        sectionId: q.section?.id || q.sectionId || ""
      }
    })
  )
  const [activeTab, setActiveTab] = useState("editor")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const addQuestion = (type) => {
    let initialOptions: any = []
    if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN") {
      initialOptions = { choices: ["Tùy chọn 1"], hasOther: false }
    } else if (type === "MC_GRID" || type === "CB_GRID") {
      initialOptions = { 
        rows: ["Tiêu chí 1", "Tiêu chí 2"], 
        columns: ["Kém", "Trung bình", "Khá", "Tốt", "Xuất sắc"] 
      }
    }

    const newQ = {
      id: `new_${Date.now()}`,
      code: `Q-${Date.now()}`,
      questionText: "",
      questionType: type,
      isRequired: true,
      options: initialOptions,
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
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices[optIndex] = value
      setQuestions(newQs)
    }
  }

  const addOption = (qIndex) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices.push(`Tùy chọn ${q.options.choices.length + 1}`)
      setQuestions(newQs)
    }
  }

  const removeOption = (qIndex, optIndex) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices = q.options.choices.filter((_, i) => i !== optIndex)
      setQuestions(newQs)
    }
  }

  const toggleOther = (qIndex) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      q.options.hasOther = !q.options.hasOther
      setQuestions(newQs)
    }
  }

  const updateGridOption = (qIndex, part, index, value) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part][index] = value
      setQuestions(newQs)
    }
  }

  const addGridItem = (qIndex, part) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part].push(part === "rows" ? `Tiêu chí ${q.options.rows.length + 1}` : `Cột ${q.options.columns.length + 1}`)
      setQuestions(newQs)
    }
  }

  const removeGridItem = (qIndex, part, index) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part] = q.options[part].filter((_, i) => i !== index)
      setQuestions(newQs)
    }
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
    // Map options back to stringified JSON for the backend
    const questionsToSave = questions.map(q => ({
      ...q,
      options: JSON.stringify(q.options)
    }))
    const res = await saveSurveyQuestionsAction(surveyPeriodId, questionsToSave)
    setSaving(false)
    if (res?.success) {
      if (publish) {
        router.push(`/admin/surveys/${surveyPeriodId}/publish`)
      } else {
        alert("Đã lưu bản nháp thành công!")
      }
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full gap-6 font-outfit">
      
      {/* LEFT PANE: EDITOR */}
      <div className={`flex-1 md:w-1/2 flex flex-col ${activeTab === "preview" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 mb-6 sticky top-0 z-30 w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
          <h2 className="font-black text-slate-800 text-lg mr-4">Trình thiết kế</h2>
          <div className="flex space-x-2">
            <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-100 flex items-center gap-1.5 transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Trắc nghiệm
            </button>
            <button onClick={() => addQuestion("MC_GRID")} className="px-4 py-2 bg-violet-50 text-violet-700 rounded-xl text-xs font-black hover:bg-violet-100 flex items-center gap-1.5 border border-violet-100 transition-all active:scale-95">
              <LayoutGrid className="w-4 h-4" /> Lưới Radio
            </button>
            <button onClick={() => addQuestion("CB_GRID")} className="px-4 py-2 bg-pink-50 text-pink-700 rounded-xl text-xs font-black hover:bg-pink-100 flex items-center gap-1.5 border border-pink-100 transition-all active:scale-95">
              <CheckSquare className="w-4 h-4" /> Lưới Checkbox
            </button>
            <button onClick={() => addQuestion("TEXT")} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black hover:bg-indigo-100 flex items-center gap-1.5 transition-all active:scale-95">
              <Plus className="w-4 h-4" /> Tự luận
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-40 pr-2 custom-scrollbar">
          {questions.length === 0 ? (
            <div className="text-center p-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100 text-slate-300">
              <Plus className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="font-black text-xl">Bắt đầu thiết kế bảng hỏi của bạn</p>
            </div>
          ) : (
            questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative group animate-in fade-in slide-in-from-bottom-4">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all border-r border-slate-100 cursor-move">
                  <GripVertical className="w-5 h-5 text-slate-300" />
                </div>
                <div className="p-8 md:pl-14">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                        placeholder="Nhập nội dung câu hỏi tại đây..."
                        className="w-full text-xl font-black text-slate-900 border-b-2 border-transparent hover:border-slate-100 focus:border-indigo-600 outline-none pb-2 transition-all bg-transparent"
                      />
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        <label className="flex items-center gap-2">
                          <span>Mã:</span>
                          <input type="text" value={q.code} onChange={e => updateQuestion(qIndex, "code", e.target.value)} className="border-b focus:border-indigo-600 outline-none w-32 bg-slate-50 px-2 py-1 rounded text-slate-900" />
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                          className="bg-indigo-600 text-white border-none rounded-lg px-3 py-1.5 font-black outline-none cursor-pointer hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                        >
                          <option value="TEXT">Tự luận</option>
                          <option value="MULTIPLE_CHOICE">Trắc nghiệm Radio</option>
                          <option value="CHECKBOX">Trắc nghiệm Checkbox</option>
                          <option value="MC_GRID">Lưới Radio</option>
                          <option value="CB_GRID">Lưới Checkbox</option>
                          <option value="RATING">Đánh giá sao</option>
                          <option value="NPS">Khảo sát NPS (0-10)</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Danh mục:</span>
                          <select
                            value={q.sectionId || ""}
                            onChange={(e) => updateQuestion(qIndex, "sectionId", e.target.value)}
                            className="bg-slate-100 border-none rounded-lg px-3 py-1.5 font-black outline-none cursor-pointer text-slate-700 max-w-[200px]"
                          >
                            <option value="">-- Chưa phân loại --</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Options Editor */}
                  <div className="space-y-4">
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                      <div className="space-y-3 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tùy chọn trả lời</h4>
                        {(q.options.choices || []).map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-3 group/opt animate-in fade-in slide-in-from-left-2">
                            <div className={`w-5 h-5 border-2 border-slate-200 bg-white shadow-inner flex-shrink-0 ${q.questionType === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-lg"}`} />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold flex-1 outline-none focus:border-indigo-500 focus:shadow-md transition-all"
                              placeholder={`Tùy chọn ${optIndex + 1}`}
                            />
                            <button onClick={() => removeOption(qIndex, optIndex)} className="text-red-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600 transition-all p-2 bg-white rounded-xl shadow-sm border border-slate-100"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                        
                        <div className="flex flex-wrap items-center gap-4 mt-6">
                           <button onClick={() => addOption(qIndex)} className="text-xs font-black text-indigo-600 hover:bg-white hover:shadow-md border border-indigo-100 px-5 py-2.5 rounded-xl flex items-center transition-all active:scale-95"><Plus className="w-4 h-4 mr-1.5"/> Thêm Tùy Chọn</button>
                           
                           {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX") && (
                             <button onClick={() => toggleOther(qIndex)} 
                               className={`text-xs font-black px-5 py-2.5 rounded-xl border flex items-center transition-all active:scale-95 ${q.options.hasOther ? "bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-200" : "bg-white text-slate-400 border-slate-100 hover:border-amber-300 hover:text-amber-600"}`}>
                               <Settings2 className="w-4 h-4 mr-1.5" />
                               {q.options.hasOther ? "Đã bật 'Khác'" : "Bật tùy chọn 'Khác'"}
                             </button>
                           )}
                        </div>
                      </div>
                    )}

                    {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-3xl border border-slate-100 ${q.questionType === "CB_GRID" ? "bg-pink-50/20" : "bg-indigo-50/20"}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <ListPlus className={`w-4 h-4 ${q.questionType === "CB_GRID" ? "text-pink-500" : "text-indigo-500"}`} />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hàng (Tiêu chí)</h4>
                          </div>
                          <div className="space-y-2">
                            {q.options.rows?.map((row, rIndex) => (
                              <div key={rIndex} className="flex items-center gap-2 group/grid animate-in fade-in slide-in-from-left-2">
                                <input type="text" value={row} onChange={e => updateGridOption(qIndex, "rows", rIndex, e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold focus:border-indigo-500 outline-none shadow-sm" />
                                <button onClick={() => removeGridItem(qIndex, "rows", rIndex)} className="p-2 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "rows")} className={`w-full text-[10px] font-black border-2 border-dashed rounded-xl py-2.5 transition-all mt-2 uppercase tracking-widest bg-white/50 ${q.questionType === "CB_GRID" ? "text-pink-600 border-pink-100 hover:bg-pink-600 hover:text-white" : "text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white"}`}>+ Thêm Hàng</button>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <LayoutGrid className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cột (Mức độ)</h4>
                          </div>
                          <div className="space-y-2">
                            {q.options.columns?.map((col, cIndex) => (
                              <div key={cIndex} className="flex items-center gap-2 group/grid animate-in fade-in slide-in-from-right-2">
                                <input type="text" value={col} onChange={e => updateGridOption(qIndex, "columns", cIndex, e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold focus:border-emerald-500 outline-none shadow-sm" />
                                <button onClick={() => removeGridItem(qIndex, "columns", cIndex)} className="p-2 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "columns")} className="w-full text-[10px] font-black text-emerald-600 hover:text-white hover:bg-emerald-600 border-2 border-dashed border-emerald-100 rounded-xl py-2.5 transition-all mt-2 uppercase tracking-widest bg-white/50 shadow-sm">+ Thêm Cột</button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {q.questionType === "TEXT" && <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-center italic text-sm">Văn bản trả lời tự luận sẽ hiển thị tại đây...</div>}
                    {q.questionType === "RATING" && <div className="flex items-center justify-center gap-4 text-amber-400 text-5xl py-4 select-none">★ ★ ★ ★ ★</div>}
                    {q.questionType === "NPS" && <div className="flex items-center justify-center gap-1.5 flex-wrap py-4">{[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-10 h-10 rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center text-sm font-black text-slate-400 shadow-sm">{n}</div>)}</div>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between border-t border-slate-50 mt-8 pt-6 gap-6">
                    <div className="flex flex-wrap items-center gap-8 text-xs font-black uppercase tracking-tighter text-slate-500">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(qIndex, "isRequired", e.target.checked)} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-0 cursor-pointer transition-all" />
                        <span className="group-hover:text-slate-900 transition-colors">Bắt buộc trả lời</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <span>Trọng số:</span>
                        <input type="number" value={q.weight} onChange={(e) => updateQuestion(qIndex, "weight", parseFloat(e.target.value))} className="w-16 border-2 border-slate-100 rounded-xl px-3 py-1.5 text-center bg-slate-50 focus:border-indigo-600 outline-none font-black text-slate-900 shadow-inner" min="0" step="0.5" />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveQuestion(qIndex, -1)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all active:scale-95"><ArrowUp className="w-5 h-5" /></button>
                      <button onClick={() => moveQuestion(qIndex, 1)} className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all active:scale-95"><ArrowDown className="w-5 h-5" /></button>
                      <div className="w-px h-6 bg-slate-100 mx-2" />
                      <button onClick={() => removeQuestion(qIndex)} className="p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all active:scale-95 shadow-sm border border-red-50"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: PREVIEW */}
      <div className={`flex-1 md:w-1/2 flex flex-col bg-slate-50/30 rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner ${activeTab === "editor" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 sticky top-0 z-20">
          <h2 className="font-black text-slate-700 text-xs flex items-center uppercase tracking-[0.2em]"><Eye className="w-5 h-5 mr-3 text-indigo-500"/> Live Preview</h2>
        </div>
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-lg mx-auto space-y-6 pb-40">
            {questions.map((q, idx) => {
              const opts = q.options || { choices: [], hasOther: false }
              const choices = opts.choices || []
              return (
                <div key={idx} className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-lg shadow-indigo-100">{(idx+1).toString().padStart(2, '0')}</div>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">CÂU HỎI {idx+1}/{questions.length}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug mb-6">{q.questionText || "Nội dung câu hỏi đang được thiết kế..."}</h3>
                    
                    {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                      <div className="overflow-x-auto -mx-8 px-8">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-50">
                              <th className="p-3 text-[9px] font-black text-slate-400 text-left uppercase tracking-tighter w-1/3">Tiêu chí</th>
                              {opts.columns?.map((col, i) => <th key={i} className="p-3 text-[9px] font-black text-slate-400 text-center uppercase tracking-tighter">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {opts.rows?.map((row, rIndex) => (
                              <tr key={rIndex}>
                                <td className="p-3 py-4 text-xs font-bold text-slate-700 leading-tight">{row}</td>
                                {opts.columns?.map((_, cIndex) => (
                                  <td key={cIndex} className="p-3 text-center">
                                    <div className={`w-5 h-5 border-2 border-slate-100 mx-auto bg-white shadow-sm ${q.questionType === "CB_GRID" ? "rounded-lg" : "rounded-full"}`} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX") && (
                      <div className="space-y-2.5">
                        {choices.map((o,i)=><div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50"><div className={`w-5 h-5 border-2 border-slate-200 transition-all ${q.questionType === "CHECKBOX" ? "rounded-lg" : "rounded-full"}`} /><span className="text-sm font-bold text-slate-700">{o}</span></div>)}
                        {opts.hasOther && (
                          <div className="flex flex-col gap-2 p-4 rounded-2xl border-2 border-amber-50 bg-amber-50/30">
                            <div className="flex items-center gap-4">
                              <div className={`w-5 h-5 border-2 border-amber-300 bg-white ${q.questionType === "CHECKBOX" ? "rounded-lg" : "rounded-full"}`} />
                              <span className="text-sm font-black text-amber-700">Lựa chọn khác (Other)</span>
                            </div>
                            <div className="ml-9 mt-1 border-b border-amber-200 text-[10px] text-amber-400 font-bold italic">Văn bản mô tả nhập tại đây...</div>
                          </div>
                        )}
                      </div>
                    )}

                    {q.questionType === "TEXT" && <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 h-24 flex items-center justify-center text-slate-300 text-xs font-bold italic">Khách hàng sẽ nhập ý kiến tại đây...</div>}
                    {q.questionType === "RATING" && <div className="flex justify-center text-amber-400 text-3xl py-4 group cursor-default tracking-[0.2em]">★ ★ ★ ★ ★</div>}
                    {q.questionType === "NPS" && <div className="flex items-center justify-between gap-1 mt-2">{[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="flex-1 aspect-square rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">{n}</div>)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 p-6 flex justify-center z-40 md:left-64">
        <div className="flex items-center space-x-4">
          <button onClick={() => handleSave(false)} disabled={saving} className="px-8 py-4 flex items-center bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 active:scale-95 transition-all shadow-lg shadow-slate-100">
            <Save className="w-5 h-5 mr-2 text-slate-400" /> Lưu Nháp
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="px-12 py-4 flex items-center bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl shadow-indigo-200">
            <CloudUpload className="w-5 h-5 mr-3" /> Xuất Bản Form
          </button>
        </div>
      </div>
    </div>
  )
}
