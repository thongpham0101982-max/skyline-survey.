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
    // 1. Academic years
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    })
    console.log("Active Academic Year:", activeYear ? `${activeYear.id} (${activeYear.name})` : "None")

    const allYears = await prisma.academicYear.findMany()
    console.log("All Academic Years:", allYears.map(y => `${y.id}: ${y.name} [${y.status}]`))

    // 2. Count logs
    const totalConsultationLogs = await prisma.academicConsultationLog.count()
    console.log(`\nTotal AcademicConsultationLog in DB: ${totalConsultationLogs}`)

    // 3. Students & Classes in active year
    const students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        ...(activeYear ? { academicYearId: activeYear.id } : {})
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        classId: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            level: true,
            campus: { select: { id: true, campusName: true, campusCode: true } }
          }
        }
      }
    })

    console.log(`Total active students in active year: ${students.length}`)

    // Check non-preschool
    const nonPreschool = students.filter(st => {
      const clsName = (st.class?.className || "").toLowerCase()
      const lvl = (st.class?.level || "").toLowerCase()
      const grd = (st.class?.grade || "").toLowerCase()
      const isMamNon = lvl.includes("mầm") || lvl.includes("mam") || lvl.includes("preschool") ||
                       clsName.includes("mầm") || clsName.includes("mam") ||
                       ["mam", "choi", "la", "nha_tre", "mam_non"].includes(grd)
      return !isMamNon
    })

    console.log(`Total non-preschool students: ${nonPreschool.length}`)

    // Extract all classes and their grades
    function resolveGrade(grade, className) {
      if (grade && !isNaN(Number(grade))) return String(Number(grade))
      if (className) {
        const match = className.match(/^(\d+)/)
        if (match) return String(Number(match[1]))
      }
      return ""
    }

    const classMap = {}
    const gradeClassCount = {}
    nonPreschool.forEach(st => {
      const cName = st.class?.className || "Unknown"
      const grade = resolveGrade(st.class?.grade, cName)
      const campus = st.class?.campus?.campusName || "Unknown"
      if (!classMap[cName]) {
        classMap[cName] = { className: cName, grade, campus, count: 0, studentIds: [] }
        gradeClassCount[grade] = (gradeClassCount[grade] || 0) + 1
      }
      classMap[cName].count++
      classMap[cName].studentIds.push(st.id)
    })

    console.log(`Total unique non-preschool classes: ${Object.keys(classMap).length}`)
    console.log("Class counts by grade:", gradeClassCount)

    // Check grades 9-12 classes specifically (notice screenshot had 18 classes!)
    const k9_12Classes = Object.values(classMap).filter(c => ["9", "10", "11", "12"].includes(c.grade))
    console.log(`Classes in Grades 9-12: ${k9_12Classes.length} classes:`)
    k9_12Classes.forEach(c => console.log(`  - [${c.campus}] ${c.className} (Grade ${c.grade}): ${c.count} students`))

    // 4. Now let's fetch all consultation logs
    const allStudentIds = nonPreschool.map(s => s.id)
    const logs = await prisma.academicConsultationLog.findMany({
      where: {
        studentId: { in: allStudentIds },
        ...(activeYear ? { academicYearId: activeYear.id } : {})
      },
      include: {
        student: {
          select: { id: true, studentCode: true, studentName: true }
        },
        teacher: {
          select: { id: true, teacherName: true }
        }
      }
    })

    console.log(`\nConsultation logs for active students in active year: ${logs.length}`)

    // Separate regular vs GradePeriod
    let regularLogs = 0
    let gradePeriodLogs = 0
    const regularLogsByClass = {}
    const regularLogsByGrade = {}

    logs.forEach(log => {
      const notes = (log.notes || "").toLowerCase()
      const content = (log.content || "").toLowerCase()
      const isGradeExchange = notes.includes("[gradeperiod:") || 
                             notes.includes("trao đổi giữa gvcn và phhs về kết quả khảo sát") ||
                             (content.startsWith("ý kiến gvcn:") && notes.includes("khảo sát"))
      if (isGradeExchange) {
        gradePeriodLogs++
      } else {
        regularLogs++
        const st = nonPreschool.find(s => s.id === log.studentId)
        const cName = st?.class?.className || "Unknown"
        const grade = resolveGrade(st?.class?.grade, cName)
        
        regularLogsByClass[cName] = regularLogsByClass[cName] || { count: 0, students: new Set(), teachers: new Set() }
        regularLogsByClass[cName].count++
        regularLogsByClass[cName].students.add(log.studentId)
        if (log.teacher?.teacherName) regularLogsByClass[cName].teachers.add(log.teacher.teacherName)

        regularLogsByGrade[grade] = (regularLogsByGrade[grade] || 0) + 1
      }
    })

    console.log(`GradePeriod logs (excluded): ${gradePeriodLogs}`)
    console.log(`Regular Consultation logs (included): ${regularLogs}`)
    console.log(`Regular logs by grade:`, regularLogsByGrade)

    console.log("\n--- DETAILED CLASS PROGRESS (Classes with logs or in Grades 9-12) ---")
    Object.keys(classMap).sort().forEach(cName => {
      const c = classMap[cName]
      const logInfo = regularLogsByClass[cName]
      const consultedCount = logInfo ? logInfo.students.size : 0
      const sessionCount = logInfo ? logInfo.count : 0
      const pct = c.count > 0 ? ((consultedCount / c.count) * 100).toFixed(1) : "0"
      const teachers = logInfo ? Array.from(logInfo.teachers).join(", ") : ""

      if (sessionCount > 0 || ["9", "10", "11", "12"].includes(c.grade)) {
        console.log(`${c.campus.padEnd(6)} | ${cName.padEnd(12)} (K${c.grade}) | Sỹ số: ${String(c.count).padStart(2)} | Đã tư vấn: ${String(consultedCount).padStart(2)}/${c.count} (${pct.padStart(5)}%) | Buổi: ${String(sessionCount).padStart(2)} | GV: ${teachers}`)
      }
    })

  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
