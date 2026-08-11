export const dynamic = "force-dynamic"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TeacherClassesClient } from "./client"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect"

async function getTeacherClasses(teacherId: string, academicYearId?: string) {
  try {
    let yearId = academicYearId;
    if (yearId) {
      const yearExists = await prisma.academicYear.findUnique({ where: { id: yearId } }).catch(() => null);
      if (!yearExists) yearId = undefined;
    }
    
    if (!yearId) {
      const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } }).catch(() => null);
      yearId = activeYear?.id;
    }

    // Query strictly classes where teacher is assigned as Homeroom Teacher (GVCN)
    let homeroomClasses = await prisma.class.findMany({
      where: {
        ...(yearId ? { academicYearId: yearId } : {}),
        OR: [
          { homeroomTeacherId: teacherId },
          { homeroomTeacherId: { contains: teacherId } }
        ]
      },
      include: { campus: true, academicYear: true, _count: { select: { students: true } } }
    }).catch(() => []);

    // Failsafe: If no homeroom classes match current active year filter, check all years for homeroom classes
    if (homeroomClasses.length === 0) {
      homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacherId },
            { homeroomTeacherId: { contains: teacherId } }
          ]
        },
        include: { campus: true, academicYear: true, _count: { select: { students: true } } }
      }).catch(() => []);
    }

    return homeroomClasses.map(c => ({
      ...c,
      isHomeroom: true
    }));
  } catch (err) {
    console.error("Error in getTeacherClasses:", err)
    return []
  }
}

export default async function TeacherClassesPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (err) {
    console.error("Error authenticating TeacherClassesPage:", err)
  }

  if (!session) {
    redirect("/login")
  }

  const userId = (session?.user as any)?.id || ''
  const userEmail = session?.user?.email || ''

  try {
    let teacher = null
    if (userId) {
      teacher = await prisma.teacher.findUnique({ where: { userId } }).catch(() => null)
    }

    if (!teacher && userEmail) {
      teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { email: userEmail },
            { teacherCode: userEmail },
            { teacherCode: userEmail.split('@')[0] }
          ]
        }
      }).catch(() => null)
    }

    const cookieStore = await cookies()
    const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value

    let classes: any[] = []
    if (teacher) {
      classes = await getTeacherClasses(teacher.id, activeYearCookie)
    } else {
      // Admin / Staff preview: load classes that have homeroom teachers assigned
      const previewClasses = await prisma.class.findMany({
        where: {
          homeroomTeacherId: { not: null }
        },
        take: 12,
        include: { campus: true, academicYear: true, _count: { select: { students: true } } }
      }).catch(() => [])

      classes = previewClasses.map(c => ({ ...c, isHomeroom: true }))
    }
    
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" }
    }).catch(() => [])

    const safeJson = (d: any) => JSON.parse(JSON.stringify(d || []))

    return (
      <TeacherClassesClient 
        initialClasses={safeJson(classes)} 
        academicYears={safeJson(academicYears)} 
        selectedYearCookie={activeYearCookie}
      />
    )
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Error loading TeacherClassesPage:", error)
    
    return (
      <TeacherClassesClient 
        initialClasses={[]} 
        academicYears={[]} 
      />
    )
  }
}
