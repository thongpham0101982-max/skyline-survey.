import { NextRequest, NextResponse } from "next/server";
import {
  generateK12ApprovalToken,
  verifyK12ApprovalToken,
} from "@/lib/k12-approval-service";
import { ensurePvdhSchema, getPvdhDb } from "@/lib/pvdh/schema-init";
import {
  findInputStudentByStableKey,
  getPvdhDocumentOutput,
} from "@/lib/pvdh/service";
import { PvdhActor } from "@/lib/pvdh/auth-guard";
import {
  PVDH_WORKFLOW_STATUS_LABELS,
  PvdhWorkflowStatus,
} from "@/lib/pvdh/constants";
import { getStudentOrientationRecord } from "@/lib/orientation/service";

export const dynamic = "force-dynamic";

function escapeHtml(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMultiline(val: unknown): string {
  return escapeHtml(val).replace(/\r?\n/g, "<br/>");
}

function formatViDate(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(String(val));
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("vi-VN");
}

function renderStatusPage(params: {
  title: string;
  badgeText: string;
  badgeVariant: "error" | "warn" | "info";
  bodyHtml: string;
  baseUrl: string;
}): string {
  const badgeStyles =
    params.badgeVariant === "error"
      ? "background:#FFF1F2;color:#E11D48;border:1px solid #FECDD3;"
      : params.badgeVariant === "warn"
      ? "background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;"
      : "background:#F0FDFA;color:#00736E;border:1px solid #99F6E4;";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.title)} — Sky-Line SSM</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 14px;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    .card {
      max-width: 680px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);
    }
    .header {
      background: #003B3A;
      color: #FFFFFF;
      padding: 20px 24px;
      border-bottom: 3px solid #00A19A;
    }
    .header-sub {
      font-size: 11px;
      font-weight: 700;
      color: #99F6E4;
      letter-spacing: 0.4px;
      margin-bottom: 6px;
    }
    .header-title {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
    }
    .content {
      padding: 24px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 14px;
      ${badgeStyles}
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      display: inline-block;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: #003B3A;
      color: #FFFFFF;
    }
    .btn-secondary {
      background: #F0FDFA;
      color: #00736E;
      border-color: #99F6E4;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    .meta-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #F1F5F9;
    }
    .meta-table td:first-child {
      width: 38%;
      color: #64748B;
      font-weight: 600;
    }
    .meta-table td:last-child {
      color: #0F172A;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-sub">Hệ thống Giáo dục Sky-Line • Phiếu phỏng vấn định hướng</div>
      <h1 class="header-title">${escapeHtml(params.title)}</h1>
    </div>
    <div class="content">
      <div class="badge">${escapeHtml(params.badgeText)}</div>
      ${params.bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

function injectViewerToolbar(params: {
  rawHtml: string;
  studentName: string;
  studentCode: string;
  grade: string;
  templateCode: string;
  statusLabel: string;
  pdfUrl: string;
  quickApproveUrl: string;
  portalUrl: string;
}): string {
  const toolbarStyle = `
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  .ssm-pvdh-toolbar {
    position: sticky;
    top: 0;
    z-index: 9999;
    background: #003B3A;
    color: #FFFFFF;
    border-bottom: 3px solid #00A19A;
    padding: 12px 18px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: 0 4px 14px rgba(0, 59, 58, 0.18);
  }
  .ssm-pvdh-toolbar-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .ssm-pvdh-toolbar-title {
    font-size: 14px;
    font-weight: 800;
    color: #FFFFFF;
    line-height: 1.3;
  }
  .ssm-pvdh-toolbar-sub {
    font-size: 12px;
    color: #CCFBF1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .ssm-pvdh-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.14);
    color: #5EEAD4;
    font-size: 11px;
    font-weight: 700;
  }
  .ssm-pvdh-toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .ssm-pvdh-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 13px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.2;
  }
  .ssm-pvdh-btn-print {
    background: #FFFFFF;
    color: #003B3A;
  }
  .ssm-pvdh-btn-pdf {
    background: #00A19A;
    color: #FFFFFF;
  }
  .ssm-pvdh-btn-approve {
    background: #059669;
    color: #FFFFFF;
  }
  .ssm-pvdh-btn-portal {
    background: rgba(255, 255, 255, 0.1);
    color: #E2E8F0;
    border-color: rgba(255, 255, 255, 0.25);
  }
  @media screen {
    body {
      background: #E2E8F0 !important;
      padding-bottom: 32px !important;
    }
    .bm-page, .page {
      margin: 18px auto !important;
      background: #FFFFFF !important;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12) !important;
      border-radius: 6px;
    }
  }
  @media screen and (max-width: 820px) {
    .ssm-pvdh-toolbar {
      padding: 10px 12px;
    }
    .bm-page, .page {
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      margin: 10px 0 !important;
      padding: 14px 12px !important;
      border-radius: 0 !important;
    }
  }
  @media print {
    .ssm-pvdh-toolbar {
      display: none !important;
    }
    body {
      background: #FFFFFF !important;
      padding: 0 !important;
    }
  }
</style>`;

  const toolbarHtml = `
<div class="ssm-pvdh-toolbar">
  <div class="ssm-pvdh-toolbar-info">
    <div class="ssm-pvdh-toolbar-title">Phiếu phỏng vấn định hướng — ${escapeHtml(params.studentName)} (${escapeHtml(params.studentCode)})</div>
    <div class="ssm-pvdh-toolbar-sub">
      <span>Khối ${escapeHtml(params.grade || "—")}</span>
      <span>•</span>
      <span>Mẫu ${escapeHtml(params.templateCode)}</span>
      <span class="ssm-pvdh-pill">${escapeHtml(params.statusLabel)}</span>
    </div>
  </div>
  <div class="ssm-pvdh-toolbar-actions">
    <button type="button" class="ssm-pvdh-btn ssm-pvdh-btn-print" onclick="window.print()">In phiếu</button>
    <a href="${escapeHtml(params.pdfUrl)}" target="_blank" class="ssm-pvdh-btn ssm-pvdh-btn-pdf">Tải PDF</a>
    <a href="${escapeHtml(params.quickApproveUrl)}" class="ssm-pvdh-btn ssm-pvdh-btn-approve">Xét duyệt nhanh</a>
    <a href="${escapeHtml(params.portalUrl)}" target="_blank" class="ssm-pvdh-btn ssm-pvdh-btn-portal">Mở SSM Portal</a>
  </div>
</div>`;

  let html = params.rawHtml;
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${toolbarStyle}\n</head>`);
  } else {
    html = toolbarStyle + html;
  }

  const bodyOpenMatch = html.match(/<body[^>]*>/i);
  if (bodyOpenMatch) {
    html = html.replace(bodyOpenMatch[0], `${bodyOpenMatch[0]}\n${toolbarHtml}`);
  } else {
    html = toolbarHtml + html;
  }
  return html;
}

function renderLegacyOrientationHtml(params: {
  student: any;
  record: any;
  quickApproveUrl: string;
  portalUrl: string;
}): string {
  const { student, record } = params;
  let interviewItems: Array<{ questionText?: string; rating?: string; answerNotes?: string }> = [];
  try {
    const parsed = JSON.parse(record.interviewData || "[]");
    if (Array.isArray(parsed)) interviewItems = parsed;
  } catch {
    interviewItems = [];
  }

  const interviewRows =
    interviewItems.length > 0
      ? interviewItems
          .map(
            (item, idx) => `
        <tr>
          <td style="width:44px;text-align:center;color:#64748B;">${idx + 1}</td>
          <td style="font-weight:600;color:#0F172A;">${escapeHtml(item.questionText || "Tiêu chí phỏng vấn")}</td>
          <td style="width:130px;text-align:center;font-weight:700;color:#00736E;">${escapeHtml(item.rating || "—")}</td>
          <td style="color:#334155;">${item.answerNotes ? escapeMultiline(item.answerNotes) : "—"}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="4" style="text-align:center;color:#64748B;padding:16px;">Chưa có nội dung câu hỏi chi tiết.</td></tr>`;

  const statusText =
    record.status === "COMPLETED"
      ? "Đã hoàn thành"
      : record.status === "IN_PROGRESS"
      ? "Đang thực hiện"
      : record.status || "Bản nháp";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phiếu phỏng vấn định hướng — ${escapeHtml(student.fullName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #003B3A;
      color: #FFFFFF;
      border-bottom: 3px solid #00A19A;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .toolbar-title { font-size: 14px; font-weight: 800; }
    .toolbar-sub { font-size: 12px; color: #CCFBF1; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn {
      display: inline-block;
      padding: 7px 13px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-white { background: #FFFFFF; color: #003B3A; }
    .btn-green { background: #059669; color: #FFFFFF; }
    .btn-ghost { background: rgba(255,255,255,0.1); color: #E2E8F0; border-color: rgba(255,255,255,0.25); }
    .container { max-width: 900px; margin: 20px auto; padding: 0 14px 36px 14px; }
    .sheet {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 6px 20px rgba(0, 59, 58, 0.06);
    }
    .section { margin-top: 20px; }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #003B3A;
      border-left: 4px solid #003B3A;
      padding-left: 10px;
      margin-bottom: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px;
      font-size: 13px;
    }
    .kv-label { font-size: 11px; font-weight: 600; color: #64748B; }
    .kv-val { font-size: 13px; font-weight: 700; color: #0F172A; margin-top: 2px; }
    .note-box {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.55;
      color: #334155;
      margin-bottom: 8px;
    }
    .note-box strong { color: #003B3A; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
    }
    thead tr { background: #003B3A; color: #FFFFFF; }
    th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
    @media print {
      .toolbar { display: none !important; }
      body { background: #FFFFFF; }
      .container { margin: 0; padding: 0; max-width: 100%; }
      .sheet { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <div class="toolbar-title">Phiếu phỏng vấn định hướng — ${escapeHtml(student.fullName)} (${escapeHtml(student.studentCode)})</div>
      <div class="toolbar-sub">Khối ${escapeHtml(student.grade || "—")} • Trạng thái: ${escapeHtml(statusText)}</div>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn btn-white" onclick="window.print()">In phiếu</button>
      <a href="${escapeHtml(params.quickApproveUrl)}" class="btn btn-green">Xét duyệt nhanh</a>
      <a href="${escapeHtml(params.portalUrl)}" target="_blank" class="btn btn-ghost">Mở SSM Portal</a>
    </div>
  </div>
  <div class="container">
    <div class="sheet">
      <div class="section" style="margin-top:0;">
        <div class="section-title">Thông tin chung</div>
        <div class="grid">
          <div><div class="kv-label">Học sinh</div><div class="kv-val">${escapeHtml(student.fullName)}</div></div>
          <div><div class="kv-label">Mã hồ sơ</div><div class="kv-val">${escapeHtml(student.studentCode || "—")}</div></div>
          <div><div class="kv-label">Ngày sinh</div><div class="kv-val">${escapeHtml(formatViDate(student.dateOfBirth))}</div></div>
          <div><div class="kv-label">Khối / Hệ</div><div class="kv-val">Khối ${escapeHtml(student.grade || "—")} / ${escapeHtml(student.surveyFormType || student.surveySystem || "—")}</div></div>
          <div><div class="kv-label">Người phỏng vấn</div><div class="kv-val">${escapeHtml(record.interviewerName || "—")}</div></div>
          <div><div class="kv-label">Ngày phỏng vấn</div><div class="kv-val">${escapeHtml(formatViDate(record.interviewDate))}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Phỏng vấn học sinh</div>
        ${record.adaptationLevel ? `<div class="note-box"><strong>Mức độ thích nghi:</strong> ${escapeHtml(record.adaptationLevel)}</div>` : ""}
        <table>
          <thead>
            <tr>
              <th style="text-align:center;">STT</th>
              <th>Nội dung / Tiêu chí</th>
              <th style="text-align:center;">Đánh giá</th>
              <th>Ghi nhận chi tiết</th>
            </tr>
          </thead>
          <tbody>${interviewRows}</tbody>
        </table>
        ${record.studentStrengths ? `<div class="note-box" style="margin-top:10px;"><strong>Điểm mạnh nổi bật:</strong><br/>${escapeMultiline(record.studentStrengths)}</div>` : ""}
        ${record.studentNeedsSupport ? `<div class="note-box"><strong>Nội dung cần hỗ trợ:</strong><br/>${escapeMultiline(record.studentNeedsSupport)}</div>` : ""}
        ${record.interviewerGeneralRemark ? `<div class="note-box"><strong>Nhận xét chung của GV:</strong><br/>${escapeMultiline(record.interviewerGeneralRemark)}</div>` : ""}
      </div>

      <div class="section">
        <div class="section-title">2. Trao đổi với phụ huynh học sinh</div>
        <div class="note-box"><strong>Đại diện PHHS:</strong> ${escapeHtml(record.parentRepresentativeName || "—")} ${record.parentPhone ? `• SĐT: ${escapeHtml(record.parentPhone)}` : ""}</div>
        ${record.parentExpectations ? `<div class="note-box"><strong>Kỳ vọng của gia đình:</strong><br/>${escapeMultiline(record.parentExpectations)}</div>` : ""}
        ${record.parentPersonalityNotes ? `<div class="note-box"><strong>Đặc điểm tính cách, thói quen:</strong><br/>${escapeMultiline(record.parentPersonalityNotes)}</div>` : ""}
        ${record.parentHealthNotes ? `<div class="note-box"><strong>Lưu ý sức khỏe / đặc thù:</strong><br/>${escapeMultiline(record.parentHealthNotes)}</div>` : ""}
        ${record.parentSpecialRequests ? `<div class="note-box"><strong>Đề nghị / mong muốn riêng:</strong><br/>${escapeMultiline(record.parentSpecialRequests)}</div>` : ""}
        ${record.cooperationCommitment ? `<div class="note-box"><strong>Cam kết phối hợp:</strong><br/>${escapeMultiline(record.cooperationCommitment)}</div>` : ""}
      </div>

      <div class="section">
        <div class="section-title">3. Định hướng & đề xuất</div>
        <div class="note-box"><strong>Hệ học đề xuất:</strong> ${escapeHtml(record.proposedEduSystem || "—")} &nbsp;|&nbsp; <strong>Xếp lớp dự kiến:</strong> ${escapeHtml(record.proposedClassPlacement || "—")}</div>
        ${record.admissionConsultantNote ? `<div class="note-box"><strong>Ghi chú tư vấn / định hướng:</strong><br/>${escapeMultiline(record.admissionConsultantNote)}</div>` : ""}
        ${record.psychologyReferralStatus && record.psychologyReferralStatus !== "NONE" ? `<div class="note-box" style="border-color:#FCD34D;background:#FFFBEB;"><strong>Khảo sát tâm lý bổ sung:</strong> ${escapeHtml(record.psychologyReferralStatus)} ${record.psychologyReferralReason ? `— ${escapeHtml(record.psychologyReferralReason)}` : ""}</div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = (searchParams.get("studentId") || "").trim();
  const email = (searchParams.get("email") || "gdcs@skylineschool.edu.vn").trim();
  const token = (searchParams.get("token") || "").trim();
  const format = searchParams.get("format") === "pdf" ? "pdf" : "html";

  const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const isValid = verifyK12ApprovalToken(studentId, "VIEW_PVDH", email, token);
  if (!isValid) {
    return new NextResponse(
      renderStatusPage({
        title: "Liên kết xem phiếu không hợp lệ",
        badgeText: "Xác thực không thành công",
        badgeVariant: "error",
        baseUrl,
        bodyHtml: `
          <p style="font-size:14px;color:#475569;line-height:1.6;">
            Liên kết xem Phiếu phỏng vấn định hướng không hợp lệ hoặc đã bị thay đổi vì lý do bảo mật. Vui lòng mở lại trực tiếp từ Email xét duyệt hoặc truy cập Cổng quản lý SSM.
          </p>
          <div class="actions">
            <a href="${escapeHtml(baseUrl)}/admin/xet-duyet-ket-qua?tab=k12" class="btn btn-primary">Mở Cổng Xét duyệt SSM →</a>
          </div>
        `,
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } }
    );
  }

  const student = await findInputStudentByStableKey(studentId);
  if (!student) {
    return new NextResponse(
      renderStatusPage({
        title: "Không tìm thấy hồ sơ học sinh",
        badgeText: "Không tìm thấy dữ liệu",
        badgeVariant: "error",
        baseUrl,
        bodyHtml: `
          <p style="font-size:14px;color:#475569;line-height:1.6;">
            Hồ sơ học sinh không tồn tại hoặc đã được chuyển khỏi hệ thống.
          </p>
          <div class="actions">
            <a href="${escapeHtml(baseUrl)}/admin/xet-duyet-ket-qua?tab=k12" class="btn btn-primary">Mở Cổng Xét duyệt SSM →</a>
          </div>
        `,
      }),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } }
    );
  }

  const normEmail = email.toLowerCase();
  const quickApproveToken = generateK12ApprovalToken(student.id, "DAT", normEmail);
  const quickApproveUrl = `${baseUrl}/api/admin/quick-approve/k12?studentId=${encodeURIComponent(student.id)}&action=DAT&email=${encodeURIComponent(normEmail)}&token=${quickApproveToken}`;
  const portalUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12${student.periodId ? `&periodId=${encodeURIComponent(student.periodId)}` : ""}${student.batchId ? `&batchId=${encodeURIComponent(student.batchId)}` : ""}&studentId=${encodeURIComponent(student.id)}`;
  const pdfUrl = `${baseUrl}/api/admin/quick-approve/pvdh?studentId=${encodeURIComponent(student.id)}&email=${encodeURIComponent(normEmail)}&token=${encodeURIComponent(token)}&format=pdf`;

  try {
    await ensurePvdhSchema();
    const db = getPvdhDb();
    const pvdhRecord = await db.pvdhAssessmentRecord.findFirst({
      where: { studentId: student.id, isLatestAttempt: true },
      orderBy: [{ attemptNumber: "desc" }],
    });

    if (pvdhRecord) {
      const verifiedActor: PvdhActor = {
        authenticated: true,
        userId: `email_gdcs:${normEmail}`,
        userName: `Giám đốc Cơ sở (${normEmail})`,
        userEmail: normEmail,
        role: "GDCS",
        teacherId: null,
        teacherPosition: "GDCS",
        campusIds: [],
        campusCodes: [],
        isSystemWideAdmin: true,
        canManageConfig: false,
        canCoordinate: false,
        canReviewAndLock: false,
        canReopenLocked: false,
        isParent: false,
      };

      const doc = await getPvdhDocumentOutput({
        actor: verifiedActor,
        studentId: student.id,
        attemptNumber: pvdhRecord.attemptNumber,
        format,
      });

      if (format === "pdf") {
        return new Response(new Uint8Array(doc.buffer), {
          status: 200,
          headers: {
            "Content-Type": doc.contentType,
            "Content-Disposition": `inline; filename="${doc.fileName}"`,
            "Cache-Control": "private, no-store, max-age=0",
          },
        });
      }

      const statusKey = (pvdhRecord.workflowStatus || "DRAFT") as PvdhWorkflowStatus;
      const statusLabel = PVDH_WORKFLOW_STATUS_LABELS[statusKey]?.label || pvdhRecord.workflowStatus || "Bản nháp";

      const enhancedHtml = injectViewerToolbar({
        rawHtml: doc.buffer.toString("utf-8"),
        studentName: student.fullName || "Học sinh",
        studentCode: student.studentCode || "",
        grade: student.grade || "",
        templateCode: pvdhRecord.templateCode || "PVĐH",
        statusLabel,
        pdfUrl,
        quickApproveUrl,
        portalUrl,
      });

      return new NextResponse(enhancedHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    // Fallback: Kiểm tra phiếu định hướng lưu ở bảng StudentOrientationRecord (bản cũ)
    const legacyRecord = await getStudentOrientationRecord(student.id).catch(() => null);
    if (legacyRecord) {
      const legacyHtml = renderLegacyOrientationHtml({
        student,
        record: legacyRecord,
        quickApproveUrl,
        portalUrl,
      });
      return new NextResponse(legacyHtml, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    // Chưa có phiếu phỏng vấn định hướng nào được nhập
    return new NextResponse(
      renderStatusPage({
        title: "Chưa có kết quả Phiếu phỏng vấn định hướng",
        badgeText: "Chưa lập phiếu",
        badgeVariant: "warn",
        baseUrl,
        bodyHtml: `
          <p style="font-size:14px;color:#475569;line-height:1.6;margin-top:0;">
            Giáo viên được phân công hiện chưa nhập hoặc lưu kết quả Phiếu phỏng vấn định hướng cho học sinh này trên hệ thống SSM. Khi giáo viên cập nhật xong, Thầy/Cô có thể chạm lại liên kết này để xem ngay kết quả mới nhất.
          </p>
          <table class="meta-table">
            <tr><td>Họ và tên học sinh</td><td>${escapeHtml(student.fullName || "—")}</td></tr>
            <tr><td>Mã HS khảo sát</td><td>${escapeHtml(student.studentCode || "—")}</td></tr>
            <tr><td>Khối lớp / Hệ học</td><td>Khối ${escapeHtml(student.grade || "—")} / Hệ ${escapeHtml(student.surveyFormType || student.surveySystem || "—")}</td></tr>
            <tr><td>Ngày sinh</td><td>${escapeHtml(formatViDate(student.dateOfBirth))}</td></tr>
          </table>
          <div class="actions">
            <a href="javascript:window.location.reload()" class="btn btn-secondary">Tải lại kiểm tra</a>
            <a href="${escapeHtml(quickApproveUrl)}" class="btn btn-primary">Mở trang Xét duyệt nhanh →</a>
            <a href="${escapeHtml(portalUrl)}" target="_blank" class="btn btn-secondary">Mở trên SSM Portal</a>
          </div>
        `,
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } }
    );
  } catch (err: any) {
    console.error("[API GET /api/admin/quick-approve/pvdh] Error:", err);
    return new NextResponse(
      renderStatusPage({
        title: "Không thể tải Phiếu phỏng vấn định hướng",
        badgeText: "Lỗi hệ thống",
        badgeVariant: "error",
        baseUrl,
        bodyHtml: `
          <p style="font-size:14px;color:#475569;line-height:1.6;">
            Đã xảy ra sự cố khi tải dữ liệu phiếu: ${escapeHtml(err?.message || "Lỗi không xác định")}.
          </p>
          <div class="actions">
            <a href="${escapeHtml(portalUrl)}" target="_blank" class="btn btn-primary">Mở hồ sơ trên SSM Portal →</a>
          </div>
        `,
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } }
    );
  }
}
