import { Suspense } from "react"
import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isUserAuthorizedForKtdbclWeeklyReports } from "@/lib/qa-workspace/weeklyReportSchema"
import { getKtdbclWorkspaceSnapshot } from "./ktdbcl_actions"
import { WeeklyReportClient } from "./client"

export const metadata = {
  title: "Báo cáo Tuần Ban KT&ĐBCL — SSM Sky-Line",
}
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  const user = session?.user as any
  const userId = String(user?.id || "")
  const userRole = String(user?.role || "")
  const userName = String(user?.name || user?.fullName || "Thành viên Ban KT&ĐBCL")

  // Chốt chặn phạm vi: Chỉ áp dụng riêng cho BP/Tổ chuyên môn Ban KT&ĐBCL (và Quản trị hệ thống)
  const isAllowed = await isUserAuthorizedForKtdbclWeeklyReports(userId, userRole)
  if (!isAllowed) {
    return (
      <div className="min-h-[70vh] bg-[#F8FAFC] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs max-w-lg w-full p-6 space-y-4">
          <div className="border-l-4 border-[#003B3A] pl-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#D97706] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#003B3A]">
                Chức năng dành riêng cho Ban KT&ĐBCL
              </h1>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Phân hệ <strong>Báo cáo Tuần Giáo viên & Nhân sự</strong> này chỉ áp dụng riêng cho{" "}
                <strong>Bộ phận / Tổ chuyên môn Ban KT&ĐBCL</strong>, không áp dụng cho các Tổ chuyên môn khác.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-[#F0FDFA] border border-teal-200 p-3.5 text-xs text-slate-700">
            Đối với công tác kế hoạch, giao việc, báo cáo định kỳ và KPI chung của các phòng ban / tổ chuyên môn khác, vui lòng sử dụng phân hệ <strong>WorkHub</strong>.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-[#E2E8F0] hover:bg-[#F8FAFC]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Không gian Giáo viên
            </Link>
            <Link
              href="/admin/workhub"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#003B3A] text-white hover:bg-[#005250]"
            >
              Mở phân hệ WorkHub
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const tabParam = typeof resolvedParams.tab === "string" ? resolvedParams.tab : undefined
  const weekParam = resolvedParams.week ? Number(resolvedParams.week) : undefined
  const monthParam = resolvedParams.month ? Number(resolvedParams.month) : undefined
  const yearParam = resolvedParams.year ? Number(resolvedParams.year) : undefined

  const [years, initialSnapshot] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isOff: true },
    }),
    getKtdbclWorkspaceSnapshot({
      weekNumber: weekParam,
      month: monthParam,
      year: yearParam,
    }),
  ])

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-600 text-sm font-semibold">
          Đang tải Dashboard Báo cáo Tuần & Quản trị Chất lượng Ban KT&ĐBCL...
        </div>
      }
    >
      <WeeklyReportClient
        currentUserId={userId}
        currentUserName={userName}
        years={years}
        initialSnapshot={initialSnapshot as any}
        initialTab={tabParam}
      />
    </Suspense>
  )
}
