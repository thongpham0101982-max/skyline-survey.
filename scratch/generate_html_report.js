const fs = require('fs');
const path = require('path');

const mdPath = path.join('C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_chat_luong_ksdn_va_ckdv.md');
const mdRaw = fs.readFileSync(mdPath, 'utf8');

// Helper to escape HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Convert markdown inline formatting: bold, italic, code, math
function formatInline(text) {
  let s = text;
  // bold
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // italic
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // math
  s = s.replace(/\$(.*?)\$/g, '<span class="math-expr">$1</span>');
  return s;
}

// Split into blocks
const lines = mdRaw.split(/\r?\n/);
let htmlParts = [];
let inTable = false;
let tableRows = [];
let inList = false;
let inMermaid = false;
let mermaidContent = '';

function flushTable() {
  if (!inTable || tableRows.length === 0) return '';
  inTable = false;
  const rows = tableRows;
  tableRows = [];

  // Filter out delimiter row (e.g. | :---: | :--- |)
  const contentRows = rows.filter(r => !/^\s*\|?\s*:?-+:?\s*\|/.test(r));
  if (contentRows.length === 0) return '';

  const headerCells = contentRows[0].split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
  
  let out = '<div class="table-container"><table class="report-table"><thead><tr>';
  for (const h of headerCells) {
    out += `<th>${formatInline(h)}</th>`;
  }
  out += '</tr></thead><tbody>';

  for (let i = 1; i < contentRows.length; i++) {
    const rawCells = contentRows[i].split('|').map(c => c.trim()).filter((c, idx, a) => !(idx === 0 && c === '') && !(idx === a.length - 1 && c === ''));
    if (rawCells.length === 0) continue;

    const rowText = contentRows[i];
    const isTotalRow = /TỔNG CƠ SỞ|TỔNG BẬC|TỔNG HỆ THỐNG/i.test(rowText);
    const rowClass = isTotalRow ? 'total-row' : '';

    out += `<tr class="${rowClass}">`;
    for (let cIdx = 0; cIdx < rawCells.length; cIdx++) {
      let cellText = rawCells[cIdx];
      let formatted = formatInline(cellText);

      // Enhance badges
      if (/HS Cam kết tâm lý/i.test(cellText)) {
        formatted = '<span class="badge badge-psychology"><i class="icon">🧠</i> HS Cam kết tâm lý</span>';
      } else if (cellText.includes('Đạt chuẩn') && !cellText.includes('Tỷ lệ')) {
        formatted = `<span class="badge badge-success">${formatted}</span>`;
      } else if (/Báo động|cấp thiết|sa sút|điểm liệt/i.test(cellText)) {
        formatted = `<span class="badge badge-danger">${formatted}</span>`;
      } else if (/Tiến bộ rõ rệt|bứt phá|Tiến bộ xuất sắc/i.test(cellText)) {
        formatted = `<span class="badge badge-growth">${formatted}</span>`;
      }

      out += `<td>${formatted}</td>`;
    }
    out += '</tr>';
  }

  out += '</tbody></table></div>';
  return out;
}

function flushList() {
  if (!inList) return '';
  inList = false;
  return '</ul>';
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Mermaid blocks
  if (line.trim().startsWith('```mermaid')) {
    if (inTable) htmlParts.push(flushTable());
    if (inList) htmlParts.push(flushList());
    inMermaid = true;
    mermaidContent = '';
    continue;
  }
  if (inMermaid) {
    if (line.trim().startsWith('```')) {
      inMermaid = false;
      htmlParts.push(`<div class="mermaid-diagram"><pre class="mermaid">${mermaidContent}</pre></div>`);
      continue;
    }
    mermaidContent += line + '\n';
    continue;
  }

  // Other codeblocks
  if (line.trim().startsWith('```')) {
    continue;
  }

  // Tables
  if (line.trim().startsWith('|')) {
    if (inList) htmlParts.push(flushList());
    inTable = true;
    tableRows.push(line);
    continue;
  } else if (inTable) {
    htmlParts.push(flushTable());
  }

  // Blockquotes (Alerts)
  if (line.trim().startsWith('>')) {
    if (inList) htmlParts.push(flushList());
    const quoteText = line.replace(/^>\s*/, '');
    if (quoteText.includes('[!IMPORTANT]')) {
      htmlParts.push('<div class="alert alert-important"><div class="alert-title">⚠️ QUY CHUẨN ĐÁNH GIÁ CHẤT LƯỢNG & NGUYÊN TẮC DỮ LIỆU:</div>');
    } else if (quoteText.includes('[!NOTE]')) {
      htmlParts.push('<div class="alert alert-note"><div class="alert-title">📌 LƯU Ý PHƯƠNG PHÁP & CHUẨN HÓA DỮ LIỆU:</div>');
    } else {
      let cleaned = formatInline(quoteText.replace(/\*\*|\[!IMPORTANT\]|\[!NOTE\]/g, ''));
      htmlParts.push(`<div class="alert-body">${cleaned}</div>`);
    }
    // Check if next line is not quote
    if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('>')) {
      htmlParts.push('</div>');
    }
    continue;
  }

  // Headings
  if (line.startsWith('# ')) {
    if (inList) htmlParts.push(flushList());
    htmlParts.push(`<h1 class="doc-title">${formatInline(line.slice(2))}</h1>`);
    continue;
  }
  if (line.startsWith('## ')) {
    if (inList) htmlParts.push(flushList());
    const text = line.slice(3);
    const id = 'sec-' + text.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '-');
    htmlParts.push(`<h2 class="section-title" id="${id}"><span class="title-bar"></span>${formatInline(text)}</h2>`);
    continue;
  }
  if (line.startsWith('### ')) {
    if (inList) htmlParts.push(flushList());
    htmlParts.push(`<h3 class="sub-section-title">${formatInline(line.slice(4))}</h3>`);
    continue;
  }
  if (line.startsWith('#### ')) {
    if (inList) htmlParts.push(flushList());
    htmlParts.push(`<h4 class="sub-sub-section-title">${formatInline(line.slice(5))}</h4>`);
    continue;
  }

  // Horizontal rules
  if (line.trim() === '---') {
    if (inList) htmlParts.push(flushList());
    htmlParts.push('<hr class="divider" />');
    continue;
  }

  // Unordered list
  if (/^\s*[\*\-]\s+/.test(line)) {
    if (!inList) {
      htmlParts.push('<ul class="report-list">');
      inList = true;
    }
    const itemContent = line.replace(/^\s*[\*\-]\s+/, '');
    htmlParts.push(`<li>${formatInline(itemContent)}</li>`);
    continue;
  } else if (inList) {
    htmlParts.push(flushList());
  }

  // Normal paragraph
  if (line.trim() !== '') {
    htmlParts.push(`<p class="report-p">${formatInline(line)}</p>`);
  }
}

if (inTable) htmlParts.push(flushTable());
if (inList) htmlParts.push(flushList());

console.log("Processed HTML parts count:", htmlParts.length);

const fullBodyHtml = htmlParts.join('\n');

// Build standalone HTML template
const completeHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Khảo Sát Đầu Năm 2026-2027 & 76 Học Sinh CKĐV | Skyline School</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-dark: #0f172a;
      --primary-light: #3b82f6;
      --accent: #0ea5e9;
      --success: #059669;
      --success-bg: #ecfdf5;
      --warning: #d97706;
      --warning-bg: #fffbeb;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --purple: #7c3aed;
      --purple-bg: #f5f3ff;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-300: #cbd5e1;
      --gray-600: #475569;
      --gray-800: #1e293b;
      --gray-900: #0f172a;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      --card-hover-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      color: var(--gray-800);
      line-height: 1.6;
      font-size: 14.5px;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4, .brand-title, .kpi-number {
      font-family: 'Outfit', sans-serif;
    }

    /* Sticky Header Bar */
    .top-navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo-badge {
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      color: white;
      font-weight: 800;
      font-size: 16px;
      padding: 6px 12px;
      border-radius: 8px;
      letter-spacing: 0.5px;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .brand-subtitle {
      font-size: 12px;
      color: #94a3b8;
    }

    .action-buttons {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13.5px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.08);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.16);
      color: white;
    }

    /* Quick Jump Nav */
    .quick-nav {
      background: #ffffff;
      border-bottom: 1px solid var(--gray-200);
      padding: 10px 24px;
      display: flex;
      gap: 10px;
      overflow-x: auto;
      position: sticky;
      top: 57px;
      z-index: 990;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .nav-chip {
      padding: 6px 14px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--gray-600);
      background: var(--gray-100);
      border-radius: 20px;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .nav-chip:hover, .nav-chip.active {
      background: var(--primary);
      color: white;
    }

    /* Container */
    .report-wrapper {
      max-width: 1440px;
      margin: 24px auto;
      padding: 0 24px 60px 24px;
    }

    /* Hero Banner */
    .hero-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: white;
      padding: 36px 36px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }

    .hero-banner::after {
      content: "";
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(0,0,0,0) 70%);
      border-radius: 50%;
    }

    .hero-tag {
      display: inline-block;
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      margin-bottom: 12px;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .hero-title {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .hero-subtitle {
      font-size: 15px;
      color: #cbd5e1;
      max-width: 900px;
      line-height: 1.5;
    }

    .hero-meta {
      display: flex;
      gap: 24px;
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      font-size: 13px;
      color: #94a3b8;
    }

    .hero-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .hero-meta-item strong {
      color: #f1f5f9;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid var(--gray-200);
      box-shadow: var(--card-shadow);
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .kpi-card:hover {
      box-shadow: var(--card-hover-shadow);
      transform: translateY(-2px);
    }

    .kpi-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--primary-light);
    }

    .kpi-card.kpi-success::before { background: var(--success); }
    .kpi-card.kpi-warning::before { background: var(--warning); }
    .kpi-card.kpi-danger::before { background: var(--danger); }
    .kpi-card.kpi-purple::before { background: var(--purple); }

    .kpi-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--gray-600);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .kpi-number {
      font-size: 30px;
      font-weight: 800;
      color: var(--gray-900);
      line-height: 1.1;
      margin-bottom: 6px;
    }

    .kpi-subtext {
      font-size: 12px;
      color: var(--gray-600);
    }

    /* Charts Section */
    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }

    @media (max-width: 992px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }

    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 22px;
      border: 1px solid var(--gray-200);
      box-shadow: var(--card-shadow);
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--gray-100);
    }

    .chart-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--gray-900);
    }

    /* Alerts */
    .alert {
      border-radius: 10px;
      padding: 16px 20px;
      margin: 18px 0;
      font-size: 14px;
      border-left: 4px solid transparent;
    }

    .alert-important {
      background-color: #eff6ff;
      border-left-color: #2563eb;
      color: #1e3a8a;
    }

    .alert-note {
      background-color: #f0fdf4;
      border-left-color: #16a34a;
      color: #166534;
    }

    .alert-title {
      font-weight: 700;
      font-size: 14.5px;
      margin-bottom: 6px;
    }

    .alert-body {
      line-height: 1.6;
    }

    /* Section Headings */
    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--gray-900);
      margin: 36px 0 16px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--gray-200);
    }

    .title-bar {
      display: inline-block;
      width: 6px;
      height: 22px;
      background: var(--primary);
      border-radius: 3px;
    }

    .sub-section-title {
      font-size: 16.5px;
      font-weight: 700;
      color: var(--primary);
      margin: 24px 0 12px 0;
    }

    .sub-sub-section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--gray-800);
      margin: 16px 0 8px 0;
    }

    .doc-title {
      display: none;
    }

    /* Paragraphs and Lists */
    .report-p {
      margin-bottom: 12px;
      color: #334155;
    }

    .report-list {
      margin: 10px 0 16px 24px;
      color: #334155;
    }

    .report-list li {
      margin-bottom: 6px;
    }

    .divider {
      border: 0;
      height: 1px;
      background: var(--gray-200);
      margin: 32px 0;
    }

    /* Tables */
    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid var(--gray-200);
      box-shadow: var(--card-shadow);
      margin: 16px 0 24px 0;
      overflow-x: auto;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    .report-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 12px 14px;
      border-bottom: 2px solid var(--gray-200);
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 11.5px;
      letter-spacing: 0.5px;
    }

    .report-table td {
      padding: 11px 14px;
      border-bottom: 1px solid var(--gray-100);
      color: #1e293b;
    }

    .report-table tbody tr:hover {
      background-color: #f1f5f9;
    }

    .report-table tr.total-row {
      background-color: #f0f7ff;
      font-weight: 700;
      color: #0f172a;
      border-top: 2px solid #bfdbfe;
      border-bottom: 2px solid #bfdbfe;
    }

    .report-table tr.total-row td {
      color: #1e3a8a;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
    }

    .badge-success {
      background-color: var(--success-bg);
      color: var(--success);
      border: 1px solid #a7f3d0;
    }

    .badge-danger {
      background-color: var(--danger-bg);
      color: var(--danger);
      border: 1px solid #fecaca;
    }

    .badge-growth {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }

    .badge-psychology {
      background-color: var(--purple-bg);
      color: var(--purple);
      border: 1px solid #ddd6fe;
      font-weight: 700;
    }

    /* Interactive Filter Bar for CKDV */
    .filter-bar {
      background: white;
      border-radius: 12px;
      padding: 14px 18px;
      border: 1px solid var(--gray-200);
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .filter-tabs {
      display: flex;
      gap: 6px;
    }

    .filter-tab {
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--gray-300);
      background: white;
      color: var(--gray-600);
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-tab:hover, .filter-tab.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .search-box {
      display: flex;
      align-items: center;
      background: var(--gray-50);
      border: 1px solid var(--gray-300);
      border-radius: 6px;
      padding: 6px 12px;
      min-width: 260px;
    }

    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 13px;
    }

    /* Code & Pre */
    code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Mermaid container */
    .mermaid-diagram {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--gray-200);
      box-shadow: var(--card-shadow);
      margin: 20px 0;
      overflow-x: auto;
      text-align: center;
    }

    /* Footer */
    .report-footer {
      text-align: center;
      padding: 40px 0 20px 0;
      color: var(--gray-600);
      font-size: 13px;
      border-top: 1px solid var(--gray-200);
      margin-top: 40px;
    }

    /* Print Styles */
    @media print {
      body {
        background: white !important;
        font-size: 11pt !important;
        color: black !important;
      }

      .top-navbar, .quick-nav, .action-buttons, .filter-bar, .btn {
        display: none !important;
      }

      .report-wrapper {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .hero-banner {
        background: #0f172a !important;
        color: white !important;
        border-radius: 0 !important;
        padding: 20px !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .table-container {
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        break-inside: avoid;
      }

      .report-table th {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .total-row {
        background-color: #e2e8f0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .section-title {
        break-after: avoid;
        margin-top: 24pt !important;
      }

      .charts-grid {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Navigation -->
  <header class="top-navbar">
    <div class="brand-section">
      <div class="brand-logo-badge">SKYLINE</div>
      <div>
        <div class="brand-title">HỆ THỐNG GIÁO DỤC SKYLINE</div>
        <div class="brand-subtitle">Ban Kiểm Tra & Đảm Bảo Chất Lượng Giáo Dục</div>
      </div>
    </div>
    <div class="action-buttons">
      <button class="btn btn-outline" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">⬆ Đầu trang</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 In Báo Cáo / Xuất PDF</button>
    </div>
  </header>

  <!-- Quick Anchors Nav -->
  <nav class="quick-nav">
    <a href="#kpi-section" class="nav-chip active">📊 Chỉ số KPIs</a>
    <a href="#sec-ph-n-1" class="nav-chip">1. Kế hoạch BGH</a>
    <a href="#sec-ph-n-2" class="nav-chip">2. Tổng quan Khảo sát</a>
    <a href="#sec-ph-n-3" class="nav-chip">3. Chi tiết 3 Bậc học</a>
    <a href="#sec-ph-n-4" class="nav-chip">4. Chuyên đề 76 HS CKĐV</a>
    <a href="#sec-ph-n-5" class="nav-chip">5. Kế hoạch Can thiệp 10 Tuần</a>
  </nav>

  <main class="report-wrapper">

    <!-- Hero Banner -->
    <section class="hero-banner">
      <span class="hero-tag">CSDL CHUẨN XÁC HỆ THỐNG SSM • NĂM HỌC 2026 - 2027</span>
      <h1 class="hero-title">BÁO CÁO KỲ KHẢO SÁT ĐẦU NĂM (KSĐN)<br>& TIẾN ĐỘ 76 HỌC SINH CAM KẾT ĐẦU VÀO ĐÃ NHẬP HỌC</h1>
      <p class="hero-subtitle">
        Báo cáo độc lập từ hệ thống Quản lý Khảo sát SSM, theo dõi chất lượng toàn diện của 1.699 học sinh từ Khối 2 đến Khối 12 tại 5 cơ sở trường, đối sánh chi tiết 76 học sinh diện Cam kết đầu vào (CKĐV) đã nhập học và kế hoạch hành động phân tầng.
      </p>
      <div class="hero-meta">
        <div class="hero-meta-item">📅 Thời gian khảo sát: <strong>Đầu năm 2026 - 2027</strong></div>
        <div class="hero-meta-item">🏫 Cơ sở khảo sát: <strong>CS1, CS2, CS3, CS4, CS5</strong></div>
        <div class="hero-meta-item">🎯 Đối tượng: <strong>Khối 2 đến Khối 12</strong></div>
        <div class="hero-meta-item">📊 Trạng thái dữ liệu: <strong>100% Khớp CSDL SSM</strong></div>
      </div>
    </section>

    <!-- KPI Metric Cards -->
    <section class="kpi-grid" id="kpi-section">
      <div class="kpi-card">
        <div class="kpi-label">Tổng Học Sinh Khảo Sát</div>
        <div class="kpi-number">1.699</div>
        <div class="kpi-subtext">Khối 2 - 12 (5 cơ sở trường)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tổng Lượt Bài Thi Nhập Điểm</div>
        <div class="kpi-number">5.227</div>
        <div class="kpi-subtext">Toán, Tiếng Việt, Văn, Anh, ESL...</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">Đạt Chuẩn Tiểu Học (≥ 7.0)</div>
        <div class="kpi-number">89.0%</div>
        <div class="kpi-subtext">2.335 / 2.624 lượt (Giỏi 76.3%)</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">Đạt Chuẩn THCS (≥ 5.0)</div>
        <div class="kpi-number">85.2%</div>
        <div class="kpi-subtext">1.785 / 2.095 lượt (Giỏi 40.0%)</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-label">Đạt Chuẩn THPT (≥ 5.0)</div>
        <div class="kpi-number">65.7%</div>
        <div class="kpi-subtext">334 / 508 lượt (Dưới TB 34.3%)</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-label">HS CKĐV Đã Nhập Học</div>
        <div class="kpi-number">76 <span style="font-size:16px; font-weight:600; color:#6b7280;">(26.0%)</span></div>
        <div class="kpi-subtext">Đúng 76 / 292 HS tuyển mới nhập học</div>
      </div>
    </section>

    <!-- Dynamic Charts Section -->
    <section class="charts-grid">
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">📈 Tỷ Lệ Đạt Chuẩn & Phân Hóa Chất Lượng Theo 3 Bậc Học</div>
          <span style="font-size:12px; color:#64748b;">Nguồn: SSM Grade Analytics</span>
        </div>
        <div style="height: 250px;">
          <canvas id="levelComparisonChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">🏫 Phân Bổ 76 Học Sinh CKĐV Theo 5 Cơ Sở</div>
          <span style="font-size:12px; color:#64748b;">Tổng: 76 HS</span>
        </div>
        <div style="height: 250px;">
          <canvas id="campusCkdvChart"></canvas>
        </div>
      </div>
    </section>

    <!-- Main Content rendered from markdown -->
    <article class="report-content">
      ${fullBodyHtml}
    </article>

    <!-- Footer -->
    <footer class="report-footer">
      <p><strong>HỆ THỐNG GIÁO DỤC SKYLINE • BAN KIỂM TRA & ĐẢM BẢO CHẤT LƯỢNG (KT&ĐBCL)</strong></p>
      <p style="margin-top: 4px; color: #94a3b8;">Hệ thống Quản lý Khảo sát SSM • Báo cáo tự động trích xuất từ CSDL Ngày 29/09/2026</p>
    </footer>

  </main>

  <script>
    // Initialize Mermaid Diagrams
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });

    // Level Comparison Chart
    const ctxLevel = document.getElementById('levelComparisonChart').getContext('2d');
    new Chart(ctxLevel, {
      type: 'bar',
      data: {
        labels: ['Tiểu học (Chuẩn ≥ 7.0)', 'THCS (Chuẩn ≥ 5.0)', 'THPT (Chuẩn ≥ 5.0)'],
        datasets: [
          {
            label: 'Đạt chuẩn (%)',
            data: [89.0, 85.2, 65.7],
            backgroundColor: '#059669',
            borderRadius: 6
          },
          {
            label: 'Giỏi 8-10 (%)',
            data: [76.3, 40.0, 15.0],
            backgroundColor: '#2563eb',
            borderRadius: 6
          },
          {
            label: 'Dưới Trung Bình < 5.0 (%)',
            data: [2.0, 14.8, 34.3],
            backgroundColor: '#dc2626',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: v => v + '%' }
          }
        },
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // Campus CKDV Chart
    const ctxCampus = document.getElementById('campusCkdvChart').getContext('2d');
    new Chart(ctxCampus, {
      type: 'doughnut',
      data: {
        labels: ['CS1 (36 HS)', 'CS2 (8 HS)', 'CS3 (8 HS)', 'CS4 (12 HS)', 'CS5 (12 HS)'],
        datasets: [{
          data: [36, 8, 8, 12, 12],
          backgroundColor: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });

    // Dynamic Filter for Section 4 CKDV tables
    document.addEventListener("DOMContentLoaded", () => {
      // Add search bar above the CKDV tables
      const sec4Heading = document.getElementById('sec-ph-n-4');
      if (sec4Heading) {
        const filterBox = document.createElement('div');
        filterBox.className = 'filter-bar';
        filterBox.innerHTML = \`
          <div class="filter-tabs">
            <button class="filter-tab active" onclick="filterCampus('all', this)">Tất cả (76 HS)</button>
            <button class="filter-tab" onclick="filterCampus('CS1', this)">CS1 (36)</button>
            <button class="filter-tab" onclick="filterCampus('CS2', this)">CS2 (8)</button>
            <button class="filter-tab" onclick="filterCampus('CS3', this)">CS3 (8)</button>
            <button class="filter-tab" onclick="filterCampus('CS4', this)">CS4 (12)</button>
            <button class="filter-tab" onclick="filterCampus('CS5', this)">CS5 (12)</button>
          </div>
          <div class="search-box">
            <span>🔍&nbsp;</span>
            <input type="text" id="ckdvSearchInput" placeholder="Tìm tên học sinh, môn CKĐV, lớp..." onkeyup="searchStudent()">
          </div>
        \`;
        sec4Heading.parentNode.insertBefore(filterBox, sec4Heading.nextSibling);
      }
    });

    function filterCampus(campus, btn) {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const headings = document.querySelectorAll('.sub-sub-section-title');
      headings.forEach(h => {
        if (!h.textContent.includes('CƠ SỞ CS')) return;
        const table = h.nextElementSibling;
        if (!table) return;

        if (campus === 'all') {
          h.style.display = '';
          table.style.display = '';
        } else if (h.textContent.includes(campus)) {
          h.style.display = '';
          table.style.display = '';
        } else {
          h.style.display = 'none';
          table.style.display = 'none';
        }
      });
    }

    function searchStudent() {
      const query = document.getElementById('ckdvSearchInput').value.toLowerCase();
      const tables = document.querySelectorAll('.table-container table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          if (row.classList.contains('total-row')) return;
          const text = row.textContent.toLowerCase();
          if (text.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = query === '' ? '' : 'none';
          }
        });
      });
    }
  </script>
</body>
</html>`;

const outPath = 'd:\\SSM\\skyline-survey\\bao_cao_ksdn_va_ckdv_2026.html';
fs.writeFileSync(outPath, completeHtml, 'utf8');
console.log("Successfully wrote standalone executive HTML report to:", outPath);
