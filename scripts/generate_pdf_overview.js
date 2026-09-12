const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
  console.log("Starting Puppeteer PDF export with enriched pillars...");
  
  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.42;
      font-size: 10.5pt;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 18mm;
      margin: 0 auto;
      page-break-after: always;
      position: relative;
      background: #ffffff;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .header-banner {
      border-bottom: 2.5px solid #007A72;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-title {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 2px;
      color: #007A72;
      text-transform: uppercase;
    }

    .doc-title {
      font-size: 16.5pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      line-height: 1.15;
      margin-top: 3px;
    }

    .doc-subtitle {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-year {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #007A72;
      padding: 5px 10px;
      border-radius: 8px;
      text-align: right;
      font-size: 8pt;
      font-weight: 700;
    }

    .section-title {
      font-size: 9.5pt;
      font-weight: 900;
      color: #003B3A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-left: 3.5px solid #007A72;
      padding-left: 7px;
      margin-bottom: 8px;
      margin-top: 12px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }

    .card-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 4px;
    }

    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      font-size: 7.5pt;
      text-transform: uppercase;
    }

    .highlight-box {
      background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%);
      border: 1px solid #99f6e4;
      border-radius: 10px;
      padding: 10px 14px;
      margin: 8px 0;
    }

    .footer {
      position: absolute;
      bottom: 10mm;
      left: 18mm;
      right: 18mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      text-align: center;
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
    }

    .sig-role {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .sig-name {
      margin-top: 40px;
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: VÒNG ĐỜI K-12, KHẢO SÁT & TÂM LÝ ==================== -->
  <div class="page">
    <div class="header-banner">
      <div>
        <div class="brand-title">HỆ THỐNG GIÁO DỤC SKY-LINE • SQMS V5.0</div>
        <div class="doc-title">HỒ SƠ HỌC SINH & BẢN ĐỒ NĂNG LỰC 360°</div>
        <div class="doc-subtitle">HÀNH TRÌNH TÍCH LŨY K-12 • TỪ KHI NHẬP HỌC ĐẾN TỐT NGHIỆP THPT</div>
      </div>
      <div class="badge-year">
        <div>Năm học: 2025-2026</div>
        <div style="font-size: 7pt; color: #64748b;">Học bạ Điện tử Tích lũy</div>
      </div>
    </div>

    <div class="highlight-box">
      <div style="font-size: 7.5pt; font-weight: 800; color: #007A72; text-transform: uppercase;">THÔNG ĐIỆP SƯ PHẠM TOÀN DIỆN K-12</div>
      <div style="font-size: 10.5pt; font-weight: 800; color: #003B3A; margin-top: 2px;">"Không để học sinh nào bị bỏ lại phía sau – Bứt phá tối đa năng lực cá nhân"</div>
      <div style="font-size: 8pt; color: #334155; margin-top: 3px; line-height: 1.45;">
        Hồ sơ 360° theo sát học sinh suốt 12-15 năm, kết nối chặt chẽ giữa <strong>Khảo sát Tuyển sinh đầu vào</strong>, <strong>Theo dõi Sức khỏe Tâm lý</strong>, <strong>Phụ đạo & Bồi dưỡng Văn hóa</strong>, và <strong>Chứng chỉ Quốc tế (IELTS & MOS)</strong>.
      </div>
    </div>

    <div class="section-title">1. KHẢO SÁT TUYỂN SINH ĐẦU VÀO (BASELINE DIAGNOSTIC)</div>
    <div class="grid-3">
      <div class="card">
        <div class="card-title">Mầm Non (Preschool)</div>
        <p style="font-size: 7.5pt; color: #64748b; line-height: 1.35;">
          Đánh giá 5 lĩnh vực: Thể chất, Nhận thức, Ngôn ngữ, Xã hội, Thẩm mỹ; theo dõi giai đoạn học thử làm quen trường lớp.
        </p>
      </div>
      <div class="card">
        <div class="card-title">Tiểu Học (Lớp 1 - 5)</div>
        <p style="font-size: 7.5pt; color: #64748b; line-height: 1.35;">
          Khảo sát tư duy Toán học, ngôn ngữ Tiếng Việt và phỏng vấn Tiếng Anh 1-1 với giáo viên nước ngoài.
        </p>
      </div>
      <div class="card">
        <div class="card-title">THCS & THPT (Lớp 6 - 12)</div>
        <p style="font-size: 7.5pt; color: #64748b; line-height: 1.35;">
          Khảo sát Toán tư duy, Ngữ văn đọc hiểu & viết luận, kiểm tra 4 kỹ năng Tiếng Anh xếp lớp Cambridge/IELTS.
        </p>
      </div>
    </div>

    <div class="section-title">2. CHĂM SÓC TÂM LÝ HỌC ĐƯỜNG & HỖ TRỢ HỌC TẬP SUỐT K-12</div>
    <div class="grid-2">
      <div class="card" style="border-left: 3px solid #e11d48;">
        <div class="card-title">Theo Dõi Sức Khỏe Tâm Lý (3 Tầng)</div>
        <div style="font-size: 7.5pt; color: #475569; line-height: 1.4;">
          • 🟢 <strong>Xanh (Ổn định)</strong>: 100% học sinh được rèn luyện Kỹ năng cảm xúc xã hội (SEL).<br>
          • 🟡 <strong>Vàng (Cần lưu ý)</strong>: Đồng hành khủng hoảng dậy thì, giảm áp lực thi cử.<br>
          • 🔴 <strong>Đỏ (Báo động SOS)</strong>: Tham vấn 1-1 cùng chuyên gia tâm lý học đường.
        </div>
      </div>
      <div class="card" style="border-left: 3px solid #0284c7;">
        <div class="card-title">Hỗ Trợ Học Tập & Bồi Dưỡng</div>
        <div style="font-size: 7.5pt; color: #475569; line-height: 1.4;">
          • <strong>Phụ đạo văn hóa 1-1</strong>: Kèm cặp học sinh hổng kiến thức Toán, Văn, Anh, KHTN.<br>
          • <strong>Bồi dưỡng mũi nhọn</strong>: Đội tuyển Olympic Toán, KHKT, STEM Robotics, Hùng biện.<br>
          • Đánh giá tiến độ hàng tháng và bàn giao hồ sơ chuyển cấp bảo mật.
        </div>
      </div>
    </div>

    <div class="footer">
      <span>HỆ THỐNG GIÁO DỤC SKY-LINE • TRANG 1/3</span>
      <span>HỒ SƠ HỌC SINH TOÀN DIỆN K-12</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: CHUẨN ĐẦU RA TIẾNG ANH & ICT QUỐC TẾ ==================== -->
  <div class="page">
    <div class="header-banner">
      <div>
        <div class="brand-title">HỆ THỐNG GIÁO DỤC SKY-LINE • SQMS V5.0</div>
        <div class="doc-title">CHUẨN ĐẦU RA TIẾNG ANH & TIN HỌC / ICT QUỐC TẾ</div>
        <div class="doc-subtitle">LỘ TRÌNH TÍCH LŨY CHỨNG CHỈ QUỐC TẾ TỪ TIỂU HỌC ĐẾN THPT</div>
      </div>
      <div class="badge-year">
        <div>Chuẩn Khung CEFR</div>
        <div style="font-size: 7pt; color: #64748b;">Certiport & Cambridge</div>
      </div>
    </div>

    <div class="section-title">1. LỘ TRÌNH CHUẨN ĐẦU RA TIẾNG ANH (CAMBRIDGE & IELTS)</div>
    <table>
      <thead>
        <tr>
          <th>Cấp học</th>
          <th>Khối lớp</th>
          <th>Chứng chỉ Mục tiêu</th>
          <th>Quy đổi CEFR / IELTS</th>
          <th>Lợi thế & Giá trị Công nhận</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tiểu học</strong></td>
          <td>Lớp 3</td>
          <td>Cambridge Starters</td>
          <td>Pre-A1 (10 - 15 Khiên)</td>
          <td>Hình thành phản xạ giao tiếp tự nhiên</td>
        </tr>
        <tr>
          <td><strong>Tiểu học</strong></td>
          <td>Lớp 4</td>
          <td>Cambridge Movers</td>
          <td>A1 (12 - 15 Khiên)</td>
          <td>Tự tin giao tiếp chủ đề đời sống</td>
        </tr>
        <tr style="background: #f0fdfa;">
          <td><strong>Tiểu học</strong></td>
          <td><strong>Lớp 5 (Tốt nghiệp)</strong></td>
          <td><strong>Cambridge Flyers</strong></td>
          <td><strong>A2 CEFR (~ IELTS 4.0)</strong></td>
          <td>Nền tảng từ vựng vững chắc chuyển cấp 2</td>
        </tr>
        <tr>
          <td><strong>THCS</strong></td>
          <td>Lớp 7</td>
          <td>Cambridge KET</td>
          <td>A2 CEFR (~ IELTS 4.5)</td>
          <td>Đọc hiểu tài liệu & thuyết trình cơ bản</td>
        </tr>
        <tr style="background: #f0fdfa;">
          <td><strong>THCS</strong></td>
          <td><strong>Lớp 9 (Tốt nghiệp)</strong></td>
          <td><strong>Cambridge PET</strong></td>
          <td><strong>B1 CEFR (~ IELTS 5.0 - 5.5)</strong></td>
          <td>Đạt chuẩn tuyển sinh trường THPT chất lượng cao</td>
        </tr>
        <tr>
          <td><strong>THPT</strong></td>
          <td>Lớp 10 - 11</td>
          <td>IELTS Foundation</td>
          <td>IELTS 6.0 - 6.5</td>
          <td>Viết luận học thuật & nghiên cứu</td>
        </tr>
        <tr style="background: #ecfdf5; font-weight: 800;">
          <td><strong>THPT</strong></td>
          <td><strong>Lớp 12 (Tốt nghiệp)</strong></td>
          <td style="color: #007A72;">IELTS Academic / SAT</td>
          <td style="color: #007A72;">IELTS 6.5 - 7.5 - 8.0+</td>
          <td>Miễn thi Tốt nghiệp THPT; Tuyển thẳng ĐH & Săn học bổng</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title" style="margin-top: 14px;">2. LỘ TRÌNH CHUẨN ĐẦU RA TIN HỌC / KỸ NĂNG SỐ (IC3 & MOS)</div>
    <table>
      <thead>
        <tr>
          <th>Cấp học</th>
          <th>Khối lớp</th>
          <th>Chứng chỉ Quốc tế</th>
          <th>Năng lực Đạt được</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tiểu học</strong></td>
          <td>Lớp 3 - 5</td>
          <td><strong>IC3 Spark Quốc tế</strong></td>
          <td>Sử dụng máy tính thành thạo, soạn thảo văn bản, an toàn Internet cho trẻ em.</td>
        </tr>
        <tr>
          <td><strong>THCS</strong></td>
          <td>Lớp 6 - 9</td>
          <td><strong>IC3 GS6 (Level 1, 2, 3)</strong></td>
          <td>Điện toán đám mây, an ninh mạng, tư duy thuật toán và lập trình căn bản.</td>
        </tr>
        <tr style="background: #faf5ff; font-weight: 800;">
          <td><strong>THPT</strong></td>
          <td><strong>Lớp 10 - 12</strong></td>
          <td style="color: #7e22ce;">MOS (Word, Excel, PPT, Master) & AI</td>
          <td>Tin học văn phòng quốc tế; lập trình Robotics, STEM và ứng dụng Trí tuệ nhân tạo (AI Literacy).</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title" style="margin-top: 14px;">3. TỔNG HỢP 7 TRỤ CỘT TRONG BẢN IN HỌC BẠ A4</div>
    <div class="grid-2" style="font-size: 7.5pt; line-height: 1.35;">
      <div>• <strong>I. Thông tin Hành chính & Thẻ ảnh</strong>: Mã số học sinh, lớp, cơ sở.</div>
      <div>• <strong>II. Cố vấn SMART & Tâm lý K-12</strong>: Cam kết rèn luyện, cảnh báo rèn luyện.</div>
      <div>• <strong>III. Năng lực Radar 360°</strong>: Đo lường đa giác, mốc chuẩn khối 75%.</div>
      <div>• <strong>IV. Điểm MOET & Đầu vào</strong>: Điểm số, nhận xét GVBM, khảo sát đầu vào.</div>
      <div>• <strong>V. Thành tích Khen thưởng</strong>: Olympic, KHKT, STEM các cấp.</div>
      <div>• <strong>VI. Ngoại khóa 4 Mạch</strong>: Bản thân, Xã hội, Tự nhiên, Hướng nghiệp.</div>
      <div style="grid-column: span 2;">• <strong>VII. Hướng nghiệp & Xác thực 3 Bên</strong>: Khảo sát nghề nghiệp, lời dặn GVCN và chữ ký duyệt của Ban Giám Hiệu.</div>
    </div>

    <div class="footer">
      <span>HỆ THỐNG GIÁO DỤC SKY-LINE • TRANG 2/3</span>
      <span>CHUẨN ĐẦU RA QUỐC TẾ TIẾNG ANH & ICT</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: BẢN MẪU A4 PORTFOLIO THỰC TẾ ==================== -->
  <div class="page">
    <div class="header-banner" style="margin-bottom: 8px; padding-bottom: 6px;">
      <div>
        <div class="brand-title">HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ CHÍNH THỨC</div>
        <div style="font-size: 14pt; font-weight: 900; color: #003B3A; text-transform: uppercase;">
          HỒ SƠ HỌC SINH TOÀN DIỆN & NĂNG LỰC 360°
        </div>
        <div class="doc-subtitle">STUDENT COMPREHENSIVE PROFILE & 360° PORTFOLIO</div>
      </div>
      <div class="badge-year" style="padding: 3px 8px;">
        <div style="font-weight: 800;">Năm học: 2025-2026</div>
        <div style="font-size: 7pt; color: #64748b;">Sky-Line Riverside</div>
      </div>
    </div>

    <!-- I. Thẻ học sinh mẫu -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; display: flex; gap: 12px; align-items: center;">
      <div style="width: 55px; height: 55px; border-radius: 8px; background: #003B3A; color: white; display: flex; align-items: center; justify-content: center; font-size: 16pt; font-weight: 900; flex-shrink: 0;">
        MA
      </div>
      <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 4px; width: 100%; font-size: 7.5pt;">
        <div>Họ và tên: <strong style="font-size: 8.5pt; color: #003B3A;">NGUYỄN MINH ANH</strong></div>
        <div>Mã HS: <strong style="color: #007A72;">SKL-2025-089</strong></div>
        <div>Lớp: <strong>10.1 (K-12)</strong></div>
        <div>Ngày sinh: <strong>15/04/2010</strong></div>
        <div>Giới tính: <strong>Nữ</strong></div>
        <div>GVCN: <strong style="color: #007A72;">Trần Thị Mai Phương</strong></div>
      </div>
    </div>

    <!-- Khảo sát đầu vào & Chuẩn quốc tế -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 7.5pt;">
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 5px 8px;">
        <span style="color: #1e40af; font-weight: 800; text-transform: uppercase;">Khảo Sát Tuyển Sinh Đầu Vào:</span><br>
        Toán tư duy: <strong>9.0</strong> • Tiếng Anh 4 kỹ năng: <strong>9.5</strong> (Trúng tuyển xuất sắc)
      </div>
      <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 5px 8px;">
        <span style="color: #6b21a8; font-weight: 800; text-transform: uppercase;">Chuẩn Quốc Tế Tích Lũy:</span><br>
        IELTS Academic: <strong style="color: #7e22ce;">7.0</strong> (Mục tiêu 8.0) • Tin học: <strong>MOS Word, Excel</strong>
      </div>
    </div>

    <!-- II. Năng lực Radar -->
    <div style="margin-top: 8px;">
      <div style="font-size: 8pt; font-weight: 800; color: #007A72; text-transform: uppercase; border-bottom: 1.5px solid #007A72; padding-bottom: 2px;">
        ĐÁNH GIÁ NĂNG LỰC CHUYÊN SÂU 360° (ĐIỂM TỔNG QUAN: 88% - XẾP LOẠI TỐT)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; align-items: center;">
        <!-- SVG Radar Chart -->
        <div style="text-align: center;">
          <svg width="170" height="140" viewBox="0 0 200 180" style="margin: 0 auto; display: block;">
            <polygon points="100,20 170,55 170,125 100,160 30,125 30,55" fill="none" stroke="#e2e8f0" stroke-width="1"/>
            <polygon points="100,42 147,65 147,112 100,135 53,112 53,65" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,3"/>
            <polygon points="100,42 152,68 152,118 100,145 48,118 48,68" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,4"/>
            <polygon points="100,28 162,60 156,120 100,150 42,122 40,58" fill="rgba(0,122,114,0.25)" stroke="#007A72" stroke-width="2"/>
            <text x="100" y="14" font-size="8" font-weight="bold" fill="#475569" text-anchor="middle">Logic (94%)</text>
            <text x="175" y="60" font-size="8" font-weight="bold" fill="#475569" text-anchor="start">Giải quyết VĐ (90%)</text>
            <text x="175" y="125" font-size="8" font-weight="bold" fill="#475569" text-anchor="start">Ngôn ngữ (88%)</text>
            <text x="100" y="172" font-size="8" font-weight="bold" fill="#475569" text-anchor="middle">Sáng tạo (85%)</text>
            <text x="25" y="125" font-size="8" font-weight="bold" fill="#475569" text-anchor="end">Nhóm (84%)</text>
            <text x="25" y="60" font-size="8" font-weight="bold" fill="#475569" text-anchor="end">Tự chủ (87%)</text>
          </svg>
          <div style="font-size: 7pt; color: #64748b; font-weight: 700;">
            ■ Học sinh (88%) &nbsp;&nbsp; ┈ Chuẩn khối (75%)
          </div>
        </div>
        <!-- Điểm mạnh & Cần rèn luyện -->
        <div style="font-size: 7.5pt;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 5px 8px; margin-bottom: 5px;">
            <span style="color: #15803d; font-weight: 800; font-size: 7pt; text-transform: uppercase;">🌟 ĐIỂM MẠNH NHẤT:</span><br>
            <strong>Tư duy Logic & Giải quyết vấn đề (94%)</strong>
          </div>
          <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 5px 8px; margin-bottom: 5px;">
            <span style="color: #a16207; font-weight: 800; font-size: 7pt; text-transform: uppercase;">🌱 VÙNG CẦN RÈN LUYỆN:</span><br>
            <strong>Thuyết trình trước đám đông (78%)</strong>
          </div>
          <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 5px 8px;">
            <span style="color: #0f766e; font-weight: 800; font-size: 7pt; text-transform: uppercase;">💚 TÂM LÝ HỌC ĐƯỜNG:</span><br>
            Chỉ số rèn luyện: <strong>Ổn định (GREEN)</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- III. Điểm MOET & Khen thưởng -->
    <div style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 8px; margin-top: 8px;">
      <div>
        <div style="font-size: 8pt; font-weight: 800; color: #007A72; text-transform: uppercase; border-bottom: 1.5px solid #007A72; padding-bottom: 1px;">
          KẾT QUẢ HỌC THUẬT VĂN HÓA (MOET)
        </div>
        <table style="font-size: 7.5pt;">
          <thead>
            <tr><th>Môn học</th><th style="text-align: center;">Điểm TB</th><th>Nhận xét GVBM</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Toán học</strong></td><td style="text-align: center; font-weight: 800; color: #007A72;">9.2</td><td>Tư duy sắc sảo, xuất sắc</td></tr>
            <tr><td><strong>Ngữ văn</strong></td><td style="text-align: center; font-weight: 800; color: #007A72;">8.6</td><td>Hành văn lưu loát, lập luận chặt chẽ</td></tr>
            <tr><td><strong>Tiếng Anh</strong></td><td style="text-align: center; font-weight: 800; color: #007A72;">9.5</td><td>Phát âm chuẩn bản ngữ</td></tr>
          </tbody>
        </table>
      </div>

      <div>
        <div style="font-size: 8pt; font-weight: 800; color: #007A72; text-transform: uppercase; border-bottom: 1.5px solid #007A72; padding-bottom: 1px;">
          THÀNH TÍCH & NGOẠI KHÓA 4 MẠCH
        </div>
        <div style="font-size: 7.5pt; margin-top: 3px; line-height: 1.35;">
          • <strong>Huy chương Vàng Olympic Toán Quốc tế (SEAMO)</strong><br>
          • <strong>Giải Nhì Sáng tạo Robot / STEM Cấp TP</strong><br>
          • Dự án "Rừng Xanh Cho Tương Lai": Trưởng nhóm (Xuất sắc)<br>
          • Chiến dịch "Áo Ấm Mùa Đông": Ban tổ chức (Xuất sắc)
        </div>
      </div>
    </div>

    <!-- IV. Lời dặn GVCN & Chữ ký 3 bên -->
    <div style="margin-top: 8px;">
      <div style="font-size: 8pt; font-weight: 800; color: #007A72; text-transform: uppercase; border-bottom: 1.5px solid #007A72; padding-bottom: 1px;">
        NHẬN XÉT CỦA GVCN & XÁC NHẬN PHÊ DUYỆT 3 BÊN
      </div>
      <div style="background: #f0fdfa; border-left: 3px solid #007A72; padding: 5px 8px; font-size: 7.5pt; font-style: italic; margin-top: 3px; line-height: 1.35;">
        "Minh Anh là học sinh ưu tú, gương mẫu, có tư duy phản biện xuất sắc và năng lực lãnh đạo nổi bật. Em luôn hòa đồng, lễ phép và có định hướng nghề nghiệp rất rõ ràng."
      </div>
      <div class="signature-grid" style="margin-top: 10px; padding-top: 4px;">
        <div>
          <div class="sig-role">Học sinh xác nhận</div>
          <div class="sig-name" style="margin-top: 28px;">Nguyễn Minh Anh</div>
        </div>
        <div>
          <div class="sig-role">Giáo viên Chủ nhiệm</div>
          <div class="sig-name" style="margin-top: 28px; color: #007A72;">Trần Thị Mai Phương</div>
        </div>
        <div>
          <div class="sig-role">Ban Giám Hiệu Phê Duyệt</div>
          <div class="sig-name" style="margin-top: 28px;">Hiệu trưởng / Giám đốc Cơ sở</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>HỆ THỐNG GIÁO DỤC SKY-LINE • TRANG 3/3</span>
      <span>HỒ SƠ LƯU TRỮ HỌC BẠ ĐIỆN TỬ CHÍNH THỨC</span>
    </div>
  </div>

</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const outDocPath = path.join(__dirname, '../docs/TONG_QUAN_HO_SO_HOC_SINH_SKYLINE.pdf');
  const outPublicPath = path.join(__dirname, '../public/TONG_QUAN_HO_SO_HOC_SINH_SKYLINE.pdf');
  const outArtifactPath = "C:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\06e67f3a-f756-462f-80aa-52ffa7f02463\\TONG_QUAN_HO_SO_HOC_SINH_SKYLINE.pdf";

  await page.pdf({
    path: outDocPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });
  console.log("PDF saved to:", outDocPath);

  try {
    fs.copyFileSync(outDocPath, outPublicPath);
    console.log("PDF copied to:", outPublicPath);
  } catch (e) {
    console.error("Public copy err:", e.message);
  }

  try {
    fs.copyFileSync(outDocPath, outArtifactPath);
    console.log("PDF copied to:", outArtifactPath);
  } catch (e) {
    console.error("Artifact copy err:", e.message);
  }

  await browser.close();
  console.log("ENRICHED PDF GENERATION FINISHED SUCCESSFULLY!");
}

generatePDF().catch(err => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
