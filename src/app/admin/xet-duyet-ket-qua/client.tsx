"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
  destinationSchools?: any[]
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams?.get("tab")

  const userRole = (currentUser?.role || "").toUpperCase()
  const isAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "KTDBCL"
  const isBghPreschoolRole = ["BGH_MN", "BGH MN", "BGH_MAM_NON", "BGH MẦM NON", "BGH MÂM NON", "BGH", "BGH_CS"].includes(userRole)
  const isGdcsRole = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole)
  
  // Kiểm tra quyền truy cập chi tiết
  const hasK12 = isAdmin || isGdcsRole || rolePermissions.some(p => p.canRead && (
    p.module === "INPUT_ASSESSMENTS_REPORTS" ||
    p.module === "XET_DUYET_K12" ||
    p.module === "XET_DUYET_KET_QUA"
  ))
  const hasPreschool = isAdmin || 
                        isBghPreschoolRole ||
                        isGdcsRole ||
                        rolePermissions.some(p => p.canRead && (
                          p.module === "XET_DUYET_MAM_NON" ||
                          p.module === "XET_DUYET_KET_QUA" ||
                          p.module === "PRESCHOOL_INPUT_ASSESSMENTS"
                        ))

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
    router.replace(`/admin/xet-duyet-ket-qua?${newParams.toString()}`)
  }

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
    <div className="space-y-4 max-w-[1440px] mx-auto">
      {/* AUTHORITATIVE ADMISSIONS LEDGER MASTHEAD */}
      <header className="bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print shadow-[0_1px_2px_rgba(15,23,42,0.03)] relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#003B3A]" />
        <div className="pl-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold">
              Hội đồng Tuyển sinh
            </span>
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
              {activeTab === "k12" ? "Xét duyệt kết quả đầu vào K-12" : "Xét duyệt đầu vào Mầm non"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium hidden lg:block">
            {activeTab === "k12"
              ? "Thẩm định hồ sơ khảo sát năng lực, định hướng đầu vào và phê duyệt trúng tuyển phổ thông"
              : "Đánh giá sự phát triển của trẻ và phê duyệt kết quả tiếp nhận bậc Mầm non"}
          </p>
        </div>

        {/* Level Switcher */}
        {hasK12 && hasPreschool && (
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 shrink-0 border border-slate-200/80">
            <button
              onClick={() => handleTabChange("k12")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === "k12"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Phổ thông K-12</span>
            </button>
            <button
              onClick={() => handleTabChange("preschool")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === "preschool"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>Bậc Mầm non</span>
            </button>
          </div>
        )}
      </header>

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
            rolePermissions={rolePermissions}
            classes={classes}
          />
        )}
      </div>
    </div>
  )
}
