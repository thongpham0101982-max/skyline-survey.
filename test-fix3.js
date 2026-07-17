const fs = require('fs');
const iconv = require('iconv-lite');

// Win1258 includes all win1252 chars plus some vietnamese overrides
// Let's just match any non-ascii character that is NOT a valid Vietnamese character (or just any non-ascii string)
const regex = /[^\x00-\x7F]+/g;

function fixMojibake(text) {
  return text.replace(regex, (match) => {
    try {
      // First check if it's already a correct string (e.g. 'Khối', 'Nhóm')
      // If we encode it to win1258 and decode to utf8, and it doesn't change, we leave it? No.
      // If we encode it to win1258, a valid Vietnamese char like 'ố' (U+1ED1) is NOT in win1258 directly (it uses combining marks).
      // So iconv.encode might produce '?' or fail.
      const buf = iconv.encode(match, 'win1258');
      
      // If it contains 0x3F ('?'), it means iconv couldn't encode it to win1258, meaning it's a correct Vietnamese char!
      if (buf.includes(0x3F)) {
        return match;
      }
      
      const decoded = iconv.decode(buf, 'utf8');
      if (decoded.includes('\uFFFD') || decoded.length === 0) {
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