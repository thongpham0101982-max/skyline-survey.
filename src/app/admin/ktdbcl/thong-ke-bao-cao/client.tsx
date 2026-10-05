// @ts-nocheck
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  TrendingUp,
  ClipboardCheck,
  Unlock,
  MessageSquare,
  Award,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock
} from "lucide-react"

import { GradeAnalyticsTab } from "@/app/admin/ktdbcl/diem-nhan-xet/analytics-tab"
import { GradeProgressTab } from "@/app/admin/ktdbcl/diem-nhan-xet/progress-tab"
import { GradeUnlockRequestsTab } from "@/app/admin/ktdbcl/diem-nhan-xet/requests-tab"
import { FeedbackTrackingTab } from "@/app/admin/ktdbcl/diem-nhan-xet/feedback-tracking-tab"

interface Props {
  academicYears: any[]
  activeYearId: string
  classes: any[]
  subjects: any[]
  campuses?: any[]
}

export function ThongKeBaoCaoClient(props: Props) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải Thống kê báo cáo...</div>}>
      <ThongKeBaoCaoInner {...props} />
    </Suspense>
  )
}

function ThongKeBaoCaoInner({ academicYears, activeYearId, classes, subjects, campuses = [] }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Academic year filter
  const [selectedYearId, setSelectedYearId] = useState(activeYearId || (academicYears[0]?.id || ""))

  // Main active tab: "analytics" | "monitoring" | "feedback"
  // Monitoring sub-tab: "progress" | "requests"
  const tabParam = searchParams.get("tab") || "analytics"

  const initialMainTab = useMemo(() => {
    if (tabParam === "progress" || tabParam === "requests") return "monitoring"
    if (tabParam === "feedback") return "feedback"
    return "analytics"
  }, [tabParam])

  const initialMonitoringSubTab = useMemo(() => {
    if (tabParam === "requests") return "requests"
    return "progress"
  }, [tabParam])

  const [activeMainTab, setActiveMainTab] = useState<"analytics" | "monitoring" | "feedback">(initialMainTab)
  const [monitoringSubTab, setMonitoringSubTab] = useState<"progress" | "requests">(initialMonitoringSubTab)

  // Sync state if URL changes externally
  useEffect(() => {
    if (tabParam === "progress" || tabParam === "requests") {
      setActiveMainTab("monitoring")
      setMonitoringSubTab(tabParam)
    } else if (tabParam === "feedback") {
      setActiveMainTab("feedback")
    } else {
      setActiveMainTab("analytics")
    }
  }, [tabParam])

  // Pending unlock requests badge count
  const [pendingUnlockCount, setPendingUnlockCount] = useState(0)

  const fetchPendingUnlockCount = async () => {
    if (!selectedYearId) return
    try {
      const res = await fetch(`/api/admin/ktdbcl/gradebook-unlock-requests?academicYearId=${selectedYearId}&status=PENDING`)
      const data = await res.json()
      if (data.success) {
        setPendingUnlockCount(data.pendingCount || 0)
      }
    } catch (e) {
      console.error("Lỗi lấy số lượng yêu cầu mở sổ:", e)
    }
  }

  // Saved configs for Analytics tab
  const [savedConfigs, setSavedConfigs] = useState<any[]>([])

  const fetchConfigs = async () => {
    if (!selectedYearId) return
    try {
      const res = await fetch(`/api/admin/ktdbcl/subject-grade-config?academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (data.success) {
        setSavedConfigs(data.configs || [])
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cấu hình:", err)
    }
  }

  useEffect(() => {
    fetchPendingUnlockCount()
    fetchConfigs()
  }, [selectedYearId])

  const handleTabChange = (mainTab: "analytics" | "monitoring" | "feedback", subTab?: "progress" | "requests") => {
    setActiveMainTab(mainTab)
    let targetParam = mainTab === "analytics" ? "analytics" : mainTab === "feedback" ? "feedback" : (subTab || monitoringSubTab)
    if (subTab) setMonitoringSubTab(subTab)
    router.replace(`/admin/ktdbcl/thong-ke-bao-cao?tab=${targetParam}`, { scroll: false })
  }

  // Callback navigate to Gradebook
  const handleNavigateToGradebook = (params: any) => {
    const query = new URLSearchParams()
    query.set("tab", "grades")
    if (params.campusId) query.set("campusId", params.campusId)
    if (params.grade) query.set("grade", params.grade)
    if (params.classId) query.set("classId", params.classId)
    if (params.subjectId) query.set("subjectId", params.subjectId)
    if (params.period) query.set("period", params.period)
    router.push(`/admin/ktdbcl/diem-nhan-xet?${query.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#48BFE3] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-teal-200 mb-2">
              <Award className="w-3.5 h-3.5 text-teal-300" />
              Khảo thí & Đảm bảo Chất lượng Sky-Line
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Thống kê báo cáo</h1>
            <p className="text-teal-100 text-xs md:text-sm mt-1 max-w-3xl">
              Phân tích điểm trung bình các môn & phổ điểm, giám sát tiến độ nhập điểm, phê duyệt mở sổ và tổng hợp phản hồi hai chiều từ PHHS & Giáo viên.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/ktdbcl/diem-nhan-xet"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold text-white transition-all backdrop-blur-sm shadow-sm"
              title="Đi đến Quản lý Điểm & Nhận xét"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>Sổ điểm & Cấu hình</span>
              <ExternalLink className="w-3 h-3 text-white/70" />
            </Link>

            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id} className="text-slate-800">
                  Năm học: {y.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 border-t border-white/10 pt-4">
          {/* TAB 1 */}
          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === "analytics"
                ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>1. Điểm trung bình các môn: Phân tích kết quả & phổ điểm</span>
          </button>

          {/* TAB 2 (Nhóm con) */}
          <button
            type="button"
            onClick={() => handleTabChange("monitoring", monitoringSubTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeMainTab === "monitoring"
                ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-teal-600" />
            <span>2. Giám sát nhập điểm</span>
            {pendingUnlockCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 shadow-xs animate-pulse">
                {pendingUnlockCount}
              </span>
            )}
          </button>

          {/* TAB 3 */}
          <button
            type="button"
            onClick={() => handleTabChange("feedback")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeMainTab === "feedback"
                ? "bg-white text-[#003B3A] shadow-lg shadow-black/10 scale-105"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-teal-600" />
            <span>3. Tổng hợp: Theo dõi phản hồi PHHS và Trao đổi</span>
          </button>
        </div>
      </div>

      {/* SUB-NAVIGATION FOR TAB 2: GIÁM SÁT NHẬP ĐIỂM */}
      {activeMainTab === "monitoring" && (
        <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("monitoring", "progress")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                monitoringSubTab === "progress"
                  ? "bg-[#005B58] text-white shadow-md shadow-teal-900/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>2.1. Thống kê tiến độ nhập điểm</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleTabChange("monitoring", "requests")
                fetchPendingUnlockCount()
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                monitoringSubTab === "requests"
                  ? "bg-[#005B58] text-white shadow-md shadow-teal-900/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>2.2. Duyệt yêu cầu mở sổ điểm</span>
              {pendingUnlockCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  monitoringSubTab === "requests" ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-900"
                }`}>
                  {pendingUnlockCount} chờ duyệt
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 pr-2">
            {monitoringSubTab === "progress" ? (
              <span>Theo dõi tiến độ nhập điểm của giáo viên các môn & gửi email nhắc nhở</span>
            ) : (
              <span>Xem xét và phê duyệt các yêu cầu mở khóa sổ điểm ngoài hạn nộp</span>
            )}
          </div>
        </div>
      )}

      {/* CONTENT: TAB 1: ANALYTICS & SCORE DISTRIBUTION */}
      {activeMainTab === "analytics" && (
        <GradeAnalyticsTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          savedConfigs={savedConfigs}
          onNavigateToGradebook={handleNavigateToGradebook}
        />
      )}

      {/* CONTENT: TAB 2.1: GRADE PROGRESS TAB */}
      {activeMainTab === "monitoring" && monitoringSubTab === "progress" && (
        <GradeProgressTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          onNavigateToGradebook={handleNavigateToGradebook}
          onNavigateToRequests={() => {
            handleTabChange("monitoring", "requests")
            fetchPendingUnlockCount()
          }}
        />
      )}

      {/* CONTENT: TAB 2.2: GRADEBOOK UNLOCK REQUESTS */}
      {activeMainTab === "monitoring" && monitoringSubTab === "requests" && (
        <GradeUnlockRequestsTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          onNavigateToGradebook={handleNavigateToGradebook}
          onRequestsUpdated={fetchPendingUnlockCount}
        />
      )}

      {/* CONTENT: TAB 3: FEEDBACK TRACKING TAB */}
      {activeMainTab === "feedback" && (
        <FeedbackTrackingTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
        />
      )}
    </div>
  )
}
