import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

function formatVNDate(d?: Date | string | null) {
  if (!d) return "—"
  try {
    const dateObj = new Date(d)
    if (isNaN(dateObj.getTime())) return String(d)
    return dateObj.toLocaleDateString("vi-VN")
  } catch {
    return String(d)
  }
}

function resolveGrade(grade?: string | null, className?: string | null): string {
  if (grade && !isNaN(Number(grade))) return String(Number(grade))
  if (className) {
    const match = className.match(/^(\d+)/)
    if (match) return String(Number(match[1]))
  }
  return ""
}

export async function GET(req: Request) {
  try {
    const session = await auth().catch(() => null)
    if (!session?.user) {
      return new Response("<h3 style='font-family:sans-serif;padding:20px;color:red;'>Vui lòng đăng nhập hệ thống để xem báo cáo.</h3>", {
        status: 401,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }

    const { searchParams } = new URL(req.url)
    const classId = searchParams.get("classId") || ""
    const teacherId = searchParams.get("teacherId") || ""
    const teacherNameQuery = (searchParams.get("teacherName") || "").trim()
    let academicYearId = searchParams.get("academicYearId") || ""
    const campusId = searchParams.get("campusId") || ""
    const gradesParam = (searchParams.get("grades") || searchParams.get("grade") || "").trim()
    const autoPrint = searchParams.get("autoPrint") === "true"
    const mode = searchParams.get("mode") || "single" // "single" | "all"

    // 1. Resolve Academic Year
    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) academicYearId = activeYear.id
    }
    const currentAcademicYear = academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: academicYearId } }).catch(() => null)
      : null
    const academicYearName = currentAcademicYear?.name || "2024-2025"

    // 2. Query Target Classes
    const classWhere: any = {
      NOT: [
        { level: "Mam non" },
        { level: "Mầm non" },
        { level: "MAM_NON" },
        { level: "Preschool" },
        { level: "PRESCHOOL" },
        { className: { contains: "Mầm" } },
        { className: { contains: "mầm" } },
        { className: { contains: "Mam" } },
        { className: { contains: "mam" } },
        { grade: "MAM" },
        { grade: "CHOI" },
        { grade: "LA" },
        { grade: "NHA_TRE" },
        { grade: "MAM_NON" }
      ]
    }

    if (academicYearId) {
      classWhere.academicYearId = academicYearId
    }
    if (campusId) {
      classWhere.campusId = campusId
    }
    if (classId && mode !== "all") {
      classWhere.id = classId
    }

    let targetClasses = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true,
        academicYear: true,
        teachers: {
          include: { teacher: true }
        },
        students: {
          where: { status: "ACTIVE" },
          orderBy: { studentName: "asc" }
        }
      },
      orderBy: { className: "asc" }
    })

    if (gradesParam) {
      const selectedGrades = gradesParam.split(",").map(g => g.trim().replace(/^[kK]/, "")).filter(Boolean)
      if (selectedGrades.length > 0) {
        targetClasses = targetClasses.filter(c => {
          const g = resolveGrade(c.grade, c.className)
          return selectedGrades.includes(g)
        })
      }
    }

    if (!targetClasses || targetClasses.length === 0) {
      return new Response("<h3 style='font-family:sans-serif;padding:30px;color:#002060;'>Không tìm thấy lớp học phù hợp với điều kiện yêu cầu.</h3>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }

    // 3. Resolve Teachers & Teacher-Class Map
    const allTeachers = await prisma.teacher.findMany({
      select: {
        id: true,
        teacherName: true,
        email: true,
        phone: true,
        homeroomClass: true
      }
    }).catch(() => [])

    const teacherMap: Record<string, any> = {}
    allTeachers.forEach(t => {
      teacherMap[t.id] = t
      if (t.homeroomClass) teacherMap[t.homeroomClass] = t
    })

    // Filter by teacherId or teacherName if specified
    if (teacherId && teacherId !== "all" && mode !== "all") {
      targetClasses = targetClasses.filter(cls => {
        if (cls.homeroomTeacherId === teacherId) return true
        if (cls.teachers?.some((t: any) => t.teacherId === teacherId)) return true
        const homeroomT = teacherMap[cls.className]
        if (homeroomT && homeroomT.id === teacherId) return true
        return false
      })
    } else if (teacherNameQuery && mode !== "all") {
      const nameLow = teacherNameQuery.toLowerCase()
      targetClasses = targetClasses.filter(cls => {
        let tName = ""
        if (cls.homeroomTeacherId && teacherMap[cls.homeroomTeacherId]) {
          tName = teacherMap[cls.homeroomTeacherId].teacherName
        } else if (cls.teachers && cls.teachers.length > 0) {
          tName = cls.teachers[0].teacher?.teacherName || ""
        } else if (teacherMap[cls.className]) {
          tName = teacherMap[cls.className].teacherName
        }
        return tName.toLowerCase().includes(nameLow)
      })
    }

    if (targetClasses.length === 0) {
      return new Response("<h3 style='font-family:sans-serif;padding:30px;color:#002060;'>Không tìm thấy giáo viên phụ trách hoặc lớp phụ trách tương ứng.</h3>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }

    // 4. Collect All Students and Consultation Logs for the classes
    const allClassStudentIds: string[] = []
    const allClassStudentCodes: string[] = []

    targetClasses.forEach(cls => {
      cls.students.forEach(st => {
        allClassStudentIds.push(st.id)
        if (st.studentCode) allClassStudentCodes.push(st.studentCode)
      })
    })

    const relatedStudentRecords = allClassStudentCodes.length > 0
      ? await prisma.student.findMany({
          where: { studentCode: { in: allClassStudentCodes } },
          select: { id: true, studentCode: true }
        }).catch(() => [])
      : []

    const completeStudentIds = Array.from(new Set([
      ...allClassStudentIds,
      ...relatedStudentRecords.map(s => s.id)
    ]))

    const studentIdToCodeMap: Record<string, string> = {}
    relatedStudentRecords.forEach(s => { studentIdToCodeMap[s.id] = s.studentCode })
    targetClasses.forEach(c => c.students.forEach(s => { if (s.studentCode) studentIdToCodeMap[s.id] = s.studentCode }))

    let rawConsultationLogs: any[] = []
    if (completeStudentIds.length > 0) {
      rawConsultationLogs = await prisma.academicConsultationLog.findMany({
        where: {
          studentId: { in: completeStudentIds },
          ...(academicYearId ? { academicYearId } : {})
        },
        include: {
          student: {
            select: { id: true, studentCode: true, studentName: true }
          },
          teacher: {
            select: { id: true, teacherName: true, email: true, phone: true }
          }
        },
        orderBy: { meetingDate: "desc" }
      }).catch(() => [])
    }

    // Exclude exam survey feedback logs
    const consultationLogs = rawConsultationLogs.filter(log => {
      const notes = (log.notes || "").toLowerCase()
      const content = (log.content || "").toLowerCase()
      const isGradeExchange = notes.includes("[gradeperiod:") ||
                             notes.includes("trao đổi giữa gvcn và phhs về kết quả khảo sát") ||
                             (content.startsWith("ý kiến gvcn:") && notes.includes("khảo sát"))
      return !isGradeExchange
    })

    const studentLogsMap: Record<string, any[]> = {}
    consultationLogs.forEach(log => {
      const sid = log.studentId
      const scode = log.student?.studentCode || studentIdToCodeMap[sid]
      if (sid) {
        if (!studentLogsMap[sid]) studentLogsMap[sid] = []
        studentLogsMap[sid].push(log)
      }
      if (scode && scode !== sid) {
        if (!studentLogsMap[scode]) studentLogsMap[scode] = []
        studentLogsMap[scode].push(log)
      }
    })

    // 5. Build Teacher Sections
    const teacherSections = targetClasses.map(cls => {
      let gvcnName = ""
      let gvcnPhone = ""
      let gvcnEmail = ""

      if (cls.homeroomTeacherId && teacherMap[cls.homeroomTeacherId]) {
        const t = teacherMap[cls.homeroomTeacherId]
        gvcnName = t.teacherName
        gvcnPhone = t.phone || ""
        gvcnEmail = t.email || ""
      }
      if (!gvcnName && cls.teachers && cls.teachers.length > 0) {
        const gAss = cls.teachers.find((t: any) => t.isGVCN || t.role === "GVCN" || t.roleInClass === "GVCN") || cls.teachers[0]
        if (gAss?.teacher) {
          gvcnName = gAss.teacher.teacherName || ""
          gvcnPhone = gAss.teacher.phone || ""
          gvcnEmail = gAss.teacher.email || ""
        }
      }
      if (!gvcnName && teacherMap[cls.className]) {
        const t = teacherMap[cls.className]
        gvcnName = t.teacherName
        gvcnPhone = t.phone || ""
        gvcnEmail = t.email || ""
      }
      if (!gvcnName) {
        gvcnName = "Giáo viên Chủ nhiệm"
      }

      const campusName = cls.campus?.campusName || cls.campus?.campusCode || "Hệ thống Sky-Line"
      const gradeStr = resolveGrade(cls.grade, cls.className) ? `Khối ${resolveGrade(cls.grade, cls.className)}` : (cls.grade || "Khối")

      // Process students of this class
      const classStudents = (cls.students || []).map(st => {
        const logs = studentLogsMap[st.id] || (st.studentCode ? studentLogsMap[st.studentCode] : null) || []
        const isConsulted = logs.length > 0
        const latestLog = logs[0] || null
        return {
          id: st.id,
          studentCode: st.studentCode || "—",
          studentName: st.studentName,
          gender: st.gender || "Nam",
          dateOfBirth: st.dateOfBirth,
          isConsulted,
          sessionCount: logs.length,
          latestMeetingDate: latestLog ? latestLog.meetingDate : null,
          latestCounselor: latestLog?.teacher?.teacherName || gvcnName,
          logs
        }
      })

      const totalStudents = classStudents.length
      const consultedCount = classStudents.filter(s => s.isConsulted).length
      const unconsultedCount = totalStudents - consultedCount
      const consultedPercent = totalStudents > 0 ? Math.round((consultedCount / totalStudents) * 1000) / 10 : 0
      const totalSessions = classStudents.reduce((acc, s) => acc + s.sessionCount, 0)

      // Collect all logs for this class
      const classLogs: any[] = []
      classStudents.forEach(st => {
        st.logs.forEach(l => {
          classLogs.push({
            ...l,
            studentName: st.studentName,
            studentCode: st.studentCode
          })
        })
      })
      classLogs.sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())

      return {
        classId: cls.id,
        className: cls.className,
        gradeStr,
        campusName,
        gvcnName,
        gvcnPhone,
        gvcnEmail,
        academicYearName,
        totalStudents,
        consultedCount,
        unconsultedCount,
        consultedPercent,
        totalSessions,
        students: classStudents,
        classLogs
      }
    })

    const currentDateStr = new Date().toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })

    // 6. Generate Complete Executive HTML Template
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Tiến Độ Tư Vấn Cố Vấn Học Tập - Giáo Viên Phụ Trách</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
      @bottom-right {
        content: "Trang " counter(page) " / " counter(pages);
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 8pt;
        font-weight: 600;
        color: #64748B;
      }
      @bottom-left {
        content: "Sky-Line Education System • Báo Cáo Cố Vấn Học Tập";
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 8pt;
        font-weight: 600;
        color: #64748B;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      background: #E2E8F0;
      line-height: 1.45;
      font-size: 9.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Screen Top Toolbar (Hidden on print) */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #002060;
      color: #FFFFFF;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      border-bottom: 2px solid #008080;
    }
    .screen-toolbar-title {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-action {
      background: #008080;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 10pt;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: #006666;
      transform: translateY(-1px);
    }
    .btn-close {
      background: #475569;
      color: #FFFFFF;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 10pt;
      cursor: pointer;
      margin-left: 8px;
    }

    .report-wrapper {
      max-width: 210mm;
      margin: 20px auto;
      background: #FFFFFF;
    }

    .teacher-document {
      page-break-after: always;
      position: relative;
      background: #FFFFFF;
      padding: 12mm 14mm 16mm 14mm;
      box-shadow: 0 0 20px rgba(0,0,0,0.05);
      margin-bottom: 25px;
    }
    .teacher-document:last-child {
      page-break-after: avoid;
      margin-bottom: 0;
    }

    /* HEADER BLOCK */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border-bottom: 2.5px solid #002060;
      padding-bottom: 8px;
    }
    .header-logo-text {
      font-size: 14pt;
      font-weight: 900;
      color: #002060;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-subtext {
      font-size: 8pt;
      color: #008080;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
      font-size: 8pt;
      color: #475569;
    }
    .header-meta strong {
      color: #002060;
    }

    /* REPORT TITLE */
    .report-title-box {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .report-main-title {
      font-size: 15pt;
      font-weight: 900;
      color: #002060;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-subtitle {
      font-size: 10pt;
      font-weight: 700;
      color: #008080;
      margin-top: 3px;
      text-transform: uppercase;
    }

    /* TEACHER INFO CARD */
    .teacher-profile-card {
      border: 1.5px solid #CBD5E1;
      border-radius: 10px;
      padding: 12px 16px;
      background: #F8FAFC;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 15px;
    }
    .profile-item {
      margin-bottom: 5px;
      font-size: 9pt;
    }
    .profile-label {
      color: #64748B;
      font-weight: 700;
      display: inline-block;
      min-width: 140px;
    }
    .profile-value {
      font-weight: 800;
      color: #002060;
    }
    .profile-value-highlight {
      color: #008080;
      font-weight: 900;
      font-size: 10pt;
    }

    /* KPI METRICS GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      background: #FFFFFF;
    }
    .kpi-card-total { border-color: #CBD5E1; }
    .kpi-card-done { border-color: #86EFAC; background: #F0FDF4; }
    .kpi-card-pending { border-color: #FCA5A5; background: #FEF2F2; }
    .kpi-card-sessions { border-color: #DDD6FE; background: #F5F3FF; }
    .kpi-number {
      font-size: 14pt;
      font-weight: 900;
      margin: 2px 0;
    }
    .kpi-label {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* PROGRESS BAR */
    .progress-box {
      margin-bottom: 16px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
    }
    .progress-head {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      font-weight: 800;
      margin-bottom: 5px;
      color: #002060;
    }
    .progress-bar-bg {
      width: 100%;
      height: 9px;
      background: #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 5px;
      transition: width 0.3s;
    }

    /* SECTION TITLE */
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #002060;
      text-transform: uppercase;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 4px solid #008080;
      padding-left: 8px;
    }

    /* TABLES */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 8.5pt;
    }
    table.data-table th {
      background-color: #002060;
      color: #FFFFFF;
      font-weight: 800;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #002060;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.data-table td {
      padding: 5.5px 8px;
      border: 1px solid #CBD5E1;
      vertical-align: top;
    }
    table.data-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }

    .badge-status {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 7.5pt;
      font-weight: 800;
      text-align: center;
    }
    .badge-done { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; }
    .badge-pending { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }

    /* SIGNATURE BLOCK */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .sign-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: top;
      border: none;
      padding: 0 10px;
    }
    .sign-role {
      font-size: 9pt;
      font-weight: 800;
      color: #002060;
      text-transform: uppercase;
    }
    .sign-note {
      font-size: 7.5pt;
      color: #64748B;
      font-style: italic;
      margin-top: 2px;
    }
    .sign-space {
      height: 60px;
    }
    .sign-name {
      font-size: 9.5pt;
      font-weight: 800;
      color: #002060;
    }

    @media print {
      body { background: #FFFFFF; }
      .screen-toolbar { display: none !important; }
      .report-wrapper { max-width: 100%; margin: 0; }
      .teacher-document {
        box-shadow: none;
        padding: 0;
        margin-bottom: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Toolbar for 1-Click Print & PDF Save -->
  <div class="screen-toolbar">
    <div class="screen-toolbar-title">
      <span>📄 BÁO CÁO TIẾN ĐỘ TƯ VẤN — GIÁO VIÊN PHỤ TRÁCH</span>
      <span style="font-size: 9pt; font-weight: normal; background: #003B3A; padding: 3px 10px; border-radius: 12px;">
        ${teacherSections.length} Giáo viên / Lớp
      </span>
    </div>
    <div>
      <button class="btn-action" onclick="window.print()">
        🖨️ In / Lưu file PDF ngay
      </button>
      <button class="btn-close" onclick="window.close()">✕ Đóng tab</button>
    </div>
  </div>

  <div class="report-wrapper">
    ${teacherSections.map(sec => {
      const progressColor = sec.consultedPercent >= 80 ? "#10B981" : sec.consultedPercent >= 40 ? "#F59E0B" : "#EF4444"
      const assessmentText = sec.consultedPercent === 100
        ? "🌟 Xuất sắc: Hoàn thành 100% học sinh phụ trách đã được tư vấn định hướng."
        : sec.consultedPercent >= 80
        ? "🟢 Tiến độ tích cực: Đạt trên 80% chỉ tiêu tư vấn học sinh."
        : sec.consultedPercent >= 50
        ? "🟡 Đang tiến hành: Đã đạt trên 50%, cần tiếp tục gặp gỡ số học sinh còn lại."
        : "🔴 Cần đẩy nhanh: Tiến độ dưới 50%, đề nghị GVCN tích cực bố trí lịch tư vấn đôn đốc học sinh."

      return `
      <div class="teacher-document">
        
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td style="width: 65%;">
              <div class="header-logo-text">SKY-LINE EDUCATION SYSTEM</div>
              <div class="header-subtext">HỆ THỐNG GIÁO DỤC CHẤT LƯỢNG CAO SKY-LINE</div>
            </td>
            <td class="header-meta">
              <div><strong>Năm học:</strong> ${sec.academicYearName}</div>
              <div><strong>Cơ sở:</strong> ${sec.campusName}</div>
              <div><strong>Ngày xuất:</strong> ${currentDateStr}</div>
            </td>
          </tr>
        </table>

        <!-- Title -->
        <div class="report-title-box">
          <div class="report-main-title">BÁO CÁO TIẾN ĐỘ THỰC HIỆN TƯ VẤN CỐ VẤN HỌC TẬP</div>
          <div class="report-subtitle">HỒ SƠ THEO DÕI THEO TỪNG GIÁO VIÊN PHỤ TRÁCH</div>
        </div>

        <!-- Teacher Profile Card -->
        <div class="teacher-profile-card">
          <div>
            <div class="profile-item">
              <span class="profile-label">Giáo viên phụ trách:</span>
              <span class="profile-value-highlight">${sec.gvcnName}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Vai trò chuyên môn:</span>
              <span class="profile-value">Giáo viên Chủ nhiệm & Cố vấn học tập</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Số điện thoại liên hệ:</span>
              <span class="profile-value">${sec.gvcnPhone || "Chưa cập nhật"}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Email công vụ:</span>
              <span class="profile-value">${sec.gvcnEmail || "Chưa cập nhật"}</span>
            </div>
          </div>
          <div>
            <div class="profile-item">
              <span class="profile-label">Lớp phụ trách:</span>
              <span class="profile-value-highlight">${sec.className}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Khối lớp:</span>
              <span class="profile-value">${sec.gradeStr}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Cơ sở trường học:</span>
              <span class="profile-value">${sec.campusName}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Tổng sĩ số học sinh:</span>
              <span class="profile-value">${sec.totalStudents} Học sinh</span>
            </div>
          </div>
        </div>

        <!-- KPI Grid -->
        <div class="kpi-grid">
          <div class="kpi-card kpi-card-total">
            <div class="kpi-label" style="color: #475569;">TỔNG SỐ HỌC SINH</div>
            <div class="kpi-number" style="color: #002060;">${sec.totalStudents}</div>
            <div style="font-size: 7.5pt; color: #64748B;">Sĩ số lớp</div>
          </div>

          <div class="kpi-card kpi-card-done">
            <div class="kpi-label" style="color: #065F46;">ĐÃ HOÀN THÀNH TƯ VẤN</div>
            <div class="kpi-number" style="color: #059669;">${sec.consultedCount} <span style="font-size: 9pt;">(${sec.consultedPercent}%)</span></div>
            <div style="font-size: 7.5pt; color: #047857;">Đã có nhật ký 1-1</div>
          </div>

          <div class="kpi-card kpi-card-pending">
            <div class="kpi-label" style="color: #991B1B;">CHƯA THỰC HIỆN TƯ VẤN</div>
            <div class="kpi-number" style="color: #DC2626;">${sec.unconsultedCount}</div>
            <div style="font-size: 7.5pt; color: #B91C1C;">Cần bố trí gặp gỡ</div>
          </div>

          <div class="kpi-card kpi-card-sessions">
            <div class="kpi-label" style="color: #6D28D9;">TỔNG SỐ PHIÊN GẶP</div>
            <div class="kpi-number" style="color: #7C3AED;">${sec.totalSessions}</div>
            <div style="font-size: 7.5pt; color: #6D28D9;">Lượt phiên tư vấn</div>
          </div>
        </div>

        <!-- Progress Bar & Assessment -->
        <div class="progress-box">
          <div class="progress-head">
            <span>TỶ LỆ HOÀN THÀNH TƯ VẤN CỦA GIÁO VIÊN:</span>
            <span style="color: ${progressColor}; font-size: 9.5pt;">${sec.consultedPercent}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${Math.min(sec.consultedPercent, 100)}%; background: ${progressColor};"></div>
          </div>
          <div style="font-size: 8pt; font-weight: 700; color: #334155; margin-top: 5px;">
            ${assessmentText}
          </div>
        </div>

        <!-- Section 1: Detailed Student Tracking Table -->
        <div class="section-title">
          1. Danh Sách Theo Dõi Tiến Độ Tư Vấn Học Sinh Lớp ${sec.className} (${sec.totalStudents} HS)
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 4%; text-align: center;">STT</th>
              <th style="width: 12%;">Mã HS</th>
              <th style="width: 24%;">Họ và tên học sinh</th>
              <th style="width: 8%; text-align: center;">Giới tính</th>
              <th style="width: 11%; text-align: center;">Ngày sinh</th>
              <th style="width: 16%; text-align: center;">Trạng thái tư vấn</th>
              <th style="width: 11%; text-align: center;">Ngày gần nhất</th>
              <th style="width: 14%;">Người tư vấn</th>
            </tr>
          </thead>
          <tbody>
            ${sec.students.map((st, i) => `
              <tr>
                <td style="text-align: center; font-weight: 700; color: #64748B;">${i + 1}</td>
                <td style="font-weight: 800; color: #002060;">${st.studentCode}</td>
                <td style="font-weight: 700; color: #0F172A;">${st.studentName}</td>
                <td style="text-align: center;">${st.gender}</td>
                <td style="text-align: center;">${formatVNDate(st.dateOfBirth)}</td>
                <td style="text-align: center;">
                  ${st.isConsulted
                    ? `<span class="badge-status badge-done">✓ ĐÃ TƯ VẤN (${st.sessionCount} buổi)</span>`
                    : `<span class="badge-status badge-pending">! CHƯA TƯ VẤN</span>`}
                </td>
                <td style="text-align: center; font-weight: 600;">${formatVNDate(st.latestMeetingDate)}</td>
                <td>${st.latestCounselor}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Section 2: Consultation Log Details -->
        <div class="section-title" style="margin-top: 20px;">
          2. Sổ Nhật Ký Các Buổi Tham Vấn & Kế Hoạch Hành Động (${sec.classLogs.length} Phiên gặp thực tế)
        </div>

        ${sec.classLogs.length > 0 ? `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 11%;">Ngày gặp</th>
                <th style="width: 18%;">Học sinh</th>
                <th style="width: 28%;">Nội dung trao đổi & Mục tiêu</th>
                <th style="width: 25%;">Khó khăn & Kế hoạch hành động</th>
                <th style="width: 18%;">Hạn hoàn thành & Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${sec.classLogs.slice(0, 20).map(log => `
                <tr>
                  <td style="font-weight: 700; color: #002060;">${formatVNDate(log.meetingDate)}</td>
                  <td style="font-weight: 800;">
                    ${log.studentName}
                    <div style="font-size: 7.5pt; color: #64748B; font-weight: normal;">${log.studentCode}</div>
                  </td>
                  <td>${log.content || "N/A"}</td>
                  <td>
                    ${log.difficulties ? `<strong>Khó khăn:</strong> ${log.difficulties}<br/>` : ""}
                    <strong>Biện pháp:</strong> ${log.nextActions || "Chưa cập nhật"}
                  </td>
                  <td>
                    ${log.deadline ? `<strong>Hạn:</strong> ${formatVNDate(log.deadline)}<br/>` : ""}
                    ${log.notes ? `<span>${log.notes}</span>` : ""}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          ${sec.classLogs.length > 20 ? `<p style="font-size: 8pt; color: #64748B; font-style: italic;">(Hiển thị 20 buổi tư vấn gần nhất trong sổ in này)</p>` : ""}
        ` : `
          <p style="font-style: italic; color: #64748B; font-size: 8.5pt; margin-bottom: 10px;">
            Lớp hiện chưa ghi nhận buổi nhật ký tư vấn trực tuyến nào trong cơ sở dữ liệu. Biểu mẫu chuẩn kẻ sẵn phục vụ GVCN ghi chép viết tay:
          </p>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 12%;">Ngày gặp</th>
                <th style="width: 22%;">Học sinh</th>
                <th style="width: 33%;">Nội dung trao đổi / Định hướng mục tiêu</th>
                <th style="width: 23%;">Khó khăn & Biện pháp hỗ trợ</th>
                <th style="width: 10%; text-align: center;">Ký xác nhận</th>
              </tr>
            </thead>
            <tbody>
              ${[1, 2, 3, 4, 5, 6].map(() => `
                <tr>
                  <td><div style="height: 22px;"></div></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `}

        <!-- Section 3: Pending Students Plan (if any) -->
        ${sec.unconsultedCount > 0 ? `
          <div class="section-title" style="margin-top: 16px; color: #991B1B; border-color: #EF4444;">
            3. Danh Sách Học Sinh Cần Đôn Đốc Hoàn Thành Tư Vấn (${sec.unconsultedCount} Học sinh)
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">STT</th>
                <th style="width: 15%;">Mã HS</th>
                <th style="width: 30%;">Họ và tên học sinh</th>
                <th style="width: 30%;">Kế hoạch / Lịch hẹn dự kiến của GVCN</th>
                <th style="width: 20%; text-align: center;">Ghi chú đôn đốc</th>
              </tr>
            </thead>
            <tbody>
              ${sec.students.filter(s => !s.isConsulted).map((st, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700; color: #64748B;">${idx + 1}</td>
                  <td style="font-weight: 800; color: #002060;">${st.studentCode}</td>
                  <td style="font-weight: 700;">${st.studentName}</td>
                  <td>Bố trí gặp gỡ trong tuần tiếp theo</td>
                  <td style="text-align: center; color: #991B1B; font-weight: 700;">Chưa tư vấn</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}

        <!-- Sign-off Block -->
        <table class="sign-table">
          <tr>
            <td>
              <div class="sign-role">GIÁO VIÊN PHỤ TRÁCH (GVCN)</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${sec.gvcnName}</div>
            </td>
            <td>
              <div class="sign-role">TỔ TRƯỞNG CỐ VẤN / TTCM</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">...................................................</div>
            </td>
            <td>
              <div class="sign-role">BAN GIÁM HIỆU / GĐCS</div>
              <div class="sign-note">(Ký duyệt và đóng dấu)</div>
              <div class="sign-space"></div>
              <div class="sign-name">...................................................</div>
            </td>
          </tr>
        </table>

      </div>
      `
    }).join("")}
  </div>

  <script>
    if (${autoPrint}) {
      window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => { window.print(); }, 600);
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
    console.error("GET /api/admin/advisory/export-teacher-pdf error:", error)
    return new Response(`<h3 style='color:red;'>Lỗi xuất báo cáo PDF: ${error.message}</h3>`, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    })
  }
}
