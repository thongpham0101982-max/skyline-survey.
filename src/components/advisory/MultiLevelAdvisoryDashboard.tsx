"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Users, Target, Calendar, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, ShieldAlert, Sparkles, Filter, ChevronRight, User, BookOpen, ExternalLink, RefreshCw
} from "lucide-react"
import QuickConsultationModal from "@/components/advisory/QuickConsultationModal"
import { NextBestActionHeroCard } from "@/components/advisory/AdvisoryJourneyTab"
import type { TeacherAdvisoryTab } from "@/lib/advisory/advisory-journey-engine"

interface DashboardProps {
  academicYearId: string
  selectedClassId: string
  classes: any[]
  selectedStudentId?: string
  onSelectStudentFor1on1?: (studentId: string) => void
  onOpenProfile360?: (studentId: string) => void
  onNavigateJourneyAction?: (studentId: string, targetTab: TeacherAdvisoryTab, actionMode?: string) => void
  onOpenAiAdvisor?: (studentId: string) => void
  onOpenFullJourneyTab?: () => void
  hideJourneyCard?: boolean
}

export default function MultiLevelAdvisoryDashboard({
  academicYearId,
  selectedClassId,
  classes,
  selectedStudentId,
  onSelectStudentFor1on1,
  onOpenProfile360,
  onNavigateJourneyAction,
  onOpenAiAdvisor,
  onOpenFullJourneyTab,
  hideJourneyCard = false
}: DashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionItems, setActionItems] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [journeyData, setJourneyData] = useState<any | null>(null)
  const [journeyList, setJourneyList] = useState<any[]>([])
  const [activeSubTab, setActiveSubTab] = useState<"priority" | "actions">("priority")
  const [actionFilter, setActionFilter] = useState<"ALL" | "OVERDUE" | "TODO" | "COMPLETED">("OVERDUE")
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null)
  const [activeStudentForModal, setActiveStudentForModal] = useState<string | null>(null)

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/advisory/dashboard-stats?classId=${selectedClassId}&academicYearId=${academicYearId}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error("fetchStats error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Action Items
  const fetchActionItems = async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/advisory/action-items?classId=${selectedClassId}&academicYearId=${academicYearId}&status=${actionFilter}`)
      if (res.ok) {
        const data = await res.json()
        setActionItems(data.actionItems || [])
      }
    } catch (err) {
      console.error("fetchActionItems error:", err)
    } finally {
      setActionLoading(false)
    }
  }

  // Fetch Next Best Action Journey Preview
  const fetchJourneyPreview = async () => {
    try {
      const qs = new URLSearchParams()
      if (selectedClassId) qs.set("classId", selectedClassId)
      if (academicYearId) qs.set("academicYearId", academicYearId)
      if (selectedStudentId) qs.set("studentId", selectedStudentId)
      const res = await fetch(`/api/advisory/journey?${qs.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const list: any[] = data.studentJourneys || data.journeys || []
        setJourneyList(list)
        if (data.selectedStudentJourney) {
          setJourneyData(data.selectedStudentJourney)
        } else if (list.length > 0) {
          const priorityRank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
          const picked = selectedStudentId
            ? list.find(j => j.studentId === selectedStudentId) || list[0]
            : [...list].sort((a, b) => (priorityRank[a.nextBestAction?.priority] ?? 9) - (priorityRank[b.nextBestAction?.priority] ?? 9))[0]
          setJourneyData(picked || null)
        } else {
          setJourneyData(null)
        }
      }
    } catch (err) {
      console.error("fetchJourneyPreview error:", err)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      fetchStats()
      fetchActionItems()
      fetchJourneyPreview()
    }
  }, [selectedClassId, academicYearId, actionFilter, selectedStudentId])

  // Đánh dấu hoàn thành hành động
  const handleMarkActionComplete = async (actionId: string) => {
    try {
      setUpdatingActionId(actionId)
      const res = await fetch("/api/advisory/action-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionId, status: "COMPLETED" })
      })
      if (res.ok) {
        fetchActionItems()
        fetchStats()
      }
    } catch (err) {
      console.error("mark complete error:", err)
    } finally {
      setUpdatingActionId(null)
    }
  }

  if (loading && !stats) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-800" />
        <p className="text-sm font-medium">Đang tổng hợp dữ liệu đo lường Cố vấn học tập...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 0. CARD NỔI BẬT "BƯỚC TIẾP THEO" (NEXT BEST ACTION ENGINE) */}
      {!hideJourneyCard && journeyData && journeyData.nextBestAction && (
        <NextBestActionHeroCard
          studentName={journeyData.studentName}
          studentCode={journeyData.studentCode}
          className={journeyData.className}
          currentStageNumber={journeyData.currentStageNumber}
          completedStagesCount={journeyData.completedStagesCount}
          loopCount={journeyData.loopCount}
          nba={journeyData.nextBestAction}
          studentOptions={journeyList.map((j: any) => ({
            id: j.studentId,
            studentName: j.studentName,
            studentCode: j.studentCode,
            priority: j.nextBestAction?.priority
          }))}
          selectedStudentId={journeyData.studentId}
          onChangeStudent={(stId) => {
            const found = journeyList.find((j: any) => j.studentId === stId)
            if (found) setJourneyData(found)
          }}
          onContinueAction={(targetTab, actionMode) => {
            if (onNavigateJourneyAction) {
              onNavigateJourneyAction(journeyData.studentId, targetTab, actionMode)
            }
          }}
          onOpenAiAdvisor={
            onOpenAiAdvisor
              ? () => onOpenAiAdvisor(journeyData.studentId)
              : undefined
          }
          onOpenFullJourney={onOpenFullJourneyTab}
        />
      )}

      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số HS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Học sinh theo dõi</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{stats?.totalStudents || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Lớp đang chọn</div>
          </div>
        </div>

        {/* Card 2: Mục tiêu SMART */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã chốt SMART</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-800">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-800">{stats?.smartGoalStats?.submittedPercent || 0}%</span>
              <span className="text-xs text-slate-500">({stats?.smartGoalStats?.submitted || 0}/{stats?.totalStudents || 0} HS)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#003B3A] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(stats?.smartGoalStats?.submittedPercent || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Phiên cố vấn 1-1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ Cố vấn 1-1</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600">{stats?.consultationStats?.consultationRate || 0}%</span>
              <span className="text-xs text-slate-500">({stats?.consultationStats?.uniqueConsultedStudents || 0} HS đã gặp)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(stats?.consultationStats?.consultationRate || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Cảnh báo & Việc quá hạn */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Việc quá hạn / Nguy cơ</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-rose-600">{stats?.actionItemStats?.overdue || 0}</span>
              <span className="text-xs text-rose-500 font-medium">việc chậm hạn</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold">
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{stats?.riskStats?.red || 0} Đỏ</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{stats?.riskStats?.yellow || 0} Vàng</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{stats?.riskStats?.green || 0} Xanh</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS: ƯU TIÊN CAN THIỆP VS THEO DÕI HÀNH ĐỘNG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab("priority")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "priority"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Học sinh cần Cố vấn Sớm ({stats?.priorityStudents?.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab("actions")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "actions"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Nhật ký Hành động Sau phiên ({actionItems.length})
            </button>
          </div>

          {activeSubTab === "actions" && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium mr-1">Bộ lọc:</span>
              {(["OVERDUE", "TODO", "COMPLETED", "ALL"] as const).map(flt => (
                <button
                  key={flt}
                  onClick={() => setActionFilter(flt)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    actionFilter === flt
                      ? flt === "OVERDUE"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {flt === "OVERDUE" ? "Quá hạn" : flt === "TODO" ? "Cần làm" : flt === "COMPLETED" ? "Đã xong" : "Tất cả"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1 CONTENT: HỌC SINH CẦN CỐ VẤN SỚM */}
        {activeSubTab === "priority" && (
          <div className="divide-y divide-slate-100">
            {stats?.priorityStudents?.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold">Tuyệt vời! Không có học sinh nào trong diện cảnh báo rủi ro.</p>
              </div>
            ) : (
              stats?.priorityStudents?.map((st: any) => (
                <div key={st.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                      st.statusColor === "RED" ? "bg-rose-500 ring-4 ring-rose-100" :
                      st.statusColor === "YELLOW" ? "bg-amber-500 ring-4 ring-amber-100" :
                      "bg-emerald-500 ring-4 ring-emerald-100"
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{st.studentName}</span>
                        <span className="text-xs font-mono text-slate-500">({st.studentCode})</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{st.className}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        {!st.hasGoal && (
                          <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded">Chưa có SMART</span>
                        )}
                        {!st.isConsulted && (
                          <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">Chưa gặp 1-1 kỳ này</span>
                        )}
                        {st.overdueCount > 0 && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {st.overdueCount} việc quá hạn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (onSelectStudentFor1on1) {
                          onSelectStudentFor1on1(st.id)
                        } else {
                          setActiveStudentForModal(st.id)
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-50 text-teal-800 border border-teal-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Gặp 1-1
                    </button>
                    {onOpenProfile360 && (
                      <button
                        onClick={() => onOpenProfile360(st.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <User className="w-3.5 h-3.5" /> Hồ sơ 360
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2 CONTENT: NHẬT KÝ HÀNH ĐỘNG SAU PHIÊN */}
        {activeSubTab === "actions" && (
          <div className="divide-y divide-slate-100">
            {actionLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Đang tải danh sách việc cần làm...</div>
            ) : actionItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Không có hành động nào trong danh mục này.
              </div>
            ) : (
              actionItems.map((item: any) => (
                <div key={item.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.isOverdue
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : item.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {item.isOverdue ? "QUÁ HẠN" : item.status === "COMPLETED" ? "ĐÃ HOÀN THÀNH" : "ĐANG THỰC HIỆN"}
                      </span>
                      {item.deadline && (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" /> Hạn: {new Date(item.deadline).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">{item.actionDescription}</div>
                    {item.evidenceNotes && (
                      <div className="text-xs text-slate-500 italic">Ghi chú: {item.evidenceNotes}</div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {item.status !== "COMPLETED" ? (
                      <button
                        onClick={() => handleMarkActionComplete(item.id)}
                        disabled={updatingActionId === item.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {updatingActionId === item.id ? "Đang lưu..." : "Xong"}
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã xác nhận
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* QUICK 1-ON-1 CONSULTATION MODAL */}
      {activeStudentForModal && (
        <QuickConsultationModal
          isOpen={Boolean(activeStudentForModal)}
          studentId={activeStudentForModal}
          academicYearId={academicYearId}
          onClose={() => setActiveStudentForModal(null)}
          onSaveSuccess={() => {
            fetchStats()
            fetchActionItems()
          }}
        />
      )}
    </div>
  )
}
