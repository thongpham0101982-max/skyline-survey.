import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resolveThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"
import {
  COMMITMENT_PERIODS,
  CommitmentScoreCell,
  EntranceCommitmentFilterInput,
  generateEntranceCommitmentReport,
} from "@/lib/ktdbcl/entranceCommitmentReportEngine"

export const dynamic = "force-dynamic"

function applyCustomArrowFormatToWorksheet(
  ws: XLSX.WorkSheet,
  cellCoords: Array<{ r: number; c: number; cellData: CommitmentScoreCell; isPrimary: boolean }>
) {
  for (const item of cellCoords) {
    const { r, c, cellData, isPrimary } = item
    if (cellData.score === null || cellData.score === undefined) continue
    const addr = XLSX.utils.encode_cell({ r, c })
    const existing = ws[addr]
    if (!existing) continue

    existing.t = "n"
    existing.v = cellData.score
    const isWhole = Number.isInteger(cellData.score)
    const baseNumFmt =
      cellData.score === 0 || cellData.score === 10
        ? "0"
        : isPrimary && isWhole
          ? "0"
          : isWhole
            ? "0.0"
            : "0.##"

    if (cellData.arrow === "↑") {
      existing.z = `${baseNumFmt}" ↑"`
    } else if (cellData.arrow === "↓") {
      existing.z = `${baseNumFmt}" ↓"`
    } else {
      existing.z = baseNumFmt
    }
  }
}

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
          error:
            "Forbidden: Tài khoản không có quyền xem Báo cáo Học sinh cam kết đầu vào",
        },
        { status: 403 }
      )
    }

    const filterInput: EntranceCommitmentFilterInput = {
      academicYearId,
      campusId: sp.get("campusId") || undefined,
      classId: sp.get("classId") || undefined,
      committedSubject: sp.get("committedSubject") || undefined,
    }

    const report = await generateEntranceCommitmentReport(filterInput, accessScope)

    const canExportExcel = Boolean(
      accessScope.canExportDetail || accessScope.canExportSummary
    )
    const format = sp.get("format")
    if (format === "xlsx") {
      if (!canExportExcel) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Tài khoản không có quyền xuất Excel" },
          { status: 403 }
        )
      }

      const wb = XLSX.utils.book_new()

      // Sheet 1: Báo cáo theo nhóm lớp (giống giao diện màn hình, ô điểm giữ kiểu số kèm định dạng mũi tên SKL)
      const aoa: any[][] = []
      const numericCellCoords: Array<{
        r: number
        c: number
        cellData: CommitmentScoreCell
        isPrimary: boolean
      }> = []

      aoa.push(["BÁO CÁO HỌC SINH CAM KẾT ĐẦU VÀO"])
      aoa.push([
        `Năm học: ${report.filters.academicYearName} • Cơ sở: ${report.filters.campusName} • Lớp: ${report.filters.className} • Môn cam kết: ${report.filters.committedSubject === "ALL" ? "Tất cả môn" : report.filters.committedSubject}`,
      ])
      aoa.push(["Chú thích chuẩn SKL: ↑ Cao hơn chuẩn SKL · ↓ Thấp hơn chuẩn SKL"])
      aoa.push([])

      for (const group of report.classGroups) {
        aoa.push([
          `Cơ sở: ${group.campusName} (${group.campusCode}) — Lớp: ${group.className} (${group.studentCount} học sinh · ${group.rowCount} dòng môn cam kết)`,
        ])
        aoa.push([
          "STT",
          "Họ tên HS",
          "Môn cam kết đầu vào",
          ...COMMITMENT_PERIODS.map((p) => p.label),
        ])

        const isPrimary = group.level === "TIEU_HOC"
        for (const row of group.rows) {
          const rowIndex = aoa.length
          const rowValues: any[] = [
            row.stt,
            row.studentName,
            row.committedSubject,
          ]

          COMMITMENT_PERIODS.forEach((p, idx) => {
            const cell = row.scores[p.code]
            if (cell.score !== null && cell.score !== undefined) {
              rowValues.push(cell.score)
              numericCellCoords.push({
                r: rowIndex,
                c: 3 + idx,
                cellData: cell,
                isPrimary,
              })
            } else {
              rowValues.push("—")
            }
          })

          aoa.push(rowValues)
        }

        aoa.push([])
      }

      if (report.classGroups.length === 0) {
        aoa.push(["Không có học sinh cam kết đầu vào phù hợp bộ lọc."])
      }

      const wsGrouped = XLSX.utils.aoa_to_sheet(aoa)
      wsGrouped["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ]
      applyCustomArrowFormatToWorksheet(wsGrouped, numericCellCoords)
      XLSX.utils.book_append_sheet(wb, wsGrouped, "Bao_cao_theo_lop")

      // Sheet 2: Dữ liệu phẳng (giữ cột số nguyên bản và cột hiển thị chuẩn SKL để dễ lọc/tính toán)
      const flatRows: any[][] = [
        [
          "Cơ sở",
          "Lớp",
          "STT trong lớp",
          "Mã HS",
          "Họ tên HS",
          "Môn cam kết đầu vào",
          "KSĐN (Điểm số)",
          "KSĐN (Hiển thị SKL)",
          "Giữa kỳ 1 (Điểm số)",
          "Giữa kỳ 1 (Hiển thị SKL)",
          "Cuối kỳ 1 (Điểm số)",
          "Cuối kỳ 1 (Hiển thị SKL)",
          "Giữa kỳ 2 (Điểm số)",
          "Giữa kỳ 2 (Hiển thị SKL)",
          "Cuối kỳ 2 (Điểm số)",
          "Cuối kỳ 2 (Hiển thị SKL)",
        ],
      ]

      for (const group of report.classGroups) {
        for (const row of group.rows) {
          flatRows.push([
            `${group.campusName} (${group.campusCode})`,
            group.className,
            row.stt,
            row.studentCode,
            row.studentName,
            row.committedSubject,
            row.scores.KSĐN.score ?? "",
            row.scores.KSĐN.display,
            row.scores.GK1.score ?? "",
            row.scores.GK1.display,
            row.scores.CK1.score ?? "",
            row.scores.CK1.display,
            row.scores.GK2.score ?? "",
            row.scores.GK2.display,
            row.scores.CK2.score ?? "",
            row.scores.CK2.display,
          ])
        }
      }

      const wsFlat = XLSX.utils.aoa_to_sheet(flatRows)
      wsFlat["!cols"] = [
        { wch: 20 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 26 },
        { wch: 20 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(wb, wsFlat, "Du_lieu_loc_tinh_toan")

      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
      const safeYear = (report.filters.academicYearName || "NamHoc").replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      )
      const fileName = `Bao_cao_HS_Cam_ket_dau_vao_${safeYear}.xlsx`

      return new NextResponse(excelBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      accessScope: {
        roleLabel: accessScope.roleDisplayLabel,
        hasFullAccess:
          !accessScope.isCampusRestricted &&
          !accessScope.isClassRestricted &&
          !accessScope.isSubjectRestricted,
        isCampusRestricted: accessScope.isCampusRestricted,
        canExportExcel,
      },
      data: report,
    })
  } catch (error: any) {
    console.error("[GET /api/admin/ktdbcl/entrance-commitment-report] Error:", error)
    const msg = error?.message || "Lỗi máy chủ khi tổng hợp Báo cáo Học sinh cam kết đầu vào"
    const isForbidden = msg.startsWith("FORBIDDEN_SCOPE:")
    return NextResponse.json(
      { success: false, error: msg.replace("FORBIDDEN_SCOPE: ", "") },
      { status: isForbidden ? 403 : 500 }
    )
  }
}
