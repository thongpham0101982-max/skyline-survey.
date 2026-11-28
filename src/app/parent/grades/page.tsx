export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { getParentChildren } from "@/lib/parentData"
import {
  getLockedParentGradePeriods,
  getParentGradeVisibilityMap,
} from "@/lib/grading/parent-grade-visibility"
import ParentGradesClient, { ChildRecord, AcademicYearRecord } from "./client"

export default async function ParentGradesPage() {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  const userId = user?.id || ""

  let defaultYear: AcademicYearRecord | null = null
  try {
    const year = await getDefaultAcademicYear(prisma)
    if (year) {
      defaultYear = { id: year.id, name: year.name }
    }
  } catch (e) {
    console.error("Error fetching default academic year:", e)
  }

  const [children, visibilityMap] = await Promise.all([
    userId ? (getParentChildren(userId, defaultYear?.id) as Promise<ChildRecord[]>) : Promise.resolve([]),
    getParentGradeVisibilityMap(prisma, defaultYear?.id || null).catch(() => null),
  ])

  const initialLockedPeriods = visibilityMap
    ? getLockedParentGradePeriods(visibilityMap)
    : ["GK1", "GK2"]

  return (
    <ParentGradesClient 
      initialChildren={children} 
      defaultYear={defaultYear}
      initialLockedPeriods={initialLockedPeriods}
    />
  )
}
