/* eslint-disable */
// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png")
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath)
      return `data:image/png;base64,${buffer.toString("base64")}`
    }
  } catch (e) {
    console.error("Error reading logo.png:", e)
  }
  return ""
}

function isSurpriseSlot(slot: any): boolean {
  if (!slot) return false
  return (
    slot.requestOrigin === "SURPRISE" ||
    (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
    (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
  )
}

function getPresetTarget(type: string): number {
  if (type === "Ban ĐHCM") return 10
  if (type === "GĐCS" || type === "GDCS" || type === "Giám đốc Điều hành cơ sở") return 4
  if (type === "TTCM" || type === "Nhóm trưởng CM CS") return 8
  if (type === "Giáo viên cũ") return 4
  if (type === "Giáo viên mới") return 10
  return 4
}

function buildReportHtml(data: {
  title: string
  subtitle: string
  activeMonthText: string
  blockText: string
  campusText: string
  exportTime: string
  kpis: {
    totalTTCM: number
    totalObserved: number
    totalSurprise: number
    totalInternal: number
    totalCross: number
    targetMetCount: number
    metRate: number
  }
  distinctObservedCampuses: string[]
  matrixRows: any[]
  viewMode: string
  autoPrint?: boolean
}): string {
  const logoSrc = getLogoBase64()
  const { title, subtitle, activeMonthText, blockText, campusText, exportTime, kpis, distinctObservedCampuses, matrixRows, viewMode, autoPrint } = data

  const isPivot = viewMode !== "detailed-list"

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Báo cáo Ma trận Dự giờ TTCM - ${activeMonthText}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      line-height: 1.4;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 16px;
    }
    .action-bar {
      max-width: 297mm;
      margin: 0 auto 12px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .action-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-bar-title {
      font-weight: 700;
      font-size: 10pt;
      color: #003B3A;
    }
    .action-bar-desc {
      font-size: 8pt;
      color: #64748b;
    }
    .btn-group {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 8.5pt;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }
    .btn-primary {
      background: #00A19A;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #008B85;
    }
    .btn-outline {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-outline:hover {
      background: #f8fafc;
      color: #0f172a;
    }

    /* Print Page Container (A4 Landscape) */
    .print-page {
      background: #ffffff;
      max-width: 297mm;
      margin: 0 auto;
      padding: 6mm 8mm;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 6px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .print-page {
        box-shadow: none;
        border-radius: 0;
        padding: 0;
        max-width: 100%;
        margin: 0;
      }
      @page {
        size: A4 landscape;
        margin: 6mm 8mm 6mm 8mm;
      }
    }

    /* Header styling */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2.5px solid #003B3A;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      height: 44px;
      width: auto;
      object-fit: contain;
    }
    .brand-name {
      font-size: 11pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-dept {
      font-size: 8pt;
      font-weight: 700;
      color: #00A19A;
      text-transform: uppercase;
      margin-top: 1px;
    }
    .brand-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 1px;
    }
    .meta-box {
      text-align: right;
      font-size: 7.8pt;
      color: #475569;
      line-height: 1.5;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .badge-form {
      display: inline-block;
      padding: 1px 6px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #005854;
      font-weight: 700;
      border-radius: 4px;
      margin-bottom: 2px;
    }

    /* Titles */
    .title-wrapper {
      text-align: center;
      margin-bottom: 12px;
    }
    .title-main {
      font-size: 13.5pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-sub {
      font-size: 9pt;
      font-weight: 700;
      color: #00736E;
      margin-top: 2px;
    }
    .title-info {
      font-size: 8pt;
      color: #64748b;
      margin-top: 3px;
    }

    /* KPI Cards */
    .kpi-container {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 8px;
      background: #ffffff;
      text-align: center;
    }
    .kpi-card.kpi-teal {
      background: #f0fdfa;
      border-color: #ccfbf1;
    }
    .kpi-card.kpi-blue {
      background: #f0f9ff;
      border-color: #e0f2fe;
    }
    .kpi-card.kpi-emerald {
      background: #ecfdf5;
      border-color: #d1fae5;
    }
    .kpi-label {
      font-size: 7.2pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.3px;
    }
    .kpi-value {
      font-size: 15pt;
      font-weight: 900;
      color: #003B3A;
      margin: 1px 0;
      line-height: 1.2;
    }
    .kpi-sub {
      font-size: 7.2pt;
      color: #64748b;
      font-weight: 500;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.8pt;
      margin-bottom: 14px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 5px;
      vertical-align: middle;
    }
    table.data-table th {
      background: #003B3A;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      font-size: 7.4pt;
      letter-spacing: 0.3px;
    }
    table.data-table th.th-sub {
      background: #005854;
    }
    table.data-table th.th-teal {
      background: #00736E;
    }
    table.data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    table.data-table tfoot tr {
      background: #e2e8f0;
      font-weight: 800;
      border-top: 2px solid #003B3A;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }

    /* Cells highlighting */
    .cell-home {
      background: #ecfdf5 !important;
      color: #065f46;
      font-weight: 700;
      border-radius: 4px;
      padding: 2px 4px;
      display: inline-block;
      font-size: 7.8pt;
    }
    .cell-cross {
      background: #f0f9ff !important;
      color: #0369a1;
      font-weight: 700;
      border-radius: 4px;
      padding: 2px 4px;
      display: inline-block;
      font-size: 7.8pt;
    }
    .cell-surprise {
      font-size: 6.8pt;
      color: #b45309;
      font-weight: 600;
      margin-top: 1px;
    }

    .badge-met {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      padding: 2px 6px;
      border-radius: 9999px;
      font-size: 7pt;
      font-weight: 700;
      display: inline-block;
      white-space: nowrap;
    }
    .badge-unmet {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 2px 6px;
      border-radius: 9999px;
      font-size: 7pt;
      font-weight: 700;
      display: inline-block;
      white-space: nowrap;
    }

    /* Notes */
    .notes-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 14px;
      font-size: 7.2pt;
      color: #475569;
      line-height: 1.45;
    }
    .notes-title {
      font-weight: 700;
      color: #003B3A;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    /* Signature table */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
      margin-top: 12px;
    }
    .sign-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: top;
      padding: 4px;
    }
    .sign-role {
      font-size: 8.5pt;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
    }
    .sign-note {
      font-size: 7.5pt;
      color: #64748b;
      font-style: italic;
      margin-bottom: 35px;
    }
    .sign-name {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <div class="action-bar-left">
      <div>
        <div class="action-bar-title">Bản In / Lưu PDF: Báo Cáo Ma Trận Dự Giờ TTCM</div>
        <div class="action-bar-desc">Kỳ báo cáo: <strong>${activeMonthText}</strong> &bull; Định dạng chuẩn A4 Khổ Ngang (Landscape)</div>
      </div>
    </div>
    <div class="btn-group">
      <button class="btn btn-outline" onclick="window.close()">Đóng cửa sổ</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ In Báo Cáo / Lưu PDF</button>
    </div>
  </div>

  <div class="print-page">
    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td style="width: 65%;">
          <div class="brand-section">
            ${logoSrc ? `<img src="${logoSrc}" alt="Sky-Line Logo" class="brand-logo" />` : ""}
            <div>
              <div class="brand-name">HỆ THỐNG GIÁO DỤC SKY-LINE</div>
              <div class="brand-dept">BAN ĐÀO TẠO & PHÁT TRIỂN CHUYÊN MÔN • BỘ PHẬN ĐBCL</div>
              <div class="brand-sub">Hệ thống Quản lý Chất lượng Giáo dục & Đánh giá Năng lực (SQMS / SSM)</div>
            </div>
          </div>
        </td>
        <td style="width: 35%;">
          <div class="meta-box">
            <div><span class="badge-form">BM-SSM-TTCM-02</span></div>
            <div>Thời gian xuất: <strong>${exportTime}</strong></div>
            <div>Khối áp dụng: <strong>${blockText}</strong></div>
            <div>Cơ sở báo cáo: <strong>${campusText}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Titles -->
    <div class="title-wrapper">
      <div class="title-main">${title}</div>
      <div class="title-sub">${subtitle}</div>
      <div class="title-info">
        Kỳ báo cáo: <strong>${activeMonthText}</strong> &bull; Thống kê đối chiếu số tiết dự giờ nội bộ và liên cơ sở của Tổ trưởng Chuyên môn (TTCM)
      </div>
    </div>

    <!-- 5 KPI Cards -->
    <div class="kpi-container">
      <div class="kpi-card">
        <div class="kpi-label">Tổng số TTCM</div>
        <div class="kpi-value">${kpis.totalTTCM}</div>
        <div class="kpi-sub">${blockText}</div>
      </div>
      <div class="kpi-card kpi-teal">
        <div class="kpi-label">Tổng tiết đã dự</div>
        <div class="kpi-value" style="color: #005854;">${kpis.totalObserved}</div>
        <div class="kpi-sub">${kpis.totalSurprise} tiết đột xuất</div>
      </div>
      <div class="kpi-card kpi-emerald">
        <div class="kpi-label">Dự nội bộ cơ sở</div>
        <div class="kpi-value" style="color: #065f46;">${kpis.totalInternal}</div>
        <div class="kpi-sub">${kpis.totalObserved > 0 ? Math.round((kpis.totalInternal / kpis.totalObserved) * 100) : 0}% tổng số tiết</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="kpi-label">Dự chéo liên cơ sở</div>
        <div class="kpi-value" style="color: #0369a1;">${kpis.totalCross}</div>
        <div class="kpi-sub">${kpis.totalObserved > 0 ? Math.round((kpis.totalCross / kpis.totalObserved) * 100) : 0}% tổng số tiết</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Đạt chỉ tiêu dự giờ</div>
        <div class="kpi-value" style="color: #0f172a;">${kpis.targetMetCount}/${kpis.totalTTCM}</div>
        <div class="kpi-sub">Tỷ lệ hoàn thành: <strong>${kpis.metRate}%</strong></div>
      </div>
    </div>

    <!-- Main Data Table -->
    ${isPivot ? `
    <!-- VIEW 1: MA TRẬN 2 CHIỀU (PIVOT GRID) -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px;">STT</th>
          <th style="min-width: 130px; text-align: left;">Họ và Tên TTCM</th>
          <th style="width: 55px;">Chức vụ</th>
          <th style="min-width: 95px; text-align: left;">Tổ chuyên môn</th>
          <th style="width: 75px;">Cơ sở công tác</th>
          ${distinctObservedCampuses.map(cn => `
            <th class="th-sub" style="min-width: 55px;">${cn}</th>
          `).join("")}
          <th class="th-teal" style="width: 65px;">Tổng dự</th>
          <th style="width: 75px;">Chỉ tiêu</th>
          <th style="width: 80px;">Đánh giá</th>
        </tr>
      </thead>
      <tbody>
        ${matrixRows.map((item, idx) => {
          const campusPeriodsMap = new Map(item.breakdown.map((b: any) => [b.campusName, b.periods]))
          const campusSurpriseMap = new Map(item.breakdown.map((b: any) => [b.campusName, b.surprisePeriods]))
          return `
            <tr>
              <td class="text-center font-semibold" style="color: #64748b;">${idx + 1}</td>
              <td class="text-left font-bold" style="color: #0f172a;">
                ${item.teacherName}
                <div style="font-size: 6.8pt; color: #94a3b8; font-weight: 500;">${item.teacherCode}</div>
              </td>
              <td class="text-center">
                <span style="font-size: 7.2pt; font-weight: 600; color: #475569; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">
                  ${item.position}
                </span>
              </td>
              <td class="text-left font-medium" style="color: #334155;">${item.deptName}</td>
              <td class="text-center font-medium" style="color: #334155;">${item.homeCampus}</td>
              ${distinctObservedCampuses.map(cn => {
                const count = campusPeriodsMap.get(cn) || 0
                const surprise = campusSurpriseMap.get(cn) || 0
                const isHome = cn === item.homeCampus
                if (count > 0) {
                  return `
                    <td class="text-center">
                      <div class="${isHome ? 'cell-home' : 'cell-cross'}">${count} tiết</div>
                      ${surprise > 0 ? `<div class="cell-surprise">(${surprise} đột xuất)</div>` : ''}
                    </td>
                  `
                }
                return `<td class="text-center" style="color: #cbd5e1;">-</td>`
              }).join("")}
              <td class="text-center font-black" style="color: #003B3A; background: #f0fdfa;">
                ${item.totalObserved} tiết
              </td>
              <td class="text-center font-semibold" style="color: #475569;">
                ${item.reqObserved} tiết/${item.observedUnit}
                ${item.observerType ? `<div style="font-size: 6.8pt; color: #94a3b8; font-weight: 500;">${item.observerType}</div>` : ''}
              </td>
              <td class="text-center">
                ${item.isTargetMet
                  ? `<span class="badge-met">Đạt chỉ tiêu</span>`
                  : `<span class="badge-unmet">Chưa đạt (${item.progressPct}%)</span>`
                }
              </td>
            </tr>
          `
        }).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="text-left font-black" style="padding-left: 8px;">
            TỔNG CỘNG TỪNG CƠ SỞ (${matrixRows.length} TTCM)
          </td>
          ${distinctObservedCampuses.map(cn => {
            const campusTotal = matrixRows.reduce((sum, item) => {
              const campusPeriodsMap = new Map(item.breakdown.map((b: any) => [b.campusName, b.periods]))
              return sum + (campusPeriodsMap.get(cn) || 0)
            }, 0)
            return `
              <td class="text-center font-black" style="color: #0f172a;">
                ${campusTotal} tiết
              </td>
            `
          }).join("")}
          <td class="text-center font-black" style="color: #003B3A; background: #ccfbf1;">
            ${kpis.totalObserved} tiết
          </td>
          <td class="text-center" style="color: #64748b;">-</td>
          <td class="text-center font-black" style="color: #166534;">
            ${kpis.targetMetCount}/${kpis.totalTTCM} Đạt (${kpis.metRate}%)
          </td>
        </tr>
      </tfoot>
    </table>
    ` : `
    <!-- VIEW 2: DANH SÁCH CHI TIẾT THEO CƠ SỞ -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px;">STT</th>
          <th style="min-width: 140px; text-align: left;">Họ và Tên TTCM</th>
          <th style="width: 55px;">Chức vụ</th>
          <th style="min-width: 100px; text-align: left;">Tổ chuyên môn</th>
          <th style="width: 80px;">Cơ sở công tác</th>
          <th style="min-width: 90px; text-align: left;">Cơ sở dự giờ</th>
          <th style="width: 75px;">Phân loại</th>
          <th style="width: 65px;">Số tiết</th>
          <th style="width: 75px;">Chỉ tiêu</th>
          <th style="width: 85px;">Đánh giá</th>
        </tr>
      </thead>
      <tbody>
        ${matrixRows.map((item, idx) => {
          const rowCount = item.breakdown.length
          return item.breakdown.map((b: any, bIdx: number) => `
            <tr>
              ${bIdx === 0 ? `
                <td rowspan="${rowCount}" class="text-center font-semibold" style="color: #64748b; vertical-align: top;">${idx + 1}</td>
                <td rowspan="${rowCount}" class="text-left font-bold" style="color: #0f172a; vertical-align: top;">
                  ${item.teacherName}
                  <div style="font-size: 6.8pt; color: #94a3b8; font-weight: 500;">${item.teacherCode}</div>
                </td>
                <td rowspan="${rowCount}" class="text-center" style="vertical-align: top;">
                  <span style="font-size: 7.2pt; font-weight: 600; color: #475569; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">
                    ${item.position}
                  </span>
                </td>
                <td rowspan="${rowCount}" class="text-left font-medium" style="color: #334155; vertical-align: top;">${item.deptName}</td>
                <td rowspan="${rowCount}" class="text-center font-medium" style="color: #334155; vertical-align: top;">${item.homeCampus}</td>
              ` : ''}
              <td class="text-left font-medium" style="color: #0f172a;">${b.campusName}</td>
              <td class="text-center font-semibold">
                ${b.periods === 0
                  ? `<span style="color: #94a3b8;">-</span>`
                  : b.isCrossCampus
                    ? `<span style="color: #0369a1; background: #f0f9ff; padding: 1px 4px; border-radius: 3px;">Liên cơ sở</span>`
                    : `<span style="color: #065f46; background: #ecfdf5; padding: 1px 4px; border-radius: 3px;">Nội bộ cơ sở</span>`
                }
              </td>
              <td class="text-center font-bold" style="color: #003B3A;">
                ${b.periods} tiết
                ${b.surprisePeriods > 0 ? `<div class="cell-surprise">(${b.surprisePeriods} đột xuất)</div>` : ''}
              </td>
              ${bIdx === 0 ? `
                <td rowspan="${rowCount}" class="text-center font-semibold" style="color: #475569; vertical-align: top;">
                  ${item.reqObserved} tiết/${item.observedUnit}
                  ${item.observerType ? `<div style="font-size: 6.8pt; color: #94a3b8;">${item.observerType}</div>` : ''}
                </td>
                <td rowspan="${rowCount}" class="text-center" style="vertical-align: top;">
                  ${item.isTargetMet
                    ? `<span class="badge-met">Đạt chỉ tiêu</span>`
                    : `<span class="badge-unmet">Chưa đạt (${item.progressPct}%)</span>`
                  }
                </td>
              ` : ''}
            </tr>
          `).join("")
        }).join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="7" class="text-left font-black" style="padding-left: 8px;">
            TỔNG CỘNG TOÀN BỘ HỆ THỐNG (${matrixRows.length} TTCM)
          </td>
          <td class="text-center font-black" style="color: #003B3A; background: #ccfbf1;">
            ${kpis.totalObserved} tiết
          </td>
          <td class="text-center" style="color: #64748b;">-</td>
          <td class="text-center font-black" style="color: #166534;">
            ${kpis.targetMetCount}/${kpis.totalTTCM} Đạt (${kpis.metRate}%)
          </td>
        </tr>
      </tfoot>
    </table>
    `}

    <!-- Business Notes -->
    <div class="notes-box">
      <div class="notes-title">📌 Ghi chú nghiệp vụ & Quy định Chuyên môn Sky-Line:</div>
      <div>1. <strong>Tiết dự hợp lệ:</strong> Tiết dạy đã hoàn thành phiếu dự giờ và đánh giá chuyên môn chính thức theo chuẩn sư phạm Sky-Line (không tính phiếu nháp).</div>
      <div>2. <strong>Phân loại dự giờ:</strong> <em>Nội bộ cơ sở</em> (dự GV cùng cơ sở công tác) và <em>Chéo liên cơ sở</em> (dự GV tại các cơ sở bạn để khảo sát chất lượng giảng dạy chéo toàn hệ thống).</div>
      <div>3. <strong>Định mức chỉ tiêu dự giờ:</strong> Áp dụng theo Quyết định Ban Điều Hành Chuyên Môn (GĐCS: 4 tiết/tháng; TTCM: 6 - 8 tiết/tháng; Ban ĐHCM: 10 tiết/tháng).</div>
    </div>

    <!-- Signatures Table -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-role">NGƯỜI LẬP BÁO CÁO</div>
          <div class="sign-note">(Ký và ghi rõ họ tên)</div>
          <div class="sign-name">Ban Quản Trị Chuyên Môn</div>
        </td>
        <td>
          <div class="sign-role">TỔ TRƯỞNG CHUYÊN MÔN / TBP</div>
          <div class="sign-note">(Ký và ghi rõ họ tên)</div>
          <div class="sign-name">...................................................</div>
        </td>
        <td>
          <div class="sign-role">BAN TỔNG HIỆU TRƯỞNG / GĐCS DUYỆT</div>
          <div class="sign-note">(Ký duyệt và đóng dấu)</div>
          <div class="sign-name">...................................................</div>
        </td>
      </tr>
    </table>
  </div>

  <script>
    if (${autoPrint ? "true" : "false"}) {
      window.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          window.print();
        }, 500);
      });
    }
  </script>
</body>
</html>`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") || "all"
    const block = searchParams.get("block") || "all"
    const campus = searchParams.get("campus") || "all"
    const observedCampus = searchParams.get("observedCampus") || "all"
    const searchQuery = searchParams.get("search") || ""
    const viewMode = searchParams.get("viewMode") || "pivot-matrix"
    const academicYearId = searchParams.get("academicYearId") || undefined
    const autoPrint = searchParams.get("autoPrint") === "true"

    // Authenticate session (or allow admin session)
    const session = await auth().catch(() => null)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch Teachers, Campuses, Departments, Targets
    const [teachers, departments, campuses, slots] = await Promise.all([
      prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        include: {
          campus: true,
          departmentRel: true,
          departmentAssignments: { include: { department: true } },
          divisionAssignments: true
        }
      }),
            prisma.department.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" }
      }),
      prisma.campus.findMany({
        where: { NOT: { status: "INACTIVE" } },
        orderBy: { campusName: "asc" }
      }),
      prisma.observationSlot.findMany({
        where: {
          status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "REJECTED", "OPEN", "EXPIRED"] }
        },
        include: {
          teacher: {
            include: {
              campus: true,
              departmentRel: true
            }
          },
          registrations: {
            include: {
              teacher: {
                include: {
                  campus: true,
                  departmentRel: true
                }
              },
              evaluation: true
            }
          }
        },
        orderBy: { date: "asc" }
      })
    ])

    // Build TTCM Map
    const ttcmMap = new Map<string, any>()

    departments.forEach(dept => {
      const deptTeachers = teachers.filter(t =>
        t.departmentId === dept.id || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id)
      )
      const ttcm = deptTeachers.find(t =>
        t.position === "TTCM" || t.departmentAssignments?.some((da: any) => da.departmentId === dept.id && da.position === "TTCM")
      )
      if (ttcm) {
        ttcmMap.set(ttcm.id, {
          ...ttcm,
          deptId: dept.id,
          deptName: dept.name,
          block: dept.blockCM || "Phổ thông K-12"
        })
      }
    })

    teachers.forEach(t => {
      const pos = (t.position || "").toUpperCase().trim()
      const obsUpper = (t.observerType || "").toUpperCase().trim()
      const deptName = (t.departmentRel?.name || "").toUpperCase().trim()

      const isTT = pos === "TTCM" || pos.includes("TTCM") || pos.includes("TỔ TRƯỞNG") || pos.includes("TO TRUONG") ||
        t.observerType === "TTCM" ||
        t.departmentAssignments?.some((da: any) => {
          const p = (da.position || "").toUpperCase().trim()
          return p === "TTCM" || p.includes("TTCM") || p.includes("TỔ TRƯỞNG") || p.includes("TO TRUONG")
        })

      const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(pos) ||
        pos.includes("GIÁM ĐỐC") || pos.includes("GIAM DOC") ||
        obsUpper === "GĐCS" || obsUpper === "GDCS" || obsUpper.includes("GIÁM ĐỐC") ||
        deptName === "GĐCS"

      if ((isTT || isGDCS) && !ttcmMap.has(t.id)) {
        ttcmMap.set(t.id, {
          ...t,
          deptId: t.departmentId,
          deptName: isGDCS ? "GĐCS" : (t.departmentRel?.name || "Tổ chuyên môn"),
          block: isGDCS ? "Điều hành" : (t.departmentRel?.blockCM || "Phổ thông K-12")
        })
      }
    })

    const allTTCMList = Array.from(ttcmMap.values()).sort((a, b) => a.teacherName.localeCompare(b.teacherName, "vi"))

    // Distinct campus names
    const campusSet = new Set<string>()
    campuses.forEach(c => { if (c.campusName) campusSet.add(c.campusName) })
    slots.forEach(s => {
      const cn = s.campusName || s.teacher?.campus?.campusName
      if (cn && cn !== "Cơ sở chưa rõ") campusSet.add(cn)
    })
    const distinctObservedCampuses = Array.from(campusSet).sort()

    // Process TTCM Matrix Data
    const matrixData = allTTCMList.map(baseTTCM => {
      const ttcm = baseTTCM
      const homeCampus = ttcm.campus?.campusName || "Chưa rõ cơ sở"

      const posUpper = (ttcm.position || "").toUpperCase()
      const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(posUpper) || posUpper.includes("GIÁM ĐỐC")
      const isBanDH = posUpper === "BAN ĐHCM" || posUpper.includes("ĐHCM")
      const observerType = ttcm.observerType || (isBanDH ? "Ban ĐHCM" : isGDCS ? "GĐCS" : (ttcm.position?.includes("Nhóm trưởng") ? "Nhóm trưởng CM CS" : "TTCM"))

      const configuredObserved = ttcm.requiredObserved
      const observedUnit = ttcm.observedUnit || "tháng"
      const reqObserved = (configuredObserved !== undefined && configuredObserved !== null && configuredObserved > 0)
        ? configuredObserved
        : getPresetTarget(observerType)

      const campusStats: Record<string, { periods: number; surprisePeriods: number }> = {}
      let totalObserved = 0
      let totalSurprise = 0
      let internalObserved = 0
      let crossObserved = 0

      slots.forEach(slot => {
        if (month !== "all") {
          if (!slot.date) return
          const d = new Date(slot.date)
          if (isNaN(d.getTime())) return
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, "0")
          if (`${yyyy}-${mm}` !== month) return
        }

        const isSurprise = isSurpriseSlot(slot)
        const increment = slot.isDoublePeriod ? 2 : 1

        slot.registrations?.forEach((reg: any) => {
          if (reg.teacherId === ttcm.id && reg.isApproved) {
            const observedCampus = slot.campusName || slot.teacher?.campus?.campusName || "Cơ sở chưa rõ"
            if (!campusStats[observedCampus]) {
              campusStats[observedCampus] = { periods: 0, surprisePeriods: 0 }
            }
            campusStats[observedCampus].periods += increment
            if (isSurprise) campusStats[observedCampus].surprisePeriods += increment

            totalObserved += increment
            if (isSurprise) totalSurprise += increment

            if (observedCampus === homeCampus) {
              internalObserved += increment
            } else {
              crossObserved += increment
            }
          }
        })
      })

      const breakdown = Object.entries(campusStats).map(([campusName, stat]) => ({
        campusName,
        periods: stat.periods,
        surprisePeriods: stat.surprisePeriods,
        isCrossCampus: campusName !== homeCampus
      })).sort((a, b) => b.periods - a.periods)

      const isTargetMet = reqObserved === 0 || totalObserved >= reqObserved
      const progressPct = reqObserved > 0 ? Math.round((totalObserved / reqObserved) * 100) : 100

      return {
        id: ttcm.id,
        teacherName: ttcm.teacherName,
        teacherCode: ttcm.teacherCode,
        position: ttcm.position || "TTCM",
        observerType,
        observedUnit,
        deptName: baseTTCM.deptName || "Tổ chuyên môn",
        block: baseTTCM.block || "Phổ thông K-12",
        homeCampus,
        reqObserved,
        totalObserved,
        totalSurprise,
        internalObserved,
        crossObserved,
        isTargetMet,
        progressPct,
        breakdown: breakdown.length > 0 ? breakdown : [{
          campusName: "Chưa có tiết dự",
          periods: 0,
          surprisePeriods: 0,
          isCrossCampus: false
        }]
      }
    })

    // Filter
    const filteredRows = matrixData.filter(item => {
      if (block !== "all" && item.block !== block) return false
      if (campus !== "all" && item.homeCampus !== campus) return false
      if (observedCampus !== "all") {
        const hasObs = item.breakdown.some(b => b.campusName === observedCampus && b.periods > 0)
        if (!hasObs) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.teacherName.toLowerCase().includes(q)
        const matchCode = item.teacherCode.toLowerCase().includes(q)
        const matchDept = item.deptName.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchDept) return false
      }
      return true
    })

    // Calculate KPIs
    let totalTTCM = filteredRows.length
    let totalObserved = 0
    let totalSurprise = 0
    let totalInternal = 0
    let totalCross = 0
    let targetMetCount = 0

    filteredRows.forEach(item => {
      totalObserved += item.totalObserved
      totalSurprise += item.totalSurprise
      totalInternal += item.internalObserved
      totalCross += item.crossObserved
      if (item.isTargetMet) targetMetCount++
    })

    const metRate = totalTTCM > 0 ? Math.round((targetMetCount / totalTTCM) * 100) : 0

    const activeMonthText = month === "all" ? "Toàn bộ năm học" : `Tháng ${month.split("-")[1]}/${month.split("-")[0]}`
    const blockText = block === "all" ? "Tất cả các khối" : block
    const campusText = campus === "all" ? "Tất cả cơ sở" : campus
    const exportTime = new Date().toLocaleString("vi-VN")

    const html = buildReportHtml({
      title: "BÁO CÁO QUẢN TRỊ DỰ GIỜ THEO THÁNG",
      subtitle: "MA TRẬN DỰ GIỜ TỔ TRƯỞNG CHUYÊN MÔN & ĐỐI CHIẾU NỘI BỘ - LIÊN CƠ SỞ",
      activeMonthText,
      blockText,
      campusText,
      exportTime,
      kpis: {
        totalTTCM,
        totalObserved,
        totalSurprise,
        totalInternal,
        totalCross,
        targetMetCount,
        metRate
      },
      distinctObservedCampuses,
      matrixRows: filteredRows,
      viewMode,
      autoPrint
    })

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    })
  } catch (error: any) {
    console.error("GET /api/admin/du-gio/export-ma-tran-pdf error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      matrixRows = [],
      kpis = { totalTTCM: 0, totalObserved: 0, totalSurprise: 0, totalInternal: 0, totalCross: 0, targetMetCount: 0, metRate: 0 },
      distinctObservedCampuses = [],
      activeMonthText = "Kỳ báo cáo hiện tại",
      blockText = "Tất cả các khối",
      campusText = "Tất cả cơ sở",
      viewMode = "pivot-matrix",
      autoPrint = true
    } = body

    const exportTime = new Date().toLocaleString("vi-VN")

    const html = buildReportHtml({
      title: "BÁO CÁO QUẢN TRỊ DỰ GIỜ THEO THÁNG",
      subtitle: "MA TRẬN DỰ GIỜ TỔ TRƯỞNG CHUYÊN MÔN & ĐỐI CHIẾU NỘI BỘ - LIÊN CƠ SỞ",
      activeMonthText,
      blockText,
      campusText,
      exportTime,
      kpis,
      distinctObservedCampuses,
      matrixRows,
      viewMode,
      autoPrint
    })

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    })
  } catch (error: any) {
    console.error("POST /api/admin/du-gio/export-ma-tran-pdf error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
