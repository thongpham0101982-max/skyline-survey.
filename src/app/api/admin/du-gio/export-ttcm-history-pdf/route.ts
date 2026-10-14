/* eslint-disable */
// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath)
      return `data:image/png;base64,${buffer.toString("base64")}`
    }
  } catch (e) {
    console.error("Error reading logo.png:", e)
  }
  return ""
}

function formatVNDate(d?: Date | string | null): string {
  if (!d) return ""
  try {
    const dateObj = new Date(d)
    if (isNaN(dateObj.getTime())) return String(d)
    return dateObj.toLocaleDateString("vi-VN")
  } catch {
    return String(d)
  }
}

function isSurpriseSlot(slot: any): boolean {
  if (!slot) return false
  return (
    slot.requestOrigin === "SURPRISE" ||
    (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
    (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
  )
}

function getPresetTarget(type: string): number {
  if (type === "Ban ĐHCM") return 10
  if (type === "GĐCS" || type === "GDCS" || type === "Giám đốc Điều hành cơ sở") return 4
  if (type === "TBP") return 4
  if (type === "TTCM" || type === "Nhóm trưởng CM CS") return 6
  if (type === "Giáo viên cũ") return 2
  if (type === "Giáo viên mới") return 6
  return 6
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const teacherId = searchParams.get("teacherId")
  const academicYearId = searchParams.get("academicYearId") || undefined
  const month = searchParams.get("month") || "all"
  const autoPrint = searchParams.get("autoPrint") === "true"

  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacherId parameter" }, { status: 400 })
  }

  try {
    let session = null
    try {
      session = await auth()
    } catch {
      session = null
    }
    if (!session?.user && process.env.NODE_ENV === "production") {
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

    // 3. Resolve position & preset target
    const posUpper = (teacher.position || "").toUpperCase()
    const isTBP = posUpper === "TBP" || posUpper.includes("TBP") || teacher.teacherCode === "0201000095"
    const isGDCS = !isTBP && (["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(posUpper) || posUpper.includes("GIÁM ĐỐC"))
    const isBanDH = !isTBP && (posUpper === "BAN ĐHCM" || posUpper.includes("ĐHCM"))
    const observerType = teacher.observerType || (
      isTBP ? "TBP" :
      isBanDH ? "Ban ĐHCM" :
      isGDCS ? "GĐCS" :
      (teacher.position?.includes("Nhóm trưởng") ? "Nhóm trưởng CM CS" : "TTCM")
    )

    let target = null
    if (activeYear) {
      target = await prisma.teacherAcademicYearTarget.findUnique({
        where: {
          teacherId_academicYearId: {
            teacherId: teacher.id,
            academicYearId: activeYear.id
          }
        }
      }).catch(() => null)
    }

    const reqObserved = (target?.requiredObserved && target.requiredObserved > 0)
      ? target.requiredObserved
      : (teacher.requiredObserved && teacher.requiredObserved > 0)
        ? teacher.requiredObserved
        : getPresetTarget(observerType)

    const observedUnit = target?.observedUnit || teacher.observedUnit || "tháng"

    // 4. Fetch all campuses
    const campuses = await prisma.campus.findMany({
      where: { NOT: { status: "INACTIVE" } },
      orderBy: { campusName: "asc" }
    })
    const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

    // 5. Query all Slots where TTCM registered as observer
    const whereConditions: any = {
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "COMPLETED", "REJECTED", "OPEN", "EXPIRED"] },
      registrations: {
        some: {
          teacherId: teacher.id,
          isApproved: true
        }
      }
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
          where: {
            teacherId: teacher.id
          },
          include: {
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

    // 6. Aggregate KPIs
    const homeCampusName = teacher.campus?.campusName || "CS1"
    let totalObserved = 0
    let totalSurprise = 0
    let internalObserved = 0
    let crossObserved = 0
    let evaluatedCount = 0
    let passingCount = 0

    const campusDistribution: Record<string, { total: number; surprise: number }> = {}
    campuses.forEach(c => {
      campusDistribution[c.campusName] = { total: 0, surprise: 0 }
    })

    interface HistoryEntry {
      id: string
      date: string
      time: string
      periodNumber: string
      level: string
      grade: string
      className: string
      subject: string
      topic: string
      hostTeacherName: string
      hostTeacherCode: string
      campus: string
      isCrossCampus: boolean
      isSurprise: boolean
      periodCount: number
      score: number | null
      rating: string
      isPassed: boolean
      strengths: string
      improvements: string
      generalComment: string
    }

    const historyList: HistoryEntry[] = []

    filteredSlots.forEach(slot => {
      const reg = slot.registrations?.[0]
      if (!reg || !reg.isApproved) return

      const inc = slot.isDoublePeriod ? 2 : 1
      const isSurprise = isSurpriseSlot(slot)
      let slotCampusName = slot.campusName || campusMap.get(slot.campusId) || slot.teacher?.campus?.campusName || "Chưa rõ"
      // Prioritize class name explicit campus suffix (e.g. 2S_CS4 -> CS4)
      if (slot.className) {
        const match = slot.className.match(/[-_. ](CS\d+)/i)
        if (match) {
          slotCampusName = match[1].toUpperCase()
        }
      }

      totalObserved += inc
      if (isSurprise) totalSurprise += inc

      if (slotCampusName === homeCampusName) {
        internalObserved += inc
      } else {
        crossObserved += inc
      }

      if (!campusDistribution[slotCampusName]) {
        campusDistribution[slotCampusName] = { total: 0, surprise: 0 }
      }
      campusDistribution[slotCampusName].total += inc
      if (isSurprise) campusDistribution[slotCampusName].surprise += inc

      const evalObj = reg.evaluation
      let score: number | null = null
      let rating = "Chờ đánh giá"
      let isPassed = false

      if (evalObj && evalObj.reEvaluationStatus !== "DRAFT") {
        evaluatedCount += inc
        score = evalObj.totalScore !== null && evalObj.totalScore !== undefined ? evalObj.totalScore : null
        rating = evalObj.overallRating || (score !== null ? (score >= 17 ? "Giỏi" : score >= 14 ? "Khá" : "Chưa đạt") : "Đã nộp")
        
        if (slot.level === "Mầm non") {
          isPassed = ["Tốt", "Khá", "Đạt"].includes(evalObj.overallRating || "")
        } else {
          isPassed = score !== null ? score >= 14 : ["Giỏi", "Khá"].includes(evalObj.overallRating || "")
        }

        if (isPassed) passingCount += inc
      }

      historyList.push({
        id: slot.id,
        date: formatVNDate(slot.date),
        time: slot.startTime || "",
        periodNumber: slot.period || (slot.startTime ? slot.startTime.replace("Tiết ", "") : "-"),
        level: slot.level || "Phổ thông",
        grade: slot.grade || "",
        className: slot.className || "-",
        subject: slot.subjectName || "Âm Nhạc",
        topic: slot.topic || "(Chưa có chủ đề)",
        hostTeacherName: slot.teacher?.teacherName || "Chưa phân công",
        hostTeacherCode: slot.teacher?.teacherCode || "",
        campus: slotCampusName,
        isCrossCampus: slotCampusName !== homeCampusName,
        isSurprise,
        periodCount: inc,
        score,
        rating,
        isPassed,
        strengths: evalObj?.strengths || "",
        improvements: evalObj?.improvements || "",
        generalComment: evalObj?.generalComment || ""
      })
    })

    const isTargetMet = reqObserved === 0 || totalObserved >= reqObserved
    const progressPct = reqObserved > 0 ? Math.round((totalObserved / reqObserved) * 100) : 100
    const surprisePct = totalObserved > 0 ? Math.round((totalSurprise / totalObserved) * 100) : 0
    const crossPct = totalObserved > 0 ? Math.round((crossObserved / totalObserved) * 100) : 0
    const passRate = evaluatedCount > 0 ? Math.round((passingCount / evaluatedCount) * 100) : 0

    const periodText = month === "all" ? "Toàn bộ năm học" : `Tháng ${month.split("-")[1]}/${month.split("-")[0]}`
    const yearName = activeYear?.name || "Năm học 2025 - 2026"
    const deptName = teacher.departmentRel?.name || teacher.departmentAssignments?.[0]?.department?.name || "Tổ Âm Nhạc"
    const exportTime = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    const logoSrc = getLogoBase64()

    // 7. Render HTML
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phiếu Lịch Sử Dự Giờ TTCM - ${teacher.teacherName} (${periodText})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      line-height: 1.4;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 16px;
    }
    .action-bar {
      max-width: 210mm;
      margin: 0 auto 12px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 8.5pt;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .action-btn-primary {
      background: #003B3A;
      color: #ffffff;
    }
    .action-btn-primary:hover {
      background: #002B2A;
    }
    .action-btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .action-btn-secondary:hover {
      background: #e2e8f0;
    }
    .page-container {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 16mm 14mm;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #003B3A;
      margin-bottom: 14px;
    }
    .school-info {
      flex: 1;
    }
    .school-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .school-dept {
      font-size: 8pt;
      font-weight: 600;
      color: #334155;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .school-motto {
      font-size: 7.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 2px;
    }
    .logo-box {
      width: 140px;
      text-align: right;
    }
    .logo-img {
      max-height: 44px;
      max-width: 130px;
      object-fit: contain;
    }
    .doc-title-block {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .doc-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: #f0fdfa;
      color: #003B3A;
      border: 1px solid #99f6e4;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 14pt;
      font-weight: 900;
      color: #003B3A;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 500;
      margin-top: 3px;
    }
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 14px;
      font-size: 8pt;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 7pt;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 14px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #003B3A;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-badge {
      font-size: 7.5pt;
      font-weight: 700;
      color: #0f766e;
      background: #ccfbf1;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .kpi-cards-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-num {
      font-size: 13pt;
      font-weight: 900;
      color: #003B3A;
      line-height: 1.2;
    }
    .kpi-label {
      font-size: 7pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 12px;
    }
    .data-table th {
      background: #003B3A;
      color: #ffffff;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #002B2A;
      text-align: center;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.3px;
    }
    .data-table td {
      padding: 5px 7px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      color: #1e293b;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 6.5pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge-surprise {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-internal {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-cross {
      background: #e0f2fe;
      color: #075985;
      border: 1px solid #bae6fd;
    }
    .badge-pass {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-warning {
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
    }
    
    .feedback-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }
    .feedback-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #003B3A;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 7.5pt;
      page-break-inside: avoid;
    }
    .feedback-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5px;
      padding-bottom: 4px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .feedback-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #003B3A;
    }
    .feedback-meta {
      font-size: 7pt;
      color: #64748b;
      margin-top: 1px;
    }
    .feedback-score {
      font-size: 9pt;
      font-weight: 900;
      color: #0f766e;
      text-align: right;
    }
    .feedback-content p {
      margin-top: 3px;
      line-height: 1.45;
    }
    .feedback-content strong {
      color: #0f172a;
    }
    
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .sign-table td {
      border: none;
      padding: 0 10px;
      text-align: center;
      vertical-align: top;
      width: 33.33%;
    }
    .sign-role {
      font-size: 8pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .sign-note {
      font-size: 6.5pt;
      color: #64748b;
      font-style: italic;
      margin-top: 1px;
    }
    .sign-space {
      height: 60px;
    }
    .sign-name {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
      .page-container {
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar for web viewer -->
  <div class="action-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 9pt; font-weight: 800; color: #003B3A;">SKY-LINE ARCHIVE</span>
      <span style="color: #cbd5e1;">|</span>
      <span style="font-size: 8pt; color: #64748b;">Hồ sơ minh chứng dự giờ TTCM • ${teacher.teacherName}</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="action-btn action-btn-primary" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>In Phiếu / Lưu PDF</span>
      </button>
      <button class="action-btn action-btn-secondary" onclick="window.close()">
        Đóng cửa sổ
      </button>
    </div>
  </div>

  <div class="page-container">
    <!-- Header -->
    <div class="header-layout">
      <div class="school-info">
        <div class="school-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
        <div class="school-dept">BỘ PHẬN ĐẢM BẢO CHẤT LƯỢNG & ĐÀO TẠO CHUYÊN MÔN</div>
        <div class="school-motto">"Nơi khởi nguồn ước mơ và phát triển toàn diện năng lực học sinh"</div>
      </div>
      <div class="logo-box">
        ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Sky-Line Logo" />` : `<div style="font-weight:900; color:#003B3A; font-size:14pt;">SKY-LINE</div>`}
      </div>
    </div>

    <!-- Document Title -->
    <div class="doc-title-block">
      <div class="doc-badge">HỒ SƠ LƯU TRỮ CHUYÊN MÔN & ĐBCL</div>
      <h1 class="doc-title">PHIẾU TỔNG HỢP LỊCH SỬ DỰ GIỜ TTCM</h1>
      <div class="doc-subtitle">
        Báo cáo kết quả dự giờ, tư vấn sư phạm & phát triển chuyên môn giáo viên &bull; ${periodText}
      </div>
    </div>

    <!-- TTCM Profile Meta -->
    <div class="meta-card">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Họ và Tên TTCM</span>
          <span class="meta-value" style="color: #003B3A; font-size: 9.5pt;">${teacher.teacherName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Mã Nhân Sự</span>
          <span class="meta-value">${teacher.teacherCode || "Chưa có"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Chức Vụ Chuyên Môn</span>
          <span class="meta-value">${teacher.position || "Tổ trưởng chuyên môn (TTCM)"}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tổ Chuyên Môn</span>
          <span class="meta-value" style="color: #0f766e;">${deptName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Cơ Sở Công Tác Chính</span>
          <span class="meta-value">${homeCampusName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Năm Học & Kỳ Báo Cáo</span>
          <span class="meta-value">${yearName} &bull; ${periodText}</span>
        </div>
      </div>
    </div>

    <!-- SECTION 1: KPI & PHÂN BỔ DỰ GIỜ -->
    <div class="section-header">
      <h2 class="section-title">1. TỔNG HỢP TIẾN ĐỘ CHỈ TIÊU & HIỆU SUẤT DỰ GIỜ</h2>
      <span class="section-badge">${isTargetMet ? "ĐẠT CHỈ TIÊU (" + progressPct + "%)" : "CHƯA ĐẠT (" + progressPct + "%)"}</span>
    </div>

    <div class="kpi-cards-grid">
      <div class="kpi-box">
        <div class="kpi-num">${reqObserved} <span style="font-size:8pt; font-weight:500;">tiết/${observedUnit}</span></div>
        <div class="kpi-label">Chỉ tiêu quy định</div>
        <div class="kpi-sub">${observerType}</div>
      </div>
      <div class="kpi-box" style="border-color: #003B3A; background: #f0fdfa;">
        <div class="kpi-num" style="color: #003B3A;">${totalObserved} <span style="font-size:8pt; font-weight:500;">tiết</span></div>
        <div class="kpi-label" style="color: #003B3A;">Tổng tiết đã dự</div>
        <div class="kpi-sub">${historyList.length} lượt dự giờ</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #b45309;">${totalSurprise} <span style="font-size:8pt; font-weight:500;">tiết</span></div>
        <div class="kpi-label">Dự giờ đột xuất</div>
        <div class="kpi-sub">${surprisePct}% tổng số tiết</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #15803d;">${internalObserved} <span style="font-size:8pt; font-weight:500;">tiết</span></div>
        <div class="kpi-label">Nội bộ cơ sở (${homeCampusName})</div>
        <div class="kpi-sub">${totalObserved > 0 ? Math.round((internalObserved / totalObserved) * 100) : 0}% tổng số tiết</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #0369a1;">${crossObserved} <span style="font-size:8pt; font-weight:500;">tiết</span></div>
        <div class="kpi-label">Chéo liên cơ sở</div>
        <div class="kpi-sub">${crossPct}% tổng số tiết</div>
      </div>
    </div>

    <!-- Ma trận phân bổ theo cơ sở -->
    <table class="data-table">
      <thead>
        <tr>
          <th>Cơ sở công tác chính</th>
          ${campuses.map(c => `<th>${c.campusName}</th>`).join("")}
          <th>Tổng đã dự</th>
          <th>Tỷ lệ dự chéo</th>
          <th>Đánh giá ĐBCL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-bold text-center">${homeCampusName}</td>
          ${campuses.map(c => {
            const stat = campusDistribution[c.campusName] || { total: 0, surprise: 0 }
            const isHome = c.campusName === homeCampusName
            return `
              <td class="text-center ${isHome ? 'font-bold' : ''}" style="${isHome ? 'background:#ecfdf5;' : ''}">
                ${stat.total > 0 ? `<strong>${stat.total} tiết</strong>${stat.surprise > 0 ? `<br/><span style="font-size:6.5pt; color:#b45309;">(${stat.surprise} đ.xuất)</span>` : ''}` : '<span style="color:#cbd5e1;">-</span>'}
              </td>
            `
          }).join("")}
          <td class="text-center font-bold" style="background:#f0fdfa; color:#003B3A; font-size:8.5pt;">
            ${totalObserved} tiết
          </td>
          <td class="text-center font-bold" style="color:#0369a1;">
            ${crossPct}%
          </td>
          <td class="text-center font-bold">
            <span class="badge ${isTargetMet ? 'badge-pass' : 'badge-warning'}">
              ${isTargetMet ? "Đạt chỉ tiêu" : "Chưa đạt"}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION 2: SỔ NHẬT KÝ CHI TIẾT CÁC TIẾT DỰ -->
    <div class="section-header">
      <h2 class="section-title">2. SỔ NHẬT KÝ CHI TIẾT CÁC TIẾT DỰ GIỜ (${historyList.length} LƯỢT)</h2>
      <span class="section-badge">DỮ LIỆU ĐỐI SOÁT HỆ THỐNG</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 24px;">STT</th>
          <th style="width: 60px;">Ngày</th>
          <th style="width: 32px;">Tiết</th>
          <th style="width: 50px;">Lớp</th>
          <th style="width: 45px;">Cơ sở</th>
          <th style="width: 105px;">Giáo viên được dự</th>
          <th>Môn học & Tên bài dạy / Chủ đề</th>
          <th style="width: 68px;">Hình thức</th>
          <th style="width: 58px;">Điểm số</th>
          <th style="width: 62px;">Xếp loại</th>
        </tr>
      </thead>
      <tbody>
        ${historyList.length === 0 ? `
          <tr>
            <td colspan="10" class="text-center" style="padding: 16px; color: #64748b;">
              Chưa có dữ liệu tiết dự giờ nào được lưu trữ trong kỳ này.
            </td>
          </tr>
        ` : historyList.map((item, idx) => `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center font-semibold">${item.date}</td>
            <td class="text-center font-semibold">${item.periodNumber}</td>
            <td class="text-center font-semibold">${item.className}</td>
            <td class="text-center">
              <span class="badge ${item.isCrossCampus ? 'badge-cross' : 'badge-internal'}">
                ${item.campus}
              </span>
            </td>
            <td>
              <div class="font-bold">${item.hostTeacherName}</div>
              ${item.hostTeacherCode ? `<div style="font-size:6.5pt; color:#64748b; font-family:monospace;">${item.hostTeacherCode}</div>` : ''}
            </td>
            <td>
              <div style="font-size:6.5pt; color:#64748b; font-weight:700;">${item.subject}</div>
              <div class="font-semibold" style="color:#003B3A;">${item.topic}</div>
            </td>
            <td class="text-center">
              <span class="badge ${item.isSurprise ? 'badge-surprise' : 'badge-internal'}">
                ${item.isSurprise ? 'Đột xuất' : 'Kế hoạch'}
              </span>
            </td>
            <td class="text-center font-bold" style="color:#0f766e; font-size:8pt;">
              ${item.score !== null ? `${item.score.toFixed(2)}đ` : '-'}
            </td>
            <td class="text-center">
              <span class="badge ${item.isPassed ? 'badge-pass' : 'badge-warning'}">
                ${item.rating}
              </span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- SECTION 3: HỒ SƠ NHẬN XÉT, ƯU ĐIỂM & ĐỊNH HƯỚNG BỒI DƯỠNG CỦA TTCM -->
    <div class="section-header" style="margin-top: 16px;">
      <h2 class="section-title">3. CHI TIẾT NHẬN XÉT & GÓP Ý PHÁT TRIỂN CHUYÊN MÔN CHO GIÁO VIÊN</h2>
      <span class="section-badge">HỒ SƠ TƯ VẤN SƯ PHẠM</span>
    </div>

    <div class="feedback-grid">
      ${historyList.length === 0 ? `
        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 7.5pt; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px;">
          Chưa có nhận xét chuyên môn nào được ghi nhận.
        </div>
      ` : historyList.map((item, idx) => `
        <div class="feedback-card">
          <div class="feedback-top">
            <div>
              <div class="feedback-title">${idx + 1}. ${item.topic}</div>
              <div class="feedback-meta">
                Môn: <strong>${item.subject}</strong> &bull; Lớp: <strong>${item.className}</strong> &bull; Ngày dự: <strong>${item.date}</strong> &bull; Cơ sở: <strong>${item.campus}</strong>
                &bull; GV được dự: <strong style="color:#003B3A;">${item.hostTeacherName}</strong>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="feedback-score">${item.score !== null ? `${item.score.toFixed(2)}/20.0đ` : ''} (${item.rating})</div>
              <span class="badge ${item.isSurprise ? 'badge-surprise' : 'badge-internal'}" style="margin-top:2px;">
                ${item.isSurprise ? 'Dự đột xuất' : 'Theo kế hoạch'}
              </span>
            </div>
          </div>
          <div class="feedback-content">
            ${item.strengths ? `<p><strong>🌟 Ưu điểm nổi bật:</strong> ${item.strengths}</p>` : ''}
            ${item.improvements ? `<p style="margin-top:3px; color:#b45309;"><strong>💡 Góp ý hoàn thiện & Bồi dưỡng sư phạm:</strong> ${item.improvements}</p>` : ''}
            ${item.generalComment ? `<p style="margin-top:3px; color:#475569;"><strong>📝 Nhận xét chung của TTCM:</strong> ${item.generalComment}</p>` : ''}
            ${!item.strengths && !item.improvements && !item.generalComment ? `<p style="color:#94a3b8; font-style:italic;">Phiếu đánh giá đã xác nhận kết quả chấm điểm đạt chuẩn.</p>` : ''}
          </div>
        </div>
      `).join("")}
    </div>

    <!-- Signatures -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-role">NGƯỜI LẬP HỒ SƠ / TTCM</div>
          <div class="sign-note">(Ký và ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          <div class="sign-name">${teacher.teacherName}</div>
        </td>
        <td>
          <div class="sign-role">BỘ PHẬN ĐẢM BẢO CHẤT LƯỢNG</div>
          <div class="sign-note">(Xác nhận đối soát minh chứng)</div>
          <div class="sign-space"></div>
          <div class="sign-name">................................................</div>
        </td>
        <td>
          <div class="sign-role">BAN GIÁM HIỆU / GĐCS</div>
          <div class="sign-note">(Ký duyệt lưu hồ sơ & đóng dấu)</div>
          <div class="sign-space"></div>
          <div class="sign-name">................................................</div>
        </td>
      </tr>
    </table>

    <div style="margin-top: 20px; text-align: right; font-size: 6.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px;">
      Trích xuất từ Hệ thống Quản trị Khảo sát & Dự giờ Sky-Line SSM &bull; Ngày xuất: ${exportTime}
    </div>
  </div>

  <script>
    if (${autoPrint ? "true" : "false"}) {
      window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => { window.print(); }, 400);
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
    console.error("GET /api/admin/du-gio/export-ttcm-history-pdf error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
