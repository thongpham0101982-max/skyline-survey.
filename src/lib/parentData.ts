import { prisma } from "@/lib/db"

export async function getParentProfileWithStudents(userId: string) {
  if (!userId) return null

  let parent = await prisma.parent.findUnique({
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
              academicYear: true,
              surveyForms: {
                select: {
                  id: true,
                  status: true,
                  surveyPeriodId: true,
                  parentId: true,
                  submissionDateTime: true
                }
              },
              advisoryStatuses: {
                orderBy: { createdAt: 'desc' },
                take: 1
              },
              goals: {
                take: 5
              }
            }
          }
        }
      }
    }
  })

  if (!parent) return null

  // Auto-fallback: If parent has no linked students, try matching by parentCode (P0601020663 -> 0601020663)
  if (parent.students.length === 0 && parent.parentCode) {
    const cleanCode = parent.parentCode.replace(/^P/i, '').trim()
    if (cleanCode) {
      const autoMatchedStudents = await prisma.student.findMany({
        where: { studentCode: cleanCode },
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
          academicYear: true,
          surveyForms: {
            select: {
              id: true,
              status: true,
              surveyPeriodId: true,
              parentId: true,
              submissionDateTime: true
            }
          },
          advisoryStatuses: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          goals: {
            take: 5
          }
        }
      })

      if (autoMatchedStudents.length > 0) {
        for (const st of autoMatchedStudents) {
          await prisma.parentStudentLink.create({
            data: {
              parentId: parent.id,
              studentId: st.id
            }
          }).catch(() => {})
        }

        // Re-fetch parent with newly established links
        parent = await prisma.parent.findUnique({
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
                    academicYear: true,
                    surveyForms: {
                      select: {
                        id: true,
                        status: true,
                        surveyPeriodId: true,
                        parentId: true,
                        submissionDateTime: true
                      }
                    },
                    advisoryStatuses: {
                      orderBy: { createdAt: 'desc' },
                      take: 1
                    },
                    goals: {
                      take: 5
                    }
                  }
                }
              }
            }
          }
        })
      }
    }
  }

  return parent
}

export async function resolveHomeroomTeacher(child: any) {
  let gvcnName = "Chưa phân công"
  if (child.class) {
    if (child.class.homeroomTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { id: child.class.homeroomTeacherId },
            { teacherCode: child.class.homeroomTeacherId },
            { userId: child.class.homeroomTeacherId }
          ]
        },
        select: { teacherName: true }
      }).catch(() => null)
      if (teacher?.teacherName) gvcnName = teacher.teacherName
    }
    if (gvcnName === "Chưa phân công" && child.class.teachers && child.class.teachers.length > 0) {
      const hrAss = child.class.teachers.find((t: any) => t.roleInClass === 'HOMEROOM' || t.roleInClass === 'GVCN') || child.class.teachers[0]
      if (hrAss?.teacher?.teacherName) gvcnName = hrAss.teacher.teacherName
    }
  }
  return gvcnName
}

export async function getParentChildren(userId: string, academicYearId?: string) {
  if (!userId) return []

  const parent = await getParentProfileWithStudents(userId)
  if (!parent) return []

  let allStudents = (parent.students || []).map((s: any) => s.student).filter(Boolean)

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

  if (filteredStudents.length === 0 && allStudents.length > 0) {
    const fallbackMap = new Map<string, any>()
    for (const st of allStudents) {
      const code = st.studentCode || st.id
      if (!fallbackMap.has(code)) fallbackMap.set(code, st)
    }
    filteredStudents = Array.from(fallbackMap.values())
  }

  const result = await Promise.all(
    filteredStudents.map(async (st: any) => {
      const homeroomTeacherName = await resolveHomeroomTeacher(st)
      return {
        ...st,
        homeroomTeacherName,
        gvcnName: homeroomTeacherName
      }
    })
  )

  return JSON.parse(JSON.stringify(result))
}
