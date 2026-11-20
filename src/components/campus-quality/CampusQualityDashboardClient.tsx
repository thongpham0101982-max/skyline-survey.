"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Clock,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"
import {
  AcademicQualityTabPayload,
  AchievementsCertsTabPayload,
  AdmissionsMobilityTabPayload,
  AvailableDashboardFilters,
  DashboardTabKey,
  DrilldownPayload,
  ObservationTabPayload,
  OverviewPayload,
  StudentSupportTabPayload,
} from "@/lib/campus-quality/types"
import { AcademicQualityTab } from "./AcademicQualityTab"
import { AchievementsCertsTab } from "./AchievementsCertsTab"
import { AdmissionsMobilityTab } from "./AdmissionsMobilityTab"
import { DrilldownDrawer } from "./DrilldownDrawer"
import { ObservationTab } from "./ObservationTab"
import { OverviewSection } from "./OverviewSection"
import { StudentSupportTab } from "./StudentSupportTab"

const TABS: Array<{ key: DashboardTabKey; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "academic", label: "Chất lượng học tập" },
  { key: "admissions", label: "Tuyển sinh & đầu vào" },
  { key: "achievements", label: "Thành tích & chứng chỉ" },
  { key: "observation", label: "Dự giờ & phát triển chuyên môn" },
  { key: "support", label: "Hỗ trợ học sinh" },
]

export function CampusQualityDashboardClient() {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("overview")
  const [tabFocus, setTabFocus] = useState<string | undefined>(undefined)

  // Unified filters
  const [academicYearId, setAcademicYearId] = useState("")
  const [campusId, setCampusId] = useState("")
  const [level, setLevel] = useState("ALL")
  const [grade, setGrade] = useState("ALL")
  const [classId, setClassId] = useState("ALL")
  const [evaluationPeriod, setEvaluationPeriod] = useState("GK1")
  const [month, setMonth] = useState("")
  const [subjectId, setSubjectId] = useState("ALL")
  const [publishedOnly, setPublishedOnly] = useState(false)
  const [matchedCohortOnly, setMatchedCohortOnly] = useState(false)
  const [supportFilterMode, setSupportFilterMode] = useState<
    "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
  >("BELOW_SKL")

  // Realtime controls
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [snapshotVersion, setSnapshotVersion] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [availableFilters, setAvailableFilters] = useState<AvailableDashboardFilters | null>(null)
  const [scopeInfo, setScopeInfo] = useState<{
    roleDisplayLabel: string
    isCampusRestricted: boolean
    canViewPsychology: boolean
    canExportExcel: boolean
  } | null>(null)

  // Payloads per tab
  const [overviewData, setOverviewData] = useState<OverviewPayload | null>(null)
  const [academicData, setAcademicData] = useState<AcademicQualityTabPayload | null>(null)
  const [admissionsData, setAdmissionsData] = useState<AdmissionsMobilityTabPayload | null>(null)
  const [achievementsData, setAchievementsData] = useState<AchievementsCertsTabPayload | null>(null)
  const [observationData, setObservationData] = useState<ObservationTabPayload | null>(null)
  const [supportData, setSupportData] = useState<StudentSupportTabPayload | null>(null)

  // Drilldown Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerPayload, setDrawerPayload] = useState<DrilldownPayload | null>(null)
  const [drawerParams, setDrawerParams] = useState<{
    key: string
    classId?: string
    subjectId?: string
  } | null>(null)

  const initializedRef = useRef(false)

  const buildQueryString = useCallback(
    (view: string, extra?: Record<string, string | undefined>) => {
      const sp = new URLSearchParams()
      sp.set("view", view)
      if (academicYearId) sp.set("academicYearId", academicYearId)
      if (campusId) sp.set("campusId", campusId)
      if (level && level !== "ALL") sp.set("level", level)
      if (grade && grade !== "ALL") sp.set("grade", grade)
      if (classId && classId !== "ALL") sp.set("classId", classId)
      if (evaluationPeriod) sp.set("evaluationPeriod", evaluationPeriod)
      if (month) sp.set("month", month)
      if (subjectId && subjectId !== "ALL") sp.set("subjectId", subjectId)
      if (publishedOnly) sp.set("publishedOnly", "true")
      if (matchedCohortOnly) sp.set("matchedCohortOnly", "true")
      sp.set("supportFilterMode", supportFilterMode)
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) sp.set(k, v)
        }
      }
      return sp.toString()
    },
    [
      academicYearId,
      campusId,
      level,
      grade,
      classId,
      evaluationPeriod,
      month,
      subjectId,
      publishedOnly,
      matchedCohortOnly,
      supportFilterMode,
    ]
  )

  const fetchTab = useCallback(
    async (view: DashboardTabKey, silent = false) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        const qs = buildQueryString(view)
        const res = await fetch(`/api/admin/campus-quality?${qs}`, { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Không thể tải dữ liệu Quản trị chất lượng theo cơ sở")
        }

        if (json.availableFilters) setAvailableFilters(json.availableFilters)
        if (json.scope) setScopeInfo(json.scope)
        if (json.snapshotVersion) setSnapshotVersion(json.snapshotVersion)
        if (json.computedAt) {
          const d = new Date(json.computedAt)
          setLastUpdated(
            d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          )
        }

        // Sync defaults on first load
        if (!initializedRef.current && json.filters) {
          initializedRef.current = true
          if (json.filters.academicYearId) setAcademicYearId(json.filters.academicYearId)
          if (json.filters.campusId) setCampusId(json.filters.campusId)
          if (json.filters.month) setMonth(json.filters.month)
        }

        if (view === "overview") setOverviewData(json.data)
        else if (view === "academic") setAcademicData(json.data)
        else if (view === "admissions") setAdmissionsData(json.data)
        else if (view === "achievements") setAchievementsData(json.data)
        else if (view === "observation") setObservationData(json.data)
        else if (view === "support") setSupportData(json.data)
      } catch (err: any) {
        setError(err?.message || "Đã xảy ra lỗi khi tải dữ liệu")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [buildQueryString]
  )

  useEffect(() => {
    fetchTab(activeTab)
  }, [activeTab, fetchTab])

  // Visibility-aware 60s Realtime auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchTab(activeTab, true)
      }
    }, 60000)
    return () => clearInterval(timer)
  }, [autoRefresh, activeTab, fetchTab])

  const openDrilldown = useCallback(
    async (drilldownKey: string, extra?: { classId?: string; subjectId?: string }) => {
      setDrawerOpen(true)
      setDrawerLoading(true)
      setDrawerError(null)
      setDrawerParams({ key: drilldownKey, classId: extra?.classId, subjectId: extra?.subjectId })
      try {
        const qs = buildQueryString("drilldown", {
          drilldownKey,
          extraClassId: extra?.classId,
          extraSubjectId: extra?.subjectId,
        })
        const res = await fetch(`/api/admin/campus-quality?${qs}`, { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Không thể tải danh sách chi tiết")
        }
        setDrawerPayload(json.data)
      } catch (err: any) {
        setDrawerError(err?.message || "Lỗi tải danh sách chi tiết")
      } finally {
        setDrawerLoading(false)
      }
    },
    [buildQueryString]
  )

  const handleNavigateTab = (tab: DashboardTabKey, opts?: { focus?: string }) => {
    setTabFocus(opts?.focus)
    setActiveTab(tab)
  }

  const handleExportCurrentView = () => {
    const qs = buildQueryString(activeTab)
    window.open(`/api/admin/campus-quality/export?${qs}`, "_blank")
  }

  const handleExportDrilldown = () => {
    if (!drawerParams) return
    const qs = buildQueryString("drilldown", {
      drilldownKey: drawerParams.key,
      extraClassId: drawerParams.classId,
      extraSubjectId: drawerParams.subjectId,
    })
    window.open(`/api/admin/campus-quality/export?${qs}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 space-y-5">
      {/* Masthead */}
      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            Phân tích tổng hợp · Quản trị chất lượng theo cơ sở
          </div>
          <h1 className="text-lg md:text-xl font-bold text-[#003B3A] mt-0.5">
            Dashboard Quản trị chất lượng theo cơ sở
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
              Cập nhật lúc {lastUpdated || "—"}
            </span>
            {scopeInfo && (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#003B3A]" />
                Phạm vi: {scopeInfo.roleDisplayLabel}
              </span>
            )}
            {snapshotVersion && (
              <span className="text-slate-400">Phiên bản dữ liệu: #{snapshotVersion}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
            />
            Realtime (60 giây)
          </label>
          <button
            type="button"
            onClick={() => fetchTab(activeTab)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00A19A]" : ""}`} />
            Làm mới
          </button>
          {scopeInfo?.canExportExcel && (
            <button
              type="button"
              onClick={handleExportCurrentView}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>
          )}
        </div>
      </header>

      {/* Bộ lọc chung: Năm học · Cơ sở · Bậc học · Khối · Lớp + Mốc kỳ / tháng */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Năm học</label>
            <select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value)
                setGrade("ALL")
                setClassId("ALL")
              }}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {(availableFilters?.academicYears || []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Hiện hành)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Cơ sở</label>
            <select
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value)
                setClassId("ALL")
              }}
              disabled={Boolean(
                scopeInfo?.isCampusRestricted && (availableFilters?.campuses?.length || 0) <= 1
              )}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A] disabled:opacity-70"
            >
              {!scopeInfo?.isCampusRestricted && <option value="ALL">Toàn hệ thống</option>}
              {(availableFilters?.campuses || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusCode} · {c.campusName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Bậc học</label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setGrade("ALL")
                setClassId("ALL")
              }}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {(availableFilters?.levels || []).map((lv) => (
                <option key={lv.code} value={lv.code}>
                  {lv.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Khối</label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setClassId("ALL")
              }}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả khối</option>
              {(availableFilters?.grades || []).map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Lớp</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              <option value="ALL">Tất cả lớp</option>
              {(availableFilters?.classes || [])
                .filter((c) => grade === "ALL" || c.grade === grade)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Kỳ kiểm tra
            </label>
            <select
              value={evaluationPeriod}
              onChange={(e) => setEvaluationPeriod(e.target.value)}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {(availableFilters?.evaluationPeriods || [
                { code: "GK1", label: "Giữa kỳ 1" },
                { code: "CK1", label: "Cuối kỳ 1" },
                { code: "GK2", label: "Giữa kỳ 2" },
                { code: "CK2", label: "Cuối kỳ 2" },
              ]).map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Tháng theo dõi
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A19A]"
            >
              {(availableFilters?.months || []).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bộ lọc bổ sung cho Chất lượng học tập */}
        {(activeTab === "academic" || activeTab === "support") && (
          <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Môn học:</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-[#00A19A]"
              >
                <option value="ALL">Tất cả môn học</option>
                {(availableFilters?.subjects || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={publishedOnly}
                onChange={(e) => setPublishedOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
              />
              Chỉ tính sổ điểm đã khóa / công bố
            </label>
          </div>
        )}
      </section>

      {/* Thanh chuyển Thẻ chi tiết */}
      <nav className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTabFocus(undefined)
              setActiveTab(t.key)
            }}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === t.key
                ? "bg-[#003B3A] text-white"
                : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#00A19A]" />
          <span className="text-xs">Đang tổng hợp dữ liệu thực tế từ SSM...</span>
        </div>
      ) : (
        <>
          {activeTab === "overview" && overviewData && (
            <OverviewSection
              data={overviewData}
              onNavigateTab={handleNavigateTab}
              onOpenDrilldown={(key) => openDrilldown(key)}
            />
          )}

          {activeTab === "academic" && academicData && (
            <AcademicQualityTab
              data={academicData}
              matchedCohortOnly={matchedCohortOnly}
              onToggleMatchedCohort={setMatchedCohortOnly}
              onOpenCellDrilldown={({ classId: cid, subjectId: sid, key }) =>
                openDrilldown(key || "ACADEMIC_CELL", { classId: cid, subjectId: sid })
              }
              onNavigateTab={(t) => handleNavigateTab(t)}
              initialSubView={tabFocus === "international" ? "INTERNATIONAL" : "GENERAL"}
            />
          )}

          {activeTab === "admissions" && admissionsData && (
            <AdmissionsMobilityTab
              data={admissionsData}
              onOpenDrilldown={(key) => openDrilldown(key)}
            />
          )}

          {activeTab === "achievements" && achievementsData && (
            <AchievementsCertsTab data={achievementsData} />
          )}

          {activeTab === "observation" && observationData && (
            <ObservationTab
              data={observationData}
              onOpenDrilldown={(key) => openDrilldown(key)}
            />
          )}

          {activeTab === "support" && supportData && (
            <StudentSupportTab
              data={supportData}
              supportFilterMode={supportFilterMode}
              onChangeSupportFilterMode={setSupportFilterMode}
              initialSubTab={
                tabFocus === "commitment"
                  ? "COMMITMENT"
                  : tabFocus === "psychology-owner"
                    ? "PSYCHOLOGY"
                    : "ACADEMIC"
              }
              initialPsychGroupBy={tabFocus === "psychology-owner" ? "OWNER" : "CLASS"}
            />
          )}
        </>
      )}

      {/* Slide-over Drilldown Drawer */}
      <DrilldownDrawer
        open={drawerOpen}
        loading={drawerLoading}
        payload={drawerPayload}
        error={drawerError}
        canExportExcel={Boolean(scopeInfo?.canExportExcel)}
        onClose={() => setDrawerOpen(false)}
        onExportExcel={handleExportDrilldown}
      />
    </div>
  )
}
