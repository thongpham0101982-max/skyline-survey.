const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function genPdfs() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  const books = [
    {
      dir: 'tb_toan_8_tap_1_kntt',
      file: 'Toan_8_Tap_1_KNTT.pdf',
      title: 'TOÁN 8 - TẬP MỘT',
      series: 'BỘ SÁCH KẾT NỐI TRI THỨC VỚI CUỘC SỐNG',
      publisher: 'NHÀ XUẤT BẢN GIÁO DỤC VIỆT NAM',
      color: '#005a9c',
      pages: [
        { pageNum: 1, title: 'Lời nói đầu & Mục lục', content: '<h3>MỤC LỤC</h3><p><b>Chương I: Đa thức</b> (Trang 5)</p><p>Bài 1: Đơn thức nhiều biến (Trang 6)</p><p>Bài 2: Đa thức (Trang 10)</p><p><b>Chương II: Hằng đẳng thức đáng nhớ</b> (Trang 25)</p>' },
        { pageNum: 5, title: 'Chương I - Đa thức', content: '<h2>CHƯƠNG I: ĐA THỨC</h2><p>Kiến thức trọng tâm: Đơn thức, đa thức nhiều biến, các phép toán cộng, trừ, nhân, chia đa thức.</p>' },
        { pageNum: 6, title: 'Bài 1 - Đơn thức nhiều biến', content: '<h3>BÀI 1: ĐƠN THỨC NHIỀU BIẾN</h3><p><b>1. Khái niệm đơn thức:</b> Đơn thức là biểu thức đại số chỉ gồm một số, hoặc một biến, hoặc một tích giữa các số và các biến.</p><p><i>Ví dụ 1:</i> Các biểu thức 2x, -3xy^2, 1/2 x^2 y z là các đơn thức.</p>' },
        { pageNum: 10, title: 'Bài 2 - Đa thức', content: '<h3>BÀI 2: ĐA THỨC</h3><p><b>1. Đa thức là gì?</b> Đa thức là một tổng của những đơn thức. Mỗi đơn thức trong tổng gọi là một hạng tử của đa thức đó.</p>' },
        { pageNum: 25, title: 'Chương II - Hằng đẳng thức', content: '<h2>CHƯƠNG II: HẰNG ĐẲNG THỨC ĐÁNG NHỚ</h2><p>Bình phương của một tổng: (a + b)^2 = a^2 + 2ab + b^2</p><p>Bình phương của một hiệu: (a - b)^2 = a^2 - 2ab + b^2</p><p>Hiệu hai bình phương: a^2 - b^2 = (a - b)(a + b)</p>' }
      ]
    },
    {
      dir: 'tb_ngu_van_8_tap_1_ctst',
      file: 'Ngu_Van_8_Tap_1_CTST.pdf',
      title: 'NGỮ VĂN 8 - TẬP MỘT',
      series: 'BỘ SÁCH CHÂN TRỜI SÁNG TẠO',
      publisher: 'NHÀ XUẤT BẢN GIÁO DỤC VIỆT NAM',
      color: '#00838f',
      pages: [
        { pageNum: 1, title: 'Mục lục học kỳ I', content: '<h3>MỤC LỤC</h3><p>Bài 1: Những gương mặt thân yêu (Thơ sáu chữ, bảy chữ) (Trang 10)</p><p>Đọc: Gió lạnh đầu mùa (Thạch Lam) (Trang 12)</p><p>Tiếng Việt: Từ ngữ địa phương (Trang 20)</p>' },
        { pageNum: 10, title: 'Bài 1 - Những gương mặt thân yêu', content: '<h2>BÀI 1: NHỮNG GƯƠNG MẶT THÂN YÊU</h2><p><b>Yêu cầu cần đạt:</b> Nhận biết và phân tích được nét độc đáo của bài thơ thể hiện qua từ ngữ, hình ảnh, vần, nhịp, biện pháp tu từ.</p>' },
        { pageNum: 12, title: 'Đọc - Gió lạnh đầu mùa (Thạch Lam)', content: '<h3>ĐỌC VĂN BẢN: GIÓ LẠNH ĐẦU MÙA</h3><p><i>Tác giả: Thạch Lam</i></p><p>Buổi sáng hôm nay, mùa đông đột nhiên đến, không báo trước. Vừa mới ngày hôm qua, trời hãy còn nắng ấm và hanh, cái nắng về cuối tháng mười làm nứt nẻ đất ruộng...</p>' }
      ]
    }
  ];

  for (const b of books) {
    const page = await browser.newPage();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 0; }
      body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; padding: 0; background: #fff; }
      .sheet { width: 210mm; min-height: 297mm; page-break-after: always; box-sizing: border-box; padding: 30mm 25mm; display: flex; flex-direction: column; }
      .cover { background: ${b.color}; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .cover h1 { font-size: 30pt; margin: 15px 0; }
      .cover h3 { font-size: 14pt; opacity: 0.9; font-weight: normal; margin: 5px 0; }
      .header-bar { color: ${b.color}; font-size: 10pt; font-weight: bold; border-bottom: 2px solid ${b.color}; padding-bottom: 8px; margin-bottom: 20px; }
      .content { font-size: 12pt; line-height: 1.8; color: #222; }
      .footer { margin-top: auto; font-size: 10pt; color: #777; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; }
    </style></head><body>
      <div class="sheet cover">
        <h3>${b.publisher}</h3>
        <h1>${b.title}</h1>
        <h3>${b.series}</h3>
        <p style="margin-top: 60px; font-size: 11pt; opacity: 0.85;">Hệ thống Quản trị Học tập SSM Sky-Line</p>
      </div>
      ${b.pages.map((p) => `
        <div class="sheet">
          <div class="header-bar">${b.title} — ${p.title}</div>
          <div class="content">${p.content}</div>
          <div class="footer">Trang ${p.pageNum}</div>
        </div>
      `).join('')}
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    const outDir = path.join(process.cwd(), 'public', 'uploads', 'textbooks', b.dir);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, b.file);
    await page.pdf({ path: outPath, format: 'A4', printBackground: true });
    console.log('Generated real PDF:', outPath, 'Size:', fs.statSync(outPath).size);
    await page.close();
  }

  await browser.close();
  console.log('PDF Generation finished successfully!');
}

genPdfs().catch(e => {
  console.error('Gen PDF Error:', e);
  process.exit(1);
});
