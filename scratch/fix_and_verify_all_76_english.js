const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // Query all raw scores for these students
  const studentIds = ckdv.map(s => s.id);
  
  const rawScoresRes = await client.execute(`
    SELECT sas.studentId, sub.code as subCode, sub.name as subName, sas.scores
    FROM StudentAssessmentScore sas
    JOIN AssessmentSubject sub ON sas.subjectId = sub.id
    WHERE sas.studentId IN (${studentIds.map(id => `'${id}'`).join(',')})
  `);

  const rawByStudent = {};
  rawScoresRes.rows.forEach(r => {
    if (!rawByStudent[r.studentId]) rawByStudent[r.studentId] = {};
    let parsed = null;
    try { parsed = JSON.parse(r.scores); } catch (e) {}
    rawByStudent[r.studentId][r.subCode] = {
      name: r.subName,
      raw: r.scores,
      parsed: parsed
    };
  });

  console.log(`Loaded raw assessment scores for ${Object.keys(rawByStudent).length} students.`);

  // Verify and re-compute English scores
  const updatedList = ckdv.map((st, idx) => {
    const rawMap = rawByStudent[st.id] || {};
    
    // Check English components
    let wScore = null;
    let oScore = null;
    let eptScore = null;

    // TAv (viết)
    if (rawMap['TAv'] && Array.isArray(rawMap['TAv'].parsed)) {
      const val = parseFloat(rawMap['TAv'].parsed[0]);
      if (!isNaN(val)) wScore = val;
    }
    // TAvd (vấn đáp)
    if (rawMap['TAvd'] && Array.isArray(rawMap['TAvd'].parsed)) {
      const val = parseFloat(rawMap['TAvd'].parsed[0]);
      if (!isNaN(val)) oScore = val;
    }
    // EPT
    if (rawMap['EPT'] && Array.isArray(rawMap['EPT'].parsed)) {
      const val = parseFloat(rawMap['EPT'].parsed[0]);
      if (!isNaN(val)) eptScore = val;
    }

    const isGrade1 = st.grade === '1' || (st.className && st.className.startsWith('1.'));

    let totalScore = null;
    let scale10 = null;

    if (isGrade1) {
      if (oScore !== null) {
        // Oral on scale 30
        totalScore = Math.round((oScore / 30) * 100 * 10) / 10;
        scale10 = Math.round((oScore / 30) * 10 * 10) / 10;
      }
    } else {
      if (eptScore !== null && eptScore > 0) {
        totalScore = eptScore;
        scale10 = Math.round((eptScore / 10) * 10) / 10;
      } else if (wScore !== null && oScore !== null) {
        totalScore = Math.round((wScore + oScore) * 10) / 10;
        scale10 = Math.round((totalScore / 10) * 10) / 10;
      } else if (wScore !== null) {
        totalScore = wScore;
        scale10 = Math.round((wScore / 10) * 10) / 10;
      } else if (oScore !== null) {
        // If only oral exists for older student
        if (oScore <= 30) {
          totalScore = Math.round((oScore / 30) * 100 * 10) / 10;
          scale10 = Math.round((oScore / 30) * 10 * 10) / 10;
        } else {
          totalScore = oScore;
          scale10 = Math.round((oScore / 10) * 10) / 10;
        }
      }
    }

    // Math, Viet, Van
    let mathScore = null;
    if (rawMap['TOA'] && Array.isArray(rawMap['TOA'].parsed)) {
      const v = parseFloat(rawMap['TOA'].parsed[0]);
      if (!isNaN(v)) mathScore = v;
    }
    let vietScore = null;
    if (rawMap['TVI'] && Array.isArray(rawMap['TVI'].parsed)) {
      const v = parseFloat(rawMap['TVI'].parsed[0]);
      if (!isNaN(v)) vietScore = v;
    }
    let vanScore = null;
    if (rawMap['NVA'] && Array.isArray(rawMap['NVA'].parsed)) {
      const v = parseFloat(rawMap['NVA'].parsed[0]);
      if (!isNaN(v)) vanScore = v;
    }

    const engDetails = {
      written: wScore,
      oral: oScore,
      ept: eptScore,
      totalScore: totalScore,
      scale10: scale10
    };

    return {
      ...st,
      ksdvMath: mathScore ?? st.ksdvMath,
      ksdvViet: vietScore ?? st.ksdvViet,
      ksdvVan: vanScore ?? st.ksdvVan,
      ksdvEngDetails: engDetails,
      ksdvEngScale10: scale10,
      ksdvEngTotal: totalScore
    };
  });

  // Verify Pham Gia Bao and Do Thanh Nguyen
  const pgb = updatedList.find(s => s.fullName === 'Phạm Gia Bảo');
  console.log("\n[VERIFY] Phạm Gia Bảo:");
  console.log("  EngDetails:", pgb.ksdvEngDetails);
  console.log("  Scale10:", pgb.ksdvEngScale10, "TotalScore:", pgb.ksdvEngTotal);

  const dtn = updatedList.find(s => s.fullName === 'Đỗ Thành Nguyên');
  console.log("\n[VERIFY] Đỗ Thành Nguyên:");
  console.log("  EngDetails:", dtn.ksdvEngDetails);
  console.log("  Scale10:", dtn.ksdvEngScale10, "TotalScore:", dtn.ksdvEngTotal);

  const ngb = updatedList.find(s => s.fullName === 'Nguyễn Gia Bảo');
  console.log("\n[VERIFY] Nguyễn Gia Bảo:");
  console.log("  EngDetails:", ngb.ksdvEngDetails);
  console.log("  Scale10:", ngb.ksdvEngScale10, "TotalScore:", ngb.ksdvEngTotal);

  // Write back to exact_commitment_table.json
  fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(updatedList, null, 2), 'utf8');
  console.log("\nSuccessfully saved verified exact_commitment_table.json!");
}

main().catch(console.error);
