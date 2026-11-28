// @ts-nocheck
"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ClipboardCheck,
  Users,
  ChevronRight,
  Home,
  ShieldCheck,
} from "lucide-react"

import { GradeProgressTab } from "@/app/admin/ktdbcl/diem-nhan-xet/progress-tab"
import { MissingStudentsGradesTab } from "@/app/admin/ktdbcl/diem-nhan-xet/missing-students-tab"

interface Props {
  academicYears: any[]
  activeYearId: string
  campuses: any[]
  subjects: any[]
  classes: any[]
  isSubjectScoped?: boolean
  accessScope?: any
}

export function GiamSatTienDoClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Đang tải hệ thống Giám sát tiến độ nhập điểm...
        </div>
      }
    >
      <GiamSatTienDoClientInner {...props} />
    </Suspense>
  )
}

type GstdTab = "missing-students" | "entry-status"

function GiamSatTienDoClientInner({
  academicYears = [],
  activeYearId = "",
  campuses = [],
  subjects = [],
  classes = [],
  accessScope = null,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedYearId, setSelectedYearId] = useState(
    activeYearId || (academicYears[0]?.id ?? "")
  )

  const rawTabParam = searchParams?.get("tab") || "missing-students"
  const resolvedTab: GstdTab =
    rawTabParam === "entry-status" || rawTabParam === "progress"
      ? "entry-status"
      : "missing-students"

  const [activeTab, setActiveTab] = useState<GstdTab>(resolvedTab)

  useEffect(() => {
    const nextTab: GstdTab =
      rawTabParam === "entry-status" || rawTabParam === "progress"
        ? "entry-status"
        : "missing-students"
    if (nextTab !== activeTab) {
      setActiveTab(nextTab)
    }
  }, [rawTabParam, activeTab])

  const handleTabChange = (tab: GstdTab) => {
    setActiveTab(tab)
    router.replace(`/admin/ktdbcl/giam-sat-tien-do?tab=${tab}`, { scroll: false })
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
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
                Giám sát tiến độ nhập điểm
              </span>
            </nav>

            <div className="border-l-4 border-[#003B3A] pl-3 flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                {activeTab === "missing-students"
                  ? "1. Thống kê học sinh thiếu điểm"
                  : "2. Thống kê tình hình nhập điểm"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00A19A]" />
                {accessScope?.roleDisplayLabel || "Sổ điểm & Khảo thí Sky-Line"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-slate-800 focus:outline-none focus:border-[#008B85]"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  Năm học: {y.name}
                </option>
              ))}
            </select>

            <div className="inline-flex flex-wrap items-center rounded-xl bg-[#F8FAFC] p-1 border border-[#E2E8F0] gap-1">
              <button
                type="button"
                onClick={() => handleTabChange("missing-students")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "missing-students"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>1. Thống kê học sinh thiếu điểm</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("entry-status")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === "entry-status"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>2. Thống kê tình hình nhập điểm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung Danh mục con */}
      {activeTab === "missing-students" ? (
        <MissingStudentsGradesTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          onNavigateToGradebook={handleNavigateToGradebook}
          onSwitchToEntryStatus={() => handleTabChange("entry-status")}
        />
      ) : (
        <GradeProgressTab
          academicYears={academicYears}
          selectedYearId={selectedYearId}
          campuses={campuses}
          classes={classes}
          subjects={subjects}
          onNavigateToGradebook={handleNavigateToGradebook}
          onNavigateToRequests={() =>
            router.push("/admin/ktdbcl/thong-ke-bao-cao?tab=requests")
          }
        />
      )}
    </div>
  )
}
