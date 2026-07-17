const fs = require('fs');

function fixMojibake(text) {
  return text.replace(/[\x80-\xFF]+/g, (match) => {
    try {
      const buf = Buffer.from(match, 'binary');
      const decoded = buf.toString('utf8');
      if (decoded.includes('\uFFFD')) {
        return match;
      }
      return decoded;
    } catch (e) {
      return match;
    }
  });
}

const txt = fs.readFileSync('src/app/admin/phan-cong-khao-sat/mam-non-client.tsx', 'utf8');
const fixed = fixMojibake(txt);
console.log("Original:", txt.substring(txt.indexOf('Preschool'), txt.indexOf('Preschool') + 200));
console.log("Fixed:", fixed.substring(fixed.indexOf('Preschool'), fixed.indexOf('Preschool') + 200));