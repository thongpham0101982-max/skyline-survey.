const fs = require('fs');
const iconv = require('iconv-lite');

const win1252_chars = "\x80-\xFF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178";
const regex = new RegExp(`[${win1252_chars}]+`, 'g');

function fixMojibake(text) {
  return text.replace(regex, (match) => {
    try {
      const buf = iconv.encode(match, 'win1252');
      const decoded = iconv.decode(buf, 'utf8');
      if (decoded.includes('\uFFFD') || decoded.length === 0) {
        return match;
      }
      // Heuristic: If decoded string contains win1252 weird chars still, it might be a double encoding? 
      // But mostly if it decodes properly without U+FFFD, it's correct.
      // However, a single 'á' will decode to '' which includes U+FFFD, so it won't be replaced!
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