import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = (session?.user as any)?.id

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId")

    const parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: {
                  include: {
                    campus: true,
                    academicYear: true,
                    teachers: {
                      include: {
                        teacher: true
                      }
                    }
                  }
                },
                academicYear: true
              }
            }
          }
        }
      }
    })

    if (!parent) {
      return NextResponse.json([])
    }

    const allStudents = parent.students.map(s => s.student)

    // Helper to get homeroom teacher name
    const formatStudentWithTeacher = async (s: any) => {
      let homeroomTeacherName = "Chưa phân công"
      if (s.class) {
        if (s.class.homeroomTeacherId) {
          const teacher = await prisma.teacher.findFirst({
            where: {
              OR: [
                { id: s.class.homeroomTeacherId },
                { teacherCode: s.class.homeroomTeacherId },
                { userId: s.class.homeroomTeacherId }
              ]
            }
          }).catch(() => null)
          if (teacher) homeroomTeacherName = teacher.teacherName
        }
        if (homeroomTeacherName === "Chưa phân công" && s.class.teachers && s.class.teachers.length > 0) {
          const hrAss = s.class.teachers.find((t: any) => t.roleInClass === 'HOMEROOM' || t.roleInClass === 'GVCN') || s.class.teachers[0]
          if (hrAss?.teacher) homeroomTeacherName = hrAss.teacher.teacherName
        }
      }
      return {
        ...s,
        homeroomTeacherName
      }
    }

    // Group by studentCode so each student appears ONLY ONCE for the current selected academic year
    const uniqueStudentsMap = new Map<string, any>()

    for (const st of allStudents) {
      const code = st.studentCode || st.id
      const matchesYear = academicYearId ? (st.academicYearId === academicYearId || st.class?.academicYearId === academicYearId) : true

      if (!uniqueStudentsMap.has(code)) {
        if (matchesYear || !academicYearId) {
          uniqueStudentsMap.set(code, st)
        }
      } else {
        const existing = uniqueStudentsMap.get(code)
        const existingMatches = academicYearId ? (existing.academicYearId === academicYearId || existing.class?.academicYearId === academicYearId) : false
        if (!existingMatches && matchesYear) {
          uniqueStudentsMap.set(code, st)
        }
      }
    }

    let filteredStudents = Array.from(uniqueStudentsMap.values())

    // Fallback if year parameter matched no students, pick unique students by code
    if (filteredStudents.length === 0 && allStudents.length > 0) {
      const fallbackMap = new Map<string, any>()
      for (const st of allStudents) {
        const code = st.studentCode || st.id
        if (!fallbackMap.has(code)) fallbackMap.set(code, st)
      }
      filteredStudents = Array.from(fallbackMap.values())
    }

    const result = await Promise.all(filteredStudents.map(formatStudentWithTeacher))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("GET /api/parent/children error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
