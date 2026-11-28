// @ts-nocheck
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Unlock,
  MessageSquare,
  GraduationCap,
  ChevronRight,
  Home,
  Calendar,
} from "lucide-react"

import { GradeUnlockRequestsTab } from "@/app/admin/ktdbcl/diem-nhan-xet/requests-tab"
import { FeedbackTrackingTab } from "@/app/admin/ktdbcl/diem-nhan-xet/feedback-tracking-tab"
import EntranceCommitmentReportView from "@/components/ktdbcl/EntranceCommitmentReportView"

interface Props {
  academicYears: any[]
  activeYearId: string
  classes: any[]
  subjects: any[]
  campuses?: any[]
  isSubjectScoped?: boolean
}

export function ThongKeBaoCaoClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Đang tải Duyệt mở sổ &amp; Phản hồi PHHS...
        </div>
      }
    >
      <ThongKeBaoCaoInner {...props} />
    </Suspense>
  )
}

function ThongKeBaoCaoInner({
  academicYears,
  activeYearId,
  classes,
  subjects,
  campuses = [],
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedYearId, setSelectedYearId] = useState(
    activeYearId || (academicYears[0]?.id || "")
  )

  const tabParam = searchParams.get("tab") || "requests"
  const [activeTab, setActiveTab] = useState<"requests" | "feedback" | "entrance-commitment">(
    tabParam === "feedback"
      ? "feedback"
      : tabParam === "entrance-commitment"
        ? "entrance-commitment"
        : "requests"
  )

  // Chuyển hướng các tab thống kê / tiến độ cũ sang Phân tích Tổng hợp Kết quả (THKQ) để không trùng lặp
  useEffect(() => {
    if (tabParam === "analytics") {
      router.replace("/admin/ktdbcl/phan-tich-thkq?report=teacher-test-quality")
      return
    }
    if (tabParam === "progress") {
      router.replace("/admin/ktdbcl/giam-sat-tien-do?tab=entry-status")
      return
    }
    if (tabParam === "feedback") {
      setActiveTab("feedback")
    } else if (tabParam === "entrance-commitment") {
      setActiveTab("entrance-commitment")
    } else {
      setActiveTab("requests")
    }
  }, [tabParam, router])

  const [pendingUnlockCount, setPendingUnlockCount] = useState(0)

  const fetchPendingUnlockCount = async () => {
    if (!selectedYearId) return
    try {
      const res = await fetch(
        `/api/admin/ktdbcl/gradebook-unlock-requests?academicYearId=${selectedYearId}&status=PENDING`
      )
      if (!res.ok) return
      const data = await res.json()
      if (data.success) {
        setPendingUnlockCount(data.pendingCount || 0)
      }
    } catch (e) {
      console.error("Lỗi lấy số lượng yêu cầu mở sổ:", e)
    }
  }

  useEffect(() => {
    fetchPendingUnlockCount()
  }, [selectedYearId])

  const handleTabChange = (tab: "requests" | "feedback" | "entrance-commitment") => {
    setActiveTab(tab)
    router.replace(`/admin/ktdbcl/thong-ke-bao-cao?tab=${tab}`, { scroll: false })
  }

  const handleNavigateToGradebook = (params: any) => {
    const query = new URLSearchParams()
    query.set("tab", "grades")
    if (params.campusId) query.set("campusId", params.campusId)
    if (params.grade) query.set("grade", params.grade)
    if (params.classId) query.set("classId", params.classId)
    if (params.subjectId) query.set("subjectId", params.subjectId)
    if (params.period) query.set("period", params.period)
    if (params.configType) query.set("configType", params.configType)
    router.push(`/admin/ktdbcl/diem-nhan-xet?${query.toString()}`)
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header chuẩn Sky-Line Academic Ledger */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-5 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5 font-medium">
              <a
                href="/admin"
                className="hover:text-slate-800 transition flex items-center gap-1"
              >
                <Home className="h-3.5 w-3.5" /> Quản trị
              </a>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-slate-600">Sổ điểm - Nhận xét</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#00736E] font-semibold">
                Thống kê báo cáo
              </span>
            </nav>

            <div className="border-l-4 border-[#003B3A] pl-3.5">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {activeTab === "requests"
                  ? "Duyệt yêu cầu mở khóa sổ điểm"
                  : activeTab === "feedback"
                    ? "Theo dõi phản hồi PHHS & trao đổi hai chiều"
                    : "Học sinh cam kết đầu vào"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === "requests"
                  ? "Tiếp nhận, xét duyệt và quản lý khóa sổ điểm sau khi giáo viên hoàn tất điều chỉnh."
                  : activeTab === "feedback"
                    ? "Giám sát luồng phản hồi phụ huynh và phối hợp xử lý giữa giáo viên chủ nhiệm với giáo viên bộ môn."
                    : "Báo cáo kết quả khảo sát đầu năm (KSĐN) và bốn kỳ kiểm tra định kỳ của học sinh theo từng môn cam kết đầu vào."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {activeTab !== "entrance-commitment" && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
                <span className="text-slate-500 font-medium">Năm học:</span>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer tabular-nums"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="inline-flex items-center rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0] gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleTabChange("requests")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "requests"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Duyệt yêu cầu mở sổ</span>
                {pendingUnlockCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                      activeTab === "requests"
                        ? "bg-[#D97706] text-white"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {pendingUnlockCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("feedback")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "feedback"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Phản hồi PHHS &amp; Trao đổi</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("entrance-commitment")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "entrance-commitment"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Học sinh cam kết đầu vào</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung Tab */}
      {activeTab === "requests" ? (
        <GradeUnlockRequestsTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          onNavigateToGradebook={handleNavigateToGradebook}
          onRequestsUpdated={fetchPendingUnlockCount}
        />
      ) : activeTab === "feedback" ? (
        <FeedbackTrackingTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
        />
      ) : (
        <EntranceCommitmentReportView
          initialAcademicYearId={selectedYearId}
          embedded
        />
      )}
    </div>
  )
}
