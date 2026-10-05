const fs = require('fs');
const path = require('path');

const pure = JSON.parse(fs.readFileSync(path.join(__dirname, 'pure_ground_truth_76.json'), 'utf8'));
const table = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

const tableMap = {};
table.forEach(t => {
  tableMap[t.fullName.trim().toLowerCase()] = t;
});

console.log('--- COMPARING PURE GROUND TRUTH VS EXACT_COMMITMENT_TABLE ---\n');

let diffCount = 0;

pure.forEach((p, idx) => {
  const normName = p.fullName.trim().toLowerCase();
  const t = tableMap[normName];

  if (!t) {
    console.log(`[MISSING] ${p.fullName} not in exact_commitment_table!`);
    diffCount++;
    return;
  }

  // Check committed subjects
  const pComms = p.committedSubjects.sort().join(', ');
  const tComms = (t.committedSubjects || []).sort().join(', ');

  const commDiff = pComms !== tComms;

  // Check KSĐV for committed subjects
  let ksdvDiff = false;
  let ksdnDiff = false;
  const ksdvDetails = [];
  const ksdnDetails = [];

  p.committedSubjects.forEach(sub => {
    if (sub === 'Toán') {
      if (p.ksdvScores.math !== t.ksdvMath) {
        ksdvDiff = true;
        ksdvDetails.push(`Toán: pure=${p.ksdvScores.math} vs tbl=${t.ksdvMath}`);
      }
      if (p.ksdnScores.math !== t.ksdnMath) {
        ksdnDiff = true;
        ksdnDetails.push(`Toán: pure=${p.ksdnScores.math} vs tbl=${t.ksdnMath}`);
      }
    }
    if (sub === 'Tiếng Việt') {
      if (p.ksdvScores.viet !== t.ksdvViet) {
        ksdvDiff = true;
        ksdvDetails.push(`Tiếng Việt: pure=${p.ksdvScores.viet} vs tbl=${t.ksdvViet}`);
      }
      if (p.ksdnScores.viet !== t.ksdnViet) {
        ksdnDiff = true;
        ksdnDetails.push(`Tiếng Việt: pure=${p.ksdnScores.viet} vs tbl=${t.ksdnViet}`);
      }
    }
    if (sub === 'Ngữ Văn') {
      if (p.ksdvScores.van !== t.ksdvVan) {
        ksdvDiff = true;
        ksdvDetails.push(`Ngữ Văn: pure=${p.ksdvScores.van} vs tbl=${t.ksdvVan}`);
      }
      if (p.ksdnScores.van !== t.ksdnVan) {
        ksdnDiff = true;
        ksdnDetails.push(`Ngữ Văn: pure=${p.ksdnScores.van} vs tbl=${t.ksdnVan}`);
      }
    }
    if (sub === 'Tiếng Anh') {
      if (p.ksdvScores.eng !== t.ksdvEngScale10) {
        ksdvDiff = true;
        ksdvDetails.push(`Tiếng Anh: pure=${p.ksdvScores.eng} vs tbl=${t.ksdvEngScale10}`);
      }
      if (p.ksdnScores.eng !== t.ksdnEng) {
        ksdnDiff = true;
        ksdnDetails.push(`Tiếng Anh: pure=${p.ksdnScores.eng} vs tbl=${t.ksdnEng}`);
      }
    }
  });

  if (commDiff || ksdvDiff || ksdnDiff) {
    diffCount++;
    console.log(`[DIFF #${diffCount}] ${p.fullName} (${p.campus}, Khối ${p.grade}, Lớp: ${p.className})`);
    if (commDiff) console.log(`  Committed: Pure=[${pComms}] vs Tbl=[${tComms}]`);
    if (ksdvDiff) console.log(`  KSĐV diff: ${ksdvDetails.join(', ')}`);
    if (ksdnDiff) console.log(`  KSĐN diff: ${ksdnDetails.join(', ')}`);
    console.log(`  DirectorNote: "${p.directorNote}"`);
  }
});

console.log(`\nTotal students with any diff: ${diffCount} / 76`);
