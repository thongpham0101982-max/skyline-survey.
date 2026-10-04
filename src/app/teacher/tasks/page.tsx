"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  CheckSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  FileText,
  Briefcase,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from "lucide-react"
import { SSMTask, TaskSummaryCounts, SourceModule } from "@/services/taskEngine/types"

const MODULE_TABS: Array<{ code: SourceModule | "ALL"; label: string }> = [
  { code: "ALL", label: "Tất cả" },
  { code: "DU_GIO", label: "Dự giờ" },
  { code: "CO_VAN", label: "Cố vấn" },
  { code: "HO_TRO", label: "Hỗ trợ HS" },
  { code: "TRAI_NGHIEM", label: "Trải nghiệm" },
  { code: "KHAO_THI", label: "Khảo thí" },
  { code: "CONG_TAC", label: "Công tác" },
]

export default function TeacherTasksPage() {
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "OVERDUE" | "COMPLETED">("ALL")
  const [activeModule, setActiveModule] = useState<SourceModule | "ALL">("ALL")
  const [search, setSearch] = useState("")
  const [tasks, setTasks] = useState<SSMTask[]>([])
  const [counts, setCounts] = useState<TaskSummaryCounts>({
    today: 0,
    thisWeek: 0,
    overdue: 0,
    completed: 0,
    byModule: {
      DU_GIO: 0,
      CO_VAN: 0,
      PHHS: 0,
      HO_TRO: 0,
      TRAI_NGHIEM: 0,
      KHAO_THI: 0,
      CONG_TAC: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTasks = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filter !== "ALL") params.set("filter", filter)
      if (activeModule !== "ALL") params.set("module", activeModule)
      if (search.trim()) params.set("search", search.trim())

      const res = await fetch(`/api/pwa/tasks?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setTasks(json.tasks || [])
        if (json.counts) setCounts(json.counts)
      }
    } catch (err) {
      console.error("[Tasks Page] Error loading tasks:", err)
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300)
      }
    }
  }, [filter, activeModule, search])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleMarkComplete = async (taskId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const res = await fetch("/api/pwa/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "COMPLETE" })
      })

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.taskId !== taskId))
        setCounts(prev => ({
          ...prev,
          today: Math.max(0, prev.today - 1),
          overdue: Math.max(0, prev.overdue - 1),
          completed: prev.completed + 1
        }))
      }
    } catch (err) {
      console.error("Error marking task complete:", err)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 select-none font-sans text-slate-800">
      
      {/* 1. HEADER & SUMMARY METRICS */}
      <div className="bg-gradient-to-b from-[#003B3A] to-[#002B2A] text-white p-4 pt-5 rounded-b-3xl shadow-lg mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Việc của tôi</h1>
            <p className="text-[11px] text-[#5EEAD4] font-medium">
              Đồng bộ tự động từ Dự giờ, Cố vấn, Khảo thí & Công tác
            </p>
          </div>
          <button
            onClick={() => fetchTasks(true)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#5EEAD4]" : ""}`} />
          </button>
        </div>

        {/* Counter Summary Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4 relative z-10">
          <button
            onClick={() => setFilter(filter === "TODAY" ? "ALL" : "TODAY")}
            className={`rounded-2xl p-2.5 text-center transition-all cursor-pointer ${
              filter === "TODAY"
                ? "bg-[#00A19A] text-white shadow-md ring-2 ring-[#5EEAD4]"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            <span className="text-[10px] text-slate-300 block font-medium">Hôm nay</span>
            <span className="text-base font-black">{counts.today}</span>
          </button>

          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-2xl p-2.5 text-center transition-all cursor-pointer ${
              filter === "ALL" && activeModule === "ALL"
                ? "bg-[#00A19A] text-white shadow-md ring-2 ring-[#5EEAD4]"
                : "bg-white/10 hover:bg-white/15 text-white"
            }`}
          >
            <span className="text-[10px] text-slate-300 block font-medium">Tuần này</span>
            <span className="text-base font-black">{counts.thisWeek}</span>
          </button>

          <button
            onClick={() => setFilter(filter === "OVERDUE" ? "ALL" : "OVERDUE")}
            className={`rounded-2xl p-2.5 text-center border transition-all cursor-pointer ${
              filter === "OVERDUE"
                ? "bg-red-600 text-white shadow-md ring-2 ring-red-300 border-red-500"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/30"
            }`}
          >
            <span className="text-[10px] block font-semibold">Quá hạn</span>
            <span className="text-base font-black text-red-300">{counts.overdue}</span>
          </button>

          <button
            onClick={() => setFilter(filter === "COMPLETED" ? "ALL" : "COMPLETED")}
            className={`rounded-2xl p-2.5 text-center border transition-all cursor-pointer ${
              filter === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 border-emerald-500"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30"
            }`}
          >
            <span className="text-[10px] block font-semibold">Đã xong</span>
            <span className="text-base font-black text-emerald-300">{counts.completed}</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & MODULE PILL TABS */}
      <div className="px-4 mb-3 space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên học sinh, môn học, nhiệm vụ..."
            className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-white border border-[#E6ECEA] text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00A19A] transition-colors shadow-2xs"
          />
        </div>

        {/* Module Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {MODULE_TABS.map((tab) => {
            const isActive = activeModule === tab.code
            const moduleCount = tab.code === "ALL" ? counts.thisWeek : counts.byModule[tab.code] || 0

            return (
              <button
                key={tab.code}
                onClick={() => setActiveModule(tab.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-[#E6ECEA]"
                }`}
              >
                <span>{tab.label}</span>
                {moduleCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-white/20 text-[#5EEAD4]" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {moduleCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. TASK LIST */}
      <div className="px-4 flex flex-col gap-2.5">
        {loading && !refreshing ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#00A19A] mb-2" />
            <p className="font-semibold text-slate-700">Đang tổng hợp nhiệm vụ...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Kết nối Dự giờ, Cố vấn, Khảo thí</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#E6ECEA] text-center shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">Không có nhiệm vụ nào cần xử lý</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Thầy/Cô đã hoàn tất các hạng mục đúng tiến độ. Chúc Thầy/Cô một ngày làm việc hiệu quả!
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isUrgent = task.priority === "URGENT" || task.status === "OVERDUE"
            const isHigh = task.priority === "HIGH"

            return (
              <Link
                key={task.taskId}
                href={task.deepLink}
                className="bg-white rounded-2xl p-4 border border-[#E6ECEA] shadow-xs active:scale-[0.99] transition-all flex flex-col gap-2.5 hover:border-[#00A19A] group"
              >
                {/* Header: Module Badge & Priority Dot */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isUrgent
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                          : isHigh
                          ? "bg-amber-500"
                          : "bg-teal-500"
                      }`}
                    />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {task.metadata?.moduleLabel || task.sourceModule}
                    </span>
                    {task.metadata?.className && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-[#00736E]">
                        {task.metadata.className}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isUrgent
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : isHigh
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isUrgent ? "Khẩn cấp" : isHigh ? "Ưu tiên" : "Bình thường"}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug group-hover:text-[#00A19A] transition-colors">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Footer: Deadline & Action CTA */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.deadline}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.taskType === "DIRECTED_TASK" && (
                      <button
                        onClick={(e) => handleMarkComplete(task.taskId, e)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Xong</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1 text-[#00A19A] font-bold text-xs">
                      <span>Mở xử lý</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

    </div>
  )
}
