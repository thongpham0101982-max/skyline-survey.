const fs = require('fs');
const path = require('path');

const oldData = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_76_deep_entrance_audit.json'), 'utf8'));

console.log('Comparing old data vs deep audit...');
let diffCount = 0;

oldData.forEach((oldSt, idx) => {
  const deep = audit[idx];
  let deepMath = null, deepViet = null, deepVan = null, deepEngScale10 = null, deepEngTotal = null;
  let engW = null, engO = null, engEpt = null;

  deep.records.forEach(r => {
    if (r.directScores.math != null && !isNaN(parseFloat(r.directScores.math))) deepMath = parseFloat(r.directScores.math);
    if (r.directScores.lit != null && !isNaN(parseFloat(r.directScores.lit))) {
      if (deep.grade <= 5) deepViet = parseFloat(r.directScores.lit);
      else deepVan = parseFloat(r.directScores.lit);
    }
    if (r.directScores.engW != null) engW = parseFloat(r.directScores.engW);
    if (r.directScores.engO != null) engO = parseFloat(r.directScores.engO);

    const sas = r.sasScores;
    if (sas['TOA'] && !isNaN(parseFloat(sas['TOA'].val))) deepMath = parseFloat(sas['TOA'].val);
    if (sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val))) deepViet = parseFloat(sas['TVI'].val);
    if (sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val))) {
      if (deep.grade <= 5) deepViet = parseFloat(sas['NVA'].val);
      else deepVan = parseFloat(sas['NVA'].val);
    }
    if (deep.grade >= 6 && sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val)) && deepVan == null) {
      deepVan = parseFloat(sas['TVI'].val);
    }
    if (deep.grade <= 5 && sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val)) && deepViet == null) {
      deepViet = parseFloat(sas['NVA'].val);
    }

    if (sas['TAv'] && !isNaN(parseFloat(sas['TAv'].val))) engW = parseFloat(sas['TAv'].val);
    if (sas['TAvd'] && !isNaN(parseFloat(sas['TAvd'].val))) engO = parseFloat(sas['TAvd'].val);
    if (sas['EPT'] && !isNaN(parseFloat(sas['EPT'].val))) engEpt = parseFloat(sas['EPT'].val);
  });

  if (engEpt != null) {
    deepEngTotal = engEpt;
    deepEngScale10 = +(engEpt / 10).toFixed(1);
  } else if (engW != null || engO != null) {
    deepEngTotal = (engW || 0) + (engO || 0);
    deepEngScale10 = +(deepEngTotal / 10).toFixed(1);
  }

  // Compare
  const mathDiff = oldSt.ksdvMath !== deepMath;
  const vietDiff = oldSt.ksdvViet !== deepViet;
  const vanDiff = oldSt.ksdvVan !== deepVan;
  const engDiff = oldSt.ksdvEngScale10 !== deepEngScale10 || oldSt.ksdvEngTotal !== deepEngTotal;

  if (mathDiff || vietDiff || vanDiff || engDiff) {
    diffCount++;
    console.log(`[Diff ${diffCount}] STT ${idx+1}: ${oldSt.fullName} (${oldSt.className})`);
    if (mathDiff) console.log(`   Toán: old=${oldSt.ksdvMath} vs new=${deepMath}`);
    if (vietDiff) console.log(`   Tiếng Việt: old=${oldSt.ksdvViet} vs new=${deepViet}`);
    if (vanDiff) console.log(`   Ngữ Văn: old=${oldSt.ksdvVan} vs new=${deepVan}`);
    if (engDiff) console.log(`   Tiếng Anh: old scale10=${oldSt.ksdvEngScale10} (total=${oldSt.ksdvEngTotal}) vs new scale10=${deepEngScale10} (total=${deepEngTotal})`);
  }
});

console.log('Total differences found:', diffCount);
