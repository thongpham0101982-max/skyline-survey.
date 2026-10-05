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
  const subjects = await client.execute("SELECT id, subjectCode, subjectName FROM Subject WHERE subjectName LIKE '%Văn%' OR subjectCode LIKE '%NV%' OR subjectCode LIKE '%VAN%'");
  console.log('All Literature Subjects:', subjects.rows);

  const phung = await client.execute("SELECT id FROM Student WHERE studentName LIKE '%Phan Đình Phùng%'");
  const sId = phung.rows[0].id;
  const entries = await client.execute(`SELECT ge.*, sub.subjectCode, sub.subjectName FROM SubjectGradeEntry ge JOIN Subject sub ON ge.subjectId = sub.id WHERE ge.studentId = '${sId}'`);
  console.log('Entries for Phan Đình Phùng:', entries.rows);
}

main().catch(console.error);
