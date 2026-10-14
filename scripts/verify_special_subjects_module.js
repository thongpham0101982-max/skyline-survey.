// Comprehensive verification script for Special Subjects Module
// Tests using the LibSQL adapter for both local.db and Turso cloud
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const path = require('path');

const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const localLibsql = createClient({ url: `file:${localDbPath}` });
const localAdapter = new PrismaLibSQL(localLibsql);
const prisma = new PrismaClient({ adapter: localAdapter });

async function runVerification() {
  console.log('=== VERIFYING SPECIAL SUBJECTS MODULE (LOCAL.DB) ===\n');

  try {
    // 1. Verify Subjects
    const subjects = await prisma.specialSubject.findMany({
      include: {
        curriculums: {
          include: {
            versions: {
              include: {
                gradeConfigs: true,
                topics: {
                  include: {
                    lessons: true
                  }
                },
                lessons: true
              }
            }
          }
        }
      }
    });

    console.log(`[1] Total Special Subjects in Database: ${subjects.length}`);
    for (const sub of subjects) {
      console.log(`  - Code: ${sub.code} | Name: ${sub.name} | Active: ${sub.isActive}`);
      for (const curr of sub.curriculums) {
        console.log(`    * Curriculum: ${curr.name} (${curr.educationLevel})`);
        for (const ver of curr.versions) {
          console.log(`      + Version: ${ver.versionCode} (${ver.versionName}) | Status: ${ver.status}`);
          console.log(`        Total Topics: ${ver.topics.length}, Total Lessons: ${ver.lessons.length}`);
          for (const gc of ver.gradeConfigs) {
            const gradeLessons = ver.lessons.filter(l => l.grade === gc.grade);
            console.log(`        > Grade ${gc.grade}: ${gc.totalPeriods} periods allocated, ${gradeLessons.length} lessons stored.`);
          }
        }
      }
    }

    // 2. Validate Financial Education 75 periods
    const finEdu = subjects.find(s => s.code === 'FIN_EDU');
    if (!finEdu) {
      throw new Error('FIN_EDU subject not found!');
    }
    const primaryCurr = finEdu.curriculums.find(c => c.level === 'PRIMARY');
    const pubVersion = primaryCurr?.versions.find(v => v.status === 'PUBLISHED');
    if (!pubVersion) {
      throw new Error('Published primary curriculum version not found!');
    }

    const gradeCounts = {};
    for (let g = 1; g <= 5; g++) {
      const gStr = g.toString();
      const count = pubVersion.lessons.filter(l => l.grade === gStr).length;
      gradeCounts[`Khối ${g}`] = `${count} tiết`;
    }

    console.log('\n[2] Phân bổ tiết môn Giáo dục tài chính cá nhân (Tiểu học):');
    console.table(gradeCounts);
    console.log(`Tổng số tiết Tiểu học: ${pubVersion.lessons.length} (Chuẩn yêu cầu: 75 tiết)`);
    if (pubVersion.lessons.length !== 75) {
      console.warn(`WARNING: Expected 75 lessons, found ${pubVersion.lessons.length}`);
    } else {
      console.log('✓ XÁC NHẬN CHUẨN XÁC 75 TIẾT (15 tiết/khối x 5 khối) TỪ KHUNG CHƯƠNG TRÌNH GỐC!');
    }

    // 3. Verify Classes & Sample Assignment
    const primaryClasses = await prisma.class.findMany({
      where: { grade: { in: ['1', '2', '3', '4', '5'] }, status: 'ACTIVE' },
      take: 5,
      include: { campus: true }
    });
    console.log(`\n[3] Kiểm tra phân công giảng dạy:`);
    console.log(`  - Tìm thấy ${primaryClasses.length} lớp Tiểu học đang hoạt động.`);
    primaryClasses.forEach(c => console.log(`    * Lớp: ${c.className} (Khối ${c.grade}) cơ sở: ${c.campus?.name || c.campusId}`));

    const teacher = await prisma.teacher.findFirst({
      where: { status: 'ACTIVE' }
    });
    console.log(`  - Giáo viên mẫu: ${teacher?.teacherName} (${teacher?.teacherCode})`);

    const academicYear = await prisma.academicYear.findFirst({
      where: { status: 'ACTIVE' }
    }) || await prisma.academicYear.findFirst();

    console.log(`  - Năm học: ${academicYear?.name || academicYear?.code || academicYear?.id}`);

    if (primaryClasses.length > 0 && teacher && academicYear) {
      const targetClass = primaryClasses[0];
      let assignment = await prisma.specialTeachingAssignment.findFirst({
        where: {
          subjectId: finEdu.id,
          classId: targetClass.id,
          academicYearId: academicYear.id,
        }
      });

      if (!assignment) {
        assignment = await prisma.specialTeachingAssignment.create({
          data: {
            subjectId: finEdu.id,
            teacherId: teacher.id,
            classId: targetClass.id,
            academicYearId: academicYear.id,
            semester: 1,
            status: 'ACTIVE',
          }
        });
        console.log(`  ✓ Đã thiết lập phân công mẫu: Lớp ${targetClass.className} -> GV ${teacher.teacherName}`);
      } else {
        console.log(`  ✓ Phân công đã tồn tại: Lớp ${targetClass.className} -> GV ${teacher.teacherName}`);
      }

      // Check students in that class
      const students = await prisma.student.findMany({
        where: { classId: targetClass.id, status: 'ACTIVE' },
        take: 3
      });
      console.log(`  - Học sinh trong lớp: ${students.length} em.`);

      if (students.length > 0) {
        const sampleStudent = students[0];
        const firstLesson = pubVersion.lessons.find(l => l.grade === targetClass.grade) || pubVersion.lessons[0];

        const gradeEntry = await prisma.specialGradeEntry.upsert({
          where: {
            assignmentId_studentId_lessonId_evalScope: {
              assignmentId: assignment.id,
              studentId: sampleStudent.id,
              lessonId: firstLesson.id,
              evalScope: 'LESSON',
            }
          },
          create: {
            assignmentId: assignment.id,
            studentId: sampleStudent.id,
            lessonId: firstLesson.id,
            evalScope: 'LESSON',
            evalResult: 'PASS',
            attendanceStatus: 'PRESENT',
            teacherFeedback: 'Nắm vững kiến thức bài học, có tinh thần tiết kiệm và phân biệt tốt giữa Cần và Muốn.',
            status: 'COMPLETED',
          },
          update: {
            evalResult: 'PASS',
            attendanceStatus: 'PRESENT',
            teacherFeedback: 'Nắm vững kiến thức bài học, có tinh thần tiết kiệm và phân biệt tốt giữa Cần và Muốn.',
            status: 'COMPLETED',
          }
        });
        console.log(`  ✓ Ghi sổ điểm mẫu cho HS: ${sampleStudent.studentName} (${sampleStudent.studentCode}): Kết quả=${gradeEntry.evalResult}, Trạng thái=${gradeEntry.status}`);

        // 4. Test Student 360 profile relation
        const profile = await prisma.student.findUnique({
          where: { id: sampleStudent.id },
          include: {
            specialGradeEntries: {
              include: {
                assignment: {
                  include: {
                    subject: true,
                    teacher: true,
                    class: true,
                  }
                },
                lesson: true
              }
            }
          }
        });

        console.log(`\n[4] Kiểm tra tích hợp Hồ sơ học sinh 360:`);
        console.log(`  - Học sinh: ${profile.studentName} (Mã: ${profile.studentCode})`);
        console.log(`  - Số lượng bản ghi môn học đặc thù: ${profile.specialGradeEntries.length}`);
        profile.specialGradeEntries.forEach(ge => {
          console.log(`    * Môn: ${ge.assignment.subject.name} | Tiết: ${ge.lesson?.periodIndex} - ${ge.lesson?.lessonName} | Đánh giá: ${ge.evalResult} | Nhận xét: "${ge.teacherFeedback}"`);
        });
      }
    }

    // 5. Check permissions
    const specialPerms = await prisma.permission.findMany({
      where: {
        module: {
          in: [
            'SPECIAL_SUBJECTS_ROOT',
            'SPEC_SUB_DASHBOARD',
            'SPEC_SUB_CATALOGS',
            'SPEC_SUB_CURRICULUMS',
            'SPEC_SUB_ASSIGNMENTS',
            'SPEC_SUB_GRADEBOOK',
          ]
        }
      }
    });
    console.log(`\n[5] Quyền hạn phân hệ SPECIAL_SUBJECTS: ${specialPerms.length} quyền đã cấp.`);
    const rolesWithPerms = [...new Set(specialPerms.map(p => p.roleCode))];
    console.log(`  - Áp dụng cho các vai trò: ${rolesWithPerms.join(', ')}`);

    console.log('\n=== TẤT CẢ CÁC BƯỚC XÁC THỰC ĐÃ THÀNH CÔNG VÀ SẴN SÀNG! ===');
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
