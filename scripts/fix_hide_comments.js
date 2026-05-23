const fs = require('fs');

const clientPath = 'src/app/teacher/input-assessments/client.tsx';
let code = fs.readFileSync(clientPath, 'utf8');

// Use both subName and subCode for maximum robustness, and normalize Unicode!
const search = 'const hideComments = ["toán", "tiếng việt", "ngữ văn"].some(s => subName.includes(s));';
const replace = `const subNameNormalized = subName.normalize("NFC");
    const hideComments = ["toa", "tvi", "nva"].some(c => subCode.includes(c)) || ["toán", "tiếng việt", "ngữ văn"].some(s => subNameNormalized.includes(s));`;

code = code.replace(search, replace);
fs.writeFileSync(clientPath, code, 'utf8');
