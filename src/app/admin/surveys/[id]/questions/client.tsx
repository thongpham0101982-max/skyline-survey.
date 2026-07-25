"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Save, CloudUpload, X, Tag, ListPlus, LayoutGrid, CheckSquare, Settings2, CheckCircle2, FileDown, Upload } from "lucide-react"
import * as xlsx from "xlsx"
import { saveSurveyQuestionsAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ surveyPeriodId, initialQuestions, categories = [] }) {
  const formattedCategories = (() => {
    const rootCategories = categories.filter((c: any) => !c.parentId)
    const childCategories = categories.filter((c: any) => c.parentId)
    
    const result: any[] = []
    rootCategories.forEach((root: any) => {
      result.push({ ...root, displayName: root.name })
      const children = childCategories.filter((child: any) => child.parentId === root.id)
      children.forEach((child: any) => {
        result.push({ ...child, displayName: `└─ ${child.name}` })
      })
    })
    
    // Add orphans
    childCategories.forEach((child: any) => {
      if (!result.some((r: any) => r.id === child.id)) {
        result.push({ ...child, displayName: child.name })
      }
    })
    
    return result
  })()

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
  const [activeTab, setActiveTab ] = useState("editor")
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const downloadTemplate = () => {
    const headers = [
      ["STT", "Nội dung câu hỏi", "Loại câu hỏi", "Danh mục", "Bắt buộc", "Trọng số", "Danh sách lựa chọn (nếu có)"],
      ["1", "Tôi thích tìm hiểu khoa học và công nghệ", "SCALE_0_4", "Realistic", "Có", "1", ""],
      ["2", "Bạn đánh giá thế nào về cơ sở vật chất của Sky-line?", "MULTIPLE_CHOICE", "", "Có", "1", "Rất tệ, Bình thường, Rất tốt"],
      ["3", "Ý kiến phản hồi tự luận", "TEXT", "", "Không", "1", ""],
      ["4", "Đánh giá theo các tiêu chuẩn kỹ năng", "MC_GRID", "", "Có", "1", "Kỹ năng lập kế hoạch, Kỹ năng làm việc nhóm | Kém, Khá, Tốt"]
    ]
    const ws = xlsx.utils.aoa_to_sheet(headers)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Mau_Cau_Hoi")
    xlsx.writeFile(wb, "Mau_Import_Cau_Hoi.xlsx")
  }

  const handleImportExcel = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 })
        
        if (rawRows.length <= 1) {
          return alert("File Excel rỗng hoặc không đúng định dạng!")
        }
        
        const newQuestionsFromExcel = []
        
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i]
          if (!row || !row[1]) continue
          
          const text = row[1]?.toString().trim()
          let type = row[2]?.toString().trim().toUpperCase() || "SCALE_0_4"
          
          if (type === "TRẮC NGHIỆM" || type === "RADIO" || type === "MULTIPLE_CHOICE") type = "MULTIPLE_CHOICE"
          else if (type === "CHECKBOX" || type === "HỘP KIỂM") type = "CHECKBOX"
          else if (type === "TỰ LUẬN" || type === "TEXT" || type === "PARAGRAPH") type = "TEXT"
          else if (type === "NPS" || type === "KHẢO SÁT NPS") type = "NPS"
          else if (type === "ĐÁNH GIÁ SAO" || type === "RATING" || type === "STAR") type = "RATING"
          else if (type === "LƯỚI RADIO" || type === "MC_GRID") type = "MC_GRID"
          else if (type === "LƯỚI CHECK" || type === "CB_GRID") type = "CB_GRID"
          else if (type === "KHẢO SÁT (0-4)" || type === "0-4" || type === "SCALE_0_4") type = "SCALE_0_4"
          else type = "SCALE_0_4"
          
          const catName = row[3]?.toString().trim()
          let matchedSectionId = ""
          if (catName) {
            const cleanCatName = catName.replace(/^└─\s*/, "").toLowerCase()
            const foundCat = categories.find((c) => c.name.toLowerCase() === cleanCatName)
            if (foundCat) matchedSectionId = foundCat.id
          }
          
          const isReqStr = row[4]?.toString().trim().toLowerCase()
          const isRequired = isReqStr === "không" || isReqStr === "false" || isReqStr === "0" ? false : true
          
          const wVal = parseFloat(row[5])
          const weight = isNaN(wVal) ? 1 : wVal
          
          let initialOptions = []
          if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN") {
            const optsStr = row[6]?.toString().trim()
            const choices = optsStr ? optsStr.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : ["Tùy chọn 1"]
            initialOptions = { choices, hasOther: false }
          } else if (type === "MC_GRID" || type === "CB_GRID") {
            const optsStr = row[6]?.toString().trim()
            let rows = ["Tiêu chí 1", "Tiêu chí 2"]
            let columns = ["Kém", "Trung bình", "Khá", "Tốt", "Xuất sắc"]
            if (optsStr && optsStr.includes("|")) {
              const [rPart, cPart] = optsStr.split("|")
              if (rPart) rows = rPart.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
              if (cPart) columns = cPart.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
            }
            initialOptions = { rows, columns }
          }
          
          newQuestionsFromExcel.push({
            id: `new_import_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            code: `Q-${Date.now()}-${i}`,
            questionText: text,
            questionType: type,
            isRequired,
            options: initialOptions,
            ratingScaleMin: type === "SCALE_0_4" ? 0 : (type === "NPS" ? 0 : 1),
            ratingScaleMax: type === "SCALE_0_4" ? 4 : (type === "NPS" ? 10 : 5),
            weight,
            sectionId: matchedSectionId
          })
        }
        
        if (newQuestionsFromExcel.length === 0) {
          return alert("Không đọc được câu hỏi nào hợp lệ từ file Excel!")
        }
        
        setQuestions(prev => [...prev, ...newQuestionsFromExcel])
        alert(`Đã nhập thành công ${newQuestionsFromExcel.length} câu hỏi từ file Excel vào danh sách biên tập! Vui lòng kiểm tra lại và bấm 'Xuất Bản Form' hoặc 'Lưu Nháp' để hoàn tất.`)
      } catch (e) {
        console.error(e)
        alert("Lỗi phân tích file Excel: " + e.message)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

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
      ratingScaleMin: type === "SCALE_0_4" ? 0 : (type === "NPS" ? 0 : 1),
      ratingScaleMax: type === "SCALE_0_4" ? 4 : (type === "NPS" ? 10 : 5),
      weight: 1,
      sectionId: ""
    }
    setQuestions([...questions, newQ])
  }

  const updateQuestion = (index, key, value) => {
    const newQs = [...questions]
    newQs[index][key] = value
    if (key === "questionType") {
      if (value === "SCALE_0_4") {
        newQs[index].ratingScaleMin = 0
        newQs[index].ratingScaleMax = 4
      } else if (value === "NPS") {
        newQs[index].ratingScaleMin = 0
        newQs[index].ratingScaleMax = 10
      } else if (value === "RATING") {
        newQs[index].ratingScaleMin = 1
        newQs[index].ratingScaleMax = 5
      }
    }
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
    <div className="flex flex-col md:flex-row h-full w-full gap-6 font-outfit">
      
      {/* LEFT PANE: EDITOR */}
      <div className={`flex-1 md:w-1/2 flex flex-col ${activeTab === "preview" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 mb-6 sticky top-0 z-30 w-full overflow-x-auto whitespace-nowrap scrollbar-hide gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-black text-slate-800 text-lg">Builder</h2>
            <div className="flex items-center gap-1.5 bg-[#00A99D]/5 border border-[#00A99D]/20 px-3 py-1.5 rounded-2xl">
              <button onClick={downloadTemplate} className="text-[#00A99D] hover:text-[#009085] flex items-center gap-1 text-[10px] font-black uppercase tracking-wider font-semibold" title="Tải file mẫu Excel">
                <FileDown className="w-3.5 h-3.5" /> Mẫu Excel
              </button>
              <span className="text-[#00A99D]/30">|</span>
              <label className="text-[#00A99D] hover:text-[#009085] flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer font-semibold" title="Import từ file Excel">
                <Upload className="w-3.5 h-3.5" /> Import
                <input type="file" onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
              </label>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 flex items-center gap-1.5 transition-all text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Radio
            </button>
            <button onClick={() => addQuestion("CHECKBOX")} className="text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-1.5 transition-all text-xs font-semibold">
              <CheckSquare className="w-3.5 h-3.5" /> Checkbox
            </button>
            <button onClick={() => addQuestion("MC_GRID")} className="text-violet-700 text-[10px] font-black uppercase tracking-widest hover:bg-violet-100 flex items-center gap-1.5 transition-all text-xs font-semibold">
              <LayoutGrid className="w-3.5 h-3.5" /> Lưới Radio
            </button>
            <button onClick={() => addQuestion("CB_GRID")} className="text-pink-700 text-[10px] font-black uppercase tracking-widest hover:bg-pink-100 flex items-center gap-1.5 transition-all text-xs font-semibold">
              <CheckSquare className="w-3.5 h-3.5" /> Lưới Check
            </button>
            <button onClick={() => addQuestion("SCALE_0_4")} className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Khảo sát (0-4)
            </button>
            <button onClick={() => addQuestion("NPS")} className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> NPS (0-10)
            </button>
            <button onClick={() => addQuestion("TEXT")} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> Tự luận
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto pb-44 pr-2 custom-scrollbar">
          {questions.length === 0 ? (
            <div className="text-center p-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 text-slate-200">
              <Plus className="w-16 h-16 mx-auto mb-4 opacity-5" />
              <p className="font-black text-xl">Chưa có câu hỏi nào</p>
            </div>
          ) : (
            <>
              {questions.map((q, qIndex) => (
                <div key={q.id} className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative group animate-in fade-in slide-in-from-bottom-4">
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-move text-xs font-semibold">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                </div>
                <div className="p-8 md:pl-14">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6 font-outfit">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                        placeholder="Nội dung câu hỏi..."
                        className="w-full text-xl font-black text-slate-900 border-b-2 border-transparent hover:border-slate-100 focus:border-red-600 outline-none pb-2 transition-all bg-transparent"
                      />
                      <div className="flex flex-wrap items-center gap-4 mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <label className="flex items-center gap-2">
                          <span>Mã:</span>
                          <input type="text" value={q.code} onChange={e => updateQuestion(qIndex, "code", e.target.value)} className="focus:ring-2 focus:ring-red-100 outline-none w-32 text-slate-900 font-bold text-xs font-semibold" />
                        </label>
                        <select
                          value={q.questionType}
                          onChange={(e) => updateQuestion(qIndex, "questionType", e.target.value)}
                          className="bg-red-600 text-white border-none rounded-xl px-4 py-2 font-black outline-none cursor-pointer hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                        >
                          <option value="MULTIPLE_CHOICE">Trắc nghiệm (Radio)</option>
                          <option value="CHECKBOX">Trắc nghiệm (Checkbox)</option>
                          <option value="MC_GRID">Lưới trắc nghiệm Radio</option>
                          <option value="CB_GRID">Lưới trắc nghiệm Checkbox</option>
                          <option value="TEXT">Tự luận</option>
                          <option value="RATING">Đánh giá sao</option>
                          <option value="NPS">Khảo sát NPS (0-10)</option>
                          <option value="SCALE_0_4">Khảo sát (0-4)</option>
                        </select>
                        <label className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-red-500" />
                          <span>Danh mục:</span>
                          <select
                            value={q.sectionId || ""}
                            onChange={(e) => updateQuestion(qIndex, "sectionId", e.target.value)}
                            className="bg-slate-100 border-none rounded-xl px-4 py-2 font-black outline-none cursor-pointer text-slate-700 max-w-[200px]"
                          >
                            <option value="">-- Chưa phân loại --</option>
                            {formattedCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.displayName}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                      <div className="space-y-3 p-6 text-xs font-semibold">
                        <div className="flex items-center justify-between mb-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tùy chọn trả lời</h4>
                           {q.questionType === "CHECKBOX" && <span className="text-emerald-600 text-[9px] font-black uppercase tracking-tighter text-xs font-semibold">Chọn nhiều mục</span>}
                        </div>
                        {(q.options.choices || []).map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-3 group/opt animate-in fade-in slide-in-from-left-2">
                            <div className={`w-5 h-5 border-2 border-slate-200 bg-white shadow-inner flex-shrink-0 ${q.questionType === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-lg"}`} />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              className="bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold flex-1 outline-none focus:border-red-500 focus:shadow-xl transition-all shadow-sm"
                              placeholder={`Tùy chọn ${optIndex + 1}`}
                            />
                            <button onClick={() => removeOption(qIndex, optIndex)} className="text-red-400 opacity-0 group-hover/opt:opacity-100 hover:text-red-600 transition-all p-3 bg-white rounded-2xl shadow-md border border-slate-100"><X className="w-5 h-5" /></button>
                          </div>
                        ))}
                        
                        <div className="flex flex-wrap items-center gap-3 mt-6">
                           <button onClick={() => addOption(qIndex)} className="text-[11px] font-black text-red-600 bg-white hover:shadow-xl border border-red-100 px-6 py-3 rounded-2xl flex items-center transition-all active:scale-95"><Plus className="w-4 h-4 mr-2"/> THÊM TÙY CHỌN</button>
                           
                           {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX") && (
                             <button onClick={() => toggleOther(qIndex)} 
                               className={`text-[11px] font-black px-6 py-3 rounded-2xl border flex items-center transition-all active:scale-95 ${q.options.hasOther ? "bg-amber-600 text-white border-amber-600 shadow-xl shadow-amber-200" : "bg-white text-slate-400 border-slate-100 hover:border-amber-400 hover:text-amber-600"}`}>
                               <Settings2 className="w-4 h-4 mr-2" />
                               {q.options.hasOther ? "ĐÃ BẬT TRẢ LỜI KHÁC" : "BẬT Tùy chọn 'KHÁC'"}
                             </button>
                           )}
                        </div>
                      </div>
                    )}

                    {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-[2rem] border border-slate-100 ${q.questionType === "CB_GRID" ? "bg-pink-50/20" : "bg-red-50/20"}`}>
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <ListPlus className={`w-4 h-4 ${q.questionType === "CB_GRID" ? "text-pink-500" : "text-red-500"}`} />
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hàng (Tiêu chí)</h4>
                          </div>
                          <div className="space-y-2">
                            {q.options.rows?.map((row, rIndex) => (
                              <div key={rIndex} className="flex items-center gap-2 group/grid animate-in fade-in slide-in-from-left-2">
                                <span className="text-[9px] font-black text-slate-300 w-4">{rIndex+1}</span>
                                <input type="text" value={row} onChange={e => updateGridOption(qIndex, "rows", rIndex, e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-red-500 outline-none shadow-sm" />
                                <button onClick={() => removeGridItem(qIndex, "rows", rIndex)} className="p-2.5 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "rows")} className={`w-full text-[10px] font-black border-2 border-dashed rounded-xl py-3 transition-all mt-3 uppercase tracking-widest bg-white/50 ${q.questionType === "CB_GRID" ? "text-pink-600 border-pink-100 hover:bg-pink-600 hover:text-white" : "text-red-600 border-red-100 hover:bg-red-600 hover:text-white"}`}>+ Thêm hàng</button>
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
                                <span className="text-[9px] font-black text-slate-300 w-4">{String.fromCharCode(65+cIndex)}</span>
                                <input type="text" value={col} onChange={e => updateGridOption(qIndex, "columns", cIndex, e.target.value)} className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-emerald-500 outline-none shadow-sm" />
                                <button onClick={() => removeGridItem(qIndex, "columns", cIndex)} className="p-2.5 text-red-400 opacity-0 group-hover/grid:opacity-100 hover:text-red-600 transition-all"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => addGridItem(qIndex, "columns")} className="w-full text-[10px] font-black text-emerald-600 hover:text-white hover:bg-emerald-600 transition-all mt-3 uppercase tracking-widest shadow-sm text-xs font-semibold">+ Thêm cột</button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {q.questionType === "TEXT" && <div className="p-10 text-slate-300 font-bold text-center italic text-sm text-xs font-semibold">Văn bản trả lời tự luận của khách hàng...</div>}
                    {q.questionType === "RATING" && <div className="flex items-center justify-center gap-6 text-amber-400 text-5xl py-8 animate-pulse">★ ★ ★ ★ ★</div>}
                    {q.questionType === "NPS" && <div className="flex items-center justify-center gap-2 flex-wrap py-6">{[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-11 h-11 rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center text-sm font-black text-slate-400 shadow-sm hover:border-red-400 cursor-default transition-all">{n}</div>)}</div>}
                    {q.questionType === "SCALE_0_4" && <div className="flex items-center justify-center gap-2 flex-wrap py-6">{[0,1,2,3,4].map(n => <div key={n} className="w-11 h-11 rounded-2xl border-2 border-slate-100 bg-white flex items-center justify-center text-sm font-black text-slate-400 shadow-sm hover:border-red-400 cursor-default transition-all">{n}</div>)}</div>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between border-t border-slate-50 mt-10 pt-6 gap-6">
                    <div className="flex flex-wrap items-center gap-10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <input type="checkbox" checked={q.isRequired} onChange={(e) => updateQuestion(qIndex, "isRequired", e.target.checked)} className="w-6 h-6 rounded-xl border-2 border-slate-200 text-red-600 focus:ring-0 cursor-pointer transition-all shadow-sm" />
                        <span className="group-hover:text-slate-900 transition-colors">Bắt buộc trả lời</span>
                      </label>
                      <label className="flex items-center gap-4">
                        <span>Trọng số:</span>
                        <input type="number" value={q.weight} onChange={(e) => updateQuestion(qIndex, "weight", parseFloat(e.target.value))} className="w-20 text-center focus:ring-2 focus:ring-red-100 outline-none font-black text-slate-900 shadow-inner text-xs font-semibold" min="0" step="0.1" />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveQuestion(qIndex, -1)} className="p-4 text-slate-400 hover:text-red-600 transition-all active:scale-90 text-xs font-semibold"><ArrowUp className="w-5 h-5" /></button>
                      <button onClick={() => moveQuestion(qIndex, 1)} className="p-4 text-slate-400 hover:text-red-600 transition-all active:scale-90 text-xs font-semibold"><ArrowDown className="w-5 h-5" /></button>
                      <div className="w-px h-8 bg-slate-100 mx-3" />
                      <button onClick={() => removeQuestion(qIndex)} className="p-4 text-red-500 hover:text-white hover:bg-red-500 transition-all active:scale-90 shadow-md text-xs font-semibold"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
              
              {/* Sticky bottom add fast question card */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-6 text-center space-y-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thêm câu hỏi mới nhanh</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button onClick={() => addQuestion("SCALE_0_4")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-500 hover:text-teal-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <Plus className="w-4 h-4 text-teal-500" />
                     <span>Khảo sát (0-4)</span>
                  </button>
                  <button onClick={() => addQuestion("NPS")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:text-amber-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <Plus className="w-4 h-4 text-amber-500" />
                     <span>NPS (0-10)</span>
                  </button>
                  <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-red-500 hover:text-red-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <Plus className="w-4 h-4 text-red-500" />
                     <span>Radio</span>
                  </button>
                  <button onClick={() => addQuestion("CHECKBOX")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <CheckSquare className="w-4 h-4 text-emerald-500" />
                     <span>Checkbox</span>
                  </button>
                  <button onClick={() => addQuestion("TEXT")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-slate-500 hover:text-slate-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <Plus className="w-4 h-4 text-slate-500" />
                     <span>Tự luận</span>
                  </button>
                  <button onClick={() => addQuestion("RATING")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-amber-500 hover:text-amber-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <Plus className="w-4 h-4 text-amber-500" />
                     <span>Đánh giá sao</span>
                  </button>
                  <button onClick={() => addQuestion("MC_GRID")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-violet-500 hover:text-violet-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <LayoutGrid className="w-4 h-4 text-violet-500" />
                     <span>Lưới Radio</span>
                  </button>
                  <button onClick={() => addQuestion("CB_GRID")} className="p-3 bg-white border border-slate-200 rounded-2xl hover:border-pink-500 hover:text-pink-600 font-black text-[10px] uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-2 shadow-xs hover:shadow-md font-semibold">
                     <CheckSquare className="w-4 h-4 text-pink-500" />
                     <span>Lưới Check</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANE: PREVIEW */}
      <div className={`flex-1 md:w-1/2 flex flex-col bg-white/40 rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-2xl ${activeTab === "editor" ? "hidden md:flex" : "flex"}`}>
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-xl p-8 border-b border-slate-100 sticky top-0 z-20">
          <h2 className="font-black text-slate-400 text-[10px] flex items-center uppercase tracking-[0.3em]"><Eye className="w-5 h-5 mr-4 text-red-500"/> Preview thực tế</h2>
          <div className="flex items-center gap-2 font-black text-[9px] text-red-600 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" /> LIVE</div>
        </div>
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="max-w-lg mx-auto space-y-8 pb-48">
            {questions.map((q, idx) => {
              const opts = q.options || { choices: [], hasOther: false }
              const choices = opts.choices || []
              return (
                <div key={idx} className="bg-white rounded-[3rem] shadow-[-20px_40px_80px_-20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500 group/preview">
                  <div className="h-2 bg-[#00A99D] w-full" />
                  <div className="p-10">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 rounded-[1.25rem] bg-[#00A99D] text-white text-xs font-black flex items-center justify-center shadow-xl shadow-[#00A99D]/20">{(idx+1).toString().padStart(2, '0')}</div>
                      <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Câu hỏi {idx+1}/{questions.length}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 leading-snug mb-8">{q.questionText || "Nội dung câu hỏi..."}</h3>
                    
                    {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                      <div className="overflow-x-auto -mx-10 px-10">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-50">
                              <th className="p-2 text-[10px] font-black text-slate-300 text-left uppercase tracking-tighter w-1/3 border border-slate-200">Tiêu chí</th>
                              {opts.columns?.map((col, i) => <th key={i} className="p-2 text-[10px] font-black text-slate-300 text-center uppercase tracking-tighter border border-slate-200">{col}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {opts.rows?.map((row, rIndex) => (
                              <tr key={rIndex}>
                                <td className="p-2 p-2 text-sm font-bold text-slate-600 leading-tight border border-slate-200">{row}</td>
                                {opts.columns?.map((_, cIndex) => (
                                  <td key={cIndex} className="p-2 text-center border border-slate-200">
                                    <div className={`w-6 h-6 border-2 border-slate-100 mx-auto bg-slate-50 shadow-inner ${q.questionType === "CB_GRID" ? "rounded-xl" : "rounded-full"}`} />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX") && (
                      <div className="space-y-3">
                        {choices.map((o,i)=>(
                          <div key={i} className="flex items-center gap-5 p-5 group-hover/preview:bg-white transition-all shadow-sm text-xs font-semibold">
                            <div className={`w-6 h-6 border-2 border-slate-200 transition-all ${q.questionType === "CHECKBOX" ? "rounded-xl" : "rounded-full"}`} />
                            <span className="text-base font-bold text-slate-600">{o}</span>
                          </div>
                        ))}
                        {opts.hasOther && (
                          <div className="flex flex-col gap-3 p-6 text-xs font-semibold">
                            <div className="flex items-center gap-5">
                              <div className={`w-6 h-6 border-2 border-amber-300 bg-white shadow-xl shadow-amber-100 ${q.questionType === "CHECKBOX" ? "rounded-xl" : "rounded-full"}`} />
                              <span className="text-base font-black text-amber-700">Lựa chọn khác...</span>
                            </div>
                            <div className="ml-11 h-12 bg-white border-2 border-dashed border-amber-200 rounded-xl flex items-center px-4 text-[11px] text-amber-300 font-bold italic">Khách hàng sẽ nhập lý kiến tại đây</div>
                          </div>
                        )}
                      </div>
                    )}

                    {q.questionType === "TEXT" && <div className="p-10 h-32 flex items-center justify-center text-slate-200 text-sm font-bold italic text-xs font-semibold">Vùng trả lời</div>}
                    {q.questionType === "RATING" && <div className="flex justify-center text-amber-300 text-5xl py-8 drop-shadow-xl tracking-widest">★ ★ ★ ★ ★</div>}
                    {q.questionType === "NPS" && <div className="flex items-center justify-between gap-1.5 mt-4">{[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="flex-1 aspect-square flex items-center justify-center text-[11px] font-black text-slate-300 text-xs font-semibold">{n}</div>)}</div>}
                    {q.questionType === "SCALE_0_4" && <div className="flex items-center justify-between gap-1.5 mt-4">{[0,1,2,3,4].map(n => <div key={n} className="flex-1 aspect-square flex items-center justify-center text-[11px] font-black text-slate-300 text-xs font-semibold">{n}</div>)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-slate-100 p-8 flex justify-center z-40 md:left-64 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.08)] font-outfit">
        <div className="flex items-center space-x-6">
          <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-[#00A99D] active:scale-95 transition-all shadow-xl border-none bg-transparent">
             Lưu Nháp
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="px-16 py-5 flex items-center bg-[#00A99D] text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#009085] active:scale-95 transition-all shadow-2xl shadow-[#00A99D]/30 border-none">
            <CloudUpload className="w-5 h-5 mr-4" /> Xuất Bản Form
          </button>
        </div>
      </div>
    </div>
  )
}
