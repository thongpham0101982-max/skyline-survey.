const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const classesRes = await client.execute("SELECT id, className, grade, campusId FROM Class");
  const classMap = {};
  classesRes.rows.forEach(c => classMap[c.id] = c);

  const campusRes = await client.execute("SELECT id, campusName, campusCode FROM Campus");
  const campusMap = {};
  campusRes.rows.forEach(cp => campusMap[cp.id] = cp);

  const asubRes = await client.execute("SELECT * FROM AssessmentSubject");
  const asubMap = {};
  asubRes.rows.forEach(s => asubMap[s.id] = s);

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

  // Check all students in Student table with grades in KSĐN
  const students = await client.execute("SELECT id, studentCode, studentName, classId, campusId, status FROM Student");
  const studentMap = {};
  students.rows.forEach(s => {
    if (s.studentCode) studentMap[s.studentCode.trim().toUpperCase()] = s;
    if (s.studentName) studentMap[s.studentName.trim().toLowerCase()] = s;
  });

  const ksdnGrades = await client.execute("SELECT g.studentId, s.subjectCode, s.subjectName, g.compositeScore FROM SubjectGradeEntry g JOIN Subject s ON g.subjectId = s.id WHERE g.evaluationPeriod = 'KSĐN'");
  const gradesByStudentId = {};
  for (const g of ksdnGrades.rows) {
    if (!gradesByStudentId[g.studentId]) gradesByStudentId[g.studentId] = {};
    gradesByStudentId[g.studentId][g.subjectCode] = g.compositeScore;
    gradesByStudentId[g.studentId][g.subjectName] = g.compositeScore;
  }

  // Load exact table json if exists
  let existingData = [];
  try {
    existingData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), 'utf8'));
    console.log(`Loaded ${existingData.length} records from exact_commitment_table.json`);
  } catch (e) {
    console.log("No exact_commitment_table.json");
  }

  // Map each record
  const updatedRecords = [];
  for (const item of existingData) {
    const normName = (item.fullName || item.studentName || '').trim().toLowerCase();
    const st = studentMap[normName];

    let actualClass = item.className;
    if (!actualClass || actualClass === 'Chưa rõ') {
      if (st && st.classId && classMap[st.classId]) {
        actualClass = classMap[st.classId].className;
      }
    }

    // Manual overrides for known 14 students
    if (normName.includes('đỗ an nhiên')) actualClass = '1.1_CS1';
    if (normName.includes('phước huy')) actualClass = '1S_CS4';
    if (normName.includes('sĩ phú')) actualClass = '6.1_CS1';
    if (normName.includes('daniil')) actualClass = '1.1_CS1';
    if (normName.includes('gia lân')) actualClass = '1.3_CS2';
    if (normName.includes('thảo linh')) actualClass = '1.3_CS2';
    if (normName.includes('thanh phúc')) actualClass = '1.2INT_CS2';
    if (normName.includes('an khôi')) actualClass = '1.3_CS2';
    if (normName.includes('hải đăng')) actualClass = '1.3_CS2';
    if (normName.includes('duy khang')) actualClass = '1.3_CS2';
    if (normName.includes('aron')) actualClass = '1.2INT_CS2';
    if (normName.includes('mikhail')) actualClass = '1.1INT_CS3';
    if (normName.includes('anh minh')) actualClass = '6S_CS4';
    if (normName.includes('đức thịnh')) actualClass = '1.5_CS5';

    // Get KSĐN scores if available
    let ksdnScores = item.ksdnScores || item.ksdnScore || {};
    if (st && gradesByStudentId[st.id]) {
      const g = gradesByStudentId[st.id];
      ksdnScores = { ...ksdnScores, ...g };
    }

    updatedRecords.push({
      ...item,
      className: actualClass,
      ksdnScores
    });
  }

  fs.writeFileSync(path.resolve(__dirname, 'exact_commitment_table_mapped.json'), JSON.stringify(updatedRecords, null, 2), 'utf8');
  console.log(`Saved ${updatedRecords.length} updated records to exact_commitment_table_mapped.json`);
}

main().catch(console.error);
