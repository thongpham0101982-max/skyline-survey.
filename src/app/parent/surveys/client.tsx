"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  UserCheck, 
  GraduationCap,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  Clock3,
  School,
  HeartHandshake
} from "lucide-react"

interface SurveysClientProps {
  childrenList: any[]
  parentTasks: any[]
  studentTasks: any[]
  defaultYearName: string
}

export function ParentSurveysClient({
  childrenList,
  parentTasks,
  studentTasks,
  defaultYearName
}: SurveysClientProps) {
  const [activeTab, setActiveTab] = useState<"PARENT" | "STUDENT">("PARENT")
  const [selectedChildId, setSelectedChildId] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Filter Parent Tasks
  const filteredParentTasks = useMemo(() => {
    return parentTasks.filter(t => {
      const matchChild = selectedChildId === "ALL" || t.student.id === selectedChildId
      const matchStatus = filterStatus === "ALL" || 
        (filterStatus === "PENDING" && t.status !== "COMPLETED") ||
        (filterStatus === "COMPLETED" && t.status === "COMPLETED")
      const matchSearch = !searchTerm.trim() || 
        t.period.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        t.student.studentName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (t.student.class?.className || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
      return matchChild && matchStatus && matchSearch
    })
  }, [parentTasks, selectedChildId, filterStatus, searchTerm])

  // Filter Student Tasks
  const filteredStudentTasks = useMemo(() => {
    return studentTasks.filter(t => {
      const matchChild = selectedChildId === "ALL" || t.student.id === selectedChildId
      const matchStatus = filterStatus === "ALL" || 
        (filterStatus === "PENDING" && t.status !== "COMPLETED") ||
        (filterStatus === "COMPLETED" && t.status === "COMPLETED")
      const matchSearch = !searchTerm.trim() || 
        t.period.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        t.student.studentName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (t.student.class?.className || "").toLowerCase().includes(searchTerm.toLowerCase().trim())
      return matchChild && matchStatus && matchSearch
    })
  }, [studentTasks, selectedChildId, filterStatus, searchTerm])

  // Stats calculation
  const parentCompletedCount = parentTasks.filter(t => t.status === "COMPLETED").length
  const parentPendingCount = parentTasks.filter(t => t.status !== "COMPLETED").length
  const studentCompletedCount = studentTasks.filter(t => t.status === "COMPLETED").length
  const studentPendingCount = studentTasks.filter(t => t.status !== "COMPLETED").length

  return (
    <div className="space-y-8 font-sans text-slate-800 animate-in fade-in duration-500">
      
      {/* 1. Header Banner Sky-Line Identity */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] p-6 sm:p-8 lg:p-10 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-64 h-64 rounded-full bg-teal-300/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black text-teal-100 uppercase tracking-widest shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>PARENT PORTAL • KHẢO SÁT ĐỊNH KỲ ĐỒNG BỘ 3 CHIỀU</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-normal">
            Đóng Góp Ý Kiến & Đồng Bộ Khảo Sát
          </h1>

          <p className="text-xs sm:text-sm text-teal-100 font-medium max-w-3xl leading-relaxed">
            Hệ thống liên thông 3 chiều giữa <strong className="text-white">Phụ huynh ⇄ Thầy Cô GVCN ⇄ Học sinh</strong>. Ý kiến đóng góp quý báu của Quý Phụ huynh và trải nghiệm của con em là cơ sở để Sky-Line không ngừng nâng cao chất lượng giáo dục ({defaultYearName}).
          </p>
        </div>
      </div>

      {/* 2. Overview Stats 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khảo sát PHHS cần làm */}
        <div 
          onClick={() => { setActiveTab("PARENT"); setFilterStatus("PENDING"); }}
          className={"p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md " + (
            activeTab === "PARENT" && filterStatus === "PENDING"
              ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400"
              : "bg-white text-slate-800 border-amber-200/80 hover:border-amber-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={"text-[10px] font-black uppercase tracking-widest " + (
              activeTab === "PARENT" && filterStatus === "PENDING" ? "text-amber-100" : "text-amber-700"
            )}>PHHS Cần Làm</span>
            <Clock className={"w-5 h-5 " + (
              activeTab === "PARENT" && filterStatus === "PENDING" ? "text-white" : "text-amber-500"
            )} />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{parentPendingCount}</p>
          <p className={"text-[11px] font-semibold mt-1 " + (
            activeTab === "PARENT" && filterStatus === "PENDING" ? "text-amber-100" : "text-slate-400"
          )}>Phiếu đang mở khảo sát</p>
        </div>

        {/* Card 2: Khảo sát PHHS đã nộp */}
        <div 
          onClick={() => { setActiveTab("PARENT"); setFilterStatus("COMPLETED"); }}
          className={"p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md " + (
            activeTab === "PARENT" && filterStatus === "COMPLETED"
              ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400"
              : "bg-white text-slate-800 border-emerald-200/80 hover:border-emerald-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={"text-[10px] font-black uppercase tracking-widest " + (
              activeTab === "PARENT" && filterStatus === "COMPLETED" ? "text-emerald-100" : "text-emerald-700"
            )}>PHHS Đã Nộp</span>
            <CheckCircle2 className={"w-5 h-5 " + (
              activeTab === "PARENT" && filterStatus === "COMPLETED" ? "text-white" : "text-emerald-500"
            )} />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{parentCompletedCount}</p>
          <p className={"text-[11px] font-semibold mt-1 " + (
            activeTab === "PARENT" && filterStatus === "COMPLETED" ? "text-emerald-100" : "text-slate-400"
          )}>Phiếu đã gửi phản hồi</p>
        </div>

        {/* Card 3: Con em đã nộp tại trường */}
        <div 
          onClick={() => { setActiveTab("STUDENT"); setFilterStatus("COMPLETED"); }}
          className={"p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md " + (
            activeTab === "STUDENT" && filterStatus === "COMPLETED"
              ? "bg-[#003B3A] text-white border-teal-800 ring-2 ring-teal-400"
              : "bg-white text-slate-800 border-teal-200/80 hover:border-teal-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={"text-[10px] font-black uppercase tracking-widest " + (
              activeTab === "STUDENT" && filterStatus === "COMPLETED" ? "text-teal-100" : "text-[#003B3A]"
            )}>Con Em Đã Nộp</span>
            <GraduationCap className={"w-5 h-5 " + (
              activeTab === "STUDENT" && filterStatus === "COMPLETED" ? "text-teal-300" : "text-[#003B3A]"
            )} />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{studentCompletedCount}</p>
          <p className={"text-[11px] font-semibold mt-1 " + (
            activeTab === "STUDENT" && filterStatus === "COMPLETED" ? "text-teal-100" : "text-slate-400"
          )}>Con hoàn thành tại trường</p>
        </div>

        {/* Card 4: Con em đang chờ khảo sát */}
        <div 
          onClick={() => { setActiveTab("STUDENT"); setFilterStatus("PENDING"); }}
          className={"p-5 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md " + (
            activeTab === "STUDENT" && filterStatus === "PENDING"
              ? "bg-sky-600 text-white border-sky-700 ring-2 ring-sky-400"
              : "bg-white text-slate-800 border-sky-200/80 hover:border-sky-300"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={"text-[10px] font-black uppercase tracking-widest " + (
              activeTab === "STUDENT" && filterStatus === "PENDING" ? "text-sky-100" : "text-sky-700"
            )}>Con Em Đang Chờ</span>
            <Clock3 className={"w-5 h-5 " + (
              activeTab === "STUDENT" && filterStatus === "PENDING" ? "text-white" : "text-sky-500"
            )} />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{studentPendingCount}</p>
          <p className={"text-[11px] font-semibold mt-1 " + (
            activeTab === "STUDENT" && filterStatus === "PENDING" ? "text-sky-100" : "text-slate-400"
          )}>GVCN hướng dẫn ở trường</p>
        </div>
      </div>

      {/* 3. Main Navigation & Control Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-6">
        
        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("PARENT")}
              className={"px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 " + (
                activeTab === "PARENT"
                  ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              )}
            >
              <ClipboardList className="w-4 h-4" />
              <span>1. Khảo sát của Phụ huynh ({parentTasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("STUDENT")}
              className={"px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 " + (
                activeTab === "STUDENT"
                  ? "bg-[#003B3A] text-white shadow-md shadow-teal-900/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              )}
            >
              <GraduationCap className="w-4 h-4" />
              <span>2. Đồng bộ Khảo sát Con em ({studentTasks.length})</span>
            </button>
          </div>

          {/* Child Selector (If multi-child) */}
          {childrenList.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider hidden md:inline">Chọn con:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedChildId("ALL")}
                  className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                    selectedChildId === "ALL"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Tất cả con em
                </button>
                {childrenList.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedChildId(c.id)}
                    className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                      selectedChildId === c.id
                        ? "bg-[#48BFE3] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {c.studentName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Toolbar: Search & Status Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên đợt khảo sát, tên con em, lớp học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 focus:border-[#48BFE3] rounded-2xl text-xs font-bold text-slate-800 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus("ALL")}
              className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                filterStatus === "ALL"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tất cả
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("PENDING")}
              className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                filterStatus === "PENDING"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Cần thực hiện
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("COMPLETED")}
              className={"px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all " + (
                filterStatus === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Đã hoàn thành
            </button>
          </div>
        </div>

      </div>

      {/* 4. Tab 1 Content: Khảo sát của Phụ huynh */}
      {activeTab === "PARENT" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              <span>Phiếu Khảo Sát Ý Kiến Dành Cho Phụ Huynh ({filteredParentTasks.length})</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Cổng thông tin Sky-Line
            </span>
          </div>

          {filteredParentTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <ClipboardList className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Không tìm thấy đợt khảo sát nào phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hiện tại không có phiếu khảo sát nào thỏa mãn điều kiện lọc. Quý Phụ huynh vui lòng kiểm tra lại bộ lọc hoặc quay lại sau.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredParentTasks.map((task: any, idx: number) => {
                const isCompleted = task.status === "COMPLETED"
                const endDateStr = new Date(task.period.endDate).toLocaleDateString("vi-VN")

                return (
                  <div
                    key={idx}
                    className={"bg-white rounded-3xl border p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between relative overflow-hidden font-sans " + (
                      isCompleted 
                        ? "border-slate-200 bg-slate-50/40" 
                        : "border-amber-300 ring-2 ring-amber-100/60 shadow-amber-50"
                    )}
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex justify-between items-start">
                        <span className={"px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 " + (
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isCompleted ? "Đã nộp phản hồi" : "⚡ Đang mở khảo sát"}</span>
                        </span>

                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          Niên khoá: {defaultYearName}
                        </span>
                      </div>

                      {/* Period Name */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {task.period.name}
                        </h3>
                      </div>

                      {/* Student & Homeroom Teacher (GVCN) Info Box */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-[#003B3A]" />
                            <span>Học sinh:</span>
                          </span>
                          <span className="text-slate-900 font-extrabold text-sm">
                            {task.student?.studentName || "Học sinh"} ({task.student?.studentCode})
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <School className="w-4 h-4 text-sky-600" />
                            <span>Lớp & Cơ sở:</span>
                          </span>
                          <span className="text-slate-700 font-bold">
                            {task.student?.class?.className || "N/A"} • {task.student?.class?.campus?.campusName || "Skyline"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            <span>GVCN Chủ nhiệm:</span>
                          </span>
                          <span className="text-[#003B3A] font-extrabold">
                            {task.gvcnName || "Thầy Cô GVCN"}
                          </span>
                        </div>
                      </div>

                      {/* Deadline */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>Hạn chót gửi phản hồi: <strong className="text-slate-800">{endDateStr}</strong></span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 border-t border-slate-100 mt-5">
                      {isCompleted ? (
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200/60">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Quý Phụ huynh đã hoàn tất gửi phiếu ý kiến</span>
                          </span>
                          <span className="text-[10px] text-emerald-600/80">Cảm ơn Quý Phụ huynh!</span>
                        </div>
                      ) : (
                        <Link
                          href={`/parent/surveys/${task.period.id}?studentId=${task.student?.id}`}
                          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-200 active:scale-95"
                        >
                          <span>Thực hiện khảo sát ngay</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2 Content: Đồng bộ Khảo sát Con em (Học sinh) */}
      {activeTab === "STUDENT" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              <span>Tiến Độ Khảo Sát Của Con Em Tại Trường ({filteredStudentTasks.length})</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">
              Đồng bộ trực tiếp cùng GVCN
            </span>
          </div>

          {filteredStudentTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Không có đợt khảo sát nào của học sinh</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hiện tại con em chưa có đợt khảo sát học sinh nào được mở trong học kỳ này.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredStudentTasks.map((task: any, idx: number) => {
                const isCompleted = task.status === "COMPLETED"
                const endDateStr = new Date(task.period.endDate).toLocaleDateString("vi-VN")
                const submittedDateStr = task.form?.submissionDateTime 
                  ? new Date(task.form.submissionDateTime).toLocaleString("vi-VN")
                  : null

                return (
                  <div
                    key={idx}
                    className={"bg-white rounded-3xl border p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between relative overflow-hidden font-sans " + (
                      isCompleted 
                        ? "border-teal-200/80 bg-teal-50/20" 
                        : "border-sky-200/80 bg-white"
                    )}
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex justify-between items-start">
                        <span className={"px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 " + (
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-sky-100 text-sky-800 border border-sky-200"
                        )}>
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          <span>{isCompleted ? "✓ Con đã nộp bài" : "Đang thực hiện tại trường"}</span>
                        </span>

                        <span className="text-[10px] font-bold text-[#003B3A] bg-teal-100/60 px-2.5 py-0.5 rounded-md">
                          Khảo sát Học sinh
                        </span>
                      </div>

                      {/* Period Name */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {task.period.name}
                        </h3>
                      </div>

                      {/* Student & Homeroom Teacher (GVCN) Info Box */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-2 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-[#003B3A]" />
                            <span>Học sinh:</span>
                          </span>
                          <span className="text-slate-900 font-extrabold text-sm">
                            {task.student?.studentName || "Học sinh"} ({task.student?.studentCode})
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <School className="w-4 h-4 text-sky-600" />
                            <span>Lớp & Cơ sở:</span>
                          </span>
                          <span className="text-slate-700 font-bold">
                            {task.student?.class?.className || "N/A"} • {task.student?.class?.campus?.campusName || "Skyline"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            <span>GVCN Chủ nhiệm:</span>
                          </span>
                          <span className="text-[#003B3A] font-extrabold">
                            {task.gvcnName || "Thầy Cô GVCN"}
                          </span>
                        </div>
                      </div>

                      {/* Submission Date / Deadline */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>Hạn hoàn thành: <strong className="text-slate-800">{endDateStr}</strong></span>
                      </div>
                    </div>

                    {/* Status Info Box */}
                    <div className="pt-5 border-t border-slate-100 mt-5">
                      {isCompleted ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/70 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Con em đã hoàn thành bài khảo sát học sinh</span>
                          </div>
                          {submittedDateStr && (
                            <p className="text-[11px] text-emerald-700/80 font-medium pl-6">
                              Thời gian hoàn tất: {submittedDateStr}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200/70 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                            <Clock3 className="w-4 h-4 text-sky-600" />
                            <span>Con em chưa hoàn tất nộp bài</span>
                          </div>
                          <p className="text-[11px] text-sky-700/90 font-medium pl-6 leading-relaxed">
                            Thầy/Cô GVCN (<strong className="text-sky-900">{task.gvcnName}</strong>) sẽ hướng dẫn và tạo điều kiện để học sinh làm bài khảo sát tại trường.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Footer Credential & Support Note */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#003B3A] flex items-center justify-center shrink-0 border border-teal-100">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <p>
            Mọi thắc mắc về các đợt khảo sát, Quý Phụ huynh vui lòng liên hệ trực tiếp <strong className="text-slate-800">Giáo viên Chủ nhiệm</strong> hoặc Văn phòng Nhà trường Sky-Line để được hỗ trợ chu đáo nhất.
          </p>
        </div>
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
          Sky-Line Education Group
        </span>
      </div>

    </div>
  )
}
