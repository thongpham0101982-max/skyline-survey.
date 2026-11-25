import {
  formatDeltaForDisplay,
  formatRateWithFraction,
  formatScoreForDisplay,
} from "./formatters"
import {
  AcademicCommitmentReportPayload,
  ExchangeStudentReportPayload,
  HomeschoolingReportPayload,
  PsychologyCommitmentReportPayload,
  StudentStatisticsAccessScope,
} from "./types"

export { formatDeltaForDisplay, formatRateWithFraction, formatScoreForDisplay }

function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return ""
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function sanitizePdfFileNameSegment(raw: string, fallback: string): string {
  const normalized = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return normalized || fallback
}

export function formatVietnamTimestamp(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  } catch {
    return date.toLocaleString("vi-VN")
  }
}

export function buildAcademicPdfFileName(payload: AcademicCommitmentReportPayload): string {
  const scopeSeg = sanitizePdfFileNameSegment(payload.filters.campusName, "Toan_he_thong")
  const yearSeg = sanitizePdfFileNameSegment(payload.filters.academicYearName, "NamHoc")
  return `Bao_cao_HS_Cam_ket_mon_hoc_${scopeSeg}_${yearSeg}.pdf`
}

export function buildPsychologyPdfFileName(payload: PsychologyCommitmentReportPayload): string {
  const scopeSeg = sanitizePdfFileNameSegment(payload.filters.campusName, "Toan_he_thong")
  const monthSeg = sanitizePdfFileNameSegment(
    payload.viewMode === "YEAR_SUMMARY" ? "Ca_nam_hoc" : payload.filters.month,
    "Thang"
  )
  const yearSeg = sanitizePdfFileNameSegment(payload.filters.academicYearName, "NamHoc")
  return `Bao_cao_Tam_ly_cam_ket_${scopeSeg}_${monthSeg}_${yearSeg}.pdf`
}

export function buildHomeschoolingPdfFileName(payload: HomeschoolingReportPayload): string {
  const scopeSeg = sanitizePdfFileNameSegment(payload.filters.campusName, "Toan_he_thong")
  const yearSeg = sanitizePdfFileNameSegment(payload.filters.academicYearName, "NamHoc")
  return `Bao_cao_HS_Homeschooling_${scopeSeg}_${yearSeg}.pdf`
}

export function buildExchangePdfFileName(payload: ExchangeStudentReportPayload): string {
  const scopeSeg = sanitizePdfFileNameSegment(payload.filters.campusName, "Toan_he_thong")
  const yearSeg = sanitizePdfFileNameSegment(payload.filters.academicYearName, "NamHoc")
  return `Bao_cao_HS_Hoc_giao_luu_${scopeSeg}_${yearSeg}.pdf`
}

const SHARED_PDF_CSS = `
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 10mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: "Segoe UI", "Roboto", "DejaVu Sans", Arial, sans-serif;
    font-size: 8.5pt;
    line-height: 1.38;
    color: #0F172A;
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    font-variant-numeric: tabular-nums;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-left: 4px solid #003B3A;
    border-bottom: 1.5px solid #003B3A;
    padding: 4px 0 8px 10px;
    margin-bottom: 10px;
  }
  .brand-org {
    font-size: 9pt;
    font-weight: 700;
    color: #003B3A;
    letter-spacing: 0.2px;
  }
  .report-title {
    font-size: 13pt;
    font-weight: 800;
    color: #003B3A;
    margin: 2px 0;
  }
  .report-sub {
    font-size: 8pt;
    color: #475569;
  }
  .meta-right {
    text-align: right;
    font-size: 7.8pt;
    color: #334155;
    line-height: 1.45;
  }
  .filter-strip {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 10px;
    font-size: 8pt;
    color: #334155;
  }
  .filter-strip strong {
    color: #003B3A;
  }
  .kpi-grid {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .kpi-box {
    flex: 1;
    border: 1px solid #E2E8F0;
    border-top: 3px solid #00A19A;
    border-radius: 6px;
    padding: 6px 8px;
    background: #FFFFFF;
  }
  .kpi-label {
    font-size: 7.5pt;
    color: #64748B;
    margin-bottom: 2px;
  }
  .kpi-value {
    font-size: 11.5pt;
    font-weight: 700;
    color: #003B3A;
  }
  .kpi-unit {
    font-size: 7.2pt;
    color: #64748B;
    margin-top: 1px;
  }
  .section-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #003B3A;
    margin: 10px 0 5px 0;
    padding-left: 7px;
    border-left: 3px solid #00A19A;
    break-after: avoid;
    page-break-after: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    table-layout: fixed;
  }
  thead {
    display: table-header-group;
  }
  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  th {
    background: #003B3A;
    color: #FFFFFF;
    font-weight: 600;
    font-size: 7.5pt;
    padding: 5px 4px;
    border: 1px solid #003B3A;
    text-align: left;
    word-wrap: break-word;
  }
  th.num, td.num {
    text-align: right;
  }
  th.center, td.center {
    text-align: center;
  }
  td {
    border: 1px solid #CBD5E1;
    padding: 4px 5px;
    font-size: 7.6pt;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  tbody tr:nth-child(even) {
    background: #F8FAFC;
  }
  .group-header-row td {
    background: #F0FDFA !important;
    color: #003B3A;
    font-weight: 700;
    border-top: 1.5px solid #00A19A;
    break-after: avoid;
    page-break-after: avoid;
  }
  .badge {
    display: inline-block;
    padding: 1.5px 5px;
    border-radius: 4px;
    font-size: 7pt;
    font-weight: 600;
    line-height: 1.25;
  }
  .badge-emerald { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .badge-amber { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
  .badge-rose { background: #FFF1F2; color: #BE123C; border: 1px solid #FECDD3; }
  .badge-slate { background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; }
  .badge-teal { background: #F0FDFA; color: #0F766E; border: 1px solid #99F6E4; }
  .note-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 5px;
    padding: 6px 9px;
    font-size: 7.5pt;
    color: #475569;
    margin-bottom: 8px;
  }
  .empty-box {
    border: 1px dashed #94A3B8;
    border-radius: 6px;
    padding: 18px;
    text-align: center;
    font-size: 9pt;
    font-weight: 600;
    color: #475569;
    background: #F8FAFC;
    margin: 10px 0;
  }
  .muted { color: #64748B; font-size: 7pt; }
`

function getOutcomeBadgeClass(code: string): string {
  switch (code) {
    case "DAT_TIEN_BO":
      return "badge-emerald"
    case "DAT_CHUAN_GIU_NGUYEN":
    case "DAT_CHUAN_GIAM":
      return "badge-teal"
    case "TANG_CHUA_DAT_CHUAN":
    case "CHUA_DAT_CHUAN_GIU_NGUYEN":
      return "badge-amber"
    case "CHUA_DAT_CHUAN_GIAM":
      return "badge-rose"
    default:
      return "badge-slate"
  }
}

function getPsychStatusBadgeClass(code: string): string {
  switch (code) {
    case "DA_DANH_GIA":
    case "DA_CAP_NHAT_DU":
      return "badge-emerald"
    case "DEN_HAN":
    case "CON_LUOT_DEN_HAN":
      return "badge-amber"
    case "QUA_HAN":
    case "CO_DANH_GIA_QUA_HAN":
    case "CHUA_PHAN_CONG":
      return "badge-rose"
    default:
      return "badge-slate"
  }
}

export function buildAcademicCommitmentPdfHtml(
  payload: AcademicCommitmentReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const summaryTableRows = payload.campusLevelSubjectSummary
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.campusName)} (${escapeHtml(r.campusCode)})</td>
        <td>${escapeHtml(r.levelLabel || "—")}</td>
        <td>${escapeHtml(r.subject || "—")}</td>
        <td class="num">${r.distinctStudentCount}</td>
        <td class="num">${r.commitmentRowCount}</td>
        <td class="num">${r.comparableRowCount}</td>
        <td class="num">${r.gk1PassCount}</td>
        <td class="num">${r.progressCount}</td>
        <td class="num">${escapeHtml(formatRateWithFraction(r.progressCount, r.comparableRowCount, r.progressRate))}</td>
      </tr>`
    )
    .join("")

  let detailHtml = ""
  if (includeDetail) {
    if (payload.detailRows.length === 0) {
      detailHtml = `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
    } else {
      // Nhóm theo Cơ sở / Lớp để giữ tiêu đề nhóm đi cùng dòng đầu nhóm khi ngắt trang
      const grouped = new Map<string, typeof payload.detailRows>()
      for (const r of payload.detailRows) {
        const key = `${r.campusName} (${r.campusCode}) — Lớp ${r.className}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(r)
      }

      const tbodyContent = Array.from(grouped.entries())
        .map(([groupTitle, rows]) => {
          const headerTr = `<tr class="group-header-row"><td colspan="11">${escapeHtml(groupTitle)} (${rows.length} lượt cam kết)</td></tr>`
          const rowsTr = rows
            .map(
              (r) => `
            <tr>
              <td class="center">${r.stt}</td>
              <td><strong>${escapeHtml(r.studentName)}</strong><br/><span class="muted">${escapeHtml(r.studentCode)}</span></td>
              <td>${escapeHtml(r.className)}<br/><span class="muted">${escapeHtml(r.campusCode)}</span></td>
              <td>${escapeHtml(r.committedSubject)}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ksdnScore, r.level))}</td>
              <td class="num"><strong>${escapeHtml(formatScoreForDisplay(r.gk1Score, r.level))}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck1Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.gk2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatDeltaForDisplay(r.deltaGk1Ksdn))}</td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="section-title">2. Bảng chi tiết học sinh cam kết đầu vào theo môn học (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:4%" />
            <col style="width:17%" />
            <col style="width:9%" />
            <col style="width:10%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:8%" />
            <col style="width:19.5%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Môn cam kết</th>
              <th class="num">KSĐN</th>
              <th class="num">Giữa kỳ 1</th>
              <th class="num">Cuối kỳ 1</th>
              <th class="num">Giữa kỳ 2</th>
              <th class="num">Cuối kỳ 2</th>
              <th class="num">Chênh lệch GK1 − KSĐN</th>
              <th>Kết quả GK1</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyContent}
          </tbody>
        </table>`
    }
  } else {
    detailHtml = `<div class="note-box">Tài khoản chỉ có quyền xem số liệu tổng hợp. Bảng danh sách chi tiết học sinh được ẩn theo phân quyền.</div>`
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Báo cáo Học sinh cam kết đầu vào theo môn học</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN TÍCH TỔNG HỢP (SSM)</div>
      <div class="report-title">BÁO CÁO THỐNG KÊ HỌC SINH — HỌC SINH CAM KẾT ĐẦU VÀO THEO MÔN HỌC</div>
      <div class="report-sub">Phạm vi quyền: ${escapeHtml(scope.roleDisplayLabel)}</div>
    </div>
    <div class="meta-right">
      <div><strong>Năm học:</strong> ${escapeHtml(payload.filters.academicYearName)}</div>
      <div><strong>Phạm vi:</strong> ${escapeHtml(payload.filters.campusName)}</div>
      <div><strong>Xuất lúc (VN):</strong> ${escapeHtml(exportedAt)}</div>
    </div>
  </div>

  <div class="filter-strip">
    <strong>Bộ lọc áp dụng:</strong>
    Năm học: ${escapeHtml(payload.filters.academicYearName)} •
    Cơ sở: ${escapeHtml(payload.filters.campusName)} •
    Bậc học: ${escapeHtml(payload.filters.levelLabel)} •
    Khối: ${escapeHtml(payload.filters.grade === "ALL" ? "Tất cả khối" : `Khối ${payload.filters.grade}`)} •
    Lớp: ${escapeHtml(payload.filters.className)} •
    Môn cam kết: ${escapeHtml(payload.filters.committedSubject === "ALL" ? "Tất cả môn" : payload.filters.committedSubject)}
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Số HS cam kết</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}</div>
      <div class="kpi-unit">học sinh (mã duy nhất)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Số lượt cam kết theo môn</div>
      <div class="kpi-value">${payload.summary.commitmentRowCount}</div>
      <div class="kpi-unit">lượt (cặp HS–môn)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đủ điểm đối chiếu</div>
      <div class="kpi-value">${payload.summary.comparableRowCount}</div>
      <div class="kpi-unit">lượt đủ KSĐN, GK1 &amp; ngưỡng</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn GK1</div>
      <div class="kpi-value">${payload.summary.gk1PassCount}</div>
      <div class="kpi-unit">lượt (kể cả thiếu KSĐN)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt tiến bộ GK1</div>
      <div class="kpi-value">${escapeHtml(formatRateWithFraction(payload.summary.progressCount, payload.summary.comparableRowCount, payload.summary.progressRate))}</div>
      <div class="kpi-unit">lượt đạt chuẩn &amp; GK1 &gt; KSĐN</div>
    </div>
  </div>

  <div class="note-box">
    <strong>Quy tắc &amp; Ngưỡng chuẩn:</strong>
    Tiểu học đạt chuẩn GK1 khi điểm ≥ 7,0; THCS đạt chuẩn GK1 khi điểm ≥ 5,0; bậc khác áp dụng ngưỡng cấu hình đã xác nhận (nếu thiếu hiển thị “Chưa có cấu hình chuẩn” và loại khỏi mẫu số).
    Ghi nhận “Đạt tiến bộ” khi GK1 đạt chuẩn và GK1 &gt; KSĐN. Tỷ lệ đạt tiến bộ = Số lượt đạt tiến bộ / Số lượt đủ điểm KSĐN, GK1 và ngưỡng áp dụng.
  </div>

  <div class="section-title">1. Bảng tổng hợp theo cơ sở, bậc học và môn học</div>
  ${
    payload.campusLevelSubjectSummary.length === 0
      ? `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
      : `<table>
          <colgroup>
            <col style="width:19%" />
            <col style="width:10%" />
            <col style="width:13%" />
            <col style="width:9%" />
            <col style="width:10%" />
            <col style="width:10%" />
            <col style="width:9%" />
            <col style="width:9%" />
            <col style="width:11%" />
          </colgroup>
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th>Bậc học</th>
              <th>Môn cam kết</th>
              <th class="num">Số HS cam kết</th>
              <th class="num">Số lượt cam kết</th>
              <th class="num">Đủ điểm đối chiếu</th>
              <th class="num">Đạt chuẩn GK1</th>
              <th class="num">Đạt tiến bộ</th>
              <th class="num">Tỷ lệ đạt tiến bộ</th>
            </tr>
          </thead>
          <tbody>
            ${summaryTableRows}
          </tbody>
        </table>`
  }

  ${detailHtml}
</body>
</html>`
}

export function buildPsychologyCommitmentPdfHtml(
  payload: PsychologyCommitmentReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf
  const showComments = includeDetail && scope.canViewPsychologyComments
  const monthColumnTitle =
    payload.viewMode === "YEAR_SUMMARY"
      ? `Tổng kết ${payload.filters.monthLabel}`
      : `Tổng kết ${payload.filters.month}`

  const campusRowsHtml = payload.campusSummary
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.campusName)} (${escapeHtml(c.campusCode)})</td>
        <td class="num">${c.totalStudents}</td>
        <td class="num">${c.unassignedStudents}</td>
        <td class="num">${c.overdueStudents}</td>
        <td class="num">${c.duePendingStudents}</td>
        <td class="num">${c.completedAllDueStudents}</td>
        <td class="num">${escapeHtml(formatRateWithFraction(c.monthSummarizedStudents, c.totalStudents, c.monthSummaryRate))}</td>
      </tr>`
    )
    .join("")

  const weekSummaryHtml = payload.weekSummary
    .map(
      (w) => `
      <tr>
        <td><strong>${escapeHtml(w.weekLabel)}</strong></td>
        <td class="num">${w.dueStudentCount} học sinh</td>
        <td class="num">${w.evaluatedStudentCount} học sinh</td>
        <td class="num">${w.overdueStudentCount} học sinh</td>
        <td class="num">${w.notDueStudentCount} học sinh</td>
        <td class="num">${w.noScheduleStudentCount} học sinh</td>
        <td class="num">${w.completedSessions}/${w.totalScheduledSessions} lượt</td>
      </tr>`
    )
    .join("")

  let detailHtml = ""
  if (includeDetail) {
    if (payload.detailRows.length === 0) {
      detailHtml = `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
    } else {
      const grouped = new Map<string, typeof payload.detailRows>()
      for (const r of payload.detailRows) {
        const key = `${r.campusName} (${r.campusCode}) — Lớp ${r.className}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(r)
      }

      const tbodyContent = Array.from(grouped.entries())
        .map(([groupTitle, rows]) => {
          const headerTr = `<tr class="group-header-row"><td colspan="12">${escapeHtml(groupTitle)} (${rows.length} học sinh)</td></tr>`
          const rowsTr = rows
            .map((r) => {
              const weekTds = r.weeks
                .map((w) => {
                  const multi =
                    w.totalScheduledSessions > 1
                      ? `<div class="muted">${w.completedSessions}/${w.totalScheduledSessions} lượt</div>`
                      : ""
                  return `<td class="center"><span class="badge ${getPsychStatusBadgeClass(w.status)}">${escapeHtml(w.statusLabel)}</span>${multi}</td>`
                })
                .join("")

              const commentCell = showComments
                ? r.latestEvaluationDate || r.latestCommentShort
                  ? `<div><strong>${escapeHtml(r.latestEvaluationDate || "")}</strong>${r.latestCommentShort ? ` — ${escapeHtml(r.latestCommentShort)}` : ""}</div>${
                      r.nextSupportDirection
                        ? `<div class="muted">Hướng hỗ trợ: ${escapeHtml(r.nextSupportDirection)}</div>`
                        : ""
                    }`
                  : `<span class="muted">Chưa có đánh giá</span>`
                : `<span class="muted">Ẩn theo phân quyền</span>`

              return `
                <tr>
                  <td class="center">${r.stt}</td>
                  <td><strong>${escapeHtml(r.studentName)}</strong><br/><span class="muted">${escapeHtml(r.studentCode)}</span></td>
                  <td>${escapeHtml(r.className)}<br/><span class="muted">${escapeHtml(r.campusCode)}</span></td>
                  <td>${escapeHtml(r.assignedTeacherName)}</td>
                  <td>${escapeHtml(r.categoryLabel)}</td>
                  ${weekTds}
                  <td>${escapeHtml(r.monthSummaryResult)}</td>
                  <td><span class="badge ${getPsychStatusBadgeClass(r.teacherEvalStatus)}">${escapeHtml(r.teacherEvalStatusLabel)}</span></td>
                  <td>${commentCell}</td>
                </tr>`
            })
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="section-title">3. Bảng chi tiết theo dõi Tâm lý cam kết đầu vào (${payload.detailRows.length} học sinh)</div>
        <table>
          <colgroup>
            <col style="width:3.2%" />
            <col style="width:12.8%" />
            <col style="width:7.5%" />
            <col style="width:10%" />
            <col style="width:8%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:6.5%" />
            <col style="width:8%" />
            <col style="width:9.5%" />
            <col style="width:15%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>GV / Chuyên viên</th>
              <th>Diện</th>
              <th class="center">Tuần 1</th>
              <th class="center">Tuần 2</th>
              <th class="center">Tuần 3</th>
              <th class="center">Tuần 4</th>
              <th>${escapeHtml(monthColumnTitle)}</th>
              <th>Tình trạng GV ĐG</th>
              <th>Nhận xét &amp; Đánh giá gần nhất</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyContent}
          </tbody>
        </table>`
    }
  } else {
    detailHtml = `<div class="note-box">Tài khoản chỉ có quyền xem số liệu tổng hợp. Danh sách học sinh và nhận xét tâm lý được ẩn theo phân quyền.</div>`
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Báo cáo Tâm lý cam kết đầu vào</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN TÍCH TỔNG HỢP (SSM)</div>
      <div class="report-title">BÁO CÁO THỐNG KÊ HỌC SINH — TÂM LÝ CAM KẾT ĐẦU VÀO</div>
      <div class="report-sub">Phạm vi quyền: ${escapeHtml(scope.roleDisplayLabel)}</div>
    </div>
    <div class="meta-right">
      <div><strong>Năm học:</strong> ${escapeHtml(payload.filters.academicYearName)}</div>
      <div><strong>Kỳ / Tháng:</strong> ${escapeHtml(payload.filters.monthLabel)}</div>
      <div><strong>Xuất lúc (VN):</strong> ${escapeHtml(exportedAt)}</div>
    </div>
  </div>

  <div class="filter-strip">
    <strong>Bộ lọc áp dụng:</strong>
    Năm học: ${escapeHtml(payload.filters.academicYearName)} •
    Tháng: ${escapeHtml(payload.filters.monthLabel)} •
    Cơ sở: ${escapeHtml(payload.filters.campusName)} •
    Lớp: ${escapeHtml(payload.filters.className)} •
    GV / Chuyên viên: ${escapeHtml(payload.filters.teacherName)}
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">HS thuộc diện</div>
      <div class="kpi-value">${payload.summary.totalStudents}</div>
      <div class="kpi-unit">học sinh (mã duy nhất)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Chưa phân công</div>
      <div class="kpi-value">${payload.summary.unassignedStudents}</div>
      <div class="kpi-unit">học sinh</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Có đánh giá quá hạn</div>
      <div class="kpi-value">${payload.summary.overdueStudents}</div>
      <div class="kpi-unit">học sinh</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đã tổng kết tháng</div>
      <div class="kpi-value">${escapeHtml(formatRateWithFraction(payload.summary.monthSummarizedStudents, payload.summary.totalStudents, payload.summary.monthSummaryRate))}</div>
      <div class="kpi-unit">học sinh</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Tiến độ lượt đánh giá</div>
      <div class="kpi-value">${payload.summary.completedSessions}/${payload.summary.totalScheduledSessions}</div>
      <div class="kpi-unit">lượt đánh giá tuần</div>
    </div>
  </div>

  <div class="section-title">1. Tổng hợp theo cơ sở</div>
  ${
    payload.campusSummary.length === 0
      ? `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
      : `<table>
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th class="num">Số HS thuộc diện</th>
              <th class="num">Chưa phân công</th>
              <th class="num">Có ĐG quá hạn</th>
              <th class="num">Còn lượt đến hạn</th>
              <th class="num">Đã cập nhật đủ</th>
              <th class="num">Đã tổng kết tháng</th>
            </tr>
          </thead>
          <tbody>${campusRowsHtml}</tbody>
        </table>`
  }

  <div class="section-title">2. Tổng hợp tiến độ theo tuần (${escapeHtml(payload.filters.monthLabel)})</div>
  <table>
    <thead>
      <tr>
        <th>Tuần</th>
        <th class="num">HS đến hạn</th>
        <th class="num">HS đã đánh giá</th>
        <th class="num">HS quá hạn</th>
        <th class="num">HS chưa đến hạn</th>
        <th class="num">HS không có lịch</th>
        <th class="num">Tiến độ lượt ĐG</th>
      </tr>
    </thead>
    <tbody>${weekSummaryHtml}</tbody>
  </table>

  ${detailHtml}
</body>
</html>`
}

export function buildHomeschoolingPdfHtml(
  payload: HomeschoolingReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const summaryTableRows = payload.campusLevelSubjectSummary
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.campusName)} (${escapeHtml(r.campusCode)})</td>
        <td>${escapeHtml(r.levelLabel || "—")}</td>
        <td>${escapeHtml(r.subject || "—")}</td>
        <td class="num">${r.distinctStudentCount}</td>
        <td class="num">${r.committedStudentCount}</td>
        <td class="num">${r.trackedRowCount}</td>
        <td class="num">${r.comparableRowCount}</td>
        <td class="num">${r.gk1PassCount}</td>
        <td class="num">${r.progressCount}</td>
        <td class="num">${escapeHtml(formatRateWithFraction(r.progressCount, r.comparableRowCount, r.progressRate))}</td>
      </tr>`
    )
    .join("")

  let detailHtml = ""
  if (includeDetail) {
    if (payload.detailRows.length === 0) {
      detailHtml = `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
    } else {
      const grouped = new Map<string, typeof payload.detailRows>()
      for (const r of payload.detailRows) {
        const key = `${r.campusName} (${r.campusCode}) — Lớp ${r.className}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(r)
      }

      const tbodyContent = Array.from(grouped.entries())
        .map(([groupTitle, rows]) => {
          const headerTr = `<tr class="group-header-row"><td colspan="12">${escapeHtml(groupTitle)} (${rows.length} lượt theo dõi)</td></tr>`
          const rowsTr = rows
            .map(
              (r) => `
            <tr>
              <td class="center">${r.stt}</td>
              <td><strong>${escapeHtml(r.studentName)}</strong><br/><span class="muted">${escapeHtml(r.studentCode)}</span></td>
              <td>${escapeHtml(r.className)}<br/><span class="muted">${escapeHtml(r.campusCode)}</span></td>
              <td><span class="badge ${r.hasCommitment ? "badge-amber" : "badge-slate"}">${escapeHtml(r.commitmentSummary)}</span>${r.learningModeLabel ? `<div class="muted">${escapeHtml(r.learningModeLabel)}</div>` : ""}</td>
              <td><strong>${escapeHtml(r.subjectName)}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ksdnScore, r.level))}</td>
              <td class="num"><strong>${escapeHtml(formatScoreForDisplay(r.gk1Score, r.level))}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck1Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.gk2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatDeltaForDisplay(r.deltaGk1Ksdn))}</td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="section-title">2. Bảng chi tiết theo dõi học sinh Homeschooling nhập học (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:3.5%" />
            <col style="width:14.5%" />
            <col style="width:8%" />
            <col style="width:14%" />
            <col style="width:8.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:7.5%" />
            <col style="width:16.5%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Cam kết</th>
              <th>Môn theo dõi</th>
              <th class="num">KSĐN</th>
              <th class="num">Giữa kỳ 1</th>
              <th class="num">Cuối kỳ 1</th>
              <th class="num">Giữa kỳ 2</th>
              <th class="num">Cuối kỳ 2</th>
              <th class="num">Chênh lệch GK1 − KSĐN</th>
              <th>Tiến bộ (GK1)</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyContent}
          </tbody>
        </table>`
    }
  } else {
    detailHtml = `<div class="note-box">Tài khoản chỉ có quyền xem số liệu tổng hợp. Bảng danh sách chi tiết học sinh Homeschooling được ẩn theo phân quyền.</div>`
  }

  const commitLabel =
    payload.filters.commitmentFilter === "COMMITTED"
      ? "Có cam kết"
      : payload.filters.commitmentFilter === "NON_COMMITTED"
        ? "Không cam kết"
        : "Tất cả"

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Báo cáo Theo dõi học sinh Homeschooling nhập học</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN TÍCH TỔNG HỢP (SSM)</div>
      <div class="report-title">BÁO CÁO THỐNG KÊ HỌC SINH — THEO DÕI HỌC SINH HOMESCHOOLING NHẬP HỌC</div>
      <div class="report-sub">Chương trình học tập trước đây: Homeschooling • Phạm vi quyền: ${escapeHtml(scope.roleDisplayLabel)}</div>
    </div>
    <div class="meta-right">
      <div><strong>Năm học:</strong> ${escapeHtml(payload.filters.academicYearName)}</div>
      <div><strong>Phạm vi:</strong> ${escapeHtml(payload.filters.campusName)}</div>
      <div><strong>Xuất lúc (VN):</strong> ${escapeHtml(exportedAt)}</div>
    </div>
  </div>

  <div class="filter-strip">
    <strong>Bộ lọc áp dụng:</strong>
    Năm học: ${escapeHtml(payload.filters.academicYearName)} •
    Cơ sở: ${escapeHtml(payload.filters.campusName)} •
    Bậc học: ${escapeHtml(payload.filters.levelLabel)} •
    Khối: ${escapeHtml(payload.filters.grade === "ALL" ? "Tất cả khối" : `Khối ${payload.filters.grade}`)} •
    Lớp: ${escapeHtml(payload.filters.className)} •
    Cam kết: ${escapeHtml(commitLabel)} •
    Môn: ${escapeHtml(payload.filters.subject === "ALL" ? "Tất cả môn" : payload.filters.subject)}
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">HS Homeschooling nhập học</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}</div>
      <div class="kpi-unit">học sinh (mã duy nhất)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">HS có cam kết đầu vào</div>
      <div class="kpi-value">${payload.summary.committedStudentCount}</div>
      <div class="kpi-unit">học sinh</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Số lượt theo dõi môn</div>
      <div class="kpi-value">${payload.summary.trackedRowCount}</div>
      <div class="kpi-unit">lượt (cặp HS–môn)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn GK1</div>
      <div class="kpi-value">${payload.summary.gk1PassCount}</div>
      <div class="kpi-unit">lượt</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Tỷ lệ đạt tiến bộ GK1</div>
      <div class="kpi-value">${escapeHtml(formatRateWithFraction(payload.summary.progressCount, payload.summary.comparableRowCount, payload.summary.progressRate))}</div>
      <div class="kpi-unit">lượt đạt chuẩn &amp; GK1 &gt; KSĐN</div>
    </div>
  </div>

  <div class="note-box">
    <strong>Quy tắc đánh giá tiến bộ:</strong>
    Tiểu học đạt chuẩn GK1 khi điểm ≥ 7,0; THCS đạt chuẩn GK1 khi điểm ≥ 5,0; bậc khác áp dụng ngưỡng cấu hình đã xác nhận.
    Ghi nhận “Đạt tiến bộ” khi GK1 đạt chuẩn và GK1 &gt; KSĐN.
  </div>

  <div class="section-title">1. Bảng tổng hợp theo cơ sở, bậc học và môn theo dõi</div>
  ${
    payload.campusLevelSubjectSummary.length === 0
      ? `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
      : `<table>
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th>Bậc học</th>
              <th>Môn theo dõi</th>
              <th class="num">HS Homeschooling</th>
              <th class="num">HS có cam kết</th>
              <th class="num">Lượt theo dõi</th>
              <th class="num">Đủ điểm đối chiếu</th>
              <th class="num">Đạt chuẩn GK1</th>
              <th class="num">Đạt tiến bộ</th>
              <th class="num">Tỷ lệ đạt tiến bộ</th>
            </tr>
          </thead>
          <tbody>${summaryTableRows}</tbody>
        </table>`
  }

  ${detailHtml}
</body>
</html>`
}

export function buildExchangePdfHtml(
  payload: ExchangeStudentReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const summaryTableRows = payload.campusLevelSubjectSummary
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.campusName)} (${escapeHtml(r.campusCode)})</td>
        <td>${escapeHtml(r.levelLabel || "—")}</td>
        <td>${escapeHtml(r.subject || "—")}</td>
        <td class="num">${r.distinctStudentCount}</td>
        <td class="num">${r.trackedRowCount}</td>
        <td class="num">${r.comparableRowCount}</td>
        <td class="num">${r.gk1PassCount}</td>
        <td class="num">${r.progressCount}</td>
        <td class="num">${escapeHtml(formatRateWithFraction(r.progressCount, r.comparableRowCount, r.progressRate))}</td>
      </tr>`
    )
    .join("")

  let detailHtml = ""
  if (includeDetail) {
    if (payload.detailRows.length === 0) {
      detailHtml = `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
    } else {
      const grouped = new Map<string, typeof payload.detailRows>()
      for (const r of payload.detailRows) {
        const key = `${r.campusName} (${r.campusCode}) — Lớp ${r.className}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(r)
      }

      const tbodyContent = Array.from(grouped.entries())
        .map(([groupTitle, rows]) => {
          const headerTr = `<tr class="group-header-row"><td colspan="12">${escapeHtml(groupTitle)} (${rows.length} lượt theo dõi)</td></tr>`
          const rowsTr = rows
            .map(
              (r) => `
            <tr>
              <td class="center">${r.stt}</td>
              <td><strong>${escapeHtml(r.studentName)}</strong><br/><span class="muted">${escapeHtml(r.studentCode)}</span></td>
              <td>${escapeHtml(r.className)}<br/><span class="muted">${escapeHtml(r.campusCode)}</span></td>
              <td><span class="badge badge-teal">${escapeHtml(r.studentTypeLabel)}</span>${r.studentTypeNote ? `<div class="muted">${escapeHtml(r.studentTypeNote)}</div>` : ""}</td>
              <td><strong>${escapeHtml(r.subjectName)}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ksdnScore, r.level))}</td>
              <td class="num"><strong>${escapeHtml(formatScoreForDisplay(r.gk1Score, r.level))}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck1Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.gk2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatDeltaForDisplay(r.deltaGk1Ksdn))}</td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="section-title">2. Bảng chi tiết học sinh diện Học giao lưu (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:3.5%" />
            <col style="width:15%" />
            <col style="width:8%" />
            <col style="width:13.5%" />
            <col style="width:8.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:7.5%" />
            <col style="width:16.5%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Diện học sinh</th>
              <th>Môn theo dõi</th>
              <th class="num">KSĐN</th>
              <th class="num">Giữa kỳ 1</th>
              <th class="num">Cuối kỳ 1</th>
              <th class="num">Giữa kỳ 2</th>
              <th class="num">Cuối kỳ 2</th>
              <th class="num">Chênh lệch GK1 − KSĐN</th>
              <th>Tiến bộ (GK1)</th>
            </tr>
          </thead>
          <tbody>
            ${tbodyContent}
          </tbody>
        </table>`
    }
  } else {
    detailHtml = `<div class="note-box">Tài khoản chỉ có quyền xem số liệu tổng hợp. Bảng danh sách chi tiết học sinh diện Học giao lưu được ẩn theo phân quyền.</div>`
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>Báo cáo Học sinh diện Học giao lưu</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN TÍCH TỔNG HỢP (SSM)</div>
      <div class="report-title">BÁO CÁO THỐNG KÊ HỌC SINH — HỌC SINH DIỆN HỌC GIAO LƯU</div>
      <div class="report-sub">Diện học sinh: Học giao lưu (GIAO_LUU) • Phạm vi quyền: ${escapeHtml(scope.roleDisplayLabel)}</div>
    </div>
    <div class="meta-right">
      <div><strong>Năm học:</strong> ${escapeHtml(payload.filters.academicYearName)}</div>
      <div><strong>Phạm vi:</strong> ${escapeHtml(payload.filters.campusName)}</div>
      <div><strong>Xuất lúc (VN):</strong> ${escapeHtml(exportedAt)}</div>
    </div>
  </div>

  <div class="filter-strip">
    <strong>Bộ lọc áp dụng:</strong>
    Năm học: ${escapeHtml(payload.filters.academicYearName)} •
    Cơ sở: ${escapeHtml(payload.filters.campusName)} •
    Bậc học: ${escapeHtml(payload.filters.levelLabel)} •
    Khối: ${escapeHtml(payload.filters.grade === "ALL" ? "Tất cả khối" : `Khối ${payload.filters.grade}`)} •
    Lớp: ${escapeHtml(payload.filters.className)} •
    Môn: ${escapeHtml(payload.filters.subject === "ALL" ? "Tất cả môn" : payload.filters.subject)}
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">HS diện Học giao lưu</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}</div>
      <div class="kpi-unit">học sinh (mã duy nhất)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Số lượt theo dõi môn</div>
      <div class="kpi-value">${payload.summary.trackedRowCount}</div>
      <div class="kpi-unit">lượt (cặp HS–môn)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đủ điểm đối chiếu</div>
      <div class="kpi-value">${payload.summary.comparableRowCount}</div>
      <div class="kpi-unit">lượt đủ KSĐN, GK1 &amp; ngưỡng</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn GK1</div>
      <div class="kpi-value">${payload.summary.gk1PassCount}</div>
      <div class="kpi-unit">lượt</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Tỷ lệ đạt tiến bộ GK1</div>
      <div class="kpi-value">${escapeHtml(formatRateWithFraction(payload.summary.progressCount, payload.summary.comparableRowCount, payload.summary.progressRate))}</div>
      <div class="kpi-unit">lượt đạt chuẩn &amp; GK1 &gt; KSĐN</div>
    </div>
  </div>

  <div class="note-box">
    <strong>Quy tắc đánh giá tiến bộ:</strong>
    Tiểu học đạt chuẩn GK1 khi điểm ≥ 7,0; THCS đạt chuẩn GK1 khi điểm ≥ 5,0; bậc khác áp dụng ngưỡng cấu hình đã xác nhận.
    Ghi nhận “Đạt tiến bộ” khi GK1 đạt chuẩn và GK1 &gt; KSĐN.
  </div>

  <div class="section-title">1. Bảng tổng hợp theo cơ sở, bậc học và môn theo dõi</div>
  ${
    payload.campusLevelSubjectSummary.length === 0
      ? `<div class="empty-box">Chưa có dữ liệu phù hợp</div>`
      : `<table>
          <thead>
            <tr>
              <th>Cơ sở</th>
              <th>Bậc học</th>
              <th>Môn theo dõi</th>
              <th class="num">HS Học giao lưu</th>
              <th class="num">Lượt theo dõi</th>
              <th class="num">Đủ điểm đối chiếu</th>
              <th class="num">Đạt chuẩn GK1</th>
              <th class="num">Đạt tiến bộ</th>
              <th class="num">Tỷ lệ đạt tiến bộ</th>
            </tr>
          </thead>
          <tbody>${summaryTableRows}</tbody>
        </table>`
  }

  ${detailHtml}
</body>
</html>`
}

function buildFallbackPdfBuffer(title: string, htmlContent: string): Buffer {
  const safeTitle = sanitizePdfFileNameSegment(title, "SkyLine_Report")
  const streamContent = `BT /F1 12 Tf 40 540 Td (${safeTitle}) Tj ET`
  const htmlBase64 = Buffer.from(htmlContent, "utf-8").toString("base64")
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, "utf-8")} >>\nstream\n${streamContent}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `6 0 obj\n<< /Type /Metadata /Subtype /XML /Length ${Buffer.byteLength(htmlBase64, "utf-8")} >>\nstream\n${htmlBase64}\nendstream\nendobj`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"))
    pdf += obj + "\n"
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf-8")
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, "utf-8")
}

export async function renderHtmlToLandscapePdfBuffer(
  htmlContent: string,
  title: string
): Promise<Buffer> {
  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST)
  if (isTestEnv) {
    return buildFallbackPdfBuffer(title, htmlContent)
  }

  try {
    const puppeteer = await import("puppeteer")
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      timeout: 15000,
    })
    try {
      const page = await browser.newPage()
      await page.setContent(htmlContent, { waitUntil: "load", timeout: 15000 })
      const uint8 = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#64748B;padding:0 10mm;display:flex;justify-content:space-between;">
            <span>Hệ thống Giáo dục Sky-Line • SSM</span>
            <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>`,
        margin: {
          top: "12mm",
          right: "10mm",
          bottom: "14mm",
          left: "10mm",
        },
      })
      return Buffer.from(uint8)
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.error("[student-statistics/pdfExportService] Puppeteer PDF failed, using fallback:", err)
    return buildFallbackPdfBuffer(title, htmlContent)
  }
}
