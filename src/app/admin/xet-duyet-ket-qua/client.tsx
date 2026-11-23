"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { GraduationCap, Baby, AlertCircle, Mail, Settings } from "lucide-react"
import { XetDuyetK12Client } from "./k12-client"
import { XetDuyetMamNonClient } from "./mam-non-client"
import {
  EmailRoutingConfigModal,
  parseSavedEmailRoutingConfig,
  type EmailRoutingConfigData
} from "./EmailRoutingConfigModal"
import {
  isSuperAdminRole,
  isKtdbclEntranceRole,
  isGdcsOrBghEntranceRole,
  isGiaoVuEntranceRole,
  isTuVanEntranceRole,
} from "@/lib/entrance-progress/constants"

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

  const userRole = (currentUser?.role || "").toUpperCase().trim()
  const isAdmin = isSuperAdminRole(userRole) || isKtdbclEntranceRole(userRole)
  const isBghPreschoolRole = ["BGH_MN", "BGH MN", "BGH_MAM_NON", "BGH MẦM NON", "BGH MÂM NON"].includes(userRole)
  const isGdcsRole = isGdcsOrBghEntranceRole(userRole) && !isBghPreschoolRole
  const isGiaoVuRole = isGiaoVuEntranceRole(userRole)
  const isReadOnlyViewer = isGiaoVuRole || isTuVanEntranceRole(userRole)

  // Kiểm tra quyền truy cập chi tiết
  const hasK12 = isAdmin || isGdcsRole || isGiaoVuRole || rolePermissions.some(p => p.canRead && (
    p.module === "INPUT_ASSESSMENTS_REPORTS" ||
    p.module === "XDKQ_K12" ||
    p.module === "XET_DUYET_K12" ||
    p.module === "XET_DUYET_KET_QUA"
  ))
  const hasPreschool = isAdmin || 
                        isBghPreschoolRole ||
                        isGdcsRole ||
                        isGiaoVuRole ||
                        rolePermissions.some(p => p.canRead && (
                          p.module === "XDKQ_MAM_NON" ||
                          p.module === "XET_DUYET_MAM_NON" ||
                          p.module === "XET_DUYET_KET_QUA" ||
                          p.module === "PRESCHOOL_INPUT_ASSESSMENTS"
                        ))

  const isPreschoolParam = tabParam === "preschool" || tabParam === "mam-non"

  const defaultTab = isPreschoolParam && hasPreschool
    ? "preschool"
    : tabParam === "k12" && hasK12
    ? "k12"
    : hasK12 ? "k12" : (hasPreschool ? "preschool" : null)

  const [activeTab, setActiveTab] = useState<"k12" | "preschool" | null>(defaultTab)
  const [isEmailRoutingModalOpen, setIsEmailRoutingModalOpen] = useState(false)
  const [emailRoutingConfig, setEmailRoutingConfig] = useState<EmailRoutingConfigData>(() =>
    parseSavedEmailRoutingConfig(configs)
  )

  useEffect(() => {
    if ((tabParam === "preschool" || tabParam === "mam-non") && hasPreschool && activeTab !== "preschool") {
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
      <header className="bg-white border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold whitespace-nowrap shrink-0">
              Hội đồng Tuyển sinh
            </span>
            <h1 className="text-base sm:text-lg font-bold text-[#003B3A] tracking-tight whitespace-nowrap">
              {activeTab === "k12" ? "Xét duyệt kết quả đầu vào K-12" : "Xét duyệt đầu vào Mầm non"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate">
            {activeTab === "k12"
              ? "Thẩm định hồ sơ khảo sát năng lực, định hướng đầu vào và phê duyệt trúng tuyển phổ thông"
              : "Đánh giá sự phát triển của trẻ và phê duyệt kết quả tiếp nhận bậc Mầm non"}
          </p>
        </div>

        {/* Actions & Level Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {isReadOnlyViewer && (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 whitespace-nowrap"
              title="Tài khoản Giáo vụ / Tư vấn chỉ được tra cứu tiến độ xét duyệt, không có thẩm quyền phê duyệt kết luận"
            >
              Chế độ theo dõi (Chỉ xem)
            </span>
          )}
          {activeTab === "preschool" && !isReadOnlyViewer && (
            <button
              type="button"
              onClick={() => setIsEmailRoutingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#003B3A] bg-[#F0FDFA] border border-[#CCFBF1] hover:bg-[#CCFBF1]/70 transition-colors cursor-pointer whitespace-nowrap"
              title="Thiết lập cấu hình gửi email thông báo xét duyệt đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở & Ban KT&ĐBCL"
            >
              <Settings className="w-3.5 h-3.5 text-[#008B85]" />
              <span>Cấu hình gửi email</span>
            </button>
          )}

          {hasK12 && hasPreschool && (
            <div className="flex p-1 bg-[#F8FAFC] rounded-xl gap-1 shrink-0 border border-[#E2E8F0]">
              <button
                onClick={() => handleTabChange("k12")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === "k12"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                }`}
              >
                <GraduationCap className={`w-3.5 h-3.5 ${activeTab === "k12" ? "text-[#00A19A]" : "text-slate-500"}`} />
                <span>Phổ thông K-12</span>
              </button>
              <button
                onClick={() => handleTabChange("preschool")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === "preschool"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                }`}
              >
                <Baby className={`w-3.5 h-3.5 ${activeTab === "preschool" ? "text-[#00A19A]" : "text-slate-500"}`} />
                <span>Bậc Mầm non</span>
              </button>
            </div>
          )}
        </div>
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

      {/* Modal cấu hình gửi email dùng chung cho cả K-12 & Mầm non */}
      <EmailRoutingConfigModal
        isOpen={isEmailRoutingModalOpen}
        onClose={() => setIsEmailRoutingModalOpen(false)}
        config={emailRoutingConfig}
        onSaved={(newCfg) => setEmailRoutingConfig(newCfg)}
        campuses={campuses}
        teachers={teachers}
        gdcsUsers={gdcsUsers}
        giaoVuCSUsers={giaoVuCSUsers}
      />
    </div>
  )
}
