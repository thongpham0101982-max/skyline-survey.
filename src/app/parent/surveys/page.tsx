export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ParentSurveysClient } from "./client"

async function getParentSurveysData(userId: string) {
  if (!userId) return { childrenList: [], parentTasks: [], studentTasks: [], defaultYearName: "" }

  let parent = null
  try {
    parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true,
                    academicYear: true,
                    teachers: {
                      include: {
                        teacher: true
                      }
                    }
                  }
                },
                academicYear: true,
                surveyForms: {
                  select: {
                    id: true,
                    status: true,
                    surveyPeriodId: true,
                    parentId: true,
                    submissionDateTime: true
                  }
                }
              }
            }
          }
        }
      }
    })
  } catch (e) {
    console.error("Error loading parent surveys profile:", e)
  }

  if (!parent) return { childrenList: [], parentTasks: [], studentTasks: [], defaultYearName: "" }

  let defaultYear = null
  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error loading default academic year:", e)
  }

  const defaultYearName = defaultYear?.name || "Năm học hiện tại"

  // 1. Fetch active parent survey periods (PHHS)
  let parentPeriods: any[] = []
  try {
    parentPeriods = await prisma.surveyPeriod.findMany({
      where: { 
        status: "ACTIVE",
        targetAudience: "PHHS",
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: 'asc' }
    })
  } catch (e) {
    console.error("Error loading parent survey periods:", e)
  }

  // 2. Fetch active student survey periods (HS)
  let studentPeriods: any[] = []
  try {
    studentPeriods = await prisma.surveyPeriod.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { targetAudience: { contains: "HS" } },
          { targetAudience: { contains: "Hoc" } },
          { targetAudience: { contains: "học" } },
          { targetAudience: { contains: "HỌC" } }
        ],
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      orderBy: { endDate: 'asc' }
    })
  } catch (e) {
    console.error("Error loading student survey periods:", e)
  }

  const rawChildren = (parent.students || [])
    .map(s => s.student)
    .filter(Boolean)

  const filteredChildren = rawChildren.filter(child =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  // Lookup homeroom teacher name for each child
  const childrenWithGVCN = await Promise.all(
    children.map(async (child) => {
      let gvcnName = "Chưa phân công"
      if (child.class) {
        if (child.class.homeroomTeacherId) {
          const teacher = await prisma.teacher.findFirst({
            where: {
              OR: [
                { id: child.class.homeroomTeacherId },
                { teacherCode: child.class.homeroomTeacherId },
                { userId: child.class.homeroomTeacherId }
              ]
            },
            select: { teacherName: true }
          }).catch(() => null)
          if (teacher?.teacherName) gvcnName = teacher.teacherName
        }
        if (gvcnName === "Chưa phân công" && child.class.teachers && child.class.teachers.length > 0) {
          const hrAss = child.class.teachers.find((t: any) => t.roleInClass === 'HOMEROOM' || t.roleInClass === 'GVCN') || child.class.teachers[0]
          if (hrAss?.teacher?.teacherName) gvcnName = hrAss.teacher.teacherName
        }
      }
      return {
        ...child,
        gvcnName
      }
    })
  )

  // Build Parent survey tasks
  const parentTasks = []
  for (const child of childrenWithGVCN) {
    for (const period of parentPeriods) {
      const existingForm = child.surveyForms?.find(
        (f: any) => f.surveyPeriodId === period.id && f.parentId === parent.id
      )
      const isDone = existingForm?.status === "SUBMITTED" || existingForm?.status === "COMPLETED"
      parentTasks.push({
        student: child,
        period,
        form: existingForm || null,
        status: isDone ? "COMPLETED" : "PENDING",
        gvcnName: child.gvcnName
      })
    }
  }

  // Build Student survey tasks
  const studentTasks = []
  for (const child of childrenWithGVCN) {
    for (const period of studentPeriods) {
      const existingForm = child.surveyForms?.find(
        (f: any) => f.surveyPeriodId === period.id && (!f.parentId || f.parentId === null)
      )
      const isDone = existingForm?.status === "SUBMITTED" || existingForm?.status === "COMPLETED"
      studentTasks.push({
        student: child,
        period,
        form: existingForm || null,
        status: isDone ? "COMPLETED" : "PENDING",
        gvcnName: child.gvcnName
      })
    }
  }

  return {
    childrenList: childrenWithGVCN,
    parentTasks,
    studentTasks,
    defaultYearName
  }
}

export default async function ParentSurveysPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ""
  const data = await getParentSurveysData(userId)

  return (
    <div className="max-w-6xl mx-auto pb-16 font-sans">
      <ParentSurveysClient {...data} />
    </div>
  )
}
