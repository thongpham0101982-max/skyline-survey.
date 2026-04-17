"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, ArrowUp, ArrowDown, Check, Eye, Save, CloudUpload, X, Tag, Settings, Type, ListChecks, CheckSquare, ChevronDown, Star, MessageSquare } from "lucide-react"
import { saveSurveyQuestionsAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ surveyPeriodId, initialQuestions }: any) {
  const [questions, setQuestions] = useState<any[]>(
    initialQuestions.map((q: any) => ({
      ...q,
      category: q.section?.name || "",
      options: q.options ? JSON.parse(q.options) : []
    }))
  )
  const [activeTab, setActiveTab] = useState("editor")
  const [saving, setSaving] = useState(false)

  const addQuestion = (type: string) => {
    const lastCategory = questions.length > 0 ? questions[questions.length - 1].category : ""
    const newQ = {
      id: `new_${Date.now()}`,
      code: `Q-${Date.now()}`,
      questionText: "",
      category: lastCategory,
      questionType: type,
      isRequired: true,
      options: type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN" ? ["Tùy chọn 1"] : [],
      ratingScaleMin: 1,
      ratingScaleMax: type === "NPS" ? 10 : 5,
      weight: 1
    }
    setQuestions([...questions, newQ])
  }

  const updateQuestion = (index: number, key: string, value: any) => {
    const newQs = [...questions]
    newQs[index][key] = value
    setQuestions(newQs)
  }

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQs = [...questions]
    newQs[qIndex].options[optIndex] = value
    setQuestions(newQs)
  }

  const addOption = (qIndex: number) => {
    const newQs = [...questions]
    newQs[qIndex].options.push(`Tùy chọn ${newQs[qIndex].options.length + 1}`)
    setQuestions(newQs)
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions]
    newQs[qIndex].options = newQs[qIndex].options.filter((_: any, i: number) => i !== optIndex)
    setQuestions(newQs)
  }

  const moveQuestion = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= questions.length) return
    const newQs = [...questions]
    const temp = newQs[index]
    newQs[index] = newQs[index + dir]
    newQs[index + dir] = temp
    setQuestions(newQs)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async (publish = false) => {
    setSaving(true)
    const res = await saveSurveyQuestionsAction(surveyPeriodId, questions)
    setSaving(false)
    if (res?.success) {
      alert(publish ? "Đã xuất bản (Publish) bộ câu hỏi thành công!" : "Lưu bản nháp thành công!")
    }
  }

  const previewCategories = questions.reduce((acc: any, q: any) => {
    const cat = q.category && q.category.trim() !== "" ? q.category.trim() : "Câu hỏi chung"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(q)
    return acc
  }, {})

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] w-full gap-8">
      
      {/* LEFT PANE: Editor */}
      <div className={`flex-1 md:w-[55%] flex flex-col ${activeTab === 'preview' ? 'hidden md:flex' : 'flex'} h-full relative`}>
        
        {/* Toolbar Restyled to wrap elements beautifully */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0 z-10 w-full gap-4">
          <h2 className="font-extrabold text-slate-800 text-xl tracking-tight hidden sm:block">Khung Thiết Kế</h2>
          <div className="flex flex-wrap gap-2">
             <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition shadow-sm border border-indigo-100"><Plus className="w-4 h-4 mr-1"/> Trắc nghiệm</button>
             <button onClick={() => addQuestion("CHECKBOX")} className="flex items-center px-4 py-2 bg-sky-50 text-sky-700 rounded-lg text-sm font-bold hover:bg-sky-100 transition shadow-sm border border-sky-100"><CheckSquare className="w-4 h-4 mr-1"/> Hộp kiểm</button>
             <button onClick={() => addQuestion("TEXT")} className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition shadow-sm border border-slate-200"><Type className="w-4 h-4 mr-1"/> Tự luận</button>
             <button onClick={() => addQuestion("RATING")} className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-100 transition shadow-sm border border-amber-100"><Star className="w-4 h-4 mr-1"/> Rating</button>
             <button onClick={() => addQuestion("NPS")} className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition shadow-sm border border-emerald-100"><MessageSquare className="w-4 h-4 mr-1"/> NPS Thang 10</button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-32 pr-2 no-scrollbar">
          {questions.length === 0 ? (
             <div className="text-center p-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-300 text-slate-500 flex flex-col items-center">
               <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-4"><ListChecks className="w-10 h-10" /></div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có câu hỏi nào</h3>
               <p className="text-sm">Bấm vào các nút công cụ phía trên để bắt đầu thêm câu hỏi vào Form.</p>
             </div>
          ) : (
            questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden relative group transition-all duration-300 hover:border-indigo-400 hover:shadow-indigo-100 form-group">
                {/* Visual Category Label */}
                <div className="bg-slate-50 border-b border-slate-100 p-3 flex flex-wrap items-center justify-between gap-4">
                   <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                     <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><Tag className="w-4 h-4" /></span>
                     <input 
                       type="text" 
                       value={q.category} 
                       onChange={(e) => updateQuestion(qIndex, 'category', e.target.value)}
                       placeholder="Nhập tên Nhóm/Danh mục (VD: CL Giáo Viên)" 
                       className="bg-transparent outline-none text-sm font-bold text-slate-700 placeholder-slate-400 w-full sm:w-64 border-b border-transparent focus:border-indigo-400"
                     />
                   </div>
                   
                   {/* Utilities */}
                   <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm ml-auto">
                      <select 
                        value={q.questionType} 
                        onChange={(e) => updateQuestion(qIndex, 'questionType', e.target.value)}
                        className="bg-transparent text-sm font-bold outline-none cursor-pointer text-indigo-700 w-full"
                      >
                        <option value="TEXT">Tự luận ngắn</option>
                        <option value="MULTIPLE_CHOICE">Trắc nghiệm dạng Radio</option>
                        <option value="CHECKBOX">Trắc nghiệm Checklist</option>
                        <option value="DROPDOWN">Menu thả xuống Dropdown</option>
                        <option value="RATING">Đánh giá sao (Rating)</option>
                        <option value="NPS">Khảo sát vòng tròn (NPS)</option>
                      </select>
                   </div>
                </div>

                <div className="p-6 sm:p-8">
                  {/* Main Question Input */}
                  <div className="mb-6">
                    <textarea 
                      value={q.questionText} 
                      onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                      placeholder="Nhập nội dung câu hỏi tại đây..." 
                      className="w-full text-xl sm:text-2xl font-semibold border-b-2 border-slate-200 hover:border-indigo-300 focus:border-indigo-600 outline-none pb-2 transition-colors bg-transparent resize-none overflow-hidden"
                      rows={1}
                      onInput={(e) => { (e.target as HTMLTextAreaElement).style.height = 'auto'; (e.target as HTMLTextAreaElement).style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px'; }}
                    />
                    <div className="mt-3 flex items-center">
                       <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">Mã Data:</span>
                       <input type="text" value={q.code} onChange={e=>updateQuestion(qIndex, 'code', e.target.value)} className="border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 outline-none w-32 bg-slate-50 text-slate-700 font-mono text-xs" />
                    </div>
                  </div>

                  {/* Options Editor */}
                  <div className="bg-slate-50/50 p-4 sm:p-5 rounded-xl border border-slate-100">
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                      <div className="space-y-3 max-w-xl">
                        {q.options.map((opt: string, optIndex: number) => (
                          <div key={optIndex} className="flex items-center space-x-3 group/opt w-full bg-white p-2 sm:p-3 rounded-lg border border-slate-200 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                            <div className={`w-5 h-5 border-2 border-slate-300 flex-shrink-0 ${q.questionType === 'MULTIPLE_CHOICE' ? 'rounded-full' : 'rounded-md'}`} />
                            <input 
                              type="text" 
                              value={opt} 
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="outline-none flex-1 bg-transparent text-slate-700 font-medium text-[15px]"
                              placeholder={`Tùy chọn ${optIndex + 1}`}
                            />
                            <button onClick={()=>removeOption(qIndex, optIndex)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><X className="w-5 h-5" /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(qIndex)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 shadow-sm hover:border-indigo-400 px-4 py-2 rounded-lg mt-4 inline-flex items-center transition-colors"><Plus className="w-4 h-4 mr-2"/> Thêm đáp án</button>
                      </div>
                    )}
                    
                    {q.questionType === "TEXT" && (
                      <div className="border-b-2 border-dashed border-slate-300 pb-3 text-slate-400 font-medium bg-white p-4 rounded-t-lg">Đoạn văn bản câu trả lời... (Phụ huynh tự nhập bình luận)</div>
                    )}

                    {q.questionType === "RATING" && (
                      <div className="flex items-center text-amber-400 text-4xl bg-white p-4 rounded-xl border border-amber-100 shadow-sm w-max">
                        ★ ★ ★ ★ ★ <span className="text-sm text-slate-500 ml-4 font-semibold uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Thang {q.ratingScaleMax} Sao</span>
                      </div>
                    )}

                    {q.questionType === "NPS" && (
                      <div className="flex items-center gap-1 sm:gap-2">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-600 shadow-sm">{n}</div>)}
                      </div>
                    )}
                  </div>

                  {/* Footer config */}
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-5 text-sm gap-4 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-6 text-slate-700 font-medium w-full sm:w-auto bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer hover:text-indigo-700 select-none">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(qIndex, 'isRequired', e.target.checked)} className="rounded border-slate-300 text-indigo-600 w-4 h-4 accent-indigo-600 cursor-pointer" />
                        <span>Câu hỏi Bắt buộc</span>
                      </label>
                      <div className="w-px h-6 bg-slate-300 hidden sm:block"></div>
                      <label className="flex items-center space-x-2">
                        <span>Trọng số học tập:</span>
                        <input type="number" value={q.weight === null || Number.isNaN(q.weight) ? '' : q.weight} onChange={(e) => updateQuestion(qIndex, 'weight', e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-16 border border-slate-300 rounded-md px-2 py-1 text-center bg-white focus:border-indigo-500 outline-none font-bold" min="0" step="0.5" />
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button onClick={()=>moveQuestion(qIndex, -1)} className="p-2 text-slate-600 hover:text-indigo-600 rounded-md hover:bg-white transition-colors" title="Lên trên"><ArrowUp className="w-4 h-4" /></button>
                        <button onClick={()=>moveQuestion(qIndex, 1)} className="p-2 text-slate-600 hover:text-indigo-600 rounded-md hover:bg-white transition-colors" title="Xuống dưới"><ArrowDown className="w-4 h-4" /></button>
                      </div>
                      <button onClick={()=>removeQuestion(qIndex)} className="p-2 text-red-500 hover:text-red-700 bg-red-50 border border-red-100 rounded-lg ml-2 hover:bg-red-100 transition-colors" title="Xóa câu hỏi này"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Live Preview */}
      <div className={`flex-1 md:w-[45%] flex flex-col bg-slate-100/50 rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-full relative ${activeTab === 'editor' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between bg-white p-4 border-b border-slate-200 shadow-sm sticky top-0 z-10 w-full shrink-0">
           <h2 className="font-extrabold text-slate-700 text-[15px] flex items-center tracking-wide"><Eye className="w-5 h-5 mr-2 text-indigo-500"/> LIVE PREVIEW CHUẨN</h2>
           <div className="flex md:hidden space-x-2">
             <button onClick={()=>setActiveTab("editor")} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm">Thoát Xem Thử</button>
           </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar pb-32">
           <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white border-t-[12px] border-t-indigo-600 rounded-2xl shadow-md p-6 sm:p-10 mb-8 border border-slate-200">
                 <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 tracking-tight">Khu vực Giao diện Phụ Huynh</h1>
                 <p className="text-slate-600 text-sm leading-relaxed font-medium">Bạn đang ở chế độ xem trước (Preview). Mọi cấu trúc và thiết lập ở bên trái sẽ lập tức được mô phỏng tại đây để bạn kiểm duyệt trước khi phát hành.</p>
              </div>

              {Object.keys(previewCategories).map((catName, catIndex) => (
                <div key={catIndex} className="space-y-5">
                  {/* Category Title Header */}
                  <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg border border-slate-700 flex items-center sticky top-4 z-10">
                    <span className="bg-indigo-500 text-white text-xs font-black px-3 py-1.5 rounded justify-center mr-4 uppercase tracking-widest shadow-inner">Khối Nhóm {catIndex + 1}</span>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide truncate">{catName}</h2>
                  </div>

                  {/* Questions under this Category */}
                  {previewCategories[catName].map((q: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 ml-0 sm:ml-4">
                       <h3 className="text-[17px] font-bold text-slate-800 mb-6 leading-relaxed">
                         {q.questionText || "Nhập nội dung câu hỏi..."} {q.isRequired && <span className="text-red-500 ml-1 font-bold" title="Bắt buộc">*</span>}
                       </h3>

                       {q.questionType === "TEXT" && (
                         <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <input type="text" placeholder="Gõ câu trả lời của bạn..." className="w-full border-b-2 border-slate-200 focus:border-indigo-500 outline-none pb-2 bg-transparent font-medium text-slate-700" disabled />
                         </div>
                       )}
                       
                       {q.questionType === "MULTIPLE_CHOICE" && (
                         <div className="space-y-4">
                           {q.options.map((opt:string, i:number) => (
                             <label key={i} className="flex items-center space-x-3 cursor-not-allowed opacity-80 bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <input type="radio" name={`prev_${catIndex}_${idx}`} className="w-5 h-5 text-indigo-600 border-slate-300" disabled />
                               <span className="text-slate-700 font-medium text-[15px]">{opt || `Tùy chọn ${i+1}`}</span>
                             </label>
                           ))}
                         </div>
                       )}

                       {q.questionType === "CHECKBOX" && (
                         <div className="space-y-4">
                           {q.options.map((opt:string, i:number) => (
                             <label key={i} className="flex items-center space-x-3 cursor-not-allowed opacity-80 bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded border-slate-300" disabled />
                               <span className="text-slate-700 font-medium text-[15px]">{opt || `Tùy chọn ${i+1}`}</span>
                             </label>
                           ))}
                         </div>
                       )}

                       {q.questionType === "DROPDOWN" && (
                         <div className="relative">
                           <select className="w-full p-4 text-slate-700 font-medium border-2 border-slate-200 rounded-xl bg-slate-50 shadow-sm cursor-not-allowed opacity-80 appearance-none" disabled>
                             <option>Nhấn để chọn đáp án...</option>
                             {q.options.map((opt:string, i:number) => <option key={i}>{opt}</option>)}
                           </select>
                           <ChevronDown className="absolute right-4 top-4 text-slate-400 w-5 h-5" />
                         </div>
                       )}

                       {q.questionType === "RATING" && (
                         <div className="flex gap-2 sm:gap-3 text-[32px] sm:text-[45px] text-slate-200 drop-shadow-sm cursor-not-allowed justify-center bg-slate-50 p-6 rounded-xl border border-slate-100">
                           {Array.from({length: q.ratingScaleMax}).map((_, i) => (
                             <span key={i} className="hover:text-amber-400 transition-colors">★</span>
                           ))}
                         </div>
                       )}

                       {q.questionType === "NPS" && (
                         <div className="cursor-not-allowed opacity-90 bg-slate-50 p-5 rounded-xl border border-slate-100">
                           <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 mb-4">
                             {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                               <div key={n} className="flex-1 min-w-[32px] h-[40px] sm:h-[50px] rounded-lg border border-slate-300 flex items-center justify-center text-slate-700 font-bold bg-white text-xs sm:text-lg hover:border-indigo-500 hover:text-indigo-700 shadow-sm">{n}</div>
                             ))}
                           </div>
                           <div className="flex justify-between text-[11px] sm:text-[13px] font-black text-slate-500 px-1 uppercase tracking-wider">
                             <span className="text-red-500">Rất không hài lòng</span>
                             <span className="text-emerald-500">Rất hài lòng</span>
                           </div>
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              ))}

              {questions.length > 0 && (
                <div className="flex justify-between items-center bg-transparent mt-8">
                  <button disabled className="mt-2 w-full px-10 bg-indigo-600 text-white font-extrabold text-lg tracking-wide py-4 rounded-xl shadow-lg opacity-30 cursor-not-allowed">
                    Nộp Bài Đánh Giá
                  </button>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_45px_-20px_rgba(0,0,0,0.15)] flex justify-center z-50 md:left-64 lg:p-5">
        <div className="flex items-center space-x-2 md:space-x-4 max-w-7xl w-full justify-between">
           <Link href="/admin/surveys" className="text-slate-500 hover:text-slate-800 font-bold flex items-center md:mr-auto px-4 uppercase tracking-widest text-sm transition-colors border-b-2 border-transparent hover:border-slate-800 pb-1">← Thoát Bảng Bảng Thiết Kế</Link>
           
           <div className="flex md:hidden rounded-lg bg-slate-100 p-1 font-semibold text-sm">
             <button onClick={()=>setActiveTab('editor')} className={`px-5 py-2.5 rounded-md ${activeTab==='editor'? 'bg-white shadow text-indigo-700': 'text-slate-500'}`}>Sửa Form</button>
             <button onClick={()=>setActiveTab('preview')} className={`px-5 py-2.5 rounded-md ${activeTab==='preview'? 'bg-white shadow text-indigo-700': 'text-slate-500'}`}>Xem Thử</button>
           </div>

           <div className="flex items-center space-x-3">
             <button onClick={() => handleSave(false)} disabled={saving} className="px-5 py-3 md:px-6 md:py-3.5 flex items-center bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm transition pl-6 pr-6">
                <Save className="w-5 h-5 mr-2" /> Lưu Bản Nháp
             </button>
             <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-3 md:px-8 md:py-3.5 flex items-center bg-emerald-600 border-2 border-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 hover:border-emerald-700 shadow-lg shadow-emerald-600/30 transition-all pl-8 pr-8">
                <CloudUpload className="w-5 h-5 mr-2" /> Lưu Chốt Form Khảo Sát
             </button>
           </div>
        </div>
      </div>

    </div>
  )
}