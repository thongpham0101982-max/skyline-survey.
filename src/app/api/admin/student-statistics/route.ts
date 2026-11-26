import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateAcademicCommitmentStatistics } from "@/lib/student-statistics/academicCommitmentEngine"
import { generateExchangeStudentStatistics } from "@/lib/student-statistics/exchangeStudentEngine"
import { generateHomeschoolingStatistics } from "@/lib/student-statistics/homeschoolingEngine"
import { generateOverviewStatistics } from "@/lib/student-statistics/overviewEngine"
import { generatePsychologyCommitmentStatistics } from "@/lib/student-statistics/psychologyCommitmentEngine"
import { resolveStudentStatisticsScope } from "@/lib/student-statistics/scope"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      )
    }

    const sp = new URL(req.url).searchParams
    const tabParam = (sp.get("tab") || "academic").toLowerCase()
    const tab =
      tabParam === "overview"
        ? "overview"
        : tabParam === "psychology"
          ? "psychology"
          : tabParam === "homeschooling"
            ? "homeschooling"
            : tabParam === "exchange"
              ? "exchange"
              : "academic"

    let academicYearId = sp.get("academicYearId") || ""
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      })
      academicYearId = activeYear?.id || ""
    }

    const sessionUser = session.user as { id?: string; role?: string }
    const userId = sessionUser.id || ""
    const userRole = sessionUser.role || ""
    const scope = await resolveStudentStatisticsScope(userId, userRole, academicYearId)

    if (!scope.canViewReport) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản không có quyền xem Báo cáo thống kê học sinh",
        },
        { status: 403 }
      )
    }

    if (tab === "overview") {
      const data = await generateOverviewStatistics(
        {
          academicYearId,
          campusId: sp.get("campusId") || undefined,
          asOfDate: sp.get("asOfDate") || undefined,
        },
        scope
      )

      return NextResponse.json({
        success: true,
        tab: "overview",
        scope: {
          roleDisplayLabel: scope.roleDisplayLabel,
          isCampusRestricted: scope.isCampusRestricted,
          canViewAcademicTab: scope.canViewAcademicTab,
          canViewPsychologyTab: scope.canViewPsychologyTab,
          canViewDetail: scope.canViewDetail,
          canViewPsychologyComments: scope.canViewPsychologyComments,
          canExportPdf: scope.canExportPdf,
          isSummaryOnly: scope.isSummaryOnly,
        },
        data,
      })
    }

    if (tab === "psychology") {
      if (!scope.canViewPsychologyTab) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Tài khoản không có quyền xem tab Tâm lý cam kết đầu vào",
          },
          { status: 403 }
        )
      }

      const data = await generatePsychologyCommitmentStatistics(
        {
          academicYearId,
          month: sp.get("month") || undefined,
          campusId: sp.get("campusId") || undefined,
          classId: sp.get("classId") || undefined,
          teacherId: sp.get("teacherId") || undefined,
          asOfDate: sp.get("asOfDate") || undefined,
        },
        scope
      )

      return NextResponse.json({
        success: true,
        tab: "psychology",
        scope: {
          roleDisplayLabel: scope.roleDisplayLabel,
          isCampusRestricted: scope.isCampusRestricted,
          canViewAcademicTab: scope.canViewAcademicTab,
          canViewPsychologyTab: scope.canViewPsychologyTab,
          canViewDetail: scope.canViewDetail,
          canViewPsychologyComments: scope.canViewPsychologyComments,
          canExportPdf: scope.canExportPdf,
          isSummaryOnly: scope.isSummaryOnly,
        },
        data,
      })
    }

    if (tab === "homeschooling") {
      const rawCommit = (sp.get("commitmentFilter") || "ALL").toUpperCase()
      const commitmentFilter =
        rawCommit === "COMMITTED" || rawCommit === "NON_COMMITTED" ? rawCommit : "ALL"

      const data = await generateHomeschoolingStatistics(
        {
          academicYearId,
          campusId: sp.get("campusId") || undefined,
          level: sp.get("level") || undefined,
          grade: sp.get("grade") || undefined,
          classId: sp.get("classId") || undefined,
          subject: sp.get("subject") || undefined,
          commitmentFilter,
          asOfDate: sp.get("asOfDate") || undefined,
        },
        scope
      )

      return NextResponse.json({
        success: true,
        tab: "homeschooling",
        scope: {
          roleDisplayLabel: scope.roleDisplayLabel,
          isCampusRestricted: scope.isCampusRestricted,
          canViewAcademicTab: scope.canViewAcademicTab,
          canViewPsychologyTab: scope.canViewPsychologyTab,
          canViewDetail: scope.canViewDetail,
          canViewPsychologyComments: scope.canViewPsychologyComments,
          canExportPdf: scope.canExportPdf,
          isSummaryOnly: scope.isSummaryOnly,
        },
        data,
      })
    }

    if (tab === "exchange") {
      const data = await generateExchangeStudentStatistics(
        {
          academicYearId,
          campusId: sp.get("campusId") || undefined,
          level: sp.get("level") || undefined,
          grade: sp.get("grade") || undefined,
          classId: sp.get("classId") || undefined,
          subject: sp.get("subject") || undefined,
          asOfDate: sp.get("asOfDate") || undefined,
        },
        scope
      )

      return NextResponse.json({
        success: true,
        tab: "exchange",
        scope: {
          roleDisplayLabel: scope.roleDisplayLabel,
          isCampusRestricted: scope.isCampusRestricted,
          canViewAcademicTab: scope.canViewAcademicTab,
          canViewPsychologyTab: scope.canViewPsychologyTab,
          canViewDetail: scope.canViewDetail,
          canViewPsychologyComments: scope.canViewPsychologyComments,
          canExportPdf: scope.canExportPdf,
          isSummaryOnly: scope.isSummaryOnly,
        },
        data,
      })
    }

    const data = await generateAcademicCommitmentStatistics(
      {
        academicYearId,
        campusId: sp.get("campusId") || undefined,
        level: sp.get("level") || undefined,
        grade: sp.get("grade") || undefined,
        classId: sp.get("classId") || undefined,
        committedSubject: sp.get("committedSubject") || undefined,
        asOfDate: sp.get("asOfDate") || undefined,
      },
      scope
    )

    return NextResponse.json({
      success: true,
      tab: "academic",
      scope: {
        roleDisplayLabel: scope.roleDisplayLabel,
        isCampusRestricted: scope.isCampusRestricted,
        canViewAcademicTab: scope.canViewAcademicTab,
        canViewPsychologyTab: scope.canViewPsychologyTab,
        canViewDetail: scope.canViewDetail,
        canViewPsychologyComments: scope.canViewPsychologyComments,
        canExportPdf: scope.canExportPdf,
        isSummaryOnly: scope.isSummaryOnly,
      },
      data,
    })
  } catch (error: unknown) {
    console.error("[GET /api/admin/student-statistics] Error:", error)
    const msg =
      error instanceof Error
        ? error.message
        : "Lỗi máy chủ khi tải Báo cáo thống kê học sinh"
    const isForbidden = msg.startsWith("FORBIDDEN_SCOPE:")
    return NextResponse.json(
      { success: false, error: msg.replace("FORBIDDEN_SCOPE: ", "") },
      { status: isForbidden ? 403 : 500 }
    )
  }
}
