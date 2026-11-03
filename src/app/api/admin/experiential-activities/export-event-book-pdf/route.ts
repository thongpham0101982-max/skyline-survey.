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

function parseDbJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
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

// 6 Vai trò chuẩn hóa
const ROLE_LABELS: Record<string, string> = {
  TN: "Trưởng nhóm",
  PN: "Phó nhóm",
  TK: "Thư ký",
  TV_TC: "Thành viên tích cực",
  TV: "Thành viên tham gia",
  HT_KT: "Hỗ trợ / Kỹ thuật"
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get("activityId") || searchParams.get("id")
  const classIdParam = searchParams.get("classId")
  const scope = (searchParams.get("scope") || "FULL").toUpperCase() // FULL | PLAN_ONLY | EVAL_ONLY
  const autoPrint = searchParams.get("autoPrint") === "true"
  const directDownload = searchParams.get("download") === "true"

  if (!activityId) {
    return NextResponse.json({ error: "Missing activityId parameter" }, { status: 400 })
  }

  try {
    let session = null
    try {
      session = await auth()
    } catch {
      session = null
    }

    // 1. Fetch Activity Record or Catalog
    let activityRecord = await prisma.activityRecord.findUnique({
      where: { id: activityId },
      include: {
        academicYear: true,
        catalog: true,
        teacher: { include: { user: true, campus: true } },
        participants: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true,
                    teachers: { include: { teacher: true } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!activityRecord) {
      activityRecord = await prisma.activityRecord.findFirst({
        where: { catalogId: activityId },
        include: {
          academicYear: true,
          catalog: true,
          teacher: { include: { user: true, campus: true } },
          participants: {
            include: {
              student: {
                include: {
                  class: {
                    include: {
                      campus: true,
                      teachers: { include: { teacher: true } }
                    }
                  }
                }
              }
            }
          }
        }
      })
    }

    let catalog = activityRecord?.catalog
    let meta: any = {}
    let catMeta: any = {}

    if (activityRecord) {
      meta = parseDbJson<any>(activityRecord.locationId, {})
      catMeta = parseDbJson<any>(activityRecord.catalog?.description, {})
    } else {
      // Find directly in ActivityCatalog
      catalog = await prisma.activityCatalog.findUnique({
        where: { id: activityId },
        include: { group: true, type: true, theme: true }
      })
      if (!catalog) {
        return NextResponse.json({ error: "Không tìm thấy hoạt động / sự kiện" }, { status: 404 })
      }
      catMeta = parseDbJson<any>(catalog.description, {})
      meta = catMeta
    }

    // Tên hoạt động & mã
    const activityName = activityRecord?.name || catalog?.name || "Hoạt động trải nghiệm"
    const activityCode = activityRecord?.code || catalog?.code || "HDTN-SK"
    const themeName = meta.themeName || catMeta.themeName || catalog?.theme?.name || "Hoạt động phát triển kỹ năng toàn diện"
    const location = meta.location || meta.expectedLocation || "Khuôn viên trường & Cơ sở thực địa"
    const timeRange = meta.timeRange || meta.timeFrame || formatVNDate(activityRecord?.date) || "Học kỳ I / II"

    // Năm học
    let academicYearName = activityRecord?.academicYear?.name || ""
    if (!academicYearName && meta.academicYearId) {
      const y = await prisma.academicYear.findUnique({ where: { id: meta.academicYearId } })
      if (y) academicYearName = y.name
    }
    if (!academicYearName) {
      const y = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })
      if (y) academicYearName = y.name
    }
    if (!academicYearName) academicYearName = "2025 - 2026"

    // 2. Xác định danh sách lớp liên quan
    let targetClassId = classIdParam
    let classRecord: any = null

    // Lấy thông tin lớp nếu có classId
    if (targetClassId && targetClassId !== "ALL" && targetClassId !== "all") {
      classRecord = await prisma.class.findUnique({
        where: { id: targetClassId },
        include: {
          campus: true,
          teachers: { include: { teacher: true } }
        }
      })
    }

    // Nếu chưa có classRecord, thử suy ra từ participants hoặc assignedClasses
    if (!classRecord) {
      const assigned = meta.assignedClasses || catMeta.assignedClasses || []
      if (assigned.length > 0) {
        const first = assigned[0]
        const cid = first.id || first.classId
        if (cid) {
          targetClassId = cid
          classRecord = await prisma.class.findUnique({
            where: { id: cid },
            include: {
              campus: true,
              teachers: { include: { teacher: true } }
            }
          })
        }
      }
      if (!classRecord && activityRecord?.participants?.length > 0) {
        const firstP = activityRecord.participants[0]
        if (firstP.student?.class) {
          classRecord = firstP.student.class
          targetClassId = classRecord.id
        }
      }
    }

    // Tìm tên GVCN
    let homeroomTeacherName = ""
    if (classRecord?.teachers?.length > 0) {
      const hr = classRecord.teachers.find((t: any) => t.isHomeroom || t.role === "HOMEROOM")
      homeroomTeacherName = hr?.teacher?.teacherName || classRecord.teachers[0]?.teacher?.teacherName || ""
    }
    if (!homeroomTeacherName) {
      homeroomTeacherName = meta.leadTeacherName || meta.creatorName || activityRecord?.teacher?.teacherName || "Giáo viên Chủ nhiệm"
    }

    const className = classRecord?.className || meta.className || "Toàn khối"
    const gradeName = classRecord?.grade ? `Khối ${classRecord.grade}` : (meta.grade ? `Khối ${meta.grade}` : "Toàn trường")
    const campusName = classRecord?.campus?.campusName || meta.campusName || "Hệ thống Giáo dục Sky-Line"

    // 3. Lấy danh sách học sinh & Kết quả đánh giá của Lớp
    let studentsList: any[] = []

    if (activityRecord && activityRecord.participants?.length > 0) {
      // Lọc participants theo classId
      let filteredP = activityRecord.participants
      if (targetClassId && targetClassId !== "ALL" && targetClassId !== "all") {
        filteredP = filteredP.filter((p: any) => p.student?.classId === targetClassId)
      }
      if (filteredP.length > 0) {
        studentsList = filteredP.map((p: any, idx: number) => {
          const pNote = parseDbJson<any>(p.note, {})
          const roleId = p.roleId || pNote.roleId || (Array.isArray(pNote.roles) ? pNote.roles[0] : "")
          const roleLabel = ROLE_LABELS[roleId] || p.roleName || (Array.isArray(pNote.roles) ? pNote.roles[0] : "Thành viên tham gia")
          const percent = pNote.calculatedPercent !== undefined ? pNote.calculatedPercent : (p.score !== null ? p.score : null)
          
          let resultLabel = "Chưa đánh giá"
          let resultClass = "badge-gray"
          const r = (pNote.finalResult || p.evalLevelId || "").toUpperCase()
          if (r === "XUAT_SAC" || r === "TOT" || (percent !== null && percent >= 80)) {
            resultLabel = "Xuất sắc"
            resultClass = "badge-outstanding"
          } else if (r === "DAT" || (percent !== null && percent >= 50)) {
            resultLabel = "Đạt"
            resultClass = "badge-pass"
          } else if (r === "CAN_HO_TRO" || r === "CAN_CO_GANG" || (percent !== null && percent < 50)) {
            resultLabel = "Cần hỗ trợ"
            resultClass = "badge-warning"
          }

          return {
            stt: idx + 1,
            studentCode: p.student?.studentCode || `HS-${idx + 1}`,
            studentName: p.student?.studentName || "Học sinh",
            gender: p.student?.gender || "",
            attendance: pNote.attendance === "ABSENT" ? "Vắng" : "Có mặt",
            isAbsent: pNote.attendance === "ABSENT",
            roleLabel,
            roleId,
            percent: percent !== null ? `${Math.round(percent)}%` : "-",
            resultLabel,
            resultClass,
            remarks: pNote.remarksCustom || (Array.isArray(pNote.remarksQuick) ? pNote.remarksQuick.join(", ") : "") || ""
          }
        })
      }
    }

    // Nếu chưa có participants trong record (hoặc mở từ catalog), query danh sách học sinh từ DB
    if (studentsList.length === 0 && targetClassId) {
      const dbStudents = await prisma.student.findMany({
        where: {
          classId: targetClassId,
          status: { not: "INACTIVE" }
        },
        orderBy: { studentName: "asc" }
      })

      studentsList = dbStudents.map((st: any, idx: number) => ({
        stt: idx + 1,
        studentCode: st.studentCode,
        studentName: st.studentName,
        gender: st.gender || "",
        attendance: "Có mặt",
        isAbsent: false,
        roleLabel: idx === 0 ? "Trưởng nhóm" : idx === 1 ? "Phó nhóm" : idx === 2 ? "Thư ký" : "Thành viên tham gia",
        roleId: idx === 0 ? "TN" : idx === 1 ? "PN" : idx === 2 ? "TK" : "TV",
        percent: "-",
        resultLabel: "Chờ đánh giá",
        resultClass: "badge-gray",
        remarks: ""
      }))
    }

    // Thống kê
    const totalStudents = studentsList.length
    let presentCount = 0
    let absentCount = 0
    let outstandingCount = 0
    let passCount = 0
    let needSupportCount = 0

    const roleStats: Record<string, number> = {
      TN: 0,
      PN: 0,
      TK: 0,
      TV_TC: 0,
      TV: 0,
      HT_KT: 0
    }

    studentsList.forEach(st => {
      if (st.isAbsent) absentCount++
      else presentCount++

      if (st.resultLabel === "Xuất sắc") outstandingCount++
      else if (st.resultLabel === "Đạt") passCount++
      else if (st.resultLabel === "Cần hỗ trợ") needSupportCount++

      if (st.roleId && roleStats[st.roleId] !== undefined) {
        roleStats[st.roleId]++
      } else {
        roleStats.TV++
      }
    })

    const participationRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 100
    const exportTimeFormatted = new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })

    // 4. Kế hoạch chi tiết (Lấy từ detailedPlan hoặc suy diễn từ meta)
    const plan = meta.detailedPlan || meta.planData || {}
    const planTitle = plan.title || `Kế hoạch tổ chức ${activityName} - Lớp ${className}`
    const targetQualities = plan.targetQualities || meta.targetQualities || "Rèn luyện phẩm chất tự giác, tinh thần đồng đội, trách nhiệm cá nhân đối với cộng đồng và ý thức bảo vệ môi trường."
    const targetCompetencies = plan.targetCompetencies || meta.learningOutcomes || meta.objectives || "Phát triển năng lực giao tiếp sư phạm, làm việc nhóm, giải quyết vấn đề thực tiễn, tính sáng tạo và khả năng thích ứng linh hoạt."
    const deliverables = plan.deliverables || meta.deliverables || "Bài thu hoạch cá nhân/nhóm, ảnh/video nhật ký trải nghiệm thực địa, sản phẩm sáng tạo hoặc bài thuyết trình báo cáo."
    
    const phasePrep = plan.phasePrep || meta.phasePrep || "1. Họp phổ biến kế hoạch, mục tiêu, lộ trình và nội quy an toàn đến học sinh và cha mẹ học sinh.\n2. Phân công nhiệm vụ ban cán sự: Trưởng nhóm, Phó nhóm, Thư ký, Hỗ trợ kỹ thuật.\n3. Chuẩn bị đồng phục, tài liệu khảo sát, dụng cụ thực hành và thiết bị ghi nhận dữ liệu."
    const phaseExecute = plan.phaseExecute || meta.phaseExecute || "1. Tập trung, điểm danh và quán triệt kỷ luật an toàn trước giờ xuất phát.\n2. Tiến hành các trạm hoạt động trải nghiệm thực địa theo hướng dẫn của ban tổ chức.\n3. Các nhóm chủ động thực hiện nhiệm vụ, ghi chép nhật ký, phỏng vấn và hoàn thành chỉ tiêu."
    const phasePost = plan.phasePost || meta.phasePost || "1. Thu thập và nghiệm thu các bài thu hoạch, sản phẩm sáng tạo từ các nhóm học sinh.\n2. Tổ chức buổi sinh hoạt lớp tổng kết, chia sẻ bài học kinh nghiệm và cảm xúc.\n3. GVCN đánh giá xếp loại học sinh theo 6 vai trò chuẩn hóa và hoàn tất hồ sơ lưu trữ."

    const logoSrc = getLogoBase64()
    const safeDocTitle = `So_Ke_Hoach_Danh_Gia_Su_Kien_${className}_${activityCode}`.replace(/[^a-zA-Z0-9_-]/g, "_")

    // 5. Render HTML
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sổ Kế Hoạch & Đánh Giá Sự Kiện - Lớp ${className} - ${activityName}</title>
  
  <!-- html2pdf.js bundle for 1-click Direct PDF Download -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

  <style>
    /* =========================================================================
       PAGE SETUP & RESET (Chuẩn hóa khổ A4 Portrait 210mm x 297mm)
    ========================================================================= */
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 14mm 12mm;
    }
    
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.42;
      color: #0f172a;
      background: #f1f5f9;
      padding: 20px 0 40px 0;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* Top Action Bar (Chỉ hiển thị trên web, ẩn 100% khi in/xuất PDF) */
    .action-bar {
      position: sticky;
      top: 0;
      background: #002B2A;
      color: #ffffff;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 99999;
      margin-bottom: 20px;
    }
    .action-btn-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .action-btn-primary {
      background: #00A19A;
      color: #ffffff;
    }
    .action-btn-primary:hover {
      background: #008983;
    }
    .action-btn-accent {
      background: #f59e0b;
      color: #78350f;
    }
    .action-btn-accent:hover {
      background: #d97706;
      color: #ffffff;
    }
    .action-btn-secondary {
      background: #334155;
      color: #f8fafc;
      border: 1px solid #475569;
    }
    .action-btn-secondary:hover {
      background: #475569;
    }
    
    /* Page Container (Khổ A4 chuẩn 186mm printable width) */
    .page-container {
      width: 100%;
      max-width: 186mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 12mm 10mm;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
    }
    
    /* Header layout */
    .header-layout {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 2px solid #003B3A;
      margin-bottom: 12px;
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
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .school-code {
      font-size: 7.2pt;
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
    
    /* Document Title Block */
    .doc-title-block {
      text-align: center;
      margin: 10px 0 14px 0;
    }
    .doc-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 999px;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      background: #f0fdfa;
      color: #003B3A;
      border: 1px solid #99f6e4;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 13.5pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      line-height: 1.3;
    }
    .doc-subtitle {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }
    
    /* Meta Card Info */
    .meta-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px 14px;
      font-size: 8pt;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
      word-break: break-word;
    }
    
    /* Section Headers */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 14px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #003B3A;
      page-break-after: avoid;
      break-after: avoid;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-badge {
      font-size: 7pt;
      font-weight: 700;
      color: #0f766e;
      background: #ccfbf1;
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    /* KPI Cards */
    .kpi-cards-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .kpi-num {
      font-size: 12pt;
      font-weight: 900;
      color: #003B3A;
      line-height: 1.2;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-top: 2px;
    }
    
    /* Plan Content Box */
    .plan-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 12px;
      font-size: 7.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .plan-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }
    .plan-item {
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: 4px;
      border-left: 3px solid #00A19A;
    }
    .plan-label {
      font-size: 7pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .plan-text {
      color: #334155;
      line-height: 1.4;
      white-space: pre-line;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    /* =========================================================================
       DATA TABLES (Khắc phục triệt để tràn lề & phân trang lặp lại thead)
    ========================================================================= */
    .data-table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 7.5pt;
      margin-bottom: 10px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .data-table thead {
      display: table-header-group !important;
    }
    .data-table tfoot {
      display: table-footer-group !important;
    }
    .data-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .data-table th {
      background: #003B3A !important;
      color: #ffffff !important;
      font-weight: 700;
      padding: 5px 4px;
      border: 1px solid #002B2A;
      text-align: center;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.2px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .data-table td {
      padding: 4.5px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      color: #1e293b;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 3px;
      font-size: 6.5pt;
      font-weight: 700;
      white-space: nowrap;
      text-align: center;
    }
    .badge-outstanding {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-pass {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-warning {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .badge-gray {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .badge-role {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    
    /* Signature Table (Tránh ngắt trang tách rời khung chữ ký) */
    .sign-table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse;
      margin-top: 16px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .sign-table td {
      border: none;
      padding: 0 8px;
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
      height: 52px;
    }
    .sign-name {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }

    /* Page Footer Info */
    .doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      font-size: 6.8pt;
      color: #64748b;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* =========================================================================
       PRINT MEDIA QUERIES (Chuẩn hóa in ấn & lưu PDF trình duyệt)
    ========================================================================= */
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      .action-bar {
        display: none !important;
      }
      .page-container {
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body>

  <!-- =========================================================================
       TOP ACTION BAR (Dành cho xem web, in vector và tải trực tiếp PDF)
  ========================================================================= -->
  <div class="action-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 9.5pt; font-weight: 800; color: #5eead4;">SKY-LINE ARCHIVE</span>
      <span style="color: #475569;">|</span>
      <span style="font-size: 8.5pt; color: #e2e8f0;">Sổ Kế Hoạch & Đánh Giá Sự Kiện Lớp ${className} • ${activityName}</span>
    </div>
    
    <div class="action-btn-group">
      <!-- Nút 1: Tải trực tiếp file PDF về máy -->
      <button class="action-btn action-btn-accent" onclick="downloadDirectPDF()" id="btn-download-pdf">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Tải File PDF (.pdf)</span>
      </button>

      <!-- Nút 2: In Sổ / Lưu PDF vector bằng hộp thoại trình duyệt (như Phiếu Dự Giờ) -->
      <button class="action-btn action-btn-primary" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>Lưu PDF / In Sổ (A4 Vector)</span>
      </button>

      <!-- Nút 3: Đóng cửa sổ -->
      <button class="action-btn action-btn-secondary" onclick="window.close()">
        Đóng cửa sổ
      </button>
    </div>
  </div>

  <!-- =========================================================================
       NỘI DUNG TÀI LIỆU CHUẨN A4 SƯ PHẠM
  ========================================================================= -->
  <div class="page-container" id="printable-book-content">
    
    <!-- Header chuẩn nhận diện Sky-Line -->
    <div class="header-layout">
      <div class="school-info">
        <div class="school-title">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
        <div class="school-dept">BỘ PHẬN HOẠT ĐỘNG TRẢI NGHIỆM & CÔNG TÁC HỌC SINH</div>
        <div class="school-code">Mã số hồ sơ lưu trữ: ${activityCode} • Niên khóa: ${academicYearName}</div>
      </div>
      <div class="logo-box">
        ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Sky-Line Logo" />` : `<div style="font-weight:900; color:#003B3A; font-size:14pt;">SKY-LINE</div>`}
      </div>
    </div>

    <!-- Document Title Block -->
    <div class="doc-title-block">
      <div class="doc-badge">HỒ SƠ LƯU TRỮ HOẠT ĐỘNG TRẢI NGHIỆM & NGOẠI KHÓA</div>
      <div class="doc-title">SỔ KẾ HOẠCH & ĐÁNH GIÁ SỰ KIỆN THEO LỚP</div>
      <div class="doc-subtitle">Kế hoạch tổ chức chi tiết và bảng đánh giá kết quả 6 vai trò học sinh • Năm học ${academicYearName}</div>
    </div>

    <!-- Metadata Card -->
    <div class="meta-card">
      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Tên hoạt động / sự kiện</span>
          <span class="meta-value">${activityName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Lớp thực hiện & Khối</span>
          <span class="meta-value">Lớp ${className} (${gradeName})</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Cơ sở giáo dục</span>
          <span class="meta-value">${campusName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Giáo viên Chủ nhiệm</span>
          <span class="meta-value">${homeroomTeacherName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Thời gian tổ chức</span>
          <span class="meta-value">${timeRange}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Địa điểm tổ chức</span>
          <span class="meta-value">${location}</span>
        </div>
      </div>
    </div>

    ${scope !== "EVAL_ONLY" ? `
    <!-- =========================================================================
        PHẦN I: KẾ HOẠCH CHI TIẾT & TIẾN TRÌNH SƯ PHẠM
    ========================================================================= -->
    <div class="section-header">
      <span class="section-title">I. KẾ HOẠCH CHI TIẾT VÀ MỤC TIÊU SƯ PHẠM</span>
      <span class="section-badge">QUY CHUẨN ĐỔI MỚI</span>
    </div>

    <div class="plan-box">
      <div class="plan-grid">
        <div class="plan-item">
          <div class="plan-label">1. Mục tiêu Phẩm chất</div>
          <div class="plan-text">${targetQualities}</div>
        </div>
        <div class="plan-item">
          <div class="plan-label">2. Mục tiêu Năng lực</div>
          <div class="plan-text">${targetCompetencies}</div>
        </div>
      </div>

      <div class="plan-item" style="margin-bottom: 8px;">
        <div class="plan-label">3. Sản phẩm thu hoạch dự kiến</div>
        <div class="plan-text">${deliverables}</div>
      </div>

      <div style="font-weight: 800; color: #003B3A; font-size: 7.5pt; text-transform: uppercase; margin: 8px 0 4px 0;">
        4. Tiến trình triển khai 3 giai đoạn của Lớp:
      </div>
      <table class="data-table" style="margin-bottom: 0;">
        <thead>
          <tr>
            <th style="width: 25%;">Giai đoạn</th>
            <th style="width: 75%;">Nội dung công việc & Phân công trách nhiệm</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold" style="color: #003B3A;">Giai đoạn 1: Chuẩn bị</td>
            <td class="plan-text">${phasePrep}</td>
          </tr>
          <tr>
            <td class="font-bold" style="color: #003B3A;">Giai đoạn 2: Thực địa / Sự kiện</td>
            <td class="plan-text">${phaseExecute}</td>
          </tr>
          <tr>
            <td class="font-bold" style="color: #003B3A;">Giai đoạn 3: Báo cáo & Đánh giá</td>
            <td class="plan-text">${phasePost}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ""}

    ${scope !== "PLAN_ONLY" ? `
    <!-- =========================================================================
        PHẦN II: BẢNG KẾT QUẢ ĐÁNH GIÁ HỌC SINH THEO LỚP
    ========================================================================= -->
    <div class="section-header">
      <span class="section-title">II. BẢNG ĐÁNH GIÁ KẾT QUẢ THEO 6 VAI TRÒ HỌC SINH</span>
      <span class="section-badge">TỶ LỆ THAM GIA: ${participationRate}%</span>
    </div>

    <!-- KPI Summary Grid -->
    <div class="kpi-cards-grid">
      <div class="kpi-box">
        <div class="kpi-num">${totalStudents}</div>
        <div class="kpi-label">Tổng số học sinh</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #059669;">${presentCount}</div>
        <div class="kpi-label">Có mặt tham gia</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #dc2626;">${absentCount}</div>
        <div class="kpi-label">Vắng mặt</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #d97706;">${outstandingCount}</div>
        <div class="kpi-label">Xếp loại Xuất sắc</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-num" style="color: #0d9488;">${passCount}</div>
        <div class="kpi-label">Đạt yêu cầu</div>
      </div>
    </div>

    <!-- Bảng phân bổ 6 vai trò chuẩn hóa (Tổng 100% chiều rộng) -->
    <table class="data-table" style="margin-bottom: 8px;">
      <thead>
        <tr>
          <th style="width: 16.66%;">Trưởng nhóm</th>
          <th style="width: 16.66%;">Phó nhóm</th>
          <th style="width: 16.66%;">Thư ký</th>
          <th style="width: 16.66%;">Thành viên tích cực</th>
          <th style="width: 16.66%;">Thành viên tham gia</th>
          <th style="width: 16.70%;">Hỗ trợ / Kỹ thuật</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-bold">${roleStats.TN} HS</td>
          <td class="text-center font-bold">${roleStats.PN} HS</td>
          <td class="text-center font-bold">${roleStats.TK} HS</td>
          <td class="text-center font-bold">${roleStats.TV_TC} HS</td>
          <td class="text-center font-bold">${roleStats.TV} HS</td>
          <td class="text-center font-bold">${roleStats.HT_KT} HS</td>
        </tr>
      </tbody>
    </table>

    <!-- Bảng chi tiết học sinh (Tổng tỷ lệ % chính xác 100%, chống tràn lề tuyệt đối) -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 5%;">STT</th>
          <th style="width: 12%;">Mã HS</th>
          <th style="width: 23%;">Họ và tên học sinh</th>
          <th style="width: 10%;">Điểm danh</th>
          <th style="width: 16%;">Vai trò đảm nhiệm</th>
          <th style="width: 8%;">Điểm</th>
          <th style="width: 11%;">Xếp loại</th>
          <th style="width: 15%;">Nhận xét của GVCN</th>
        </tr>
      </thead>
      <tbody>
        ${studentsList.length > 0 ? studentsList.map(st => `
          <tr>
            <td class="text-center">${st.stt}</td>
            <td class="text-center font-bold" style="color: #475569;">${st.studentCode}</td>
            <td class="font-bold">${st.studentName}</td>
            <td class="text-center ${st.isAbsent ? 'font-bold' : ''}" style="${st.isAbsent ? 'color: #dc2626;' : 'color: #166534;'}">
              ${st.attendance}
            </td>
            <td>
              <span class="badge badge-role">${st.roleLabel}</span>
            </td>
            <td class="text-center font-bold">${st.percent}</td>
            <td class="text-center">
              <span class="badge ${st.resultClass}">${st.resultLabel}</span>
            </td>
            <td style="font-size: 7pt; color: #334155;">${st.remarks || "-"}</td>
          </tr>
        `).join("") : `
          <tr>
            <td colspan="8" class="text-center" style="padding: 16px; color: #94a3b8;">
              Chưa có dữ liệu danh sách học sinh của lớp này.
            </td>
          </tr>
        `}
      </tbody>
    </table>
    ` : ""}

    <!-- =========================================================================
        PHẦN III: KHUNG KÝ XÁC NHẬN 3 BÊN (Chống xé trang)
    ========================================================================= -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-role">GIÁO VIÊN CHỦ NHIỆM</div>
          <div class="sign-note">(Ký, ghi rõ họ tên)</div>
          <div class="sign-space"></div>
          <div class="sign-name">${homeroomTeacherName}</div>
        </td>
        <td>
          <div class="sign-role">TỔ TRƯỞNG CTHS / BỘ PHẬN HĐTN</div>
          <div class="sign-note">(Ký, duyệt kế hoạch)</div>
          <div class="sign-space"></div>
          <div class="sign-name">Bộ phận Công tác Học sinh</div>
        </td>
        <td>
          <div class="sign-role">BAN GIÁM HIỆU / LÃNH ĐẠO CƠ SỞ</div>
          <div class="sign-note">(Ký tên và đóng dấu)</div>
          <div class="sign-space"></div>
          <div class="sign-name">Ban Giám Hiệu Sky-Line</div>
        </td>
      </tr>
    </table>

    <!-- Footer tài liệu lưu trữ SSQM -->
    <div class="doc-footer">
      <span>Hệ thống Quản trị & Điều hành Giáo dục Sky-Line (SSQM) • Phân hệ Hoạt động Trải nghiệm</span>
      <span>Thời điểm xuất: ${exportTimeFormatted}</span>
    </div>
  </div>

  <script>
    // Hàm tải file PDF trực tiếp qua html2pdf bundle
    function downloadDirectPDF() {
      const btn = document.getElementById("btn-download-pdf");
      const element = document.getElementById("printable-book-content");
      if (!element) return;

      const originalBtnText = btn.innerHTML;
      btn.innerHTML = "<span>Đang tạo PDF...</span>";
      btn.style.opacity = "0.7";

      const opt = {
        margin: [12, 12, 14, 12],
        filename: "${safeDocTitle}.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: ["tr", ".plan-box", ".kpi-cards-grid", ".meta-card", ".sign-table"]
        }
      };

      if (typeof html2pdf !== "undefined") {
        html2pdf().set(opt).from(element).save().then(() => {
          btn.innerHTML = originalBtnText;
          btn.style.opacity = "1";
        }).catch((err) => {
          console.error("Lỗi xuất PDF trực tiếp:", err);
          btn.innerHTML = originalBtnText;
          btn.style.opacity = "1";
          window.print();
        });
      } else {
        window.print();
      }
    }

    // Tự động kích hoạt in hoặc tải nếu có tham số trên URL
    window.addEventListener("DOMContentLoaded", () => {
      ${directDownload ? `
        setTimeout(() => { downloadDirectPDF(); }, 400);
      ` : autoPrint ? `
        setTimeout(() => { window.print(); }, 400);
      ` : ""}
    });
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
    console.error("GET /api/admin/experiential-activities/export-event-book-pdf error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
