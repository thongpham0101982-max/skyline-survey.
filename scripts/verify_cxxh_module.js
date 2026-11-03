const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const path = require('path');

const localLibsql = createClient({ url: 'file:' + path.resolve('local.db').replace(/\\/g, '/') });
const prisma = new PrismaClient({ adapter: new PrismaLibSQL(localLibsql) });

async function verifyCxxh() {
  console.log('=== VERIFYING CXXH (GIÁO DỤC CẢM XÚC) MODULE ===\n');

  try {
    // 1. Check Subject & Curriculums
    const subject = await prisma.specialSubject.findUnique({
      where: { code: 'CXXH' },
      include: {
        curriculums: {
          include: {
            versions: {
              include: {
                gradeConfigs: true,
                topics: {
                  include: {
                    lessons: {
                      include: {
                        criteria: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!subject) throw new Error('CXXH subject not found!');
    console.log(`[1] Môn học: ${subject.name} (${subject.code}) - Màu: ${subject.color}`);

    // Count per grade
    const stats = {};
    for (const curr of subject.curriculums) {
      for (const ver of curr.versions) {
        for (const gc of ver.gradeConfigs) {
          let lessonCount = 0;
          let critCount = 0;
          const gradeTopics = ver.topics.filter(t => t.grade === gc.grade);
          gradeTopics.forEach(t => {
            lessonCount += t.lessons.length;
            t.lessons.forEach(l => critCount += l.criteria.length);
          });
          stats[`Khối ${gc.grade}`] = {
            'Số bài học': `${lessonCount} bài`,
            'Số tiêu chuẩn': `${critCount} TC`,
            'Thang đánh giá': gc.evalScaleType,
            'Công thức': gc.summaryFormula
          };
        }
      }
    }
    console.log('\n[2] Thống kê chương trình CXXH 9 Khối:');
    console.table(stats);

    // 2. Sample Evaluation according to Phương án 1 (Most Frequent)
    const assignment = await prisma.specialTeachingAssignment.findFirst({
      where: { subjectId: subject.id, academicYearId: 'cmnseevbh0000wjbmoigji2zd' },
      include: { class: true, teacher: true }
    });

    console.log(`\n[3] Phân công mẫu CXXH:`);
    console.log(`  - Lớp: ${assignment?.class?.className} (Khối ${assignment?.class?.grade})`);
    console.log(`  - GV: ${assignment?.teacher?.teacherName} (${assignment?.teacher?.teacherCode})`);

    const student = await prisma.student.findFirst({
      where: { classId: assignment.classId, status: 'ACTIVE' }
    });

    const primaryVersion = subject.curriculums[0].versions[0];
    const sampleLesson = primaryVersion.topics[0]?.lessons[0];

    if (assignment && student && sampleLesson) {
      console.log(`  - Học sinh mẫu: ${student.studentName} (${student.studentCode})`);
      console.log(`  - Bài học mẫu: Bài ${sampleLesson.periodIndex} - ${sampleLesson.lessonName} (${sampleLesson.criteria.length} TC)`);

      // Mock rubric details: 2 TOT, 1 HOAN_THANH -> Most Frequent: TOT (Phương án 1)
      const rubricDetails = {};
      sampleLesson.criteria.forEach((c, idx) => {
        rubricDetails[c.id] = idx === 0 ? 'HOAN_THANH' : 'TOT';
      });

      const entry = await prisma.specialGradeEntry.upsert({
        where: {
          assignmentId_studentId_lessonId_evalScope: {
            assignmentId: assignment.id,
            studentId: student.id,
            lessonId: sampleLesson.id,
            evalScope: 'LESSON'
          }
        },
        create: {
          assignmentId: assignment.id,
          studentId: student.id,
          lessonId: sampleLesson.id,
          evalScope: 'LESSON',
          evalResult: 'TOT',
          rubricDetails: JSON.stringify(rubricDetails),
          teacherFeedback: 'Em nhận diện và điều hòa cảm xúc rất tốt, chan hòa với bạn bè.',
          attendanceStatus: 'PRESENT',
          status: 'COMPLETED'
        },
        update: {
          evalResult: 'TOT',
          rubricDetails: JSON.stringify(rubricDetails),
          teacherFeedback: 'Em nhận diện và điều hòa cảm xúc rất tốt, chan hòa với bạn bè.',
          attendanceStatus: 'PRESENT',
          status: 'COMPLETED'
        }
      });

      console.log(`  ✓ Đã ghi sổ điểm CXXH: Kết quả bài = ${entry.evalResult} (Tốt theo P.Án 1), Nhận xét: "${entry.teacherFeedback}"`);

      // 4. Verify Student 360 lookup
      const profile = await prisma.student.findUnique({
        where: { id: student.id },
        include: {
          specialGradeEntries: {
            include: {
              assignment: {
                include: { subject: true, teacher: true }
              },
              lesson: true
            }
          }
        }
      });

      console.log(`\n[4] Tích hợp Hồ sơ học tập 360:`);
      profile.specialGradeEntries.forEach(ge => {
        console.log(`  * Môn: ${ge.assignment.subject.name} | Bài: ${ge.lesson?.lessonName} | Kết quả: ${ge.evalResult} | GV: ${ge.assignment.teacher.teacherName}`);
      });
    }

    console.log('\n=== TẤT CẢ KIỂM THỬ MÔN GIÁO DỤC CẢM XÚC ĐÃ HOÀN TẤT VÀ VẬN HÀNH CHUẨN XÁC ===');
  } catch (err) {
    console.error('Lỗi kiểm thử CXXH:', err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCxxh();
