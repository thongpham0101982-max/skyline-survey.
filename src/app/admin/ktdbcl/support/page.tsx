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

  // Fetch initial foundational data
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  const campuses = await prisma.campus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { campusName: "asc" }
  })

  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE" },
    orderBy: { className: "asc" }
  })

  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { subjectName: "asc" }
  })

  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { teacherName: "asc" }
  })

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
