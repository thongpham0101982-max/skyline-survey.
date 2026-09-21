export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { getParentChildren } from "@/lib/parentData"
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

  const children = (userId ? await getParentChildren(userId, defaultYear?.id) : []) as ChildRecord[]

  return (
    <ParentGradesClient 
      initialChildren={children} 
      defaultYear={defaultYear} 
    />
  )
}
