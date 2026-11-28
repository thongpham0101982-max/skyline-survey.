import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resolveThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"
import {
  BasicStatsFilterInput,
  generateBasicStatsReport,
} from "@/lib/ktdbcl/thkqBasicStatsEngine"

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

    const url = new URL(req.url)
    const sp = url.searchParams

    let academicYearId = sp.get("academicYearId") || ""
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      })
      academicYearId = activeYear?.id || ""
    }

    if (!academicYearId) {
      return NextResponse.json(
        { success: false, error: "Thiếu tham số Năm học (academicYearId)" },
        { status: 400 }
      )
    }

    const userId = (session.user as any)?.id || ""
    const userRole = (session.user as any)?.role || ""
    const accessScope = await resolveThkqAccessScope(userId, userRole, academicYearId)

    if (!accessScope.canViewReport) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Tài khoản không có quyền xem Báo cáo Thống kê cơ bản",
        },
        { status: 403 }
      )
    }

    const filterInput: BasicStatsFilterInput = {
      academicYearId,
      evaluationPeriod: sp.get("evaluationPeriod") || undefined,
      level: sp.get("level") || undefined,
      subjectId: sp.get("subjectId") || undefined,
      grade: sp.get("grade") || undefined,
      campusId: sp.get("campusId") || undefined,
    }

    const report = await generateBasicStatsReport(filterInput, accessScope)

    const format = sp.get("format")
    if (format === "xlsx") {
      if (!accessScope.canExportExcel) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Tài khoản không có quyền xuất Excel" },
          { status: 403 }
        )
      }

      const exportPairs = report.levelTotalPair
        ? [...report.gradePairs, report.levelTotalPair]
        : report.gradePairs
      const totalCols = 1 + exportPairs.length * 2
      const aoa: any[][] = []

      // Dòng 1: Tiêu đề báo cáo
      aoa.push([`THỐNG KÊ CƠ BẢN KẾT QUẢ KHẢO SÁT MÔN ${report.meta.subjectName.toUpperCase()}`])
      // Dòng 2: Thông tin bộ lọc
      aoa.push([
        `Kỳ khảo sát: ${report.meta.evaluationPeriodLabel} • Bậc học: ${report.meta.levelLabel} • Cơ sở đối chiếu: ${report.meta.campusCode} (${report.meta.campusName}) • Năm học: ${report.meta.academicYearName}`,
      ])
      aoa.push([])

      // Dòng 4: Tiêu đề tầng 1
      const headerTier1: any[] = ["Chỉ số"]
      exportPairs.forEach((gp) => {
        headerTier1.push(gp.gradeLabel, "")
      })
      aoa.push(headerTier1)

      // Dòng 5: Tiêu đề tầng 2
      const headerTier2: any[] = [""]
      exportPairs.forEach((gp) => {
        headerTier2.push(gp.campusColumnLabel, gp.systemColumnLabel)
      })
      aoa.push(headerTier2)

      // 7 Dòng chỉ số
      report.indicatorRows.forEach((indRow) => {
        const rowVals: any[] = [indRow.label]
        exportPairs.forEach((gp) => {
          const cellData = indRow.cellsByGrade[gp.gradeNumber]
          rowVals.push(cellData?.campusDisplay || "—", cellData?.systemDisplay || "—")
        })
        aoa.push(rowVals)
      })

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const merges: XLSX.Range[] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
      ]

      exportPairs.forEach((_, idx) => {
        const startCol = 1 + idx * 2
        merges.push({
          s: { r: 3, c: startCol },
          e: { r: 3, c: startCol + 1 },
        })
      })
      ws["!merges"] = merges
      ws["!cols"] = [
        { wch: 30 },
        ...Array.from({ length: totalCols - 1 }, () => ({ wch: 18 })),
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Thong_ke_co_ban")

      if (report.scoreDistribution) {
        const dist = report.scoreDistribution
        const distAoa: any[][] = []
        distAoa.push([`THỐNG KÊ PHỔ ĐIỂM THEO MÔN ${report.meta.subjectName.toUpperCase()}`])
        distAoa.push([
          `Kỳ khảo sát: ${report.meta.evaluationPeriodLabel} • Bậc học: ${report.meta.levelLabel} • Khối: ${dist.selectedGradeLabel} • Cơ sở: ${dist.campusLabel}`,
        ])
        distAoa.push([])

        if (dist.isAllSystemSelected) {
          distAoa.push(["Nhóm khoảng điểm", "Số học sinh (Toàn hệ thống)", "Tỷ lệ (%) (Toàn hệ thống)"])
          dist.systemDistribution.buckets.forEach((b) => {
            distAoa.push([b.label, b.count, b.rateFixed2Display])
          })
          distAoa.push([
            "Tổng số học sinh có điểm",
            dist.systemDistribution.totalValidCount,
            dist.systemDistribution.totalValidCount > 0 ? "100,00%" : "—",
          ])
          distAoa.push([
            "Dưới 5 điểm (4 nhóm đầu)",
            dist.systemDistribution.below5Count,
            dist.systemDistribution.below5RateDisplay,
          ])
          distAoa.push([
            "Từ 5 điểm trở lên (4 nhóm cuối)",
            dist.systemDistribution.aboveOrEqual5Count,
            dist.systemDistribution.aboveOrEqual5RateDisplay,
          ])
        } else {
          distAoa.push([
            "Nhóm khoảng điểm",
            `Số học sinh (${dist.campusLabel})`,
            `Tỷ lệ (%) (${dist.campusLabel})`,
            "Số học sinh (Toàn hệ thống)",
            "Tỷ lệ (%) (Toàn hệ thống)",
          ])
          dist.systemDistribution.buckets.forEach((sysB, idx) => {
            const cpB = dist.campusDistribution.buckets[idx]
            distAoa.push([
              sysB.label,
              cpB?.count ?? 0,
              cpB?.rateFixed2Display ?? "0,00%",
              sysB.count,
              sysB.rateFixed2Display,
            ])
          })
          distAoa.push([
            "Tổng số học sinh có điểm",
            dist.campusDistribution.totalValidCount,
            dist.campusDistribution.totalValidCount > 0 ? "100,00%" : "—",
            dist.systemDistribution.totalValidCount,
            dist.systemDistribution.totalValidCount > 0 ? "100,00%" : "—",
          ])
          distAoa.push([
            "Dưới 5 điểm (4 nhóm đầu)",
            dist.campusDistribution.below5Count,
            dist.campusDistribution.below5RateDisplay,
            dist.systemDistribution.below5Count,
            dist.systemDistribution.below5RateDisplay,
          ])
          distAoa.push([
            "Từ 5 điểm trở lên (4 nhóm cuối)",
            dist.campusDistribution.aboveOrEqual5Count,
            dist.campusDistribution.aboveOrEqual5RateDisplay,
            dist.systemDistribution.aboveOrEqual5Count,
            dist.systemDistribution.aboveOrEqual5RateDisplay,
          ])
        }

        const wsDist = XLSX.utils.aoa_to_sheet(distAoa)
        wsDist["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 24 }]
        XLSX.utils.book_append_sheet(wb, wsDist, "Pho_diem")

        if (dist.systemBasicStats) {
          const freqAoa: any[][] = []
          freqAoa.push([`BẢNG TẦN SỐ (8 KHOẢNG ĐIỂM) & CHỈ SỐ THỐNG KÊ CƠ BẢN MÔN ${report.meta.subjectName.toUpperCase()}`])
          freqAoa.push([
            `Kỳ khảo sát: ${report.meta.evaluationPeriodLabel} • Bậc học: ${report.meta.levelLabel} • Khối: ${dist.selectedGradeLabel}`,
          ])
          freqAoa.push([])
          freqAoa.push([
            "Khoảng điểm",
            ...dist.systemDistribution.buckets.map((b) => b.label),
            "Tổng cộng",
          ])
          if (!dist.isAllSystemSelected) {
            freqAoa.push([
              `Số lượng (${dist.campusLabel})`,
              ...dist.campusDistribution.buckets.map((b) => b.count),
              dist.campusDistribution.totalValidCount,
            ])
            freqAoa.push([
              `Tỷ lệ % (${dist.campusLabel})`,
              ...dist.campusDistribution.buckets.map((b) => b.rateFixed2Display),
              dist.campusDistribution.totalValidCount > 0 ? "100,00%" : "—",
            ])
          }
          freqAoa.push([
            "Số lượng (Toàn hệ thống)",
            ...dist.systemDistribution.buckets.map((b) => b.count),
            dist.systemDistribution.totalValidCount,
          ])
          freqAoa.push([
            "Tỷ lệ % (Toàn hệ thống)",
            ...dist.systemDistribution.buckets.map((b) => b.rateFixed2Display),
            dist.systemDistribution.totalValidCount > 0 ? "100,00%" : "—",
          ])
          freqAoa.push([])
          freqAoa.push(["c. MỘT SỐ CHỈ SỐ THỐNG KÊ CƠ BẢN", "Giá trị / Số lượng (Hệ thống)", "Tỷ lệ % (Hệ thống)"])
          const sb = dist.systemBasicStats
          freqAoa.push(["Tổng số học sinh có điểm", sb.validCount, ""])
          freqAoa.push(["Điểm trung bình", sb.meanDisplay, ""])
          freqAoa.push(["Trung vị", sb.medianDisplay, ""])
          freqAoa.push(["Độ lệch chuẩn", sb.stdDevDisplay, ""])
          freqAoa.push(["Độ lệch tuyệt đối trung vị (MAD)", sb.madDisplay, ""])
          freqAoa.push(["Số học sinh đạt điểm dưới trung bình (< 5)", sb.below5Count, sb.below5PctOnlyDisplay])
          freqAoa.push(["Số học sinh đạt điểm từ 5 trở lên (≥ 5)", dist.systemDistribution.aboveOrEqual5Count, dist.systemDistribution.aboveOrEqual5RateDisplay])
          freqAoa.push(["Số học sinh đạt điểm lớn hơn hoặc bằng 7 (≥ 7)", sb.aboveOrEqual7Count, sb.aboveOrEqual7PctOnlyDisplay])
          freqAoa.push(["Mốc điểm có nhiều học sinh đạt được nhất", sb.modeDisplay, ""])
          freqAoa.push(["Số lượng học sinh đạt điểm 10", sb.score10Count, ""])
          freqAoa.push(["Số lượng học sinh đạt điểm 0", sb.score0Count, ""])
          freqAoa.push(["Số học sinh đạt điểm ≤ 1", sb.scoreLte1Count, sb.scoreLte1PctOnlyDisplay])

          const wsFreq = XLSX.utils.aoa_to_sheet(freqAoa)
          wsFreq["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
          XLSX.utils.book_append_sheet(wb, wsFreq, "Bang_tan_so")
        }
      }

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
      const fileName = `Thong_ke_co_ban_${report.meta.evaluationPeriod}_${report.meta.campusCode}.xlsx`

      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      accessScope: {
        scopeTier: accessScope.scopeTier,
        scopeLabel: accessScope.scopeLabel,
        canExportExcel: accessScope.canExportExcel,
        isCampusRestricted: accessScope.isCampusRestricted,
        allowedCampusIds: accessScope.allowedCampusIds,
      },
      ...report,
    })
  } catch (error: any) {
    const status =
      error?.statusCode === 403 || String(error?.message || "").startsWith("FORBIDDEN")
        ? 403
        : 500
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Lỗi máy chủ khi tổng hợp báo cáo Thống kê cơ bản",
      },
      { status }
    )
  }
}
