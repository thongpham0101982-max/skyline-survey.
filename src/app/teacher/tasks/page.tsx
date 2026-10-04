"use client"

import React, { useState, useEffect } from "react"
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
  Briefcase
} from "lucide-react"

interface TaskItem {
  id: string
  title: string
  sourceModule: string
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW"
  status: "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "OVERDUE"
  deadline: string
  deepLink: string
}

export default function TeacherTasksPage() {
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "OVERDUE" | "COMPLETED">("ALL")
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial task items
    async function fetchTasks() {
      try {
        const res = await fetch("/api/pwa/today")
        if (res.ok) {
          const json = await res.json()
          const items: TaskItem[] = []

          // Transform actions into tasks
          json.actionItems?.forEach((act: any, idx: number) => {
            items.push({
              id: `act-${idx}`,
              title: act.title,
              sourceModule: act.id.replace("task-", "").toUpperCase(),
              priority: act.urgent ? "URGENT" : "NORMAL",
              status: act.urgent ? "OVERDUE" : "IN_PROGRESS",
              deadline: "Hôm nay",
              deepLink: act.deepLink
            })
          })

          setTasks(items)
        }
      } catch (err) {
        console.error("Error loading tasks:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const overdueCount = tasks.filter(t => t.status === "OVERDUE" || t.priority === "URGENT").length
  const todayCount = tasks.length
  const completedCount = 0

  const filteredTasks = tasks.filter(t => {
    if (filter === "OVERDUE") return t.status === "OVERDUE" || t.priority === "URGENT"
    if (filter === "TODAY") return t.deadline === "Hôm nay"
    if (filter === "COMPLETED") return t.status === "COMPLETED"
    return true
  })

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 select-none font-sans">
      
      {/* Header */}
      <div className="bg-[#003B3A] text-white p-4 rounded-b-2xl shadow-xs mb-4">
        <h1 className="text-base font-bold tracking-tight">Việc của tôi</h1>
        <p className="text-[11px] text-teal-300 mt-0.5">Tổng hợp nhiệm vụ từ các phân hệ SSM</p>

        {/* Counter Summary Grid */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <span className="text-xs text-slate-300 block">Hôm nay</span>
            <span className="text-sm font-bold text-white">{todayCount}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <span className="text-xs text-slate-300 block">Tuần này</span>
            <span className="text-sm font-bold text-white">{todayCount + 2}</span>
          </div>
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-2 text-center">
            <span className="text-xs text-red-200 block">Quá hạn</span>
            <span className="text-sm font-bold text-red-400">{overdueCount}</span>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-2 text-center">
            <span className="text-xs text-emerald-200 block">Đã xong</span>
            <span className="text-sm font-bold text-emerald-400">12</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
            filter === "ALL" ? "bg-[#00A19A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tất cả ({tasks.length})
        </button>
        <button
          onClick={() => setFilter("TODAY")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
            filter === "TODAY" ? "bg-[#00A19A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Hôm nay
        </button>
        <button
          onClick={() => setFilter("OVERDUE")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
            filter === "OVERDUE" ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          }`}
        >
          Quá hạn ({overdueCount})
        </button>
        <button
          onClick={() => setFilter("COMPLETED")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
            filter === "COMPLETED" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Hoàn thành
        </button>
      </div>

      {/* Task List */}
      <div className="px-4 flex flex-col gap-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00A19A] mb-2" />
            <span>Đang tải danh sách nhiệm vụ...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-[#E6ECEA] text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Không có công việc nào trong danh mục này</p>
            <p className="text-[11px] text-slate-400 mt-1">Tuyệt vời! Bạn đã hoàn thành các nhiệm vụ đúng tiến độ.</p>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <Link
              key={t.id}
              href={t.deepLink}
              className="bg-white rounded-2xl p-3.5 border border-[#E6ECEA] shadow-xs active:scale-[0.99] transition-all flex items-center justify-between gap-3 hover:border-[#00A19A]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    t.priority === "URGENT" ? "bg-red-500 ring-4 ring-red-100" : "bg-teal-500"
                  }`}
                ></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">{t.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                      {t.sourceModule}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Hạn: {t.deadline}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-semibold text-[#00A19A]">Xử lý</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  )
}
