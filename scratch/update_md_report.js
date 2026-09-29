const fs = require('fs');
const path = require('path');

const mdPath = 'C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_chat_luong_ksdn_va_ckdv.md';
let content = fs.readFileSync(mdPath, 'utf8');

const sec3New = fs.readFileSync(path.join(__dirname, 'section3_separated_by_campus.md'), 'utf8');

const sec3StartIdx = content.indexOf('## PHẦN 3:');
const sec4StartIdx = content.indexOf('## PHẦN 4:');

if (sec3StartIdx === -1 || sec4StartIdx === -1) {
  console.error("Could not find section boundaries! sec3:", sec3StartIdx, "sec4:", sec4StartIdx);
  process.exit(1);
}

const updatedContent = content.slice(0, sec3StartIdx) + sec3New + content.slice(sec4StartIdx);
fs.writeFileSync(mdPath, updatedContent, 'utf8');
console.log("Successfully updated Section 3 in bao_cao_chat_luong_ksdn_va_ckdv.md!");
