import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { writeSecurityAuditLog } from "@/lib/security-guard"
import { generateAcademicCommitmentStatistics } from "@/lib/student-statistics/academicCommitmentEngine"
import { generateExchangeStudentStatistics } from "@/lib/student-statistics/exchangeStudentEngine"
import { generateHomeschoolingStatistics } from "@/lib/student-statistics/homeschoolingEngine"
import { generateOverviewStatistics } from "@/lib/student-statistics/overviewEngine"
import {
  buildAcademicCommitmentPdfHtml,
  buildAcademicPdfFileName,
  buildExchangePdfFileName,
  buildExchangePdfHtml,
  buildHomeschoolingPdfFileName,
  buildHomeschoolingPdfHtml,
  buildOverviewPdfFileName,
  buildOverviewPdfHtml,
  buildPsychologyCommitmentPdfHtml,
  buildPsychologyPdfFileName,
  renderHtmlToLandscapePdfBuffer,
} from "@/lib/student-statistics/pdfExportService"
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

    const sessionUser = session.user as { id?: string; role?: string; email?: string }
    const userId = sessionUser.id || ""
    const userRole = sessionUser.role || ""
    const userEmail = sessionUser.email || ""
    const scope = await resolveStudentStatisticsScope(userId, userRole, academicYearId)

    if (!scope.canViewReport || !scope.canExportPdf) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản không có quyền xuất PDF Báo cáo thống kê học sinh",
        },
        { status: 403 }
      )
    }

    let htmlContent = ""
    let fileName = ""
    let title = ""

    if (tab === "overview") {
      const payload = await generateOverviewStatistics(
        {
          academicYearId,
          campusId: sp.get("campusId") || undefined,
          asOfDate: sp.get("asOfDate") || undefined,
        },
        scope
      )
      htmlContent = buildOverviewPdfHtml(payload, scope)
      fileName = buildOverviewPdfFileName(payload)
      title = "Bao_cao_Tong_quan_Thong_ke_HS"
    } else if (tab === "psychology") {
      if (!scope.canViewPsychologyTab) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Tài khoản không có quyền xuất PDF Tâm lý cam kết đầu vào",
          },
          { status: 403 }
        )
      }

      const payload = await generatePsychologyCommitmentStatistics(
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
      htmlContent = buildPsychologyCommitmentPdfHtml(payload, scope)
      fileName = buildPsychologyPdfFileName(payload)
      title = "Bao_cao_Tam_ly_cam_ket_dau_vao"
    } else if (tab === "homeschooling") {
      const rawCommit = (sp.get("commitmentFilter") || "ALL").toUpperCase()
      const commitmentFilter =
        rawCommit === "COMMITTED" || rawCommit === "NON_COMMITTED" ? rawCommit : "ALL"

      const payload = await generateHomeschoolingStatistics(
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
      htmlContent = buildHomeschoolingPdfHtml(payload, scope)
      fileName = buildHomeschoolingPdfFileName(payload)
      title = "Bao_cao_HS_Homeschooling"
    } else if (tab === "exchange") {
      const payload = await generateExchangeStudentStatistics(
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
      htmlContent = buildExchangePdfHtml(payload, scope)
      fileName = buildExchangePdfFileName(payload)
      title = "Bao_cao_HS_Hoc_giao_luu"
    } else {
      const payload = await generateAcademicCommitmentStatistics(
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
      htmlContent = buildAcademicCommitmentPdfHtml(payload, scope)
      fileName = buildAcademicPdfFileName(payload)
      title = "Bao_cao_HS_Cam_ket_dau_vao_theo_mon"
    }

    const pdfBuffer = await renderHtmlToLandscapePdfBuffer(htmlContent, title)

    await writeSecurityAuditLog({
      userId,
      userEmail,
      action: "EXPORT_STUDENT_STATISTICS_PDF",
      targetTable: "StudentStatisticsReport",
      targetId: fileName,
      newValues: { tab, academicYearId, campusId: sp.get("campusId") || "ALL" },
    }).catch(() => undefined)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    })
  } catch (error: unknown) {
    console.error("[GET /api/admin/student-statistics/export-pdf] Error:", error)
    const msg =
      error instanceof Error
        ? error.message
        : "Lỗi máy chủ khi xuất PDF Báo cáo thống kê học sinh"
    const isForbidden = msg.startsWith("FORBIDDEN_SCOPE:")
    return NextResponse.json(
      { success: false, error: msg.replace("FORBIDDEN_SCOPE: ", "") },
      { status: isForbidden ? 403 : 500 }
    )
  }
}
