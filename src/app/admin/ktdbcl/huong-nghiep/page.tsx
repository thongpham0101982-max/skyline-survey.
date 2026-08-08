import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CareerGuidanceClient } from "./client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "QL Huong nghiep | Khao thi & DACL",
  description: "Quan ly nhat ky lam tu van huong nghiep hoc sinh"
}

export default async function CareerGuidanceAdminPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userRole = (session.user as any)?.role || ""
  const isKTDBCL = ["ADMIN", "KT_DBCL", "KTDBCL", "ADMINISTRATOR"].includes(userRole)

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  const campuses = await prisma.campus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { campusName: "asc" }
  })

  const classes = await prisma.class.findMany({
    where: {
      status: "ACTIVE",
      ...(activeYear ? { academicYearId: activeYear.id } : {})
    },
    orderBy: { className: "asc" }
  })

  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { teacherName: "asc" },
    select: { id: true, teacherName: true, position: true }
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <CareerGuidanceClient
        academicYears={academicYears}
        campuses={campuses}
        classes={classes}
        teachers={teachers}
        currentUser={session.user}
        userRole={userRole}
        isKTDBCL={isKTDBCL}
      />
    </div>
  )
}
