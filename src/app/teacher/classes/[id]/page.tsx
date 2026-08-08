import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { ClassDetailClient } from "./client"

export default async function TeacherClassDetailPage({ params }: any) {
  const { id: classId } = await params

  // 1. Get class details including students and their transfers
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      campus: true,
      academicYear: true,
      students: {
        include: {
          parents: true,
          studentTransfers: {
            where: { type: { in: ["IN", "OUT", "CHANGE_CLASS"] } },
            orderBy: { transferDate: "asc" }
          }
        }
      }
    }
  })

  if (!classInfo) return notFound()

  // 2. Determine if the logged-in teacher is the GVCN of this class
  const session = await auth()
  const userId = (session?.user as any)?.id || ''
  
  let teacher = null
  let isGVCNOfThisClass = false
  if (userId) {
    teacher = await prisma.teacher.findUnique({ where: { userId } })
    if (teacher) {
      isGVCNOfThisClass = classInfo.homeroomTeacherId === teacher.id || 
        (classInfo.homeroomTeacherId ? classInfo.homeroomTeacherId.includes(teacher.id) : false)
    }
  }

  // 3. Calculate survey metrics (same logic as before)
  const totalStudents = classInfo.students.length
  
  const forms = await prisma.surveyForm.findMany({
    where: { classId },
    include: { responses: { include: { question: { include: { section: true } } } } }
  })
  
  const submittedForms = forms.filter(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")
  const totalParents = classInfo.students.reduce((acc, s) => acc + s.parents.length, 0)
  const expectedSubmissions = totalParents > 0 ? totalParents : totalStudents
  const completionRate = expectedSubmissions > 0 ? (submittedForms.length / expectedSubmissions) * 100 : 0
  
  let promoters = 0;
  let detractors = 0;
  let passive = 0;
  let totalSatScore = 0;
  let satCount = 0;

  submittedForms.forEach(form => {
    let npsScore = form.npsScoreRaw;
    if (npsScore === null) {
       const npsRes = form.responses.find(r => 
         r.question?.questionType === 'NPS' || 
         (r.question?.section?.name && r.question.section.name.toUpperCase().includes('NPS')) ||
         (r.question?.section?.code && r.question.section.code.toUpperCase().includes('NPS')) ||
         (r.question?.questionText && r.question.questionText.toUpperCase().includes('NPS'))
       );
       if (npsRes) {
          if (npsRes.numericScore !== null) {
             npsScore = npsRes.numericScore;
          } else {
             const strVal = npsRes.choiceAnswer || npsRes.textAnswer || '';
             const match = strVal.match(/\d+/);
             if (match) npsScore = parseInt(match[0], 10);
          }
       }
    }
    
    if (npsScore !== null && npsScore !== undefined) {
       if (npsScore >= 9) promoters++;
       else if (npsScore <= 6) detractors++;
       else passive++;
    }

    let avgScore = form.overallAverageScore;
    if (avgScore === null) {
       const ratings: number[] = [];
       form.responses.forEach(r => {
         const qType = r.question?.questionType || '';
         const sName = r.question?.section?.name?.toUpperCase() || '';
         const qText = r.question?.questionText?.toUpperCase() || '';
         const isRating = ['RATING', 'SATISFACTION', 'LIKERT'].includes(qType);
         const isRatingSection = sName.includes('HÀI LÒNG') || sName.includes('SATISFACTION') || sName.includes('ĐÁNH GIÁ');
         const isRatingText = qText.includes('HÀI LÒNG') || qText.includes('ĐÁNH GIÁ') || qText.includes('SATISFACTION');
         
         if (isRating || isRatingSection || isRatingText) {
            if (r.numericScore !== null) {
               ratings.push(r.numericScore);
            } else {
               const strVal = r.choiceAnswer || r.textAnswer || '';
               const match = strVal.match(/\d+/);
               if (match) ratings.push(parseInt(match[0], 10));
            }
         }
       });
       
       if (ratings.length > 0) {
          avgScore = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
       }
    }
    
    if (avgScore !== null && avgScore !== undefined && !isNaN(avgScore)) {
       totalSatScore += avgScore;
       satCount++;
    }
  });

  const totalNPSResponses = promoters + detractors + passive;
  const nps = totalNPSResponses > 0 ? Math.round(((promoters - detractors) / totalNPSResponses) * 100) : 0;
  const averageSatisfaction = satCount > 0 ? (totalSatScore / satCount) : 0;

  // 4. Calculate monthly headcount trend for this class
  let monthlyHeadcount: { month: string; count: number }[] = []
  if (classInfo.academicYear && classInfo.academicYear.startDate && classInfo.academicYear.endDate) {
    const start = new Date(classInfo.academicYear.startDate)
    const end = new Date(classInfo.academicYear.endDate)

    const months: { year: number; month: number }[] = []
    const curr = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)

    let limit = 0
    while (curr <= last && limit < 24) {
      months.push({
        year: curr.getFullYear(),
        month: curr.getMonth()
      })
      curr.setMonth(curr.getMonth() + 1)
      limit++
    }

    monthlyHeadcount = months.map(m => {
      const monthEnd = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999)
      let count = 0

      for (const s of classInfo.students) {
        const inTransfers = s.studentTransfers.filter(t => t.type === "IN")
        const outTransfers = s.studentTransfers.filter(t => t.type === "OUT")

        const firstInDate = inTransfers.length > 0 ? new Date(inTransfers[0].transferDate) : null
        const firstOutDate = outTransfers.length > 0 ? new Date(outTransfers[0].transferDate) : null

        let isActive = false
        if (s.status === "ACTIVE") {
          if (firstInDate && firstInDate > monthEnd) {
            // Not active yet
          } else {
            isActive = true
          }
        } else if (s.status === "TRANSFERRED_OUT") {
          if (firstOutDate && firstOutDate > monthEnd) {
            isActive = true
          }
        }

        if (isActive) {
          count++
        }
      }

      return {
        month: (m.month + 1) + '/' + m.year,
        count
      }
    })
  }

  // 5. Gather student movement timeline
  const studentMovements: any[] = []
  for (const s of classInfo.students) {
    for (const t of s.studentTransfers) {
      studentMovements.push({
        id: t.id,
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        type: t.type,
        transferDate: t.transferDate ? new Date(t.transferDate).toISOString() : new Date().toISOString(),
        reason: t.reason || '',
        destinationSchool: t.destinationSchool || '',
        destinationProvince: t.destinationProvince || '',
        destinationCountry: t.destinationCountry || '',
        transferCategory: t.transferCategory || ''
      })
    }
  }
  // Sort movements by date descending
  studentMovements.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime())

  // 6. Serialize and render ClassDetailClient
  const safeJson = (d: any) => JSON.parse(JSON.stringify(d))

  return (
    <ClassDetailClient 
      classId={classId}
      classInfo={safeJson(classInfo)}
      isGVCNOfThisClass={isGVCNOfThisClass}
      totalStudents={totalStudents}
      completionRate={completionRate}
      averageSatisfaction={averageSatisfaction}
      nps={nps}
      forms={safeJson(forms)}
      monthlyHeadcount={safeJson(monthlyHeadcount)}
      studentMovements={safeJson(studentMovements)}
    />
  )
}
