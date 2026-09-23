import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateClassHealthMatrix } from "@/services/ai/analytics/healthIndexEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "CLASS_ACADEMIC_REPORT";
    const targetId = searchParams.get("id") || "";

    const timestamp = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    // 1. CLASS ACADEMIC REPORT
    if (reportType === "CLASS_ACADEMIC_REPORT") {
      const cls = await prisma.class.findUnique({
        where: { id: targetId },
        include: {
          campus: true,
          students: {
            where: { status: "ACTIVE" },
            include: {
              subjectGradeEntries: { include: { subject: true } }
            }
          }
        }
      });

      if (!cls) {
        return new NextResponse("<h1>Không tìm thấy thông tin lớp học.</h1>", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      const totalStudents = cls.students.length;
      let totalScoresCount = 0;
      let sumScores = 0;
      let aboveBenchmark = 0;
      const studentRows = cls.students.map((st, idx) => {
        const scores = st.subjectGradeEntries
          .map(g => g.compositeScore)
          .filter((s): s is number => typeof s === "number" && !isNaN(s));
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        if (avg !== null) {
          sumScores += avg;
          totalScoresCount++;
          if (avg >= 7.0) aboveBenchmark++;
        }
        return {
          idx: idx + 1,
          code: st.studentCode,
          name: st.studentName,
          scoresCount: scores.length,
          avg: avg !== null ? avg.toFixed(2) : "—",
          status: avg !== null ? (avg >= 7.0 ? "Đạt chuẩn" : "Dưới chuẩn") : "Chưa đủ điểm",
          isWarning: avg !== null && avg < 7.0
        };
      });

      const classAvg = totalScoresCount > 0 ? (sumScores / totalScoresCount).toFixed(2) : "0.00";
      const passRate = totalScoresCount > 0 ? Math.round((aboveBenchmark / totalScoresCount) * 100) : 0;

      const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Phổ Điểm Lớp ${cls.className} — Sky-Line Education</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #003B3A;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748B;
      margin-top: 2px;
    }
    .doc-badge {
      background: #E6F4F1;
      color: #005F56;
      border: 1px solid #A3D9D2;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-align: right;
    }
    .report-title {
      text-align: center;
      font-size: 22px;
      font-weight: 800;
      color: #0A2540;
      margin: 16px 0 6px 0;
      text-transform: uppercase;
    }
    .report-subtitle {
      text-align: center;
      font-size: 13px;
      color: #64748B;
      margin-bottom: 24px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #003B3A;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748B;
      margin-top: 4px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 12px;
    }
    th {
      background: #003B3A;
      color: #FFFFFF;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #002828;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
    }
    tr:nth-child(even) {
      background: #F8FAFC;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .badge-success { background: #DCFCE7; color: #15803D; }
    .badge-danger { background: #FEE2E2; color: #B91C1C; }
    .footer-signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      text-align: center;
      page-break-inside: avoid;
    }
    .sign-box {
      margin-top: 60px;
      font-weight: 700;
      font-size: 13px;
    }
    .print-bar {
      background: #003B3A;
      color: white;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -24px -24px 24px -24px;
    }
    .print-btn {
      background: #48BFE3;
      color: #002828;
      border: none;
      padding: 8px 18px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div><strong>HỆ THỐNG GIÁO DỤC SKY-LINE</strong> — SSM EXECUTIVE REPORT GENERATOR</div>
    <button class="print-btn" onclick="window.print()">🖨️ In Báo Cáo / Lưu PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">Hệ Thống Giáo Dục Sky-Line</div>
      <div class="brand-sub">Hệ Thống Quản Trị Chất Lượng SSM | Cơ sở: ${cls.campus?.campusName || "Toàn trường"}</div>
    </div>
    <div class="doc-badge">
      <div>MÃ TÀI LIỆU: SKY-EX-2026</div>
      <div>NGÀY LẬP: ${timestamp}</div>
    </div>
  </div>

  <div class="report-title">Báo Cáo Phân Tích Chất Lượng Học Tập</div>
  <div class="report-subtitle">TẬP THỂ LỚP: <strong>${cls.className}</strong> | KHỐI: ${cls.grade || "Chung"}</div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val">${totalStudents}</div>
      <div class="kpi-label">Tổng Sĩ Số</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${classAvg}</div>
      <div class="kpi-label">Điểm Trung Bình Lớp</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${passRate}%</div>
      <div class="kpi-label">Tỷ Lệ Đạt Benchmark</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalStudents - aboveBenchmark}</div>
      <div class="kpi-label">Học Sinh Cần Phụ Đạo</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">STT</th>
        <th style="width: 90px;">Mã HS</th>
        <th>Họ và Tên Học Sinh</th>
        <th style="width: 80px; text-align: center;">Số Môn</th>
        <th style="width: 80px; text-align: center;">ĐTB</th>
        <th style="width: 100px; text-align: center;">Chuẩn Benchmark</th>
      </tr>
    </thead>
    <tbody>
      ${studentRows.map(r => `
        <tr>
          <td style="text-align: center;">${r.idx}</td>
          <td><code>${r.code}</code></td>
          <td><strong>${r.name}</strong></td>
          <td style="text-align: center;">${r.scoresCount}</td>
          <td style="text-align: center; font-weight: 700; ${r.isWarning ? "color: #DC2626;" : "color: #005F56;"}">${r.avg}</td>
          <td style="text-align: center;">
            <span class="badge ${r.isWarning ? "badge-danger" : "badge-success"}">${r.status}</span>
          </td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer-signatures">
    <div>
      <p style="font-weight: 600; font-size: 12px;">GIÁO VIÊN CHỦ NHIỆM</p>
      <div class="sign-box">(Ký và ghi rõ họ tên)</div>
    </div>
    <div>
      <p style="font-weight: 600; font-size: 12px;">TỔ TRƯỞNG CHUYÊN MÔN</p>
      <div class="sign-box">(Ký và ghi rõ họ tên)</div>
    </div>
    <div>
      <p style="font-weight: 600; font-size: 12px;">BAN GIÁM HIỆU DUYỆT</p>
      <div class="sign-box">(Ký và đóng dấu)</div>
    </div>
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 2. HOLISTIC HEALTH AUDIT REPORT
    if (reportType === "HOLISTIC_HEALTH_AUDIT_REPORT") {
      const matrix = await calculateClassHealthMatrix(targetId);
      if (!matrix) {
        return new NextResponse("<h1>Không thể tính toán ma trận rủi ro lớp học.</h1>", {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }

      const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Kiểm Toán Rủi Ro EWS — Lớp ${matrix.className}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1E293B;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #003B3A;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title { font-size: 18px; font-weight: 800; color: #003B3A; text-transform: uppercase; }
    .report-title { text-align: center; font-size: 22px; font-weight: 800; color: #0A2540; text-transform: uppercase; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
    .kpi-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-val { font-size: 20px; font-weight: 800; }
    .kpi-label { font-size: 11px; font-weight: 600; color: #64748B; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
    th { background: #003B3A; color: white; padding: 8px; border: 1px solid #002828; text-align: left; }
    td { padding: 8px; border: 1px solid #E2E8F0; }
    .badge-green { background: #DCFCE7; color: #15803D; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-yellow { background: #FEF3C7; color: #B45309; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .badge-red { background: #FEE2E2; color: #B91C1C; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .print-bar { background: #003B3A; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; margin: -24px -24px 24px -24px; }
    .print-btn { background: #48BFE3; color: #002828; border: none; padding: 8px 18px; font-weight: 700; border-radius: 6px; cursor: pointer; }
    @media print { .print-bar { display: none !important; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <div><strong>HỆ THỐNG GIÁO DỤC SKY-LINE</strong> — EARLY WARNING SYSTEM (EWS) AUDIT</div>
    <button class="print-btn" onclick="window.print()">🖨️ In Báo Cáo / Lưu PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">Hệ Thống Giáo Dục Sky-Line</div>
      <div>Báo Cáo Sức Khỏe Học Tập Toàn Diện (HHI Matrix)</div>
    </div>
    <div style="text-align: right; font-size: 11px;">
      <div>THỜI ĐIỂM XUẤT: ${timestamp}</div>
      <div>LỚP: <strong>${matrix.className}</strong></div>
    </div>
  </div>

  <div class="report-title">Báo Cáo Rà Soát Sức Khỏe Học Tập & Cảnh Báo Sớm</div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-val" style="color: #003B3A;">${matrix.averageHHI} / 100</div>
      <div class="kpi-label">Điểm Sức Khỏe TB (HHI)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #15803D;">${matrix.distribution.greenCount} (${matrix.distribution.greenPercent}%)</div>
      <div class="kpi-label">🟢 Tự Chủ Tốt (Xanh)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #B45309;">${matrix.distribution.yellowCount} (${matrix.distribution.yellowPercent}%)</div>
      <div class="kpi-label">🟡 Cần Lưu Tâm (Vàng)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color: #B91C1C;">${matrix.distribution.redCount} (${matrix.distribution.redPercent}%)</div>
      <div class="kpi-label">🔴 Nguy Cơ Cao (Đỏ)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th style="width: 80px;">Mã HS</th>
        <th>Họ và Tên Học Sinh</th>
        <th style="width: 60px; text-align: center;">HHI</th>
        <th style="width: 90px; text-align: center;">Phân Loại</th>
        <th style="width: 70px; text-align: center;">Học Lực (40%)</th>
        <th style="width: 70px; text-align: center;">Mục Tiêu (25%)</th>
        <th style="width: 70px; text-align: center;">Rào Cản (20%)</th>
        <th>Phác Đồ Đề Xuất</th>
      </tr>
    </thead>
    <tbody>
      ${matrix.students.map((s, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><code>${s.studentCode}</code></td>
          <td><strong>${s.studentName}</strong></td>
          <td style="text-align: center; font-weight: 800;">${s.hhiScore}</td>
          <td style="text-align: center;">
            <span class="${s.tier === "GREEN" ? "badge-green" : s.tier === "YELLOW" ? "badge-yellow" : "badge-red"}">
              ${s.tier === "GREEN" ? "XANH" : s.tier === "YELLOW" ? "VÀNG" : "ĐỎ"}
            </span>
          </td>
          <td style="text-align: center;">${s.components.academicScore}</td>
          <td style="text-align: center;">${s.components.gapScore}</td>
          <td style="text-align: center;">${s.components.barrierScore}</td>
          <td style="font-size: 10px; color: #475569;">${s.insights.recommendedIntervention.replace(/\*\*/g, "")}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    return new NextResponse("<h1>Báo cáo đang được chuẩn bị.</h1>", {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (err: any) {
    console.error("Report Generator Error:", err);
    return new NextResponse(`<h1>Lỗi xuất báo cáo: ${err.message}</h1>`, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}
