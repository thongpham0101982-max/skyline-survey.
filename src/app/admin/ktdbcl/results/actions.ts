"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"
import { extractAchievementDisplayNames } from "@/lib/achievementFormatters"

function revalidateAllAchievementViews() {
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/exams")
  revalidatePath("/admin/ktdbcl/students")
  revalidatePath("/admin/ho-so-hoc-sinh")
  revalidatePath("/admin/tra-cuu-hoc-sinh/thanh-tich")
  revalidatePath("/admin/tra-cuu-hoc-sinh/ho-so")
  revalidatePath("/teacher/ho-so-hoc-sinh")
  revalidatePath("/parent/children/profile")
}

function normalizeExamMatchKey(name?: string | null): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

async function verifyResultPermission(actionType: "create" | "update" | "delete" = "update") {
  const session = await getAdminSession()
  if (!session.userId) {
    throw new Error("Vui lòng đăng nhập để thực hiện thao tác này.")
  }
  if (session.isFullAccess) {
    return session
  }

  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const perms = await pAny.permission.findMany({
        where: {
          roleCode: session.role,
          module: {
            in: ["KTDBCL_EXAM_RESULTS", "KTDBCL_EXAMS", "KTDBCL_EXAM_STUDENTS", "KTDBCL", "ADMIN"],
          },
        },
      })
      const hasPerm = perms.some((p: any) => {
        if (actionType === "create") return p.canCreate || p.canUpdate
        if (actionType === "delete") return p.canDelete || p.canUpdate
        return p.canUpdate || p.canCreate
      })
      if (hasPerm) return session
    }
  } catch (e) {
    console.error("Error checking result permissions:", e)
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.")
}

// 1. Batch Save Exam Results in an Excel-like grid
export async function saveExamResultsGridAction(
  examId: string,
  academicYearId: string,
  rows: {
    studentId: string
    name: string
    type: string // "CA_NHAN" | "DONG_DOI"
    category: string
    level: string
    teacherId: string | null
    teacherName: string | null
  }[]
) {
  await verifyResultPermission("update")
  if (!examId || !academicYearId) return

  await prisma.$transaction(async (tx) => {
    // Ensure all students in rows are registered in ExamStudent
    const allStudentIds = Array.from(new Set(rows.map((r) => r.studentId).filter(Boolean)))
    if (allStudentIds.length > 0) {
      const existingRegs = await tx.examStudent.findMany({
        where: { examId, studentId: { in: allStudentIds } },
        select: { studentId: true },
      })
      const existingSet = new Set(existingRegs.map((e) => e.studentId))
      const toRegister = allStudentIds.filter((id) => !existingSet.has(id))
      if (toRegister.length > 0) {
        await tx.examStudent.createMany({
          data: toRegister.map((studentId) => ({ examId, studentId })),
        })
      }
    }

    // 1. Delete all existing achievements for this exam (cascades to StudentAchievement)
    await tx.achievement.deleteMany({
      where: { examId },
    })

    // 2. Filter rows that have valid achievements (category is selected)
    const validRows = rows.filter((r) => r.category && r.category.trim() !== "")

    const individualRows = validRows.filter((r) => r.type === "CA_NHAN")
    const teamRows = validRows.filter((r) => r.type === "DONG_DOI")

    // 3. Save individual achievements
    for (const row of individualRows) {
      const achName = row.name && row.name.trim() ? row.name.trim() : row.category || "Thành tích"
      const achLevel = row.level || ""
      await tx.achievement.create({
        data: {
          name: achName,
          type: "CA_NHAN",
          category: row.category,
          level: achLevel,
          academicYearId,
          teacherId: row.teacherId || null,
          teacherName: row.teacherName || null,
          examId,
          students: {
            create: {
              studentId: row.studentId,
            },
          },
        },
      })
    }

    // 4. Save team achievements (grouped by name, level, category, teacherId, teacherName)
    const teamGroups: Record<string, typeof teamRows> = {}
    for (const row of teamRows) {
      const achName = row.name && row.name.trim() ? row.name.trim() : row.category || "Thành tích"
      const achLevel = row.level || ""
      const key = `${achName}|${row.category}|${achLevel}|${row.teacherId || ""}|${row.teacherName || ""}`
      if (!teamGroups[key]) {
        teamGroups[key] = []
      }
      teamGroups[key].push({ ...row, name: achName, level: achLevel })
    }

    for (const [, groupedRows] of Object.entries(teamGroups)) {
      const first = groupedRows[0]
      await tx.achievement.create({
        data: {
          name: first.name,
          type: "DONG_DOI",
          category: first.category,
          level: first.level,
          academicYearId,
          teacherId: first.teacherId || null,
          teacherName: first.teacherName || null,
          examId,
          students: {
            create: groupedRows.map((r) => ({
              studentId: r.studentId,
            })),
          },
        },
      })
    }
  })

  revalidateAllAchievementViews()
}

// 2. Fetch students with results for an exam (union of ExamStudent + existing Achievement links)
export async function getStudentsWithResultsAction(examId: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  if (!examId) return []

  const [examStudents, achievements] = await Promise.all([
    prisma.examStudent.findMany({
      where: { examId },
      include: {
        student: {
          include: {
            class: true,
            campus: true,
          },
        },
      },
      orderBy: {
        student: {
          studentName: "asc",
        },
      },
    }),
    prisma.achievement.findMany({
      where: { examId },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
                campus: true,
              },
            },
          },
        },
        teacher: {
          select: {
            teacherName: true,
            id: true,
          },
        },
      },
    }),
  ])

  const studentMap = new Map<string, any>()
  for (const es of examStudents) {
    if (es.student) {
      studentMap.set(es.student.id, es.student)
    }
  }
  for (const ach of achievements) {
    for (const sa of ach.students) {
      if (sa.student && !studentMap.has(sa.student.id)) {
        studentMap.set(sa.student.id, sa.student)
      }
    }
  }

  const sortedStudents = Array.from(studentMap.values()).sort((a, b) => {
    const clsCmp = (a.class?.className || "").localeCompare(b.class?.className || "", "vi")
    if (clsCmp !== 0) return clsCmp
    return (a.studentName || "").localeCompare(b.studentName || "", "vi")
  })

  const resultRows: any[] = []

  for (const stu of sortedStudents) {
    const studentAchs = achievements.filter((a) =>
      a.students.some((s) => s.studentId === stu.id)
    )

    if (studentAchs.length === 0) {
      resultRows.push({
        id: stu.id,
        studentCode: stu.studentCode,
        studentName: stu.studentName,
        gender: stu.gender || "Chưa xác định",
        className: stu.class?.className || "N/A",
        campusName: stu.campus?.campusName || "N/A",
        achievementId: null,
        achievementName: "",
        type: "CA_NHAN",
        category: "",
        level: "",
        teacherId: "",
        teacherName: "",
      })
    } else {
      for (const ach of studentAchs) {
        resultRows.push({
          id: stu.id,
          studentCode: stu.studentCode,
          studentName: stu.studentName,
          gender: stu.gender || "Chưa xác định",
          className: stu.class?.className || "N/A",
          campusName: stu.campus?.campusName || "N/A",
          achievementId: ach.id,
          achievementName: ach.name,
          type: ach.type,
          category: ach.category,
          level: ach.level,
          teacherId: ach.teacherId || "",
          teacherName: ach.teacherName || ach.teacher?.teacherName || "",
        })
      }
    }
  }

  return resultRows
}

// 2b. Quick Search Students for Direct Result Entry (no pre-registration required)
export async function quickSearchStudentsForExamAction(query: string, academicYearId?: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  const q = (query || "").trim()
  if (q.length < 2) return []

  const baseOr = [
    { studentCode: { contains: q } },
    { studentName: { contains: q } },
  ]

  let students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...(academicYearId ? { academicYearId } : {}),
      OR: baseOr,
    },
    include: {
      class: true,
      campus: true,
    },
    orderBy: { studentName: "asc" },
    take: 20,
  })

  // Fallback without year filter if none matched in selected year
  if (students.length === 0 && academicYearId) {
    students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        OR: baseOr,
      },
      include: {
        class: true,
        campus: true,
      },
      orderBy: { studentName: "asc" },
      take: 20,
    })
  }

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    gender: s.gender || "Chưa xác định",
    classId: s.classId,
    className: s.class?.className || "N/A",
    grade: s.class?.grade || "",
    campusId: s.campusId,
    campusName: s.campus?.campusName || "N/A",
  }))
}

// 2c. Resolve Multiple Students by Codes (for Paste Codes & Smart Excel Import)
export async function resolveStudentsByCodesAction(codes: string[], academicYearId?: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  const cleanedInput = Array.from(
    new Set(
      (codes || [])
        .map((c) => String(c || "").trim())
        .filter(Boolean)
    )
  )
  if (cleanedInput.length === 0) return []

  const normalize = (c: string) => c.trim().replace(/^0+/, "").toUpperCase()
  const targetNormalized = new Set(cleanedInput.map(normalize))

  const candidates = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...(academicYearId ? { academicYearId } : {}),
    },
    include: {
      class: true,
      campus: true,
    },
  })

  const matched = candidates.filter((s) => targetNormalized.has(normalize(s.studentCode)))

  return matched.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    gender: s.gender || "Chưa xác định",
    classId: s.classId,
    className: s.class?.className || "N/A",
    grade: s.class?.grade || "",
    campusId: s.campusId,
    campusName: s.campus?.campusName || "N/A",
  }))
}

// 2d. Register students directly from Result Entry or remove from Exam
export async function addStudentsToExamAction(examId: string, studentIds: string[]) {
  await verifyResultPermission("create")
  if (!examId || !studentIds || studentIds.length === 0) return { added: 0 }

  const existing = await prisma.examStudent.findMany({
    where: { examId, studentId: { in: studentIds } },
    select: { studentId: true },
  })
  const existingSet = new Set(existing.map((r) => r.studentId))
  const toCreate = Array.from(new Set(studentIds)).filter((id) => id && !existingSet.has(id))

  if (toCreate.length > 0) {
    await prisma.examStudent.createMany({
      data: toCreate.map((studentId) => ({ examId, studentId })),
    })
  }

  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  revalidatePath("/admin/ktdbcl/exams")
  return { added: toCreate.length }
}

export async function removeStudentFromExamAction(examId: string, studentId: string) {
  await verifyResultPermission("delete")
  if (!examId || !studentId) return

  await prisma.$transaction(async (tx) => {
    await tx.examStudent.deleteMany({
      where: { examId, studentId },
    })
    const achs = await tx.achievement.findMany({
      where: { examId, students: { some: { studentId } } },
      select: { id: true },
    })
    if (achs.length > 0) {
      const achIds = achs.map((a) => a.id)
      await tx.studentAchievement.deleteMany({
        where: { studentId, achievementId: { in: achIds } },
      })
      const emptyAchs = await tx.achievement.findMany({
        where: { id: { in: achIds }, students: { none: {} } },
        select: { id: true },
      })
      if (emptyAchs.length > 0) {
        await tx.achievement.deleteMany({
          where: { id: { in: emptyAchs.map((a) => a.id) } },
        })
      }
    }
  })

  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/students")
  revalidatePath("/admin/ktdbcl/exams")
}

// 2e. Create Direct / Standalone Achievement (for 1 or multiple students, with or without examId)
export async function createDirectAchievementAction(data: {
  academicYearId: string
  examId?: string | null
  studentIds: string[]
  name: string
  type: string // "CA_NHAN" | "DONG_DOI"
  category: string
  level: string
  teacherId?: string | null
  teacherName?: string | null
}) {
  await verifyResultPermission("create")
  const uniqueStudentIds = Array.from(new Set((data.studentIds || []).filter(Boolean)))
  if (!data.academicYearId || uniqueStudentIds.length === 0 || !data.category) {
    throw new Error("Vui lòng chọn học sinh và loại thành tích.")
  }

  const finalName = (data.name || "").trim() || data.level || data.category || "Thành tích"
  const validExamId = data.examId && data.examId.trim() ? data.examId.trim() : null

  await prisma.$transaction(async (tx) => {
    if (validExamId) {
      const existingRegs = await tx.examStudent.findMany({
        where: { examId: validExamId, studentId: { in: uniqueStudentIds } },
        select: { studentId: true },
      })
      const existingSet = new Set(existingRegs.map((e) => e.studentId))
      const missing = uniqueStudentIds.filter((id) => !existingSet.has(id))
      if (missing.length > 0) {
        await tx.examStudent.createMany({
          data: missing.map((studentId) => ({ examId: validExamId, studentId })),
        })
      }
    }

    if (data.type === "DONG_DOI" && uniqueStudentIds.length > 1) {
      await tx.achievement.create({
        data: {
          name: finalName,
          type: "DONG_DOI",
          category: data.category,
          level: data.level || "",
          academicYearId: data.academicYearId,
          teacherId: data.teacherId || null,
          teacherName: data.teacherName || null,
          examId: validExamId,
          students: {
            create: uniqueStudentIds.map((studentId) => ({ studentId })),
          },
        },
      })
    } else {
      for (const studentId of uniqueStudentIds) {
        await tx.achievement.create({
          data: {
            name: finalName,
            type: data.type === "DONG_DOI" ? "DONG_DOI" : "CA_NHAN",
            category: data.category,
            level: data.level || "",
            academicYearId: data.academicYearId,
            teacherId: data.teacherId || null,
            teacherName: data.teacherName || null,
            examId: validExamId,
            students: {
              create: { studentId },
            },
          },
        })
      }
    }
  })

  revalidateAllAchievementViews()
  return { success: true, count: uniqueStudentIds.length }
}

// 2f. Delete single student achievement record from Report / Profile
export async function deleteStudentAchievementRecordAction(achievementId: string, studentId: string) {
  await verifyResultPermission("delete")
  if (!achievementId || !studentId) return

  await prisma.$transaction(async (tx) => {
    await tx.studentAchievement.deleteMany({
      where: { achievementId, studentId },
    })
    const remaining = await tx.studentAchievement.count({
      where: { achievementId },
    })
    if (remaining === 0) {
      await tx.achievement.delete({ where: { id: achievementId } })
    }
  })

  revalidateAllAchievementViews()
  return { success: true }
}

// 3. Fetch achievements report based on filters
export async function getAchievementsReportAction(filters: {
  academicYearId?: string
  examId?: string
  campusId?: string
  grade?: string
  classId?: string
  category?: string
  level?: string
}) {
  const session = await getAdminSession()
  if (!session.userId) return []
  const where: any = {}

  if (filters.academicYearId) {
    where.academicYearId = filters.academicYearId
  }
  if (filters.examId === "__EXTERNAL__") {
    where.examId = null
  } else if (filters.examId) {
    where.examId = filters.examId
  }
  if (filters.category) {
    where.category = filters.category
  }
  if (filters.level) {
    where.level = filters.level
  }

  const achievements = await prisma.achievement.findMany({
    where,
    include: {
      exam: true,
      teacher: true,
      academicYear: true,
      achievementRequests: {
        select: { id: true, examName: true, reviewedBy: true, reviewedAt: true },
        take: 1,
      },
      students: {
        include: {
          student: {
            include: {
              class: true,
              campus: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const reportRows: any[] = []

  for (const ach of achievements) {
    const displayNames = extractAchievementDisplayNames(ach)
    for (const sa of ach.students) {
      const student = sa.student
      if (!student) continue

      if (filters.campusId && student.campusId !== filters.campusId) {
        continue
      }
      if (filters.classId && student.classId !== filters.classId) {
        continue
      }
      if (filters.grade && student.class?.grade !== filters.grade) {
        continue
      }

      reportRows.push({
        achievementId: ach.id,
        achievementName: displayNames.achievementName,
        type: ach.type,
        category: ach.category,
        level: ach.level,
        academicYearName: ach.academicYear?.name || "N/A",
        teacherName: ach.teacherName || ach.teacher?.teacherName || "—",
        examId: ach.examId || null,
        examName: displayNames.examName,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.class?.className || "N/A",
        campusName: student.campus?.campusName || "N/A",
        grade: student.class?.grade || "N/A",
      })
    }
  }

  return reportRows
}

// 4. Get student achievement profile
export async function getStudentProfileWithAchievementsAction(studentId: string) {
  const session = await getAdminSession()
  if (!session.userId || !studentId) return null

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      campus: true,
      academicYear: true,
    },
  })

  if (!student) return null

  // Aggregate official achievements across all Student records sharing the same studentCode
  let targetStudentIds = [student.id]
  if (student.studentCode) {
    const peerRecords = await prisma.student.findMany({
      where: { studentCode: student.studentCode },
      select: { id: true },
    })
    targetStudentIds = Array.from(new Set([student.id, ...peerRecords.map((r) => r.id)]))
  }

  const allStudentAchievements = await prisma.studentAchievement.findMany({
    where: { studentId: { in: targetStudentIds } },
    include: {
      achievement: {
        include: {
          exam: true,
          teacher: true,
          academicYear: true,
          achievementRequests: {
            select: { id: true, examName: true, reviewedBy: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    id: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    gender: student.gender || "Chưa xác định",
    className: student.class?.className || "N/A",
    campusName: student.campus?.campusName || "N/A",
    academicYearName: student.academicYear?.name || "N/A",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
    achievements: allStudentAchievements.map((sa) => {
      const displayNames = extractAchievementDisplayNames(sa.achievement)
      return {
        linkId: sa.id,
        id: sa.achievement.id,
        studentId: sa.studentId,
        name: displayNames.achievementName,
        type: sa.achievement.type,
        category: sa.achievement.category,
        level: sa.achievement.level,
        examId: sa.achievement.examId || null,
        examName: displayNames.examName,
        teacherName:
          sa.achievement.teacherName || sa.achievement.teacher?.teacherName || "—",
        yearName: sa.achievement.academicYear?.name || "N/A",
      }
    }),
  }
}

// 5. Search students for profile lookup
export async function searchStudentsByNameOrCodeAction(query: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  if (!query || query.trim().length < 2) return []

  const students = await prisma.student.findMany({
    where: {
      OR: [{ studentCode: { contains: query } }, { studentName: { contains: query } }],
    },
    include: {
      class: true,
      campus: true,
    },
    take: 15,
  })

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    className: s.class?.className || "N/A",
    campusName: s.campus?.campusName || "N/A",
  }))
}

// 6. Get students in a class
export async function getStudentsByClassAction(classId: string) {
  const session = await getAdminSession()
  if (!session.userId || !classId) return []

  const students = await prisma.student.findMany({
    where: { classId, status: "ACTIVE" },
    include: {
      class: true,
      campus: true,
    },
    orderBy: {
      studentName: "asc",
    },
  })

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    gender: s.gender || "Chưa xác định",
    className: s.class?.className || "N/A",
    campusName: s.campus?.campusName || "N/A",
  }))
}

// 7. Upsert Exam Results (Differential Sync + Auto-register ExamStudent)
export async function upsertExamResultsAction(
  examId: string,
  academicYearId: string,
  changedRows: {
    achievementId?: string | null
    studentId: string
    name: string
    type: string
    category: string
    level: string
    teacherId: string | null
    teacherName: string | null
  }[]
) {
  await verifyResultPermission("update")
  if (!examId || !academicYearId || !changedRows || changedRows.length === 0) return

  await prisma.$transaction(async (tx) => {
    const emptyRows = changedRows.filter((r) => !r.category || r.category.trim() === "")
    const validRows = changedRows.filter((r) => r.category && r.category.trim() !== "")
    const individualRows = validRows.filter((r) => r.type === "CA_NHAN")
    const teamRows = validRows.filter((r) => r.type === "DONG_DOI")

    // Auto-ensure all students in changedRows are registered in ExamStudent
    const allStudentIds = Array.from(new Set(changedRows.map((r) => r.studentId).filter(Boolean)))
    if (allStudentIds.length > 0) {
      const existingRegs = await tx.examStudent.findMany({
        where: { examId, studentId: { in: allStudentIds } },
        select: { studentId: true },
      })
      const existingSet = new Set(existingRegs.map((e) => e.studentId))
      const missingStudentIds = allStudentIds.filter((id) => !existingSet.has(id))
      if (missingStudentIds.length > 0) {
        await tx.examStudent.createMany({
          data: missingStudentIds.map((studentId) => ({ examId, studentId })),
        })
      }
    }

    // 1. Process Empty Rows (Delete)
    const targetLinks = emptyRows
      .filter((r) => r.achievementId)
      .map((r) => ({
        studentId: r.studentId,
        achievementId: r.achievementId as string,
      }))

    if (targetLinks.length > 0) {
      const linksToDelete = await tx.studentAchievement.findMany({
        where: {
          OR: targetLinks,
        },
      })
      if (linksToDelete.length > 0) {
        await tx.studentAchievement.deleteMany({
          where: {
            id: { in: linksToDelete.map((l) => l.id) },
          },
        })
      }
    }

    const achievementsWithNoStudents = await tx.achievement.findMany({
      where: {
        examId,
        students: {
          none: {},
        },
      },
      select: {
        id: true,
      },
    })

    if (achievementsWithNoStudents.length > 0) {
      await tx.achievement.deleteMany({
        where: {
          id: { in: achievementsWithNoStudents.map((a) => a.id) },
        },
      })
    }

    // 2. Process Individual Rows (Upsert)
    for (const row of individualRows) {
      const achName = row.name && row.name.trim() ? row.name.trim() : row.category || "Đạt giải"
      const achLevel = row.level || ""
      if (row.achievementId) {
        const existingAch = await tx.achievement.findUnique({ where: { id: row.achievementId } })
        if (existingAch) {
          if (existingAch.type === "CA_NHAN") {
            await tx.achievement.update({
              where: { id: row.achievementId },
              data: {
                name: achName,
                category: row.category,
                level: achLevel,
                teacherId: row.teacherId,
                teacherName: row.teacherName,
              },
            })
          } else {
            const existingLink = await tx.studentAchievement.findFirst({
              where: { studentId: row.studentId, achievementId: row.achievementId },
            })
            if (existingLink) {
              await tx.studentAchievement.delete({ where: { id: existingLink.id } })
              const remaining = await tx.studentAchievement.count({
                where: { achievementId: row.achievementId },
              })
              if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } })
            }

            await tx.achievement.create({
              data: {
                name: achName,
                type: "CA_NHAN",
                category: row.category,
                level: achLevel,
                academicYearId,
                teacherId: row.teacherId,
                teacherName: row.teacherName,
                examId,
                students: { create: { studentId: row.studentId } },
              },
            })
          }
        } else {
          await tx.achievement.create({
            data: {
              name: achName,
              type: "CA_NHAN",
              category: row.category,
              level: achLevel,
              academicYearId,
              teacherId: row.teacherId,
              teacherName: row.teacherName,
              examId,
              students: { create: { studentId: row.studentId } },
            },
          })
        }
      } else {
        await tx.achievement.create({
          data: {
            name: achName,
            type: "CA_NHAN",
            category: row.category,
            level: achLevel,
            academicYearId,
            teacherId: row.teacherId,
            teacherName: row.teacherName,
            examId,
            students: { create: { studentId: row.studentId } },
          },
        })
      }
    }

    // 3. Process Team Rows (Group and Upsert)
    const teamGroups: Record<string, typeof teamRows> = {}
    for (const row of teamRows) {
      const achName = row.name && row.name.trim() ? row.name.trim() : row.category || "Đạt giải"
      const achLevel = row.level || ""
      const key = `${achName}|${row.category}|${achLevel}|${row.teacherId || ""}|${row.teacherName || ""}`
      if (!teamGroups[key]) teamGroups[key] = []
      teamGroups[key].push({ ...row, name: achName, level: achLevel })
    }

    for (const [, groupedRows] of Object.entries(teamGroups)) {
      const first = groupedRows[0]

      const existingTeamAch = await tx.achievement.findFirst({
        where: {
          examId,
          type: "DONG_DOI",
          name: first.name,
          category: first.category,
          level: first.level,
          teacherId: first.teacherId || null,
        },
      })

      if (existingTeamAch) {
        for (const row of groupedRows) {
          if (row.achievementId && row.achievementId !== existingTeamAch.id) {
            const existingLink = await tx.studentAchievement.findFirst({
              where: { studentId: row.studentId, achievementId: row.achievementId },
            })
            if (existingLink) {
              await tx.studentAchievement.delete({ where: { id: existingLink.id } })
              const remaining = await tx.studentAchievement.count({
                where: { achievementId: row.achievementId },
              })
              if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } })
            }
          }

          const alreadyLinked = await tx.studentAchievement.findFirst({
            where: { studentId: row.studentId, achievementId: existingTeamAch.id },
          })

          if (!alreadyLinked) {
            await tx.studentAchievement.create({
              data: { studentId: row.studentId, achievementId: existingTeamAch.id },
            })
          }
        }
      } else {
        for (const row of groupedRows) {
          if (row.achievementId) {
            const existingLink = await tx.studentAchievement.findFirst({
              where: { studentId: row.studentId, achievementId: row.achievementId },
            })
            if (existingLink) {
              await tx.studentAchievement.delete({ where: { id: existingLink.id } })
              const remaining = await tx.studentAchievement.count({
                where: { achievementId: row.achievementId },
              })
              if (remaining === 0) await tx.achievement.delete({ where: { id: row.achievementId } })
            }
          }
        }
        await tx.achievement.create({
          data: {
            name: first.name,
            type: "DONG_DOI",
            category: first.category,
            level: first.level,
            academicYearId,
            teacherId: first.teacherId,
            teacherName: first.teacherName,
            examId,
            students: { create: groupedRows.map((r) => ({ studentId: r.studentId })) },
          },
        })
      }
    }
  })

  revalidateAllAchievementViews()
}

export interface ReviewAchievementOverrides {
  examId?: string | null // "__EXTERNAL__" = ngoài hệ thống; valid ID = gán thẳng vào kỳ thi hệ thống
  examName?: string
  achievementName?: string
  type?: string
  category?: string
  level?: string
  teacherId?: string | null
  teacherName?: string | null
}

async function pourApprovedRequestIntoAchievements(
  tx: any,
  req: any,
  reviewerName: string,
  reviewNote: string | undefined,
  allExamsCache: Array<{ id: string; code: string; name: string; academicYearId: string | null }>,
  allTeachersCache: Array<{ id: string; teacherName: string }>,
  overrides?: ReviewAchievementOverrides
): Promise<{ achievementId: string; examId: string | null; examName: string }> {
  const requestedExamName = String(overrides?.examName ?? req.examName ?? "").trim()
  const normRequestedExam = normalizeExamMatchKey(requestedExamName)

  // 1. Xác định Kỳ thi hệ thống tương ứng (nếu có) để đổ kết quả trực tiếp vào bảng kết quả kỳ thi
  let targetExam: { id: string; code: string; name: string; academicYearId: string | null } | null =
    null

  if (overrides?.examId === "__EXTERNAL__") {
    targetExam = null
  } else if (overrides?.examId) {
    targetExam =
      allExamsCache.find((e) => e.id === overrides.examId) ||
      (await tx.exam.findUnique({
        where: { id: overrides.examId },
        select: { id: true, code: true, name: true, academicYearId: true },
      }))
  } else if (normRequestedExam) {
    // Ưu tiên khớp đúng kỳ thi thuộc cùng Năm học trước
    targetExam =
      allExamsCache.find(
        (e) =>
          e.academicYearId === req.academicYearId &&
          normalizeExamMatchKey(e.name) === normRequestedExam
      ) ||
      allExamsCache.find((e) => normalizeExamMatchKey(e.name) === normRequestedExam) ||
      null
  }

  // 2. Xác định Giáo viên bồi dưỡng (không lấy nhầm tên GVCN đề xuất nếu để trống GV bồi dưỡng)
  let resolvedCoachId: string | null = overrides?.teacherId || null
  let resolvedCoachName: string | null = null

  if (resolvedCoachId) {
    const matchedT = allTeachersCache.find((t) => t.id === resolvedCoachId)
    resolvedCoachName = matchedT?.teacherName || overrides?.teacherName || null
  } else {
    const rawCoach =
      overrides?.teacherName !== undefined ? overrides.teacherName : req.coachTeacher
    const trimmedCoach = rawCoach ? String(rawCoach).trim() : ""
    if (trimmedCoach) {
      resolvedCoachName = trimmedCoach
      const normCoach = normalizeExamMatchKey(trimmedCoach)
      const matchedT = allTeachersCache.find(
        (t) => normalizeExamMatchKey(t.teacherName) === normCoach
      )
      if (matchedT) {
        resolvedCoachId = matchedT.id
        resolvedCoachName = matchedT.teacherName
      }
    }
  }

  const finalType =
    (overrides?.type || req.type || "CA_NHAN") === "DONG_DOI" ? "DONG_DOI" : "CA_NHAN"
  const finalCategory = String(overrides?.category || req.category || "GIAI_THUONG").trim()
  const finalLevel = String(
    overrides?.level !== undefined ? overrides.level : req.level || ""
  ).trim()
  const finalAchName =
    String(overrides?.achievementName || req.achievementName || "").trim() ||
    finalLevel ||
    finalCategory ||
    "Giải thưởng"

  const resolvedExamId = targetExam?.id || null
  const targetYearId = targetExam?.academicYearId || req.academicYearId

  let finalAchievementId = ""

  if (resolvedExamId) {
    // Đảm bảo học sinh được đăng ký trong ExamStudent để hiển thị đầy đủ trên bảng Nhập kết quả của kỳ thi
    const existingReg = await tx.examStudent.findFirst({
      where: { examId: resolvedExamId, studentId: req.studentId },
      select: { id: true },
    })
    if (!existingReg) {
      await tx.examStudent.create({
        data: { examId: resolvedExamId, studentId: req.studentId },
      })
    }

    if (finalType === "DONG_DOI") {
      // Nếu là giải Đồng đội trong cùng kỳ thi, gom chung vào bản ghi đội đã tồn tại (nếu trùng giải)
      const existingTeamAch = await tx.achievement.findFirst({
        where: {
          examId: resolvedExamId,
          academicYearId: targetYearId,
          type: "DONG_DOI",
          category: finalCategory,
          level: finalLevel,
          name: finalAchName,
        },
        include: { students: { select: { studentId: true } } },
      })

      if (existingTeamAch) {
        const alreadyInTeam = existingTeamAch.students.some(
          (s: any) => s.studentId === req.studentId
        )
        if (!alreadyInTeam) {
          await tx.studentAchievement.create({
            data: { achievementId: existingTeamAch.id, studentId: req.studentId },
          })
        }
        finalAchievementId = existingTeamAch.id
      } else {
        const createdTeam = await tx.achievement.create({
          data: {
            name: finalAchName,
            type: "DONG_DOI",
            category: finalCategory,
            level: finalLevel,
            academicYearId: targetYearId,
            examId: resolvedExamId,
            teacherId: resolvedCoachId,
            teacherName: resolvedCoachName,
            students: { create: { studentId: req.studentId } },
          },
        })
        finalAchievementId = createdTeam.id
      }
    } else {
      // Giải Cá nhân: Kiểm tra tránh tạo trùng bản ghi nếu Admin đã nhập trước đó trên lưới
      const existingIndAch = await tx.achievement.findFirst({
        where: {
          examId: resolvedExamId,
          academicYearId: targetYearId,
          type: "CA_NHAN",
          category: finalCategory,
          level: finalLevel,
          name: finalAchName,
          students: { some: { studentId: req.studentId } },
        },
      })

      if (existingIndAch) {
        if ((resolvedCoachId || resolvedCoachName) && !existingIndAch.teacherName) {
          await tx.achievement.update({
            where: { id: existingIndAch.id },
            data: {
              teacherId: resolvedCoachId,
              teacherName: resolvedCoachName,
            },
          })
        }
        finalAchievementId = existingIndAch.id
      } else {
        const createdInd = await tx.achievement.create({
          data: {
            name: finalAchName,
            type: "CA_NHAN",
            category: finalCategory,
            level: finalLevel,
            academicYearId: targetYearId,
            examId: resolvedExamId,
            teacherId: resolvedCoachId,
            teacherName: resolvedCoachName,
            students: { create: { studentId: req.studentId } },
          },
        })
        finalAchievementId = createdInd.id
      }
    }
  } else {
    // Kỳ thi ngoài danh mục hệ thống (examId = null, tên cuộc thi được liên kết qua achievementRequests)
    const createdExt = await tx.achievement.create({
      data: {
        name: finalAchName,
        type: finalType,
        category: finalCategory,
        level: finalLevel,
        academicYearId: req.academicYearId,
        examId: null,
        teacherId: resolvedCoachId,
        teacherName: resolvedCoachName,
        students: { create: { studentId: req.studentId } },
      },
    })
    finalAchievementId = createdExt.id
  }

  const finalStoredExamName = targetExam?.name || requestedExamName || "Ngoài hệ thống"

  await tx.studentAchievementRequest.update({
    where: { id: req.id },
    data: {
      status: "APPROVED",
      reviewedBy: reviewerName,
      reviewedAt: new Date(),
      reviewNote:
        reviewNote ||
        (targetExam
          ? `Đã phê duyệt, đổ kết quả vào kỳ thi "${targetExam.name}" và cập nhật Hồ sơ học sinh`
          : "Đã phê duyệt và bổ sung vào Thành tích lớp & Hồ sơ học sinh"),
      achievementId: finalAchievementId,
      examName: finalStoredExamName,
      achievementName: finalAchName,
      type: finalType,
      category: finalCategory,
      level: finalLevel,
      coachTeacher: resolvedCoachName,
    },
  })

  return {
    achievementId: finalAchievementId,
    examId: resolvedExamId,
    examName: finalStoredExamName,
  }
}

// 8. Lấy danh sách yêu cầu bổ sung thành tích học sinh do GVCN đề xuất
export async function getAchievementRequestsAction(filters: {
  academicYearId?: string
  campusId?: string
  classId?: string
  status?: string
}) {
  const session = await getAdminSession()
  if (!session.userId) return []

  const where: any = {}
  if (filters.academicYearId && filters.academicYearId !== "all") {
    where.academicYearId = filters.academicYearId
  }
  if (filters.status && filters.status !== "all") {
    where.status = filters.status
  }
  if (filters.classId && filters.classId !== "all") {
    where.classId = filters.classId
  }

  const [requests, allExams] = await Promise.all([
    prisma.studentAchievementRequest.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
            campus: true,
          },
        },
        academicYear: true,
        teacher: true,
        achievement: {
          select: {
            id: true,
            examId: true,
            exam: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.exam.findMany({
      select: { id: true, code: true, name: true, academicYearId: true },
    }),
  ])

  return requests
    .filter((r) => {
      if (
        filters.campusId &&
        filters.campusId !== "all" &&
        r.student?.campusId !== filters.campusId
      ) {
        return false
      }
      return true
    })
    .map((r) => {
      const normReqExam = normalizeExamMatchKey(r.examName)
      const linkedExam = r.achievement?.exam || null
      const matchedExam =
        linkedExam ||
        (normReqExam
          ? allExams.find(
              (e) =>
                e.academicYearId === r.academicYearId &&
                normalizeExamMatchKey(e.name) === normReqExam
            ) ||
            allExams.find((e) => normalizeExamMatchKey(e.name) === normReqExam) ||
            null
          : null)

      return {
        ...r,
        matchedExam,
      }
    })
}

// 9. Xét duyệt yêu cầu bổ sung thành tích (Đơn lẻ)
export async function reviewAchievementRequestAction(data: {
  requestId: string
  status: "APPROVED" | "REJECTED"
  reviewNote?: string
  overrides?: ReviewAchievementOverrides
}) {
  const session = await verifyResultPermission("update")
  const reviewerUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true },
  })
  const reviewerName = reviewerUser?.fullName || "Ban Quản lý Chuyên môn"

  const { requestId, status, reviewNote, overrides } = data
  if (!requestId || !status) throw new Error("Thiếu thông tin xét duyệt")

  const req = await prisma.studentAchievementRequest.findUnique({
    where: { id: requestId },
    include: { student: true },
  })

  if (!req) throw new Error("Không tìm thấy yêu cầu xét duyệt")

  let pouredResult: { achievementId: string; examId: string | null; examName: string } | null = null

  if (status === "APPROVED") {
    const [allExams, allTeachers] = await Promise.all([
      prisma.exam.findMany({
        select: { id: true, code: true, name: true, academicYearId: true },
      }),
      prisma.teacher.findMany({
        select: { id: true, teacherName: true },
      }),
    ])

    pouredResult = await prisma.$transaction(async (tx) => {
      return pourApprovedRequestIntoAchievements(
        tx,
        req,
        reviewerName,
        reviewNote,
        allExams,
        allTeachers,
        overrides
      )
    })
  } else {
    await prisma.studentAchievementRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedBy: reviewerName,
        reviewedAt: new Date(),
        reviewNote: reviewNote || "Từ chối yêu cầu bổ sung thành tích",
      },
    })
  }

  revalidateAllAchievementViews()
  return { success: true, poured: pouredResult }
}

// 9b. Xét duyệt hàng loạt yêu cầu bổ sung thành tích
export async function batchReviewAchievementRequestsAction(data: {
  requestIds: string[]
  status: "APPROVED" | "REJECTED"
  reviewNote?: string
}) {
  const session = await verifyResultPermission("update")
  const reviewerUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true },
  })
  const reviewerName = reviewerUser?.fullName || "Ban Quản lý Chuyên môn"
  const ids = Array.from(new Set((data.requestIds || []).filter(Boolean)))
  if (ids.length === 0) return { processed: 0, pouredIntoExamCount: 0 }

  const pendingRequests = await prisma.studentAchievementRequest.findMany({
    where: { id: { in: ids }, status: "PENDING" },
  })
  if (pendingRequests.length === 0) return { processed: 0, pouredIntoExamCount: 0 }

  let pouredIntoExamCount = 0

  if (data.status === "APPROVED") {
    const [allExams, allTeachers] = await Promise.all([
      prisma.exam.findMany({
        select: { id: true, code: true, name: true, academicYearId: true },
      }),
      prisma.teacher.findMany({
        select: { id: true, teacherName: true },
      }),
    ])

    await prisma.$transaction(async (tx) => {
      for (const req of pendingRequests) {
        const res = await pourApprovedRequestIntoAchievements(
          tx,
          req,
          reviewerName,
          data.reviewNote,
          allExams,
          allTeachers
        )
        if (res.examId) pouredIntoExamCount++
      }
    })
  } else {
    await prisma.$transaction(async (tx) => {
      for (const req of pendingRequests) {
        await tx.studentAchievementRequest.update({
          where: { id: req.id },
          data: {
            status: "REJECTED",
            reviewedBy: reviewerName,
            reviewedAt: new Date(),
            reviewNote: data.reviewNote || "Từ chối yêu cầu bổ sung thành tích",
          },
        })
      }
    })
  }

  revalidateAllAchievementViews()
  return { processed: pendingRequests.length, pouredIntoExamCount }
}

// 10. Thống kê số lượng yêu cầu bổ sung thành tích
export async function getAchievementRequestStatsAction(academicYearId?: string) {
  const session = await getAdminSession()
  if (!session.userId) {
    return { total: 0, pending: 0, approved: 0, rejected: 0, pendingAllYears: 0 }
  }

  const where: any = {}
  if (academicYearId && academicYearId !== "all") {
    where.academicYearId = academicYearId
  }

  const [total, pending, approved, rejected, pendingAllYears] = await Promise.all([
    prisma.studentAchievementRequest.count({ where }),
    prisma.studentAchievementRequest.count({ where: { ...where, status: "PENDING" } }),
    prisma.studentAchievementRequest.count({ where: { ...where, status: "APPROVED" } }),
    prisma.studentAchievementRequest.count({ where: { ...where, status: "REJECTED" } }),
    prisma.studentAchievementRequest.count({ where: { status: "PENDING" } }),
  ])

  return { total, pending, approved, rejected, pendingAllYears }
}
