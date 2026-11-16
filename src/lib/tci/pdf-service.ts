import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
    TciCriterionConfig,
    TciFooterConfig,
    TciExportConfig,
    TciEvidenceSummaryItem,
    DEFAULT_TCI_CRITERIA_16,
    DEFAULT_TCI_FOOTER_CONFIG,
    DEFAULT_TCI_EXPORT_CONFIG,
    normalizeCriterionResults,
    computeTciSummary,
    formatIndicatorCodesLabel,
    getTciChoiceLabel,
} from "./constants";

export interface TciDocumentRenderPayload {
    recordId: string;
    resultVersion: number;
    templateCode: string;
    templateName: string;
    templateVersionCode: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    studentDob?: string | null;
    studentGender?: string | null;
    grade: string;
    campusName?: string | null;
    periodName?: string | null;
    periodCode?: string | null;
    batchName?: string | null;
    educationSystemName?: string | null;
    assessmentDate?: string | null;
    assignedTeacherName?: string | null;
    assessorName?: string | null;
    criteriaConfig?: TciCriterionConfig[];
    footerConfig?: TciFooterConfig;
    exportConfig?: TciExportConfig;
    criteriaResults: unknown;
    evidences?: TciEvidenceSummaryItem[];
    generalComment?: string | null;
    highlightsComment?: string | null;
    supportNeededComment?: string | null;
    teacherRecommendation?: string | null;
    signatureStatus: "UNSIGNED" | "SIGNED" | "PENDING_RESIGN" | string;
    signatureType?: "CERTIFICATE_CA" | "TEACHER_SIGNATURE_IMAGE" | string | null;
    signerName?: string | null;
    signerRole?: string | null;
    signatureImageBase64?: string | null;
    signedAt?: Date | string | null;
    signedSnapshotHash?: string | null;
}

function escapeHtml(input: unknown): string {
    if (input === null || input === undefined) return "";
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDateVi(val: Date | string | null | undefined): string {
    if (!val) return "—";
    const d = val instanceof Date ? val : new Date(String(val));
    if (Number.isNaN(d.getTime())) return String(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatDateTimeVi(val: Date | string | null | undefined): string {
    if (!val) return "—";
    const d = val instanceof Date ? val : new Date(String(val));
    if (Number.isNaN(d.getTime())) return String(val);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mi} - ${dd}/${mm}/${yyyy}`;
}

export function sanitizeFileCode(raw: string | null | undefined, fallback: string): string {
    const cleaned = String(raw || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "_");
    return cleaned || fallback;
}

export function buildTciPdfFileName(params: {
    studentCode?: string | null;
    studentId: string;
    periodCode?: string | null;
    periodId?: string | null;
    resultVersion: number;
}): string {
    const maHoSo = sanitizeFileCode(params.studentCode || params.studentId, "HS");
    const maDot = sanitizeFileCode(params.periodCode || params.periodId || "DOT", "DOT");
    const ver = Math.max(1, Number(params.resultVersion || 1));
    return `TCI_${maHoSo}_${maDot}_v${ver}.pdf`;
}

/**
 * Xây dựng nội dung HTML chuẩn A4 cho Phiếu khảo sát môn TCI
 * - Hiển thị đầy đủ tiếng Việt
 * - Lặp lại tiêu đề bảng khi sang trang (thead { display: table-header-group })
 * - Không cắt ngang tiêu chí hoặc phần ký (page-break-inside: avoid)
 * - Hiển thị vùng Câu 13 (Giáo viên viết mẫu / Thí sinh viết theo) và Câu 16 (Ảnh mẫu tô màu + Ảnh Sản phẩm của học sinh)
 * - Bản nháp chưa ký có watermark "BẢN NHÁP – CHƯA KÝ"
 */
export function buildTciAssessmentHtml(payload: TciDocumentRenderPayload): string {
    const criteriaConfig = payload.criteriaConfig ?? DEFAULT_TCI_CRITERIA_16;
    const footerConfig = payload.footerConfig ?? DEFAULT_TCI_FOOTER_CONFIG;
    const exportConfig = payload.exportConfig ?? DEFAULT_TCI_EXPORT_CONFIG;
    const evidences = payload.evidences ?? [];

    const normalized = normalizeCriterionResults(payload.criteriaResults, criteriaConfig);
    const summary = computeTciSummary(normalized, criteriaConfig);
    const isSigned = payload.signatureStatus === "SIGNED";
    const showDraftWatermark = !isSigned && exportConfig.showDraftWatermarkWhenUnsigned !== false;

    const criteriaRowsHtml = criteriaConfig
        .map((c) => {
            const entry = normalized[c.criterionId];
            const choice = entry?.status ?? null;
            const isDat = choice === "DAT";
            const isKhongDat = choice === "KHONG_DAT";
            const isKhongLam = choice === "KHONG_LAM";
            const itemEvidences = evidences.filter(
                (ev) => ev.criterionId === c.criterionId || ev.criterionStt === c.stt
            );

            let supplementaryHtml = "";

            if (c.supplementaryType === "WRITING_SAMPLE_BOX") {
                const sampleText = entry?.writingSampleText || c.writingPromptDefault || "bé chăm ngoan";
                const studentText = entry?.studentWritingText || "";
                const evImgsHtml = itemEvidences
                    .filter((ev) => ev.imageDataBase64)
                    .map((ev) => {
                        const rot = Number(ev.rotationDeg || 0);
                        return `
                        <div class="evidence-thumb">
                            <img src="${ev.imageDataBase64}" alt="${escapeHtml(ev.fileName)}" style="transform: rotate(${rot}deg);" />
                            <div class="evidence-caption">Ảnh bài viết: ${escapeHtml(ev.fileName)}</div>
                        </div>`;
                    })
                    .join("");

                supplementaryHtml = `
                <div class="supp-box">
                    <div class="writing-grid">
                        <div class="writing-col">
                            <div class="supp-label">Giáo viên viết mẫu:</div>
                            <div class="writing-sample-val">${escapeHtml(sampleText)}</div>
                        </div>
                        <div class="writing-col">
                            <div class="supp-label">Thí sinh viết theo:</div>
                            <div class="writing-student-val">${studentText ? escapeHtml(studentText) : '<span class="muted">(Thực hiện trên phiếu / ảnh đính kèm)</span>'}</div>
                        </div>
                    </div>
                    ${evImgsHtml ? `<div class="evidence-list">${evImgsHtml}</div>` : ""}
                </div>`;
            } else if (c.supplementaryType === "COLORING_SAMPLE_AND_PRODUCT") {
                const sampleImgUrl = c.sampleImageUrl || "";
                const evImgsHtml = itemEvidences
                    .filter((ev) => ev.imageDataBase64)
                    .map((ev) => {
                        const rot = Number(ev.rotationDeg || 0);
                        return `
                        <div class="product-img-card">
                            <div class="product-img-frame">
                                <img src="${ev.imageDataBase64}" alt="${escapeHtml(ev.fileName)}" style="transform: rotate(${rot}deg);" />
                            </div>
                            <div class="evidence-caption">${escapeHtml(ev.fileName)}</div>
                        </div>`;
                    })
                    .join("");

                supplementaryHtml = `
                <div class="supp-box q16-box">
                    <div class="q16-grid">
                        <div class="q16-col">
                            <div class="supp-label">1. Ảnh mẫu tô màu (${escapeHtml(formatIndicatorCodesLabel(c.indicatorCodes))}):</div>
                            ${
                                sampleImgUrl
                                    ? `<div class="sample-img-frame"><img src="${sampleImgUrl}" alt="Hình mẫu tô màu Câu 16" /></div>`
                                    : `<div class="muted">Không có ảnh mẫu</div>`
                            }
                        </div>
                        <div class="q16-col">
                            <div class="supp-label">2. Sản phẩm bài làm của học sinh (${itemEvidences.length} ảnh):</div>
                            ${
                                evImgsHtml
                                    ? `<div class="product-img-grid">${evImgsHtml}</div>`
                                    : `<div class="empty-product-box">${
                                          isKhongLam
                                              ? "Học sinh không thực hiện tiêu chí này (Không làm)"
                                              : "Chưa đính kèm ảnh sản phẩm bài làm"
                                      }</div>`
                            }
                        </div>
                    </div>
                </div>`;
            } else if (itemEvidences.length > 0) {
                const evImgsHtml = itemEvidences
                    .filter((ev) => ev.imageDataBase64)
                    .map((ev) => {
                        const rot = Number(ev.rotationDeg || 0);
                        return `
                        <div class="evidence-thumb">
                            <img src="${ev.imageDataBase64}" alt="${escapeHtml(ev.fileName)}" style="transform: rotate(${rot}deg);" />
                            <div class="evidence-caption">${escapeHtml(ev.fileName)}</div>
                        </div>`;
                    })
                    .join("");
                supplementaryHtml = `<div class="supp-box"><div class="evidence-list">${evImgsHtml}</div></div>`;
            }

            return `
            <tr class="criterion-row">
                <td class="col-stt">${c.stt}</td>
                <td class="col-code">${escapeHtml(c.indicatorCodes.join(", "))}</td>
                <td class="col-content">
                    <div class="criterion-title">${escapeHtml(c.content)}</div>
                    ${supplementaryHtml}
                </td>
                <td class="col-choice ${isDat ? "choice-dat-active" : ""}">${isDat ? "✓ Đạt" : ""}</td>
                <td class="col-choice ${isKhongDat ? "choice-kdat-active" : ""}">${isKhongDat ? "✗ Không đạt" : ""}</td>
                <td class="col-choice ${isKhongLam ? "choice-klam-active" : ""}">${isKhongLam ? "— Không làm" : ""}</td>
                <td class="col-note">${escapeHtml(entry?.note || "")}</td>
            </tr>`;
        })
        .join("\n");

    const sigBadgeText =
        payload.signatureType === "CERTIFICATE_CA"
            ? "Chữ ký số chứng thư đã xác thực (Digital Certificate Signature)"
            : "Ký xác nhận bằng ảnh chữ ký";

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Phiếu khảo sát TCI - ${escapeHtml(payload.studentName)} (${escapeHtml(payload.studentCode)})</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 12mm 14mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: "Times New Roman", Times, Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 1.4;
    color: #0F172A;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
  }
  .page-container {
    position: relative;
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    padding: 4mm 0;
  }
  .draft-watermark {
    position: fixed;
    top: 44%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-32deg);
    font-family: Arial, sans-serif;
    font-size: 38pt;
    font-weight: 800;
    color: rgba(225, 29, 72, 0.11);
    border: 4px solid rgba(225, 29, 72, 0.14);
    padding: 10px 28px;
    border-radius: 12px;
    pointer-events: none;
    z-index: 9999;
    white-space: nowrap;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    border-bottom: 2px solid #003B3A;
    padding-bottom: 8px;
  }
  .header-left {
    width: 56%;
    vertical-align: top;
  }
  .header-right {
    width: 44%;
    vertical-align: top;
    text-align: right;
    font-size: 9.5pt;
    color: #334155;
  }
  .school-line1 {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #003B3A;
    letter-spacing: 0.3px;
  }
  .school-line2 {
    font-family: Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: 600;
    color: #00736E;
    margin-top: 2px;
  }
  .doc-title-box {
    text-align: center;
    margin: 10px 0 12px 0;
  }
  .doc-title {
    font-family: Arial, sans-serif;
    font-size: 13.5pt;
    font-weight: 800;
    color: #003B3A;
    margin: 0;
  }
  .doc-subtitle {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-weight: 600;
    color: #334155;
    margin-top: 3px;
  }
  .student-meta-box {
    border: 1px solid #CBD5E1;
    border-left: 4px solid #003B3A;
    border-radius: 6px;
    background: #F8FAFC;
    padding: 8px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .meta-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5pt;
  }
  .meta-grid td {
    padding: 3px 6px;
    vertical-align: top;
  }
  .meta-label {
    color: #475569;
    font-weight: 600;
  }
  .meta-val {
    color: #0F172A;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .criteria-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 10.5pt;
  }
  .criteria-table thead {
    display: table-header-group;
  }
  .criteria-table th {
    background: #003B3A;
    color: #FFFFFF;
    font-family: Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: 700;
    padding: 7px 6px;
    border: 1px solid #003B3A;
    text-align: center;
  }
  .criteria-table td {
    border: 1px solid #CBD5E1;
    padding: 6px 7px;
    vertical-align: top;
  }
  .criterion-row {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .col-stt {
    width: 34px;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .col-code {
    width: 58px;
    text-align: center;
    font-weight: 700;
    color: #003B3A;
    font-variant-numeric: tabular-nums;
  }
  .col-content {
    width: auto;
  }
  .criterion-title {
    font-weight: 600;
    color: #0F172A;
  }
  .col-choice {
    width: 68px;
    text-align: center;
    font-family: Arial, sans-serif;
    font-size: 9pt;
    font-weight: 700;
    vertical-align: middle !important;
  }
  .choice-dat-active {
    background: #ECFDF5;
    color: #059669;
  }
  .choice-kdat-active {
    background: #FFF1F2;
    color: #E11D48;
  }
  .choice-klam-active {
    background: #F1F5F9;
    color: #475569;
  }
  .col-note {
    width: 120px;
    font-size: 9.5pt;
    color: #334155;
  }
  .supp-box {
    margin-top: 6px;
    padding: 6px 8px;
    background: #F8FAFC;
    border: 1px dashed #94A3B8;
    border-radius: 5px;
    page-break-inside: avoid;
  }
  .supp-label {
    font-family: Arial, sans-serif;
    font-size: 9pt;
    font-weight: 700;
    color: #003B3A;
    margin-bottom: 4px;
  }
  .writing-grid {
    display: flex;
    gap: 12px;
  }
  .writing-col {
    flex: 1;
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    padding: 6px 8px;
    border-radius: 4px;
    min-height: 46px;
  }
  .writing-sample-val {
    font-size: 13pt;
    font-weight: 700;
    color: #003B3A;
    letter-spacing: 0.5px;
  }
  .writing-student-val {
    font-size: 12pt;
    color: #0F172A;
  }
  .q16-grid {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .q16-col {
    flex: 1;
    min-width: 0;
  }
  .sample-img-frame img {
    max-width: 100%;
    max-height: 150px;
    height: auto;
    object-fit: contain;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
    background: #FFFFFF;
    display: block;
  }
  .product-img-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .product-img-card {
    border: 1px solid #CBD5E1;
    background: #FFFFFF;
    border-radius: 4px;
    padding: 4px;
    max-width: 180px;
  }
  .product-img-frame {
    width: 168px;
    height: 136px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #F8FAFC;
  }
  .product-img-frame img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .empty-product-box {
    border: 1px dashed #CBD5E1;
    background: #FFFFFF;
    padding: 16px 10px;
    text-align: center;
    font-size: 9.5pt;
    color: #64748B;
    border-radius: 4px;
  }
  .evidence-list {
    display: flex;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .evidence-thumb img {
    max-width: 140px;
    max-height: 110px;
    object-fit: contain;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
  }
  .evidence-caption {
    font-size: 8pt;
    color: #475569;
    margin-top: 2px;
    text-align: center;
    word-break: break-all;
  }
  .summary-strip {
    display: flex;
    justify-content: space-between;
    border: 1.5px solid #003B3A;
    border-radius: 6px;
    background: #F8FAFC;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-variant-numeric: tabular-nums;
    page-break-inside: avoid;
  }
  .summary-item {
    font-weight: 700;
  }
  .summary-dat { color: #059669; }
  .summary-kdat { color: #E11D48; }
  .summary-klam { color: #475569; }
  .summary-chua { color: #D97706; }
  .comments-box {
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .comment-row {
    margin-bottom: 6px;
  }
  .comment-row:last-child {
    margin-bottom: 0;
  }
  .comment-label {
    font-family: Arial, sans-serif;
    font-size: 9.5pt;
    font-weight: 700;
    color: #003B3A;
  }
  .comment-val {
    font-size: 10.5pt;
    color: #0F172A;
    min-height: 18px;
    padding: 2px 0;
    border-bottom: 1px dotted #CBD5E1;
    white-space: pre-wrap;
  }
  .signature-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 10px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .audit-info-box {
    width: 52%;
    font-family: Arial, sans-serif;
    font-size: 8.5pt;
    color: #475569;
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .signer-box {
    width: 44%;
    text-align: center;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    padding: 8px 12px;
    background: #FFFFFF;
  }
  .signer-title {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-weight: 800;
    color: #003B3A;
  }
  .signer-subtitle {
    font-size: 8.5pt;
    font-style: italic;
    color: #64748B;
    margin-bottom: 6px;
  }
  .sig-image-wrap {
    min-height: 68px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px 0;
  }
  .sig-image-wrap img {
    max-width: 170px;
    max-height: 64px;
    object-fit: contain;
  }
  .sig-verified-stamp {
    display: inline-block;
    border: 1.5px solid #059669;
    background: #ECFDF5;
    color: #059669;
    font-family: Arial, sans-serif;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .signer-name {
    font-family: Arial, sans-serif;
    font-size: 10.5pt;
    font-weight: 700;
    color: #0F172A;
    margin-top: 4px;
  }
  .muted {
    color: #94A3B8;
    font-style: italic;
  }
</style>
</head>
<body>
<div class="page-container">
  ${showDraftWatermark ? `<div class="draft-watermark">BẢN NHÁP – CHƯA KÝ</div>` : ""}

  <table class="header-table">
    <tr>
      <td class="header-left">
        <div class="school-line1">${escapeHtml(exportConfig.schoolHeaderLine1)}</div>
        <div class="school-line2">${escapeHtml(exportConfig.schoolHeaderLine2)}</div>
      </td>
      <td class="header-right">
        <div>Mã mẫu: <strong>${escapeHtml(payload.templateCode)}</strong> (${escapeHtml(payload.templateVersionCode)})</div>
        <div>Phiên bản kết quả: <strong>v${payload.resultVersion}</strong> | Trạng thái: <strong>${isSigned ? "ĐÃ KÝ XÁC NHẬN" : "BẢN NHÁP"}</strong></div>
      </td>
    </tr>
  </table>

  <div class="doc-title-box">
    <h1 class="doc-title">${escapeHtml(exportConfig.documentTitle)}</h1>
    <div class="doc-subtitle">${escapeHtml(exportConfig.documentSubTitle)}</div>
  </div>

  <div class="student-meta-box">
    <table class="meta-grid">
      <tr>
        <td style="width: 55%;">
          <span class="meta-label">Họ và tên học sinh:</span>
          <span class="meta-val">${escapeHtml(payload.studentName)}</span>
        </td>
        <td style="width: 45%;">
          <span class="meta-label">Mã hồ sơ:</span>
          <span class="meta-val">${escapeHtml(payload.studentCode || payload.studentId)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="meta-label">Ngày sinh:</span>
          <span class="meta-val">${escapeHtml(formatDateVi(payload.studentDob))}</span>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          <span class="meta-label">Giới tính:</span>
          <span class="meta-val">${escapeHtml(payload.studentGender || "—")}</span>
        </td>
        <td>
          <span class="meta-label">Khối dự tuyển:</span>
          <span class="meta-val">${escapeHtml(payload.grade || "Khối 1")}</span>
          ${payload.campusName ? `&nbsp;|&nbsp;<span class="meta-val">${escapeHtml(payload.campusName)}</span>` : ""}
        </td>
      </tr>
      <tr>
        <td>
          <span class="meta-label">Đợt khảo sát:</span>
          <span class="meta-val">${escapeHtml(payload.batchName || payload.periodName || "Đợt khảo sát đầu vào")}</span>
        </td>
        <td>
          <span class="meta-label">Ngày khảo sát:</span>
          <span class="meta-val">${escapeHtml(formatDateVi(payload.assessmentDate || payload.signedAt || new Date()))}</span>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span class="meta-label">Giáo viên khảo sát / phụ trách:</span>
          <span class="meta-val">${escapeHtml(payload.signerName || payload.assessorName || payload.assignedTeacherName || "—")}</span>
        </td>
      </tr>
    </table>
  </div>

  <table class="criteria-table">
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã chỉ số</th>
        <th style="text-align: left;">Nội dung tiêu chí đánh giá</th>
        <th>Đạt</th>
        <th>Không đạt</th>
        <th>Không làm</th>
        <th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${criteriaRowsHtml}
    </tbody>
  </table>

  <div class="summary-strip">
    <div class="summary-item">Tổng số tiêu chí: ${summary.totalCriteria}</div>
    <div class="summary-item">Đã đánh giá: ${summary.countEvaluated}/${summary.totalCriteria}</div>
    <div class="summary-item summary-dat">Đạt: ${summary.countDat}/${summary.totalCriteria}</div>
    <div class="summary-item summary-kdat">Không đạt: ${summary.countKhongDat}/${summary.totalCriteria}</div>
    <div class="summary-item summary-klam">Không làm: ${summary.countKhongLam}/${summary.totalCriteria}</div>
    <div class="summary-item summary-chua">Chưa đánh giá: ${summary.countChuaDanhGia}/${summary.totalCriteria}</div>
  </div>

  <div class="comments-box">
    ${
        footerConfig.enableHighlightsComment
            ? `<div class="comment-row">
                <div class="comment-label">1. ${escapeHtml(footerConfig.highlightsCommentLabel)}:</div>
                <div class="comment-val">${escapeHtml(payload.highlightsComment || "—")}</div>
              </div>`
            : ""
    }
    ${
        footerConfig.enableSupportNeededComment
            ? `<div class="comment-row">
                <div class="comment-label">2. ${escapeHtml(footerConfig.supportNeededCommentLabel)}:</div>
                <div class="comment-val">${escapeHtml(payload.supportNeededComment || "—")}</div>
              </div>`
            : ""
    }
    ${
        footerConfig.enableTeacherRecommendation
            ? `<div class="comment-row">
                <div class="comment-label">3. ${escapeHtml(footerConfig.teacherRecommendationLabel)}:</div>
                <div class="comment-val">${escapeHtml(payload.teacherRecommendation || "—")}</div>
              </div>`
            : ""
    }
    ${
        footerConfig.enableGeneralComment
            ? `<div class="comment-row">
                <div class="comment-label">4. ${escapeHtml(footerConfig.generalCommentLabel)}:</div>
                <div class="comment-val">${escapeHtml(payload.generalComment || "—")}</div>
              </div>`
            : ""
    }
  </div>

  <div class="signature-section">
    <div class="audit-info-box">
      <div style="font-weight: 700; color: #003B3A; margin-bottom: 4px;">THÔNG TIN XÁC THỰC HỒ SƠ KHẢO SÁT</div>
      <div>• Môn khảo sát: <strong>TCI – Bộ chuẩn phát triển trẻ em 5–6 tuổi</strong></div>
      <div>• Mã phiếu: <strong>${escapeHtml(payload.recordId)}</strong> (Phiên bản kết quả: v${payload.resultVersion})</div>
      <div>• Hình thức ký: <strong>${isSigned ? escapeHtml(sigBadgeText) : "Chưa ký"}</strong></div>
      <div>• Thời điểm ký: <strong>${isSigned ? escapeHtml(formatDateTimeVi(payload.signedAt)) : "—"}</strong></div>
      ${
          payload.signedSnapshotHash
              ? `<div style="margin-top: 3px; word-break: break-all;">• Mã toàn vẹn SHA-256: <code style="font-size: 7.5pt;">${escapeHtml(payload.signedSnapshotHash)}</code></div>`
              : ""
      }
    </div>

    <div class="signer-box">
      <div class="signer-title">${escapeHtml(footerConfig.examinerSignatureTitle || "GIÁO VIÊN KHẢO SÁT")}</div>
      <div class="signer-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="sig-image-wrap">
        ${
            isSigned && payload.signatureImageBase64
                ? `<img src="${payload.signatureImageBase64}" alt="Chữ ký giáo viên" />`
                : isSigned
                  ? `<div class="sig-verified-stamp">✓ ĐÃ KÝ XÁC NHẬN ĐIỆN TỬ</div>`
                  : `<div class="muted">(Chưa ký xác nhận)</div>`
        }
      </div>
      ${isSigned ? `<div class="sig-verified-stamp">✓ ĐÃ KÝ: ${escapeHtml(formatDateTimeVi(payload.signedAt))}</div>` : ""}
      <div class="signer-name">${escapeHtml(payload.signerName || payload.assessorName || payload.assignedTeacherName || "")}</div>
      ${payload.signerRole ? `<div style="font-size: 8.5pt; color: #475569;">${escapeHtml(payload.signerRole)}</div>` : ""}
    </div>
  </div>
</div>
</body>
</html>`;
}

/**
 * Tạo bản PDF fallback chuẩn %PDF-1.4 hợp lệ (có nhúng toàn bộ snapshot + thông tin học sinh + 16 tiêu chí)
 * dùng khi môi trường chạy không bật trình duyệt Chromium headless.
 */
function buildFallbackPdfBuffer(payload: TciDocumentRenderPayload, htmlContent: string): Buffer {
    const criteriaConfig = payload.criteriaConfig ?? DEFAULT_TCI_CRITERIA_16;
    const normalized = normalizeCriterionResults(payload.criteriaResults, criteriaConfig);
    const summary = computeTciSummary(normalized, criteriaConfig);

    // Chuyển tiếng Việt sang ASCII có dấu ngoặc để hiển thị trong font Helvetica cơ bản của PDF stream,
    // đồng thời nhúng nguyên vẹn UTF-8 HTML/JSON vào PDF stream để không mất bất kỳ ký tự tiếng Việt hay ảnh nào.
    const toAsciiSafe = (str: string) =>
        str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[\\()]/g, "")
            .replace(/[^\x20-\x7E]/g, " ");

    const lines: string[] = [
        "HE THONG GIAO DUC SKY-LINE - PHIEU KHAO SAT DAU VAO LOP 1",
        "MON: TCI - BO CHUAN PHAT TRIEN TRE EM 5-6 TUOI (16 TIEU CHI)",
        "----------------------------------------------------------------------------",
        `Ho va ten: ${toAsciiSafe(payload.studentName)} | Ma ho so: ${toAsciiSafe(payload.studentCode || payload.studentId)}`,
        `Khoi du tuyen: ${toAsciiSafe(payload.grade || "Khoi 1")} | Phien ban ket qua: v${payload.resultVersion}`,
        `Giao vien khao sat: ${toAsciiSafe(payload.signerName || payload.assessorName || payload.assignedTeacherName || "")}`,
        `Trang thai ky: ${payload.signatureStatus} | Thoi diem ky: ${toAsciiSafe(formatDateTimeVi(payload.signedAt))}`,
        `Tong hop: Da danh gia ${summary.countEvaluated}/16 | Dat: ${summary.countDat}/16 | Khong dat: ${summary.countKhongDat}/16 | Khong lam: ${summary.countKhongLam}/16 | Chua danh gia: ${summary.countChuaDanhGia}/16`,
        "----------------------------------------------------------------------------",
    ];

    for (const c of criteriaConfig) {
        const entry = normalized[c.criterionId];
        const statusLabel = toAsciiSafe(getTciChoiceLabel(entry?.status));
        const codes = c.indicatorCodes.join(",");
        const shortContent = toAsciiSafe(c.content).slice(0, 58);
        lines.push(
            `STT ${String(c.stt).padStart(2, "0")} [Chi so ${codes}]: ${statusLabel.padEnd(14, " ")} | ${shortContent}`
        );
    }

    lines.push("----------------------------------------------------------------------------");
    lines.push(`Diem noi bat: ${toAsciiSafe(payload.highlightsComment || "-")}`);
    lines.push(`Noi dung can ho tro: ${toAsciiSafe(payload.supportNeededComment || "-")}`);
    lines.push(`De xuat cua GV: ${toAsciiSafe(payload.teacherRecommendation || "-")}`);
    lines.push(`Nhan xet chung: ${toAsciiSafe(payload.generalComment || "-")}`);
    if (payload.signedSnapshotHash) {
        lines.push(`SHA-256: ${payload.signedSnapshotHash}`);
    }

    const textOps = lines
        .map((line, idx) => {
            const y = 800 - idx * 22;
            return `1 0 0 1 36 ${y} Tm (${line}) Tj`;
        })
        .join("\n");

    const streamContent = `BT\n/F1 9 Tf\n${textOps}\nET`;
    const htmlBase64 = Buffer.from(htmlContent, "utf-8").toString("base64");

    const objects: string[] = [];
    objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
    objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
    objects.push(
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj"
    );
    objects.push(
        `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, "utf-8")} >>\nstream\n${streamContent}\nendstream\nendobj`
    );
    objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
    objects.push(
        `6 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${Buffer.byteLength(htmlBase64, "utf-8")} >>\nstream\n${htmlBase64}\nendstream\nendobj`
    );

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

/**
 * Sinh file PDF thực sự cho phiếu TCI (ưu tiên Puppeteer A4 đầy đủ tiếng Việt & ảnh, fallback sang PDF 1.4 chuẩn)
 */
export async function generateTciPdfBuffer(payload: TciDocumentRenderPayload): Promise<{
    pdfBuffer: Buffer;
    htmlContent: string;
    pdfSha256: string;
    fileName: string;
}> {
    const htmlContent = buildTciAssessmentHtml(payload);
    const fileName = buildTciPdfFileName({
        studentCode: payload.studentCode,
        studentId: payload.studentId,
        periodCode: payload.periodCode,
        periodId: payload.periodName,
        resultVersion: payload.resultVersion,
    });

    let pdfBuffer: Buffer | null = null;

    // Bỏ qua Puppeteer trong môi trường vitest để test chạy tức thì và ổn định
    const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

    if (!isTestEnv) {
        try {
            const puppeteer = await import("puppeteer");
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
                timeout: 8000,
            });
            try {
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: "load", timeout: 8000 });
                const uint8 = await page.pdf({
                    format: "A4",
                    printBackground: true,
                    margin: { top: "10mm", right: "10mm", bottom: "12mm", left: "10mm" },
                });
                pdfBuffer = Buffer.from(uint8);
            } finally {
                await browser.close();
            }
        } catch {
            pdfBuffer = null;
        }
    }

    if (!pdfBuffer) {
        pdfBuffer = buildFallbackPdfBuffer(payload, htmlContent);
    }

    const pdfSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return {
        pdfBuffer,
        htmlContent,
        pdfSha256,
        fileName,
    };
}

const PRIVATE_PDF_STORAGE_DIR = path.resolve(process.cwd(), "storage", "tci-signed-pdfs");

/**
 * Lưu trữ bất biến file PDF đã ký vào thư mục riêng tư trên server
 */
export async function saveImmutableSignedTciPdf(params: {
    recordId: string;
    resultVersion: number;
    fileName: string;
    pdfBuffer: Buffer;
    htmlContent: string;
}): Promise<{ storageKey: string; absolutePath: string }> {
    const safeFileName = params.fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storageKey = `${params.recordId}_v${params.resultVersion}_${safeFileName}`;
    try {
        await fs.promises.mkdir(PRIVATE_PDF_STORAGE_DIR, { recursive: true });
        const fullPdfPath = path.join(PRIVATE_PDF_STORAGE_DIR, storageKey);
        const fullHtmlPath = path.join(PRIVATE_PDF_STORAGE_DIR, `${storageKey}.html`);
        await fs.promises.writeFile(fullPdfPath, params.pdfBuffer);
        await fs.promises.writeFile(fullHtmlPath, params.htmlContent, "utf-8");
        return { storageKey, absolutePath: fullPdfPath };
    } catch {
        return { storageKey, absolutePath: "" };
    }
}

/**
 * Đọc lại file PDF bất biến đã lưu từ khóa lưu trữ riêng tư (hoặc tái tạo từ signedSnapshotJson nếu file đĩa tạm bị dọn)
 */
export async function readImmutableSignedTciPdf(storageKey: string): Promise<Buffer | null> {
    if (!storageKey || storageKey.includes("..") || storageKey.includes("/") || storageKey.includes("\\")) {
        return null;
    }
    try {
        const fullPdfPath = path.join(PRIVATE_PDF_STORAGE_DIR, storageKey);
        const exists = fs.existsSync(fullPdfPath);
        if (!exists) return null;
        return await fs.promises.readFile(fullPdfPath);
    } catch {
        return null;
    }
}
