import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TeacherClassesClient } from "./client"

async function getTeacherClasses(userId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { userId } })
  if (!teacher) return []

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
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

  return classes
}

export default async function TeacherClassesPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id || ''
  const classes = await getTeacherClasses(userId)
  
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  const safeJson = (d: any) => JSON.parse(JSON.stringify(d))

  return (
    <TeacherClassesClient 
      initialClasses={safeJson(classes)} 
      academicYears={safeJson(academicYears)} 
    />
  )
}
