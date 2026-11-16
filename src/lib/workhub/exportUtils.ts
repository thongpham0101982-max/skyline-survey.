import * as XLSX from "xlsx"
import type { WorkHubReportRecord } from "./types"

function escapeHtml(raw?: string | null): string {
  if (!raw) return ""
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Sinh nội dung tài liệu HTML chuẩn Office (UTF-8 BOM + Times New Roman) để mở trên Microsoft Word & kết xuất PDF
 * Bảo đảm 100% tiếng Việt có dấu hiển thị chính xác, không lỗi font.
 */
export function buildWorkHubReportDocumentHtml(report: WorkHubReportRecord): string {
  const snap = report.snapshot
  const scopeTitle =
    report.reportScope === "INDIVIDUAL"
      ? "BÁO CÁO CÔNG VIỆC CÁ NHÂN"
      : report.reportScope === "DEPARTMENT"
      ? "BÁO CÁO TỔNG HỢP PHÒNG BAN / TỔ CHUYÊN MÔN"
      : "BÁO CÁO TỔNG HỢP CƠ SỞ"

  const deliverablesRows =
    snap.deliverablesSummary.length === 0
      ? `<tr><td colspan="5" style="padding:8px;text-align:center;border:1px solid #CBD5E1;">Chưa có công việc trong kỳ</td></tr>`
      : snap.deliverablesSummary
          .map(
            (d, idx) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;text-align:center;">${idx + 1}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;font-weight:bold;">${escapeHtml(d.taskCode)}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;">${escapeHtml(d.title)}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;">${escapeHtml(d.resultSummary || d.deliverables || "—")}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;text-align:center;">${
              d.hasEvidence ? "Đã có" : "Thiếu"
            }</td>
          </tr>`
          )
          .join("")

  const kpiRows =
    snap.kpiSummary.length === 0
      ? `<tr><td colspan="4" style="padding:8px;text-align:center;border:1px solid #CBD5E1;">Không cấu hình chỉ số KPI bắt buộc cho kỳ này</td></tr>`
      : snap.kpiSummary
          .map(
            (k) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;font-weight:bold;">${escapeHtml(k.kpiCode)}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;">${escapeHtml(k.kpiName)}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;text-align:center;">${escapeHtml(k.targetDisplay)}</td>
            <td style="padding:6px 8px;border:1px solid #CBD5E1;text-align:center;font-weight:bold;">${escapeHtml(k.actualDisplay)}</td>
          </tr>`
          )
          .join("")

  const missingUsersSection = snap.submissionRollup
    ? `<h3 style="font-size:13pt;color:#003B3A;margin-top:16px;margin-bottom:6px;">5. Tình hình gửi báo cáo của nhân sự trong đơn vị</h3>
       <p style="margin:4px 0;">Đã gửi: <b>${snap.submissionRollup.submittedUsersCount}/${snap.submissionRollup.expectedUsersCount}</b> nhân sự (Đã duyệt: ${snap.submissionRollup.approvedUsersCount}).</p>
       <p style="margin:4px 0;">Danh sách nhân sự chưa gửi báo cáo (không quy về kết quả bằng 0): <b>${
         snap.submissionRollup.missingUsers.length > 0
           ? escapeHtml(snap.submissionRollup.missingUsers.map((u) => u.fullName).join(", "))
           : "Không có (100% đã gửi)"
       }</b>.</p>`
    : ""

  return `\uFEFF<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.reportCode)} - ${escapeHtml(report.periodLabel)}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: "Times New Roman", Arial, serif; font-size: 12pt; color: #0F172A; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
    th { background-color: #003B3A; color: #FFFFFF; font-weight: bold; padding: 7px 8px; border: 1px solid #003B3A; font-size: 11pt; }
    td { font-size: 11pt; }
  </style>
</head>
<body>
  <div style="border-bottom: 2px solid #003B3A; padding-bottom: 10px; margin-bottom: 14px;">
    <div style="font-size: 11pt; font-weight: bold; color: #003B3A;">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN HỆ WORKHUB</div>
    <h1 style="font-size: 16pt; color: #003B3A; margin: 6px 0 4px 0;">${scopeTitle}</h1>
    <div style="font-size: 11pt; color: #334155;">
      Mã báo cáo: <b>${escapeHtml(report.reportCode)}</b> (Phiên bản v${report.versionNumber}) • Kỳ báo cáo: <b>${escapeHtml(
        report.periodLabel
      )}</b><br/>
      Người lập / Đơn vị: <b>${escapeHtml(report.ownerName)}</b>${
        report.departmentName ? ` • Phòng ban: <b>${escapeHtml(report.departmentName)}</b>` : ""
      }${report.campusName ? ` • Cơ sở: <b>${escapeHtml(report.campusName)}</b>` : ""}<br/>
      Trạng thái: <b>${escapeHtml(report.status)}</b> • Thời điểm chốt dữ liệu: <b>${
        report.submittedSnapshotAt
          ? new Date(report.submittedSnapshotAt).toLocaleString("vi-VN")
          : new Date(snap.generatedAt).toLocaleString("vi-VN")
      }</b>
    </div>
  </div>

  <h3 style="font-size:13pt;color:#003B3A;margin-bottom:6px;">1. Số liệu tổng hợp từ nguồn công việc (Chốt tự động)</h3>
  <table>
    <thead>
      <tr>
        <th>Tổng đầu việc lá</th>
        <th>Hoàn thành trong kỳ</th>
        <th>Đang thực hiện</th>
        <th>Quá hạn</th>
        <th>Phát sinh ngoài KH</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #CBD5E1;text-align:center;font-weight:bold;">${snap.totalCanonicalTasks}</td>
        <td style="padding:8px;border:1px solid #CBD5E1;text-align:center;font-weight:bold;color:#059669;">${snap.completedInPeriodCount}</td>
        <td style="padding:8px;border:1px solid #CBD5E1;text-align:center;">${snap.inProgressAtCutoffCount}</td>
        <td style="padding:8px;border:1px solid #CBD5E1;text-align:center;font-weight:bold;color:#E11D48;">${snap.overdueCount}</td>
        <td style="padding:8px;border:1px solid #CBD5E1;text-align:center;">${snap.adhocCount}</td>
      </tr>
    </tbody>
  </table>

  <h3 style="font-size:13pt;color:#003B3A;margin-bottom:6px;">2. Kết quả thực hiện, Vướng mắc & Kế hoạch kỳ tiếp theo</h3>
  <p><b>• Diễn giải kết quả chính:</b><br/>${escapeHtml(report.executiveCommentary || "Chưa bổ sung diễn giải.").replace(/\n/g, "<br/>")}</p>
  <p><b>• Vướng mắc & Nguyên nhân:</b><br/>${escapeHtml(report.blockersAndCauses || "Không có.").replace(/\n/g, "<br/>")}</p>
  <p><b>• Nội dung kiến nghị hỗ trợ:</b><br/>${escapeHtml(report.supportRequests || "Không có.").replace(/\n/g, "<br/>")}</p>
  <p><b>• Kế hoạch kỳ tiếp theo:</b><br/>${escapeHtml(report.nextPeriodPlan || "Tiếp tục theo kế hoạch đã duyệt.").replace(/\n/g, "<br/>")}</p>

  <h3 style="font-size:13pt;color:#003B3A;margin-bottom:6px;">3. Danh mục công việc & Sản phẩm đầu ra nguồn</h3>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã CV</th>
        <th>Tên công việc</th>
        <th>Kết quả / Sản phẩm đầu ra</th>
        <th>Minh chứng</th>
      </tr>
    </thead>
    <tbody>${deliverablesRows}</tbody>
  </table>

  <h3 style="font-size:13pt;color:#003B3A;margin-bottom:6px;">4. Kết quả Chỉ tiêu & KPI liên quan</h3>
  <table>
    <thead>
      <tr>
        <th>Mã KPI</th>
        <th>Tên chỉ số</th>
        <th>Mục tiêu</th>
        <th>Kết quả thực tế</th>
      </tr>
    </thead>
    <tbody>${kpiRows}</tbody>
  </table>

  ${missingUsersSection}
</body>
</html>`
}

/**
 * Tạo Workbook Excel (.xlsx) đa sheet giữ nguyên Unicode tiếng Việt
 */
export function buildWorkHubReportWorkbook(report: WorkHubReportRecord): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const snap = report.snapshot

  const overviewRows = [
    { "Chỉ tiêu": "Mã báo cáo", "Giá trị": report.reportCode },
    { "Chỉ tiêu": "Phiên bản", "Giá trị": `v${report.versionNumber}` },
    { "Chỉ tiêu": "Kỳ báo cáo", "Giá trị": report.periodLabel },
    { "Chỉ tiêu": "Người lập / Phụ trách", "Giá trị": report.ownerName },
    { "Chỉ tiêu": "Trạng thái", "Giá trị": report.status },
    { "Chỉ tiêu": "Tổng đầu việc lá", "Giá trị": snap.totalCanonicalTasks },
    { "Chỉ tiêu": "Hoàn thành trong kỳ", "Giá trị": snap.completedInPeriodCount },
    { "Chỉ tiêu": "Đang thực hiện tại thời điểm chốt", "Giá trị": snap.inProgressAtCutoffCount },
    { "Chỉ tiêu": "Công việc quá hạn", "Giá trị": snap.overdueCount },
    { "Chỉ tiêu": "Công việc phát sinh", "Giá trị": snap.adhocCount },
    { "Chỉ tiêu": "Diễn giải kết quả", "Giá trị": report.executiveCommentary },
    { "Chỉ tiêu": "Vướng mắc & Nguyên nhân", "Giá trị": report.blockersAndCauses },
    { "Chỉ tiêu": "Đề xuất hỗ trợ", "Giá trị": report.supportRequests },
    { "Chỉ tiêu": "Kế hoạch kỳ tiếp theo", "Giá trị": report.nextPeriodPlan },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewRows), "Tong_Hop_Bao_Cao")

  const taskRows = snap.deliverablesSummary.map((d, idx) => ({
    STT: idx + 1,
    "Mã công việc": d.taskCode,
    "Tên công việc": d.title,
    "Trạng thái": d.workStatus,
    "Sản phẩm đầu ra": d.deliverables || "",
    "Kết quả thực hiện": d.resultSummary || "",
    "Minh chứng": d.hasEvidence ? "Đã đính kèm" : "Chưa có",
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "Cong_Viec_Nguon")

  const kpiRows = snap.kpiSummary.map((k, idx) => ({
    STT: idx + 1,
    "Mã KPI": k.kpiCode,
    "Tên chỉ số": k.kpiName,
    "Mục tiêu": k.targetDisplay,
    "Kết quả": k.actualDisplay,
    "Đánh giá": k.outcomeBand,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), "Chi_Tieu_KPI")

  if (snap.submissionRollup) {
    const missingRows = snap.submissionRollup.missingUsers.map((u, idx) => ({
      STT: idx + 1,
      "Họ và tên nhân sự chưa gửi": u.fullName,
      "Phòng ban": u.departmentName || "",
      "Ghi chú": "Chưa gửi báo cáo (Không quy về kết quả 0)",
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(missingRows), "Chua_Gui_Bao_Cao")
  }

  return wb
}

/**
 * Hàm xuất file phía trình duyệt (Word .doc, Excel .xlsx, PDF .pdf)
 */
export async function exportWorkHubReportClient(
  report: WorkHubReportRecord,
  format: "EXCEL" | "WORD" | "PDF"
): Promise<void> {
  if (typeof window === "undefined") return
  const safeBaseName = `${report.reportCode}_v${report.versionNumber}`

  if (format === "EXCEL") {
    const wb = buildWorkHubReportWorkbook(report)
    XLSX.writeFile(wb, `${safeBaseName}.xlsx`)
    return
  }

  const html = buildWorkHubReportDocumentHtml(report)

  if (format === "WORD") {
    const blob = new Blob([html], {
      type: "application/msword;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${safeBaseName}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }

  // PDF via html2pdf.js (fallback to clean browser print-to-PDF if script fails)
  try {
    const html2pdfMod: any = await import("html2pdf.js")
    const html2pdf = html2pdfMod.default || html2pdfMod
    const container = document.createElement("div")
    container.innerHTML = html
    container.style.padding = "16px"
    container.style.background = "#FFFFFF"
    document.body.appendChild(container)
    await html2pdf()
      .set({
        margin: 12,
        filename: `${safeBaseName}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save()
    document.body.removeChild(container)
  } catch {
    const printWin = window.open("", "_blank")
    if (printWin) {
      printWin.document.open()
      printWin.document.write(html)
      printWin.document.close()
      printWin.focus()
      printWin.print()
    }
  }
}
