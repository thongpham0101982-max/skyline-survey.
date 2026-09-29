const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  // 1. Fetch AssessmentSubjects
  const asubRes = await client.execute("SELECT * FROM AssessmentSubject");
  const asubMap = {};
  asubRes.rows.forEach(s => asubMap[s.id] = s);

  // 2. Fetch StudentAssessmentScore
  const sasRes = await client.execute("SELECT * FROM StudentAssessmentScore");
  const sasByStudent = {};
  for (const r of sasRes.rows) {
    if (!sasByStudent[r.studentId]) sasByStudent[r.studentId] = [];
    const sub = asubMap[r.subjectId];
    let scoreVal = null;
    try {
      const parsed = JSON.parse(r.scores);
      if (Array.isArray(parsed)) {
        scoreVal = parsed.find(x => x !== undefined && x !== '' && x !== null);
      } else {
        scoreVal = parsed;
      }
    } catch {
      scoreVal = r.scores;
    }
    sasByStudent[r.studentId].push({
      subjectId: r.subjectId,
      subjectCode: sub?.code,
      subjectName: sub?.name,
      scoreVal: scoreVal !== null && !isNaN(Number(scoreVal)) ? Number(scoreVal) : scoreVal
    });
  }

  // 3. Fetch InputAssessmentStudent
  const iasRes = await client.execute("SELECT * FROM InputAssessmentStudent WHERE enrollmentStatus = 'COMPLETED'");

  // Helper to parse English scale 10
  function getEnglishScale10(r, sasList) {
    let written = r.writtenEnglishScore ? parseFloat(r.writtenEnglishScore) : NaN;
    let oral = r.oralEnglishScore ? parseFloat(r.oralEnglishScore) : NaN;
    let ept = NaN;

    if (sasList && sasList.length > 0) {
      for (const sc of sasList) {
        const code = (sc.subjectCode || '').toUpperCase();
        const sname = (sc.subjectName || '').toLowerCase();
        if (code === 'EPT' || sname.includes('ept')) {
          if (!isNaN(parseFloat(sc.scoreVal))) ept = parseFloat(sc.scoreVal);
        } else if (code === 'TAV' || sname.includes('viết')) {
          if (!isNaN(parseFloat(sc.scoreVal))) written = parseFloat(sc.scoreVal);
        } else if (code === 'TAVD' || sname.includes('vấn đáp') || sname.includes('nói')) {
          if (!isNaN(parseFloat(sc.scoreVal))) oral = parseFloat(sc.scoreVal);
        }
      }
    }

    const gStr = String(r.grade || r.className || '').toLowerCase();
    const isGrade1 = gStr.match(/\d+/)?.[0] === '1';

    let totalScore = null;
    let scale10 = null;

    if (isGrade1) {
      if (!isNaN(oral)) {
        scale10 = Math.round((oral / 30) * 10 * 10) / 10;
        totalScore = Math.round((oral / 30) * 100 * 10) / 10;
      }
    } else {
      if (!isNaN(ept) && ept > 0) {
        totalScore = ept;
      } else if (!isNaN(written) && !isNaN(oral)) {
        totalScore = Math.round((written + oral) * 10) / 10;
      } else if (!isNaN(written)) {
        totalScore = written;
      } else if (!isNaN(oral)) {
        // If only oral is present and student is not grade 1
        // Check if oral is on scale 30 or 100
        if (oral <= 30) {
          totalScore = Math.round((oral / 30) * 100 * 10) / 10;
        } else {
          totalScore = oral;
        }
      }

      if (totalScore !== null) {
        if (totalScore > 10) {
          scale10 = Math.round((totalScore / 10) * 10) / 10;
        } else {
          scale10 = Math.round(totalScore * 10) / 10;
        }
      }
    }

    // Direct column fallback
    if (scale10 === null) {
      if (r.totalEnglishScore) {
        const val = parseFloat(r.totalEnglishScore);
        if (!isNaN(val)) {
          scale10 = val > 10 ? Math.round((val / 10) * 10) / 10 : Math.round(val * 10) / 10;
        }
      }
    }

    return {
      written: isNaN(written) ? null : written,
      oral: isNaN(oral) ? null : oral,
      ept: isNaN(ept) ? null : ept,
      totalScore,
      scale10
    };
  }

  // 4. Update exact_commitment_table.json
  const commTable = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), 'utf8'));

  for (const st of commTable) {
    const rawRecord = iasRes.rows.find(r => r.id === st.id);
    if (rawRecord) {
      const sasList = sasByStudent[st.id] || [];
      const engCalc = getEnglishScale10(rawRecord, sasList);
      st.ksdvEngDetails = engCalc;
      st.ksdvEngScale10 = engCalc.scale10;
    }
  }

  fs.writeFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), JSON.stringify(commTable, null, 2));
  console.log('Updated exact_commitment_table.json with scale 10 English');

  // Print sample English scale 10
  const sampleEng = commTable.filter(s => s.committedSubjects.includes('Tiếng Anh')).slice(0, 10);
  console.log('Sample English scale 10 conversions:');
  sampleEng.forEach(s => {
    console.log(`  ${s.fullName} (${s.campus}): ksdvEng Raw=${s.ksdvEng} -> Scale10=${s.ksdvEngScale10}, KSĐN=${s.ksdnEng}`);
  });
}

main().catch(console.error);
