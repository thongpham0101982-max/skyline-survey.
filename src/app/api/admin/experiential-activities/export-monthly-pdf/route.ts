/* eslint-disable */
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDbJson } from "@/lib/experiential/formula";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";
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

// Danh sách các tháng năm học chuẩn
const ACADEMIC_MONTHS = [
  { num: 8, name: "Tháng 8" },
  { num: 9, name: "Tháng 9" },
  { num: 10, name: "Tháng 10" },
  { num: 11, name: "Tháng 11" },
  { num: 12, name: "Tháng 12" },
  { num: 1, name: "Tháng 1" },
  { num: 2, name: "Tháng 2" },
  { num: 3, name: "Tháng 3" },
  { num: 4, name: "Tháng 4" },
  { num: 5, name: "Tháng 5" }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const academicYearParam = searchParams.get("academicYearId") || searchParams.get("academicYear");
  const monthFilter = searchParams.get("month"); // "8", "9", ..., or "ALL" / null
  const campusFilter = searchParams.get("campusId");
  const gradeFilter = searchParams.get("grade");
  const evalStatusFilter = searchParams.get("evalStatus"); // "DA_DANH_GIA" | "DANG_DANH_GIA" | "CHUA_DANH_GIA" | "ALL"
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
    const academicYearTitle = activeYear?.name || "2026-2027";

    // 2. Fetch Campuses
    const campuses = await prisma.campus.findMany({
      where: { NOT: { status: "INACTIVE" } },
      orderBy: { campusCode: "asc" }
    });
    const campusMap = new Map(campuses.map(c => [c.id, c]));

    // 3. Fetch Classes with teachers and students
    const classWhere: any = { status: { not: "INACTIVE" } };
    if (targetYearId) classWhere.academicYearId = targetYearId;
    if (campusFilter && campusFilter !== "ALL") classWhere.campusId = campusFilter;
    if (gradeFilter && gradeFilter !== "ALL") classWhere.grade = gradeFilter;

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
          select: { id: true, studentCode: true, studentName: true, gender: true }
        }
      },
      orderBy: [{ campusId: "asc" }, { grade: "asc" }, { className: "asc" }]
    });

    const classInfoMap = new Map<string, any>();
    classes.forEach(c => {
      let gvcnName = "";
      let gvcnCode = "";
      if (c.teachers && c.teachers.length > 0) {
        const hr = c.teachers.find(t => t.isHomeroom || t.role === "HOMEROOM");
        if (hr && hr.teacher) {
          gvcnName = hr.teacher.teacherName || "";
          gvcnCode = hr.teacher.teacherCode || "";
        } else if (c.teachers[0].teacher) {
          gvcnName = c.teachers[0].teacher.teacherName || "";
          gvcnCode = c.teachers[0].teacher.teacherCode || "";
        }
      }
      classInfoMap.set(c.id, {
        ...c,
        gvcnName: gvcnName || "Chưa phân công",
        gvcnCode: gvcnCode || "—"
      });
      classInfoMap.set(c.className, {
        ...c,
        gvcnName: gvcnName || "Chưa phân công",
        gvcnCode: gvcnCode || "—"
      });
    });

    // 4. Fetch Activity Records
    const actWhere: any = {};
    if (targetYearId) actWhere.academicYearId = targetYearId;
    if (campusFilter && campusFilter !== "ALL") actWhere.campusId = campusFilter;

    const activityRecords = await prisma.activityRecord.findMany({
      where: actWhere,
      include: {
        catalog: {
          include: {
            theme: { select: { name: true } },
            type: { select: { name: true } }
          }
        },
        academicYear: true,
        teacher: { select: { id: true, teacherName: true, teacherCode: true } },
        participants: {
          select: {
            id: true,
            studentId: true,
            roleId: true,
            evalLevelId: true,
            note: true,
            student: { select: { id: true, classId: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 5. Fetch Catalogs for descriptions
    const catalogs = await prisma.activityCatalog.findMany({
      where: { status: { not: "DELETED" } },
      include: {
        theme: { select: { name: true } },
        type: { select: { name: true } }
      }
    });
    const catalogMap = new Map(catalogs.map(c => [c.id, c]));

    // 6. Build Monthly Rows
    // Each row represents an activity assignment to a class in a specific month
    const monthlyDataMap: Record<number, any[]> = {};
    ACADEMIC_MONTHS.forEach(m => {
      monthlyDataMap[m.num] = [];
    });

    activityRecords.forEach(ar => {
      const meta = parseDbJson<any>(ar.locationId || ar.metadata, {});
      const cat = ar.catalog || (ar.catalogId ? catalogMap.get(ar.catalogId) : null);
      const catMeta = parseDbJson<any>(cat?.description || cat?.metadata, {});

      // Extract month number
      let monthNumber: number | null = null;
      if (meta.month && typeof meta.month === "number" && meta.month >= 1 && meta.month <= 12) {
        monthNumber = meta.month;
      } else {
        const timeCandidate = meta.timeRange || ar.timeRange || meta.timeFrame || meta.dateStr || ar.title || cat?.name || "";
        const timeInfo = formatTimeFrameAndSemester(timeCandidate, academicYearTitle, meta.semester || ar.semester);
        if (timeInfo && timeInfo.month !== null) {
          monthNumber = timeInfo.month;
        } else if (ar.date) {
          const d = new Date(ar.date);
          if (!isNaN(d.getTime())) {
            monthNumber = d.getMonth() + 1;
          }
        }
      }

      // If monthNumber is not detected or not in academic list, check time range text
      if (monthNumber === null) {
        const raw = `${ar.timeRange || ""} ${meta.timeRange || ""} ${ar.title || ""}`.toLowerCase();
        for (const m of ACADEMIC_MONTHS) {
          if (raw.includes(`tháng ${m.num}`) || raw.includes(`t${m.num}`) || raw.includes(`thg ${m.num}`)) {
            monthNumber = m.num;
            break;
          }
        }
      }

      if (monthNumber === null || !monthlyDataMap[monthNumber]) {
        return; // Skip if month is undetermined
      }

      // Find assigned classes
      let assignedClasses = meta.assignedClasses || catMeta.assignedClasses || [];
      if (!Array.isArray(assignedClasses) || assignedClasses.length === 0) {
        // Infer from participants
        const classIdsInAr = Array.from(new Set(ar.participants.map(p => p.student?.classId).filter(Boolean)));
        assignedClasses = classIdsInAr.map(cid => {
          const c = classInfoMap.get(cid);
          return {
            id: cid,
            classId: cid,
            className: c?.className || "Lớp",
            campusName: c?.campus?.campusName || "Sky-Line",
            grade: c?.grade || ""
          };
        });
      }

      const activityTitle = cat?.name || ar.title || "Kế hoạch Hoạt động";
      const activityCode = cat?.code || ar.code || `HDTN-${ar.id.substring(0, 6)}`;
      const themeName = cat?.theme?.name || meta.themeName || "Chủ đề giáo dục";
      const subjectTeacherName = ar.teacher?.teacherName || meta.leadTeacherName || "GV Phụ trách";
      const location = meta.location || "Sky-Line";

      assignedClasses.forEach((ac: any) => {
        const cId = ac.id || ac.classId;
        const clsInfo = classInfoMap.get(cId) || classInfoMap.get(ac.className);
        if (!clsInfo && !ac.className) return;

        const effectiveClassId = clsInfo?.id || cId;
        const effectiveClassName = clsInfo?.className || ac.className;
        const effectiveGrade = clsInfo?.grade || ac.grade || "";
        const effectiveCampusCode = clsInfo?.campus?.campusCode || ac.campusCode || "CS";
        const effectiveCampusName = clsInfo?.campus?.campusName || ac.campusName || "Sky-Line";

        // Apply filters
        if (campusFilter && campusFilter !== "ALL" && clsInfo?.campusId !== campusFilter && effectiveCampusCode !== campusFilter) {
          return;
        }
        if (gradeFilter && gradeFilter !== "ALL" && effectiveGrade !== gradeFilter && String(effectiveGrade) !== gradeFilter) {
          return;
        }

        const totalStudents = clsInfo?.students?.length || ac.totalStudents || 30;

        // Count evaluated students in this class for this activity
        const classParticipants = ar.participants.filter(p => p.student?.classId === effectiveClassId);
        const evaluatedStudentsSet = new Set<string>();

        classParticipants.forEach(p => {
          const pNote = parseDbJson<any>(p.note, {});
          const hasEvaluation = !!(
            p.evalLevelId ||
            p.roleId ||
            pNote.roleId ||
            (Array.isArray(pNote.roles) && pNote.roles.length > 0) ||
            pNote.finalResult ||
            pNote.criteriaValues
          );
          if (hasEvaluation && p.studentId) {
            evaluatedStudentsSet.add(p.studentId);
          }
        });

        let evaluatedCount = evaluatedStudentsSet.size;
        if (evaluatedCount === 0 && typeof ac.evaluatedStudents === "number" && ac.evaluatedStudents > 0) {
          evaluatedCount = ac.evaluatedStudents;
        }

        const pendingCount = Math.max(0, totalStudents - evaluatedCount);
        let progressPercent = totalStudents > 0 ? Math.round((evaluatedCount / totalStudents) * 100) : 0;
        if (typeof ac.progressPercent === "number") {
          progressPercent = ac.progressPercent;
        }

        let evalStatusKey = "CHUA_DANH_GIA";
        let evalStatusLabel = "Chưa đánh giá";
        let evalStatusClass = "badge-danger";

        if (progressPercent >= 100 || ac.evalStatus === "DA_DANH_GIA" || ac.status === "COMPLETED") {
          evalStatusKey = "DA_DANH_GIA";
          evalStatusLabel = "✓ Đã hoàn thành 100%";
          evalStatusClass = "badge-success";
          progressPercent = 100;
        } else if (evaluatedCount > 0 || ac.evalStatus === "DANG_DANH_GIA") {
          evalStatusKey = "DANG_DANH_GIA";
          evalStatusLabel = `Đang đánh giá (${evaluatedCount}/${totalStudents})`;
          evalStatusClass = "badge-warning";
        }

        if (evalStatusFilter && evalStatusFilter !== "ALL" && evalStatusFilter !== evalStatusKey) {
          return;
        }

        const gvcnName = ac.homeroomTeacherName || clsInfo?.gvcnName || "Chưa phân công";
        const gvcnCode = ac.homeroomTeacherCode || clsInfo?.gvcnCode || "—";

        monthlyDataMap[monthNumber].push({
          activityId: ar.id,
          activityCode,
          activityName: activityTitle,
          themeName,
          location,
          subjectTeacherName,
          classId: effectiveClassId,
          className: effectiveClassName,
          campusName: effectiveCampusName,
          campusCode: effectiveCampusCode,
          grade: effectiveGrade ? `Khối ${effectiveGrade}` : "—",
          homeroomTeacherName: gvcnName,
          homeroomTeacherCode: gvcnCode,
          totalStudents,
          evaluatedCount,
          pendingCount,
          progressPercent,
          evalStatusKey,
          evalStatusLabel,
          evalStatusClass
        });
      });
    });

    // 7. Filter months to display
    let targetMonths = ACADEMIC_MONTHS;
    if (monthFilter && monthFilter !== "ALL") {
      const mNum = parseInt(monthFilter, 10);
      targetMonths = ACADEMIC_MONTHS.filter(m => m.num === mNum);
    }

    // Build month groups with summary stats
    const monthGroups = targetMonths.map(m => {
      const rows = (monthlyDataMap[m.num] || []).sort((a, b) => {
        if (a.campusCode !== b.campusCode) return a.campusCode.localeCompare(b.campusCode);
        return a.className.localeCompare(b.className);
      });

      const distinctActivities = new Set(rows.map(r => r.activityId)).size;
      const totalClassesAssigned = rows.length;
      const totalStudents = rows.reduce((acc, r) => acc + r.totalStudents, 0);
      const totalEvaluated = rows.reduce((acc, r) => acc + r.evaluatedCount, 0);
      const totalPending = Math.max(0, totalStudents - totalEvaluated);
      const completionRate = totalStudents > 0 ? Math.round((totalEvaluated / totalStudents) * 100) : 0;
      const completedClassesCount = rows.filter(r => r.progressPercent >= 100).length;

      return {
        monthNumber: m.num,
        monthName: m.name,
        distinctActivities,
        totalClassesAssigned,
        totalStudents,
        totalEvaluated,
        totalPending,
        completionRate,
        completedClassesCount,
        rows
      };
    });

    const logoBase64 = getLogoBase64();
    const isSingleMonth = targetMonths.length === 1;
    const documentTitle = isSingleMonth
      ? `Báo cáo Hoạt động Trải nghiệm ${targetMonths[0].name} - ${academicYearTitle}`
      : `Báo cáo Hoạt động Trải nghiệm Theo Tháng - ${academicYearTitle}`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
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
      font-size: 8.5pt;
      line-height: 1.35;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
    }

    /* Top Floating Toolbar */
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

    .btn-primary { background: #00A19A; color: white; }
    .btn-primary:hover { background: #008f89; }

    .btn-download { background: #f59e0b; color: #78350f; }
    .btn-download:hover { background: #d97706; color: white; }

    .btn-secondary { background: rgba(255,255,255,0.15); color: white; }
    .btn-secondary:hover { background: rgba(255,255,255,0.25); }

    .select-month {
      background: white;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
    }

    /* Paper Container */
    .paper-container {
      max-width: 210mm;
      margin: 20px auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.08);
    }

    .monthly-a4-page {
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
      height: 42px;
      width: auto;
      object-fit: contain;
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
      margin: 10px 0 14px 0;
    }
    .main-title {
      font-size: 13pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 600;
      font-style: italic;
      margin: 0;
    }

    /* Month Badge Highlight */
    .month-badge-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(to right, #003B3A, #00A19A);
      color: white;
      padding: 6px 14px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .month-badge-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .month-badge-sub {
      font-size: 8pt;
      opacity: 0.9;
    }

    /* KPI Summary Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .kpi-num {
      font-size: 12pt;
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

    /* Table Styling */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 14px;
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

    /* Signatures */
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

    @media print {
      body { background: white !important; font-size: 8.5pt !important; }
      .print-toolbar { display: none !important; }
      .paper-container { box-shadow: none !important; max-width: 100% !important; margin: 0 !important; }
      .monthly-a4-page { padding: 0 0 10mm 0 !important; }
    }
  </style>
</head>
<body>

  <!-- Top Floating Toolbar -->
  <div class="print-toolbar no-print">
    <div class="toolbar-left">
      <span class="toolbar-title">📅 Báo Cáo Hoạt Động Theo Tháng (A4)</span>
      <select class="select-month" onchange="switchMonth(this.value)">
        <option value="">-- Toàn bộ các tháng (${targetMonths.length} tháng) --</option>
        ${ACADEMIC_MONTHS.map(m => `
          <option value="${m.num}" ${monthFilter === String(m.num) ? "selected" : ""}>
            ${m.name}
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
    ${monthGroups.map((mg, mgIdx) => {
      const isLast = mgIdx === monthGroups.length - 1;
      const progressColor = mg.completionRate >= 100 ? "#16a34a" : mg.completionRate >= 50 ? "#0284c7" : "#d97706";

      return `
      <section class="monthly-a4-page ${!isLast ? 'page-break-after' : ''}">
        <!-- Header -->
        <div class="doc-header">
          <div class="header-logo-box">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Sky-Line" class="header-logo" />` : ""}
            <div class="header-school-info">
              <div class="header-school-name">Hệ Thống Giáo Dục Sky-Line</div>
              <div class="header-sub-system">Tổ CTHS & Ban ĐHCM • Năm Học ${academicYearTitle}</div>
            </div>
          </div>
          <div class="header-right">
            <div>Mã biểu mẫu: <strong>BM-HDTN-THANG</strong></div>
            <div>Ngày kết xuất: <strong>${new Date().toLocaleDateString("vi-VN")}</strong></div>
          </div>
        </div>

        <!-- Banner Tháng -->
        <div class="month-badge-banner">
          <div class="month-badge-title">KẾT QUẢ TRIỂN KHAI & ĐÁNH GIÁ - ${mg.monthName.toUpperCase()}</div>
          <div class="month-badge-sub">Tổng hợp tiến độ gán lớp, GVCN phụ trách và hoàn tất đánh giá HS</div>
        </div>

        <!-- KPI Mini Cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-num" style="color: #003B3A;">${mg.distinctActivities}</div>
            <div class="kpi-text">Số Hoạt Động Tháng</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: #475569;">${mg.totalClassesAssigned}</div>
            <div class="kpi-text">Lượt Lớp Được Gán</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: ${progressColor};">${mg.completionRate}%</div>
            <div class="kpi-text">Tiến độ ĐG (${mg.totalEvaluated}/${mg.totalStudents} HS)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num" style="color: ${mg.totalPending > 0 ? '#b91c1c' : '#16a34a'};">${mg.totalPending}</div>
            <div class="kpi-text">Lượt HS Chưa Đánh Giá</div>
          </div>
        </div>

        <!-- Detailed Table -->
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 25px;">STT</th>
              <th style="width: 45px;">Cơ sở</th>
              <th style="width: 50px;">Lớp</th>
              <th style="width: 125px; text-align: left;">GVCN Phụ Trách</th>
              <th>Tên Hoạt Động Trải Nghiệm & Chủ Đề</th>
              <th style="width: 105px; text-align: left;">GVBM / TCM Phụ trách</th>
              <th style="width: 35px;">Sĩ số</th>
              <th style="width: 40px;">Đã ĐG</th>
              <th style="width: 40px;">Chưa</th>
              <th style="width: 45px;">Tiến độ</th>
              <th style="width: 85px;">Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            ${mg.rows.length === 0 ? `
              <tr>
                <td colspan="11" style="text-align: center; color: #94a3b8; font-style: italic; padding: 16px;">
                  Không có hoạt động trải nghiệm nào được triển khai trong ${mg.monthName}.
                </td>
              </tr>
            ` : mg.rows.map((r, rIdx) => `
              <tr>
                <td style="text-align: center; font-weight: 700; color: #64748b;">${rIdx + 1}</td>
                <td style="text-align: center; font-weight: 700; color: #003B3A;">${r.campusCode}</td>
                <td style="text-align: center; font-bold; color: #0f172a;"><strong>${r.className}</strong></td>
                <td>
                  <strong style="color: #003B3A;">${r.homeroomTeacherName}</strong>
                  ${r.homeroomTeacherCode && r.homeroomTeacherCode !== "—" ? `<div style="font-size: 7pt; color: #64748b; font-family: monospace;">Mã: ${r.homeroomTeacherCode}</div>` : ""}
                </td>
                <td>
                  <strong>${r.activityName}</strong>
                  <div style="font-size: 7pt; color: #64748b;">Chủ đề: ${r.themeName}</div>
                </td>
                <td style="color: #334155;">${r.subjectTeacherName}</td>
                <td style="text-align: center; font-weight: 700;">${r.totalStudents}</td>
                <td style="text-align: center; font-weight: 700; color: #15803d;">${r.evaluatedCount}</td>
                <td style="text-align: center; font-weight: 700; color: ${r.pendingCount > 0 ? '#b91c1c' : '#64748b'};">${r.pendingCount}</td>
                <td style="text-align: center; font-weight: 800; color: ${r.progressPercent >= 100 ? '#15803d' : '#b45309'};">${r.progressPercent}%</td>
                <td style="text-align: center;">
                  <span class="badge ${r.evalStatusClass}">${r.evalStatusLabel}</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Signatures -->
        <div class="sign-section">
          <div>
            <div class="sign-title">BỘ PHẬN CÔNG TÁC HỌC SINH & HĐNGLL</div>
            <div class="sign-subtitle">(Người lập báo cáo)</div>
            <div class="sign-name">...................................................</div>
          </div>
          <div>
            <div class="sign-title">BAN GIÁM HIỆU / LÃNH ĐẠO CƠ SỞ</div>
            <div class="sign-subtitle">(Ký, duyệt xác nhận)</div>
            <div class="sign-name">...................................................</div>
          </div>
        </div>
      </section>
      `;
    }).join("")}
  </div>

  <script>
    function switchMonth(month) {
      const url = new URL(window.location.href);
      if (month) {
        url.searchParams.set("month", month);
      } else {
        url.searchParams.delete("month");
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
        filename: "${encodeURIComponent(documentTitle).replace(/%/g, '_')}.pdf",
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
    console.error("GET /api/admin/experiential-activities/export-monthly-pdf error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
