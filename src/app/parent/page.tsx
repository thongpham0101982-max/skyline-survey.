export const dynamic = "force-dynamic"
export const revalidate = 0

import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getParentProfileWithStudents } from "@/lib/parentData"
import ParentDashboardClient from "./ParentDashboardClient"

export default async function ParentDashboard() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  if (!userId) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium font-sans">
        Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.
      </div>
    )
  }

  let parent: any = null
  let defaultYear: any = null

  try {
    parent = await getParentProfileWithStudents(userId)
  } catch (e) {
    console.error("Error fetching parent profile:", e)
  }

  try {
    defaultYear = await getDefaultAcademicYear(prisma)
  } catch (e) {
    console.error("Error fetching default academic year:", e)
  }

  const rawChildren = (parent?.students || [])
    .map((s: any) => s.student)
    .filter((child: any): child is NonNullable<typeof child> => Boolean(child))

  const filteredChildren = rawChildren.filter((child: any) =>
    !defaultYear || child.academicYearId === defaultYear.id || child.class?.academicYearId === defaultYear.id
  )

  const children = filteredChildren.length > 0 ? filteredChildren : rawChildren

  return (
    <ParentDashboardClient
      parent={parent}
      defaultYear={defaultYear}
      childrenList={children}
      userSession={session}
    />
  )
}
