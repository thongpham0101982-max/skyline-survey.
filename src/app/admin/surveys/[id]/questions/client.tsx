"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Eye, Save, CloudUpload,
  X, Tag, ListPlus, LayoutGrid, CheckSquare, Settings2, CheckCircle2,
  FileDown, Upload, Monitor, Smartphone, FolderPlus, Copy, HelpCircle,
  ChevronRight, Sparkles, Layers, ArrowLeft
} from "lucide-react"
import * as xlsx from "xlsx"
import { saveSurveyQuestionsAction, createSectionAction } from "./actions"
import Link from "next/link"

export function SurveyQuestionBuilderClient({ period, initialQuestions, categories = [] }: any) {
  const router = useRouter()

  // Form Header State (Tiêu đề & Diễn giải Form)
  const [formTitle, setFormTitle] = useState(period.name || "Phiếu Khảo Sát")
  const [formDescription, setFormDescription] = useState(
    period.description || "Vui lòng hoàn thành các câu hỏi khảo sát dưới đây để giúp nhà trường nâng cao chất lượng dịch vụ và đào tạo."
  )

  // Sections State
  const [sectionsList, setSectionsList] = useState(categories)
  const [activeSectionFilter, setActiveSectionFilter] = useState("ALL")
  const [newSectionName, setNewSectionName] = useState("")
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)

  // Questions State
  const [questions, setQuestions] = useState(
    initialQuestions.map((q: any) => {
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

  // View state: 'editor' | 'preview'
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor")
  // Preview device: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop")
  // Active Question Card Index
  const [activeQIndex, setActiveQIndex] = useState<number | null>(0)

  const [saving, setSaving] = useState(false)

  // Categories helper
  const formattedCategories = (() => {
    const rootCategories = sectionsList.filter((c: any) => !c.parentId)
    const childCategories = sectionsList.filter((c: any) => c.parentId)
    
    const result: any[] = []
    rootCategories.forEach((root: any) => {
      result.push({ ...root, displayName: root.name })
      const children = childCategories.filter((child: any) => child.parentId === root.id)
      children.forEach((child: any) => {
        result.push({ ...child, displayName: `└─ ${child.name}` })
      })
    })
    childCategories.forEach((child: any) => {
      if (!result.some((r: any) => r.id === child.id)) {
        result.push({ ...child, displayName: child.name })
      }
    })
    return result
  })()

  // Download Excel Template
  const downloadTemplate = () => {
    const headers = [
      ["STT", "Nội dung câu hỏi", "Loại câu hỏi", "Danh mục / Mục", "Bắt buộc", "Trọng số", "Danh sách lựa chọn (nếu có)"],
      ["1", "Tôi thích tìm hiểu khoa học và công nghệ", "SCALE_0_4", "Realistic", "Có", "1", ""],
      ["2", "Bạn đánh giá thế nào về cơ sở vật chất của Sky-line?", "MULTIPLE_CHOICE", "Cơ sở vật chất", "Có", "1", "Rất tệ, Bình thường, Rất tốt"],
      ["3", "Ý kiến phản hồi tự luận", "TEXT", "Ý kiến đóng góp", "Không", "1", ""],
      ["4", "Đánh giá theo các tiêu chuẩn kỹ năng", "MC_GRID", "Kỹ năng", "Có", "1", "Kỹ năng lập kế hoạch, Kỹ năng làm việc nhóm | Kém, Khá, Tốt"]
    ]
    const ws = xlsx.utils.aoa_to_sheet(headers)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Mau_Cau_Hoi")
    xlsx.writeFile(wb, "Mau_Import_Cau_Hoi.xlsx")
  }

  // Handle Excel Import
  const handleImportExcel = (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (evt: any) => {
      try {
        const bstr = evt.target?.result
        const wb = xlsx.read(bstr, { type: "binary" })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const rawRows: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 })
        
        if (rawRows.length <= 1) {
          return alert("File Excel rỗng hoặc không đúng định dạng!")
        }
        
        const newQuestionsFromExcel: any[] = []
        
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
            const cleanCatName = catName.replace(/^└─s*/, "").toLowerCase()
            const foundCat = sectionsList.find((c: any) => c.name.toLowerCase() === cleanCatName)
            if (foundCat) matchedSectionId = foundCat.id
          }
          
          const isReqStr = row[4]?.toString().trim().toLowerCase()
          const isRequired = isReqStr === "không" || isReqStr === "false" || isReqStr === "0" ? false : true
          
          const wVal = parseFloat(row[5])
          const weight = isNaN(wVal) ? 1 : wVal
          
          let initialOptions: any = []
          if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN") {
            const optsStr = row[6]?.toString().trim()
            const choices = optsStr ? optsStr.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean) : ["Tùy chọn 1"]
            initialOptions = { choices, hasOther: false }
          } else if (type === "MC_GRID" || type === "CB_GRID") {
            const optsStr = row[6]?.toString().trim()
            let rows = ["Tiêu chí 1", "Tiêu chí 2"]
            let columns = ["Kém", "Trung bình", "Khá", "Tốt", "Xuất sắc"]
            if (optsStr && optsStr.includes("|")) {
              const [rPart, cPart] = optsStr.split("|")
              if (rPart) rows = rPart.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
              if (cPart) columns = cPart.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
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
        alert(`Đã nhập thành công ${newQuestionsFromExcel.length} câu hỏi từ file Excel vào Form!`)
      } catch (e: any) {
        console.error(e)
        alert("Lỗi phân tích file Excel: " + e.message)
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ""
  }

  // Create new section action
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return
    const res = await createSectionAction(newSectionName)
    if (res?.success && res.section) {
      setSectionsList(prev => [...prev, res.section])
      setNewSectionName("")
      setShowAddSectionModal(false)
    } else {
      alert(res?.error || "Không thể tạo mục mới")
    }
  }

  // Add question
  const addQuestion = (type: string, targetSectionId = "") => {
    let initialOptions: any = []
    if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN") {
      initialOptions = { choices: ["Tùy chọn 1", "Tùy chọn 2"], hasOther: false }
    } else if (type === "MC_GRID" || type === "CB_GRID") {
      initialOptions = { 
        rows: ["Tiêu chí 1", "Tiêu chí 2"], 
        columns: ["Kém", "Trung bình", "Khá", "Tốt", "Xuất sắc"] 
      }
    }

    const assignedSec = targetSectionId || (activeSectionFilter !== "ALL" ? activeSectionFilter : "")

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
      sectionId: assignedSec
    }
    setQuestions([...questions, newQ])
    setActiveQIndex(questions.length)
  }

  // Duplicate question
  const duplicateQuestion = (index: number) => {
    const target = questions[index]
    const newQ = {
      ...JSON.parse(JSON.stringify(target)),
      id: `new_${Date.now()}`,
      code: `Q-${Date.now()}`,
      questionText: `${target.questionText} (Bản sao)`
    }
    const updated = [...questions]
    updated.splice(index + 1, 0, newQ)
    setQuestions(updated)
    setActiveQIndex(index + 1)
  }

  const updateQuestion = (index: number, key: string, value: any) => {
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

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices[optIndex] = value
      setQuestions(newQs)
    }
  }

  const addOption = (qIndex: number) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices.push(`Tùy chọn ${q.options.choices.length + 1}`)
      setQuestions(newQs)
    }
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && Array.isArray(q.options.choices)) {
      q.options.choices = q.options.choices.filter((_: any, i: number) => i !== optIndex)
      setQuestions(newQs)
    }
  }

  const toggleOther = (qIndex: number) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      q.options.hasOther = !q.options.hasOther
      setQuestions(newQs)
    }
  }

  const updateGridOption = (qIndex: number, part: string, index: number, value: string) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part][index] = value
      setQuestions(newQs)
    }
  }

  const addGridItem = (qIndex: number, part: string) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part].push(part === "rows" ? `Tiêu chí ${q.options.rows.length + 1}` : `Cột ${q.options.columns.length + 1}`)
      setQuestions(newQs)
    }
  }

  const removeGridItem = (qIndex: number, part: string, index: number) => {
    const newQs = [...questions]
    const q = newQs[qIndex]
    if ((q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && q.options[part]) {
      q.options[part] = q.options[part].filter((_: any, i: number) => i !== index)
      setQuestions(newQs)
    }
  }

  const moveQuestion = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= questions.length) return
    const newQs = [...questions]
    const temp = newQs[index]
    newQs[index] = newQs[index + dir]
    newQs[index + dir] = temp
    setQuestions(newQs)
    setActiveQIndex(index + dir)
  }

  const removeQuestion = (index: number) => {
    const filtered = questions.filter((_: any, i: number) => i !== index)
    setQuestions(filtered)
    setActiveQIndex(null)
  }

  const handleSave = async (publish = false) => {
    setSaving(true)
    const res = await saveSurveyQuestionsAction(period.id, questions, { name: formTitle })
    setSaving(false)
    if (res?.success) {
      if (publish) {
        router.push(`/admin/surveys/${period.id}/publish`)
      } else {
        alert("Đã lưu bản nháp Form thành công!")
      }
    } else {
      alert("Lỗi lưu form: " + (res?.error || "Không xác định"))
    }
  }

  // Filtered questions according to active section tab
  const filteredQuestions = activeSectionFilter === "ALL" 
    ? questions 
    : (activeSectionFilter === "UNASSIGNED" 
        ? questions.filter((q: any) => !q.sectionId)
        : questions.filter((q: any) => q.sectionId === activeSectionFilter))

  return (
    <div className="max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-60px)] pb-32">
      
      {/* TOP MICROSOFT FORMS HEADER NAVBAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 mb-4 sticky top-2 z-30 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <Link href="/admin/surveys" className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-slate-800 text-lg tracking-tight">Studio Tạo / Chỉnh Sửa Form</h1>
              <span className="bg-[#48BFE3]/10 text-[#48BFE3] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Microsoft Forms
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Đối tượng: <strong className="text-slate-600">{period.targetAudience || "Tất cả"}</strong> • Khóa: <strong className="text-slate-600">{period.academicYear?.name || "2026-2027"}</strong></p>
          </div>
        </div>

        {/* Center: Mode Tabs (Editor vs Preview) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "editor" ? "bg-white text-[#48BFE3] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Sparkles className="w-4 h-4" /> Chỉnh sửa Form
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "preview" ? "bg-[#48BFE3] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Eye className="w-4 h-4" /> Xem trước Live
          </button>
        </div>

        {/* Right: Device preview toggles & Excel actions */}
        <div className="flex items-center gap-2">
          {activeTab === "preview" ? (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPreviewDevice("desktop")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewDevice === "desktop" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400"}`}
              >
                <Monitor className="w-4 h-4" /> Máy tính
              </button>
              <button
                onClick={() => setPreviewDevice("mobile")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${previewDevice === "mobile" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400"}`}
              >
                <Smartphone className="w-4 h-4" /> Điện thoại
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all" title="Tải Mẫu File Excel">
                <FileDown className="w-4 h-4 text-[#48BFE3]" /> Mẫu Excel
              </button>
              <label className="inline-flex items-center gap-1 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-[#48BFE3] rounded-xl text-xs font-bold cursor-pointer transition-all">
                <Upload className="w-4 h-4" /> Import Excel
                <input type="file" onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* SECTION FILTER / QUICK JUMP BAR */}
      {activeTab === "editor" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
              <Layers className="w-3.5 h-3.5" /> Mục:
            </span>
            <button
              onClick={() => setActiveSectionFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeSectionFilter === "ALL" ? "bg-[#48BFE3] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Tất cả ({questions.length})
            </button>
            {sectionsList.map((sec: any) => {
              const count = questions.filter((q: any) => q.sectionId === sec.id).length
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionFilter(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeSectionFilter === sec.id ? "bg-[#48BFE3] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  <span>{sec.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeSectionFilter === sec.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>{count}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setShowAddSectionModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#48BFE3]/10 hover:bg-[#48BFE3]/20 text-[#48BFE3] rounded-xl text-xs font-extrabold transition-all"
          >
            <FolderPlus className="w-4 h-4" /> + Thêm Mục mới
          </button>
        </div>
      )}

      {/* MODAL ADD NEW SECTION */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#48BFE3]" /> Thêm Phân Mục Form mới
              </h3>
              <button onClick={() => setShowAddSectionModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Phân mục giúp nhóm các câu hỏi có cùng chủ đề lại với nhau để người trả lời dễ theo dõi.</p>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="VD: Mục 1: Thông tin cá nhân, Mục 2: Đánh giá giảng dạy..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/20 mb-6"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddSectionModal(false)} className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-xl">Hủy</button>
              <button onClick={handleCreateSection} className="px-5 py-2 bg-[#48BFE3] text-white font-extrabold text-xs rounded-xl hover:bg-[#009085]">Tạo Mục</button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR TAB CONTENT */}
      {activeTab === "editor" && (
        <div className="space-y-4">
          
          {/* MS FORMS FORM HEADER CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden relative transition-all">
            {/* Signature Top Accent Banner */}
            <div className="h-3 bg-[#48BFE3] w-full" />
            <div className="p-6 md:p-8 space-y-4">
              <div>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Tiêu đề Khảo sát..."
                  className="w-full text-2xl md:text-3xl font-black text-slate-900 border-b-2 border-transparent hover:border-slate-200 focus:border-[#48BFE3] outline-none pb-2 transition-all bg-transparent"
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Thêm diễn giải / hướng dẫn làm khảo sát tại đây..."
                  className="w-full text-sm font-medium text-slate-600 border-b border-transparent hover:border-slate-200 focus:border-[#48BFE3] outline-none py-1 transition-all bg-transparent resize-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-slate-400 border-t border-slate-100">
                <span className="flex items-center gap-1 text-teal-700 bg-teal-50 px-3 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tổng số: {questions.length} câu hỏi
                </span>
                <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> {sectionsList.length} Mục phân loại
                </span>
              </div>
            </div>
          </div>

          {/* QUESTIONS LIST */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-extrabold text-base text-slate-700 mb-1">Chưa có câu hỏi nào trong mục này</p>
              <p className="text-xs text-slate-400 mb-6">Hãy bấm nút thêm loại câu hỏi dưới thanh công cụ để tạo câu hỏi đầu tiên</p>
              <button onClick={() => addQuestion("SCALE_0_4")} className="px-6 py-2.5 bg-[#48BFE3] text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-[#009085]">
                + Thêm Câu Hỏi Khảo Sát (0-4)
              </button>
            </div>
          ) : (
            filteredQuestions.map((q: any, qIndex: number) => {
              const realIndex = questions.findIndex((item: any) => item.id === q.id)
              const isSelected = activeQIndex === realIndex

              const matchedSection = sectionsList.find((s: any) => s.id === q.sectionId)

              return (
                <div
                  key={q.id}
                  onClick={() => setActiveQIndex(realIndex)}
                  className={`bg-white rounded-2xl border shadow-xs transition-all relative overflow-hidden group ${isSelected ? "border-l-4 border-l-[#48BFE3] border-slate-300 shadow-md ring-2 ring-[#48BFE3]/10" : "border-slate-200/80 hover:border-slate-300"}`}
                >
                  <div className="p-6 md:p-8">
                    
                    {/* Top Row: Q Number, Title Input, Type Selector */}
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
                      <div className="flex-1 w-full space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-[#48BFE3]/10 text-[#48BFE3] text-xs font-black flex items-center justify-center">
                            {(realIndex + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                            Câu hỏi {realIndex + 1}
                          </span>

                          {/* Section Tag Badge */}
                          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600">
                            <Tag className="w-3 h-3 text-[#48BFE3]" />
                            <span>Mục:</span>
                            <select
                              value={q.sectionId || ""}
                              onChange={(e) => updateQuestion(realIndex, "sectionId", e.target.value)}
                              className="bg-transparent text-slate-800 font-extrabold outline-none cursor-pointer"
                            >
                              <option value="">-- Chưa chọn mục --</option>
                              {formattedCategories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.displayName}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={q.questionText}
                          onChange={(e) => updateQuestion(realIndex, "questionText", e.target.value)}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full text-lg font-black text-slate-800 border-b-2 border-slate-100 hover:border-slate-300 focus:border-[#48BFE3] outline-none pb-2 transition-all bg-transparent"
                        />
                      </div>

                      {/* Type Selector Dropdown */}
                      <div className="flex items-center gap-2">
                        <select
                          value={q.questionType}
                          onChange={(e) => updateQuestion(realIndex, "questionType", e.target.value)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold border border-slate-200 rounded-xl px-4 py-2.5 outline-none cursor-pointer transition-all shadow-2xs"
                        >
                          <option value="MULTIPLE_CHOICE">Trắc nghiệm (Radio - Chọn 1)</option>
                          <option value="CHECKBOX">Trắc nghiệm (Checkbox - Chọn nhiều)</option>
                          <option value="SCALE_0_4">Khảo sát Thang điểm (0 - 4)</option>
                          <option value="NPS">Khảo sát NPS (0 - 10)</option>
                          <option value="RATING">Đánh giá Sao (1 - 5)</option>
                          <option value="TEXT">Văn bản Tự luận</option>
                          <option value="MC_GRID">Lưới Trắc nghiệm (Radio Matrix)</option>
                          <option value="CB_GRID">Lưới Trắc nghiệm (Checkbox Matrix)</option>
                        </select>
                      </div>
                    </div>

                    {/* Question Content Editor */}
                    <div className="space-y-4 my-6">
                      
                      {/* RADIO / CHECKBOX OPTIONS */}
                      {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX" || q.questionType === "DROPDOWN") && (
                        <div className="space-y-3 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách tùy chọn trả lời</span>
                            {q.questionType === "CHECKBOX" && <span className="text-[#48BFE3] text-[11px] font-extrabold uppercase">Cho phép chọn nhiều</span>}
                          </div>
                          {(q.options?.choices || []).map((opt: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-3 group/opt">
                              <div className={`w-4 h-4 border-2 border-slate-300 bg-white flex-shrink-0 ${q.questionType === "MULTIPLE_CHOICE" ? "rounded-full" : "rounded-md"}`} />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(realIndex, optIndex, e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold flex-1 outline-none focus:border-[#48BFE3] transition-all shadow-2xs"
                                placeholder={`Tùy chọn ${optIndex + 1}`}
                              />
                              <button onClick={() => removeOption(realIndex, optIndex)} className="text-slate-400 hover:text-red-500 p-2"><X className="w-4 h-4"/></button>
                            </div>
                          ))}

                          <div className="flex items-center gap-3 pt-3">
                            <button onClick={() => addOption(realIndex)} className="text-xs font-extrabold text-[#48BFE3] bg-white border border-teal-200 hover:bg-teal-50 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all">
                              <Plus className="w-4 h-4" /> Thêm Tùy chọn
                            </button>
                            <button
                              onClick={() => toggleOther(realIndex)}
                              className={`text-xs font-extrabold px-4 py-2 rounded-xl border transition-all ${q.options?.hasOther ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}
                            >
                              {q.options?.hasOther ? "✓ Đã bật tùy chọn KHÁC" : "+ Bật Tùy chọn 'KHÁC'"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* MATRIX GRID OPTIONS */}
                      {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-2xl border border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <ListPlus className="w-4 h-4 text-[#48BFE3]" />
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hàng (Tiêu chí đánh giá)</span>
                            </div>
                            <div className="space-y-2">
                              {q.options?.rows?.map((row: string, rIndex: number) => (
                                <div key={rIndex} className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 w-4">{rIndex + 1}.</span>
                                  <input type="text" value={row} onChange={e => updateGridOption(realIndex, "rows", rIndex, e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-[#48BFE3] outline-none" />
                                  <button onClick={() => removeGridItem(realIndex, "rows", rIndex)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-4 h-4"/></button>
                                </div>
                              ))}
                              <button onClick={() => addGridItem(realIndex, "rows")} className="w-full text-xs font-extrabold text-[#48BFE3] bg-white border border-dashed border-teal-200 hover:bg-teal-50 py-2 rounded-xl mt-2 transition-all">+ Thêm Hàng</button>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <LayoutGrid className="w-4 h-4 text-indigo-500" />
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cột (Mức độ / Thang điểm)</span>
                            </div>
                            <div className="space-y-2">
                              {q.options?.columns?.map((col: string, cIndex: number) => (
                                <div key={cIndex} className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 w-4">{String.fromCharCode(65 + cIndex)}.</span>
                                  <input type="text" value={col} onChange={e => updateGridOption(realIndex, "columns", cIndex, e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none" />
                                  <button onClick={() => removeGridItem(realIndex, "columns", cIndex)} className="text-slate-400 hover:text-red-500 p-1"><X className="w-4 h-4"/></button>
                                </div>
                              ))}
                              <button onClick={() => addGridItem(realIndex, "columns")} className="w-full text-xs font-extrabold text-indigo-600 bg-white border border-dashed border-indigo-200 hover:bg-indigo-50 py-2 rounded-xl mt-2 transition-all">+ Thêm Cột</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OTHER WIDGET PREVIEWS IN BUILDER */}
                      {q.questionType === "TEXT" && <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs italic font-medium">Vùng cho khách hàng nhập câu trả lời tự luận...</div>}
                      {q.questionType === "RATING" && <div className="flex items-center justify-center gap-3 text-amber-400 text-3xl py-4">★ ★ ★ ★ ★</div>}
                      {q.questionType === "NPS" && (
                        <div className="flex items-center justify-center gap-1.5 py-4 flex-wrap">
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs font-bold text-slate-600">{n}</div>)}
                        </div>
                      )}
                      {q.questionType === "SCALE_0_4" && (
                        <div className="flex items-center justify-center gap-2 py-4 flex-wrap">
                          {[0,1,2,3,4].map(n => <div key={n} className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs font-extrabold text-slate-700">{n}</div>)}
                        </div>
                      )}
                    </div>

                    {/* Bottom Card Control Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 gap-4 text-xs font-bold">
                      <div className="flex items-center gap-6 text-slate-500">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateQuestion(realIndex, "isRequired", e.target.checked)}
                            className="w-4 h-4 rounded text-[#48BFE3] focus:ring-0 cursor-pointer"
                          />
                          <span>Bắt buộc trả lời</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <span>Trọng số:</span>
                          <input
                            type="number"
                            value={q.weight}
                            onChange={(e) => updateQuestion(realIndex, "weight", parseFloat(e.target.value))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-800"
                            min="0" step="0.1"
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => moveQuestion(realIndex, -1)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Di chuyển lên"><ArrowUp className="w-4 h-4"/></button>
                        <button onClick={() => moveQuestion(realIndex, 1)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="Di chuyển xuống"><ArrowDown className="w-4 h-4"/></button>
                        <button onClick={() => duplicateQuestion(realIndex)} className="p-2 text-slate-400 hover:text-[#48BFE3] hover:bg-teal-50 rounded-lg" title="Nhân bản câu hỏi"><Copy className="w-4 h-4"/></button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button onClick={() => removeQuestion(realIndex)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa câu hỏi"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>

                  </div>
                </div>
              )
            })
          )}

          {/* STICKY QUICK ADD TOOLBAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Thêm câu hỏi mới nhanh</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              <button onClick={() => addQuestion("SCALE_0_4")} className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold text-slate-700 hover:text-[#48BFE3] transition-all flex flex-col items-center gap-1">
                <Plus className="w-4 h-4 text-[#48BFE3]" />
                <span>Khảo sát (0-4)</span>
              </button>
              <button onClick={() => addQuestion("NPS")} className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold text-slate-700 hover:text-amber-600 transition-all flex flex-col items-center gap-1">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>NPS (0-10)</span>
              </button>
              <button onClick={() => addQuestion("MULTIPLE_CHOICE")} className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-all flex flex-col items-center gap-1">
                <Plus className="w-4 h-4 text-blue-500" />
                <span>Radio</span>
              </button>
              <button onClick={() => addQuestion("CHECKBOX")} className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-600 transition-all flex flex-col items-center gap-1">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span>Checkbox</span>
              </button>
              <button onClick={() => addQuestion("TEXT")} className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex flex-col items-center gap-1">
                <Plus className="w-4 h-4 text-slate-500" />
                <span>Tự luận</span>
              </button>
              <button onClick={() => addQuestion("RATING")} className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold text-slate-700 hover:text-amber-600 transition-all flex flex-col items-center gap-1">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Đánh giá sao</span>
              </button>
              <button onClick={() => addQuestion("MC_GRID")} className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 transition-all flex flex-col items-center gap-1">
                <LayoutGrid className="w-4 h-4 text-indigo-500" />
                <span>Lưới Radio</span>
              </button>
              <button onClick={() => addQuestion("CB_GRID")} className="p-2.5 bg-slate-50 hover:bg-pink-50 border border-slate-200 hover:border-pink-300 rounded-xl text-xs font-bold text-slate-700 hover:text-pink-600 transition-all flex flex-col items-center gap-1">
                <CheckSquare className="w-4 h-4 text-pink-500" />
                <span>Lưới Check</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW TAB CONTENT */}
      {activeTab === "preview" && (
        <div className="flex justify-center my-4">
          <div className={`w-full transition-all ${previewDevice === "mobile" ? "max-w-sm border-8 border-slate-800 rounded-[2.5rem] p-3 bg-slate-100 shadow-2xl" : "max-w-3xl"}`}>
            
            {/* Rendered Live Form */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden space-y-6 pb-8">
              {/* Header Banner */}
              <div className="h-3 bg-[#48BFE3] w-full" />
              <div className="px-6 pt-2 pb-4 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 mb-2">{formTitle || "Phiếu Khảo Sát"}</h2>
                <p className="text-xs font-medium text-slate-600 whitespace-pre-line">{formDescription}</p>
              </div>

              {/* Questions */}
              <div className="px-6 space-y-6">
                {questions.map((q: any, idx: number) => {
                  const opts = q.options || { choices: [], hasOther: false }
                  const choices = opts.choices || []
                  const sec = sectionsList.find((s: any) => s.id === q.sectionId)

                  return (
                    <div key={idx} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                      {sec && (
                        <span className="inline-block text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100 uppercase tracking-wider mb-1">
                          {sec.name}
                        </span>
                      )}
                      
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-black text-[#48BFE3] bg-teal-50 px-2 py-0.5 rounded-lg">{idx + 1}.</span>
                        <h3 className="text-sm font-extrabold text-slate-800 flex-1 leading-snug">
                          {q.questionText || "Nội dung câu hỏi..."}
                          {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </h3>
                      </div>

                      {/* OPTIONS PREVIEW */}
                      {(q.questionType === "MULTIPLE_CHOICE" || q.questionType === "CHECKBOX") && (
                        <div className="space-y-2 pl-4">
                          {choices.map((c: string, ci: number) => (
                            <label key={ci} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl cursor-pointer text-xs font-bold text-slate-700 border border-transparent hover:border-slate-200 transition-all">
                              <input type={q.questionType === "CHECKBOX" ? "checkbox" : "radio"} name={`preview_${idx}`} className="w-4 h-4 text-[#48BFE3]" />
                              <span>{c}</span>
                            </label>
                          ))}
                          {opts.hasOther && (
                            <div className="space-y-1 pl-2 pt-1">
                              <label className="flex items-center gap-3 text-xs font-bold text-amber-700">
                                <input type={q.questionType === "CHECKBOX" ? "checkbox" : "radio"} name={`preview_${idx}`} className="w-4 h-4 text-amber-600" />
                                <span>Tùy chọn khác...</span>
                              </label>
                              <input type="text" placeholder="Nhập ý kiến khác tại đây..." className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none" />
                            </div>
                          )}
                        </div>
                      )}

                      {(q.questionType === "MC_GRID" || q.questionType === "CB_GRID") && (
                        <div className="overflow-x-auto -mx-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="p-2 text-left font-bold">Tiêu chí</th>
                                {opts.columns?.map((col: string, ci: number) => (
                                  <th key={ci} className="p-2 text-center font-bold">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {opts.rows?.map((row: string, ri: number) => (
                                <tr key={ri}>
                                  <td className="p-2 font-bold text-slate-700">{row}</td>
                                  {opts.columns?.map((_: any, ci: number) => (
                                    <td key={ci} className="p-2 text-center">
                                      <input type={q.questionType === "CB_GRID" ? "checkbox" : "radio"} name={`grid_${idx}_${ri}`} className="w-4 h-4 text-[#48BFE3]" />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {q.questionType === "TEXT" && (
                        <textarea rows={3} placeholder="Nhập câu trả lời tự luận..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-[#48BFE3]" />
                      )}

                      {q.questionType === "RATING" && (
                        <div className="flex gap-2 text-amber-400 text-2xl py-2 justify-center">★ ★ ★ ★ ★</div>
                      )}

                      {q.questionType === "NPS" && (
                        <div className="flex gap-1 justify-between py-2">
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => <button key={n} className="flex-1 py-2 bg-white border border-slate-200 hover:border-[#48BFE3] hover:text-[#48BFE3] rounded-lg text-xs font-bold text-slate-600 transition-all">{n}</button>)}
                        </div>
                      )}

                      {q.questionType === "SCALE_0_4" && (
                        <div className="flex gap-2 justify-center py-2">
                          {[0,1,2,3,4].map(n => <button key={n} className="w-10 h-10 bg-white border border-slate-200 hover:border-[#48BFE3] hover:bg-teal-50 rounded-xl text-xs font-extrabold text-slate-700 transition-all">{n}</button>)}
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>

              {/* Submit Preview Button */}
              <div className="px-6 pt-4">
                <button disabled className="w-full py-3 bg-[#48BFE3] text-white font-extrabold rounded-xl text-xs uppercase tracking-wider opacity-90 cursor-not-allowed">
                  Gửi Phản Hồi (Preview Mode)
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 z-40 shadow-lg flex items-center justify-between max-w-6xl mx-auto px-6 rounded-t-2xl">
        <div className="text-xs font-bold text-slate-400 hidden sm:block">
          {saving ? "Đang lưu thay đổi..." : `Đã tạo ${questions.length} câu hỏi • ${sectionsList.length} mục`}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-all"
          >
            Lưu Nháp
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-8 py-2.5 bg-[#48BFE3] hover:bg-[#009085] text-white rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-teal-500/20 transition-all active:scale-95"
          >
            <CloudUpload className="w-4 h-4" /> Xuất Bản Form
          </button>
        </div>
      </div>

    </div>
  )
}
