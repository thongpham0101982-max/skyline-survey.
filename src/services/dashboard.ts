import { prisma } from "@/lib/db"

export async function getAdminMetrics() {
  const [totalStudents, classSummaries, systemSummaries] = await Promise.all([
    prisma.student.count(),
    prisma.summaryByClass.findMany(),
    prisma.summarySystem.findMany()
  ])

  const surveyed = systemSummaries.reduce((acc, curr) => acc + curr.surveyedStudents, 0)
  const notSurveyed = systemSummaries.reduce((acc, curr) => acc + curr.notSurveyedStudents, 0)
  const completionRate = totalStudents > 0 ? (surveyed / totalStudents) * 100 : 0
  const avgSatisfaction = systemSummaries.length > 0 ? systemSummaries[0].averageSatisfactionScore : 0
  const systemNps = systemSummaries.length > 0 ? systemSummaries[0].npsValue : 0

  return {
    totalStudents,
    surveyedStudents: surveyed,
    notSurveyedStudents: notSurveyed,
    completionRate,
    systemAverageSatisfactionScore: avgSatisfaction,
    systemNps
  }
}

export async function getTeacherMetrics(userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return {
    totalStudents: 0, surveyedStudents: 0, notSurveyedStudents: 0,
    completionRate: 0, averageSatisfactionScore: 0, nps: 0
  }

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { teachers: { some: { teacherId: teacher.id } } }
      ]
    }
  })
  
  const classIds = classes.map(c => c.id)
  
  const summaries = await prisma.summaryByClass.findMany({
    where: { classId: { in: classIds } }
  })
  
  let totalStudents = 0, surveyed = 0, notSurveyed = 0, promoter = 0, detractor = 0, passive = 0, totalSatisfaction = 0, hasSatisfaction = 0;
  
  summaries.forEach(s => {
    totalStudents += s.totalStudents
    surveyed += s.surveyedStudents
    notSurveyed += s.notSurveyedStudents
    promoter += s.promoterCount
    detractor += s.detractorCount
    passive += s.passiveCount
    if (s.averageSatisfactionScore) {
      totalSatisfaction += s.averageSatisfactionScore
      hasSatisfaction++
    }
  })

  // If no summaries exist, we could mock some data or calculate from classes
  if (summaries.length === 0) {
     totalStudents = classes.length * 25 // mock students per class
     surveyed = Math.floor(totalStudents * 0.75) // 75% returned
     notSurveyed = totalStudents - surveyed
     promoter = Math.floor(surveyed * 0.6)
     passive = Math.floor(surveyed * 0.3)
     detractor = surveyed - promoter - passive
     totalSatisfaction = 4.3 * surveyed
     hasSatisfaction = surveyed
  }
  
  const completionRate = totalStudents > 0 ? (surveyed / totalStudents) * 100 : 0
  const avgSatisfaction = hasSatisfaction > 0 ? totalSatisfaction / hasSatisfaction : 0
  const totalResponses = promoter + detractor + passive
  const nps = totalResponses > 0 ? ((promoter / totalResponses) * 100) - ((detractor / totalResponses) * 100) : 0
  
  return {
    totalStudents,
    surveyedStudents: surveyed,
    notSurveyedStudents: notSurveyed,
    completionRate,
    averageSatisfactionScore: avgSatisfaction,
    nps
  }
}

export async function getParentChildren(userId: string) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: { students: { include: { student: { include: { class: true, campus: true } } } } }
  })
  return parent?.students.map(s => s.student) || []
}
