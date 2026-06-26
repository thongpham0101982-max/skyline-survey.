"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

// 1. Update score & notes for a student in an exam
export async function updateExamStudentScoreAction(data: {
  examId: string
  studentId: string
  score: number | null
  notes: string | null
}) {
  await prisma.examStudent.update({
    where: {
      examId_studentId: {
        examId: data.examId,
        studentId: data.studentId
      }
    },
    data: {
      score: data.score,
      notes: data.notes
    }
  })
  revalidatePath("/admin/ktdbcl/results")
}

// 2. Create achievement
export async function createAchievementAction(data: {
  name: string
  type: string // "CA_NHAN" | "DONG_DOI"
  category: string // "GIAI_THUONG" | "HUY_CHUONG" | "CHUNG_NHAN" | "KHAC"
  level: string // "NHAT" | "NHI" | "BA" | "KHUYEN_KHICH" | "VANG" | "BAC" | "DONG" | "KHAC"
  academicYearId: string
  teacherId?: string | null
  teacherName?: string | null
  examId?: string | null
  studentIds: string[]
}) {
  const { studentIds, ...achievementData } = data

  const achievement = await prisma.achievement.create({
    data: {
      ...achievementData,
      students: {
        create: studentIds.map(studentId => ({
          studentId
        }))
      }
    }
  })

  revalidatePath("/admin/ktdbcl/results")
  return achievement
}

// 3. Update achievement
export async function updateAchievementAction(data: {
  id: string
  name: string
  type: string
  category: string
  level: string
  teacherId?: string | null
  teacherName?: string | null
  studentIds: string[]
}) {
  const { id, studentIds, ...achievementData } = data

  // Update core achievement info
  await prisma.achievement.update({
    where: { id },
    data: achievementData
  })

  // Re-sync students
  // 1. Delete old links
  await prisma.studentAchievement.deleteMany({
    where: { achievementId: id }
  })

  // 2. Create new links
  await prisma.studentAchievement.createMany({
    data: studentIds.map(studentId => ({
      achievementId: id,
      studentId
    }))
  })

  revalidatePath("/admin/ktdbcl/results")
}

// 4. Delete achievement
export async function deleteAchievementAction(id: string) {
  await prisma.achievement.delete({
    where: { id }
  })
  revalidatePath("/admin/ktdbcl/results")
}

// 5. Fetch students with scores & achievements for a specific exam
export async function getStudentsWithResultsAction(examId: string) {
  if (!examId) return []

  const examStudents = await prisma.examStudent.findMany({
    where: { examId },
    include: {
      student: {
        include: {
          class: true,
          campus: true
        }
      }
    },
    orderBy: {
      student: {
        studentName: "asc"
      }
    }
  })

  // Also fetch all achievements associated with this exam to map them
  const achievements = await prisma.achievement.findMany({
    where: { examId },
    include: {
      students: {
        select: {
          studentId: true
        }
      },
      teacher: {
        select: {
          teacherName: true,
          id: true
        }
      }
    }
  })

  return examStudents.map(es => {
    const studentAchievements = achievements.filter(a => 
      a.students.some(s => s.studentId === es.studentId)
    )

    return {
      id: es.student.id,
      studentCode: es.student.studentCode,
      studentName: es.student.studentName,
      gender: es.student.gender || "Chưa xác định",
      className: es.student.class?.className || "N/A",
      campusName: es.student.campus?.campusName || "N/A",
      score: es.score,
      notes: es.notes,
      achievements: studentAchievements.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        category: a.category,
        level: a.level,
        teacherId: a.teacherId,
        teacherName: a.teacherName || a.teacher?.teacherName || "Chưa xác định",
        studentIds: a.students.map(s => s.studentId)
      }))
    }
  })
}

// 6. Fetch achievements report based on filters
export async function getAchievementsReportAction(filters: {
  academicYearId?: string
  campusId?: string
  grade?: string
  classId?: string
  category?: string
  level?: string
}) {
  const where: any = {}

  if (filters.academicYearId) {
    where.academicYearId = filters.academicYearId
  }
  if (filters.category) {
    where.category = filters.category
  }
  if (filters.level) {
    where.level = filters.level
  }

  // Fetch all achievements matching core filters
  const achievements = await prisma.achievement.findMany({
    where,
    include: {
      exam: true,
      teacher: true,
      academicYear: true,
      students: {
        include: {
          student: {
            include: {
              class: true,
              campus: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  // Filter students post-query to match campus/grade/class
  const reportRows: any[] = []

  for (const ach of achievements) {
    for (const sa of ach.students) {
      const student = sa.student
      if (!student) continue

      // Apply campus filter
      if (filters.campusId && student.campusId !== filters.campusId) {
        continue
      }
      // Apply class filter
      if (filters.classId && student.classId !== filters.classId) {
        continue
      }
      // Apply grade filter
      if (filters.grade && student.class?.grade !== filters.grade) {
        continue
      }

      reportRows.push({
        achievementId: ach.id,
        achievementName: ach.name,
        type: ach.type,
        category: ach.category,
        level: ach.level,
        academicYearName: ach.academicYear?.name || "N/A",
        teacherName: ach.teacherName || ach.teacher?.teacherName || "N/A",
        examName: ach.exam?.name || "Ngoài hệ thống",
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        className: student.class?.className || "N/A",
        campusName: student.campus?.campusName || "N/A",
        grade: student.class?.grade || "N/A"
      })
    }
  }

  return reportRows
}

// 7. Get student achievement profile
export async function getStudentProfileWithAchievementsAction(studentId: string) {
  if (!studentId) return null

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: true,
      campus: true,
      academicYear: true,
      exams: {
        include: {
          exam: true
        }
      },
      achievements: {
        include: {
          achievement: {
            include: {
              exam: true,
              teacher: true,
              academicYear: true
            }
          }
        }
      }
    }
  })

  if (!student) return null

  return {
    id: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    gender: student.gender || "Chưa xác định",
    className: student.class?.className || "N/A",
    campusName: student.campus?.campusName || "N/A",
    academicYearName: student.academicYear?.name || "N/A",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
    exams: student.exams.map(e => ({
      examId: e.exam.id,
      examName: e.exam.name,
      score: e.score,
      notes: e.notes
    })),
    achievements: student.achievements.map(sa => ({
      id: sa.achievement.id,
      name: sa.achievement.name,
      type: sa.achievement.type,
      category: sa.achievement.category,
      level: sa.achievement.level,
      examName: sa.achievement.exam?.name || "Ngoài hệ thống",
      teacherName: sa.achievement.teacherName || sa.achievement.teacher?.teacherName || "Chưa xác định",
      yearName: sa.achievement.academicYear?.name || "N/A"
    }))
  }
}

// 8. Search students for profile lookup
export async function searchStudentsByNameOrCodeAction(query: string) {
  if (!query || query.trim().length < 2) return []

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { studentCode: { contains: query } },
        { studentName: { contains: query } }
      ]
    },
    include: {
      class: true,
      campus: true
    },
    take: 10
  })

  return students.map(s => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    className: s.class?.className || "N/A",
    campusName: s.campus?.campusName || "N/A"
  }))
}
