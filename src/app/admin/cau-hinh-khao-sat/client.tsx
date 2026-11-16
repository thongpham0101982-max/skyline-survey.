"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Baby, ClipboardList, ShieldAlert } from "lucide-react"
import { InputAssessmentsClient } from "../input-assessments/client"
import { PreschoolInputAssessmentsClient } from "../preschool-input-assessments/client"
import {
  isSuperAdminRole,
  isKtdbclEntranceRole,
  isGdcsOrBghEntranceRole,
  isGiaoVuEntranceRole,
} from "@/lib/entrance-progress/constants"

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
  destinationSchools?: any[]

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

  const userRole = (currentUser?.role || "").toUpperCase().trim()
  const isAdminOrExamBoard = isSuperAdminRole(userRole) || isKtdbclEntranceRole(userRole)
  const isGDCSOrGiaoVu = isGdcsOrBghEntranceRole(userRole) || isGiaoVuEntranceRole(userRole)

  // Kiểm tra quyền truy cập dựa trên permission module code và vai trò
  const hasK12Permission = isAdminOrExamBoard || 
                           isGDCSOrGiaoVu || 
                           rolePermissions.some((p: any) => p.canRead && (
                             p.module === "CAU_HINH_KHAO_SAT" ||
                             p.module === "INPUT_ASSESSMENTS" ||
                             p.module?.startsWith("INPUT_ASSESSMENTS_")
                           ))

  const hasPreschoolPermission = isAdminOrExamBoard || 
                                 isGDCSOrGiaoVu || 
                                 rolePermissions.some((p: any) => p.canRead && (
                                   p.module === "CAU_HINH_KHAO_SAT" ||
                                   p.module === "PRESCHOOL_INPUT_ASSESSMENTS"
                                 ))

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
      <div className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-2xs rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-[#003B3A] tracking-tight">
            Cấu hình khảo sát đầu vào
          </h1>
          <p className="text-xs text-slate-500">
            Thiết lập môn khảo sát, hệ đào tạo, khung năng lực và tiêu chí đánh giá theo bậc học
          </p>
        </div>
        <div className="flex flex-wrap p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl gap-1 shrink-0">
          {hasK12Permission && (
            <button
              onClick={() => handleTabChange("k12")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "k12"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-white hover:text-[#003B3A]"
              }`}
            >
              <ClipboardList className={`w-3.5 h-3.5 ${activeTab === "k12" ? "text-[#00A19A]" : "text-slate-500"}`} />
              <span>Phổ thông (K-12)</span>
            </button>
          )}

          {hasPreschoolPermission && (
            <button
              onClick={() => handleTabChange("preschool")}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === "preschool"
                  ? "bg-[#003B3A] text-white shadow-2xs"
                  : "text-slate-600 hover:bg-white hover:text-[#003B3A]"
              }`}
            >
              <Baby className={`w-3.5 h-3.5 ${activeTab === "preschool" ? "text-[#00A19A]" : "text-slate-500"}`} />
              <span>Mầm non</span>
            </button>
          )}
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
