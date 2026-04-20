"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Save, CloudUpload, X, Tag, ListPlus, LayoutGrid } from "lucide-react"
import { saveSurveyQuestionsAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ surveyPeriodId, initialQuestions, categories = [] }) {
  const [questions, setQuestions] = useState(
    initialQuestions.map((q) => {
      let parsedOptions = []
      try {
        parsedOptions = q.options ? JSON.parse(q.options) : []
      } catch (e) {
        parsedOptions = []
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
    let initialOptions = []
    if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN") {
      initialOptions = ["Tùy chọn 1"]
    } else if (type === "MC_GRID") {
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
    if (Array.isArray(newQs[qIndex].options)) {
      newQs[qIndex].options[optIndex] = value
    }
    setQuestions(newQs)
  }

  const addOption = (qIndex) => {
    const newQs = [...questions]
    if (Array.isArray(newQs[qIndex].options)) {
      newQs[qIndex].options.push(`Tùy chọn ${newQs[qIndex].options.length + 1}`)
    }
    setQuestions(newQs)
  }

  const removeOption = (qIndex, optIndex) => {
    const newQs = [...questions]
    if (Array.isArray(newQs[qIndex].options)) {
      newQs[qIndex].options = newQs[qIndex].options.filter((_, i) => i !== optIndex)
    }
    setQuestions(newQs)
  }

  const updateGridOption = (qIndex, part, index, value) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.questionType === "MC_GRID" && q.options[part]) {
      q.options[part][index] = value
      setQuestions(newQs)
    }
  }

  const addGridItem = (qIndex, part) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.questionType === "MC_GRID" && q.options[part]) {
      q.options[part].push(part === "rows" ? `Tiêu chí ${q.options.rows.length + 1}` : `Cột ${q.options.columns.length + 1}`)
      setQuestions(newQs)
    }
  }

  const removeGridItem = (qIndex, part, index) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.questionType === "MC_GRID" && q.options[part]) {
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
    const res = await saveSurveyQuestionsAction(surveyPeriodId, questions)
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
    <div className="flex flex-col md:flex-row h-full w-full gap-6">
      
      {/* LEFT PANE */}
      <div className={`flex-1 md:w-1/2 flex flex-col ${activeTab === "preview" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-0 z-10 w-full overflow-x-auto whitespace-nowrap scrollbar-hide">
          <h2 className="font-bold text-slate-800 text-lg mr-4">Trình thiết kế (Builder)</h2>
          <div className="flex space-x-2">
            <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm font-semibold hover:bg-blue-100 flex items-center gap-1 transition-colors">
              <Plus className="w-4 h-4" /> Trắc nghiệm
            </button>
            <button onClick={() => addQuestion("MC_GRID")} className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded text-sm font-semibold hover:bg-violet-100 flex items-center gap-1 border border-violet-100 transition-colors">
              <LayoutGrid className="w-4 h-4" /> Lưới trắc nghiệm
            </button>
            <button onClick={() => addQuestion("TEXT")} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded text-sm font-semibold hover:bg-indigo-100 flex items-center gap-1 transition-colors">
              <Plus className="w-4 h-4" /> Tự luận
            </button>
            <button onClick={() => addQuestion("RATING")} className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded text-sm font-semibold hover:bg-amber-100 flex items-center gap-1 transition-colors">
              <Plus className="w-4 h-4" /> Star Rating
            </button>
            <button onClick={() => addQuestion("NPS")} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded text-sm font-semibold hover:bg-emerald-100 flex items-center gap-1 transition-colors">
              <Plus className="w-4 h-4" /> NPS Score
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-32 pr-2 custom-scrollbar">
          {questions.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
              Bạn chưa cấu trúc câu hỏi nào. Bấm nút màu xanh phía trên để bắt đầu thêm mới!
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
                        placeholder="Nhập tiêu đề hoặc Mô tả câu hỏi tại đây..."
                        className="w-full text-lg font-semibold border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none pb-1 transition-colors bg-transparent"
                      />
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-500 font-medium">
                        <label className="flex items-center space-x-1">
                          <span className="text-slate-400">Mã:</span>
                          <input type="text" value={q.code} onChange={e => updateQuestion(qIndex, "code", e.target.value)} className="border-b focus:border-blue-500 outline-none w-28 bg-transparent text-slate-800" />
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded p-1.5 text-sm font-bold outline-blue-500 cursor-pointer text-slate-700"
                        >
                          <option value="TEXT">Tự luận (Text)</option>
                          <option value="MULTIPLE_CHOICE">Trắc nghiệm Radio</option>
                          <option value="CHECKBOX">Trắc nghiệm Checkbox</option>
                          <option value="DROPDOWN">Menu Dropdown</option>
                          <option value="MC_GRID">Lưới trắc nghiệm (Grid)</option>
                          <option value="RATING">Đánh giá sao (Rating)</option>
                          <option value="NPS">Khảo sát NPS (0-10)</option>
                        </select>

                        <label className="flex items-center space-x-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="text-slate-400">Danh mục:</span>
                          <select
                            value={q.sectionId || ""}
                            onChange={(e) => updateQuestion(qIndex, "sectionId", e.target.value)}
                            className="bg-indigo-50 border border-indigo-200 rounded p-1.5 text-xs font-bold outline-indigo-500 cursor-pointer text-indigo-700 max-w-[200px]"
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
                  <div className="mt-4">
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                      <div className="space-y-2 max-w-lg">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-3 group/opt w-full">
                            <div className={`w-4 h-4 border border-slate-300 bg-slate-50 flex-shrink-0 ${q.questionType === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-sm"}`} />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none flex-1 pb-1 text-sm font-medium transition-colors bg-transparent"
                              placeholder={`Tùy chọn ${optIndex + 1}`}
                            />
                            <button onClick={() => removeOption(qIndex, optIndex)} className="text-red-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600 transition-opacity p-1"><X className="w-5 h-5" /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(qIndex)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg mt-3 flex items-center transition-all shadow-sm"><Plus className="w-3.5 h-3.5 mr-1"/> Thêm tùy chọn</button>
                      </div>
                    )}

                    {q.questionType === "MC_GRID" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        {/* Rows Editor */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ListPlus className="w-4 h-4 text-violet-500" />
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Hàng (Tiêu chí đánh giá)</h4>
                          </div>
                          <div className="space-y-2">
                            {q.options.rows?.map((row, rIndex) => (
                              <div key={rIndex} className="flex items-center gap-2 group/grid">
                                <span className="text-[10px] font-bold text-slate-400 min-w-[20px]">{rIndex+1}.</span>
                                <input type="text" value={row} onChange={e => updateGridOption(qIndex, "rows", rIndex, e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-violet-500 outline-none" />
                                <button onClick={() => removeGridItem(qIndex, "rows", rIndex)} className="p-1.5 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "rows")} className="text-[10px] font-black text-violet-600 hover:text-white hover:bg-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 transition-all mt-2 uppercase tracking-tighter bg-white shadow-sm hover:shadow-violet-200">+ Thêm Hàng</button>
                          </div>
                        </div>
                        {/* Columns Editor */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <LayoutGrid className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Cột (Mức độ đánh giá)</h4>
                          </div>
                          <div className="space-y-2">
                            {q.options.columns?.map((col, cIndex) => (
                              <div key={cIndex} className="flex items-center gap-2 group/grid">
                                <span className="text-[10px] font-bold text-slate-400 min-w-[20px]">{String.fromCharCode(65+cIndex)}</span>
                                <input type="text" value={col} onChange={e => updateGridOption(qIndex, "columns", cIndex, e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 outline-none" />
                                <button onClick={() => removeGridItem(qIndex, "columns", cIndex)} className="p-1.5 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "columns")} className="text-[10px] font-black text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200 rounded-lg px-3 py-1.5 transition-all mt-2 uppercase tracking-tighter bg-white shadow-sm hover:shadow-emerald-200">+ Thêm Cột</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {q.questionType === "TEXT" && (
                      <div className="border-b-2 border-dashed border-slate-300 pb-2 text-slate-400 w-full sm:w-2/3 italic text-sm">Văn bản bình luận dài... (Phụ huynh tự nhập)</div>
                    )}
                    {q.questionType === "RATING" && (
                      <div className="flex items-center text-amber-400 text-3xl">
                        ★ ★ ★ ★ ★ <span className="text-xs text-slate-400 ml-3 font-semibold uppercase">({q.ratingScaleMax} Mức độ đánh giá)</span>
                      </div>
                    )}
                    {q.questionType === "NPS" && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-black text-slate-600 shadow-sm">{n}</div>)}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 mt-6 pt-4 text-xs gap-4">
                    <div className="flex flex-wrap items-center gap-6 text-slate-600">
                      <label className="flex items-center space-x-2 cursor-pointer font-bold hover:text-slate-900 transition-colors">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(qIndex, "isRequired", e.target.checked)} className="rounded text-blue-600 w-4 h-4 accent-blue-600 cursor-pointer shadow-sm" />
                        <span>Câu hỏi bắt buộc trả lời</span>
                      </label>
                      <label className="flex items-center space-x-2 font-bold group">
                        <span className="text-slate-400 group-hover:text-slate-600">Trọng số / Điểm:</span>
                        <input type="number" value={q.weight} onChange={(e) => updateQuestion(qIndex, "weight", parseFloat(e.target.value))} className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center bg-slate-50 focus:border-blue-500 outline-none transition-all shadow-inner" min="0" step="0.5" />
                      </label>
                    </div>
                    <div className="flex items-center space-x-1.5 md:border-l border-slate-200 md:pl-4">
                      <button onClick={() => moveQuestion(qIndex, -1)} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100" title="Lên trên"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => moveQuestion(qIndex, 1)} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100" title="Xuống dưới"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => removeQuestion(qIndex)} className="p-2 text-red-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-all ml-2" title="Xóa câu hỏi"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Preview */}
      <div className={`flex-1 md:w-1/2 flex flex-col bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner ${activeTab === "editor" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
             <h2 className="font-bold text-slate-700 text-xs flex items-center uppercase tracking-[0.15em]"><Eye className="w-4 h-4 mr-2 text-indigo-500"/> Live Preview</h2>
          </div>
          <div className="flex md:hidden space-x-2">
            <button onClick={() => setActiveTab("editor")} className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-bold shadow-md active:scale-95 transition-transform">Chỉnh Sửa</button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="max-w-lg mx-auto space-y-4 pb-32">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  </div>
                  <span className="text-xs font-black text-indigo-600 whitespace-nowrap">33%</span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">PHIẾU KHẢO SÁT PREVIEW</p>
                <p className="text-[11px] text-slate-500 mt-1.5 font-medium italic">Mô phỏng giao diện hiển thị thực tế - mỗi câu hỏi hiển thị một lượt</p>
              </div>
            </div>
            {questions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                <div className="text-5xl mb-4 grayscale opacity-30">📋</div>
                <p className="font-bold text-slate-400 text-sm">Thêm câu hỏi để xem bản xem trước</p>
              </div>
            ) : questions.map((q, idx) => {
              const catName = categories.find((c) => c.id === q.sectionId)?.name
              const opts = q.options || []
              return (
                <div key={idx} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                  <div className="p-5">
                    {catName && (
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3 uppercase tracking-tighter">
                        <Tag className="w-2.5 h-2.5" />{catName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">{(idx+1).toString().padStart(2, '0')}</div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">CÂU HỎI {idx+1}/{questions.length}</span>
                      {q.isRequired && <span className="ml-auto text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">BẮT BUỘC *</span>}
                    </div>
                    <h3 className="text-[15px] font-black text-slate-800 leading-snug mb-5">
                      {q.questionText || "Chưa nhập nội dung câu hỏi..."}
                    </h3>
                    
                    {q.questionType === "MULTIPLE_CHOICE" && (
                      <div className="space-y-2">
                        {opts.slice(0,4).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/30">
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex-shrink-0" />
                            <span className="text-xs font-bold text-slate-700">{opt || `Tùy chọn ${i+1}`}</span>
                          </div>
                        ))}
                        {opts.length > 4 && <p className="text-[10px] font-bold text-slate-400 pl-2">+{opts.length-4} lựa chọn khác...</p>}
                      </div>
                    )}

                    {q.questionType === "MC_GRID" && (
                      <div className="overflow-x-auto -mx-5 px-5">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 border-b-2 border-slate-100 text-[9px] font-black text-slate-400 text-left uppercase">Tiêu chí</th>
                              {q.options.columns?.map((col, i) => (
                                <th key={i} className="p-2 border-b-2 border-slate-100 text-[9px] font-black text-slate-400 text-center uppercase">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {q.options.rows?.map((row, rIndex) => (
                              <tr key={rIndex} className="hover:bg-slate-50/50">
                                <td className="p-2 py-3 border-b border-slate-50 text-[11px] font-bold text-slate-700 leading-tight">{row}</td>
                                {q.options.columns?.map((_, cIndex) => (
                                  <td key={cIndex} className="p-2 py-3 border-b border-slate-50 text-center">
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 mx-auto bg-white shadow-inner" />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="mt-3 text-[10px] italic text-slate-400 font-medium text-center">Cuộn ngang để xem tất cả mức độ đánh giá</p>
                      </div>
                    )}

                    {q.questionType === "CHECKBOX" && (
                      <div className="space-y-2">
                        {opts.slice(0,4).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/30">
                            <div className="w-5 h-5 rounded-lg border-2 border-slate-300 bg-white flex-shrink-0" />
                            <span className="text-xs font-bold text-slate-700">{opt || `Tùy chọn ${i+1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.questionType === "TEXT" && (
                      <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-slate-400 text-[11px] font-medium bg-slate-50/50 italic">Nhập ý kiến hoặc câu trả lời của bạn tại đây...</div>
                    )}
                    {q.questionType === "RATING" && (
                      <div className="flex gap-1.5 justify-center py-4 bg-slate-50/30 rounded-2xl border border-slate-100">
                        {[1,2,3,4,5].map(n => <span key={n} className="text-2xl text-amber-100 drop-shadow-sm">★</span>)}
                      </div>
                    )}
                    {q.questionType === "NPS" && (
                      <div>
                        <div className="grid grid-cols-11 gap-1 mb-2">
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                            <div key={n} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-black border-2 shadow-sm
                              ${n<=3?"border-red-200 bg-red-50 text-red-600":n<=6?"border-amber-200 bg-amber-50 text-amber-600":n<=8?"border-lime-200 bg-lime-50 text-lime-600":"border-emerald-200 bg-emerald-50 text-emerald-600"}`}
                            >{n}</div>
                          ))}
                        </div>
                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          <span>Rất không hài lòng</span><span>Rất hài lòng</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/30">
                    <div className="w-16 h-8 rounded-2xl bg-white border border-slate-100 opacity-50 shadow-sm" />
                    <div className="flex gap-1.5 items-center">
                      {questions.slice(0, 5).map((_, i) => (
                        <div key={i} className={`rounded-full transition-all ${i===idx?"w-4 h-2 bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]":"w-2 h-2 bg-slate-200"}`} />
                      ))}
                      {questions.length > 5 && <span className="text-[10px] text-slate-300">...</span>}
                    </div>
                    <div className={`h-9 rounded-2xl font-black text-[11px] text-white flex items-center px-4 shadow-lg transition-all active:scale-95 ${idx===questions.length-1?"bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30":"bg-indigo-600 shadow-indigo-500/40"}`}>
                      {idx===questions.length-1?"HOÀN TẤT":"TIẾP THEO →"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* FIXED ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.1)] flex justify-center z-50 md:left-64 lg:p-6 transition-all duration-300">
        <div className="flex items-center space-x-2 md:space-x-6 max-w-[1600px] w-full justify-between">
          <Link href="/admin/surveys" className="text-slate-400 hover:text-indigo-600 font-black text-sm uppercase tracking-widest flex items-center md:mr-auto px-4 transition-colors group">
            <span className="mr-2 group-hover:-translate-x-2 transition-transform">&larr;</span>
            <span className="hidden sm:inline">Thoát ra ngoài</span>
          </Link>
          <div className="flex md:hidden rounded-2xl bg-slate-100/80 p-1 font-bold text-xs">
            <button onClick={() => setActiveTab("editor")} className={`px-5 py-2 rounded-xl transition-all ${activeTab==="editor"? "bg-white text-indigo-600 shadow-md": "text-slate-500"}`}>Cấu trúc</button>
            <button onClick={() => setActiveTab("preview")} className={`px-5 py-2 rounded-xl transition-all ${activeTab==="preview"? "bg-white text-indigo-600 shadow-md": "text-slate-500"}`}>Xem trước</button>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => handleSave(false)} disabled={saving} className="px-5 py-3 md:px-8 md:py-4 flex items-center bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50 justify-center">
              <Save className="w-5 h-5 md:mr-3" /><span className="hidden md:inline uppercase tracking-widest">Lưu Nháp Tạm Thời</span>
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-3 md:px-10 md:py-4 flex items-center bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-500 shadow-xl shadow-green-600/30 transition-all active:scale-95 disabled:opacity-50 justify-center min-w-[120px]">
              <CloudUpload className="w-5 h-5 md:mr-3" /><span className="hidden md:inline uppercase tracking-widest">Publish Ngay Lập Tức</span><span className="md:hidden">PUBLISH</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
