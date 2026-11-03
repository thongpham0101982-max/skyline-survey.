/* eslint-disable */
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
  } catch (e) {
    console.error("Error reading logo.png:", e);
  }
  return "";
}

function parseDbJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const academicYearParam = searchParams.get("academicYear");
  const targetClassId = searchParams.get("classId");
  const targetTeacherId = searchParams.get("teacherId");
  const campusFilter = searchParams.get("campusId");
  const gradeFilter = searchParams.get("grade");
  const autoPrint = searchParams.get("autoPrint") === "true";
  const directDownload = searchParams.get("download") === "true";

  try {
    // 1. Resolve Academic Year
    let activeYear: any = null;
    if (academicYearParam) {
      activeYear = await prisma.academicYear.findUnique({
        where: { id: academicYearParam }
      }).catch(() => null);
      if (!activeYear) {
        activeYear = await prisma.academicYear.findFirst({
          where: { name: academicYearParam }
        });
      }
    }
    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }) || await prisma.academicYear.findFirst({
        orderBy: { createdAt: "desc" }
      });
    }

    const targetYearId = activeYear?.id || "";
    const academicYearTitle = activeYear?.name || "Năm học 2026-2027";

    // 2. Fetch Classes with teachers and students
    const classWhere: any = {};
    if (targetClassId) {
      classWhere.id = targetClassId;
    }
    if (campusFilter && campusFilter !== "ALL") {
      classWhere.campusId = campusFilter;
    }
    if (gradeFilter && gradeFilter !== "ALL") {
      classWhere.grade = gradeFilter;
    }

    const classes = await prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true,
        teachers: {
          include: {
            teacher: true
          }
        },
        students: {
          where: { status: { not: "INACTIVE" } },
          select: {
            id: true,
            studentCode: true,
            studentName: true,
            gender: true
          },
          orderBy: { studentName: "asc" }
        }
      },
      orderBy: [
        { campusId: "asc" },
        { grade: "asc" },
        { className: "asc" }
      ]
    });

    // 3. Fetch Activity Records
    const actWhere: any = {};
    if (targetYearId) {
      actWhere.academicYearId = targetYearId;
    }

    const activityRecords = await prisma.activityRecord.findMany({
      where: actWhere,
      include: {
        catalog: {
          select: {
            id: true,
            code: true,
            name: true,
            theme: { select: { name: true } },
            type: { select: { name: true } },
            level: true
          }
        },
        academicYear: true,
        teacher: {
          select: {
            id: true,
            teacherName: true,
            teacherCode: true
          }
        },
        participants: {
          select: {
            id: true,
            studentId: true,
            roleId: true,
            evalLevelId: true,
            note: true,
            student: {
              select: {
                id: true,
                studentCode: true,
                studentName: true,
                classId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 4. Fetch Activity Catalogs for additional allocation data
    const catalogs = await prisma.activityCatalog.findMany({
      where: { status: { not: "DELETED" } },
      include: {
        theme: { select: { name: true } },
        type: { select: { name: true } }
      }
    });

    const catalogMap = new Map<string, any>();
    catalogs.forEach(c => catalogMap.set(c.id, c));

    // 5. Build Homeroom Teacher Tracking Data
    const gvcnReports: any[] = [];

    classes.forEach(cls => {
      // Find homeroom teacher
      let homeroomTeacher: any = null;
      if (cls.teachers && cls.teachers.length > 0) {
        const found = cls.teachers.find(t => t.isHomeroom || t.role === "HOMEROOM");
        if (found && found.teacher) {
          homeroomTeacher = found.teacher;
        } else if (cls.teachers[0].teacher) {
          homeroomTeacher = cls.teachers[0].teacher;
        }
      }

      const teacherName = homeroomTeacher?.teacherName || "Chưa phân công";
      const teacherCode = homeroomTeacher?.teacherCode || "—";
      const teacherEmail = homeroomTeacher?.email || "—";
      const teacherId = homeroomTeacher?.id || "";

      // If filtering by teacherId and doesn't match, skip
      if (targetTeacherId && targetTeacherId !== teacherId && targetTeacherId !== teacherCode) {
        return;
      }

      const studentCount = cls.students.length;
      const studentMap = new Map<string, any>();
      cls.students.forEach(st => studentMap.set(st.id, st));

      // Find plans allocated to this class
      const assignedPlansMap = new Map<string, any>();

      // A. Check activityRecords
      activityRecords.forEach(ar => {
        let isAssigned = false;
        const meta = parseDbJson<any>(ar.locationId || ar.metadata, {});
        const cat = ar.catalog || (ar.catalogId ? catalogMap.get(ar.catalogId) : null);
        const catMeta = parseDbJson<any>(cat?.description || cat?.metadata, {});

        const assignedClasses = meta.assignedClasses || catMeta.assignedClasses || [];
        if (Array.isArray(assignedClasses)) {
          if (assignedClasses.some((ac: any) => (ac.id === cls.id || ac.classId === cls.id || ac.className === cls.className))) {
            isAssigned = true;
          }
        }

        if (!isAssigned) {
          const targetGrades = meta.targetGrades || catMeta.targetGrades || meta.grades || catMeta.grades || [];
          const targetCampuses = meta.targetCampuses || catMeta.allocatedCampuses || [];
          const campusMatch = targetCampuses.length === 0 || targetCampuses.includes(cls.campusId) || targetCampuses.includes(cls.campus?.campusCode);
          const gradeMatch = targetGrades.length === 0 || targetGrades.includes(cls.grade) || targetGrades.includes(Number(cls.grade));
          if (campusMatch && gradeMatch && (targetGrades.length > 0 || targetCampuses.length > 0)) {
            isAssigned = true;
          }
        }

        if (!isAssigned) {
          const hasParticipantFromClass = ar.participants.some(p => p.student?.classId === cls.id);
          if (hasParticipantFromClass) isAssigned = true;
        }

        if (isAssigned) {
          const planKey = ar.id;
          if (!assignedPlansMap.has(planKey)) {
            const classParticipants = ar.participants.filter(p => p.student?.classId === cls.id);
            const evaluatedStudents = new Set<string>();

            classParticipants.forEach(p => {
              const noteData = parseDbJson<any>(p.note, {});
              const hasEvaluation = !!(
                p.evalLevelId ||
                p.roleId ||
                noteData.roleId ||
                (Array.isArray(noteData.roles) && noteData.roles.length > 0) ||
                noteData.finalResult ||
                noteData.criteriaValues
              );
              if (hasEvaluation && p.studentId) {
                evaluatedStudents.add(p.studentId);
              }
            });

            const evaluatedCount = evaluatedStudents.size;
            const pendingCount = Math.max(0, studentCount - evaluatedCount);
            const progressPercent = studentCount > 0 ? Math.round((evaluatedCount / studentCount) * 100) : 0;

            const timeRange = ar.timeRange || meta.executionTime || meta.timeRange || (meta.term ? `Học kỳ ${meta.term}` : "Cả năm");
            const themeName = cat?.theme?.name || meta.themeName || "Hoạt động trải nghiệm";

            // Find specific students not evaluated
            const unevaluatedList: any[] = [];
            cls.students.forEach(st => {
              if (!evaluatedStudents.has(st.id)) {
                unevaluatedList.push({
                  studentId: st.id,
                  studentCode: st.studentCode || "—",
                  studentName: st.studentName || "—",
                  gender: st.gender === "FEMALE" ? "Nữ" : "Nam"
                });
              }
            });

            assignedPlansMap.set(planKey, {
              activityId: ar.id,
              activityCode: ar.catalog?.code || ar.code || `HDTN-${ar.id.substring(0, 6)}`,
              activityName: ar.catalog?.name || ar.title || "Kế hoạch Hoạt động",
              themeName,
              timeRange,
              totalStudents: studentCount,
              evaluatedCount,
              pendingCount,
              progressPercent,
              unevaluatedList
            });
          }
        }
      });

      // B. Catalogs allocated but not yet have ActivityRecord
      catalogs.forEach(cat => {
        const catMeta = parseDbJson<any>(cat.description || cat.metadata, {});
        const targetCampuses = catMeta.allocatedCampuses || [];
        const targetGrades = catMeta.targetGrades || [];
        const assignedClasses = catMeta.assignedClasses || [];

        let isAssigned = false;
        if (Array.isArray(assignedClasses) && assignedClasses.some((ac: any) => (ac.id === cls.id || ac.classId === cls.id || ac.className === cls.className))) {
          isAssigned = true;
        } else if (
          (targetCampuses.length === 0 || targetCampuses.includes(cls.campusId) || targetCampuses.includes(cls.campus?.campusCode)) &&
          (targetGrades.length === 0 || targetGrades.includes(cls.grade) || targetGrades.includes(Number(cls.grade))) &&
          (targetGrades.length > 0 || targetCampuses.length > 0)
        ) {
          isAssigned = true;
        }

        if (isAssigned) {
          const alreadyInRecord = Array.from(assignedPlansMap.values()).some(p => p.activityCode === cat.code || p.activityName === cat.name);
          if (!alreadyInRecord) {
            const timeRange = catMeta.timeRange || (catMeta.term ? `Học kỳ ${catMeta.term}` : "Trong năm");
            const unevaluatedList = cls.students.map(st => ({
              studentId: st.id,
              studentCode: st.studentCode || "—",
              studentName: st.studentName || "—",
              gender: st.gender === "FEMALE" ? "Nữ" : "Nam"
            }));

            assignedPlansMap.set(`CAT-${cat.id}`, {
              activityId: cat.id,
              activityCode: cat.code || `KH-${cat.id.substring(0, 6)}`,
              activityName: cat.name,
              themeName: cat.theme?.name || "Chủ đề giáo dục",
              timeRange,
              totalStudents: studentCount,
              evaluatedCount: 0,
              pendingCount: studentCount,
              progressPercent: 0,
              unevaluatedList
            });
          }
        }
      });

      const plans = Array.from(assignedPlansMap.values());
      const assignedPlansCount = plans.length;
      const totalStudentsToEvaluate = assignedPlansCount * studentCount;
      const totalEvaluated = plans.reduce((acc, p) => acc + p.evaluatedCount, 0);
      const totalPending = Math.max(0, totalStudentsToEvaluate - totalEvaluated);
      const overallProgress = totalStudentsToEvaluate > 0 ? Math.round((totalEvaluated / totalStudentsToEvaluate) * 100) : 0;

      gvcnReports.push({
        classId: cls.id,
        className: cls.className,
        campusName: cls.campus?.campusName || "Sky-Line",
        campusCode: cls.campus?.campusCode || "CS",
        grade: cls.grade ? `Khối ${cls.grade}` : "—",
        teacherId,
        teacherName,
        teacherCode,
        teacherEmail,
        studentCount,
        assignedPlansCount,
        totalStudentsToEvaluate,
        totalEvaluated,
        totalPending,
        overallProgress,
        plans
      });
    });

    if (gvcnReports.length === 0) {
      return new Response(
        `<html><body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Không tìm thấy dữ liệu Giáo viên Chủ nhiệm phù hợp</h2>
          <p>Vui lòng kiểm tra lại bộ lọc cơ sở, khối hoặc thông tin giáo viên.</p>
          <button onclick="window.close()" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Đóng cửa sổ</button>
        </body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const logoBase64 = getLogoBase64();
    const isSingle = gvcnReports.length === 1;
    const reportTitle = isSingle
      ? `Theo dõi Kế hoạch HĐTN - GVCN ${gvcnReports[0].teacherName} (${gvcnReports[0].className})`
      : `Báo cáo Theo dõi Kế hoạch HĐTN theo GVCN - ${academicYearTitle}`;

    // Render HTML Document
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.4;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }

    /* Top Floating Toolbar (Hidden during print) */
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #003B3A;
      color: white;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #e2e8f0;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #00A19A;
      color: white;
    }
    .btn-primary:hover {
      background: #008f89;
    }

    .btn-download {
      background: #f59e0b;
      color: #78350f;
    }
    .btn-download:hover {
      background: #d97706;
      color: white;
    }

    .btn-secondary {
      background: rgba(255,255,255,0.15);
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.25);
    }

    .select-gvcn {
      background: white;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }

    /* Print Paper Container */
    .paper-container {
      max-width: 210mm;
      margin: 20px auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.08);
    }

    .gvcn-a4-page {
      padding: 12mm 15mm 15mm 15mm;
      background: white;
      position: relative;
    }

    .page-break-after {
      page-break-after: always;
      break-after: page;
    }

    .page-break-avoid {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Header styling */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #003B3A;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .header-logo-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-logo {
      height: 44px;
      width: auto;
      object-fit: contain;
    }

    .header-school-info {
      line-height: 1.25;
    }
    .header-school-name {
      font-size: 11pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-sub-system {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .header-right {
      text-align: right;
      font-size: 8pt;
      color: #475569;
      line-height: 1.3;
    }

    /* Title Section */
    .title-section {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .main-title {
      font-size: 13.5pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 9pt;
      color: #64748b;
      font-weight: 600;
      font-style: italic;
      margin: 0;
    }

    /* Info Table / Grid */
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #00A19A;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    .info-table td {
      padding: 2.5px 6px;
      vertical-align: top;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
      width: 125px;
    }
    .info-value {
      color: #0f172a;
      font-weight: 700;
    }

    /* KPI Summary Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .kpi-num {
      font-size: 13pt;
      font-weight: 900;
      line-height: 1.2;
    }
    .kpi-text {
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Section Headings */
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      border-bottom: 1.5px solid #00A19A;
      padding-bottom: 3px;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-count {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-bottom: 12px;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      line-height: 1.3;
    }
    .data-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      font-size: 7.5pt;
    }
    .data-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
    }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

    /* Sign Section */
    .sign-section {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    .sign-title {
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .sign-subtitle {
      font-style: italic;
      color: #64748b;
      font-size: 7.5pt;
      margin-bottom: 50px;
    }
    .sign-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 9pt;
    }

    /* Print media adjustments */
    @media print {
      body {
        background: white !important;
        font-size: 9pt !important;
      }
      .print-toolbar {
        display: none !important;
      }
      .paper-container {
        box-shadow: none !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      .gvcn-a4-page {
        padding: 0 0 10mm 0 !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Floating Toolbar -->
  <div class="print-toolbar no-print">
    <div class="toolbar-left">
      <span class="toolbar-title">📄 Theo Dõi Kế Hoạch Theo GVCN (A4)</span>
      <select class="select-gvcn" onchange="switchTeacher(this.value)">
        <option value="">-- Toàn bộ GVCN (${gvcnReports.length} GV) --</option>
        ${gvcnReports.map(g => `
          <option value="${g.classId}" ${targetClassId === g.classId ? "selected" : ""}>
            ${g.className} - ${g.teacherName} (${g.campusName})
          </option>
        `).join("")}
      </select>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-secondary" onclick="window.close()">Đóng</button>
      <button type="button" class="btn btn-download" id="btn-download-pdf" onclick="downloadDirectPDF()">⬇ Tải File PDF</button>
      <button type="button" class="btn btn-primary" onclick="window.print()">🖨 In / Lưu PDF (A4)</button>
    </div>
  </div>

  <!-- Document Paper Container -->
  <div class="paper-container" id="printable-content">
    ${gvcnReports.map((gv, idx) => {
      const isLast = idx === gvcnReports.length - 1;
      const progressColor = gv.overallProgress >= 100 ? "#16a34a" : gv.overallProgress >= 50 ? "#0284c7" : "#d97706";

      // Collect all unevaluated students across plans
      const allUnevaluated: any[] = [];
      gv.plans.forEach(p => {
        if (p.unevaluatedList && p.unevaluatedList.length > 0) {
          p.unevaluatedList.forEach((st: any) => {
            allUnevaluated.push({
              ...st,
              planCode: p.activityCode,
              planName: p.activityName,
              timeRange: p.timeRange
            });
          });
        }
      });

      return `
      <section class="gvcn-a4-page ${!isLast ? 'page-break-after' : ''}">
        <!-- Header -->
        <div class="doc-header">
          <div class="header-logo-box">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Sky-Line" class="header-logo" />` : ""}
            <div class="header-school-info">
              <div class="header-school-name">Hệ Thống Giáo Dục Sky-Line</div>
              <div class="header-sub-system">${gv.campusName} • Năm Học ${academicYearTitle}</div>
            </div>
          </div>
          <div class="header-right">
            <div>Mã biểu mẫu: <strong>BM-HDTN-GVCN</strong></div>
            <div>Ngày kết xuất: <strong>${new Date().toLocaleDateString("vi-VN")}</strong></div>
          </div>
        </div>

        <!-- Title -->
        <div class="title-section">
          <h1 class="main-title">PHIẾU THEO DÕI KẾ HOẠCH & ĐÁNH GIÁ HOẠT ĐỘNG TRẢI NGHIỆM</h1>
          <p class="sub-title">Dành cho Giáo viên Chủ nhiệm kiểm soát kế hoạch gán và học sinh chưa hoàn tất đánh giá</p>
        </div>

        <!-- GVCN Info Card -->
        <div class="info-card">
          <table class="info-table">
            <tr>
              <td class="info-label">Giáo viên Chủ nhiệm:</td>
              <td class="info-value" style="font-size: 10pt; color: #003B3A;">${gv.teacherName}</td>
              <td class="info-label">Lớp phụ trách:</td>
              <td class="info-value"><span style="background: #003B3A; color: white; padding: 1px 6px; border-radius: 4px;">${gv.className}</span> (${gv.grade})</td>
            </tr>
            <tr>
              <td class="info-label">Mã định danh GV:</td>
              <td class="info-value">${gv.teacherCode || "—"}</td>
              <td class="info-label">Cơ sở trường:</td>
              <td class="info-value">${gv.campusName}</td>
            </tr>
            <tr>
              <td class="info-label">Email Sky-Line:</td>
              <td class="info-value">${gv.teacherEmail || "—"}</td>
              <td class="info-label">Sĩ số lớp:</td>
              <td class="info-value"><strong style="color: #00A19A;">${gv.studentCount}</strong> học sinh</td>
            </tr>
          </table>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-num" style="color: #003B3A;">${gv.assignedPlansCount}</div>
            <div class="kpi-text">Kế hoạch gán</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: #475569;">${gv.totalStudentsToEvaluate}</div>
            <div class="kpi-text">Tổng lượt HS cần ĐG</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: ${progressColor};">${gv.overallProgress}%</div>
            <div class="kpi-text">Đã đánh giá (${gv.totalEvaluated}/${gv.totalStudentsToEvaluate})</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: ${gv.totalPending > 0 ? '#b91c1c' : '#16a34a'};">${gv.totalPending}</div>
            <div class="kpi-text">Lượt chưa đánh giá</div>
          </div>
        </div>

        <!-- Section 1: Assigned Plans & Progress -->
        <div class="section-title">
          <span>I. CÁC KẾ HOẠCH HĐTN ĐƯỢC GÁN & TIẾN ĐỘ THỰC HIỆN</span>
          <span class="section-count">Tổng: ${gv.assignedPlansCount} kế hoạch</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px;">STT</th>
              <th style="width: 85px;">Mã KH</th>
              <th>Tên Kế Hoạch Hoạt Động Trải Nghiệm</th>
              <th style="width: 110px;">Chủ đề</th>
              <th style="width: 75px;">Thời gian</th>
              <th style="width: 40px;">Sĩ số</th>
              <th style="width: 45px;">Đã ĐG</th>
              <th style="width: 45px;">Chưa</th>
              <th style="width: 50px;">Tiến độ</th>
              <th style="width: 75px;">Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            ${gv.plans.length === 0 ? `
              <tr>
                <td colspan="10" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">
                  Chưa có kế hoạch Hoạt động Trải nghiệm nào được gán cho lớp trong năm học này.
                </td>
              </tr>
            ` : gv.plans.map((p, pIdx) => {
              const pStatusBadge = p.progressPercent >= 100
                ? '<span class="badge badge-success">✓ Hoàn tất</span>'
                : p.progressPercent > 0
                ? '<span class="badge badge-warning">Đang đánh giá</span>'
                : '<span class="badge badge-danger">Chưa đánh giá</span>';

              return `
              <tr>
                <td style="text-align: center; font-weight: 700; color: #64748b;">${pIdx + 1}</td>
                <td style="font-family: monospace; font-weight: 700; color: #003B3A;">${p.activityCode}</td>
                <td><strong>${p.activityName}</strong></td>
                <td style="color: #475569;">${p.themeName}</td>
                <td style="text-align: center; color: #64748b;">${p.timeRange}</td>
                <td style="text-align: center; font-weight: 700;">${p.totalStudents}</td>
                <td style="text-align: center; font-weight: 700; color: #15803d;">${p.evaluatedCount}</td>
                <td style="text-align: center; font-weight: 700; color: ${p.pendingCount > 0 ? '#b91c1c' : '#64748b'};">${p.pendingCount}</td>
                <td style="text-align: center; font-weight: 800; color: ${p.progressPercent >= 100 ? '#15803d' : '#b45309'};">${p.progressPercent}%</td>
                <td style="text-align: center;">${pStatusBadge}</td>
              </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <!-- Section 2: Unevaluated Students List -->
        <div class="section-title page-break-avoid">
          <span>II. DANH SÁCH HỌC SINH CHƯA ĐÁNH GIÁ (CẦN ĐÔN ĐỐC)</span>
          <span class="section-count">${allUnevaluated.length} lượt học sinh</span>
        </div>

        <div class="page-break-avoid">
          ${allUnevaluated.length === 0 ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 10px 14px; border-radius: 6px; font-weight: 700; font-size: 8.5pt; text-align: center; margin-bottom: 14px;">
              🎉 TUYỆT VỜI: Lớp ${gv.className} đã hoàn thành đánh giá 100% học sinh cho toàn bộ các kế hoạch HĐTN được gán!
            </div>
          ` : `
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 25px;">STT</th>
                  <th style="width: 75px;">Mã HS</th>
                  <th style="width: 140px; text-align: left;">Họ và Tên Học Sinh</th>
                  <th style="width: 45px;">Giới tính</th>
                  <th>Kế Hoạch HĐTN Chưa Đánh Giá</th>
                  <th style="width: 80px;">Thời gian</th>
                  <th style="width: 110px;">Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                ${allUnevaluated.map((st, sIdx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${sIdx + 1}</td>
                    <td style="font-family: monospace; font-weight: 700; color: #003B3A; text-align: center;">${st.studentCode}</td>
                    <td style="font-weight: 700; color: #0f172a;">${st.studentName}</td>
                    <td style="text-align: center; color: #475569;">${st.gender}</td>
                    <td><strong>${st.planName}</strong> <span style="color: #64748b; font-family: monospace;">(${st.planCode})</span></td>
                    <td style="text-align: center; color: #64748b;">${st.timeRange}</td>
                    <td style="text-align: center;"><span class="badge badge-danger">Chưa nhập vai trò / ĐG</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `}
        </div>

        <!-- Section 3: Signatures -->
        <div class="sign-section">
          <div>
            <div class="sign-title">GIÁO VIÊN CHỦ NHIỆM</div>
            <div class="sign-subtitle">(Ký và ghi rõ họ tên)</div>
            <div class="sign-name">${gv.teacherName}</div>
          </div>
          <div>
            <div class="sign-title">TỔ TRƯỞNG CHUYÊN MÔN / BAN GIÁM HIỆU</div>
            <div class="sign-subtitle">(Ký, đóng dấu xác nhận)</div>
            <div class="sign-name">...................................................</div>
          </div>
        </div>
      </section>
      `;
    }).join("")}
  </div>

  <script>
    function switchTeacher(classId) {
      const url = new URL(window.location.href);
      if (classId) {
        url.searchParams.set("classId", classId);
      } else {
        url.searchParams.delete("classId");
      }
      window.location.href = url.toString();
    }

    function downloadDirectPDF() {
      const btn = document.getElementById("btn-download-pdf");
      const element = document.getElementById("printable-content");
      if (!element) return;

      const originalBtnText = btn.innerHTML;
      btn.innerHTML = "<span>Đang tạo PDF...</span>";
      btn.style.opacity = "0.7";

      const opt = {
        margin: [10, 10, 12, 10],
        filename: "${encodeURIComponent(reportTitle).replace(/%/g, '_')}.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"], avoid: [".page-break-avoid", ".sign-section", "tr"] }
      };

      if (typeof html2pdf !== "undefined") {
        html2pdf().set(opt).from(element).save().then(() => {
          btn.innerHTML = originalBtnText;
          btn.style.opacity = "1";
        }).catch((err) => {
          console.error("Lỗi xuất PDF:", err);
          btn.innerHTML = originalBtnText;
          btn.style.opacity = "1";
          window.print();
        });
      } else {
        window.print();
      }
    }

    window.addEventListener("DOMContentLoaded", () => {
      ${directDownload ? `
        setTimeout(() => { downloadDirectPDF(); }, 400);
      ` : autoPrint ? `
        setTimeout(() => { window.print(); }, 400);
      ` : ""}
    });
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (error: any) {
    console.error("GET /api/admin/experiential-activities/export-gvcn-pdf error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
