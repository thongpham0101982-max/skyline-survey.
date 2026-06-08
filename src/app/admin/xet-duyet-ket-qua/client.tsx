"use client"
import { useState } from "react"
import { GraduationCap, Baby, AlertCircle } from "lucide-react"
import { XetDuyetK12Client } from "./k12-client"
import { XetDuyetMamNonClient } from "./mam-non-client"

interface Props {
  academicYears: any[]
  campuses: any[]
  examBoardUsers: any[]
  giaoVuCSUsers: any[]
  gdcsUsers: any[]
  subjects: any[]
  eduSystems: any[]
  k12Grades: string[]
  preschoolGrades: string[]
  configs: any[]
  teachers: any[]
  departments: any[]
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null
  rolePermissions?: any[]
}

export function XetDuyetKetQuaClient({
  academicYears = [],
  campuses = [],
  examBoardUsers = [],
  giaoVuCSUsers = [],
  gdcsUsers = [],
  subjects = [],
  eduSystems = [],
  k12Grades = [],
  preschoolGrades = [],
  configs = [],
  teachers = [],
  departments = [],
  currentUser = null,
  rolePermissions = []
}: Props) {
  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL"
  
  // Kiểm tra quyền truy cập chi tiết
  const hasK12 = isAdmin || rolePermissions.some(p => p.module === "INPUT_ASSESSMENTS_REPORTS")
  const hasPreschool = isAdmin || 
                        rolePermissions.some(p => p.module === "XET_DUYET_MAM_NON") || 
                        rolePermissions.some(p => p.module === "PRESCHOOL_INPUT_ASSESSMENTS") ||
                        ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole)

  const defaultTab = hasK12 ? "k12" : (hasPreschool ? "preschool" : null)
  const [activeTab, setActiveTab] = useState<"k12" | "preschool" | null>(defaultTab)

  if (!hasK12 && !hasPreschool) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 border border-rose-100">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-base font-black text-slate-800 mb-1">Không có quyền truy cập</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Tài khoản của bạn chưa được cấp quyền truy cập tính năng Xét duyệt K-12 hoặc Xét duyệt Mầm non. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Tab Selector */}
      {hasK12 && hasPreschool && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex gap-2 w-fit no-print">
          <button
            onClick={() => setActiveTab("k12")}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
              activeTab === "k12"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Xét duyệt K-12
          </button>
          <button
            onClick={() => setActiveTab("preschool")}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
              activeTab === "preschool"
                ? "bg-teal-600 text-white shadow-lg shadow-teal-100 scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Baby className="w-4 h-4" />
            Xét duyệt Mầm non
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="transition-all duration-350 ease-in-out">
        {activeTab === "k12" && hasK12 && (
          <XetDuyetK12Client
            academicYears={academicYears}
            campuses={campuses}
            examBoardUsers={examBoardUsers}
            giaoVuCSUsers={giaoVuCSUsers}
            gdcsUsers={gdcsUsers}
            subjects={subjects}
            eduSystems={eduSystems}
            grades={k12Grades}
            configs={configs}
            teachers={teachers}
            departments={departments}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
          />
        )}
        {activeTab === "preschool" && hasPreschool && (
          <XetDuyetMamNonClient
            academicYears={academicYears}
            campuses={campuses}
            giaoVuCSUsers={giaoVuCSUsers}
            grades={preschoolGrades}
            teachers={teachers}
            departments={departments}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  )
}
