import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TeacherClassesClient } from "./client"
import { cookies } from "next/headers"

async function getTeacherClasses(userId: string, academicYearId?: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return []

  let yearId = academicYearId;
  if (!yearId) {
    const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    yearId = activeYear?.id;
  }

  const classes = await prisma.class.findMany({
    where: {
      ...(yearId ? { academicYearId: yearId } : {}),
      OR: [
        { homeroomTeacherId: teacher.id },
        { homeroomTeacherId: { contains: teacher.id } },
        { teachers: { some: { teacherId: teacher.id } } }
      ]
    },
    include: {
      campus: true,
      academicYear: true,
      _count: {
        select: { students: true }
      }
    }
  })

  return classes.map(c => ({
    ...c,
    isHomeroom: c.homeroomTeacherId === teacher.id || 
                (c.homeroomTeacherId ? c.homeroomTeacherId.includes(teacher.id) : false)
  }))
}

export default async function TeacherClassesPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ''

  const cookieStore = await cookies()
  const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const classes = await getTeacherClasses(userId, activeYearCookie)
  
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  const safeJson = (d: any) => JSON.parse(JSON.stringify(d))

  return (
    <TeacherClassesClient 
      initialClasses={safeJson(classes)} 
      academicYears={safeJson(academicYears)} 
      selectedYearCookie={activeYearCookie}
    />
  )
}
