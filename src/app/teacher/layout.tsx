import { TeacherMobileBottomNav } from "@/components/TeacherMobileBottomNav"
export const dynamic = "force-dynamic"
import { SSMAssistantWidget } from "@/components/SSMAssistantWidget"
import { TeacherExperienceGlobalModal } from "@/components/modals/TeacherExperienceGlobalModal"
import { MobileMenuTrigger } from "@/components/MobileMenuTrigger"
import { Sidebar } from "@/components/Sidebar"
import { auth } from "@/lib/auth"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { prisma } from "@/lib/db"
import { APP_CATEGORIES } from "@/config/modules"
import { redirect } from "next/navigation"

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  let session: any = null;
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth fail in TeacherLayout:", e);
  }

  if (!session) {
    redirect("/login")
  }

  const roleCode = (session?.user as any)?.role || "TEACHER"

  let isGVCN = false
  let isPreschoolTeacher = false
  let readableModules: string[] = []
  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const normRole = (roleCode || "").trim()
      const roleVariants = Array.from(new Set([
        normRole,
        normRole.toUpperCase(),
        normRole.toLowerCase(),
        normRole.replace(/\s+/g, "_"),
        normRole.replace(/_/g, " "),
        normRole.toUpperCase().replace(/\s+/g, "_"),
        normRole.toUpperCase().replace(/_/g, " ")
      ]))

      const permissions = await pAny.permission.findMany({ 
        where: { roleCode: { in: roleVariants } } 
      }).catch(() => [])
      readableModules = permissions.filter((p: any) => p.canRead).map((p: any) => p.module)

      const categories = APP_CATEGORIES
      categories.forEach((cat: any) => {
        cat.modules.forEach((m: any) => {
          if (m.subModules && m.subModules.length > 0) {
            const hasReadableSub = m.subModules.some((sub: any) => readableModules.includes(sub.code))
            if (hasReadableSub && !readableModules.includes(m.code)) {
              readableModules.push(m.code)
            }
          }
        })
      })
    }
  } catch (err) {
    console.error("Teacher layout permission DB error:", err)
  }

  let unconfirmedTeacherData: {
    teacherId: string;
    teacherName: string;
    academicYearName: string;
    academicYearId: string;
    currentObserverType: string | null;
  } | null = null;

  if (session?.user?.id) {
    try {
      const teacher = await prisma.teacher.findUnique({ 
        where: { userId: session.user.id },
        include: { 
          departmentRel: true,
          departmentAssignments: true,
          divisionAssignments: true
        }
      }).catch(() => null)
      if (teacher) {
        const homeroomClassesCount = await prisma.class.count({
          where: {
            OR: [
              { homeroomTeacherId: teacher.id },
              { homeroomTeacherId: { contains: teacher.id } }
            ]
          }
        }).catch(() => 0)
        isGVCN = homeroomClassesCount > 0

        const blockCMClean = (teacher.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const deptNameClean = (teacher.departmentRel?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        isPreschoolTeacher = 
          ['GV_MN', 'BGH_MN', 'MN', 'MAM_NON', 'BGH MAM NON', 'BGH_MAM_NON'].includes((roleCode || '').toUpperCase()) ||
          blockCMClean.includes("mam non") ||
          deptNameClean.includes("mam non");

        // Kiểm tra chức vụ: "Chỉ áp dụng cho tài khoản GV không có chức vụ"
        const NON_CHUC_VU = ["", "gv", "gvbm", "gvcn", "giáo viên", "giao vien", "giáo viên bộ môn", "giáo viên chủ nhiệm", "teacher", "homeroom teacher"];
        const LEADERSHIP_ROLES = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "TTCM", "TPCM", "TO_TRUONG", "TO_PHO", "TBP", "TRUONG_BO_PHAN", "PHO_BO_PHAN", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CO_SO", "BAN_DHCM", "TB_DHCM", "QLCM", "BGH", "BGH_MN", "KT_DBCL", "NHOM_TRUONG", "NHOM_TRUONG_CM"];

        const hasChucVu = 
          LEADERSHIP_ROLES.includes((roleCode || "").toUpperCase().trim()) ||
          (teacher.position && !NON_CHUC_VU.includes(teacher.position.toLowerCase().trim())) ||
          teacher.departmentAssignments?.some((da: any) => da.position && !NON_CHUC_VU.includes(da.position.toLowerCase().trim())) ||
          (teacher.divisionAssignments && teacher.divisionAssignments.length > 0);

        if (!hasChucVu) {
          const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }).catch(() => null);
          if (activeYear) {
            const target = await prisma.teacherAcademicYearTarget.findUnique({
              where: {
                teacherId_academicYearId: {
                  teacherId: teacher.id,
                  academicYearId: activeYear.id
                }
              }
            }).catch(() => null);

            // "GV nào đã xác nhận thì không hiển thị"
            if (!target || !target.confirmed) {
              unconfirmedTeacherData = {
                teacherId: teacher.id,
                teacherName: teacher.teacherName,
                academicYearName: activeYear.name,
                academicYearId: activeYear.id,
                currentObserverType: target?.observerType || null
              };
            }
          }
        }
      }
    } catch (err) {
      console.error("Error querying teacher in layout:", err)
    }
  }

  return (
    <div className="flex min-h-dvh text-xs font-semibold bg-[#F8FAFC]">
      <Sidebar role="TEACHER" permissionModules={readableModules} actualRole={roleCode} isGVCN={isGVCN} isPreschoolTeacher={isPreschoolTeacher} />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-[#F8FAFC]">
        <header className="h-16 border-b border-slate-200/70 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <MobileMenuTrigger />
            <div className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="Sky-Line" 
                className="h-7 w-auto object-contain md:hidden" 
              />
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-medium text-slate-800 tracking-normal flex items-center gap-1.5">
                  <span className="text-[#0284C7] font-medium tracking-wide">SQMS</span>
                  <span className="hidden md:inline text-xs font-normal text-slate-400">• Không gian Giáo viên</span>
                </span>
                <span className="md:hidden text-[10px] text-[#0284C7] font-normal leading-none">SQMS</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <AcademicYearSelector />
             <NotificationBell />
             <UserMenu session={session} />
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-12 flex-1 overflow-x-auto overflow-y-auto text-sm font-normal">
          {children}
        </div>
        
        <TeacherMobileBottomNav />
        <SSMAssistantWidget role="TEACHER" />
        {unconfirmedTeacherData && (
          <TeacherExperienceGlobalModal
            teacherId={unconfirmedTeacherData.teacherId}
            teacherName={unconfirmedTeacherData.teacherName}
            academicYearName={unconfirmedTeacherData.academicYearName}
            academicYearId={unconfirmedTeacherData.academicYearId}
            currentObserverType={unconfirmedTeacherData.currentObserverType}
          />
        )}
      </main>
    </div>
  )
}
