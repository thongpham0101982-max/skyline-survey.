const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxPath = 'C:/Users/thongpn/Downloads/KHUNG CHƯƠNG TRÌNH QUẢN LÍ TÀI CHÍNH KHỐI TIỂU HỌC.docx';
const zipPath = path.resolve('temp_finance6.zip');
const tempDir = path.resolve('temp_docx6');

fs.copyFileSync(docxPath, zipPath);
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`);
const xml = fs.readFileSync(path.join(tempDir, 'word', 'document.xml'), 'utf-8');
fs.unlinkSync(zipPath);
fs.rmSync(tempDir, { recursive: true, force: true });

function extractText(xmlSnippet) {
  return (xmlSnippet.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
    .map(t => t.replace(/<[^>]+>/g, ''))
    .join('')
    .trim()
    .replace(/\s+/g, ' ');
}

// Split document by headings or paragraphs to see headings
const pRegex = /<w:p[\s\S]*?<\/w:p>/g;
const paragraphs = xml.match(pRegex) || [];
console.log('Total paragraphs:', paragraphs.length);

paragraphs.forEach((p, idx) => {
  const text = extractText(p);
  if (text.match(/khối|lớp|chương trình|mục tiêu|bảng/i) && text.length < 100) {
    console.log(`P[${idx}]: ${text}`);
  }
});
