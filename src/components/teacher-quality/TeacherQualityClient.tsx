"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Award,
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react"
import type {
  ObservationDetailItem,
  TeacherDevelopmentPlanItem,
  TeacherOverviewRow,
  TeacherQualityScreenTab,
  TeacherQualityWorkspaceResponse,
} from "@/lib/teacher-quality/types"
import { TeacherOverviewTab } from "./TeacherOverviewTab"
import { RecognitionsTab } from "./RecognitionsTab"
import { MonthlyObservationTab } from "./MonthlyObservationTab"
import { CoachingFilterKey, TeacherCoachingListTab } from "./TeacherCoachingListTab"
import { ReportsTab } from "./ReportsTab"
import { TeacherProfileDrawer } from "./TeacherProfileDrawer"
import { CoachingModalMode, CoachingPlanModal } from "./CoachingPlanModal"

function getDefaultVietnamMonth(): string {
  const now = new Date()
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const yyyy = vn.getUTCFullYear()
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

function resolveInitialTab(raw?: string): TeacherQualityScreenTab {
  if (raw === "recognitions" || raw === "vinh-danh") return "recognitions"
  if (raw === "monthly-observation" || raw === "du-gio-thang") return "monthly-observation"
  if (raw === "coaching" || raw === "boi-duong") return "coaching"
  if (raw === "reports" || raw === "bao-cao") return "reports"
  return "overview"
}

const SCREEN_TABS: Array<{ key: TeacherQualityScreenTab; label: string; icon: any }> = [
  { key: "overview", label: "Tổng quan GV", icon: Users },
  { key: "recognitions", label: "Vinh danh & Ghi nhận", icon: Award },
  { key: "monthly-observation", label: "Dự giờ theo tháng", icon: ClipboardCheck },
  { key: "coaching", label: "Bồi dưỡng & Phát triển CM", icon: BookOpenCheck },
  { key: "reports", label: "Báo cáo", icon: BarChart3 },
]

export function TeacherQualityClient({ initialSection }: { initialSection?: string }) {
  const [activeTab, setActiveTab] = useState<TeacherQualityScreenTab>(() =>
    resolveInitialTab(initialSection)
  )

  // Shared Global Filter Bar: Năm học · Cơ sở · Bậc học · Tổ chuyên môn · Giáo viên (+ tìm kiếm)
  const [academicYearId, setAcademicYearId] = useState("")
  const [campusId, setCampusId] = useState("ALL")
  const [level, setLevel] = useState("ALL")
  const [departmentId, setDepartmentId] = useState("ALL")
  const [teacherId, setTeacherId] = useState("ALL")
  const [search, setSearch] = useState("")

  // Tab-specific filters
  const [month, setMonth] = useState<string>(() => getDefaultVietnamMonth())
  const [observingStatusFilter, setObservingStatusFilter] = useState("ALL")
  const [teachingStatusFilter, setTeachingStatusFilter] = useState("ALL")
  const [coachingFilter, setCoachingFilter] = useState<CoachingFilterKey>("ALL")

  // Workspace data
  const [data, setData] = useState<TeacherQualityWorkspaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  // Teacher Profile Drawer
  const [profileTeacherId, setProfileTeacherId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  // Coaching Modal
  const [coachingModalOpen, setCoachingModalOpen] = useState(false)
  const [coachingModalMode, setCoachingModalMode] = useState<CoachingModalMode>("ASSIGN_DIRECT")
  const [sourceObsForCoaching, setSourceObsForCoaching] = useState<ObservationDetailItem | null>(null)
  const [editingCoachingPlan, setEditingCoachingPlan] = useState<TeacherDevelopmentPlanItem | null>(
    null
  )

  const fetchWorkspace = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (academicYearId) sp.set("academicYearId", academicYearId)
      if (month) sp.set("month", month)
      if (campusId && campusId !== "ALL") sp.set("campusId", campusId)
      if (level && level !== "ALL") sp.set("level", level)
      if (departmentId && departmentId !== "ALL") sp.set("departmentId", departmentId)
      if (teacherId && teacherId !== "ALL") sp.set("teacherId", teacherId)
      if (search.trim()) sp.set("search", search.trim())
      if (observingStatusFilter && observingStatusFilter !== "ALL") {
        sp.set("observingStatusFilter", observingStatusFilter)
      }
      if (teachingStatusFilter && teachingStatusFilter !== "ALL") {
        sp.set("teachingStatusFilter", teachingStatusFilter)
      }

      const res = await fetch(`/api/admin/teacher-quality/workspace?${sp.toString()}`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Không thể tải dữ liệu Thành tích & Bồi dưỡng GV")
      }
      setData(json)

      if (!initializedRef.current && json.filters) {
        initializedRef.current = true
        if (json.filters.academicYearId) setAcademicYearId(json.filters.academicYearId)
        if (json.filters.campusId) setCampusId(json.filters.campusId)
        if (json.filters.month) setMonth(json.filters.month)
      }
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }, [
    academicYearId,
    month,
    campusId,
    level,
    departmentId,
    teacherId,
    search,
    observingStatusFilter,
    teachingStatusFilter,
  ])

  useEffect(() => {
    fetchWorkspace()
  }, [fetchWorkspace])

  const selectedProfileTeacher: TeacherOverviewRow | null =
    profileTeacherId && data?.overviewRows
      ? data.overviewRows.find((r) => r.teacherId === profileTeacherId) || null
      : null

  const openProfileById = (tid: string) => {
    setProfileTeacherId(tid)
    setProfileOpen(true)
  }

  const openCreateCoachingFromObs = (item: ObservationDetailItem) => {
    setEditingCoachingPlan(null)
    setSourceObsForCoaching(item)
    setCoachingModalMode("FROM_OBSERVATION")
    setCoachingModalOpen(true)
  }

  const openAssignDirectCoaching = () => {
    setEditingCoachingPlan(null)
    setSourceObsForCoaching(null)
    setCoachingModalMode("ASSIGN_DIRECT")
    setCoachingModalOpen(true)
  }

  const openTeacherProposalCoaching = () => {
    setEditingCoachingPlan(null)
    setSourceObsForCoaching(null)
    setCoachingModalMode("TEACHER_PROPOSAL")
    setCoachingModalOpen(true)
  }

  const openEditCoaching = (plan: TeacherDevelopmentPlanItem) => {
    setSourceObsForCoaching(null)
    setEditingCoachingPlan(plan)
    setCoachingModalMode("EDIT")
    setCoachingModalOpen(true)
  }

  const available = data?.availableFilters
  const isTeacherOnly = data?.scope.roleTier === "GV"

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 space-y-4">
      {/* Masthead */}
      <div className="rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] bg-white px-5 py-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#00736E] font-medium">
              <GraduationCap className="h-4 w-4 text-[#00A19A]" />
              <span>Quản trị chất lượng giáo viên</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-[#003B3A]">Thành tích & Bồi dưỡng GV</span>
            </div>
            <h1 className="mt-1 text-lg sm:text-xl font-bold text-[#003B3A] tracking-tight">
              Hồ sơ Thành tích, Dự giờ & Bồi dưỡng Giáo viên theo năm học
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data?.scope.roleDisplayLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-[#008B85]" />
                {data.scope.roleDisplayLabel}
              </span>
            )}
            <button
              type="button"
              onClick={fetchWorkspace}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* 5-Screen Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F1F5F9]">
          {SCREEN_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            const badge =
              tab.key === "coaching" && data
                ? data.overviewSummary.coachingActiveCount
                : tab.key === "monthly-observation" && data && data.monthlySummary.totalPendingForms > 0
                  ? data.monthlySummary.totalPendingForms
                  : null
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors tabular-nums ${
                  active
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:bg-[#F0FDFA] hover:text-[#00736E]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {badge !== null && badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? "bg-[#00A19A] text-white" : "bg-[#E2E8F0] text-slate-700"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shared Global Filter Bar: Năm học · Cơ sở · Bậc học · Tổ chuyên môn · Giáo viên */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#003B3A] mb-2.5">
          <Filter className="h-3.5 w-3.5 text-[#00A19A]" />
          <span>Bộ lọc chung</span>
          {data?.academicYear.isEnded && (
            <span className="ml-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              Năm học đã kết thúc — Thâm niên tính đến ngày kết thúc năm học
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Năm học */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Năm học</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
            >
              {(available?.academicYears || []).map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cơ sở */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Cơ sở</label>
            <select
              value={campusId}
              disabled={isTeacherOnly || Boolean(data?.scope.isCampusRestricted && (available?.campuses.length || 0) <= 1)}
              onChange={(e) => {
                setCampusId(e.target.value)
                setTeacherId("ALL")
              }}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
            >
              {!data?.scope.isCampusRestricted && !isTeacherOnly && (
                <option value="ALL">Tất cả cơ sở</option>
              )}
              {(available?.campuses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* Bậc học */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Bậc học</label>
            <select
              value={level}
              disabled={isTeacherOnly}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
            >
              {(available?.levels || [{ value: "ALL", label: "Tất cả bậc học" }]).map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tổ chuyên môn */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Tổ chuyên môn</label>
            <select
              value={departmentId}
              disabled={isTeacherOnly}
              onChange={(e) => {
                setDepartmentId(e.target.value)
                setTeacherId("ALL")
              }}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
            >
              <option value="ALL">Tất cả tổ chuyên môn</option>
              {(available?.departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Giáo viên */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Giáo viên</label>
            <select
              value={teacherId}
              disabled={isTeacherOnly}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-2.5 py-2 text-xs text-slate-800 disabled:bg-slate-50 focus:border-[#00A19A] focus:outline-none"
            >
              {!isTeacherOnly && <option value="ALL">Tất cả giáo viên</option>}
              {(available?.teachers || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} ({t.teacherCode})
                </option>
              ))}
            </select>
          </div>

          {/* Tìm nhanh */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Tìm nhanh</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên, mã GV, tổ..."
                className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-8 pr-2.5 py-2 text-xs text-slate-800 focus:border-[#00A19A] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Active Screen */}
      {activeTab === "overview" && (
        <TeacherOverviewTab
          data={data}
          loading={loading}
          onOpenProfile={(t) => openProfileById(t.teacherId)}
          onJumpToUnobserved={() => {
            setObservingStatusFilter("UNOBSERVED")
            setTeachingStatusFilter("ALL")
            setActiveTab("monthly-observation")
          }}
          onJumpToShortfall={() => {
            setObservingStatusFilter("SHORTFALL")
            setTeachingStatusFilter("ALL")
            setActiveTab("monthly-observation")
          }}
          onJumpToOverdueCoaching={() => {
            setCoachingFilter("OVERDUE")
            setActiveTab("coaching")
          }}
        />
      )}

      {activeTab === "recognitions" && (
        <RecognitionsTab data={data} loading={loading} onRefresh={fetchWorkspace} />
      )}

      {activeTab === "monthly-observation" && (
        <MonthlyObservationTab
          data={data}
          loading={loading}
          month={month}
          observingStatusFilter={observingStatusFilter}
          teachingStatusFilter={teachingStatusFilter}
          onChangeMonth={setMonth}
          onChangeObservingStatusFilter={setObservingStatusFilter}
          onChangeTeachingStatusFilter={setTeachingStatusFilter}
          onCreateCoaching={openCreateCoachingFromObs}
          onOpenCoachingTab={() => setActiveTab("coaching")}
          onOpenProfileById={openProfileById}
        />
      )}

      {activeTab === "coaching" && (
        <TeacherCoachingListTab
          items={data?.coachingPlans || []}
          loading={loading}
          canAssignCoaching={Boolean(data?.scope.canAssignCoaching)}
          canProposeCoaching={Boolean(data?.scope.canProposeCoaching)}
          canUpdateOwnCoaching={Boolean(data?.scope.canUpdateOwnCoaching)}
          currentTeacherId={data?.scope.currentTeacherId || null}
          activeFilter={coachingFilter}
          onChangeFilter={setCoachingFilter}
          onOpenAssignDirect={openAssignDirectCoaching}
          onOpenTeacherProposal={openTeacherProposalCoaching}
          onEditPlan={openEditCoaching}
          onDeleted={fetchWorkspace}
        />
      )}

      {activeTab === "reports" && (
        <ReportsTab data={data} onOpenProfile={(t) => openProfileById(t.teacherId)} />
      )}

      {/* Teacher Profile Drawer */}
      <TeacherProfileDrawer
        open={profileOpen}
        teacher={selectedProfileTeacher}
        academicYearName={data?.academicYear.name || ""}
        recognitions={data?.recognitions || []}
        npsRows={data?.npsRows || []}
        coachingPlans={data?.coachingPlans || []}
        onClose={() => setProfileOpen(false)}
        onOpenMonthlyObs={(tid) => {
          setTeacherId(tid)
          setActiveTab("monthly-observation")
        }}
        onOpenEditCoaching={(plan) => {
          setProfileOpen(false)
          openEditCoaching(plan)
        }}
      />

      {/* Coaching Modal (4 modes: From Observation, Assign Direct multi-teacher, GV Proposal, Edit) */}
      <CoachingPlanModal
        open={coachingModalOpen}
        mode={coachingModalMode}
        onClose={() => setCoachingModalOpen(false)}
        onSaved={fetchWorkspace}
        academicYearId={academicYearId || data?.academicYear.id}
        mentors={data?.mentors || []}
        assignableTeachers={data?.availableFilters.teachers || []}
        currentTeacherId={data?.scope.currentTeacherId || null}
        isManager={Boolean(data?.scope.canAssignCoaching)}
        sourceObservation={sourceObsForCoaching}
        editingPlan={editingCoachingPlan}
        followUpOptionsByTeacher={data?.followUpOptionsByTeacher || {}}
      />
    </div>
  )
}
