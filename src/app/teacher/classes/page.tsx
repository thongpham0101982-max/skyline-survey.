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

    // 1. Homeroom classes
    const homeroomClasses = await prisma.class.findMany({
      where: {
        ...(yearId ? { academicYearId: yearId } : {}),
        OR: [
          { homeroomTeacherId: teacherId },
          { homeroomTeacherId: { contains: teacherId } }
        ]
      },
      include: { campus: true, academicYear: true, _count: { select: { students: true } } }
    }).catch(() => []);

    // 2. TeacherClassAssignment
    const tcaClasses = await prisma.class.findMany({
      where: {
        ...(yearId ? { academicYearId: yearId } : {}),
        teachers: { some: { teacherId } }
      },
      include: { campus: true, academicYear: true, _count: { select: { students: true } } }
    }).catch(() => []);

    // 3. TeachingAssignment
    const teachingAssignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId,
        ...(yearId ? { academicYearId: yearId } : {})
      },
      select: { classId: true }
    }).catch(() => []);

    const taClassIds = teachingAssignments.map(a => a.classId).filter(Boolean);
    const taClasses = taClassIds.length > 0 ? await prisma.class.findMany({
      where: { id: { in: taClassIds } },
      include: { campus: true, academicYear: true, _count: { select: { students: true } } }
    }).catch(() => []) : [];

    // Combine all classes uniquely
    const classMap = new Map();
    [...homeroomClasses, ...tcaClasses, ...taClasses].forEach(c => {
      if (c && c.id && !classMap.has(c.id)) {
        classMap.set(c.id, {
          ...c,
          isHomeroom: c.homeroomTeacherId === teacherId || (c.homeroomTeacherId ? c.homeroomTeacherId.includes(teacherId) : false)
        });
      }
    });

    let result = Array.from(classMap.values());

    // Failsafe 1: If no classes match active year filter, search all years
    if (result.length === 0) {
      const allTeacherClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacherId },
            { homeroomTeacherId: { contains: teacherId } }
          ]
        },
        include: { campus: true, academicYear: true, _count: { select: { students: true } } }
      }).catch(() => []);

      result = allTeacherClasses.map(c => ({
        ...c,
        isHomeroom: true
      }));
    }

    return result;
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
  const userRole = (session?.user as any)?.role || 'TEACHER'

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
      // Failsafe 2: If logged in as Admin or unlinked user, load all active classes for preview
      classes = await prisma.class.findMany({
        take: 20,
        include: { campus: true, academicYear: true, _count: { select: { students: true } } }
      }).catch(() => [])
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
    
    // Failsafe 3: Return empty client grid instead of throwing unhandled error
    return (
      <TeacherClassesClient 
        initialClasses={[]} 
        academicYears={[]} 
      />
    )
  }
}
