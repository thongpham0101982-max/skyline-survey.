"use client"
import { useState, useEffect, useMemo } from "react"
import { 
  getSurveyPeriodTrackingAction, 
  sendClassReminderAction, 
  getFormResponsesAction, 
  deleteMultipleFormResponsesAction,
  deleteMultipleSurveyFormsAction,
  getStudentsNotInSurveyAction,
  addStudentsToSurveyAction,
  getAllCampusesAction,
  getAcademicLevelsAction,
  deleteSurveyFormsByClassAction
} from "./actions"
import { 
  BarChart3, ChevronDown, ChevronRight, CheckCircle2, Clock, Users, UserCog, UserCheck, 
  Filter, BellRing, Trash2, Eye, X, Star, FileText, MessageSquare, Plus, UserPlus, 
  Building2, GraduationCap, LayoutDashboard
} from "lucide-react"

export function TrackingClient({ periods }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({})
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [viewModal, setViewModal] = useState<{ open: boolean; formId: string; studentName: string }>({ open: false, formId: "", studentName: "" })
  const [modalData, setModalData] = useState<any>(null)
  const [modalLoading, setModalLoading] = useState(false)

  // Filters
  const [filterCampus, setFilterCampus] = useState("ALL")
  const [filterLevel, setFilterLevel] = useState("ALL")
  const [campuses, setCampuses] = useState<any[]>([])
  const [levels, setLevels] = useState<string[]>([])

  // Add Student Modal
  const [addModal, setAddModal] = useState<{ open: boolean; classId: string; className: string }>({ open: false, classId: "", className: "" })
  const [studentsToAdd, setStudentsToAdd] = useState<any[]>([])
  const [selectedStudentToAddIds, setSelectedStudentToAddIds] = useState<string[]>([])
  const [addingStudents, setAddingStudents] = useState(false)

  const reload = () => {
    if (!selectedPeriod) return
    setLoading(true)
    getSurveyPeriodTrackingAction(selectedPeriod).then(res => {
      setData(res || [])
      setSelectedFormIds([])
      setLoading(false)
    })
  }

  useEffect(() => {
    getAllCampusesAction().then(setCampuses)
    getAcademicLevelsAction().then(setLevels)
  }, [])

  useEffect(() => {
    if (selectedPeriod) reload()
    else setData([])
  }, [selectedPeriod])

  const handleRemind = async (e: any, clsId: string, pendingCount: number) => {
    e.stopPropagation()
    if (pendingCount === 0) return alert("Tuyệt vời, lớp này đã hoàn thành 100%!")
    if (!confirm(`Bạn có chắc muốn gửi Thông Báo Hệ Thống đốc thúc trực tiếp đến ${pendingCount} PHHS và cả GVCN của lớp này?`)) return
    setLoading(true)
    const res = await sendClassReminderAction(clsId, selectedPeriod)
    setLoading(false)
    if (res?.success) alert(`Đã gửi Push Notification thành công tới ${res.parents} Phụ huynh và ${res.gvcn ? '1 Giáo viên chủ nhiệm' : 'Không tìm thấy GVCN'}.`)
  }

  const toggleClass = (id: string) => {
    setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // --- Selection ---
  const toggleFormSelect = (formId: string) => {
    setSelectedFormIds(prev => prev.includes(formId) ? prev.filter(id => id !== formId) : [...prev, formId])
  }

  const toggleSelectAllInClass = (forms: any[]) => {
    const allFormIds = forms.map((f: any) => f.id)
    const allSelected = allFormIds.every(id => selectedFormIds.includes(id))
    if (allSelected) {
      setSelectedFormIds(prev => prev.filter(id => !allFormIds.includes(id)))
    } else {
      setSelectedFormIds(prev => Array.from(new Set([...prev, ...allFormIds])))
    }
  }

  // --- Delete selected ---
  const handleDeleteSelected = async () => {
    if (selectedFormIds.length === 0) return
    if (!confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN ${selectedFormIds.length} bản ghi khảo sát này? Thao tác này sẽ xóa sạch dữ liệu của học sinh đã chọn khỏi đợt khảo sát.`)) return
    setDeleting(true)
    const res = await deleteMultipleSurveyFormsAction(selectedFormIds)
    setDeleting(false)
    if (res.success) {
      alert(`Đã gỡ ${selectedFormIds.length} học sinh khỏi đợt khảo sát!`)
      reload()
    } else {
      alert("Lỗi: " + (res.error || ""))
    }
  }

  const handleDeleteClass = async (e: any, classId: string, className: string) => {
    e.stopPropagation()
    if (!confirm(`CẢNH BÁO: Bạn có chắc muốn GỠ TOÀN BỘ LỚP ${className} khỏi đợt khảo sát này? Hệ thống sẽ xóa sạch tất cả form và kết quả liên quan của lớp này.`)) return
    setDeleting(true)
    const res = await deleteSurveyFormsByClassAction(classId)
    setDeleting(false)
    if (res.success) {
      alert(`Đã gỡ toàn bộ lớp ${className} thành công!`)
      reload()
    }
  }

  // --- Add Students ---
  const handleOpenAddModal = async (e: any, classId: string, className: string) => {
    e.stopPropagation()
    setAddModal({ open: true, classId, className })
    setStudentsToAdd([])
    setSelectedStudentToAddIds([])
    const res = await getStudentsNotInSurveyAction(classId, selectedPeriod)
    setStudentsToAdd(res)
  }

  const handleAddStudents = async () => {
    if (selectedStudentToAddIds.length === 0) return
    setAddingStudents(true)
    const res = await addStudentsToSurveyAction(selectedStudentToAddIds, selectedPeriod)
    setAddingStudents(false)
    if (res.success) {
      alert(`Đã thêm ${res.created} học sinh vào đợt khảo sát!`)
      setAddModal({ open: false, classId: "", className: "" })
      reload()
    }
  }

  // --- View responses modal ---
  const handleViewResponse = async (e: any, formId: string, studentName: string) => {
    e.stopPropagation()
    setViewModal({ open: true, formId, studentName })
    setModalLoading(true)
    setModalData(null)
    const result = await getFormResponsesAction(formId)
    setModalData(result)
    setModalLoading(false)
  }

  // Filter Logic
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchCampus = filterCampus === "ALL" || d.classInfo.campusId === filterCampus
      const matchLevel = filterLevel === "ALL" || d.classInfo.level === filterLevel
      return matchCampus && matchLevel
    })
  }, [data, filterCampus, filterLevel])

  // Calculate Global Stats
  const globalTotal = filteredData.reduce((sum, d) => sum + d.total, 0)
  const globalCompleted = filteredData.reduce((sum, d) => sum + d.completed, 0)
  const globalPending = filteredData.reduce((sum, d) => sum + d.pending, 0)
  const completionRate = globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 100) : 0

  return (
    <div className="space-y-6">

      {/* View Responses Modal */}
      {viewModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-500" /> Kết quả Khảo sát</h2>
                <p className="text-sm text-slate-500 mt-0.5">Học sinh: <span className="font-bold text-indigo-700">{viewModal.studentName}</span></p>
              </div>
              <button onClick={() => setViewModal({ open: false, formId: "", studentName: "" })} className="p-2.5 rounded-2xl hover:bg-white hover:shadow-md text-slate-400 hover:text-slate-700 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-slate-50/20">
              {modalLoading && (
                <div className="text-center py-20">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-indigo-500 font-bold">Đang tải dữ liệu phản hồi...</p>
                </div>
              )}
              {!modalLoading && modalData && modalData.responses.length === 0 && (
                <div className="text-center py-20 space-y-3">
                   <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-400"><FileText className="w-8 h-8" /></div>
                   <p className="text-slate-400 font-medium">Không có dữ liệu phản hồi.</p>
                </div>
              )}
              {!modalLoading && modalData && modalData.responses.length > 0 && (
                <>
                  {modalData.form && (
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-6">
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Điểm trung bình</p>
                        <p className="text-3xl font-black text-indigo-600 font-mono">{modalData.form.overallAverageScore?.toFixed(1) || "N/A"}</p>
                      </div>
                      <div className="w-px h-10 bg-slate-100"></div>
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Chỉ số NPS</p>
                        <p className={`text-xl font-black flex items-center gap-1.5 ${modalData.form.npsCategory === 'PROMOTER' ? 'text-emerald-500' : modalData.form.npsCategory === 'PASSIVE' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {modalData.form.npsScoreRaw ?? "---"} <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{modalData.form.npsCategory || "---"}</span>
                        </p>
                      </div>
                      <div className="w-px h-10 bg-slate-100"></div>
                      <div className="flex-1 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Thời gian nộp</p>
                        <p className="text-sm font-bold text-slate-700">{modalData.form.submissionDateTime ? new Date(modalData.form.submissionDateTime).toLocaleString("vi-VN") : "---"}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {modalData.responses.map((r: any, idx: number) => (
                      <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-100 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-[10px] px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black uppercase tracking-tighter">{r.question?.section?.name || "Nội dung"}</span>
                           <span className="text-xs font-bold text-slate-300">#0{idx + 1}</span>
                        </div>
                        <p className="text-base font-bold text-slate-800 mb-4 leading-snug">{r.question?.questionText}</p>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/50">
                          {r.numericScore !== null ? (
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5">
                                {Array.from({ length: r.question?.ratingScaleMax || 5 }).map((_, i) => (
                                  <Star key={i} className={`w-5 h-5 ${i < r.numericScore ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-200 fill-slate-200'}`} />
                                ))}
                              </div>
                              <span className="text-lg font-black text-amber-600 font-mono">{r.numericScore}<span className="text-slate-300 text-sm font-medium">/{r.question?.ratingScaleMax || 5}</span></span>
                            </div>
                          ) : r.textAnswer ? (
                            <div className="flex items-start gap-3 text-slate-700 text-sm leading-relaxed italic">
                              <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-1" />
                              "{r.textAnswer}"
                            </div>
                          ) : r.choiceAnswer ? (
                            <div className="flex items-start gap-3 text-slate-700 text-sm font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              {(() => { try { const arr = JSON.parse(r.choiceAnswer); return Array.isArray(arr) ? arr.join(", ") : r.choiceAnswer } catch { return r.choiceAnswer } })()}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium italic">Không có phản hồi từ phụ huynh</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setViewModal({ open: false, formId: "", studentName: "" })} className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all active:scale-95">Đóng lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {addModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
               <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600" /> Thêm học sinh vào Survey</h3>
                  <p className="text-sm text-indigo-600 font-bold">Lớp: {addModal.className}</p>
               </div>
               <button onClick={() => setAddModal({ open: false, classId: "", className: "" })} className="p-2 rounded-xl hover:bg-white hover:shadow-md text-slate-400 transition-all">
                  <X className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg inline-block">Danh sách học sinh mới chưa gán</p>
               {studentsToAdd.length === 0 ? (
                 <div className="text-center py-12 text-slate-400 font-medium italic">Tất cả học sinh trong lớp này đã có trong survey.</div>
               ) : (
                 <div className="grid gap-2">
                    {studentsToAdd.map(s => {
                      const hasParent = s.parents?.length > 0
                      return (
                        <label key={s.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${selectedStudentToAddIds.includes(s.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'} ${!hasParent ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
                           <input 
                             type="checkbox" 
                             disabled={!hasParent}
                             checked={selectedStudentToAddIds.includes(s.id)}
                             onChange={() => setSelectedStudentToAddIds(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                             className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                           />
                           <div className="flex-1">
                              <p className="font-bold text-slate-800">{s.studentName}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Mã: {s.studentCode}</span>
                                {!hasParent && <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md font-bold uppercase tracking-widest">Thiếu PHHS</span>}
                              </div>
                           </div>
                        </label>
                      )
                    })}
                 </div>
               )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <span className="text-sm font-bold text-slate-500">Đã chọn <span className="text-indigo-600 font-black">{selectedStudentToAddIds.length}</span> HS</span>
               <div className="flex gap-2">
                 <button onClick={() => setAddModal({ open: false, classId: "", className: "" })} className="px-5 py-2.5 text-slate-600 font-bold hover:text-slate-800 transition-colors">Hủy</button>
                 <button 
                   disabled={selectedStudentToAddIds.length === 0 || addingStudents}
                   onClick={handleAddStudents}
                   className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                 >
                   {addingStudents ? "Đang xử lý..." : "Xác nhận Thêm"}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls & Global Filter */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between gap-4">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner"><LayoutDashboard className="w-6 h-6" /></div>
              <div>
                 <h2 className="text-xl font-black text-slate-800 tracking-tight">Cấu hình Đợt khảo sát</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chọn mốc thời gian & Lọc dữ liệu lớp học</p>
              </div>
           </div>
           {selectedFormIds.length > 0 && (
             <button
               onClick={handleDeleteSelected}
               disabled={deleting}
               className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95 group"
             >
               <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
               <span className="hidden sm:inline">Gỡ {selectedFormIds.length} học sinh khỏi Survey</span>
               <span className="sm:hidden">{selectedFormIds.length}</span>
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">1. Đợt khảo sát (Period)</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold text-indigo-900 bg-slate-50 outline-none transition-all shadow-sm"
            >
              <option value="">-- Click để chọn Mốc Khảo Sát --</option>
              {periods.map((p: any) => (
                 <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">2. Cơ sở (Campus)</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value)}
                className="w-full p-4 pl-12 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 outline-none transition-all shadow-sm"
              >
                <option value="ALL">Tất cả Cơ sở</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">3. Bậc học (Level)</label>
            <div className="relative">
              <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full p-4 pl-12 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 outline-none transition-all shadow-sm"
              >
                <option value="ALL">Tất cả Khối/Bậc học</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white p-20 text-center rounded-[32px] border-2 border-dashed border-indigo-100 shadow-sm transition-all">
           <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
           <p className="text-indigo-600 font-black text-lg tracking-tight uppercase">Đang đồng bộ dữ liệu báo cáo...</p>
           <p className="text-slate-400 text-sm mt-2 font-medium">Vui lòng chờ trong giây lát</p>
        </div>
      )}

      {!loading && selectedPeriod && filteredData.length === 0 && (
        <div className="bg-white p-20 text-center rounded-[32px] border border-slate-200 text-slate-500 font-medium">
           Không tìm thấy lớp học nào khớp với điều kiện lọc hoặc đợt khảo sát này chưa có dữ liệu.
        </div>
      )}

      {/* Analytics Dashboard */}
      {!loading && filteredData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
               <div>
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Tổng HS gán Survey</p>
                 <h3 className="text-4xl font-black text-slate-800 font-mono tracking-tighter">{globalTotal}</h3>
               </div>
               <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl shadow-inner"><Users className="w-8 h-8" /></div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between border-b-4 border-b-emerald-500 hover:shadow-md transition-shadow">
               <div>
                 <p className="text-emerald-500 text-[10px] font-black mb-1 uppercase tracking-widest">Đã hoàn tất</p>
                 <h3 className="text-4xl font-black text-emerald-700 font-mono tracking-tighter">{globalCompleted}</h3>
               </div>
               <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl shadow-inner"><CheckCircle2 className="w-8 h-8" /></div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-rose-100 shadow-sm flex items-center justify-between border-b-4 border-b-rose-500 hover:shadow-md transition-shadow">
               <div>
                 <p className="text-rose-500 text-[10px] font-black mb-1 uppercase tracking-widest">Còn trống (Pending)</p>
                 <h3 className="text-4xl font-black text-rose-700 font-mono tracking-tighter">{globalPending}</h3>
               </div>
               <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl shadow-inner"><Clock className="w-8 h-8" /></div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl flex items-center justify-between border border-slate-800 text-white overflow-hidden relative group">
               <div className="z-10">
                 <p className="text-slate-400 text-[10px] font-black mb-1 uppercase tracking-widest">Tiến độ tổng thể</p>
                 <h3 className="text-4xl font-black text-sky-400 font-mono tracking-tighter">{completionRate}%</h3>
               </div>
               <div className="relative w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center font-black text-sky-400 group-hover:scale-110 transition-transform">KPI</div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>
          </div>

          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">
                <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                Dữ liệu phân tích chi tiết theo Lớp 
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">Real-time</span>
              </h3>
            </div>
            
            {filteredData.map((cData: any) => {
              const cls = cData.classInfo
              const isExpanded = expandedClasses[cls.id] || false
              const classRate = Math.round((cData.completed / cData.total) * 100)
              const allFormIds = cData.forms.map((f: any) => f.id)
              const allSelected = allFormIds.length > 0 && allFormIds.every((id: string) => selectedFormIds.includes(id))
              const someSelected = allFormIds.some((id: string) => selectedFormIds.includes(id))

              return (
                <div key={cls.id} className={`bg-white rounded-[32px] overflow-hidden transition-all duration-300 border-2 ${isExpanded ? 'border-indigo-200 shadow-xl' : 'border-slate-100 hover:border-slate-300 shadow-sm'}`}>
                   {/* Class Header Toolbar */}
                   <div 
                     onClick={() => toggleClass(cls.id)}
                     className={`p-6 flex flex-wrap items-center justify-between cursor-pointer select-none transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}
                   >
                     <div className="flex items-center space-x-5">
                       <div className="w-14 h-14 bg-white text-slate-800 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-slate-100 shadow-sm group-hover:scale-105 transition-transform">
                         {cls.className.substring(0,3)}
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                            <h4 className="text-xl font-black text-slate-800">{cls.className}</h4>
                            <span className="text-[10px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">{cls.campus?.campusName || "No Campus"}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">{cls.level || "No Level"}</span>
                         </div>
                         <div className="flex items-center space-x-6 text-[11px] font-bold mt-2">
                           <span className="flex items-center text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg"><UserCog className="w-3.5 h-3.5 mr-1.5" /> <strong className="text-slate-700">{cls.homeroom}</strong></span>
                           <span className="flex items-center text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg"><UserCheck className="w-3.5 h-3.5 mr-1.5" /> <strong className="text-slate-700 truncate max-w-[200px]">{cls.subjectTeachers}</strong></span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex items-center space-x-8 mt-4 lg:mt-0">
                       <div className="text-right hidden sm:block">
                         <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Tiến Độ Form</div>
                         <div className="flex items-center space-x-3">
                           <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100/50">
                             <div className={`h-full shadow-inner transition-all duration-700 ${classRate === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${classRate}%`}}></div>
                           </div>
                           <span className="text-base font-black text-slate-800 font-mono tracking-tighter">{classRate}%</span>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-1.5">
                         <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-xl text-sm font-black flex flex-col items-center">
                            <span className="text-[8px] uppercase font-black opacity-50">Done</span>
                            {cData.completed}
                         </div>
                         <div className="bg-slate-50 text-slate-400 border border-slate-200 px-4 py-1.5 rounded-xl text-sm font-black flex flex-col items-center">
                            <span className="text-[8px] uppercase font-black opacity-50">Total</span>
                            {cData.total}
                         </div>
                       </div>
                       
                       <div className="flex items-center space-x-2">
                         <button 
                           onClick={(e) => handleRemind(e, cls.id, cData.pending)} 
                           className="group flex items-center space-x-2 p-2 px-5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-100 transition-all font-bold text-xs"
                         >
                           <BellRing className="w-4 h-4 group-hover:animate-bounce" /> <span className="hidden xl:inline">Gửi thông báo toàn bộ lớp</span><span className="xl:hidden">SMS</span>
                         </button>
                         <button 
                           onClick={(e) => handleOpenAddModal(e, cls.id, cls.className)}
                           className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all hover:shadow-md"
                           title="Thêm học sinh mới vào survey"
                         >
                           <UserPlus className="w-5 h-5" />
                         </button>
                         <button 
                           onClick={(e) => handleDeleteClass(e, cls.id, cls.className)}
                           className="p-3 bg-white border-2 border-rose-50 rounded-2xl text-rose-300 hover:text-rose-600 hover:border-rose-200 transition-all hover:shadow-md"
                           title="Gỡ toàn bộ lớp khỏi survey"
                         >
                           <Trash2 className="w-5 h-5" />
                         </button>
                         <div className={`p-3 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}>
                           <ChevronDown className="w-6 h-6" />
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Class Students Details Grid */}
                   {isExpanded && (
                     <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-slate-50/50 rounded-[28px] border border-slate-100 overflow-hidden shadow-inner">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead>
                              <tr className="bg-slate-100/50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-200/50">
                                <th className="px-6 py-4 w-12 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                                    onChange={() => toggleSelectAllInClass(cData.forms)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                </th>
                                <th className="px-6 py-4">Mã Học Sinh</th>
                                <th className="px-6 py-4">Họ và Tên Học Sinh</th>
                                <th className="px-6 py-4">PHHS Đại diện</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-center">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cData.forms.map((f: any) => {
                                const isDone = f.status === "COMPLETED" || f.status === "SUBMITTED"
                                const isSelected = selectedFormIds.includes(f.id)
                                return (
                                  <tr key={f.id} className={`group transition-all ${isSelected ? 'bg-rose-50/50' : 'hover:bg-white bg-transparent'}`}>
                                    <td className="px-6 py-4 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleFormSelect(f.id)}
                                        className="w-5 h-5 rounded-lg text-rose-500 focus:ring-rose-500 border-slate-300 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">{f.student?.studentCode}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center font-black text-xs uppercase">{f.student?.studentName.charAt(0)}</div>
                                          <span className="font-bold text-slate-800 text-sm tracking-tight">{f.student?.studentName}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col">
                                          <span className="font-bold text-slate-600 text-sm">{f.parent?.parentName || "N/A"}</span>
                                          <span className="text-[10px] text-slate-400 font-bold">{f.parent?.user?.email || "Chưa có email"}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      {isDone ? (
                                        <div className="flex items-center gap-2">
                                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                           <span className="text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">Đã nộp bài</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                           <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                                           <span className="text-xs font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">{f.status === 'DRAFT' ? 'Đang làm' : 'Chưa mở'}</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          disabled={!isDone}
                                          onClick={(e) => handleViewResponse(e, f.id, f.student?.studentName)}
                                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-wider transition-all ${isDone ? 'bg-white border-slate-100 text-indigo-600 hover:border-indigo-500 hover:shadow-lg shadow-sm' : 'bg-slate-50 border-transparent text-slate-300 opacity-50 cursor-not-allowed'}`}
                                        >
                                          <Eye className="w-3.5 h-3.5" /> Xem bài làm
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                     </div>
                   )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}