import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SupportClient } from "./client"

export const dynamic = "force-dynamic"

export default async function SupportAdminPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userRole = (session.user as any)?.role || ""
  const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)
  const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL"].includes(userRole)

  // Fetch initial foundational data in parallel with safe fallbacks
  let academicYears: any[] = []
  let campuses: any[] = []
  let classes: any[] = []
  let subjects: any[] = []
  let teachers: any[] = []

  try {
    const [ayRes, campRes, clsRes, subRes, tchRes] = await Promise.all([
      prisma.academicYear.findMany({
        orderBy: { startDate: "desc" }
      }).catch(err => {
        console.error("Failed to fetch academicYears:", err)
        return []
      }),
      prisma.campus.findMany({
        where: { status: "ACTIVE" },
        orderBy: { campusName: "asc" }
      }).catch(err => {
        console.error("Failed to fetch campuses:", err)
        return []
      }),
      prisma.class.findMany({
        where: { status: "ACTIVE" },
        orderBy: { className: "asc" }
      }).catch(err => {
        console.error("Failed to fetch classes:", err)
        return []
      }),
      prisma.subject.findMany({
        where: { status: "ACTIVE" },
        orderBy: { subjectName: "asc" }
      }).catch(err => {
        console.error("Failed to fetch subjects:", err)
        return []
      }),
      prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        orderBy: { teacherName: "asc" }
      }).catch(err => {
        console.error("Failed to fetch teachers:", err)
        return []
      })
    ])

    academicYears = ayRes || []
    campuses = campRes || []
    classes = clsRes || []
    subjects = subRes || []
    teachers = tchRes || []
  } catch (error) {
    console.error("Error loading foundational support data:", error)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <SupportClient
        academicYears={academicYears}
        campuses={campuses}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        currentUser={session.user}
        userRole={userRole}
      />
    </div>
  )
}
