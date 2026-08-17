"use client"
import { useState } from "react"
import { GraduationCap, Baby, AlertCircle } from "lucide-react"
import { PhanCongK12Client } from "./k12-client"
import { PhanCongMamNonClient } from "./mam-non-client"

interface Props {
  academicYears: any[]
  k12Periods: any[]
  preschoolPeriods: any[]
  teachers: any[]
  departments: any[]
  subjects: any[]
  eduSystems: any[]
  k12Grades: string[]
  preschoolGrades: string[]
  campuses: any[]
  giaoVuCSUsers?: any[]
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null
  rolePermissions?: any[]
}

export function PhanCongKhaoSatClient({
  academicYears = [],
  k12Periods = [],
  preschoolPeriods = [],
  giaoVuCSUsers = [],
  teachers = [],
  departments = [],
  subjects = [],
  eduSystems = [],
  k12Grades = [],
  preschoolGrades = [],
  campuses = [],
  currentUser = null,
  rolePermissions = []
}: Props) {
  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL"
  
  // Kiểm tra quyền truy cập chi tiết dựa vào phân quyền module con
  const hasK12 = isAdmin || rolePermissions.some(p => p.module === "PHAN_CONG_K12")
  const hasPreschool = isAdmin || rolePermissions.some(p => p.module === "PHAN_CONG_MAM_NON")

  // Đặt tab mặc định dựa trên quyền khả dụng
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
          Tài khoản của bạn chưa được cấp quyền truy cập tính năng Phân công K-12 hoặc Phân công Mầm non. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Tab Selector */}
      {hasK12 && hasPreschool && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex gap-2 w-fit">
          <button
            onClick={() => setActiveTab("k12")}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
              activeTab === "k12"
                ? "bg-[#003B3A] text-white shadow-lg shadow-teal-100/30 scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Phân công K-12
          </button>
          <button
            onClick={() => setActiveTab("preschool")}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all duration-300 ${
              activeTab === "preschool"
                ? "bg-[#48BFE3] text-white shadow-lg shadow-teal-100/30 scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Baby className="w-4 h-4" />
            Phân công Mầm non
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="transition-all duration-350 ease-in-out">
        {activeTab === "k12" && hasK12 && (
          <PhanCongK12Client
            academicYears={academicYears}
            initialPeriods={k12Periods}
            teachers={teachers}
            departments={departments}
            subjects={subjects}
            eduSystems={eduSystems}
            grades={k12Grades}
            campuses={campuses}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
          />
        )}
        {activeTab === "preschool" && hasPreschool && (
          <PhanCongMamNonClient
            academicYears={academicYears}
            initialPeriods={preschoolPeriods}
            teachers={teachers}
            departments={departments}
            campuses={campuses}
            grades={preschoolGrades}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            giaoVuCSUsers={giaoVuCSUsers}
          />
        )}
      </div>
    </div>
  )
}
