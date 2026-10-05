const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TURSO_URL = process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

async function main() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  console.log(`Auditing 76 CKDV students with retest rules from Turso...`);

  const auditedStudents = [];

  for (let i = 0; i < ckdv.length; i++) {
    const st = ckdv[i];

    // Find all InputAssessmentStudent records for this student
    // Search by exact id, or by studentCode (if valid), or by fullName + campus
    let query = `SELECT id, periodId, batchId, studentCode, fullName, admissionCampus, grade, className, 
                        mathScore, writtenEnglishScore, oralEnglishScore, literatureScore, psychologyScore,
                        admissionCriteria, admissionResult, directorNote, isAbsent, createdAt
                 FROM InputAssessmentStudent 
                 WHERE id = ?`;
    let args = [st.id];

    if (st.studentCode && st.studentCode !== '' && st.studentCode !== '—') {
      query += ` OR studentCode = ?`;
      args.push(st.studentCode);
    }
    if (st.fullName && st.campus) {
      query += ` OR (fullName = ? AND admissionCampus = ?)`;
      args.push(st.fullName, st.campus);
    }

    query += ` ORDER BY createdAt ASC`;

    const res = await client.execute({ sql: query, args });

    // Deduplicate records by id
    const recordsMap = new Map();
    res.rows.forEach(r => recordsMap.set(r.id, r));
    const sortedRecords = Array.from(recordsMap.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Also fetch scores for all these records
    const recordsWithScores = [];
    for (const r of sortedRecords) {
      const sas = await client.execute({
        sql: `SELECT sub.code, sub.name, sas.scores 
              FROM StudentAssessmentScore sas 
              JOIN AssessmentSubject sub ON sas.subjectId = sub.id 
              WHERE sas.studentId = ?`,
        args: [r.id]
      });

      const parsedSas = {};
      sas.rows.forEach(s => {
        let val = null;
        try {
          const p = JSON.parse(s.scores);
          if (Array.isArray(p)) {
            val = p.length > 0 ? p[0] : null;
          } else {
            val = p;
          }
        } catch (e) {
          val = s.scores;
        }
        if (val !== '' && val !== null && val !== undefined) {
          parsedSas[s.code] = { name: s.name, val };
        }
      });

      recordsWithScores.push({
        ...r,
        sasScores: parsedSas
      });
    }

    // Now merge scores across attempts:
    // Rule: Display all subjects tested. If a subject was re-tested, take the LAST test result.
    let finalMath = null;
    let finalViet = null;
    let finalVan = null;
    let finalEngW = null;
    let finalEngO = null;
    let finalEngEpt = null;
    let finalPsy = null;

    let mathAttemptCount = 0;
    let engAttemptCount = 0;
    let vanAttemptCount = 0;
    let vietAttemptCount = 0;

    for (const rec of recordsWithScores) {
      // Math
      if (rec.mathScore != null) {
        finalMath = Number(rec.mathScore);
        mathAttemptCount++;
      } else if (rec.sasScores['TOA'] && rec.sasScores['TOA'].val != null) {
        finalMath = Number(rec.sasScores['TOA'].val);
        mathAttemptCount++;
      }

      // Literature / Vietnamese
      if (rec.literatureScore != null) {
        finalVan = Number(rec.literatureScore);
        vanAttemptCount++;
      } else if (rec.sasScores['NVA'] && rec.sasScores['NVA'].val != null) {
        finalVan = Number(rec.sasScores['NVA'].val);
        vanAttemptCount++;
      }

      if (rec.sasScores['TVI'] && rec.sasScores['TVI'].val != null) {
        finalViet = Number(rec.sasScores['TVI'].val);
        vietAttemptCount++;
      }

      // English
      if (rec.writtenEnglishScore != null) {
        finalEngW = Number(rec.writtenEnglishScore);
        engAttemptCount++;
      } else if (rec.sasScores['TAv'] && rec.sasScores['TAv'].val != null) {
        finalEngW = Number(rec.sasScores['TAv'].val);
        engAttemptCount++;
      }

      if (rec.oralEnglishScore != null) {
        finalEngO = Number(rec.oralEnglishScore);
      } else if (rec.sasScores['TAvd'] && rec.sasScores['TAvd'].val != null) {
        finalEngO = Number(rec.sasScores['TAvd'].val);
      }

      if (rec.sasScores['EPT'] && rec.sasScores['EPT'].val != null) {
        finalEngEpt = Number(rec.sasScores['EPT'].val);
      }

      // Psychology
      if (rec.psychologyScore != null) {
        finalPsy = Number(rec.psychologyScore);
      } else if (rec.sasScores['TLY'] && rec.sasScores['TLY'].val != null) {
        finalPsy = Number(rec.sasScores['TLY'].val);
      }
    }

    // Calculate English Total and Scale 10
    let engTotal = null;
    let engScale10 = null;
    if (finalEngW != null || finalEngO != null) {
      const w = finalEngW || 0;
      const o = finalEngO || 0;
      engTotal = w + o;
      // In Skyline, for Grade >= 2, English test is max 100 (or max 100 scale: e.g. written 70 + oral 30)
      // If total is out of 100, Scale 10 = total / 10
      // If total is out of 20, Scale 10 = total / 2
      if (engTotal > 20) {
        engScale10 = +(engTotal / 10).toFixed(1);
      } else {
        // e.g. Grade 1 or 20-scale
        // Let's check max possible or scale: if engTotal <= 20 and student is grade 7 (like Vo Thi Anh Thu: 18 + 7 = 25 -> 2.5)
        engScale10 = +(engTotal / 10).toFixed(1);
      }
    } else if (finalEngEpt != null) {
      engTotal = finalEngEpt;
      engScale10 = +(finalEngEpt / 10).toFixed(1);
    }

    auditedStudents.push({
      ...st,
      recordsCount: recordsWithScores.length,
      records: recordsWithScores,
      mergedScores: {
        math: finalMath,
        viet: finalViet,
        van: finalVan,
        engW: finalEngW,
        engO: finalEngO,
        engTotal: engTotal,
        engScale10: engScale10,
        psy: finalPsy
      }
    });
  }

  // Print multi-record students and how their scores were merged
  console.log('\n=== MULTI-RECORD STUDENTS & MERGED SCORES ===');
  const multiRecs = auditedStudents.filter(s => s.recordsCount > 1);
  console.log(`Found ${multiRecs.length} students with multiple records!`);
  multiRecs.forEach(s => {
    console.log(`\n- ${s.fullName} (${s.campus}, Khối ${s.grade}, Mã: ${s.studentCode}) - ${s.recordsCount} đợt thi`);
    console.log(`  Môn cam kết: ${s.committedSubjects.join(', ')}`);
    s.records.forEach((r, idx) => {
      console.log(`    Đợt ${idx + 1} (${r.createdAt?.substring(0, 10)}): Criteria=${r.admissionCriteria}, Result=${r.admissionResult}`);
      console.log(`      Direct: Math=${r.mathScore}, Lit=${r.literatureScore}, EngW=${r.writtenEnglishScore}, EngO=${r.oralEnglishScore}`);
      console.log(`      SAS: ${JSON.stringify(r.sasScores)}`);
    });
    console.log(`  => KẾT QUẢ CUỐI CÙNG (GỘP TẤT CẢ CÁC MÔN, LẤY ĐỢT CUỐI CỦA MÔN THI LẠI):`);
    console.log(`     Toán: ${s.mergedScores.math}, Tiếng Việt: ${s.mergedScores.viet}, Ngữ Văn: ${s.mergedScores.van}, Anh: ${s.mergedScores.engScale10} (Tổng: ${s.mergedScores.engTotal})`);
  });

  fs.writeFileSync(path.join(__dirname, 'retest_audited_76.json'), JSON.stringify(auditedStudents, null, 2), 'utf8');
  console.log('\nSaved results to scratch/retest_audited_76.json');
}

main().catch(console.error);
