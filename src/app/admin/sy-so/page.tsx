import { prisma } from "@/lib/db"
import { getAdminSession } from "@/lib/session"
import { MonthlyEnrollmentClient } from "./client"

export const dynamic = "force-dynamic"

export default async function MonthlyEnrollmentPage() {
  const session = await getAdminSession()

  const [academicYears, campuses] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" }
    }),
    prisma.campus.findMany({
      where: session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } },
      orderBy: { campusName: "asc" }
    })
  ])

  const activeYear = academicYears.find(y => y.status === "ACTIVE" && !y.isOff) || academicYears[0]

  const snapshots = await prisma.monthlyEnrollmentSnapshot.findMany({
    where: {
      academicYearId: activeYear?.id,
      campusId: "ALL"
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ]
  })

  // Get current active counts
  const totalClasses = await prisma.class.count({
    where: {
      academicYearId: activeYear?.id,
      status: "ACTIVE",
      ...(session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } })
    }
  })

  const totalStudents = await prisma.student.count({
    where: {
      status: "ACTIVE",
      class: {
        academicYearId: activeYear?.id,
        status: "ACTIVE"
      },
      ...(session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } })
    }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <MonthlyEnrollmentClient
        academicYears={academicYears}
        campuses={campuses}
        activeYear={activeYear}
        initialSnapshots={snapshots}
        totalClasses={totalClasses}
        totalStudents={totalStudents}
        isFullAccess={session.isFullAccess}
      />
    </div>
  )
}
