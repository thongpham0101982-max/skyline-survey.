const fs = require('fs');
const path = require('path');

const mdPath = path.join('C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_chat_luong_ksdn_va_ckdv.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');

console.log("Read MD file, length:", mdContent.length, "characters");
