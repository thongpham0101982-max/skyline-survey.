import { buildEntranceLetterDownloadUrl, extractCommittedSubjectsListFromNote } from "@/lib/entrance-letter-download";

export interface QuickReportStudentInput {
  id?: string | number;
  studentCode?: string | null;
  fullName?: string | null;
  gender?: string | null;
  grade?: string | number | null;
  surveyFormType?: string | null;
  dateOfBirth?: string | Date | null;
  admissionCampus?: string | null;
  registeredCampus?: string | null;
  admissionResult?: string | null;
  devAssessmentResult?: string | null;
  probationaryResult?: string | null;
  periodId?: string | null;
  periodName?: string | null;
  period?: { name?: string | null } | null;
  batchId?: string | null;
  batchName?: string | null;
  batch?: { name?: string | null; startDate?: string | Date | null; endDate?: string | Date | null } | null;
  committedSubjectsList?: string[] | null;
  committedSubjects?: string[] | string | null;
  directorNote?: string | null;
  notes?: string | null;
  comment?: string | null;
}

export interface BuildQuickReportEmailParams {
  level: "high" | "preschool";
  subject: string;
  periodName: string;
  batchName: string;
  batchDateRange: string;
  campusName: string;
  originUrl: string;
  students: QuickReportStudentInput[];
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function extractCommittedSubjectsFromStudent(s: QuickReportStudentInput | any): string {
  if (Array.isArray(s?.committedSubjectsList) && s.committedSubjectsList.length > 0) {
    return s.committedSubjectsList.join(", ");
  }
  if (Array.isArray(s?.committedSubjects) && s.committedSubjects.length > 0) {
    return s.committedSubjects.join(", ");
  }
  if (typeof s?.committedSubjects === "string" && s.committedSubjects.trim()) {
    return s.committedSubjects.trim();
  }
  const fromNote = extractCommittedSubjectsListFromNote(s?.directorNote || s?.notes || s?.comment);
  if (fromNote.length > 0) {
    return fromNote.join(", ");
  }
  return "Không";
}

export function formatGenderLabel(g: unknown): string {
  const val = String(g || "").trim().toUpperCase();
  if (val === "M" || val === "MALE" || val === "NAM") return "Nam";
  if (val === "F" || val === "FEMALE" || val === "NỮ" || val === "NU") return "Nữ";
  return "—";
}

export function formatShortDate(d: unknown): string {
  if (!d) return "";
  const dt = new Date(d as string | number | Date);
  if (!isNaN(dt.getTime())) {
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  }
  return String(d);
}

export function isQuickReportStudentPassed(s: QuickReportStudentInput | any): boolean {
  const r = String(s?.admissionResult || s?.devAssessmentResult || "").trim();
  return (
    (r.includes("Đạt") && !r.includes("Không")) ||
    (r.includes("Dat") && !r.includes("Khong")) ||
    r.includes("DAT") ||
    r.includes("MIEN") ||
    r.includes("MIỄN") ||
    s?.probationaryResult === "DAT"
  );
}

interface NormalizedStudentRow {
  idx: number;
  studentCode: string;
  fullName: string;
  gender: string;
  gradeLabel: string;
  systemLabel: string;
  dobStr: string;
  campusStr: string;
  studentBatchLabel: string;
  resText: string;
  resColor: string;
  resBg: string;
  resBorder: string;
  isPassed: boolean;
  committedSubjectsText: string;
  hasCommitment: boolean;
  thuChucMungUrl: string;
  camKetUrl: string;
}

function normalizeStudentRow(
  s: QuickReportStudentInput,
  idx: number,
  effectiveBatchName: string,
  originUrl: string,
  level: "high" | "preschool"
): NormalizedStudentRow {
  const gender = formatGenderLabel(s.gender);
  const gradeLabel = s.grade
    ? level === "preschool"
      ? String(s.grade)
      : String(s.grade).startsWith("K")
        ? String(s.grade)
        : `K${s.grade}`
    : "—";
  const systemLabel = s.surveyFormType || "—";
  const studentBatchLabel = s?.batch?.name || s?.batchName || effectiveBatchName || "—";
  const r = String(s.admissionResult || s.devAssessmentResult || (s.probationaryResult === "DAT" ? "Đạt" : "")).trim();

  let resText = r || "Chưa duyệt";
  let resColor = "#475569";
  let resBg = "#F1F5F9";
  let resBorder = "#CBD5E1";

  if ((r.includes("Dat") && r.includes("cam ket")) || (r.includes("Đạt") && r.includes("cam kết"))) {
    resText = r;
    resColor = "#B45309";
    resBg = "#FFFBEB";
    resBorder = "#FDE68A";
  } else if (
    ((r.includes("Dat") || r.includes("Đạt")) && !r.includes("Không") && !r.includes("Khong")) ||
    r.includes("DAT") ||
    r.includes("MIEN") ||
    r.includes("MIỄN")
  ) {
    resText = r;
    resColor = "#047857";
    resBg = "#ECFDF5";
    resBorder = "#A7F3D0";
  } else if (r.includes("Khong dat") || r.includes("KHONG DAT") || r.includes("Không đạt") || r.includes("KHÔNG ĐẠT")) {
    resText = r;
    resColor = "#BE123C";
    resBg = "#FFF1F2";
    resBorder = "#FECDD3";
  } else if (r.includes("Hoc thu") || r.includes("Học thử")) {
    resText = r;
    resColor = "#0369A1";
    resBg = "#F0F9FF";
    resBorder = "#BAE6FD";
  }

  const isPassed = isQuickReportStudentPassed(s);
  const committedSubjectsText = extractCommittedSubjectsFromStudent(s);
  const hasCommitment =
    isPassed &&
    (r.toLowerCase().includes("cam kết") ||
      r.toLowerCase().includes("cam ket") ||
      (committedSubjectsText !== "" && committedSubjectsText !== "—" && committedSubjectsText !== "Không"));

  const studentRawId = String(s.id || s.studentCode || "");
  const thuChucMungUrl = buildEntranceLetterDownloadUrl({
    originUrl,
    studentId: studentRawId,
    docType: "thu_chuc_mung",
    level,
  });
  const camKetUrl = buildEntranceLetterDownloadUrl({
    originUrl,
    studentId: studentRawId,
    docType: "cam_ket_hoc_tap",
    level,
  });

  return {
    idx,
    studentCode: s.studentCode || "—",
    fullName: s.fullName || "—",
    gender,
    gradeLabel,
    systemLabel,
    dobStr: formatShortDate(s.dateOfBirth),
    campusStr: s.admissionCampus || s.registeredCampus || "",
    studentBatchLabel,
    resText,
    resColor,
    resBg,
    resBorder,
    isPassed,
    committedSubjectsText,
    hasCommitment,
    thuChucMungUrl,
    camKetUrl,
  };
}

export function buildQuickReportEmailHtml(params: BuildQuickReportEmailParams): string {
  const { level, subject, periodName, batchName, batchDateRange, campusName, originUrl, students } = params;
  const isPreschool = level === "preschool";

  const rows = students.map((s, idx) => normalizeStudentRow(s, idx, batchName, originUrl, level));
  const totalStudents = rows.length;
  const totalPassed = rows.filter((r) => r.isPassed).length;
  const totalPendingOrFailed = totalStudents - totalPassed;
  const passRate = totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0;

  const uniqueBatchLabels = Array.from(new Set(rows.map((r) => r.studentBatchLabel).filter((b) => b && b !== "—")));
  const showBatchPerStudent = uniqueBatchLabels.length > 1;

  const desktopRowsHtml = rows
    .map((row) => {
      const rowBg = row.idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      const subParts = [
        row.studentCode !== "—" ? `<span style="color:#00736E; font-family:Consolas, 'Courier New', monospace; font-weight:700;">${escapeHtml(row.studentCode)}</span>` : "",
        row.dobStr ? `NS: ${escapeHtml(row.dobStr)}` : "",
        row.campusStr ? `CS: ${escapeHtml(row.campusStr)}` : "",
      ].filter(Boolean);

      const gradeSystemText = [row.gradeLabel, row.systemLabel].filter((v) => v && v !== "—").join(" · ") || "—";

      const actionButtons: string[] = [];
      if (row.isPassed) {
        actionButtons.push(
          `<a href="${escapeHtml(row.thuChucMungUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:6px 10px; border-radius:6px; font-size:11px; font-weight:700; color:#047857; background-color:#ECFDF5; border:1px solid #6EE7B7; text-decoration:none; white-space:nowrap;">&#8595; Thư chúc mừng</a>`
        );
      }
      if (row.hasCommitment) {
        actionButtons.push(
          `<a href="${escapeHtml(row.camKetUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:6px 10px; border-radius:6px; font-size:11px; font-weight:700; color:#B45309; background-color:#FFFBEB; border:1px solid #FCD34D; text-decoration:none; white-space:nowrap;${actionButtons.length > 0 ? " margin-top:5px;" : ""}">&#8595; Bản cam kết</a>`
        );
      }
      const actionsHtml =
        actionButtons.length > 0
          ? actionButtons.join("")
          : `<span style="color:#94A3B8; font-size:11px;">—</span>`;

      const committedDisplay =
        row.committedSubjectsText && row.committedSubjectsText !== "Không" && row.committedSubjectsText !== "—"
          ? `<span style="color:#B45309; font-weight:600;">${escapeHtml(row.committedSubjectsText)}</span>`
          : `<span style="color:#94A3B8;">—</span>`;

      return `<tr bgcolor="${rowBg}" style="background-color:${rowBg};">
        <td align="center" style="padding:11px 6px; font-size:12px; font-weight:600; color:#64748B; border-bottom:1px solid #E2E8F0; vertical-align:middle; font-variant-numeric:tabular-nums;">${row.idx + 1}</td>
        <td style="padding:11px 10px; border-bottom:1px solid #E2E8F0; vertical-align:middle;">
          <div style="font-size:13px; font-weight:700; color:#003B3A; line-height:1.35;">${escapeHtml(row.fullName)}</div>
          ${subParts.length > 0 ? `<div style="font-size:11px; color:#64748B; margin-top:3px; line-height:1.4;">${subParts.join(" &bull; ")}</div>` : ""}
          ${showBatchPerStudent ? `<div style="font-size:10.5px; font-weight:600; color:#0F766E; margin-top:2px;">Đợt: ${escapeHtml(row.studentBatchLabel)}</div>` : ""}
        </td>
        <td align="center" style="padding:11px 8px; border-bottom:1px solid #E2E8F0; vertical-align:middle; white-space:nowrap;">
          <div style="font-size:12px; font-weight:700; color:#1E293B;">${escapeHtml(gradeSystemText)}</div>
          ${row.gender !== "—" ? `<div style="font-size:11px; color:#64748B; margin-top:2px;">${escapeHtml(row.gender)}</div>` : ""}
        </td>
        <td align="center" style="padding:11px 8px; border-bottom:1px solid #E2E8F0; vertical-align:middle;">
          <span style="display:inline-block; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; color:${row.resColor}; background-color:${row.resBg}; border:1px solid ${row.resBorder}; white-space:nowrap;">${escapeHtml(row.resText)}</span>
        </td>
        <td style="padding:11px 10px; font-size:11.5px; line-height:1.45; border-bottom:1px solid #E2E8F0; vertical-align:middle;">
          ${committedDisplay}
        </td>
        <td align="center" style="padding:11px 10px; border-bottom:1px solid #E2E8F0; vertical-align:middle; width:136px;">
          ${actionsHtml}
        </td>
      </tr>`;
    })
    .join("");

  const mobileCardsHtml = rows
    .map((row) => {
      const metaItems = [
        row.studentCode !== "—" ? `<span style="color:#00736E; font-family:Consolas, 'Courier New', monospace; font-weight:700;">${escapeHtml(row.studentCode)}</span>` : "",
        row.gradeLabel !== "—" ? escapeHtml(row.gradeLabel) : "",
        row.systemLabel !== "—" ? escapeHtml(row.systemLabel) : "",
        row.gender !== "—" ? escapeHtml(row.gender) : "",
        row.dobStr ? `NS: ${escapeHtml(row.dobStr)}` : "",
        row.campusStr ? `CS: ${escapeHtml(row.campusStr)}` : "",
      ].filter(Boolean);

      const showCommittedBox =
        row.committedSubjectsText && row.committedSubjectsText !== "Không" && row.committedSubjectsText !== "—";

      let mobileButtonsHtml = "";
      if (row.isPassed && row.hasCommitment) {
        mobileButtonsHtml = `
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:10px;">
            <tr>
              <td width="49%" style="padding-right:4px;">
                <a href="${escapeHtml(row.thuChucMungUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:9px 8px; border-radius:8px; font-size:12px; font-weight:700; color:#047857; background-color:#ECFDF5; border:1px solid #6EE7B7; text-decoration:none;">&#8595; Thư chúc mừng</a>
              </td>
              <td width="2%"></td>
              <td width="49%" style="padding-left:4px;">
                <a href="${escapeHtml(row.camKetUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:9px 8px; border-radius:8px; font-size:12px; font-weight:700; color:#B45309; background-color:#FFFBEB; border:1px solid #FCD34D; text-decoration:none;">&#8595; Bản cam kết</a>
              </td>
            </tr>
          </table>`;
      } else if (row.isPassed) {
        mobileButtonsHtml = `
          <div style="margin-top:10px;">
            <a href="${escapeHtml(row.thuChucMungUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:9px 12px; border-radius:8px; font-size:12px; font-weight:700; color:#047857; background-color:#ECFDF5; border:1px solid #6EE7B7; text-decoration:none;">&#8595; Tải Thư chúc mừng (PDF A4)</a>
          </div>`;
      } else if (row.hasCommitment) {
        mobileButtonsHtml = `
          <div style="margin-top:10px;">
            <a href="${escapeHtml(row.camKetUrl)}" target="_blank" rel="noopener noreferrer" style="display:block; text-align:center; padding:9px 12px; border-radius:8px; font-size:12px; font-weight:700; color:#B45309; background-color:#FFFBEB; border:1px solid #FCD34D; text-decoration:none;">&#8595; Tải Bản cam kết (PDF A4)</a>
          </div>`;
      }

      return `<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="background-color:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:10px;">
        <tr>
          <td style="padding:12px 14px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top; padding-right:8px;">
                  <div style="font-size:14px; font-weight:700; color:#003B3A; line-height:1.35;">
                    <span style="color:#64748B; font-size:12px; font-weight:600; margin-right:4px;">#${row.idx + 1}</span>${escapeHtml(row.fullName)}
                  </div>
                </td>
                <td align="right" style="vertical-align:top; white-space:nowrap;">
                  <span style="display:inline-block; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; color:${row.resColor}; background-color:${row.resBg}; border:1px solid ${row.resBorder}; white-space:nowrap;">${escapeHtml(row.resText)}</span>
                </td>
              </tr>
            </table>
            ${metaItems.length > 0 ? `<div style="font-size:11.5px; color:#475569; margin-top:5px; line-height:1.5;">${metaItems.join(" &bull; ")}</div>` : ""}
            ${showBatchPerStudent ? `<div style="font-size:11px; font-weight:600; color:#0F766E; margin-top:3px;">Đợt: ${escapeHtml(row.studentBatchLabel)}</div>` : ""}
            ${showCommittedBox ? `<div style="margin-top:8px; padding:7px 10px; background-color:#FFFBEB; border:1px solid #FDE68A; border-radius:6px; font-size:11.5px; color:#92400E; line-height:1.45;"><strong>Môn cam kết:</strong> ${escapeHtml(row.committedSubjectsText)}</div>` : ""}
            ${mobileButtonsHtml}
          </td>
        </tr>
      </table>`;
    })
    .join("");

  const eyebrowLabel = isPreschool
    ? "Bậc Mầm non &bull; Hệ thống Giáo dục Sky-Line"
    : "Hệ thống Giáo dục Sky-Line";
  const mainTitle = isPreschool
    ? "Báo cáo kết quả khảo sát đầu vào Mầm non theo đợt"
    : "Báo cáo kết quả khảo sát đầu vào theo đợt";
  const totalUnitLabel = isPreschool ? "Tổng số bé" : "Tổng số học sinh";
  const listHeadingLabel = isPreschool
    ? `Danh sách kết quả khảo sát (${totalStudents} bé)`
    : `Danh sách kết quả từng học sinh (${totalStudents} học sinh)`;
  const pendingColor = totalPendingOrFailed > 0 ? "#E11D48" : "#64748B";

  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F1F5F9; }
  .mobile-only { display: none; max-height: 0; overflow: hidden; mso-hide: all; }
  @media only screen and (max-width: 640px) {
    .outer-pad { padding: 10px 8px !important; }
    .card-shell { border-radius: 12px !important; }
    .header-pad { padding: 20px 16px !important; }
    .header-title { font-size: 17px !important; }
    .section-pad { padding: 14px 14px !important; }
    .stack-col { display: block !important; width: 100% !important; padding-right: 0 !important; text-align: left !important; }
    .stack-col-gap { padding-top: 10px !important; border-top: 1px solid #E2E8F0 !important; margin-top: 10px !important; }
    .kpi-cell { padding: 12px 6px !important; }
    .kpi-value { font-size: 20px !important; }
    .kpi-label { font-size: 10.5px !important; }
    .desktop-only { display: none !important; max-height: 0 !important; overflow: hidden !important; }
    .mobile-only { display: block !important; max-height: none !important; overflow: visible !important; }
    .footer-pad { padding: 16px 14px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0F172A;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9;">
  <tr>
    <td align="center" class="outer-pad" style="padding:20px 12px;">
      <!--[if mso]>
      <table role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="780">
      <tr><td>
      <![endif]-->
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" class="card-shell" style="max-width:780px; width:100%; background-color:#FFFFFF; border-radius:14px; overflow:hidden; border:1px solid #E2E8F0; box-shadow:0 2px 12px rgba(0,59,58,0.06);">

        <!-- HEADER MASTHEAD -->
        <tr>
          <td bgcolor="#003B3A" class="header-pad" style="background-color:#003B3A; padding:22px 26px; border-bottom:3px solid #00A19A; text-align:left;">
            <div style="font-size:11px; font-weight:700; color:#5EEAD4; letter-spacing:0.3px; margin-bottom:6px;">
              ${eyebrowLabel}
            </div>
            <h1 class="header-title" style="margin:0; font-size:19px; font-weight:800; line-height:1.3; color:#FFFFFF;">
              ${mainTitle}
            </h1>
            <div style="font-size:12px; color:#CCFBF1; margin-top:4px; font-weight:500;">
              Hệ thống Khảo sát Năng lực Đầu vào Sky-Line
            </div>
          </td>
        </tr>

        <!-- METADATA STRIP -->
        <tr>
          <td bgcolor="#F8FAFC" class="section-pad" style="padding:16px 26px; background-color:#F8FAFC; border-bottom:1px solid #E2E8F0;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" class="stack-col" style="vertical-align:top; padding-right:12px;">
                  <div style="font-size:11px; font-weight:600; color:#64748B;">Kỳ khảo sát</div>
                  <div style="font-size:13.5px; font-weight:700; color:#003B3A; margin-top:2px; line-height:1.35;">${escapeHtml(periodName)}</div>
                  ${campusName ? `<div style="font-size:11.5px; font-weight:500; color:#0F766E; margin-top:3px;">Cơ sở: ${escapeHtml(campusName)}</div>` : ""}
                </td>
                <td width="52%" align="right" class="stack-col stack-col-gap" style="vertical-align:top;">
                  <div style="font-size:11px; font-weight:600; color:#64748B;">Đợt khảo sát</div>
                  <div style="font-size:13.5px; font-weight:700; color:#003B3A; margin-top:2px; line-height:1.35;">${escapeHtml(batchName)}</div>
                  ${batchDateRange ? `<div style="font-size:11.5px; font-weight:500; color:#0F766E; margin-top:3px;">Thời gian: ${escapeHtml(batchDateRange)}</div>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- UNIFIED KPI LEDGER STRIP -->
        <tr>
          <td class="section-pad" style="padding:18px 26px 8px 26px; background-color:#FFFFFF;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0; border-radius:10px; background-color:#FFFFFF; border-collapse:separate; overflow:hidden;">
              <tr>
                <td width="33.33%" align="center" class="kpi-cell" style="padding:14px 10px; border-right:1px solid #E2E8F0; vertical-align:middle;">
                  <div class="kpi-label" style="font-size:11px; font-weight:600; color:#64748B;">${totalUnitLabel}</div>
                  <div class="kpi-value" style="font-size:24px; font-weight:800; color:#003B3A; margin-top:3px; line-height:1.15; font-variant-numeric:tabular-nums;">${totalStudents}</div>
                </td>
                <td width="33.34%" align="center" class="kpi-cell" style="padding:14px 10px; border-right:1px solid #E2E8F0; background-color:#F0FDF4; vertical-align:middle;">
                  <div class="kpi-label" style="font-size:11px; font-weight:600; color:#065F46;">Đạt / Trúng tuyển</div>
                  <div class="kpi-value" style="font-size:24px; font-weight:800; color:#059669; margin-top:3px; line-height:1.15; font-variant-numeric:tabular-nums;">${totalPassed}</div>
                  <div style="font-size:10.5px; font-weight:600; color:#047857; margin-top:2px; font-variant-numeric:tabular-nums;">Tỷ lệ ${passRate}%</div>
                </td>
                <td width="33.33%" align="center" class="kpi-cell" style="padding:14px 10px; vertical-align:middle;">
                  <div class="kpi-label" style="font-size:11px; font-weight:600; color:#64748B;">Chưa đạt / Chờ duyệt</div>
                  <div class="kpi-value" style="font-size:24px; font-weight:800; color:${pendingColor}; margin-top:3px; line-height:1.15; font-variant-numeric:tabular-nums;">${totalPendingOrFailed}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STUDENT RESULTS SECTION -->
        <tr>
          <td class="section-pad" style="padding:14px 26px 24px 26px; background-color:#FFFFFF;">
            <h2 style="font-size:14px; font-weight:700; color:#003B3A; border-left:4px solid #003B3A; padding-left:10px; margin:0 0 12px 0; line-height:1.3;">
              ${listHeadingLabel}
            </h2>

            <!-- DESKTOP ACADEMIC LEDGER TABLE -->
            <div class="desktop-only" style="border:1px solid #E2E8F0; border-radius:10px; overflow:hidden;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%; font-variant-numeric:tabular-nums;">
                <thead>
                  <tr bgcolor="#003B3A" style="background-color:#003B3A;">
                    <th align="center" style="padding:10px 6px; font-size:11px; font-weight:600; color:#CCFBF1; width:36px; white-space:nowrap;">STT</th>
                    <th align="left" style="padding:10px 10px; font-size:11px; font-weight:600; color:#FFFFFF; white-space:nowrap;">Học sinh</th>
                    <th align="center" style="padding:10px 8px; font-size:11px; font-weight:600; color:#CCFBF1; width:88px; white-space:nowrap;">Khối / Hệ</th>
                    <th align="center" style="padding:10px 8px; font-size:11px; font-weight:600; color:#5EEAD4; width:108px; white-space:nowrap;">Kết quả</th>
                    <th align="left" style="padding:10px 10px; font-size:11px; font-weight:600; color:#FDE68A; width:130px; white-space:nowrap;">Môn cam kết</th>
                    <th align="center" style="padding:10px 10px; font-size:11px; font-weight:600; color:#FFFFFF; width:136px; white-space:nowrap;">Văn bản PDF</th>
                  </tr>
                </thead>
                <tbody>
                  ${desktopRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- MOBILE STUDENT CARDS (<= 640px) -->
            <!--[if !mso]><!-->
            <div class="mobile-only" style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
              ${mobileCardsHtml}
            </div>
            <!--<![endif]-->

            <!-- HELPER CALLOUT -->
            <div style="margin-top:14px; padding:10px 14px; background-color:#F0FDFA; border:1px solid #CCFBF1; border-left:4px solid #00A19A; border-radius:8px; font-size:11.5px; color:#0F766E; line-height:1.55;">
              <strong>Tải nhanh văn bản dành cho Bộ phận Tư vấn:</strong> Bấm trực tiếp vào nút <strong>&#8595; Thư chúc mừng</strong> hoặc <strong>&#8595; Bản cam kết</strong> trên từng học sinh để tải ngay file <strong>PDF chuẩn in A4</strong> về máy (không cần đăng nhập hệ thống).
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#003B3A" class="footer-pad" style="background-color:#003B3A; border-top:3px solid #00A19A; padding:18px 26px; text-align:center; font-size:11px; color:#CCFBF1; line-height:1.6;">
            <div style="font-weight:700; color:#FFFFFF; font-size:12px;">
              Hệ thống Giáo dục Sky-Line (Sky-Line Education System)
            </div>
            <div style="color:#99F6E4; font-weight:500; margin-top:2px;">
              Ban Đào tạo &amp; Khảo thí Đảm bảo Chất lượng Giáo dục
            </div>
            <div style="color:#5EEAD4; margin-top:6px; font-size:10.5px;">
              Email: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:600;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:600;">skylineschool.edu.vn</a>
            </div>
          </td>
        </tr>

      </table>
      <!--[if mso]>
      </td></tr></table>
      <![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}
