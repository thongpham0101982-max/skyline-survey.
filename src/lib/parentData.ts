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
  if (child?.class) {
    if (child.class.homeroomTeacherId) {
      const ids = String(child.class.homeroomTeacherId)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (ids.length > 0) {
        const teachers = await prisma.teacher.findMany({
          where: {
            OR: [
              { id: { in: ids } },
              { teacherCode: { in: ids } },
              { userId: { in: ids } }
            ]
          },
          select: { teacherName: true }
        }).catch(() => [])
        const names = teachers.map((t: any) => t.teacherName).filter(Boolean)
        if (names.length > 0) gvcnName = names.join(", ")
      }
    }
    if (gvcnName === "Chưa phân công" && child.class.teachers && child.class.teachers.length > 0) {
      const hrAss = child.class.teachers.find((t: any) =>
        t.roleInClass?.toUpperCase() === "HOMEROOM" ||
        t.roleInClass?.toUpperCase() === "GVCN" ||
        t.roleInClass?.toLowerCase().includes("chủ nhiệm")
      ) || child.class.teachers[0]
      if (hrAss?.teacher?.teacherName) gvcnName = hrAss.teacher.teacherName
    }
    if (gvcnName === "Chưa phân công" && child.class.className) {
      const clsName = child.class.className.trim()
      const hrByClassStr = await prisma.teacher.findFirst({
        where: { homeroomClass: { contains: clsName } },
        select: { teacherName: true }
      }).catch(() => null)
      if (hrByClassStr?.teacherName) {
        gvcnName = hrByClassStr.teacherName
      } else {
        const siblingClass = await prisma.class.findFirst({
          where: {
            className: clsName,
            homeroomTeacherId: { not: null }
          },
          select: { homeroomTeacherId: true }
        }).catch(() => null)
        if (siblingClass?.homeroomTeacherId) {
          const sibIds = String(siblingClass.homeroomTeacherId).split(",").map((s) => s.trim()).filter(Boolean)
          const sibTeachers = await prisma.teacher.findMany({
            where: {
              OR: [
                { id: { in: sibIds } },
                { teacherCode: { in: sibIds } },
                { userId: { in: sibIds } }
              ]
            },
            select: { teacherName: true }
          }).catch(() => [])
          const sibNames = sibTeachers.map((t: any) => t.teacherName).filter(Boolean)
          if (sibNames.length > 0) gvcnName = sibNames.join(", ")
        }
      }
    }
  }
  return gvcnName
}

export async function getParentChildren(userId: string, academicYearId?: string) {
  if (!userId) return []

  const parent = await getParentProfileWithStudents(userId)
  if (!parent) return []

  let allStudents = (parent.students || []).map((s: any) => s.student).filter(Boolean)

  // Expand by studentCode so switching academic years or having links on older records always finds the student's current/target year record
  const studentCodes = Array.from(new Set(allStudents.map((s: any) => s.studentCode).filter(Boolean)))
  if (studentCodes.length > 0) {
    const siblingRecords = await prisma.student.findMany({
      where: { studentCode: { in: studentCodes } },
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
          orderBy: { createdAt: "desc" },
          take: 1
        },
        goals: {
          take: 5
        }
      },
      orderBy: { academicYear: { name: "desc" } }
    }).catch(() => [])

    if (siblingRecords.length > 0) {
      const existingIds = new Set(allStudents.map((s: any) => s.id))
      for (const sib of siblingRecords) {
        if (!existingIds.has(sib.id)) {
          allStudents.push(sib)
          existingIds.add(sib.id)
        }
      }
    }
  }

  // Sort so active/latest academic year comes first when no specific academicYearId is requested
  allStudents.sort((a: any, b: any) => {
    const yA = a.academicYear?.name || a.class?.academicYear?.name || ""
    const yB = b.academicYear?.name || b.class?.academicYear?.name || ""
    return yB.localeCompare(yA)
  })

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
