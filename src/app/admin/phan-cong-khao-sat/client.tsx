"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get("tab")

  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "KTDBCL"
  
  // Kiểm tra quyền truy cập chi tiết dựa vào phân quyền module con và module cha
  const hasK12 = isAdmin || rolePermissions.some(p => p.canRead && (
    p.module === "PHAN_CONG_K12" ||
    p.module === "PHAN_CONG_KHAO_SAT" ||
    p.module === "INPUT_ASSESSMENTS_ASSIGNMENTS" ||
    p.module === "INPUT_ASSESSMENTS"
  ))
  const hasPreschool = isAdmin || rolePermissions.some(p => p.canRead && (
    p.module === "PHAN_CONG_MAM_NON" ||
    p.module === "PHAN_CONG_KHAO_SAT" ||
    p.module === "PRESCHOOL_INPUT_ASSESSMENTS"
  ))

  // Đặt tab mặc định dựa trên URL query và quyền khả dụng
  const defaultTab = tabParam === "preschool" && hasPreschool
    ? "preschool"
    : tabParam === "k12" && hasK12
    ? "k12"
    : hasK12 ? "k12" : (hasPreschool ? "preschool" : null)
  const [activeTab, setActiveTab] = useState<"k12" | "preschool" | null>(defaultTab)

  useEffect(() => {
    if (tabParam === "preschool" && hasPreschool && activeTab !== "preschool") {
      setActiveTab("preschool")
    } else if (tabParam === "k12" && hasK12 && activeTab !== "k12") {
      setActiveTab("k12")
    }
  }, [tabParam, hasPreschool, hasK12])

  const handleTabChange = (newTab: "k12" | "preschool") => {
    setActiveTab(newTab)
    const newParams = new URLSearchParams(searchParams?.toString() || "")
    newParams.set("tab", newTab)
    router.replace(`/admin/phan-cong-khao-sat?${newParams.toString()}`)
  }

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

  const activeYearObj = academicYears.find((y: any) => !y.isOff) || academicYears[0]
  const activeYearName = activeYearObj?.name || "2026-2027"

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto">
      {/* Sky-Line Official Brand Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] rounded-3xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none flex items-center justify-end pr-8">
          <GraduationCap className="w-64 h-64 text-white -mr-10 -mt-10" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 text-teal-200 px-2.5 py-0.5 rounded-full border border-white/20 backdrop-blur-md">
                Sky-Line Education System • Khảo sát đầu vào
              </span>
              <span className="text-xs font-semibold text-teal-100/90">
                Năm học: <strong className="text-white">{activeYearName}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Phân công Khảo sát
            </h1>
            <p className="text-white/80 text-xs font-medium mt-1 max-w-2xl leading-relaxed">
              Điều phối và giao nhiệm vụ phụ trách môn thi, nhóm tuổi và đối tượng khảo sát đầu vào cho giáo viên Phổ thông K-12 & Mầm non chuẩn quy trình chất lượng Sky-Line.
            </p>
          </div>

          {/* Mode Switcher Segmented Control */}
          {hasK12 && hasPreschool && (
            <div className="bg-black/25 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex flex-wrap items-center gap-1.5 self-start lg:self-auto shrink-0 shadow-inner">
              <button
                onClick={() => handleTabChange("k12")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "k12"
                    ? "bg-white text-[#003B3A] shadow-lg shadow-black/20"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <GraduationCap className={`w-4 h-4 ${activeTab === "k12" ? "text-[#00A19A]" : "text-white/70"}`} />
                <span>Phân công K-12</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "k12" ? "bg-[#00A19A]/15 text-[#00736E]" : "bg-white/20 text-white"
                }`}>
                  {k12Periods.length} kỳ
                </span>
              </button>

              <button
                onClick={() => handleTabChange("preschool")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === "preschool"
                    ? "bg-[#00A19A] text-white shadow-lg shadow-[#00A19A]/30"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <Baby className="w-4 h-4 text-white" />
                <span>Phân công Mầm non</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "preschool" ? "bg-white/25 text-white" : "bg-white/20 text-white"
                }`}>
                  {preschoolPeriods.length} kỳ
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

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
