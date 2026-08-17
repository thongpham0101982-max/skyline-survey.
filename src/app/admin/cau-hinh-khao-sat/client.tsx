"use client"

import { useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Baby, ClipboardList, ShieldAlert } from "lucide-react"
import { InputAssessmentsClient } from "../input-assessments/client"
import { PreschoolInputAssessmentsClient } from "../preschool-input-assessments/client"

interface SurveyConfigClientProps {
  initialTab: string
  academicYears: any[]
  campuses: any[]
  giaoVuCSUsers: any[]
  teachers: any[]
  departments: any[]
  
  // K12
  examBoardUsers: any[]
  gdcsUsers: any[]
  subjects: any[]
  eduSystems: any[]
  gradesK12: string[]
  configs: any[]
  rolePermissions: any[]

  // Mầm non
  gradesPreschool: string[]

  // User
  currentUser: any
}

export function SurveyConfigClient({
  initialTab,
  academicYears,
  campuses,
  giaoVuCSUsers,
  teachers,
  departments,
  examBoardUsers,
  gdcsUsers,
  subjects,
  eduSystems,
  gradesK12,
  configs,
  rolePermissions,
  destinationSchools = [],
  gradesPreschool,
  currentUser
}: SurveyConfigClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdminOrExamBoard = userRole === "ADMIN" || userRole === "KT_DBCL"
  const isGDCSOrGiaoVu = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole)

  // Kiểm tra quyền truy cập dựa trên permission module code và vai trò
  const hasK12Permission = isAdminOrExamBoard || 
                           isGDCSOrGiaoVu || 
                           rolePermissions.some((p: any) => p.module === "INPUT_ASSESSMENTS" && p.canRead)

  const hasPreschoolPermission = isAdminOrExamBoard || 
                                 isGDCSOrGiaoVu || 
                                 rolePermissions.some((p: any) => p.module === "PRESCHOOL_INPUT_ASSESSMENTS" && p.canRead)

  // Xác định tab đang hoạt động
  const paramTab = searchParams.get("tab") || initialTab
  let activeTab = ""

  if (paramTab === "preschool" && hasPreschoolPermission) {
    activeTab = "preschool"
  } else if (paramTab === "k12" && hasK12Permission) {
    activeTab = "k12"
  } else {
    // Fallback sang tab đầu tiên có quyền
    if (hasK12Permission) activeTab = "k12"
    else if (hasPreschoolPermission) activeTab = "preschool"
  }

  const handleTabChange = (tabName: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabName)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Trường hợp không có bất kỳ quyền nào
  if (!hasK12Permission && !hasPreschoolPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 flex items-center justify-center mb-4 animate-bounce text-xs font-semibold">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Không có quyền truy cập</h2>
        <p className="text-sm text-slate-500 text-center max-w-md">
          Tài khoản của bạn không được phân quyền truy cập trang Cấu hình Khảo sát. Vui lòng liên hệ Quản trị viên để được hỗ trợ.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Tab Selector Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap p-1 bg-slate-100/80 rounded-xl gap-1">
          {hasK12Permission && (
            <button
              onClick={() => handleTabChange("k12")}
              className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                activeTab === "k12"
                  ? "bg-[#48BFE3] text-white shadow-md shadow-teal-500/10 scale-[1.02]"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
              }`}
            >
              <ClipboardList className={`w-4 h-4 transition-transform duration-300 ${activeTab === "k12" ? "rotate-3" : ""}`} />
              <span>Phổ thông K-12</span>
            </button>
          )}

          {hasPreschoolPermission && (
            <button
              onClick={() => handleTabChange("preschool")}
              className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-xs font-bold transition-all duration-300 ${
                activeTab === "preschool"
                  ? "bg-[#48BFE3] text-white shadow-md shadow-teal-500/10 scale-[1.02]"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
              }`}
            >
              <Baby className={`w-4 h-4 transition-transform duration-300 ${activeTab === "preschool" ? "scale-110" : ""}`} />
              <span>KSNL Đầu vào Mầm non</span>
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#48BFE3]/5 rounded-xl border border-[#48BFE3]/10">
          <span className="w-2 h-2 rounded-full bg-[#48BFE3] animate-ping" />
          <span className="text-[11px] font-bold text-[#48BFE3] uppercase tracking-wider">
            Trình quản lý Cấu hình Khảo sát
          </span>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300 animate-in fade-in duration-300">
        {activeTab === "k12" && hasK12Permission && (
          <InputAssessmentsClient
            academicYears={academicYears}
            campuses={campuses}
            examBoardUsers={examBoardUsers}
            giaoVuCSUsers={giaoVuCSUsers}
            gdcsUsers={gdcsUsers}
            subjects={subjects}
            eduSystems={eduSystems}
            grades={gradesK12}
            configs={configs}
            teachers={teachers}
            departments={departments}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            destinationSchools={destinationSchools}
          />
        )}

        {activeTab === "preschool" && hasPreschoolPermission && (
          <PreschoolInputAssessmentsClient
            academicYears={academicYears}
            campuses={campuses}
            giaoVuCSUsers={giaoVuCSUsers}
            grades={gradesPreschool}
            teachers={teachers}
            departments={departments}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  )
}
