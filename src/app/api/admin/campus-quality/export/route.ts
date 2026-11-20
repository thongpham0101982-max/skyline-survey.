import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { auth } from "@/lib/auth"
import { resolveDashboardContext } from "@/lib/campus-quality/baseContext"
import { getAcademicQualityTab } from "@/lib/campus-quality/engineAcademic"
import { getCampusQualityDrilldown } from "@/lib/campus-quality/engineDrilldown"
import {
  getAchievementsCertsTab,
  getAdmissionsMobilityTab,
  getObservationTab,
  getStudentSupportTab,
} from "@/lib/campus-quality/engineOperations"
import { getCampusQualityOverview } from "@/lib/campus-quality/engineOverview"
import { resolveCampusQualityScope } from "@/lib/campus-quality/scope"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const sp = new URL(req.url).searchParams
    const view = sp.get("view") || "overview"
    const drilldownKey = sp.get("drilldownKey") || ""

    const userId = (session.user as any)?.id || ""
    const userRole = (session.user as any)?.role || ""
    const scope = await resolveCampusQualityScope(
      userId,
      userRole,
      sp.get("academicYearId") || undefined
    )

    if (!scope.canViewReport || !scope.canExportExcel) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Tài khoản không có quyền xuất Excel" },
        { status: 403 }
      )
    }

    if (
      (drilldownKey.startsWith("PSYCHOLOGY_") || view === "psychology") &&
      !scope.canViewPsychology
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Không có quyền xuất dữ liệu phân hệ Tâm lý" },
        { status: 403 }
      )
    }

    const { context, forbiddenCampus } = await resolveDashboardContext(
      {
        academicYearId: sp.get("academicYearId") || undefined,
        campusId: sp.get("campusId") || undefined,
        level: sp.get("level") || "ALL",
        grade: sp.get("grade") || "ALL",
        classId: sp.get("classId") || "ALL",
        evaluationPeriod: sp.get("evaluationPeriod") || "GK1",
        month: sp.get("month") || undefined,
        subjectId: sp.get("subjectId") || "ALL",
        publishedOnly: sp.get("publishedOnly") === "true",
        matchedCohortOnly: sp.get("matchedCohortOnly") === "true",
        supportFilterMode: (sp.get("supportFilterMode") as any) || "BELOW_SKL",
        psychologyGroupBy: (sp.get("psychologyGroupBy") as any) || "CLASS",
      },
      scope
    )

    if (forbiddenCampus) {
      return NextResponse.json({ success: false, error: "Forbidden campus scope" }, { status: 403 })
    }

    const wb = XLSX.utils.book_new()
    let filename = `QLCL_CoSo_${context.academicYearName}_${view}.xlsx`

    if (view === "drilldown" && drilldownKey) {
      const dd = await getCampusQualityDrilldown(context, scope, drilldownKey, {
        classId: sp.get("extraClassId") || undefined,
        subjectId: sp.get("extraSubjectId") || undefined,
      })
      const rows = dd.records.map((r, i) => ({
        STT: i + 1,
        "Mã hồ sơ": r.code,
        [dd.columns.nameLabel]: r.name,
        [dd.columns.subLabel]: r.subLabel,
        [dd.columns.metricLabel]: r.metricValue,
        [dd.columns.statusLabel]: r.statusLabel,
        [dd.columns.ownerLabel]: r.ownerName,
        [dd.columns.milestoneLabel]: r.nextMilestone,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Chi_Tiet_Ho_So")
      filename = `QLCL_ChiTiet_${drilldownKey}_${context.snapshotVersion}.xlsx`
    } else if (view === "academic") {
      const data = await getAcademicQualityTab(context, scope)
      const sgRows = data.subjectGradeRows.map((r, i) => ({
        STT: i + 1,
        "Khối": r.grade,
        "Môn học": r.subjectName,
        "HS có điểm": r.validCount,
        "HS dự kiến": r.expectedCount,
        "Vắng / Thi bù": r.absentCount,
        "Miễn": r.exemptCount,
        "ĐTB": r.average ?? "",
        "Trung vị": r.median ?? "",
        "Điểm phổ biến (Mode)": r.mode ?? "",
        "Tỷ lệ >= 7 (%)": r.rateGte7 ?? "",
        "Số điểm 10": r.count10,
        "Độ lệch chuẩn": r.stdDev ?? "",
        "Dưới 5,0 (SL)": r.below5Count,
        "Dưới 5,0 (%)": r.below5Rate ?? "",
        "Ngưỡng chuẩn SKL": r.benchmarkStatus === "CONFIGURED" ? r.benchmarkScore : "Chưa cấu hình ngưỡng",
        "Đạt chuẩn SKL (%)": r.meetBenchmarkRate ?? "",
        "Toàn hệ thống (%)": r.systemMeetBenchmarkRate ?? "",
        "Chênh lệch (đpt)": r.diffPp ?? "",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sgRows), "Chat_Luong_Mon_Khoi")

      const tRows = data.teacherRows.map((r, i) => ({
        STT: i + 1,
        "Giáo viên": r.teacherName,
        "Môn học": r.subjectName,
        "Lớp": r.className,
        "Có điểm / Dự kiến": `${r.validCount}/${r.expectedCount}`,
        "ĐTB": r.average ?? "",
        "Đạt chuẩn SKL (%)": r.meetBenchmarkRate ?? "Chưa cấu hình ngưỡng",
        "Dưới 5,0": r.below5Count,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tRows), "Theo_Giao_Vien")
    } else if (view === "admissions") {
      const data = await getAdmissionsMobilityTab(context, scope)
      const bRows = data.batchGradeRows.map((r, i) => ({
        STT: i + 1,
        "Đợt tuyển sinh": r.batchName,
        "Khối bậc": r.blockType,
        "Khối dự kiến": r.targetGrade,
        "Đã khảo sát": r.surveyedCount,
        "Đạt (đã duyệt)": r.passedCount,
        "Đạt cam kết": r.committedCount,
        "Đã nhập học": r.enrolledCount,
        "Chờ xét duyệt": r.pendingCount,
        "Tỷ lệ đạt (%)": r.passRate ?? "",
        "Tỷ lệ nhập học (%)": r.enrollmentRate ?? "",
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bRows), "Tuyen_Sinh_Dau_Vao")

      const mRows = data.mobilityRows.map((r, i) => ({
        STT: i + 1,
        "Mã HS": r.studentCode,
        "Họ tên": r.studentName,
        "Lớp": r.className,
        "Cơ sở": r.campusName,
        "Loại biến động": r.movementLabel,
        "Ngày hiệu lực": r.effectiveDate,
        "Trường / Cơ sở liên quan": r.counterpartySchoolOrCampus,
        "Lý do": r.reason,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mRows), "Bien_Dong_Hoc_Sinh")
    } else if (view === "achievements") {
      const data = await getAchievementsCertsTab(context, scope)
      const rows = data.exams.map((ex, i) => ({
        STT: i + 1,
        "Kỳ thi": ex.examName,
        "Phân loại": ex.categoryLabel,
        "Đăng ký": ex.registeredCount,
        "Dự thi": ex.satCount,
        "Có kết quả": ex.hasResultCount,
        "Đạt giải / Đạt mục tiêu": ex.awardedCount,
        "Chứng chỉ đã cấp": ex.certificatesIssuedCount,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Thanh_Tich_Chung_Chi")
    } else if (view === "observation") {
      const data = await getObservationTab(context, scope)
      const rows = data.departments.flatMap((d) =>
        d.teachers.map((t) => ({
          "Tổ chuyên môn": d.departmentName,
          "Mã GV": t.teacherCode,
          "Họ tên GV": t.teacherName,
          "Tiết đã dự giờ": t.observedLessons,
          "Kế hoạch": t.plannedLessons,
          "Trạng thái dự giờ": t.status === "OBSERVED" ? "Đã dự giờ" : "Chưa được dự giờ",
          "Dạy học theo quy định":
            t.compliantStatus === "COMPLIANT"
              ? "Đáp ứng"
              : t.compliantStatus === "NON_COMPLIANT"
                ? "Chưa đáp ứng"
                : "Chưa có phiếu duyệt",
          "Xếp loại gần nhất": t.latestRating,
          "Phiếu chờ duyệt": t.pendingForms,
        }))
      )
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Du_Gio_Chuyen_Mon")
    } else if (view === "support") {
      const data = await getStudentSupportTab(context, scope)
      const supRows = data.academicSupport.items.map((item, i) => ({
        STT: i + 1,
        "Mã HS": item.studentCode,
        "Họ tên": item.studentName,
        "Lớp": item.className,
        "Môn học": item.subjectName,
        "Điểm": item.score ?? "",
        "Ngưỡng áp dụng": item.benchmarkLabel,
        "Lý do lọc": item.triggerReason,
        "GV phụ trách": item.teacherName,
        "Mốc rà soát": item.nextReviewDate,
        "Kết quả gần nhất": item.latestResult,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supRows), "Ho_Tro_Hoc_Tap")

      const comRows = data.entranceCommitment.rows.map((r) => ({
        STT: r.stt,
        "Họ tên": r.studentName,
        "Lớp": r.className,
        "Môn cam kết": r.committedSubject,
        "KSĐN": r.ksdn.display,
        "GK1": r.gk1.display,
        "CK1": r.ck1.display,
        "GK2": r.gk2.display,
        "CK2": r.ck2.display,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comRows), "Cam_Ket_Dau_Vao")

      if (scope.canViewPsychology) {
        const psyRows = data.psychologyTracking.items.map((p, i) => ({
          STT: i + 1,
          "Mã HS": p.studentCode,
          "Họ tên": p.studentName,
          "Lớp": p.className,
          "Phụ trách chính": p.primaryOwnerName,
          "GVCN phối hợp": p.homeroomTeacherName,
          "Trạng thái": p.statusLabel,
          "Ngày rà soát": p.reviewDate,
          "Kết quả gần nhất": p.latestOutcomeLabel,
        }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(psyRows), "Theo_Doi_Tam_Ly")
      }
    } else {
      const ov = await getCampusQualityOverview(context, scope)
      const summaryRows = [
        { "Khu vực": "Quy mô học sinh", "Chỉ tiêu": "Sĩ số hiện tại", "Giá trị": ov.scaleAndMobility.activeStudents, "Mốc dữ liệu": ov.timeContext.academicYearLabel },
        { "Khu vực": "Quy mô học sinh", "Chỉ tiêu": "Số lớp", "Giá trị": ov.scaleAndMobility.totalClasses, "Mốc dữ liệu": ov.timeContext.academicYearLabel },
        { "Khu vực": "Quy mô học sinh", "Chỉ tiêu": "Nhập học mới", "Giá trị": ov.scaleAndMobility.newEnrollments, "Mốc dữ liệu": ov.timeContext.academicYearLabel },
        { "Khu vực": "Quy mô học sinh", "Chỉ tiêu": "Chuyển đến (Tổng / Nội bộ / Ngoài)", "Giá trị": `${ov.scaleAndMobility.transferredIn} (${ov.scaleAndMobility.transferredInInternal} / ${ov.scaleAndMobility.transferredInExternal})`, "Mốc dữ liệu": ov.timeContext.academicYearLabel },
        { "Khu vực": "Quy mô học sinh", "Chỉ tiêu": "Chuyển đi (Tổng / Nội bộ / Ngoài)", "Giá trị": `${ov.scaleAndMobility.transferredOut} (${ov.scaleAndMobility.transferredOutInternal} / ${ov.scaleAndMobility.transferredOutExternal})`, "Mốc dữ liệu": ov.timeContext.academicYearLabel },
        { "Khu vực": "Chất lượng học tập", "Chỉ tiêu": "Tỷ lệ đạt chuẩn Sky-Line (%)", "Giá trị": ov.academicQuality.skylinePassRate ?? "Chưa cấu hình ngưỡng", "Mốc dữ liệu": ov.academicQuality.periodLabel },
        { "Khu vực": "Chất lượng học tập", "Chỉ tiêu": "Số HS dưới chuẩn (đếm 1 lần)", "Giá trị": ov.academicQuality.belowBenchmarkStudents, "Mốc dữ liệu": ov.academicQuality.periodLabel },
        { "Khu vực": "Chất lượng học tập", "Chỉ tiêu": "Số HS dưới trung bình (<5,0)", "Giá trị": ov.academicQuality.belowAverageStudents, "Mốc dữ liệu": ov.academicQuality.periodLabel },
        { "Khu vực": "Tuyển sinh & đầu vào", "Chỉ tiêu": "Khảo sát / Đạt / Nhập học", "Giá trị": `${ov.admissionsAndEntrance.surveyedCount} / ${ov.admissionsAndEntrance.passedCount} / ${ov.admissionsAndEntrance.enrolledCount}`, "Mốc dữ liệu": ov.admissionsAndEntrance.scopeLabel },
        { "Khu vực": "Thành tích & chứng chỉ", "Chỉ tiêu": "HS dự thi / HS đạt giải / Chứng chỉ", "Giá trị": `${ov.achievementsAndCerts.examParticipants} / ${ov.achievementsAndCerts.awardedStudents} / ${ov.achievementsAndCerts.certificatesIssued}`, "Mốc dữ liệu": ov.achievementsAndCerts.scopeLabel },
        { "Khu vực": "Dự giờ & PTCM", "Chỉ tiêu": "Tiết dự giờ / Kế hoạch", "Giá trị": `${ov.observationAndGrowth.observedLessons}/${ov.observationAndGrowth.plannedLessons}`, "Mốc dữ liệu": ov.observationAndGrowth.monthLabel },
        { "Khu vực": "Dự giờ & PTCM", "Chỉ tiêu": "GV dạy học theo quy định", "Giá trị": `${ov.observationAndGrowth.compliantTeachers}/${ov.observationAndGrowth.evaluatedTeachers}`, "Mốc dữ liệu": ov.observationAndGrowth.monthLabel },
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Tong_Quan_QLCL")

      const mRows = ov.scaleAndMobility.monthlySeries.map((m) => ({
        "Tháng": m.monthLabel,
        "Nhập học mới": m.newEnrollments,
        "Chuyển đến": m.totalIn,
        "Chuyển đi": m.totalOut,
        "Biến động ròng": m.netChange,
        "Lũy kế nhập mới": m.cumulativeNew,
        "Lũy kế chuyển đến": m.cumulativeIn,
        "Lũy kế chuyển đi": m.cumulativeOut,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mRows), "Bien_Dong_Theo_Thang")
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    })
  } catch (err: any) {
    console.error("[GET /api/admin/campus-quality/export]", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xuất Excel" },
      { status: 500 }
    )
  }
}
