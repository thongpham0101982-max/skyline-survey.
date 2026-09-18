export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getParentProfileWithStudents, resolveHomeroomTeacher } from "@/lib/parentData"
import { ParentSurveysClient } from "./client"

async function getParentSurveysData(userId: string) {
  if (!userId) return { childrenList: [], parentTasks: [], studentTasks: [], defaultYearName: "" }

  let parent: any = null
  try {
    parent = await getParentProfileWithStudents(userId)
  } catch (e) {
    console.error("Error loading parent surveys profile with getParentProfileWithStudents:", e)
  }

  if (!parent) return { childrenList: [], parentTasks: [], studentTasks: [], defaultYearName: "" }

  let defaultYear: any = null
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
    .map((s: any) => s.student)
    .filter(Boolean)

  const filteredChildren = rawChildren.filter((child: any) =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  // Lookup homeroom teacher name for each child using shared helper
  const childrenWithGVCN = await Promise.all(
    children.map(async (child: any) => {
      const gvcnName = await resolveHomeroomTeacher(child)
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
