/* eslint-disable */
﻿import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { isExactWalkthroughForm } from "@/app/teacher/du-gio-gvnn/utils"

export const dynamic = "force-dynamic"

function formatVNDate(d?: Date | string | null) {
  if (!d) return ""
  try {
    const dateObj = new Date(d)
    if (isNaN(dateObj.getTime())) return String(d)
    return dateObj.toLocaleDateString("vi-VN")
  } catch {
    return String(d)
  }
}

function getSlotCategory(slot: any): "PHO_THONG" | "MAM_NON" | "GVNN" {
  if (
    slot.requestOrigin === "FOREIGN_WALKTHROUGH" ||
    isExactWalkthroughForm(slot) ||
    (slot.subjectName || "").includes("ESL") ||
    (slot.subjectName || "").toLowerCase().includes("tiếng anh (esl)") ||
    (slot.topic || "").toLowerCase().includes("foreign") ||
    (slot.description || "").toLowerCase().includes("dự giờ gvnn")
  ) {
    return "GVNN"
  }

  if (
    slot.level === "Mầm non" ||
    (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non")
  ) {
    return "MAM_NON"
  }

  return "PHO_THONG"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get("teacherId")
  const academicYearId = searchParams.get("academicYearId") || undefined
  const month = searchParams.get("month") || "all"
  const categoryFilter = searchParams.get("category") || "all"

  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacherId parameter" }, { status: 400 })
  }

  try {
    const session = await auth().catch(() => null)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch Teacher Info
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        campus: true,
        departmentRel: true,
        departmentAssignments: {
          include: { department: true }
        }
      }
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
    }

    // 2. Fetch Academic Year
    let activeYear: any = null
    if (academicYearId) {
      activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    } else {
      activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }) ||
                   await prisma.academicYear.findFirst({ orderBy: { startDate: "desc" } })
    }

    // Fetch Teacher Target for this academic year
    let target = null
    if (activeYear) {
      target = await prisma.teacherAcademicYearTarget.findUnique({
        where: {
          teacherId_academicYearId: {
            teacherId: teacher.id,
            academicYearId: activeYear.id
          }
        }
      })
    }

    // 3. Query all Slots where teacher is host OR observer
    const whereConditions: any = {
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN", "EXPIRED"] },
      OR: [
        { teacherId: teacher.id },
        { registrations: { some: { teacherId: teacher.id } } }
      ]
    }

    if (activeYear) {
      whereConditions.AND = [
        {
          OR: [
            { academicYearId: activeYear.id },
            {
              AND: [
                { academicYearId: null },
                {
                  date: {
                    gte: activeYear.startDate,
                    lte: activeYear.endDate
                  }
                }
              ]
            }
          ]
        }
      ]
    }

    const slots = await prisma.observationSlot.findMany({
      where: whereConditions,
      include: {
        teacher: {
          include: {
            campus: true,
            departmentRel: true
          }
        },
        registrations: {
          include: {
            teacher: {
              include: {
                campus: true,
                departmentRel: true
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: { date: "asc" }
    })

    // Filter by month if specified
    const filteredSlots = slots.filter(slot => {
      if (month !== "all") {
        if (!slot.date) return false
        const d = new Date(slot.date)
        if (isNaN(d.getTime())) return false
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        if (`${yyyy}-${mm}` !== month) return false
      }
      return true
    })

    // Process valid taught & observed slots
    const homeCampusName = teacher.campus?.campusName || "Cơ sở Sky-Line"

    let taughtPhoThong = 0
    let taughtMamNon = 0
    let taughtGVNN = 0
    let taughtSurprise = 0

    let observedPhoThong = 0
    let observedMamNon = 0
    let observedGVNN = 0
    let observedSurprise = 0

    let internalObserved = 0
    let crossObserved = 0
    const campusDistribution: Record<string, number> = {}

    interface LedgerItem {
      id: string
      date: string
      category: "PHO_THONG" | "MAM_NON" | "GVNN"
      categoryLabel: string
      role: "DẠY" | "DỰ"
      periodCount: number
      isSurprise: boolean
      subject: string
      className: string
      topic: string
      hostName: string
      observerNames: string
      campus: string
      scoreText: string
      ratingText: string
      isValid: boolean
      feedbackSummary: string
    }

    const ledgerList: LedgerItem[] = []
    const evaluationHistories: any[] = []

    filteredSlots.forEach(slot => {
      const cat = getSlotCategory(slot)
      const catLabel = cat === "PHO_THONG" ? "Phổ thông" : cat === "MAM_NON" ? "Mầm non" : "GV Nước ngoài"
      const increment = slot.isDoublePeriod ? 2 : 1
      const isSurprise = slot.requestOrigin === "PRESCHOOL_SURPRISE" || (slot.description || "").toLowerCase().includes("đột xuất")
      const slotCampus = slot.campusName || slot.teacher?.campus?.campusName || homeCampusName

      // Check if teacher is HOST
      if (slot.teacherId === teacher.id) {
        const approvedRegs = slot.registrations.filter((r: any) => r.isApproved || isSurprise)
        const completedEvaluations = approvedRegs.filter((r: any) => r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT")
        const isValid = completedEvaluations.length > 0

        if (isValid) {
          if (cat === "PHO_THONG") taughtPhoThong += increment
          else if (cat === "MAM_NON") taughtMamNon += increment
          else taughtGVNN += increment

          if (isSurprise) taughtSurprise += increment
        }

        const observerNames = approvedRegs.map((r: any) => r.teacher.teacherName).join(", ") || "Chưa có người dự"
        const ratings = completedEvaluations.map((r: any) => r.evaluation.overallRating || "Đạt").join(", ")
        const avgScore = completedEvaluations.length > 0
          ? (completedEvaluations.reduce((sum: number, r: any) => sum + (r.evaluation.totalScore || 0), 0) / completedEvaluations.length).toFixed(1)
          : "-"

        completedEvaluations.forEach((r: any) => {
          evaluationHistories.push({
            date: formatVNDate(slot.date),
            topic: slot.topic,
            subject: slot.subjectName,
            className: slot.className || `${slot.grade || ""}`,
            evaluatorName: r.teacher?.teacherName || "Người dự",
            evaluatorPosition: r.teacher?.position || "TTCM / GV",
            totalScore: r.evaluation.totalScore,
            overallRating: r.evaluation.overallRating || "Đạt",
            strengths: r.evaluation.strengths || "",
            improvements: r.evaluation.improvements || "",
            generalComment: r.evaluation.generalComment || "",
            teacherFeedback: r.evaluation.teacherFeedback || "",
            catLabel
          })
        })

        if (categoryFilter === "all" ||
            (categoryFilter === "k12" && cat === "PHO_THONG") ||
            (categoryFilter === "preschool" && cat === "MAM_NON") ||
            (categoryFilter === "foreign" && cat === "GVNN")) {
          ledgerList.push({
            id: slot.id,
            date: formatVNDate(slot.date),
            category: cat,
            categoryLabel: catLabel,
            role: "DẠY",
            periodCount: increment,
            isSurprise,
            subject: slot.subjectName,
            className: slot.className || `${slot.grade || ""}`,
            topic: slot.topic,
            hostName: teacher.teacherName,
            observerNames,
            campus: slotCampus,
            scoreText: avgScore !== "-" ? `${avgScore}đ` : "-",
            ratingText: ratings || "Chưa xếp loại",
            isValid,
            feedbackSummary: completedEvaluations[0]?.evaluation?.generalComment || ""
          })
        }
      }

      // Check if teacher is OBSERVER
      const myReg = slot.registrations.find((r: any) => r.teacherId === teacher.id)
      if (myReg) {
        const hasEval = myReg.evaluation && myReg.evaluation.reEvaluationStatus !== "DRAFT"
        const isValid = myReg.isApproved && hasEval

        if (isValid) {
          if (cat === "PHO_THONG") observedPhoThong += increment
          else if (cat === "MAM_NON") observedMamNon += increment
          else observedGVNN += increment

          if (isSurprise) observedSurprise += increment

          if (slotCampus === homeCampusName) {
            internalObserved += increment
          } else {
            crossObserved += increment
          }
          campusDistribution[slotCampus] = (campusDistribution[slotCampus] || 0) + increment
        }

        if (categoryFilter === "all" ||
            (categoryFilter === "k12" && cat === "PHO_THONG") ||
            (categoryFilter === "preschool" && cat === "MAM_NON") ||
            (categoryFilter === "foreign" && cat === "GVNN")) {
          ledgerList.push({
            id: slot.id,
            date: formatVNDate(slot.date),
            category: cat,
            categoryLabel: catLabel,
            role: "DỰ",
            periodCount: increment,
            isSurprise,
            subject: slot.subjectName,
            className: slot.className || `${slot.grade || ""}`,
            topic: slot.topic,
            hostName: slot.teacher.teacherName,
            observerNames: teacher.teacherName,
            campus: slotCampus,
            scoreText: myReg.evaluation?.totalScore ? `${myReg.evaluation.totalScore}đ` : "-",
            ratingText: myReg.evaluation?.overallRating || "Đã dự",
            isValid: !!isValid,
            feedbackSummary: myReg.evaluation?.generalComment || ""
          })
        }
      }
    })

    const totalTaughtValid = taughtPhoThong + taughtMamNon + taughtGVNN
    const totalObservedValid = observedPhoThong + observedMamNon + observedGVNN

    const reqTaught = target?.requiredTaught || 0
    const reqObserved = target?.requiredObserved || 0
    const isTaughtMet = reqTaught > 0 ? totalTaughtValid >= reqTaught : true
    const isObservedMet = reqObserved > 0 ? totalObservedValid >= reqObserved : true

    const periodText = month === "all" ? `Năm học ${activeYear?.name || "2024 - 2025"}` : `Tháng ${month.split("-")[1]}/${month.split("-")[0]}`

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Bảng Kê Chi Tiết Dự Giờ & Phát Triển Chuyên Môn - ${teacher.teacherName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #1e293b;
      background: #f8fafc;
      padding: 20px;
    }
    .print-page {
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 16mm 18mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .print-page { box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 14mm; }
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #003B3A; padding-bottom: 10px; }
    .header-table td { vertical-align: middle; }
    .system-title { font-size: 11pt; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; }
    .sub-system-title { font-size: 8.5pt; color: #64748b; font-weight: 600; }
    .doc-badge { text-align: right; font-size: 8.5pt; color: #475569; }
    .main-title { text-align: center; margin: 14px 0 6px 0; font-size: 15pt; font-weight: 900; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; }
    .main-subtitle { text-align: center; font-size: 9.5pt; color: #64748b; margin-bottom: 18px; }
    .info-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
    .info-item { font-size: 9pt; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-weight: 700; }
    .section-title { font-size: 10.5pt; font-weight: 800; color: #003B3A; text-transform: uppercase; margin: 16px 0 8px 0; display: flex; align-items: center; gap: 6px; border-left: 4px solid #48BFE3; padding-left: 8px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
    .kpi-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #fff; text-align: center; }
    .kpi-label { font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-num { font-size: 16pt; font-weight: 900; color: #003B3A; margin: 2px 0; }
    .kpi-desc { font-size: 7.5pt; color: #64748b; }
    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 8.5pt; }
    table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
    table.data-table th { background: #003B3A; color: #ffffff; font-weight: 700; text-align: center; font-size: 8pt; text-transform: uppercase; }
    table.data-table tr:nth-child(even) { background: #f8fafc; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 700; }
    .badge-valid { background: #dcfce7; color: #166534; }
    .badge-wait { background: #fef3c7; color: #92400e; }
    .badge-pt { background: #e0f2fe; color: #0369a1; }
    .badge-mn { background: #fce7f3; color: #be185d; }
    .badge-esl { background: #ede9fe; color: #6d28d9; }
    .feedback-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; background: #fff; }
    .feedback-title { font-size: 9pt; font-weight: 800; color: #003B3A; margin-bottom: 4px; }
    .feedback-body { font-size: 8.5pt; color: #334155; line-height: 1.4; }
    .sign-table { width: 100%; margin-top: 24px; border-collapse: collapse; page-break-inside: avoid; }
    .sign-table td { text-align: center; vertical-align: top; width: 33.33%; }
    .sign-role { font-size: 9pt; font-weight: 800; color: #003B3A; text-transform: uppercase; }
    .sign-note { font-size: 8pt; color: #64748b; font-style: italic; margin-bottom: 55px; }
    .sign-name { font-size: 9.5pt; font-weight: 800; color: #0f172a; }
    .action-bar { max-width: 210mm; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center; }
    .btn-print { background: #003B3A; color: #fff; padding: 8px 18px; font-size: 9pt; font-weight: 700; border: none; border-radius: 6px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div>
      <span style="font-weight: 700; color: #003B3A;">Bản in Bảng kê chi tiết chuyên môn</span>
      <span style="color: #64748b; font-size: 8.5pt; margin-left: 8px;">(Sử dụng hộp thoại in để lưu file PDF)</span>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ In / Tải PDF</button>
  </div>
  <div class="print-page">
    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <div class="system-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
          <div class="sub-system-title">BAN ĐÀO TẠO & PHÁT TRIỂN CHUYÊN MÔN • QUẢN TRỊ CHẤT LƯỢNG</div>
        </td>
        <td class="doc-badge">
          <div>Mã biểu mẫu: <strong>BM-SSM-TTCM-01</strong></div>
          <div>Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}</div>
        </td>
      </tr>
    </table>
    <div class="main-title">BẢNG KÊ CHI TIẾT DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN</div>
    <div class="main-subtitle">Kỳ báo cáo: <strong>${periodText}</strong> • Đối chiếu thực tế và kết quả đánh giá chuyên môn</div>
    <div class="info-card-grid">
      <div class="info-item"><span class="info-label">Họ và tên GV/TTCM:</span> <span class="info-val">${teacher.teacherName}</span></div>
      <div class="info-item"><span class="info-label">Mã nhân sự:</span> <span class="info-val">${teacher.teacherCode}</span></div>
      <div class="info-item"><span class="info-label">Chức vụ / Vị trí:</span> <span class="info-val">${teacher.position || "Giáo viên"}</span></div>
      <div class="info-item"><span class="info-label">Tổ chuyên môn:</span> <span class="info-val">${teacher.departmentRel?.name || "Tổ chuyên môn"}</span></div>
      <div class="info-item"><span class="info-label">Cơ sở công tác:</span> <span class="info-val">${homeCampusName}</span></div>
      <div class="info-item"><span class="info-label">Tài khoản Email:</span> <span class="info-val">${teacher.email || "Chưa cập nhật"}</span></div>
    </div>
    <div class="section-title">1. TỔNG HỢP SỐ TIẾT HỢP LỆ THEO 3 DANH MỤC CHUYÊN MÔN</div>
    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Tổng Tiết Dạy Hợp Lệ</div>
        <div class="kpi-num">${totalTaughtValid}</div>
        <div class="kpi-desc">Chỉ tiêu: ${reqTaught > 0 ? `${reqTaught} tiết` : "Chưa giao"} • ${isTaughtMet ? "Đạt KPI" : "Chưa đạt"}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Tổng Tiết Dự Hợp Lệ</div>
        <div class="kpi-num">${totalObservedValid}</div>
        <div class="kpi-desc">Chỉ tiêu: ${reqObserved > 0 ? `${reqObserved} tiết` : "Chưa giao"} • ${isObservedMet ? "Đạt KPI" : "Chưa đạt"}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Tiết Đột Xuất (ĐX)</div>
        <div class="kpi-num">${taughtSurprise + observedSurprise}</div>
        <div class="kpi-desc">Dạy ĐX: ${taughtSurprise} • Dự ĐX: ${observedSurprise}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Tỷ Lệ Hoàn Thành KPI</div>
        <div class="kpi-num">${reqObserved > 0 ? Math.round((totalObservedValid / reqObserved) * 100) : 100}%</div>
        <div class="kpi-desc">Đánh giá chung: ${isObservedMet && isTaughtMet ? "HOÀN THÀNH TỐT" : "CẦN BỔ SUNG"}</div>
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Danh mục Dự giờ & Phát triển CM</th>
          <th>Số tiết dạy hợp lệ</th>
          <th>Số tiết dự hợp lệ</th>
          <th>Tổng số tiết thực hiện</th>
          <th>Ghi chú chuyên môn</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold">1. Khối Phổ thông (Tiểu học, THCS, THPT)</td>
          <td class="text-center font-bold">${taughtPhoThong}</td>
          <td class="text-center font-bold">${observedPhoThong}</td>
          <td class="text-center font-bold" style="color: #003B3A;">${taughtPhoThong + observedPhoThong}</td>
          <td>Đánh giá chuẩn 11 tiêu chí K-12</td>
        </tr>
        <tr>
          <td class="font-bold">2. Khối Mầm non (Preschool)</td>
          <td class="text-center font-bold">${taughtMamNon}</td>
          <td class="text-center font-bold">${observedMamNon}</td>
          <td class="text-center font-bold" style="color: #003B3A;">${taughtMamNon + observedMamNon}</td>
          <td>Đánh giá chuẩn 5 tiêu chí Mầm non</td>
        </tr>
        <tr>
          <td class="font-bold">3. Dự giờ Giáo viên nước ngoài (Foreign Teacher / ESL)</td>
          <td class="text-center font-bold">${taughtGVNN}</td>
          <td class="text-center font-bold">${observedGVNN}</td>
          <td class="text-center font-bold" style="color: #003B3A;">${taughtGVNN + observedGVNN}</td>
          <td>Đánh giá chuẩn Walkthrough / ESL Rubric</td>
        </tr>
        <tr style="background: #e2e8f0; font-weight: 800;">
          <td>TỔNG CỘNG HỢP LỆ</td>
          <td class="text-center">${totalTaughtValid}</td>
          <td class="text-center">${totalObservedValid}</td>
          <td class="text-center" style="color: #003B3A;">${totalTaughtValid + totalObservedValid}</td>
          <td>Tính cả hệ số tiết đôi (x2)</td>
        </tr>
      </tbody>
    </table>
    <div class="section-title">2. MA TRẬN DỰ GIỜ THEO CƠ SỞ (ĐỐI CHIẾU NỘI BỘ & LIÊN CƠ SỞ)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Cơ sở công tác chính</th>
          <th>Dự nội bộ cơ sở</th>
          <th>Dự liên cơ sở</th>
          <th>Chi tiết phân bổ các cơ sở</th>
          <th>Tỷ lệ liên cơ sở</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold text-center">${homeCampusName}</td>
          <td class="text-center font-bold">${internalObserved} tiết</td>
          <td class="text-center font-bold">${crossObserved} tiết</td>
          <td>
            ${Object.entries(campusDistribution).map(([cn, count]) => `${cn}: <strong>${count} tiết</strong>`).join(" • ") || "Chưa có dữ liệu dự giờ"}
          </td>
          <td class="text-center font-bold">
            ${totalObservedValid > 0 ? Math.round((crossObserved / totalObservedValid) * 100) : 0}%
          </td>
        </tr>
      </tbody>
    </table>
    <div class="section-title">3. BẢNG KÊ CHI TIẾT CÁC TIẾT DẠY & DỰ THEO THÁNG (SỔ CÁI)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px;">STT</th>
          <th style="width: 75px;">Ngày</th>
          <th style="width: 75px;">Danh mục</th>
          <th style="width: 45px;">Vai trò</th>
          <th style="width: 38px;">Tiết</th>
          <th>Môn học & Lớp</th>
          <th>Tên bài dạy / Chủ đề</th>
          <th>Người dạy / Người dự</th>
          <th style="width: 80px;">Cơ sở</th>
          <th style="width: 70px;">Đánh giá</th>
          <th style="width: 65px;">Hợp lệ</th>
        </tr>
      </thead>
      <tbody>
        ${ledgerList.length === 0 ? `
          <tr>
            <td colspan="11" class="text-center" style="padding: 16px; color: #64748b;">
              Không tìm thấy tiết dạy hoặc tiết dự nào trong kỳ báo cáo này.
            </td>
          </tr>
        ` : ledgerList.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center">${item.date}</td>
            <td class="text-center">
              <span class="badge ${item.category === "PHO_THONG" ? "badge-pt" : item.category === "MAM_NON" ? "badge-mn" : "badge-esl"}">
                ${item.categoryLabel}
              </span>
            </td>
            <td class="text-center font-bold" style="color: ${item.role === "DẠY" ? "#0369a1" : "#0f766e"};">
              ${item.role}
            </td>
            <td class="text-center">${item.periodCount}</td>
            <td><strong>${item.subject}</strong> - Lớp ${item.className}</td>
            <td>${item.topic}</td>
            <td>
              ${item.role === "DẠY" ? `Người dự: ${item.observerNames}` : `Dạy: ${item.hostName}`}
            </td>
            <td class="text-center">${item.campus}</td>
            <td class="text-center">
              ${item.scoreText !== "-" ? `<strong>${item.scoreText}</strong><br/>` : ""}${item.ratingText}
            </td>
            <td class="text-center">
              <span class="badge ${item.isValid ? "badge-valid" : "badge-wait"}">
                ${item.isValid ? "✅ Hợp lệ" : "⏳ Chờ ĐG"}
              </span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="section-title">4. LỊCH SỬ KẾT QUẢ ĐÁNH GIÁ TIẾT DẠY & GÓP Ý CỦA TỔ CHUYÊN MÔN (TCM)</div>
    ${evaluationHistories.length === 0 ? `
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; text-align: center; color: #64748b; font-size: 8.5pt;">
        Giáo viên chưa có phiếu đánh giá tiết dạy nào được lưu trữ trong kỳ này.
      </div>
    ` : evaluationHistories.map((eh, idx) => `
      <div class="feedback-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div>
            <span class="feedback-title">${idx + 1}. Bài dạy: ${eh.topic}</span>
            <div style="font-size: 8pt; color: #64748b;">
              Môn: <strong>${eh.subject}</strong> • Lớp: <strong>${eh.className}</strong> • Ngày: <strong>${eh.date}</strong> • Khối: <strong>${eh.catLabel}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 9.5pt; font-weight: 800; color: #003B3A;">
              ${eh.totalScore !== null && eh.totalScore !== undefined ? `${eh.totalScore} điểm` : ""} (${eh.overallRating})
            </span>
            <div style="font-size: 8pt; color: #64748b;">Người dự: <strong>${eh.evaluatorName}</strong> (${eh.evaluatorPosition})</div>
          </div>
        </div>
        <div class="feedback-body">
          ${eh.strengths ? `<p><strong>🌟 Ưu điểm:</strong> ${eh.strengths}</p>` : ""}
          ${eh.improvements ? `<p style="margin-top: 3px;"><strong>⚠️ Tồn tại & Góp ý hoàn thiện:</strong> ${eh.improvements}</p>` : ""}
          ${eh.generalComment ? `<p style="margin-top: 3px;"><strong>📝 Nhận xét chung của TCM:</strong> ${eh.generalComment}</p>` : ""}
          ${eh.teacherFeedback ? `<p style="margin-top: 3px; color: #0369a1;"><strong>💬 Ý kiến tiếp thu của GV:</strong> ${eh.teacherFeedback}</p>` : ""}
        </div>
      </div>
    `).join("")}
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-role">NGƯỜI LẬP BẢNG</div>
          <div class="sign-note">(Ký và ghi rõ họ tên)</div>
          <div class="sign-name">${teacher.teacherName}</div>
        </td>
        <td>
          <div class="sign-role">TỔ TRƯỞNG CHUYÊN MÔN (TTCM)</div>
          <div class="sign-note">(Ký và ghi rõ họ tên)</div>
          <div class="sign-name">${teacher.position === "TTCM" ? teacher.teacherName : "..................................."}</div>
        </td>
        <td>
          <div class="sign-role">BAN GIÁM HIỆU / GĐCS</div>
          <div class="sign-note">(Ký duyệt và đóng dấu)</div>
          <div class="sign-name">...................................</div>
        </td>
      </tr>
    </table>
  </div>
  <script>
    if (new URLSearchParams(window.location.search).get("autoPrint") === "true") {
      window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => { window.print(); }, 500);
      });
    }
  </script>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    })
  } catch (error: any) {
    console.error("GET /api/admin/du-gio/export-bang-ke-pdf error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
