const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
require('dotenv').config()

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  const prisma = new PrismaClient({ adapter })

  try {
    // Check all AcademicConsultationLog records and their fields
    const logs = await prisma.academicConsultationLog.findMany({
      include: {
        student: {
          include: {
            class: true
          }
        },
        teacher: true
      }
    })

    console.log(`Total AcademicConsultationLog in DB: ${logs.length}`)

    // Count by academicYearId in logs
    const logsByYear = {}
    logs.forEach(l => {
      const y = l.academicYearId || 'NULL'
      logsByYear[y] = (logsByYear[y] || 0) + 1
    })
    console.log('Logs grouped by log.academicYearId:', logsByYear)

    // Count by student.academicYearId
    const logsByStudentYear = {}
    logs.forEach(l => {
      const y = l.student?.academicYearId || 'NULL'
      logsByStudentYear[y] = (logsByStudentYear[y] || 0) + 1
    })
    console.log('Logs grouped by student.academicYearId:', logsByStudentYear)

    // Check what logs 9.4_CS1, 11.1_CS1, 12.1_CS1 have vs others
    const classLogs = {}
    logs.forEach(l => {
      const cls = l.student?.class?.className || 'NO_CLASS'
      if (!classLogs[cls]) classLogs[cls] = []
      classLogs[cls].push(l)
    })

    console.log('\nLogs per class (total logs count):')
    Object.entries(classLogs).sort().forEach(([cls, lgs]) => {
      console.log(`  ${cls}: ${lgs.length} logs`)
    })

    // Now let's inspect the filter in route.ts!
    // In route.ts:
    /*
        consultationLogs = rawConsultationLogs.filter(log => {
          const notes = (log.notes || "").toLowerCase()
          const content = (log.content || "").toLowerCase()
          const isGradeExchange = notes.includes("[gradeperiod:") || 
                                 notes.includes("trao đổi giữa gvcn và phhs về kết quả khảo sát") ||
                                 (content.startsWith("ý kiến gvcn:") && notes.includes("khảo sát"))
          return !isGradeExchange
        })
    */
    console.log('\n--- Checking filter behavior on 9.1_CS1 and 9.4_CS1 ---')
    const logs91 = classLogs['9.1_CS1'] || []
    console.log(`9.1_CS1 has ${logs91.length} logs total`)
    logs91.slice(0, 5).forEach((l, idx) => {
      console.log(`Log ${idx + 1} for 9.1: meetingDate=${l.meetingDate?.toISOString()}, academicYearId=${l.academicYearId}, studentId=${l.studentId}`)
      console.log(`   notes: "${l.notes}"`)
      console.log(`   content: "${l.content?.slice(0, 100)}"`)
    })

    const logs94 = classLogs['9.4_CS1'] || []
    console.log(`\n9.4_CS1 has ${logs94.length} logs total`)
    logs94.forEach((l, idx) => {
      const notes = (l.notes || "").toLowerCase()
      const content = (l.content || "").toLowerCase()
      const isGradeExchange = notes.includes("[gradeperiod:") || 
                             notes.includes("trao đổi giữa gvcn và phhs về kết quả khảo sát") ||
                             (content.startsWith("ý kiến gvcn:") && notes.includes("khảo sát"))
      console.log(`Log ${idx + 1} for 9.4: student=${l.student?.studentName}, date=${l.meetingDate?.toISOString()?.slice(0,10)}, isGradeExchange=${isGradeExchange}, yearId=${l.academicYearId}`)
      console.log(`   content: "${l.content?.slice(0, 60)}"`)
      console.log(`   notes: "${l.notes?.slice(0, 60)}"`)
    })

    // Wait! Let's check when the UI in the screenshot was loaded or if the screenshot was taken on PRODUCTION or LOCAL!
    // In screenshot, URL is https://ssm.skylineschool.edu.vn/admin/co-van-hoc-tap
    // Wait! Is production connected to the SAME database or did someone just import or seed logs recently?
    // Let's check `createdAt` of logs!
    console.log('\n--- Logs createdAt range ---')
    const dates = logs.map(l => l.createdAt).sort()
    console.log('Earliest log createdAt:', dates[0])
    console.log('Latest log createdAt:', dates[dates.length - 1])

  } finally {
    await prisma.$disconnect()
  }
}

main()
