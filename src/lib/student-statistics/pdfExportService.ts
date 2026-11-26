import {
  formatDeltaForDisplay,
  formatRateWithFraction,
  formatScoreForDisplay,
} from "./formatters"
import {
  AcademicCommitmentReportPayload,
  ExchangeStudentReportPayload,
  HierarchyNodeMetrics,
  HomeschoolingReportPayload,
  OverviewHierarchyNode,
  OverviewReportPayload,
  PsychHierarchyNodeMetrics,
  PsychologyCommitmentReportPayload,
  StandardBasisPeriodCounts,
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

function fmtPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return "—"
  return `${rate.toFixed(1).replace(".", ",")}%`
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

export function buildOverviewPdfFileName(payload: OverviewReportPayload): string {
  const scopeSeg = sanitizePdfFileNameSegment(payload.filters.campusName, "Toan_he_thong")
  const yearSeg = sanitizePdfFileNameSegment(payload.filters.academicYearName, "NamHoc")
  return `Bao_cao_Tong_quan_Thong_ke_HS_${scopeSeg}_${yearSeg}.pdf`
}

const SHARED_PDF_CSS = `
  @page {
    size: A4 landscape;
    margin: 8mm 9mm 10mm 9mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: "Segoe UI", "Roboto", "DejaVu Sans", Arial, sans-serif;
    font-size: 8.4pt;
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
    border-left: 5px solid #003B3A;
    border-bottom: 2px solid #003B3A;
    background: linear-gradient(90deg, #F0FDFA 0%, #FFFFFF 60%);
    padding: 7px 10px 8px 12px;
    margin-bottom: 9px;
    border-radius: 0 6px 0 0;
  }
  .brand-org {
    font-size: 8.5pt;
    font-weight: 700;
    color: #00736E;
    letter-spacing: 0.3px;
  }
  .report-title {
    font-size: 14.5pt;
    font-weight: 800;
    color: #003B3A;
    margin: 2px 0 4px 0;
    letter-spacing: 0.2px;
  }
  .tab-pill {
    display: inline-block;
    background: #003B3A;
    color: #FFFFFF;
    font-size: 7.8pt;
    font-weight: 700;
    padding: 2.5px 9px;
    border-radius: 999px;
    margin-right: 6px;
  }
  .report-sub {
    font-size: 7.8pt;
    color: #475569;
    display: inline-block;
  }
  .meta-right {
    text-align: right;
    font-size: 7.8pt;
    color: #334155;
    line-height: 1.5;
    white-space: nowrap;
  }
  .filter-strip {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 5px 10px;
    margin-bottom: 9px;
    font-size: 7.8pt;
    color: #334155;
  }
  .filter-strip strong {
    color: #003B3A;
  }
  .kpi-grid {
    display: flex;
    gap: 8px;
    margin-bottom: 9px;
  }
  .kpi-box {
    flex: 1;
    border: 1px solid #CBD5E1;
    border-top: 3.5px solid #00A19A;
    border-radius: 7px;
    padding: 7px 9px;
    background: #FFFFFF;
  }
  .kpi-box.pine { border-top-color: #003B3A; background: #F8FAFC; }
  .kpi-box.emerald { border-top-color: #059669; background: #F0FDFA; }
  .kpi-box.amber { border-top-color: #D97706; }
  .kpi-box.rose { border-top-color: #E11D48; }
  .kpi-label {
    font-size: 7.4pt;
    font-weight: 600;
    color: #475569;
    margin-bottom: 2px;
  }
  .kpi-value {
    font-size: 12pt;
    font-weight: 800;
    color: #003B3A;
    line-height: 1.2;
  }
  .kpi-pct {
    font-size: 8.5pt;
    font-weight: 700;
    color: #00736E;
    margin-left: 3px;
  }
  .kpi-unit {
    font-size: 7pt;
    color: #64748B;
    margin-top: 2px;
  }
  .progress-track {
    width: 100%;
    height: 5px;
    background: #E2E8F0;
    border-radius: 999px;
    overflow: hidden;
    margin-top: 4px;
  }
  .progress-fill {
    height: 100%;
    border-radius: 999px;
    background: #00A19A;
  }
  .progress-fill.emerald { background: #059669; }
  .progress-fill.amber { background: #D97706; }
  .progress-fill.rose { background: #E11D48; }
  .chart-card {
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 8px 10px 6px 10px;
    background: #FFFFFF;
    margin-bottom: 9px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .chart-title {
    font-size: 9pt;
    font-weight: 700;
    color: #003B3A;
    margin-bottom: 1px;
  }
  .chart-sub {
    font-size: 7.4pt;
    color: #64748B;
    margin-bottom: 5px;
  }
  .section-title {
    font-size: 9.2pt;
    font-weight: 700;
    color: #003B3A;
    margin: 9px 0 5px 0;
    padding-left: 7px;
    border-left: 3.5px solid #00A19A;
    break-after: avoid;
    page-break-after: avoid;
  }
  .page-break {
    page-break-before: always;
    break-before: page;
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
    font-size: 7.4pt;
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
    font-size: 7.5pt;
    vertical-align: middle;
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
    font-size: 6.9pt;
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
    border-left: 3px solid #00A19A;
    border-radius: 5px;
    padding: 5px 9px;
    font-size: 7.4pt;
    color: #334155;
    margin-bottom: 8px;
  }
  .empty-box {
    border: 1px dashed #94A3B8;
    border-radius: 6px;
    padding: 16px;
    text-align: center;
    font-size: 8.8pt;
    font-weight: 600;
    color: #475569;
    background: #F8FAFC;
    margin: 8px 0;
  }
  .muted { color: #64748B; font-size: 6.9pt; }
`

function renderProgressBar(rate: number | null, variant: "teal" | "emerald" | "amber" | "rose" = "teal"): string {
  const clamped = rate !== null && !Number.isNaN(rate) ? Math.max(0, Math.min(100, rate)) : 0
  return `<div class="progress-track"><div class="progress-fill ${variant === "teal" ? "" : variant}" style="width:${clamped.toFixed(1)}%"></div></div>`
}

function getOutcomeBadgeClass(code: string): string {
  switch (code) {
    case "DAT_TIEN_BO":
    case "TIEN_BO_VUOT_BAC":
      return "badge-emerald"
    case "DAT_CHUAN":
    case "DAT_CHUAN_GIU_NGUYEN":
    case "DAT_CHUAN_GIAM":
      return "badge-teal"
    case "TANG_CHUA_DAT_CHUAN":
    case "CHUA_DAT_CHUAN_GIU_NGUYEN":
      return "badge-amber"
    case "CHUA_DAT_CHUAN":
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

// ============================================================================
// BIỂU ĐỒ SVG VECTOR TRỰC QUAN CHO PDF (HIỆN RÕ SỐ & % TRÊN ĐẦU MỖI CỘT)
// ============================================================================

function renderOverviewGroupedBarSvg(
  campuses: OverviewHierarchyNode[],
  showPsych: boolean
): string {
  if (!campuses || campuses.length === 0) return ""

  const series = [
    { key: "academicCommitment" as const, label: "Cam kết môn học", color: "#003B3A" },
    ...(showPsych
      ? [{ key: "psychologyCommitment" as const, label: "Tâm lý CKĐV", color: "#00A19A" }]
      : []),
    { key: "homeschooling" as const, label: "Homeschooling", color: "#D97706" },
    { key: "exchange" as const, label: "Học giao lưu", color: "#059669" },
  ]

  let maxVal = 4
  for (const cp of campuses) {
    for (const s of series) {
      const v = cp[s.key].studentCount
      if (v > maxVal) maxVal = v
    }
  }
  // Thêm khoảng trống ~18% phía trên cột cao nhất để nhãn số & % không chạm viền trên
  const yMax = Math.ceil((maxVal * 1.18) / 5) * 5 || 5

  const svgW = 980
  const svgH = 204
  const padL = 38
  const padR = 14
  const padT = 30
  const padB = 42
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB
  const groupW = plotW / campuses.length
  const barGap = 7
  const barW = Math.min(34, Math.max(20, (groupW - 28 - barGap * (series.length - 1)) / series.length))
  const totalBarsW = series.length * barW + (series.length - 1) * barGap

  // Y gridlines (4 steps)
  const gridLines: string[] = []
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((yMax * i) / 4)
    const y = padT + plotH - (plotH * i) / 4
    gridLines.push(
      `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-dasharray="${i === 0 ? "" : "3,3"}" stroke-width="${i === 0 ? 1.2 : 0.8}" />`,
      `<text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748B">${val}</text>`
    )
  }

  // Bars + top labels (Count + %)
  const barEls: string[] = []
  campuses.forEach((cp, cIdx) => {
    const groupCenterX = padL + groupW * cIdx + groupW / 2
    const startX = groupCenterX - totalBarsW / 2

    series.forEach((s, sIdx) => {
      const stats = cp[s.key]
      const count = stats.studentCount
      const pct = stats.shareOfEnrolledRate
      const x = startX + sIdx * (barW + barGap)
      const h = count > 0 ? Math.max(3, (count / yMax) * plotH) : 0
      const y = padT + plotH - h
      const cx = x + barW / 2

      if (count > 0) {
        barEls.push(
          `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${s.color}" />`,
          `<text x="${cx.toFixed(1)}" y="${(y - 13).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0F172A">${count}</text>`,
          `<text x="${cx.toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="600" fill="#475569">${escapeHtml(fmtPct(pct))}</text>`
        )
      }
    })

    barEls.push(
      `<text x="${groupCenterX.toFixed(1)}" y="${(padT + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#003B3A">${escapeHtml(cp.code || cp.label)}</text>`,
      `<text x="${groupCenterX.toFixed(1)}" y="${(padT + plotH + 25).toFixed(1)}" text-anchor="middle" font-size="8" fill="#64748B">(${cp.enrolledStudentCount} HS nhập học)</text>`
    )
  })

  // Legend
  const legendStartX = padL + 10
  const legendY = svgH - 8
  const legendEls = series
    .map((s, idx) => {
      const lx = legendStartX + idx * 165
      return `<rect x="${lx}" y="${legendY - 8}" width="10" height="10" rx="2" fill="${s.color}" /><text x="${lx + 14}" y="${legendY}" font-size="9" font-weight="600" fill="#334155">${escapeHtml(s.label)}</text>`
    })
    .join("")

  return `
    <div class="chart-card" style="padding:6px 10px 4px 10px;margin-bottom:7px;">
      <div class="chart-title" style="font-size:8.6pt;">Biểu đồ so sánh quy mô học sinh theo dõi cam kết giữa các cơ sở</div>
      <div class="chart-sub" style="margin-bottom:3px;">Hiển thị trực tiếp số lượng học sinh (mã duy nhất) và tỷ lệ % so với tổng HS nhập học của từng cơ sở</div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="156" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${gridLines.join("")}
        ${barEls.join("")}
        ${legendEls}
      </svg>
    </div>`
}

interface CampusRateBarItem {
  code: string
  subLabel: string
  rate: number | null
  numerator: number
  denominator: number
}

function renderCampusRateBarSvg(params: {
  title: string
  subtitle: string
  items: CampusRateBarItem[]
  unitSuffix?: string
}): string {
  const { title, subtitle, items, unitSuffix = "" } = params
  if (!items || items.length === 0) return ""

  const svgW = 980
  const svgH = 192
  const padL = 44
  const padR = 16
  const padT = 34
  const padB = 34
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB
  const colW = plotW / items.length
  const barW = Math.min(54, Math.max(24, colW * 0.45))

  const gridLines: string[] = []
  for (let i = 0; i <= 4; i++) {
    const pct = i * 25
    const y = padT + plotH - (plotH * i) / 4
    gridLines.push(
      `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${svgW - padR}" y2="${y.toFixed(1)}" stroke="#E2E8F0" stroke-dasharray="${i === 0 ? "" : "3,3"}" stroke-width="${i === 0 ? 1.2 : 0.8}" />`,
      `<text x="${padL - 6}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748B">${pct}%</text>`
    )
  }

  const barEls: string[] = []
  items.forEach((item, idx) => {
    const cx = padL + colW * idx + colW / 2
    const x = cx - barW / 2
    const hasDenom = item.denominator > 0 && item.rate !== null
    const clampedRate = hasDenom ? Math.max(0, Math.min(100, item.rate!)) : 0
    const h = hasDenom ? Math.max(clampedRate > 0 ? 3 : 0, (clampedRate / 100) * plotH) : 0
    const y = padT + plotH - h
    const fill =
      !hasDenom
        ? "#CBD5E1"
        : clampedRate >= 70
          ? "#059669"
          : clampedRate >= 50
            ? "#00A19A"
            : "#D97706"

    if (h > 0) {
      barEls.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${fill}" />`
      )
    }

    if (hasDenom) {
      const labelBaseY = Math.min(y, padT + plotH)
      barEls.push(
        `<text x="${cx.toFixed(1)}" y="${(labelBaseY - 14).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#003B3A">${escapeHtml(fmtPct(item.rate))}</text>`,
        `<text x="${cx.toFixed(1)}" y="${(labelBaseY - 3).toFixed(1)}" text-anchor="middle" font-size="8.8" font-weight="600" fill="#475569">${item.numerator}/${item.denominator}${escapeHtml(unitSuffix)}</text>`
      )
    } else {
      barEls.push(
        `<text x="${cx.toFixed(1)}" y="${(padT + plotH - 6).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="600" fill="#94A3B8">—</text>`
      )
    }

    barEls.push(
      `<text x="${cx.toFixed(1)}" y="${(padT + plotH + 14).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#003B3A">${escapeHtml(item.code)}</text>`,
      `<text x="${cx.toFixed(1)}" y="${(padT + plotH + 25).toFixed(1)}" text-anchor="middle" font-size="8" fill="#64748B">${escapeHtml(item.subLabel)}</text>`
    )
  })

  return `
    <div class="chart-card">
      <div class="chart-title">${escapeHtml(title)}</div>
      <div class="chart-sub">${escapeHtml(subtitle)}</div>
      <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="162" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        ${gridLines.join("")}
        ${barEls.join("")}
      </svg>
    </div>`
}

// ============================================================================
// BẢNG TỔNG HỢP PHÂN CẤP TOÀN HỆ THỐNG → CƠ SỞ → KHỐI → LỚP CHO PDF
// ============================================================================

function formatBasisPeriodCounts(counts?: StandardBasisPeriodCounts): string {
  if (!counts) return "Theo kỳ định kỳ gần nhất có điểm chính thức"
  const order: Array<"CK2" | "GK2" | "CK1" | "GK1" | "KSĐN"> = ["CK2", "GK2", "CK1", "GK1", "KSĐN"]
  const parts: string[] = []
  for (const key of order) {
    const val = counts[key] || 0
    if (val > 0) parts.push(`${key}: ${val} lượt`)
  }
  return parts.length > 0 ? parts.join(" · ") : "Chưa có lượt đủ điểm xét chuẩn"
}

function countDetailBasisPeriods(
  rows: Array<{
    isEligibleForStandardRate: boolean
    latestPeriod: "KSĐN" | "GK1" | "CK1" | "GK2" | "CK2" | null
  }>
): StandardBasisPeriodCounts {
  const counts: StandardBasisPeriodCounts = { KSĐN: 0, GK1: 0, CK1: 0, GK2: 0, CK2: 0 }
  for (const r of rows) {
    if (r.isEligibleForStandardRate && r.latestPeriod) {
      counts[r.latestPeriod]++
    }
  }
  return counts
}

function renderStandardBasisNoteBox(params: {
  periodUsageLines: string[]
  includePsychNote?: boolean
  subjectScopeNote?: string
}): string {
  const usageHtml = params.periodUsageLines
    .map((line) => `<li>${line}</li>`)
    .join("")

  return `
    <div class="note-box" style="padding:7px 10px;line-height:1.45;">
      <div style="font-weight:700;color:#003B3A;margin-bottom:3px;">Ghi chú căn cứ tính Đạt chuẩn &amp; Tỷ lệ (Khối Phổ thông K-12):</div>
      <ul style="margin:0;padding-left:15px;">
        <li><strong>Kỳ định kỳ làm căn cứ xét chuẩn:</strong> Hệ thống tự động lấy <strong>kỳ kiểm tra định kỳ gần nhất có điểm chính thức</strong> của từng học sinh theo thứ tự ưu tiên <strong>CK2 → GK2 → CK1 → GK1 → KSĐN</strong>.</li>
        ${usageHtml}
        <li><strong>Ngưỡng điểm chuẩn theo cấp học:</strong> Tiểu học (Khối 1–5): <strong>7,0 – 8,x</strong> là <em>Đạt chuẩn</em>, <strong>9,0 – 10</strong> là <em>Tiến bộ vượt bậc</em>, dưới 7,0 là <em>Chưa đạt chuẩn</em> · THCS (Khối 6–9): <strong>5,0 – 7,x</strong> là <em>Đạt chuẩn</em>, <strong>8,0 – 10</strong> là <em>Tiến bộ vượt bậc</em>, dưới 5,0 là <em>Chưa đạt chuẩn</em> · THPT (Khối 10–12): áp dụng ngưỡng cấu hình trên hệ thống.</li>
        <li><strong>Công thức tính tỷ lệ Đạt chuẩn:</strong> <code>(Số lượt Đạt chuẩn + Số lượt Tiến bộ vượt bậc) / Tổng số lượt HS–môn có điểm kỳ gần nhất &amp; có ngưỡng chuẩn</code>.${params.subjectScopeNote ? ` ${params.subjectScopeNote}` : ""}</li>
        ${
          params.includePsychNote
            ? `<li><strong>Tỷ lệ Tổng kết (Tâm lý cam kết đầu vào):</strong> <code>Số HS đã có kết quả tổng kết tháng / Tổng số HS thuộc diện Tâm lý cam kết đầu vào</code>.</li>`
            : ""
        }
        <li><strong>Tỷ lệ % so với HS nhập học:</strong> <code>Số HS theo dõi (mã duy nhất) / Tổng số HS nhập học</code> (lấy từ Lịch sử học sinh Chuyển đến trong năm học, chỉ tính Khối 1–12).</li>
      </ul>
    </div>`
}

function renderAcademicHierarchyRowsRecursive(
  node: HierarchyNodeMetrics,
  depth: number,
  maxDepth: number
): string {
  const pad = depth * 12
  const rowStyle =
    node.nodeType === "SYSTEM"
      ? "background:#F0FDFA;font-weight:700;color:#003B3A;"
      : node.nodeType === "CAMPUS"
        ? "background:#F8FAFC;font-weight:700;color:#003B3A;"
        : node.nodeType === "GRADE"
          ? "font-weight:600;"
          : ""

  let html = `
    <tr style="${rowStyle}">
      <td style="padding-left:${pad + 5}px;">${escapeHtml(node.label)}</td>
      <td class="num">${node.enrolledStudentCount}</td>
      <td class="num"><strong>${node.distinctStudentCount}</strong> <span class="muted">(${escapeHtml(fmtPct(node.enrolledShareRate))})</span></td>
      <td class="num">${node.eligibleRowCount}</td>
      <td class="num">${node.standardBandCount}</td>
      <td class="num" style="color:#047857;font-weight:700;">${node.outstandingCount}</td>
      <td class="num" style="color:#00736E;font-weight:700;">${escapeHtml(formatRateWithFraction(node.totalStandardMetCount, node.eligibleRowCount, node.standardRate))}</td>
    </tr>`

  if (depth < maxDepth) {
    for (const ch of node.children || []) {
      html += renderAcademicHierarchyRowsRecursive(ch, depth + 1, maxDepth)
    }
  }
  return html
}

function renderAcademicHierarchyPdfSection(
  sectionHeading: string,
  root: HierarchyNodeMetrics,
  cohortLabel: string,
  maxDepth: number = 1
): string {
  const unitHeader =
    maxDepth <= 1
      ? "Đơn vị (Toàn hệ thống / Cơ sở)"
      : "Đơn vị (Hệ thống / Cơ sở / Khối / Lớp)"
  return `
    <div class="section-title">${escapeHtml(sectionHeading)}</div>
    <table>
      <colgroup>
        <col style="width:26%" />
        <col style="width:10%" />
        <col style="width:16%" />
        <col style="width:10%" />
        <col style="width:11%" />
        <col style="width:12%" />
        <col style="width:15%" />
      </colgroup>
      <thead>
        <tr>
          <th>${unitHeader}</th>
          <th class="num">HS nhập học</th>
          <th class="num">${escapeHtml(cohortLabel)} (% nhập học)</th>
          <th class="num">Lượt xét chuẩn</th>
          <th class="num">Đạt chuẩn (7–8 / 5–7)</th>
          <th class="num">Tiến bộ vượt bậc (9–10 / 8–10)</th>
          <th class="num">Tỷ lệ Đạt chuẩn (Kỳ gần nhất)</th>
        </tr>
      </thead>
      <tbody>
        ${renderAcademicHierarchyRowsRecursive(root, 0, maxDepth)}
      </tbody>
    </table>`
}

function renderPsychHierarchyRowsRecursive(
  node: PsychHierarchyNodeMetrics,
  depth: number,
  maxDepth: number
): string {
  const pad = depth * 12
  const rowStyle =
    node.nodeType === "SYSTEM"
      ? "background:#F0FDFA;font-weight:700;color:#003B3A;"
      : node.nodeType === "CAMPUS"
        ? "background:#F8FAFC;font-weight:700;color:#003B3A;"
        : node.nodeType === "GRADE"
          ? "font-weight:600;"
          : ""

  let html = `
    <tr style="${rowStyle}">
      <td style="padding-left:${pad + 5}px;">${escapeHtml(node.label)}</td>
      <td class="num">${node.enrolledStudentCount}</td>
      <td class="num"><strong>${node.totalStudents}</strong> <span class="muted">(${escapeHtml(fmtPct(node.enrolledShareRate))})</span></td>
      <td class="num" style="color:${node.unassignedStudents > 0 ? "#BE123C" : "#334155"};">${node.unassignedStudents}</td>
      <td class="num" style="color:${node.overdueStudents > 0 ? "#B45309" : "#334155"};">${node.overdueStudents}</td>
      <td class="num">${node.duePendingStudents}</td>
      <td class="num" style="color:#047857;">${node.completedAllDueStudents}</td>
      <td class="num" style="color:#00736E;font-weight:700;">${escapeHtml(formatRateWithFraction(node.monthSummarizedStudents, node.totalStudents, node.monthSummaryRate))}</td>
    </tr>`

  if (depth < maxDepth) {
    for (const ch of node.children || []) {
      html += renderPsychHierarchyRowsRecursive(ch, depth + 1, maxDepth)
    }
  }
  return html
}

function renderPdfHeader(params: {
  tabLabel: string
  subDetail: string
  academicYearName: string
  scopeLabel: string
  extraMetaLabel?: string
  extraMetaValue?: string
  exportedAt: string
}): string {
  return `
    <div class="header">
      <div>
        <div class="brand-org">HỆ THỐNG GIÁO DỤC SKY-LINE • PHÂN TÍCH TỔNG HỢP (SSM)</div>
        <div class="report-title">BÁO CÁO HỌC SINH THEO DÕI CAM KẾT</div>
        <div>
          <span class="tab-pill">${escapeHtml(params.tabLabel)}</span>
          <span class="report-sub">${escapeHtml(params.subDetail)}</span>
        </div>
      </div>
      <div class="meta-right">
        <div><strong>Năm học:</strong> ${escapeHtml(params.academicYearName)}</div>
        <div><strong>Phạm vi:</strong> ${escapeHtml(params.scopeLabel)}</div>
        ${
          params.extraMetaLabel && params.extraMetaValue
            ? `<div><strong>${escapeHtml(params.extraMetaLabel)}:</strong> ${escapeHtml(params.extraMetaValue)}</div>`
            : ""
        }
        <div><strong>Xuất lúc (VN):</strong> ${escapeHtml(params.exportedAt)}</div>
      </div>
    </div>`
}

// ============================================================================
// TAB 1: HỌC SINH CAM KẾT ĐẦU VÀO THEO MÔN HỌC
// ============================================================================

export function buildAcademicCommitmentPdfHtml(
  payload: AcademicCommitmentReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const campusChartItems: CampusRateBarItem[] = (payload.hierarchy.children || []).map((cp) => ({
    code: cp.code || cp.label,
    subLabel: `${cp.distinctStudentCount} HS (${fmtPct(cp.enrolledShareRate)})`,
    rate: cp.standardRate,
    numerator: cp.totalStandardMetCount,
    denominator: cp.eligibleRowCount,
  }))

  const chartSvg = renderCampusRateBarSvg({
    title: "Biểu đồ tỷ lệ đạt chuẩn (Kỳ gần nhất) — Học sinh cam kết đầu vào theo môn học",
    subtitle:
      "Hiển thị trực tiếp % và số lượt đạt chuẩn / tổng lượt xét chuẩn (gồm Đạt chuẩn + Tiến bộ vượt bậc) theo từng cơ sở",
    items: campusChartItems,
    unitSuffix: " lượt",
  })

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
      const grouped = new Map<string, typeof payload.detailRows>()
      for (const r of payload.detailRows) {
        const key = `${r.campusName} (${r.campusCode}) — Lớp ${r.className}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(r)
      }

      const tbodyContent = Array.from(grouped.entries())
        .map(([groupTitle, rows]) => {
          const headerTr = `<tr class="group-header-row"><td colspan="12">${escapeHtml(groupTitle)} (${rows.length} lượt cam kết)</td></tr>`
          const rowsTr = rows
            .map(
              (r) => `
            <tr>
              <td class="center">${r.stt}</td>
              <td><strong>${escapeHtml(r.studentName)}</strong><br/><span class="muted">${escapeHtml(r.studentCode)}</span></td>
              <td>${escapeHtml(r.className)}<br/><span class="muted">${escapeHtml(r.campusCode)}</span></td>
              <td><strong>${escapeHtml(r.committedSubject)}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ksdnScore, r.level))}</td>
              <td class="num"><strong>${escapeHtml(formatScoreForDisplay(r.gk1Score, r.level))}</strong></td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck1Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.gk2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatScoreForDisplay(r.ck2Score, r.level))}</td>
              <td class="num">${escapeHtml(formatDeltaForDisplay(r.deltaGk1Ksdn))}</td>
              <td><span class="badge ${getOutcomeBadgeClass(r.standardClassification)}">${escapeHtml(r.standardClassificationLabel)}</span><div class="muted">${escapeHtml(r.latestPeriodLabel)}</div></td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="page-break"></div>
        <div class="section-title">3. Danh sách chi tiết học sinh cam kết đầu vào theo môn học (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:3.5%" />
            <col style="width:15.5%" />
            <col style="width:8%" />
            <col style="width:9%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:5.5%" />
            <col style="width:6.5%" />
            <col style="width:14.5%" />
            <col style="width:15.5%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Môn cam kết</th>
              <th class="num">KSĐN</th>
              <th class="num">GK1</th>
              <th class="num">CK1</th>
              <th class="num">GK2</th>
              <th class="num">CK2</th>
              <th class="num">GK1−KSĐN</th>
              <th>Xếp loại chuẩn (Kỳ gần nhất)</th>
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
<title>BÁO CÁO HỌC SINH THEO DÕI CAM KẾT — Học sinh cam kết đầu vào theo môn học</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  ${renderPdfHeader({
    tabLabel: "HỌC SINH CAM KẾT ĐẦU VÀO THEO MÔN HỌC",
    subDetail: `Khối Phổ thông K-12 • Quyền: ${scope.roleDisplayLabel}`,
    academicYearName: payload.filters.academicYearName,
    scopeLabel: payload.filters.campusName,
    exportedAt,
  })}

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
    <div class="kpi-box pine">
      <div class="kpi-label">HS cam kết môn học</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.enrolledShareRate))})</span></div>
      <div class="kpi-unit">trên ${payload.summary.enrolledStudentCount} HS nhập học</div>
      ${renderProgressBar(payload.summary.enrolledShareRate, "teal")}
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Số lượt cam kết theo môn</div>
      <div class="kpi-value">${payload.summary.commitmentRowCount}</div>
      <div class="kpi-unit">đủ điểm xét chuẩn: ${payload.summary.eligibleStandardRowCount} lượt</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn (7–8 / 5–7)</div>
      <div class="kpi-value" style="color:#00736E;">${payload.summary.standardBandCount}</div>
      <div class="kpi-unit">lượt theo kỳ định kỳ gần nhất</div>
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tiến bộ vượt bậc (9–10 / 8–10)</div>
      <div class="kpi-value" style="color:#047857;">${payload.summary.outstandingCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.outstandingRate))})</span></div>
      <div class="kpi-unit">${payload.summary.outstandingCount}/${payload.summary.eligibleStandardRowCount} lượt xét chuẩn</div>
      ${renderProgressBar(payload.summary.outstandingRate, "emerald")}
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tổng tỷ lệ Đạt chuẩn (Kỳ gần nhất)</div>
      <div class="kpi-value" style="color:#047857;">${escapeHtml(formatRateWithFraction(payload.summary.totalStandardMetCount, payload.summary.eligibleStandardRowCount, payload.summary.standardRate))}</div>
      <div class="kpi-unit">gồm Đạt chuẩn + Tiến bộ vượt bậc</div>
      ${renderProgressBar(payload.summary.standardRate, "emerald")}
    </div>
  </div>

  ${renderStandardBasisNoteBox({
    periodUsageLines: [
      `<strong>Phân bổ kỳ lấy điểm thực tế trong báo cáo này:</strong> ${escapeHtml(formatBasisPeriodCounts(countDetailBasisPeriods(payload.detailRows)))}.`,
    ],
    subjectScopeNote: "Tính trên đúng các môn học sinh cam kết đầu vào.",
  })}

  ${chartSvg}

  ${renderAcademicHierarchyPdfSection(
    payload.filters.campusId === "ALL"
      ? "1. Báo cáo tổng hợp theo Toàn hệ thống và từng cơ sở"
      : "1. Báo cáo tổng hợp theo cơ sở, khối và lớp",
    payload.hierarchy,
    "HS cam kết",
    payload.filters.campusId === "ALL" ? 1 : 3
  )}

  <div class="section-title">2. Tổng hợp theo cơ sở, bậc học và môn cam kết</div>
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

// ============================================================================
// TAB 2: TÂM LÝ CAM KẾT ĐẦU VÀO
// ============================================================================

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

  const campusChartItems: CampusRateBarItem[] = payload.campusSummary.map((c) => ({
    code: c.campusCode || c.campusName,
    subLabel: `${c.totalStudents} HS thuộc diện`,
    rate: c.monthSummaryRate,
    numerator: c.monthSummarizedStudents,
    denominator: c.totalStudents,
  }))

  const chartSvg = renderCampusRateBarSvg({
    title: "Biểu đồ tỷ lệ đã tổng kết tháng theo cơ sở — Tâm lý cam kết đầu vào",
    subtitle: "Hiển thị trực tiếp % và số học sinh đã tổng kết / tổng số HS thuộc diện tâm lý cam kết đầu vào",
    items: campusChartItems,
    unitSuffix: " HS",
  })

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
        <div class="page-break"></div>
        <div class="section-title">3. Danh sách chi tiết theo dõi Tâm lý cam kết đầu vào (${payload.detailRows.length} học sinh)</div>
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

  const sessionRate =
    payload.summary.totalScheduledSessions > 0
      ? (payload.summary.completedSessions / payload.summary.totalScheduledSessions) * 100
      : null

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>BÁO CÁO HỌC SINH THEO DÕI CAM KẾT — Tâm lý cam kết đầu vào</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  ${renderPdfHeader({
    tabLabel: "TÂM LÝ CAM KẾT ĐẦU VÀO",
    subDetail: `Khối Phổ thông K-12 • Quyền: ${scope.roleDisplayLabel}`,
    academicYearName: payload.filters.academicYearName,
    scopeLabel: payload.filters.campusName,
    extraMetaLabel: "Kỳ / Tháng",
    extraMetaValue: payload.filters.monthLabel,
    exportedAt,
  })}

  <div class="filter-strip">
    <strong>Bộ lọc áp dụng:</strong>
    Năm học: ${escapeHtml(payload.filters.academicYearName)} •
    Tháng: ${escapeHtml(payload.filters.monthLabel)} •
    Cơ sở: ${escapeHtml(payload.filters.campusName)} •
    Lớp: ${escapeHtml(payload.filters.className)} •
    GV / Chuyên viên: ${escapeHtml(payload.filters.teacherName)}
  </div>

  <div class="kpi-grid">
    <div class="kpi-box pine">
      <div class="kpi-label">HS thuộc diện Tâm lý CKĐV</div>
      <div class="kpi-value">${payload.summary.totalStudents}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.enrolledShareRate))})</span></div>
      <div class="kpi-unit">trên ${payload.summary.enrolledStudentCount} HS nhập học</div>
      ${renderProgressBar(payload.summary.enrolledShareRate, "teal")}
    </div>
    <div class="kpi-box rose">
      <div class="kpi-label">Chưa phân công GV/CV</div>
      <div class="kpi-value" style="color:#BE123C;">${payload.summary.unassignedStudents}</div>
      <div class="kpi-unit">học sinh cần gán phụ trách</div>
    </div>
    <div class="kpi-box amber">
      <div class="kpi-label">Có đánh giá quá hạn</div>
      <div class="kpi-value" style="color:#B45309;">${payload.summary.overdueStudents}</div>
      <div class="kpi-unit">học sinh quá hạn theo dõi</div>
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Đã tổng kết tháng</div>
      <div class="kpi-value" style="color:#047857;">${escapeHtml(formatRateWithFraction(payload.summary.monthSummarizedStudents, payload.summary.totalStudents, payload.summary.monthSummaryRate))}</div>
      <div class="kpi-unit">học sinh đã chốt tổng kết</div>
      ${renderProgressBar(payload.summary.monthSummaryRate, "emerald")}
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Tiến độ lượt đánh giá tuần</div>
      <div class="kpi-value">${payload.summary.completedSessions}/${payload.summary.totalScheduledSessions}<span class="kpi-pct">(${escapeHtml(fmtPct(sessionRate))})</span></div>
      <div class="kpi-unit">lượt đánh giá hoàn thành</div>
      ${renderProgressBar(sessionRate, "teal")}
    </div>
  </div>

  ${chartSvg}

  <div class="section-title">${
    payload.filters.campusId === "ALL"
      ? "1. Báo cáo tổng hợp theo Toàn hệ thống và từng cơ sở"
      : "1. Báo cáo tổng hợp theo cơ sở, khối và lớp"
  }</div>
  <table>
    <colgroup>
      <col style="width:26%" />
      <col style="width:9%" />
      <col style="width:15%" />
      <col style="width:9%" />
      <col style="width:9%" />
      <col style="width:9%" />
      <col style="width:9%" />
      <col style="width:14%" />
    </colgroup>
    <thead>
      <tr>
        <th>${payload.filters.campusId === "ALL" ? "Đơn vị (Toàn hệ thống / Cơ sở)" : "Đơn vị (Hệ thống / Cơ sở / Khối / Lớp)"}</th>
        <th class="num">HS nhập học</th>
        <th class="num">HS thuộc diện (% nhập học)</th>
        <th class="num">Chưa phân công</th>
        <th class="num">Có ĐG quá hạn</th>
        <th class="num">Còn lượt đến hạn</th>
        <th class="num">Đã cập nhật đủ</th>
        <th class="num">Đã tổng kết tháng</th>
      </tr>
    </thead>
    <tbody>
      ${renderPsychHierarchyRowsRecursive(payload.hierarchy, 0, payload.filters.campusId === "ALL" ? 1 : 3)}
    </tbody>
  </table>

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

// ============================================================================
// TAB 3: HỌC SINH HOMESCHOOLING NHẬP HỌC
// ============================================================================

export function buildHomeschoolingPdfHtml(
  payload: HomeschoolingReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const campusChartItems: CampusRateBarItem[] = (payload.hierarchy.children || []).map((cp) => ({
    code: cp.code || cp.label,
    subLabel: `${cp.distinctStudentCount} HS (${fmtPct(cp.enrolledShareRate)})`,
    rate: cp.standardRate,
    numerator: cp.totalStandardMetCount,
    denominator: cp.eligibleRowCount,
  }))

  const chartSvg = renderCampusRateBarSvg({
    title: "Biểu đồ tỷ lệ đạt chuẩn (Kỳ gần nhất) — Học sinh Homeschooling nhập học",
    subtitle:
      "Hiển thị trực tiếp % và số lượt đạt chuẩn / tổng lượt xét chuẩn (gồm Đạt chuẩn + Tiến bộ vượt bậc) theo từng cơ sở",
    items: campusChartItems,
    unitSuffix: " lượt",
  })

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
              <td><span class="badge ${getOutcomeBadgeClass(r.standardClassification)}">${escapeHtml(r.standardClassificationLabel)}</span><div class="muted">${escapeHtml(r.latestPeriodLabel)}</div></td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="page-break"></div>
        <div class="section-title">3. Danh sách chi tiết học sinh Homeschooling nhập học (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:3.2%" />
            <col style="width:14%" />
            <col style="width:7.5%" />
            <col style="width:13%" />
            <col style="width:8%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:14.3%" />
            <col style="width:15%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Cam kết</th>
              <th>Môn theo dõi</th>
              <th class="num">KSĐN</th>
              <th class="num">GK1</th>
              <th class="num">CK1</th>
              <th class="num">GK2</th>
              <th class="num">CK2</th>
              <th>Xếp loại chuẩn (Kỳ gần nhất)</th>
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
<title>BÁO CÁO HỌC SINH THEO DÕI CAM KẾT — Học sinh Homeschooling</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  ${renderPdfHeader({
    tabLabel: "HỌC SINH HOMESCHOOLING NHẬP HỌC",
    subDetail: `Chương trình học tập trước đây: Homeschooling • Quyền: ${scope.roleDisplayLabel}`,
    academicYearName: payload.filters.academicYearName,
    scopeLabel: payload.filters.campusName,
    exportedAt,
  })}

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
    <div class="kpi-box pine">
      <div class="kpi-label">HS Homeschooling nhập học</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.enrolledShareRate))})</span></div>
      <div class="kpi-unit">trên ${payload.summary.enrolledStudentCount} HS nhập học</div>
      ${renderProgressBar(payload.summary.enrolledShareRate, "teal")}
    </div>
    <div class="kpi-box amber">
      <div class="kpi-label">HS có cam kết đầu vào</div>
      <div class="kpi-value" style="color:#B45309;">${payload.summary.committedStudentCount}</div>
      <div class="kpi-unit">trên ${payload.summary.distinctStudentCount} HS Homeschooling</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn (7–8 / 5–7)</div>
      <div class="kpi-value" style="color:#00736E;">${payload.summary.standardBandCount}</div>
      <div class="kpi-unit">lượt theo kỳ gần nhất</div>
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tiến bộ vượt bậc (9–10 / 8–10)</div>
      <div class="kpi-value" style="color:#047857;">${payload.summary.outstandingCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.outstandingRate))})</span></div>
      <div class="kpi-unit">${payload.summary.outstandingCount}/${payload.summary.eligibleStandardRowCount} lượt xét chuẩn</div>
      ${renderProgressBar(payload.summary.outstandingRate, "emerald")}
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tổng tỷ lệ Đạt chuẩn (Kỳ gần nhất)</div>
      <div class="kpi-value" style="color:#047857;">${escapeHtml(formatRateWithFraction(payload.summary.totalStandardMetCount, payload.summary.eligibleStandardRowCount, payload.summary.standardRate))}</div>
      <div class="kpi-unit">gồm Đạt chuẩn + Tiến bộ vượt bậc</div>
      ${renderProgressBar(payload.summary.standardRate, "emerald")}
    </div>
  </div>

  ${renderStandardBasisNoteBox({
    periodUsageLines: [
      `<strong>Phân bổ kỳ lấy điểm thực tế trong báo cáo này:</strong> ${escapeHtml(formatBasisPeriodCounts(countDetailBasisPeriods(payload.detailRows)))}.`,
    ],
    subjectScopeNote:
      "Tính trên môn cam kết đầu vào (nếu có) hoặc nhóm môn cốt lõi theo cấp học (Tiểu học: Toán, Tiếng Việt, Tiếng Anh; THCS/THPT: Toán, Ngữ văn, Tiếng Anh).",
  })}

  ${chartSvg}

  ${renderAcademicHierarchyPdfSection(
    payload.filters.campusId === "ALL"
      ? "1. Báo cáo tổng hợp theo Toàn hệ thống và từng cơ sở"
      : "1. Báo cáo tổng hợp theo cơ sở, khối và lớp",
    payload.hierarchy,
    "HS Homeschooling",
    payload.filters.campusId === "ALL" ? 1 : 3
  )}

  <div class="section-title">2. Tổng hợp theo cơ sở, bậc học và môn theo dõi</div>
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

// ============================================================================
// TAB 4: HỌC SINH DIỆN HỌC GIAO LƯU
// ============================================================================

export function buildExchangePdfHtml(
  payload: ExchangeStudentReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const includeDetail = !scope.isSummaryOnly && scope.canExportDetailPdf

  const campusChartItems: CampusRateBarItem[] = (payload.hierarchy.children || []).map((cp) => ({
    code: cp.code || cp.label,
    subLabel: `${cp.distinctStudentCount} HS (${fmtPct(cp.enrolledShareRate)})`,
    rate: cp.standardRate,
    numerator: cp.totalStandardMetCount,
    denominator: cp.eligibleRowCount,
  }))

  const chartSvg = renderCampusRateBarSvg({
    title: "Biểu đồ tỷ lệ đạt chuẩn (Kỳ gần nhất) — Học sinh diện Học giao lưu",
    subtitle:
      "Hiển thị trực tiếp % và số lượt đạt chuẩn / tổng lượt xét chuẩn (gồm Đạt chuẩn + Tiến bộ vượt bậc) theo từng cơ sở",
    items: campusChartItems,
    unitSuffix: " lượt",
  })

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
              <td><span class="badge ${getOutcomeBadgeClass(r.standardClassification)}">${escapeHtml(r.standardClassificationLabel)}</span><div class="muted">${escapeHtml(r.latestPeriodLabel)}</div></td>
              <td><span class="badge ${getOutcomeBadgeClass(r.gk1Outcome)}">${escapeHtml(r.gk1OutcomeLabel)}</span></td>
            </tr>`
            )
            .join("")
          return headerTr + rowsTr
        })
        .join("")

      detailHtml = `
        <div class="page-break"></div>
        <div class="section-title">3. Danh sách chi tiết học sinh diện Học giao lưu (${payload.detailRows.length} lượt)</div>
        <table>
          <colgroup>
            <col style="width:3.2%" />
            <col style="width:14%" />
            <col style="width:7.5%" />
            <col style="width:13%" />
            <col style="width:8%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:5%" />
            <col style="width:14.3%" />
            <col style="width:15%" />
          </colgroup>
          <thead>
            <tr>
              <th class="center">STT</th>
              <th>Học sinh &amp; Mã HS</th>
              <th>Lớp / Cơ sở</th>
              <th>Diện học sinh</th>
              <th>Môn theo dõi</th>
              <th class="num">KSĐN</th>
              <th class="num">GK1</th>
              <th class="num">CK1</th>
              <th class="num">GK2</th>
              <th class="num">CK2</th>
              <th>Xếp loại chuẩn (Kỳ gần nhất)</th>
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
<title>BÁO CÁO HỌC SINH THEO DÕI CAM KẾT — Học sinh diện Học giao lưu</title>
<style>${SHARED_PDF_CSS}</style>
</head>
<body>
  ${renderPdfHeader({
    tabLabel: "HỌC SINH DIỆN HỌC GIAO LƯU",
    subDetail: `Diện học sinh: Học giao lưu (GIAO_LUU) • Quyền: ${scope.roleDisplayLabel}`,
    academicYearName: payload.filters.academicYearName,
    scopeLabel: payload.filters.campusName,
    exportedAt,
  })}

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
    <div class="kpi-box pine">
      <div class="kpi-label">HS diện Học giao lưu</div>
      <div class="kpi-value">${payload.summary.distinctStudentCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.enrolledShareRate))})</span></div>
      <div class="kpi-unit">trên ${payload.summary.enrolledStudentCount} HS nhập học</div>
      ${renderProgressBar(payload.summary.enrolledShareRate, "teal")}
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Số lượt theo dõi môn</div>
      <div class="kpi-value">${payload.summary.trackedRowCount}</div>
      <div class="kpi-unit">đủ điểm xét chuẩn: ${payload.summary.eligibleStandardRowCount} lượt</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Đạt chuẩn (7–8 / 5–7)</div>
      <div class="kpi-value" style="color:#00736E;">${payload.summary.standardBandCount}</div>
      <div class="kpi-unit">lượt theo kỳ gần nhất</div>
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tiến bộ vượt bậc (9–10 / 8–10)</div>
      <div class="kpi-value" style="color:#047857;">${payload.summary.outstandingCount}<span class="kpi-pct">(${escapeHtml(fmtPct(payload.summary.outstandingRate))})</span></div>
      <div class="kpi-unit">${payload.summary.outstandingCount}/${payload.summary.eligibleStandardRowCount} lượt xét chuẩn</div>
      ${renderProgressBar(payload.summary.outstandingRate, "emerald")}
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Tổng tỷ lệ Đạt chuẩn (Kỳ gần nhất)</div>
      <div class="kpi-value" style="color:#047857;">${escapeHtml(formatRateWithFraction(payload.summary.totalStandardMetCount, payload.summary.eligibleStandardRowCount, payload.summary.standardRate))}</div>
      <div class="kpi-unit">gồm Đạt chuẩn + Tiến bộ vượt bậc</div>
      ${renderProgressBar(payload.summary.standardRate, "emerald")}
    </div>
  </div>

  ${renderStandardBasisNoteBox({
    periodUsageLines: [
      `<strong>Phân bổ kỳ lấy điểm thực tế trong báo cáo này:</strong> ${escapeHtml(formatBasisPeriodCounts(countDetailBasisPeriods(payload.detailRows)))}.`,
    ],
    subjectScopeNote:
      "Tính trên nhóm môn cốt lõi theo cấp học (Tiểu học: Toán, Tiếng Việt, Tiếng Anh; THCS/THPT: Toán, Ngữ văn, Tiếng Anh).",
  })}

  ${chartSvg}

  ${renderAcademicHierarchyPdfSection(
    payload.filters.campusId === "ALL"
      ? "1. Báo cáo tổng hợp theo Toàn hệ thống và từng cơ sở"
      : "1. Báo cáo tổng hợp theo cơ sở, khối và lớp",
    payload.hierarchy,
    "HS Học giao lưu",
    payload.filters.campusId === "ALL" ? 1 : 3
  )}

  <div class="section-title">2. Tổng hợp theo cơ sở, bậc học và môn theo dõi</div>
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

// ============================================================================
// TAB 0: TỔNG QUAN (4 DIỆN THEO DÕI)
// ============================================================================

function renderOverviewRowsRecursive(
  node: OverviewHierarchyNode,
  depth: number,
  showPsych: boolean,
  maxDepth: number
): string {
  const pad = depth * 12
  const rowBg =
    node.nodeType === "SYSTEM"
      ? "background:#F0FDFA;font-weight:700;color:#003B3A;"
      : node.nodeType === "CAMPUS"
        ? "background:#F8FAFC;font-weight:700;color:#003B3A;"
        : node.nodeType === "GRADE"
          ? "font-weight:600;"
          : ""

  const fmtCell = (
    c: {
      studentCount: number
      shareOfEnrolledRate: number | null
      standardMetCount: number
      standardEligibleCount: number
      standardRate: number | null
    },
    isPsych = false
  ) => {
    const shareStr = fmtPct(c.shareOfEnrolledRate)
    const unit = isPsych ? "HS" : "lượt"
    const prefix = isPsych ? "Tổng kết" : "Đạt chuẩn"
    const stdStr =
      c.standardEligibleCount > 0 && c.standardRate !== null
        ? `${c.standardMetCount}/${c.standardEligibleCount} ${unit} (${fmtPct(c.standardRate)})`
        : "—"
    return `<strong>${c.studentCount} HS</strong> <span class="muted">(${shareStr})</span><br/><span style="color:#00736E;font-size:6.8pt;font-weight:600;">${prefix}: ${escapeHtml(stdStr)}</span>`
  }

  let html = `
    <tr style="${rowBg}">
      <td style="padding:3px 5px 3px ${pad + 5}px;">${escapeHtml(node.label)}</td>
      <td class="num" style="padding:3px 5px;"><strong>${node.enrolledStudentCount}</strong></td>
      <td class="num" style="padding:3px 5px;">${fmtCell(node.academicCommitment, false)}</td>
      ${showPsych ? `<td class="num" style="padding:3px 5px;">${fmtCell(node.psychologyCommitment, true)}</td>` : ""}
      <td class="num" style="padding:3px 5px;">${fmtCell(node.homeschooling, false)}</td>
      <td class="num" style="padding:3px 5px;">${fmtCell(node.exchange, false)}</td>
    </tr>`

  if (depth < maxDepth) {
    for (const child of node.children || []) {
      html += renderOverviewRowsRecursive(child, depth + 1, showPsych, maxDepth)
    }
  }
  return html
}

export function buildOverviewPdfHtml(
  payload: OverviewReportPayload,
  scope: StudentStatisticsAccessScope,
  exportedAtStr?: string
): string {
  const exportedAt = exportedAtStr || formatVietnamTimestamp()
  const root = payload.hierarchy
  const showPsych = payload.canViewPsychologyTab
  const isAllSystem = payload.filters.campusId === "ALL"
  // Xuất tổng quan gọn theo Cơ sở khi xem Toàn hệ thống; khi lọc 1 cơ sở thì xuất Cơ sở -> Khối
  const maxDepth = isAllSystem ? 1 : 2
  const rowsHtml = renderOverviewRowsRecursive(root, 0, showPsych, maxDepth)
  const overviewChartSvg = renderOverviewGroupedBarSvg(root.children || [], showPsych)

  const basis = payload.basisPeriodSummary
  const fmtPeriodInline = (c?: StandardBasisPeriodCounts) => {
    if (!c) return ""
    const order: Array<"CK2" | "GK2" | "CK1" | "GK1" | "KSĐN"> = ["CK2", "GK2", "CK1", "GK1", "KSĐN"]
    const parts = order.filter((k) => (c[k] || 0) > 0).map((k) => `${k}: ${c[k]}`)
    return parts.join(", ")
  }

  const acBand = root.academicCommitment.standardMetCount - root.academicCommitment.outstandingCount
  const hsBand = root.homeschooling.standardMetCount - root.homeschooling.outstandingCount
  const exBand = root.exchange.standardMetCount - root.exchange.outstandingCount
  const psychDet = basis?.psychologyDetail

  const acBasisTxt = fmtPeriodInline(basis?.academic)
  const hsBasisTxt = fmtPeriodInline(basis?.homeschooling)
  const exBasisTxt = fmtPeriodInline(basis?.exchange)

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>BÁO CÁO HỌC SINH THEO DÕI CAM KẾT — Tổng quan theo cơ sở</title>
<style>
${SHARED_PDF_CSS}
.ov-note-grid {
  display: flex;
  gap: 10px;
  background: #F8FAFC;
  border: 1px solid #CBD5E1;
  border-left: 3.5px solid #00A19A;
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 7pt;
  line-height: 1.38;
  color: #334155;
  break-inside: avoid;
  page-break-inside: avoid;
}
.ov-note-col { flex: 1; }
.ov-note-title { font-weight: 700; color: #003B3A; margin-bottom: 2px; font-size: 7.4pt; }
.ov-note-col ul { margin: 0; padding-left: 13px; }
.ov-note-col li { margin-bottom: 1.5px; }
</style>
</head>
<body>
  ${renderPdfHeader({
    tabLabel: isAllSystem
      ? "TỔNG QUAN THEO CƠ SỞ (4 DIỆN THEO DÕI)"
      : `TỔNG QUAN ${payload.filters.campusName.toUpperCase()} (4 DIỆN THEO DÕI)`,
    subDetail: `Khối Phổ thông K-12 (Khối 1–12) • Quyền: ${scope.roleDisplayLabel}`,
    academicYearName: payload.filters.academicYearName,
    scopeLabel: payload.filters.campusName,
    exportedAt,
  })}

  <div class="kpi-grid" style="margin-bottom:7px;">
    <div class="kpi-box pine" style="padding:5px 8px;">
      <div class="kpi-label">Tổng HS nhập học (Chuyển đến)</div>
      <div class="kpi-value">${root.enrolledStudentCount} <span class="kpi-pct" style="font-weight:600;color:#475569;">HS</span></div>
      <div class="kpi-unit">Lịch sử HS chuyển đến K-12 (${escapeHtml(payload.filters.campusName)})</div>
    </div>
    <div class="kpi-box" style="padding:5px 8px;">
      <div class="kpi-label">HS cam kết môn học</div>
      <div class="kpi-value">${root.academicCommitment.studentCount} HS<span class="kpi-pct">(${escapeHtml(fmtPct(root.academicCommitment.shareOfEnrolledRate))})</span></div>
      <div class="kpi-unit">Đạt chuẩn: <strong style="color:#047857;">${root.academicCommitment.standardEligibleCount > 0 ? `${root.academicCommitment.standardMetCount}/${root.academicCommitment.standardEligibleCount} lượt môn (${escapeHtml(fmtPct(root.academicCommitment.standardRate))})` : "—"}</strong></div>
      <div class="kpi-unit">${acBand} Đạt chuẩn · ${root.academicCommitment.outstandingCount} Vượt bậc${acBasisTxt ? ` · ${escapeHtml(acBasisTxt)}` : ""}</div>
      ${renderProgressBar(root.academicCommitment.standardRate, "emerald")}
    </div>
    ${
      showPsych
        ? `<div class="kpi-box" style="padding:5px 8px;">
            <div class="kpi-label">Tâm lý cam kết đầu vào</div>
            <div class="kpi-value">${root.psychologyCommitment.studentCount} HS<span class="kpi-pct">(${escapeHtml(fmtPct(root.psychologyCommitment.shareOfEnrolledRate))})</span></div>
            <div class="kpi-unit">Tổng kết ${escapeHtml(basis?.psychologyMonthLabel || "tháng")}: <strong style="color:#00736E;">${escapeHtml(formatRateWithFraction(root.psychologyCommitment.standardMetCount, root.psychologyCommitment.standardEligibleCount, root.psychologyCommitment.standardRate))}</strong></div>
            ${psychDet ? `<div class="kpi-unit">${psychDet.completedSessions}/${psychDet.totalScheduledSessions} lượt tuần · ${psychDet.overdueStudents} quá hạn · ${psychDet.unassignedStudents} chưa PC</div>` : ""}
            ${renderProgressBar(root.psychologyCommitment.standardRate, "teal")}
          </div>`
        : ""
    }
    <div class="kpi-box amber" style="padding:5px 8px;">
      <div class="kpi-label">HS Homeschooling</div>
      <div class="kpi-value">${root.homeschooling.studentCount} HS<span class="kpi-pct">(${escapeHtml(fmtPct(root.homeschooling.shareOfEnrolledRate))})</span></div>
      <div class="kpi-unit">Đạt chuẩn: <strong style="color:#047857;">${root.homeschooling.standardEligibleCount > 0 ? `${root.homeschooling.standardMetCount}/${root.homeschooling.standardEligibleCount} lượt môn (${escapeHtml(fmtPct(root.homeschooling.standardRate))})` : "—"}</strong></div>
      <div class="kpi-unit">${hsBand} Đạt chuẩn · ${root.homeschooling.outstandingCount} Vượt bậc${hsBasisTxt ? ` · ${escapeHtml(hsBasisTxt)}` : ""}</div>
      ${renderProgressBar(root.homeschooling.standardRate, "amber")}
    </div>
    <div class="kpi-box emerald" style="padding:5px 8px;">
      <div class="kpi-label">HS học giao lưu</div>
      <div class="kpi-value">${root.exchange.studentCount} HS<span class="kpi-pct">(${escapeHtml(fmtPct(root.exchange.shareOfEnrolledRate))})</span></div>
      <div class="kpi-unit">Đạt chuẩn: <strong style="color:#047857;">${root.exchange.standardEligibleCount > 0 ? `${root.exchange.standardMetCount}/${root.exchange.standardEligibleCount} lượt môn (${escapeHtml(fmtPct(root.exchange.standardRate))})` : "—"}</strong></div>
      <div class="kpi-unit">${exBand} Đạt chuẩn · ${root.exchange.outstandingCount} Vượt bậc${exBasisTxt ? ` · ${escapeHtml(exBasisTxt)}` : ""}</div>
      ${renderProgressBar(root.exchange.standardRate, "emerald")}
    </div>
  </div>

  ${overviewChartSvg}

  <div class="section-title" style="margin:6px 0 4px 0;font-size:8.8pt;">${
    isAllSystem
      ? "Bảng tổng hợp tổng quan theo Toàn hệ thống và từng cơ sở"
      : `Bảng tổng hợp tổng quan theo cơ sở và khối (${escapeHtml(payload.filters.campusName)})`
  }</div>
  <table style="margin-bottom:6px;">
    <thead>
      <tr>
        <th style="padding:4px 5px;">${isAllSystem ? "Đơn vị (Toàn hệ thống / Cơ sở)" : "Đơn vị (Cơ sở / Khối)"}</th>
        <th class="num" style="padding:4px 5px;">HS nhập học</th>
        <th class="num" style="padding:4px 5px;">Cam kết môn học (SL / % / Đạt chuẩn)</th>
        ${showPsych ? `<th class="num" style="padding:4px 5px;">Tâm lý CKĐV (SL / % / Tổng kết)</th>` : ""}
        <th class="num" style="padding:4px 5px;">Homeschooling (SL / % / Đạt chuẩn)</th>
        <th class="num" style="padding:4px 5px;">Học giao lưu (SL / % / Đạt chuẩn)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="ov-note-grid">
    <div class="ov-note-col">
      <div class="ov-note-title">Ghi chú căn cứ tính Đạt chuẩn (Kỳ định kỳ gần nhất)</div>
      <ul>
        <li><strong>Kỳ lấy điểm:</strong> Tự động lấy kỳ gần nhất có điểm chính thức theo thứ tự <strong>CK2 → GK2 → CK1 → GK1 → KSĐN</strong>.</li>
        <li><strong>Ngưỡng chuẩn (K-12):</strong> Tiểu học (K1–5): <strong>7–8</strong> Đạt chuẩn, <strong>9–10</strong> Tiến bộ vượt bậc · THCS (K6–9): <strong>5–7</strong> Đạt chuẩn, <strong>8–10</strong> Tiến bộ vượt bậc.</li>
        <li><strong>Vì sao mẫu số tính theo “lượt môn”?</strong> Một HS có thể theo dõi nhiều môn (1–3 môn/HS), mỗi cặp HS–môn có điểm kỳ gần nhất tính là 1 lượt xét chuẩn (không tính lượt thiếu điểm).</li>
      </ul>
    </div>
    <div class="ov-note-col">
      <div class="ov-note-title">Công thức tỷ lệ &amp; Phân bổ kỳ thực tế trong báo cáo</div>
      <ul>
        <li><strong>Tỷ lệ Đạt chuẩn</strong> = <code>(Đạt chuẩn + Tiến bộ vượt bậc) / Tổng lượt HS–môn đủ điểm</code> · <strong>% nhập học</strong> = <code>HS theo dõi / Tổng HS Chuyển đến K-12</code>.</li>
        ${
          basis
            ? `<li><strong>Kỳ thực tế:</strong> Cam kết môn (<em>${escapeHtml(formatBasisPeriodCounts(basis.academic))}</em>) · Homeschooling (<em>${escapeHtml(formatBasisPeriodCounts(basis.homeschooling))}</em>) · Học giao lưu (<em>${escapeHtml(formatBasisPeriodCounts(basis.exchange))}</em>).</li>`
            : ""
        }
        ${
          showPsych
            ? `<li><strong>Tâm lý CKĐV:</strong> Tính tỷ lệ HS đã chốt phiếu <em>Tổng kết ${escapeHtml(basis?.psychologyMonthLabel || "tháng")}</em> trên tổng HS thuộc diện.</li>`
            : ""
        }
      </ul>
    </div>
  </div>
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
            <span>Hệ thống Giáo dục Sky-Line • BÁO CÁO HỌC SINH THEO DÕI CAM KẾT</span>
            <span>Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>`,
        margin: {
          top: "8mm",
          right: "9mm",
          bottom: "10mm",
          left: "9mm",
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
