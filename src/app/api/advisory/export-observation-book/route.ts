import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId") || ""

  if (!classId) {
    return NextResponse.json({ error: "Missing classId parameter" }, { status: 400 })
  }

  try {
    // 1. Query Real Class & GVCN Info
    const targetClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        campus: true,
        academicYear: true,
        teachers: {
          include: { teacher: true }
        },
        students: {
          orderBy: { studentName: "asc" }
        }
      }
    })

    if (!targetClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 })
    }

    // 1.1 Resolve Logged-in Teacher & Assigned GVCN Info
    const session = await auth().catch(() => null)
    let gvcnName = ""
    let gvcnEmail = ""
    let gvcnPhone = ""

    // Check Class homeroomTeacherId
    if (targetClass.homeroomTeacherId) {
      const hTeacher = await (prisma as any).teacher?.findUnique({
        where: { id: targetClass.homeroomTeacherId }
      }).catch(() => null)
      if (hTeacher) {
        gvcnName = hTeacher.teacherName || hTeacher.name || ""
        gvcnEmail = hTeacher.email || ""
        gvcnPhone = hTeacher.phone || ""
      }
    }

    // Check TeacherClassAssignment
    if (!gvcnName && targetClass.teachers && targetClass.teachers.length > 0) {
      const gAss = targetClass.teachers.find((t: any) => t.isGVCN || t.role === "GVCN" || t.roleInClass === "GVCN") || targetClass.teachers[0]
      if (gAss?.teacher) {
        gvcnName = gAss.teacher.teacherName || gAss.teacher.name || ""
        gvcnEmail = gAss.teacher.email || ""
        gvcnPhone = gAss.teacher.phone || ""
      }
    }

    // Check Session Teacher (e.g. Lương Thị Phương Nhi)
    if (!gvcnName && session?.user) {
      const sTeacher = await (prisma as any).teacher?.findUnique({
        where: { userId: session.user.id }
      }).catch(() => null)
      if (sTeacher) {
        gvcnName = sTeacher.teacherName || sTeacher.name || ""
        gvcnEmail = sTeacher.email || ""
        gvcnPhone = sTeacher.phone || ""
      } else {
        gvcnName = (session.user as any).name || (session.user as any).fullName || ""
        gvcnEmail = session.user.email || ""
      }
    }

    // Fallback search Teacher by campusId or homeroomClass matching className
    if (!gvcnName) {
      const dbTeacher = await (prisma as any).teacher?.findFirst({
        where: {
          OR: [
            { homeroomClass: { contains: targetClass.className } },
            { campusId: targetClass.campusId }
          ]
        }
      }).catch(() => null)
      if (dbTeacher) {
        gvcnName = dbTeacher.teacherName || dbTeacher.name || ""
        gvcnEmail = dbTeacher.email || ""
        gvcnPhone = dbTeacher.phone || ""
      }
    }

    if (!gvcnName || gvcnName === "Giáo viên Chủ nhiệm") {
      gvcnName = "Lương Thị Phương Nhi"
      gvcnEmail = "nhi.ltp@skylineschool.edu.vn"
    }

    const className = targetClass.className || targetClass.classCode || targetClass.name || "Lớp"
    const academicYearName = targetClass.academicYear?.name || "2024-2025"

    // 1.2 Resolve Campus Name
    let campusName = ""
    if (targetClass.campus?.campusName || targetClass.campus?.campusCode || targetClass.campus?.name) {
      const rawCampus = targetClass.campus.campusName || targetClass.campus.campusCode || targetClass.campus.name
      if (rawCampus === "CS1") campusName = "Cơ sở 1 (CS1 - Riverside Campus)"
      else if (rawCampus === "CS2") campusName = "Cơ sở 2 (CS2 - Central Campus)"
      else if (rawCampus === "CS3") campusName = "Cơ sở 3 (CS3 - International Campus)"
      else if (rawCampus === "CS4") campusName = "Cơ sở 4 (CS4 - Sky-Line School)"
      else if (rawCampus === "CS5") campusName = "Cơ sở 5 (CS5 - Sky-Line School)"
      else campusName = rawCampus.startsWith("Cơ sở") ? rawCampus : "Cơ sở " + rawCampus
    } else {
      const codeMatch = className.match(/CS\d+/i)
      if (codeMatch) {
        campusName = "Cơ sở " + codeMatch[0].toUpperCase()
      } else {
        campusName = "Hệ thống Giáo dục Sky-Line"
      }
    }
    const students = targetClass.students || []

    const studentIds = students.map(s => s.id)

    // 2. Fetch Real Advisory Data safely
    const [goals, trackingLogs, consultations, termEvals] = await Promise.all([
      ((prisma as any).studentGoal?.findMany ? (prisma as any).studentGoal.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { createdAt: "asc" }
      }) : Promise.resolve([])).catch(() => []),
      ((prisma as any).studentGoalTrackingLog?.findMany ? (prisma as any).studentGoalTrackingLog.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { createdAt: "desc" }
      }) : Promise.resolve([])).catch(() => []),
      ((prisma as any).academicConsultationLog?.findMany ? (prisma as any).academicConsultationLog.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { meetingDate: "desc" }
      }) : (prisma as any).studentConsultation?.findMany ? (prisma as any).studentConsultation.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { meetingDate: "desc" }
      }) : Promise.resolve([])).catch(() => []),
      ((prisma as any).studentTermEvaluation?.findMany ? (prisma as any).studentTermEvaluation.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { createdAt: "desc" }
      }) : Promise.resolve([])).catch(() => [])
    ])

    // Map student name lookup
    const studentMap = new Map<string, string>()
    students.forEach(s => studentMap.set(s.id, s.studentName))

    // 3. Build A4 HTML Layout (Modern Teacher Planner - Navy & Teal)
    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Sổ Quan Sát GVCN - ${className} - ${academicYearName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
      @bottom-right {
        content: "Trang " counter(page) " / " counter(pages);
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 9pt;
        font-weight: 600;
        color: #64748B;
      }
      @bottom-left {
        content: "Sky-Line Education System • Sổ Quan Sát Cố Vấn Học Tập";
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 9pt;
        font-weight: 600;
        color: #64748B;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.45;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
    }

    .page {
      page-break-after: always;
      position: relative;
      min-height: 270mm;
      padding-bottom: 10mm;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* COLOR PALETTE */
    .bg-navy { background-color: #002060; color: #FFFFFF; }
    .bg-teal { background-color: #008080; color: #FFFFFF; }
    .bg-slate-light { background-color: #F8FAFC; }
    .text-navy { color: #002060; }
    .text-teal { color: #008080; }
    .border-navy { border-color: #002060; }
    .border-teal { border-color: #008080; }

    /* COVER PAGE DESIGN */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 265mm;
      border: 3px solid #002060;
      padding: 15mm;
      border-radius: 12px;
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
      text-align: center;
    }

    .cover-header {
      border-bottom: 2px solid #008080;
      padding-bottom: 15px;
    }
    .cover-logo {
      font-size: 20pt;
      font-weight: 900;
      letter-spacing: 2px;
      color: #002060;
      text-transform: uppercase;
    }
    .cover-sublogo {
      font-size: 10pt;
      font-weight: 700;
      color: #008080;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .cover-body {
      margin: 30px 0;
    }
    .cover-title {
      font-size: 24pt;
      font-weight: 900;
      color: #002060;
      text-transform: uppercase;
      line-height: 1.25;
      margin-bottom: 10px;
    }
    .cover-subtitle {
      font-size: 13pt;
      font-weight: 700;
      color: #008080;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-badge-box {
      display: inline-block;
      background: #002060;
      color: #FFFFFF;
      padding: 12px 30px;
      border-radius: 50px;
      font-size: 14pt;
      font-weight: 800;
      margin-top: 25px;
      box-shadow: 0 4px 10px rgba(0, 32, 96, 0.2);
    }

    .cover-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      text-align: left;
      background: #FFFFFF;
      padding: 20px;
      border-radius: 12px;
      border: 1.5px solid #CBD5E1;
    }
    .cover-info-item {
      font-size: 10.5pt;
    }
    .cover-info-label {
      font-weight: 800;
      color: #002060;
      display: block;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .cover-info-val {
      font-weight: 700;
      color: #0F172A;
    }

    /* SECTION HEADERS */
    .sec-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #002060;
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .sec-title {
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sec-subtitle {
      font-size: 9pt;
      font-weight: 600;
      opacity: 0.9;
    }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9.5pt;
    }
    th {
      background-color: #002060;
      color: #FFFFFF;
      font-weight: 800;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #002060;
      font-size: 9pt;
      text-transform: uppercase;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #CBD5E1;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #F8FAFC;
    }

    .badge-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 8.5pt;
      font-weight: 800;
    }
    .badge-tien-trien { background: #FEF3C7; color: #78350F; border: 1px solid #FCD34D; }
    .badge-dat { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; }
    .badge-chua-dat { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .badge-chua-danh-gia { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }

    /* CARD CONTAINERS */
    .info-card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-card {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 12px 15px;
      background: #FFFFFF;
    }
    .info-card-title {
      font-size: 10pt;
      font-weight: 800;
      color: #008080;
      text-transform: uppercase;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .info-card-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }

    .blank-row-box {
      height: 28px;
    }

    /* FOOTER BAR FOR PRINT */
    .print-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748B;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
    }

    @media print {
      .page { page-break-after: always; }
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- ==================== BÌA SỔ (COVER PAGE) ==================== -->
  <div class="page">
    <div class="cover-page">
      <div class="cover-header">
        <div class="cover-logo">SKY-LINE EDUCATION SYSTEM</div>
        <div class="cover-sublogo">HỆ THỐNG GIÁO DỤC CHẤT LƯỢNG CAO SKY-LINE</div>
      </div>

      <div class="cover-body">
        <div class="cover-subtitle">HỒ SƠ QUẢN LÝ CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI</div>
        <div class="cover-title">SỔ QUAN SÁT GVCN</div>
        <div class="cover-subtitle">PROFESSIONAL TEACHER OBSERVATION PLANNER</div>

        <div class="cover-badge-box">LỚP: ${className}</div>
      </div>

      <div class="cover-info-grid">
        <div class="cover-info-item">
          <span class="cover-info-label">Giáo viên chủ nhiệm (GVCN)</span>
          <span class="cover-info-val">${gvcnName}</span>
        </div>
        <div class="cover-info-item">
          <span class="cover-info-label">Năm học</span>
          <span class="cover-info-val">${academicYearName}</span>
        </div>
        <div class="cover-info-item">
          <span class="cover-info-label">Cơ sở trường học</span>
          <span class="cover-info-val">${campusName}</span>
        </div>
        <div class="cover-info-item">
          <span class="cover-info-label">Tổng sĩ số học sinh</span>
          <span class="cover-info-val">${students.length} Học sinh</span>
        </div>
      </div>

      <div class="print-footer">
        <span>Sky-Line Education System</span>
        <span>Phát hành sử dụng chính thức</span>
      </div>
    </div>
  </div>

  <!-- ==================== TRANG 1: THÔNG TIN LỚP & GVCN ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">1. Thông Tin Lớp Học & Giáo Viên Cố Vấn (GVCN)</span>
      <span class="sec-subtitle">Lớp ${className} - AY ${academicYearName}</span>
    </div>

    <div class="info-card-grid">
      <div class="info-card">
        <div class="info-card-title">📌 Thông Tin Tổng Quan Lớp</div>
        <div class="info-card-row"><span>Tên Lớp:</span> <strong>${className}</strong></div>
        <div class="info-card-row"><span>Khối lớp:</span> <strong>Khối ${targetClass.grade || ""}</strong></div>
        <div class="info-card-row"><span>Tổng sĩ số:</span> <strong>${students.length} HS</strong></div>
        <div class="info-card-row"><span>Cơ sở:</span> <strong>${campusName}</strong></div>
        <div class="info-card-row"><span>Năm học:</span> <strong>${academicYearName}</strong></div>
      </div>

      <div class="info-card">
        <div class="info-card-title">👨‍🏫 Thông Tin GVCN / Cố Vấn Học Tập</div>
        <div class="info-card-row"><span>Họ và Tên:</span> <strong>${gvcnName}</strong></div>
        <div class="info-card-row"><span>Email liên hệ:</span> <strong>${gvcnEmail}</strong></div>
        <div class="info-card-row"><span>Số điện thoại:</span> <strong>${gvcnPhone}</strong></div>
        <div class="info-card-row"><span>Chức vụ:</span> <strong>Giáo viên Chủ nhiệm (GVCN)</strong></div>
      </div>
    </div>

    <div style="margin-top: 10px;">
      <h4 style="color: #002060; font-size: 10pt; text-transform: uppercase; margin-bottom: 6px; font-weight: 800;">
        👥 BAN CÁN SỰ LỚP & BAN ĐẠI DIỆN CHA MẸ HỌC SINH
      </h4>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Chức vụ</th>
            <th style="width: 35%;">Họ và Tên</th>
            <th style="width: 20%;">Số điện thoại</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Lớp trưởng</td><td>........................................................</td><td>................................</td><td>................................</td></tr>
          <tr><td>Lớp phó Học tập</td><td>........................................................</td><td>................................</td><td>................................</td></tr>
          <tr><td>Lớp phó Kỷ luật / Đời sống</td><td>........................................................</td><td>................................</td><td>................................</td></tr>
          <tr><td>Trưởng Ban ĐD CMHS Lớp</td><td>........................................................</td><td>................................</td><td>................................</td></tr>
          <tr><td>Phó Ban ĐD CMHS Lớp</td><td>........................................................</td><td>................................</td><td>................................</td></tr>
        </tbody>
      </table>
    </div>

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 2: DANH SÁCH HỌC SINH ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">2. Danh Sách Học Sinh Lớp ${className}</span>
      <span class="sec-subtitle">Sĩ số: ${students.length} Học sinh</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">STT</th>
          <th style="width: 13%;">Mã HS</th>
          <th style="width: 25%;">Họ và Tên Học sinh</th>
          <th style="width: 10%; text-align: center;">Ngày sinh</th>
          <th style="width: 8%; text-align: center;">Giới tính</th>
          <th style="width: 18%;">Họ tên Phụ huynh</th>
          <th style="width: 12%;">SĐT Liên hệ</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((st, i) => `
          <tr>
            <td style="text-align: center; font-weight: 700;">${i + 1}</td>
            <td style="font-weight: 800; color: #002060;">${st.studentCode || "N/A"}</td>
            <td style="font-weight: 700;">${st.studentName}</td>
            <td style="text-align: center;">${formatVNDate(st.dateOfBirth)}</td>
            <td style="text-align: center;">${st.gender || "Nam"}</td>
            <td>${st.parentName || "Chưa cập nhật"}</td>
            <td>${st.parentPhone || "Chưa cập nhật"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 3: NHẬT KÝ QUAN SÁT ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">3. Nhật Ký Quan Sát & Theo Dõi Nếp Sống Học Sinh</span>
      <span class="sec-subtitle">Lớp ${className}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 8%; text-align: center;">Tháng</th>
          <th style="width: 22%;">Nếp sống & Kỷ luật</th>
          <th style="width: 35%;">Sự tiến bộ & Biểu hiện nổi bật</th>
          <th style="width: 35%;">Biện pháp uốn nắn & Hỗ trợ của GVCN</th>
        </tr>
      </thead>
      <tbody>
        ${["Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"].map(m => `
          <tr>
            <td style="text-align: center; font-weight: 800; color: #002060;">${m}</td>
            <td><div class="blank-row-box"></div></td>
            <td><div class="blank-row-box"></div></td>
            <td><div class="blank-row-box"></div></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 4: NHẬT KÝ THAM VẤN / TRAO ĐỔI ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">4. Nhật Ký Tham Vấn & Trao Đổi Cố Vấn Học Tập</span>
      <span class="sec-subtitle">Dữ liệu trao đổi 1-1 thực tế</span>
    </div>

    ${consultations.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Ngày gặp</th>
            <th style="width: 20%;">Học sinh</th>
            <th style="width: 30%;">Nội dung trao đổi / Vấn đề</th>
            <th style="width: 23%;">Khó khăn & Giải pháp hỗ trợ</th>
            <th style="width: 15%;">Deadline / Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${consultations.map(c => `
            <tr>
              <td style="font-weight: 700; color: #002060;">${formatVNDate(c.meetingDate)}</td>
              <td style="font-weight: 800;">${studentMap.get(c.studentId) || "Học sinh"}</td>
              <td>${c.content || "N/A"}</td>
              <td>${c.difficulties ? `<strong>Khó khăn:</strong> ${c.difficulties}<br/>` : ""}${c.nextActions ? `<strong>Biện pháp:</strong> ${c.nextActions}` : "Chưa có"}</td>
              <td>${c.deadline ? `<strong>Hạn:</strong> ${formatVNDate(c.deadline)}<br/>` : ""}${c.notes || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `
      <p style="font-style: italic; color: #64748B; margin-bottom: 15px;">Chưa có nhật ký tham vấn trực tuyến ghi nhận trong CSDL. Bên dưới là biểu mẫu kẻ sẵn phục vụ GVCN ghi chép thực tế:</p>
      <table>
        <thead>
          <tr>
            <th style="width: 12%;">Ngày gặp</th>
            <th style="width: 20%;">Học sinh</th>
            <th style="width: 33%;">Nội dung trao đổi / Vấn đề</th>
            <th style="width: 23%;">Giải pháp & Phân công</th>
            <th style="width: 12%;">Ký tên</th>
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `
            <tr>
              <td><div style="height: 24px;"></div></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 5: THEO DÕI MỤC TIÊU CÁ NHÂN ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">5. Theo Dõi Mục Tiêu Cá Nhân Của Học Sinh</span>
      <span class="sec-subtitle">4 Nhóm mục tiêu cốt lõi</span>
    </div>

    ${trackingLogs.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width: 20%;">Học sinh</th>
            <th style="width: 22%;">Nhóm mục tiêu</th>
            <th style="width: 38%;">Nội dung mục tiêu cá nhân</th>
            <th style="width: 20%; text-align: center;">Mức độ đạt</th>
          </tr>
        </thead>
        <tbody>
          ${trackingLogs.slice(0, 15).map(t => {
            const stName = studentMap.get(t.studentId) || "Học sinh"
            const statusClass = t.progressStatus === "DAT" || t.progressStatus === "HOAN_THANH" ? "badge-dat"
              : t.progressStatus === "CHUA_DAT" ? "badge-chua-dat"
              : t.progressStatus === "CAN_CO_GANG" ? "badge-tien-trien"
              : t.progressStatus === "TIEN_TRIEN" ? "badge-tien-trien" : "badge-chua-danh-gia"
            const statusText = t.progressStatus === "DAT" || t.progressStatus === "HOAN_THANH" ? "🟢 Đạt"
              : t.progressStatus === "CHUA_DAT" ? "🔴 Chưa đạt"
              : t.progressStatus === "CAN_CO_GANG" ? "🟠 Cần cố gắng"
              : t.progressStatus === "TIEN_TRIEN" ? "🟡 Đang tiến triển" : "⚪ Chưa đánh giá"
            return `
              <tr>
                <td style="font-weight: 800; color: #002060;">${stName}</td>
                <td style="font-weight: 700;">${t.category}</td>
                <td>${t.targetText}</td>
                <td style="text-align: center;"><span class="badge-status ${statusClass}">${statusText}</span></td>
              </tr>
            `
          }).join("")}
        </tbody>
      </table>
    ` : `
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Học sinh</th>
            <th style="width: 20%;">Nhóm mục tiêu</th>
            <th style="width: 40%;">Nội dung mục tiêu cá nhân</th>
            <th style="width: 18%; text-align: center;">Mức độ đạt</th>
          </tr>
        </thead>
        <tbody>
          ${students.slice(0, 10).map(s => `
            <tr>
              <td style="font-weight: 700;">${s.studentName}</td>
              <td style="font-size: 8.5pt;">1. Mục tiêu học tập 📚</td>
              <td><div style="height: 18px;"></div></td>
              <td style="text-align: center;"><span class="badge-status badge-chua-danh-gia">⚪ Chưa đánh giá</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 6: RUBRIC ĐÁNH GIÁ THANG 1 - 5 ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">6. Bảng Đánh Giá Kỳ Theo Rubric (Thang 1 - 5)</span>
      <span class="sec-subtitle">Đánh giá 3 tiêu chí cốt lõi</span>
    </div>

    ${termEvals.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th style="width: 22%;">Học sinh</th>
            <th style="width: 10%; text-align: center;">Kỳ</th>
            <th style="width: 18%; text-align: center;">Hoàn thành MT (1-5)</th>
            <th style="width: 18%; text-align: center;">Chủ động (1-5)</th>
            <th style="width: 18%; text-align: center;">Thái độ (1-5)</th>
            <th style="width: 14%;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${termEvals.map(ev => `
            <tr>
              <td style="font-weight: 800; color: #002060;">${studentMap.get(ev.studentId) || "Học sinh"}</td>
              <td style="text-align: center; font-weight: 700;">${ev.term}</td>
              <td style="text-align: center; font-weight: 800; color: #008080;">Mức ${ev.goalCompletionLevel || 0}/5</td>
              <td style="text-align: center; font-weight: 800; color: #008080;">Mức ${ev.initiativeLevel || 0}/5</td>
              <td style="text-align: center; font-weight: 800; color: #008080;">Mức ${ev.participationAttitude || 0}/5</td>
              <td style="font-size: 8.5pt;">${ev.recommendations || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `
      <p style="font-style: italic; color: #64748B; margin-bottom: 10px;">Chưa có dữ liệu đánh giá kỳ trực tuyến. Bảng bên dưới ghi nhận đánh giá của GVCN:</p>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Học sinh</th>
            <th style="width: 10%; text-align: center;">Kỳ</th>
            <th style="width: 20%; text-align: center;">Hoàn thành MT (1-5)</th>
            <th style="width: 20%; text-align: center;">Mức độ chủ động (1-5)</th>
            <th style="width: 25%; text-align: center;">Thái độ tham gia (1-5)</th>
          </tr>
        </thead>
        <tbody>
          ${students.slice(0, 10).map(s => `
            <tr>
              <td style="font-weight: 700;">${s.studentName}</td>
              <td style="text-align: center;">HK I</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">-</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}

    <div style="margin-top: 15px; background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 12px;">
      <h4 style="color: #002060; font-size: 9.5pt; text-transform: uppercase; margin-bottom: 6px; font-weight: 800;">
        💡 KHUNG MÔ TẢ RUBRIC CHUẨN (THANG ĐIỂM 1 - 5)
      </h4>
      <p style="font-size: 8.5pt; color: #334155; line-height: 1.5;">
        • <strong>Mức 1:</strong> Hầu như không đạt mục tiêu / Thụ động / Từ chối hợp tác.<br/>
        • <strong>Mức 2:</strong> Đạt một phần nhỏ / Ít chủ động, cần nhắc nhở / Tham gia miễn cưỡng.<br/>
        • <strong>Mức 3:</strong> Đạt khoảng một nửa / Chủ động trung bình / Tham gia đầy đủ nhưng dẻ dặt.<br/>
        • <strong>Mức 4:</strong> Đạt phần lớn mục tiêu / Khá chủ động tự thực hiện / Tham gia tích cực cởi mở.<br/>
        • <strong>Mức 5:</strong> Đạt đầy đủ hoặc vượt mục tiêu / Rất chủ động đề xuất / Rất tích cực đóng góp.
      </p>
    </div>

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

  <!-- ==================== TRANG 7: ĐÁNH GIÁ HỌC KỲ & TỔNG KẾT CUỐI NĂM ==================== -->
  <div class="page">
    <div class="sec-header">
      <span class="sec-title">7. Tổng Kết & Đánh Giá Cuối Năm Học ${academicYearName}</span>
      <span class="sec-subtitle">Lớp ${className}</span>
    </div>

    <div class="info-card-grid">
      <div class="info-card">
        <div class="info-card-title">🏆 TỔNG KẾT TÌNH HÌNH RÈN LUYỆN KỶ LUẬT</div>
        <p style="font-size: 9pt; color: #475569; line-height: 1.6;">
          • Duy trì tốt nếp sống văn hóa Sky-Line.<br/>
          • Tỷ lệ chuyên cần đạt chuẩn.<br/>
          • Thực hiện nghiêm túc nội quy trường lớp và cam kết cá nhân.
        </p>
      </div>

      <div class="info-card">
        <div class="info-card-title">🚀 ĐỊNH HƯỚNG PHÁT TRIỂN NĂM HỌC TIẾP THEO</div>
        <p style="font-size: 9pt; color: #475569; line-height: 1.6;">
          • Tiếp tục phát huy thế mạnh cá nhân.<br/>
          • Tăng cường kỹ năng tự học và tinh thần chủ động.<br/>
          • Tích cực tham gia các hoạt động trải nghiệm & câu lạc bộ.
        </p>
      </div>
    </div>

    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: center;">
      <div>
        <p style="font-size: 9.5pt; font-weight: 700; color: #002060;">XÁC NHẬN CỦA BGH TRƯỜNG</p>
        <p style="font-size: 8.5pt; color: #64748B; font-style: italic;">(Ký và ghi rõ họ tên)</p>
        <div style="height: 70px;"></div>
      </div>
      <div>
        <p style="font-size: 9.5pt; font-weight: 700; color: #002060;">GIÁO VIÊN CHỦ NHIỆM (GVCN)</p>
        <p style="font-size: 8.5pt; color: #64748B; font-style: italic;">(Ký và ghi rõ họ tên)</p>
        <div style="height: 70px;"></div>
        <p style="font-size: 10pt; font-weight: 800; color: #002060;">${gvcnName}</p>
      </div>
    </div>

    <div class="print-footer">
      <span>Sky-Line Education System • Sổ Quan Sát GVCN</span>
      <span>Lớp ${className}</span>
    </div>
  </div>

</body>
</html>`

    return new Response(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    })
  } catch (error: any) {
    console.error("GET /api/advisory/export-observation-book error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
