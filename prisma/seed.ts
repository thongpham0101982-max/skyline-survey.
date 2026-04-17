import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function pad(n: number, len = 3) {
  return String(n).padStart(len, '0')
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Admin
  await prisma.user.upsert({
    where: { email: 'admin@skyline.edu' },
    update: {},
    create: {
      email: 'admin@skyline.edu',
      fullName: 'System Admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  // 2. Campuses
  const campus1 = await prisma.campus.upsert({
    where: { campusCode: 'CAMP-1' },
    update: {},
    create: { campusCode: 'CAMP-1', campusName: 'Downtown Campus', address: '123 Main St' },
  })
  const campus2 = await prisma.campus.upsert({
    where: { campusCode: 'CAMP-2' },
    update: {},
    create: { campusCode: 'CAMP-2', campusName: 'Westside Campus', address: '456 West Blvd' },
  })

  // 3. Academic Year
  const ay = await prisma.academicYear.upsert({
    where: { id: 'AY-2026' },
    update: {},
    create: {
      id: 'AY-2026',
      name: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-06-30'),
    },
  })

  // 4. Survey Period
  await prisma.surveyPeriod.upsert({
    where: { code: 'SP-2026-T1' },
    update: {},
    create: {
      code: 'SP-2026-T1',
      name: 'Autumn Term Survey 2026',
      academicYearId: ay.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
    },
  })

  // 5. Sections & Questions
  const acad = await prisma.surveySection.upsert({
    where: { code: 'SEC-ACAD' },
    update: { name: 'Academics' },
    create: { code: 'SEC-ACAD', name: 'Academics', sortOrder: 1 },
  })
  await prisma.surveySection.upsert({
    where: { code: 'SEC-FACIL' },
    update: { name: 'Facilities' },
    create: { code: 'SEC-FACIL', name: 'Facilities', sortOrder: 2 },
  })

  await prisma.surveyQuestion.upsert({
    where: { code: 'Q-ACAD-1' },
    update: {},
    create: {
      code: 'Q-ACAD-1',
      sectionId: acad.id,
      questionText: 'The quality of teaching meets my expectations.',
      questionType: 'RATING',
      ratingScaleMax: 10,
      sortOrder: 1,
    },
  })
  await prisma.surveyQuestion.upsert({
    where: { code: 'Q-NPS-1' },
    update: {},
    create: {
      code: 'Q-NPS-1',
      sectionId: acad.id,
      questionText: 'How likely are you to recommend the school to others?',
      questionType: 'NPS',
      sortOrder: 10,
    },
  })

  // 6. Teachers
  const teachers = []
  for (let i = 1; i <= 4; i++) {
    const email = `teacher${i}@skyline.edu`
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName: `Teacher ${i}`, passwordHash, role: 'TEACHER' },
    })
    const t = await prisma.teacher.upsert({
      where: { teacherCode: `T-${pad(i)}` },
      update: {},
      create: {
        userId: user.id,
        teacherCode: `T-${pad(i)}`,
        teacherName: `Teacher ${i}`,
        campusId: i <= 2 ? campus1.id : campus2.id,
      },
    })
    teachers.push(t)
  }

  // 7. Classes
  const classCodes = ['G1-A', 'G1-B', 'G2-A', 'G2-B']
  const classes = []
  for (let i = 0; i < classCodes.length; i++) {
    const c = await prisma.class.upsert({
      where: { classCode: classCodes[i] },
      update: {},
      create: {
        classCode: classCodes[i],
        className: `Class ${classCodes[i]}`,
        campusId: i < 2 ? campus1.id : campus2.id,
        academicYearId: ay.id,
        homeroomTeacherId: teachers[i].id,
      },
    })
    classes.push(c)
  }

  // 8. Parents & Students
  for (let i = 1; i <= 20; i++) {
    const email = `parent${i}@skyline.edu`
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName: `Parent User ${i}`, passwordHash, role: 'PARENT' },
    })
    const parent = await prisma.parent.upsert({
      where: { parentCode: `P-${pad(i)}` },
      update: {},
      create: { userId: user.id, parentCode: `P-${pad(i)}`, parentName: `Parent Name ${i}` },
    })

    const cls = classes[(i - 1) % classes.length]
    const student = await prisma.student.upsert({
      where: { studentCode: `S-${pad(i)}` },
      update: {},
      create: {
        studentCode: `S-${pad(i)}`,
        studentName: `Student Name ${i}`,
        classId: cls.id,
        campusId: cls.campusId,
        academicYearId: ay.id,
      },
    })

    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
      update: {},
      create: { parentId: parent.id, studentId: student.id, relationship: 'Guardian' },
    })
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })