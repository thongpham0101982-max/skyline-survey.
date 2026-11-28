import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  BM_SHEET_STATUS_OPTIONS,
  COMMON_PRIVACY_DISCLAIMER,
  DEFAULT_SIGNATURE_COLUMNS,
  FURTHER_INQUIRY_OPTIONS,
  FurtherInquiryTopicCode,
  PvdhExportLayoutConfig,
  PvdhFieldConfig,
  PvdhFollowUpActionItem,
  PvdhInterviewItemValue,
  PvdhSectionConfig,
  PvdhTeacherSummaryD,
  formatFollowUpActionsToText,
  isBmKtdbclTemplate,
} from "./constants";
import { sanitizeSpreadsheetCell } from "./validation";

let cachedSkylineLogoDataUri: string | null = null;
function getSkylineLogoDataUri(): string {
  if (cachedSkylineLogoDataUri !== null) return cachedSkylineLogoDataUri;
  try {
    const logoPath = path.resolve(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const b64 = fs.readFileSync(logoPath).toString("base64");
      cachedSkylineLogoDataUri = `data:image/png;base64,${b64}`;
      return cachedSkylineLogoDataUri;
    }
  } catch {
    // Fallback text brand if logo file is inaccessible
  }
  cachedSkylineLogoDataUri = "";
  return cachedSkylineLogoDataUri;
}

export interface PvdhRenderPayload {
  recordId: string;
  attemptNumber: number;
  templateCode: string;
  templateName: string;
  templateVersionCode: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentDob?: string | Date | null;
  grade: string;
  programName?: string | null;
  oldSchoolAndClass?: string | null;
  registeredCampus?: string | null;
  periodCode?: string | null;
  periodName?: string | null;
  academicYearName?: string | null;
  interviewDate?: string | null;
  studentInterviewerName?: string | null;
  studentInterviewerTitle?: string | null;
  parentInterviewerName?: string | null;
  parentInterviewerTitle?: string | null;
  parentFullName?: string | null;
  parentRelationship?: string | null;
  parentContactChannel?: string | null;
  sections: PvdhSectionConfig[];
  fields: PvdhFieldConfig[];
  exportLayout: PvdhExportLayoutConfig;
  studentResponses: Record<string, PvdhInterviewItemValue>;
  obsStrengthsInterests?: string | null;
  obsCommunicationStyle?: string | null;
  obsParticipationLevel?: string | null;
  obsSupportNeeds?: string | null;
  parentResponses: Record<string, PvdhInterviewItemValue>;
  teacherSummary?: PvdhTeacherSummaryD | null;
  planStrengthsPriority?: string | null;
  planGoalsActionsText?: string | null;
  followUpActions?: PvdhFollowUpActionItem[];
  planCoordinator?: string | null;
  planReviewDate?: string | null;
  planFurtherTopics: FurtherInquiryTopicCode[];
  planFurtherOtherText?: string | null;
  planReferralReason?: string | null;
  planReferralReceiver?: string | null;
  planHandoverNotes?: string | null;
  workflowStatus: string;
  isLocked: boolean;
  confirmationType?: "NONE" | "SYSTEM_CONFIRMATION" | "SIGNATURE_IMAGE" | "CERTIFICATE_CA" | string | null;
  confirmedByName?: string | null;
  confirmedByRole?: string | null;
  signatureImageBase64?: string | null;
  confirmedAt?: Date | string | null;
  confirmedSnapshotHash?: string | null;
}

function escapeHtml(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeWithLineBreaks(val: unknown): string {
  return escapeHtml(val).replace(/\r?\n/g, "<br/>");
}

export function formatViDate(val: Date | string | null | undefined): string {
  if (!val) return "....../....../..........";
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [yyyy, mm, dd] = s.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = val instanceof Date ? val : new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatViDateTime(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi} ${dd}/${mm}/${yyyy}`;
}

export function sanitizeSafeFileToken(raw: string | null | undefined, fallback: string): string {
  const cleaned = String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

/**
 * Tên file PDF tuyệt đối chỉ dùng Mã mẫu + Mã hồ sơ + Mã đợt + Phiên bản
 * KHÔNG nhúng SĐT hoặc thông tin sức khỏe vào tên file.
 */
export function buildPvdhPdfFileName(params: {
  templateCode: string;
  studentCode?: string | null;
  studentId: string;
  periodCode?: string | null;
  versionCode?: string | null;
  attemptNumber?: number;
}): string {
  const tpl = sanitizeSafeFileToken(params.templateCode, "PVDH");
  const stu = sanitizeSafeFileToken(params.studentCode || params.studentId, "HS");
  const per = sanitizeSafeFileToken(params.periodCode || "DOT", "DOT");
  const ver = sanitizeSafeFileToken(params.versionCode || "v1_0", "v1_0");
  const att = params.attemptNumber && params.attemptNumber > 1 ? `_lan${params.attemptNumber}` : "";
  return `${tpl}_${stu}_${per}_${ver}${att}.pdf`;
}

function renderInterviewGroupHtml(
  field: PvdhFieldConfig,
  entry: PvdhInterviewItemValue | undefined,
  studentGradeNum: string
): string {
  const hasAnswer = Boolean(String(entry?.responseText || "").trim());
  const isNotRecorded = Boolean(entry?.notRecorded);
  const emphasisNote = field.visibilityCondition?.gradeEmphasisNote?.[studentGradeNum];

  let bodyHtml = "";
  if (isNotRecorded) {
    const reason = String(entry?.notRecordedReason || "").trim();
    bodyHtml = `<div class="answer-box answer-unrecorded"><strong>Chưa ghi nhận</strong>${
      reason ? ` — Lý do: ${escapeWithLineBreaks(reason)}` : ""
    }</div>`;
  } else if (hasAnswer) {
    bodyHtml = `<div class="answer-box">${escapeWithLineBreaks(entry?.responseText)}</div>`;
  } else {
    bodyHtml = `<div class="answer-box answer-empty">(Chưa nhập thông tin)</div>`;
  }

  return `
    <div class="question-block">
      <div class="question-title">${field.itemNumber ? `${field.itemNumber}. ` : ""}${escapeHtml(field.label)}</div>
      ${field.promptQuestion ? `<div class="question-prompt">${escapeHtml(field.promptQuestion)}</div>` : ""}
      ${emphasisNote ? `<div class="question-emphasis">${escapeHtml(emphasisNote)}</div>` : ""}
      ${bodyHtml}
    </div>
  `;
}

function formatBmInterviewDate(val: Date | string | null | undefined): string {
  if (!val) return "....../....../20......";
  const s = String(val).trim();
  if (!s) return "....../....../20......";
  return formatViDate(val);
}

function resolveBmAcademicYearDisplay(payload: PvdhRenderPayload): string {
  const explicit = String(payload.academicYearName || "").trim();
  if (explicit) return explicit;
  const fromPeriod = String(payload.periodName || "").match(/20\d{2}\s*[-–/]\s*20\d{2}/);
  if (fromPeriod) return fromPeriod[0];
  return "";
}

function renderBmItemLineHtml(
  field: PvdhFieldConfig,
  entry: PvdhInterviewItemValue | undefined
): string {
  const hasAnswer = Boolean(String(entry?.responseText || "").trim());
  const isNotRecorded = Boolean(entry?.notRecorded);
  const prompt = String(field.promptQuestion || "").trim();

  let answerHtml = "";
  if (isNotRecorded) {
    const reason = String(entry?.notRecordedReason || "").trim();
    answerHtml = `<div class="bm-answer bm-answer-filled"><em>Chưa ghi nhận${
      reason ? ` — Lý do: ${escapeWithLineBreaks(reason)}` : ""
    }</em></div>`;
  } else if (hasAnswer) {
    answerHtml = `<div class="bm-answer bm-answer-filled">${escapeWithLineBreaks(entry?.responseText)}</div>`;
  } else {
    answerHtml = `<div class="bm-answer bm-answer-dots"></div>`;
  }

  return `
    <div class="bm-q-item">
      <div class="bm-q-head">
        <strong>${escapeHtml(field.label)}</strong>${prompt ? ` <span>${escapeHtml(prompt)}</span>` : ""}
      </div>
      ${answerHtml}
    </div>
  `;
}

function renderBmTeacherDItemHtml(label: string, value: string | null | undefined): string {
  const text = String(value || "").trim();
  return `
    <div class="bm-q-item">
      <div class="bm-q-head"><strong>${escapeHtml(label)}</strong></div>
      ${
        text
          ? `<div class="bm-answer bm-answer-filled">${escapeWithLineBreaks(text)}</div>`
          : `<div class="bm-answer bm-answer-dots"></div>`
      }
    </div>
  `;
}

/**
 * Dựng HTML chuẩn A4 bám sát 100% biểu mẫu chính thức BM.KTĐBCL.31 (Khối 1) & BM.KTĐBCL.32 (Khối 2)
 * Tuyệt đối không chèn bất kỳ trường hoặc mục nào ngoài nội dung trên phiếu gốc.
 */
function buildBmKtdbclDocumentHtml(payload: PvdhRenderPayload): string {
  const gradeClean = String(payload.grade || "1").replace(/^khối\s*/i, "").trim() || "1";
  const layout = payload.exportLayout || ({} as PvdhExportLayoutConfig);
  const parsedGradeInt = Number(gradeClean);
  const formCodeBox =
    layout.formCodeBox ||
    (Number.isInteger(parsedGradeInt) && parsedGradeInt >= 1 && parsedGradeInt <= 12
      ? `BM.KTĐBCL.${30 + parsedGradeInt}`
      : "BM.KTĐBCL.31");
  const headerSubtitle = layout.headerSubtitle || `(Dành cho khối ${gradeClean})`;
  const ownerUnit = layout.ownerUnit || "Ban Khảo thí & Đảm bảo chất lượng";
  const headerGuideLine =
    layout.headerGuideLine ||
    "Hướng dẫn: Hỏi mở, tôn trọng ý kiến HS/PHHS; ghi nhận nguồn thông tin, không tự quy đổi thành điểm xét tuyển.";
  const footerText = layout.internalFooterText || "SSM Sky-Line | Phiếu lưu hành nội bộ";

  const logoUri = getSkylineLogoDataUri();
  const logoHtml = logoUri
    ? `<img src="${logoUri}" alt="SKY-LINE" class="bm-logo-img" />`
    : `<div class="bm-logo-fallback">SKY-LINE</div>`;

  const renderHeaderBox = () => `
    <table class="bm-header-table">
      <tr>
        <td rowspan="2" class="bm-header-logo">${logoHtml}</td>
        <td class="bm-header-title-cell">
          <div class="bm-header-title">PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ<br/>TRAO ĐỔI VỚI PHỤ HUYNH</div>
          <div class="bm-header-sub">${escapeHtml(headerSubtitle)}</div>
        </td>
        <td rowspan="2" class="bm-header-code">${escapeHtml(formCodeBox)}</td>
      </tr>
      <tr>
        <td class="bm-header-owner">Đơn vị sở hữu: ${escapeHtml(ownerUnit)}</td>
      </tr>
    </table>
  `;

  const secMap = new Map((payload.sections || []).map((s) => [s.sectionCode, s]));
  const secA = secMap.get("II_STUDENT");
  const secB = secMap.get("IV_PARENT");
  const secC = secMap.get("C_PARENT_GRADE");
  const secD = secMap.get("D_TEACHER_SUMMARY");

  const fieldsA = (payload.fields || [])
    .filter((f) => f.sectionCode === "II_STUDENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fieldsB = (payload.fields || [])
    .filter((f) => f.sectionCode === "IV_PARENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fieldsC = (payload.fields || [])
    .filter((f) => f.sectionCode === "C_PARENT_GRADE")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fieldsDText = (payload.fields || [])
    .filter((f) => f.sectionCode === "D_TEACHER_SUMMARY" && f.dataType === "TEXTAREA")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const summary = payload.teacherSummary || {
    d01: "",
    d02: "",
    d03: "",
    d04: "",
    sheetStatus: "",
    psychInterviewRequested: false,
  };

  const dValByKey: Record<string, string | null | undefined> = {
    d01: summary.d01,
    d02: summary.d02,
    d03: summary.d03,
    d04: summary.d04,
  };

  const academicYearVal = resolveBmAcademicYearDisplay(payload);
  const executorName =
    payload.confirmedByName || payload.studentInterviewerName || payload.parentInterviewerName || "";
  const sigCol = layout.signatureColumns?.[0] || {
    key: "TEACHER_EXECUTOR",
    title: "Giáo viên thực hiện",
    subtitle: "(Kí và ghi rõ họ tên)",
  };

  const statusOptionsHtml = BM_SHEET_STATUS_OPTIONS.map((opt) => {
    const checked = summary.sheetStatus === opt.code;
    return `<span class="bm-status-opt"><span class="bm-chk-square">${checked ? "☑" : "☐"}</span> ${escapeHtml(opt.label)}</span>`;
  }).join("");

  const renderInlineField = (label: string, val: string | null | undefined, flexGrow = 1) => {
    const clean = String(val || "").trim();
    return `
      <span class="bm-info-seg" style="flex: ${flexGrow};">
        <span class="bm-info-lbl">${escapeHtml(label)}</span>
        <span class="bm-info-fill ${clean ? "has-val" : ""}">${clean ? escapeHtml(clean) : "&nbsp;"}</span>
      </span>
    `;
  };

  const interviewDateFormatted = formatBmInterviewDate(payload.interviewDate);
  const hasRealDate = Boolean(String(payload.interviewDate || "").trim());

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(formCodeBox)} - ${escapeHtml(payload.studentName)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 11mm 14mm 11mm 14mm;
  }
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", "Cambria", "DejaVu Serif", Georgia, serif;
    font-size: 10.5pt;
    line-height: 1.38;
    color: #111827;
    background: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .bm-page {
    display: flex;
    flex-direction: column;
    min-height: 268mm;
    justify-content: space-between;
  }
  .bm-page-break {
    page-break-before: always;
    break-before: page;
  }
  .bm-header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  .bm-header-table td {
    border: 1px solid #374151;
    padding: 5px 8px;
    vertical-align: middle;
  }
  .bm-header-logo {
    width: 21%;
    text-align: center;
  }
  .bm-logo-img {
    max-width: 108px;
    max-height: 44px;
    object-fit: contain;
    display: inline-block;
  }
  .bm-logo-fallback {
    font-family: Arial, sans-serif;
    font-weight: 800;
    font-size: 13pt;
    color: #008B85;
    letter-spacing: 0.04em;
  }
  .bm-header-title-cell {
    width: 59%;
    text-align: center;
    padding: 6px 10px;
  }
  .bm-header-title {
    font-size: 10.5pt;
    font-weight: 700;
    line-height: 1.28;
    color: #111827;
  }
  .bm-header-sub {
    font-size: 10pt;
    font-weight: 700;
    margin-top: 1px;
  }
  .bm-header-owner {
    text-align: center;
    font-size: 9.5pt;
    padding: 3px 8px !important;
  }
  .bm-header-code {
    width: 20%;
    text-align: center;
    font-size: 10pt;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }
  .bm-top-divider {
    border: 0;
    border-top: 1px solid #374151;
    margin: 6px 0 8px 0;
  }
  .bm-info-block {
    margin: 4px 0 6px 0;
  }
  .bm-info-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
    font-size: 10.3pt;
  }
  .bm-info-seg {
    display: flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;
  }
  .bm-info-lbl {
    white-space: nowrap;
    color: #111827;
  }
  .bm-info-fill {
    flex: 1;
    border-bottom: 1px dotted #4B5563;
    min-height: 16px;
    padding: 0 3px;
    font-weight: 600;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-date-raw {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .bm-guide-italic {
    font-style: italic;
    font-size: 9.8pt;
    color: #1F2937;
    margin: 3px 0 6px 0;
  }
  .bm-sec-divider {
    border: 0;
    border-top: 1px solid #4B5563;
    margin: 7px 0 6px 0;
  }
  .bm-sec-title {
    font-size: 10.5pt;
    font-weight: 700;
    text-transform: uppercase;
    margin: 4px 0 3px 0;
    color: #111827;
    page-break-after: avoid;
    break-after: avoid;
  }
  .bm-sec-guide {
    font-style: italic;
    font-size: 9.8pt;
    margin: 0 0 5px 0;
    color: #1F2937;
  }
  .bm-q-item {
    margin-bottom: 5px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .bm-q-head {
    font-size: 10.2pt;
    line-height: 1.32;
    color: #111827;
  }
  .bm-answer {
    margin-top: 2px;
    font-size: 10pt;
    color: #0F172A;
  }
  .bm-answer-dots {
    height: 16px;
    border-bottom: 1px dotted #4B5563;
  }
  .bm-answer-filled {
    padding: 1px 2px 2px 2px;
    border-bottom: 1px dotted #6B7280;
    min-height: 17px;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .bm-status-line {
    margin-top: 6px;
    font-size: 10.2pt;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    page-break-inside: avoid;
  }
  .bm-status-opt {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .bm-chk-square {
    font-size: 11.5pt;
    line-height: 1;
  }
  .bm-bottom-sign-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .bm-psych-box {
    font-size: 10.3pt;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding-top: 2px;
  }
  .bm-psych-square {
    font-size: 13pt;
    font-weight: 400;
    line-height: 1;
  }
  .bm-executor-col {
    width: 46%;
    text-align: center;
  }
  .bm-executor-title {
    font-size: 10.3pt;
    font-weight: 700;
  }
  .bm-executor-sub {
    font-size: 9.6pt;
    margin-top: 1px;
  }
  .bm-executor-space {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bm-executor-space img {
    max-height: 52px;
    max-width: 150px;
    object-fit: contain;
  }
  .bm-executor-name {
    font-size: 10.2pt;
    font-weight: 700;
  }
  .bm-executor-dots {
    font-size: 10pt;
    color: #374151;
    letter-spacing: 1px;
  }
  .bm-internal-footer {
    text-align: right;
    font-style: italic;
    font-size: 9.3pt;
    color: #374151;
    margin-top: 8px;
  }
</style>
</head>
<body>
  <!-- ==================== TRANG 1: THÔNG TIN CHUNG + MỤC A + MỤC B ==================== -->
  <div class="bm-page">
    <div>
      ${renderHeaderBox()}

      <div class="bm-info-block">
        <div class="bm-info-row">
          ${renderInlineField("Họ và tên HS:", payload.studentName, 62)}
          ${renderInlineField("Hệ:", payload.programName, 38)}
        </div>
        <div class="bm-info-row">
          ${renderInlineField("Cơ sở:", payload.registeredCampus, 26)}
          ${renderInlineField("Năm học:", academicYearVal, 34)}
          <span class="bm-info-seg" style="flex: 40;">
            <span class="bm-info-lbl">Ngày phỏng vấn:</span>
            ${
              hasRealDate
                ? `<span class="bm-info-fill has-val bm-date-raw">${escapeHtml(interviewDateFormatted)}</span>`
                : `<span class="bm-date-raw">${escapeHtml(interviewDateFormatted)}</span>`
            }
          </span>
        </div>
        <div class="bm-info-row">
          ${renderInlineField("Phụ huynh tham gia:", payload.parentFullName, 56)}
          ${renderInlineField("Quan hệ với HS:", payload.parentRelationship, 44)}
        </div>
        <div class="bm-guide-italic">${escapeHtml(headerGuideLine)}</div>
      </div>

      <div class="bm-sec-title">${escapeHtml(secA?.title || "A. PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH")}</div>
      ${secA?.guideline ? `<div class="bm-sec-guide">${escapeHtml(secA.guideline)}</div>` : ""}
      ${fieldsA.map((f) => renderBmItemLineHtml(f, payload.studentResponses?.[f.fieldKey])).join("\n")}

      <hr class="bm-sec-divider" />
      <div class="bm-sec-title">${escapeHtml(secB?.title || "B. TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH")}</div>
      ${fieldsB.map((f) => renderBmItemLineHtml(f, payload.parentResponses?.[f.fieldKey])).join("\n")}
    </div>

    <div class="bm-internal-footer">${escapeHtml(footerText)}</div>
  </div>

  <!-- ==================== TRANG 2: MỤC C + MỤC D + TRẠNG THÁI & CHỮ KÝ ==================== -->
  <div class="bm-page bm-page-break">
    <div>
      ${renderHeaderBox()}
      <hr class="bm-top-divider" />

      <div class="bm-sec-title">${escapeHtml(
        secC?.title || `C. CÂU HỎI PHÂN HÓA RIÊNG CHO KHỐI ${gradeClean} (PHỤ HUYNH)`
      )}</div>
      ${fieldsC.map((f) => renderBmItemLineHtml(f, payload.parentResponses?.[f.fieldKey])).join("\n")}

      <div style="margin-top: 10px;"></div>
      <div class="bm-sec-title">${escapeHtml(secD?.title || "D. TỔNG HỢP VÀ ĐỊNH HƯỚNG CỦA GIÁO VIÊN")}</div>
      ${fieldsDText
        .map((f) => renderBmTeacherDItemHtml(f.label, dValByKey[f.fieldKey]))
        .join("\n")}

      <div class="bm-status-line">
        <span>Trạng thái phiếu:</span>
        ${statusOptionsHtml}
      </div>

      <div class="bm-bottom-sign-row">
        <div class="bm-psych-box">
          <span>Đề nghị phỏng vấn (tâm lí)</span>
          <span class="bm-psych-square">${summary.psychInterviewRequested ? "☑" : "☐"}</span>
        </div>

        <div class="bm-executor-col">
          <div class="bm-executor-title">${escapeHtml(sigCol.title || "Giáo viên thực hiện")}</div>
          <div class="bm-executor-sub">${escapeHtml(sigCol.subtitle || "(Kí và ghi rõ họ tên)")}</div>
          <div class="bm-executor-space">
            ${
              payload.signatureImageBase64
                ? `<img src="${escapeHtml(payload.signatureImageBase64)}" alt="Chữ ký giáo viên" />`
                : ""
            }
          </div>
          ${
            executorName
              ? `<div class="bm-executor-name">${escapeHtml(executorName)}</div>`
              : `<div class="bm-executor-dots">....................................</div>`
          }
        </div>
      </div>
    </div>

    <div class="bm-internal-footer">${escapeHtml(footerText)}</div>
  </div>
</body>
</html>`;
}

/**
 * Dựng HTML chuẩn A4 đa trang cho Phiếu phỏng vấn định hướng HS & PHHS
 * - Với Khối 1 & Khối 2 (BM.KTĐBCL.31 / BM.KTĐBCL.32): render đúng chuẩn A, B, C, D chính thức
 * - Với Khối 3–12 (PVDH-03..05): giữ đủ 5 phần I–V
 */
export function buildPvdhDocumentHtml(payload: PvdhRenderPayload): string {
  if (
    isBmKtdbclTemplate({
      exportLayout: payload.exportLayout,
      sections: payload.sections,
      fields: payload.fields,
      templateCode: payload.templateCode,
    })
  ) {
    return buildBmKtdbclDocumentHtml(payload);
  }
  const layout = payload.exportLayout || {
    paperSize: "A4",
    orientation: "PORTRAIT",
    part1Title: "PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH VÀ PHỤ HUYNH HỌC SINH",
    part1Subtitle: `${payload.templateCode}`,
    part2Title: "TRAO ĐỔI VỚI PHỤ HUYNH VÀ ĐỊNH HƯỚNG",
    part2Subtitle: `${payload.templateCode}`,
    purposeLine:
      "Mục đích: tìm hiểu học sinh, ghi nhận kỳ vọng gia đình và xác định nội dung cần hỗ trợ khi nhập học.",
    privacyDisclaimer: COMMON_PRIVACY_DISCLAIMER,
    showDraftBadgeWhenUnlocked: true,
    signatureColumns: DEFAULT_SIGNATURE_COLUMNS,
  };

  const isConfirmed = Boolean(payload.isLocked || payload.workflowStatus === "VERIFIED_LOCKED" || payload.workflowStatus === "HANDED_OVER");
  const showDraft = !isConfirmed && layout.showDraftBadgeWhenUnlocked !== false;
  const gradeClean = String(payload.grade || "").replace(/^khối\s*/i, "").trim();

  const secMap = new Map((payload.sections || []).map((s) => [s.sectionCode, s]));
  const secII = secMap.get("II_STUDENT");
  const secIII = secMap.get("III_TEACHER");
  const secIV = secMap.get("IV_PARENT");
  const secV = secMap.get("V_ORIENTATION");

  const studentFields = (payload.fields || [])
    .filter((f) => f.sectionCode === "II_STUDENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const parentFields = (payload.fields || [])
    .filter((f) => f.sectionCode === "IV_PARENT")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const studentBlocksHtml = studentFields
    .map((f) => renderInterviewGroupHtml(f, payload.studentResponses?.[f.fieldKey], gradeClean))
    .join("\n");

  const parentBlocksHtml = parentFields
    .map((f) => renderInterviewGroupHtml(f, payload.parentResponses?.[f.fieldKey], gradeClean))
    .join("\n");

  // Ghép 4 trường riêng của giáo viên dưới đúng Mục III
  const teacherObsRows: Array<{ label: string; val?: string | null }> = [
    { label: "Điểm mạnh / sở thích nổi bật", val: payload.obsStrengthsInterests },
    { label: "Cách giao tiếp", val: payload.obsCommunicationStyle },
    { label: "Mức độ tham gia", val: payload.obsParticipationLevel },
    { label: "Nhu cầu hỗ trợ", val: payload.obsSupportNeeds },
  ];
  const hasAnyObs = teacherObsRows.some((r) => String(r.val || "").trim() !== "");
  const teacherObsHtml = hasAnyObs
    ? teacherObsRows
        .map(
          (r) => `
          <div class="obs-item">
            <span class="obs-label">• ${escapeHtml(r.label)}:</span>
            <span class="obs-val">${
              String(r.val || "").trim() ? escapeWithLineBreaks(r.val) : '<span class="muted">(Chưa ghi nhận)</span>'
            }</span>
          </div>`
        )
        .join("")
    : `<div class="answer-empty" style="padding: 8px 10px;">(Chưa nhập ghi nhận của người phỏng vấn)</div>`;

  // Mục V.2: Đồng bộ văn bản mục tiêu & danh sách hành động mà không lặp dữ liệu
  const formattedActions = formatFollowUpActionsToText(payload.followUpActions || []);
  const rawGoalsText = String(payload.planGoalsActionsText || "").trim();
  const combinedGoalsHtml =
    rawGoalsText && formattedActions && !rawGoalsText.includes(formattedActions)
      ? `${escapeWithLineBreaks(rawGoalsText)}<div class="action-sublist">${escapeWithLineBreaks(formattedActions)}</div>`
      : rawGoalsText
      ? escapeWithLineBreaks(rawGoalsText)
      : formattedActions
      ? escapeWithLineBreaks(formattedActions)
      : '<span class="muted">(Chưa nhập)</span>';

  // Mục V.4: Checkbox Nội dung cần tìm hiểu thêm
  const selectedTopics = new Set(payload.planFurtherTopics || []);
  const checkboxesHtml = FURTHER_INQUIRY_OPTIONS.map((opt) => {
    const checked = selectedTopics.has(opt.code);
    const boxChar = checked ? "☑" : "☐";
    const extraOther =
      opt.code === "KHAC"
        ? `: <span class="inline-fill">${
            payload.planFurtherOtherText?.trim()
              ? escapeHtml(payload.planFurtherOtherText)
              : "..............................................."
          }</span>`
        : "";
    return `<span class="chk-item ${checked ? "chk-active" : ""}"><span class="chk-box">${boxChar}</span> ${escapeHtml(opt.label)}${extraOther}</span>`;
  }).join("\n");

  const referralCombined = [
    payload.planReferralReason?.trim() ? `Lý do: ${payload.planReferralReason.trim()}` : "",
    payload.planReferralReceiver?.trim() ? `Người/bộ phận tiếp nhận: ${payload.planReferralReceiver.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  // Nhãn xác nhận / chữ ký trung thực tuyệt đối theo yêu cầu 7.5 & 12:
  // Nếu chỉ có ảnh chữ ký -> gọi đúng là "Ký xác nhận bằng ảnh chữ ký", KHÔNG gọi là chữ ký số được xác thực
  const confirmationBadgeLabel =
    payload.confirmationType === "CERTIFICATE_CA"
      ? "Chữ ký số chứng thư đã xác thực"
      : payload.confirmationType === "SIGNATURE_IMAGE"
      ? "Ký xác nhận bằng ảnh chữ ký"
      : isConfirmed
      ? "Xác nhận trên hệ thống SSM"
      : "Bản nháp (Chưa xác nhận)";

  const primaryInterviewer =
    payload.studentInterviewerName || payload.confirmedByName || payload.parentInterviewerName || "";
  const primaryTitle = payload.studentInterviewerTitle || payload.parentInterviewerTitle || "";
  const sigCols = layout.signatureColumns?.length === 3 ? layout.signatureColumns : DEFAULT_SIGNATURE_COLUMNS;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(payload.templateCode)} - ${escapeHtml(payload.studentName)} (${escapeHtml(payload.studentCode)})</title>
<style>
  @page {
    size: A4 portrait;
    margin: 11mm 12mm 13mm 12mm;
  }
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Open Sans", "Segoe UI", "DejaVu Sans", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #0F172A;
    background: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-container {
    position: relative;
    width: 100%;
  }
  .draft-watermark {
    position: fixed;
    top: 44%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-28deg);
    font-size: 40pt;
    font-weight: 800;
    color: rgba(225, 29, 72, 0.09);
    border: 3px solid rgba(225, 29, 72, 0.14);
    padding: 8px 24px;
    border-radius: 10px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 0;
  }
  .part-header {
    border-left: 4px solid #003B3A;
    background: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    border-right: 1px solid #E2E8F0;
    border-bottom: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 10px;
  }
  .header-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .school-brand {
    font-size: 8.5pt;
    font-weight: 700;
    color: #003B3A;
    letter-spacing: 0.02em;
  }
  .status-pill {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .status-draft {
    background: #FFFBEB;
    color: #B45309;
    border: 1px solid #FDE68A;
  }
  .status-confirmed {
    background: #ECFDF5;
    color: #047857;
    border: 1px solid #A7F3D0;
  }
  .main-title {
    font-size: 12.5pt;
    font-weight: 800;
    color: #003B3A;
    margin: 4px 0 2px 0;
  }
  .sub-meta {
    font-size: 9pt;
    font-weight: 600;
    color: #00736E;
  }
  .purpose-line {
    margin-top: 5px;
    font-size: 8.8pt;
    color: #334155;
    font-style: italic;
  }
  .section-heading {
    background: #003B3A;
    color: #FFFFFF;
    font-size: 10pt;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 6px;
    margin: 10px 0 6px 0;
    page-break-after: avoid;
    break-after: avoid;
  }
  .section-guideline {
    font-size: 8.6pt;
    color: #475569;
    font-style: italic;
    margin: 0 0 6px 2px;
    page-break-after: avoid;
  }
  .info-grid {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-variant-numeric: tabular-nums;
  }
  .info-grid td {
    border: 1px solid #CBD5E1;
    padding: 5px 8px;
    font-size: 9.2pt;
    vertical-align: top;
  }
  .field-lbl {
    color: #475569;
    font-weight: 600;
  }
  .field-val {
    color: #0F172A;
    font-weight: 700;
  }
  .question-block {
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 7px;
    background: #FFFFFF;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .question-title {
    font-size: 9.6pt;
    font-weight: 700;
    color: #003B3A;
  }
  .question-prompt {
    font-size: 8.7pt;
    color: #475569;
    margin-top: 1px;
    margin-bottom: 5px;
  }
  .question-emphasis {
    font-size: 8.3pt;
    color: #00736E;
    background: #F0FDFA;
    border-left: 2px solid #00A19A;
    padding: 2px 6px;
    margin-bottom: 5px;
  }
  .answer-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 4px;
    padding: 6px 8px;
    min-height: 28px;
    font-size: 9.4pt;
    color: #0F172A;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .answer-unrecorded {
    background: #FFFBEB;
    border-color: #FDE68A;
    color: #92400E;
  }
  .answer-empty {
    color: #94A3B8;
    font-style: italic;
  }
  .obs-box {
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 8px 10px;
    background: #FFFFFF;
  }
  .obs-item {
    margin-bottom: 5px;
    font-size: 9.3pt;
  }
  .obs-item:last-child {
    margin-bottom: 0;
  }
  .obs-label {
    font-weight: 700;
    color: #003B3A;
    margin-right: 4px;
  }
  .obs-val {
    color: #0F172A;
  }
  .section-note {
    margin-top: 6px;
    padding: 5px 9px;
    border-radius: 5px;
    background: #F0FDFA;
    border: 1px solid #CCFBF1;
    color: #005854;
    font-size: 8.5pt;
    font-weight: 600;
  }
  .part-break {
    page-break-before: always;
    break-before: page;
    margin-top: 0;
  }
  .plan-item {
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 7px;
    background: #FFFFFF;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .plan-label {
    font-size: 9.4pt;
    font-weight: 700;
    color: #003B3A;
    margin-bottom: 4px;
  }
  .action-sublist {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 1px dashed #CBD5E1;
    font-size: 9pt;
  }
  .chk-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin: 4px 0 6px 0;
  }
  .chk-item {
    font-size: 9.2pt;
    color: #334155;
  }
  .chk-active {
    font-weight: 700;
    color: #003B3A;
  }
  .chk-box {
    font-size: 11pt;
    margin-right: 2px;
  }
  .inline-fill {
    font-weight: 600;
    color: #0F172A;
  }
  .disclaimer-box {
    margin-top: 8px;
    padding: 6px 10px;
    background: #F8FAFC;
    border: 1px solid #CBD5E1;
    border-left: 3px solid #00736E;
    border-radius: 5px;
    font-size: 8.5pt;
    color: #334155;
    page-break-inside: avoid;
  }
  .sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sig-table td {
    width: 33.33%;
    text-align: center;
    vertical-align: top;
    padding: 6px 8px;
    border: 1px solid #E2E8F0;
  }
  .sig-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #003B3A;
  }
  .sig-sub {
    font-size: 8.2pt;
    color: #64748B;
    font-style: italic;
    margin-bottom: 6px;
  }
  .sig-space {
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sig-space img {
    max-height: 58px;
    max-width: 150px;
    object-fit: contain;
  }
  .sig-name {
    font-size: 9.3pt;
    font-weight: 700;
    color: #0F172A;
    margin-top: 4px;
  }
  .sig-meta {
    margin-top: 8px;
    font-size: 7.8pt;
    color: #64748B;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .muted {
    color: #94A3B8;
    font-style: italic;
  }
</style>
</head>
<body>
<div class="doc-container">
  ${showDraft ? `<div class="draft-watermark">BẢN NHÁP – CHƯA XÁC NHẬN</div>` : ""}

  <!-- ==================== PHẦN 1 TRÊN 2 ==================== -->
  <div class="part-header">
    <div class="header-top-row">
      <div class="school-brand">HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ ĐỊNH HƯỚNG ĐẦU VÀO</div>
      <span class="status-pill ${showDraft ? "status-draft" : "status-confirmed"}">
        ${showDraft ? "Bản nháp" : escapeHtml(confirmationBadgeLabel)}
      </span>
    </div>
    <div class="main-title">${escapeHtml(layout.part1Title)}</div>
    <div class="sub-meta">${escapeHtml(layout.part1Subtitle)} • Phiên bản mẫu: ${escapeHtml(payload.templateVersionCode)}</div>
    <div class="purpose-line">${escapeHtml(layout.purposeLine)}</div>
  </div>

  <div class="section-heading">I. Thông tin chung</div>
  <table class="info-grid">
    <tr>
      <td style="width: 58%;"><span class="field-lbl">Họ tên học sinh:</span> <span class="field-val">${escapeHtml(payload.studentName || "—")}</span></td>
      <td style="width: 42%;"><span class="field-lbl">Ngày sinh:</span> <span class="field-val">${escapeHtml(formatViDate(payload.studentDob))}</span></td>
    </tr>
    <tr>
      <td><span class="field-lbl">Mã hồ sơ:</span> <span class="field-val">${escapeHtml(payload.studentCode || "—")}</span></td>
      <td><span class="field-lbl">Khối dự kiến:</span> <span class="field-val">${escapeHtml(payload.grade || "—")}</span> &nbsp;|&nbsp; <span class="field-lbl">Hệ/CT:</span> <span class="field-val">${escapeHtml(payload.programName || "—")}</span></td>
    </tr>
    <tr>
      <td colspan="2"><span class="field-lbl">Trường/lớp đang học:</span> <span class="field-val">${escapeHtml(payload.oldSchoolAndClass || "—")}</span></td>
    </tr>
    <tr>
      <td><span class="field-lbl">Cơ sở đăng ký:</span> <span class="field-val">${escapeHtml(payload.registeredCampus || "—")}</span></td>
      <td><span class="field-lbl">Ngày phỏng vấn:</span> <span class="field-val">${escapeHtml(formatViDate(payload.interviewDate))}</span></td>
    </tr>
    <tr>
      <td><span class="field-lbl">Người phỏng vấn:</span> <span class="field-val">${escapeHtml(primaryInterviewer || "—")}</span></td>
      <td><span class="field-lbl">Chức danh:</span> <span class="field-val">${escapeHtml(primaryTitle || "Giáo viên phỏng vấn")}</span></td>
    </tr>
  </table>

  <div class="section-heading">II. ${escapeHtml(secII?.title || "Trao đổi với học sinh")}</div>
  <div class="section-guideline">${escapeHtml(secII?.guideline || "")}</div>
  ${studentBlocksHtml}

  <div class="section-heading">III. ${escapeHtml(secIII?.title || "Ghi nhận của người phỏng vấn")}</div>
  <div class="section-guideline">${escapeHtml(secIII?.guideline || "")}</div>
  <div class="obs-box">
    ${teacherObsHtml}
  </div>
  ${secIII?.footerNote ? `<div class="section-note">${escapeHtml(secIII.footerNote)}</div>` : ""}

  <!-- ==================== PHẦN 2 TRÊN 2 ==================== -->
  <div class="part-break"></div>

  <div class="part-header">
    <div class="header-top-row">
      <div class="school-brand">HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ ĐỊNH HƯỚNG ĐẦU VÀO</div>
      <span class="status-pill ${showDraft ? "status-draft" : "status-confirmed"}">
        ${showDraft ? "Bản nháp" : escapeHtml(confirmationBadgeLabel)}
      </span>
    </div>
    <div class="main-title">${escapeHtml(layout.part2Title)}</div>
    <div class="sub-meta">${escapeHtml(layout.part2Subtitle)} • Phiên bản mẫu: ${escapeHtml(payload.templateVersionCode)}</div>
  </div>

  <table class="info-grid">
    <tr>
      <td style="width: 58%;"><span class="field-lbl">Họ tên học sinh:</span> <span class="field-val">${escapeHtml(payload.studentName || "—")}</span></td>
      <td style="width: 42%;"><span class="field-lbl">Mã hồ sơ:</span> <span class="field-val">${escapeHtml(payload.studentCode || "—")}</span></td>
    </tr>
    <tr>
      <td><span class="field-lbl">Họ tên PHHS:</span> <span class="field-val">${escapeHtml(payload.parentFullName || "—")}</span></td>
      <td><span class="field-lbl">Quan hệ với HS:</span> <span class="field-val">${escapeHtml(payload.parentRelationship || "—")}</span></td>
    </tr>
    <tr>
      <td colspan="2"><span class="field-lbl">Điện thoại/kênh liên hệ:</span> <span class="field-val">${escapeHtml(payload.parentContactChannel || "—")}</span>${
        payload.parentInterviewerName && payload.parentInterviewerName !== payload.studentInterviewerName
          ? ` &nbsp;|&nbsp; <span class="field-lbl">Người trao đổi PHHS:</span> <span class="field-val">${escapeHtml(payload.parentInterviewerName)}</span>`
          : ""
      }</td>
    </tr>
  </table>

  <div class="section-heading">IV. ${escapeHtml(secIV?.title || "Hiểu học sinh qua góc nhìn PHHS")}</div>
  ${parentBlocksHtml}

  <div class="section-heading">V. ${escapeHtml(secV?.title || "Thống nhất định hướng và hỗ trợ")}</div>

  <div class="plan-item">
    <div class="plan-label">1. Điểm mạnh và nhu cầu ưu tiên của học sinh:</div>
    <div class="answer-box">${
      payload.planStrengthsPriority?.trim()
        ? escapeWithLineBreaks(payload.planStrengthsPriority)
        : '<span class="muted">(Chưa nhập)</span>'
    }</div>
  </div>

  <div class="plan-item">
    <div class="plan-label">2. Mục tiêu ban đầu và hành động thống nhất với HS, PHHS:</div>
    <div class="answer-box">${combinedGoalsHtml}</div>
  </div>

  <div class="plan-item">
    <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 9.3pt;">
      <div><strong style="color: #003B3A;">3. Người/bộ phận phối hợp:</strong> ${escapeHtml(payload.planCoordinator || ".....................................")}</div>
      <div><strong style="color: #003B3A;">Mốc trao đổi lại:</strong> ${escapeHtml(formatViDate(payload.planReviewDate))}</div>
    </div>
  </div>

  <div class="plan-item">
    <div class="plan-label">4. Nội dung cần tìm hiểu thêm:</div>
    <div class="chk-wrap">${checkboxesHtml}</div>
    <div style="font-size: 9pt; margin-top: 4px;">
      <strong style="color: #003B3A;">Lý do đề nghị và người tiếp nhận:</strong>
      <span>${referralCombined ? escapeWithLineBreaks(referralCombined) : "................................................................................"}</span>
    </div>
  </div>

  <div class="plan-item">
    <div class="plan-label">5. Nội dung bàn giao cho GVCN/bộ phận liên quan khi nhập học:</div>
    <div class="answer-box">${
      payload.planHandoverNotes?.trim()
        ? escapeWithLineBreaks(payload.planHandoverNotes)
        : '<span class="muted">(Chưa nhập)</span>'
    }</div>
  </div>

  <div class="disclaimer-box">
    ${escapeHtml(layout.privacyDisclaimer || COMMON_PRIVACY_DISCLAIMER)}
  </div>

  <table class="sig-table">
    <tr>
      ${sigCols
        .map((col) => {
          const isInterviewerCol = col.key === "interviewer";
          const sigInner =
            isInterviewerCol && isConfirmed && payload.signatureImageBase64
              ? `<img src="${payload.signatureImageBase64}" alt="Ảnh chữ ký xác nhận" />`
              : isInterviewerCol && isConfirmed
              ? `<div style="font-size: 8.5pt; color: #047857; font-weight: 700;">✓ Đã xác nhận (${escapeHtml(confirmationBadgeLabel)})</div>`
              : "";
          const signerDisplay = isInterviewerCol
            ? primaryInterviewer
            : col.key === "parent"
            ? payload.parentFullName || ""
            : "";
          return `
            <td>
              <div class="sig-title">${escapeHtml(col.title)}</div>
              <div class="sig-sub">${escapeHtml(col.subtitle)}</div>
              <div class="sig-space">${sigInner}</div>
              <div class="sig-name">${escapeHtml(signerDisplay)}</div>
            </td>
          `;
        })
        .join("")}
    </tr>
  </table>

  <div class="sig-meta">
    <span>Mã bản ghi: ${escapeHtml(payload.recordId)} • Lần khảo sát: #${payload.attemptNumber || 1}</span>
    <span>Hình thức xác nhận: ${escapeHtml(confirmationBadgeLabel)}${
      payload.confirmedAt ? ` (${escapeHtml(formatViDateTime(payload.confirmedAt))})` : ""
    }</span>
    ${payload.confirmedSnapshotHash ? `<span>SHA-256: ${escapeHtml(payload.confirmedSnapshotHash.slice(0, 24))}...</span>` : ""}
  </div>
</div>
</body>
</html>`;
}

function buildFallbackPvdhPdfBuffer(payload: PvdhRenderPayload, htmlContent: string): Buffer {
  const toAscii = (str: string) =>
    String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[\\()]/g, "")
      .replace(/[^\x20-\x7E]/g, " ");

  const isConfirmed = Boolean(payload.isLocked || payload.workflowStatus === "VERIFIED_LOCKED" || payload.workflowStatus === "HANDED_OVER");
  const lines: string[] = [
    `HE THONG GIAO DUC SKY-LINE - ${toAscii(payload.templateCode)} (${toAscii(payload.templateVersionCode)})`,
    `Trang thai: ${isConfirmed ? "DA XAC NHAN" : "BAN NHAP (CHUA XAC NHAN)"}`,
    `Ho ten HS: ${toAscii(payload.studentName)} | Ma ho so: ${toAscii(payload.studentCode)} | Khoi: ${toAscii(payload.grade)}`,
    `Ngay phong van: ${toAscii(formatViDate(payload.interviewDate))} | Nguoi phong van: ${toAscii(payload.studentInterviewerName || "")}`,
    `PHHS: ${toAscii(payload.parentFullName || "")} (${toAscii(payload.parentRelationship || "")})`,
    "----------------------------------------------------------------------------",
    "II. TRAO DOI VOI HOC SINH:",
  ];

  const isBm = isBmKtdbclTemplate({
    exportLayout: payload.exportLayout,
    sections: payload.sections,
    fields: payload.fields,
    templateCode: payload.templateCode,
  });

  if (isBm) {
    lines.push("A. PHONG VAN DINH HUONG HOC SINH:");
    for (const f of (payload.fields || []).filter((x) => x.sectionCode === "II_STUDENT").slice(0, 6)) {
      const item = payload.studentResponses?.[f.fieldKey];
      const txt = item?.notRecorded
        ? `[Chua ghi nhan: ${toAscii(item.notRecordedReason)}]`
        : toAscii(item?.responseText || "(Chua nhap)").slice(0, 75);
      lines.push(`  ${toAscii(f.fieldKey.toUpperCase())}: ${txt}`);
    }
    lines.push("B. TRAO DOI DINH HUONG VOI PHU HUYNH:");
    for (const f of (payload.fields || []).filter((x) => x.sectionCode === "IV_PARENT").slice(0, 5)) {
      const item = payload.parentResponses?.[f.fieldKey];
      const txt = item?.notRecorded
        ? `[Chua ghi nhan: ${toAscii(item.notRecordedReason)}]`
        : toAscii(item?.responseText || "(Chua nhap)").slice(0, 75);
      lines.push(`  ${toAscii(f.fieldKey.toUpperCase())}: ${txt}`);
    }
    lines.push("C. CAU HOI PHAN HOA RIENG:");
    for (const f of (payload.fields || []).filter((x) => x.sectionCode === "C_PARENT_GRADE").slice(0, 5)) {
      const item = payload.parentResponses?.[f.fieldKey];
      const txt = item?.notRecorded
        ? `[Chua ghi nhan: ${toAscii(item.notRecordedReason)}]`
        : toAscii(item?.responseText || "(Chua nhap)").slice(0, 75);
      lines.push(`  ${toAscii(f.fieldKey.toUpperCase())}: ${txt}`);
    }
    lines.push("D. TONG HOP VA DINH HUONG CUA GIAO VIEN:");
    const sum = payload.teacherSummary || ({} as any);
    lines.push(`  D01: ${toAscii(sum.d01 || "-").slice(0, 75)}`);
    lines.push(`  D02: ${toAscii(sum.d02 || "-").slice(0, 75)}`);
    lines.push(`  D03: ${toAscii(sum.d03 || "-").slice(0, 75)}`);
    lines.push(`  D04: ${toAscii(sum.d04 || "-").slice(0, 75)}`);
  } else {
    for (let i = 1; i <= 6; i++) {
      const item = payload.studentResponses?.[`hs_q${i}`];
      const txt = item?.notRecorded
        ? `[Chua ghi nhan: ${toAscii(item.notRecordedReason)}]`
        : toAscii(item?.responseText || "(Chua nhap)").slice(0, 80);
      lines.push(`  II.${i}: ${txt}`);
    }

    lines.push("III. GHI NHAN CUA GIAO VIEN:");
    lines.push(`  - Diem manh/so thich: ${toAscii(payload.obsStrengthsInterests || "-").slice(0, 75)}`);
    lines.push(`  - Giao tiep & tham gia: ${toAscii(payload.obsCommunicationStyle || "-").slice(0, 75)}`);
    lines.push("IV. TRAO DOI VOI PHHS:");
    for (let i = 1; i <= 5; i++) {
      const item = payload.parentResponses?.[`ph_q${i}`];
      const txt = item?.notRecorded
        ? `[Chua ghi nhan: ${toAscii(item.notRecordedReason)}]`
        : toAscii(item?.responseText || "(Chua nhap)").slice(0, 80);
      lines.push(`  IV.${i}: ${txt}`);
    }

    lines.push("V. THONG NHAT DINH HUONG VA HO TRO:");
    lines.push(`  1. Diem manh & uu tien: ${toAscii(payload.planStrengthsPriority || "-").slice(0, 75)}`);
    lines.push(`  2. Muc tieu & hanh dong: ${toAscii(payload.planGoalsActionsText || "-").slice(0, 75)}`);
    lines.push(`  4. Tim hieu them: ${(payload.planFurtherTopics || []).join(", ")}`);
    lines.push(`  5. Ban giao GVCN: ${toAscii(payload.planHandoverNotes || "-").slice(0, 75)}`);
  }

  const textOps = lines
    .slice(0, 34)
    .map((line, idx) => `1 0 0 1 36 ${800 - idx * 21} Tm (${line}) Tj`)
    .join("\n");

  const streamContent = `BT\n/F1 9 Tf\n${textOps}\nET`;
  const htmlBase64 = Buffer.from(htmlContent, "utf-8").toString("base64");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, "utf-8")} >>\nstream\n${streamContent}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `6 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${Buffer.byteLength(htmlBase64, "utf-8")} >>\nstream\n${htmlBase64}\nendstream\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj + "\n";
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "utf-8");
}

const PRIVATE_PVDH_STORAGE_DIR = path.resolve(process.cwd(), "storage", "pvdh-pdfs");

export async function generatePvdhPdfBuffer(payload: PvdhRenderPayload): Promise<{
  pdfBuffer: Buffer;
  htmlContent: string;
  pdfSha256: string;
  fileName: string;
}> {
  const htmlContent = buildPvdhDocumentHtml(payload);
  const fileName = buildPvdhPdfFileName({
    templateCode: payload.templateCode,
    studentCode: payload.studentCode,
    studentId: payload.studentId,
    periodCode: payload.periodCode,
    versionCode: payload.templateVersionCode,
    attemptNumber: payload.attemptNumber,
  });

  let pdfBuffer: Buffer | null = null;
  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  if (!isTestEnv) {
    try {
      const puppeteerMod = await import("puppeteer");
      const puppeteerLauncher = (puppeteerMod as any).default ?? puppeteerMod;
      const browser = await puppeteerLauncher.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 30000,
      });
      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load", timeout: 30000 });
        const uint8 = await page.pdf({
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: "11mm", right: "12mm", bottom: "13mm", left: "12mm" },
        });
        pdfBuffer = Buffer.from(uint8);
      } finally {
        await browser.close();
      }
    } catch (err) {
      console.error("[PVDH PDF] Puppeteer render failed, falling back to plain PDF:", err);
      pdfBuffer = null;
    }
  }

  if (!pdfBuffer) {
    pdfBuffer = buildFallbackPvdhPdfBuffer(payload, htmlContent);
  }

  const pdfSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  return { pdfBuffer, htmlContent, pdfSha256, fileName };
}

export async function savePrivatePvdhPdf(params: {
  recordId: string;
  attemptNumber: number;
  fileName: string;
  pdfBuffer: Buffer;
  htmlContent: string;
}): Promise<{ storageKey: string; absolutePath: string }> {
  const safeName = params.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storageKey = `${params.recordId}_a${params.attemptNumber}_${safeName}`;
  try {
    await fs.promises.mkdir(PRIVATE_PVDH_STORAGE_DIR, { recursive: true });
    const fullPath = path.join(PRIVATE_PVDH_STORAGE_DIR, storageKey);
    const htmlPath = path.join(PRIVATE_PVDH_STORAGE_DIR, `${storageKey}.html`);
    await fs.promises.writeFile(fullPath, params.pdfBuffer);
    await fs.promises.writeFile(htmlPath, params.htmlContent, "utf-8");
    return { storageKey, absolutePath: fullPath };
  } catch {
    return { storageKey, absolutePath: "" };
  }
}

export async function readPrivatePvdhPdf(storageKey: string): Promise<Buffer | null> {
  if (!storageKey || storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
    return null;
  }
  try {
    const fullPath = path.join(PRIVATE_PVDH_STORAGE_DIR, storageKey);
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  } catch {
    return null;
  }
}

/**
 * Xuất file Excel tổng hợp danh sách Phiếu định hướng (Tách riêng khỏi bảng điểm số, chặn Formula Injection)
 */
export function buildPvdhSummaryExcelBuffer(
  rows: Array<{
    studentCode: string;
    studentName: string;
    grade: string;
    programName: string;
    campusName: string;
    periodName: string;
    templateCode: string;
    templateVersionCode: string;
    workflowStatusLabel: string;
    studentInterviewerName: string;
    parentInterviewerName: string;
    planStrengthsPriority: string;
    planGoalsActionsText: string;
    furtherTopicsLabel: string;
    planHandoverNotes: string;
    handoverStatusLabel: string;
  }>
): Buffer {
  const headers = [
    "STT",
    "Mã hồ sơ",
    "Họ tên học sinh",
    "Khối dự kiến",
    "Hệ/Chương trình",
    "Cơ sở đăng ký",
    "Đợt khảo sát",
    "Mẫu phiếu",
    "Phiên bản",
    "Loại kết quả",
    "Trạng thái phiếu",
    "GV phỏng vấn HS",
    "Người trao đổi PHHS",
    "Điểm mạnh & nhu cầu ưu tiên",
    "Mục tiêu & hành động thống nhất",
    "Nội dung cần tìm hiểu thêm",
    "Nội dung bàn giao GVCN",
    "Trạng thái bàn giao",
  ];

  const aoa: Array<Array<string | number>> = [headers];
  rows.forEach((r, idx) => {
    aoa.push([
      idx + 1,
      sanitizeSpreadsheetCell(r.studentCode),
      sanitizeSpreadsheetCell(r.studentName),
      sanitizeSpreadsheetCell(r.grade),
      sanitizeSpreadsheetCell(r.programName),
      sanitizeSpreadsheetCell(r.campusName),
      sanitizeSpreadsheetCell(r.periodName),
      sanitizeSpreadsheetCell(r.templateCode),
      sanitizeSpreadsheetCell(r.templateVersionCode),
      "Ghi nhận định tính (Không tính điểm)",
      sanitizeSpreadsheetCell(r.workflowStatusLabel),
      sanitizeSpreadsheetCell(r.studentInterviewerName),
      sanitizeSpreadsheetCell(r.parentInterviewerName),
      sanitizeSpreadsheetCell(r.planStrengthsPriority),
      sanitizeSpreadsheetCell(r.planGoalsActionsText),
      sanitizeSpreadsheetCell(r.furtherTopicsLabel),
      sanitizeSpreadsheetCell(r.planHandoverNotes),
      sanitizeSpreadsheetCell(r.handoverStatusLabel),
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 15 },
    { wch: 24 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 26 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 34 },
    { wch: 36 },
    { wch: 28 },
    { wch: 34 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "DinhHuong_PVDH");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(out);
}
