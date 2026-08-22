const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== Bắt đầu đồng bộ danh mục Môn học & Môn Khảo sát ===");

  // 1. Đồng bộ trong bảng Subject (Quản lý Môn học)
  const mainSubjects = [
    { code: 'TOA', name: 'Toán học', level: 'ALL', evaluationType: 'SCORE' },
    { code: 'TVI', name: 'Tiếng Việt', level: 'ALL', evaluationType: 'SCORE' },
    { code: 'NVA', name: 'Ngữ Văn', level: 'ALL', evaluationType: 'SCORE' },
    { code: 'TLY', name: 'Tâm lý', level: 'ALL', evaluationType: 'SCORE' },
    { code: 'TAV', name: 'Tiếng Anh', level: 'ALL', evaluationType: 'SCORE' },
  ];

  const createdMainSubjects = {};

  for (const sub of mainSubjects) {
    const upserted = await prisma.subject.upsert({
      where: { subjectCode: sub.code },
      update: { subjectName: sub.name, level: sub.level, evaluationType: sub.evaluationType, status: 'ACTIVE' },
      create: { subjectCode: sub.code, subjectName: sub.name, level: sub.level, evaluationType: sub.evaluationType, status: 'ACTIVE' }
    });
    createdMainSubjects[sub.code] = upserted.id;
    console.log(`[Subject] Up-serted main subject: ${sub.name} (${sub.code})`);
  }

  // Môn con Tiếng Anh (TAv & TAvd) trong Quản lý Môn học
  const subEnglish = [
    { code: 'TAv', name: 'Tiếng Anh (viết)', parentId: createdMainSubjects['TAV'] },
    { code: 'TAvd', name: 'Tiếng Anh (vấn đáp)', parentId: createdMainSubjects['TAV'] }
  ];

  for (const sub of subEnglish) {
    await prisma.subject.upsert({
      where: { subjectCode: sub.code },
      update: { subjectName: sub.name, parentId: sub.parentId, status: 'ACTIVE' },
      create: { subjectCode: sub.code, subjectName: sub.name, parentId: sub.parentId, status: 'ACTIVE' }
    });
    console.log(`[Subject] Up-serted sub-subject: ${sub.name} (${sub.code})`);
  }

  // 2. Đồng bộ trong bảng AssessmentSubject (Môn Khảo sát)
  const assessmentSubjects = [
    { code: 'TOA', name: 'Toán học', scoreColumns: 1, commentColumns: 1, sortOrder: 1 },
    { code: 'TVI', name: 'Tiếng Việt', scoreColumns: 1, commentColumns: 1, sortOrder: 2 },
    { code: 'NVA', name: 'Ngữ Văn', scoreColumns: 1, commentColumns: 1, sortOrder: 3 },
    { code: 'TLY', name: 'Tâm lý', scoreColumns: 7, commentColumns: 2, sortOrder: 4 },
    { code: 'TAv', name: 'Tiếng Anh (viết)', scoreColumns: 1, commentColumns: 1, sortOrder: 5 },
    { code: 'TAvd', name: 'Tiếng Anh (vấn đáp)', scoreColumns: 1, commentColumns: 1, sortOrder: 6 },
  ];

  for (const assSub of assessmentSubjects) {
    const existing = await prisma.assessmentSubject.findUnique({ where: { code: assSub.code } });
    if (existing) {
      await prisma.assessmentSubject.update({
        where: { code: assSub.code },
        data: { name: assSub.name, status: 'ACTIVE' }
      });
      console.log(`[AssessmentSubject] Updated: ${assSub.name} (${assSub.code})`);
    } else {
      await prisma.assessmentSubject.create({
        data: {
          code: assSub.code,
          name: assSub.name,
          scoreColumns: assSub.scoreColumns,
          commentColumns: assSub.commentColumns,
          sortOrder: assSub.sortOrder,
          status: 'ACTIVE'
        }
      });
      console.log(`[AssessmentSubject] Created: ${assSub.name} (${assSub.code})`);
    }
  }

  console.log("=== Hoàn tất đồng bộ dữ liệu Môn học ===");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
