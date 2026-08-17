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
  classes?: any[]
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
  destinationSchools = [],
  currentUser = null,
  rolePermissions = [],
  classes = []
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
        <div className="w-16 h-16 flex items-center justify-center mb-5 text-xs font-semibold">
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
      {/* UNIFIED PAGE HEADER */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-0.5">
          <h1 className="text-base font-black text-slate-800 tracking-tight">
            {activeTab === "k12" ? "Xét duyệt K-12" : "Xét duyệt Mầm non"}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
            {activeTab === "k12"
              ? "Tổng hợp kết quả khảo sát & xét duyệt học sinh phổ thông"
              : "Xét duyệt & đánh giá phát triển học sinh bậc Mầm non"}
          </p>
        </div>

        {/* Tab Selector */}
        {hasK12 && hasPreschool && (
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("k12")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "k12"
                  ? "bg-[#48BFE3] text-white shadow-md shadow-teal-500/10"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/40"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Xét duyệt K-12
            </button>
            <button
              onClick={() => setActiveTab("preschool")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === "preschool"
                  ? "bg-[#48BFE3] text-white shadow-md shadow-teal-500/10"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/40"
              }`}
            >
              <Baby className="w-4 h-4" />
              Xét duyệt Mầm non
            </button>
          </div>
        )}
      </div>

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
            destinationSchools={destinationSchools}
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
            classes={classes}
          />
        )}
      </div>
    </div>
  )
}
