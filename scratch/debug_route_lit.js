const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbFile = fs.existsSync(path.resolve(__dirname, '../local.db')) 
  ? path.resolve(__dirname, '../local.db') 
  : path.resolve(__dirname, '../dev.db');

const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  const academicYearId = 'cmnseevbh0000wjbmoigji2zd';
  const currentPeriod = 'KSĐN';

  // 1. All subject configs
  const cfgs = await client.execute(`
    SELECT cfg.*, sub.subjectCode, sub.subjectName
    FROM SubjectGradeConfig cfg
    JOIN Subject sub ON cfg.subjectId = sub.id
    WHERE cfg.academicYearId = '${academicYearId}'
  `);
  
  // 2. All entries
  const allEntries = await client.execute(`
    SELECT e.*, sub.subjectCode, sub.subjectName
    FROM SubjectGradeEntry e
    JOIN Subject sub ON e.subjectId = sub.id
    WHERE e.academicYearId = '${academicYearId}' AND e.evaluationPeriod = '${currentPeriod}'
  `);

  const subjectMap = new Map();
  cfgs.rows.forEach(c => {
    subjectMap.set(c.subjectId, { id: c.subjectId, name: c.subjectName, code: c.subjectCode });
  });
  allEntries.rows.forEach(e => {
    subjectMap.set(e.subjectId, { id: e.subjectId, name: e.subjectName, code: e.subjectCode });
  });

  const availableSubjectList = Array.from(subjectMap.values());
  console.log('Available Subjects in list:');
  availableSubjectList.forEach(s => console.log(`  - ${s.code} | ${s.name} | ID: ${s.id}`));

  const findSubject = (keywords, codes) => {
    return availableSubjectList.find(s => {
      const sName = (s.name || '').toLowerCase();
      const sCode = (s.code || '').toUpperCase();
      return codes.includes(sCode) || keywords.some(kw => sName.includes(kw));
    });
  };

  const litSubPrimary = findSubject(['tiếng việt'], ['TVI']);
  const litSubSecondary = findSubject(['ngữ văn', 'văn'], ['NVA']);

  console.log('\nlitSubPrimary:', litSubPrimary);
  console.log('litSubSecondary:', litSubSecondary);

  // Map studentSubjectPeriodMap
  const studentSubjectPeriodMap = new Map();
  allEntries.rows.forEach(e => {
    if (!studentSubjectPeriodMap.has(e.studentId)) {
      studentSubjectPeriodMap.set(e.studentId, new Map());
    }
    const subMap = studentSubjectPeriodMap.get(e.studentId);
    if (!subMap.has(e.subjectId)) {
      subMap.set(e.subjectId, new Map());
    }
    subMap.get(e.subjectId).set(e.evaluationPeriod, e);
  });

  // Check Phan Đình Phùng
  const phung = await client.execute("SELECT id, studentName FROM Student WHERE studentName LIKE '%Phan Đình Phùng%'");
  const pId = phung.rows[0].id;

  console.log('\nChecking Phan Đình Phùng (pId:', pId, '):');
  const pEntryMap = studentSubjectPeriodMap.get(pId);
  console.log('Phan Đình Phùng subjects with entries:');
  for (const [sId, pMap] of pEntryMap.entries()) {
    const sObj = subjectMap.get(sId);
    console.log(`  - Subject ${sObj?.code} (${sObj?.name}, id: ${sId}) -> Score: ${pMap.get(currentPeriod)?.compositeScore}`);
  }

  // Why did route.ts fail to find litSub?
  console.log('litSubSecondary id:', litSubSecondary?.id);
  console.log('Does pEntryMap have litSubSecondary id?', pEntryMap.has(litSubSecondary?.id));

  // Check what classes Phan Đình Phùng is in
  const clsRes = await client.execute(`SELECT c.* FROM Class c JOIN Student s ON s.classId = c.id WHERE s.id = '${pId}'`);
  console.log('Class of Phan Đình Phùng:', clsRes.rows[0]);
  const cls = clsRes.rows[0];
  const isPrimary = (cls.level || '').toLowerCase().includes('tiểu học') || ['1','2','3','4','5'].some(g => (cls.grade||'').includes(g));
  console.log('isPrimary for Phan Đình Phùng?', isPrimary);
}

main().catch(console.error);
