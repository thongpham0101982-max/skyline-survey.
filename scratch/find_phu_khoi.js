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
  const cls = await client.execute("SELECT id, className FROM Class WHERE className LIKE '%6.1_CS1%'");
  console.log('Class 6.1_CS1:', cls.rows);
  if (cls.rows.length > 0) {
    const cId = cls.rows[0].id;
    const studentsInClass = await client.execute(`SELECT id, studentCode, studentName FROM Student WHERE classId = '${cId}'`);
    console.log(`Total students in 6.1_CS1: ${studentsInClass.rows.length}`);
    const matchedPhu = studentsInClass.rows.filter(s => s.studentName.toLowerCase().includes('phú') || s.studentName.toLowerCase().includes('phu'));
    console.log('Phú in 6.1_CS1:', matchedPhu);

    // Kiểm tra tất cả học sinh có chữ Phú trong toàn trường
    const allPhu = await client.execute("SELECT s.id, s.studentCode, s.studentName, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%Phú%' OR s.studentName LIKE '%Phu%'");
    console.log('All Phú in school:', allPhu.rows);
  }

  // Tương tự, kiểm tra An Khôi
  const allKhoi = await client.execute("SELECT s.id, s.studentCode, s.studentName, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%Khôi%' OR s.studentName LIKE '%Khoi%'");
  console.log('\nAll Khôi in school:', allKhoi.rows);
}

main().catch(console.error);
